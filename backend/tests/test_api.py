import json
from pathlib import Path
from uuid import UUID
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app import models as m, schemas as s, services
from app.seed import seed

CONTENT = json.loads((Path(__file__).parents[1] / "content/intro-lesson.json").read_text(encoding="utf-8"))


def profile(client):
    response = client.post("/api/learners")
    assert response.status_code == 201
    return {"X-Learner-ID": response.json()["id"]}


def start(client, headers, original=None):
    response = client.post("/api/attempts", headers=headers, json={"lessonId": CONTENT["id"], "originalAttemptId": original})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def answer_for(exercise, correct=True):
    if exercise["type"] == "multiple-choice":
        option = exercise["correctOptionId"] if correct else next(item["id"] for item in exercise["options"] if item["id"] != exercise["correctOptionId"])
        return {"type": exercise["type"], "optionId": option}
    tokens = exercise["acceptedOrders"][0]
    return {"type": exercise["type"], "tokenIds": tokens if correct else list(reversed(tokens))}


def submit(client, headers, attempt, exercise, correct=True):
    return client.post(f"/api/attempts/{attempt}/exercises/{exercise['id']}/answers", headers=headers, json={"answer": answer_for(exercise, correct)})


def finish(client, headers, attempt):
    return client.post(f"/api/attempts/{attempt}/complete", headers=headers, json={})


def test_models_relationships_seed_and_order(db, client):
    seed(db)
    assert db.scalar(select(func.count()).select_from(m.Lesson)) == 1
    lesson = db.get(m.Lesson, CONTENT["id"])
    assert [exercise.id for exercise in lesson.exercises] == [e["id"] for e in CONTENT["exercises"]]
    assert len(lesson.exercises[0].items) == 3
    assert lesson.exercises[0].items[1].gujarati == CONTENT["exercises"][0]["options"][1]["text"]["gujarati"]
    assert client.get("/api/lessons").json()[0]["exerciseCount"] == 5
    with pytest.raises(IntegrityError):
        db.add(m.ExerciseItem(exercise_id="nonexistent", id="bad", position=0, romanized="", gujarati="", english="", is_correct=False))
        db.flush()


def test_lesson_fetch_hides_answer_keys_and_explanations(client):
    response = client.get(f"/api/lessons/{CONTENT['id']}")
    assert response.status_code == 200
    assert response.json()["phrases"] == CONTENT["phrases"]
    for key in ["correctOptionId", "acceptedOrders", "isCorrect", "explanation"]:
        assert key not in response.text
    assert client.get("/api/lessons/missing").status_code == 404


@pytest.mark.parametrize("exercise_index", range(5))
@pytest.mark.parametrize("correct", [True, False])
def test_server_validation_and_answer_history(client, db, exercise_index, correct):
    headers = profile(client)
    attempt = start(client, headers)
    exercise = CONTENT["exercises"][exercise_index]
    result = submit(client, headers, attempt, exercise, correct)
    assert result.status_code == 200
    assert result.json()["correct"] is correct
    assert result.json()["explanation"] == exercise["explanation"]
    assert db.scalar(select(m.ExerciseAttempt)).correct is correct


@pytest.mark.parametrize("answer", [
    {"type": "sentence-arrangement", "tokenIds": ["kem"]},
    {"type": "sentence-arrangement", "tokenIds": ["kem", "kem"]},
    {"type": "sentence-arrangement", "tokenIds": ["kem", "fake"]},
    {"type": "multiple-choice", "optionId": "how"},
])
def test_invalid_sentence_answers_rejected(client, answer):
    headers = profile(client)
    attempt = start(client, headers)
    assert client.post(f"/api/attempts/{attempt}/exercises/build-question/answers", headers=headers, json={"answer": answer}).status_code == 422


def test_client_cannot_supply_correctness_or_unknown_option(client):
    headers = profile(client)
    attempt = start(client, headers)
    endpoint = f"/api/attempts/{attempt}/exercises/recognize-question/answers"
    assert client.post(endpoint, headers=headers, json={"answer": {"type": "multiple-choice", "optionId": "fake"}}).status_code == 422
    assert client.post(endpoint, headers=headers, json={"answer": answer_for(CONTENT["exercises"][0]), "correct": True}).status_code == 422
    assert finish(client, headers, attempt).status_code == 409


def test_completion_idempotency_and_progress_across_sessions(client, db):
    headers = profile(client)
    assert client.get("/api/learners/me", headers=headers).status_code == 200
    attempt = start(client, headers)
    for index, exercise in enumerate(CONTENT["exercises"]):
        assert submit(client, headers, attempt, exercise, index not in [0, 2]).status_code == 200
    # A retried answer is not counted twice; a changed answer is rejected.
    assert submit(client, headers, attempt, CONTENT["exercises"][0], False).status_code == 200
    assert submit(client, headers, attempt, CONTENT["exercises"][0], True).status_code == 409
    first = finish(client, headers, attempt)
    assert first.json()["score"] == 3
    assert len(first.json()["missedExerciseIds"]) == 2
    assert finish(client, headers, attempt).json() == first.json()
    progress = client.get("/api/learners/me/progress", headers=headers).json()[0]
    assert progress["bestScore"] == 3
    assert progress["completedCount"] == 1
    # A fresh ORM session reloads the result from PostgreSQL, not Python state.
    with Session(bind=db.connection(), join_transaction_mode="create_savepoint") as fresh:
        saved = fresh.get(m.LessonProgress, (UUID(headers["X-Learner-ID"]), CONTENT["id"]))
        assert saved.best_score == 3
        assert fresh.get(m.LessonAttempt, UUID(attempt)).completed_at is not None


def test_review_only_missed_questions_and_preserves_progress(client):
    headers = profile(client)
    attempt = start(client, headers)
    for index, exercise in enumerate(CONTENT["exercises"]):
        submit(client, headers, attempt, exercise, index not in [0, 2])
    finish(client, headers, attempt)
    before = client.get("/api/learners/me/progress", headers=headers).json()
    review = start(client, headers, attempt)
    assert submit(client, headers, review, CONTENT["exercises"][1]).status_code == 422
    for index in [0, 2]:
        assert submit(client, headers, review, CONTENT["exercises"][index]).json()["correct"] is True
    assert finish(client, headers, review).json()["score"] == 2
    assert client.get("/api/learners/me/progress", headers=headers).json() == before
    assert finish(client, headers, attempt).json()["score"] == 3


def test_attempts_are_scoped_to_learner_and_review_requires_completion(client):
    owner = profile(client)
    other = profile(client)
    attempt = start(client, owner)
    assert finish(client, other, attempt).status_code == 404
    assert submit(client, other, attempt, CONTENT["exercises"][0]).status_code == 404
    assert client.post("/api/attempts", headers=owner, json={"lessonId": CONTENT["id"], "originalAttemptId": attempt}).status_code == 422
    assert client.get("/api/learners/me/progress").status_code == 422
    assert client.get("/api/learners/me/progress", headers=other).json() == []


def test_repeated_lessons_keep_best_score(client):
    headers = profile(client)
    for correct in [True, False]:
        attempt = start(client, headers)
        for exercise in CONTENT["exercises"]:
            submit(client, headers, attempt, exercise, correct)
        finish(client, headers, attempt)
    saved = client.get("/api/learners/me/progress", headers=headers).json()[0]
    assert saved["completedCount"] == 2
    assert saved["bestScore"] == 5


def test_cors_preflight(client):
    response = client.options("/api/attempts", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-learner-id,content-type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_perfect_score_has_no_review_questions(client):
    headers = profile(client)
    attempt = start(client, headers)
    for exercise in CONTENT["exercises"]:
        submit(client, headers, attempt, exercise)
    assert finish(client, headers, attempt).json()["missedExerciseIds"] == []
    response = client.post("/api/attempts", headers=headers, json={"lessonId": CONTENT["id"], "originalAttemptId": attempt})
    assert response.status_code == 422

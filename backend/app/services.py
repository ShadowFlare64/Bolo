from datetime import datetime, timezone
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import models as m, schemas as s


def require_lesson(db: Session, lesson_id: str) -> m.Lesson:
    lesson = db.get(m.Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    return lesson


def require_attempt(db: Session, attempt_id: UUID, learner_id: UUID) -> m.LessonAttempt:
    attempt = db.scalar(select(m.LessonAttempt).where(m.LessonAttempt.id == attempt_id, m.LessonAttempt.learner_id == learner_id).with_for_update())
    if attempt is None:
        raise HTTPException(404, "Attempt not found")
    return attempt


def public_lesson(lesson: m.Lesson) -> s.LessonOut:
    exercises = []
    for exercise in lesson.exercises:
        items = [s.Item(id=item.id, text=s.LearningText(romanized=item.romanized, gujarati=item.gujarati, english=item.english)) for item in exercise.items]
        common = dict(id=exercise.id, type=exercise.type, prompt=exercise.prompt, difficulty=exercise.difficulty, concepts=exercise.concepts)
        exercises.append(s.ChoiceExercise(**common, options=items) if exercise.type == "multiple-choice" else s.ArrangementExercise(**common, tokens=items))
    return s.LessonOut(id=lesson.id, title=lesson.title, description=lesson.description, duration_minutes=lesson.duration_minutes, review_status=lesson.review_status, phrases=lesson.phrases, sources=lesson.sources, exercises=exercises)


def validate_answer(exercise: m.Exercise, answer: s.ChoiceAnswer | s.ArrangementAnswer) -> bool:
    if exercise.type != answer.type:
        raise HTTPException(422, "Answer type does not match exercise")
    item_ids = {item.id for item in exercise.items}
    if isinstance(answer, s.ChoiceAnswer):
        if answer.option_id not in item_ids:
            raise HTTPException(422, "Unknown answer option")
        return next(item.is_correct for item in exercise.items if item.id == answer.option_id)
    if len(answer.token_ids) != len(item_ids) or set(answer.token_ids) != item_ids:
        raise HTTPException(422, "Use every token exactly once")
    return answer.token_ids in (exercise.accepted_orders or [])


def result_for(exercise: m.Exercise, correct: bool) -> s.AnswerResult:
    return s.AnswerResult(correct=correct, explanation=exercise.explanation, correct_option_id=next((item.id for item in exercise.items if item.is_correct), None))


def attempt_out(attempt: m.LessonAttempt) -> s.AttemptOut:
    return s.AttemptOut(id=attempt.id, lesson_id=attempt.lesson_id, original_attempt_id=attempt.original_attempt_id, total=attempt.total, score=attempt.score, completed_at=attempt.completed_at, missed_exercise_ids=[answer.exercise_id for answer in attempt.answers if not answer.correct])


def allowed_exercises(db: Session, attempt: m.LessonAttempt) -> list[str]:
    if attempt.original_attempt_id:
        return list(db.scalars(select(m.ExerciseAttempt.exercise_id).where(m.ExerciseAttempt.attempt_id == attempt.original_attempt_id, m.ExerciseAttempt.correct.is_(False))))
    return [exercise.id for exercise in require_lesson(db, attempt.lesson_id).exercises]


def submit_answer(db: Session, attempt: m.LessonAttempt, exercise_id: str, answer: s.ChoiceAnswer | s.ArrangementAnswer) -> s.AnswerResult:
    if exercise_id not in allowed_exercises(db, attempt):
        raise HTTPException(422, "Exercise does not belong to this attempt")
    exercise = db.get(m.Exercise, exercise_id)
    payload = answer.model_dump(by_alias=True)
    existing = db.scalar(select(m.ExerciseAttempt).where(m.ExerciseAttempt.attempt_id == attempt.id, m.ExerciseAttempt.exercise_id == exercise_id))
    # Retrying a request after a lost response never double-counts an answer.
    if existing:
        if existing.answer != payload:
            raise HTTPException(409, "This exercise has already been answered")
        return result_for(exercise, existing.correct)
    if attempt.completed_at:
        raise HTTPException(409, "Attempt is already complete")
    correct = validate_answer(exercise, answer)
    db.add(m.ExerciseAttempt(attempt_id=attempt.id, exercise_id=exercise_id, answer=payload, correct=correct))
    db.commit()
    return result_for(exercise, correct)


def complete_attempt(db: Session, attempt: m.LessonAttempt) -> s.AttemptOut:
    if attempt.completed_at:
        return attempt_out(attempt)
    answers = list(db.scalars(select(m.ExerciseAttempt).where(m.ExerciseAttempt.attempt_id == attempt.id)))
    if set(answer.exercise_id for answer in answers) != set(allowed_exercises(db, attempt)):
        raise HTTPException(409, "Answer every exercise before completing the attempt")
    attempt.score = sum(answer.correct for answer in answers)
    attempt.completed_at = datetime.now(timezone.utc)
    if attempt.original_attempt_id is None:
        # Serializes concurrent completions for the same anonymous learner.
        db.scalar(select(m.Learner).where(m.Learner.id == attempt.learner_id).with_for_update())
        progress = db.get(m.LessonProgress, (attempt.learner_id, attempt.lesson_id))
        if progress:
            progress.best_score = max(progress.best_score, attempt.score)
            progress.completed_count += 1
            progress.last_attempt_id = attempt.id
            progress.completed_at = attempt.completed_at
        else:
            db.add(m.LessonProgress(learner_id=attempt.learner_id, lesson_id=attempt.lesson_id, last_attempt_id=attempt.id, best_score=attempt.score, completed_count=1, completed_at=attempt.completed_at))
    db.commit()
    return attempt_out(attempt)

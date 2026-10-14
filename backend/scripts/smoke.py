"""Live API smoke check. Creates one demo learner; --verify checks persisted results.

Run from backend with API running and your development database selected.
"""
import json
import sys
from pathlib import Path
import httpx

root = Path(__file__).parents[2]
record = root / ".tools" / "smoke-learner.json"
with httpx.Client(base_url="http://127.0.0.1:8000/api", timeout=15, trust_env=False) as client:
    if "--verify" in sys.argv:
        learner_id = json.loads(record.read_text())["id"]
        result = client.get("/learners/me/progress", headers={"X-Learner-ID": learner_id})
        result.raise_for_status()
        assert result.json()[0]["bestScore"] == 3
        assert result.json()[0]["completedCount"] == 1
        print("PASS: progress persisted across API/database restart (3/5, one completion)")
    else:
        content = json.loads((root / "backend/content/intro-lesson.json").read_text(encoding="utf-8"))
        learner = client.post("/learners")
        learner.raise_for_status()
        headers = {"X-Learner-ID": learner.json()["id"]}
        lesson = client.get(f"/lessons/{content['id']}")
        lesson.raise_for_status()
        assert all(key not in lesson.text for key in ["correctOptionId", "acceptedOrders", "explanation"])
        attempt = client.post("/attempts", headers=headers, json={"lessonId": content["id"]})
        attempt.raise_for_status()
        attempt_id = attempt.json()["id"]
        for index, exercise in enumerate(content["exercises"]):
            correct = index not in [0, 2]
            if exercise["type"] == "multiple-choice":
                answer = {"type": exercise["type"], "optionId": exercise["correctOptionId"] if correct else next(item["id"] for item in exercise["options"] if item["id"] != exercise["correctOptionId"])}
            else:
                order = exercise["acceptedOrders"][0]
                answer = {"type": exercise["type"], "tokenIds": order if correct else list(reversed(order))}
            result = client.post(f"/attempts/{attempt_id}/exercises/{exercise['id']}/answers", headers=headers, json={"answer": answer})
            result.raise_for_status()
            assert result.json()["correct"] == correct
        result = client.post(f"/attempts/{attempt_id}/complete", headers=headers, json={})
        result.raise_for_status()
        assert result.json()["score"] == 3
        review = client.post("/attempts", headers=headers, json={"lessonId": content["id"], "originalAttemptId": attempt_id})
        review.raise_for_status()
        assert review.json()["total"] == 2
        for exercise in [content["exercises"][0], content["exercises"][2]]:
            answer = {"type": exercise["type"], **({"optionId": exercise["correctOptionId"]} if exercise["type"] == "multiple-choice" else {"tokenIds": exercise["acceptedOrders"][0]})}
            result = client.post(f"/attempts/{review.json()['id']}/exercises/{exercise['id']}/answers", headers=headers, json={"answer": answer})
            result.raise_for_status()
            assert result.json()["correct"]
        result = client.post(f"/attempts/{review.json()['id']}/complete", headers=headers, json={})
        result.raise_for_status()
        assert result.json()["score"] == 2
        record.parent.mkdir(exist_ok=True)
        record.write_text(json.dumps({"id": learner.json()["id"]}))
        print("PASS: live lesson fetch, both exercise types, 3/5 completion, two-question review")

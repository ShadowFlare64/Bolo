"""Insert the existing lesson once; never overwrite content used by past attempts."""
import json
from pathlib import Path
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Lesson, Exercise, ExerciseItem


def seed(db: Session):
    content = json.loads((Path(__file__).parents[1] / "content" / "intro-lesson.json").read_text(encoding="utf-8"))
    if db.get(Lesson, content["id"]):
        return
    lesson = Lesson(id=content["id"], position=0, title=content["title"], description=content["description"], duration_minutes=content["durationMinutes"], review_status=content["reviewStatus"], phrases=content["phrases"], sources=content["sources"])
    for position, data in enumerate(content["exercises"]):
        exercise = Exercise(id=data["id"], position=position, type=data["type"], prompt=data["prompt"], explanation=data["explanation"], difficulty=data["difficulty"], concepts=data["concepts"], accepted_orders=data.get("acceptedOrders"))
        for item_position, item in enumerate(data.get("options", data.get("tokens", []))):
            exercise.items.append(ExerciseItem(id=item["id"], position=item_position, **item["text"], is_correct=item["id"] == data.get("correctOptionId")))
        lesson.exercises.append(exercise)
    db.add(lesson)
    db.commit()


if __name__ == "__main__":
    with SessionLocal() as db:
        seed(db)
    print("Lesson seed complete (existing content preserved).")

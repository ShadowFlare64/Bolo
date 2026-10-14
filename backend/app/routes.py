from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import get_db
from . import models as m, schemas as s, services

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


def get_learner(db: Db, x_learner_id: Annotated[UUID, Header()]) -> m.Learner:
    learner = db.get(m.Learner, x_learner_id)
    if learner is None:
        raise HTTPException(404, "Learner not found")
    return learner


CurrentLearner = Annotated[m.Learner, Depends(get_learner)]


@router.get("/lessons", response_model=list[s.LessonSummary])
def lessons(db: Db):
    return [s.LessonSummary(id=lesson.id, title=lesson.title, description=lesson.description, position=lesson.position, duration_minutes=lesson.duration_minutes, exercise_count=len(lesson.exercises)) for lesson in db.scalars(select(m.Lesson).order_by(m.Lesson.position))]


@router.get("/lessons/{lesson_id}", response_model=s.LessonOut)
def lesson(lesson_id: str, db: Db):
    return services.public_lesson(services.require_lesson(db, lesson_id))


@router.post("/learners", response_model=s.LearnerOut, status_code=201)
def create_learner(db: Db):
    learner = m.Learner()
    db.add(learner)
    db.commit()
    return s.LearnerOut(id=learner.id, created_at=learner.created_at)


@router.get("/learners/me", response_model=s.LearnerOut)
def learner_profile(learner: CurrentLearner):
    return s.LearnerOut(id=learner.id, created_at=learner.created_at)


@router.get("/learners/me/progress", response_model=list[s.ProgressOut])
def progress(db: Db, learner: CurrentLearner):
    rows = db.execute(select(m.LessonProgress, m.LessonAttempt.total).join(m.LessonAttempt, m.LessonProgress.last_attempt_id == m.LessonAttempt.id).where(m.LessonProgress.learner_id == learner.id).order_by(m.LessonProgress.lesson_id))
    return [s.ProgressOut(lesson_id=p.lesson_id, best_score=p.best_score, total=total, completed_count=p.completed_count, completed_at=p.completed_at) for p, total in rows]


@router.post("/attempts", response_model=s.AttemptOut, status_code=201)
def start_attempt(body: s.StartAttempt, db: Db, learner: CurrentLearner):
    lesson = services.require_lesson(db, body.lesson_id)
    total = len(lesson.exercises)
    if body.original_attempt_id:
        original = services.require_attempt(db, body.original_attempt_id, learner.id)
        if original.lesson_id != lesson.id or original.completed_at is None or original.original_attempt_id is not None:
            raise HTTPException(422, "Review requires a completed original attempt for this lesson")
        total = sum(not answer.correct for answer in original.answers)
    if total == 0:
        raise HTTPException(422, "No exercises to attempt")
    attempt = m.LessonAttempt(learner_id=learner.id, lesson_id=lesson.id, original_attempt_id=body.original_attempt_id, total=total)
    db.add(attempt)
    db.commit()
    return services.attempt_out(attempt)


@router.post("/attempts/{attempt_id}/exercises/{exercise_id}/answers", response_model=s.AnswerResult)
def submit(attempt_id: UUID, exercise_id: str, body: s.AnswerRequest, db: Db, learner: CurrentLearner):
    return services.submit_answer(db, services.require_attempt(db, attempt_id, learner.id), exercise_id, body.answer)


@router.post("/attempts/{attempt_id}/complete", response_model=s.AttemptOut)
def complete(attempt_id: UUID, db: Db, learner: CurrentLearner):
    return services.complete_attempt(db, services.require_attempt(db, attempt_id, learner.id))

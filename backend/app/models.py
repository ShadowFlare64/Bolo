from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    position: Mapped[int] = mapped_column(unique=True)
    title: Mapped[str]
    description: Mapped[str]
    duration_minutes: Mapped[int]
    review_status: Mapped[str]
    phrases: Mapped[list] = mapped_column(JSON)
    sources: Mapped[list] = mapped_column(JSON)
    exercises: Mapped[list["Exercise"]] = relationship(back_populates="lesson", order_by="Exercise.position", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("position >= 0"), CheckConstraint("duration_minutes > 0"), CheckConstraint("review_status IN ('needs-native-review', 'verified')"))


class Exercise(Base):
    __tablename__ = "exercises"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), index=True)
    position: Mapped[int]
    type: Mapped[str]
    prompt: Mapped[str]
    explanation: Mapped[str]
    difficulty: Mapped[str]
    concepts: Mapped[list] = mapped_column(JSON)
    # Answer rules are private backend data; never included in lesson responses.
    accepted_orders: Mapped[list | None] = mapped_column(JSON, nullable=True)
    lesson: Mapped[Lesson] = relationship(back_populates="exercises")
    items: Mapped[list["ExerciseItem"]] = relationship(back_populates="exercise", order_by="ExerciseItem.position", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("lesson_id", "position"), CheckConstraint("position >= 0"), CheckConstraint("type IN ('multiple-choice', 'sentence-arrangement')"))


class ExerciseItem(Base):
    """Ordered choices or word tokens; IDs are scoped to their exercise."""
    __tablename__ = "exercise_items"
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), primary_key=True)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    position: Mapped[int]
    romanized: Mapped[str]
    gujarati: Mapped[str]
    english: Mapped[str]
    is_correct: Mapped[bool] = mapped_column(default=False)
    exercise: Mapped[Exercise] = relationship(back_populates="items")
    __table_args__ = (UniqueConstraint("exercise_id", "position"), CheckConstraint("position >= 0"))


class Learner(Base):
    __tablename__ = "learners"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    attempts: Mapped[list["LessonAttempt"]] = relationship(back_populates="learner")


class LessonAttempt(Base):
    __tablename__ = "lesson_attempts"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    learner_id: Mapped[UUID] = mapped_column(ForeignKey("learners.id"), index=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"))
    original_attempt_id: Mapped[UUID | None] = mapped_column(ForeignKey("lesson_attempts.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[int | None] = mapped_column(nullable=True)
    total: Mapped[int]
    learner: Mapped[Learner] = relationship(back_populates="attempts")
    answers: Mapped[list["ExerciseAttempt"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("total > 0"), CheckConstraint("score IS NULL OR (score >= 0 AND score <= total)"), CheckConstraint("(completed_at IS NULL AND score IS NULL) OR (completed_at IS NOT NULL AND score IS NOT NULL)"))


class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    attempt_id: Mapped[UUID] = mapped_column(ForeignKey("lesson_attempts.id"), index=True)
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"))
    answer: Mapped[dict] = mapped_column(JSON)
    correct: Mapped[bool]
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    attempt: Mapped[LessonAttempt] = relationship(back_populates="answers")
    __table_args__ = (UniqueConstraint("attempt_id", "exercise_id"),)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    learner_id: Mapped[UUID] = mapped_column(ForeignKey("learners.id"), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    last_attempt_id: Mapped[UUID] = mapped_column(ForeignKey("lesson_attempts.id"))
    best_score: Mapped[int]
    completed_count: Mapped[int]
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    __table_args__ = (CheckConstraint("best_score >= 0"), CheckConstraint("completed_count > 0"))

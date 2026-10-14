from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class LearningText(Schema):
    romanized: str
    gujarati: str
    english: str


class Item(Schema):
    id: str
    text: LearningText


class ExerciseBase(Schema):
    id: str
    prompt: str
    difficulty: str
    concepts: list[str]


class ChoiceExercise(ExerciseBase):
    type: Literal["multiple-choice"]
    options: list[Item]


class ArrangementExercise(ExerciseBase):
    type: Literal["sentence-arrangement"]
    tokens: list[Item]


PublicExercise = Annotated[ChoiceExercise | ArrangementExercise, Field(discriminator="type")]


class Source(Schema):
    label: str
    url: str


class LessonSummary(Schema):
    id: str
    title: str
    description: str
    position: int
    duration_minutes: int
    exercise_count: int


class LessonOut(Schema):
    id: str
    title: str
    description: str
    duration_minutes: int
    review_status: Literal["needs-native-review", "verified"]
    sources: list[Source]
    phrases: list[LearningText]
    exercises: list[PublicExercise]


class ChoiceAnswer(Schema):
    type: Literal["multiple-choice"]
    option_id: str = Field(min_length=1, max_length=80)


class ArrangementAnswer(Schema):
    type: Literal["sentence-arrangement"]
    token_ids: list[str] = Field(min_length=1, max_length=64)


Answer = Annotated[ChoiceAnswer | ArrangementAnswer, Field(discriminator="type")]


class AnswerRequest(Schema):
    answer: Answer


class StartAttempt(Schema):
    lesson_id: str = Field(min_length=1, max_length=80)
    original_attempt_id: UUID | None = None


class LearnerOut(Schema):
    id: UUID
    created_at: datetime


class AttemptOut(Schema):
    id: UUID
    lesson_id: str
    original_attempt_id: UUID | None
    total: int
    score: int | None
    completed_at: datetime | None
    missed_exercise_ids: list[str]


class AnswerResult(Schema):
    correct: bool
    explanation: str
    correct_option_id: str | None = None


class ProgressOut(Schema):
    lesson_id: str
    best_score: int
    total: int
    completed_count: int
    completed_at: datetime

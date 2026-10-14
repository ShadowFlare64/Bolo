export type ScriptMode = "romanized" | "gujarati";
export type LearningText = { romanized: string; gujarati: string; english: string };
type BaseExercise = {
  id: string;
  prompt: string;
  explanation: string;
  difficulty: "beginner";
  concepts: string[];
};
export type ChoiceExercise = BaseExercise & {
  type: "multiple-choice";
  options: { id: string; text: LearningText }[];
  correctOptionId: string;
};
export type ArrangementExercise = BaseExercise & {
  type: "sentence-arrangement";
  tokens: { id: string; text: LearningText }[];
  acceptedOrders: string[][];
};
export type Exercise = ChoiceExercise | ArrangementExercise;
// API content deliberately excludes answer keys and explanations.
export type PublicExercise = Omit<ChoiceExercise, "correctOptionId" | "explanation"> | Omit<ArrangementExercise, "acceptedOrders" | "explanation">;
export type Answer = { type: "multiple-choice"; optionId: string } | { type: "sentence-arrangement"; tokenIds: string[] };
export type Lesson = {
  id: string; title: string; description: string; durationMinutes: number;
  reviewStatus: "needs-native-review" | "verified";
  sources: { label: string; url: string }[];
  phrases: LearningText[];
  exercises: Exercise[];
};
export type PublicLesson = Omit<Lesson, "exercises"> & { exercises: PublicExercise[] };
export type AnswerResult = { correct: boolean; explanation: string; correctOptionId: string | null };
export type Attempt = { id: string; lessonId: string; originalAttemptId: string | null; total: number; score: number | null; completedAt: string | null; missedExerciseIds: string[] };
export type Progress = { lessonId: string; bestScore: number; total: number; completedCount: number; completedAt: string };

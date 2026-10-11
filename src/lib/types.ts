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
export type Answer = { type: "multiple-choice"; optionId: string } | { type: "sentence-arrangement"; tokenIds: string[] };
export type Lesson = {
  id: string; title: string; description: string; durationMinutes: number;
  reviewStatus: "needs-native-review" | "verified";
  sources: { label: string; url: string }[];
  phrases: LearningText[];
  exercises: Exercise[];
};

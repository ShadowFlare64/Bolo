import type { Answer, Exercise } from "./types";
export function isAnswerReady(exercise: Exercise, answer: Answer | null): boolean {
  if (!answer || exercise.type !== answer.type) return false;
  if (exercise.type === "multiple-choice" && answer.type === "multiple-choice") {
    return exercise.options.some(option => option.id === answer.optionId);
  }
  if (exercise.type === "sentence-arrangement" && answer.type === "sentence-arrangement") {
    return answer.tokenIds.length === exercise.tokens.length && new Set(answer.tokenIds).size === answer.tokenIds.length && answer.tokenIds.every(id => exercise.tokens.some(token => token.id === id));
  }
  return false;
}
export function validateAnswer(exercise: Exercise, answer: Answer): boolean {
  if (!isAnswerReady(exercise, answer)) return false;
  if (exercise.type === "multiple-choice" && answer.type === "multiple-choice") return exercise.correctOptionId === answer.optionId;
  if (exercise.type === "sentence-arrangement" && answer.type === "sentence-arrangement") {
    return exercise.acceptedOrders.some(order => order.length === answer.tokenIds.length && order.every((id, index) => id === answer.tokenIds[index]));
  }
  return false;
}

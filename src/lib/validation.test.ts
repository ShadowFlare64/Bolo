import { describe, expect, it } from "vitest";
import { introLesson } from "../data/intro-lesson";
import { isAnswerReady, validateAnswer } from "./validation";
describe("answer validation", () => {
  const choice = introLesson.exercises[0];
  const arrangement = introLesson.exercises[4];
  it("accepts the correct choice and rejects an incorrect or unknown choice", () => {
    expect(validateAnswer(choice, { type: "multiple-choice", optionId: "how" })).toBe(true);
    for (const optionId of ["well", "unknown"]) expect(validateAnswer(choice, { type: "multiple-choice", optionId })).toBe(false);
  });
  it("requires a complete answer with valid, unique tokens", () => {
    for (const tokenIds of [[], ["hu"], ["hu", "hu", "chhu"], ["hu", "majama", "fake"]]) expect(isAnswerReady(arrangement, { type: "sentence-arrangement", tokenIds })).toBe(false);
    expect(isAnswerReady(choice, null)).toBe(false);
  });
  it("checks sentence order, rather than just the presence of words", () => {
    expect(validateAnswer(arrangement, { type: "sentence-arrangement", tokenIds: ["hu", "majama", "chhu"] })).toBe(true);
    expect(validateAnswer(arrangement, { type: "sentence-arrangement", tokenIds: ["chhu", "majama", "hu"] })).toBe(false);
  });
  it("rejects mismatched answer types", () => {
    expect(validateAnswer(choice, { type: "sentence-arrangement", tokenIds: [] })).toBe(false);
  });
});

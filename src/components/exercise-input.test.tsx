// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { introLesson } from "../data/intro-lesson";
import { ExerciseInput } from "./exercise-input";

afterEach(cleanup);

it("preserves a selected radio and exposes only the active script in its accessible name", () => {
  const exercise = introLesson.exercises.find(item => item.type === "multiple-choice")!;
  const option = exercise.options[0];
  const props = { exercise, answer: { type: "multiple-choice" as const, optionId: option.id }, locked: false, feedback: null, correctOptionId: null, onChange: vi.fn() };
  const view = render(<ExerciseInput {...props} mode="romanized" />);
  expect((screen.getByRole("radio", { name: option.text.romanized }) as HTMLInputElement).checked).toBe(true);
  view.rerender(<ExerciseInput {...props} mode="gujarati" />);
  expect((screen.getByRole("radio", { name: option.text.gujarati }) as HTMLInputElement).checked).toBe(true);
  expect(screen.queryByRole("radio", { name: option.text.romanized })).toBeNull();
  expect(props.onChange).not.toHaveBeenCalled();
});

it("keeps sentence order and word-removal behavior when switching scripts", () => {
  const exercise = introLesson.exercises.find(item => item.type === "sentence-arrangement")!;
  const tokenIds = [...exercise.acceptedOrders[0]];
  const first = exercise.tokens.find(token => token.id === tokenIds[0])!;
  const onChange = vi.fn();
  const props = { exercise, answer: { type: "sentence-arrangement" as const, tokenIds }, locked: false, feedback: null, correctOptionId: null, onChange };
  const view = render(<ExerciseInput {...props} mode="romanized" />);
  view.rerender(<ExerciseInput {...props} mode="gujarati" />);
  const words = screen.getAllByRole("button", { name: /Remove word/ });
  expect(words.length).toBe(tokenIds.length);
  expect(words[0].getAttribute("aria-label")).toBe(`Remove word 1: ${first.text.gujarati}`);
  fireEvent.click(words[0]);
  expect(onChange).toHaveBeenCalledWith({ type: "sentence-arrangement", tokenIds: tokenIds.slice(1) });
});

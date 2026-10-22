// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonPlayer } from "./lesson-player";
import { introLesson } from "../data/intro-lesson";
import { api } from "../lib/api";
import { validateAnswer } from "../lib/validation";
import type { Attempt, PublicLesson } from "../lib/types";

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return { ...actual, api: { ...actual.api, start: vi.fn(), answer: vi.fn(), complete: vi.fn(), progress: vi.fn() } };
});

// Render the same public content shape as the backend: no answer keys.
const publicLesson: PublicLesson = {
  ...introLesson,
  exercises: introLesson.exercises.map(exercise => {
    const { explanation, ...publicExercise } = exercise;
    if (publicExercise.type === "multiple-choice") {
      const { correctOptionId, ...content } = publicExercise;
      return content;
    }
    const { acceptedOrders, ...content } = publicExercise;
    return content;
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  const attempts = new Map<string, { attempt: Attempt; answers: Map<string, boolean> }>();
  vi.mocked(api.start).mockImplementation(async (_learner, lessonId, originalAttemptId) => {
    const attempt: Attempt = { id: `attempt-${attempts.size}`, lessonId, originalAttemptId: originalAttemptId ?? null, total: originalAttemptId ? attempts.get(originalAttemptId)!.attempt.missedExerciseIds.length : 5, score: null, completedAt: null, missedExerciseIds: [] };
    attempts.set(attempt.id, { attempt, answers: new Map() });
    return attempt;
  });
  vi.mocked(api.answer).mockImplementation(async (_learner, attemptId, exerciseId, answer) => {
    const exercise = introLesson.exercises.find(exercise => exercise.id === exerciseId)!;
    const correct = validateAnswer(exercise, answer);
    attempts.get(attemptId)!.answers.set(exerciseId, correct);
    return { correct, explanation: exercise.explanation, correctOptionId: exercise.type === "multiple-choice" ? exercise.correctOptionId : null };
  });
  vi.mocked(api.complete).mockImplementation(async (_learner, attemptId) => {
    const { attempt, answers } = attempts.get(attemptId)!;
    attempt.score = [...answers.values()].filter(Boolean).length;
    attempt.missedExerciseIds = [...answers].filter(([, correct]) => !correct).map(([id]) => id);
    attempt.completedAt = "2026-10-14T00:00:00Z";
    return attempt;
  });
  vi.mocked(api.progress).mockResolvedValue([]);
});

afterEach(cleanup);

it("advances only one question when Continue is clicked repeatedly before rendering", async () => {
  const user = userEvent.setup();
  render(<LessonPlayer lesson={publicLesson} learnerId="learner-test" />);
  await user.click(screen.getByRole("button", { name: /Let’s practice/ }));
  await user.click(screen.getByRole("radio", { name: /Kem cho/ }));
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  const next = screen.getByRole("button", { name: /Continue/ });
  act(() => { next.click(); next.click(); next.click(); });
  expect(screen.getByRole("heading", { name: introLesson.exercises[1].prompt })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Check answer/ }).hasAttribute("disabled")).toBe(true);
  expect(api.answer).toHaveBeenCalledTimes(1);
});

async function completeLesson(missQuestions = false) {
  const user = userEvent.setup();
  render(<LessonPlayer lesson={publicLesson} learnerId="learner-test" />);
  await user.click(screen.getByRole("button", { name: /Let’s practice/ }));
  // Miss one question of each type when requested.
  await user.click(screen.getByRole("radio", { name: missQuestions ? /Aabhar/ : /Kem cho/ }));
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  await user.click(screen.getByRole("radio", { name: /Hu majama chhu/ }));
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  for (const word of missQuestions ? ["cho?", "Kem"] : ["Kem", "cho?"]) {
    await user.click(screen.getByRole("button", { name: word }));
  }
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  await user.click(screen.getByRole("radio", { name: /Aabhar/ }));
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  await user.click(screen.getByRole("button", { name: /Continue/ }));
  for (const word of ["Hu", "majama", "chhu."]) {
    await user.click(screen.getByRole("button", { name: word }));
  }
  await user.click(screen.getByRole("button", { name: /Check answer/ }));
  await user.click(screen.getByRole("button", { name: /Finish lesson/ }));
  return user;
}

describe("missed question review", () => {
  it("locks an answer after a failed submission and safely retries the same answer", async () => {
    const user = userEvent.setup();
    vi.mocked(api.answer).mockRejectedValueOnce(new Error("Connection interrupted. Try again."));
    render(<LessonPlayer lesson={publicLesson} learnerId="learner-test" />);
    await user.click(screen.getByRole("button", { name: /Let’s practice/ }));
    await user.click(screen.getByRole("radio", { name: /Kem cho/ }));
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    expect((await screen.findByRole("alert")).textContent).toContain("Connection interrupted");
    expect(screen.getByRole("radio", { name: /Kem cho/ }).closest("fieldset")?.disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(await screen.findByText("✓ That’s right!")).toBeTruthy();
    expect(vi.mocked(api.answer).mock.calls[0]).toEqual(vi.mocked(api.answer).mock.calls[1]);
  });

  it("can retry a failed completion without losing answers or the original score", async () => {
    vi.mocked(api.complete).mockRejectedValueOnce(new Error("Could not save completion."));
    const user = await completeLesson(true);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not save completion");
    await user.click(screen.getByRole("button", { name: /Finish lesson/ }));
    expect(await screen.findByText("Original score: 3 of 5 correct.")).toBeTruthy();
    expect(api.complete).toHaveBeenCalledTimes(2);
  });

  it("shows the original score and offers no review when every answer is correct", async () => {
    await completeLesson();
    expect(screen.getByText("Original score: 5 of 5 correct.")).toBeTruthy();
    expect(screen.getByText("0 missed questions on your original attempt.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Mistakes" })).toBeNull();
  });

  it("reviews only missed questions of both types and preserves the original result", async () => {
    const user = await completeLesson(true);
    expect(screen.getByText("Original score: 3 of 5 correct.")).toBeTruthy();
    expect(screen.getByText("2 missed questions on your original attempt.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Review Mistakes" }));
    expect(screen.getByText("1 of 2 exercises")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Check answer/ }).hasAttribute("disabled")).toBe(true);
    // Reuse the choice controls, including switching scripts during review.
    await user.click(screen.getByRole("button", { name: "ગુજરાતી" }));
    await user.click(screen.getByRole("radio", { name: /કેમ છો/ }));
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("✓ That’s right!")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /કેમ છો/ }).closest("fieldset")?.disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("2 of 2 exercises")).toBeTruthy();
    expect(screen.getByRole("heading", { name: 'Build the question: “How are you?”' })).toBeTruthy();
    // Reuse arrangement controls, including removing and re-adding words.
    await user.click(screen.getByRole("button", { name: "કેમ" }));
    await user.click(screen.getByRole("button", { name: "Remove word 1: કેમ" }));
    await user.click(screen.getByRole("button", { name: "કેમ" }));
    await user.click(screen.getByRole("button", { name: "છો?" }));
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("✓ That’s right!")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Finish review/ }));
    expect(screen.getByRole("heading", { name: "Review complete." })).toBeTruthy();
    expect(screen.getByText("Original score: 3 of 5 correct.")).toBeTruthy();
    expect(screen.getByText("2 missed questions on your original attempt.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Mistakes" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Restart full lesson/ }));
    await user.click(screen.getByRole("button", { name: /Let’s practice/ }));
    expect(screen.getByText("1 of 5 exercises")).toBeTruthy();
  });

  it("allows incorrect review answers without extending the queue or changing the original score", async () => {
    const user = await completeLesson(true);
    await user.click(screen.getByRole("button", { name: "Review Mistakes" }));
    await user.click(screen.getByRole("radio", { name: /Aabhar/ }));
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    expect(screen.getByText("Keep going — here’s the phrase.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    for (const word of ["cho?", "Kem"]) await user.click(screen.getByRole("button", { name: word }));
    await user.click(screen.getByRole("button", { name: /Check answer/ }));
    await user.click(screen.getByRole("button", { name: /Finish review/ }));
    expect(screen.getByRole("heading", { name: "Review complete." })).toBeTruthy();
    expect(screen.getByText("Original score: 3 of 5 correct.")).toBeTruthy();
    expect(screen.getByText("2 missed questions on your original attempt.")).toBeTruthy();
  });

  it("clears the original score and missed list when restarting the full lesson", async () => {
    const user = await completeLesson(true);
    await user.click(screen.getByRole("button", { name: /Restart full lesson/ }));
    await user.click(screen.getByRole("button", { name: /Let’s practice/ }));
    for (const exercise of introLesson.exercises) {
      if (exercise.type === "multiple-choice") {
        const option = exercise.options.find(option => option.id === exercise.correctOptionId)!;
        await user.click(screen.getByRole("radio", { name: new RegExp(option.text.romanized.replace(/[.?]/g, "\\$&")) }));
      } else {
        for (const id of exercise.acceptedOrders[0]) {
          const token = exercise.tokens.find(token => token.id === id)!;
          await user.click(screen.getByRole("button", { name: token.text.romanized }));
        }
      }
      await user.click(screen.getByRole("button", { name: /Check answer/ }));
      await user.click(screen.getByRole("button", { name: /Continue|Finish lesson/ }));
    }
    expect(screen.getByText("Original score: 5 of 5 correct.")).toBeTruthy();
    expect(screen.getByText("0 missed questions on your original attempt.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Mistakes" })).toBeNull();
  });
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonPlayer } from "./lesson-player";
import { introLesson } from "../data/intro-lesson";

afterEach(cleanup);

async function completeLesson(missQuestions = false) {
  const user = userEvent.setup();
  render(<LessonPlayer lesson={introLesson} />);
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

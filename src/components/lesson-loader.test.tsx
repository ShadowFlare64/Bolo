// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../lib/api";
import { introLesson } from "../data/intro-lesson";
import { LessonLoader } from "./lesson-loader";

vi.mock("../lib/api", () => ({ api: { lessons: vi.fn(), ensureLearner: vi.fn(), lesson: vi.fn(), progress: vi.fn() } }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.lessons).mockResolvedValue([{ id: introLesson.id, title: introLesson.title, position: 0 }]);
  vi.mocked(api.ensureLearner).mockResolvedValue("persistent-id");
  vi.mocked(api.lesson).mockResolvedValue(introLesson);
  vi.mocked(api.progress).mockResolvedValue([{ lessonId: introLesson.id, bestScore: 3, total: 5, completedCount: 1, completedAt: "2026-10-14T00:00:00Z" }]);
});

it("loads the lesson and restores completed progress on a fresh mount", async () => {
  const first = render(<LessonLoader />);
  expect(screen.getByRole("status").textContent).toContain("Loading");
  expect(await screen.findByText("Saved progress: completed 1 time · Best score 3/5")).toBeTruthy();
  first.unmount();
  render(<LessonLoader />);
  expect(await screen.findByText("Saved progress: completed 1 time · Best score 3/5")).toBeTruthy();
  expect(api.progress).toHaveBeenCalledTimes(2);
});

it("shows an error and can retry loading", async () => {
  vi.mocked(api.lessons).mockRejectedValueOnce(new Error("Backend unavailable"));
  render(<LessonLoader />);
  expect((await screen.findByRole("alert")).textContent).toContain("Backend unavailable");
  await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("heading", { name: introLesson.title })).toBeTruthy();
});

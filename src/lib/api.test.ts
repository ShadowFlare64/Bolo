// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("API integration", () => {
  it("creates one anonymous learner even with concurrent loads and retrieves it after refresh", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ id: "persistent-id" }, 201));
    vi.stubGlobal("fetch", fetch);
    expect(await Promise.all([api.ensureLearner(), api.ensureLearner()])).toEqual(["persistent-id", "persistent-id"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("bolo.learnerId")).toBe("persistent-id");
    fetch.mockResolvedValue(json({ id: "persistent-id" }));
    expect(await api.ensureLearner()).toBe("persistent-id");
    expect(fetch.mock.calls[1][0]).toContain("/learners/me");
    expect(fetch.mock.calls[1][1].headers["X-Learner-ID"]).toBe("persistent-id");
  });

  it("submits only the answer, never browser-calculated correctness", async () => {
    const fetch = vi.fn().mockResolvedValue(json({ correct: false, explanation: "Try again", correctOptionId: "how" }));
    vi.stubGlobal("fetch", fetch);
    const answer = { type: "multiple-choice" as const, optionId: "thanks" };
    expect((await api.answer("learner", "attempt", "exercise", answer)).correct).toBe(false);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ answer });
    expect(fetch.mock.calls[0][1].headers["X-Learner-ID"]).toBe("learner");
  });

  it("reports server errors without silently replacing an existing profile", async () => {
    localStorage.setItem("bolo.learnerId", "persistent-id");
    const fetch = vi.fn().mockResolvedValue(json({ detail: "Learner not found" }, 404));
    vi.stubGlobal("fetch", fetch);
    await expect(api.ensureLearner()).rejects.toBeInstanceOf(ApiError);
    expect(localStorage.getItem("bolo.learnerId")).toBe("persistent-id");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports network failure so the UI can show a retry action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api.lessons()).rejects.toThrow("Check that the backend is running");
  });
});

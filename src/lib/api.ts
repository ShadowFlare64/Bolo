import type { Answer, AnswerResult, Attempt, Progress, PublicLesson } from "./types";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const learnerKey = "bolo.learnerId";

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export class MissingProfileError extends ApiError {}

async function request<T>(path: string, learnerId?: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(learnerId ? { "X-Learner-ID": learnerId } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(typeof error.detail === "string" ? error.detail : "The request could not be completed.", response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Could not reach Bolo. Check that the backend is running, then try again.");
  } finally { clearTimeout(timer); }
}

let creatingLearner: Promise<string> | null = null;
async function ensureLearner(): Promise<string> {
  const existing = localStorage.getItem(learnerKey);
  if (existing) {
    try { await request("/learners/me", existing); }
    catch (error) {
      if (error instanceof ApiError && [404, 422].includes(error.status)) {
        throw new MissingProfileError("This browser’s saved profile is not available in the current database. Retry if you changed databases, or start a new anonymous profile.", error.status);
      }
      throw error;
    }
    return existing;
  }
  return createLearner();
}

function createLearner(): Promise<string> {
  // React development mode may mount twice; share one profile creation request.
  if (!creatingLearner) creatingLearner = request<{ id: string }>("/learners", undefined, {}).then(learner => {
    localStorage.setItem(learnerKey, learner.id);
    return learner.id;
  }).finally(() => { creatingLearner = null; });
  return creatingLearner;
}

export const api = {
  ensureLearner,
  createNewLearner: createLearner,
  lessons: () => request<{ id: string; title: string; position: number }[]>("/lessons"),
  lesson: (id: string) => request<PublicLesson>(`/lessons/${encodeURIComponent(id)}`),
  progress: (learnerId: string) => request<Progress[]>("/learners/me/progress", learnerId),
  start: (learnerId: string, lessonId: string, originalAttemptId?: string) => request<Attempt>("/attempts", learnerId, { lessonId, originalAttemptId }),
  answer: (learnerId: string, attemptId: string, exerciseId: string, answer: Answer) => request<AnswerResult>(`/attempts/${attemptId}/exercises/${encodeURIComponent(exerciseId)}/answers`, learnerId, { answer }),
  complete: (learnerId: string, attemptId: string) => request<Attempt>(`/attempts/${attemptId}/complete`, learnerId, {}),
};

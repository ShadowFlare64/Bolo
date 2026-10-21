"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, MissingProfileError } from "../lib/api";
import type { Progress, PublicLesson } from "../lib/types";
import { LessonPlayer } from "./lesson-player";

export function LessonLoader() {
  const [loaded, setLoaded] = useState<{ lesson: PublicLesson; learnerId: string; progress?: Progress } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [missingProfile, setMissingProfile] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  async function newProfile() {
    setCreatingProfile(true);
    try {
      await api.createNewLearner();
      setRetry(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to create a profile."); }
    finally { setCreatingProfile(false); }
  }
  useEffect(() => {
    let active = true;
    setError("");
    setMissingProfile(false);
    async function load() {
      const [lessons, learnerId] = await Promise.all([api.lessons(), api.ensureLearner()]);
      if (!lessons.length) throw new Error("No lessons are available yet. Run the backend seed script.");
      const [lesson, progress] = await Promise.all([api.lesson(lessons[0].id), api.progress(learnerId)]);
      if (!lesson.exercises.length) throw new Error("This lesson has no exercises yet.");
      if (active) setLoaded({ lesson, learnerId, progress: progress.find(item => item.lessonId === lesson.id) });
    }
    load().catch(error => { if (active) { setError(error instanceof Error ? error.message : "Unable to load the lesson."); setMissingProfile(error instanceof MissingProfileError); } });
    return () => { active = false; };
  }, [retry]);
  if (loaded) return <LessonPlayer {...loaded} />;
  return <div className="learn-page"><header className="site-header shell"><Link className="brand" href="/">bolo<span lang="gu">બોલો</span></Link><Link className="exit-link" href="/">Back to home</Link></header><main className="learn-shell"><section className="exercise-panel"><h1>{error ? "Let’s try that again." : "Getting your lesson ready…"}</h1>{error ? <><p className="panel-description" role="alert">{error}</p><div className="completion-actions"><button className="button" disabled={creatingProfile} onClick={() => setRetry(value => value + 1)}>Try again</button>{missingProfile && <button className="button secondary" disabled={creatingProfile} onClick={newProfile}>Start new anonymous profile</button>}</div></> : <p className="panel-description" role="status">Loading your phrases and saved progress.</p>}</section></main></div>;
}

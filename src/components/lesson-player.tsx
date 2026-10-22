"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Answer, PublicLesson, Progress, ScriptMode } from "../lib/types";
import { isAnswerReady } from "../lib/validation";
import { api, ApiError } from "../lib/api";
import { ExerciseInput } from "./exercise-input";
import { ScriptText } from "./script-text";

type Props = { lesson: PublicLesson; learnerId: string; progress?: Progress };
export function LessonPlayer({ lesson, learnerId, progress: initialProgress }: Props) {
  const [mode, setMode] = useState<ScriptMode>("romanized");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState("");
  const [correctOptionId, setCorrectOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [missedExerciseIds, setMissedExerciseIds] = useState<string[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [originalAttemptId, setOriginalAttemptId] = useState<string | null>(null);
  const [savedProgress, setSavedProgress] = useState(initialProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Keep a submitted answer locked after a network failure: retry that same
  // answer, since the server may have recorded it before the response was lost.
  const [submittedAnswer, setSubmittedAnswer] = useState<Answer | null>(null);
  const busyRef = useRef(false);
  const advancing = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    advancing.current = false;
    heading.current?.focus();
  }, [index, started, complete, reviewing]);

  const exercises = reviewing
    ? lesson.exercises.filter(exercise => missedExerciseIds.includes(exercise.id))
    : lesson.exercises;
  const exercise = exercises[index];

  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  function clearQuestion() {
    setAnswer(null);
    setSubmittedAnswer(null);
    setFeedback(null);
    setExplanation("");
    setCorrectOptionId(null);
  }

  function startLesson() {
    void run(async () => {
      const attempt = await api.start(learnerId, lesson.id);
      setAttemptId(attempt.id);
      setOriginalAttemptId(attempt.id);
      setStarted(true);
    });
  }

  function check() {
    if (!answer || feedback !== null || !attemptId || !isAnswerReady(exercise, answer)) return;
    void run(async () => {
      const submission = submittedAnswer ?? answer;
      setSubmittedAnswer(submission);
      try {
        const result = await api.answer(learnerId, attemptId, exercise.id, submission);
        setFeedback(result.correct);
        setExplanation(result.explanation);
        setCorrectOptionId(result.correctOptionId);
        if (!reviewing) {
          if (result.correct) setScore(value => value + 1);
          else setMissedExerciseIds(previous => [...previous, exercise.id]);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 422) setSubmittedAnswer(null);
        throw error;
      }
    });
  }

  function advance() {
    if (feedback === null || !attemptId || busyRef.current || advancing.current) return;
    if (index < exercises.length - 1) {
      // Lock synchronously until the next question commits. A burst of clicks
      // can otherwise reuse this question's feedback before React renders.
      advancing.current = true;
      setIndex(value => value + 1);
      clearQuestion();
    } else {
      void run(async () => {
        const result = await api.complete(learnerId, attemptId);
        if (!reviewing) {
          setScore(result.score ?? 0);
          setMissedExerciseIds(result.missedExerciseIds);
        }
        const progress = await api.progress(learnerId);
        setSavedProgress(progress.find(item => item.lessonId === lesson.id));
        setComplete(true);
      });
    }
  }

  function startReview() {
    if (!missedExerciseIds.length || !originalAttemptId) return;
    void run(async () => {
      const attempt = await api.start(learnerId, lesson.id, originalAttemptId);
      setAttemptId(attempt.id);
      setReviewing(true);
      setIndex(0);
      clearQuestion();
      setComplete(false);
      setStarted(true);
    });
  }

  function restart() {
    setIndex(0);
    clearQuestion();
    setScore(0);
    setMissedExerciseIds([]);
    setReviewing(false);
    setComplete(false);
    setStarted(false);
    setAttemptId(null);
    setOriginalAttemptId(null);
    setError("");
  }
  const progress = complete ? 100 : Math.round(index / exercises.length * 100);
  return <div className="learn-page" data-review={reviewing || undefined}>
    <a className="skip-link" href="#lesson-content">Skip to lesson</a>
    <header className="site-header shell">
      <Link className="brand" href="/" aria-label="Bolo home">bolo<span lang="gu">બોલો</span></Link>
      <span className="header-context">Gujarati <span aria-hidden>/</span> Beginner course</span>
      <Link className="exit-link" href="/">Exit lesson <span aria-hidden>×</span></Link>
    </header>
    <main className="learn-shell" id="lesson-content">
      <div className="lesson-meta">
        <span className="eyebrow">{reviewing ? "BEGINNER · REVIEW" : "BEGINNER · LESSON 01"}</span>
        <span className="quiet">{complete ? "Complete" : started ? `${index + 1} of ${exercises.length} exercises` : "About 4 minutes"}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Lesson progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
      <div aria-live="polite">{savedProgress && <p className="quiet saved-progress">Saved progress: completed {savedProgress.completedCount} {savedProgress.completedCount === 1 ? "time" : "times"} · Best score {savedProgress.bestScore}/{savedProgress.total}</p>}</div>
      {error && <p className="feedback incorrect" role="alert">{error}</p>}
      <div className="learn-toolbar">
        <span className="quiet">{lesson.title}</span>
        <div className="script-toggle" role="group" aria-label="Display script">
          <button aria-pressed={mode === "romanized"} onClick={() => setMode("romanized")}>Romanized</button>
          <button aria-pressed={mode === "gujarati"} onClick={() => setMode("gujarati")}><span lang="gu">ગુજરાતી</span></button>
        </div>
      </div>
      {reviewing && !complete && <p className="review-context">Mistake review · Original score: {score}/{lesson.exercises.length}</p>}
      {complete ? <section className="exercise-panel completion" key={reviewing ? "review-complete" : "lesson-complete"}>
        <div className="completion-symbol" aria-hidden>✓</div>
        <p className="eyebrow">{reviewing ? "REVIEW COMPLETED" : "LESSON COMPLETED"}</p>
        <h1 ref={heading} tabIndex={-1}>{reviewing ? "Review complete." : <>Your first conversation,<br /><em>in the books.</em></>}</h1>
        <p>Original score: {score} of {lesson.exercises.length} correct.</p>
        <p>{missedExerciseIds.length} missed {missedExerciseIds.length === 1 ? "question" : "questions"} on your original attempt.</p>
        {reviewing && <p>You revisited all {exercises.length} missed {exercises.length === 1 ? "question" : "questions"}. Your original score stays unchanged.</p>}
        <div className="result-stat"><strong>{Math.round(score / lesson.exercises.length * 100)}%</strong><span>original lesson accuracy</span></div>
        <p className="quiet">Your completed lesson progress is saved in this browser’s anonymous profile.</p>
        <div className="completion-actions">
          {!reviewing && missedExerciseIds.length > 0 && <button className="button" disabled={busy} onClick={startReview}>Review Mistakes</button>}
          <button className="button secondary" disabled={busy} onClick={restart}>Restart full lesson ↻</button>
          <Link className="button secondary" href="/">Back to home</Link>
        </div>
      </section> : !started ? <section className="exercise-panel" key="introduction">
        <p className="eyebrow">FIRST, MEET YOUR NEW PHRASES</p>
        <h1 ref={heading} tabIndex={-1}>{lesson.title}</h1>
        <p className="panel-description">{lesson.description} Take a look at these phrases before you practice.</p>
        <div className="phrase-list">{lesson.phrases.map(phrase => <div key={phrase.romanized}><strong><ScriptText text={phrase} mode={mode} /></strong><span>{phrase.english}</span></div>)}</div>
        <button className="button w-full" disabled={busy} onClick={startLesson}>Let’s practice <span aria-hidden>→</span></button>
      </section> : <section className="exercise-panel" key={`${reviewing ? "review" : "lesson"}-${exercise.id}`}>
        <p className="eyebrow">{exercise.type === "multiple-choice" ? "CHOOSE THE RIGHT PHRASE" : "PUT THE WORDS TOGETHER"}</p>
        <h1 ref={heading} tabIndex={-1}>{exercise.prompt}</h1>
        <p className="panel-description">{exercise.type === "multiple-choice" ? "Choose one answer below." : "Build your sentence using the words below."}</p>
        <ExerciseInput key={exercise.id} exercise={exercise} answer={answer} mode={mode} locked={feedback !== null || busy || submittedAnswer !== null} feedback={feedback} correctOptionId={correctOptionId} onChange={setAnswer} />
        <div className="feedback-slot" role="status" aria-live="polite">
          {busy && <p className="quiet">Saving your progress…</p>}
          {feedback !== null && <div className={`feedback ${feedback ? "correct" : "incorrect"}`}><strong>{feedback ? "✓ That’s right!" : "Keep going — here’s the phrase."}</strong><p>{explanation}</p></div>}
        </div>
        {feedback === null
          ? <button className="button w-full" disabled={busy || !isAnswerReady(exercise, answer)} onClick={check}>Check answer <span aria-hidden>→</span></button>
          : <button className="button w-full" disabled={busy} onClick={advance}>{index === exercises.length - 1 ? (reviewing ? "Finish review" : "Finish lesson") : "Continue"} <span aria-hidden>→</span></button>}
      </section>}
      <aside className="review-note"><p>Learning content is a draft awaiting native-speaker review. <a href={lesson.sources[0].url} target="_blank" rel="noreferrer">Phrase reference ↗</a></p></aside>
    </main>
    <footer className="learn-footer">Gujarati for everyday connection.</footer>
  </div>;
}

"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Answer, Lesson, ScriptMode } from "../lib/types";
import { isAnswerReady, validateAnswer } from "../lib/validation";
import { ExerciseInput } from "./exercise-input";
export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [mode, setMode] = useState<ScriptMode>("romanized");
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [missedExerciseIds, setMissedExerciseIds] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [index, started, complete, reviewing]);
  // Keep the original lesson data and attempt results intact during review.
  const exercises = reviewing
    ? lesson.exercises.filter(exercise => missedExerciseIds.includes(exercise.id))
    : lesson.exercises;
  const exercise = exercises[index];
  function check() {
    if (!answer || feedback !== null || !isAnswerReady(exercise, answer)) return;
    const correct = validateAnswer(exercise, answer);
    setFeedback(correct);
    if (!reviewing) {
      if (correct) setScore(value => value + 1);
      else setMissedExerciseIds(previous => [...previous, exercise.id]);
    }
  }
  function advance() {
    if (index === exercises.length - 1) setComplete(true);
    else { setIndex(value => value + 1); setAnswer(null); setFeedback(null); }
  }
  function startReview() {
    if (missedExerciseIds.length === 0) return;
    setReviewing(true);
    setIndex(0);
    setAnswer(null);
    setFeedback(null);
    setComplete(false);
    setStarted(true);
  }
  function restart() {
    setIndex(0);
    setAnswer(null);
    setFeedback(null);
    setScore(0);
    setMissedExerciseIds([]);
    setReviewing(false);
    setComplete(false);
    setStarted(false);
  }
  const progress = complete ? 100 : Math.round(index / exercises.length * 100);
  return <div className="learn-page"><header className="site-header shell"><Link className="brand" href="/">bolo<span lang="gu">બોલો</span></Link><Link className="exit-link" href="/">Exit lesson <span aria-hidden>×</span></Link></header><main className="learn-shell"><div className="lesson-meta"><span className="eyebrow">{reviewing ? "BEGINNER · REVIEW" : "BEGINNER · LESSON 01"}</span><span className="quiet">{complete ? "Complete" : started ? `${index + 1} of ${exercises.length} exercises` : "About 4 minutes"}</span></div><div className="progress-track" role="progressbar" aria-label="Lesson progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
    <div className="learn-toolbar"><span className="quiet">{lesson.title}</span><div className="script-toggle" role="group" aria-label="Display script"><button aria-pressed={mode === "romanized"} onClick={() => setMode("romanized")}>Romanized</button><button aria-pressed={mode === "gujarati"} onClick={() => setMode("gujarati")}><span lang="gu">ગુજરાતી</span></button></div></div>
    {complete ? <section className="exercise-panel completion"><div className="completion-symbol" aria-hidden>✳</div><p className="eyebrow">A SMALL STEP WORTH TAKING</p><h1 ref={heading} tabIndex={-1}>{reviewing ? "Review complete." : <>Your first conversation,<br /><em>in the books.</em></>}</h1><p>Original score: {score} of {lesson.exercises.length} correct.</p><p>{missedExerciseIds.length} missed {missedExerciseIds.length === 1 ? "question" : "questions"} on your original attempt.</p>{reviewing && <p>You revisited all {exercises.length} missed {exercises.length === 1 ? "question" : "questions"}. Your original score stays unchanged.</p>}<div className="result-stat"><strong>{Math.round(score / lesson.exercises.length * 100)}%</strong><span>original lesson accuracy</span></div><p className="quiet">Progress lasts while this lesson is open. Account-based saving comes in a later milestone.</p><div className="completion-actions">{!reviewing && missedExerciseIds.length > 0 && <button className="button" onClick={startReview}>Review Mistakes</button>}<button className="button secondary" onClick={restart}>Restart full lesson ↻</button><Link className="button secondary" href="/">Back to home</Link></div></section> : !started ? <section className="exercise-panel"><p className="eyebrow">FIRST, MEET YOUR NEW PHRASES</p><h1 ref={heading} tabIndex={-1}>{lesson.title}</h1><p className="panel-description">{lesson.description} Take a look at these phrases before you practice.</p><div className="phrase-list">{lesson.phrases.map(phrase => <div key={phrase.romanized}><strong lang={mode === "gujarati" ? "gu" : undefined}>{phrase[mode]}</strong><span>{phrase.english}</span></div>)}</div><button className="button w-full" onClick={() => setStarted(true)}>Let’s practice <span aria-hidden>→</span></button></section> : <section className="exercise-panel"><p className="eyebrow">{exercise.type === "multiple-choice" ? "CHOOSE THE RIGHT PHRASE" : "PUT THE WORDS TOGETHER"}</p><h1 ref={heading} tabIndex={-1}>{exercise.prompt}</h1><p className="panel-description">{exercise.type === "multiple-choice" ? "Choose one answer below." : "Build your sentence using the words below."}</p><ExerciseInput key={exercise.id} exercise={exercise} answer={answer} mode={mode} locked={feedback !== null} feedback={feedback} onChange={setAnswer} /><div className="feedback-slot" role="status" aria-live="polite">{feedback !== null && <div className={`feedback ${feedback ? "correct" : "incorrect"}`}><strong>{feedback ? "✓ That’s right!" : "Keep going — here’s the phrase."}</strong><p>{exercise.explanation}</p></div>}</div>{feedback === null ? <button className="button w-full" disabled={!isAnswerReady(exercise, answer)} onClick={check}>Check answer <span aria-hidden>→</span></button> : <button className="button w-full" onClick={advance}>{index === exercises.length - 1 ? (reviewing ? "Finish review" : "Finish lesson") : "Continue"} <span aria-hidden>→</span></button>}</section>}
    <aside className="review-note"><span aria-hidden>◇</span><p>Learning content is a draft awaiting native-speaker review. <a href={lesson.sources[0].url} target="_blank" rel="noreferrer">Phrase reference ↗</a></p></aside></main><footer className="learn-footer">A little practice. A little closer.</footer></div>;
}

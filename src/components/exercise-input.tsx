import type { Answer, PublicExercise, ScriptMode } from "../lib/types";
import { ScriptText } from "./script-text";

type Props = { exercise: PublicExercise; answer: Answer | null; mode: ScriptMode; locked: boolean; feedback: boolean | null; correctOptionId: string | null; onChange: (answer: Answer) => void };
export function ExerciseInput({ exercise, answer, mode, locked, feedback, correctOptionId, onChange }: Props) {
  if (exercise.type === "multiple-choice") {
    return <fieldset className="choices" disabled={locked}>
      <legend className="sr-only">Choose an answer</legend>
      {exercise.options.map((option, index) => {
        const selected = answer?.type === "multiple-choice" && answer.optionId === option.id;
        const correct = feedback !== null && option.id === correctOptionId;
        const incorrect = feedback === false && selected;
        return <label key={option.id} className={`choice ${selected ? "selected" : ""} ${locked ? "locked" : ""} ${correct ? "answer-correct" : ""} ${incorrect ? "answer-incorrect" : ""}`}>
          <input type="radio" name={exercise.id} checked={selected} onChange={() => onChange({ type: "multiple-choice", optionId: option.id })} />
          <span className="choice-number" aria-hidden>{index + 1}</span>
          <ScriptText text={option.text} mode={mode} />
          <span className="choice-check" aria-hidden>{correct ? "✓" : incorrect ? "×" : selected ? "●" : "○"}</span>
          {correct && <span className="sr-only"> — Correct answer</span>}
          {incorrect && <span className="sr-only"> — Incorrect answer</span>}
        </label>;
      })}
    </fieldset>;
  }
  const ids = answer?.type === "sentence-arrangement" ? answer.tokenIds : [];
  return <div>
    <p className="quiet">Select words in order. Select an added word to remove it.</p>
    <div className={`sentence-area ${feedback === true ? "answer-correct" : feedback === false ? "answer-incorrect" : ""}`} aria-label="Your sentence">
      {ids.length === 0 && <span className="quiet">Your sentence goes here…</span>}
      {ids.map((id, index) => {
        const token = exercise.tokens.find(token => token.id === id)!;
        return <button className="word" disabled={locked} key={id} aria-label={`Remove word ${index + 1}: ${token.text[mode]}`} onClick={() => onChange({ type: "sentence-arrangement", tokenIds: ids.filter(tokenId => tokenId !== id) })}>
          <ScriptText text={token.text} mode={mode} />
        </button>;
      })}
    </div>
    <div className="word-bank" aria-label="Available words">
      {exercise.tokens.map(token => <button className="word" key={token.id} disabled={locked || ids.includes(token.id)} onClick={() => onChange({ type: "sentence-arrangement", tokenIds: [...ids, token.id] })}>
        <ScriptText text={token.text} mode={mode} />
      </button>)}
    </div>
    <button className="text-button" disabled={locked || ids.length === 0} onClick={() => onChange({ type: "sentence-arrangement", tokenIds: [] })}>Clear sentence</button>
  </div>;
}

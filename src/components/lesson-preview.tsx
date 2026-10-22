"use client";
import { useState } from "react";
import type { LearningText, ScriptMode } from "../lib/types";

// A labeled presentation example, not a graded exercise or a second engine.
const phrases: LearningText[] = [
  { romanized: "Aabhar", gujarati: "આભાર", english: "Thank you" },
  { romanized: "Kem cho?", gujarati: "કેમ છો?", english: "How are you?" },
  { romanized: "Hu majama chhu.", gujarati: "હું મજામાં છું.", english: "I am well." },
];

export function LessonPreview() {
  const [mode, setMode] = useState<ScriptMode>("romanized");
  return <section className="lesson-preview" data-reveal="80" aria-label="Example of the Bolo lesson interface">
    <div className="preview-top"><span className="preview-brand">bolo</span><span>LESSON PREVIEW</span></div>
    <div className="preview-progress"><span>YOUR FIRST CONVERSATION</span><span>1 of 5</span></div>
    <div className="preview-track" aria-hidden><span /></div>
    <div className="preview-toolbar"><span>CHOOSE THE RIGHT PHRASE</span><div className="script-toggle" role="group" aria-label="Preview display script"><button aria-pressed={mode === "romanized"} onClick={() => setMode("romanized")}>Romanized</button><button aria-pressed={mode === "gujarati"} onClick={() => setMode("gujarati")} lang="gu">ગુજરાતી</button></div></div>
    <h3>How do you ask<br />“How are you?”</h3>
    <div className="preview-options">{phrases.map((phrase, index) => <div className={`preview-option ${index === 1 ? "preview-example" : ""}`} key={phrase.romanized}><span aria-hidden>{String.fromCharCode(65 + index)}</span><strong className="preview-phrase" key={mode} lang={mode === "gujarati" ? "gu" : undefined}>{phrase[mode]}</strong>{index === 1 && <span className="preview-indicator" aria-hidden>●</span>}</div>)}</div>
    <p className="preview-footnote">Example answer shown. Switch scripts to see the same phrase in Gujarati.</p>
  </section>;
}

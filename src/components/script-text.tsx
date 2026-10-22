import type { LearningText, ScriptMode } from "../lib/types";

// Both scripts occupy the same grid cell. The hidden variant reserves space,
// so toggling the script doesn't move the surrounding controls or their focus.
export function ScriptText({ text, mode }: { text: LearningText; mode: ScriptMode }) {
  return <span className="script-text">
    <span className="script-variant" aria-hidden={mode !== "romanized"}>{text.romanized}</span>
    <span className="script-variant" lang="gu" aria-hidden={mode !== "gujarati"}>{text.gujarati}</span>
  </span>;
}

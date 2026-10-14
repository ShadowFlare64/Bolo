# Milestone 1 engineering walkthrough

This is the historical frontend-prototype walkthrough. Milestone 2 now loads content and validates answers through FastAPI and stores completed progress in PostgreSQL. See [the current backend guide](../backend/README.md) for that data flow; the local-only behavior below describes Milestone 1.

## Why this structure?

Next.js App Router gives us routes and a server-rendered landing page without a separate routing library. Only `LessonPlayer` requires the client boundary because exercises use events and React state. Its imported input component runs on the client as well. We keep content, display, and validation in separate modules so new lesson content does not require copying the player. Tailwind is available for utilities; global CSS defines the reusable visual language. No global state library is needed for one lesson.

The intended later API boundary is the lesson data contract. A FastAPI response can eventually supply a lesson to the frontend and accept answer submissions; it will need a public content model that omits correct answers. At this stage all answers are intentionally bundled with local data. A browser-visible validator is appropriate for a prototype, but cannot establish trusted progress or scores.

## Component communication

`learn/page.tsx` imports the local lesson and passes it to `LessonPlayer` through a `lesson` prop. The player passes the current exercise, answer, script mode, and locked state down to `ExerciseInput`. The input calls its `onChange` callback with a typed answer. That callback updates parent state, causing React to render the updated selection. Children never mutate lesson data or the parent's state directly.

```text
intro-lesson.ts → learn/page.tsx → LessonPlayer → ExerciseInput
                                      ↑              │
                                      └── onChange ───┘
                                      │
                                validation.ts
```

## Follow one exercise

1. Starting practice sets `started` to true. `index` begins at zero, so `lesson.exercises[index]` loads the first question.
2. The player renders the prompt and passes the exercise to `ExerciseInput`. Its `type` selects radio controls or sentence controls. `mode` chooses each phrase's Romanized or Gujarati representation without changing its ID.
3. Choosing “Kem cho?” calls `onChange({ type: "multiple-choice", optionId: "how" })`. The answer is stored in the player. `isAnswerReady` enables the check button only for a valid selection.
4. Checking invokes `validateAnswer`, which compares the selected option ID to the correct ID. Arrangement exercises compare the ordered token IDs against accepted orders, rejecting missing, duplicate, or unknown words.
5. The boolean result becomes `feedback`. Inputs lock, an accessible status region displays the explanation, and a correct answer adds one to the score. Checking cannot score the same exercise twice.
6. Continue increments `index` and clears answer and feedback. On the last exercise, it sets `complete` instead. The completion screen reports the result and offers a full reset.

Switching scripts preserves the answer because IDs represent meaning independently of the displayed spelling. A wrong answer receives an explanation before the learner can continue; this prototype does not require a retry.

## TypeScript contracts

`LearningText` groups English meaning, Romanization, and Gujarati script. `ScriptMode` is restricted to the two display keys. `Exercise` is a discriminated union: `type: "multiple-choice"` requires options and a correct option ID, while `type: "sentence-arrangement"` requires tokens and accepted orders. Checking the `type` lets TypeScript narrow the object, avoiding optional fields for unrelated exercise types. `Answer` uses the same pattern. `Lesson` groups metadata, source and review status, phrases, and exercise data.

To add another exercise type, define its type and answer shape, extend readiness/correctness validation, add its input renderer, and test the new behavior. Adding another lesson of the existing types only requires data and routing. Course and unit schemas are deliberately deferred until we have more than one lesson and can design them alongside the backend.

## React state

| State | Purpose |
| --- | --- |
| `mode` | Romanized or Gujarati display |
| `started` | Phrase preview versus exercises |
| `index` | Current exercise position |
| `answer` | Selection or ordered token IDs; null before answering |
| `feedback` | null before checking, true or false afterwards |
| `score` | Correct answers for this run |
| `complete` | Completion screen for the active session |
| `missedExerciseIds` | IDs answered incorrectly in the original lesson |
| `reviewing` | Whether the active session is a missed-question review |

Exercise and percentage progress are derived, not separately stored. A heading ref and effect move keyboard focus when the screen changes. Native radio controls, buttons, disabled states, a labeled progress bar, and live feedback support keyboard and screen-reader use.

## Tests and their boundaries

`npm test` verifies correct and incorrect choices, unknown options, incomplete sentences, duplicate and unknown tokens, sentence order, and mismatched answer types. Component tests additionally exercise a full lesson and review through the real controls: they check filtering of missed questions, both exercise types, script switching, correct and incorrect review answers, preservation of the original score, and restart cleanup. `npm run typecheck` checks component contracts, and `npm run build` checks production compilation. These checks do not verify visual appearance, screen-reader output, or language accuracy.

For manual checks: try both scripts; submit a wrong choice; verify feedback and input locking; remove/re-add words; complete all five questions; replay; use Tab, arrow keys for radios, and Enter/Space; check a narrow mobile viewport. Switching scripts should keep chosen answers intact. Refresh should reset the lesson.

## Review missed questions

The player now records missed IDs only during the original lesson. During review, `exercises` is derived with `filter` from the original content and missed IDs; otherwise it is the full lesson. Rendering, progress, and advancement all use this active list. Starting review clears the current answer and feedback and resets the index. Checking a review answer provides feedback without changing the original score or missed list. After every missed exercise has been attempted, the review completion screen appears. Restart clears the result and missed list and returns to the full lesson preview. Review is one pass, without a separate numeric score or an additional queue for questions missed again.

Other decisions you should own before Milestone 2: choose a consistent Romanization convention with a native reviewer, approve the revised content, and decide how anonymous versus signed-in progress should work. Milestone 2 requires explicit approval.

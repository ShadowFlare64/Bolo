# Bolo — Gujarati, one conversation at a time

Milestone 1 is a local frontend prototype built with Next.js App Router, React, TypeScript, and Tailwind CSS. It includes a responsive landing page, a phrase preview, five exercises (three multiple choice and two sentence arrangement), script switching, immediate feedback, a completion score, and review of missed questions.

After finishing a lesson, **Review Mistakes** appears if you missed any questions. Review reuses the same exercises and feedback, keeps your original score unchanged, and ends with a separate completion message. Both completion screens let you restart the full lesson. Incorrect review answers still allow progression after feedback; they do not extend the review queue.

## Run locally

Requires Node.js 20.9 or later and npm. In PowerShell:

```powershell
cd C:\Users\purab\OneDrive\PersonalProjects\Bolo\Bolo
npm install
npm run dev
```

Open http://localhost:3000. Select **Try your first lesson** or open http://localhost:3000/learn. Stop the server with Ctrl+C.

```powershell
npm test
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build after `npm run build`. No credentials, database, or environment variables are required.

## Folder map

```text
src/
  app/
    layout.tsx                HTML shell, metadata, global styles
    page.tsx                  Landing page (server component)
    globals.css               Tailwind import and visual system
    learn/page.tsx            Loads the sample lesson into the player
  components/
    lesson-player.tsx         Client state, feedback, progress, completion
    lesson-player.test.tsx    Lesson/review interaction regression tests
    exercise-input.tsx        Choice and word arrangement controls
  data/
    intro-lesson.ts           Editable content, reference, review status
  lib/
    types.ts                  Shared content and answer contracts
    validation.ts             Pure readiness and correctness functions
    validation.test.ts        Validation regression tests
docs/
  milestone-1.md              Architecture walkthrough and next task
```

## Deliberate limits

Progress is session-only React state. Refreshing or leaving the lesson resets it; there is no persistent progress store or cross-device sync. Correct and incorrect answers both allow progression after feedback, and the score counts each exercise once. No backend, authentication, adaptive review, audio, or AI tutor has been implemented. These belong to later approved milestones.

Gujarati content is **awaiting native-speaker verification**. The phrases are based on [Baraha's Gujarati examples](https://www.baraha.com/help/Keyboards/guj-examples.htm). Romanization is a readable convention, not a phonetic pronunciation system. Review the spelling, Romanization, translations, and usage with a native speaker before using this as a production curriculum. Review status is stored with the lesson and shown to learners.

See [the walkthrough](docs/milestone-1.md) for data flow and a meaningful next task.

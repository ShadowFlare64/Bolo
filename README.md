# Bolo — Gujarati, one conversation at a time

Milestone 2 connects the Next.js, React, TypeScript, and Tailwind frontend to FastAPI and PostgreSQL. It includes a responsive landing page, a phrase preview, five exercises (three multiple choice and two sentence arrangement), script switching, server-validated feedback and scoring, review of missed questions, and persistent anonymous learner progress.

After finishing a lesson, **Review Mistakes** appears if you missed any questions. Review reuses the same exercises and feedback, keeps your original score unchanged, and ends with a separate completion message. Both completion screens let you restart the full lesson. Incorrect review answers still allow progression after feedback; they do not extend the review queue.

## Run locally

First start PostgreSQL and FastAPI using the [backend setup guide](backend/README.md). This workspace has a project-local PostgreSQL runtime and Python environment prepared. The frontend requires Node.js 20.9 or later and npm. In a separate PowerShell terminal:

```powershell
cd C:\Users\purab\OneDrive\PersonalProjects\Bolo\Bolo
npm install
npm run dev
```

Open http://localhost:3000. Select **Start Learning** or open http://localhost:3000/learn. Stop the server with Ctrl+C.

```powershell
npm test
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build after `npm run build`. PostgreSQL and FastAPI must be running for lessons. `.env.example` documents the frontend API URL; `backend/.env.example` documents database credentials and CORS settings. Keep actual `.env` files out of Git.

## Folder map

```text
src/
  app/
    layout.tsx                HTML shell, metadata, global styles
    page.tsx                  Landing page (server component)
    globals.css               Tailwind import and visual system
    learn/page.tsx            Renders the API-backed lesson loader
  components/
    lesson-player.tsx         Client state, feedback, progress, completion
    lesson-player.test.tsx    Lesson/review interaction regression tests
    exercise-input.tsx        Choice and word arrangement controls
    lesson-loader.tsx         API loading, error/retry, restored progress
  data/
    intro-lesson.ts           Legacy sample fixture used by tests
  lib/
    types.ts                  Shared content and answer contracts
    validation.ts             Pure readiness and correctness functions
    validation.test.ts        Validation regression tests
    api.ts                    Typed REST client and anonymous identifier
backend/
  app/                       Models, schemas, routes, services, config
  migrations/                Alembic schema revisions
  content/                   Editable lesson seed data
  tests/                     PostgreSQL-backed API/relationship tests
docs/
  milestone-1.md              Architecture walkthrough and next task
```

## Deliberate limits

Completed progress is saved in PostgreSQL and restored using an anonymous identifier stored in this browser. In-progress questions and review screens are not automatically resumed after refresh. Clearing browser storage loses access to that anonymous profile; there is no sign-in or cross-device recovery yet. Correct and incorrect answers both allow progression after feedback. Review attempts preserve the original score and do not increase full-lesson completion counts. No authentication, adaptive review, audio, or AI tutor has been implemented.

Gujarati content is **awaiting native-speaker verification**. The phrases are based on [Baraha's Gujarati examples](https://www.baraha.com/help/Keyboards/guj-examples.htm). Romanization is a readable convention, not a phonetic pronunciation system. Review the spelling, Romanization, translations, and usage with a native speaker before using this as a production curriculum. Review status is stored with the lesson and shown to learners.

See [the backend guide](backend/README.md) for current setup, API contracts, database relationships, and verification commands. The [Milestone 1 walkthrough](docs/milestone-1.md) describes the original frontend architecture.

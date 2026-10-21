# Bolo — Gujarati, one conversation at a time

Milestone 2 connects the Next.js, React, TypeScript, and Tailwind frontend to FastAPI and PostgreSQL. It includes a responsive landing page, a phrase preview, five exercises (three multiple choice and two sentence arrangement), script switching, server-validated feedback and scoring, review of missed questions, and persistent anonymous learner progress.

After finishing a lesson, **Review Mistakes** appears if you missed any questions. Review reuses the same exercises and feedback, keeps your original score unchanged, and ends with a separate completion message. Both completion screens let you restart the full lesson. Incorrect review answers still allow progression after feedback; they do not extend the review queue.

## Run locally

This workspace has PostgreSQL and Python dependencies prepared. Use **one terminal** in the inner `Bolo` folder:

```powershell
cd C:\Users\purab\OneDrive\PersonalProjects\Bolo\Bolo
npm install
npm run dev
```

Open http://localhost:3000. Select **Start Learning** or open http://localhost:3000/learn. Stop the server with Ctrl+C.

`npm run dev` starts the local PostgreSQL server, applies migrations, seeds the lesson without overwriting progress, then starts FastAPI and Next.js. Wait for **Bolo is ready** before opening the page. Ctrl+C stops both app servers; PostgreSQL data is retained. Do not start separate FastAPI/Next.js terminals at the same time. If a port is already occupied, stop the earlier server first.

The launcher owns terminal input. Servers use separate control pipes so PowerShell/Next terminal handling cannot consume each other's stdin. Ctrl+C requests shutdown and waits for both processes; force termination is a logged timeout fallback. Unexpected exits report the server name, PID, exit code, and signal and stop the other server without restarting. Run `npm run test:dev` for process-lifecycle regression tests. If an unexplained exit recurs, retain the `Stopping Bolo:` line and the preceding server output; these distinguish a terminal signal from a child failure.

For a fresh checkout or Docker setup, follow the [backend setup guide](backend/README.md). `npm run dev:frontend` starts only Next.js when you deliberately manage the backend separately. Use Node.js 22.12+ or 24 LTS for the installed development tools.

```powershell
npm test
npm run typecheck
npm run build
npm start
npm run test:browser
```

`npm run build` requires stopping the development server first and safely recreates the generated `.next` cache, including on OneDrive. `npm start` serves that production build; PostgreSQL and FastAPI must be running for lessons. The Chrome browser test requires `npm run dev` running in another terminal and Chrome installed. It checks real answers, review, persistence, and mobile/desktop overflow; screenshots go in `.tools/screenshots/`. `.env.example` and `backend/.env.example` document settings. Keep actual `.env` files out of Git.

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

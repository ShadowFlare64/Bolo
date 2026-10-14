# Bolo backend — Milestone 2

FastAPI handles HTTP requests; Pydantic validates their shape; SQLAlchemy reads and writes PostgreSQL; Alembic versions the schema. The Next.js application uses this REST API directly in the browser. No authentication, AI, or adaptive learning has been added.

## Setup (PowerShell)

Start in the repository root, `C:\Users\purab\OneDrive\PersonalProjects\Bolo\Bolo`.

### PostgreSQL: choose one option

**Docker**, when Docker Desktop is installed and running:

```powershell
docker compose up -d db
Copy-Item backend/.env.example backend/.env
```

This binds PostgreSQL to `127.0.0.1:5432` and persists data in the `bolo_postgres` volume. The sample password is for local development. Change `POSTGRES_PASSWORD` and the database URLs together for another environment. Do not run `docker compose down -v` if you want to retain progress.

**Project-local Windows PostgreSQL**, already prepared in this workspace:

```powershell
.\backend\scripts\local-postgres.ps1
```

This uses `.tools/pgsql`, creates `.tools/pgdata` once, binds only to `127.0.0.1:55432`, and creates `bolo` and `bolo_milestone2_test`. The local `backend/.env` is already configured for these databases. To stop it:

```powershell
.\backend\scripts\local-postgres.ps1 -Stop
```

For a fresh checkout without Docker, download the [official PostgreSQL Windows binaries](https://www.enterprisedb.com/download-postgresql-binaries), extract `pgsql/bin`, `pgsql/lib`, and `pgsql/share` into `.tools/pgsql`, then run the script. Set the following values in `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://bolo:bolo_local@127.0.0.1:55432/bolo
TEST_DATABASE_URL=postgresql+psycopg://bolo:bolo_local@127.0.0.1:55432/bolo_milestone2_test
```

The runtime, database files, virtual environment, and actual `.env` files are ignored by Git. No system service is installed by the portable script.

### Python backend

Python 3.11+ is required; this workspace was verified with Python 3.13. Run from the repository root:

```powershell
py -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-lock.txt
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The venv is already installed here. You do not need to recreate it on every run. Run commands from `backend` so `.env` and `alembic.ini` resolve correctly. Open http://127.0.0.1:8000/docs for interactive API documentation. `/health` checks that the API process is running; it is not a database health check.

### Next.js (a separate terminal)

From the repository root:

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 and select **Start Learning**. The API URL defaults to `http://127.0.0.1:8000/api`; `NEXT_PUBLIC_API_URL` can override it. Restart Next.js after changing its environment file. CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`; edit `CORS_ORIGINS` in backend settings if you use another origin.

## Module map

- `app/models.py`: tables and relationships.
- `app/schemas.py`: public content, request, and response contracts.
- `app/services.py`: server validation, attempt ownership, completion and progress.
- `app/routes.py`: REST endpoints and request dependencies.
- `app/database.py`, `app/config.py`, `app/main.py`: sessions, settings, CORS, app startup.
- `migrations/`: immutable schema revisions; startup does not create tables automatically.
- `content/intro-lesson.json`, `app/seed.py`: original lesson and repeatable seed.
- `tests/`: PostgreSQL-backed tests; no SQLite substitute.

The seed inserts the lesson only if absent. Running it twice does not duplicate or overwrite content. It preserves existing attempts. For later curriculum changes, use an explicit migration or content revision rather than overwriting answer rules used by earlier learners. Gujarati remains awaiting native-speaker review.

## Database relationships

```text
Lesson ──< Exercise ──< ExerciseItem (choices or word tokens)
Learner ──< LessonAttempt ──< ExerciseAttempt
Learner + Lesson ── LessonProgress
LessonAttempt ──< review LessonAttempt (original_attempt_id)
```

Positions order lessons, exercises, and items. Choice/token IDs are unique within an exercise. JSON is used only for small structured lists: phrases, sources, concepts, accepted word orders, and submitted answers. Core relationships use foreign keys. A unique `(attempt_id, exercise_id)` prevents double submissions; progress has one row per learner/lesson. Checks constrain positions, scores, and completion state.

Each request gets a database session. Answer submission locks its lesson attempt while checking and saving. Completion computes its score from stored answer results, saves progress in the same transaction, and is idempotent: replaying the completion request returns the existing result without increasing the completion count. Review is a separate attempt tied to an original completed attempt; the server permits only the originally missed questions and does not update original progress from review results.

## API

All paths below have `/api` prefix. Learner-specific requests require the `X-Learner-ID` UUID header.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/lessons` | Ordered lesson summaries |
| GET | `/lessons/{id}` | Lesson and ordered public exercises |
| POST | `/learners` | Create a server-generated anonymous identifier |
| GET | `/learners/me` | Retrieve the identified learner |
| GET | `/learners/me/progress` | Completed lessons, best score, completion count |
| POST | `/attempts` | Start a lesson or review (`lessonId`, optional `originalAttemptId`) |
| POST | `/attempts/{id}/exercises/{exerciseId}/answers` | Validate and record `{ "answer": ... }` |
| POST | `/attempts/{id}/complete` | Complete a fully answered attempt |

Lesson content does **not** contain correct option IDs, accepted word orders, or explanations. Submission returns correctness, explanation, and the correct option ID for that question when applicable. Malformed answers receive 422; changed repeat submissions and premature completion receive 409; inaccessible attempts receive 404. Extra correctness/score fields in answer requests are rejected rather than trusted.

## Frontend data flow

`LessonLoader` retrieves the catalog, restores or creates the anonymous learner, fetches the lesson, and loads saved progress. `LessonPlayer` creates attempts, submits answers, displays server feedback, and completes attempts. `ExerciseInput` still owns only presentation and interactions. The legacy sample lesson and client correctness validator are test fixtures/utilities, not the live lesson source or scoring authority.

The learner ID is stored under `bolo.learnerId` in localStorage. Completed progress is in PostgreSQL and reappears on refresh. The identifier is a bearer identifier, not a signed-in account: anyone possessing it can access that anonymous profile. Clearing browser storage loses access to that profile, and another browser gets a new profile. Do not add personal information to anonymous profiles. Interrupted attempts are recorded but not resumed automatically; only completed progress is restored. A lost submission response can be retried with the same answer, and the server returns the saved result. The UI keeps that answer locked until retry succeeds.

## Verification

For Docker, first create a separate test database:

```powershell
docker compose exec db createdb -U bolo bolo_test
```

The portable setup creates its test database automatically. Backend tests require a separate database whose name ends in `_test`. Each test uses a rollback transaction, and migrations are applied to that test database. The migration round-trip additionally refuses nonempty databases.

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe scripts/check_migrations.py
```

From the repository root:

```powershell
npm test
npm run typecheck
npm run build
```

Optional live-server smoke check (creates a demo learner in the selected development database), from `backend` with FastAPI running:

```powershell
.\.venv\Scripts\python.exe scripts/smoke.py
# Restart FastAPI and PostgreSQL without deleting database data, then:
.\.venv\Scripts\python.exe scripts/smoke.py --verify
```

No deployment or browser visual testing is included. Milestone 3 requires approval.

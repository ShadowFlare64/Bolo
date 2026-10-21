from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import router
from .database import engine
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from fastapi.responses import JSONResponse

app = FastAPI(title="Bolo API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Learner-ID"])
app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM lessons LIMIT 1"))
        return {"status": "ready"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"status": "unavailable", "detail": "Start PostgreSQL and run the database migrations."})

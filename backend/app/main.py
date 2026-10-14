from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import router

app = FastAPI(title="Bolo API", version="0.2.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Learner-ID"])
app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}

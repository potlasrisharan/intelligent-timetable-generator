from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.auth import router as auth_router
from .routers.dashboard import router as dashboard_router
from .routers.reports import router as reports_router
from .routers.resources import router as resources_router
from .routers.schedule import router as schedule_router
from .routers.export import router as export_router
from .routers.import_data import router as import_router
from .routers.explain import router as explain_router
from .routers.ai import router as ai_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hackathon-ready FastAPI backend for timetable scheduling, reports, and auth contracts.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)
app.include_router(resources_router, prefix=settings.api_prefix)
app.include_router(schedule_router, prefix=settings.api_prefix)
app.include_router(reports_router, prefix=settings.api_prefix)
app.include_router(export_router, prefix=settings.api_prefix)
app.include_router(import_router, prefix=settings.api_prefix)
app.include_router(explain_router, prefix=settings.api_prefix)
app.include_router(ai_router, prefix=settings.api_prefix)

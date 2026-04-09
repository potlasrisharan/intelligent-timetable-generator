from __future__ import annotations

import time
from collections import defaultdict

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

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

# ── Security headers middleware (LOW-2) ──
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


# ── Rate limiting middleware (MED-2) ──
class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory per-IP rate limiter. Limits expensive endpoints."""

    RATE_LIMITS: dict[str, tuple[int, int]] = {
        # path_prefix: (max_requests, window_seconds)
        "/api/v1/schedule/generate": (10, 60),
        "/api/v1/ai/chat": (30, 60),
        "/api/v1/import/csv": (15, 60),
        "/api/v1/auth/sign-in": (10, 60),
        "/api/v1/export/": (15, 60),
    }

    # These paths are EXEMPT from rate limiting (high-frequency polling)
    EXEMPT_PATHS = {
        "/api/v1/schedule/generate/status/",
    }

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Skip rate limiting for exempt paths (status polling)
        if any(path.startswith(ep) for ep in self.EXEMPT_PATHS):
            return await call_next(request)

        for prefix, (max_req, window) in self.RATE_LIMITS.items():
            if path.startswith(prefix):
                key = f"{client_ip}:{prefix}"
                now = time.time()
                self._hits[key] = [t for t in self._hits[key] if now - t < window]
                if len(self._hits[key]) >= max_req:
                    return Response(
                        content='{"detail":"Rate limit exceeded. Try again later."}',
                        status_code=429,
                        media_type="application/json",
                    )
                self._hits[key].append(now)
                break

        return await call_next(request)


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
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

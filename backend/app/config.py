from __future__ import annotations

import os
from dataclasses import dataclass


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "TimeTable X API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000")))
    cors_origins: tuple[str, ...] = tuple(
        _split_csv(
            os.getenv(
                "BACKEND_CORS_ORIGINS",
                "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,https://intelligent-timetable-generator.vercel.app",
            )
        )
    )


settings = Settings()

import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "timetable_worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="generate_timetable")
def generate_timetable_task(department_id: str, version_id: str) -> dict:
    """
    Background task to generate a timetable using Google OR-Tools.
    """
    from .solver.engine import generate_timetable
    return generate_timetable(department_id, version_id)

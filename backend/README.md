# Intelligent Timetable API

FastAPI backend for the hackathon frontend.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## Main routes

- `GET /health`
- `POST /api/v1/auth/sign-in`
- `POST /api/v1/auth/forgot-password`
- `GET /api/v1/dashboard/metrics`
- `GET /api/v1/resources/*`
- `GET /api/v1/schedule/*`
- `GET /api/v1/reports/*`

The backend currently uses an in-memory seed store with the same shapes as the frontend contract, so it can later be swapped for Supabase/Postgres without changing the UI service layer.

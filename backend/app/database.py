import os
import sys
from supabase import create_client, Client

# Load .env files for local development
try:
    from dotenv import load_dotenv
    load_dotenv(".env.local")
    load_dotenv(".env")
except Exception:
    pass

url: str = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
)

# Prefer service_role key for backend (bypasses RLS).
# Fall back to anon key for backwards compatibility.
key: str = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

if not url or not key:
    print(
        "WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) "
        "must be set in environment. Database features will be unavailable.",
        file=sys.stderr,
    )

supabase: Client | None = None
if url and key:
    supabase = create_client(url, key)


import os
import sys
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

# For local development without env set natively
if not url or not key:
    try:
        from dotenv import load_dotenv
        load_dotenv(".env.local")
        load_dotenv(".env")
        url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
        key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    except Exception:
        pass

if not url or not key:
    print("WARNING: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment.", file=sys.stderr)

supabase: Client | None = None
if url and key:
    supabase = create_client(url, key)
else:
    supabase = None

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# Create client lazily
supabase = None

def get_supabase():
    global supabase
    if supabase is None:
        supabase = get_supabase_client()
    return supabase
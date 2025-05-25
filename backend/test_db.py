from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Debug: print the loaded values (remove this after testing)
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"SUPABASE_KEY: {os.getenv('SUPABASE_ANON_KEY')}")

from database import supabase

def test_connection():
    try:
        result = supabase.table('games').select("*").execute()
        print("Database connection successful!")
        print(f"Games table exists and has {len(result.data)} records")
        return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()
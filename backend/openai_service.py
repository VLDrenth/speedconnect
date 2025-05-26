import os
import hashlib
import json
from typing import Optional
from pathlib import Path

# Try to load .env from multiple locations
def load_env_file():
    """Load environment variables from .env file"""
    possible_paths = [
        Path(__file__).parent / ".env",  # backend/.env
        Path(__file__).parent.parent / ".env",  # project root/.env
        Path.cwd() / ".env",  # current directory/.env
    ]
    
    print(f"Looking for .env files...")
    for env_path in possible_paths:
        print(f"Checking: {env_path} - Exists: {env_path.exists()}")
        if env_path.exists():
            print(f"Loading .env from: {env_path}")
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path)
                print(f"Successfully loaded .env using dotenv")
                return True
            except ImportError:
                print(f"dotenv not available, reading manually")
                # dotenv not installed, try to read manually
                with open(env_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            # Remove quotes if present
                            value = value.strip('"').strip("'")
                            os.environ[key] = value
                            print(f"Set {key}={value[:10]}...")
                print(f"Successfully loaded .env manually")
                return True
    print("No .env file found")
    return False

# Load environment variables
load_env_file()

class OpenAIService:
    """OpenAI client service for word generation"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = None
        
        if not self.api_key:
            raise ValueError("Missing OPENAI_API_KEY in environment variables")
        
        # Initialize OpenAI client
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the OpenAI client"""
        try:
            from openai import OpenAI
            self.client = OpenAI(api_key=self.api_key)
            print(f"OpenAI client initialized successfully")
        except Exception as e:
            print(f"Failed to initialize OpenAI client: {e}")
            raise
    
    def _create_word_generation_prompt(self, seed: str) -> str:
        """Create prompt for word generation based on seed"""
        return f"""Generate a word puzzle for a Connections-style game. Create exactly 4 groups of 4 words each (16 words total).

Requirements:
- Each group should have a clear thematic connection
- Words should be single words (no phrases)
- Difficulty should vary: 1 easy, 2 medium, 1 hard group
- No proper nouns
- Categories can be completely unrelated to each other
- Include words with multiple meanings to create ambiguity
- Never use the same word in multiple groups
- Seed for variation: {seed}

Return ONLY valid JSON in this exact format:
{{
  "groups": [
    {{
      "category": "Group name",
      "words": ["word1", "word2", "word3", "word4"],
      "difficulty": "easy"
    }},
    {{
      "category": "Group name", 
      "words": ["word1", "word2", "word3", "word4"],
      "difficulty": "medium"
    }},
    {{
      "category": "Group name",
      "words": ["word1", "word2", "word3", "word4"], 
      "difficulty": "medium"
    }},
    {{
      "category": "Group name",
      "words": ["word1", "word2", "word3", "word4"],
      "difficulty": "hard"
    }}
  ]
}}

Example:
{{
  "groups": [
    {{
      "category": "Kitchen Utensils",
      "words": ["fork", "knife", "spoon", "ladle"],
      "difficulty": "easy"
    }},
    {{
      "category": "Things that are Green",
      "words": ["lime", "sage", "mint", "jade"],
      "difficulty": "medium"
    }},
    {{
      "category": "Programming Verbs",
      "words": ["branching", "forking", "committing", "merging"],
      "difficulty": "medium"
    }},
    {{
      "category": "Words that can follow 'Time'",
      "words": ["zone", "bomb", "stamp", "keeper"],
      "difficulty": "hard"
    }}
  ]
}}"""

    def _get_fallback_words(self, seed: str) -> dict:
        """Generate fallback words when OpenAI is unavailable"""
        import random
        
        # Use seed to make fallback deterministic
        random.seed(seed)
        
        # Predefined word pools for fallback
        word_pools = {
            "animals": ["cat", "dog", "bird", "fish", "bear", "lion", "tiger", "wolf", "fox", "deer"],
            "colors": ["red", "blue", "green", "yellow", "purple", "orange", "pink", "brown", "black", "white"],
            "foods": ["apple", "bread", "cheese", "pizza", "pasta", "rice", "soup", "salad", "cake", "pie"],
            "sports": ["soccer", "tennis", "golf", "swim", "run", "jump", "throw", "catch", "kick", "hit"],
            "weather": ["rain", "snow", "sun", "wind", "cloud", "storm", "fog", "ice", "heat", "cold"],
            "tools": ["hammer", "drill", "saw", "wrench", "nail", "screw", "bolt", "wire", "tape", "glue"],
            "music": ["piano", "guitar", "drum", "flute", "horn", "violin", "bass", "song", "beat", "note"],
            "body": ["hand", "foot", "head", "arm", "leg", "eye", "ear", "nose", "mouth", "back"]
        }
        
        # Pick 4 random categories
        categories = random.sample(list(word_pools.keys()), 4)
        difficulties = ["easy", "medium", "medium", "hard"]
        
        groups = []
        for i, category in enumerate(categories):
            # Pick 4 random words from each category
            words = random.sample(word_pools[category], 4)
            groups.append({
                "category": category.title(),
                "words": words,
                "difficulty": difficulties[i]
            })
        
        return {"groups": groups}

    async def generate_words(self, seed: str) -> dict:
        """Generate words using OpenAI with given seed"""
        try:
            prompt = self._create_word_generation_prompt(seed)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000,
                timeout=30  # Add timeout
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            result = json.loads(content)
            
            # Validate structure
            if "groups" not in result:
                raise ValueError("Invalid response structure - missing 'groups'")
            
            if len(result["groups"]) != 4:
                raise ValueError("Must have exactly 4 groups")
                
            for group in result["groups"]:
                if len(group["words"]) != 4:
                    raise ValueError("Each group must have exactly 4 words")
            
            return result
            
        except Exception as e:
            print(f"OpenAI generation failed: {e}")
            print(f"Falling back to predefined words for seed: {seed}")
            return self._get_fallback_words(seed)

    def _create_deterministic_seed(self, game_id: str, round_number: int) -> str:
        """Create deterministic seed from game_id and round_number"""
        seed_input = f"{game_id}-round-{round_number}"
        hash_object = hashlib.md5(seed_input.encode())
        return hash_object.hexdigest()[:16]

    async def generate_words_for_round(self, game_id: str, round_number: int) -> dict:
        """Generate words for a specific game round (deterministic with caching)"""
        from .database import get_supabase_client
        
        seed = self._create_deterministic_seed(game_id, round_number)
        
        try:
            # Check database first
            supabase = get_supabase_client()
            result = supabase.table("generated_words").select("*").eq("seed", seed).execute()
            
            if result.data:
                # Return cached result
                cached_data = result.data[0]
                return json.loads(cached_data["words_json"])
            
            # Generate new words via OpenAI
            words_data = await self.generate_words(seed)
            
            # Cache in database
            supabase.table("generated_words").insert({
                "seed": seed,
                "game_id": game_id,
                "round_number": round_number,
                "words_json": json.dumps(words_data)
            }).execute()
            
            return words_data
            
        except Exception as e:
            print(f"Database operation failed: {e}")
            print(f"Generating words without caching for seed: {seed}")
            # If database fails, still try to generate words
            return await self.generate_words(seed)

    def health_check(self) -> dict:
        """Basic health check for OpenAI service"""
        return {
            "service": "OpenAI",
            "api_key_configured": bool(self.api_key),
            "client_ready": bool(self.client)
        }

# Global instance - will be used by other modules
openai_service = None

def get_openai_service() -> OpenAIService:
    """Get OpenAI service instance"""
    global openai_service
    if openai_service is None:
        openai_service = OpenAIService()
    return openai_service
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
    
    def _create_word_generation_prompt(self, seed: str, previous_categories=None) -> str:
        """Create prompt for word generation based on seed"""
        # Create previous categories text if any
        prev_categories_text = ""
        if previous_categories and len(previous_categories) > 0:
            prev_categories_text = "Previously used categories (AVOID THESE AND SIMILAR ONES):\n"
            prev_categories_text += "- " + "\n- ".join(previous_categories) + "\n\n"
        
        return f"""Generate a word puzzle for a Connections-style game. Create exactly 4 groups of 4 words each (16 words total).

Requirements:
- Single words only (no phrases)
- Include 2-3 RED HERRING words that could fit multiple categories
- Make categories clever and non-obvious
- Difficulty levels: 1 easy, 1 medium, 1 challenging, 1 hard
{prev_categories_text}

IMPORTANT: Avoid basic categories like "colors", "animals", "fruits". Use creative connections!

Return ONLY valid JSON in this exact format:
{{
  "groups": [
    {{"category": "name", "words": ["w1","w2","w3","w4"], "difficulty": "easy"}},
    {{"category": "name", "words": ["w1","w2","w3","w4"], "difficulty": "medium"}},
    {{"category": "name", "words": ["w1","w2","w3","w4"], "difficulty": "challenging"}},
    {{"category": "name", "words": ["w1","w2","w3","w4"], "difficulty": "hard"}}
  ]
}}

Example of GOOD puzzle with misdirection:
{{
  "groups": [
    {{
      "category": "Poker Actions",
      "words": ["call", "fold", "raise", "check"],
      "difficulty": "easy"
    }},
    {{
      "category": "Things with Hands",
      "words": ["clock", "dealer", "crew", "deck"],
      "difficulty": "medium"
    }},
    {{
      "category": "Ends with Punctuation Marks",
      "words": ["interrobang", "yahoo", "period", "colon"],
      "difficulty": "challenging"
    }},
    {{
      "category": "Anagrams of Emotions",
      "words": ["raced", "vole", "grane", "paphy"],
      "difficulty": "hard"
    }}
  ]
}}

Note how "dealer" and "deck" could fit poker theme but don't. "Period" and "colon" seem medical but aren't.

Use these advanced patterns:
CORE TEMPLATE TYPES
1. Things That ___ - four items sharing an action, property, or trait
   e.g. things you can crack → CODE, EGG, JOKE, WHIP

2. ___ + Word - common prefix/suffix groupings  
   e.g. ___ MAIL → CHAIN, ELECTRONIC, JUNK, SNAIL

3. Category Members - four members of the same set  
   e.g. playing cards → ACE, JACK, KING, QUEEN

4. Synonyms - four near‑synonyms  
   e.g. steal → NICK, PINCH, POCKET, SWIPE

5. Parts of a Whole - components of one object  
   e.g. parts of a shoe → HEEL, SOLE, TONGUE, UPPER

6. Associated With X - items tightly linked to a topic  
   e.g. Count Dracula → BAT, CAPE, CASTLE, FANG

7. Wordplay  
   • Homophones (BALL/BAWL)  
   • Single‑letter or vowel shifts (GIN→DIN)  
   • Hidden endings/beginnings (WOOD, GLASS…)

8. Pop‑Culture Sets - film, TV, literature, etc.  
   e.g. Batman villains → BANE, JOKER, PENGUIN, SCARECROW

9. Professional/Technical - jargon within a field  
   e.g. TV display settings → BRIGHTNESS, COLOR, CONTRAST, TINT

10. Common Objects - everyday items from one context  
    e.g. baby gear → BIB, BOTTLE, MONITOR, STROLLER

11. Units & Measures - related quantities  
    e.g. British weights → DRAM, OUNCE, POUND, STONE

12. Abstract Concepts - related intangibles  
    e.g. reputation → FACE, IMAGE, REGARD, STANDING

13. Names - people sharing a tag  
    e.g. Bobs → DOLE, HOPE, MARLEY, ROSS

14. Locations - places or place-derived terms  
    e.g. Monopoly spaces → AVENUE, CHANCE, RAILROAD, UTILITY

15. Special  
    • “What X Can Mean” (e.g. DIAMOND → GEM, FIELD, SHAPE, SUIT)  
    • Contractions/abbreviations (HELL, ILL, SHELL, WELL)  
    • Numeric stand-ins (BOND: 007, WEED: 420

MISDIRECTION TECHNIQUES
• Multiple Fits - words eligible for >1 group (BANK, ROCK, SPRING).  
• False Groups - 3 genuine + 1 impostor (three card games + UNO).  
• Overlapping Themes - e.g. music terms vs. instruments.

DIFFICULTY LEVELS
1 Easy - direct categories, no wordplay.  
2 Moderate - compound words, light trivia.  
3 Hard - niche knowledge or light wordplay.  
4 Very Hard - heavy wordplay, obscurity, multistep links.

CONSTRUCTION WORKFLOW
1. Start with the hardest set to anchor misdirection.  
2. Plant 2-3 red herring words that straddle categories.  
3. Mix template types for variety.  
4. Verify uniqueness - each quartet must be the only clean solution.  
5. Manage flow - leave one semi obvious set to lure solvers down wrong paths.
6. Never include very straightforward categories, always require some thinking
"""
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

    async def generate_words(self, seed: str, previous_categories=None) -> dict:
        """Generate words using OpenAI with given seed"""
        try:
            prompt = self._create_word_generation_prompt(seed, previous_categories)
            
            response = self.client.chat.completions.create(
                model="gpt-4.1",
                messages=[{"role": "user", "content": prompt}],
                temperature=1.2,  # Increased temperature for more variety
                max_tokens=1000,
                timeout=30
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
        from database import get_supabase_client
        
        seed = self._create_deterministic_seed(game_id, round_number)
        
        try:
            # Check database first
            supabase = get_supabase_client()
            result = supabase.table("generated_words").select("*").eq("seed", seed).execute()
            
            if result.data:
                # Return cached result
                cached_data = result.data[0]
                return json.loads(cached_data["words_json"])
            
            # Get previous rounds' categories to avoid repetition
            previous_categories = []
            if round_number > 1:
                for prev_round in range(1, round_number):
                    prev_seed = self._create_deterministic_seed(game_id, prev_round)
                    prev_result = supabase.table("generated_words").select("words_json").eq("seed", prev_seed).execute()
                    
                    if prev_result.data:
                        prev_words_data = json.loads(prev_result.data[0]["words_json"])
                        for group in prev_words_data.get("groups", []):
                            category = group.get("category", "").lower()
                            if category:
                                previous_categories.append(category)
            
            # Generate new words via OpenAI with history context
            words_data = await self.generate_words(seed, previous_categories)
            
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
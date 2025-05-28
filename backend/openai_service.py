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
- Each group should be connected in some way
- Words should be single words (no phrases)
- Difficulty should vary: 1 easy, 1 medium, 1 medium-hard, 1 hard
{prev_categories_text}Use highly varied and creative categories that have not been used before.

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
      "difficulty": "challenging"
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
      "category": "Playfully Poke Fun At",
      "words": ["kid", "needle", "rib", "tease"],
      "difficulty": "easy"
    }},
    {{
      "category": "Cut Into Pieces",
      "words": ["chop", "cube", "dice", "mince"],
      "difficulty": "medium"
    }},
    {{
      "category": "Classic Still Life Components",
      "words": ["fruit", "skull", "pitcher", "tablecloth"],
      "difficulty": "challenging"
    }},
    {{
      "category": "Words that can follow 'Time'",
      "words": ["zone", "bomb", "stamp", "keeper"],
      "difficulty": "hard"
    }}
  ]
}}
Use the guide below for generating the words:
🔗 Connections Puzzle Templates (Condensed Guide)

1. "Things That ___"
Shared trait or action.
E.g.:
- Are White: SNOW, MILK, POLAR BEAR, BABY POWDER
- You Can Crack: EGG, CODE, JOKE, WHIP
- Roar: LION, ENGINE, CROWD, KATY PERRY

2. “___ + Word” or “Word + ___”
Common prefixes/suffixes.
E.g.:
- ___ MAIL: JUNK, CHAIN, SNAIL, ELECTRONIC
- FOOT ___: LOCKER, PRINT, BALL, HILLS
- SWEDISH ___: FISH, CHEF, MEATBALL, MASSAGE

3. Category Members
Concrete groupings.
E.g.:
- Cards: ACE, KING, QUEEN, JACK
- Pizza Types: PLAIN, HAWAIIAN, VEGGIE, SUPREME
- Gum Flavors: WINTERGREEN, CINNAMON, BUBBLEGUM, MENTHOL

4. Synonyms/Similar Meanings
Roughly equivalent terms.
E.g.:
- Punch: SLUG, SOCK, POUND, POP
- Steal: SWIPE, PINCH, POCKET, NICK

5. Parts of a Whole
Components of something larger.
E.g.:
- Shoe: HEEL, TONGUE, UPPER, SOLE
- Tree: BRANCH, LEAF, ROOT, TRUNK

6. Associated With [Topic]
Strong thematic link.
E.g.:
- Dracula: BAT, FANG, CASTLE, CAPE
- Bulls: JORDAN, RODEO, TAURUS, WALL STREET

7. Wordplay
7a. Homophones
E.g.: HEAL (heel), TOW (toe), BAWL (ball)

7b. Letter Changes
E.g.: GUMMY → RUMMY, CARS → MARS, SIMBA → SAMBA

7c. Hidden Words / Endings / Prefixes
E.g.:
- Ends in weapons: GRIMACE (mace), RAINBOW (bow)
- Starts with silent letters: GNOME, KNEE, PSYCHE, MNEMONIC

8. Pop Culture / Media
E.g.:
- Titular Animals: BABE, DUMBO, TED, BOLT
- Pan Characters (Second Words): BELL, HOOK, PAN, DARLING

9. Professional/Technical
E.g.:
- Guitar Techniques: SLIDE, PICK, BEND, STRUM
- Display Settings: TINT, COLOR, BRIGHTNESS, CONTRAST
- Electrometers: VOLTAGE, CURRENT, RESISTANCE, CHARGE

10. Common Items
E.g.:
- Baby Gear: BOTTLE, BIB, STROLLER, MONITOR
- Barn Items: HORSE, PITCHFORK, BALE, TROUGH

11. Measurements / Units
E.g.:
- Beer: SIX-PACK, FORTY, CASE, GROWLER
- Hair Amounts: TUFT, LOCK, THATCH, SHOCK

12. Abstract Concepts
E.g.:
- Reputation: FACE, IMAGE, REGARD, STANDING
- Vigor: PEP, ZIP, ENERGY, BEANS

13. Names
E.g.:
- Bobs: ROSS, DOLE, HOPE, MARLEY
- Williams(es): VENUS, TENNESSEE, ROBIN, HANK

14. Location-Based
E.g.:
- Monopoly Spaces: AVENUE, RAILROAD, UTILITY, CHANCE
- Valley Types: DELL, GLEN, HOLLOW, DALE

15. Special / Meta
15a. “What _ Might Mean”
E.g.:
- “Diamond”: SUIT, INFIELD, GEMSTONE, RHOMBUS
- “A”: EXCELLENT, ONE, ATHLETIC, AREA

15b. Abbreviations
E.g.:
- “E” Words: MAIL, COMMERCE, SIGNATURE, SCOOTER

15c. Numbers as Symbols
E.g.:
- 420 → CANNABIS, 007 → BOND, 666 → DEVIL

🧠 Misdirection Techniques
- Multi-Valid: ROCK, BANK, SPRING
- False Sets: 3 real + 1 fake (e.g., 3 card games + 1 board game)
- Overlaps: Music terms vs. Instruments, etc.

🎯 Difficulty Guidelines
1. Easy: Obvious categories, no tricks
2. Medium: Less direct, light wordplay
3. Hard: Specific knowledge, tricky themes
4. Very Hard: Obscure/complex wordplay, meta themes

🧪 Puzzle Design Tips
- Start Hard, then fill easier sets
- Red Herrings: 2–3 per puzzle
- Balance Types: Mix categories and mechanisms
- Uniqueness Check: One correct grouping per set
- Puzzle Flow: Place obvious clues to mislead
- Avoid Repeats: No same categories in same game
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
                temperature=1,  # Increased temperature for more variety
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
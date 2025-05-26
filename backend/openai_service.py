import os
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

    async def generate_words(self, seed: str) -> dict:
        """Generate words using OpenAI with given seed"""
        try:
            prompt = self._create_word_generation_prompt(seed)
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            import json
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
            print(f"Error generating words: {e}")
            raise
    
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
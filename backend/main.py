import asyncio
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
from database import get_supabase
from openai_service import get_openai_service

app = FastAPI(title="SpeedConnect API", version="1.0.0")

ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "https://bespoke-cassata-33f4bc.netlify.app",  # Netlify production (remove trailing slash)
    "https://your-render-app.onrender.com",  # Your Render backend URL
    "https://*.netlify.app",  # Allow all Netlify subdomains
]
    
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GameCreate(BaseModel):
    words: List[str]
    categories: List[Dict[str, Any]]

class PlayerJoin(BaseModel):
    name: str

class WordSelection(BaseModel):
    words: List[str]

@app.get("/")
async def root():
    return {"message": "SpeedConnect API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

def background_word_pregeneration(game_id: str, start_round: int, num_rounds: int = 2):
    """Pre-generate words for future rounds in the background"""
    async def _generate_words():
        openai_service = get_openai_service()
        for round_num in range(start_round + 1, start_round + num_rounds + 1):
            try:
                await openai_service.generate_words_for_round(game_id, round_num)
                print(f"Pre-generated words for game {game_id}, round {round_num}")
            except Exception as e:
                print(f"Failed to pre-generate words for round {round_num}: {e}")
    
    loop = asyncio.new_event_loop()
    loop.run_until_complete(_generate_words())
    loop.close()

@app.post("/games")
async def create_game(request: dict):
    try:
        supabase = get_supabase()
        openai_service = get_openai_service()
        
        # Create a placeholder game first to get the real game_id
        placeholder_game = {
            "words": [],
            "categories": [],
            "current_round": 1,
            "status": "active"
        }
        
        result = supabase.table("games").insert(placeholder_game).execute()
        game_id = result.data[0]["id"]
        
        # Now generate words using the real game_id
        words_data = await openai_service.generate_words_for_round(
            game_id=game_id,
            round_number=1
        )
        
        # Extract all words and shuffle them
        all_words = []
        categories = []
        
        for group in words_data["groups"]:
            all_words.extend(group["words"])
            categories.append({
                "name": group["category"],
                "words": group["words"],
                "difficulty": group["difficulty"]
            })
        
        # Shuffle the words for display
        import random
        random.shuffle(all_words)
        
        # Update the game with actual data
        supabase.table("games").update({
            "words": all_words,
            "categories": categories
        }).eq("id", game_id).execute()
        
        # Start background pre-generation of words for next round
        threading.Thread(
            target=background_word_pregeneration,
            args=(game_id, 1),
            daemon=True
        ).start()
        
        return {
            "game_id": game_id,
            "words": all_words,
            "round": 1
        }
        
    except Exception as e:
        print(f"Error creating game: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/join")
async def join_game(game_id: str, player_data: PlayerJoin):
    try:
        supabase = get_supabase()
        
        # Check if game exists and is active
        game_result = supabase.table('games').select("*").eq('id', game_id).eq('status', 'active').execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found or not active")
        
        # Add player to game
        player_result = supabase.table('players').insert({
            "game_id": game_id,
            "name": player_data.name,
            "score": 0,
            "round_mistakes": 0
        }).execute()
        
        if player_result.data:
            player = player_result.data[0]
            return {
                "player_id": player["id"],
                "game_id": game_id,
                "name": player["name"],
                "score": player["score"],
                "round_mistakes": player["round_mistakes"],
                "status": "joined"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to join game")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/games/{game_id}")
async def get_game_state(game_id: str):
    try:
        supabase = get_supabase()
        
        # Get game data
        game_result = supabase.table('games').select("*").eq('id', game_id).execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found")
        
        game = game_result.data[0]
        
        # Check if timer has expired and game is still active
        if game['status'] == 'active' and game.get('timer_start') and game.get('timer_duration'):
            # Calculate if time has expired using PostgreSQL
            time_check = supabase.rpc('check_game_time_expired', {
                'game_id_param': game_id,
                'timer_start_param': game['timer_start'],
                'timer_duration_param': game['timer_duration']
            }).execute()
            
            if time_check.data and time_check.data[0].get('expired'):
                # Mark game as completed due to timeout
                supabase.table('games').update({
                    'status': 'completed',
                    'end_time': 'NOW()'
                }).eq('id', game_id).execute()
                game['status'] = 'completed'
        
        # Get all players in the game
        players_result = supabase.table('players').select("*").eq('game_id', game_id).execute()
        players = players_result.data
        
        return {
            "game_id": game["id"],
            "status": game["status"],
            "words": game["words"],
            "categories": game["categories"],
            "players": players,
            "start_time": game["start_time"],
            "end_time": game.get("end_time"),
            "current_round": game.get("current_round", 1),
            "timer_start": game.get("timer_start"),
            "timer_duration": game.get("timer_duration", 300)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/select")
async def select_words(game_id: str, selection: WordSelection):
    try:
        supabase = get_supabase()
        
        # Check if game exists and is active
        game_result = supabase.table('games').select("*").eq('id', game_id).eq('status', 'active').execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found or not active")
        
        game = game_result.data[0]
        categories = game['categories']
        
        # Check if selection is exactly 4 words
        if len(selection.words) != 4:
            return {
                "correct": False,
                "message": "Must select exactly 4 words",
                "category": None
            }
        
        # Check if words form a valid category
        for category in categories:
            if set(selection.words) == set(category['words']):
                return {
                    "correct": True,
                    "message": f"Correct! Category: {category['name']}",
                    "category": category['name']
                }
        
        # Check if it's close (3 out of 4 correct)
        for category in categories:
            if len(set(selection.words) & set(category['words'])) == 3:
                return {
                    "correct": False,
                    "message": "Close! 3 out of 4 words are correct",
                    "category": None
                }
        
        return {
            "correct": False,
            "message": "Incorrect selection",
            "category": None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/players/{player_id}/select")
async def player_select_words(game_id: str, player_id: str, selection: WordSelection):
    try:
        supabase = get_supabase()
        
        # Check if game exists and is active
        game_result = supabase.table('games').select("*").eq('id', game_id).eq('status', 'active').execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found or not active")
        
        game = game_result.data[0]
        
        # Check if timer has expired
        if game.get('timer_start') and game.get('timer_duration'):
            time_check = supabase.rpc('check_game_time_expired', {
                'game_id_param': game_id,
                'timer_start_param': game['timer_start'],
                'timer_duration_param': game['timer_duration']
            }).execute()
            
            if time_check.data and time_check.data[0].get('expired'):
                # Mark game as completed due to timeout
                supabase.table('games').update({
                    'status': 'completed',
                    'end_time': 'NOW()'
                }).eq('id', game_id).execute()
                
                return {
                    "correct": False,
                    "message": "Time's up! Game has ended.",
                    "category": None,
                    "points_earned": 0,
                    "new_score": 0,
                    "round_mistakes": 0,
                    "eliminated": False,
                    "game_ended": True,
                    "time_expired": True
                }
        
        # Check if player exists in this game
        player_result = supabase.table('players').select("*").eq('id', player_id).eq('game_id', game_id).execute()
        if not player_result.data:
            raise HTTPException(status_code=404, detail="Player not found in this game")
        
        player = player_result.data[0]
        categories = game['categories']
        
        # Check if selection is exactly 4 words
        if len(selection.words) != 4:
            return {
                "correct": False,
                "message": "Must select exactly 4 words",
                "category": None,
                "points_earned": 0,
                "new_score": player['score'],
                "round_mistakes": player.get('round_mistakes', 0),
                "eliminated": False,
                "game_ended": False,
                "time_expired": False
            }
        
        points_earned = 0
        correct = False
        message = "Incorrect selection"
        category_name = None
        round_mistakes = player.get('round_mistakes', 0)
        eliminated = False
        game_ended = False
        
        # Check if words form a valid category
        for category in categories:
            if set(selection.words) == set(category['words']):
                correct = True
                points_earned = 100  # Points only for correct matches
                message = f"Correct! Category: {category['name']}"
                category_name = category['name']
                break
        
        # If incorrect, increment round mistakes
        if not correct:
            round_mistakes += 1
            # Check if it's close (3 out of 4 correct) - no points, just feedback
            for category in categories:
                if len(set(selection.words) & set(category['words'])) == 3:
                    message = "Close! 3 out of 4 words are correct"
                    break
            
            # Check if player is eliminated (3 mistakes in current round)
            if round_mistakes >= 3:
                eliminated = True
                game_ended = True
                message += " - Game Over! You've been eliminated!"
                
                # End the entire game
                supabase.table('games').update({
                    'status': 'completed',
                    'end_time': 'NOW()'
                }).eq('id', game_id).execute()
        
        # Update player score and round mistakes
        new_score = player['score'] + points_earned
        supabase.table('players').update({
            'score': new_score,
            'round_mistakes': round_mistakes
        }).eq('id', player_id).execute()
        
        return {
            "correct": correct,
            "message": message,
            "category": category_name,
            "points_earned": points_earned,
            "new_score": new_score,
            "round_mistakes": round_mistakes,
            "eliminated": eliminated,
            "game_ended": game_ended,
            "time_expired": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/next-round")
async def start_next_round(game_id: str):
    try:
        supabase = get_supabase()
        openai_service = get_openai_service()
        
        # Check if game exists and is still active
        game_result = supabase.table('games').select("*").eq('id', game_id).eq('status', 'active').execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found or not active")
        
        game = game_result.data[0]
        
        # Check if timer has expired
        if game.get('timer_start') and game.get('timer_duration'):
            time_check = supabase.rpc('check_game_time_expired', {
                'game_id_param': game_id,
                'timer_start_param': game['timer_start'],
                'timer_duration_param': game['timer_duration']
            }).execute()
            
            if time_check.data and time_check.data[0].get('expired'):
                # Mark game as completed due to timeout
                supabase.table('games').update({
                    'status': 'completed',
                    'end_time': 'NOW()'
                }).eq('id', game_id).execute()
                
                raise HTTPException(status_code=400, detail="Time's up! Cannot start next round.")
        
        next_round = game.get('current_round', 1) + 1
        
        # Generate new words for the next round using OpenAI
        words_data = await openai_service.generate_words_for_round(
            game_id=game_id,
            round_number=next_round
        )
        
        # Extract all words and shuffle them
        all_words = []
        categories = []
        
        for group in words_data["groups"]:
            all_words.extend(group["words"])
            categories.append({
                "name": group["category"],
                "words": group["words"],
                "difficulty": group["difficulty"]
            })
        
        # Shuffle the words for display
        import random
        random.shuffle(all_words)
        
        # Update game with new round data (but keep timer_start unchanged)
        supabase.table('games').update({
            'words': all_words,
            'categories': categories,
            'current_round': next_round,
            'status': 'active'
        }).eq('id', game_id).execute()
        
        # Reset all players' round mistakes for the new round
        supabase.table('players').update({
            'round_mistakes': 0
        }).eq('game_id', game_id).execute()
        
        # Start background pre-generation for next round
        if next_round < game.get('max_rounds', 3):  # Only if there are more rounds left
            threading.Thread(
                target=background_word_pregeneration,
                args=(game_id, next_round),
                daemon=True
            ).start()
        
        return {
            "game_id": game_id,
            "status": "next_round_started",
            "current_round": next_round,
            "words": all_words
        }
        
    except Exception as e:
        print(f"Error starting next round: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/complete")
async def complete_game(game_id: str):
    try:
        supabase = get_supabase()
        
        # Update game status to 'completed'
        game_update_result = supabase.table('games').update({"status": "completed"}).eq('id', game_id).execute()

        # Fetch players
        players_response = supabase.table('players').select("id, name, score").eq('game_id', game_id).order('score', desc=True).execute()
        leaderboard = players_response.data if players_response.data else []
        
        # Don't try to update winner_id for now to avoid potential DB schema issues
        winner = leaderboard[0] if leaderboard else None
        
        return {
            "game_id": game_id,
            "status": "completed",
            "final_leaderboard": leaderboard,
            "winner": winner
        }
    except Exception as e:
        print(f"ERROR in /games/{game_id}/complete: {str(e)}")
        # Return a valid response even on error to prevent frontend blank screen
        return {
            "game_id": game_id,
            "status": "completed",
            "final_leaderboard": [],
            "winner": None,
            "error": str(e)
        }

@app.get("/games/{game_id}/leaderboard")
async def get_game_leaderboard(game_id: str):
    try:
        supabase = get_supabase()
        
        # Get all players in the game, ordered by score
        players_result = supabase.table('players').select("*").eq('game_id', game_id).order('score', desc=True).execute()
        players = players_result.data
        
        # Get game status
        game_result = supabase.table('games').select("status").eq('id', game_id).execute()
        game_status = game_result.data[0]['status'] if game_result.data else 'unknown'
        
        return {
            "players": players,
            "game_status": game_status
        }
        
    except Exception as e:
        # Log error but don't fail
        print(f"Leaderboard error: {str(e)}")
        return {
            "players": [],
            "game_status": "unknown"
        }
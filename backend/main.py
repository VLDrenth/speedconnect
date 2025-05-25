from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import uuid
from database import get_supabase

app = FastAPI(title="SpeedConnect API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
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

@app.post("/games")
async def create_game(game_data: GameCreate):
    try:
        supabase = get_supabase()
        # Insert new game into database
        result = supabase.table('games').insert({
            "words": game_data.words,
            "categories": game_data.categories,
            "status": "active",
            "current_round": 1
        }).execute()
        
        if result.data:
            game = result.data[0]
            return {
                "game_id": game["id"],
                "status": "created",
                "words": game["words"],
                "categories": game["categories"],
                "current_round": game["current_round"]
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create game")
            
    except Exception as e:
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
            "current_round": game.get("current_round", 1)
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
        
        # Check if player exists in this game
        player_result = supabase.table('players').select("*").eq('id', player_id).eq('game_id', game_id).execute()
        if not player_result.data:
            raise HTTPException(status_code=404, detail="Player not found in this game")
        
        player = player_result.data[0]
        game = game_result.data[0]
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
                "eliminated": False
            }
        
        points_earned = 0
        correct = False
        message = "Incorrect selection"
        category_name = None
        round_mistakes = player.get('round_mistakes', 0)
        eliminated = False
        
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
                message += " - You've been eliminated from this round!"
        
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
            "eliminated": eliminated
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/next-round")
async def start_next_round(game_id: str, game_data: GameCreate):
    try:
        supabase = get_supabase()
        
        # Check if game exists
        game_result = supabase.table('games').select("*").eq('id', game_id).execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found")
        
        game = game_result.data[0]
        next_round = game.get('current_round', 1) + 1
        
        # Update game with new round data
        supabase.table('games').update({
            'words': game_data.words,
            'categories': game_data.categories,
            'current_round': next_round,
            'status': 'active'
        }).eq('id', game_id).execute()
        
        # Reset all players' round mistakes for the new round
        supabase.table('players').update({
            'round_mistakes': 0
        }).eq('game_id', game_id).execute()
        
        return {
            "game_id": game_id,
            "status": "next_round_started",
            "current_round": next_round,
            "words": game_data.words,
            "categories": game_data.categories
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/games/{game_id}/complete")
async def complete_game(game_id: str):
    try:
        supabase = get_supabase()
        
        # Check if game exists and is active
        game_result = supabase.table('games').select("*").eq('id', game_id).eq('status', 'active').execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found or not active")
        
        # Mark game as completed
        supabase.table('games').update({
            'status': 'completed',
            'end_time': 'NOW()'
        }).eq('id', game_id).execute()
        
        # Get final leaderboard
        players_result = supabase.table('players').select("*").eq('game_id', game_id).order('score', desc=True).execute()
        players = players_result.data
        
        return {
            "game_id": game_id,
            "status": "completed",
            "final_leaderboard": players,
            "winner": players[0] if players else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/games/{game_id}/leaderboard")
async def get_leaderboard(game_id: str):
    try:
        supabase = get_supabase()
        
        # Check if game exists
        game_result = supabase.table('games').select("*").eq('id', game_id).execute()
        if not game_result.data:
            raise HTTPException(status_code=404, detail="Game not found")
        
        game = game_result.data[0]
        
        # Get players ordered by score (highest first)
        players_result = supabase.table('players').select("*").eq('game_id', game_id).order('score', desc=True).execute()
        players = players_result.data
        
        # Add ranking
        for i, player in enumerate(players):
            player['rank'] = i + 1
        
        return {
            "game_id": game_id,
            "game_status": game["status"],
            "current_round": game.get("current_round", 1),
            "leaderboard": players
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
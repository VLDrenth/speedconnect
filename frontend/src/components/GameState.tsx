import React, { useState, useEffect } from 'react';
import WordSelection from './WordSelection';
import ScoreBoard from './ScoreBoard';
import GameCompletion from './GameCompletion';

interface Player {
  id: string;
  name: string;
  score: number;
  joined_at: string;
  round_mistakes?: number;
}

interface GameStateProps {
  gameId: string;
  currentPlayer: any;
  onBackToMenu: () => void;
}

const GameState: React.FC<GameStateProps> = ({ gameId, currentPlayer, onBackToMenu }) => {
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<any>(null);
  const [gameResult, setGameResult] = useState<any>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [solvedCategoryNames, setSolvedCategoryNames] = useState<Set<string>>(new Set());
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const MAX_MISTAKES = 3;
  const TOTAL_GROUPS = 4;

  const fetchGameState = async () => {
    try {
      const response = await fetch(`http://localhost:8000/games/${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setGameData(data);
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setLoading(false);
    }
  };

  const startNextRound = async () => {
    // Sample game data for next round
    const gameData = {
      words: ["table", "chair", "desk", "sofa", "run", "walk", "jog", "sprint", "happy", "sad", "angry", "excited", "book", "pen", "paper", "eraser"],
      categories: [
        { name: "Furniture", words: ["table", "chair", "desk", "sofa"] },
        { name: "Movement", words: ["run", "walk", "jog", "sprint"] },
        { name: "Emotions", words: ["happy", "sad", "angry", "excited"] },
        { name: "Office", words: ["book", "pen", "paper", "eraser"] }
      ]
    };

    try {
      const response = await fetch(`http://localhost:8000/games/${gameId}/next-round`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      if (response.ok) {
        const result = await response.json();
        // Reset round-specific state
        setIsEliminated(false);
        setSolvedCategoryNames(new Set());
        setSolvedWords([]);
        setLastResult(null);
        fetchGameState();
      }
    } catch (error) {
      console.error('Error starting next round:', error);
    }
  };

  const handleSelectionResult = (result: any) => {
    setLastResult(result);
    
    if (result.eliminated) {
      setIsEliminated(true);
    }
    
    if (result.correct && result.category) {
      setSolvedCategoryNames(prevNames => {
        const newNames = new Set(prevNames);
        newNames.add(result.category);
        return newNames;
      });
      
      if (gameData && gameData.categories) {
        const category = gameData.categories.find((cat: any) => cat.name === result.category);
        if (category) {
          setSolvedWords(prev => [...prev, ...category.words]);
        }
      }
    }
    
    fetchGameState();
    setTimeout(() => setLastResult(null), 3000);
  };

  const handleGameCompleted = (result: any) => {
    setGameResult(result);
    fetchGameState();
  };

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  useEffect(() => {
    setIsEliminated(false);
    setSolvedCategoryNames(new Set());
    setSolvedWords([]);
  }, [gameId]);

  if (loading) {
    return <div className="text-center">Loading game...</div>;
  }

  if (!gameData) {
    return <div className="text-center text-red-600">Failed to load game</div>;
  }

  const playerEntry = gameData.players.find((p: any) => p.id === currentPlayer.player_id);
  const backendScore = playerEntry ? playerEntry.score : currentPlayer.score;
  const displayScore = lastResult?.new_score ?? backendScore;
  const roundMistakes = playerEntry?.round_mistakes || 0;
  const solvedGroupsCount = solvedCategoryNames.size;
  const currentRound = gameData.current_round || 1;

  // Check if round is complete (all groups solved or player eliminated)
  const isRoundComplete = solvedGroupsCount >= TOTAL_GROUPS || isEliminated;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2 bg-yellow-200 inline-block px-2">SpeedConnect Game</h2>
          <p className="text-lg font-semibold">Round {currentRound}</p>
          <p className={`text-gray-600 ${gameData.status === 'completed' || isEliminated ? 'font-bold' : ''}`}>
            Status: {isEliminated ? 'Eliminated from Round' : gameData.status === 'completed' ? 'Game Over' : 'Active'}
          </p>
          <p className="text-sm text-gray-500">Game ID: {gameId}</p>
        </div>

        {/* Game Results Modal */}
        {gameResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-center">Game Complete!</h3>
              
              {gameResult.winner && (
                <div className="text-center mb-4">
                  <p className="font-semibold">Winner: {gameResult.winner.name}</p>
                  <p>Score: {gameResult.winner.score}</p>
                </div>
              )}
              
              <h4 className="font-semibold mt-4 mb-2">Final Leaderboard</h4>
              <div className="space-y-2 mb-6">
                {gameResult.final_leaderboard.map((player: any, index: number) => (
                  <div key={player.id} className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>#{index + 1} {player.name}</span>
                    <span>{player.score} points</span>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setGameResult(null)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selection Result Feedback */}
        {lastResult && (
          <div className={`text-center mb-6 p-4 rounded-lg ${
            lastResult.correct ? 'bg-green-100 text-green-800' : 
            lastResult.eliminated ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-800'
          }`}>
            <p className="font-semibold">{lastResult.message}</p>
            {lastResult.points_earned > 0 && (
              <p>+{lastResult.points_earned} points! New score: {lastResult.new_score}</p>
            )}
          </div>
        )}

        {/* Layout with Game + Leaderboard */}
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          {/* Left Column - Game Play */}
          <div style={{ width: '66%', paddingRight: '16px' }}>
            {/* Current Player Info */}
            <div className="bg-blue-100 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-2">You</h3>
              <p>Name: {currentPlayer.name}</p>
              <p>Score: {displayScore}</p>
              <p>Round {currentRound} Mistakes: {roundMistakes} / {MAX_MISTAKES}</p>
              <p>Solved Groups: {solvedGroupsCount} / {TOTAL_GROUPS}</p>
            </div>

            {/* Round Complete View */}
            {isRoundComplete && gameData.status === 'active' ? (
              <div className="bg-white rounded-lg p-4 mb-6 shadow">
                <div className="text-center py-6">
                  <h3 className="text-xl font-bold mb-2">Round {currentRound} Complete!</h3>
                  {isEliminated ? (
                    <p className="mb-4 text-red-600">You were eliminated this round.</p>
                  ) : (
                    <p className="mb-4 text-green-600">You solved all groups!</p>
                  )}
                  <button
                    onClick={startNextRound}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
                  >
                    Start Round {currentRound + 1}
                  </button>
                </div>
                {gameData?.categories && (
                  <div className="space-y-2 mt-6">
                    <h3 className="text-lg font-semibold mb-4">Round {currentRound} Solutions</h3>
                    {gameData.categories.map((category: any, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded mb-2">
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-600">{category.words.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : gameData.status === 'active' && !isEliminated ? (
              // Active Game View
              <>
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                  <WordSelection
                    words={gameData.words}
                    gameId={gameId}
                    playerId={currentPlayer.player_id}
                    onSelectionResult={handleSelectionResult}
                    solvedWords={solvedWords}
                  />
                </div>
                <GameCompletion gameId={gameId} onGameCompleted={handleGameCompleted} />
              </>
            ) : gameData.status === 'completed' ? (
              // Game Over View
              <div className="bg-white rounded-lg p-4 mb-6 shadow">
                <div className="text-center py-6">
                  <h3 className="text-xl font-bold mb-2 text-red-600">Game Over</h3>
                  <p className="mb-4">This game has ended. Check out the solutions below!</p>
                </div>
                <div className="space-y-2 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Final Round Solutions</h3>
                  {gameData.categories.map((category: any, index: number) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded mb-2">
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-gray-600">{category.words.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : isEliminated ? (
              // Eliminated View
              <div className="bg-white rounded-lg p-4 mb-6 shadow">
                <div className="text-center py-6">
                  <h3 className="text-xl font-bold mb-2 text-red-600">Eliminated</h3>
                  <p className="mb-4">You made {MAX_MISTAKES} mistakes this round.</p>
                  <p className="mb-4">Wait for other players to finish or the next round to start.</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column - Scoreboard */}
          <div style={{ width: '34%' }}>
            <ScoreBoard gameId={gameId} currentPlayerId={currentPlayer.player_id} />
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onBackToMenu}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameState;

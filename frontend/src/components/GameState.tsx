import React, { useState, useEffect } from 'react';
import WordSelection from './WordSelection';
import ScoreBoard from './ScoreBoard';
import GameCompletion from './GameCompletion';

interface Player {
  id: string;
  name: string;
  score: number;
  joined_at: string;
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

  const handleSelectionResult = (result: any) => {
    setLastResult(result);
    // Refresh game state to see updated scores
    fetchGameState();
    // Clear result after 3 seconds
    setTimeout(() => setLastResult(null), 3000);
  };

  const handleGameCompleted = (result: any) => {
    setGameResult(result);
    fetchGameState(); // Update game state to reflect completed status
  };

  useEffect(() => {
    fetchGameState();
    // Refresh game state every 5 seconds
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading) {
    return <div className="text-center">Loading game...</div>;
  }

  if (!gameData) {
    return <div className="text-center text-red-600">Failed to load game</div>;
  }

  const playerEntry = gameData.players.find((p: Player) => p.id === currentPlayer.player_id);
  const backendScore = playerEntry ? playerEntry.score : currentPlayer.score;
  const displayScore = lastResult?.new_score ?? backendScore;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2 bg-yellow-200 inline-block px-2">SpeedConnect Game</h2>
          <p className={`text-gray-600 ${gameData.status === 'completed' ? 'font-bold' : ''}`}>
            Status: {gameData.status === 'completed' ? 'Game Over' : 'Active'}
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
            lastResult.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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

            </div>

            {/* Word Selection Game */}
            {gameData.status === 'active' ? (
              <>
                <div className="bg-white rounded-lg p-4 mb-6 shadow">
                  <WordSelection
                    words={gameData.words}
                    gameId={gameId}
                    playerId={currentPlayer.player_id}
                    onSelectionResult={handleSelectionResult}
                  />
                </div>
                
                {/* Add Game Completion button only if game is active */}
                <GameCompletion gameId={gameId} onGameCompleted={handleGameCompleted} />
              </>
            ) : (
              <div className="bg-white rounded-lg p-4 mb-6 shadow">
                <div className="text-center py-6">
                  <h3 className="text-xl font-bold mb-2 text-red-600">Game Over</h3>
                  <p className="mb-4">This game has ended. Check out the solutions below!</p>
                </div>

                {/* Categories/Solutions */}
                <div className="space-y-2 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Categories (Solutions)</h3>
                  {gameData.categories.map((category: any, index: number) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded mb-2">
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-gray-600">{category.words.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

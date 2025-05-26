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
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes in seconds
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [gameState, setGameState] = useState<'waiting' | 'active' | 'game_over' | 'time_up'>('waiting');
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [loadingFinalResults, setLoadingFinalResults] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const MAX_MISTAKES = 3;
  const TOTAL_GROUPS = 4;
  const GAME_DURATION = 300; // 5 minutes in seconds

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateTimeRemaining = (startTime: Date): number => {
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - startTime.getTime()) / 1000);
    const remaining = Math.max(0, GAME_DURATION - elapsedSeconds);
    return remaining;
  };

  const fetchGameState = async () => {
    try {
      const response = await fetch(`http://localhost:8000/games/${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setGameData(data);
        
        // Initialize game start time if not set and game is active
        if (data.status === 'active' && !gameStartTime) {
          const startTime = data.timer_start ? new Date(data.timer_start) : new Date();
          setGameStartTime(startTime);
          const remaining = calculateTimeRemaining(startTime);
          setTimeRemaining(remaining);
          
          if (remaining <= 0) {
            setIsTimeExpired(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Timer effect - updates every second when game is active
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | undefined;
    
    if (gameData?.status === 'active' && gameStartTime && !isTimeExpired) {
      timerInterval = setInterval(() => {
        const remaining = calculateTimeRemaining(gameStartTime);
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          setIsTimeExpired(true);
          clearInterval(timerInterval);
          
          // Automatically complete the game when time expires
          fetch(`http://localhost:8000/games/${gameId}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .then(response => response.json())
          .then(data => {
            setGameResult(data);
            setGameData((prevData: any) => ({ ...prevData, status: 'completed' }));
          })
          .catch(error => {
            console.error('Error completing game due to timeout:', error);
          });
        }
      }, 1000);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [gameData?.status, gameStartTime, isTimeExpired, gameId]);

  const startNextRound = async () => {
    // Check if time expired before starting next round
    if (timeRemaining <= 0 || isTimeExpired) {
      setIsTimeExpired(true);
      return;
    }

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
        // Reset round-specific state but keep timer running
        setIsEliminated(false);
        setSolvedCategoryNames(new Set());
        setSolvedWords([]);
        setLastResult(null);
        fetchGameState();
      } else {
        const error = await response.json();
        if (error.detail && error.detail.includes("Time's up")) {
          setIsTimeExpired(true);
        }
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
    
    // Check if time expired
    if (result.time_expired) {
      setIsTimeExpired(true);
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
    } else {
      // Handle mistakes and game over logic
      const playerEntry = gameData.players.find((p: any) => p.id === currentPlayer.player_id);
      const newMistakesCount = (playerEntry?.round_mistakes || 0) + 1;
      setGameData((prevData: { players: any[]; }) => ({
        ...prevData,
        players: prevData.players.map((player: any) => 
          player.id === currentPlayer.player_id ? { ...player, round_mistakes: newMistakesCount } : player
        ),
      }));
      
      if (newMistakesCount >= MAX_MISTAKES) {
        setIsEliminated(true); // Set eliminated instead of gameState
        // Don't fetch gameState here, let the render logic handle it
      }
    }
    
    fetchGameState();
    setTimeout(() => setLastResult(null), 3000);
  };

  const handleGameCompleted = (result: any) => {
    setGameResult(result);
    fetchGameState();
  };

  const handleContinueToResults = () => {
    setShowFinalResults(true); // Prepare to show the final results area
    setLoadingFinalResults(true); // Start loading indicator

    Promise.all([
      fetch(`http://localhost:8000/games/${gameId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(response => response.json()),
      
      fetch(`http://localhost:8000/games/${gameId}/leaderboard`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }).then(response => response.json())
    ])
    .then(([gameResultData, leaderboardData]) => {
      console.log('Game result data:', gameResultData);
      console.log('Leaderboard data:', leaderboardData);
      
      setGameResult(gameResultData);
      setLeaderboard(leaderboardData?.players || []); // Ensure leaderboardData itself is checked
      
      const currentPlayerData = leaderboardData?.players?.find((p: any) => p.id === currentPlayer.player_id);
      const actualScore = currentPlayerData?.score || 0;
      setPlayerScore(actualScore);
    })
    .catch(error => {
      console.error('Error fetching final results:', error);
      setGameResult({ game_id: gameId, status: 'completed', final_leaderboard: [], winner: null }); // More complete fallback
      setLeaderboard([]);
      setPlayerScore(0);
    })
    .finally(() => {
      setLoadingFinalResults(false); // Stop loading indicator
    });
  };

  const navigateToHome = () => {
    window.location.href = '/';
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
    setIsTimeExpired(false);
    setGameStartTime(null);
    setTimeRemaining(GAME_DURATION);
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
  const isGameOver = gameData.status === 'completed' || isEliminated || isTimeExpired;

  const extractAllGroups = (gameData: any) => {
    if (!gameData || !gameData.categories) return [];
    
    return gameData.categories.map((category: any) => ({
      words: category.words,
      category: category.name
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Only show game interface if NOT showing final results */}
        {!showFinalResults ? (
          <>
            {/* Game Header */}
            <div className="bg-white rounded-lg p-6 shadow mb-4">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-blue-600">SpeedConnect Game</h1>
                <div className="text-right">
                  <p className="text-lg font-semibold">Round {currentRound}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="text-xl font-bold text-red-600">{formatTime(timeRemaining)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-semibold capitalize">
                      {isEliminated ? 'Game Over' : isTimeExpired ? 'Time Up' : gameData.status}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-gray-600">Game ID</p>
                  <p className="text-xs text-gray-500">{gameId}</p>
                </div>
              </div>
            </div>

            {/* Game Content */}
            <div className="flex-1 flex flex-col">
              {isRoundComplete && gameData.status === 'active' && !isEliminated && !isTimeExpired && timeRemaining > 0 ? (
                <div className="bg-white rounded-lg p-6 shadow text-center flex-1 flex flex-col justify-center">
                  <h3 className="text-xl font-bold mb-4">Round {currentRound} Complete!</h3>
                  <p className="mb-4 text-green-600">You solved all groups!</p>
                  <button
                    onClick={startNextRound}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Start Round {currentRound + 1}
                  </button>
                </div>
              ) : gameData.status === 'active' && !isEliminated && !isTimeExpired && timeRemaining > 0 ? (
                // Active Game - 4x4 Word Grid taking full available space
                <div className="bg-white rounded-lg p-6 shadow flex-1">
                  <WordSelection
                    words={gameData.words}
                    gameId={gameId}
                    playerId={currentPlayer.player_id}
                    onSelectionResult={handleSelectionResult}
                    solvedWords={solvedWords}
                    gameOver={false}
                    allGroups={[]}
                  />
                </div>
              ) : (isEliminated || isTimeExpired || gameData.status === 'completed') ? (
                // Game Over View - Show the visual category grid with continue button
                <div className="bg-white rounded-lg p-6 shadow flex-1 flex flex-col">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold mb-2 text-red-600">
                      {isTimeExpired ? "Time's Up!" : isEliminated ? "Game Over - 3 Mistakes" : "Game Complete"}
                    </h3>
                    <p className="mb-4">
                      {isTimeExpired 
                        ? "The 5-minute timer has expired." 
                        : isEliminated 
                        ? "You made 3 mistakes and were eliminated." 
                        : "The game has ended."
                      }
                    </p>
                  </div>
                  
                  {/* Show the visual category grid */}
                  <div className="flex-1">
                    <WordSelection
                      words={gameData.words}
                      gameId={gameId}
                      playerId={currentPlayer.player_id}
                      onSelectionResult={handleSelectionResult}
                      solvedWords={solvedWords}
                      gameOver={true}
                      allGroups={extractAllGroups(gameData)}
                    />
                  </div>
                  
                  {/* Continue button */}
                  <div className="text-center mt-6 pt-4 border-t">
                    <button
                      onClick={handleContinueToResults}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          /* Final Results Screen - ONLY this when showFinalResults is true */
          loadingFinalResults ? (
            <div className="bg-white rounded-lg p-8 shadow flex-1 flex flex-col justify-center items-center min-h-[600px]">
              <h3 className="text-2xl font-bold mb-4 text-blue-600">Loading Results...</h3>
              <p className="text-gray-600">Please wait a moment.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow flex-1 flex flex-col max-w-4xl mx-auto min-h-[600px]">
              
              {/* Single Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-blue-600 mb-2">Game Complete!</h2>
              </div>

              {/* Your Score - Compact */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">{currentPlayer?.name || 'You'}</span>
                  <span className="text-2xl font-bold text-blue-600">{playerScore} points</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {solvedCategoryNames.size} / {gameData?.categories?.length || 4} categories solved
                </p>
              </div>

              {/* Leaderboard - Clean */}
              <div className="flex-1">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-3">
                  <h3 className="text-lg font-bold text-center">LIVE LEADERBOARD</h3>
                </div>
                
                <div className="bg-gray-50 rounded-b-lg border-2 border-t-0 border-gray-200">
                  {leaderboard && leaderboard.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {leaderboard
                        .sort((a, b) => (b.score || 0) - (a.score || 0))
                        .map((player, index) => (
                          <div 
                            key={player.id || index}
                            className={`flex justify-between items-center p-3 ${
                              player.id === currentPlayer?.id 
                                ? 'bg-blue-100' 
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center">
                              <span className="text-sm font-bold text-gray-500 mr-3 w-6">
                                #{index + 1}
                              </span>
                              <span className="font-medium">
                                {player.name || 'Unknown Player'}
                                {player.id === currentPlayer?.id && (
                                  <span className="text-blue-600 text-sm ml-1">(You)</span>
                                )}
                              </span>
                            </div>
                            <span className="font-bold text-blue-600">
                              {player.score || 0} points
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">No leaderboard data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Single Navigation Button */}
              <div className="text-center mt-6">
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default GameState;

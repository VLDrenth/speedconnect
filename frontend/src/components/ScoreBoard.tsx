import React, { useState, useEffect } from 'react';
import config from '../config';

interface Player {
  id: string;
  name: string;
  score: number;
  joined_at: string;
}

interface ScoreBoardProps {
  gameId: string;
  currentPlayerId: string;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ gameId, currentPlayerId }) => {
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState('active');

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/games/${gameId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setGameStatus(data.game_status);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Update leaderboard every 3 seconds
    const interval = setInterval(fetchLeaderboard, 3000);
    return () => clearInterval(interval);
  }, [gameId]);

  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Live Leaderboard</h3>
        <span className={`px-2 py-1 rounded text-sm ${
          gameStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {gameStatus === 'active' ? 'Game Active' : 'Game Ended'}
        </span>
      </div>
      
      <div className="space-y-2">
        {leaderboard.map((player, index) => (
          <div
            key={player.id}
            className={`flex justify-between items-center p-3 rounded transition-all ${
              player.id === currentPlayerId 
                ? 'bg-blue-100 border-2 border-blue-300' 
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                index === 2 ? 'bg-amber-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </span>
              <span className={player.id === currentPlayerId ? 'font-bold' : ''}>
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
            </div>
            <span className="font-semibold text-lg">{player.score}</span>
          </div>
        ))}
      </div>
      
      {leaderboard.length === 0 && (
        <p className="text-gray-500 text-center py-4">No players yet</p>
      )}
    </div>
  );
};

export default ScoreBoard;
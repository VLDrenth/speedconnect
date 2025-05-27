import React, { useState } from 'react';
import config from '../config';

interface PlayerJoinProps {
  gameId: string;
  onPlayerJoined: (playerData: any) => void;
}

const PlayerJoin: React.FC<PlayerJoinProps> = ({ gameId, onPlayerJoined }) => {
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    setIsJoining(true);

    try {
      const response = await fetch(`${config.API_BASE_URL}/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: playerName.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        onPlayerJoined(result);
        setPlayerName('');
      } else {
        console.error('Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Join Game</h2>
      <p className="text-gray-600 mb-4">Game ID: {gameId}</p>
      
      <form onSubmit={joinGame} className="space-y-4">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="border border-gray-300 rounded px-3 py-2 w-64"
          disabled={isJoining}
        />
        <br />
        <button
          type="submit"
          disabled={isJoining || !playerName.trim()}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isJoining ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
};

export default PlayerJoin;
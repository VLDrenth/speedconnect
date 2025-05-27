import React, { useState } from 'react';
import config from '../config';

interface GameCreationProps {
  onGameCreated: (gameId: string) => void;
}

const GameCreation: React.FC<GameCreationProps> = ({ onGameCreated }) => {
  const [isCreating, setIsCreating] = useState(false);

  const createGame = async () => {
    setIsCreating(true);
    
    // Sample game data for testing
    const gameData = {
      words: ["apple", "banana", "orange", "grape", "car", "truck", "bus", "bike", "cat", "dog", "bird", "fish", "red", "blue", "green", "yellow"],
      categories: [
        { name: "Fruits", words: ["apple", "banana", "orange", "grape"] },
        { name: "Vehicles", words: ["car", "truck", "bus", "bike"] },
        { name: "Animals", words: ["cat", "dog", "bird", "fish"] },
        { name: "Colors", words: ["red", "blue", "green", "yellow"] }
      ]
    };

    try {
      const response = await fetch(`${config.API_BASE_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      if (response.ok) {
        const result = await response.json();
        onGameCreated(result.game_id);
      } else {
        console.error('Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
      <button
        onClick={createGame}
        disabled={isCreating}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isCreating ? 'Creating...' : 'Create Game'}
      </button>
    </div>
  );
};

export default GameCreation;
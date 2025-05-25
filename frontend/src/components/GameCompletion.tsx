import React, { useState } from 'react';

interface GameCompletionProps {
  gameId: string;
  onGameCompleted: (result: any) => void;
}

const GameCompletion: React.FC<GameCompletionProps> = ({ gameId, onGameCompleted }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const completeGame = async () => {
    setIsCompleting(true);
    
    try {
      const response = await fetch(`http://localhost:8000/games/${gameId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        onGameCompleted(result);
      } else {
        console.error('Failed to complete game');
      }
    } catch (error) {
      console.error('Error completing game:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="text-center border-t border-gray-300 pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4">Game Controls</h3>
      <button
        onClick={completeGame}
        disabled={isCompleting}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isCompleting ? 'Ending Game...' : 'End Game & See Results'}
      </button>
      <p className="text-sm text-gray-600 mt-2">
        This will end the game for all players and show the final results.
      </p>
    </div>
  );
};

export default GameCompletion;
import React, { useState } from 'react';
import GameCreation from './components/GameCreation';
import PlayerJoin from './components/PlayerJoin';
import GameState from './components/GameState';

function App() {
  const [gameId, setGameId] = useState(null);
  const [playerData, setPlayerData] = useState(null);

  const handleGameCreated = (newGameId) => {
    setGameId(newGameId);
  };

  const handlePlayerJoined = (newPlayerData) => {
    setPlayerData(newPlayerData);
  };

  const resetGame = () => {
    setGameId(null);
    setPlayerData(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!gameId ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              SpeedConnect
            </h1>
            <GameCreation onGameCreated={handleGameCreated} />
          </div>
        </div>
      ) : !playerData ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              SpeedConnect
            </h1>
            <PlayerJoin gameId={gameId} onPlayerJoined={handlePlayerJoined} />
          </div>
        </div>
      ) : (
        <GameState 
          gameId={gameId} 
          currentPlayer={playerData} 
          onBackToMenu={resetGame} 
        />
      )}
    </div>
  );
}

export default App;
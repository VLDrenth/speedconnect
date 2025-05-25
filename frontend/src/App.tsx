import React, { useState } from 'react';
import './App.css';
import GameCreation from './components/GameCreation';
import PlayerJoin from './components/PlayerJoin';
import GameState from './components/GameState';

function App() {
  const [currentView, setCurrentView] = useState<'menu' | 'create' | 'join' | 'game'>('menu');
  const [gameId, setGameId] = useState<string>('');
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);

  const handleGameCreated = (newGameId: string) => {
    setGameId(newGameId);
    setCurrentView('join');
  };

  const handlePlayerJoined = (playerData: any) => {
    setCurrentPlayer(playerData);
    setCurrentView('game');
  };

  const backToMenu = () => {
    setCurrentView('menu');
    setGameId('');
    setCurrentPlayer(null);
  };

  if (currentView === 'game' && gameId && currentPlayer) {
    return (
      <GameState 
        gameId={gameId} 
        currentPlayer={currentPlayer} 
        onBackToMenu={backToMenu} 
      />
    );
  }

  if (currentView === 'join' && gameId) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <PlayerJoin gameId={gameId} onPlayerJoined={handlePlayerJoined} />
          <button 
            onClick={backToMenu}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'create') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <GameCreation onGameCreated={handleGameCreated} />
          <button 
            onClick={backToMenu}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      padding: '1rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="text-5xl font-bold text-white tracking-tight mb-2">
          SpeedConnect
        </h1>
        <p className="text-slate-400 text-lg mb-6">
          Connections Game - Frontend Setup Complete
        </p>
        <div className="space-y-4">
          <button 
            onClick={() => setCurrentView('create')}
            className="block mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Create Game
          </button>
          <button 
            onClick={() => setCurrentView('join')}
            className="block mx-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
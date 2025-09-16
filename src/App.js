import React, { useState, useCallback } from 'react';
import './App.css';
import { GameProvider, useGame } from './context/GameContext';
import GameFeed from './components/GameFeed';
import GamePlayer from './components/GamePlayer';
import CoinBar from './components/CoinBar';

function AppShell() {
  const [activeGame, setActiveGame] = useState(null);
  const { playGame, addCoinsPurchase } = useGame();

  const enterGame = useCallback((id) => {
    console.log('Attempting to enter game:', id);
    const ok = playGame(id);
    console.log('playGame result:', ok);
    if (ok) {
      setActiveGame(id);
      console.log('Active game set to:', id);
    } else {
      console.log('Failed to start game:', id);
    }
  }, [playGame]);

  const exitGame = useCallback(() => setActiveGame(null), []);

  return (
    <div className="app-root">
      <CoinBar onPurchase={addCoinsPurchase} />
      {activeGame ? (
        <GamePlayer gameId={activeGame} onExit={exitGame} />
      ) : (
        <GameFeed onEnterGame={enterGame} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}

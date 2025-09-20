import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import GameFeed from '../components/GameFeed';

export default function HomePage() {
  const navigate = useNavigate();
  const { playGame } = useGame();

  const handleEnterGame = useCallback((id) => {
    console.log('Attempting to enter game:', id);
    const ok = playGame(id);
    console.log('playGame result:', ok);
    if (ok) {
      navigate(`/game/${id}`);
      console.log('Navigating to game:', id);
    } else {
      console.log('Failed to start game:', id);
    }
  }, [navigate, playGame]);

  return <GameFeed onEnterGame={handleEnterGame} />;
}
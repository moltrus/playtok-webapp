import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import GamePlayer from '../components/GamePlayer';

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div className="game-page">
      <GamePlayer 
        gameId={gameId} 
        onExit={handleExit}
      />
    </div>
  );
}
import React, { useCallback } from 'react';
import GameCard from './GameCard';
import { useGame } from '../context/GameContext';

export default function GameFeed({ onEnterGame }) {
  const { games } = useGame();

  const handlePlay = useCallback((id) => {
    onEnterGame(id);
  }, [onEnterGame]);

  return (
    <div className="feed-container">
      {games.map(g => (
        <section key={g.id} className="feed-slide">
          <GameCard game={g} onPlay={handlePlay} />
        </section>
      ))}
    </div>
  );
}

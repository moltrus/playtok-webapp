import { useGame } from '../context/GameContext';

export default function GameCard({ game, onPlay }) {
  const { gameStats, likeGame, likedGames, coins } = useGame();
  const stats = gameStats[game.id];
  const canAfford = coins >= game.costCoins;
  const isLiked = likedGames.has(game.id);
  
  const handlePlayClick = () => {
    if (canAfford) {
      onPlay(game.id);
    }
  };
  
  return (
    <div className="game-card">
      <div className="preview-container">
        <div 
          className={`preview-thumb ${canAfford ? 'clickable' : 'disabled'}`}
          onClick={handlePlayClick}
          aria-label={canAfford ? `Play ${game.name}` : `Need coins to play ${game.name}`}
          role="button"
          tabIndex={canAfford ? 0 : -1}
        > 
          <div className="play-indicator">
            {canAfford ? '▶ PLAY' : '🔒 LOCKED'}
          </div>
        </div>
        
        {/* Stats positioned absolutely on right edge like Instagram Reels */}
        <div className="stats-overlay">
          <button 
            onClick={() => likeGame(game.id)} 
            className={`like-btn ${isLiked ? 'liked' : ''}`}
          >
            {isLiked ? '♥' : '♡'}
            <span className="stat-count">{stats.likes}</span>
          </button>
          <div className="stat-item">
            <span className="stat-icon">▶️</span>
            <span className="stat-count">{stats.plays}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🧑</span>
            <span className="stat-count">{stats.players}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏆</span>
            <span className="stat-count">{stats.winners}</span>
          </div>
        </div>
        
        {/* Game info overlay at bottom like Instagram Reels */}
        <div className="game-info-overlay">
          <h2>{game.name}</h2>
          <div className="coin-line">
            Play: {game.costCoins}c → Win {game.rewardCoins}c
          </div>
        </div>
      </div>
    </div>
  );
}

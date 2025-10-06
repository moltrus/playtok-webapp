import { useGame } from '../context/GameContext';

export default function GameCard({ game, onPlay }) {
  const { gameStats, likeGame, coins } = useGame();
  const stats = gameStats[game.id];
  const canAfford = coins >= game.costCoins;
  return (
    <div className="game-card">
      <div className="preview-wrapper">
        <div className="preview-thumb" aria-label={`Preview of ${game.name}`}> 
          <div className="preview-inner">{game.name}</div>
        </div>
      </div>
      <div className="game-meta">
        <h2>{game.name}</h2>
        <div className="coin-line">
          <span className="entry">Play: {game.costCoins}c → Win {game.rewardCoins}c</span>
        </div>
        <div className="stats-row">
          <span>👍 {stats.likes}</span>
          <span>▶️ {stats.plays}</span>
          <span>🧑 {stats.players}</span>
          <span>🏆 {stats.winners}</span>
          <span>💸 {stats.coinsSpent}</span>
        </div>
        <div className="actions">
          <button onClick={() => likeGame(game.id)} className="like-btn">Like</button>
          <button disabled={!canAfford} onClick={() => canAfford && onPlay(game.id)} className="play-btn">
            {canAfford ? 'Play Now' : 'Need Coins'}
          </button>
        </div>
      </div>
    </div>
  );
}

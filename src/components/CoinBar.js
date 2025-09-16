import React from 'react';
import { useGame } from '../context/GameContext';

export default function CoinBar({ onPurchase }) {
  const { coins } = useGame();
  return (
    <div className="coin-bar">
      <span>Coins: {coins}</span>
      <div className="iap-buttons">
        <button onClick={() => onPurchase('small')}>+100</button>
        <button onClick={() => onPurchase('medium')}>+250</button>
        <button onClick={() => onPurchase('large')}>+600</button>
      </div>
    </div>
  );
}

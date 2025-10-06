import { useGame } from '../context/GameContext';

export default function CoinBar() {
  const { coins, addCoinsPurchase } = useGame();
  
  return (
    <div className="coin-bar">
      <span>Coins: {coins}</span>
      {/* <div className="iap-buttons">
        <button onClick={() => addCoinsPurchase('small')}>+100</button>
        <button onClick={() => addCoinsPurchase('medium')}>+250</button>
        <button onClick={() => addCoinsPurchase('large')}>+600</button>
      </div> */}
    </div>
  );
}

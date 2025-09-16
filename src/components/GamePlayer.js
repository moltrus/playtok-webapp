import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlaytokGameCanvas } from './PlaytokGameCanvas';

export default function GamePlayer({ gameId, onExit }) {
  console.log('GamePlayer rendered with gameId:', gameId);
  const { games, finishGame } = useGame();
  const meta = games.find(g => g.id === gameId);
  console.log('Game metadata found:', meta);
  const [status, setStatus] = useState('loading');
  const [score, setScore] = useState(0);

  

  function handleScoreUpdate(newScore) {
    setScore(newScore);
  }

  function handleGameEnd(finalScore) {
    setScore(finalScore || score);
    setStatus('ended');
  }

  function handleExit(win) {
    finishGame(gameId, { won: !!win });
    onExit();
  }

  useEffect(() => {
    if (gameId) {
      setStatus('running');
    }
  }, [gameId]);

  if (!meta) return null;

  return (
    <div className="player-wrapper">
      <div className="player-header">
        <button onClick={() => handleExit(false)}>Back</button>
        <h2>{meta.name}</h2>
      </div>
      <div className="player-surface" style={{padding:0}}>
        <div style={{width:'100%', maxWidth:480, aspectRatio:'9/16', position:'relative'}}>
          <PlaytokGameCanvas 
            gameId={gameId}
            onScoreUpdate={handleScoreUpdate}
            onGameEnd={handleGameEnd}
          />
          
          {status === 'ended' && (
            <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16}}>
              <h3 style={{margin:0}}>Score: {score}</h3>
              <div className="result-buttons">
                <button onClick={() => handleExit(true)}>Claim Win</button>
                <button onClick={() => handleExit(false)}>Exit</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="ad-slot">Ad Placeholder</div>
    </div>
  );
}


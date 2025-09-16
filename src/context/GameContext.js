import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import fallbackGames from '../data/games';

/*
GameContext responsibilities:
- Hold coin balance (start with 100 for MVP)
- Track per-game stats: likes, plays, players (active), winners, coinsSpent
- Provide functions: playGame(id), likeGame(id), finishGame(id, { won: boolean })
- Fake auto-growth every N seconds: randomly increment likes/plays/winners
- Persist to localStorage (simple JSON) with version key
*/

const STORAGE_KEY = 'playtok_v1_state';
const AUTO_GROW_INTERVAL_MS = 8000; // 8s

const defaultGameStats = (base) => {
  const baseStats = base?.baseStats || {};
  const plays = typeof baseStats.plays === 'number' ? baseStats.plays : 50 + Math.floor(Math.random() * 120);
  const likes = typeof baseStats.likes === 'number' ? baseStats.likes : 20 + Math.floor(Math.random() * 50);
  return {
    likes,
    plays,
    players: 0,
    winners: Math.max(5, Math.floor(plays * 0.15)),
    coinsSpent: 0
  };
};

function buildInitialState(gamesSeed) {
  const list = gamesSeed || fallbackGames;
  const state = { coins: 100, games: {} };
  list.forEach(g => { state.games[g.id] = defaultGameStats(g.base); });
  return state;
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gamesList, setGamesList] = useState(fallbackGames); // dynamic once stats.json loads
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return buildInitialState(fallbackGames);
  });

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }, [state]);

  const adjustCoins = useCallback((delta) => {
    setState(s => ({ ...s, coins: Math.max(0, s.coins + delta) }));
  }, []);

  const likeGame = useCallback((id) => {
    setState(s => ({
      ...s,
      games: {
        ...s.games,
        [id]: { ...s.games[id], likes: s.games[id].likes + 1 }
      }
    }));
  }, []);

  const playGame = useCallback((id) => {
    const meta = gamesList.find(g => g.id === id);
    if (!meta) {
      console.log('Game not found in gamesList:', id);
      return false;
    }
    
    // Check if user has enough coins
    if (state.coins < meta.costCoins) {
      console.log('Insufficient coins:', state.coins, 'needed:', meta.costCoins);
      return false;
    }
    
    // Deduct coins and update stats
    setState(s => ({
      ...s,
      coins: s.coins - meta.costCoins,
      games: {
        ...s.games,
        [id]: {
          ...s.games[id],
          plays: s.games[id].plays + 1,
          players: s.games[id].players + 1,
          coinsSpent: s.games[id].coinsSpent + meta.costCoins
        }
      }
    }));
    
    console.log('Game started successfully:', id);
    return true;
  }, [gamesList, state.coins]);

  const finishGame = useCallback((id, { won }) => {
    const meta = gamesList.find(g => g.id === id);
    if (!meta) return;
    setState(s => ({
      ...s,
      coins: won ? s.coins + meta.rewardCoins : s.coins,
      games: {
        ...s.games,
        [id]: {
          ...s.games[id],
            players: Math.max(0, s.games[id].players - 1),
            winners: won ? s.games[id].winners + 1 : s.games[id].winners
        }
      }
    }));
  }, [gamesList]);

  const addCoinsPurchase = useCallback((bundle) => {
    // Simple stub for IAP bundles.
    const map = { small: 100, medium: 250, large: 600 };
    adjustCoins(map[bundle] || 0);
  }, [adjustCoins]);

  // Auto growth effect - less frequent and no player changes
  const growRef = useRef();
  useEffect(() => {
    // Don't update as frequently - every 20 seconds instead of 8
    growRef.current = setInterval(() => {
      setState(s => {
        const updated = { ...s.games };
        Object.keys(updated).forEach(id => {
          // Random small organic growth - no changes to active players
          if (Math.random() < 0.4) updated[id].plays += Math.floor(Math.random() * 2);
          if (Math.random() < 0.3) updated[id].likes += Math.random() < 0.6 ? 1 : 0;
          if (Math.random() < 0.2) updated[id].winners += Math.random() < 0.3 ? 1 : 0;
        });
        return { ...s, games: updated };
      });
    }, AUTO_GROW_INTERVAL_MS * 2.5);
    return () => clearInterval(growRef.current);
  }, []);

  // Load external stats.json once (client side)
  useEffect(() => {
    let cancelled = false;
    fetch('/data/stats.json')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => {
        if (cancelled) return;
        if (Array.isArray(json.games)) {
          const transformed = json.games.map(g => {
            const tp = g.baseStats?.timePlayed ?? 30;
            const cost = Math.min(10, 5 + Math.floor(tp / 25));
            const reward = cost * 2 + (g.baseStats?.likes ?? 0) % 3; // slight variation
            return {
              id: g.id,
              name: g.name,
              costCoins: cost,
              rewardCoins: reward,
              preview: `${g.id}.png`,
              base: g
            };
          });
          setGamesList(transformed);
          // Merge stats for any new games
          setState(s => {
            const merged = { ...s.games };
            transformed.forEach(g => {
              if (!merged[g.id]) merged[g.id] = defaultGameStats(g.base);
            });
            return { ...s, games: merged };
          });
        }
      })
      .catch(() => { /* silent fallback */ });
    return () => { cancelled = true; };
  }, []);

  const value = {
    coins: state.coins,
    gameStats: state.games,
    games: gamesList,
    likeGame,
    playGame,
    finishGame,
    addCoinsPurchase
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}

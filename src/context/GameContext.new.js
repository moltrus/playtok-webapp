import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import fallbackGames from '../data/games';
import { fetchGames, fetchStats, fetchGame } from '../services/gameService';

/*
GameContext responsibilities:
- Hold coin balance (start with 100 for MVP)
- Track per-game stats: likes, plays, players (active), winners, coinsSpent
- Provide functions: playGame(id), likeGame(id), finishGame(id, { won: boolean })
- Fake auto-growth every N seconds: randomly increment likes/plays/winners
- Persist to localStorage (simple JSON) with version key
*/

const STORAGE_KEY = 'playtok_v1_state';

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

function buildInitialState() {
  return { coins: 100, games: {} };
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gamesList, setGamesList] = useState([]); 
  const [totalGamesCount, setTotalGamesCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreGames, setHasMoreGames] = useState(true);
  const [gameDetailsCache, setGameDetailsCache] = useState({});
  const [error, setError] = useState(null);
  
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return buildInitialState();
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }, [state]);

  const transformGameData = useCallback((game) => {
    const sessionLength = game.mechanics?.sessionLength ?? 30;
    const cost = Math.min(10, 5 + Math.floor(sessionLength / 25));
    const normalizedId = game.id.replace(/_/g, '-');
    return {
      name: game.name,
      costCoins: cost,
      rewardCoins: reward,
      base: game
    };
  }, []);

  const loadGames = useCallback(async (page = 1, replace = false) => {
    if ((isLoadingMore || !hasMoreGames) && page > 1) return;
    try {
      setIsLoadingMore(true);
      setError(null);
      const gamesResponse = await fetchGames(page, GAMES_PER_PAGE);
      if (gamesResponse.success && Array.isArray(gamesResponse.games)) {
        setCurrentPage(page);
        setHasMoreGames(gamesResponse.pagination.page < gamesResponse.pagination.pages);
        setTotalGamesCount(gamesResponse.pagination.total);
        const newGames = gamesResponse.games
          .filter(g => {
            const normalizedId = g.id.replace(/_/g, '-');
            return normalizedId !== 'tap-jump' && normalizedId !== 'tilt-maze';
          })
          .map(g => transformGameData(g));
        setGamesList(prevGames => replace ? newGames : [...prevGames, ...newGames]);
        setState(s => {
          const merged = { ...s.games };
          newGames.forEach(g => {
            if (!merged[g.id]) merged[g.id] = defaultGameStats(g.base);
          });
          return { ...s, games: merged };
        });
      } else {
        setError('Failed to load games: Invalid response format');
      }
    } catch (error) {
      console.error('Error loading games:', error);
      setError('Failed to load games: Network error');
    } finally {
      setIsLoadingMore(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [hasMoreGames, isLoadingMore, transformGameData, isInitialLoad]);

  const loadMoreGames = useCallback(() => {
    loadGames(currentPage + 1);
  }, [currentPage, loadGames]);
  
  useEffect(() => {
    if (isInitialLoad) {
    }
  }, [isInitialLoad, loadGames]);

  const fetchGameDetails = useCallback(async (gameId) => {
    const normalizedId = gameId.replace(/_/g, '-');
    if (gameDetailsCache[normalizedId]) {
      return gameDetailsCache[normalizedId];
    }
    const existingGame = gamesList.find(g => g.id === normalizedId);
    if (existingGame) {
      setGameDetailsCache(prev => ({
        ...prev,
        [normalizedId]: existingGame
      }));
      return existingGame;
    }
    try {
      const response = await fetchGame(normalizedId);
      if (response.success && response.game) {
        const transformedGame = transformGameData(response.game);
        setGameDetailsCache(prev => ({
          ...prev,
          [normalizedId]: transformedGame
        }));
        setState(s => {
          if (!s.games[normalizedId]) {
            return {
              ...s,
              games: {
                ...s.games,
                [normalizedId]: defaultGameStats(response.game)
              }
            };
          }
          return s;
        });
        return transformedGame;
      }
      throw new Error('Game not found');
    } catch (error) {
      console.error(`Error fetching game ${normalizedId}:`, error);
      throw error;
    }
  }, [gameDetailsCache, gamesList, transformGameData]);

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
    const normalizedId = id.replace(/_/g, '-');
    let meta = gamesList.find(g => g.id === normalizedId);
    if (!meta && gameDetailsCache[normalizedId]) {
      meta = gameDetailsCache[normalizedId];
    }
    if (!meta) {
      console.log('Game not found:', id, 'normalized:', normalizedId);
      return false;
    }
    if (state.coins < meta.costCoins) {
      console.log('Insufficient coins:', state.coins, 'needed:', meta.costCoins);
      return false;
    }
    setState(s => ({
      ...s,
      coins: s.coins - meta.costCoins,
      games: {
        ...s.games,
        [normalizedId]: {
          ...(s.games[normalizedId] || defaultGameStats(meta.base)),
          plays: (s.games[normalizedId]?.plays || 0) + 1,
          players: (s.games[normalizedId]?.players || 0) + 1,
          coinsSpent: (s.games[normalizedId]?.coinsSpent || 0) + meta.costCoins
        }
      }
    }));
    console.log('Game started successfully:', id);
    return true;
  }, [gamesList, state.coins, gameDetailsCache]);

  const finishGame = useCallback((id, { won }) => {
    const normalizedId = id.replace(/_/g, '-');
    let meta = gamesList.find(g => g.id === normalizedId);
    if (!meta && gameDetailsCache[normalizedId]) {
      meta = gameDetailsCache[normalizedId];
    }
    if (!meta) return;
    setState(s => ({
      ...s,
      coins: won ? s.coins + meta.rewardCoins : s.coins,
      games: {
        ...s.games,
        [normalizedId]: {
          ...(s.games[normalizedId] || defaultGameStats(meta.base)),
          players: Math.max(0, (s.games[normalizedId]?.players || 1) - 1),
          winners: won ? (s.games[normalizedId]?.winners || 0) + 1 : (s.games[normalizedId]?.winners || 0)
        }
      }
    }));
  }, [gamesList, gameDetailsCache]);

  const addCoinsPurchase = useCallback((bundle) => {
    const map = { small: 100, medium: 250, large: 600 };
    adjustCoins(map[bundle] || 0);
  }, [adjustCoins]);

  const growRef = useRef();
  useEffect(() => {
    growRef.current = setInterval(() => {
      setState(s => {
        const gameIds = Object.keys(s.games);
        const samplesToUpdate = Math.min(20, gameIds.length);
        const randomIndices = new Set();
        while (randomIndices.size < samplesToUpdate) {
          randomIndices.add(Math.floor(Math.random() * gameIds.length));
        }
        const updated = { ...s.games };
        Array.from(randomIndices).forEach(idx => {
          const id = gameIds[idx];
          if (Math.random() < 0.4) updated[id].plays += Math.floor(Math.random() * 2);
          if (Math.random() < 0.3) updated[id].likes += Math.random() < 0.6 ? 1 : 0;
          if (Math.random() < 0.2) updated[id].winners += Math.random() < 0.3 ? 1 : 0;
        });
        return { ...s, games: updated };
      });
    }, AUTO_GROW_INTERVAL_MS * 2.5);
    return () => clearInterval(growRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const statsResponse = await fetchStats();
        if (cancelled) return;
        if (statsResponse.success && statsResponse.stats && Array.isArray(statsResponse.stats.games)) {
          setState(s => {
            const merged = { ...s.games };
            statsResponse.stats.games.forEach(g => {
              const normalizedId = g.id.replace(/_/g, '-');
              if (merged[normalizedId]) {
                merged[normalizedId] = {
                  ...merged[normalizedId],
                  likes: g.baseStats?.likes || merged[normalizedId].likes,
                  plays: g.baseStats?.plays || merged[normalizedId].plays,
                  winners: g.baseStats?.winners || merged[normalizedId].winners || Math.floor((g.baseStats?.plays || 0) * 0.15)
                };
              }
            });
            return { ...s, games: merged };
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    if (!isInitialLoad) {
      loadStats();
    }
    return () => { cancelled = true; };
  }, [isInitialLoad]);

  const value = {
    coins: state.coins,
    gameStats: state.games,
    games: gamesList,
    totalGamesCount,
    likeGame,
    playGame,
    finishGame,
    addCoinsPurchase,
    loadMoreGames,
    fetchGameDetails,
    hasMoreGames,
    isLoadingMore,
    isInitialLoad,
    error
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}
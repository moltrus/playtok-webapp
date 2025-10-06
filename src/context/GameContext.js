import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import fallbackGames from '../data/games';
import { fetchGames, fetchStats } from '../services/gameService';

/*
GameContext responsibilities:
- Hold coin balance (start with 100 for MVP)
- Track per-game stats: likes, plays, players (active), winners, coinsSpent
- Provide functions: playGame(id), likeGame(id), finishGame(id, { won: boolean })
- Fake auto-growth every N seconds: randomly increment likes/plays/winners
- Persist to localStorage (simple JSON) with version key
*/

const STORAGE_KEY = 'playtok_v1_state';
const AUTO_GROW_INTERVAL_MS = 8000;

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
  const state = { coins: 100, games: {}, likedGames: new Set() };
  list.filter(g => g.id !== 'tap-jump' && g.id !== 'tilt-maze')
      .forEach(g => { state.games[g.id] = defaultGameStats(g.base); });
  return state;
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gamesList, setGamesList] = useState(fallbackGames);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreGames, setHasMoreGames] = useState(true);
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Convert likedGames array back to Set
        if (parsed.likedGames && Array.isArray(parsed.likedGames)) {
          parsed.likedGames = new Set(parsed.likedGames);
        } else {
          parsed.likedGames = new Set();
        }
        return parsed;
      }
    } catch (e) {  }
    return buildInitialState(fallbackGames);
  });

  useEffect(() => {
    try { 
      // Convert Set to array for JSON serialization
      const stateToSave = {
        ...state,
        likedGames: Array.from(state.likedGames || [])
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave)); 
    } catch (e) {  }
  }, [state]);

  const adjustCoins = useCallback((delta) => {
    setState(s => ({ ...s, coins: Math.max(0, s.coins + delta) }));
  }, []);

  const likeGame = useCallback((id) => {
    setState(s => {
      const likedGames = new Set(s.likedGames || []);
      const isCurrentlyLiked = likedGames.has(id);
      
      if (isCurrentlyLiked) {
        // Unlike: remove from set and decrement count
        likedGames.delete(id);
        return {
          ...s,
          likedGames,
          games: {
            ...s.games,
            [id]: { ...s.games[id], likes: Math.max(0, s.games[id].likes - 1) }
          }
        };
      } else {
        // Like: add to set and increment count
        likedGames.add(id);
        return {
          ...s,
          likedGames,
          games: {
            ...s.games,
            [id]: { ...s.games[id], likes: s.games[id].likes + 1 }
          }
        };
      }
    });
  }, []);

  const playGame = useCallback((id) => {
    const normalizedId = id.replace(/_/g, '-');
    
    const meta = gamesList.find(g => g.id === normalizedId || g.id === id);
    if (!meta) {
      console.log('Game not found in gamesList:', id, 'normalized:', normalizedId);
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
    const normalizedId = id.replace(/_/g, '-');
    
    const meta = gamesList.find(g => g.id === normalizedId || g.id === id);
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
    const map = { small: 100, medium: 250, large: 600 };
    adjustCoins(map[bundle] || 0);
  }, [adjustCoins]);
  
  const transformGameData = (game) => {
    const sessionLength = game.mechanics?.sessionLength ?? 30;
    const cost = Math.min(10, 5 + Math.floor(sessionLength / 25));
    const reward = cost * 2 + Math.floor(Math.random() * 3);
    
    const normalizedId = game.id.replace(/_/g, '-');
    
    return {
      id: normalizedId,
      name: game.name,
      costCoins: cost,
      rewardCoins: reward,
      preview: `/images/${normalizedId}.png`,
      base: game
    };
  };
  
  const loadMoreGames = useCallback(async () => {
    if (!hasMoreGames || isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const gamesResponse = await fetchGames(nextPage, 20);
      
      if (gamesResponse.success && Array.isArray(gamesResponse.games)) {
        setCurrentPage(gamesResponse.pagination?.currentPage || nextPage);
        setHasMoreGames(gamesResponse.pagination?.hasMore || false);
        
        const newGames = gamesResponse.games
          .filter(g => {
            const normalizedId = g.id.replace(/_/g, '-');
            return normalizedId !== 'tap-jump' && normalizedId !== 'tilt-maze';
          })
          .map(g => transformGameData(g));
        
        setGamesList(prevGames => [...prevGames, ...newGames]);
        
        setState(s => {
          const merged = { ...s.games };
          newGames.forEach(g => {
            if (!merged[g.id]) merged[g.id] = defaultGameStats(g.base);
          });
          return { ...s, games: merged };
        });
      }
    } catch (error) {
      console.error('Error loading more games:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreGames, isLoadingMore, currentPage]);

  const growRef = useRef();
  useEffect(() => {
    growRef.current = setInterval(() => {
      setState(s => {
        const updated = { ...s.games };
        Object.keys(updated).forEach(id => {
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
    
    const loadData = async () => {
      try {
        const gamesResponse = await fetchGames(1, 20);
        
        if (cancelled) return;
        
        if (gamesResponse.success && Array.isArray(gamesResponse.games)) {
          setCurrentPage(gamesResponse.pagination?.currentPage || 1);
          setHasMoreGames(gamesResponse.pagination?.hasMore || false);
          
          const transformed = gamesResponse.games
            .filter(g => {
              const normalizedId = g.id.replace(/_/g, '-');
              return normalizedId !== 'tap-jump' && normalizedId !== 'tilt-maze';
            })
            .map(g => transformGameData(g));
          
          setGamesList(transformed);
          
          setState(s => {
            const merged = { ...s.games };
            transformed.forEach(g => {
              if (!merged[g.id]) merged[g.id] = defaultGameStats(g.base);
            });
            return { ...s, games: merged };
          });
        }
        
        const statsResponse = await fetchStats();
        
        if (cancelled) return;
        
        if (statsResponse.success && statsResponse.stats && Array.isArray(statsResponse.stats.games)) {
          setState(s => {
            const merged = { ...s.games };
            
            statsResponse.stats.games.forEach(g => {
              if (merged[g.id]) {
                merged[g.id] = {
                  ...merged[g.id],
                  likes: g.baseStats?.likes || merged[g.id].likes,
                  plays: g.baseStats?.plays || merged[g.id].plays,
                  winners: g.baseStats?.winners || merged[g.id].winners || Math.floor((g.baseStats?.plays || 0) * 0.15)
                };
              }
            });
            
            return { ...s, games: merged };
          });
        }
      } catch (error) {
        console.error('Error loading games or stats:', error);
      }
    };
    
    loadData();
    return () => { cancelled = true; };
  }, []);

  const value = {
    coins: state.coins,
    gameStats: state.games,
    games: gamesList,
    likedGames: state.likedGames || new Set(),
    likeGame,
    playGame,
    finishGame,
    addCoinsPurchase,
    loadMoreGames,
    hasMoreGames,
    isLoadingMore
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}

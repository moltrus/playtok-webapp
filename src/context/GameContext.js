import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import fallbackGames from '../data/games';
import { fetchGames, fetchStats } from '../services/gameService';
import { gameRegistry } from '../utils/gameRegistry';

/*
GameContext responsibilities:
- Hold coin balance (start with 1000 for MVP)
- Track per-game stats: likes, plays, players (active), winners, coinsSpent
- Provide functions: playGame(id), likeGame(id), finishGame(id, { won: boolean })
- Fake auto-growth every N seconds: randomly increment likes/plays/winners
- Persist to localStorage (simple JSON) with version key
*/

const STORAGE_KEY = 'playtok_v1_state';
const AUTO_GROW_INTERVAL_MS = 8000;

const normalizeGameId = (id) => id.replace(/_/g, '-');

const CURATED_GAME_IDS = fallbackGames.map(game => normalizeGameId(game.id));
const CURATED_GAME_SET = new Set(CURATED_GAME_IDS);

const mergeGameCollections = (...collections) => {
  const mergedMap = new Map();
  const extraOrder = [];

  collections.forEach(collection => {
    if (!Array.isArray(collection)) return;

    collection.forEach(game => {
      if (!game || !game.id) return;

      const normalizedId = normalizeGameId(game.id);
      const current = mergedMap.get(normalizedId) || {};
      const next = {
        ...current,
        ...game,
        id: normalizedId
      };

      mergedMap.set(normalizedId, next);

      if (!CURATED_GAME_SET.has(normalizedId) && !extraOrder.includes(normalizedId)) {
        extraOrder.push(normalizedId);
      }
    });
  });

  const curated = CURATED_GAME_IDS
    .map(id => mergedMap.get(id))
    .filter(Boolean);

  const extras = extraOrder
    .map(id => mergedMap.get(id))
    .filter(Boolean);

  return [...curated, ...extras];
};

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
  const allowedGames = [
    'ball-bounce',
    'fruit-slice',
    'memory-flip',
    'quick-tap',
    'stack-tower',
    'dodge-game',
    'maze-escape',
    'bubble-pop',
    'quiz-blitz',
    'color-match-tap',
    'sky-drop',
    'shape-builder',
    '2048-game'
  ];
  list.filter(g => allowedGames.includes(g.id))
      .forEach(g => { state.games[g.id] = defaultGameStats(g.base); });
  return state;
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [gamesList, setGamesList] = useState(() => mergeGameCollections(fallbackGames));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreGames, setHasMoreGames] = useState(true);
  const [state, setState] = useState(() => {
    const baseState = buildInitialState(fallbackGames);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) || {};

        const likedGames = Array.isArray(parsed.likedGames)
          ? new Set(parsed.likedGames)
          : parsed.likedGames instanceof Set
            ? parsed.likedGames
            : new Set();

        const persistedGames = parsed.games && typeof parsed.games === 'object'
          ? parsed.games
          : {};

        const mergedGames = { ...baseState.games, ...persistedGames };

        return {
          ...baseState,
          ...parsed,
          coins: typeof parsed.coins === 'number' ? parsed.coins : baseState.coins,
          games: mergedGames,
          likedGames
        };
      }
    } catch (e) {
      // Swallow errors and fall back to base state.
    }

    return baseState;
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
      const existingStats = s.games[id] || defaultGameStats();
      
      if (isCurrentlyLiked) {
        // Unlike: remove from set and decrement count
        likedGames.delete(id);
        return {
          ...s,
          likedGames,
          games: {
            ...s.games,
            [id]: { ...existingStats, likes: Math.max(0, (existingStats.likes || 0) - 1) }
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
            [id]: { ...existingStats, likes: (existingStats.likes || 0) + 1 }
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
    
    const ensureStats = (statsMap, gameId) => statsMap[gameId] || defaultGameStats();

    setState(s => ({
      ...s,
      coins: s.coins - meta.costCoins,
      games: {
        ...s.games,
        [id]: (() => {
          const current = ensureStats(s.games, id);
          return {
            ...current,
            plays: (current.plays || 0) + 1,
            players: (current.players || 0) + 1,
            coinsSpent: (current.coinsSpent || 0) + meta.costCoins
          };
        })()
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
        [id]: (() => {
          const current = s.games[id] || defaultGameStats();
          return {
            ...current,
            players: Math.max(0, (current.players || 0) - 1),
            winners: won ? (current.winners || 0) + 1 : (current.winners || 0)
          };
        })()
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
    
    const normalizedId = normalizeGameId(game.id);

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
            const normalizedId = normalizeGameId(g.id);
            const allowedGames = [
              'ball-bounce',
              'fruit-slice',
              'memory-flip',
              'quick-tap',
              'stack-tower',
              'dodge-game',
              'maze-escape',
              'bubble-pop',
              'quiz-blitz',
              'color-match-tap',
              'sky-drop',
              'shape-builder',
              '2048-game'
            ];
            return allowedGames.includes(normalizedId);
          })
          .map(g => transformGameData(g));
        
        setGamesList(prevGames => {
          const nextList = mergeGameCollections(fallbackGames, prevGames, newGames);
          // Register new games (duplicates are ignored by the registry map)
          gameRegistry.batchRegister(nextList.map(g => g.id));
          return nextList;
        });
        
        setState(s => {
          const merged = { ...s.games };
          newGames.forEach(g => {
            const id = normalizeGameId(g.id);
            if (!merged[id]) merged[id] = defaultGameStats(g.base);
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
              const normalizedId = normalizeGameId(g.id);
              const allowedGames = [
                'ball-bounce',
                'fruit-slice',
                'memory-flip',
                'quick-tap',
                'stack-tower',
                'dodge-game',
                'maze-escape',
                'bubble-pop',
                'quiz-blitz',
                'color-match-tap',
                'sky-drop',
                'shape-builder',
                '2048-game'
              ];
              return allowedGames.includes(normalizedId);
            })
            .map(g => transformGameData(g));

          const mergedList = mergeGameCollections(fallbackGames, transformed);

          setGamesList(mergedList);
          
          // Register games with the registry
          gameRegistry.batchRegister(mergedList.map(g => g.id));
          
          setState(s => {
            const merged = { ...s.games };
            mergedList.forEach(g => {
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

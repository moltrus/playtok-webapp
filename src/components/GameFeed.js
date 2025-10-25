import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import GameCard from './GameCard';
import { useGame } from '../context/GameContext';

// Keep a trio of feed copies so we can jump between them for a seamless loop.
const LOOP_MULTIPLIER = 3;

export default function GameFeed({ onEnterGame }) {
  const { games } = useGame();
  const gameCount = games?.length ?? 0;
  const [loading] = useState(false);
  const [error] = useState('');
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const inactivityTimerRef = useRef(null);
  const feedRef = useRef(null);
  const isAdjustingRef = useRef(false);
  const slideHeightRef = useRef(0);

  const loopedGames = useMemo(() => {
    if (!games || gameCount === 0) {
      return [];
    }

    const clones = [];
    for (let loopIndex = 0; loopIndex < LOOP_MULTIPLIER; loopIndex += 1) {
      games.forEach((game, itemIndex) => {
        clones.push({
          game,
          key: `${loopIndex}-${game.id}-${itemIndex}`
        });
      });
    }
    return clones;
  }, [gameCount, games]);

  const resetInactivityTimer = useCallback(() => {
    setShowSwipeHint(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setShowSwipeHint(true);
    }, 15000); // Show hint after 15 seconds
  }, []);

  const updateSlideHeight = useCallback(() => {
    const container = feedRef.current;
    if (!container) {
      return;
    }
    const firstSlide = container.querySelector('.feed-slide');
    const measuredHeight = firstSlide?.getBoundingClientRect().height || container.getBoundingClientRect().height;
    if (measuredHeight) {
      slideHeightRef.current = measuredHeight;
    }
  }, []);

  const ensureLoopPosition = useCallback(() => {
    const container = feedRef.current;
    if (!container || gameCount === 0) {
      return;
    }

    const slideHeight = slideHeightRef.current || container.getBoundingClientRect().height;
    if (!slideHeight) {
      return;
    }

    const loopHeight = slideHeight * gameCount;
    isAdjustingRef.current = true;
    container.scrollTop = loopHeight;
    requestAnimationFrame(() => {
      isAdjustingRef.current = false;
    });
  }, [gameCount]);

  const handleLoopingScroll = useCallback(() => {
    const container = feedRef.current;
    if (!container || gameCount === 0 || isAdjustingRef.current) {
      return;
    }

    const slideHeight = slideHeightRef.current || container.getBoundingClientRect().height;
    if (!slideHeight) {
      return;
    }

    const loopHeight = slideHeight * gameCount;
    const scrollTop = container.scrollTop;

    if (scrollTop <= slideHeight) {
      isAdjustingRef.current = true;
      container.scrollTop = scrollTop + loopHeight;
      requestAnimationFrame(() => {
        isAdjustingRef.current = false;
      });
      return;
    }

    if (scrollTop >= loopHeight * 2) {
      isAdjustingRef.current = true;
      container.scrollTop = scrollTop - loopHeight;
      requestAnimationFrame(() => {
        isAdjustingRef.current = false;
      });
    }
  }, [gameCount]);

  useEffect(() => {
    resetInactivityTimer();

    const handleScroll = () => {
      handleLoopingScroll();
      resetInactivityTimer();
    };

    const handleTouch = () => {
      resetInactivityTimer();
    };

    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll, { passive: true });
      feedElement.addEventListener('touchstart', handleTouch, { passive: true });
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll);
        feedElement.removeEventListener('touchstart', handleTouch);
      }
    };
  }, [handleLoopingScroll, resetInactivityTimer]);

  useEffect(() => {
    if (gameCount === 0) {
      return undefined;
    }

    updateSlideHeight();
    const resizeHandler = () => updateSlideHeight();
    window.addEventListener('resize', resizeHandler);

    const rafId = requestAnimationFrame(() => {
      updateSlideHeight();
      ensureLoopPosition();
    });

    return () => {
      window.removeEventListener('resize', resizeHandler);
      cancelAnimationFrame(rafId);
    };
  }, [ensureLoopPosition, gameCount, updateSlideHeight]);

  const handlePlay = useCallback((id) => {
    onEnterGame(id);
  }, [onEnterGame]);

  if (loading) {
    return (
      <div className="feed-container loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(0, 255, 255, 0.2)',
          borderTop: '4px solid rgba(0, 255, 255, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-container error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        padding: '20px',
        textAlign: 'center',
        color: 'rgba(255, 100, 100, 0.9)'
      }}>
        <div style={{ marginBottom: '15px', fontSize: '20px' }}>⚠️</div>
        <div>Error loading games. Please try again later.</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(0, 255, 255, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="feed-container empty" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        No games available right now.
      </div>
    );
  }

  return (
    <div className="feed-container" ref={feedRef}>
      {loopedGames.map(({ game, key }) => (
        <section key={key} className="feed-slide">
          <GameCard game={game} onPlay={handlePlay} />
        </section>
      ))}
      {showSwipeHint && (
        <div className="swipe-hint">
          <div className="swipe-hint-text">Swipe Up</div>
          <div className="swipe-hint-arrow">↑</div>
        </div>
      )}
    </div>
  );
}

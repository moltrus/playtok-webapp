import React, { useCallback, useState, useEffect, useRef } from 'react';
import GameCard from './GameCard';
import { useGame } from '../context/GameContext';

/**
 * VirtualizedGameFeed component
 * Uses virtualization techniques to only render visible game cards
 */
export default function VirtualizedGameFeed({ onEnterGame }) {
  const { games, loadMoreGames, hasMoreGames, isLoadingMore } = useGame();
  const [error, setError] = useState('');
  
  const feedContainerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [scrollPosition, setScrollPosition] = useState(0);
  const gameCardHeight = 280;
  const bufferSize = 5;

  const handlePlay = useCallback((id) => {
    onEnterGame(id);
  }, [onEnterGame]);

  const updateVisibleRange = useCallback(() => {
    if (!feedContainerRef.current) return;
    const container = feedContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const start = Math.max(0, Math.floor(scrollTop / gameCardHeight) - bufferSize);
    const end = Math.min(
      games.length,
      Math.ceil((scrollTop + containerHeight) / gameCardHeight) + bufferSize
    );
    setVisibleRange({ start, end });
    setScrollPosition(scrollTop);
    if (hasMoreGames && !isLoadingMore && end >= games.length - 10) {
      loadMoreGames();
    }
  }, [games.length, hasMoreGames, isLoadingMore, loadMoreGames]);

  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', updateVisibleRange);
    updateVisibleRange();
    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
    };
  }, [updateVisibleRange]);

  useEffect(() => {
    updateVisibleRange();
  }, [games, updateVisibleRange]);

  if (games.length === 0 && isLoadingMore) {
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

  const totalHeight = games.length * gameCardHeight;
  
  const visibleGames = games.slice(visibleRange.start, visibleRange.end);
  
  const offsetY = visibleRange.start * gameCardHeight;

  return (
    <div 
      className="feed-container" 
      ref={feedContainerRef}
      style={{ 
        height: '100%', 
        overflowY: 'auto',
        position: 'relative'
      }}
    >
      {/* Spacer div to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible game cards with appropriate offset */}
        <div style={{ 
          position: 'absolute', 
          top: offsetY, 
          left: 0, 
          right: 0
        }}>
          {visibleGames.map(g => (
            <section key={g.id} className="feed-slide">
              <GameCard game={g} onPlay={handlePlay} />
            </section>
          ))}
        </div>
      </div>
      {/* Loading indicator at bottom while loading more */}
      {isLoadingMore && (
        <div className="loading-more" style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          width: '100%'
        }}>
          <div className="loading-spinner" style={{
            width: '30px',
            height: '30px',
            border: '3px solid rgba(0, 255, 255, 0.2)',
            borderTop: '3px solid rgba(0, 255, 255, 0.8)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      )}
    </div>
  );
}
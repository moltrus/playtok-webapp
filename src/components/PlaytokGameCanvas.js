import { useRef, useEffect, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { gamePreloader } from '../utils/gamePreloader.js';

// Enable canvas touch events on mobile
document.addEventListener('touchmove', function(e) {
    if (e.target && e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });

export function PlaytokGameCanvas({ gameId, onScoreUpdate, onGameEnd }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Initializing...');
    const [error, setError] = useState(null);
    const [instructions, setInstructions] = useState('');

    // Use a ref to track initialization state
    const initializedRef = useRef(false);
    
    // Retry function for failed loads
    const retryGame = useCallback(() => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage('Retrying...');
        initializedRef.current = false;
        // This will trigger the useEffect to re-run
    }, []);

    useEffect(() => {
        if (!gameId) {
            return;
        }

        // Skip re-initialization if the game is already initialized with the same gameId
        if (initializedRef.current && gameRef.current) {
            console.log('Game already initialized, skipping re-initialization');
            return;
        }
        
        let mounted = true;
        let timeoutId;

        console.log('Scheduling game initialization for:', gameId);
        
        // Use a timeout to ensure the DOM is ready, but make it much shorter for preloaded games
        const delay = gamePreloader.isPreloaded(gameId) ? 0 : 50;
        console.log(`Using ${delay}ms delay for ${gameId} (preloaded: ${gamePreloader.isPreloaded(gameId)})`);
        
        if (delay === 0) {
            // No delay for preloaded games - start immediately
            if (!mounted) return;
            initGame();
        } else {
            timeoutId = setTimeout(() => {
                if (!mounted) return;
                initGame();
            }, delay);
        }

        async function initGame() {
            if (!mounted) return;
            
            const initStartTime = performance.now();
            console.log('🚀 Starting game initialization...');
            
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            if (!canvas || !container) {
                console.error('Canvas or container ref not available');
                setIsLoading(false);
                return;
            }

            try {
                console.log('⏱️ Step 1: Loading game class...');
                const stepStart = performance.now();
                
                // Check if preloaded
                if (gamePreloader.isPreloaded(gameId)) {
                    setLoadingMessage('Starting preloaded game...');
                    console.log('✅ Game is preloaded!');
                } else {
                    setLoadingMessage('Game still loading in background...');
                    console.log('⚠️ Game not preloaded, loading on demand');
                }
                
                setIsLoading(true);
                
                if (!mounted) return;
                
                const GameClass = await gamePreloader.getGameClass(gameId);
                console.log(`⏱️ Step 1 completed: ${(performance.now() - stepStart).toFixed(2)}ms`);
                
                if (!mounted) return;
                
                setLoadingMessage('Initializing game world...');
                
                if (!GameClass) {
                    console.error(`Game class not found for ID: ${gameId}`);
                    setIsLoading(false);
                    setInstructions('Error: Game could not be loaded');
                    return;
                }

                    console.log('⏱️ Step 2: Setting up canvas...');
                    const canvasStepStart = performance.now();
                    // Try to get the canvas context with comprehensive error handling
                    let ctx;
                    setLoadingMessage('Setting up canvas...');
                    
                    try {
                        if (!canvas) {
                            throw new Error('Canvas element is null or undefined');
                        }
                        
                        // Try different context types if '2d' fails
                        ctx = canvas.getContext('2d') || 
                              canvas.getContext('webgl') || 
                              canvas.getContext('experimental-webgl');
                              
                        if (!ctx) {
                            throw new Error('Could not get canvas context. Your browser may not support canvas.');
                        }
                    } catch (ctxError) {
                        console.error('Canvas context error:', ctxError);
                        setIsLoading(false);
                        setInstructions('Error: ' + ctxError.message);
                        return;
                    }                // Get container dimensions
                const containerRect = container.getBoundingClientRect();
                
                // Use container dimensions with aspect ratio constraint
                const aspectRatio = 9/16; // Target aspect ratio
                const containerWidth = containerRect.width;
                const containerHeight = containerRect.height;
                
                // Determine canvas size based on container and aspect ratio
                let finalWidth, finalHeight;
                
                if (containerWidth / containerHeight > aspectRatio) {
                    // Container is wider than target aspect ratio
                    finalHeight = containerHeight;
                    finalWidth = containerHeight * aspectRatio;
                } else {
                    // Container is taller than target aspect ratio
                    finalWidth = containerWidth;
                    finalHeight = containerWidth / aspectRatio;
                }
                
                // Set minimum dimensions
                finalWidth = Math.max(finalWidth, 320);
                finalHeight = Math.max(finalHeight, 480);
                
                // Set both the actual canvas size and its CSS size
                canvas.width = finalWidth;
                canvas.height = finalHeight;
                canvas.style.width = `${finalWidth}px`;
                canvas.style.height = `${finalHeight}px`;
                
                // Get device pixel ratio for high-DPI displays
                const dpr = window.devicePixelRatio || 1;
                
                // For high-DPI displays, increase canvas resolution
                if (dpr > 1) {
                    canvas.width = finalWidth * dpr;
                    canvas.height = finalHeight * dpr;
                    ctx.scale(dpr, dpr);
                }

                // Create game instance - always create a new one for proper initialization
                if (gameRef.current) {
                    // Clean up existing game first
                    try {
                        gameRef.current.stop();
                        gameRef.current.destroy();
                    } catch (e) {
                        console.warn('Error cleaning up previous game:', e);
                    }
                }
                
                try {
                    // Make sure the context exists before creating the game
                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }
                    
                    console.log(`⏱️ Step 2 completed: ${(performance.now() - canvasStepStart).toFixed(2)}ms`);
                    console.log('⏱️ Step 3: Creating game instance...');
                    const gameCreationStart = performance.now();
                    
                    setLoadingMessage('Creating game instance...');
                    
                    // Create the game instance with proper error handling
                    gameRef.current = new GameClass(canvas, ctx, null, onScoreUpdate);
                    gameRef.current.onGameEnd = onGameEnd;
                    // Store the gameId to help with cleanup decisions
                    gameRef.current.gameId = gameId;
                    
                    console.log(`⏱️ Step 3 completed: ${(performance.now() - gameCreationStart).toFixed(2)}ms`);
                    console.log('Game instance created successfully');
                    
                    setLoadingMessage('Almost ready...');
                    
                    // Mark as initialized
                    initializedRef.current = true;
                    
                    // Get instructions
                    setInstructions(gameRef.current.getInstructions());
                    
                    const totalTime = performance.now() - initStartTime;
                    console.log(`🎯 Total initialization time: ${totalTime.toFixed(2)}ms`);
                } catch (err) {
                    console.error('Error creating game instance:', err);
                    // Display error message to user
                    setInstructions('Error loading game: ' + err.message);
                    gameRef.current = null;
                    initializedRef.current = false;
                }
                
                console.log('About to set loading to false and start game');
                
                // Use flushSync to immediately update the UI and remove loading screen
                console.log('Setting loading to false with flushSync');
                flushSync(() => {
                    setIsLoading(false);
                });
                
                console.log('Loading state updated, UI should be responsive now');
                
                // Use setTimeout to start the game without blocking the UI update
                setTimeout(() => {
                    if (gameRef.current && mounted) {
                        try {
                            console.log('Starting game...');
                            gameRef.current.start();
                            console.log('Game started successfully');
                        } catch (err) {
                            console.error('Error starting game:', err);
                            // Show error in the instructions area
                            setInstructions('Error starting game: ' + err.message);
                        }
                    } else {
                        console.error('Game instance not created, cannot start');
                        setInstructions('Error: Game could not be initialized');
                    }
                }, 0); // Execute on next tick to avoid blocking
            } catch (error) {
                console.error('Failed to initialize game:', error);
                setIsLoading(false);
                
                // Handle different types of errors
                if (error.name === 'ChunkLoadError') {
                    setError({
                        type: 'chunk',
                        message: 'Failed to load game files. Please check your connection and try again.',
                        retry: true
                    });
                } else if (error.message.includes('Failed to load game')) {
                    setError({
                        type: 'loading',
                        message: 'Game temporarily unavailable. Please try again in a moment.',
                        retry: true
                    });
                } else {
                    setError({
                        type: 'general',
                        message: `Error: ${error.message}`,
                        retry: false
                    });
                }
            }
        }

        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
            
            // Only clean up game if we're changing to a different game
            // This prevents unnecessary cleanup during re-renders
            if (gameRef.current && gameId !== gameRef.current.gameId) {
                console.log('Cleaning up game before switching to a new one');
                try {
                    gameRef.current.stop();
                    gameRef.current.destroy();
                } catch (e) {
                    // Silent catch in case destroy method isn't available
                }
                gameRef.current = null;
                initializedRef.current = false;
            }
        };
    }, [gameId, onScoreUpdate, onGameEnd, error]);

    const canvasContainerStyle = {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
    };

    const canvasStyle = {
        touchAction: 'none', // Prevent scrolling on touch
        display: 'block',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    };

    // Error state
    if (error) {
        return (
            <div className="game-loading">
                <div className="error-icon">⚠️</div>
                <div className="game-loading-text">{error.message}</div>
                {error.retry && (
                    <button 
                        onClick={retryGame}
                        className="retry-button"
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(145deg, #00ffff, #8a2be2)',
                            border: 'none',
                            borderRadius: '5px',
                            color: '#000',
                            fontFamily: 'Press Start 2P',
                            fontSize: '0.6rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                        }}
                    >
                        Retry Game
                    </button>
                )}
                <div className="game-loading-tip">
                    {error.type === 'chunk' ? 
                        'This usually happens with slow connections. Try refreshing the page if the problem persists.' :
                        'If this continues, try refreshing the page or contact support.'
                    }
                </div>
            </div>
        );
    }

    if (isLoading) {
        const tips = [
            "All games are preloaded for instant access!",
            "Pro tip: Try different difficulty levels",
            "Did you know? Games auto-save your progress",
            "Fun fact: Each game has unique physics",
            "Hint: Look for combo multipliers!",
            "Games load instantly after preloading completes"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        
        return (
            <div className="game-loading">
                <div className="game-loading-spinner"></div>
                <div className="game-loading-text">{loadingMessage}</div>
                <div className="game-loading-tip">{randomTip}</div>
            </div>
        );
    }

    return (
        <div ref={containerRef} style={canvasContainerStyle}>
            <canvas
                ref={canvasRef}
                style={canvasStyle}
            />
            {instructions && (
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(145deg, rgba(26, 10, 45, 0.9) 0%, rgba(15, 10, 26, 0.95) 50%, rgba(45, 26, 61, 0.9) 100%)',
                    color: '#00ffff',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'VT323, monospace',
                    border: '1px solid rgba(0, 255, 255, 0.6)',
                    boxShadow: '0 4px 12px rgba(138, 43, 226, 0.4), 0 0 20px rgba(0, 255, 255, 0.3), inset 0 1px 0 rgba(0, 255, 255, 0.2)',
                    textShadow: '0 0 5px rgba(0, 255, 255, 0.6)',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}>
                    {instructions}
                </div>
            )}
        </div>
    );
}
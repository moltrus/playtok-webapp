import { useRef, useEffect, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { gamePreloader } from '../utils/gamePreloader.js';

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

    const initializedRef = useRef(false);
    const retryGame = useCallback(() => {
        setError(null);
        setIsLoading(true);
        initializedRef.current = false;
    }, []);

    useEffect(() => {
        if (!gameId) {
            return;
        }

        if (initializedRef.current && gameRef.current) {
            console.log('Game already initialized, skipping re-initialization');
            return;
        }
        let mounted = true;
        let timeoutId;

        console.log('Scheduling game initialization for:', gameId);
        
        // Wait for refs to be available before initializing
        let attempts = 0;
        const maxAttempts = 50; // Max 50 attempts (~1 second with RAF)
        
        const checkRefsAndInit = () => {
            if (!mounted) return;
            
            attempts++;
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            if (!canvas || !container) {
                if (attempts < maxAttempts) {
                    console.log(`Refs not ready yet (attempt ${attempts}/${maxAttempts}), checking again...`);
                    requestAnimationFrame(checkRefsAndInit);
                } else {
                    console.error('Refs failed to become available after max attempts');
                    setIsLoading(false);
                    setError({
                        type: 'general',
                        message: 'Failed to initialize game display',
                        retry: true
                    });
                }
                return;
            }
            
            console.log('Refs are ready, initializing game');
            initGame();
        };
        
        // Start checking immediately - loading state is already true by default
        checkRefsAndInit();

        async function initGame() {
            if (!mounted) return;
            const initStartTime = performance.now();
            console.log('Starting game initialization...');
            
            // Ensure loading state is true at the start
            setIsLoading(true);
            
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) {
                console.error('Canvas or container ref not available');
                setIsLoading(false);
                return;
            }

            try {
                console.log('Step 1: Loading game class...');
                const stepStart = performance.now();
                if (gamePreloader.isPreloaded(gameId)) {
                    console.log('Game is preloaded!');
                } else {
                    console.log('Game not preloaded, loading on demand');
                }
                
                if (!mounted) return;
                const GameClass = await gamePreloader.getGameClass(gameId);
                console.log(`Step 1 completed: ${(performance.now() - stepStart).toFixed(2)}ms`);
                if (!mounted) return;
                if (!GameClass) {
                    console.error(`Game class not found for ID: ${gameId}`);
                    setIsLoading(false);
                    setInstructions('Error: Game could not be loaded');
                    return;
                }

                    console.log('Step 2: Setting up canvas...');
                    const canvasStepStart = performance.now();
                    let ctx;
                    try {
                        if (!canvas) {
                            throw new Error('Canvas element is null or undefined');
                        }
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
                    }

                const containerRect = container.getBoundingClientRect();
                const aspectRatio = 9/16;
                const containerWidth = containerRect.width;
                const containerHeight = containerRect.height;
                let finalWidth, finalHeight;
                if (containerWidth / containerHeight > aspectRatio) {
                    finalHeight = containerHeight;
                    finalWidth = containerHeight * aspectRatio;
                } else {
                    finalWidth = containerWidth;
                    finalHeight = containerWidth / aspectRatio;
                }
                finalWidth = Math.max(finalWidth, 320);
                finalHeight = Math.max(finalHeight, 480);
                const dpr = window.devicePixelRatio || 1;
                canvas.style.width = `${finalWidth}px`;
                canvas.style.height = `${finalHeight}px`;
                canvas.width = finalWidth * dpr;
                canvas.height = finalHeight * dpr;
                if (dpr > 1) {
                    ctx.scale(dpr, dpr);
                }
                canvas.dataset.logicalWidth = finalWidth;
                canvas.dataset.logicalHeight = finalHeight;
                console.log(`Canvas setup: Logical ${finalWidth}x${finalHeight}, Physical ${canvas.width}x${canvas.height}, DPR ${dpr}`);

                if (gameRef.current) {
                    try {
                        gameRef.current.stop();
                        gameRef.current.destroy();
                    } catch (e) {
                        console.warn('Error cleaning up previous game:', e);
                    }
                }
                try {
                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }
                    console.log(`Step 2 completed: ${(performance.now() - canvasStepStart).toFixed(2)}ms`);
                    console.log('Step 3: Creating game instance...');
                    const gameCreationStart = performance.now();
                    gameRef.current = new GameClass(canvas, ctx, null, onScoreUpdate);
                    gameRef.current.onGameEnd = onGameEnd;
                    gameRef.current.gameId = gameId;
                    console.log(`Step 3 completed: ${(performance.now() - gameCreationStart).toFixed(2)}ms`);
                    console.log('Game instance created successfully');
                    initializedRef.current = true;
                    setInstructions(gameRef.current.getInstructions());
                    const totalTime = performance.now() - initStartTime;
                    console.log(`Total initialization time: ${totalTime.toFixed(2)}ms`);
                } catch (err) {
                    console.error('Error creating game instance:', err);
                    setInstructions('Error loading game: ' + err.message);
                    gameRef.current = null;
                    initializedRef.current = false;
                }
                console.log('About to start game');
                setTimeout(() => {
                    if (gameRef.current && mounted) {
                        try {
                            console.log('Starting game...');
                            gameRef.current.start();
                            console.log('Game started successfully');
                            // Only hide loading after game has actually started
                            flushSync(() => {
                                setIsLoading(false);
                            });
                            console.log('Loading state updated, UI should be responsive now');
                        } catch (err) {
                            console.error('Error starting game:', err);
                            setIsLoading(false);
                            setInstructions('Error starting game: ' + err.message);
                        }
                    } else {
                        console.error('Game instance not created, cannot start');
                        setIsLoading(false);
                        setInstructions('Error: Game could not be initialized');
                    }
                }, 0);
            } catch (error) {
                console.error('Failed to initialize game:', error);
                setIsLoading(false);
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
            if (gameRef.current && gameId !== gameRef.current.gameId) {
                console.log('Cleaning up game before switching to a new one');
                try {
                    gameRef.current.stop();
                    gameRef.current.destroy();
                } catch (e) {
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
        touchAction: 'none',
        display: 'block',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    };

    if (error) {
        return (
            <div className="game-loading">
                <div className="error-icon"></div>
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
        return (
            <div ref={containerRef} style={canvasContainerStyle}>
                <canvas
                    ref={canvasRef}
                    style={{...canvasStyle, opacity: 0}}
                />
                <div className="game-loading" style={{position: 'absolute', inset: 0, zIndex: 100}}>
                    <div className="game-loading-spinner"></div>
                    <div className="game-loading-text">Loading...</div>
                </div>
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

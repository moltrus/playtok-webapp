import React, { useRef, useEffect, useState } from 'react';
import { BallBounceGame } from '../games/BallBounceGame.js';
import { QuickTapGame } from '../games/QuickTapGame.js';
import { FruitSliceGame } from '../games/FruitSliceGame.js';
import { TapToJumpGame } from '../games/TapToJumpGame.js';
import { MemoryFlipGame } from '../games/MemoryFlipGame.js';
import { StackTowerGame } from '../games/StackTowerGame.js';
import { DodgeGame } from '../games/DodgeGame.js';
import { MazeEscapeGame } from '../games/MazeEscapeGame.js';
import { BubblePopGame } from '../games/BubblePopGame.js';
import { QuizBlitzGame } from '../games/QuizBlitzGame.js';
import { ColorMatchTapGame } from '../games/ColorMatchTapGame.js';
import { SkyDropGame } from '../games/SkyDropGame.js';
import { ShapeBuilderGame } from '../games/ShapeBuilderGame.js';

// Enable canvas touch events on mobile
document.addEventListener('touchmove', function(e) {
    if (e.target && e.target.tagName === 'CANVAS') {
        e.preventDefault();
    }
}, { passive: false });

// Map game IDs to game classes
const GAME_CLASSES = {
    'ball-bounce': BallBounceGame,
    'quick-tap': QuickTapGame,
    'fruit-slice': FruitSliceGame,
    'tap-to-jump': TapToJumpGame,
    'memory-flip': MemoryFlipGame,
    'stack-tower': StackTowerGame,
    'dodge-game': DodgeGame,
    'maze-escape': MazeEscapeGame,
    'bubble-pop': BubblePopGame,
    'quiz-blitz': QuizBlitzGame,
    'color-match-tap': ColorMatchTapGame,
    'sky-drop': SkyDropGame,
    'shape-builder': ShapeBuilderGame,
    // We'll add more games here as we convert them
};

export function PlaytokGameCanvas({ gameId, onScoreUpdate, onGameEnd }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const gameRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [instructions, setInstructions] = useState('');

    // Use a ref to track initialization state
    const initializedRef = useRef(false);

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
        
        // Use a timeout to ensure the DOM is ready
        timeoutId = setTimeout(() => {
            if (!mounted) return;
            
            initGame();
        }, 100);

        function initGame() {
            if (!mounted) return;
            
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            if (!canvas || !container) {
                console.error('Canvas or container ref not available');
                setIsLoading(false);
                return;
            }

            const GameClass = GAME_CLASSES[gameId];
            if (!GameClass) {
                console.error(`Game class not found for ID: ${gameId}`);
                setIsLoading(false);
                return;
            }

                try {
                    console.log('Starting game initialization for:', gameId);
                    setIsLoading(true);
                    
                    if (!mounted) return;

                    // Try to get the canvas context with comprehensive error handling
                    let ctx;
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
                    
                    // Create the game instance with proper error handling
                    gameRef.current = new GameClass(canvas, ctx, null, onScoreUpdate);
                    gameRef.current.onGameEnd = onGameEnd;
                    // Store the gameId to help with cleanup decisions
                    gameRef.current.gameId = gameId;
                    
                    console.log('Game instance created successfully');
                    
                    // Mark as initialized
                    initializedRef.current = true;
                    
                    // Get instructions
                    setInstructions(gameRef.current.getInstructions());
                } catch (err) {
                    console.error('Error creating game instance:', err);
                    // Display error message to user
                    setInstructions('Error loading game: ' + err.message);
                    gameRef.current = null;
                    initializedRef.current = false;
                }
                
                console.log('About to set loading to false and start game');
                
                // Set loading to false before starting the game
                console.log('Setting loading to false');
                setIsLoading(false);
                
                // Start the game immediately after creation, only if we have a valid game instance
                if (gameRef.current) {
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
            } catch (error) {
                console.error('Failed to initialize game:', error);
                setIsLoading(false);
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
    }, [gameId, onScoreUpdate, onGameEnd]);

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

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div>Loading game...</div>
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
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    fontSize: '14px',
                    zIndex: 10,
                    pointerEvents: 'none'
                }}>
                    {instructions}
                </div>
            )}
        </div>
    );
}
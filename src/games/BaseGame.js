import { useRef, useEffect, useState } from 'react';



// Base Game class for React
export class BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        this.canvas = canvas;
        this.ctx = context;
        this.app = pixiApp;
        this.stage = null;
        this.isRunning = false;
        this.score = 0;
        this.onGameEnd = null;
        this.onScoreUpdate = onScoreUpdate;
        this.animationId = null;
        this.particles = [];
        
        // Get logical canvas dimensions for game calculations
        this.updateLogicalDimensions();
        
        // Only create PIXI stage if app is available
        if (this.app && window.PIXI) {
            this.stage = new window.PIXI.Container();
            this.app.stage.addChild(this.stage);
        } else {
            // Create mock stage for fallback
            this.stage = {
                addChild: () => {},
                removeChild: () => {},
                addChildAt: () => {},
                destroy: () => {}
            };
        }
        
        this.setupInputHandlers();
    }

    updateLogicalDimensions() {
        try {
            const { width, height } = this.getLogicalCanvasDimensions();
            this.logicalWidth = width || 320;  // Default if width is undefined
            this.logicalHeight = height || 480; // Default if height is undefined
            
            // Add a safety check for canvas and context
            if (!this.canvas) {
                console.warn('Canvas is not available during dimension update, using defaults');
            }
            if (!this.ctx) {
                console.warn('Context is not available during dimension update, using defaults');
            }
        } catch (error) {
            console.error('Error in updateLogicalDimensions:', error);
            // Set fallback dimensions if an error occurs
            this.logicalWidth = 320;
            this.logicalHeight = 480;
        }
    }

    setupInputHandlers() {
        // Ensure these are removed first to prevent duplicates
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        
        // Add with proper binding
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        
        this.canvas.addEventListener('touchstart', this.boundTouchStart);
        this.canvas.addEventListener('touchmove', this.boundTouchMove);
        this.canvas.addEventListener('touchend', this.boundTouchEnd);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
        
        // Ensure pointer events are enabled
        this.canvas.style.touchAction = 'none';
    }

    start() {
        try {
            // Do some validation before starting
            if (!this.canvas) {
                console.error('Cannot start game: canvas is null');
                return;
            }
            
            if (!this.ctx) {
                console.error('Cannot start game: context is null');
                return;
            }
            
            // Only start if not already running
            if (this.isRunning) {
                console.log('Game is already running, ignoring start() call');
                return;
            }
            
            this.updateLogicalDimensions();
            this.isRunning = true;
            
            // Cancel any existing animation frame
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            console.log('Starting game loop with canvas dimensions:', 
                        this.canvasWidth, 'x', this.canvasHeight);
                        
            // Start the game loop with requestAnimationFrame to ensure proper timestamp
            this.animationId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        } catch (error) {
            console.error('Error in game start():', error);
            this.isRunning = false;
        }
    }

    stop() {
        console.log('BaseGame stop method called. Current score:', this.score);
        this.isRunning = false;
        
        if (this.animationId) {
            console.log('Canceling animation frame:', this.animationId);
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Notify about game end with the final score
        if (this.onGameEnd) {
            console.log('Calling onGameEnd with score:', this.score);
            this.onGameEnd(this.score);
        }
    }

    destroy() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clean up event listeners
        if (this.canvas) {
            if (this.boundTouchStart) this.canvas.removeEventListener('touchstart', this.boundTouchStart);
            if (this.boundTouchMove) this.canvas.removeEventListener('touchmove', this.boundTouchMove);
            if (this.boundTouchEnd) this.canvas.removeEventListener('touchend', this.boundTouchEnd);
            if (this.boundMouseDown) this.canvas.removeEventListener('mousedown', this.boundMouseDown);
            if (this.boundMouseMove) this.canvas.removeEventListener('mousemove', this.boundMouseMove);
            if (this.boundMouseUp) this.canvas.removeEventListener('mouseup', this.boundMouseUp);
        }
        
        // Clean up PixiJS objects
        if (this.stage && this.app && this.app.stage) {
            this.app.stage.removeChild(this.stage);
            this.stage.destroy({ children: true });
        } else if (this.stage && this.stage.destroy) {
            this.stage.destroy();
        }
    }

    gameLoop() {
        if (!this.isRunning) {
            return;
        }
        
        try {
            // Safety check for canvas and context
            if (!this.canvas || !this.ctx) {
                console.error('Canvas or context is null in gameLoop, stopping game');
                this.isRunning = false;
                return;
            }
            
            // Cancel any existing animation frame to avoid duplicate loops
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            this.update();
            this.draw();
            
            // Schedule the next frame only if the game is still running
            if (this.isRunning) {
                this.animationId = requestAnimationFrame(() => this.gameLoop());
            }
        } catch (error) {
            console.error('Error in game loop:', error);
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Attempt to notify about game end with error
            if (typeof this.onGameEnd === 'function') {
                try {
                    this.onGameEnd(this.score);
                } catch (e) {
                    console.error('Error in onGameEnd callback:', e);
                }
            }
        }
    }

    update() {
        // To be overridden by specific games
    }

    draw() {
        const logicalWidth = parseInt(this.canvas.style.width) || this.canvas.width;
        const logicalHeight = parseInt(this.canvas.style.height) || this.canvas.height;
        this.ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }

    getInstructions() {
        return "Game instructions here";
    }

    getLogicalCanvasDimensions() {
        try {
            // Check if canvas exists first
            if (!this.canvas) {
                console.warn('Canvas is null in getLogicalCanvasDimensions, returning defaults');
                return { width: 320, height: 480 };
            }
            
            // First, try to get dimensions from dataset (preferred method - set by PlaytokGameCanvas)
            if (this.canvas.dataset && this.canvas.dataset.logicalWidth && this.canvas.dataset.logicalHeight) {
                return {
                    width: parseInt(this.canvas.dataset.logicalWidth),
                    height: parseInt(this.canvas.dataset.logicalHeight)
                };
            }
            
            // Try to get dimensions from canvas style
            const styleWidth = this.canvas.style ? parseInt(this.canvas.style.width) : 0;
            const styleHeight = this.canvas.style ? parseInt(this.canvas.style.height) : 0;
            
            // Fallback to canvas dimensions if style is not set or invalid
            const logicalWidth = styleWidth || this.canvas.width || 320;
            const logicalHeight = styleHeight || this.canvas.height || 480;
            
            return { width: logicalWidth, height: logicalHeight };
        } catch (error) {
            console.error('Error in getLogicalCanvasDimensions:', error);
            return { width: 320, height: 480 }; // Safe fallback
        }
    }

    get canvasWidth() {
        return this.logicalWidth || parseInt(this.canvas.style.width) || this.canvas.width;
    }

    get canvasHeight() {
        return this.logicalHeight || parseInt(this.canvas.style.height) || this.canvas.height;
    }

    getLogicalCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    updateScore(newScore) {
        this.score = newScore;
        if (this.onScoreUpdate) {
            this.onScoreUpdate(newScore);
        }
    }

    createSprite(name, x = 0, y = 0) {
        return {
            x,
            y,
            anchor: { set: () => {} },
            scale: { set: () => {} },
            tint: 0xFFFFFF
        };
    }

    handlePointerDown(event) {
        if (!this.isRunning) return;
        
        // Prevent default for touch events
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
        const y = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
        
        // Convert to canvas coordinate space
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        this.checkTap(canvasX, canvasY);
    }

    handleTouchStart(e) {
        e.preventDefault();
    }

    handleTouchMove(e) {
        e.preventDefault();
    }

    handleTouchEnd(e) {
        e.preventDefault();
    }

    handleMouseDown(e) {
        e.preventDefault();
    }

    handleMouseMove(e) {
        e.preventDefault();
    }

    handleMouseUp(e) {
        e.preventDefault();
    }
}

// React hook for game canvas
export function useGameCanvas(gameClass, onScoreUpdate, onGameEnd) {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initGame() {
            if (!canvasRef.current || !gameClass) return;

            try {
                setIsLoading(true);
                await window.assetLoader.load();
                
                if (!mounted) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                canvas.width = canvas.clientWidth * window.devicePixelRatio;
                canvas.height = canvas.clientHeight * window.devicePixelRatio;
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

                // Create game instance
                gameRef.current = new gameClass(canvas, ctx, null, onScoreUpdate);
                gameRef.current.onGameEnd = onGameEnd;
                
                setIsLoading(false);
                gameRef.current.start();
            } catch (error) {
                console.error('Failed to initialize game:', error);
                setIsLoading(false);
            }
        }

        initGame();

        return () => {
            mounted = false;
            if (gameRef.current) {
                gameRef.current.destroy();
                gameRef.current = null;
            }
        };
    }, [gameClass, onScoreUpdate, onGameEnd]);

    return { canvasRef, isLoading, gameInstance: gameRef.current };
}
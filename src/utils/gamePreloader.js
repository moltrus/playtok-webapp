// Game preloader for faster loading times
// This is a legacy wrapper around the new gameRegistry system
import { gameRegistry } from './gameRegistry';

class GamePreloader {
    constructor() {
        this.preloadedGames = new Map();
        this.preloadingGames = new Set();
        this.allGames = [
            'ball-bounce',
            'quick-tap', 
            'fruit-slice',
            'memory-flip',
            'stack-tower',
            'dodge-game',
            'maze-escape',
            'bubble-pop',
            'quiz-blitz',
            'color-match-tap',
            'sky-drop',
            'shape-builder',
            'tap-dash',
            'balloon-pop-frenzy',
        ];
        
        // Register all games with the registry system
        if (typeof window !== 'undefined') {
            gameRegistry.batchRegister(this.allGames);
        }
    }

    // Preload all games in the background
    async preloadAllGames() {
        console.log('Starting background preload of popular games...');
        
        // Only preload the most popular games instead of all games
        const popularGames = this.allGames.slice(0, 5); // Just preload top 5 games
        
        // Set popular games in the registry
        gameRegistry.setPopularGames(popularGames);
        
        // Show progress indicator
        this.showPreloadProgress(0, popularGames.length);
        
        // Use registry to preload games
        gameRegistry.preloadPopularGames((loaded, total) => {
            this.showPreloadProgress(loaded, total);
        });
        
        console.log('Popular games preloaded successfully!');
        // Hide progress indicator after completion - added longer delay to give time for preloading
        setTimeout(() => this.hidePreloadProgress(), 5000);
    }

    // Show preloading progress indicator
    showPreloadProgress(loaded, total) {
        if (typeof window === 'undefined') return;
        
        let indicator = document.getElementById('preload-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'preload-indicator';
            indicator.className = 'preloading-indicator';
            document.body.appendChild(indicator);
        }
        
        const percentage = Math.round((loaded / total) * 100);
        indicator.innerHTML = `Preloading games... ${loaded}/${total} (${percentage}%)`;
        indicator.style.display = 'block';
    }

    // Hide preloading progress indicator
    hidePreloadProgress() {
        if (typeof window === 'undefined') return;
        
        const indicator = document.getElementById('preload-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Preload a specific game
    async preloadGame(gameId) {
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        
        // Use the registry system to preload
        try {
            const GameClass = await gameRegistry.preloadGame(normalizedId);
            this.preloadedGames.set(normalizedId, GameClass);
            return GameClass;
        } catch (error) {
            console.error(`Failed to preload game ${normalizedId}:`, error);
            throw error;
        }
    }

    // Get a game class (either preloaded or load on demand)
    async getGameClass(gameId) {
        const startTime = performance.now();
        
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        
        // Return preloaded if available (synchronous, instant)
        if (this.preloadedGames.has(normalizedId)) {
            const gameClass = this.preloadedGames.get(normalizedId);
            const loadTime = performance.now() - startTime;
            console.log(`✅ Using preloaded game: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
            // Return immediately, no await needed
            return gameClass;
        }

        // Check if currently preloading
        if (this.preloadingGames.has(normalizedId)) {
            console.log(`⏳ Game ${normalizedId} is currently being preloaded, waiting...`);
        }

        // Load on demand
        console.log(`⚠️ Loading game on demand: ${normalizedId} (preloading may not be complete)`);
        const gameClass = await this.preloadGame(normalizedId);
        const loadTime = performance.now() - startTime;
        console.log(`⏱️ On-demand load completed: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
        return gameClass;
    }

    // Dynamic game loading function with retry logic
    async loadGameClass(gameId, retryCount = 3) {
        let lastError;
        
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                console.log(`Loading game ${normalizedId}, attempt ${attempt}/${retryCount}`);
                
                switch (normalizedId) {
                    case 'ball-bounce':
                        const { BallBounceGame } = await import(/* webpackChunkName: "game-ball-bounce" */ '../games/BallBounceGame.js');
                        return BallBounceGame;
                    case 'quick-tap':
                        const { QuickTapGame } = await import(/* webpackChunkName: "game-quick-tap" */ '../games/QuickTapGame.js');
                        return QuickTapGame;
                    case 'fruit-slice':
                        const { FruitSliceGame } = await import(/* webpackChunkName: "game-fruit-slice" */ '../games/FruitSliceGame.js');
                        return FruitSliceGame;
                    case 'memory-flip':
                        const { MemoryFlipGame } = await import(/* webpackChunkName: "game-memory-flip" */ '../games/MemoryFlipGame.js');
                        return MemoryFlipGame;
                    case 'stack-tower':
                        const { StackTowerGame } = await import(/* webpackChunkName: "game-stack-tower" */ '../games/StackTowerGame.js');
                        return StackTowerGame;
                    case 'dodge-game':
                        const { DodgeGame } = await import(/* webpackChunkName: "game-dodge" */ '../games/DodgeGame.js');
                        return DodgeGame;
                    case 'maze-escape':
                        const { MazeEscapeGame } = await import(/* webpackChunkName: "game-maze-escape" */ '../games/MazeEscapeGame.js');
                        return MazeEscapeGame;
                    case 'bubble-pop':
                        const { BubblePopGame } = await import(/* webpackChunkName: "game-bubble-pop" */ '../games/BubblePopGame.js');
                        return BubblePopGame;
                    case 'quiz-blitz':
                        const { QuizBlitzGame } = await import(/* webpackChunkName: "game-quiz-blitz" */ '../games/QuizBlitzGame.js');
                        return QuizBlitzGame;
                    case 'color-match-tap':
                        const { ColorMatchTapGame } = await import(/* webpackChunkName: "game-color-match" */ '../games/ColorMatchTapGame.js');
                        return ColorMatchTapGame;
                    case 'sky-drop':
                        const { SkyDropGame } = await import(/* webpackChunkName: "game-sky-drop" */ '../games/SkyDropGame.js');
                        return SkyDropGame;
                    case 'shape-builder':
                        const { ShapeBuilderGame } = await import(/* webpackChunkName: "game-shape-builder" */ '../games/ShapeBuilderGame.js');
                        return ShapeBuilderGame;
                    case 'tap-dash':
                        const { TapDashGame } = await import(/* webpackChunkName: "game-tap-dash" */ '../games/TapDashGame.js');
                        return TapDashGame;
                    case 'balloon-pop-frenzy':
                        const { BalloonPopFrenzy } = await import(/* webpackChunkName: "game-balloon-pop" */ '../games/BalloonPopFrenzy.js');
                        return BalloonPopFrenzy;
                    default:
                        throw new Error(`Unknown game: ${gameId}`);
                }
            } catch (error) {
                lastError = error;
                console.warn(`Game loading attempt ${attempt} failed for ${gameId}:`, error);
                
                // If it's a ChunkLoadError, wait before retrying
                if (error.name === 'ChunkLoadError' && attempt < retryCount) {
                    console.log(`Retrying in ${attempt * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                    continue;
                }
                
                // If it's the last attempt or a different error, break
                if (attempt === retryCount) {
                    break;
                }
            }
        }
        
        // If all retries failed, throw the last error
        throw new Error(`Failed to load game ${normalizedId} after ${retryCount} attempts: ${lastError.message}`);
    }

    // Check if a game is preloaded
    isPreloaded(gameId) {
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        return this.preloadedGames.has(normalizedId);
    }

    // Get preloading status
    getStatus() {
        return {
            preloaded: Array.from(this.preloadedGames.keys()),
            preloading: Array.from(this.preloadingGames),
            totalGames: this.allGames.length,
            preloadedCount: this.preloadedGames.size,
            isComplete: this.preloadedGames.size === this.allGames.length
        };
    }

    // Get detailed status for debugging
    getDetailedStatus() {
        const status = this.getStatus();
        console.log('🎮 Game Preloader Status:', {
            'Preloaded Games': status.preloaded,
            'Currently Loading': status.preloading,
            'Progress': `${status.preloadedCount}/${status.totalGames}`,
            'Complete': status.isComplete
        });
        return status;
    }
}

// Create and export singleton instance
export const gamePreloader = new GamePreloader();

// Add global debug helper
if (typeof window !== 'undefined') {
    window.debugGamePreloader = () => gamePreloader.getDetailedStatus();
}

// Start preloading all games when the module loads
if (typeof window !== 'undefined') {
    // Delay preloading to not interfere with initial app load
    setTimeout(() => {
        gamePreloader.preloadAllGames();
    }, 2000);
}
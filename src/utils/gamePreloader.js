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
            // 'bubble-pop',
            'quiz-blitz',
            'color-match-tap',
            'sky-drop',
            'shape-builder',
            // 'tap-dash',
            // 'balloon-pop-frenzy',
        ];
        if (typeof window !== 'undefined') {
            gameRegistry.batchRegister(this.allGames);
        }
    }

    async preloadAllGames() {
        console.log('Starting background preload of popular games...');
        const popularGames = this.allGames.slice(0, 5);
        gameRegistry.setPopularGames(popularGames);
        this.showPreloadProgress(0, popularGames.length);
        gameRegistry.preloadPopularGames((loaded, total) => {
            this.showPreloadProgress(loaded, total);
        });
        console.log('Popular games preloaded successfully!');
        setTimeout(() => this.hidePreloadProgress(), 5000);
    }

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

    hidePreloadProgress() {
        if (typeof window === 'undefined') return;
        const indicator = document.getElementById('preload-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    async preloadGame(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        try {
            const GameClass = await gameRegistry.preloadGame(normalizedId);
            this.preloadedGames.set(normalizedId, GameClass);
            return GameClass;
        } catch (error) {
            console.error(`Failed to preload game ${normalizedId}:`, error);
            throw error;
        }
    }

    async getGameClass(gameId) {
        const startTime = performance.now();
        const normalizedId = gameId.replace(/_/g, '-');
        if (this.preloadedGames.has(normalizedId)) {
            const gameClass = this.preloadedGames.get(normalizedId);
            const loadTime = performance.now() - startTime;
            console.log(`Using preloaded game: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
            return gameClass;
        }

        if (this.preloadingGames.has(normalizedId)) {
            console.log(`Game ${normalizedId} is currently being preloaded, waiting...`);
        }

        console.log(`Loading game on demand: ${normalizedId} (preloading may not be complete)`);
        const gameClass = await this.preloadGame(normalizedId);
        const loadTime = performance.now() - startTime;
        console.log(`On-demand load completed: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
        return gameClass;
    }

    async loadGameClass(gameId, retryCount = 3) {
        let lastError;
        const normalizedId = gameId.replace(/_/g, '-');
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                console.log(`Loading game ${normalizedId}, attempt ${attempt}/${retryCount}`);
                switch (normalizedId) {
                    case 'ball-bounce':
                        const { BallBounceGame } = await import('../games/BallBounceGame.js');
                        return BallBounceGame;
                    case 'quick-tap':
                        const { QuickTapGame } = await import('../games/QuickTapGame.js');
                        return QuickTapGame;
                    case 'fruit-slice':
                        const { FruitSliceGame } = await import('../games/FruitSliceGame.js');
                        return FruitSliceGame;
                    case 'memory-flip':
                        const { MemoryFlipGame } = await import('../games/MemoryFlipGame.js');
                        return MemoryFlipGame;
                    case 'stack-tower':
                        const { StackTowerGame } = await import('../games/StackTowerGame.js');
                        return StackTowerGame;
                    case 'dodge-game':
                        const { DodgeGame } = await import('../games/DodgeGame.js');
                        return DodgeGame;
                    case 'maze-escape':
                        const { MazeEscapeGame } = await import('../games/MazeEscapeGame.js');
                        return MazeEscapeGame;
                    // case 'bubble-pop':
                    //     const { BubblePopGame } = await import('../games/BubblePopGame.js');
                    //     return BubblePopGame;
                    case 'quiz-blitz':
                        const { QuizBlitzGame } = await import('../games/QuizBlitzGame.js');
                        return QuizBlitzGame;
                    case 'color-match-tap':
                        const { ColorMatchTapGame } = await import('../games/ColorMatchTapGame.js');
                        return ColorMatchTapGame;
                    case 'sky-drop':
                        const { SkyDropGame } = await import('../games/SkyDropGame.js');
                        return SkyDropGame;
                    case 'shape-builder':
                        const { ShapeBuilderGame } = await import('../games/ShapeBuilderGame.js');
                        return ShapeBuilderGame;
                    // case 'tap-dash':
                    //     const { TapDashGame } = await import('../games/TapDashGame.js');
                    //     return TapDashGame;
                    // case 'balloon-pop-frenzy':
                    //     const { BalloonPopFrenzy } = await import('../games/BalloonPopFrenzy.js');
                    //     return BalloonPopFrenzy;
                    default:
                        throw new Error(`Unknown game: ${gameId}`);
                }
            } catch (error) {
                lastError = error;
                console.warn(`Game loading attempt ${attempt} failed for ${gameId}:`, error);
                if (error.name === 'ChunkLoadError' && attempt < retryCount) {
                    console.log(`Retrying in ${attempt * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                    continue;
                }
                if (attempt === retryCount) {
                    break;
                }
            }
        }
        throw new Error(`Failed to load game ${normalizedId} after ${retryCount} attempts: ${lastError.message}`);
    }

    isPreloaded(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        return this.preloadedGames.has(normalizedId);
    }

    getStatus() {
        return {
            preloaded: Array.from(this.preloadedGames.keys()),
            preloading: Array.from(this.preloadingGames),
            totalGames: this.allGames.length,
            preloadedCount: this.preloadedGames.size,
            isComplete: this.preloadedGames.size === this.allGames.length
        };
    }

    getDetailedStatus() {
        const status = this.getStatus();
        console.log('Game Preloader Status:', {
            'Preloaded Games': status.preloaded,
            'Currently Loading': status.preloading,
            'Progress': `${status.preloadedCount}/${status.totalGames}`,
            'Complete': status.isComplete
        });
        return status;
    }
}

export const gamePreloader = new GamePreloader();

if (typeof window !== 'undefined') {
    window.debugGamePreloader = () => gamePreloader.getDetailedStatus();
}

if (typeof window !== 'undefined') {
    setTimeout(() => {
        gamePreloader.preloadAllGames();
    }, 2000);
}
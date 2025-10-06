// Game preloader for faster loading times
// This is a replacement of the old gamePreloader using the new gameRegistry system
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
        if (typeof window !== 'undefined') {
            gameRegistry.batchRegister(this.allGames);
        }
    }

    async preloadAllGames() {
        console.log('Starting background preload of popular games...');
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
        const normalizedId = gameId.replace(/_/g, '-');
        try {
            const GameClass = await gameRegistry.getGameClass(normalizedId);
            this.preloadedGames.set(normalizedId, GameClass);
            return GameClass;
        } catch (error) {
            console.error(`Failed to get game class for ${normalizedId}:`, error);
            throw error;
        }
    }

    isPreloaded(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        return gameRegistry.isPreloaded(normalizedId);
    }

    getStatus() {
        const registryStatus = gameRegistry.getStatus();
        return {
            preloaded: registryStatus.preloaded,
            preloading: registryStatus.loading,
            totalGames: this.allGames.length,
            preloadedCount: registryStatus.preloadedCount,
            isComplete: registryStatus.preloadedCount === this.allGames.length
        };
    }

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

export const gamePreloader = new GamePreloader();

if (typeof window !== 'undefined') {
    window.debugGamePreloader = () => gamePreloader.getDetailedStatus();
}

if (typeof window !== 'undefined') {
    setTimeout(() => {
        gamePreloader.preloadAllGames();
    }, 2000);
}
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
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        
        // Use the registry system to get the game class
        try {
            const GameClass = await gameRegistry.getGameClass(normalizedId);
            // Update our local cache for backward compatibility
            this.preloadedGames.set(normalizedId, GameClass);
            return GameClass;
        } catch (error) {
            console.error(`Failed to get game class for ${normalizedId}:`, error);
            throw error;
        }
    }

    // Check if a game is preloaded
    isPreloaded(gameId) {
        // Normalize the gameId to handle both underscore and hyphen formats
        const normalizedId = gameId.replace(/_/g, '-');
        return gameRegistry.isPreloaded(normalizedId);
    }

    // Get preloading status
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
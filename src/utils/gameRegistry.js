/**
 * Game Registry System
 * 
 * This system dynamically handles game registration and loading without requiring
 * manual imports or hardcoding for each new game. It uses a combination of conventions
 * and dynamic imports to scale efficiently with hundreds of games.
 */

class GameRegistry {
    constructor() {
        // Maps game IDs to their metadata and import functions
        this.registry = new Map();
        this.popularGames = [];
        this.preloaded = new Set();
        this.loading = new Set();
    }

    /**
     * Register a game with the system
     * @param {string} id - The game ID (kebab-case)
     * @param {Object} metadata - Game metadata
     * @param {Function} importFn - Dynamic import function for the game
     */
    register(id, metadata, importFn) {
        this.registry.set(id, {
            id,
            metadata,
            importFn,
            loaded: null
        });
    }

    /**
     * Automatically register games based on naming convention
     * @param {string[]} gameIds - List of game IDs to register
     * @returns {Promise} - Promise resolving when registration is complete
     */
    async batchRegister(gameIds) {
        gameIds.forEach(gameId => {
            // Normalize ID to kebab-case
            const normalizedId = gameId.replace(/_/g, '-');
            
            // Special case for 'dodge-game' - we know it should map to DodgeGame
            if (normalizedId === 'dodge-game') {
                const importFn = () => import(
                    /* webpackChunkName: "game-dodge" */
                    '../games/DodgeGame.js'
                ).then(module => module.DodgeGame || Object.values(module)[0]);
                
                this.register(normalizedId, { name: normalizedId }, importFn);
                return;
            }
            
            // Convert kebab-case to PascalCase for class name
            const pascalCaseName = normalizedId
                .split('-')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
                
            // Add 'Game' suffix only if not already ending with 'Game'
            const className = pascalCaseName.endsWith('Game') ? pascalCaseName : pascalCaseName + 'Game';
            
            // Create dynamic import function
            const importFn = () => import(
                /* webpackChunkName: "game-[request]" */
                `../games/${className}.js`
            ).then(module => module[className] || Object.values(module)[0]);
            
            // Register the game
            this.register(normalizedId, { name: normalizedId }, importFn);
        });
    }

    /**
     * Set the list of popular games for priority preloading
     * @param {string[]} gameIds - IDs of popular games
     * @param {number} limit - Maximum number to preload
     */
    setPopularGames(gameIds, limit = 5) {
        this.popularGames = gameIds.slice(0, limit);
    }

    /**
     * Start preloading the most popular games
     * @param {Function} progressCallback - Optional callback for preloading progress
     */
    preloadPopularGames(progressCallback) {
        console.log(`Starting background preload of ${this.popularGames.length} popular games...`);
        
        // Preload games in parallel with slight delay between starts
        this.popularGames.forEach((gameId, index) => {
            setTimeout(() => {
                this.preloadGame(gameId).then(() => {
                    if (progressCallback) {
                        progressCallback(index + 1, this.popularGames.length);
                    }
                }).catch(err => {
                    console.warn(`Failed to preload game ${gameId}:`, err);
                });
            }, index * 300);
        });
    }

    /**
     * Preload a specific game
     * @param {string} gameId - The game ID to preload
     * @returns {Promise} - Promise resolving to the game class
     */
    async preloadGame(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        
        // If already loaded or loading, return existing promise
        if (this.preloaded.has(normalizedId)) {
            const entry = this.registry.get(normalizedId);
            return entry.loaded;
        }
        
        if (this.loading.has(normalizedId)) {
            // Wait for the ongoing loading process
            return new Promise((resolve, reject) => {
                const checkLoaded = () => {
                    if (this.preloaded.has(normalizedId)) {
                        const entry = this.registry.get(normalizedId);
                        resolve(entry.loaded);
                    } else if (!this.loading.has(normalizedId)) {
                        reject(new Error(`Loading failed for ${normalizedId}`));
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                checkLoaded();
            });
        }
        
        // Start loading
        this.loading.add(normalizedId);
        
        try {
            const entry = this.registry.get(normalizedId);
            if (!entry) {
                throw new Error(`Game ${normalizedId} not registered`);
            }
            
            // Load the game with retry logic
            entry.loaded = await this.loadGameWithRetry(entry.importFn);
            this.preloaded.add(normalizedId);
            return entry.loaded;
        } finally {
            this.loading.delete(normalizedId);
        }
    }

    /**
     * Load a game with retry logic
     * @param {Function} importFn - The import function
     * @param {number} retryCount - Number of retries
     * @returns {Promise} - Promise resolving to the game class
     */
    async loadGameWithRetry(importFn, retryCount = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                return await importFn();
            } catch (error) {
                lastError = error;
                console.warn(`Game loading attempt ${attempt} failed:`, error);
                
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
        
        throw lastError || new Error('Failed to load game');
    }

    /**
     * Get a game class (either preloaded or load on demand)
     * @param {string} gameId - The game ID
     * @returns {Promise} - Promise resolving to the game class
     */
    async getGameClass(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        const startTime = performance.now();
        
        // Check if already preloaded
        if (this.preloaded.has(normalizedId)) {
            const entry = this.registry.get(normalizedId);
            const loadTime = performance.now() - startTime;
            console.log(`✓ Game loaded from cache: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
            return entry.loaded;
        }
        
        // Load on demand
        console.log(`⚠️ Loading game on demand: ${normalizedId} (preloading may not be complete)`);
        const gameClass = await this.preloadGame(normalizedId);
        const loadTime = performance.now() - startTime;
        console.log(`⏱️ On-demand load completed: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
        return gameClass;
    }

    /**
     * Check if a game is registered
     * @param {string} gameId - The game ID
     * @returns {boolean} - True if game is registered
     */
    isRegistered(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        return this.registry.has(normalizedId);
    }

    /**
     * Check if a game is preloaded
     * @param {string} gameId - The game ID
     * @returns {boolean} - True if game is preloaded
     */
    isPreloaded(gameId) {
        const normalizedId = gameId.replace(/_/g, '-');
        return this.preloaded.has(normalizedId);
    }

    /**
     * Get status of game loading
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            registered: Array.from(this.registry.keys()),
            preloaded: Array.from(this.preloaded),
            loading: Array.from(this.loading),
            popularGames: this.popularGames,
            registeredCount: this.registry.size,
            preloadedCount: this.preloaded.size
        };
    }
}

// Create and export singleton instance
export const gameRegistry = new GameRegistry();

// Add global debug helper
if (typeof window !== 'undefined') {
    window.debugGameRegistry = () => {
        const status = gameRegistry.getStatus();
        console.log('🎮 Game Registry Status:', {
            'Registered Games': status.registeredCount,
            'Preloaded Games': status.preloaded,
            'Currently Loading': status.loading,
            'Progress': `${status.preloadedCount}/${status.registeredCount}`,
        });
        return status;
    };
}

// Initialize with all current games - this should be updated from API in production
if (typeof window !== 'undefined') {
    // Delay initialization to not interfere with initial app load
    setTimeout(() => {
        const initialGames = [
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
            // New games can be added here or loaded from API
        ];
        
        gameRegistry.batchRegister(initialGames).then(() => {
            // Set popular games based on play count or other metrics
            gameRegistry.setPopularGames(['quick-tap', 'fruit-slice', 'ball-bounce']);
            
            // Start preloading the most popular games
            gameRegistry.preloadPopularGames((loaded, total) => {
                // Show preloading progress
                if (typeof window !== 'undefined') {
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
                    
                    // Hide after completion
                    if (loaded >= total) {
                        setTimeout(() => {
                            indicator.style.display = 'none';
                        }, 2000);
                    }
                }
            });
        });
    }, 2000);
}
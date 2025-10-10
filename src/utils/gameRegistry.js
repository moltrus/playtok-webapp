/**
 * Game Registry System
 * 
 * This system dynamically handles game registration and loading without requiring
 * manual imports or hardcoding for each new game. It uses a combination of conventions
 * and dynamic imports to scale efficiently with hundreds of games.
 */

class GameRegistry {
    constructor() {
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
            const normalizedId = gameId.replace(/_/g, '-');
            
            if (normalizedId === 'dodge-game') {
                const importFn = () => import(
                    '../games/DodgeGame.js'
                ).then(module => module.DodgeGame || Object.values(module)[0]);
                
                this.register(normalizedId, { name: normalizedId }, importFn);
                return;
            }
            
            const pascalCaseName = normalizedId
                .split('-')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join('');
                
            const className = pascalCaseName.endsWith('Game') ? pascalCaseName : pascalCaseName + 'Game';
            
            const importFn = () => import(
                `../games/${className}.js`
            ).then(module => module[className] || Object.values(module)[0]);
            
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
        
        if (this.preloaded.has(normalizedId)) {
            const entry = this.registry.get(normalizedId);
            return entry.loaded;
        }
        
        if (this.loading.has(normalizedId)) {
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
        
        this.loading.add(normalizedId);
        
        try {
            const entry = this.registry.get(normalizedId);
            if (!entry) {
                throw new Error(`Game ${normalizedId} not registered`);
            }
            
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
        
        if (this.preloaded.has(normalizedId)) {
            const entry = this.registry.get(normalizedId);
            const loadTime = performance.now() - startTime;
            console.log(`Game loaded from cache: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
            return entry.loaded;
        }
        
        console.log(`Loading game on demand: ${normalizedId} (preloading may not be complete)`);
        const gameClass = await this.preloadGame(normalizedId);
        const loadTime = performance.now() - startTime;
        console.log(`On-demand load completed: ${normalizedId} (${loadTime.toFixed(2)}ms)`);
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

export const gameRegistry = new GameRegistry();

if (typeof window !== 'undefined') {
    window.debugGameRegistry = () => {
        const status = gameRegistry.getStatus();
        console.log('Game Registry Status:', {
            'Registered Games': status.registeredCount,
            'Preloaded Games': status.preloaded,
            'Currently Loading': status.loading,
            'Progress': `${status.preloadedCount}/${status.registeredCount}`,
        });
        return status;
    };
}

if (typeof window !== 'undefined') {
    setTimeout(() => {
        const initialGames = [
            'ball-bounce',
            'quick-tap', 
            'fruit-slice',
            'memory-flip',
            'stack-tower',
            'dodge-game',
            'maze-escape',
            // '',
            'quiz-blitz',
            'color-match-tap',
            'sky-drop',
            'shape-builder',
            // 'tap-dash',
            // 'balloon-pop-frenzy',
        ];
        
        gameRegistry.batchRegister(initialGames).then(() => {
            gameRegistry.setPopularGames(['quick-tap', 'fruit-slice', 'ball-bounce']);
            
            gameRegistry.preloadPopularGames((loaded, total) => {
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
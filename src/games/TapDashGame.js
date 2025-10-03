import { BaseGame } from './BaseGame.js';

export class TapDashGame extends BaseGame {
    static gameId = 'tap-dash'; // Add static gameId property
    
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);

        // Game properties
        this.gameTime = 60000; // 60 seconds in milliseconds
        this.timeRemaining = this.gameTime;
        this.minGemsOnTrack = 5; // Minimum number of gems that should be on the track
        
        this.player = {
            x: 0,
            y: 0,
            size: 20,
            direction: 'right', // 'right', 'left', 'up', 'down'
            speed: 5
        };

        this.gameState = {
            score: 0,
            turns: 0,
            gems: 0,
            timeElapsed: 0,
            lastSpeedIncrease: 0
        };

        // Track grid properties
        this.grid = {
            cellSize: 60,
            rows: 0,
            cols: 0,
            track: [], // Will store the track layout
            gems: []  // Will store gem positions
        };

        // Bind event handlers
        this.handleTap = this.handleTap.bind(this);
    }

    getInstructions() {
        return "Tap to change direction at corners. Collect gems and avoid walls!";
    }

    start() {
        // Validate canvas dimensions before starting
        if (!this.canvas || !this.ctx) {
            console.error('Canvas or context not available in start()');
            return;
        }
        
        // Update logical dimensions to ensure we have the latest canvas size
        this.updateLogicalDimensions();
        
        // Use the logical dimensions (not the physical canvas.width/height which may be DPR-scaled)
        const width = this.canvasWidth;
        const height = this.canvasHeight;
        
        if (width === 0 || height === 0) {
            console.error('Canvas has zero dimensions, cannot start game');
            return;
        }
        
        // Initialize timing
        this.lastTime = Date.now();
        this.timeRemaining = this.gameTime;
        
        // Initialize game state
        this.gameState = {
            score: 0,
            turns: 0,
            gems: 0,
            timeElapsed: 0,
            lastSpeedIncrease: 0
        };

        // Set up grid dimensions based on canvas size
        // Use logical canvas dimensions for the game area
        const minCellSize = Math.min(
            Math.floor(width / 12),  // At least 12 cells wide
            Math.floor(height / 16)  // At least 16 cells high
        );
        this.grid.cellSize = Math.max(40, minCellSize); // Ensure cells aren't too small
        this.grid.rows = Math.floor(height / this.grid.cellSize);
        this.grid.cols = Math.floor(width / this.grid.cellSize);
        
        console.log('Starting game with dimensions:', 
                    `Canvas: ${width}x${height}`,
                    `Grid: ${this.grid.cols}x${this.grid.rows}`,
                    `Cell size: ${this.grid.cellSize}`);
        
        // Validate grid dimensions
        if (this.grid.rows === 0 || this.grid.cols === 0) {
            console.error('Invalid grid dimensions calculated');
            return;
        }
                    
        // Generate the track (only once)
        this.generateTrack();

        // Calculate grid position to center it on the canvas
        this.gridWidth = this.grid.cols * this.grid.cellSize;
        this.offsetX = (width - this.gridWidth) / 2;
        
        // Place player at starting position with offset
        this.player.x = this.offsetX + (this.grid.cellSize / 2); // Center of first cell
        this.player.y = this.grid.cellSize / 2;
        this.player.direction = 'right';
        this.player.speed = 3; // Start with slower speed for better control

        // Add event listeners
        this.canvas.addEventListener('click', this.handleTap);
        this.canvas.addEventListener('touchstart', this.handleTap);
        
        // Call super.start() AFTER all our initialization is complete
        super.start();
    }

    stop() {
        super.stop();
        
        // Remove event listeners
        this.canvas.removeEventListener('click', this.handleTap);
        this.canvas.removeEventListener('touchstart', this.handleTap);
    }

    generateTrack() {
        console.log('Generating track...');
        console.log('Grid dimensions:', this.grid.rows, 'x', this.grid.cols);
        
        // Initialize empty track grid
        this.grid.track = Array(this.grid.rows).fill().map(() => 
            Array(this.grid.cols).fill(0)
        );

        // Start position will be in the first row, first column
        const startX = 0;
        const startY = 0;
        this.grid.track[startY][startX] = 1;

        // Generate a zigzag path from top to bottom
        let currentX = startX;
        let currentY = startY;
        let goingRight = true;

        while (currentY < this.grid.rows - 1) {
            // Move horizontally
            const endX = goingRight ? 
                Math.min(this.grid.cols - 1, currentX + Math.floor(this.grid.cols / 2)) :
                Math.max(0, currentX - Math.floor(this.grid.cols / 2));
            
            // Create horizontal path
            while (currentX !== endX) {
                if (goingRight) {
                    currentX++;
                } else {
                    currentX--;
                }
                this.grid.track[currentY][currentX] = 1;
            }

            // If we can move down, do so
            if (currentY < this.grid.rows - 1) {
                currentY++;
                this.grid.track[currentY][currentX] = 1;
            }

            // Toggle direction for next horizontal movement
            goingRight = !goingRight;
        }

        // Add some random branches to make it more interesting
        for (let i = 0; i < 3; i++) {
            const y = Math.floor(Math.random() * (this.grid.rows - 2)) + 1;
            const x = Math.floor(Math.random() * (this.grid.cols - 2)) + 1;
            
            if (this.grid.track[y][x] === 1) {
                // Add a small branch
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = directions[Math.floor(Math.random() * directions.length)];
                
                const newX = x + dir[0];
                const newY = y + dir[1];
                
                if (newX > 0 && newX < this.grid.cols - 1 &&
                    newY > 0 && newY < this.grid.rows - 1) {
                    this.grid.track[newY][newX] = 1;
                }
            }
        }

        // Place gems
        this.placeGems();
    }

    placeGems() {
        // Ensure offsetX is calculated
        if (this.offsetX === undefined) {
            this.gridWidth = this.grid.cols * this.grid.cellSize;
            this.offsetX = (this.canvasWidth - this.gridWidth) / 2;
        }
        
        // Initialize gems array if it doesn't exist
        if (!this.grid.gems) {
            this.grid.gems = [];
        }

        // Get all valid positions for gems (cells with path)
        const validPositions = [];
        for(let row = 0; row < this.grid.rows; row++) {
            for(let col = 0; col < this.grid.cols; col++) {
                if(this.grid.track[row][col] === 1) {
                    validPositions.push({row, col});
                }
            }
        }

        // Count only uncollected gems
        const uncollectedGems = this.grid.gems.filter(gem => !gem.collected).length;
        
        // Keep adding gems until we reach the minimum required
        while (uncollectedGems + this.grid.gems.length < this.minGemsOnTrack && validPositions.length > 0) {
            // Pick a random valid position
            const randomIndex = Math.floor(Math.random() * validPositions.length);
            const pos = validPositions[randomIndex];
            
            // Remove this position from valid positions
            validPositions.splice(randomIndex, 1);

            // Check if there's already a gem near this position
            const tooClose = this.grid.gems.some(gem => {
                const distance = Math.sqrt(
                    Math.pow((pos.col * this.grid.cellSize + this.grid.cellSize/2) - gem.x, 2) +
                    Math.pow((pos.row * this.grid.cellSize + this.grid.cellSize/2) - gem.y, 2)
                );
                return distance < this.grid.cellSize * 2; // Minimum distance between gems
            });

            // If not too close to other gems, add it
            if (!tooClose) {
                this.grid.gems.push({
                    x: pos.col * this.grid.cellSize + this.grid.cellSize/2,
                    y: pos.row * this.grid.cellSize + this.grid.cellSize/2,
                    scale: 1,
                    collected: false
                });
            }
        }
    }

    spawnNewGems() {
        // Clear out any fully collected/animated gems first
        this.grid.gems = this.grid.gems.filter(gem => !gem.collected || gem.scale > 0);
        
        // Only spawn new gems if we're below the minimum
        if (this.grid.gems.filter(gem => !gem.collected).length < this.minGemsOnTrack) {
            this.placeGems();
        }
    }

    handleTap(e) {
        e.preventDefault();
        if (!this.isRunning) return;

        // Adjust for the grid offset
        if (this.offsetX === undefined) {
            this.gridWidth = this.grid.cols * this.grid.cellSize;
            this.offsetX = (this.canvas.width - this.gridWidth) / 2;
        }
        
        // Calculate player's position in the grid coordinate system
        const playerGridX = this.player.x - this.offsetX;

        // Check if player is at a corner
        const cellX = Math.floor(playerGridX / this.grid.cellSize);
        const cellY = Math.floor(this.player.y / this.grid.cellSize);
        
        // Determine available directions at current position
        const canGoUp = cellY > 0 && this.grid.track[cellY-1][cellX] === 1;
        const canGoDown = cellY < this.grid.rows-1 && this.grid.track[cellY+1][cellX] === 1;
        const canGoLeft = cellX > 0 && this.grid.track[cellY][cellX-1] === 1;
        const canGoRight = cellX < this.grid.cols-1 && this.grid.track[cellY][cellX+1] === 1;

        // Change direction based on current direction and available paths
        switch(this.player.direction) {
            case 'right':
                if(canGoUp) this.player.direction = 'up';
                else if(canGoDown) this.player.direction = 'down';
                break;
            case 'left':
                if(canGoUp) this.player.direction = 'up';
                else if(canGoDown) this.player.direction = 'down';
                break;
            case 'up':
                if(canGoLeft) this.player.direction = 'left';
                else if(canGoRight) this.player.direction = 'right';
                break;
            case 'down':
                if(canGoLeft) this.player.direction = 'left';
                else if(canGoRight) this.player.direction = 'right';
                break;
        }

        this.gameState.turns++;
        this.gameState.score++;
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Ensure offsetX is calculated
        if (this.offsetX === undefined) {
            this.gridWidth = this.grid.cols * this.grid.cellSize;
            this.offsetX = (this.canvasWidth - this.gridWidth) / 2;
        }
        
        console.log('Game Update - Position:', 
            `x: ${this.player.x.toFixed(2)}, y: ${this.player.y.toFixed(2)}`,
            'Cell:', 
            `cellX: ${Math.floor((this.player.x - this.offsetX) / this.grid.cellSize)}, cellY: ${Math.floor(this.player.y / this.grid.cellSize)}`);

        // Update timers
        this.timeRemaining -= deltaTime;
        this.gameState.timeElapsed += deltaTime;

        // Check if game should end due to time
        if (this.timeRemaining <= 0) {
            console.log('Game ended: Time up!');
            this.stop();
            return;
        }

        // Check for speed increase every 7 seconds
        if (this.gameState.timeElapsed - this.gameState.lastSpeedIncrease >= 7000) {
            this.player.speed *= 1.2;
            this.gameState.lastSpeedIncrease = this.gameState.timeElapsed;
            console.log('Speed increased to:', this.player.speed);
        }

        // Move player
        switch(this.player.direction) {
            case 'right':
                this.player.x += this.player.speed;
                break;
            case 'left':
                this.player.x -= this.player.speed;
                break;
            case 'up':
                this.player.y -= this.player.speed;
                break;
            case 'down':
                this.player.y += this.player.speed;
                break;
        }

        // Check wall collisions with more forgiving boundaries
        const playerCenterX = this.player.x;
        const playerCenterY = this.player.y;
        
        // Get the cell coordinates for the player's center
        // Adjust for the grid offset
        const playerGridX = playerCenterX - (this.offsetX || 0);
        const cellX = Math.floor(playerGridX / this.grid.cellSize);
        const cellY = Math.floor(playerCenterY / this.grid.cellSize);
        
        // Check if we're within valid bounds and on a valid path
        const isOutOfBounds = cellX < 0 || cellX >= this.grid.cols || 
                             cellY < 0 || cellY >= this.grid.rows;
        
        // Only check grid cell if we're within bounds
        const isOnWall = !isOutOfBounds && this.grid.track[cellY][cellX] === 0;
        
        if (isOutOfBounds || isOnWall) {
            // Add small tolerance for near-misses
            const tolerance = this.grid.cellSize * 0.2; // 20% of cell size
            
            // Check adjacent cells for valid paths before ending game
            const adjacentCells = [
                { x: cellX - 1, y: cellY },
                { x: cellX + 1, y: cellY },
                { x: cellX, y: cellY - 1 },
                { x: cellX, y: cellY + 1 }
            ];
            
            let hasValidPath = false;
            for (const cell of adjacentCells) {
                if (cell.x >= 0 && cell.x < this.grid.cols &&
                    cell.y >= 0 && cell.y < this.grid.rows &&
                    this.grid.track[cell.y][cell.x] === 1) {
                    
                    const cellCenterX = cell.x * this.grid.cellSize + this.grid.cellSize / 2;
                    const cellCenterY = cell.y * this.grid.cellSize + this.grid.cellSize / 2;
                    
                    const distToCell = Math.sqrt(
                        Math.pow(playerCenterX - cellCenterX, 2) +
                        Math.pow(playerCenterY - cellCenterY, 2)
                    );
                    
                    if (distToCell < tolerance) {
                        hasValidPath = true;
                        break;
                    }
                }
            }
            
            if (!hasValidPath) {
                this.stop();
                return;
            }
        }

        // Check gem collection
        let gemCollected = false;
        this.grid.gems = this.grid.gems.filter(gem => {
            if (gem.collected) {
                gem.scale -= deltaTime * 0.005; // Shrink animation
                if (gem.scale <= 0) return false;
                return true;
            }

            // No need to adjust player X, as the player is already drawn with the offset
            // But we do need to add the offset to the gem's x position
            const gemDisplayX = this.offsetX + gem.x;
            
            const distance = Math.sqrt(
                Math.pow(this.player.x - gemDisplayX, 2) + 
                Math.pow(this.player.y - gem.y, 2)
            );
            
            if (distance < this.player.size + 10) {
                this.gameState.gems++;
                this.gameState.score += 3;
                gem.collected = true;
                gemCollected = true;
                return true; // Keep the gem for animation
            }
            return true;
        });

        // Spawn new gems if needed
        if (gemCollected || this.grid.gems.length < this.minGemsOnTrack) {
            this.spawnNewGems();
        }

        // Update score
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.gameState.score);
        }
    }

    draw() {
        if (!this.ctx) return;

        // Get logical canvas dimensions
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw background
        this.ctx.fillStyle = '#111111';
        this.ctx.fillRect(0, 0, width, height);

        // Calculate grid position to center it on the canvas
        this.gridWidth = this.grid.cols * this.grid.cellSize;
        this.offsetX = (width - this.gridWidth) / 2;
        
        // Draw track
        for(let row = 0; row < this.grid.rows; row++) {
            for(let col = 0; col < this.grid.cols; col++) {
                const x = this.offsetX + col * this.grid.cellSize;
                const y = row * this.grid.cellSize;
                
                // Draw cell border for debugging
                this.ctx.strokeStyle = '#222222';
                this.ctx.strokeRect(x, y, this.grid.cellSize, this.grid.cellSize);
                
                if(this.grid.track[row][col] === 1) {
                    // Draw path
                    this.ctx.fillStyle = '#333333';
                    this.ctx.fillRect(x, y, this.grid.cellSize, this.grid.cellSize);
                    
                    // Add subtle gradient for depth
                    const gradient = this.ctx.createLinearGradient(x, y, x, y + this.grid.cellSize);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
                    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
                    this.ctx.fillStyle = gradient;
                    this.ctx.fillRect(x, y, this.grid.cellSize, this.grid.cellSize);
                }
            }
        }

        // Draw gems with glow effect
        for(const gem of this.grid.gems) {
            const baseSize = 8;
            const currentSize = baseSize * (gem.scale || 1);
            
            // Apply offset to gem positions
            const displayX = this.offsetX + gem.x;
            
            // Draw glow
            const gradient = this.ctx.createRadialGradient(
                displayX, gem.y, 0,
                displayX, gem.y, currentSize * 2
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(displayX, gem.y, currentSize * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw gem
            this.ctx.fillStyle = gem.collected ? 'rgba(255, 215, 0, 0.5)' : '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(displayX, gem.y, currentSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw player
        this.ctx.fillStyle = '#00FF00';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.size/2, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw score and stats with enhanced visibility
        const padding = 10;
        const fontSize = 20;
        this.ctx.font = `${fontSize}px Arial`;
        
        // Draw time remaining
        const timeLeft = Math.ceil(this.timeRemaining / 1000);
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = timeLeft <= 10 ? '#FF4444' : '#FFFFFF';
        this.ctx.fillText(`Time: ${timeLeft}s`, width - padding, fontSize + padding);
        
        // Draw score and stats
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`Score: ${this.gameState.score}`, padding, fontSize + padding);
        this.ctx.fillText(`Gems: ${this.gameState.gems}`, padding, fontSize * 2 + padding);
        
        // Draw bonus multiplier if on a streak
        if (this.gameState.gems > 0) {
            const multiplierText = `×${Math.min(5, Math.floor(this.gameState.gems / 5) + 1)}`;
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(multiplierText, padding + 80, fontSize * 2 + padding);
        }
    }
}
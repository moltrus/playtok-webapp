import { BaseGame } from './BaseGame.js';

export class MazeEscapeGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            this.gridSize = 7; // Slightly larger maze for more challenge
            this.cellSize = Math.min((canvasWidth - 40) / this.gridSize, (canvasHeight - 120) / this.gridSize);
            this.maze = [];
            this.player = { x: 0, y: 0 };
            this.exit = { x: this.gridSize - 1, y: this.gridSize - 1 };
            this.gameTime = 40000; // 40 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.startX = (canvasWidth - this.gridSize * this.cellSize) / 2;
            this.startY = (canvasHeight - this.gridSize * this.cellSize) / 2;
            
            this.touchStart = null;
            this.mouseStart = null;
            
            // Generate the maze
            this.generateMaze();
            
            console.log('MazeEscapeGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing MazeEscapeGame:', error);
            // Set minimal defaults to prevent further errors
            this.gridSize = 7;
            this.cellSize = 30;
            this.maze = [];
            this.player = { x: 0, y: 0 };
            this.exit = { x: this.gridSize - 1, y: this.gridSize - 1 };
            this.gameTime = 40000;
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.startX = 40;
            this.startY = 120;
            this.touchStart = null;
            this.mouseStart = null;
            
            // Generate a simple maze as fallback
            this.generateSimpleMaze();
        }
    }

    getInstructions() {
        return "😊 Swipe to guide the smiley through the maze to the exit! 🚪";
    }

    start() {
        try {
            console.log('Starting MazeEscapeGame');
            
            // Generate maze
            this.generateMaze();
            
            // Reset game state
            this.player = { x: 0, y: 0 };
            this.timeRemaining = this.gameTime;
            this.score = 0;
            this.updateScore(0);
            
            // Initialize last time for delta time calculation
            this.lastTime = Date.now();
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in MazeEscapeGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
        }
    }

    generateMaze() {
        try {
            // Initialize maze with all walls
            this.maze = [];
            for (let y = 0; y < this.gridSize; y++) {
                this.maze[y] = [];
                for (let x = 0; x < this.gridSize; x++) {
                    this.maze[y][x] = 1; // All walls initially
                }
            }
            
            // Generate guaranteed solvable maze using recursive backtracking
            this.carvePath(0, 0);
            
            // Ensure start and exit are clear
            this.maze[0][0] = 0; // Start
            this.maze[this.gridSize - 1][this.gridSize - 1] = 0; // Exit
            
            // Ensure there's always a path from start to exit
            this.ensureSolvablePath();
        } catch (error) {
            console.error('Error in generateMaze:', error);
            // Create a very simple maze as fallback
            this.generateSimpleMaze();
        }
    }
    
    generateSimpleMaze() {
        // Create a very simple maze as fallback
        this.maze = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                // Create a simple path from start to exit
                this.maze[y][x] = (x % 2 === 0 || y % 2 === 0) ? 0 : 1;
            }
        }
        // Ensure start and exit are clear
        this.maze[0][0] = 0;
        this.maze[this.gridSize - 1][this.gridSize - 1] = 0;
    }
    
    carvePath(x, y) {
        try {
            this.maze[y][x] = 0; // Make current cell a path
            
            // Define directions: right, down, left, up
            const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
            
            // Randomize directions
            for (let i = directions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [directions[i], directions[j]] = [directions[j], directions[i]];
            }
            
            for (const [dx, dy] of directions) {
                const newX = x + dx * 2; // Move 2 cells to leave walls between paths
                const newY = y + dy * 2;
                
                // Check if the new position is valid and unvisited
                if (newX >= 0 && newX < this.gridSize && 
                    newY >= 0 && newY < this.gridSize && 
                    this.maze[newY][newX] === 1) {
                    
                    // Carve path to the new cell
                    this.maze[y + dy][x + dx] = 0; // Remove wall between cells
                    this.carvePath(newX, newY);
                }
            }
        } catch (error) {
            console.error('Error in carvePath:', error);
        }
    }
    
    ensureSolvablePath() {
        try {
            // Use A* pathfinding to ensure path exists, if not create one
            if (!this.hasPath(0, 0, this.gridSize - 1, this.gridSize - 1)) {
                // Force create a simple path from start to exit
                let x = 0, y = 0;
                while (x < this.gridSize - 1 || y < this.gridSize - 1) {
                    this.maze[y][x] = 0;
                    if (x < this.gridSize - 1) x++;
                    else if (y < this.gridSize - 1) y++;
                }
                this.maze[this.gridSize - 1][this.gridSize - 1] = 0;
            }
        } catch (error) {
            console.error('Error in ensureSolvablePath:', error);
            // Create a direct path from start to exit
            for (let i = 0; i < this.gridSize; i++) {
                this.maze[0][i] = 0; // Clear top row
                this.maze[i][this.gridSize - 1] = 0; // Clear rightmost column
            }
        }
    }
    
    hasPath(startX, startY, endX, endY) {
        try {
            const visited = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));
            const queue = [[startX, startY]];
            visited[startY][startX] = true;
            
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
            
            while (queue.length > 0) {
                const [x, y] = queue.shift();
                
                if (x === endX && y === endY) {
                    return true;
                }
                
                for (const [dx, dy] of directions) {
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (newX >= 0 && newX < this.gridSize && 
                        newY >= 0 && newY < this.gridSize && 
                        !visited[newY][newX] && this.maze[newY][newX] === 0) {
                        
                        visited[newY][newX] = true;
                        queue.push([newX, newY]);
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error in hasPath:', error);
            return false;
        }
    }

    update() {
        try {
            if (!this.isRunning) return;

            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            this.timeRemaining -= deltaTime;
            
            if (this.timeRemaining <= 0) {
                this.stop();
                return;
            }

            // Check if player reached the exit
            if (this.player.x === this.exit.x && this.player.y === this.exit.y) {
                const timeElapsed = this.gameTime - this.timeRemaining;
                this.score = Math.max(100, Math.floor(2000 - timeElapsed / 10));
                this.updateScore(this.score);
                this.stop();
            }
        } catch (error) {
            console.error('Error in MazeEscapeGame.update():', error);
        }
    }

    canMoveTo(x, y) {
        try {
            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
                return false;
            }
            return this.maze[y][x] === 0;
        } catch (error) {
            console.error('Error in canMoveTo:', error);
            return false;
        }
    }

    movePlayer(dx, dy) {
        try {
            const newX = this.player.x + dx;
            const newY = this.player.y + dy;
            
            if (this.canMoveTo(newX, newY)) {
                this.player.x = newX;
                this.player.y = newY;
            }
        } catch (error) {
            console.error('Error in movePlayer:', error);
        }
    }

    draw() {
        try {
            const ctx = this.ctx;
            if (!ctx) return;
            
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Background
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw maze
            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const drawX = this.startX + x * this.cellSize;
                    const drawY = this.startY + y * this.cellSize;
                    
                    if (this.maze[y][x] === 1) {
                        // Wall
                        ctx.fillStyle = '#2C3E50';
                        ctx.fillRect(drawX, drawY, this.cellSize, this.cellSize);
                    } else {
                        // Path
                        ctx.fillStyle = '#ECF0F1';
                        ctx.fillRect(drawX, drawY, this.cellSize, this.cellSize);
                    }
                    
                    // Grid lines
                    ctx.strokeStyle = '#BDC3C7';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(drawX, drawY, this.cellSize, this.cellSize);
                }
            }
            
            // Draw exit
            const exitX = this.startX + this.exit.x * this.cellSize;
            const exitY = this.startY + this.exit.y * this.cellSize;
            ctx.fillStyle = '#2ECC71';
            ctx.fillRect(exitX + 5, exitY + 5, this.cellSize - 10, this.cellSize - 10);
            
            // Draw EXIT text
            this.drawText('EXIT', exitX + this.cellSize / 2, exitY + this.cellSize / 2 + 5, 12, 'white');
            
            // Draw smiley player
            const playerX = this.startX + this.player.x * this.cellSize;
            const playerY = this.startY + this.player.y * this.cellSize;
            const centerX = playerX + this.cellSize / 2;
            const centerY = playerY + this.cellSize / 2;
            const radius = this.cellSize / 3;
            
            this.drawSmiley(centerX, centerY, radius);
            
            // UI - Draw time remaining
            this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, this.canvasWidth / 2, 40, 20, 'white');
            
            // Draw instruction text
            this.drawText('Swipe to move', this.canvasWidth / 2, this.canvasHeight - 30, 16, 'white');
        } catch (error) {
            console.error('Error in draw:', error);
        }
    }

    getTouchStart(e) {
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } catch (error) {
            console.error('Error in getTouchStart:', error);
            return { x: 0, y: 0 };
        }
    }

    getTouchEnd(e) {
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.changedTouches[0].clientX - rect.left,
                y: e.changedTouches[0].clientY - rect.top
            };
        } catch (error) {
            console.error('Error in getTouchEnd:', error);
            return { x: 0, y: 0 };
        }
    }

    handleTouchStart(e) {
        try {
            super.handleTouchStart(e);
            this.touchStart = this.getTouchStart(e);
        } catch (error) {
            console.error('Error in handleTouchStart:', error);
        }
    }

    handleTouchEnd(e) {
        try {
            super.handleTouchEnd(e);
            if (this.touchStart) {
                const touchEnd = this.getTouchEnd(e);
                const dx = touchEnd.x - this.touchStart.x;
                const dy = touchEnd.y - this.touchStart.y;
                const threshold = 30;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    if (Math.abs(dx) > threshold) {
                        this.movePlayer(dx > 0 ? 1 : -1, 0);
                    }
                } else {
                    // Vertical swipe
                    if (Math.abs(dy) > threshold) {
                        this.movePlayer(0, dy > 0 ? 1 : -1);
                    }
                }
                
                this.touchStart = null;
            }
        } catch (error) {
            console.error('Error in handleTouchEnd:', error);
        }
    }

    handleMouseDown(e) {
        try {
            super.handleMouseDown(e);
            const rect = this.canvas.getBoundingClientRect();
            this.mouseStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        } catch (error) {
            console.error('Error in handleMouseDown:', error);
        }
    }

    handleMouseUp(e) {
        try {
            super.handleMouseUp(e);
            if (this.mouseStart) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseEnd = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                const dx = mouseEnd.x - this.mouseStart.x;
                const dy = mouseEnd.y - this.mouseStart.y;
                const threshold = 30;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    if (Math.abs(dx) > threshold) {
                        this.movePlayer(dx > 0 ? 1 : -1, 0);
                    }
                } else {
                    // Vertical swipe
                    if (Math.abs(dy) > threshold) {
                        this.movePlayer(0, dy > 0 ? 1 : -1);
                    }
                }
                
                this.mouseStart = null;
            }
        } catch (error) {
            console.error('Error in handleMouseUp:', error);
        }
    }

    drawSmiley(x, y, radius) {
        try {
            const ctx = this.ctx;
            if (!ctx) return;
            
            // Face (yellow circle)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // Face outline
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.15, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x + radius * 0.3, y - radius * 0.2, radius * 0.15, 0, 2 * Math.PI);
            ctx.fill();
            
            // Smile
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y + radius * 0.1, radius * 0.5, 0, Math.PI);
            ctx.stroke();
            
            // Cheeks (optional rosy effect)
            ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
            ctx.beginPath();
            ctx.arc(x - radius * 0.6, y + radius * 0.1, radius * 0.2, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x + radius * 0.6, y + radius * 0.1, radius * 0.2, 0, 2 * Math.PI);
            ctx.fill();
        } catch (error) {
            console.error('Error in drawSmiley:', error);
        }
    }
    
    // Helper method to draw text
    drawText(text, x, y, size, color, align = 'center') {
        try {
            if (!this.ctx) return;
            
            this.ctx.fillStyle = color || 'white';
            this.ctx.font = `${size || 16}px Arial`;
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y);
        } catch (error) {
            console.error('Error in drawText:', error);
        }
    }
    
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Update dependent values if needed
            if (this.canvasWidth && this.canvasHeight) {
                this.cellSize = Math.min((this.canvasWidth - 40) / this.gridSize, (this.canvasHeight - 120) / this.gridSize);
                this.startX = (this.canvasWidth - this.gridSize * this.cellSize) / 2;
                this.startY = (this.canvasHeight - this.gridSize * this.cellSize) / 2;
            }
        } catch (error) {
            console.error('Error in MazeEscapeGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
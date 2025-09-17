import { BaseGame } from './BaseGame.js';

export class StackTowerGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Base configuration
            this.blocks = [];
            this.currentBlock = null;
            this.blockWidth = Math.min(120, canvasWidth / 3); // Adaptive width
            this.blockHeight = 40;
            this.baseY = canvasHeight - 80;
            this.speed = 2;
            this.direction = 1;
            this.perfectBonus = 0;
            this.gameOver = false;
            this.lastDropTime = 0;
            
            // Add base block
            const baseBlock = {
                x: (canvasWidth / 2) - (this.blockWidth / 2),
                y: this.baseY,
                width: this.blockWidth,
                height: this.blockHeight,
                color: '#4ECDC4'
            };
            
            // Validate base block position
            baseBlock.x = Math.max(0, Math.min(baseBlock.x, canvasWidth - this.blockWidth));
            this.blocks.push(baseBlock);
            
            // Wait briefly before spawning the first block to ensure all dimensions are set
            setTimeout(() => {
                if (this.isRunning) {
                    this.spawnNextBlock();
                }
            }, 100);
            
            console.log('StackTowerGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing StackTowerGame:', error);
            // Set minimal defaults to prevent further errors
            this.blocks = [];
            this.currentBlock = null;
            this.blockWidth = 100;
            this.blockHeight = 30;
            this.baseY = 400;
            this.speed = 2;
            this.direction = 1;
            this.perfectBonus = 0;
            this.gameOver = false;
            this.lastDropTime = 0;
            
            // Add default base block with safe values
            this.blocks.push({
                x: 110,
                y: 400,
                width: 100,
                height: 30,
                color: '#4ECDC4'
            });
        }
    }

    getInstructions() {
        return "Tap to drop blocks and stack them perfectly!";
    }

    start() {
        console.log('Starting StackTowerGame');
        
        try {
            // Always reset game state when starting
            this.blocks = [];
            
            // Get safe canvas dimensions
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Reset game parameters
            this.blockWidth = Math.min(120, canvasWidth / 3);
            this.perfectBonus = 0;
            this.gameOver = false;
            this.score = 0;
            this.updateScore(0);
            this.lastDropTime = 0;
            
            // Add base block
            const baseBlock = {
                x: (canvasWidth / 2) - (this.blockWidth / 2),
                y: this.baseY,
                width: this.blockWidth,
                height: this.blockHeight,
                color: '#4ECDC4'
            };
            
            // Validate base block position
            baseBlock.x = Math.max(0, Math.min(baseBlock.x, canvasWidth - this.blockWidth));
            this.blocks.push(baseBlock);
            
            // Call the parent start method which runs the game loop
            super.start();
            
            // Wait briefly before spawning first block to ensure everything is set up
            setTimeout(() => {
                if (this.isRunning) {
                    this.spawnNextBlock();
                }
            }, 100);
        } catch (error) {
            console.error('Error in StackTowerGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
        }
    }

    spawnNextBlock() {
        try {
            if (this.gameOver) return;
            
            const canvasWidth = this.canvasWidth || 320;
            
            // Enforce minimum block width to keep game playable
            this.blockWidth = Math.max(30, this.blockWidth);
            
            // Calculate a safe starting position away from edges
            const safeMargin = Math.min(50, canvasWidth / 6); // Adaptive margin
            const startX = Math.max(
                safeMargin, 
                Math.min(
                    canvasWidth - this.blockWidth - safeMargin,
                    canvasWidth / 2 - this.blockWidth / 2 + (Math.random() * 40 - 20) // Center with some randomness
                )
            );
            
            this.currentBlock = {
                x: startX,
                y: this.baseY - (this.blocks.length * this.blockHeight),
                width: this.blockWidth,
                height: this.blockHeight,
                color: this.getRandomColor(),
                moving: true
            };
            
            // Direction with bias toward center
            const isBeyondCenter = startX > (canvasWidth / 2 - this.blockWidth / 2);
            this.direction = isBeyondCenter ? -1 : 1; // Move toward center initially
            
            // Adjust speed based on height but keep it reasonable
            const blockCount = this.blocks.length;
            // Start slower, gradually increase, but cap
            this.speed = Math.min(3.5, 1.5 + (blockCount / 5));
            
            // Validate block properties 
            if (isNaN(this.currentBlock.x) || isNaN(this.currentBlock.width)) {
                throw new Error('Invalid block properties');
            }
        } catch (error) {
            console.error('Error in spawnNextBlock:', error);
            // Create a safe default block if something fails
            const safeCanvasWidth = this.canvasWidth || 320; // Define canvas width for catch block
            this.blockWidth = Math.max(30, Math.min(120, this.blockWidth));
            this.currentBlock = {
                x: Math.floor((safeCanvasWidth - this.blockWidth) / 2),
                y: this.baseY - (this.blocks.length * this.blockHeight),
                width: this.blockWidth,
                height: this.blockHeight,
                color: '#4ECDC4',
                moving: true
            };
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.speed = 2;
        }
    }

    getRandomColor() {
        try {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
            return colors[Math.floor(Math.random() * colors.length)];
        } catch (error) {
            console.error('Error in getRandomColor:', error);
            return '#4ECDC4'; // Default color
        }
    }

    update(deltaTime) {
        try {
            if (!this.isRunning || this.gameOver) return;
            
            const canvasWidth = this.canvasWidth || 320;
            
            if (this.currentBlock && this.currentBlock.moving) {
                // Calculate the next position
                const nextX = this.currentBlock.x + this.speed * this.direction * (deltaTime / 16);
                
                // Boundary checks - add some buffer to prevent edge sticking
                const leftBound = 2; // Small buffer from left edge
                const rightBound = canvasWidth - this.currentBlock.width - 2; // Small buffer from right edge
                
                if (nextX <= leftBound) {
                    // Push block away from left edge and reverse direction
                    this.currentBlock.x = leftBound + 1;
                    this.direction = 1; // Force direction to right
                } else if (nextX >= rightBound) {
                    // Push block away from right edge and reverse direction
                    this.currentBlock.x = rightBound - 1;
                    this.direction = -1; // Force direction to left
                } else {
                    // Safe to move normally
                    this.currentBlock.x = nextX;
                }
                
                // Safety check to ensure block is never outside bounds
                this.currentBlock.x = Math.max(0, Math.min(this.currentBlock.x, canvasWidth - this.currentBlock.width));
            }
        } catch (error) {
            console.error('Error in StackTowerGame.update():', error);
        }
    }

    dropBlock() {
        try {
            if (!this.currentBlock || !this.currentBlock.moving || this.gameOver) return;
            
            const canvasWidth = this.canvasWidth || 320;
            
            // Final safety check to ensure block is within bounds
            this.currentBlock.x = Math.max(0, Math.min(this.currentBlock.x, canvasWidth - this.currentBlock.width));
            
            this.currentBlock.moving = false;
            
            if (this.blocks.length === 0) {
                this.blocks.push(this.currentBlock);
                this.updateScore(this.score + 10);
                this.spawnNextBlock();
                return;
            }
            
            const topBlock = this.blocks[this.blocks.length - 1];
            const currentBlock = this.currentBlock;
            
            // Calculate overlap
            const leftEdge = Math.max(topBlock.x, currentBlock.x);
            const rightEdge = Math.min(topBlock.x + topBlock.width, currentBlock.x + currentBlock.width);
            const overlapWidth = rightEdge - leftEdge;
            
            if (overlapWidth <= 0) {
                // No overlap, game over
                this.gameOver = true;
                this.stop();
                return;
            }
            
            // Check for perfect alignment
            const perfectThreshold = 5;
            const centerDiff = Math.abs((topBlock.x + topBlock.width / 2) - (currentBlock.x + currentBlock.width / 2));
            
            if (centerDiff <= perfectThreshold) {
                // Perfect alignment bonus
                this.perfectBonus++;
                this.updateScore(this.score + 50 + (this.perfectBonus * 10));
            } else {
                this.perfectBonus = 0;
                this.updateScore(this.score + 10);
            }
            
            // Trim the block to the overlap area
            currentBlock.x = leftEdge;
            currentBlock.width = overlapWidth;
            
            // Reduce block width for the next block to spawn
            if (centerDiff > perfectThreshold) {
                this.blockWidth = Math.max(30, overlapWidth); // Ensure minimum width of 30px
            }
            
            this.blocks.push(currentBlock);
            
            // Check win condition (reaching top of screen)
            if (currentBlock.y <= 100) {
                this.updateScore(this.score + 500);
                this.stop();
                return;
            }
            
            // Slight delay before spawning next block for better gameplay experience
            setTimeout(() => {
                if (this.isRunning && !this.gameOver) {
                    this.spawnNextBlock();
                }
            }, 100);
        } catch (error) {
            console.error('Error in dropBlock:', error);
        }
    }

    draw() {
        try {
            // Safety check for context and canvas
            if (!this.ctx || !this.canvas) {
                console.error('Context or canvas is null in draw');
                return;
            }
            
            // Get safe dimensions
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // Background
            try {
                const gradient = this.ctx.createLinearGradient(0, 0, 0, canvasHeight);
                gradient.addColorStop(0, '#74b9ff');
                gradient.addColorStop(1, '#0984e3');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } catch (gradientError) {
                // Fallback if gradient fails
                this.ctx.fillStyle = '#74b9ff';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            
            // Draw placed blocks
            if (this.blocks && Array.isArray(this.blocks)) {
                for (const block of this.blocks) {
                    this.drawRect(block.x, block.y, block.width, block.height, block.color);
                    
                    // Add shadow effect
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    this.ctx.fillRect(block.x + 2, block.y + 2, block.width, block.height);
                    this.ctx.fillStyle = block.color;
                    this.ctx.fillRect(block.x, block.y, block.width, block.height);
                    
                    // Add border
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(block.x, block.y, block.width, block.height);
                }
            }
            
            // Draw current moving block
            if (this.currentBlock && this.currentBlock.moving) {
                this.drawRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.width, this.currentBlock.height, this.currentBlock.color);
                
                try {
                    // Add glow effect to moving block
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = this.currentBlock.color;
                    this.ctx.fillStyle = this.currentBlock.color;
                    this.ctx.fillRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.width, this.currentBlock.height);
                    this.ctx.shadowBlur = 0;
                } catch (shadowError) {
                    // If shadow effects fail, just draw a simple block
                    this.ctx.fillStyle = this.currentBlock.color;
                    this.ctx.fillRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.width, this.currentBlock.height);
                }
            }
            
            // UI
            this.drawText(`Score: ${this.score}`, 10, 30, 20, 'white', 'left');
            this.drawText(`Height: ${this.blocks.length}`, canvasWidth - 10, 30, 20, 'white', 'right');
            
            if (this.perfectBonus > 0) {
                this.drawText(`Perfect x${this.perfectBonus}!`, canvasWidth / 2, 50, 16, '#FFD700');
            }
            
            if (!this.gameOver && this.blocks.length > 0) {
                this.drawText('TAP TO DROP', canvasWidth / 2, canvasHeight - 30, 18, 'white');
            }
        } catch (error) {
            console.error('Error in StackTowerGame.draw():', error);
        }
    }

    drawRect(x, y, width, height, color) {
        try {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);
        } catch (error) {
            console.error('Error in drawRect:', error);
        }
    }

    drawText(text, x, y, size, color, align = 'center') {
        try {
            this.ctx.font = `${size}px Arial`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = align;
            this.ctx.fillText(text, x, y);
        } catch (error) {
            console.error('Error in drawText:', error);
        }
    }

    handlePointerDown(e) {
        this.dropBlock();
    }
    
    // Override the parent's method with specific handling for StackTower
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Update dependent values if needed
            if (this.canvasHeight) {
                this.baseY = this.canvasHeight - 80;
            }
            
            // Update block positions if they exist
            if (this.blocks && this.blocks.length > 0 && this.canvasWidth) {
                // Update base block position
                const baseBlock = this.blocks[0];
                baseBlock.x = this.canvasWidth / 2 - baseBlock.width / 2;
                baseBlock.y = this.baseY;
                
                // Update other blocks relative to base
                for (let i = 1; i < this.blocks.length; i++) {
                    this.blocks[i].y = this.baseY - (i * this.blockHeight);
                }
            }
        } catch (error) {
            console.error('Error in StackTowerGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
import { BaseGame } from './BaseGame.js';

export class DodgeGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            this.player = {
                x: canvasWidth / 2,
                y: canvasHeight - 100,
                radius: 15,
                color: '#FFD700'
            };
            
            this.obstacles = [];
            this.spawnTimer = 0;
            this.gameTime = 60000; // 60 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.isDragging = false;
            this.spawnRate = 1000;
            this.obstacleSpeed = 2;
            
            console.log('DodgeGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing DodgeGame:', error);
            // Set minimal defaults to prevent further errors
            this.player = {
                x: 160,
                y: 380,
                radius: 15,
                color: '#FFD700'
            };
            this.obstacles = [];
            this.spawnTimer = 0;
            this.gameTime = 45000;
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.isDragging = false;
            this.spawnRate = 1000;
            this.obstacleSpeed = 2;
        }
    }

    getInstructions() {
        return "😊 Drag to dodge the angry red faces! 😠 Avoid the grumpy ones!";
    }

    start() {
        try {
            console.log('Starting DodgeGame');
            
            // Reset game state
            this.obstacles = [];
            this.timeRemaining = this.gameTime;
            this.score = 0;
            this.updateScore(0);
            this.spawnTimer = 0;
            this.obstacleSpeed = 2;
            this.spawnRate = 1000;
            
            // Initialize last time for delta time calculation
            this.lastTime = Date.now();
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in DodgeGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
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
                const finalScore = Math.floor((this.gameTime - this.timeRemaining) / 100);
                this.updateScore(finalScore);
                this.stop();
                return;
            }

            this.spawnObstacles();
            this.updateObstacles();
            this.checkCollisions();
            
            // Increase difficulty over time
            const timeElapsed = this.gameTime - this.timeRemaining;
            this.obstacleSpeed = 2 + (timeElapsed / 10000);
            this.spawnRate = Math.max(400, 1000 - (timeElapsed / 100));
            
            const currentScore = Math.floor(timeElapsed / 100);
            this.updateScore(currentScore);
        } catch (error) {
            console.error('Error in DodgeGame.update():', error);
        }
    }

    spawnObstacles() {
        try {
            this.spawnTimer += 16;
            
            if (this.spawnTimer >= this.spawnRate) {
                const canvasWidth = this.canvasWidth || 320;
                const colorData = this.getRandomObstacleColor();
                
                const obstacle = {
                    x: Math.random() * (canvasWidth - 40) + 20,
                    y: -30,
                    radius: 15 + Math.random() * 10, // Make them more uniform for better face drawing
                    speed: this.obstacleSpeed + Math.random() * 2,
                    color: colorData.color,
                    isAngry: colorData.isAngry
                };
                
                this.obstacles.push(obstacle);
                this.spawnTimer = 0;
            }
        } catch (error) {
            console.error('Error in spawnObstacles:', error);
        }
    }

    getRandomObstacleColor() {
        try {
            // 80% chance of angry red faces, 20% chance of other colors (but still dangerous)
            if (Math.random() < 0.8) {
                const redColors = ['#FF6B6B', '#E74C3C', '#C0392B', '#A93226'];
                return {
                    color: redColors[Math.floor(Math.random() * redColors.length)],
                    isAngry: true
                };
            } else {
                const otherColors = ['#9B59B6', '#3498DB', '#F39C12', '#E67E22'];
                return {
                    color: otherColors[Math.floor(Math.random() * otherColors.length)],
                    isAngry: false // These are still obstacles but look less angry
                };
            }
        } catch (error) {
            console.error('Error in getRandomObstacleColor:', error);
            // Return a safe default
            return {
                color: '#FF6B6B',
                isAngry: true
            };
        }
    }

    updateObstacles() {
        try {
            const canvasHeight = this.canvasHeight || 480;
            
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                this.obstacles[i].y += this.obstacles[i].speed;
                
                // Remove obstacles that are off screen
                if (this.obstacles[i].y > canvasHeight + 50) {
                    this.obstacles.splice(i, 1);
                }
            }
        } catch (error) {
            console.error('Error in updateObstacles:', error);
        }
    }

    checkCollisions() {
        try {
            if (!this.player) return;
            
            for (const obstacle of this.obstacles) {
                const distance = Math.sqrt(
                    Math.pow(this.player.x - obstacle.x, 2) + 
                    Math.pow(this.player.y - obstacle.y, 2)
                );
                
                if (distance < this.player.radius + obstacle.radius) {
                    this.stop();
                    return;
                }
            }
        } catch (error) {
            console.error('Error in checkCollisions:', error);
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
                const gradient = this.ctx.createRadialGradient(
                    canvasWidth / 2, canvasHeight / 2, 0,
                    canvasWidth / 2, canvasHeight / 2, canvasWidth
                );
                gradient.addColorStop(0, '#2C3E50');
                gradient.addColorStop(1, '#34495E');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } catch (gradientError) {
                // Fallback if gradient fails
                this.ctx.fillStyle = '#2C3E50';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            
            // Draw obstacles with faces
            if (this.obstacles && Array.isArray(this.obstacles)) {
                for (const obstacle of this.obstacles) {
                    if (obstacle.isAngry) {
                        this.drawAngryFace(obstacle.x, obstacle.y, obstacle.radius, obstacle.color);
                    } else {
                        this.drawNeutralFace(obstacle.x, obstacle.y, obstacle.radius, obstacle.color);
                    }
                }
            }
            
            // Draw happy player
            if (this.player) {
                this.drawHappyFace(this.player.x, this.player.y, this.player.radius, this.player.color);
            }
            
            // UI
            this.drawText(`Score: ${this.score}`, 10, 30, 20, 'white', 'left');
            this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, canvasWidth - 10, 30, 20, 'white', 'right');
        } catch (error) {
            console.error('Error in DodgeGame.draw():', error);
        }
    }

    getTouchPos(e) {
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (e.touches && e.touches[0] ? e.touches[0].clientX : 0) - rect.left,
                y: (e.touches && e.touches[0] ? e.touches[0].clientY : 0) - rect.top
            };
        } catch (error) {
            console.error('Error in getTouchPos:', error);
            return { x: 0, y: 0 };
        }
    }

    getMousePos(e) {
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        } catch (error) {
            console.error('Error in getMousePos:', error);
            return { x: 0, y: 0 };
        }
    }

    handleTouchStart(e) {
        try {
            super.handleTouchStart(e);
            this.isDragging = true;
            const pos = this.getTouchPos(e);
            if (this.player) {
                this.player.x = pos.x;
                this.player.y = pos.y;
            }
        } catch (error) {
            console.error('Error in handleTouchStart:', error);
        }
    }

    handleTouchMove(e) {
        try {
            super.handleTouchMove(e);
            if (this.isDragging && this.player) {
                const pos = this.getTouchPos(e);
                const canvasWidth = this.canvasWidth || 320;
                const canvasHeight = this.canvasHeight || 480;
                
                this.player.x = Math.max(this.player.radius, Math.min(canvasWidth - this.player.radius, pos.x));
                this.player.y = Math.max(this.player.radius, Math.min(canvasHeight - this.player.radius, pos.y));
            }
        } catch (error) {
            console.error('Error in handleTouchMove:', error);
        }
    }

    handleTouchEnd(e) {
        try {
            super.handleTouchEnd(e);
            this.isDragging = false;
        } catch (error) {
            console.error('Error in handleTouchEnd:', error);
        }
    }

    handleMouseDown(e) {
        try {
            super.handleMouseDown(e);
            this.isDragging = true;
            const pos = this.getMousePos(e);
            if (this.player) {
                this.player.x = pos.x;
                this.player.y = pos.y;
            }
        } catch (error) {
            console.error('Error in handleMouseDown:', error);
        }
    }

    handleMouseMove(e) {
        try {
            super.handleMouseMove(e);
            if (this.isDragging && this.player) {
                const pos = this.getMousePos(e);
                const canvasWidth = this.canvasWidth || 320;
                const canvasHeight = this.canvasHeight || 480;
                
                this.player.x = Math.max(this.player.radius, Math.min(canvasWidth - this.player.radius, pos.x));
                this.player.y = Math.max(this.player.radius, Math.min(canvasHeight - this.player.radius, pos.y));
            }
        } catch (error) {
            console.error('Error in handleMouseMove:', error);
        }
    }

    handleMouseUp(e) {
        try {
            super.handleMouseUp(e);
            this.isDragging = false;
        } catch (error) {
            console.error('Error in handleMouseUp:', error);
        }
    }

    drawHappyFace(x, y, radius, color) {
        try {
            // Face with glow effect
            try {
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = color;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } catch (glowError) {
                // Fallback if glow effect fails
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            // Face outline
            this.ctx.strokeStyle = '#FFA500';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Happy eyes
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.12, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(x + radius * 0.3, y - radius * 0.2, radius * 0.12, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Big smile
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y + radius * 0.1, radius * 0.5, 0, Math.PI);
            this.ctx.stroke();
        } catch (error) {
            console.error('Error in drawHappyFace:', error);
        }
    }

    drawAngryFace(x, y, radius, color) {
        try {
            // Face with intense glow effect
            try {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = color;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } catch (glowError) {
                // Fallback if glow effect fails
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            // Angry eyebrows
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius * 0.5, y - radius * 0.4);
            this.ctx.lineTo(x - radius * 0.2, y - radius * 0.2);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius * 0.5, y - radius * 0.4);
            this.ctx.lineTo(x + radius * 0.2, y - radius * 0.2);
            this.ctx.stroke();
            
            // Angry eyes (smaller, more intense)
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x - radius * 0.3, y - radius * 0.1, radius * 0.1, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(x + radius * 0.3, y - radius * 0.1, radius * 0.1, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Angry frown
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y + radius * 0.5, radius * 0.4, Math.PI, 0);
            this.ctx.stroke();
            
            // Add red angry marks
            try {
                this.ctx.strokeStyle = '#8B0000';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const angle = (Math.PI / 6) + (i * Math.PI / 12);
                    this.ctx.beginPath();
                    this.ctx.moveTo(x - radius * 0.8 * Math.cos(angle), y - radius * 0.8 * Math.sin(angle));
                    this.ctx.lineTo(x - radius * 0.6 * Math.cos(angle), y - radius * 0.6 * Math.sin(angle));
                    this.ctx.stroke();
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + radius * 0.8 * Math.cos(angle), y - radius * 0.8 * Math.sin(angle));
                    this.ctx.lineTo(x + radius * 0.6 * Math.cos(angle), y - radius * 0.6 * Math.sin(angle));
                    this.ctx.stroke();
                }
            } catch (marksError) {
                // Ignore marks errors, they're not critical
            }
        } catch (error) {
            console.error('Error in drawAngryFace:', error);
        }
    }

    drawNeutralFace(x, y, radius, color) {
        try {
            // Face with subtle glow
            try {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = color;
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } catch (glowError) {
                // Fallback if glow effect fails
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            
            // Normal eyes
            this.ctx.fillStyle = '#000000';
            this.ctx.beginPath();
            this.ctx.arc(x - radius * 0.3, y - radius * 0.2, radius * 0.1, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(x + radius * 0.3, y - radius * 0.2, radius * 0.1, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Neutral mouth (straight line)
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - radius * 0.3, y + radius * 0.2);
            this.ctx.lineTo(x + radius * 0.3, y + radius * 0.2);
            this.ctx.stroke();
        } catch (error) {
            console.error('Error in drawNeutralFace:', error);
        }
    }
    
    // Override the parent's method with specific handling for DodgeGame
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Update dependent values if needed
            if (this.player && this.canvasWidth && this.canvasHeight) {
                // Make sure player stays within bounds after resize
                this.player.x = Math.max(this.player.radius, Math.min(this.canvasWidth - this.player.radius, this.player.x));
                this.player.y = Math.max(this.player.radius, Math.min(this.canvasHeight - this.player.radius, this.player.y));
            }
        } catch (error) {
            console.error('Error in DodgeGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
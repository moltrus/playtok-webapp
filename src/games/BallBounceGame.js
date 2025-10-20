import { BaseGame } from './BaseGame.js';

export class BallBounceGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Create ball sprite
            this.ballSprite = this.createSprite('ball', canvasWidth / 2, 100);
            this.ballSprite.scale.set(0.5);
            
            // Create paddle sprite
            this.paddleSprite = this.createSprite('paddle', canvasWidth / 2, canvasHeight - 80);
            this.paddleSprite.tint = 0xFF6B6B;
            
            this.ball = {
                sprite: this.ballSprite,
                x: canvasWidth / 2,
                y: 100,
                radius: 15,
                velocityX: 3,
                velocityY: 5
            };
            
            this.paddle = {
                sprite: this.paddleSprite,
                x: canvasWidth / 2 - 50,
                y: canvasHeight - 80,
                width: 100,
                height: 15
            };
            
            this.isDragging = false;
            this.lastTouchX = 0;
            
            // Create retro background elements
            this.createBackground();
            
            console.log('BallBounceGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
            
        } catch (error) {
            console.error('Error initializing BallBounceGame:', error);
            // Set minimal defaults to prevent further errors
            this.ball = { x: 160, y: 100, radius: 15, velocityX: 3, velocityY: 5 };
            this.paddle = { x: 160 - 50, y: 380, width: 100, height: 15 };
            this.isDragging = false;
            this.lastTouchX = 0;
        }
    }

    getInstructions() {
        return "Drag the paddle to keep the ball bouncing!";
    }
    
    start() {
        console.log('Starting BallBounceGame');
        
        try {
            // Reset ball position and velocity
            if (this.ball) {
                this.ball.x = this.canvasWidth / 2;
                this.ball.y = 100;
                this.ball.velocityX = 3 * (Math.random() > 0.5 ? 1 : -1); // Random direction
                this.ball.velocityY = 5;
                
                // Update sprite if available
                if (this.ball.sprite) {
                    this.ball.sprite.x = this.ball.x;
                    this.ball.sprite.y = this.ball.y;
                }
            }
            
            // Reset paddle to center
            if (this.paddle) {
                this.paddle.x = this.canvasWidth / 2 - this.paddle.width / 2;
                
                // Update sprite if available
                if (this.paddle.sprite) {
                    this.paddle.sprite.x = this.paddle.x + this.paddle.width / 2;
                }
            }
            
            // Reset score
            this.score = 0;
            this.updateScore(0);
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in BallBounceGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
        }
    }

    createBackground() {
        // Create retro grid background - skip PIXI for now
        console.log('⚠️ Skipping background creation - using canvas fallback');
    }

    update() {
        if (!this.isRunning) return;

        try {
            // Safety check for game objects
            if (!this.ball || !this.paddle) {
                console.error('Ball or paddle object is missing in update');
                return;
            }

            // Update ball position
            this.ball.x += this.ball.velocityX;
            this.ball.y += this.ball.velocityY;
            
            // Update sprite positions if they exist
            if (this.ball.sprite) this.ball.sprite.x = this.ball.x;
            if (this.ball.sprite) this.ball.sprite.y = this.ball.y;
            if (this.paddle.sprite) this.paddle.sprite.x = this.paddle.x + this.paddle.width / 2;
            
            // Ball collision with walls - add bounds checking
            const maxWidth = this.canvasWidth || 320;
            if (this.ball.x - this.ball.radius <= 0 || this.ball.x + this.ball.radius >= maxWidth) {
                this.ball.velocityX = -this.ball.velocityX;
        }
        
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.velocityY = -this.ball.velocityY;
        }
        
        // Ball collision with paddle
        if (this.ball.y + this.ball.radius >= this.paddle.y &&
            this.ball.y - this.ball.radius <= this.paddle.y + this.paddle.height &&
            this.ball.x >= this.paddle.x &&
            this.ball.x <= this.paddle.x + this.paddle.width) {
            
            this.ball.velocityY = -Math.abs(this.ball.velocityY);
            
            // Add some spin based on where ball hits paddle
            const hitPosition = (this.ball.x - this.paddle.x) / this.paddle.width;
            this.ball.velocityX = (hitPosition - 0.5) * 6;
            
            // Update score
            this.updateScore(this.score + 10);
        }
        
        // Game over if ball falls below paddle
        const maxHeight = this.canvasHeight || 480;
        if (this.ball.y - this.ball.radius > maxHeight) {
            this.stop();
        }
        } catch (error) {
            console.error('Error in BallBounceGame.update():', error);
            // Don't stop the game for a single frame error
        }
    }

    draw() {
        try {
            // Safety check for context
            if (!this.ctx || !this.canvas) {
                console.error('Context or canvas is null in draw');
                return;
            }
            
            // Get safe dimensions
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Clear canvas
            this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // Debug: Fill entire canvas with color to see if it's working
            this.ctx.fillStyle = '#1e3c72';
            this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Background gradient
            try {
                const gradient = this.ctx.createLinearGradient(0, 0, 0, canvasHeight);
                gradient.addColorStop(0, '#1e3c72');
                gradient.addColorStop(1, '#2a5298');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } catch (gradientError) {
                // Fallback if gradient fails
                this.ctx.fillStyle = '#1e3c72';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        
            // Draw grid background
            this.ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let x = 0; x < canvasWidth; x += 40) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, canvasHeight);
            }
            for (let y = 0; y < canvasHeight; y += 40) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(canvasWidth, y);
            }
            this.ctx.stroke();
            
            // Safety check for game objects
            if (this.ball && this.paddle) {
                // Ball
                this.drawCircle(this.ball.x, this.ball.y, this.ball.radius, '#FFD700');
                
                // Paddle
                this.drawRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, '#FF6B6B');
                
                // Score
                this.drawText(`SCORE: ${this.score}`, canvasWidth / 2, 40, 24, 'white');
            }

            const instructionCopy = this.getInstructions?.() || '';
            if (instructionCopy) {
                this.drawText(instructionCopy, canvasWidth / 2, canvasHeight - 24, 18, '#00FFF0');
            }
        } catch (error) {
            console.error('Error in BallBounceGame.draw():', error);
            // Don't stop the game for a single frame error
        }
    }

    drawCircle(x, y, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(text, x, y, size, color) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x, y);
    }

    getTouchX(e) {
        const rect = this.canvas.getBoundingClientRect();
        return e.touches[0].clientX - rect.left;
    }

    getMouseX(e) {
        const rect = this.canvas.getBoundingClientRect();
        return e.clientX - rect.left;
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        this.isDragging = true;
        this.lastTouchX = this.getTouchX(e);
    }

    handleTouchMove(e) {
        super.handleTouchMove(e);
        if (this.isDragging) {
            const touchX = this.getTouchX(e);
            this.paddle.x = Math.max(0, Math.min(this.canvasWidth - this.paddle.width, touchX - this.paddle.width / 2));
            this.paddle.sprite.x = this.paddle.x + this.paddle.width / 2;
        }
    }

    handleTouchEnd(e) {
        super.handleTouchEnd(e);
        this.isDragging = false;
    }

    handleMouseDown(e) {
        super.handleMouseDown(e);
        this.isDragging = true;
        this.lastTouchX = this.getMouseX(e);
    }

    handleMouseMove(e) {
        super.handleMouseMove(e);
        if (this.isDragging) {
            const mouseX = this.getMouseX(e);
            this.paddle.x = Math.max(0, Math.min(this.canvasWidth - this.paddle.width, mouseX - this.paddle.width / 2));
            this.paddle.sprite.x = this.paddle.x + this.paddle.width / 2;
        }
    }

    handleMouseUp(e) {
        super.handleMouseUp(e);
        this.isDragging = false;
    }
    
    // Override the parent's method with specific handling for BallBounce
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Update game object positions based on new dimensions
            if (this.ball && this.paddle) {
                // Update paddle position relative to bottom of screen
                this.paddle.y = this.canvasHeight - 80;
                
                // Keep ball in bounds if dimensions changed
                if (this.ball.x > this.canvasWidth) {
                    this.ball.x = this.canvasWidth / 2;
                }
                if (this.ball.y > this.canvasHeight) {
                    this.ball.y = this.canvasHeight / 2;
                }
                
                // Update sprite positions
                if (this.ball.sprite) {
                    this.ball.sprite.x = this.ball.x;
                    this.ball.sprite.y = this.ball.y;
                }
                
                if (this.paddle.sprite) {
                    this.paddle.sprite.x = this.paddle.x + this.paddle.width / 2;
                    this.paddle.sprite.y = this.paddle.y;
                }
            }
        } catch (error) {
            console.error('Error in BallBounceGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
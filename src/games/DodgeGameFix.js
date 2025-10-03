import { BaseGame } from './BaseGame.js';
/**
 * DodgeGameFix.js - Guaranteed fallback implementation for the Dodge Game
 * This file serves as a reliable backup when the regular DodgeGame module cannot be loaded
 */

// Try three different ways to import the DodgeGame
let DodgeGame = null;

// Option 1: Direct import (might fail at build time)
try {
    // Try to import from the correct path
    const module = require('./DodgeGame.js');
    DodgeGame = module.default || module.DodgeGame || module;
    console.log('✅ Successfully imported DodgeGame using require');
} catch (err1) {
    console.warn('⚠️ Failed to import DodgeGame with require:', err1.message);
    
    // Option 2: Try a relative path
    try {
        const module = require('../games/DodgeGame.js');
        DodgeGame = module.default || module.DodgeGame || module;
        console.log('✅ Successfully imported DodgeGame using relative path');
    } catch (err2) {
        console.warn('⚠️ Failed to import DodgeGame with relative path:', err2.message);
        
        // Option 3: Try with dynamic import (works at runtime)
        import('./DodgeGame.js').then(module => {
            DodgeGame = module.default || module.DodgeGame || module;
            console.log('✅ Successfully imported DodgeGame with dynamic import');
        }).catch(err3 => {
            console.warn('⚠️ Failed to import DodgeGame with dynamic import:', err3.message);
        });
    }
}

// Export the original game class if it was successfully imported
export { DodgeGame };

/**
 * Fallback implementation of the Dodge Game
 * This class will be used if the original DodgeGame cannot be loaded
 */
export class FallbackDodgeGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        console.log('⚠️ Using fallback Dodge Game implementation');
        
        // Game properties
        this.title = 'Dodge Game';
        this.instructions = 'Move your character to dodge falling obstacles';
        this.minScore = 10;
        this.maxScore = 100;
        
        // Game state
        this.obstacles = [];
        this.player = null;
        this.spawnRate = 1000; // ms
        this.lastSpawnTime = 0;
        this.obstacleSpeed = 3;
        this.playerSpeed = 5;
        this.score = 0;
        this.gameActive = true;
        this.movingLeft = false;
        this.movingRight = false;
        
        // Input handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Bind touch handlers for mobile devices
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    start() {
        super.start();
        this.setupGame();
        
        // Add event listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        // Add touch event listeners for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart);
        this.canvas.addEventListener('touchmove', this.handleTouchMove);
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
        
        this.gameActive = true;
    }
    
    stop() {
        super.stop();
        
        // Remove event listeners
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        
        // Remove touch event listeners
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        
        this.gameActive = false;
    }
    
    handleKeyDown(event) {
        if (event.key === 'ArrowLeft') {
            this.movingLeft = true;
        } else if (event.key === 'ArrowRight') {
            this.movingRight = true;
        }
    }
    
    handleKeyUp(event) {
        if (event.key === 'ArrowLeft') {
            this.movingLeft = false;
        } else if (event.key === 'ArrowRight') {
            this.movingRight = false;
        }
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const touchX = touch.clientX - this.canvas.getBoundingClientRect().left;
        
        if (touchX < this.canvasWidth / 2) {
            this.movingLeft = true;
            this.movingRight = false;
        } else {
            this.movingLeft = false;
            this.movingRight = true;
        }
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const touchX = touch.clientX - this.canvas.getBoundingClientRect().left;
        
        if (touchX < this.canvasWidth / 2) {
            this.movingLeft = true;
            this.movingRight = false;
        } else {
            this.movingLeft = false;
            this.movingRight = true;
        }
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        this.movingLeft = false;
        this.movingRight = false;
    }
    
    setupGame() {
        // Initialize player in the middle bottom of the screen
        this.player = {
            x: this.canvasWidth / 2,
            y: this.canvasHeight - 50,
            width: 30,
            height: 30
        };
        
        // Reset game state
        this.obstacles = [];
        this.score = 0;
        this.lastSpawnTime = 0;
        
        // Reset any UI elements
        if (this.onScoreUpdate) {
            this.onScoreUpdate(0);
        }
    }
    
    spawnObstacle() {
        const obstacle = {
            x: Math.random() * (this.canvasWidth - 30),
            y: -30,
            width: 20 + Math.random() * 30,
            height: 20 + Math.random() * 30,
            speed: this.obstacleSpeed + Math.random() * 2
        };
        
        this.obstacles.push(obstacle);
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        if (!this.gameActive) return;
        
        // Handle player movement
        if (this.movingLeft) {
            this.player.x = Math.max(0, this.player.x - this.playerSpeed);
        }
        
        if (this.movingRight) {
            this.player.x = Math.min(this.canvasWidth - this.player.width, this.player.x + this.playerSpeed);
        }
        
        // Spawn obstacles
        const currentTime = Date.now();
        if (currentTime - this.lastSpawnTime > this.spawnRate) {
            this.spawnObstacle();
            this.lastSpawnTime = currentTime;
            
            // Increase difficulty gradually
            this.spawnRate = Math.max(300, this.spawnRate - 10);
            this.obstacleSpeed += 0.05;
        }
        
        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.y += obstacle.speed;
            
            // Remove obstacles that went off screen
            if (obstacle.y > this.canvasHeight) {
                this.obstacles.splice(i, 1);
                this.score++;
                
                if (this.onScoreUpdate) {
                    this.onScoreUpdate(this.score);
                }
            }
            
            // Check for collision
            if (this.checkCollision(this.player, obstacle)) {
                // Game over
                this.gameActive = false;
                this.showGameOver();
                return;
            }
        }
    }
    
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    showGameOver() {
        // Calculate final score
        const finalScore = Math.min(this.maxScore, Math.max(this.minScore, this.score));
        
        if (this.onScoreUpdate) {
            this.onScoreUpdate(finalScore);
        }
    }
    
    render() {
        if (!this.context) return;
        
        // Clear canvas
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        this.context.fillStyle = '#111';
        this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        if (!this.gameActive && this.score === 0) {
            // Show game instructions
            this.context.fillStyle = 'white';
            this.context.font = '24px Arial';
            this.context.textAlign = 'center';
            this.context.fillText(this.title, this.canvasWidth / 2, this.canvasHeight / 2 - 40);
            this.context.font = '18px Arial';
            this.context.fillText(this.instructions, this.canvasWidth / 2, this.canvasHeight / 2);
            this.context.fillText('Press any key to start', this.canvasWidth / 2, this.canvasHeight / 2 + 40);
            return;
        }
        
        if (!this.gameActive && this.score > 0) {
            // Show game over
            this.context.fillStyle = 'white';
            this.context.font = '24px Arial';
            this.context.textAlign = 'center';
            this.context.fillText('Game Over', this.canvasWidth / 2, this.canvasHeight / 2 - 40);
            this.context.font = '18px Arial';
            this.context.fillText(`Score: ${this.score}`, this.canvasWidth / 2, this.canvasHeight / 2);
            this.context.fillText('Press any key to restart', this.canvasWidth / 2, this.canvasHeight / 2 + 40);
            return;
        }
        
        // Draw player
        this.context.fillStyle = 'cyan';
        this.context.fillRect(
            this.player.x,
            this.player.y,
            this.player.width,
            this.player.height
        );
        
        // Draw obstacles
        this.context.fillStyle = 'red';
        this.obstacles.forEach(obstacle => {
            this.context.fillRect(
                obstacle.x,
                obstacle.y,
                obstacle.width,
                obstacle.height
            );
        });
        
        // Draw score
        this.context.fillStyle = 'yellow';
        this.context.font = '18px Arial';
        this.context.textAlign = 'left';
        this.context.fillText(`Score: ${this.score}`, 10, 30);
    }
}

/**
 * Factory function to get the best available implementation of the DodgeGame
 * This will return the original implementation if available, or our fallback otherwise
 */
export function getDodgeGame() {
    if (DodgeGame) {
        console.log('✅ Using original DodgeGame implementation');
        return DodgeGame;
    }
    console.log('⚠️ Using fallback DodgeGame implementation');
    return FallbackDodgeGame;
}

// Default export for consistency
export default FallbackDodgeGame;
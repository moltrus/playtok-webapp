import { BaseGame } from './BaseGame.js';

export class TapToJumpGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Set up game dimensions - with error handling
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasHeight = this.canvasHeight || 480;
            const groundY = canvasHeight - 100;
            
            // Character parameters
            this.player = {
                x: 50,
                y: groundY,   // On the ground
                width: 30,
                height: 30,
                velocityY: 0,                 // Not moving vertically
                isJumping: false,             // Not jumping initially
                groundY: groundY
            };
            
            this.obstacles = [];
            this.particles = [];
            this.obstacleSpawnTimer = 0;
            this.gameSpeed = 4;
            this.gravity = 0.8;
            this.jumpPower = -15;
            this.gameTime = 30000; // 30 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = Date.now(); // Initialize lastTime in constructor
            this.flashEffect = null;
            this.gameStarted = false; // Track if game has actually started
            
            console.log('TapToJumpGame initialized successfully with dimensions:', 
                        this.canvasWidth, 'x', this.canvasHeight);
                        
        } catch (error) {
            console.error('Error initializing TapToJumpGame:', error);
            // Set minimal defaults to prevent further errors
            this.player = { x: 50, y: 380, width: 30, height: 30, velocityY: 0, isJumping: false, groundY: 380 };
            this.obstacles = [];
            this.particles = [];
            this.gameTime = 30000;
            this.timeRemaining = this.gameTime;
            this.lastTime = Date.now();
        }
    }
    
    // We don't need the spawnInitialObstacles method anymore since we handle this in the start method

    getInstructions() {
        return "🐸 Tap to jump over obstacles! Survive for 30 seconds! 🏃‍♂️";
    }

    start() {
        console.log('Starting TapToJumpGame');
        
        // Initialize the game time and state with proper logging
        this.gameTime = 30000; // Ensure this is always 30 seconds (30,000ms)
        this.timeRemaining = this.gameTime;
        
        // Set the lastTime to current time to avoid huge initial time delta
        this.lastTime = Date.now();
        console.log('Game time initialized to:', this.gameTime, 'ms');
        console.log('Last time set to:', this.lastTime);
        
        // Reset score and game state
        this.score = 0;
        this.isRunning = false;  // Will be set to true by parent start()
        
        // Reset player to initial state
        this.player.y = this.player.groundY;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        
        // Clear any game over flags
        this.gameOverReason = null;
        
        // Clear any existing obstacles
        this.obstacles = [];
        
        // Add initial obstacles at safe distances from the player
        // Player is at x=50, so obstacles should be well to the right
        this.obstacles.push({
            x: this.canvasWidth + 100,   // Far to the right
            y: this.canvasHeight - 130,
            width: 30,
            height: 40,
            type: 'obstacle',
            passed: false
        });
        
        this.obstacles.push({
            x: this.canvasWidth + 300,   // Even further right
            y: this.canvasHeight - 130,
            width: 30,
            height: 40,
            type: 'wall',
            passed: false
        });
        
        this.obstacles.push({
            x: this.canvasWidth + 500,   // Very far right
            y: this.canvasHeight - 130,
            width: 30,
            height: 40,
            type: 'block',
            passed: false
        });
        
        // Call the parent start method which runs the game loop
        super.start();
    }

    update(deltaTime) {
        // Check if game is running
        if (!this.isRunning) {
            return;
        }

        // Handle time updates
        
        // Check for extremely large time jumps which could cause game to end instantly
        if (deltaTime > 5000) {
            console.log('Very large time delta detected:', deltaTime, 'ms. Resetting to prevent instant game over.');
            deltaTime = 16; // Use a reasonable frame time (~60fps)
            this.lastTime = currentTime - deltaTime;
        }
        // Safety check for unreasonable delta time (e.g., after tab switch)
        else if (deltaTime > 100) {
            deltaTime = 100; // Cap at 100ms to prevent huge jumps
        }
        
        this.lastTime = currentTime;

        // Update time remaining with logging to track timer issues
        const oldTimeRemaining = this.timeRemaining;
        this.timeRemaining -= deltaTime;
        
        // Log if time is decreasing too rapidly
        if (deltaTime > 1000) {
            console.log(`Large time decrease: ${deltaTime}ms. Time remaining: ${this.timeRemaining}ms`);
        }
        
        // Check for game over - with additional logging
        if (this.timeRemaining <= 0) {
            console.log('Game over due to time expiring. Initial game time:', this.gameTime, 'ms');
            
            // Ensure we track that this was a time-based game over, not a collision
            this.gameOverReason = 'time_expired';
            
            this.stop();
            return;
        }

        // Game logic updates
        this.updatePlayer();
        this.updateObstacles();
        this.checkCollisions();
        this.updateParticles();
        
        // Update score based on time survived - only update every second
        const timeElapsed = this.gameTime - this.timeRemaining;
        const newScore = Math.floor(timeElapsed / 1000);  // 1 point per second survived
        if (this.score !== newScore) {
            this.updateScore(newScore);
        }
    }

    updatePlayer(deltaTime) {
        if (this.player.isJumping) {
            this.player.velocityY += this.gravity * (deltaTime / 16);
            this.player.y += this.player.velocityY * (deltaTime / 16);
            
            // Add occasional particles during jump for better visual effect
            if (Math.random() < 0.1) {
                this.addParticleEffect(
                    this.player.x + (Math.random() * 10 - 5), 
                    this.player.y + 5, 
                    1, 
                    '#FFFFFF'
                );
            }
            
            // Add more dramatic landing effect when close to ground
            if (this.player.velocityY > 0 && this.player.y >= this.player.groundY - 20 && this.player.y < this.player.groundY) {
                // Pre-landing anticipation particles
                if (Math.random() < 0.3) {
                    this.addParticleEffect(
                        this.player.x + (Math.random() * 10 - 5),
                        this.player.groundY,
                        1,
                        '#8B4513'
                    );
                }
            }
            
            if (this.player.y >= this.player.groundY) {
                this.player.y = this.player.groundY;
                this.player.velocityY = 0;
                this.player.isJumping = false;
                
                // Add landing particles - more particles with varied colors
                this.addParticleEffect(this.player.x, this.player.y, 8, '#8B4513');
                this.addParticleEffect(this.player.x - 5, this.player.y, 4, '#654321');
                this.addParticleEffect(this.player.x + 5, this.player.y, 4, '#5D4037');
            }
        }
    }

    updateObstacles(deltaTime) {
        // Simple obstacle movement
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            // Move obstacles from right to left at constant speed
            this.obstacles[i].x -= this.gameSpeed * (deltaTime / 16);
            
            // Remove obstacles that are off-screen
            if (this.obstacles[i].x + this.obstacles[i].width < -50) {
                this.obstacles.splice(i, 1);
            }
        }
        
        // Keep a minimum number of obstacles with proper spacing
        if (this.obstacles.length < 3) {
            // Find the rightmost obstacle to ensure proper spacing
            let rightmostX = 0;
            for (const obstacle of this.obstacles) {
                if (obstacle.x > rightmostX) {
                    rightmostX = obstacle.x;
                }
            }
            
            // Only add a new obstacle if there's enough space
            // If no obstacles exist or the rightmost one is far enough in
            if (this.obstacles.length === 0 || rightmostX < this.canvasWidth + 100) {
                // Add a new obstacle at the right edge of the screen with some randomness
                const obstacleTypes = ['obstacle', 'wall', 'block'];
                const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
                
                // Position the new obstacle with proper spacing
                const newX = Math.max(this.canvasWidth + 50, rightmostX + 200 + Math.random() * 100);
                
                this.obstacles.push({
                    x: newX,
                    y: this.canvasHeight - 130,
                    width: 30,
                    height: 40,
                    type: obstacleType,
                    passed: false
                });
            }
        }
    }

    // We no longer need the spawnObstacles method since we handle this in updateObstacles

    checkCollisions() {
        // Skip collision check if the game just started (give player time to react)
        const gameStartTime = this.gameTime - this.timeRemaining;
        if (gameStartTime < 1000) {  // Skip collision in the first second
            return;
        }
        
        // Debug indicator
        let collisionDetected = false;
        
        for (const obstacle of this.obstacles) {
            // More precise collision using actual character dimensions
            const playerLeft = this.player.x;
            const playerRight = this.player.x + 20;  // Player width
            const playerTop = this.player.y - 30;    // Player height
            const playerBottom = this.player.y;
            
            const obstacleLeft = obstacle.x;
            const obstacleRight = obstacle.x + obstacle.width;
            const obstacleTop = obstacle.y - obstacle.height;
            const obstacleBottom = obstacle.y;
            
            // Check for collision - only if obstacle is in the game area (not offscreen)
            // AND if the obstacle is actually close to the player (optimization)
            if (obstacle.x > -obstacle.width && 
                obstacle.x < this.canvasWidth &&
                Math.abs(obstacle.x - this.player.x) < 100) {
                
                if (playerRight > obstacleLeft && 
                    playerLeft < obstacleRight && 
                    playerBottom > obstacleTop && 
                    playerTop < obstacleBottom) {
                    
                    // Collision detected - log detailed information
                    collisionDetected = true;
                    
                    console.log('Collision detected!');
                    console.log('Player position:', this.player.x, this.player.y);
                    console.log('Obstacle position:', obstacle.x, obstacle.y);
                    console.log('Obstacle type:', obstacle.type);
                    
                    // Add collision particle effect - more dramatic
                    this.addParticleEffect(this.player.x, this.player.y - 15, 30, '#FF5555');
                    this.addParticleEffect(this.player.x, this.player.y - 15, 20, '#FFAAAA');
                    this.addParticleEffect(obstacle.x, obstacle.y - obstacle.height / 2, 15, '#FF0000');
                    
                    // Add flash effect
                    this.flashEffect = {
                        life: 10,
                        maxLife: 10
                    };
                    
                    // Track that this was a collision-based game over
                    this.gameOverReason = 'collision';
                    
                    this.stop();
                    break;
                }
            }
            
            // Check if player has just passed an obstacle successfully (obstacle is just behind the player)
            if (!obstacle.passed && obstacleRight < playerLeft && obstacle.x > 0) {
                obstacle.passed = true;
                
                // Add score increase
                this.score += 10;
                
                // Add particle effect for successful jump
                this.addParticleEffect(
                    this.player.x + 10, 
                    this.player.y - 15, 
                    5, 
                    '#FFFF00'
                );
            }
        }
        
        // If no collision, add some debug info
        if (this.obstacles.length > 0 && !collisionDetected) {
            const nearestObstacle = this.obstacles.reduce((nearest, current) => {
                return (current.x < nearest.x && current.x > this.player.x) ? current : nearest;
            }, { x: Infinity });
            
            if (nearestObstacle.x !== Infinity) {
                // Calculate distance to nearest obstacle (just for debug purposes)
                const distance = nearestObstacle.x - this.player.x;
                if (distance < 100) {
                    // We're close to an obstacle but no collision
                    // Could add some visual indication here if desired
                }
            }
        }
    }

    updateParticles() {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update particle
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Gravity
            p.life--;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update flash effect
        if (this.flashEffect) {
            this.flashEffect.life--;
            if (this.flashEffect.life <= 0) {
                this.flashEffect = null;
            }
        }
    }

    addParticleEffect(x, y, count, color = '#FFFFFF') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1, // Initial upward velocity
                life: 20 + Math.random() * 20,
                maxLife: 40,
                color: color,
                size: 2 + Math.random() * 3
            });
        }
    }

    jump() {
        // Only jump if the game is running and player is not already jumping
        if (this.isRunning && !this.player.isJumping) {
            console.log('Player jumping');
            this.player.velocityY = this.jumpPower;
            this.player.isJumping = true;
            
            // Add jump particle effect - more particles with varied colors
            this.addParticleEffect(this.player.x, this.player.y, 8, '#FFFFFF');
            this.addParticleEffect(this.player.x - 5, this.player.y + 2, 4, '#8B4513');
            this.addParticleEffect(this.player.x + 5, this.player.y + 2, 4, '#654321');
            
            // Add "boost" particles going downward
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI / 2 + (Math.random() * 0.4 - 0.2); // Mostly downward
                const speed = 2 + Math.random() * 3;
                
                this.particles.push({
                    x: this.player.x + (Math.random() * 10 - 5),
                    y: this.player.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 10 + Math.random() * 10,
                    maxLife: 20,
                    color: '#E0E0E0',
                    size: 1 + Math.random() * 2
                });
            }
        }
    }

    handlePointerDown(e) {
        this.jump();
    }
    
    stop() {
        if (!this.isRunning) return;
        
        // Log why the game is stopping
        console.log('Game stopping. Reason:', this.gameOverReason || 'unknown');
        console.log('Time remaining:', this.timeRemaining, 'ms');
        console.log('Score at game end:', this.score);
        
        // Add a special effect for game over
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Create a burst of particles at the center
        if (this.gameOverReason === 'time_expired' || this.timeRemaining <= 0) {
            console.log('Showing success celebration - game completed!');
            
            // Success - game completed, celebrate!
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 100;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                const celebrationColors = ['#FFD700', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
                const color = celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
                
                this.addParticleEffect(x, y, 3, color);
            }
        }
        
        // Make sure the final score is updated
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.score);
        }
        
        // Call the parent stop method
        super.stop();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Debug is now disabled to prevent flashing
        const showDebug = false;
        
        // Ground
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvasHeight - 70, this.canvasWidth, 70);
        
        // Ground texture
        this.ctx.fillStyle = '#654321';
        for (let x = 0; x < this.canvasWidth; x += 20) {
            this.ctx.fillRect(x, this.canvasHeight - 70, 10, 3);
        }
        
        // Sun
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(this.canvasWidth - 40, 40, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw rays
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = this.canvasWidth - 40 + Math.cos(angle) * 25;
            const y1 = 40 + Math.sin(angle) * 25;
            const x2 = this.canvasWidth - 40 + Math.cos(angle) * 35;
            const y2 = 40 + Math.sin(angle) * 35;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Clouds
        this.drawCloud(50, 40, 30);
        this.drawCloud(this.canvasWidth / 2, 60, 40);
        this.drawCloud(this.canvasWidth - 80, 70, 35);
        
        // Draw obstacles with shadow effect
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        for (const obstacle of this.obstacles) {
            this.drawObstacle(obstacle);
        }
        this.ctx.restore();
        
        // Player character with shadow effect
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.drawPlayerCharacter(this.player.x, this.player.y);
        this.ctx.restore();
        
        // Particles
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            let colorStr = p.color;
            
            // Convert different color formats to rgba
            if (colorStr.startsWith('#')) {
                const r = parseInt(colorStr.substr(1, 2), 16);
                const g = parseInt(colorStr.substr(3, 2), 16);
                const b = parseInt(colorStr.substr(5, 2), 16);
                colorStr = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            } else if (colorStr.startsWith('rgb(')) {
                colorStr = colorStr.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
            }
            
            this.ctx.fillStyle = colorStr;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Flash effect
        if (this.flashEffect) {
            const alpha = this.flashEffect.life / this.flashEffect.maxLife * 0.7;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        // Timer display
        const secondsRemaining = Math.ceil(this.timeRemaining / 1000);
        this.drawText(`Time: ${secondsRemaining}s`, this.canvasWidth - 60, 30, 16, '#000000');
        
        // UI with shadow for better visibility
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, this.canvasWidth - 10, 30, 20, 'white', 'right');
        this.drawText(`Score: ${this.score}`, 10, 30, 20, 'white', 'left');
        this.ctx.restore();
    }
    
    drawCloud(x, y, size) {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.8, y, size * 0.5, 0, Math.PI * 2);
        this.ctx.arc(x + size * 0.4, y + size * 0.1, size * 0.4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawPlayerCharacter(x, y) {
        this.ctx.save();
        
        // Add rotation effect when jumping
        if (this.player.isJumping) {
            const angle = Math.sin(Date.now() / 200) * 0.2;
            this.ctx.translate(x, y);
            this.ctx.rotate(angle);
            this.ctx.translate(-x, -y);
        }
        
        // Draw a cute teal character
        const mainColor = '#4ECDC4';
        const outlineColor = '#2C3E50';
        const lineWidth = 2;
        
        // Draw character outline for better visibility
        // Head outline
        this.ctx.strokeStyle = outlineColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 15, 12, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Head
        this.ctx.fillStyle = mainColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 15, 12, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Eyes background
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y - 18, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y - 18, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Pupils
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x - 4, y - 18, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y - 18, 1.5, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add expression - smile
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 12, 5, 0.2, Math.PI - 0.2);
        this.ctx.stroke();
        
        // Body outline
        this.ctx.strokeStyle = outlineColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, 8, 12, 0, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Body
        this.ctx.fillStyle = mainColor;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y - 5, 8, 12, 0, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Limbs
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = mainColor;
        
        // Arms outline
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = outlineColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y - 10);
        this.ctx.lineTo(x - 12, y - 5);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, y - 10);
        this.ctx.lineTo(x + 12, y - 5);
        this.ctx.stroke();
        
        // Arms
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = mainColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y - 10);
        this.ctx.lineTo(x - 12, y - 5);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 5, y - 10);
        this.ctx.lineTo(x + 12, y - 5);
        this.ctx.stroke();
        
        // Legs outline
        this.ctx.lineWidth = 6;
        this.ctx.strokeStyle = outlineColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y);
        this.ctx.lineTo(x - 6, y + 10);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y);
        this.ctx.lineTo(x + 6, y + 10);
        this.ctx.stroke();
        
        // Legs
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = mainColor;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y);
        this.ctx.lineTo(x - 6, y + 10);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4, y);
        this.ctx.lineTo(x + 6, y + 10);
        this.ctx.stroke();
        
        // Jumping effect - add motion lines when jumping
        if (this.player.isJumping) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(x - 15 + i * 5, y + 10 + i * 3);
                this.ctx.lineTo(x - 5 + i * 5, y + 15 + i * 3);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }

    drawObstacle(obstacle) {
        const type = obstacle.type || 'obstacle';
        
        switch (type) {
            case 'obstacle':
                // Draw rocky obstacle with gradient
                const rockGradient = this.ctx.createLinearGradient(
                    obstacle.x, obstacle.y,
                    obstacle.x, obstacle.y + obstacle.height
                );
                rockGradient.addColorStop(0, '#8B0000');
                rockGradient.addColorStop(1, '#5B0000');
                
                this.ctx.fillStyle = rockGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x + 5, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                this.ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Add texture and highlights
                this.ctx.fillStyle = 'rgba(139, 0, 0, 0.7)';
                for (let i = 0; i < 5; i++) {
                    const px = obstacle.x + 5 + Math.random() * (obstacle.width - 10);
                    const py = obstacle.y + 5 + Math.random() * (obstacle.height - 10);
                    const size = 1 + Math.random() * 3;
                    
                    this.ctx.beginPath();
                    this.ctx.arc(px, py, size, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                
                // Highlight edge
                this.ctx.strokeStyle = 'rgba(255, 200, 200, 0.3)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x + 5, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y);
                this.ctx.stroke();
                break;
                
            case 'wall':
                // Draw stone wall with gradient
                const wallGradient = this.ctx.createLinearGradient(
                    obstacle.x, obstacle.y,
                    obstacle.x, obstacle.y + obstacle.height
                );
                wallGradient.addColorStop(0, '#34495E');
                wallGradient.addColorStop(1, '#2C3E50');
                
                this.ctx.fillStyle = wallGradient;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Add brick pattern
                this.ctx.strokeStyle = 'rgba(20, 30, 40, 0.7)';
                this.ctx.lineWidth = 1;
                
                // Horizontal lines
                for (let i = 0; i < obstacle.height / 8; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(obstacle.x, obstacle.y + i * 8);
                    this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + i * 8);
                    this.ctx.stroke();
                }
                
                // Vertical lines (staggered for brick effect)
                for (let i = 0; i < obstacle.width / 10; i++) {
                    const offsetY = (i % 2) * 4; // Stagger every other column
                    this.ctx.beginPath();
                    this.ctx.moveTo(obstacle.x + i * 10, obstacle.y + offsetY);
                    this.ctx.lineTo(obstacle.x + i * 10, obstacle.y + obstacle.height);
                    this.ctx.stroke();
                }
                
                // Highlight top edge
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
                this.ctx.stroke();
                break;
                
            case 'block':
                // Draw wooden block with gradient
                const woodGradient = this.ctx.createLinearGradient(
                    obstacle.x, obstacle.y,
                    obstacle.x, obstacle.y + obstacle.height
                );
                woodGradient.addColorStop(0, '#A0522D');
                woodGradient.addColorStop(0.5, '#8B4513');
                woodGradient.addColorStop(1, '#654321');
                
                this.ctx.fillStyle = woodGradient;
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                
                // Add wood grain
                this.ctx.strokeStyle = 'rgba(60, 30, 15, 0.7)';
                this.ctx.lineWidth = 1.5;
                
                // Wood grain lines with slight curves
                for (let i = 0; i < obstacle.height / 5; i++) {
                    this.ctx.beginPath();
                    
                    // Add slight waviness to lines for natural wood look
                    const waveHeight = Math.random() * 2;
                    const startY = obstacle.y + i * 5;
                    
                    this.ctx.moveTo(obstacle.x, startY);
                    
                    // Create a wavy line with 3 control points
                    const cp1x = obstacle.x + obstacle.width * 0.25;
                    const cp1y = startY + waveHeight;
                    
                    const cp2x = obstacle.x + obstacle.width * 0.75;
                    const cp2y = startY - waveHeight;
                    
                    const endX = obstacle.x + obstacle.width;
                    const endY = startY;
                    
                    this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
                    this.ctx.stroke();
                }
                
                // Knot in the wood (random position)
                if (Math.random() > 0.5) {
                    const knotX = obstacle.x + obstacle.width * 0.3 + Math.random() * obstacle.width * 0.4;
                    const knotY = obstacle.y + obstacle.height * 0.3 + Math.random() * obstacle.height * 0.4;
                    const knotSize = 2 + Math.random() * 3;
                    
                    // Draw knot
                    this.ctx.fillStyle = '#5D4037';
                    this.ctx.beginPath();
                    this.ctx.arc(knotX, knotY, knotSize, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // Draw rings around knot
                    this.ctx.strokeStyle = '#3E2723';
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.arc(knotX, knotY, knotSize + 1, 0, 2 * Math.PI);
                    this.ctx.stroke();
                    this.ctx.beginPath();
                    this.ctx.arc(knotX, knotY, knotSize + 2, 0, 2 * Math.PI);
                    this.ctx.stroke();
                }
                break;
                
            default:
                // Fallback
                this.ctx.fillStyle = '#8B0000';
                this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    }
    
    drawText(text, x, y, size, color, align = 'center') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }
    
    // Override the parent's method with specific handling for TapToJump
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Update player's ground position based on new dimensions
            if (this.player) {
                this.player.groundY = this.canvasHeight - 100;
                // If player is on the ground, update y position too
                if (!this.player.isJumping) {
                    this.player.y = this.player.groundY;
                }
            }
        } catch (error) {
            console.error('Error in TapToJumpGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
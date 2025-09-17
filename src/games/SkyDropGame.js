import { BaseGame } from './BaseGame.js';

export class SkyDropGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Player (avatar that free-falls)
            this.player = {
                x: canvasWidth / 2,
                y: canvasHeight / 2, // Fixed position in the middle of the screen
                width: 30,
                height: 30,
                color: '#4ECDC4',
                speed: 5 // Horizontal movement speed
            };
            
            // Game setup
            this.obstacles = [];
            this.coins = [];
            this.clouds = [];
            this.spawnTimer = 0;
            this.obstacleSpawnRate = 1000; // milliseconds
            this.coinSpawnRate = 3000; // milliseconds
            this.coinTimer = 0;
            this.scrollSpeed = 3; // Initial scroll speed (objects moving up)
            this.gameTime = 40000; // 40 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.isDragging = false;
            this.dragStartX = 0;
            this.score = 0;
            this.distance = 0; // Track distance fallen
            this.maxDistance = 5000; // Distance to reach for completion
            this.backgroundOffset = 0; // For scrolling background
            
            // Initialize clouds for parallax background
            this.initClouds();
            
            console.log('SkyDropGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing SkyDropGame:', error);
            // Set minimal defaults to prevent further errors
            this.player = {
                x: 160,
                y: 240,
                width: 30,
                height: 30,
                color: '#4ECDC4',
                speed: 5
            };
            this.obstacles = [];
            this.coins = [];
            this.clouds = [];
            this.spawnTimer = 0;
            this.obstacleSpawnRate = 1000;
            this.coinSpawnRate = 3000;
            this.coinTimer = 0;
            this.scrollSpeed = 3;
            this.gameTime = 40000;
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.isDragging = false;
            this.dragStartX = 0;
            this.score = 0;
            this.distance = 0;
            this.maxDistance = 5000;
            this.backgroundOffset = 0;
        }
    }

    initClouds() {
        // Create multiple cloud layers for parallax effect
        for (let i = 0; i < 10; i++) {
            const cloudSize = Math.random() * 40 + 30;
            const cloud = {
                x: Math.random() * this.canvasWidth,
                y: Math.random() * this.canvasHeight,
                width: cloudSize * 2,
                height: cloudSize,
                speed: Math.random() * 0.5 + 0.2, // Varying speeds for parallax
                opacity: Math.random() * 0.4 + 0.1 // Varying opacities
            };
            this.clouds.push(cloud);
        }
    }

    getInstructions() {
        return "Drag horizontally to avoid obstacles as you free-fall. Collect coins for bonus points!";
    }

    start() {
        this.player.x = this.canvasWidth / 2;
        this.player.y = this.canvasHeight / 2; // Fixed vertical position
        this.obstacles = [];
        this.coins = [];
        this.clouds = [];
        this.initClouds();
        this.spawnTimer = 0;
        this.coinTimer = 0;
        this.lastTime = Date.now();
        this.timeRemaining = this.gameTime;
        this.score = 0;
        this.scrollSpeed = 3;
        this.distance = 0;
        this.backgroundOffset = 0;
        super.start();
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        this.timeRemaining -= deltaTime;
        
        // Update background offset for scrolling effect
        this.backgroundOffset += this.scrollSpeed;
        if (this.backgroundOffset > this.canvasHeight) {
            this.backgroundOffset = 0;
        }
        
        // Increase scroll speed gradually
        this.scrollSpeed += 0.001 * deltaTime;
        
        // Track distance fallen
        this.distance += this.scrollSpeed;
        
        // Check if reached target distance
        if (this.distance >= this.maxDistance) {
            this.score += 10; // Bonus for maximum distance
            // Don't end the game, allow player to continue for higher score
        }
        
        // End game if time runs out
        if (this.timeRemaining <= 0) {
            this.stop();
            return;
        }

        // Spawn obstacles
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.obstacleSpawnRate) {
            this.spawnObstacle();
            this.spawnTimer = 0;
            
            // Gradually increase difficulty by spawning obstacles faster
            this.obstacleSpawnRate = Math.max(500, this.obstacleSpawnRate - 10);
        }
        
        // Spawn coins
        this.coinTimer += deltaTime;
        if (this.coinTimer >= this.coinSpawnRate) {
            this.spawnCoin();
            this.coinTimer = 0;
        }

        // Update clouds
        for (let i = 0; i < this.clouds.length; i++) {
            this.clouds[i].y -= this.clouds[i].speed * this.scrollSpeed;
            
            // Reset clouds that move off screen
            if (this.clouds[i].y + this.clouds[i].height < 0) {
                this.clouds[i].y = this.canvasHeight;
                this.clouds[i].x = Math.random() * this.canvasWidth;
            }
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            // Move obstacles upward to create falling effect
            this.obstacles[i].y -= this.scrollSpeed;
            
            // Check collision
            if (this.checkCollision(this.player, this.obstacles[i])) {
                // Game over on collision
                this.stop();
                return;
            }
            
            // Remove obstacles that move off the top of the screen
            if (this.obstacles[i].y + this.obstacles[i].height < 0) {
                this.obstacles.splice(i, 1);
            }
        }
        
    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
        // Move coins upward to create falling effect
        this.coins[i].y -= this.scrollSpeed;
        
        // Check coin collection
        if (this.checkCollision(this.player, this.coins[i])) {
            this.score += 5; // Bonus points for collecting a coin
            this.coins.splice(i, 1);
            
            // Report score update
            if (this.onScoreUpdate) {
                this.onScoreUpdate(this.score);
            }
        }
        // Remove coins that move off the top of the screen
        else if (this.coins[i].y + this.coins[i].height < 0) {
            this.coins.splice(i, 1);
        }
    }
    
    // Add points based on distance fallen
    this.score = Math.floor(this.distance / 100);
    
    // Report score update
    if (this.onScoreUpdate) {
        this.onScoreUpdate(this.score);
    }
    }

    draw() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw sky background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#1E90FF'); // Deeper blue at top
        gradient.addColorStop(1, '#87CEEB'); // Lighter blue at bottom
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw scrolling vertical lines to enhance falling effect
        this.drawScrollingLines();
        
        // Draw clouds for parallax effect
        this.drawClouds();
        
        // Draw obstacles
        for (const obstacle of this.obstacles) {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // Add highlights to obstacles
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 5);
        }
        
        // Draw coins
        for (const coin of this.coins) {
            // Gold circle
            this.ctx.fillStyle = coin.color;
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Coin highlight
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width / 3, coin.y + coin.height / 3, coin.width / 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Coin outline
            this.ctx.strokeStyle = '#B8860B';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width / 2, coin.y + coin.height / 2, coin.width / 2, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw player (avatar)
        this.ctx.fillStyle = this.player.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
        
        // Draw face on player (simple eyes and smile)
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width / 3, this.player.y + this.player.height / 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + (this.player.width * 2 / 3), this.player.y + this.player.height / 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Smile
        this.ctx.beginPath();
        this.ctx.arc(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 5, 0, Math.PI);
        this.ctx.stroke();
        
        // Draw falling lines around player to enhance speed sensation
        this.drawSpeedLines();
        
        // Draw UI (score, timer)
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        this.ctx.textAlign = 'right';
        const secondsLeft = Math.ceil(this.timeRemaining / 1000);
        this.ctx.fillText(`Time: ${secondsLeft}s`, this.canvasWidth - 10, 30);
        
        // Draw distance indicator
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Altitude: ${Math.floor(this.distance / 10)}m`, this.canvasWidth / 2, 30);
    }
    
    drawScrollingLines() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        
        const lineSpacing = 50;
        const totalLines = this.canvasHeight / lineSpacing + 1;
        
        for (let i = 0; i < totalLines; i++) {
            const y = (i * lineSpacing + this.backgroundOffset) % this.canvasHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }
    }
    
    drawSpeedLines() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 2;
        
        const lineCount = 5;
        
        for (let i = 0; i < lineCount; i++) {
            const startX = this.player.x + this.player.width / 2;
            const startY = this.player.y + this.player.height + 10 + (i * 10);
            const length = 5 + i * 5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX - 10, startY);
            this.ctx.lineTo(startX - 10 - length, startY + length);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(startX + 10, startY);
            this.ctx.lineTo(startX + 10 + length, startY + length);
            this.ctx.stroke();
        }
    }
    
    drawClouds() {
        for (const cloud of this.clouds) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
            this.drawCloud(cloud.x, cloud.y, cloud.width, cloud.height);
        }
    }
    
    drawCloud(x, y, width, height) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, height / 2, 0, Math.PI * 2);
        this.ctx.arc(x + width / 3, y - height / 4, height / 2, 0, Math.PI * 2);
        this.ctx.arc(x + width / 1.5, y, height / 2, 0, Math.PI * 2);
        this.ctx.arc(x + width / 3, y + height / 4, height / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    spawnObstacle() {
        // Randomize obstacle width (taking up part of the screen width)
        const width = Math.random() * 120 + 60;
        
        // Randomize position (left or right side, or middle)
        const position = Math.floor(Math.random() * 3);
        let x;
        
        if (position === 0) {
            // Left side
            x = 0;
        } else if (position === 1) {
            // Right side
            x = this.canvasWidth - width;
        } else {
            // Middle with gaps on both sides
            x = (this.canvasWidth - width) / 2;
        }
        
        const obstacle = {
            x: x,
            y: this.canvasHeight,
            width: width,
            height: 20,
            color: '#8B4513' // Brown color for obstacles
        };
        
        this.obstacles.push(obstacle);
    }
    
    spawnCoin() {
        // 20% chance to spawn a coin
        if (Math.random() > 0.2) return;
        
        // Randomize position
        const x = Math.random() * (this.canvasWidth - 20);
        
        const coin = {
            x: x,
            y: this.canvasHeight,
            width: 20,
            height: 20,
            color: '#FFD700' // Gold color for coins
        };
        
        this.coins.push(coin);
    }

    checkCollision(player, object) {
        return (
            player.x < object.x + object.width &&
            player.x + player.width > object.x &&
            player.y < object.y + object.height &&
            player.y + player.height > object.y
        );
    }

    handlePointerDown(e) {
        if (!this.isRunning) return;
        this.isDragging = true;
        this.dragStartX = this.getLogicalCoordinates(e.clientX, e.clientY).x;
    }

    handlePointerMove(e) {
        if (!this.isRunning || !this.isDragging) return;
        const { x } = this.getLogicalCoordinates(e.clientX, e.clientY);
        const deltaX = x - this.dragStartX;
        this.dragStartX = x;

        this.player.x += deltaX * 1.5;
        this.player.x = Math.max(0, Math.min(this.canvasWidth - this.player.width, this.player.x));
    }

    handlePointerUp(e) {
        this.isDragging = false;
    }
}
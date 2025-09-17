import { BaseGame } from './BaseGame.js';

export class BalloonPopFrenzy extends BaseGame {
    static gameId = 'balloon-pop-frenzy';
    
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);

        // Game properties
        this.gameTime = 60000; // 60 seconds in milliseconds
        this.timeRemaining = this.gameTime;
        this.minBalloonsOnScreen = 5; // Minimum number of balloons that should be on screen
        
        this.gameState = {
            score: 0,
            balloonsPopped: 0,
            timeElapsed: 0,
            lastSpeedIncrease: 0,
            combo: 0,
            maxCombo: 0
        };

        // Balloon properties
        this.balloons = [];
        this.balloonColors = [
            '#FF6B6B', // Red
            '#4ECDC4', // Cyan
            '#FFE66D', // Yellow
            '#95E1D3', // Mint
            '#FF8B94', // Pink
            '#A8E6CF', // Light green
        ];

        // Bind event handlers
        this.handleTap = this.handleTap.bind(this);
    }

    getInstructions() {
        return "Tap the balloons to pop them! Build combos for bonus points!";
    }

    start() {
        // Initialize timing
        this.lastTime = Date.now();
        this.timeRemaining = this.gameTime;
        
        // Initialize game state
        this.gameState = {
            score: 0,
            balloonsPopped: 0,
            timeElapsed: 0,
            lastSpeedIncrease: 0,
            combo: 0,
            maxCombo: 0
        };

        // Clear balloons array
        this.balloons = [];

        // Initial balloon spawn
        this.spawnInitialBalloons();

        // Add event listeners
        this.canvas.addEventListener('click', this.handleTap);
        this.canvas.addEventListener('touchstart', this.handleTap);

        // Call super.start() after our initialization
        super.start();
        
        // Log canvas dimensions
        console.log(`Canvas dimensions: ${this.canvas.width} x ${this.canvas.height}`);
    }
    
    // Spawn initial balloons distributed across the screen
    spawnInitialBalloons() {
        // Clear existing balloons
        this.balloons = [];
        
        // Get the safe area of the screen (inset from edges)
        const safeWidth = this.canvas.width * 0.8;
        const safeHeight = this.canvas.height * 0.8;
        const offsetX = (this.canvas.width - safeWidth) / 2;
        const offsetY = (this.canvas.height - safeHeight) / 2;
        
        console.log(`Safe area: ${safeWidth}x${safeHeight}, offset: ${offsetX},${offsetY}`);
        
        // Add balloons distributed across the screen
        for (let i = 0; i < this.minBalloonsOnScreen; i++) {
            // Calculate position in the safe area
            const x = offsetX + Math.random() * safeWidth;
            const y = offsetY + Math.random() * safeHeight;
            
            const newBalloon = this.createBalloon(x, y);
            newBalloon.speedFactor = 0.2 + Math.random() * 0.3; // Very slow initial speed
            this.balloons.push(newBalloon);
            console.log(`Initial balloon at x: ${x}, y: ${y}, size: ${newBalloon.size}`);
        }
    }

    stop() {
        super.stop();
        
        // Remove event listeners
        this.canvas.removeEventListener('click', this.handleTap);
        this.canvas.removeEventListener('touchstart', this.handleTap);
    }

    createBalloon(x, y) {
        const size = Math.random() * 20 + 60; // Random size between 60 and 80 (MUCH bigger)
        const speed = Math.random() * 0.5 + 0.3; // Random speed between 0.3 and 0.8 (MUCH slower)
        const color = this.balloonColors[Math.floor(Math.random() * this.balloonColors.length)];
        
        return {
            x: x,
            y: y,
            size: size,
            speed: speed,
            color: color,
            scale: 1,
            popped: false,
            popAnimationTime: 0,
            points: Math.floor(30 / size * speed) + 5 // More points for smaller, faster balloons
        };
    }

    spawnBalloons() {
        // Remove fully popped balloons
        this.balloons = this.balloons.filter(balloon => !balloon.popped || balloon.scale > 0);
        
        // Count unpopped balloons
        const unpoppedBalloons = this.balloons.filter(balloon => !balloon.popped).length;
        console.log(`Unpopped balloons: ${unpoppedBalloons}, Total balloons: ${this.balloons.length}`);
        
        // Calculate how many balloons to add
        const balloonsToAdd = Math.max(0, this.minBalloonsOnScreen - unpoppedBalloons);
        console.log(`Adding ${balloonsToAdd} new balloons`);
        
        // Add new balloons at completely visible positions
        for (let i = 0; i < balloonsToAdd; i++) {
            // Calculate a safe position that's fully visible
            const margin = 60; // Keep away from edges
            const x = margin + Math.random() * (this.canvas.width - margin * 2);
            const y = this.canvas.height - margin; // Start near bottom but fully visible
            
            const newBalloon = this.createBalloon(x, y);
            newBalloon.speedFactor = 0.2 + Math.random() * 0.3; // Slow initial speed
            this.balloons.push(newBalloon);
            console.log(`Created balloon at x: ${x}, y: ${y}, size: ${newBalloon.size}`);
        }
    }

    handleTap(e) {
        e.preventDefault();
        if (!this.isRunning) return;

        // Get tap coordinates
        const rect = this.canvas.getBoundingClientRect();
        let x, y;
        
        // Handle both mouse clicks and touch events
        if (e.type === 'touchstart') {
            if (e.touches.length > 0) {
                x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
                y = (e.touches[0].clientY - rect.top) * (this.canvas.height / rect.height);
            } else {
                return; // No touch points
            }
        } else {
            x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        }

        console.log(`Tap at x: ${x.toFixed(1)}, y: ${y.toFixed(1)}. Balloons count: ${this.balloons.length}`);
        
        // ULTRA FORGIVING HIT DETECTION
        // Find any unpopped balloon within a very generous radius
        let closestBalloon = null;
        let closestDistance = Infinity;
        
        // First pass: Find the closest balloon
        for (const balloon of this.balloons) {
            if (balloon.popped) continue;

            const distance = Math.sqrt(
                Math.pow(x - balloon.x, 2) + 
                Math.pow(y - balloon.y, 2)
            );
            
            console.log(`Checking balloon at x: ${balloon.x.toFixed(1)}, y: ${balloon.y.toFixed(1)}, size: ${balloon.size.toFixed(1)}, distance: ${distance.toFixed(1)}`);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestBalloon = balloon;
            }
        }
        
        // EXTREMELY generous hit detection - 4x the balloon size or 200px, whichever is larger
        const hitThreshold = Math.max(200, closestBalloon ? closestBalloon.size * 4 : 0);
        
        if (closestBalloon && closestDistance < hitThreshold) {
            console.log(`✅ BALLOON POPPED! Distance: ${closestDistance.toFixed(1)}, threshold: ${hitThreshold.toFixed(1)}`);
            
            // Create particle effect at balloon position
            this.createPopEffect(closestBalloon.x, closestBalloon.y, closestBalloon.color);
            
            closestBalloon.popped = true;
            this.gameState.balloonsPopped++;
            
            // Increase combo and score
            this.gameState.combo++;
            const comboMultiplier = Math.min(5, Math.floor(this.gameState.combo / 5) + 1);
            this.gameState.score += closestBalloon.points * comboMultiplier;
            
            // Update max combo
            this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.combo);
            
            return; // Exit after successful pop
        } else if (closestBalloon) {
            console.log(`❌ MISS! Distance: ${closestDistance.toFixed(1)}, threshold: ${hitThreshold.toFixed(1)}`);
        }

        // Reset combo if no balloon was hit
        this.gameState.combo = 0;

        // Update score
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.gameState.score);
        }
    }
    
    // Create particle effect when balloon is popped
    createPopEffect(x, y, color) {
        // We'll add this functionality later if needed
        console.log(`Pop effect at ${x}, ${y} with color ${color}`);
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update timers
        this.timeRemaining -= deltaTime;
        this.gameState.timeElapsed += deltaTime;

        // Check if game should end due to time
        if (this.timeRemaining <= 0) {
            this.stop();
            return;
        }

        // Update balloon positions and animations
        for (const balloon of this.balloons) {
            if (balloon.popped) {
                // Update pop animation
                balloon.popAnimationTime += deltaTime;
                balloon.scale = Math.max(0, 1 - (balloon.popAnimationTime / 500)); // Pop animation takes 500ms
            } else {
                // Very slow upward movement
                const speedFactor = balloon.speedFactor || 0.3; // Default to slow if not set
                const moveAmount = speedFactor * (deltaTime / 30); // Very slow movement
                
                balloon.y -= moveAmount;
                
                // Add small horizontal movement for more interesting visuals (tiny amount)
                balloon.x += Math.sin(currentTime / 2000 + balloon.x) * 0.1;
                
                // Keep balloons within the screen bounds horizontally
                const margin = balloon.size;
                if (balloon.x < margin) balloon.x = margin;
                if (balloon.x > this.canvas.width - margin) balloon.x = this.canvas.width - margin;
                
                // Remove balloons that have gone off screen (top)
                if (balloon.y < -balloon.size) {
                    balloon.popped = true;
                }
            }
        }

        // Spawn new balloons
        this.spawnBalloons();

        // Increase difficulty very slowly over time
        if (this.gameState.timeElapsed - this.gameState.lastSpeedIncrease >= 15000) { // Every 15 seconds
            this.minBalloonsOnScreen = Math.min(8, this.minBalloonsOnScreen + 1);
            this.gameState.lastSpeedIncrease = this.gameState.timeElapsed;
        }
    }

    draw() {
        if (!this.ctx) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background with a gradient
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGradient.addColorStop(0, '#1a1a2a');
        bgGradient.addColorStop(1, '#2a2a3a');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw some clouds or decorative elements in the background
        this.drawClouds();

        // Draw balloons
        for (const balloon of this.balloons) {
            if (balloon.scale <= 0) continue;

            this.ctx.save();
            this.ctx.translate(balloon.x, balloon.y);
            this.ctx.scale(balloon.scale, balloon.scale);

            // Draw balloon glow for better visibility
            const glowSize = balloon.size * 1.1;
            const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            const rgbColor = this.hexToRgb(balloon.color);
            glowGradient.addColorStop(0, `rgba(${rgbColor[0]},${rgbColor[1]},${rgbColor[2]},0.7)`);
            glowGradient.addColorStop(1, `rgba(${rgbColor[0]},${rgbColor[1]},${rgbColor[2]},0)`);
            
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw balloon
            this.ctx.beginPath();
            this.ctx.fillStyle = balloon.popped ? 
                `rgba(${rgbColor.join(',')},${balloon.scale})` : 
                balloon.color;
            
            // Balloon body (circle)
            this.ctx.beginPath();
            this.ctx.arc(0, 0, balloon.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Add highlight to balloon for 3D effect
            this.ctx.beginPath();
            this.ctx.arc(-balloon.size/3, -balloon.size/3, balloon.size/3, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fill();

            // Balloon tie and string
            if (!balloon.popped) {
                // Tie (small triangle at bottom)
                this.ctx.beginPath();
                this.ctx.moveTo(-5, balloon.size);
                this.ctx.lineTo(5, balloon.size);
                this.ctx.lineTo(0, balloon.size + 10);
                this.ctx.closePath();
                this.ctx.fillStyle = this.darkenColor(balloon.color, 40);
                this.ctx.fill();
                
                // String
                this.ctx.beginPath();
                this.ctx.moveTo(0, balloon.size + 10);
                this.ctx.quadraticCurveTo(10, balloon.size + 20, 0, balloon.size + 40);
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            } else if (balloon.popAnimationTime < 300) {
                // If recently popped, show "pop" effect
                this.ctx.font = `${Math.round(balloon.size)}px Arial`;
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('POP!', 0, 0);
            }

            this.ctx.restore();
        }

        // Draw score and stats with enhanced visibility
        const padding = 20;
        const fontSize = 24;
        this.ctx.font = `bold ${fontSize}px Arial`;
        
        // Draw time remaining
        const timeLeft = Math.ceil(this.timeRemaining / 1000);
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = timeLeft <= 10 ? '#FF4444' : '#FFFFFF';
        
        // Add text shadow for better visibility
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText(`Time: ${timeLeft}s`, this.canvas.width - padding, fontSize + padding);
        
        // Draw score and stats
        this.ctx.textAlign = 'left';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(`Score: ${this.gameState.score}`, padding, fontSize + padding);
        
        // Draw combo with pulse effect
        if (this.gameState.combo > 0) {
            const comboText = `Combo: ${this.gameState.combo}x`;
            const comboMultiplier = Math.min(5, Math.floor(this.gameState.combo / 5) + 1);
            const multiplierText = `×${comboMultiplier}`;
            
            // Create pulsing effect for combo based on game time
            const pulseFactor = 1 + Math.sin(this.gameState.timeElapsed / 200) * 0.1;
            
            this.ctx.fillStyle = this.getComboColor(this.gameState.combo);
            this.ctx.font = `bold ${Math.round(fontSize * pulseFactor)}px Arial`;
            this.ctx.fillText(comboText, padding, fontSize * 2 + padding);
            
            // Draw multiplier with larger text for emphasis
            if (comboMultiplier > 1) {
                this.ctx.font = `bold ${Math.round(fontSize * 1.2 * pulseFactor)}px Arial`;
                this.ctx.fillText(multiplierText, padding + 150, fontSize * 2 + padding);
            }
        }
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    // Draw decorative clouds in the background
    drawClouds() {
        const cloudCount = 3;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        
        // Use time to slightly move clouds
        const timeOffset = (this.gameState.timeElapsed / 10000) % 1;
        
        for (let i = 0; i < cloudCount; i++) {
            const x = ((i / cloudCount) + timeOffset) % 1 * this.canvas.width;
            const y = this.canvas.height * (0.2 + i * 0.25);
            const size = 50 + i * 20;
            
            // Draw cloud (multiple overlapping circles)
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.arc(x + size * 0.6, y - size * 0.1, size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(x - size * 0.6, y - size * 0.1, size * 0.7, 0, Math.PI * 2);
            this.ctx.arc(x - size * 0.3, y - size * 0.4, size * 0.6, 0, Math.PI * 2);
            this.ctx.arc(x + size * 0.3, y - size * 0.4, size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // Get color based on combo level for visual feedback
    getComboColor(combo) {
        if (combo >= 20) return '#FF00FF'; // Purple for awesome combos
        if (combo >= 15) return '#FFD700'; // Gold
        if (combo >= 10) return '#FFA500'; // Orange
        if (combo >= 5) return '#FFFF00';  // Yellow
        return '#FFFFFF';                   // White for basic combos
    }
    
    // Helper function to darken a color
    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        const darken = (color) => Math.floor(color * (100 - percent) / 100);
        
        return `rgb(${darken(rgb[0])}, ${darken(rgb[1])}, ${darken(rgb[2])})`;
    }

    // Helper function to convert hex color to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0, 0, 0];
    }
}
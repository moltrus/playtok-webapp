import { BaseGame } from './BaseGame';

export class ColorMatchTapGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        // Update logical dimensions first
        this.updateLogicalDimensions();
        this.circles = [];
        this.gameTime = 30000; // 30 seconds
        this.timeRemaining = this.gameTime;
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.circleRadius = 30;
        this.spawnRate = 1500; // milliseconds
        this.particles = [];
        
        // Initialize the game state properly
        console.log('ColorMatchTapGame initialized');
        
        // Color scheme for the game
        this.colors = [
            { name: 'Red', hex: '#FF3A3A' },
            { name: 'Blue', hex: '#3A66FF' },
            { name: 'Green', hex: '#3AFF3A' },
            { name: 'Yellow', hex: '#FFFF3A' },
            { name: 'Purple', hex: '#AA3AFF' }
        ];
        
        this.targetColorIndex = 0;
        this.targetColor = this.colors[this.targetColorIndex];
        this.streak = 0;
        this.streakThreshold = 5; // Get bonus points every 5 correct taps
        this.nextTargetChangeTime = 5000; // Change target color every 5 seconds
    }

    getInstructions() {
        return "🎯 Tap the circles that match the target color at the top! 🎯";
    }

    start() {
        this.lastTime = Date.now();
        this.score = 0;
        this.streak = 0;
        this.targetColorIndex = Math.floor(Math.random() * this.colors.length);
        this.targetColor = this.colors[this.targetColorIndex];
        this.nextTargetChangeTime = 5000;
        this.timeRemaining = this.gameTime;
        this.circles = [];
        this.particles = [];
        console.log('ColorMatchTap game started with target color:', this.targetColor.name);
        super.start();
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.timeRemaining -= deltaTime;
        this.nextTargetChangeTime -= deltaTime;
        
        // Change target color every 5 seconds
        if (this.nextTargetChangeTime <= 0) {
            // Select a new target color that's different from the current one
            let newColorIndex;
            do {
                newColorIndex = Math.floor(Math.random() * this.colors.length);
            } while (newColorIndex === this.targetColorIndex);
            
            this.targetColorIndex = newColorIndex;
            this.targetColor = this.colors[this.targetColorIndex];
            this.nextTargetChangeTime = 5000; // Reset timer
            console.log('Target color changed to:', this.targetColor.name);
        }
        
        if (this.timeRemaining <= 0) {
            this.stop();
            return;
        }

        this.spawnCircles();
        this.updateCircles(deltaTime);
        this.updateParticles(deltaTime);
        
        // Report score changes to parent component
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.score);
        }
    }

    spawnCircles() {
        this.spawnTimer += 16;
        
        if (this.spawnTimer >= this.spawnRate) {
            // Generate random non-overlapping positions
            const maxAttempts = 10;
            let attempts = 0;
            let valid = false;
            let x, y;
            
            while (!valid && attempts < maxAttempts) {
                x = Math.random() * (this.logicalWidth - this.circleRadius * 2) + this.circleRadius;
                y = Math.random() * (this.logicalHeight - 150 - this.circleRadius * 2) + this.circleRadius + 100;
                
                valid = true;
                // Check overlap with existing circles
                for (const circle of this.circles) {
                    const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
                    if (distance < this.circleRadius * 2.2) {
                        valid = false;
                        break;
                    }
                }
                
                attempts++;
            }
            
            if (valid) {
                // 30% chance for the circle to match the target color
                const isTarget = Math.random() < 0.3;
                
                let colorIndex;
                if (isTarget) {
                    colorIndex = this.targetColorIndex;
                } else {
                    // Select a non-target color
                    do {
                        colorIndex = Math.floor(Math.random() * this.colors.length);
                    } while (colorIndex === this.targetColorIndex);
                }
                
                const circle = {
                    x: x,
                    y: y,
                    radius: this.circleRadius,
                    colorIndex: colorIndex,
                    color: this.colors[colorIndex],
                    life: 3000, // 3 seconds to tap
                    maxLife: 3000,
                    isTarget: isTarget,
                    pulsePhase: Math.random() * Math.PI * 2, // Random pulse timing
                    scale: 0.1, // Start small
                    targetScale: 1.0, // Grow to full size
                };
                
                this.circles.push(circle);
            }
            
            this.spawnTimer = 0;
            
            // Increase difficulty over time
            if (this.spawnRate > 700) {
                this.spawnRate -= 10;
            }
        }
    }

    updateCircles(deltaTime) {
        for (let i = this.circles.length - 1; i >= 0; i--) {
            const circle = this.circles[i];
            
            // Update life
            circle.life -= deltaTime;
            
            // Update scale (for grow animation)
            if (circle.scale < circle.targetScale) {
                circle.scale += 0.05;
                if (circle.scale > circle.targetScale) {
                    circle.scale = circle.targetScale;
                }
            }
            
            if (circle.life <= 0) {
                // If it was a target that disappeared, penalize player
                if (circle.isTarget) {
                    this.streak = 0; // Reset streak
                }
                
                this.circles.splice(i, 1);
            }
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Update life
            particle.life--;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) {
            console.error('No context available for drawing');
            return;
        }
        
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        // Background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
        gradient.addColorStop(0, '#2C3E50');
        gradient.addColorStop(1, '#243240');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
        
        // Draw target color display at the top
        this.drawTargetColorDisplay();
        
        // Draw circles
        for (const circle of this.circles) {
            this.drawCircle(circle);
        }
        
        // Draw particles
        for (const particle of this.particles) {
            this.drawParticle(particle);
        }
        
        // UI
        this.drawText(`Score: ${this.score}`, 10, 30, 20, 'white', 'left');
        this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, this.logicalWidth - 10, 30, 20, 'white', 'right');
        
        // Draw streak
        if (this.streak > 0) {
            this.drawText(`Streak: ${this.streak}`, this.logicalWidth / 2, this.logicalHeight - 30, 16, '#FFD700');
        }
    }
    
    drawTargetColorDisplay() {
        // Background for the target color section
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 50, this.logicalWidth, 60);
        
        // Draw text
        this.drawText('Match this color:', this.logicalWidth / 2, 70, 18, 'white');
        
        // Draw target color circle
        this.ctx.fillStyle = this.targetColor.hex;
        this.ctx.beginPath();
        this.ctx.arc(this.logicalWidth / 2, 95, 15, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add outline
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawCircle(circle) {
        const alpha = circle.life / circle.maxLife;
        const actualRadius = circle.radius * circle.scale;
        
        // Main circle fill
        this.ctx.fillStyle = circle.color.hex;
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, actualRadius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Inner highlight
        const gradientX = circle.x - actualRadius * 0.3;
        const gradientY = circle.y - actualRadius * 0.3;
        
        const shineGradient = this.ctx.createRadialGradient(
            gradientX, gradientY, 0,
            gradientX, gradientY, actualRadius * 0.8
        );
        shineGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.7})`);
        shineGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        this.ctx.fillStyle = shineGradient;
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, actualRadius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Circle outline
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, actualRadius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // For target circles, add a subtle pulsing effect
        if (circle.isTarget) {
            const pulseSize = Math.sin((Date.now() + circle.pulsePhase * 1000) / 200) * 3;
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(circle.x, circle.y, actualRadius + pulseSize, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
    }

    drawParticle(particle) {
        const alpha = particle.life / 30;
        this.ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, 3, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    checkTap(x, y) {
        // Check each circle to see if it was tapped
        for (let i = this.circles.length - 1; i >= 0; i--) {
            const circle = this.circles[i];
            const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
            
            // If tap is within the circle
            if (distance <= circle.radius * circle.scale) {
                this.circles.splice(i, 1); // Remove the circle
                
                // Check if the color matches the target
                if (circle.colorIndex === this.targetColorIndex) {
                    // Correct tap
                    this.streak++;
                    this.score++;
                    
                    // Bonus for streaks
                    if (this.streak % this.streakThreshold === 0) {
                        // Bonus point every 5 consecutive correct taps
                        this.score++;
                        this.createHitEffect(circle.x, circle.y, '#FFD700'); // Gold effect for bonus
                    } else {
                        this.createHitEffect(circle.x, circle.y, '#00FF00'); // Green for correct
                    }
                    
                    return true;
                } else {
                    // Wrong color tapped - penalize and reset streak
                    this.score = Math.max(0, this.score - 1);
                    this.streak = 0;
                    this.createHitEffect(circle.x, circle.y, '#FF0000'); // Red for wrong
                    return false;
                }
            }
        }
        
        return false;
    }

    createHitEffect(x, y, color) {
        // Simple hit effect with particles
        const particleCount = 10;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30,
                color: color
            };
            
            this.particles.push(particle);
        }
    }

    handleTap(x, y) {
        if (!this.isRunning) return;
        this.checkTap(x, y);
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        
        if (!this.isRunning) return;
        
        const pos = this.getTouchPos(e);
        this.checkTap(pos.x, pos.y);
    }

    handleMouseDown(e) {
        super.handleMouseDown(e);
        
        if (!this.isRunning) return;
        
        const pos = this.getMousePos(e);
        this.checkTap(pos.x, pos.y);
    }

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        
        if (!touch) return { x: 0, y: 0 };
        
        return {
            x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
            y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }
    
    drawText(text, x, y, size = 24, color = 'white', align = 'center') {
        if (!this.ctx) {
            console.error('No context available for drawing text');
            return;
        }
        
        try {
            this.ctx.font = `${size}px Arial, sans-serif`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y);
        } catch (error) {
            console.error('Error drawing text:', error);
        }
    }
    destroy() {
        this.isRunning = false;
        this.circles = [];
        super.destroy();
    }
}
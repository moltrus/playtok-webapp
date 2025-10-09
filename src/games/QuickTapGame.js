import { BaseGame } from './BaseGame.js';

export class QuickTapGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        this.updateLogicalDimensions();
        this.targets = [];
        this.distractors = [];
        this.particles = [];
        this.flashEffect = null;
        this.gameTime = 30000; // 30 seconds
        this.timeRemaining = this.gameTime;
        this.lastTime = 0;
        this.spawnTimer = 0;
        this.targetColor = '#FF6B6B';
        this.distractorColors = ['#9B59B6', '#45B7D1', '#27AE60', '#E67E22'];
        this.gemTypes = ['ruby', 'emerald', 'sapphire', 'topaz', 'aquamarine'];
        this.targetRadius = 25;
        this.spawnRate = 1200; // milliseconds
    }

    getInstructions() {
        return "💎 Tap only the RED gems! Avoid the others! ✨";
    }

    start() {
        console.log('QuickTapGame start called');
        // Reset game state
        this.targets = [];
        this.distractors = [];
        this.particles = [];
        this.timeRemaining = this.gameTime;
        this.score = 0;
        
        // Ensure lastTime is set to current time to prevent large time jumps
        this.lastTime = Date.now();
        console.log('Game time initialized to:', this.gameTime, 'ms');
        console.log('Last time set to:', this.lastTime);
        
        // Start the game
        super.start();
    }

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        let deltaTime = currentTime - this.lastTime;
        
        // Check for extremely large time jumps which could cause game to end instantly
        if (deltaTime > 5000) {
            console.log('Very large time delta detected:', deltaTime, 'ms. Resetting to prevent instant game over.');
            deltaTime = 16; // Use a reasonable frame time (~60fps)
        } 
        // Safety check for unreasonable delta time (e.g., after tab switch)
        else if (deltaTime > 100) {
            deltaTime = 100; // Cap at 100ms to prevent huge jumps
        }
        
        this.lastTime = currentTime;

        // Update time with logging to track timer issues
        this.timeRemaining -= deltaTime;
        
        // Debug time tracking
        if (deltaTime > 1000) {
            console.log(`Large time decrease: ${deltaTime}ms. Time remaining: ${this.timeRemaining}ms`);
        }
        
        // Game over check
        if (this.timeRemaining <= 0) {
            console.log('Game over due to time expiring. Initial game time:', this.gameTime, 'ms');
            this.stop();
            return;
        }

        this.spawnShapes();
        this.updateShapes();
    }

    spawnShapes() {
        this.spawnTimer += 16;
        
        if (this.spawnTimer >= this.spawnRate) {
            const isTarget = Math.random() < 0.4; // 40% chance for target
            
            // Ensure shapes appear within visible canvas bounds
            const margin = this.targetRadius * 2;
            const x = Math.random() * (this.canvasWidth - margin) + this.targetRadius;
            const y = Math.random() * (this.canvasHeight - margin - 60) + this.targetRadius + 40; // Add some space for UI
            
            const shape = {
                x: x,
                y: y,
                radius: this.targetRadius,
                life: 2000, // 2 seconds to tap
                maxLife: 2000,
                isTarget: isTarget,
                pulsePhase: Math.random() * Math.PI * 2
            };
            
            if (isTarget) {
                shape.color = this.targetColor;
                shape.gemType = 'ruby';
                this.targets.push(shape);
            } else {
                const colorIndex = Math.floor(Math.random() * this.distractorColors.length);
                shape.color = this.distractorColors[colorIndex];
                shape.gemType = this.gemTypes[colorIndex + 1];
                this.distractors.push(shape);
            }
            
            this.spawnTimer = 0;
            
            // Increase difficulty over time
            if (this.spawnRate > 600) {
                this.spawnRate -= 20;
            }
        }
    }

    updateShapes() {
        // Update targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            this.targets[i].life -= 16;
            if (this.targets[i].life <= 0) {
                this.targets.splice(i, 1);
                // Missed a target, lose points
                this.updateScore(Math.max(0, this.score - 5));
            }
        }
        
        // Update distractors
        for (let i = this.distractors.length - 1; i >= 0; i--) {
            this.distractors[i].life -= 16;
            if (this.distractors[i].life <= 0) {
                this.distractors.splice(i, 1);
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#2C3E50');
        gradient.addColorStop(1, '#4A6741');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw targets with gem effects
        for (const target of this.targets) {
            const alpha = target.life / target.maxLife;
            this.drawGem(target, alpha);
            
            // Add special pulsing effect for targets
            const pulseRadius = target.radius + Math.sin((Date.now() + target.pulsePhase * 1000) / 200) * 8;
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(target.x, target.y, pulseRadius, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
        
        // Draw distractors with gem effects
        for (const distractor of this.distractors) {
            const alpha = distractor.life / distractor.maxLife;
            this.drawGem(distractor, alpha);
        }
        
        // Draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update particle
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            // Draw particle
            const alpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Draw flash effect
        if (this.flashEffect) {
            const alpha = this.flashEffect.life / this.flashEffect.maxLife;
            this.ctx.fillStyle = this.flashEffect.color.replace(')', `, ${alpha * 0.5})`).replace('rgb', 'rgba');
            this.ctx.beginPath();
            this.ctx.arc(this.flashEffect.x, this.flashEffect.y, this.flashEffect.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.flashEffect.life--;
            if (this.flashEffect.life <= 0) {
                this.flashEffect = null;
            }
        }
        
        // UI
        this.drawText(`Score: ${this.score}`, 10, 30, 20, 'white', 'left');
        this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, this.canvasWidth - 10, 30, 20, 'white', 'right');
        this.drawText('💎 TAP RED GEMS ONLY! 💎', this.canvasWidth / 2, this.canvasHeight - 30, 16, '#FFD700');
    }

    checkTap(x, y) {
        // Check targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
            
            if (distance <= target.radius) {
                this.targets.splice(i, 1);
                this.updateScore(this.score + 10);
                this.createHitEffect(target.x, target.y, '#00FF00');
                return true;
            }
        }
        
        // Check distractors (penalty)
        for (let i = this.distractors.length - 1; i >= 0; i--) {
            const distractor = this.distractors[i];
            const distance = Math.sqrt((x - distractor.x) ** 2 + (y - distractor.y) ** 2);
            
            if (distance <= distractor.radius) {
                this.distractors.splice(i, 1);
                this.updateScore(Math.max(0, this.score - 10));
                this.createHitEffect(distractor.x, distractor.y, '#FF0000');
                return false;
            }
        }
        
        return false;
    }

    createHitEffect(x, y, color) {
        // Create particles for a more visible hit effect
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const particle = {
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                life: 30,
                maxLife: 30,
                size: 3 + Math.random() * 5
            };
            this.particles.push(particle);
        }
        
        // Add a flash effect (drawn in the main draw method)
        this.flashEffect = {
            x: x,
            y: y,
            radius: this.targetRadius * 1.5,
            life: 10,
            maxLife: 10,
            color: color
        };
    }

    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        const pos = this.getTouchPos(e);
        this.checkTap(pos.x, pos.y);
    }

    handleMouseDown(e) {
        super.handleMouseDown(e);
        const pos = this.getMousePos(e);
        this.checkTap(pos.x, pos.y);
    }

    drawGem(shape, alpha) {
        // Save context
        this.ctx.save();

        // Convert hex color to RGB values
        let r, g, b;
        if (shape.color.startsWith('#')) {
            const hex = shape.color.slice(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else {
            r = 76; g = 205; b = 196; // Fallback teal
        }
        
        // Shadow effect
        this.ctx.shadowColor = `rgba(0, 0, 0, ${alpha * 0.5})`;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        
        // Main gem body with gradient
        const gradient = this.ctx.createRadialGradient(
            shape.x - shape.radius * 0.3, shape.y - shape.radius * 0.3, 0,
            shape.x, shape.y, shape.radius
        );
        gradient.addColorStop(0, `rgba(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)}, ${alpha})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, ${alpha})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Reset shadow for other elements
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Inner shine/highlight
        const shineGradient = this.ctx.createRadialGradient(
            shape.x - shape.radius * 0.4, shape.y - shape.radius * 0.4, 0,
            shape.x - shape.radius * 0.4, shape.y - shape.radius * 0.4, shape.radius * 0.6
        );
        shineGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
        shineGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        
        this.ctx.fillStyle = shineGradient;
        this.ctx.beginPath();
        this.ctx.arc(shape.x - shape.radius * 0.2, shape.y - shape.radius * 0.2, shape.radius * 0.6, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Gem facets (octagonal shape)
        this.ctx.strokeStyle = `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, ${alpha * 0.7})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        const facets = 8;
        for (let i = 0; i < facets; i++) {
            const angle = (i * Math.PI * 2) / facets;
            const x = shape.x + Math.cos(angle) * shape.radius * 0.7;
            const y = shape.y + Math.sin(angle) * shape.radius * 0.7;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Sparkle effect for extra visual appeal
        if (alpha > 0.5) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            for (let i = 0; i < 3; i++) {
                const sparkleAngle = (Date.now() / 1000 + i * Math.PI * 2 / 3) % (Math.PI * 2);
                const sparkleX = shape.x + Math.cos(sparkleAngle) * shape.radius * 0.8;
                const sparkleY = shape.y + Math.sin(sparkleAngle) * shape.radius * 0.8;
                
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, 2, 0, 2 * Math.PI);
                this.ctx.fill();
            }
        }
        
        // Restore context
        this.ctx.restore();
    }

    drawText(text, x, y, size, color, align = 'center') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }
}
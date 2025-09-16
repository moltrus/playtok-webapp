import { BaseGame } from './BaseGame.js';

export class FruitSliceGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            this.fruits = [];
            this.sliceTrail = [];
            this.misses = 0;
            this.maxMisses = 3;
            this.spawnTimer = 0;
            this.gameTime = 45000; // 45 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.isSlicing = false;
            
            this.fruitTypes = [
                { color: '#FF4444', points: 10, name: 'Apple' },
                { color: '#FFA500', points: 15, name: 'Orange' },
                { color: '#FFFF00', points: 12, name: 'Banana' },
                { color: '#FF6666', points: 8, name: 'Red Apple' },
                { color: '#FF8C00', points: 20, name: 'Tangerine' }
            ];
            
            console.log('FruitSliceGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing FruitSliceGame:', error);
            // Set minimal defaults to prevent further errors
            this.fruits = [];
            this.sliceTrail = [];
            this.misses = 0;
            this.maxMisses = 3;
            this.spawnTimer = 0;
            this.gameTime = 45000;
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.fruitTypes = [];
        }
    }

    getInstructions() {
        return "🍎 Slice the juicy fruits! Don't miss 3 times! 🍌";
    }

    start() {
        console.log('Starting FruitSliceGame');
        
        try {
            // Reset game state
            this.fruits = [];
            this.sliceTrail = [];
            this.misses = 0;
            this.score = 0;
            this.updateScore(0);
            
            // Reset timers
            this.lastTime = Date.now();
            this.timeRemaining = this.gameTime;
            this.spawnTimer = 0;
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in FruitSliceGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
        }
    }

    update() {
        if (!this.isRunning) return;

        try {
            const currentTime = Date.now();
            
            // Ensure lastTime is initialized to prevent large deltaTime
            if (!this.lastTime) {
                this.lastTime = currentTime;
            }
            
            const deltaTime = currentTime - this.lastTime;
            
            // Check for extremely large time jumps which could cause game to end instantly
            let adjustedDeltaTime = deltaTime;
            if (deltaTime > 5000) {
                console.log('Very large time delta detected:', deltaTime, 'ms. Capping to prevent instant game over.');
                adjustedDeltaTime = 100; // Cap at 100ms to prevent huge jumps
            }
            
            this.lastTime = currentTime;
            this.timeRemaining -= adjustedDeltaTime;
            
            if (this.timeRemaining <= 0 || this.misses >= this.maxMisses) {
                console.log('Game over. Time remaining:', this.timeRemaining, 'Misses:', this.misses);
                this.stop();
                return;
            }

            this.updateFruits();
            this.spawnFruits();
            this.updateSliceTrail();
        } catch (error) {
            console.error('Error in FruitSliceGame.update():', error);
            // Don't stop the game for a single frame error
        }
    }

    updateFruits() {
        try {
            if (!this.fruits || !Array.isArray(this.fruits)) {
                console.error('Fruits array is invalid');
                this.fruits = [];
                return;
            }
            
            // Get safe canvas dimensions
            const canvasHeight = this.canvasHeight || 480;
            const canvasWidth = this.canvasWidth || 320;
            
            for (let i = this.fruits.length - 1; i >= 0; i--) {
                const fruit = this.fruits[i];
                
                // Skip invalid fruits
                if (!fruit) {
                    this.fruits.splice(i, 1);
                    continue;
                }
                
                // Update physics
                fruit.velocityY += fruit.gravity;
                fruit.x += fruit.velocityX;
                fruit.y += fruit.velocityY;
                fruit.rotation += 0.05;
                
                // Check if fruit fell off screen
                if (fruit.y > canvasHeight + 50) {
                    if (!fruit.sliced) {
                        this.misses++;
                    }
                    this.fruits.splice(i, 1);
                }
                
                // Remove if off screen horizontally
                if (fruit.x < -50 || fruit.x > canvasWidth + 50) {
                    this.fruits.splice(i, 1);
                }
            }
        } catch (error) {
            console.error('Error in updateFruits:', error);
        }
    }

    spawnFruits() {
        try {
            // Increment timer
            this.spawnTimer += 16;
            
            // Get safe canvas dimensions
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Ensure fruitTypes is valid
            if (!this.fruitTypes || !Array.isArray(this.fruitTypes) || this.fruitTypes.length === 0) {
                this.fruitTypes = [
                    { color: '#FF4444', points: 10, name: 'Apple' },
                    { color: '#FFA500', points: 15, name: 'Orange' }
                ];
            }
            
            if (this.spawnTimer >= 1500) { // Spawn every 1.5 seconds
                // Reset timer with some randomness for more natural spawning
                this.spawnTimer = Math.random() * 200;
                
                const fruitType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];
                const fruit = {
                    x: Math.random() * (canvasWidth - 60) + 30,
                    y: canvasHeight + 30,
                    radius: 25,
                    velocityX: (Math.random() - 0.5) * 4,
                    velocityY: -12 - Math.random() * 4,
                    gravity: 0.4,
                    color: fruitType.color,
                    points: fruitType.points,
                    sliced: false,
                    rotation: 0
                };
                
                if (this.fruits && Array.isArray(this.fruits)) {
                    this.fruits.push(fruit);
                } else {
                    this.fruits = [fruit];
                }
                
                this.spawnTimer = 0;
            }
        } catch (error) {
            console.error('Error in spawnFruits:', error);
            this.spawnTimer = 0;
        }
    }

    updateSliceTrail() {
        try {
            // Safety check for slice trail array
            if (!this.sliceTrail || !Array.isArray(this.sliceTrail)) {
                this.sliceTrail = [];
                return;
            }
            
            // Update trail life
            for (let i = this.sliceTrail.length - 1; i >= 0; i--) {
                const trail = this.sliceTrail[i];
                
                // Skip invalid trail elements
                if (!trail) {
                    this.sliceTrail.splice(i, 1);
                    continue;
                }
                
                trail.life -= 5;
                if (trail.life <= 0) {
                    this.sliceTrail.splice(i, 1);
                }
            }
        } catch (error) {
            console.error('Error in updateSliceTrail:', error);
            this.sliceTrail = [];
        }
    }

    checkSlice(x, y) {
        try {
            // Safety check for fruits array
            if (!this.fruits || !Array.isArray(this.fruits) || this.fruits.length === 0) {
                return false;
            }
            
            for (let i = 0; i < this.fruits.length; i++) {
                const fruit = this.fruits[i];
                
                // Skip invalid fruits
                if (!fruit) continue;
                
                if (!fruit.sliced) {
                    const distance = Math.sqrt((x - fruit.x) ** 2 + (y - fruit.y) ** 2);
                    if (distance < fruit.radius) {
                        fruit.sliced = true;
                        this.updateScore(this.score + fruit.points);
                        this.createSliceEffect(fruit);
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Error in checkSlice:', error);
            return false;
        }
    }

    createSliceEffect(fruit) {
        // Simple slice effect - fruit disappears with some visual feedback
        fruit.sliced = true;
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
            
            // Background
            try {
                const gradient = this.ctx.createLinearGradient(0, 0, 0, canvasHeight);
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#98FB98');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } catch (gradientError) {
                // Fallback if gradient fails
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            
            // Draw fruits
            if (this.fruits && Array.isArray(this.fruits)) {
                for (const fruit of this.fruits) {
                    if (fruit && !fruit.sliced) {
                        this.drawFruit(fruit);
                    }
                }
            }
            
            // Draw slice trail
            this.drawSliceTrail();
            
            // UI
            this.drawText(`Score: ${this.score}`, 10, 30, 20, 'black', 'left');
            this.drawText(`Misses: ${this.misses}/${this.maxMisses}`, 10, 60, 20, 'red', 'left');
            this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, canvasWidth - 10, 30, 20, 'black', 'right');
            this.drawText('🍎 Slice the fruits! 🍌', canvasWidth / 2, canvasHeight - 30, 16, '#2E8B57');
        } catch (error) {
            console.error('Error in FruitSliceGame.draw():', error);
        }
    }

    drawFruit(fruit) {
        this.ctx.save();
        this.ctx.translate(fruit.x, fruit.y);
        this.ctx.rotate(fruit.rotation);
        
        // Fruit body
        this.ctx.fillStyle = fruit.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Highlight
        const highlightGradient = this.ctx.createRadialGradient(-fruit.radius * 0.3, -fruit.radius * 0.3, 0, 0, 0, fruit.radius);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = highlightGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Leaf (simple green line)
        this.ctx.strokeStyle = '#228B22';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -fruit.radius);
        this.ctx.lineTo(0, -fruit.radius - 8);
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawSliceTrail() {
        if (this.sliceTrail.length > 1) {
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.lineWidth = 4;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(this.sliceTrail[0].x, this.sliceTrail[0].y);
            
            for (let i = 1; i < this.sliceTrail.length; i++) {
                this.ctx.lineTo(this.sliceTrail[i].x, this.sliceTrail[i].y);
            }
            this.ctx.stroke();
        }
    }

    drawText(text, x, y, size, color, align = 'center') {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px Arial`;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        this.isSlicing = true;
        const pos = this.getPointerPos(e);
        this.sliceTrail = [{ x: pos.x, y: pos.y, life: 100 }];
    }

    handleTouchMove(e) {
        super.handleTouchMove(e);
        if (this.isSlicing) {
            const pos = this.getPointerPos(e);
            this.sliceTrail.push({ x: pos.x, y: pos.y, life: 100 });
            this.checkSlice(pos.x, pos.y);
            
            // Limit trail length
            if (this.sliceTrail.length > 20) {
                this.sliceTrail.shift();
            }
        }
    }

    handleTouchEnd(e) {
        super.handleTouchEnd(e);
        this.isSlicing = false;
    }

    handleMouseDown(e) {
        super.handleMouseDown(e);
        this.isSlicing = true;
        const pos = this.getPointerPos(e);
        this.sliceTrail = [{ x: pos.x, y: pos.y, life: 100 }];
    }

    handleMouseMove(e) {
        super.handleMouseMove(e);
        if (this.isSlicing) {
            const pos = this.getPointerPos(e);
            this.sliceTrail.push({ x: pos.x, y: pos.y, life: 100 });
            this.checkSlice(pos.x, pos.y);
            
            // Limit trail length
            if (this.sliceTrail.length > 20) {
                this.sliceTrail.shift();
            }
        }
    }

    handleMouseUp(e) {
        super.handleMouseUp(e);
        this.isSlicing = false;
    }
    
    // Override the parent's method with specific handling for FruitSlice
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // No specific repositioning needed for fruits since they're always
            // newly spawned with the current dimensions
            
            // Just log the update for debugging
            console.log('FruitSliceGame dimensions updated to:', 
                this.canvasWidth, 'x', this.canvasHeight);
        } catch (error) {
            console.error('Error in FruitSliceGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
import { BaseGame } from './BaseGame.js';

export class BubblePopGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            this.bubbles = [];
            this.gameTime = 60000; // 60 seconds
            this.timeRemaining = this.gameTime;
            this.lastTime = 0;
            this.targetColor = null;
            this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D']; // 6 colors for more variety
            this.bubbleRadius = 25;
            this.rows = 6;
            this.cols = 8;
            this.minClusterSize = 3;
            
            // Initialize the game
            this.generateBubbles();
            this.setTargetColor();
            
            console.log('BubblePopGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
        } catch (error) {
            console.error('Error initializing BubblePopGame:', error);
            this.initializeFallback();
        }
    }

    initializeFallback() {
        this.bubbles = [];
        this.gameTime = 60000;
        this.timeRemaining = this.gameTime;
        this.lastTime = 0;
        this.targetColor = '#FF6B6B';
        this.colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
        this.bubbleRadius = 25;
        this.rows = 6;
        this.cols = 8;
        this.minClusterSize = 3;
        this.generateSimpleBubbles();
    }

    getInstructions() {
        return "Tap clusters of 3+ same-colored bubbles to pop them!";
    }

    start() {
        try {
            console.log('Starting BubblePopGame');
            
            // Reset game state
            this.generateBubbles();
            this.setTargetColor();
            this.timeRemaining = this.gameTime;
            this.score = 0;
            this.updateScore(0);
            
            // Initialize last time for delta time calculation
            this.lastTime = Date.now();
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in BubblePopGame.start():', error);
            super.start();
        }
    }

    generateBubbles() {
        try {
            this.bubbles = [];
            
            // Calculate starting position to center the grid
            const spacing = this.bubbleRadius * 2.1;
            const startX = (this.canvasWidth - (this.cols * spacing)) / 2 + this.bubbleRadius;
            const startY = 80;
            
            // Create a distribution plan to ensure all 6 colors are used
            const colorDistribution = [];
            for (let i = 0; i < this.rows * this.cols; i++) {
                // Use modulo to cycle through all colors evenly
                colorDistribution.push(i % this.colors.length);
            }
            
            // Shuffle the distribution slightly to create clusters while maintaining all colors
            this.shuffleWithClusters(colorDistribution);
            
            let index = 0;
            // Create bubbles with the planned distribution
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const x = startX + col * spacing;
                    const y = startY + row * spacing;
                    
                    const colorIndex = colorDistribution[index++];
                    const color = this.colors[colorIndex];
                    
                    this.bubbles.push({
                        x: x,
                        y: y,
                        radius: this.bubbleRadius,
                        color: color,
                        row: row,
                        col: col,
                        popped: false
                    });
                }
            }
            
            // Ensure we have valid clusters for all colors
            this.ensureValidClusters();
            
        } catch (error) {
            console.error('Error in generateBubbles:', error);
            this.generateSimpleBubbles();
        }
    }
    
    // Shuffle while maintaining some clusters
    shuffleWithClusters(array) {
        // Create clusters by keeping blocks of 3-4 indices the same
        for (let i = 0; i < array.length; i += 4) {
            // 70% chance to make a cluster of same color
            if (Math.random() < 0.7 && i + 3 < array.length) {
                const clusterSize = 3 + Math.floor(Math.random() * 2); // 3-4 size clusters
                const clusterColor = array[i];
                for (let j = 1; j < clusterSize; j++) {
                    if (i + j < array.length) {
                        array[i + j] = clusterColor;
                    }
                }
            }
        }
        
        // Add some randomness to non-cluster areas
        for (let i = 0; i < array.length; i++) {
            if (Math.random() < 0.3) { // 30% chance to randomize
                // Swap with another random position
                const j = Math.floor(Math.random() * array.length);
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
    }
    
    // Ensure there are valid clusters for all colors
    ensureValidClusters() {
        // Check each color to see if it has at least one valid cluster
        for (let colorIndex = 0; colorIndex < this.colors.length; colorIndex++) {
            const color = this.colors[colorIndex];
            if (!this.hasValidClusterForColor(color)) {
                // If no valid cluster, create one
                this.createClusterForColor(color);
            }
        }
    }
    
    // Check if there's a valid cluster for a specific color
    hasValidClusterForColor(color) {
        const colorBubbles = this.bubbles.filter(b => b.color === color && !b.popped);
        
        for (const bubble of colorBubbles) {
            const cluster = this.findCluster(bubble);
            if (cluster.length >= this.minClusterSize) {
                return true;
            }
        }
        
        return false;
    }
    
    // Create a cluster for a color
    createClusterForColor(color) {
        // Find a good spot to create a cluster
        const availableBubbles = this.bubbles.filter(b => !b.popped);
        if (availableBubbles.length < this.minClusterSize) return;
        
        // Pick a random starting point
        const startIndex = Math.floor(Math.random() * (availableBubbles.length - this.minClusterSize));
        
        // Create a cluster of at least minClusterSize bubbles
        for (let i = 0; i < this.minClusterSize; i++) {
            availableBubbles[startIndex + i].color = color;
        }
    }
    
    generateSimpleBubbles() {
        this.bubbles = [];
        const spacing = this.bubbleRadius * 2.1;
        const startX = 40;
        const startY = 100;
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = startX + col * spacing;
                const y = startY + row * spacing;
                
                // Simple pattern: every 4 bubbles same color
                const colorIndex = Math.floor(col / 4) % this.colors.length;
                
                this.bubbles.push({
                    x: x,
                    y: y,
                    radius: this.bubbleRadius,
                    color: this.colors[colorIndex],
                    row: row,
                    col: col,
                    popped: false
                });
            }
        }
        
        this.targetColor = this.colors[0];
    }

    setTargetColor() {
        try {
            // Find all active colors that have valid clusters
            const validColors = [];
            
            for (const color of this.colors) {
                if (this.hasValidClusterForColor(color)) {
                    validColors.push(color);
                }
            }
            
            if (validColors.length > 0) {
                // Randomly select one of the valid colors
                this.targetColor = validColors[Math.floor(Math.random() * validColors.length)];
            } else {
                // Fallback - regenerate bubbles to ensure valid clusters
                this.regenerateBubblesWithValidClusters();
                // Try again with the new bubbles
                this.setTargetColor();
            }
        } catch (error) {
            console.error('Error in setTargetColor:', error);
            this.targetColor = this.colors[0];
        }
    }
    
    // Regenerate bubbles when there are no valid clusters
    regenerateBubblesWithValidClusters() {
        // Save current score and time
        const currentScore = this.score;
        const currentTime = this.timeRemaining;
        
        // Regenerate with guaranteed clusters
        this.generateBubbles();
        
        // Restore score and time
        this.score = currentScore;
        this.timeRemaining = currentTime;
    }

    update() {
        try {
            if (!this.isRunning) return;

            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            this.timeRemaining -= deltaTime;
            
            if (this.timeRemaining <= 0) {
                this.updateScore(this.score);
                this.stop();
                return;
            }

            // Check if all bubbles are popped (victory condition)
            const activeBubbles = this.bubbles.filter(bubble => !bubble.popped);
            if (activeBubbles.length === 0) {
                // Victory bonus points (no time bonus)
                this.score += 2000; // Fixed victory bonus
                this.updateScore(this.score);
                this.stop();
                return;
            }
            
            // Check if there are valid moves available
            let hasValidMoves = false;
            for (const color of this.colors) {
                if (this.hasValidClusterForColor(color)) {
                    hasValidMoves = true;
                    break;
                }
            }
            
            // If no valid moves, regenerate the bubbles
            if (!hasValidMoves) {
                this.generateBubbles();
                this.setTargetColor();
            }
            
            // If few bubbles remain, start a new level
            if (activeBubbles.length < Math.floor(this.rows * this.cols * 0.25)) {
                this.startNewLevel();
            }
        } catch (error) {
            console.error('Error in BubblePopGame.update():', error);
        }
    }
    
    startNewLevel() {
        this.generateBubbles();
        this.setTargetColor();
        this.score += 300; // Level completion bonus
        this.updateScore(this.score);
        this.timeRemaining += 15000; // Add 15 seconds
    }

    findCluster(clickedBubble) {
        try {
            const cluster = [];
            const visited = new Set();
            const queue = [clickedBubble];
            const targetColor = clickedBubble.color;
            
            while (queue.length > 0) {
                const bubble = queue.shift();
                const bubbleId = `${bubble.row}-${bubble.col}`;
                
                if (visited.has(bubbleId) || bubble.popped || bubble.color !== targetColor) {
                    continue;
                }
                
                visited.add(bubbleId);
                cluster.push(bubble);
                
                // Find adjacent bubbles
                const neighbors = this.getNeighbors(bubble);
                for (const neighbor of neighbors) {
                    const neighborId = `${neighbor.row}-${neighbor.col}`;
                    if (!visited.has(neighborId)) {
                        queue.push(neighbor);
                    }
                }
            }
            
            return cluster;
        } catch (error) {
            console.error('Error in findCluster:', error);
            return [];
        }
    }

    getNeighbors(bubble) {
        try {
            const neighbors = [];
            const { row, col } = bubble;
            
            // Check 4 directions (up, down, left, right)
            const offsets = [
                [-1, 0], [1, 0], [0, -1], [0, 1]
            ];
            
            for (const [dRow, dCol] of offsets) {
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
                    const neighbor = this.bubbles.find(b => b.row === newRow && b.col === newCol);
                    if (neighbor && !neighbor.popped) {
                        neighbors.push(neighbor);
                    }
                }
            }
            
            return neighbors;
        } catch (error) {
            console.error('Error in getNeighbors:', error);
            return [];
        }
    }

    popCluster(cluster) {
        try {
            if (cluster.length < this.minClusterSize) {
                return false;
            }
            
            let points = 0;
            for (const bubble of cluster) {
                bubble.popped = true;
                points += 10;
            }
            
            // Enhanced point bonuses for larger clusters (replacing time bonuses)
            let multiplier = 1;
            if (cluster.length >= 6) {
                multiplier = 3; // Triple points for 6+ bubbles
            } else if (cluster.length >= 5) {
                multiplier = 2.5; // 2.5x points for 5+ bubbles
            } else if (cluster.length >= 4) {
                multiplier = 2; // Double points for 4+ bubbles
            }
            
            points = Math.floor(points * multiplier);
            
            this.score += points;
            this.updateScore(this.score);
            
            // Update the target color
            this.setTargetColor();
            
            return true;
        } catch (error) {
            console.error('Error in popCluster:', error);
            return false;
        }
    }

    draw() {
        try {
            const ctx = this.ctx;
            if (!ctx) return;
            
            ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Background
            const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw bubbles
            for (const bubble of this.bubbles) {
                if (!bubble.popped) {
                    // Bubble body
                    this.drawCircle(bubble.x, bubble.y, bubble.radius, bubble.color);
                    
                    // Bubble highlight
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.beginPath();
                    ctx.arc(bubble.x - 6, bubble.y - 6, bubble.radius * 0.4, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Target color indicator
                    if (bubble.color === this.targetColor) {
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(bubble.x, bubble.y, bubble.radius + 3, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                }
            }
            
            // UI
            this.drawText(`Score: ${this.score}`, 10, 30, 18, 'white', 'left');
            this.drawText(`Time: ${Math.max(0, Math.ceil(this.timeRemaining / 1000))}s`, this.canvasWidth - 10, 30, 18, 'white', 'right');
            this.drawText('Tap clusters of 3+ same-colored bubbles!', this.canvasWidth / 2, this.canvasHeight - 40, 14, 'white');
            
            // Target color indicator
            this.drawText('Target:', 10, this.canvasHeight - 60, 14, 'white', 'left');
            this.drawCircle(70, this.canvasHeight - 65, 12, this.targetColor);
        } catch (error) {
            console.error('Error in draw:', error);
        }
    }

    getClickedBubble(x, y) {
        try {
            for (const bubble of this.bubbles) {
                if (!bubble.popped) {
                    const distance = Math.sqrt((x - bubble.x) ** 2 + (y - bubble.y) ** 2);
                    if (distance <= bubble.radius) {
                        return bubble;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error in getClickedBubble:', error);
            return null;
        }
    }

    getTouchPos(e) {
        try {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
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
            const pos = this.getTouchPos(e);
            const bubble = this.getClickedBubble(pos.x, pos.y);
            
            if (bubble) {
                const cluster = this.findCluster(bubble);
                this.popCluster(cluster);
            }
        } catch (error) {
            console.error('Error in handleTouchStart:', error);
        }
    }

    handleMouseDown(e) {
        try {
            super.handleMouseDown(e);
            const pos = this.getMousePos(e);
            const bubble = this.getClickedBubble(pos.x, pos.y);
            
            if (bubble) {
                const cluster = this.findCluster(bubble);
                this.popCluster(cluster);
            }
        } catch (error) {
            console.error('Error in handleMouseDown:', error);
        }
    }
    
    // Helper method to draw a circle
    drawCircle(x, y, radius, color) {
        try {
            if (!this.ctx) return;
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
            this.ctx.fill();
        } catch (error) {
            console.error('Error in drawCircle:', error);
        }
    }
    
    // Helper method to draw text
    drawText(text, x, y, size, color, align = 'center') {
        try {
            if (!this.ctx) return;
            
            this.ctx.fillStyle = color || 'white';
            this.ctx.font = `${size || 16}px Arial`;
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(text, x, y);
        } catch (error) {
            console.error('Error in drawText:', error);
        }
    }
}
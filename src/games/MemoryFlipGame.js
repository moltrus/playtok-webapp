import { BaseGame } from './BaseGame.js';

export class MemoryFlipGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        try {
            // Update logical dimensions first
            this.updateLogicalDimensions();
            
            // Get safe canvas dimensions - if updateLogicalDimensions failed, these will use defaults
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            this.gridSize = 4; // 4x4 = 16 cards = 8 pairs (even number)
            this.cardSize = 60;
            this.cardSpacing = 8;
            this.cards = [];
            this.cardSprites = []; // Store card face sprites
            this.flippedCards = [];
            this.matchedPairs = 0;
            this.totalPairs = (this.gridSize * this.gridSize) / 2; // 8 pairs
            this.canFlip = true;
            this.startTime = 0;
            
            // Character faces instead of colors
            this.characters = [
                'cat', 'dog', 'rabbit', 'fox', 'panda', 'bear'
            ];
            
            this.initializeGrid();
            
            console.log('MemoryFlipGame initialized successfully with dimensions:', 
                canvasWidth, 'x', canvasHeight);
                
        } catch (error) {
            console.error('Error initializing MemoryFlipGame:', error);
            // Set minimal defaults to prevent further errors
            this.gridSize = 4;
            this.cardSize = 60;
            this.cardSpacing = 8;
            this.cards = [];
            this.cardSprites = [];
            this.flippedCards = [];
            this.matchedPairs = 0;
            this.totalPairs = 8;
            this.canFlip = true;
            this.startTime = 0;
            this.characters = ['cat', 'dog', 'rabbit', 'fox', 'panda', 'bear'];
        }
    }

    getInstructions() {
        return "🐱 Match animal pairs by flipping cards! Complete as fast as possible! 🐶";
    }

    start() {
        console.log('Starting MemoryFlipGame');
        
        try {
            // Reset game state
            this.flippedCards = [];
            this.matchedPairs = 0;
            this.canFlip = true;
            this.score = 0;
            this.updateScore(0);
            
            // Reset timer
            this.startTime = Date.now();
            
            // Re-initialize grid with new random card positions
            this.initializeGrid();
            
            // Call the parent start method which runs the game loop
            super.start();
        } catch (error) {
            console.error('Error in MemoryFlipGame.start():', error);
            // Try to call parent start method anyway to ensure game loop starts
            super.start();
        }
    }

    initializeGrid() {
        try {
            // Get safe canvas dimensions
            const canvasWidth = this.canvasWidth || 320;
            const canvasHeight = this.canvasHeight || 480;
            
            // Ensure characters array is valid
            if (!this.characters || !Array.isArray(this.characters) || this.characters.length === 0) {
                this.characters = ['cat', 'dog', 'rabbit', 'fox', 'panda', 'bear'];
            }
            
            // Create pairs of character faces
            const characterPairs = [];
            for (let i = 0; i < this.totalPairs; i++) {
                const character = this.characters[i % this.characters.length];
                characterPairs.push(character, character);
            }
            
            // Shuffle the characters
            for (let i = characterPairs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [characterPairs[i], characterPairs[j]] = [characterPairs[j], characterPairs[i]];
            }
            
            // Create cards and sprites
            this.cards = [];
            this.cardSprites = [];
            let characterIndex = 0;
            
            // Calculate grid positioning
            const startX = (canvasWidth - (this.gridSize * this.cardSize + (this.gridSize - 1) * this.cardSpacing)) / 2;
            const startY = (canvasHeight - (this.gridSize * this.cardSize + (this.gridSize - 1) * this.cardSpacing)) / 2;
            
            for (let row = 0; row < this.gridSize; row++) {
                for (let col = 0; col < this.gridSize; col++) {
                    // Calculate card position
                    const x = startX + col * (this.cardSize + this.cardSpacing);
                    const y = startY + row * (this.cardSize + this.cardSpacing);
                    
                    // Create card object
                    const card = {
                        x,
                        y,
                        character: characterPairs[characterIndex++],
                        flipped: false,
                        matched: false
                    };
                    
                    this.cards.push(card);
                }
            }
        } catch (error) {
            console.error('Error in initializeGrid:', error);
            this.cards = [];
        }
    }

    update() {
        try {
            // Check if all pairs are matched
            if (this.matchedPairs === this.totalPairs && this.isRunning) {
                const timeTaken = (Date.now() - this.startTime) / 1000;
                console.log(`Game completed in ${timeTaken} seconds!`);
                
                // Calculate score: faster completion = higher score
                // Max score of 1000 for completing in 30 seconds or less
                const baseScore = 1000;
                const timeBonus = Math.max(0, 30 - timeTaken) * 33.3;
                const finalScore = Math.floor(baseScore + timeBonus);
                
                this.updateScore(finalScore);
                this.stop();
            }
        } catch (error) {
            console.error('Error in MemoryFlipGame.update():', error);
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
            
            // Background
            try {
                const gradient = this.ctx.createLinearGradient(0, 0, 0, canvasHeight);
                gradient.addColorStop(0, '#f7ebd3');
                gradient.addColorStop(1, '#f0d7a8');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            } catch (gradientError) {
                // Fallback if gradient fails
                this.ctx.fillStyle = '#f7ebd3';
                this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            
            // Draw cards
            if (this.cards && Array.isArray(this.cards)) {
                for (const card of this.cards) {
                    this.drawCard(card);
                }
            }
            
            // Draw timer and score
            const timeTaken = (Date.now() - this.startTime) / 1000;
            this.ctx.font = '18px Arial';
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Time: ${timeTaken.toFixed(1)}s`, 10, 30);
            
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`Pairs: ${this.matchedPairs}/${this.totalPairs}`, canvasWidth - 10, 30);
            
            // Draw instruction at bottom
            this.ctx.textAlign = 'center';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('🐱 Match all animal pairs! 🐶', canvasWidth / 2, canvasHeight - 20);
        } catch (error) {
            console.error('Error in MemoryFlipGame.draw():', error);
        }
    }

    drawCard(card) {
        try {
            // Draw card back (blue)
            this.ctx.fillStyle = card.flipped ? '#fff' : '#3498db';
            this.ctx.strokeStyle = '#2980b9';
            this.ctx.lineWidth = 2;
            
            // Card with rounded corners
            this.roundRect(
                this.ctx, 
                card.x, 
                card.y, 
                this.cardSize, 
                this.cardSize, 
                8, 
                true, 
                true
            );
            
            // If card is flipped, draw character face
            if (card.flipped) {
                this.drawCharacter(card.x, card.y, card.character);
            }
            
            // If card is matched, draw a green border
            if (card.matched) {
                this.ctx.strokeStyle = '#27ae60';
                this.ctx.lineWidth = 3;
                this.roundRect(
                    this.ctx, 
                    card.x, 
                    card.y, 
                    this.cardSize, 
                    this.cardSize, 
                    8, 
                    false, 
                    true
                );
            }
        } catch (error) {
            console.error('Error in drawCard:', error);
        }
    }

    drawCharacter(x, y, character) {
        try {
            const colors = {
                'cat': '#e74c3c',
                'dog': '#3498db',
                'rabbit': '#9b59b6',
                'fox': '#e67e22',
                'panda': '#34495e',
                'bear': '#795548'
            };
            
            // Default if character not found
            const color = colors[character] || '#95a5a6';
            
            // Draw simple character representation
            this.ctx.fillStyle = color;
            
            // Center in card
            const centerX = x + this.cardSize / 2;
            const centerY = y + this.cardSize / 2;
            
            // Draw character emoji or icon
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Draw character name
            this.ctx.fillText(character, centerX, centerY + 15);
            
            // Draw emoji based on character
            let emoji = '🐱'; // default
            
            switch(character) {
                case 'cat': emoji = '🐱'; break;
                case 'dog': emoji = '🐶'; break;
                case 'rabbit': emoji = '🐰'; break;
                case 'fox': emoji = '🦊'; break;
                case 'panda': emoji = '🐼'; break;
                case 'bear': emoji = '🐻'; break;
                default: emoji = '🐱'; break;
            }
            
            this.ctx.font = '28px Arial';
            this.ctx.fillText(emoji, centerX, centerY - 10);
        } catch (error) {
            console.error('Error in drawCharacter:', error);
        }
    }
    
    // Helper for drawing rounded rectangles
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        try {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            
            if (fill) {
                ctx.fill();
            }
            
            if (stroke) {
                ctx.stroke();
            }
        } catch (error) {
            console.error('Error in roundRect:', error);
        }
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        this.checkCardClick(e);
    }

    handleMouseDown(e) {
        super.handleMouseDown(e);
        this.checkCardClick(e);
    }

    checkCardClick(e) {
        try {
            // If we can't flip cards yet, return
            if (!this.canFlip || !this.isRunning) return;
            
            // If we already have 2 flipped cards, return
            if (this.flippedCards.length >= 2) return;
            
            // Get click position
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0)) - rect.left;
            const y = (e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0)) - rect.top;
            
            // Check if click is on a card
            for (let i = 0; i < this.cards.length; i++) {
                const card = this.cards[i];
                
                // Skip if card is already flipped or matched
                if (card.flipped || card.matched) continue;
                
                // Check if click is inside card bounds
                if (
                    x >= card.x && 
                    x <= card.x + this.cardSize && 
                    y >= card.y && 
                    y <= card.y + this.cardSize
                ) {
                    // Flip the card
                    card.flipped = true;
                    this.flippedCards.push(card);
                    
                    // If we have 2 flipped cards, check if they match
                    if (this.flippedCards.length === 2) {
                        this.canFlip = false;
                        
                        // Set timeout to check match
                        setTimeout(() => this.checkMatch(), 1000);
                    }
                    
                    break;
                }
            }
        } catch (error) {
            console.error('Error in checkCardClick:', error);
            this.canFlip = true;
        }
    }

    checkMatch() {
        try {
            if (this.flippedCards.length !== 2) {
                this.canFlip = true;
                return;
            }
            
            const [card1, card2] = this.flippedCards;
            
            // Check if cards match
            if (card1.character === card2.character) {
                // Match found
                card1.matched = true;
                card2.matched = true;
                this.matchedPairs++;
                
                // Add points for each match
                this.updateScore(this.score + 100);
            } else {
                // No match, flip cards back
                card1.flipped = false;
                card2.flipped = false;
            }
            
            // Reset flipped cards
            this.flippedCards = [];
            this.canFlip = true;
        } catch (error) {
            console.error('Error in checkMatch:', error);
            this.flippedCards = [];
            this.canFlip = true;
        }
    }
    
    // Override the parent's method with specific handling for MemoryFlip
    updateLogicalDimensions() {
        try {
            // First call the parent method with error handling
            super.updateLogicalDimensions();
            
            // Recalculate card positions if needed
            if (this.cards && this.cards.length > 0) {
                const canvasWidth = this.canvasWidth || 320;
                const canvasHeight = this.canvasHeight || 480;
                
                // Recalculate grid positioning
                const startX = (canvasWidth - (this.gridSize * this.cardSize + (this.gridSize - 1) * this.cardSpacing)) / 2;
                const startY = (canvasHeight - (this.gridSize * this.cardSize + (this.gridSize - 1) * this.cardSpacing)) / 2;
                
                let cardIndex = 0;
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        if (cardIndex < this.cards.length) {
                            // Update card position
                            this.cards[cardIndex].x = startX + col * (this.cardSize + this.cardSpacing);
                            this.cards[cardIndex].y = startY + row * (this.cardSize + this.cardSpacing);
                            cardIndex++;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in MemoryFlipGame.updateLogicalDimensions:', error);
            // Set fallback values to prevent game from breaking
            this.logicalWidth = this.logicalWidth || 320;
            this.logicalHeight = this.logicalHeight || 480;
        }
    }
}
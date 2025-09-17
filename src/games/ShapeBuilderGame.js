import { BaseGame } from './BaseGame.js';

export class ShapeBuilderGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);
        
        // Bind event handlers properly
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        // Store dimensions and handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        this._width = (canvas.width || 320) / dpr;
        this._height = (canvas.height || 480) / dpr;
        
        // Set canvas dimensions properly
        canvas.style.width = this._width + 'px';
        canvas.style.height = this._height + 'px';
        canvas.width = this._width * dpr;
        canvas.height = this._height * dpr;
        context.scale(dpr, dpr);
        
        // Game setup
        this.shapes = [];
        this.targetOutlines = [];
        this.shapesPlaced = 0;
        this.totalShapes = 4; // 3-5 shapes as per spec
        this.gameTime = 45000; // 45 seconds
        this.timeRemaining = this.gameTime;
        this.lastTime = 0;
        this.isDragging = false;
        this.draggedShape = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.snapTolerance = 30; // Increased from 15 to 30 for much easier shape placement
        this.score = 0;
        
        // Define shape colors
        this.shapeColors = [
            '#FF3A3A', // Red
            '#3A66FF', // Blue
            '#3AFF3A', // Green
            '#FFFF3A', // Yellow
            '#AA3AFF'  // Purple
        ];
        
        // Define shape types
        this.shapeTypes = [
            'circle',
            'square',
            'triangle',
            'star',
            'hexagon'
        ];
        
        console.log('ShapeBuilderGame initialized with canvas dimensions:', this._width, 'x', this._height);
    }
    
    // Get actual canvas dimensions
    get canvasWidth() {
        return this._width;
    }
    
    get canvasHeight() {
        return this._height;
    }

    getInstructions() {
        return "Drag shapes to match the outlines. Correctly placed shapes snap into position!";
    }

    start() {
        this.shapes = [];
        this.targetOutlines = [];
        this.shapesPlaced = 0;
        this.lastTime = Date.now();
        this.timeRemaining = this.gameTime;
        this.score = 0;
        this.isDragging = false;
        this.draggedShape = null;
        
        // Generate target outlines and shapes
        this.generateLevel();
        console.log('Game started with', this.totalShapes, 'shapes');
        console.log('Canvas dimensions:', this.canvasWidth, 'x', this.canvasHeight);
        console.log('Shapes:', this.shapes.length);
        console.log('Outlines:', this.targetOutlines.length);
        
        super.start();
    }

    generateLevel() {
        // Clear existing data
        this.shapes = [];
        this.targetOutlines = [];
        this.shapesPlaced = 0;
        
        // Determine how many shapes for this level (3-5)
        this.totalShapes = Math.floor(Math.random() * 3) + 3;
        
        // Safe dimensions with debug logging
        const canvasWidth = this.canvasWidth;
        const canvasHeight = this.canvasHeight;
        console.log(`Canvas dimensions for level: ${canvasWidth}x${canvasHeight}`);
        
        // Use percentage-based padding for better responsiveness
        const padding = canvasWidth * 0.1; // 10% of canvas width
        
        // Make outlines larger for better visibility and interaction
        let outlineSize;
        
        if (canvasWidth <= 320) {
            // Small mobile screens - make shapes relatively larger
            outlineSize = Math.max(50, Math.min(80, canvasWidth * 0.25));
        } else if (canvasWidth <= 768) {
            // Larger mobile/tablet screens
            outlineSize = Math.max(60, Math.min(100, canvasWidth * 0.20));
        } else {
            // Desktop screens
            outlineSize = Math.max(70, Math.min(120, canvasWidth * 0.15));
        }
        
        console.log(`Using outline size: ${outlineSize}px with padding: ${padding}px`);
        
        // Calculate the gap between outlines to distribute them evenly
        let gapBetweenOutlines = (canvasWidth - (2 * padding) - (outlineSize * this.totalShapes)) / 
                               (this.totalShapes - 1);
        
        // If the gap is negative or too small, adjust the outlineSize to make it fit
        if (gapBetweenOutlines < 10) {
            console.log(`Gap too small (${gapBetweenOutlines}px), adjusting outline size`);
            const availableWidth = canvasWidth - (2 * padding) - (10 * (this.totalShapes - 1));
            outlineSize = Math.max(40, Math.min(outlineSize, availableWidth / this.totalShapes));
            gapBetweenOutlines = 10;
            console.log(`Adjusted outline size to: ${outlineSize}px with gap: ${gapBetweenOutlines}px`);
        }
        
        // Create target outlines at the bottom of the screen
        for (let i = 0; i < this.totalShapes; i++) {
            // Calculate x position to center the shapes horizontally
            const totalWidth = (this.totalShapes * outlineSize) + ((this.totalShapes - 1) * gapBetweenOutlines);
            const startX = (canvasWidth - totalWidth) / 2;
            const x = startX + i * (outlineSize + gapBetweenOutlines);
            const y = canvasHeight * 0.7; // Position at 70% of canvas height
            
            // Choose a random shape type for this outline
            const shapeType = this.shapeTypes[Math.floor(Math.random() * this.shapeTypes.length)];
            
            const outline = {
                x: x,
                y: y,
                width: outlineSize,
                height: outlineSize,
                type: shapeType,
                matched: false
            };
            
            this.targetOutlines.push(outline);
            console.log(`Created outline ${i} at (${x}, ${y}) type: ${shapeType}`);
        }
        
        // Create draggable shapes at the top of the screen
        const shapeIndices = Array.from({length: this.totalShapes}, (_, i) => i);
        
        // Fisher-Yates shuffle for random shape order
        for (let i = shapeIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shapeIndices[i], shapeIndices[j]] = [shapeIndices[j], shapeIndices[i]];
        }
        
        // Create shapes with the same types as outlines but in random positions
        for (let i = 0; i < this.totalShapes; i++) {
            const outlineIndex = shapeIndices[i];
            const shapeType = this.targetOutlines[outlineIndex].type;
            
            // Calculate x position to center the shapes horizontally
            const totalWidth = (this.totalShapes * outlineSize) + ((this.totalShapes - 1) * gapBetweenOutlines);
            const startX = (canvasWidth - totalWidth) / 2;
            const x = startX + i * (outlineSize + gapBetweenOutlines);
            const y = canvasHeight * 0.2; // Position at 20% of canvas height
            
            const shape = {
                x: x,
                y: y,
                width: outlineSize,
                height: outlineSize,
                type: shapeType,
                color: this.shapeColors[i % this.shapeColors.length],
                placed: false,
                targetIndex: outlineIndex
            };
            
            this.shapes.push(shape);
            console.log(`Created shape ${i} at (${x}, ${y}) type: ${shapeType}, target: ${outlineIndex}`);
        }
        
        console.log(`Generated level with ${this.totalShapes} shapes`);
    }
    // (Removed duplicate block that was outside any method)

    update() {
        if (!this.isRunning) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.timeRemaining -= deltaTime;
        
        // Check if all shapes are placed correctly
        if (this.shapesPlaced >= this.totalShapes) {
            // Player wins!
            this.score += Math.ceil(this.timeRemaining / 1000); // Bonus points for remaining time
            this.stop();
            return;
        }
        
        // End game if time runs out
        if (this.timeRemaining <= 0) {
            this.stop();
            return;
        }
        
        // Report score update
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.score);
        }
    }

    draw() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        this.ctx.fillStyle = '#F0F0F0';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw target outlines
        for (const outline of this.targetOutlines) {
            // Draw dashed outline with improved visibility
            this.ctx.strokeStyle = outline.matched ? '#00C000' : '#000000';
            this.ctx.lineWidth = 6; // Increased thickness for better visibility
            this.ctx.setLineDash(outline.matched ? [] : [12, 8]);
            
            // Add background to make outlines more visible
            if (!outline.matched) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                this.ctx.fillRect(outline.x, outline.y, outline.width, outline.height);
            }
            
            this.drawShape(outline.type, outline.x, outline.y, outline.width, outline.height, true);
            
            this.ctx.setLineDash([]);
        }
        
        // Draw shapes
        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];
            
            // Skip if this is the shape being dragged (we'll draw it last)
            if (this.isDragging && this.draggedShape === i) continue;
            
            // Draw filled shape with improved visibility
            this.ctx.fillStyle = shape.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4;
            
            // Add shadow for depth
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            this.drawShape(shape.type, shape.x, shape.y, shape.width, shape.height, false);
        }
        
        // Draw the dragged shape last (so it appears on top)
        if (this.isDragging && this.draggedShape !== null) {
            const shape = this.shapes[this.draggedShape];
            this.ctx.fillStyle = shape.color;
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4; // Make dragged shape border even more visible
            
            this.drawShape(shape.type, shape.x, shape.y, shape.width, shape.height, false);
            
            // Add shadow effect for dragged shape
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 5;
            this.ctx.shadowOffsetY = 5;
        }
        
        // Reset shadow for UI elements
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw UI (score, timer) with improved visibility
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 24px Arial'; // Bigger and bolder font
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        this.ctx.textAlign = 'right';
        const secondsLeft = Math.ceil(this.timeRemaining / 1000);
        this.ctx.fillText(`Time: ${secondsLeft}s`, this.canvasWidth - 10, 30);
        
        // Draw progress
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Shapes: ${this.shapesPlaced}/${this.totalShapes}`, this.canvasWidth / 2, 30);
    }
    
    drawShape(type, x, y, width, height, isOutline) {
        switch (type) {
            case 'square':
                if (isOutline) {
                    this.ctx.strokeRect(x, y, width, height);
                } else {
                    this.ctx.fillRect(x, y, width, height);
                    this.ctx.strokeRect(x, y, width, height);
                }
                break;
                
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
                if (isOutline) {
                    this.ctx.stroke();
                } else {
                    this.ctx.fill();
                    this.ctx.stroke();
                }
                break;
                
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(x + width / 2, y);
                this.ctx.lineTo(x + width, y + height);
                this.ctx.lineTo(x, y + height);
                this.ctx.closePath();
                if (isOutline) {
                    this.ctx.stroke();
                } else {
                    this.ctx.fill();
                    this.ctx.stroke();
                }
                break;
                
            case 'star':
                this.drawStar(x + width / 2, y + height / 2, 5, width / 2, width / 4, isOutline);
                break;
                
            case 'hexagon':
                this.drawPolygon(x + width / 2, y + height / 2, 6, width / 2, isOutline);
                break;
        }
    }
    
    drawStar(cx, cy, spikes, outerRadius, innerRadius, isOutline) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        
        if (isOutline) {
            this.ctx.stroke();
        } else {
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawPolygon(cx, cy, sides, radius, isOutline) {
        this.ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        
        if (isOutline) {
            this.ctx.stroke();
        } else {
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    // Check if a shape is correctly placed on its matching outline
    checkShapePlacement(shapeIndex) {
        const shape = this.shapes[shapeIndex];
        const targetOutline = this.targetOutlines[shape.targetIndex];
        
        // Calculate center distance between shape and its target outline
        const shapeCenterX = shape.x + shape.width / 2;
        const shapeCenterY = shape.y + shape.height / 2;
        const targetCenterX = targetOutline.x + targetOutline.width / 2;
        const targetCenterY = targetOutline.y + targetOutline.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(shapeCenterX - targetCenterX, 2) + 
            Math.pow(shapeCenterY - targetCenterY, 2)
        );
        
        console.log(`Shape ${shapeIndex} distance to target: ${distance}px, tolerance: ${this.snapTolerance}px`);
        
        // If close enough, snap to position
        if (distance < this.snapTolerance) {
            // Snap the shape to the outline
            shape.x = targetOutline.x;
            shape.y = targetOutline.y;
            shape.placed = true;
            targetOutline.matched = true;
            
            // Increment placed shapes counter
            this.shapesPlaced++;
            
            // Award points
            this.score += 10;
            
            console.log(`Shape ${shapeIndex} placed correctly! Total placed: ${this.shapesPlaced}/${this.totalShapes}`);
            
            return true;
        }
        
        // Check if it's incorrectly placed on any other outline
        for (let i = 0; i < this.targetOutlines.length; i++) {
            // Skip if this is the correct target or if already matched
            if (i === shape.targetIndex || this.targetOutlines[i].matched) continue;
            
            const otherOutline = this.targetOutlines[i];
            const otherCenterX = otherOutline.x + otherOutline.width / 2;
            const otherCenterY = otherOutline.y + otherOutline.height / 2;
            
            const otherDistance = Math.sqrt(
                Math.pow(shapeCenterX - otherCenterX, 2) + 
                Math.pow(shapeCenterY - otherCenterY, 2)
            );
            
            if (otherDistance < this.snapTolerance) {
                // Penalize for incorrect placement
                this.score = Math.max(0, this.score - 2);
                console.log(`Shape ${shapeIndex} placed incorrectly on outline ${i}!`);
                return false;
            }
        }
        
        return false;
    }

    handleTouchStart(e) {
        super.handleTouchStart(e);
        
        if (!this.isRunning) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const pos = this.getTouchPos(e);
        this.handlePointerStart(pos.x, pos.y);
    }
    
    handleMouseDown(e) {
        super.handleMouseDown(e);
        
        if (!this.isRunning) return;
        
        const pos = this.getMousePos(e);
        this.handlePointerStart(pos.x, pos.y);
    }
    
    handlePointerStart(x, y) {
        console.log(`Pointer start at (${x}, ${y})`);
        
        // Check if we clicked on a shape
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            
            // Skip if already placed correctly
            if (shape.placed) {
                console.log(`Shape ${i} already placed, skipping`);
                continue;
            }
            
            console.log(`Checking shape ${i} at (${shape.x}, ${shape.y}) type: ${shape.type}`);
            
            // Check if the point is inside the shape
            if (this.isPointInShape(x, y, shape)) {
                console.log(`Starting drag for shape ${i}`);
                this.isDragging = true;
                this.draggedShape = i;
                this.dragOffsetX = x - shape.x;
                this.dragOffsetY = y - shape.y;
                
                // Bring the dragged shape to the front (by moving it to the end of the array)
                this.shapes.push(this.shapes.splice(i, 1)[0]);
                this.draggedShape = this.shapes.length - 1;
                
                console.log(`Drag offset: (${this.dragOffsetX}, ${this.dragOffsetY})`);
                console.log(`Shape moved to index ${this.draggedShape}`);
                
                break;
            }
        }
        
        if (!this.isDragging) {
            console.log('No shape found at this position');
        }
    }
    
    handleTouchMove(e) {
        super.handleTouchMove(e);
        
        if (!this.isRunning || !this.isDragging) return;
        
        const touch = e.touches[0];
        if (!touch) return;
        
        const pos = this.getTouchPos(e);
        this.handlePointerMove(pos.x, pos.y);
    }
    
    handleMouseMove(e) {
        super.handleMouseMove(e);
        
        if (!this.isRunning || !this.isDragging) return;
        
        const pos = this.getMousePos(e);
        this.handlePointerMove(pos.x, pos.y);
    }
    
    handlePointerMove(x, y) {
        if (this.draggedShape !== null) {
            const shape = this.shapes[this.draggedShape];
            
            // Store previous position for logging
            const prevX = shape.x;
            const prevY = shape.y;
            
            // Update shape position
            shape.x = x - this.dragOffsetX;
            shape.y = y - this.dragOffsetY;
            
            // Keep shape within canvas bounds
            shape.x = Math.max(0, Math.min(this.canvasWidth - shape.width, shape.x));
            shape.y = Math.max(0, Math.min(this.canvasHeight - shape.height, shape.y));
            
            // Log movement only when position changes significantly (to reduce spam)
            if (Math.abs(shape.x - prevX) > 5 || Math.abs(shape.y - prevY) > 5) {
                console.log(`Moving shape to (${shape.x.toFixed(0)}, ${shape.y.toFixed(0)})`);
            }
            
            // Check proximity to correct target for highlighting
            const targetOutline = this.targetOutlines[shape.targetIndex];
            const shapeCenterX = shape.x + shape.width / 2;
            const shapeCenterY = shape.y + shape.height / 2;
            const targetCenterX = targetOutline.x + targetOutline.width / 2;
            const targetCenterY = targetOutline.y + targetOutline.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(shapeCenterX - targetCenterX, 2) + 
                Math.pow(shapeCenterY - targetCenterY, 2)
            );
            
            // When getting close to the target, give visual feedback
            if (distance < this.snapTolerance * 1.5) {
                // Log only when first getting close
                if (distance < this.snapTolerance * 2 && distance > this.snapTolerance * 1.5) {
                    console.log(`Shape getting close to target! Distance: ${distance.toFixed(1)}px`);
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        super.handleTouchEnd(e);
        this.handlePointerEnd();
    }
    
    handleMouseUp(e) {
        super.handleMouseUp(e);
        this.handlePointerEnd();
    }
    
    handlePointerEnd() {
        if (this.isDragging && this.draggedShape !== null) {
            console.log(`Ending drag for shape ${this.draggedShape}`);
            
            // Check if the shape is placed correctly
            const placed = this.checkShapePlacement(this.draggedShape);
            console.log(`Shape placement result: ${placed ? 'Correct!' : 'Not placed'}`);
            
            // Reset dragging state
            this.isDragging = false;
            this.draggedShape = null;
        }
    }
    
    isPointInShape(x, y, shape) {
        // Add larger padding to make it much easier to grab shapes
        const padding = 20; // Increased from 5 to 20
        
        // Log touch position and shape bounds for debugging
        console.log(`Touch at (${x},${y}), checking shape at (${shape.x},${shape.y}) with size ${shape.width}x${shape.height}`);
        
        switch (shape.type) {
            case 'square':
                const inSquare = (
                    x >= shape.x - padding && 
                    x <= shape.x + shape.width + padding && 
                    y >= shape.y - padding && 
                    y <= shape.y + shape.height + padding
                );
                if (inSquare) console.log('Touch in square');
                return inSquare;
                
            case 'circle':
                const centerX = shape.x + shape.width / 2;
                const centerY = shape.y + shape.height / 2;
                const radius = shape.width / 2 + padding;
                const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                const inCircle = distance <= radius;
                if (inCircle) console.log('Touch in circle');
                return inCircle;
                
            case 'triangle':
                // For simplicity with the padding, use a bounding box check for triangles
                const inTriangle = (
                    x >= shape.x - padding && 
                    x <= shape.x + shape.width + padding && 
                    y >= shape.y - padding && 
                    y <= shape.y + shape.height + padding
                );
                if (inTriangle) console.log('Touch in triangle');
                return inTriangle;
                
            case 'star':
            case 'hexagon':
                // These are more complex, so we'll use a simplified approach
                // Just use a square bounding box check with padding
                const inComplex = (
                    x >= shape.x - padding && 
                    x <= shape.x + shape.width + padding && 
                    y >= shape.y - padding && 
                    y <= shape.y + shape.height + padding
                );
                if (inComplex) console.log(`Touch in ${shape.type}`);
                return inComplex;
                
            default:
                return false;
        }
    }
    
    getTouchPos(e) {
        if (!this.canvas) {
            console.error('Canvas is null in getTouchPos');
            return { x: 0, y: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        
        if (!touch) {
            console.error('No touch detected in getTouchPos');
            return { x: 0, y: 0 };
        }
        
        // Use rect dimensions directly to get the proper scale
        const touchX = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
        const touchY = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Adjust for device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        console.log(`Touch position: screen(${touch.clientX}, ${touch.clientY}), canvas(${touchX.toFixed(1)}, ${touchY.toFixed(1)})`);
        console.log(`Canvas rect: ${rect.width}x${rect.height}, DPR: ${dpr}`);
        
        return {
            x: touchX / dpr,
            y: touchY / dpr
        };
    }
    
    getMousePos(e) {
        if (!this.canvas) {
            console.error('Canvas is null in getMousePos');
            return { x: 0, y: 0 };
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvasWidth / rect.width;
        const scaleY = this.canvasHeight / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        // Log less frequently for mouse to avoid console spam
        if (Math.random() < 0.1) {
            console.log(`Mouse position: screen(${e.clientX}, ${e.clientY}), canvas(${mouseX.toFixed(1)}, ${mouseY.toFixed(1)})`);
        }
        
        return {
            x: mouseX,
            y: mouseY
        };
    }
}
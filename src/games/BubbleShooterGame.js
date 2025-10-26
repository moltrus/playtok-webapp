import { BaseGame } from './BaseGame.js';

const HEX_OFFSETS = {
    even: [
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
        { dr: -1, dc: 0 },
        { dr: -1, dc: -1 },
        { dr: 1, dc: 0 },
        { dr: 1, dc: -1 },
    ],
    odd: [
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
        { dr: -1, dc: 0 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: 0 },
        { dr: 1, dc: 1 },
    ],
};

export class BubbleShooterGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);

        this.colors = ['#ff6b6b', '#4edbc4', '#ffd93d', '#45b7d1', '#a36df0'];
        this.specialColor = '#ffffff';

        this.level = 1;
        this.combo = 0;
        this.timeLimit = 120000;
        this.lineInterval = 15000;
        this.minLineInterval = 6500;

        this.minAimAngle = -Math.PI + 0.35;
        this.maxAimAngle = -0.35;

        this.movingBubble = null;
        this.currentBubble = null;
        this.nextBubble = null;
        this.grid = [];

        this.lastUpdate = performance.now();

        this.popBursts = [];
        this.popParticles = [];

        this.configureLayout();
        this.resetGameState();
    }

    getInstructions() {
        return 'Aim and tap to shoot bubbles. Match 3+ to clear the board before it reaches the bottom!';
    }

    configureLayout() {
        this.updateLogicalDimensions();

        const safeWidth = this.canvasWidth || 360;
        const safeHeight = this.canvasHeight || 640;

        const preferredRadius = Math.max(13, Math.min(24, safeWidth * 0.04));
        this.bubbleRadius = preferredRadius;
        this.gridSpacing = this.bubbleRadius * 2 + 2;
        this.rowHeight = this.gridSpacing * 0.86;

        const availableWidth = safeWidth - 40;
        this.cols = Math.max(7, Math.min(11, Math.floor(availableWidth / this.gridSpacing)));
        this.maxRows = 14;

        const gridWidth = this.cols * this.gridSpacing;
        this.gridStartX = (safeWidth - gridWidth) / 2 + this.bubbleRadius;
        this.gridStartY = 60;

        this.playfieldLeft = this.gridStartX - this.bubbleRadius;
        this.playfieldRight = this.gridStartX + (this.cols - 1) * this.gridSpacing + this.bubbleRadius;

        this.shooter = {
            x: safeWidth / 2,
            y: safeHeight - 70,
        };

        this.aimAngle = -Math.PI / 2;
        this.aimPoint = { x: this.shooter.x, y: this.shooter.y - 180 };

        this.shootSpeed = Math.max(6.5, Math.min(12, safeHeight / 70));
        this.lossLine = this.shooter.y - this.bubbleRadius * 2.5;
    }

    resetGameState() {
        this.score = 0;
        this.updateScore(0);
        this.timeRemaining = this.timeLimit;
        this.lineInterval = 15000;
        this.lineTimer = this.lineInterval;
        this.level = 1;
        this.combo = 0;
        this.grid = [];
        this.movingBubble = null;
        this.currentBubble = null;
        this.nextBubble = null;
        this.popBursts = [];
        this.popParticles = [];

        this.generateInitialGrid();
        this.prepareInitialBubbles();
        this.lastUpdate = performance.now();
    }

    generateInitialGrid() {
        this.grid = [];
        const initialRows = Math.min(this.maxRows - 2, 6 + this.level);

        for (let row = 0; row < initialRows; row++) {
            this.grid[row] = new Array(this.cols).fill(null);
            const activeCols = row % 2 === 0 ? this.cols : this.cols - 1;

            for (let col = 0; col < activeCols; col++) {
                const color = this.colors[(row + col) % this.colors.length];
                this.grid[row][col] = this.createGridBubble(row, col, color);
            }
        }

        this.updateAvailableColors();
    }

    prepareInitialBubbles() {
        this.currentBubble = this.generateBubble();
        this.nextBubble = this.generateBubble();
        const loadedY = this.shooter.y - this.bubbleRadius - 6;
        this.currentBubble.x = this.shooter.x;
        this.currentBubble.y = loadedY;
    }

    start() {
        this.configureLayout();
        this.resetGameState();
        this.lastUpdate = performance.now();
        super.start();
    }

    handlePointerDown(event) {
        if (!this.isRunning) return;
        if (event) event.preventDefault();

        const pointer = event.touches ? event.touches[0] : event;
        const logical = this.getLogicalCoordinates(pointer.clientX, pointer.clientY);
        this.updateAim(logical.x, logical.y);
        this.launchBubble();
    }

    handleMouseMove(event) {
        if (!this.isRunning) return;
        if (!event) return;
        event.preventDefault();
        const logical = this.getLogicalCoordinates(event.clientX, event.clientY);
        this.updateAim(logical.x, logical.y);
    }

    handleTouchMove(event) {
        if (!this.isRunning) return;
        if (!event) return;
        event.preventDefault();
        const touch = event.touches && event.touches[0];
        if (!touch) return;
        const logical = this.getLogicalCoordinates(touch.clientX, touch.clientY);
        this.updateAim(logical.x, logical.y);
    }

    updateAim(targetX, targetY) {
        const dx = targetX - this.shooter.x;
        const dy = targetY - this.shooter.y;
        const angle = Math.atan2(dy, dx);
        this.aimAngle = this.clamp(angle, this.minAimAngle, this.maxAimAngle);
        this.aimPoint = {
            x: this.shooter.x + Math.cos(this.aimAngle) * 240,
            y: this.shooter.y + Math.sin(this.aimAngle) * 240,
        };
    }

    launchBubble() {
        if (!this.currentBubble || this.movingBubble) {
            return;
        }

        const angle = this.aimAngle;
        const startY = this.shooter.y - this.bubbleRadius - 6;
        this.movingBubble = {
            x: this.shooter.x,
            y: startY,
            vx: Math.cos(angle) * this.shootSpeed,
            vy: Math.sin(angle) * this.shootSpeed,
            color: this.currentBubble.color,
            radius: this.bubbleRadius,
        };

        this.currentBubble = this.nextBubble;
        this.nextBubble = this.generateBubble();
        if (this.currentBubble) {
            this.currentBubble.x = this.shooter.x;
            this.currentBubble.y = startY;
        }
    }

    update() {
        if (!this.isRunning) return;

        const now = performance.now();
        const deltaMs = now - this.lastUpdate;
        this.lastUpdate = now;

        this.timeRemaining -= deltaMs;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.stop();
            return;
        }

        this.lineTimer -= deltaMs;
        if (this.lineTimer <= 0) {
            this.addNewRow();
            const difficultyBoost = Math.min(this.level * 500, 4000);
            const nextInterval = Math.max(this.minLineInterval, this.lineInterval - difficultyBoost);
            this.lineTimer = nextInterval;
        }

        if (this.movingBubble) {
            this.updateMovingBubble(deltaMs);
        }

        if (this.currentBubble && !this.movingBubble) {
            const targetX = this.shooter.x;
            const targetY = this.shooter.y - this.bubbleRadius - 6;
            this.currentBubble.x += (targetX - this.currentBubble.x) * 0.25;
            this.currentBubble.y += (targetY - this.currentBubble.y) * 0.25;
        }

        this.checkLossCondition();
        this.checkVictoryCondition();
        this.updatePopEffects(deltaMs);
    }

    updateMovingBubble(deltaMs) {
        const bubble = this.movingBubble;
        if (!bubble) return;

        let remaining = Math.min(deltaMs, 64);
        const frameTime = 1000 / 60;

        while (remaining > 0 && this.movingBubble) {
            const step = Math.min(remaining, 16);
            const stepFactor = step / frameTime;
            bubble.x += bubble.vx * stepFactor;
            bubble.y += bubble.vy * stepFactor;

            if (bubble.x - bubble.radius <= this.playfieldLeft) {
                bubble.x = this.playfieldLeft + bubble.radius;
                bubble.vx *= -1;
            }

            if (bubble.x + bubble.radius >= this.playfieldRight) {
                bubble.x = this.playfieldRight - bubble.radius;
                bubble.vx *= -1;
            }

            if (bubble.y - bubble.radius <= this.gridStartY) {
                this.attachMovingBubble();
                return;
            }

            if (this.checkCollisionWithGrid(bubble)) {
                this.attachMovingBubble();
                return;
            }

            remaining -= step;
        }
    }

    updatePopEffects(deltaMs) {
        if (!this.popBursts || !this.popParticles) return;

        this.popBursts = this.popBursts.filter(burst => {
            burst.elapsed += deltaMs;
            return burst.elapsed < burst.duration;
        });

        const dt = deltaMs / 1000;
        this.popParticles = this.popParticles.filter(particle => {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vy += 120 * dt;
            particle.life -= deltaMs;
            return particle.life > 0;
        });
    }

    drawPopEffects(ctx) {
        if ((!this.popBursts || this.popBursts.length === 0) && (!this.popParticles || this.popParticles.length === 0)) {
            return;
        }

        ctx.save();
        if (this.popBursts) {
            this.popBursts.forEach(burst => {
                const t = Math.min(burst.elapsed / burst.duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                const radius = burst.radius * (1 + 0.8 * eased);
                ctx.globalAlpha = 0.8 * (1 - eased);
                ctx.lineWidth = 2 + (1 - eased) * 2;
                ctx.strokeStyle = this.shadeColor(burst.color, 0.3);
                ctx.beginPath();
                ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            });
        }

        if (this.popParticles) {
            this.popParticles.forEach(particle => {
                const t = Math.max(particle.life / particle.maxLife, 0);
                ctx.globalAlpha = t;
                ctx.fillStyle = this.shadeColor(particle.color, 0.2);
                const size = particle.radius * (0.6 + (1 - t));
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.restore();
    }

    checkCollisionWithGrid(projectile) {
        for (let row = 0; row < this.grid.length; row++) {
            const rowData = this.grid[row];
            if (!rowData) continue;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (!cell) continue;
                const dx = cell.x - projectile.x;
                const dy = cell.y - projectile.y;
                const distanceSq = dx * dx + dy * dy;
                const minDistance = this.bubbleRadius * 2 - 4;
                if (distanceSq <= minDistance * minDistance) {
                    return true;
                }
            }
        }
        return false;
    }

    attachMovingBubble() {
        if (!this.movingBubble) return;

        const snap = this.findSnapPosition(this.movingBubble.x, this.movingBubble.y);
        if (!snap) {
            this.movingBubble = null;
            this.prepareInitialBubbles();
            return;
        }

        this.placeBubble(snap.row, snap.col, this.movingBubble.color);
        this.movingBubble = null;

        const popped = this.resolveMatches(snap.row, snap.col);
        if (popped >= 3) {
            const gained = popped * 10 + this.combo * 5;
            this.combo = Math.min(this.combo + 1, 5);
            this.updateScore(this.score + gained);
        } else {
            this.combo = 0;
        }

        const dropped = this.removeFloatingBubbles();
        if (dropped > 0) {
            this.updateScore(this.score + dropped * 15);
        }

        this.updateAvailableColors();
    }

    findSnapPosition(x, y) {
        const clampedY = Math.max(this.gridStartY, y);
        let row = Math.round((clampedY - this.gridStartY) / this.rowHeight);
        row = Math.max(0, Math.min(row, this.maxRows - 1));

        const candidates = [];
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
            const scanRow = row + rowOffset;
            if (scanRow < 0 || scanRow >= this.maxRows) continue;
            const offsetX = scanRow % 2 === 0 ? 0 : this.gridSpacing / 2;
            let col = Math.round((x - this.gridStartX - offsetX) / this.gridSpacing);
            col = Math.max(0, Math.min(col, this.cols - 1));
            candidates.push({ row: scanRow, col });
        }

        let bestSpot = null;
        let bestDistance = Infinity;
        for (const candidate of candidates) {
            const { row: candRow, col: candCol } = candidate;
            const isRowOdd = candRow % 2 === 1;
            const maxCol = isRowOdd ? this.cols - 1 : this.cols;
            if (candCol >= maxCol) continue;

            if (!this.grid[candRow]) {
                this.grid[candRow] = new Array(this.cols).fill(null);
            }

            if (this.grid[candRow][candCol]) continue;

            const position = this.computeBubblePosition(candRow, candCol);
            const dx = position.x - x;
            const dy = position.y - y;
            const distance = dx * dx + dy * dy;
            if (distance < bestDistance) {
                bestDistance = distance;
                bestSpot = { row: candRow, col: candCol };
            }
        }

        if (!bestSpot) {
            if (!this.grid[0]) {
                this.grid[0] = new Array(this.cols).fill(null);
            }
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[0][c]) {
                    return { row: 0, col: c };
                }
            }
            return { row: 0, col: 0 };
        }

        return bestSpot;
    }

    placeBubble(row, col, color) {
        if (!this.grid[row]) {
            this.grid[row] = new Array(this.cols).fill(null);
        }

        this.grid[row][col] = this.createGridBubble(row, col, color);
    }

    createGridBubble(row, col, color) {
        const position = this.computeBubblePosition(row, col);
        return {
            row,
            col,
            x: position.x,
            y: position.y,
            color,
            radius: this.bubbleRadius,
        };
    }

    computeBubblePosition(row, col) {
        const offsetX = row % 2 === 0 ? 0 : this.gridSpacing / 2;
        return {
            x: this.gridStartX + offsetX + col * this.gridSpacing,
            y: this.gridStartY + row * this.rowHeight,
        };
    }

    resolveMatches(row, col) {
        const cluster = this.findCluster(row, col);
        if (cluster.length < 3) {
            return cluster.length;
        }

        cluster.forEach(bubble => this.createPopEffect(bubble));
        cluster.forEach(bubble => {
            if (this.grid[bubble.row]) {
                this.grid[bubble.row][bubble.col] = null;
            }
        });

        return cluster.length;
    }

    findCluster(row, col) {
        if (!this.grid[row] || !this.grid[row][col]) return [];
        const targetColor = this.grid[row][col].color;
        const visited = new Set();
        const queue = [{ row, col }];
        const cluster = [];

        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row}_${current.col}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const cell = this.grid[current.row]?.[current.col];
            if (!cell || cell.color !== targetColor) continue;
            cluster.push(cell);

            const neighbors = this.getNeighbors(current.row, current.col);
            neighbors.forEach(neighbor => {
                const neighborCell = this.grid[neighbor.row]?.[neighbor.col];
                if (!neighborCell || neighborCell.color !== targetColor) return;
                queue.push(neighbor);
            });
        }

        return cluster;
    }

    getNeighbors(row, col) {
        const parity = row % 2 === 0 ? 'even' : 'odd';
        const offsets = HEX_OFFSETS[parity];
        const neighbors = [];

        for (const { dr, dc } of offsets) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= this.maxRows || nc < 0 || nc >= this.cols) continue;
            neighbors.push({ row: nr, col: nc });
        }

        return neighbors;
    }

    removeFloatingBubbles() {
        const visited = new Set();
        const queue = [];

        if (this.grid[0]) {
            for (let col = 0; col < this.cols; col++) {
                const cell = this.grid[0][col];
                if (!cell) continue;
                const key = `0_${col}`;
                visited.add(key);
                queue.push({ row: 0, col });
            }
        }

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current.row, current.col);
            neighbors.forEach(neighbor => {
                const cell = this.grid[neighbor.row]?.[neighbor.col];
                if (!cell) return;
                const key = `${neighbor.row}_${neighbor.col}`;
                if (visited.has(key)) return;
                visited.add(key);
                queue.push(neighbor);
            });
        }

        let removed = 0;
        for (let row = 0; row < this.grid.length; row++) {
            const rowData = this.grid[row];
            if (!rowData) continue;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (!cell) continue;
                const key = `${row}_${col}`;
                if (!visited.has(key)) {
                    this.createPopEffect(cell);
                    rowData[col] = null;
                    removed++;
                }
            }
        }

        return removed;
    }

    updateAvailableColors() {
        const present = new Set();
        for (let row = 0; row < this.grid.length; row++) {
            const rowData = this.grid[row];
            if (!rowData) continue;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (!cell) continue;
                present.add(cell.color);
            }
        }

        this.activeColors = present.size > 0 ? Array.from(present) : [...this.colors];
    }

    addNewRow() {
        if (!Array.isArray(this.grid)) {
            this.grid = [];
        }

        const rowsToShift = Math.min(this.grid.length, this.maxRows - 1);
        for (let row = rowsToShift - 1; row >= 0; row--) {
            const rowData = this.grid[row];
            if (!rowData) continue;

            const targetIndex = row + 1;
            if (targetIndex >= this.maxRows) {
                continue;
            }

            this.grid[targetIndex] = rowData;
            rowData.forEach(cell => {
                if (!cell) return;
                cell.row = targetIndex;
                const pos = this.computeBubblePosition(cell.row, cell.col);
                cell.x = pos.x;
                cell.y = pos.y;
            });
            this.grid[row] = new Array(this.cols).fill(null);
        }

        const newRow = new Array(this.cols).fill(null);
        const activeCols = this.cols;
        for (let col = 0; col < activeCols; col++) {
            const color = this.randomColor();
            newRow[col] = this.createGridBubble(0, col, color);
        }
        this.grid[0] = newRow;
        this.updateAvailableColors();
    }

    randomColor() {
        if (!this.activeColors || this.activeColors.length === 0) {
            this.updateAvailableColors();
        }
        const palette = this.activeColors && this.activeColors.length > 0 ? this.activeColors : this.colors;
        const index = Math.floor(Math.random() * palette.length);
        return palette[index];
    }

    generateBubble() {
        return {
            color: this.randomColor(),
            radius: this.bubbleRadius,
            x: this.shooter.x,
            y: this.shooter.y - this.bubbleRadius - 6,
        };
    }

    checkLossCondition() {
        for (let row = 0; row < this.grid.length; row++) {
            const rowData = this.grid[row];
            if (!rowData) continue;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (!cell) continue;
                if (cell.y + cell.radius >= this.lossLine) {
                    this.stop();
                    return;
                }
            }
        }
    }

    checkVictoryCondition() {
        const hasBubbles = this.grid.some(row => row?.some(cell => cell));
        if (!hasBubbles) {
            this.level += 1;
            this.timeRemaining = Math.min(this.timeRemaining + 20000, this.timeLimit);
            this.lineInterval = Math.max(this.minLineInterval, this.lineInterval - 1000);
            this.updateScore(this.score + 500);
            this.generateInitialGrid();
            this.prepareInitialBubbles();
        }
    }

    draw() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0c0824');
        gradient.addColorStop(1, '#211146');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            ctx.beginPath();
            ctx.moveTo(20 + i * 30, 50);
            ctx.lineTo(20 + i * 30, height - 40);
            ctx.stroke();
        }
        ctx.restore();

        this.drawGridBubbles(ctx);
        this.drawPopEffects(ctx);
        this.drawMovingBubble(ctx);
        this.drawShooter(ctx);
        this.drawHud(ctx);
    }

    drawGridBubbles(ctx) {
        for (let row = 0; row < this.grid.length; row++) {
            const rowData = this.grid[row];
            if (!rowData) continue;
            for (let col = 0; col < rowData.length; col++) {
                const cell = rowData[col];
                if (!cell) continue;
                this.drawBubble(ctx, cell.x, cell.y, cell.radius, cell.color);
            }
        }
    }

    drawMovingBubble(ctx) {
        if (this.currentBubble && !this.movingBubble) {
            this.drawBubble(ctx, this.currentBubble.x, this.currentBubble.y, this.currentBubble.radius, this.currentBubble.color);
        }

        if (this.movingBubble) {
            const bubble = this.movingBubble;
            this.drawBubble(ctx, bubble.x, bubble.y, bubble.radius, bubble.color);
        }

        if (this.nextBubble) {
            const previewX = this.canvasWidth - 60;
            const previewY = this.canvasHeight - 70;
            this.drawBubble(ctx, previewX, previewY, this.nextBubble.radius * 0.7, this.nextBubble.color);
            ctx.save();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('NEXT', previewX, previewY + 32);
            ctx.restore();
        }
    }

    drawBubble(ctx, x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.4, radius * 0.1, x, y, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, color);
        gradient.addColorStop(1, this.shadeColor(color, -0.3));

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 2;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    drawShooter(ctx) {
        ctx.save();
        ctx.translate(this.shooter.x, this.shooter.y);

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
        ctx.setLineDash([6, 10]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(this.aimAngle) * 220, Math.sin(this.aimAngle) * 220);
        ctx.stroke();

        ctx.setLineDash([]);

        ctx.fillStyle = '#1b1b3a';
        ctx.beginPath();
        ctx.moveTo(-28, 12);
        ctx.lineTo(0, -20);
        ctx.lineTo(28, 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#3a3a68';
        ctx.fillRect(-16, 12, 32, 14);

        ctx.restore();
    }

    drawHud(ctx) {
        ctx.save();
        const panelHeight = 46;
        ctx.fillStyle = 'rgba(15, 8, 28, 0.75)';
        ctx.fillRect(0, 0, this.canvasWidth, panelHeight);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, this.canvasWidth - 1, panelHeight - 1);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textBaseline = 'middle';

        const seconds = Math.max(0, Math.floor(this.timeRemaining / 1000));

        const lineY = panelHeight / 2;
        ctx.textAlign = 'left';
        ctx.fillText(`Score ${this.score}`, 18, lineY);

        ctx.textAlign = 'right';
        ctx.fillText(`Time ${seconds}s`, this.canvasWidth - 18, lineY);
        ctx.restore();
    }

    shadeColor(hex, percent) {
        let color = hex;
        if (color.startsWith('#')) {
            color = color.slice(1);
        }

        const num = parseInt(color, 16);
        let r = (num >> 16) + Math.floor(255 * percent);
        let g = ((num >> 8) & 0x00ff) + Math.floor(255 * percent);
        let b = (num & 0x0000ff) + Math.floor(255 * percent);

        r = Math.max(Math.min(255, r), 0);
        g = Math.max(Math.min(255, g), 0);
        b = Math.max(Math.min(255, b), 0);

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    createPopEffect(bubble) {
        if (!bubble) return;

        if (!this.popBursts) this.popBursts = [];
        if (!this.popParticles) this.popParticles = [];

        this.popBursts.push({
            x: bubble.x,
            y: bubble.y,
            color: bubble.color,
            radius: bubble.radius,
            elapsed: 0,
            duration: 220
        });

        const particleCount = 10;
        const baseRadius = bubble.radius * 0.3;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * (i / particleCount)) + (Math.random() * 0.6 - 0.3);
            const speed = 110 + Math.random() * 90;
            const lifespan = 280 + Math.random() * 140;
            this.popParticles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: lifespan,
                maxLife: lifespan,
                radius: baseRadius * (0.7 + Math.random() * 0.6),
                color: bubble.color
            });
        }
    }
}

export default BubbleShooterGame;
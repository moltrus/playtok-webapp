import { BaseGame } from './BaseGame.js';

const POTION_TYPES = [
    { id: 'ember', color: '#ff6961' },
    { id: 'glimmer', color: '#50c878' },
    { id: 'azure', color: '#4db2ff' },
    { id: 'mystic', color: '#b98fff' },
    { id: 'sunburst', color: '#ffcf59' },
];

const BOARD_ROWS = 8;
const BOARD_COLS = 8;
const SWAP_POP_DELAY_MS = 260;

export class PuzzlingPotionsGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);

        this.board = [];
        this.selectedCell = null;
        this.boardBusy = false;
        this.pendingCascade = false;
        this.timeLimit = 90000;
        this.timeRemaining = this.timeLimit;
        this.comboLevel = 0;
        this.movesMade = 0;
        this.score = 0;

    this.popBursts = [];
    this.popParticles = [];
    this.popDelayTimer = null;
    this.popPendingPieces = null;
        this.swapDelayMs = SWAP_POP_DELAY_MS;
    this.activeSwapPieces = new Set();
        this.swapDelayMs = SWAP_POP_DELAY_MS;

        this.dragging = false;
        this.dragStartPoint = null;
        this.dragStartCell = null;
        this.dragSwapped = false;
        this.dragStartInsideBoard = false;
        this.tapHandledOnDown = false;

        this.lastUpdate = performance.now();

        this.configureLayout();
        this.resetGameState();
    }

    getInstructions() {
        return 'Tap two neighbouring potions to swap them. Match three or more to brew combos before time runs out!';
    }

    configureLayout() {
        this.updateLogicalDimensions();

        const safeWidth = this.canvasWidth || 360;
        const safeHeight = this.canvasHeight || 640;

        const maxBoardWidth = safeWidth - 40;
        const maxBoardHeight = safeHeight - 160;
        const tileSizeByWidth = Math.floor(maxBoardWidth / BOARD_COLS);
        const tileSizeByHeight = Math.floor(maxBoardHeight / BOARD_ROWS);
        this.tileSize = Math.max(40, Math.min(tileSizeByWidth, tileSizeByHeight, 68));

        this.boardWidth = this.tileSize * BOARD_COLS;
        this.boardHeight = this.tileSize * BOARD_ROWS;
        this.boardOriginX = (safeWidth - this.boardWidth) / 2;
        this.boardOriginY = 90;
        this.tilePadding = Math.max(4, Math.floor(this.tileSize * 0.1));

        this.boardRect = {
            x: this.boardOriginX,
            y: this.boardOriginY,
            width: this.boardWidth,
            height: this.boardHeight,
        };

        this.swapDelayMs = Math.max(200, Math.min(340, this.tileSize * 4));
    }

    start() {
        this.configureLayout();
        this.resetGameState();
        this.lastUpdate = performance.now();
        super.start();
    }

    resetGameState() {
        this.timeRemaining = this.timeLimit;
        this.comboLevel = 0;
        this.movesMade = 0;
        this.boardBusy = false;
        this.pendingCascade = false;
        this.selectedCell = null;
        this.popBursts = [];
        this.popParticles = [];
        this.popDelayTimer = null;
        this.popPendingPieces = null;
        this.score = 0;
        this.resetDragState();
        this.tapHandledOnDown = false;
    this.activeSwapPieces = new Set();
        this.updateScore(0);

        this.generateInitialBoard();
        this.lastUpdate = performance.now();
    }

    generateInitialBoard() {
        let attempts = 0;
        do {
            this.board = new Array(BOARD_ROWS).fill(null).map(() => new Array(BOARD_COLS).fill(null));
            for (let row = 0; row < BOARD_ROWS; row++) {
                for (let col = 0; col < BOARD_COLS; col++) {
                    let type;
                    do {
                        type = this.randomType();
                    } while (this.causesImmediateMatch(row, col, type));
                    this.board[row][col] = this.createPiece(row, col, type);
                    this.board[row][col].y = this.board[row][col].targetY - 40;
                }
            }
            attempts++;
        } while (!this.hasAnyMoves() && attempts < 10);
    }

    randomType() {
        const index = Math.floor(Math.random() * POTION_TYPES.length);
        return POTION_TYPES[index];
    }

    createPiece(row, col, type) {
        const center = this.getCellCenter(row, col);
        return {
            type: type.id,
            color: type.color,
            row,
            col,
            x: center.x,
            y: center.y,
            targetX: center.x,
            targetY: center.y,
        };
    }

    getCellCenter(row, col) {
        return {
            x: this.boardOriginX + col * this.tileSize + this.tileSize / 2,
            y: this.boardOriginY + row * this.tileSize + this.tileSize / 2,
        };
    }

    causesImmediateMatch(row, col, type) {
        const colorId = type.id;
        // Check horizontal
        if (col >= 2) {
            const left1 = this.board[row][col - 1];
            const left2 = this.board[row][col - 2];
            if (left1 && left2 && left1.type === colorId && left2.type === colorId) {
                return true;
            }
        }
        // Check vertical
        if (row >= 2) {
            const up1 = this.board[row - 1][col];
            const up2 = this.board[row - 2][col];
            if (up1 && up2 && up1.type === colorId && up2.type === colorId) {
                return true;
            }
        }
        return false;
    }

    hasAnyMoves() {
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;
                if (col + 1 < BOARD_COLS) {
                    this.swapPiecesInBoard(row, col, row, col + 1, true);
                    const matches = this.findAllMatches();
                    this.swapPiecesInBoard(row, col + 1, row, col, true);
                    if (matches.length > 0) return true;
                }
                if (row + 1 < BOARD_ROWS) {
                    this.swapPiecesInBoard(row, col, row + 1, col, true);
                    const matches = this.findAllMatches();
                    this.swapPiecesInBoard(row + 1, col, row, col, true);
                    if (matches.length > 0) return true;
                }
            }
        }
        return false;
    }

    checkTap(x, y) {
        if (this.boardBusy || this.pendingCascade) return;
        if (!this.isInsideBoard(x, y)) {
            this.selectedCell = null;
            return;
        }

        const { row, col } = this.getCellFromPoint(x, y);
        if (row < 0 || col < 0) {
            this.selectedCell = null;
            return;
        }

        if (!this.selectedCell) {
            this.selectedCell = { row, col };
            return;
        }

        if (this.selectedCell.row === row && this.selectedCell.col === col) {
            this.selectedCell = null;
            return;
        }

        if (!this.areAdjacent(this.selectedCell, { row, col })) {
            this.selectedCell = { row, col };
            return;
        }

        this.attemptSwap(this.selectedCell, { row, col });
    }

    attemptSwap(cellA, cellB) {
        if (this.boardBusy) return;
        const first = this.board[cellA.row][cellA.col];
        const second = this.board[cellB.row][cellB.col];
        if (!first || !second) {
            this.selectedCell = null;
            return;
        }

        this.boardBusy = true;
        this.selectedCell = null;

        this.swapPiecesInBoard(cellA.row, cellA.col, cellB.row, cellB.col, false);
        this.activeSwapPieces.clear();
        if (first) this.activeSwapPieces.add(first);
        if (second) this.activeSwapPieces.add(second);

        const matches = this.findAllMatches();
        if (matches.length === 0) {
            // swap back if no matches
            this.swapPiecesInBoard(cellA.row, cellA.col, cellB.row, cellB.col, false);
            this.activeSwapPieces.clear();
            this.boardBusy = false;
            return;
        }

        this.movesMade += 1;
        this.comboLevel = 1;
        this.handleMatches(matches, false);
    }

    swapPiecesInBoard(rowA, colA, rowB, colB, silent) {
        const pieceA = this.board[rowA][colA];
        const pieceB = this.board[rowB][colB];
        this.board[rowA][colA] = pieceB;
        this.board[rowB][colB] = pieceA;
        if (pieceA) {
            pieceA.row = rowB;
            pieceA.col = colB;
            if (!silent) {
                const center = this.getCellCenter(pieceA.row, pieceA.col);
                pieceA.targetX = center.x;
                pieceA.targetY = center.y;
            }
        }
        if (pieceB) {
            pieceB.row = rowA;
            pieceB.col = colA;
            if (!silent) {
                const center = this.getCellCenter(pieceB.row, pieceB.col);
                pieceB.targetX = center.x;
                pieceB.targetY = center.y;
            }
        }
    }

    handleMatches(matches, isCascade) {
        const uniqueMatches = new Map();
        matches.forEach(({ row, col }) => {
            const piece = this.board[row][col];
            if (!piece) return;
            const key = `${row}_${col}`;
            if (!uniqueMatches.has(key)) {
                uniqueMatches.set(key, piece);
            }
        });

        if (uniqueMatches.size === 0) {
            this.boardBusy = false;
            this.pendingCascade = false;
            this.popDelayTimer = null;
            this.popPendingPieces = null;
            this.activeSwapPieces.clear();
            return;
        }

        const pieces = Array.from(uniqueMatches.values());

        const introducesDelay = pieces.some(piece => piece && this.activeSwapPieces.has(piece));
        this.activeSwapPieces.clear();
        if (introducesDelay) {
            const expectedDelay = this.swapDelayMs ? Math.min(320, this.swapDelayMs * 1.1) : SWAP_POP_DELAY_MS;
            this.popDelayTimer = performance.now() + expectedDelay;
            this.popPendingPieces = pieces;
            pieces.forEach(piece => { if (piece) piece.waitingToPop = true; });
            this.boardBusy = true;
            this.pendingCascade = false;
        } else {
            pieces.forEach(piece => this.createPopEffect(piece));
        }

        if (isCascade) {
            this.comboLevel += 1;
        }

        const basePoints = 40;
        const gained = pieces.length * basePoints * (this.comboLevel || 1);
        this.score += gained;
        this.updateScore(this.score);

        if (!introducesDelay) {
            pieces.forEach(piece => {
                this.board[piece.row][piece.col] = null;
            });

            this.applyGravity();
            this.refillBoard();
            this.boardBusy = true;
            this.pendingCascade = true;
        }
    }

    applyGravity() {
        for (let col = 0; col < BOARD_COLS; col++) {
            let targetRow = BOARD_ROWS - 1;
            for (let row = BOARD_ROWS - 1; row >= 0; row--) {
                const piece = this.board[row][col];
                if (!piece) continue;
                if (row !== targetRow) {
                    this.board[targetRow][col] = piece;
                    this.board[row][col] = null;
                    piece.row = targetRow;
                    piece.col = col;
                    const center = this.getCellCenter(piece.row, piece.col);
                    piece.targetX = center.x;
                    piece.targetY = center.y;
                }
                targetRow--;
            }
            for (let row = targetRow; row >= 0; row--) {
                this.board[row][col] = null;
            }
        }
    }

    refillBoard() {
        for (let col = 0; col < BOARD_COLS; col++) {
            for (let row = 0; row < BOARD_ROWS; row++) {
                if (this.board[row][col]) continue;
                const type = this.randomType();
                const piece = this.createPiece(row, col, type);
                piece.y = this.boardOriginY - this.tileSize * (1 + Math.random());
                piece.targetY = this.getCellCenter(row, col).y;
                this.board[row][col] = piece;
            }
        }
    }

    findAllMatches() {
        const matches = [];

        // Horizontal
        for (let row = 0; row < BOARD_ROWS; row++) {
            let runType = null;
            let runStart = 0;
            let runLength = 0;
            for (let col = 0; col <= BOARD_COLS; col++) {
                const piece = col < BOARD_COLS ? this.board[row][col] : null;
                const type = piece ? piece.type : null;
                if (type === runType && type !== null) {
                    runLength++;
                } else {
                    if (runType !== null && runLength >= 3) {
                        for (let c = runStart; c < runStart + runLength; c++) {
                            matches.push({ row, col: c });
                        }
                    }
                    runType = type;
                    runStart = col;
                    runLength = type === null ? 0 : 1;
                }
            }
        }

        // Vertical
        for (let col = 0; col < BOARD_COLS; col++) {
            let runType = null;
            let runStart = 0;
            let runLength = 0;
            for (let row = 0; row <= BOARD_ROWS; row++) {
                const piece = row < BOARD_ROWS ? this.board[row][col] : null;
                const type = piece ? piece.type : null;
                if (type === runType && type !== null) {
                    runLength++;
                } else {
                    if (runType !== null && runLength >= 3) {
                        for (let r = runStart; r < runStart + runLength; r++) {
                            matches.push({ row: r, col });
                        }
                    }
                    runType = type;
                    runStart = row;
                    runLength = type === null ? 0 : 1;
                }
            }
        }

        return matches;
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

        const waitingToPop = this.popDelayTimer && now >= this.popDelayTimer && this.isBoardSettled();
        if (waitingToPop && this.popPendingPieces && this.popPendingPieces.length > 0) {
            const pieces = this.popPendingPieces;
            pieces.forEach(piece => {
                if (!piece) return;
                this.createPopEffect(piece);
                if (this.board[piece.row] && this.board[piece.row][piece.col] === piece) {
                    this.board[piece.row][piece.col] = null;
                }
                piece.waitingToPop = false;
            });
            this.popPendingPieces = null;
            this.popDelayTimer = null;

            this.applyGravity();
            this.refillBoard();
            this.boardBusy = true;
            this.pendingCascade = true;
        }

        this.updateBoardPositions(deltaMs);
        this.updatePopEffects(deltaMs);

        if (this.boardBusy && !this.popDelayTimer && this.isBoardSettled()) {
            this.boardBusy = false;
        }

        if (!this.boardBusy && this.pendingCascade) {
            const matches = this.findAllMatches();
            if (matches.length > 0) {
                this.handleMatches(matches, true);
            } else {
                this.pendingCascade = false;
                this.comboLevel = 0;
                this.popDelayTimer = null;
                this.popPendingPieces = null;
                if (!this.hasAnyMoves()) {
                    this.reshuffleBoard();
                }
            }
        }
    }

    updateBoardPositions(deltaMs) {
        const easing = Math.min(deltaMs / 120, 0.25);
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;
                piece.x += (piece.targetX - piece.x) * easing;
                piece.y += (piece.targetY - piece.y) * easing;
            }
        }
    }

    isBoardSettled() {
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;
                if (Math.abs(piece.x - piece.targetX) > 0.8 || Math.abs(piece.y - piece.targetY) > 0.8) {
                    return false;
                }
            }
        }
        return true;
    }

    reshuffleBoard() {
        const pieces = [];
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces.push(piece);
                }
            }
        }

        for (let i = pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
        }

        let index = 0;
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = pieces[index++];
                piece.row = row;
                piece.col = col;
                const center = this.getCellCenter(row, col);
                piece.x = center.x;
                piece.y = center.y;
                piece.targetX = center.x;
                piece.targetY = center.y;
                this.board[row][col] = piece;
            }
        }

        if (!this.hasAnyMoves()) {
            this.popDelayTimer = null;
            this.popPendingPieces = null;
            this.reshuffleBoard();
            return;
        }

        const matches = this.findAllMatches();
        if (matches.length > 0) {
            this.handleMatches(matches, false);
        }
    }

    isInsideBoard(x, y) {
        return (
            x >= this.boardRect.x &&
            x <= this.boardRect.x + this.boardRect.width &&
            y >= this.boardRect.y &&
            y <= this.boardRect.y + this.boardRect.height
        );
    }

    getCellFromPoint(x, y) {
        if (!this.isInsideBoard(x, y)) {
            return { row: -1, col: -1 };
        }
        const col = Math.floor((x - this.boardRect.x) / this.tileSize);
        const row = Math.floor((y - this.boardRect.y) / this.tileSize);
        return { row, col };
    }

    areAdjacent(cellA, cellB) {
        const dr = Math.abs(cellA.row - cellB.row);
        const dc = Math.abs(cellA.col - cellB.col);
        return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        ctx.clearRect(0, 0, width, height);

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0b1026');
        gradient.addColorStop(1, '#1f123d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        this.drawBoardBase(ctx);
        this.drawPieces(ctx);
        this.drawSelection(ctx);
        this.drawPopEffects(ctx);
        this.drawHud(ctx);
    }

    drawBoardBase(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(18, 10, 34, 0.95)';
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const radius = 16;
        const { x, y, width, height } = this.boardRect;
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let c = 1; c < BOARD_COLS; c++) {
            const px = this.boardRect.x + c * this.tileSize;
            ctx.beginPath();
            ctx.moveTo(px, this.boardRect.y);
            ctx.lineTo(px, this.boardRect.y + this.boardRect.height);
            ctx.stroke();
        }
        for (let r = 1; r < BOARD_ROWS; r++) {
            const py = this.boardRect.y + r * this.tileSize;
            ctx.beginPath();
            ctx.moveTo(this.boardRect.x, py);
            ctx.lineTo(this.boardRect.x + this.boardRect.width, py);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPieces(ctx) {
        ctx.save();
        for (let row = 0; row < BOARD_ROWS; row++) {
            for (let col = 0; col < BOARD_COLS; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;
                this.drawPiece(ctx, piece);
            }
        }
        ctx.restore();
    }

    drawPiece(ctx, piece) {
    const size = this.tileSize * 0.96;
    const bodyWidth = size * 0.6;
    const halfBody = bodyWidth / 2;
    const bodyHeight = size * 0.64;
    const neckWidth = bodyWidth * 0.46;
    const neckHeight = size * 0.2;
    const corkWidth = neckWidth * 0.9;
    const corkHeight = size * 0.11;
    const glassStroke = Math.max(1.8, size * 0.05);
    const glassRadius = size * 0.18;
    const baseLift = size * 0.06;

        ctx.save();
        ctx.translate(piece.x, piece.y + baseLift);

    // soft shadow under the bottle
    ctx.fillStyle = 'rgba(10, 6, 18, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, bodyHeight * 0.62, bodyWidth * 0.54, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // outer glow aura to amplify shine
    const glowRadius = Math.max(bodyWidth, bodyHeight) * 0.85;
    const glowGradient = ctx.createRadialGradient(0, bodyHeight * 0.05, glowRadius * 0.25, 0, bodyHeight * 0.05, glowRadius);
    glowGradient.addColorStop(0, this.shadeColor(piece.color, 0.45) + '11');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, bodyHeight * 0.05, glowRadius, 0, Math.PI * 2);
    ctx.fill();

        const bodyTop = -(neckHeight + bodyHeight);

        // draw bottle body (glass)
    this.drawRoundedRect(ctx, -halfBody, bodyTop, bodyWidth, bodyHeight, glassRadius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = glassStroke;
        ctx.stroke();

        // draw neck
        const neckLeft = -neckWidth / 2;
        const neckTop = bodyTop - neckHeight + glassStroke * 0.4;
        this.drawRoundedRect(ctx, neckLeft, neckTop, neckWidth, neckHeight, neckWidth * 0.35);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = glassStroke * 0.9;
        ctx.stroke();

        // cork
        const corkLeft = -corkWidth / 2;
        const corkTop = neckTop - corkHeight * 0.95;
        this.drawRoundedRect(ctx, corkLeft, corkTop, corkWidth, corkHeight, corkHeight * 0.35);
        const corkLight = this.shadeColor('#8b5a2b', 0.18);
        const corkDark = this.shadeColor('#8b5a2b', -0.18);
    const corkGradient = ctx.createLinearGradient(0, corkTop, 0, corkTop + corkHeight);
    corkGradient.addColorStop(0, this.shadeColor(corkLight, 0.2));
    corkGradient.addColorStop(1, this.shadeColor(corkDark, -0.15));
        ctx.fillStyle = corkGradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = glassStroke * 0.6;
        ctx.stroke();

        // liquid inside bottle
    const liquidInset = Math.max(2, size * 0.06);
    const liquidWidth = bodyWidth - liquidInset * 1.1;
    const liquidHeight = bodyHeight * 0.8;
        const liquidLeft = -liquidWidth / 2;
        const liquidTop = bodyTop + bodyHeight - liquidHeight - liquidInset * 0.4;
        this.drawRoundedRect(ctx, liquidLeft, liquidTop, liquidWidth, liquidHeight, glassRadius * 0.7);
    const liquidGradient = ctx.createLinearGradient(0, liquidTop, 0, liquidTop + liquidHeight);
    liquidGradient.addColorStop(0, this.enhanceColor(piece.color, 0.35));
    liquidGradient.addColorStop(0.36, this.enhanceColor(piece.color, 0.15));
    liquidGradient.addColorStop(0.78, this.enhanceColor(piece.color, -0.05));
    liquidGradient.addColorStop(1, this.enhanceColor(piece.color, -0.3));
        ctx.fillStyle = liquidGradient;
        ctx.fill();

    // luminous additive overlay to intensify hues
    const saturationGradient = ctx.createRadialGradient(0, liquidTop + liquidHeight * 0.45, liquidWidth * 0.2, 0, liquidTop + liquidHeight * 0.45, liquidWidth * 0.8);
    saturationGradient.addColorStop(0, this.enhanceColor(piece.color, 0.18) + '44');
    saturationGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = saturationGradient;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, liquidTop + liquidHeight * 0.45, liquidWidth * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

        // liquid surface sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.beginPath();
        ctx.ellipse(0, liquidTop + liquidHeight * 0.05, liquidWidth * 0.44, liquidHeight * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

    // bright specular highlight on glass front
    ctx.save();
    ctx.rotate(-Math.PI / 7);
    const specWidth = bodyWidth * 0.18;
    const specHeight = bodyHeight * 0.6;
    const specGradient = ctx.createLinearGradient(0, -specHeight / 2, specWidth, specHeight / 2);
    specGradient.addColorStop(0, 'rgba(255,255,255,0)');
    specGradient.addColorStop(0.45, 'rgba(255,255,255,0.36)');
    specGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specGradient;
    ctx.beginPath();
    ctx.ellipse(-bodyWidth * 0.05, bodyHeight * 0.08, specWidth, specHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

        // internal motif / herb per potion type
    const motifColor = this.shadeColor(piece.color, 0.4);
        const motifY = liquidTop + liquidHeight * 0.4;
    ctx.fillStyle = this.enhanceColor(motifColor, 0.35);
        switch (piece.type) {
            case 'glimmer': { // leaf
                ctx.beginPath();
                ctx.moveTo(-liquidWidth * 0.18, motifY + liquidHeight * 0.05);
                ctx.quadraticCurveTo(0, motifY - liquidHeight * 0.25, liquidWidth * 0.18, motifY + liquidHeight * 0.02);
                ctx.quadraticCurveTo(0, motifY + liquidHeight * 0.22, -liquidWidth * 0.18, motifY + liquidHeight * 0.05);
                ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
            ctx.lineWidth = Math.max(1.3, size * 0.03);
                ctx.beginPath();
                ctx.moveTo(0, motifY - liquidHeight * 0.2);
                ctx.quadraticCurveTo(-liquidWidth * 0.02, motifY, 0, motifY + liquidHeight * 0.18);
                ctx.stroke();
                break;
            }
            case 'ember': { // flame shard
                ctx.beginPath();
                ctx.moveTo(0, motifY - liquidHeight * 0.3);
                ctx.quadraticCurveTo(liquidWidth * 0.18, motifY - liquidHeight * 0.05, 0, motifY + liquidHeight * 0.28);
                ctx.quadraticCurveTo(-liquidWidth * 0.18, motifY - liquidHeight * 0.05, 0, motifY - liquidHeight * 0.3);
                ctx.fill();
                break;
            }
            case 'mystic': { // star
                const starRadius = liquidWidth * 0.18;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const innerAngle = angle + Math.PI / 5;
                    const outerX = Math.cos(angle) * starRadius;
                    const outerY = motifY + Math.sin(angle) * starRadius;
                    const innerX = Math.cos(innerAngle) * (starRadius * 0.45);
                    const innerY = motifY + Math.sin(innerAngle) * (starRadius * 0.45);
                    if (i === 0) {
                        ctx.moveTo(outerX, outerY);
                    } else {
                        ctx.lineTo(outerX, outerY);
                    }
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'sunburst': { // citrus slice
                const sliceRadius = liquidWidth * 0.22;
                ctx.beginPath();
                ctx.arc(0, motifY + sliceRadius * 0.4, sliceRadius, Math.PI * 0.1, Math.PI * 1.1);
                ctx.lineTo(0, motifY + sliceRadius * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = Math.max(1.1, size * 0.025);
                for (let i = -2; i <= 2; i++) {
                    const angle = Math.PI * (0.1 + 0.2 * i);
                    ctx.beginPath();
                    ctx.moveTo(0, motifY + sliceRadius * 0.4);
                    ctx.lineTo(Math.cos(angle) * sliceRadius, motifY + sliceRadius * 0.4 + Math.sin(angle) * sliceRadius);
                    ctx.stroke();
                }
                break;
            }
            default: { // floating orb for others
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(0, motifY, liquidWidth * 0.18, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
                break;
            }
        }

        // small bubbles rising inside liquid
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        for (let i = 0; i < 4; i++) {
            const bubbleX = (i - 1.5) * liquidWidth * 0.2;
            const bubbleY = liquidTop + liquidHeight * (0.18 + i * 0.16);
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, size * 0.042 * (0.95 - i * 0.13), 0, Math.PI * 2);
            ctx.fill();
        }

        // glass highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = glassStroke * 0.75;
        ctx.beginPath();
        ctx.moveTo(-halfBody * 0.72, bodyTop + bodyHeight * 0.2);
        ctx.quadraticCurveTo(-halfBody, bodyTop + bodyHeight * 0.38, -halfBody * 0.52, bodyTop + bodyHeight * 0.63);
        ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = glassStroke * 0.65;
        ctx.beginPath();
        ctx.moveTo(halfBody * 0.42, bodyTop + bodyHeight * 0.25);
        ctx.lineTo(halfBody * 0.68, bodyTop + bodyHeight * 0.5);
        ctx.stroke();

        ctx.restore();
    }

    drawSelection(ctx) {
        if (!this.selectedCell) return;
        const { row, col } = this.selectedCell;
        const piece = this.board[row][col];
        if (!piece) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
    const size = this.tileSize * 1.05;
    const baseLift = size * 0.07;
    const selectionOffsetY = baseLift + this.tileSize * 0.42;
    const circleRadius = Math.max(this.tileSize * 0.5, (this.tileSize / 2) - this.tilePadding + 6);
    ctx.arc(piece.x, piece.y - selectionOffsetY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
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
            particle.vy += 150 * dt;
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
                const radius = burst.radius * (1 + 1.2 * eased);
                ctx.globalAlpha = 0.8 * (1 - eased);
                ctx.lineWidth = 2 + (1 - eased) * 3;
                ctx.strokeStyle = this.shadeColor(burst.color, 0.25);
                ctx.beginPath();
                ctx.arc(burst.x, burst.y, radius, 0, Math.PI * 2);
                ctx.stroke();
            });
        }

        if (this.popParticles) {
            this.popParticles.forEach(particle => {
                const t = Math.max(particle.life / particle.maxLife, 0);
                ctx.globalAlpha = t;
                ctx.fillStyle = this.shadeColor(particle.color, 0.15);
                const size = particle.radius * (0.8 + (1 - t));
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        ctx.restore();
    }

    drawHud(ctx) {
        ctx.save();
        const panelHeight = 58;
        ctx.fillStyle = 'rgba(15, 8, 28, 0.75)';
        ctx.fillRect(0, 0, this.canvasWidth, panelHeight);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, this.canvasWidth - 1, panelHeight - 1);

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textBaseline = 'middle';

        const seconds = Math.max(0, Math.floor(this.timeRemaining / 1000));
        const midY = panelHeight / 2;

        ctx.textAlign = 'left';
        ctx.fillText(`Score ${this.score}`, 18, midY - 10);
        ctx.fillText(`Moves ${this.movesMade}`, 18, midY + 10);

        ctx.textAlign = 'right';
        ctx.fillText(`Combo x${Math.max(this.comboLevel, 1)}`, this.canvasWidth - 18, midY - 10);
        ctx.fillText(`Time ${seconds}s`, this.canvasWidth - 18, midY + 10);
        ctx.restore();
    }

    createPopEffect(bubble) {
        if (!bubble) return;

        if (!this.popBursts) this.popBursts = [];
        if (!this.popParticles) this.popParticles = [];

        this.popBursts.push({
            x: bubble.x,
            y: bubble.y,
            color: bubble.color,
            radius: this.tileSize * 0.4,
            elapsed: 0,
            duration: 240,
        });

        const particleCount = 12;
        const baseRadius = this.tileSize * 0.18;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * (i / particleCount)) + (Math.random() * 0.6 - 0.3);
            const speed = 130 + Math.random() * 110;
            const lifespan = 300 + Math.random() * 160;
            this.popParticles.push({
                x: bubble.x,
                y: bubble.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: lifespan,
                maxLife: lifespan,
                radius: baseRadius * (0.7 + Math.random() * 0.6),
                color: bubble.color,
            });
        }
    }

    getSwipeThreshold() {
        return Math.max(12, this.tileSize * 0.3);
    }

    getPointerClientPosition(event) {
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            return { clientX: touch.clientX, clientY: touch.clientY };
        }
        if (event.changedTouches && event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            return { clientX: touch.clientX, clientY: touch.clientY };
        }
        return { clientX: event.clientX, clientY: event.clientY };
    }

    handlePointerDown(event) {
        if (!this.isRunning) return;

        const { clientX, clientY } = this.getPointerClientPosition(event);
        const { x, y } = this.getLogicalCoordinates(clientX, clientY);

        this.tapHandledOnDown = false;
        this.resetDragState();

        if (this.boardBusy || this.pendingCascade) {
            return;
        }

        if (!this.isInsideBoard(x, y)) {
            this.checkTap(x, y);
            this.tapHandledOnDown = true;
            return;
        }

        const cell = this.getCellFromPoint(x, y);
        if (cell.row < 0 || cell.col < 0) {
            return;
        }

        const piece = this.board[cell.row][cell.col];
        if (!piece) {
            return;
        }

        this.dragging = true;
        this.dragStartPoint = { x, y };
        this.dragStartCell = { ...cell };
        this.dragStartInsideBoard = true;
        this.dragSwapped = false;
    }

    handlePointerMove(event) {
        if (!this.dragging || this.dragSwapped) return;
        if (this.boardBusy || this.pendingCascade) return;

        const startPoint = this.dragStartPoint;
        const startCell = this.dragStartCell;
        if (!startPoint || !startCell) return;

        const { clientX, clientY } = this.getPointerClientPosition(event);
        const { x, y } = this.getLogicalCoordinates(clientX, clientY);

        const dx = x - startPoint.x;
        const dy = y - startPoint.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.getSwipeThreshold()) {
            return;
        }

        const horizontal = Math.abs(dx) >= Math.abs(dy);
        const direction = horizontal ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);

        const target = horizontal
            ? { row: startCell.row, col: startCell.col + direction }
            : { row: startCell.row + direction, col: startCell.col };

        if (target.row < 0 || target.row >= BOARD_ROWS || target.col < 0 || target.col >= BOARD_COLS) {
            return;
        }

        this.dragSwapped = true;
        this.dragging = false;
        this.selectedCell = null;
        this.attemptSwap(startCell, target);
    }

    handlePointerUp(event) {
        if (!this.isRunning) {
            this.tapHandledOnDown = false;
            this.resetDragState();
            return;
        }

        if (this.tapHandledOnDown) {
            this.tapHandledOnDown = false;
            this.resetDragState();
            return;
        }

        const startCell = this.dragStartCell ? { ...this.dragStartCell } : null;
        const startPoint = this.dragStartPoint ? { ...this.dragStartPoint } : null;
        const beganInside = this.dragStartInsideBoard;

        const { clientX, clientY } = this.getPointerClientPosition(event);
        const { x, y } = this.getLogicalCoordinates(clientX, clientY);

        if (!this.dragSwapped) {
            if (beganInside && startCell && startPoint && !this.boardBusy && !this.pendingCascade) {
                const threshold = this.getSwipeThreshold();
                const distance = Math.hypot(x - startPoint.x, y - startPoint.y);

                let tapCell = null;

                if (distance <= threshold * 0.5) {
                    tapCell = startCell;
                } else if (this.isInsideBoard(x, y)) {
                    tapCell = this.getCellFromPoint(x, y);
                }

                if (tapCell && tapCell.row >= 0 && tapCell.col >= 0) {
                    const center = this.getCellCenter(tapCell.row, tapCell.col);
                    this.checkTap(center.x, center.y);
                } else if (!tapCell) {
                    this.selectedCell = null;
                }
            } else {
                this.checkTap(x, y);
            }
        }

        this.tapHandledOnDown = false;
        this.resetDragState();
    }

    handleTouchMove(event) {
        event.preventDefault();
        this.handlePointerMove(event);
    }

    handleMouseMove(event) {
        event.preventDefault();
        this.handlePointerMove(event);
    }

    handleTouchEnd(event) {
        event.preventDefault();
        this.handlePointerUp(event);
    }

    handleMouseUp(event) {
        event.preventDefault();
        this.handlePointerUp(event);
    }

    resetDragState() {
        this.dragging = false;
        this.dragStartPoint = null;
        this.dragStartCell = null;
        this.dragSwapped = false;
        this.dragStartInsideBoard = false;
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    enhanceColor(hex, boost = 0) {
        let color = hex;
        if (color.startsWith('#')) {
            color = color.slice(1);
        }

        if (color.length === 3) {
            color = color.split('').map(ch => ch + ch).join('');
        }

        const num = parseInt(color, 16);
        let r = (num >> 16) & 0xff;
        let g = (num >> 8) & 0xff;
        let b = num & 0xff;

        const avg = (r + g + b) / 3;
    const saturationBoost = 1 + boost * 0.65;
    const brighten = 255 * boost * 0.05;
    r = Math.max(0, Math.min(255, avg + (r - avg) * saturationBoost + brighten));
    g = Math.max(0, Math.min(255, avg + (g - avg) * saturationBoost + brighten));
    b = Math.max(0, Math.min(255, avg + (b - avg) * saturationBoost + brighten));

        return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`;
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
}

export default PuzzlingPotionsGame;
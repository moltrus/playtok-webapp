import { BaseGame } from './BaseGame.js';

const TILE_STYLES = {
	2: { fill: '#11142f', text: '#00ffff', glow: 'rgba(0, 255, 255, 0.35)' },
	4: { fill: '#151a3c', text: '#00ffff', glow: 'rgba(0, 255, 255, 0.38)' },
	8: { fill: '#1a2455', text: '#8a2be2', glow: 'rgba(138, 43, 226, 0.45)' },
	16: { fill: '#1f2f6d', text: '#8a2be2', glow: 'rgba(138, 43, 226, 0.5)' },
	32: { fill: '#243987', text: '#f9f6f2', glow: 'rgba(0, 255, 255, 0.55)' },
	64: { fill: '#2b449f', text: '#f9f6f2', glow: 'rgba(0, 255, 255, 0.6)' },
	128: { fill: '#334fb8', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.65)' },
	256: { fill: '#3c5bd1', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.7)' },
	512: { fill: '#4667eb', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.75)' },
	1024: { fill: '#5473ff', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.8)' },
	2048: { fill: '#6783ff', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.85)' },
	4096: { fill: '#7e96ff', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.9)' },
	default: { fill: '#8ca3ff', text: '#0a0a1f', glow: 'rgba(0, 255, 255, 0.95)' }
};

const BOARD_THEME = {
	gradient: ['#050515', '#141c3f', '#050515'],
	outline: 'rgba(0, 255, 255, 0.35)',
	cellFill: 'rgba(13, 20, 42, 0.92)',
	cellInnerGlow: 'rgba(0, 255, 255, 0.18)',
	cellShadow: 'rgba(0, 255, 255, 0.22)',
	fontFamily: '"Orbitron", "Press Start 2P", "Helvetica Neue", Arial, sans-serif'
};

const OVERLAY_BACKGROUND = 'rgba(8, 8, 24, 0.86)';
const OVERLAY_TEXT = '#00ffff';
const OVERLAY_GLOW = 'rgba(0, 255, 255, 0.6)';

const EMPTY_CELL_THEME = {
	fill: 'rgba(16, 22, 48, 0.92)',
	accentFill: 'rgba(22, 30, 60, 0.96)',
	border: 'rgba(0, 255, 255, 0.22)',
	accentLine: 'rgba(0, 255, 255, 0.28)',
	connector: 'rgba(0, 255, 255, 0.2)',
	highlight: 'rgba(255, 255, 255, 0.12)'
};

function getTileStyle(value) {
	return TILE_STYLES[value] || TILE_STYLES.default;
}

function colorToNumber(color) {
	if (typeof color !== 'string') {
		return 0xffffff;
	}
	if (color.startsWith('#')) {
		return Number(`0x${color.slice(1)}`);
	}
	return 0xffffff;
}

const safeWindow = typeof window !== 'undefined' ? window : undefined;

const fakeStorage = {
	_data: {},
	setItem(key, value) {
		this._data[key] = String(value);
	},
	getItem(key) {
		return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : undefined;
	},
	removeItem(key) {
		delete this._data[key];
	},
	clear() {
		this._data = {};
	}
};

class Grid {
	constructor(size) {
		this.size = size;
		this.cells = this.empty();
	}

	empty() {
		const cells = [];
		for (let x = 0; x < this.size; x++) {
			const row = cells[x] = [];
			for (let y = 0; y < this.size; y++) {
				row.push(null);
			}
		}
		return cells;
	}

	fromState(state) {
		const cells = [];
		for (let x = 0; x < this.size; x++) {
			const row = cells[x] = [];
			for (let y = 0; y < this.size; y++) {
				const tile = state[x][y];
				row.push(tile ? new Tile(tile.position, tile.value) : null);
			}
		}
		return cells;
	}

	randomAvailableCell() {
		const cells = this.availableCells();
		if (cells.length) {
			return cells[Math.floor(Math.random() * cells.length)];
		}
		return null;
	}

	availableCells() {
		const cells = [];
		this.eachCell((x, y, tile) => {
			if (!tile) {
				cells.push({ x, y });
			}
		});
		return cells;
	}

	eachCell(callback) {
		for (let x = 0; x < this.size; x++) {
			for (let y = 0; y < this.size; y++) {
				callback(x, y, this.cells[x][y]);
			}
		}
	}

	cellsAvailable() {
		return this.availableCells().length > 0;
	}

	cellContent(cell) {
		if (this.withinBounds(cell)) {
			return this.cells[cell.x][cell.y];
		}
		return null;
	}

	insertTile(tile) {
		this.cells[tile.x][tile.y] = tile;
	}

	removeTile(tile) {
		this.cells[tile.x][tile.y] = null;
	}

	withinBounds(position) {
		return position.x >= 0 && position.x < this.size && position.y >= 0 && position.y < this.size;
	}

	serialize() {
		const cellState = [];
		for (let x = 0; x < this.size; x++) {
			cellState[x] = [];
			for (let y = 0; y < this.size; y++) {
				cellState[x].push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
			}
		}
		return { size: this.size, cells: cellState };
	}
}

class Tile {
	constructor(position, value) {
		this.x = position.x;
		this.y = position.y;
		this.value = value || 2;
		this.previousPosition = null;
		this.mergedFrom = null;
	}

	savePosition() {
		this.previousPosition = { x: this.x, y: this.y };
	}

	updatePosition(position) {
		this.x = position.x;
		this.y = position.y;
	}

	serialize() {
		return { position: { x: this.x, y: this.y }, value: this.value };
	}
}

class LocalStorageManager {
	constructor() {
		this.bestScoreKey = 'bestScore';
		this.gameStateKey = 'gameState';
		this.storage = this.localStorageSupported() ? safeWindow.localStorage : fakeStorage;
	}

	localStorageSupported() {
		if (!safeWindow || !safeWindow.localStorage) {
			return false;
		}
		try {
			safeWindow.localStorage.setItem('test', '1');
			safeWindow.localStorage.removeItem('test');
			return true;
		} catch (err) {
			return false;
		}
	}

	getBestScore() {
		return Number(this.storage.getItem(this.bestScoreKey)) || 0;
	}

	setBestScore(score) {
		this.storage.setItem(this.bestScoreKey, score);
	}

	getGameState() {
		const stateJSON = this.storage.getItem(this.gameStateKey);
		return stateJSON ? JSON.parse(stateJSON) : null;
	}

	setGameState(gameState) {
		this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
	}

	clearGameState() {
		this.storage.removeItem(this.gameStateKey);
	}
}

class KeyboardInputManager {
	constructor(options = {}) {
		this.events = {};
		this.touchTarget = options.touchTarget || (safeWindow ? safeWindow.document : null);
		this.buttonRoot = options.buttonRoot || (safeWindow ? safeWindow.document : null);

		if (safeWindow && safeWindow.navigator && safeWindow.navigator.msPointerEnabled) {
			this.eventTouchstart = 'MSPointerDown';
			this.eventTouchmove = 'MSPointerMove';
			this.eventTouchend = 'MSPointerUp';
		} else {
			this.eventTouchstart = 'touchstart';
			this.eventTouchmove = 'touchmove';
			this.eventTouchend = 'touchend';
		}

		this.keydownHandler = null;
		this.boundButtonHandlers = [];
		this.touchHandlers = [];
		this.listen();
	}

	on(event, callback) {
		if (!this.events[event]) {
			this.events[event] = [];
		}
		this.events[event].push(callback);
	}

	emit(event, data) {
		const callbacks = this.events[event];
		if (callbacks) {
			callbacks.forEach(cb => cb(data));
		}
	}

	listen() {
		const doc = safeWindow ? safeWindow.document : null;
		const map = {
			38: 0,
			39: 1,
			40: 2,
			37: 3,
			75: 0,
			76: 1,
			74: 2,
			72: 3,
			87: 0,
			68: 1,
			83: 2,
			65: 3
		};

		if (doc) {
			const keyHandler = event => {
				const modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
				const mapped = map[event.which];

				if (!modifiers && mapped !== undefined) {
					event.preventDefault();
					this.emit('move', mapped);
				}

				if (!modifiers && event.which === 82) {
					event.preventDefault();
					this.emit('restart');
				}

				if (!modifiers && event.which === 75) {
					event.preventDefault();
					this.emit('keepPlaying');
				}
			};

			doc.addEventListener('keydown', keyHandler);
			this.keydownHandler = keyHandler;
		}

		const surface = this.touchTarget && this.touchTarget.addEventListener ? this.touchTarget : doc;
		if (!surface) {
			return;
		}

		let touchStartX = 0;
		let touchStartY = 0;

		const touchStart = event => {
			if (!event) {
				return;
			}

			const multiTouch = event.touches && event.touches.length > 1;
			const targetTouch = event.targetTouches && event.targetTouches.length > 1;
			if ((!safeWindow || !safeWindow.navigator || !safeWindow.navigator.msPointerEnabled) && (multiTouch || targetTouch)) {
				return;
			}

			const point = this.resolvePoint(event, 'start');
			touchStartX = point.x;
			touchStartY = point.y;

			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
		};

		const touchMove = event => {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
		};

		const touchEnd = event => {
			const stillTouching = (event.touches && event.touches.length > 0) || (event.targetTouches && event.targetTouches.length > 0);
			if ((!safeWindow || !safeWindow.navigator || !safeWindow.navigator.msPointerEnabled) && stillTouching) {
				return;
			}

			const point = this.resolvePoint(event, 'end');
			const dx = point.x - touchStartX;
			const absDx = Math.abs(dx);
			const dy = point.y - touchStartY;
			const absDy = Math.abs(dy);

			if (Math.max(absDx, absDy) > 10) {
				this.emit('move', absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
			}
		};

		surface.addEventListener(this.eventTouchstart, touchStart, { passive: false });
		surface.addEventListener(this.eventTouchmove, touchMove, { passive: false });
		surface.addEventListener(this.eventTouchend, touchEnd, { passive: false });

		this.touchHandlers.push({ target: surface, handler: touchStart, type: this.eventTouchstart });
		this.touchHandlers.push({ target: surface, handler: touchMove, type: this.eventTouchmove });
		this.touchHandlers.push({ target: surface, handler: touchEnd, type: this.eventTouchend });

		this.bindButtonPress('.retry-button', this.restart);
		this.bindButtonPress('.restart-button', this.restart);
		this.bindButtonPress('.keep-playing-button', this.keepPlaying);
	}

	resolvePoint(event, phase) {
		if (!event) {
			return { x: 0, y: 0 };
		}

		if (safeWindow && safeWindow.navigator && safeWindow.navigator.msPointerEnabled) {
			return { x: event.pageX, y: event.pageY };
		}

		if (phase === 'end' && event.changedTouches && event.changedTouches.length > 0) {
			return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
		}

		if (event.touches && event.touches.length > 0) {
			return { x: event.touches[0].clientX, y: event.touches[0].clientY };
		}

		return { x: event.clientX || 0, y: event.clientY || 0 };
	}

	restart(event) {
		if (event && typeof event.preventDefault === 'function') {
			event.preventDefault();
		}
		this.emit('restart');
	}

	keepPlaying(event) {
		if (event && typeof event.preventDefault === 'function') {
			event.preventDefault();
		}
		this.emit('keepPlaying');
	}

	bindButtonPress(selector, fn) {
		if (!this.buttonRoot || !this.buttonRoot.querySelector) {
			return;
		}

		const button = this.buttonRoot.querySelector(selector);
		if (!button) {
			return;
		}

		const handler = fn.bind(this);
		button.addEventListener('click', handler);
		button.addEventListener(this.eventTouchend, handler);

		this.boundButtonHandlers.push({ button, handler });
	}

	unbind() {
		const doc = safeWindow ? safeWindow.document : null;
		if (doc && this.keydownHandler) {
			doc.removeEventListener('keydown', this.keydownHandler);
			this.keydownHandler = null;
		}

		this.boundButtonHandlers.forEach(({ button, handler }) => {
			button.removeEventListener('click', handler);
			button.removeEventListener(this.eventTouchend, handler);
		});
		this.boundButtonHandlers = [];

		this.touchHandlers.forEach(({ target, handler, type }) => {
			if (target && target.removeEventListener) {
				target.removeEventListener(type, handler);
			}
		});
		this.touchHandlers = [];
	}
}

class CanvasActuator {
	constructor(canvas, ctx, scoreCallback) {
		this.canvas = canvas;
		this.ctx = ctx;
		this.scoreCallback = scoreCallback;
		this.gridSize = 4;
		this.metrics = this.computeMetrics();
		this.score = 0;
		this.bestScore = 0;
		this.animationFrameId = null;
		this.animationDuration = 160;
	}

	actuate(grid, metadata) {
		if (!this.ctx) {
			return;
		}

		this.metrics = this.computeMetrics();
		if (this.animationFrameId !== null) {
			this.cancelFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		const animationState = this.captureAnimationState(grid);
		this.updateScore(metadata.score);
		this.updateBestScore(metadata.bestScore);

		if (!animationState.hasMovement) {
			this.renderAnimationFrame(animationState, metadata, 1);
			return;
		}

		const startTime = this.now();
		const step = timestamp => {
			const elapsed = Math.max(0, timestamp - startTime);
			const progress = this.clamp(elapsed / this.animationDuration, 0, 1);
			this.renderAnimationFrame(animationState, metadata, progress);
			if (progress < 1) {
				this.animationFrameId = this.requestFrame(step);
			} else {
				this.animationFrameId = null;
			}
		};

		this.animationFrameId = this.requestFrame(step);
	}

	dispose() {
		if (this.animationFrameId !== null) {
			this.cancelFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	computeMetrics() {
		const width = this.logicalDimension('width');
		const height = this.logicalDimension('height');
		const playable = Math.min(width, height) * 0.92;
		const spacing = Math.max(Math.floor(playable * 0.04), 6);
		const tile = Math.floor((playable - spacing * 5) / this.gridSize);
		const boardSize = tile * this.gridSize + spacing * (this.gridSize + 1);
		const offsetX = Math.floor((width - boardSize) / 2);
		const offsetY = Math.floor((height - boardSize) / 2);

		return { width, height, spacing, tile, boardSize, offsetX, offsetY };
	}

	logicalDimension(axis) {
		if (!this.canvas) {
			return axis === 'width' ? 320 : 480;
		}

		const datasetKey = axis === 'width' ? 'logicalWidth' : 'logicalHeight';
		const attr = this.canvas.dataset ? Number(this.canvas.dataset[datasetKey]) : NaN;

		if (!Number.isNaN(attr) && attr > 0) {
			return attr;
		}

		const ratio = safeWindow && safeWindow.devicePixelRatio ? safeWindow.devicePixelRatio : 1;
		return axis === 'width' ? this.canvas.width / ratio : this.canvas.height / ratio;
	}

	clear() {
		const { width, height } = this.metrics;
		this.ctx.clearRect(0, 0, width, height);
	}

	drawBoard() {
		const { tile, offsetX, offsetY, boardSize } = this.metrics;

		this.ctx.save();
		const gradient = this.ctx.createLinearGradient(offsetX, offsetY, offsetX + boardSize, offsetY + boardSize);
		gradient.addColorStop(0, BOARD_THEME.gradient[0]);
		gradient.addColorStop(0.5, BOARD_THEME.gradient[1]);
		gradient.addColorStop(1, BOARD_THEME.gradient[2]);
		this.ctx.fillStyle = gradient;
		this.ctx.shadowBlur = Math.max(18, tile * 1.8);
		this.ctx.shadowColor = BOARD_THEME.outline;
		this.ctx.fillRect(offsetX, offsetY, boardSize, boardSize);
		this.ctx.lineWidth = Math.max(2, Math.floor(tile * 0.14));
		this.ctx.strokeStyle = BOARD_THEME.outline;
		this.ctx.globalAlpha = 0.6;
		this.ctx.strokeRect(
			offsetX + this.ctx.lineWidth / 2,
			offsetY + this.ctx.lineWidth / 2,
			boardSize - this.ctx.lineWidth,
			boardSize - this.ctx.lineWidth
		);
		this.ctx.restore();

		for (let x = 0; x < this.gridSize; x++) {
			for (let y = 0; y < this.gridSize; y++) {
				const pos = this.cellPosition(x, y);
				this.drawVacantCell(pos.x, pos.y, tile);
			}
		}
	}

	drawVacantCell(cellX, cellY, tileSize) {
		const radius = Math.floor(tileSize * 0.16);
		const outerInset = tileSize * 0.06;
		const innerInset = tileSize * 0.12;
		const connectorThickness = Math.max(1, tileSize * 0.04);
		const connectorLength = tileSize * 0.22;

		this.ctx.save();
		this.ctx.fillStyle = EMPTY_CELL_THEME.fill;
		this.roundedRect(cellX, cellY, tileSize, tileSize, radius);
		this.ctx.fill();

		this.ctx.fillStyle = EMPTY_CELL_THEME.accentFill;
		this.roundedRect(
			cellX + outerInset,
			cellY + outerInset,
			tileSize - outerInset * 2,
			tileSize - outerInset * 2,
			radius * 0.75
		);
		this.ctx.fill();

		this.ctx.globalAlpha = 1;
		this.ctx.lineWidth = Math.max(1, tileSize * 0.03);
		this.ctx.strokeStyle = EMPTY_CELL_THEME.border;
		this.roundedRect(
			cellX + innerInset,
			cellY + innerInset,
			tileSize - innerInset * 2,
			tileSize - innerInset * 2,
			radius * 0.55
		);
		this.ctx.stroke();

		this.ctx.fillStyle = EMPTY_CELL_THEME.connector;
		const centerY = cellY + tileSize / 2 - connectorThickness / 2;
		const centerX = cellX + tileSize / 2 - connectorThickness / 2;
		this.ctx.fillRect(cellX - connectorLength * 0.4, centerY, connectorLength, connectorThickness);
		this.ctx.fillRect(cellX + tileSize - connectorLength * 0.6, centerY, connectorLength, connectorThickness);
		this.ctx.fillRect(centerX, cellY - connectorLength * 0.4, connectorThickness, connectorLength);
		this.ctx.fillRect(centerX, cellY + tileSize - connectorLength * 0.6, connectorThickness, connectorLength);

		this.ctx.lineWidth = Math.max(1, tileSize * 0.015);
		this.ctx.strokeStyle = EMPTY_CELL_THEME.accentLine;
		this.ctx.beginPath();
		this.ctx.moveTo(cellX + innerInset * 0.8, cellY + innerInset * 1.6);
		this.ctx.lineTo(cellX + tileSize - innerInset * 0.8, cellY + innerInset * 1.6);
		this.ctx.moveTo(cellX + innerInset * 0.8, cellY + tileSize - innerInset * 1.6);
		this.ctx.lineTo(cellX + tileSize - innerInset * 0.8, cellY + tileSize - innerInset * 1.6);
		this.ctx.stroke();

		this.ctx.lineWidth = Math.max(1, tileSize * 0.012);
		this.ctx.strokeStyle = EMPTY_CELL_THEME.highlight;
		this.ctx.beginPath();
		this.ctx.moveTo(cellX + innerInset * 0.9, cellY + outerInset * 1.2);
		this.ctx.lineTo(cellX + tileSize - innerInset * 0.9, cellY + outerInset * 1.2);
		this.ctx.stroke();

		this.ctx.restore();
	}

	renderAnimationFrame(animationState, metadata, progress) {
		this.clear();
		this.drawBoard();

		if (progress < 1) {
			animationState.mergeSplashes.forEach(piece => this.drawMergePiece(piece, progress));
		}

		const regularTiles = animationState.tiles.filter(tile => !tile.isMergeResult);
		const mergeTiles = animationState.tiles.filter(tile => tile.isMergeResult);
		regularTiles.forEach(tile => this.drawAnimatedTile(tile, progress));
		mergeTiles.forEach(tile => this.drawAnimatedTile(tile, progress));

		if (metadata && metadata.terminated) {
			// Overlay handled by PlayTok, so only optionally render fallback copy when needed.
		}
	}

	drawAnimatedTile(tile, progress) {
		const easedProgress = this.easeOutCubic(progress);
		const position = {
			x: tile.from.x + (tile.to.x - tile.from.x) * easedProgress,
			y: tile.from.y + (tile.to.y - tile.from.y) * easedProgress
		};

		let scale = 1;
		let alpha = 1;

		if (tile.isNew) {
			const appear = this.easeOutBack(progress);
			scale = 0.2 + 0.8 * appear;
			alpha = this.clamp(progress * 1.4, 0, 1);
		} else if (tile.isMergeResult) {
			const mergeProgress = this.clamp((progress - 0.35) / 0.65, 0, 1);
			const pop = Math.sin(mergeProgress * Math.PI);
			scale = 1 + 0.18 * pop;
			alpha = this.clamp((progress - 0.2) / 0.8, 0, 1);
		}

		this.drawTileVisual(position, tile, scale, alpha);
	}

	drawMergePiece(piece, progress) {
		const easedProgress = this.easeOutCubic(progress);
		const position = {
			x: piece.from.x + (piece.to.x - piece.from.x) * easedProgress,
			y: piece.from.y + (piece.to.y - piece.from.y) * easedProgress
		};
		const alpha = 1 - this.clamp(progress, 0, 1);
		const scale = 1 - 0.35 * this.clamp(progress, 0, 1);
		this.drawTileVisual(position, { ...piece, isMergeGhost: true }, scale, alpha);
	}

	drawTileVisual(position, tileDescriptor, scale, alpha) {
		if (alpha <= 0 || !tileDescriptor) {
			return;
		}

		const { value, isNew, isMergeResult, isMergeGhost } = tileDescriptor;
		const style = getTileStyle(value);
		const size = this.metrics.tile;
		const radius = Math.floor(size * 0.12);
		const baseAlpha = isMergeGhost ? alpha * 0.55 : alpha;
		const shadowBoost = isMergeResult ? 0.38 : isNew ? 0.45 : 0.32;

		this.ctx.save();
		this.ctx.translate(position.x + size / 2, position.y + size / 2);
		this.ctx.scale(scale, scale);
		this.ctx.translate(-size / 2, -size / 2);
		this.ctx.globalAlpha = baseAlpha;
		this.ctx.shadowBlur = size * shadowBoost;
		this.ctx.shadowColor = style.glow;
		this.ctx.fillStyle = style.fill;
		this.roundedRect(0, 0, size, size, radius);
		this.ctx.fill();

		if (!isMergeGhost) {
			this.ctx.shadowBlur = 0;
			this.ctx.globalAlpha = Math.min(1, alpha * 1.1);
			this.ctx.fillStyle = style.text;
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.ctx.font = `${Math.floor(size * 0.42)}px ${BOARD_THEME.fontFamily}`;
			this.ctx.fillText(String(value), size / 2, size / 2);
		} else {
			this.ctx.shadowBlur = 0;
			this.ctx.globalAlpha = baseAlpha * 0.7;
			this.ctx.fillStyle = style.text;
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';
			this.ctx.font = `${Math.floor(size * 0.32)}px ${BOARD_THEME.fontFamily}`;
			this.ctx.fillText(String(value), size / 2, size / 2);
		}

		this.ctx.restore();
	}

	captureAnimationState(grid) {
		const tiles = [];
		const mergeSplashes = [];
		let hasMovement = false;

		grid.eachCell((x, y, cell) => {
			if (!cell) {
				return;
			}

			const target = this.cellPosition(x, y);

			if (cell.mergedFrom) {
				cell.mergedFrom.forEach(sourceTile => {
					const originPos = sourceTile.previousPosition ? this.cellPosition(sourceTile.previousPosition.x, sourceTile.previousPosition.y) : target;
					if (!this.samePosition(originPos, target)) {
						hasMovement = true;
					}
					mergeSplashes.push({
						value: sourceTile.value,
						from: originPos,
						to: target,
						isMergeGhost: true
					});
				});

				tiles.push({
					value: cell.value,
					from: target,
					to: target,
					isNew: false,
					isMergeResult: true
				});
				hasMovement = true;
				return;
			}

			const origin = cell.previousPosition ? this.cellPosition(cell.previousPosition.x, cell.previousPosition.y) : target;
			if (!this.samePosition(origin, target)) {
				hasMovement = true;
			}

			const isNewTile = !cell.previousPosition;
			if (isNewTile) {
				hasMovement = true;
			}

			tiles.push({
				value: cell.value,
				from: origin,
				to: target,
				isNew: isNewTile,
				isMergeResult: false
			});
		});

		return { tiles, mergeSplashes, hasMovement };
	}

	samePosition(first, second) {
		return first.x === second.x && first.y === second.y;
	}

	requestFrame(callback) {
		if (safeWindow && typeof safeWindow.requestAnimationFrame === 'function') {
			return safeWindow.requestAnimationFrame(callback);
		}
		return setTimeout(() => callback(this.now()), 16);
	}

	cancelFrame(id) {
		if (safeWindow && typeof safeWindow.cancelAnimationFrame === 'function') {
			safeWindow.cancelAnimationFrame(id);
		} else {
			clearTimeout(id);
		}
	}

	now() {
		if (safeWindow && safeWindow.performance && typeof safeWindow.performance.now === 'function') {
			return safeWindow.performance.now();
		}
		return Date.now();
	}

	easeOutCubic(t) {
		const clamped = this.clamp(t, 0, 1);
		return 1 - Math.pow(1 - clamped, 3);
	}

	easeOutBack(t) {
		const clamped = this.clamp(t, 0, 1);
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(clamped - 1, 3) + c1 * Math.pow(clamped - 1, 2);
	}

	clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}

	drawOverlay(won) {
		const { boardSize, offsetX, offsetY } = this.metrics;

		this.ctx.save();
		this.ctx.globalAlpha = 0.92;
		this.ctx.fillStyle = OVERLAY_BACKGROUND;
		this.ctx.shadowBlur = boardSize * 0.08;
		this.ctx.shadowColor = OVERLAY_GLOW;
		this.ctx.fillRect(offsetX, offsetY, boardSize, boardSize);
		this.ctx.restore();

		this.ctx.save();
		this.ctx.fillStyle = OVERLAY_TEXT;
		this.ctx.textAlign = 'center';
		this.ctx.textBaseline = 'middle';
		this.ctx.shadowBlur = boardSize * 0.045;
		this.ctx.shadowColor = OVERLAY_GLOW;
		this.ctx.font = `${Math.floor(boardSize * 0.11)}px ${BOARD_THEME.fontFamily}`;
		this.ctx.fillText(won ? 'You win!' : 'Game over!', offsetX + boardSize / 2, offsetY + boardSize / 2);
		this.ctx.restore();
	}

	cellPosition(x, y) {
		const { spacing, tile, offsetX, offsetY } = this.metrics;
		return {
			x: offsetX + spacing + x * (tile + spacing),
			y: offsetY + spacing + y * (tile + spacing)
		};
	}

	roundedRect(x, y, width, height, radius) {
		this.ctx.beginPath();
		this.ctx.moveTo(x + radius, y);
		this.ctx.lineTo(x + width - radius, y);
		this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		this.ctx.lineTo(x + width, y + height - radius);
		this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		this.ctx.lineTo(x + radius, y + height);
		this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		this.ctx.lineTo(x, y + radius);
		this.ctx.quadraticCurveTo(x, y, x + radius, y);
		this.ctx.closePath();
	}

	updateScore(score) {
		this.score = score;
		if (this.scoreCallback) {
			this.scoreCallback(score);
		}
	}

	updateBestScore(score) {
		this.bestScore = score;
	}

	continueGame() {
		// Overlay clears as part of re-render.
	}
}

class PixiActuator {
	constructor(app, stage, scoreCallback) {
		if (!safeWindow || !safeWindow.PIXI) {
			throw new Error('PIXI not available.');
		}

		this.app = app;
		this.stage = stage;
		this.scoreCallback = scoreCallback;
		this.gridGraphics = new safeWindow.PIXI.Graphics();
		this.tileContainer = new safeWindow.PIXI.Container();
		this.textContainer = new safeWindow.PIXI.Container();
		this.stage.addChild(this.gridGraphics);
		this.stage.addChild(this.tileContainer);
		this.stage.addChild(this.textContainer);
		this.drawGrid();
	}

	drawGrid() {
		const tileSize = 100;
		const spacing = 12;
		const gridSize = 4;
		const offset = 30;
		const boardSize = tileSize * gridSize + spacing * (gridSize + 1);
		const startX = offset - spacing / 2;
		const startY = offset - spacing / 2;
		const boardRadius = 18;

		this.gridGraphics.clear();
		this.gridGraphics.beginFill(colorToNumber('#050515'), 0.96);
		this.gridGraphics.drawRoundedRect(startX, startY, boardSize, boardSize, boardRadius);
		this.gridGraphics.endFill();

		this.gridGraphics.lineStyle(3, colorToNumber('#00ffff'), 0.45);
		for (let i = 0; i <= gridSize; i++) {
			const linePos = offset + i * (tileSize + spacing);
			this.gridGraphics.moveTo(offset, linePos);
			this.gridGraphics.lineTo(offset + gridSize * (tileSize + spacing), linePos);
			this.gridGraphics.moveTo(linePos, offset);
			this.gridGraphics.lineTo(linePos, offset + gridSize * (tileSize + spacing));
		}
	}

	actuate(grid, metadata) {
		this.tileContainer.removeChildren();
		this.textContainer.removeChildren();

		grid.cells.forEach(column => {
			column.forEach(tile => {
				if (!tile) {
					return;
				}

				const tileSize = 100;
				const spacing = 12;
				const offset = 30;
				const style = getTileStyle(tile.value);
				const fillColor = colorToNumber(style.fill);
				const textColor = colorToNumber(style.text);
				const glowColor = colorToNumber('#00ffff');
				const graphic = new safeWindow.PIXI.Graphics();
				const drawX = offset + tile.x * (tileSize + spacing) + spacing / 2;
				const drawY = offset + tile.y * (tileSize + spacing) + spacing / 2;

				graphic.beginFill(fillColor, 0.95);
				graphic.lineStyle(2, glowColor, 0.35);
				graphic.drawRoundedRect(drawX, drawY, tileSize, tileSize, 16);
				graphic.endFill();
				this.tileContainer.addChild(graphic);

				const fontFamily = BOARD_THEME.fontFamily.replace(/"/g, '');
				const label = new safeWindow.PIXI.Text(String(tile.value), {
					fontSize: 34,
					fill: textColor,
					fontFamily,
					fontWeight: '700',
					dropShadow: true,
					dropShadowColor: glowColor,
					dropShadowBlur: 12,
					dropShadowDistance: 0
				});
				label.anchor.set(0.5);
				label.x = drawX + tileSize / 2;
				label.y = drawY + tileSize / 2;
				this.textContainer.addChild(label);
			});
		});

		this.updateScore(metadata.score);
		this.updateBestScore(metadata.bestScore);
	}

	updateScore(score) {
		if (this.scoreCallback) {
			this.scoreCallback(score);
		}
	}

	updateBestScore() {
		// Playtok handles persistent best score display separately if needed.
	}

	continueGame() {
		// No-op for PIXI visuals.
	}
}


class GameManager {
	constructor(size, inputManager, actuator, storageManager, hooks = {}) {
		this.size = size;
		this.inputManager = inputManager;
		this.storageManager = storageManager;
		this.actuator = actuator;
		this.startTiles = 2;
		this.hooks = hooks || {};
		this.terminationNotified = false;

		this.inputManager.on('move', this.move.bind(this));
		this.inputManager.on('restart', this.restart.bind(this));
		this.inputManager.on('keepPlaying', this.keepPlaying.bind(this));

		this.setup();
	}

	restart() {
		this.terminationNotified = false;
		this.storageManager.clearGameState();
		if (this.actuator && typeof this.actuator.continueGame === 'function') {
			this.actuator.continueGame();
		}
		this.setup();
	}

	keepPlaying() {
		this.keepPlayingFlag = true;
		this.terminationNotified = false;
		if (this.actuator && typeof this.actuator.continueGame === 'function') {
			this.actuator.continueGame();
		}
	}

	isGameTerminated() {
		return this.over || (this.won && !this.keepPlayingFlag);
	}

	setup() {
		this.terminationNotified = false;
		const previousState = this.storageManager.getGameState();
		if (previousState) {
			this.grid = new Grid(previousState.grid.size);
			this.grid.cells = this.grid.fromState(previousState.grid.cells);
			this.score = previousState.score;
			this.over = previousState.over;
			this.won = previousState.won;
			this.keepPlayingFlag = previousState.keepPlaying;
		} else {
			this.grid = new Grid(this.size);
			this.score = 0;
			this.over = false;
			this.won = false;
			this.keepPlayingFlag = false;
			this.addStartTiles();
		}

		this.actuate();
	}

	addStartTiles() {
		for (let i = 0; i < this.startTiles; i++) {
			this.addRandomTile();
		}
	}

	addRandomTile() {
		if (this.grid.cellsAvailable()) {
			const value = Math.random() < 0.9 ? 2 : 4;
			const tile = new Tile(this.grid.randomAvailableCell(), value);
			this.grid.insertTile(tile);
		}
	}

	actuate() {
		if (this.storageManager.getBestScore() < this.score) {
			this.storageManager.setBestScore(this.score);
		}

		if (this.over) {
			this.storageManager.clearGameState();
		} else {
			this.storageManager.setGameState(this.serialize());
		}

		this.actuator.actuate(this.grid, {
			score: this.score,
			over: this.over,
			won: this.won,
			bestScore: this.storageManager.getBestScore(),
			keepPlaying: this.keepPlayingFlag,
			terminated: this.isGameTerminated()
		});

		const terminated = this.isGameTerminated();
		if (terminated && !this.terminationNotified) {
			this.terminationNotified = true;
			if (this.hooks && typeof this.hooks.onGameTerminated === 'function') {
				try {
					this.hooks.onGameTerminated({
						score: this.score,
						won: this.won
					});
				} catch (error) {
					console.warn('onGameTerminated hook failed:', error);
				}
			}
		}
	}

	serialize() {
		return {
			grid: this.grid.serialize(),
			score: this.score,
			over: this.over,
			won: this.won,
			keepPlaying: this.keepPlayingFlag
		};
	}

	prepareTiles() {
		this.grid.eachCell((x, y, tile) => {
			if (tile) {
				tile.mergedFrom = null;
				tile.savePosition();
			}
		});
	}

	moveTile(tile, cell) {
		this.grid.cells[tile.x][tile.y] = null;
		this.grid.cells[cell.x][cell.y] = tile;
		tile.updatePosition(cell);
	}

	move(direction) {
		if (this.isGameTerminated()) {
			return;
		}

		const vector = this.getVector(direction);
		const traversals = this.buildTraversals(vector);
		let moved = false;

		this.prepareTiles();

		traversals.x.forEach(x => {
			traversals.y.forEach(y => {
				const cell = { x, y };
				const tile = this.grid.cellContent(cell);

				if (tile) {
					const positions = this.findFarthestPosition(cell, vector);
					const next = this.grid.cellContent(positions.next);

					if (next && next.value === tile.value && !next.mergedFrom) {
						const merged = new Tile(positions.next, tile.value * 2);
						merged.mergedFrom = [tile, next];

						this.grid.insertTile(merged);
						this.grid.removeTile(tile);

						tile.updatePosition(positions.next);

						this.score += merged.value;

						if (merged.value === 2048) {
							this.won = true;
						}
					} else {
						this.moveTile(tile, positions.farthest);
					}

					if (!this.positionsEqual(cell, tile)) {
						moved = true;
					}
				}
			});
		});

		if (moved) {
			this.addRandomTile();

			if (!this.movesAvailable()) {
				this.over = true;
			}

			this.actuate();
		}
	}

	getVector(direction) {
		const map = {
			0: { x: 0, y: -1 },
			1: { x: 1, y: 0 },
			2: { x: 0, y: 1 },
			3: { x: -1, y: 0 }
		};
		return map[direction];
	}

	buildTraversals(vector) {
		const traversals = { x: [], y: [] };

		for (let pos = 0; pos < this.size; pos++) {
			traversals.x.push(pos);
			traversals.y.push(pos);
		}

		if (vector.x === 1) {
			traversals.x.reverse();
		}
		if (vector.y === 1) {
			traversals.y.reverse();
		}

		return traversals;
	}

	findFarthestPosition(cell, vector) {
		let previous;

		do {
			previous = cell;
			cell = { x: previous.x + vector.x, y: previous.y + vector.y };
		} while (this.grid.withinBounds(cell) && this.grid.cellContent(cell) === null);

		return {
			farthest: previous,
			next: cell
		};
	}

	movesAvailable() {
		return this.grid.cellsAvailable() || this.tileMatchesAvailable();
	}

	tileMatchesAvailable() {
		for (let x = 0; x < this.size; x++) {
			for (let y = 0; y < this.size; y++) {
				const tile = this.grid.cellContent({ x, y });

				if (tile) {
					for (let direction = 0; direction < 4; direction++) {
						const vector = this.getVector(direction);
						const cell = { x: x + vector.x, y: y + vector.y };
						const other = this.grid.cellContent(cell);

						if (other && other.value === tile.value) {
							return true;
						}
					}
				}
			}
		}
		return false;
	}

	positionsEqual(first, second) {
		return first.x === second.x && first.y === second.y;
	}
}

export class Game2048 extends BaseGame {
	constructor(canvas, context, pixiApp, onScoreUpdate) {
		super(canvas, context, pixiApp, onScoreUpdate);
		this.gridSize = 4;
		this.storageManager = new LocalStorageManager();
		this.inputManager = null;
		this.actuator = null;
		this.gameManager = null;
		this.terminationHandled = false;
		this.stopTriggered = false;
		this.setupGame();
	}

	getInstructions() {
		return 'Use arrow keys or swipe to slide tiles. Merge matching numbers to reach 2048!';
	}

	setupGame() {
		this.teardownGame();
		this.terminationHandled = false;

		try {
			this.actuator = this.createActuator();
			this.inputManager = new KeyboardInputManager({
				touchTarget: this.canvas,
				buttonRoot: safeWindow ? safeWindow.document : null
			});
			this.gameManager = new GameManager(
				this.gridSize,
				this.inputManager,
				this.actuator,
				this.storageManager,
				{
					onGameTerminated: ({ score }) => this.handleGameTerminated(score)
				}
			);
		} catch (err) {
			console.error('Failed to initialize 2048:', err);
		}
	}

	createActuator() {
		if (this.app && this.stage && safeWindow && safeWindow.PIXI) {
			return new PixiActuator(this.app, this.stage, score => this.updateScore(score));
		}
		if (this.canvas && this.ctx) {
			return new CanvasActuator(this.canvas, this.ctx, score => this.updateScore(score));
		}
		throw new Error('No rendering surface available for 2048.');
	}

	start() {
		super.start();
		if (!this.gameManager) {
			this.setupGame();
		}
		if (this.gameManager) {
			this.terminationHandled = false;
			this.stopTriggered = false;
			this.gameManager.restart();
			this.updateScore(0);
		}
	}

	update() {
		// Game state advances via input callbacks.
	}

	draw() {
		// Rendering handled by actuator; avoid clearing canvas each frame.
	}

	restart() {
		if (this.gameManager) {
			this.terminationHandled = false;
			this.stopTriggered = false;
			this.gameManager.restart();
			this.updateScore(0);
		}
	}

	destroy() {
		this.teardownGame();
		super.destroy();
	}

	teardownGame() {
		if (this.inputManager && typeof this.inputManager.unbind === 'function') {
			this.inputManager.unbind();
		}
		if (this.actuator && typeof this.actuator.dispose === 'function') {
			this.actuator.dispose();
		}
		this.inputManager = null;
		this.gameManager = null;
		this.actuator = null;
	}

	handleGameTerminated(finalScore) {
		if (this.terminationHandled) {
			return;
		}
		this.terminationHandled = true;
		const scoreToReport = typeof finalScore === 'number' ? finalScore : (this.gameManager ? this.gameManager.score : this.score);
		if (typeof scoreToReport === 'number') {
			this.updateScore(scoreToReport);
		}
		if (this.inputManager && typeof this.inputManager.unbind === 'function') {
			this.inputManager.unbind();
		}
		this.stop();
	}

	stop() {
		if (this.stopTriggered) {
			return;
		}
		this.stopTriggered = true;
		super.stop();
	}
}


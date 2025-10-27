import { BaseGame } from './BaseGame.js';

const LEVEL_BLUEPRINTS = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 5, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 3, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 2, 5, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 2, 2, 0, 0],
    [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0]
];

const OBSTACLE_TYPES = {
    1: { height: 0.55, offset: 0, color: '#f4ad3d', widthMultiplier: 0.7 },
    2: { height: 1.0, offset: 0, color: '#f06543', widthMultiplier: 1.0 },
    3: { height: 1.4, offset: 0, color: '#4b9fd5', widthMultiplier: 1.05 },
    4: { height: 1.8, offset: 0, color: '#7a5dc7', widthMultiplier: 1.1 },
    5: { height: 0.6, offset: -0.65, color: '#ffd166', widthMultiplier: 0.6 }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class BoxJumpGame extends BaseGame {
    constructor(canvas, context, pixiApp, onScoreUpdate) {
        super(canvas, context, pixiApp, onScoreUpdate);

        this.levelIndex = 0;
        this.completedLevels = 0;
        this.deaths = 0;
        this.gameStarted = false;
        this.lastTimestamp = performance.now();
        this.respawnTimer = 0;
        this.player = null;
        this.obstacles = [];
        this.particles = [];
        this.flashTimer = 0;
        this.lastScoreReported = 0;
    this.levelFinishX = this.finishLineX;

        this.configureLayout();
        this.createPlayer();
        this.loadLevel(this.levelIndex);

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
    }

    getInstructions() {
        return 'Tap or press space to jump the crate. Clear each course without crashing!';
    }

    configureLayout() {
        this.updateLogicalDimensions();
        const safeWidth = this.canvasWidth || 360;
        const safeHeight = this.canvasHeight || 640;

        this.groundY = safeHeight * 0.68;
        this.startX = safeWidth * 0.12;
        this.finishLineX = safeWidth - safeWidth * 0.12;
        this.trackWidth = this.finishLineX - this.startX;
        this.columns = LEVEL_BLUEPRINTS[0]?.length || 20;
    this.spacing = this.trackWidth / Math.max(1, (this.columns - 1));

    this.blockWidth = clamp(this.spacing * 0.75, 18, 42);
    this.spacing = Math.max(this.blockWidth * 0.9, this.spacing);
        this.playerSize = clamp(this.blockWidth * 0.9, 20, 46);

    this.runSpeed = clamp(this.trackWidth * 0.62, 110, 200);
        this.gravity = clamp(safeHeight * 2.2, 900, 1800);
        this.jumpVelocity = -Math.max(320, safeHeight * 0.55);
    }

    createPlayer() {
        this.player = {
            x: this.startX,
            y: this.groundY - this.playerSize * 0.5,
            width: this.playerSize,
            height: this.playerSize,
            vx: 0,
            vy: 0,
            angle: 0,
            spinVelocity: 0,
            onGround: true,
            alive: true,
            visible: true
        };
    }

    resetPlayer() {
        this.player.x = this.startX;
        this.player.y = this.groundY - this.player.height * 0.5;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.angle = 0;
        this.player.spinVelocity = 0;
        this.player.onGround = true;
        this.player.alive = true;
        this.player.visible = true;
        this.gameStarted = false;
        this.respawnTimer = 0;
    }

    loadLevel(index) {
        const blueprint = LEVEL_BLUEPRINTS[index % LEVEL_BLUEPRINTS.length] || [];
        this.obstacles = [];
        let lastRightEdge = this.startX;
        blueprint.forEach((code, colIndex) => {
            if (!code) {
                return;
            }
            const type = OBSTACLE_TYPES[code];
            if (!type) {
                return;
            }
            const width = this.blockWidth * (type.widthMultiplier || 1);
            const x = this.startX + colIndex * this.spacing - width / 2;
            const targetHeight = width * type.height;
            const baseY = this.groundY + type.offset * width;
            lastRightEdge = Math.max(lastRightEdge, x + width);
            this.obstacles.push({
                type: code,
                x,
                width,
                baseY,
                targetHeight,
                height: targetHeight * 0.2,
                color: type.color,
                progress: 0.2
            });
        });
        const buffer = this.playerSize * 1.2;
        lastRightEdge = Math.min(lastRightEdge, this.finishLineX - buffer * 0.5);
        const minFinish = this.startX + this.playerSize * 2;
    this.levelFinishX = Math.min(this.finishLineX, Math.max(minFinish, lastRightEdge + buffer));
        this.levelTime = 0;
    }

    start() {
        this.levelIndex = 0;
        this.configureLayout();
        this.createPlayer();
        this.loadLevel(this.levelIndex);
        this.particles = [];
        this.flashTimer = 0;
        this.lastScoreReported = 0;
        this.completedLevels = 0;
        this.deaths = 0;
        this.resetPlayer();
        this.updateScore(0);
        this.lastTimestamp = performance.now();

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('blur', this.handleBlur);

        super.start();
    }

    stop() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleBlur);
        super.stop();
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('blur', this.handleBlur);
        super.destroy();
    }

    handleBlur() {
        this.gameStarted = false;
        if (this.player) {
            this.player.vx = 0;
        }
    }

    handleKeyDown(event) {
        if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
            event.preventDefault();
            this.attemptJump();
        }
    }

    handleKeyUp(event) {
        if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
            event.preventDefault();
        }
    }

    checkTap() {
        this.attemptJump();
    }

    attemptJump() {
        if (!this.player || !this.player.alive) {
            return;
        }
        if (this.respawnTimer > 0) {
            return;
        }
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.player.vx = this.runSpeed;
            return;
        }
        if (this.player.onGround) {
            this.player.vy = this.jumpVelocity;
            this.player.onGround = false;
            this.player.spinVelocity = 540;
        }
    }

    update() {
        if (!this.isRunning || !this.player) {
            return;
        }

        const now = performance.now();
        const deltaMs = now - this.lastTimestamp;
        this.lastTimestamp = now;
        const dt = clamp(deltaMs / 1000, 1 / 120, 0.05);

        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.resetPlayer();
            }
        }

        if (this.flashTimer > 0) {
            this.flashTimer = Math.max(0, this.flashTimer - dt);
        }

        this.levelTime += dt;
        this.updatePlayer(dt);
        this.updateObstacles(dt);
        this.updateParticles(dt);
        this.checkCollisions();
        this.updateScoreboard();
    }

    updatePlayer(dt) {
        const player = this.player;
        if (!player.alive) {
            return;
        }

        player.vy += this.gravity * dt;
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        const groundLine = this.groundY - player.height / 2;
        if (player.y >= groundLine) {
            player.y = groundLine;
            player.vy = 0;
            player.onGround = true;
            player.spinVelocity *= 0.5;
            if (Math.abs(player.angle) < 2) {
                player.angle = 0;
            }
        } else {
            player.onGround = false;
        }

        if (this.gameStarted) {
            player.vx = this.runSpeed;
        }

        player.angle += player.spinVelocity * dt;
        player.spinVelocity *= player.onGround ? 0.65 : 0.98;

        const finishX = this.levelFinishX;
        if (player.x >= finishX) {
            this.advanceLevel();
        }

        const maxX = Math.min(this.levelFinishX + player.width * 0.5, this.canvasWidth - player.width * 0.5);
        player.x = Math.min(player.x, maxX);
    }

    updateObstacles(dt) {
        const growthSpeed = 5.5;
        this.obstacles.forEach(obstacle => {
            obstacle.progress = clamp(obstacle.progress + dt * growthSpeed, 0, 1);
            const eased = Math.pow(obstacle.progress, 0.85);
            obstacle.height = obstacle.targetHeight * eased;
        });
    }

    updateParticles(dt) {
        const gravity = this.gravity * 0.7;
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += gravity * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
            return p.life > 0;
        });
    }

    checkCollisions() {
        if (!this.player.alive || this.respawnTimer > 0) {
            return;
        }

        const player = this.player;
        const halfW = player.width / 2;
        const halfH = player.height / 2;
        const playerBounds = {
            left: player.x - halfW,
            right: player.x + halfW,
            top: player.y - halfH,
            bottom: player.y + halfH
        };

        for (const obstacle of this.obstacles) {
            const obstacleRect = {
                left: obstacle.x,
                right: obstacle.x + obstacle.width,
                top: obstacle.baseY - obstacle.height,
                bottom: obstacle.baseY
            };
            if (this.intersects(playerBounds, obstacleRect)) {
                this.handleDeath();
                return;
            }
        }
    }

    intersects(a, b) {
        return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }

    handleDeath() {
        if (!this.player.alive) {
            return;
        }
        this.deaths += 1;
        this.player.alive = false;
        this.player.visible = false;
        this.player.vx = 0;
        this.player.vy = 0;
        this.gameStarted = false;
        this.flashTimer = 0.35;
        this.respawnTimer = 0.6;
        this.spawnDeathBurst();
    }

    spawnDeathBurst() {
        const player = this.player;
        const centerX = player.x;
        const centerY = player.y;
        const pieces = 12;
        for (let i = 0; i < pieces; i++) {
            const angle = (Math.PI * 2 * i) / pieces;
            const speed = 160 + Math.random() * 120;
            const life = 0.6 + Math.random() * 0.4;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 80,
                life,
                maxLife: life,
                radius: this.player.width * 0.18,
                color: '#ffe082',
                alpha: 1
            });
        }
    }

    advanceLevel() {
        this.completedLevels += 1;
        if (this.levelIndex < LEVEL_BLUEPRINTS.length - 1) {
            this.levelIndex += 1;
            this.loadLevel(this.levelIndex);
            this.resetPlayer();
        } else {
            this.finishRun();
        }
    }

    finishRun() {
        this.gameStarted = false;
        this.player.vx = 0;
        this.player.spinVelocity = 0;
        this.player.angle = 0;
        super.updateScore(this.lastScoreReported);
        this.stop();
    }

    updateScoreboard() {
        const baseScore = this.completedLevels * 150;
        const penalty = this.deaths * 12;
        const progress = clamp((this.player.x - this.startX) / this.trackWidth, 0, 1);
        const progressScore = Math.round(progress * 80);
        const total = Math.max(0, baseScore + progressScore - penalty);
        if (total !== this.lastScoreReported) {
            this.lastScoreReported = total;
            super.updateScore(total);
        }
    }

    draw() {
        if (!this.ctx) {
            return;
        }
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.drawBackground(ctx);
        this.drawGround(ctx);
        this.drawObstacles(ctx);
        this.drawParticles(ctx);
        this.drawPlayer(ctx);
        this.drawHud(ctx);

        if (this.flashTimer > 0) {
            const alpha = clamp(this.flashTimer / 0.35, 0, 1) * 0.35;
            ctx.fillStyle = `rgba(255, 99, 110, ${alpha})`;
            ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
    }

    drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#6c5ce7');
        gradient.addColorStop(1, '#341f97');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    drawGround(ctx) {
        ctx.save();
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);
        ctx.strokeStyle = '#4f4f7b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.canvasWidth, this.groundY);
        ctx.stroke();
        ctx.restore();
    }

    drawObstacles(ctx) {
        this.obstacles.forEach(obstacle => {
            const height = obstacle.height;
            const top = obstacle.baseY - height;
            const base = obstacle.baseY;
            const width = obstacle.width;

            const gradient = ctx.createLinearGradient(obstacle.x, top, obstacle.x, base);
            gradient.addColorStop(0, this.shadeColor(obstacle.color, 0.2));
            gradient.addColorStop(1, this.shadeColor(obstacle.color, -0.1));
            ctx.fillStyle = gradient;
            ctx.fillRect(obstacle.x, top, width, height);

            ctx.strokeStyle = this.shadeColor(obstacle.color, -0.35);
            ctx.lineWidth = 2;
            ctx.strokeRect(obstacle.x, top, width, height);

            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            ctx.fillRect(obstacle.x + width * 0.65, top + height * 0.1, width * 0.12, height * 0.5);
        });
    }

    drawParticles(ctx) {
        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    drawPlayer(ctx) {
        if (!this.player.visible) {
            return;
        }
        const player = this.player;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate((player.angle * Math.PI) / 180);

        const halfW = player.width / 2;
        const halfH = player.height / 2;
        const gradient = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
        gradient.addColorStop(0, '#ffeaa7');
        gradient.addColorStop(1, '#fab1a0');
        ctx.fillStyle = gradient;
        ctx.fillRect(-halfW, -halfH, player.width, player.height);

        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 3;
        ctx.strokeRect(-halfW, -halfH, player.width, player.height);

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(-halfW + player.width * 0.25, -halfH + player.height * 0.2, player.width * 0.4, player.height * 0.2);

        ctx.restore();
    }

    drawFinish(ctx) {
        const flagX = this.finishLineX;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flagX, this.groundY);
        ctx.lineTo(flagX, this.groundY - this.player.height * 2.5);
        ctx.stroke();

        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.moveTo(flagX, this.groundY - this.player.height * 2.5);
        ctx.lineTo(flagX + this.player.width, this.groundY - this.player.height * 2.3);
        ctx.lineTo(flagX, this.groundY - this.player.height * 2.1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawHud(ctx) {
        const margin = 24;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(margin, margin, 160, 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Level ${this.levelIndex + 1}/${LEVEL_BLUEPRINTS.length}`, margin + 12, margin + 26);
        ctx.fillText(`Deaths ${this.deaths}`, margin + 12, margin + 52);

        ctx.textAlign = 'center';
        ctx.font = '16px "Segoe UI", sans-serif';
        const instruction = this.gameStarted ? 'Keep jumping!' : 'Tap or press space to start';
        ctx.fillText(instruction, this.canvasWidth / 2, this.canvasHeight - 28);
    }

    shadeColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(255 * percent);
        const r = clamp((num >> 16) + amt, 0, 255);
        const g = clamp(((num >> 8) & 0x00ff) + amt, 0, 255);
        const b = clamp((num & 0x0000ff) + amt, 0, 255);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
}

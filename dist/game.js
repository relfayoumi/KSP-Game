"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const colony_1 = require("./colony");
const ui_1 = require("./ui");
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colony = new colony_1.Colony();
        this.ui = new ui_1.UI(this.ctx, this.colony);
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.gameLoop();
    }
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    gameLoop() {
        // Update game state
        this.colony.update();
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Set background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw UI
        this.ui.draw();
        // Loop
        requestAnimationFrame(() => this.gameLoop());
    }
}
exports.Game = Game;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI = void 0;
class UI {
    constructor(ctx, colony) {
        this.ctx = ctx;
        this.colony = colony;
    }
    draw() {
        this.drawResourcePanel();
        this.drawModulePanel();
    }
    drawResourcePanel() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 250, 100);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(10, 10, 250, 100);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Resources', 20, 30);
        let yOffset = 50;
        this.colony.resources.forEach((amount, resource) => {
            this.ctx.fillText(`${resource}: ${Math.floor(amount)}`, 20, yOffset);
            yOffset += 20;
        });
    }
    drawModulePanel() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 120, 250, 150);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(10, 120, 250, 150);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Modules', 20, 140);
        let yOffset = 160;
        this.colony.modules.forEach((count, module) => {
            this.ctx.fillText(`${module}: ${count}`, 20, yOffset);
            yOffset += 20;
        });
    }
}
exports.UI = UI;

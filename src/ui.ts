import { Colony, ResourceType, ModuleType } from './colony';

interface Button {
    rect: { x: number, y: number, width: number, height: number };
    text: string;
    onClick: () => void;
    enabled?: boolean;
}

export class UI {
    private ctx: CanvasRenderingContext2D;
    private colony: Colony;
    public buttons: Button[] = [];
    private onSelectToPlace: (type: ModuleType) => void;

    constructor(ctx: CanvasRenderingContext2D, colony: Colony, onSelectToPlace: (type: ModuleType) => void) {
        this.ctx = ctx;
        this.colony = colony;
        this.onSelectToPlace = onSelectToPlace;
    }

    draw() {
        // reset buttons per frame
        this.buttons = [];
        this.drawResourcePanel();
        this.drawModulePanel();
        this.drawBuildPanel();
    }

    private drawResourcePanel() {
        // resources + kerbals + power net
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 320, 150);
        this.ctx.strokeStyle = '#00ff00';
    this.ctx.strokeRect(10, 10, 320, 150);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Colony Status', 20, 30);

        let y = 52;
        const print = (label: string, value: string | number) => {
            this.ctx.fillText(`${label}: ${value}`, 20, y); y += 20;
        };

    const power = Math.floor(this.colony.resources.get(ResourceType.Power) || 0);
    const snacks = Math.floor(this.colony.resources.get(ResourceType.Snacks) || 0);
    const matsVal = this.colony.resources.get(ResourceType.BuildingMaterials) || 0;
    const sci = Math.floor(this.colony.resources.get(ResourceType.Science) || 0);

        print('Power', power);
        print('Snacks', snacks);
        print('Materials', matsVal.toFixed(1));
        print('Science', sci);
        print('Kerbals', this.colony.kerbals.toFixed(1) + ` / ${this.colony.kerbalCapacity}`);
    // (removed Mat Rate/sec by request)
    }

    private drawModulePanel() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 160, 320, 170);
        this.ctx.strokeStyle = '#00ff00';
    this.ctx.strokeRect(10, 160, 320, 170);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Modules', 20, 180);

        let yOffset = 200;
        Object.values(ModuleType).forEach((module) => {
            const count = this.colony.modules.get(module as ModuleType) || 0;
            this.ctx.fillText(`${module}: ${count}`, 20, yOffset);
            yOffset += 20;
        });
    }

    private drawBuildPanel() {
        const panelX = 10;
        const panelY = 340;
        const panelWidth = 340;
        const panelHeight = 280;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Build', 20, panelY + 20);

        let y = panelY + 46;

        const buildables: ModuleType[] = [
            ModuleType.Habitation,
            ModuleType.Greenhouse,
            ModuleType.ScienceLab,
            ModuleType.SolarArray,
            ModuleType.MiningRig
        ];

        buildables.forEach((type) => {
            const cost = this.colony.getModuleCost(type);
            const enabled = !!cost && this.colony.canAfford(cost);
            const btn: Button = {
                rect: { x: 20, y, width: 300, height: 48 },
                text: `Place ${type}`,
                onClick: () => { this.onSelectToPlace(type); },
                enabled
            };
            this.buttons.push(btn);

            this.drawButton(btn, cost);
            y += 54;
        });
    }

    private drawButton(btn: Button, cost?: Map<ResourceType, number>) {
        const enabled = btn.enabled !== false;
        // Button box
        this.ctx.fillStyle = enabled ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';
        this.ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
        this.ctx.strokeStyle = enabled ? '#00ff00' : '#ff4444';
        this.ctx.strokeRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);

        // Text: two lines (label + cost), clipped to fit
        const maxTextW = btn.rect.width - 16;
    this.ctx.font = '14px Arial';
        this.ctx.fillStyle = enabled ? '#00ff00' : '#ff8888';
        const label = this.clipText(btn.text, maxTextW);
    this.ctx.fillText(label, btn.rect.x + 8, btn.rect.y + 18);

        if (cost) {
            this.ctx.font = '12px Arial';
            const costStr = this.clipText(this.formatCost(cost), maxTextW);
            this.ctx.fillText(costStr, btn.rect.x + 8, btn.rect.y + 36);
        }
    }

    private clipText(text: string, maxWidth: number): string {
        if (this.ctx.measureText(text).width <= maxWidth) return text;
        let ell = '…';
        let low = 0, high = text.length;
        while (low < high) {
            const mid = Math.ceil((low + high) / 2);
            const candidate = text.slice(0, mid) + ell;
            if (this.ctx.measureText(candidate).width <= maxWidth) low = mid; else high = mid - 1;
        }
        return text.slice(0, low) + ell;
    }

    private formatCost(cost: Map<ResourceType, number>): string {
        const parts: string[] = [];
        cost.forEach((amt, res) => parts.push(`${amt} ${res}`));
        return `Cost: ${parts.join(', ')}`;
    }
}
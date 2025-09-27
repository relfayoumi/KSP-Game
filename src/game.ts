import { Colony, ModuleType } from './colony';
import { UI } from './ui';
import { Grid, Tile } from './grid';
import { MenuSystem, GameState } from './menu';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colony: Colony;
    private ui: UI;
    private grid: Grid;
    private menuSystem: MenuSystem;
    private selectedToPlace: ModuleType | null = null;
    private hover: { x: number, y: number } | null = null;
    // Track module placements to infer active mining rigs
    private placements: { x: number, y: number, type: ModuleType }[] = [];
    private isPaused: boolean = false;

    // Player avatar
    private px: number; // grid X
    private py: number; // grid Y
    private keys: Record<string, boolean> = {};

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.colony = new Colony();
    this.ui = new UI(this.ctx, this.colony, (mt) => this.beginPlacement(mt), () => this.openInGameMenu(), () => this.cancelPlacement());
    // Expand map by increasing the number of tiles (not pixel size)
    this.grid = new Grid(60, 36);
        
        // Place command center at center
        const cx = Math.floor(this.grid.width / 2), cy = Math.floor(this.grid.height / 2);
        this.grid.set(cx, cy, 'C');

        // Player starts near command center
        this.px = cx + 1;
        this.py = cy;

        // Resize canvas first to set proper dimensions
        this.resizeCanvas();
        
        // Initialize menu system after canvas is properly sized
        this.menuSystem = new MenuSystem(canvas, (state) => this.onMenuStateChange(state));
        
        // Ensure we start in main menu state
        this.menuSystem.setState(GameState.MainMenu);
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.menuSystem.onResize();
        });
    this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup',   (e) => this.keys[e.key.toLowerCase()] = false);
        this.gameLoop();
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Scale grid cell size to fit larger maps while keeping UI space
        const availableW = this.canvas.width - 390; // leave UI margin
        const availableH = this.canvas.height - 40;
        this.grid.cellW = Math.floor(Math.max(10, Math.min(22, availableW / this.grid.width)));
        this.grid.cellH = Math.floor(Math.max(14, Math.min(28, availableH / this.grid.height)));
        this.grid.originX = 370;
        this.grid.originY = 20;
    }

    private beginPlacement(type: ModuleType) {
        this.selectedToPlace = type;
        this.ui.setPlacingMode(true);
    }

    private cancelPlacement() {
        this.selectedToPlace = null;
        this.ui.setPlacingMode(false);
    }

    private onMenuStateChange(state: GameState) {
        switch (state) {
            case GameState.MainMenu:
                // Only reset game state when returning to main menu (not on initial load)
                if (this.menuSystem && this.menuSystem.getState() !== GameState.MainMenu) {
                    this.resetGame();
                }
                this.isPaused = false;
                break;
            case GameState.Playing:
                this.isPaused = false;
                break;
            case GameState.Paused:
            case GameState.Settings:
                this.isPaused = true;
                break;
        }
    }

    private openInGameMenu() {
        this.menuSystem.setState(GameState.Paused);
    }

    private resetGame() {
        // Reset colony
        this.colony = new Colony();
        this.ui = new UI(this.ctx, this.colony, (mt) => this.beginPlacement(mt), () => this.openInGameMenu(), () => this.cancelPlacement());
        
        // Reset grid
        this.grid = new Grid(60, 36);
        
        // Place command center at center
        const cx = Math.floor(this.grid.width / 2), cy = Math.floor(this.grid.height / 2);
        this.grid.set(cx, cy, 'C');
        
        // Reset player position
        this.px = cx + 1;
        this.py = cy;
        
        // Clear placements and selections
        this.placements = [];
        this.selectedToPlace = null;
        this.hover = null;
    }

    private symbolFor(type: ModuleType): Tile {
        switch (type) {
            case ModuleType.CommandCenter: return 'C';
            case ModuleType.Habitation: return 'H';
            case ModuleType.Greenhouse: return 'G';
            case ModuleType.ScienceLab: return 'L';
            case ModuleType.SolarArray: return 'S';
            case ModuleType.MiningRig: return 'M';
            case ModuleType.CommsRelay: return 'A';
            case ModuleType.OrbitalAssembly: return 'O';
            default: return ' ';
        }
    }

    private handleMouseClick(event: MouseEvent) {
        // Menu system handles its own clicks
        if (this.menuSystem.getState() !== GameState.Playing) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // First pass UI buttons
        this.ui.buttons.forEach(button => {
            if (mouseX >= button.rect.x && mouseX <= button.rect.x + button.rect.width &&
                mouseY >= button.rect.y && mouseY <= button.rect.y + button.rect.height) {
                if (button.enabled !== false) button.onClick();
            }
        });

        // Grid placement if a module is selected
        if (this.selectedToPlace) {
            const hit = this.grid.hitTest(mouseX, mouseY);
            if (hit) {
                const { x, y } = hit;
                const placing = this.selectedToPlace;
                const allowed = this.isValidPlacement(x, y, placing);
                const cost = this.colony.getModuleCost(placing);
                if (allowed && cost && this.colony.spend(cost)) {
                    // Deducted successfully; place
                    this.colony.buildModule(placing, cost);
                    this.grid.set(x, y, this.symbolFor(placing));
                    this.placements.push({ x, y, type: placing });
                    // Keep in placement mode for continuous building
                    // this.selectedToPlace = null;
                }
            }
        }
    }

    private handleMouseMove(event: MouseEvent) {
        // Only handle mouse moves when playing
        if (this.menuSystem.getState() !== GameState.Playing) {
            this.hover = null;
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const hit = this.grid.hitTest(mouseX, mouseY);
        this.hover = hit ? { x: hit.x, y: hit.y } : null;
    }

    private isValidPlacement(x: number, y: number, placing: ModuleType): boolean {
        // must be empty
        if (!this.grid.isEmpty(x, y)) return false;
        // mining requires resource tile
        if (placing === ModuleType.MiningRig && !this.grid.resources[y][x]) return false;
        // adjacency rules: all modules except SolarArray and MiningRig must be adjacent to a connector
        const requiresAdjacency = placing !== ModuleType.SolarArray && placing !== ModuleType.MiningRig;
        if (!requiresAdjacency) return true;
        // Check 4-neighborhood for connector module (base or built modules that act as connectors)
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= this.grid.width || ny >= this.grid.height) continue;
            if (this.grid.isConnector(nx, ny)) return true;
        }
        return false;
    }

    // Simple key repeat cooldown for grid-snapped movement
    private moveCooldown = 0;
    private stepPlayer(dt: number) {
        // Only move player when game is actually playing and not paused
        if (this.menuSystem.getState() !== GameState.Playing || this.isPaused) {
            return;
        }
        
        this.moveCooldown -= dt;
        const wantLeft = this.keys['arrowleft'] || this.keys['a'];
        const wantRight = this.keys['arrowright'] || this.keys['d'];
        const wantUp = this.keys['arrowup'] || this.keys['w'];
        const wantDown = this.keys['arrowdown'] || this.keys['s'];

        if (this.moveCooldown <= 0) {
            let mx = 0, my = 0;
            if (wantLeft) mx = -1; else if (wantRight) mx = 1;
            if (wantUp) my = -1; else if (wantDown) my = 1;

            if (mx !== 0 || my !== 0) {
                const nx = Math.max(0, Math.min(this.grid.width - 1, this.px + mx));
                const ny = Math.max(0, Math.min(this.grid.height - 1, this.py + my));
                this.px = nx; this.py = ny;
                // Slow key repeat for easier placement (moves every 120ms while key held)
                this.moveCooldown = 0.12;
            }
        }
    }

    private drawPlayer() {
        const { px, py } = this.grid.toPixel(this.px, this.py);
        this.ctx.save();
        // Draw a filled circle and an '@' for avatar
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(px + this.grid.cellW * 0.5, py + this.grid.cellH * 0.55, Math.min(this.grid.cellW, this.grid.cellH) * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.font = `${Math.floor(this.grid.cellH * 0.8)}px Consolas, 'Courier New', monospace`;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('@', px + this.grid.cellW * 0.5, py + this.grid.cellH * 0.6);
        this.ctx.restore();
    }

    private drawHelp() {
        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px Consolas, monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText('Move: WASD / Arrow Keys | Place: Click a Place button, then click a grid tile (R for Mining).', 370, this.canvas.height - 20);
        this.ctx.restore();
    }

    private lastTime = performance.now();
    private gameLoop() {
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;

        // Only update game state if playing and not paused
        if (this.menuSystem.getState() === GameState.Playing && !this.isPaused) {
            // Count mining rigs on resource tiles so Colony can compute proper materials gen
            let activeRigs = 0;
            for (let y = 0; y < this.grid.height; y++) {
                for (let x = 0; x < this.grid.width; x++) {
                    if (this.grid.get(x, y) === 'M' && this.grid.resources[y][x]) activeRigs++;
                }
            }
            this.colony.update();
            this.stepPlayer(dt);
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Always set background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game content only when playing
        if (this.menuSystem.getState() === GameState.Playing) {
            // Draw UI + grid + player
            this.ctx.save();
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
            this.ui.draw();
            this.ctx.restore();
            this.grid.draw(this.ctx);
            // Hover ghost for placement
            if (this.selectedToPlace && this.hover && !this.isPaused) {
                const { x, y } = this.hover;
                const ok = this.isValidPlacement(x, y, this.selectedToPlace);
                const { px, py } = this.grid.toPixel(x, y);
                this.ctx.save();
                this.ctx.fillStyle = ok ? 'rgba(0,255,0,0.25)' : 'rgba(255,0,0,0.25)';
                this.ctx.fillRect(px, py, this.grid.cellW, this.grid.cellH);
                // show glyph of module to be placed
                this.ctx.fillStyle = ok ? '#00ff00' : '#ff5555';
                this.ctx.font = `${Math.max(12, Math.floor(this.grid.cellH * 0.9))}px Consolas, 'Courier New', monospace`;
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(this.symbolFor(this.selectedToPlace), px, py);
                this.ctx.restore();
            }
            this.drawPlayer();
            this.drawHelp();
        }
        
        // Always draw menu system (handles its own visibility)
        this.menuSystem.draw();

        // Loop
        requestAnimationFrame(() => this.gameLoop());
    }
}

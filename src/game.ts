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

    // Oxygen system
    private commandCenterX: number = 0;
    private commandCenterY: number = 0;
    private oxygenTimer: number = 16; // 16 seconds of oxygen
    private maxOxygenTime: number = 16;
    private isAwayFromBase: boolean = false;

    // Camera system for open world
    private cameraX: number = 0; // camera center in world coordinates
    private cameraY: number = 0;

    // Zoom system
    private zoomLevel: number = 1.0; // 1.0 = normal zoom
    private minZoom: number = 0.5;   // Maximum zoom out (smaller tiles)
    private maxZoom: number = 3.0;   // Maximum zoom in (larger tiles)
    private baseTileSize: number = 24; // Base tile size at zoom level 1.0

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.colony = new Colony();
    this.ui = new UI(this.ctx, this.colony, (mt) => this.beginPlacement(mt), () => this.openInGameMenu(), () => this.cancelPlacement());
    // Open world: Much larger map for exploration
    this.grid = new Grid(200, 150);
        
        // Place command center at center
        const cx = Math.floor(this.grid.width / 2), cy = Math.floor(this.grid.height / 2);
        this.grid.set(cx, cy, 'C');
        this.commandCenterX = cx;
        this.commandCenterY = cy;

        // Player starts near command center
        this.px = cx + 1;
        this.py = cy;
        
        // Initialize camera to follow player
        this.cameraX = this.px;
        this.cameraY = this.py;
        
        // Initialize zoom
        this.zoomLevel = 1.0;
        this.updateTileSize();

        // Resize canvas first to set proper dimensions
        this.resizeCanvas();
        
        // Initialize menu system after canvas is properly sized
        this.menuSystem = new MenuSystem(canvas, (state) => this.onMenuStateChange(state), this.colony);
        
        // Ensure we start in main menu state
        this.menuSystem.setState(GameState.MainMenu);
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.menuSystem.onResize();
        });
    this.canvas.addEventListener('click', (e) => this.handleMouseClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        window.addEventListener('keydown', (e) => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup',   (e) => this.keys[e.key.toLowerCase()] = false);
        this.gameLoop();
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.grid.originX = 370; // Leave space for UI
        this.grid.originY = 20;
        // Update tile size based on current zoom level
        this.updateTileSize();
    }

    private updateTileSize() {
        // Calculate tile size based on zoom level
        const tileSize = Math.floor(this.baseTileSize * this.zoomLevel);
        this.grid.cellW = tileSize;
        this.grid.cellH = tileSize;
    }

    private beginPlacement(type: ModuleType) {
        this.selectedToPlace = type;
        this.ui.setPlacingMode(true);
        
        // Debug: Log resource positions when mining rig is selected
        if (type === ModuleType.MiningRig) {
            console.log("Mining Rig selected - Resource map:");
            for (let y = 0; y < Math.min(10, this.grid.height); y++) {
                let row = "";
                for (let x = 0; x < Math.min(20, this.grid.width); x++) {
                    row += this.grid.resources[y][x] ? "R" : ".";
                }
                console.log(`Row ${y}: ${row}`);
            }
        }
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
        this.grid = new Grid(200, 150);
        
        // Place command center at center
        const cx = Math.floor(this.grid.width / 2), cy = Math.floor(this.grid.height / 2);
        this.grid.set(cx, cy, 'C');
        this.commandCenterX = cx;
        this.commandCenterY = cy;
        
        // Reset player position
        this.px = cx + 1;
        this.py = cy;
        
        // Reset camera
        this.cameraX = this.px;
        this.cameraY = this.py;
        
        // Reset zoom
        this.zoomLevel = 1.0;
        this.updateTileSize();
        
        // Reset oxygen system
        this.oxygenTimer = this.maxOxygenTime;
        this.isAwayFromBase = false;
        
        // Clear placements and selections
        this.placements = [];
        this.selectedToPlace = null;
        this.hover = null;
    }

    private symbolFor(type: ModuleType): Tile {
        switch (type) {
            case ModuleType.CommandCenter:     return 'C';
            case ModuleType.Habitation:        return 'H';
            case ModuleType.Greenhouse:        return 'G';
            case ModuleType.ScienceLab:        return 'L';
            case ModuleType.SolarArray:        return 'S';
            case ModuleType.MiningRig:         return 'M';
            case ModuleType.CommsRelay:        return 'A';
            case ModuleType.OrbitalAssembly:   return 'O';

            // Advanced modules
            case ModuleType.AdvancedHabitat:   return 'H'; // same tile as habitat
            case ModuleType.FusionReactor:     return 'S'; // power source like solar
            case ModuleType.QuantumLab:        return 'Q';
            case ModuleType.PlasmaExtractor:   return 'P';
            case ModuleType.ShieldGenerator:   return 'D';
            case ModuleType.TeleportHub:       return 'T';
            case ModuleType.NanoFactory:       return 'N';
            case ModuleType.ArcReactor:        return 'S'; // power source like solar

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
            const hit = this.grid.hitTest(mouseX, mouseY, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height);
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
        const hit = this.grid.hitTest(mouseX, mouseY, this.cameraX, this.cameraY, this.canvas.width, this.canvas.height);
        this.hover = hit ? { x: hit.x, y: hit.y } : null;
    }

    private handleMouseWheel(event: WheelEvent) {
        // Only handle zoom when playing
        if (this.menuSystem.getState() !== GameState.Playing) {
            return;
        }

        event.preventDefault();
        
        // Store old zoom for camera adjustment
        const oldZoom = this.zoomLevel;
        
        // Determine zoom direction
        const delta = -Math.sign(event.deltaY); // Negative because wheel down should zoom out
        const zoomFactor = 0.1;
        
        // Update zoom level with limits
        const newZoom = this.zoomLevel + (delta * zoomFactor);
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // Only update if zoom actually changed
        if (this.zoomLevel !== oldZoom) {
            // Update grid tile size based on zoom
            this.updateTileSize();
            
            // Keep camera centered on player during zoom
            this.cameraX = this.px;
            this.cameraY = this.py;
        }
    }

    private isValidPlacement(x: number, y: number, placing: ModuleType): boolean {
        // must be empty (using wrapped coordinates)
        const tile = this.grid.getWrapped(x, y);
        if (!(tile === '.' || tile === '⛰')) return false;
        
        // must be within player's placement range (with world wrapping)
        const maxRange = 3; // tiles
        const dx1 = Math.abs(x - this.px);
        const dx2 = this.grid.width - dx1;
        const dy1 = Math.abs(y - this.py);
        const dy2 = this.grid.height - dy1;
        const dx = Math.min(dx1, dx2);
        const dy = Math.min(dy1, dy2);
        const distance = Math.max(dx, dy); // use Chebyshev distance (allows diagonal placement)
        if (distance > maxRange) return false;
        
        // must be able to afford the module
        const cost = this.colony.getModuleCost(placing);
        if (!cost || !this.colony.canAfford(cost)) return false;
        
        // mining requires resource tile (with wrapping)
        if (placing === ModuleType.MiningRig && !this.grid.getResourceWrapped(x, y)) return false;
        // adjacency rules: all modules except SolarArray and MiningRig must be adjacent to a connector
        const requiresAdjacency = placing !== ModuleType.SolarArray && placing !== ModuleType.MiningRig;
        if (!requiresAdjacency) return true;
        // Check 4-neighborhood for connector module (with world wrapping)
        const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            const wrappedTile = this.grid.getWrapped(nx, ny);
            if (wrappedTile === 'C' || wrappedTile === 'H' || wrappedTile === 'G' || wrappedTile === 'L' || wrappedTile === 'A' || wrappedTile === 'O') {
                return true;
            }
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
                // World wrapping movement
                const newPos = this.wrapCoordinates(this.px + mx, this.py + my);
                this.px = newPos.x;
                this.py = newPos.y;
                // Slow key repeat for easier placement (moves every 120ms while key held)
                this.moveCooldown = 0.12;
            }
        }

        // Update oxygen system
        this.updateOxygenSystem(dt);
        
        // Update camera to follow player
        this.updateCamera();
    }

    private updateCamera() {
        // Camera follows player smoothly
        this.cameraX = this.px;
        this.cameraY = this.py;
    }

    // World wrapping utilities
    private wrapX(x: number): number {
        return ((x % this.grid.width) + this.grid.width) % this.grid.width;
    }

    private wrapY(y: number): number {
        return ((y % this.grid.height) + this.grid.height) % this.grid.height;
    }

    private wrapCoordinates(x: number, y: number): { x: number, y: number } {
        return { x: this.wrapX(x), y: this.wrapY(y) };
    }

    private getViewportInfo() {
        const availableW = this.canvas.width - this.grid.originX - 20;
        const availableH = this.canvas.height - this.grid.originY - 20;
        const viewportTilesW = Math.floor(availableW / this.grid.cellW);
        const viewportTilesH = Math.floor(availableH / this.grid.cellH);
        const startX = Math.floor(this.cameraX - viewportTilesW / 2);
        const startY = Math.floor(this.cameraY - viewportTilesH / 2);
        
        return { startX, startY, viewportTilesW, viewportTilesH };
    }

    private updateOxygenSystem(dt: number) {
        // Calculate distance from command center using Chebyshev distance with world wrapping
        const dx1 = Math.abs(this.px - this.commandCenterX);
        const dx2 = this.grid.width - dx1; // wrapped distance
        const dy1 = Math.abs(this.py - this.commandCenterY);
        const dy2 = this.grid.height - dy1; // wrapped distance
        
        const dx = Math.min(dx1, dx2);
        const dy = Math.min(dy1, dy2);
        const distance = Math.max(dx, dy);
        
        const wasAwayFromBase = this.isAwayFromBase;
        this.isAwayFromBase = distance > 16;
        
        if (this.isAwayFromBase) {
            // Player is away from base, consume oxygen
            this.oxygenTimer -= dt;
            if (this.oxygenTimer <= 0) {
                // Out of oxygen! Move player back towards base or handle death
                this.oxygenTimer = 0;
                // For now, just reset oxygen when it runs out (could add death/respawn later)
                this.oxygenTimer = this.maxOxygenTime;
            }
        } else {
            // Player is close to base, restore oxygen
            this.oxygenTimer = this.maxOxygenTime;
        }
    }

    private drawPlayer() {
        // Calculate player position relative to camera viewport with wrapping
        const { startX, startY, viewportTilesW, viewportTilesH } = this.getViewportInfo();
        
        // Find player position within the viewport (accounting for wrapping)
        let screenX = -1, screenY = -1;
        
        for (let sy = 0; sy <= viewportTilesH; sy++) {
            for (let sx = 0; sx <= viewportTilesW; sx++) {
                const worldX = ((startX + sx) % this.grid.width + this.grid.width) % this.grid.width;
                const worldY = ((startY + sy) % this.grid.height + this.grid.height) % this.grid.height;
                
                if (worldX === this.px && worldY === this.py) {
                    screenX = this.grid.originX + sx * this.grid.cellW;
                    screenY = this.grid.originY + sy * this.grid.cellH;
                    break;
                }
            }
            if (screenX !== -1) break;
        }
        
        if (screenX === -1 || screenY === -1) return; // Player not in viewport
        
        this.ctx.save();
        // Draw a filled circle and an '@' for avatar
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(screenX + this.grid.cellW * 0.5, screenY + this.grid.cellH * 0.55, Math.min(this.grid.cellW, this.grid.cellH) * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#000000';
        this.ctx.font = `${Math.floor(this.grid.cellH * 0.8)}px Consolas, 'Courier New', monospace`;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('@', screenX + this.grid.cellW * 0.5, screenY + this.grid.cellH * 0.6);
        this.ctx.restore();
    }

    private drawHelp() {
        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px Consolas, monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText('Move: WASD / Arrow Keys | Place: Click a Place button, then click a grid tile (R for Mining).', 370, this.canvas.height - 20);
        
        // Draw zoom indicator
        const zoomText = `Zoom: ${(this.zoomLevel * 100).toFixed(0)}% (Mouse Wheel)`;
        this.ctx.fillText(zoomText, 370, this.canvas.height - 40);
        
        this.ctx.restore();
    }

    private drawOxygenBar() {
        // Only show oxygen bar when away from base
        if (!this.isAwayFromBase) return;

        this.ctx.save();
        
        // Position in bottom left corner, but account for UI buttons
        const barX = 20;
        const barY = this.canvas.height - 140; // Move higher to avoid button overlap
        const barWidth = 200;
        const barHeight = 20;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(barX - 10, barY - 30, barWidth + 20, 50);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(barX - 10, barY - 30, barWidth + 20, 50);
        
        // Label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText('Oxygen', barX, barY - 10);
        
        // Oxygen bar background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Oxygen bar fill
        const oxygenPercent = Math.max(0, this.oxygenTimer / this.maxOxygenTime);
        const fillWidth = barWidth * oxygenPercent;
        
        // Color based on oxygen level
        if (oxygenPercent > 0.5) {
            this.ctx.fillStyle = '#00ff00'; // Green
        } else if (oxygenPercent > 0.25) {
            this.ctx.fillStyle = '#ffff00'; // Yellow
        } else {
            this.ctx.fillStyle = '#ff0000'; // Red
        }
        
        this.ctx.fillRect(barX, barY, fillWidth, barHeight);
        
        // Time remaining text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${Math.ceil(this.oxygenTimer)}s`, barX + barWidth / 2, barY + barHeight / 2);
        
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
            // Draw grid first (background)
            this.grid.draw(this.ctx, this.cameraX, this.cameraY);
            // Hover ghost for placement
            if (this.selectedToPlace && this.hover && !this.isPaused) {
                const { x, y } = this.hover;
                const ok = this.isValidPlacement(x, y, this.selectedToPlace);
                
                // Calculate hover position relative to camera viewport with wrapping
                const { startX, startY, viewportTilesW, viewportTilesH } = this.getViewportInfo();
                
                // Find hover position within the viewport (accounting for wrapping)
                let screenX = -1, screenY = -1;
                
                for (let sy = 0; sy <= viewportTilesH; sy++) {
                    for (let sx = 0; sx <= viewportTilesW; sx++) {
                        const worldX = ((startX + sx) % this.grid.width + this.grid.width) % this.grid.width;
                        const worldY = ((startY + sy) % this.grid.height + this.grid.height) % this.grid.height;
                        
                        if (worldX === x && worldY === y) {
                            screenX = this.grid.originX + sx * this.grid.cellW;
                            screenY = this.grid.originY + sy * this.grid.cellH;
                            break;
                        }
                    }
                    if (screenX !== -1) break;
                }
                
                if (screenX !== -1 && screenY !== -1) {
                    this.ctx.save();
                    this.ctx.fillStyle = ok ? 'rgba(0,255,0,0.25)' : 'rgba(255,0,0,0.25)';
                    this.ctx.fillRect(screenX, screenY, this.grid.cellW, this.grid.cellH);
                    // show glyph of module to be placed
                    this.ctx.fillStyle = ok ? '#00ff00' : '#ff5555';
                    this.ctx.font = `${Math.max(12, Math.floor(this.grid.cellH * 0.9))}px Consolas, 'Courier New', monospace`;
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(this.symbolFor(this.selectedToPlace), screenX, screenY);
                    this.ctx.restore();
                }
            }
            this.drawPlayer();
            this.drawHelp();
            this.drawOxygenBar();
            
            // Draw UI last so overlays appear on top
            this.ctx.save();
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'alphabetic';
            this.ui.draw();
            this.ctx.restore();
        }
        
        // Always draw menu system (handles its own visibility)
        this.menuSystem.draw();

        // Loop
        requestAnimationFrame(() => this.gameLoop());
    }
}

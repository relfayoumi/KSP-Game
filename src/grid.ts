export type Tile =
  | '.'
  | 'C'
  | 'H'
  | 'G'
  | 'L'
  | 'A'
  | 'O'
  | 'M'
  | '⛰'   // Resource deposit
  | 'S'   // Solar
  | 'Q'   // Quantum lab
  | 'P'   // Plasma extractor
  | 'D'   // Shield generator
  | 'T'   // Teleport hub
  | 'N'   // Nano factory
  | '◎'   // Arc Reactor
  | '✪'   // Command Center
  | '⌂'   // Habitation
  | '♣'   // Greenhouse
  | 'Δ'   // Science Lab
  | '☼'   // Solar Array
  | '⛏'   // Mining Rig
  | '⌬'   // Comms Relay
  | '⚙'   // Orbital Assembly
  | '⚡'   // Fusion Reactor
  | '∞'   // Quantum Lab
  | '◉'   // Plasma Extractor
  | '⛨'   // Shield Generator
  | '✦'   // Teleport Hub
  | '⋄'   // Nano Factory
  | ' ';


export class Grid {
    width: number;
    height: number;
    tiles: Tile[][];          // visual map
    resources: boolean[][];   // true if resource deposit

    // Rendering params (computed by Game)
    cellW = 18;
    cellH = 24;
    originX = 360;
    originY = 20;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => '.')) as Tile[][];
        this.resources = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
        this.generate();
    }

    generate(seed: number = Date.now()) {
        // Simple pseudo-random resource distribution
        let rnd = seed >>> 0;
        const rand = () => (rnd = (1103515245 * rnd + 12345) >>> 0) / 0xffffffff;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const r = rand();
                // 2% chance of a resource deposit (reduced from 8% for open world)
                const hasRes = r < 0.02;
                this.resources[y][x] = hasRes;
                this.tiles[y][x] = hasRes ? '⛰' : '.';
            }
        }
    }

    // Return grid coordinates from a mouse position; undefined if outside
    hitTest(px: number, py: number, cameraX?: number, cameraY?: number, canvasWidth?: number, canvasHeight?: number): { x: number, y: number } | undefined {
        const localX = Math.floor((px - this.originX) / this.cellW);
        const localY = Math.floor((py - this.originY) / this.cellH);
        
        if (cameraX !== undefined && cameraY !== undefined && canvasWidth !== undefined && canvasHeight !== undefined) {
            // Calculate viewport dimensions using actual canvas size (same as draw method)
            const availableW = canvasWidth - this.originX - 20;
            const availableH = canvasHeight - this.originY - 20;
            const viewportTilesW = Math.floor(availableW / this.cellW);
            const viewportTilesH = Math.floor(availableH / this.cellH);
            
            // Convert local screen coordinates to world coordinates with wrapping
            const startX = Math.floor(cameraX - viewportTilesW / 2);
            const startY = Math.floor(cameraY - viewportTilesH / 2);
            
            // Check if click is within viewport
            if (localX >= 0 && localY >= 0 && localX <= viewportTilesW && localY <= viewportTilesH) {
                const worldX = ((startX + localX) % this.width + this.width) % this.width;
                const worldY = ((startY + localY) % this.height + this.height) % this.height;
                return { x: worldX, y: worldY };
            }
        } else {
            // Legacy behavior for non-camera mode
            if (localX >= 0 && localY >= 0 && localX < this.width && localY < this.height) {
                return { x: localX, y: localY };
            }
        }
        return undefined;
    }

    get(x: number, y: number): Tile { return this.tiles[y][x]; }

    set(x: number, y: number, t: Tile) { this.tiles[y][x] = t; }

    // World wrapping get methods
    getWrapped(x: number, y: number): Tile {
        const wrappedX = ((x % this.width) + this.width) % this.width;
        const wrappedY = ((y % this.height) + this.height) % this.height;
        return this.tiles[wrappedY][wrappedX];
    }

    getResourceWrapped(x: number, y: number): boolean {
        const wrappedX = ((x % this.width) + this.width) % this.width;
        const wrappedY = ((y % this.height) + this.height) % this.height;
        return this.resources[wrappedY][wrappedX];
    }

    isEmpty(x: number, y: number): boolean {
        const t = this.get(x, y);
        return t === '.' || t === '⛰';
    }

    // Convert grid coordinates to pixel position
    toPixel(x: number, y: number): { px: number, py: number } {
        return { px: this.originX + x * this.cellW, py: this.originY + y * this.cellH };
    }

    draw(ctx: CanvasRenderingContext2D, cameraX?: number, cameraY?: number, playerX?: number, playerY?: number, viewRange?: number) {
        ctx.save();
        // Scale font size with tile size, but keep it readable
        const fontPx = Math.max(8, Math.min(32, Math.floor(this.cellH * 0.8)));
        ctx.font = `${fontPx}px Consolas, 'Courier New', monospace`;
        ctx.textBaseline = 'top';

        // Calculate viewport dimensions
        const availableW = ctx.canvas.width - this.originX - 20;
        const availableH = ctx.canvas.height - this.originY - 20;
        const viewportTilesW = Math.floor(availableW / this.cellW);
        const viewportTilesH = Math.floor(availableH / this.cellH);

        // Fixed frame around visible area - independent of camera/tiles for stability
        // Frame around visible map area — use black so GUI region appears dark
        ctx.strokeStyle = '#000000';
        const frameX = this.originX - 8;
        const frameY = this.originY - 8;
        const frameW = viewportTilesW * this.cellW;
        const frameH = viewportTilesH * this.cellH;
        ctx.strokeRect(frameX, frameY, frameW + 16, frameH + 16);

        if (cameraX !== undefined && cameraY !== undefined) {
            // Set clipping region to prevent tiles from drawing outside frame
            ctx.save();
            ctx.beginPath();
            ctx.rect(frameX + 8, frameY + 8, frameW, frameH);
            ctx.clip();
            
            // World wrapping viewport with decimal precision for smooth zoom
            const startX = Math.floor(cameraX - viewportTilesW / 2);
            const startY = Math.floor(cameraY - viewportTilesH / 2);
            
            // Calculate sub-tile camera offset for smooth positioning
            const subTileOffsetX = (cameraX - Math.floor(cameraX)) * this.cellW;
            const subTileOffsetY = (cameraY - Math.floor(cameraY)) * this.cellH;
            
            for (let screenY = 0; screenY <= viewportTilesH; screenY++) {
                for (let screenX = 0; screenX <= viewportTilesW; screenX++) {
                    // World coordinates with wrapping
                    const worldX = ((startX + screenX) % this.width + this.width) % this.width;
                    const worldY = ((startY + screenY) % this.height + this.height) % this.height;
                    
                    // Visibility check: Hide tiles outside player's view
                    if (playerX !== undefined && playerY !== undefined && viewRange !== undefined) {
                        // Calculate wrapped distance using Chebyshev (consistent with other game rules)
                        // Use Euclidean distance for circular view
                        const dx1 = Math.abs(worldX - playerX);
                        const dx = Math.min(dx1, this.width - dx1);
                        const dy1 = Math.abs(worldY - playerY);
                        const dy = Math.min(dy1, this.height - dy1);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        // Fading: fully visible up to fadeStart, then fade to 0 at viewRange
                        const fadeWidth = Math.max(1, Math.floor(viewRange * 0.35));
                        const fadeStart = Math.max(0, viewRange - fadeWidth);
                        if (dist > viewRange) {
                            // glyph fully invisible; we'll still draw backdrop
                            (ctx as any)._tileAlpha = 0;
                        } else {
                            // Save alpha on tile via ctx.globalAlpha, applied later
                            (ctx as any)._tileAlpha = 1;
                                if (dist > fadeStart) {
                                    const t = (dist - fadeStart) / (viewRange - fadeStart);
                                    // Quadratic ease-out fade for smoother edge
                                    const eased = 1 - Math.pow(Math.min(1, Math.max(0, t)), 2);
                                    (ctx as any)._tileAlpha = eased;
                                }
                        }
                    }
                    

                    const t = this.tiles[worldY][worldX];
                    
                    // Screen position with sub-tile offset for smooth camera movement
                    const px = this.originX + screenX * this.cellW - subTileOffsetX;
                    const py = this.originY + screenY * this.cellH - subTileOffsetY;
                    
                    let color = '#00ff00';
                    switch (t) {
                        case '.': color = '#2a2a2a'; break;        // ground
                        case '⛰': color = '#1b3b1b'; break;        // resource deposit backdrop
                        case 'C': color = '#00ff00'; break;        // command center
                        case 'H': color = '#66ff66'; break;        // habitation
                        case 'G': color = '#99ff99'; break;        // greenhouse
                        case 'L': color = '#66ccff'; break;        // science lab
                        case 'S': color = '#ffff66'; break;        // solar
                        case 'M': color = '#ffcc66'; break;        // mining rig
                        case 'A': color = '#ff66cc'; break;        // comms relay
                        case 'O': color = '#cc66ff'; break;        // orbital assembly
                        // Advanced modules with distinctive colors
                        case 'Q': color = '#9933ff'; break;        // quantum lab - purple
                        case 'P': color = '#ff3399'; break;        // plasma extractor - magenta
                        case 'D': color = '#33ffff'; break;        // shield generator - cyan
                        case 'T': color = '#ff9933'; break;        // teleport hub - orange
                        case 'N': color = '#99ff33'; break;        // nano factory - lime green
                        default: color = '#00ff00';
                    }
                    // Determine glyph alpha: tiles ('.') remain fully visible; specials fade
                    let glyphAlpha = 1;
                    if (t !== '.') {
                        glyphAlpha = (ctx as any)._tileAlpha !== undefined ? (ctx as any)._tileAlpha : 1;
                    }

                    // Backdrop (always visible) - but if the tile is a special and it's faded out, draw ground backdrop
                    const groundBackdrop = 'rgba(255,255,255,0.03)';
                    const specialBackdrop = 'rgba(0,0,0,0.4)';
                    const useGroundBackdrop = t !== '.' && glyphAlpha < 1;
                    ctx.fillStyle = useGroundBackdrop ? groundBackdrop : (color === '#2a2a2a' ? groundBackdrop : specialBackdrop);
                    ctx.fillRect(px, py, this.cellW, this.cellH);

                    // glyphAlpha already set above

                    if (glyphAlpha > 0) {
                        ctx.save();
                        ctx.globalAlpha = glyphAlpha;
                        // glyph color
                        ctx.fillStyle = color;
                        ctx.fillText(t, px, py);
                        ctx.restore();
                    }
                    else {
                        // If a special is fully faded, draw '.' so it doesn't appear as a blank tile
                        if (t !== '.') {
                            ctx.save();
                            ctx.globalAlpha = 1;
                            ctx.fillStyle = '#2a2a2a';
                            ctx.fillText('.', px, py);
                            ctx.restore();
                        }
                    }
                    // Clear tile alpha so it doesn't affect other drawings
                    if ((ctx as any)._tileAlpha !== undefined) delete (ctx as any)._tileAlpha;
                }
            }
            
            // Restore clipping
            ctx.restore();
        } else {
            // Legacy non-camera mode
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const t = this.tiles[y][x];
                    const px = this.originX + x * this.cellW;
                    const py = this.originY + y * this.cellH;
                    
                    let color = '#00ff00';
                    switch (t) {
                        case '.': color = '#2a2a2a'; break;
                        case '⛰': color = '#1b3b1b'; break;
                        case 'C': color = '#00ff00'; break;
                        case 'H': color = '#66ff66'; break;
                        case 'G': color = '#99ff99'; break;
                        case 'L': color = '#66ccff'; break;
                        case 'S': color = '#ffff66'; break;
                        case 'M': color = '#ffcc66'; break;
                        case 'A': color = '#ff66cc'; break;
                        case 'O': color = '#cc66ff'; break;
                        default: color = '#00ff00';
                    }
                    ctx.fillStyle = color === '#2a2a2a' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.4)';
                    ctx.fillRect(px, py, this.cellW, this.cellH);
                    ctx.fillStyle = color;
                    ctx.fillText(t, px, py);
                }
            }
        }
        ctx.restore();
    }

    // Returns true if the tile acts as a connector for branching (base network)
    // Command Center and built habitat/greenhouse/lab/comms/assembly connect; Solar and Mining do not.
    isConnector(x: number, y: number): boolean {
        const t = this.get(x, y);
        return t === 'C' || t === 'H' || t === 'G' || t === 'L' || t === 'A' || t === 'O';
    }
}

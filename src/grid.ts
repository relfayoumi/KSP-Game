export type Tile = '.' | 'R' | ' ' | 'C' | 'H' | 'G' | 'L' | 'S' | 'M' | 'A' | 'O';

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
                // 8% chance of a resource deposit
                const hasRes = r < 0.08;
                this.resources[y][x] = hasRes;
                this.tiles[y][x] = hasRes ? 'R' : '.';
            }
        }
    }

    // Return grid coordinates from a mouse position; undefined if outside
    hitTest(px: number, py: number): { x: number, y: number } | undefined {
        const gx = Math.floor((px - this.originX) / this.cellW);
        const gy = Math.floor((py - this.originY) / this.cellH);
        if (gx >= 0 && gy >= 0 && gx < this.width && gy < this.height) {
            return { x: gx, y: gy };
        }
        return undefined;
    }

    get(x: number, y: number): Tile { return this.tiles[y][x]; }

    set(x: number, y: number, t: Tile) { this.tiles[y][x] = t; }

    isEmpty(x: number, y: number): boolean {
        const t = this.get(x, y);
        return t === '.' || t === 'R';
    }

    // Convert grid coordinates to pixel position
    toPixel(x: number, y: number): { px: number, py: number } {
        return { px: this.originX + x * this.cellW, py: this.originY + y * this.cellH };
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        const fontPx = Math.max(14, Math.floor(this.cellH * 0.9));
        ctx.font = `${fontPx}px Consolas, 'Courier New', monospace`;
        ctx.textBaseline = 'top';

        // Frame
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(this.originX - 8, this.originY - 8, this.width * this.cellW + 16, this.height * this.cellH + 16);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const t = this.tiles[y][x];
                const px = this.originX + x * this.cellW;
                const py = this.originY + y * this.cellH;
                let color = '#00ff00';
                switch (t) {
                    case '.': color = '#2a2a2a'; break;        // ground
                    case 'R': color = '#1b3b1b'; break;        // resource deposit backdrop
                    case 'C': color = '#00ff00'; break;        // command center
                    case 'H': color = '#66ff66'; break;        // habitation
                    case 'G': color = '#99ff99'; break;        // greenhouse
                    case 'L': color = '#66ccff'; break;        // science lab
                    case 'S': color = '#ffff66'; break;        // solar
                    case 'M': color = '#ffcc66'; break;        // mining rig
                    case 'A': color = '#ff66cc'; break;        // comms relay
                    case 'O': color = '#cc66ff'; break;        // orbital assembly
                    default: color = '#00ff00';
                }
                // backdrop
                ctx.fillStyle = color === '#2a2a2a' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.4)';
                ctx.fillRect(px, py, this.cellW, this.cellH);

                // glyph color
                ctx.fillStyle = color;
                ctx.fillText(t, px, py);
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

import { Colony, ResourceType, TECHS, TechId } from './colony';

export enum GameState {
    MainMenu = 'MainMenu',
    Settings = 'Settings',
    Playing = 'Playing',
    Paused = 'Paused'
}

export interface MenuButton {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    onClick: () => void;
    enabled?: boolean;
    color?: string;
}

export class MenuSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private currentState: GameState = GameState.MainMenu;
    private buttons: MenuButton[] = [];
    private onStateChange: (state: GameState) => void;
    private colony: Colony | null = null;
    private shouldUIHandleEscape?: () => boolean;
    
    // Settings
    private settings = {
        soundVolume: 100,
        musicVolume: 80,
        fullscreen: false
    };

    constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void, colony?: Colony, shouldUIHandleEscape?: () => boolean) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.onStateChange = onStateChange;
        this.colony = colony || null;
        this.shouldUIHandleEscape = shouldUIHandleEscape;
        
        // Handle clicks
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Handle ESC key for pause menu
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Check if UI should handle ESC first (for overlays, building placement, etc.)
                if (this.shouldUIHandleEscape && this.shouldUIHandleEscape()) {
                    return; // Let UI handle it
                }
                
                if (this.currentState === GameState.Playing) {
                    this.setState(GameState.Paused);
                } else if (this.currentState === GameState.Paused) {
                    this.setState(GameState.Playing);
                }
            }
        });
        
        // Setup initial buttons - will be called again in draw() if needed
        this.setupButtons();
    }

    setState(state: GameState) {
        this.currentState = state;
        this.setupButtons();
        this.onStateChange(state);
    }

    getState(): GameState {
        return this.currentState;
    }

    setColony(colony: Colony) {
        this.colony = colony;
    }

    private setupButtons() {
        this.buttons = [];
        
        // Ensure canvas has valid dimensions
        if (this.canvas.width === 0 || this.canvas.height === 0) {
            return;
        }
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonSpacing = 70;

        switch (this.currentState) {
            case GameState.MainMenu:
                this.buttons = [
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY - buttonSpacing,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Start Game',
                        onClick: () => this.setState(GameState.Playing),
                        color: '#00ff00'
                    },
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Settings',
                        onClick: () => this.setState(GameState.Settings),
                        color: '#ffaa00'
                    },
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY + buttonSpacing,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Exit',
                        onClick: () => this.exitGame(),
                        color: '#ff4444'
                    }
                ];
                break;

            case GameState.Settings:
                this.buttons = [
                    // Volume controls
                    {
                        x: centerX - 120,
                        y: centerY - 120,
                        width: 30,
                        height: 30,
                        text: '-',
                        onClick: () => this.adjustVolume('sound', -10),
                        color: '#ffaa00'
                    },
                    {
                        x: centerX + 90,
                        y: centerY - 120,
                        width: 30,
                        height: 30,
                        text: '+',
                        onClick: () => this.adjustVolume('sound', 10),
                        color: '#ffaa00'
                    },
                    {
                        x: centerX - 120,
                        y: centerY - 70,
                        width: 30,
                        height: 30,
                        text: '-',
                        onClick: () => this.adjustVolume('music', -10),
                        color: '#ffaa00'
                    },
                    {
                        x: centerX + 90,
                        y: centerY - 70,
                        width: 30,
                        height: 30,
                        text: '+',
                        onClick: () => this.adjustVolume('music', 10),
                        color: '#ffaa00'
                    },
                    // Fullscreen toggle
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY - 20,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: this.settings.fullscreen ? 'Windowed Mode' : 'Fullscreen Mode',
                        onClick: () => this.toggleFullscreen(),
                        color: '#00aaff'
                    },
                    // Back button
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY + 60,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Back to Main Menu',
                        onClick: () => this.setState(GameState.MainMenu),
                        color: '#888888'
                    }
                ];
                break;

            case GameState.Paused:
                this.buttons = [
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY - buttonSpacing,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Resume Game',
                        onClick: () => this.setState(GameState.Playing),
                        color: '#00ff00'
                    },
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Settings',
                        onClick: () => this.setState(GameState.Settings),
                        color: '#ffaa00'
                    },
                    {
                        x: centerX - buttonWidth / 2,
                        y: centerY + buttonSpacing,
                        width: buttonWidth,
                        height: buttonHeight,
                        text: 'Main Menu',
                        onClick: () => this.setState(GameState.MainMenu),
                        color: '#ff4444'
                    }
                ];
                break;


        }
        console.log('Setup', this.buttons.length, 'buttons for state:', this.currentState);
    }

    private handleClick(event: MouseEvent) {
        if (this.currentState === GameState.Playing) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        for (const button of this.buttons) {
            if (mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height) {
                if (button.enabled !== false) {
                    button.onClick();
                }
                break;
            }
        }
    }

    private adjustVolume(type: 'sound' | 'music', delta: number) {
        if (type === 'sound') {
            this.settings.soundVolume = Math.max(0, Math.min(100, this.settings.soundVolume + delta));
        } else {
            this.settings.musicVolume = Math.max(0, Math.min(100, this.settings.musicVolume + delta));
        }
        this.setupButtons(); // Refresh to update display
    }

    private toggleFullscreen() {
        this.settings.fullscreen = !this.settings.fullscreen;
        
        if (this.settings.fullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
        
        this.setupButtons(); // Refresh button text
    }

    private exitGame() {
        // Close the browser tab/window
        window.close();
        // Fallback: redirect to about:blank if window.close() doesn't work
        setTimeout(() => {
            window.location.href = 'about:blank';
        }, 100);
    }

    draw() {
        if (this.currentState === GameState.Playing) return;

        // Always ensure buttons are set up for non-playing states
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            // Force button setup every frame for now to debug
            this.setupButtons();
        }

        // Clear canvas with semi-transparent overlay if paused
        if (this.currentState === GameState.Paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        } else {
            this.ctx.fillStyle = '#0a0a1a';
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw title
        this.drawTitle();

        // Draw settings content if in settings menu
        if (this.currentState === GameState.Settings) {
            this.drawSettingsContent();
        }

        // Draw research tree if in research menu


        // Draw buttons
        this.drawButtons();

        // Draw version info
        this.drawVersionInfo();
    }

    private drawTitle() {
        const centerX = this.canvas.width / 2;
        let titleY = this.canvas.height * 0.25;

        this.ctx.save();
        
        // Main title
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 48px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('KSP Colony Simulator', centerX, titleY);

        // Subtitle based on current state
        titleY += 60;
        this.ctx.font = '20px Arial, sans-serif';
        this.ctx.fillStyle = '#aaaaaa';
        
        switch (this.currentState) {
            case GameState.MainMenu:
                this.ctx.fillText('Build and manage your Kerbal colony', centerX, titleY);
                break;
            case GameState.Settings:
                this.ctx.fillText('Game Settings', centerX, titleY);
                break;
            case GameState.Paused:
                this.ctx.fillText('Game Paused', centerX, titleY);
                break;

        }
        


        this.ctx.restore();
    }

    private drawSettingsContent() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial, sans-serif';
        this.ctx.textAlign = 'center';

        // Sound volume
        this.ctx.fillText(`Sound Volume: ${this.settings.soundVolume}%`, centerX, centerY - 120);
        
        // Music volume
        this.ctx.fillText(`Music Volume: ${this.settings.musicVolume}%`, centerX, centerY - 70);

        // Controls info
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px Arial, sans-serif';
        this.ctx.fillText('Use +/- buttons to adjust volume', centerX, centerY + 120);
        this.ctx.fillText('Press ESC to pause/unpause during gameplay', centerX, centerY + 140);

        this.ctx.restore();
    }

    private drawButtons() {
        this.ctx.save();

        for (const button of this.buttons) {
            const enabled = button.enabled !== false;
            const color = button.color || '#00ff00';

            // Button background
            this.ctx.fillStyle = enabled ? `${color}20` : 'rgba(100, 100, 100, 0.2)';
            this.ctx.fillRect(button.x, button.y, button.width, button.height);

            // Button border
            this.ctx.strokeStyle = enabled ? color : '#666666';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(button.x, button.y, button.width, button.height);

            // Button text
            this.ctx.fillStyle = enabled ? color : '#666666';
            this.ctx.font = '18px Arial, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                button.text,
                button.x + button.width / 2,
                button.y + button.height / 2
            );
        }

        this.ctx.restore();
    }

    private drawVersionInfo() {
        this.ctx.save();
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px Arial, sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText('v1.0.0', this.canvas.width - 10, this.canvas.height - 10);
        this.ctx.restore();
    }

    // Called when canvas is resized
    onResize() {
        this.setupButtons();
    }


}
import { Colony, ResourceType, ModuleType, TECHS, TechId } from './colony';

interface Button {
    rect: { x: number, y: number, width: number, height: number };
    text: string;
    onClick: () => void;
    enabled?: boolean;
}

enum OverlayState {
    None,
    MainOverlay,
    BuildList,
    Research
}

enum BuildCategory {
    Harvesting,
    Habitation,
    Power
}

export class UI {
    private ctx: CanvasRenderingContext2D;
    private colony: Colony;
    public buttons: Button[] = [];
    private onSelectToPlace: (type: ModuleType) => void;
    private onOpenMenu?: () => void;
    private onCancelPlacement?: () => void;
    private overlayState: OverlayState = OverlayState.None;
    private buildCategory: BuildCategory | null = null;
    private placingMode: boolean = false;
    private showQuickButtons: boolean = false;

    constructor(ctx: CanvasRenderingContext2D, colony: Colony, onSelectToPlace: (type: ModuleType) => void, onOpenMenu?: () => void, onCancelPlacement?: () => void) {
        this.ctx = ctx;
        this.colony = colony;
        this.onSelectToPlace = onSelectToPlace;
        this.onOpenMenu = onOpenMenu;
        this.onCancelPlacement = onCancelPlacement;
    }

    draw() {
        // Reset buttons per frame
        this.buttons = [];
        // Establish a known text alignment/baseline so menu/title code from previous frames doesn't leak
        this.ctx.save();
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'alphabetic';

        this.drawResourcePanel();
        this.drawModulePanel();
        
        this.drawMenuButton();
        this.drawCancelButton();
        this.drawBuildOverlay();

        // Restore to avoid leaking our alignment into game / grid rendering
        this.ctx.restore();
    }

    private drawResourcePanel() {
        // resources + kerbals + power net
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(10, 10, 340, 150);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(10, 10, 340, 150);

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
        this.ctx.fillRect(10, 170, 340, 160);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(10, 170, 340, 160);

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







    private drawMenuButton() {
        if (!this.onOpenMenu) return;

        const canvas = this.ctx.canvas;
        const buttonWidth = 120;
        const buttonHeight = 35;
        const margin = 15;
        
        const menuBtn: Button = {
            rect: { 
                x: margin, 
                y: canvas.height - buttonHeight - margin, 
                width: buttonWidth, 
                height: buttonHeight 
            },
            text: 'Menu (ESC)',
            onClick: () => { this.toggleQuickButtons(); },
            enabled: true
        };
        
        this.buttons.push(menuBtn);
        
        // Draw the menu button (isolate alignment changes)
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
        this.ctx.fillRect(menuBtn.rect.x, menuBtn.rect.y, menuBtn.rect.width, menuBtn.rect.height);
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.strokeRect(menuBtn.rect.x, menuBtn.rect.y, menuBtn.rect.width, menuBtn.rect.height);
        
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            menuBtn.text, 
            menuBtn.rect.x + menuBtn.rect.width / 2, 
            menuBtn.rect.y + menuBtn.rect.height / 2
        );
        this.ctx.restore();
        
        // Draw quick buttons if they should be shown
        if (this.showQuickButtons) {
            this.drawQuickButtons(menuBtn);
        }
    }

    private toggleQuickButtons() {
        if (this.showQuickButtons) {
            // Second press - open main menu
            this.showQuickButtons = false;
            if (this.onOpenMenu) {
                this.onOpenMenu();
            }
        } else {
            // First press - show quick buttons
            this.showQuickButtons = true;
        }
    }

    private drawQuickButtons(menuBtn: Button) {
        const buttonWidth = 100;
        const buttonHeight = 35;
        const margin = 10;
        
        // Build button (above menu button)
        const buildBtn: Button = {
            rect: { 
                x: menuBtn.rect.x + (menuBtn.rect.width - buttonWidth) / 2, 
                y: menuBtn.rect.y - buttonHeight - margin, 
                width: buttonWidth, 
                height: buttonHeight 
            },
            text: 'Build',
            onClick: () => { 
                this.showQuickButtons = false;
                this.showBuildOverlay(); 
            },
            enabled: true
        };
        
        // RD button (to the right of menu button)
        const rdBtn: Button = {
            rect: { 
                x: menuBtn.rect.x + menuBtn.rect.width + margin, 
                y: menuBtn.rect.y, 
                width: buttonWidth, 
                height: buttonHeight 
            },
            text: 'R&D',
            onClick: () => { 
                this.showQuickButtons = false;
                this.showResearchOverlay();
            },
            enabled: true
        };
        
        this.buttons.push(buildBtn, rdBtn);
        this.drawSimpleButton(buildBtn, '#00ff00');
        this.drawSimpleButton(rdBtn, '#9933ff');
    }

    private drawCancelButton() {
        // Cancel placement button (top right, only when placing)
        if (this.placingMode) {
            const canvas = this.ctx.canvas;
            const buttonWidth = 100;
            const buttonHeight = 35;
            const margin = 15;
            
            const cancelBtn: Button = {
                rect: { 
                    x: canvas.width - buttonWidth - margin, 
                    y: margin, 
                    width: buttonWidth, 
                    height: buttonHeight 
                },
                text: 'X',
                onClick: () => { this.cancelPlacement(); },
                enabled: true
            };
            this.buttons.push(cancelBtn);
            this.drawSimpleButton(cancelBtn, '#ff4444');
        }
    }

    private drawSimpleButton(btn: Button, color: string) {
        const enabled = btn.enabled !== false;
        
        this.ctx.save();
        this.ctx.fillStyle = enabled ? `${color}30` : 'rgba(100, 100, 100, 0.2)';
        this.ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
        this.ctx.strokeStyle = enabled ? color : '#666666';
        this.ctx.strokeRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
        
        this.ctx.fillStyle = enabled ? color : '#666666';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(
            btn.text, 
            btn.rect.x + btn.rect.width / 2, 
            btn.rect.y + btn.rect.height / 2
        );
        this.ctx.restore();
    }

    private showBuildOverlay() {
        this.overlayState = OverlayState.MainOverlay;
    }

    private showResearchOverlay() {
        this.overlayState = OverlayState.Research;
    }

    private cancelPlacement() {
        this.placingMode = false;
        this.overlayState = this.buildCategory !== null ? OverlayState.BuildList : OverlayState.MainOverlay;
        this.showQuickButtons = true; // Show quick buttons again after canceling
        if (this.onCancelPlacement) {
            this.onCancelPlacement();
        }
    }

    private drawBuildOverlay() {
        if (this.overlayState === OverlayState.None) return;

        const canvas = this.ctx.canvas;
        let overlayWidth = 400;
        let overlayHeight = 300;
        
        // Make overlay larger for building list and research
        if (this.overlayState === OverlayState.BuildList) {
            overlayWidth = 500;
            overlayHeight = 400;
        } else if (this.overlayState === OverlayState.Research) {
            overlayWidth = 700;
            overlayHeight = 500;
        }
        
        const overlayX = (canvas.width - overlayWidth) / 2;
        const overlayY = (canvas.height - overlayHeight) / 2;

        // Draw overlay background
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

        // Close button (X)
        const closeBtn: Button = {
            rect: { 
                x: overlayX + overlayWidth - 40, 
                y: overlayY + 10, 
                width: 30, 
                height: 30 
            },
            text: 'X',
            onClick: () => { 
                this.overlayState = OverlayState.None; 
                this.showQuickButtons = false; // Hide quick buttons when overlay closes
            },
            enabled: true
        };
        this.buttons.push(closeBtn);
        this.drawSimpleButton(closeBtn, '#ff4444');

        if (this.overlayState === OverlayState.MainOverlay) {
            this.drawCategorySelection(overlayX, overlayY, overlayWidth, overlayHeight);
        } else if (this.overlayState === OverlayState.BuildList && this.buildCategory !== null) {
            this.drawBuildingList(overlayX, overlayY, overlayWidth, overlayHeight, this.buildCategory);
        } else if (this.overlayState === OverlayState.Research) {
            this.drawResearchTree(overlayX, overlayY, overlayWidth, overlayHeight);
        }

        this.ctx.restore();
    }

    private drawCategorySelection(overlayX: number, overlayY: number, overlayWidth: number, overlayHeight: number) {
        const canvas = this.ctx.canvas;
        
        // Title
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('Build Menu', canvas.width / 2, overlayY + 20);

        // Category buttons
        const categoryY = overlayY + 80;
        const categoryWidth = 100;
        const categoryHeight = 60;
        const categorySpacing = 120;
        const startX = overlayX + (overlayWidth - 3 * categoryWidth - 2 * (categorySpacing - categoryWidth)) / 2;

        const categories = [
            { name: 'Harvesting', category: BuildCategory.Harvesting, color: '#ffaa00' },
            { name: 'Habitation\n& Life', category: BuildCategory.Habitation, color: '#00aaff' },
            { name: 'Power', category: BuildCategory.Power, color: '#ffff00' }
        ];

        categories.forEach((cat, index) => {
            const btn: Button = {
                rect: { 
                    x: startX + index * categorySpacing, 
                    y: categoryY, 
                    width: categoryWidth, 
                    height: categoryHeight 
                },
                text: cat.name,
                onClick: () => { this.showBuildCategory(cat.category); },
                enabled: true
            };
            this.buttons.push(btn);
            
            // Draw category button
            this.ctx.fillStyle = `${cat.color}30`;
            this.ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
            this.ctx.strokeStyle = cat.color;
            this.ctx.strokeRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
            
            // Draw category text
            this.ctx.fillStyle = cat.color;
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            // Handle multi-line text
            const lines = cat.name.split('\n');
            lines.forEach((line, lineIndex) => {
                this.ctx.fillText(
                    line,
                    btn.rect.x + btn.rect.width / 2,
                    btn.rect.y + btn.rect.height / 2 + (lineIndex - (lines.length - 1) / 2) * 16
                );
            });
        });
        

    }

    private drawBuildingList(overlayX: number, overlayY: number, overlayWidth: number, overlayHeight: number, category: BuildCategory) {
        const canvas = this.ctx.canvas;
        
        // Back button
        const backBtn: Button = {
            rect: { 
                x: overlayX + 10, 
                y: overlayY + 10, 
                width: 60, 
                height: 30 
            },
            text: '← Back',
            onClick: () => { this.overlayState = OverlayState.MainOverlay; },
            enabled: true
        };
        this.buttons.push(backBtn);
        this.drawSimpleButton(backBtn, '#888888');
        
        // Title
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(this.getCategoryName(category), canvas.width / 2, overlayY + 20);

        // Building list
        const buildings = this.getBuildingsForCategory(category);
        const startY = overlayY + 70;
        const buttonHeight = 80;
        const buttonSpacing = 10;
        const buttonWidth = overlayWidth - 40;

        buildings.forEach((moduleType, index) => {
            const cost = this.colony.getModuleCost(moduleType);
            const isUnlocked = this.colony.isUnlocked(moduleType);
            const canAfford = !!cost && this.colony.canAfford(cost);
            const enabled = isUnlocked && canAfford;
            
            const btn: Button = {
                rect: { 
                    x: overlayX + 20, 
                    y: startY + index * (buttonHeight + buttonSpacing), 
                    width: buttonWidth, 
                    height: buttonHeight 
                },
                text: moduleType,
                onClick: () => { this.selectModuleFromCategory(moduleType); },
                enabled: enabled
            };
            this.buttons.push(btn);
            
            // Draw building button
            const bgColor = enabled ? 'rgba(0, 255, 0, 0.2)' : isUnlocked ? 'rgba(255, 0, 0, 0.2)' : 'rgba(100, 100, 100, 0.2)';
            const borderColor = enabled ? '#00ff00' : isUnlocked ? '#ff4444' : '#666666';
            const textColor = enabled ? '#00ff00' : isUnlocked ? '#ff8888' : '#666666';
            
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
            this.ctx.strokeStyle = borderColor;
            this.ctx.strokeRect(btn.rect.x, btn.rect.y, btn.rect.width, btn.rect.height);
            
            // Module name
            this.ctx.fillStyle = textColor;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(moduleType, btn.rect.x + 10, btn.rect.y + 10);
            
            // Cost information
            if (cost) {
                this.ctx.font = '12px Arial';
                let costY = btn.rect.y + 35;
                cost.forEach((amount, resourceType) => {
                    const costText = `${resourceType}: ${amount}`;
                    this.ctx.fillText(costText, btn.rect.x + 10, costY);
                    costY += 15;
                });
            }
            
            // Status text
            if (!isUnlocked) {
                this.ctx.fillStyle = '#ff8888';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('(Requires Research)', btn.rect.x + 10, btn.rect.y + btn.rect.height - 15);
            } else if (!canAfford) {
                this.ctx.fillStyle = '#ff8888';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('(Insufficient Resources)', btn.rect.x + 10, btn.rect.y + btn.rect.height - 15);
            }
        });
    }

    private showBuildCategory(category: BuildCategory) {
        this.buildCategory = category;
        this.overlayState = OverlayState.BuildList;
    }

    private selectModuleFromCategory(moduleType: ModuleType) {
        this.overlayState = OverlayState.None;
        this.placingMode = true;
        this.showQuickButtons = false; // Hide quick buttons during placement
        this.onSelectToPlace(moduleType);
    }

    private getBuildingsForCategory(category: BuildCategory): ModuleType[] {
        switch (category) {
            case BuildCategory.Harvesting:
                return [ModuleType.MiningRig];
            case BuildCategory.Habitation:
                return [ModuleType.Habitation, ModuleType.Greenhouse, ModuleType.ScienceLab];
            case BuildCategory.Power:
                return [ModuleType.SolarArray];
            default:
                return [];
        }
    }

    private getCategoryName(category: BuildCategory): string {
        switch (category) {
            case BuildCategory.Harvesting:
                return 'Harvesting Buildings';
            case BuildCategory.Habitation:
                return 'Habitation & Life Support';
            case BuildCategory.Power:
                return 'Power Generation';
            default:
                return 'Buildings';
        }
    }

    public setPlacingMode(placing: boolean) {
        this.placingMode = placing;
    }

    public isPlacingMode(): boolean {
        return this.placingMode;
    }

    public hideQuickButtons() {
        this.showQuickButtons = false;
    }

    private drawResearchTree(overlayX: number, overlayY: number, overlayWidth: number, overlayHeight: number) {
        // Title
        this.ctx.fillStyle = '#9933ff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('Research & Development', overlayX + overlayWidth / 2, overlayY + 20);

        // Current science display
        const science = Math.floor(this.colony.resources.get(ResourceType.Science) || 0);
        this.ctx.fillStyle = '#66ccff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Available Science: ${science}`, overlayX + overlayWidth / 2, overlayY + 50);

        // Research tree grid
        const startY = overlayY + 90;
        const techWidth = 120;
        const techHeight = 60;
        const techSpacing = 140;
        const tierSpacing = 80;

        // Group techs by tier
        const techsByTier: { [tier: number]: TechId[] } = {};
        Object.entries(TECHS).forEach(([id, spec]) => {
            if (!techsByTier[spec.tier]) {
                techsByTier[spec.tier] = [];
            }
            techsByTier[spec.tier].push(id as TechId);
        });

        // Draw tier by tier
        let currentY = startY;
        for (let tier = 1; tier <= 5; tier++) {
            if (!techsByTier[tier]) continue;

            // Tier label
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Tier ${tier}`, overlayX + 20, currentY + 15);

            const techs = techsByTier[tier];
            const rowStartX = overlayX + 80;
            
            techs.forEach((techId, index) => {
                const spec = TECHS[techId];
                const techX = rowStartX + (index % 4) * techSpacing;
                const techY = currentY + Math.floor(index / 4) * (techHeight + 10);

                // Skip if would go outside overlay
                if (techY + techHeight > overlayY + overlayHeight - 20) return;

                const isResearched = this.colony.isResearched(techId);
                const canResearch = this.colony.canResearchTech(techId);
                const hasPrereqs = !spec.prerequisites || spec.prerequisites.every(p => this.colony.isResearched(p));

                // Tech button
                const btn: Button = {
                    rect: { x: techX, y: techY, width: techWidth, height: techHeight },
                    text: techId,
                    onClick: () => {
                        if (canResearch) {
                            this.colony.unlockTech(techId);
                        }
                    },
                    enabled: canResearch
                };
                this.buttons.push(btn);

                // Color based on status
                let bgColor = '#333333';
                let borderColor = '#666666';
                let textColor = '#888888';

                if (isResearched) {
                    bgColor = '#003300';
                    borderColor = '#00ff00';
                    textColor = '#00ff00';
                } else if (canResearch) {
                    bgColor = '#330033';
                    borderColor = '#9933ff';
                    textColor = '#9933ff';
                } else if (hasPrereqs) {
                    bgColor = '#331100';
                    borderColor = '#ff6600';
                    textColor = '#ff6600';
                }

                // Draw tech box
                this.ctx.fillStyle = bgColor;
                this.ctx.fillRect(techX, techY, techWidth, techHeight);
                this.ctx.strokeStyle = borderColor;
                this.ctx.strokeRect(techX, techY, techWidth, techHeight);

                // Tech name and cost
                this.ctx.fillStyle = textColor;
                this.ctx.font = '10px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'top';
                
                // Wrap text if too long
                const words = techId.split(' ');
                let line = '';
                let y = techY + 5;
                words.forEach(word => {
                    if (line.length + word.length > 15) {
                        this.ctx.fillText(line, techX + techWidth/2, y);
                        line = word + ' ';
                        y += 12;
                    } else {
                        line += word + ' ';
                    }
                });
                if (line.trim()) {
                    this.ctx.fillText(line.trim(), techX + techWidth/2, y);
                }

                // Cost
                this.ctx.font = '9px Arial';
                this.ctx.fillStyle = '#66ccff';
                this.ctx.fillText(`${spec.cost} Science`, techX + techWidth/2, techY + techHeight - 15);

                // Prerequisites indicator
                if (spec.prerequisites && !isResearched) {
                    const missingPrereqs = spec.prerequisites.filter(p => !this.colony.isResearched(p));
                    if (missingPrereqs.length > 0) {
                        this.ctx.fillStyle = '#ff4444';
                        this.ctx.font = '8px Arial';
                        this.ctx.fillText(`Needs: ${missingPrereqs.length} prereq`, techX + techWidth/2, techY + techHeight - 5);
                    }
                }
            });

            currentY += Math.ceil(techs.length / 4) * (techHeight + 10) + tierSpacing;
        }
    }

}
# KSP Colony Simulator - AI Development Guide

## Architecture Overview

This is a TypeScript-based browser game simulating a Kerbal Space Program colony. The architecture follows a component-based pattern with clear separation of concerns:

- **Game** (`game.ts`) - Main game loop and state coordination
- **Colony** (`colony.ts`) - Resource management and module building logic  
- **Grid** (`grid.ts`) - 2D tile-based world representation with resource deposits
- **UI** (`ui.ts`) - Canvas-based interface with button management
- **MenuSystem** (`menu.ts`) - Game state management (MainMenu/Playing/Paused/Settings)

## Key Patterns & Conventions

### State Management
- Game state flows: `MenuSystem` controls `GameState` → `Game` class responds to state changes
- Colony resources stored in `Map<ResourceType, number>` with atomic spend/add operations
- Grid uses enum `Tile` types with single-character symbols ('C', 'H', 'G', etc.)

### Canvas Rendering Pattern
All drawing follows this pattern:
```typescript
ctx.save();
// Set styles, fonts, alignment
// Draw content
ctx.restore(); // Always restore to prevent style bleeding
```

### Module System
- Modules defined by `ModuleType` enum with specs in `MODULE_SPECS` constant
- Cost verification: `colony.canAfford(cost)` → `colony.spend(cost)` → `colony.buildModule()`
- Grid placement rules: adjacency requirements via `Grid.isConnector()` method

## Development Workflows

### Build & Run
```bash
npm run build    # Webpack compilation to dist/
npm start        # Dev server on port 5175 with hot reload
```

### Project Structure
- Entry point: `src/index.ts` → `Game` constructor → canvas setup
- Output: Single `bundle.js` + `index.html` in `dist/`
- TypeScript strict mode enabled, ES2017 target

## Critical Implementation Details

### Resource Updates
`Colony.update()` runs per frame with delta time calculation:
- Power generation/consumption with environmental modifiers (orbital vs ground)
- Mining rigs only produce materials when on resource tiles AND in ground mode
- Kerbal population dynamics based on snacks consumption and habitat capacity

### Grid Mechanics  
- 60x36 tiles with procedural resource deposit generation (8% probability)
- Cell size auto-calculated based on canvas dimensions minus UI space (390px margin)
- Hit testing for mouse → grid coordinate conversion via `Grid.hitTest()`

### UI Button System
Buttons are rebuilt every frame in `UI.draw()`:
- Button collision detection in `Game.handleMouseClick()`
- Text clipping algorithm for cost display in confined button space
- Enabled/disabled state affects both visual styling and click handling

### Menu State Transitions
- ESC key toggles Playing ↔ Paused states
- Canvas click handling disabled outside Playing state
- Game reset occurs on MainMenu re-entry (not initial load)

## Integration Points

### Canvas Management
- Single canvas element (`#gameCanvas`) handles all rendering
- Responsive sizing on window resize updates grid cell dimensions
- Menu system overlays game content with transparency

### Resource Economics
- Starting resources: 100 Power, 100 Snacks, 500 Materials, 0 Science
- Tech unlock system via `TECHS` constant (Science currency)
- Power factor throttling affects all production except mining

## Common Gotchas

- Always use `ctx.save()/restore()` around text alignment changes
- Grid coordinates are (x,y) but arrays are accessed as `[y][x]`
- Module placement validation requires both empty tile AND adjacency checks
- Movement input uses both arrow keys and WASD with cooldown system
- Resource generation scales by module count, not grid placement density
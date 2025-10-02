export enum ResourceType {
    Power = 'Power',
    Snacks = 'Snacks',
    BuildingMaterials = 'Building Materials',
    Science = 'Science'
}

export enum ModuleType {
    CommandCenter = 'Command Center',
    Habitation = 'Habitation',
    Greenhouse = 'Greenhouse',
    ScienceLab = 'Science Lab',
    SolarArray = 'Solar Array',
    MiningRig = 'Mining Rig',
    CommsRelay = 'Comms Relay',
    OrbitalAssembly = 'Orbital Assembly',
    // Advanced modules from R&D
    AdvancedHabitat = 'Advanced Habitat',
    FusionReactor = 'Fusion Reactor',
    QuantumLab = 'Quantum Lab',
    PlasmaExtractor = 'Plasma Extractor',
    ShieldGenerator = 'Shield Generator',
    TeleportHub = 'Teleport Hub',
    NanoFactory = 'Nano Factory',
    ArcReactor = 'Arc Reactor'
}

export enum ColonyMode { Ground = 'Ground', Orbital = 'Orbital' }

export type ResourceMap = Map<ResourceType, number>;

type ModuleSpec = {
    cost: ResourceMap;
    powerGen?: number;          // units/sec (before env modifiers)
    powerUse?: number;          // units/sec
    snacksGen?: number;         // units/sec
    materialsGen?: number;      // units/sec
    scienceGen?: number;        // units/sec
    kerbalCapacity?: number;    // capacity provided
};

const M = (entries: [ResourceType, number][]): ResourceMap => new Map(entries);

const MODULE_SPECS: Record<ModuleType, ModuleSpec> = {
    // Basic modules
    [ModuleType.CommandCenter]: { cost: M([]), powerGen: 10 },
    [ModuleType.Habitation]:    { cost: M([[ResourceType.BuildingMaterials, 100], [ResourceType.Power, 50]]), powerUse: 2, kerbalCapacity: 5 },
    [ModuleType.Greenhouse]:    { cost: M([[ResourceType.BuildingMaterials, 150], [ResourceType.Power, 100]]), powerUse: 4, snacksGen: 2 },
    [ModuleType.ScienceLab]:    { cost: M([[ResourceType.BuildingMaterials, 200], [ResourceType.Power, 150]]), powerUse: 5, scienceGen: 1 },
    [ModuleType.SolarArray]:    { cost: M([[ResourceType.BuildingMaterials, 120]]), powerGen: 15 },
    [ModuleType.MiningRig]:     { cost: M([[ResourceType.BuildingMaterials, 250], [ResourceType.Power, 100]]), powerUse: 6, materialsGen: 2 },
    [ModuleType.CommsRelay]:    { cost: M([[ResourceType.BuildingMaterials, 80], [ResourceType.Power, 30]]), powerUse: 1 },
    [ModuleType.OrbitalAssembly]: { cost: M([[ResourceType.BuildingMaterials, 400], [ResourceType.Power, 250]]), powerUse: 8 },
    
    // Advanced modules from R&D
    [ModuleType.AdvancedHabitat]: { cost: M([[ResourceType.BuildingMaterials, 300], [ResourceType.Power, 150], [ResourceType.Science, 50]]), powerUse: 3, kerbalCapacity: 12 },
    [ModuleType.FusionReactor]:   { cost: M([[ResourceType.BuildingMaterials, 800], [ResourceType.Power, 500], [ResourceType.Science, 200]]), powerGen: 100 },
    [ModuleType.QuantumLab]:      { cost: M([[ResourceType.BuildingMaterials, 600], [ResourceType.Power, 400], [ResourceType.Science, 150]]), powerUse: 12, scienceGen: 5 },
    [ModuleType.PlasmaExtractor]: { cost: M([[ResourceType.BuildingMaterials, 500], [ResourceType.Power, 300], [ResourceType.Science, 100]]), powerUse: 15, materialsGen: 8 },
    [ModuleType.ShieldGenerator]: { cost: M([[ResourceType.BuildingMaterials, 1000], [ResourceType.Power, 600], [ResourceType.Science, 300]]), powerUse: 20 },
    [ModuleType.TeleportHub]:     { cost: M([[ResourceType.BuildingMaterials, 1200], [ResourceType.Power, 800], [ResourceType.Science, 400]]), powerUse: 25 },
    [ModuleType.NanoFactory]:     { cost: M([[ResourceType.BuildingMaterials, 1500], [ResourceType.Power, 1000], [ResourceType.Science, 500]]), powerUse: 30, materialsGen: 20 },
    [ModuleType.ArcReactor]:      { cost: M([[ResourceType.BuildingMaterials, 2000], [ResourceType.Power, 1500], [ResourceType.Science, 800]]), powerGen: 500 }
};

export type TechId = 
    // Tier 1: Basic Technologies (100-500 science)
    | 'Basic ISRU' | 'Solar Technology' | 'Communications' | 'Life Support'
    // Tier 2: Intermediate Technologies (600-1500 science)
    | 'Advanced ISRU' | 'Orbital Construction' | 'Enhanced Habitation' | 'Advanced Laboratories'
    // Tier 3: Advanced Technologies (1600-4000 science)
    | 'Fusion Technology' | 'Quantum Computing' | 'Plasma Science' | 'Energy Shields'
    // Tier 4: Cutting-Edge Technologies (4500-7000 science)
    | 'Teleportation' | 'Nanotechnology' | 'Antimatter Research' | 'Spatial Engineering'
    // Tier 5: Ultimate Technologies (7500-10000 science)
    | 'Arc Technology' | 'Dimensional Physics' | 'Ultimate Power' | 'Transcendence';

type TechSpec = { 
    cost: number; 
    unlocks: ModuleType[]; 
    prerequisites?: TechId[];
    tier: number;
    description: string;
};

export const TECHS: Record<TechId, TechSpec> = {
    // Tier 1: Basic Technologies (100-500 science)
    'Basic ISRU':        { cost: 100,  unlocks: [ModuleType.MiningRig], tier: 1, description: 'Unlock basic resource extraction capabilities' },
    'Solar Technology':  { cost: 150,  unlocks: [ModuleType.SolarArray], tier: 1, description: 'Harness solar energy for power generation' },
    'Communications':    { cost: 200,  unlocks: [ModuleType.CommsRelay], tier: 1, description: 'Establish communication networks' },
    'Life Support':      { cost: 300,  unlocks: [], tier: 1, description: 'Improve habitat efficiency and safety' },
    
    // Tier 2: Intermediate Technologies (600-1500 science)
    'Advanced ISRU':     { cost: 800,  unlocks: [ModuleType.PlasmaExtractor], prerequisites: ['Basic ISRU'], tier: 2, description: 'Advanced resource extraction using plasma technology' },
    'Orbital Construction': { cost: 1000, unlocks: [ModuleType.OrbitalAssembly], prerequisites: ['Solar Technology'], tier: 2, description: 'Build structures in orbital environments' },
    'Enhanced Habitation': { cost: 1200, unlocks: [ModuleType.AdvancedHabitat], prerequisites: ['Life Support'], tier: 2, description: 'Luxurious living spaces with enhanced capacity' },
    'Advanced Laboratories': { cost: 1500, unlocks: [ModuleType.QuantumLab], prerequisites: ['Communications'], tier: 2, description: 'Quantum-enhanced research capabilities' },
    
    // Tier 3: Advanced Technologies (1600-4000 science)
    'Fusion Technology': { cost: 2200, unlocks: [ModuleType.FusionReactor], prerequisites: ['Advanced ISRU', 'Orbital Construction'], tier: 3, description: 'Clean fusion power generation' },
    'Quantum Computing': { cost: 2800, unlocks: [], prerequisites: ['Advanced Laboratories'], tier: 3, description: 'Quantum computational advances' },
    'Plasma Science':    { cost: 3200, unlocks: [], prerequisites: ['Advanced ISRU'], tier: 3, description: 'Master plasma state manipulation' },
    'Energy Shields':    { cost: 4000, unlocks: [ModuleType.ShieldGenerator], prerequisites: ['Fusion Technology', 'Quantum Computing'], tier: 3, description: 'Protective energy field technology' },
    
    // Tier 4: Cutting-Edge Technologies (4500-7000 science)
    'Teleportation':     { cost: 5000, unlocks: [ModuleType.TeleportHub], prerequisites: ['Quantum Computing', 'Plasma Science'], tier: 4, description: 'Instantaneous matter transportation' },
    'Nanotechnology':    { cost: 5500, unlocks: [ModuleType.NanoFactory], prerequisites: ['Energy Shields'], tier: 4, description: 'Molecular-scale manufacturing' },
    'Antimatter Research': { cost: 6200, unlocks: [], prerequisites: ['Energy Shields'], tier: 4, description: 'Harness antimatter for ultimate power' },
    'Spatial Engineering': { cost: 7000, unlocks: [], prerequisites: ['Teleportation'], tier: 4, description: 'Manipulate spacetime itself' },
    
    // Tier 5: Ultimate Technologies (7500-10000 science)
    'Arc Technology':    { cost: 8000, unlocks: [ModuleType.ArcReactor], prerequisites: ['Nanotechnology', 'Antimatter Research'], tier: 5, description: 'Ultimate power generation technology' },
    'Dimensional Physics': { cost: 9000, unlocks: [], prerequisites: ['Spatial Engineering'], tier: 5, description: 'Master interdimensional physics' },
    'Ultimate Power':    { cost: 9500, unlocks: [], prerequisites: ['Arc Technology'], tier: 5, description: 'Achieve unlimited energy potential' },
    'Transcendence':     { cost: 10000, unlocks: [], prerequisites: ['Dimensional Physics', 'Ultimate Power'], tier: 5, description: 'Transcend physical limitations' }
};

export class Colony {
    resources: ResourceMap = new Map();
    modules: Map<ModuleType, number> = new Map();
    private lastUpdateTime: number = Date.now();

    // Kerbal stats
    kerbals: number = 3;         // starting crew
    kerbalCapacity: number = 5;  // from habitats

    // Environment & unlocks
    mode: ColonyMode = ColonyMode.Ground;
    unlockedTechs: Set<TechId> = new Set<TechId>();
    unlocked: Set<ModuleType> = new Set<ModuleType>([
        ModuleType.Habitation,
        ModuleType.Greenhouse,
        ModuleType.ScienceLab
        // Other modules require research to unlock
    ]);

    constructor() {
        // Base resources
        this.resources.set(ResourceType.Power, 100);
        this.resources.set(ResourceType.Snacks, 100);
        this.resources.set(ResourceType.BuildingMaterials, 500);
        this.resources.set(ResourceType.Science, 0);

        // Starting modules
        this.modules.set(ModuleType.CommandCenter, 1);
        this.modules.set(ModuleType.Habitation, 0);
        this.modules.set(ModuleType.Greenhouse, 0);
        this.modules.set(ModuleType.ScienceLab, 0);
        this.modules.set(ModuleType.SolarArray, 0);
        this.modules.set(ModuleType.MiningRig, 0);
        this.modules.set(ModuleType.CommsRelay, 0);
        this.modules.set(ModuleType.OrbitalAssembly, 0);
        // Advanced modules
        this.modules.set(ModuleType.AdvancedHabitat, 0);
        this.modules.set(ModuleType.FusionReactor, 0);
        this.modules.set(ModuleType.QuantumLab, 0);
        this.modules.set(ModuleType.PlasmaExtractor, 0);
        this.modules.set(ModuleType.ShieldGenerator, 0);
        this.modules.set(ModuleType.TeleportHub, 0);
        this.modules.set(ModuleType.NanoFactory, 0);
        this.modules.set(ModuleType.ArcReactor, 0);

        this.recomputeKerbalCapacity();
    }

    setMode(mode: ColonyMode) { this.mode = mode; }

    isUnlocked(type: ModuleType): boolean { return this.unlocked.has(type) || type === ModuleType.CommandCenter; }

    unlockTech(id: TechId): boolean {
        const spec = TECHS[id];
        if (!spec) return false;
        
        // Check if already researched
        if (this.unlockedTechs.has(id)) return false;
        
        // Check prerequisites
        if (spec.prerequisites) {
            for (const prereq of spec.prerequisites) {
                if (!this.unlockedTechs.has(prereq)) {
                    return false; // Missing prerequisite
                }
            }
        }
        
        // Check science cost
        const sci = this.resources.get(ResourceType.Science) || 0;
        if (sci < spec.cost) return false;
        
        // Spend science and unlock
        this.resources.set(ResourceType.Science, sci - spec.cost);
        this.unlockedTechs.add(id);
        spec.unlocks.forEach(u => this.unlocked.add(u));
        return true;
    }
    
    canResearchTech(id: TechId): boolean {
        const spec = TECHS[id];
        if (!spec || this.unlockedTechs.has(id)) return false;
        
        // Check prerequisites
        if (spec.prerequisites) {
            for (const prereq of spec.prerequisites) {
                if (!this.unlockedTechs.has(prereq)) {
                    return false;
                }
            }
        }
        
        // Check science cost
        const sci = this.resources.get(ResourceType.Science) || 0;
        return sci >= spec.cost;
    }
    
    isResearched(id: TechId): boolean {
        return this.unlockedTechs.has(id);
    }
    
    getAvailableResearch(): TechId[] {
        return Object.keys(TECHS).filter(id => 
            !this.isResearched(id as TechId) && 
            this.hasPrerequisites(id as TechId)
        ) as TechId[];
    }
    
    private hasPrerequisites(id: TechId): boolean {
        const spec = TECHS[id];
        if (!spec.prerequisites) return true;
        return spec.prerequisites.every(prereq => this.unlockedTechs.has(prereq));
    }

    private count(type: ModuleType): number { return this.modules.get(type) || 0; }

    private recomputeKerbalCapacity() {
        const base = 5; // command center baseline capacity
        const fromHab = this.count(ModuleType.Habitation) * (MODULE_SPECS[ModuleType.Habitation].kerbalCapacity || 0);
        this.kerbalCapacity = base + fromHab;
        if (this.kerbals > this.kerbalCapacity) this.kerbals = this.kerbalCapacity;
    }

    getModuleCost(type: ModuleType): ResourceMap | undefined { return MODULE_SPECS[type]?.cost; }

    canAfford(cost: ResourceMap): boolean {
        let ok = true;
        cost.forEach((amt, res) => { if ((this.resources.get(res) || 0) < amt) ok = false; });
        return ok;
    }

    // Atomically verify and deduct a cost; returns true on success
    spend(cost: ResourceMap): boolean {
        if (!this.canAfford(cost)) return false;
        cost.forEach((amt, res) => {
            const cur = this.resources.get(res) || 0;
            this.resources.set(res, cur - amt);
        });
        return true;
    }

    addResource(type: ResourceType, amount: number) { this.resources.set(type, (this.resources.get(type) || 0) + amount); }

    removeResource(type: ResourceType, amount: number): boolean {
        const cur = this.resources.get(type) || 0;
        if (cur >= amount) { this.resources.set(type, cur - amount); return true; }
        return false;
    }

    buildModule(type: ModuleType, _cost: ResourceMap) {
        if (!this.isUnlocked(type)) return;
        // Spending is handled by Game.spend before calling this
        this.modules.set(type, this.count(type) + 1);
        this.recomputeKerbalCapacity();
    }

    private solarFactor(): number {
        // Orbital gets a buff, ground baseline 1.0 (placeholder for tilt/season/clouds)
        return this.mode === ColonyMode.Orbital ? 1.4 : 1.0;
    }

    private miningEnabled(): boolean { return this.mode === ColonyMode.Ground; }

    update() {
        const now = Date.now();
        const delta = Math.min(0.25, (now - this.lastUpdateTime) / 1000);
        this.lastUpdateTime = now;

        // Aggregate base rates
        let powerGen = 0, powerUse = 0, snacksGen = 0, matsGen = 0, sciGen = 0;
        Object.values(ModuleType).forEach((type) => {
            const spec = MODULE_SPECS[type as ModuleType];
            if (!spec) return;
            const n = this.count(type as ModuleType);
            if (n <= 0) return;

            // Power generation/usage
            let pg = (spec.powerGen || 0);
            if ((type as ModuleType) === ModuleType.SolarArray) pg *= this.solarFactor();
            powerGen += pg * n;
            // Power use for all modules based on total count
            powerUse += (spec.powerUse || 0) * n;

            // Resource generation
            if ((type as ModuleType) === ModuleType.MiningRig) {
                let mg = (spec.materialsGen || 0);
                if (!this.miningEnabled()) mg = 0; // disabled in orbital
                // Use total number of Mining Rigs built, not just active ones
                matsGen += mg * n;
            } else {
                snacksGen += (spec.snacksGen || 0) * n;
                matsGen += (spec.materialsGen || 0) * n;
                sciGen += (spec.scienceGen || 0) * n;
            }
        });

        // Kerbal consumption
        const snacksUse = this.kerbals * 0.05; // snacks per sec per kerbal

        // Power factor
        const totalUse = powerUse;
        const totalGen = powerGen;
        let powerFactor = 1;
        if (totalUse > 0 && totalGen < totalUse) powerFactor = Math.max(0, totalGen / totalUse);

        // Apply
    this.addResource(ResourceType.Power, (powerGen - powerUse) * delta);
    this.addResource(ResourceType.Snacks, (snacksGen - snacksUse) * powerFactor * delta);
    // Do not throttle mining output by power factor to ensure visible materials gain
    this.addResource(ResourceType.BuildingMaterials, matsGen * delta);
    this.addResource(ResourceType.Science, sciGen * powerFactor * delta);

        // Starvation
        const snacks = this.resources.get(ResourceType.Snacks) || 0;
        if (snacks < 0) { this.resources.set(ResourceType.Snacks, 0); this.kerbals = Math.max(0, this.kerbals - 0.01 * delta); }

        // Simple growth
        const hasRoom = this.kerbals < this.kerbalCapacity - 0.05;
        if (hasRoom && snacks > 50) this.kerbals = Math.min(this.kerbalCapacity, this.kerbals + 0.005 * delta);
    }

    // Serialization
    toJSON() {
        return {
            resources: Array.from(this.resources.entries()),
            modules: Array.from(this.modules.entries()),
            kerbals: this.kerbals,
            mode: this.mode,
            unlocked: Array.from(this.unlocked.values())
        };
    }

    static fromJSON(data: any): Colony {
        const c = new Colony();
        if (data?.resources) c.resources = new Map(data.resources);
        if (data?.modules) c.modules = new Map(data.modules);
        if (typeof data?.kerbals === 'number') c.kerbals = data.kerbals;
        if (data?.mode && (data.mode === ColonyMode.Ground || data.mode === ColonyMode.Orbital)) c.mode = data.mode;
        if (Array.isArray(data?.unlocked)) c.unlocked = new Set(data.unlocked);
        c.recomputeKerbalCapacity();
        return c;
    }
}
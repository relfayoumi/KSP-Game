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
    OrbitalAssembly = 'Orbital Assembly'
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
    [ModuleType.CommandCenter]: { cost: M([]), powerGen: 10 },
    [ModuleType.Habitation]:    { cost: M([[ResourceType.BuildingMaterials, 100], [ResourceType.Power, 50]]), powerUse: 2, kerbalCapacity: 5 },
    [ModuleType.Greenhouse]:    { cost: M([[ResourceType.BuildingMaterials, 150], [ResourceType.Power, 100]]), powerUse: 4, snacksGen: 2 },
    [ModuleType.ScienceLab]:    { cost: M([[ResourceType.BuildingMaterials, 200], [ResourceType.Power, 150]]), powerUse: 5, scienceGen: 1 },
    [ModuleType.SolarArray]:    { cost: M([[ResourceType.BuildingMaterials, 120]]), powerGen: 15 },
    [ModuleType.MiningRig]:     { cost: M([[ResourceType.BuildingMaterials, 250], [ResourceType.Power, 100]]), powerUse: 6, materialsGen: 2 },
    [ModuleType.CommsRelay]:    { cost: M([[ResourceType.BuildingMaterials, 80], [ResourceType.Power, 30]]), powerUse: 1 },
    [ModuleType.OrbitalAssembly]: { cost: M([[ResourceType.BuildingMaterials, 400], [ResourceType.Power, 250]]), powerUse: 8 }
};

export type TechId = 'ISRU' | 'Advanced Power' | 'Comms' | 'Orbital Assembly';

type TechSpec = { cost: number; unlocks: ModuleType[] };

export const TECHS: Record<TechId, TechSpec> = {
    'ISRU':             { cost: 500,  unlocks: [ModuleType.MiningRig] },
    'Advanced Power':   { cost: 400,  unlocks: [ModuleType.SolarArray] },
    'Comms':            { cost: 200,  unlocks: [ModuleType.CommsRelay] },
    'Orbital Assembly': { cost: 800,  unlocks: [ModuleType.OrbitalAssembly] }
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
    unlocked: Set<ModuleType> = new Set<ModuleType>([
        ModuleType.Habitation,
        ModuleType.Greenhouse,
        ModuleType.SolarArray,
        ModuleType.ScienceLab,
        // Ensure Mining Rigs can be built and produce without a tech UI
        ModuleType.MiningRig
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

        this.recomputeKerbalCapacity();
    }

    setMode(mode: ColonyMode) { this.mode = mode; }

    isUnlocked(type: ModuleType): boolean { return this.unlocked.has(type) || type === ModuleType.CommandCenter; }

    unlockTech(id: TechId): boolean {
        const spec = TECHS[id];
        if (!spec) return false;
        const sci = this.resources.get(ResourceType.Science) || 0;
        if (sci < spec.cost) return false;
        this.resources.set(ResourceType.Science, sci - spec.cost);
        spec.unlocks.forEach(u => this.unlocked.add(u));
        return true;
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
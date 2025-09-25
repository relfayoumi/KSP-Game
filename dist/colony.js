"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colony = exports.ModuleType = exports.ResourceType = void 0;
var ResourceType;
(function (ResourceType) {
    ResourceType["Power"] = "Power";
    ResourceType["Snacks"] = "Snacks";
    ResourceType["BuildingMaterials"] = "Building Materials";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var ModuleType;
(function (ModuleType) {
    ModuleType["CommandCenter"] = "Command Center";
    ModuleType["Habitation"] = "Habitation";
    ModuleType["Greenhouse"] = "Greenhouse";
})(ModuleType || (exports.ModuleType = ModuleType = {}));
class Colony {
    constructor() {
        this.resources = new Map();
        this.modules = new Map();
        this.lastUpdateTime = Date.now();
        this.resources.set(ResourceType.Power, 1000);
        this.resources.set(ResourceType.Snacks, 100);
        this.resources.set(ResourceType.BuildingMaterials, 500);
        this.modules.set(ModuleType.CommandCenter, 1);
        this.modules.set(ModuleType.Habitation, 0);
        this.modules.set(ModuleType.Greenhouse, 0);
    }
    update() {
        const now = Date.now();
        const delta = (now - this.lastUpdateTime) / 1000; // seconds
        // Resource generation
        const powerGeneration = (this.modules.get(ModuleType.CommandCenter) || 0) * 10;
        const snackGeneration = (this.modules.get(ModuleType.Greenhouse) || 0) * 2;
        this.addResource(ResourceType.Power, powerGeneration * delta);
        this.addResource(ResourceType.Snacks, snackGeneration * delta);
        this.lastUpdateTime = now;
    }
    addResource(type, amount) {
        this.resources.set(type, (this.resources.get(type) || 0) + amount);
    }
    removeResource(type, amount) {
        const currentAmount = this.resources.get(type) || 0;
        if (currentAmount >= amount) {
            this.resources.set(type, currentAmount - amount);
            return true;
        }
        return false;
    }
    buildModule(type, cost) {
        let canAfford = true;
        cost.forEach((amount, resource) => {
            if ((this.resources.get(resource) || 0) < amount) {
                canAfford = false;
            }
        });
        if (canAfford) {
            cost.forEach((amount, resource) => {
                this.removeResource(resource, amount);
            });
            this.modules.set(type, (this.modules.get(type) || 0) + 1);
            console.log(`Built ${type}`);
        }
        else {
            console.log(`Not enough resources to build ${type}`);
        }
    }
}
exports.Colony = Colony;

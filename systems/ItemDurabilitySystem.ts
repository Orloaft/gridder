import { ItemInstance, Rarity } from '@/types/core.types';
import { Hero } from '@/types/core.types';

export interface DurabilityConfig {
  maxByRarity: Record<Rarity, number | undefined>;
  repairCosts: Record<Rarity, number>;
  lossOnFaint: number;
}

export const DURABILITY_CONFIG: DurabilityConfig = {
  maxByRarity: {
    [Rarity.Common]: 3,
    [Rarity.Uncommon]: 5,
    [Rarity.Rare]: 7,
    [Rarity.Legendary]: 10,
    [Rarity.Mythic]: undefined, // Infinite durability
  },
  repairCosts: {
    [Rarity.Common]: 50,      // Per durability point
    [Rarity.Uncommon]: 150,
    [Rarity.Rare]: 400,
    [Rarity.Legendary]: 1000,
    [Rarity.Mythic]: 0,       // Cannot break, no repair needed
  },
  lossOnFaint: 1, // Durability lost when hero faints
};

export class ItemDurabilitySystem {
  /**
   * Initialize durability for a new item
   */
  static initializeDurability(item: ItemInstance): void {
    const maxDurability = DURABILITY_CONFIG.maxByRarity[item.rarity];
    if (maxDurability !== undefined) {
      item.durability = item.maxDurability || maxDurability;
      item.maxDurability = maxDurability;
    }
    // Mythic items have no durability (unbreakable)
  }

  /**
   * Process durability loss when a hero faints
   */
  static processHeroFaint(hero: Hero, inventory: ItemInstance[]): {
    brokenItems: ItemInstance[];
    damagedItems: ItemInstance[];
  } {
    const brokenItems: ItemInstance[] = [];
    const damagedItems: ItemInstance[] = [];

    // Get all equipped items for this hero
    const equippedItems = inventory.filter(item => item.equippedTo === hero.instanceId);

    equippedItems.forEach(item => {
      // Skip mythic items (no durability)
      if (item.rarity === Rarity.Mythic) return;

      if (item.durability !== undefined) {
        // Reduce durability
        item.durability -= DURABILITY_CONFIG.lossOnFaint;

        if (item.durability <= 0) {
          // Item breaks
          item.durability = 0;
          brokenItems.push(item);
          // Unequip broken item
          delete item.equippedTo;
        } else {
          damagedItems.push(item);
        }
      }
    });

    return { brokenItems, damagedItems };
  }

  /**
   * Check if an item is broken
   */
  static isBroken(item: ItemInstance): boolean {
    return item.durability !== undefined && item.durability <= 0;
  }

  /**
   * Check if an item needs repair
   */
  static needsRepair(item: ItemInstance): boolean {
    if (item.durability === undefined || item.maxDurability === undefined) {
      return false; // Mythic items don't need repair
    }
    return item.durability < item.maxDurability;
  }

  /**
   * Calculate repair cost for an item
   */
  static calculateRepairCost(item: ItemInstance): number {
    if (!this.needsRepair(item)) return 0;

    const costPerPoint = DURABILITY_CONFIG.repairCosts[item.rarity];
    const pointsToRepair = (item.maxDurability || 0) - (item.durability || 0);

    return costPerPoint * pointsToRepair;
  }

  /**
   * Repair an item (restore durability to max)
   */
  static repairItem(item: ItemInstance, playerGold: number): {
    success: boolean;
    cost: number;
    message: string;
  } {
    if (!this.needsRepair(item)) {
      return {
        success: false,
        cost: 0,
        message: 'Item does not need repair'
      };
    }

    const cost = this.calculateRepairCost(item);

    if (playerGold < cost) {
      return {
        success: false,
        cost,
        message: `Insufficient gold (need ${cost}g)`
      };
    }

    // Restore durability
    item.durability = item.maxDurability;

    return {
      success: true,
      cost,
      message: `${item.name} repaired for ${cost}g`
    };
  }

  /**
   * Batch repair multiple items
   */
  static repairAllItems(
    items: ItemInstance[],
    playerGold: number,
    prioritizeEquipped: boolean = true
  ): {
    repairedItems: ItemInstance[];
    skippedItems: ItemInstance[];
    totalCost: number;
    remainingGold: number;
  } {
    const repairedItems: ItemInstance[] = [];
    const skippedItems: ItemInstance[] = [];
    let totalCost = 0;
    let remainingGold = playerGold;

    // Sort items by priority
    const sortedItems = [...items].sort((a, b) => {
      // Prioritize equipped items if requested
      if (prioritizeEquipped) {
        const aEquipped = !!a.equippedTo;
        const bEquipped = !!b.equippedTo;
        if (aEquipped !== bEquipped) return aEquipped ? -1 : 1;
      }

      // Then prioritize by rarity (higher rarity first)
      const rarityOrder = [Rarity.Mythic, Rarity.Legendary, Rarity.Rare, Rarity.Uncommon, Rarity.Common];
      return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    });

    for (const item of sortedItems) {
      if (!this.needsRepair(item)) continue;

      const cost = this.calculateRepairCost(item);

      if (remainingGold >= cost) {
        const result = this.repairItem(item, remainingGold);
        if (result.success) {
          repairedItems.push(item);
          totalCost += result.cost;
          remainingGold -= result.cost;
        }
      } else {
        skippedItems.push(item);
      }
    }

    return {
      repairedItems,
      skippedItems,
      totalCost,
      remainingGold
    };
  }

  /**
   * Get durability status display
   */
  static getDurabilityDisplay(item: ItemInstance): string {
    if (item.durability === undefined) {
      return 'Unbreakable'; // Mythic items
    }

    if (item.durability <= 0) {
      return 'BROKEN';
    }

    const percentage = (item.durability / (item.maxDurability || 1)) * 100;

    if (percentage <= 20) {
      return `⚠️ ${item.durability}/${item.maxDurability}`;
    } else if (percentage <= 50) {
      return `⚡ ${item.durability}/${item.maxDurability}`;
    } else {
      return `${item.durability}/${item.maxDurability}`;
    }
  }

  /**
   * Get durability color for UI
   */
  static getDurabilityColor(item: ItemInstance): string {
    if (item.durability === undefined) {
      return '#FFD700'; // Gold for unbreakable
    }

    if (item.durability <= 0) {
      return '#FF0000'; // Red for broken
    }

    const percentage = (item.durability / (item.maxDurability || 1)) * 100;

    if (percentage <= 20) {
      return '#FF4444'; // Light red for critical
    } else if (percentage <= 50) {
      return '#FFA500'; // Orange for damaged
    } else if (percentage < 100) {
      return '#FFFF00'; // Yellow for used
    } else {
      return '#00FF00'; // Green for pristine
    }
  }

  /**
   * Simulate durability loss for strategic planning
   */
  static simulateDurabilityLoss(
    items: ItemInstance[],
    expectedFaints: number
  ): {
    itemsToBreak: ItemInstance[];
    totalRepairCost: number;
    canSurvive: Map<ItemInstance, number>; // Item -> faints it can survive
  } {
    const itemsToBreak: ItemInstance[] = [];
    let totalRepairCost = 0;
    const canSurvive = new Map<ItemInstance, number>();

    items.forEach(item => {
      if (item.durability === undefined) {
        // Mythic items survive forever
        canSurvive.set(item, Infinity);
        return;
      }

      const faintsUntilBreak = Math.floor(item.durability / DURABILITY_CONFIG.lossOnFaint);
      canSurvive.set(item, faintsUntilBreak);

      if (faintsUntilBreak < expectedFaints) {
        itemsToBreak.push(item);
        // Would need repair after breaking
        totalRepairCost += DURABILITY_CONFIG.repairCosts[item.rarity] * (item.maxDurability || 0);
      } else {
        // Calculate repair cost for partial damage
        const durabilityLoss = expectedFaints * DURABILITY_CONFIG.lossOnFaint;
        const repairPoints = Math.min(durabilityLoss, item.durability);
        totalRepairCost += DURABILITY_CONFIG.repairCosts[item.rarity] * repairPoints;
      }
    });

    return {
      itemsToBreak,
      totalRepairCost,
      canSurvive
    };
  }

  /**
   * Auto-repair strategy for AI
   */
  static autoRepairStrategy(
    inventory: ItemInstance[],
    playerGold: number,
    nextMissionDifficulty: 'easy' | 'medium' | 'hard'
  ): ItemInstance[] {
    const expectedFaints = {
      easy: 0,
      medium: 1,
      hard: 2
    }[nextMissionDifficulty];

    const itemsToRepair: ItemInstance[] = [];

    // Priority 1: Repair equipped broken items
    const brokenEquipped = inventory.filter(item =>
      item.equippedTo && this.isBroken(item)
    );
    itemsToRepair.push(...brokenEquipped);

    // Priority 2: Repair equipped items that would break
    const simulation = this.simulateDurabilityLoss(
      inventory.filter(item => item.equippedTo && !this.isBroken(item)),
      expectedFaints
    );
    itemsToRepair.push(...simulation.itemsToBreak);

    // Priority 3: Repair high-value unequipped items if gold allows
    if (playerGold > 5000) {
      const valuableUnequipped = inventory.filter(item =>
        !item.equippedTo &&
        this.needsRepair(item) &&
        (item.rarity === Rarity.Legendary || item.rarity === Rarity.Rare)
      );
      itemsToRepair.push(...valuableUnequipped);
    }

    return itemsToRepair;
  }
}
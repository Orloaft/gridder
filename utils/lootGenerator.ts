import { ITEM_TEMPLATES } from '@/data/items';
import { Rarity } from '@/types/core.types';
import { getRarityHexColor } from '@/utils/constants';

/**
 * Loot drop configuration for a stage
 */
export interface LootConfig {
  itemDropChance: number; // 0-1 probability of getting an item
  maxRarity: Rarity; // Maximum rarity that can drop
  guaranteedDrop?: boolean; // If true, always drops an item
  waveNumber?: number; // Current wave number for escalating drop tables
}

/**
 * Generate random item drops based on loot configuration
 */
export function generateLoot(config: LootConfig): string[] {
  const droppedItems: string[] = [];

  // Check if item should drop
  const shouldDrop = config.guaranteedDrop || Math.random() < config.itemDropChance;

  if (!shouldDrop) {
    return droppedItems;
  }

  // Get all items that can drop (at or below max rarity)
  const availableItems = Object.values(ITEM_TEMPLATES).filter(
    item => item.rarity <= config.maxRarity
  );

  if (availableItems.length === 0) {
    return droppedItems;
  }

  // Get wave-based rarity weights (escalating drop tables)
  const rarityWeights = getWaveBasedRarityWeights(config.waveNumber || 1);

  // Calculate weights for each item based on wave-escalated rarity probabilities
  const weights = availableItems.map(item => {
    // Use wave-based weights instead of fixed exponential weights
    switch (item.rarity) {
      case Rarity.Common:
        return rarityWeights.common;
      case Rarity.Uncommon:
        return rarityWeights.uncommon;
      case Rarity.Rare:
        return rarityWeights.rare;
      case Rarity.Legendary:
        return rarityWeights.legendary;
      case Rarity.Mythic:
        return rarityWeights.mythic;
      default:
        return 1;
    }
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;

  // Select item based on weighted probability
  for (let i = 0; i < availableItems.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      droppedItems.push(availableItems[i].id);
      break;
    }
  }

  return droppedItems;
}

/**
 * Get rarity weights based on wave number (escalating drop tables)
 * Matches design doc specifications with Mythic tier
 */
function getWaveBasedRarityWeights(waveNumber: number): {
  common: number;
  uncommon: number;
  rare: number;
  legendary: number;
  mythic: number;
} {
  // Waves 1-3: Early game - mostly common items
  // 70% common, 20% uncommon, 8% rare, 2% legendary, 0% mythic
  if (waveNumber <= 3) {
    return { common: 700, uncommon: 200, rare: 80, legendary: 20, mythic: 0 };
  }

  // Waves 4-6: Mid-early game - uncommon becomes more common
  // 50% common, 30% uncommon, 15% rare, 5% legendary, 0% mythic
  if (waveNumber <= 6) {
    return { common: 500, uncommon: 300, rare: 150, legendary: 50, mythic: 0 };
  }

  // Waves 7-10: Mid game - rare items appear more often
  // 35% common, 30% uncommon, 25% rare, 9.5% legendary, 0.5% mythic
  if (waveNumber <= 10) {
    return { common: 350, uncommon: 300, rare: 250, legendary: 95, mythic: 5 };
  }

  // Waves 11-15: Late game - legendary items more common
  // 20% common, 25% uncommon, 30% rare, 20% legendary, 5% mythic
  if (waveNumber <= 15) {
    return { common: 200, uncommon: 250, rare: 300, legendary: 200, mythic: 50 };
  }

  // Wave 16+: Endgame - best drop rates
  // 10% common, 20% uncommon, 30% rare, 30% legendary, 10% mythic
  return { common: 100, uncommon: 200, rare: 300, legendary: 300, mythic: 100 };
}

/**
 * Get default loot config based on stage difficulty
 * Updated for Mythic tier - only boss stages can drop Mythic items
 */
export function getDefaultLootConfig(difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'boss'): LootConfig {
  switch (difficulty) {
    case 'tutorial':
      return {
        itemDropChance: 0.50, // 50% chance - good chance even in tutorial
        maxRarity: Rarity.Common,
      };
    case 'easy':
      return {
        itemDropChance: 0.70, // 70% chance - very likely to get items
        maxRarity: Rarity.Uncommon,
      };
    case 'medium':
      return {
        itemDropChance: 0.85, // 85% chance - almost always drops
        maxRarity: Rarity.Rare,
      };
    case 'hard':
      return {
        itemDropChance: 0.95, // 95% chance - nearly guaranteed
        maxRarity: Rarity.Legendary,
      };
    case 'boss':
      return {
        itemDropChance: 1.0, // 100% chance (guaranteed)
        maxRarity: Rarity.Mythic, // Boss stages can drop Mythic items
        guaranteedDrop: true,
      };
    default:
      return {
        itemDropChance: 0.45,
        maxRarity: Rarity.Uncommon,
      };
  }
}

/**
 * Get rarity display name
 */
export function getRarityName(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.Common:
      return 'Common';
    case Rarity.Uncommon:
      return 'Uncommon';
    case Rarity.Rare:
      return 'Rare';
    case Rarity.Legendary:
      return 'Legendary';
    case Rarity.Mythic:
      return 'Mythic';
    default:
      return 'Unknown';
  }
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: Rarity): string {
  return getRarityHexColor(rarity);
}

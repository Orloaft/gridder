import { ITEM_TEMPLATES } from '@/data/items';
import { Rarity } from '@/types/core.types';

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
      case Rarity.Epic:
        return rarityWeights.epic;
      case Rarity.Legendary:
        return rarityWeights.legendary;
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
 */
function getWaveBasedRarityWeights(waveNumber: number): {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
} {
  // Waves 1-3: 80% common, 15% uncommon, 5% rare, 0% epic, 0% legendary
  if (waveNumber <= 3) {
    return { common: 80, uncommon: 15, rare: 5, epic: 0, legendary: 0 };
  }

  // Waves 4-6: 60% common, 25% uncommon, 12% rare, 3% epic, 0% legendary
  if (waveNumber <= 6) {
    return { common: 60, uncommon: 25, rare: 12, epic: 3, legendary: 0 };
  }

  // Waves 7-9: 40% common, 30% uncommon, 20% rare, 9% epic, 1% legendary
  if (waveNumber <= 9) {
    return { common: 40, uncommon: 30, rare: 20, epic: 9, legendary: 1 };
  }

  // Wave 10+: 25% common, 25% uncommon, 25% rare, 15% epic, 10% legendary
  return { common: 25, uncommon: 25, rare: 25, epic: 15, legendary: 10 };
}

/**
 * Get default loot config based on stage difficulty
 */
export function getDefaultLootConfig(difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'boss'): LootConfig {
  switch (difficulty) {
    case 'tutorial':
      return {
        itemDropChance: 0.15, // 15% chance
        maxRarity: Rarity.Common,
      };
    case 'easy':
      return {
        itemDropChance: 0.25, // 25% chance
        maxRarity: Rarity.Uncommon,
      };
    case 'medium':
      return {
        itemDropChance: 0.35, // 35% chance
        maxRarity: Rarity.Rare,
      };
    case 'hard':
      return {
        itemDropChance: 0.50, // 50% chance
        maxRarity: Rarity.Epic,
      };
    case 'boss':
      return {
        itemDropChance: 1.0, // 100% chance (guaranteed)
        maxRarity: Rarity.Legendary,
        guaranteedDrop: true,
      };
    default:
      return {
        itemDropChance: 0.25,
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
    case Rarity.Epic:
      return 'Epic';
    case Rarity.Legendary:
      return 'Legendary';
    default:
      return 'Unknown';
  }
}

/**
 * Get rarity color for UI display
 */
export function getRarityColor(rarity: Rarity): string {
  switch (rarity) {
    case Rarity.Common:
      return '#9CA3AF'; // Gray
    case Rarity.Uncommon:
      return '#10B981'; // Green
    case Rarity.Rare:
      return '#3B82F6'; // Blue
    case Rarity.Epic:
      return '#A855F7'; // Purple
    case Rarity.Legendary:
      return '#F59E0B'; // Gold
    default:
      return '#6B7280';
  }
}

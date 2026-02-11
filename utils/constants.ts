import { Rarity } from '@/types/core.types';
import { ScreenType } from '@/types/progression.types';

// --- Rarity Color Mappings (Tailwind classes) ---

export const RARITY_BORDER = {
  [Rarity.Common]: 'border-gray-400',
  [Rarity.Uncommon]: 'border-green-400',
  [Rarity.Rare]: 'border-blue-400',
  [Rarity.Legendary]: 'border-yellow-400',
  [Rarity.Mythic]: 'border-pink-400',
} as const;

export const RARITY_BG = {
  [Rarity.Common]: 'bg-gray-700/50',
  [Rarity.Uncommon]: 'bg-green-700/50',
  [Rarity.Rare]: 'bg-blue-700/50',
  [Rarity.Legendary]: 'bg-yellow-700/50',
  [Rarity.Mythic]: 'bg-pink-700/50',
} as const;

export const RARITY_TEXT = {
  [Rarity.Common]: 'text-gray-300',
  [Rarity.Uncommon]: 'text-green-300',
  [Rarity.Rare]: 'text-blue-300',
  [Rarity.Legendary]: 'text-yellow-300',
  [Rarity.Mythic]: 'text-pink-300',
} as const;

export const RARITY_HOVER_GLOW = {
  [Rarity.Common]: 'hover:shadow-gray-400/50',
  [Rarity.Uncommon]: 'hover:shadow-green-400/50',
  [Rarity.Rare]: 'hover:shadow-blue-400/50',
  [Rarity.Legendary]: 'hover:shadow-yellow-400/50',
  [Rarity.Mythic]: 'hover:shadow-pink-400/50',
} as const;

export const RARITY_HOVER_BORDER = {
  [Rarity.Common]: 'hover:border-gray-300',
  [Rarity.Uncommon]: 'hover:border-green-300',
  [Rarity.Rare]: 'hover:border-blue-300',
  [Rarity.Legendary]: 'hover:border-yellow-300',
  [Rarity.Mythic]: 'hover:border-pink-300',
} as const;

// Hex colors for canvas/inline style usage
export const RARITY_HEX = {
  [Rarity.Common]: '#9CA3AF',
  [Rarity.Uncommon]: '#10B981',
  [Rarity.Rare]: '#3B82F6',
  [Rarity.Legendary]: '#F59E0B',
  [Rarity.Mythic]: '#EC4899',
} as const;

/** Helper: get all Tailwind rarity classes for a border+bg card */
export function getRarityClasses(rarity: string): string {
  const r = rarity as Rarity;
  const border = RARITY_BORDER[r] ?? 'border-gray-400';
  const bg = RARITY_BG[r] ?? 'bg-gray-700/50';
  return `${border} ${bg}`;
}

/** Helper: get rarity text color class */
export function getRarityTextColor(rarity: string): string {
  return RARITY_TEXT[rarity as Rarity] ?? 'text-gray-300';
}

/** Helper: get rarity border color class */
export function getRarityBorderColor(rarity: string): string {
  return RARITY_BORDER[rarity as Rarity] ?? 'border-gray-400';
}

/** Helper: get rarity hex color (for canvas/inline styles) */
export function getRarityHexColor(rarity: string): string {
  return RARITY_HEX[rarity as Rarity] ?? '#6B7280';
}

// --- Sell Prices ---

export const RARITY_SELL_PRICES: Record<string, number> = {
  [Rarity.Common]: 25,
  [Rarity.Uncommon]: 50,
  [Rarity.Rare]: 100,
  [Rarity.Legendary]: 400,
  [Rarity.Mythic]: 800,
};

// --- Screen Backgrounds ---

export const SCREEN_BACKGROUNDS: Partial<Record<ScreenType, string>> = {
  [ScreenType.MainMenu]: 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900',
  [ScreenType.LocationMap]: 'bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900',
  [ScreenType.CampaignMap]: 'bg-gradient-to-br from-gray-900 via-emerald-900 to-gray-900',
  [ScreenType.PreBattle]: 'bg-gradient-to-br from-gray-900 via-amber-900 to-gray-900',
  [ScreenType.Battle]: 'bg-gradient-to-br from-red-950 via-gray-900 to-gray-900',
  [ScreenType.HeroRoster]: 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900',
  [ScreenType.Shop]: 'bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900',
  [ScreenType.RewardReveal]: 'bg-gradient-to-br from-gray-900 via-amber-900 to-gray-900',
};

// --- Battle Constants ---

export const COOLDOWN_THRESHOLD = 100;
export const COOLDOWN_DIVISOR = 10;
export const BASE_DEFENSE_MULTIPLIER = 0.3;
export const GRID_DEFAULT_ROWS = 8;
export const GRID_DEFAULT_COLS = 8;

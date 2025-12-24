import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { HERO_TEMPLATES, getHeroGemCost } from '@/data/units';
import { Rarity } from '@/types/core.types';

export function createHeroMenuLayout(
  playerGems: number,
  unlockedHeroIds: string[],
  onUnlockHero: (heroId: string, cost: number) => void,
  onNavigate: (screen: ScreenType) => void
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];

  // Get all heroes sorted by rarity (quester first, then by rarity)
  const rarityOrder = {
    [Rarity.Common]: 1,
    [Rarity.Uncommon]: 2,
    [Rarity.Rare]: 3,
    [Rarity.Epic]: 4,
    [Rarity.Legendary]: 5,
  };

  const allHeroes = Object.values(HERO_TEMPLATES).sort((a, b) => {
    // Quester always first
    if (a.id === 'quester') return -1;
    if (b.id === 'quester') return 1;

    // Then sort by rarity
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  // Layout heroes in a grid (8 rows x 8 cols = 64 slots, minus back button)
  let row = 0;
  let col = 0;

  allHeroes.forEach((hero, index) => {
    const isUnlocked = unlockedHeroIds.includes(hero.id);
    const gemCost = getHeroGemCost(hero.rarity);
    const canAfford = playerGems >= gemCost;

    occupants.push({
      id: `hero-${hero.id}`,
      type: GridOccupantType.Hero,
      position: { row, col },
      heroClass: hero.class,
      name: hero.name,
      level: 1,
      spritePath: hero.spritePath,
      hp: hero.baseStats.hp,
      maxHp: hero.baseStats.maxHp,
      animationDelay: index * 0.02,
      // If locked, show dark overlay and gem cost
      locked: !isUnlocked,
      lockCost: isUnlocked ? undefined : gemCost,
      lockCurrency: 'gems',
      onClick: isUnlocked ? undefined : () => {
        if (canAfford) {
          onUnlockHero(hero.id, gemCost);
        }
      },
    });

    // Move to next position
    col++;
    if (col >= 8) {
      col = 0;
      row++;
    }
  });

  // Gem counter at bottom left
  occupants.push({
    id: 'resource-gems',
    type: GridOccupantType.Resource,
    position: { row: 7, col: 0 },
    resourceType: 'gems',
    amount: playerGems,
    icon: '💎',
    animationDelay: 0,
  });

  // Back button at bottom right
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 7, col: 7 },
    label: 'Back',
    icon: '←',
    variant: 'secondary',
    onClick: () => onNavigate(ScreenType.MainMenu),
    animationDelay: 0,
  });

  return occupants;
}

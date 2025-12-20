import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { Item, Hero } from '@/types/core.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';

export interface ShopItem {
  item: Item;
  available: boolean; // Can afford
}

export interface ShopHero {
  hero: Hero;
  available: boolean; // Can afford
}

export function createShopLayout(
  playerGold: number,
  playerGems: number,
  shopItems: Item[],
  shopHeroes: Hero[],
  _navigate: (screen: ScreenType) => void,
  onPurchaseItem: (itemId: string) => void,
  onPurchaseHero: (heroId: string) => void,
  onRefreshShop: () => void
): AnyGridOccupant[] {
  // Use the global transition-aware navigate function
  const navigate = (screen: ScreenType) => {
    if ((window as any).__gridNavigate) {
      (window as any).__gridNavigate(screen);
    } else {
      _navigate(screen);
    }
  };

  const occupants: AnyGridOccupant[] = [];

  // Row 0: Back button, Title, Resources
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Back',
    icon: generateButtonIcon('back'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.MainMenu),
    animationDelay: 0.1,
  });

  occupants.push({
    id: 'shop-title',
    type: GridOccupantType.Decoration,
    position: { row: 0, col: 2 },
    text: 'Shop',
    style: 'title',
    animationDelay: 0.15,
  });

  // Row 1: Items for Sale label and refresh button
  occupants.push({
    id: 'items-label',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 0 },
    text: 'Items for Sale:',
    style: 'subtitle',
    animationDelay: 0.3,
  });

  occupants.push({
    id: 'btn-refresh',
    type: GridOccupantType.Button,
    position: { row: 1, col: 7 },
    label: 'Refresh',
    icon: '🔄',
    variant: 'secondary',
    onClick: onRefreshShop,
    animationDelay: 0.35,
  });

  // Rows 2-3: Items for sale (up to 16 items in 2 rows)
  shopItems.slice(0, 16).forEach((item, index) => {
    const row = Math.floor(index / 8) + 2;
    const col = index % 8;
    const canAfford = playerGold >= item.cost;

    // Create a button that shows the item and allows purchasing
    occupants.push({
      id: `shop-item-${item.id}-${index}`,
      type: GridOccupantType.Button,
      position: { row, col },
      label: `${item.name}\n💰${item.cost}`,
      icon: item.spritePath,
      variant: canAfford ? 'primary' : 'secondary',
      disabled: !canAfford,
      onClick: canAfford ? () => onPurchaseItem(item.id) : () => {},
      animationDelay: 0.4 + index * 0.03,
    });
  });

  // Row 4: Heroes for Hire label
  occupants.push({
    id: 'heroes-label',
    type: GridOccupantType.Decoration,
    position: { row: 4, col: 0 },
    text: 'Heroes for Hire:',
    style: 'subtitle',
    animationDelay: 0.7,
  });

  // Rows 5-7: Heroes for hire (up to 24 heroes in 3 rows)
  shopHeroes.slice(0, 24).forEach((hero, index) => {
    const row = Math.floor(index / 8) + 5;
    const col = index % 8;
    const canAfford = playerGold >= 200; // Hero cost is 200 gold (we can make this dynamic later)

    occupants.push({
      id: `shop-hero-${hero.instanceId}-${index}`,
      type: GridOccupantType.Hero,
      position: { row, col },
      heroClass: hero.class,
      name: hero.name,
      level: hero.level,
      spritePath: hero.spritePath,
      hp: hero.currentStats.hp,
      maxHp: hero.currentStats.maxHp,
      onClick: canAfford ? () => onPurchaseHero(hero.id) : undefined,
      animationDelay: 0.75 + index * 0.03,
    });
  });

  // If no items, show message
  if (shopItems.length === 0) {
    occupants.push({
      id: 'no-items',
      type: GridOccupantType.Decoration,
      position: { row: 2, col: 2 },
      text: 'No items available',
      style: 'subtitle',
      animationDelay: 0.4,
    });
  }

  // If no heroes, show message
  if (shopHeroes.length === 0) {
    occupants.push({
      id: 'no-heroes',
      type: GridOccupantType.Decoration,
      position: { row: 5, col: 2 },
      text: 'No heroes available',
      style: 'subtitle',
      animationDelay: 0.75,
    });
  }

  return occupants;
}

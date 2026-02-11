import type { StoreSet, StoreGet } from '../storeTypes';
import { Hero, Item, Rarity } from '@/types/core.types';
import { ScreenType } from '@/types/progression.types';
import { getRandomItems, ITEM_TEMPLATES } from '@/data/items';
import { HERO_TEMPLATES, createHeroInstance, getHeroGemCost } from '@/data/units';
import { createShopLayout } from '@/screens/Shop/ShopLayout';

export const shopInitialState = {
  shopItems: [] as Item[],
  shopHeroes: [] as Hero[],
};

export function createShopSlice(set: StoreSet, get: StoreGet) {
  const actions = {
    refreshShop: () => {
      // Get random items (6-10 items)
      const itemCount = Math.floor(Math.random() * 5) + 6;
      const newItems = getRandomItems(itemCount, Rarity.Mythic);

      // Get random heroes (2-4 heroes)
      const heroCount = Math.floor(Math.random() * 3) + 2;
      const availableHeroIds = Object.keys(HERO_TEMPLATES);
      const selectedHeroIds = availableHeroIds
        .sort(() => Math.random() - 0.5)
        .slice(0, heroCount);
      const newHeroes = selectedHeroIds.map(id => createHeroInstance(id, 1) as Hero);

      set({
        shopItems: newItems,
        shopHeroes: newHeroes,
      });

      // Regenerate shop layout if currently on shop screen
      const state = get();
      if (state.currentScreen === ScreenType.Shop) {
        const newOccupants = createShopLayout(
          state.player.gold,
          state.player.gems,
          newItems,
          newHeroes,
          state.navigate,
          state.purchaseItem,
          state.purchaseHero,
          state.refreshShop
        );
        set({ gridOccupants: newOccupants });
      }
    },

    purchaseItem: (itemId: string) => {
      const state = get();
      const item = state.shopItems.find(i => i.id === itemId);

      if (!item) {
        return false;
      }

      // Check if player has enough gold
      if (state.player.gold < item.cost) {
        return false;
      }

      // Deduct gold and add item to inventory
      if (state.spendGold(item.cost)) {
        state.addItem(item);

        // Regenerate shop layout with updated gold
        if (state.currentScreen === ScreenType.Shop) {
          const newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            state.shopItems,
            state.shopHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
          set({ gridOccupants: newOccupants });
        }

        return true;
      }

      return false;
    },

    purchaseHero: (heroId: string) => {
      const state = get();
      const hero = state.shopHeroes.find(h => h.id === heroId);

      if (!hero) {
        return false;
      }

      // Calculate hero cost based on rarity/tier
      const heroCost = getHeroGemCost(hero.rarity);

      // Check if player has enough gems (not gold!)
      if (state.player.gems < heroCost) {
        return false;
      }

      // Deduct gems and add hero to roster
      if (state.spendGems(heroCost)) {
        // Create a new instance to avoid conflicts
        const newHero = createHeroInstance(hero.id, 1) as Hero;
        state.addHero(newHero);

        // Remove hero from shop
        const newShopHeroes = state.shopHeroes.filter(h => h !== hero);
        set({ shopHeroes: newShopHeroes });

        // Regenerate shop layout with updated gems and heroes
        if (state.currentScreen === ScreenType.Shop) {
          const newOccupants = createShopLayout(
            state.player.gold,
            state.player.gems,
            state.shopItems,
            newShopHeroes,
            state.navigate,
            state.purchaseItem,
            state.purchaseHero,
            state.refreshShop
          );
          set({ gridOccupants: newOccupants });
        }

        return true;
      }

      return false;
    },
  };

  return { ...shopInitialState, ...actions };
}

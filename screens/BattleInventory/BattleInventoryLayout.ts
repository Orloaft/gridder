import { GridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { Hero, ItemInstance } from '@/types/core.types';

export function createBattleInventoryLayout(
  heroes: Hero[],
  inventory: ItemInstance[],
  onEquipItem: (itemId: string, heroId: string) => void,
  onUnequipItem: (itemId: string) => void,
  onUseConsumable: (itemId: string, heroId: string) => void,
  onBack: () => void
): GridOccupant[] {
  const occupants: GridOccupant[] = [];

  // Title
  occupants.push({
    id: 'inventory-title',
    type: GridOccupantType.Decoration,
    position: { row: 0, col: 2 },
    width: 4,
    text: 'Manage Equipment',
    style: 'title',
    animationDelay: 0.1,
  });

  // Back to battle button
  occupants.push({
    id: 'btn-back-to-battle',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Back',
    icon: '⚔️',
    variant: 'primary',
    description: 'Return to the battle',
    onClick: onBack,
    animationDelay: 0.1,
  });

  // Heroes section
  occupants.push({
    id: 'heroes-label',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 0 },
    text: 'Your Heroes:',
    style: 'subtitle',
    animationDelay: 0.2,
  });

  // Display heroes in battle team
  const battleHeroes = heroes.slice(0, 4); // Show up to 4 heroes
  battleHeroes.forEach((hero, index) => {
    const col = index * 2;

    // Hero card with drop support for items
    occupants.push({
      id: `hero-${hero.instanceId}`,
      type: GridOccupantType.Hero,
      position: { row: 2, col },
      width: 2,
      name: hero.name,
      level: hero.level,
      heroClass: hero.class || 'Hero',
      spritePath: hero.spritePath,
      hp: hero.currentStats.hp,
      maxHp: hero.currentStats.maxHp,
      animationDelay: 0.3 + index * 0.1,
      // Drop support for items
      onItemDrop: (itemId: string) => {
        // Check if it's a consumable or equipment
        const item = inventory.find(i => i.instanceId === itemId);
        console.log('[BattleInventory] Item dropped on hero:', { itemId, item, heroId: hero.instanceId });
        if (item) {
          // Check multiple ways to identify consumables
          const isConsumable = item.type === 'consumable' ||
                               item.category === 4 || // ItemCategory.Consumable = 4
                               item.consumable === true ||
                               item.slot === 'consumable';

          if (isConsumable) {
            console.log('[BattleInventory] Using consumable on hero');
            onUseConsumable(itemId, hero.instanceId);
          } else {
            console.log('[BattleInventory] Equipping item on hero');
            onEquipItem(itemId, hero.instanceId);
          }
        }
      },
    });

    // Show equipped item if any
    if (hero.equippedItem) {
      const equippedItem = inventory.find(i => i.instanceId === hero.equippedItem);
      if (equippedItem) {
        occupants.push({
          id: `equipped-${hero.instanceId}`,
          type: GridOccupantType.Button,
          position: { row: 3, col },
          width: 2,
          label: equippedItem.name,
          icon: equippedItem.spritePath || '📦',
          variant: 'secondary',
          description: `Click to unequip from ${hero.name}`,
          onClick: () => onUnequipItem(equippedItem.instanceId),
          animationDelay: 0.4 + index * 0.1,
        });
      }
    } else {
      occupants.push({
        id: `no-item-${hero.instanceId}`,
        type: GridOccupantType.Decoration,
        position: { row: 3, col },
        width: 2,
        text: 'No item',
        style: 'normal',
        animationDelay: 0.4 + index * 0.1,
      });
    }
  });

  // Equipment section
  occupants.push({
    id: 'equipment-label',
    type: GridOccupantType.Decoration,
    position: { row: 4, col: 0 },
    text: 'Equipment:',
    style: 'subtitle',
    animationDelay: 0.5,
  });

  // Filter items into equipment and consumables
  const unequippedItems = inventory.filter(item => !item.equippedTo);
  const equipmentItems = unequippedItems.filter(item => {
    // Check if item is equipment (not consumable)
    const itemType = item.type || 'equipment'; // Default to equipment if no type
    return itemType !== 'consumable';
  });
  const consumableItems = unequippedItems.filter(item => {
    const itemType = item.type || 'equipment';
    return itemType === 'consumable';
  });

  // Display equipment items
  const displayEquipment = equipmentItems.slice(0, 8); // Show up to 8 equipment items

  displayEquipment.forEach((item, index) => {
    const col = index % 8;

    occupants.push({
      id: `item-${item.instanceId}`,
      type: GridOccupantType.Button,
      position: { row: 5, col },
      label: item.name,
      icon: item.spritePath || '📦',
      variant: 'primary',
      description: `${item.description || 'An item'}\n\n🎯 Drag to a hero to equip`,
      // Make item draggable
      draggable: true,
      itemInstanceId: item.instanceId,
      onDragStart: () => {
        // Set drag data in window for debugging
        (window as any).__draggedItemId = item.instanceId;
        (window as any).__draggedItemType = 'equipment';
        console.log('[BattleInventory] Started dragging equipment:', item.name);
      },
      onClick: () => {
        // No click action - must drag to equip
        console.log('[BattleInventory] Equipment must be dragged to a hero, not clicked');
      },
      animationDelay: 0.6 + index * 0.05,
    });
  });

  // Consumables section
  occupants.push({
    id: 'consumables-label',
    type: GridOccupantType.Decoration,
    position: { row: 6, col: 0 },
    text: 'Potions:',
    style: 'subtitle',
    animationDelay: 0.65,
  });

  // Display consumable items
  const displayConsumables = consumableItems.slice(0, 8); // Show up to 8 consumables

  displayConsumables.forEach((item, index) => {
    const col = index % 8;

    occupants.push({
      id: `consumable-${item.instanceId}`,
      type: GridOccupantType.Button,
      position: { row: 7, col },
      label: item.name,
      icon: item.spritePath || '🧪',
      variant: 'secondary',
      description: `${item.description || 'A consumable item'}\n\n🎯 Drag to a hero to use`,
      // Make consumable draggable
      draggable: true,
      itemInstanceId: item.instanceId,
      onDragStart: () => {
        // Set drag data in window for debugging
        (window as any).__draggedItemId = item.instanceId;
        (window as any).__draggedItemType = 'consumable';
        console.log('[BattleInventory] Started dragging consumable:', item.name);
      },
      onClick: () => {
        // No click action - must drag to use
        console.log('[BattleInventory] Potions must be dragged to a hero, not clicked');
      },
      animationDelay: 0.7 + index * 0.05,
    });
  });

  // Instructions
  occupants.push({
    id: 'instructions',
    type: GridOccupantType.Decoration,
    position: { row: 8, col: 2 },
    width: 4,
    text: 'Drag items/potions onto specific heroes to equip/use them',
    style: 'normal',
    animationDelay: 0.8,
  });

  // Item counts
  if (equipmentItems.length > 8) {
    occupants.push({
      id: 'more-equipment',
      type: GridOccupantType.Decoration,
      position: { row: 5, col: 8 },
      text: `+${equipmentItems.length - 8}`,
      style: 'normal',
      animationDelay: 0.85,
    });
  }

  if (consumableItems.length > 8) {
    occupants.push({
      id: 'more-consumables',
      type: GridOccupantType.Decoration,
      position: { row: 7, col: 8 },
      text: `+${consumableItems.length - 8}`,
      style: 'normal',
      animationDelay: 0.9,
    });
  }

  return occupants;
}
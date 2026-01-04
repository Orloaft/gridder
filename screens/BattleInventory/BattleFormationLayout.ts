import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { Hero, ItemInstance } from '@/types/core.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';

export interface HeroFormation {
  [heroId: string]: { row: number; col: number };
}

export function createBattleFormationLayout(
  battleHeroes: Hero[], // Heroes currently in battle
  allHeroes: Hero[], // All heroes in roster
  inventory: ItemInstance[],
  heroFormation: HeroFormation,
  initialBattleTeam: string[], // Heroes that started the battle (cannot add new ones)
  onHeroPositionChange: (heroId: string, row: number, col: number) => void,
  onHeroRemove: (heroId: string) => void,
  onEquipItem: (itemId: string, heroId: string) => void,
  onUnequipItem: (itemId: string) => void,
  onUseConsumable: (itemId: string, heroId: string) => void,
  onBack: () => void,
  gridRows: number = 8,
  gridCols: number = 8
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];

  // The heroFormation now contains the final display positions (result of simulator algorithm)
  // These are exactly the positions that will be shown and used during wave transition
  const scrollMovement = 3;
  const nextWaveFormation: HeroFormation = { ...heroFormation };

  console.log('[BattleFormation] Using exact simulator results for display:', heroFormation);

  // Title bar
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Continue',
    icon: ICON_PATHS.sword,
    variant: 'primary',
    description: 'Continue to the next wave',
    onClick: () => {
      console.log('[BattleFormation] Continue button clicked - calling onBack');
      onBack();
    },
    animationDelay: 0.1,
  });

  occupants.push({
    id: 'formation-title',
    type: GridOccupantType.StatusPanel,
    position: { row: 0, col: 2 },
    width: 4,
    title: 'Next Wave Formation',
    content: 'Position heroes for after the wave transition',
    variant: 'info',
    animationDelay: 0.15,
  });

  // Battlefield grid (rows 1-6)
  const battlefieldStartRow = 1;
  const battlefieldEndRow = 6;
  const heroSideCols = 4; // Heroes can be placed in columns 0-3

  // Add grid background tiles for hero side
  for (let row = battlefieldStartRow; row <= battlefieldEndRow; row++) {
    for (let col = 0; col < heroSideCols; col++) {
      // Check if position is occupied in next wave formation
      const isOccupied = Object.values(nextWaveFormation).some(
        pos => pos.row === row && pos.col === col
      );

      if (!isOccupied) {
        // Empty tile that can accept hero drops
        occupants.push({
          id: `grid-tile-${row}-${col}`,
          type: GridOccupantType.Button,
          position: { row, col },
          label: '',
          icon: '⬚',
          variant: 'secondary',
          disabled: false,
          description: 'Drop a hero here to position them',
          onClick: () => {},
          animationDelay: 0.2 + row * 0.02 + col * 0.01,
          // Drop handler for heroes
          onDrop: (heroId: string) => {
            // User is directly setting the final display position
            console.log(`[BattleFormation] Dropping hero ${heroId} at final position (${row},${col})`);
            console.log('[BattleFormation] Drop handler called:', {
              heroId,
              targetRow: row,
              targetCol: col,
              windowDraggedId: (window as any).__draggedHeroId
            });
            console.log('[BattleFormation] About to call onHeroPositionChange with:', { heroId, row, col });
            onHeroPositionChange(heroId, row, col);
            console.log('[BattleFormation] onHeroPositionChange call completed');
          },
        });
      }
    }
  }

  // Add positioned heroes at their next wave positions
  console.log('[BattleFormation] === Positioning Heroes in Layout ===');
  battleHeroes.forEach((hero) => {
    const position = nextWaveFormation[hero.instanceId];
    console.log(`[BattleFormation] Hero ${hero.name} (${hero.instanceId}) - position from formation:`, position);
    if (!position) {
      // Hero not positioned yet, show in staging area
      console.log(`[BattleFormation] No position found for ${hero.name}, moving to staging area`);
      return;
    }

    // Make sure position is within hero side bounds
    if (position.row >= battlefieldStartRow &&
        position.row <= battlefieldEndRow &&
        position.col >= 0 &&
        position.col < heroSideCols) {
      console.log(`[BattleFormation] ✅ Adding ${hero.name} to grid at position (${position.row},${position.col})`);
      occupants.push({
        id: `hero-${hero.instanceId}`,
        type: GridOccupantType.Hero,
        position: position,
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.hp,
        maxHp: hero.currentStats.maxHp,
        level: hero.level,
        heroClass: hero.class,
        animationDelay: 0.3,
        // Make hero draggable to reposition
        draggable: true,
        heroInstanceId: hero.instanceId,
        onDragStart: () => {
          (window as any).__draggedHeroId = hero.instanceId;
          (window as any).__draggedFromFormation = true;
          console.log(`[BattleFormation] Started dragging hero ${hero.name} from position (${position.row},${position.col})`);
          console.log('[BattleFormation] Drag started - window vars set:', {
            draggedHeroId: (window as any).__draggedHeroId,
            draggedFromFormation: (window as any).__draggedFromFormation
          });
        },
        // Allow clicking to remove from formation
        onClick: () => {
          console.log(`[BattleFormation] Removing hero ${hero.name} from formation`);
          onHeroRemove(hero.instanceId);
        },
        // Accept item drops for equipping
        onItemDrop: (itemId: string) => {
          // Check if it's a consumable or equipment
          const item = inventory.find(i => i.instanceId === itemId);
          console.log('[BattleFormation] Item dropped on hero:', { itemId, item, heroId: hero.instanceId });
          if (item) {
            // Check multiple ways to identify consumables
            const isConsumable = item.type === 'consumable' ||
                                 item.category === 4 || // ItemCategory.Consumable = 4
                                 item.consumable === true ||
                                 item.slot === 'consumable';

            if (isConsumable) {
              console.log('[BattleFormation] Using consumable on hero');
              onUseConsumable(itemId, hero.instanceId);
            } else {
              console.log('[BattleFormation] Equipping item on hero');
              onEquipItem(itemId, hero.instanceId);
            }
          }
        },
      });
    } else {
      console.log(`[BattleFormation] ❌ ${hero.name} position (${position.row},${position.col}) is out of bounds. Bounds: rows ${battlefieldStartRow}-${battlefieldEndRow}, cols 0-${heroSideCols-1}`);
    }
  });
  console.log('[BattleFormation] === End Hero Positioning ===');

  // Available heroes section (row 7) - All roster heroes not positioned
  occupants.push({
    id: 'available-heroes-label',
    type: GridOccupantType.Decoration,
    position: { row: 7, col: 0 },
    text: 'Available Heroes (drag to deploy):',
    style: 'subtitle',
    animationDelay: 0.4,
  });

  // Only show heroes from initial battle team (not the entire roster)
  let availableIndex = 0;
  allHeroes.forEach((hero) => {
    // Only show heroes that were part of the initial battle team
    if (!initialBattleTeam.includes(hero.instanceId)) {
      return; // Skip heroes not in initial team
    }

    const isPositioned = nextWaveFormation[hero.instanceId] !== undefined;

    if (!isPositioned && availableIndex < 8) {
      occupants.push({
        id: `available-hero-${hero.instanceId}`,
        type: GridOccupantType.Hero,
        position: { row: 7, col: availableIndex },
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.hp,
        maxHp: hero.currentStats.maxHp,
        level: hero.level,
        heroClass: hero.class,
        animationDelay: 0.45 + availableIndex * 0.05,
        // Make draggable
        draggable: true,
        heroInstanceId: hero.instanceId,
        onDragStart: () => {
          (window as any).__draggedHeroId = hero.instanceId;
          (window as any).__draggedFromFormation = false;
          console.log(`[BattleFormation] Started dragging available hero ${hero.name}`);
          console.log('[BattleFormation] Available hero drag started:', {
            draggedHeroId: (window as any).__draggedHeroId,
            draggedFromFormation: (window as any).__draggedFromFormation
          });
        },
        // Accept item drops for equipping
        onItemDrop: (itemId: string) => {
          const item = inventory.find(i => i.instanceId === itemId);
          if (item) {
            const isConsumable = item.type === 'consumable' ||
                                 item.category === 4 ||
                                 item.consumable === true ||
                                 item.slot === 'consumable';

            if (isConsumable) {
              console.log('[BattleFormation] Using consumable on available hero');
              onUseConsumable(itemId, hero.instanceId);
            } else {
              console.log('[BattleFormation] Equipping item on available hero');
              onEquipItem(itemId, hero.instanceId);
            }
          }
        },
      });
      availableIndex++;
    }
  });

  // Enemy preview area label
  occupants.push({
    id: 'enemy-preview-label',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 5 },
    width: 3,
    text: 'Next Wave Preview',
    style: 'subtitle',
    animationDelay: 0.25,
  });

  // Instructions
  occupants.push({
    id: 'instructions',
    type: GridOccupantType.Decoration,
    position: { row: 6, col: 5 },
    width: 3,
    text: 'Drag items from sidebar',
    style: 'normal',
    animationDelay: 0.5,
  });

  return occupants;
}
import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType, Stage } from '@/types/progression.types';
import { Hero } from '@/types/core.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';
import { ENEMY_TEMPLATES } from '@/data/units';

export interface HeroFormation {
  [heroId: string]: { row: number; col: number };
}

export function createFormationPreBattleLayout(
  stage: Stage,
  playerGems: number,
  preBattleTeam: string[],
  availableHeroes: Hero[], // This is actually the full roster
  heroFormation: HeroFormation,
  _navigate: (screen: ScreenType) => void,
  onHeroPositionChange: (heroId: string, row: number, col: number) => void,
  onHeroRemove: (heroId: string) => void,
  onEquipItem: (itemId: string, heroId: string) => void,
  onReady: () => void,
  gridRows: number = 8,
  gridCols: number = 8
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

  // Title bar
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Back',
    icon: generateButtonIcon('back'),
    variant: 'secondary',
    description: 'Return to the location map',
    onClick: () => navigate(ScreenType.LocationMap),
    animationDelay: 0.1,
  });

  occupants.push({
    id: 'stage-title',
    type: GridOccupantType.StatusPanel,
    position: { row: 0, col: 2 },
    width: 4,
    title: `Stage ${stage.id}: ${stage.name}`,
    content: 'Position your heroes on the battlefield',
    variant: 'info',
    animationDelay: 0.15,
  });

  occupants.push({
    id: 'resource-gems',
    type: GridOccupantType.Resource,
    position: { row: 0, col: 7 },
    resourceType: 'gems',
    amount: playerGems,
    icon: '💎',
    animationDelay: 0.2,
  });

  // Battlefield grid (rows 1-6 for 8x8 grid)
  // Split the battlefield: left side for heroes, right side for enemies
  const battlefieldStartRow = 1;
  const battlefieldEndRow = 6;
  const heroSideCols = 4; // Heroes can be placed in columns 0-3
  const enemySideCols = 4; // Enemies shown in columns 4-7

  // Add grid background tiles for hero side
  for (let row = battlefieldStartRow; row <= battlefieldEndRow; row++) {
    for (let col = 0; col < heroSideCols; col++) {
      const isOccupied = Object.values(heroFormation).some(
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
            console.log(`[Formation] Dropping hero ${heroId} at position ${row},${col}`);
            onHeroPositionChange(heroId, row, col);
          },
        });
      }
    }
  }

  // Add positioned heroes (any hero with a position in formation)
  Object.entries(heroFormation).forEach(([heroId, position]) => {
    const hero = availableHeroes.find(h => h.instanceId === heroId);
    if (!hero) return;

    // Make sure position is within hero side bounds
    if (position.row >= battlefieldStartRow &&
        position.row <= battlefieldEndRow &&
        position.col >= 0 &&
        position.col < heroSideCols) {
      occupants.push({
        id: `hero-${heroId}`,
        type: GridOccupantType.Hero,
        position: position,
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.maxHp,
        maxHp: hero.currentStats.maxHp,
        level: hero.level,
        heroClass: hero.class,
        animationDelay: 0.3,
        // Make hero draggable to reposition
        draggable: true,
        heroInstanceId: heroId,
        onDragStart: () => {
          (window as any).__draggedHeroId = heroId;
          (window as any).__draggedFromFormation = true;
          console.log(`[Formation] Started dragging hero ${hero.name}`);
        },
        // Allow clicking to remove from formation
        onClick: () => {
          console.log(`[Formation] Removing hero ${hero.name} from formation`);
          onHeroRemove(heroId);
        },
        // Accept item drops for equipping
        onItemDrop: (itemId: string) => {
          console.log(`[Formation] Equipping item ${itemId} on hero ${hero.name}`);
          onEquipItem(itemId, heroId);
        },
      });
    }
  });

  // Show enemies on the right side
  const enemyList = Array.isArray(stage.enemies[0])
    ? stage.enemies[0] // Multi-wave, show first wave
    : stage.enemies; // Single wave

  enemyList.forEach((enemyType, index) => {
    if (typeof enemyType !== 'string') return;

    const template = ENEMY_TEMPLATES[enemyType];
    if (template) {
      // Position enemies on the right side in a formation
      const enemyRow = battlefieldStartRow + 1 + Math.floor(index / 2);
      const enemyCol = enemySideCols + 1 + (index % 2) * 2;

      if (enemyRow <= battlefieldEndRow && enemyCol < gridCols) {
        occupants.push({
          id: `enemy-preview-${index}`,
          type: GridOccupantType.Enemy,
          position: { row: enemyRow, col: enemyCol },
          name: template.name,
          spritePath: template.spritePath,
          hp: template.baseStats.hp,
          maxHp: template.baseStats.hp,
          animationDelay: 0.35 + index * 0.05,
        });
      }
    }
  });

  // Divider line between hero and enemy sides
  occupants.push({
    id: 'battlefield-divider',
    type: GridOccupantType.Decoration,
    position: { row: battlefieldStartRow, col: heroSideCols },
    height: battlefieldEndRow - battlefieldStartRow + 1,
    text: '|',
    style: 'divider',
    animationDelay: 0.25,
  });

  // Available heroes section (row 7)
  occupants.push({
    id: 'available-heroes-label',
    type: GridOccupantType.Decoration,
    position: { row: 7, col: 0 },
    text: 'Available Heroes (drag to position):',
    style: 'subtitle',
    animationDelay: 0.4,
  });

  // Show all heroes not yet positioned
  let availableIndex = 0;
  availableHeroes.forEach((hero) => {
    // Check if hero is positioned
    const isPositioned = heroFormation[hero.instanceId] !== undefined;

    if (!isPositioned && availableIndex < 8) {
      occupants.push({
        id: `available-hero-${hero.instanceId}`,
        type: GridOccupantType.Hero,
        position: { row: 7, col: availableIndex },
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.maxHp,
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
          console.log(`[Formation] Started dragging available hero ${hero.name}`);
        },
        // Accept item drops for equipping
        onItemDrop: (itemId: string) => {
          console.log(`[Formation] Equipping item ${itemId} on available hero ${hero.name}`);
          onEquipItem(itemId, hero.instanceId);
        },
      });
      availableIndex++;
    }
  });

  // Start battle button
  const positionedHeroes = Object.keys(heroFormation).length;
  if (positionedHeroes > 0) {
    occupants.push({
      id: 'btn-start-battle',
      type: GridOccupantType.Button,
      position: { row: 6, col: 7 },
      label: 'Start',
      icon: ICON_PATHS.sword,
      variant: 'danger',
      description: `Begin combat with ${positionedHeroes} hero${positionedHeroes === 1 ? '' : 'es'}`,
      onClick: onReady,
      animationDelay: 0.5,
    });
  }

  return occupants;
}
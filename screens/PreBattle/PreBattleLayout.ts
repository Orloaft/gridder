import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType, Stage } from '@/types/progression.types';
import { Hero } from '@/types/core.types';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { ICON_PATHS } from '@/utils/iconPaths';
import { ENEMY_TEMPLATES } from '@/data/units';

export function createPreBattleLayout(
  stage: Stage,
  playerGold: number,
  playerGems: number,
  preBattleTeam: string[],
  availableHeroes: Hero[],
  _navigate: (screen: ScreenType) => void,
  onHeroSelect: (heroId: string) => void,
  onHeroRemove: (heroId: string) => void,
  onReady: () => void,
  onSetTeam?: (team: string[]) => void
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

  // Row 0: Back button, Stage name, Resources
  occupants.push({
    id: 'btn-back',
    type: GridOccupantType.Button,
    position: { row: 0, col: 0 },
    label: 'Back',
    icon: generateButtonIcon('back'),
    variant: 'secondary',
    onClick: () => navigate(ScreenType.CampaignMap),
    animationDelay: 0.1,
  });

  occupants.push({
    id: 'stage-title',
    type: GridOccupantType.StatusPanel,
    position: { row: 0, col: 1 },
    title: `Stage ${stage.id}`,
    content: stage.name,
    variant: 'info',
    animationDelay: 0.15,
  });

  occupants.push({
    id: 'resource-gold',
    type: GridOccupantType.Resource,
    position: { row: 0, col: 6 },
    resourceType: 'gold',
    amount: playerGold,
    animationDelay: 0.2,
  });

  occupants.push({
    id: 'resource-gems',
    type: GridOccupantType.Resource,
    position: { row: 0, col: 7 },
    resourceType: 'gems',
    amount: playerGems,
    animationDelay: 0.25,
  });

  // Row 1: Enemy Preview Label
  occupants.push({
    id: 'enemy-label',
    type: GridOccupantType.Decoration,
    position: { row: 1, col: 0 },
    text: 'Enemies:',
    style: 'subtitle',
    animationDelay: 0.3,
  });

  // Row 2-3: Enemy preview (show enemy cards)
  stage.enemies.forEach((enemyType, index) => {
    const template = ENEMY_TEMPLATES[enemyType];
    if (template) {
      const row = Math.floor(index / 4) + 2; // Start at row 2
      const col = index % 4;

      occupants.push({
        id: `enemy-preview-${index}`,
        type: GridOccupantType.Enemy,
        position: { row, col },
        name: template.name,
        spritePath: template.spritePath,
        hp: template.baseStats.hp,
        maxHp: template.baseStats.maxHp,
        animationDelay: 0.35 + index * 0.05,
      });
    }
  });

  // Row 4: Team Label
  const filledSlots = preBattleTeam.filter(id => id && id !== '').length;
  occupants.push({
    id: 'team-label',
    type: GridOccupantType.Decoration,
    position: { row: 4, col: 0 },
    text: `Your Team (${filledSlots}/${stage.playerSlots})`,
    style: 'subtitle',
    animationDelay: 0.5,
  });

  // Row 5: Team slots (empty or filled) - now with drag-and-drop
  for (let i = 0; i < stage.playerSlots; i++) {
    const heroId = preBattleTeam[i];
    const hero = heroId ? availableHeroes.find((h) => h.instanceId === heroId) : undefined;

    if (hero && heroId) {
      // Show hero card (draggable)
      occupants.push({
        id: `team-slot-${i}`,
        type: GridOccupantType.Hero,
        position: { row: 5, col: i },
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.hp,
        maxHp: hero.currentStats.maxHp,
        level: hero.level,
        heroClass: hero.class,
        animationDelay: 0.55 + i * 0.05,
        // Drag-and-drop support
        draggable: true,
        heroInstanceId: heroId,
        onDragStart: () => {
          // Store which hero is being dragged
          (window as any).__draggedHeroId = heroId;
          (window as any).__draggedFromTeam = true;
        },
        onDrop: (droppedHeroId: string) => {
          if (!onSetTeam) return;

          // Get whether dragged from team or roster
          const draggedFromTeam = (window as any).__draggedFromTeam;
          // Ensure team array is big enough to hold all slots
          const newTeam = Array(stage.playerSlots).fill('').map((_, idx) => preBattleTeam[idx] || '');

          if (draggedFromTeam) {
            // Swapping/rearranging within team
            const draggedIndex = newTeam.indexOf(droppedHeroId);
            if (draggedIndex !== -1 && draggedIndex !== i) {
              // Swap the two heroes
              [newTeam[i], newTeam[draggedIndex]] = [newTeam[draggedIndex], newTeam[i]];
              onSetTeam(newTeam);
            }
          } else {
            // Replacing hero from roster - remove old hero and add new one
            newTeam[i] = droppedHeroId;
            // The old hero goes back to the available pool (no need to track it)
            onSetTeam(newTeam);
          }
        },
      });
    } else {
      // Show empty slot (drop target)
      const slotIndex = i;
      occupants.push({
        id: `team-slot-${i}`,
        type: GridOccupantType.Button,
        position: { row: 5, col: i },
        label: 'Drop Here',
        icon: '➕',
        variant: 'secondary',
        disabled: false,
        onClick: () => {},
        animationDelay: 0.55 + i * 0.05,
        // Drop target - insert at specific position
        onDrop: (heroId: string) => {
          if (!onSetTeam) {
            // Fallback to old behavior
            onHeroSelect(heroId);
            return;
          }

          const draggedFromTeam = (window as any).__draggedFromTeam;
          // Ensure team array is big enough to hold all slots
          const newTeam = Array(stage.playerSlots).fill('').map((_, idx) => preBattleTeam[idx] || '');

          if (draggedFromTeam) {
            // Moving within team - remove from old position
            const oldIndex = newTeam.indexOf(heroId);
            if (oldIndex !== -1) {
              newTeam[oldIndex] = '';
            }
          }

          // Insert at this specific position
          newTeam[slotIndex] = heroId;
          onSetTeam(newTeam);
        },
      });
    }
  }

  // Row 6: Available Heroes Label
  occupants.push({
    id: 'heroes-label',
    type: GridOccupantType.Decoration,
    position: { row: 6, col: 0 },
    text: 'Available Heroes:',
    style: 'subtitle',
    animationDelay: 0.7,
  });

  // Row 7: Available heroes to add (draggable)
  const filledTeamSlots = preBattleTeam.filter(id => id && id !== '');
  const availableToAdd = availableHeroes.filter((h) => !filledTeamSlots.includes(h.instanceId));

  availableToAdd
    .slice(0, 8) // Show up to 8 heroes
    .forEach((hero, index) => {
      occupants.push({
        id: `available-hero-${hero.instanceId}`,
        type: GridOccupantType.Hero,
        position: { row: 7, col: index },
        name: hero.name,
        spritePath: hero.spritePath,
        hp: hero.currentStats.hp,
        maxHp: hero.currentStats.maxHp,
        level: hero.level,
        heroClass: hero.class,
        animationDelay: 0.75 + index * 0.05,
        // Drag-and-drop support
        draggable: true,
        heroInstanceId: hero.instanceId,
        onDragStart: () => {
          (window as any).__draggedHeroId = hero.instanceId;
          (window as any).__draggedFromTeam = false;
        },
        // Double-click to add (alternative to drag)
        onClick: filledSlots < stage.playerSlots ? () => onHeroSelect(hero.instanceId) : undefined,
      });
    });

  // Ready button (if team is valid) - Row 6, col 7 (top right area)
  if (filledSlots > 0) {
    occupants.push({
      id: 'btn-ready',
      type: GridOccupantType.Button,
      position: { row: 6, col: 7 },
      label: 'Start Battle',
      icon: ICON_PATHS.sword,
      variant: 'danger',
      onClick: onReady,
      animationDelay: 0.9,
    });
  }

  return occupants;
}

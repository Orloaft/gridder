import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { BattleState, BattleEventType } from '@/systems/BattleSimulator';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { useGameStore } from '@/store/gameStore';

export function createBattleLayout(
  battleState: BattleState,
  currentEventIndex: number,
  onNextEvent: () => void,
  battleSpeed: number,
  onToggleSpeed: () => void
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];

  // Row 0: Speed button (removed turn counter for cooldown-based system)
  occupants.push({
    id: 'btn-speed',
    type: GridOccupantType.Button,
    position: { row: 0, col: 7 },
    label: `${battleSpeed}x`,
    icon: '⚡',
    variant: 'secondary',
    onClick: onToggleSpeed,
    animationDelay: 0.1,
  });

  // Heroes - use their current positions from battle state
  battleState.heroes.forEach((hero) => {
    if (!hero.isAlive) return; // Don't render dead units

    occupants.push({
      id: `hero-${hero.id}`,
      type: GridOccupantType.Hero,
      position: hero.position,
      heroClass: hero.class || 'Hero',
      name: hero.name,
      level: 1,
      spritePath: hero.spritePath || '🗡️',
      hp: Math.max(0, Math.floor(hero.stats.hp)),
      maxHp: Math.floor(hero.stats.maxHp),
      animationDelay: 0,
      unitId: hero.id, // For animation targeting
      cooldown: hero.cooldown, // Current cooldown (0-100)
      cooldownRate: hero.cooldownRate, // Speed-based cooldown rate
    });
  });

  // Enemies - use their current positions from battle state
  battleState.enemies.forEach((enemy) => {
    if (!enemy.isAlive) return; // Don't render dead units

    occupants.push({
      id: `enemy-${enemy.id}`,
      type: GridOccupantType.Enemy,
      position: enemy.position,
      name: enemy.name,
      spritePath: enemy.spritePath || '👹',
      hp: Math.max(0, Math.floor(enemy.stats.hp)),
      maxHp: Math.floor(enemy.stats.maxHp),
      animationDelay: 0,
      unitId: enemy.id, // For animation targeting
      cooldown: enemy.cooldown, // Current cooldown (0-100)
      cooldownRate: enemy.cooldownRate, // Speed-based cooldown rate
    });
  });

  // Row 7: Current battle event log (show only current event)
  if (currentEventIndex >= 0 && currentEventIndex < battleState.events.length) {
    const event = battleState.events[currentEventIndex];
    let logText = '';

    switch (event.type) {
      case BattleEventType.BattleStart:
        logText = 'Battle Start!';
        break;
      case BattleEventType.Tick:
        // Don't show tick events in log (they're just for cooldown updates)
        logText = '';
        break;
      case BattleEventType.Move:
        logText = `${event.data.unit} moves forward`;
        break;
      case BattleEventType.Attack:
        logText = `${event.data.attacker} attacks ${event.data.target}`;
        break;
      case BattleEventType.Damage:
        logText = `${event.data.target} takes ${event.data.damage} damage`;
        break;
      case BattleEventType.Death:
        logText = `${event.data.unit} defeated!`;
        break;
      case BattleEventType.Victory:
        logText = 'Victory!';
        break;
      case BattleEventType.Defeat:
        logText = 'Defeat...';
        break;
    }

    // Only show log if there's text (skip empty tick events)
    if (logText) {
      occupants.push({
        id: `log-current`,
        type: GridOccupantType.Decoration,
        position: { row: 7, col: 2 },
        text: logText,
        style: 'subtitle',
        animationDelay: 0.4,
      });
    }
  }

  // No manual next button - battle auto-advances

  return occupants;
}

import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { RevealPhase, RevealState, BattleRewards } from '@/systems/RewardRevealManager';

/**
 * Creates grid occupants for the reward reveal screen.
 *
 * In the new overlay-based system, the grid only shows:
 * - Revealed items at their grid positions during ItemReveal phase
 * - Items also shown during Summary phase (they persist on grid)
 *
 * Victory splash, currency counters, and summary card are handled by
 * the RewardRevealOverlay component.
 */
export function createRewardRevealLayout(
  revealState: RevealState,
  rewards: BattleRewards,
  onSkip: () => void,
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];
  const { phase } = revealState;

  // Only show items on grid during ItemReveal and Summary phases
  if (phase === RevealPhase.ItemReveal || phase === RevealPhase.Summary) {
    // Show all revealed items on grid row 5 (cols 0-7)
    const itemCount = Math.min(revealState.revealedItemCount, rewards.items.length);

    for (let i = 0; i < itemCount; i++) {
      const item = rewards.items[i];
      if (i < 8) {
        occupants.push({
          id: `item-${item.id}`,
          type: GridOccupantType.Item,
          position: { row: 5, col: i },
          name: item.name,
          icon: item.icon || '?',
          rarity: item.rarity,
          value: item.value,
          animationDelay: 0,
        });
      }
    }
  }

  return occupants;
}

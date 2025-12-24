import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { RevealPhase, RevealState, BattleRewards } from '@/systems/RewardRevealManager';
import { Particle } from '@/systems/ParticleManager';
import { getRarityColor } from '@/utils/lootGenerator';
import { ICON_PATHS } from '@/utils/iconPaths';

export function createRewardRevealLayout(
  revealState: RevealState,
  rewards: BattleRewards,
  particles: Particle[],
  onSkip: () => void,
  onContinue: () => void,
  _navigate: (screen: ScreenType) => void
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
  const { phase } = revealState;

  // ========================================
  // Phase 0: Victory Banner
  // ========================================

  if (phase === RevealPhase.Victory) {
    // Victory banner spanning across middle
    occupants.push({
      id: 'victory-banner',
      type: GridOccupantType.Decoration,
      position: { row: 3, col: 2 },
      text: '🎉 VICTORY! 🎉',
      style: 'title',
      animationDelay: 0,
    });

    // Flash effect (decorative tiles)
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 8; row++) {
        if ((col + row) % 2 === 0) {
          occupants.push({
            id: `flash-${row}-${col}`,
            type: GridOccupantType.Decoration,
            position: { row, col },
            text: '',
            style: 'flash',
            animationDelay: 0,
          });
        }
      }
    }
  }

  // ========================================
  // Phase 1: Gold Counter Reveal
  // ========================================

  if (phase === RevealPhase.GoldCounter ||
      phase === RevealPhase.GemCounter ||
      phase === RevealPhase.ChestAppear ||
      phase === RevealPhase.ItemReveal ||
      phase === RevealPhase.Summary) {

    // Gold counter (compact - top left)
    occupants.push({
      id: 'gold-counter',
      type: GridOccupantType.Resource,
      position: { row: 1, col: 1 },
      resourceType: 'gold',
      amount: revealState.currentGoldDisplay,
      icon: '🪙',
      animationDelay: 0.1,
    });

    // Coin drop visual (smaller)
    if (phase === RevealPhase.GoldCounter && revealState.currentGoldDisplay < rewards.goldEarned) {
      occupants.push({
        id: 'coin-drop-1',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 1 },
        text: '🪙',
        style: 'icon',
        animationDelay: 0,
      });
    }
  }

  // ========================================
  // Phase 2: Gem Counter Reveal
  // ========================================

  if (phase === RevealPhase.GemCounter ||
      phase === RevealPhase.ChestAppear ||
      phase === RevealPhase.ItemReveal ||
      phase === RevealPhase.Summary) {

    // Gem counter (compact - top right)
    occupants.push({
      id: 'gem-counter',
      type: GridOccupantType.Resource,
      position: { row: 1, col: 6 },
      resourceType: 'gems',
      amount: revealState.currentGemDisplay,
      icon: '💎',
      animationDelay: 0.1,
    });

    // Gem visual (smaller)
    if (phase === RevealPhase.GemCounter && revealState.currentGemDisplay < rewards.gemsEarned) {
      occupants.push({
        id: 'gem-drop-1',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 6 },
        text: '💎',
        style: 'icon',
        animationDelay: 0,
      });
    }
  }

  // ========================================
  // Phase 3: Chest Appear
  // ========================================

  if (phase === RevealPhase.ChestAppear ||
      phase === RevealPhase.ItemReveal ||
      phase === RevealPhase.Summary) {

    // Chest in center
    occupants.push({
      id: 'reward-chest',
      type: GridOccupantType.Decoration,
      position: { row: 3, col: 3 },
      text: '🎁',
      style: 'chest',
      animationDelay: 0,
    });

    // "Opening..." text
    if (phase === RevealPhase.ChestAppear) {
      occupants.push({
        id: 'chest-label',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 3 },
        text: 'Opening...',
        style: 'subtitle',
        animationDelay: 0.3,
      });
    }
  }

  // ========================================
  // Phase 4: Item Reveals
  // ========================================

  if (phase === RevealPhase.ItemReveal || phase === RevealPhase.Summary) {
    // Show revealed items (bottom 2 rows - rows 5-6)
    rewards.items.forEach((item, index) => {
      // Only show first 8 items (fit in one row)
      if (index < 8) {
        // Only show if this item has been revealed
        if (index <= revealState.revealedItemIndex) {
          const col = index % 8;
          const row = 5;

          // Item card with rarity color
          occupants.push({
            id: `item-${item.id}`,
            type: GridOccupantType.Item,
            position: { row, col },
            name: item.name,
            icon: item.icon || '❓',
            rarity: item.rarity,
            animationDelay: 0,
          });

          // Legendary full-screen effect
          if (item.rarity === 'legendary' && index === revealState.revealedItemIndex && phase === RevealPhase.ItemReveal) {
            // Full-screen legendary overlay
            occupants.push({
              id: 'legendary-overlay',
              type: GridOccupantType.Decoration,
              position: { row: 3, col: 2 },
              text: `✨ LEGENDARY ✨\n${item.name}`,
              style: 'legendary',
              animationDelay: 0,
            });
          }
        } else {
          // Slot machine spinning (show ? for unrevealed items)
          const col = index % 8;
          const row = 5;

          occupants.push({
            id: `item-slot-${index}`,
            type: GridOccupantType.Decoration,
            position: { row, col },
            text: '❓',
            style: 'slot-machine',
            animationDelay: 0,
          });
        }
      }
    });

    // If no items, show message
    if (rewards.items.length === 0) {
      occupants.push({
        id: 'no-items',
        type: GridOccupantType.Decoration,
        position: { row: 5, col: 2 },
        text: 'No items this time...',
        style: 'subtitle',
        animationDelay: 0.2,
      });
    }
  }

  // ========================================
  // Phase 5: Summary
  // ========================================

  if (phase === RevealPhase.Summary) {
    // Total value display (compact)
    const totalValue = rewards.goldEarned + (rewards.gemsEarned * 10) +
                       rewards.items.reduce((sum, item) => sum + item.value, 0);

    occupants.push({
      id: 'total-value',
      type: GridOccupantType.StatusPanel,
      position: { row: 6, col: 1 },
      title: 'Total Value',
      content: `${totalValue} gold`,
      variant: 'success',
      animationDelay: 0,
    });

    // Continue button
    occupants.push({
      id: 'btn-continue',
      type: GridOccupantType.Button,
      position: { row: 7, col: 3 },
      label: 'Continue',
      icon: '➡️',
      variant: 'primary',
      onClick: onContinue,
      animationDelay: 0.2,
    });
  }

  // ========================================
  // Particles (All Phases)
  // ========================================

  particles.forEach((particle, index) => {
    // Only render particles that are within grid bounds (8x8)
    const row = Math.floor(particle.position.row);
    const col = Math.floor(particle.position.col);

    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      occupants.push({
        id: particle.id,
        type: GridOccupantType.Decoration,
        position: { row, col },
        text: particle.icon || '✨',
        style: 'particle',
        animationDelay: 0,
      });
    }
  });

  // ========================================
  // Controls (All Phases except Summary)
  // ========================================

  if (phase !== RevealPhase.Summary && phase !== RevealPhase.Complete) {
    // Skip button
    occupants.push({
      id: 'btn-skip',
      type: GridOccupantType.Button,
      position: { row: 0, col: 7 },
      label: 'Skip',
      icon: '⏭️',
      variant: 'secondary',
      onClick: onSkip,
      animationDelay: 0,
    });

    // Fast-forward indicator
    if (revealState.isFastForwarding) {
      occupants.push({
        id: 'ff-indicator',
        type: GridOccupantType.Decoration,
        position: { row: 0, col: 6 },
        text: '⏩',
        style: 'icon',
        animationDelay: 0,
      });
    }
  }

  return occupants;
}

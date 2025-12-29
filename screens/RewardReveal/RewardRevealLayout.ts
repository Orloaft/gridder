import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { ScreenType } from '@/types/progression.types';
import { RevealPhase, RevealState, BattleRewards } from '@/systems/RewardRevealManager';
import { Particle } from '@/systems/ParticleManager';

export function createRewardRevealLayout(
  revealState: RevealState,
  rewards: BattleRewards,
  particles: Particle[],
  onSkip: () => void,
  onContinue: () => void,
  _navigate: (screen: ScreenType) => void
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];
  const { phase } = revealState;

  // ========================================
  // Phase 1: Victory Banner
  // ========================================

  if (phase === RevealPhase.Victory) {
    // Large centered victory banner
    occupants.push({
      id: 'victory-banner',
      type: GridOccupantType.Decoration,
      position: { row: 3, col: 2 },
      text: '🎉 VICTORY! 🎉',
      style: 'title',
      animationDelay: 0,
    });

    // Skip button (always available)
    occupants.push({
      id: 'btn-skip',
      type: GridOccupantType.Button,
      position: { row: 0, col: 7 },
      label: 'Skip',
      icon: '⏭️',
      variant: 'secondary',
      description: 'Skip the reward reveal animation and see all rewards immediately',
      onClick: onSkip,
      animationDelay: 0,
    });
  }

  // ========================================
  // Phase 2: Breakdown - Performance Calculation
  // ========================================

  if (phase === RevealPhase.Breakdown) {
    // Title
    occupants.push({
      id: 'breakdown-title',
      type: GridOccupantType.Decoration,
      position: { row: 0, col: 2 },
      text: 'Performance Breakdown',
      style: 'title',
      animationDelay: 0,
    });

    // Base Gold (appears first at 300ms)
    if (revealState.showBaseGold && rewards.breakdown) {
      occupants.push({
        id: 'base-gold-label',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 0 },
        text: 'Base Reward:',
        style: 'subtitle',
        animationDelay: 0,
      });

      occupants.push({
        id: 'base-gold-value',
        type: GridOccupantType.Resource,
        position: { row: 2, col: 2 },
        resourceType: 'gold',
        amount: rewards.breakdown.baseGold,
        icon: '🪙',
        animationDelay: 0,
      });
    }

    // Wave Multiplier (appears at 900ms)
    if (revealState.showWaveMultiplier && rewards.breakdown) {
      occupants.push({
        id: 'wave-multiplier-label',
        type: GridOccupantType.Decoration,
        position: { row: 3, col: 0 },
        text: `Wave ${rewards.breakdown.wavesCompleted} Bonus:`,
        style: 'subtitle',
        animationDelay: 0,
      });

      occupants.push({
        id: 'wave-multiplier-value',
        type: GridOccupantType.Decoration,
        position: { row: 3, col: 2 },
        text: `×${rewards.breakdown.waveMultiplier.toFixed(1)}`,
        style: 'title',
        animationDelay: 0,
      });
    }

    // Medical Costs (appears at 1500ms if there are casualties)
    if (revealState.showMedicalCosts && rewards.breakdown && rewards.breakdown.casualties > 0) {
      occupants.push({
        id: 'medical-costs-label',
        type: GridOccupantType.Decoration,
        position: { row: 4, col: 0 },
        text: `Medical Costs (${rewards.breakdown.casualties}):`,
        style: 'subtitle',
        animationDelay: 0,
      });

      occupants.push({
        id: 'medical-costs-value',
        type: GridOccupantType.Resource,
        position: { row: 4, col: 2 },
        resourceType: 'gold',
        amount: -rewards.breakdown.medicalCosts,
        icon: '⚕️',
        animationDelay: 0,
      });
    }

    // Final Gold (appears at 2000ms with count-up animation)
    if (revealState.showFinalGold) {
      occupants.push({
        id: 'final-gold-label',
        type: GridOccupantType.Decoration,
        position: { row: 5, col: 0 },
        text: 'Total Gold:',
        style: 'title',
        animationDelay: 0,
      });

      occupants.push({
        id: 'final-gold-value',
        type: GridOccupantType.Resource,
        position: { row: 5, col: 2 },
        resourceType: 'gold',
        amount: revealState.currentGoldDisplay,
        icon: '🪙',
        animationDelay: 0,
      });
    }

    // Gems (parallel animation starting at 500ms)
    if (rewards.gemsEarned > 0 && revealState.currentGemDisplay > 0) {
      occupants.push({
        id: 'gems-label',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 5 },
        text: 'Gems Earned:',
        style: 'subtitle',
        animationDelay: 0,
      });

      occupants.push({
        id: 'gems-value',
        type: GridOccupantType.Resource,
        position: { row: 3, col: 5 },
        resourceType: 'gems',
        amount: revealState.currentGemDisplay,
        icon: '💎',
        animationDelay: 0,
      });
    }

    // Skip button
    occupants.push({
      id: 'btn-skip',
      type: GridOccupantType.Button,
      position: { row: 0, col: 7 },
      label: 'Skip',
      icon: '⏭️',
      variant: 'secondary',
      description: 'Skip the reward reveal animation and see all rewards immediately',
      onClick: onSkip,
      animationDelay: 0,
    });
  }

  // ========================================
  // Phase 3: Gacha Prepare - Machine Appears
  // ========================================

  if (phase === RevealPhase.GachaPrepare) {
    // Title
    occupants.push({
      id: 'gacha-title',
      type: GridOccupantType.Decoration,
      position: { row: 1, col: 2 },
      text: 'Item Rewards',
      style: 'title',
      animationDelay: 0,
    });

    // Gacha machine decoration in center
    occupants.push({
      id: 'gacha-machine',
      type: GridOccupantType.Decoration,
      position: { row: 3, col: 3 },
      text: '🎰',
      style: 'chest',
      animationDelay: 0,
    });

    // Skip button
    occupants.push({
      id: 'btn-skip',
      type: GridOccupantType.Button,
      position: { row: 0, col: 7 },
      label: 'Skip',
      icon: '⏭️',
      variant: 'secondary',
      description: 'Skip the reward reveal animation and see all rewards immediately',
      onClick: onSkip,
      animationDelay: 0,
    });
  }

  // ========================================
  // Phase 4: Gacha Spin - Slot Machine Reveals Items
  // ========================================

  if (phase === RevealPhase.GachaSpin) {
    // Title
    occupants.push({
      id: 'items-title',
      type: GridOccupantType.Decoration,
      position: { row: 3, col: 2 },
      text: 'Items Found!',
      style: 'title',
      animationDelay: 0,
    });

    // Display items in a row (row 5, cols 0-7)
    rewards.items.forEach((item, index) => {
      if (index < 8) {
        if (index <= revealState.revealedItemIndex) {
          // Item has been revealed
          occupants.push({
            id: `item-${item.id}`,
            type: GridOccupantType.Item,
            position: { row: 5, col: index },
            name: item.name,
            icon: item.icon || '❓',
            rarity: item.rarity,
            value: item.value,
            animationDelay: 0,
          });
        } else if (index === revealState.spinningItemIndex && revealState.isSpinning) {
          // Currently spinning this item - show animated placeholder
          occupants.push({
            id: `item-spinning-${index}`,
            type: GridOccupantType.Decoration,
            position: { row: 5, col: index },
            text: '❓',
            style: 'slot-machine',
            animationDelay: 0,
          });
        } else {
          // Not yet revealed - show static placeholder
          occupants.push({
            id: `item-placeholder-${index}`,
            type: GridOccupantType.Decoration,
            position: { row: 5, col: index },
            text: '？',
            style: 'icon',
            animationDelay: 0,
          });
        }
      }
    });

    // Skip button
    occupants.push({
      id: 'btn-skip',
      type: GridOccupantType.Button,
      position: { row: 0, col: 7 },
      label: 'Skip',
      icon: '⏭️',
      variant: 'secondary',
      description: 'Skip the reward reveal animation and see all rewards immediately',
      onClick: onSkip,
      animationDelay: 0,
    });
  }

  // ========================================
  // Phase 5: Summary - Final Display
  // ========================================

  if (phase === RevealPhase.Summary) {
    // Title at top
    occupants.push({
      id: 'rewards-title',
      type: GridOccupantType.Decoration,
      position: { row: 0, col: 2 },
      text: 'Battle Rewards',
      style: 'title',
      animationDelay: 0,
    });

    // Gold display (larger, centered left)
    if (rewards.goldEarned > 0 || revealState.currentGoldDisplay > 0) {
      occupants.push({
        id: 'gold-reward',
        type: GridOccupantType.Resource,
        position: { row: 2, col: 1 },
        resourceType: 'gold',
        amount: revealState.currentGoldDisplay,
        icon: '🪙',
        animationDelay: 0,
      });

      // Label
      occupants.push({
        id: 'gold-label',
        type: GridOccupantType.Decoration,
        position: { row: 1, col: 1 },
        text: 'Gold Earned',
        style: 'subtitle',
        animationDelay: 0,
      });
    }

    // Gems display (larger, centered right)
    if (rewards.gemsEarned > 0 || revealState.currentGemDisplay > 0) {
      occupants.push({
        id: 'gem-reward',
        type: GridOccupantType.Resource,
        position: { row: 2, col: 6 },
        resourceType: 'gems',
        amount: revealState.currentGemDisplay,
        icon: '💎',
        animationDelay: 0,
      });

      // Label
      occupants.push({
        id: 'gem-label',
        type: GridOccupantType.Decoration,
        position: { row: 1, col: 6 },
        text: 'Gems Earned',
        style: 'subtitle',
        animationDelay: 0,
      });
    }

    // Items section
    if (rewards.items.length > 0) {
      // Items label
      occupants.push({
        id: 'items-label',
        type: GridOccupantType.Decoration,
        position: { row: 4, col: 0 },
        text: 'Items:',
        style: 'subtitle',
        animationDelay: 0,
      });

      // Show all revealed items in a single row (up to 8 items)
      rewards.items.forEach((item, index) => {
        if (index < 8 && index <= revealState.revealedItemIndex) {
          occupants.push({
            id: `item-${item.id}`,
            type: GridOccupantType.Item,
            position: { row: 5, col: index },
            name: item.name,
            icon: item.icon || '❓',
            rarity: item.rarity,
            value: item.value,
            animationDelay: 0,
          });
        }
      });
    } else {
      // Show "No items" message
      occupants.push({
        id: 'no-items',
        type: GridOccupantType.Decoration,
        position: { row: 5, col: 2 },
        text: 'No items dropped',
        style: 'subtitle',
        animationDelay: 0,
      });
    }

    // Total value summary
    const totalValue = rewards.goldEarned + (rewards.gemsEarned * 10) +
                       rewards.items.reduce((sum, item) => sum + item.value, 0);

    if (totalValue > 0) {
      occupants.push({
        id: 'total-value',
        type: GridOccupantType.StatusPanel,
        position: { row: 6, col: 2 },
        title: 'Total Value',
        content: `~${totalValue}g`,
        variant: 'success',
        animationDelay: 0,
      });
    }

    // Continue button (large, centered)
    occupants.push({
      id: 'btn-continue',
      type: GridOccupantType.Button,
      position: { row: 7, col: 3 },
      label: 'Continue',
      icon: '➡️',
      variant: 'primary',
      description: 'Collect your rewards and return to the location map to continue your adventure',
      onClick: onContinue,
      animationDelay: 0,
    });
  }

  // ========================================
  // Particles (Disabled - visual clutter)
  // ========================================

  // Particles removed for cleaner presentation

  return occupants;
}

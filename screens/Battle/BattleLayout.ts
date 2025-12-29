import { AnyGridOccupant, GridOccupantType } from '@/types/grid.types';
import { BattleState, BattleEventType } from '@/systems/BattleSimulator';
import { generateButtonIcon } from '@/utils/generatePlaceholder';
import { useGameStore } from '@/store/gameStore';
import { getStageById, getNextUnlockedStage } from '@/data/stages';
import { getLocationByStageId } from '@/data/locations';
import { ScreenType } from '@/types/progression.types';

export function createBattleLayout(
  battleState: BattleState,
  currentEventIndex: number,
  onNextEvent: () => void,
  battleSpeed: number,
  onToggleSpeed: () => void
): AnyGridOccupant[] {
  const occupants: AnyGridOccupant[] = [];

  // Check if battle is finished and was a victory
  const battleFinished = currentEventIndex >= battleState.events.length;
  const isVictory = battleFinished && battleState.winner === 'heroes';

  // Check if we're at a wave transition pause
  const currentEvent = battleState.events[currentEventIndex];
  const isWaveTransition = currentEvent?.type === BattleEventType.WaveComplete;

  console.log('[BattleLayout] Battle state check:', {
    currentEventIndex,
    totalEvents: battleState.events.length,
    battleFinished,
    winner: battleState.winner,
    isVictory,
    isWaveTransition,
    currentEventType: currentEvent?.type,
    firstEvents: battleState.events.slice(0, 3).map(e => e.type),
    currentWave: battleState.currentWave,
    totalWaves: battleState.totalWaves
  });

  // WAVE TRANSITION SCREEN - Show decision UI between waves
  if (isWaveTransition && currentEvent) {
    const state = useGameStore.getState();
    const stage = state.selectedStageId ? getStageById(state.selectedStageId) : null;

    if (stage) {
      const waveData = currentEvent.data;
      const nextWaveIsBoss = waveData.nextWaveNumber === waveData.totalWaves;

      // Title - Wave Group Complete
      const isAfterWaveGroup = waveData.waveNumber % 3 === 0;
      const waveGroupNum = Math.ceil(waveData.waveNumber / 3);
      const totalWaveGroups = Math.ceil((waveData.totalWaves - 1) / 3); // -1 because boss is separate

      occupants.push({
        id: 'wave-complete-title',
        type: GridOccupantType.Decoration,
        position: { row: 1, col: 3 },
        text: isAfterWaveGroup
          ? `Wave Group ${waveGroupNum} Complete!`
          : `Waves ${waveData.waveNumber - 2}-${waveData.waveNumber} Complete!`,
        style: 'title',
        animationDelay: 0.1,
      });

      // Next wave warning - show upcoming wave group or boss
      const nextWaveGroup = Math.ceil(waveData.nextWaveNumber / 3);
      const wavesInNextGroup = nextWaveIsBoss ? 1 : Math.min(3, waveData.totalWaves - waveData.nextWaveNumber);

      occupants.push({
        id: 'next-wave-info',
        type: GridOccupantType.Decoration,
        position: { row: 2, col: 2 },
        text: nextWaveIsBoss
          ? `Next: 💀 BOSS WAVE 💀`
          : `Next: Waves ${waveData.nextWaveNumber}-${Math.min(waveData.nextWaveNumber + 2, waveData.totalWaves - 1)} (Group ${nextWaveGroup}/${totalWaveGroups})`,
        style: 'subtitle',
        animationDelay: 0.3,
      });

      // Calculate current rewards
      const maxWaveReached = battleState.currentWave;
      const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                              maxWaveReached <= 6 ? 1.5 :
                              maxWaveReached <= 9 ? 2.0 :
                              4.0;

      // Calculate medical costs for fainted heroes
      let medicalCosts = 0;
      let faintedCount = 0;
      state.preBattleTeam.forEach(heroId => {
        const battleHero = battleState.heroes.find(h => h.instanceId === heroId);
        if (battleHero && !battleHero.isAlive) {
          faintedCount++;
          medicalCosts += 125; // Average cost
        }
      });

      // Show current retreat rewards
      const baseGold = Math.floor((stage.rewards.gold * 0.5) * goldMultiplier);
      const netGold = Math.max(0, baseGold - medicalCosts);

      occupants.push({
        id: 'retreat-rewards-label',
        type: GridOccupantType.Decoration,
        position: { row: 4, col: 2 },
        text: 'Retreat Rewards:',
        style: 'subtitle',
        animationDelay: 0.5,
      });

      occupants.push({
        id: 'retreat-gold',
        type: GridOccupantType.Decoration,
        position: { row: 5, col: 3 },
        text: `${netGold}g (50%)`,
        spritePath: '/icons/coin.PNG',
        style: 'subtitle',
        animationDelay: 0.6,
      });

      if (faintedCount > 0) {
        occupants.push({
          id: 'medical-warning',
          type: GridOccupantType.Decoration,
          position: { row: 5, col: 5 },
          text: `-${medicalCosts}g medical`,
          icon: '⚕️',
          style: 'subtitle',
          animationDelay: 0.7,
        });
      }

      // Retreat button
      occupants.push({
        id: 'btn-retreat-wave',
        type: GridOccupantType.Button,
        position: { row: 7, col: 2 },
        label: 'Retreat',
        icon: '←',
        variant: 'secondary',
        description: `Retreat from battle with reduced rewards (50% gold, minus medical costs for ${faintedCount} fainted ${faintedCount === 1 ? 'hero' : 'heroes'})`,
        onClick: () => {
          const gameState = useGameStore.getState();
          if (gameState.retreatFromBattle) {
            gameState.retreatFromBattle();
          }
        },
        animationDelay: 0.8,
      });

      // Proceed button
      occupants.push({
        id: 'btn-proceed-wave',
        type: GridOccupantType.Button,
        position: { row: 7, col: 5 },
        label: nextWaveIsBoss ? 'Face Boss' : 'Continue',
        icon: '→',
        variant: 'primary',
        description: nextWaveIsBoss
          ? 'Continue to the final boss wave - defeat it for full rewards and bonus gems!'
          : 'Continue to the next wave of enemies',
        onClick: () => {
          // Resume battle by advancing to next event
          onNextEvent();
        },
        animationDelay: 0.9,
      });

      return occupants; // Return early - don't show normal battle UI
    }
  }

  // NORMAL BATTLE UI - Show during active combat
  // Row 0: Wave progress, Speed button

  // Wave progress indicator
  if (!battleFinished) {
    const waveGroupNum = Math.ceil(battleState.currentWave / 3);
    const totalWaveGroups = Math.ceil((battleState.totalWaves - 1) / 3);
    const isBossWave = battleState.currentWave === battleState.totalWaves;

    occupants.push({
      id: 'wave-progress',
      type: GridOccupantType.Decoration,
      position: { row: 0, col: 0 },
      text: isBossWave
        ? '💀 BOSS WAVE 💀'
        : `Wave ${battleState.currentWave}/${battleState.totalWaves - 1} (Group ${waveGroupNum}/${totalWaveGroups})`,
      style: 'subtitle',
      animationDelay: 0.05,
    });
  }

  occupants.push({
    id: 'btn-speed',
    type: GridOccupantType.Button,
    position: { row: 0, col: 7 },
    label: `${battleSpeed}x`,
    icon: '⚡',
    variant: 'secondary',
    description: 'Toggle battle speed between 1x, 2x, and 4x to watch combat faster or slower',
    onClick: onToggleSpeed,
    animationDelay: 0.1,
  });

  // Note: Retreat button removed - retreat decisions are now made during wave transitions

  // Heroes - use their current positions from battle state
  battleState.heroes.forEach((hero, index) => {
    if (!hero.isAlive) return; // Don't render dead units

    // Debug first hero position
    if (index === 0 && currentEventIndex < 5) {
      console.log(`[BattleLayout] Creating hero occupant:`, {
        name: hero.name,
        id: hero.id,
        originalPosition: hero.position,
        occupantPosition: hero.position
      });
    }

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
  // Only render enemies whose wave has spawned (prevents rendering off-screen units)
  const aliveEnemies = battleState.enemies.filter(e => e.isAlive);
  const spawnedEnemies = aliveEnemies.filter(e => !e.wave || e.wave <= battleState.currentWave);

  console.log(`[BattleLayout] Rendering enemies:`, {
    currentWave: battleState.currentWave,
    totalWaves: battleState.totalWaves,
    totalAliveEnemies: aliveEnemies.length,
    spawnedEnemies: spawnedEnemies.length,
    enemyDetails: aliveEnemies.map(e => ({ name: e.name, wave: e.wave, spawned: !e.wave || e.wave <= battleState.currentWave, pos: e.position }))
  });

  battleState.enemies.forEach((enemy) => {
    if (!enemy.isAlive) return; // Don't render dead units

    // Check if this enemy's wave has spawned yet
    const hasSpawned = !enemy.wave || enemy.wave <= battleState.currentWave;

    // CRITICAL: Only render enemies that have spawned
    // Unspawned enemies are at col: 8 (off-screen) and shouldn't be visible yet
    if (!hasSpawned) {
      console.log(`[BattleLayout] Skipping unspawned enemy:`, { name: enemy.name, wave: enemy.wave, currentWave: battleState.currentWave, pos: enemy.position });
      return;
    }

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
      case BattleEventType.WaveStart:
        // Check if this is the boss wave (last wave)
        const isBossWave = event.data.waveNumber === event.data.totalWaves;
        logText = isBossWave
          ? `🔥 BOSS WAVE ${event.data.waveNumber}/${event.data.totalWaves}! 🔥`
          : `Wave ${event.data.waveNumber}/${event.data.totalWaves}!`;
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

  // Victory Rewards Display
  if (isVictory) {
    const state = useGameStore.getState();
    const stage = state.selectedStageId ? getStageById(state.selectedStageId) : null;

    if (stage) {
      // Victory title - centered at top
      occupants.push({
        id: 'victory-title',
        type: GridOccupantType.Decoration,
        position: { row: 1, col: 3 },
        text: 'VICTORY!',
        style: 'title',
        animationDelay: 0.2,
      });

      // Calculate medical costs for fainted heroes (same logic as gameStore)
      let medicalCosts = 0;
      let faintedCount = 0;
      state.preBattleTeam.forEach(heroId => {
        const battleHero = battleState.heroes.find(h => h.instanceId === heroId);
        if (battleHero && !battleHero.isAlive) {
          faintedCount++;
          medicalCosts += 125; // Average of 100-150g (use mid-point for display)
        }
      });

      // Calculate gold multiplier based on max wave reached
      const maxWaveReached = battleState.currentWave;
      const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                              maxWaveReached <= 6 ? 1.5 :
                              maxWaveReached <= 9 ? 2.0 :
                              4.0; // Wave 10+

      // Row 3: Primary rewards (Gold, Gems, XP)
      let row3Col = 2; // Start more centered

      // Gold reward tile (show net gold after multiplier and medical costs)
      const baseGold = Math.floor(stage.rewards.gold * goldMultiplier);
      const netGold = Math.max(0, baseGold - medicalCosts);
      let goldText = `+${netGold}`;
      if (goldMultiplier > 1.0 && medicalCosts > 0) {
        goldText = `+${netGold} (${goldMultiplier}x, -${medicalCosts})`;
      } else if (goldMultiplier > 1.0) {
        goldText = `+${netGold} (${goldMultiplier}x)`;
      } else if (medicalCosts > 0) {
        goldText = `+${netGold} (-${medicalCosts})`;
      }
      occupants.push({
        id: 'reward-gold',
        type: GridOccupantType.Decoration,
        position: { row: 3, col: row3Col },
        text: goldText,
        spritePath: '/icons/coin.PNG',
        style: 'subtitle',
        animationDelay: 0.4,
      });
      row3Col++;

      // XP reward tile
      const xpPerHero = Math.floor(stage.rewards.experience / state.preBattleTeam.length);
      occupants.push({
        id: 'reward-xp',
        type: GridOccupantType.Decoration,
        position: { row: 3, col: row3Col },
        text: `+${xpPerHero}`,
        spritePath: '/icons/orb.PNG',
        style: 'subtitle',
        animationDelay: 0.6,
      });
      row3Col++;

      // Gems reward tile (if boss stage)
      if (stage.rewards.gems && stage.rewards.gems > 0) {
        occupants.push({
          id: 'reward-gems',
          type: GridOccupantType.Decoration,
          position: { row: 3, col: row3Col },
          text: `+${stage.rewards.gems}`,
          icon: '💎',
          style: 'subtitle',
          animationDelay: 0.8,
        });
        row3Col++;
      }

      // Row 5: Item rewards (show last 4 items added to inventory)
      const recentItems = state.inventory.slice(-4);
      if (recentItems.length > 0) {
        let row5Col = Math.max(1, 4 - Math.floor(recentItems.length / 2)); // Center items

        recentItems.forEach((item, index) => {
          if (row5Col < 7) { // Don't overflow the grid
            occupants.push({
              id: `reward-item-${index}`,
              type: GridOccupantType.Decoration,
              position: { row: 5, col: row5Col },
              text: item.name,
              icon: item.icon || '📦',
              style: 'subtitle',
              animationDelay: 1.0 + (index * 0.15),
            });
            row5Col++;
          }
        });
      }

      // Continue button - always returns to location map (since each location is one mission)
      occupants.push({
        id: 'btn-next',
        type: GridOccupantType.Button,
        position: { row: 7, col: 3 },
        label: 'Continue',
        icon: '→',
        variant: 'primary',
        description: 'Collect your battle rewards and return to the location map to select your next mission',
        onClick: () => {
          // Mission completed - return to location map
          useGameStore.setState({
            selectedStageId: null,
            selectedLocationId: null,
            currentBattle: null,
            battleEventIndex: 0,
            battleSpeed: 1,
          });

          // Switch back to main menu music
          const { audioManager } = require('@/utils/audioManager');
          audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 0.5);

          // Use grid transition to navigate to location map
          if ((window as any).__gridNavigate) {
            (window as any).__gridNavigate(ScreenType.LocationMap);
          } else {
            const state = useGameStore.getState();
            state.navigate(ScreenType.LocationMap);
          }
        },
        animationDelay: 1.2,
      });
    }
  }

  return occupants;
}

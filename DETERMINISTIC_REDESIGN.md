# Deterministic Battle System Redesign

## Goal
Create a deterministic battle system that is a perfect drop-in replacement for the original system while providing:
- Single source of truth for positions and state
- No race conditions
- Perfect animation synchronization
- Full compatibility with all existing systems (doomsday, auto-advance, position manager, etc.)

## Key Principle: Event Stream Compatibility

The original system works by:
1. Generating a complete list of BattleEvents
2. Auto-advance system steps through events one by one
3. Each event triggers animations via useBattleAnimations hook
4. UI updates based on event processing

The deterministic system MUST:
1. Generate the EXACT same BattleEvent structure
2. Work with the existing auto-advance system
3. Trigger animations through the same pathway
4. Update state in the same way

## Architecture

### Phase 1: Simulation
```typescript
// Run complete battle simulation
const events = deterministicSimulator.simulate(heroes, enemies);
// Returns: BattleEvent[] exactly like original system
```

### Phase 2: Playback
Instead of custom animation player, use the EXISTING event processing:
- Set battleState with pre-computed events
- Let auto-advance system handle timing
- Let useBattleAnimations hook handle animations
- Everything else works as before

## Key Differences from Failed Attempt

### What Went Wrong:
1. Created custom animation player instead of using existing system
2. Bypassed auto-advance and event processing
3. Different event structure broke compatibility
4. Tried to animate before DOM was ready

### Correct Approach:
1. Generate standard BattleEvent array
2. Use existing advanceBattleEvent flow
3. Let existing hooks handle animations
4. Maintain exact same timing and flow

## Implementation Plan

### 1. Update DeterministicBattleSimulator
```typescript
class DeterministicBattleSimulator {
  simulate(heroes: Hero[], enemies: Enemy[]): BattleState {
    // Returns EXACT same structure as original BattleSimulator
    return {
      tick: finalTick,
      heroes: processedHeroes,
      enemies: processedEnemies,
      events: generatedEvents, // Standard BattleEvent[]
      winner: determineWinner(),
      currentWave: currentWave,
      totalWaves: totalWaves,
      enemyWaves: remainingWaves
    };
  }
}
```

### 2. Integration Points

The deterministic system integrates at ONE point only:
```typescript
startBattle: () => {
  if (useDeterministicBattle) {
    // Use deterministic simulator
    const simulator = new DeterministicBattleSimulator();
    const battleState = simulator.simulate(heroes, enemies);
  } else {
    // Use original simulator
    const simulator = new BattleSimulator(heroes, enemies);
    const battleState = simulator.simulate();
  }

  // Everything after this is IDENTICAL
  set({ currentBattle: battleState, battleEventIndex: 0 });
  navigate(ScreenType.Battle);
}
```

### 3. Event Generation

Generate events in the exact format expected:
```typescript
events.push({
  type: BattleEventType.Move,
  tick: currentTick,
  data: {
    unit: unit.name,
    unitId: unit.id,
    from: oldPosition,
    to: newPosition
  }
});
```

## Benefits

1. **Full Compatibility**: Works with ALL existing systems
2. **No Breaking Changes**: Drop-in replacement
3. **Single Source of Truth**: Pre-computed state eliminates race conditions
4. **Predictable**: Can replay battles, preview outcomes
5. **Testable**: Can verify battle logic without UI

## Testing Strategy

1. Generate events from both simulators for same input
2. Compare event streams - should be functionally identical
3. Verify all hooks and systems work unchanged
4. Test doomsday counter progression
5. Test position manager integration
6. Test animation timing

## Success Criteria

✅ Battle plays exactly like original system
✅ All animations work through existing hooks
✅ Auto-advance works unchanged
✅ Doomsday system works correctly
✅ Position manager works if enabled
✅ No custom animation code needed
✅ Single point of integration
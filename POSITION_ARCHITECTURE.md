# Clean Position Management Architecture

## Core Principles

1. **Single Source of Truth**: PositionManager is the ONLY authoritative source for positions
2. **Immutable State Transitions**: Position changes are atomic and cannot be partially applied
3. **Animation Lock System**: No position updates while animations are in progress
4. **Event-Driven Updates**: All position changes emit events that drive UI updates
5. **Testability**: Pure functions with no side effects for core logic

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 BattleSimulator                  │
│  (Game Logic - Determines WHAT should happen)   │
└─────────────────┬───────────────────────────────┘
                  │ Commands
                  ▼
┌─────────────────────────────────────────────────┐
│              PositionController                  │
│  (Orchestrator - Manages HOW it happens)        │
│  - Validates moves                               │
│  - Queues animations                             │
│  - Ensures consistency                           │
└─────────────────┬───────────────────────────────┘
                  │ State Updates
                  ▼
┌─────────────────────────────────────────────────┐
│               PositionStore                      │
│  (Single Source of Truth - Current positions)    │
│  - Immutable position map                        │
│  - Position reservations                         │
│  - Animation locks                               │
└─────────────────┬───────────────────────────────┘
                  │ Events
                  ▼
┌─────────────────────────────────────────────────┐
│             UI Components                        │
│  (Presentation - Shows current state)            │
│  - React components                              │
│  - GSAP animations                               │
└─────────────────────────────────────────────────┘
```

## Implementation Design

### 1. PositionStore (Single Source of Truth)

```typescript
interface Position {
  row: number;
  col: number;
}

interface UnitPosition {
  unitId: string;
  position: Position;
  isMoving: boolean;
  moveId?: string; // Current move transaction
}

class PositionStore {
  private positions: Map<string, Position> = new Map();
  private occupancy: Map<string, string> = new Map(); // "row,col" -> unitId
  private moveLocks: Set<string> = new Set(); // unitIds currently moving
  private listeners: Set<(event: PositionEvent) => void> = new Set();

  // Pure functions for queries
  getPosition(unitId: string): Position | null
  isOccupied(position: Position): boolean
  getOccupant(position: Position): string | null
  canMoveTo(unitId: string, position: Position): boolean

  // Atomic state transitions
  initializeUnit(unitId: string, position: Position): boolean
  beginMove(unitId: string, to: Position): string | null // Returns moveId
  commitMove(moveId: string): boolean
  rollbackMove(moveId: string): boolean
  removeUnit(unitId: string): boolean

  // Event system
  subscribe(listener: (event: PositionEvent) => void): void
  unsubscribe(listener: (event: PositionEvent) => void): void
  private emit(event: PositionEvent): void
}
```

### 2. PositionController (Orchestrator)

```typescript
class PositionController {
  private store: PositionStore;
  private animationQueue: AnimationQueue;
  private battleSimulator: BattleSimulator;

  // High-level operations
  async moveUnit(unitId: string, to: Position): Promise<boolean> {
    // 1. Validate with store
    if (!this.store.canMoveTo(unitId, to)) {
      return false;
    }

    // 2. Begin move transaction
    const moveId = this.store.beginMove(unitId, to);
    if (!moveId) return false;

    // 3. Queue animation
    try {
      await this.animationQueue.enqueue({
        type: 'move',
        unitId,
        from: this.store.getPosition(unitId)!,
        to,
        moveId
      });

      // 4. Commit move after animation
      this.store.commitMove(moveId);
      return true;
    } catch (error) {
      // 5. Rollback on failure
      this.store.rollbackMove(moveId);
      return false;
    }
  }

  // Wave transitions
  async transitionWave(scroll: number, newEnemies: Enemy[]): Promise<void> {
    // Batch all position updates
    const updates: PositionUpdate[] = [];

    // Calculate all new positions first
    for (const unit of this.getAllUnits()) {
      const newPos = this.calculateScrolledPosition(unit, scroll);
      updates.push({ unitId: unit.id, position: newPos });
    }

    // Apply all updates atomically
    await this.store.batchUpdate(updates);

    // Then spawn new enemies
    for (const enemy of newEnemies) {
      await this.spawnUnit(enemy);
    }
  }
}
```

### 3. AnimationQueue (Visual Updates)

```typescript
interface AnimationTask {
  type: 'move' | 'attack' | 'death' | 'spawn';
  unitId: string;
  from?: Position;
  to?: Position;
  moveId?: string;
}

class AnimationQueue {
  private queue: AnimationTask[] = [];
  private isProcessing: boolean = false;

  async enqueue(task: AnimationTask): Promise<void> {
    this.queue.push(task);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await this.executeAnimation(task);
    }

    this.isProcessing = false;
  }

  private async executeAnimation(task: AnimationTask): Promise<void> {
    const element = document.querySelector(`[data-unit-id="${task.unitId}"]`);
    if (!element) return;

    switch (task.type) {
      case 'move':
        await this.animateMove(element, task.from!, task.to!);
        break;
      // ... other animation types
    }
  }
}
```

### 4. React Integration

```typescript
// Custom hook for position state
function usePositions() {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());

  useEffect(() => {
    const handlePositionChange = (event: PositionEvent) => {
      setPositions(new Map(event.positions));
    };

    positionStore.subscribe(handlePositionChange);
    return () => positionStore.unsubscribe(handlePositionChange);
  }, []);

  return positions;
}

// Grid component
function GameGrid({ occupants }: GameGridProps) {
  const positions = usePositions();

  return (
    <div className="grid-container">
      {occupants.map(occupant => {
        const position = positions.get(occupant.id);
        if (!position) return null;

        return (
          <div
            key={occupant.id}
            className="unit-wrapper"
            style={{
              left: position.col * cellSize,
              top: position.row * cellSize,
              // No transforms here - position is authoritative
            }}
          >
            <UnitCard occupant={occupant} />
          </div>
        );
      })}
    </div>
  );
}
```

## Benefits

1. **No Race Conditions**: Animation queue ensures sequential processing
2. **Perfect Visual Parity**: UI always reflects PositionStore state
3. **Easy Testing**: Pure functions and clear state transitions
4. **Rollback Support**: Failed moves can be cleanly reverted
5. **Debugging**: Single source makes it easy to track issues

## Migration Path

1. Phase 1: Implement PositionStore alongside existing system
2. Phase 2: Route all position queries through PositionStore
3. Phase 3: Replace GridManager with PositionStore
4. Phase 4: Implement AnimationQueue
5. Phase 5: Remove old position tracking from BattleSimulator

## Testing Strategy

```typescript
describe('PositionStore', () => {
  it('prevents double occupancy', () => {
    const store = new PositionStore();
    store.initializeUnit('unit1', { row: 0, col: 0 });

    const result = store.initializeUnit('unit2', { row: 0, col: 0 });
    expect(result).toBe(false);
    expect(store.getOccupant({ row: 0, col: 0 })).toBe('unit1');
  });

  it('handles move transactions atomically', () => {
    const store = new PositionStore();
    store.initializeUnit('unit1', { row: 0, col: 0 });

    const moveId = store.beginMove('unit1', { row: 0, col: 1 });
    expect(store.getPosition('unit1')).toEqual({ row: 0, col: 0 });

    store.commitMove(moveId);
    expect(store.getPosition('unit1')).toEqual({ row: 0, col: 1 });
  });
});
```
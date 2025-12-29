/**
 * React hook for integrating PositionStore with UI components
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { PositionStore, Position, PositionEvent } from '@/systems/PositionStore';

// Global singleton instance
let globalPositionStore: PositionStore | null = null;

/**
 * Get or create the global PositionStore instance
 */
export function getPositionStore(): PositionStore {
  if (!globalPositionStore) {
    globalPositionStore = new PositionStore(8, 8);
  }
  return globalPositionStore;
}

/**
 * Hook to access position data from the PositionStore
 */
export function usePositionStore() {
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [movingUnits, setMovingUnits] = useState<Set<string>>(new Set());
  const storeRef = useRef<PositionStore>(getPositionStore());

  // Subscribe to position events
  useEffect(() => {
    const store = storeRef.current;

    const handlePositionEvent = (event: PositionEvent) => {
      // Update positions
      setPositions(new Map(event.positions));

      // Track moving units
      if (event.type === 'move-started' && event.unitId) {
        setMovingUnits(prev => new Set([...prev, event.unitId!]));
      } else if ((event.type === 'move-committed' || event.type === 'move-rolled-back') && event.unitId) {
        setMovingUnits(prev => {
          const next = new Set(prev);
          next.delete(event.unitId!);
          return next;
        });
      }

      // Log for debugging
      console.log(`[usePositionStore] Event: ${event.type}`, event);
    };

    store.subscribe(handlePositionEvent);

    // Initialize with current state
    setPositions(store.getAllPositions());

    return () => {
      store.unsubscribe(handlePositionEvent);
    };
  }, []);

  // Helper functions
  const getPosition = useCallback((unitId: string): Position | null => {
    return positions.get(unitId) || null;
  }, [positions]);

  const isMoving = useCallback((unitId: string): boolean => {
    return movingUnits.has(unitId);
  }, [movingUnits]);

  const canMoveTo = useCallback((unitId: string, position: Position): boolean => {
    return storeRef.current.canMoveTo(unitId, position);
  }, []);

  const isOccupied = useCallback((position: Position): boolean => {
    return storeRef.current.isOccupied(position);
  }, []);

  const getOccupant = useCallback((position: Position): string | null => {
    return storeRef.current.getOccupant(position);
  }, []);

  // Actions
  const initializeUnit = useCallback((unitId: string, position: Position): boolean => {
    return storeRef.current.initializeUnit(unitId, position);
  }, []);

  const beginMove = useCallback((unitId: string, to: Position): string | null => {
    return storeRef.current.beginMove(unitId, to);
  }, []);

  const commitMove = useCallback((moveId: string): boolean => {
    return storeRef.current.commitMove(moveId);
  }, []);

  const rollbackMove = useCallback((moveId: string): boolean => {
    return storeRef.current.rollbackMove(moveId);
  }, []);

  const removeUnit = useCallback((unitId: string): boolean => {
    return storeRef.current.removeUnit(unitId);
  }, []);

  const batchUpdate = useCallback((updates: Array<{ unitId: string; position: Position }>): boolean => {
    return storeRef.current.batchUpdate(updates);
  }, []);

  return {
    // State
    positions,
    movingUnits,

    // Queries
    getPosition,
    isMoving,
    canMoveTo,
    isOccupied,
    getOccupant,

    // Actions
    initializeUnit,
    beginMove,
    commitMove,
    rollbackMove,
    removeUnit,
    batchUpdate,

    // Direct store access for advanced usage
    store: storeRef.current
  };
}

/**
 * Hook to track a specific unit's position
 */
export function useUnitPosition(unitId: string) {
  const { positions, isMoving: checkMoving } = usePositionStore();
  const position = positions.get(unitId) || null;
  const isMoving = checkMoving(unitId);

  return { position, isMoving };
}

/**
 * Hook to track occupancy at a specific grid position
 */
export function useGridOccupancy(position: Position) {
  const { getOccupant, positions } = usePositionStore();
  const [occupant, setOccupant] = useState<string | null>(null);

  useEffect(() => {
    // Check occupancy whenever positions change
    setOccupant(getOccupant(position));
  }, [positions, position, getOccupant]);

  return occupant;
}
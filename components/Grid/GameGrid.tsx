'use client';

import React, { forwardRef } from 'react';
import { AnyGridOccupant, GridPosition } from '@/types/grid.types';
import { GridOccupantRenderer } from '../GridOccupants/GridOccupantRenderer';

export interface GameGridProps {
  rows: number;
  cols: number;
  cellSize: number;
  occupants: AnyGridOccupant[];
  onOccupantClick?: (occupant: AnyGridOccupant) => void;
  onEmptyCellClick?: (position: GridPosition) => void;
  onUnitHover?: (occupant: AnyGridOccupant | null) => void;
}

export const GameGrid = forwardRef<HTMLDivElement, GameGridProps>(
  function GameGrid(
    {
      rows,
      cols,
      cellSize,
      occupants,
      onOccupantClick,
      onEmptyCellClick,
      onUnitHover,
    },
    ref
  ) {
  // Create a map of positions to occupants for quick lookup
  const occupantMap = new Map<string, AnyGridOccupant>();
  occupants.forEach((occupant) => {
    const key = `${occupant.position.row},${occupant.position.col}`;
    occupantMap.set(key, occupant);
  });

  // Handle cell clicks
  const handleCellClick = (row: number, col: number) => {
    const key = `${row},${col}`;
    const occupant = occupantMap.get(key);

    if (occupant && onOccupantClick) {
      onOccupantClick(occupant);
    } else if (!occupant && onEmptyCellClick) {
      onEmptyCellClick({ row, col });
    }
  };

  return (
    <div
      className="relative"
      style={{
        width: cols * cellSize,
        height: rows * cellSize,
        backgroundImage: 'url(/gridbg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Grid cells - very subtle background */}
      <div className="absolute inset-0 grid" style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}>
        {Array.from({ length: rows * cols }).map((_, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          return (
            <div
              key={`cell-${row}-${col}`}
              className="border border-transparent hover:bg-gray-700/10 transition-colors cursor-pointer"
              onClick={() => handleCellClick(row, col)}
            />
          );
        })}
      </div>

      {/* Occupants rendered on top */}
      <div ref={ref} className="absolute inset-0 pointer-events-none">
        {occupants.map((occupant) => (
          <div
            key={occupant.id}
            className="absolute pointer-events-auto"
            style={{
              left: occupant.position.col * cellSize,
              top: occupant.position.row * cellSize,
              width: cellSize,
              height: cellSize,
            }}
            onClick={() => onOccupantClick?.(occupant)}
            onMouseEnter={() => onUnitHover?.(occupant)}
            onMouseLeave={() => onUnitHover?.(null)}
          >
            <GridOccupantRenderer occupant={occupant} cellSize={cellSize} />
          </div>
        ))}
      </div>
    </div>
  );
});

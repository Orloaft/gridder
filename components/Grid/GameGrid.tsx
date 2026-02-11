'use client';

import React, { forwardRef } from 'react';
import { AnyGridOccupant, GridPosition } from '@/types/grid.types';
import { GridOccupantRenderer } from '../GridOccupants/GridOccupantRenderer';

export interface GameGridProps {
  rows: number;
  cols: number;
  cellSize: number;
  occupants: AnyGridOccupant[];
  zoom?: number; // Zoom level (1.0 = normal, 0.5 = 50%, etc.)
  backgroundImage?: string; // Custom background image path
  backgroundScrollX?: number; // Horizontal scroll position for background (in pixels)
  backgroundTransitionDuration?: number; // Duration for background scroll animation (in ms)
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
      zoom = 1.0,
      backgroundImage = '/gridbg.png',
      backgroundScrollX = 0,
      backgroundTransitionDuration = 1000,
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
      className="relative transition-transform duration-300 ease-out origin-center overflow-hidden"
      style={{
        width: cols * cellSize,
        height: rows * cellSize,
        transform: `scale(${zoom})`,
      }}
    >
      {/* Scrolling background layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'auto 100%',
          backgroundPosition: `${-backgroundScrollX}px center`,
          backgroundRepeat: 'repeat-x',
          transition: `background-position ${backgroundTransitionDuration}ms ease-in-out`,
        }}
      />
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
      <div ref={ref} className="absolute inset-0 pointer-events-none" style={{ overflow: 'hidden' }}>
        {occupants.map((occupant, index) => {
          return (
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
          );
        })}
      </div>
    </div>
  );
});

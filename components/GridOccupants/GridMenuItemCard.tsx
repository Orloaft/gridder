'use client';

import React from 'react';
import { GridMenuItem } from '@/types/grid.types';

export interface GridMenuItemCardProps {
  menuItem: GridMenuItem;
  cellSize: number;
}

export function GridMenuItemCard({ menuItem, cellSize }: GridMenuItemCardProps) {
  return (
    <button
      onClick={menuItem.onClick}
      className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-indigo-400 rounded-lg overflow-hidden hover:border-indigo-300 transition-all shadow-lg hover:shadow-indigo-500/50 active:scale-95"
    >
      {/* Icon (if provided) */}
      {menuItem.icon && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ fontSize: cellSize * 0.35 }}>
            {menuItem.icon}
          </div>
        </div>
      )}

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1.5 text-center">
        <div
          className="text-white font-semibold"
          style={{ fontSize: cellSize * 0.13 }}
        >
          {menuItem.label}
        </div>
      </div>
    </button>
  );
}

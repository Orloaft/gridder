'use client';

import React from 'react';
import { GridEnemy } from '@/types/grid.types';

export interface GridEnemyCardProps {
  enemy: GridEnemy;
  cellSize: number;
}

export function GridEnemyCard({ enemy, cellSize }: GridEnemyCardProps) {
  const hpPercentage = (enemy.hp / enemy.maxHp) * 100;

  return (
    <div
      className="relative w-full h-full bg-gradient-to-br from-red-900 to-red-700 border-2 border-red-400 rounded-lg overflow-hidden hover:border-red-300 transition-all shadow-lg hover:shadow-red-500/50"
      style={{ fontSize: cellSize * 0.12 }}
    >
      {/* Enemy sprite placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-4xl"
          style={{ fontSize: cellSize * 0.4 }}
        >
          {enemy.spritePath || '👹'}
        </div>
      </div>

      {/* Enemy info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
        <div className="text-white font-bold truncate" style={{ fontSize: cellSize * 0.12 }}>
          {enemy.name}
        </div>

        {/* HP bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-0.5">
          <div
            className="bg-red-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>

        <div className="text-gray-300 text-xs" style={{ fontSize: cellSize * 0.1 }}>
          {enemy.hp}/{enemy.maxHp}
        </div>
      </div>
    </div>
  );
}

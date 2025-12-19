'use client';

import React from 'react';
import { GridHero } from '@/types/grid.types';

export interface GridHeroCardProps {
  hero: GridHero;
  cellSize: number;
}

export function GridHeroCard({ hero, cellSize }: GridHeroCardProps) {
  const hpPercentage = (hero.hp / hero.maxHp) * 100;

  return (
    <div
      className="relative w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 border-2 border-blue-400 rounded-lg overflow-hidden hover:border-blue-300 transition-all shadow-lg hover:shadow-blue-500/50"
      style={{ fontSize: cellSize * 0.12 }}
    >
      {/* Hero sprite placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="text-4xl"
          style={{ fontSize: cellSize * 0.4 }}
        >
          {hero.spritePath || '🛡️'}
        </div>
      </div>

      {/* Hero info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
        <div className="text-white font-bold truncate" style={{ fontSize: cellSize * 0.12 }}>
          {hero.name}
        </div>

        {/* HP bar */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-0.5">
          <div
            className="bg-green-500 h-full rounded-full transition-all"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>

        <div className="text-gray-300 text-xs" style={{ fontSize: cellSize * 0.1 }}>
          Lv.{hero.level} • {hero.hp}/{hero.maxHp}
        </div>
      </div>
    </div>
  );
}

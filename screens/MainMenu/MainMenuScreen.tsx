'use client';

import React, { useRef, useEffect } from 'react';
import { GameGrid } from '@/components/Grid/GameGrid';
import { useGameStore } from '@/store/gameStore';
import { createMainMenuLayout } from './MainMenuLayout';
import { animateScreenFadeIn } from '@/animations/screenAnimations';

export function MainMenuScreen() {
  const screenRef = useRef<HTMLDivElement>(null);
  const { player, navigate } = useGameStore();

  const occupants = createMainMenuLayout(
    player.gold,
    player.gems,
    player.level,
    navigate
  );

  // Screen entrance animation
  useEffect(() => {
    if (screenRef.current) {
      animateScreenFadeIn(screenRef.current);
    }
  }, []);

  return (
    <div
      ref={screenRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8"
      style={{ opacity: 0, transform: 'translateY(20px)' }}
    >
      <GameGrid
        rows={8}
        cols={8}
        cellSize={100}
        occupants={occupants}
      />
    </div>
  );
}

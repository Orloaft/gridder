'use client';

import React from 'react';
import { Stage } from '@/types/progression.types';
import { Difficulty } from '@/types/core.types';

interface StageInfoPanelProps {
  stage: Stage | null;
  isCompleted: boolean;
  isUnlocked: boolean;
  width: number;
}

export function StageInfoPanel({ stage, isCompleted, isUnlocked, width }: StageInfoPanelProps) {
  if (!stage) {
    return (
      <div
        className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center h-full"
        style={{ width }}
      >
        <div className="text-6xl mb-4 opacity-30">🗺️</div>
        <p className="text-gray-500 text-sm text-center">
          Hover over a mission to see details
        </p>
      </div>
    );
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case Difficulty.Tutorial:
        return 'text-blue-400';
      case Difficulty.Easy:
        return 'text-green-400';
      case Difficulty.Medium:
        return 'text-yellow-400';
      case Difficulty.Hard:
        return 'text-orange-400';
      case Difficulty.Boss:
        return 'text-red-400 font-bold';
      default:
        return 'text-gray-400';
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <div className="inline-flex items-center px-3 py-1 bg-green-900/50 border border-green-500 rounded-lg">
          <span className="text-green-400 font-bold">✓ Completed</span>
        </div>
      );
    } else if (isUnlocked) {
      return (
        <div className="inline-flex items-center px-3 py-1 bg-blue-900/50 border border-blue-500 rounded-lg">
          <span className="text-blue-400 font-bold">Available</span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-3 py-1 bg-gray-900/50 border border-gray-500 rounded-lg">
          <span className="text-gray-400">🔒 Locked</span>
        </div>
      );
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-blue-500 rounded-lg p-4 flex flex-col gap-3 h-full overflow-y-auto"
      style={{ width }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-white">
            Stage {stage.id}
          </h2>
          {getStatusBadge()}
        </div>
        <h3 className="text-xl font-bold text-blue-300 mb-1">{stage.name}</h3>
        <p className={`text-sm ${getDifficultyColor(stage.difficulty)}`}>
          Difficulty: {stage.difficulty.toUpperCase()}
        </p>
      </div>

      {/* Rewards */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">Rewards</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">💰</span>
            <span className="text-yellow-300 font-bold">{stage.rewards.gold} Gold</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">⭐</span>
            <span className="text-purple-300">{stage.rewards.experience} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-400">🎲</span>
            <span className="text-green-300">{(stage.rewards.recruitChance * 100).toFixed(0)}% Recruit Chance</span>
          </div>
        </div>
      </div>

      {/* Team Info */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">Battle Info</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">⚔️</span>
            <span className="text-blue-300">{stage.playerSlots} Hero Slots</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">👹</span>
            <span className="text-red-300">{stage.enemySlots} Enemies</span>
          </div>
        </div>
      </div>

      {/* Enemy Forces */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex-1">
        <p className="text-xs text-gray-400 mb-2">Enemy Forces</p>
        <div className="flex flex-col gap-1">
          {stage.enemies.map((enemyType, idx) => (
            <div
              key={idx}
              className="bg-red-900/20 px-2 py-1 rounded text-red-300 text-xs font-medium border border-red-800/50"
            >
              {enemyType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
          ))}
        </div>
      </div>

      {/* Unlock Requirement */}
      {!isUnlocked && !isCompleted && stage.unlockRequirement && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2">
          <p className="text-yellow-300 text-xs">
            Complete Stage {stage.unlockRequirement} to unlock
          </p>
        </div>
      )}
    </div>
  );
}

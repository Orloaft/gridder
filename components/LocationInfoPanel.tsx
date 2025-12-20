'use client';

import React from 'react';
import Image from 'next/image';
import { Location, LocationType, isLocationUnlocked } from '@/data/locations';

interface LocationInfoPanelProps {
  location: Location | null;
  isUnlocked: boolean;
  completedStages: Set<number>;
  width: number;
}

export function LocationInfoPanel({ location, isUnlocked, completedStages, width }: LocationInfoPanelProps) {
  if (!location) {
    return (
      <div
        className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center h-full"
        style={{ width }}
      >
        <div className="text-6xl mb-4 opacity-30">🗺️</div>
        <p className="text-gray-500 text-sm text-center">
          Hover over a location to see details
        </p>
      </div>
    );
  }

  // Get location type color and label
  const getTypeInfo = (type: LocationType) => {
    switch (type) {
      case LocationType.Combat:
        return { color: 'text-red-400', label: 'Combat Zone', icon: '⚔️' };
      case LocationType.Shop:
        return { color: 'text-yellow-400', label: 'Shop', icon: '🏪' };
      case LocationType.Recruitment:
        return { color: 'text-blue-400', label: 'Recruitment', icon: '🎖️' };
      case LocationType.Special:
        return { color: 'text-purple-400', label: 'Special', icon: '✨' };
      default:
        return { color: 'text-gray-400', label: 'Unknown', icon: '❓' };
    }
  };

  const typeInfo = getTypeInfo(location.type);

  // Calculate completion progress for combat locations
  let progress = null;
  if (location.stageRange) {
    const totalStages = location.stageRange.end - location.stageRange.start + 1;
    const completed = Array.from(
      { length: totalStages },
      (_, i) => location.stageRange!.start + i
    ).filter((stageId) => completedStages.has(stageId)).length;
    progress = { completed, total: totalStages, percentage: Math.floor((completed / totalStages) * 100) };
  }

  return (
    <div
      className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-blue-500 rounded-lg p-4 flex flex-col gap-3 h-full overflow-y-auto"
      style={{ width }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">{location.name}</h2>
            <p className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</p>
          </div>
          {!isUnlocked && (
            <div className="text-2xl opacity-50">🔒</div>
          )}
        </div>
      </div>

      {/* Location Image */}
      {location.spritePath && (
        <div className="relative w-full h-32 bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
          <Image
            src={location.spritePath}
            alt={location.name}
            fill
            className="object-contain pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}

      {/* Description */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
        <p className="text-sm text-gray-300">{location.description}</p>
      </div>

      {/* Progress (for combat locations) */}
      {progress && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-400">Progress</p>
            <p className="text-sm font-bold text-blue-400">{progress.completed}/{progress.total} Stages</p>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-400 mt-1">{progress.percentage}% Complete</p>
        </div>
      )}

      {/* Info based on type */}
      {location.type === LocationType.Combat && location.stageRange && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
          <p className="text-xs text-red-300 mb-1">Combat Information</p>
          <p className="text-sm text-red-200">
            Contains {location.stageRange.end - location.stageRange.start + 1} battle stages
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Stages {location.stageRange.start}-{location.stageRange.end}
          </p>
        </div>
      )}

      {location.type === LocationType.Shop && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
          <p className="text-xs text-yellow-300 mb-1">Shop Services</p>
          <p className="text-sm text-yellow-200">
            Purchase items and equipment to strengthen your heroes
          </p>
        </div>
      )}

      {location.type === LocationType.Recruitment && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
          <p className="text-xs text-blue-300 mb-1">Recruitment Services</p>
          <p className="text-sm text-blue-200">
            Recruit new heroes to join your party
          </p>
        </div>
      )}

      {/* Unlock Requirement */}
      {!isUnlocked && location.unlockRequirement && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-2">
          <p className="text-yellow-300 text-xs">
            Complete all stages in {location.unlockRequirement.replace('_', ' ')} to unlock
          </p>
        </div>
      )}

      {/* Status */}
      {isUnlocked && (
        <div className="mt-auto bg-green-900/20 border border-green-700/50 rounded-lg p-2 text-center">
          <p className="text-green-400 text-sm font-bold">✓ Unlocked</p>
        </div>
      )}
    </div>
  );
}

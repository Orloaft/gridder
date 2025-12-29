'use client';

import React from 'react';
import {
  AnyGridOccupant,
  isGridHero,
  isGridEnemy,
  isGridButton,
  isGridMenuItem,
  isGridStatusPanel,
  isGridResource,
  isGridDecoration,
  isGridItem
} from '@/types/grid.types';
import { UnitInfoPanel } from './UnitInfoPanel';
import { Hero, ItemInstance } from '@/types/core.types';

interface OccupantInfoPanelProps {
  occupant: AnyGridOccupant | null;
  hoveredItem: ItemInstance | null;
  roster: Hero[];
  inventory: ItemInstance[];
  width?: number;
}

export function OccupantInfoPanel({
  occupant,
  hoveredItem,
  roster,
  inventory,
  width = 320
}: OccupantInfoPanelProps) {
  // If hovering over an item, UnitInfoPanel handles it
  if (hoveredItem) {
    return <UnitInfoPanel unit={null} hoveredItem={hoveredItem} roster={roster} inventory={inventory} width={width} />;
  }

  // Heroes and enemies use the existing UnitInfoPanel
  if (occupant && (isGridHero(occupant) || isGridEnemy(occupant))) {
    return <UnitInfoPanel unit={occupant} hoveredItem={null} roster={roster} inventory={inventory} width={width} />;
  }

  // Handle other occupant types with simplified info panels
  if (!occupant) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-6 flex items-center justify-center" style={{ width }}>
        <p className="text-gray-500 text-center">
          Hover over a tile to see details
        </p>
      </div>
    );
  }

  // GridButton
  if (isGridButton(occupant)) {
    // Use custom description if provided, otherwise fall back to variant-based description
    let description = occupant.description;
    if (!description) {
      if (occupant.variant === 'primary') description = 'Primary action button - confirms or proceeds';
      else if (occupant.variant === 'secondary') description = 'Secondary action button - skips or goes back';
      else if (occupant.variant === 'danger') description = 'Dangerous action - use with caution';
      else description = 'Interactive button';
    }

    // Check if icon is an image path or emoji/text
    const isImagePath = occupant.icon?.startsWith('/') || occupant.icon?.startsWith('http');

    return (
      <div className="h-full bg-gradient-to-br from-purple-900/90 to-purple-800/90 border-2 border-purple-400 rounded-lg p-6" style={{ width }}>
        <div className="flex items-center gap-3 mb-4">
          {occupant.icon && (
            isImagePath ? (
              <img src={occupant.icon} alt="icon" className="w-12 h-12 object-contain" />
            ) : (
              <div className="text-4xl">{occupant.icon}</div>
            )
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{occupant.label}</h2>
            <p className="text-sm text-purple-300">Button</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 border border-purple-700/50">
          <p className="text-sm text-gray-300">{description}</p>
        </div>
        {occupant.disabled && (
          <div className="mt-3 bg-red-900/30 rounded-lg p-2 border border-red-700/50">
            <p className="text-xs text-red-300">⚠ Currently disabled</p>
          </div>
        )}
      </div>
    );
  }

  // GridMenuItem
  if (isGridMenuItem(occupant)) {
    // Check if icon is an image path or emoji/text
    const isImagePath = occupant.icon?.startsWith('/') || occupant.icon?.startsWith('http');

    return (
      <div className="h-full bg-gradient-to-br from-indigo-900/90 to-indigo-800/90 border-2 border-indigo-400 rounded-lg p-6" style={{ width }}>
        <div className="flex items-center gap-3 mb-4">
          {occupant.icon && (
            isImagePath ? (
              <img src={occupant.icon} alt="icon" className="w-12 h-12 object-contain" />
            ) : (
              <div className="text-4xl">{occupant.icon}</div>
            )
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{occupant.label}</h2>
            <p className="text-sm text-indigo-300">Menu Option</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 border border-indigo-700/50">
          <p className="text-sm text-gray-300">Click to navigate to this screen</p>
        </div>
      </div>
    );
  }

  // GridStatusPanel
  if (isGridStatusPanel(occupant)) {
    return (
      <div className={`h-full bg-gradient-to-br ${
        occupant.variant === 'success' ? 'from-green-900/90 to-green-800/90 border-green-400' :
        occupant.variant === 'warning' ? 'from-yellow-900/90 to-yellow-800/90 border-yellow-400' :
        'from-blue-900/90 to-blue-800/90 border-blue-400'
      } border-2 rounded-lg p-6`} style={{ width }}>
        <h2 className="text-2xl font-bold text-white mb-2">{occupant.title}</h2>
        <p className="text-sm text-gray-300 mb-3">Status Panel</p>
        <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50">
          <p className="text-lg text-white">{occupant.content}</p>
        </div>
      </div>
    );
  }

  // GridResource
  if (isGridResource(occupant)) {
    const resourceInfo = {
      gold: {
        name: 'Gold',
        description: 'Primary currency used to purchase items and recruit heroes',
        color: 'from-yellow-900/90 to-yellow-800/90 border-yellow-400',
        icon: '💰'
      },
      gems: {
        name: 'Gems',
        description: 'Premium currency earned from boss battles, used to unlock special heroes',
        color: 'from-purple-900/90 to-purple-800/90 border-purple-400',
        icon: '💎'
      },
      experience: {
        name: 'Experience',
        description: 'Earn XP to level up heroes and unlock new abilities',
        color: 'from-blue-900/90 to-blue-800/90 border-blue-400',
        icon: '⭐'
      }
    };

    const info = resourceInfo[occupant.resourceType];
    const displayIcon = occupant.icon || info.icon;
    const isImagePath = displayIcon?.startsWith('/') || displayIcon?.startsWith('http');

    return (
      <div className={`h-full bg-gradient-to-br ${info.color} border-2 rounded-lg p-6`} style={{ width }}>
        <div className="flex items-center gap-3 mb-4">
          {isImagePath ? (
            <img src={displayIcon} alt="icon" className="w-12 h-12 object-contain" />
          ) : (
            <div className="text-4xl">{displayIcon}</div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{info.name}</h2>
            <p className="text-sm text-gray-300">Resource</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-4 border border-gray-700/50 mb-3">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Amount</p>
            <p className="text-3xl font-bold text-white">{occupant.amount}</p>
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50">
          <p className="text-sm text-gray-300">{info.description}</p>
        </div>
      </div>
    );
  }

  // GridDecoration
  if (isGridDecoration(occupant)) {
    const styleInfo = {
      title: 'Large title text',
      subtitle: 'Secondary text',
      banner: 'Information banner',
      flash: 'Visual flash effect',
      icon: 'Decorative icon',
      chest: 'Treasure chest',
      legendary: 'Legendary item notification',
      'slot-machine': 'Item reveal in progress',
      particle: 'Visual particle effect'
    };

    return (
      <div className="h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-6" style={{ width }}>
        <h2 className="text-2xl font-bold text-white mb-2">Decoration</h2>
        <p className="text-sm text-gray-400 mb-4">{styleInfo[occupant.style || 'title'] || 'Visual element'}</p>

        {occupant.text && (
          <div className="bg-black/20 rounded-lg p-4 border border-gray-700/50 mb-3">
            <p className="text-lg text-white text-center">{occupant.text}</p>
          </div>
        )}

        {occupant.spritePath && (
          <div className="bg-black/20 rounded-lg p-4 border border-gray-700/50">
            <div className="text-center text-5xl">{occupant.spritePath}</div>
          </div>
        )}
      </div>
    );
  }

  // GridItem (reward items)
  if (isGridItem(occupant)) {
    const rarityColors = {
      common: 'from-gray-900/90 to-gray-800/90 border-gray-400',
      uncommon: 'from-green-900/90 to-green-800/90 border-green-400',
      rare: 'from-blue-900/90 to-blue-800/90 border-blue-400',
      epic: 'from-purple-900/90 to-purple-800/90 border-purple-400',
      legendary: 'from-yellow-900/90 to-yellow-800/90 border-yellow-400'
    };

    const rarityColor = rarityColors[occupant.rarity as keyof typeof rarityColors] || rarityColors.common;
    const isImagePath = occupant.icon?.startsWith('/') || occupant.icon?.startsWith('http');

    return (
      <div className={`h-full bg-gradient-to-br ${rarityColor} border-2 rounded-lg p-6`} style={{ width }}>
        <div className="flex items-center gap-3 mb-4">
          {isImagePath ? (
            <img src={occupant.icon} alt="icon" className="w-12 h-12 object-contain" />
          ) : (
            <div className="text-4xl">{occupant.icon}</div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">{occupant.name}</h2>
            <p className="text-sm text-gray-300 capitalize">{occupant.rarity} Item</p>
          </div>
        </div>

        {occupant.value !== undefined && (
          <div className="bg-black/20 rounded-lg p-4 border border-yellow-700/50 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Value</span>
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="text-lg font-bold text-yellow-400">{occupant.value}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-black/20 rounded-lg p-3 border border-gray-700/50">
          <p className="text-sm text-gray-300">
            Item reward from battle victory. Check your inventory to use it.
          </p>
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <div className="h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-6 flex items-center justify-center" style={{ width }}>
      <p className="text-gray-500 text-center">
        Unknown tile type
      </p>
    </div>
  );
}

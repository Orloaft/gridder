'use client';

import React, { useState } from 'react';
import { ItemInstance } from '@/types/core.types';

interface PlayerStatsAndInventoryProps {
  gold: number;
  gems: number;
  currentStage: string;
  inventory: ItemInstance[];
  onItemDragStart: (item: ItemInstance) => void;
  onItemDragEnd: () => void;
  onItemSell?: (item: ItemInstance) => void;
}

export function PlayerStatsAndInventory({
  gold,
  gems,
  currentStage,
  inventory,
  onItemDragStart,
  onItemDragEnd,
  onItemSell,
}: PlayerStatsAndInventoryProps) {
  const [draggedItem, setDraggedItem] = useState<ItemInstance | null>(null);
  const [sellingMode, setSellingMode] = useState(false);

  const handleDragStart = (item: ItemInstance, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('itemId', item.instanceId);
    setDraggedItem(item);
    onItemDragStart(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    onItemDragEnd();
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-400 bg-gray-700/30';
      case 'uncommon':
        return 'border-green-400 bg-green-700/30';
      case 'rare':
        return 'border-blue-400 bg-blue-700/30';
      case 'epic':
        return 'border-purple-400 bg-purple-700/30';
      case 'legendary':
        return 'border-yellow-400 bg-yellow-700/30';
      default:
        return 'border-gray-400 bg-gray-700/30';
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-gray-300';
      case 'uncommon':
        return 'text-green-300';
      case 'rare':
        return 'text-blue-300';
      case 'epic':
        return 'text-purple-300';
      case 'legendary':
        return 'text-yellow-300';
      default:
        return 'text-gray-300';
    }
  };

  const getItemSellPrice = (item: ItemInstance): number => {
    // Base prices by rarity
    const basePrices: Record<string, number> = {
      common: 25,
      uncommon: 50,
      rare: 100,
      epic: 200,
      legendary: 400,
      mythic: 800,
    };

    return basePrices[item.rarity] || 25;
  };

  const handleSellItem = (item: ItemInstance) => {
    if (onItemSell && !item.equippedTo) {
      onItemSell(item);
    }
  };

  // Separate equipped and unequipped items
  const equippedItems = inventory.filter(item => item.equippedTo);
  const unequippedItems = inventory.filter(item => !item.equippedTo);

  return (
    <div className="w-80 h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-6 overflow-y-auto flex flex-col gap-6">
      {/* Player Stats Section */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
          Player Stats
        </h2>

        {/* Resources */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between bg-yellow-900/30 rounded-lg p-2 border border-yellow-700/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              <span className="text-sm text-gray-300">Gold</span>
            </div>
            <span className="text-lg font-bold text-yellow-400">{gold}</span>
          </div>

          <div className="flex items-center justify-between bg-blue-900/30 rounded-lg p-2 border border-blue-700/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <span className="text-sm text-gray-300">Gems</span>
            </div>
            <span className="text-lg font-bold text-blue-400">{gems}</span>
          </div>
        </div>

        {/* Current Progress */}
        <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-700/50">
          <div className="text-xs text-gray-400 mb-1">Current Stage</div>
          <div className="text-sm font-semibold text-purple-300">{currentStage}</div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
          <h2 className="text-xl font-bold text-white">
            Inventory ({inventory.length})
          </h2>
          {onItemSell && (
            <button
              onClick={() => setSellingMode(!sellingMode)}
              className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                sellingMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {sellingMode ? '💰 Selling Mode' : '💰 Sell Items'}
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className={`${sellingMode ? 'bg-red-900/20 border-red-700/50' : 'bg-blue-900/20 border-blue-700/50'} border rounded-lg p-3 mb-4`}>
          <p className={`text-xs ${sellingMode ? 'text-red-300' : 'text-blue-300'}`}>
            {sellingMode
              ? 'Click on unequipped items to sell them for gold. Equipped items cannot be sold.'
              : 'Drag items onto heroes to equip them. Each hero can hold one item.'}
          </p>
        </div>

        {/* Inventory Grid */}
        <div className="space-y-4">
          {/* Equipped Items */}
          {equippedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Equipped</h3>
              <div className="grid grid-cols-3 gap-2">
                {equippedItems.map((item) => (
                  <div
                    key={item.instanceId}
                    className={`relative aspect-square border-2 ${getRarityColor(item.rarity)} rounded-lg p-2 flex flex-col items-center justify-center opacity-60 cursor-not-allowed`}
                    title={`${item.name} - Equipped`}
                  >
                    <div className="text-3xl mb-1">{item.spritePath || '🗡️'}</div>
                    <div className="text-xs text-center text-gray-400 line-clamp-1">
                      {item.name}
                    </div>
                    <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unequipped Items */}
          {unequippedItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Available</h3>
              <div className="grid grid-cols-3 gap-2">
                {unequippedItems.map((item) => {
                  const sellPrice = getItemSellPrice(item);
                  return (
                    <div
                      key={item.instanceId}
                      draggable={!sellingMode}
                      onDragStart={(e) => !sellingMode && handleDragStart(item, e)}
                      onDragEnd={!sellingMode ? handleDragEnd : undefined}
                      onClick={() => sellingMode && handleSellItem(item)}
                      className={`relative aspect-square border-2 ${getRarityColor(item.rarity)} rounded-lg p-2 flex flex-col items-center justify-center ${
                        sellingMode
                          ? 'cursor-pointer hover:border-red-500 hover:bg-red-900/30'
                          : 'cursor-move hover:scale-105'
                      } transition-all ${
                        draggedItem?.instanceId === item.instanceId ? 'opacity-50' : ''
                      }`}
                      title={sellingMode ? `Sell for ${sellPrice}g` : item.description}
                    >
                      <div className="text-3xl mb-1">{item.spritePath || '🗡️'}</div>
                      <div className={`text-xs text-center ${getRarityTextColor(item.rarity)} line-clamp-1 font-semibold`}>
                        {item.name}
                      </div>
                      {sellingMode && (
                        <div className="absolute bottom-1 left-0 right-0 bg-black/80 rounded px-1 py-0.5">
                          <div className="text-xs text-yellow-400 font-bold text-center">
                            {sellPrice}g
                          </div>
                        </div>
                      )}
                      {!sellingMode && item.consumable && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">
                          1
                        </div>
                      )}
                      {!sellingMode && item.permanent && (
                        <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">
                          ∞
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {inventory.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-30">📦</div>
              <p className="text-gray-500 text-sm">
                Your inventory is empty
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Defeat enemies to earn items!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

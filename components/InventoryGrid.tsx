'use client';

import React, { useRef, useEffect, forwardRef } from 'react';
import Image from 'next/image';
import { ItemInstance } from '@/types/core.types';
import { animateCardEntrance } from '@/animations/cardAnimations';

interface InventoryGridProps {
  gold: number;
  gems: number;
  currentStage: string;
  playerLevel: number;
  inventory: ItemInstance[];
  onItemHover: (item: ItemInstance | null) => void;
  onItemDragStart: (item: ItemInstance) => void;
  onItemDragEnd: () => void;
  onItemSell?: (item: ItemInstance) => void;
  cellSize?: number; // Optional cell size for responsive layouts
}

export const InventoryGrid = forwardRef<HTMLDivElement, InventoryGridProps>(
  function InventoryGrid(
    {
      gold,
      gems,
      currentStage,
      playerLevel,
      inventory,
      onItemHover,
      onItemDragStart,
      onItemDragEnd,
      cellSize = 80, // Default to 80, can be overridden for responsive layouts
    },
    ref
  ) {
    const rows = 12; // Increased for player stats
    const cols = 3;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'border-gray-400 bg-gray-700/50';
      case 'uncommon':
        return 'border-green-400 bg-green-700/50';
      case 'rare':
        return 'border-blue-400 bg-blue-700/50';
      case 'epic':
        return 'border-purple-400 bg-purple-700/50';
      case 'legendary':
        return 'border-yellow-400 bg-yellow-700/50';
      default:
        return 'border-gray-400 bg-gray-700/50';
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

  return (
    <div
      ref={ref}
      className="h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-4 flex flex-col"
    >
      <h2 className="text-lg font-bold text-white mb-3 text-center">
        Inventory ({inventory.length})
      </h2>

      {/* Single Grid Container with Player Stats + Items */}
      <div
        className="relative flex-1"
        style={{
          width: cellSize * cols,
        }}
      >
        {/* Grid Background */}
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => (
            <div
              key={`cell-${row}-${col}`}
              className="absolute border border-transparent hover:bg-gray-700/10 transition-colors cursor-pointer"
              style={{
                left: col * cellSize,
                top: row * cellSize,
                width: cellSize,
                height: cellSize,
              }}
            />
          ))
        )}

        {/* Player Stats Tiles - Row 0 */}
        <PlayerStatTile
          icon="💰"
          value={gold.toString()}
          bgColor="bg-yellow-900/50"
          borderColor="border-yellow-700/50"
          textColor="text-yellow-400"
          row={0}
          col={0}
          cellSize={cellSize}
        />
        <PlayerStatTile
          icon="💎"
          value={gems.toString()}
          bgColor="bg-blue-900/50"
          borderColor="border-blue-700/50"
          textColor="text-blue-400"
          row={0}
          col={1}
          cellSize={cellSize}
        />
        <PlayerStatTile
          label="Lvl"
          value={playerLevel.toString()}
          bgColor="bg-purple-900/50"
          borderColor="border-purple-700/50"
          textColor="text-purple-400"
          row={0}
          col={2}
          cellSize={cellSize}
        />

        {/* Items start at row 1 */}
        {inventory.slice(0, (rows - 1) * cols).map((item, index) => {
          const row = Math.floor(index / cols) + 1; // Offset by 1 row for stats
          const col = index % cols;

          return (
            <InventoryItemCard
              key={item.instanceId}
              item={item}
              row={row}
              col={col}
              cellSize={cellSize}
              getRarityColor={getRarityColor}
              getRarityTextColor={getRarityTextColor}
              onHover={onItemHover}
              onDragStart={onItemDragStart}
              onDragEnd={onItemDragEnd}
            />
          );
        })}

        {/* Empty State */}
        {inventory.length === 0 && (
          <div
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: 0,
              top: cellSize * 2,
              width: cellSize * cols,
              height: cellSize * 4,
            }}
          >
            <div className="text-4xl mb-2 opacity-30">📦</div>
            <p className="text-gray-500 text-xs">Inventory Empty</p>
          </div>
        )}
      </div>
    </div>
  );
});

interface InventoryItemCardProps {
  item: ItemInstance;
  row: number;
  col: number;
  cellSize: number;
  getRarityColor: (rarity: string) => string;
  getRarityTextColor: (rarity: string) => string;
  onHover: (item: ItemInstance | null) => void;
  onDragStart: (item: ItemInstance) => void;
  onDragEnd: () => void;
}

interface PlayerStatTileProps {
  icon?: string;
  label?: string;
  value: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  row: number;
  col: number;
  cellSize: number;
}

function PlayerStatTile({
  icon,
  label,
  value,
  bgColor,
  borderColor,
  textColor,
  row,
  col,
  cellSize,
}: PlayerStatTileProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      if (isGridTransition) {
        // During grid transitions, keep card hidden - animateGridEntrance will show it
        return;
      } else if (disableCardAnimations) {
        // During drag-and-drop updates, show card immediately without animation
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'scale(1)';
      } else {
        // Normal entrance animation
        animateCardEntrance(cardRef.current, 0.05 * (row * 3 + col));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div
      ref={cardRef}
      data-grid-card
      className={`absolute ${bgColor} border-2 ${borderColor} rounded-lg flex flex-col items-center justify-center transition-all shadow-lg cursor-pointer hover:brightness-110`}
      style={{
        left: col * cellSize + 2,
        top: row * cellSize + 2,
        width: cellSize - 4,
        height: cellSize - 4,
        opacity: 0,
        transform: 'scale(0)',
      }}
    >
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      {label && <div className="text-xs text-gray-400">{label}</div>}
      <div className={`text-sm font-bold ${textColor}`}>{value}</div>
    </div>
  );
}

function InventoryItemCard({
  item,
  row,
  col,
  cellSize,
  getRarityColor,
  getRarityTextColor,
  onHover,
  onDragStart,
  onDragEnd,
}: InventoryItemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isImageSprite = item.spritePath?.startsWith('/icons/');

  useEffect(() => {
    if (cardRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      if (!isGridTransition && !disableCardAnimations) {
        animateCardEntrance(cardRef.current, 0.05 * (row * 3 + col));
      } else {
        cardRef.current.style.opacity = '1';
        cardRef.current.style.transform = 'scale(1)';
      }
    }
  }, [row, col]);

  const handleDragStart = (e: React.DragEvent) => {
    if (item.equippedTo) return; // Can't drag equipped items
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('itemId', item.instanceId);

    // Create a custom drag image from the entire card
    if (cardRef.current) {
      // Clone the card element
      const dragImage = cardRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.opacity = '1';
      dragImage.style.transform = 'scale(1)';
      dragImage.style.pointerEvents = 'none';
      document.body.appendChild(dragImage);

      // Set the drag image
      e.dataTransfer.setDragImage(dragImage, cellSize / 2, cellSize / 2);

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);

      // Make the original card semi-transparent
      cardRef.current.style.opacity = '0.5';
    }

    onDragStart(item);
  };

  const handleDragEnd = () => {
    onDragEnd();
    if (cardRef.current) {
      cardRef.current.style.opacity = '1';
    }
  };

  const isEquipped = !!item.equippedTo;

  // Get rarity-specific hover glow
  const getRarityHoverGlow = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'hover:shadow-gray-400/50';
      case 'uncommon':
        return 'hover:shadow-green-400/50';
      case 'rare':
        return 'hover:shadow-blue-400/50';
      case 'epic':
        return 'hover:shadow-purple-400/50';
      case 'legendary':
        return 'hover:shadow-yellow-400/50';
      default:
        return 'hover:shadow-gray-400/50';
    }
  };

  // Get rarity-specific border hover color
  const getRarityBorderHover = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'hover:border-gray-300';
      case 'uncommon':
        return 'hover:border-green-300';
      case 'rare':
        return 'hover:border-blue-300';
      case 'epic':
        return 'hover:border-purple-300';
      case 'legendary':
        return 'hover:border-yellow-300';
      default:
        return 'hover:border-gray-300';
    }
  };

  return (
    <div
      ref={cardRef}
      data-grid-card
      draggable={!isEquipped}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => onHover(item)}
      onMouseLeave={() => onHover(null)}
      className={`absolute border-2 ${getRarityColor(item.rarity)} rounded-lg flex flex-col items-center justify-center shadow-lg transition-all overflow-hidden ${
        isEquipped
          ? 'opacity-60 cursor-not-allowed'
          : `cursor-pointer ${getRarityBorderHover(item.rarity)} ${getRarityHoverGlow(item.rarity)}`
      }`}
      style={{
        left: col * cellSize + 2,
        top: row * cellSize + 2,
        width: cellSize - 4,
        height: cellSize - 4,
        opacity: 0,
        transform: 'scale(0)',
      }}
    >
      {/* Item sprite - fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isImageSprite ? (
          <div className="relative w-full h-full">
            <Image
              src={item.spritePath!}
              alt={item.name}
              fill
              className="object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        ) : (
          <div style={{ fontSize: cellSize * 0.6 }}>{item.spritePath || '🗡️'}</div>
        )}
      </div>

      {/* Equipped Badge */}
      {isEquipped && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
      )}

      {/* Consumable Badge */}
      {item.consumable && !isEquipped && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">
          1
        </div>
      )}

      {/* Permanent Badge */}
      {item.permanent && !isEquipped && (
        <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">
          ∞
        </div>
      )}
    </div>
  );
}

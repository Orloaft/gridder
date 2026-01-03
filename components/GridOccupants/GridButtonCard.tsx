'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridButton } from '@/types/grid.types';
import {
  animateButtonPress,
  animateButtonHover,
  animateButtonHoverOut,
} from '@/animations/buttonAnimations';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridButtonCardProps {
  button: GridButton;
  cellSize: number;
}

export function GridButtonCard({ button, cellSize }: GridButtonCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const variantStyles = {
    primary: 'from-purple-600 to-purple-800 border-purple-400',
    secondary: 'from-gray-600 to-gray-800 border-gray-400',
    danger: 'from-red-600 to-red-800 border-red-400',
  };

  const variant = button.variant || 'primary';
  const baseStyles = variantStyles[variant];
  const isImageIcon = button.icon?.startsWith('/icons/');

  // Entrance animation with optional delay (skip during grid transitions)
  useEffect(() => {
    if (buttonRef.current) {
      const isGridTransition = (window as any).__isGridTransition;
      const disableCardAnimations = (window as any).__disableCardAnimations;

      if (isGridTransition) {
        // During grid transitions, keep button hidden - animateGridEntrance will show it
        return;
      } else if (disableCardAnimations) {
        // During drag-and-drop updates, show button immediately without animation
        buttonRef.current.style.opacity = '1';
        buttonRef.current.style.transform = 'scale(1)';
      } else {
        // Normal entrance animation
        const delay = button.animationDelay || 0;
        animateCardEntrance(buttonRef.current, delay);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current && !button.disabled) {
      animateButtonPress(buttonRef.current);
    }
    button.onClick();
  };

  const handleMouseEnter = () => {
    if (buttonRef.current && !button.disabled) {
      animateButtonHover(buttonRef.current);
    }
    // Call custom hover callback if provided
    if (button.onMouseEnter) {
      button.onMouseEnter();
    }
  };

  const handleMouseLeave = () => {
    if (buttonRef.current && !button.disabled) {
      animateButtonHoverOut(buttonRef.current);
    }
    // Call custom hover callback if provided
    if (button.onMouseLeave) {
      button.onMouseLeave();
    }
  };

  // Drag-and-drop handlers for draggable buttons (items)
  const handleDragStart = (e: React.DragEvent) => {
    if (!button.draggable) return;

    // Set the item ID in the drag data
    if (button.itemInstanceId) {
      e.dataTransfer.setData('itemId', button.itemInstanceId);
      e.dataTransfer.effectAllowed = 'move';

      // Make the button semi-transparent while dragging
      if (buttonRef.current) {
        buttonRef.current.style.opacity = '0.5';
      }
    }

    if (button.onDragStart) {
      button.onDragStart();
    }
  };

  const handleDragEnd = () => {
    // Restore opacity after drag
    if (buttonRef.current) {
      buttonRef.current.style.opacity = '1';
    }
  };

  // Drag-and-drop handlers for drop zones
  const handleDragOver = (e: React.DragEvent) => {
    if (!button.onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedHeroId = e.dataTransfer.getData('heroId');
    if (droppedHeroId && button.onDrop) {
      button.onDrop(droppedHeroId);
    }
  };

  // Check if this is the speed button (has lightning icon and label like "1x", "4x", "8x")
  const isSpeedButton = button.icon === '⚡' && /^\d+x$/.test(button.label);

  return (
    <button
      ref={buttonRef}
      data-grid-card
      draggable={button.draggable}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      disabled={button.disabled}
      className={`relative w-full h-full bg-gradient-to-br ${baseStyles} border-2 rounded-lg overflow-hidden shadow-lg ${button.draggable ? 'cursor-move' : 'cursor-pointer'} disabled:cursor-not-allowed`}
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {/* Icon fills entire tile */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isImageIcon ? (
          <div className="relative w-full h-full">
            <Image
              src={button.icon!}
              alt={button.label}
              fill
              className="object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
            />
            {/* Dark overlay for disabled buttons */}
            {button.disabled && (
              <div className="absolute inset-0 bg-black/70" />
            )}
          </div>
        ) : button.icon ? (
          <div style={{ fontSize: cellSize * 0.7 }}>{button.icon}</div>
        ) : (
          <div className="text-white font-bold" style={{ fontSize: cellSize * 0.15 }}>
            {button.label}
          </div>
        )}
      </div>

      {/* Speed button: show speed text at bottom */}
      {isSpeedButton && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
          <div className="bg-black/60 px-2 py-0.5 rounded text-white font-bold" style={{ fontSize: cellSize * 0.15 }}>
            {button.label}
          </div>
        </div>
      )}
    </button>
  );
}

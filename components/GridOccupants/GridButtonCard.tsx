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
    if (buttonRef.current && !(window as any).__disableCardAnimations) {
      const delay = button.animationDelay || 0;
      animateCardEntrance(buttonRef.current, delay);
    }
  }, [button.animationDelay]);

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
  };

  const handleMouseLeave = () => {
    if (buttonRef.current && !button.disabled) {
      animateButtonHoverOut(buttonRef.current);
    }
  };

  return (
    <button
      ref={buttonRef}
      data-grid-card
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={button.disabled}
      className={`relative w-full h-full bg-gradient-to-br ${baseStyles} border-2 rounded-lg overflow-hidden shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {/* Icon (if provided) */}
      {button.icon && (
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          {isImageIcon ? (
            <div className="relative" style={{ width: cellSize * 0.4, height: cellSize * 0.4 }}>
              <Image
                src={button.icon}
                alt={button.label}
                fill
                className="object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            <div style={{ fontSize: cellSize * 0.3 }}>{button.icon}</div>
          )}
        </div>
      )}

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
        <div
          className="text-white font-bold drop-shadow-lg"
          style={{ fontSize: cellSize * 0.14 }}
        >
          {button.label}
        </div>
      </div>
    </button>
  );
}

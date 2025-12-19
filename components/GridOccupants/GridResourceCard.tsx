'use client';

import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { GridResource } from '@/types/grid.types';
import { generateResourceIcon } from '@/utils/generatePlaceholder';
import { animateCardEntrance } from '@/animations/cardAnimations';

export interface GridResourceCardProps {
  resource: GridResource;
  cellSize: number;
}

export function GridResourceCard({ resource, cellSize }: GridResourceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const resourceConfig = {
    gold: { color: 'from-yellow-600 to-yellow-800', border: 'border-yellow-400' },
    gems: { color: 'from-cyan-600 to-cyan-800', border: 'border-cyan-400' },
    experience: { color: 'from-purple-600 to-purple-800', border: 'border-purple-400' },
  };

  const config = resourceConfig[resource.resourceType];
  const iconPath = resource.icon || generateResourceIcon(resource.resourceType);
  const isImageIcon = iconPath.startsWith('/icons/');

  // Entrance animation with optional delay (skip during grid transitions)
  useEffect(() => {
    if (cardRef.current && !(window as any).__disableCardAnimations) {
      const delay = resource.animationDelay || 0;
      animateCardEntrance(cardRef.current, delay);
    }
  }, [resource.animationDelay]);

  return (
    <div
      ref={cardRef}
      data-grid-card
      className={`relative w-full h-full bg-gradient-to-br ${config.color} border-2 ${config.border} rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-lg`}
      style={{ opacity: 0, transform: 'scale(0)' }}
    >
      {/* Icon */}
      <div className="relative" style={{ width: cellSize * 0.4, height: cellSize * 0.4 }}>
        {isImageIcon ? (
          <Image
            src={iconPath}
            alt={resource.resourceType}
            fill
            className="object-contain pixelated"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div style={{ fontSize: cellSize * 0.35 }}>{iconPath}</div>
        )}
      </div>

      {/* Amount */}
      <div
        className="text-white font-bold mt-1 drop-shadow-lg"
        style={{ fontSize: cellSize * 0.15 }}
      >
        {resource.amount.toLocaleString()}
      </div>
    </div>
  );
}

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
} from '@/types/grid.types';
import { GridHeroCard } from './GridHeroCard';
import { GridEnemyCard } from './GridEnemyCard';
import { GridButtonCard } from './GridButtonCard';
import { GridMenuItemCard } from './GridMenuItemCard';
import { GridStatusPanelCard } from './GridStatusPanelCard';
import { GridResourceCard } from './GridResourceCard';
import { GridDecorationCard } from './GridDecorationCard';

export interface GridOccupantRendererProps {
  occupant: AnyGridOccupant;
  cellSize: number;
}

export function GridOccupantRenderer({ occupant, cellSize }: GridOccupantRendererProps) {
  if (isGridHero(occupant)) {
    return <GridHeroCard hero={occupant} cellSize={cellSize} />;
  }

  if (isGridEnemy(occupant)) {
    return <GridEnemyCard enemy={occupant} cellSize={cellSize} />;
  }

  if (isGridButton(occupant)) {
    return <GridButtonCard button={occupant} cellSize={cellSize} />;
  }

  if (isGridMenuItem(occupant)) {
    return <GridMenuItemCard menuItem={occupant} cellSize={cellSize} />;
  }

  if (isGridStatusPanel(occupant)) {
    return <GridStatusPanelCard statusPanel={occupant} cellSize={cellSize} />;
  }

  if (isGridResource(occupant)) {
    return <GridResourceCard resource={occupant} cellSize={cellSize} />;
  }

  if (isGridDecoration(occupant)) {
    return <GridDecorationCard decoration={occupant} cellSize={cellSize} />;
  }

  return null;
}

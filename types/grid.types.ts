// Grid position on the board
export interface GridPosition {
  row: number;
  col: number;
}

// Types of occupants that can exist on the grid
export enum GridOccupantType {
  Hero = 'hero',
  Enemy = 'enemy',
  Button = 'button',
  MenuItem = 'menuItem',
  StatusPanel = 'statusPanel',
  Resource = 'resource',
  Decoration = 'decoration',
}

// Base interface for all grid occupants
export interface BaseGridOccupant {
  id: string;
  position: GridPosition;
  type: GridOccupantType;
  animationDelay?: number; // Optional delay for staggered animations
}

// Hero occupant (player units)
export interface GridHero extends BaseGridOccupant {
  type: GridOccupantType.Hero;
  heroClass: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  spritePath: string;
  unitId?: string; // For battle animations
  cooldown?: number; // Current cooldown (0-100)
  cooldownRate?: number; // How fast cooldown fills
}

// Enemy occupant
export interface GridEnemy extends BaseGridOccupant {
  type: GridOccupantType.Enemy;
  enemyType?: string;
  name: string;
  hp: number;
  maxHp: number;
  spritePath: string;
  unitId?: string; // For battle animations
  cooldown?: number; // Current cooldown (0-100)
  cooldownRate?: number; // How fast cooldown fills
}

// Button occupant (interactive UI elements)
export interface GridButton extends BaseGridOccupant {
  type: GridOccupantType.Button;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// Menu item occupant
export interface GridMenuItem extends BaseGridOccupant {
  type: GridOccupantType.MenuItem;
  label: string;
  icon?: string;
  onClick: () => void;
}

// Status panel occupant (displays game info)
export interface GridStatusPanel extends BaseGridOccupant {
  type: GridOccupantType.StatusPanel;
  title: string;
  content: string;
  variant?: 'info' | 'warning' | 'success';
}

// Resource occupant (gold, gems, etc.)
export interface GridResource extends BaseGridOccupant {
  type: GridOccupantType.Resource;
  resourceType: 'gold' | 'gems' | 'experience';
  amount: number;
  icon?: string;
}

// Decoration occupant (non-interactive visual elements)
export interface GridDecoration extends BaseGridOccupant {
  type: GridOccupantType.Decoration;
  spritePath?: string;
  text?: string;
  style?: 'title' | 'subtitle' | 'banner';
}

// Union type of all possible occupants
export type AnyGridOccupant =
  | GridHero
  | GridEnemy
  | GridButton
  | GridMenuItem
  | GridStatusPanel
  | GridResource
  | GridDecoration;

// Type guards for safe type checking
export function isGridHero(occupant: AnyGridOccupant): occupant is GridHero {
  return occupant.type === GridOccupantType.Hero;
}

export function isGridEnemy(occupant: AnyGridOccupant): occupant is GridEnemy {
  return occupant.type === GridOccupantType.Enemy;
}

export function isGridButton(occupant: AnyGridOccupant): occupant is GridButton {
  return occupant.type === GridOccupantType.Button;
}

export function isGridMenuItem(occupant: AnyGridOccupant): occupant is GridMenuItem {
  return occupant.type === GridOccupantType.MenuItem;
}

export function isGridStatusPanel(occupant: AnyGridOccupant): occupant is GridStatusPanel {
  return occupant.type === GridOccupantType.StatusPanel;
}

export function isGridResource(occupant: AnyGridOccupant): occupant is GridResource {
  return occupant.type === GridOccupantType.Resource;
}

export function isGridDecoration(occupant: AnyGridOccupant): occupant is GridDecoration {
  return occupant.type === GridOccupantType.Decoration;
}

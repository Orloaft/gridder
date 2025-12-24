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
  Item = 'item',
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
  // Drag-and-drop support
  draggable?: boolean;
  heroInstanceId?: string;
  onDragStart?: () => void;
  onDrop?: (heroId: string) => void;
  onItemDrop?: (itemId: string) => void; // For equipping items
  onClick?: () => void;
  // Hero unlock system
  locked?: boolean; // If true, shows dark overlay
  lockCost?: number; // Cost to unlock (gems)
  lockCurrency?: 'gems' | 'gold'; // Currency type for unlock
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
  onDrop?: (heroId: string) => void; // For drag-and-drop support
  onMouseEnter?: () => void; // For hover effects
  onMouseLeave?: () => void; // For hover effects
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
  style?: 'title' | 'subtitle' | 'banner' | 'flash' | 'icon' | 'chest' | 'legendary' | 'slot-machine' | 'particle';
}

// Item occupant (loot rewards)
export interface GridItem extends BaseGridOccupant {
  type: GridOccupantType.Item;
  name: string;
  icon: string;
  rarity: string;
  value?: number;
  onClick?: () => void;
}

// Union type of all possible occupants
export type AnyGridOccupant =
  | GridHero
  | GridEnemy
  | GridButton
  | GridMenuItem
  | GridStatusPanel
  | GridResource
  | GridDecoration
  | GridItem;

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

export function isGridItem(occupant: AnyGridOccupant): occupant is GridItem {
  return occupant.type === GridOccupantType.Item;
}

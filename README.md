# Gridder - Grid-Based Autobattler RPG

A Next.js-based autobattler game where **all UI elements are represented as grid cells**. The 8x8 grid is the entire interface - no external menus, buttons, or panels.

## Core Philosophy

- **Grid is everything**: Every interactive element fits into grid cells
- **Uniform cell size**: All grid cells are identical in size (100px default)
- **Minimalist**: No overlays, popups, or external UI elements
- **2D sprite-based**: All visuals are 2D assets positioned in grid cells

## Project Structure

```
gridder/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page with screen routing
│   └── globals.css        # Global styles
├── components/
│   ├── Grid/
│   │   └── GameGrid.tsx   # Main grid component
│   └── GridOccupants/     # All occupant card components
│       ├── GridOccupantRenderer.tsx
│       ├── GridHeroCard.tsx
│       ├── GridEnemyCard.tsx
│       ├── GridButtonCard.tsx
│       ├── GridMenuItemCard.tsx
│       ├── GridStatusPanelCard.tsx
│       ├── GridResourceCard.tsx
│       └── GridDecorationCard.tsx
├── screens/               # Game screens
│   └── MainMenu/
│       ├── MainMenuScreen.tsx
│       └── MainMenuLayout.ts
├── store/
│   └── gameStore.ts       # Zustand state management
├── types/                 # TypeScript type definitions
│   ├── grid.types.ts      # Grid & occupant types
│   ├── core.types.ts      # Unit, item, ability types
│   ├── battle.types.ts    # Battle event types
│   └── progression.types.ts # Stage, reward types
└── utils/                 # Utility functions
    ├── generatePlaceholder.ts
    └── gridLayoutManager.ts
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the game.

### Build

```bash
npm run build
npm start
```

## Current Implementation

### ✅ Completed

1. **Type System** - Complete TypeScript types for all game entities
2. **Grid Component** - Clean 8x8 grid with occupant rendering
3. **Occupant Cards** - All 7 occupant types implemented:
   - Hero cards (with HP bars)
   - Enemy cards (with HP bars)
   - Button cards (interactive)
   - Menu item cards
   - Status panel cards
   - Resource cards (gold, gems, XP)
   - Decoration cards (text/sprites)
4. **State Management** - Zustand store with:
   - Player data (gold, gems, level, XP)
   - Hero roster management
   - Item inventory
   - Campaign progression
   - Persistent storage (localStorage)
5. **Main Menu Screen** - Fully functional grid-based menu

### 🚧 In Progress

- Campaign Map screen
- Pre-Battle screen
- Battle simulation & playback
- Hero Roster screen
- Shop screen

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **Animations**: GSAP (for future battle animations)

## Game Design

### Grid Layout (8x8)

Each screen uses an 8x8 grid where every cell represents a game element:

**Main Menu Example:**
```
[Gold] [Gems] [--] [TITLE] [--] [--] [--] [Level]
[--]   [--]   [Subtitle] [--]  [--] [--] [--] [--]
[--]   [--]   [--]       [--]  [--] [--] [--] [--]
[--]   [--]   [Campaign] [--]  [--] [Heroes] [--] [--]
[--]   [--]   [Shop]     [--]  [--] [Inventory] [--] [--]
[--]   [--]   [Settings] [--]  [--] [--] [--] [--]
[--]   [--]   [--]       [--]  [--] [--] [--] [--]
[--]   [--]   [Banner Text...] [--] [--] [--] [--]
```

### State Persistence

Game state is automatically saved to `localStorage` and includes:
- Player resources (gold, gems)
- Level and experience
- Hero roster
- Item inventory
- Campaign progress
- Unlocked features

## Development Roadmap

See `# Autobattler Game - Development Ou.txt` for the complete development plan.

### Phase 1 (Current)
- ✅ Core Grid System
- ✅ Type System
- ✅ State Management
- ✅ Main Menu Screen

### Phase 2 (Next)
- Campaign Map Screen
- Pre-Battle Screen
- Hero Roster Screen
- Shop Screen

### Phase 3
- Battle Simulation
- Battle Playback with GSAP
- Victory/Defeat screens

### Phase 4
- Progression System
- Hero/Enemy Data
- Item System
- Save/Load

### Phase 5
- Polish & Content
- Real sprite assets
- Sound effects
- Particle effects

## Contributing

This is a personal project following a specific design philosophy. Please refer to the development outline for design principles and implementation guidelines.

## License

Private project - All rights reserved.

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { GameGrid } from '@/components/Grid/GameGrid';
import { LoadingBar } from '@/components/LoadingBar';
import { UnitInfoPanel } from '@/components/UnitInfoPanel';
import { StageInfoPanel } from '@/components/StageInfoPanel';
import { LocationInfoPanel } from '@/components/LocationInfoPanel';
import { CombatLog } from '@/components/CombatLog';
import { ZoomControls } from '@/components/ZoomControls';
import { InventoryGrid } from '@/components/InventoryGrid';
import { animateGridTransition, animateGridEntrance } from '@/animations/gridTransitions';
import { audioManager } from '@/utils/audioManager';
import { getStageById } from '@/data/stages';
import { getLocationById, isLocationUnlocked } from '@/data/locations';
import { useBattleAutoAdvance } from '@/hooks/useBattleAutoAdvance';
import { useBattleAnimations } from '@/hooks/useBattleAnimations';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { GridHero, GridEnemy, isGridHero, isGridEnemy, AnyGridOccupant } from '@/types/grid.types';
import { ItemInstance } from '@/types/core.types';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createLocationMapLayout } from '@/screens/LocationMap/LocationMapLayout';
import { isStageUnlocked } from '@/data/stages';

export default function Home() {
  const screenRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inventoryGridRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [hoveredUnit, setHoveredUnit] = useState<GridHero | GridEnemy | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ItemInstance | null>(null);
  const [draggedItem, setDraggedItem] = useState<ItemInstance | null>(null);
  const [hoveredStageId, setHoveredStageId] = useState<number | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);

  // Auto-advance battle events (200ms base for tick-based combat)
  useBattleAutoAdvance(200);

  // Handle battle animations
  useBattleAnimations();

  // Get responsive dimensions
  const responsiveDimensions = useResponsiveGrid();

  const {
    gridOccupants,
    navigate,
    updateGridOccupants,
    currentScreen,
    selectedStageId,
    setSelectedStageId,
    selectedLocationId,
    setSelectedLocationId,
    campaign,
    player,
    inventory,
    roster,
    equipItem,
    currentBattle,
    battleEventIndex,
    gridSize,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useGameStore();

  const prevInventoryLength = useRef(inventory.length);

  // Initialize grid immediately on mount (before loading)
  useEffect(() => {
    // Mark as grid transition during initial load (cards should stay hidden)
    (window as any).__isGridTransition = true;
    navigate(ScreenType.MainMenu);
  }, [navigate]);

  // Handle loading completion
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);

    // Start main menu music
    audioManager.playMusic('/Goblins_Den_(Regular).wav', true, 1);

    // Small delay before showing grid to ensure smooth transition
    setTimeout(() => {
      setShowGrid(true);

      // Wait for React to render the cards, then trigger grid entrance animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (gridRef.current) {
            animateGridEntrance(gridRef.current, () => {
              // Clear grid transition flag after initial entrance
              (window as any).__isGridTransition = false;
            });
          }
        });
      });
    }, 50);
  }, []);

  // Expose a transition-aware navigate function
  const navigateWithTransition = useCallback((screen: ScreenType) => {
    if (isTransitioning.current || !gridRef.current) return;

    isTransitioning.current = true;

    // Trigger grid transition animation
    animateGridTransition(
      gridRef.current,
      () => {
        // This callback happens between exit and entrance
        // Navigate returns the number of new occupants
        return navigate(screen);
      },
      () => {
        // This callback happens when transition is complete
        isTransitioning.current = false;
      }
    );
  }, [navigate]);

  // Make navigate function available globally for buttons
  useEffect(() => {
    // Store the transition-aware navigate in window for button clicks
    (window as any).__gridNavigate = navigateWithTransition;
  }, [navigateWithTransition]);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error('Failed to exit fullscreen:', err);
      });
    }
  }, []);

  // Listen for fullscreen changes (e.g., user pressing ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Zoom in: + or =
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomIn();
      }
      // Zoom out: -
      else if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomOut();
      }
      // Reset zoom: 0
      else if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        resetZoom();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [zoomIn, zoomOut, resetZoom]);

  // Get background gradient based on current screen
  const getBackgroundClass = () => {
    switch (currentScreen) {
      case ScreenType.MainMenu:
        return 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900';
      case ScreenType.LocationMap:
        return 'bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900';
      case ScreenType.CampaignMap:
        return 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900';
      case ScreenType.HeroRoster:
        return 'bg-gradient-to-br from-gray-900 via-green-900 to-gray-900';
      case ScreenType.Shop:
        return 'bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900';
      default:
        return 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900';
    }
  };

  // Handle unit hover
  const handleUnitHover = useCallback((occupant: AnyGridOccupant | null) => {
    if (occupant && (isGridHero(occupant) || isGridEnemy(occupant))) {
      setHoveredUnit(occupant);
    } else {
      setHoveredUnit(null);
    }
  }, []);

  // Handle item hover
  const handleItemHover = useCallback((item: ItemInstance | null) => {
    setHoveredItem(item);
  }, []);

  // Handle item drag start
  const handleItemDragStart = useCallback((item: ItemInstance) => {
    setDraggedItem(item);
  }, []);

  // Handle item drag end
  const handleItemDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // Handle stage hover
  const handleStageHover = useCallback((stageId: number | null) => {
    setHoveredStageId(stageId);
  }, []);

  // Handle location hover
  const handleLocationHover = useCallback((locationId: string | null) => {
    setHoveredLocationId(locationId);
  }, []);

  // Regenerate campaign map layout with hover callbacks when on CampaignMap screen
  useEffect(() => {
    if (currentScreen === ScreenType.CampaignMap && showGrid) {
      const newOccupants = createCampaignMapLayout(
        campaign.stagesCompleted,
        navigate,
        setSelectedStageId,
        selectedStageId,
        selectedLocationId,
        handleStageHover
      );
      updateGridOccupants(newOccupants);
    }
  }, [currentScreen, campaign.stagesCompleted, selectedStageId, selectedLocationId, showGrid, navigate, setSelectedStageId, handleStageHover, updateGridOccupants]);

  // Regenerate location map layout with hover callbacks when on LocationMap screen
  useEffect(() => {
    if (currentScreen === ScreenType.LocationMap && showGrid) {
      const newOccupants = createLocationMapLayout(
        campaign.stagesCompleted,
        navigate,
        setSelectedLocationId,
        selectedLocationId,
        handleLocationHover
      );
      updateGridOccupants(newOccupants);
    }
  }, [currentScreen, campaign.stagesCompleted, selectedLocationId, showGrid, navigate, setSelectedLocationId, handleLocationHover, updateGridOccupants]);

  // Animate inventory grid when items change
  useEffect(() => {
    if (!inventoryGridRef.current || !showGrid) return;

    // Check if inventory length changed (item added or removed)
    if (prevInventoryLength.current !== inventory.length) {
      // Set grid transition flag to prevent individual card animations
      (window as any).__isGridTransition = true;

      // Trigger entrance animation for inventory cards
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (inventoryGridRef.current) {
            animateGridEntrance(inventoryGridRef.current, () => {
              // Clear grid transition flag after animation completes
              (window as any).__isGridTransition = false;
            });
          }
        });
      });
      prevInventoryLength.current = inventory.length;
    }
  }, [inventory.length, showGrid]);

  return (
    <>
      {/* Main Game - always rendered, background always visible */}
      <div
        ref={screenRef}
        className={`min-h-screen ${getBackgroundClass()} flex items-center justify-center p-8 gap-8 transition-colors duration-700`}
      >
        {/* Left Panel - shows different content based on screen */}
        {showGrid && (
          <div style={{ height: responsiveDimensions.totalHeight }}>
            {currentScreen === ScreenType.LocationMap ? (
              <LocationInfoPanel
                location={hoveredLocationId ? getLocationById(hoveredLocationId) ?? null : null}
                isUnlocked={hoveredLocationId ? isLocationUnlocked(hoveredLocationId, campaign.stagesCompleted) : false}
                completedStages={campaign.stagesCompleted}
                width={responsiveDimensions.unitInfoPanelWidth}
              />
            ) : currentScreen === ScreenType.CampaignMap ? (
              <StageInfoPanel
                stage={hoveredStageId ? getStageById(hoveredStageId) ?? null : null}
                isCompleted={hoveredStageId ? campaign.stagesCompleted.has(hoveredStageId) : false}
                isUnlocked={hoveredStageId ? isStageUnlocked(hoveredStageId, campaign.stagesCompleted) : false}
                width={responsiveDimensions.unitInfoPanelWidth}
              />
            ) : currentScreen === ScreenType.Battle && currentBattle && !hoveredUnit ? (
              <CombatLog
                events={currentBattle.events}
                currentEventIndex={battleEventIndex}
                width={responsiveDimensions.unitInfoPanelWidth}
              />
            ) : (
              <UnitInfoPanel
                unit={hoveredUnit}
                hoveredItem={hoveredItem}
                roster={roster}
                inventory={inventory}
                width={responsiveDimensions.unitInfoPanelWidth}
              />
            )}
          </div>
        )}

        {/* Single Persistent Grid - everything happens here */}
        {/* Grid background is always visible, but tiles are hidden until loading completes */}
        <div style={{ opacity: showGrid ? 1 : 1 }}>
          <GameGrid
            ref={gridRef}
            rows={gridSize.rows}
            cols={gridSize.cols}
            cellSize={responsiveDimensions.mainGridCellSize}
            zoom={zoomLevel}
            occupants={showGrid ? gridOccupants : []}
            onUnitHover={handleUnitHover}
          />
        </div>

        {/* Player Inventory Grid on the right */}
        {showGrid && (
          <div style={{ height: responsiveDimensions.totalHeight }}>
            <InventoryGrid
              ref={inventoryGridRef}
              gold={player.gold}
              gems={player.gems}
              currentStage={`Stage ${campaign.currentStage}`}
              playerLevel={player.level}
              inventory={inventory}
              onItemHover={handleItemHover}
              onItemDragStart={handleItemDragStart}
              onItemDragEnd={handleItemDragEnd}
              cellSize={responsiveDimensions.inventoryGridCellSize}
            />
          </div>
        )}
      </div>

      {/* Loading Bar - overlays on top of grid and background */}
      {isLoading && (
        <LoadingBar onComplete={handleLoadingComplete} duration={2} />
      )}

      {/* Zoom Controls in bottom right corner */}
      {showGrid && (
        <ZoomControls
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
        />
      )}

      {/* Fullscreen button in bottom left corner - outside animated container */}
      {showGrid && (
        <button
        onClick={toggleFullscreen}
        className="fixed w-12 h-12 bg-gray-800 hover:bg-gray-700 border-2 border-gray-500 rounded-lg flex items-center justify-center transition-all hover:scale-110 shadow-lg"
        style={{
          zIndex: 9999,
          bottom: '16px',
          left: '16px'
        }}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          // Exit fullscreen icon
          <svg
            className="w-6 h-6 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9V4.5M15 9h4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15v4.5m0-4.5h4.5m-4.5 0l5.25 5.25"
            />
          </svg>
        ) : (
          // Enter fullscreen icon
          <svg
            className="w-6 h-6 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5.5 5.5M20 8V4m0 0h-4m4 0l-5.5 5.5M4 16v4m0 0h4m-4 0l5.5-5.5M20 16v4m0 0h-4m4 0l-5.5-5.5"
            />
          </svg>
        )}
      </button>
      )}
    </>
  );
}

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { GameGrid } from '@/components/Grid/GameGrid';
import { LoadingBar } from '@/components/LoadingBar';
import { OccupantInfoPanel } from '@/components/OccupantInfoPanel';
import { StageInfoPanel } from '@/components/StageInfoPanel';
import { LocationInfoPanel } from '@/components/LocationInfoPanel';
import { CombatLog } from '@/components/CombatLog';
import { ZoomControls } from '@/components/ZoomControls';
import { InventoryGrid } from '@/components/InventoryGrid';
import { DoomsdayTracker } from '@/components/DoomsdayTracker';
import { DoomsdayEventModal } from '@/components/DoomsdayEventModal';
import { TimePassageAnimation } from '@/components/TimePassageAnimation';
import { HeroUnlockPanel } from '@/components/HeroUnlockPanel';
import { animateGridTransition, animateGridEntrance } from '@/animations/gridTransitions';
import { audioManager } from '@/utils/audioManager';
import { getStageById } from '@/data/stages';
import { getLocationById, isLocationUnlocked } from '@/data/locations';
import { useBattleAutoAdvance } from '@/hooks/useBattleAutoAdvance';
import { useBattleAnimations } from '@/hooks/useBattleAnimations';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { useRewardReveal } from '@/hooks/useRewardReveal';
import { useDoomsdaySystem } from '@/hooks/useDoomsdaySystem';
import { usePositionManager } from '@/hooks/usePositionManager';
import { GridHero, GridEnemy, isGridHero, isGridEnemy, AnyGridOccupant } from '@/types/grid.types';
import { ItemInstance } from '@/types/core.types';
import { createCampaignMapLayout } from '@/screens/CampaignMap/CampaignMapLayout';
import { createLocationMapLayout } from '@/screens/LocationMap/LocationMapLayout';
import { createShopLayout } from '@/screens/Shop/ShopLayout';
import { isStageUnlocked } from '@/data/stages';

export default function Home() {
  const screenRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inventoryGridRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [hoveredOccupant, setHoveredOccupant] = useState<AnyGridOccupant | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ItemInstance | null>(null);
  const [draggedItem, setDraggedItem] = useState<ItemInstance | null>(null);
  const [hoveredStageId, setHoveredStageId] = useState<number | null>(null);
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
  const [hoveredShopItem, setHoveredShopItem] = useState<any | null>(null); // For shop items
  const [showRetreatConfirmation, setShowRetreatConfirmation] = useState(false);
  const [showDoomsdayEvent, setShowDoomsdayEvent] = useState(false);
  const [currentDoomsdayEvent, setCurrentDoomsdayEvent] = useState<any>(null);
  const [showTimePassage, setShowTimePassage] = useState(false);
  const [timePassageData, setTimePassageData] = useState<any>(null);
  const [showHeroUnlock, setShowHeroUnlock] = useState(false);
  const [backgroundScrollX, setBackgroundScrollX] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Auto-advance battle events (200ms base for tick-based combat)
  useBattleAutoAdvance(200);

  // Handle battle animations
  useBattleAnimations();

  // Handle position management and animation coordination
  usePositionManager();

  // Handle reward reveal lifecycle
  useRewardReveal();

  // Handle doomsday system
  const {
    doomsdayState,
    urgencyLevel,
    processMissionStart,
    processRetreat
  } = useDoomsdaySystem();

  // Listen for time passage events using custom events instead of polling
  useEffect(() => {
    const handleTimePassage = (event: CustomEvent) => {
      const data = event.detail;
      if (data && !showTimePassage) { // Prevent duplicate triggers
        setTimePassageData(data);
        setShowTimePassage(true);
      }
    };

    const handleDoomsdayEvent = (event: CustomEvent) => {
      const eventData = event.detail;
      if (eventData && !showDoomsdayEvent) { // Prevent duplicate triggers
        setCurrentDoomsdayEvent(eventData);
        setShowDoomsdayEvent(true);
      }
    };

    const handleOpenHeroUnlock = () => {
      setShowHeroUnlock(true);
    };

    // Listen for custom events
    window.addEventListener('timePassage', handleTimePassage as any);
    window.addEventListener('doomsdayEvent', handleDoomsdayEvent as any);
    window.addEventListener('openHeroUnlock', handleOpenHeroUnlock);

    return () => {
      window.removeEventListener('timePassage', handleTimePassage as any);
      window.removeEventListener('doomsdayEvent', handleDoomsdayEvent as any);
      window.removeEventListener('openHeroUnlock', handleOpenHeroUnlock);
    };
  }, [showTimePassage, showDoomsdayEvent]);

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
    sellItem,
    currentBattle,
    battleEventIndex,
    gridSize,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    shopItems,
    shopHeroes,
    purchaseItem,
    purchaseHero,
    refreshShop,
    retreatFromBattle,
    preBattleTeam,
    unlockHero,
  } = useGameStore();

  const prevInventoryLength = useRef(inventory.length);

  // Handle background scrolling for wave transitions
  useEffect(() => {
    const handleWaveTransition = (event: CustomEvent) => {
      const { scrollDistance, duration } = event.detail;
      // Scroll the background by scrollDistance (not cumulative)
      setBackgroundScrollX(prev => {
        const newScrollX = prev + scrollDistance;
        console.log('[WaveTransition] Scrolling background from', prev, 'to', newScrollX);
        return newScrollX;
      });
      setIsScrolling(true);

      // Reset scrolling flag after animation
      setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    window.addEventListener('waveTransition', handleWaveTransition as any);

    return () => {
      window.removeEventListener('waveTransition', handleWaveTransition as any);
    };
  }, []);

  // Reset scroll when battle ends
  useEffect(() => {
    if (!currentBattle) {
      setBackgroundScrollX(0);
    }
  }, [currentBattle]);

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
    // Store retreat confirmation trigger
    (window as any).__showRetreatConfirmation = () => setShowRetreatConfirmation(true);
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

  // Handle occupant hover (all types)
  const handleUnitHover = useCallback((occupant: AnyGridOccupant | null) => {
    setHoveredOccupant(occupant);
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

  // Handle shop item hover
  const handleShopItemHover = useCallback((item: any | null) => {
    setHoveredShopItem(item);
  }, []);

  // Calculate retreat earnings
  const calculateRetreatEarnings = useCallback(() => {
    if (!currentBattle || !selectedStageId) return null;

    const stage = getStageById(selectedStageId);
    if (!stage) return null;

    const maxWaveReached = currentBattle.currentWave;

    // Calculate medical costs
    let medicalCosts = 0;
    let faintedCount = 0;
    preBattleTeam.forEach(heroId => {
      const battleHero = currentBattle.heroes.find(h => h.id === heroId);
      if (battleHero && !battleHero.isAlive) {
        faintedCount++;
        medicalCosts += 125; // Average cost for display
      }
    });

    // Calculate gold with multiplier
    const goldMultiplier = maxWaveReached <= 3 ? 1.0 :
                            maxWaveReached <= 6 ? 1.5 :
                            maxWaveReached <= 9 ? 2.0 :
                            4.0;

    const baseGold = Math.floor((stage.rewards.gold * 0.5) * goldMultiplier);
    const netGold = Math.max(0, baseGold - medicalCosts);

    return {
      currentWave: maxWaveReached,
      totalWaves: currentBattle.totalWaves,
      baseGold,
      medicalCosts,
      netGold,
      goldMultiplier,
      faintedCount,
    };
  }, [currentBattle, selectedStageId, preBattleTeam]);

  // Handle retreat confirmation
  const handleRetreatConfirm = useCallback(() => {
    setShowRetreatConfirmation(false);
    retreatFromBattle();
  }, [retreatFromBattle]);

  const handleRetreatCancel = useCallback(() => {
    setShowRetreatConfirmation(false);
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

  // Regenerate shop layout with hover callbacks when on Shop screen
  useEffect(() => {
    if (currentScreen === ScreenType.Shop && showGrid) {
      const newOccupants = createShopLayout(
        player.gold,
        player.gems,
        shopItems,
        shopHeroes,
        navigate,
        purchaseItem,
        purchaseHero,
        refreshShop,
        handleShopItemHover
      );
      updateGridOccupants(newOccupants);
    }
  }, [currentScreen, player.gold, player.gems, shopItems, shopHeroes, showGrid, navigate, purchaseItem, purchaseHero, refreshShop, handleShopItemHover, updateGridOccupants]);

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
      {/* Doomsday Clock Tracker - always visible at top */}
      {showGrid && (
        <DoomsdayTracker position="top" expanded={false} />
      )}

      {/* Main Game - always rendered, background always visible */}
      <div
        ref={screenRef}
        className={`min-h-screen ${getBackgroundClass()} flex items-start justify-center px-8 gap-8 transition-colors duration-700 ${showGrid ? 'pt-14 pb-2' : 'p-8'}`}
        style={showGrid ? { alignItems: 'flex-start', paddingTop: '3.5rem' } : {}}
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
            ) : currentScreen === ScreenType.Battle && currentBattle && !hoveredOccupant ? (
              <CombatLog
                events={currentBattle.events}
                currentEventIndex={battleEventIndex}
                width={responsiveDimensions.unitInfoPanelWidth}
              />
            ) : (
              <OccupantInfoPanel
                occupant={hoveredOccupant}
                hoveredItem={hoveredShopItem || hoveredItem}
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
            backgroundImage={currentScreen === ScreenType.Battle ? '/darkwoodbackground.png' : '/gridbg.png'}
            backgroundScrollX={backgroundScrollX}
            backgroundTransitionDuration={isScrolling ? 1000 : 0}
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
              onItemSell={(item) => sellItem(item.instanceId)}
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

      {/* Retreat Confirmation Dialog */}
      {showRetreatConfirmation && (() => {
        const earnings = calculateRetreatEarnings();
        if (!earnings) return null;

        return (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center"
            style={{ zIndex: 10000 }}
          >
            <div className="bg-gray-800 border-4 border-yellow-600 rounded-lg p-8 max-w-md shadow-2xl">
              <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
                Retreat from Battle?
              </h2>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-900 rounded p-4 border-2 border-gray-700">
                  <p className="text-gray-300 text-sm mb-2">Progress:</p>
                  <p className="text-white text-xl font-bold">
                    Wave {earnings.currentWave} / {earnings.totalWaves}
                  </p>
                </div>

                <div className="bg-gray-900 rounded p-4 border-2 border-gray-700">
                  <p className="text-gray-300 text-sm mb-2">Earnings Summary:</p>

                  <div className="space-y-2 text-white">
                    <div className="flex justify-between">
                      <span>Base Gold (50%):</span>
                      <span className="text-yellow-400">
                        +{Math.floor((getStageById(selectedStageId!)?.rewards.gold ?? 0) * 0.5)}g
                      </span>
                    </div>

                    {earnings.goldMultiplier > 1.0 && (
                      <div className="flex justify-between">
                        <span>Wave Multiplier:</span>
                        <span className="text-green-400">×{earnings.goldMultiplier.toFixed(1)}</span>
                      </div>
                    )}

                    {earnings.faintedCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-400">Medical Costs ({earnings.faintedCount} hero{earnings.faintedCount > 1 ? 'es' : ''}):</span>
                        <span className="text-red-400">-{earnings.medicalCosts}g</span>
                      </div>
                    )}

                    <div className="border-t-2 border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Net Profit:</span>
                        <span className={earnings.netGold > 0 ? 'text-green-400' : 'text-red-400'}>
                          {earnings.netGold > 0 ? '+' : ''}{earnings.netGold}g
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-900 bg-opacity-30 border-2 border-red-600 rounded p-3">
                  <p className="text-red-300 text-sm text-center">
                    No XP or item rewards on retreat
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleRetreatCancel}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-gray-500 transition-all hover:scale-105"
                >
                  Continue Battle
                </button>
                <button
                  onClick={handleRetreatConfirm}
                  className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-red-500 transition-all hover:scale-105"
                >
                  Retreat
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Time Passage Animation */}
      <TimePassageAnimation
        show={showTimePassage}
        daysElapsed={timePassageData?.daysElapsed || 0}
        previousDay={timePassageData?.previousDay || 1}
        newDay={timePassageData?.newDay || 1}
        action={timePassageData?.action || ''}
        onComplete={() => {
          setShowTimePassage(false);
          setTimePassageData(null);
        }}
      />

      {/* Doomsday Event Modal */}
      <DoomsdayEventModal
        event={currentDoomsdayEvent}
        onClose={() => {
          setCurrentDoomsdayEvent(null);
          setShowDoomsdayEvent(false);
        }}
      />

      {/* Hero Unlock Panel */}
      {showHeroUnlock && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-8">
          <HeroUnlockPanel
            onClose={() => setShowHeroUnlock(false)}
          />
        </div>
      )}
    </>
  );
}

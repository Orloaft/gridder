'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { GameGrid } from '@/components/Grid/GameGrid';
import { animateScreenFadeIn } from '@/animations/screenAnimations';
import { animateGridTransition } from '@/animations/gridTransitions';
import { getStageById } from '@/data/stages';
import { useBattleAutoAdvance } from '@/hooks/useBattleAutoAdvance';
import { useBattleAnimations } from '@/hooks/useBattleAnimations';

export default function Home() {
  const screenRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-advance battle events (200ms base for tick-based combat)
  useBattleAutoAdvance(200);

  // Handle battle animations
  useBattleAnimations();

  const {
    gridOccupants,
    navigate,
    updateGridOccupants,
    currentScreen,
    selectedStageId,
    campaign,
  } = useGameStore();

  // Initialize grid on mount with fade in
  useEffect(() => {
    navigate(ScreenType.MainMenu);

    // Initial screen fade in
    if (screenRef.current) {
      animateScreenFadeIn(screenRef.current);
    }
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
        navigate(screen);
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

  // Get background gradient based on current screen
  const getBackgroundClass = () => {
    switch (currentScreen) {
      case ScreenType.MainMenu:
        return 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900';
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

  return (
    <>
      <div
        ref={screenRef}
        className={`min-h-screen ${getBackgroundClass()} flex flex-col items-center justify-center p-8 gap-8 transition-colors duration-700`}
      >
        {/* Single Persistent Grid - everything happens here */}
        <GameGrid ref={gridRef} rows={8} cols={8} cellSize={100} occupants={gridOccupants} />
      </div>

      {/* Fullscreen button in bottom left corner - outside animated container */}
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
    </>
  );
}

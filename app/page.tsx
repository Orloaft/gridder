'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { ScreenType } from '@/types/progression.types';
import { GameGrid } from '@/components/Grid/GameGrid';
import { animateScreenFadeIn } from '@/animations/screenAnimations';
import { animateGridTransition } from '@/animations/gridTransitions';
import { getStageById } from '@/data/stages';

export default function Home() {
  const screenRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);

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

  // Get selected stage info for campaign map
  const selectedStage = selectedStageId ? getStageById(selectedStageId) : null;
  const isUnlocked = selectedStageId
    ? !campaign.stagesCompleted.has(selectedStageId) &&
      (selectedStageId === 1 || campaign.stagesCompleted.has(selectedStageId - 1))
    : false;

  return (
    <div
      ref={screenRef}
      className={`min-h-screen ${getBackgroundClass()} flex flex-col items-center justify-center p-8 gap-8 transition-colors duration-700`}
      style={{ opacity: 0, transform: 'translateY(20px)' }}
    >
      {/* Single Persistent Grid */}
      <GameGrid ref={gridRef} rows={8} cols={8} cellSize={100} occupants={gridOccupants} />

      {/* Stage Details Panel (only shown on campaign map with selected stage) */}
      {currentScreen === ScreenType.CampaignMap && selectedStage && (
        <div className="w-[800px] bg-gray-800/80 backdrop-blur-sm border-2 border-blue-500 rounded-lg p-6 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Stage {selectedStage.id}: {selectedStage.name}
              </h2>
              <p className="text-gray-300 text-sm">
                Difficulty:{' '}
                <span
                  className={
                    selectedStage.difficulty === 'boss'
                      ? 'text-red-400 font-bold'
                      : selectedStage.difficulty === 'hard'
                      ? 'text-orange-400'
                      : selectedStage.difficulty === 'medium'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }
                >
                  {selectedStage.difficulty.toUpperCase()}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-400">Rewards</p>
              <p className="text-yellow-400 font-bold">💰 {selectedStage.rewards.gold} Gold</p>
              <p className="text-purple-400 text-sm">⭐ {selectedStage.rewards.experience} XP</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-400 mb-2">Enemy Forces:</p>
            <div className="flex gap-2">
              {selectedStage.enemies.map((enemyType, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700/50 px-3 py-1 rounded text-red-400 text-sm font-medium"
                >
                  {enemyType.replace('_', ' ')}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <p className="text-sm text-gray-400">
              Team Size: <span className="text-blue-400">{selectedStage.playerSlots} Heroes</span>
            </p>
            <span className="text-gray-600">•</span>
            <p className="text-sm text-gray-400">
              Enemies: <span className="text-red-400">{selectedStage.enemySlots}</span>
            </p>
          </div>

          {isUnlocked && (
            <button className="mt-6 w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg">
              Start Battle →
            </button>
          )}

          {campaign.stagesCompleted.has(selectedStageId!) && (
            <div className="mt-6 text-center text-green-400 font-bold text-lg">
              ✓ Completed
            </div>
          )}

          {!isUnlocked && !campaign.stagesCompleted.has(selectedStageId!) && (
            <div className="mt-6 text-center text-red-400 font-bold">
              🔒 Complete previous stages to unlock
            </div>
          )}
        </div>
      )}
    </div>
  );
}

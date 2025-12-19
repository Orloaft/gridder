'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GameGrid } from '@/components/Grid/GameGrid';
import { useGameStore } from '@/store/gameStore';
import { createCampaignMapLayout } from './CampaignMapLayout';
import { animateScreenFadeIn } from '@/animations/screenAnimations';
import { getStageById } from '@/data/stages';

export function CampaignMapScreen() {
  const screenRef = useRef<HTMLDivElement>(null);
  const { campaign, navigate } = useGameStore();
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  const selectedStage = selectedStageId ? getStageById(selectedStageId) : null;
  const isUnlocked = selectedStageId
    ? !campaign.stagesCompleted.has(selectedStageId) &&
      (selectedStageId === 1 || campaign.stagesCompleted.has(selectedStageId - 1))
    : false;

  // Screen entrance animation
  useEffect(() => {
    if (screenRef.current) {
      animateScreenFadeIn(screenRef.current);
    }
  }, []);

  const handleStageSelect = (stageId: number) => {
    setSelectedStageId(stageId);
  };

  const occupants = createCampaignMapLayout(
    campaign.stagesCompleted,
    navigate,
    handleStageSelect,
    selectedStageId
  );

  return (
    <div
      ref={screenRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-8 gap-8"
      style={{ opacity: 0, transform: 'translateY(20px)' }}
    >
      {/* Main Grid */}
      <GameGrid rows={8} cols={8} cellSize={100} occupants={occupants} />

      {/* Stage Details Panel (below grid) */}
      {selectedStage && (
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

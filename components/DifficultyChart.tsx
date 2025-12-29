'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

interface DifficultyData {
  stage: number;
  enemyPower: number;
  expectedHeroPower: number;
  goldReward: number;
  medicalCost: number;
  netProfit: number;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'boss';
}

export function DifficultyChart() {
  const { campaign, roster, player } = useGameStore();
  const [chartData, setChartData] = useState<DifficultyData[]>([]);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  useEffect(() => {
    // Generate chart data for stages 1-128
    const data: DifficultyData[] = [];

    for (let stage = 1; stage <= 128; stage += 4) {
      // Calculate enemy power scaling
      const progressPercent = Math.min(stage / 128, 1);
      const logScaling = Math.log10(1 + progressPercent * 9) / Math.log10(10);
      const linearScaling = 1 + progressPercent * 1.8;
      const enemyPower = (logScaling * 0.3 + linearScaling * 0.7);

      // Calculate expected hero power (based on level progression)
      const expectedLevel = Math.floor(stage / 8) + 1; // Expect 1 level per 8 stages
      const expectedHeroPower = 1 + (expectedLevel * 0.15); // ~15% growth per level

      // Calculate gold rewards
      const stageProgress = Math.min(stage / 128, 1);
      const baseGold = Math.floor(50 + (stageProgress * 750));

      // Determine difficulty
      const difficulty = stage % 8 === 0 ? 'boss' :
                        stage % 8 >= 6 ? 'hard' :
                        stage % 8 >= 4 ? 'medium' :
                        stage <= 4 ? 'tutorial' : 'easy';

      const difficultyMultiplier = difficulty === 'boss' ? 3 :
                                   difficulty === 'hard' ? 2 :
                                   difficulty === 'medium' ? 1.5 : 1;

      const goldReward = Math.floor(baseGold * difficultyMultiplier);

      // Calculate medical costs (assume 1 hero fainted average)
      const minCost = Math.floor(15 + stageProgress * 15);
      const maxCost = Math.floor(25 + stageProgress * 25);
      const medicalCost = Math.floor((minCost + maxCost) / 2);

      const netProfit = goldReward - medicalCost;

      data.push({
        stage,
        enemyPower,
        expectedHeroPower,
        goldReward,
        medicalCost,
        netProfit,
        difficulty
      });
    }

    setChartData(data);
  }, []);

  // Calculate current player power
  const currentHeroPower = roster.reduce((total, hero) => {
    const levelBonus = 1 + (hero.level * 0.15);
    return total + levelBonus;
  }, 0) / Math.max(roster.length, 1);

  // Find recommended stage based on power
  const recommendedStage = chartData.findIndex(d =>
    d.enemyPower > currentHeroPower * 1.2 // 20% buffer for safety
  ) * 4 || campaign.currentStage;

  const maxValue = Math.max(...chartData.map(d =>
    Math.max(d.enemyPower, d.expectedHeroPower, d.goldReward / 100)
  ), 3);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Difficulty Progression Curve</h2>

      {/* Chart */}
      <div className="relative bg-black rounded-lg p-4 mb-6" style={{ height: '300px' }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 w-12">
          <span>{maxValue.toFixed(1)}x</span>
          <span>{(maxValue * 0.75).toFixed(1)}x</span>
          <span>{(maxValue * 0.5).toFixed(1)}x</span>
          <span>{(maxValue * 0.25).toFixed(1)}x</span>
          <span>1.0x</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full relative">
          <svg className="w-full h-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(y => (
              <line
                key={y}
                x1="0"
                y1={`${y * 100}%`}
                x2="100%"
                y2={`${y * 100}%`}
                stroke="rgba(75, 85, 99, 0.3)"
                strokeDasharray="2 2"
              />
            ))}

            {/* Enemy Power Line (Red) */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={chartData.map((d, i) =>
                `${(i / (chartData.length - 1)) * 100}%,${100 - (d.enemyPower / maxValue) * 100}%`
              ).join(' ')}
            />

            {/* Expected Hero Power Line (Green) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points={chartData.map((d, i) =>
                `${(i / (chartData.length - 1)) * 100}%,${100 - (d.expectedHeroPower / maxValue) * 100}%`
              ).join(' ')}
            />

            {/* Current Hero Power Line (Blue) */}
            <line
              x1="0"
              y1={`${100 - (currentHeroPower / maxValue) * 100}%`}
              x2="100%"
              y2={`${100 - (currentHeroPower / maxValue) * 100}%`}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5 5"
            />

            {/* Gold Rewards (Yellow bars) */}
            {chartData.map((d, i) => (
              <rect
                key={i}
                x={`${(i / chartData.length) * 100}%`}
                y={`${100 - (d.goldReward / 100 / maxValue) * 100}%`}
                width={`${100 / chartData.length}%`}
                height={`${(d.goldReward / 100 / maxValue) * 100}%`}
                fill="rgba(251, 191, 36, 0.2)"
                stroke="rgba(251, 191, 36, 0.5)"
                strokeWidth="1"
                className="hover:fill-yellow-500 hover:fill-opacity-30 cursor-pointer"
                onClick={() => setSelectedStage(d.stage)}
              />
            ))}

            {/* Recommended stage marker */}
            {recommendedStage > 0 && (
              <circle
                cx={`${(recommendedStage / 128) * 100}%`}
                cy="50%"
                r="8"
                fill="#10b981"
                className="animate-pulse"
              />
            )}
          </svg>

          {/* Stage difficulty indicators at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex">
            {chartData.map((d, i) => (
              <div
                key={i}
                className={`flex-1 h-2 ${
                  d.difficulty === 'boss' ? 'bg-red-600' :
                  d.difficulty === 'hard' ? 'bg-orange-600' :
                  d.difficulty === 'medium' ? 'bg-yellow-600' :
                  d.difficulty === 'tutorial' ? 'bg-blue-600' :
                  'bg-green-600'
                }`}
                title={`Stage ${d.stage}: ${d.difficulty}`}
              />
            ))}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="ml-14 flex justify-between text-xs text-gray-400 mt-2">
          <span>Stage 1</span>
          <span>Stage 32</span>
          <span>Stage 64</span>
          <span>Stage 96</span>
          <span>Stage 128</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500"></div>
          <span className="text-gray-400">Enemy Power</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500"></div>
          <span className="text-gray-400">Expected Hero Power</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-500 opacity-50"></div>
          <span className="text-gray-400">Your Current Power</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 bg-opacity-20 border border-yellow-500"></div>
          <span className="text-gray-400">Gold Rewards</span>
        </div>
      </div>

      {/* Stage Details */}
      {selectedStage && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-2">Stage {selectedStage} Analysis</h3>
          {(() => {
            const stage = chartData.find(d => d.stage === selectedStage);
            if (!stage) return null;

            const powerGap = stage.enemyPower - currentHeroPower;
            const recommendation = powerGap > 0.5 ? 'Too Difficult' :
                                 powerGap > 0.2 ? 'Challenging' :
                                 powerGap > -0.2 ? 'Optimal' :
                                 'Too Easy';

            const recommendationColor = recommendation === 'Too Difficult' ? 'text-red-400' :
                                       recommendation === 'Challenging' ? 'text-orange-400' :
                                       recommendation === 'Optimal' ? 'text-green-400' :
                                       'text-gray-400';

            return (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Enemy Power:</span>
                  <span className="text-red-400">{stage.enemyPower.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Power:</span>
                  <span className="text-blue-400">{currentHeroPower.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Power Gap:</span>
                  <span className={powerGap > 0 ? 'text-red-400' : 'text-green-400'}>
                    {powerGap > 0 ? '+' : ''}{powerGap.toFixed(2)}x
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gold Reward:</span>
                    <span className="text-yellow-400">{stage.goldReward}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Medical:</span>
                    <span className="text-red-400">-{stage.medicalCost}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Net Profit:</span>
                    <span className={stage.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                      {stage.netProfit > 0 ? '+' : ''}{stage.netProfit}g
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recommendation:</span>
                    <span className={recommendationColor}>{recommendation}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Current Status */}
      <div className="mt-4 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-2">Your Progress</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Current Stage</p>
            <p className="text-2xl font-bold text-white">{campaign.currentStage}</p>
          </div>
          <div>
            <p className="text-gray-400">Team Power</p>
            <p className="text-2xl font-bold text-blue-400">{currentHeroPower.toFixed(2)}x</p>
          </div>
          <div>
            <p className="text-gray-400">Recommended</p>
            <p className="text-2xl font-bold text-green-400">Stage {recommendedStage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { doomsdaySystem } from '@/systems/DoomsdaySystem';

interface DoomsdayTrackerProps {
  position?: 'top' | 'bottom';
  expanded?: boolean;
}

export function DoomsdayTracker({ position = 'top', expanded = false }: DoomsdayTrackerProps) {
  const [state, setState] = useState(doomsdaySystem.getState());
  const [showDetails, setShowDetails] = useState(expanded);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(doomsdaySystem.getState());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Trigger pulse animation on critical moments
  useEffect(() => {
    const urgency = doomsdaySystem.getUrgencyLevel();
    if (urgency === 'critical') {
      setPulseAnimation(true);
      const timeout = setTimeout(() => setPulseAnimation(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.currentDay]);

  const daysRemaining = Math.max(0, Math.floor(doomsdaySystem.getDaysUntilDoom()));
  const urgencyLevel = doomsdaySystem.getUrgencyLevel();
  const multipliers = doomsdaySystem.getAntagonistMultiplier();

  // Color coding based on urgency
  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'critical': return 'bg-red-900 border-red-500';
      case 'high': return 'bg-orange-900 border-orange-500';
      case 'medium': return 'bg-yellow-900 border-yellow-600';
      case 'low': return 'bg-gray-800 border-gray-600';
    }
  };

  const getRitualColor = () => {
    if (state.ritualProgress >= 80) return 'bg-red-600';
    if (state.ritualProgress >= 60) return 'bg-orange-600';
    if (state.ritualProgress >= 40) return 'bg-yellow-600';
    return 'bg-purple-600';
  };

  const getPowerLevelColor = () => {
    if (state.antagonistPowerLevel >= 80) return 'text-red-400';
    if (state.antagonistPowerLevel >= 60) return 'text-orange-400';
    if (state.antagonistPowerLevel >= 40) return 'text-yellow-400';
    return 'text-purple-400';
  };

  return (
    <div
      className={`fixed ${position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-[1000] transition-all duration-300`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Main Bar */}
      <div
        className={`${getUrgencyColor()} border-b-4 backdrop-blur-md bg-opacity-90 ${
          pulseAnimation ? 'animate-pulse' : ''
        }`}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left: Day Counter */}
            <div className="flex items-center gap-4">
              <div className="text-white">
                <span className="text-xs opacity-70">Day</span>
                <div className="text-2xl font-bold">{state.currentDay}</div>
              </div>

              {urgencyLevel === 'critical' && (
                <div className="animate-pulse text-red-400 text-sm font-bold">
                  ⚠️ CRITICAL
                </div>
              )}
            </div>

            {/* Center: Ritual Progress */}
            <div className="flex-1 mx-8">
              <div className="text-white text-sm mb-1 text-center">
                {state.antagonistName}'s Void Ritual
              </div>
              <div className="relative h-6 bg-black bg-opacity-50 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getRitualColor()} transition-all duration-500`}
                  style={{ width: `${state.ritualProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                  {state.ritualProgress.toFixed(1)}% Complete
                </div>
              </div>
            </div>

            {/* Right: Days Remaining & Toggle */}
            <div className="flex items-center gap-4">
              <div className="text-white text-right">
                <span className="text-xs opacity-70">Time Left</span>
                <div className="text-2xl font-bold">
                  {daysRemaining}
                  <span className="text-sm ml-1">days</span>
                </div>
              </div>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded transition-colors"
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Time Costs Preview */}
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-white opacity-70">
            <span>Mission Time Costs:</span>
            <span>🌲 Forest: {doomsdaySystem.getTimeCost('forestMission')} day</span>
            <span>⛰️ Caves: {doomsdaySystem.getTimeCost('cavesMission')} days</span>
            <span>🏛️ Ruins: {doomsdaySystem.getTimeCost('ruinsMission')} days</span>
            <span>🛒 Shop: {doomsdaySystem.getTimeCost('shopVisit')} day</span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="bg-gray-900 bg-opacity-95 border-b-2 border-gray-700 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-3 gap-6">
              {/* Antagonist Status */}
              <div className="bg-black bg-opacity-50 rounded-lg p-4">
                <h3 className="text-purple-400 font-bold mb-2">
                  {state.antagonistName} {state.antagonistTitle}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Power Level:</span>
                    <span className={getPowerLevelColor()}>
                      {state.antagonistPowerLevel}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Enemy Health:</span>
                    <span className="text-red-400">
                      ×{multipliers.healthMultiplier.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Enemy Damage:</span>
                    <span className="text-red-400">
                      ×{multipliers.damageMultiplier.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Spawn Rate:</span>
                    <span className="text-red-400">
                      ×{multipliers.spawnRateMultiplier.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Modifiers */}
              <div className="bg-black bg-opacity-50 rounded-lg p-4">
                <h3 className="text-blue-400 font-bold mb-2">Active Effects</h3>
                <div className="space-y-1 text-sm">
                  {doomsdaySystem.getGlobalEnemyBuffs().length > 0 ? (
                    doomsdaySystem.getGlobalEnemyBuffs().map(buff => (
                      <div key={buff} className="text-red-300">
                        • {buff.replace(/_/g, ' ').toUpperCase()}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No global effects yet</div>
                  )}

                  {state.timeModifiers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-green-400 text-xs mb-1">Your Modifiers:</div>
                      {state.timeModifiers.map(mod => (
                        <div key={mod.name} className="text-green-300">
                          • {mod.name} ({mod.duration} days left)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-black bg-opacity-50 rounded-lg p-4">
                <h3 className="text-yellow-400 font-bold mb-2">Upcoming Doom</h3>
                <div className="space-y-2 text-sm">
                  {state.powerSpikes
                    .filter(spike => spike.day > state.currentDay)
                    .slice(0, 3)
                    .map(spike => (
                      <div key={spike.day} className="flex justify-between">
                        <span className="text-gray-400">Day {spike.day}:</span>
                        <span className="text-yellow-300 text-xs text-right">
                          {spike.description}
                        </span>
                      </div>
                    ))}

                  {state.powerSpikes.filter(s => s.day > state.currentDay).length === 0 && (
                    <div className="text-red-500 font-bold">
                      THE END IS HERE!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  const result = doomsdaySystem.performSabotage('ritual_disruption');
                  console.log('Sabotage result:', result);
                }}
                className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
              >
                🔮 Disrupt Ritual (-10% progress, 3 days)
              </button>

              <button
                onClick={() => {
                  const result = doomsdaySystem.performSabotage('seal_reinforcement');
                  console.log('Sabotage result:', result);
                }}
                className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
              >
                🛡️ Reinforce Seals (Delay spike, 2 days)
              </button>

              <button
                onClick={() => {
                  const result = doomsdaySystem.performSabotage('timeline_manipulation');
                  console.log('Sabotage result:', result);
                }}
                className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
              >
                ⏰ Bend Time (Half cost for 5 days, 1 day)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
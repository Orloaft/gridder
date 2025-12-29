'use client';

import { useDoomsdaySystem } from '@/hooks/useDoomsdaySystem';
import { useGameStore } from '@/store/gameStore';

interface Mission {
  id: string;
  name: string;
  location: 'forest' | 'caves' | 'ruins';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  timeCost: number;
  expectedRewards: {
    gold: string;
    items: string;
    xp: string;
  };
  description: string;
  icon: string;
  color: string;
  recommended: boolean;
}

export function MissionSelector() {
  const { navigate } = useGameStore();
  const {
    doomsdayState,
    urgencyLevel,
    daysUntilDoom,
    getMissionEfficiency,
    getTimeCost
  } = useDoomsdaySystem();

  const missions: Mission[] = [
    {
      id: 'forest',
      name: 'Forest Expedition',
      location: 'forest',
      difficulty: 'Easy',
      timeCost: getTimeCost('forestMission'),
      expectedRewards: {
        gold: '50-150g',
        items: '1-2 Common',
        xp: '50-100'
      },
      description: 'Safe farming for basic resources. Low risk, low reward.',
      icon: '🌲',
      color: 'bg-green-800',
      recommended: urgencyLevel === 'low'
    },
    {
      id: 'caves',
      name: 'Cave Delve',
      location: 'caves',
      difficulty: 'Medium',
      timeCost: getTimeCost('cavesMission'),
      expectedRewards: {
        gold: '200-400g',
        items: '1-2 Uncommon',
        xp: '150-250'
      },
      description: 'Balanced risk and reward. Good for mid-tier gear.',
      icon: '⛰️',
      color: 'bg-gray-700',
      recommended: urgencyLevel === 'medium'
    },
    {
      id: 'ruins',
      name: 'Ancient Ruins',
      location: 'ruins',
      difficulty: 'Hard',
      timeCost: getTimeCost('ruinsMission'),
      expectedRewards: {
        gold: '400-800g',
        items: '1-2 Rare+',
        xp: '300-500'
      },
      description: 'High risk, high reward. Chase legendary items here.',
      icon: '🏛️',
      color: 'bg-purple-900',
      recommended: urgencyLevel === 'high' || urgencyLevel === 'critical'
    }
  ];

  const specialActions = [
    {
      id: 'rest',
      name: 'Rest & Recover',
      timeCost: getTimeCost('rest'),
      effect: 'Heal all heroes to full HP',
      icon: '🛌',
      color: 'bg-blue-800'
    },
    {
      id: 'shop',
      name: 'Visit Shop',
      timeCost: getTimeCost('shopVisit'),
      effect: 'Browse and purchase items/heroes',
      icon: '🛒',
      color: 'bg-yellow-800'
    }
  ];

  const getUrgencyWarning = () => {
    if (daysUntilDoom <= 5) {
      return {
        message: "⚠️ CRITICAL: Only attempt high-value missions! Time is running out!",
        color: 'text-red-400 animate-pulse'
      };
    } else if (daysUntilDoom <= 10) {
      return {
        message: "⚠️ Time is short! Focus on essential upgrades only.",
        color: 'text-orange-400'
      };
    } else if (daysUntilDoom <= 15) {
      return {
        message: "Be efficient with your time. Every day counts.",
        color: 'text-yellow-400'
      };
    }
    return null;
  };

  const urgencyWarning = getUrgencyWarning();

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Mission Selection</h2>
        <div className="flex items-center justify-between">
          <div className="text-gray-400">
            Day {doomsdayState.currentDay} • {daysUntilDoom} days until doom
          </div>
          <div className="text-sm text-purple-400">
            Antagonist Power: {doomsdayState.antagonistPowerLevel}%
          </div>
        </div>

        {urgencyWarning && (
          <div className={`mt-3 p-3 bg-black bg-opacity-50 rounded border border-red-500`}>
            <p className={urgencyWarning.color}>{urgencyWarning.message}</p>
          </div>
        )}
      </div>

      {/* Main Missions */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {missions.map(mission => {
          const efficiency = getMissionEfficiency(mission.location);
          const efficiencyColor =
            efficiency.score >= 100 ? 'text-green-400' :
            efficiency.score >= 50 ? 'text-yellow-400' :
            'text-red-400';

          return (
            <div
              key={mission.id}
              className={`${mission.color} bg-opacity-50 rounded-lg p-4 border-2 ${
                mission.recommended ? 'border-yellow-500' : 'border-gray-600'
              } hover:bg-opacity-70 transition-all cursor-pointer`}
              onClick={() => navigate(mission.location)}
            >
              {mission.recommended && (
                <div className="text-xs text-yellow-400 font-bold mb-2">
                  ✨ RECOMMENDED
                </div>
              )}

              <div className="text-4xl mb-2">{mission.icon}</div>
              <h3 className="text-lg font-bold text-white mb-1">{mission.name}</h3>
              <div className="text-sm text-gray-300 mb-2">{mission.difficulty}</div>

              {/* Time Cost */}
              <div className="bg-black bg-opacity-50 rounded p-2 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Time Cost:</span>
                  <span className="text-white font-bold">
                    {mission.timeCost} {mission.timeCost === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Ritual Progress: +{(mission.timeCost * 3.33).toFixed(1)}%
                </div>
              </div>

              {/* Expected Rewards */}
              <div className="space-y-1 text-xs mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Gold:</span>
                  <span className="text-yellow-400">{mission.expectedRewards.gold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Items:</span>
                  <span className="text-blue-400">{mission.expectedRewards.items}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">XP:</span>
                  <span className="text-green-400">{mission.expectedRewards.xp}</span>
                </div>
              </div>

              {/* Efficiency Score */}
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Efficiency:</span>
                  <span className={`text-sm font-bold ${efficiencyColor}`}>
                    {Math.round(efficiency.score)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {efficiency.recommendation}
                </p>
              </div>

              <p className="text-xs text-gray-400 mt-3 italic">
                {mission.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Special Actions */}
      <div className="border-t border-gray-700 pt-4">
        <h3 className="text-lg font-bold text-white mb-3">Other Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          {specialActions.map(action => (
            <div
              key={action.id}
              className={`${action.color} bg-opacity-50 rounded-lg p-4 border border-gray-600 hover:bg-opacity-70 transition-all cursor-pointer`}
              onClick={() => {
                if (action.id === 'shop') navigate('shop');
                // Handle rest action
              }}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{action.icon}</div>
                <div>
                  <h4 className="text-white font-bold">{action.name}</h4>
                  <p className="text-xs text-gray-300">{action.effect}</p>
                  <p className="text-xs text-yellow-400 mt-1">
                    Time: {action.timeCost} {action.timeCost === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sabotage Actions */}
      <div className="border-t border-gray-700 pt-4 mt-4">
        <h3 className="text-lg font-bold text-white mb-3">Sabotage Malachar</h3>
        <p className="text-sm text-gray-400 mb-3">
          Spend time to slow down the antagonist's progress:
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => doomsdaySystem.performSabotage('ritual_disruption')}
            className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm"
          >
            🔮 Disrupt Ritual (-10% progress, 3 days)
          </button>
          <button
            onClick={() => doomsdaySystem.performSabotage('seal_reinforcement')}
            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
          >
            🛡️ Reinforce Seals (Delay spike, 2 days)
          </button>
          <button
            onClick={() => doomsdaySystem.performSabotage('timeline_manipulation')}
            className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
          >
            ⏰ Bend Time (Half cost 5 days, 1 day)
          </button>
        </div>
      </div>
    </div>
  );
}
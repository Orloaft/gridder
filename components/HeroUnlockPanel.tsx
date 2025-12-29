'use client';

import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { HERO_TEMPLATES, getHeroGemCost } from '@/data/units';
import { Hero } from '@/types/core.types';

interface HeroUnlockPanelProps {
  onClose?: () => void;
  showOnlyAffordable?: boolean;
}

export function HeroUnlockPanel({ onClose, showOnlyAffordable = false }: HeroUnlockPanelProps) {
  const { player, roster, unlockHero } = useGameStore();
  const [selectedHero, setSelectedHero] = useState<string | null>(null);
  const [unlockingHero, setUnlockingHero] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState<string | null>(null);

  // Get list of unlockable heroes (not in roster)
  const unlockableHeroes = useMemo(() => {
    const rosterHeroIds = new Set(roster.map(h => h.id));
    return Object.values(HERO_TEMPLATES)
      .filter(hero => !rosterHeroIds.has(hero.id))
      .filter(hero => !showOnlyAffordable || getHeroGemCost(hero) <= player.gems)
      .sort((a, b) => getHeroGemCost(a) - getHeroGemCost(b));
  }, [roster, player.gems, showOnlyAffordable]);

  const handleUnlock = async (heroId: string) => {
    setUnlockingHero(heroId);

    // Simulate unlock animation delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = unlockHero(heroId);
    if (success) {
      setUnlockSuccess(heroId);
      setTimeout(() => {
        setUnlockSuccess(null);
        setSelectedHero(null);
      }, 2000);
    }

    setUnlockingHero(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-600 to-orange-600';
      case 'epic': return 'from-purple-600 to-pink-600';
      case 'rare': return 'from-blue-600 to-cyan-600';
      default: return 'from-gray-600 to-gray-700';
    }
  };

  const getRarityBorder = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-yellow-500';
      case 'epic': return 'border-purple-500';
      case 'rare': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Unlock Heroes</h2>
          <p className="text-gray-400 mt-1">Use gems earned from boss battles to unlock new heroes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-purple-900 px-4 py-2 rounded-lg">
            <span className="text-purple-300">💎 {player.gems} Gems</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Hero Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {unlockableHeroes.length > 0 ? (
          unlockableHeroes.map(hero => {
            const cost = getHeroGemCost(hero);
            const canAfford = player.gems >= cost;
            const isSelected = selectedHero === hero.id;
            const isUnlocking = unlockingHero === hero.id;
            const wasUnlocked = unlockSuccess === hero.id;

            return (
              <div
                key={hero.id}
                onClick={() => !isUnlocking && setSelectedHero(hero.id)}
                className={`
                  relative rounded-lg border-2 p-4 cursor-pointer transition-all
                  ${isSelected ? getRarityBorder(hero.rarity) : 'border-gray-700'}
                  ${canAfford ? 'hover:border-gray-500' : 'opacity-50'}
                  ${wasUnlocked ? 'animate-pulse bg-green-900' : 'bg-gray-800'}
                `}
              >
                {/* Rarity Gradient */}
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${getRarityColor(hero.rarity)} opacity-10`} />

                {/* Hero Icon */}
                <div className="text-4xl mb-2 text-center relative z-10">
                  {hero.icon}
                </div>

                {/* Hero Name */}
                <h3 className="text-white font-semibold text-center mb-1 relative z-10">
                  {hero.name}
                </h3>

                {/* Hero Stats Preview */}
                <div className="text-xs text-gray-400 space-y-1 mb-2 relative z-10">
                  <div className="flex justify-between">
                    <span>HP:</span>
                    <span className="text-red-400">{hero.baseStats.hp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DMG:</span>
                    <span className="text-orange-400">{hero.baseStats.damage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SPD:</span>
                    <span className="text-blue-400">{hero.baseStats.speed}</span>
                  </div>
                </div>

                {/* Cost */}
                <div className={`
                  text-center py-1 px-2 rounded relative z-10
                  ${canAfford ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-500'}
                `}>
                  💎 {cost} Gems
                </div>

                {/* Unlock Success Overlay */}
                {wasUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-900 bg-opacity-90 rounded-lg z-20">
                    <div className="text-green-300 text-lg font-bold">
                      ✓ Unlocked!
                    </div>
                  </div>
                )}

                {/* Unlocking Animation */}
                {isUnlocking && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 rounded-lg z-20">
                    <div className="text-purple-400 animate-spin text-2xl">
                      ⟳
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            {roster.length >= Object.keys(HERO_TEMPLATES).length
              ? "All heroes unlocked! 🎉"
              : "No heroes available to unlock at this time"}
          </div>
        )}
      </div>

      {/* Selected Hero Details */}
      {selectedHero && !unlockSuccess && (
        <div className="bg-gray-800 rounded-lg p-4 border-2 border-gray-700">
          {(() => {
            const hero = unlockableHeroes.find(h => h.id === selectedHero);
            if (!hero) return null;

            const cost = getHeroGemCost(hero);
            const canAfford = player.gems >= cost;

            return (
              <div className="flex gap-6">
                {/* Hero Portrait */}
                <div className="flex-shrink-0">
                  <div className={`
                    w-24 h-24 rounded-lg flex items-center justify-center text-5xl
                    bg-gradient-to-br ${getRarityColor(hero.rarity)}
                  `}>
                    {hero.icon}
                  </div>
                </div>

                {/* Hero Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{hero.name}</h3>
                    <span className={`
                      px-2 py-1 rounded text-xs font-semibold
                      ${hero.rarity === 'legendary' ? 'bg-yellow-600 text-yellow-100' :
                        hero.rarity === 'epic' ? 'bg-purple-600 text-purple-100' :
                        hero.rarity === 'rare' ? 'bg-blue-600 text-blue-100' :
                        'bg-gray-600 text-gray-100'}
                    `}>
                      {hero.rarity.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-3">{hero.description}</p>

                  {/* Abilities */}
                  <div className="mb-3">
                    <h4 className="text-white text-sm font-semibold mb-1">Starting Abilities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {hero.abilities.map(abilityId => (
                        <span key={abilityId} className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
                          {abilityId.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Health:</span>
                      <p className="text-red-400 font-semibold">{hero.baseStats.hp}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Damage:</span>
                      <p className="text-orange-400 font-semibold">{hero.baseStats.damage}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Speed:</span>
                      <p className="text-blue-400 font-semibold">{hero.baseStats.speed}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Range:</span>
                      <p className="text-green-400 font-semibold">{hero.baseStats.range}</p>
                    </div>
                  </div>
                </div>

                {/* Unlock Button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleUnlock(hero.id)}
                    disabled={!canAfford || unlockingHero !== null}
                    className={`
                      px-6 py-3 rounded-lg font-semibold transition-all
                      ${canAfford
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                    `}
                  >
                    {canAfford ? `Unlock for 💎 ${cost}` : `Need 💎 ${cost - player.gems} more`}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Gem Earning Tips */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-2">💡 How to Earn Gems</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
          <div>• Defeat mini-bosses (every 8th stage): 8-29 gems</div>
          <div>• Defeat major bosses (every 16th stage): 15-50 gems</div>
          <div>• Progress to higher locations for better rewards</div>
          <div>• Complete special events and challenges</div>
        </div>
      </div>
    </div>
  );
}
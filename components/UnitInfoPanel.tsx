'use client';

import React from 'react';
import Image from 'next/image';
import { GridHero, GridEnemy } from '@/types/grid.types';
import { HERO_TEMPLATES } from '@/data/units';
import { ENEMY_TEMPLATES } from '@/data/units';
import { Ability, UnitStats, ItemInstance, Hero } from '@/types/core.types';

interface UnitInfoPanelProps {
  unit: GridHero | GridEnemy | null;
  hoveredItem: ItemInstance | null;
  roster: Hero[];
  inventory: ItemInstance[];
  width?: number; // Optional width for responsive layouts
}

export function UnitInfoPanel({ unit, hoveredItem, roster, inventory, width = 320 }: UnitInfoPanelProps) {
  // If hovering over an item, show item details
  if (hoveredItem) {
    return <ItemInfoDisplay item={hoveredItem} width={width} />;
  }
  if (!unit) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg p-6 flex items-center justify-center" style={{ width }}>
        <p className="text-gray-500 text-center">
          Hover over a unit to see its details
        </p>
      </div>
    );
  }

  // Determine if it's a hero or enemy and get full template data
  const isHero = unit.type === 'hero';
  const unitData = isHero
    ? Object.values(HERO_TEMPLATES).find(h => h.name === unit.name)
    : Object.values(ENEMY_TEMPLATES).find(e => e.name === unit.name);

  const isImageSprite = unit.spritePath?.startsWith('/icons/');

  // Get abilities from template
  const abilities: Ability[] = unitData?.abilities || [];

  // Get stats (we'll need to enhance GridHero/GridEnemy to include full stats later)
  const stats: Partial<UnitStats> = {
    hp: unit.hp,
    maxHp: unit.maxHp,
    damage: unitData?.baseStats?.damage,
    speed: unitData?.baseStats?.speed,
    defense: unitData?.baseStats?.defense,
    critChance: unitData?.baseStats?.critChance,
    critDamage: unitData?.baseStats?.critDamage,
    evasion: unitData?.baseStats?.evasion,
    accuracy: unitData?.baseStats?.accuracy,
    penetration: unitData?.baseStats?.penetration,
    lifesteal: unitData?.baseStats?.lifesteal,
  };

  // Get equipped item if this is a hero
  let equippedItem: ItemInstance | null = null;
  if (isHero && (unit as GridHero).heroInstanceId) {
    const hero = roster.find(h => h.instanceId === (unit as GridHero).heroInstanceId);
    if (hero?.equippedItem) {
      equippedItem = inventory.find(i => i.instanceId === hero.equippedItem) || null;
    }
  }

  return (
    <div className={`h-full bg-gradient-to-br ${
      isHero
        ? 'from-blue-900/90 to-blue-800/90 border-blue-400'
        : 'from-red-900/90 to-red-800/90 border-red-400'
    } border-2 rounded-lg p-6 overflow-y-auto`} style={{ width }}>
      {/* Unit Header */}
      <div className="flex items-center gap-4 mb-4">
        {/* Sprite */}
        <div className="w-20 h-20 flex items-center justify-center bg-black/30 rounded-lg border-2 border-gray-700">
          {isImageSprite ? (
            <div className="relative w-full h-full">
              <Image
                src={unit.spritePath!}
                alt={unit.name}
                fill
                className="object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            <div className="text-5xl">
              {unit.spritePath || (isHero ? '🛡️' : '👹')}
            </div>
          )}
        </div>

        {/* Name and Class */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1">{unit.name}</h2>
          {isHero ? (
            <p className="text-sm text-blue-300">{(unit as GridHero).heroClass}</p>
          ) : (
            <p className="text-sm text-red-300">{(unit as GridEnemy).enemyType || 'Enemy'}</p>
          )}
          {unitData?.title && (
            <p className="text-xs text-gray-400 italic">{unitData.title}</p>
          )}
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-300 mb-1">
          <span>Health</span>
          <span>{Math.floor(unit.hp)} / {unit.maxHp}</span>
        </div>
        <div className="w-full bg-black/60 rounded-full h-3 border border-gray-600">
          <div
            className={`h-full rounded-full transition-all ${
              isHero ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {stats.damage !== undefined && (
            <StatRow label="Damage" value={stats.damage} />
          )}
          {stats.defense !== undefined && (
            <StatRow label="Defense" value={stats.defense} />
          )}
          {stats.speed !== undefined && (
            <StatRow label="Speed" value={stats.speed} />
          )}
          {stats.critChance !== undefined && (
            <StatRow label="Crit Chance" value={`${(stats.critChance * 100).toFixed(0)}%`} />
          )}
          {stats.critDamage !== undefined && (
            <StatRow label="Crit Damage" value={`${(stats.critDamage * 100).toFixed(0)}%`} />
          )}
          {stats.evasion !== undefined && stats.evasion > 0 && (
            <StatRow label="Evasion" value={`${(stats.evasion * 100).toFixed(0)}%`} />
          )}
          {stats.accuracy !== undefined && (
            <StatRow label="Accuracy" value={`${(stats.accuracy * 100).toFixed(0)}%`} />
          )}
          {stats.penetration !== undefined && stats.penetration > 0 && (
            <StatRow label="Penetration" value={`${(stats.penetration * 100).toFixed(0)}%`} />
          )}
          {stats.lifesteal !== undefined && stats.lifesteal > 0 && (
            <StatRow label="Lifesteal" value={`${(stats.lifesteal * 100).toFixed(0)}%`} />
          )}
        </div>
      </div>

      {/* Abilities */}
      {abilities.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Abilities</h3>
          <div className="space-y-3">
            {abilities.map((ability, index) => (
              <div
                key={ability.id}
                className="bg-black/30 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-white">{ability.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ability.type === 'offensive'
                      ? 'bg-red-700 text-red-200'
                      : ability.type === 'defensive'
                      ? 'bg-blue-700 text-blue-200'
                      : 'bg-green-700 text-green-200'
                  }`}>
                    {ability.type}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{ability.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Cooldown: {ability.cooldown}</span>
                  {ability.effects.length > 0 && (
                    <span>Effects: {ability.effects.length}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipped Item */}
      {equippedItem && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Equipped Item</h3>
          <div className="bg-black/30 rounded-lg p-3 border-2 border-yellow-500/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 flex items-center justify-center bg-black/30 rounded border border-gray-700 overflow-hidden">
                {equippedItem.spritePath?.startsWith('/icons/') ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={equippedItem.spritePath}
                      alt={equippedItem.name}
                      fill
                      className="object-contain pixelated"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                ) : (
                  <div className="text-3xl">{equippedItem.spritePath || '🗡️'}</div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{equippedItem.name}</h4>
                <p className={`text-xs ${getRarityTextColor(equippedItem.rarity)}`}>
                  {equippedItem.rarity.charAt(0).toUpperCase() + equippedItem.rarity.slice(1)}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">{equippedItem.description}</p>
            <div className="space-y-1">
              {equippedItem.effects.map((effect, idx) => (
                <div key={idx} className="text-xs text-green-400 flex items-center gap-1">
                  <span>+</span>
                  <span>{effect.type === 'add' ? effect.value : `${(effect.value * 100).toFixed(0)}%`}</span>
                  <span className="text-gray-400">{effect.stat}</span>
                </div>
              ))}
            </div>
            {equippedItem.consumable && (
              <div className="mt-2 text-xs text-red-400">⚠ Consumable (One-time use)</div>
            )}
            {equippedItem.permanent && (
              <div className="mt-2 text-xs text-blue-400">✨ Permanent Effect</div>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {unitData?.description && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 italic">{unitData.description}</p>
        </div>
      )}

      {/* Tags */}
      {unitData?.tags && unitData.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {unitData.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between bg-black/20 rounded px-2 py-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

function getRarityTextColor(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'text-gray-300';
    case 'uncommon':
      return 'text-green-300';
    case 'rare':
      return 'text-blue-300';
    case 'epic':
      return 'text-purple-300';
    case 'legendary':
      return 'text-yellow-300';
    default:
      return 'text-gray-300';
  }
}

function getRarityBorderColor(rarity: string) {
  switch (rarity) {
    case 'common':
      return 'border-gray-400';
    case 'uncommon':
      return 'border-green-400';
    case 'rare':
      return 'border-blue-400';
    case 'epic':
      return 'border-purple-400';
    case 'legendary':
      return 'border-yellow-400';
    default:
      return 'border-gray-400';
  }
}

function ItemInfoDisplay({ item, width = 320 }: { item: ItemInstance; width?: number }) {
  const isImageSprite = item.spritePath?.startsWith('/icons/');

  return (
    <div className={`h-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 ${getRarityBorderColor(item.rarity)} rounded-lg p-6 overflow-y-auto`} style={{ width }}>
      {/* Item Header */}
      <div className="flex items-center gap-4 mb-4">
        {/* Icon */}
        <div className="w-20 h-20 flex items-center justify-center bg-black/30 rounded-lg border-2 border-gray-700 overflow-hidden">
          {isImageSprite ? (
            <div className="relative w-full h-full">
              <Image
                src={item.spritePath!}
                alt={item.name}
                fill
                className="object-contain pixelated"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ) : (
            <div className="text-5xl">
              {item.spritePath || '🗡️'}
            </div>
          )}
        </div>

        {/* Name and Rarity */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-1">{item.name}</h2>
          <p className={`text-sm ${getRarityTextColor(item.rarity)} font-semibold`}>
            {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
          </p>
          <p className="text-xs text-gray-400">{item.slot.charAt(0).toUpperCase() + item.slot.slice(1)}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4 bg-black/20 rounded-lg p-3 border border-gray-700">
        <p className="text-sm text-gray-300">{item.description}</p>
      </div>

      {/* Cost */}
      <div className="mb-4">
        <div className="bg-yellow-900/30 rounded-lg p-3 border border-yellow-700/50 flex items-center justify-between">
          <span className="text-sm text-gray-300">Cost</span>
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <span className="text-lg font-bold text-yellow-400">{item.cost}</span>
          </div>
        </div>
      </div>

      {/* Effects */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Effects</h3>
        <div className="space-y-2">
          {item.effects.map((effect, idx) => (
            <div
              key={idx}
              className="bg-black/30 rounded-lg p-3 border border-green-700/50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase">{effect.stat}</span>
                <span className="text-sm font-bold text-green-400">
                  {effect.type === 'add' ? `+${effect.value}` : `+${((effect.value - 1) * 100).toFixed(0)}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Properties */}
      <div className="space-y-2">
        {item.consumable && (
          <div className="bg-red-900/30 rounded-lg p-3 border border-red-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-sm font-semibold text-red-300">Consumable</h4>
                <p className="text-xs text-gray-400">Item is consumed after one use</p>
              </div>
            </div>
          </div>
        )}

        {item.permanent && (
          <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <div>
                <h4 className="text-sm font-semibold text-blue-300">Permanent Effect</h4>
                <p className="text-xs text-gray-400">Effects persist after removal</p>
              </div>
            </div>
          </div>
        )}

        {item.equippedTo && (
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-700/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">✓</span>
              <div>
                <h4 className="text-sm font-semibold text-green-300">Equipped</h4>
                <p className="text-xs text-gray-400">Currently equipped to a hero</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

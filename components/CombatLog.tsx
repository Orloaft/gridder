'use client';

import React, { useRef, useEffect } from 'react';
import { BattleEvent, BattleEventType } from '@/systems/BattleSimulator';

interface CombatLogProps {
  events: BattleEvent[];
  currentEventIndex: number;
  width: number;
}

export function CombatLog({ events, currentEventIndex, width }: CombatLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [currentEventIndex]);

  // Only show events up to current index
  const visibleEvents = events.slice(0, currentEventIndex + 1);

  // Format event into readable text with color coding
  const formatEvent = (event: BattleEvent, index: number) => {
    const { type, data } = event;

    let message = '';
    let colorClass = 'text-gray-300';
    let icon = '';

    switch (type) {
      case BattleEventType.BattleStart:
        message = `⚔️ Battle begins! Heroes vs ${data.enemies.join(', ')}`;
        colorClass = 'text-blue-400 font-bold';
        icon = '⚔️';
        break;

      case BattleEventType.Tick:
        // Skip tick events in the log for cleaner output
        return null;

      case BattleEventType.Move:
        message = `${data.unit} moves`;
        colorClass = 'text-gray-400 text-sm';
        icon = '👣';
        break;

      case BattleEventType.Attack:
        message = `${data.attacker} attacks ${data.target}${data.isCrit ? ' (CRIT!)' : ''}`;
        colorClass = data.isCrit ? 'text-yellow-400' : 'text-orange-300';
        icon = data.isCrit ? '💥' : '⚔️';
        break;

      case BattleEventType.Damage:
        if (data.source === 'DoT') {
          message = `${data.target} takes ${data.damage} ${data.statusType} damage`;
          colorClass = 'text-purple-400 text-sm';
          icon = '🔥';
        } else if (data.source === 'ability') {
          message = `${data.target} takes ${data.damage} damage from ${data.abilityName} (${data.remainingHp} HP)`;
          colorClass = 'text-cyan-300';
          icon = '✨';
        } else {
          message = `${data.target} takes ${data.damage} damage (${data.remainingHp} HP)`;
          colorClass = 'text-red-300';
          icon = '💔';
        }
        break;

      case BattleEventType.Heal:
        message = `${data.unit} heals ${data.amount} HP${data.source ? ` (${data.source})` : ''}`;
        colorClass = 'text-green-400';
        icon = '💚';
        break;

      case BattleEventType.Death:
        message = `${data.unit} has been defeated!${data.cause ? ` (${data.cause})` : ''}`;
        colorClass = 'text-red-500 font-bold';
        icon = '💀';
        break;

      case BattleEventType.Victory:
        message = '🎉 VICTORY! Heroes triumph!';
        colorClass = 'text-green-500 font-bold text-lg';
        icon = '🎉';
        break;

      case BattleEventType.Defeat:
        message = '💀 DEFEAT! Heroes have fallen...';
        colorClass = 'text-red-500 font-bold text-lg';
        icon = '💀';
        break;

      case BattleEventType.CriticalHit:
        message = `${data.attacker} lands a critical hit on ${data.target}!`;
        colorClass = 'text-yellow-400 font-bold';
        icon = '⭐';
        break;

      case BattleEventType.Evaded:
        message = `${data.target} evades ${data.attacker}'s attack!`;
        colorClass = 'text-cyan-400';
        icon = '💨';
        break;

      case BattleEventType.StatusApplied:
        message = `${data.unit} is afflicted with ${data.statusType}`;
        colorClass = 'text-purple-400';
        icon = '✨';
        break;

      case BattleEventType.StatusExpired:
        message = `${data.statusType} fades from ${data.unit}`;
        colorClass = 'text-gray-500 text-sm';
        icon = '⏱️';
        break;

      case BattleEventType.AbilityUsed:
        message = `${data.attacker} uses ${data.abilityName}!`;
        colorClass = 'text-cyan-300 font-bold';
        icon = '✨';
        break;

      default:
        message = `Unknown event: ${type}`;
        colorClass = 'text-gray-500';
    }

    if (!message) return null;

    return (
      <div
        key={index}
        className={`px-3 py-1 border-b border-gray-700/50 ${colorClass} transition-all duration-200 hover:bg-gray-700/30`}
      >
        <span className="mr-2 opacity-70">{icon}</span>
        {message}
      </div>
    );
  };

  return (
    <div
      className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-2 border-gray-700 rounded-lg flex flex-col h-full overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="bg-gray-800/50 border-b-2 border-gray-700 px-4 py-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          📜 Combat Log
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Event Log */}
      <div
        ref={logRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {visibleEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <div className="text-4xl mb-2 opacity-30">⚔️</div>
            <p className="text-sm text-center">
              Waiting for battle to begin...
            </p>
          </div>
        ) : (
          <div className="text-sm">
            {visibleEvents.map((event, index) => formatEvent(event, index))}
          </div>
        )}
      </div>

      {/* Footer - Battle Summary */}
      {visibleEvents.length > 0 && (
        <div className="bg-gray-800/50 border-t-2 border-gray-700 px-4 py-2">
          <p className="text-xs text-gray-500">
            Event {currentEventIndex + 1} of {events.length}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { DoomsdayEvent } from '@/systems/DoomsdaySystem';

interface DoomsdayEventModalProps {
  event: DoomsdayEvent | null;
  onClose: () => void;
}

export function DoomsdayEventModal({ event, onClose }: DoomsdayEventModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'showing' | 'exiting'>('entering');

  useEffect(() => {
    if (event) {
      setIsVisible(true);
      setAnimationPhase('entering');

      const enterTimeout = setTimeout(() => {
        setAnimationPhase('showing');
      }, 100);

      return () => clearTimeout(enterTimeout);
    } else {
      setAnimationPhase('exiting');
      const exitTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 300);

      return () => clearTimeout(exitTimeout);
    }
  }, [event]);

  if (!isVisible || !event) return null;

  // Determine event severity for styling
  const getEventSeverity = () => {
    if (event.id === 'apocalypse') return 'apocalypse';
    if (event.day >= 25) return 'critical';
    if (event.day >= 15) return 'high';
    if (event.day >= 10) return 'medium';
    return 'low';
  };

  const severity = getEventSeverity();

  // Get styling based on severity
  const getSeverityStyles = () => {
    switch (severity) {
      case 'apocalypse':
        return {
          border: 'border-red-500',
          bg: 'bg-gradient-to-b from-red-950 to-black',
          title: 'text-red-400',
          glow: 'shadow-red-500/50'
        };
      case 'critical':
        return {
          border: 'border-orange-500',
          bg: 'bg-gradient-to-b from-orange-950 to-black',
          title: 'text-orange-400',
          glow: 'shadow-orange-500/50'
        };
      case 'high':
        return {
          border: 'border-yellow-500',
          bg: 'bg-gradient-to-b from-yellow-950 to-black',
          title: 'text-yellow-400',
          glow: 'shadow-yellow-500/50'
        };
      default:
        return {
          border: 'border-purple-500',
          bg: 'bg-gradient-to-b from-purple-950 to-black',
          title: 'text-purple-400',
          glow: 'shadow-purple-500/50'
        };
    }
  };

  const styles = getSeverityStyles();

  // Get animation class
  const getAnimationClass = () => {
    switch (animationPhase) {
      case 'entering':
        return 'scale-0 opacity-0';
      case 'showing':
        return 'scale-100 opacity-100';
      case 'exiting':
        return 'scale-0 opacity-0';
    }
  };

  // Get event icon based on type
  const getEventIcon = () => {
    if (event.id.includes('seal')) return '🔮';
    if (event.id.includes('legion')) return '⚔️';
    if (event.id.includes('blood_moon')) return '🌙';
    if (event.id.includes('ascension')) return '👁️';
    if (event.id === 'apocalypse') return '💀';
    return '⚡';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-[9997] ${
          animationPhase === 'showing' ? 'bg-opacity-80' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-[9998] pointer-events-none`}
      >
        <div
          className={`
            ${styles.bg} ${styles.border} border-4 rounded-lg
            shadow-2xl ${styles.glow} shadow-2xl
            transform transition-all duration-300
            ${getAnimationClass()}
            pointer-events-auto max-w-2xl w-full mx-4
            ${severity === 'apocalypse' ? 'animate-pulse' : ''}
          `}
        >
          {/* Header */}
          <div className="border-b border-gray-700 p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl animate-pulse">{getEventIcon()}</div>
                <div>
                  <h2 className={`text-3xl font-bold ${styles.title}`}>
                    Day {event.day} - Doomsday Event
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">{event.title}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              {event.description}
            </p>

            {/* Special effects for specific events */}
            {event.id === 'first_seal_broken' && (
              <div className="bg-black bg-opacity-50 rounded p-4 border border-purple-600">
                <h3 className="text-purple-400 font-bold mb-2">Global Effect Active:</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• All enemies gain +10% health</li>
                  <li>• All enemies gain +10% damage</li>
                  <li>• Shadow energy permeates the battlefield</li>
                </ul>
              </div>
            )}

            {event.id === 'legion_invasion' && (
              <div className="bg-black bg-opacity-50 rounded p-4 border border-red-600">
                <h3 className="text-red-400 font-bold mb-2">Enemy Reinforcements:</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• Enemy spawn rate increased by 50%</li>
                  <li>• New enemy types have appeared</li>
                  <li>• Legion commanders grant buffs to nearby enemies</li>
                </ul>
              </div>
            )}

            {event.id === 'blood_moon' && (
              <div className="bg-black bg-opacity-50 rounded p-4 border border-red-700">
                <h3 className="text-red-400 font-bold mb-2">Blood Moon Effects:</h3>
                <ul className="text-gray-300 space-y-1">
                  <li>• All enemies gain 15% lifesteal</li>
                  <li>• Enemy critical chance increased by 25%</li>
                  <li>• Hero healing reduced by 10%</li>
                  <li>• Darkness limits vision range</li>
                </ul>
              </div>
            )}

            {event.id === 'apocalypse' && (
              <div className="bg-red-900 bg-opacity-50 rounded p-4 border-2 border-red-500 animate-pulse">
                <h3 className="text-red-300 font-bold text-xl mb-2">THE END HAS COME</h3>
                <p className="text-red-200">
                  Malachar's ritual is complete. The void consumes all.
                  Your heroes fought valiantly, but time ran out...
                </p>
                <div className="mt-4 text-center">
                  <p className="text-white text-2xl font-bold">GAME OVER</p>
                </div>
              </div>
            )}

            {/* Choices if available */}
            {event.choices && event.choices.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="text-gray-400 font-bold mb-2">Choose your response:</h3>
                {event.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      choice.outcome();
                      onClose();
                    }}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg p-3 text-left transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{choice.text}</span>
                      {choice.timeCost > 0 && (
                        <span className="text-yellow-400 text-sm">
                          Cost: {choice.timeCost} {choice.timeCost === 1 ? 'day' : 'days'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Ritual Progress: {event.day <= 30 ? `${(event.day * 3.33).toFixed(1)}%` : '100%'}
              </div>
              {severity !== 'apocalypse' && (
                <button
                  onClick={onClose}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extra visual effects for apocalypse */}
      {severity === 'apocalypse' && (
        <div className="fixed inset-0 pointer-events-none z-[9996]">
          <div className="absolute inset-0 bg-red-900 opacity-20 animate-pulse" />
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at center, transparent 40%, rgba(139, 0, 0, 0.5) 100%)'
            }}
          />
        </div>
      )}
    </>
  );
}
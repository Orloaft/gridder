'use client';

import { useEffect, useState } from 'react';
import { doomsdaySystem } from '@/systems/DoomsdaySystem';

interface TimePassageAnimationProps {
  show: boolean;
  daysElapsed: number;
  previousDay: number;
  newDay: number;
  action: string;
  onComplete?: () => void;
}

export function TimePassageAnimation({
  show,
  daysElapsed,
  previousDay,
  newDay,
  action,
  onComplete
}: TimePassageAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'showing' | 'exiting' | 'hidden'>('hidden');
  const [displayDay, setDisplayDay] = useState(previousDay);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show && !isAnimating) {
      // Prevent multiple animations from triggering
      setIsAnimating(true);

      // Start animation sequence
      setAnimationPhase('entering');
      setDisplayDay(previousDay);

      // Phase 1: Enter (fade in)
      const enterTimeout = setTimeout(() => {
        setAnimationPhase('showing');

        // Animate day counter
        const dayIncrement = daysElapsed / 10; // Animate over 10 frames
        let currentDay = previousDay;
        const animateInterval = setInterval(() => {
          currentDay += dayIncrement;
          if (currentDay >= newDay) {
            currentDay = newDay;
            setDisplayDay(Math.floor(currentDay));
            clearInterval(animateInterval);
          } else {
            setDisplayDay(Math.floor(currentDay));
          }
        }, 100);

        // Phase 2: Show for a moment
        const showTimeout = setTimeout(() => {
          setAnimationPhase('exiting');

          // Phase 3: Exit
          const exitTimeout = setTimeout(() => {
            setAnimationPhase('hidden');
            setIsAnimating(false); // Reset flag after animation completes
            if (onComplete) onComplete();
          }, 500);

          return () => clearTimeout(exitTimeout);
        }, 1500);

        return () => {
          clearTimeout(showTimeout);
          clearInterval(animateInterval);
        };
      }, 100);

      return () => clearTimeout(enterTimeout);
    }
  }, [show, daysElapsed, previousDay, newDay, onComplete]);

  if (animationPhase === 'hidden') return null;

  const urgencyLevel = doomsdaySystem.getUrgencyLevel();
  const daysUntilDoom = Math.max(0, Math.floor(doomsdaySystem.getDaysUntilDoom()));

  // Get animation classes based on phase
  const getAnimationClass = () => {
    switch (animationPhase) {
      case 'entering':
        return 'animate-fade-in opacity-0';
      case 'showing':
        return 'opacity-100';
      case 'exiting':
        return 'animate-fade-out opacity-100';
      default:
        return 'opacity-0';
    }
  };

  // Get urgency color
  const getUrgencyColor = () => {
    switch (urgencyLevel) {
      case 'critical':
        return 'from-red-900 to-black';
      case 'high':
        return 'from-orange-900 to-black';
      case 'medium':
        return 'from-yellow-900 to-black';
      default:
        return 'from-purple-900 to-black';
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none ${getAnimationClass()}`}
      style={{
        transition: 'opacity 500ms ease-in-out',
        background: `radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.8) 100%)`
      }}
    >
      {/* Calendar Pages Animation */}
      <div className="relative">
        {/* Main Display */}
        <div className={`bg-gradient-to-b ${getUrgencyColor()} border-4 border-gray-700 rounded-lg p-8 shadow-2xl`}>
          {/* Action Text */}
          <div className="text-center mb-4">
            <p className="text-gray-400 text-sm uppercase tracking-wide">{action}</p>
          </div>

          {/* Day Counter */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-white mb-2">
              Day {displayDay}
              {daysElapsed > 0 && (
                <span className="text-3xl text-yellow-400 ml-4">
                  +{daysElapsed}
                </span>
              )}
            </div>

            <div className="text-xl text-gray-300">
              <i className="text-2xl mr-2">→</i>
              Day {newDay}
            </div>
          </div>

          {/* Time Remaining Warning */}
          <div className="text-center">
            <div className={`text-lg ${urgencyLevel === 'critical' ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
              {daysUntilDoom} days until doom
            </div>

            {urgencyLevel === 'critical' && (
              <div className="text-red-400 text-sm mt-2 animate-pulse">
                ⚠️ TIME IS RUNNING OUT ⚠️
              </div>
            )}
          </div>

          {/* Ritual Progress Increment */}
          {daysElapsed > 0 && (
            <div className="mt-4 text-center">
              <div className="text-sm text-purple-400">
                Void Ritual Progress: +{(daysElapsed * 3.33).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Calendar page flip effect */}
        {animationPhase === 'showing' && daysElapsed > 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.min(3, daysElapsed) }, (_, i) => (
              <div
                key={i}
                className="absolute inset-0 bg-gray-800 border-4 border-gray-700 rounded-lg opacity-30"
                style={{
                  transform: `translateY(-${(i + 1) * 4}px) translateX(${(i + 1) * 4}px)`,
                  zIndex: -i - 1
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Time particles effect */}
      {animationPhase === 'showing' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-400 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Add these to your global CSS
const globalStyles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.1);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  50% {
    transform: translateY(-100px) translateX(20px);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.animate-fade-out {
  animation: fade-out 0.5s ease-in forwards;
}

.animate-float {
  animation: float linear infinite;
}
`;
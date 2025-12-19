'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export interface LoadingBarProps {
  onComplete: () => void;
  duration?: number; // Duration in seconds
}

export function LoadingBar({ onComplete, duration = 2 }: LoadingBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!fillRef.current || !barRef.current) return;

    // Animate the loading bar fill
    gsap.to(fillRef.current, {
      width: '100%',
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: function() {
        const progressValue = Math.round(this.progress() * 100);
        setProgress(progressValue);
      },
      onComplete: () => {
        setIsComplete(true);
      },
    });

    // Pulse animation on the bar container
    gsap.to(barRef.current, {
      boxShadow: '0 0 40px rgba(139, 92, 246, 0.8)',
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, [duration, onComplete]);

  const handleStartClick = () => {
    if (!isComplete) return;

    // Fade out the loading bar
    if (barRef.current) {
      gsap.to(barRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onComplete,
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div
        ref={barRef}
        className="flex flex-col items-center gap-4"
        style={{ width: '400px' }}
      >
        {/* Game Title */}
        <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
          GRIDDER
        </div>

        {/* Loading Bar Container */}
        <div className="w-full h-6 bg-gray-800 rounded-full border-2 border-purple-500 overflow-hidden shadow-lg">
          {/* Loading Bar Fill */}
          <div
            ref={fillRef}
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 rounded-full relative"
            style={{ width: '0%' }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer" />
          </div>
        </div>

        {/* Progress Text */}
        <div className="text-lg font-semibold text-purple-300">
          {progress}%
        </div>

        {/* Loading hint or Start button */}
        {isComplete ? (
          <button
            onClick={handleStartClick}
            className="mt-4 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-105 active:scale-95"
          >
            Click to Start
          </button>
        ) : (
          <div className="text-sm text-gray-400 animate-pulse">
            Loading assets...
          </div>
        )}
      </div>
    </div>
  );
}

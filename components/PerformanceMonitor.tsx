'use client';

import { useEffect, useState, useRef } from 'react';
import { perfMonitor, elementCache, timelinePool } from '@/utils/animationOptimizer';

interface PerformanceStats {
  fps: number;
  frameCount: number;
  queryCount: number;
  timelinePoolSize: number;
  activeTimelines: number;
  memoryUsage?: number;
}

export function PerformanceMonitor({ enabled = false }: { enabled?: boolean }) {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    frameCount: 0,
    queryCount: 0,
    timelinePoolSize: 0,
    activeTimelines: 0,
  });
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    // Start monitoring
    perfMonitor.start();

    // Update stats every 100ms
    intervalRef.current = setInterval(() => {
      const newStats: PerformanceStats = {
        fps: perfMonitor.getFPS(),
        frameCount: perfMonitor.getFrameCount(),
        queryCount: elementCache.getQueryCount(),
        timelinePoolSize: timelinePool.getPoolSize(),
        activeTimelines: timelinePool.getActiveCount(),
      };

      // Add memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        newStats.memoryUsage = Math.round(memory.usedJSHeapSize / 1048576); // Convert to MB
      }

      setStats(newStats);
    }, 100);

    // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      perfMonitor.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [enabled]);

  if (!enabled || !isVisible) return null;

  // FPS color coding
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div
      className="fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono z-[9999] min-w-[200px]"
      style={{ pointerEvents: 'none' }}
    >
      <div className="mb-2 text-gray-400 text-[10px]">Performance Monitor</div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={getFPSColor(stats.fps)}>{stats.fps}</span>
        </div>

        <div className="flex justify-between">
          <span>Frames:</span>
          <span>{stats.frameCount}</span>
        </div>

        <div className="flex justify-between">
          <span>DOM Queries:</span>
          <span className={stats.queryCount > 100 ? 'text-yellow-400' : ''}>{stats.queryCount}</span>
        </div>

        <div className="flex justify-between">
          <span>Timeline Pool:</span>
          <span>{stats.timelinePoolSize}</span>
        </div>

        <div className="flex justify-between">
          <span>Active Timelines:</span>
          <span className={stats.activeTimelines > 10 ? 'text-yellow-400' : ''}>{stats.activeTimelines}</span>
        </div>

        {stats.memoryUsage !== undefined && (
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className={stats.memoryUsage > 100 ? 'text-yellow-400' : ''}>{stats.memoryUsage} MB</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-600 text-[10px] text-gray-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}
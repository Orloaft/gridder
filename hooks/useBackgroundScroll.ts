import { useState, useEffect } from 'react';

/**
 * Hook to manage background scroll state during wave transitions.
 * Listens for 'waveTransition' CustomEvent and resets scroll when battle ends.
 * @param currentBattle - The current battle object, or null if no battle is active.
 */
export function useBackgroundScroll(currentBattle: any) {
  const [backgroundScrollX, setBackgroundScrollX] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle background scrolling for wave transitions
  useEffect(() => {
    const handleWaveTransition = (event: CustomEvent) => {
      const { scrollDistance } = event.detail;
      setBackgroundScrollX(prev => {
        const newScrollX = prev + scrollDistance;
        return newScrollX;
      });
      setIsScrolling(true);

      // Reset scrolling flag after animation
      setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    window.addEventListener('waveTransition', handleWaveTransition as any);

    return () => {
      window.removeEventListener('waveTransition', handleWaveTransition as any);
    };
  }, []);

  // Reset scroll when battle ends
  useEffect(() => {
    if (!currentBattle) {
      setBackgroundScrollX(0);
    }
  }, [currentBattle]);

  return { backgroundScrollX, isScrolling };
}

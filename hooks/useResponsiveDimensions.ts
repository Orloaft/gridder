/**
 * useResponsiveDimensions Hook
 *
 * Provides responsive dimensions for the grid system
 */

import { useState, useEffect } from 'react';

export function useResponsiveDimensions() {
  const [dimensions, setDimensions] = useState({
    mainGridCellSize: 60,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Calculate cell size based on window size
      let cellSize = 60;
      if (width < 768) {
        cellSize = 40;
      } else if (width < 1024) {
        cellSize = 50;
      } else if (width < 1440) {
        cellSize = 60;
      } else {
        cellSize = 70;
      }

      setDimensions({
        mainGridCellSize: cellSize,
        windowWidth: width,
        windowHeight: height,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return dimensions;
}
'use client';

import React from 'react';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function ZoomControls({ zoomLevel, onZoomIn, onZoomOut, onResetZoom }: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);
  const canZoomIn = zoomLevel < 1.5;
  const canZoomOut = zoomLevel > 0.5;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {/* Zoom In Button */}
      <button
        onClick={onZoomIn}
        disabled={!canZoomIn}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          transition-all shadow-lg
          ${canZoomIn
            ? 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-500 hover:scale-110'
            : 'bg-gray-900 border-2 border-gray-700 opacity-50 cursor-not-allowed'
          }
        `}
        title="Zoom In (+)"
      >
        <svg
          className="w-6 h-6 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
          />
        </svg>
      </button>

      {/* Zoom Level Display */}
      <button
        onClick={onResetZoom}
        className="w-12 h-12 bg-gray-800 hover:bg-gray-700 border-2 border-gray-500 rounded-lg flex items-center justify-center transition-all hover:scale-110 shadow-lg"
        title="Reset Zoom (100%)"
      >
        <span className="text-xs font-bold text-gray-300">{zoomPercentage}%</span>
      </button>

      {/* Zoom Out Button */}
      <button
        onClick={onZoomOut}
        disabled={!canZoomOut}
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          transition-all shadow-lg
          ${canZoomOut
            ? 'bg-gray-800 hover:bg-gray-700 border-2 border-gray-500 hover:scale-110'
            : 'bg-gray-900 border-2 border-gray-700 opacity-50 cursor-not-allowed'
          }
        `}
        title="Zoom Out (-)"
      >
        <svg
          className="w-6 h-6 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          />
        </svg>
      </button>
    </div>
  );
}

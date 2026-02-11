'use client';

import React from 'react';

interface RetreatEarnings {
  currentWave: number;
  totalWaves: number;
  baseGold: number;
  medicalCosts: number;
  netGold: number;
  goldMultiplier: number;
  faintedCount: number;
}

interface RetreatConfirmationProps {
  show: boolean;
  earnings: RetreatEarnings | null;
  stageBaseGold: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const RetreatConfirmation: React.FC<RetreatConfirmationProps> = ({
  show,
  earnings,
  stageBaseGold,
  onConfirm,
  onCancel,
}) => {
  if (!show || !earnings) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center"
      style={{ zIndex: 10000 }}
    >
      <div className="bg-gray-800 border-4 border-yellow-600 rounded-lg p-8 max-w-md shadow-2xl">
        <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
          Retreat from Battle?
        </h2>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-900 rounded p-4 border-2 border-gray-700">
            <p className="text-gray-300 text-sm mb-2">Progress:</p>
            <p className="text-white text-xl font-bold">
              Wave {earnings.currentWave} / {earnings.totalWaves}
            </p>
          </div>

          <div className="bg-gray-900 rounded p-4 border-2 border-gray-700">
            <p className="text-gray-300 text-sm mb-2">Earnings Summary:</p>

            <div className="space-y-2 text-white">
              <div className="flex justify-between">
                <span>Base Gold (50%):</span>
                <span className="text-yellow-400">
                  +{Math.floor(stageBaseGold * 0.5)}g
                </span>
              </div>

              {earnings.goldMultiplier > 1.0 && (
                <div className="flex justify-between">
                  <span>Wave Multiplier:</span>
                  <span className="text-green-400">&times;{earnings.goldMultiplier.toFixed(1)}</span>
                </div>
              )}

              {earnings.faintedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-400">Medical Costs ({earnings.faintedCount} hero{earnings.faintedCount > 1 ? 'es' : ''}):</span>
                  <span className="text-red-400">-{earnings.medicalCosts}g</span>
                </div>
              )}

              <div className="border-t-2 border-gray-600 pt-2 mt-2">
                <div className="flex justify-between text-xl font-bold">
                  <span>Net Profit:</span>
                  <span className={earnings.netGold > 0 ? 'text-green-400' : 'text-red-400'}>
                    {earnings.netGold > 0 ? '+' : ''}{earnings.netGold}g
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-red-900 bg-opacity-30 border-2 border-red-600 rounded p-3">
            <p className="text-red-300 text-sm text-center">
              No XP or item rewards on retreat
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-gray-500 transition-all hover:scale-105"
          >
            Continue Battle
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-red-500 transition-all hover:scale-105"
          >
            Retreat
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RetreatConfirmation);

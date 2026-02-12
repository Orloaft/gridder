'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import {
  RevealPhase,
  RevealState,
  BattleRewards,
  RewardItem,
} from '@/systems/RewardRevealManager';
import { Rarity } from '@/types/core.types';
import { RARITY_HEX } from '@/utils/constants';
import {
  animateVictorySplash,
  animateCurrencyReveal,
  animateRarityExplosion,
  animateSummaryEntrance,
  animateRewardExit,
  animateScreenShake,
} from '@/animations/rewardAnimations';

interface RewardRevealOverlayProps {
  active: boolean;
  phase: RevealPhase;
  revealState: RevealState | null;
  rewards: BattleRewards | null;
  currentRevealItem: RewardItem | null;
  currentRevealIndex: number;
  onSkip: () => void;
  onContinue: () => void;
}

export function RewardRevealOverlay({
  active,
  phase,
  revealState,
  rewards,
  currentRevealItem,
  currentRevealIndex,
  onSkip,
  onContinue,
}: RewardRevealOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const victorySectionRef = useRef<HTMLDivElement>(null);
  const currencySectionRef = useRef<HTMLDivElement>(null);
  const itemRevealSectionRef = useRef<HTMLDivElement>(null);
  const summarySectionRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const goldCounterRef = useRef<HTMLSpanElement>(null);
  const gemCounterRef = useRef<HTMLSpanElement>(null);
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const lastPhaseRef = useRef<RevealPhase | null>(null);
  const lastRevealIndexRef = useRef<number>(-1);

  // Cleanup active timeline
  const killTimeline = useCallback(() => {
    if (activeTimelineRef.current) {
      activeTimelineRef.current.kill();
      activeTimelineRef.current = null;
    }
  }, []);

  // Phase change animations
  useEffect(() => {
    if (!active || !overlayRef.current || phase === lastPhaseRef.current) return;
    lastPhaseRef.current = phase;

    killTimeline();

    switch (phase) {
      case RevealPhase.VictorySplash: {
        if (victorySectionRef.current) {
          activeTimelineRef.current = animateVictorySplash(victorySectionRef.current);
        }
        break;
      }

      case RevealPhase.CurrencyReveal: {
        if (currencySectionRef.current && rewards) {
          const breakdown = rewards.breakdown || { baseGold: 0, waveMultiplier: 1, medicalCosts: 0 };
          activeTimelineRef.current = animateCurrencyReveal(
            currencySectionRef.current,
            rewards.goldEarned,
            rewards.gemsEarned,
            breakdown
          );
        }
        break;
      }

      case RevealPhase.Summary: {
        if (summarySectionRef.current) {
          activeTimelineRef.current = animateSummaryEntrance(summarySectionRef.current);
        }
        break;
      }
    }
  }, [active, phase, rewards, killTimeline]);

  // Item reveal explosion effect
  useEffect(() => {
    if (
      phase !== RevealPhase.ItemReveal ||
      !currentRevealItem ||
      currentRevealIndex === lastRevealIndexRef.current ||
      !itemRevealSectionRef.current
    ) return;

    lastRevealIndexRef.current = currentRevealIndex;

    const container = itemRevealSectionRef.current;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    // Orb pulse animation
    if (orbRef.current) {
      const color = RARITY_HEX[currentRevealItem.rarity as Rarity] || '#9CA3AF';
      const orb = orbRef.current;

      gsap.killTweensOf(orb);

      // Reset orb
      gsap.set(orb, {
        scale: 0,
        opacity: 0,
        boxShadow: `0 0 20px ${color}`,
        borderColor: color,
        backgroundColor: `${color}30`,
      });

      // Orb appears and pulses (anticipation)
      const tl = gsap.timeline();
      tl.to(orb, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.5)' });
      tl.to(orb, {
        scale: 1.3,
        boxShadow: `0 0 60px ${color}, 0 0 120px ${color}60`,
        duration: 0.15,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: 1,
      });

      // Explosion
      tl.to(orb, { scale: 2.5, opacity: 0, duration: 0.15, ease: 'power2.in' });
      tl.add(() => {
        animateRarityExplosion(container, currentRevealItem.rarity as Rarity, cx, cy);
      }, '-=0.1');

      // Screen shake for rare+
      const rarity = currentRevealItem.rarity as Rarity;
      if (rarity === Rarity.Rare || rarity === Rarity.Legendary || rarity === Rarity.Mythic) {
        const intensity = rarity === Rarity.Mythic ? 6 : rarity === Rarity.Legendary ? 4 : 2;
        tl.add(animateScreenShake(container, intensity, 0.2), '-=0.2');
      }
    }
  }, [phase, currentRevealItem, currentRevealIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      killTimeline();
    };
  }, [killTimeline]);

  if (!active || !rewards) return null;

  const rarityLabel = (rarity: string) => {
    return rarity.charAt(0).toUpperCase() + rarity.slice(1);
  };

  const handleContinue = () => {
    if (overlayRef.current) {
      const tl = animateRewardExit(overlayRef.current);
      tl.eventCallback('onComplete', onContinue);
    } else {
      onContinue();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 10000, pointerEvents: 'auto' }}
    >
      {/* Background overlay - dims more during victory/currency, less during item reveal */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-500"
        style={{
          opacity: phase === RevealPhase.ItemReveal ? 0.6 : 0.85,
        }}
      />

      {/* Skip button - always visible except in Summary */}
      {phase !== RevealPhase.Summary && phase !== RevealPhase.Complete && (
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 border border-gray-500 rounded-lg text-gray-300 text-sm font-medium transition-all hover:scale-105"
        >
          Skip
        </button>
      )}

      {/* ======== Phase 1: Victory Splash ======== */}
      {phase === RevealPhase.VictorySplash && (
        <div
          ref={victorySectionRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ opacity: 0 }}
        >
          {/* Light burst */}
          <div
            data-victory-burst
            className="absolute"
            style={{
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,165,0,0.3) 40%, transparent 70%)',
              borderRadius: '50%',
              transform: 'scale(0)',
            }}
          />

          {/* Particle container */}
          <div data-victory-particles className="absolute inset-0 pointer-events-none" />

          {/* Victory text */}
          <div
            data-victory-text
            className="relative z-10 text-center"
          >
            <h1
              className="font-black tracking-wider"
              style={{
                fontSize: 'clamp(48px, 10vw, 96px)',
                color: '#FFD700',
                textShadow: '0 0 30px rgba(255,215,0,0.5), 0 4px 8px rgba(0,0,0,0.8)',
                letterSpacing: '0.1em',
              }}
            >
              VICTORY
            </h1>
          </div>
        </div>
      )}

      {/* ======== Phase 2: Currency Reveal ======== */}
      {phase === RevealPhase.CurrencyReveal && revealState && (
        <div
          ref={currencySectionRef}
          className="absolute inset-0 flex flex-col items-center justify-center px-8 gap-6"
        >
          {/* Title */}
          <div className="text-amber-400 text-lg font-bold tracking-wide mb-2" style={{ opacity: 0 }} data-breakdown-item>
            Battle Rewards
          </div>

          {/* Gold section */}
          <div data-gold-section className="flex items-center gap-4" style={{ opacity: 0 }}>
            <span className="text-4xl">&#x1FA99;</span>
            <div className="text-center">
              <div
                className="font-black text-yellow-400"
                style={{ fontSize: 'clamp(32px, 6vw, 56px)', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}
              >
                <span data-gold-counter ref={goldCounterRef}>0</span>
              </div>
              <div className="text-yellow-400/60 text-sm font-medium">Gold Earned</div>
            </div>
          </div>

          {/* Breakdown items */}
          {rewards.breakdown && (
            <div className="flex flex-col gap-2 text-sm">
              {revealState.breakdownStep >= 1 && (
                <div data-breakdown-item className="flex justify-between gap-8 text-gray-300" style={{ opacity: 0 }}>
                  <span>Base Reward</span>
                  <span className="text-yellow-400">{rewards.breakdown.baseGold.toLocaleString()}g</span>
                </div>
              )}
              {revealState.breakdownStep >= 2 && (
                <div data-breakdown-item className="flex justify-between gap-8 text-gray-300" style={{ opacity: 0 }}>
                  <span>Wave {rewards.breakdown.wavesCompleted} Bonus</span>
                  <span className="text-yellow-400">&times;{rewards.breakdown.waveMultiplier.toFixed(1)}</span>
                </div>
              )}
              {revealState.breakdownStep >= 3 && rewards.breakdown.casualties > 0 && (
                <div data-breakdown-item className="flex justify-between gap-8 text-gray-300" style={{ opacity: 0 }}>
                  <span>Medical Costs ({rewards.breakdown.casualties})</span>
                  <span className="text-red-400">-{rewards.breakdown.medicalCosts.toLocaleString()}g</span>
                </div>
              )}
            </div>
          )}

          {/* Gems section */}
          {rewards.gemsEarned > 0 && (
            <div data-gem-section className="flex items-center gap-4 mt-2" style={{ opacity: 0 }}>
              <span className="text-3xl">&#x1F48E;</span>
              <div className="text-center">
                <div
                  className="font-black text-pink-400"
                  style={{ fontSize: 'clamp(24px, 4vw, 40px)', textShadow: '0 0 15px rgba(236,72,153,0.4)' }}
                >
                  <span data-gem-counter ref={gemCounterRef}>0</span>
                </div>
                <div className="text-pink-400/60 text-sm font-medium">Gems Earned</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== Phase 3: Item Reveal ======== */}
      {phase === RevealPhase.ItemReveal && (
        <div
          ref={itemRevealSectionRef}
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
        >
          {/* Orb - centered, used for each item reveal */}
          <div
            ref={orbRef}
            className="absolute rounded-full border-4"
            style={{
              width: '80px',
              height: '80px',
              opacity: 0,
              transform: 'scale(0)',
            }}
          />

          {/* Item name flash (shown briefly after reveal) */}
          {currentRevealItem && revealState?.itemRevealStep === 'fly' && (
            <div
              className="absolute text-center z-20"
              style={{
                top: '35%',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <div
                className="font-bold text-lg px-4 py-1 rounded-lg bg-black/60"
                style={{
                  color: RARITY_HEX[currentRevealItem.rarity as Rarity] || '#9CA3AF',
                  textShadow: `0 0 10px ${RARITY_HEX[currentRevealItem.rarity as Rarity] || '#9CA3AF'}40`,
                }}
              >
                {currentRevealItem.name}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {rarityLabel(currentRevealItem.rarity)}
              </div>
            </div>
          )}

          {/* Item counter */}
          {rewards && rewards.items.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm font-medium">
              {(revealState?.revealedItemCount || 0)} / {rewards.items.length} Items
            </div>
          )}
        </div>
      )}

      {/* ======== Phase 4: Summary ======== */}
      {phase === RevealPhase.Summary && revealState && (
        <div
          ref={summarySectionRef}
          className="relative z-10 w-full max-w-md mx-4"
          style={{ opacity: 0, transform: 'translateY(300px)' }}
        >
          <div className="bg-gray-900/95 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
            {/* Header */}
            <h2
              className="text-center font-black text-2xl mb-6"
              style={{ color: '#FFD700', textShadow: '0 0 15px rgba(255,215,0,0.3)' }}
            >
              Battle Rewards
            </h2>

            {/* Currency */}
            <div className="flex justify-center gap-8 mb-4">
              {/* Gold */}
              <div className="text-center">
                <div className="text-3xl mb-1">&#x1FA99;</div>
                <div className="text-yellow-400 font-bold text-xl">
                  {revealState.currentGoldDisplay.toLocaleString()}
                </div>
                <div className="text-yellow-400/50 text-xs">Gold</div>
              </div>

              {/* Gems */}
              {rewards.gemsEarned > 0 && (
                <div className="text-center">
                  <div className="text-3xl mb-1">&#x1F48E;</div>
                  <div className="text-pink-400 font-bold text-xl">
                    {revealState.currentGemDisplay.toLocaleString()}
                  </div>
                  <div className="text-pink-400/50 text-xs">Gems</div>
                </div>
              )}
            </div>

            {/* Items list */}
            {rewards.items.length > 0 && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Items Found</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {rewards.items.map((item) => {
                    const color = RARITY_HEX[item.rarity as Rarity] || '#9CA3AF';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
                        style={{
                          borderColor: `${color}50`,
                          backgroundColor: `${color}10`,
                        }}
                      >
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-medium" style={{ color }}>
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total value */}
            {(() => {
              const totalValue = rewards.goldEarned + (rewards.gemsEarned * 10) +
                rewards.items.reduce((sum, item) => sum + item.value, 0);
              return totalValue > 0 ? (
                <div className="text-center mt-4 text-gray-400 text-sm">
                  Total Value: <span className="text-amber-400 font-bold">~{totalValue.toLocaleString()}g</span>
                </div>
              ) : null;
            })()}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-lg rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-95"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

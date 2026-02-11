import { useState, useEffect } from 'react';

export function useModals() {
  const [showRetreatConfirmation, setShowRetreatConfirmation] = useState(false);

  const [showDoomsdayEvent, setShowDoomsdayEvent] = useState(false);
  const [currentDoomsdayEvent, setCurrentDoomsdayEvent] = useState<any>(null);

  const [showTimePassage, setShowTimePassage] = useState(false);
  const [timePassageData, setTimePassageData] = useState<any>(null);

  const [showHeroUnlock, setShowHeroUnlock] = useState(false);

  const closeDoomsdayEvent = () => {
    setCurrentDoomsdayEvent(null);
    setShowDoomsdayEvent(false);
  };

  const closeTimePassage = () => {
    setTimePassageData(null);
    setShowTimePassage(false);
  };

  useEffect(() => {
    const handleTimePassage = (event: CustomEvent) => {
      const data = event.detail;
      if (data && !showTimePassage) {
        setTimePassageData(data);
        setShowTimePassage(true);
      }
    };

    const handleDoomsdayEvent = (event: CustomEvent) => {
      const eventData = event.detail;
      if (eventData && !showDoomsdayEvent) {
        setCurrentDoomsdayEvent(eventData);
        setShowDoomsdayEvent(true);
      }
    };

    const handleOpenHeroUnlock = () => {
      setShowHeroUnlock(true);
    };

    window.addEventListener('timePassage', handleTimePassage as any);
    window.addEventListener('doomsdayEvent', handleDoomsdayEvent as any);
    window.addEventListener('openHeroUnlock', handleOpenHeroUnlock);

    return () => {
      window.removeEventListener('timePassage', handleTimePassage as any);
      window.removeEventListener('doomsdayEvent', handleDoomsdayEvent as any);
      window.removeEventListener('openHeroUnlock', handleOpenHeroUnlock);
    };
  }, [showTimePassage, showDoomsdayEvent]);

  return {
    showRetreatConfirmation,
    setShowRetreatConfirmation,
    showDoomsdayEvent,
    currentDoomsdayEvent,
    closeDoomsdayEvent,
    showTimePassage,
    timePassageData,
    closeTimePassage,
    showHeroUnlock,
    setShowHeroUnlock,
  };
}

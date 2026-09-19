// Convenience access to /dev WITHOUT putting a developer entry in the player UI.
//
// Two ways in, both invisible until used:
//  1. A secret gesture: tap a neutral piece of chrome 5 times quickly (no visual affordance).
//  2. After /dev has been opened once, a small DEV chip appears on the chrome layer.
//     It can be hidden again from /dev, and the gesture still works afterwards.
import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevStore } from '@/state/devStore';

/** Taps needed, and the window they must happen in. */
const TAPS_REQUIRED = 5;
const TAP_WINDOW_MS = 1600;

/**
 * Spread the returned props onto any neutral element (HUD week label, title text).
 * It adds no cursor, no hover and no visible change - a player never notices it.
 */
export function useSecretDevTap() {
  const navigate = useNavigate();
  const unlockDev = useDevStore((s) => s.unlockDev);
  const taps = useRef<number[]>([]);

  const onClick = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_REQUIRED) {
      taps.current = [];
      unlockDev();
      navigate('/dev');
    }
  }, [navigate, unlockDev]);

  return { onClick };
}

/** Small entry chip on the chrome layer. Rendered only after /dev has been reached once. */
export function DevFab() {
  const navigate = useNavigate();
  const devAccess = useDevStore((s) => s.devAccess);
  if (!devAccess) return null;
  return (
    <button className="devfab" onClick={() => navigate('/dev')} aria-label="개발자 도구">DEV</button>
  );
}

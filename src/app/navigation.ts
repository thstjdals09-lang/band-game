// Navigation helpers implementing IA v1.1 §25 Back/Close rules while keeping browser Back in sync
// (PWA rule: in-game Back and browser Back must never send the player to different places).
import { useCallback, useEffect } from 'react';
import { useBlocker, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { getRouteMeta } from './routes';

interface Entry { key: string; pathname: string }
const stack: Entry[] = [];

/** Mount once inside the router: mirrors the browser history into an in-app stack. */
export function useNavHistoryTracker() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    const entry = { key: location.key, pathname: location.pathname };
    if (type === 'PUSH') {
      stack.push(entry);
    } else if (type === 'REPLACE') {
      stack.splice(Math.max(0, stack.length - 1), 1, entry);
    } else {
      const idx = stack.findIndex((e) => e.key === location.key);
      if (idx >= 0) stack.length = idx + 1; else stack.push(entry);
    }
  }, [location, type]);
}

export function useGameNav() {
  const navigate = useNavigate();
  const location = useLocation();

  /** 일반 관리 패널: 직전 패널로 이동 */
  const back = useCallback(() => {
    if (stack.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);

  /** 최상위 패널 Close: Basecamp HOME 복귀 - pops history back to the last HOME entry when possible */
  const closeToHome = useCallback(() => {
    let idx = -1;
    for (let i = stack.length - 1; i >= 0; i -= 1) { if (stack[i].pathname === '/') { idx = i; break; } }
    if (idx >= 0 && idx < stack.length - 1) navigate(-(stack.length - 1 - idx));
    else navigate('/', { replace: true });
  }, [navigate]);

  /** Dock tap: replace when already on a top-level panel so Back from any dock panel returns HOME. */
  const openDock = useCallback((path: string) => {
    const meta = getRouteMeta(location.pathname);
    if (location.pathname === path) return;
    navigate(path, { replace: meta.layer === 'panel' && !!meta.topLevel });
  }, [navigate, location.pathname]);

  const go = useCallback((path: string, opts?: { replace?: boolean }) => navigate(path, opts), [navigate]);

  return { back, closeToHome, openDock, go, navigate };
}

/**
 * Week Resolution / Performance: 중간 Back 비활성 (IA §25).
 * Blocks POP (hardware/browser back) while `active`; programmatic navigation still works.
 */
export function useLockBack(active: boolean) {
  const blocker = useBlocker(({ historyAction }) => active && historyAction === 'POP');
  useEffect(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);
}

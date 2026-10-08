import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';

// ── Active lesson session ──────────────────────────────────────────────
// Records which lesson path (if any) was opened deliberately from a list
// view. Set right before navigating into a lesson, checked by the lesson
// guard on mount. If the browser forward-swipes, refreshes, or lands on a
// lesson path any other way WITHOUT this flag being set, the guard redirects
// to the activity list — the lesson content never renders.

const ACTIVE_KEY = 'activeLessonPath';

function setActivePath(path: string) {
  try { sessionStorage.setItem(ACTIVE_KEY, path); } catch { /* ignore */ }
}

function getActivePath(): string | null {
  try { return sessionStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function clearActivePath() {
  try { sessionStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}

/**
 * Call from a list view right before navigating into a lesson. Records the
 * lesson path as an intentionally-opened session so the lesson guard allows
 * it to render.
 */
export function openLessonSession(path: string) {
  setActivePath(path);
}

/**
 * Hook for lesson pages. On mount and every location change, checks whether
 * the current path matches the active lesson session. If it matches, the
 * lesson is allowed to render and the session stays set (so StrictMode
 * remounts still pass). If it doesn't match — forward swipe, back into a
 * stale entry, refresh, or direct URL — redirects to the fallback.
 *
 * The session is cleared when the guard runs on a path that does NOT match
 * (i.e. the user has navigated away to a non-lesson or different lesson).
 */
export function useLessonGuard(fallback: string) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const active = getActivePath();
    if (active === location.pathname) {
      // This is the lesson the user intentionally opened — allow it.
      return;
    }
    // Not the active lesson. If there IS an active session for a different
    // path, it means the user navigated away from that lesson — clear it.
    if (active) {
      clearActivePath();
    }
    // Redirect stale/forward/refresh/direct-URL arrivals to the fallback.
    navigate(fallback, { replace: true });
  }, [location.pathname, navigate, fallback]);
}

// ── Back navigation helper ─────────────────────────────────────────────

/**
 * Navigate back to the previous page if there is one, otherwise fall back to
 * the provided route. This avoids leaving the app when history is empty (e.g.
 * the user opened the lesson via a direct link) while still using native back
 * navigation in the normal case so no duplicate history entries are created.
 */
export function useNavigateBack() {
  const navigate = useNavigate();
  return useCallback((fallback: string) => {
    clearActivePath();
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate]);
}

// ── Unsaved-progress back-blocker ──────────────────────────────────────

export function usePreventBack(shouldBlock: boolean, onBlocked: () => void) {
  const onBlockedRef = useRef(onBlocked);
  onBlockedRef.current = onBlocked;

  const blocker = useBlocker(
    useCallback(() => shouldBlock, [shouldBlock])
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      onBlockedRef.current();
    }
  }, [blocker.state]);

  const confirmExit = useCallback(() => {
    clearActivePath();
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelExit = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return { confirmExit, cancelExit };
}

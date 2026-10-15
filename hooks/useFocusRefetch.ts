import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Runs `fetcher` every time the screen this hook is used in comes into
 * focus (initial mount included) — not just once on mount. Use this on
 * any screen that pulls data from the API so switching language, or
 * navigating away and back, always shows fresh data instead of a stale
 * cache from the last time the screen mounted.
 *
 * Usage:
 *   const { loading } = useFocusRefetch(async () => {
 *     const res = await axios.post('/', { method: 'getSomething' });
 *     setSomeState(res.data);
 *   });
 *
 * `fetcher` does NOT need to manage its own loading state — this hook
 * tracks `loading` for you. Just do the request + setState inside it.
 *
 * The hook also returns `refetch`, a stable function you can wire up to
 * a manual "Retry" button — it runs the same fetcher on demand, outside
 * of the automatic focus-triggered runs.
 */
export function useFocusRefetch(fetcher: () => Promise<void> | void) {
  const [loading, setLoading] = useState(true);

  // Keep the latest fetcher in a ref so the useFocusEffect callback below
  // doesn't need `fetcher` in its dependency array (screens often pass an
  // inline arrow function, which would otherwise change identity every
  // render and cause extra refetches).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    try {
      setLoading(true);
      await fetcherRef.current();
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setLoading(true);
          await fetcherRef.current();
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  return { loading, setLoading, refetch: run };
}

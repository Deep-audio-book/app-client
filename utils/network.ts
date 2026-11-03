/**
 * Network layer shared by the whole app.
 *
 *  - `useNetworkStore().offline`  -> true while there is no internet
 *  - `useOnReconnect(cb)`         -> runs `cb` when the internet comes back
 *                                    (screens use it to reload themselves)
 *  - `refreshNetwork()`           -> force a fresh check (call from Retry)
 *  - `isNetworkError(e)`          -> true for "Network Error" / timeouts
 *  - `installOfflineLogFilter()`  -> network failures are logged quietly
 *                                    instead of the red error pop-up
 */
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useRef } from "react";
import { AppState, LogBox } from "react-native";
import { create } from "zustand";

/**
 * TODO: put your own backend URL here (any URL that answers quickly, e.g.
 * your API root or a /health route). NetInfo uses it to decide
 * `isInternetReachable`. The default is a Google URL, which some networks
 * (Jio etc.) block or slow down -> app wrongly says "No internet".
 * Leave "" to keep NetInfo's default.
 */
const REACHABILITY_URL = "";

/** Real-request check used when NetInfo says "unreachable". */
const PROBE_URL =
  REACHABILITY_URL || "https://www.apple.com/library/test/success.html";

async function probeInternet(): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${PROBE_URL}${PROBE_URL.includes("?") ? "&" : "?"}_=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return res.status < 500; // any answer = internet works
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Reachable=false must stay false after this long before we trust it. */
const VERIFY_DELAY_MS = 3000;
/** While offline, re-check this often so we notice recovery. */
const OFFLINE_RECHECK_MS = 8000;

type NetworkState = {
  offline: boolean;
  /** true for ~2.5s after the internet came back ("Back online") */
  justReconnected: boolean;
};

export const useNetworkStore = create<NetworkState>(() => ({
  offline: false,
  justReconnected: false,
}));

/* ------------------------------------------------------------------ */
/* reconnect listeners                                                 */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

let watcherStarted = false;
let applyOffline: ((offline: boolean) => void) | null = null;

/** Force a fresh connectivity check (use on Retry buttons). */
export async function refreshNetwork() {
  try {
    const st = await NetInfo.refresh();
    if (st.isConnected === false) return;
    if (await probeInternet()) applyOffline?.(false);
  } catch {}
}

/** Call once at app start (root layout). Safe to call again. */
export function startNetworkWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;

  if (REACHABILITY_URL) {
    NetInfo.configure({
      reachabilityUrl: REACHABILITY_URL,
      reachabilityTest: async (res) => res.status < 500,
      reachabilityShortTimeout: 5 * 1000,
      reachabilityLongTimeout: 30 * 1000,
      reachabilityRequestTimeout: 10 * 1000,
    });
  }

  let wasOffline = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let verifyTimer: ReturnType<typeof setTimeout> | null = null;
  let recheckTimer: ReturnType<typeof setInterval> | null = null;

  const clearVerify = () => {
    if (verifyTimer) {
      clearTimeout(verifyTimer);
      verifyTimer = null;
    }
  };

  const setOffline = (offline: boolean) => {
    useNetworkStore.setState({ offline });

    // while offline, keep re-checking so a stale "false" can't stick forever
    if (offline && !recheckTimer) {
      recheckTimer = setInterval(async () => {
        NetInfo.refresh().catch(() => {});
        if (await probeInternet()) setOffline(false);
      }, OFFLINE_RECHECK_MS);
    } else if (!offline && recheckTimer) {
      clearInterval(recheckTimer);
      recheckTimer = null;
    }

    if (offline && reconnectTimer) clearTimeout(reconnectTimer);

    if (wasOffline && !offline) {
      useNetworkStore.setState({ justReconnected: true });

      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(
        () => useNetworkStore.setState({ justReconnected: false }),
        2500
      );

      // give the connection a moment to settle, then let screens reload
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        listeners.forEach((l) => {
          try {
            l();
          } catch {}
        });
      }, 600);
    }

    wasOffline = offline;
  };

  applyOffline = setOffline;

  const handle = (state: NetInfoState, confirmed = false) => {
    // `null` = still detecting -> not treated as offline
    const disconnected = state.isConnected === false;
    const unreachable =
      state.isConnected !== false && state.isInternetReachable === false;

    // fully fine
    if (!disconnected && !unreachable) {
      clearVerify();
      setOffline(false);
      return;
    }

    // no WiFi / mobile data at all, or "unreachable" already double-checked
    if (disconnected || confirmed) {
      clearVerify();
      setOffline(true);
      return;
    }

    // Connected but "unreachable": could be a false alarm (blocked probe,
    // stale state). Don't flip the toast yet - re-check once first.
    if (verifyTimer) return;
    verifyTimer = setTimeout(async () => {
      verifyTimer = null;
      try {
        const fresh = await NetInfo.refresh();
        if (fresh.isConnected === false) return handle(fresh, true);
        // NetInfo can be stale (esp. iOS) -> trust a real request instead
        setOffline(!(await probeInternet()));
      } catch {}
    }, VERIFY_DELAY_MS);
  };

  NetInfo.addEventListener((state) => handle(state));

  // coming back to the app (or from Settings / WiFi screen) -> fresh check
  AppState.addEventListener("change", (s) => {
    if (s === "active") NetInfo.refresh().catch(() => {});
  });
}

/** Runs `callback` every time the internet comes back. */
export function useOnReconnect(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    const listener = () => ref.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

/* ------------------------------------------------------------------ */
/* errors                                                              */
/* ------------------------------------------------------------------ */

export function isNetworkError(e: any): boolean {
  if (!e) return false;

  if (typeof e === "string") {
    return /network ?error|timeout of|ECONNABORTED|ERR_NETWORK|Network request failed/i.test(
      e
    );
  }

  if (e?.isAxiosError || e?.name === "AxiosError") {
    // axios error without a server response = the request never got through
    return !e.response;
  }

  return /network ?error|Network request failed/i.test(String(e?.message ?? ""));
}

let filterInstalled = false;

/**
 * No internet is normal on a phone, not a bug. Screens already show a
 * friendly "No internet" state, so these failures must not also pop up the
 * red developer error ("getStoryDetail error: AxiosError: Network Error").
 * Real errors are untouched.
 */
export function installOfflineLogFilter() {
  if (filterInstalled) return;
  filterInstalled = true;

  const original = console.error;

  console.error = (...args: any[]) => {
    if (args.some((a) => isNetworkError(a))) {
      console.log("[offline]", ...args.map((a) => (typeof a === "string" ? a : a?.message ?? a)));
      return;
    }
    original(...args);
  };

  LogBox.ignoreLogs([
    /Network Error/i,
    /AxiosError/i,
    /ERR_NETWORK/i,
    /timeout of \d+ms exceeded/i,
  ]);
}
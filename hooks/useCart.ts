import i18n from "i18next";
import { useCallback, useRef, useState } from "react";

import { CartItem, fetchCart, removeCartItem } from "../api/Cart";
import { useCartBadge } from "./useCartBadge";

const message = (e: unknown, fallbackKey: string) =>
  e instanceof Error ? e.message : i18n.t(fallbackKey);

/**
 * Cart items are kept here, outside the component, so opening the Cart
 * screen again shows the items INSTANTLY (no spinner / empty flash). The
 * list is still re-checked silently in the background every time.
 * Call resetCartCache() on logout so the next user never sees old items.
 */
let cachedItems: CartItem[] | null = null;

export function resetCartCache() {
  cachedItems = null;
  useCartBadge.getState().reset();
}

/**
 * Rental cart. Removing a rental updates the UI immediately and rolls back
 * (with an error message) if the backend call fails.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>(cachedItems ?? []);
  const itemsRef = useRef<CartItem[]>(cachedItems ?? []);
  const loadedOnce = useRef(cachedItems !== null);

  const [loading, setLoading] = useState(cachedItems === null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const apply = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    cachedItems = next;
    setItems(next);
    useCartBadge.getState().setFromItems(next); // keep the badge in sync
  }, []);

  const setBusy = useCallback((id: string, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Spinner only when there is nothing to show yet; later reloads are silent. */
  const reload = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    setLoadError(null);
    try {
      apply(await fetchCart());
      setActionError(null);
    } catch (e) {
      // keep showing what we already have if a background reload fails
      if (itemsRef.current.length === 0) setLoadError(message(e, "cart.errors.load"));
    } finally {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, [apply]);

  const retry = useCallback(() => {
    loadedOnce.current = false;
    return reload();
  }, [reload]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const remove = useCallback(
    async (item: CartItem) => {
      setActionError(null);
      const index = itemsRef.current.findIndex((i) => i.id === item.id);
      apply(itemsRef.current.filter((i) => i.id !== item.id));
      setBusy(item.id, true);
      try {
        await removeCartItem(item.id);
      } catch (e) {
        const restored = itemsRef.current.slice();
        restored.splice(Math.min(Math.max(index, 0), restored.length), 0, item);
        apply(restored);
        setActionError(message(e, "cart.errors.remove"));
      } finally {
        setBusy(item.id, false);
      }
    },
    [apply, setBusy]
  );

  const total = items.reduce((sum, i) => sum + i.price, 0);

  return {
    items,
    total,
    loading,
    refreshing,
    loadError,
    actionError,
    busyIds,
    reload,
    retry,
    refresh,
    remove,
  };
}
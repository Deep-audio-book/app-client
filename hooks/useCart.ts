import i18n from "i18next";
import { useCallback, useRef, useState } from "react";

import { CartItem, fetchCart, removeCartItem } from "../api/Cart";

const message = (e: unknown, fallbackKey: string) =>
  e instanceof Error ? e.message : i18n.t(fallbackKey);

/**
 * Rental cart. Removing a rental updates the UI immediately and rolls back
 * (with an error message) if the backend call fails.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const loadedOnce = useRef(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

  const apply = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const setBusy = useCallback((id: string, on: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Spinner only on the very first load; later reloads are silent. */
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
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { fetchCart } from "../api/Cart";

/** Number of rentals in the cart, refreshed every time the screen is focused. */
export function useCartCount() {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchCart()
        .then((items) => alive && setCount(items.length))
        .catch(() => {}); // badge is optional - stay silent on failure
      return () => {
        alive = false;
      };
    }, [])
  );

  return count;
}
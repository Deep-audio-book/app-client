import { useCallback, useState } from "react";

import { fetchPlans, type CurrentPlan } from "@/api/Plans";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";

/** Is the logged-in user Premium (has a paid plan) or a Free User? */
export function useMembership() {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [ready, setReady] = useState(false);

  useFocusRefetch(
    useCallback(async () => {
      try {
        const { currentPlan } = await fetchPlans();
        setCurrentPlan(currentPlan && currentPlan.price > 0 ? currentPlan : null);
      } catch {
        // keep the last known value
      } finally {
        setReady(true);
      }
    }, [])
  );

  return { isPremium: !!currentPlan, currentPlan, ready };
}

import i18n from "i18next";
import { useCallback, useEffect, useState } from "react";

import { fetchPlans, PlansData } from "../api/Plans";

export function usePlans() {
  const [data, setData] = useState<PlansData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPlans());
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t("plans.errors.load"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
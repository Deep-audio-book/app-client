import i18n from "i18next";
import axios from "../axios.config";

export type Plan = {
  id: string;
  title: string;
  price: number; // ₹
  priceUsd: number;
  origPrice: number; // 0 when there is no strike-through price
  durationDays: number;
  description: string; // i18n key, e.g. "monthlyPlanDescription"
  benefits: string[]; // per-plan benefit lines from the backend (Deep Talks content)
};

export type CurrentPlan = {
  id: string;
  name: string;
  price: number;
  expiresOn: string | null; // ISO date, shown on Profile -> Subscription
};

export type PlansData = {
  currentPlan: CurrentPlan | null;
  plans: Plan[]; // paid plans only, shortest duration first
};

/**
 * `user_id` + `language_code` are added by the axios interceptor, so
 * `currentPlan` is for the logged-in user.
 */
export async function fetchPlans(): Promise<PlansData> {
  try {
    const { data } = await axios.post("/", { method: "getAllPlans" });

    if (data.statusCode !== 200) {
      throw new Error(data.msg || i18n.t("plans.errors.load"));
    }

    const plans: Plan[] = ((data.plans ?? []) as any[])
      .filter((p) => Number(p.plan_price) > 0) // hide the free plan
      .map((p) => ({
        id: String(p.id),
        title: String(p.plan_name),
        price: Number(p.plan_price),
        priceUsd: Number(p.plan_price_usd ?? 0),
        origPrice: Number(p.orig_price ?? 0),
        durationDays: Number(p.plan_duration) || 30,
        description: String(p.plan_description ?? ""),
        benefits: Array.isArray(p.plan_benefits)
          ? p.plan_benefits.map(String)
          : typeof p.plan_benefits === "string"
            ? p.plan_benefits.split("\n").map((x: string) => x.trim()).filter(Boolean)
            : [],
      }))
      .sort((a, b) => a.durationDays - b.durationDays);

    const cp = data.currentPlan;
    return {
      currentPlan: cp
        ? {
            id: String(cp.id),
            name: String(cp.plan_name),
            price: Number(cp.plan_price),
            expiresOn: cp.expires_on ? String(cp.expires_on) : null,
          }
        : null,
      plans,
    };
  } catch (e: any) {
    if (e?.code === "ECONNABORTED") {
      throw new Error(i18n.t("plans.errors.timeout"));
    }
    if (e?.response || e?.request) {
      throw new Error(i18n.t("plans.errors.load"));
    }
    throw e;
  }
}

/**
 * Which plans to show, based on what the user already has.
 * (Proposed rule - Deep Talks to confirm.)
 *   no paid plan  -> every plan
 *   Monthly       -> Monthly (current) + longer plans pushed (Quarterly, Annual)
 *   Quarterly     -> Quarterly (current) + Annual
 *   Annual        -> Annual only, nothing to upgrade to
 */
export function visiblePlans(plans: Plan[], currentPlanId?: string): Plan[] {
  const current = plans.find((p) => p.id === currentPlanId);
  if (!current) return plans;
  return plans.filter((p) => p.id === current.id || p.durationDays > current.durationDays);
}

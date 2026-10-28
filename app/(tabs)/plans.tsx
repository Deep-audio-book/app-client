import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import type { Plan } from "@/api/Plans";
import PlansScreen from "@/components/profile/plansScreen";
import { usePlans } from "@/hooks/usePlans";

export default function Plans() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, loading, error, reload } = usePlans();

  const handleSubscribe = async (plan: Plan) => {
    // TODO: start your payment flow here with plan.id. Throw an Error(message)
    // if it fails and the message is shown above the button.
    Alert.alert(t("plans.planSelected"), `${plan.title} - ₹${plan.price} (id ${plan.id})`);
  };

  return (
    <PlansScreen
      plans={data?.plans ?? []}
      currentPlanId={data?.currentPlan?.id}
      currentPlanName={data?.currentPlan?.name}
      loading={loading}
      loadError={error}
      onRetry={reload}
      onSubscribe={handleSubscribe}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
    />
  );
}
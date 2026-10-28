import { fetchFeatured, type FeaturedResponse } from "@/api/books";
import OnboardingScreen from "@/components/ui/Onboardingscreen"; // adjust path
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

export default function Index() {
  const router = useRouter();

  const [featured, setFeatured] = useState<FeaturedResponse | null>(null);

  useEffect(() => {
    fetchFeatured(10)
      .then(setFeatured)
      .catch((e) => console.log("fetchFeatured failed:", e?.message ?? e));
  }, []);

  return (
    <OnboardingScreen
      items={featured?.items ?? []}
      totalTitles={featured?.totalTitles}
      onLogin={() => router.push("/sign-in")}
      onSignUp={() => router.push("/sign-up")}

    />
  );
}
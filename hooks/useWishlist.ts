import axios from "@/axios.config";
import { useWishlistStore } from "@/redux/slices/wishlistStore";
import * as Haptics from "expo-haptics";
import { useCallback, useRef } from "react";

/*
 * API: { method: "toggleWishlist", story_id }
 * (user_id axios.config / auth token la irundhu pogum, getStoryDetail / addToCart
 *  maadhiri. Backend explicit ah user_id kekkuna, thaniya add pannunga.)
 *
 * Idhu toggle, so "like: true/false" anuppa thevai illa.
 */
export function useWishlist(storyId: number | string, initialLiked?: boolean) {
  const key = String(storyId);
  const busy = useRef(false);

  // Store la value irundha adhu, illana API initial value (wishlisted)
  const liked = useWishlistStore((s) => s.liked[key] ?? !!initialLiked);
  const setLiked = useWishlistStore((s) => s.set);

  const toggle = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;

    const next = !liked;
    setLiked(key, next); // optimistic update
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data } = await axios.post("/", {
        method: "toggleWishlist",
        story_id: Number(storyId),
      });

    //   console.log("toggleWishlist response", data); 
      if (data && data.statusCode != null && data.statusCode !== 200) {
        throw new Error(data.msg || "toggleWishlist failed");
      }

      // Server entha status solludho adhaiye nambuvom (toggle out-of-sync aagaama irukka).
      // Response shape theriyala, so common field names check panren.
      const payload = data?.data ?? data;
      const serverValue =
        payload?.wishlisted ?? payload?.is_wishlisted ?? payload?.liked ?? payload?.like;
      if (typeof serverValue === "boolean") {
        setLiked(key, serverValue);
      }
    } catch (err) {
      setLiked(key, !next); // fail aana rollback
    } finally {
      busy.current = false;
    }
  }, [liked, key, storyId, setLiked]);

  return { liked, toggle };
}
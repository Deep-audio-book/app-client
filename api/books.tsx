import axios from "../axios.config";

export type CoverItem = {
  id: string;
  coverUrl: string; // absolute https CDN URL of a ~400x520 thumbnail
  type: "audio" | "video";
};

export type FeaturedResponse = {
  totalTitles: number;
  items: CoverItem[];
};

/**
 * Works before login (no user_id). The interceptor adds language_code,
 * so the backend can return covers for the user's language.
 */
export async function fetchFeatured(limit = 10): Promise<FeaturedResponse> {
  const { data } = await axios.post("/", { method: "getFeaturedBooks", limit });
  if (data.statusCode !== 200) {
    throw new Error(data.msg || "Could not load featured books.");
  }

  // console.log("LOG:",data.data);
  return data.data as FeaturedResponse;
}
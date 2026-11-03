import axios from "@/axios.config";

/**
 * Everything the Favourites / Listen Later feature sends to the backend.
 *
 * Stories already use `toggleWishlist` (see hooks/useWishlist.ts).
 * The methods below follow the same naming pattern as the existing
 * `getFavouriteAuthors / getFavouriteNarrators / getFavouriteGenres`
 * list calls.
 *
 * ⚠ Backend must confirm these names (they are new):
 *   toggleFavouriteAuthor   { author_id }
 *   toggleFavouriteNarrator { narrator_id }
 *   toggleFavouriteGenre    { genre_id }
 *   toggleListenLater       { story_id }
 *   getListenLaterStories   { key_type: "listen_later" }  -> { stories: [...] }
 *
 * Each toggle should answer { statusCode: 200, data: { favourited: boolean } }
 * (for Listen Later: { listen_later: boolean }). The app trusts that value
 * when it is present, so the UI can never drift out of sync with the server.
 */

export type FavouriteKind = "author" | "narrator" | "genre" | "listenLater";

export const FAVOURITE_API: Record<
  FavouriteKind,
  { method: string; idKey: string; responseKeys: string[] }
> = {
  author: {
    method: "toggleFavouriteAuthor",
    idKey: "author_id",
    responseKeys: ["favourited", "favorited", "is_favourite", "wishlisted"],
  },
  narrator: {
    method: "toggleFavouriteNarrator",
    idKey: "narrator_id",
    responseKeys: ["favourited", "favorited", "is_favourite", "wishlisted"],
  },
  genre: {
    method: "toggleFavouriteGenre",
    idKey: "genre_id",
    responseKeys: ["favourited", "favorited", "is_favourite", "wishlisted"],
  },
  listenLater: {
    method: "toggleListenLater",
    idKey: "story_id",
    responseKeys: ["listen_later", "is_listen_later", "saved", "wishlisted"],
  },
};

/** Calls the toggle endpoint. Returns the server's value when it sends one. */
export async function toggleFavourite(
  kind: FavouriteKind,
  id: number | string
): Promise<boolean | undefined> {
  const cfg = FAVOURITE_API[kind];

  const { data } = await axios.post("/", {
    method: cfg.method,
    [cfg.idKey]: Number(id),
  });

  if (data && data.statusCode != null && data.statusCode !== 200) {
    throw new Error(data.msg || `${cfg.method} failed`);
  }

  const payload = data?.data ?? data;
  for (const key of cfg.responseKeys) {
    if (typeof payload?.[key] === "boolean") return payload[key];
  }
  return undefined;
}

/** Stories the user saved with "Listen Later". */
export async function fetchListenLaterStories(): Promise<any[]> {
  const { data } = await axios.post("/", {
    method: "getListenLaterStories",
    key_type: "listen_later",
  });

  if (data?.statusCode !== 200) return [];
  return data?.data?.stories ?? [];
}

/**
 * storyMeta
 * ---------
 * Reads the extra book information the About page needs out of the
 * `getStoryDetail` response: rating, view count, short synopsis and the
 * three credits (author, narrator / voice-over artist, production house).
 *
 * The backend field names are not fixed yet, so every value is looked up
 * under a few likely names. Once the backend confirms the final names, keep
 * only those names in the lists below (search for "CANDIDATES").
 *
 * If the backend only sends the old `credits` text
 * ("Author: A | Narrator: B | Production: C") the credits are parsed from
 * it, but then they have no id, so they show as plain text, not as links.
 */

export type CreditKind = "author" | "narrator" | "production";

export type CreditItem = {
  kind: CreditKind;
  name: string;
  /** author_id / narrator_id, when the backend sends it -> profile link */
  id?: string;
  /** external link (production house website / profile), when sent */
  url?: string;
};

export type StoryMeta = {
  rating: number | null;
  ratingCount: number | null;
  views: number | null;
  shortDescription: string;
  fullDescription: string;
  credits: CreditItem[];
};

/* ---------------- CANDIDATES (field names the backend may use) ---------------- */

const RATING_KEYS = ["rating", "average_rating", "avg_rating", "rating_avg"];
const RATING_COUNT_KEYS = ["rating_count", "ratings_count", "total_ratings", "reviews_count"];
const VIEW_KEYS = ["views", "view_count", "total_views", "listens", "listen_count", "play_count"];
const SHORT_DESC_KEYS = ["short_description", "meta_description", "synopsis", "tagline"];

const AUTHOR_KEYS = ["author", "authors", "author_name", "writer", "story_author"];
const AUTHOR_ID_KEYS = ["author_id"];
const NARRATOR_KEYS = ["narrator", "narrators", "narrator_name", "voice_artist", "voice_over_artist", "voice", "narrated_by"];
const NARRATOR_ID_KEYS = ["narrator_id"];
const PRODUCTION_KEYS = ["production_house", "production_house_name", "production", "studio", "publisher", "produced_by"];
const PRODUCTION_URL_KEYS = [
  "production_house_url",
  "production_house_link",
  "production_house_website",
  "production_url",
];

/* ---------------- small helpers ---------------- */

function pick(obj: any, keys: string[]): any {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Removes any HTML tags the backend may send (e.g. <b>, <br>) and tidies spaces. */
export function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 1250 -> "1.2K", 3400000 -> "3.4M" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

/** First sentence(s) of a long text, cut at a word boundary. */
function shorten(text: string, max = 180): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).trim()}…`;
}

/* ---------------- credits ---------------- */

type Person = { name: string; id?: string };

// value can be: "Name" | { id, name } | [{ id, name }, ...] | ["Name", ...]
function personFrom(value: any): Person | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string" || typeof value === "number") {
    const name = stripHtml(String(value));
    return name ? { name } : null;
  }

  if (Array.isArray(value)) {
    const people = value.map(personFrom).filter(Boolean) as Person[];
    if (people.length === 0) return null;
    // several names -> one line; a profile link only makes sense for one person
    return {
      name: people.map((p) => p.name).join(", "),
      id: people.length === 1 ? people[0].id : undefined,
    };
  }

  if (typeof value === "object") {
    const name = stripHtml(String(value.name ?? value.title ?? ""));
    if (!name) return null;
    const id = value.id ?? value.author_id ?? value.narrator_id;
    return { name, id: id != null ? String(id) : undefined };
  }

  return null;
}

const KIND_PATTERNS: Record<CreditKind, RegExp> = {
  author: /author|writer|written|story by|எழுத்தாளர்|ஆசிரியர்|எழுதிய/i,
  narrator: /narrat|voice|artist|குரல்|வாசிப்/i,
  production: /production|studio|produced|தயாரிப்/i,
};

/** Fallback: parse the old "Label: value | Label: value" credits text. */
function creditsFromText(text: unknown): Partial<Record<CreditKind, Person>> {
  const result: Partial<Record<CreditKind, Person>> = {};
  if (typeof text !== "string") return result;

  text
    .split(/\||\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf(":");
      if (idx === -1) return;

      const label = part.slice(0, idx).trim();
      const name = stripHtml(part.slice(idx + 1));
      if (!name) return;

      (Object.keys(KIND_PATTERNS) as CreditKind[]).forEach((kind) => {
        if (!result[kind] && KIND_PATTERNS[kind].test(label)) {
          result[kind] = { name };
        }
      });
    });

  return result;
}

/* ---------------- main ---------------- */

export function getStoryMeta(story: any): StoryMeta {
  const fullDescription = stripHtml(story?.description);

  const explicitShort = stripHtml(pick(story, SHORT_DESC_KEYS));
  const shortDescription = explicitShort || shorten(fullDescription);

  const fromText = creditsFromText(story?.credits);

  const author =
    personFrom(pick(story, AUTHOR_KEYS)) ?? fromText.author ?? null;
  const narrator =
    personFrom(pick(story, NARRATOR_KEYS)) ?? fromText.narrator ?? null;
  const production =
    personFrom(pick(story, PRODUCTION_KEYS)) ?? fromText.production ?? null;

  // separate *_id fields (when the name is a plain string)
  const authorId = pick(story, AUTHOR_ID_KEYS);
  const narratorId = pick(story, NARRATOR_ID_KEYS);
  const productionUrl = pick(story, PRODUCTION_URL_KEYS);

  const credits: CreditItem[] = [];

  if (author) {
    credits.push({
      kind: "author",
      name: author.name,
      id: author.id ?? (authorId != null ? String(authorId) : undefined),
    });
  }
  if (narrator) {
    credits.push({
      kind: "narrator",
      name: narrator.name,
      id: narrator.id ?? (narratorId != null ? String(narratorId) : undefined),
    });
  }
  if (production) {
    credits.push({
      kind: "production",
      name: production.name,
      url: typeof productionUrl === "string" ? productionUrl : undefined,
    });
  }

  return {
    rating: toNumber(pick(story, RATING_KEYS)),
    ratingCount: toNumber(pick(story, RATING_COUNT_KEYS)),
    views: toNumber(pick(story, VIEW_KEYS)),
    shortDescription,
    fullDescription,
    credits,
  };
}

/**
 * Credits from the old `credits` text that are NOT author / narrator /
 * production house (music, editor, ...). Shown only after "View more".
 */
export function getExtraCredits(
  story: any
): { label: string; value: string }[] {
  const text = story?.credits;
  if (typeof text !== "string") return [];

  const extra: { label: string; value: string }[] = [];

  text
    .split(/\||\n/)
    .map((part: string) => part.trim())
    .filter(Boolean)
    .forEach((part: string) => {
      const idx = part.indexOf(":");
      const label = idx === -1 ? part : part.slice(0, idx).trim();
      const value = idx === -1 ? "" : stripHtml(part.slice(idx + 1));

      const isMain = (Object.keys(KIND_PATTERNS) as CreditKind[]).some((k) =>
        KIND_PATTERNS[k].test(label)
      );

      if (!isMain) extra.push({ label, value });
    });

  return extra;
}

/**
 * Every line of the old `credits` text as { label, value }.
 * Used as a fallback so credits are NEVER hidden: if the backend sends the
 * credits in a format we cannot classify (other labels, Tamil labels, plain
 * text without "label: value"), they are still shown as they come.
 */
export function getRawCredits(story: any): { label: string; value: string }[] {
  const text = story?.credits;
  if (typeof text !== "string" || !text.trim()) return [];

  return text
    .split(/\||\n/)
    .map((part: string) => part.trim())
    .filter(Boolean)
    .map((part: string) => {
      const idx = part.indexOf(":");
      if (idx === -1) return { label: stripHtml(part), value: "" };
      return {
        label: part.slice(0, idx).trim(),
        value: stripHtml(part.slice(idx + 1)),
      };
    });
}

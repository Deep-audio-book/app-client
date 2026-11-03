/**
 * Help Center structure.
 *
 * The WORDS are not here: every question / answer lives in the language
 * files (constants/locales/en.json, ta.json) under  help.faq.<id>.q / .a  and
 * the category names under  help.categories.<id>. That is why the Help Center
 * changes by itself when the app language changes.
 *
 * To add a question (Deep Talks team):
 *   1. add  { id: "myQuestion", category: "start" }  to HELP_ITEMS below
 *   2. add  "myQuestion": { "q": "...", "a": "..." }  under help.faq in
 *      en.json AND ta.json
 * To add a category: add its id to HELP_CATEGORIES and its name under
 * help.categories in both language files.
 */
export const HELP_CATEGORIES = [
  "start",
  "listening",
  "downloads",
  "rent",
  "account",
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export type HelpItem = { id: string; category: HelpCategory };

export const HELP_ITEMS: HelpItem[] = [
  // getting started
  { id: "findBooks", category: "start" },
  { id: "freeEpisode", category: "start" },
  { id: "changeLanguage", category: "start" },

  // listening
  { id: "resume", category: "listening" },
  { id: "speedTimer", category: "listening" },
  { id: "audioVideo", category: "listening" },
  { id: "background", category: "listening" },

  // downloads
  { id: "download", category: "downloads" },
  { id: "downloadsWhere", category: "downloads" },

  // rent & premium
  { id: "rentVsPremium", category: "rent" },
  { id: "rentalExpiry", category: "rent" },
  { id: "cart", category: "rent" },

  // account
  { id: "devices", category: "account" },
  { id: "logout", category: "account" },
];

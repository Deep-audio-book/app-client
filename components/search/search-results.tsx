import axios from "@/axios.config";
import { router } from "expo-router";
import i18n from "i18next";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { isNetworkError, useOnReconnect } from "../../utils/network";

/* ---------- config ---------- */

// user_id and language_code are added to every request by axios.config.ts,
// so nothing user-specific is hard-coded here.

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 1;

/* ---------- types ---------- */

type ResultKind = "story" | "author" | "narrator" | "category" | "genre";

interface ResultItem {
  id: number;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  image?: string | null;
}

interface ResultSection {
  title: string;
  data: ResultItem[];
}

/*
 * Backend response shape enakku theriyaadhu, so rendu vidhamum handle pannuren:
 *   1) [{ type, title, data: [...] }]            (array of sections)
 *   2) { stories: [], authors: [], narrators: [] } (object of lists)
 * Un actual response vera maari irundha `normalize` function mattum maathu.
 */
const KIND_BY_KEY: Record<string, ResultKind> = {
  story: "story",
  stories: "story",
  author: "author",
  authors: "author",
  narrator: "narrator",
  narrators: "narrator",
  category: "category",
  categories: "category",
  genre: "genre",
  genres: "genre",
};

function kindFromSectionType(type?: unknown): ResultKind | undefined {
  if (typeof type !== "string" || !type) return undefined;
  const key = type.toLowerCase();
  const hit = Object.keys(KIND_BY_KEY).find((k) => key.includes(k));
  return hit ? KIND_BY_KEY[hit] : undefined;
}

function toItem(raw: any, kind: ResultKind): ResultItem {
  return {
    // most backends send `id`; fall back to `<kind>_id` (e.g. story_id)
    id: Number(raw.id ?? raw[`${kind}_id`]),
    kind,
    title: raw.name ?? raw.title ?? "",
    subtitle: raw.author_name ?? raw.authorName ?? raw.description ?? undefined,
    image: raw.cover ?? raw.avatar ?? raw.icon ?? raw.image ?? null,
  };
}

function normalize(data: any, titles: Record<ResultKind, string>): ResultSection[] {
  const sections: ResultSection[] = [];

  if (Array.isArray(data)) {
    data.forEach((s: any) => {
      // The section's type decides what a tap does, so look at every field
      // that could name it, and let an item's own `type` override it.
      const kind =
        kindFromSectionType(s.type) ??
        kindFromSectionType(s.key) ??
        kindFromSectionType(s.kind) ??
        "story";

      if (Array.isArray(s.data) && s.data.length) {
        sections.push({
          title: s.title ?? titles[kind],
          data: s.data.map((r: any) =>
            toItem(r, kindFromSectionType(r?.type ?? r?.kind) ?? kind)
          ),
        });
      }
    });
  } else if (data && typeof data === "object") {
    Object.keys(data).forEach((key) => {
      const kind = KIND_BY_KEY[key.toLowerCase()];
      const list = data[key];
      if (kind && Array.isArray(list) && list.length) {
        sections.push({
          title: titles[kind],
          data: list.map((r: any) => toItem(r, kind)),
        });
      }
    });
  }

  return sections;
}

/* ---------- navigation ----------
 *
 * Tapping a result opens the matching page - the same routes and params
 * the Search tab (SearchScreen.tsx) and the rest of the app already use:
 *
 *   story     -> /storyEpisode   { storyId }          (About page first)
 *   author    -> /author-details { id, method: getAuthorDetails,   id_key: author_id }
 *   narrator  -> /author-details { id, method: getNarratorDetails, id_key: narrator_id }
 *   genre     -> /storyView      { api_method: getGenreStories, genre_id }
 *   category  -> /storyView      { api_method: getStoryListViewAll, key_type: id }
 */

function openItem(item: ResultItem) {
  // A result without a usable id can't open anything.
  if (!Number.isFinite(item.id)) return;

  Keyboard.dismiss();

  switch (item.kind) {
    case "story":
      router.push({
        pathname: "/storyEpisode",
        params: {
          storyId: String(item.id),
          // optional: lets the page show the title / cover while it loads
          title: item.title,
          ...(item.image ? { cover: item.image } : {}),
        },
      } as any);
      break;

    case "author":
      router.push({
        pathname: "/author-details",
        params: {
          id: String(item.id),
          method: "getAuthorDetails",
          id_key: "author_id",
          title: item.title || i18n.t("search.authorTitle"),
        },
      });
      break;

    case "narrator":
      router.push({
        pathname: "/author-details",
        params: {
          id: String(item.id),
          method: "getNarratorDetails",
          id_key: "narrator_id",
          title: item.title || i18n.t("search.narratorTitle"),
        },
      });
      break;

    case "genre":
      router.push({
        pathname: "/storyView",
        params: {
          title: item.title,
          view_type: "grid",
          key_type: "genre",
          api_method: "getGenreStories",
          genre_id: String(item.id),
        },
      });
      break;

    case "category":
      router.push({
        pathname: "/storyView",
        params: {
          title: item.title,
          view_type: "grid",
          key_type: String(item.id),
          api_method: "getStoryListViewAll",
        },
      });
      break;
  }
}

/* ---------- icons ---------- */

const BackIcon = ({ color = "#fff", size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M19 12H5" />
    <Path d="M12 19l-7-7 7-7" />
  </Svg>
);

const CloseIcon = ({ color = "#b3b3b3", size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <Path d="M18 6L6 18" />
    <Path d="M6 6l12 12" />
  </Svg>
);

const SearchIcon = ({ color = "#b3b3b3", size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={11} cy={11} r={7} />
    <Path d="M21 21l-4.35-4.35" />
  </Svg>
);

/* ---------- row ---------- */

const ResultRow: React.FC<{ item: ResultItem }> = ({ item }) => {
  const round = item.kind === "author" || item.kind === "narrator";

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => openItem(item)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          style={[styles.rowImg, round && styles.rowImgRound]}
        />
      ) : (
        <View style={[styles.rowImg, styles.rowImgFallback, round && styles.rowImgRound]} />
      )}

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {!!item.subtitle && (
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

/* ---------- screen ---------- */

const SearchResultsScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<ResultSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // latest request id — pazhaya response vandhaalum ignore pannum
  const requestId = useRef(0);

  const titles: Record<ResultKind, string> = {
    story: t("search.storiesTitle", { defaultValue: "Stories" }),
    author: t("search.authorsTitle"),
    narrator: t("search.narratorsTitle"),
    category: t("search.categoriesTitle"),
    genre: t("search.genresTitle"),
  };

  const runSearch = useCallback(
    async (text: string) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const { data: res } = await axios.post("/", {
          method: "getSearchResults",
          query: text,
        });

        if (id !== requestId.current) return;

        if (res.statusCode === 200) {
          setSections(normalize(res.data, titles));
        } else {
          setSections([]);
          setError(res.msg || t("search.failedToLoad"));
        }
      } catch (err: any) {
        if (id !== requestId.current) return;
        setSections([]);
        setError(
          isNetworkError(err)
            ? t("search.noInternet")
            : t("search.somethingWentWrong")
        );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setSearched(true);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  // internet came back while a search is on screen -> run it again
  useOnReconnect(() => {
    const text = query.trim();
    if (text.length >= MIN_QUERY_LENGTH) runSearch(text);
  });

  // debounce: type panni 400ms nirutha aprm dhaan API call
  useEffect(() => {
    const text = query.trim();

    if (text.length < MIN_QUERY_LENGTH) {
      requestId.current++; // pending request ah cancel
      setSections([]);
      setLoading(false);
      setError(null);
      setSearched(false);
      return;
    }

    const timer = setTimeout(() => runSearch(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const trimmed = query.trim();
  const showIdle = trimmed.length < MIN_QUERY_LENGTH;
  const showEmpty = !showIdle && searched && !loading && !error && sections.length === 0;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      {/* ---------- top bar ---------- */}
      <View style={styles.topbar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", { defaultValue: "Back" })}
        >
          <BackIcon />
        </TouchableOpacity>

        <View style={styles.inputWrap}>
          <SearchIcon />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor="#8a8a8a"
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            selectionColor="#fff"
            onSubmitEditing={() => trimmed && runSearch(trimmed)}
          />
          {!!query && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.clear", { defaultValue: "Clear" })}
            >
              <CloseIcon />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ---------- body ---------- */}
      {showIdle ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyTitle}>
            {t("search.idleTitle", { defaultValue: "Play what you love" })}
          </Text>
          <Text style={styles.emptySub}>
            {t("search.idleSub", {
              defaultValue: "Search for stories, authors, narrators and more.",
            })}
          </Text>
        </View>
      ) : loading && sections.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => runSearch(trimmed)}>
            <Text style={styles.retryText}>{t("search.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : showEmpty ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyTitle}>
            {t("search.noResultsTitle", {
              query: trimmed,
              defaultValue: `No results found for "${trimmed}"`,
            })}
          </Text>
          <Text style={styles.emptySub}>
            {t("search.noResultsSub", {
              defaultValue: "Check the spelling or try a different keyword.",
            })}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={({ item }) => <ResultRow item={item} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
};

export default SearchResultsScreen;

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#121212",
  },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1c1c1c",
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "#333",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 0,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySub: {
    marginTop: 10,
    color: "#a7a7a7",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#333",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rowImg: {
    width: 56,
    height: 56,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
  },
  rowImgRound: {
    borderRadius: 28,
  },
  rowImgFallback: {
    backgroundColor: "#2a2a2a",
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rowSub: {
    marginTop: 2,
    color: "#a7a7a7",
    fontSize: 13,
  },
});

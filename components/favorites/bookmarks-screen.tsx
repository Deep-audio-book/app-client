import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Bookmark, fetchBookmarks, toggleBookmark } from "@/api/Bookmarks";
import { useBookmarkStore } from "@/hooks/useBookmark";
import { useFocusRefetch } from "@/hooks/useFocusRefetch";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Chapter bookmarks, newest first. Tap = open the book on its chapter list. */
export default function BookmarksScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Bookmark[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { loading, refetch } = useFocusRefetch(async () => {
    try {
      setError(null);
      const list = await fetchBookmarks();
      setItems(list);
      useBookmarkStore.getState().setMany(list.map((b) => b.chapter_id), true);
    } catch (e: any) {
      setError(e?.message || t("favorites.somethingWentWrong", "Something went wrong."));
    }
  });

  const remove = async (b: Bookmark) => {
    setItems((l) => l.filter((x) => x.bookmark_id !== b.bookmark_id)); // optimistic
    useBookmarkStore.getState().set(b.chapter_id, false);
    try {
      await toggleBookmark(b.story_id, b.chapter_id);
    } catch {
      refetch(); // put it back if the server said no
    }
  };

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={s.top}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={s.title}>{t("favorites.cat.bookmarks", "Bookmarked Chapters")}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />
      ) : error && items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.muted}>{error}</Text>
          <Pressable onPress={refetch} style={s.retry}>
            <Text style={s.retryText}>{t("common.retry", "Retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => String(b.bookmark_id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="bookmark-outline" size={42} color="#8A8A8A" />
              <Text style={s.emptyTitle}>{t("album.noBookmarks", "No bookmarks yet")}</Text>
              <Text style={s.muted}>
                {t("album.noBookmarksHint", "Bookmarks you add while listening will show up here.")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={s.row}
              onPress={() =>
                router.push({
                  pathname: "/storyEpisode",
                  params: { storyId: String(item.story_id), tab: "chapters" },
                } as any)
              }
            >
              {item.story_cover ? (
                <Image source={{ uri: item.story_cover }} style={s.cover} />
              ) : (
                <View style={[s.cover, { backgroundColor: "#222" }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.chapter_title}</Text>
                <Text style={s.rowSub} numberOfLines={1}>{item.story_title}</Text>
                <Text style={s.rowMeta}>
                  {t("player.chapterLabel", { number: item.chapter_number, defaultValue: `Chapter ${item.chapter_number}` })}
                  {item.position_seconds > 0 ? ` · ${fmt(item.position_seconds)}` : ""}
                </Text>
              </View>
              {item.locked && <Ionicons name="lock-closed" size={16} color="#8A8A8A" />}
              <Pressable hitSlop={10} onPress={() => remove(item)} accessibilityLabel={t("favorites.removeFromFavorites", "Remove")}>
                <Ionicons name="bookmark" size={22} color="#F5C451" />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  cover: { width: 54, height: 72, borderRadius: 8 }, // 3:4 like the rest of the app
  rowTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  rowSub: { color: "#bbb", fontSize: 13, marginTop: 2 },
  rowMeta: { color: "#8A8A8A", fontSize: 12, marginTop: 4 },
  center: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  muted: { color: "#8A8A8A", textAlign: "center", fontSize: 14 },
  retry: { paddingHorizontal: 22, height: 42, borderRadius: 21, backgroundColor: "#222", justifyContent: "center" },
  retryText: { color: "#fff" },
});

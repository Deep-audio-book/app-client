import { useLocalSearchParams } from "expo-router";

import StoryGridView from "@/components/card/gird/gridView";
import StoryListView from "@/components/card/list/listView";
import { useStoryData } from "@/hooks/useStoryData";

const BG_COLORS: Record<string, string> = {
  getStoryListViewAll: "#2e5263",
  getGenreStories: "#e3876574",
  getAuthorDetails : "#86915079",
  getFavouriteStories: "#632e3a",
  getNarratorDetails: "#684a6a",
};

const DEFAULT_BG_COLOR = "#2E635B";

export default function StoryView() {
  const allParams = useLocalSearchParams<Record<string, string>>();

  const {
    view_type,
    title,
    api_method,
    key_type,
    ...extraParams // genre_id, author_id, narrator_id — edhu vandhalum idhula automatic ah varum
  } = allParams;

  const storyData = useStoryData({
    api_method,
    key_type,
    view_type,
    title,
    extraParams,
  });

  // console.log("StoryView: storyData",allParams );
  const bgFill =
    api_method && BG_COLORS[api_method]
      ? BG_COLORS[api_method]
      : DEFAULT_BG_COLOR;

  const sharedProps = {
    bgFill,
    keyType: key_type,
    fallbackTitle: title,
    ...storyData,
  };

  if (view_type === "grid") {
    return <StoryGridView {...sharedProps} />;
  }

  return <StoryListView {...sharedProps} />;
}
export type MediaKind = "audio" | "video";

export type Chapter = {
  id: string;
  number: number;
  title: string;
  description: string;
  artist: string;
  duration: string;
  duration_in_seconds: number;
  audio_url: string | null;
  video_url: string | null;
  video_status: number;
  cover: string | null;
  free: boolean;
};

export type StoryDetail = {
  id: string;
  title: string;
  description: string;
  cover: string;
  genre: string;
  credits: string;
  chapters: Chapter[];
  price_inr?: number;
  price_usd?: number;
  is_purchased?: boolean;
};

export interface Story {
  id: number;
  cover: string | null;
  title: string;
  author: string;
  narrator: string | null;
  genre: string[];
  story_duration: string;
  story_duration_seconds: string;
  last_listened_seconds?: number;
  rating: number;
  listens: number;
  like: boolean;
  dislike: boolean;
  wishlisted: boolean;
  plays?: number;
  playsLabel?: string;
  chapters?: number;
  day: string;
  isNew: boolean;
  category?:string;
}
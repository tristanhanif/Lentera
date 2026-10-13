export type StoryType = "photo" | "video";

export type StoryLayout = "single" | "split2" | "grid3" | "grid4";

export type StoryMediaType = "image" | "video";

export interface StoryUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export interface StoryMediaPublic {
  url: string;
  type: StoryMediaType;
  sortOrder: number;
}

export type StoryMusicMode = "none" | "lyrics" | "vinyl";

export interface StoryMusic {
  url: string;
  title: string;
  artist: string;
  cover: string | null;
  start?: number | null;
  mode?: StoryMusicMode | null;
  lyrics?: string | null;
  x?: number | null;
  y?: number | null;
  scale?: number | null;
}

export type StoryTextStyle = "modern" | "classic" | "typewriter" | "neon" | "poster";

export interface StoryText {
  content: string;
  style: StoryTextStyle;
  bg: string;
  x?: number | null;
  y?: number | null;
  scale?: number | null;
}

export interface StoryItem {
  id: string;
  type: StoryType;
  layout: StoryLayout;
  caption: string | null;
  music: StoryMusic | null;
  text: StoryText | null;
  post?: {
    id: string;
    ownerUsername: string | null;
    mediaCount: number | null;
    scale?: number | null;
  } | null;
  unlockAt: string | null;
  expiresAt: string;
  createdAt: string;
  isLocked: boolean;
  timeLeftSec: number;
  viewCount: number;
  isViewedByMe: boolean;
  isMine: boolean;
  totalLikes: number;
  isLikedByMe: boolean;
  user: StoryUser;
  medias: StoryMediaPublic[];
}

export interface StoryViewerEntry {
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  viewedAt: string;
  liked: boolean;
}

export interface CreateStoryMediaPayload {
  url: string;
  publicId: string;
  type: StoryMediaType;
}

export interface CreateStoryPayload {
  type: StoryType;
  layout?: StoryLayout;
  caption?: string;
  unlockAt?: string;
  music?: StoryMusic;
  text?: StoryText;
  postId?: string;
  postOwnerUsername?: string;
  postMediaCount?: number;
  postScale?: number;
  medias: CreateStoryMediaPayload[];
}

export interface StoryGroup {
  user: StoryUser;
  items: StoryItem[];
}

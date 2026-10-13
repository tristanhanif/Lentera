import { BaseResponse } from "@/app/lib/axios";

export interface PostPayload {
  content: string;
  location?: string;
  music?: {
    url?: string | null;
    title?: string;
    artist?: string;
    cover?: string | null;
  } | null;
  medias: {
    url?: string;
    type?: string;
    sortOrder?: number;
    filter?: string;
    adjustments?: Record<string, number>;
  }[];
}

export interface PostLike {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string;
  };
}

export interface PostResponseSingle {
  id: string;
  user: {
    id?: string;
    name: string;
    username?: string;
    avatar: string;
  };
  content: string;
  location?: string | null;
  musicUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  musicCover?: string | null;
  createdAt: Date;
  medias: {
    url: string;
    id: string;
    type?: string;
  }[];
  likes: PostLike[];
  comments: [];
  commentsCount: number;
}

export interface PostResponse extends BaseResponse {
  data: PostResponseSingle;
}

export interface MyPostResponse extends BaseResponse {
  data: PostResponseSingle[];
  meta?: {
    totalPages: number;
    totalItems?: number;
    page?: number;
    limit?: number;
  };
}

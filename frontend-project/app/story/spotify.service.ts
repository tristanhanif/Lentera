"use client";

import { useQuery } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  cover: string | null;
  previewUrl: string | null;
  spotifyUrl: string | null;
}

const getTrending = async (): Promise<BaseResponse<SpotifyTrack[]>> => {
  return api.get("/spotify/trending").then((res) => res.data);
};

const searchTracks = async (
  q: string,
): Promise<BaseResponse<SpotifyTrack[]>> => {
  return api
    .get("/spotify/search", { params: { q, limit: 20 } })
    .then((res) => res.data);
};

// 30 lagu tren — hanya fetch saat panel musik dibuka.
export const useSpotifyTrending = (enabled: boolean) => {
  return useQuery<BaseResponse<SpotifyTrack[]>>({
    queryKey: ["/spotify/trending"],
    queryFn: getTrending,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};

// Pencarian lagu — hanya fetch saat ada kata kunci.
export const useSpotifySearch = (query: string) => {
  const q = query.trim();
  return useQuery<BaseResponse<SpotifyTrack[]>>({
    queryKey: ["/spotify/search", q],
    queryFn: () => searchTracks(q),
    enabled: q.length >= 2,
    staleTime: 60 * 1000,
    retry: false,
  });
};

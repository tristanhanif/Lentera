"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";

export interface BackendChannel {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  ownerUsername: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount: number;
  joinedAt: string;
  unreadCount: number;
  isOwner: boolean;
  lastMessage: {
    kind: "text" | "voice";
    text: string | null;
    duration: number | null;
    createdAt: string;
  } | null;
}

export interface BackendChannelDetail extends Omit<BackendChannel, "lastMessage" | "unreadCount"> {
  ownerName: string | null;
  ownerAvatar: string | null;
}

export interface BackendChannelMessage {
  id: string;
  senderId: string | null;
  isMine: boolean;
  kind: "text" | "voice";
  text: string | null;
  audioUrl: string | null;
  duration: number | null;
  createdAt: string;
}

export interface BackendChannelMessagesData {
  messages: BackendChannelMessage[];
  joinedAt: string;
  unreadCount: number;
  firstUnreadId: string | null;
}

export interface ExploreChannel {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  ownerUsername: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount: number;
  isFollowing: boolean;
  isOwner: boolean;
}

const getChannels = async (): Promise<BaseResponse<BackendChannel[]>> =>
  api.get("/channels").then((res) => res.data);

export function useBackendChannels(enabled = true) {
  return useQuery<BaseResponse<BackendChannel[]>>({
    queryKey: ["/channels"],
    queryFn: getChannels,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 8,
    enabled,
  });
}

const getChannelMessages = async (
  id: string,
): Promise<BaseResponse<BackendChannelMessagesData>> =>
  api.get(`/channels/${id}/messages`).then((res) => res.data);

export function useBackendChannelMessages(channelId: string | null) {
  return useQuery({
    queryKey: ["/channels", channelId, "messages"],
    queryFn: () => getChannelMessages(channelId as string),
    enabled: !!channelId,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 5,
  });
}

export function useCreateBackendChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string; avatarUrl: string | null }) =>
      api.post("/channels", payload).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels"] });
      qc.invalidateQueries({ queryKey: ["/channels/explore/popular"] });
    },
  });
}

export function useUpdateBackendChannel(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; description?: string; avatarUrl?: string | null }) =>
      api.patch(`/channels/${channelId}`, patch).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels"] });
      qc.invalidateQueries({ queryKey: ["/channels/explore/popular"] });
    },
  });
}

export function useSendBackendChannelText(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.post(`/channels/${channelId}/messages`, { text }).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels", channelId, "messages"] });
      qc.invalidateQueries({ queryKey: ["/channels"] });
    },
  });
}

export function useSendBackendChannelVoice(channelId: string, onProgress?: (percent: number) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blob, duration }: { blob: Blob; duration: number }) => {
      const formData = new FormData();
      formData.append("file", blob, `vn-${Date.now()}.webm`);
      const up = await api.post<{ file_url?: string }>(`/upload/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        ...(onProgress
          ? {
              onUploadProgress: (e: { loaded: number; total?: number }) => {
                if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
              },
            }
          : {}),
      });
      const url = up.data?.file_url;
      if (!url) throw new Error("Gagal mengunggah VN");
      return api
        .post(`/channels/${channelId}/voice`, { audioUrl: url, duration })
        .then((res) => res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels", channelId, "messages"] });
      qc.invalidateQueries({ queryKey: ["/channels"] });
    },
  });
}

export function useMarkChannelRead(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/channels/${channelId}/read`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels"] });
      qc.invalidateQueries({ queryKey: ["/channels", channelId, "messages"] });
    },
  });
}

export function useFollowChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      api.post(`/channels/${channelId}/follow`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels"] });
      qc.invalidateQueries({ queryKey: ["/channels/explore/popular"] });
    },
  });
}

export function useUnfollowChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) =>
      api.delete(`/channels/${channelId}/follow`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/channels"] });
      qc.invalidateQueries({ queryKey: ["/channels/explore/popular"] });
    },
  });
}

const getExploreChannels = async (): Promise<BaseResponse<ExploreChannel[]>> =>
  api.get("/channels/explore/popular").then((res) => res.data);

export function useExploreChannels(enabled = true) {
  return useQuery<BaseResponse<ExploreChannel[]>>({
    queryKey: ["/channels/explore/popular"],
    queryFn: getExploreChannels,
    staleTime: 1000 * 20,
    enabled,
  });
}

export const DEFAULT_CHANNEL_ICON = "/icon-komunitas.png";

export function channelAvatar(src: string | null | undefined): string {
  return src || DEFAULT_CHANNEL_ICON;
}

export function formatVoiceDuration(totalSecs: number | null | undefined): string {
  const s = Math.max(0, Math.round(totalSecs ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";
import type { CommunityMember } from "./community.store";

export interface BackendCommunityMember extends CommunityMember {
  joinedAt: string;
  isAdmin: boolean;
}

export interface BackendCommunity {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  joinedAt: string;
  unreadCount: number;
  members: BackendCommunityMember[];
  lastMessage: {
    text: string;
    senderId: string | null;
    isEvent: boolean;
    createdAt: string;
    audioUrl?: string | null;
    voiceDuration?: number | null;
  } | null;
}

export interface BackendCommunityMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderUsername: string | null;
  isMine: boolean;
  text: string;
  isEvent: boolean;
  createdAt: string;
  audioUrl?: string | null;
  voiceDuration?: number | null;
}

const getCommunities = async (): Promise<BaseResponse<BackendCommunity[]>> =>
  api.get("/communities").then((res) => res.data);

export function useBackendCommunities(enabled = true) {
  return useQuery<BaseResponse<BackendCommunity[]>>({
    queryKey: ["/communities"],
    queryFn: getCommunities,
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 8,
    enabled,
  });
}

export interface BackendCommunityMessagesData {
  messages: BackendCommunityMessage[];
  joinedAt: string;
  unreadCount: number;
  firstUnreadId: string | null;
}

const getCommunityMessages = async (
  id: string,
): Promise<BaseResponse<BackendCommunityMessagesData>> =>
  api.get(`/communities/${id}/messages`).then((res) => res.data);

export function useBackendCommunityMessages(communityId: string | null) {
  return useQuery({
    queryKey: ["/communities", communityId, "messages"],
    queryFn: () => getCommunityMessages(communityId as string),
    enabled: !!communityId && !(communityId as string).startsWith("local-"),
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 5,
  });
}

export function useMarkCommunityRead(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post(`/communities/${communityId}/read`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
    },
  });
}

export function useCreateBackendCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string; avatarUrl: string | null }) =>
      api.post("/communities", payload).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
    },
  });
}

export function useUpdateBackendCommunity(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { name?: string; description?: string; avatarUrl?: string | null }) =>
      api.patch(`/communities/${communityId}`, patch).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
    },
  });
}

export function useSendBackendCommunityMessage(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      payload:
        | string
        | { text: string; audioUrl?: string | null; voiceDuration?: number | null },
    ) =>
      api
        .post(
          `/communities/${communityId}/messages`,
          typeof payload === "string" ? { text: payload } : payload,
        )
        .then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
      qc.invalidateQueries({ queryKey: ["/communities"] });
    },
  });
}

export function useAddBackendCommunityMembers(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      api.post(`/communities/${communityId}/members`, { userIds }).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
    },
  });
}

export function useClearBackendCommunityChat(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/communities/${communityId}/messages`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
      qc.invalidateQueries({ queryKey: ["/communities"] });
    },
  });
}

export interface ExploreCommunity {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  ownerUsername: string | null;
  ownerName: string | null;
  ownerAvatar: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  isMember: boolean;
}

const getExploreCommunities = async (): Promise<BaseResponse<ExploreCommunity[]>> =>
  api.get("/communities/explore/popular").then((res) => res.data);

export function useExploreCommunities(enabled = true) {
  return useQuery<BaseResponse<ExploreCommunity[]>>({
    queryKey: ["/communities/explore/popular"],
    queryFn: getExploreCommunities,
    staleTime: 1000 * 20,
    enabled,
  });
}

export function useJoinCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      api.post(`/communities/${communityId}/join`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
      qc.invalidateQueries({ queryKey: ["/communities/explore/popular"] });
    },
  });
}

export function useLeaveBackendCommunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (communityId: string) =>
      api.delete(`/communities/${communityId}/members/me`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
    },
  });
}

export function usePromoteCommunityAdmin(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/communities/${communityId}/admins`, { userId }).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
    },
  });
}

export function useRemoveCommunityMember(communityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/communities/${communityId}/members/${userId}`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/communities"] });
      qc.invalidateQueries({ queryKey: ["/communities", communityId, "messages"] });
    },
  });
}

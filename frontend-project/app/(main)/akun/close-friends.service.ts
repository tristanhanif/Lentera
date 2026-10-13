import { api, BaseResponse } from "@/app/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CloseFriendUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  addedAt?: string;
}

type CloseFriendListResponse = BaseResponse<CloseFriendUser[]>;
type CloseFriendIdsResponse = BaseResponse<string[]>;

const fetchCloseFriends = (): Promise<CloseFriendListResponse> =>
  api.get<CloseFriendListResponse>("/users/close-friends").then((res) => res.data);

const fetchCloseFriendIds = (): Promise<CloseFriendIdsResponse> =>
  api.get<CloseFriendIdsResponse>("/users/close-friends/ids").then((res) => res.data);

const addCloseFriend = (id: string) =>
  api.post(`/users/close-friends/${id}`).then((res) => res.data);

const removeCloseFriend = (id: string) =>
  api.delete(`/users/close-friends/${id}`).then((res) => res.data);

export const CLOSE_FRIENDS_QUERY_KEY = ["close-friends"];
export const CLOSE_FRIEND_IDS_QUERY_KEY = ["close-friends", "ids"];

export function useCloseFriends(enabled = true) {
  return useQuery({
    queryKey: CLOSE_FRIENDS_QUERY_KEY,
    queryFn: fetchCloseFriends,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCloseFriendIds(enabled = true) {
  return useQuery({
    queryKey: CLOSE_FRIEND_IDS_QUERY_KEY,
    queryFn: fetchCloseFriendIds,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

function useInvalidateCloseFriends() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CLOSE_FRIENDS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: CLOSE_FRIEND_IDS_QUERY_KEY });
  };
}

export function useAddCloseFriend() {
  const invalidate = useInvalidateCloseFriends();
  return useMutation({
    mutationFn: (id: string) => addCloseFriend(id),
    onSuccess: () => invalidate(),
  });
}

export function useRemoveCloseFriend() {
  const invalidate = useInvalidateCloseFriends();
  return useMutation({
    mutationFn: (id: string) => removeCloseFriend(id),
    onSuccess: () => invalidate(),
  });
}

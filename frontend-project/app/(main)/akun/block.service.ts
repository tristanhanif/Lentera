import { api, BaseResponse } from "@/app/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface BlockedUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  blockedAt: string;
}

type BlockedListResponse = BaseResponse<BlockedUser[]>;

const fetchBlocked = (): Promise<BlockedListResponse> =>
  api.get<BlockedListResponse>("/users/blocks").then((res) => res.data);

const blockUser = (id: string) =>
  api.post(`/users/blocks/${id}`).then((res) => res.data);

const unblockUser = (id: string) =>
  api.delete(`/users/blocks/${id}`).then((res) => res.data);

export const BLOCKS_QUERY_KEY = ["blocked-users"];

export function useBlockedUsers(enabled = true) {
  return useQuery({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: fetchBlocked,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

function useInvalidateBlocks() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: BLOCKS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["/users"] });
    queryClient.invalidateQueries({ queryKey: ["/auth/profile"] });
  };
}

export function useBlockUser() {
  const invalidate = useInvalidateBlocks();
  return useMutation({
    mutationFn: (id: string) => blockUser(id),
    onSuccess: () => invalidate(),
  });
}

export function useUnblockUser() {
  const invalidate = useInvalidateBlocks();
  return useMutation({
    mutationFn: (id: string) => unblockUser(id),
    onSuccess: () => invalidate(),
  });
}

import { api, BaseResponse } from "@/app/lib/axios";
import { useQuery } from "@tanstack/react-query";

export interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
}

type FollowListResponse = BaseResponse<FollowUser[]>;

const getFollowers = async (
  userId: string,
  q: string
): Promise<FollowListResponse> => {
  return api
    .get(`/users/${userId}/followers`, { params: q ? { q } : {} })
    .then((res) => res.data);
};

const getFollowing = async (
  userId: string,
  q: string
): Promise<FollowListResponse> => {
  return api
    .get(`/users/${userId}/following`, { params: q ? { q } : {} })
    .then((res) => res.data);
};

export const useGetFollowers = (
  userId: string,
  q: string,
  enabled = true
) => {
  return useQuery<FollowListResponse, Error, FollowListResponse>({
    queryKey: ["/users", userId, "followers", q],
    queryFn: () => getFollowers(userId, q),
    enabled: enabled && !!userId,
    staleTime: 1000 * 30,
  });
};

export const useGetFollowing = (
  userId: string,
  q: string,
  enabled = true
) => {
  return useQuery<FollowListResponse, Error, FollowListResponse>({
    queryKey: ["/users", userId, "following", q],
    queryFn: () => getFollowing(userId, q),
    enabled: enabled && !!userId,
    staleTime: 1000 * 30,
  });
};

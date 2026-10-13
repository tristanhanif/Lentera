import { api, BaseResponse } from "@/app/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/query-core";
import { useState } from "react";
import { MyPostResponse } from "../post/post.interface";

export interface Reposter {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  pendapat?: string | null;
}

export interface RepostStatus {
  reposted: boolean;
  totalReposts: number;
  reposters?: Reposter[];
}

type RepostResponse = BaseResponse<RepostStatus>;

const getRepostStatus = async (postId: string): Promise<RepostResponse> => {
  return api.get(`/repost/status/${postId}`).then((res) => res.data);
};

export const useGetRepostStatus = (postId: string) => {
  return useQuery<RepostResponse, Error, RepostResponse>({
    queryKey: ["/repost/status", postId],
    queryFn: () => getRepostStatus(postId),
    enabled: !!postId,
    staleTime: 1000 * 30,
  });
};

const toggleRepost = async (postId: string): Promise<RepostResponse> => {
  return api.post("/repost/toggle", { postId }).then((res) => res.data);
};

export const useToggleRepost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => toggleRepost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["/repost/status", postId] });
      const previous = queryClient.getQueryData<RepostResponse>([
        "/repost/status",
        postId,
      ]);

      if (previous) {
        const wasReposted = previous.data.reposted;
        queryClient.setQueryData<RepostResponse>(
          ["/repost/status", postId],
          {
            ...previous,
            data: {
              // Pertahankan daftar reposters agar badge avatar kiri bawah media tidak hilang saat optimistic update.
              reposters: previous.data.reposters,
              reposted: !wasReposted,
              totalReposts: wasReposted
                ? Math.max(0, previous.data.totalReposts - 1)
                : previous.data.totalReposts + 1,
            },
          },
        );
      }

      return { previous };
    },
    onError: (err, postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/repost/status", postId], context.previous);
      }
    },
    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ["/repost/status", postId] });
      queryClient.invalidateQueries({ queryKey: ["/repost/my-posts"] });
    },
  });
};

const updatePendapat = async (params: {
  postId: string;
  pendapat: string;
}): Promise<BaseResponse<{ postId: string; pendapat: string | null }>> => {
  return api.patch("/repost/pendapat", params).then((res) => res.data);
};

export const useUpdatePendapat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { postId: string; pendapat: string }) =>
      updatePendapat(params),
    onSuccess: (_res, params) => {
      queryClient.invalidateQueries({
        queryKey: ["/repost/status", params.postId],
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error("Gagal menyimpan pendapat:", error);
    },
  });
};

const getMyReposts = async (params: {
  page: number;
  limit: number;
}): Promise<MyPostResponse> => {
  return api.get("/repost/my-posts", { params }).then((n) => n.data);
};

export const useGetMyReposts = () => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
  });
  const { data, isFetching, isLoading } = useQuery<
    MyPostResponse,
    Error,
    MyPostResponse
  >({
    queryFn: () => getMyReposts(query),
    queryKey: ["/repost/my-posts", query],
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
  });

  return { data, isFetching, isLoading, query, setQuery };
};

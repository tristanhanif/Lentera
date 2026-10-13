import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/query-core";
import { useState } from "react";
import { api, BaseResponse } from "@/app/lib/axios";
import { MyPostResponse } from "../post/post.interface";

export interface SaveStatus {
  saved: boolean;
}

type SaveResponse = BaseResponse<SaveStatus>;

const getSaveStatus = async (postId: string): Promise<SaveResponse> => {
  return api.get(`/save/status/${postId}`).then((res) => res.data);
};

export const useGetSaveStatus = (postId: string) => {
  return useQuery<SaveResponse, Error, SaveResponse>({
    queryKey: ["/save/status", postId],
    queryFn: () => getSaveStatus(postId),
    enabled: !!postId,
    staleTime: 1000 * 30,
  });
};

const toggleSave = async (postId: string): Promise<SaveResponse> => {
  return api.post("/save/toggle", { postId }).then((res) => res.data);
};

export const useToggleSave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => toggleSave(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["/save/status", postId] });
      const previous = queryClient.getQueryData<SaveResponse>([
        "/save/status",
        postId,
      ]);

      if (previous) {
        const wasSaved = previous.data.saved;
        queryClient.setQueryData<SaveResponse>(
          ["/save/status", postId],
          {
            ...previous,
            data: { saved: !wasSaved },
          },
        );
      }

      return { previous };
    },
    onError: (err, postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/save/status", postId], context.previous);
      }
    },
    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ["/save/status", postId] });
      queryClient.invalidateQueries({ queryKey: ["/save/my-posts"] });
    },
  });
};

const getMySavedPosts = async (params: {
  page: number;
  limit: number;
}): Promise<MyPostResponse> => {
  return api.get("/save/my-posts", { params }).then((n) => n.data);
};

export const useGetMySavedPosts = () => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
  });
  const { data, isFetching, isLoading } = useQuery<
    MyPostResponse,
    Error,
    MyPostResponse
  >({
    queryFn: () => getMySavedPosts(query),
    queryKey: ["/save/my-posts", query],
    staleTime: 1000 * 30,
    placeholderData: keepPreviousData,
  });

  return { data, isFetching, isLoading, query, setQuery };
};

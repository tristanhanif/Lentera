import { api } from "@/app/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSocket } from "@/app/lib/socket";
import { LikeStatusResponse, ToggleLikeResponse } from "./like.interface";

const getLikeStatus = async (postId: string): Promise<LikeStatusResponse> => {
  return api.get(`/like/status/${postId}`).then((res) => res.data);
};

export const useGetLikeStatus = (postId: string) => {
  return useQuery<LikeStatusResponse, Error, LikeStatusResponse>({
    queryKey: ["/like/status", postId],
    queryFn: () => getLikeStatus(postId),
    enabled: !!postId,
    staleTime: 1000 * 30,
  });
};

const toggleLike = async (postId: string): Promise<ToggleLikeResponse> => {
  return api.post("/like/toggle", { postId }).then((res) => res.data);
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => toggleLike(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["/like/status", postId] });
      const previous = queryClient.getQueryData<LikeStatusResponse>([
        "/like/status",
        postId,
      ]);

      if (previous) {
        const wasLiked = previous.data.liked;
        queryClient.setQueryData<LikeStatusResponse>(
          ["/like/status", postId],
          {
            ...previous,
            data: {
              liked: !wasLiked,
              totalLikes: wasLiked
                ? previous.data.totalLikes - 1
                : previous.data.totalLikes + 1,
            },
          },
        );
      }

      return { previous };
    },
    onError: (err, postId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/like/status", postId], context.previous);
      }
    },
    onSettled: (_data, _error, postId) => {
      queryClient.invalidateQueries({ queryKey: ["/posts/random"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/save/my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/repost/my-posts"] });
    },
  });
};

export const useLikeSocketListener = () => {
  const queryClient = useQueryClient();
  const socket = getSocket();

  useEffect(() => {
    socket.on(
      "likeToggled",
      (data: { postId: string; totalLikes: number }) => {
        queryClient.setQueryData<LikeStatusResponse>(
          ["/like/status", data.postId],
          (old) => {
            if (old) {
              return {
                ...old,
                data: {
                  ...old.data,
                  totalLikes: data.totalLikes,
                },
              };
            }
            return old;
          },
        );
      },
    );

    return () => {
      socket.off("likeToggled");
    };
  }, [queryClient, socket]);
};

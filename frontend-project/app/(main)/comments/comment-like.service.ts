import { api } from "@/app/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { CommentResponse } from "./comment.interface";
import { ToggleCommentLikeResponse } from "./comment-like.interface";

const toggleCommentLike = async (payload: {
  commentId: string;
  postId: string;
}): Promise<ToggleCommentLikeResponse> => {
  return api
    .post("/comment-like/toggle", { commentId: payload.commentId })
    .then((res) => res.data);
};

export const useToggleCommentLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { commentId: string; postId: string }) =>
      toggleCommentLike(payload),

    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["/comments", postId] });
      const previous = queryClient.getQueryData<{
        message: string;
        data: CommentResponse[];
      }>(["/comments", postId]);

      queryClient.setQueryData<{ message: string; data: CommentResponse[] }>(
        ["/comments", postId],
        (old) =>
          old
            ? {
                ...old,
                data: old.data.map((c) =>
                  c.id === commentId
                    ? {
                        ...c,
                        isLiked: !c.isLiked,
                        likesCount: Math.max(
                          0,
                          (c.likesCount || 0) + (c.isLiked ? -1 : 1),
                        ),
                      }
                    : c,
                ),
              }
            : old,
      );

      return { previous };
    },

    onSuccess: (response, { commentId, postId }) => {
      if (response?.data) {
        queryClient.setQueryData<{ message: string; data: CommentResponse[] }>(
          ["/comments", postId],
          (old) =>
            old
              ? {
                  ...old,
                  data: old.data.map((c) =>
                    c.id === commentId
                      ? {
                          ...c,
                          isLiked: response.data.liked,
                          likesCount: response.data.totalLikes,
                        }
                      : c,
                  ),
                }
              : old,
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/comments", _payload.postId], context.previous);
      }
      Swal.fire({
        title: "Gagal",
        text:
          error.response?.data?.message ||
          "Terjadi kesalahan saat menyukai komentar",
        icon: "error",
      });
    },
  });
};

import { api, BaseResponse } from "@/app/lib/axios";
import { CommentPayload, CommentResponse, PostCommentResponse } from "./comment.interface";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";

const createComment = async (payload: CommentPayload): Promise<PostCommentResponse> => {
  return api.post("/comment/bikin", payload).then((res) => res.data);
};

const getCommentsByPost = async (postId: string): Promise<BaseResponse<CommentResponse[]>> => {
  return api.get(`/comment/post/${postId}`).then((res) => res.data);
};

export const useComments = (postId: string, enabled: boolean = false) => {
  return useQuery<BaseResponse<CommentResponse[]>, Error, BaseResponse<CommentResponse[]>>({
    queryKey: ["/comments", postId],
    queryFn: () => getCommentsByPost(postId),
    enabled: !!postId && enabled,
    staleTime: 1000 * 30,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CommentPayload) => createComment(payload),
    onSuccess: (response, payload) => {
      queryClient.invalidateQueries({ queryKey: ["/comments", payload.postId] });
      queryClient.invalidateQueries({ queryKey: ["/posts/random"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/my-posts"] });

      Swal.fire({
        title: "Berhasil",
        icon: "success",
        text: "Komentar Anda telah diterbitkan",
        timer: 1500,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Membuat Komentar",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });
  return mutation;
};

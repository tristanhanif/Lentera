import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepPreviousData } from "@tanstack/query-core";
import { api } from "@/app/lib/axios";
import Swal from "sweetalert2";
import { MyPostResponse, PostPayload, PostResponse } from "./post.interface";
import { useState } from "react";

// 1. Fungsi API Service
const createPost = async (payload: PostPayload): Promise<PostResponse> => {
  return api.post("/posts", payload).then((res) => res.data);
};

// 2. Custom Hook Mutation
export const useCreatePost = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: PostPayload) => createPost(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/my"] });

      Swal.fire({
        title: "Berhasil",
        text: "Postingan Anda telah diterbitkan",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Membuat Postingan",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });

  return mutation;
};

const deletePost = async (id: string) => {
  return api.delete(`/posts/${id}`).then((res) => res.data);
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/random"] });
      queryClient.invalidateQueries({ queryKey: ["/posts/user"] });
      queryClient.invalidateQueries({ queryKey: ["/repost/my-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/save/my-posts"] });
      Swal.fire({
        title: "Berhasil",
        text: res?.message || "Postingan berhasil dihapus",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Menghapus Postingan",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });
};

type FeedParams = {
  page: number;
  limit: number;
  search?: string;
  // "newest" = terbaru dulu (halaman utama), selain itu acak (explore).
  sort?: string;
};

const getFeed = async (params: FeedParams): Promise<MyPostResponse> => {
  return api.get("/posts/random", { params }).then((n) => n.data);
};

export const useGetFeed = (initialSearch = "", initialSort = "") => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: initialSearch,
    sort: initialSort,
  });

  const { data, isFetching, isLoading } = useQuery<MyPostResponse, Error, MyPostResponse>({
    queryFn: () => getFeed(query),
    queryKey: ["/posts/random", query],
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  return { data, isFetching, isLoading, query, setQuery };
};

const getMyPosts = async (params: {
  page: number;
  limit: number;
}): Promise<MyPostResponse> => {
  console.log("params", params);

  return api.get("/posts/my-posts", { params }).then((n) => n.data);
};

export const useGetMyPost = () => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
  });
  const { data, isFetching, isLoading } = useQuery<MyPostResponse, Error, MyPostResponse>(
    {
      queryFn: () => getMyPosts(query),
      queryKey: ["/posts/my-posts", query],
      staleTime: 1000 * 60 * 60,
      placeholderData: keepPreviousData,
    },
  );

  return { data, isFetching, isLoading, query, setQuery };
};

const getUserPosts = async (  userId: string,
  params: {
    page: number;
    limit: number;
  },
): Promise<MyPostResponse> => {
  return api.get(`/posts/user/${userId}`, { params }).then((n) => n.data);
};

export const useGetUserPosts = (userId: string) => {
  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
  });
  const { data, isFetching, isLoading } = useQuery<
    MyPostResponse,
    Error,
    MyPostResponse
  >({
    queryFn: () => getUserPosts(userId, query),
    queryKey: ["/posts/user", userId, query],
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: !!userId,
  });

  return { data, isFetching, isLoading, query, setQuery };
};

// Detail 1 postingan (dibuka dari kotak postingan di chat).
const getPostById = async (postId: string): Promise<PostResponse> => {
  return api.get(`/posts/${postId}`).then((n) => n.data);
};

export const useGetPostById = (postId: string | null) => {
  const { data, isFetching, isLoading, isError } = useQuery<
    PostResponse,
    Error,
    PostResponse
  >({
    queryFn: () => getPostById(postId!),
    queryKey: ["/posts/detail", postId],
    staleTime: 1000 * 60,
    enabled: !!postId,
    retry: false,
  });

  return { data, isFetching, isLoading, isError };
};


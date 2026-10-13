import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";
import Swal from "sweetalert2";
import {
  CreateStoryPayload,
  StoryItem,
  StoryMediaType,
  StoryViewerEntry,
} from "./story.interface";

export interface UploadedStoryFile {
  url: string;
  publicId: string;
  type: StoryMediaType;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  file_url?: string;
  public_id?: string;
  file_name?: string;
}

// Upload satu file story ke Cloudinary.
// Mengembalikan url + publicId (wajib untuk create story) + type dari mimetype.
export const uploadStoryFile = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedStoryFile> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<CloudinaryUploadResponse>(
    "/upload/cloudinary",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      ...(onProgress
        ? {
            onUploadProgress: (e: { loaded: number; total?: number }) => {
              if (e.total) {
                onProgress(Math.round((e.loaded / e.total) * 100));
              }
            },
          }
        : {}),
    },
  );

  const url = res.data?.secure_url || res.data?.file_url;
  const publicId = res.data?.public_id || res.data?.file_name;
  if (!url || !publicId) {
    throw new Error("Gagal mendapatkan URL dari Cloudinary");
  }

  return {
    url,
    publicId,
    type: file.type.startsWith("video") ? "video" : "image",
  };
};

const FEED_KEY = ["/stories/feed"] as const;

const getStoriesFeed = async (): Promise<BaseResponse<StoryItem[]>> => {
  return api.get("/stories/feed").then((res) => res.data);
};

export const useStories = () => {
  return useQuery<BaseResponse<StoryItem[]>>({
    queryKey: [...FEED_KEY],
    queryFn: getStoriesFeed,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

const getStoryDetail = async (id: string): Promise<BaseResponse<StoryItem>> => {
  return api.get(`/stories/${id}`).then((res) => res.data);
};

export const useStoryDetail = (id: string, enabled = true) => {
  return useQuery<BaseResponse<StoryItem>>({
    queryKey: ["/stories", id],
    queryFn: () => getStoryDetail(id),
    staleTime: 30 * 1000,
    enabled: !!id && enabled,
  });
};

const createStory = async (
  payload: CreateStoryPayload,
): Promise<BaseResponse<StoryItem>> => {
  return api.post("/stories", payload).then((res) => res.data);
};

export const useCreateStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStoryPayload) => createStory(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [...FEED_KEY] });
      Swal.fire({
        title: "Berhasil",
        text: res?.message || "Story Anda telah diterbitkan",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Membuat Story",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });
};

const viewStory = async (id: string): Promise<BaseResponse<StoryItem>> => {
  return api.post(`/stories/${id}/view`).then((res) => res.data);
};

export const useViewStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => viewStory(id),
    onSuccess: () => {
      // Hanya invalidate feed; jangan invalidate detail/view agar tidak loop.
      queryClient.invalidateQueries({ queryKey: [...FEED_KEY] });
    },
  });
};

interface ToggleStoryLikeResponse {
  storyId: string;
  liked: boolean;
  totalLikes: number;
}

const toggleStoryLike = async (
  id: string,
): Promise<BaseResponse<ToggleStoryLikeResponse>> => {
  return api.post(`/stories/${id}/like`).then((res) => res.data);
};

export const useToggleStoryLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleStoryLike(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...FEED_KEY] });
    },
  });
};

const getStoryViewers = async (
  id: string,
): Promise<BaseResponse<StoryViewerEntry[]>> => {
  return api.get(`/stories/${id}/viewers`).then((res) => res.data);
};

export const useStoryViewers = (storyId: string, enabled = true) => {
  return useQuery<BaseResponse<StoryViewerEntry[]>>({
    queryKey: ["/stories", storyId, "viewers"],
    queryFn: () => getStoryViewers(storyId),
    enabled: !!storyId && enabled,
    staleTime: 30 * 1000,
  });
};

interface CommentStoryResponse {
  storyId: string;
  conversationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatMessage: any;
}

const deleteStory = async (
  id: string,
): Promise<BaseResponse<{ storyId: string; deleted: boolean }>> => {
  return api.delete(`/stories/${id}`).then((res) => res.data);
};

export const useDeleteStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [...FEED_KEY] });
      Swal.fire({
        title: "Berhasil",
        text: res?.message || "Story berhasil dihapus",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Menghapus Story",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });
};

const commentStory = async ({
  id,
  content,
}: {
  id: string;
  content: string;
}): Promise<BaseResponse<CommentStoryResponse>> => {
  return api.post(`/stories/${id}/comment`, { content }).then((res) => res.data);
};

export const useCommentStory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; content: string }) =>
      commentStory(params),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [...FEED_KEY] });
      queryClient.invalidateQueries({ queryKey: ["/chat/conversations"] });
      Swal.fire({
        title: "Berhasil",
        text: res?.message || "Komentar terkirim ke chat",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      Swal.fire({
        title: "Gagal Mengirim Komentar",
        text: error.response?.data?.message || "Terjadi kesalahan pada server",
        icon: "error",
      });
    },
  });
};

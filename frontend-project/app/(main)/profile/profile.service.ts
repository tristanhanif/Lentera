import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";
import { uploadToCloudinary } from "@/app/lib/upload";
import Swal from "sweetalert2";
import { Profile, ProfileResponse, UpdateProfilePayload, ChangePasswordPayload } from "./profile.interface";

export { uploadToCloudinary };

export interface PublicProfile {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  cover: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
  isBlockedByMe?: boolean;
  blockedMe?: boolean;
  createdAt: string;
}

const getPublicProfile = async (
  id: string,
): Promise<BaseResponse<PublicProfile>> => {
  return api.get(`/users/${id}`).then((res) => res.data);
};

export const usePublicProfile = (id: string) => {
  return useQuery<BaseResponse<PublicProfile>>({
    queryKey: ["/users", id],
    queryFn: () => getPublicProfile(id),
    staleTime: 1000 * 30,
    enabled: !!id,
  });
};

const followUser = async (userId: string): Promise<{ data: { following: boolean } }> => {
  return api.post(`/users/follow/${userId}`).then((res) => res.data);
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followUser(userId),
    onSuccess: () => {
      // Prefix ["/users"] agar mencakup profil publik (key ["/users", username]),
      // profil by-id, dan daftar followers/following yang ikut berubah.
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      queryClient.invalidateQueries({ queryKey: ["/users/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/profile"] });
    },
  });
};

export const getProfile = async (): Promise<Profile> => {
  const res = await api.get<ProfileResponse>("/auth/profile");
  return res.data.data;
};

export const useProfile = () => {
  return useQuery<Profile>({
    queryKey: ["/auth/profile"],
    queryFn: getProfile,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
  });
};

export const updateProfile = async (
  payload: UpdateProfilePayload,
): Promise<BaseResponse<Profile>> => {
  const response = await api.patch("/auth/profile", payload);
  return response.data;
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (response) => {
      queryClient.setQueryData<Profile>(["/auth/profile"], response.data);
      queryClient.invalidateQueries({ queryKey: ["/auth/profile"] });
      Swal.fire({
        title: "Berhasil",
        text: "Profil Anda telah diperbarui",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    },
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     onError: (error: any) => {
      Swal.fire({
        title: "Gagal",
        text: error.response?.data?.message || "Gagal memperbarui profil",
        icon: "error",
      });
    },
  });
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<BaseResponse> => {
  const response = await api.patch("/auth/change-password", payload);
  return response.data;
};

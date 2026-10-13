import { BaseResponse } from "@/app/lib/axios";

export interface Profile extends BaseResponse {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string | null;
  cover: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  isEmailVerified: boolean;
  showSuggestion: boolean;
  loginMethod: "google" | "form";
  followersCount: number;
  followingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  message: string;
  data: Profile;
}

export interface UpdateProfilePayload {
  name?: string;
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar?: string;
  cover?: string;
  showSuggestion?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

import { BaseResponse } from "@/app/lib/axios";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse extends BaseResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  loginMethod: "form" | "google";
  access_token: string;
  refresh_token: string;
}

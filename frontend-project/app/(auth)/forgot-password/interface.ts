import { BaseResponse } from "@/app/lib/axios";

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse extends BaseResponse {
  message: string;
}

/* =========================
   Reset Password
   ========================= */
export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ResetPasswordResponse extends BaseResponse {
  message: string;
}

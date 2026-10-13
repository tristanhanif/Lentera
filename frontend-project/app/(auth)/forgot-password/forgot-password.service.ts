import { api } from "@/app/lib/axios";
import { useMutation } from "@tanstack/react-query";
import Swal from "sweetalert2";

import {
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "./interface";

/* =========================
   Kirim Link Reset Password
   ========================= */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (
      payload: ForgotPasswordPayload,
    ): Promise<ForgotPasswordResponse> => {
      const response = await api.post<ForgotPasswordResponse>(
        "/auth/forgot-password",
        payload,
      );
      return response.data;
    },

    onSuccess: (data) => {
      Swal.fire({
        icon: "success",
        title: "Email Terkirim",
        text: data.message,
        confirmButtonColor: "#2563eb",
      });
    },

    onError: (error: any) => {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error.response?.data?.message ||
          "Gagal mengirim email reset password.",
        confirmButtonColor: "#2563eb",
      });
    },
  });
};

/* =========================
   Reset Password Baru
   ========================= */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (
      payload: ResetPasswordPayload,
    ): Promise<ResetPasswordResponse> => {
      const response = await api.post<ResetPasswordResponse>(
        "/auth/reset-password",
        payload,
      );
      return response.data;
    },

    onSuccess: (data) => {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: data.message,
        confirmButtonColor: "#2563eb",
      });
    },

    onError: (error: any) => {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error.response?.data?.message ||
          "Token tidak valid atau sudah kedaluwarsa.",
        confirmButtonColor: "#2563eb",
      });
    },
  });
};

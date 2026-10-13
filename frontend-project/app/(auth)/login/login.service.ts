import { api } from "@/app/lib/axios";
import { LoginPayload, LoginResponse } from "./login.interface";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

const login = (payload: LoginPayload): Promise<LoginResponse> => {
  return api
    .post<LoginResponse>("/auth/login", payload)
    .then((res) => res.data);
};

export const useLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),

    onSuccess: async (res: LoginResponse) => {
      // ✅ Simpan token
      Cookies.set("access_token", res.access_token);
      Cookies.set("refresh_token", res.refresh_token);
      Cookies.set("uuid", res.user.id);
      Cookies.set("loginMethod", res.loginMethod);

      Swal.fire({
        title: "Login Successful",
        text: res.message,
        icon: "success",
      });

      // Tanpa verifikasi email: langsung ke Beranda
      router.replace("/");
    },

    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Terjadi kesalahan saat login";

      Swal.fire({
        icon: "error",
        title: "Oops... Ada yang salah!",
        text: message,
      });
    },
  });
};

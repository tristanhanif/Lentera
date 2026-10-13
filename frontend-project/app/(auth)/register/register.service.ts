import { api } from "@/app/lib/axios";
import { RegisterPayload, RegisterResponse } from "./register.interface";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import Swal from "sweetalert2";

const register = (payload: RegisterPayload): Promise<RegisterResponse> => {
  return api
    .post<RegisterResponse>("/auth/register", payload)
    .then((res) => res.data);
};

export const useRegister = () => {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),

    onSuccess: (res: RegisterResponse) => {
      // Auto-login: backend langsung kasih token (tanpa verifikasi email)
      Cookies.set("access_token", res.access_token);
      Cookies.set("refresh_token", res.refresh_token);
      Cookies.set("uuid", res.user.id);
      Cookies.set("loginMethod", "form");

      Swal.fire({
        icon: "success",
        title: "Akun berhasil dibuat!",
        text: "Yuk pasang foto profil dulu 📸",
        timer: 2000,
        showConfirmButton: false,
        didClose: () => {
          router.push("/onboarding/avatar?from=register");
        },
      });
    },

    onError: (error: any) => {
      console.log("error", error.response?.data?.message);

      Swal.fire({
        icon: "error",
        title: "Registrasi Gagal",
        text: error.response?.data?.message ?? "Terjadi kesalahan",
        footer: '<a href="/register">Periksa kembali data</a>',
      });
    },
  });

  return mutation;
};

import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_BACKEND || "http://localhost:8700";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // ambil refresh token dari cookies
        const refreshToken = Cookies.get("refresh_token");

        if (!refreshToken) {
          throw new Error("Tidak ada refresh token");
        }

        // hit API refresh token
        const res = await axios.post(`${API_URL}/auth/refresh/`, {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        const { access_token, refresh_token } = res.data ?? {};

        if (!access_token || !refresh_token) {
          throw new Error("Response refresh token tidak valid");
        }

        // simpan token baru ke cookies (uuid tidak ikut diubah:
        // response refresh hanya berisi access_token & refresh_token)
        Cookies.set("refresh_token", refresh_token);
        Cookies.set("access_token", access_token);

        // pasang token baru lalu ulangi request yang gagal tadi
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("uuid");

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export interface BaseResponse<T = any> {
  message: string;
  data: T;
}

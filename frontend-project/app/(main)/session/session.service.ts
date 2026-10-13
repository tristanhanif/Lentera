import { api, BaseResponse } from "@/app/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LoginSession {
  id: string;
  city: string | null;
  region: string | null;
  country: string | null;
  device: string | null;
  ip: string | null;
  lat: number | null;
  lng: number | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

type SessionsResponse = BaseResponse<LoginSession[]>;
type RevokeResponse = BaseResponse<{ id: string; revokedCurrent: boolean }>;

const fetchSessions = (): Promise<SessionsResponse> =>
  api.get<SessionsResponse>("/auth/sessions").then((res) => res.data);

const revokeSession = (id: string): Promise<RevokeResponse> =>
  api.delete<RevokeResponse>(`/auth/sessions/${id}`).then((res) => res.data);

export const SESSION_QUERY_KEY = ["login-sessions"];

export function useLoginSessions(enabled = true) {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSessions,
    enabled,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });
}

// Format waktu real ke bahasa Indonesia: "2 jam yang lalu", "3 hari yang lalu", "12 Agustus 2025".
export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "baru saja";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari yang lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

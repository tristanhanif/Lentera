import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";
import { getNotifSocket } from "@/app/lib/socket";
import { useEffect } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { NotificationData } from "./notif.interface";

const getNotifications = async (): Promise<BaseResponse<NotificationData[]>> => {
  return api.get("/notifications").then((res) => res.data);
};

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const { data, isFetching, isLoading, refetch } = useQuery<BaseResponse<NotificationData[]>>({
    queryKey: ["/notifications"],
    queryFn: getNotifications,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read").then((res) => res.data),
    onSuccess: () => {
      queryClient.setQueryData<BaseResponse<NotificationData[]>>(["/notifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => ({ ...n, isRead: true })),
        };
      });
      Swal.fire({
        title: "Berhasil",
        text: "Semua notifikasi ditandai sudah dibaca",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    },
  });

  useEffect(() => {
    const socket = getNotifSocket();
    socket.emit("subscribe", Cookies.get("uuid") || "");

    socket.on("notification", (notif: NotificationData) => {
      queryClient.setQueryData<BaseResponse<NotificationData[]>>(["/notifications"], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: [notif, ...old.data],
        };
      });
    });

    return () => {
      socket.off("notification");
    };
  }, [queryClient]);

  return {
    notifications: data?.data ?? [],
    unreadCount: data?.data?.filter((n) => !n.isRead).length ?? 0,
    isFetching,
    isLoading,
    refetch,
    markAllRead: markAllReadMutation.mutate,
  };
};

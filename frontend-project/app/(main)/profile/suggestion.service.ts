import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/app/lib/axios";
import { UserSuggestion } from "./suggestion.interface";

const getSuggestions = async (): Promise<{ data: UserSuggestion[] }> => {
  return api.get("/users/suggestions").then((res) => res.data);
};

const followUser = async (userId: string): Promise<{ data: { following: boolean } }> => {
  return api.post(`/users/follow/${userId}`).then((res) => res.data);
};

export const useSuggestions = () => {
  return useQuery<{ data: UserSuggestion[] }>({
    queryKey: ["/users/suggestions"],
    queryFn: getSuggestions,
    staleTime: 1000 * 60,
  });
};

const searchUsers = async (q: string): Promise<{ data: UserSuggestion[] }> => {
  return api.get("/users/search", { params: { q } }).then((res) => res.data);
};

export const useSearchUsers = (query: string) => {
  const q = query.trim().replace(/^@/, "");

  return useQuery<{ data: UserSuggestion[] }>({
    queryKey: ["/users/search", q],
    queryFn: () => searchUsers(q),
    enabled: q.length > 0,
    staleTime: 1000 * 60,
  });
};

export const useToggleFollow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/users"] });
      queryClient.invalidateQueries({ queryKey: ["/users/suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/auth/profile"] });
    },
  });
};

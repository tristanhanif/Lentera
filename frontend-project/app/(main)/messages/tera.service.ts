import { useMutation } from "@tanstack/react-query";
import { api, BaseResponse } from "@/app/lib/axios";

export const TERA_CONVERSATION_ID = "tera-ai";

export interface TeraMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

interface TeraChatResponse {
  reply: string;
  model: string;
}

const postTeraChat = async (payload: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<BaseResponse<TeraChatResponse>> => {
  return api.post("/ai/tera/chat", payload).then((res) => res.data);
};

export function useSendTeraChat() {
  return useMutation({
    mutationFn: postTeraChat,
  });
}

const storageKey = (userId: string) => `lentera-tera-chat-${userId || "anon"}`;

export function loadTeraMessages(userId: string): TeraMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) =>
        m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string",
    );
  } catch {
    return [];
  }
}

export function saveTeraMessages(userId: string, messages: TeraMessage[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(messages.slice(-50)));
  } catch {
    // abaikan kalau storage penuh / diblokir
  }
}

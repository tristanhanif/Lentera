import { useMutation, useQuery, useQueryClient, QueryClient } from '@tanstack/react-query';
import { api, BaseResponse } from '@/app/lib/axios';
import { getChatSocket } from '@/app/lib/socket';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import {
  ChatConversation,
  ChatMessage,
  ConversationMessagesResponse,
  MessagesReadPayload,
} from './chat.interface';

// ==================== API CALLS ====================

const getConversations = async (): Promise<BaseResponse<ChatConversation[]>> => {
  return api.get('/chat/conversations').then((res) => res.data);
};

const getMessages = async (
  conversationId: string,
): Promise<BaseResponse<ConversationMessagesResponse>> => {
  return api.get(`/chat/conversations/${conversationId}/messages`).then((res) => res.data);
};

const sendChatMessage = async ({
  conversationId,
  text,
  replyToId,
  storyId,
  storyMediaUrl,
  storyMediaType,
  storyOwnerUsername,
  postId,
  postMediaUrl,
  postMediaType,
  postOwnerUsername,
  postOwnerAvatar,
  postContent,
  postMediaCount,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  audioUrl,
  voiceDuration,
}: {
  conversationId: string;
  text: string;
  replyToId?: string | null;
  storyId?: string | null;
  storyMediaUrl?: string | null;
  storyMediaType?: string | null;
  storyOwnerUsername?: string | null;
  postId?: string | null;
  postMediaUrl?: string | null;
  postMediaType?: string | null;
  postOwnerUsername?: string | null;
  postOwnerAvatar?: string | null;
  postContent?: string | null;
  postMediaCount?: number | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  audioUrl?: string | null;
  voiceDuration?: number | null;
}): Promise<BaseResponse<ChatMessage>> => {
  return api
    .post(`/chat/conversations/${conversationId}/messages`, {
      text,
      ...(replyToId ? { replyToId } : {}),
      ...(storyId ? { storyId } : {}),
      ...(storyMediaUrl ? { storyMediaUrl } : {}),
      ...(storyMediaType ? { storyMediaType } : {}),
      ...(storyOwnerUsername ? { storyOwnerUsername } : {}),
      ...(postId ? { postId } : {}),
      ...(postMediaUrl ? { postMediaUrl } : {}),
      ...(postMediaType ? { postMediaType } : {}),
      ...(postOwnerUsername ? { postOwnerUsername } : {}),
      ...(postOwnerAvatar ? { postOwnerAvatar } : {}),
      ...(postContent ? { postContent } : {}),
      ...(typeof postMediaCount === "number" ? { postMediaCount } : {}),
      ...(fileUrl ? { fileUrl } : {}),
      ...(fileName ? { fileName } : {}),
      ...(typeof fileSize === "number" ? { fileSize } : {}),
      ...(fileType ? { fileType } : {}),
      ...(audioUrl ? { audioUrl } : {}),
      ...(typeof voiceDuration === "number" ? { voiceDuration } : {}),
    })
    .then((res) => res.data);
};

const createConversation = async (
  userId: string,
): Promise<BaseResponse<{ id: string }>> => {
  return api
    .post('/chat/conversations', { userId })
    .then((res) => res.data);
};

const unsendChatMessage = async (
  messageId: string,
): Promise<BaseResponse<ChatMessage>> => {
  return api.delete(`/chat/messages/${messageId}`).then((res) => res.data);
};

const starChatMessage = async (
  messageId: string,
): Promise<BaseResponse<ChatMessage>> => {
  return api.patch(`/chat/messages/${messageId}/star`).then((res) => res.data);
};

const pinChatMessage = async ({
  messageId,
  durationInMinutes,
}: {
  messageId: string;
  durationInMinutes: number;
}): Promise<BaseResponse<ChatMessage>> => {
  return api
    .patch(`/chat/messages/${messageId}/pin`, { durationInMinutes })
    .then((res) => res.data);
};

const unpinChatMessage = async (
  messageId: string,
): Promise<BaseResponse<ChatMessage>> => {
  return api.patch(`/chat/messages/${messageId}/unpin`).then((res) => res.data);
};

const clearConversationMessages = async (
  conversationId: string,
): Promise<BaseResponse<{ conversationId: string; clearedAt: string }>> => {
  return api
    .delete(`/chat/conversations/${conversationId}/messages`)
    .then((res) => res.data);
};

// ==================== HOOKS ====================

export const useConversations = () => {
  return useQuery<BaseResponse<ChatConversation[]>>({
    queryKey: ['/chat/conversations'],
    queryFn: getConversations,
    staleTime: 1000 * 30,
  });
};

export const useMessages = (conversationId: string | null) => {
  return useQuery<BaseResponse<ConversationMessagesResponse>>({
    queryKey: ['/chat/conversations', conversationId, 'messages'],
    queryFn: () => getMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 0,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

export const useUnsendMessage = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unsendChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/chat/conversations', conversationId, 'messages'],
      });
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

export const useStarMessage = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: starChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/chat/conversations', conversationId, 'messages'],
      });
    },
  });
};

export const usePinMessage = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: pinChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/chat/conversations', conversationId, 'messages'],
      });
    },
  });
};

export const useUnpinMessage = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unpinChatMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/chat/conversations', conversationId, 'messages'],
      });
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

export const useClearChat = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearConversationMessages,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/chat/conversations', conversationId, 'messages'],
      });
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

// ==================== READ BADGE ====================

// Nol-kan badge merah (unreadCount) sebuah percakapan di cache.
// Dipakai saat user membuka obrolan supaya notifikasi langsung hilang,
// sinkronisasi dengan server dilakukan lewat refetch query.
export const clearConversationUnread = (
  queryClient: QueryClient,
  conversationId: string,
) => {
  queryClient.setQueryData<BaseResponse<ChatConversation[]>>(
    ['/chat/conversations'],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      };
    },
  );
};

// ==================== UNREAD BADGE (NAVBAR) ====================

export const useUnreadConversationsCount = () => {
  const queryClient = useQueryClient();

  const { data } = useQuery<BaseResponse<ChatConversation[]>>({
    queryKey: ['/chat/conversations'],
    queryFn: getConversations,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  useEffect(() => {
    const socket = getChatSocket();

    socket.on('conversationUpdated', () => {
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    });

    // Pesan kita dibaca lawan bicara (walau tidak sedang buka obrolannya):
    // refresh daftar supaya centang di preview ikut membiru.
    socket.on('messagesRead', (payload: MessagesReadPayload) => {
      const currentUserId = Cookies.get('uuid') || '';
      if (payload.readerId === currentUserId) return;
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    });

    return () => {
      socket.off('conversationUpdated');
      socket.off('messagesRead');
    };
  }, [queryClient]);

  return (data?.data ?? []).filter((conv) => conv.unreadCount > 0).length;
};

// ==================== PRESENCE (ONLINE/OFFLINE) ====================

export const usePresence = () => {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = getChatSocket();

    socket.on('onlineUsers', (ids: string[]) => {
      setOnlineUserIds(new Set(ids));
    });

    socket.on(
      'presenceUpdate',
      ({ userId, online }: { userId: string; online: boolean }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (online) {
            next.add(userId);
          } else {
            next.delete(userId);
          }
          return next;
        });
      },
    );

    return () => {
      socket.off('onlineUsers');
      socket.off('presenceUpdate');
    };
  }, []);

  useEffect(() => {
    const socket = getChatSocket();

    socket.emit('requestOnlineUsers');

    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('requestOnlineUsers');
      }
    }, 1000 * 30);

    return () => clearInterval(interval);
  }, []);

  return onlineUserIds;
};

// ==================== SOCKET LISTENER ====================

export const useChatSocketListener = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const socket = getChatSocket();
    socket.emit('joinConversation', conversationId);

    socket.on('newMessage', (message: ChatMessage) => {
      queryClient.setQueryData<BaseResponse<ConversationMessagesResponse>>(
        ['/chat/conversations', conversationId, 'messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              messages: [...old.data.messages, message],
            },
          };
        },
      );

      // Jika pesan masuk dari lawan bicara saat obrolan sedang dibuka,
      // anggap langsung dibaca: hilangkan badge, lalu refetch messages
      // (GET messages menandai isRead=true di server) dan sinkronkan
      // daftar percakapan setelahnya.
      const currentUserId = Cookies.get('uuid') || '';
      if (message.senderId !== currentUserId) {
        clearConversationUnread(queryClient, conversationId);
        queryClient
          .refetchQueries({
            queryKey: ['/chat/conversations', conversationId, 'messages'],
          })
          .finally(() => {
            queryClient.invalidateQueries({
              queryKey: ['/chat/conversations'],
            });
          });
      }
    });

    socket.on('conversationUpdated', () => {
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    });

    socket.on('messageUpdated', (updated: ChatMessage) => {
      queryClient.setQueryData<BaseResponse<ConversationMessagesResponse>>(
        ['/chat/conversations', conversationId, 'messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.map((m) =>
                m.id === updated.id ? updated : m,
              ),
            },
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    });

    // Lawan bicara membaca pesan kita saat obrolan ini terbuka:
    // birukan centang + tampilkan "Dilihat" tanpa perlu reload.
    socket.on('messagesRead', (payload: MessagesReadPayload) => {
      const currentUserId = Cookies.get('uuid') || '';
      if (
        payload.conversationId !== conversationId ||
        payload.readerId === currentUserId
      ) {
        return;
      }
      queryClient.setQueryData<BaseResponse<ConversationMessagesResponse>>(
        ['/chat/conversations', conversationId, 'messages'],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              messages: old.data.messages.map((m) =>
                m.senderId === currentUserId && !m.isRead
                  ? { ...m, isRead: true, readAt: payload.readAt }
                  : m,
              ),
            },
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    });

    return () => {
      socket.emit('leaveConversation', conversationId);
      socket.off('newMessage');
      socket.off('conversationUpdated');
      socket.off('messageUpdated');
      socket.off('messagesRead');
    };
  }, [conversationId, queryClient]);
};

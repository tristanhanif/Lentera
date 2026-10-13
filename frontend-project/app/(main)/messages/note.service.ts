import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, BaseResponse } from '@/app/lib/axios';
import { ChatNote } from './note.interface';

const getVisibleNotes = async (): Promise<BaseResponse<ChatNote[]>> => {
  return api.get('/notes').then((res) => res.data);
};

export const useVisibleNotes = () => {
  return useQuery<BaseResponse<ChatNote[]>>({
    queryKey: ['/notes'],
    queryFn: getVisibleNotes,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    retry: false,
  });
};

export interface CreateNotePayload {
  text: string;
  type?: 'text' | 'music';
  musicTitle?: string;
  musicArtist?: string;
  musicCover?: string;
  musicUrl?: string;
  audience?: 'mutual' | 'close';
}

const createNote = async (
  payload: CreateNotePayload,
): Promise<BaseResponse<ChatNote>> => {
  return api.post('/notes', payload).then((res) => res.data);
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/notes'] });
    },
  });
};

const deleteMyNote = async (): Promise<BaseResponse<{ deleted: boolean }>> => {
  return api.delete('/notes/me').then((res) => res.data);
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/notes'] });
    },
  });
};

interface ReplyNoteResponse {
  noteId: string;
  conversationId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chatMessage: any;
}

const replyToNote = async ({
  noteId,
  text,
}: {
  noteId: string;
  text: string;
}): Promise<BaseResponse<ReplyNoteResponse>> => {
  return api.post(`/notes/${noteId}/reply`, { text }).then((res) => res.data);
};

export const useReplyNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replyToNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/chat/conversations'] });
    },
  });
};

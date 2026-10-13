export interface ChatUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  conversationId: string;
  isRead: boolean;
  readAt: string | null;
  isDeleted: boolean;
  isStarred: boolean;
  isEvent: boolean;
  pinnedUntil: string | null;
  replyToId: string | null;
  replyTo: ChatMessage | null;
  storyId: string | null;
  storyMediaUrl: string | null;
  storyMediaType: string | null;
  storyOwnerUsername: string | null;
  noteId: string | null;
  noteText: string | null;
  noteType: string | null;
  noteMusicTitle: string | null;
  noteMusicArtist: string | null;
  noteOwnerUsername: string | null;
  noteOwnerAvatar: string | null;
  noteExpiresAt: string | null;
  // Bagikan postingan: snapshot postingan saat dikirim.
  postId: string | null;
  postMediaUrl: string | null;
  postMediaType: string | null;
  postOwnerUsername: string | null;
  postOwnerAvatar: string | null;
  postContent: string | null;
  postMediaCount: number | null;
  // Lampiran chat: 1 file per pesan (gambar / dokumen).
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  createdAt: string;
  sender: ChatUser;
}

export interface ChatConversation {
  id: string;
  otherUser: ChatUser;
  lastMessage: {
    text: string;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationMessagesResponse {
  conversation: {
    id: string;
    user1: string;
    user2: string;
  };
  messages: ChatMessage[];
}

export interface MessagesReadPayload {
  conversationId: string;
  readerId: string;
  readAt: string;
}

// Teks default pesan bagikan postingan (tanpa ketikan tambahan).
// Kalau teksnya ini, di percakapan hanya kotak postingan yang tampil.
export const POST_SHARE_DEFAULT_TEXT = "Mengirimkan sebuah postingan.";

// Teks default pesan lampiran file / gambar (tanpa ketikan tambahan).
// Bubble teks disembunyikan, hanya kotak lampiran yang tampil.
// Kalau ada ketikan tambahan, dikirim sebagai pesan terpisah (bubble sendiri).
export const FILE_SHARE_DEFAULT_TEXT = "Mengirimkan sebuah file.";
export const IMAGE_SHARE_DEFAULT_TEXT = "Mengirimkan sebuah gambar.";

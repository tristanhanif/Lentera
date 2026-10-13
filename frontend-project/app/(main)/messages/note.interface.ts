export interface NoteUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

export type NoteType = 'text' | 'music';

export interface ChatNote {
  id: string;
  text: string;
  type: NoteType;
  musicTitle: string | null;
  musicArtist: string | null;
  musicCover: string | null;
  musicUrl: string | null;
  audience?: "mutual" | "close";
  createdAt: string;
  expiresAt: string;
  isOwn: boolean;
  user: NoteUser;
}

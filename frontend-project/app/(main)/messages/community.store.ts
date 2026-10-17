"use client";

export interface CommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  isMine: boolean;
  text: string;
  createdAt: string;
  // Event permanen backend (mis. "'username' telah ditambahkan"):
  // tampil di tengah sebagai kotak sistem.
  isEvent?: boolean;
  // VN komunitas (ala DM/saluran): audioUrl + durasi detik.
  audioUrl?: string | null;
  voiceDuration?: number | null;
}

export interface CommunityMember {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  // Co-admin backend. Opsional biar data lokal lama tetap kebaca.
  isAdmin?: boolean;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  // null = pakai default /icon-komunitas.png
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  messages: CommunityMessage[];
  // Anggota komunitas (lokal dulu, owner = admin satu-satunya).
  // Old data tanpa members dimigrasi jadi [] saat load.
  members: CommunityMember[];
}

const keyFor = (userId: string) => `lentera-communities-${userId || "anon"}`;

export function loadCommunities(userId: string): Community[] {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          Array.isArray(c.messages),
      )
      .map((c) => ({
        ...c,
        description: typeof c.description === "string" ? c.description : "",
        avatarUrl: c.avatarUrl ?? null,
        ownerId: typeof c.ownerId === "string" ? c.ownerId : "",
        createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
        members: Array.isArray(c.members)
          ? c.members.filter(
              (m: unknown) =>
                m && typeof (m as CommunityMember).id === "string",
            )
          : [],
      })) as Community[];
  } catch {
    return [];
  }
}

export function saveCommunities(userId: string, list: Community[]) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(list.slice(0, 50)));
  } catch {
    // abaikan kalau storage penuh / diblokir
  }
}

export const DEFAULT_COMMUNITY_ICON = "/icon-komunitas.png";

export function communityAvatar(src: string | null | undefined): string {
  return src || DEFAULT_COMMUNITY_ICON;
}

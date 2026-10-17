"use client";
import { formatVoiceDuration } from "../channel.service";
import type { ChatMessage } from "../chat.interface";
import {
  POST_SHARE_DEFAULT_TEXT,
  FILE_SHARE_DEFAULT_TEXT,
  IMAGE_SHARE_DEFAULT_TEXT,
  VOICE_SHARE_DEFAULT_TEXT,
} from "../chat.interface";

export const PIN_DURATIONS = [
  { label: "15 Menit", minutes: 15 },
  { label: "30 Menit", minutes: 30 },
  { label: "1 Jam", minutes: 60 },
  { label: "1 Hari", minutes: 60 * 24 },
  { label: "7 Hari", minutes: 60 * 24 * 7 },
];

// Daftar emoji chat: sama seperti di komentar postingan.
export const CHAT_EMOJIS: string[] = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🥰",
  "😎", "🤔", "😐", "🙄", "😴", "😷", "🤯", "🥳",
  "😭", "😡", "👍", "👎", "🙏", "👏", "💪", "✌️",
  "👀", "🙌", "🔥", "⭐", "🎉", "❤️", "💙", "💔",
];

// Ukuran file -> "800 KB" / "2,5 MB".
export const formatFileSize = (bytes: number | null | undefined) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1).replace(".", ",")} MB`;
};

export const getFileExt = (name: string) =>
  name.split(".").pop()?.toLowerCase() ?? "";

// Teks default yang bubble-nya disembunyikan (hanya kotak yang tampil).
// Find TIDAK mencari teks ini karena tidak terlihat di kotak pesan.
export const isHiddenShareText = (text: string) =>
  text === POST_SHARE_DEFAULT_TEXT ||
  text === FILE_SHARE_DEFAULT_TEXT ||
  text === IMAGE_SHARE_DEFAULT_TEXT ||
  text === VOICE_SHARE_DEFAULT_TEXT;

// Label preview VN di daftar percakapan + pinned + reply.
export const voicePreviewLabel = (msg: { audioUrl?: string | null; voiceDuration?: number | null; text?: string }) => {
  if (!msg.audioUrl) return msg.text ?? "";
  return `🎤 VN ${formatVoiceDuration(msg.voiceDuration)}`;
};

// Balasan catatan: cek kedaluwarsa dari snapshot noteExpiresAt.
export const isNoteReplyExpired = (msg: ChatMessage) => {
  if (!msg.noteId) return false;
  if (!msg.noteExpiresAt) return true;
  try {
    const raw = msg.noteExpiresAt;
    const d = /[Zz]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)
      ? new Date(raw)
      : new Date(raw.replace(" ", "T") + "Z");
    return d.getTime() <= Date.now();
  } catch {
    return true;
  }
};

// Aturan Find: hanya kotak pesan teks (bubble) + nama file dokumen.
export const getFindMatchInfo = (msg: ChatMessage, qLower: string) => {
  if (!qLower || msg.isEvent || msg.isDeleted) {
    return { textMatch: false, docMatch: false, matched: false };
  }
  const textMatch =
    !isHiddenShareText(msg.text) && msg.text.toLowerCase().includes(qLower);
  const isDocument = !!msg.fileUrl && msg.fileType !== "image";
  const docMatch =
    isDocument && !!msg.fileName && msg.fileName.toLowerCase().includes(qLower);
  return { textMatch, docMatch, matched: textMatch || docMatch };
};

export const formatBadge4 = (n: number) => (n > 4 ? "4+" : `${n}`);

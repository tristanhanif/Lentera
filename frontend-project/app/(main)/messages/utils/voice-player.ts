"use client";

// ===== Global voice player untuk semua bubble VN (DM/komunitas/saluran) =====
// Satu-satunya elemen <audio> global. Bubble VN manapun yang dipencet play
// mendaftar sebagai "aktif" di sini: pemutaran VN lain otomatis berhenti
// (NGGAK AKAN TERTABRAK), dan VoiceMiniPlayer di bawah daftar percakapan
// ikut menampilkan VN yang aktif — tetap bunyi walau user sudah pindah
// percakapan/pane lain. Semua pane (DM/komunitas/saluran) nyambung.
import { useCallback, useSyncExternalStore } from "react";

export interface VoicePlayerState {
  // Identitas VN yang aktif (diprefix per pane agar antar-table tidak bentrok).
  // null = tidak ada VN yang berputar.
  id: string | null;
  url: string | null;
  title: string;
  avatarUrl: string | null;
  // Konteks pane tempat VN mulai diputar ("dm:<convId>" / "community:<id>" /
  // "channel:<id>"). Dipakai VoiceMiniPlayer untuk menyembunyikan kotak mini
  // saat user masih berada di percakapan yang sama dengan VN-nya.
  sourceKey: string | null;
  // false = VN aktif tapi lagi pause (mini-player tetap tampil, bisa dilanjut).
  playing: boolean;
  // Posisi pemutaran (detik) + rasio 0-1, dibagikan via event audio global.
  elapsed: number;
  progress: number;
}

const EMPTY: VoicePlayerState = {
  id: null,
  url: null,
  title: "",
  avatarUrl: null,
  sourceKey: null,
  playing: false,
  elapsed: 0,
  progress: 0,
};

let state: VoicePlayerState = EMPTY;

// Elemen audio global singleton — dibuat lazy di client.
let audioEl: HTMLAudioElement | null = null;

// Blob-URL hasil rekaman yang kita kelola sendiri (revoke saat diganti).
let lastBlobUrl: string | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): VoicePlayerState {
  return state;
}

// Untuk SSR: selalu state awal.
function getServerSnapshot(): VoicePlayerState {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isBlobUrl(url: string | null): boolean {
  return !!url && url.startsWith("blob:");
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "metadata";
    audioEl.addEventListener("timeupdate", () => {
      const a = audioEl;
      if (!a || !state.id) return;
      state = {
        ...state,
        elapsed: a.currentTime,
        progress: a.duration ? a.currentTime / a.duration : 0,
      };
      emit();
    });
    audioEl.addEventListener("play", () => {
      if (!state.id) return;
      state = { ...state, playing: true };
      emit();
    });
    audioEl.addEventListener("pause", () => {
      if (!state.id) return;
      state = { ...state, playing: false };
      emit();
    });
    audioEl.addEventListener("ended", () => {
      // VN selesai: JANGAN kosongkan state (biar VoiceMiniPlayer tetap
      // tampil menempel sampai user pencet icon silang). Cukup tandai
      // berhenti + reset posisi ke 0, siap diputar ulang dari awal.
      if (!state.id) return;
      state = {
        ...state,
        playing: false,
        elapsed: 0,
        progress: 0,
      };
      emit();
    });
  }
  return audioEl;
}

/**
 * Mulai memutar VN (id unik per pesan). VN lain yang sedang berputar
 * otomatis berhenti — ini inti fix tabrakan 2 VN.
 */
export async function playVoice(
  id: string,
  url: string,
  title: string,
  avatarUrl: string | null,
  sourceKey: string | null = null,
): Promise<void> {
  const audio = ensureAudio();
  if (!audio) return;
  const isNew = state.id !== id;
  // Lepas blob-URL lama (milik kita) hanya kalau diganti VN baru.
  if (isNew && lastBlobUrl && isBlobUrl(lastBlobUrl) && lastBlobUrl !== url) {
    try {
      URL.revokeObjectURL(lastBlobUrl);
    } catch {}
    lastBlobUrl = null;
  }
  if (isBlobUrl(url)) lastBlobUrl = url;
  state = {
    id,
    url,
    title,
    avatarUrl,
    sourceKey,
    playing: false,
    elapsed: 0,
    progress: 0,
  };
  emit();
  if (isNew) {
    try {
      audio.src = url;
    } catch {}
  }
  try {
    await audio.play();
  } catch {}
}

/** Pause saja — state aktif tetap, mini-player tetap tampil (bisa dilanjut). */
export async function pauseVoice(): Promise<void> {
  if (audioEl) {
    try {
      audioEl.pause();
    } catch {}
  }
}

/** Lanjutkan pemutaran VN aktif. */
export async function resumeVoice(): Promise<void> {
  if (audioEl && state.id) {
    try {
      await audioEl.play();
    } catch {}
  }
}

/** Hentikan total + kosongkan mini-player. */
export function stopAll(): void {
  if (audioEl) {
    try {
      audioEl.pause();
    } catch {}
    try {
      audioEl.removeAttribute("src");
    } catch {}
  }
  state = EMPTY;
  const blobUrl = lastBlobUrl;
  if (blobUrl && isBlobUrl(blobUrl)) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
    lastBlobUrl = null;
  }
  emit();
}

/**
 * Toggle dari bubble VN: VN ini yang aktif -> pause/lanjut.
 * Bukan yang aktif -> hentikan VN lain lalu mulai VN ini.
 */
export async function toggleVoice(
  id: string,
  url: string,
  title: string,
  avatarUrl: string | null,
  sourceKey: string | null = null,
): Promise<void> {
  if (state.id === id) {
    if (state.playing) {
      await pauseVoice();
    } else {
      await resumeVoice();
    }
    return;
  }
  await playVoice(id, url, title, avatarUrl, sourceKey);
}

export function useVoicePlayerState(): VoicePlayerState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Hook bubble VN: apakah VN dengan id ini yang sedang berputar. */
export function useIsVoicePlaying(id: string | null): boolean {
  const st = useVoicePlayerState();
  return !!id && st.id === id && st.playing;
}

/** Hook bubble VN: posisi pemutaran utk VN id ini (0 kalau bukan aktif). */
export function useVoicePlayback(id: string | null): {
  playing: boolean;
  elapsed: number;
  progress: number;
} {
  const st = useVoicePlayerState();
  if (!id || st.id !== id) {
    return { playing: false, elapsed: 0, progress: 0 };
  }
  return { playing: st.playing, elapsed: st.elapsed, progress: st.progress };
}

/** Hook VoiceMiniPlayer: state aktif + toggle play/pause + stop. */
export function useVoiceMiniPlayer() {
  const st = useVoicePlayerState();
  const toggle = useCallback(async () => {
    if (!st.id) return;
    if (st.playing) {
      await pauseVoice();
    } else {
      await resumeVoice();
    }
  }, [st.id, st.playing]);
  return {
    active: st,
    activeId: st.id,
    playing: st.playing,
    elapsed: st.elapsed,
    progress: st.progress,
    toggle,
    stop: stopAll,
  };
}

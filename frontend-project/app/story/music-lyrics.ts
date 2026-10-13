"use client";

// Lirik gratis via lrclib.net (tanpa API key).
// Dipakai mode stiker "lyrics" ala IG: tampil baris-berbaris.

export interface FetchedLyrics {
  lines: string[];
  hasSynced: boolean;
}

const splitLines = (plain: string): string[] =>
  plain
    .split("\n")
    .map((l) => l.trim())
    .filter((l, i, arr) => {
      if (!l) return false;
      // Buang pengulangan baris kosong / metadata umum.
      if (/^\(.*\)$/.test(l) && l.length < 40) return false;
      return arr.indexOf(l) === i || true;
    })
    .filter(Boolean);

export async function fetchLyrics(
  title: string,
  artist: string,
): Promise<FetchedLyrics> {
  const q = `${title} ${artist}`.trim();
  if (!q) return { lines: [], hasSynced: false };
  const res = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`lirik ${res.status}`);
  const json = (await res.json()) as {
    trackName?: string;
    artistName?: string;
    plainLyrics?: string | null;
    syncedLyrics?: string | null;
  }[];
  const best =
    json.find((r) => r.plainLyrics && r.plainLyrics.trim().length > 0) ??
    json[0];
  if (!best?.plainLyrics) return { lines: [], hasSynced: false };
  return {
    lines: splitLines(best.plainLyrics).slice(0, 40),
    hasSynced: !!best.syncedLyrics,
  };
}

// Potong bait: 4 baris per halaman, bisa digeser dengan chunkIdx.
export function lyricChunk(lines: string[], chunkIdx: number, perChunk = 4): string[] {
  if (lines.length === 0) return [];
  const chunks = Math.max(1, Math.ceil(lines.length / perChunk));
  const idx = ((chunkIdx % chunks) + chunks) % chunks;
  return lines.slice(idx * perChunk, idx * perChunk + perChunk);
}

// Pilih baris lirik sesuai kotak putih 15 detik.
// startSec = awal kotak dalam preview (0..previewDuration-15).
// Dipetakan proporsional ke seluruh lirik supaya kotak 1-15 dan 10-25
// menampilkan bait yang beda. Diambil perWindow baris (default 8 = 2 halaman
// @ 4 baris), wrap-around kalau mentok di akhir lagu.
export function lyricWindow(
  allLines: string[],
  startSec: number,
  previewDuration = 30,
  perWindow = 8,
): string[] {
  if (allLines.length === 0) return [];
  if (allLines.length <= perWindow) return allLines.slice(0, perWindow);
  const dur = Math.max(1, previewDuration);
  const ratio = Math.max(0, Math.min(1, startSec / dur));
  const maxStartIdx = Math.max(0, allLines.length - perWindow);
  const startIdx = Math.min(
    maxStartIdx,
    Math.floor(ratio * (allLines.length - 1)),
  );
  const out: string[] = [];
  for (let i = 0; i < perWindow; i++) {
    out.push(allLines[(startIdx + i) % allLines.length]);
  }
  return out;
}

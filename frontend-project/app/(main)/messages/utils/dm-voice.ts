"use client";
// Helper VN DM (sama kayak saluran): waveform + mime + cache.

export const MAX_DM_VN_SECS = 300;

const dmPeaksCache = new Map<string, number[]>();

export async function getDmPeaks(url: string, bars = 48): Promise<number[]> {
  const hit = dmPeaksCache.get(url);
  if (hit) return hit;
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(buf);
    const data = decoded.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / bars));
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let max = 0;
      const start = i * step;
      for (let j = start; j < Math.min(start + step, data.length); j += 7) {
        const v = Math.abs(data[j]);
        if (v > max) max = v;
      }
      out.push(Math.max(0.15, Math.min(1, max * 1.6)));
    }
    try {
      await ctx.close();
    } catch {}
    dmPeaksCache.set(url, out);
    return out;
  } catch {
    let h = 0;
    for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
    const out = Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(i * 12.9898 + h * 0.0001) * 43758.5453;
      return 0.25 + 0.65 * Math.abs(x - Math.floor(x));
    });
    dmPeaksCache.set(url, out);
    return out;
  }
}

export function pickDmMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  try {
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
    }
  } catch {}
  return "";
}

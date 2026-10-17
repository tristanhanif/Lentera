"use client";
// Helper waktu chat: backend simpan UTC (datetime tanpa offset),
// tampilkan di WIB supaya tidak ikut timezone laptop/browser.

export const parseAsUTC = (dateStr: string) => {
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
};

export const formatWIBTime = (dateStr: string) =>
  parseAsUTC(dateStr).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

// "Dilihat • 5 mnt lalu" ala IG, dalam Bahasa Indonesia.
export const formatReadAt = (readAt: string, nowMs: number) => {
  const diff = nowMs - parseAsUTC(readAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return parseAsUTC(readAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
};

// Separator tanggal ala WA/IG di tengah percakapan.
// WIB day-key "YYYY-MM-DD" supaya pengelompokan ikut jam Jakarta.
export const wibDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const getWIBDayKey = (dateStr: string) => {
  try {
    return wibDayFormatter.format(parseAsUTC(dateStr));
  } catch {
    return dateStr.slice(0, 10);
  }
};

export const getWIBDayStartUTC = (dateStrOrDate: string | Date) => {
  const d =
    typeof dateStrOrDate === "string"
      ? parseAsUTC(dateStrOrDate)
      : dateStrOrDate;
  const parts = wibDayFormatter.formatToParts(d);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const day = Number(get("day"));
  if (!y || !m || !day) return NaN;
  return Date.UTC(y, m - 1, day);
};

// Label separator:
// - Hari yang sama -> "Hari Ini"
// - Selisih 1 hari kalender WIB -> "Kemarin"
// - < 7 hari -> nama hari ("Senin", "Selasa", ...)
// - >= 7 hari -> "20/09/2026"
export const formatDateSeparator = (dateStr: string, nowMs: number = Date.now()) => {
  const msgStart = getWIBDayStartUTC(dateStr);
  const nowStart = getWIBDayStartUTC(new Date(nowMs));
  if (!Number.isNaN(msgStart) && !Number.isNaN(nowStart)) {
    const diffDays = Math.round((nowStart - msgStart) / 86400000);
    if (diffDays <= 0) return "Hari Ini";
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) {
      const weekday = parseAsUTC(dateStr).toLocaleDateString("id-ID", {
        weekday: "long",
        timeZone: "Asia/Jakarta",
      });
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }
  }
  try {
    const parts = wibDayFormatter.formatToParts(parseAsUTC(dateStr));
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const dd = get("day").padStart(2, "0");
    const mm = get("month").padStart(2, "0");
    const yyyy = get("year");
    if (dd && mm && yyyy) return `${dd}/${mm}/${yyyy}`;
  } catch {
    // fallback ke toLocaleDateString di bawah
  }
  return parseAsUTC(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
};

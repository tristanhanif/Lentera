"use client";

// Definisi style + warna stiker teks Lentera Story (dipakai editor,
// preview kanvas, dan halaman viewer supaya hasilnya identik).

export type StoryTextStyleId =
  | "modern"
  | "classic"
  | "typewriter"
  | "neon"
  | "poster";

export interface StoryTextStyleDef {
  id: StoryTextStyleId;
  label: string;
  fontFamily: string;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  textTransform?: "none" | "uppercase";
  letterSpacing?: string;
  borderRadius: string;
  padding: string;
  glow?: boolean;
}

export const STORY_TEXT_STYLES: StoryTextStyleDef[] = [
  {
    id: "modern",
    label: "Modern",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontWeight: 800,
    borderRadius: "16px",
    padding: "8px 14px",
  },
  {
    id: "classic",
    label: "Classic",
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 600,
    fontStyle: "italic",
    borderRadius: "6px",
    padding: "8px 14px",
  },
  {
    id: "typewriter",
    label: "Typewriter",
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: 700,
    letterSpacing: "1px",
    borderRadius: "4px",
    padding: "8px 12px",
  },
  {
    id: "neon",
    label: "Neon",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontWeight: 800,
    letterSpacing: "0.5px",
    borderRadius: "12px",
    padding: "8px 14px",
    glow: true,
  },
  {
    id: "poster",
    label: "Poster",
    fontFamily: "'Arial Black', 'Segoe UI', system-ui, sans-serif",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "2px",
    borderRadius: "10px",
    padding: "10px 16px",
  },
];

export interface StoryTextColor {
  id: string;
  box: string;
  ink: string;
}

// Aturan kontras: box gelap -> teks putih, box cerah -> teks hitam.
// Krem terang -> espresso (bukan hitam), krem gelap -> putih.
export const STORY_TEXT_COLORS: StoryTextColor[] = [
  { id: "white", box: "#ffffff", ink: "#000000" },
  { id: "black", box: "#111111", ink: "#ffffff" },
  { id: "blue", box: "#2563eb", ink: "#ffffff" },
  { id: "red", box: "#dc2626", ink: "#ffffff" },
  { id: "green", box: "#16a34a", ink: "#ffffff" },
  { id: "yellow", box: "#facc15", ink: "#000000" },
  { id: "purple", box: "#9333ea", ink: "#ffffff" },
  { id: "cream-light", box: "#f7f0dc", ink: "#4e342e" },
  { id: "cream-dark", box: "#8a6d3b", ink: "#ffffff" },
];

export const DEFAULT_TEXT_COLOR_ID = "white";

export function getTextStyle(id: string | null | undefined): StoryTextStyleDef {
  return (
    STORY_TEXT_STYLES.find((s) => s.id === id) ?? STORY_TEXT_STYLES[0]
  );
}

export function getTextColor(id: string | null | undefined): StoryTextColor {
  return (
    STORY_TEXT_COLORS.find((c) => c.id === id) ??
    STORY_TEXT_COLORS[0]
  );
}

export interface StoryTextValue {
  content: string;
  style: StoryTextStyleId;
  bg: string;
  x: number | null;
  y: number | null;
  scale: number;
}

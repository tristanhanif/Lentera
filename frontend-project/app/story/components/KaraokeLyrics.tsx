"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Text } from "@chakra-ui/react";

const PER_PAGE = 4;

interface KaraokeLyricsProps {
  lines: string[];
  windowSec?: number;
  playing?: boolean;
  resetKey?: string | number;
  maxW?: string;
  title?: string;
  artist?: string;
}

// Lirik karaoke: max 4 baris per halaman, huruf muncul satu per satu
// dengan animasi melebar (scaleX + blur, bukan ketikan).
// Baris 2 baru muncul setelah baris 1 selesai (delay global sekuensial).
// Kalau baris > 4, halaman ganti otomatis (4 baris -> 4 baris berikutnya),
// waktunya dibagi rata dari windowSec (15 detik) lalu loop.
export function KaraokeLyrics({
  lines,
  windowSec = 15,
  playing = true,
  resetKey = "",
  maxW = "260px",
  title,
  artist,
}: KaraokeLyricsProps) {
  const pages = useMemo(() => {
    const clean = lines.filter(Boolean).slice(0, 12);
    if (clean.length === 0) return [];
    const out: string[][] = [];
    for (let i = 0; i < clean.length; i += PER_PAGE) {
      out.push(clean.slice(i, i + PER_PAGE));
    }
    return out;
  }, [lines]);

  const [pageIdx, setPageIdx] = useState(0);

  // Ganti halaman otomatis + reset saat lagu/kotak putih berubah.
  useEffect(() => {
    setPageIdx(0);
  }, [resetKey, lines.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!playing || pages.length <= 1) return;
    const perPageMs = (windowSec / pages.length) * 1000;
    const t = setInterval(() => {
      setPageIdx((i) => (i + 1) % pages.length);
    }, perPageMs);
    return () => clearInterval(t);
  }, [playing, pages.length, windowSec, resetKey]);

  if (pages.length === 0) return null;
  const page = pages[Math.min(pageIdx, pages.length - 1)];
  const perPageSec = windowSec / Math.max(1, pages.length);

  // Total huruf di halaman ini -> bagi waktu supaya baris 2 nunggu baris 1.
  const totalChars = page.reduce((n, l) => n + l.length, 0) || 1;
  const perCharSec = (perPageSec * 0.8) / totalChars;

  let charCursor = 0;

  return (
    <>
      <style>{`@keyframes lenteraExpand { from { opacity: 0; transform: scaleX(0.2); filter: blur(4px); } to { opacity: 1; transform: scaleX(1); filter: blur(0); } }`}</style>
      <Box textAlign="center" maxW={maxW} key={`${resetKey}-${pageIdx}`}>
        {page.map((line, li) => {
          const startIdx = charCursor;
          charCursor += line.length;
          return (
            <Text
              key={li}
              fontSize={li === 0 ? "md" : "sm"}
              fontWeight="black"
              color="white"
              textShadow="0 2px 8px rgba(0,0,0,0.9)"
              lineHeight="1.6"
            >
              {line.split("").map((ch, ci) => {
                const globalIdx = startIdx + ci;
                return (
                  <Box
                    key={ci}
                    as="span"
                    display="inline-block"
                    transformOrigin="left center"
                    style={
                      playing
                        ? {
                            opacity: 0,
                            animation: `lenteraExpand 0.35s ease-out forwards`,
                            animationDelay: `${(globalIdx * perCharSec).toFixed(3)}s`,
                          }
                        : undefined
                    }
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </Box>
                );
              })}
            </Text>
          );
        })}
        {(title || artist) && (
          <Text
            fontSize="10px"
            fontWeight="bold"
            color="whiteAlpha.800"
            mt={2}
            textShadow="0 1px 6px rgba(0,0,0,0.9)"
          >
            {title}
            {title && artist ? " • " : ""}
            {artist}
          </Text>
        )}
      </Box>
    </>
  );
}

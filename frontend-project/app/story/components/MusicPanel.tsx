"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, HStack, Input, Spinner, Text } from "@chakra-ui/react";
import {
  AnimatePresence,
  motion,
  useDragControls,
} from "framer-motion";
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Music2,
  Pause,
  Play,
  ScrollText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  SpotifyTrack,
  useSpotifySearch,
  useSpotifyTrending,
} from "../spotify.service";
import { fetchLyrics, lyricWindow } from "../music-lyrics";
import { KaraokeLyrics } from "./KaraokeLyrics";

const MotionBox = motion.create(Box);

const STORY_MUSIC_SEC = 15;
const SAVED_KEY = "lentera_saved_tracks";
const fmt = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  return `0:${String(v).padStart(2, "0")}`;
};

export type MusicStickerMode = "none" | "lyrics" | "vinyl";
const MODES: MusicStickerMode[] = ["none", "lyrics", "vinyl"];

function waveformBars(seed: string, count = 56): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    bars.push(25 + ((h >> 8) % 75));
  }
  return bars;
}

function loadSaved(): SpotifyTrack[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((t) => t && t.id);
  } catch {
    return [];
  }
}

interface MusicPanelProps {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  selectedStart?: number | null;
  onSelect: (
    track: SpotifyTrack,
    startSec: number,
    mode: MusicStickerMode,
    lyrics: string | null,
  ) => void;
  onRemove?: () => void;
}

// Alur baru ala IG (sesuai sketsa):
// 1. Bottom-sheet hitam dari bawah (drag bisa ditutup): search + 2 tab
//    (Sedang Tren / Tersimpan) + list lagu + icon save kanan.
// 2. Setelah pilih lagu: mini player nempel di bawah sheet
//    (cover kiri, judul+artist, play/pause, panah putih ke editor).
// 3. Editor menutupi foto (ditumpuk): sampah kiri, cover kecil tengah,
//    centang kanan, tengah preview (Hanya Musik / Lirik / Piringan),
//    bawah 3 buletan mode + timeline 15 + waveform kotak putih.
export function MusicPanel({
  open,
  onClose,
  selectedId,
  selectedStart,
  onSelect,
  onRemove,
}: MusicPanelProps) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeTab, setActiveTab] = useState<"trending" | "saved">("trending");
  const [saved, setSaved] = useState<SpotifyTrack[]>([]);
  const [step, setStep] = useState<"browse" | "edit">("browse");

  const [pending, setPending] = useState<SpotifyTrack | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [modeIdx, setModeIdx] = useState(0);
  const [lyricLines, setLyricLines] = useState<string[]>([]);
  const [lyricLoading, setLyricLoading] = useState(false);
  const touchXRef = useRef<number | null>(null);

  const browseControls = useDragControls();
  const editControls = useDragControls();

  // Ref supaya ontimeupdate tidak pakai startSec basi (stale closure)
  // saat kotak putih digeser sambil lagu diputar.
  const startSecRef = useRef(0);
  useEffect(() => {
    startSecRef.current = startSec;
  }, [startSec]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    try {
      setSaved(loadSaved());
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setStep("browse");
      // pending dipertahankan supaya mini player / pilihan tidak hilang
      // saat sheet dibuka-tutup, kecuali user pencet sampah.
    }
  }, [open ]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 100)));
    } catch {}
  }, [saved]);

  const trending = useSpotifyTrending(open && debounced.length < 2);
  const search = useSpotifySearch(open ? debounced : "");
  const searching = debounced.length >= 2;

  const searchTracks = search.data?.data ?? [];
  const trendTracks = trending.data?.data ?? [];
  const isLoading = searching ? search.isFetching : trending.isFetching;

  const savedIds = useMemo(() => new Set(saved.map((t) => t.id)), [saved]);

  const listTracks: SpotifyTrack[] = searching
    ? searchTracks
    : activeTab === "trending"
      ? trendTracks
      : saved;

  const maxStart = Math.max(0, Math.floor(previewDuration - STORY_MUSIC_SEC));
  const bars = useMemo(
    () => waveformBars(pending?.id ?? "lentera", 56),
    [pending?.id],
  );
  const boxWidthPct = (STORY_MUSIC_SEC / Math.max(previewDuration, 1)) * 100;
  const boxLeftPct = (startSec / Math.max(previewDuration, 1)) * 100;
  const timelinePct =
    maxStart <= 0 ? 0 : (startSec / maxStart) * 100;
  // Lirik ngikut kotak putih: kotak 1-15 vs 10-25 menampilkan bait beda.
  // Diambil 8 baris (2 halaman @ 4 baris) untuk jatah 15 detik.
  const windowLines = useMemo(
    () => lyricWindow(lyricLines, startSec, previewDuration, 8),
    [lyricLines, startSec, previewDuration],
  );

  useEffect(() => {
    if (!pending) return;
    let alive = true;
    setLyricLoading(true);
    fetchLyrics(pending.title, pending.artist)
      .then((r) => {
        if (!alive) return;
        setLyricLines(r.lines);
      })
      .catch(() => {
        if (!alive) return;
        setLyricLines([]);
      })
      .finally(() => {
        if (alive) setLyricLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [pending?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSave = (track: SpotifyTrack) => {
    setSaved((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        return prev.filter((t) => t.id !== track.id);
      }
      return [track, ...prev].slice(0, 100);
    });
  };

  const chooseTrack = (track: SpotifyTrack) => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setPending(track);
    setStartSec(
      track.id === selectedId ? Math.max(0, Math.min(15, selectedStart ?? 0)) : 0,
    );
    setPreviewDuration(30);
    setModeIdx(0);
    setStep("browse");
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !pending?.previewUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    const s = startSecRef.current;
    try {
      // Selalu mulai dari awal kotak putih, bukan dari posisi lama.
      const cur = audio.currentTime || 0;
      if (cur < s - 0.3 || cur >= s + STORY_MUSIC_SEC) {
        audio.currentTime = s;
      }
    } catch {}
    audio.ontimeupdate = () => {
      const win = startSecRef.current;
      if (audio.currentTime >= win + STORY_MUSIC_SEC) {
        audio.pause();
        setIsPlaying(false);
        try {
          audio.currentTime = win + STORY_MUSIC_SEC;
        } catch {}
      }
    };
    audio.play().catch(() => {});
    setIsPlaying(true);
  };

  const setStartFromRatio = (ratio: number) => {
    const v = Math.round(Math.max(0, Math.min(1, ratio)) * maxStart);
    setStartSec(v);
    startSecRef.current = v;
    const a = audioRef.current;
    if (a) {
      try {
        // Lagu yang diputar selalu ngikut kotak putih:
        // geser kotak = posisi audio ikut pindah (baik saat play maupun pause,
        // supaya pencet play langsung bunyi dari kotak itu).
        a.currentTime = v;
      } catch {}
      // Kalau sedang diputar, pastikan batas mati otomatis ikut kotak baru.
      if (isPlaying) {
        a.ontimeupdate = () => {
          const win = startSecRef.current;
          if (a.currentTime >= win + STORY_MUSIC_SEC) {
            a.pause();
            setIsPlaying(false);
          }
        };
      }
    }
  };

  // Pengaman: kalau startSec berubah dari mana pun (timeline / waveform),
  // handler batas 15 detik selalu pakai kotak terbaru.
  useEffect(() => {
    const a = audioRef.current;
    if (a && isPlaying) {
      a.ontimeupdate = () => {
        const win = startSecRef.current;
        if (a.currentTime >= win + STORY_MUSIC_SEC) {
          a.pause();
          setIsPlaying(false);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSec]);

  const confirm = () => {
    if (!pending?.previewUrl) return;
    const mode = MODES[modeIdx];
    const lyrics =
      mode === "lyrics" && windowLines.length > 0
        ? windowLines.join("\n")
        : null;
    onSelect(pending, startSec, mode, lyrics);
  };

  const trash = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setPending(null);
    setStep("browse");
    onRemove?.();
  };

  const mode = MODES[modeIdx];

  return (
    <AnimatePresence>
      {open && (
        <>
          <style>{`@keyframes lenteraSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
          <audio
            ref={audioRef}
            src={pending?.previewUrl ?? undefined}
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > STORY_MUSIC_SEC) {
                setPreviewDuration(d);
              } else {
                setPreviewDuration(30);
              }
            }}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />

          {/* ============ TAHAP EDITOR: menutupi foto (ditumpuk) ============ */}
          {step === "edit" && pending ? (
            <MotionBox
              key="music-edit"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              drag="y"
              dragListener={false}
              dragControls={editControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 700) {
                  setStep("browse");
                }
              }}
              position="fixed"
              inset={0}
              zIndex={201}
              bg="blackAlpha.500"
              color="white"
              display="flex"
              justifyContent="center"
            >
              <Box
                w="full"
                maxW="400px"
                h="100dvh"
                display="flex"
                flexDirection="column"
                px={4}
                pt={3}
                pb={5}
              >
                {/* handle drag */}
                <Box
                  onPointerDown={(e) => editControls.start(e)}
                  cursor="grab"
                  touchAction="none"
                  py={2}
                  display="flex"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Box w="44px" h="5px" borderRadius="full" bg="whiteAlpha.500" />
                </Box>

                {/* top bar: sampah | cover kecil | centang */}
                <Flex align="center" justify="space-between" flexShrink={0}>
                  <Box
                    as="button"
                    aria-label="Hapus musik"
                    onClick={trash}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                  >
                    <Trash2 size={20} />
                  </Box>
                  {pending.cover ? (
                    <img
                      src={pending.cover}
                      alt={pending.title}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="lg"
                      bg="whiteAlpha.200"
                      align="center"
                      justify="center"
                    >
                      <Music2 size={18} color="white" />
                    </Flex>
                  )}
                  <Box
                    as="button"
                    aria-label="Pakai lagu ini"
                    onClick={confirm}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color="white"
                    _hover={{ bg: "whiteAlpha.200" }}
                  >
                    <Check size={22} />
                  </Box>
                </Flex>

                {/* tengah: Hanya Musik / Lirik / Piringan */}
                <Flex
                  flex={1}
                  align="center"
                  justify="center"
                  minH={0}
                  onTouchStart={(e) => {
                    touchXRef.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    if (touchXRef.current == null) return;
                    const dx =
                      e.changedTouches[0].clientX - touchXRef.current;
                    if (dx < -40)
                      setModeIdx((i) => Math.min(MODES.length - 1, i + 1));
                    if (dx > 40) setModeIdx((i) => Math.max(0, i - 1));
                    touchXRef.current = null;
                  }}
                >
                  {mode === "none" && (
                    <Text fontSize="md" fontWeight="medium" color="white">
                      Hanya Musik
                    </Text>
                  )}
                  {mode === "lyrics" && (
                    <Box textAlign="center" maxW="260px">
                      {lyricLoading ? (
                        <Flex justify="center" py={4}>
                          <Spinner size="sm" color="white" />
                        </Flex>
                      ) : windowLines.length === 0 ? (
                        <Text fontSize="sm" color="whiteAlpha.700">
                          Lirik tidak ditemukan untuk lagu ini
                        </Text>
                      ) : (
                        <KaraokeLyrics
                          lines={windowLines}
                          windowSec={STORY_MUSIC_SEC}
                          playing={isPlaying}
                          resetKey={`${pending.id}-${startSec}`}
                          maxW="260px"
                        />
                      )}
                    </Box>
                  )}
                  {mode === "vinyl" && (
                    <Box textAlign="center">
                      <Box
                        w="96px"
                        h="96px"
                        borderRadius="full"
                        bg="var(--app-secondary)"
                        border="4px solid"
                        borderColor="whiteAlpha.400"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        mx="auto"
                        style={{
                          animation: "lenteraSpin 6s linear infinite",
                        }}
                      >
                        {pending.cover ? (
                          <img
                            src={pending.cover}
                            alt={pending.title}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Music2 size={22} color="white" />
                        )}
                      </Box>
                      <Text
                        fontSize="sm"
                        fontWeight="bold"
                        color="white"
                        mt={2}
                        textShadow="0 1px 6px rgba(0,0,0,0.9)"
                      >
                        {pending.title}
                      </Text>
                      <Text fontSize="xs" color="whiteAlpha.700">
                        {pending.artist}
                      </Text>
                    </Box>
                  )}
                </Flex>

                {/* 3 buletan mode */}
                <Flex align="center" justify="center" gap={3} mb={4} flexShrink={0}>
                  <Box
                    as="button"
                    aria-label="Hanya musik"
                    onClick={() => setModeIdx(0)}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={modeIdx === 0 ? "white" : "whiteAlpha.200"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                  >
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="full"
                      bg={modeIdx === 0 ? "black" : "white"}
                    />
                  </Box>
                  <Box
                    as="button"
                    aria-label="Lirik lagu"
                    onClick={() => setModeIdx(1)}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={modeIdx === 1 ? "white" : "whiteAlpha.200"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color={modeIdx === 1 ? "black" : "white"}
                  >
                    <ScrollText size={18} />
                  </Box>
                  <Box
                    as="button"
                    aria-label="Piringan musik"
                    onClick={() => setModeIdx(2)}
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={modeIdx === 2 ? "white" : "whiteAlpha.200"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    color={modeIdx === 2 ? "black" : "white"}
                  >
                    <Disc3 size={18} />
                  </Box>
                </Flex>

                {/* timeline 15 + garis panjang */}
                <Flex align="center" gap={3} flexShrink={0}>
                  <Flex
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    border="1px solid"
                    borderColor="whiteAlpha.500"
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <Text fontSize="11px" fontWeight="bold">
                      15
                    </Text>
                  </Flex>
                  <Box
                    flex={1}
                    h="24px"
                    display="flex"
                    alignItems="center"
                    cursor="pointer"
                    onPointerDown={(e) => {
                      const rect = (
                        e.currentTarget as HTMLElement
                      ).getBoundingClientRect();
                      if (rect.width > 0)
                        setStartFromRatio((e.clientX - rect.left) / rect.width);
                      const move = (ev: PointerEvent) => {
                        const r = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        if (r.width > 0)
                          setStartFromRatio((ev.clientX - r.left) / r.width);
                      };
                      const up = () => {
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  >
                    <Box position="relative" w="full" h="2px" bg="whiteAlpha.300" borderRadius="full">
                      <Box
                        position="absolute"
                        top="50%"
                        bg="var(--app-card)"
                        borderRadius="full"
                        w="10px"
                        h="10px"
                        style={{
                          left: `calc(${timelinePct}% - 5px)`,
                          transform: "translateY(-50%)",
                        }}
                      />
                    </Box>
                  </Box>
                  <Box
                    as="button"
                    aria-label={isPlaying ? "Jeda" : "Putar"}
                    onClick={togglePlay}
                    w="32px"
                    h="32px"
                    borderRadius="full"
                    bg="var(--app-card)"
                    color="var(--app-text)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    flexShrink={0}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  </Box>
                </Flex>

                {/* intonasi lagu + kotak putih 15 detik */}
                <Box mt={3} flexShrink={0}>
                  <Box
                    ref={waveRef}
                    position="relative"
                    h="48px"
                    cursor="ew-resize"
                    touchAction="none"
                    onPointerDown={(e) => {
                      draggingRef.current = true;
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      const rect = waveRef.current?.getBoundingClientRect();
                      if (rect && rect.width > 0)
                        setStartFromRatio((e.clientX - rect.left) / rect.width);
                    }}
                    onPointerMove={(e) => {
                      if (!draggingRef.current) return;
                      const rect = waveRef.current?.getBoundingClientRect();
                      if (rect && rect.width > 0)
                        setStartFromRatio((e.clientX - rect.left) / rect.width);
                    }}
                    onPointerUp={() => {
                      draggingRef.current = false;
                    }}
                  >
                    <Flex align="flex-end" gap="2px" h="full">
                      {bars.map((v, i) => (
                        <Box
                          key={i}
                          flex={1}
                          bg="whiteAlpha.500"
                          borderRadius="full"
                          style={{ height: `${v}%` }}
                        />
                      ))}
                    </Flex>
                    <Box
                      position="absolute"
                      top={0}
                      bottom={0}
                      bg="whiteAlpha.300"
                      border="2px solid white"
                      borderRadius="md"
                      style={{
                        left: `${boxLeftPct}%`,
                        width: `${boxWidthPct}%`,
                      }}
                      pointerEvents="none"
                    />
                  </Box>
                  <Text fontSize="11px" color="whiteAlpha.600" mt={1} textAlign="center">
                    {fmt(startSec)} – {fmt(startSec + STORY_MUSIC_SEC)} • geser kotak putih
                  </Text>
                </Box>
              </Box>
            </MotionBox>
          ) : (
            /* ============ TAHAP BROWSE: kotak hitam dari bawah ============ */
            <>
              <MotionBox
                key="music-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                position="fixed"
                inset={0}
                bg="blackAlpha.600"
                zIndex={198}
                onClick={onClose}
              />
              <MotionBox
                key="music-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                drag="y"
                dragListener={false}
                dragControls={browseControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 110 || info.velocity.y > 700) {
                    onClose();
                  }
                }}
                position="fixed"
                zIndex={199}
                bg="#0a0a0a"
                color="white"
                border="1px solid"
                borderColor="whiteAlpha.200"
                bottom={0}
                left={0}
                right={0}
                mx="auto"
                w="full"
                maxW="480px"
                h="82dvh"
                maxH="82dvh"
                borderRadius="20px 20px 0 0"
                display="flex"
                flexDirection="column"
                overflow="hidden"
              >
                {/* handle drag */}
                <Box
                  onPointerDown={(e) => browseControls.start(e)}
                  cursor="grab"
                  touchAction="none"
                  py={2}
                  display="flex"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Box w="44px" h="5px" borderRadius="full" bg="whiteAlpha.400" />
                </Box>

                {/* kotak pencarian */}
                <Box px={4} pb={2} flexShrink={0}>
                  <HStack
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="xl"
                    px={3}
                    py={2}
                  >
                    <Search size={16} color="#a1a1aa" />
                    <Input
                      placeholder="Cari musik"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      fontSize="sm"
                      color="white"
                      _placeholder={{ color: "whiteAlpha.500" }}
                      border="none"
                      outline="none"
                      p={0}
                      h="auto"
                    />
                    {query && (
                      <Box
                        as="button"
                        aria-label="Hapus pencarian"
                        onClick={() => setQuery("")}
                        cursor="pointer"
                        color="whiteAlpha.600"
                        display="flex"
                      >
                        <X size={16} />
                      </Box>
                    )}
                  </HStack>
                </Box>

                {/* 2 tab */}
                {!searching && (
                  <Flex px={4} gap={2} pb={2} flexShrink={0}>
                    {(
                      [
                        { key: "trending", label: "Sedang tren" },
                        { key: "saved", label: "Tersimpan" },
                      ] as const
                    ).map((t) => (
                      <Box
                        key={t.key}
                        as="button"
                        onClick={() => setActiveTab(t.key)}
                        px={3}
                        py={1.5}
                        borderRadius="full"
                        fontSize="xs"
                        fontWeight="bold"
                        cursor="pointer"
                        bg={activeTab === t.key ? "white" : "whiteAlpha.100"}
                        color={activeTab === t.key ? "black" : "whiteAlpha.700"}
                        _hover={{ bg: activeTab === t.key ? "white" : "whiteAlpha.200" }}
                      >
                        {t.label}
                      </Box>
                    ))}
                  </Flex>
                )}

                {/* daftar lagu */}
                <Box flex={1} overflowY="auto" minH={0} px={2} pb={2}>
                  {isLoading && listTracks.length === 0 ? (
                    <Flex py={8} justify="center">
                      <Spinner size="md" color="white" />
                    </Flex>
                  ) : listTracks.length === 0 ? (
                    <Text fontSize="xs" color="whiteAlpha.600" textAlign="center" py={6}>
                      {searching
                        ? "Tidak ada lagu yang cocok"
                        : activeTab === "saved"
                          ? "Belum ada lagu tersimpan — pencet icon save di lagu"
                          : "Belum ada lagu tren"}
                    </Text>
                  ) : (
                    listTracks.map((track) => {
                      const isSaved = savedIds.has(track.id);
                      const active = pending?.id === track.id;
                      const selected = track.id === selectedId;
                      return (
                        <Flex
                          key={track.id}
                          align="center"
                          gap={3}
                          px={2}
                          py={2}
                          borderRadius="lg"
                          cursor="pointer"
                          bg={active ? "whiteAlpha.200" : "transparent"}
                          _hover={{ bg: "whiteAlpha.100" }}
                          onClick={() => chooseTrack(track)}
                        >
                          {track.cover ? (
                            <img
                              src={track.cover}
                              alt={track.title}
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                objectFit: "cover",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <Flex
                              w="44px"
                              h="44px"
                              borderRadius="lg"
                              bg="whiteAlpha.200"
                              align="center"
                              justify="center"
                              flexShrink={0}
                            >
                              <Music2 size={18} color="white" />
                            </Flex>
                          )}
                          <Box flex={1} minW={0}>
                            <Text fontSize="xs" fontWeight="bold" truncate>
                              {track.title}
                            </Text>
                            <Text fontSize="xs" color="whiteAlpha.600" truncate>
                              {track.artist}
                            </Text>
                          </Box>
                          {selected && !active && (
                            <Check size={14} color="#4ade80" />
                          )}
                          <Box
                            as="button"
                            aria-label={isSaved ? "Hapus dari simpanan" : "Simpan lagu"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(track);
                            }}
                            cursor="pointer"
                            color={isSaved ? "white" : "whiteAlpha.500"}
                            _hover={{ color: "white" }}
                            display="flex"
                            flexShrink={0}
                            p={1}
                          >
                            <Bookmark
                              size={20}
                              fill={isSaved ? "white" : "transparent"}
                            />
                          </Box>
                        </Flex>
                      );
                    })
                  )}
                </Box>

                {/* mini player setelah pilih lagu */}
                {pending && (
                  <Box
                    mx={3}
                    mb={3}
                    flexShrink={0}
                    bg="whiteAlpha.100"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="xl"
                    px={3}
                    py={2}
                  >
                    <Flex align="center" gap={3}>
                      {pending.cover ? (
                        <img
                          src={pending.cover}
                          alt={pending.title}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Flex
                          w="40px"
                          h="40px"
                          borderRadius="lg"
                          bg="whiteAlpha.200"
                          align="center"
                          justify="center"
                          flexShrink={0}
                        >
                          <Music2 size={16} color="white" />
                        </Flex>
                      )}
                      <Box flex={1} minW={0}>
                        <Text fontSize="xs" fontWeight="bold" truncate>
                          {pending.title}
                        </Text>
                        <Text fontSize="xs" color="whiteAlpha.600" truncate>
                          {pending.artist}
                        </Text>
                      </Box>
                      <Box
                        as="button"
                        aria-label={isPlaying ? "Jeda" : "Putar"}
                        onClick={togglePlay}
                        w="36px"
                        h="36px"
                        borderRadius="full"
                        border="1px solid"
                        borderColor="whiteAlpha.400"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        flexShrink={0}
                        _hover={{ bg: "whiteAlpha.200" }}
                      >
                        {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                      </Box>
                      <Box
                        as="button"
                        aria-label="Lanjut atur lagu"
                        onClick={() => setStep("edit")}
                        w="36px"
                        h="36px"
                        borderRadius="full"
                        bg="var(--app-card)"
                        color="var(--app-text)"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        flexShrink={0}
                        _hover={{ bg: "whiteAlpha.800" }}
                      >
                        <ChevronRight size={18} />
                      </Box>
                    </Flex>
                  </Box>
                )}
              </MotionBox>
            </>
          )}

          {/* navigasi mode di editor: panah kiri-kanan (opsional, selain 3 buletan) */}
          {step === "edit" && pending && (
            <Box position="fixed" zIndex={202} display="none">
              <Box as="button" aria-label="x" onClick={() => {}}>
                <ChevronLeft size={16} />
              </Box>
            </Box>
          )}
        </>
      )}
    </AnimatePresence>
  );
}

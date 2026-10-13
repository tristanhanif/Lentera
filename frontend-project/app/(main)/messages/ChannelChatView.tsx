"use client";
/* eslint-disable @next/next/no-img-element */
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  EllipsisVertical,
  LogOut,
  Mic,
  Pause,
  Play,
  Send,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import {
  channelAvatar,
  formatVoiceDuration,
  type BackendChannelMessage,
} from "./channel.service";

const MotionBox = motion(Box);
const MAX_VN_SECS = 300;

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  followerCount: number;
}

interface ChannelChatViewProps {
  channel: ChannelInfo;
  messages: BackendChannelMessage[];
  isOwner: boolean;
  unreadCount?: number;
  firstUnreadId?: string | null;
  onRead?: () => void;
  onSendText: (text: string) => void;
  onSendVoice: (blob: Blob, duration: number) => void;
  sendingVoice?: boolean;
  onUnfollow: () => void;
}

// Cache puncak waveform per URL biar tidak decode ulang.
const peaksCache = new Map<string, number[]>();

async function getPeaks(url: string, bars = 48): Promise<number[]> {
  const hit = peaksCache.get(url);
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
    peaksCache.set(url, out);
    return out;
  } catch {
    // Fallback: bar semu deterministik dari URL.
    let h = 0;
    for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
    const out = Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(i * 12.9898 + h * 0.0001) * 43758.5453;
      return 0.25 + 0.65 * Math.abs(x - Math.floor(x));
    });
    peaksCache.set(url, out);
    return out;
  }
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  try {
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
    }
  } catch {}
  return "";
}

// ===== Bubble VN: play/pause hijau + titik hijau menyatu gelombang =====
function VoiceBubble({
  url,
  duration,
  playing,
  onPlay,
  onPause,
}: {
  url: string;
  duration: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let live = true;
    getPeaks(url).then((p) => {
      if (live) setPeaks(p);
    });
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => onPause());
    } else {
      a.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(
    () => () => {
      try {
        audioRef.current?.pause();
      } catch {}
    },
    [],
  );

  const total = Math.max(1, duration);
  const pct = Math.min(1, Math.max(0, progress));

  return (
    <Box
      maxW="80%"
      minW="240px"
      px={4}
      py={3}
      borderRadius="2xl"
      bg="white"
      color="black"
      shadow="sm"
      border="2px solid"
      borderColor="var(--app-border)"
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => {
          const t = e.currentTarget;
          setElapsed(t.currentTime);
          setProgress(t.duration ? t.currentTime / t.duration : 0);
        }}
        onEnded={() => {
          setProgress(0);
          setElapsed(0);
          onPause();
        }}
      />
      <Flex align="center" gap={3}>
        <Box
          as="button"
          aria-label={playing ? "Jeda VN" : "Putar VN"}
          w="40px"
          h="40px"
          borderRadius="full"
          bg="green.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          _hover={{ bg: "green.600" }}
          onClick={() => (playing ? onPause() : onPlay())}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </Box>
        {/* Gelombang: bar yang sudah lewat hijau + titik hijau berjalan */}
        <Box flex={1} minW={0} position="relative" h="36px">
          <Flex align="center" gap="2px" h="full">
            {(peaks.length ? peaks : Array.from({ length: 48 }, () => 0.4)).map((p, i, arr) => (
              <Box
                key={i}
                w="3px"
                borderRadius="full"
                bg={i / arr.length <= pct ? "green.500" : "#cbd5e1"}
                style={{ height: `${Math.round(p * 100)}%` }}
                flexShrink={0}
              />
            ))}
          </Flex>
          <Box
            position="absolute"
            top="50%"
            w="10px"
            h="10px"
            borderRadius="full"
            bg="green.500"
            transform="translate(-50%, -50%)"
            style={{ left: `${Math.round(pct * 100)}%` }}
          />
        </Box>
      </Flex>
      <Text fontSize="xs" color="black" mt={1.5} fontWeight="medium">
        {playing && elapsed > 0.3
          ? `${formatVoiceDuration(elapsed)} / ${formatVoiceDuration(total)}`
          : formatVoiceDuration(total)}
      </Text>
    </Box>
  );
}

// ===== Perekam VN ala WA =====
type RecPhase = "recording" | "paused";

function VoiceRecorder({
  onCancel,
  onSend,
}: {
  onCancel: () => void;
  onSend: (blob: Blob, duration: number) => void;
}) {
  const [phase, setPhase] = useState<RecPhase>("recording");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 32 }, () => 0.2));
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef("");
  const doneRef = useRef(false);

  const stopTracks = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    try {
      if (audioCtxRef.current?.state !== "closed") void audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        mimeRef.current = pickMime();
        const rec = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recRef.current = rec;
        rec.start(250);
        startRef.current = Date.now();
        accRef.current = 0;
        // Timer + auto-stop 5 menit. Saat jeda, timer ikut berhenti.
        timerRef.current = window.setInterval(() => {
          const st = recRef.current?.state;
          const s = Math.floor(
            st === "recording" ? accRef.current + (Date.now() - startRef.current) / 1000 : accRef.current,
          );
          setElapsed(s);
          if (s >= MAX_VN_SECS) finish(true);
        }, 250);
        // Gelombang live dari mic.
        try {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const actx = new Ctx();
          audioCtxRef.current = actx;
          const src = actx.createMediaStreamSource(stream);
          const an = actx.createAnalyser();
          an.fftSize = 64;
          src.connect(an);
          const arr = new Uint8Array(an.frequencyBinCount);
          const loop = () => {
            an.getByteFrequencyData(arr);
            const out: number[] = [];
            for (let i = 0; i < 32; i++) {
              const v = arr[Math.floor((i / 32) * arr.length)] / 255;
              out.push(Math.max(0.12, Math.min(1, v * 1.4)));
            }
            setLevels(out);
            rafRef.current = requestAnimationFrame(loop);
          };
          loop();
        } catch {}
      } catch {
        Swal.fire({ icon: "error", title: "Izin mic ditolak", text: "Aktifkan izin mikrofon dulu ya.", timer: 2200, showConfirmButton: false });
        onCancel();
      }
    })();
    return () => {
      cancelled = true;
      stopTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (send: boolean) => {
    if (doneRef.current) return;
    const rec = recRef.current;
    // Kalau sedang jeda, jangan hitung segmen berjalan (hindari dobel).
    const live = rec?.state === "recording" && startRef.current > 0;
    const secs = Math.max(1, Math.round(accRef.current + (live ? (Date.now() - startRef.current) / 1000 : 0)));
    if (!rec || rec.state === "inactive") {
      doneRef.current = true;
      stopTracks();
      if (send && chunksRef.current.length > 0) {
        onSend(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }), Math.min(secs, MAX_VN_SECS));
      } else onCancel();
      return;
    }
    doneRef.current = true;
    rec.onstop = () => {
      stopTracks();
      if (send && chunksRef.current.length > 0) {
        onSend(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }), Math.min(secs, MAX_VN_SECS));
      } else onCancel();
    };
    try {
      rec.stop();
    } catch {
      stopTracks();
      onCancel();
    }
  };

  const pauseRec = () => {
    try {
      if (recRef.current?.state === "recording") {
        accRef.current += (Date.now() - startRef.current) / 1000;
        setElapsed(Math.floor(accRef.current));
        recRef.current.pause();
        setPhase("paused");
      }
    } catch {}
  };

  const resumeRec = () => {
    try {
      if (recRef.current?.state === "paused") {
        startRef.current = Date.now();
        recRef.current.resume();
        setPhase("recording");
      }
    } catch {}
  };

  const discard = () => {
    doneRef.current = true;
    try {
      recRef.current?.stop();
    } catch {}
    stopTracks();
    onCancel();
  };

  // Tombol kirim biru di luar memicu penyelesaian via event.
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const h = () => finishRef.current(true);
    window.addEventListener("lentera:send-vn", h);
    return () => window.removeEventListener("lentera:send-vn", h);
  }, []);

  return (
    <HStack flex={1} gap={2} align="center" minW={0}>
      <IconButton
        aria-label="Hapus rekaman"
        variant="ghost"
        size="sm"
        borderRadius="full"
        color="var(--app-muted)"
        _hover={{ bg: "var(--app-subtle)", color: "red.500" }}
        onClick={discard}
        flexShrink={0}
      >
        <Trash2 size={18} />
      </IconButton>
      {phase === "recording" ? (
        <Box w="10px" h="10px" borderRadius="full" bg="red.500" flexShrink={0} />
      ) : (
        <IconButton
          aria-label="Lanjutkan dari jeda"
          variant="ghost"
          size="sm"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)" }}
          onClick={resumeRec}
          flexShrink={0}
        >
          <Play size={18} />
        </IconButton>
      )}
      {phase === "paused" && (
        <Box w="8px" h="8px" borderRadius="full" bg="green.500" flexShrink={0} />
      )}
      <Text fontSize="sm" color="var(--app-text)" fontWeight="medium" minW="38px" flexShrink={0}>
        {formatVoiceDuration(elapsed)}
      </Text>
      {/* Gelombang suara */}
      <Flex flex={1} minW={0} align="center" gap="2px" h="32px" overflow="hidden">
        {levels.map((lv, i) => (
          <Box
            key={i}
            w="3px"
            borderRadius="full"
            bg={phase === "paused" ? "green.500" : "red.400"}
            style={{ height: `${Math.round(lv * 100)}%`, opacity: phase === "paused" ? 0.55 : 1 }}
            flexShrink={0}
          />
        ))}
      </Flex>
      {phase === "recording" ? (
        <Box
          as="button"
          aria-label="Jeda rekaman"
          w="36px"
          h="36px"
          borderRadius="full"
          bg="red.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          _hover={{ bg: "red.600" }}
          onClick={pauseRec}
        >
          <Pause size={16} />
        </Box>
      ) : (
        <Box
          as="button"
          aria-label="Lanjutkan rekaman"
          w="36px"
          h="36px"
          borderRadius="full"
          bg="red.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          _hover={{ bg: "red.600" }}
          onClick={resumeRec}
        >
          <Mic size={16} />
        </Box>
      )}
    </HStack>
  );
}

export default function ChannelChatView({
  channel,
  messages,
  isOwner,
  unreadCount = 0,
  firstUnreadId = null,
  onRead,
  onSendText,
  onSendVoice,
  sendingVoice = false,
  onUnfollow,
}: ChannelChatViewProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  // ===== Unread ala WA (sama seperti komunitas) =====
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const initialUnreadRef = useRef(0);
  const clearedForRef = useRef<string | null>(null);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const showNewLabelRef = useRef(false);
  showNewLabelRef.current = showNewLabel;
  const clearUnread = () => {
    if (!showNewLabelRef.current) return;
    if (firstUnreadId) clearedForRef.current = firstUnreadId;
    setShowNewLabel(false);
    try {
      onRead?.();
    } catch {}
  };

  useEffect(() => {
    clearedForRef.current = null;
    initialUnreadRef.current = unreadCount ?? 0;
    setShowNewLabel((unreadCount ?? 0) > 0 && !!firstUnreadId);
    atBottomRef.current = !firstUnreadId;
    setPlayingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  useEffect(() => {
    if (firstUnreadId && (unreadCount ?? 0) > 0 && clearedForRef.current !== firstUnreadId) {
      initialUnreadRef.current = unreadCount ?? 0;
      setShowNewLabel(true);
      atBottomRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstUnreadId, unreadCount]);

  useEffect(() => {
    if (!showNewLabel && atBottomRef.current && (unreadCount ?? 0) > 0) {
      try {
        onRead?.();
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    const t = setTimeout(() => {
      const root = scrollRef.current;
      if (!root) return;
      if (showNewLabel && firstUnreadId) {
        document.getElementById(`chmsg-${firstUnreadId}`)?.scrollIntoView({ block: "center" });
      } else if (!showNewLabel && atBottomRef.current) {
        root.scrollTo({ top: root.scrollHeight });
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, showNewLabel, firstUnreadId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    atBottomRef.current = atBottom;
    if (atBottom) clearUnread();
  };

  useEffect(() => {
    const root = scrollRef.current;
    const target = bottomRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          atBottomRef.current = true;
          clearUnread();
        }
      },
      { root, threshold: 0.1 },
    );
    obs.observe(target);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, messages.length, showNewLabel, firstUnreadId]);

  const handleSendText = () => {
    const v = text.trim();
    if (!v) return;
    onSendText(v);
    setText("");
  };

  const startRecording = () => setRecording(true);

  return (
    <Flex flex={1} direction="column" h="full" minH={0} position="relative" bg="var(--app-card)">
      {/* Header */}
      <Flex p={4} bg="var(--app-card)" borderBottom="1px solid" borderColor="var(--app-hover)" justify="space-between" align="center" shadow="sm" position="relative" zIndex={10}>
        <HStack gap={3}>
          <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
            <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontWeight="bold" color="var(--app-text)" fontSize="md" lineClamp={1}>
              {channel.name}
            </Text>
            <Text fontSize="xs" color="var(--app-faint)" fontWeight="medium">
              {channel.followerCount} followers
            </Text>
          </VStack>
        </HStack>
        <Box position="relative">
          <IconButton aria-label="Menu saluran" variant="ghost" size="sm" borderRadius="full" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={() => setMenuOpen((v) => !v)}>
            <EllipsisVertical size={20} />
          </IconButton>
          {menuOpen && <Box position="fixed" inset={0} zIndex={20} onClick={() => setMenuOpen(false)} />}
          <AnimatePresence>
            {menuOpen && (
              <MotionBox initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18, ease: "easeOut" }} position="absolute" top="calc(100% + 4px)" right={0} bg="var(--app-card)" borderRadius="xl" shadow="lg" border="1px solid" borderColor="var(--app-border)" minW="190px" py={2} zIndex={30}>
                <Flex px={4} py={2.5} gap={3} align="center" justify="start" cursor="pointer" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s" onClick={() => { setMenuOpen(false); setConfirmUnfollow(true); }}>
                  <Box display="flex" alignItems="center"><LogOut size={16} /></Box>
                  <Text fontSize="sm" fontWeight="medium">{isOwner ? "Hapus saluran" : "Berhenti mengikuti"}</Text>
                </Flex>
              </MotionBox>
            )}
          </AnimatePresence>
        </Box>
      </Flex>

      {/* Isi chat: bubble di tengah, tanpa avatar/nama */}
      <VStack ref={scrollRef} onScroll={handleScroll} flex={1} overflowY="auto" px={6} py={6} gap={4} align="stretch" css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
        <Box mx="auto" w="full" maxW="300px" bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="2xl" shadow="sm" px={5} py={5}>
          <VStack gap={2} align="center" textAlign="center">
            <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)">
              <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Box>
            <Text fontWeight="black" color="var(--app-text)" fontSize="md">
              Selamat datang di saluran {channel.name}!
            </Text>
            <Text fontSize="xs" color="var(--app-muted)" maxW="240px">
              Hanya pembuat saluran yang dapat mengirim pesan.
            </Text>
            <Box h="1px" w="full" bg="var(--app-border)" my={2} />
            <Text fontSize="sm" fontWeight="bold" color="var(--app-muted)">
              {channel.followerCount} followers
            </Text>
          </VStack>
        </Box>

        {messages.map((m) => {
          const isFirstUnread = showNewLabel && firstUnreadId === m.id;
          return (
            <Fragment key={m.id}>
              {isFirstUnread && (
                <Flex justify="center" my={1}>
                  <Box
                    as="button"
                    onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
                    bg="var(--app-card)"
                    border="1px solid"
                    borderColor="var(--app-border)"
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    shadow="sm"
                    maxW="90%"
                    cursor="pointer"
                    _hover={{ bg: "var(--app-hover)" }}
                  >
                    <Text fontSize="11px" fontWeight="bold" color="var(--app-text)" textAlign="center">
                      {initialUnreadRef.current > 0 ? initialUnreadRef.current : unreadCount} pesan terbaru
                    </Text>
                  </Box>
                </Flex>
              )}
              <Flex justify="center" id={`chmsg-${m.id}`}>
                {m.kind === "voice" && m.audioUrl ? (
                  <VoiceBubble
                    url={m.audioUrl}
                    duration={m.duration ?? 0}
                    playing={playingId === m.id}
                    onPlay={() => setPlayingId(m.id)}
                    onPause={() => setPlayingId((prev) => (prev === m.id ? null : prev))}
                  />
                ) : (
                  <Box
                    maxW="80%"
                    px={4}
                    py={3}
                    borderRadius="2xl"
                    bg="white"
                    color="black"
                    shadow="sm"
                    border="2px solid"
                    borderColor="var(--app-border)"
                  >
                    <Text fontSize="sm" color="black" whiteSpace="pre-wrap" wordBreak="break-word">
                      {m.text ?? ""}
                    </Text>
                  </Box>
                )}
              </Flex>
            </Fragment>
          );
        })}
        <Box ref={bottomRef} h="1px" w="full" flexShrink={0} />
      </VStack>

      {/* Input: hanya pembuat. Kosong = mic, ada isi/rekaman = kirim. */}
      {isOwner ? (
        <Box p={4} flexShrink={0} bg="transparent">
          {recording ? (
            <HStack gap={2} align="center">
              <HStack flex={1} bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="full" px={3} py={1} gap={1} minW={0}>
                <VoiceRecorder
                  onCancel={() => setRecording(false)}
                  onSend={(blob, secs) => {
                    setRecording(false);
                    onSendVoice(blob, secs);
                  }}
                />
              </HStack>
              <IconButton
                bg="blue.600"
                color="white"
                borderRadius="full"
                w="40px"
                h="40px"
                flexShrink={0}
                shadow="lg"
                _hover={{ bg: "blue.700" }}
                aria-label="Kirim VN"
                loading={sendingVoice}
                onClick={() => {
                  // Kirim via tombol: VoiceRecorder selesaikan & kirim isi rekaman.
                  const ev = new CustomEvent("lentera:send-vn");
                  window.dispatchEvent(ev);
                }}
              >
                <Send size={18} />
              </IconButton>
            </HStack>
          ) : (
            <HStack gap={2} align="center">
              <HStack flex={1} bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="full" px={3} py={1} gap={1}>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendText();
                  }}
                  placeholder="Ketik pesan..."
                  fontSize="sm"
                  color="var(--app-text)"
                  border="none"
                  bg="transparent"
                  p={0}
                  h="36px"
                  _placeholder={{ color: "var(--app-faint)" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
              {text.trim() ? (
                <IconButton bg="blue.600" color="white" borderRadius="full" w="40px" h="40px" flexShrink={0} shadow="lg" _hover={{ bg: "blue.700" }} aria-label="Kirim" onClick={handleSendText}>
                  <Send size={18} />
                </IconButton>
              ) : (
                <IconButton bg="blue.600" color="white" borderRadius="full" w="40px" h="40px" flexShrink={0} shadow="lg" _hover={{ bg: "blue.700" }} aria-label="Rekam VN" onClick={startRecording}>
                  <Mic size={18} />
                </IconButton>
              )}
            </HStack>
          )}
        </Box>
      ) : (
        <Box p={4} flexShrink={0} bg="transparent">
          <Box bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="full" px={4} py={2.5}>
            <Text fontSize="xs" color="var(--app-muted)" textAlign="center">
              Hanya pembuat saluran yang dapat mengirim pesan.
            </Text>
          </Box>
        </Box>
      )}

      {/* Konfirmasi berhenti mengikuti / hapus */}
      <AnimatePresence>
        {confirmUnfollow && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setConfirmUnfollow(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18, ease: "easeOut" }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={5} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Text fontSize="md" fontWeight="medium" color="var(--app-text)">
                {isOwner ? `Hapus saluran ${channel.name}?` : `Berhenti mengikuti ${channel.name}?`}
              </Text>
              <Flex justify="flex-end" gap={2} mt={5}>
                <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setConfirmUnfollow(false)}>
                  Tidak
                </Button>
                <Button
                  borderRadius="lg"
                  size="sm"
                  bg="red.500"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  onClick={() => {
                    setConfirmUnfollow(false);
                    onUnfollow();
                  }}
                >
                  Ya
                </Button>
              </Flex>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>
    </Flex>
  );
}

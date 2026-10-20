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
  ChevronDown,
  Copy,
  EllipsisVertical,
  Forward,
  Link2,
  LogOut,
  Mic,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import {
  toggleVoice,
  useIsVoicePlaying,
  useVoicePlayback,
} from "./utils/voice-player";
import {
  channelAvatar,
  formatVoiceDuration,
  useReactChannelMessage,
  type BackendChannelMessage,
  type ChannelMessageReactionGroup,
} from "./channel.service";
import ChannelInfoView from "./ChannelInfoView";
import type { ChatConversation } from "./chat.interface";

const MotionBox = motion(Box);
const MAX_VN_SECS = 300;

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  followerCount: number;
  createdAt?: string;
}

interface ChannelChatViewProps {
  channel: ChannelInfo;
  messages: BackendChannelMessage[];
  isOwner: boolean;
  isPreview?: boolean;
  isFollowing?: boolean;
  unreadCount?: number;
  firstUnreadId?: string | null;
  onRead?: () => void;
  onSendText: (text: string) => void;
  onSendVoice: (blob: Blob, duration: number) => void;
  sendingVoice?: boolean;
  onUnfollow: () => void;
  onJoin?: () => void;
  joining?: boolean;
  onUpdateChannel?: (patch: { description?: string; avatarUrl?: string | null }) => void;
  conversations?: ChatConversation[];
  onForwardToDM?: (conversationId: string) => void;
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

// Waktu backend disimpan UTC (datetime tanpa offset) -> tampil WIB "22:30".
// Sama seperti chat DM di messages/page.tsx.
const parseChannelTime = (dateStr: string) => {
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
};

const formatChannelHM = (dateStr: string) => {
  try {
    const d = parseChannelTime(dateStr);
    const parts = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).formatToParts(d);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    return dateStr.slice(11, 16);
  }
};

// ===== Reaksi cepat bubble VN (POV pengikut): 6 emoji + panel full =====
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ALL_EMOJIS: { e: string; k: string }[] = [
  { e: "😀", k: "senyum smile grin" },
  { e: "😁", k: "grin gigi teeth smile" },
  { e: "😂", k: "tertawa laugh lol ngakak" },
  { e: "🤣", k: "ngakak laugh lol" },
  { e: "😊", k: "senyum malu smile" },
  { e: "😍", k: "cinta love mata heart eyes" },
  { e: "😘", k: "cium kiss" },
  { e: "🥰", k: "sayang love smile" },
  { e: "😎", k: "keren cool gaya" },
  { e: "🤔", k: "mikir think bingung" },
  { e: "😐", k: "datar flat neutral" },
  { e: "🙄", k: "sinis malas" },
  { e: "😴", k: "tidur sleep ngantuk" },
  { e: "😷", k: "sakit masker mask" },
  { e: "🤯", k: "kaget mindblown" },
  { e: "🥳", k: "pesta party ulang tahun" },
  { e: "😭", k: "nangis cry sedih" },
  { e: "😡", k: "marah angry kesal" },
  { e: "😮", k: "kaget wow surprised" },
  { e: "😢", k: "sedih sad air mata tear" },
  { e: "😜", k: "lidah tongue becanda" },
  { e: "👍", k: "jempol like setuju thumbs up" },
  { e: "👎", k: "tidak dislike jelek" },
  { e: "🙏", k: "doa pray terima kasih thanks" },
  { e: "👏", k: "tepuk applause tangan" },
  { e: "💪", k: "otot strong kuat" },
  { e: "✌️", k: "peace damai" },
  { e: "👀", k: "lihat eyes mata" },
  { e: "🙌", k: "hore hurray senang" },
  { e: "🤝", k: "salaman deal handshake" },
  { e: "👌", k: "ok oke mantap" },
  { e: "🫶", k: "hati hands love" },
  { e: "🔥", k: "api fire keren" },
  { e: "⭐", k: "bintang star" },
  { e: "✨", k: "kilau sparkle bersinar" },
  { e: "💯", k: "seratus 100 nilai" },
  { e: "🎉", k: "pesta party selamat" },
  { e: "❤️", k: "hati love merah red" },
  { e: "💙", k: "hati biru blue love" },
  { e: "💔", k: "patah hati broken" },
  { e: "🎂", k: "kue cake ulang tahun birthday" },
  { e: "🍕", k: "pizza makan" },
  { e: "☕", k: "kopi coffee minum" },
  { e: "🍜", k: "mie noodle makan" },
  { e: "🚀", k: "roket rocket cepat" },
  { e: "✈️", k: "pesawat plane liburan travel" },
  { e: "🏠", k: "rumah home" },
  { e: "⚽", k: "bola soccer sepak" },
  { e: "🎮", k: "game main" },
  { e: "🎵", k: "musik music lagu" },
  { e: "📢", k: "pengumuman announce info" },
  { e: "💡", k: "lampu ide idea" },
  { e: "✅", k: "centang check benar" },
  { e: "❌", k: "silang cross salah" },
  { e: "⏰", k: "jam alarm clock waktu" },
  { e: "🎁", k: "kado gift hadiah" },
];

// ===== Menu hover bubble chat (POV pengikut): chevron -> kotak emoji + menu =====
// Dipakai bareng bubble VN dan bubble teks.
// Kotak 1 (emoji) sudah fungsi: pilih emoji -> reaksi ke bubble.
function useChannelBubbleMenu(
  withMenu: boolean,
  linkText?: string | null,
  chevronRight: string | number = 1,
  onReact?: (emoji: string) => void,
) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");

  const showChevron = withMenu && (hovered || menuOpen || emojiOpen);
  const hasLink = !!linkText && /https?:\/\/\S+/i.test(linkText);
  const q = emojiQuery.trim().toLowerCase();
  const filteredEmojis = q
    ? ALL_EMOJIS.filter((item) => item.k.includes(q))
    : ALL_EMOJIS;

  const closeAllMenus = () => {
    setMenuOpen(false);
    setEmojiOpen(false);
    setEmojiQuery("");
  };

  const bubbleMenu = (
    <>
      {/* Chevron: muncul saat kursor di atas bubble */}
      {showChevron && (
        <Box
          as="button"
          aria-label="Opsi pesan"
          position="absolute"
          top={1}
          right={chevronRight}
          w="24px"
          h="24px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="var(--app-muted)"
          _hover={{ bg: "var(--app-hover)", color: "var(--app-text)" }}
          onClick={() => {
            if (emojiOpen) {
              closeAllMenus();
            } else {
              setMenuOpen((v) => !v);
            }
          }}
        >
          <ChevronDown size={16} />
        </Box>
      )}

      {/* Kotak 1: bar 6 emoji + plus, di atas bubble rata kanan */}
      <AnimatePresence>
        {menuOpen && !emojiOpen && (
          <MotionBox
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            position="absolute"
            bottom="calc(100% + 8px)"
            right={2}
            zIndex={30}
            bg="var(--app-card)"
            border="1px solid"
            borderColor="var(--app-border)"
            borderRadius="full"
            shadow="lg"
            px={2}
            py={1.5}
          >
            <HStack gap={0.5} align="center">
              {QUICK_EMOJIS.map((em) => (
                <Box
                  key={em}
                  as="button"
                  aria-label={`Reaksi ${em}`}
                  fontSize="20px"
                  lineHeight={1}
                  p={1}
                  borderRadius="md"
                  cursor="pointer"
                  transition="transform 0.12s"
                  _hover={{ bg: "var(--app-hover)", transform: "scale(1.25)" }}
                  onClick={() => {
                    onReact?.(em);
                    closeAllMenus();
                  }}
                >
                  {em}
                </Box>
              ))}
              <Box
                as="button"
                aria-label="Semua emoji"
                w="28px"
                h="28px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="var(--app-muted)"
                cursor="pointer"
                _hover={{ bg: "var(--app-hover)", color: "var(--app-text)" }}
                onClick={() => setEmojiOpen(true)}
              >
                <Plus size={18} />
              </Box>
            </HStack>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Kotak 2: menu di kanan bubble rata atas (tampilan saja) */}
      <AnimatePresence>
        {menuOpen && !emojiOpen && (
          <>
            <Box position="fixed" inset={0} zIndex={20} onClick={closeAllMenus} />
            <MotionBox
              initial={{ opacity: 0, x: -8, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.97 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              position="absolute"
              right={2}
              top={2}
              zIndex={30}
              bg="var(--app-card)"
              border="1px solid"
              borderColor="var(--app-border)"
              borderRadius="xl"
              shadow="lg"
              minW="170px"
              py={2}
            >
              <Flex px={4} py={2.5} gap={3} align="center" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s">
                <Copy size={16} />
                <Text fontSize="sm" fontWeight="medium">Copy</Text>
              </Flex>
              <Flex px={4} py={2.5} gap={3} align="center" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s">
                <Forward size={16} />
                <Text fontSize="sm" fontWeight="medium">Forward</Text>
              </Flex>
              {hasLink && (
                <Flex px={4} py={2.5} gap={3} align="center" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s">
                  <Link2 size={16} />
                  <Text fontSize="sm" fontWeight="medium">Copy Link</Text>
                </Flex>
              )}
            </MotionBox>
          </>
        )}
      </AnimatePresence>

      {/* Panel emoji full: ganti kotak 1+2, di kanan menutup sebagian bubble */}
      <AnimatePresence>
        {emojiOpen && (
          <>
            <Box position="fixed" inset={0} zIndex={20} onClick={closeAllMenus} />
            <MotionBox
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              position="absolute"
              top={2}
              right={2}
              zIndex={30}
              w="280px"
              maxW="85%"
              bg="var(--app-card)"
              border="1px solid"
              borderColor="var(--app-border)"
              borderRadius="xl"
              shadow="xl"
              p={3}
            >
              <HStack bg="var(--app-input)" border="1px solid" borderColor="var(--app-border)" borderRadius="lg" px={3} py={1} gap={2}>
                <Box color="var(--app-faint)" display="flex" flexShrink={0}>
                  <Search size={16} />
                </Box>
                <Input
                  value={emojiQuery}
                  onChange={(e) => setEmojiQuery(e.target.value)}
                  placeholder="Cari emoji..."
                  fontSize="sm"
                  color="var(--app-text)"
                  border="none"
                  bg="transparent"
                  p={0}
                  h="34px"
                  _placeholder={{ color: "var(--app-faint)" }}
                  _focus={{ boxShadow: "none" }}
                />
              </HStack>
              <Flex wrap="wrap" gap={1} mt={2} maxH="180px" overflowY="auto" css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
                {filteredEmojis.length === 0 ? (
                  <Text fontSize="xs" color="var(--app-muted)" px={1} py={2}>
                    Tidak ada emoji yang cocok
                  </Text>
                ) : (
                  filteredEmojis.map((item) => (
                    <Box
                      key={item.e}
                      as="button"
                      aria-label={`Emoji ${item.e}`}
                      fontSize="22px"
                      lineHeight={1}
                      p={1}
                      borderRadius="md"
                      cursor="pointer"
                      transition="transform 0.12s"
                      _hover={{ bg: "var(--app-hover)", transform: "scale(1.2)" }}
                      onClick={() => {
                        onReact?.(item.e);
                        closeAllMenus();
                      }}
                    >
                      {item.e}
                    </Box>
                  ))
                )}
              </Flex>
            </MotionBox>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return {
    bubbleHoverProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
    bubbleMenu,
  };
}

// ===== Badge reaksi kecil di bawah-kiri bubble (majuan sedikit, tidak rata kiri) =====
// - 1 emoji -> tampil 1, 2 beda -> tampil 2, dst. Maks 4 yang terbanyak.
// - Kalau total > 4, 4 teratas + angka total di kanan (ala WA).
function ReactionBadge({
  reactions,
  total,
  onOpen,
}: {
  reactions: ChannelMessageReactionGroup[];
  total: number;
  onOpen: () => void;
}) {
  if (!total || !reactions.length) return null;
  const top4 = reactions.slice(0, 4);
  const showCount = total > 4;
  return (
    <Box
      as="button"
      aria-label={`Lihat ${total} reaksi`}
      position="absolute"
      bottom="-12px"
      left="12px"
      zIndex={5}
      bg="var(--app-card)"
      border="1px solid"
      borderColor="var(--app-border)"
      borderRadius="full"
      shadow="sm"
      px={2}
      py={0.5}
      display="flex"
      alignItems="center"
      gap={1}
      cursor="pointer"
      _hover={{ bg: "var(--app-hover)" }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      <Flex align="center" gap="1px">
        {top4.map((g) => (
          <Text key={g.emoji} fontSize="14px" lineHeight={1}>
            {g.emoji}
          </Text>
        ))}
      </Flex>
      {showCount && (
        <Text fontSize="xs" fontWeight="bold" color="var(--app-text)">
          {total}
        </Text>
      )}
    </Box>
  );
}

// ===== Popup "[angka] Reaksi": di bawah bubble, kanan tapi tidak rata kanan =====
// Di bawah kotak emoji (emoji di atas bubble, popup di bawah bubble),
// menutupi bubble chat bawahnya nggak apa-apa. 5 buletan per baris.
// Urutan kiri -> kanan, atas -> bawah = terbanyak dulu (sudah sort backend).
function ReactionsDetail({
  total,
  reactions,
  myEmoji,
  onClose,
}: {
  total: number;
  reactions: ChannelMessageReactionGroup[];
  myEmoji?: string | null;
  onClose: () => void;
}) {
  return (
    <>
      <Box position="fixed" inset={0} zIndex={40} onClick={onClose} />
      <MotionBox
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        position="absolute"
        top="calc(100% + 8px)"
        right="12px"
        zIndex={50}
        bg="var(--app-card)"
        border="1px solid"
        borderColor="var(--app-border)"
        borderRadius="xl"
        shadow="xl"
        p={3}
        w="280px"
        maxW="85%"
      >
        <Text fontSize="sm" fontWeight="bold" color="var(--app-text)">
          {total} Reaksi
        </Text>
        <Box
          display="grid"
          gridTemplateColumns="repeat(5, 1fr)"
          gap={2}
          mt={2}
          maxH="200px"
          overflowY="auto"
          css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}
        >
          {reactions.map((g) => {
            const isMine = myEmoji === g.emoji;
            return (
              <HStack
                key={g.emoji}
                gap={1}
                align="center"
                justify="center"
                border="1px solid"
                borderColor={isMine ? "blue.500" : "var(--app-border)"}
                bg={isMine ? "blue.50" : "var(--app-subtle)"}
                borderRadius="full"
                px={2}
                py={1}
                minW={0}
              >
                <Text fontSize="md" lineHeight={1} flexShrink={0}>
                  {g.emoji}
                </Text>
                <Text fontSize="xs" fontWeight="bold" color="var(--app-text)">
                  {g.count}
                </Text>
              </HStack>
            );
          })}
        </Box>
      </MotionBox>
    </>
  );
}

// ===== Bubble teks: chevron kanan atas + menu yang sama (POV pengikut) =====
function TextBubble({
  text,
  createdAt,
  withMenu,
  reactions,
  totalReactions,
  myEmoji,
  onReact,
  isPreview = false,
}: {
  text: string;
  createdAt: string;
  withMenu: boolean;
  reactions?: ChannelMessageReactionGroup[];
  totalReactions?: number;
  myEmoji?: string | null;
  onReact?: (emoji: string) => void;
  isPreview?: boolean;
}) {
  const { bubbleHoverProps, bubbleMenu } = useChannelBubbleMenu(withMenu, text, 1, onReact);
  const [showDetail, setShowDetail] = useState(false);
  const list = reactions ?? [];
  const total = totalReactions ?? 0;
  return (
    <Box
      w="400px"
      maxW="80%"
      px={4}
      py={3}
      borderRadius="2xl"
      bg="white"
      color="black"
      shadow="sm"
      border="2px solid"
      borderColor="var(--app-border)"
      position="relative"
      {...bubbleHoverProps}
    >
      <Text fontSize="sm" color="black" whiteSpace="pre-wrap" wordBreak="break-word">
        {text}
      </Text>
      {/* Jam pojok kanan bawah */}
      <Flex justify="flex-end" mt={1}>
        <Text fontSize="11px" color="#64748b">
          {formatChannelHM(createdAt)}
        </Text>
      </Flex>
      {bubbleMenu}
      {/* Preview (belum Join): sembunyikan badge + popup Reaksi */}
      {!isPreview && (
        <>
          <ReactionBadge reactions={list} total={total} onOpen={() => setShowDetail(true)} />
          <AnimatePresence>
            {showDetail && (
              <ReactionsDetail
                total={total}
                reactions={list}
                myEmoji={myEmoji}
                onClose={() => setShowDetail(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </Box>
  );
}

// ===== Bubble VN: icon play/pause adaptif tema + gelombang biru + mic & avatar =====
function VoiceBubble({
  id,
  url,
  duration,
  avatarUrl,
  avatarName,
  createdAt,
  sourceKey,
  withMenu,
  linkText,
  reactions,
  totalReactions,
  myEmoji,
  onReact,
  isPreview = false,
}: {
  id: string;
  url: string;
  duration: number;
  avatarUrl: string | null;
  avatarName: string;
  createdAt: string;
  // Konteks saluran tempat bubble ini berada ("channel:<id>") — dipakai
  // VoiceMiniPlayer untuk menyembunyikan kotak mini saat user masih di sini.
  sourceKey?: string | null;
  withMenu: boolean;
  linkText?: string | null;
  reactions?: ChannelMessageReactionGroup[];
  totalReactions?: number;
  myEmoji?: string | null;
  onReact?: (emoji: string) => void;
  isPreview?: boolean;
}) {
  const playingId = useIsVoicePlaying(id);
  const globalPlayback = useVoicePlayback(id);
  const playingNow = playingId;
  const elapsedNow = globalPlayback.elapsed;
  const progress = globalPlayback.progress;
  const [peaks, setPeaks] = useState<number[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const list = reactions ?? [];
  const reactionTotal = totalReactions ?? 0;
  // Menu hover POV pengikut (chevron + kotak emoji + menu + panel).
  // Chevron di kanan atas gelombang: 16 (padding) + 52 (blok mic+avatar) + 10 (gap).
  const { bubbleHoverProps, bubbleMenu } = useChannelBubbleMenu(withMenu, linkText, "78px", onReact);

  useEffect(() => {
    let live = true;
    getPeaks(url).then((p) => {
      if (live) setPeaks(p);
    });
    return () => {
      live = false;
    };
  }, [url]);

  const total = Math.max(1, duration);
  const pct = Math.min(1, Math.max(0, progress));

  return (
    <Box
      w="400px"
      maxW="80%"
      px={4}
      py={3}
      borderRadius="2xl"
      bg="white"
      color="black"
      shadow="sm"
      border="2px solid"
      borderColor="var(--app-border)"
      position="relative"
      {...bubbleHoverProps}
    >
      <Flex align="center" gap={2.5}>
        {/* Play/pause: selalu hitam karena bubble selalu putih (samain bubble teks) */}
        <Box
          as="button"
          aria-label={playingNow ? "Jeda VN" : "Putar VN"}
          color="black"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          onClick={() => void toggleVoice(id, url, avatarName, avatarUrl, sourceKey ?? null)}
        >
          {playingNow ? <Pause size={22} /> : <Play size={22} />}
        </Box>
        {/* Gelombang + durasi: durasi rata kiri sejajar gelombang */}
        <VStack flex={1} minW={0} align="stretch" gap={1}>
          <Box position="relative" h="36px">
            {/* Bar menyusut mengikuti lebar area (flex:1) supaya waveform
                tidak meluber menumpuk icon play & avatar (sama kayak DM). */}
            <Flex align="center" gap="2px" h="full">
              {(peaks.length ? peaks : Array.from({ length: 48 }, () => 0.4)).map((p, i, arr) => (
                <Box
                  key={i}
                  flex={1}
                  minW="1px"
                  maxW="4px"
                  borderRadius="full"
                  bg={i / arr.length <= pct ? "blue.500" : "#cbd5e1"}
                  style={{ height: `${Math.round(p * 100)}%` }}
                />
              ))}
            </Flex>
            <Box
              position="absolute"
              top="50%"
              w="10px"
              h="10px"
              borderRadius="full"
              bg="blue.500"
              transform="translate(-50%, -50%)"
              style={{ left: `${Math.round(pct * 100)}%` }}
            />
          </Box>
          {/* Durasi rata kiri + jam rata kanan, sejajar gelombang */}
          {/* Selalu hitam / abu tua karena bubble selalu putih (samain bubble teks) */}
          <Flex justify="space-between" align="center">
            <Text fontSize="xs" color="black" fontWeight="medium" textAlign="left">
              {playingNow && elapsedNow > 0.3
                ? `${formatVoiceDuration(elapsedNow)} / ${formatVoiceDuration(total)}`
                : formatVoiceDuration(total)}
            </Text>
            <Text fontSize="11px" color="#64748b">
              {formatChannelHM(createdAt)}
            </Text>
          </Flex>
        </VStack>
        {/* Mic biru ditempel di kiri avatar + PP avatar dibesarkan */}
        {/* Bubble selalu putih -> avatar default dibikin buletan abu + icon hitam
            biar kelihatan (tanpa invert dark-mode). Avatar custom tetap apa adanya. */}
        <Box position="relative" flexShrink={0} display="flex" alignItems="center" pl="8px">
          <Box position="absolute" left={0} bottom={0} color="blue.500" zIndex={1} display="flex">
            <Mic size={16} />
          </Box>
          <Box w="44px" h="44px" borderRadius="full" overflow="hidden" bg={!avatarUrl ? "#e2e8f0" : "var(--app-subtle)"} border="1px solid" borderColor={!avatarUrl ? "#cbd5e1" : "var(--app-border)"} flexShrink={0}>
            <img src={channelAvatar(avatarUrl)} alt={avatarName} className={undefined} style={{ width: "100%", height: "100%", objectFit: "cover", filter: !avatarUrl ? "brightness(0)" : undefined }} />
          </Box>
        </Box>
      </Flex>

      {bubbleMenu}
      {/* Preview (belum Join): sembunyikan badge + popup Reaksi */}
      {!isPreview && (
        <>
          <ReactionBadge reactions={list} total={reactionTotal} onOpen={() => setShowDetail(true)} />
          <AnimatePresence>
            {showDetail && (
              <ReactionsDetail
                total={reactionTotal}
                reactions={list}
                myEmoji={myEmoji}
                onClose={() => setShowDetail(false)}
              />
            )}
          </AnimatePresence>
        </>
      )}
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
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqArrRef = useRef<any>(null);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef("");
  const doneRef = useRef(false);
  // Preview hasil rekaman saat jeda: play kiri = menyetel sampai titik pause,
  // mic merah = melanjutkan rekaman. Bukan sebaliknya.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewChunksLenRef = useRef(0);
  const [resuming, setResuming] = useState(false);

  const stopPreview = () => {
    try {
      previewAudioRef.current?.pause();
    } catch {}
    setPreviewPlaying(false);
  };

  const revokePreview = () => {
    stopPreview();
    const url = previewUrlRef.current;
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    previewUrlRef.current = null;
    previewChunksLenRef.current = 0;
    setPreviewUrl(null);
  };

  // Matikan total izin mic ala story.stopStream(): track.stop + tutup analyser.
  // Dipakai saat jeda (pause) biar indikator Google mati.
  const killMicTracks = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    } catch {}
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      if (audioCtxRef.current?.state !== "closed") void audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    freqArrRef.current = null;
  };
  const stopTracks = () => {
    try {
      previewAudioRef.current?.pause();
    } catch {}
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    try {
      if (audioCtxRef.current?.state !== "closed") void audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    freqArrRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Matikan mic + gelombang ala story (ketika sudah ada hasil rekaman).
  // Pause = track dimatikan dulu biar preview bisa disetel jelas,
  // tidak bentrok sama mic yang masih nyala.
  const setMicEnabled = (enabled: boolean) => {
    try {
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
      streamRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    } catch {}
  };

  const stopLevelsLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      void audioCtxRef.current?.suspend();
    } catch {}
  };

  const startLevelsLoop = () => {
    const actx = audioCtxRef.current;
    const an = analyserRef.current;
    const arr = freqArrRef.current;
    if (!actx || !an || !arr) return;
    try {
      void actx.resume();
    } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const loop = () => {
      try {
        an.getByteFrequencyData(arr);
        const out: number[] = [];
        for (let i = 0; i < 32; i++) {
          const v = arr[Math.floor((i / 32) * arr.length)] / 255;
          out.push(Math.max(0.12, Math.min(1, v * 1.4)));
        }
        setLevels(out);
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  // Bersihkan URL preview saat komponen dilepas.
  useEffect(
    () => () => {
      const url = previewUrlRef.current;
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      try {
        previewAudioRef.current?.pause();
      } catch {}
    },
    [],
  );

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
          analyserRef.current = an;
          freqArrRef.current = arr;
          startLevelsLoop();
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
    revokePreview();
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
      const rec = recRef.current;
      if (rec?.state === "recording") {
        accRef.current += (Date.now() - startRef.current) / 1000;
        setElapsed(Math.floor(accRef.current));
        try {
          rec.requestData();
        } catch {}
        try {
          rec.pause();
        } catch {}
        // Masuk jeda: matikan TOTAL izin mic ala story.stopStream()
        // (indikator Google mati), gelombang berhenti. Preview bisa disetel.
        stopPreview();
        killMicTracks();
        setPhase("paused");
      }
    } catch {}
  };

  const resumeRec = async () => {
    if (resuming) return;
    try {
      const rec = recRef.current;
      if (rec && rec.state === "paused") {
        try {
          rec.ondataavailable = null;
        } catch {}
        try {
          rec.stop();
        } catch {}
        recRef.current = null;
      } else if (rec && rec.state === "recording") {
        return;
      }
      // Lanjutkan VN via mic merah: ambil izin mic baru (indikator nyala lagi).
      revokePreview();
      setResuming(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        Swal.fire({ icon: "error", title: "Izin mic ditolak", text: "Aktifkan izin mikrofon dulu ya.", timer: 2200, showConfirmButton: false });
        setResuming(false);
        return;
      }
      if (doneRef.current) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        setResuming(false);
        return;
      }
      streamRef.current = stream;
      if (!mimeRef.current) mimeRef.current = pickMime();
      const next = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
      next.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recRef.current = next;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new Ctx();
        try {
          await actx.resume();
        } catch {}
        audioCtxRef.current = actx;
        const src = actx.createMediaStreamSource(stream);
        const an = actx.createAnalyser();
        an.fftSize = 64;
        src.connect(an);
        const arr = new Uint8Array(an.frequencyBinCount);
        analyserRef.current = an;
        freqArrRef.current = arr;
        startLevelsLoop();
      } catch {}
      next.start(250);
      startRef.current = Date.now();
      setPhase("recording");
      setResuming(false);
    } catch {
      setResuming(false);
    }
  };

  // Play kiri saat jeda = menyetel hasil rekaman sampai titik pause (preview).
  // Bukan melanjutkan rekaman. Melanjutkan hanya via buletan merah mic.
  const togglePreview = () => {
    try {
      const audio = previewAudioRef.current;
      if (!audio) return;
      if (previewPlaying) {
        audio.pause();
        setPreviewPlaying(false);
        return;
      }
      if (chunksRef.current.length === 0) {
        Swal.fire({ icon: "warning", title: "Belum ada suara", text: "Rekam dulu sebentar ya.", timer: 1500, showConfirmButton: false });
        return;
      }
      const curLen = chunksRef.current.length;
      if (previewUrl && previewChunksLenRef.current === curLen) {
        audio.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
        return;
      }
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {}
      }
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      previewChunksLenRef.current = curLen;
      setPreviewUrl(url);
      setTimeout(() => {
        const a = previewAudioRef.current;
        if (a) {
          try {
            (a as HTMLAudioElement).src = url;
          } catch {}
          a.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
        }
      }, 30);
    } catch {}
  };

  const discard = () => {
    doneRef.current = true;
    revokePreview();
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
      {/* Audio tersembunyi buat menyetel hasil sampai titik pause */}
      <audio
        ref={previewAudioRef}
        src={previewUrl ?? undefined}
        preload="metadata"
        onEnded={() => setPreviewPlaying(false)}
        onPause={() => setPreviewPlaying(false)}
      />
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
          aria-label={previewPlaying ? "Jeda putar hasil" : "Putar hasil rekaman"}
          title={previewPlaying ? "Jeda putar" : "Setel hasil sampai pause"}
          variant="ghost"
          size="sm"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)" }}
          onClick={togglePreview}
          flexShrink={0}
        >
          {previewPlaying ? <Pause size={18} /> : <Play size={18} />}
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
          title="Nyalakan mic lagi & lanjutkan"
          w="36px"
          h="36px"
          borderRadius="full"
          bg="red.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor={resuming ? "wait" : "pointer"}
          flexShrink={0}
          opacity={resuming ? 0.6 : 1}
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
  isPreview = false,
  isFollowing = false,
  unreadCount = 0,
  firstUnreadId = null,
  onRead,
  onSendText,
  onSendVoice,
  sendingVoice = false,
  onUnfollow,
  onJoin,
  joining = false,
  onUpdateChannel,
  conversations = [],
  onForwardToDM,
}: ChannelChatViewProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const reactMutation = useReactChannelMessage(channel.id);
  const handleReact = (messageId: string, emoji: string) => {
    if (isPreview || reactMutation.isPending) return;
    reactMutation.mutate({ messageId, emoji });
  };

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

  if (showInfo) {
    return (
      <ChannelInfoView
        channel={{
          id: channel.id,
          name: channel.name,
          description: channel.description,
          avatarUrl: channel.avatarUrl,
          ownerId: channel.ownerId,
          followerCount: channel.followerCount,
          createdAt: channel.createdAt ?? new Date().toISOString(),
        }}
        isOwner={isOwner}
        isFollowing={isFollowing || isOwner || !isPreview}
        isPreview={isPreview}
        joining={joining}
        onBack={() => setShowInfo(false)}
        onFollow={() => onJoin?.()}
        onUnfollow={() => {
          setShowInfo(false);
          onUnfollow();
        }}
        onUpdateChannel={(patch) => onUpdateChannel?.(patch)}
        conversations={conversations}
        onForwardToDM={(cid) => onForwardToDM?.(cid)}
      />
    );
  }

  return (
    <Flex flex={1} direction="column" h="full" minH={0} position="relative" bg="var(--app-card)">
      {/* Header: pencet nama/avatar -> Info saluran */}
      <Flex p={4} bg="var(--app-card)" borderBottom="1px solid" borderColor="var(--app-hover)" justify="space-between" align="center" shadow="sm" position="relative" zIndex={10}>
        <HStack gap={3} cursor="pointer" onClick={() => setShowInfo(true)} title={`Info saluran ${channel.name}`}>
          <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
            <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} className={channel.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <HStack gap={2} align="center">
          {/* Cara Follow #1: kotak radius biru tulisan putih di header,
              sebelah kiri icon titik-tiga (mode preview / liat-liat). */}
          {isPreview && !isOwner && (
            <Button
              size="sm"
              borderRadius="full"
              bg="blue.600"
              color="white"
              fontWeight="bold"
              px={5}
              _hover={{ bg: "blue.700" }}
              loading={joining}
              onClick={() => onJoin?.()}
            >
              Follow
            </Button>
          )}
          <Box position="relative">
            <IconButton aria-label="Menu saluran" variant="ghost" size="sm" borderRadius="full" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={() => setMenuOpen((v) => !v)}>
              <EllipsisVertical size={20} />
            </IconButton>
            {menuOpen && <Box position="fixed" inset={0} zIndex={20} onClick={() => setMenuOpen(false)} />}
            <AnimatePresence>
              {menuOpen && (
                <MotionBox initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18, ease: "easeOut" }} position="absolute" top="calc(100% + 4px)" right={0} bg="var(--app-card)" borderRadius="xl" shadow="lg" border="1px solid" borderColor="var(--app-border)" minW="190px" py={2} zIndex={30}>
                  {isPreview && !isOwner ? (
                    <Box px={4} py={2} maxW="240px">
                      <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" mb={1}>
                        {channel.name}
                      </Text>
                      {!!channel.description && (
                        <Text fontSize="xs" color="var(--app-muted)" lineClamp={4}>
                          {channel.description}
                        </Text>
                      )}
                      <Text fontSize="xs" color="var(--app-muted)" mt={2}>
                        Follow dulu untuk opsi lainnya.
                      </Text>
                    </Box>
                  ) : (
                    <Flex px={4} py={2.5} gap={3} align="center" justify="start" cursor="pointer" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s" onClick={() => { setMenuOpen(false); setConfirmUnfollow(true); }}>
                      <Box display="flex" alignItems="center"><LogOut size={16} /></Box>
                      <Text fontSize="sm" fontWeight="medium">{isOwner ? "Hapus saluran" : "Berhenti mengikuti"}</Text>
                    </Flex>
                  )}
                </MotionBox>
              )}
            </AnimatePresence>
          </Box>
        </HStack>
      </Flex>

      {/* Isi chat: bubble di tengah, tanpa avatar/nama */}
      <VStack ref={scrollRef} onScroll={handleScroll} flex={1} overflowY="auto" px={6} py={6} gap={4} align="stretch" css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
        <Box mx="auto" w="full" maxW="300px" bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="2xl" shadow="sm" px={5} py={5}>
          <VStack gap={2} align="center" textAlign="center">
            <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)">
              <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} className={channel.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </Box>
            <Text fontWeight="black" color="var(--app-text)" fontSize="md">
              Selamat datang di saluran {channel.name}!
            </Text>
            <Text fontSize="xs" color="var(--app-muted)" maxW="240px">
              Hanya pembuat saluran yang dapat mengirim pesan.
            </Text>
            {isPreview && !isOwner && (
              <Button
                size="sm"
                borderRadius="full"
                bg="blue.600"
                color="white"
                fontWeight="bold"
                px={6}
                mt={1}
                _hover={{ bg: "blue.700" }}
                loading={joining}
                onClick={() => onJoin?.()}
              >
                Follow
              </Button>
            )}
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
              <Flex justify="center" id={`chmsg-${m.id}`} pb={!isPreview && (m.totalReactions ?? 0) > 0 ? 3 : 0}>
                {m.kind === "voice" && m.audioUrl ? (
                  <VoiceBubble
                    id={m.id}
                    url={m.audioUrl}
                    duration={m.duration ?? 0}
                    avatarUrl={channel.avatarUrl}
                    avatarName={channel.name}
                    createdAt={m.createdAt}
                    sourceKey={`channel:${channel.id}`}
                    withMenu={!isOwner && !isPreview}
                    linkText={m.text}
                    reactions={m.reactions}
                    totalReactions={m.totalReactions}
                    myEmoji={m.myEmoji}
                    onReact={(emoji) => handleReact(m.id, emoji)}
                    isPreview={isPreview}
                  />
                ) : (
                  <TextBubble
                    text={m.text ?? ""}
                    createdAt={m.createdAt}
                    withMenu={!isOwner && !isPreview}
                    reactions={m.reactions}
                    totalReactions={m.totalReactions}
                    myEmoji={m.myEmoji}
                    onReact={(emoji) => handleReact(m.id, emoji)}
                    isPreview={isPreview}
                  />
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
      ) : isPreview ? (
        <Box p={4} flexShrink={0} bg="transparent">
          <HStack bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="full" px={3} py={2} gap={2}>
            <Text fontSize="xs" color="var(--app-muted)" flex={1} textAlign="center" lineClamp={1}>
              Liat-liat dulu, Follow kalau cocok.
            </Text>
            <Button
              size="sm"
              borderRadius="full"
              bg="blue.600"
              color="white"
              fontWeight="bold"
              px={5}
              flexShrink={0}
              _hover={{ bg: "blue.700" }}
              loading={joining}
              onClick={() => onJoin?.()}
            >
              Follow
            </Button>
          </HStack>
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

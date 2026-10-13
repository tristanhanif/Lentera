/* eslint-disable @next/next/no-img-element */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  Grid,
  HStack,
  IconButton,
  Input,
  Portal,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lock,
  Eye,
  Heart,
  Send,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Music,
} from "lucide-react";
import { StoryGroup } from "./story.interface";
import {
  useCommentStory,
  useStoryViewers,
  useToggleStoryLike,
  useViewStory,
} from "./story.service";
import { formatTimeLeft } from "./StoryBar";
import { KaraokeLyrics } from "@/app/story/components/KaraokeLyrics";

// Lentera Story: semua jenis hanya 15 detik (foto, video, musik).
const PHOTO_DURATION_SEC = 15;
const MUSIC_MAX_SEC = 15;

const formatViewedAt = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

interface StoryViewerProps {
  groups: StoryGroup[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function StoryViewer({
  groups,
  index,
  onClose,
  onIndexChange,
}: StoryViewerProps) {
  const group = groups[index];
  const [itemIdx, setItemIdx] = useState(0);
  const [pendingItemIdx, setPendingItemIdx] = useState<number | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoDuration, setVideoDuration] = useState(15);
  const [heartBurst, setHeartBurst] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [manualPaused, setManualPaused] = useState(false);
  const [commentFocused, setCommentFocused] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const { mutate: markViewed } = useViewStory();
  const { mutate: toggleLike, isPending: likePending } = useToggleStoryLike();
  const { mutate: sendComment, isPending: commentPending } =
    useCommentStory();

  const item = group?.items[itemIdx];
  const itemId = item?.id ?? "";
  const itemLocked = item?.isLocked ?? true;
  // Jeda bila: tombol pause, fokus nulis komentar, atau sheet penonton terbuka.
  const paused = manualPaused || commentFocused || viewersOpen;
  const viewersEnabled = viewersOpen && !!item?.isMine && !!itemId;
  const { data: viewersData, isLoading: viewersLoading } = useStoryViewers(
    itemId,
    viewersEnabled,
  );

  // Reset ke item pertama (atau item yang diminta) setiap pindah grup.
  useEffect(() => {
    setItemIdx(pendingItemIdx ?? 0);
    setPendingItemIdx(null);
    setPeeking(false);
    setVideoDuration(15);
    setViewersOpen(false);
    setComment("");
    setManualPaused(false);
    setCommentFocused(false);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset sheet penonton + input komentar + jeda saat pindah item.
  useEffect(() => {
    setViewersOpen(false);
    setComment("");
    setManualPaused(false);
    setCommentFocused(false);
  }, [itemId]);

  // Catat view saat item terbuka (backend yang menentukan boleh/tidaknya).
  useEffect(() => {
    if (!itemId || itemLocked) return;
    markViewed(itemId);
  }, [itemId, itemLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (!group) return;
    if (itemIdx < group.items.length - 1) {
      setItemIdx(itemIdx + 1);
      setPeeking(false);
    } else if (index < groups.length - 1) {
      onIndexChange(index + 1);
    } else {
      onClose();
    }
  }, [group, groups.length, index, itemIdx, onClose, onIndexChange]);

  const goPrev = useCallback(() => {
    if (itemIdx > 0) {
      setItemIdx(itemIdx - 1);
      setPeeking(false);
    } else if (index > 0) {
      setPendingItemIdx(groups[index - 1].items.length - 1);
      onIndexChange(index - 1);
    }
  }, [groups, index, itemIdx, onIndexChange]);

  // Foto maju otomatis saat animasi progress selesai (bisa dijeda).
  // Video maju lewat onEnded + dijeda lewat ref (lihat renderMedia).
  useEffect(() => {
    if (!item || item.type !== "video" || item.isLocked) return;
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [item, paused]);

  // Musik stiker: ikut play/pause + mute bersama story.
  // Lentera Story 15 detik ala IG: mulai dari item.music.start pilihan user,
  // main 15 detik berulang (loop) selama story ditampilkan.
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (!item || item.isLocked || !item.music) {
      audio.pause();
      return;
    }
    const start = Math.max(0, item.music.start ?? 0);
    try {
      audio.currentTime = start;
    } catch {}
    const onTimeUpdate = () => {
      if (audio.currentTime >= start + MUSIC_MAX_SEC) {
        try {
          audio.currentTime = start;
        } catch {}
      }
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    if (paused) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [item, paused, muted]);

  // Navigasi keyboard (diabaikan saat mengetik komentar, kecuali Escape).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (e.key === "Escape") {
        if (typing) (document.activeElement as HTMLElement | null)?.blur();
        onClose();
        return;
      }
      if (typing) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!group || !item) return null;

  const progressDuration =
    item.type === "video" ? Math.max(videoDuration, 1) : PHOTO_DURATION_SEC;

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartBurst({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    });
    setTimeout(() => setHeartBurst(null), 800);
  };

  const handleSendComment = () => {
    const text = comment.trim();
    if (!text || commentPending) return;
    sendComment(
      { id: item.id, content: text },
      {
        onSuccess: () => setComment(""),
      },
    );
  };

  const renderMedia = () => {
    if (item.type === "video") {
      const url = item.medias[0]?.url;
      if (!url) return null;
      return (
        <video
          key={item.id}
          ref={videoRef}
          src={url}
          autoPlay
          playsInline
          muted={muted}
          onEnded={goNext}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setVideoDuration(d);
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      );
    }
    const medias = [...item.medias].sort((a, b) => a.sortOrder - b.sortOrder);
    // Kapsul terkunci: server tidak mengirim media ke non-pemilik, jangan render img rusak.
    if (medias.length === 0) return null;
    if (medias.length <= 1) {
      return (
        <img
          src={medias[0]?.url}
          alt="Story"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      );
    }
    if (medias.length === 2) {
      // Samakan dengan editor /story: 2 kotak = atas-bawah (rows).
      return (
        <Grid templateRows="repeat(2, 1fr)" gap="2px" h="full" bg="var(--app-card)">
          {medias.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt="Story"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 0 }}
            />
          ))}
        </Grid>
      );
    }
    if (medias.length === 3) {
      // Samakan dengan editor /story: baris atas 2 kolom, baris bawah 1 penuh.
      return (
        <Grid templateRows="repeat(2, 1fr)" gap="2px" h="full" bg="var(--app-card)">
          <Grid templateColumns="repeat(2, 1fr)" gap="2px" minH={0}>
            {medias.slice(0, 2).map((m) => (
              <img
                key={m.url}
                src={m.url}
                alt="Story"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 0 }}
              />
            ))}
          </Grid>
          <img
            src={medias[2]?.url}
            alt="Story"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 0 }}
          />
        </Grid>
      );
    }
    return (
      <Grid templateColumns="repeat(2, 1fr)" templateRows="repeat(2, 1fr)" gap={1} h="full">
        {medias.slice(0, 4).map((m) => (
          <img
            key={m.url}
            src={m.url}
            alt="Story"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ))}
      </Grid>
    );
  };

  return (
    <Portal>
      <style>{`
        @keyframes storyProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1) translateY(-20px); opacity: 0; }
        }
        @keyframes lenteraSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.800"
        zIndex={2000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        onClick={onClose}
      >
        {/* Tombol pindah grup */}
        <IconButton
          aria-label="Grup sebelumnya"
          position="absolute"
          left={{ base: 1, md: 6 }}
          colorPalette="white"
          variant="ghost"
          color="white"
          size="lg"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            if (index > 0) {
              setPendingItemIdx(groups[index - 1].items.length - 1);
              onIndexChange(index - 1);
            }
          }}
        >
          <ChevronLeft size={32} />
        </IconButton>

        <Box
          w="full"
          maxW="400px"
          h="85vh"
          bg="var(--app-text)"
          borderRadius="2xl"
          overflow="hidden"
          position="relative"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleClick}
        >
          {/* Progress bar per item */}
          <Flex gap={1} position="absolute" top={2} left={2} right={2} zIndex={20}>
            {group.items.map((s, i) => (
              <Box
                key={s.id}
                flex={1}
                h="3px"
                bg="whiteAlpha.400"
                borderRadius="full"
                overflow="hidden"
                cursor="pointer"
                onClick={() => {
                  setItemIdx(i);
                  setPeeking(false);
                }}
              >
                <Box
                  key={`${s.id}-${i === itemIdx ? itemIdx : "idle"}-${s.isLocked}`}
                  h="full"
                  bg="var(--app-card)"
                  borderRadius="full"
                  w={i < itemIdx ? "100%" : undefined}
                  css={
                    i === itemIdx && !s.isLocked
                      ? {
                          animation: `storyProgress ${progressDuration}s linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : undefined
                  }
                  onAnimationEnd={() => {
                    if (i === itemIdx && !s.isLocked && s.type === "photo") {
                      goNext();
                    }
                  }}
                />
              </Box>
            ))}
          </Flex>

          {/* Header */}
          <HStack
            position="absolute"
            top={6}
            left={3}
            right={3}
            zIndex={20}
            justify="space-between"
          >
            <HStack gap={2}>
              <Box w="36px" h="36px" borderRadius="full" overflow="hidden" border="2px solid white">
                <img
                  src={group.user.avatar || "/default-avatar.jpg"}
                  alt={group.user.username}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="bold" color="white">
                  {group.user.username}
                </Text>
                <Text fontSize="10px" color="whiteAlpha.800">
                  {item.isLocked
                    ? `Kapsul • ${formatTimeLeft(item.timeLeftSec)}`
                    : `Item ${itemIdx + 1}/${group.items.length}`}
                </Text>
              </VStack>
            </HStack>
            <HStack gap={1}>
              <IconButton
                aria-label={paused ? "Putar story" : "Jeda story"}
                variant="ghost"
                color="white"
                size="sm"
                onClick={() => setManualPaused((v) => !v)}
              >
                {paused ? <Play size={18} /> : <Pause size={18} />}
              </IconButton>
              {(item.type === "video" || item.music) && !item.isLocked && (
                <IconButton
                  aria-label={muted ? "Aktifkan suara" : "Bisukan"}
                  variant="ghost"
                  color="white"
                  size="sm"
                  onClick={() => {
                    if (muted) musicRef.current?.play().catch(() => {});
                    setMuted(!muted);
                  }}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </IconButton>
              )}
              <IconButton
                aria-label="Tutup"
                variant="ghost"
                color="white"
                size="sm"
                onClick={onClose}
              >
                <X size={20} />
              </IconButton>
            </HStack>
          </HStack>

          {/* Stiker musik: none = chip kecil, lyrics = baris lirik, vinyl = piringan berputar */}
          {item.music && !item.isLocked && (item.music.mode ?? "none") === "none" && (
            <HStack
              position="absolute"
              top="78px"
              left={3}
              zIndex={20}
              gap={2}
              bg="blackAlpha.600"
              border="1px solid"
              borderColor="whiteAlpha.400"
              borderRadius="full"
              pl={1}
              pr={3}
              py={1}
              maxW="70%"
            >
              {item.music.cover ? (
                <img
                  src={item.music.cover}
                  alt={item.music.title}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Music size={14} color="white" />
              )}
              <Text fontSize="10px" fontWeight="bold" color="white" truncate>
                {item.music.title} • {item.music.artist}
              </Text>
            </HStack>
          )}
          {item.music && !item.isLocked && item.music.mode === "lyrics" && (
            <Box
              position="absolute"
              zIndex={20}
              textAlign="center"
              pointerEvents="none"
              style={{
                left: `${item.music.x ?? 50}%`,
                top: `${item.music.y ?? 32}%`,
                transform: `translate(-50%, -50%) scale(${item.music.scale ?? 1})`,
              }}
            >
              <KaraokeLyrics
                lines={(item.music.lyrics ?? "").split("\n").filter(Boolean)}
                windowSec={MUSIC_MAX_SEC}
                playing={!paused}
                resetKey={item.id}
                maxW="240px"
                title={item.music.title}
                artist={item.music.artist}
              />
            </Box>
          )}
          {item.music && !item.isLocked && item.music.mode === "vinyl" && (
            <Box
              position="absolute"
              zIndex={20}
              textAlign="center"
              pointerEvents="none"
              style={{
                left: `${item.music.x ?? 80}%`,
                top: `${item.music.y ?? 72}%`,
                transform: `translate(-50%, -50%) scale(${item.music.scale ?? 1})`,
              }}
            >
              <Box
                w="76px"
                h="76px"
                borderRadius="full"
                bg="var(--app-secondary)"
                border="4px solid"
                borderColor="whiteAlpha.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
                style={{ animation: "lenteraSpin 6s linear infinite" }}
              >
                {item.music.cover ? (
                  <img
                    src={item.music.cover}
                    alt={item.music.title}
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <Music size={18} color="white" />
                )}
              </Box>
              <Text fontSize="9px" fontWeight="bold" color="white" mt={1} textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="110px" truncate>
                {item.music.title}
              </Text>
              <Text fontSize="8px" color="whiteAlpha.800" textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="110px" truncate>
                {item.music.artist}
              </Text>
            </Box>
          )}

          {/* Body media */}
          <Box
            position="absolute"
            inset={0}
            style={
              item.isLocked
                ? {
                    filter: peeking ? "blur(2px) brightness(0.9)" : "blur(20px) brightness(0.7)",
                    transition: "filter 0.25s ease",
                  }
                : undefined
            }
          >
            {renderMedia()}
            {item.music && !item.isLocked && (
              <audio key={item.id} ref={musicRef} src={item.music.url} preload="auto" />
            )}
          </Box>

          {/* Overlay terkunci */}
          {item.isLocked && (
            <Flex
              position="absolute"
              inset={0}
              zIndex={10}
              direction="column"
              align="center"
              justify="center"
              gap={3}
              p={6}
              textAlign="center"
              onMouseDown={() => setPeeking(true)}
              onMouseUp={() => setPeeking(false)}
              onMouseLeave={() => setPeeking(false)}
              onTouchStart={() => setPeeking(true)}
              onTouchEnd={() => setPeeking(false)}
              cursor="pointer"
              userSelect="none"
            >
              <Box bg="whiteAlpha.200" borderRadius="full" p={4}>
                <Lock size={32} color="white" />
              </Box>
              <Text fontSize="sm" fontWeight="bold" color="white">
                Kapsul Lentera Terkunci
              </Text>
              <Text
                fontSize="2xl"
                fontWeight="black"
                css={{
                  background:
                    "linear-gradient(90deg, #fdba74, #fde68a, #fdba74)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  animation: "shimmer 2.5s linear infinite",
                }}
              >
                {formatTimeLeft(item.timeLeftSec)}
              </Text>
              <Text fontSize="xs" color="whiteAlpha.800">
                Tahan untuk mengintip sekilas
              </Text>
            </Flex>
          )}

          {/* Tombol prev/next item */}
          {!item.isLocked && group.items.length > 1 && (
            <>
              <IconButton
                aria-label="Item sebelumnya"
                size="sm"
                position="absolute"
                left={2}
                top="50%"
                transform="translateY(-50%)"
                bg="blackAlpha.500"
                color="white"
                borderRadius="full"
                zIndex={15}
                _hover={{ bg: "blackAlpha.700" }}
                disabled={itemIdx === 0}
                onClick={goPrev}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                aria-label="Item berikutnya"
                size="sm"
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                bg="blackAlpha.500"
                color="white"
                borderRadius="full"
                zIndex={15}
                _hover={{ bg: "blackAlpha.700" }}
                onClick={goNext}
              >
                <ChevronRight size={18} />
              </IconButton>
            </>
          )}

          {/* Animasi hati double-click */}
          {heartBurst && (
            <Box
              key={heartBurst.id}
              position="absolute"
              left={heartBurst.x}
              top={heartBurst.y}
              transform="translate(-50%, -50%)"
              zIndex={30}
              pointerEvents="none"
            >
              <Heart
                size={72}
                color="red"
                fill="red"
                style={{
                  animation: "heartPop 0.8s ease forwards",
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                }}
              />
            </Box>
          )}

          {/* Footer caption + view + like + komentar */}
          <Box position="absolute" bottom={0} left={0} right={0} zIndex={20} p={4} pt={8} bgGradient="linear(to-t, blackAlpha.800, transparent)">
            {item.caption && !item.isLocked && (
              <Text fontSize="sm" color="white" mb={2} lineClamp={3}>
                <Text as="span" fontWeight="bold">
                  {group.user.username}
                </Text>{" "}
                {item.caption}
              </Text>
            )}
            <Flex align="center" justify="space-between" gap={2}>
              {item.isMine ? (
                <HStack
                  as="button"
                  gap={1}
                  color="whiteAlpha.800"
                  cursor="pointer"
                  onClick={() => setViewersOpen(true)}
                  aria-label="Lihat penonton"
                >
                  <Eye size={14} />
                  <Text fontSize="xs">
                    {item.viewCount} dilihat
                    {item.isViewedByMe ? " • Sudah dilihat" : ""}
                  </Text>
                  <ChevronUp size={14} />
                </HStack>
              ) : (
                <HStack gap={1} color="whiteAlpha.800">
                  <Eye size={14} />
                  <Text fontSize="xs">
                    {item.viewCount} dilihat
                    {item.isViewedByMe ? " • Sudah dilihat" : ""}
                  </Text>
                </HStack>
              )}
              <HStack gap={1}>
                {item.totalLikes > 0 && (
                  <Text fontSize="xs" color="whiteAlpha.800">
                    {item.totalLikes}
                  </Text>
                )}
                <IconButton
                  aria-label="Suka"
                  size="sm"
                  variant="ghost"
                  color={item.isLikedByMe ? "red.500" : "white"}
                  disabled={likePending}
                  onClick={() => {
                    if (!item.isLocked) toggleLike(item.id);
                  }}
                >
                  <Heart
                    size={18}
                    fill={item.isLikedByMe ? "red" : "none"}
                    color={item.isLikedByMe ? "red" : "white"}
                  />
                </IconButton>
              </HStack>
            </Flex>
            {!item.isMine && !item.isLocked && (
              <HStack mt={2} gap={2}>
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={() => setCommentFocused(true)}
                  onBlur={() => setCommentFocused(false)}
                  placeholder="Komentari story... (masuk ke chat)"
                  maxLength={500}
                  bg="whiteAlpha.900"
                  color="var(--app-text)"
                  size="sm"
                  borderRadius="full"
                  disabled={commentPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSendComment();
                  }}
                />
                <IconButton
                  aria-label="Kirim komentar"
                  size="sm"
                  borderRadius="full"
                  colorPalette="orange"
                  disabled={!comment.trim() || commentPending}
                  onClick={handleSendComment}
                >
                  <Send size={16} />
                </IconButton>
              </HStack>
            )}
          </Box>

          {/* Bottom sheet penonton (hanya pemilik) */}
          {viewersOpen && item.isMine && (
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              maxH="60%"
              bg="var(--app-card)"
              borderTopRadius="2xl"
              zIndex={25}
              display="flex"
              flexDirection="column"
              overflow="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <HStack
                justify="space-between"
                p={3}
                borderBottomWidth="1px"
                borderColor="var(--app-border)"
              >
                <Text fontSize="sm" fontWeight="bold" color="var(--app-secondary)">
                  Penonton
                  {viewersData?.data ? ` (${viewersData.data.length})` : ""}
                </Text>
                <IconButton
                  aria-label="Tutup penonton"
                  size="xs"
                  variant="ghost"
                  onClick={() => setViewersOpen(false)}
                >
                  <X size={16} />
                </IconButton>
              </HStack>
              <Box overflowY="auto" p={3}>
                {viewersLoading ? (
                  <Flex justify="center" py={6}>
                    <Spinner size="md" />
                  </Flex>
                ) : !viewersData?.data || viewersData.data.length === 0 ? (
                  <Text
                    fontSize="sm"
                    color="var(--app-muted)"
                    textAlign="center"
                    py={4}
                  >
                    Belum ada yang melihat
                  </Text>
                ) : (
                  <VStack align="stretch" gap={3}>
                    {viewersData.data.map((v) => (
                      <HStack key={v.user.id} gap={3}>
                        <Box
                          position="relative"
                          w="36px"
                          h="36px"
                          flexShrink={0}
                        >
                          <img
                            src={v.user.avatar || "/default-avatar.jpg"}
                            alt={v.user.username}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "9999px",
                            }}
                          />
                          {v.liked && (
                            <Box
                              position="absolute"
                              top="-2px"
                              right="-2px"
                              bg="var(--app-card)"
                              borderRadius="full"
                              p="1px"
                            >
                              <Heart size={12} color="red" fill="red" />
                            </Box>
                          )}
                        </Box>
                        <VStack align="start" gap={0} flex={1}>
                          <Text
                            fontSize="sm"
                            fontWeight="bold"
                            color="var(--app-secondary)"
                          >
                            {v.user.username}
                          </Text>
                          <Text fontSize="xs" color="var(--app-muted)">
                            {v.user.name}
                          </Text>
                        </VStack>
                        <Text fontSize="10px" color="var(--app-muted)">
                          {formatViewedAt(v.viewedAt)}
                        </Text>
          </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            </Box>
          )}
        </Box>

        <IconButton
          aria-label="Grup berikutnya"
          position="absolute"
          right={{ base: 1, md: 6 }}
          colorPalette="white"
          variant="ghost"
          color="white"
          size="lg"
          disabled={index >= groups.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            if (index < groups.length - 1) onIndexChange(index + 1);
          }}
        >
          <ChevronRight size={32} />
        </IconButton>
      </Box>
    </Portal>
  );
}

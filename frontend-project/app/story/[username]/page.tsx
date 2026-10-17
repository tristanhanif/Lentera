"use client";

/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Grid,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Lock,
  MoreHorizontal,
  Pause,
  Play,
  SquarePlay,
  Star,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
  Image as ImageIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  useCommentStory,
  useDeleteStory,
  useStories,
  useStoryViewers,
  useToggleStoryLike,
  useViewStory,
} from "@/app/(main)/stories/story.service";
import { groupStoriesByUser } from "@/app/(main)/stories/StoryBar";
import { StoryItem } from "@/app/(main)/stories/story.interface";
import { KaraokeLyrics } from "@/app/story/components/KaraokeLyrics";
import { StoryTextSticker } from "@/app/story/components/StoryTextSticker";
import { MusicPlayingIcon } from "@/app/(main)/messages/NotesBar";

// Lentera Story: story biasa 15 detik, story bagikan postingan video 30 detik.
const STORY_DURATION_SEC = 15;
const POST_VIDEO_DURATION_SEC = 30;

function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function formatTimeAgo(iso: string): string {
  const created = new Date(iso).getTime();
  if (!Number.isFinite(created)) return "";
  const diffMs = Date.now() - created;
  if (diffMs < 0) return "baru saja";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} jam`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day} hari`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} mgg`;
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function formatTimeLeft(timeLeftSec: number): string {
  if (timeLeftSec <= 0) return "Segera";
  if (timeLeftSec < 60) return `${timeLeftSec}d`;
  const minutes = Math.floor(timeLeftSec / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  return `${Math.floor(hours / 24)}h`;
}

// Icon equalizer ala Dolby: pakai MusicPlayingIcon yang sama kayak Catatan
// (putih, joget). Ikut berhenti (freeze) saat story di-pause.
function EqualizerBars({ paused = false }: { paused?: boolean }) {
  return <MusicPlayingIcon color="white" paused={paused} />;
}

function StoryMedia({ item }: { item: StoryItem }) {
  if (item.type === "video") {
    const url = item.medias[0]?.url;
    if (!url) return null;
    return null; // video dirender di parent (butuh ref) — lihat renderVideo()
  }
  const medias = [...item.medias].sort((a, b) => a.sortOrder - b.sortOrder);
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
    // Samakan dengan editor /story: 2 kotak = atas-bawah (rows), bukan kiri-kanan.
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
}

export default function StoryUsernamePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = params?.username;
  const username = useMemo(
    () => decodeURIComponent(Array.isArray(rawUsername) ? rawUsername[0] : (rawUsername ?? "")),
    [rawUsername],
  );

  const { data: storiesData, isLoading, isError } = useStories();
  const stories = useMemo(() => storiesData?.data ?? [], [storiesData]);
  const groups = useMemo(() => groupStoriesByUser(stories), [stories]);
  const group = useMemo(
    () => groups.find((g) => g.user.username.toLowerCase() === username.toLowerCase()),
    [groups, username],
  );

  const [itemIdx, setItemIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [manualPaused, setManualPaused] = useState(false);
  const [comment, setComment] = useState("");
  const [commentFocused, setCommentFocused] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Story bagikan postingan: kotak gambar diketuk 1x -> tampil pil hitam kecil
  // "Lihat Postingan" tepat di posisi kursor. Ketuk gambar lagi -> pil hilang.
  // Pil dipencet -> pindah ke halaman /post/[id].
  const [postLinkPos, setPostLinkPos] = useState<{ x: number; y: number } | null>(null);
  // Rasio kotak ngikutin frame postingan, dideteksi dari gambar.
  const [postAspect, setPostAspect] = useState("4 / 5");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const postVideoRef = useRef<HTMLVideoElement | null>(null);

  const { mutate: markViewed } = useViewStory();
  const { mutate: toggleLike, isPending: likePending } = useToggleStoryLike();
  const { mutate: sendComment, isPending: commentPending } = useCommentStory();
  const { mutate: deleteStory, isPending: deletePending } = useDeleteStory();

  const item = group?.items[itemIdx];
  const itemId = item?.id ?? "";
  const locked = item?.isLocked ?? false;
  // Deteksi story bagikan postingan video: ada post + media video.
  // Durasi khusus 30 detik (dipotong bila lebih panjang), pakai URL asli.
  const itemPost = (
    item as unknown as {
      post?: {
        id: string;
        ownerUsername: string | null;
        mediaCount: number | null;
        scale?: number | null;
      } | null;
    }
  )?.post ?? null;
  const itemMediaUrl = item?.medias?.[0]?.url ?? "";
  const itemMediaType = item?.medias?.[0]?.type ?? null;
  const isPostVideoShare =
    !!itemPost && !locked && (itemMediaType === "video" || isVideoUrl(itemMediaUrl));
  const storyDuration = isPostVideoShare ? POST_VIDEO_DURATION_SEC : STORY_DURATION_SEC;
  // Audio Asli: video share tanpa musik bawaan Lentera (item.music null).
  const isAudioAsli = isPostVideoShare && !item?.music;
  // Jeda bila: tombol pause, fokus nulis balasan, sheet penonton / menu titik tiga terbuka, sedang menghapus,
  // atau kotak "Lihat Postingan" sedang tampil.
  const paused =
    manualPaused ||
    commentFocused ||
    viewersOpen ||
    menuOpen ||
    deletePending ||
    postLinkPos !== null;
  // Daftar penonton hanya relevan untuk pemilik story.
  const viewersEnabled = !!item?.isMine && !!itemId;
  const { data: viewersData, isLoading: viewersLoading } = useStoryViewers(
    itemId,
    viewersEnabled,
  );

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (itemIdx < group.items.length - 1) {
      setItemIdx(itemIdx + 1);
    } else {
      goBack();
    }
  }, [group, itemIdx, goBack]);

  const goPrev = useCallback(() => {
    if (itemIdx > 0) setItemIdx(itemIdx - 1);
  }, [itemIdx]);

  // Reset saat pindah user / pindah item.
  useEffect(() => {
    setItemIdx(0);
    setComment("");
    setManualPaused(false);
    setCommentFocused(false);
    setViewersOpen(false);
    setMenuOpen(false);
  }, [username]);

  useEffect(() => {
    setComment("");
    setManualPaused(false);
    setCommentFocused(false);
    setViewersOpen(false);
    setMenuOpen(false);
    setPostLinkPos(null);
    setPostAspect("4 / 5");
  }, [itemId]);

  // Catat view saat item terbuka.
  useEffect(() => {
    if (!itemId || locked) return;
    markViewed(itemId);
  }, [itemId, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video fullscreen biasa: ikut play/pause + mute. Durasi ikut progress,
  // video di-loop bila lebih pendek. Skip bila ini postingan video share (pakai postVideoRef).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item || item.type !== "video" || locked || isPostVideoShare) return;
    video.muted = muted;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [item, paused, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video dalam kotak postingan share: play/pause ikut story, durasi 30 detik dipotong progress.
  // Bawaan Lentera (item.music ada): video dibisukan, musik terpisah yang bunyi.
  // Audio Asli (item.music null): suara ikut video + tombol mute global.
  useEffect(() => {
    const video = postVideoRef.current;
    if (!video || !isPostVideoShare || locked) return;
    video.muted = item?.music ? true : muted;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [item, paused, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Musik stiker: posisi awal hanya di-set saat ganti item.
  // Play/pause HANYA pause & resume — tidak menyentuh currentTime supaya
  // pencet pause lalu play melanjutkan, bukan mengulang dari awal.
  const musicStartRef = useRef(0);
  useEffect(() => {
    const audio = musicRef.current;
    if (!audio || !item || locked || !item.music) return;
    const start = Math.max(0, item.music.start ?? 0);
    musicStartRef.current = start;
    try {
      audio.currentTime = start;
    } catch {}
  }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (!item || locked || !item.music) {
      audio.pause();
      return;
    }
    const start = musicStartRef.current;
    const onTimeUpdate = () => {
      if (audio.currentTime >= start + storyDuration) {
        try {
          audio.currentTime = start;
        } catch {}
      }
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    if (paused) audio.pause();
    else audio.play().catch(() => {});
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [item, paused, muted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: kanan/kiri pindah, Escape tutup menu/viewers dulu baru kembali.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (e.key === "Escape") {
        if (typing) (document.activeElement as HTMLElement | null)?.blur();
        if (menuOpen) {
          setMenuOpen(false);
          return;
        }
        if (viewersOpen) {
          setViewersOpen(false);
          return;
        }
        goBack();
        return;
      }
      if (typing) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, goBack, menuOpen, viewersOpen]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Pemilik tidak bisa like story sendiri (tidak ada icon love di halamannya).
    if (!item || locked || item.isMine || item.isLikedByMe) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartBurst({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    });
    toggleLike(item.id);
    setTimeout(() => setHeartBurst(null), 800);
  };

  const handleSendComment = () => {
    const text = comment.trim();
    if (!text || commentPending || !item || locked) return;
    sendComment(
      { id: item.id, content: text },
      { onSuccess: () => setComment("") },
    );
  };

  const handleAboutAccount = () => {
    if (!group) return;
    setMenuOpen(false);
    router.push(`/profile/${encodeURIComponent(group.user.username)}`);
  };

  const handleDeleteStory = () => {
    if (!item || !item.isMine || deletePending) return;
    const targetId = item.id;
    setMenuOpen(false);
    Swal.fire({
      title: "Hapus story?",
      text: "Story yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e53e3e",
    }).then((result) => {
      if (!result.isConfirmed) return;
      deleteStory(targetId, {
        onSuccess: () => {
          // Setelah hapus: kalau tinggal 1 item -> keluar, kalau item terakhir -> mundur 1, sisanya tetap (item next geser ke index ini).
          if (!group || group.items.length <= 1) {
            goBack();
          } else if (itemIdx >= group.items.length - 1) {
            setItemIdx(Math.max(0, itemIdx - 1));
            setManualPaused(false);
          } else {
            setManualPaused(false);
          }
        },
      });
    });
  };

  if (isLoading) {
    return (
      <Box minH="100dvh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="lg" color="white" />
      </Box>
    );
  }

  if (isError || !group || !item) {
    return (
      <Box minH="100dvh" bg="black" color="white" display="flex" alignItems="center" justifyContent="center" p={6}>
        <VStack gap={3} textAlign="center">
          <Text fontWeight="bold">Story tidak ditemukan</Text>
          <Text fontSize="sm" color="whiteAlpha.700">
            @{username} belum punya story aktif atau sudah kedaluwarsa.
          </Text>
          <HStack
            as="button"
            onClick={goBack}
            bg="var(--app-card)"
            color="var(--app-text)"
            px={4}
            py={2}
            borderRadius="full"
            fontSize="sm"
            fontWeight="bold"
            cursor="pointer"
          >
            <ChevronLeft size={16} /> Kembali
          </HStack>
        </VStack>
      </Box>
    );
  }

  const music = item.music;
  const musicLabel = music ? `${music.title} - ${music.artist}` : isAudioAsli ? "Audio Asli" : "";
  const showVinyl = !!music && !locked && (music.mode ?? "none") === "vinyl";
  // Hanya Musik (mode none) -> tidak ada overlay apa-apa di badan story,
  // sesuai spek: hanya piringan & lirik yang tampil di tengah.
  const showLyrics = !!music && !locked && music.mode === "lyrics";
  // Penonton untuk sheet pemilik: kecualikan pemilik story sendiri.
  const viewers = (viewersData?.data ?? []).filter((v) => v.user.id !== group.user.id);
  const shownViewCount = viewersData?.data ? viewers.length : item.viewCount;

  return (
    <Box minH="100dvh" bg="black" display="flex" justifyContent="center" position="relative">
      <style>{`
        @keyframes storyProgress { from { width: 0%; } to { width: 100%; } }
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1) translateY(-20px); opacity: 0; }
        }
        @keyframes lenteraSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes eqBounce {
          from { transform: scaleY(0.25); }
          to { transform: scaleY(1); }
        }
      `}</style>

      <Box
        w="full"
        maxW="430px"
        h={{ base: "100dvh", md: "92vh" }}
        position="relative"
        overflow="hidden"
        bg="var(--app-text)"
        borderRadius={{ base: 0, md: "2xl" }}
        my={{ base: 0, md: "4vh" }}
        onDoubleClick={handleDoubleClick}
      >
        {/* ===== Garis progress: trek abu-abu, isi putih (15d biasa / 30d video share) ===== */}
        <Flex gap={1} position="absolute" top={2} left={3} right={3} zIndex={20}>
          {group.items.map((s, i) => {
            const sMediaUrl = s.medias?.[0]?.url ?? "";
            const sMediaType = s.medias?.[0]?.type ?? null;
            const sPost = (s as unknown as { post?: { id: string } | null })?.post ?? null;
            const sIsVideoShare =
              !!sPost && (sMediaType === "video" || isVideoUrl(sMediaUrl));
            const sDuration = sIsVideoShare ? POST_VIDEO_DURATION_SEC : STORY_DURATION_SEC;
            return (
              <Box
                key={s.id}
                flex={1}
                h="3px"
                bg="whiteAlpha.300"
                borderRadius="full"
                overflow="hidden"
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setItemIdx(i);
                }}
              >
                <Box
                  // PENTING: key TIDAK boleh memuat `paused` — kalau key berubah
                  // saat pause, elemen remount dan animasi mengulang dari 0.
                  // Pause murni lewat animationPlayState di bawah.
                  key={`${s.id}-${i === itemIdx ? "active" : "idle"}`}
                  h="full"
                  bg="var(--app-card)"
                  borderRadius="full"
                  w={i < itemIdx ? "100%" : undefined}
                  css={
                    i === itemIdx && !s.isLocked
                      ? {
                          animation: `storyProgress ${i === itemIdx ? storyDuration : sDuration}s linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : undefined
                  }
                  onAnimationEnd={() => {
                    if (i === itemIdx && !s.isLocked) goNext();
                  }}
                />
              </Box>
            );
          })}
        </Flex>

        {/* ===== Header: avatar + username • waktu + lagu | volume + pause + titik tiga (pemilik) ===== */}
        <HStack
          position="absolute"
          top={6}
          left={3}
          right={{ base: 14, md: 3 }}
          zIndex={20}
          justify="space-between"
          align="start"
        >
          <HStack gap={2} align="center" flex={1} minW={0}>
            <Box
              w="38px"
              h="38px"
              borderRadius="full"
              overflow="hidden"
              border="2px solid white"
              flexShrink={0}
              cursor="pointer"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/profile/${encodeURIComponent(group.user.username)}`);
              }}
              title={`Lihat profil ${group.user.username}`}
            >
              <img
                src={group.user.avatar || "/default-avatar.jpg"}
                alt={group.user.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
            <VStack align="start" gap={0} flex={1} minW={0}>
              <HStack gap={1} align="baseline" maxW="full">
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color="white"
                  truncate
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/profile/${encodeURIComponent(group.user.username)}`);
                  }}
                  title={`Lihat profil ${group.user.username}`}
                >
                  {item.isMine ? "Story Kamu" : group.user.username}
                </Text>
                <Text fontSize="xs" color="whiteAlpha.700" flexShrink={0}>
                  • {locked ? `Kapsul • ${formatTimeLeft(item.timeLeftSec)}` : formatTimeAgo(item.createdAt)}
                </Text>
              </HStack>
              {isPostVideoShare && !locked ? (
                <HStack
                  gap={1}
                  maxW="240px"
                  as="button"
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (itemPost?.id)
                      router.push(`/post/${encodeURIComponent(itemPost.id)}`);
                  }}
                  aria-label="Tonton postingan selengkapnya"
                >
                  <SquarePlay size={14} color="white" style={{ flexShrink: 0 }} />
                  <Text fontSize="11px" fontWeight="semibold" color="white" truncate>
                    Tonton postingan selengkapnya
                  </Text>
                  <ChevronRight size={12} color="white" style={{ flexShrink: 0 }} />
                </HStack>
              ) : (
                music &&
                !locked && (
                  <HStack gap={1} maxW="220px">
                    <EqualizerBars paused={paused} />
                    <Text fontSize="11px" fontWeight="semibold" color="white" truncate>
                      {musicLabel}
                    </Text>
                  </HStack>
                )
              )}
            </VStack>
          </HStack>

          <HStack gap={0} flexShrink={0}>
            {/* Tanda close-friend: buletan biru bintang kuning di kiri pause/play */}
            {(item.audience ?? "public") === "close" && (
              <Box
                w="32px"
                h="32px"
                borderRadius="full"
                bg="blue.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                title="Story teman terdekat"
                aria-label="Story teman terdekat"
                flexShrink={0}
              >
                <Star size={16} color="#facc15" fill="#facc15" />
              </Box>
            )}
            {(item.type === "video" || music) && !locked && (
              <IconButton
                aria-label={muted ? "Aktifkan suara" : "Bisukan"}
                variant="ghost"
                color="white"
                size="sm"
                onClick={() => setMuted((v) => !v)}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </IconButton>
            )}
            {!locked && (
              <IconButton
                aria-label={paused ? "Putar story" : "Jeda story"}
                variant="ghost"
                color="white"
                size="sm"
                onClick={() => setManualPaused((v) => !v)}
              >
                {paused ? <Play size={20} /> : <Pause size={20} />}
              </IconButton>
            )}
            {item.isMine && (
              <IconButton
                aria-label="Opsi story"
                variant="ghost"
                color="white"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <MoreHorizontal size={20} />
              </IconButton>
            )}
          </HStack>
        </HStack>

        {/* ===== Menu titik tiga pemilik: Hapus / Tentang Akun / Batal ===== */}
        {menuOpen && item.isMine && (
          <>
            <Box
              position="absolute"
              inset={0}
              zIndex={28}
              bg="transparent"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <VStack
              position="absolute"
              top={16}
              right={{ base: 14, md: 3 }}
              zIndex={29}
              bg="var(--app-card)"
              borderRadius="xl"
              boxShadow="lg"
              overflow="hidden"
              minW="180px"
              align="stretch"
              gap={0}
              onClick={(e) => e.stopPropagation()}
            >
              <HStack
                as="button"
                gap={2}
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="bold"
                color="red.500"
                _hover={{ bg: "var(--app-subtle)" }}
                cursor={deletePending ? "not-allowed" : "pointer"}
                opacity={deletePending ? 0.6 : 1}
                onClick={handleDeleteStory}
              >
                <Trash2 size={16} /> {deletePending ? "Menghapus..." : "Hapus"}
              </HStack>
              <Box h="1px" bg="var(--app-border)" />
              <HStack
                as="button"
                gap={2}
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="semibold"
                color="var(--app-secondary)"
                _hover={{ bg: "var(--app-subtle)" }}
                cursor="pointer"
                onClick={handleAboutAccount}
              >
                <User size={16} /> Tentang Akun
              </HStack>
              <Box h="1px" bg="var(--app-border)" />
              <HStack
                as="button"
                gap={2}
                px={4}
                py={3}
                fontSize="sm"
                color="var(--app-secondary)"
                justify="center"
                _hover={{ bg: "var(--app-subtle)" }}
                cursor="pointer"
                onClick={() => setMenuOpen(false)}
              >
                Batal
              </HStack>
            </VStack>
          </>
        )}

        {/* ===== Badan story ===== */}
        <Box position="absolute" inset={0}>
          {(() => {
            const postShare = (item as unknown as { post?: { id: string; ownerUsername: string | null; mediaCount: number | null; scale?: number | null } | null })?.post ?? null;
            if (postShare && item.medias[0]?.url && !locked) {
              const coverUrl = item.medias[0].url;
              const coverType = item.medias[0]?.type ?? null;
              const isCoverVideo = coverType === "video" || isVideoUrl(coverUrl);
              const multi = (postShare.mediaCount ?? 1) > 1;
              // Ukuran ikut editor (0.5-2x), tetap di tengah.
              const pScale = Math.max(
                0.5,
                Math.min(2, postShare.scale ?? 1),
              );
              const handlePostTap = (e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                if (postLinkPos) {
                  setPostLinkPos(null);
                  return;
                }
                const rect = e.currentTarget.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                const xPct = Math.min(82, Math.max(18, (px / rect.width) * 100));
                const yPct = Math.min(90, Math.max(10, (py / rect.height) * 100));
                setPostLinkPos({ x: xPct, y: yPct });
              };
              const renderPostPil = () =>
                postLinkPos && (
                  <Flex
                    position="absolute"
                    zIndex={5}
                    align="center"
                    gap={0.5}
                    bg="black"
                    color="white"
                    p="9px"
                    borderRadius={0}
                    cursor="pointer"
                    whiteSpace="nowrap"
                    shadow="md"
                    style={{
                      left: `${postLinkPos.x}%`,
                      top: `${postLinkPos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/post/${encodeURIComponent(postShare.id)}`);
                    }}
                  >
                    <Text fontSize="10px" fontWeight="normal" lineHeight="1">
                      Lihat Postingan
                    </Text>
                    <ChevronRight size={10} color="white" />
                    <Box
                      position="absolute"
                      top="100%"
                      left="50%"
                      transform="translateX(-50%)"
                      w={0}
                      h={0}
                      borderLeft="6px solid transparent"
                      borderRight="6px solid transparent"
                      borderTop="6px solid black"
                      pointerEvents="none"
                    />
                  </Flex>
                );
              if (isCoverVideo) {
                return (
                  <Box position="absolute" inset={0}>
                    <video
                      src={coverUrl}
                      muted
                      loop
                      autoPlay
                      playsInline
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "blur(24px) brightness(0.6)",
                        transform: "scale(1.2)",
                      }}
                    />
                    <Box position="absolute" inset={0} bg="blackAlpha.400" />
                    <Flex position="absolute" inset={0} align="center" justify="center" px={8}>
                      <Box w="full" maxW="200px" style={{ transform: `scale(${pScale})` }}>
                        <Box
                          position="relative"
                          w="full"
                          borderRadius="2xl"
                          overflow="hidden"
                          shadow="2xl"
                          border="1px solid"
                          borderColor="whiteAlpha.300"
                          style={{ aspectRatio: postAspect }}
                          bg="var(--app-secondary)"
                          cursor="pointer"
                          onClick={handlePostTap}
                        >
                          <video
                            ref={postVideoRef}
                            src={coverUrl}
                            autoPlay
                            playsInline
                            loop
                            muted={item.music ? true : muted}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onLoadedMetadata={(e) => {
                              const v = e.currentTarget;
                              if (v.videoWidth && v.videoHeight)
                                setPostAspect(`${v.videoWidth} / ${v.videoHeight}`);
                            }}
                          />
                          <Text
                            position="absolute"
                            left={2}
                            top={2}
                            fontSize="xs"
                            fontWeight="bold"
                            color="white"
                            maxW="70%"
                            truncate
                            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                          >
                            @{postShare.ownerUsername ?? group.user.username}
                          </Text>
                          {renderPostPil()}
                        </Box>
                      </Box>
                    </Flex>
                  </Box>
                );
              }
              return (
                <Box position="absolute" inset={0}>
                  {/* Background: gambar dilebarkan + blur */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt=""
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "blur(24px) brightness(0.6)",
                      transform: "scale(1.2)",
                    }}
                  />
                  <Box position="absolute" inset={0} bg="blackAlpha.400" />
                  {/* Tengah: kotak gambar postingan (kecil, sama kayak editor) */}
                  <Flex
                    position="absolute"
                    inset={0}
                    align="center"
                    justify="center"
                    px={8}
                  >
                    <Box
                      w="full"
                      maxW="200px"
                      style={{ transform: `scale(${pScale})` }}
                    >
                    <Box
                      position="relative"
                      w="full"
                      borderRadius="2xl"
                      overflow="hidden"
                      shadow="2xl"
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                      style={{ aspectRatio: postAspect }}
                      bg="var(--app-secondary)"
                      cursor="pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Ketuk 1x: kalau pil sudah muncul -> sembunyikan,
                        // kalau belum -> munculkan tepat di posisi kursor.
                        if (postLinkPos) {
                          setPostLinkPos(null);
                          return;
                        }
                        const rect = e.currentTarget.getBoundingClientRect();
                        const px = e.clientX - rect.left;
                        const py = e.clientY - rect.top;
                        const xPct = Math.min(
                          82,
                          Math.max(18, (px / rect.width) * 100),
                        );
                        const yPct = Math.min(
                          90,
                          Math.max(10, (py / rect.height) * 100),
                        );
                        setPostLinkPos({ x: xPct, y: yPct });
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt="Postingan yang dibagikan"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const w = img.naturalWidth;
                          const h = img.naturalHeight;
                          if (w && h) setPostAspect(`${w} / ${h}`);
                        }}
                      />
                      {/* Kanan atas: bertumpuk kalau >1 slide, galeri kalau 1 */}
                      <Box
                        position="absolute"
                        right={2}
                        top={2}
                        color="white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))" }}
                      >
                        {multi ? <Copy size={18} /> : <ImageIcon size={18} />}
                      </Box>
                      {/* Kotak hitam kecil di posisi ketuk, tanpa radius */}
                      {postLinkPos && (
                        <Flex
                          position="absolute"
                          zIndex={5}
                          align="center"
                          gap={0.5}
                          bg="black"
                          color="white"
                          p="9px"
                          borderRadius={0}
                          cursor="pointer"
                          whiteSpace="nowrap"
                          shadow="md"
                          style={{
                            left: `${postLinkPos.x}%`,
                            top: `${postLinkPos.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/post/${encodeURIComponent(postShare.id)}`);
                          }}
                        >
                          <Text fontSize="10px" fontWeight="normal" lineHeight="1">
                            Lihat Postingan
                          </Text>
                          <ChevronRight size={10} color="white" />
                          {/* Ekor segitiga tengah bawah menyatu, ala kotak pesan */}
                          <Box
                            position="absolute"
                            top="100%"
                            left="50%"
                            transform="translateX(-50%)"
                            w={0}
                            h={0}
                            borderLeft="6px solid transparent"
                            borderRight="6px solid transparent"
                            borderTop="6px solid black"
                            pointerEvents="none"
                          />
                        </Flex>
                      )}
                    </Box>
                    {/* Bawah kiri kotak: @username (di luar kotak) */}
                    <Text
                      mt={2}
                      textAlign="left"
                      fontSize="xs"
                      fontWeight="bold"
                      color="white"
                      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                    >
                      @{postShare.ownerUsername ?? group.user.username}
                    </Text>
                    </Box>
                  </Flex>
                </Box>
              );
            }
            if (item.type === "video" && item.medias[0]?.url && !locked) {
              return (
                <video
                  key={item.id}
                  ref={videoRef}
                  src={item.medias[0].url}
                  autoPlay
                  playsInline
                  loop
                  muted={muted}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              );
            }
            return <StoryMedia item={item} />;
          })()}
          {music && !locked && (
            <audio key={item.id} ref={musicRef} src={music.url} preload="auto" />
          )}
        </Box>

        {/* Overlay piringan (vinyl): lingkaran + judul + asal lagu */}
        {showVinyl && music && (
          <Box
            position="absolute"
            zIndex={15}
            textAlign="center"
            pointerEvents="none"
            style={{
              left: `${music.x ?? 50}%`,
              top: `${music.y ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${music.scale ?? 1})`,
            }}
          >
            <Box
              w="96px"
              h="96px"
              borderRadius="full"
              bg="var(--app-secondary)"
              border="4px solid"
              borderColor="whiteAlpha.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx="auto"
              style={{
                animation: "lenteraSpin 6s linear infinite",
                animationPlayState: paused ? "paused" : "running",
              }}
            >
              {music.cover ? (
                <img
                  src={music.cover}
                  alt={music.title}
                  style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <MusicPlayingIcon color="white" h="22px" />
              )}
            </Box>
            <Text fontSize="sm" fontWeight="bold" color="white" mt={2} textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="160px" truncate>
              {music.title}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.800" textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="160px" truncate>
              {music.artist}
            </Text>
          </Box>
        )}

        {/* Overlay lirik */}
        {showLyrics && music && (
          <Box
            position="absolute"
            zIndex={15}
            textAlign="center"
            pointerEvents="none"
            style={{
              left: `${music.x ?? 50}%`,
              top: `${music.y ?? 40}%`,
              transform: `translate(-50%, -50%) scale(${music.scale ?? 1})`,
            }}
          >
            <KaraokeLyrics
              lines={(music.lyrics ?? "").split("\n").filter(Boolean)}
              windowSec={storyDuration}
              playing={!paused}
              resetKey={item.id}
              maxW="260px"
              title={music.title}
              artist={music.artist}
            />
          </Box>
        )}

        {/* Overlay stiker teks */}
        {item.text && !locked && (
          <Box
            position="absolute"
            zIndex={15}
            pointerEvents="none"
            style={{
              left: `${item.text.x ?? 50}%`,
              top: `${item.text.y ?? 50}%`,
              transform: `translate(-50%, -50%) scale(${item.text.scale ?? 1})`,
            }}
          >
            <StoryTextSticker
              value={{
                content: item.text.content,
                style: item.text.style,
                bg: item.text.bg,
              }}
              maxW="240px"
              fontSize="md"
            />
          </Box>
        )}

        {/* Overlay kapsul terkunci */}
        {locked && (
          <Flex position="absolute" inset={0} zIndex={10} direction="column" align="center" justify="center" gap={3} p={6} textAlign="center" bg="blackAlpha.400">
            <Box bg="whiteAlpha.200" borderRadius="full" p={4}>
              <Lock size={32} color="white" />
            </Box>
            <Text fontSize="sm" fontWeight="bold" color="white">
              Kapsul Lentera Terkunci
            </Text>
            <Text fontSize="2xl" fontWeight="black" color="orange.200">
              {formatTimeLeft(item.timeLeftSec)}
            </Text>
          </Flex>
        )}

        {/* Zona tap kiri/kanan untuk pindah item */}
        {!locked && group.items.length > 1 && (
          <>
            <Box position="absolute" left={0} top="80px" bottom="110px" width="30%" zIndex={12} onClick={goPrev} cursor="pointer" />
            <Box position="absolute" right={0} top="80px" bottom="110px" width="70%" zIndex={12} onClick={goNext} cursor="pointer" />
          </>
        )}

        {/* Animasi hati double-click */}
        {heartBurst && (
          <Box key={heartBurst.id} position="absolute" left={heartBurst.x} top={heartBurst.y} transform="translate(-50%, -50%)" zIndex={30} pointerEvents="none">
            <Heart size={72} color="red" fill="red" style={{ animation: "heartPop 0.8s ease forwards" }} />
          </Box>
        )}

        {/* ===== Bawah: pemilik = info dilihat | penonton = balas + love ===== */}
        {!locked && (
          <Box position="absolute" bottom={0} left={0} right={0} zIndex={20} p={4} pt={10} bgGradient="linear(to-t, blackAlpha.800, transparent)">
            {item.caption && (
              <Text fontSize="sm" color="white" mb={2} lineClamp={2}>
                <Text as="span" fontWeight="bold">{item.isMine ? "Story Kamu" : group.user.username}</Text> {item.caption}
              </Text>
            )}
            {item.isMine ? (
              <VStack
                as="button"
                gap={1}
                align="start"
                cursor="pointer"
                aria-label="Lihat penonton story"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewersOpen(true);
                }}
              >
                <HStack gap={0}>
                  {viewers.slice(0, 3).map((v, i) => (
                    <Box
                      key={v.user.id}
                      w="28px"
                      h="28px"
                      borderRadius="full"
                      overflow="hidden"
                      border="2px solid white"
                      ml={i === 0 ? 0 : "-10px"}
                    >
                      <img
                        src={v.user.avatar || "/default-avatar.jpg"}
                        alt={v.user.username}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Box>
                  ))}
                </HStack>
                <Text fontSize="xs" color="white">
                  {shownViewCount} kali dilihat
                </Text>
              </VStack>
            ) : (
              <HStack gap={2} align="center">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onFocus={() => setCommentFocused(true)}
                  onBlur={() => setCommentFocused(false)}
                  placeholder={`Balas kepada ${group.user.username}...`}
                  maxLength={500}
                  size="md"
                  borderRadius="full"
                  bg="transparent"
                  border="1px solid"
                  borderColor="whiteAlpha.600"
                  color="white"
                  _placeholder={{ color: "whiteAlpha.800" }}
                  _focus={{ borderColor: "white", bg: "blackAlpha.400", outline: "none" }}
                  disabled={commentPending}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handleSendComment();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <IconButton
                  aria-label="Suka story"
                  variant="ghost"
                  color={item.isLikedByMe ? "red.500" : "white"}
                  size="md"
                  borderRadius="full"
                  disabled={likePending || locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(item.id);
                  }}
                  _hover={{ bg: "whiteAlpha.200" }}
                >
                  <Heart size={26} fill={item.isLikedByMe ? "red" : "none"} color={item.isLikedByMe ? "red" : "white"} />
                </IconButton>
              </HStack>
            )}
          </Box>
        )}

        {/* ===== Sheet penonton (hanya pemilik): putih dari bawah ===== */}
        {viewersOpen && item.isMine && (
          <>
            <Box
              position="absolute"
              inset={0}
              zIndex={24}
              bg="blackAlpha.500"
              onClick={(e) => {
                e.stopPropagation();
                setViewersOpen(false);
              }}
            />
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
              <HStack justify="space-between" p={3} borderBottomWidth="1px" borderColor="var(--app-border)">
                <Text fontSize="sm" fontWeight="bold" color="var(--app-secondary)">
                  Dilihat {viewersData?.data ? `(${viewers.length})` : ""}
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
                ) : viewers.length === 0 ? (
                  <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
                    Belum ada yang melihat
                  </Text>
                ) : (
                  <VStack align="stretch" gap={3}>
                    {viewers.map((v) => (
                      <HStack key={v.user.id} gap={3}>
                        <Box position="relative" w="36px" h="36px" flexShrink={0}>
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
                              bottom="-3px"
                              right="-3px"
                              bg="var(--app-card)"
                              borderRadius="full"
                              p="1px"
                              display="flex"
                            >
                              <Heart size={12} color="red" fill="red" />
                            </Box>
                          )}
                        </Box>
                        <VStack align="start" gap={0} flex={1} minW={0}>
                          <Text fontSize="md" fontWeight="bold" color="var(--app-secondary)" truncate>
                            {v.user.username}
                          </Text>
                          <Text fontSize="xs" color="var(--app-muted)" truncate>
                            {v.user.name}
                          </Text>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* ===== Tombol X di kanan atas, di luar kotak media — keluar dari /story/[username] ===== */}
      <IconButton
        aria-label="Tutup story"
        variant="ghost"
        color="white"
        size="md"
        position="absolute"
        top={{ base: 5, md: 4 }}
        right={{ base: 2, md: 4 }}
        zIndex={30}
        borderRadius="full"
        _hover={{ bg: "whiteAlpha.200" }}
        onClick={goBack}
      >
        <X size={24} />
      </IconButton>
    </Box>
  );
}

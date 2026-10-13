"use client";
import { Box, VStack, HStack, Text, Image, Flex, IconButton, Link, Dialog } from "@chakra-ui/react";
import NextLink from "next/link";
import { Heart, MessageCircle, ChevronLeft, ChevronRight, X, Repeat2, Bookmark, MapPin, Volume2, VolumeX, Copy, Play, SquarePlay, Pause, Send, Images } from "lucide-react";
import { PostResponseSingle } from "./post.interface";
import { useEffect, useMemo, useRef, useState } from "react";
import { PostDetailModal } from "./PostDetailModal";
import { SharePostModal } from "./SharePostModal";
import { useGetLikeStatus, useToggleLike } from "../like/like.service";
import { useGetRepostStatus, useToggleRepost } from "../repost/repost.service";
import { useGetSaveStatus, useToggleSave } from "../save/save.service";
import { useProfile } from "../profile/profile.service";
import { StoryAvatar } from "../stories/StoryAvatar";
import { MusicPlayingIcon } from "../messages/NotesBar";
 
interface PostCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: PostResponseSingle; // Gunakan interface MyPostResponse.data[0] yang sudah kamu buat
  // === Kontrol audio global (dipakai di halaman home/feed) ===
  // Kalau props ini diisi, maka tombol volume jadi saklar global
  // dan yang bunyi hanya kartu yang lagi aktif (isActive).
  // Kalau tidak diisi, kartu jalan mandiri seperti dulu (fallback).
  soundEnabled?: boolean;
  isActive?: boolean;
  onToggleSound?: () => void;
  onInView?: (id: string) => void;
}

// Kotak kecil grid profil: hanya menampilkan media slide pertama
// (atau cuplikan caption bila tanpa media). Dipakai di /profile dan /profile/[username].
// large=true dipakai di /explore & /post/[id] biar kotaknya sedikit lebih besar (3 kolom di desktop).
// showMediaBadge=true: icon kanan-atas — square-play kalau video,
// copy (bertumpuk) kalau gambar >1 slide, images kalau 1 gambar. Tidak ikut ke modal besar.
export function GridPostItem({
  post,
  onClick,
  large = false,
  showMediaBadge = false,
}: {
  post: PostResponseSingle;
  onClick: () => void;
  large?: boolean;
  showMediaBadge?: boolean;
}) {
  const firstMedia = post.medias?.[0];
  const mediaCount = post.medias?.length ?? 0;
  const firstType = (firstMedia as { type?: string } | undefined)?.type;
  const firstUrl = firstMedia?.url ?? "";
  const isFirstVideo =
    firstType === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(firstUrl);
  // Video (slide pertama video) -> icon square-play, walau >1 slide.
  // Gambar >1 slide -> icon copy (bertumpuk).
  // 1 gambar -> icon images.
  const showPlay = showMediaBadge && !!firstMedia && isFirstVideo;
  const showStacked =
    showMediaBadge && !!firstMedia && mediaCount > 1 && !isFirstVideo;
  const showPhoto =
    showMediaBadge && !!firstMedia && mediaCount === 1 && !isFirstVideo;
  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      position="relative"
      overflow="hidden"
      borderRadius="md"
      bg="var(--app-subtle)"
      w={
        large
          ? { base: "calc(50% - 4px)", sm: "calc(50% - 4px)", md: "calc(33.333% - 6px)" }
          : { base: "calc(50% - 4px)", sm: "calc(33.333% - 6px)", md: "calc(25% - 6px)" }
      }
      style={{ aspectRatio: "1 / 1" }}
      _hover={{ opacity: 0.9 }}
    >
      {firstMedia ? (
        isFirstVideo ? (
          <video
            src={firstUrl}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Image
            src={firstUrl}
            alt="Postingan"
            w="full"
            h="full"
            objectFit="cover"
          />
        )
      ) : (
        <Flex
          w="full"
          h="full"
          align="center"
          justify="center"
          p={2}
          bgGradient="linear(to-b, blue.500, blue.700)"
        >
          <Text fontSize="xs" color="white" lineClamp={4} textAlign="center">
            {post.content}
          </Text>
        </Flex>
      )}
      {(showStacked || showPlay || showPhoto) && (
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
          {showStacked ? (
            <Copy size={24} />
          ) : showPlay ? (
            <SquarePlay size={24} />
          ) : (
            <Images size={24} />
          )}
        </Box>
      )}
      {(post.medias?.length ?? 0) > 1 && (
        <HStack
          position="absolute"
          bottom={2}
          left="50%"
          transform="translateX(-50%)"
          gap={1}
        >
          {post.medias.map((_, i) => (
            <Box
              key={i}
              w="6px"
              h="6px"
              borderRadius="full"
              bg={i === 0 ? "white" : "transparent"}
              border={i === 0 ? "none" : "1px solid white"}
            />
          ))}
        </HStack>
      )}
    </Box>
  );
}

// Ambang wide profile: sama kayak /explore (lebar / tinggi >= 1.3 = 16:9).
const PROFILE_WIDE_THRESHOLD = 1.3;

// Satu kotak grid profile. Ukuran ngikutin frame slide-1:
// - wide=true -> 16:9 fix (buat tumpukan atas-bawah di kolom khusus).
// - wide=false -> asli slide-1 (1:1 / 4:5 / asli), fallback 1:1.
// Badge kanan-atas + titik bawah sama kayak /explore.
function ProfileMediaBox({
  post,
  wide,
  aspect,
  onClick,
  onDetect,
}: {
  post: PostResponseSingle;
  wide: boolean;
  aspect?: string;
  onClick: () => void;
  onDetect?: (postId: string, w: number, h: number) => void;
}) {
  const firstMedia = post.medias?.[0];
  const mediaCount = post.medias?.length ?? 0;
  const firstType = (firstMedia as { type?: string } | undefined)?.type;
  const firstUrl = firstMedia?.url ?? "";
  const isFirstVideo =
    firstType === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(firstUrl);
  const showPlay = !!firstMedia && isFirstVideo;
  const showStacked = !!firstMedia && mediaCount > 1 && !isFirstVideo;
  const showPhoto = !!firstMedia && mediaCount === 1 && !isFirstVideo;
  const boxAspect = wide ? "16 / 9" : aspect ?? "1 / 1";

  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      position="relative"
      overflow="hidden"
      borderRadius="md"
      bg="var(--app-subtle)"
      w="full"
      style={{ aspectRatio: boxAspect }}
      _hover={{ opacity: 0.9 }}
      flexShrink={0}
    >
      {firstMedia ? (
        isFirstVideo ? (
          <video
            src={firstUrl}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight)
                onDetect?.(post.id, v.videoWidth, v.videoHeight);
            }}
          />
        ) : (
          <Image
            src={firstUrl}
            alt="Postingan"
            w="full"
            h="full"
            objectFit="cover"
            onLoad={(e) => {
              const img = e.currentTarget;
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              if (w && h) onDetect?.(post.id, w, h);
            }}
          />
        )
      ) : (
        <Flex
          w="full"
          h="full"
          align="center"
          justify="center"
          p={2}
          bgGradient="linear(to-b, blue.500, blue.700)"
        >
          <Text fontSize="xs" color="white" lineClamp={4} textAlign="center">
            {post.content}
          </Text>
        </Flex>
      )}
      {(showStacked || showPlay || showPhoto) && (
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
          {showStacked ? (
            <Copy size={24} />
          ) : showPlay ? (
            <SquarePlay size={24} />
          ) : (
            <Images size={24} />
          )}
        </Box>
      )}
      {mediaCount > 1 && (
        <HStack
          position="absolute"
          bottom={2}
          left="50%"
          transform="translateX(-50%)"
          gap={1}
        >
          {post.medias.map((_, i) => (
            <Box
              key={i}
              w="6px"
              h="6px"
              borderRadius="full"
              bg={i === 0 ? "white" : "transparent"}
              border={i === 0 ? "none" : "1px solid white"}
            />
          ))}
        </HStack>
      )}
    </Box>
  );
}

function ProfileEmptyWide() {
  return (
    <Box w="full" style={{ aspectRatio: "16 / 9" }} flexShrink={0} />
  );
}

// Grid profile ala /explore tapi 4 kolom:
// - 1 kolom wide berisi 2 kotak 16:9 tumpuk atas-bawah, 3 kolom normal
//   (1:1 / 4:5 / asli ngikutin frame slide-1).
// - Posisi kolom wide geser tiap baris: urutan 3 -> 2 -> 4 -> 1 -> ulang.
// - Slot wide kosong (bawah kalau cuma 1) dibiarkan kosong, atas diisi dulu.
// - Kelebihan postingan normal mengisi dari kiri.
export function ProfileMediaGrid({
  posts,
  onSelect,
}: {
  posts: PostResponseSingle[];
  onSelect: (post: PostResponseSingle) => void;
}) {
  const [mediaInfo, setMediaInfo] = useState<
    Record<string, { ratio: number; aspect: string; isWide: boolean }>
  >({});

  const handleDetect = (postId: string, w: number, h: number) => {
    if (!w || !h) return;
    const ratio = w / h;
    setMediaInfo((prev) => {
      const existing = prev[postId];
      if (existing && Math.abs(existing.ratio - ratio) < 0.01) return prev;
      return {
        ...prev,
        [postId]: {
          ratio,
          aspect: `${w} / ${h}`,
          isWide: ratio >= PROFILE_WIDE_THRESHOLD,
        },
      };
    });
  };

  const { widePosts, normalPosts } = useMemo(() => {
    const wide: PostResponseSingle[] = [];
    const normal: PostResponseSingle[] = [];
    posts.forEach((p) => {
      if (mediaInfo[p.id]?.isWide) wide.push(p);
      else normal.push(p);
    });
    return { widePosts: wide, normalPosts: normal };
  }, [posts, mediaInfo]);

  interface ProfileGroup {
    wideCol: number;
    wideTop: PostResponseSingle | null;
    wideBottom: PostResponseSingle | null;
    normals: (PostResponseSingle | null)[];
  }

  const groups: ProfileGroup[] = useMemo(() => {
    const numGroups = Math.max(
      Math.ceil(widePosts.length / 2),
      Math.ceil(normalPosts.length / 3),
      posts.length > 0 ? 1 : 0,
    );
    const result: ProfileGroup[] = [];
    let wi = 0;
    let ni = 0;
    for (let g = 0; g < numGroups; g++) {
      // Baris 1 -> urutan 3, baris 2 -> urutan 2, baris 3 -> urutan 4,
      // baris 4 -> urutan 1, lalu ulang (0-index: 2, 1, 3, 0).
      const wideCol = [2, 1, 3, 0][g % 4];
      const wideTop = wi < widePosts.length ? widePosts[wi++]! : null;
      const wideBottom = wi < widePosts.length ? widePosts[wi++]! : null;
      const normals: (PostResponseSingle | null)[] = [0, 1, 2].map(() =>
        ni < normalPosts.length ? normalPosts[ni++]! : null,
      );
      if (!wideTop && !wideBottom && normals.every((n) => !n)) continue;
      result.push({ wideCol, wideTop, wideBottom, normals });
    }
    return result;
  }, [widePosts, normalPosts, posts.length]);

  const getNormalAspect = (p: PostResponseSingle) =>
    mediaInfo[p.id]?.aspect ?? "1 / 1";

  return (
    <VStack gap={2} w="full" align="stretch">
      {groups.map((g, gi) => {
        const noWide = !g.wideTop && !g.wideBottom;
        // Grup tanpa wide sama sekali: normal rapet ke kiri,
        // sisanya dikosongkan.
        if (noWide) {
          return (
            <Flex key={`pgroup-${gi}`} gap={2} w="full" align="start">
              {[0, 1, 2].map((i) => {
                const p = g.normals[i];
                return (
                  <Box key={`pg${gi}-n${i}`} flex={1} minW={0}>
                    {p ? (
                      <ProfileMediaBox
                        post={p}
                        wide={false}
                        aspect={getNormalAspect(p)}
                        onClick={() => onSelect(p)}
                        onDetect={handleDetect}
                      />
                    ) : null}
                  </Box>
                );
              })}
              <Box flex={1} minW={0} />
            </Flex>
          );
        }
        const normalCols = [0, 1, 2, 3].filter((c) => c !== g.wideCol);
        const cols = [0, 1, 2, 3].map((c) => ({
          key: `pg${gi}-c${c}`,
          isWideCol: c === g.wideCol,
          normalIndex: normalCols.indexOf(c),
        }));
        return (
          <Flex key={`pgroup-${gi}`} gap={2} w="full" align="start">
            {cols.map((col) => {
              if (col.isWideCol) {
                return (
                  <VStack
                    key={col.key}
                    flex={1}
                    minW={0}
                    gap={2}
                    align="stretch"
                  >
                    {g.wideTop ? (
                      <ProfileMediaBox
                        post={g.wideTop}
                        wide
                        onClick={() => onSelect(g.wideTop!)}
                        onDetect={handleDetect}
                      />
                    ) : (
                      <ProfileEmptyWide />
                    )}
                    {g.wideBottom ? (
                      <ProfileMediaBox
                        post={g.wideBottom}
                        wide
                        onClick={() => onSelect(g.wideBottom!)}
                        onDetect={handleDetect}
                      />
                    ) : (
                      <ProfileEmptyWide />
                    )}
                  </VStack>
                );
              }
              const p = g.normals[col.normalIndex];
              return (
                <Box key={col.key} flex={1} minW={0}>
                  {p ? (
                    <ProfileMediaBox
                      post={p}
                      wide={false}
                      aspect={getNormalAspect(p)}
                      onClick={() => onSelect(p)}
                      onDetect={handleDetect}
                    />
                  ) : null}
                </Box>
              );
            })}
          </Flex>
        );
      })}
    </VStack>
  );
}
 
// Waktu relatif ala feed: Baru Saja → menit → jam → hari → minggu → bulan → tahun.
function timeAgo(dateInput: string | Date): string {
  const t = new Date(dateInput).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "Baru Saja";
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `• ${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `• ${hours} jam`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `• ${days} hari`;
  if (days < 30) return `• ${Math.floor(days / 7)} minggu`;
  if (days < 365) return `• ${Math.floor(days / 30)} bulan`;
  return new Date(t)
    .toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toLowerCase();
}

// Equalizer audio ala story: 4 bar bergelombang.
// Selalu bergerak walau volume off (hanya indikator visual).
// Sekarang pakai MusicPlayingIcon yang sama kayak Catatan (biru, joget)
// supaya semua ikon musik konsisten. Komponen lama dipertahankan sebagai
// alias biar tidak ada yang kepanggil kosong.
function EqualizerBars({
  paused = false,
  dark = false,
}: {
  paused?: boolean;
  dark?: boolean;
}) {
  void paused;
  void dark;
  return <MusicPlayingIcon />;
}

export const PostCard = ({ post, soundEnabled, isActive, onToggleSound, onInView }: PostCardProps) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  // Mode controlled = halaman home mengirim 3 props global ini.
  const isControlled = typeof soundEnabled === "boolean" && !!onToggleSound && !!onInView;
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { data: likeStatus } = useGetLikeStatus(post.id);
  const toggleLikeMutation = useToggleLike();
  const liked = likeStatus?.data?.liked ?? false;
  const totalLikes = likeStatus?.data?.totalLikes ?? post.likes?.length ?? 0;

  const { data: repostStatus } = useGetRepostStatus(post.id);
  const toggleRepostMutation = useToggleRepost();
  const reposted = repostStatus?.data?.reposted ?? false;
  const totalReposts = repostStatus?.data?.totalReposts ?? 0;
  const { data: profile } = useProfile();

  const { data: saveStatus } = useGetSaveStatus(post.id);
  const toggleSaveMutation = useToggleSave();
  const saved = saveStatus?.data?.saved ?? false;

  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Aspek alami tiap slide (dari file hasil baking) agar wadah ngikutin
  // frame settingan (16:9 vs 4:5) bukan tinggi fix 350px.
  const [mediaAspects, setMediaAspects] = useState<Record<number, string>>({});
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const [musicMuted, setMusicMuted] = useState(true); // dipakai hanya saat uncontrolled (fallback)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [showMusic, setShowMusic] = useState(true);
  const onInViewRef = useRef(onInView);
  onInViewRef.current = onInView;
  // Terlihat di layar atau tidak (untuk play/pause visual video).
  // Beda dengan isActive (fokus utama versi parent): kartu bisa masih
  // jadi activePostId tapi sudah ke-scroll keluar → video harus pause.
  const [isCardVisible, setIsCardVisible] = useState(false);

  // Laporkan ke parent saat kartu ini jadi fokus utama di viewport.
  // Parent (home) yang menentukan siapa activePostId.
  // Sekaligus catat visibilitas lokal untuk play/pause visual video.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (!isControlled) {
      const localObs = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setIsCardVisible(entry.isIntersecting && entry.intersectionRatio >= 0.3);
        },
        { threshold: [0, 0.3, 0.5], rootMargin: "-5% 0px -5% 0px" },
      );
      localObs.observe(el);
      return () => localObs.disconnect();
    }
    const postId = post.id;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Visibilitas lokal: untuk pause visual saat ke-scroll keluar,
        // walau masih jadi activePostId (belum ada pengganti).
        setIsCardVisible(entry.isIntersecting && entry.intersectionRatio >= 0.3);
        // Threshold 0.4 + margin tengah biar stabil untuk kartu tinggi.
        // Kartu tanpa musik pun tetap lapor, supaya musik kartu lain berhenti.
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          onInViewRef.current?.(postId);
        }
      },
      {
        threshold: [0, 0.3, 0.4, 0.6, 0.75],
        rootMargin: "-10% 0px -10% 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isControlled, post.id]);

  // Deteksi video: dari type media atau ekstensi URL.
  const isVideoMedia = (m?: { url: string; type?: string }) => {
    if (!m?.url) return false;
    if (m.type === "video") return true;
    return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(m.url);
  };
  const isVideoPost = (post.medias ?? []).some((m) => isVideoMedia(m));
  // Label audio ala IG/TikTok:
  // - Foto + musik / Video + musik pilihan = judul musik itu.
  // - Video tanpa musik pilihan (video editan yg sudah ada lagunya) = "Audio Asli".
  const audioLabel = post.musicTitle || (isVideoPost ? "Audio Asli" : null);

  // Gantian lagu/lokasi tiap 3 detik (hanya kalau dua-duanya ada).
  useEffect(() => {
    if (!audioLabel || !post.location) return;
    const t = window.setInterval(() => setShowMusic((v) => !v), 3000);
    return () => window.clearInterval(t);
  }, [audioLabel, post.location]);

  const hasMusic = !!audioLabel;
  const hasLoc = !!post.location;
  const showMusicNow = hasMusic && (!hasLoc || showMusic);

  // === Playback ===
  // Controlled (home): bunyi hanya kalau soundEnabled && isActive && modal tidak terbuka.
  // Uncontrolled (fallback): bunyi saat musicMuted lokal dimatikan.
  const shouldPlayControlled =
    !!isControlled && !!soundEnabled && !!isActive && !!post.musicUrl && !isDetailOpen;
  // Equalizer selalu bergerak sebagai indikator visual,
  // tidak ikut berhenti saat volume off.
  const isPlaying = true;

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    if (isControlled) {
      if (shouldPlayControlled) {
        if (post.musicUrl && audio.src !== post.musicUrl) audio.src = post.musicUrl;
        audio.loop = true;
        audio.muted = false;
        audio.play().catch(() => {
          // Autoplay ditolak browser → biarkan pause, user bisa pencet lagi.
        });
      } else {
        audio.pause();
      }
      return () => {
        audio.pause();
      };
    }
    // Fallback lama (mandiri per kartu).
    if (!musicMuted && post.musicUrl) {
      if (audio.src !== post.musicUrl) audio.src = post.musicUrl;
      audio.loop = true;
      audio.play().catch(() => setMusicMuted(true));
    } else {
      audio.pause();
    }
    return () => {
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, shouldPlayControlled, musicMuted, post.musicUrl, isDetailOpen]);

  // Pengaman lapis 2: pause elemen audio langsung saat tab disembunyikan.
  // Parent (home) sudah set soundEnabled=false, ini memastikan tidak ada
  // jeda suara bocor + mereset mode fallback (uncontrolled) ke mute.
  useEffect(() => {
    const pauseNow = () => {
      musicAudioRef.current?.pause();
      videoRefs.current.forEach((v) => v?.pause());
      if (!isControlled) setMusicMuted(true);
    };
    const onVisibility = () => {
      if (document.hidden) pauseNow();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pauseNow);
    window.addEventListener("blur", pauseNow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pauseNow);
      window.removeEventListener("blur", pauseNow);
    };
  }, [isControlled]);

  // Ikon volume: controlled → cerminkan global (semua kartu sama).
  const showMutedIcon = isControlled ? !soundEnabled : musicMuted;
  // === Aturan suara video (fix bentrok Audio Asli) ===
  // - Video + musik pilihan = suara asli video SELALU mati (diganti musik pilihan).
  // - Video tanpa musik pilihan (Audio Asli) = bunyi HANYA kalau:
  //   controlled: soundEnabled && isActive && !isDetailOpen && slide ini yang terlihat.
  //   uncontrolled (fallback): !musicMuted && slide ini yang terlihat.
  // Jadi pencet volume ON tidak menyalakan semua video sekaligus,
  // cuma kartu yang lagi difokus (diarahkan / di-scroll ke postingannya).
  const isCardAudible = isControlled
    ? !!soundEnabled && !!isActive && !isDetailOpen
    : !musicMuted && !isDetailOpen;
  const getVideoMuted = (slideIndex: number) => {
    if (post.musicUrl) return true;
    if (!isCardAudible) return true;
    const mediaCount = post.medias?.length ?? 0;
    if (mediaCount > 1 && slideIndex !== activeIndex) return true;
    return false;
  };
  // Tap video untuk pause/play manual (ala TikTok).
  // Reset otomatis saat ganti slide / kartu keluar layar / modal dibuka.
  const [pausedByTap, setPausedByTap] = useState(false);
  const pausedByTapRef = useRef(false);
  // Ikon tengah: segitiga saat pause, garis 2 saat resume.
  // Muncul animasi, tampil 2 detik, lalu fade out sendiri.
  // Video tetap pada statusnya (pause tetap pause, main tetap main).
  const [pauseIconVisible, setPauseIconVisible] = useState(false);
  const [pauseIconLeaving, setPauseIconLeaving] = useState(false);
  const [pauseIconKind, setPauseIconKind] = useState<"play" | "pause">("play");
  const clickTimerRef = useRef<number | null>(null);
  const pauseHideTimerRef = useRef<number | null>(null);
  const pauseLeaveTimerRef = useRef<number | null>(null);
  const clearPauseIconTimers = () => {
    if (pauseHideTimerRef.current) {
      window.clearTimeout(pauseHideTimerRef.current);
      pauseHideTimerRef.current = null;
    }
    if (pauseLeaveTimerRef.current) {
      window.clearTimeout(pauseLeaveTimerRef.current);
      pauseLeaveTimerRef.current = null;
    }
  };
  const showOverlayIcon = (kind: "play" | "pause") => {
    clearPauseIconTimers();
    setPauseIconKind(kind);
    setPauseIconLeaving(false);
    setPauseIconVisible(true);
    pauseHideTimerRef.current = window.setTimeout(() => {
      setPauseIconLeaving(true);
      pauseLeaveTimerRef.current = window.setTimeout(() => {
        setPauseIconVisible(false);
        setPauseIconLeaving(false);
      }, 300);
    }, 1000);
  };
  const hideOverlayIcon = () => {
    clearPauseIconTimers();
    setPauseIconVisible(false);
    setPauseIconLeaving(false);
  };
  const setPaused = (v: boolean) => {
    pausedByTapRef.current = v;
    setPausedByTap(v);
  };
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clearPauseIconTimers();
    };
  }, []);
  useEffect(() => {
    setPaused(false);
    hideOverlayIcon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);
  useEffect(() => {
    if (!isCardVisible || (isControlled && !isActive) || isDetailOpen) {
      setPaused(false);
      hideOverlayIcon();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardVisible, isActive, isControlled, isDetailOpen]);
  // === Aturan visual video (jangan muter sebelum diarahkan) ===
  // Main hanya kalau kartu kelihatan + jadi fokus + modal tertutup
  // + tidak lagi di-pause manual via tap,
  // TIDAK ikut soundEnabled (volume OFF tetap main tapi bisu).
  // - Belum diarahkan → pause di frame awal, tidak looping sendiri.
  // - Diarahkan → play.
  // - Di-scroll lewat → pause lagi.
  // - Di-tap saat nonton → pause + tampilkan ikon pause.
  const shouldPlayVideoAt = (slideIndex: number) => {
    if (isDetailOpen) return false;
    if (pausedByTap) return false;
    if (!isCardVisible) return false;
    if (isControlled && !isActive) return false;
    const mediaCount = post.medias?.length ?? 0;
    if (mediaCount > 1 && slideIndex !== activeIndex) return false;
    return true;
  };
  // Sinkron muted + play/pause ke DOM.
  // - muted: workaround bug React (atribut muted tidak selalu update).
  // - play/pause visual: biar video diam sebelum diarahkan.
  useEffect(() => {
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      const shouldMute = getVideoMuted(idx);
      if (v.muted !== shouldMute) v.muted = shouldMute;
      if (shouldPlayVideoAt(idx)) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCardAudible, isCardVisible, isActive, activeIndex, post.musicUrl, post.medias?.length, isDetailOpen, pausedByTap]);
  const handleVolumeClick = () => {
    if (isControlled) {
      onToggleSound?.();
    } else {
      setMusicMuted((v) => !v);
    }
  };

  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Tap 1x pada video → pause/play + ikon tengah 2 detik.
    // - Lagi main → pause + segitiga kanan.
    // - Lagi pause → resume + garis 2.
    // Tap 2x → love + like (tanpa toggle pause).
    // Pakai delay 260ms biar single tidak kepencet saat double-click.
    if (e.detail === 1) {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = window.setTimeout(() => {
        const currentMedia = post.medias?.[activeIndex];
        const canToggle =
          !!currentMedia &&
          isVideoMedia(currentMedia) &&
          isCardVisible &&
          (!isControlled || !!isActive) &&
          !isDetailOpen;
        if (!canToggle) return;
        if (pausedByTapRef.current) {
          setPaused(false);
          showOverlayIcon("pause");
        } else {
          setPaused(true);
          showOverlayIcon("play");
        }
      }, 260);
      return;
    }
    if (e.detail !== 2) return;
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartBurst({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    });
    if (!liked) {
      toggleLikeMutation.mutate(post.id);
    }
    setTimeout(() => setHeartBurst(null), 800);
  };

  const handleToggleLike = () => {
    toggleLikeMutation.mutate(post.id);
  };

  const handleScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(index, Math.max(post.medias?.length - 1, 0)));
  };

  const scrollTo = (index: number) => {
    const el = sliderRef.current;
    if (!el || !post.medias?.length) return;
    const clamped = Math.max(0, Math.min(index, post.medias.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActiveIndex(clamped);
  };

  return (
    <Box
      ref={cardRef}
      bg="var(--app-card)"
      p={6}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="var(--app-border)"
      shadow="sm"
    >
      <style>{`
        @keyframes repostFloat {
          0% { transform: translate(0, 0); }
          25% { transform: translate(3px, -4px); }
          50% { transform: translate(-2px, -6px); }
          75% { transform: translate(-3px, -2px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 0; }
          30% { transform: scale(1.3); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.1) translateY(-20px); opacity: 0; }
        }
        @keyframes pausePop {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes pauseFadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
        @keyframes eqBounce {
          from { transform: scaleY(0.25); }
          to { transform: scaleY(1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header: User Info */}
      <HStack gap={3} mb={4}>
        <StoryAvatar
          userId={post.user?.id}
          username={post.user?.username}
          avatarUrl={post.user?.avatar}
          size={40}
          fallbackHref={`/profile/${post.user?.username}`}
        />
        <VStack align="start" gap={0}>
          <HStack gap={1.5}>
            <Link as={NextLink} href={`/profile/${post.user?.username}`}>
              <Text
                color="var(--app-text)"
                fontWeight="bold"
                fontSize="sm"
              >
                {post.user?.username || post.user?.name || "User"}
              </Text>
            </Link>
            <Text fontSize="sm" color="var(--app-muted)" fontWeight="normal">
              {timeAgo(post.createdAt)}
            </Text>
          </HStack>
          {showMusicNow ? (
            <Box
              key="music"
              style={{ animation: "fadeSlideIn 0.4s ease" }}
            >
              <HStack gap={1.5}>
                <EqualizerBars dark paused={!isPlaying} />
                <Text fontSize="xs" color="var(--app-text)" fontWeight="medium" lineClamp={1} maxW="220px">
                  {audioLabel}
                </Text>
              </HStack>
            </Box>
          ) : hasLoc ? (
            <Box key="loc" style={{ animation: "fadeSlideIn 0.4s ease" }}>
              <HStack gap={1}>
                <MapPin size={11} color="var(--app-muted)" />
                <Text fontSize="xs" color="var(--app-muted)" lineClamp={1} maxW="220px">
                  {post.location}
                </Text>
              </HStack>
            </Box>
          ) : (
            <Text fontSize="xs" color="var(--app-muted)">
              {new Date(post.createdAt).toLocaleDateString("id-ID")}
            </Text>
          )}
        </VStack>
      </HStack>
  
{/* Manual CSS Slider */}
      {post.medias && post.medias.length > 0 && (
        <Box position="relative" mb={4}>
          <Flex
            ref={sliderRef}
            overflowX="auto"
            overflowY="hidden"
            onScroll={handleScroll}
            onClick={handleMediaClick}
            css={{
              scrollSnapType: "x mandatory",
              "&::-webkit-scrollbar": { display: "none" },
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            }}
            borderRadius="lg"
            bg="var(--app-input)"
            style={{
              aspectRatio: mediaAspects[activeIndex] ?? "4 / 5",
            }}
          >
            {post.medias.map((media: { url: string; id: string; type?: string }, i: number) => (
              <Box
                key={media.id}
                minW="100%" // Setiap media mengambil 100% lebar container
                h="full"
                scrollSnapAlign="start" // Berhenti tepat di awal media
              >
                {isVideoMedia(media) ? (
                  <video
                    src={media.url}
                    muted={getVideoMuted(i)}
                    ref={(el) => {
                      videoRefs.current[i] = el;
                      if (el) el.muted = getVideoMuted(i);
                    }}
                    loop
                    playsInline
                    preload="metadata"
                    controls={false}
                    onCanPlay={(e) => {
                      if (shouldPlayVideoAt(i)) e.currentTarget.play().catch(() => {});
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      const w = v.videoWidth;
                      const h = v.videoHeight;
                      if (w && h) {
                        const aspect = `${w} / ${h}`;
                        setMediaAspects((prev) =>
                          prev[i] === aspect ? prev : { ...prev, [i]: aspect },
                        );
                      }
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Image
                    src={media.url}
                    alt="Post Media"
                    w="full"
                    h="full"
                    objectFit="cover"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const w = img.naturalWidth;
                      const h = img.naturalHeight;
                      if (w && h) {
                        const aspect = `${w} / ${h}`;
                        setMediaAspects((prev) =>
                          prev[i] === aspect ? prev : { ...prev, [i]: aspect },
                        );
                      }
                    }}
                  />
                )}
              </Box>
            ))}
          </Flex>

          {/* Ikon tengah saat video di-tap (ala TikTok/IG).
              - Pause (video berhenti) → segitiga kanan.
              - Resume (video jalan lagi) → garis 2.
              Muncul animasi slow, tampil 2 detik lalu fade out sendiri.
              Klik tembus biar tap lagi untuk toggle. */}
          {pauseIconVisible &&
            isCardVisible &&
            (!isControlled || !!isActive) &&
            !isDetailOpen &&
            isVideoMedia(post.medias?.[activeIndex]) && (
              <Flex
                position="absolute"
                inset={0}
                align="center"
                justify="center"
                zIndex={7}
                pointerEvents="none"
              >
                <Flex
                  w="72px"
                  h="72px"
                  borderRadius="full"
                  bg="blackAlpha.600"
                  align="center"
                  justify="center"
                  style={{
                    animation: pauseIconLeaving
                      ? "pauseFadeOut 0.3s ease forwards"
                      : "pausePop 0.3s ease",
                  }}
                >
                  {pauseIconKind === "play" ? (
                    <Play size={44} color="#CBD5E0" fill="#CBD5E0" />
                  ) : (
                    <Pause size={44} color="#CBD5E0" strokeWidth={2.5} />
                  )}
                </Flex>
              </Flex>
            )}

          {/* Buletan volume: kanan bawah media.
              Mode home (controlled) = saklar global: pencet di mana aja,
              semua ikon ikut ON/OFF, tapi yang bunyi cuma kartu fokus.
              Muncul kalau ada musik pilihan ATAU video (Audio Asli). */}
          {(post.musicUrl || isVideoPost) && (
            <Box position="absolute" right={3} bottom={3} zIndex={6}>
              <Box
                as="button"
                aria-label={showMutedIcon ? "Nyalakan lagu" : "Matikan lagu"}
                title={showMutedIcon ? "Nyalakan lagu (semua postingan)" : "Matikan lagu (semua postingan)"}
                w="36px"
                h="36px"
                borderRadius="full"
                bg="blackAlpha.600"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ bg: "blackAlpha.800" }}
                onClick={handleVolumeClick}
              >
                {showMutedIcon ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Box>
            </Box>
          )}
          <audio ref={musicAudioRef} preload="none" loop />

          {/* Tombol Navigasi */}
          {post.medias.length > 1 && (
            <>
              <IconButton
                aria-label="Foto sebelumnya"
                size="sm"
                position="absolute"
                left={2}
                top="50%"
                transform="translateY(-50%)"
                bg="blackAlpha.500"
                color="white"
                borderRadius="full"
                zIndex={5}
                _hover={{ bg: "blackAlpha.700" }}
                disabled={activeIndex === 0}
                onClick={() => scrollTo(activeIndex - 1)}
              >
                <ChevronLeft size={18} />
              </IconButton>
              <IconButton
                aria-label="Foto berikutnya"
                size="sm"
                position="absolute"
                right={2}
                top="50%"
                transform="translateY(-50%)"
                bg="blackAlpha.500"
                color="white"
                borderRadius="full"
                zIndex={5}
                _hover={{ bg: "blackAlpha.700" }}
                disabled={activeIndex === post.medias.length - 1}
                onClick={() => scrollTo(activeIndex + 1)}
              >
                <ChevronRight size={18} />
              </IconButton>
            </>
          )}

          {/* Animasi Love Double-Click */}
          {heartBurst && (
            <Box
              key={heartBurst.id}
              position="absolute"
              left={heartBurst.x}
              top={heartBurst.y}
              transform="translate(-50%, -50%)"
              zIndex={20}
              pointerEvents="none"
              display="flex"
              alignItems="center"
              justifyContent="center"
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

          {/* Indikator Slide */}
          {post.medias.length > 1 && (
            <HStack
              position="absolute"
              bottom={3}
              left="50%"
              transform="translateX(-50%)"
              gap={1}
              zIndex={9}
            >
              {post.medias.map((_, i) => (
                <Box
                  key={i}
                  w="7px"
                  h="7px"
                  borderRadius="full"
                  bg={i === activeIndex ? "white" : "transparent"}
                  border={i === activeIndex ? "none" : "1px solid white"}
                />
              ))}
            </HStack>
          )}

          {/* Badge Repost: pp avatar + buletan biru icon repost di kiri bawah media */}
          {(() => {
            const repostersList = repostStatus?.data?.reposters ?? [];
            const seen = new Set<string>();
            const avatars: { id: string; name: string; avatar: string }[] = [];
            const fallbackAvatar = "/default-avatar.jpg";
            if (reposted) {
              const myId = profile?.id || "me";
              if (!seen.has(myId)) {
                avatars.push({
                  id: myId,
                  name: "Anda",
                  avatar: profile?.avatar || fallbackAvatar,
                });
                seen.add(myId);
              }
            }
            for (const r of repostersList) {
              if (!seen.has(r.id)) {
                avatars.push({
                  id: r.id,
                  name: r.name,
                  avatar: r.avatar || fallbackAvatar,
                });
                seen.add(r.id);
              }
            }
            const shown = avatars.slice(0, 3);
            if (shown.length === 0) return null;
            return (
              <Box
                position="absolute"
                bottom={3}
                left={3}
                zIndex={10}
                css={{ animation: "repostFloat 3s ease-in-out infinite" }}
              >
                <Box position="relative">
                  <HStack gap={4}>
                    {shown.map((r) => (
                      <Box key={r.id} position="relative" w="36px" h="36px">
                        <Image
                          src={r.avatar}
                          alt={`Direpost oleh ${r.name}`}
                          w="full"
                          h="full"
                          objectFit="cover"
                          borderRadius="full"
                          border="2px solid white"
                          shadow="md"
                        />
                        <Box
                          position="absolute"
                          bottom={-1}
                          right={-1}
                          bg="blue.600"
                          borderRadius="full"
                          p={1}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          border="2px solid white"
                        >
                          <Repeat2 size={10} color="white" />
                        </Box>
                      </Box>
                    ))}
                  </HStack>
                </Box>
              </Box>
            );
          })()}
        </Box>
      )}
 
      {/* Footer: Actions */}
      <Box borderTop="1px solid" borderColor="var(--app-subtle)" pt={4}>
        <HStack gap={6}>
          <HStack
            gap={2}
            color="var(--app-secondary)"
            cursor="pointer"
            onClick={handleToggleLike}
            _hover={{ color: "red.500" }}
          >
            <Heart
              size={20}
              fill={liked ? "red" : "none"}
              color={liked ? "red" : "currentColor"}
            />
            <Text fontSize="sm">{totalLikes}</Text>
          </HStack>
          <HStack
            onClick={() => setIsDetailOpen(true)}
            gap={2}
            color="var(--app-secondary)"
            cursor="pointer"
            _hover={{ color: "blue.500" }}
          >
            <MessageCircle size={20} />
            <Text fontSize="sm">{post.commentsCount ?? post.comments?.length ?? 0}</Text>
          </HStack>
          <HStack
            gap={2}
            color={reposted ? "blue.600" : "var(--app-secondary)"}
            cursor="pointer"
            onClick={() => toggleRepostMutation.mutate(post.id)}
            _hover={{ color: "blue.500" }}
          >
            <Repeat2
              size={20}
              fill={reposted ? "currentColor" : "none"}
            />
            <Text fontSize="sm">{totalReposts}</Text>
          </HStack>
          {/* Ikon pesan di sebelah Repost (fungsi menyusul). */}
          <HStack
            gap={2}
            color="var(--app-secondary)"
            cursor="pointer"
            onClick={() => setIsShareOpen(true)}
            _hover={{ color: "blue.500" }}
          >
            <Send size={20} />
          </HStack>
          <HStack
            gap={2}
            color={saved ? "blue.600" : "var(--app-secondary)"}
            cursor="pointer"
            ml="auto"
            onClick={() => toggleSaveMutation.mutate(post.id)}
            _hover={{ color: "blue.500" }}
          >
            <Bookmark
              size={20}
              fill={saved ? "currentColor" : "none"}
            />
          </HStack>
        </HStack>

        {/* Liked By Section */}
        {(() => {
          const validLikes = post.likes?.filter((like) => like.user?.name) ?? [];
          if (validLikes.length === 0) return null;
          const firstLiker = validLikes[0].user;
          const others = totalLikes > 0 ? totalLikes - 1 : validLikes.length - 1;
          return (
            <Text fontSize="sm" color="var(--app-text)" mt={2}>
              Disukai oleh{" "}
              <Link
                as={NextLink}
                href={`/profile/${firstLiker.username}`}
                color="var(--app-text)"
                fontWeight="bold"
                _hover={{ textDecoration: "underline" }}
              >
                {firstLiker.username || firstLiker.name}
              </Link>
              {others > 0 && (
                <>
                  {" "}dan{" "}
                  <Text
                    as="span"
                    fontWeight="bold"
                    cursor="pointer"
                    onClick={() => setIsLikesOpen(true)}
                    _hover={{ textDecoration: "underline" }}
                  >
                    {others} lainnya
                  </Text>
                </>
              )}
            </Text>
          );
        })()}

        {/* Caption */}
        {post.content && (
          <Text fontSize="sm" color="var(--app-text)" mt={3}>
            <Link
              as={NextLink}
              href={`/profile/${post.user?.username}`}
              fontWeight="bold"
              color="var(--app-text)"
            >
              {post.user?.username || post.user?.name || "User"}
            </Link>{" "}
            {post.content}
          </Text>
        )}
      </Box>

      {/* Likes Modal */}
      <Dialog.Root
        open={isLikesOpen}
        onOpenChange={(e) => setIsLikesOpen(e.open)}
        placement="center"
        size="sm"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="var(--app-card)" color="var(--app-text)" borderRadius="xl" overflow="hidden">
            <Dialog.Header
              position="relative"
              justifyContent="center"
              borderBottomWidth="1px"
              borderColor="var(--app-border)"
              py={4}
            >
              <IconButton
                aria-label="Tutup"
                variant="ghost"
                size="sm"
                position="absolute"
                left={3}
                top="50%"
                transform="translateY(-50%)"
                color="var(--app-text)"
                _hover={{ bg: "var(--app-subtle)" }}
                onClick={() => setIsLikesOpen(false)}
              >
                <X size={22} color="var(--app-text)" />
              </IconButton>
              <Dialog.Title fontWeight="bold" color="var(--app-text)">Menyukai</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body px={2} py={2} maxH="400px" overflowY="auto">
              <VStack align="stretch" gap={1}>
                {post.likes
                  ?.filter((like) => like.user?.name)
                  .map((like) => (
                    <Link
                      key={like.id}
                      as={NextLink}
                      href={`/profile/${like.user.username}`}
                      p={2}
                      borderRadius="md"
                      _hover={{ bg: "var(--app-input)", textDecoration: "none" }}
                      onClick={() => setIsLikesOpen(false)}
                    >
                      <HStack gap={3}>
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          overflow="hidden"
                        >
                          <Image
                            src={like.user.avatar || "/default-avatar.jpg"}
                            alt={like.user.name}
                            w="full"
                            h="full"
                            objectFit="cover"
                          />
                        </Box>
                        <Text fontWeight="medium" color="var(--app-text)" fontSize="sm">
                          {like.user.name}
                        </Text>
                      </HStack>
                    </Link>
                  ))}
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Modal detail ala /profile: kiri media, kanan komentar.
          variant="own" -> kalau milik sendiri tampil titik tiga,
          kalau milik orang lain tampil tombol Ikuti (tanpa titik tiga).
          initialMusicMuted ngikutin kotak home: home on -> modal bunyi. */}
      <PostDetailModal
        post={post}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        variant="own"
        initialMusicMuted={showMutedIcon}
      />

      {/* Kotak tengah Berbagi (ikon pesan di sebelah Repost). */}
      <SharePostModal
        post={post}
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </Box>
  );
};
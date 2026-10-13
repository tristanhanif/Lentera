"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Textarea,
  Image,
  IconButton,
  Dialog,
  Input,
  Button,
  Separator,
} from "@chakra-ui/react";
import NextLink from "next/link";
import {
  Heart,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Repeat2,
  Bookmark,
  Send,
  MapPin,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Trash2,
  Smile,
  Play,
  Pause,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { PostResponseSingle } from "./post.interface";
import { CommentResponse } from "../comments/comment.interface";
import { PostComments } from "../comments/postComment";
import { useGetLikeStatus, useToggleLike } from "../like/like.service";
import {
  useGetRepostStatus,
  useToggleRepost,
  useUpdatePendapat,
} from "../repost/repost.service";
import { useGetSaveStatus, useToggleSave } from "../save/save.service";
import { useProfile, usePublicProfile, useFollowUser } from "../profile/profile.service";
import { useCreateComment } from "../comments/comment.service";
import { useDeletePost } from "./post.service";
import { StoryAvatar } from "../stories/StoryAvatar";
import { MusicPlayingIcon } from "../messages/NotesBar";
import { SharePostModal } from "./SharePostModal";

// Waktu relatif ala feed: Baru Saja → menit → jam → hari → minggu → bulan → tahun.
function timeAgo(dateInput: string | Date): string {
  const t = new Date(dateInput).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "Baru Saja";
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari`;
  if (days < 30) return `${Math.floor(days / 7)} minggu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan`;
  return new Date(t)
    .toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toLowerCase();
}

// Equalizer audio kecil untuk judul musik di header.
// Sekarang pakai MusicPlayingIcon yang sama kayak Catatan (biru, joget)
// supaya ikon di kotak besar postingan konsisten (home + explore).
function EqualizerBars({ dark = false }: { dark?: boolean }) {
  void dark;
  return <MusicPlayingIcon />;
}

const EMOJIS: string[] = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🥰",
  "😎", "🤔", "😐", "🙄", "😴", "😷", "🤯", "🥳",
  "😭", "😡", "👍", "👎", "🙏", "👏", "💪", "✌️",
  "👀", "🙌", "🔥", "⭐", "🎉", "❤️", "💙", "💔",
];

function isVideoUrl(url: string, type?: string): boolean {
  if (type === "video") return true;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

interface PostDetailModalProps {
  post: PostResponseSingle;
  open: boolean;
  onClose: () => void;
  // "own" = halaman /profile sendiri (revisi kotak postingan baru).
  // "other" (default) = /profile/[username], tetap tampilan lama.
  variant?: "own" | "other";
  // Status volume kotak pemanggil (home): kalau kotak home volume on,
  // modal ikut on saat dibuka. Default tetap mute.
  initialMusicMuted?: boolean;
}

export const PostDetailModal = ({ post, open, onClose, variant = "other", initialMusicMuted = true }: PostDetailModalProps) => {
  const isOwnProfile = variant === "own";
  const [isLikesOpen, setIsLikesOpen] = useState(false);
  const { data: likeStatus } = useGetLikeStatus(post?.id);
  const toggleLikeMutation = useToggleLike();
  const liked = likeStatus?.data?.liked ?? false;
  const totalLikes = likeStatus?.data?.totalLikes ?? post?.likes?.length ?? 0;

  const { data: repostStatus } = useGetRepostStatus(post?.id);
  const toggleRepostMutation = useToggleRepost();
  const reposted = repostStatus?.data?.reposted ?? false;
  const totalReposts = repostStatus?.data?.totalReposts ?? 0;

  const { data: saveStatus } = useGetSaveStatus(post?.id);
  const toggleSaveMutation = useToggleSave();
  const saved = saveStatus?.data?.saved ?? false;

  const { data: profile } = useProfile();
  const createCommentMutation = useCreateComment();
  const { mutate: deletePost, isPending: deletePending } = useDeletePost();
  const isMine = !!profile?.id && !!post?.user?.id && profile.id === post.user.id;
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<CommentResponse | null>(null);
  const [followOptimistic, setFollowOptimistic] = useState<boolean | null>(null);
  const followMutation = useFollowUser();

  // Status follow pemilik postingan (khusus POV non-pemilik di /profile sendiri).
  const ownerId = post?.user?.id || "";
  const ownerKey = post?.user?.id || post?.user?.username || "";
  const { data: ownerProfile } = usePublicProfile(
    isOwnProfile && !isMine && ownerKey ? ownerKey : "",
  );
  const following =
    followOptimistic ?? ownerProfile?.data?.isFollowing ?? false;

  const handleToggleFollow = () => {
    if (!ownerId || followMutation.isPending) return;
    const next = !following;
    setFollowOptimistic(next);
    followMutation.mutate(ownerId, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (res: any) => {
        const serverVal = res?.data?.following;
        if (typeof serverVal === "boolean") setFollowOptimistic(serverVal);
      },
      onError: () => setFollowOptimistic(null),
      onSettled: () => setFollowOptimistic(null),
    });
  };
  const [pendapat, setPendapat] = useState("");
  const [pendapatFocused, setPendapatFocused] = useState(false);
  const { mutate: savePendapat } = useUpdatePendapat();
  const pendapatTouched = useRef(false);
  const pendapatRef = useRef<HTMLTextAreaElement | null>(null);
  const pendapatMirrorRef = useRef<HTMLDivElement | null>(null);

  const repostersList = repostStatus?.data?.reposters ?? [];
  // Pendapat saya yang sudah tersimpan di server (biar kelihatan silang antar akun).
  const myServerPendapat =
    repostersList.find((r) => r.id === profile?.id)?.pendapat ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [musicMuted, setMusicMuted] = useState(initialMusicMuted);
  const [showMusic, setShowMusic] = useState(true);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Tap video untuk pause/play manual — sama kayak kotak feed.
  // Ikon tengah: segitiga saat pause, garis 2 saat resume.
  // Muncul animasi, tampil 1 detik, lalu fade out sendiri.
  const [pausedByTap, setPausedByTap] = useState(false);
  const pausedByTapRef = useRef(false);
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

  // Progress bar video modal ala reels (garis bawah putih bisa digeser).
  const [videoProgress, setVideoProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isBarHovered, setIsBarHovered] = useState(false);
  const seekingRef = useRef(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const fractionFromClientX = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };
  const seekActiveVideoTo = (fraction: number) => {
    const v = videoRefs.current[activeIndex];
    if (!v || !v.duration || !Number.isFinite(v.duration)) return;
    const clamped = Math.max(0, Math.min(1, fraction));
    v.currentTime = clamped * v.duration;
    setVideoProgress(clamped);
  };

  // Garis progress hanya muncul saat kursor di video (hover),
  // saat digeser, saat ikon tap tampil, atau saat 2x.
  const [isMediaHovered, setIsMediaHovered] = useState(false);
  // Tahan lama (kursor/jari) → video 2x, lepas → normal lagi.
  const [isFastForward, setIsFastForward] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const fastForwardRef = useRef(false);
  const suppressClickRef = useRef(false);
  const fastWasPausedRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeRef = useRef(false);
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const enterFastForward = () => {
    if (!open || fastForwardRef.current) return;
    const v = videoRefs.current[activeIndex];
    if (!v) return;
    // Batalkan toggle pause single-tap yang masih nunggu.
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    suppressClickRef.current = true;
    fastWasPausedRef.current = pausedByTapRef.current;
    fastForwardRef.current = true;
    setIsFastForward(true);
    try {
      v.playbackRate = 2;
    } catch {
      /* abaikan */
    }
    v.play().catch(() => {});
  };
  const exitFastForward = () => {
    clearLongPressTimer();
    if (!fastForwardRef.current) return;
    fastForwardRef.current = false;
    setIsFastForward(false);
    const v = videoRefs.current[activeIndex];
    if (v) {
      try {
        v.playbackRate = 1;
      } catch {
        /* abaikan */
      }
      if (fastWasPausedRef.current) v.pause();
      else v.play().catch(() => {});
    }
  };
  const resetPlaybackRate = () => {
    clearLongPressTimer();
    fastForwardRef.current = false;
    setIsFastForward(false);
    suppressClickRef.current = false;
    swipeRef.current = false;
    pressStartRef.current = null;
    videoRefs.current.forEach((v) => {
      if (!v) return;
      try {
        v.playbackRate = 1;
      } catch {
        /* abaikan */
      }
    });
  };

  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [orientations, setOrientations] = useState<Record<number, "landscape" | "portrait">>({});
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; id: number } | null>(null);
  const medias = post?.medias ?? [];

  const isVideoPost = medias.some((m) =>
    isVideoUrl(m.url, (m as { type?: string }).type),
  );
  // Sama kayak feed:
  // - Ada musik pilihan = judul musik itu (suara asli video dimatikan).
  // - Video tanpa musik = "Audio Asli".
  const audioLabel = post?.musicTitle || (isVideoPost ? "Audio Asli" : null);
  const hasMusic = !!audioLabel;
  const hasLoc = !!post?.location;
  const showMusicNow = hasMusic && (!hasLoc || showMusic);
  // Video selalu mute kalau ada musik pilihan (diganti musik itu),
  // kalau Audio Asli ikut saklar volume.
  const videoMuted = post?.musicUrl ? true : musicMuted;
  const activeIsVideo = (() => {
    const cur = medias?.[activeIndex];
    return !!cur && isVideoUrl(cur.url, (cur as { type?: string }).type);
  })();
  // Kotak "Tambahkan pendapat..." hanya untuk yang ngerepost:
  // B merepost postingan A -> hanya B yang dapat kotaknya.
  // A merepost postingan sendiri -> A juga dapat kotaknya.
  const showRepostBubble = reposted;

  // Reset state tiap ganti postingan.
  useEffect(() => {
    setActiveIndex(0);
    setNewComment("");
    setReplyTo(null);
    setFollowOptimistic(null);
    setPendapat("");
    setPendapatFocused(false);
    pendapatTouched.current = false;
    setMenuOpen(false);
    setEmojiOpen(false);
    setMusicMuted(initialMusicMuted);
    setShowMusic(true);
    setPaused(false);
    hideOverlayIcon();
    setVideoProgress(0);
    seekingRef.current = false;
    setIsSeeking(false);
    resetPlaybackRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  // Samakan status mute dengan kotak pemanggil tiap modal dibuka:
  // home volume on -> modal ikut bunyi, home off -> modal ikut mati.
  // Video selalu mulai dari awal saat modal dibuka (klik komentar).
  useEffect(() => {
    if (open) {
      setMusicMuted(initialMusicMuted);
      setActiveIndex(0);
      setPaused(false);
      hideOverlayIcon();
      setVideoProgress(0);
      seekingRef.current = false;
      setIsSeeking(false);
      // Mulai dari awal: reset semua video ke detik 0,
      // yang slide aktif langsung play (volume ngikutin kotak feed).
      requestAnimationFrame(() => {
        videoRefs.current.forEach((v) => {
          if (!v) return;
          try {
            v.currentTime = 0;
            v.playbackRate = 1;
          } catch {
            /* abaikan video yang belum siap */
          }
          v.pause();
        });
        const activeVideo = videoRefs.current[0];
        if (activeVideo) {
          if (post?.musicUrl) activeVideo.muted = true;
          else activeVideo.muted = initialMusicMuted;
          activeVideo.play().catch(() => {});
        }
      });
    } else {
      // Modal ditutup → pause semua video + sembunyikan ikon.
      videoRefs.current.forEach((v) => v?.pause());
      setPaused(false);
      hideOverlayIcon();
      resetPlaybackRate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Isi input dari pendapat tersimpan (punya sendiri) — sekali aja, jangan timpa ketikan.
  useEffect(() => {
    if (!pendapatTouched.current && myServerPendapat && !pendapat) {
      setPendapat(myServerPendapat);
    }
  }, [myServerPendapat, pendapat]);

  // Kotak menyesuaikan isi: kecil pas kosong, lebar ikut tulisan (max 120px),
  // kalau kepanjangan bungkus ke bawah jadi tinggi.
  useEffect(() => {
    const el = pendapatRef.current;
    if (!el) return;
    const mirrorW = pendapatMirrorRef.current?.offsetWidth ?? 0;
    el.style.width = pendapat
      ? `${Math.min(Math.max(mirrorW + 4, 64), 120)}px`
      : "84px";
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [pendapat, pendapatFocused, open]);

  const handleSavePendapat = (text: string) => {
    if (!post?.id || !reposted) return;
    if (text.trim() === (myServerPendapat ?? "")) return;
    savePendapat({ postId: post.id, pendapat: text.trim() });
  };

  // Autosimpan saat berhenti ketik 800ms (pengaman biar refresh tidak hilang).
  useEffect(() => {
    if (!open || !pendapatTouched.current) return;
    const t = window.setTimeout(() => {
      handleSavePendapat(pendapat);
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendapat, open]);

  // Tutup modal sambil menyimpan pendapat yang belum tersimpan.
  const handleCloseModal = () => {
    if (pendapatTouched.current) handleSavePendapat(pendapat);
    onClose();
  };

  // Gantian audio/lokasi tiap 3 detik (hanya kalau dua-duanya ada) — kayak kotak home.
  // audio = judul musik ATAU "Audio Asli".
  useEffect(() => {
    if (!audioLabel || !post?.location || !open) return;
    const t = window.setInterval(() => setShowMusic((v) => !v), 3000);
    return () => window.clearInterval(t);
  }, [audioLabel, post?.location, open]);

  // Lagu postingan: default mati, bunyi saat buletan volume dinyalakan.
  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    if (!musicMuted && post?.musicUrl && open) {
      if (audio.src !== post.musicUrl) audio.src = post.musicUrl;
      audio.loop = true;
      audio.play().catch(() => setMusicMuted(true));
    } else {
      audio.pause();
    }
    return () => {
      audio.pause();
    };
  }, [musicMuted, post?.musicUrl, open]);

  // Sinkron mute + play/pause video modal.
  // - Video + musik pilihan = asli selalu mute (yang bunyi musiknya).
  // - Audio Asli = ikut saklar volume modal (ngikutin kotak feed saat dibuka).
  // - Main hanya kalau modal terbuka + slide aktif + tidak di-pause via tap.
  useEffect(() => {
    if (!open) return;
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      const shouldMute = post?.musicUrl ? true : musicMuted;
      if (v.muted !== shouldMute) v.muted = shouldMute;
      const shouldPlay = idx === activeIndex && !pausedByTap;
      if (shouldPlay) v.play().catch(() => {});
      else v.pause();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, pausedByTap, musicMuted, post?.musicUrl, medias.length]);

  // Ganti slide di modal → reset jeda manual, slide baru langsung main.
  useEffect(() => {
    if (!open) return;
    setPaused(false);
    hideOverlayIcon();
    setVideoProgress(0);
    seekingRef.current = false;
    setIsSeeking(false);
    resetPlaybackRate();
    // Sinkronkan progress dengan posisi video baru (kalau sudah pernah diputar).
    const v = videoRefs.current[activeIndex];
    if (v && v.duration && Number.isFinite(v.duration) && v.duration > 0) {
      setVideoProgress(
        Math.max(0, Math.min(1, v.currentTime / v.duration)),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Auto-matikan saat pindah tab / keluar web (bukan logout).
  // Supaya musik modal tidak jalan terus di background.
  useEffect(() => {
    const pauseNow = () => {
      musicAudioRef.current?.pause();
      videoRefs.current.forEach((v) => v?.pause());
      setMusicMuted(true);
      clearLongPressTimer();
      fastForwardRef.current = false;
      setIsFastForward(false);
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
  }, []);

  const handleDeletePost = () => {
    if (!post?.id || !isMine || deletePending) return;
    const targetId = post.id;
    setMenuOpen(false);
    Swal.fire({
      title: "Hapus postingan?",
      text: "Postingan yang dihapus tidak bisa dikembalikan.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e53e3e",
    }).then((result) => {
      if (!result.isConfirmed) return;
      deletePost(targetId, {
        onSuccess: () => onClose(),
      });
    });
  };

  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Abaikan klik yang muncul setelah tahan-lama 2x (press-hold-release).
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      if (clickTimerRef.current) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      return;
    }
    // Tap 1x pada video → pause/play + ikon tengah 1 detik (sama kayak feed).
    // Tap 2x → love + like (tanpa toggle pause).
    if (e.detail === 1) {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = window.setTimeout(() => {
        const currentMedia = medias?.[activeIndex];
        if (
          !currentMedia ||
          !isVideoUrl(
            currentMedia.url,
            (currentMedia as { type?: string }).type,
          ) ||
          !open
        )
          return;
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

  const handleScroll = () => {
    const el = sliderRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.min(index, Math.max(medias.length - 1, 0)));
  };

  // Bersihkan timer tap saat modal unmount.
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      clearPauseIconTimers();
      clearLongPressTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = (index: number) => {
    const el = sliderRef.current;
    if (!el || !medias.length) return;
    const clamped = Math.max(0, Math.min(index, medias.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActiveIndex(clamped);
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(
      { content: newComment, postId: post.id, parentId: replyTo?.id },
      {
        onSuccess: () => {
          setNewComment("");
          setReplyTo(null);
        },
      },
    );
  };

  const handleBalasComment = (comment: CommentResponse) => {
    setReplyTo(comment);
    setNewComment(`@${comment.user?.username || comment.user?.name || "user"} `);
  };



  return (
    <>
    <Dialog.Root
      open={open}
      onOpenChange={(e) => !e.open && handleCloseModal()}
      size="xl"
      placement="center"
    >
          <Dialog.Backdrop bg="blackAlpha.800" />
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
          {/* X di pojok kanan atas layar, di luar kotak (biar tidak numpuk titik tiga) */}
          {open && (
            <IconButton
              aria-label="Tutup"
              variant="ghost"
              position="fixed"
              top={4}
              right={4}
              zIndex={1500}
              color="white"
              borderRadius="full"
              _hover={{ bg: "whiteAlpha.200" }}
              onClick={handleCloseModal}
            >
              <X size={24} />
            </IconButton>
          )}
      <Dialog.Positioner p={6}>
        <Dialog.Content
          maxW="1000px"
          w="full"
          h="85vh"
          maxH="750px"
          minH="520px"
          bg="var(--app-card)"
          borderRadius="xl"
          overflow="hidden"
          p={0}
        >
          <Flex h="full">
            {/* ===== MEDIA (KIRI) ===== */}
            <Box
              flex={1}
              bg="var(--app-card)"
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
              onMouseEnter={() => setIsMediaHovered(true)}
              onMouseLeave={() => {
                setIsMediaHovered(false);
                exitFastForward();
              }}
            >
              {medias.length > 0 ? (
                <>
                  <Flex
                    ref={sliderRef}
                    overflowX="auto"
                    overflowY="hidden"
                    w="full"
                    h="full"
                    onScroll={handleScroll}
                    onClick={handleMediaClick}
                    onContextMenu={(e) => e.preventDefault()}
                    onPointerDown={(e) => {
                      if (e.pointerType === "mouse" && e.button !== 0) return;
                      pressStartRef.current = { x: e.clientX, y: e.clientY };
                      if (!open) return;
                      const cur = medias?.[activeIndex];
                      if (
                        !cur ||
                        !isVideoUrl(cur.url, (cur as { type?: string }).type)
                      )
                        return;
                      clearLongPressTimer();
                      longPressTimerRef.current = window.setTimeout(() => {
                        enterFastForward();
                      }, 450);
                    }}
                    onPointerMove={(e) => {
                      const start = pressStartRef.current;
                      if (!start) return;
                      const dx = e.clientX - start.x;
                      const dy = e.clientY - start.y;
                      if (dx * dx + dy * dy > 144) {
                        // Geser carousel / swipe → bukan tahan-lama & bukan tap.
                        clearLongPressTimer();
                        swipeRef.current = true;
                      }
                    }}
                    onPointerUp={() => {
                      const wasSwipe = swipeRef.current;
                      pressStartRef.current = null;
                      swipeRef.current = false;
                      clearLongPressTimer();
                      if (wasSwipe) suppressClickRef.current = true;
                      exitFastForward();
                    }}
                    onPointerCancel={() => {
                      pressStartRef.current = null;
                      swipeRef.current = false;
                      clearLongPressTimer();
                      exitFastForward();
                    }}
                    css={{
                      scrollSnapType: "x mandatory",
                      "&::-webkit-scrollbar": { display: "none" },
                      msOverflowStyle: "none",
                      scrollbarWidth: "none",
                    }}
                  >
                    {medias.map((media, i) => {
                      const mediaType = (media as { type?: string }).type;
                      const isVid = isVideoUrl(media.url, mediaType);
                      return (
                        <Box
                          key={media.id}
                          minW="100%"
                          scrollSnapAlign="start"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {isVid ? (
                            <video
                              src={media.url}
                              muted={videoMuted}
                              ref={(el) => {
                                videoRefs.current[i] = el;
                                if (el) el.muted = videoMuted;
                              }}
                              loop
                              playsInline
                              preload="metadata"
                              controls={false}
                              onCanPlay={(e) => {
                                if (!open || pausedByTap || i !== activeIndex) return;
                                e.currentTarget.play().catch(() => {});
                              }}
                              onTimeUpdate={(e) => {
                                if (i !== activeIndex || seekingRef.current) return;
                                const v = e.currentTarget;
                                if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                                  setVideoProgress(
                                    Math.max(0, Math.min(1, v.currentTime / v.duration)),
                                  );
                                }
                              }}
                              onSeeked={(e) => {
                                if (i !== activeIndex) return;
                                const v = e.currentTarget;
                                if (v.duration && Number.isFinite(v.duration) && v.duration > 0) {
                                  setVideoProgress(
                                    Math.max(0, Math.min(1, v.currentTime / v.duration)),
                                  );
                                }
                              }}
                              onLoadedMetadata={(e) => {
                                const v = e.currentTarget;
                                setOrientations((prev) => ({
                                  ...prev,
                                  [i]:
                                    v.videoWidth >= v.videoHeight
                                      ? "landscape"
                                      : "portrait",
                                }));
                              }}
                              style={
                                orientations[i] === "portrait"
                                  ? {
                                      height: "100%",
                                      width: "auto",
                                      objectFit: "contain",
                                    }
                                  : {
                                      width: "100%",
                                      height: "auto",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                    }
                              }
                            />
                          ) : (
                            <Image
                              src={media.url}
                              alt="Post Media"
                              onLoad={(e) => {
                                const img = e.currentTarget;
                                setOrientations((prev) => ({
                                  ...prev,
                                  [i]:
                                    img.naturalWidth >= img.naturalHeight
                                      ? "landscape"
                                      : "portrait",
                                }));
                              }}
                              style={
                                orientations[i] === "portrait"
                                  ? {
                                      height: "100%",
                                      width: "auto",
                                      objectFit: "contain",
                                    }
                                  : {
                                      width: "100%",
                                      height: "auto",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                    }
                              }
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Flex>

                  {/* Ikon tengah tap video — sama kayak kotak feed.
                      Pause → segitiga, resume → garis 2.
                      Animasi slow, tampil 1 detik lalu hilang sendiri. */}
                  {pauseIconVisible &&
                    open &&
                    (() => {
                      const cur = medias?.[activeIndex];
                      return (
                        !!cur &&
                        isVideoUrl(
                          cur.url,
                          (cur as { type?: string }).type,
                        )
                      );
                    })() && (
                      <Flex
                        position="absolute"
                        inset={0}
                        align="center"
                        justify="center"
                        zIndex={15}
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

                  {/* Badge 2x saat tahan-lama (kursor/jari), lepas kembali normal. */}
                  {isFastForward && open && activeIsVideo && (
                    <Flex
                      position="absolute"
                      top={3}
                      left="50%"
                      transform="translateX(-50%)"
                      zIndex={16}
                      pointerEvents="none"
                    >
                      <Box
                        bg="blackAlpha.600"
                        color="white"
                        fontSize="xs"
                        fontWeight="bold"
                        px={3}
                        py={1}
                        borderRadius="full"
                      >
                        2x
                      </Box>
                    </Flex>
                  )}

                  {/* Garis progress video ala reels/tiktok di bawah video.
                      Hanya muncul saat kursor di video (hover), saat digeser,
                      saat ikon tap tampil, atau saat 2x. Putih berjalan ke
                      depan, bisa diklik/digeser maju-mundur. */}
                  {open &&
                    activeIsVideo &&
                    (isMediaHovered ||
                      isSeeking ||
                      pauseIconVisible ||
                      isFastForward) && (
                    <Box
                      position="absolute"
                      left={0}
                      right={0}
                      bottom={0}
                      zIndex={9}
                      px={3}
                      pt={6}
                      pb={2}
                      style={{
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
                        animation: "fadeSlideIn 0.2s ease",
                      }}
                      onMouseEnter={() => setIsBarHovered(true)}
                      onMouseLeave={() => setIsBarHovered(false)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Box
                        ref={barRef}
                        position="relative"
                        h="16px"
                        display="flex"
                        alignItems="center"
                        cursor="pointer"
                        touchAction="none"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          (e.currentTarget as HTMLElement).setPointerCapture?.(
                            e.pointerId,
                          );
                          seekingRef.current = true;
                          setIsSeeking(true);
                          seekActiveVideoTo(fractionFromClientX(e.clientX));
                        }}
                        onPointerMove={(e) => {
                          if (!seekingRef.current) return;
                          e.stopPropagation();
                          seekActiveVideoTo(fractionFromClientX(e.clientX));
                        }}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          seekingRef.current = false;
                          setIsSeeking(false);
                        }}
                        onPointerCancel={(e) => {
                          e.stopPropagation();
                          seekingRef.current = false;
                          setIsSeeking(false);
                        }}
                      >
                        {/* rel */}
                        <Box
                          position="absolute"
                          left={0}
                          right={0}
                          h={isBarHovered || isSeeking ? "4px" : "3px"}
                          bg="whiteAlpha.400"
                          borderRadius="full"
                        />
                        {/* garis putih berjalan */}
                        <Box
                          position="absolute"
                          left={0}
                          h={isBarHovered || isSeeking ? "4px" : "3px"}
                          w={`${Math.max(0, Math.min(1, videoProgress)) * 100}%`}
                          bg="var(--app-card)"
                          borderRadius="full"
                        />
                        {/* dot pegangan */}
                        <Box
                          position="absolute"
                          w={isBarHovered || isSeeking ? "12px" : "0px"}
                          h={isBarHovered || isSeeking ? "12px" : "0px"}
                          borderRadius="full"
                          bg="var(--app-card)"
                          shadow="md"
                          opacity={isBarHovered || isSeeking ? 1 : 0}
                          style={{
                            left: `calc(${Math.max(0, Math.min(1, videoProgress)) * 100}% - 6px)`,
                            transition: "opacity 0.15s ease, width 0.15s ease, height 0.15s ease",
                          }}
                        />
                      </Box>
                    </Box>
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
                        size={80}
                        color="red"
                        fill="red"
                        style={{
                          animation: "heartPop 0.8s ease forwards",
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                        }}
                      />
                    </Box>
                  )}

                  {medias.length > 1 && (
                    <>
                      <IconButton
                        aria-label="Media sebelumnya"
                        size="sm"
                        position="absolute"
                        left={3}
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
                        aria-label="Media berikutnya"
                        size="sm"
                        position="absolute"
                        right={3}
                        top="50%"
                        transform="translateY(-50%)"
                        bg="blackAlpha.500"
                        color="white"
                        borderRadius="full"
                        zIndex={5}
                        _hover={{ bg: "blackAlpha.700" }}
                        disabled={activeIndex === medias.length - 1}
                        onClick={() => scrollTo(activeIndex + 1)}
                      >
                        <ChevronRight size={18} />
                      </IconButton>
                      <HStack
                        position="absolute"
                        bottom={4}
                        left="50%"
                        transform="translateX(-50%)"
                        gap={1}
                        zIndex={10}
                      >
                        {medias.map((_, i) => (
                          <Box
                            key={i}
                            w="7px"
                            h="7px"
                            borderRadius="full"
                            bg={i === activeIndex ? "black" : "transparent"}
                            border={i === activeIndex ? "none" : "1px solid black"}
                          />
                        ))}
                      </HStack>
                    </>
                  )}
                </>
              ) : (
                <Text color="white" fontSize="sm">Tidak ada media</Text>
              )}

              {/* Buletan volume off/on: kanan bawah media.
                  Muncul kalau ada musik pilihan ATAU video (Audio Asli).
                  Video + musik = video selalu mute, yang bunyi musiknya.
                  Video tanpa musik = saklar ini ngatur suara asli videonya. */}
              {(post?.musicUrl || isVideoPost) && medias.length > 0 && (
                <Box position="absolute" right={3} bottom={3} zIndex={10}>
                  <Box
                    as="button"
                    aria-label={
                      musicMuted
                        ? post?.musicUrl
                          ? "Nyalakan musik"
                          : "Nyalakan audio asli"
                        : post?.musicUrl
                          ? "Matikan musik"
                          : "Matikan audio asli"
                    }
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
                    onClick={() => setMusicMuted((v) => !v)}
                  >
                    {musicMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </Box>
                </Box>
              )}
              <audio ref={musicAudioRef} preload="none" loop />

              {/* Kotak pendapat + badge repost: nempel & bergerak bareng (khusus /profile sendiri) */}
              {/* Badge Repost: pp avatar + buletan biru icon repost di kiri bawah media */}
              {(() => {
                const seen = new Set<string>();
                const avatars: { id: string; name: string; avatar: string; pendapat?: string | null }[] = [];
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
                      pendapat: r.pendapat ?? null,
                    });
                    seen.add(r.id);
                  }
                }
                const myId = profile?.id || "me";
                // Tampilan lama untuk /profile/[username]: deretan badge 68px.
                if (!isOwnProfile) {
                  const shown = avatars.slice(0, 3);
                  if (shown.length === 0 || medias.length === 0) return null;
                  return (
                    <Box
                      position="absolute"
                      bottom={20}
                      left={3}
                      zIndex={10}
                      css={{ animation: "repostFloat 3s ease-in-out infinite" }}
                    >
                      <HStack gap={5}>
                        {shown.map((r) => (
                          <Box key={r.id} position="relative" w="68px" h="68px">
                            <Image
                              src={r.avatar}
                              alt={`Direpost oleh ${r.name}`}
                              w="full"
                              h="full"
                              objectFit="cover"
                              borderRadius="full"
                              border="3px solid white"
                              shadow="md"
                            />
                            <Box
                              position="absolute"
                              bottom={-2}
                              right={-2}
                              bg="blue.600"
                              borderRadius="full"
                              p={2}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              border="2px solid white"
                            >
                              <Repeat2 size={18} color="white" />
                            </Box>
                          </Box>
                        ))}
                      </HStack>
                    </Box>
                  );
                }
                // /profile sendiri: hanya badge avatar + buletan biru repost.
                // Kotak "Tambahkan pendapat..." sengaja tidak ditampilkan.
                const showMe = reposted;
                const others = avatars
                  .filter((a) => a.id !== myId)
                  .slice(0, showMe ? 2 : 3);
                if ((!showMe && others.length === 0) || medias.length === 0)
                  return null;
                const renderBadge = (avatar: string, name: string, key: string) => (
                  <Box key={key} position="relative" w="40px" h="40px">
                    <Image
                      src={avatar}
                      alt={`Direpost oleh ${name}`}
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
                );
                return (
                  <Box
                    position="absolute"
                    bottom={3}
                    left={3}
                    zIndex={10}
                    css={{ animation: "repostFloat 3s ease-in-out infinite" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HStack align="end" gap={3}>
                      {showMe &&
                        renderBadge(profile?.avatar || "/default-avatar.jpg", "Anda", myId)}
                      {others.map((a) => renderBadge(a.avatar, a.name, a.id))}
                    </HStack>
                  </Box>
                );
              })()}
            </Box>

            {/* ===== PANEL KANAN ===== */}
            <Flex w="380px" borderLeftWidth="1px" borderColor="var(--app-border)" direction="column" position="relative">
              {/* Header User: avatar + username + equalizer musik/lokasi | titik tiga */}
              <HStack gap={3} p={4} borderBottomWidth="1px" borderColor="var(--app-subtle)" align="center">
                <StoryAvatar
                  userId={post.user?.id}
                  username={post.user?.username}
                  avatarUrl={post.user?.avatar}
                  size={36}
                  onBeforeNavigate={handleCloseModal}
                  fallbackHref={`/profile/${post.user?.username}`}
                />
                <VStack align="start" gap={0} flex={1} minW={0}>
                  <NextLink href={`/profile/${post.user?.username}`} onClick={handleCloseModal}>
                    <Text fontWeight="bold" fontSize="sm" color="var(--app-text)" truncate>
                      {post.user?.username || post.user?.name || "User"}
                    </Text>
                  </NextLink>
                  {showMusicNow && audioLabel ? (
                    <Box
                      key="music"
                      style={{ animation: "fadeSlideIn 0.4s ease" }}
                    >
                      <HStack gap={1.5} maxW="220px">
                        <EqualizerBars dark />
                        <Text fontSize="xs" color="var(--app-text)" fontWeight="medium" truncate>
                          {audioLabel}
                        </Text>
                      </HStack>
                    </Box>
                  ) : hasLoc ? (
                    <Box
                      key="loc"
                      style={{ animation: "fadeSlideIn 0.4s ease" }}
                    >
                      <HStack gap={1} maxW="220px">
                        <MapPin size={11} color="var(--app-muted)" />
                        <Text fontSize="xs" color="var(--app-muted)" truncate>
                          {post.location}
                        </Text>
                      </HStack>
                    </Box>
                  ) : (
                    <Text fontSize="xs" color="var(--app-muted)">
                      {timeAgo(post.createdAt)}
                    </Text>
                  )}
                </VStack>
                {isOwnProfile &&
                  (isMine ? (
                <Box position="relative" flexShrink={0}>
                  <IconButton
                    aria-label="Opsi postingan"
                    variant="ghost"
                    size="sm"
                    color="var(--app-text)"
                    _hover={{ bg: "var(--app-subtle)" }}
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <MoreHorizontal size={18} />
                  </IconButton>
                  {menuOpen && (
                    <>
                      <Box
                        position="fixed"
                        inset={0}
                        zIndex={40}
                        bg="transparent"
                        onClick={() => setMenuOpen(false)}
                      />
                      <VStack
                        position="absolute"
                        top="36px"
                        right={0}
                        zIndex={41}
                        bg="var(--app-card)"
                        borderRadius="xl"
                        boxShadow="lg"
                        border="1px solid"
                        borderColor="var(--app-border)"
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
                          onClick={handleDeletePost}
                        >
                          <Trash2 size={16} /> {deletePending ? "Menghapus..." : "Hapus Postingan"}
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
                </Box>
                  ) : ownerId ? (
                    <Text
                      as="button"
                      fontSize="sm"
                      fontWeight="bold"
                      color={following ? "var(--app-muted)" : "blue.600"}
                      cursor={followMutation.isPending ? "not-allowed" : "pointer"}
                      opacity={followMutation.isPending ? 0.6 : 1}
                      _hover={{ textDecoration: "underline" }}
                      onClick={handleToggleFollow}
                      flexShrink={0}
                    >
                      {following ? "Mengikuti" : "Ikuti"}
                    </Text>
                  ) : null)}
              </HStack>

              {/* Isi + Komentar */}
              <Box flex={1} overflowY="auto" px={4}>
                {post.content && (
                  <HStack align="start" gap={3} pt={4}>
                    <Box w="32px" h="32px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" flexShrink={0}>
                      <Image
                        src={post.user?.avatar || "/default-avatar.jpg"}
                        alt="Profile Picture"
                        objectFit="cover"
                        w="full"
                        h="full"
                      />
                    </Box>
                    <Text fontSize="sm" color="var(--app-text)">
                      <Text as="span" fontWeight="bold">
                        {post.user?.username || post.user?.name || "User"}
                      </Text>{" "}
                      {post.content}
                    </Text>
                  </HStack>
                )}

                <PostComments
                  comments={post.comments as CommentResponse[]}
                  postId={post.id}
                  showSeparator={false}
                  showInput={false}
                  replyTo={replyTo}
                  onReplyToChange={setReplyTo}
                  onBalas={handleBalasComment}
                />
              </Box>

              {/* Garis panjang */}
              <Separator borderColor="var(--app-border)" />

              {/* Aksi */}
              <Box pt={3} px={4}>
                <HStack justify="space-between">
                  <HStack gap={5}>
                    <HStack
                      gap={2}
                      color={liked ? "red.500" : "var(--app-secondary)"}
                      cursor="pointer"
                      onClick={() => toggleLikeMutation.mutate(post.id)}
                      _hover={{ color: "red.400" }}
                    >
                      <Heart size={20} fill={liked ? "currentColor" : "none"} />
                      <Text fontSize="sm">{totalLikes}</Text>
                    </HStack>
                    <HStack gap={2} color="var(--app-secondary)">
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
                      <Repeat2 size={20} fill={reposted ? "currentColor" : "none"} />
                      <Text fontSize="sm">{totalReposts}</Text>
                    </HStack>
                    {/* Ikon pesan di sebelah Repost (sama kayak kotak postingan):
                        pencet -> buka kotak tengah Berbagi. */}
                    <HStack
                      gap={2}
                      color="var(--app-secondary)"
                      cursor="pointer"
                      onClick={() => setIsShareOpen(true)}
                      _hover={{ color: "blue.500" }}
                    >
                      <Send size={20} />
                    </HStack>
                  </HStack>
                  <Box
                    color={saved ? "blue.600" : "var(--app-secondary)"}
                    cursor="pointer"
                    onClick={() => toggleSaveMutation.mutate(post.id)}
                    _hover={{ color: "blue.500" }}
                  >
                    <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
                  </Box>
                </HStack>

                {/* Disukai oleh */}
                {(() => {
                  const validLikes = post.likes?.filter((like) => like.user?.name) ?? [];
                  if (validLikes.length === 0) return null;
                  const firstLiker = validLikes[0].user;
                  const others = totalLikes > 0 ? totalLikes - 1 : validLikes.length - 1;
                  return (
                    <Text fontSize="sm" color="var(--app-text)" mt={3}>
                      Disukai oleh{" "}
                      <NextLink
                        href={`/profile/${firstLiker.username}`}
                        onClick={handleCloseModal}
                        style={{ fontWeight: "bold", color: "var(--app-text)" }}
                      >
                        {firstLiker.username || firstLiker.name}
                      </NextLink>
                      {others > 0 && (
                        <>
                          {" "}dan{" "}
                          <Text
                            as="span"
                            fontWeight="bold"
                            cursor="pointer"
                            _hover={{ textDecoration: "underline" }}
                            onClick={() => setIsLikesOpen(true)}
                          >
                            {others} lainnya
                          </Text>
                        </>
                      )}
                    </Text>
                  );
                })()}

                {/* Jadwal pembuatan postingan ala feed (khusus /profile sendiri) */}
                {isOwnProfile && (
                  <Text fontSize="xs" color="var(--app-muted)" mt={2}>
                    {timeAgo(post.createdAt)}
                  </Text>
                )}
              </Box>

              {/* Kolom Komentar: avatar user + input + emoji + kirim */}
              <Box px={4} pb={4} pt={3} position="relative">
                {isOwnProfile && emojiOpen && (
                  <>
                    <Box
                      position="fixed"
                      inset={0}
                      zIndex={40}
                      bg="transparent"
                      onClick={() => setEmojiOpen(false)}
                    />
                    <Box
                      position="absolute"
                      bottom="60px"
                      right={3}
                      zIndex={41}
                      bg="var(--app-card)"
                      borderRadius="xl"
                      boxShadow="lg"
                      border="1px solid"
                      borderColor="var(--app-border)"
                      p={3}
                      w="260px"
                    >
                      <Flex wrap="wrap" gap={1} maxH="180px" overflowY="auto">
                        {EMOJIS.map((emoji) => (
                          <Box
                            key={emoji}
                            as="button"
                            fontSize="xl"
                            w="32px"
                            h="32px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            borderRadius="md"
                            cursor="pointer"
                            _hover={{ bg: "var(--app-subtle)" }}
                            onClick={() => setNewComment((prev) => prev + emoji)}
                          >
                            {emoji}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  </>
                )}
                {replyTo && (
                  <HStack gap={2} align="center" pb={2}>
                    <Text fontSize="xs" color="blue.500" fontWeight="bold">
                      Membalas @{replyTo.user?.username || replyTo.user?.name || "user"}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="var(--app-faint)"
                      cursor="pointer"
                      _hover={{ color: "var(--app-secondary)" }}
                      onClick={() => setReplyTo(null)}
                    >
                      ✕
                    </Text>
                  </HStack>
                )}
                <HStack gap={2}>
                  <Box w="32px" h="32px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" flexShrink={0}>
                    <Image
                      src={profile?.avatar || "/default-avatar.jpg"}
                      alt="Avatar Anda"
                      objectFit="cover"
                      w="full"
                      h="full"
                    />
                  </Box>
                  <Input
                    placeholder={isOwnProfile ? "Tambahkan komentar..." : "Tulis Komentar..."}
                    size="sm"
                    variant="subtle"
                    bg="var(--app-hover)"
                    color="blue.900"
                    _placeholder={{ color: "blue.400" }}
                    borderRadius="full"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  />
                  {isOwnProfile && (
                    <IconButton
                      aria-label="Pilih emoji"
                      variant="ghost"
                      size="sm"
                      color="var(--app-muted)"
                      borderRadius="full"
                      _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                      onClick={() => setEmojiOpen((v) => !v)}
                    >
                      <Smile size={20} />
                    </IconButton>
                  )}
                  <Button
                    size="sm"
                    colorPalette="blue"
                    borderRadius="full"
                    onClick={handleSendComment}
                    disabled={!newComment.trim()}
                  >
                    <Send size={14} />
                  </Button>
                </HStack>
              </Box>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>

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
                  <NextLink
                    key={like.id}
                    href={`/profile/${like.user.username}`}
                    onClick={() => {
                      setIsLikesOpen(false);
                      handleCloseModal();
                    }}
                  >
                    <HStack gap={3} p={2} borderRadius="md" _hover={{ bg: "var(--app-input)" }}>
                      <Box w="40px" h="40px" borderRadius="full" overflow="hidden">
                        <Image
                          src={like.user.avatar || "/default-avatar.jpg"}
                          alt={like.user.name}
                          w="full"
                          h="full"
                          objectFit="cover"
                        />
                      </Box>
                      <Text fontWeight="medium" color="var(--app-text)" fontSize="sm">
                        {like.user.username || like.user.name}
                      </Text>
                    </HStack>
                  </NextLink>
                ))}
            </VStack>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>

    {/* Kotak tengah Berbagi (ikon pesan di sebelah Repost). */}
    {post?.id ? (
      <SharePostModal
        post={post}
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    ) : null}
    </>
  );
};

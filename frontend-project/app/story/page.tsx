"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Box, Flex, Text, IconButton, Spinner } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Copy,
  Trash2,
  Check,
  Music,
  Smile,
  Type,
  Star,
  Globe,
} from "lucide-react";
import { api } from "@/app/lib/axios";
import { useGetPostById } from "@/app/(main)/post/post.service";
import { MusicPlayingIcon } from "@/app/(main)/messages/NotesBar";
import { LayoutPicker, StoryLayoutCount } from "./components/LayoutPicker";
import { StoryUploadToast } from "./components/StoryUploadToast";
import { MusicPanel } from "./components/MusicPanel";
import { TextPanel } from "./components/TextPanel";
import { StoryTextSticker } from "./components/StoryTextSticker";
import { StoryTextValue } from "./text-styles";
import { KaraokeLyrics } from "./components/KaraokeLyrics";
import { SpotifyTrack } from "./spotify.service";
import {
  completeStoryUpload,
  failStoryUpload,
  setStoryUploadProgress,
  startStoryUpload,
} from "./story-upload-store";

// ---------- helpers (disalin dari CreateStoryModal biar /story mandiri) ----------

const compressStoryImage = (file: File, maxDim = 1280, quality = 0.82): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const imgEl = new window.Image();
    imgEl.onload = () => {
      let { width, height } = imgEl;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(imgEl, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
              }),
            );
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality,
      );
    };
    imgEl.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    imgEl.src = objectUrl;
  });
};

const getVideoDurationSec = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Tidak dapat membaca durasi video"));
    };
    video.src = objectUrl;
  });
};

const uploadOneStoryFile = (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; publicId: string; type: "image" | "video" }> => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/upload/cloudinary", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      ...(onProgress
        ? {
            onUploadProgress: (e: { loaded: number; total?: number }) => {
              if (e.total) onProgress(Math.round((e.loaded / e.total) * 100));
            },
          }
        : {}),
    })
    .then((res) => {
      const url = res.data?.secure_url || res.data?.file_url;
      const publicId = res.data?.public_id || res.data?.file_name;
      if (!url || !publicId) throw new Error("Gagal mendapatkan URL Cloudinary");
      return {
        url,
        publicId,
        type: (file.type.startsWith("video") ? "video" : "image") as
          | "image"
          | "video",
      };
    });
};

const layoutToBackend = (count: StoryLayoutCount) => {
  if (count === 2) return "split2";
  if (count === 3) return "grid3";
  if (count === 4) return "grid4";
  return "single";
};

// ---------- tipe cell ----------

interface CellData {
  file: File;
  url: string;
  kind: "image" | "video";
}

const emptyCells = (count: StoryLayoutCount): (CellData | null)[] =>
  Array.from({ length: count }, () => null);

// ---------- halaman ----------

function StoryPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Query dibaca reaktif (bukan sekali saat mount) supaya navigasi
  // client-side dari kotak "Berbagi" langsung kepakai tanpa reload.
  const searchParams = useSearchParams();
  const queryPostId = searchParams.get("postId");

  // Mode bagikan postingan gambar: /story?postId=... dari kotak "Berbagi".
  // Langsung masuk tahap hias: kotak gambar (slide 1) + musik terkunci,
  // user tinggal tulis teks lalu kirim.
  const [sharePostId, setSharePostId] = useState<string | null>(queryPostId);
  const [shareFailed, setShareFailed] = useState(false);
  const [postShare, setPostShare] = useState<{
    postId: string;
    ownerUsername: string;
    ownerAvatar: string | null;
    mediaCount: number;
    isVideo: boolean;
    videoUrl: string | null;
    hasLenteraMusic: boolean;
  } | null>(null);
  const postShareInitRef = useRef(false);
  const prevShareRef = useRef<string | null>(null);
  // Skala kotak postingan (cubit 2 jari, 0.5-2x). Tetap di tengah,
  // tidak bisa dipindahkan. Ikut tersimpan ke story untuk viewer.
  const [postScale, setPostScale] = useState(1);
  // Rasio kotak ngikutin frame postingan (asli/1:1/4:5/16:9), dideteksi
  // dari dimensi gambar saat dimuat.
  const [postAspect, setPostAspect] = useState("4 / 5");
  // Audiens story ala IG Close Friend: public = semua bisa lihat (default),
  // close = hanya teman dekat (dari /akun/teman_dekat).
  const [audience, setAudience] = useState<"public" | "close">("public");
  const postScaleRef = useRef(1);
  const postBoxRef = useRef<HTMLDivElement | null>(null);
  const postPinchRef = useRef<{
    startDist: number;
    startScale: number;
  } | null>(null);
  const { data: sharePostData, isLoading: sharePostLoading, isError: sharePostError } =
    useGetPostById(sharePostId);

  // Sinkron saat query berubah + reset mode share kalau query hilang/berganti.
  useEffect(() => {
    if (prevShareRef.current !== queryPostId) {
      prevShareRef.current = queryPostId;
      postShareInitRef.current = false;
      setPostShare(null);
      setShareFailed(false);
      setPostScale(1);
      postScaleRef.current = 1;
      setPostAspect("4 / 5");
      if (!queryPostId) {
        setCells(emptyCells(1));
        setLayout(1);
        setActiveCell(0);
        setDecorate(false);
        setPendingCheck(false);
        setMusic(null);
        setTextSticker(null);
        setAudience("public");
      }
    }
    setSharePostId(queryPostId);
  }, [queryPostId]);

  const [layout, setLayout] = useState<StoryLayoutCount>(1);
  const [cells, setCells] = useState<(CellData | null)[]>(emptyCells(1));
  const [activeCell, setActiveCell] = useState(0);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recElapsed, setRecElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  // Tahap hias: true kalau semua kotak sudah terisi dan user lanjut ke
  // alat musik/emoji/pen. pendingCheck: buletan warna-warni centang
  // (pengganti buletan putih) untuk jalur upload galeri.
  const [decorate, setDecorate] = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);
  // Stiker musik pilihan (opsional, ikut ke-upload).
  // startSec = detik mulai potongan 15 detik ala IG (mis. 45 = main 45-60).
  // mode: none = audio saja, lyrics = baris lirik, vinyl = piringan berputar.
  // x/y = posisi stiker persen 0-100 di kanvas, scale = ukuran 0.5-2.
  const [musicOpen, setMusicOpen] = useState(false);
  const [music, setMusic] = useState<(SpotifyTrack & { startSec: number; mode: "none" | "lyrics" | "vinyl"; lyrics: string | null; x: number | null; y: number | null; scale: number }) | null>(null);
  // Stiker teks pilihan (opsional, ikut ke-upload).
  // x/y = posisi persen 0-100 di kanvas, scale = ukuran 0.5-2.
  const [textOpen, setTextOpen] = useState(false);
  const [textSticker, setTextSticker] = useState<StoryTextValue | null>(null);
  // Preview berulang setelah centang: musik terus tersetel loop potongan 15 detik
  // selama di tahap hias (decorate), berhenti saat panel dibuka / musik dihapus.
  const musicPreviewRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stickerDragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  const textDragRef = useRef<{ id: number; dx: number; dy: number } | null>(null);
  // Stiker yang terakhir disentuh — cubit 2 jari mengatur skala stiker ini.
  const activeStickerRef = useRef<"music" | "text">("music");
  // Drag 1 jari: stiker yang sedang diatur + apakah di atas tong sampah.
  // Hapus dengan animasi melebur: deletingSticker dulu, lalu state dibersihkan.
  const [draggingSticker, setDraggingSticker] = useState<"music" | "text" | null>(null);
  const [trashHover, setTrashHover] = useState(false);
  const [deletingSticker, setDeletingSticker] = useState<"music" | "text" | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);

  // Cek apakah posisi jari masuk area tong sampah (dengan padding).
  const isOverTrash = (clientX: number, clientY: number) => {
    const r = trashRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 24;
    return (
      clientX >= r.left - pad &&
      clientX <= r.right + pad &&
      clientY >= r.top - pad &&
      clientY <= r.bottom + pad
    );
  };
  // Pinch-zoom 2 jari: HP (touch) + touchpad laptop (wheel + ctrl).
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const scaleRef = useRef(1);
  const stickerOnRef = useRef(false);
  const textStickerRef = useRef<StoryTextValue | null>(null);
  const musicVisibleRef = useRef(false);
  // Sinkron ref di effect (bukan saat render) untuk handler cubit native.
  useEffect(() => {
    textStickerRef.current = textSticker;
    musicVisibleRef.current = !!music && music.mode !== "none";
    scaleRef.current =
      activeStickerRef.current === "text" ? (textSticker?.scale ?? 1) : (music?.scale ?? 1);
    stickerOnRef.current =
      (musicVisibleRef.current || !!textSticker) && (decorate || pendingCheck);
  });

  // Terapkan skala cubit ke stiker aktif (terakhir disentuh).

  // Listener native (passive: false) supaya preventDefault cubit berfungsi.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const clampScale = (s: number) => Math.max(0.5, Math.min(2, s));
    const touchDist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const applyStickerScale = (s: number) => {
      scaleRef.current = s;
      const rounded = Math.round(s * 100) / 100;
      if (activeStickerRef.current === "text" && textStickerRef.current) {
        setTextSticker((prev) => (prev ? { ...prev, scale: rounded } : prev));
      } else if (activeStickerRef.current === "music" && musicVisibleRef.current) {
        setMusic((prev) =>
          prev && prev.mode !== "none" ? { ...prev, scale: rounded } : prev,
        );
      } else if (textStickerRef.current) {
        activeStickerRef.current = "text";
        setTextSticker((prev) => (prev ? { ...prev, scale: rounded } : prev));
      } else if (musicVisibleRef.current) {
        activeStickerRef.current = "music";
        setMusic((prev) =>
          prev && prev.mode !== "none" ? { ...prev, scale: rounded } : prev,
        );
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && stickerOnRef.current) {
        e.preventDefault();
        stickerDragRef.current = null; // batalkan drag 1 jari saat cubit mulai
        textDragRef.current = null;
        setDraggingSticker(null);
        setTrashHover(false);
        pinchRef.current = {
          startDist: Math.max(1, touchDist(e.touches[0], e.touches[1])),
          startScale: scaleRef.current,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const p = pinchRef.current;
      if (e.touches.length === 2 && p && stickerOnRef.current) {
        e.preventDefault();
        applyStickerScale(clampScale((p.startScale * touchDist(e.touches[0], e.touches[1])) / p.startDist));
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };
    // Cubit di touchpad (Chrome/Edge/Safari) datang sebagai wheel + ctrlKey.
    const onWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && stickerOnRef.current) {
        e.preventDefault();
        const unit = e.deltaMode === 1 ? 16 : 1;
        const factor = Math.exp((-e.deltaY * unit) / 500);
        const base =
          activeStickerRef.current === "text"
            ? (textStickerRef.current?.scale ?? 1)
            : (musicVisibleRef.current
              ? scaleRef.current
              : (textStickerRef.current?.scale ?? scaleRef.current));
        applyStickerScale(clampScale(base * factor));
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Penjaga race getUserMedia async: request basi langsung dimatikan saat datang.
  const cameraGenRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartRef = useRef(0);
  const recTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Setelah pencet centang (music terpilih + panel tertutup): putar potongan
  // 15 detik berulang-ulang (loop) sebagai preview. Berhenti saat panel dibuka
  // (biar tidak dobel dengan preview panel), saat musik dihapus, atau submit.
  useEffect(() => {
    const audio = musicPreviewRef.current;
    if (!audio) return;
    if (!music?.previewUrl || musicOpen) {
      audio.pause();
      if (audio) audio.ontimeupdate = null;
      return;
    }
    const start = Math.max(0, music.startSec ?? 0);
    if (audio.src !== music.previewUrl) {
      audio.src = music.previewUrl;
    }
    try {
      if (Math.abs((audio.currentTime || 0) - start) > 0.4) {
        audio.currentTime = start;
      }
    } catch {}
    audio.ontimeupdate = () => {
      if (audio.currentTime >= start + 15) {
        try {
          audio.currentTime = start;
        } catch {}
      }
    };
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.ontimeupdate = null;
    };
  }, [music?.id, music?.previewUrl, music?.startSec, musicOpen]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const showHint = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => {
      setHint((cur) => (cur === msg ? null : cur));
    }, 2500);
  };

  // Prefill bagikan postingan: ambil slide 1 jadi sel, musik terkunci,
  // langsung masuk tahap hias (tulis teks saja).
  // Gambar: fetch blob lalu upload ulang. Video: pakai URL asli (tanpa fetch/upload ulang).
  useEffect(() => {
    const post = sharePostData?.data;
    if (!sharePostId || !post || postShareInitRef.current) return;
    const firstMedia = post.medias?.[0] as { url: string; type?: string } | undefined;
    const firstUrl = firstMedia?.url;
    if (!firstUrl) {
      showHint("Postingan tidak ada medianya");
      setShareFailed(true);
      return;
    }
    const isVideoMedia =
      (firstMedia?.type ?? "") === "video" ||
      /\.(mp4|mov|webm|m4v)(\?|$)/i.test(firstUrl);
    postShareInitRef.current = true;
    (async () => {
      try {
        const ownerUsername =
          post.user?.username || post.user?.name || "pengguna";
        const ownerAvatar = (post.user as { avatar?: string | null })?.avatar ?? null;
        const hasLenteraMusic = !!post.musicUrl;
        if (isVideoMedia) {
          // Video: pakai URL asli, tanpa fetch blob. File dummy untuk tipe CellData.
          const dummyFile = new File([], `post-${post.id}.mp4`, {
            type: "video/mp4",
          });
          setCells([{ file: dummyFile, url: firstUrl, kind: "video" }]);
          setLayout(1);
          setActiveCell(0);
          setPendingCheck(false);
          setDecorate(true);
          if (hasLenteraMusic) {
            setMusic({
              id: `post-${post.id}`,
              title: post.musicTitle ?? "Musik",
              artist: post.musicArtist ?? "",
              cover: post.musicCover ?? null,
              previewUrl: post.musicUrl as string,
              spotifyUrl: null,
              startSec: 0,
              mode: "none",
              lyrics: null,
              x: null,
              y: null,
              scale: 1,
            });
          } else {
            // Audio Asli: tidak ada musik terpisah, suara ikut video.
            // Tandai lewat postShare, buletan jadi avatar pemilik berputar.
            setMusic(null);
          }
          setPostShare({
            postId: post.id,
            ownerUsername,
            ownerAvatar,
            mediaCount: post.medias?.length ?? 1,
            isVideo: true,
            videoUrl: firstUrl,
            hasLenteraMusic,
          });
          stopStream();
          return;
        }
        const res = await fetch(firstUrl);
        const blob = await res.blob();
        const file = new File([blob], `post-${post.id}.jpg`, {
          type: blob.type || "image/jpeg",
        });
        const url = URL.createObjectURL(file);
        setCells([{ file, url, kind: "image" }]);
        setLayout(1);
        setActiveCell(0);
        setPendingCheck(false);
        setDecorate(true);
        if (post.musicUrl) {
          setMusic({
            id: `post-${post.id}`,
            title: post.musicTitle ?? "Musik",
            artist: post.musicArtist ?? "",
            cover: post.musicCover ?? null,
            previewUrl: post.musicUrl,
            spotifyUrl: null,
            startSec: 0,
            mode: "none",
            lyrics: null,
            x: null,
            y: null,
            scale: 1,
          });
        } else {
          setMusic(null);
        }
        setPostShare({
          postId: post.id,
          ownerUsername,
          ownerAvatar,
          mediaCount: post.medias?.length ?? 1,
          isVideo: false,
          videoUrl: null,
          hasLenteraMusic: !!post.musicUrl,
        });
        stopStream();
      } catch {
        showHint("Gagal memuat postingan");
        setShareFailed(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharePostData, sharePostId]);

  // Cubit 2 jari pada kotak postingan: ubah ukuran saja (0.5-2x).
  // Tidak bisa dipindahkan, tetap di tengah. Listener native +
  // stopPropagation supaya tidak bentrok dengan cubit stiker kanvas.
  useEffect(() => {
    const el = postBoxRef.current;
    if (!el || !postShare) return;
    const clamp = (s: number) =>
      Math.max(0.5, Math.min(2, Math.round(s * 100) / 100));
    const dist = (a: Touch, b: Touch) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.stopPropagation();
        try {
          e.preventDefault();
        } catch {}
        postPinchRef.current = {
          startDist: Math.max(1, dist(e.touches[0], e.touches[1])),
          startScale: postScaleRef.current,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const p = postPinchRef.current;
      if (e.touches.length === 2 && p) {
        e.stopPropagation();
        try {
          e.preventDefault();
        } catch {}
        const s = clamp(
          (p.startScale * dist(e.touches[0], e.touches[1])) / p.startDist,
        );
        postScaleRef.current = s;
        setPostScale(s);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) postPinchRef.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.stopPropagation();
        try {
          e.preventDefault();
        } catch {}
        const unit = e.deltaMode === 1 ? 16 : 1;
        const factor = Math.exp((-e.deltaY * unit) / 500);
        const s = clamp(postScaleRef.current * factor);
        postScaleRef.current = s;
        setPostScale(s);
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [postShare]);

  // Ganti tata letak = reset cells, cell 0 langsung live kamera.
  const handleLayoutChange = (next: StoryLayoutCount) => {
    // Mode bagikan postingan: layout dikunci 1 (slide 1 saja).
    if (postShare) {
      showHint("Layout dikunci untuk bagikan postingan");
      return;
    }    cells.forEach((c) => {
      if (c) URL.revokeObjectURL(c.url);
    });
    setLayout(next);
    setCells(emptyCells(next));
    setActiveCell(0);
    setHint(null);
    setDecorate(false);
    setPendingCheck(false);
    setAudience("public");
    // Kembali ke tahap ambil gambar → pastikan kamera nyala.
    if (!streamRef.current) startCamera(facing);
  };

  // ---------- kamera ----------
  const stopStream = () => {
    // Naikkan generasi: request getUserMedia yang masih jalan di background
    // dianggap basi dan akan dimatikan sendiri saat resolve (anti bocor).
    cameraGenRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = useCallback(async (mode: "user" | "environment") => {
    const gen = ++cameraGenRef.current;
    const alive = () => cameraGenRef.current === gen;
    const killStream = (s: MediaStream) => {
      try {
        s.getTracks().forEach((t) => t.stop());
      } catch {}
    };
    stopStream();
    // stopStream ikut menaikkan generasi → samakan kembali ke generasi kita.
    cameraGenRef.current = gen;
    setCameraReady(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });
      if (!alive()) {
        killStream(stream); // sudah dimatikan saat menunggu → buang
        return;
      }
      streamRef.current = stream;
    } catch {
      if (!alive()) return;
      // Laptop tanpa mic / permission audio ketat: coba video-only.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (!alive()) {
          killStream(stream); // sudah dimatikan saat menunggu → buang
          return;
        }
        streamRef.current = stream;
      } catch {
        if (!alive()) return;
        // Kamera belakang tidak ada / kamera diblokir: kotak hitam + abu.
        setCameraError(
          mode === "environment"
            ? "Kamera belakang tidak tersedia di perangkat ini"
            : "Kamera tidak tersedia",
        );
        return;
      }
    }
    if (alive()) setCameraReady(true);
  }, []);

  useEffect(() => {
    // Mode bagikan postingan: tidak perlu kamera sama sekali.
    if (sharePostId) {
      stopStream();
      return;
    }
    startCamera(facing);
    // Keluar halaman /story (unmount): matikan kamera + mic, hentikan
    // rekaman/timer yang mungkin masih jalan supaya tidak bocor.
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      if (recTickRef.current) {
        clearInterval(recTickRef.current);
        recTickRef.current = null;
      }
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.onstop = null; // jangan lanjut ke tahap hias saat halaman ditutup
          rec.stop();
        } catch {}
      }
      recorderRef.current = null;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, sharePostId]);

  // Tempelkan stream ke elemen <video> yang sedang tampil (cell aktif kosong).
  // Dipisah dari startCamera karena elemen video mount/unmount mengikuti
  // activeCell / layout / cells (mis. habis hapus foto, video mount baru
  // tapi dep effect tidak berubah sehingga stream tidak nempel → kotak putih).
  // Callback ref ini menjamin setiap video yang mount langsung dapat stream.
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && streamRef.current && !cameraError) {
        el.srcObject = streamRef.current;
        el.play().catch(() => {});
      }
    },
    [cameraError],
  );

  useEffect(() => {
    const el = videoRef.current;
    if (el && streamRef.current && !cameraError) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, [activeCell, layout, cameraReady, cameraError, facing]);

  const switchCamera = () => {
    setFacing((f) => (f === "user" ? "environment" : "user"));
  };

  // ---------- jepret foto ----------
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || cameraError || recording) return;
    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1920;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror hasil selfie kamera depan.
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `story-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(file);
        const prev = cells;
        if (prev[activeCell]) URL.revokeObjectURL(prev[activeCell]!.url);
        const next = [...prev];
        next[activeCell] = { file, url, kind: "image" };
        setCells(next);
        if (next.every(Boolean)) {
          // Jalur motret: semua kotak penuh → buletan putih hilang,
          // langsung ke alat musik/emoji/pen. Kamera dimatikan (tidak dipakai lagi).
          setPendingCheck(false);
          setDecorate(true);
          stopStream();
        } else if (next.length > 1) {
          // Geser otomatis ke cell kosong berikutnya (layout > 1).
          const emptyIdx = next.findIndex((c) => !c);
          window.setTimeout(() => setActiveCell(emptyIdx), 150);
        }
      },
      "image/jpeg",
      0.92,
    );
  }, [activeCell, cameraError, cells, facing, recording]);

  // ---------- rekam video (layout 1 saja) ----------
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || cameraError) return;
    const mimeCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    const mimeType = mimeCandidates.find(
      (m) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(m),
    );
    try {
      const rec = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : undefined,
      );
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(200);
      recorderRef.current = rec;
      setRecording(true);
      setRecElapsed(0);
      const t0 = Date.now();
      if (recTickRef.current) clearInterval(recTickRef.current);
      recTickRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        setRecElapsed(s);
        if (s >= 15) stopRecording();
      }, 250);
    } catch {
      showHint("Perekaman video tidak didukung di browser ini");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraError]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (recTickRef.current) {
      clearInterval(recTickRef.current);
      recTickRef.current = null;
    }
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return;
    }
    rec.onstop = () => {
      const type = rec.mimeType.includes("mp4") ? "video/mp4" : "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `story-${Date.now()}.${type === "video/mp4" ? "mp4" : "webm"}`, {
        type,
      });
      const url = URL.createObjectURL(file);
      const prev = cells;
      if (prev[activeCell]) URL.revokeObjectURL(prev[activeCell]!.url);
      const next = [...prev];
      next[activeCell] = { file, url, kind: "video" };
      setCells(next);
      // Video hanya ada di tata letak 1 = selalu penuh → langsung hias.
      // Kamera dimatikan (tidak dipakai lagi di tahap hias).
      setPendingCheck(false);
      setDecorate(true);
      stopStream();
      setRecording(false);
      recorderRef.current = null;
    };
    rec.stop();
  }, [activeCell, cells]);

  // Shutter: pencet sekali = foto, tahan >1 detik = video (layout 1 saja).
  const onShutterDown = () => {
    if (submitting) return;
    pressStartRef.current = Date.now();
    if (layout !== 1) return;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      startRecording();
    }, 1000);
  };

  const onShutterUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (recording) {
      stopRecording();
      return;
    }
    const held = Date.now() - pressStartRef.current;
    if (held >= 1000 && layout !== 1) {
      showHint("Video hanya bisa di tata letak 1");
      return;
    }
    if (held < 1000) capturePhoto();
  };

  // ---------- galeri ----------
  const openGallery = () => {
    galleryInputRef.current?.click();
  };

  // Jalur upload galeri: kalau pengisian kotak jadi penuh, buletan putih
  // berganti jadi buletan warna-warni centang (belum langsung hias).
  const placeGalleryFile = (file: File, kind: "image" | "video") => {
    const url = URL.createObjectURL(file);
    const prev = cells;
    if (prev[activeCell]) URL.revokeObjectURL(prev[activeCell]!.url);
    const next = [...prev];
    next[activeCell] = { file, url, kind };
    setCells(next);
    if (!decorate) {
      if (next.every(Boolean)) {
        setPendingCheck(true);
      } else {
        setPendingCheck(false);
        if (next.length > 1) {
          const emptyIdx = next.findIndex((c) => !c);
          window.setTimeout(() => setActiveCell(emptyIdx), 150);
        }
      }
    }
  };

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (!file) return;
    const isVideo = file.type.startsWith("video");
    if (isVideo && layout !== 1) {
      showHint("Video hanya bisa di tata letak 1");
      return;
    }
    if (isVideo) {
      try {
        const dur = await getVideoDurationSec(file);
        if (dur > 16) {
          showHint(`Durasi ${Math.round(dur)} detik melebihi batas 15 detik`);
          return;
        }
      } catch {
        showHint("Tidak dapat membaca durasi video");
        return;
      }
      placeGalleryFile(file, "video");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showHint("File harus gambar atau video");
      return;
    }
    placeGalleryFile(file, "image");
  };

  // Tap kotak: kalau belum aktif jadikan aktif, kalau sudah aktif buka galeri.
  const handleCellTap = (idx: number) => {
    if (submitting || recording) return;
    if (idx !== activeCell) {
      setActiveCell(idx);
      return;
    }
    openGallery();
  };

  const clearCell = (idx: number) => {
    setCells((prev) => {
      const next = [...prev];
      if (next[idx]) URL.revokeObjectURL(next[idx]!.url);
      next[idx] = null;
      return next;
    });
    setActiveCell(idx);
    // Balik ke tahap ambil gambar → kamera dinyalakan lagi kalau sedang mati.
    setDecorate(false);
    setPendingCheck(false);
    if (!streamRef.current) startCamera(facing);
  };

  // ---------- submit ----------
  const filledCount = cells.filter(Boolean).length;
  const canSubmit =
    !submitting &&
    !recording &&
    (layout === 1 ? filledCount === 1 : filledCount === layout);

  // aud diambil dari parameter supaya klik kotak audiens langsung kirim
  // pakai nilai yang dipencet (hindari state basi satu frame).
  const handleSubmit = async (aud?: "public" | "close") => {
    const chosenAudience = aud ?? audience;
    if (!canSubmit) {
      showHint(
        layout === 1 ? "Ambil foto/video dulu" : `Isi semua ${layout} kotak dulu`,
      );
      return;
    }
    const items = cells.filter(Boolean) as CellData[];
    const isVideo = layout === 1 && items[0].kind === "video";
    const isVideoShare = !!postShare?.isVideo && !!postShare?.videoUrl;
    setSubmitting(true);
    stopStream();
    musicPreviewRef.current?.pause();
    startStoryUpload();
    try {
      const uploaded: { url: string; publicId: string; type: "image" | "video" }[] = [];
      if (isVideoShare) {
        // Video share: pakai URL asli postingan, tanpa upload ulang.
        setStoryUploadProgress(50, "Menyiapkan video");
        uploaded.push({
          url: postShare!.videoUrl as string,
          publicId: `post-${postShare!.postId}`,
          type: "video",
        });
      } else {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const optimized =
            item.kind === "image" ? await compressStoryImage(item.file) : item.file;
          const result = await uploadOneStoryFile(optimized, (pct) => {
            const overall = ((i + pct / 100) / items.length) * 90;
            setStoryUploadProgress(overall, `Mengunggah ${i + 1}/${items.length}`);
          });
          uploaded.push(result);
        }
      }
      setStoryUploadProgress(95, "Menyimpan story");
      await api.post("/stories", {
        type: isVideo ? "video" : "photo",
        layout: layoutToBackend(layout),
        audience: chosenAudience,
        ...(music?.previewUrl
          ? {
              music: {
                url: music.previewUrl,
                title: music.title,
                artist: music.artist,
                cover: music.cover,
                start: music.startSec ?? 0,
                mode: music.mode ?? "none",
                lyrics: music.lyrics ?? undefined,
                x: music.x ?? undefined,
                y: music.y ?? undefined,
                scale: music.scale ?? 1,
              },
            }
          : {}),
        medias: uploaded,
        // Mode bagikan postingan: sertakan snapshot untuk "Lihat Postingan".
        ...(postShare
          ? {
              postId: postShare.postId,
              postOwnerUsername: postShare.ownerUsername,
              postMediaCount: postShare.mediaCount,
              postScale: Math.round(postScaleRef.current * 100) / 100,
            }
          : {}),
        ...(textSticker
          ? {
              text: {
                content: textSticker.content,
                style: textSticker.style,
                bg: textSticker.bg,
                x: textSticker.x ?? undefined,
                y: textSticker.y ?? undefined,
                scale: textSticker.scale ?? 1,
              },
            }
          : {}),
      });
      completeStoryUpload();
      queryClient.invalidateQueries({ queryKey: ["/stories/feed"] });
      cells.forEach((c) => {
        if (c) URL.revokeObjectURL(c.url);
      });
      router.push("/");
    } catch (err) {
      console.error("Gagal membuat story:", err);
      failStoryUpload("Gagal mengunggah story, coba lagi");
      showHint("Gagal mengunggah, coba lagi");
      setSubmitting(false);
    }
  };

  // Index kotak terakhir yang terisi (untuk letak buletan sampah merah
  // per-kotak di layout multi: hanya kotak terakhir yang punya tombol hapus).
  const lastFilledIdx = (() => {
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i]) return i;
    }
    return -1;
  })();

  // ---------- render grid ----------
  const renderCell = (idx: number) => {
    const cell = cells[idx];
    const isActive = idx === activeCell;
    return (
      <Box
        key={idx}
        position="relative"
        overflow="hidden"
        bg={cell ? "black" : "#2d2d2d"}
        cursor="pointer"
        onClick={() => handleCellTap(idx)}
        outline={isActive ? "2px solid white" : "none"}
        outlineOffset="-2px"
        w="full"
        h="full"
        minH={0}
      >
        {cell ? (
          cell.kind === "video" ? (
            <video
              src={cell.url}
              controls
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={cell.url}
              alt={`Story ${idx + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : isActive && !cameraError ? (
          <>
            <video
              ref={(el) => {
                attachVideo(el);
              }}
              muted
              playsInline
              autoPlay
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: facing === "user" ? "scaleX(-1)" : "none",
              }}
            />
            {!cameraReady && (
              <Flex
                position="absolute"
                inset={0}
                align="center"
                justify="center"
                bg="blackAlpha.600"
              >
                <Spinner size="md" color="white" />
              </Flex>
            )}
          </>
        ) : (
          // Kotak kosong non-aktif: samar kamera blur (tetap gelap di light/dark mode).
          // Biar terlihat jelas di atas background terang maupun hitam.
          <Flex
            w="full"
            h="full"
            minH="120px"
            align="center"
            justify="center"
            position="relative"
            overflow="hidden"
            bg="#2d2d2d"
            color="white"
          >
            {/* Bokeh blur samar ala kamera */}
            <Box
              position="absolute"
              w="70%"
              h="60%"
              left="-10%"
              top="-10%"
              borderRadius="full"
              bg="whiteAlpha.200"
              filter="blur(28px)"
              pointerEvents="none"
            />
            <Box
              position="absolute"
              w="60%"
              h="55%"
              right="-12%"
              bottom="-15%"
              borderRadius="full"
              bg="blackAlpha.500"
              filter="blur(24px)"
              pointerEvents="none"
            />
            <Box position="relative" opacity={0.9} display="flex">
              <Camera size={28} />
            </Box>
          </Flex>
        )}

        {/* Kamera error: kotak hitam + abu */}
        {!cell && !(isActive && !cameraError) && cameraError && isActive && (
          <Flex
            position="absolute"
            inset={0}
            bg="black"
            align="center"
            justify="center"
            color="whiteAlpha.500"
          >
            <Camera size={28} />
          </Flex>
        )}

            {/* Hapus kotak kecil per-cell: hanya di KOTAK GAMBAR TERAKHIR
                (terisi) — layout multi. Pencet sampah = kotak paling
                belakang yang kehapus, satu-satu, bukan semua sekaligus.
                Layout 1 memakai buletan sampah merah di baris alat atas. */}
            {cell && layout !== 1 && !submitting && idx === lastFilledIdx && (
              <Box
                as="button"
                aria-label={`Hapus gambar ${idx + 1}`}
                title="Hapus gambar"
                position="absolute"
                top="8px"
                right="8px"
                zIndex={2}
                w="30px"
                h="30px"
                borderRadius="full"
                bg="red.500"
                border="1.5px solid"
                borderColor="whiteAlpha.700"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="white"
                cursor="pointer"
                backdropFilter="blur(8px)"
                _hover={{ bg: "red.600" }}
                onClick={(e) => {
                  e.stopPropagation();
                  clearCell(idx);
                }}
              >
                <Trash2 size={14} />
              </Box>
            )}
      </Box>
    );
  };

  // Alat persiapan story: deret horizontal kanan atas —
  // musik (abu) | pen/teks (abu) | emoji (abu).
  // Hapus media kini lewat buletan sampah MERAH di kanan bawah kotak
  // kamera (muncul terus selama tahap hias/persiapan).
  // Kalau sudah pilih lagu, icon musik diganti album cover berputar (hemat tempat,
  // chip judul di kiri atas dihapus).
  const renderDecorateTools = () => (
    <Box position="absolute" top="10px" right="10px" zIndex={3}>
      <Box display="flex" flexDirection="row" gap={2}>
        {/* Musik: abu kalau belum pilih, album berputar kalau sudah pilih */}
        <Box
          as="button"
          aria-label={postShare ? "Musik dari postingan" : "Musik"}
          title={postShare ? "Musik dari postingan" : undefined}
          onClick={() =>
            postShare
              ? showHint("Musik dari postingan, tidak bisa diubah")
              : setMusicOpen(true)
          }
          w="40px"
          h="40px"
          borderRadius="full"
          bg={
            music?.cover || postShare?.ownerAvatar || postShare?.isVideo
              ? "transparent"
              : music
                ? "orange.500"
                : "blackAlpha.600"
          }
          border="1.5px solid"
          borderColor="whiteAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="white"
          cursor="pointer"
          backdropFilter="blur(8px)"
          overflow="hidden"
          _hover={{
            bg:
              music?.cover || postShare?.ownerAvatar || postShare?.isVideo
                ? "transparent"
                : music
                  ? "orange.600"
                  : "blackAlpha.800",
          }}
        >
          {(() => {
            const isVideoAudioAsli = postShare?.isVideo && !postShare.hasLenteraMusic;
            const avatarSrc = postShare?.ownerAvatar || "/default-avatar.jpg";
            if (isVideoAudioAsli) {
              return (
                <img
                  src={avatarSrc}
                  alt="Audio Asli"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                    animation: "postShareSpin 6s linear infinite",
                  }}
                />
              );
            }
            if (music?.cover) {
              return (
                <img
                  src={music.cover}
                  alt={music.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                    animation: "postShareSpin 6s linear infinite",
                  }}
                />
              );
            }
            return <Music size={18} />;
          })()}
        </Box>
        <Box
          as="button"
          aria-label="Teks"
          onClick={() => setTextOpen(true)}
          w="40px"
          h="40px"
          borderRadius="full"
          bg={textSticker ? "orange.500" : "blackAlpha.600"}
          border="1.5px solid"
          borderColor="whiteAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="white"
          cursor="pointer"
          backdropFilter="blur(8px)"
          _hover={{ bg: textSticker ? "orange.600" : "blackAlpha.800" }}
        >
          <Type size={18} />
        </Box>
        {[
          { label: "Emoji", Icon: Smile, soon: "Fitur emoji segera hadir" },
        ].map(({ label, Icon, soon }) => (
          <Box
            key={label}
            as="button"
            aria-label={label}
            onClick={() => showHint(soon)}
            w="40px"
            h="40px"
            borderRadius="full"
            bg="blackAlpha.600"
            border="1.5px solid"
            borderColor="whiteAlpha.700"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            cursor="pointer"
            backdropFilter="blur(8px)"
            _hover={{ bg: "blackAlpha.800" }}
          >
            <Icon size={18} />
          </Box>
        ))}
        {/* Sampah merah paling kanan: hanya untuk layout 1 & mode
            bagikan postingan — layout multi pakai sampah merah per-kotak. */}
        {(layout === 1 || postShare) && (
          <Box
            as="button"
            aria-label="Hapus foto/video"
            title="Hapus foto/video"
            onClick={() => clearCell(activeCell)}
            w="40px"
            h="40px"
            borderRadius="full"
            bg="red.500"
            border="1.5px solid"
            borderColor="whiteAlpha.700"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            cursor="pointer"
            backdropFilter="blur(8px)"
            _hover={{ bg: "red.600" }}
          >
            <Trash2 size={18} />
          </Box>
        )}
      </Box>
    </Box>
  );

  // Chip lagu terpilih di kiri atas grid (mode none = audio saja).
  // Mode bagikan postingan: chip terkunci (tanpa tombol hapus).
  // Video Audio Asli: chip jadi avatar pemilik + tulisan "Audio Asli".
  const renderMusicChip = () => {
    if (postShare?.isVideo && !postShare.hasLenteraMusic) {
      return (
        <Box position="absolute" top="8px" left="8px" zIndex={2} maxW="70%">
          <Box
            display="flex"
            alignItems="center"
            gap={2}
            bg="blackAlpha.600"
            border="1px solid"
            borderColor="whiteAlpha.400"
            borderRadius="full"
            pl={1}
            pr={2}
            py={1}
            backdropFilter="blur(8px)"
          >
            {postShare.ownerAvatar ? (
              <img
                src={postShare.ownerAvatar}
                alt="Audio Asli"
                style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <Music size={14} />
            )}
            <Text fontSize="10px" fontWeight="bold" truncate>
              Audio Asli
            </Text>
          </Box>
        </Box>
      );
    }
    if (!music || music.mode !== "none") return null;
    return (
      <Box position="absolute" top="8px" left="8px" zIndex={2} maxW="70%">
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          bg="blackAlpha.600"
          border="1px solid"
          borderColor="whiteAlpha.400"
          borderRadius="full"
          pl={1}
          pr={2}
          py={1}
          backdropFilter="blur(8px)"
        >
          {music.cover ? (
            <img
              src={music.cover}
              alt={music.title}
              style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <Music size={14} />
          )}
          <Text fontSize="10px" fontWeight="bold" truncate>
            {music.title} • {music.artist}
          </Text>
          {!postShare && (
          <Box
            as="button"
            aria-label="Hapus musik"
            onClick={() => setMusic(null)}
            cursor="pointer"
            color="whiteAlpha.700"
            _hover={{ color: "white" }}
            display="flex"
          >
            <X size={12} />
          </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Stiker lirik/piringan yang bisa diseret + dibesar-kecilkan (tahap 2).
  // Seret ke tong sampah bawah untuk menghapus (membesar saat masuk, melebur saat dilepas).
  const renderMusicSticker = () => {
    if (!music || music.mode === "none") return null;
    const x = music.x ?? (music.mode === "lyrics" ? 50 : 80);
    const y = music.y ?? (music.mode === "lyrics" ? 32 : 72);
    const scale = music.scale ?? 1;
    const overTrash = draggingSticker === "music" && trashHover;
    const visualScale = overTrash ? scale * 1.3 : scale;
    const onStickerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      if (pinchRef.current) return; // sedang cubit 2 jari: jangan mulai drag
      if (e.nativeEvent.isPrimary === false) return; // jari kedua: abaikan
      activeStickerRef.current = "music";
      setDraggingSticker("music");
      setTrashHover(false);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      stickerDragRef.current = {
        id: e.pointerId,
        dx: ((e.clientX - rect.left) / rect.width) * 100 - x,
        dy: ((e.clientY - rect.top) / rect.height) * 100 - y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const onStickerMove = (e: React.PointerEvent) => {
      const drag = stickerDragRef.current;
      if (!drag || !music) return;
      if (e.pointerId !== drag.id || pinchRef.current) return;
      setTrashHover(isOverTrash(e.clientX, e.clientY));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const nx = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - drag.dx));
      const ny = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - drag.dy));
      setMusic({ ...music, x: Math.round(nx), y: Math.round(ny) });
    };
    const endDrag = () => {
      stickerDragRef.current = null;
      if (draggingSticker === "music" && trashHover) {
        setDeletingSticker("music");
        window.setTimeout(() => {
          setMusic(null);
          setDeletingSticker(null);
        }, 260);
      }
      setDraggingSticker(null);
      setTrashHover(false);
    };
    return (
      <Box
        position="absolute"
        zIndex={3}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${visualScale})`,
          touchAction: "none",
          transition: overTrash ? "transform 0.15s ease" : undefined,
          ...(deletingSticker === "music" ? { animation: "stickerMelt 0.26s ease forwards" } : {}),
        }}
        onPointerDown={onStickerDown}
        onPointerMove={onStickerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        cursor="move"
        userSelect="none"
      >
        {music.mode === "lyrics" ? (
          <Box textAlign="center" pointerEvents="none" maxW="220px">
            <KaraokeLyrics
              lines={(music.lyrics ?? "").split("\n").filter(Boolean)}
              windowSec={15}
              playing
              resetKey={`${music.id}-${music.startSec}`}
              maxW="220px"
              title={music.title}
              artist={music.artist}
            />
          </Box>
        ) : (
          <Box textAlign="center" pointerEvents="none">
            <style>{`@keyframes lenteraSpin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
            <Box w="72px" h="72px" borderRadius="full" bg="var(--app-secondary)" border="4px solid" borderColor="whiteAlpha.600" display="flex" alignItems="center" justifyContent="center" mx="auto" style={{ animation: "lenteraSpin 6s linear infinite" }}>
              {music.cover ? (
                <img src={music.cover} alt={music.title} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <Music size={18} color="white" />
              )}
            </Box>
            <Text fontSize="9px" fontWeight="bold" color="white" mt={1} textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="110px" truncate>
              {music.title}
            </Text>
            <Text fontSize="8px" color="whiteAlpha.800" textShadow="0 1px 6px rgba(0,0,0,0.9)" maxW="110px" truncate>
              {music.artist}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  // Stiker teks yang bisa diseret 1 jari + cubit 2 jari (tahap 2).
  // Seret ke tong sampah bawah untuk menghapus (membesar saat masuk, melebur saat dilepas).
  const renderTextSticker = () => {
    if (!textSticker) return null;
    const x = textSticker.x ?? 50;
    const y = textSticker.y ?? 50;
    const scale = textSticker.scale ?? 1;
    const overTrash = draggingSticker === "text" && trashHover;
    const visualScale = overTrash ? scale * 1.3 : scale;
    const onTextDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      if (pinchRef.current) return;
      if (e.nativeEvent.isPrimary === false) return;
      activeStickerRef.current = "text";
      setDraggingSticker("text");
      setTrashHover(false);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      textDragRef.current = {
        id: e.pointerId,
        dx: ((e.clientX - rect.left) / rect.width) * 100 - x,
        dy: ((e.clientY - rect.top) / rect.height) * 100 - y,
      };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const onTextMove = (e: React.PointerEvent) => {
      const drag = textDragRef.current;
      if (!drag || !textSticker) return;
      if (e.pointerId !== drag.id || pinchRef.current) return;
      setTrashHover(isOverTrash(e.clientX, e.clientY));
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const nx = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - drag.dx));
      const ny = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - drag.dy));
      setTextSticker({ ...textSticker, x: Math.round(nx), y: Math.round(ny) });
    };
    const endTextDrag = () => {
      textDragRef.current = null;
      if (draggingSticker === "text" && trashHover) {
        setDeletingSticker("text");
        window.setTimeout(() => {
          setTextSticker(null);
          setDeletingSticker(null);
        }, 260);
      }
      setDraggingSticker(null);
      setTrashHover(false);
    };
    return (
      <Box
        position="absolute"
        zIndex={3}
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${visualScale})`,
          touchAction: "none",
          transition: overTrash ? "transform 0.15s ease" : undefined,
          ...(deletingSticker === "text" ? { animation: "stickerMelt 0.26s ease forwards" } : {}),
        }}
        onPointerDown={onTextDown}
        onPointerMove={onTextMove}
        onPointerUp={endTextDrag}
        onPointerCancel={endTextDrag}
        cursor="move"
        userSelect="none"
      >
        <Box pointerEvents="none">
          <StoryTextSticker value={textSticker} maxW="220px" fontSize="md" />
        </Box>
      </Box>
    );
  };

  const renderGrid = () => {
    // Garis putih = gap dengan bg putih.
    const gridBg = "white";
    if (layout === 1) {
      return (
        <Box bg={gridBg} borderRadius="2xl" overflow="hidden">
          <Box h={{ base: "68dvh", md: "75dvh" }} minH="420px">
            {renderCell(0)}
          </Box>
        </Box>
      );
    }
    if (layout === 2) {
      return (
        <Box
          display="grid"
          gridTemplateRows="1fr 1fr"
          gap="2px"
          bg={gridBg}
          borderRadius="2xl"
          overflow="hidden"
          h={{ base: "52dvh", md: "62dvh" }}
          minH="320px"
        >
          {renderCell(0)}
          {renderCell(1)}
        </Box>
      );
    }
    if (layout === 3) {
      return (
        <Box
          display="grid"
          gridTemplateRows="1fr 1fr"
          gap="2px"
          bg={gridBg}
          borderRadius="2xl"
          overflow="hidden"
          h={{ base: "52dvh", md: "62dvh" }}
          minH="320px"
        >
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap="2px">
            {renderCell(0)}
            {renderCell(1)}
          </Box>
          {renderCell(2)}
        </Box>
      );
    }
    return (
      <Box
        display="grid"
        gridTemplateColumns="1fr 1fr"
        gridTemplateRows="1fr 1fr"
        gap="2px"
        bg={gridBg}
        borderRadius="2xl"
        overflow="hidden"
        h={{ base: "52dvh", md: "62dvh" }}
        minH="320px"
      >
        {renderCell(0)}
        {renderCell(1)}
        {renderCell(2)}
        {renderCell(3)}
      </Box>
    );
  };

  // Kanvas mode bagikan postingan: background blur + kotak (slide 1)
  // kecil di tengah + icon kanan atas.
  // Gambar: "@username" di bawah kiri kotak (di luar).
  // Video: "@username" di kiri atas di dalam kotak video.
  const renderPostShareCanvas = () => {
    const cell = cells[0];
    if (!cell) return null;
    const multi = (postShare?.mediaCount ?? 1) > 1;
    const isVideoShare = postShare?.isVideo === true || cell.kind === "video";
    return (
      <Box position="relative" borderRadius="2xl" overflow="hidden">
        <Box h={{ base: "68dvh", md: "75dvh" }} minH="420px" position="relative">
          {/* Background: media dilebarkan + blur */}
          {isVideoShare ? (
            <video
              src={cell.url}
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
          ) : (
            <img
              src={cell.url}
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
          )}
          {/* Tengah: kotak postingan (kecil, bisa diperkecil/diperbesar 0.5-2x) */}
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            p={6}
          >
            <Box
              w="full"
              maxW="200px"
              ref={postBoxRef}
              style={{
                transform: `scale(${postScale})`,
                touchAction: "none",
              }}
            >
              <Box
                position="relative"
                w="full"
                borderRadius="xl"
                overflow="hidden"
                shadow="2xl"
                border="1px solid"
                borderColor="whiteAlpha.300"
                style={{ aspectRatio: postAspect }}
                bg="var(--app-secondary)"
              >
                {isVideoShare ? (
                  <video
                    src={cell.url}
                    muted={postShare?.hasLenteraMusic ? true : false}
                    loop
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight)
                        setPostAspect(`${v.videoWidth} / ${v.videoHeight}`);
                    }}
                  />
                ) : (
                  <img
                    src={cell.url}
                    alt="Postingan yang dibagikan"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const w = img.naturalWidth;
                      const h = img.naturalHeight;
                      if (w && h) setPostAspect(`${w} / ${h}`);
                    }}
                  />
                )}
                {/* Ikon galeri/bertumpuk: dihapus untuk video, hanya tampil untuk gambar */}
                {!isVideoShare && (
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
                )}
                {/* Video: username di kiri atas di dalam kotak */}
                {isVideoShare && (
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
                    @{postShare?.ownerUsername ?? ""}
                  </Text>
                )}
              </Box>
              {/* Gambar: @username di bawah kiri kotak (di luar) */}
              {!isVideoShare && (
                <Text
                  mt={2}
                  textAlign="left"
                  fontSize="xs"
                  fontWeight="bold"
                  color="white"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                >
                  @{postShare?.ownerUsername ?? ""}
                </Text>
              )}
            </Box>
          </Flex>
        </Box>
      </Box>
    );
  };

  // Mode bagikan postingan tapi data belum siap: tampilkan loading/error
  // menutupi editor kamera agar tidak bisa dipakai dulu.
  const renderPostShareGate = () => {
    if (!sharePostId) return null;
    if (sharePostError || (!sharePostLoading && !postShare && postShareInitRef.current)) {
      return (
        <Box
          position="absolute"
          inset={0}
          zIndex={5}
          bg="black"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={4}
          p={6}
        >
          <Text fontSize="sm" fontWeight="bold" textAlign="center">
            Postingan tidak tersedia.
          </Text>
          <Box
            as="button"
            onClick={() => router.push("/")}
            bg="whiteAlpha.200"
            px={5}
            py={2}
            borderRadius="full"
            fontSize="sm"
            fontWeight="bold"
            cursor="pointer"
          >
            Kembali
          </Box>
        </Box>
      );
    }
    if (!postShare) {
      return (
        <Box
          position="absolute"
          inset={0}
          zIndex={5}
          bg="black"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={3}
        >
          <Spinner size="lg" color="white" />
          <Text fontSize="xs" color="whiteAlpha.700">
            Memuat postingan...
          </Text>
        </Box>
      );
    }
    return null;
  };

  // Mode share tapi data belum siap: tutupi SELURUH halaman dengan
  // layar loading/error, jadi kamera/upload tidak sempat terlihat.
  if (sharePostId && !postShare) {
    const failed = shareFailed || !!sharePostError;
    return (
      <Box
        position="fixed"
        inset={0}
        bg="var(--app-bg)"
        color="var(--app-text)"
        zIndex={100}
        overflowY="auto"
      >
        <Flex
          position="sticky"
          top={0}
          zIndex={2}
          px={4}
          py={3}
          align="center"
          justify="space-between"
          bg="var(--app-card)"
          borderBottom="1px solid"
          borderColor="var(--app-border)"
        >
          <IconButton
            aria-label="Tutup"
            variant="ghost"
            color="var(--app-text)"
            _hover={{ bg: "var(--app-hover)" }}
            onClick={() => router.push("/")}
          >
            <X size={22} />
          </IconButton>
          <Text fontWeight="black" fontSize="sm" letterSpacing="wide">
            BAGIKAN KE STORY
          </Text>
          <Box w="40px" />
        </Flex>
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="70dvh"
          gap={failed ? 4 : 3}
          px={6}
        >
          {failed ? (
            <>
              <Text fontSize="sm" fontWeight="bold" textAlign="center">
                Postingan tidak tersedia.
              </Text>
              <Box
                as="button"
                onClick={() => router.push("/")}
                bg="var(--app-hover)"
                px={5}
                py={2}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
                cursor="pointer"
              >
                Kembali
              </Box>
            </>
          ) : (
            <>
              <Spinner size="lg" color="blue.500" />
              <Text fontSize="xs" color="var(--app-muted)">
                Memuat postingan...
              </Text>
            </>
          )}
        </Flex>
        <StoryUploadToast />
      </Box>
    );
  }

  return (
    <Box
      position="fixed"
      inset={0}
      bg="var(--app-bg)"
      color="var(--app-text)"
      zIndex={100}
      overflowY="auto"
    >
      <input
        ref={galleryInputRef}
        type="file"
        hidden
        accept={layout === 1 ? "image/*,video/*" : "image/*"}
        onChange={handleGalleryChange}
      />

      {/* Top bar (tanpa tulisan STORY, tanpa refresh — refresh pindah ke dalam kotak kamera) */}
      <Flex
        position="sticky"
        top={0}
        zIndex={2}
        px={4}
        py={3}
        align="center"
        justify="space-between"
        bg="var(--app-card)"
        borderBottom="1px solid"
        borderColor="var(--app-border)"
        backdropFilter="blur(8px)"
      >
        <IconButton
          aria-label="Tutup"
          variant="ghost"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-hover)" }}
          onClick={() => router.push("/")}
        >
          <X size={22} />
        </IconButton>
        <Box w="40px" />
      </Flex>

      {/* Body: kiri branding, tengah kamera yang dibesarkan */}
      <Flex px={4} gap={6} align="flex-start" justify="center" mt={4}>
        {/* Kiri halaman: branding atas-bawah */}
        <Box
          display={{ base: "none", md: "flex" }}
          flexDirection="column"
          alignItems="flex-start"
          pt={2}
          minW="160px"
          position="sticky"
          top="100px"
        >
          <Text fontWeight="black" fontSize="2xl" color="blue.500" lineHeight={1}>
            Lentera
          </Text>
          <Text fontWeight="bold" fontSize="lg" color="var(--app-text)" mt={1}>
            Story
          </Text>
        </Box>

        {/* Tengah: kamera (dilebarkan + dipanjangkan) */}
        <Box w="full" maxW="560px" pb={8}>
          {!postShare && !cameraReady && !cameraError && (
            <Flex h="200px" align="center" justify="center">
              <Spinner size="lg" color="blue.500" />
            </Flex>
          )}
          <Box position="relative" ref={canvasRef}>
            <style>{`
              @keyframes trashUp { from { transform: translateY(80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
              @keyframes stickerMelt { from { opacity: 1; filter: blur(0); } to { opacity: 0; filter: blur(8px); } }
              @keyframes postShareSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
            {postShare ? renderPostShareCanvas() : renderGrid()}
            {renderPostShareGate()}
            {/* Tahap preview galeri layout 1 (sebelum centang): buletan
                MERAH sampah di kanan atas — hapus media dari galeri lalu
                kembali ke tahap awal (motret / galeri / rekam).
                Layout multi pakai sampah merah per-kotak di renderCell. */}
            {!decorate && pendingCheck && layout === 1 && (
              <Box position="absolute" top="10px" right="10px" zIndex={3}>
                <Box
                  as="button"
                  aria-label="Hapus media"
                  title="Hapus media"
                  onClick={() => clearCell(activeCell)}
                  w="40px"
                  h="40px"
                  borderRadius="full"
                  bg="red.500"
                  border="1.5px solid"
                  borderColor="whiteAlpha.700"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  cursor="pointer"
                  backdropFilter="blur(8px)"
                  _hover={{ bg: "red.600" }}
                >
                  <Trash2 size={18} />
                </Box>
              </Box>
            )}
            {/* Kiri tengah DI DALAM kotak kamera: layout picker */}
            {!postShare && !decorate && !pendingCheck && (
              <Box
                position="absolute"
                left="10px"
                top="50%"
                transform="translateY(-50%)"
                zIndex={3}
              >
                <LayoutPicker value={layout} onChange={handleLayoutChange} />
              </Box>
            )}
            {/* Kanan DI DALAM kotak kamera: refresh depan/belakang */}
            {!postShare && !decorate && !pendingCheck && (
              <IconButton
                aria-label="Ganti kamera"
                position="absolute"
                right="10px"
                top="10px"
                zIndex={3}
                borderRadius="full"
                w="40px"
                h="40px"
                bg="blackAlpha.600"
                color="white"
                border="1.5px solid"
                borderColor="whiteAlpha.700"
                backdropFilter="blur(8px)"
                _hover={{ bg: "blackAlpha.800" }}
                onClick={switchCamera}
              >
                <RefreshCw size={18} />
              </IconButton>
            )}
            {decorate && renderDecorateTools()}
            {(decorate || pendingCheck) && renderMusicSticker()}
            {(decorate || pendingCheck) && renderTextSticker()}
            {/* Pilihan audiens DI PALING BAWAH kotak kamera (tahap hias,
                setelah centang): kiri biru bintang (teman terdekat), kanan
                putih globe (publik). Mencet kotak = langsung memproses &
                mengirim story. Ada efek hover/tekan biar menarik. */}
            {decorate && !submitting && (
              <Flex
                position="absolute"
                bottom="12px"
                left="16px"
                right="16px"
                zIndex={3}
                gap={2}
                justify="center"
              >
                <Box
                  as="button"
                  flex={1}
                  flexBasis={0}
                  minW={0}
                  borderRadius="xl"
                  px={2}
                  py={2.5}
                  bg="linear-gradient(135deg, #3b82f6, #6366f1)"
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  textAlign="center"
                  lineHeight="1.3"
                  cursor="pointer"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1.5}
                  boxShadow="0 4px 16px rgba(59, 130, 246, 0.45)"
                  transition="transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease"
                  _hover={{
                    transform: "translateY(-2px) scale(1.02)",
                    boxShadow: "0 6px 22px rgba(59, 130, 246, 0.65)",
                    filter: "brightness(1.08)",
                  }}
                  _active={{ transform: "scale(0.95)", boxShadow: "0 2px 8px rgba(59, 130, 246, 0.5)" }}
                  onClick={() => {
                    setAudience("close");
                    handleSubmit("close");
                  }}
                  title="Hanya kirim ke teman terdekat"
                >
                  <Star size={14} fill="#facc15" color="#facc15" style={{ flexShrink: 0 }} />
                  Hanya kirim ke teman terdekat
                </Box>
                <Box
                  as="button"
                  flex={1}
                  flexBasis={0}
                  minW={0}
                  borderRadius="xl"
                  px={2}
                  py={2.5}
                  bg="white"
                  color="black"
                  fontSize="xs"
                  fontWeight="bold"
                  textAlign="center"
                  lineHeight="1.3"
                  cursor="pointer"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1.5}
                  boxShadow="0 4px 16px rgba(0, 0, 0, 0.35)"
                  transition="transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease"
                  _hover={{
                    transform: "translateY(-2px) scale(1.02)",
                    boxShadow: "0 6px 22px rgba(0, 0, 0, 0.5)",
                    filter: "brightness(1.05)",
                  }}
                  _active={{ transform: "scale(0.95)", boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)" }}
                  onClick={() => {
                    setAudience("public");
                    handleSubmit("public");
                  }}
                  title="Kirim ke publik"
                >
                  <Globe size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                  Kirim ke publik
                </Box>
              </Flex>
            )}
            {/* Tong sampah: muncul dari bawah saat stiker diseret 1 jari */}
            {(decorate || pendingCheck) && draggingSticker && (
              <Box
                position="absolute"
                bottom="20px"
                left="calc(50% - 30px)"
                zIndex={4}
                pointerEvents="none"
                style={{ animation: "trashUp 0.25s ease-out" }}
              >
                <Box
                  ref={trashRef}
                  w="60px"
                  h="60px"
                  borderRadius="full"
                  bg={trashHover ? "red.500" : "blackAlpha.700"}
                  border="2px solid"
                  borderColor={trashHover ? "white" : "whiteAlpha.600"}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  backdropFilter="blur(8px)"
                  style={{
                    transform: trashHover ? "scale(1.15)" : "scale(1)",
                    transition: "transform 0.15s ease, background 0.15s ease",
                  }}
                >
                  <Trash2 size={24} color="white" />
                </Box>
              </Box>
            )}
            {/* Kontrol bawah DI DALAM kotak kamera:
                tengah shutter/centang, kanan sampah merah (hapus media aktif).
                Galeri & ikon kirim orange di bawah sudah dihapus — kirim
                lewat kotak "Hanya kirim ke teman terdekat" / "Kirim ke publik". */}
            {!postShare && !decorate && (
              <Flex
                position="absolute"
                bottom="12px"
                left="12px"
                right="12px"
                zIndex={3}
                align="flex-end"
                justify="space-between"
              >
                {/* Kiri dalam: spacer menyeimbangkan shutter di tengah */}
                <Box w="52px" h="52px" flexShrink={0} />

                {/* Tengah dalam: shutter / centang (tanpa tulisan hint) */}
                {!decorate && (
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    {pendingCheck ? (
                      <Box
                        as="button"
                        aria-label="Sudah siap"
                        onClick={() => {
                          setPendingCheck(false);
                          setDecorate(true);
                          stopStream();
                        }}
                        w="76px"
                        h="76px"
                        borderRadius="full"
                        border="4px solid white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        bg="linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)"
                        touchAction="manipulation"
                        userSelect="none"
                      >
                        <Check size={32} color="white" strokeWidth={3} />
                      </Box>
                    ) : (
                      <Box
                        as="button"
                        aria-label={layout === 1 ? "Foto atau tahan untuk video" : "Ambil foto"}
                        onPointerDown={onShutterDown}
                        onPointerUp={onShutterUp}
                        onPointerLeave={() => {
                          if (recording) stopRecording();
                          if (pressTimerRef.current) {
                            clearTimeout(pressTimerRef.current);
                            pressTimerRef.current = null;
                          }
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        w="76px"
                        h="76px"
                        borderRadius="full"
                        border="4px solid white"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        bg="transparent"
                        touchAction="none"
                        userSelect="none"
                        position="relative"
                      >
                        <Box
                          w="60px"
                          h="60px"
                          borderRadius="full"
                          bg={recording ? "red.500" : "white"}
                          transition="0.15s"
                        />
                      </Box>
                    )}
                    {recording && (
                      <Text fontSize="10px" color="white" fontWeight="bold"
                        bg="blackAlpha.600" px={2} py={0.5} borderRadius="full">
                        {`● ${recElapsed}d / 15d`}
                      </Text>
                    )}
                  </Box>
                )}

                {/* Kanan dalam: spacer menyeimbangkan shutter di tengah —
                    hapus media kini lewat buletan sampah merah di baris alat atas */}
                <Box w="52px" h="52px" flexShrink={0} />
              </Flex>
            )}
          </Box>

          {cameraError && (
            <Text fontSize="xs" color="var(--app-muted)" textAlign="center" mt={2}>
              {cameraError}
            </Text>
          )}

          {hint && (
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="orange.300"
              textAlign="center"
              mt={2}
            >
              {hint}
            </Text>
          )}
        </Box>

        {/* Kanan: penyeimbang biar kotak kamera tetap rata tengah,
            tulisan Lentera/Story nempel di kiri kamera */}
        <Box display={{ base: "none", md: "block" }} minW="160px" flexShrink={0} />
      </Flex>

      <StoryUploadToast />
      {/* audio loop preview setelah centang */}
      <audio ref={musicPreviewRef} preload="auto" />
      <MusicPanel
        open={musicOpen}
        onClose={() => setMusicOpen(false)}
        selectedId={music?.id ?? null}
        selectedStart={music?.startSec ?? null}
        onRemove={() => setMusic(null)}
        onSelect={(track, startSec, mode, lyrics) => {
          if (!track.previewUrl) {
            showHint("Lagu ini tidak menyediakan preview, pilih lagu lain");
            return;
          }
          setMusic({
            ...track,
            startSec,
            mode,
            lyrics,
            x: mode === "lyrics" ? 50 : mode === "vinyl" ? 80 : null,
            y: mode === "lyrics" ? 32 : mode === "vinyl" ? 72 : null,
            scale: 1,
          });
          setMusicOpen(false);
        }}
      />
      <TextPanel
        open={textOpen}
        initial={textSticker}
        onRemove={() => {
          setTextSticker(null);
          setTextOpen(false);
        }}
        onConfirm={(v) => {
          activeStickerRef.current = "text";
          setTextSticker(v);
          setTextOpen(false);
        }}
      />
    </Box>
  );
}

// useSearchParams wajib di dalam Suspense (aturan App Router).
export default function StoryPage() {
  return (
    <Suspense
      fallback={
        <Box
          position="fixed"
          inset={0}
          bg="var(--app-bg)"
          color="var(--app-text)"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="lg" color="blue.500" />
        </Box>
      }
    >
      <StoryPageInner />
    </Suspense>
  );
}


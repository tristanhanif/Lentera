"use client";

import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  Flex,
  IconButton,
  Image,
  Input,
  Spinner,
} from "@chakra-ui/react";
import {
  Image as ImageIcon,
  X,
  Globe,
  Crop,
  ZoomIn,
  Layers,
  ChevronLeft,
  ChevronRight,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Plus,
  Smile,
  MapPin,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Link } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCreatePost } from "@/app/(main)/post/post.service";
import { useProfile } from "@/app/(main)/profile/profile.service";
import { uploadToCloudinary } from "@/app/lib/upload";
import { CreateTabs } from "@/app/story/components/CreateTabs";
import {
  SpotifyTrack,
  useSpotifySearch,
  useSpotifyTrending,
} from "@/app/story/spotify.service";

interface NominatimPlace {
  place_id: number;
  display_name: string;
}

const fetchPlaces = async (q: string): Promise<NominatimPlace[]> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=7&accept-language=id&q=${encodeURIComponent(q)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error("Gagal mencari lokasi");
  return res.json();
};

// Kompres/resize gambar di sisi klien agar upload lebih cepat
const compressImage = (
  file: File,
  maxDim = 2000,
  quality = 0.85,
): Promise<File> => {
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

type MediaItem = {
  key: string;
  url: string;
  type: "image" | "video";
  local?: boolean;
  w?: number;
  h?: number;
  // File lokal untuk baking frame (anti-gagal CORS saat crop dari URL remote).
  origFile?: File;
};

type FrameKey = "asli" | "1:1" | "4:5" | "16:9";
type PanelKey = null | "frame" | "zoom" | "stack";

const MAX_MEDIA = 7;

type FilterName =
  | "Aden"
  | "Clarendon"
  | "Crema"
  | "Gingham"
  | "Juno"
  | "Lark"
  | "Ludwig"
  | "Moon"
  | "Asli"
  | "Perpetua"
  | "Reyes"
  | "Slumber";

const FILTERS: { name: FilterName; css: string }[] = [
  { name: "Aden", css: "contrast(0.9) brightness(1.2) saturate(0.85) hue-rotate(-20deg)" },
  { name: "Clarendon", css: "contrast(1.2) saturate(1.35) brightness(1.05)" },
  { name: "Crema", css: "contrast(0.9) brightness(1.1) sepia(0.3) saturate(0.9)" },
  { name: "Gingham", css: "brightness(1.05) contrast(0.95) sepia(0.1) saturate(1.1)" },
  { name: "Juno", css: "contrast(1.15) saturate(1.4) sepia(0.15)" },
  { name: "Lark", css: "contrast(0.9) brightness(1.1) saturate(1.1)" },
  { name: "Ludwig", css: "contrast(1.05) brightness(1.05) sepia(0.25) saturate(1.05)" },
  { name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Asli", css: "none" },
  { name: "Perpetua", css: "contrast(1.1) brightness(1.15) saturate(1.1) hue-rotate(-10deg)" },
  { name: "Reyes", css: "contrast(0.85) brightness(1.1) sepia(0.25) saturate(0.9)" },
  { name: "Slumber", css: "saturate(0.66) brightness(1.05) contrast(0.9) sepia(0.35)" },
];

const filterCss = (name: FilterName | string): string =>
  FILTERS.find((f) => f.name === name)?.css ?? "none";

const CAPTION_MAX = 2200;

const EMOJIS: string[] = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🥰",
  "😎", "🤔", "😐", "🙄", "😴", "😷", "🤯", "🥳",
  "😭", "😡", "👍", "👎", "🙏", "👏", "💪", "✌️",
  "🤝", "👀", "🙌", "🔥", "⭐", "🌟", "💯", "🎉",
  "❤️", "💙", "💚", "💛", "💜", "🖤", "🤍", "💔",
  "🌹", "🌻", "🌙", "☀️", "⛅", "🌈", "⚡", "❄️",
  "🌊", "🏔️", "🌅", "🌃", "🍎", "🍕", "🍔", "🍩",
  "☕", "🍵", "⚽", "🏀", "🎮", "🎧", "🎸", "📸",
  "🚗", "✈️", "🏠", "🎁", "💡", "📌", "✅", "❌",
];

type AdjustKey = "kecerahan" | "kontras" | "pudar" | "saturasi" | "suhu" | "vinyet";
type AdjustState = Record<AdjustKey, number>;

const DEFAULT_ADJUST: AdjustState = {
  kecerahan: 0,
  kontras: 0,
  pudar: 0,
  saturasi: 0,
  suhu: 0,
  vinyet: 0,
};

const ADJUST_ITEMS: { key: AdjustKey; label: string }[] = [
  { key: "kecerahan", label: "Kecerahan" },
  { key: "kontras", label: "Kontras" },
  { key: "pudar", label: "Pudar" },
  { key: "saturasi", label: "Saturasi" },
  { key: "suhu", label: "Suhu" },
  { key: "vinyet", label: "Vinyet" },
];

const adjustFilterParts = (a: AdjustState): string[] => {
  const parts: string[] = [];
  if (a.kecerahan !== 0) parts.push(`brightness(${1 + a.kecerahan / 100})`);
  if (a.kontras !== 0) parts.push(`contrast(${1 + a.kontras / 100})`);
  if (a.saturasi !== 0) parts.push(`saturate(${1 + a.saturasi / 100})`);
  if (a.pudar !== 0)
    parts.push(
      `brightness(${1 + a.pudar / 300}) contrast(${1 - a.pudar / 300}) saturate(${1 - a.pudar / 300})`,
    );
  if (a.suhu !== 0) {
    if (a.suhu > 0) parts.push(`sepia(${a.suhu / 250}) saturate(${1 + a.suhu / 400})`);
    else
      parts.push(
        `hue-rotate(${a.suhu / 2}deg) saturate(${1 + Math.abs(a.suhu) / 400})`,
      );
  }
  return parts;
};

const combineFilter = (base: string, a: AdjustState): string => {
  const parts = [
    ...(base && base !== "none" ? [base] : []),
    ...adjustFilterParts(a),
  ];
  return parts.length ? parts.join(" ") : "none";
};

const getImageSize = (
  url: string,
): Promise<{ w: number; h: number } | null> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// Target aspek (w/h) untuk tiap frame. null = asli (tanpa crop).
const frameToAspect = (f: FrameKey): number | null => {
  if (f === "1:1") return 1;
  if (f === "4:5") return 4 / 5;
  if (f === "16:9") return 16 / 9;
  return null;
};

const loadImageEl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = url;
  });
};

// Baking frame ke file: tiru preview (objectFit cover di wadah aspek + zoom scale).
// Crop tengah ala cover, lalu perkecil area crop sesuai zoom (>1 = makin ngezoom).
// Mengembalikan File jpg baru, atau null kalau tidak perlu / gagal (pakai URL asli).
const cropLoadedImageToFrame = async (
  img: HTMLImageElement,
  frameKey: FrameKey,
  zoom: number,
): Promise<File | null> => {
  const targetAspect = frameToAspect(frameKey);
  if (!targetAspect) return null;
  try {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    if (!sw || !sh) return null;
    const srcAspect = sw / sh;
    let cw: number;
    let ch: number;
    let cx: number;
    let cy: number;
    if (srcAspect > targetAspect) {
      // Sumber lebih lebar -> potong kiri-kanan.
      ch = sh;
      cw = Math.round(sh * targetAspect);
      cx = Math.round((sw - cw) / 2);
      cy = 0;
    } else {
      // Sumber lebih tinggi -> potong atas-bawah.
      cw = sw;
      ch = Math.round(sw / targetAspect);
      cx = 0;
      cy = Math.round((sh - ch) / 2);
    }
    const z = Math.max(1, zoom || 1);
    if (z > 1) {
      const zw = Math.max(1, Math.round(cw / z));
      const zh = Math.max(1, Math.round(ch / z));
      cx = Math.min(sw - zw, Math.max(0, cx + Math.round((cw - zw) / 2)));
      cy = Math.min(sh - zh, Math.max(0, cy + Math.round((ch - zh) / 2)));
      cw = zw;
      ch = zh;
    }
    // Batasi dimensi output maks 2000px (konsisten dengan compressImage).
    const MAX_OUT = 2000;
    const scale = Math.min(1, MAX_OUT / Math.max(cw, ch));
    const outW = Math.max(1, Math.round(cw * scale));
    const outH = Math.max(1, Math.round(ch * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, cx, cy, cw, ch, 0, 0, outW, outH);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return null;
    return new File([blob], `post-${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch {
    return null;
  }
};

const bakeFrameToFile = async (
  url: string,
  frameKey: FrameKey,
  zoom: number,
): Promise<File | null> => {
  if (!frameToAspect(frameKey)) return null;
  try {
    const img = await loadImageEl(url);
    return await cropLoadedImageToFrame(img, frameKey, zoom);
  } catch {
    return null;
  }
};

// Baking dari File lokal (tanpa CORS): dipakai utama saat submit.
const bakeFrameFromFile = async (
  file: File,
  frameKey: FrameKey,
  zoom: number,
): Promise<File | null> => {
  if (!frameToAspect(frameKey)) return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal memuat gambar"));
      el.src = objectUrl;
    });
    return await cropLoadedImageToFrame(img, frameKey, zoom);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export default function PostinganPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [bakingFrame, setBakingFrame] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const dragIndexRef = useRef<number | null>(null);
  const [frame, setFrame] = useState<FrameKey>("4:5");
  // Frame per-media: tiap media punya bingkai sendiri (16:9, 1:1, 4:5, asli).
  // `frame` di atas hanya default untuk media baru / fallback.
  const [frameMap, setFrameMap] = useState<Record<string, FrameKey>>({});
  const [zoomMap, setZoomMap] = useState<Record<string, number>>({});
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [editTab, setEditTab] = useState<"filter" | "penyesuaian">("filter");
  const [filterMap, setFilterMap] = useState<Record<string, FilterName>>({});
  const [adjustMap, setAdjustMap] = useState<Record<string, AdjustState>>({});
  const [emojiOpen, setEmojiOpen] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicDebounced, setMusicDebounced] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<SpotifyTrack | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicMuted, setMusicMuted] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Lagu terpasang: otomatis tersetel (loop) saat di step Deskripsi & tidak dimute.
  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    const url = selectedMusic?.previewUrl;
    if (step === 3 && url && !musicMuted) {
      if (audio.src !== url) audio.src = url;
      audio.loop = true;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    return () => {
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedMusic, musicMuted]);
  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locDebounced, setLocDebounced] = useState("");
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setMusicDebounced(musicQuery), 350);
    return () => window.clearTimeout(t);
  }, [musicQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => setLocDebounced(locQuery), 500);
    return () => window.clearTimeout(t);
  }, [locQuery]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => setPreviewId(null);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, []);

  const musicSearching = musicDebounced.trim().length >= 2;
  const trending = useSpotifyTrending(musicOpen && !musicSearching);
  const musicSearch = useSpotifySearch(musicOpen ? musicDebounced : "");
  const musicList = musicSearching
    ? (musicSearch.data?.data ?? [])
    : (trending.data?.data ?? []);
  const musicLoading = musicSearching ? musicSearch.isFetching : trending.isFetching;

  const locSearch = useQuery<NominatimPlace[]>({
    queryKey: ["nominatim", locDebounced.trim()],
    queryFn: () => fetchPlaces(locDebounced.trim()),
    enabled: locOpen && locDebounced.trim().length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const togglePreview = (track: SpotifyTrack) => {
    if (!track.previewUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === track.id) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.src = track.previewUrl;
    audio.play().catch(() => {});
    setPreviewId(track.id);
  };

  const pendingUploads = uploadingCount > 0;
  const progressValues = Object.values(uploadProgress);
  const averageUploadProgress = progressValues.length
    ? Math.round(
        progressValues.reduce((a, b) => a + b, 0) / progressValues.length,
      )
    : 0;

  const { data: profile } = useProfile();
  const displayName = profile?.name ?? "User";
  const mutation = useCreatePost();

  const formik = useFormik({
    initialValues: {
      medias: [] as MediaItem[],
      caption: "",
    },
    validationSchema: Yup.object({
      medias: Yup.array().min(1, "Tambahkan minimal 1 foto/video"),
      caption: Yup.string().max(CAPTION_MAX, `Maksimal ${CAPTION_MAX} karakter`),
    }),
    onSubmit: async (values) => {
      if (pendingUploads || bakingFrame) return;
      if (values.medias.length === 0) return;
      if (values.medias.some((m) => m.local)) return;
      // Baking frame per-media ke file (khusus gambar, video dilewati):
      // hasil crop diupload ulang agar feed benar-benar 16:9 / 1:1 / 4:5.
      setBakingFrame(true);
      try {
        const finalMedias: { url: string; type: "image" | "video" }[] =
          [];
        for (const m of values.medias) {
          if (m.type !== "image") {
            finalMedias.push({ url: m.url, type: m.type });
            continue;
          }
          const f: FrameKey = frameMap[m.key] ?? frame;
          const z = zoomMap[m.key] ?? 1;
          if (f === "asli" && z <= 1) {
            finalMedias.push({ url: m.url, type: m.type });
            continue;
          }
          // Utamakan file lokal (tanpa CORS) daripada download ulang URL remote.
          const cropped = m.origFile
            ? await bakeFrameFromFile(m.origFile, f, z)
            : await bakeFrameToFile(m.url, f, z);
          if (!cropped) {
            finalMedias.push({ url: m.url, type: m.type });
            continue;
          }
          try {
            const bakedUrl = await uploadToCloudinary(cropped);
            finalMedias.push({ url: bakedUrl, type: m.type });
          } catch {
            finalMedias.push({ url: m.url, type: m.type });
          }
        }
        const payload = {
          content: (values.caption ?? "").slice(0, CAPTION_MAX),
          location: selectedLoc ?? undefined,
          music: selectedMusic
            ? {
                url: selectedMusic.previewUrl,
                title: selectedMusic.title,
                artist: selectedMusic.artist,
                cover: selectedMusic.cover,
              }
            : null,
          medias: values.medias.map(({ type, key }, i) => ({
            url: finalMedias[i]?.url ?? values.medias[i].url,
            type,
            // Urutan slide otomatis dari sistem: upload pertama = slide 1.
            sortOrder: i,
            filter: filterMap[key] ?? "Asli",
            adjustments: adjustMap[key] ?? { ...DEFAULT_ADJUST },
          })),
        };
        mutation.mutate(payload, {
          onSuccess: () => {
            formik.resetForm();
            setActiveIndex(0);
            setFrame("4:5");
            setFrameMap({});
            setZoomMap({});
            setOpenPanel(null);
            setFilterMap({});
            setAdjustMap({});
            setStep(1);
            setEditTab("filter");
            setEmojiOpen(false);
            setMusicOpen(false);
            setMusicQuery("");
            setMusicDebounced("");
            setSelectedMusic(null);
            setPreviewId(null);
            setMusicMuted(false);
            audioRef.current?.pause();
            musicAudioRef.current?.pause();
            setLocOpen(false);
            setLocQuery("");
            setLocDebounced("");
            setSelectedLoc(null);
            router.push("/");
          },
          onSettled: () => setBakingFrame(false),
        });
      } catch {
        setBakingFrame(false);
      }
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const remaining = MAX_MEDIA - formik.values.medias.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    const localItems: MediaItem[] = await Promise.all(
      toUpload.map(async (file) => {
        const url = URL.createObjectURL(file);
        const type = file.type.startsWith("video") ? "video" : "image";
        if (type === "image") {
          const size = await getImageSize(url);
          return {
            key: `local-${Date.now()}-${Math.random()}`,
            url,
            type,
            local: true,
            w: size?.w,
            h: size?.h,
            origFile: file,
          } as MediaItem;
        }
        return {
          key: `local-${Date.now()}-${Math.random()}`,
          url,
          type,
          local: true,
          origFile: file,
        } as MediaItem;
      }),
    );

    formik.setFieldValue("medias", [...formik.values.medias, ...localItems]);
    setFilterMap((prev) => {
      const next = { ...prev };
      for (const item of localItems) next[item.key] = "Asli";
      return next;
    });
    // Media baru mewarisi frame default terakhir (snapshot per-media).
    setFrameMap((prev) => {
      const next = { ...prev };
      for (const item of localItems) next[item.key] = frame;
      return next;
    });
    setActiveIndex(formik.values.medias.length);
    setOpenPanel(null);

    for (let i = 0; i < toUpload.length; i++) {
      setUploadingCount((c) => c + 1);
      const file = toUpload[i];
      const itemKey = localItems[i].key;
      try {
        const optimized = await compressImage(file);
        setUploadProgress((p) => ({ ...p, [itemKey]: 0 }));
        const url = await uploadToCloudinary(optimized, (percent) =>
          setUploadProgress((p) => ({ ...p, [itemKey]: percent })),
        );
        formik.setFieldValue("medias", (prev: MediaItem[]) =>
          prev.map((m) =>
            m.key === itemKey ? { ...m, url, local: false, origFile: optimized } : m,
          ),
        );
      } catch (err) {
        console.error("Gagal upload:", err);
        alert(
          "Gagal mengunggah salah satu media. Pastikan ukuran file tidak terlalu besar, lalu coba lagi.",
        );
        formik.setFieldValue("medias", (prev: MediaItem[]) =>
          prev.filter((m) => m.key !== itemKey),
        );
      } finally {
        setUploadingCount((c) => c - 1);
        setUploadProgress((p) => {
          const next = { ...p };
          delete next[itemKey];
          return next;
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const removeMedia = (index: number) => {
    const item = formik.values.medias[index];
    if (item?.local) URL.revokeObjectURL(item.url);
    const updated = formik.values.medias.filter((_, i) => i !== index);
    formik.setFieldValue("medias", updated);
    if (item) {
      setFrameMap((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
      setZoomMap((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
      setFilterMap((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
      setAdjustMap((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
    }
    setActiveIndex((prev) => {
      if (updated.length === 0) return 0;
      return Math.min(prev, updated.length - 1);
    });
    if (updated.length === 0) setOpenPanel(null);
  };

  // Geser urutan slide: pindahkan media dari index `from` ke `to`.
  // Dipakai tombol panah + drag thumbnail. Active ikut ke posisi baru.
  const moveMedia = (from: number, to: number) => {
    const len = formik.values.medias.length;
    if (from < 0 || to < 0 || from >= len || to >= len || from === to) return;
    const updated = [...formik.values.medias];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    formik.setFieldValue("medias", updated);
    setActiveIndex(to);
  };

  const medias = formik.values.medias;
  const clampedIndex =
    medias.length === 0 ? 0 : Math.min(activeIndex, medias.length - 1);
  const activeMedia = medias[clampedIndex];
  // Frame aktif = milik media aktif (fallback ke default global).
  const activeFrame: FrameKey = activeMedia
    ? (frameMap[activeMedia.key] ?? frame)
    : frame;
  const activeZoom = activeMedia ? (zoomMap[activeMedia.key] ?? 1) : 1;
  const activeFilter: FilterName = activeMedia
    ? (filterMap[activeMedia.key] ?? "Asli")
    : "Asli";
  const activeFilterCss = filterCss(activeFilter);
  const activeAdjust: AdjustState = activeMedia
    ? (adjustMap[activeMedia.key] ?? DEFAULT_ADJUST)
    : DEFAULT_ADJUST;
  const activeCombinedFilter = combineFilter(activeFilterCss, activeAdjust);
  const vinyetOpacity =
    activeAdjust.vinyet === 0
      ? 0
      : (Math.abs(activeAdjust.vinyet) / 100) * 0.75;
  const vinyetColor =
    activeAdjust.vinyet >= 0 ? "0,0,0" : "255,255,255";
  const canGoEdit =
    medias.length > 0 && !pendingUploads && !medias.some((m) => m.local);

  const captionLen = formik.values.caption?.length ?? 0;
  const captionCounter = `${captionLen.toLocaleString("id-ID")}/${CAPTION_MAX.toLocaleString("id-ID")}`;

  const insertEmoji = (emoji: string) => {
    const cur = formik.values.caption ?? "";
    const el = captionRef.current;
    if (!el) {
      formik.setFieldValue("caption", (cur + emoji).slice(0, CAPTION_MAX));
      return;
    }
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    const next = (cur.slice(0, start) + emoji + cur.slice(end)).slice(
      0,
      CAPTION_MAX,
    );
    formik.setFieldValue("caption", next);
    const caret = Math.min(start + emoji.length, CAPTION_MAX);
    requestAnimationFrame(() => {
      try {
        el.focus();
        el.setSelectionRange(caret, caret);
      } catch {}
    });
  };

  const previewAspect =
    activeFrame === "1:1"
      ? "1 / 1"
      : activeFrame === "16:9"
        ? "16 / 9"
        : activeFrame === "asli" && activeMedia?.w && activeMedia?.h
          ? `${activeMedia.w} / ${activeMedia.h}`
          : "4 / 5";
  const previewFit = activeFrame === "asli" ? "contain" : "cover";

  const FRAME_OPTIONS: { key: FrameKey; label: string; Icon: typeof Square }[] =
    [
      { key: "asli", label: "Asli", Icon: ImageIcon },
      { key: "1:1", label: "1:1", Icon: Square },
      { key: "4:5", label: "4:5", Icon: RectangleVertical },
      { key: "16:9", label: "16:9", Icon: RectangleHorizontal },
    ];

  const togglePanel = (key: Exclude<PanelKey, null>) => {
    setOpenPanel((prev) => (prev === key ? null : key));
  };

  return (
    <Box
      position="fixed"
      inset={0}
      bg="black"
      color="white"
      zIndex={100}
      overflowY="auto"
    >
      {/* Top bar */}
      <Flex
        position="sticky"
        top={0}
        zIndex={2}
        px={4}
        py={3}
        align="center"
        justify="space-between"
        bg="blackAlpha.700"
        backdropFilter="blur(8px)"
      >
        <IconButton
          aria-label="Tutup"
          variant="ghost"
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
          onClick={() => router.push("/")}
        >
          <X size={22} />
        </IconButton>
        <Text fontWeight="black" fontSize="sm" letterSpacing="wide">
          POSTINGAN
        </Text>
        <Box w="40px" />
      </Flex>

      {/* Body step 1 */}
      {step === 1 && (
      <Flex px={4} justify="center" mt={4} mb={2}>
        <Box w="full" maxW="500px" bg="var(--app-card)" borderRadius="2xl" shadow="2xl">
          <VStack p={5} align="stretch" gap={4}>
            <HStack gap={3}>
              <Box
                w="45px"
                h="45px"
                bg="var(--app-subtle)"
                borderRadius="full"
                overflow="hidden"
                flexShrink={0}
              >
                <Image
                  src={profile?.avatar || "/default-avatar.jpg"}
                  alt="Avatar"
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
              <VStack align="start" gap={0}>
                <Link as={NextLink} href="/profile">
                  <Text
                    fontWeight="bold"
                    color="white"
                  >
                    {profile?.username || displayName}
                  </Text>
                </Link>
                <HStack gap={1} color="blue.600">
                  <Globe size={12} />
                  <Text fontSize="xs" fontWeight="bold">
                    Publik
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <input
              type="file"
              hidden
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
            />

            {medias.length === 0 ? (
              <Box
                border="2px dashed"
                borderColor="blue.100"
                borderRadius="xl"
                p={8}
                textAlign="center"
                cursor={pendingUploads ? "not-allowed" : "pointer"}
                _hover={!pendingUploads ? { bg: "var(--app-hover)" } : {}}
                onClick={() =>
                  !pendingUploads && fileInputRef.current?.click()
                }
              >
                <VStack gap={2}>
                  <ImageIcon size={30} color="#2563eb" />
                  <Text fontSize="sm" color="blue.800" fontWeight="bold">
                    {pendingUploads
                      ? `Mengunggah foto di background... (${averageUploadProgress}%)`
                      : "Tambah Foto/Video"}
                  </Text>
                  <Text fontSize="xs" color="var(--app-faint)">
                    {medias.length} / {MAX_MEDIA} media dipilih
                    {pendingUploads ? ` (${uploadingCount} mengunggah)` : ""}
                  </Text>
                </VStack>
              </Box>
            ) : (
              <Box
                position="relative"
                borderRadius="xl"
                overflow="hidden"
                bg="var(--app-text)"
                w="full"
                style={{ aspectRatio: previewAspect }}
              >
                <style>{`
                  .postingan-zoom-range { -webkit-appearance: none; appearance: none; width: 100%; height: 2px; background: rgba(255,255,255,0.3); border-radius: 999px; outline: none; }
                  .postingan-zoom-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 999px; background: white; cursor: pointer; border: none; box-shadow: 0 1px 6px rgba(0,0,0,0.5); }
                  .postingan-zoom-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 999px; background: white; cursor: pointer; border: none; }
                `}</style>
                {activeMedia?.type === "video" ? (
                  <video
                    src={activeMedia.url}
                    controls
                    playsInline
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: previewFit,
                      transform: `scale(${activeZoom})`,
                      transformOrigin: "center",
                    }}
                  />
                ) : (
                  activeMedia && (
                    <Image
                      as="img"
                      src={activeMedia.url}
                      w="full"
                      h="full"
                      objectFit={previewFit}
                      alt={`media-${clampedIndex}`}
                      style={{
                        transform: `scale(${activeZoom})`,
                        transformOrigin: "center",
                        transition: "transform 0.12s ease-out",
                      }}
                    />
                  )
                )}

                {activeMedia?.local && (
                  <Box
                    position="absolute"
                    inset={0}
                    bg="blackAlpha.400"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    gap={1}
                  >
                    <Spinner color="white" size="sm" />
                    <Text fontSize="xs" fontWeight="bold" color="white">
                      {uploadProgress[activeMedia.key] ?? 0}%
                    </Text>
                  </Box>
                )}

                {/* Buletan arrow tengah-kanan untuk geser media */}
                {medias.length > 1 && (
                  <>
                    {clampedIndex > 0 && (
                      <IconButton
                        aria-label="Sebelumnya"
                        size="sm"
                        position="absolute"
                        left={2}
                        top="50%"
                        transform="translateY(-50%)"
                        borderRadius="full"
                        bg="blackAlpha.600"
                        color="white"
                        _hover={{ bg: "blackAlpha.800" }}
                        onClick={() =>
                          setActiveIndex((p) => Math.max(0, p - 1))
                        }
                      >
                        <ChevronLeft size={18} />
                      </IconButton>
                    )}
                    {clampedIndex < medias.length - 1 && (
                      <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" zIndex={2}>
                        <Box
                          as="button"
                          aria-label="Media berikutnya"
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bg="blackAlpha.600"
                          color="white"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          cursor="pointer"
                          _hover={{ bg: "blackAlpha.800" }}
                          onClick={() =>
                            setActiveIndex((p) =>
                              Math.min(medias.length - 1, p + 1),
                            )
                          }
                        >
                          <ChevronRight size={20} />
                        </Box>
                      </Box>
                    )}
                    <Box
                      position="absolute"
                      top={2}
                      left="50%"
                      transform="translateX(-50%)"
                      bg="blackAlpha.600"
                      color="white"
                      borderRadius="full"
                      px={2}
                      py={0.5}
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {clampedIndex + 1}/{medias.length}
                    </Box>
                  </>
                )}

                {/* Panel Bingkai */}
                {openPanel === "frame" && (
                  <Box
                    position="absolute"
                    left={3}
                    bottom="60px"
                    zIndex={3}
                    w="168px"
                    bg="blackAlpha.700"
                    backdropFilter="blur(8px)"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    p={2}
                  >
                    {FRAME_OPTIONS.map((opt) => {
                      const isActive = activeFrame === opt.key;
                      return (
                        <Box
                          key={opt.key}
                          as="button"
                          w="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          px={3}
                          py={2.5}
                          borderRadius="lg"
                          bg={isActive ? "whiteAlpha.200" : "transparent"}
                          _hover={{ bg: "whiteAlpha.200" }}
                          onClick={() => {
                            if (!activeMedia) {
                              setFrame(opt.key);
                              return;
                            }
                            // Simpan hanya untuk media aktif + jadikan default media baru.
                            setFrameMap((prev) => ({
                              ...prev,
                              [activeMedia.key]: opt.key,
                            }));
                            setFrame(opt.key);
                          }}
                        >
                          <Text
                            fontSize="sm"
                            fontWeight={isActive ? "bold" : "medium"}
                            color={isActive ? "white" : "whiteAlpha.700"}
                          >
                            {opt.label}
                          </Text>
                          <opt.Icon
                            size={20}
                            color={isActive ? "white" : "rgba(255,255,255,0.7)"}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Panel Zoom: garis panjang + buletan putih */}
                {openPanel === "zoom" && activeMedia && (
                  <Box
                    position="absolute"
                    left="68px"
                    bottom="60px"
                    zIndex={3}
                    w="210px"
                    maxW="60%"
                    bg="blackAlpha.700"
                    backdropFilter="blur(8px)"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    px={3}
                    py={3}
                  >
                    <Flex align="center" gap={2}>
                      <Text fontSize="xs" color="whiteAlpha.700" fontWeight="bold" minW="32px">
                        {activeZoom.toFixed(1)}x
                      </Text>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={activeZoom}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setZoomMap((prev) => ({
                            ...prev,
                            [activeMedia.key]: v,
                          }));
                        }}
                        className="postingan-zoom-range"
                        aria-label="Zoom media"
                      />
                    </Flex>
                  </Box>
                )}

                {/* Panel Tumpuk: kelola media */}
                {openPanel === "stack" && (
                  <Box
                    position="absolute"
                    right={3}
                    bottom="60px"
                    zIndex={3}
                    w="240px"
                    maxW="70%"
                    bg="blackAlpha.700"
                    backdropFilter="blur(8px)"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    p={3}
                  >
                    {medias.length > 1 && (
                      <Flex align="center" justify="space-between" mb={2}>
                        <Text fontSize="10px" color="whiteAlpha.700" fontWeight="bold">
                          Geser slide {clampedIndex + 1}/{medias.length}
                        </Text>
                        <HStack gap={1}>
                          <Box
                            as="button"
                            aria-label="Geser slide ke kiri"
                            w="24px"
                            h="24px"
                            borderRadius="full"
                            bg="whiteAlpha.200"
                            color="white"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor={clampedIndex === 0 ? "not-allowed" : "pointer"}
                            opacity={clampedIndex === 0 ? 0.4 : 1}
                            _hover={{ bg: clampedIndex === 0 ? "whiteAlpha.200" : "whiteAlpha.300" }}
                            onClick={() => moveMedia(clampedIndex, clampedIndex - 1)}
                          >
                            <ChevronLeft size={14} />
                          </Box>
                          <Box
                            as="button"
                            aria-label="Geser slide ke kanan"
                            w="24px"
                            h="24px"
                            borderRadius="full"
                            bg="whiteAlpha.200"
                            color="white"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor={clampedIndex === medias.length - 1 ? "not-allowed" : "pointer"}
                            opacity={clampedIndex === medias.length - 1 ? 0.4 : 1}
                            _hover={{ bg: clampedIndex === medias.length - 1 ? "whiteAlpha.200" : "whiteAlpha.300" }}
                            onClick={() => moveMedia(clampedIndex, clampedIndex + 1)}
                          >
                            <ChevronRight size={14} />
                          </Box>
                        </HStack>
                      </Flex>
                    )}
                    <Flex gap={3} overflowX="auto" align="center">
                      {medias.map((m, i) => (
                        <Box
                          key={m.key}
                          position="relative"
                          flexShrink={0}
                          w="64px"
                          h="64px"
                          borderRadius="lg"
                          overflow="hidden"
                          border="2px solid"
                          borderColor={i === clampedIndex ? "white" : "transparent"}
                          cursor="grab"
                          draggable
                          onClick={() => setActiveIndex(i)}
                          onDragStart={(e) => {
                            dragIndexRef.current = i;
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const from = dragIndexRef.current;
                            dragIndexRef.current = null;
                            if (from !== null && from !== i) moveMedia(from, i);
                          }}
                          onDragEnd={() => {
                            dragIndexRef.current = null;
                          }}
                        >
                          {m.type === "video" ? (
                            <video
                              src={m.url}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <img
                              src={m.url}
                              alt={`thumb-${i}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          )}
                          {/* Nomor slide otomatis: upload pertama = 1 */}
                          <Box
                            position="absolute"
                            top="2px"
                            left="2px"
                            minW="20px"
                            h="20px"
                            px={1}
                            borderRadius="full"
                            bg="blackAlpha.700"
                            color="white"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="10px"
                            fontWeight="bold"
                          >
                            {i + 1}
                          </Box>
                          <Box
                            as="button"
                            aria-label="Hapus media"
                            position="absolute"
                            top="2px"
                            right="2px"
                            w="20px"
                            h="20px"
                            borderRadius="full"
                            bg="blackAlpha.700"
                            color="white"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            _hover={{ bg: "red.500" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMedia(i);
                            }}
                          >
                            <X size={12} />
                          </Box>
                          {/* Panah geser per thumbnail (mobile-friendly) */}
                          {medias.length > 1 && (
                            <>
                              {i > 0 && (
                                <Box
                                  as="button"
                                  aria-label={`Geser slide ${i + 1} ke kiri`}
                                  position="absolute"
                                  bottom="2px"
                                  left="2px"
                                  w="20px"
                                  h="20px"
                                  borderRadius="full"
                                  bg="blackAlpha.700"
                                  color="white"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  cursor="pointer"
                                  _hover={{ bg: "whiteAlpha.300" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveMedia(i, i - 1);
                                  }}
                                >
                                  <ChevronLeft size={12} />
                                </Box>
                              )}
                              {i < medias.length - 1 && (
                                <Box
                                  as="button"
                                  aria-label={`Geser slide ${i + 1} ke kanan`}
                                  position="absolute"
                                  bottom="2px"
                                  right="2px"
                                  w="20px"
                                  h="20px"
                                  borderRadius="full"
                                  bg="blackAlpha.700"
                                  color="white"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  cursor="pointer"
                                  _hover={{ bg: "whiteAlpha.300" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveMedia(i, i + 1);
                                  }}
                                >
                                  <ChevronRight size={12} />
                                </Box>
                              )}
                            </>
                          )}
                        </Box>
                      ))}
                      {medias.length < MAX_MEDIA && (
                        <Box
                          as="button"
                          aria-label="Tambah media"
                          flexShrink={0}
                          w="64px"
                          h="64px"
                          borderRadius="lg"
                          border="2px dashed"
                          borderColor="whiteAlpha.400"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          color="white"
                          cursor={pendingUploads ? "not-allowed" : "pointer"}
                          opacity={pendingUploads ? 0.5 : 1}
                          _hover={{ bg: "whiteAlpha.200" }}
                          onClick={() => {
                            if (pendingUploads) return;
                            fileInputRef.current?.click();
                          }}
                        >
                          <Plus size={22} />
                        </Box>
                      )}
                    </Flex>
                    <Text fontSize="10px" color="whiteAlpha.500" mt={2}>
                      {medias.length}/{MAX_MEDIA}
                    </Text>
                  </Box>
                )}

                {/* Bawah kiri: Bingkai + Zoom */}
                <Flex
                  position="absolute"
                  left={3}
                  bottom={3}
                  gap={2}
                  zIndex={2}
                >
                  <Box
                    as="button"
                    aria-label="Bingkai"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg={openPanel === "frame" ? "white" : "blackAlpha.600"}
                    color={openPanel === "frame" ? "black" : "white"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{
                      bg: openPanel === "frame" ? "white" : "blackAlpha.800",
                    }}
                    onClick={() => togglePanel("frame")}
                  >
                    <Crop size={18} />
                  </Box>
                  <Box
                    as="button"
                    aria-label="Perbesar"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg={openPanel === "zoom" ? "white" : "blackAlpha.600"}
                    color={openPanel === "zoom" ? "black" : "white"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{
                      bg: openPanel === "zoom" ? "white" : "blackAlpha.800",
                    }}
                    onClick={() => togglePanel("zoom")}
                  >
                    <ZoomIn size={18} />
                  </Box>
                </Flex>

                {/* Bawah kanan: Tumpuk */}
                <Box position="absolute" right={3} bottom={3} zIndex={2}>
                  <Box
                    as="button"
                    aria-label="Kelola media"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg={openPanel === "stack" ? "white" : "blackAlpha.600"}
                    color={openPanel === "stack" ? "black" : "white"}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{
                      bg: openPanel === "stack" ? "white" : "blackAlpha.800",
                    }}
                    onClick={() => togglePanel("stack")}
                  >
                    <Layers size={18} />
                  </Box>
                </Box>
              </Box>
            )}
          </VStack>

          <Flex p={4} borderTop="1px solid" borderColor="var(--app-hover)" justify="end">
            <Button
              bg="blue.600"
              color="white"
              px={8}
              borderRadius="full"
              fontWeight="bold"
              onClick={() => {
                if (!canGoEdit) return;
                setEditTab("filter");
                setStep(2);
              }}
              disabled={!canGoEdit || mutation.isPending}
            >
              {pendingUploads
                ? `Mengunggah... ${averageUploadProgress}%`
                : "Selanjutnya"}
            </Button>
          </Flex>
        </Box>
      </Flex>
      )}

      {step === 2 && activeMedia && (
        <Flex px={4} justify="center" mt={4} mb={2}>
        <Box w="full" maxW="900px" bg="var(--app-card)" borderRadius="2xl" shadow="2xl">
          <HStack gap={3} px={5} pt={5} pb={4}>
            <Box
              w="45px"
              h="45px"
              bg="var(--app-subtle)"
              borderRadius="full"
              overflow="hidden"
              flexShrink={0}
            >
              <Image
                src={profile?.avatar || "/default-avatar.jpg"}
                alt="Avatar"
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <VStack align="start" gap={0}>
              <Link as={NextLink} href="/profile">
                <Text
                  fontWeight="bold"
                  color="blue.900"
                  _hover={{ textDecoration: "underline" }}
                >
                  {profile?.username || displayName}
                </Text>
              </Link>
              <HStack gap={1} color="blue.600">
                <Globe size={12} />
                <Text fontSize="xs" fontWeight="bold">
                  Publik
                </Text>
              </HStack>
            </VStack>
          </HStack>
        <Flex
          direction={{ base: "column", md: "row" }}
          w="full"
          align="stretch"
        >
          {/* Kiri: preview */}
          <Box flex={1} p={4} minW={0}>
            <Box
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              bg="var(--app-text)"
              w="full"
              style={{ aspectRatio: previewAspect }}
            >
              {activeMedia.type === "video" ? (
                <video
                  src={activeMedia.url}
                  controls
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: previewFit,
                    transform: `scale(${activeZoom})`,
                    transformOrigin: "center",
                    filter: activeCombinedFilter,
                  }}
                />
              ) : (
                <Image
                  as="img"
                  src={activeMedia.url}
                  w="full"
                  h="full"
                  objectFit={previewFit}
                  alt="Pratinjau edit"
                  style={{
                    transform: `scale(${activeZoom})`,
                    transformOrigin: "center",
                    filter: activeCombinedFilter,
                  }}
                />
              )}
              {vinyetOpacity > 0 && (
                <Box
                  position="absolute"
                  inset={0}
                  pointerEvents="none"
                  zIndex={1}
                  style={{
                    background: `radial-gradient(ellipse at center, transparent 55%, rgba(${vinyetColor},0.85) 100%)`,
                    opacity: vinyetOpacity,
                  }}
                />
              )}
              {medias.length > 1 && clampedIndex < medias.length - 1 && (
                <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" zIndex={2}>
                  <Box
                    as="button"
                    aria-label="Media berikutnya"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg="blackAlpha.600"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ bg: "blackAlpha.800" }}
                    onClick={() =>
                      setActiveIndex((p) => Math.min(medias.length - 1, p + 1))
                    }
                  >
                    <ChevronRight size={20} />
                  </Box>
                </Box>
              )}
              {medias.length > 1 && clampedIndex > 0 && (
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={2}>
                  <Box
                    as="button"
                    aria-label="Media sebelumnya"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg="blackAlpha.600"
                    color="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ bg: "blackAlpha.800" }}
                    onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft size={20} />
                  </Box>
                </Box>
              )}
              {medias.length > 1 && (
                <Flex
                  position="absolute"
                  bottom={3}
                  left="50%"
                  transform="translateX(-50%)"
                  gap={1.5}
                  zIndex={2}
                >
                  {medias.map((m, i) => (
                    <Box
                      key={m.key}
                      w="7px"
                      h="7px"
                      borderRadius="full"
                      bg={i === clampedIndex ? "blue.500" : "white"}
                      cursor="pointer"
                      onClick={() => setActiveIndex(i)}
                    />
                  ))}
                </Flex>
              )}
            </Box>
          </Box>

          {/* Kanan: Filter / Penyesuaian */}
          <Box
            w={{ base: "full", md: "340px" }}
            flexShrink={0}
            borderLeft={{ base: "none", md: "1px solid" }}
            borderColor={{ base: "transparent", md: "var(--app-border)" }}
            borderTop={{ base: "1px solid", md: "none" }}
            borderTopColor={{ base: "var(--app-border)", md: "transparent" }}
          >
            <Flex>
              {(["filter", "penyesuaian"] as const).map((tab) => {
                const isActive = editTab === tab;
                return (
                  <Box
                    key={tab}
                    as="button"
                    flex={1}
                    py={3}
                    textAlign="center"
                    borderBottom="2px solid"
                    borderColor={isActive ? "blue.600" : "transparent"}
                    onClick={() => setEditTab(tab)}
                  >
                    <Text
                      fontSize="sm"
                      fontWeight={isActive ? "bold" : "medium"}
                      color={isActive ? "var(--app-text)" : "var(--app-muted)"}
                      textTransform="capitalize"
                    >
                      {tab === "filter" ? "Filter" : "Penyesuaian"}
                    </Text>
                  </Box>
                );
              })}
            </Flex>

            {editTab === "filter" ? (
              <Box
                display="grid"
                gridTemplateColumns="repeat(3, 1fr)"
                gap={4}
                p={4}
                pb={8}
              >
                {FILTERS.map((f) => {
                  const isActive = activeFilter === f.name;
                  return (
                    <Box
                      key={f.name}
                      as="button"
                      textAlign="center"
                      onClick={() => {
                        if (!activeMedia) return;
                        setFilterMap((prev) => ({
                          ...prev,
                          [activeMedia.key]: f.name,
                        }));
                      }}
                    >
                      <Box
                        borderRadius="md"
                        overflow="hidden"
                        style={{ aspectRatio: previewAspect }}
                        bg="var(--app-secondary)"
                        border="2px solid"
                        borderColor={isActive ? "blue.500" : "transparent"}
                      >
                        {activeMedia.type === "video" ? (
                          <video
                            src={activeMedia.url}
                            muted
                            playsInline
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: previewFit,
                              filter: combineFilter(f.css, activeAdjust),
                            }}
                          />
                        ) : (
                          <img
                            src={activeMedia.url}
                            alt={f.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: previewFit,
                              filter: combineFilter(f.css, activeAdjust),
                            }}
                          />
                        )}
                      </Box>
                      <Text
                        fontSize="xs"
                        mt={1.5}
                        fontWeight={isActive ? "bold" : "medium"}
                        color={isActive ? "blue.600" : "var(--app-secondary)"}
                      >
                        {f.name}
                      </Text>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box p={4} pb={8}>
                <style>{`
                  .postingan-adjust-range { -webkit-appearance: none; appearance: none; width: 100%; height: 2px; background: rgba(0,0,0,0.2); border-radius: 999px; outline: none; }
                  .postingan-adjust-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 999px; background: white; cursor: pointer; border: 1px solid #CBD5E1; box-shadow: 0 1px 6px rgba(0,0,0,0.35); }
                  .postingan-adjust-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 999px; background: white; cursor: pointer; border: 1px solid #CBD5E1; }
                `}</style>
                <VStack align="stretch" gap={5}>
                  {ADJUST_ITEMS.map((item) => {
                    const v = activeAdjust[item.key] ?? 0;
                    return (
                      <Box key={item.key}>
                        <Text fontSize="sm" fontWeight="medium" color="var(--app-text)">
                          {item.label}
                        </Text>
                        <Flex align="center" gap={3} mt={2}>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            step={1}
                            value={v}
                            onChange={(e) => {
                              if (!activeMedia) return;
                              const nv = Number(e.target.value);
                              setAdjustMap((prev) => ({
                                ...prev,
                                [activeMedia.key]: {
                                  ...(prev[activeMedia.key] ?? DEFAULT_ADJUST),
                                  [item.key]: nv,
                                },
                              }));
                            }}
                            className="postingan-adjust-range"
                            aria-label={item.label}
                          />
                          <Text
                            fontSize="xs"
                            color="var(--app-muted)"
                            minW="32px"
                            textAlign="right"
                          >
                            {Math.round(v)}
                          </Text>
                        </Flex>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
            )}
          </Box>
        </Flex>
        <Flex justify="space-between" align="center" p={4} borderTop="1px solid" borderColor="var(--app-hover)">
          <Button
            variant="outline"
            borderColor="var(--app-faint)"
            color="var(--app-secondary)"
            px={8}
            borderRadius="full"
            fontWeight="bold"
            _hover={{ bg: "var(--app-subtle)" }}
            onClick={() => setStep(1)}
          >
            Kembali
          </Button>
          <Button
            bg="blue.600"
            color="white"
            px={8}
            borderRadius="full"
            fontWeight="bold"
            disabled={!canGoEdit || mutation.isPending}
            onClick={() => {
              if (!canGoEdit) return;
              setEmojiOpen(false);
              setStep(3);
            }}
          >
            {pendingUploads
              ? `Mengunggah... ${averageUploadProgress}%`
              : "Selanjutnya"}
          </Button>
        </Flex>
        </Box>
        </Flex>
      )}

      {step === 3 && activeMedia && (
        <Flex px={4} justify="center" mt={4} mb={2}>
        <Box w="full" maxW="900px" bg="var(--app-card)" borderRadius="2xl" shadow="2xl">
          <HStack gap={3} px={5} pt={5} pb={4}>
            <Box
              w="45px"
              h="45px"
              bg="var(--app-subtle)"
              borderRadius="full"
              overflow="hidden"
              flexShrink={0}
            >
              <Image
                src={profile?.avatar || "/default-avatar.jpg"}
                alt="Avatar"
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <VStack align="start" gap={0}>
              <Link as={NextLink} href="/profile">
                <Text
                  fontWeight="bold"
                  color="blue.900"
                  _hover={{ textDecoration: "underline" }}
                >
                  {profile?.username || displayName}
                </Text>
              </Link>
              <HStack gap={1} color="blue.600">
                <Globe size={12} />
                <Text fontSize="xs" fontWeight="bold">
                  Publik
                </Text>
              </HStack>
            </VStack>
          </HStack>
          <Flex
            direction={{ base: "column", md: "row" }}
            w="full"
            align="stretch"
          >
            {/* Kiri: media */}
            <Box flex={1} p={4} pt={0} minW={0}>
              <Box
                position="relative"
                borderRadius="lg"
                overflow="hidden"
                bg="var(--app-text)"
                w="full"
                style={{ aspectRatio: previewAspect }}
              >
                {activeMedia.type === "video" ? (
                  <video
                    key={`${activeMedia.key}-${selectedMusic ? "muted" : "orig"}`}
                    src={activeMedia.url}
                    controls
                    playsInline
                    muted={!!selectedMusic}
                    ref={(el) => {
                      if (el) el.muted = !!selectedMusic;
                    }}
                    title={
                      selectedMusic
                        ? "Suara asli video dimatikan, diganti musik pilihan"
                        : "Memakai suara asli video"
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: previewFit,
                      transform: `scale(${activeZoom})`,
                      transformOrigin: "center",
                      filter: activeCombinedFilter,
                    }}
                  />
                ) : (
                  <Image
                    as="img"
                    src={activeMedia.url}
                    w="full"
                    h="full"
                    objectFit={previewFit}
                    alt="Pratinjau deskripsi"
                    style={{
                      transform: `scale(${activeZoom})`,
                      transformOrigin: "center",
                      filter: activeCombinedFilter,
                    }}
                  />
                )}
                {vinyetOpacity > 0 && (
                  <Box
                    position="absolute"
                    inset={0}
                    pointerEvents="none"
                    zIndex={1}
                    style={{
                      background: `radial-gradient(ellipse at center, transparent 55%, rgba(${vinyetColor},0.85) 100%)`,
                      opacity: vinyetOpacity,
                    }}
                  />
                )}
                {(selectedMusic?.title ||
                  medias.some((m) => m.type === "video")) && (
                  <Box position="absolute" top={3} left={3} zIndex={2} maxW="70%">
                    <Flex
                      align="center"
                      gap={2}
                      bg="blackAlpha.600"
                      borderRadius="full"
                      pl={2}
                      pr={3}
                      py={1.5}
                    >
                      <Music size={14} color="white" />
                      <Text fontSize="xs" fontWeight="bold" color="white" truncate>
                        {selectedMusic?.title ??
                          (activeMedia.type === "video"
                            ? "Audio Asli"
                            : medias.some((m) => m.type === "video")
                              ? "Audio Asli"
                              : "")}
                      </Text>
                    </Flex>
                  </Box>
                )}
                {selectedMusic?.previewUrl && (
                  <Box position="absolute" right={3} bottom={3} zIndex={2}>
                    <Box
                      as="button"
                      aria-label={musicMuted ? "Nyalakan lagu" : "Matikan lagu"}
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
                {medias.length > 1 && clampedIndex > 0 && (
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={2}>
                    <Box
                      as="button"
                      aria-label="Media sebelumnya"
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      bg="blackAlpha.600"
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      _hover={{ bg: "blackAlpha.800" }}
                      onClick={() => setActiveIndex((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft size={20} />
                    </Box>
                  </Box>
                )}
                {medias.length > 1 && clampedIndex < medias.length - 1 && (
                  <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" zIndex={2}>
                    <Box
                      as="button"
                      aria-label="Media berikutnya"
                      w="40px"
                      h="40px"
                      borderRadius="full"
                      bg="blackAlpha.600"
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      _hover={{ bg: "blackAlpha.800" }}
                      onClick={() =>
                        setActiveIndex((p) => Math.min(medias.length - 1, p + 1))
                      }
                    >
                      <ChevronRight size={20} />
                    </Box>
                  </Box>
                )}
                {medias.length > 1 && (
                  <Flex
                    position="absolute"
                    bottom={3}
                    left="50%"
                    transform="translateX(-50%)"
                    gap={1.5}
                    zIndex={2}
                  >
                    {medias.map((m, i) => (
                      <Box
                        key={m.key}
                        w="7px"
                        h="7px"
                        borderRadius="full"
                        bg={i === clampedIndex ? "blue.500" : "white"}
                        cursor="pointer"
                        onClick={() => setActiveIndex(i)}
                      />
                    ))}
                  </Flex>
                )}
              </Box>
            </Box>

            {/* Kanan: keterangan */}
            <Box
              w={{ base: "full", md: "340px" }}
              flexShrink={0}
              borderLeft={{ base: "none", md: "1px solid" }}
              borderColor={{ base: "transparent", md: "var(--app-border)" }}
              borderTop={{ base: "1px solid", md: "none" }}
              borderTopColor={{ base: "var(--app-border)", md: "transparent" }}
              p={4}
              pt={{ base: 4, md: 0 }}
            >
              <HStack gap={2} mb={3}>
                <Box
                  w="32px"
                  h="32px"
                  bg="var(--app-subtle)"
                  borderRadius="full"
                  overflow="hidden"
                  flexShrink={0}
                >
                  <Image
                    src={profile?.avatar || "/default-avatar.jpg"}
                    alt="Avatar"
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                </Box>
                <Link as={NextLink} href="/profile">
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    color="blue.900"
                    _hover={{ textDecoration: "underline" }}
                  >
                    {profile?.username || displayName}
                  </Text>
                </Link>
              </HStack>
              <Textarea
                ref={captionRef}
                name="caption"
                value={formik.values.caption}
                onChange={formik.handleChange}
                placeholder="Tambahkan Keterangan..."
                maxLength={CAPTION_MAX}
                minH="140px"
                fontSize="sm"
                color="var(--app-text)"
                borderColor="var(--app-border)"
                borderRadius="xl"
                resize="vertical"
                _placeholder={{ color: "var(--app-faint)" }}
              />
              <Flex justify="space-between" align="center" mt={2}>
                <Box
                  as="button"
                  aria-label="Tambah emoji"
                  w="36px"
                  h="36px"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color={emojiOpen ? "blue.600" : "var(--app-muted)"}
                  bg={emojiOpen ? "var(--app-hover)" : "transparent"}
                  cursor="pointer"
                  _hover={{ bg: "var(--app-subtle)" }}
                  onClick={() => setEmojiOpen((v) => !v)}
                >
                  <Smile size={20} />
                </Box>
                <Text fontSize="xs" color="var(--app-muted)">
                  {captionCounter}
                </Text>
              </Flex>
              {emojiOpen && (
                <Box
                  mt={2}
                  border="1px solid"
                  borderColor="var(--app-border)"
                  borderRadius="xl"
                  p={2}
                  display="grid"
                  gridTemplateColumns="repeat(8, 1fr)"
                  gap={1}
                  maxH="180px"
                  overflowY="auto"
                >
                  {EMOJIS.map((e) => (
                    <Box
                      key={e}
                      as="button"
                      fontSize="xl"
                      textAlign="center"
                      borderRadius="md"
                      py={1}
                      _hover={{ bg: "var(--app-subtle)" }}
                      onClick={() => insertEmoji(e)}
                    >
                      {e}
                    </Box>
                  ))}
                </Box>
              )}
              <Box
                w="full"
                mt={3}
                pt={3}
                borderTop="1px solid"
                borderColor="var(--app-border)"
              >
                <Box
                  as="button"
                  w="full"
                  onClick={() => {
                    setLocOpen((v) => !v);
                    setMusicOpen(false);
                  }}
                >
                  <Flex justify="space-between" align="center" gap={2}>
                    <Text fontSize="sm" color="var(--app-secondary)" truncate textAlign="left">
                      {selectedLoc ?? "Tambahkan lokasi"}
                    </Text>
                    {selectedLoc ? (
                      <Box
                        as="span"
                        role="button"
                        aria-label="Hapus lokasi"
                        w="24px"
                        h="24px"
                        flexShrink={0}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "red.500" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoc(null);
                          setLocQuery("");
                          setLocDebounced("");
                        }}
                      >
                        <X size={14} />
                      </Box>
                    ) : (
                      <MapPin size={18} color="var(--app-muted)" />
                    )}
                  </Flex>
                </Box>
                {locOpen && !selectedLoc && (
                  <Box mt={2}>
                    <Input
                      placeholder="Ketik lokasi... (min. 3 huruf)"
                      value={locQuery}
                      onChange={(e) => setLocQuery(e.target.value)}
                      size="sm"
                      color="var(--app-text)"
                      borderColor="var(--app-border)"
                      borderRadius="lg"
                      _placeholder={{ color: "var(--app-faint)" }}
                      autoFocus
                    />
                    <Box mt={2} maxH="180px" overflowY="auto">
                      {locSearch.isFetching ? (
                        <Flex py={3} justify="center">
                          <Spinner size="sm" color="blue.500" />
                        </Flex>
                      ) : locSearch.isError ? (
                        <Text fontSize="xs" color="red.500" py={2}>
                          Gagal mencari lokasi, coba lagi.
                        </Text>
                      ) : (locSearch.data ?? []).length > 0 ? (
                        <VStack align="stretch" gap={1}>
                          {(locSearch.data ?? []).map((p) => (
                            <Box
                              key={p.place_id}
                              as="button"
                              textAlign="left"
                              px={2}
                              py={2}
                              borderRadius="md"
                              _hover={{ bg: "var(--app-subtle)" }}
                              onClick={() => {
                                setSelectedLoc(p.display_name);
                                setLocOpen(false);
                                setLocQuery("");
                                setLocDebounced("");
                              }}
                            >
                              <Text fontSize="xs" color="var(--app-secondary)" lineClamp={2}>
                                {p.display_name}
                              </Text>
                            </Box>
                          ))}
                        </VStack>
                      ) : locDebounced.trim().length >= 3 ? (
                        <Text fontSize="xs" color="var(--app-faint)" py={2}>
                          Lokasi tidak ditemukan.
                        </Text>
                      ) : (
                        <Text fontSize="xs" color="var(--app-faint)" py={2}>
                          Ketik lalu pilih dari hasil pencarian.
                        </Text>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
              <Box
                w="full"
                mt={3}
                pt={3}
                borderTop="1px solid"
                borderColor="var(--app-border)"
              >
                <Box
                  as="button"
                  w="full"
                  onClick={() => {
                    setMusicOpen((v) => !v);
                    setLocOpen(false);
                  }}
                >
                  <Flex justify="space-between" align="center" gap={2}>
                    {selectedMusic ? (
                      <HStack gap={2} flex={1} minW={0}>
                        {selectedMusic.cover ? (
                          <Image
                            src={selectedMusic.cover}
                            alt={selectedMusic.title}
                            w="32px"
                            h="32px"
                            borderRadius="md"
                            objectFit="cover"
                            flexShrink={0}
                          />
                        ) : (
                          <Box
                            w="32px"
                            h="32px"
                            borderRadius="md"
                            bg="var(--app-border)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            flexShrink={0}
                          >
                            <Music size={16} color="var(--app-muted)" />
                          </Box>
                        )}
                        <VStack align="start" gap={0} flex={1} minW={0}>
                          <Text fontSize="xs" fontWeight="bold" color="var(--app-text)" truncate w="full" textAlign="left">
                            {selectedMusic.title}
                          </Text>
                          <Text fontSize="10px" color="var(--app-muted)" truncate w="full" textAlign="left">
                            {selectedMusic.artist}
                          </Text>
                        </VStack>
                        <Box
                          as="span"
                          role="button"
                          aria-label="Hapus lagu"
                          w="24px"
                          h="24px"
                          flexShrink={0}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          color="var(--app-muted)"
                          _hover={{ bg: "var(--app-subtle)", color: "red.500" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMusic(null);
                            setPreviewId(null);
                            audioRef.current?.pause();
                          }}
                        >
                          <X size={14} />
                        </Box>
                      </HStack>
                    ) : (
                      <>
                        <Text fontSize="sm" color="var(--app-secondary)">
                          Tambahkan lagu
                        </Text>
                        <Music size={18} color="var(--app-muted)" />
                      </>
                    )}
                  </Flex>
                </Box>
                {musicOpen && !selectedMusic && (
                  <Box mt={2}>
                    <Input
                      placeholder="Ketik judul / penyanyi..."
                      value={musicQuery}
                      onChange={(e) => setMusicQuery(e.target.value)}
                      size="sm"
                      color="var(--app-text)"
                      borderColor="var(--app-border)"
                      borderRadius="lg"
                      _placeholder={{ color: "var(--app-faint)" }}
                      autoFocus
                    />
                    <Box mt={2} maxH="220px" overflowY="auto">
                      {musicLoading ? (
                        <Flex py={3} justify="center">
                          <Spinner size="sm" color="blue.500" />
                        </Flex>
                      ) : musicList.length > 0 ? (
                        <VStack align="stretch" gap={1}>
                          {musicList.map((t) => (
                            <Box
                              key={t.id}
                              as="button"
                              textAlign="left"
                              px={2}
                              py={1.5}
                              borderRadius="md"
                              _hover={{ bg: "var(--app-subtle)" }}
                              onClick={() => {
                                setSelectedMusic(t);
                                setMusicMuted(false);
                                setMusicOpen(false);
                                setMusicQuery("");
                                setMusicDebounced("");
                                setPreviewId(null);
                                audioRef.current?.pause();
                              }}
                            >
                              <HStack gap={2}>
                                {t.cover ? (
                                  <Image
                                    src={t.cover}
                                    alt={t.title}
                                    w="40px"
                                    h="40px"
                                    borderRadius="md"
                                    objectFit="cover"
                                    flexShrink={0}
                                  />
                                ) : (
                                  <Box
                                    w="40px"
                                    h="40px"
                                    borderRadius="md"
                                    bg="var(--app-border)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                  >
                                    <Music size={18} color="var(--app-muted)" />
                                  </Box>
                                )}
                                <VStack align="start" gap={0} flex={1} minW={0}>
                                  <Text fontSize="xs" fontWeight="bold" color="var(--app-text)" truncate w="full">
                                    {t.title}
                                  </Text>
                                  <Text fontSize="10px" color="var(--app-muted)" truncate w="full">
                                    {t.artist}
                                  </Text>
                                </VStack>
                                {t.previewUrl && (
                                  <Box
                                    as="span"
                                    role="button"
                                    aria-label={previewId === t.id ? "Jeda" : "Putar"}
                                    w="32px"
                                    h="32px"
                                    flexShrink={0}
                                    borderRadius="full"
                                    bg="var(--app-subtle)"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    color="var(--app-secondary)"
                                    _hover={{ bg: "var(--app-border)" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePreview(t);
                                    }}
                                  >
                                    {previewId === t.id ? (
                                      <Pause size={14} />
                                    ) : (
                                      <Play size={14} />
                                    )}
                                  </Box>
                                )}
                              </HStack>
                            </Box>
                          ))}
                        </VStack>
                      ) : (
                        <Text fontSize="xs" color="var(--app-faint)" py={2}>
                          {musicSearching
                            ? "Lagu tidak ditemukan."
                            : "Tidak ada lagu tren saat ini."}
                        </Text>
                      )}
                    </Box>
                  </Box>
                )}
                {medias.some((m) => m.type === "video") && (
                  <Text fontSize="10px" color="var(--app-muted)" mt={2} lineHeight="1.4">
                    {selectedMusic
                      ? "Video ini memakai musik pilihan — suara asli video dimatikan."
                      : "Video ini memakai suara asli — tampil sebagai “Audio Asli”. Pilih lagu untuk mengganti suaranya."}
                  </Text>
                )}
              </Box>
              <audio ref={audioRef} preload="none" />
              <audio ref={musicAudioRef} preload="none" loop />
            </Box>
          </Flex>
          <Flex justify="space-between" align="center" p={4} borderTop="1px solid" borderColor="var(--app-hover)">
            <Button
              variant="outline"
              borderColor="var(--app-faint)"
              color="var(--app-secondary)"
              px={8}
              borderRadius="full"
              fontWeight="bold"
              _hover={{ bg: "var(--app-subtle)" }}
              onClick={() => setStep(2)}
            >
              Kembali
            </Button>
            <Button
              bg="blue.600"
              color="white"
              px={8}
              borderRadius="full"
              fontWeight="bold"
              loading={mutation.isPending || bakingFrame}
              disabled={!canGoEdit || mutation.isPending || bakingFrame}
              onClick={() => formik.handleSubmit()}
            >
              {pendingUploads
                ? `Mengunggah... ${averageUploadProgress}%`
                : bakingFrame
                  ? "Menyiapkan frame..."
                  : "Bagikan"}
            </Button>
          </Flex>
        </Box>
        </Flex>
      )}

      <CreateTabs active="postingan" />
    </Box>
  );
}

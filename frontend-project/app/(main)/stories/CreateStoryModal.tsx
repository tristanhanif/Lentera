/* eslint-disable @next/next/no-img-element */
"use client";
import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Portal,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { Image as ImageIcon, Video as VideoIcon, X, Trash2 } from "lucide-react";
import { useCreateStory, uploadStoryFile } from "./story.service";
import {
  CreateStoryMediaPayload,
  StoryLayout,
} from "./story.interface";

// Kompresi gambar lokal khusus story (maxDim 1280, quality 0.82, output jpeg).
const compressStoryImage = (
  file: File,
  maxDim = 1280,
  quality = 0.82,
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

const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const layoutForCount = (count: number): StoryLayout => {
  if (count <= 1) return "single";
  if (count === 2) return "split2";
  if (count === 3) return "grid3";
  return "grid4";
};

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mutation = useCreateStory();

  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlockAtInput, setUnlockAtInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), [isOpen]);
  const minUnlock = useMemo(
    () => toLocalInputValue(new Date(now.getTime() + 5 * 60 * 1000)),
    [now],
  );
  const maxUnlock = useMemo(
    () => toLocalInputValue(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
    [now],
  );

  const resetState = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setCaption("");
    setLockEnabled(false);
    setUnlockAtInput("");
    setUploading(false);
    setProgress(0);
    setFileError(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading || mutation.isPending) return;
    resetState();
    onClose();
  };

  const switchMode = (next: "photo" | "video") => {
    if (next === mode || uploading) return;
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setFileError(null);
    setMode(next);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length === 0) return;
    const images = selected.filter((f) => f.type.startsWith("image/"));
    if (images.length !== selected.length) {
      setFileError("Mode foto hanya menerima file gambar.");
    } else {
      setFileError(null);
    }
    const remaining = 4 - files.length;
    if (remaining <= 0) {
      setFileError("Maksimal 4 foto per story.");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    const taken = images.slice(0, remaining);
    if (images.length > remaining) {
      setFileError("Maksimal 4 foto per story, kelebihan file diabaikan.");
    }
    setFiles((prev) => [...prev, ...taken]);
    setPreviews((prev) => [
      ...prev,
      ...taken.map((f) => URL.createObjectURL(f)),
    ]);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length === 0) return;
    const file = selected[0];
    if (!file.type.startsWith("video")) {
      setFileError("Mode video hanya menerima file video.");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    try {
      const duration = await getVideoDurationSec(file);
      if (duration > 16) {
        setFileError(
          `Durasi video ${Math.round(duration)} detik melebihi batas 15 detik.`,
        );
        if (videoInputRef.current) videoInputRef.current.value = "";
        return;
      }
    } catch {
      setFileError("Tidak dapat membaca durasi video, coba file lain.");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFileError(null);
    setFiles([file]);
    setPreviews([URL.createObjectURL(file)]);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeAt = (index: number) => {
    if (uploading) return;
    const url = previews[index];
    if (url) URL.revokeObjectURL(url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const validateUnlockAt = (): string | undefined => {
    if (!lockEnabled) return undefined;
    if (!unlockAtInput) {
      setFileError("Isi waktu buka kapsul atau matikan kunci waktu buka.");
      return undefined;
    }
    const target = new Date(unlockAtInput).getTime();
    if (Number.isNaN(target)) {
      setFileError("Format waktu buka kapsul tidak valid.");
      return undefined;
    }
    const diff = target - Date.now();
    if (diff < 5 * 60 * 1000 - 30 * 1000) {
      setFileError("Waktu buka minimal 5 menit dari sekarang.");
      return undefined;
    }
    if (diff > 24 * 60 * 60 * 1000) {
      setFileError("Waktu buka maksimal 24 jam dari sekarang.");
      return undefined;
    }
    return new Date(target).toISOString();
  };

  const handleSubmit = async () => {
    if (uploading || mutation.isPending || files.length === 0) return;
    setFileError(null);
    const unlockAt = validateUnlockAt();
    if (lockEnabled && !unlockAt) return;

    setUploading(true);
    setProgress(0);
    try {
      const uploaded: CreateStoryMediaPayload[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const optimized = file.type.startsWith("image/")
          ? await compressStoryImage(file)
          : file;
        const result = await uploadStoryFile(optimized, (percent) => {
          setProgress(Math.round(((i + percent / 100) / files.length) * 100));
        });
        uploaded.push({
          url: result.url,
          publicId: result.publicId,
          type: result.type,
        });
      }
      setProgress(100);
      mutation.mutate(
        {
          type: mode === "photo" ? "photo" : "video",
          layout: layoutForCount(uploaded.length),
          caption: caption.trim() ? caption.trim().slice(0, 500) : undefined,
          unlockAt,
          medias: uploaded,
        },
        {
          onSuccess: () => {
            resetState();
            onClose();
          },
          onSettled: () => setUploading(false),
        },
      );
    } catch (err) {
      console.error("Gagal mengunggah story:", err);
      setFileError("Gagal mengunggah media. Periksa ukuran file lalu coba lagi.");
      setUploading(false);
    }
  };

  const isBusy = uploading || mutation.isPending;
  const canSubmit = files.length > 0 && !isBusy;

  const renderPreview = () => {
    if (previews.length === 0) return null;
    const isVideo = mode === "video";
    if (previews.length === 1) {
      return (
        <Box position="relative" borderRadius="xl" overflow="hidden" bg="var(--app-subtle)">
          {isVideo ? (
            <video
              src={previews[0]}
              controls
              style={{ width: "100%", height: 280, objectFit: "cover" }}
            />
          ) : (
            <img
              src={previews[0]}
              alt="Pratinjau story"
              style={{ width: "100%", height: 280, objectFit: "cover" }}
            />
          )}
          <IconButton
            aria-label="Hapus media"
            size="xs"
            colorPalette="red"
            position="absolute"
            top={2}
            right={2}
            onClick={() => removeAt(0)}
            disabled={isBusy}
          >
            <Trash2 size={12} />
          </IconButton>
        </Box>
      );
    }
    if (previews.length === 2) {
      return (
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {previews.map((url, i) => (
            <Box key={url} position="relative" borderRadius="xl" overflow="hidden" bg="var(--app-subtle)">
              <img
                src={url}
                alt={`Pratinjau ${i + 1}`}
                style={{ width: "100%", height: 200, objectFit: "cover" }}
              />
              <IconButton
                aria-label={`Hapus foto ${i + 1}`}
                size="xs"
                colorPalette="red"
                position="absolute"
                top={2}
                right={2}
                onClick={() => removeAt(i)}
                disabled={isBusy}
              >
                <Trash2 size={12} />
              </IconButton>
            </Box>
          ))}
        </Grid>
      );
    }
    if (previews.length === 3) {
      return (
        <Grid templateColumns="2fr 1fr" templateRows="repeat(2, 1fr)" gap={2}>
          {previews.map((url, i) => (
            <GridItem key={url} rowSpan={i === 0 ? 2 : 1} colSpan={1}>
              <Box position="relative" borderRadius="xl" overflow="hidden" bg="var(--app-subtle)" h="full">
                <img
                  src={url}
                  alt={`Pratinjau ${i + 1}`}
                  style={{
                    width: "100%",
                    height: i === 0 ? 280 : 136,
                    objectFit: "cover",
                  }}
                />
                <IconButton
                  aria-label={`Hapus foto ${i + 1}`}
                  size="xs"
                  colorPalette="red"
                  position="absolute"
                  top={2}
                  right={2}
                  onClick={() => removeAt(i)}
                  disabled={isBusy}
                >
                  <Trash2 size={12} />
                </IconButton>
              </Box>
            </GridItem>
          ))}
        </Grid>
      );
    }
    return (
      <Grid templateColumns="repeat(2, 1fr)" gap={2}>
        {previews.map((url, i) => (
          <Box key={url} position="relative" borderRadius="xl" overflow="hidden" bg="var(--app-subtle)">
            <img
              src={url}
              alt={`Pratinjau ${i + 1}`}
              style={{ width: "100%", height: 160, objectFit: "cover" }}
            />
            <IconButton
              aria-label={`Hapus foto ${i + 1}`}
              size="xs"
              colorPalette="red"
              position="absolute"
              top={2}
              right={2}
              onClick={() => removeAt(i)}
              disabled={isBusy}
            >
              <Trash2 size={12} />
            </IconButton>
          </Box>
        ))}
      </Grid>
    );
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.600"
        zIndex={2000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        onClick={handleClose}
      >
        <Box
          bg="var(--app-card)"
          w="full"
          maxW="lg"
          borderRadius="2xl"
          shadow="2xl"
          maxH="90vh"
          overflowY="auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Flex justify="space-between" align="center" p={4} borderBottom="1px solid" borderColor="var(--app-border)">
            <IconButton variant="ghost" onClick={handleClose} color="var(--app-secondary)" aria-label="Tutup">
              <X size={20} />
            </IconButton>
            <Text fontWeight="black" color="var(--app-text)">
              Buat Story Baru
            </Text>
            <Box w="40px" />
          </Flex>

          <VStack p={5} align="stretch" gap={4}>
            {/* Pilih mode */}
            <HStack gap={2}>
              <Button
                flex={1}
                borderRadius="full"
                bg={mode === "photo" ? "orange.500" : "var(--app-subtle)"}
                color={mode === "photo" ? "white" : "var(--app-secondary)"}
                _hover={{ bg: mode === "photo" ? "orange.600" : "var(--app-border)" }}
                onClick={() => switchMode("photo")}
                disabled={isBusy}
              >
                <ImageIcon size={16} /> Foto
              </Button>
              <Button
                flex={1}
                borderRadius="full"
                bg={mode === "video" ? "orange.500" : "var(--app-subtle)"}
                color={mode === "video" ? "white" : "var(--app-secondary)"}
                _hover={{ bg: mode === "video" ? "orange.600" : "var(--app-border)" }}
                onClick={() => switchMode("video")}
                disabled={isBusy}
              >
                <VideoIcon size={16} /> Video
              </Button>
            </HStack>

            {/* Input file */}
            <input
              type="file"
              hidden
              multiple
              ref={photoInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
            />
            <input
              type="file"
              hidden
              ref={videoInputRef}
              onChange={handleVideoChange}
              accept="video/*"
            />
            <Box
              border="2px dashed"
              borderColor="orange.200"
              borderRadius="xl"
              p={6}
              textAlign="center"
              cursor={isBusy ? "not-allowed" : "pointer"}
              _hover={!isBusy ? { bg: "orange.50" } : {}}
              onClick={() => {
                if (isBusy) return;
                if (mode === "photo") photoInputRef.current?.click();
                else videoInputRef.current?.click();
              }}
            >
              <VStack gap={1}>
                {mode === "photo" ? (
                  <ImageIcon size={28} color="#f97316" />
                ) : (
                  <VideoIcon size={28} color="#f97316" />
                )}
                <Text fontSize="sm" color="var(--app-secondary)" fontWeight="bold">
                  {mode === "photo"
                    ? `Pilih Foto (${files.length}/4)`
                    : files.length > 0
                      ? "Ganti Video"
                      : "Pilih Video"}
                </Text>
                <Text fontSize="xs" color="var(--app-faint)">
                  {mode === "photo"
                    ? "Maksimal 4 gambar"
                    : "Satu video maksimal 15 detik"}
                </Text>
              </VStack>
            </Box>

            {renderPreview()}

            {fileError && (
              <Text fontSize="xs" color="red.500" fontWeight="medium">
                {fileError}
              </Text>
            )}

            {/* Caption */}
            <Box>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                placeholder="Tulis caption story..."
                size="md"
                minH="90px"
                resize="none"
                disabled={isBusy}
                bg="var(--app-card)"
                color="var(--app-text)"
                _placeholder={{ color: "var(--app-faint)" }}
              />
              <Text fontSize="xs" color="var(--app-faint)" textAlign="right" mt={1}>
                {caption.length}/500
              </Text>
            </Box>

            {/* Kapsul waktu */}
            <Box border="1px solid" borderColor="var(--app-border)" borderRadius="xl" p={3}>
              <HStack gap={2} align="center">
                <input
                  type="checkbox"
                  checked={lockEnabled}
                  disabled={isBusy}
                  onChange={(e) => setLockEnabled(e.target.checked)}
                />
                <Text fontSize="sm" fontWeight="bold" color="var(--app-secondary)">
                  Kunci waktu buka
                </Text>
              </HStack>
              {lockEnabled && (
                <VStack align="stretch" gap={1} mt={3}>
                  <Text fontSize="xs" color="var(--app-muted)">
                    Story terkunci sampai waktu yang dipilih (5 menit - 24 jam dari sekarang).
                  </Text>
                  <input
                    type="datetime-local"
                    value={unlockAtInput}
                    min={minUnlock}
                    max={maxUnlock}
                    disabled={isBusy}
                    onChange={(e) => setUnlockAtInput(e.target.value)}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 14,
                      color: "#1a202c",
                      backgroundColor: "#ffffff",
                    }}
                  />
                </VStack>
              )}
            </Box>

            {uploading && (
              <HStack gap={2} align="center">
                <Spinner size="sm" color="orange.500" />
                <Text fontSize="xs" color="var(--app-secondary)" fontWeight="bold">
                  Mengunggah media... {progress}%
                </Text>
              </HStack>
            )}
          </VStack>

          <Flex p={4} borderTop="1px solid" borderColor="var(--app-border)" justify="end">
            <Button
              bg="orange.500"
              color="white"
              px={8}
              borderRadius="full"
              fontWeight="bold"
              _hover={{ bg: "orange.600" }}
              loading={isBusy}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {uploading ? `Mengunggah... ${progress}%` : "Kirim Story"}
            </Button>
          </Flex>
        </Box>
      </Box>
    </Portal>
  );
}

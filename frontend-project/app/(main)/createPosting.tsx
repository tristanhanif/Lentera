"use client";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Textarea,
  Flex,
  Portal,
  IconButton,
  Image,
  Spinner,
} from "@chakra-ui/react";
import { Image as ImageIcon, X, Globe, Trash2 } from "lucide-react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRef, useState } from "react";
import NextLink from "next/link";
import { Link } from "@chakra-ui/react";
import { useCreatePost } from "./post/post.service";
import { useProfile } from "./profile/profile.service";
import { uploadToCloudinary } from "@/app/lib/upload";

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

export function CreatePostModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {},
  );
  const MAX_MEDIA = 7;

  type MediaItem = {
    key: string;
    url: string;
    type: "image" | "video";
    local?: boolean;
  };

  const pendingUploads = uploadingCount > 0;
  const progressValues = Object.values(uploadProgress);
  const averageUploadProgress = progressValues.length
    ? Math.round(
        progressValues.reduce((a, b) => a + b, 0) / progressValues.length,
      )
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const remaining = MAX_MEDIA - formik.values.medias.length;
    const toUpload = files.slice(0, remaining);
    if (toUpload.length === 0) return;

    // 1. Tampilkan preview langsung (instant) sebelum upload selesai
    const localItems: MediaItem[] = toUpload.map((file) => ({
      key: `local-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
      local: true,
    }));

    formik.setFieldValue("medias", [...formik.values.medias, ...localItems]);

    // 2. Upload ke Cloudinary secara sequential (satu per satu) agar stabil dan cepat
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
            m.key === itemKey ? { ...m, url, local: false } : m,
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
  };
  const { data: profile } = useProfile();
  const displayName = profile?.name ?? "User";
  const mutation = useCreatePost();

  const formik = useFormik({
    initialValues: {
      content: "",
      medias: [] as MediaItem[],
    },
    validationSchema: Yup.object({
      content: Yup.string().required("Konten tidak boleh kosong"),
    }),
    onSubmit: (values) => {
      if (pendingUploads) return;
      const payload = {
        content: values.content,
        medias: values.medias.map(({ url, type }) => ({ url, type })),
      };
      mutation.mutate(payload, {
        onSuccess: () => {
          onClose();
          formik.resetForm();
        },
      });
    },
  });
  if (!isOpen) return null;

  return (
    <Portal>
      {/* Overlay Gelap */}
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.600"
        zIndex={2000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        onClick={onClose}
      >
        {/* Konten Modal */}
        <Box
          bg="var(--app-card)"
          w="full"
          maxW="lg"
          borderRadius="2xl"
          shadow="2xl"
          onClick={(e) => e.stopPropagation()} // Agar tidak close saat klik dalam kotak
        >
          {/* Header Modal */}
          <Flex
            justify="space-between"
            align="center"
            p={4}
            borderBottom="1px solid"
            borderColor="var(--app-hover)"
          >
            <IconButton variant="ghost" onClick={onClose} color="blue.900">
              <X size={20} />
            </IconButton>
            <Text fontWeight="black" color="blue.900">
              Buat Postingan Baru
            </Text>
            <Box w="40px" /> {/* Spacer untuk keseimbangan */}
          </Flex>
          {/* Body Modal */}
          <VStack p={5} align="stretch" gap={4}>
            {/* (preview akan ditampilkan dalam kotak upload di bawah textarea) */}

            {/* (upload trigger moved below textarea) */}
            <HStack gap={3}>
              <Box
                w="45px"
                h="45px"
                bg="blue.600"
                borderRadius="full"
                overflow="hidden"
              >
                {profile?.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt="Avatar"
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                ) : (
                  <Flex w="full" h="full" align="center" justify="center">
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </Flex>
                )}
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

            <Textarea
              name="content"
              value={formik.values.content}
              onChange={formik.handleChange}
              placeholder="Apa yang Anda pikirkan?"
              size="lg"
              minH="150px"
              fontSize="xl"
              color="blue.900"
              fontWeight="medium"
              _placeholder={{ color: "blue.200" }}
              resize="none"
              autoFocus
            />

            {/* Upload Input (bisa pilih banyak file) */}
            <input
              type="file"
              hidden
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
            />

            <Box
              border="2px dashed"
              borderColor="blue.100"
              borderRadius="xl"
              p={8}
              textAlign="center"
              cursor={
                pendingUploads || formik.values.medias.length >= MAX_MEDIA
                  ? "not-allowed"
                  : "pointer"
              }
              _hover={
                !pendingUploads && formik.values.medias.length < MAX_MEDIA
                  ? { bg: "var(--app-hover)" }
                  : {}
              }
              onClick={() =>
                !pendingUploads &&
                formik.values.medias.length < MAX_MEDIA &&
                fileInputRef.current?.click()
              }
            >
              <VStack gap={2}>
                {formik.values.medias.length > 0 ? (
                  <Flex
                    wrap="wrap"
                    gap={3}
                    justify="flex-start"
                    align="flex-start"
                    w="full"
                    maxH="280px"
                    overflowY="auto"
                    px={1}
                    css={{
                      "&::-webkit-scrollbar": { width: "4px" },
                      "&::-webkit-scrollbar-thumb": {
                        background: "#93c5fd",
                        borderRadius: "10px",
                      },
                    }}
                  >
                    {formik.values.medias.map((media, index) => (
                      <Box
                        key={media.key}
                        border="2px solid"
                        borderColor="white"
                        borderRadius="md"
                        p={2}
                        boxShadow="sm"
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="blue.600"
                          mb={1}
                        >
                          Slide {index + 1}
                        </Text>
                        <Box
                          position="relative"
                          minW="120px"
                          h="120px"
                          borderRadius="md"
                          overflow="hidden"
                        >
                          <Image
                            as="img"
                            src={media.url}
                            w="full"
                            h="full"
                            objectFit="cover"
                            alt={`media-${index}`}
                          />
                          {media.local && (
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
                              <Text
                                fontSize="xs"
                                fontWeight="bold"
                                color="white"
                              >
                                {uploadProgress[media.key] ?? 0}%
                              </Text>
                            </Box>
                          )}
                          <IconButton
                            aria-label="Remove"
                            size="xs"
                            colorPalette="red"
                            position="absolute"
                            zIndex={1}
                            top={1}
                            right={1}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMedia(index);
                            }}
                          >
                            <Trash2 size={12} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Flex>
                ) : (
                  <ImageIcon size={30} color="#2563eb" />
                )}

                <Text fontSize="sm" color="blue.800" fontWeight="bold">
                  {pendingUploads
                    ? `Mengunggah foto di background... (${averageUploadProgress}%)`
                    : formik.values.medias.length >= MAX_MEDIA
                      ? "Maksimal 7 foto/video"
                      : "Tambah Foto/Video"}
                </Text>
                <Text fontSize="xs" color="var(--app-faint)">
                  {formik.values.medias.length} / {MAX_MEDIA} media dipilih
                  {pendingUploads ? ` (${uploadingCount} mengunggah)` : ""}
                </Text>
              </VStack>
            </Box>
          </VStack>
          {/* Footer Modal */}
          <Flex p={4} borderTop="1px solid" borderColor="var(--app-hover)" justify="end">
            <Button
              bg="blue.600"
              color="white"
              px={8}
              borderRadius="full"
              fontWeight="bold"
              loading={mutation.isPending}
              onClick={() => formik.handleSubmit()}
              disabled={
                !formik.values.content || pendingUploads || mutation.isPending
              }
            >
              {pendingUploads
                ? `Mengunggah... ${averageUploadProgress}%`
                : "Kirim Postingan"}
            </Button>
          </Flex>{" "}
        </Box>
      </Box>
    </Portal>
  );
}

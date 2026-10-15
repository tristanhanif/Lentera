"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ChevronLeft, ImagePlus, Plus, Smile } from "lucide-react";
import Swal from "sweetalert2";
import { uploadToCloudinary } from "@/app/lib/upload";
import { DEFAULT_CHANNEL_ICON } from "./channel.service";

const EMOJIS = ["😀", "😂", "😍", "😭", "🔥", "🎉", "❤️", "👍", "🙏", "😎", "🥳", "💪"];

interface ChannelCreateViewProps {
  onClose: () => void;
  onCreated: (data: { name: string; description: string; avatarUrl: string | null }) => void;
}

// Panel kanan "Buat Saluran": sama alurnya seperti Buat Komunitas.
export default function ChannelCreateView({ onClose, onCreated }: ChannelCreateViewProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNameEmoji, setShowNameEmoji] = useState(false);
  const [showDescEmoji, setShowDescEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const displayLogo = logoPreview ?? DEFAULT_CHANNEL_ICON;

  const handlePickLogo = () => {
    if (uploadingLogo || submitting) return;
    fileRef.current?.click();
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "File harus gambar" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Maksimal 5MB ya!" });
      return;
    }
    if (logoPreview && logoPreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(logoPreview);
      } catch {}
    }
    setLogoPreview(URL.createObjectURL(file));
    setLogoFile(file);
  };

  const insertEmoji = (target: "name" | "desc", emoji: string) => {
    if (target === "name") {
      const el = nameRef.current;
      const cur = name;
      if (!el) {
        setName((cur + emoji).slice(0, 50));
        return;
      }
      const start = el.selectionStart ?? cur.length;
      const end = el.selectionEnd ?? cur.length;
      const next = (cur.slice(0, start) + emoji + cur.slice(end)).slice(0, 50);
      setName(next);
      const caret = Math.min(start + emoji.length, 50);
      requestAnimationFrame(() => {
        try {
          el.focus();
          el.setSelectionRange(caret, caret);
        } catch {}
      });
    } else {
      const el = descRef.current;
      const cur = description;
      if (!el) {
        setDescription((cur + emoji).slice(0, 500));
        return;
      }
      const start = el.selectionStart ?? cur.length;
      const end = el.selectionEnd ?? cur.length;
      const next = (cur.slice(0, start) + emoji + cur.slice(end)).slice(0, 500);
      setDescription(next);
      const caret = Math.min(start + emoji.length, 500);
      requestAnimationFrame(() => {
        try {
          el.focus();
          el.setSelectionRange(caret, caret);
        } catch {}
      });
    }
  };

  const canCreate =
    name.trim().length >= 3 && description.trim().length > 0 && !submitting && !uploadingLogo;

  const handleCreate = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    try {
      let avatarUrl: string | null = null;
      if (logoFile) {
        setUploadingLogo(true);
        try {
          avatarUrl = await uploadToCloudinary(logoFile);
        } catch {
          avatarUrl = logoPreview;
        } finally {
          setUploadingLogo(false);
        }
      }
      onCreated({
        name: name.trim().slice(0, 50),
        description: description.trim().slice(0, 500),
        avatarUrl,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Flex flex={1} direction="column" bg="var(--app-card)" h="full" overflowY="auto">
      <Flex
        p={4}
        borderBottom="1px solid"
        borderColor="var(--app-hover)"
        align="center"
        gap={2}
        flexShrink={0}
      >
        <IconButton
          aria-label="Keluar dari pembuatan saluran"
          variant="ghost"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)" }}
          onClick={onClose}
        >
          <ChevronLeft size={22} />
        </IconButton>
        <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
          Buat Saluran
        </Text>
      </Flex>

      <VStack flex={1} px={6} py={8} gap={5} align="stretch" maxW="420px" w="full" mx="auto">
        <Box position="relative" mx="auto">
          <Box
            w="120px"
            h="120px"
            borderRadius="full"
            overflow="hidden"
            bg="var(--app-subtle)"
            border="1px solid"
            borderColor="var(--app-border)"
            cursor={uploadingLogo ? "wait" : "pointer"}
            onClick={handlePickLogo}
            title="Pilih logo saluran"
          >
            <img
              src={displayLogo}
              alt="Logo saluran"
              className={logoPreview ? undefined : "channel-logo-default"}
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingLogo ? 0.6 : 1 }}
            />
          </Box>
          <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleLogoFile} />
          <Box
            as="button"
            aria-label="Pilih logo dari galeri"
            position="absolute"
            bottom="2px"
            right="2px"
            w="34px"
            h="34px"
            borderRadius="full"
            bg="blue.600"
            color="white"
            border="2px solid white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            _hover={{ bg: "blue.700" }}
            onClick={handlePickLogo}
          >
            {uploadingLogo ? (
              <Text fontSize="xs" fontWeight="bold">…</Text>
            ) : logoPreview ? (
              <ImagePlus size={15} />
            ) : (
              <Plus size={16} strokeWidth={3} />
            )}
          </Box>
        </Box>

        <Box>
          <HStack
            bg="var(--app-input)"
            border="1px solid"
            borderColor="var(--app-border)"
            borderRadius="xl"
            px={4}
            py={1}
          >
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder="Nama Saluran..."
              fontSize="sm"
              color="var(--app-text)"
              border="none"
              bg="transparent"
              p={0}
              h="44px"
              _placeholder={{ color: "var(--app-faint)" }}
              _focus={{ boxShadow: "none" }}
              maxLength={50}
            />
            <IconButton
              aria-label="Tambah emoji ke nama"
              variant="ghost"
              size="sm"
              borderRadius="full"
              color="var(--app-muted)"
              _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
              onClick={() => {
                setShowNameEmoji((v) => !v);
                setShowDescEmoji(false);
              }}
            >
              <Smile size={20} />
            </IconButton>
          </HStack>
          {showNameEmoji && (
            <Flex wrap="wrap" gap={1} mt={2} p={2} bg="var(--app-subtle)" borderRadius="xl">
              {EMOJIS.map((em) => (
                <Box
                  key={em}
                  as="button"
                  fontSize="20px"
                  p={1}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: "var(--app-hover)" }}
                  onClick={() => insertEmoji("name", em)}
                >
                  {em}
                </Box>
              ))}
            </Flex>
          )}
          <Text fontSize="xs" color="var(--app-faint)" textAlign="right" mt={1}>
            {name.length}/50
          </Text>
        </Box>

        <Box>
          <HStack
            bg="var(--app-input)"
            border="1px solid"
            borderColor="var(--app-border)"
            borderRadius="xl"
            px={4}
            py={2}
            align="start"
          >
            <Textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Deskripsi Saluran"
              fontSize="sm"
              color="var(--app-text)"
              border="none"
              bg="transparent"
              p={0}
              minH="80px"
              resize="none"
              _placeholder={{ color: "var(--app-faint)" }}
              _focus={{ boxShadow: "none" }}
              maxLength={500}
            />
            <IconButton
              aria-label="Tambah emoji ke deskripsi"
              variant="ghost"
              size="sm"
              borderRadius="full"
              color="var(--app-muted)"
              _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
              onClick={() => {
                setShowDescEmoji((v) => !v);
                setShowNameEmoji(false);
              }}
            >
              <Smile size={20} />
            </IconButton>
          </HStack>
          {showDescEmoji && (
            <Flex wrap="wrap" gap={1} mt={2} p={2} bg="var(--app-subtle)" borderRadius="xl">
              {EMOJIS.map((em) => (
                <Box
                  key={em}
                  as="button"
                  fontSize="20px"
                  p={1}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: "var(--app-hover)" }}
                  onClick={() => insertEmoji("desc", em)}
                >
                  {em}
                </Box>
              ))}
            </Flex>
          )}
          <Text fontSize="xs" color="var(--app-faint)" textAlign="right" mt={1}>
            {description.length}/500
          </Text>
        </Box>

        <Button
          bg="blue.600"
          color="white"
          borderRadius="xl"
          h="48px"
          fontWeight="bold"
          _hover={{ bg: "blue.700" }}
          disabled={!canCreate}
          loading={submitting}
          onClick={handleCreate}
        >
          {uploadingLogo ? "Mengunggah logo..." : "Buat"}
        </Button>
      </VStack>
    </Flex>
  );
}

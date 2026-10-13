"use client";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Input,
  Text,
  IconButton,
  Button,
} from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Smile, Music2, Users, ChevronDown, Check } from "lucide-react";
import { useCreateNote } from "./note.service";
import NoteMusicPicker from "./NoteMusicPicker";
import { MusicPlayingIcon } from "./NotesBar";
import type { SpotifyTrack } from "@/app/story/spotify.service";

const FALLBACK_AVATAR = "/default-avatar.jpg";
const MAX_LEN = 60;
const EMOJIS = ["😀", "😂", "😍", "😭", "🔥", "🎉", "❤️", "👍"];

interface NoteEditorProps {
  initialText?: string;
  initialAudience?: "mutual" | "close";
  initialMusic?: {
    title: string;
    artist: string;
    cover: string | null;
    url: string | null;
  } | null;
  avatarSrc?: string;
  onClose: () => void;
  onDone?: () => void;
}

// Panel kanan "Catatan baru": X kiri, judul tengah, Bagikan kanan.
// Tengah: bubble (bisa diketik) + avatar besar.
// Bawah avatar: buletan emoji + buletan musik.
// Paling bawah: "Dibagikan dengan ..." + chevron untuk pilih audiens.
export default function NoteEditor({
  initialText = "",
  initialAudience = "mutual",
  initialMusic = null,
  avatarSrc = FALLBACK_AVATAR,
  onClose,
  onDone,
}: NoteEditorProps) {
  const [text, setText] = useState(initialText);
  const [track, setTrack] = useState<SpotifyTrack | null>(
    initialMusic
      ? {
          id: "initial",
          title: initialMusic.title,
          artist: initialMusic.artist,
          cover: initialMusic.cover,
          previewUrl: initialMusic.url,
          spotifyUrl: null,
        }
      : null,
  );
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [audience, setAudience] = useState<"mutual" | "close">(initialAudience);
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const audienceRef = useRef<HTMLDivElement | null>(null);
  const createNote = useCreateNote();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isMusic = !!track;
  const canShare = isMusic ? true : text.trim().length > 0;

  // Musik di kotak catatan langsung kesetel otomatis + berulang (loop)
  // begitu tombol biru "Pakai" dipencet (track masuk ke kotak).
  // Tanpa tombol play/pause: murni autoplay loop.
  useEffect(() => {
    if (track?.previewUrl && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Tutup kotak audiens saat klik di luar / tekan Escape.
  useEffect(() => {
    if (!showAudiencePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (audienceRef.current && !audienceRef.current.contains(e.target as Node)) {
        setShowAudiencePicker(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAudiencePicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showAudiencePicker]);

  const handleRemoveTrack = () => {
    audioRef.current?.pause();
    setTrack(null);
  };

  const handleShare = () => {
    if (!canShare || createNote.isPending) return;
    const payload = isMusic
      ? {
          text: (text.trim() || track!.title).slice(0, MAX_LEN),
          type: "music" as const,
          musicTitle: track!.title,
          musicArtist: track!.artist,
          musicCover: track!.cover ?? undefined,
          musicUrl: track!.previewUrl ?? undefined,
          audience,
        }
      : {
          text: text.trim().slice(0, MAX_LEN),
          type: "text" as const,
          audience,
        };
    createNote.mutate(payload, {
      onSuccess: () => {
        onDone?.();
        onClose();
      },
    });
  };

  return (
    <Flex flex={1} direction="column" bg="var(--app-card)" h="full">
      {/* Header */}
      <Flex
        p={4}
        borderBottom="1px solid"
        borderColor="var(--app-hover)"
        align="center"
        justify="space-between"
      >
        <IconButton
          aria-label="Tutup"
          variant="ghost"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
          onClick={onClose}
        >
          <X size={20} />
        </IconButton>
        <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
          Catatan baru
        </Text>
        <Button
          variant="ghost"
          color="blue.600"
          fontWeight="bold"
          disabled={!canShare || createNote.isPending}
          loading={createNote.isPending}
          onClick={handleShare}
        >
          Bagikan
        </Button>
      </Flex>

      {/* Isi tengah */}
      <Flex flex={1} direction="column" align="center" justify="center" px={6} gap={2}>
        {/* Musik terpasang: setel otomatis + loop di kotak ini, tanpa tombol play/pause */}
        {track?.previewUrl && (
          <audio ref={audioRef} src={track.previewUrl} loop preload="auto" />
        )}
        {/* Bubble */}
        <Box position="relative" mb="12px" display="flex" justifyContent="center">
          <Box
            bg="var(--app-subtle)"
            color="var(--app-text)"
            px={5}
            py={3}
            borderRadius="2xl"
            minW="180px"
            maxW="280px"
            textAlign="center"
            shadow="md"
          >
            {isMusic ? (
              <Flex align="center" gap={2} justify="center">
                <Box flexShrink={0} display="flex" alignItems="center">
                  <MusicPlayingIcon />
                </Box>
                <Box textAlign="center" overflow="hidden" flex={1}>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {track!.title}
                  </Text>
                  <Text fontSize="xs" opacity={0.85} truncate>
                    {track!.artist}
                  </Text>
                </Box>
                <Box
                  as="button"
                  aria-label="Hapus musik"
                  onClick={handleRemoveTrack}
                  cursor="pointer"
                  opacity={0.8}
                  _hover={{ opacity: 1 }}
                  flexShrink={0}
                  color="var(--app-text)"
                >
                  <X size={14} />
                </Box>
              </Flex>
            ) : (
              <Input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                placeholder="Rencana akhir pekan?"
                fontSize="sm"
                fontWeight="medium"
                textAlign="center"
                border="none"
                outline="none"
                bg="transparent"
                p={0}
                h="auto"
                color="var(--app-text)"
                _placeholder={{ color: "var(--app-faint)" }}
                _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleShare();
                }}
              />
            )}
          </Box>
          <Box
            position="absolute"
            bottom="-6px"
            left="50%"
            transform="translateX(-50%) rotate(45deg)"
            w="14px"
            h="14px"
            bg="var(--app-subtle)"
          />
        </Box>

        {/* Avatar besar */}
        <Avatar style={{ width: "120px", height: "120px" }}>
          <AvatarImage src={avatarSrc} alt="Catatan Anda" />
          <AvatarFallback>A</AvatarFallback>
        </Avatar>

        {/* Emoji + Musik */}
        <HStack mt={4} gap={3}>
          <Box
            as="button"
            aria-label="Tambah emoji"
            onClick={() => setShowEmoji((v) => !v)}
            w="36px"
            h="36px"
            borderRadius="full"
            bg={showEmoji ? "blue.600" : "var(--app-subtle)"}
            color={showEmoji ? "white" : "var(--app-text)"}
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            _hover={{ bg: showEmoji ? "blue.700" : "var(--app-hover)" }}
            opacity={isMusic ? 0.4 : 1}
            pointerEvents={isMusic ? "none" : "auto"}
            title={isMusic ? "Hapus musik dulu untuk pakai emoji" : "Emoji"}
          >
            <Smile size={18} />
          </Box>
          <Box
            as="button"
            aria-label="Tambah musik"
            onClick={() => setShowMusicPicker(true)}
            w="36px"
            h="36px"
            borderRadius="full"
            bg={isMusic ? "blue.600" : "var(--app-subtle)"}
            color={isMusic ? "white" : "var(--app-text)"}
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            _hover={{ bg: isMusic ? "blue.700" : "var(--app-hover)" }}
            title="Musik"
          >
            <Music2 size={18} />
          </Box>
        </HStack>

        {showEmoji && !isMusic && (
          <HStack mt={2} gap={1} flexWrap="wrap" justify="center" maxW="280px">
            {EMOJIS.map((e) => (
              <Box
                key={e}
                as="button"
                fontSize="20px"
                p={1}
                borderRadius="lg"
                cursor="pointer"
                _hover={{ bg: "var(--app-hover)" }}
                onClick={() => setText((t) => (t + e).slice(0, MAX_LEN))}
              >
                {e}
              </Box>
            ))}
          </HStack>
        )}

        {!isMusic && (
          <Text fontSize="xs" color="var(--app-muted)" mt={1}>
            {MAX_LEN - text.length} karakter tersisa
          </Text>
        )}
      </Flex>

      {/* Footer audiens */}
      <Flex pb={8} pt={4} justify="center" position="relative">
        <Box ref={audienceRef} position="relative">
          <HStack
            as="button"
            gap={1.5}
            color="var(--app-text)"
            cursor="pointer"
            borderRadius="full"
            px={3}
            py={1.5}
            _hover={{ bg: "var(--app-subtle)" }}
            onClick={() => setShowAudiencePicker((v) => !v)}
            aria-label="Pilih audiens catatan"
            title="Pilih audiens catatan"
          >
            <Users size={14} />
            <Text fontSize="sm">
              Dibagikan dengan{" "}
              <Text as="span" fontWeight="bold">
                {audience === "close"
                  ? "Teman Dekat"
                  : "pengikut yang Anda ikuti balik"}
              </Text>
            </Text>
            <ChevronDown size={16} />
          </HStack>

          {showAudiencePicker && (
            <Box
              position="absolute"
              bottom="calc(100% + 8px)"
              left="50%"
              transform="translateX(-50%)"
              zIndex={50}
              w="280px"
              bg="var(--app-card)"
              border="1px solid"
              borderColor="var(--app-border)"
              borderRadius="xl"
              shadow="lg"
              p={2}
            >
              {(
                [
                  {
                    id: "mutual" as const,
                    label: "Pengikut yang Anda ikuti balik",
                  },
                  { id: "close" as const, label: "Teman Dekat" },
                ]
              ).map((item) => {
                const selected = audience === item.id;
                return (
                  <HStack
                    key={item.id}
                    as="button"
                    gap={3}
                    w="full"
                    px={3}
                    py={2.5}
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ bg: "var(--app-hover)" }}
                    onClick={() => {
                      setAudience(item.id);
                      setShowAudiencePicker(false);
                    }}
                    align="center"
                  >
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      flexShrink={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      border="2px solid"
                      borderColor={selected ? "blue.600" : "var(--app-border)"}
                      bg={selected ? "blue.600" : "transparent"}
                      color="white"
                    >
                      {selected && <Check size={12} strokeWidth={3} />}
                    </Box>
                    <Text
                      fontSize="sm"
                      fontWeight={selected ? "bold" : "medium"}
                      color="var(--app-text)"
                      textAlign="left"
                    >
                      {item.label}
                    </Text>
                  </HStack>
                );
              })}
            </Box>
          )}
        </Box>
      </Flex>

      <NoteMusicPicker
        open={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        onPick={(t) => {
          setTrack(t);
          setShowMusicPicker(false);
          setShowEmoji(false);
        }}
      />
    </Flex>
  );
}

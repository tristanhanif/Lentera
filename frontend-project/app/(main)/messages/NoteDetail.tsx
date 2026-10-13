"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, IconButton, Button } from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Pause, Play } from "lucide-react";
import { useDeleteNote } from "./note.service";
import type { ChatNote } from "./note.interface";

interface NoteDetailProps {
  note: ChatNote;
  onClose: () => void;
  onEdit: () => void;
  onDeleted?: () => void;
}

// Detail "Catatan Anda" di sisi kanan setelah catatan dibikin:
// avatar besar + bubble di atasnya (tulisan / judul musik + auto-play),
// username di bawah avatar, lalu 2 aksi: Buat catatan baru / Hapus catatan.
export default function NoteDetail({
  note,
  onClose,
  onEdit,
  onDeleted,
}: NoteDetailProps) {
  const isMusic = note.type === "music";
  const deleteNote = useDeleteNote();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Kalau musik: langsung setel begitu detail dibuka.
  useEffect(() => {
    if (isMusic && note.musicUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
    return () => {
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !note.musicUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleDelete = () => {
    if (deleteNote.isPending) return;
    deleteNote.mutate(undefined, {
      onSuccess: () => {
        onDeleted?.();
        onClose();
      },
    });
  };

  return (
    <Flex flex={1} direction="column" bg="var(--app-card)" h="full">
      {isMusic && note.musicUrl && (
        <audio
          ref={audioRef}
          src={note.musicUrl}
          preload="auto"
          loop
          onEnded={() => {
            if (audioRef.current?.loop) {
              setIsPlaying(true);
              return;
            }
            setIsPlaying(false);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
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
          color="blue.900"
          onClick={onClose}
        >
          <X size={20} />
        </IconButton>
        <Text fontWeight="bold" color="blue.900" fontSize="md">
          Catatan Anda
        </Text>
        <Box w="40px" />
      </Flex>

      {/* Isi */}
      <Flex flex={1} direction="column" align="center" justify="center" px={6}>
        <Box position="relative" mb="12px" display="flex" justifyContent="center">
          <Box
            bg="var(--app-subtle)"
            color="blue.900"
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
                <Box
                  as="button"
                  aria-label={isPlaying ? "Jeda" : "Putar"}
                  onClick={togglePlay}
                  w="28px"
                  h="28px"
                  borderRadius="full"
                  bg="blue.600"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor={note.musicUrl ? "pointer" : "default"}
                  opacity={note.musicUrl ? 1 : 0.5}
                  flexShrink={0}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                </Box>
                <Box textAlign="center" overflow="hidden" flex={1}>
                  <Text
                    fontSize="sm"
                    fontWeight="bold"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {note.musicTitle || note.text}
                  </Text>
                  {note.musicArtist && (
                    <Text fontSize="xs" opacity={0.75} truncate>
                      {note.musicArtist}
                    </Text>
                  )}
                </Box>
              </Flex>
            ) : (
              <Text fontSize="sm" fontWeight="medium">
                {note.text}
              </Text>
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

        <Avatar style={{ width: "120px", height: "120px" }}>
          <AvatarImage
            src={note.user.avatar || "/default-avatar.jpg"}
            alt={note.user.username}
          />
          <AvatarFallback>{note.user.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Text fontSize="sm" fontWeight="bold" color="blue.900" mt={3}>
          {note.user.username}
        </Text>
      </Flex>

      {/* 2 aksi */}
      <Flex direction="column" gap={2} px={6} pb={8}>
        <Button
          borderRadius="full"
          bg="blue.600"
          color="white"
          fontWeight="bold"
          _hover={{ bg: "blue.700" }}
          onClick={onEdit}
        >
          Buat catatan baru
        </Button>
        <Button
          borderRadius="full"
          variant="outline"
          borderColor="red.200"
          color="red.500"
          fontWeight="bold"
          _hover={{ bg: "red.50" }}
          loading={deleteNote.isPending}
          onClick={handleDelete}
        >
          Hapus catatan
        </Button>
      </Flex>
    </Flex>
  );
}

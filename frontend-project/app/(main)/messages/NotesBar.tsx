"use client";
import { useRef, useState, useEffect } from "react";
import { Box, Flex, Text, Button, Input } from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronRight,
  Plus,
  Smile,
} from "lucide-react";
import { useVisibleNotes, useDeleteNote, useReplyNote } from "./note.service";
import { useProfile } from "../profile/profile.service";
import type { ChatNote } from "./note.interface";

const FALLBACK_AVATAR = "/default-avatar.jpg";

// Ikon musik yang joget (equalizer) ala lagu lagi distel.
// Pengganti AudioLines statis: 4 bar naik-turun pakai CSS note-eq-bounce.
export function MusicPlayingIcon({
  color = "#1e3a8a",
  paused = false,
  h = "14px",
}: {
  color?: string;
  paused?: boolean;
  h?: string;
}) {
  return (
    <Flex align="flex-end" gap="2px" h={h} justify="center" flexShrink={0}>
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          w="2px"
          h="full"
          bg={color}
          borderRadius="full"
          className="note-eq-bar"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: `${0.7 + (i % 3) * 0.15}s`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      ))}
    </Flex>
  );
}

function NoteBubble({ note }: { note: ChatNote }) {
  const isMusic = note.type === "music";
  // Musik: judul + artist (ala gambar: baris 1 judul, baris 2 artist).
  // Tulisan: isi text catatan, maksimal 2 baris.
  // Warna disamakan (abu seperti tulisan), bedanya hanya ada ikon musik.
  // Wrapper minH + align flex-end supaya avatar sejajar walau tinggi bubble beda.
  return (
    <Box
      position="relative"
      mb="10px"
      display="flex"
      justifyContent="center"
      alignItems="flex-end"
      minH="52px"
      w="full"
    >
      <Box
        bg="white"
        color="blue.900"
        px={3}
        py={2}
        borderRadius="xl"
        maxW="118px"
        minW="64px"
        textAlign="center"
        shadow="sm"
      >
        {isMusic ? (
          <Flex align="center" gap={1.5} justify="center">
            <Box flexShrink={0} display="flex" alignItems="center">
              <MusicPlayingIcon />
            </Box>
            <Box textAlign="left" overflow="hidden">
              <Text
                fontSize="11px"
                fontWeight="bold"
                lineHeight="1.2"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                maxW="72px"
              >
                {note.musicTitle || note.text}
              </Text>
              {(note.musicArtist) && (
                <Text
                  fontSize="10px"
                  opacity={0.85}
                  lineHeight="1.2"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  maxW="72px"
                >
                  {note.musicArtist}
                </Text>
              )}
            </Box>
          </Flex>
        ) : (
          <Text
            fontSize="11px"
            fontWeight="medium"
            lineHeight="1.3"
            display="-webkit-box"
            css={{
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {note.text}
          </Text>
        )}
      </Box>
      {/* Ekor bubble mengarah ke avatar */}
      <Box
        position="absolute"
        bottom="-4px"
        left="50%"
        transform="translateX(-50%) rotate(45deg)"
        w="10px"
        h="10px"
        bg="white"
      />
    </Box>
  );
}

function NoteItem({
  note,
  label,
  avatarSrc,
  onClick,
}: {
  note: ChatNote | null;
  label: string;
  avatarSrc: string;
  onClick?: () => void;
}) {
  return (
    <Flex
      direction="column"
      align="center"
      w="76px"
      flexShrink={0}
      cursor="pointer"
      title={note ? note.text : label}
      onClick={onClick}
    >
      {note ? (
        <NoteBubble note={note} />
      ) : (
        // Belum ada catatan: beri ruang sejajar supaya avatar tetap rata.
        <Box h="8px" mb="10px" />
      )}
      <Box position="relative">
        <Avatar
          style={{ width: "60px", height: "60px" }}
        >
          <AvatarImage src={avatarSrc} alt={label} />
          <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        {!note && (
          <Box
            position="absolute"
            bottom="0"
            right="0"
            bg="blue.600"
            borderRadius="full"
            w="20px"
            h="20px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            border="2px solid white"
          >
            <Plus size={12} color="white" />
          </Box>
        )}
      </Box>
      <Text
        fontSize="11px"
        color="var(--app-text)"
        fontWeight="medium"
        mt={1.5}
        maxW="76px"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {label}
      </Text>
    </Flex>
  );
}

export default function NotesBar({
  onOwnClick,
  onReplied,
}: {
  onOwnClick?: () => void;
  onReplied?: (conversationId: string) => void;
}) {
  const { data, isLoading } = useVisibleNotes();
  const { data: profile } = useProfile();
  const deleteNote = useDeleteNote();
  const replyNote = useReplyNote();
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const otherAudioRef = useRef<HTMLAudioElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showOwnDetail, setShowOwnDetail] = useState(false);
  const [selectedOtherNote, setSelectedOtherNote] =
    useState<ChatNote | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Hanya data asli dari backend, tanpa contoh akun lain.
  // Untuk milik sendiri: kalau belum ada catatan asli, tampilkan contoh
  // "Rencana akhir pekan?" di atas avatar supaya layout sesuai gambar.
  const notes: ChatNote[] = data?.data ?? [];

  const ownNote = notes.find((n) => n.isOwn) ?? null;
  const otherNotes = notes.filter((n) => !n.isOwn);
  const hasRealOwnNote = !!ownNote;

  const ownAvatar = profile?.avatar || ownNote?.user.avatar || FALLBACK_AVATAR;
  const ownLabel = "Catatan Anda";

  const displayOwnNote: ChatNote = ownNote ?? {
    id: "placeholder-own",
    text: "Rencana akhir pekan?",
    type: "text",
    musicTitle: null,
    musicArtist: null,
    musicCover: null,
    musicUrl: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    isOwn: true,
    user: {
      id: profile?.id ?? "me",
      name: profile?.name ?? "Saya",
      username: profile?.username ?? "saya",
      avatar: profile?.avatar ?? null,
    },
  };

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 8);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [notes.length]);

  // Klik kotak Catatan Anda: kalau sudah ada catatan asli -> buka kotak
  // detail di sebelah avatar. Kalau belum ada -> langsung minta editor kanan.
  const handleOwnClick = () => {
    setSelectedOtherNote(null);
    if (hasRealOwnNote) {
      setShowOwnDetail((v) => !v);
    } else {
      onOwnClick?.();
    }
  };

  const handleOtherClick = (note: ChatNote) => {
    setShowOwnDetail(false);
    audioRef.current?.pause();
    setSelectedOtherNote((prev) => (prev?.id === note.id ? null : note));
    setReplyText("");
    setShowReplyEmoji(false);
    setReplyError(null);
  };

  const closeOtherDetail = () => {
    otherAudioRef.current?.pause();
    setSelectedOtherNote(null);
    setReplyText("");
    setShowReplyEmoji(false);
    setReplyError(null);
  };

  const closeOwnDetail = () => {
    audioRef.current?.pause();
    setShowOwnDetail(false);
  };

  // Musik di kotak detail langsung kesetel begitu dibuka.
  useEffect(() => {
    if (showOwnDetail && ownNote?.type === "music" && ownNote.musicUrl) {
      const audio = audioRef.current;
      if (audio) {
        audio.play().catch(() => {});
      }
    } else {
      audioRef.current?.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOwnDetail, ownNote?.id]);

  // Musik catatan akun lain juga langsung kesetel begitu kotaknya dibuka.
  useEffect(() => {
    if (
      selectedOtherNote?.type === "music" &&
      selectedOtherNote.musicUrl
    ) {
      const audio = otherAudioRef.current;
      if (audio) {
        audio.play().catch(() => {});
      }
    } else {
      otherAudioRef.current?.pause();
    }
  }, [selectedOtherNote?.id]);

  const handleDeleteOwn = () => {
    if (deleteNote.isPending) return;
    deleteNote.mutate(undefined, {
      onSuccess: () => closeOwnDetail(),
    });
  };

  const handleEditOwn = () => {
    closeOwnDetail();
    onOwnClick?.();
  };

  const handleSendReply = () => {
    if (!selectedOtherNote || replyNote.isPending) return;
    const text = replyText.trim();
    if (!text) return;
    setReplyError(null);
    replyNote.mutate(
      { noteId: selectedOtherNote.id, text },
      {
        onSuccess: (res) => {
          const conversationId = res?.data?.conversationId;
          closeOtherDetail();
          if (conversationId) onReplied?.(conversationId);
        },
        onError: (err: unknown) => {
          const msg =
            (
              err as { response?: { data?: { message?: string } } }
            )?.response?.data?.message || "Gagal membalas catatan";
          setReplyError(msg);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Flex gap={3} px={5} py={4} borderBottom="1px solid" borderColor="var(--app-hover)">
        {[0, 1, 2, 3].map((i) => (
          <Flex key={i} direction="column" align="center" w="76px" flexShrink={0}>
            <Box w="90px" h="34px" bg="var(--app-subtle)" borderRadius="xl" mb="10px" />
            <Box w="60px" h="60px" bg="var(--app-subtle)" borderRadius="full" />
            <Box w="52px" h="10px" bg="var(--app-subtle)" borderRadius="md" mt={1.5} />
          </Flex>
        ))}
      </Flex>
    );
  }

  return (
    <Box
      position="relative"
      borderBottom="1px solid"
      borderColor="var(--app-hover)"
      bg="var(--app-card)"
    >
      <Flex
        ref={scrollRef}
        gap={3}
        px={5}
        pt={3}
        pb={4}
        overflowX="auto"
        align="flex-end"
        onScroll={checkScroll}
        css={{
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* Milik sendiri selalu paling kiri */}
        <NoteItem
          note={displayOwnNote}
          label={ownLabel}
          avatarSrc={ownAvatar}
          onClick={handleOwnClick}
        />
        {otherNotes.map((n) => (
          <NoteItem
            key={n.id}
            note={n}
            label={n.user.username}
            avatarSrc={n.user.avatar || FALLBACK_AVATAR}
            onClick={() => handleOtherClick(n)}
          />
        ))}
      </Flex>
      {/* Kotak besar di sebelah kolom Catatan Anda (bubble + avatar besar +
          username + 2 aksi), bukan di sisi kanan. */}
      {showOwnDetail && ownNote && (
        <>
          <Box
            position="fixed"
            inset={0}
            zIndex={40}
            onClick={closeOwnDetail}
          />
          {ownNote.type === "music" && ownNote.musicUrl && (
            <audio
              ref={audioRef}
              src={ownNote.musicUrl}
              preload="auto"
              loop
            />
          )}
          <Box
            position="absolute"
            left="100px"
            top="8px"
            zIndex={50}
            w="230px"
            bg="var(--app-card)"
            border="1px solid"
            borderColor="blue.100"
            borderRadius="2xl"
            shadow="lg"
            p={4}
          >
            <Flex direction="column" align="center">
              <NoteBubble note={ownNote} />
              <Avatar style={{ width: "84px", height: "84px" }}>
                <AvatarImage
                  src={ownNote.user.avatar || FALLBACK_AVATAR}
                  alt={ownNote.user.username}
                />
                <AvatarFallback>
                  {ownNote.user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" mt={2}>
                {ownNote.user.username}
              </Text>
            </Flex>
            <Flex direction="column" gap={2} mt={4}>
              <Button
                borderRadius="full"
                bg="blue.600"
                color="white"
                fontWeight="bold"
                size="sm"
                _hover={{ bg: "blue.700" }}
                onClick={handleEditOwn}
              >
                Buat catatan baru
              </Button>
              <Button
                borderRadius="full"
                variant="outline"
                borderColor="red.200"
                color="red.500"
                fontWeight="bold"
                size="sm"
                _hover={{ bg: "red.50" }}
                loading={deleteNote.isPending}
                onClick={handleDeleteOwn}
              >
                Hapus catatan
              </Button>
            </Flex>
          </Box>
        </>
      )}
      {/* Kotak detail catatan akun lain: bubble + avatar besar + username +
          kotak balas + icon emoji di sebelah kanan (pengganti 2 tombol aksi). */}
      {selectedOtherNote && (
        <>
          <Box
            position="fixed"
            inset={0}
            zIndex={40}
            onClick={closeOtherDetail}
          />
          {selectedOtherNote.type === "music" &&
            selectedOtherNote.musicUrl && (
              <audio
                ref={otherAudioRef}
                src={selectedOtherNote.musicUrl}
                preload="auto"
                loop
              />
            )}
          <Box
            position="absolute"
            left="100px"
            top="8px"
            zIndex={50}
            w="230px"
            bg="var(--app-card)"
            border="1px solid"
            borderColor="blue.100"
            borderRadius="2xl"
            shadow="lg"
            p={4}
          >
            <Flex direction="column" align="center">
              <NoteBubble note={selectedOtherNote} />
              <Avatar style={{ width: "84px", height: "84px" }}>
                <AvatarImage
                  src={selectedOtherNote.user.avatar || FALLBACK_AVATAR}
                  alt={selectedOtherNote.user.username}
                />
                <AvatarFallback>
                  {selectedOtherNote.user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" mt={2}>
                {selectedOtherNote.user.username}
              </Text>
            </Flex>
            <Flex
              mt={4}
              align="center"
              bg="var(--app-card)"
              border="1px solid"
              borderColor="var(--app-border)"
              borderRadius="full"
              pl={4}
              pr={2}
              h="40px"
              _focusWithin={{
                borderColor: "var(--app-faint)",
                boxShadow: "0 0 0 1px #d1d5db",
              }}
            >
              <Input
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value.slice(0, 500));
                  if (replyError) setReplyError(null);
                }}
                placeholder={`Balas ${selectedOtherNote.user.username}...`}
                fontSize="sm"
                color="var(--app-secondary)"
                bg="transparent"
                border="none"
                outline="none"
                p={0}
                h="full"
                flex={1}
                minW={0}
                _placeholder={{ color: "var(--app-faint)" }}
                _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                disabled={replyNote.isPending}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeOtherDetail();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                autoFocus
              />
              <Box
                as="button"
                aria-label="Emoji"
                onClick={() => setShowReplyEmoji((v) => !v)}
                w="30px"
                h="30px"
                flexShrink={0}
                borderRadius="full"
                bg="transparent"
                color="var(--app-muted)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-secondary)" }}
              >
                <Smile size={18} />
              </Box>
            </Flex>
            {showReplyEmoji && (
              <Flex mt={2} gap={1} flexWrap="wrap" justify="center">
                {["😀", "😂", "😍", "😭", "🔥", "🎉", "❤️", "👍"].map((e) => (
                  <Box
                    key={e}
                    as="button"
                    fontSize="18px"
                    p={1}
                    borderRadius="lg"
                    cursor="pointer"
                    _hover={{ bg: "var(--app-subtle)" }}
                    onClick={() => {
                      setReplyText((t) => (t + e).slice(0, 500));
                      if (replyError) setReplyError(null);
                    }}
                  >
                    {e}
                  </Box>
                ))}
              </Flex>
            )}
            {replyError && (
              <Text fontSize="xs" color="red.500" textAlign="center" mt={2}>
                {replyError}
              </Text>
            )}
          </Box>
        </>
      )}
      {canScrollRight && (
        <Box
          position="absolute"
          right="8px"
          top="58%"
          transform="translateY(-50%)"
          bg="var(--app-card)"
          borderRadius="full"
          shadow="md"
          border="1px solid"
          borderColor="blue.100"
          w="28px"
          h="28px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onClick={() =>
            scrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })
          }
        >
          <ChevronRight size={16} color="var(--app-text)" />
        </Box>
      )}
    </Box>
  );
}

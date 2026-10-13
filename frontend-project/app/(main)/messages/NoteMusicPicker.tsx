"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Flex, HStack, Input, Spinner, Text } from "@chakra-ui/react";
import { Check, Music2, Pause, Play, Search, X } from "lucide-react";
import {
  SpotifyTrack,
  useSpotifySearch,
  useSpotifyTrending,
} from "@/app/story/spotify.service";

interface NoteMusicPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (track: SpotifyTrack) => void;
}

// Pemilih musik untuk catatan: search + tren, klik = pratinjau dulu,
// kotak bawah mirip /story (cover + judul + play + Pakai).
export default function NoteMusicPicker({
  open,
  onClose,
  onPick,
}: NoteMusicPickerProps) {
  const [query, setQuery] = useState("");
  const debounced = query.trim();

  const [pending, setPending] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const trending = useSpotifyTrending(open && debounced.length < 2);
  const search = useSpotifySearch(open ? debounced : "");
  const searching = debounced.length >= 2;

  const list: SpotifyTrack[] = searching
    ? (search.data?.data ?? [])
    : (trending.data?.data ?? []);
  const isLoading = searching ? search.isFetching : trending.isFetching;

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setPending(null);
      setProgress(0);
      setQuery("");
    }
  }, [open ]);

  // Klik lagu di daftar -> langsung kesetel otomatis + berulang (loop),
  // tidak perlu pencet tombol play dulu.
  useEffect(() => {
    if (pending?.previewUrl && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
      } catch {}
      setProgress(0);
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  const chooseTrack = (track: SpotifyTrack) => {
    if (pending?.id === track.id) {
      // Klik lagi lagu yang sama: ulangi dari awal + pastikan nyetel.
      const audio = audioRef.current;
      if (audio && track.previewUrl) {
        try {
          audio.currentTime = 0;
        } catch {}
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
    setProgress(0);
    setPending(track);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !pending?.previewUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleClose = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    onClose();
  };

  const handleUse = () => {
    if (!pending) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    onPick(pending);
  };

  if (!open) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      bg="blackAlpha.600"
      zIndex={100}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={handleClose}
    >
      <audio
        ref={audioRef}
        src={pending?.previewUrl ?? undefined}
        preload="metadata"
        loop
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration > 0) {
            setProgress((a.currentTime / a.duration) * 100);
          }
        }}
        onEnded={() => {
          // loop aktif -> audio mengulang sendiri, tetap tandai sedang nyetel.
          // Kalau loop tidak didukung browser, ulangi manual.
          const audio = audioRef.current;
          if (audio && audio.loop) {
            setIsPlaying(true);
            return;
          }
          setIsPlaying(false);
          setProgress(0);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <Box
        bg="var(--app-card)"
        w="full"
        maxW="420px"
        maxH="70vh"
        borderRadius="2xl"
        shadow="2xl"
        display="flex"
        flexDirection="column"
        overflow="hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex
          p={4}
          borderBottom="1px solid"
          borderColor="var(--app-hover)"
          align="center"
          justify="space-between"
        >
          <Text fontWeight="bold" color="var(--app-text)">
            Pilih musik
          </Text>
          <Box
            as="button"
            onClick={handleClose}
            cursor="pointer"
            color="var(--app-text)"
            _hover={{ opacity: 0.7 }}
          >
            <X size={18} />
          </Box>
        </Flex>

        <Box px={4} pt={3}>
          <HStack
            bg="var(--app-hover)"
            px={3}
            py={2}
            borderRadius="xl"
            color="var(--app-text)"
          >
            <Search size={16} color="var(--app-text)" />
            <Input
              placeholder="Cari musik..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fontSize="sm"
              color="var(--app-text)"
              bg="transparent"
              border="none"
              outline="none"
              boxShadow="none"
              p={0}
              h="auto"
              _placeholder={{ color: "var(--app-muted)" }}
              _hover={{ border: "none", boxShadow: "none" }}
              _focus={{ border: "none", outline: "none", boxShadow: "none" }}
              autoFocus
            />
          </HStack>
        </Box>

        <Box flex={1} overflowY="auto" p={2} minH="200px">
          {isLoading && list.length === 0 ? (
            <Flex py={8} justify="center">
              <Spinner size="md" color="blue.500" />
            </Flex>
          ) : list.length === 0 ? (
            <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={6}>
              {searching ? "Tidak ada lagu yang cocok" : "Belum ada lagu tren"}
            </Text>
          ) : (
            list.map((track) => {
              const active = pending?.id === track.id;
              return (
                <Flex
                  key={track.id}
                  align="center"
                  gap={3}
                  px={2}
                  py={2}
                  borderRadius="lg"
                  cursor="pointer"
                  bg={active ? "var(--app-hover)" : "transparent"}
                  border={active ? "1px solid" : "1px solid transparent"}
                  borderColor={active ? "blue.200" : "transparent"}
                  _hover={{ bg: "var(--app-hover)" }}
                  onClick={() => chooseTrack(track)}
                >
                  {track.cover ? (
                    <Box
                      w="44px"
                      h="44px"
                      borderRadius="lg"
                      overflow="hidden"
                      flexShrink={0}
                      bg="var(--app-hover)"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={track.cover}
                        alt={track.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </Box>
                  ) : (
                    <Flex
                      w="44px"
                      h="44px"
                      borderRadius="lg"
                      bg="var(--app-hover)"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      <Music2 size={18} color="#2563eb" />
                    </Flex>
                  )}
                  <Box flex={1} minW={0}>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color="var(--app-text)"
                      truncate
                    >
                      {track.title}
                    </Text>
                    <Text fontSize="xs" color="var(--app-muted)" truncate>
                      {track.artist}
                    </Text>
                  </Box>
                  {active && <Check size={16} color="#2563eb" />}
                </Flex>
              );
            })
          )}
        </Box>

        {/* Kotak bawah ala /story: setel dulu sebelum dipakai */}
        {pending && (
          <Box
            mx={3}
            mb={3}
            bg="var(--app-hover)"
            border="1px solid"
            borderColor="blue.100"
            borderRadius="xl"
            px={3}
            py={2.5}
          >
            <Flex align="center" gap={3}>
              {pending.cover ? (
                <Box
                  w="40px"
                  h="40px"
                  borderRadius="lg"
                  overflow="hidden"
                  flexShrink={0}
                  bg="var(--app-card)"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pending.cover}
                    alt={pending.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
              ) : (
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius="lg"
                  bg="var(--app-card)"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Music2 size={16} color="#2563eb" />
                </Flex>
              )}
              <Box flex={1} minW={0}>
                <Text fontSize="xs" fontWeight="bold" color="var(--app-text)" truncate>
                  {pending.title}
                </Text>
                <Text fontSize="xs" color="var(--app-muted)" truncate>
                  {pending.artist}
                </Text>
                {/* progress */}
                <Box
                  mt={1.5}
                  h="3px"
                  bg="blue.100"
                  borderRadius="full"
                  overflow="hidden"
                  cursor={pending.previewUrl ? "pointer" : "default"}
                  onClick={(e) => {
                    const audio = audioRef.current;
                    if (!audio || !pending.previewUrl || !audio.duration) return;
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    try {
                      audio.currentTime = Math.max(
                        0,
                        Math.min(audio.duration, ratio * audio.duration),
                      );
                    } catch {}
                  }}
                >
                  <Box h="full" bg="blue.600" width={`${progress}%`} />
                </Box>
              </Box>
              <Box
                as="button"
                aria-label={isPlaying ? "Jeda" : "Putar"}
                onClick={togglePlay}
                w="36px"
                h="36px"
                borderRadius="full"
                border="1px solid"
                borderColor="blue.200"
                bg="var(--app-card)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor={pending.previewUrl ? "pointer" : "not-allowed"}
                opacity={pending.previewUrl ? 1 : 0.4}
                flexShrink={0}
                title={pending.previewUrl ? "Setel" : "Pratinjau tidak tersedia"}
              >
                {isPlaying ? (
                  <Pause size={15} color="var(--app-text)" />
                ) : (
                  <Play size={15} color="var(--app-text)" />
                )}
              </Box>
              <Box
                as="button"
                aria-label="Pakai lagu ini"
                onClick={handleUse}
                h="36px"
                px={3}
                borderRadius="full"
                bg="blue.600"
                color="white"
                fontSize="xs"
                fontWeight="bold"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                flexShrink={0}
                _hover={{ bg: "blue.700" }}
              >
                Pakai
              </Box>
            </Flex>
            {!pending.previewUrl && (
              <Text fontSize="10px" color="var(--app-muted)" mt={1.5}>
                Pratinjau tidak tersedia, tapi lagu tetap bisa dipakai.
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

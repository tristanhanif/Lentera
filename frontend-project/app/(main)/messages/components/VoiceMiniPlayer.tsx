"use client";
import { Box, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Pause, Play, X, Mic } from "lucide-react";
import { formatVoiceDuration } from "../channel.service";
import { useVoiceMiniPlayer } from "../utils/voice-player";

// Kotak mini-player di bawah daftar percakapan: VN yang diputar tetap
// bunyi & tampil walau user sudah pindah percakapan/pane (DM/komunitas/
// saluran semua nyambung). Isi: pp avatar kiri + play/pause + gelombang,
// di bawah gelombang rata kiri ada durasi berjalan.
// Kotak disembunyikan (tapi VN tetap bunyi) saat user masih berada di
// percakapan/komunitas/saluran tempat VN itu mulai diputar: cocokkan
// contextKey (pane yang terbuka sekarang) dengan active.sourceKey.
export default function VoiceMiniPlayer({
  contextKey,
  onOpenSource,
}: {
  // Konteks pane aktif dari page.tsx: "dm:<convId>" / "community:<id>" /
  // "channel:<id>", atau null kalau baru menatap daftar (tanpa chat terbuka).
  contextKey: string | null;
  // Pencet pp avatar → lompat ke chat asal VN (dikirim from page.tsx).
  onOpenSource?: (sourceKey: string) => void;
}) {
  const { active, activeId, elapsed, progress, playing, toggle, stop } =
    useVoiceMiniPlayer();

  if (!activeId) return null;
  // Masih di percakapan yang sama dengan asal VN → kotak tidak perlu tampil.
  if (active.sourceKey && active.sourceKey === contextKey) return null;

  return (
    <Box px={3} pb={2} flexShrink={0}>
      <Box
        bg="var(--app-card)"
        border="1px solid"
        borderColor="var(--app-border)"
        borderRadius="xl"
        shadow="md"
        px={3}
        py={2}
      >
        <HStack gap={2} align="center">
          {/* PP avatar pemilik VN (dipencet → buka chat asal VN)
              + icon mic biru menempel pojok kanan-bawah (ala kotak VN) */}
          <Box
            as="button"
            w="36px"
            h="36px"
            position="relative"
            flexShrink={0}
            aria-label="Buka percakapan VN"
            cursor="pointer"
            onClick={() => {
              if (active.sourceKey) onOpenSource?.(active.sourceKey);
            }}
          >
            <Box
              w="36px"
              h="36px"
              borderRadius="full"
              overflow="hidden"
              bg="#e2e8f0"
              border="1px solid"
              borderColor="#cbd5e1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.avatarUrl || "/default-avatar.jpg"}
                alt={active.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>
            {/* Mic biru: ditempel rata di sudut kanan bawah avatar
                (ofset 0, mirip gaya bubble VN di chat) */}
            <Box
              position="absolute"
              right={0}
              bottom={0}
              color="blue.500"
              display="flex"
              pointerEvents="none"
            >
              <Mic size={16} />
            </Box>
          </Box>
          {/* Play/pause */}
          <Box
            as="button"
            aria-label={playing ? "Jeda VN" : "Putar VN"}
            color="var(--app-text)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            flexShrink={0}
            onClick={() => void toggle()}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </Box>
          {/* Gelombang + durasi rata kiri di bawahnya (kayak di bubble chat) */}
          <VStack flex={1} minW={0} align="stretch" gap={0.5}>
            <Flex align="center" gap="2px" h="24px">
              {Array.from({ length: 40 }, (_, i) => {
                const h = 0.3 + (((i * 7919) % 100) / 100) * 0.7;
                return (
                  <Box
                    key={i}
                    flex={1}
                    minW="1px"
                    maxW="4px"
                    borderRadius="full"
                    bg={i / 40 <= progress ? "blue.500" : "#cbd5e1"}
                    style={{ height: `${Math.round(h * 100)}%` }}
                  />
                );
              })}
            </Flex>
            <Text
              fontSize="10px"
              color="var(--app-muted)"
              fontWeight="medium"
              textAlign="left"
            >
              {formatVoiceDuration(elapsed)}
            </Text>
          </VStack>
          {/* Tombol tutup */}
          <Box
            as="button"
            aria-label="Tutup pemutar"
            color="var(--app-muted)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            flexShrink={0}
            onClick={() => stop()}
          >
            <X size={16} />
          </Box>
        </HStack>
      </Box>
    </Box>
  );
}

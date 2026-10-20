"use client";
import { useEffect, useState } from "react";
import { Box, VStack, Flex, Text, HStack } from "@chakra-ui/react";
import { Play, Pause, Mic } from "lucide-react";
import { formatVoiceDuration } from "../channel.service";
import { formatWIBTime } from "../utils/chat-time";
import { getDmPeaks } from "../utils/dm-voice";
import { toggleVoice, useIsVoicePlaying, useVoicePlayback } from "../utils/voice-player";

// Bubble VN komunitas: isi bubble 1:1 dengan DMVoiceBubble tapi memakai
// global voice player (satu <audio> buat semua pane — DM/komunitas/saluran
// nyambung, VN lain otomatis berhenti, mini-player ikut menampilkannya),
// plus header khas komunitas: pp avatar + "Kamu"/username + Admin Komunitas.
export default function CommunityVoiceBubble({
  id,
  url,
  duration,
  playing: _ignoredPlaying,
  onPlay: _ignoredOnPlay,
  onPause: _ignoredOnPause,
  avatarUrl,
  avatarName,
  displayName,
  isAdmin,
  createdAt,
  sourceKey,
}: {
  id: string;
  url: string;
  duration: number;
  // Deprecated: tetap diterima agar pemanggil lama tidak error, tapi
  // tidak dipakai lagi — playing/progres kini dari global voice player.
  playing?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  avatarUrl: string | null;
  avatarName: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  // Konteks komunitas tempat bubble ini berada ("community:<id>") — dipakai
  // VoiceMiniPlayer untuk menyembunyikan kotak mini saat user masih di sini.
  sourceKey?: string | null;
}) {
  void _ignoredPlaying;
  void _ignoredOnPlay;
  void _ignoredOnPause;
  const globalPlaying = useIsVoicePlaying(id);
  const globalPlayback = useVoicePlayback(id);
  const playing = globalPlaying;
  const elapsed = globalPlayback.elapsed;
  const progress = globalPlayback.progress;
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let live = true;
    getDmPeaks(url).then((p) => {
      if (live) setPeaks(p);
    });
    return () => {
      live = false;
    };
  }, [url]);

  const total = Math.max(1, duration);
  const pct = Math.min(1, Math.max(0, progress));

  return (
    <Box
      w="280px"
      maxW="100%"
      px={4}
      py={3}
      borderRadius="2xl"
      bg="white"
      color="black"
      shadow="sm"
      border="2px solid"
      borderColor="var(--app-border)"
      position="relative"
    >
      {/* Header khas komunitas: pp avatar kiri + "Kamu"/username,
          plus "Admin Komunitas" kalau pengirimnya admin. */}
      <HStack gap={2} align="center" mb={2}>
        <Box w="32px" h="32px" borderRadius="full" overflow="hidden" bg="#e2e8f0" border="1px solid" borderColor="#cbd5e1" flexShrink={0}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl || "/default-avatar.jpg"} alt={avatarName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Box>
        <VStack align="start" gap={0} minW={0}>
          <Text fontSize="xs" fontWeight="bold" color="black" lineClamp={1}>
            {displayName}
          </Text>
          {isAdmin && (
            <Text fontSize="10px" color="black" fontWeight="medium">
              Admin Komunitas
            </Text>
          )}
        </VStack>
      </HStack>
      <Flex align="center" gap={2.5}>
        <Box
          as="button"
          aria-label={playing ? "Jeda VN" : "Putar VN"}
          color="black"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          onClick={() => void toggleVoice(id, url, displayName, avatarUrl, sourceKey ?? null)}
        >
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </Box>
        <VStack flex={1} minW={0} align="stretch" gap={1}>
          <Box position="relative" h="36px">
            {/* Bar menyusut mengikuti lebar area (flex:1) supaya waveform
                tidak meluber menumpuk icon play & avatar (sama kayak DM). */}
            <Flex align="center" gap="2px" h="full">
              {(peaks.length ? peaks : Array.from({ length: 48 }, () => 0.4)).map((p, i, arr) => (
                <Box
                  key={i}
                  flex={1}
                  minW="1px"
                  maxW="4px"
                  borderRadius="full"
                  bg={i / arr.length <= pct ? "blue.500" : "#cbd5e1"}
                  style={{ height: `${Math.round(p * 100)}%` }}
                />
              ))}
            </Flex>
            <Box
              position="absolute"
              top="50%"
              w="10px"
              h="10px"
              borderRadius="full"
              bg="blue.500"
              transform="translate(-50%, -50%)"
              style={{ left: `${Math.round(pct * 100)}%` }}
            />
          </Box>
          <Flex justify="space-between" align="center">
            <Text fontSize="xs" color="black" fontWeight="medium" textAlign="left">
              {playing && elapsed > 0.3
                ? `${formatVoiceDuration(elapsed)} / ${formatVoiceDuration(total)}`
                : formatVoiceDuration(total)}
            </Text>
            <Text fontSize="11px" color="#64748b">
              {formatWIBTime(createdAt)}
            </Text>
          </Flex>
        </VStack>
        <Box position="relative" flexShrink={0} display="flex" alignItems="center" pl="8px">
          <Box position="absolute" left={0} bottom={0} color="blue.500" zIndex={1} display="flex">
            <Mic size={16} />
          </Box>
          <Box w="44px" h="44px" borderRadius="full" overflow="hidden" bg={!avatarUrl ? "#e2e8f0" : "#f1f5f9"} border="1px solid" borderColor={!avatarUrl ? "#cbd5e1" : "#e2e8f0"} flexShrink={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl || "/default-avatar.jpg"} alt={avatarName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

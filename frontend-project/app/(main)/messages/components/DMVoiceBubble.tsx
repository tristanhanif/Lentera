"use client";
import { useEffect, useRef, useState } from "react";
import { Box, VStack, Flex, Text } from "@chakra-ui/react";
import { Play, Pause, Mic } from "lucide-react";
import { formatVoiceDuration } from "../channel.service";
import { formatWIBTime } from "../utils/chat-time";
import { getDmPeaks } from "../utils/dm-voice";

export default function DMVoiceBubble({
  url,
  duration,
  playing,
  onPlay,
  onPause,
  avatarUrl,
  avatarName,
  createdAt,
}: {
  url: string;
  duration: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  avatarUrl: string | null;
  avatarName: string;
  createdAt: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let live = true;
    getDmPeaks(url).then((p) => {
      if (live) setPeaks(p);
    });
    return () => {
      live = false;
    };
  }, [url]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => onPause());
    } else {
      a.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(
    () => () => {
      try {
        audioRef.current?.pause();
      } catch {}
    },
    [],
  );

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
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => {
          const t = e.currentTarget;
          setElapsed(t.currentTime);
          setProgress(t.duration ? t.currentTime / t.duration : 0);
        }}
        onEnded={() => {
          setProgress(0);
          setElapsed(0);
          onPause();
        }}
      />
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
          onClick={() => (playing ? onPause() : onPlay())}
        >
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </Box>
        <VStack flex={1} minW={0} align="stretch" gap={1}>
          <Box position="relative" h="36px">
            <Flex align="center" justify="center" gap="2px" h="full">
              {(peaks.length ? peaks : Array.from({ length: 48 }, () => 0.4)).map((p, i, arr) => (
                <Box
                  key={i}
                  w="3px"
                  borderRadius="full"
                  bg={i / arr.length <= pct ? "blue.500" : "#cbd5e1"}
                  style={{ height: `${Math.round(p * 100)}%` }}
                  flexShrink={0}
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
          <Box w="44px" h="44px" borderRadius="full" overflow="hidden" bg="#e2e8f0" border="1px solid" borderColor="#cbd5e1" flexShrink={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl || "/default-avatar.jpg"} alt={avatarName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        </Box>
      </Flex>
    </Box>
  );
}

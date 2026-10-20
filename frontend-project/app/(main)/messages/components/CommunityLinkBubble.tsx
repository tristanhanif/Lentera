"use client";
/* eslint-disable @next/next/no-img-element */
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import { communityAvatar } from "../community.store";
import { useCommunityPreview } from "../community.service";

interface CommunityLinkBubbleProps {
  communityId: string;
  onOpen: (communityId: string) => void;
}

// Kartu link komunitas di dalam bubble DM (hasil tombol Copy link yang
// dikirim lewat "Forward ke chat"). Dipencet -> dibawa ke kotak percakapan
// komunitas itu (preview + ajakan gabung kalau belum jadi anggota).
export default function CommunityLinkBubble({
  communityId,
  onOpen,
}: CommunityLinkBubbleProps) {
  const { data } = useCommunityPreview(communityId);
  const preview = data?.data ?? null;
  const avatarUrl = preview?.avatarUrl ?? null;

  return (
    <Flex
      as="button"
      aria-label={`Buka komunitas ${preview?.name ?? ""}`}
      align="center"
      gap={2.5}
      mt={2}
      w="full"
      bg="var(--app-card)"
      border="1px solid"
      borderColor="var(--app-border)"
      borderRadius="xl"
      shadow="sm"
      p={2.5}
      cursor="pointer"
      textAlign="left"
      transition="0.15s"
      _hover={{ bg: "var(--app-hover)" }}
      onClick={() => onOpen(communityId)}
    >
      <Box w="44px" h="44px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
        <img
          src={communityAvatar(avatarUrl)}
          alt={preview?.name ?? "Komunitas"}
          className={avatarUrl ? undefined : "community-logo-default"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
      <VStack align="start" gap={0} flex={1} minW={0}>
        <Text fontSize="10px" fontWeight="bold" color="var(--app-muted)" letterSpacing="wide">
          KOMUNITAS
        </Text>
        <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" lineClamp={1} w="full">
          {preview?.name ?? "Komunitas"}
        </Text>
        <Text fontSize="xs" color="var(--app-muted)" lineClamp={1} w="full">
          {preview ? `${preview.memberCount} anggota` : "Lihat komunitas"}
        </Text>
      </VStack>
      <Box color="var(--app-muted)" display="flex" flexShrink={0}>
        <ChevronRight size={18} />
      </Box>
    </Flex>
  );
}

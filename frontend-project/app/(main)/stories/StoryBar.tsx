/* eslint-disable @next/next/no-img-element */
"use client";
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import { Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { StoryGroup, StoryItem } from "./story.interface";
import { useProfile } from "../profile/profile.service";

export function formatTimeLeft(timeLeftSec: number): string {
  if (timeLeftSec <= 0) return "Segera";
  if (timeLeftSec < 60) return `${timeLeftSec}d`;
  const minutes = Math.floor(timeLeftSec / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  const days = Math.floor(hours / 24);
  return `${days}h`;
}

// Backend mengembalikan flat per story — kelompokkan per user untuk tampilan bar.
export function groupStoriesByUser(stories: StoryItem[]): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  for (const story of stories) {
    const existing = map.get(story.user.id);
    if (existing) {
      existing.items.push(story);
    } else {
      map.set(story.user.id, { user: story.user, items: [story] });
    }
  }
  const groups = Array.from(map.values());
  // Urutan putar: yang lama dulu, baru yang baru (kronologis).
  for (const group of groups) {
    group.items.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  // Urutan bar: grup dengan story terbaru di depan (pakai item terakhir).
  groups.sort(
    (a, b) =>
      new Date(b.items[b.items.length - 1].createdAt).getTime() -
      new Date(a.items[a.items.length - 1].createdAt).getTime(),
  );
  return groups;
}

interface StoryBarProps {
  stories: StoryItem[];
  onCreate?: () => void;
  onOpen: (index: number) => void;
  onOpenOwn?: () => void;
}

export function StoryBar({ stories, onCreate, onOpen, onOpenOwn }: StoryBarProps) {
  const router = useRouter();
  const { data: profile } = useProfile();
  const groups = groupStoriesByUser(stories);
  // Story milik sendiri selalu di ujung kiri (POV akun sendiri).
  const ownGroup = groups.find((g) => g.items[0]?.isMine);
  const visibleGroups = groups.filter((g) => !g.items[0]?.isMine);

  const hasOwnStory = !!ownGroup;
  const ownAvatar =
    ownGroup?.user.avatar ?? profile?.avatar ?? "/default-avatar.jpg";
  const ownUsername = ownGroup?.user.username ?? profile?.username ?? "";
  const hasUnviewedOwn =
    ownGroup?.items.some((s) => !s.isViewedByMe) ?? false;
  const allLockedOwn =
    !!ownGroup && ownGroup.items.every((s) => s.isLocked);
  const nearestUnlockOwn =
    ownGroup?.items.reduce(
      (m, s) => Math.min(m, s.timeLeftSec),
      Number.POSITIVE_INFINITY,
    ) ?? 0;

  const handleOwnClick = () => {
    if (hasOwnStory) {
      if (onOpenOwn) {
        onOpenOwn();
        return;
      }
      if (ownUsername) {
        router.push(`/story/${encodeURIComponent(ownUsername)}`);
        return;
      }
      return;
    }
    if (onCreate) {
      onCreate();
      return;
    }
    router.push("/story");
  };

  return (
    <Box
      bg="var(--app-card)"
      p={4}
      borderRadius="2xl"
      border="1px solid"
      borderColor="var(--app-border)"
      shadow="sm"
      w="full"
    >
      <Flex
        gap={4}
        overflowX="auto"
        py={1}
        css={{
          "&::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {/* POV akun sendiri — selalu di kiri. Belum buat story = avatar polos
            + buletan biru icon plus di kanan bawah. Sudah buat = ring story
            biasa (plus dihilangkan), klik buka viewer story sendiri. */}
        <VStack gap={1} flexShrink={0} w="64px">
          <Box
            position="relative"
            p="3px"
            borderRadius="full"
            bg={
              hasOwnStory
                ? hasUnviewedOwn
                  ? "linear-gradient(to top right, #f97316, #facc15)"
                  : "var(--app-border)"
                : "transparent"
            }
            cursor="pointer"
            onClick={handleOwnClick}
            title={hasOwnStory ? `Lihat story ${ownUsername}` : "Buat story"}
          >
            <Box
              w="56px"
              h="56px"
              borderRadius="full"
              overflow="hidden"
              bg="var(--app-card)"
              border="2px solid white"
            >
              <img
                src={ownAvatar}
                alt={ownUsername || "Cerita Anda"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
            {hasOwnStory && allLockedOwn && (
              <Box
                position="absolute"
                bottom={0}
                right={0}
                bg="var(--app-secondary)"
                borderRadius="full"
                p={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="2px solid white"
              >
                <Lock size={10} color="white" />
              </Box>
            )}
            {!hasOwnStory && (
              <Box
                position="absolute"
                bottom={0}
                right={0}
                bg="blue.600"
                borderRadius="full"
                w="22px"
                h="22px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="2px solid white"
              >
                <Plus size={12} color="white" strokeWidth={3} />
              </Box>
            )}
          </Box>
          <Text
            fontSize="10px"
            fontWeight="bold"
            color="var(--app-secondary)"
            maxW="64px"
            truncate
            textAlign="center"
          >
            Anda
          </Text>
          <Text
            fontSize="9px"
            color={allLockedOwn ? "orange.500" : "var(--app-faint)"}
          >
            {!hasOwnStory
              ? "Buat"
              : allLockedOwn
                ? `Kapsul • ${formatTimeLeft(nearestUnlockOwn)}`
                : hasUnviewedOwn
                  ? "Baru"
                  : "Dilihat"}
          </Text>
        </VStack>

        {visibleGroups.length === 0 ? (
          <Flex align="center" flex={1} justify="center" py={4}>
            <Text fontSize="xs" color="var(--app-faint)">
              Belum ada story dari pengguna lain.
            </Text>
          </Flex>
        ) : (
          visibleGroups.map((group, index) => {
            const hasUnviewed = group.items.some((s) => !s.isViewedByMe);
            const allLocked = group.items.every((s) => s.isLocked);
            // Kapsul: tampilkan yang paling cepat terbuka.
            const nearestUnlock = group.items.reduce(
              (m, s) => Math.min(m, s.timeLeftSec),
              Number.POSITIVE_INFINITY,
            );
            return (
              <VStack key={group.user.id} gap={1} flexShrink={0} w="64px">
                <Box
                  position="relative"
                  p="3px"
                  borderRadius="full"
                  bg={
                    hasUnviewed
                      ? "linear-gradient(to top right, #f97316, #facc15)"
                      : "var(--app-border)"
                  }
                  cursor="pointer"
                  onClick={() => onOpen(index)}
                >
                  <Box
                    w="56px"
                    h="56px"
                    borderRadius="full"
                    overflow="hidden"
                    bg="var(--app-card)"
                    border="2px solid white"
                  >
                    <img
                      src={group.user.avatar || "/default-avatar.jpg"}
                      alt={group.user.username}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                  {allLocked && (
                    <Box
                      position="absolute"
                      bottom={0}
                      right={0}
                      bg="var(--app-secondary)"
                      borderRadius="full"
                      p={1}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      border="2px solid white"
                    >
                      <Lock size={10} color="white" />
                    </Box>
                  )}
                </Box>
                <Text
                  fontSize="10px"
                  fontWeight="bold"
                  color="var(--app-secondary)"
                  maxW="64px"
                  truncate
                  textAlign="center"
                >
                  {group.user.username}
                </Text>
                <Text fontSize="9px" color={allLocked ? "orange.500" : "var(--app-faint)"}>
                  {allLocked
                    ? `Kapsul • ${formatTimeLeft(nearestUnlock)}`
                    : hasUnviewed
                      ? "Baru"
                      : "Dilihat"}
                </Text>
              </VStack>
            );
          })
        )}
      </Flex>
    </Box>
  );
}

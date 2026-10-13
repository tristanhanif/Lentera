"use client";
/* eslint-disable @next/next/no-img-element */
import { Box } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useStories } from "./story.service";
import { groupStoriesByUser } from "./StoryBar";

interface StoryAvatarProps {
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  // Dipanggil sebelum navigasi (mis. untuk menutup modal).
  onBeforeNavigate?: () => void;
  // Tujuan kalau tidak punya story (mis. /profile atau /profile/username).
  fallbackHref?: string;
}

// Avatar dengan lingkaran story ala IG:
// - punya story + ada yang belum dilihat -> gradient orange-kuning
// - punya story + semua sudah dilihat -> abu-abu
// - tidak punya story -> polos tanpa ring
// Klik: ada story -> /story/[username], tidak ada -> fallbackHref.
export function StoryAvatar({
  userId,
  username,
  avatarUrl,
  size = 40,
  onBeforeNavigate,
  fallbackHref,
}: StoryAvatarProps) {
  const router = useRouter();
  const { data: storiesData } = useStories();
  const groups = groupStoriesByUser(storiesData?.data ?? []);
  const group = groups.find((g) => {
    if (userId && g.user.id === userId) return true;
    if (username && g.user.username.toLowerCase() === username.toLowerCase())
      return true;
    return false;
  });

  const hasStory = !!group;
  const hasUnviewed = group?.items.some((s) => !s.isViewedByMe) ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasStory && group) {
      onBeforeNavigate?.();
      router.push(`/story/${encodeURIComponent(group.user.username)}`);
      return;
    }
    if (fallbackHref) {
      onBeforeNavigate?.();
      router.push(fallbackHref);
    }
  };

  return (
    <Box
      onClick={handleClick}
      cursor="pointer"
      p={hasStory ? "2px" : "0px"}
      borderRadius="full"
      flexShrink={0}
      bg={
        hasStory
          ? hasUnviewed
            ? "linear-gradient(to top right, #f97316, #facc15)"
            : "var(--app-border)"
          : "transparent"
      }
      title={hasStory ? `Lihat story ${group?.user.username}` : undefined}
    >
      <Box
        w={`${size}px`}
        h={`${size}px`}
        borderRadius="full"
        overflow="hidden"
        bg="var(--app-subtle)"
        border="2px solid white"
      >
        <img
          src={avatarUrl || "/default-avatar.jpg"}
          alt={username || "Foto profil"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    </Box>
  );
}

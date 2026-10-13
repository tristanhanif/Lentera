"use client";

import dynamic from "next/dynamic";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Flex,
  Image,
  Spinner,
  Link,
} from "@chakra-ui/react";
import { MapPin, Calendar, Link as LinkIcon, ArrowLeft, LayoutGrid } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { usePublicProfile, useFollowUser } from "../profile.service";
import { FollowModal } from "../FollowModal";
import { useCreateConversation } from "../../messages/chat.service";
import { useGetUserPosts } from "../../post/post.service";
import { PostDetailModal } from "../../post/PostDetailModal";
import { ProfileMediaGrid } from "../../post/PostCard";
import { PostResponseSingle } from "../../post/post.interface";
import { useEffect, useState } from "react";

function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const router = useRouter();
  const { data: profile, isLoading } = usePublicProfile(username);
  const { data: posting, isFetching } = useGetUserPosts(username);
  const [selectedPost, setSelectedPost] = useState<PostResponseSingle | null>(null);
  const [followModal, setFollowModal] = useState<null | "followers" | "following">(null);
  const followMutation = useFollowUser();
  const createConversationMutation = useCreateConversation();

  const isSelf = profile?.data?.isSelf ?? false;

  useEffect(() => {
    if (isSelf) {
      router.replace("/profile");
    }
  }, [isSelf, router]);

  if (isLoading) {
    return (
      <Flex h="60vh" align="center" justify="center">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  const isFollowing = profile?.data?.isFollowing ?? false;
  const isBlocked = profile?.data?.isBlockedByMe || profile?.data?.blockedMe;

  if (isBlocked) {
    return (
      <VStack flex={1} gap={6} align="stretch">
        <Box
          bg="var(--app-card)"
          borderRadius="2xl"
          shadow="sm"
          border="1px solid"
          borderColor="var(--app-border)"
          px={6}
          py={10}
          textAlign="center"
        >
          <Heading size="md" fontWeight="bold" color="var(--app-text)">
            @{profile?.data?.username ?? username}
          </Heading>
          <Text mt={3} color="var(--app-muted)" fontSize="sm">
            {profile?.data?.isBlockedByMe
              ? "Anda memblokir akun ini. Profil, postingan, dan komentarnya disembunyikan."
              : "Akun ini tidak tersedia."}
          </Text>
          <Button
            mt={6}
            colorPalette="blue"
            borderRadius="full"
            px={6}
            onClick={() => router.push("/akun/akun_blok")}
          >
            Lihat Akun yang Diblokir
          </Button>
        </Box>
        <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={6}>
          © 2026 Lentera
        </Text>
      </VStack>
    );
  }

  const handleFollow = () => {
    if (!profile?.data?.id || isSelf) return;
    followMutation.mutate(profile.data.id);
  };

  const handleSendMessage = () => {
    if (!profile?.data?.id || isSelf) return;
    createConversationMutation.mutate(profile.data.id, {
      onSuccess: () => {
        router.push("/messages");
      },
    });
  };

  return (
    <VStack flex={1} gap={6} align="stretch">
      {/* ===== PROFILE HEADER ===== */}
      <Box
        bg="var(--app-card)"
        borderRadius="2xl"
        shadow="sm"
        overflow="hidden"
        border="1px solid"
        borderColor="var(--app-border)"
      >
        <Flex
          align="center"
          gap={2}
          px={6}
          py={3}
          borderBottom="1px solid"
          borderColor="var(--app-subtle)"
        >
          <IconButtonClick router={router} />
          <Text fontWeight="bold" color="var(--app-secondary)" fontSize="sm">
            Profil
          </Text>
        </Flex>

        {/* Cover */}
        <Box
          h="160px"
          position="relative"
          zIndex={0}
          bgGradient="linear(to-r, blue.600, blue.400)"
        >
          {profile?.data?.cover && (
            <Image
              src={profile.data.cover}
              alt="Cover"
              position="absolute"
              inset={0}
              w="full"
              h="full"
              objectFit="cover"
            />
          )}
        </Box>

        <Box px={6} pb={6}>
          <Flex justify="space-between" align="end" mt="-50px">
            {/* Avatar */}
            <Box
              w="110px"
              h="110px"
              bg="var(--app-subtle)"
              borderRadius="full"
              border="5px solid white"
              overflow="hidden"
              position="relative"
              zIndex={1}
            >
              <Image
                src={profile?.data?.avatar || "/default-avatar.jpg"}
                alt="Profile Avatar"
                w="110px"
                h="110px"
                objectFit="cover"
              />
            </Box>

            {!isSelf && (
              <HStack gap={2}>
                <Button
                  onClick={handleSendMessage}
                  colorPalette="blue"
                  borderRadius="full"
                  px={6}
                  variant="outline"
                  loading={createConversationMutation.isPending}
                >
                  Kirim Pesan
                </Button>
                <Button
                  onClick={handleFollow}
                  colorPalette="blue"
                  borderRadius="full"
                  px={6}
                  variant={isFollowing ? "outline" : "solid"}
                  loading={followMutation.isPending}
                >
                  {isFollowing ? "Mengikuti" : "Ikuti"}
                </Button>
              </HStack>
            )}
          </Flex>

          {/* Name & Username */}
          <VStack align="start" gap={1} mt={4}>
            <Heading size="xl" fontWeight="bold" color="var(--app-text)">
              {profile?.data?.name ?? "-"}
            </Heading>
            <Text color="var(--app-muted)">@{profile?.data?.username ?? "-"}</Text>
          </VStack>

          {/* Bio */}
          {profile?.data?.bio ? (
            <Text mt={4} color="var(--app-secondary)">
              {profile.data.bio}
            </Text>
          ) : (
            <Text mt={4} color="var(--app-faint)" fontStyle="italic">
              Belum ada bio.
            </Text>
          )}

          {/* Info */}
          <HStack gap={6} mt={4} color="var(--app-muted)" fontSize="sm" flexWrap="wrap">
            {profile?.data?.location && (
              <HStack gap={1}>
                <MapPin size={16} />
                <Text>{profile.data.location}</Text>
              </HStack>
            )}

            {profile?.data?.website && (
              <HStack gap={1}>
                <LinkIcon size={16} />
                <Link
                  href={profile.data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  color="blue.600"
                  fontSize="sm"
                >
                  {profile.data.website}
                </Link>
              </HStack>
            )}

            {profile?.data?.createdAt && (
              <HStack gap={1}>
                <Calendar size={16} />
                <Text>
                  Bergabung{" "}
                  {new Date(profile.data.createdAt).toLocaleDateString("id-ID")}
                </Text>
              </HStack>
            )}
          </HStack>

          {/* Follow Stats */}
          <HStack gap={8} mt={6}>
            <HStack
              gap={1}
              cursor="pointer"
              _hover={{ opacity: 0.7 }}
              onClick={() => setFollowModal("followers")}
            >
              <Text fontWeight="bold" color="var(--app-text)">
                {profile?.data?.followersCount ?? 0}
              </Text>
              <Text color="var(--app-muted)">Pengikut</Text>
            </HStack>
            <HStack
              gap={1}
              cursor="pointer"
              _hover={{ opacity: 0.7 }}
              onClick={() => setFollowModal("following")}
            >
              <Text fontWeight="bold" color="var(--app-text)">
                {profile?.data?.followingCount ?? 0}
              </Text>
              <Text color="var(--app-muted)">Mengikuti</Text>
            </HStack>
          </HStack>
        </Box>
      </Box>

      {/* ===== POSTS TITLE (GRID ICON) ===== */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderBottom="2px solid"
        borderColor="blue.500"
        px={6}
        py={3}
      >
        <LayoutGrid size={30} color="#2563eb" />
      </Box>

      {/* ===== POSTS LIST (GRID) ===== */}
      {isFetching ? (
        <Text textAlign="center" color="var(--app-muted)" py={10}>
          Memuat postingan...
        </Text>
      ) : posting?.data?.length ? (
        <ProfileMediaGrid
          posts={posting.data}
          onSelect={(post) => setSelectedPost(post)}
        />
      ) : (
        <Text textAlign="center" color="var(--app-muted)" py={10}>
          Belum ada postingan.
        </Text>
      )}

      {/* ===== COPYRIGHT ===== */}
      <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={6}>
        © 2026 Lentera
      </Text>

      {/* ===== POST DETAIL MODAL ===== */}
      <PostDetailModal
        post={selectedPost ?? ({} as PostResponseSingle)}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      {/* ===== FOLLOWERS / FOLLOWING MODAL ===== */}
      <FollowModal
        open={!!followModal}
        type={followModal ?? "followers"}
        userId={profile?.data?.id ?? ""}
        onClose={() => setFollowModal(null)}
      />
    </VStack>
  );
}

function IconButtonClick({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <Box
      as="button"
      onClick={() => router.back()}
      display="flex"
      alignItems="center"
      justifyContent="center"
      w="32px"
      h="32px"
      borderRadius="full"
      _hover={{ bg: "var(--app-subtle)" }}
    >
      <ArrowLeft size={20} color="#2563eb" />
    </Box>
  );
}

export default dynamic(() => Promise.resolve(PublicProfilePage), {
  ssr: false,
});
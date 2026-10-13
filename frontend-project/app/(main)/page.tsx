/* eslint-disable @next/next/no-img-element */
"use client";
import dynamic from "next/dynamic";
import {
  Box,
  VStack,
  HStack,
  Text,
  Spinner,
  Flex,
  Button,
} from "@chakra-ui/react";
import Link from "next/link";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { PostCard } from "./post/PostCard";
import { useGetFeed } from "./post/post.service";
import { useSuggestions, useToggleFollow } from "./profile/suggestion.service";
import { useProfile } from "./profile/profile.service";
import { useRouter } from "next/navigation";
import { StoryBar, groupStoriesByUser } from "./stories/StoryBar";
import { StoryAvatar } from "./stories/StoryAvatar";
import { StoryUploadToast } from "../story/components/StoryUploadToast";
import { useStories } from "./stories/story.service";
import { disconnectSocket } from "@/app/lib/socket";
import { useCallback, useEffect, useState } from "react";

function DashboardPage() {
  const router = useRouter();

  // Feed utama: postingan terbaru di paling atas.
  const { data, isFetching, isLoading, query, setQuery } = useGetFeed("", "newest");
  const { data: suggestionsData, isLoading: suggestionsLoading } = useSuggestions();
  const toggleFollow = useToggleFollow();
  const { data: profile } = useProfile();

  const handleKeluar = () => {
    Swal.fire({
      title: "Keluar?",
      text: "Anda akan keluar dari aplikasi Lentera.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#f43f5e",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal",
    }).then((result) => {
      if (result.isConfirmed) {
        disconnectSocket();
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("uuid");
        Cookies.remove("loginMethod");
        router.replace("/login");
      }
    });
  };

  const posts = data?.data ?? [];
  const suggestions = suggestionsData?.data ?? [];

  // === Audio global ala TikTok/IG ===
  // soundEnabled = saklar volume global (1 tombol mengontrol semua kartu).
  // activePostId = kartu yang lagi difokus/dilihat → cuma dia yang bunyi.
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const handleInView = useCallback((id: string) => {
    setActivePostId((prev) => (prev === id ? prev : id));
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((v) => !v);
  }, []);

  // Default fokus ke postingan pertama biar langsung bunyi saat dinyalakan.
  const firstPostId = posts[0]?.id ?? null;
  useEffect(() => {
    if (!activePostId && firstPostId) setActivePostId(firstPostId);
  }, [activePostId, firstPostId]);

  // Ganti halaman → reset fokus ke postingan pertama halaman baru.
  useEffect(() => {
    setActivePostId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page]);

  // Auto-matikan musik saat keluar dari web (bukan logout, bukan close).
  // Mencakup: pindah tab Google, minimize browser, lock HP, buka aplikasi lain,
  // navigasi keluar web / tombol back HP (pagehide).
  // Sengaja set OFF (bukan pause sementara) supaya pas balik tidak bunyi sendiri.
  useEffect(() => {
    const turnOff = () => setSoundEnabled(false);
    const onVisibility = () => {
      if (document.hidden) turnOff();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", turnOff);
    window.addEventListener("blur", turnOff);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", turnOff);
      window.removeEventListener("blur", turnOff);
    };
  }, []);

  const { data: storiesData } = useStories();
  const stories = storiesData?.data ?? [];
  // Samakan dengan StoryBar: story milik sendiri tidak ikut kotak story.
  const storyGroups = groupStoriesByUser(stories).filter(
    (g) => !g.items[0]?.isMine,
  );

  if (isLoading) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  // Kartu Saran Pertemanan (dipakai di atas utk mobile & sidebar utk desktop)
  const suggestionsCard = (
    <Box
      bg="var(--app-card)"
      p={5}
      borderRadius="2xl"
      border="1px solid"
      borderColor="var(--app-border)"
      shadow="sm"
      w="full"
    >
      <Text fontWeight="black" fontSize="sm" color="var(--app-text)" mb={4}>
        Saran Pertemanan
      </Text>

      {suggestionsLoading ? (
        <Flex py={6} justify="center">
          <Spinner size="md" color="blue.500" />
        </Flex>
      ) : suggestions.length === 0 ? (
        <Text fontSize="xs" color="var(--app-muted)" textAlign="center" py={4}>
          Tidak ada saran pengguna.
        </Text>
      ) : (
        <VStack gap={4} align="stretch">
          {suggestions.map((user, index) => (
            <HStack key={user.id ?? index} justify="space-between">
              <HStack gap={3}>
                <Box
                  w="36px"
                  h="36px"
                  bg="blue.100"
                  borderRadius="full"
                  overflow="hidden"
                >
                  <img
                    src={user.avatar || "/default-avatar.jpg"}
                    alt={user.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" fontSize="xs" color="var(--app-text)">
                    {user.name}
                  </Text>
                  <Link href={`/profile/${user.username}`}>
                    <Text
                      fontSize="10px"
                      color="var(--app-muted)"
                      fontWeight="bold"
                      _hover={{ textDecoration: "underline" }}
                    >
                      @{user.username}
                    </Text>
                  </Link>
                </VStack>
              </HStack>
              <Button
                size="xs"
                colorPalette="blue"
                borderRadius="full"
                px={4}
                loading={toggleFollow.isPending}
                onClick={() => toggleFollow.mutate(user.id)}
              >
                Ikuti
              </Button>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );

  return (
    <Flex
      align="start"
      justify={{ base: "stretch", lg: "flex-start" }}
      gap={{ base: 12, lg: 16 }}
      flexDirection={{ base: "column", lg: "row" }}
      w="full"
      pr={{ base: 0, lg: 8 }}
    >
      <StoryUploadToast />

      {/* Feed */}
      <VStack flex={1} minW={0} maxW="560px" w="full" gap={6} align="stretch">
        <StoryBar
          stories={stories}
          onCreate={() => router.push("/story")}
          onOpen={(i) => {
            const g = storyGroups[i];
            if (g) router.push(`/story/${encodeURIComponent(g.user.username)}`);
          }}
          onOpenOwn={() => {
            const own = groupStoriesByUser(stories).find(
              (g) => g.items[0]?.isMine,
            );
            const uname = own?.user.username ?? profile?.username;
            if (uname) router.push(`/story/${encodeURIComponent(uname)}`);
          }}
        />

        {/* Saran Pertemanan (Mobile) */}
        <Box display={{ base: "block", lg: "none" }}>{suggestionsCard}</Box>

        {/* Feed List */}
        {isFetching && posts.length === 0 ? (
          <Flex py={10} justify="center">
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : posts.length === 0 ? (
          <Box textAlign="center" py={10} color="var(--app-muted)">
            <Text>
              Belum ada postingan. Jadilah yang pertama membagikan sesuatu!
            </Text>
          </Box>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              soundEnabled={soundEnabled}
              isActive={(activePostId ?? firstPostId) === post.id}
              onToggleSound={handleToggleSound}
              onInView={handleInView}
            />
          ))
        )}

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <HStack justify="center" gap={4} py={6}>
            <Button
              variant="outline"
              colorPalette="blue"
              borderRadius="full"
              disabled={query.page === 1 || isFetching}
              onClick={() => setQuery({ ...query, page: query.page - 1 })}
            >
              Sebelumnya
            </Button>

            <Box bg="var(--app-hover)" px={4} py={2} borderRadius="lg">
              <Text fontWeight="bold" color="blue.600">
                Halaman {query.page} dari {data.meta.totalPages}
              </Text>
            </Box>

            <Button
              variant="outline"
              colorPalette="blue"
              borderRadius="full"
              disabled={query.page >= data.meta.totalPages || isFetching}
              onClick={() => setQuery({ ...query, page: query.page + 1 })}
            >
              Berikutnya
            </Button>
          </HStack>
        )}
      </VStack>

      {/* Sidebar: Friend Suggestions (Desktop) */}
      <Box
        w={{ base: "full", lg: "320px" }}
        flexShrink={0}
        display={{ base: "none", lg: "flex" }}
        flexDirection="column"
        position="sticky"
        top="24px"
        h="calc(100vh - 56px)"
      >
        <VStack gap={4} align="stretch" h="full" justify="space-between">
          {suggestionsCard}
          {/* Akun sendiri + Keluar, di paling bawah buat ngisi kekosongan */}
          <Box
            bg="var(--app-card)"
            p={5}
            borderRadius="2xl"
            border="1px solid"
            borderColor="var(--app-border)"
            shadow="sm"
            w="full"
          >
          <HStack justify="space-between" align="center">
            <HStack gap={3} flex={1} minW={0}>
              <StoryAvatar
                userId={profile?.id}
                username={profile?.username}
                avatarUrl={profile?.avatar}
                size={44}
                fallbackHref="/profile"
              />
              <VStack align="start" gap={0} flex={1} minW={0}>
                <Link href="/profile">
                  <Text
                    fontSize="sm"
                    fontWeight="semibold"
                    color="var(--app-text)"
                    truncate
                    w="full"
                  >
                    {profile?.username ?? "-"}
                  </Text>
                </Link>
                <Text fontSize="xs" color="var(--app-muted)" truncate w="full">
                  {profile?.name ?? ""}
                </Text>
              </VStack>
            </HStack>
            <Text
              as="button"
              fontSize="sm"
              fontWeight="bold"
              color="blue.600"
              cursor="pointer"
              flexShrink={0}
              _hover={{ textDecoration: "underline" }}
              onClick={handleKeluar}
            >
              Keluar
            </Text>
          </HStack>
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
}

export default dynamic(() => Promise.resolve(DashboardPage), {
  ssr: false,
});

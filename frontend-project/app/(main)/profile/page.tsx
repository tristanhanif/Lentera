"use client";

import dynamic from "next/dynamic";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Flex,
  Image,
  Spinner,
  Link,
} from "@chakra-ui/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { MapPin, Calendar, Link as LinkIcon, Bookmark, LayoutGrid, Repeat2, Settings, History, ShieldCheck, Ban, Star, LogOut } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { disconnectSocket } from "@/app/lib/socket";
import { useProfile } from "./profile.service";
import { useGetMyPost } from "../post/post.service";
import { useGetMySavedPosts } from "../save/save.service";
import { useGetMyReposts } from "../repost/repost.service";
import { PostDetailModal } from "../post/PostDetailModal";
import { ProfileMediaGrid } from "../post/PostCard";
import { PostResponseSingle } from "../post/post.interface";
import { FollowModal } from "./FollowModal";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"postingan" | "simpan" | "repost">("postingan");
  const [selectedPost, setSelectedPost] = useState<PostResponseSingle | null>(null);
  const [followModal, setFollowModal] = useState<null | "followers" | "following">(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const { data: profile, isLoading } = useProfile();

  const handleKeluar = () => {
    setSettingsOpen(false);
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

  // Tutup kotak settings saat klik di luar / tekan Escape (tampilan saja).
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [settingsOpen]);

  // Deep-link dari sidebar Menu > Tersimpan -> /profile?tab=simpan
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "simpan" || tab === "save" || tab === "saved") {
      /* eslint-disable react-hooks/set-state-in-effect */
      setActiveTab("simpan");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [searchParams]);
  const { data: posting, query, setQuery, isFetching } = useGetMyPost();
  const { data: savedPosts, query: savedQuery, setQuery: setSavedQuery, isFetching: isFetchingSaved } = useGetMySavedPosts();
  const { data: repostedPosts, query: repostQuery, setQuery: setRepostQuery, isFetching: isFetchingReposts } = useGetMyReposts();

  if (isLoading) {
    return (
      <Flex h="60vh" align="center" justify="center">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <VStack flex={1} gap={6} align="stretch">
      {/* ===== PROFILE HEADER ===== */}
      <Box
        bg="var(--app-card)"
        borderRadius="2xl"
        shadow="sm"
        overflow="visible"
        border="1px solid"
        borderColor="var(--app-border)"
      >
        {/* Cover */}
        <Box h="160px" position="relative" zIndex={0} bgGradient="linear(to-r, blue.600, blue.400)" borderTopRadius="2xl" overflow="hidden">
          {profile?.cover && (
            <Image
              src={profile.cover}
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
          {/* Tombol biru "Edit Profil" dihapus — penggantinya via kotak settings > Pengaturan dan privasi */}
          <Flex justify="start" align="end" mt="-50px">
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
                src={profile?.avatar || "/default-avatar.jpg"}
                alt="Profile Avatar"
                w="110px"
                h="110px"
                objectFit="cover"
              />
            </Box>
          </Flex>

          {/* Username di atas (styling Nama Lengkap) + Nama Lengkap di bawah (styling username) */}
          <VStack align="start" gap={1} mt={4}>
            {/* Username + icon settings di kanannya (tampilan saja, fungsi menyusul). */}
            <Box position="relative" ref={settingsRef}>
              <HStack gap={2} align="center">
                <Heading size="xl" fontWeight="bold" color="var(--app-text)">
                  @{profile?.username ?? "-"}
                </Heading>
                <Box
                  as="button"
                  aria-label="Pengaturan"
                  title="Pengaturan"
                  color="var(--app-muted)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  bg="transparent"
                  border="none"
                  p={1}
                  borderRadius="full"
                  _hover={{ bg: "var(--app-hover)", color: "var(--app-text)" }}
                  onClick={() => setSettingsOpen((v) => !v)}
                >
                  <Settings size={18} />
                </Box>
              </HStack>

              {settingsOpen && (
                <Box
                  position="absolute"
                  top="2px"
                  left="100%"
                  ml={3}
                  minW="230px"
                  w="max-content"
                  maxW="none"
                  whiteSpace="nowrap"
                  zIndex={20}
                  borderRadius="xl"
                  shadow="lg"
                  overflow="hidden"
                  border="1px solid"
                  className="bg-black text-white border-white/20 dark:bg-white dark:text-black dark:border-black/10"
                  p={2}
                >
                  <VStack gap={1} align="stretch">
                    {[
                      { label: "Aktivitas login", icon: History, href: "/session/login_activity" },
                      { label: "Pengaturan dan privasi", icon: ShieldCheck, href: "/profile/edit" },
                      { label: "Diblokir", icon: Ban, href: "/akun/akun_blok" },
                      { label: "Teman dekat", icon: Star, href: "/akun/teman_dekat" },
                    ].map((item) => (
                      <Box
                        key={item.label}
                        as="button"
                        display="flex"
                        alignItems="center"
                        gap={3}
                        w="full"
                        px={3}
                        py={2.5}
                        borderRadius="lg"
                        fontSize="sm"
                        fontWeight="medium"
                        cursor="pointer"
                        className="hover:bg-white/10 dark:hover:bg-black/10"
                        // TODO: fungsi lain menyusul — tampilan saja
                        onClick={() => {
                          setSettingsOpen(false);
                          if (item.href) router.push(item.href);
                        }}
                      >
                        <item.icon size={18} />
                        <Text>{item.label}</Text>
                      </Box>
                    ))}

                    <Box
                      h="1px"
                      my={1}
                      mx={1}
                      className="bg-white/20 dark:bg-black/10"
                    />

                    <Box
                      as="button"
                      display="flex"
                      alignItems="center"
                      gap={3}
                      w="full"
                      px={3}
                      py={2.5}
                      borderRadius="lg"
                      fontSize="sm"
                      fontWeight="medium"
                      cursor="pointer"
                      className="hover:bg-white/10 dark:hover:bg-black/10"
                      onClick={handleKeluar}
                    >
                      <LogOut size={18} />
                      <Text>Keluar</Text>
                    </Box>
                  </VStack>
                </Box>
              )}
            </Box>
            <Text color="var(--app-muted)">{profile?.name ?? "-"}</Text>
          </VStack>

          {/* Bio */}
          {profile?.bio ? (
            <Text mt={4} color="var(--app-secondary)">
              {profile.bio}
            </Text>
          ) : (
            <Text mt={4} color="var(--app-faint)" fontStyle="italic">
              Belum ada bio. Klik Edit Profil untuk menambahkannya.
            </Text>
          )}

          {/* Info */}
          <HStack gap={6} mt={4} color="var(--app-muted)" fontSize="sm" flexWrap="wrap">
            {profile?.location && (
              <HStack gap={1}>
                <MapPin size={16} />
                <Text>{profile.location}</Text>
              </HStack>
            )}

              {profile?.website && (
                <HStack gap={1}>
                  <LinkIcon size={16} />
                  <Link
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    color="blue.600"
                    fontSize="sm"
                  >
                    {profile.website}
                  </Link>
                </HStack>
              )}

            {profile?.createdAt && (
              <HStack gap={1}>
                <Calendar size={16} />
                <Text>
                  Bergabung{" "}
                  {new Date(profile.createdAt).toLocaleDateString("id-ID")}
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
              <Text fontWeight="bold" color="var(--app-text)">{profile?.followersCount ?? 0}</Text>
              <Text color="var(--app-text)">Pengikut</Text>
            </HStack>
            <HStack
              gap={1}
              cursor="pointer"
              _hover={{ opacity: 0.7 }}
              onClick={() => setFollowModal("following")}
            >
              <Text fontWeight="bold" color="var(--app-text)">{profile?.followingCount ?? 0}</Text>
              <Text color="var(--app-text)">Diikuti</Text>
            </HStack>
          </HStack>
        </Box>
      </Box>

      {/* ===== POSTS TITLE / TABS ===== */}
      <HStack gap={0} w="full">
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderBottom="2px solid"
          borderColor={activeTab === "postingan" ? "blue.500" : "transparent"}
          px={6}
          py={3}
          cursor="pointer"
          onClick={() => setActiveTab("postingan")}
        >
          <LayoutGrid
            size={30}
            color={activeTab === "postingan" ? "#2563eb" : "#a0aec0"}
          />
        </Box>
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderBottom="2px solid"
          borderColor={activeTab === "simpan" ? "blue.500" : "transparent"}
          px={6}
          py={3}
          cursor="pointer"
          onClick={() => setActiveTab("simpan")}
        >
          <Bookmark
            size={30}
            color={activeTab === "simpan" ? "#2563eb" : "#a0aec0"}
          />
        </Box>
        <Box
          flex={1}
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderBottom="2px solid"
          borderColor={activeTab === "repost" ? "blue.500" : "transparent"}
          px={6}
          py={3}
          cursor="pointer"
          onClick={() => setActiveTab("repost")}
        >
          <Repeat2
            size={30}
            color={activeTab === "repost" ? "#2563eb" : "#a0aec0"}
          />
        </Box>
      </HStack>

      {/* ===== POSTS LIST (GRID) ===== */}
      {activeTab === "postingan" ? (
        <>
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

          {!isFetching && posting?.data?.length === 0 && (
            <Box textAlign="center" py={10}>
              <Text color="var(--app-muted)">Anda belum memiliki postingan.</Text>
            </Box>
          )}
        </>
      ) : activeTab === "repost" ? (
        <>
          {isFetchingReposts ? (
            <Text textAlign="center" color="var(--app-muted)" py={10}>
              Memuat repost...
            </Text>
          ) : repostedPosts?.data?.length ? (
            <ProfileMediaGrid
              posts={repostedPosts.data}
              onSelect={(post) => setSelectedPost(post)}
            />
          ) : (
            <Text textAlign="center" color="var(--app-muted)" py={10}>
              Belum ada postingan yang direpost.
            </Text>
          )}

          {!isFetchingReposts && repostedPosts?.data?.length === 0 && (
            <Box textAlign="center" py={10}>
              <HStack justify="center" gap={2}>
                <Repeat2 size={20} color="#a0aec0" />
                <Text color="var(--app-muted)">
                  Tekan icon Repost di postingan untuk melihatnya di sini.
                </Text>
              </HStack>
            </Box>
          )}
        </>
      ) : (
        <>
          {isFetchingSaved ? (
            <Text textAlign="center" color="var(--app-muted)" py={10}>
              Memuat simpanan...
            </Text>
          ) : savedPosts?.data?.length ? (
            <ProfileMediaGrid
              posts={savedPosts.data}
              onSelect={(post) => setSelectedPost(post)}
            />
          ) : (
            <Text textAlign="center" color="var(--app-muted)" py={10}>
              Belum ada postingan yang disimpan.
            </Text>
          )}

          {!isFetchingSaved && savedPosts?.data?.length === 0 && (
            <Box textAlign="center" py={10}>
              <HStack justify="center" gap={2}>
                <Bookmark size={20} color="#a0aec0" />
                <Text color="var(--app-muted)">
                  Tekan icon Bookmark di postingan untuk menyimpannya di sini.
                </Text>
              </HStack>
            </Box>
          )}
        </>
      )}

      {/* ===== COPYRIGHT ===== */}
      <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={6}>
        © 2026 Lentera
      </Text>

      {/* ===== POST DETAIL MODAL (khusus /profile sendiri: revisi kotak baru) ===== */}
      <PostDetailModal
        post={selectedPost ?? ({} as PostResponseSingle)}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        variant="own"
      />

      {/* ===== FOLLOWERS / FOLLOWING MODAL ===== */}
      <FollowModal
        open={!!followModal}
        type={followModal ?? "followers"}
        userId={profile?.id ?? ""}
        onClose={() => setFollowModal(null)}
      />
    </VStack>
  );
}

function ProfilePage() {
  return (
    <Suspense
      fallback={
        <Flex h="60vh" align="center" justify="center">
          <Spinner size="lg" color="blue.500" />
        </Flex>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(ProfilePage), {
  ssr: false,
});

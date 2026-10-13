"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Spinner,
  Image,
  Input,
  InputGroup,
} from "@chakra-ui/react";
import { ChevronLeft, Search, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "../../profile/profile.service";
import { useGetFollowers } from "../../profile/followList.service";
import {
  useCloseFriendIds,
  useAddCloseFriend,
  useRemoveCloseFriend,
} from "../close-friends.service";

export default function TemanDekatPage() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const myId = profile?.id ?? "";

  const [search, setSearch] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  const {
    data: followersData,
    isLoading: isLoadingFollowers,
    isError: isFollowersError,
    refetch: refetchFollowers,
  } = useGetFollowers(myId, search, !!myId);

  const { data: idsData } = useCloseFriendIds(!!myId);
  const selectedIds = new Set(idsData?.data ?? []);

  const { mutate: addClose, isPending: isAdding } = useAddCloseFriend();
  const { mutate: removeClose, isPending: isRemoving } = useRemoveCloseFriend();
  const isMutating = isAdding || isRemoving;

  const followers = followersData?.data ?? [];

  const flashSaved = () => {
    setShowSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setShowSaved(false), 2000);
  };

  useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  const handleToggle = (userId: string) => {
    if (isMutating) return;
    if (selectedIds.has(userId)) {
      removeClose(userId, { onSuccess: () => flashSaved() });
    } else {
      addClose(userId, { onSuccess: () => flashSaved() });
    }
  };

  return (
    <VStack flex={1} gap={6} align="stretch" position="relative" pb={16}>
      <Box
        bg="var(--app-card)"
        borderRadius="2xl"
        shadow="sm"
        border="1px solid"
        borderColor="var(--app-border)"
        px={6}
        py={6}
      >
        {/* Header: chevron kiri + judul */}
        <HStack gap={2} align="center">
          <Box
            as="button"
            aria-label="Kembali ke profil"
            title="Kembali ke profil"
            onClick={() => router.push("/profile")}
            color="var(--app-text)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={2}
            ml={-2}
            borderRadius="full"
            cursor="pointer"
            _hover={{ bg: "var(--app-hover)" }}
          >
            <ChevronLeft size={22} />
          </Box>
          <Heading size="lg" fontWeight="bold" color="var(--app-text)">
            Teman dekat
          </Heading>
        </HStack>

        <Text mt={3} fontSize="md" fontWeight="semibold" color="var(--app-text)">
          Pilih akun teman dekatmu!
        </Text>

        {/* Kotak pencarian */}
        <Box mt={4}>
          <InputGroup
            startElement={
              <Box color="var(--app-faint)" pointerEvents="none">
                <Search size={16} />
              </Box>
            }
            startElementProps={{ pointerEvents: "none" }}
          >
            <Input
              placeholder="Cari akun..."
              size="md"
              variant="subtle"
              bg="var(--app-subtle)"
              color="var(--app-text)"
              _placeholder={{ color: "var(--app-faint)" }}
              borderRadius="xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </Box>

        {/* Daftar akun Pengikut saja */}
        <Box mt={2}>
          {isLoadingFollowers ? (
            <HStack justify="center" py={10} gap={3}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color="var(--app-muted)">
                Memuat pengikut...
              </Text>
            </HStack>
          ) : isFollowersError ? (
            <VStack py={8} gap={3}>
              <Text color="var(--app-muted)" fontSize="sm" textAlign="center">
                Gagal memuat daftar pengikut.
              </Text>
              <Box
                as="button"
                fontSize="sm"
                fontWeight="semibold"
                color="var(--app-text)"
                border="1px solid"
                borderColor="var(--app-border)"
                borderRadius="lg"
                px={4}
                py={2}
                cursor="pointer"
                _hover={{ bg: "var(--app-hover)" }}
                onClick={() => refetchFollowers()}
              >
                Coba lagi
              </Box>
            </VStack>
          ) : followers.length ? (
            followers.map((u) => {
              const selected = selectedIds.has(u.id);
              return (
                <HStack
                  key={u.id}
                  gap={3}
                  align="center"
                  py={4}
                  borderBottomWidth="1px"
                  borderColor="var(--app-border)"
                  _last={{ borderBottomWidth: 0 }}
                  cursor="pointer"
                  onClick={() => handleToggle(u.id)}
                >
                  {/* Avatar kiri */}
                  <Box
                    w="44px"
                    h="44px"
                    borderRadius="full"
                    overflow="hidden"
                    bg="var(--app-subtle)"
                    flexShrink={0}
                  >
                    <Image
                      src={u.avatar || "/default-avatar.jpg"}
                      alt={u.username}
                      w="full"
                      h="full"
                      objectFit="cover"
                    />
                  </Box>

                  {/* Username atas + Nama Lengkap bawah */}
                  <VStack align="start" gap={0} flex={1} minW={0}>
                    <Text
                      fontWeight="semibold"
                      color="var(--app-text)"
                      fontSize="md"
                      truncate
                    >
                      {u.username}
                    </Text>
                    <Text color="var(--app-muted)" fontSize="sm" truncate>
                      {u.name}
                    </Text>
                  </VStack>

                  {/* Buletan ceklis kanan */}
                  <Box
                    as="button"
                    aria-label={
                      selected
                        ? `Hapus ${u.username} dari teman dekat`
                        : `Tambah ${u.username} ke teman dekat`
                    }
                    title={selected ? "Teman dekat" : "Jadikan teman dekat"}
                    w="28px"
                    h="28px"
                    borderRadius="full"
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    border="2px solid"
                    borderColor={selected ? "blue.600" : "var(--app-border)"}
                    bg={selected ? "blue.600" : "transparent"}
                    color="white"
                    transition="all 0.15s ease"
                    _hover={{ opacity: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(u.id);
                    }}
                  >
                    {selected && <Check size={16} strokeWidth={3} />}
                  </Box>
                </HStack>
              );
            })
          ) : (
            <Text color="var(--app-muted)" fontSize="sm" py={6} textAlign="center">
              {search
                ? `Tidak ada pengikut yang cocok dengan "${search}"`
                : "Belum ada pengikut."}
            </Text>
          )}
        </Box>
      </Box>

      <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={2}>
        &copy; 2026 Lentera
      </Text>

      {/* Kotak bawah: Pengaturan disimpan */}
      {showSaved && (
        <Box
          position="fixed"
          bottom="24px"
          left="50%"
          transform="translateX(-50%)"
          zIndex={50}
          bg="var(--app-text)"
          color="var(--app-bg)"
          borderRadius="xl"
          shadow="lg"
          px={5}
          py={3}
          fontSize="sm"
          fontWeight="semibold"
          whiteSpace="nowrap"
        >
          Pengaturan disimpan
        </Box>
      )}
    </VStack>
  );
}

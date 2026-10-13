"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Dialog,
  Spinner,
  Image,
} from "@chakra-ui/react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { BlockedUser, useBlockedUsers, useUnblockUser } from "../block.service";

export default function BlockedAccountsPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useBlockedUsers();
  const { mutate: unblock, isPending: isUnblocking } = useUnblockUser();
  const [target, setTarget] = useState<BlockedUser | null>(null);

  const users = data?.data ?? [];

  const handleConfirmUnblock = () => {
    if (!target) return;
    unblock(target.id, {
      onSuccess: () => setTarget(null),
    });
  };

  return (
    <VStack flex={1} gap={6} align="stretch">
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
            Akun yang diblokir
          </Heading>
        </HStack>

        <Text mt={4} fontSize="sm" color="var(--app-muted)">
          Anda bisa memblokir orang-orang kapan saja dari profil mereka.
        </Text>

        {/* Daftar akun ke bawah */}
        <Box mt={2}>
          {isLoading ? (
            <HStack justify="center" py={10} gap={3}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color="var(--app-muted)">
                Memuat akun yang diblokir...
              </Text>
            </HStack>
          ) : isError ? (
            <VStack py={8} gap={3}>
              <Text color="var(--app-muted)" fontSize="sm" textAlign="center">
                Gagal memuat daftar blokir.
              </Text>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Coba lagi
              </Button>
            </VStack>
          ) : users.length ? (
            users.map((u) => (
              <HStack
                key={u.id}
                gap={3}
                align="center"
                py={4}
                borderBottomWidth="1px"
                borderColor="var(--app-border)"
                _last={{ borderBottomWidth: 0 }}
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

                {/* Username atas + nama lengkap bawah */}
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

                {/* Tombol kanan */}
                <Button
                  size="sm"
                  borderRadius="lg"
                  variant="outline"
                  borderColor="var(--app-border)"
                  color="var(--app-text)"
                  _hover={{ bg: "var(--app-hover)" }}
                  onClick={() => setTarget(u)}
                >
                  Berhenti blokir
                </Button>
              </HStack>
            ))
          ) : (
            <Text color="var(--app-muted)" fontSize="sm" py={6} textAlign="center">
              Belum ada akun yang diblokir.
            </Text>
          )}
        </Box>
      </Box>

      <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={2}>
        &copy; 2026 Lentera
      </Text>

      {/* Modal tengah: konfirmasi buka blokir */}
      <Dialog.Root
        open={!!target}
        onOpenChange={(e) => {
          if (!e.open) setTarget(null);
        }}
        placement="center"
        size="sm"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="var(--app-card)"
            color="var(--app-text)"
            borderRadius="xl"
            overflow="hidden"
            p={6}
          >
            <VStack gap={3} align="stretch" textAlign="center">
              <Dialog.Title fontWeight="bold" fontSize="lg">
                Buka blokir {target?.username}?
              </Dialog.Title>
              <Text fontSize="sm" color="var(--app-secondary)">
                {target?.username} sekarang bisa melihat postingan Anda,
                mengikuti, dan mengirim pesan kepada Anda di Instagram. Dia
                tidak akan diberi tahu bahwa Anda membuka blokirnya.
              </Text>

              <VStack gap={2} mt={3} align="stretch">
                <Button
                  w="full"
                  borderRadius="lg"
                  colorPalette="blue"
                  loading={isUnblocking}
                  onClick={handleConfirmUnblock}
                >
                  Berhenti blokir
                </Button>
                <Button
                  w="full"
                  borderRadius="lg"
                  variant="ghost"
                  color="var(--app-text)"
                  _hover={{ bg: "var(--app-hover)" }}
                  onClick={() => setTarget(null)}
                >
                  Batal
                </Button>
              </VStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </VStack>
  );
}

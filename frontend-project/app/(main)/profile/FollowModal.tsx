"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Flex,
  Image,
  Spinner,
  Dialog,
  Input,
  InputGroup,
  IconButton,
} from "@chakra-ui/react";
import { useState } from "react";
import { X, Search } from "lucide-react";
import NextLink from "next/link";
import { useGetFollowers, useGetFollowing } from "./followList.service";

export function FollowModal({
  open,
  type,
  userId,
  onClose,
}: {
  open: boolean;
  type: "followers" | "following";
  userId: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const isFollowers = type === "followers";

  const { data: followersData, isLoading: isLoadingFollowers } = useGetFollowers(
    userId,
    search,
    open && isFollowers
  );
  const { data: followingData, isLoading: isLoadingFollowing } = useGetFollowing(
    userId,
    search,
    open && !isFollowers
  );

  const users = isFollowers
    ? followersData?.data ?? []
    : followingData?.data ?? [];
  const isLoading = isFollowers ? isLoadingFollowers : isLoadingFollowing;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) {
          setSearch("");
          onClose();
        }
      }}
      placement="center"
      size="sm"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="var(--app-card)" color="var(--app-text)" borderRadius="xl" overflow="hidden">
          <Dialog.Header position="relative" justifyContent="center" borderBottomWidth="1px" borderColor="var(--app-border)" py={4}>
            <IconButton
              aria-label="Tutup"
              variant="ghost"
              size="sm"
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="var(--app-text)"
              _hover={{ bg: "var(--app-subtle)" }}
              onClick={() => {
                setSearch("");
                onClose();
              }}
            >
              <X size={22} color="var(--app-text)" />
            </IconButton>
            <Dialog.Title fontWeight="bold" color="var(--app-text)">
              {isFollowers ? "Pengikut" : "Diikuti"}
            </Dialog.Title>
          </Dialog.Header>
          <Box px={4} py={3} borderBottomWidth="1px" borderColor="var(--app-subtle)">
            <InputGroup
              startElement={
                <Box color="var(--app-faint)" pointerEvents="none">
                  <Search size={14} />
                </Box>
              }
              startElementProps={{ pointerEvents: "none" }}
            >
              <Input
                placeholder="Cari akun..."
                size="sm"
                variant="subtle"
                bg="var(--app-subtle)"
                color="var(--app-text)"
                _placeholder={{ color: "var(--app-faint)" }}
                borderRadius="full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Box>
          <Dialog.Body px={2} py={2} maxH="400px" overflowY="auto">
            {isLoading ? (
              <Flex justify="center" py={8}>
                <Spinner size="sm" color="blue.500" />
              </Flex>
            ) : users.length > 0 ? (
              <VStack align="stretch" gap={1}>
                {users.map((u) => (
                  <NextLink key={u.id} href={`/profile/${u.username}`} onClick={onClose}>
                    <HStack gap={3} p={2} borderRadius="md" _hover={{ bg: "var(--app-input)" }}>
                      <Box w="40px" h="40px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)">
                        <Image
                          src={u.avatar || "/default-avatar.jpg"}
                          alt={u.name}
                          w="full"
                          h="full"
                          objectFit="cover"
                        />
                      </Box>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="medium" color="var(--app-text)" fontSize="sm">
                          {u.name}
                        </Text>
                        <Text fontSize="xs" color="var(--app-muted)">
                          @{u.username}
                        </Text>
                      </VStack>
                    </HStack>
                  </NextLink>
                ))}
              </VStack>
            ) : (
              <Text textAlign="center" color="var(--app-muted)" py={8} fontSize="sm">
                {search
                  ? `Tidak ada akun yang cocok dengan "${search}"`
                  : isFollowers
                    ? "Belum ada pengikut."
                    : "Belum mengikuti siapa pun."}
              </Text>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
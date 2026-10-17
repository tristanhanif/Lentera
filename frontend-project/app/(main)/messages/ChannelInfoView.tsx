"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  Check,
  ChevronLeft,
  Copy,
  Forward,
  Link2,
  LogOut,
  Pencil,
  Plus,
  Search,
  ThumbsDown,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import { channelAvatar } from "./channel.service";
import { uploadToCloudinary } from "@/app/lib/upload";
import type { ChatConversation } from "./chat.interface";

const MotionBox = motion(Box);

export interface ChannelInfoData {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  ownerId: string;
  followerCount: number;
  createdAt: string;
}

interface ChannelInfoViewProps {
  channel: ChannelInfoData;
  isOwner: boolean;
  isFollowing: boolean;
  isPreview?: boolean;
  joining?: boolean;
  onBack: () => void;
  onFollow: () => void;
  onUnfollow: () => void;
  onUpdateChannel: (patch: { description?: string; avatarUrl?: string | null }) => void;
  conversations: ChatConversation[];
  onForwardToDM: (conversationId: string) => void;
}

const parseAsUTC = (dateStr: string) => {
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
};

const formatDibuat = (dateStr: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).formatToParts(parseAsUTC(dateStr));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `Dibuat ${get("day")}/${get("month")}/${get("year")}`;
  } catch {
    return `Dibuat ${dateStr.slice(0, 10)}`;
  }
};

export default function ChannelInfoView({
  channel,
  isOwner,
  isFollowing,
  isPreview = false,
  joining = false,
  onBack,
  onFollow,
  onUnfollow,
  onUpdateChannel,
  conversations,
  onForwardToDM,
}: ChannelInfoViewProps) {
  const hasCustomAvatar = !!channel.avatarUrl;
  const [descExpanded, setDescExpanded] = useState(false);
  const needExpand = (channel.description || "").length > 140;
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const [unfollowConfirmOpen, setUnfollowConfirmOpen] = useState(false);
  const [reportConfirmOpen, setReportConfirmOpen] = useState(false);
  const [reportThanksOpen, setReportThanksOpen] = useState(false);

  const channelLink = () => {
    try {
      return `${window.location.origin}/messages?channel=${encodeURIComponent(channel.id)}`;
    } catch {
      return `/messages?channel=${encodeURIComponent(channel.id)}`;
    }
  };

  const handleCopyLink = async () => {
    const link = channelLink();
    try {
      await navigator.clipboard.writeText(link);
      Swal.fire({ icon: "success", title: "Link disalin", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Gagal menyalin link", timer: 1800, showConfirmButton: false });
    }
  };

  const openEditDesc = () => {
    setDescDraft(channel.description);
    setEditDescOpen(true);
  };
  const handleSaveDesc = () => {
    const v = descDraft.trim().slice(0, 500);
    if (!v) {
      Swal.fire({ icon: "warning", title: "Deskripsi tidak boleh kosong", timer: 1800, showConfirmButton: false });
      return;
    }
    onUpdateChannel({ description: v });
    setEditDescOpen(false);
  };

  const handlePickAvatar = () => {
    if (!isOwner || uploadingAvatar) return;
    avatarFileRef.current?.click();
  };
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (avatarFileRef.current) avatarFileRef.current.value = "";
    if (!file || !isOwner) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "File harus gambar", timer: 1800, showConfirmButton: false });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Maksimal 5MB ya!", timer: 1800, showConfirmButton: false });
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadToCloudinary(file);
      onUpdateChannel({ avatarUrl: url });
    } catch {
      Swal.fire({ icon: "error", title: "Gagal mengunggah logo", timer: 1800, showConfirmButton: false });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.otherUser.name.toLowerCase().includes(q) ||
      c.otherUser.username.toLowerCase().includes(q)
    );
  });

  return (
    <MotionBox
      flex={1}
      display="flex"
      flexDirection="column"
      bg="var(--app-card)"
      h="full"
      minH={0}
      position="relative"
      overflow="hidden"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {/* Header: arrow kiri + Info saluran */}
      <Flex p={4} borderBottom="1px solid" borderColor="var(--app-hover)" align="center" gap={2} flexShrink={0}>
        <IconButton
          aria-label="Kembali ke percakapan"
          variant="ghost"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)" }}
          onClick={onBack}
        >
          <ChevronLeft size={22} />
        </IconButton>
        <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
          Info saluran
        </Text>
      </Flex>

      <VStack flex={1} overflowY="auto" align="stretch" gap={0} minH={0} css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
        {/* Avatar + nama + followers */}
        <VStack px={6} pt={6} pb={2} gap={2} align="center" textAlign="center">
          <Box position="relative" mx="auto">
            <Box
              w="110px"
              h="110px"
              borderRadius="full"
              overflow="hidden"
              bg="var(--app-subtle)"
              border="1px solid"
              borderColor="var(--app-border)"
            >
              <img
                src={channelAvatar(channel.avatarUrl)}
                alt={channel.name}
                className={channel.avatarUrl ? undefined : "channel-logo-default"}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingAvatar ? 0.6 : 1 }}
              />
            </Box>
            <input ref={avatarFileRef} type="file" hidden accept="image/*" onChange={handleAvatarFile} />
            {isOwner && (
              <Box
                as="button"
                aria-label={hasCustomAvatar ? "Ubah logo saluran" : "Pasang logo saluran"}
                position="absolute"
                bottom="2px"
                right="2px"
                w="32px"
                h="32px"
                borderRadius="full"
                bg="blue.600"
                color="white"
                border="2px solid white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor={uploadingAvatar ? "wait" : "pointer"}
                _hover={{ bg: "blue.700" }}
                onClick={handlePickAvatar}
                title={hasCustomAvatar ? "Ubah logo saluran" : "Pasang logo saluran"}
              >
                {hasCustomAvatar ? <Pencil size={14} /> : <Plus size={15} strokeWidth={3} />}
              </Box>
            )}
          </Box>

          <Text fontWeight="bold" color="var(--app-text)" fontSize="lg" lineClamp={2} textAlign="center">
            {channel.name}
          </Text>
          <Text fontSize="xs" color="var(--app-muted)" fontWeight="medium">
            Saluran • {channel.followerCount} followers
          </Text>
        </VStack>

        {/* 3 buletan: Follow/Following - Forward - Copy link */}
        <Flex px={6} pt={4} pb={2} justify="center" gap={8}>
          <VStack gap={1.5} align="center">
            <Box
              as="button"
              aria-label={isFollowing ? "Sudah mengikuti" : "Ikuti saluran"}
              w="52px"
              h="52px"
              borderRadius="full"
              bg="blue.600"
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ opacity: 0.9 }}
              onClick={() => {
                if (joining) return;
                if (!isFollowing) onFollow();
              }}
              title={isFollowing ? "Following" : "Follow"}
            >
              {isFollowing ? <Check size={22} strokeWidth={3} /> : <Plus size={22} strokeWidth={3} />}
            </Box>
            <Text fontSize="xs" color="var(--app-text)" fontWeight="medium">
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </VStack>

          <VStack gap={1.5} align="center">
            <Box
              as="button"
              aria-label="Forward saluran ke chat"
              w="52px"
              h="52px"
              borderRadius="full"
              bg="var(--app-subtle)"
              border="1px solid"
              borderColor="var(--app-border)"
              color="var(--app-text)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ bg: "var(--app-hover)" }}
              onClick={() => {
                setForwardSearch("");
                setForwardOpen(true);
              }}
              title="Forward"
            >
              <Forward size={22} />
            </Box>
            <Text fontSize="xs" color="var(--app-text)" fontWeight="medium">
              Forward
            </Text>
          </VStack>

          <VStack gap={1.5} align="center">
            <Box
              as="button"
              aria-label="Copy link saluran"
              w="52px"
              h="52px"
              borderRadius="full"
              bg="var(--app-subtle)"
              border="1px solid"
              borderColor="var(--app-border)"
              color="var(--app-text)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ bg: "var(--app-hover)" }}
              onClick={handleCopyLink}
              title="Copy link"
            >
              <Link2 size={22} />
            </Box>
            <Text fontSize="xs" color="var(--app-text)" fontWeight="medium">
              Copy link
            </Text>
          </VStack>
        </Flex>

        {/* Deskripsi + pen kanan (owner) + Lebih banyak */}
        <Box px={5} py={4}>
          <Flex align="start" justify="space-between" gap={3}>
            <Text fontSize="sm" color="var(--app-text)" flex={1} minW={0} lineClamp={descExpanded ? undefined : 4} whiteSpace="pre-wrap" wordBreak="break-word">
              {channel.description}
            </Text>
            {isOwner && (
              <Box
                as="button"
                aria-label="Edit deskripsi saluran"
                w="32px"
                h="32px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="var(--app-muted)"
                cursor="pointer"
                flexShrink={0}
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                onClick={openEditDesc}
                title="Edit deskripsi"
              >
                <Pencil size={15} />
              </Box>
            )}
          </Flex>
          {needExpand && (
            <Box
              as="button"
              fontSize="sm"
              fontWeight="medium"
              color="blue.600"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              mt={1}
              onClick={() => setDescExpanded((v) => !v)}
            >
              {descExpanded ? "Lebih sedikit" : "Lebih banyak"}
            </Box>
          )}
        </Box>

        <Box px={5} pb={2}>
          <Text fontSize="xs" color="var(--app-muted)" fontWeight="medium">
            {formatDibuat(channel.createdAt)}
          </Text>
        </Box>

        {/* Unfollow / Hapus — disembunyikan untuk preview, merah semua */}
        {!isPreview && (
          <HStack
            px={5}
            py={3}
            gap={3}
            cursor="pointer"
            _hover={{ bg: "var(--app-hover)" }}
            transition="0.15s"
            onClick={() => setUnfollowConfirmOpen(true)}
          >
            <Box color="red.500" display="flex" flexShrink={0}>
              <LogOut size={20} />
            </Box>
            <Text fontSize="sm" fontWeight="semibold" color="red.500">
              {isOwner ? "Hapus Saluran" : "Unfollow Saluran"}
            </Text>
          </HStack>
        )}

        {/* Report — merah semua */}
        <HStack
          px={5}
          py={3}
          gap={3}
          cursor="pointer"
          _hover={{ bg: "var(--app-hover)" }}
          transition="0.15s"
          onClick={() => setReportConfirmOpen(true)}
        >
          <Box color="red.500" display="flex" flexShrink={0}>
            <ThumbsDown size={20} />
          </Box>
          <Text fontSize="sm" fontWeight="semibold" color="red.500">
            Report Saluran
          </Text>
        </HStack>
        <Box h={6} flexShrink={0} />
      </VStack>

      {/* Modal edit deskripsi */}
      <AnimatePresence>
        {editDescOpen && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setEditDescOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={5} w="360px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Text fontSize="md" fontWeight="bold" color="var(--app-text)" mb={3}>
                Edit deskripsi saluran
              </Text>
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value.slice(0, 500))}
                placeholder="Deskripsi Saluran"
                fontSize="sm"
                color="var(--app-text)"
                bg="var(--app-input)"
                border="1px solid"
                borderColor="var(--app-border)"
                borderRadius="lg"
                minH="100px"
                resize="none"
                maxLength={500}
                autoFocus
              />
              <Text fontSize="xs" color="var(--app-faint)" textAlign="right" mt={1}>
                {descDraft.length}/500
              </Text>
              <Flex justify="flex-end" gap={2} mt={4}>
                <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setEditDescOpen(false)}>
                  Batal
                </Button>
                <Button borderRadius="lg" size="sm" bg="blue.600" color="white" _hover={{ bg: "blue.700" }} onClick={handleSaveDesc}>
                  Simpan
                </Button>
              </Flex>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Modal Forward ke chat DM */}
      <AnimatePresence>
        {forwardOpen && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setForwardOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" w="400px" maxW="calc(100% - 48px)" maxH="80%" display="flex" flexDirection="column" overflow="hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Flex p={4} borderBottom="1px solid" borderColor="var(--app-hover)" align="center" gap={2} flexShrink={0}>
                <Text fontWeight="bold" color="var(--app-text)" fontSize="md" flex={1}>
                  Forward ke chat
                </Text>
                <Box as="button" aria-label="Tutup forward" color="var(--app-muted)" _hover={{ color: "var(--app-text)" }} onClick={() => setForwardOpen(false)} fontSize="sm" fontWeight="bold" px={2}>
                  Tutup
                </Box>
              </Flex>
              <Box p={4} pb={2} flexShrink={0}>
                <HStack bg="var(--app-input)" border="1px solid" borderColor="var(--app-border)" borderRadius="xl" px={3} py={1}>
                  <Search size={16} color="var(--app-faint)" />
                  <Input
                    value={forwardSearch}
                    onChange={(e) => setForwardSearch(e.target.value)}
                    placeholder="Cari obrolan..."
                    fontSize="sm"
                    color="var(--app-text)"
                    border="none"
                    bg="transparent"
                    p={0}
                    h="36px"
                    _placeholder={{ color: "var(--app-faint)" }}
                    _focus={{ boxShadow: "none" }}
                  />
                </HStack>
              </Box>
              <VStack flex={1} overflowY="auto" px={4} py={2} gap={1} align="stretch" minH={0} css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
                {filteredConversations.length === 0 ? (
                  <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={6}>
                    Belum ada percakapan
                  </Text>
                ) : (
                  filteredConversations.map((c) => (
                    <HStack
                      key={c.id}
                      gap={3}
                      p={2.5}
                      borderRadius="xl"
                      cursor="pointer"
                      _hover={{ bg: "var(--app-hover)" }}
                      transition="0.15s"
                      onClick={() => {
                        setForwardOpen(false);
                        onForwardToDM(c.id);
                      }}
                    >
                      <Box w="40px" h="40px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" flexShrink={0}>
                        <img src={c.otherUser.avatar || "/default-avatar.jpg"} alt={c.otherUser.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </Box>
                      <VStack align="start" gap={0} flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" truncate w="full">
                          {c.otherUser.name}
                        </Text>
                        <Text fontSize="xs" color="var(--app-muted)" truncate w="full">
                          @{c.otherUser.username}
                        </Text>
                      </VStack>
                      <Box color="var(--app-muted)" display="flex" flexShrink={0}>
                        <Forward size={16} />
                      </Box>
                    </HStack>
                  ))
                )}
              </VStack>
              <Box p={4} borderTop="1px solid" borderColor="var(--app-hover)" flexShrink={0}>
                <HStack gap={2}>
                  <Box color="var(--app-muted)" display="flex">
                    <Copy size={15} />
                  </Box>
                  <Text fontSize="xs" color="var(--app-muted)" flex={1} truncate>
                    {channelLink()}
                  </Text>
                </HStack>
              </Box>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Konfirmasi Unfollow / Hapus: tengah halaman Info */}
      <AnimatePresence>
        {unfollowConfirmOpen && (
          <Box position="absolute" inset={0} zIndex={40} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setUnfollowConfirmOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={6} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <VStack gap={2} align="center" textAlign="center">
                <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)">
                  <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} className={channel.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Text fontSize="md" fontWeight="bold" color="var(--app-text)" lineClamp={1} w="full">
                  {channel.name}
                </Text>
                <Text fontSize="sm" color="var(--app-text)">
                  {isOwner ? `Ingin hapus saluran ${channel.name}?` : `Ingin unfollow saluran ${channel.name}?`}
                </Text>
                <Flex justify="flex-end" gap={2} w="full" pt={3}>
                  <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setUnfollowConfirmOpen(false)}>
                    Tidak
                  </Button>
                  <Button
                    borderRadius="lg"
                    size="sm"
                    bg="red.500"
                    color="white"
                    _hover={{ bg: "red.600" }}
                    onClick={() => {
                      setUnfollowConfirmOpen(false);
                      onUnfollow();
                    }}
                  >
                    {isOwner ? "Ya, hapus" : "Ya, unfollow"}
                  </Button>
                </Flex>
              </VStack>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Konfirmasi Report: tengah halaman Info */}
      <AnimatePresence>
        {reportConfirmOpen && (
          <Box position="absolute" inset={0} zIndex={40} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setReportConfirmOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={6} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <VStack gap={2} align="center" textAlign="center">
                <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)">
                  <img src={channelAvatar(channel.avatarUrl)} alt={channel.name} className={channel.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Text fontSize="md" fontWeight="bold" color="var(--app-text)" lineClamp={1} w="full">
                  {channel.name}
                </Text>
                <Text fontSize="sm" color="var(--app-text)">
                  {`Ingin report saluran ${channel.name}?`}
                </Text>
                <Flex justify="flex-end" gap={2} w="full" pt={3}>
                  <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setReportConfirmOpen(false)}>
                    Tidak
                  </Button>
                  <Button
                    borderRadius="lg"
                    size="sm"
                    bg="red.500"
                    color="white"
                    _hover={{ bg: "red.600" }}
                    onClick={() => {
                      setReportConfirmOpen(false);
                      setReportThanksOpen(true);
                      window.setTimeout(() => setReportThanksOpen(false), 4000);
                    }}
                  >
                    Ya, report
                  </Button>
                </Flex>
              </VStack>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Kotak terima kasih report: kanan halaman */}
      <AnimatePresence>
        {reportThanksOpen && (
          <MotionBox
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            position="absolute"
            right={4}
            top="50%"
            zIndex={45}
            bg="var(--app-card)"
            border="1px solid"
            borderColor="var(--app-border)"
            borderRadius="xl"
            shadow="xl"
            p={4}
            w="300px"
            maxW="calc(100% - 32px)"
          >
            <Text fontSize="sm" color="var(--app-text)" lineHeight="1.5">
              {`Terimakasih sudah report saluran ${channel.name}. Kami akan tindaki lebih lanjut`}
            </Text>
            <Flex justify="flex-end" mt={3}>
              <Button size="xs" borderRadius="full" variant="ghost" color="var(--app-muted)" _hover={{ bg: "var(--app-hover)", color: "var(--app-text)" }} onClick={() => setReportThanksOpen(false)}>
                Tutup
              </Button>
            </Flex>
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  );
}

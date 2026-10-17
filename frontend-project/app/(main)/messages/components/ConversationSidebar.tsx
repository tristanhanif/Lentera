"use client";
import { Box, VStack, HStack, Text, Heading, Input, Button, Badge, Spinner, Flex } from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, CheckCheck, Sparkles } from "lucide-react";
import Swal from "sweetalert2";
import type { ChatConversation } from "../chat.interface";
import { channelAvatar } from "../channel.service";
import { communityAvatar, type Community } from "../community.store";
import { formatVoiceDuration } from "../channel.service";
import { formatBadge4, voicePreviewLabel } from "../utils/chat-helpers";
import { formatWIBTime } from "../utils/chat-time";
import { TERA_CONVERSATION_ID } from "../tera.service";

export type SidebarFilter = "pesan" | "komunitas" | "saluran";

interface ConversationSidebarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeFilter: SidebarFilter;
  setActiveFilter: (v: SidebarFilter) => void;
  unreadCommunityCount: number;
  unreadChannelCount: number;
  conversations: ChatConversation[];
  filteredConversations: ChatConversation[];
  loadingConversations: boolean;
  selectedConversation: string | null;
  currentUserId: string;
  showTeraRow: boolean;
  teraLastText: string;
  onSelectConversation: (id: string) => void;
  backendCommunities: any[];
  exploreCommunities: any[];
  communities: Community[];
  selectedCommunityId: string | null;
  communityCreateOpen: boolean;
  joinCommunityPending: boolean;
  onOpenCommunity: (id: string) => void;
  onJoinAndOpenCommunity: (id: string) => void;
  backendChannels: any[];
  exploreChannels: any[];
  selectedChannelId: string | null;
  channelCreateOpen: boolean;
  followChannelPending: boolean;
  onOpenChannel: (id: string) => void;
  onFollowAndOpenChannel: (id: string) => void;
  onCreateCommunity: () => void;
  onCreateChannel: () => void;
  joinedPaneH: number;
  setJoinedPaneH: (h: number) => void;
  sashDragRef: React.MutableRefObject<{ startY: number; startH: number } | null>;
  // Setter + mutasi mentah biar blok pindahan (verbatim dari page.tsx) tetap jalan
  // tanpa ubah isi dalamnya.
  setSelectedConversation: (v: string | null) => void;
  setOwnNoteView: (v: null | "detail" | "editor") => void;
  setCommunityCreateOpen: (v: boolean) => void;
  setSelectedCommunityId: (v: string | null) => void;
  setChannelCreateOpen: (v: boolean) => void;
  setSelectedChannelId: (v: string | null) => void;
  joinCommunityMutation: any;
  followChannelMutation: any;
}

const COMMUNITY_ITEM_H = 80;
const COMMUNITY_MIN_H = COMMUNITY_ITEM_H * 2;
const COMMUNITY_MAX_H = COMMUNITY_ITEM_H * 4;

export default function ConversationSidebar(props: ConversationSidebarProps) {
  const {
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    unreadCommunityCount,
    unreadChannelCount,
    conversations,
    filteredConversations,
    loadingConversations,
    selectedConversation,
    currentUserId,
    showTeraRow,
    teraLastText,
    onSelectConversation,
    backendCommunities,
    exploreCommunities,
    communities,
    selectedCommunityId,
    communityCreateOpen,
    joinCommunityPending,
    onOpenCommunity,
    onJoinAndOpenCommunity,
    backendChannels,
    exploreChannels,
    selectedChannelId,
    channelCreateOpen,
    followChannelPending,
    onOpenChannel,
    onFollowAndOpenChannel,
    onCreateCommunity,
    onCreateChannel,
    joinedPaneH,
    setJoinedPaneH,
    sashDragRef,
    setSelectedConversation,
    setOwnNoteView,
    setCommunityCreateOpen,
    setSelectedCommunityId,
    setChannelCreateOpen,
    setSelectedChannelId,
    joinCommunityMutation: joinMutationProp,
    followChannelMutation: followMutationProp,
  } = props;

  // Alias biar blok verbatim (yang masih manggil handleSelectConversation) tetap jalan.
  const handleSelectConversation = onSelectConversation;
  // Mutasi asli (biar .mutate + .isPending di dalam blok tetap jalan).
  // Kalau parent ngirim any, pakai itu; fallback ke {isPending} biar tidak crash.
  const joinCommunityMutation = joinMutationProp ?? ({ isPending: joinCommunityPending } as any);
  const followChannelMutation = followMutationProp ?? ({ isPending: followChannelPending } as any);
  // Blok verbatim di bawah juga mendefinisikan openCommunity/openChannel sendiri
  // (shadowing, boleh) — wrapper ini hanya fallback kalau blok tidak mendefinisikan.
  const openCommunityFallback = (id: string) => onOpenCommunity(id);
  const joinAndOpenCommunityFallback = (id: string) => onJoinAndOpenCommunity(id);
  const openChannelFallback = (id: string) => onOpenChannel(id);
  const followAndOpenChannelFallback = (id: string) => onFollowAndOpenChannel(id);
  void openCommunityFallback;
  void joinAndOpenCommunityFallback;
  void openChannelFallback;
  void followAndOpenChannelFallback;
  void conversations;
  void communityCreateOpen;
  void channelCreateOpen;
  void onCreateCommunity;
  void onCreateChannel;

  return (
<VStack
          w="420px"
          flexShrink={0}
          borderRight="2px solid"
          borderColor="var(--app-hover)"
          align="stretch"
          gap={0}
        >
          <Box p={5} pb={4}>
            <HStack bg="var(--app-hover)" px={5} py={3} borderRadius="2xl" w="full">
              <Search size={20} color="var(--app-text)" />
              <Input
                placeholder={
                  activeFilter === "komunitas"
                    ? "Cari komunitas..."
                    : activeFilter === "saluran"
                      ? "Cari saluran..."
                      : "Cari pesan..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fontSize="md"
                color="var(--app-text)"
                border="none"
                outline="none"
                bg="transparent"
                boxShadow="none"
                p={0}
                h="auto"
                _placeholder={{ color: "var(--app-text)" }}
                _focus={{ border: "none", outline: "none", boxShadow: "none" }}
              />
            </HStack>
          </Box>
          {/* Garis panjang abu-abu: di bawah kotak pencarian, di atas filter */}
          <Box h="1px" w="full" bg="var(--app-border)" flexShrink={0} />
          {/* Filter tengah: Pesan / Komunitas / Saluran, kotak radius (pill).
              Aktif: bg var(--app-text) + tulisan var(--app-card) → otomatis
              dark = kotak putih tulisan hitam, light = kotak hitam tulisan putih.
              Non-aktif: transparan + tulisan muted. */}
          <HStack px={5} pt={3} gap={2} flexShrink={0}>
            {(
              [
                { key: "pesan", label: "Pesan" },
                { key: "komunitas", label: "Komunitas" },
                { key: "saluran", label: "Saluran" },
              ] as const
            ).map((f) => {
              const isActive = activeFilter === f.key;
              const badgeCount =
                f.key === "komunitas"
                  ? unreadCommunityCount
                  : f.key === "saluran"
                    ? unreadChannelCount
                    : 0;
              const showFilterBadge = badgeCount > 0;
              return (
                <Box
                  key={f.key}
                  as="button"
                  px={4}
                  py={1.5}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="bold"
                  cursor="pointer"
                  border="1px solid"
                  position="relative"
                  borderColor={
                    isActive ? "var(--app-text)" : "var(--app-border)"
                  }
                  bg={isActive ? "var(--app-text)" : "transparent"}
                  color={
                    isActive ? "var(--app-card)" : "var(--app-muted)"
                  }
                  _hover={
                    isActive
                      ? { opacity: 0.9 }
                      : { bg: "var(--app-hover)", color: "var(--app-text)" }
                  }
                  transition="0.15s"
                  onClick={() => setActiveFilter(f.key)}
                >
                  {f.label}
                  {showFilterBadge && (
                    <Box
                      position="absolute"
                      top="-8px"
                      right="-6px"
                      minW="20px"
                      h="20px"
                      px="5px"
                      borderRadius="full"
                      bg="red.500"
                      color="white"
                      fontSize="11px"
                      fontWeight="bold"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      border="2px solid var(--app-card)"
                      lineHeight={1}
                    >
                      {formatBadge4(badgeCount)}
                    </Box>
                  )}
                </Box>
              );
            })}
          </HStack>
          <Flex px={5} pt={3} pb={3} justify="space-between" align="center">
            <Heading size="xl" color="var(--app-text)">
              {activeFilter === "pesan"
                ? "Pesan"
                : activeFilter === "komunitas"
                  ? "Komunitas"
                  : "Saluran"}
            </Heading>
            {/* Buletan plus border-only di kanan heading, hanya untuk
                Komunitas & Saluran. Komunitas → buka form Buat Komunitas
                di panel kanan, Saluran → buka form Buat Saluran.
                border + icon pakai var(--app-text) biar otomatis:
                dark = putih, light = hitam. */}
            {activeFilter !== "pesan" && (
              <Box
                as="button"
                w="32px"
                h="32px"
                borderRadius="full"
                border="1px solid"
                borderColor="var(--app-text)"
                bg="transparent"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="var(--app-text)"
                cursor="pointer"
                flexShrink={0}
                aria-label={
                  activeFilter === "komunitas"
                    ? "Buat komunitas"
                    : "Buat saluran"
                }
                title={
                  activeFilter === "komunitas"
                    ? "Buat komunitas"
                    : "Buat saluran"
                }
                _hover={{ bg: "var(--app-hover)" }}
                transition="0.15s"
                onClick={() => {
                  setSelectedConversation(null);
                  setOwnNoteView(null);
                  if (activeFilter === "komunitas") {
                    setSelectedCommunityId(null);
                    setCommunityCreateOpen(true);
                    setSelectedChannelId(null);
                    setChannelCreateOpen(false);
                  } else if (activeFilter === "saluran") {
                    setSelectedChannelId(null);
                    setChannelCreateOpen(true);
                    setSelectedCommunityId(null);
                    setCommunityCreateOpen(false);
                  }
                }}
              >
                <Plus size={16} />
              </Box>
            )}
          </Flex>

          <Box
            flex={1}
            minH={0}
            display={activeFilter === "pesan" ? "block" : "flex"}
            flexDirection={activeFilter === "pesan" ? undefined : "column"}
            overflowY={activeFilter === "pesan" ? "auto" : "hidden"}
            css={{
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": {
                background: "#cbd5e1",
                borderRadius: "10px",
              },
            }}
          >
            {loadingConversations && activeFilter === "pesan" ? (
              <Flex justify="center" py={8}>
                <Spinner size="md" color="blue.500" />
              </Flex>
            ) : activeFilter === "komunitas" ? (
              (() => {
                const q = searchQuery.trim().toLowerCase();
                const matchQ = (name: string, desc: string) =>
                  !q ||
                  name.toLowerCase().includes(q) ||
                  desc.toLowerCase().includes(q);
                const backendList = backendCommunities.filter((c) =>
                  matchQ(c.name, c.description),
                );
                const backendIds = new Set(backendCommunities.map((c) => c.id));
                const backendNames = new Set(
                  backendList.map((c) => c.name.trim().toLowerCase()),
                );
                const localList = communities.filter(
                  (c) =>
                    matchQ(c.name, c.description) &&
                    !backendNames.has(c.name.trim().toLowerCase()),
                );
                // Saran Komunitas: selalu tampil di bawah garis panjang,
                // di bawah komunitas yang sudah Gabung.
                // Isinya komunitas explore yang belum jadi anggota (belum Gabung),
                // ikut filter pencarian kalau ada ketikan.
                const suggestionList = exploreCommunities.filter(
                  (c) =>
                    !backendIds.has(c.id) &&
                    !c.isMember &&
                    matchQ(c.name, c.description),
                );
                if (backendList.length === 0 && localList.length === 0 && suggestionList.length === 0) {
                  return (
                    <VStack py={8} px={4}>
                      <Text color="var(--app-text)" fontSize="sm" textAlign="center">
                        {searchQuery ? "Tidak ada komunitas yang cocok" : "Belum ada komunitas"}
                      </Text>
                    </VStack>
                  );
                }
                const totalJoinedCount = backendList.length + localList.length;
                const openCommunity = (id: string) => {
                  setSelectedConversation(null);
                  setOwnNoteView(null);
                  setCommunityCreateOpen(false);
                  setSelectedCommunityId(id);
                  setChannelCreateOpen(false);
                  setSelectedChannelId(null);
                };
                const joinAndOpenCommunity = (id: string) => {
                  joinCommunityMutation.mutate(id, {
                    onSuccess: () => openCommunity(id),
                    onError: (err: unknown) => {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                        "Gagal bergabung ke komunitas";
                      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                    },
                  });
                };
                return (
                  <Flex direction="column" h="full" minH={0} flex={1} overflow="hidden">
                    {/* ATAS: komunitas yang sudah Gabung.
                        Tingginya = joinedPaneH, bisa digeser via garis.
                        Batas 160px (2 komunitas) - 320px (4 komunitas). */}
                    <Box
                      h={totalJoinedCount === 0 ? "auto" : `${joinedPaneH}px`}
                      flexShrink={0}
                      overflowY="auto"
                      css={{
                        "&::-webkit-scrollbar": { width: "4px" },
                        "&::-webkit-scrollbar-thumb": {
                          background: "#cbd5e1",
                          borderRadius: "10px",
                        },
                      }}
                    >
                      {totalJoinedCount === 0 ? (
                        <VStack py={8} px={4}>
                          <Text color="var(--app-text)" fontSize="sm" textAlign="center">
                            {searchQuery ? "Tidak ada komunitas yang cocok" : "Belum ada komunitas"}
                          </Text>
                        </VStack>
                      ) : (
                        <>
                          {backendList.map((c) => {
                            const isActive = selectedCommunityId === c.id && !communityCreateOpen;
                            const unread = c.unreadCount ?? 0;
                            return (
                              <HStack
                                key={c.id}
                                px={5}
                                py={4}
                                gap={4}
                                cursor="pointer"
                                bg={isActive ? "var(--app-hover)" : "transparent"}
                                _hover={{ bg: "var(--app-hover)" }}
                                transition="0.2s"
                                onClick={() => openCommunity(c.id)}
                              >
                                <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={communityAvatar(c.avatarUrl)} alt={c.name} className={c.avatarUrl ? undefined : "community-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </Box>
                                <VStack align="start" gap={0} flex={1} overflow="hidden">
                                  <Text fontWeight="bold" color="var(--app-text)" fontSize="sm" truncate w="full">
                                    {c.name}
                                  </Text>
                                  <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                                    {c.lastMessage ? c.lastMessage.text : c.description}
                                  </Text>
                                </VStack>
                                {unread > 0 && (
                                  <Box
                                    minW="22px"
                                    h="22px"
                                    px="6px"
                                    borderRadius="full"
                                    bg="red.500"
                                    color="white"
                                    fontSize="12px"
                                    fontWeight="bold"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink={0}
                                  >
                                    {formatBadge4(unread)}
                                  </Box>
                                )}
                              </HStack>
                            );
                          })}
                          {localList.map((c) => {
                            const last = c.messages[c.messages.length - 1];
                            const isActive = selectedCommunityId === c.id && !communityCreateOpen;
                            return (
                              <HStack
                                key={c.id}
                                px={5}
                                py={4}
                                gap={4}
                                cursor="pointer"
                                bg={isActive ? "var(--app-hover)" : "transparent"}
                                _hover={{ bg: "var(--app-hover)" }}
                                transition="0.2s"
                                onClick={() => {
                                  setSelectedConversation(null);
                                  setOwnNoteView(null);
                                  setCommunityCreateOpen(false);
                                  setSelectedCommunityId(c.id);
                                }}
                              >
                                <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={communityAvatar(c.avatarUrl)} alt={c.name} className={c.avatarUrl ? undefined : "community-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </Box>
                                <VStack align="start" gap={0} flex={1} overflow="hidden">
                                  <Text fontWeight="bold" color="var(--app-text)" fontSize="sm" truncate w="full">
                                    {c.name}
                                  </Text>
                                  <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                                    {last ? last.text : c.description}
                                  </Text>
                                </VStack>
                              </HStack>
                            );
                          })}
                        </>
                      )}
                    </Box>
                    {suggestionList.length > 0 && (
                      <>
                        {/* Garis panjang draggable ala VS Code Extensions:
                            geser ke atas = min 2 komunitas Gabung,
                            geser ke bawah = max 4 komunitas Gabung. */}
                        <Box
                          px={0}
                          py={2}
                          cursor="ns-resize"
                          flexShrink={0}
                          title="Geser ke atas / bawah (min 2, max 4 komunitas)"
                          aria-label="Geser pembatas komunitas"
                          _hover={{ "& > div": { bg: "blue.400" } }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            sashDragRef.current = { startY: e.clientY, startH: joinedPaneH };
                            const onMove = (ev: MouseEvent) => {
                              if (!sashDragRef.current) return;
                              const dy = ev.clientY - sashDragRef.current.startY;
                              const next = sashDragRef.current.startH + dy;
                              setJoinedPaneH(
                                Math.min(COMMUNITY_MAX_H, Math.max(COMMUNITY_MIN_H, next)),
                              );
                            };
                            const onUp = () => {
                              sashDragRef.current = null;
                              window.removeEventListener("mousemove", onMove);
                              window.removeEventListener("mouseup", onUp);
                            };
                            window.addEventListener("mousemove", onMove);
                            window.addEventListener("mouseup", onUp);
                          }}
                          onTouchStart={(e) => {
                            const t = e.touches[0];
                            if (!t) return;
                            sashDragRef.current = { startY: t.clientY, startH: joinedPaneH };
                            const onMove = (ev: TouchEvent) => {
                              if (!sashDragRef.current) return;
                              const tt = ev.touches[0];
                              if (!tt) return;
                              const dy = tt.clientY - (sashDragRef.current?.startY ?? tt.clientY);
                              const next = (sashDragRef.current?.startH ?? joinedPaneH) + dy;
                              setJoinedPaneH(
                                Math.min(COMMUNITY_MAX_H, Math.max(COMMUNITY_MIN_H, next)),
                              );
                            };
                            const onEnd = () => {
                              sashDragRef.current = null;
                              window.removeEventListener("touchmove", onMove);
                              window.removeEventListener("touchend", onEnd);
                            };
                            window.addEventListener("touchmove", onMove);
                            window.addEventListener("touchend", onEnd);
                          }}
                        >
                          <Box h="1px" w="full" bg="var(--app-border)" transition="0.15s" />
                        </Box>
                        {/* BAWAH: Saran Komunitas */}
                        <Box
                          flex={1}
                          minH={0}
                          overflowY="auto"
                          css={{
                            "&::-webkit-scrollbar": { width: "4px" },
                            "&::-webkit-scrollbar-thumb": {
                              background: "#cbd5e1",
                              borderRadius: "10px",
                            },
                          }}
                        >
                          <Text
                            px={5}
                            pt={1}
                            pb={1}
                            fontSize="sm"
                            fontWeight="bold"
                            color="var(--app-text)"
                            textAlign="left"
                          >
                            Komunitas Populer
                          </Text>
                          {suggestionList.map((c) => (
                            <HStack
                              key={`suggest-${c.id}`}
                              px={5}
                              py={4}
                              gap={4}
                              cursor="pointer"
                              _hover={{ bg: "var(--app-hover)" }}
                              transition="0.2s"
                              onClick={() => joinAndOpenCommunity(c.id)}
                            >
                              <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={communityAvatar(c.avatarUrl)} alt={c.name} className={c.avatarUrl ? undefined : "community-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </Box>
                              <VStack align="start" gap={0} flex={1} overflow="hidden">
                                <Text fontWeight="bold" color="var(--app-text)" fontSize="sm" truncate w="full">
                                  {c.name}
                                </Text>
                                <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                                  {c.memberCount} Anggota • {c.description}
                                </Text>
                              </VStack>
                              <Button
                                size="xs"
                                borderRadius="full"
                                variant="outline"
                                colorPalette="blue"
                                flexShrink={0}
                                loading={joinCommunityMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  joinAndOpenCommunity(c.id);
                                }}
                              >
                                Gabung
                              </Button>
                            </HStack>
                          ))}
                        </Box>
                      </>
                    )}
                  </Flex>
                );
              })()
            ) : activeFilter === "saluran" ? (
              (() => {
                const q = searchQuery.trim().toLowerCase();
                const list = backendChannels.filter(
                  (c) =>
                    !q ||
                    c.name.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q),
                );
                const joinedChannelIds = new Set(backendChannels.map((c) => c.id));
                // Saran Saluran: selalu tampil di bawah garis panjang,
                // di bawah saluran yang sudah Follow.
                // Isinya explore yang belum Follow/bukan owner, ikut filter pencarian.
                const suggestionChannels = exploreChannels.filter(
                  (c) =>
                    !joinedChannelIds.has(c.id) &&
                    !c.isFollowing &&
                    !c.isOwner &&
                    (!q ||
                      c.name.toLowerCase().includes(q) ||
                      c.description.toLowerCase().includes(q)),
                );
                if (list.length === 0 && suggestionChannels.length === 0) {
                  return (
                    <VStack py={8} px={4}>
                      <Text color="var(--app-text)" fontSize="sm" textAlign="center">
                        {searchQuery ? "Tidak ada saluran yang cocok" : "Belum ada saluran"}
                      </Text>
                    </VStack>
                  );
                }
                const openChannel = (id: string) => {
                  setSelectedConversation(null);
                  setOwnNoteView(null);
                  setCommunityCreateOpen(false);
                  setSelectedCommunityId(null);
                  setChannelCreateOpen(false);
                  setSelectedChannelId(id);
                };
                const followAndOpenChannel = (id: string) => {
                  followChannelMutation.mutate(id, {
                    onSuccess: (res: { data?: { id?: string } }) => {
                      openChannel(res?.data?.id ?? id);
                    },
                    onError: (err: unknown) => {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                        "Gagal mengikuti saluran";
                      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                    },
                  });
                };
                return (
                  <Flex direction="column" h="full" minH={0} flex={1} overflow="hidden">
                    {/* ATAS: saluran yang sudah Follow, tinggi bisa digeser.
                        Batas 160px (2 saluran) - 320px (4 saluran). */}
                    <Box
                      h={list.length === 0 ? "auto" : `${joinedPaneH}px`}
                      flexShrink={0}
                      overflowY="auto"
                      css={{
                        "&::-webkit-scrollbar": { width: "4px" },
                        "&::-webkit-scrollbar-thumb": {
                          background: "#cbd5e1",
                          borderRadius: "10px",
                        },
                      }}
                    >
                      {list.length === 0 ? (
                        <VStack py={8} px={4}>
                          <Text color="var(--app-text)" fontSize="sm" textAlign="center">
                            {searchQuery ? "Tidak ada saluran yang cocok" : "Belum ada saluran"}
                          </Text>
                        </VStack>
                      ) : (
                        list.map((c) => {
                          const isActive = selectedChannelId === c.id && !channelCreateOpen;
                          const unread = c.unreadCount ?? 0;
                          const preview = c.lastMessage
                            ? c.lastMessage.kind === "voice"
                              ? `🎤 VN ${formatVoiceDuration(c.lastMessage.duration)}`
                              : c.lastMessage.text
                            : c.description;
                          return (
                            <HStack
                              key={c.id}
                              px={5}
                              py={4}
                              gap={4}
                              cursor="pointer"
                              bg={isActive ? "var(--app-hover)" : "transparent"}
                              _hover={{ bg: "var(--app-hover)" }}
                              transition="0.2s"
                              onClick={() => openChannel(c.id)}
                            >
                              <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={channelAvatar(c.avatarUrl)} alt={c.name} className={c.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </Box>
                              <VStack align="start" gap={0} flex={1} overflow="hidden">
                                <Text fontWeight="bold" color="var(--app-text)" fontSize="sm" truncate w="full">
                                  {c.name}
                                </Text>
                                <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                                  {preview}
                                </Text>
                              </VStack>
                              {unread > 0 && (
                                <Box
                                  minW="22px"
                                  h="22px"
                                  px="6px"
                                  borderRadius="full"
                                  bg="red.500"
                                  color="white"
                                  fontSize="12px"
                                  fontWeight="bold"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  flexShrink={0}
                                >
                                  {formatBadge4(unread)}
                                </Box>
                              )}
                            </HStack>
                          );
                        })
                      )}
                    </Box>
                    {suggestionChannels.length > 0 && (
                      <>
                        {/* Garis panjang draggable ala VS Code:
                            atas = min 2 saluran Follow, bawah = max 4. */}
                        <Box
                          px={0}
                          py={2}
                          cursor="ns-resize"
                          flexShrink={0}
                          title="Geser ke atas / bawah (min 2, max 4 saluran)"
                          aria-label="Geser pembatas saluran"
                          _hover={{ "& > div": { bg: "blue.400" } }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            sashDragRef.current = { startY: e.clientY, startH: joinedPaneH };
                            const onMove = (ev: MouseEvent) => {
                              if (!sashDragRef.current) return;
                              const dy = ev.clientY - sashDragRef.current.startY;
                              const next = sashDragRef.current.startH + dy;
                              setJoinedPaneH(
                                Math.min(COMMUNITY_MAX_H, Math.max(COMMUNITY_MIN_H, next)),
                              );
                            };
                            const onUp = () => {
                              sashDragRef.current = null;
                              window.removeEventListener("mousemove", onMove);
                              window.removeEventListener("mouseup", onUp);
                            };
                            window.addEventListener("mousemove", onMove);
                            window.addEventListener("mouseup", onUp);
                          }}
                          onTouchStart={(e) => {
                            const t = e.touches[0];
                            if (!t) return;
                            sashDragRef.current = { startY: t.clientY, startH: joinedPaneH };
                            const onMove = (ev: TouchEvent) => {
                              if (!sashDragRef.current) return;
                              const tt = ev.touches[0];
                              if (!tt) return;
                              const dy = tt.clientY - (sashDragRef.current?.startY ?? tt.clientY);
                              const next = (sashDragRef.current?.startH ?? joinedPaneH) + dy;
                              setJoinedPaneH(
                                Math.min(COMMUNITY_MAX_H, Math.max(COMMUNITY_MIN_H, next)),
                              );
                            };
                            const onEnd = () => {
                              sashDragRef.current = null;
                              window.removeEventListener("touchmove", onMove);
                              window.removeEventListener("touchend", onEnd);
                            };
                            window.addEventListener("touchmove", onMove);
                            window.addEventListener("touchend", onEnd);
                          }}
                        >
                          <Box h="1px" w="full" bg="var(--app-border)" transition="0.15s" />
                        </Box>
                        <Box
                          flex={1}
                          minH={0}
                          overflowY="auto"
                          css={{
                            "&::-webkit-scrollbar": { width: "4px" },
                            "&::-webkit-scrollbar-thumb": {
                              background: "#cbd5e1",
                              borderRadius: "10px",
                            },
                          }}
                        >
                          <Text
                            px={5}
                            pt={1}
                            pb={1}
                            fontSize="sm"
                            fontWeight="bold"
                            color="var(--app-text)"
                            textAlign="left"
                          >
                            Saluran Populer
                          </Text>
                          {suggestionChannels.map((c) => (
                            <HStack
                              key={`suggest-channel-${c.id}`}
                              px={5}
                              py={4}
                              gap={4}
                              cursor="pointer"
                              _hover={{ bg: "var(--app-hover)" }}
                              transition="0.2s"
                              onClick={() => openChannel(c.id)}
                            >
                              <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={channelAvatar(c.avatarUrl)} alt={c.name} className={c.avatarUrl ? undefined : "channel-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </Box>
                              <VStack align="start" gap={0} flex={1} overflow="hidden">
                                <Text fontWeight="bold" color="var(--app-text)" fontSize="sm" truncate w="full">
                                  {c.name}
                                </Text>
                                <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                                  {c.followerCount} followers • {c.description}
                                </Text>
                              </VStack>
                              <Button
                                size="xs"
                                borderRadius="full"
                                variant="outline"
                                colorPalette="blue"
                                flexShrink={0}
                                loading={followChannelMutation.isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  followAndOpenChannel(c.id);
                                }}
                              >
                                Follow
                              </Button>
                            </HStack>
                          ))}
                        </Box>
                      </>
                    )}
                  </Flex>
                );
              })()
            ) : filteredConversations.length === 0 && !showTeraRow ? (
              <VStack py={8} px={4}>
                <Text color="var(--app-text)" fontSize="sm" textAlign="center">
                  {searchQuery
                    ? "Tidak ada percakapan yang cocok"
                    : "Belum ada percakapan"}
                </Text>
              </VStack>
            ) : (
              <>
                {showTeraRow && activeFilter === "pesan" && (
                  <HStack
                    px={5}
                    py={4}
                    gap={4}
                    cursor="pointer"
                    bg={
                      selectedConversation === TERA_CONVERSATION_ID
                        ? "var(--app-hover)"
                        : "transparent"
                    }
                    _hover={{ bg: "var(--app-hover)" }}
                    transition="0.2s"
                    onClick={() => {
                      handleSelectConversation(TERA_CONVERSATION_ID);
                    }}
                  >
                    <Box
                      w="48px"
                      h="48px"
                      borderRadius="full"
                      bg="blue.600"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Sparkles size={24} color="white" />
                    </Box>
                    <VStack align="start" gap={0} flex={1} overflow="hidden">
                      <Flex justify="space-between" w="full">
                        <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                          Tera AI
                        </Text>
                      </Flex>
                      <Flex justify="space-between" w="full" align="center">
                        <Text
                          fontSize="xs"
                          color="var(--app-text)"
                          fontWeight="medium"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          flex={1}
                        >
                          {teraLastText}
                        </Text>
                      </Flex>
                    </VStack>
                  </HStack>
                )}
                {filteredConversations.map((conv) => (
                <HStack
                  key={conv.id}
                  px={5}
                  py={4}
                  gap={4}
                  cursor="pointer"
                  bg={selectedConversation === conv.id ? "var(--app-hover)" : "transparent"}
                  _hover={{ bg: "var(--app-hover)" }}
                  transition="0.2s"
                  onClick={() => {
                    handleSelectConversation(conv.id);
                  }}
                >
                  <Avatar size="lg">
                    <AvatarImage src={conv.otherUser.avatar || "/default-avatar.jpg"} />
                    <AvatarFallback>{conv.otherUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <VStack align="start" gap={0} flex={1} overflow="hidden">
                    <Flex justify="space-between" w="full">
                      <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                        {conv.otherUser.name}
                      </Text>
                      {conv.lastMessage && (
                        <Text fontSize="xs" color="var(--app-text)" fontWeight="bold">
                          {formatWIBTime(conv.lastMessage.createdAt)}
                        </Text>
                      )}
                    </Flex>
                    <Flex justify="space-between" w="full" align="center">
                      <Flex align="center" gap={1} flex={1} mr={2} overflow="hidden">
                        {conv.lastMessage?.senderId === currentUserId && (
                          <Box flexShrink={0}>
                            <CheckCheck
                              size={13}
                              color={
                                conv.lastMessage.isRead ? "#2563eb" : "#94a3b8"
                              }
                            />
                          </Box>
                        )}
                        <Text
                          fontSize="xs"
                          color="var(--app-text)"
                          fontWeight={conv.unreadCount > 0 ? "bold" : "medium"}
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          flex={1}
                        >
                          {conv.lastMessage
                            ? conv.lastMessage.senderId === currentUserId
                              ? `Anda: ${voicePreviewLabel(conv.lastMessage)}`
                              : voicePreviewLabel(conv.lastMessage)
                            : "Mulai percakapan"}
                        </Text>
                      </Flex>
                      {conv.unreadCount > 0 && (
                        <Badge
                          bg="blue.600"
                          color="white"
                          borderRadius="full"
                          fontSize="xs"
                          px={1.5}
                          minW="20px"
                          textAlign="center"
                        >
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </Flex>
                  </VStack>
                </HStack>
                ))}
              </>
            )}
          </Box>
        </VStack>
  );
}

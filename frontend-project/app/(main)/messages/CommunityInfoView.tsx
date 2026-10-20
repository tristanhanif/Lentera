"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  Check,
  ChevronLeft,
  Copy,
  EllipsisVertical,
  Forward,
  Link2,
  Pencil,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import {
  communityAvatar,
  type Community,
  type CommunityMember,
} from "./community.store";
import { useGetFollowers } from "../profile/followList.service";
import { uploadToCloudinary } from "@/app/lib/upload";
import type { ChatConversation } from "./chat.interface";

const MotionBox = motion(Box);

interface CommunityInfoViewProps {
  community: Community;
  currentUserId: string;
  currentUsername: string;
  currentName: string;
  currentAvatar: string | null;
  onBack: () => void;
  onUpdateCommunity: (patch: {
    name?: string;
    description?: string;
    avatarUrl?: string | null;
  }) => void;
  onAddMembers: (members: CommunityMember[]) => void;
  // Backend saja (komunitas lokal tidak dapat menu anggota).
  onPromoteMember?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
  // Buletan Forward (ala Info Saluran): daftar DM + kirim link komunitas.
  conversations: ChatConversation[];
  onForwardToDM: (conversationId: string) => void;
}

// Kotak Komunitas Info (pengganti kotak percakapan saat "Mengelola Komunitas"
// dipencet). Back arrow kiri atas balik ke chat.
export default function CommunityInfoView({
  community,
  currentUserId,
  currentUsername,
  currentName,
  currentAvatar,
  onBack,
  onUpdateCommunity,
  onAddMembers,
  onPromoteMember,
  onRemoveMember,
  conversations,
  onForwardToDM,
}: CommunityInfoViewProps) {
  const isOwner = community.ownerId === currentUserId;
  const myEntry = (community.members ?? []).find((m) => m.id === currentUserId);
  // Admin = pemilik atau co-admin. Edit nama/deskripsi/avatar tetap pemilik saja.
  const isAdmin = isOwner || !!myEntry?.isAdmin;
  const canManageMembers = isAdmin && !!onPromoteMember && !!onRemoveMember;

  // Daftar tampil: owner paling atas, lalu co-admin, baru anggota.
  // Data lama tanpa members / data yang owner-nya sempat hilang
  // (bug tambah anggota kemarin) -> owner disuntik lagi biar angka benar.
  const displayMembers = useMemo<CommunityMember[]>(() => {
    const raw = community.members ?? [];
    const ownerEntry: CommunityMember = {
      id: community.ownerId,
      username:
        community.ownerId === currentUserId ? currentUsername : "admin",
      name:
        community.ownerId === currentUserId
          ? currentName || currentUsername
          : "Admin Komunitas",
      avatar: community.ownerId === currentUserId ? currentAvatar : null,
      isAdmin: true,
    };
    const base: CommunityMember[] = raw.length > 0 ? [...raw] : [];
    const ownerIdx = base.findIndex((m) => m.id === community.ownerId);
    if (ownerIdx === -1) {
      base.unshift(ownerEntry);
    } else if (community.ownerId === currentUserId) {
      // Refresh info owner biar username/avatar tidak basi.
      base[ownerIdx] = {
        ...base[ownerIdx],
        username: currentUsername || base[ownerIdx].username,
        name: currentName || currentUsername || base[ownerIdx].name,
        avatar: currentAvatar ?? base[ownerIdx].avatar,
        isAdmin: true,
      };
    } else {
      base[ownerIdx] = { ...base[ownerIdx], isAdmin: true };
    }
    const owners = base.filter((m) => m.id === community.ownerId);
    const coAdmins = base.filter((m) => m.id !== community.ownerId && m.isAdmin);
    const rest = base.filter((m) => m.id !== community.ownerId && !m.isAdmin);
    return [...owners, ...coAdmins, ...rest];
  }, [community.members, community.ownerId, currentUserId, currentUsername, currentName, currentAvatar]);

  const totalMembers = displayMembers.length;

  // Cari anggota (filter lokal).
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return displayMembers;
    return displayMembers.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q),
    );
  }, [displayMembers, memberSearch]);

  // Deskripsi: >3 baris -> "Lebih banyak" biru.
  const [descExpanded, setDescExpanded] = useState(false);
  const needExpand = (community.description || "").length > 120;

  // Edit terpisah: nama / deskripsi / avatar masing-masing flow sendiri.
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [editDescOpen, setEditDescOpen] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const openEditName = () => {
    setNameDraft(community.name);
    setEditNameOpen(true);
  };
  const handleSaveName = () => {
    const v = nameDraft.trim().slice(0, 50);
    if (v.length < 3) {
      Swal.fire({ icon: "warning", title: "Nama minimal 3 karakter", timer: 1800, showConfirmButton: false });
      return;
    }
    onUpdateCommunity({ name: v });
    setEditNameOpen(false);
  };

  const openEditDesc = () => {
    setDescDraft(community.description);
    setEditDescOpen(true);
  };
  const handleSaveDesc = () => {
    const v = descDraft.trim().slice(0, 500);
    if (!v) {
      Swal.fire({ icon: "warning", title: "Deskripsi tidak boleh kosong", timer: 1800, showConfirmButton: false });
      return;
    }
    onUpdateCommunity({ description: v });
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
      onUpdateCommunity({ avatarUrl: url });
    } catch {
      Swal.fire({ icon: "error", title: "Gagal mengunggah logo", timer: 1800, showConfirmButton: false });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Buletan Forward (ala Info Saluran): modal daftar percakapan DM.
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardSearch, setForwardSearch] = useState("");
  const filteredConversations = conversations.filter((c) => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.otherUser.name.toLowerCase().includes(q) ||
      c.otherUser.username.toLowerCase().includes(q)
    );
  });

  const communityLink = () => {
    try {
      return `${window.location.origin}/messages?community=${encodeURIComponent(community.id)}`;
    } catch {
      return `/messages?community=${encodeURIComponent(community.id)}`;
    }
  };

  const handleCopyLink = async () => {
    const link = communityLink();
    try {
      await navigator.clipboard.writeText(link);
      Swal.fire({ icon: "success", title: "Link disalin", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire({ icon: "error", title: "Gagal menyalin link", timer: 1800, showConfirmButton: false });
    }
  };

  // Tambah Anggota (khusus admin, sumber dari Followers).
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const {
    data: followersData,
    isLoading: loadingFollowers,
  } = useGetFollowers(currentUserId, addSearch, addOpen && isAdmin);

  const followers = useMemo(() => followersData?.data ?? [], [followersData]);
  const memberIds = useMemo(() => new Set(displayMembers.map((m) => m.id)), [displayMembers]);
  const candidateFollowers = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return followers.filter((f) => {
      if (memberIds.has(f.id)) return false;
      if (!q) return true;
      return (
        f.username.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q)
      );
    });
  }, [followers, memberIds, addSearch]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const openAdd = () => {
    setAddSearch("");
    setSelectedIds([]);
    setAddOpen(true);
  };
  const closeAdd = () => {
    setAddOpen(false);
    setAddSearch("");
    setSelectedIds([]);
  };
  const handleConfirmAdd = () => {
    if (selectedIds.length === 0) return;
    const byId = new Map(followers.map((f) => [f.id, f]));
    const next: CommunityMember[] = selectedIds
      .map((id) => byId.get(id))
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({
        id: f.id,
        username: f.username,
        name: f.name,
        avatar: f.avatar ?? null,
      }));
    if (next.length === 0) return;
    onAddMembers(next);
    closeAdd();
  };

  // Menu titik tiga per anggota biasa (admin saja yang lihat):
  // "Menjadi admin" + "Keluarkan dari komunitas".
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [pendingPromote, setPendingPromote] = useState<CommunityMember | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CommunityMember | null>(null);
  const confirmPromote = () => {
    if (!pendingPromote || !onPromoteMember) return;
    onPromoteMember(pendingPromote.id);
    setPendingPromote(null);
    setMemberMenuId(null);
  };
  const confirmRemove = () => {
    if (!pendingRemove || !onRemoveMember) return;
    onRemoveMember(pendingRemove.id);
    setPendingRemove(null);
    setMemberMenuId(null);
  };

  return (
    <Flex flex={1} direction="column" bg="var(--app-card)" h="full" minH={0} position="relative">
      {/* Header: arrow kiri + Info komunitas */}
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
          Info komunitas
        </Text>
      </Flex>

      {/* Isi info */}
      <VStack flex={1} overflowY="auto" align="stretch" gap={0} minH={0} css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
        {/* Avatar tengah + buletan biru plus (admin saja) */}
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
                src={communityAvatar(community.avatarUrl)}
                alt={community.name}
                className={community.avatarUrl ? undefined : "community-logo-default"}
                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: uploadingAvatar ? 0.6 : 1 }}
              />
            </Box>
            <input ref={avatarFileRef} type="file" hidden accept="image/*" onChange={handleAvatarFile} />
            {isOwner && (
              <Box
                as="button"
                aria-label="Ubah logo komunitas"
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
                title="Ubah logo komunitas"
              >
                <Plus size={15} strokeWidth={3} />
              </Box>
            )}
          </Box>

          {/* Nama + pen kanan (admin saja) */}
          <HStack justify="center" align="center" gap={1.5} maxW="full">
            <Text fontWeight="bold" color="var(--app-text)" fontSize="lg" lineClamp={2} textAlign="center">
              {community.name}
            </Text>
            {isOwner && (
              <IconButton
                aria-label="Edit nama komunitas"
                variant="ghost"
                size="xs"
                borderRadius="full"
                color="var(--app-muted)"
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                onClick={openEditName}
                flexShrink={0}
              >
                <Pencil size={15} />
              </IconButton>
            )}
          </HStack>
          <Text fontSize="xs" color="var(--app-muted)" fontWeight="medium">
            Komunitas • {totalMembers} Anggota
          </Text>
        </VStack>

        {/* 2 buletan: Forward - Copy link (ala Info Saluran) */}
        <Flex px={6} pt={3} pb={2} justify="center" gap={8}>
          <VStack gap={1.5} align="center">
            <Box
              as="button"
              aria-label="Forward komunitas ke chat"
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
              aria-label="Copy link komunitas"
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

        {/* Garis panjang */}
        <Box h="1px" w="full" bg="var(--app-border)" mt={3} flexShrink={0} />

        {/* Tab Komunitas + garis biru pendek menempel di bawah tulisan */}
        <Box px={5} pt={3} flexShrink={0}>
          <VStack align="center" gap={0}>
            <Text fontSize="md" fontWeight="bold" color="var(--app-text)" textAlign="center">
              Komunitas
            </Text>
            <Box h="3px" w="60px" bg="blue.600" mt={1} borderRadius="full" />
          </VStack>
        </Box>

        {/* Deskripsi + pen kanan (admin saja) + Lebih banyak */}
        <Box px={5} py={4}>
          <Flex align="start" justify="space-between" gap={3}>
            <Text fontSize="sm" color="var(--app-text)" flex={1} minW={0} lineClamp={descExpanded ? undefined : 3} whiteSpace="pre-wrap" wordBreak="break-word">
              {community.description}
            </Text>
            {isOwner && (
              <IconButton
                aria-label="Edit deskripsi komunitas"
                variant="ghost"
                size="xs"
                borderRadius="full"
                color="var(--app-muted)"
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                onClick={openEditDesc}
                flexShrink={0}
              >
                <Pencil size={15} />
              </IconButton>
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

        {/* Baris jumlah + search */}
        <Flex px={5} py={2} justify="space-between" align="center" gap={3}>
          <Text fontSize="sm" fontWeight="semibold" color="var(--app-text)">
            {totalMembers} anggota komunitas
          </Text>
          <IconButton
            aria-label="Cari anggota"
            variant="ghost"
            size="sm"
            borderRadius="full"
            color="var(--app-muted)"
            _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
            onClick={() => {
              setMemberSearchOpen((v) => !v);
              if (memberSearchOpen) setMemberSearch("");
            }}
          >
            <Search size={18} />
          </IconButton>
        </Flex>
        {memberSearchOpen && (
          <Box px={5} pb={2}>
            <HStack bg="var(--app-input)" border="1px solid" borderColor="var(--app-border)" borderRadius="xl" px={3} py={1}>
              <Search size={16} color="var(--app-faint)" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Cari anggota..."
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
        )}

        {/* Tambah Anggota (admin saja) */}
        {isAdmin && (
          <HStack px={5} py={3} gap={3} cursor="pointer" _hover={{ bg: "var(--app-hover)" }} transition="0.15s" onClick={openAdd}>
            <Box w="40px" h="40px" borderRadius="full" bg="blue.600" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
              <UserPlus size={18} color="white" />
            </Box>
            <Text fontSize="sm" fontWeight="semibold" color="var(--app-text)">
              Tambah Anggota
            </Text>
          </HStack>
        )}

        {/* Daftar anggota: admin di atas + kotak biru Admin */}
        <VStack px={5} pt={1} pb={6} gap={4} align="stretch">
          {filteredMembers.length === 0 ? (
            <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
              {memberSearch ? "Tidak ada anggota yang cocok" : "Belum ada anggota"}
            </Text>
          ) : (
            filteredMembers.map((m) => {
              const adminRow = m.id === community.ownerId || !!m.isAdmin;
              const showMemberMenu =
                canManageMembers && !adminRow && m.id !== currentUserId;
              return (
                <HStack key={m.id} gap={3} align="center">
                  <Box w="44px" h="44px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                    <img src={m.avatar || "/default-avatar.jpg"} alt={m.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </Box>
                  <VStack align="start" gap={0} flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                      {m.username}
                    </Text>
                    <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                      {m.name}
                    </Text>
                  </VStack>
                  {adminRow && (
                    <Box bg="blue.600" color="white" fontSize="11px" fontWeight="bold" px={2.5} py={1} borderRadius="md" flexShrink={0}>
                      Admin
                    </Box>
                  )}
                  {showMemberMenu && (
                    <Box position="relative" flexShrink={0}>
                      <IconButton
                        aria-label={`Kelola ${m.username}`}
                        variant="ghost"
                        size="xs"
                        borderRadius="full"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => setMemberMenuId((prev) => (prev === m.id ? null : m.id))}
                      >
                        <EllipsisVertical size={16} />
                      </IconButton>
                      {memberMenuId === m.id && (
                        <Box position="fixed" inset={0} zIndex={30} onClick={() => setMemberMenuId(null)} />
                      )}
                      <AnimatePresence>
                        {memberMenuId === m.id && (
                          <MotionBox
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            position="absolute"
                            top="calc(100% + 4px)"
                            right={0}
                            bg="var(--app-card)"
                            borderRadius="xl"
                            shadow="lg"
                            border="1px solid"
                            borderColor="var(--app-border)"
                            minW="190px"
                            py={2}
                            zIndex={31}
                          >
                            <Flex
                              px={4}
                              py={2.5}
                              align="center"
                              justify="start"
                              cursor="pointer"
                              color="var(--app-text)"
                              _hover={{ bg: "var(--app-hover)" }}
                              transition="0.15s"
                              onClick={() => {
                                setMemberMenuId(null);
                                setPendingPromote(m);
                              }}
                            >
                              <Text fontSize="sm" fontWeight="medium">Menjadi admin</Text>
                            </Flex>
                            <Flex
                              px={4}
                              py={2.5}
                              align="center"
                              justify="start"
                              cursor="pointer"
                              color="red.500"
                              _hover={{ bg: "var(--app-hover)" }}
                              transition="0.15s"
                              onClick={() => {
                                setMemberMenuId(null);
                                setPendingRemove(m);
                              }}
                            >
                              <Text fontSize="sm" fontWeight="medium">Keluarkan dari komunitas</Text>
                            </Flex>
                          </MotionBox>
                        )}
                      </AnimatePresence>
                    </Box>
                  )}
                </HStack>
              );
            })
          )}
        </VStack>
      </VStack>

      {/* Modal edit nama (terpisah) */}
      <AnimatePresence>
        {editNameOpen && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setEditNameOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={5} w="360px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Text fontSize="md" fontWeight="bold" color="var(--app-text)" mb={3}>
                Edit nama komunitas
              </Text>
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value.slice(0, 50))}
                placeholder="Nama Komunitas..."
                fontSize="sm"
                color="var(--app-text)"
                bg="var(--app-input)"
                border="1px solid"
                borderColor="var(--app-border)"
                borderRadius="lg"
                maxLength={50}
                autoFocus
              />
              <Text fontSize="xs" color="var(--app-faint)" textAlign="right" mt={1}>
                {nameDraft.length}/50
              </Text>
              <Flex justify="flex-end" gap={2} mt={4}>
                <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setEditNameOpen(false)}>
                  Batal
                </Button>
                <Button borderRadius="lg" size="sm" bg="blue.600" color="white" _hover={{ bg: "blue.700" }} onClick={handleSaveName}>
                  Simpan
                </Button>
              </Flex>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Modal edit deskripsi (terpisah) */}
      <AnimatePresence>
        {editDescOpen && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setEditDescOpen(false)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={5} w="360px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Text fontSize="md" fontWeight="bold" color="var(--app-text)" mb={3}>
                Edit deskripsi komunitas
              </Text>
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value.slice(0, 500))}
                placeholder="Deskripsi Komunitas"
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
                    {communityLink()}
                  </Text>
                </HStack>
              </Box>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Modal konfirmasi naikkan admin */}
      <AnimatePresence>
        {pendingPromote && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setPendingPromote(null)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={6} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <VStack gap={2} align="stretch" textAlign="center">
                <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" mx="auto">
                  <img src={pendingPromote.avatar || "/default-avatar.jpg"} alt={pendingPromote.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="var(--app-text)">
                  {pendingPromote.username}
                </Text>
                <Text fontSize="sm" color="var(--app-text)">
                  Yakin ingin menaikkan {pendingPromote.username} menjadi admin komunitas?
                </Text>
                <Flex justify="flex-end" gap={2} pt={2}>
                  <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setPendingPromote(null)}>
                    Tidak
                  </Button>
                  <Button borderRadius="lg" size="sm" bg="blue.600" color="white" _hover={{ bg: "blue.700" }} onClick={confirmPromote}>
                    Ya, naikkan
                  </Button>
                </Flex>
              </VStack>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Modal konfirmasi keluarkan anggota */}
      <AnimatePresence>
        {pendingRemove && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setPendingRemove(null)}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={6} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <VStack gap={2} align="stretch" textAlign="center">
                <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" mx="auto">
                  <img src={pendingRemove.avatar || "/default-avatar.jpg"} alt={pendingRemove.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="var(--app-text)">
                  {pendingRemove.username}
                </Text>
                <Text fontSize="sm" color="var(--app-text)">
                  Yakin ingin mengeluarkan {pendingRemove.username} dari komunitas?
                </Text>
                <Flex justify="flex-end" gap={2} pt={2}>
                  <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setPendingRemove(null)}>
                    Tidak
                  </Button>
                  <Button borderRadius="lg" size="sm" bg="red.500" color="white" _hover={{ bg: "red.600" }} onClick={confirmRemove}>
                    Ya, keluarkan
                  </Button>
                </Flex>
              </VStack>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>

      {/* Kotak Tambah Anggota di tengah */}
      <AnimatePresence>
        {addOpen && (
          <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={closeAdd}>
            <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" w="400px" maxW="calc(100% - 48px)" maxH="80%" display="flex" flexDirection="column" overflow="hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              {/* Header: silang kiri + Tambah Anggota */}
              <Flex p={4} borderBottom="1px solid" borderColor="var(--app-hover)" align="center" gap={2} flexShrink={0}>
                <IconButton aria-label="Tutup tambah anggota" variant="ghost" size="sm" borderRadius="full" color="var(--app-text)" _hover={{ bg: "var(--app-subtle)" }} onClick={closeAdd}>
                  <X size={20} />
                </IconButton>
                <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
                  Tambah Anggota
                </Text>
              </Flex>
              {/* Pencarian */}
              <Box p={4} pb={2} flexShrink={0}>
                <HStack bg="var(--app-input)" border="1px solid" borderColor="var(--app-border)" borderRadius="xl" px={3} py={1}>
                  <Search size={16} color="var(--app-faint)" />
                  <Input
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Cari akun..."
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
              <Text px={4} py={2} fontSize="sm" fontWeight="semibold" color="var(--app-muted)" flexShrink={0}>
                Akun
              </Text>
              {/* Daftar akun + ceklis kiri */}
              <VStack flex={1} overflowY="auto" px={4} py={2} gap={3} align="stretch" minH={0} css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
                {loadingFollowers ? (
                  <Flex justify="center" py={6}>
                    <Spinner size="md" color="blue.500" />
                  </Flex>
                ) : candidateFollowers.length === 0 ? (
                  <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
                    {addSearch ? "Tidak ada akun yang cocok" : "Tidak ada followers untuk ditambahkan"}
                  </Text>
                ) : (
                  candidateFollowers.map((f) => {
                    const checked = selectedIds.includes(f.id);
                    return (
                      <HStack key={f.id} gap={3} align="center" cursor="pointer" onClick={() => toggleSelect(f.id)}>
                        <Box
                          w="20px"
                          h="20px"
                          borderRadius="md"
                          border={checked ? "2px solid" : "1px solid"}
                          borderColor={checked ? "blue.600" : "var(--app-border)"}
                          bg={checked ? "blue.600" : "transparent"}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          {checked && <Check size={13} color="white" strokeWidth={3} />}
                        </Box>
                        <Box w="40px" h="40px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" flexShrink={0}>
                          <img src={f.avatar || "/default-avatar.jpg"} alt={f.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </Box>
                        <VStack align="start" gap={0} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="bold" color="var(--app-text)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                            {f.username}
                          </Text>
                          <Text fontSize="xs" color="var(--app-muted)" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
                            {f.name}
                          </Text>
                        </VStack>
                      </HStack>
                    );
                  })
                )}
              </VStack>
              {/* Kotak bawah + kotak biru Tambah Anggota */}
              <Box p={4} borderTop="1px solid" borderColor="var(--app-hover)" flexShrink={0}>
                <Button
                  w="full"
                  bg="blue.600"
                  color="white"
                  borderRadius="xl"
                  h="44px"
                  fontWeight="bold"
                  _hover={{ bg: "blue.700" }}
                  disabled={selectedIds.length === 0}
                  opacity={selectedIds.length === 0 ? 0.5 : 1}
                  onClick={handleConfirmAdd}
                >
                  Tambah Anggota
                </Button>
              </Box>
            </MotionBox>
          </Box>
        )}
      </AnimatePresence>
    </Flex>
  );
}

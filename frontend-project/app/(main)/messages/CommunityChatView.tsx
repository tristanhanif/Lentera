"use client";
/* eslint-disable @next/next/no-img-element */
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EllipsisVertical,
  LogOut,
  Mic,
  Paintbrush,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import type { Community, CommunityMember } from "./community.store";
import { communityAvatar } from "./community.store";
import CommunityInfoView from "./CommunityInfoView";
import DMVoiceRecorder from "./components/DMVoiceRecorder";
import CommunityVoiceBubble from "./components/CommunityVoiceBubble";
import {
  CHAT_THEMES,
  CHAT_THEME_DEFAULT_ID,
  chatThemeStorageKey,
  getChatTheme,
} from "./chat-theme";

const MotionBox = motion(Box);
const EMOJIS = ["😀", "😂", "😍", "😭", "🔥", "🎉", "❤️", "👍", "🙏", "😎", "🥳", "💪"];

interface CommunityChatViewProps {
  community: Community;
  currentUserId: string;
  currentUsername: string;
  currentAvatar: string | null;
  currentName?: string;
  unreadCount?: number;
  firstUnreadId?: string | null;
  onRead?: () => void;
  onSend: (text: string) => void;
  onClear: () => void;
  onLeave: () => void;
  onManage?: () => void;
  onUpdateCommunity: (patch: {
    name?: string;
    description?: string;
    avatarUrl?: string | null;
  }) => void;
  onAddMembers: (members: CommunityMember[]) => void;
  onPromoteMember?: (memberId: string) => void;
  onRemoveMember?: (memberId: string) => void;
}

// Chat komunitas: header + menu titik tiga (Search / Chat theme / Keluar /
// Clear chat) yang fungsinya sama persis seperti DM — kecuali Keluar yang
// dibahas menyusul. Search = Find ala VS Code, Chat theme = panel wallpaper
// 8 pilihan, Clear chat = kotak konfirmasi tengah.
export default function CommunityChatView({
  community,
  currentUserId,
  currentUsername,
  currentAvatar,
  currentName,
  unreadCount = 0,
  firstUnreadId = null,
  onRead,
  onSend,
  onClear,
  onLeave,
  onManage,
  onUpdateCommunity,
  onAddMembers,
  onPromoteMember,
  onRemoveMember,
}: CommunityChatViewProps) {
  const [text, setText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Info komunitas: hide percakapan, ganti kotak info. Back balik ke chat.
  const [showInfo, setShowInfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===== Unread ala WA: mulai dari pesan pertama yang belum dibaca =====
  // Kotak tengah "[N] pesan terbaru" hilang + badge kanan hilang
  // hanya kalau sudah scroll sampai bawah (baru tandai dibaca).
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const initialUnreadRef = useRef(0);
  const clearedForRef = useRef<string | null>(null);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const showNewLabelRef = useRef(false);
  showNewLabelRef.current = showNewLabel;
  const clearUnread = () => {
    if (!showNewLabelRef.current) return;
    if (firstUnreadId) clearedForRef.current = firstUnreadId;
    setShowNewLabel(false);
    try {
      onRead?.();
    } catch {}
  };
  useEffect(() => {
    clearedForRef.current = null;
    initialUnreadRef.current = unreadCount ?? 0;
    setShowNewLabel((unreadCount ?? 0) > 0 && !!firstUnreadId);
    atBottomRef.current = !firstUnreadId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);
  // Data messages datang belakangan (async): kalau ternyata ada unread,
  // tampilkan label + jangan anggap di bawah.
  // Kalau user sudah scroll-bawah untuk firstUnreadId itu, jangan muncul lagi.
  useEffect(() => {
    if (
      firstUnreadId &&
      (unreadCount ?? 0) > 0 &&
      clearedForRef.current !== firstUnreadId
    ) {
      initialUnreadRef.current = unreadCount ?? 0;
      setShowNewLabel(true);
      atBottomRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstUnreadId, unreadCount]);
  // Pesan baru masuk saat chat kebuka & posisi di bawah -> langsung tandai dibaca.
  useEffect(() => {
    if (!showNewLabel && atBottomRef.current && (unreadCount ?? 0) > 0) {
      onRead?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.messages.length]);
  // Scroll awal: ke pesan pertama yang belum dibaca, kalau tidak ada ke bawah.
  useEffect(() => {
    const t = setTimeout(() => {
      if (showNewLabel && firstUnreadId) {
        messageRefs.current.get(firstUnreadId)?.scrollIntoView({ block: "center" });
      } else if (!showNewLabel && atBottomRef.current) {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, showNewLabel, firstUnreadId]);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    atBottomRef.current = atBottom;
    if (atBottom) clearUnread();
  };
  // Backup: listener native + sentinel bawah (IntersectionObserver).
  // Kalau onScroll sintetik kehalang / hitungan meleset, yang ini yang
  // menangkap "sudah sampai bawah" dan menandai dibaca.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const check = () => {
      const atBottom = root.scrollHeight - root.scrollTop - root.clientHeight < 64;
      atBottomRef.current = atBottom;
      if (atBottom) clearUnread();
      // Konten muat tanpa scrollbar = sudah terbaca semua.
      if (root.scrollHeight <= root.clientHeight + 64) clearUnread();
    };
    root.addEventListener("scroll", check, { passive: true });
    const t = setTimeout(check, 300);
    return () => {
      root.removeEventListener("scroll", check);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, community.messages.length, showNewLabel, firstUnreadId]);
  useEffect(() => {
    const root = scrollRef.current;
    const target = bottomRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) clearUnread();
      },
      { root, threshold: 0.1 },
    );
    obs.observe(target);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id, community.messages.length, showNewLabel, firstUnreadId]);
  const scrollToBottom = () => {
    const root = scrollRef.current;
    if (root) root.scrollTo({ top: root.scrollHeight, behavior: "smooth" });
  };

  // ===== Chat theme per-komunitas (lokal, sama seperti DM) =====
  const [themeView, setThemeView] = useState<null | "preview" | "all">(null);
  const [chatThemeId, setChatThemeId] = useState<string>(CHAT_THEME_DEFAULT_ID);
  const activeTheme = getChatTheme(chatThemeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(chatThemeStorageKey(`community-${community.id}`));
      setChatThemeId(saved || CHAT_THEME_DEFAULT_ID);
    } catch {
      setChatThemeId(CHAT_THEME_DEFAULT_ID);
    }
    setThemeView(null);
    setIsFinding(false);
    setFindQuery("");
    setFindIndex(0);
    setShowInfo(false);
    setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  const applyChatTheme = (id: string) => {
    setChatThemeId(id);
    try {
      if (id === CHAT_THEME_DEFAULT_ID) {
        localStorage.removeItem(chatThemeStorageKey(`community-${community.id}`));
      } else {
        localStorage.setItem(chatThemeStorageKey(`community-${community.id}`), id);
      }
    } catch {
      // abaikan kalau storage penuh / diblokir
    }
  };
  const resetChatTheme = () => applyChatTheme(CHAT_THEME_DEFAULT_ID);
  const openThemePreview = () => {
    setMenuOpen(false);
    setIsFinding(false);
    setThemeView("preview");
  };
  const closeThemeToChat = () => setThemeView(null);

  // ===== Find dalam komunitas (ala VS Code, sama seperti DM) =====
  const [isFinding, setIsFinding] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const findMatches = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!isFinding || !q) return [];
    return community.messages.filter((m) => m.text.toLowerCase().includes(q)).map((m) => m.id);
  }, [findQuery, community.messages, isFinding]);

  const findTotal = findMatches.length;
  const findActiveId = findTotal > 0 ? findMatches[Math.min(findIndex, findTotal - 1)] : null;
  const findLabel =
    findQuery.trim() && findTotal > 0
      ? `${Math.min(findIndex, findTotal - 1) + 1} of ${findTotal}`
      : "No results";

  const openFind = () => {
    setMenuOpen(false);
    setThemeView(null);
    setIsFinding(true);
    setFindQuery("");
    setFindIndex(0);
    setTimeout(() => findInputRef.current?.focus(), 50);
  };
  const closeFind = () => {
    setIsFinding(false);
    setFindQuery("");
    setFindIndex(0);
  };
  const goToFind = (dir: 1 | -1) => {
    if (findTotal === 0) return;
    setFindIndex((prev) => {
      const clamped = Math.min(Math.max(prev, 0), findTotal - 1);
      return (clamped + dir + findTotal) % findTotal;
    });
  };
  const handleFindChange = (value: string) => {
    setFindQuery(value);
    setFindIndex(0);
  };

  useEffect(() => {
    if (!isFinding || !findActiveId) return;
    const el = messageRefs.current.get(findActiveId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [findActiveId, isFinding]);

  const renderFoundText = (txt: string, isActive: boolean) => {
    const q = findQuery.trim();
    if (!isFinding || !q || (!isActive && findTotal === 0)) return txt;
    if (!q) return txt;
    const lowerText = txt.toLowerCase();
    const lowerQ = q.toLowerCase();
    if (!lowerText.includes(lowerQ)) return txt;
    const parts: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < txt.length) {
      const idx = lowerText.indexOf(lowerQ, i);
      if (idx === -1) {
        parts.push(txt.slice(i));
        break;
      }
      if (idx > i) parts.push(txt.slice(i, idx));
      parts.push(
        <Box key={`find-${key++}`} as="span" bg={isActive ? "orange.300" : "yellow.200"} color="black" px="1px" borderRadius="sm">
          {txt.slice(idx, idx + q.length)}
        </Box>,
      );
      i = idx + q.length;
    }
    return <>{parts}</>;
  };

  // ===== Clear chat: kotak konfirmasi tengah, sama seperti DM =====
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const handleSend = () => {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
    setEmojiOpen(false);
  };

  const confirmLeave = () => {
    setMenuOpen(false);
    Swal.fire({
      title: `Keluar dari ${community.name}?`,
      text: "Komunitas akan dihapus dari daftar kamu.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e53e3e",
    }).then((r) => {
      if (r.isConfirmed) onLeave();
    });
  };

  const handleMenuSelect = (label: string) => {
    if (label === "Search") {
      setThemeView(null);
      openFind();
      return;
    }
    if (label === "Chat theme") {
      openThemePreview();
      return;
    }
    if (label === "Clear chat") {
      setMenuOpen(false);
      setThemeView(null);
      setIsFinding(false);
      setClearConfirmOpen(true);
      return;
    }
    if (label === "Keluar") {
      confirmLeave();
      return;
    }
    setMenuOpen(false);
  };

  const renderThemeGrid = (items: typeof CHAT_THEMES) => (
    <Flex px={5} pb={5} pt={2} wrap="wrap" gap={3}>
      {items.map((t) => {
        const isActive = t.id === chatThemeId;
        return (
          <Box key={t.id} w="calc(50% - 6px)" cursor="pointer" onClick={() => applyChatTheme(t.id)}>
            <Box
              borderRadius="xl"
              overflow="hidden"
              border={isActive ? "2px solid" : "1px solid"}
              borderColor={isActive ? "blue.500" : "var(--app-border)"}
              h="120px"
              position="relative"
              style={{ background: t.chatBackground }}
            >
              <VStack gap={1.5} p={2.5} align="stretch" h="full" justify="center">
                <Box alignSelf="flex-start" px={2.5} py={1.5} borderRadius="lg" fontSize="10px" fontWeight="medium" maxW="80%" style={{ background: t.otherBg, color: t.otherText }}>
                  Halo!
                </Box>
                <Box alignSelf="flex-end" px={2.5} py={1.5} borderRadius="lg" fontSize="10px" fontWeight="medium" maxW="80%" style={{ background: t.meBg, color: t.meText }}>
                  Hai juga!
                </Box>
              </VStack>
              {isActive && (
                <Box position="absolute" top={1.5} right={1.5} w="22px" h="22px" borderRadius="full" bg="blue.500" display="flex" alignItems="center" justifyContent="center">
                  <Check size={14} color="white" />
                </Box>
              )}
            </Box>
            <Text fontSize="xs" fontWeight={isActive ? "bold" : "medium"} color="var(--app-text)" textAlign="center" mt={1.5}>
              {t.name}
            </Text>
          </Box>
        );
      })}
    </Flex>
  );

  return (
    <Flex flex={1} direction="column" h="full" minH={0} position="relative" bg={showInfo || themeView ? "var(--app-card)" : undefined} style={showInfo || themeView ? undefined : { background: activeTheme.chatBackground }}>
      {showInfo ? (
        <CommunityInfoView
          community={community}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          currentName={currentName || currentUsername}
          currentAvatar={currentAvatar}
          onBack={() => setShowInfo(false)}
          onUpdateCommunity={onUpdateCommunity}
          onAddMembers={onAddMembers}
          onPromoteMember={onPromoteMember}
          onRemoveMember={onRemoveMember}
        />
      ) : themeView ? (
        // ===== Panel Chat theme (sama seperti DM) =====
        <Flex flex={1} direction="column" overflowY="auto" bg="var(--app-card)">
          <Flex p={4} borderBottom="1px solid" borderColor="var(--app-hover)" justify="space-between" align="center" shadow="sm" flexShrink={0}>
            <HStack gap={2}>
              <IconButton
                aria-label={themeView === "all" ? "Kembali ke Chat theme" : "Kembali ke percakapan"}
                variant="ghost"
                size="sm"
                borderRadius="full"
                color="var(--app-muted)"
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                onClick={() => (themeView === "all" ? setThemeView("preview") : closeThemeToChat())}
              >
                <ArrowLeft size={20} />
              </IconButton>
              <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
                {themeView === "all" ? "Themes" : "Chat theme"}
              </Text>
            </HStack>
            {themeView === "preview" && (
              <IconButton
                aria-label="Kembalikan ke wallpaper normal"
                title="Kembalikan ke wallpaper normal"
                variant="ghost"
                size="sm"
                borderRadius="full"
                color="var(--app-muted)"
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                onClick={resetChatTheme}
              >
                <RefreshCw size={18} />
              </IconButton>
            )}
          </Flex>
          {themeView === "preview" ? (
            <>
              <Flex px={5} pt={4} pb={2} justify="space-between" align="center" gap={3} flexShrink={0}>
                <VStack align="start" gap={0}>
                  <Text fontWeight="semibold" color="var(--app-text)" fontSize="md">Theme</Text>
                  <Text fontSize="xs" color="var(--app-muted)">The chat color and wallpaper will both change.</Text>
                </VStack>
                <Button borderRadius="full" size="xs" variant="outline" borderColor="var(--app-border)" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setThemeView("all")} flexShrink={0}>
                  See all
                </Button>
              </Flex>
              {renderThemeGrid(CHAT_THEMES.slice(0, 4))}
            </>
          ) : (
            <Flex px={5} py={4} wrap="wrap" gap={3}>
              {renderThemeGrid(CHAT_THEMES)}
            </Flex>
          )}
        </Flex>
      ) : (
        <>
          {/* Header (solid) + Find overlay ala VS Code */}
          <Box position="relative" zIndex={10}>
            <Flex p={4} bg="var(--app-card)" borderBottom="1px solid" borderColor="var(--app-hover)" justify="space-between" align="center" shadow="sm" position="relative">
              <HStack gap={3} cursor="pointer" onClick={() => setShowInfo(true)} title="Lihat info komunitas">
                <Box w="48px" h="48px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                  <img src={communityAvatar(community.avatarUrl)} alt={community.name} className={community.avatarUrl ? undefined : "community-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" color="var(--app-text)" fontSize="md" lineClamp={1}>
                    {community.name}
                  </Text>
                  <Text fontSize="xs" color="var(--app-faint)" fontWeight="medium">
                    Komunitas
                  </Text>
                </VStack>
              </HStack>
              <Box position="relative">
                <IconButton aria-label="Menu komunitas" variant="ghost" size="sm" borderRadius="full" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={() => setMenuOpen((v) => !v)}>
                  <EllipsisVertical size={20} />
                </IconButton>
                {menuOpen && <Box position="fixed" inset={0} zIndex={20} onClick={() => setMenuOpen(false)} />}
                <AnimatePresence>
                  {menuOpen && (
                    <MotionBox initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.18, ease: "easeOut" }} position="absolute" top="calc(100% + 4px)" right={0} bg="var(--app-card)" borderRadius="xl" shadow="lg" border="1px solid" borderColor="var(--app-border)" minW="190px" py={2} zIndex={30}>
                      {(
                        [
                          { label: "Search", Icon: Search },
                          { label: "Chat theme", Icon: Paintbrush },
                          // Block di DM → Keluar di komunitas
                          { label: "Keluar", Icon: LogOut },
                          { label: "Clear chat", Icon: Trash2 },
                        ] as const
                      ).map(({ label, Icon }) => (
                        <Flex key={label} px={4} py={2.5} gap={3} align="center" justify="start" cursor="pointer" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} transition="0.15s" onClick={() => handleMenuSelect(label)}>
                          <Box color="var(--app-text)" display="flex" alignItems="center">
                            <Icon size={16} />
                          </Box>
                          <Text fontSize="sm" fontWeight="medium">{label}</Text>
                        </Flex>
                      ))}
                    </MotionBox>
                  )}
                </AnimatePresence>
              </Box>
            </Flex>
            <AnimatePresence>
              {isFinding && (
                <MotionBox initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18, ease: "easeOut" }} position="absolute" top="calc(100% + 6px)" right={3} zIndex={30} bg="var(--app-card)" color="var(--app-text)" border="1px solid" borderColor="var(--app-border)" borderRadius="xl" shadow="lg" p={2} w="430px" maxW="calc(100% - 24px)">
                  <Flex align="center" gap={1.5}>
                    <IconButton aria-label="Keluar dari pencarian" variant="ghost" size="sm" borderRadius="full" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={closeFind}>
                      <ChevronLeft size={18} />
                    </IconButton>
                    <Input
                      ref={findInputRef}
                      placeholder="Cari pesan..."
                      value={findQuery}
                      onChange={(e) => handleFindChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") closeFind();
                        else if (e.key === "Enter") {
                          e.preventDefault();
                          goToFind(e.shiftKey ? -1 : 1);
                        }
                      }}
                      fontSize="sm"
                      color="var(--app-text)"
                      bg="var(--app-input)"
                      border="1px solid"
                      borderColor="var(--app-border)"
                      borderRadius="lg"
                      px={3}
                      h="36px"
                      flex={1}
                      minW={0}
                      _placeholder={{ color: "var(--app-faint)" }}
                      _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px #60a5fa" }}
                    />
                    <Text fontSize="xs" color="var(--app-muted)" fontWeight="medium" minW="68px" textAlign="center" flexShrink={0}>
                      {findLabel}
                    </Text>
                    <IconButton aria-label="Hasil sebelumnya (ke atas)" variant="ghost" size="sm" borderRadius="md" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={() => goToFind(-1)} disabled={findTotal === 0} opacity={findTotal === 0 ? 0.4 : 1}>
                      <ChevronUp size={18} />
                    </IconButton>
                    <IconButton aria-label="Hasil berikutnya (ke bawah)" variant="ghost" size="sm" borderRadius="md" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }} onClick={() => goToFind(1)} disabled={findTotal === 0} opacity={findTotal === 0 ? 0.4 : 1}>
                      <ChevronDown size={18} />
                    </IconButton>
                  </Flex>
                </MotionBox>
              )}
            </AnimatePresence>
          </Box>

          {/* Isi chat (transparan di atas wallpaper) */}
          <VStack ref={scrollRef} onScroll={handleScroll} flex={1} overflowY="auto" px={6} py={6} gap={4} align="stretch" css={{ "&::-webkit-scrollbar": { width: "4px" }, "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" } }}>
            {/* Welcome box: kartu kecil di tengah */}
            <Box mx="auto" w="full" maxW="300px" bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="2xl" shadow="sm" px={5} py={5}>
              <VStack gap={2} align="center" textAlign="center">
                <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)">
                  <img src={communityAvatar(community.avatarUrl)} alt={community.name} className={community.avatarUrl ? undefined : "community-logo-default"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Text fontWeight="black" color="var(--app-text)" fontSize="md">
                  Selamat datang di komunitasmu!
                </Text>
                <Text fontSize="xs" color="var(--app-muted)" maxW="240px">
                  Kirimkan pembaruan administratif penting kepada semua anggota Anda sekaligus.
                </Text>
                <Box h="1px" w="full" bg="var(--app-border)" my={2} />
                <Box as="button" fontSize="sm" fontWeight="bold" color="blue.600" cursor="pointer" onClick={() => { setShowInfo(true); onManage?.(); }}>
                  Mengelola Komunitas
                </Box>
              </VStack>
            </Box>

            {/* Bubble satuan: avatar kiri atas + nama/role + isi pesan dalam satu kotak, tanpa garis. */}
            {community.messages.map((m) => {
              const isFirstUnread = showNewLabel && firstUnreadId === m.id;
              const newLabel = isFirstUnread ? (
                <Flex key={`new-${m.id}`} justify="center" my={1}>
                  <Box
                    as="button"
                    onClick={scrollToBottom}
                    title="Loncat ke bawah"
                    bg="var(--app-card)"
                    border="1px solid"
                    borderColor="var(--app-border)"
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    shadow="sm"
                    maxW="90%"
                    cursor="pointer"
                    _hover={{ bg: "var(--app-hover)" }}
                  >
                    <Text fontSize="11px" fontWeight="bold" color="var(--app-text)" textAlign="center">
                      {initialUnreadRef.current > 0 ? initialUnreadRef.current : unreadCount} pesan terbaru
                    </Text>
                  </Box>
                </Flex>
              ) : null;
              // Event permanen backend (mis. "'username' telah ditambahkan"):
              // kotak sistem di tengah bawah pesan terakhir.
              if (m.isEvent) {
                return (
                  <Fragment key={m.id}>
                    {newLabel}
                    <Flex
                      justify="center"
                      my={1}
                      ref={(el: HTMLDivElement | null) => {
                        if (el) messageRefs.current.set(m.id, el as unknown as HTMLDivElement);
                        else messageRefs.current.delete(m.id);
                      }}
                    >
                      <Box
                        bg="var(--app-card)"
                        border="1px solid"
                        borderColor="var(--app-border)"
                        px={3}
                        py={1.5}
                        borderRadius="full"
                        shadow="sm"
                        maxW="90%"
                      >
                        <Text fontSize="11px" fontWeight="medium" color="var(--app-muted)" textAlign="center">
                          {m.text}
                        </Text>
                      </Box>
                    </Flex>
                  </Fragment>
                );
              }
              const mine = m.senderId === currentUserId || m.isMine;
              const memberInfo = (community.members ?? []).find((mm) => mm.id === m.senderId);
              const isAdminSender = m.senderId === community.ownerId || !!memberInfo?.isAdmin;
              const displayName = mine ? "You" : memberInfo?.username || m.senderName || currentUsername;
              const avatarSrc = mine
                ? currentAvatar || memberInfo?.avatar || "/default-avatar.jpg"
                : memberInfo?.avatar || "/default-avatar.jpg";
              const q = findQuery.trim().toLowerCase();
              const isMatch = isFinding && !!q && m.text.toLowerCase().includes(q);
              const isActive = isMatch && m.id === findActiveId;
              return (
                <Fragment key={m.id}>
                  {newLabel}
                  <Flex
                    justify={mine ? "flex-end" : "flex-start"}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) messageRefs.current.set(m.id, el as unknown as HTMLDivElement);
                    else messageRefs.current.delete(m.id);
                  }}
                  scrollMarginTop="16px"
                  scrollMarginBottom="16px"
                >
                  <Box
                    maxW="80%"
                    px={4}
                    py={3}
                    borderRadius="2xl"
                    borderBottomRightRadius={mine ? "0" : "2xl"}
                    borderBottomLeftRadius={mine ? "2xl" : "0"}
                    bg={isActive ? (mine ? "orange.400" : "orange.100") : mine ? activeTheme.meBg : activeTheme.otherBg}
                    color={mine ? (isActive ? "var(--app-text)" : activeTheme.meText) : "black"}
                    shadow={isActive ? "md" : "sm"}
                    border={isActive || !mine ? "2px solid" : "none"}
                    borderColor={isActive ? "orange.500" : activeTheme.otherBorder}
                  >
                    <HStack gap={2} align="center" mb={2}>
                      <Box w="32px" h="32px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" flexShrink={0}>
                        <img src={avatarSrc} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </Box>
                      <VStack align="start" gap={0} minW={0}>
                        <Text fontSize="xs" fontWeight="bold" color={mine ? (isActive ? "var(--app-text)" : activeTheme.meText) : "black"} lineClamp={1}>
                          {displayName}
                        </Text>
                        {isAdminSender && (
                          <Text fontSize="10px" color={mine && !isActive ? activeTheme.meText : "black"} fontWeight="medium" opacity={mine && !isActive ? 0.85 : 1}>
                            Admin Komunitas
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                    <Text
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      wordBreak="break-word"
                    >
                      {isMatch ? renderFoundText(m.text, isActive) : m.text}
                    </Text>
                  </Box>
                </Flex>
                </Fragment>
              );
            })}
            {/* Sentinel bawah: terlihat = sudah sampai bawah -> tandai dibaca */}
            <Box ref={bottomRef} h="1px" w="full" flexShrink={0} />
          </VStack>

          {/* Kotak Ketik pesan... */}
          <Box p={4} flexShrink={0} bg="transparent">
            {emojiOpen && (
              <Flex wrap="wrap" gap={1} mb={2} p={2} bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="xl">
                {EMOJIS.map((em) => (
                  <Box key={em} as="button" fontSize="20px" p={1} borderRadius="md" cursor="pointer" _hover={{ bg: "var(--app-hover)" }} onClick={() => setText((t) => t + em)}>
                    {em}
                  </Box>
                ))}
              </Flex>
            )}
            <HStack gap={2} align="center">
              <HStack flex={1} bg="var(--app-card)" border="1px solid" borderColor="var(--app-border)" borderRadius="full" px={3} py={1} gap={1}>
                <Input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  placeholder="Ketik pesan..."
                  fontSize="sm"
                  color="var(--app-text)"
                  border="none"
                  bg="transparent"
                  p={0}
                  h="36px"
                  _placeholder={{ color: "var(--app-faint)" }}
                  _focus={{ boxShadow: "none" }}
                />
                <IconButton aria-label="Emoji" variant="ghost" size="xs" borderRadius="full" color="var(--app-muted)" _hover={{ bg: "var(--app-subtle)" }} onClick={() => setEmojiOpen((v) => !v)}>
                  <Smile size={18} />
                </IconButton>
              </HStack>
              <IconButton bg="blue.600" color="white" borderRadius="full" w="40px" h="40px" flexShrink={0} shadow="lg" _hover={{ bg: "blue.700" }} aria-label="Kirim" onClick={handleSend} disabled={!text.trim()}>
                <Send size={18} />
              </IconButton>
            </HStack>
          </Box>

          {/* Konfirmasi Clear chat di tengah, sama seperti DM */}
          <AnimatePresence>
            {clearConfirmOpen && (
              <Box position="absolute" inset={0} zIndex={35} display="flex" alignItems="center" justifyContent="center" bg="rgba(0, 0, 0, 0.4)" onClick={() => setClearConfirmOpen(false)}>
                <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18, ease: "easeOut" }} bg="var(--app-card)" borderRadius="xl" shadow="xl" border="1px solid" borderColor="var(--app-border)" p={5} w="340px" maxW="calc(100% - 48px)" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Text fontSize="md" fontWeight="medium" color="var(--app-text)">
                    Yakin ingin menghapus semua chat?
                  </Text>
                  <Flex justify="flex-end" gap={2} mt={5}>
                    <Button variant="ghost" borderRadius="lg" size="sm" color="var(--app-text)" _hover={{ bg: "var(--app-hover)" }} onClick={() => setClearConfirmOpen(false)}>
                      Tidak
                    </Button>
                    <Button
                      borderRadius="lg"
                      size="sm"
                      bg="red.500"
                      color="white"
                      _hover={{ bg: "red.600" }}
                      onClick={() => {
                        setClearConfirmOpen(false);
                        onClear();
                      }}
                    >
                      Ya, hapus
                    </Button>
                  </Flex>
                </MotionBox>
              </Box>
            )}
          </AnimatePresence>
        </>
      )}
    </Flex>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Flex,
  Spinner,
} from "@chakra-ui/react";
import {
  Send,
  Sparkles,
  Smile,
  EllipsisVertical,
  Search,
  Paintbrush,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnimatePresence, motion } from "framer-motion";
import {
  loadTeraMessages,
  saveTeraMessages,
  useSendTeraChat,
  type TeraMessage,
} from "./tera.service";
import {
  CHAT_THEMES,
  CHAT_THEME_DEFAULT_ID,
  chatThemeStorageKey,
  getChatTheme,
} from "./chat-theme";

const MotionBox = motion(Box);

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Daftar emoji: sama seperti kotak Ketik pesan di percakapan biasa.
const CHAT_EMOJIS: string[] = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🥰",
  "😎", "🤔", "😐", "🙄", "😴", "😷", "🤯", "🥳",
  "😭", "😡", "👍", "👎", "🙏", "👏", "💪", "✌️",
  "👀", "🙌", "🔥", "⭐", "🎉", "❤️", "💙", "💔",
];

export default function TeraChatView({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<TeraMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const sendMutation = useSendTeraChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  // ===== Menu titik tiga header (Search / Chat theme / Clear chat) =====
  // Isi + fungsi sama persis seperti DM & Komunitas — tanpa "Block".
  const [menuOpen, setMenuOpen] = useState(false);

  // ===== Chat theme per-Tera AI (lokal, sama seperti DM) =====
  const [themeView, setThemeView] = useState<null | "preview" | "all">(null);
  const [chatThemeId, setChatThemeId] = useState<string>(CHAT_THEME_DEFAULT_ID);
  const activeTheme = getChatTheme(chatThemeId);

  // ===== Find dalam percakapan (ala VS Code, sama seperti DM) =====
  const [isFinding, setIsFinding] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ===== Clear chat: kotak konfirmasi tengah, sama seperti DM =====
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    setMessages(loadTeraMessages(currentUserId));
    try {
      const saved = localStorage.getItem(
        chatThemeStorageKey(`tera-ai-${currentUserId}`),
      );
      setChatThemeId(saved || CHAT_THEME_DEFAULT_ID);
    } catch {
      setChatThemeId(CHAT_THEME_DEFAULT_ID);
    }
    setThemeView(null);
    setMenuOpen(false);
    setIsFinding(false);
    setFindQuery("");
    setFindIndex(0);
    setClearConfirmOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    // Saat mode Find aktif jangan auto-scroll ke bawah biar posisi hasil tetap.
    if (isFinding) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMutation.isPending, isFinding]);

  const applyChatTheme = (id: string) => {
    setChatThemeId(id);
    try {
      if (id === CHAT_THEME_DEFAULT_ID) {
        localStorage.removeItem(chatThemeStorageKey(`tera-ai-${currentUserId}`));
      } else {
        localStorage.setItem(chatThemeStorageKey(`tera-ai-${currentUserId}`), id);
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

  const findMatches = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!isFinding || !q) return [];
    return messages.filter((m) => m.text.toLowerCase().includes(q)).map((m) => m.id);
  }, [findQuery, messages, isFinding]);

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
    setMenuOpen(false);
  };

  const handleConfirmClearChat = () => {
    setMessages([]);
    try {
      saveTeraMessages(currentUserId, []);
    } catch {
      // abaikan
    }
    setClearConfirmOpen(false);
  };

  const renderFoundText = (txt: string, isActive: boolean) => {
    const q = findQuery.trim();
    if (!isFinding || !q) return txt;
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

  const handleSend = () => {
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setError(null);
    const userMsg: TeraMessage = {
      id: newId(),
      role: "user",
      text: text.slice(0, 2000),
      createdAt: new Date().toISOString(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    saveTeraMessages(currentUserId, next);
    setInput("");

    const history = next.slice(-20).map((m) => ({
      role: m.role,
      content: m.text,
    }));

    sendMutation.mutate(
      { message: userMsg.text, history },
      {
        onSuccess: (res) => {
          const reply: TeraMessage = {
            id: newId(),
            role: "assistant",
            text: res.data.reply,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => {
            const updated = [...prev, reply];
            saveTeraMessages(currentUserId, updated);
            return updated;
          });
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Gagal menghubungi Tera AI. Coba lagi ya.";
          setError(msg);
        },
      },
    );
  };

  return (
    <Flex flex={1} direction="column" h="full" minH={0} position="relative" bg={themeView ? "var(--app-card)" : undefined} style={themeView ? undefined : { background: activeTheme.chatBackground }}>
      {themeView ? (
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
          {/* Header ala DM biasa + menu titik tiga kanan */}
          <Box position="relative" zIndex={10}>
            <Flex
              px={5}
              py={4}
              bg="var(--app-card)"
              borderBottom="1px solid"
              borderColor="var(--app-hover)"
              align="center"
              gap={3}
              flexShrink={0}
              shadow="sm"
              position="relative"
            >
              <Box
                w="44px"
                h="44px"
                borderRadius="full"
                bg="blue.600"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Sparkles size={22} color="white" />
              </Box>
              <VStack align="start" gap={0} flex={1} minW={0}>
                <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
                  Tera AI
                </Text>
                <Text fontSize="xs" color="green.500" fontWeight="medium">
                  Online
                </Text>
              </VStack>
              <Avatar style={{ width: "0px", height: "0px", display: "none" }}>
                <AvatarFallback>T</AvatarFallback>
              </Avatar>
              <Box position="relative">
                <IconButton
                  aria-label="Menu percakapan"
                  variant="ghost"
                  size="sm"
                  borderRadius="full"
                  color="var(--app-muted)"
                  _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                  onClick={() => setMenuOpen((v) => !v)}
                >
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

          {/* Isi percakapan */}
          <VStack
            flex={1}
            overflowY="auto"
            align="stretch"
            gap={3}
            px={5}
            py={5}
            minH={0}
            bg="transparent"
          >
            {messages.length === 0 && (
              <VStack py={10} gap={2} textAlign="center">
                <Box
                  w="56px"
                  h="56px"
                  borderRadius="full"
                  bg="blue.600"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Sparkles size={28} color="white" />
                </Box>
                <Text fontWeight="bold" color="var(--app-text)">
                  Halo, aku Tera AI!
                </Text>
                <Text fontSize="sm" color="var(--app-muted)" maxW="320px">
                  Tanya apa saja soal Lentera atau hal lain!
                </Text>
              </VStack>
            )}
            {messages.map((m) => {
              const isMe = m.role === "user";
              const q = findQuery.trim().toLowerCase();
              const isMatch = isFinding && !!q && m.text.toLowerCase().includes(q);
              const isActive = isMatch && m.id === findActiveId;
              return (
                <Flex
                  key={m.id}
                  justify={isMe ? "flex-end" : "flex-start"}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) messageRefs.current.set(m.id, el as unknown as HTMLDivElement);
                    else messageRefs.current.delete(m.id);
                  }}
                  scrollMarginTop="16px"
                  scrollMarginBottom="16px"
                >
                  <Box
                    maxW="75%"
                    px={4}
                    py={2.5}
                    borderRadius="2xl"
                    borderBottomRightRadius={isMe ? "0" : "2xl"}
                    borderBottomLeftRadius={!isMe ? "0" : "2xl"}
                    bg={isActive ? (isMe ? "orange.400" : "orange.100") : isMe ? activeTheme.meBg : activeTheme.otherBg}
                    color={isActive && !isMe ? "black" : isMe ? activeTheme.meText : activeTheme.otherText}
                    fontSize="sm"
                    whiteSpace="pre-wrap"
                    wordBreak="break-word"
                    shadow={isActive ? "md" : "sm"}
                    border={isActive || !isMe ? "2px solid" : "none"}
                    borderColor={isActive ? "orange.500" : activeTheme.otherBorder}
                  >
                    {isMatch ? renderFoundText(m.text, isActive) : m.text}
                  </Box>
                </Flex>
              );
            })}
            {sendMutation.isPending && (
              <Flex justify="flex-start">
                <HStack
                  px={4}
                  py={2.5}
                  borderRadius="2xl"
                  bg="var(--app-subtle)"
                  gap={2}
                >
                  <Spinner size="xs" color="blue.500" />
                  <Text fontSize="sm" color="var(--app-muted)">
                    Tera mengetik...
                  </Text>
                </HStack>
              </Flex>
            )}
            {error && (
              <Text fontSize="xs" color="red.500" textAlign="center">
                {error}
              </Text>
            )}
            <Box ref={bottomRef} />
          </VStack>

          {/* Input ala DM + icon emoji di kanan dalam (tanpa file/galeri) */}
          <Box px={5} pb={5} pt={2} flexShrink={0} position="relative" bg="transparent">
            {emojiOpen && (
              <>
                <Box
                  position="fixed"
                  inset={0}
                  zIndex={40}
                  bg="transparent"
                  onClick={() => setEmojiOpen(false)}
                />
                <Box
                  position="absolute"
                  bottom="76px"
                  right={5}
                  zIndex={41}
                  bg="var(--app-card)"
                  borderRadius="xl"
                  boxShadow="lg"
                  border="1px solid"
                  borderColor="var(--app-border)"
                  p={3}
                  w="260px"
                >
                  <Flex wrap="wrap" gap={1} maxH="180px" overflowY="auto">
                    {CHAT_EMOJIS.map((emoji) => (
                      <Box
                        key={emoji}
                        as="button"
                        fontSize="xl"
                        w="32px"
                        h="32px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: "var(--app-subtle)" }}
                        onClick={() =>
                          setInput((prev) => (prev + emoji).slice(0, 2000))
                        }
                      >
                        {emoji}
                      </Box>
                    ))}
                  </Flex>
                </Box>
              </>
            )}
            <HStack gap={2} align="center">
              <Box position="relative" flex={1} display="flex" alignItems="center">
                <Input
                  placeholder="Tanya Tera AI..."
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  fontSize="sm"
                  bg="var(--app-input)"
                  color="var(--app-text)"
                  border="1px solid"
                  borderColor="var(--app-border)"
                  borderRadius="2xl"
                  pl={4}
                  pr="44px"
                  py={2}
                  _placeholder={{ color: "var(--app-faint)" }}
                />
                <IconButton
                  aria-label="Pilih emoji"
                  variant="ghost"
                  size="xs"
                  borderRadius="full"
                  color="var(--app-muted)"
                  _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                  position="absolute"
                  right={2}
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={() => setEmojiOpen((v) => !v)}
                >
                  <Smile size={18} />
                </IconButton>
              </Box>
              <IconButton
                bg="blue.600"
                color="white"
                borderRadius="full"
                w="40px"
                h="40px"
                flexShrink={0}
                aria-label="Kirim ke Tera AI"
                onClick={handleSend}
                loading={sendMutation.isPending}
                disabled={!input.trim() || sendMutation.isPending}
                _hover={{ bg: "blue.700" }}
              >
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
                      onClick={handleConfirmClearChat}
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

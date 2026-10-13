"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  Input,
  Button,
  IconButton,
  Dialog,
  Spinner,
  Flex,
  SimpleGrid,
} from "@chakra-ui/react";
import { X, Search, Link2, Check, CircleFadingPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

// Glyph Whatsapp (lucide tidak menyediakan ikon brand).
const WhatsappIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="black"
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
import { PostResponseSingle } from "./post.interface";
import { useSuggestions, useSearchUsers } from "../profile/suggestion.service";
import {
  useConversations,
  useCreateConversation,
  useSendMessage,
} from "../messages/chat.service";
import { POST_SHARE_DEFAULT_TEXT } from "../messages/chat.interface";

interface SharePostModalProps {
  post: PostResponseSingle;
  open: boolean;
  onClose: () => void;
}

interface ShareAccount {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
}

// Kotak tengah "Berbagi": header + pencarian + daftar akun (4 sebaris,
// maksimal 5 baris). Pilih akun → bawah jadi kotak tulis pesan + tombol
// biru Kirim (1 akun) / Kirim Secara Terpisah (2+ akun).
export const SharePostModal = ({ post, open, onClose }: SharePostModalProps) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  // Mode cari: aktif saat kotak pencarian dipencet (fokus) atau ada teks.
  // Grid 4 sebaris diganti daftar vertikal + hasil dari semua akun.
  // Sekali nyeklis di mode urut, mode-nya dikunci (tidak balik ke grid).
  const [searchFocused, setSearchFocused] = useState(false);
  const [listPinned, setListPinned] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  const { data: conversationsData, isLoading: conversationsLoading } =
    useConversations();
  const { data: suggestionsData, isLoading: suggestionsLoading } =
    useSuggestions();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  // Cari bebas ke semua akun (di luar chat/follow), via server.
  const { data: searchUsersData, isLoading: searchUsersLoading } =
    useSearchUsers(query);

  // Tutup/buka ulang → pilihan & pesan & mode cari di-reset.
  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setMessage("");
      setCopied(false);
      setSearchFocused(false);
      setListPinned(false);
    }
  }, [open ]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    };
  }, []);

  const handleSearchFocus = () => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setSearchFocused(true);
  };

  const handleSearchBlur = () => {
    // Tunda sedikit biar tap pada buletan/baris daftar sempat kepencet
    // dulu (termasuk saat keyboard HP nutup saat tap pertama).
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(() => {
      setSearchFocused(false);
    }, 400);
  };

  // Urutan akun: yang sering berbincang di message dulu,
  // baru yang diikuti / mengikuti. Duplikat dibuang.
  const accounts: ShareAccount[] = (() => {
    const seen = new Set<string>();
    const list: ShareAccount[] = [];
    for (const c of conversationsData?.data ?? []) {
      const u = c.otherUser;
      if (!u || seen.has(u.id)) continue;
      seen.add(u.id);
      list.push({ id: u.id, name: u.name, username: u.username, avatar: u.avatar });
    }
    for (const u of suggestionsData?.data ?? []) {
      if (!u || seen.has(u.id)) continue;
      seen.add(u.id);
      list.push({ id: u.id, name: u.name, username: u.username, avatar: u.avatar });
    }
    return list;
  })();

  const q = query.trim().toLowerCase();
  // Mode daftar vertikal saat kotak pencarian dipencet / ada teks /
  // sudah nyeklis di mode urut (dikunci biar tidak balik ke grid).
  const searchMode = searchFocused || q.length > 0 || listPinned;
  const filtered = q
    ? accounts.filter(
        (a) =>
          a.username.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q),
      )
    : accounts;
  // 4 akun sebaris x maksimal 5 baris (mode grid).
  const shown = filtered.slice(0, 20);
  // Mode cari + ada teks → hasil dari semua akun (server), bukan
  // cuma rekomendasi. Tanpa teks → daftar vertikal akun yang sama.
  const searchAccounts: ShareAccount[] = (searchUsersData?.data ?? []).map(
    (u) => ({ id: u.id, name: u.name, username: u.username, avatar: u.avatar }),
  );
  const listShown = q ? searchAccounts : accounts.slice(0, 20);

  const isLoading = conversationsLoading || suggestionsLoading;
  const listLoading = q ? searchUsersLoading : isLoading;
  const postLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/post/${post.id}`
      : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postLink);
    } catch {
      /* clipboard tidak tersedia, abaikan */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleShareWhatsapp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Lihat postingan ini: ${postLink}`)}`,
      "_blank",
    );
  };

  const handleAddToStory = () => {
    // Tahap 2: postingan gambar + video bisa dibagikan ke story.
    // Video pakai URL asli, durasi dipotong 30 detik di viewer.
    const medias = post.medias ?? [];
    if (medias.length === 0) {
      Swal.fire({
        title: "Tidak bisa",
        text: "Postingan ini tidak ada medianya.",
        icon: "warning",
        timer: 1800,
        showConfirmButton: false,
      });
      return;
    }
    onClose();
    router.push(`/story?postId=${encodeURIComponent(post.id)}`);
  };

  const toggleSelect = (id: string, fromList = false) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((v) => v !== id)
        : [...prev, id];
      // Nyeklis di mode urut → kunci di mode urut (tidak balik ke grid).
      // Batal semua pilihan → kunci lepas (balik grid kalau cari kosong).
      if (fromList) setListPinned(next.length > 0);
      return next;
    });
  };

  // Kirim postingan ke tiap akun terpilih (terpisah satu per satu).
  // Isi pesan: snapshot postingan (kotak di percakapan) + teks ketikan.
  const handleSend = async () => {
    if (selectedIds.length === 0 || sending) return;
    setSending(true);
    try {
      const firstMedia = post.medias?.[0];
      const firstUrl = firstMedia?.url ?? "";
      const firstType = (firstMedia as { type?: string } | undefined)?.type;
      const isVideo =
        firstType === "video" ||
        /\.(mp4|mov|webm|m4v)(\?|$)/i.test(firstUrl);
      const typed = message.trim();
      const text = typed || POST_SHARE_DEFAULT_TEXT;
      for (const userId of selectedIds) {
        const conv = await createConversation.mutateAsync(userId);
        const conversationId = conv?.data?.id;
        if (!conversationId) continue;
        await sendMessage.mutateAsync({
          conversationId,
          text,
          postId: post.id,
          postMediaUrl: firstUrl || null,
          postMediaType: isVideo ? "video" : "image",
          postOwnerUsername:
            post.user?.username ?? post.user?.name ?? null,
          postOwnerAvatar: post.user?.avatar ?? null,
          postContent: post.content?.trim() ? post.content.trim() : null,
          postMediaCount: post.medias?.length ?? 0,
        });
      }
      setSelectedIds([]);
      setMessage("");
      onClose();
      Swal.fire({
        title: "Terkirim",
        text: "Postingan berhasil dikirim ke pesan.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        title: "Gagal",
        text: "Postingan gagal dikirim, coba lagi.",
        icon: "error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      placement="center"
      size="xs"
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg="var(--app-card)" color="var(--app-text)" borderRadius="xl" overflow="hidden">
          <Dialog.Header
            position="relative"
            justifyContent="center"
            borderBottomWidth="1px"
            borderColor="var(--app-border)"
            py={4}
          >
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
              onClick={onClose}
            >
              <X size={22} color="var(--app-text)" />
            </IconButton>
            <Dialog.Title fontWeight="bold" color="var(--app-text)">Berbagi</Dialog.Title>
          </Dialog.Header>

          <Dialog.Body px={4} py={4}>
            <VStack align="stretch" gap={4}>
              {/* Kotak pencarian */}
              <HStack
                bg="var(--app-subtle)"
                borderRadius="full"
                px={4}
                py={2}
                gap={2}
              >
                <Search size={18} color="var(--app-muted)" />
                <Input
                  placeholder="Cari"
                  variant="flushed"
                  border="none"
                  _focus={{ border: "none", boxShadow: "none" }}
                  fontSize="sm"
                  color="var(--app-text)"
                  _placeholder={{ color: "var(--app-muted)" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                />
              </HStack>

              {/* Mode cari: daftar vertikal (avatar kiri, username kanan,
                  buletan kanan). Selain itu: grid 4 sebaris. */}
              {searchMode ? (
                listLoading ? (
                  <Flex py={8} justify="center">
                    <Spinner size="md" color="blue.500" />
                  </Flex>
                ) : listShown.length === 0 ? (
                  <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={6}>
                    {q ? "Akun tidak ditemukan." : "Belum ada akun."}
                  </Text>
                ) : (
                  <Box maxH="420px" overflowY="auto" overflowX="hidden">
                    <VStack align="stretch" gap={1}>
                      {listShown.map((a) => {
                        const selected = selectedIds.includes(a.id);
                        return (
                          <HStack
                            key={a.id}
                            gap={3}
                            py={2}
                            px={1}
                            borderRadius="lg"
                            cursor="pointer"
                            _hover={{ bg: "var(--app-input)" }}
                            onClick={() => toggleSelect(a.id, true)}
                          >
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="full"
                              overflow="hidden"
                              bg="var(--app-subtle)"
                              flexShrink={0}
                            >
                              <Image
                                src={a.avatar || "/default-avatar.jpg"}
                                alt={a.username}
                                w="full"
                                h="full"
                                objectFit="cover"
                              />
                            </Box>
                            <Text
                              fontSize="sm"
                              fontWeight="medium"
                              color="var(--app-text)"
                              flex={1}
                              minW={0}
                              truncate
                            >
                              {a.username}
                            </Text>
                            {/* Buletan kanan: area sentuh diperlebar + handler
                                sendiri biar tap kecil tetap kena. */}
                            <Box
                              p={2}
                              mr={-2}
                              cursor="pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(a.id, true);
                              }}
                            >
                              <Flex
                                w="24px"
                                h="24px"
                                borderRadius="full"
                                align="center"
                                justify="center"
                                flexShrink={0}
                                bg={selected ? "blue.500" : "transparent"}
                                border={
                                  selected
                                    ? "2px solid #3182ce"
                                    : "2px solid #cbd5e0"
                                }
                              >
                                {selected && (
                                  <Check size={14} color="white" />
                                )}
                              </Flex>
                            </Box>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )
              ) : /* Daftar akun grid: 4 sebaris, maksimal 5 baris */
              isLoading ? (
                <Flex py={8} justify="center">
                  <Spinner size="md" color="blue.500" />
                </Flex>
              ) : shown.length === 0 ? (
                <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={6}>
                  Belum ada akun.
                </Text>
              ) : (
                <Box maxH="420px" overflowY="auto">
                  <SimpleGrid columns={4} gap={4}>
                    {shown.map((a) => {
                      const selected = selectedIds.includes(a.id);
                      return (
                        <VStack
                          key={a.id}
                          gap={1}
                          cursor="pointer"
                          onClick={() => toggleSelect(a.id)}
                        >
                          <Box position="relative" w="56px" h="56px">
                            <Box
                              w="full"
                              h="full"
                              borderRadius="full"
                              overflow="hidden"
                              bg="var(--app-subtle)"
                            >
                              <Image
                                src={a.avatar || "/default-avatar.jpg"}
                                alt={a.username}
                                w="full"
                                h="full"
                                objectFit="cover"
                              />
                            </Box>
                            {selected && (
                              <Flex
                                position="absolute"
                                bottom={0}
                                right={0}
                                w="20px"
                                h="20px"
                                borderRadius="full"
                                bg="blue.500"
                                border="2px solid white"
                                align="center"
                                justify="center"
                              >
                                <Check size={12} color="white" />
                              </Flex>
                            )}
                          </Box>
                          <Text
                            fontSize="xs"
                            color="var(--app-text)"
                            maxW="full"
                            truncate
                          >
                            {a.username}
                          </Text>
                        </VStack>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              )}

              {/* Bawah: belum pilih akun → Salin tautan & Whatsapp.
                  Sudah pilih akun → kotak tulis pesan + tombol biru. */}
              {selectedIds.length === 0 ? (
                <HStack
                  gap={6}
                  justify="flex-start"
                  borderTopWidth="1px"
                  borderColor="var(--app-border)"
                  pt={4}
                >
                  <VStack gap={1} cursor="pointer" onClick={handleAddToStory}>
                    <Flex
                      w="48px"
                      h="48px"
                      borderRadius="full"
                      bg="var(--app-subtle)"
                      align="center"
                      justify="center"
                    >
                      <CircleFadingPlus size={22} color="var(--app-text)" />
                    </Flex>
                    <VStack gap={0} align="center">
                      <Text fontSize="xs" color="var(--app-text)" lineHeight="1.2">
                        Tambahkan
                      </Text>
                      <Text fontSize="xs" color="var(--app-text)" lineHeight="1.2">
                        ke story
                      </Text>
                    </VStack>
                  </VStack>
                  <VStack gap={1} cursor="pointer" onClick={handleCopyLink}>
                    <Flex
                      w="48px"
                      h="48px"
                      borderRadius="full"
                      bg="var(--app-subtle)"
                      align="center"
                      justify="center"
                    >
                      {copied ? (
                        <Check size={22} color="#16a34a" />
                      ) : (
                        <Link2 size={22} color="var(--app-text)" />
                      )}
                    </Flex>
                    <Text fontSize="xs" color="var(--app-text)">
                      {copied ? "Disalin!" : "Salin tautan"}
                    </Text>
                  </VStack>
                  <VStack gap={1} cursor="pointer" onClick={handleShareWhatsapp}>
                    <Flex
                      w="48px"
                      h="48px"
                      borderRadius="full"
                      bg="var(--app-subtle)"
                      align="center"
                      justify="center"
                    >
                      <WhatsappIcon size={24} />
                    </Flex>
                    <Text fontSize="xs" color="var(--app-text)">
                      Whatsapp
                    </Text>
                  </VStack>
                </HStack>
              ) : (
                <VStack
                  align="stretch"
                  gap={3}
                  borderTopWidth="1px"
                  borderColor="var(--app-border)"
                  pt={4}
                >
                  <Input
                    placeholder="Tulis pesan..."
                    variant="flushed"
                    border="none"
                    _focus={{ border: "none", boxShadow: "none" }}
                    fontSize="sm"
                    color="var(--app-text)"
                    _placeholder={{ color: "var(--app-muted)" }}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button
                    colorPalette="blue"
                    borderRadius="lg"
                    w="full"
                    loading={sending}
                    disabled={sending}
                    onClick={handleSend}
                  >
                    {selectedIds.length >= 2
                      ? "Kirim Secara Terpisah"
                      : "Kirim"}
                  </Button>
                </VStack>
              )}
            </VStack>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

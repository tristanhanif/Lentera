"use client";
import dynamic from "next/dynamic";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  Spinner,
  Flex,
  Button,
  Image,
  IconButton,
} from "@chakra-ui/react";
import { Search, X, Copy, SquarePlay, Images } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useGetFeed } from "../post/post.service";
import { PostDetailModal } from "../post/PostDetailModal";
import { PostResponseSingle } from "../post/post.interface";
import { useSearchUsers } from "../profile/suggestion.service";
import {
  useExploreCommunities,
  useJoinCommunity,
  type ExploreCommunity,
} from "../messages/community.service";
import {
  useExploreChannels,
  useFollowChannel,
  type ExploreChannel,
} from "../messages/channel.service";

// Riwayat pencarian akun di explore (ala IG): tersimpan di localStorage.
interface SearchHistoryItem {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
}

const SEARCH_HISTORY_KEY = "explore_search_history";

// Ambang wide: lebar / tinggi >= 1.3 dianggap 16:9 (16:9=1.77, 3:2=1.5).
// Deteksi dari dimensi asli slide-1.
const WIDE_THRESHOLD = 1.3;

function isVideoUrl(url: string, type?: string) {
  if (type === "video") return true;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

// Satu kotak postingan explore. Ukuran kotak ngikutin frame:
// - wide=true -> 16:9 fix (buat tumpukan atas-bawah)
// - wide=false -> asli slide-1 (1:1 / 4:5 / asli), fallback 1:1.
// Thumbnail selalu dari slide-1 + icon kanan-atas.
// onDetect dipanggil saat dimensi asli ketahuan (dari elemen yang kepajang,
// jadi pasti akurat — nggak preload terpisah yang bisa gagal CORS/video).
function ExploreMediaBox({
  post,
  wide,
  aspect,
  onClick,
  onDetect,
}: {
  post: PostResponseSingle;
  wide: boolean;
  aspect?: string;
  onClick: () => void;
  onDetect?: (postId: string, w: number, h: number) => void;
}) {
  const firstMedia = post.medias?.[0];
  const mediaCount = post.medias?.length ?? 0;
  const firstUrl = firstMedia?.url ?? "";
  const isFirstVideo = firstMedia
    ? isVideoUrl(firstUrl, (firstMedia as { type?: string }).type)
    : false;
  const showPlay = !!firstMedia && isFirstVideo;
  const showStacked = !!firstMedia && mediaCount > 1 && !isFirstVideo;
  const showPhoto = !!firstMedia && mediaCount === 1 && !isFirstVideo;
  const boxAspect = wide ? "16 / 9" : aspect ?? "1 / 1";

  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      position="relative"
      overflow="hidden"
      borderRadius="md"
      bg="var(--app-subtle)"
      w="full"
      style={{ aspectRatio: boxAspect }}
      _hover={{ opacity: 0.9 }}
      flexShrink={0}
    >
      {firstMedia ? (
        isFirstVideo ? (
          <video
            src={firstUrl}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight)
                onDetect?.(post.id, v.videoWidth, v.videoHeight);
            }}
          />
        ) : (
          <Image
            src={firstUrl}
            alt="Postingan"
            w="full"
            h="full"
            objectFit="cover"
            onLoad={(e) => {
              const img = e.currentTarget;
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              if (w && h) onDetect?.(post.id, w, h);
            }}
          />
        )
      ) : (
        <Flex
          w="full"
          h="full"
          align="center"
          justify="center"
          p={2}
          bgGradient="linear(to-b, blue.500, blue.700)"
        >
          <Text fontSize="xs" color="white" lineClamp={4} textAlign="center">
            {post.content}
          </Text>
        </Flex>
      )}
      {(showStacked || showPlay || showPhoto) && (
        <Box
          position="absolute"
          right={2}
          top={2}
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))" }}
        >
          {showStacked ? (
            <Copy size={18} />
          ) : showPlay ? (
            <SquarePlay size={18} />
          ) : (
            <Images size={18} />
          )}
        </Box>
      )}
      {mediaCount > 1 && (
        <HStack
          position="absolute"
          bottom={2}
          left="50%"
          transform="translateX(-50%)"
          gap={1}
        >
          {post.medias.map((_, i) => (
            <Box
              key={i}
              w="6px"
              h="6px"
              borderRadius="full"
              bg={i === 0 ? "white" : "transparent"}
              border={i === 0 ? "none" : "1px solid white"}
            />
          ))}
        </HStack>
      )}
    </Box>
  );
}

// Slot kosong 16:9 — dibiarin kosong biar posisi geser tetap rapi.
function ExploreEmptyWide() {
  return (
    <Box w="full" style={{ aspectRatio: "16 / 9" }} flexShrink={0} />
  );
}

// Komunitas Populer (real backend): khusus promosi yang BELUM Gabung.
// Yang sudah Gabung disembunyikan (tidak ditampilkan di kotak ini).
// Gabung -> modal konfirmasi -> direct ke chat.
function KomunitasPopulerCard() {
  const router = useRouter();
  const { data, isLoading } = useExploreCommunities();
  const joinMutation = useJoinCommunity();
  const [pending, setPending] = useState<ExploreCommunity | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const list = (data?.data ?? []).filter((c) => !c.isMember).slice(0, 6);

  const handleJoin = (c: ExploreCommunity) => {
    if (c.isMember) {
      router.push(`/messages?community=${encodeURIComponent(c.id)}`);
      return;
    }
    setPending(c);
  };

  const confirmJoin = () => {
    if (!pending || joiningId) return;
    setJoiningId(pending.id);
    joinMutation.mutate(pending.id, {
      onSuccess: (res: { data?: { id?: string } }) => {
        const cid = res?.data?.id ?? pending.id;
        setPending(null);
        setJoiningId(null);
        router.push(`/messages?community=${encodeURIComponent(cid)}`);
      },
      onError: (err: unknown) => {
        setJoiningId(null);
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Gagal bergabung ke komunitas";
        Swal.fire({
          title: "Gagal",
          text: msg,
          icon: "error",
          timer: 2200,
          showConfirmButton: false,
        });
      },
    });
  };

  return (
    <>
      <Box bg="var(--app-card)" p={5} borderRadius="2xl" border="1px solid" borderColor="var(--app-border)" shadow="sm" w="full">
        <Heading size="md" mb={4} color="var(--app-text)" fontWeight="bold">Komunitas Populer</Heading>
        {isLoading ? (
          <Flex justify="center" py={4}>
            <Spinner size="md" color="blue.500" />
          </Flex>
        ) : list.length === 0 ? (
          <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
            Belum ada komunitas
          </Text>
        ) : (
          <VStack gap={3} align="stretch">
            {list.map((c) => (
              <Flex key={c.id} align="center" gap={3}>
                <Box w="40px" h="40px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.avatarUrl || "/icon-komunitas.png"}
                    alt={c.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <VStack align="start" gap={0} flex={1} minW={0}>
                  <Text fontWeight="bold" fontSize="sm" color="var(--app-text)" truncate w="full">
                    {c.name}
                  </Text>
                  <Text fontSize="xs" color="var(--app-muted)" truncate w="full">
                    {c.memberCount} Anggota{c.ownerUsername ? ` • @${c.ownerUsername}` : ""}
                  </Text>
                </VStack>
                <Button
                  size="xs"
                  borderRadius="full"
                  variant="outline"
                  colorPalette="blue"
                  flexShrink={0}
                  onClick={() => handleJoin(c)}
                >
                  Gabung
                </Button>
              </Flex>
            ))}
          </VStack>
        )}
      </Box>

      {pending && (
        <Box
          position="fixed"
          inset={0}
          zIndex={1400}
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          px={4}
          onClick={() => !joiningId && setPending(null)}
        >
          <Box
            bg="var(--app-card)"
            borderRadius="2xl"
            border="1px solid"
            borderColor="var(--app-border)"
            shadow="lg"
            maxW="360px"
            w="full"
            p={6}
            onClick={(e) => e.stopPropagation()}
          >
            <VStack gap={3} align="stretch">
              <Box w="72px" h="72px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" mx="auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pending.avatarUrl || "/icon-komunitas.png"}
                  alt={pending.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <Text fontSize="sm" color="var(--app-text)" textAlign="center" fontWeight="medium">
                Ingin Bergabung dengan komunitas {pending.name}?
              </Text>
              <Flex justify="flex-end" gap={2} pt={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  borderRadius="full"
                  disabled={!!joiningId}
                  onClick={() => setPending(null)}
                >
                  Tidak
                </Button>
                <Button
                  size="sm"
                  colorPalette="blue"
                  borderRadius="full"
                  loading={!!joiningId}
                  onClick={confirmJoin}
                >
                  Ya, Gabung
                </Button>
              </Flex>
            </VStack>
          </Box>
        </Box>
      )}
    </>
  );
}

// Saluran populer (real backend): khusus promosi yang BELUM Follow.
// Yang sudah Follow / milik sendiri disembunyikan (tidak ditampilkan di kotak ini).
// - Pencet nama saluran -> preview isi chat dulu (tanpa langsung follow),
//   direct ke /messages?channel=:id.
// - Pencet tombol Follow -> langsung gabung lalu direct ke chat salurannya.
function SaluranPopulerCard() {
  const router = useRouter();
  const { data, isLoading } = useExploreChannels();
  const followMutation = useFollowChannel();
  const [followingId, setFollowingId] = useState<string | null>(null);
  const list = (data?.data ?? [])
    .filter((c) => !c.isFollowing && !c.isOwner)
    .slice(0, 6);

  const handleOpenPreview = (c: ExploreChannel) => {
    router.push(`/messages?channel=${encodeURIComponent(c.id)}`);
  };

  const handleFollow = (c: ExploreChannel) => {
    if (c.isFollowing || c.isOwner) {
      router.push(`/messages?channel=${encodeURIComponent(c.id)}`);
      return;
    }
    setFollowingId(c.id);
    followMutation.mutate(c.id, {
      onSuccess: (res: { data?: { id?: string } }) => {
        const cid = res?.data?.id ?? c.id;
        setFollowingId(null);
        router.push(`/messages?channel=${encodeURIComponent(cid)}`);
      },
      onError: (err: unknown) => {
        setFollowingId(null);
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Gagal mengikuti saluran";
        Swal.fire({
          title: "Gagal",
          text: msg,
          icon: "error",
          timer: 2200,
          showConfirmButton: false,
        });
      },
    });
  };

  return (
    <Box bg="var(--app-card)" p={5} borderRadius="2xl" border="1px solid" borderColor="var(--app-border)" shadow="sm" w="full">
      <Heading size="md" mb={4} color="var(--app-text)" fontWeight="bold">Saluran</Heading>
      {isLoading ? (
        <Flex justify="center" py={4}>
          <Spinner size="md" color="blue.500" />
        </Flex>
      ) : list.length === 0 ? (
        <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
          Belum ada saluran
        </Text>
      ) : (
        <VStack gap={3} align="stretch">
          {list.map((c) => (
            <Flex key={c.id} align="center" gap={3}>
              <Box w="40px" h="40px" borderRadius="full" overflow="hidden" bg="var(--app-subtle)" border="1px solid" borderColor="var(--app-border)" flexShrink={0}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatarUrl || "/icon-saluran.svg"}
                  alt={c.name}
                  className={c.avatarUrl ? undefined : "channel-logo-default"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <VStack align="start" gap={0} flex={1} minW={0}>
                <Text
                  fontWeight="bold"
                  fontSize="sm"
                  color="var(--app-text)"
                  truncate
                  w="full"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => handleOpenPreview(c)}
                  title={`Lihat saluran ${c.name}`}
                >
                  {c.name}
                </Text>
                <Text fontSize="xs" color="var(--app-muted)" truncate w="full">
                  {c.followerCount} followers{c.ownerUsername ? ` • @${c.ownerUsername}` : ""}
                </Text>
              </VStack>
              <Button
                size="xs"
                borderRadius="full"
                variant="outline"
                colorPalette="blue"
                flexShrink={0}
                loading={followingId === c.id}
                onClick={() => handleFollow(c)}
              >
                Follow
              </Button>
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  );
}

function ExplorePage() {
  const [searchInput, setSearchInput] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<PostResponseSingle | null>(null);
  const { data, isFetching, isLoading, query, setQuery } = useGetFeed();
  const { data: searchUsersData, isLoading: searchUsersLoading } =
    useSearchUsers(submittedSearch);

  // Mode riwayat pencarian: aktif saat kotak pencarian dipencet (fokus)
  // dan belum ada pencarian yang dikirim.
  const [searchFocused, setSearchFocused] = useState(false);
  const blurTimerRef = useRef<number | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      if (typeof window === "undefined") return [];
      try {
        const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
        return raw ? (JSON.parse(raw) as SearchHistoryItem[]) : [];
      } catch {
        return [];
      }
    },
  );

  // Simpan riwayat tiap kali berubah.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SEARCH_HISTORY_KEY,
        JSON.stringify(searchHistory),
      );
    } catch {
      /* storage tidak tersedia, abaikan */
    }
  }, [searchHistory]);

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
    // Kotak dipencet -> semua konten bawah diganti riwayat pencarian
    // (hasil pencarian lama disembunyikan, teks ketikan tetap ada).
    setSubmittedSearch("");
  };

  const handleSearchBlur = () => {
    // Tunda sedikit biar klik pada baris riwayat / ikon silang sempat kena.
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
    blurTimerRef.current = window.setTimeout(
      () => setSearchFocused(false),
      200,
    );
  };

  // Akun dipencet dari hasil pencarian -> masuk riwayat (paling atas).
  const addToSearchHistory = (user: {
    id: string;
    name: string;
    username?: string;
    avatar?: string | null;
  }) => {
    const username = user.username ?? "";
    if (!username) return;
    setSearchHistory((prev) => {
      const rest = prev.filter((h) => h.username !== username);
      return [
        {
          id: user.id,
          username,
          name: user.name,
          avatar: user.avatar ?? null,
        },
        ...rest,
      ].slice(0, 20);
    });
  };

  const removeFromSearchHistory = (username: string) => {
    setSearchHistory((prev) => prev.filter((h) => h.username !== username));
  };

  const clearSearchHistory = () => setSearchHistory([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery({ ...query, search: searchInput, page: 1 });
    setSubmittedSearch(searchInput);
  };

  const posts = data?.data ?? [];
  const searchUsers = searchUsersData?.data ?? [];
  // Kotak pencarian dipencet -> konten kiri bawah diganti riwayat pencarian.
  const showHistory = searchFocused && !submittedSearch;

  // Deteksi frame asli slide-1 tiap postingan (buat nentuin 16:9 vs normal).
  // wide = rasio >= 1.3. Aspek normal disimpan apa adanya (1:1 / 4:5 / asli).
  // Sumber utama: onDetect dari elemen yang kepajang (img onLoad / video
  // onLoadedMetadata) — pasti akurat karena itu file yang beneran kepajang.
  const [mediaInfo, setMediaInfo] = useState<
    Record<string, { ratio: number; aspect: string; isWide: boolean }>
  >({});
  const handleDetect = (postId: string, w: number, h: number) => {
    if (!w || !h) return;
    const ratio = w / h;
    setMediaInfo((prev) => {
      const existing = prev[postId];
      // Sudah ada dan rasionya sama -> jangan update biar nggak re-render loop.
      if (existing && Math.abs(existing.ratio - ratio) < 0.01) return prev;
      return {
        ...prev,
        [postId]: {
          ratio,
          aspect: `${w} / ${h}`,
          isWide: ratio >= WIDE_THRESHOLD,
        },
      };
    });
  };

  // Pisah wide (16:9) vs normal (1:1 / 4:5 / asli), urutan feed tetap.
  const { widePosts, normalPosts } = useMemo(() => {
    const wide: typeof posts = [];
    const normal: typeof posts = [];
    posts.forEach((p) => {
      if (mediaInfo[p.id]?.isWide) wide.push(p);
      else normal.push(p);
    });
    return { widePosts: wide, normalPosts: normal };
  }, [posts, mediaInfo]);

  // Susun grup baris besar: tiap grup 3 kolom.
  // - 1 kolom wide berisi 2 kotak 16:9 atas-bawah (total 4 kotak per grup).
  // - 2 kolom normal berisi 1 kotak (1:1 / 4:5 / asli).
  // - Posisi kolom wide geser: tengah (baris-1) -> kiri (baris-2) -> kanan (baris-3) -> ulang.
  // - Slot wide kosong dibiarin kosong (sesuai request).
  interface ExploreGroup {
    wideCol: number;
    wideTop: PostResponseSingle | null;
    wideBottom: PostResponseSingle | null;
    normals: (PostResponseSingle | null)[];
  }
  const exploreGroups: ExploreGroup[] = useMemo(() => {
    const numGroups = Math.max(
      Math.ceil(widePosts.length / 2),
      Math.ceil(normalPosts.length / 2),
      posts.length > 0 ? 1 : 0,
    );
    const groups: ExploreGroup[] = [];
    let wi = 0;
    let ni = 0;
    for (let g = 0; g < numGroups; g++) {
      const wideCol = [1, 0, 2][g % 3];
      const wideTop = wi < widePosts.length ? widePosts[wi++] : null;
      const wideBottom = wi < widePosts.length ? widePosts[wi++] : null;
      const normalCols = [0, 1, 2].filter((c) => c !== wideCol);
      const normals = normalCols.map((c) => {
        void c;
        if (ni < normalPosts.length) return normalPosts[ni++] as PostResponseSingle;
        return null;
      });
      // Grup yang dua-duanya kosong (wide + normal habis) tidak dirender.
      if (!wideTop && !wideBottom && normals.every((n) => !n)) continue;
      groups.push({ wideCol, wideTop, wideBottom, normals });
    }
    return groups;
  }, [widePosts, normalPosts, posts.length]);

  const getNormalAspect = (p: PostResponseSingle) =>
    mediaInfo[p.id]?.aspect ?? "1 / 1";

  const komunitasCard = <KomunitasPopulerCard />;

  const saluranCard = <SaluranPopulerCard />;

  // Isi kolom kiri bawah (di bawah kotak pencarian, rata kanan sama dengan pencarian).
  const leftContent = showHistory ? (
    <Box
      bg="var(--app-card)"
      p={6}
      borderRadius="2xl"
      border="1px solid"
      borderColor="var(--app-border)"
      shadow="sm"
      w="full"
    >
      {/* Atas: "Terbaru" kiri, "Hapus Semua" kanan */}
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="sm" fontWeight="bold" color="var(--app-text)">
          Terbaru
        </Text>
        {searchHistory.length > 0 && (
          <Text
            fontSize="sm"
            fontWeight="bold"
            color="blue.600"
            cursor="pointer"
            _hover={{ color: "blue.700" }}
            onClick={clearSearchHistory}
          >
            Hapus Semua
          </Text>
        )}
      </Flex>

      {searchHistory.length === 0 ? (
        <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={8}>
          Belum ada pencarian terbaru.
        </Text>
      ) : (
        <VStack gap={1} align="stretch">
          {searchHistory.map((h) => (
            <NextLink key={h.username} href={`/profile/${h.username}`}>
              <HStack
                gap={3}
                p={2.5}
                borderRadius="xl"
                cursor="pointer"
                _hover={{ bg: "var(--app-input)" }}
                transition="0.2s"
              >
                {/* Kiri: pp avatar bulet */}
                <Box
                  w="44px"
                  h="44px"
                  borderRadius="full"
                  overflow="hidden"
                  flexShrink={0}
                  bg="blue.100"
                >
                  <Image
                    src={h.avatar || "/default-avatar.jpg"}
                    alt={h.name}
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                </Box>
                {/* Tengah: username di atas, nama lengkap di bawahnya */}
                <VStack align="start" gap={0} flex={1} minW={0}>
                  <Text fontWeight="bold" fontSize="sm" color="var(--app-text)">
                    {h.username}
                  </Text>
                  <Text fontSize="xs" color="var(--app-muted)" truncate w="full">
                    {h.name}
                  </Text>
                </VStack>
                {/* Kanan: ikon silang hapus dari riwayat */}
                <IconButton
                  aria-label={`Hapus ${h.username} dari riwayat`}
                  variant="ghost"
                  size="xs"
                  borderRadius="full"
                  color="var(--app-faint)"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromSearchHistory(h.username);
                  }}
                >
                  <X size={16} />
                </IconButton>
              </HStack>
            </NextLink>
          ))}
        </VStack>
      )}
    </Box>
  ) : (
    <VStack gap={6} align="stretch" w="full">
      {/* Hasil Pencarian Akun */}
      {submittedSearch && (
        <Box
          bg="var(--app-card)"
          p={6}
          borderRadius="2xl"
          border="1px solid"
          borderColor="var(--app-border)"
          shadow="sm"
          w="full"
        >
          <Heading size="xs" fontWeight="black" color="var(--app-text)" mb={4}>
            Akun
          </Heading>

          {searchUsersLoading ? (
            <Flex py={6} justify="center">
              <Spinner size="md" color="blue.500" />
            </Flex>
          ) : searchUsers.length === 0 ? (
            <Text fontSize="sm" color="var(--app-muted)" textAlign="center" py={4}>
              {`Tidak ada akun yang cocok dengan "${submittedSearch}".`}
            </Text>
          ) : (
            <VStack gap={3} align="stretch">
              {searchUsers.map((user) => (
                <NextLink key={user.id} href={`/profile/${user.username}`}>
                  <HStack
                    gap={3}
                    p={3}
                    borderRadius="xl"
                    _hover={{ bg: "var(--app-input)" }}
                    transition="0.2s"
                    // Akun dipencet -> masuk riwayat pencarian.
                    onClick={() => addToSearchHistory(user)}
                  >
                    <Box
                      w="42px"
                      h="42px"
                      borderRadius="full"
                      overflow="hidden"
                      flexShrink={0}
                      bg="blue.100"
                    >
                      <Image
                        src={user.avatar || "/default-avatar.jpg"}
                        alt={user.name}
                        w="full"
                        h="full"
                        objectFit="cover"
                      />
                    </Box>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="bold" fontSize="sm" color="var(--app-text)">
                        {user.name}
                      </Text>
                      <Text fontSize="xs" color="var(--app-muted)" fontWeight="bold">
                        @{user.username}
                      </Text>
                    </VStack>
                  </HStack>
                </NextLink>
              ))}
            </VStack>
          )}
        </Box>
      )}

      {isLoading ? (
        <Flex py={10} justify="center">
          <Spinner size="lg" color="blue.500" />
        </Flex>
      ) : posts.length === 0 ? (
        <Box textAlign="center" py={10} color="var(--app-muted)">
          <Text>Tidak ada postingan ditemukan.</Text>
        </Box>
      ) : (
        <VStack gap={4} align="stretch" w="full">
          {/* Grid explore campuran:
              - 3 kolom per baris besar, total 4 kotak (2 normal + 2x16:9 tumpuk).
              - Kolom tumpuk geser: tengah -> kiri -> kanan -> ulang.
              - Kotak normal ngikutin frame asli (1:1 / 4:5 / asli dari slide-1).
              - Slot 16:9 isi sebagian (atas doang) tetap di posisinya.
              - Grup tanpa 16:9 sama sekali: 2 normal digeser ke kiri,
                kanan dikosongkan. Kalau nanti wide sudah 3-4, otomatis
                balik ke pola normal (wide ngisi awal, normal pindah kanan). */}
          <VStack gap={2} w="full" align="stretch">
            {exploreGroups.map((g, gi) => {
              const noWide = !g.wideTop && !g.wideBottom;
              // Grup kosong wide -> rapetin 2 normal ke kiri, kanan kosong.
              if (noWide) {
                return (
                  <Flex key={`group-${gi}`} gap={2} w="full" align="start">
                    {[0, 1].map((i) => {
                      const p = g.normals[i];
                      return (
                        <Box key={`g${gi}-n${i}`} flex={1} minW={0}>
                          {p ? (
                            <ExploreMediaBox
                              post={p}
                              wide={false}
                              aspect={getNormalAspect(p)}
                              onClick={() => setSelectedPost(p)}
                              onDetect={handleDetect}
                            />
                          ) : null}
                        </Box>
                      );
                    })}
                    <Box flex={1} minW={0} />
                  </Flex>
                );
              }
              const normalCols = [0, 1, 2].filter((c) => c !== g.wideCol);
              const cols: { key: string; isWideCol: boolean }[] = [0, 1, 2].map(
                (c) => ({
                  key: `g${gi}-c${c}`,
                  isWideCol: c === g.wideCol,
                }),
              );
              return (
                <Flex key={`group-${gi}`} gap={2} w="full" align="start">
                  {cols.map((col) => {
                    if (col.isWideCol) {
                      return (
                        <VStack
                          key={col.key}
                          flex={1}
                          minW={0}
                          gap={2}
                          align="stretch"
                        >
                          {g.wideTop ? (
                            <ExploreMediaBox
                              post={g.wideTop}
                              wide
                              onClick={() => setSelectedPost(g.wideTop!)}
                              onDetect={handleDetect}
                            />
                          ) : (
                            <ExploreEmptyWide />
                          )}
                          {g.wideBottom ? (
                            <ExploreMediaBox
                              post={g.wideBottom}
                              wide
                              onClick={() => setSelectedPost(g.wideBottom!)}
                              onDetect={handleDetect}
                            />
                          ) : (
                            <ExploreEmptyWide />
                          )}
                        </VStack>
                      );
                    }
                    const ni = normalCols.indexOf(
                      parseInt(col.key.split("-c")[1], 10),
                    );
                    const p = g.normals[ni];
                    return (
                      <Box key={col.key} flex={1} minW={0}>
                        {p ? (
                          <ExploreMediaBox
                            post={p}
                            wide={false}
                            aspect={getNormalAspect(p)}
                            onClick={() => setSelectedPost(p)}
                            onDetect={handleDetect}
                          />
                        ) : null}
                      </Box>
                    );
                  })}
                </Flex>
              );
            })}
          </VStack>

          {data?.meta && data.meta.totalPages > 1 && (
            <HStack justify="center" gap={4} py={6}>
              <Button
                variant="outline"
                colorPalette="blue"
                borderRadius="full"
                disabled={query.page === 1 || isFetching}
                onClick={() => setQuery({ ...query, page: query.page - 1 })}
              >
                Sebelumnya
              </Button>

              <Box bg="var(--app-hover)" px={4} py={2} borderRadius="lg">
                <Text fontWeight="bold" color="blue.600">
                  Halaman {query.page} dari {data.meta.totalPages}
                </Text>
              </Box>

              <Button
                variant="outline"
                colorPalette="blue"
                borderRadius="full"
                disabled={query.page >= data.meta.totalPages || isFetching}
                onClick={() => setQuery({ ...query, page: query.page + 1 })}
              >
                Berikutnya
              </Button>
            </HStack>
          )}
        </VStack>
      )}
    </VStack>
  );

  return (
    <Flex
      align="start"
      justify={{ base: "stretch", lg: "flex-start" }}
      gap={{ base: 6, lg: 16 }}
      flexDirection={{ base: "column", lg: "row" }}
      w="full"
      pr={{ base: 0, lg: 8 }}
    >
      {/* Kolom kiri: pencarian di atas, postingan di bawahnya (rata kanan sama). */}
      <VStack flex={1} minW={0} maxW="560px" w="full" gap={6} align="stretch">
        <Box
          bg="var(--app-card)"
          p={4}
          borderRadius="2xl"
          shadow="sm"
          border="1px solid"
          borderColor="var(--app-border)"
          w="full"
        >
          <form onSubmit={handleSearch} style={{ width: "100%" }}>
            <HStack w="full" bg="var(--app-input)" px={3} py={2} borderRadius="xl" border="1px solid" borderColor="var(--app-border)">
              <Search size={18} color="#334159" />
              <Input
                placeholder="Cari orang, topik, atau kata kunci..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                fontSize="sm"
                color="var(--app-text)"
                fontWeight="medium"
                _placeholder={{ color: "var(--app-faint)" }}
                border="none"
                _focus={{ boxShadow: "none" }}
              />
            </HStack>
          </form>
        </Box>

        {/* Komunitas (Mobile): di bawah pencarian, di atas postingan */}
        <Box display={{ base: "block", lg: "none" }}>{komunitasCard}</Box>

        {leftContent}

        {/* Saluran (Mobile): paling bawah halaman */}
        <Box display={{ base: "block", lg: "none" }}>{saluranCard}</Box>
      </VStack>

      {/* Sidebar kanan (Desktop): Komunitas di atas, Saluran di bawah halaman.
          Rata kiri-kanan sama, kayak Saran Pertemanan + Keluar di beranda. */}
      <Box
        w={{ base: "full", lg: "320px" }}
        flexShrink={0}
        display={{ base: "none", lg: "flex" }}
        flexDirection="column"
        position="sticky"
        top="24px"
        h="calc(100vh - 56px)"
      >
        <VStack gap={4} align="stretch" h="full" justify="space-between">
          {komunitasCard}
          {saluranCard}
        </VStack>
      </Box>

      {/* Modal detail ala /profile + home */}
      <PostDetailModal
        post={selectedPost ?? ({} as PostResponseSingle)}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        variant="own"
      />
    </Flex>
  );
}

export default dynamic(() => Promise.resolve(ExplorePage), {
  ssr: false,
});

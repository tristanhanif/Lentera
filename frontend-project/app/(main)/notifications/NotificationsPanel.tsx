"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Flex,
  Circle,
  Spinner,
  Image,
  IconButton,
} from "@chakra-ui/react";
import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNotifications } from "./notif.service";
import { useProfile } from "../profile/profile.service";
import { useGetFollowing } from "../profile/followList.service";
import { NotificationData, NotificationType } from "./notif.interface";

// Tab kriteria notifikasi (ditaruh di bawah judul "Notifikasi").
type NotifFilter = "all" | "following" | "comments" | "follows";

const NOTIF_FILTERS: { key: NotifFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "following", label: "Orang yang Anda ikuti" },
  { key: "comments", label: "Komentar" },
  { key: "follows", label: "Mengikuti" },
];

function isSameCalendarDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function groupNotifications(notifications: NotificationData[]) {
  const now = new Date();
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);

  // Batas 1 bulan ke belakang (frontend hanya filter tampilan,
  // penghapusan permanen dilakukan di backend saat GET /notifications)
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const today: NotificationData[] = [];
  const yesterday: NotificationData[] = [];
  const thisMonth: NotificationData[] = [];

  for (const item of notifications) {
    const created = new Date(item.createdAt);
    if (created < oneMonthAgo) continue; // anggap sudah dihapus
    if (isSameCalendarDay(created, now)) today.push(item);
    else if (isSameCalendarDay(created, yesterdayDate)) yesterday.push(item);
    else thisMonth.push(item);
  }

  return { today, yesterday, thisMonth };
}

function formatNotifTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Normalisasi teks komentar/mention ke format gabungan (Opsi A):
// "menyebut Anda di sebuah komentar: <isi balasan baru>"
// Data lama ("membalas komentar Anda: ..." / "menyebut Anda dalam komentar: ...")
// ikut dikonversi di tampilan supaya seragam, tanpa perlu migrasi DB.
function getDisplayContent(item: NotificationData) {
  const raw = item.content ?? "";

  // Ambil isi setelah titik dua, kupas tanda kutip pembungkus bila ada.
  const afterColon = (s: string) => {
    const idx = s.indexOf(":");
    const tail = idx >= 0 ? s.slice(idx + 1).trim() : s.trim();
    if (
      tail.length >= 2 &&
      tail.startsWith('"') &&
      tail.endsWith('"')
    ) {
      return tail.slice(1, -1);
    }
    return tail;
  };

  if (
    raw.includes("membalas komentar Anda:") ||
    raw.includes("menyebut Anda dalam komentar:")
  ) {
    return `menyebut Anda di sebuah komentar: "${afterColon(raw)}"`;
  }

  // Format baru sudah benar -> tampilkan apa adanya (jangan ditambah prefix lagi).
  if (raw.includes("menyebut Anda di sebuah komentar:")) {
    return raw;
  }

  if (item.type === NotificationType.COMMENT) {
    return `mengomentari: "${raw}"`;
  }

  return raw;
}

function isVideoUrl(url?: string, type?: string) {
  if (type === "video") return true;
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function PostThumbnail({ post }: { post?: NotificationData["post"] }) {
  const firstMedia = post?.medias?.[0];
  if (!post) return null;

  // Semua notifikasi yang menempel ke postingan dapat kotak kecil 44px.
  // Ada media -> tampilkan foto/video pertama. Teks saja -> cuplikan caption.
  if (!firstMedia) {
    return (
      <Box
        w="48px"
        h="48px"
        flexShrink={0}
        borderRadius="md"
        overflow="hidden"
        bg="linear-gradient(180deg, #3b82f6, #1d4ed8)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={1}
      >
        <Text
          fontSize="8px"
          color="white"
          lineClamp={3}
          textAlign="center"
          lineHeight="1.2"
        >
          {post.content || "Postingan"}
        </Text>
      </Box>
    );
  }

  const video = isVideoUrl(firstMedia.url, firstMedia.type);
  return (
    <Box
      w="48px"
      h="48px"
      flexShrink={0}
      borderRadius="md"
      overflow="hidden"
      bg="var(--app-subtle)"
      position="relative"
    >
      {video ? (
        <>
          <video
            src={firstMedia.url}
            muted
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Badge kecil biar ketahuan ini video */}
          <Box
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="blackAlpha.300"
            pointerEvents="none"
          >
            <Box
              w="18px"
              h="18px"
              borderRadius="full"
              bg="blackAlpha.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box
                w={0}
                h={0}
                borderTop="4px solid transparent"
                borderBottom="4px solid transparent"
                borderLeft="6px solid white"
                ml="2px"
              />
            </Box>
          </Box>
        </>
      ) : (
        <Image
          src={firstMedia.url}
          alt="Media postingan"
          w="full"
          h="full"
          objectFit="cover"
        />
      )}
    </Box>
  );
}

function PanelBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [filter, setFilter] = useState<NotifFilter>("all");
  const { notifications, unreadCount, isLoading, markAllRead } =
    useNotifications();

  // Daftar orang yang diikuti user aktif -> dipakai tab "Orang yang Anda ikuti".
  // useProfile cache-nya sama dengan layout, jadi tidak nambah request.
  const { data: me } = useProfile();
  const {
    data: followingData,
    isLoading: isLoadingFollowing,
  } = useGetFollowing(me?.id ?? "", "", true);
  const followingIds = new Set(
    (followingData?.data ?? []).map((u) => u.id)
  );

  const goProfile = (username?: string) => {
    if (!username) return;
    onClose();
    router.push(`/profile/${encodeURIComponent(username)}`);
  };

  const goTarget = (item: NotificationData) => {
    // Komunitas: klik buka /messages filter Komunitas + chat komunitasnya.
    if (item.community?.id || item.type === NotificationType.COMMUNITY) {
      onClose();
      const cid = item.community?.id;
      router.push(cid ? `/messages?community=${encodeURIComponent(cid)}` : "/messages");
      return;
    }
    // Kalau notifikasi menempel ke postingan (like/komentar/mention),
    // klik diarahkan ke detail postingan. Selain itu (follow) ke profil aktor.
    if (item.post?.id) {
      onClose();
      router.push(`/post/${item.post.id}`);
      return;
    }
    goProfile(item.actor?.username);
  };

  // Saring sesuai tab kriteria yang dipilih.
  const filtered =
    filter === "all"
      ? notifications
      : filter === "comments"
        ? notifications.filter(
            (n) =>
              n.type === NotificationType.COMMENT ||
              n.type === NotificationType.MENTION
          )
        : filter === "follows"
          ? notifications.filter((n) => n.type === NotificationType.FOLLOW)
          : notifications.filter((n) => followingIds.has(n.actor?.id));

  const { today, yesterday, thisMonth } = groupNotifications(filtered);
  const hasAny = today.length > 0 || yesterday.length > 0 || thisMonth.length > 0;
  const isListLoading =
    isLoading || (filter === "following" && isLoadingFollowing);

  const renderItem = (item: NotificationData) => (
    <HStack
      key={item.id}
      p={3}
      gap={3}
      borderRadius="xl"
      bg={item.isRead ? "transparent" : "var(--app-hover)"}
      _hover={{ bg: "var(--app-input)" }}
      cursor="pointer"
      align="center"
      onClick={() => goTarget(item)}
    >
      <Circle size="48px" bg="var(--app-subtle)" overflow="hidden" flexShrink={0}>
        <Image
          src={item.actor?.avatar || "/default-avatar.jpg"}
          alt={item.actor?.username ? `@${item.actor.username}` : "Sistem"}
          w="full"
          h="full"
          objectFit="cover"
        />
      </Circle>
      <VStack align="start" gap={0} flex={1} minW={0}>
        <Text fontSize="lg" color="var(--app-secondary)" lineClamp={2}>
          <Text as="span" fontWeight="bold" color="var(--app-text)">
            {item.actor?.username ? `@${item.actor.username}` : "Sistem"}
          </Text>{" "}
          {getDisplayContent(item)}
        </Text>
        <Text fontSize="md" color="var(--app-faint)">
          {formatNotifTime(item.createdAt)}
        </Text>
      </VStack>
      {/* Kanan: pp avatar komunitas (notif komunitas) atau media postingan */}
      {item.community?.id || item.type === NotificationType.COMMUNITY ? (
        <Box
          w="48px"
          h="48px"
          flexShrink={0}
          borderRadius="full"
          overflow="hidden"
          bg="var(--app-subtle)"
          border="1px solid"
          borderColor="var(--app-border)"
        >
          <Image
            src={item.community?.avatarUrl || "/icon-komunitas.png"}
            alt={item.community?.name || "Komunitas"}
            w="full"
            h="full"
            objectFit="cover"
          />
        </Box>
      ) : (
        <PostThumbnail post={item.post} />
      )}
      {!item.isRead && <Circle size="8px" bg="blue.500" flexShrink={0} />}
    </HStack>
  );

  const renderSection = (title: string, items: NotificationData[]) => {
    if (items.length === 0) return null;
    return (
      <Box key={title}>
        <Text
          px={3}
          pt={3}
          pb={1}
          fontSize="lg"
          fontWeight="bold"
          color="var(--app-text)"
        >
          {title}
        </Text>
        <VStack gap={1} align="stretch">
          {items.map(renderItem)}
        </VStack>
      </Box>
    );
  };

  return (
    // Satu scroll penuh: judul + filter + daftar ikut ke-scroll semua,
    // tidak ada yang netap jadi header.
    <Box flex={1} overflowY="auto" pb={4}>
      {/* Header: kiri tulisan, kanan silang (ikut scroll) */}
      <HStack justify="space-between" align="center" px={5} pt={5} pb={3}>
        <Heading size="2xl" fontWeight="bold" color="var(--app-text)">
          Notifikasi
        </Heading>
        <IconButton
          aria-label="Tutup notifikasi"
          variant="ghost"
          size="md"
          borderRadius="full"
          onClick={onClose}
        >
          <X size={24} color="var(--app-text)" />
        </IconButton>
      </HStack>

      {/* Tab kriteria: satu baris saja, geser kiri-kanan buat lihat sisanya.
          Aktif = kotak biru + font putih, lainnya = kotak putih + border hitam + font hitam. */}
      <HStack
        gap={2}
        px={5}
        pb={3}
        flexWrap="nowrap"
        overflowX="auto"
        css={{
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {NOTIF_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Box
              key={f.key}
              as="button"
              px={4}
              py={1.5}
              borderRadius="full"
              border="1px solid"
              borderColor={active ? "blue.600" : "black"}
              bg={active ? "blue.600" : "white"}
              color={active ? "white" : "black"}
              fontWeight={active ? "semibold" : "medium"}
              fontSize="md"
              textAlign="center"
              cursor="pointer"
              flexShrink={0}
              whiteSpace="nowrap"
              onClick={() => setFilter(f.key)}
              _hover={{ bg: active ? "blue.700" : "#e2e8f0" }}
            >
              {f.label}
            </Box>
          );
        })}
      </HStack>

      {unreadCount > 0 && (
        <Box px={5} pb={2} textAlign="right">
          <Text
            as="button"
            fontSize="md"
            fontWeight="bold"
            color="blue.600"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={() => markAllRead()}
          >
            Tandai semua dibaca
          </Text>
        </Box>
      )}

      {/* Daftar notifikasi */}
      <Box px={3}>
        {isListLoading ? (
          <Flex py={10} justify="center">
            <Spinner size="md" color="blue.500" />
          </Flex>
        ) : !hasAny ? (
          <VStack py={10} gap={2} color="var(--app-muted)" textAlign="center">
            <Bell size={48} color="#cbd5e1" />
            <Text fontSize="lg" fontWeight="medium">
              {filter === "all"
                ? "Belum ada notifikasi"
                : "Belum ada notifikasi untuk kriteria ini"}
            </Text>
          </VStack>
        ) : (
          <VStack gap={1} align="stretch">
            {renderSection("Hari Ini", today)}
            {renderSection("Kemarin", yesterday)}
            {renderSection("Bulan Ini", thisMonth)}
          </VStack>
        )}
      </Box>
    </Box>
  );
}

export function NotificationsPanel({ onClose, closing = false }: { onClose: () => void; closing?: boolean }) {
  // Animasi buka: geser halus dari kiri + fade + sedikit nyegat.
  // Animasi tutup: geser balik ke kiri + fade (230ms, sinkron dengan timer unmount).
  const anim = closing
    ? "notifSlideOut 0.22s ease-in forwards"
    : "notifSlideIn 0.28s cubic-bezier(0.21, 1.02, 0.73, 1) forwards";
  return (
    <>
      <style>{`
        @keyframes notifSlideIn {
          from { transform: translateX(-64px); opacity: 0; }
          60% { transform: translateX(8px); opacity: 1; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes notifSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-64px); opacity: 0; }
        }
      `}</style>

      {/* Desktop: overlay fixed di kiri viewport (tidak ikut layout).
          Isi halaman tetap di posisinya, tidak bergeser ke kanan. */}
      <Box
        w="600px"
        maxW="calc(100vw - 40px)"
        flexShrink={0}
        display={{ base: "none", md: "flex" }}
        flexDirection="column"
        position="fixed"
        left="0"
        top="0"
        h="100vh"
        zIndex={1300}
        bg="var(--app-card)"
        borderRight="1px solid"
        borderColor="var(--app-border)"
        shadow="xl"
        overflow="hidden"
        pl="20px"
        style={{ animation: anim }}
      >
        <PanelBody onClose={onClose} />
      </Box>

      {/* Mobile: overlay penuh dari kiri */}
      <Box
        display={{ base: "flex", md: "none" }}
        flexDirection="column"
        position="fixed"
        inset={0}
        zIndex={1300}
        bg="var(--app-card)"
        overflow="hidden"
        pl="20px"
        style={{ animation: anim }}
      >
        <PanelBody onClose={onClose} />
      </Box>
    </>
  );
}

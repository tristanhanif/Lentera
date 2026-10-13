"use client";

import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Button,
  Flex,
  Spinner,
  Badge,
  Text,
  Switch,
} from "@chakra-ui/react";
import {
  Home,
  Search,
  Bell,
  PlusSquare,
  MessageSquare,
  Menu as MenuIcon,
  User as UserIcon,
  Sparkles,
  Settings,
  Palette,
  Bookmark,
  ChevronLeft,
  Moon,
} from "lucide-react";
import { useColorMode } from "@/components/ui/color-mode";
import Cookies from "js-cookie";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "./profile/profile.service";
import { useLikeSocketListener } from "./like/like.service";
import { useNotifications } from "./notifications/notif.service";
import { NotificationsPanel } from "./notifications/NotificationsPanel";
import { useUnreadConversationsCount } from "./messages/chat.service";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isCreateActive = pathname === "/postingan";
  /* ===============================
   * 📋 MENU POPUP (sidebar bawah)
   * =============================== */
  const { colorMode, setColorMode } = useColorMode();
  const isDark = colorMode === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "display">("main");
  const menuRef = useRef<HTMLDivElement | null>(null);
  // Panel notifikasi overlay dari kiri (isi halaman tidak bergeser).
  const [notifOpen, setNotifOpen] = useState(false);
  // Animasi tutup: panel tetap mounted 230ms sambil slide-out, baru unmount.
  const [notifClosing, setNotifClosing] = useState(false);
  const notifTimer = useRef<number | null>(null);

  const openNotif = () => {
    if (notifTimer.current) {
      window.clearTimeout(notifTimer.current);
      notifTimer.current = null;
    }
    setNotifClosing(false);
    setNotifOpen(true);
  };

  const closeNotif = () => {
    if (!notifOpen || notifClosing) return;
    setNotifClosing(true);
    if (notifTimer.current) window.clearTimeout(notifTimer.current);
    notifTimer.current = window.setTimeout(() => {
      setNotifOpen(false);
      setNotifClosing(false);
      notifTimer.current = null;
    }, 230);
  };

  useEffect(() => {
    return () => {
      if (notifTimer.current) window.clearTimeout(notifTimer.current);
    };
  }, []);

  // Pindah halaman lain -> panel langsung tertutup (tanpa animasi).
  useEffect(() => {
    if (notifTimer.current) {
      window.clearTimeout(notifTimer.current);
      notifTimer.current = null;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setNotifClosing(false);
    setNotifOpen(false);
    // Menu popup ikut tertutup + reset ke view utama
    setMenuOpen(false);
    setMenuView("main");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);

  // Escape menutup panel (pakai animasi tutup).
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNotif();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen, notifClosing]);

  const toggleMenu = () => {
    if (!menuOpen) setMenuView("main");
    setMenuOpen((v) => !v);
  };
  const closeMenu = () => {
    setMenuOpen(false);
    // reset view sedikit delay agar transisi tidak kelihatan saat tutup
    window.setTimeout(() => setMenuView("main"), 150);
  };

  // Klik di luar popup -> tutup
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  // Escape menutup menu popup
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  const handleSavedClick = () => {
    closeMenu();
    router.push("/profile?tab=simpan");
  };

  // Warna adaptif terang/gelap untuk layout utama.
  // Sengaja pakai CSS variable (bukan kondisional isDark) supaya HTML hasil
  // server & client identik — mencegah hydration mismatch saat tema yang
  // tersimpan = dark. Browser yang menyelesaikan warnanya lewat class .dark.
  // Dark = hitam pekat, Light = putih.
  const pageBg = "var(--app-bg)";
  const navInactiveColor = "var(--app-text)";
  const navHoverBg = "var(--app-hover)";
  const popupBg = "var(--app-card)";
  const popupBorder = "var(--app-border)";
  const popupText = "var(--app-text)";
  const dividerBg = "var(--app-border)";

  /* ===============================
   * 🔐 TOKEN GUARD (CLIENT)
   * =============================== */
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  /* ===============================
   * 👤 PROFILE FETCH
   * =============================== */
  useLikeSocketListener();
  const { data, isLoading, isFetching, isError } = useProfile();

  // Token basi (misal akun dihapus dari DB) -> bersihkan cookie + ke login
  // agar tidak stuck di halaman hitam/kosong
  useEffect(() => {
    if (isError) {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      Cookies.remove("uuid");
      Cookies.remove("loginMethod");
      router.replace("/login");
    }
  }, [isError, router]);
  const { unreadCount } = useNotifications();
  const unreadChats = useUnreadConversationsCount();

  const badgeLabel = unreadCount > 4 ? "4+" : String(unreadCount);
  const chatBadgeLabel = unreadChats > 4 ? "4+" : String(unreadChats);

  const getBadge = (path: string) => {
    if (path === "/notifications" && unreadCount > 0) return badgeLabel;
    if (path === "/messages" && unreadChats > 0) return chatBadgeLabel;
    return null;
  };

  /* ===============================
   * ⏳ LOADING / ERROR STATE
   * =============================== */
  if (isLoading || isFetching) {
    return (
      <Box
        minH="100vh"
        bg={pageBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  // Saat profile gagal (token basi), tampilkan loading terang agar
  // tidak dikira halaman hitam, redirect ditangani useEffect di atas
  if (isError) {
    return (
      <Box
        minH="100vh"
        bg={pageBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" color="blue.500" />
      </Box>
    );
  }

  /* ===============================
   * 🧭 NAVIGATION
   * =============================== */
  const NAV_ITEMS = [
    { label: "Beranda", icon: Home, path: "/" },
    { label: "Jelajah", icon: Search, path: "/explore" },
    { label: "Notifikasi", icon: Bell, path: "/notifications" },
    { label: "Pesan", icon: MessageSquare, path: "/messages" },
    { label: "Profil", icon: UserIcon, path: "/profile" },
  ];

  /* ===============================
   * 🖥️ MAIN UI
   * =============================== */
  return (
    <Box minH="100vh" bg={pageBg} position="relative">
      {/* ===== MAIN CONTENT ===== */}
      <Container maxW="8xl" py={8} px={6} pb={{ base: "90px", md: 8 }}>
        <HStack align="start" gap={8}>
          {/* SIDEBAR — dimentokkan ke kiri viewport dengan jarak 36px.
              Hanya sidebar yang digeser: ml negatif menarik ke kiri,
              mr positif dengan nilai sama menahan konten tetap di posisi semula
              (lebar sidebar tetap 240px, kotak postingan tidak membesar).
              Di layar <=1536px hasilnya 12px tambahan (Container px={6} = 24px + 12px).
              Sidebar selalu dirender (walau panel notif terbuka) supaya isi
              halaman tidak bergeser sama sekali — panel notif tampil overlay. */}
          <VStack
            w="240px"
            flexShrink={0}
            ml="calc((100vw - 100%) / -2 + 36px)"
            mr="calc((100vw - 100%) / 2 - 36px)"
            align="stretch"
            gap={0}
            display={{ base: "none", md: "flex" }}
            position="sticky"
            top="24px"
            h="calc(100vh - 48px)"
            pb={0}
          >
            <Heading
              size="3xl"
              color="blue.600"
              fontWeight="black"
              letterSpacing="tighter"
              cursor="pointer"
              onClick={() => router.push("/")}
              mb={2}
              px={4}
            >
              Lentera
            </Heading>
            <VStack
              flex={1}
              justify="center"
              align="stretch"
              gap={3}
              w="full"
              pb={0}
            >
              {(
                [
                  NAV_ITEMS.find((i) => i.path === "/"),
                  NAV_ITEMS.find((i) => i.path === "/explore"),
                  "CREATE" as const,
                  NAV_ITEMS.find((i) => i.path === "/notifications"),
                  NAV_ITEMS.find((i) => i.path === "/messages"),
                  NAV_ITEMS.find((i) => i.path === "/profile"),
                ] as const
              ).map((entry) => {
                if (entry === "CREATE") {
                  return (
                    <Link key="create" href="/postingan">
                      <Button
                        size="lg"
                        fontSize="lg"
                        bg={isCreateActive ? "blue.700" : "blue.600"}
                        color="white"
                        justifyContent="start"
                        alignItems="center"
                        gap={4}
                        width="full"
                        mt={2}
                        mb={2}
                        px={4}
                        borderRadius="xl"
                        shadow="md"
                        fontWeight="bold"
                        _hover={{ bg: "blue.700" }}
                      >
                        <Box
                          w="28px"
                          h="28px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <PlusSquare size={24} />
                        </Box>
                        Buat
                      </Button>
                    </Link>
                  );
                }
                const item = entry;
                if (!item) return null;
                const isNotif = item.path === "/notifications";
                const isActive = isNotif ? notifOpen : pathname === item.path;
                const notifButton = (
                  <Button
                    size="lg"
                    fontSize="lg"
                    variant="ghost"
                    bg={isNotif && notifOpen ? navHoverBg : "transparent"}
                    color={isActive ? "blue.600" : navInactiveColor}
                    justifyContent="start"
                    gap={4}
                    width="full"
                    px={4}
                    fontWeight={isActive ? "bold" : "medium"}
                    position="relative"
                    _hover={{ bg: navHoverBg }}
                    onClick={
                      isNotif ? () => (notifOpen ? closeNotif() : openNotif()) : undefined
                    }
                  >
                    <Box
                      w="28px"
                      h="28px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      {item.path === "/profile" ? (
                        <Box
                          w="28px"
                          h="28px"
                          borderRadius="full"
                          overflow="hidden"
                          flexShrink={0}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data?.avatar || "/default-avatar.jpg"}
                            alt="Profil"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </Box>
                      ) : (
                        <item.icon
                          size={24}
                          color={isActive ? "#2563eb" : "currentColor"}
                          fill={isActive ? "#2563eb" : "none"}
                        />
                      )}
                    </Box>
                    {item.label}
                    {getBadge(item.path) && (
                      <Badge
                        ml="auto"
                        bg="red.500"
                        color="white"
                        borderRadius="full"
                        fontSize="xs"
                        fontWeight="bold"
                        lineHeight="1"
                        px={1.5}
                        py={1}
                        minW="20px"
                        textAlign="center"
                      >
                        {getBadge(item.path)}
                      </Badge>
                    )}
                  </Button>
                );
                if (isNotif) {
                  return <Box key={item.path}>{notifButton}</Box>;
                }
                return (
                  <Link key={item.path} href={item.path}>
                    {notifButton}
                  </Link>
                );
              })}
            </VStack>

            {/* MENU + TERA AI — dipatok di paling bawah sidebar */}
            <VStack gap={2} align="stretch" w="full">
              <Box position="relative" ref={menuRef} w="full">
                {menuOpen && (
                  <Box
                    position="absolute"
                    bottom="calc(100% + 8px)"
                    left={0}
                    right={0}
                    bg={popupBg}
                    border="1px solid"
                    borderColor={popupBorder}
                    borderRadius="xl"
                    shadow="lg"
                    zIndex={20}
                    overflow="hidden"
                    p={2}
                  >
                    {menuView === "main" ? (
                      <VStack gap={1} align="stretch">
                        {/* Pengaturan — belum difungsikan */}
                        <Button
                          variant="ghost"
                          justifyContent="start"
                          gap={3}
                          w="full"
                          px={3}
                          py={2}
                          h="auto"
                          fontSize="md"
                          fontWeight="medium"
                          color={popupText}
                          borderRadius="lg"
                          _hover={{ bg: navHoverBg }}
                          cursor="default"
                        >
                          <Settings size={20} />
                          Pengaturan
                        </Button>
                        <Button
                          variant="ghost"
                          justifyContent="start"
                          gap={3}
                          w="full"
                          px={3}
                          py={2}
                          h="auto"
                          fontSize="md"
                          fontWeight="medium"
                          color={popupText}
                          borderRadius="lg"
                          _hover={{ bg: navHoverBg }}
                          onClick={() => setMenuView("display")}
                        >
                          <Palette size={20} />
                          Ubah Tampilan
                        </Button>
                        <Button
                          variant="ghost"
                          justifyContent="start"
                          gap={3}
                          w="full"
                          px={3}
                          py={2}
                          h="auto"
                          fontSize="md"
                          fontWeight="medium"
                          color={popupText}
                          borderRadius="lg"
                          _hover={{ bg: navHoverBg }}
                          onClick={handleSavedClick}
                        >
                          <Bookmark size={20} />
                          Tersimpan
                        </Button>
                      </VStack>
                    ) : (
                      <VStack gap={0} align="stretch">
                        {/* Header: chevron kiri | judul tengah | bulan kanan */}
                        <HStack gap={1} align="center" px={1} py={1}>
                          <Box
                            as="button"
                            onClick={() => setMenuView("main")}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            w="28px"
                            h="28px"
                            borderRadius="md"
                            color={popupText}
                            _hover={{ bg: navHoverBg }}
                            cursor="pointer"
                            aria-label="Kembali"
                          >
                            <ChevronLeft size={20} />
                          </Box>
                          <Text
                            flex={1}
                            textAlign="center"
                            fontSize="md"
                            fontWeight="semibold"
                            color={popupText}
                          >
                            Ubah Tampilan
                          </Text>
                          <Box
                            w="28px"
                            h="28px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color={popupText}
                          >
                            <Moon size={20} />
                          </Box>
                        </HStack>
                        {/* Garis abu */}
                        <Box h="1px" bg={dividerBg} my={2} mx={1} />
                        {/* Mode gelap + toggle */}
                        <HStack px={2} py={2} align="center">
                          <Text fontSize="md" color={popupText}>
                            Mode gelap
                          </Text>
                          <Box ml="auto" display="flex" alignItems="center">
                            <Switch.Root
                              checked={isDark}
                              onCheckedChange={(d) =>
                                setColorMode(d.checked ? "dark" : "light")
                              }
                              colorPalette="blue"
                              size="md"
                            >
                              <Switch.HiddenInput />
                              <Switch.Control>
                                <Switch.Thumb />
                              </Switch.Control>
                            </Switch.Root>
                          </Box>
                        </HStack>
                      </VStack>
                    )}
                  </Box>
                )}
                <Button
                  size="lg"
                  fontSize="lg"
                  variant="ghost"
                  color={menuOpen ? "blue.600" : navInactiveColor}
                  bg={menuOpen ? navHoverBg : "transparent"}
                  fontWeight={menuOpen ? "bold" : "medium"}
                  justifyContent="start"
                  alignItems="center"
                  gap={4}
                  width="full"
                  px={4}
                  borderRadius="xl"
                  _hover={{ bg: navHoverBg }}
                  onClick={toggleMenu}
                >
                  <MenuIcon
                    size={24}
                    color={menuOpen ? "#2563eb" : "currentColor"}
                  />
                  Menu
                </Button>
              </Box>
              {/* Tera AI -> buka /messages dengan kotak Tera AI langsung terbuka */}
              <Button
                size="lg"
                fontSize="lg"
                variant="ghost"
                color={navInactiveColor}
                justifyContent="start"
                alignItems="center"
                gap={4}
                width="full"
                fontWeight="medium"
                px={4}
                borderRadius="xl"
                _hover={{ bg: navHoverBg }}
                onClick={() => {
                  closeMenu();
                  router.push("/messages?chat=tera-ai");
                }}
              >
                <Sparkles size={24} color="currentColor" />
                Tera AI
              </Button>
            </VStack>
          </VStack>

          {/* PAGE CONTENT */}
          <VStack flex={1} gap={6} align="stretch">
            {children}
          </VStack>
        </HStack>
      </Container>

      {/* GARIS SIDEBAR — 36px di kanan sidebar (36 + 240 + 36 = 312px dari kiri),
          dari atas sampai bawah halaman. Absolute jadi tidak menggeser konten. */}
      <Box
        position="absolute"
        left="312px"
        top="0"
        bottom="0"
        w="1px"
        bg="var(--app-text)"
        display={{ base: "none", md: "block" }}
      />

      {/* PANEL NOTIFIKASI — overlay fixed di kiri viewport, tidak ikut layout.
          Isi halaman (/explore dll) tetap di posisinya, tidak bergeser.
          Buka = slide-in, tutup = slide-out (closing) baru unmount. */}
      {notifOpen && (
        <NotificationsPanel onClose={closeNotif} closing={notifClosing} />
      )}

      {/* ===== BOTTOM NAV (MOBILE) ===== */}
      <Box
        as="nav"
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        zIndex="1000"
        bg="var(--app-card)"
        borderTop="1px solid"
        borderColor="var(--app-border)"
        display={{ base: "block", md: "none" }}
      >
        <Flex justify="space-around" align="center" py={2} px={1}>
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const isNotif = item.path === "/notifications";
            const isActive = isNotif ? notifOpen : pathname === item.path;
            const body = (
              <Box position="relative">
                <Flex direction="column" align="center" gap={0.5} px={2}>
                  <item.icon
                    size={22}
                    color={isActive ? "#2563eb" : "var(--app-muted)"}
                  />
                  <Text
                    fontSize="10px"
                    fontWeight={isActive ? "bold" : "medium"}
                    color={isActive ? "#2563eb" : "var(--app-muted)"}
                  >
                    {item.label}
                  </Text>
                </Flex>
                {getBadge(item.path) && (
                  <Badge
                    position="absolute"
                    top="-4px"
                    right="-2px"
                    bg="red.500"
                    color="white"
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                    lineHeight="1"
                    px={1.5}
                    py={1}
                    minW="18px"
                    textAlign="center"
                  >
                    {getBadge(item.path)}
                  </Badge>
                )}
              </Box>
            );
            if (isNotif) {
              return (
                <Box
                  key={item.path}
                  as="button"
                  cursor="pointer"
                  onClick={() => (notifOpen ? closeNotif() : openNotif())}
                  aria-label="Notifikasi"
                >
                  {body}
                </Box>
              );
            }
            return (
              <Link key={item.path} href={item.path}>
                {body}
              </Link>
            );
          })}
          <Link href="/postingan">
            <Flex direction="column" align="center" gap={0.5} px={2}>
              <PlusSquare
                size={22}
                color={isCreateActive ? "#2563eb" : "var(--app-muted)"}
              />
              <Text
                fontSize="10px"
                fontWeight={isCreateActive ? "bold" : "medium"}
                color={isCreateActive ? "#2563eb" : "var(--app-muted)"}
              >
                Buat
              </Text>
            </Flex>
          </Link>
          <Link href="/profile">
            <UserIcon
              size={22}
              color={pathname === "/profile" ? "#2563eb" : "var(--app-muted)"}
            />
          </Link>
        </Flex>
      </Box>
    </Box>
  );
}

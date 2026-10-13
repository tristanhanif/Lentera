"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Dialog,
  Spinner,
} from "@chakra-ui/react";
import { MapPin, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import {
  LoginSession,
  formatTimeAgo,
  useLoginSessions,
  useRevokeSession,
} from "../session.service";
import { ChangePassword } from "../../profile/edit/changePassword";
import { useProfile } from "../../profile/profile.service";

function SessionItem({
  session,
  expanded,
  onToggle,
  onLogoutClick,
}: {
  session: LoginSession;
  expanded: boolean;
  onToggle: () => void;
  onLogoutClick: () => void;
}) {
  const hasCoords =
    typeof session.lat === "number" && typeof session.lng === "number";
  const delta = 0.08;
  const mapSrc = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${session.lng! - delta}%2C${session.lat! - delta}%2C${session.lng! + delta}%2C${session.lat! + delta}&layer=mapnik&marker=${session.lat}%2C${session.lng}`
    : null;
  const cityLabel = session.city ?? "Lokasi tidak diketahui";

  return (
    <Box
      borderBottomWidth="1px"
      borderColor="var(--app-border)"
      py={4}
      _last={{ borderBottomWidth: 0 }}
    >
      <HStack gap={3} align="center">
        {/* Icon location kiri */}
        <Box color="var(--app-muted)" flexShrink={0}>
          <MapPin size={22} />
        </Box>

        {/* 2 tulisan atas-bawah: kota + waktu · device */}
        <VStack align="start" gap={0} flex={1} minW={0}>
          <HStack gap={2} align="center">
            <Text fontWeight="semibold" color="var(--app-text)" fontSize="md">
              {cityLabel}
            </Text>
            {session.isCurrent && (
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="blue.600"
                bg="blue.50"
                px={2}
                py={0.5}
                borderRadius="full"
              >
                Sesi ini
              </Text>
            )}
          </HStack>
          <Text color="var(--app-muted)" fontSize="sm">
            {formatTimeAgo(session.lastActiveAt)}{" "}
            <Text as="span" mx={1}>
              &middot;
            </Text>{" "}
            {session.device ?? "Perangkat tidak dikenal"}
          </Text>
        </VStack>

        {/* Chevron kanan */}
        <Box
          as="button"
          aria-label={expanded ? "Tutup lokasi" : "Lihat lokasi"}
          onClick={onToggle}
          color="var(--app-muted)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={2}
          borderRadius="full"
          cursor="pointer"
          _hover={{ bg: "var(--app-hover)", color: "var(--app-text)" }}
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Box>
      </HStack>

      {/* Expand: maps + tombol Keluar tengah */}
      {expanded && (
        <VStack align="stretch" gap={4} mt={4}>
          {mapSrc ? (
            <Box
              w="full"
              h="260px"
              borderRadius="lg"
              overflow="hidden"
              border="1px solid"
              borderColor="var(--app-border)"
              bg="var(--app-subtle)"
            >
              <iframe
                title={`Peta ${cityLabel}`}
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
              />
            </Box>
          ) : (
            <Box
              w="full"
              borderRadius="lg"
              border="1px solid"
              borderColor="var(--app-border)"
              bg="var(--app-subtle)"
              py={8}
              textAlign="center"
            >
              <Text fontSize="sm" color="var(--app-muted)">
                Lokasi maps tidak tersedia untuk sesi ini
                {session.ip ? ` (IP: ${session.ip})` : ""}.
              </Text>
            </Box>
          )}

          <Button
            alignSelf="center"
            px={10}
            borderRadius="lg"
            variant="outline"
            borderColor="var(--app-border)"
            color="var(--app-text)"
            _hover={{ bg: "var(--app-hover)" }}
            onClick={onLogoutClick}
          >
            Keluar
          </Button>
        </VStack>
      )}
    </Box>
  );
}

export default function LoginActivityPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useLoginSessions();
  const { mutate: revoke, isPending: isRevoking } = useRevokeSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logoutTarget, setLogoutTarget] = useState<LoginSession | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const { data: profile } = useProfile();
  const isGoogleLogin = profile?.loginMethod === "google";

  const sessions = data?.data ?? [];

  const handleChangePasswordClick = () => {
    if (isGoogleLogin) {
      Swal.fire({
        title: "Tidak Dapat Diakses",
        text: "Login dengan Google tidak bisa memakai fitur ubah kata sandi",
        icon: "info",
        confirmButtonColor: "#2563eb",
      });
      return;
    }
    setPwOpen(true);
  };

  // OK -> revoke sesi real di backend. Kalau sesi perangkat ini ikut tercabut,
  // bersihkan cookie + lempar ke /login (data real, bukan dummy).
  const handleConfirmLogout = () => {
    if (!logoutTarget) return;
    revoke(logoutTarget.id, {
      onSuccess: (res) => {
        if (expandedId === logoutTarget.id) setExpandedId(null);
        setLogoutTarget(null);
        if (res.data?.revokedCurrent) {
          Cookies.remove("access_token");
          Cookies.remove("refresh_token");
          Cookies.remove("uuid");
          Cookies.remove("loginMethod");
          router.replace("/login");
        }
      },
    });
  };

  return (
    <VStack flex={1} gap={6} align="stretch">
      <Box
        bg="var(--app-card)"
        borderRadius="2xl"
        shadow="sm"
        border="1px solid"
        borderColor="var(--app-border)"
        px={6}
        py={6}
      >
        {/* Judul atas kiri + tombol kembali ke /profile */}
        <HStack gap={2} align="center">
          <Box
            as="button"
            aria-label="Kembali ke profil"
            title="Kembali ke profil"
            onClick={() => router.push("/profile")}
            color="var(--app-text)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={2}
            ml={-2}
            borderRadius="full"
            cursor="pointer"
            _hover={{ bg: "var(--app-hover)" }}
          >
            <ArrowLeft size={22} />
          </Box>
          <Heading size="lg" fontWeight="bold" color="var(--app-text)">
            Aktivitas login
          </Heading>
        </HStack>

        {/* Sub judul */}
        <Text mt={4} fontWeight="semibold" color="var(--app-text)">
          Tempat Anda Login
        </Text>

        {/* Daftar riwayat real ke bawah */}
        <Box mt={2}>
          {isLoading ? (
            <HStack justify="center" py={10} gap={3}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color="var(--app-muted)">
                Memuat sesi login...
              </Text>
            </HStack>
          ) : isError ? (
            <VStack py={8} gap={3}>
              <Text color="var(--app-muted)" fontSize="sm" textAlign="center">
                Gagal memuat riwayat login.
              </Text>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Coba lagi
              </Button>
            </VStack>
          ) : sessions.length ? (
            sessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                expanded={expandedId === s.id}
                onToggle={() =>
                  setExpandedId((prev) => (prev === s.id ? null : s.id))
                }
                onLogoutClick={() => setLogoutTarget(s)}
              />
            ))
          ) : (
            <Text color="var(--app-muted)" fontSize="sm" py={6} textAlign="center">
              Belum ada riwayat login.
            </Text>
          )}
        </Box>
      </Box>

      <Text textAlign="center" color="var(--app-faint)" fontSize="sm" py={2}>
        &copy; 2026 Lentera
      </Text>

      {/* Modal tengah: Sesi Sudah Logout */}
      <Dialog.Root
        open={!!logoutTarget}
        onOpenChange={(e) => {
          if (!e.open) setLogoutTarget(null);
        }}
        placement="center"
        size="sm"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="var(--app-card)"
            color="var(--app-text)"
            borderRadius="xl"
            overflow="hidden"
            p={6}
          >
            <VStack gap={3} align="stretch" textAlign="center">
              <Dialog.Title fontWeight="bold" fontSize="lg">
                Sesi Sudah Logout
              </Dialog.Title>
              <Text fontSize="sm" color="var(--app-secondary)">
                Akun Anda sudah dikeluarkan dari sesi di{" "}
                {logoutTarget?.city ?? "lokasi tidak diketahui"} pada{" "}
                {logoutTarget?.device ?? "perangkat tidak dikenal"}. Jika Anda
                tidak mengetahui aktivitas ini, ganti kata sandi.
              </Text>

              <VStack gap={2} mt={3} align="stretch">
                {/* Google login tidak ada ubah kata sandi -> tombol di-hide, langsung OK saja */}
                {!isGoogleLogin && (
                  <Button
                    w="full"
                    borderRadius="lg"
                    variant="outline"
                    borderColor="var(--app-border)"
                    color="var(--app-text)"
                    _hover={{ bg: "var(--app-hover)" }}
                    onClick={handleChangePasswordClick}
                  >
                    Ubah Kata Sandi
                  </Button>
                )}
                <Button
                  w="full"
                  borderRadius="lg"
                  colorPalette="blue"
                  loading={isRevoking}
                  onClick={handleConfirmLogout}
                >
                  OK
                </Button>
              </VStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Kotak Ubah Sandi (dipindah dari /profile/edit ke sini) */}
      <ChangePassword
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        isGoogleLogin={isGoogleLogin}
      />
    </VStack>
  );
}

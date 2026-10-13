"use client";

import dynamic from "next/dynamic";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Heading,
  Container,
  Circle,
  Spinner,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, ArrowRight, ImagePlus } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { api } from "@/app/lib/axios";
import { uploadToCloudinary } from "@/app/lib/upload";

/* eslint-disable @next/next/no-img-element */

const DEFAULT_AVATAR = "/default-avatar.jpg";

function OnboardingAvatarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const isFromRegister = from === "register";
  const fileRef = useRef<HTMLInputElement>(null);

  // Halaman ini butuh token (habis daftar Google / habis verifikasi form).
  // Kalau dibuka langsung tanpa token, kembalikan ke login.
  useEffect(() => {
    if (!Cookies.get("access_token")) {
      router.replace("/login");
    }
  }, [router]);

  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const displaySrc = preview ?? DEFAULT_AVATAR;

  const handlePick = () => {
    if (!uploading && !saving) fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({ icon: "error", title: "File harus gambar" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "Maksimal 5MB ya!" });
      return;
    }

    // Preview lokal dulu biar interaktif
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const url = await uploadToCloudinary(file);
      setUploadedUrl(url);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Gagal upload",
        text: "Coba lagi atau pilih Nanti Saja",
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const goHome = () => router.replace("/");

  const handleLanjutkan = async () => {
    // Belum upload apa-apa = sama seperti Nanti Saja
    if (!uploadedUrl) {
      goHome();
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/profile", { avatar: uploadedUrl });
      goHome();
    } catch {
      Swal.fire({ icon: "error", title: "Gagal menyimpan foto" });
      setSaving(false);
    }
  };

  return (
    <Box
      minH="100vh"
      bg="var(--app-bg)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={10}
    >
      <Container width="600px" px={{ base: 4, md: 0 }}>
        <Box
          bg="var(--app-card)"
          p={{ base: 8, md: 12 }}
          borderRadius="3xl"
          shadow="2xl"
          borderWidth="1px"
          borderColor="var(--app-subtle)"
          w="full"
        >
          <VStack gap={8} align="stretch" w="full" textAlign="center">
            <VStack gap={3}>
              <Heading
                size="4xl"
                color="blue.600"
                fontWeight="black"
                letterSpacing="tighter"
              >
                Lentera
              </Heading>
              <Text color="blue.900" fontWeight="black" fontSize="xl">
                Pasang foto profil 📸
              </Text>
              <Text color="var(--app-muted)" fontWeight="medium" fontSize="sm">
                Biar teman-teman gampang kenalin kamu. Tenang, ini opsional
                kok!
              </Text>

              {/* Progress */}
              {isFromRegister ? (
                <>
                  <HStack gap={2} mt={2} justify="center">
                    <Box w="10" h="2" bg="blue.600" borderRadius="full" />
                  </HStack>
                  <Text fontSize="xs" fontWeight="black" color="var(--app-faint)">
                    LANGKAH TERAKHIR — TINGGAL FOTO!
                  </Text>
                </>
              ) : (
                <>
                  <HStack gap={2} mt={2} justify="center">
                    <Box w="10" h="2" bg="blue.600" borderRadius="full" />
                    <Box w="10" h="2" bg="blue.600" borderRadius="full" />
                  </HStack>
                  <Text fontSize="xs" fontWeight="black" color="var(--app-faint)">
                    LANGKAH 2 DARI 2 — TERAKHIR!
                  </Text>
                </>
              )}
            </VStack>

            {/* Avatar bulat */}
            <VStack gap={4}>
              <Box position="relative" mx="auto">
                <Circle
                  size="180px"
                  overflow="hidden"
                  border="6px solid"
                  borderColor="blue.100"
                  shadow="xl"
                  bg="var(--app-border)"
                  cursor={uploading ? "wait" : "pointer"}
                  onClick={handlePick}
                  _hover={{ transform: "scale(1.03)" }}
                  transition="0.2s"
                >
                  <img
                    src={displaySrc}
                    alt="Foto profil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: uploading ? 0.6 : 1,
                    }}
                  />
                </Circle>

                {uploading && (
                  <Box
                    position="absolute"
                    inset={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Spinner size="xl" color="blue.600" />
                  </Box>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFile}
                />

                {/* Buletan biru + icon camera */}
                <Circle
                  position="absolute"
                  bottom="8px"
                  right="8px"
                  size="48px"
                  bg="blue.600"
                  color="white"
                  border="4px solid white"
                  shadow="lg"
                  cursor={uploading ? "wait" : "pointer"}
                  onClick={handlePick}
                  _hover={{ transform: "scale(1.1)", bg: "blue.700" }}
                  transition="0.2s"
                >
                  {uploading ? (
                    <Spinner size="sm" color="white" />
                  ) : (
                    <Camera size={22} />
                  )}
                </Circle>
              </Box>

              <Button
                variant="outline"
                borderRadius="full"
                size="sm"
                onClick={handlePick}
                disabled={uploading || saving}
                color="blue.700"
                borderColor="blue.200"
              >
                <ImagePlus size={16} />
                {preview ? "Ganti foto" : "Pilih foto dari galeri"}
              </Button>

              {uploading && (
                <Text fontSize="xs" color="blue.600" fontWeight="bold">
                  Mengunggah... sebentar ya ⏳
                </Text>
              )}
              {!uploading && uploadedUrl && (
                <Text fontSize="xs" color="green.600" fontWeight="bold">
                  🎉 Foto siap! Klik Lanjutkan untuk masuk.
                </Text>
              )}
            </VStack>

            {/* Nanti Saja + Lanjutkan */}
            <VStack gap={3}>
              <Button
                bg="blue.600"
                color="white"
                h="16"
                w="full"
                borderRadius="2xl"
                fontWeight="black"
                fontSize="lg"
                loading={saving}
                disabled={uploading || saving}
                onClick={handleLanjutkan}
                _hover={{ bg: "blue.700", transform: "translateY(-2px)" }}
                gap={3}
              >
                Lanjutkan <ArrowRight size={24} />
              </Button>
              <Button
                variant="ghost"
                w="full"
                borderRadius="2xl"
                color="var(--app-muted)"
                fontWeight="bold"
                disabled={uploading || saving}
                onClick={goHome}
                _hover={{ bg: "var(--app-subtle)", color: "var(--app-secondary)" }}
              >
                Nanti Saja
              </Button>
            </VStack>
          </VStack>
        </Box>

        <Text textAlign="center" fontSize="xs" color="var(--app-faint)" mt={4}>
          Kamu bisa ganti foto kapan aja di Edit Profil
        </Text>
      </Container>
    </Box>
  );
}

function OnboardingAvatarPage() {
  return (
    <Suspense>
      <OnboardingAvatarInner />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(OnboardingAvatarPage), {
  ssr: false,
});

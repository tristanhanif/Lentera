"use client";
import {
  Box,
  Center,
  Circle,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Cookies from "js-cookie";
import { api } from "@/app/lib/axios";

function VerifikasiBerhasilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const uuid = searchParams.get("uuid");

    // Token tidak lengkap → kembali ke login
    if (!accessToken || !refreshToken || !uuid) {
      router.replace("/login");
      return;
    }

    // Simpan token baru ke cookie
    Cookies.set("access_token", accessToken);
    Cookies.set("refresh_token", refreshToken);
    Cookies.set("uuid", uuid);

    // User form yang belum punya avatar -> arahkan ke onboarding avatar
    // (sama kayak Google: upload / Nanti Saja), yang sudah ada -> Beranda
    (async () => {
      try {
        const res = await api.get("/auth/profile");
        const avatar = res.data?.data?.avatar;
        if (!avatar) {
          router.replace("/onboarding/avatar?from=register");
        } else {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    })();
  }, [router, searchParams]);

  return (
    <Box minH="100vh" bg="var(--app-bg)" display="flex" alignItems="center" justifyContent="center">
      <Center>
        <VStack gap={6}>
          <Circle size="100px" bg="var(--app-hover)">
            <Spinner size="xl" color="blue.600" />
          </Circle>
          <VStack gap={1}>
            <Text fontWeight="black" fontSize="xl" color="blue.600">
              Verifikasi berhasil!
            </Text>
            <Text color="blue.900" fontWeight="medium">
              Akun Anda sudah resmi. Mengantar Anda ke Beranda Lentera...
            </Text>
          </VStack>
        </VStack>
      </Center>
    </Box>
  );
}

export default function VerifikasiBerhasilPage() {
  return (
    <Suspense fallback={null}>
      <VerifikasiBerhasilContent />
    </Suspense>
  );
}

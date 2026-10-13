"use client";

import dynamic from "next/dynamic";
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Heading,
  Field,
  Container,
  Flex,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, AtSign, ArrowRight, Mail, Check, X, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import Cookies from "js-cookie";
import Swal from "sweetalert2";
import { api } from "@/app/lib/axios";

function OnboardingUsernameInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const googleName = searchParams.get("name") ?? "";
  const suggested = searchParams.get("suggested") ?? "";

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kalau tidak ada email (akses langsung), tendang ke login
  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  // Kalau ternyata sudah login (punya akun), jangan onboarding lagi
  useEffect(() => {
    if (Cookies.get("access_token")) {
      router.replace("/");
    }
  }, [router]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: googleName,
      username: suggested,
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, "Nama minimal 2 karakter")
        .max(50, "Nama maksimal 50 karakter")
        .required("Nama lengkap wajib diisi"),
      username: Yup.string()
        .min(3, "Username minimal 3 karakter")
        .max(30, "Username maksimal 30 karakter")
        .matches(
          /^[a-zA-Z0-9._]+$/,
          "Hanya huruf, angka, titik (.) dan underscore (_), tanpa spasi",
        )
        .required("Username wajib diisi"),
    }),
    onSubmit: async (values) => {
      if (available === false) return;
      setSubmitting(true);
      try {
        const res = await api.post("/auth/complete-google-register", {
          email,
          name: values.name.trim(),
          username: values.username.toLowerCase().trim(),
        });

        Cookies.set("access_token", res.data.access_token);
        Cookies.set("refresh_token", res.data.refresh_token);
        Cookies.set("uuid", res.data.user.id);
        Cookies.set("loginMethod", "google");

        router.push("/onboarding/avatar");
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || "Gagal membuat akun, coba lagi";
        Swal.fire({ icon: "error", title: "Oops!", text: message });
      } finally {
        setSubmitting(false);
      }
    },
  });

  // Live check username ke backend (debounce 500ms)
  useEffect(() => {
    const u = formik.values.username.trim().toLowerCase();
    setAvailable(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!u || u.length < 3 || !/^[a-zA-Z0-9._]+$/.test(u)) return;

    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/auth/check-username", {
          params: { username: u },
        });
        setAvailable(res.data.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.username]);

  const usernameState = useMemo(() => {
    if (checking) return "checking";
    if (formik.errors.username) return "invalid";
    if (available === true) return "available";
    if (available === false) return "taken";
    return "idle";
  }, [checking, formik.errors.username, available]);

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
          <VStack gap={8} align="stretch" w="full">
            {/* Header */}
            <VStack gap={3} textAlign="center">
              <Heading
                size="4xl"
                color="blue.600"
                fontWeight="black"
                letterSpacing="tighter"
              >
                Lentera
              </Heading>
              <HStack justify="center">
                <Sparkles size={18} color="#2563eb" />
                <Text color="blue.900" fontWeight="black" fontSize="xl">
                  Satu langkah lagi!
                </Text>
                <Sparkles size={18} color="#2563eb" />
              </HStack>
              <Text color="var(--app-muted)" fontWeight="medium" fontSize="sm">
                Akun Google kamu belum terdaftar. Yuk lengkapi profil biar
                bisa mulai bersinar ✨
              </Text>

              {/* Email yang dipilih */}
              {email && (
                <HStack
                  bg="var(--app-hover)"
                  border="1px solid"
                  borderColor="blue.100"
                  borderRadius="full"
                  px={4}
                  py={2}
                >
                  <Mail size={16} color="#2563eb" />
                  <Text fontSize="sm" fontWeight="bold" color="blue.900">
                    {email}
                  </Text>
                  <Badge colorPalette="green" borderRadius="full" fontSize="10px">
                    Google
                  </Badge>
                </HStack>
              )}

              {/* Progress */}
              <HStack gap={2} mt={2}>
                <Box w="10" h="2" bg="blue.600" borderRadius="full" />
                <Box w="10" h="2" bg="var(--app-border)" borderRadius="full" />
              </HStack>
              <Text fontSize="xs" fontWeight="black" color="var(--app-faint)">
                LANGKAH 1 DARI 2
              </Text>
            </VStack>

            <FormikProvider value={formik}>
              <form onSubmit={formik.handleSubmit}>
                <VStack gap={5} align="stretch" w="full">
                  {/* Nama Lengkap */}
                  <Field.Root
                    w="full"
                    invalid={!!formik.errors.name && formik.touched.name}
                  >
                    <Field.Label fontWeight="bold" color="blue.900" mb={2}>
                      Mau dipanggil siapa? 📛
                    </Field.Label>
                    <Box position="relative" w="full">
                      <Flex
                        position="absolute"
                        left={5}
                        top="50%"
                        transform="translateY(-50%)"
                        zIndex={10}
                        color="blue.500"
                      >
                        <User size={22} />
                      </Flex>
                      <Input
                        name="name"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Nama lengkap kamu"
                        h="16"
                        pl={14}
                        bg="var(--app-hover)"
                        color="var(--app-text)"
                        borderRadius="2xl"
                        fontSize="md"
                        _focus={{
                          bg: "var(--app-card)",
                          borderColor: "blue.500",
                        }}
                      />
                    </Box>
                    {formik.touched.name && formik.errors.name && (
                      <Text color="red.500" fontSize="xs" fontWeight="bold">
                        {formik.errors.name}
                      </Text>
                    )}
                  </Field.Root>

                  {/* Username */}
                  <Field.Root
                    w="full"
                    invalid={!!formik.errors.username && !!formik.touched.username}
                  >
                    <Field.Label fontWeight="bold" color="blue.900" mb={2}>
                      Mau kamu kasih username apa? 🏷️
                    </Field.Label>
                    <Box position="relative" w="full">
                      <Flex
                        position="absolute"
                        left={5}
                        top="50%"
                        transform="translateY(-50%)"
                        zIndex={10}
                        color="blue.500"
                      >
                        <AtSign size={22} />
                      </Flex>
                      <Input
                        name="username"
                        value={formik.values.username}
                        onChange={(e) =>
                          formik.setFieldValue(
                            "username",
                            e.target.value.replace(/\s+/g, "").toLowerCase(),
                          )
                        }
                        onBlur={formik.handleBlur}
                        placeholder="username_kamu"
                        h="16"
                        pl={14}
                        pr={14}
                        bg="var(--app-hover)"
                        color="var(--app-text)"
                        borderRadius="2xl"
                        fontSize="md"
                        borderColor={
                          usernameState === "taken" ||
                          (formik.touched.username && formik.errors.username)
                            ? "red.300"
                            : usernameState === "available"
                              ? "green.300"
                              : undefined
                        }
                        _focus={{ bg: "var(--app-card)", borderColor: "blue.500" }}
                      />
                      <Flex
                        position="absolute"
                        right={4}
                        top="50%"
                        transform="translateY(-50%)"
                        zIndex={10}
                      >
                        {usernameState === "checking" && (
                          <Spinner size="sm" color="blue.500" />
                        )}
                        {usernameState === "available" && (
                          <Check size={22} color="#16a34a" />
                        )}
                        {(usernameState === "taken" ||
                          usernameState === "invalid") &&
                          formik.values.username && (
                            <X size={22} color="#dc2626" />
                          )}
                      </Flex>
                    </Box>

                    {formik.touched.username && formik.errors.username ? (
                      <Text color="red.500" fontSize="xs" fontWeight="bold">
                        {formik.errors.username}
                      </Text>
                    ) : usernameState === "available" ? (
                      <Text color="green.600" fontSize="xs" fontWeight="bold">
                        🎉 Username tersedia! Keren, langsung amankan!
                      </Text>
                    ) : usernameState === "taken" ? (
                      <Text color="red.500" fontSize="xs" fontWeight="bold">
                        😅 Username sudah dipakai, coba yang lain yuk
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="var(--app-faint)" fontWeight="medium">
                        Tanpa spasi. Boleh huruf, angka, titik (.) dan
                        underscore (_).
                      </Text>
                    )}

                    {/* Preview */}
                    {formik.values.username.length >= 3 &&
                      !formik.errors.username && (
                        <Box
                          mt={2}
                          bg="var(--app-input)"
                          borderRadius="xl"
                          px={4}
                          py={3}
                          border="1px dashed"
                          borderColor="var(--app-border)"
                        >
                          <Text fontSize="xs" color="var(--app-faint)" fontWeight="bold">
                            PRATINJAU PROFIL
                          </Text>
                          <Text fontWeight="black" color="blue.900">
                            {formik.values.name || "Nama Kamu"}{" "}
                            <Text as="span" color="blue.500" fontWeight="bold">
                              @{formik.values.username.toLowerCase()}
                            </Text>
                          </Text>
                        </Box>
                      )}
                  </Field.Root>

                  <Button
                    type="submit"
                    bg="blue.600"
                    color="white"
                    h="16"
                    w="full"
                    borderRadius="2xl"
                    fontWeight="black"
                    fontSize="lg"
                    loading={submitting}
                    disabled={
                      !formik.isValid || submitting || available === false
                    }
                    _hover={{ bg: "blue.700", transform: "translateY(-2px)" }}
                    gap={3}
                  >
                    Lanjutkan <ArrowRight size={24} />
                  </Button>
                </VStack>
              </form>
            </FormikProvider>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

function OnboardingUsernamePage() {
  return (
    <Suspense>
      <OnboardingUsernameInner />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve(OnboardingUsernamePage), {
  ssr: false,
});

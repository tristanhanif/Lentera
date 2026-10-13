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
  Separator,
  Flex,
  IconButton,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import * as Yup from "yup";
import { useFormik, FormikProvider } from "formik";
import { LoginPayload } from "./login.interface";
import { useLogin } from "./login.service";
import Cookies from "js-cookie";
import { useColorModeValue } from "@/components/ui/color-mode";

function GoogleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45c-.28 1.48-1.12 2.73-2.39 3.58v2.97h3.87c2.26-2.09 3.57-5.16 3.57-8.74z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-2.97c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.07C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.25-.72-.39-1.49-.39-2.31s.14-1.59.39-2.31V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.07z"
      />
      <path
        fill="#EA4335"
        d="M12 4.73c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.07C6.22 6.84 8.87 4.73 12 4.73z"
      />
    </svg>
  );
}

function LoginPage() {
  const router = useRouter();
  const mutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const welcomeTitleColor = useColorModeValue("blue.900", "white");
  const welcomeSubtitleColor = useColorModeValue("blue.400", "white");
  const labelColor = useColorModeValue("blue.900", "white");
  const fieldIconColor = useColorModeValue("blue.500", "white");
  const eyeIconColor = useColorModeValue("blue.400", "white");
  const eyeHoverColor = useColorModeValue("blue.600", "white");
  const googleBorderColor = useColorModeValue("var(--app-border)", "white");
  const cardBorderColor = useColorModeValue("var(--app-subtle)", "white");

  const handleGoogleLogin = () => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URL_GOOGLE!,
      client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
 
    const qs = new URLSearchParams(options).toString();
    window.location.assign(`${rootUrl}?${qs}`);
  };

  // 🔒 Cek jika user sudah login, redirect ke beranda
  useEffect(() => {
    const accessToken = Cookies.get("access_token");

    if (accessToken) {
      router.replace("/");
    }
  }, [router]);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email("Email tidak valid")
        .required("Email wajib diisi"),
      password: Yup.string()
        .min(6, "Password minimal 6 karakter")
        .required("Password wajib diisi"),
    }),
    onSubmit: (values: LoginPayload) => {
      // Panggil mutation ketika berhasil
      mutation.mutate(values);
    },
    enableReinitialize: true,
  });

  {
    console.log("validasi form", formik.errors);
  }
  {
    console.log("isi form", formik.values);
  }

  return (
    <Box
      minH="100vh"
      bg="var(--app-bg)"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Menggunakan maxW="600px" agar sama lebarnya dengan Register */}
      <Container width="600px" py={10} px={{ base: 4, md: 0 }}>
        <Box
          bg="var(--app-card)"
          p={{ base: 8, md: 16 }}
          borderRadius="3xl"
          shadow="2xl"
          borderWidth="1px"
          borderColor={cardBorderColor}
          w="full"
        >
          <VStack gap={10} align="stretch" w="full">
            {/* Header */}
            <VStack gap={3} textAlign="center">
              <Heading
                size="5xl"
                color="blue.600"
                fontWeight="black"
                letterSpacing="tighter"
              >
                Lentera
              </Heading>
              <Text color={welcomeTitleColor} fontWeight="bold" fontSize="xl">
                Selamat Datang Kembali!
              </Text>
              <Text color={welcomeSubtitleColor} fontWeight="medium">
                Masuk untuk terus berbagi inspirasi.
              </Text>
            </VStack>

            <VStack gap={8} align="stretch" w="full">
              {/* Tombol Google */}
              <Button
                variant="outline"
                size="lg"
                onClick={handleGoogleLogin}
                h="16"
                w="full" // Pastikan tombol Google melebar penuh
                borderRadius="2xl"
                borderWidth="1px"
                borderColor={googleBorderColor}
                bg="var(--app-card)"
                _hover={{ bg: "var(--app-input)", borderColor: "blue.200" }}
              >
                <HStack gap={4}>
                  <GoogleIcon size={24} />
                  <Text color="var(--app-secondary)" fontWeight="bold" fontSize="md">
                    Masuk dengan Google
                  </Text>
                </HStack>
              </Button>

              <HStack w="full" gap={6}>
                <Separator flex={1} />
                <Text fontSize="xs" fontWeight="black" color="var(--app-faint)">
                  ATAU EMAIL
                </Text>
                <Separator flex={1} />
              </HStack>

              {/* Form Area */}
              <FormikProvider value={formik}>
                <form onSubmit={formik.handleSubmit}>
                  <VStack gap={6} align="stretch" w="full">
                    {/* Email Field */}
                    <Field.Root
                      w="full"
                      invalid={!!formik.errors.email && formik.touched.email}
                    >
                      {" "}
                      {/* Tambahkan w="full" */}
                      <Field.Label fontWeight="bold" color={labelColor} mb={2}>
                        Email
                      </Field.Label>
                      <Box position="relative" w="full">
                        {" "}
                        {/* Tambahkan w="full" */}
                        <Flex
                          position="absolute"
                          left={5}
                          top="50%"
                          transform="translateY(-50%)"
                          zIndex={10}
                          color={fieldIconColor}
                        >
                          <Mail size={22} />
                        </Flex>
                        <Input
                          w="full"
                          name="email"
                          size="lg"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur} // 🔴 PENTING
                          placeholder="nama@email.com"
                          h="16"
                          pl={14}
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          autoComplete="email" // 🟢 tambahan kecil tapi bagus
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                        />
                      </Box>
                      {formik.touched.email && formik.errors.email && (
                        <Text color="red.500" fontSize="xs">
                          {formik.errors.email}
                        </Text>
                      )}
                    </Field.Root>

                    {/* Password Field */}
                    <Field.Root
                      w="full"
                      invalid={
                        !!formik.errors.password && formik.touched.password
                      }
                    >
                      {" "}
                      {/* Tambahkan w="full" */}
                      <Flex
                        justify="space-between"
                        align="center"
                        mb={2}
                        w="full"
                      >
                        <Field.Label fontWeight="bold" color={labelColor} m={0}>
                          Password
                        </Field.Label>
                        <Button
                          variant="plain"
                          size="sm"
                          color="blue.600"
                          fontWeight="black"
                          p={0}
                          h="auto"
                          onClick={() => router.push("/forgot-password")}
                          _hover={{ textDecoration: "underline" }}
                        >
                          Lupa Password?
                        </Button>
                      </Flex>
                      <Box position="relative" w="full">
                        {" "}
                        {/* Tambahkan w="full" */}
                        <Flex
                          position="absolute"
                          left={5}
                          top="50%"
                          transform="translateY(-50%)"
                          zIndex={10}
                          color={fieldIconColor}
                        >
                          <Lock size={22} />
                        </Flex>
                        <Input
                          w="full"
                          name="password" // 🔴 WAJIB ADA
                          type={showPassword ? "text" : "password"}
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur} // 🔴 WAJIB
                          placeholder="••••••••"
                          h="16"
                          pl={14}
                          pr={14}
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          autoComplete="current-password"
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                        />
                        {/* Tombol Show/Hide Password */}
                        <Box
                          position="absolute"
                          right={4}
                          top="50%"
                          transform="translateY(-50%)"
                          zIndex={10}
                        >
                          <IconButton
                            variant="ghost"
                            color={eyeIconColor}
                            _hover={{ color: eyeHoverColor, bg: "transparent" }}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff size={22} />
                            ) : (
                              <Eye size={22} />
                            )}
                          </IconButton>
                        </Box>
                      </Box>
                      {formik.touched.password && formik.errors.password && (
                        <Text color="red.500" fontSize="xs">
                          {formik.errors.password}
                        </Text>
                      )}
                    </Field.Root>

                    <Button
                      bg="blue.600"
                      color="white"
                      h="16"
                      loading={mutation.isPending} // ✅ ganti dari loading
                      disabled={!formik.isValid || mutation.isPending} // ✅ cegah submit invalid & spam
                      type="submit"
                      w="full"
                      borderRadius="2xl"
                      fontWeight="black"
                      fontSize="lg"
                      mt={4}
                      _hover={{
                        bg: "blue.700",
                        shadow: "2xl",
                        transform: "translateY(-2px)",
                      }}
                      gap={3}
                    >
                      Masuk Sekarang <ArrowRight size={24} />
                    </Button>
                  </VStack>
                </form>
              </FormikProvider>
            </VStack>

            <Box textAlign="center">
              <Text fontSize="md" color="var(--app-text)" fontWeight="bold">
                Belum punya akun?{" "}
                <Text
                  as="span"
                  color="blue.600"
                  cursor="pointer"
                  fontWeight="black"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => router.push("/register")}
                >
                  Daftar Gratis
                </Text>
              </Text>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default dynamic(() => Promise.resolve(LoginPage), { ssr: false });

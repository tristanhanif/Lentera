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
import {
  Mail,
  Lock,
  User,
  AtSign,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useFormik, FormikProvider } from "formik";
import * as Yup from "yup";
import { useRegister } from "./register.service";
import { RegisterPayload } from "./register.interface";
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

function RegisterPage() {
  const router = useRouter();
  const mutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const welcomeTitleColor = useColorModeValue("blue.900", "white");
  const welcomeSubtitleColor = useColorModeValue("blue.400", "white");
  const labelColor = useColorModeValue("blue.900", "white");
  const fieldIconColor = useColorModeValue("blue.500", "white");
  const eyeIconColor = useColorModeValue("gray.500", "white");
  const googleBorderColor = useColorModeValue("var(--app-border)", "white");
  const cardBorderColor = useColorModeValue("var(--app-subtle)", "white");

  const handleGoogleLogin = () => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
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

  // Cek jika user sudah login, redirect ke beranda
  useEffect(() => {
    const accessToken = Cookies.get("access_token");

    if (accessToken) {
      router.replace("/");
    }
  }, [router]);

  const formik = useFormik<RegisterPayload>({
    initialValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
    validationSchema: Yup.object({
      name: Yup.string().required("Nama wajib diisi"),
      username: Yup.string()
        .min(3, "Username minimal 3 karakter")
        .max(30, "Username maksimal 30 karakter")
        .matches(
          /^[a-zA-Z0-9._]+$/,
          "Username hanya boleh huruf, angka, titik (.) dan underscore (_), tanpa spasi",
        )
        .required("Username wajib diisi"),
      email: Yup.string()
        .email("Email tidak valid")
        .required("Email wajib diisi"),
      password: Yup.string()
        .min(6, "Password minimal 6 karakter")
        .required("Password wajib diisi"),
    }),
    onSubmit: (values) => {
      mutation.mutate(values);
    },
  });

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
                Buat Akun Baru
              </Text>
              <Text color={welcomeSubtitleColor} fontWeight="medium">
                Bergabunglah dengan komunitas kreatif kami hari ini.
              </Text>
            </VStack>

            <VStack gap={6} align="stretch" w="full">
              {/* Google Button */}
              <Button
                variant="outline"
                size="lg"
                h="16"
                w="full"
                borderRadius="2xl"
                borderWidth="1px"
                borderColor={googleBorderColor}
                bg="var(--app-card)"
                _hover={{ bg: "var(--app-input)", borderColor: "blue.200" }}
                onClick={handleGoogleLogin}
              >
                <HStack gap={4}>
                  <GoogleIcon size={24} />
                  <Text
                    color="var(--app-secondary)"
                    fontWeight="bold"
                    fontSize="md"
                  >
                    Daftar dengan Google
                  </Text>
                </HStack>
              </Button>

              <HStack w="full" gap={6}>
                <Separator flex={1} />
                <Text fontSize="xs" fontWeight="black" color="var(--app-faint)">
                  ATAU FORMULIR
                </Text>
                <Separator flex={1} />
              </HStack>

              {/* FORM */}
              <FormikProvider value={formik}>
                <form onSubmit={formik.handleSubmit}>
                  <VStack gap={5} align="stretch">
                    {/* Name */}
                    <Field.Root
                      w="full"
                      invalid={!!formik.errors.name && formik.touched.name}
                    >
                      <Field.Label fontWeight="bold" color={labelColor} mb={2}>
                        Nama Lengkap
                      </Field.Label>

                      <Box position="relative" w="full">
                        <Flex
                          position="absolute"
                          left={5}
                          top="50%"
                          transform="translateY(-50%)"
                          zIndex={10}
                          color={fieldIconColor}
                        >
                          <User size={22} />
                        </Flex>

                        <Input
                          w="full"
                          name="name"
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          placeholder="Nama lengkap"
                          h="16"
                          pl={14}
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                        />
                      </Box>

                      {formik.errors.name && (
                        <Text color="red.500" fontSize="xs">
                          {formik.errors.name}
                        </Text>
                      )}
                    </Field.Root>

                    {/* Username */}
                    <Field.Root w="full" invalid={!!formik.errors.username}>
                      <Field.Label fontWeight="bold" color={labelColor}>
                        Username
                      </Field.Label>

                      <Box position="relative" w="full">
                        <Flex
                          position="absolute"
                          left={5}
                          top="50%"
                          transform="translateY(-50%)"
                          zIndex={10}
                          color={fieldIconColor}
                        >
                          <AtSign size={22} />
                        </Flex>

                        <Input
                          w="full"
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                          name="username"
                          value={formik.values.username}
                          onChange={(e) =>
                            formik.setFieldValue(
                              "username",
                              e.target.value.replace(/\s+/g, ""),
                            )
                          }
                          pl={14}
                          h="16"
                          placeholder="username_anda"
                        />
                      </Box>

                      {formik.errors.username && (
                        <Text fontSize="xs" color="red.500">
                          {formik.errors.username}
                        </Text>
                      )}
                    </Field.Root>

                    {/* Email */}
                    <Field.Root w="full" invalid={!!formik.errors.email}>
                      <Field.Label fontWeight="bold" color={labelColor}>
                        Email
                      </Field.Label>

                      <Box position="relative" w="full">
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
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                          name="email"
                          type="email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          pl={14}
                          h="16"
                          placeholder="nama@email.com"
                        />
                      </Box>

                      {formik.errors.email && (
                        <Text fontSize="xs" color="red.500">
                          {formik.errors.email}
                        </Text>
                      )}
                    </Field.Root>

                    {/* Password */}
                    <Field.Root w="full" invalid={!!formik.errors.password}>
                      <Field.Label fontWeight="bold" color={labelColor}>
                        Password
                      </Field.Label>

                      <Box position="relative" w="full">
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
                          bg="var(--app-hover)"
                          color="var(--app-text)"
                          borderRadius="2xl"
                          fontSize="md"
                          _focus={{
                            bg: "var(--app-card)",
                            borderColor: "blue.500",
                            ring: "3px",
                            ringColor: "var(--app-hover)",
                          }}
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          pl={14}
                          pr={14}
                          h="16"
                          placeholder="••••••••"
                        />

                        <IconButton
                          position="absolute"
                          right={4}
                          top="50%"
                          transform="translateY(-50%)"
                          variant="ghost"
                          color={eyeIconColor}
                          _hover={{ bg: "transparent" }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </IconButton>
                      </Box>

                      {formik.errors.password && (
                        <Text fontSize="xs" color="red.500">
                          {formik.errors.password}
                        </Text>
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
                      loading={mutation.isPending}
                      gap={3}
                    >
                      Daftar Sekarang <ArrowRight />
                    </Button>
                  </VStack>
                </form>
              </FormikProvider>
            </VStack>

            <Box textAlign="center">
              <Text fontWeight="bold" color="var(--app-text)">
                Sudah punya akun?{" "}
                <Text
                  as="span"
                  color="blue.600"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => router.push("/login")}
                >
                  Masuk di sini
                </Text>
              </Text>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
}

export default dynamic(() => Promise.resolve(RegisterPage), { ssr: false });

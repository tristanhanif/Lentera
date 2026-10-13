"use client";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Flex,
  Portal,
  IconButton,
  Input,
  Heading,
} from "@chakra-ui/react";
import { X, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import Swal from "sweetalert2";
import { changePassword } from "../profile.service";

export function ChangePassword({
  isOpen,
  onClose,
  isGoogleLogin = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  isGoogleLogin?: boolean;
}) {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formik = useFormik({
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required(
        "Kata sandi saat ini wajib diisi"
      ),
      newPassword: Yup.string()
        .min(8, "Password baru minimal 8 karakter")
        .required("Kata sandi baru wajib diisi"),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref("newPassword")], "Konfirmasi password tidak cocok")
        .required("Konfirmasi password wajib diisi"),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await changePassword(values);

        await Swal.fire({
          title: "Berhasil",
          text: "Kata sandi berhasil diubah",
          icon: "success",
          confirmButtonColor: "#2563eb",
        });

        resetForm();
        onClose();
      } catch (error: any) {
        await Swal.fire({
          title: "Gagal",
          text:
            error?.response?.data?.message ||
            "Terjadi kesalahan saat mengubah password",
          icon: "error",
          confirmButtonColor: "#2563eb",
        });
      }
    },
  });

  // Jangan render modal jika login via Google atau tidak dibuka.
  // Ditaruh SETELAH semua hooks agar tidak melanggar Rules of Hooks
  // (early return sebelum useState/useFormik menyebabkan "Expected static flag was missing").
  if (isGoogleLogin || !isOpen) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.700"
        zIndex={2000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={4}
        onClick={onClose}
      >
        <Box
          bg="var(--app-card)"
          w="full"
          maxW="500px"
          borderRadius="3xl"
          shadow="2xl"
          overflow="hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <Flex
            justify="space-between"
            align="center"
            p={6}
            borderBottom="1px solid"
            borderColor="var(--app-hover)"
          >
            <HStack gap={3}>
              <Box bg="var(--app-hover)" p={2} borderRadius="lg">
                <Lock size={20} color="#2563eb" />
              </Box>
              <VStack align="start" gap={0}>
                <Heading size="sm" color="blue.900">
                  Ubah Kata Sandi
                </Heading>
                <Text
                  fontSize="xs"
                  color="blue.400"
                  fontWeight="bold"
                >
                  Amankan akun Anda
                </Text>
              </VStack>
            </HStack>
            <IconButton
              aria-label="Close"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X size={20} />
            </IconButton>
          </Flex>

          {/* BODY */}
          <form onSubmit={formik.handleSubmit}>
            <VStack p={6} gap={6} align="stretch">
              <HStack
                bg="var(--app-hover)"
                p={4}
                borderRadius="xl"
                gap={4}
                align="start"
              >
                <ShieldCheck size={24} color="#2563eb" />
                <Text
                  fontSize="xs"
                  color="blue.900"
                  fontWeight="medium"
                  lineHeight="tall"
                >
                  Gunakan kombinasi huruf, angka, dan simbol untuk
                  kata sandi yang lebih kuat.
                </Text>
              </HStack>

              <VStack gap={4} align="stretch">
                {/* CURRENT PASSWORD */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="bold" fontSize="xs">
                    Kata Sandi Saat Ini
                  </Text>
                  <Box position="relative" w="full">
                    <Input
                      name="currentPassword"
                      type={showOld ? "text" : "password"}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.currentPassword}
                      placeholder="Masukkan sandi lama"
                      size="lg"
                      borderColor={
                        formik.errors.currentPassword && formik.touched.currentPassword
                          ? "red.500"
                          : undefined
                      }
                    />
                    <IconButton
                      aria-label="Toggle password"
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOld(!showOld)}
                    >
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </Box>
                  {formik.errors.currentPassword && formik.touched.currentPassword && (
                    <Text fontSize="xs" color="red.500" fontWeight="medium">
                      {formik.errors.currentPassword}
                    </Text>
                  )}
                </VStack>

                {/* NEW PASSWORD */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="bold" fontSize="xs">
                    Kata Sandi Baru
                  </Text>
                  <Box position="relative" w="full">
                    <Input
                      name="newPassword"
                      type={showNew ? "text" : "password"}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.newPassword}
                      placeholder="Minimal 8 karakter"
                      size="lg"
                      borderColor={
                        formik.errors.newPassword && formik.touched.newPassword
                          ? "red.500"
                          : undefined
                      }
                    />
                    <IconButton
                      aria-label="Toggle password"
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </Box>
                  {formik.errors.newPassword && formik.touched.newPassword && (
                    <Text fontSize="xs" color="red.500" fontWeight="medium">
                      {formik.errors.newPassword}
                    </Text>
                  )}
                </VStack>

                {/* CONFIRM PASSWORD */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="bold" fontSize="xs">
                    Konfirmasi Kata Sandi Baru
                  </Text>
                  <Box position="relative" w="full">
                    <Input
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.confirmPassword}
                      placeholder="Ulangi sandi baru"
                      size="lg"
                      borderColor={
                        formik.errors.confirmPassword && formik.touched.confirmPassword
                          ? "red.500"
                          : undefined
                      }
                    />
                    <IconButton
                      aria-label="Toggle password"
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </IconButton>
                  </Box>
                  {formik.errors.confirmPassword && formik.touched.confirmPassword && (
                    <Text fontSize="xs" color="red.500" fontWeight="medium">
                      {formik.errors.confirmPassword}
                    </Text>
                  )}
                </VStack>
              </VStack>

              <Button
                type="submit"
                bg="blue.600"
                color="white"
                size="lg"
                h="12"
                borderRadius="xl"
                fontWeight="bold"
                loading={formik.isSubmitting}
                _hover={{ bg: "blue.700" }}
              >
                Simpan Perubahan
              </Button>
            </VStack>
          </form>
        </Box>
      </Box>
    </Portal>
  );
}
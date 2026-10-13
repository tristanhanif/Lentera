"use client";

import dynamic from "next/dynamic";
import {
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Heading,
  Center,
  Box,
  Icon,
} from "@chakra-ui/react";
import { ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { api } from "@/app/lib/axios";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

function ResetPassword({ email }: { email: string }) {
  const router = useRouter();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef<HTMLInputElement[]>([]);

  const otpValue = otp.join("");
  const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2");

  const handleOtpChange = (el: HTMLInputElement, index: number) => {
    if (isNaN(Number(el.value)) && el.value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = el.value;
    setOtp(newOtp);

    if (el.value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (!el.value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validationSchema = Yup.object().shape({
    password: Yup.string()
      .min(8, "Password minimal 8 karakter")
      .matches(/^\S*$/, "Password tidak boleh ada spasi")
      .required("Password diperlukan"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), undefined], "Password tidak cocok")
      .required("Konfirmasi password diperlukan"),
  });

  const handleSubmit = async (values: {
    password: string;
    confirmPassword: string;
  }) => {
    if (otpValue.length !== 6) {
      Swal.fire("Oops!", "OTP harus 6 digit", "warning");
      return;
    }

    try {
      setIsLoading(true);

      await api.post("/auth/reset-password", {
        email,
        otp: otpValue,
        newPassword: values.password,
      });

      await Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Password berhasil diubah, silakan login",
        confirmButtonColor: "#2563eb",
      });

      router.push("/login");
    } catch (err: any) {
      Swal.fire(
        "Gagal",
        err.response?.data?.message || "Reset password gagal",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Formik
      initialValues={{ password: "", confirmPassword: "" }}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting }) => (
        <Form>
          <VStack gap={10} align="stretch">
            {/* Header */}
            <VStack textAlign="center" gap={3}>
              <Center bg="var(--app-hover)" w="80px" h="80px" borderRadius="2xl">
                <ShieldCheck size={40} color="#2563eb" />
              </Center>

              <Heading size="2xl" color="blue.600" fontWeight="black">
                Reset Password
              </Heading>

              <Text color="blue.400" fontWeight="medium">
                Masukkan OTP yang dikirim ke <b>{maskedEmail}</b>
              </Text>
            </VStack>

            {/* OTP */}
            <HStack justify="center" gap={3}>
              {otp.map((val, i) => (
                <Input
                  key={i}
                  ref={(el) => {
                    if (el) inputRefs.current[i] = el;
                  }}
                  value={val}
                  maxLength={1}
                  onChange={(e) => handleOtpChange(e.target, i)}
                  textAlign="center"
                  fontSize="2xl"
                  fontWeight="black"
                  w="55px"
                  h="65px"
                  bg="blue.50/40"
                  borderRadius="xl"
                  borderColor="blue.100"
                  _focus={{
                    bg: "var(--app-card)",
                    borderColor: "blue.500",
                    ring: "3px",
                    ringColor: "var(--app-hover)",
                  }}
                />
              ))}
            </HStack>

            {/* Password */}
            <Box>
              <Text fontWeight="bold" mb={2} color="blue.900">
                Password Baru
              </Text>
              <HStack>
                <Field name="password">
                  {({ field }: any) => (
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      h="14"
                      borderRadius="xl"
                      flex="1"
                    />
                  )}
                </Field>
                <Button
                  onClick={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  size="sm"
                  h="14"
                  w="14"
                  borderRadius="xl"
                  _hover={{ bg: "var(--app-subtle)" }}
                >
                  <Icon as={showPassword ? EyeOff : Eye} />
                </Button>
              </HStack>
              <ErrorMessage name="password">
                {(msg) => (
                  <Text color="red.500" fontSize="sm">
                    {msg}
                  </Text>
                )}
              </ErrorMessage>
            </Box>

            {/* Confirm Password */}
            <Box>
              <Text fontWeight="bold" mb={2} color="blue.900">
                Konfirmasi Password Baru
              </Text>
              <HStack>
                <Field name="confirmPassword">
                  {({ field }: any) => (
                    <Input
                      {...field}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      h="14"
                      borderRadius="xl"
                      flex="1"
                    />
                  )}
                </Field>
                <Button
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  variant="ghost"
                  size="sm"
                  h="14"
                  w="14"
                  borderRadius="xl"
                  _hover={{ bg: "var(--app-subtle)" }}
                >
                  <Icon as={showConfirmPassword ? EyeOff : Eye} />
                </Button>
              </HStack>
              <ErrorMessage name="password">
                {(msg) => (
                  <Text color="red.500" fontSize="sm">
                    {msg}
                  </Text>
                )}
              </ErrorMessage>
            </Box>

            {/* Submit */}
            <Button
              type="submit"
              bg="blue.600"
              color="white"
              h="14"
              fontWeight="black"
              loading={isLoading || isSubmitting}
              gap={2}
              _hover={{
                bg: "blue.700",
                transform: "translateY(-2px)",
                shadow: "xl",
              }}
            >
              Simpan Password <ArrowRight size={20} />
            </Button>
          </VStack>
        </Form>
      )}
    </Formik>
  );
}

export default dynamic(() => Promise.resolve(ResetPassword), { ssr: false });

"use client";
import dynamic from "next/dynamic";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  Textarea,
  Button,
  Flex,
  Circle,
  Spinner,
  Image,
  Switch,
} from "@chakra-ui/react";
import { Camera, ArrowLeft, Save, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useProfile, useUpdateProfile, uploadToCloudinary } from "../profile.service";
import { ImageCropModal } from "./ImageCropModal";
import { useFormik } from "formik";

/* eslint-disable @next/next/no-img-element */

function EditProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateMutation = useUpdateProfile();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);

  const loginMethod = profile?.loginMethod;
  const isGoogleLogin = useMemo(() => loginMethod === "google", [loginMethod]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: profile?.name ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      website: profile?.website ?? "",
      avatar: profile?.avatar ?? "",
      cover: profile?.cover ?? "",
      showSuggestion: profile?.showSuggestion ?? true,
    },
    validate: (values) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors: any = {};

      if (values.username !== profile?.username) {
        if (/\s/.test(values.username)) {
          errors.username = "Username tidak boleh mengandung spasi";
        } else if (!/^[a-zA-Z0-9._]+$/.test(values.username)) {
          errors.username =
            "Username hanya boleh huruf, angka, titik (.) dan underscore (_)";
        } else if (
          values.username.length < 3 ||
          values.username.length > 30
        ) {
          errors.username = "Username harus 3-30 karakter";
        }
      }

      return errors;
    },
    onSubmit: (values) => {
      const payload: {
        name?: string;
        username?: string;
        bio?: string;
        location?: string;
        website?: string;
        avatar?: string;
        cover?: string;
        showSuggestion?: boolean;
      } = {
        name: values.name,
        bio: values.bio,
        location: values.location,
        website: values.website,
        showSuggestion: values.showSuggestion,
      };
      if (values.username !== profile?.username) {
        payload.username = values.username;
      }
      if (values.avatar) payload.avatar = values.avatar;
      if (values.cover) payload.cover = values.cover;
      updateMutation.mutate(payload);
    },
  });

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverCropSrc(URL.createObjectURL(file));
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const handleCoverConfirm = async (blob: Blob) => {
    setIsUploadingCover(true);
    try {
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const url = await uploadToCloudinary(file);
      formik.setFieldValue("cover", url);
      setCoverCropSrc(null);
    } catch (err) {
      console.error("Gagal upload foto sampul:", err);
      Swal.fire({
        title: "Gagal",
        text: "Gagal mengunggah foto sampul, silakan coba lagi",
        icon: "error",
      });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        title: "Gagal",
        text: "File harus berupa gambar",
        icon: "error",
      });
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      return;
    }

    // Buka cropper dulu biar bisa dipasin kayak foto sampul
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
    setAvatarCropSrc(URL.createObjectURL(file));
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleAvatarConfirm = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const url = await uploadToCloudinary(file);
      formik.setFieldValue("avatar", url);
      if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
      setAvatarCropSrc(null);
    } catch (err) {
      console.error("Gagal upload foto profil:", err);
      Swal.fire({
        title: "Gagal",
        text: "Gagal mengunggah foto profil, silakan coba lagi",
        icon: "error",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (profileLoading || !profile) {
    return (
      <Flex h="60vh" align="center" justify="center">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <VStack flex={1} gap={6} align="stretch">
      <ImageCropModal
        isOpen={!!coverCropSrc}
        imageSrc={coverCropSrc ?? ""}
        title="Atur Foto Sampul"
        aspect={3 / 1}
        confirmText="Upload Foto Sampul"
        onClose={() => {
          if (coverCropSrc) URL.revokeObjectURL(coverCropSrc);
          setCoverCropSrc(null);
        }}
        onConfirm={handleCoverConfirm}
      />
      <ImageCropModal
        isOpen={!!avatarCropSrc}
        imageSrc={avatarCropSrc ?? ""}
        title="Atur Foto Profil"
        aspect={1 / 1}
        cropShape="round"
        confirmText="Upload Foto Profil"
        hint="Seret untuk mempasin wajah, atur zoom biar pas di lingkaran."
        onClose={() => {
          if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
          setAvatarCropSrc(null);
        }}
        onConfirm={handleAvatarConfirm}
      />
      {/* Header Navigasi Internal */}
      <HStack justify="space-between" mb={2}>
        <HStack gap={4}>
          <IconButton
            variant="ghost"
            onClick={() => router.back()}
            color="var(--app-secondary)"
          >
            <ArrowLeft size={24} />
          </IconButton>
          <Heading size="md" color="var(--app-text)">
            Edit Profil
          </Heading>
        </HStack>
        <Button
          colorPalette="blue"
          size="sm"
          borderRadius="full"
          px={6}
          loading={updateMutation.isPending}
          onClick={() => formik.handleSubmit()}
          disabled={updateMutation.isPending}
        >
          <Save size={16} />
          Simpan Perubahan
        </Button>
      </HStack>

      <Box
        bg="var(--app-card)"
        borderRadius="2xl"
        shadow="sm"
        border="1px solid"
        borderColor="var(--app-border)"
        overflow="hidden"
      >
        {/* Cover Photo */}
        <Box h="180px" position="relative" zIndex={0} bgGradient="linear(to-r, blue.600, blue.400)">
          {formik.values.cover && (
            <Image
              src={formik.values.cover}
              alt="Foto sampul"
              position="absolute"
              inset={0}
              w="full"
              h="full"
              objectFit="cover"
            />
          )}
          <input
            type="file"
            hidden
            ref={coverInputRef}
            onChange={handleCoverChange}
            accept="image/*"
          />
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.300"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor={isUploadingCover ? "wait" : "pointer"}
            _hover={{ bg: "blackAlpha.500" }}
            transition="0.3s"
            onClick={() => !isUploadingCover && coverInputRef.current?.click()}
          >
            <VStack gap={1} color="white">
              {isUploadingCover ? (
                <Spinner size="md" />
              ) : (
                <Camera size={28} />
              )}
              <Text fontSize="xs" fontWeight="bold">
                {isUploadingCover ? "Mengunggah..." : "Ubah Foto Sampul"}
              </Text>
            </VStack>
          </Box>
        </Box>

        <Box px={8} pb={8}>
          {/* Avatar */}
          <Flex justify="start" mt="-60px" mb={8}>
            <Box position="relative" zIndex={1}>
              <Circle
                size="120px"
                bg="var(--app-border)"
                border="6px solid"
                borderColor="white"
                overflow="hidden"
                shadow="lg"
              >
                <img
                  src={formik.values.avatar || "/default-avatar.jpg"}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Circle>
              <input
                type="file"
                hidden
                ref={avatarInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
              />
              <Circle
                position="absolute"
                bottom="5px"
                right="5px"
                size="35px"
                bg="blue.600"
                color="white"
                border="3px solid white"
                cursor={isUploadingAvatar ? "wait" : "pointer"}
                _hover={{ transform: "scale(1.1)" }}
                transition="0.2s"
                onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
              >
                {isUploadingAvatar ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Camera size={16} />
                )}
              </Circle>
            </Box>
          </Flex>

          {/* Form Fields */}
          <VStack gap={6} align="stretch">
            <HStack gap={6} align="start">
              <VStack align="start" flex={1} gap={1}>
                <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                  Nama Lengkap
                </Text>
                <Input
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  name="name"
                  size="lg"
                  bg="var(--app-input)"
                  borderColor="var(--app-border)"
                  color="var(--app-text)"
                  fontWeight="medium"
                  _focus={{ bg: "var(--app-card)", borderColor: "blue.500" }}
                />
              </VStack>
              <VStack align="start" flex={1} gap={1}>
                <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                  Username
                </Text>
                <Box position="relative" w="full">
                  <Text
                    position="absolute"
                    left={4}
                    top="50%"
                    transform="translateY(-50%)"
                    color="var(--app-faint)"
                    fontWeight="bold"
                    zIndex={1}
                  >
                    @
                  </Text>
                  <Input
                    value={formik.values.username}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "username",
                        e.target.value.replace(/\s+/g, "").toLowerCase(),
                      )
                    }
                    onBlur={formik.handleBlur}
                    name="username"
                    size="lg"
                    pl={8}
                    bg="var(--app-input)"
                    borderColor={
                      formik.errors.username ? "red.300" : "var(--app-border)"
                    }
                    color="var(--app-text)"
                    fontWeight="medium"
                    _focus={{
                      bg: "var(--app-card)",
                      borderColor: formik.errors.username
                        ? "red.400"
                        : "blue.500",
                    }}
                  />
                </Box>
                {formik.errors.username ? (
                  <Text color="red.500" fontSize="xs" fontWeight="bold">
                    {formik.errors.username}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="var(--app-faint)" fontWeight="bold">
                    Tanpa spasi. Boleh huruf, angka, titik (.) dan underscore
                    (_).
                  </Text>
                )}
              </VStack>
            </HStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                Bio
              </Text>
              <Textarea
                value={formik.values.bio}
                onChange={formik.handleChange}
                name="bio"
                size="lg"
                bg="var(--app-input)"
                borderColor="var(--app-border)"
                color="var(--app-text)"
                fontWeight="medium"
                minH="120px"
                _focus={{ bg: "var(--app-card)", borderColor: "blue.500" }}
                placeholder="Ceritakan diri Anda..."
              />
              <Text fontSize="xs" color="var(--app-faint)" fontWeight="bold">
                Tuliskan sesuatu yang menarik tentang diri Anda.
              </Text>
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                Lokasi
              </Text>
              <Input
                value={formik.values.location}
                onChange={formik.handleChange}
                name="location"
                size="lg"
                bg="var(--app-input)"
                borderColor="var(--app-border)"
                color="var(--app-text)"
                fontWeight="medium"
                _focus={{ bg: "var(--app-card)", borderColor: "blue.500" }}
                placeholder="Masukkan lokasi Anda"
              />
            </VStack>

            <VStack align="start" gap={1}>
              <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                Website (URL)
              </Text>
              <Input
                value={formik.values.website}
                onChange={formik.handleChange}
                name="website"
                size="lg"
                bg="var(--app-input)"
                borderColor="var(--app-border)"
                color="var(--app-text)"
                fontWeight="medium"
                _focus={{ bg: "var(--app-card)", borderColor: "blue.500" }}
                placeholder="https://..."
              />
            </VStack>

            {/* Tampilkan saran akun di profil */}
            <Box
              border="1px solid"
              borderColor="var(--app-border)"
              borderRadius="xl"
              bg="var(--app-input)"
              p={4}
            >
              <HStack justify="space-between" align="center" gap={4}>
                <VStack align="start" gap={1} flex={1}>
                  <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                    Tampilkan saran akun di profil
                  </Text>
                  <Text fontSize="xs" color="var(--app-muted)" fontWeight="medium">
                    Pilih apakah orang-orang bisa melihat saran akun serupa di
                    profil Anda, dan apakah akun Anda bisa disarankan di profil
                    lain.
                  </Text>
                </VStack>
                <Switch.Root
                  checked={formik.values.showSuggestion}
                  onCheckedChange={(d) =>
                    formik.setFieldValue("showSuggestion", d.checked)
                  }
                  colorPalette="blue"
                  size="md"
                >
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </HStack>
            </Box>
          </VStack>
        </Box>
      </Box>

      {/* Akun & Keamanan: kotak Ubah Sandi dipindah ke /session/login_activity.
          Di sini hanya tersisa info untuk login Google. */}
      {isGoogleLogin && (
        <Box
          bg="var(--app-hover)"
          p={6}
          borderRadius="2xl"
          border="1px solid"
          borderColor="blue.200"
        >
          <Heading
            size="xs"
            color="blue.600"
            mb={4}
            display="flex"
            alignItems="center"
            gap={2}
          >
            <Lock size={16} />
            Privasi & Keamanan
          </Heading>
          <Text fontSize="sm" color="blue.700" fontWeight="medium">
            Anda login melalui Google. Untuk mengubah password, silakan kelola
            akun di Google Account Anda.
          </Text>
        </Box>
      )}
    </VStack>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IconButton = ({ children, ...props }: any) => (
  <Button p={2} minW="auto" {...props}>
    {children}
  </Button>
);

export default dynamic(() => Promise.resolve(EditProfilePage), {
  ssr: false,
});

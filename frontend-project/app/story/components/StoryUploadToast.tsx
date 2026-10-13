"use client";

import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { resetStoryUpload, useStoryUpload } from "../story-upload-store";

const MotionBox = motion.create(Box);

// Toast progres upload story — dipasang fixed kanan bawah.
// Dipakai di halaman /story dan halaman utama (/(main)), store-nya singleton
// jadi progres tetap jalan saat user pindah halaman via router.push.
export function StoryUploadToast() {
  const { status, progress, message } = useStoryUpload();

  return (
    <AnimatePresence>
      {status !== "idle" && (
        <MotionBox
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          position="fixed"
          bottom={{ base: "90px", md: "24px" }}
          right="24px"
          zIndex={3000}
          bg="var(--app-text)"
          color="white"
          borderRadius="xl"
          shadow="2xl"
          w="300px"
          overflow="hidden"
        >
          <Flex p={3} gap={3} align="center">
            {status === "uploading" ? (
              <Loader2 size={20} className="animate-spin" />
            ) : status === "done" ? (
              <CheckCircle2 size={20} color="#4ade80" />
            ) : (
              <XCircle size={20} color="#f87171" />
            )}
            <Box flex={1} minW={0}>
              <Text fontSize="xs" fontWeight="bold" truncate>
                {status === "uploading"
                  ? "Story mu sedang dalam tahap upload"
                  : status === "done"
                    ? "Upload selesai"
                    : "Upload gagal"}
              </Text>
              <Text fontSize="xs" color="var(--app-faint)" truncate>
                {message}
                {status === "uploading" ? ` • ${progress}%` : ""}
              </Text>
            </Box>
            <HStack>
              {status === "uploading" && (
                <Text fontSize="xs" fontWeight="black" color="orange.300">
                  {progress}%
                </Text>
              )}
              {status !== "uploading" && (
                <Box
                  as="button"
                  onClick={resetStoryUpload}
                  aria-label="Tutup notifikasi"
                  cursor="pointer"
                  color="var(--app-faint)"
                  _hover={{ color: "white" }}
                >
                  <X size={16} />
                </Box>
              )}
            </HStack>
          </Flex>
          {status === "uploading" && (
            <Box h="4px" bg="var(--app-secondary)">
              <Box
                h="full"
                bg="orange.500"
                width={`${progress}%`}
                transition="width 0.2s"
              />
            </Box>
          )}
        </MotionBox>
      )}
    </AnimatePresence>
  );
}

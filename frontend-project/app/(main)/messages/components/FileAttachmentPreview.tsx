"use client";
import { Box, VStack, HStack, Text, Image } from "@chakra-ui/react";
import { FileText } from "lucide-react";
import type { ChatMessage } from "../chat.interface";
import { formatFileSize } from "../utils/chat-helpers";

function renderFoundFileName(
  fileName: string,
  query: string,
  isActive: boolean,
) {
  const q = query.trim();
  if (!q) return fileName;
  const lowerName = fileName.toLowerCase();
  const lowerQ = q.toLowerCase();
  if (!lowerName.includes(lowerQ)) return fileName;
  const parts: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < fileName.length) {
    const idx = lowerName.indexOf(lowerQ, i);
    if (idx === -1) {
      parts.push(fileName.slice(i));
      break;
    }
    if (idx > i) parts.push(fileName.slice(i, idx));
    parts.push(
      <Box
        key={`findfile-${key++}`}
        as="span"
        bg={isActive ? "orange.300" : "yellow.200"}
        color="black"
        px="1px"
        borderRadius="sm"
      >
        {fileName.slice(idx, idx + q.length)}
      </Box>,
    );
    i = idx + q.length;
  }
  return <>{parts}</>;
}

export default function FileAttachmentPreview({
  msg,
  isMe,
  findQuery = "",
  isActiveFind = false,
}: {
  msg: ChatMessage;
  isMe: boolean;
  findQuery?: string;
  isActiveFind?: boolean;
}) {
  if (!msg.fileUrl || msg.isDeleted) return null;
  const isImage = msg.fileType === "image";
  if (isImage) {
    return (
      <VStack align={isMe ? "end" : "start"} gap={1} mb={1}>
        <Box
          w="220px"
          borderRadius="xl"
          overflow="hidden"
          border="1px solid"
          borderColor="var(--app-border)"
          shadow="sm"
          cursor="pointer"
          onClick={() => {
            if (msg.fileUrl) window.open(msg.fileUrl, "_blank");
          }}
        >
          <Image
            src={msg.fileUrl}
            alt={msg.fileName || "Gambar"}
            w="full"
            maxH="260px"
            objectFit="cover"
            display="block"
          />
        </Box>
      </VStack>
    );
  }
  const docName = msg.fileName || "Dokumen";
  const docQuery = findQuery.trim();
  const docHit =
    !!docQuery &&
    docName.toLowerCase().includes(docQuery.toLowerCase());
  return (
    <VStack align={isMe ? "end" : "start"} gap={1} mb={1}>
      <HStack
        w="250px"
        bg={isActiveFind ? "orange.100" : "var(--app-card)"}
        border={isActiveFind ? "2px solid" : "1px solid"}
        borderColor={isActiveFind ? "orange.500" : "var(--app-border)"}
        borderRadius="xl"
        p={3}
        gap={3}
        shadow={isActiveFind ? "md" : "sm"}
        cursor="pointer"
        onClick={() => {
          if (msg.fileUrl) window.open(msg.fileUrl, "_blank");
        }}
      >
        <Box
          w="40px"
          h="40px"
          borderRadius="lg"
          bg="var(--app-hover)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <FileText size={20} color="#2563eb" />
        </Box>
        <VStack align="start" gap={0} flex={1} minW={0}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            color={isActiveFind ? "black" : "var(--app-text)"}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            maxW="full"
          >
            {docHit
              ? renderFoundFileName(docName, docQuery, isActiveFind)
              : docName}
          </Text>
          <Text fontSize="11px" color="var(--app-muted)">
            {[msg.fileType?.toUpperCase(), formatFileSize(msg.fileSize)]
              .filter(Boolean)
              .join(" • ")}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  );
}

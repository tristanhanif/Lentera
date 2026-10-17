"use client";
import { useState } from "react";
import { Box, VStack, HStack, Text, Image } from "@chakra-ui/react";
import { Play, Copy, Image as ImageIcon } from "lucide-react";
import type { ChatMessage } from "../chat.interface";

export default function PostSharePreview({
  msg,
  isMe,
  onOpen,
}: {
  msg: ChatMessage;
  isMe: boolean;
  onOpen: (postId: string) => void;
}) {
  const isVideo = msg.postMediaType === "video";
  const multi = (msg.postMediaCount ?? 1) > 1;
  const [mediaAspect, setMediaAspect] = useState("4 / 5");
  return (
    <VStack align={isMe ? "end" : "start"} gap={1} mb={1}>
      <Box
        w="220px"
        bg="var(--app-card)"
        borderRadius="xl"
        border="1px solid"
        borderColor="var(--app-border)"
        overflow="hidden"
        shadow="sm"
        cursor="pointer"
        onClick={() => {
          if (msg.postId) onOpen(msg.postId);
        }}
      >
        {!isVideo && !msg.postMediaUrl && (
          <HStack gap={2} p={2.5}>
            <Box
              w="28px"
              h="28px"
              borderRadius="full"
              overflow="hidden"
              bg="var(--app-subtle)"
              flexShrink={0}
            >
              <Image
                src={msg.postOwnerAvatar || "/default-avatar.jpg"}
                alt={msg.postOwnerUsername ?? "postingan"}
                w="full"
                h="full"
                objectFit="cover"
              />
            </Box>
            <Text fontSize="xs" fontWeight="bold" color="var(--app-text)" truncate>
              {msg.postOwnerUsername ?? "Postingan"}
            </Text>
          </HStack>
        )}
        {msg.postMediaUrl && (
          <Box
            position="relative"
            bg="var(--app-input)"
            style={{ aspectRatio: mediaAspect }}
          >
            {isVideo ? (
              <video
                src={msg.postMediaUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  const w = v.videoWidth;
                  const h = v.videoHeight;
                  if (w && h) setMediaAspect(`${w} / ${h}`);
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <Image
                src={msg.postMediaUrl}
                alt="Postingan yang dibagikan"
                w="full"
                h="full"
                objectFit="cover"
                display="block"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const w = img.naturalWidth;
                  const h = img.naturalHeight;
                  if (w && h) setMediaAspect(`${w} / ${h}`);
                }}
              />
            )}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              h="52px"
              pointerEvents="none"
              background="linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0))"
            />
            <HStack position="absolute" left={2} top={2} gap={1.5} maxW="75%">
              <Box
                w="22px"
                h="22px"
                borderRadius="full"
                overflow="hidden"
                border="1.5px solid white"
                flexShrink={0}
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
              >
                <Image
                  src={msg.postOwnerAvatar || "/default-avatar.jpg"}
                  alt={msg.postOwnerUsername ?? "postingan"}
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
              <Text
                fontSize="xs"
                fontWeight="bold"
                color="white"
                truncate
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
              >
                {msg.postOwnerUsername ?? "Postingan"}
              </Text>
            </HStack>
            <Box
              position="absolute"
              right={2}
              top={2}
              color="white"
              display="flex"
              alignItems="center"
              justifyContent="center"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.7))" }}
            >
              {isVideo ? (
                <Play size={18} fill="white" />
              ) : multi ? (
                <Copy size={18} />
              ) : (
                <ImageIcon size={18} />
              )}
            </Box>
          </Box>
        )}
        {!isVideo && (
          <HStack
            px={2.5}
            py={2}
            gap={2}
            align="center"
            borderTop="1px solid"
            borderColor="var(--app-subtle)"
          >
            <Text fontSize="xs" fontWeight="bold" color="var(--app-text)" flexShrink={0}>
              {msg.postOwnerUsername ?? "Postingan"}
            </Text>
            {!!msg.postContent?.trim() && (
              <Text
                fontSize="xs"
                color="var(--app-secondary)"
                flex={1}
                minW={0}
                lineClamp={2}
              >
                {msg.postContent}
              </Text>
            )}
          </HStack>
        )}
      </Box>
    </VStack>
  );
}

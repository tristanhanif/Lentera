"use client";
import { Box, VStack, Flex, Text } from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "../chat.interface";
import { MusicPlayingIcon } from "../NotesBar";
import { isNoteReplyExpired } from "../utils/chat-helpers";

export default function NoteReplyPreview({
  msg,
  isMe,
}: {
  msg: ChatMessage;
  isMe: boolean;
}) {
  const expired = isNoteReplyExpired(msg);
  if (expired) {
    return (
      <VStack align={isMe ? "end" : "start"} gap={1} mb={1}>
        <Text fontSize="xs" fontStyle="italic" color="var(--app-muted)">
          Catatan sudah tidak tersedia
        </Text>
      </VStack>
    );
  }
  const isMusic = msg.noteType === "music";
  return (
    <VStack align={isMe ? "end" : "start"} gap={0} mb={1}>
      <Flex direction="column" align="center" gap={0}>
        <Box position="relative" mb="8px" display="flex" justifyContent="center">
          <Box
            bg="var(--app-subtle)"
            color="blue.900"
            px={3}
            py={2}
            borderRadius="xl"
            maxW="160px"
            minW="64px"
            textAlign="center"
            shadow="sm"
            overflow="hidden"
          >
            {isMusic ? (
              <Flex align="center" gap={1.5} justify="center">
                <Box flexShrink={0} display="flex" alignItems="center">
                  <MusicPlayingIcon />
                </Box>
                <Box textAlign="left" overflow="hidden">
                  <Text
                    fontSize="11px"
                    fontWeight="bold"
                    lineHeight="1.2"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    maxW="110px"
                  >
                    {msg.noteMusicTitle || msg.noteText}
                  </Text>
                  {msg.noteMusicArtist && (
                    <Text
                      fontSize="10px"
                      opacity={0.85}
                      lineHeight="1.2"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      maxW="110px"
                    >
                      {msg.noteMusicArtist}
                    </Text>
                  )}
                </Box>
              </Flex>
            ) : (
              <Text
                fontSize="11px"
                fontWeight="medium"
                lineHeight="1.3"
                display="-webkit-box"
                css={{
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {msg.noteText}
              </Text>
            )}
          </Box>
          <Box
            position="absolute"
            bottom="-4px"
            left="50%"
            transform="translateX(-50%) rotate(45deg)"
            w="10px"
            h="10px"
            bg="var(--app-subtle)"
          />
        </Box>
        <Avatar style={{ width: "40px", height: "40px" }}>
          <AvatarImage
            src={msg.noteOwnerAvatar || "/default-avatar.jpg"}
            alt={msg.noteOwnerUsername ?? "catatan"}
          />
          <AvatarFallback>
            {(msg.noteOwnerUsername ?? "C").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Flex>
    </VStack>
  );
}

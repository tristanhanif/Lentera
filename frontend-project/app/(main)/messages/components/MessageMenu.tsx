"use client";
import { Box, Flex, Text } from "@chakra-ui/react";
import { Star, Pin, PinOff, Copy, Undo2 } from "lucide-react";
import type { ChatMessage } from "../chat.interface";
import { PIN_DURATIONS } from "../utils/chat-helpers";

export interface MenuPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface MessageMenuProps {
  msg: ChatMessage;
  isMe: boolean;
  isPinned: boolean;
  pinMode: boolean;
  menuPos: MenuPosition;
  onUnsend: () => void;
  onStar: () => void;
  onPin: (minutes: number) => void;
  onUnpin: () => void;
  onOpenPinMode: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export default function MessageMenu({
  msg,
  isMe,
  isPinned,
  pinMode,
  menuPos,
  onUnsend,
  onStar,
  onPin,
  onUnpin,
  onOpenPinMode,
  onCopy,
}: MessageMenuProps) {
  const menuItem = (
    label: string,
    Icon: typeof Star,
    onClick: () => void,
    isDanger?: boolean,
  ) => (
    <Flex
      px={4}
      py={2.5}
      gap={3}
      align="center"
      justify="space-between"
      cursor="pointer"
      color={isDanger ? "red.500" : "var(--app-text)"}
      _hover={{ bg: isDanger ? "rgba(244, 63, 94, 0.12)" : "var(--app-hover)" }}
      transition="0.15s"
      onClick={onClick}
    >
      <Text fontSize="sm" fontWeight={isDanger ? "bold" : "medium"}>
        {label}
      </Text>
      <Icon size={16} color={isDanger ? "#f43f5e" : "currentColor"} />
    </Flex>
  );

  return (
    <Box
      position="fixed"
      {...menuPos}
      bg="var(--app-card)"
      borderRadius="xl"
      shadow="lg"
      border="1px solid"
      borderColor="var(--app-border)"
      minW="190px"
      py={2}
      zIndex={30}
    >
      {pinMode ? (
        <>
          <Text
            px={4}
            pt={1}
            pb={2}
            fontSize="xs"
            fontWeight="bold"
            color="var(--app-muted)"
          >
            Sematkan selama...
          </Text>
          {PIN_DURATIONS.map((d) =>
            menuItem(d.label, Pin, () => onPin(d.minutes)),
          )}
        </>
      ) : (
        <>
          {isMe &&
            !msg.isDeleted &&
            menuItem("Batal Kirim", Undo2, onUnsend, true)}
          {!msg.isDeleted &&
            menuItem(
              msg.isStarred ? "Hapus Bintang" : "Pesan Berbintang",
              Star,
              onStar,
            )}
          {!msg.isDeleted &&
            (isPinned
              ? menuItem("Batal Sematkan", PinOff, onUnpin)
              : menuItem("Sematkan", Pin, onOpenPinMode))}
          {!msg.audioUrl && menuItem("Salin", Copy, onCopy)}
        </>
      )}
    </Box>
  );
}

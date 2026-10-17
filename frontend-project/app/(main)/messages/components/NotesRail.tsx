"use client";
import { Box, VStack, Text } from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

interface NotesRailProps {
  profileAvatar: string | null;
  profileUsername: string;
  ownNoteId: string | null;
  notes: Array<{
    id: string;
    isOwn?: boolean;
    user: { avatar: string | null; username: string };
  }>;
  replyNoteId: string | null;
  onOwnNoteClick: () => void;
  onHoverNote: (noteId: string, anchor: { top: number; left: number }) => void;
  onLeaveHover: () => void;
}

export default function NotesRail({
  profileAvatar,
  profileUsername,
  ownNoteId,
  notes,
  replyNoteId,
  onOwnNoteClick,
  onHoverNote,
  onLeaveHover,
}: NotesRailProps) {
  return (
    <VStack
      w="150px"
      flexShrink={0}
      borderRight="2px solid"
      borderColor="var(--app-hover)"
      align="stretch"
      gap={0}
      py={4}
      px={2}
      overflowY="auto"
      css={{
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-thumb": {
          background: "#cbd5e1",
          borderRadius: "10px",
        },
      }}
    >
      <VStack gap={4} align="center">
        <Box
          cursor="pointer"
          onClick={onOwnNoteClick}
          title={ownNoteId ? "Lihat catatan" : "Buat catatan"}
          onMouseEnter={(e) => {
            if (!ownNoteId || replyNoteId) return;
            const r = e.currentTarget.getBoundingClientRect();
            onHoverNote(ownNoteId, { top: r.top, left: r.right + 8 });
          }}
          onMouseLeave={onLeaveHover}
        >
          <VStack gap={1} align="center">
            <Box position="relative">
              <Avatar style={{ width: "60px", height: "60px" }}>
                <AvatarImage src={profileAvatar || "/default-avatar.jpg"} />
                <AvatarFallback>
                  {(profileUsername ?? "S").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!ownNoteId && (
                <Box
                  position="absolute"
                  bottom="0"
                  right="0"
                  bg="blue.600"
                  borderRadius="full"
                  w="20px"
                  h="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid white"
                >
                  <Plus size={12} color="white" />
                </Box>
              )}
            </Box>
            <Text
              fontSize="11px"
              color="var(--app-text)"
              fontWeight="medium"
              maxW="130px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              textAlign="center"
            >
              @{profileUsername ?? "saya"}
            </Text>
          </VStack>
        </Box>
        {notes
          .filter((n) => !n.isOwn)
          .map((n) => (
            <Box
              key={n.id}
              cursor="pointer"
              onMouseEnter={(e) => {
                if (replyNoteId) return;
                const r = e.currentTarget.getBoundingClientRect();
                onHoverNote(n.id, { top: r.top, left: r.right + 8 });
              }}
              onMouseLeave={onLeaveHover}
            >
              <VStack gap={1} align="center">
                <Avatar style={{ width: "60px", height: "60px" }}>
                  <AvatarImage src={n.user.avatar || "/default-avatar.jpg"} />
                  <AvatarFallback>
                    {n.user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Text
                  fontSize="11px"
                  color="var(--app-text)"
                  fontWeight="medium"
                  maxW="130px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  textAlign="center"
                >
                  @{n.user.username}
                </Text>
              </VStack>
            </Box>
          ))}
      </VStack>
    </VStack>
  );
}

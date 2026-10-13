/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  Portal,
  Input,
  Heading,
  Circle,
  Spinner,
} from "@chakra-ui/react";
import { X, Send, Heart } from "lucide-react";
import { useComments, useCreateComment } from "./comments/comment.service";
import { CommentResponse } from "./comments/comment.interface";
import { renderMentions } from "./comments/renderMentions";
import { useProfile } from "./profile/profile.service";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    user: { name: string; avatar?: string };
  };
}

export function CommentModal({ isOpen, onClose, post }: CommentModalProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<CommentResponse | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const { data: profile } = useProfile();
  const { data: commentsData, isFetching } = useComments(post?.id ?? "", !!post);
  const { mutate: createComment, isPending: isCreating } = useCreateComment();

  const comments: CommentResponse[] = commentsData?.data ?? [];

  const handleBalas = (comment: CommentResponse) => {
    setReplyTo(comment);
    setNewComment(`@${comment.user?.username || comment.user?.name || "user"} `);
  };

  const handleSend = () => {
    if (!newComment.trim() || !post?.id) return;
    createComment(
      { content: newComment, postId: post.id, parentId: replyTo?.id },
      {
        onSuccess: () => {
          setNewComment("");
          setReplyTo(null);
        },
      },
    );
  };

  if (!isOpen) return null;

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
        onClick={() => onClose()}
      >
        <Box
          bg="var(--app-card)"
          w="full"
          maxW="2xl"
          borderRadius="3xl"
          shadow="2xl"
          onClick={(e) => e.stopPropagation()}
          maxH="85vh"
          display="flex"
          flexDirection="column"
        >
          {/* Header */}
          <Flex
            p={4}
            borderBottom="1px solid"
            borderColor="var(--app-border)"
            justify="space-between"
            align="center"
          >
            <VStack align="start" gap={0}>
              <Heading size="sm" color="var(--app-text)">Diskusi</Heading>
              <Text fontSize="xs" color="var(--app-faint)" fontWeight="bold">
                Berikan pendapat Anda
              </Text>
            </VStack>
            <IconButton variant="ghost" size="sm" onClick={onClose} color="var(--app-secondary)">
              <X size={20} />
            </IconButton>
          </Flex>

          {/* Area Komentar (Scrollable) */}
          <Box
            flex={1}
            overflowY="auto"
            p={6}
            css={{
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: "10px" },
            }}
          >
            {/* Postingan Konteks */}
            <VStack align="start" gap={3} mb={8} p={4} bg="var(--app-input)" borderRadius="2xl" border="1px solid" borderColor="var(--app-border)">
              <HStack gap={3}>
                <Box
                  w="35px"
                  h="35px"
                  bg="blue.600"
                  borderRadius="full"
                  overflow="hidden"
                  flexShrink={0}
                >
                  <img
                    src={post?.user?.avatar || "/default-avatar.jpg"}
                    alt={post?.user?.name || "User"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" color="var(--app-text)" fontSize="sm">
                    {post?.user?.name || "User"}
                  </Text>
                  <Text fontSize="10px" color="var(--app-muted)" fontWeight="bold">
                    Penulis Postingan
                  </Text>
                </VStack>
              </HStack>
              <Text fontSize="sm" color="var(--app-secondary)" fontWeight="medium">
                {post?.content}
              </Text>
            </VStack>

            {/* Daftar Komentar */}
            {isFetching ? (
              <Flex py={6} justify="center">
                <Spinner size="md" color="blue.500" />
              </Flex>
            ) : comments.length === 0 ? (
              <Text fontSize="sm" color="var(--app-faint)" textAlign="center" py={8}>
                Belum ada komentar. Jadilah yang pertama!
              </Text>
            ) : (
              <VStack gap={4} align="stretch">
                {comments
                  .filter((c) => !c.parentId)
                  .map((comment) => {
                    const allReplies = comments.filter((c) => {
                      if (!c.parentId) return false;
                      let cur: CommentResponse = c;
                      while (cur.parentId) {
                        const parent = comments.find((p) => p.id === cur.parentId);
                        if (!parent) break;
                        if (parent.id === comment.id) return true;
                        cur = parent;
                      }
                      return false;
                    });
                    return (
                      <Box key={comment.id}>
                        <HStack align="start" gap={3}>
                          <Circle
                            size="36px"
                            bg="var(--app-border)"
                            flexShrink={0}
                            overflow="hidden"
                          >
                            {comment.user?.avatar ? (
                              <img
                                src={comment.user.avatar}
                                alt={comment.user.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                              />
                            ) : (
                              <Text fontSize="xs" fontWeight="bold" color="var(--app-secondary)">
                                {comment.user?.name?.charAt(0) || "U"}
                              </Text>
                            )}
                          </Circle>
                          <VStack align="start" gap={1} flex={1}>
                              <Box bg="var(--app-input)" p={3} pr={12} borderRadius="2xl" w="full" position="relative">
                              <Flex justify="space-between" align="center">
                                <Text fontWeight="bold" fontSize="xs" color="var(--app-text)">
                                  {comment.user?.username || "User"}
                                </Text>
                                <Text fontSize="10px" color="var(--app-faint)" fontWeight="bold">
                                  {new Date(comment.createdAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </Text>
                              </Flex>
                                    <Text fontSize="sm" color="var(--app-secondary)" mt={1}>
                                      {renderMentions(comment.content)}
                                    </Text>
                                <HStack gap={3} mt={1}>
                                  {comment.likesCount > 0 && (
                                    <Text
                                      fontSize="xs"
                                      fontWeight="bold"
                                      color="var(--app-muted)"
                                      cursor="pointer"
                                      _hover={{ textDecoration: "underline" }}
                                    >
                                      {comment.likesCount} suka
                                    </Text>
                                  )}
                                  <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color="var(--app-muted)"
                                    cursor="pointer"
                                    onClick={() => handleBalas(comment)}
                                    _hover={{ color: "var(--app-secondary)" }}
                                  >
                                    Balas
                                  </Text>
                                </HStack>
                                {allReplies.length > 0 && !expandedReplies.has(comment.id) && (
                                  <Text
                                    fontSize="xs"
                                    color="var(--app-muted)"
                                    fontWeight="bold"
                                    cursor="pointer"
                                    _hover={{ color: "var(--app-secondary)" }}
                                    onClick={() => toggleReplies(comment.id)}
                                  >
                                    — Lihat balasan ({allReplies.length})
                                  </Text>
                                )}
                                <Box
                                  position="absolute"
                                  right={3}
                                  top="50%"
                                  style={{ transform: "translateY(-50%)" }}
                                  cursor="pointer"
                                  color="var(--app-faint)"
                                  _hover={{ color: "red.500" }}
                                >
                                  <Heart size={12} />
                                </Box>
                              </Box>
                            </VStack>
                          </HStack>

                        {allReplies.length > 0 && expandedReplies.has(comment.id) && (
                          <VStack align="stretch" gap={3} mt={3} pl={10}>
                            {allReplies.map((reply, replyIdx) => (
                                  <HStack key={reply.id} align="start" gap={2}>
                                    <Circle
                                      size="28px"
                                      bg="var(--app-border)"
                                      flexShrink={0}
                                      overflow="hidden"
                                    >
                                      {reply.user?.avatar ? (
                                        <img
                                          src={reply.user.avatar}
                                          alt={reply.user.name}
                                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                        />
                                      ) : (
                                        <Text fontSize="10px" fontWeight="bold" color="var(--app-secondary)">
                                          {reply.user?.name?.charAt(0) || "U"}
                                        </Text>
                                      )}
                                    </Circle>
                                    <VStack align="start" gap={1} flex={1}>
                                      <Box bg="var(--app-input)" p={2.5} pr={10} borderRadius="2xl" w="full" position="relative">
                                        <Flex justify="space-between" align="center">
                                          <Text fontWeight="bold" fontSize="xs" color="var(--app-text)">
                                            {reply.user?.username || "User"}
                                          </Text>
                                          <Text fontSize="10px" color="var(--app-faint)" fontWeight="bold">
                                            {new Date(reply.createdAt).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </Text>
                                        </Flex>
                                        <Text fontSize="sm" color="var(--app-secondary)" mt={1}>
                                          {renderMentions(reply.content)}
                                        </Text>
                                        <HStack gap={3} mt={1}>
                                          {reply.likesCount > 0 && (
                                            <Text
                                              fontSize="xs"
                                              fontWeight="bold"
                                              color="var(--app-muted)"
                                              cursor="pointer"
                                              _hover={{ textDecoration: "underline" }}
                                            >
                                              {reply.likesCount} suka
                                            </Text>
                                          )}
                                          <Text
                                            fontSize="xs"
                                            fontWeight="bold"
                                            color="var(--app-muted)"
                                            cursor="pointer"
                                            onClick={() => handleBalas(reply)}
                                            _hover={{ color: "var(--app-secondary)" }}
                                          >
                                            Balas
                                          </Text>
                                        </HStack>
                                        <Box
                                          position="absolute"
                                          right={2.5}
                                          top="50%"
                                          style={{ transform: "translateY(-50%)" }}
                                          cursor="pointer"
                                          color="var(--app-faint)"
                                          _hover={{ color: "red.500" }}
                                        >
                                          <Heart size={12} />
                                        </Box>
                                      </Box>
                                    </VStack>
                                  </HStack>
                                ))}
                                <Text
                                  fontSize="xs"
                                  color="var(--app-muted)"
                                  fontWeight="bold"
                                  cursor="pointer"
                                  pl={10}
                                  _hover={{ color: "var(--app-secondary)" }}
                                  onClick={() => toggleReplies(comment.id)}
                                >
                                  — Sembunyikan balasan
                                </Text>
                          </VStack>
                        )}
                      </Box>
                    );
                  })}
              </VStack>
            )}
          </Box>

          {/* Input Area */}
          <Box p={4} borderTop="1px solid" borderColor="var(--app-border)" bg="var(--app-card)" borderRadius="3xl">
            {replyTo && (
              <HStack gap={2} mb={2}>
                <Text fontSize="xs" color="blue.600" fontWeight="bold">
                  Membalas @{replyTo.user?.username || replyTo.user?.name || "user"}
                </Text>
                <Text
                  fontSize="xs"
                  color="var(--app-faint)"
                  cursor="pointer"
                  _hover={{ color: "var(--app-secondary)" }}
                  onClick={() => setReplyTo(null)}
                >
                  ✕
                </Text>
              </HStack>
            )}
            <HStack bg="var(--app-input)" px={4} py={3} borderRadius="2xl" gap={3}>
              <Circle size="32px" bg="var(--app-border)" flexShrink={0}>
                {profile?.data?.avatar ? (
                  <img
                    src={profile.data.avatar}
                    alt="Your avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  <Text fontSize="xs" fontWeight="bold" color="var(--app-secondary)">
                    {profile?.data?.name?.charAt(0) || "U"}
                  </Text>
                )}
              </Circle>
              <Input
                placeholder="Tulis komentar..."
                size="sm"
                variant="subtle"
                borderRadius="full"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isCreating && handleSend()}
                _focus={{ boxShadow: "none" }}
                disabled={isCreating}
              />
              <IconButton
                bg="blue.600"
                color="white"
                borderRadius="xl"
                size="sm"
                loading={isCreating}
                onClick={handleSend}
                disabled={!newComment.trim() || isCreating}
              >
                <Send size={16} />
              </IconButton>
            </HStack>
          </Box>
        </Box>
      </Box>
    </Portal>
  );
}

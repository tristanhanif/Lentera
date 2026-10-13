"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { 
  VStack, 
  HStack, 
  Text, 
  Box, 
  Input, 
  Button, 
  Separator
} from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CommentResponse } from "./comment.interface";
import { useComments, useCreateComment } from "./comment.service";
import { useToggleCommentLike } from "./comment-like.service";
import { renderMentions } from "./renderMentions";
import { useProfile } from "../profile/profile.service";




interface PostCommentsProps {
  comments: CommentResponse[];
  postId: string;
  onCommentSubmit?: (content: string, postId: string) => void;
  showSeparator?: boolean;
  showInput?: boolean;
  // Balasan yang dikontrol dari luar (dipakai modal yang inputnya terpisah).
  replyTo?: CommentResponse | null;
  onReplyToChange?: (c: CommentResponse | null) => void;
  // Dipanggil saat user menekan "Balas" (induk mengatur text inputnya sendiri).
  onBalas?: (c: CommentResponse) => void;
}

export const PostComments = ({ comments, postId, onCommentSubmit, showSeparator = true, showInput = true, replyTo: replyToProp, onReplyToChange, onBalas }: PostCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const { data: profile } = useProfile();
  const toggleLikeMutation = useToggleCommentLike();
  const { data: liveCommentsData } = useComments(postId, !!postId);
  const [localComments, setLocalComments] = useState<CommentResponse[]>(comments ?? []);

  useEffect(() => {
    if (liveCommentsData?.data && liveCommentsData.data.length > 0) {
      setLocalComments(liveCommentsData.data);
    }
  }, [liveCommentsData]);

  const displayComments: CommentResponse[] = localComments;

  const [internalReplyTo, setInternalReplyTo] = useState<CommentResponse | null>(null);
  const controlled = replyToProp !== undefined;
  const replyTo = controlled ? replyToProp : internalReplyTo;
  const setReplyTo = (c: CommentResponse | null) => {
    if (controlled) onReplyToChange?.(c);
    else setInternalReplyTo(c);
  };
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

  const mutation = useCreateComment()

  const handleBalas = (comment: CommentResponse) => {
    setReplyTo(comment);
    if (onBalas) onBalas(comment);
    else setNewComment(`@${comment.user?.username || comment.user?.name || "user"} `);
  };

  const handleSend = () => {
    if (!newComment.trim()) return;
   mutation.mutate({ content: newComment, postId, parentId: replyTo?.id }, {
    onSuccess : () => {
        setNewComment("");
        setReplyTo(null);
    }
   })
   
  };

  const handleToggleLike = (commentId: string) => {
    const snapshot = localComments;
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isLiked: !c.isLiked,
              likesCount: Math.max(0, (c.likesCount || 0) + (c.isLiked ? -1 : 1)),
            }
          : c,
      ),
    );
    toggleLikeMutation.mutate(
      { commentId, postId },
      {
        onSuccess: (res) => {
          if (res?.data) {
            setLocalComments((prev) =>
              prev.map((c) =>
                c.id === commentId
                  ? { ...c, isLiked: res.data.liked, likesCount: res.data.totalLikes }
                  : c,
              ),
            );
          }
        },
        onError: () => {
          setLocalComments(snapshot);
        },
      },
    );
  };

  return (
    <VStack align="stretch" mt={4} gap={4} animation="fade-in">
      {showSeparator && <Separator borderColor="var(--app-subtle)" />}
      
      {/* List Komentar */}
      <VStack align="stretch" maxH="300px" overflowY="auto" gap={3} pr={2}>
        {displayComments.length > 0 ? (
          displayComments
            .filter((c) => !c.parentId)
            .map((comment) => {
              const allReplies = displayComments.filter((c) => {
                if (!c.parentId) return false;
                let cur: CommentResponse = c;
                while (cur.parentId) {
                  const parent = displayComments.find((p) => p.id === cur.parentId);
                  if (!parent) break;
                  if (parent.id === comment.id) return true;
                  cur = parent;
                }
                return false;
              });
              return (
                <Box key={comment.id}>
                  <HStack align="start" gap={3}>
                    <Avatar size="sm">
                      <AvatarImage src={comment.user?.avatar || "/default-avatar.jpg"} />
                      <AvatarFallback>{comment.user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Box bg="var(--app-input)" p={3} pr={12} borderRadius="2xl" flex={1} position="relative">
                      <Link href={`/profile/${comment.user?.username}`}>
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="var(--app-secondary)"
                          _hover={{ textDecoration: "underline" }}
                        >
                          {comment.user?.username || "User"}
                        </Text>
                      </Link>
                      <Text fontSize="sm" color="var(--app-secondary)" lineHeight="short">
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
                          mt={3}
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
                        onClick={() => handleToggleLike(comment.id)}
                        color={comment.isLiked ? "red.500" : "var(--app-faint)"}
                        _hover={{ color: "red.500" }}
                      >
                        <Heart size={14} fill={comment.isLiked ? "currentColor" : "none"} />
                      </Box>
                    </Box>
                  </HStack>

                  {allReplies.length > 0 && expandedReplies.has(comment.id) && (
                    <VStack align="stretch" gap={3} mt={3} pl={10}>
                      {allReplies.map((reply, replyIdx) => (
                            <HStack key={reply.id} align="start" gap={2}>
                              <Avatar size="sm">
                                <AvatarImage src={reply.user?.avatar || "/default-avatar.jpg"} />
                                <AvatarFallback>{reply.user?.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <Box bg="var(--app-input)" p={2.5} pr={10} borderRadius="2xl" flex={1} position="relative">
                                <Link href={`/profile/${reply.user?.username}`}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="bold"
                                    color="var(--app-secondary)"
                                    _hover={{ textDecoration: "underline" }}
                                  >
                                    {reply.user?.username || "User"}
                                  </Text>
                                </Link>
                                <Text fontSize="sm" color="var(--app-secondary)" lineHeight="short">
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
                                  onClick={() => handleToggleLike(reply.id)}
                                  color={reply.isLiked ? "red.500" : "var(--app-faint)"}
                                  _hover={{ color: "red.500" }}
                                >
                                  <Heart size={12} fill={reply.isLiked ? "currentColor" : "none"} />
                                </Box>
                              </Box>
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
            })
        ) : (
          <Text fontSize="sm" color="var(--app-faint)" textAlign="center" py={4}>
            Belum ada komentar. Jadilah yang pertama!
          </Text>
        )}
      </VStack>

      {/* Input Komentar Baru */}
      {showInput && replyTo && (
        <HStack gap={2} align="center">
          <Text fontSize="xs" color="blue.500" fontWeight="bold">
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
      {showInput && (
        <HStack gap={2} pt={2}>
          <Avatar size="sm">
            <AvatarImage src={profile?.avatar || "/default-avatar.jpg"} />
            <AvatarFallback>{profile?.name?.charAt(0) ?? "M"}</AvatarFallback>
          </Avatar>
          <Input
            placeholder="Tulis komentar..."
            size="sm"
            variant="subtle"
            bg="var(--app-hover)"
            color="blue.900"
            _placeholder={{ color: "blue.400" }}
            borderRadius="full"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button
            size="sm"
            colorPalette="blue"
            borderRadius="full"
            onClick={handleSend}
            disabled={!newComment.trim()}
          >
            <Send size={14} />
          </Button>
        </HStack>
      )}
    </VStack>
  );
};

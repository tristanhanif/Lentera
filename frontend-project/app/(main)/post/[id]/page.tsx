"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Box, Button, Flex, Spinner, Text, VStack } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { GridPostItem } from "../PostCard";
import { PostDetailView } from "../PostDetailView";
import { useGetPostById, useGetUserPosts } from "../post.service";

function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id;
  const postId = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");
  const router = useRouter();

  const { data, isLoading, isError } = useGetPostById(postId || null);

  const ownerUsername = data?.data?.user?.username ?? "";
  const ownerId = data?.data?.user?.id ?? "";
  const ownerKey = ownerUsername || ownerId;
  const { data: userPostsData, isFetching: othersLoading } =
    useGetUserPosts(ownerKey);

  if (isLoading) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (isError || !data?.data) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <VStack gap={3} textAlign="center">
          <Text fontWeight="bold" color="var(--app-text)">
            Postingan tidak ditemukan
          </Text>
          <Text fontSize="sm" color="var(--app-muted)">
            Postingan sudah dihapus atau tidak tersedia.
          </Text>
          <Button
            colorPalette="blue"
            borderRadius="full"
            onClick={() => router.back()}
          >
            <ArrowLeft size={16} /> Kembali
          </Button>
        </VStack>
      </Flex>
    );
  }

  const others = (userPostsData?.data ?? []).filter((p) => p.id !== postId);

  return (
    <Flex justify="center" w="full">
      <VStack w="full" maxW="1000px" align="stretch" gap={0}>
        <PostDetailView post={data.data} variant="own" />

        {/* Garis abu panjang, jarak 24 */}
        <Box h="1px" bg="var(--app-border)" my={6} />

        <Text
          fontSize="sm"
          fontWeight="bold"
          color="var(--app-text)"
          textAlign="left"
        >
          Postingan lainnya dari {ownerUsername || "pengguna ini"}
        </Text>

        <Box mt={4}>
          {othersLoading ? (
            <Flex py={8} justify="center">
              <Spinner size="md" color="blue.500" />
            </Flex>
          ) : others.length === 0 ? (
            <Text fontSize="sm" color="var(--app-muted)" py={4}>
              Belum ada postingan lain.
            </Text>
          ) : (
            <Flex wrap="wrap" gap={2}>
              {others.map((post) => (
                <GridPostItem
                  key={post.id}
                  post={post}
                  large
                  showMediaBadge
                  onClick={() =>
                    router.push(`/post/${encodeURIComponent(post.id)}`)
                  }
                />
              ))}
            </Flex>
          )}
        </Box>
      </VStack>
    </Flex>
  );
}

export default dynamic(() => Promise.resolve(PostDetailPage), {
  ssr: false,
});

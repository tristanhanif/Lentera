"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export function CreateTabs({ active }: { active: "story" | "postingan" }) {
  const router = useRouter();
  const items = [
    { key: "story" as const, label: "Story", path: "/story" },
    { key: "postingan" as const, label: "Postingan", path: "/postingan" },
  ];

  return (
    <Box
      position="sticky"
      bottom={0}
      zIndex={2}
      bg="black"
      borderTop="1px solid"
      borderColor="whiteAlpha.200"
      px={4}
      pt={3}
      pb="calc(12px + env(safe-area-inset-bottom))"
      mt={2}
    >
      <Flex
        bg="whiteAlpha.100"
        borderRadius="full"
        p={1}
        maxW="400px"
        mx="auto"
        gap={1}
      >
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <Box
              key={item.key}
              as="button"
              flex={1}
              borderRadius="full"
              py={2}
              bg={isActive ? "white" : "transparent"}
              color={isActive ? "black" : "whiteAlpha.600"}
              fontWeight={isActive ? "bold" : "medium"}
              fontSize="sm"
              cursor="pointer"
              _hover={{
                bg: isActive ? "white" : "whiteAlpha.200",
                color: isActive ? "black" : "white",
              }}
              onClick={() => {
                if (!isActive) router.push(item.path);
              }}
            >
              <Text fontSize="sm" fontWeight={isActive ? "bold" : "medium"}>
                {item.label}
              </Text>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

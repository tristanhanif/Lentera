"use client";

import { Box, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export type StoryLayoutCount = 1 | 2 | 3 | 4;

const MotionBox = motion.create(Box);

// Miniatur icon tata letak — murni kotak, tanpa angka & tanpa tulisan.
function LayoutGlyph({ count }: { count: StoryLayoutCount }) {
  const cell = {
    bg: "currentColor",
    borderRadius: "2px",
    minH: 0,
    minW: 0,
  } as const;

  if (count === 1) {
    return (
      <Box display="grid" w="22px" h="30px">
        <Box {...cell} />
      </Box>
    );
  }
  if (count === 2) {
    return (
      <Box display="grid" gridTemplateRows="1fr 1fr" gap="2px" w="22px" h="30px">
        <Box {...cell} />
        <Box {...cell} />
      </Box>
    );
  }
  if (count === 3) {
    return (
      <Box display="grid" gridTemplateRows="1fr 1fr" gap="2px" w="22px" h="30px">
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap="2px">
          <Box {...cell} />
          <Box {...cell} />
        </Box>
        <Box {...cell} />
      </Box>
    );
  }
  return (
    <Box
      display="grid"
      gridTemplateColumns="1fr 1fr"
      gridTemplateRows="1fr 1fr"
      gap="2px"
      w="22px"
      h="30px"
    >
      <Box {...cell} />
      <Box {...cell} />
      <Box {...cell} />
      <Box {...cell} />
    </Box>
  );
}

interface LayoutPickerProps {
  value: StoryLayoutCount;
  onChange: (next: StoryLayoutCount) => void;
}

const ORDER: StoryLayoutCount[] = [1, 2, 3, 4];

// Pemilih tata letak kiri tengah ala IG.
// Tertutup: hanya icon aktif. Dipencet: 3 icon lain meluncur ke bawah
// satu-satu (stagger) dengan animasi spring.
export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const others = ORDER.filter((o) => o !== value);

  return (
    <VStack gap={2} align="center">
      <Box
        as="button"
        aria-label="Pilih tata letak"
        onClick={() => setExpanded((v) => !v)}
        w="44px"
        h="52px"
        borderRadius="xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="whiteAlpha.200"
        color="white"
        border="2px solid"
        borderColor="white"
        cursor="pointer"
        backdropFilter="blur(8px)"
        _hover={{ bg: "whiteAlpha.300" }}
        transition="0.2s"
      >
        <LayoutGlyph count={value} />
      </Box>

      <AnimatePresence>
        {expanded && (
          <VStack gap={2}>
            {others.map((count, i) => (
              <MotionBox
                key={count}
                as="button"
                aria-label={`Tata letak ${count}`}
                initial={{ opacity: 0, y: -12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: i * 0.06,
                }}
                w="44px"
                h="52px"
                borderRadius="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="whiteAlpha.200"
                color="whiteAlpha.800"
                border="1px solid"
                borderColor="whiteAlpha.400"
                cursor="pointer"
                backdropFilter="blur(8px)"
                _hover={{ bg: "whiteAlpha.300", color: "white" }}
                onClick={() => {
                  onChange(count);
                  setExpanded(false);
                }}
              >
                <LayoutGlyph count={count} />
              </MotionBox>
            ))}
          </VStack>
        )}
      </AnimatePresence>
    </VStack>
  );
}

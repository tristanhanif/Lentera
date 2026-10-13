"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Input, Text } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import {
  DEFAULT_TEXT_COLOR_ID,
  getTextColor,
  STORY_TEXT_COLORS,
  STORY_TEXT_STYLES,
  StoryTextStyleId,
  StoryTextValue,
} from "../text-styles";
import { StoryTextSticker } from "./StoryTextSticker";

const MotionBox = motion.create(Box);

interface TextPanelProps {
  open: boolean;
  initial: StoryTextValue | null;
  onConfirm: (value: StoryTextValue) => void;
  onRemove?: () => void;
}

// Editor stiker teks ala IG: input di garis atas-tengah, centang kiri-atas,
// slider zoom kiri-tengah, konten atas (style/warna), bar bawah 2 bagian:
// kotak "Aa" (tab style) + buletan warna (tab warna). Bagian aktif berwarna abu-abu.
export function TextPanel({ open, initial, onConfirm, onRemove }: TextPanelProps) {
  const [content, setContent] = useState("");
  const [styleId, setStyleId] = useState<StoryTextStyleId>("modern");
  const [bgId, setBgId] = useState(DEFAULT_TEXT_COLOR_ID);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState<"style" | "color">("style");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setContent(initial?.content ?? "");
      setStyleId(initial?.style ?? "modern");
      setBgId(initial?.bg ?? DEFAULT_TEXT_COLOR_ID);
      setZoom(initial?.scale ?? 1);
      setTab("style");
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmed = content.trim();

  const confirm = () => {
    if (!trimmed) return;
    onConfirm({
      content: trimmed.slice(0, 140),
      style: styleId,
      bg: bgId,
      x: initial?.x ?? 50,
      y: initial?.y ?? 50,
      scale: Math.max(0.5, Math.min(2, Math.round(zoom * 100) / 100)),
    });
  };

  const trash = () => {
    onRemove?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <MotionBox
          key="text-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          position="fixed"
          inset={0}
          zIndex={201}
          bg="blackAlpha.700"
          color="white"
          display="flex"
          justifyContent="center"
        >
          <Box
            w="full"
            maxW="400px"
            h="100dvh"
            display="flex"
            flexDirection="column"
            px={4}
            pt={3}
            pb={5}
          >
            {/* Bar atas: centang kiri | input tengah | sampah kanan */}
            <Flex align="center" gap={2} flexShrink={0}>
              <Box
                as="button"
                aria-label="Selesai atur teks"
                onClick={confirm}
                w="36px"
                h="36px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor={trimmed ? "pointer" : "not-allowed"}
                color="white"
                opacity={trimmed ? 1 : 0.4}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Check size={22} />
              </Box>
              <Input
                ref={inputRef}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 140))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirm();
                }}
                placeholder="Ketik teks..."
                maxLength={140}
                variant="flushed"
                textAlign="center"
                fontSize="lg"
                fontWeight="bold"
                color="white"
                _placeholder={{ color: "whiteAlpha.500" }}
                borderColor="whiteAlpha.400"
                _focus={{ borderColor: "white" }}
                flex={1}
              />
              <Box
                as="button"
                aria-label="Hapus teks"
                onClick={trash}
                w="36px"
                h="36px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Trash2 size={20} />
              </Box>
            </Flex>

            {/* Tengah: preview + slider zoom kiri */}
            <Flex flex={1} align="center" minH={0} gap={2}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={2}
                flexShrink={0}
                aria-label="Perbesar atau perkecil teks"
              >
                <input
                  type="range"
                  aria-label="Perbesar atau perkecil teks"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{
                    height: "160px",
                    width: "24px",
                    cursor: "pointer",
                    accentColor: "white",
                    writingMode: "vertical-lr",
                    direction: "rtl",
                  } as React.CSSProperties}
                />
                <Text fontSize="10px" color="whiteAlpha.600" fontWeight="bold">
                  {Math.round(zoom * 100)}%
                </Text>
              </Box>
              <Flex flex={1} align="center" justify="center" minW={0}>
                <Box style={{ transform: `scale(${zoom})` }} maxW="full">
                  {trimmed ? (
                    <StoryTextSticker
                      value={{ content: trimmed, style: styleId, bg: bgId }}
                      maxW="240px"
                      fontSize="lg"
                    />
                  ) : (
                    <Text fontSize="sm" color="whiteAlpha.500">
                      Pratinjau teks muncul di sini
                    </Text>
                  )}
                </Box>
              </Flex>
              <Box w="24px" flexShrink={0} />
            </Flex>

            {/* Konten atas: ikut tab aktif (style / warna) */}
            {tab === "style" ? (
              <Box flexShrink={0} maxH="180px" overflowY="auto" pb={2}>
                <Flex direction="column" gap={1}>
                  {STORY_TEXT_STYLES.map((s) => {
                    const active = styleId === s.id;
                    const color = getTextColor(bgId);
                    return (
                      <Box
                        key={s.id}
                        as="button"
                        onClick={() => setStyleId(s.id)}
                        display="flex"
                        alignItems="center"
                        gap={3}
                        px={3}
                        py={2}
                        borderRadius="lg"
                        cursor="pointer"
                        bg={active ? "whiteAlpha.200" : "transparent"}
                        _hover={{ bg: "whiteAlpha.100" }}
                        textAlign="left"
                      >
                        <Box
                          bg={color.box}
                          borderRadius="md"
                          px={2}
                          py={1}
                          fontFamily={s.fontFamily}
                          fontWeight={s.fontWeight}
                          fontStyle={s.fontStyle ?? "normal"}
                          fontSize="sm"
                          color={color.ink}
                          flexShrink={0}
                        >
                          Ag
                        </Box>
                        <Text fontSize="sm" fontWeight={active ? "bold" : "medium"} color="white">
                          {s.label}
                        </Text>
                        {active && (
                          <Box ml="auto" color="white" display="flex">
                            <Check size={16} />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Flex>
              </Box>
            ) : (
              <Box flexShrink={0} pb={2}>
                <Flex gap={3} flexWrap="wrap" justify="center">
                  {STORY_TEXT_COLORS.map((c) => {
                    const active = bgId === c.id;
                    return (
                      <Box
                        key={c.id}
                        as="button"
                        aria-label={`Warna ${c.id}`}
                        title={c.id}
                        onClick={() => setBgId(c.id)}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={1}
                        cursor="pointer"
                      >
                        <Box
                          w="40px"
                          h="40px"
                          borderRadius="full"
                          bg={c.box}
                          border="2px solid"
                          borderColor={active ? "white" : "whiteAlpha.300"}
                          boxShadow={active ? "0 0 0 2px rgba(255,255,255,0.4)" : undefined}
                        />
                        <Text fontSize="9px" color={active ? "white" : "whiteAlpha.600"} fontWeight={active ? "bold" : "medium"}>
                          {c.id}
                        </Text>
                      </Box>
                    );
                  })}
                </Flex>
              </Box>
            )}

            {/* Bar bawah 2 bagian: "Aa" (tab style) + buletan warna (tab warna).
                Bagian aktif berwarna abu-abu. */}
            <Box
              bg="blackAlpha.600"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              p={2}
              flexShrink={0}
            >
              <Flex gap={2}>
                <Box
                  as="button"
                  aria-label="Masuk ke pengaturan style teks"
                  onClick={() => setTab("style")}
                  flex={1}
                  h="44px"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  bg={tab === "style" ? "whiteAlpha.200" : "transparent"}
                  fontSize="lg"
                  fontWeight="bold"
                  color="white"
                >
                  Aa
                </Box>
                <Box
                  as="button"
                  aria-label="Masuk ke pengaturan warna"
                  onClick={() => setTab("color")}
                  flex={1}
                  h="44px"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  bg={tab === "color" ? "whiteAlpha.200" : "transparent"}
                >
                  <Box
                    w="26px"
                    h="26px"
                    borderRadius="full"
                    border="2px solid white"
                    style={{
                      background:
                        "conic-gradient(#ef4444, #f59e0b, #facc15, #22c55e, #3b82f6, #a855f7, #ef4444)",
                    }}
                  />
                </Box>
              </Flex>
            </Box>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  );
}

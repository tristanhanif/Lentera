"use client";

import { Box, Text } from "@chakra-ui/react";
import {
  getTextColor,
  getTextStyle,
  StoryTextValue,
} from "../text-styles";

interface StoryTextStickerProps {
  value: Pick<StoryTextValue, "content" | "style" | "bg">;
  maxW?: string;
  fontSize?: string;
}

// Render kotak stiker teks — dipakai di editor, kanvas /story,
// dan halaman viewer /story/[username] supaya tampil identik.
export function StoryTextSticker({
  value,
  maxW = "220px",
  fontSize = "md",
}: StoryTextStickerProps) {
  const style = getTextStyle(value.style);
  const color = getTextColor(value.bg);
  return (
    <Box
      maxW={maxW}
      bg={color.box}
      borderRadius={style.borderRadius}
      px={style.padding.split(" ")[1] ?? "14px"}
      py={style.padding.split(" ")[0] ?? "8px"}
      textAlign="center"
      boxShadow={style.glow ? `0 0 18px ${color.box}` : "0 2px 10px rgba(0,0,0,0.35)"}
    >
      <Text
        fontSize={fontSize}
        fontFamily={style.fontFamily}
        fontWeight={style.fontWeight}
        fontStyle={style.fontStyle ?? "normal"}
        textTransform={style.textTransform ?? "none"}
        letterSpacing={style.letterSpacing ?? "normal"}
        color={color.ink}
        textShadow={style.glow ? `0 0 8px ${color.ink}` : undefined}
        wordBreak="break-word"
        whiteSpace="pre-wrap"
      >
        {value.content}
      </Text>
    </Box>
  );
}

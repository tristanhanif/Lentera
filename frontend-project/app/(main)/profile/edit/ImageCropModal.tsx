"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Portal,
  Text,
} from "@chakra-ui/react";
import { X, Check } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

const DEFAULT_ASPECT = 3 / 1;

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.round(pixelCrop.width * scaleX);
  canvas.height = Math.round(pixelCrop.height * scaleY);

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal memproses gambar"));
      },
      "image/jpeg",
      0.9,
    );
  });
}

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  title?: string;
  aspect?: number;
  confirmText?: string;
  cropShape?: "rect" | "round";
  hint?: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  title = "Atur Foto Sampul",
  aspect = DEFAULT_ASPECT,
  confirmText = "Upload Foto",
  cropShape = "rect",
  hint,
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const zoomRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onConfirm(blob);
    } catch (err) {
      console.error("Gagal memproses crop:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        inset={0}
        bg="blackAlpha.700"
        zIndex={3000}
        display="flex"
        alignItems="center"
        justifyContent="center"
        onClick={onClose}
        p={4}
      >
        <Box
          bg="var(--app-card)"
          w="full"
          maxW="xl"
          borderRadius="2xl"
          shadow="2xl"
          overflow="hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <HStack justify="space-between" p={4} borderBottom="1px solid" borderColor="var(--app-subtle)">
            <Text fontWeight="black" color="var(--app-text)">
              {title}
            </Text>
            <Button variant="ghost" size="sm" p={1} minW="auto" onClick={onClose} color="var(--app-muted)">
              <X size={20} />
            </Button>
          </HStack>

          {/* Cropper Area */}
          <Box position="relative" h="320px" bg="var(--app-text)">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={cropShape === "rect"}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </Box>

          {/* Zoom & Adjust */}
          <Box px={6} py={4}>
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="var(--app-muted)">
                Zoom
              </Text>
              <Text fontSize="xs" fontWeight="bold" color="var(--app-muted)">
                {Math.round(zoom * 100)}%
              </Text>
            </Flex>
            <input
              ref={zoomRef}
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#2563eb" }}
            />
            <Text fontSize="xs" color="var(--app-faint)" mt={2}>
              {hint ??
                "Seret gambar untuk menggeser, atur zoom untuk memperbesar area foto sampul."}
            </Text>
          </Box>

          {/* Footer */}
          <Flex p={4} borderTop="1px solid" borderColor="var(--app-subtle)" justify="end" gap={3}>
            <Button variant="outline" colorPalette="gray" borderRadius="full" px={6} onClick={onClose}>
              Batal
            </Button>
            <Button
              colorPalette="blue"
              borderRadius="full"
              px={6}
              loading={isProcessing}
              disabled={isProcessing}
              onClick={handleConfirm}
            >
              <Check size={16} />
              {isProcessing ? "Memproses..." : confirmText}
            </Button>
          </Flex>
        </Box>
      </Box>
    </Portal>
  );
}
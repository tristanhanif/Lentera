"use client"
import { Box } from "@chakra-ui/react";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="var(--app-bg)"
      px={4}
      transition="background 0.2s ease"
    >
      {children}
    </Box>
  );
}

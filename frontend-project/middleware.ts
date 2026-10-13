import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/verifikasi-berhasil",
  "/onboarding/username",
  "/forgot-password",
];

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // API callback Google harus selalu lolos (belum ada cookie saat user baru)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Onboarding avatar butuh token (dibuat setelah step username), jadi cek khusus:
  // - /onboarding/avatar tanpa token -> ke /login
  if (pathname.startsWith("/onboarding/avatar") && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Belum login → halaman private lempar ke /login
  if (!accessToken && !isPublic && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Sudah login → jangan ke login / register lagi
  if (accessToken && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/",
    "/explore",
    "/notifications",
    "/messages",
    "/story",
    "/story/:path*",
    "/profile/:path*",
    "/session/:path*",
    "/akun/:path*",
    "/verifikasi-berhasil",
    "/onboarding/:path*",
    "/forgot-password/:path*",
  ],
};

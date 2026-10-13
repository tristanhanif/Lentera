import { NextResponse } from "next/server";
import axios from "axios";
import { api } from "@/app/lib/axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code not found" }, { status: 400 });
  }

  try {
    // 1. Tukar CODE dengan TOKEN
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URL_GOOGLE,
        grant_type: "authorization_code",
      },
    );

    const { access_token } = tokenResponse.data;

    // 2. Ambil User Info dari Google menggunakan access_token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userResponse: any = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const login = await api.post("auth/login-google", {
      email: userResponse.data.email,
      name: userResponse.data.name,
      avatar: userResponse?.data?.picture,
    });

    // User baru (belum punya akun) -> arahkan ke onboarding, BELUM buat user / set cookie
    if (login.data?.isNew) {
      const params = new URLSearchParams({
        email: login.data.email ?? userResponse.data.email ?? "",
        name: login.data.name ?? userResponse.data.name ?? "",
        avatar: login.data.avatar ?? userResponse?.data?.picture ?? "",
        suggested: login.data.suggestedUsername ?? "",
      });
      return NextResponse.redirect(
        new URL(`/onboarding/username?${params.toString()}`, request.url),
      );
    }

    // User lama -> langsung login
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("access_token", login.data.access_token);
    response.cookies.set("refresh_token", login.data.refresh_token);
    response.cookies.set("uuid", login.data.user.id);
    response.cookies.set("loginMethod", "google");

    return response;
  } catch (error) {
    console.error("Google Auth Error", error);
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", request.url),
    );
  }
}

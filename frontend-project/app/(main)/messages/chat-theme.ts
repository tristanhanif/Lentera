// Tema chat bawaan Lentera (dipakai DM + komunitas).
// Diekstrak dari messages/page.tsx agar fungsinya identik.

// ===== CHAT THEME bawaan Lentera (gaya WA, 8 pilihan) =====
// Wallpaper = gradient + pola titik halus (tanpa gambar luar, ringan).
// Warna bubble diselaraskan dengan wallpaper masing-masing.
// "default" mengikuti sistem (var(--app-*)) biar cocok dark/light.
export interface ChatTheme {
  id: string;
  name: string;
  // CSS background utuh untuk area percakapan.
  chatBackground: string;
  meBg: string;
  meText: string;
  otherBg: string;
  otherText: string;
  // Warna border bubble lawan (agar kontras di wallpaper terang).
  otherBorder: string;
}

export const CHAT_THEME_DEFAULT_ID = "default";

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: "default",
    name: "Default",
    chatBackground: "var(--app-chat-bg)",
    meBg: "#2563eb",
    meText: "#ffffff",
    otherBg: "#ffffff",
    otherText: "#1e3a8a",
    otherBorder: "var(--app-hover)",
  },
  {
    // Motif bunga: pola bunga garis + titik di atas gradient pink lembut.
    id: "bunga",
    name: "Bunga",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><g fill='none' stroke='%23db2777' stroke-opacity='0.30' stroke-width='1.5'><circle cx='30' cy='30' r='7'/><circle cx='23' cy='30' r='4'/><circle cx='37' cy='30' r='4'/><circle cx='30' cy='23' r='4'/><circle cx='30' cy='37' r='4'/><circle cx='102' cy='92' r='7'/><circle cx='95' cy='92' r='4'/><circle cx='109' cy='92' r='4'/><circle cx='102' cy='85' r='4'/><circle cx='102' cy='99' r='4'/></g><g fill='%23db2777' fill-opacity='0.22'><circle cx='70' cy='52' r='3'/><circle cx='52' cy='112' r='3'/><circle cx='116' cy='36' r='3'/></g></svg>") 0 0/140px 140px, linear-gradient(135deg, #fce7f3 0%, #fbcfe8 55%, #f9a8d4 100%)`,
    meBg: "#db2777",
    meText: "#ffffff",
    otherBg: "#fdf2f8",
    otherText: "#831843",
    otherBorder: "#f9a8d4",
  },
  {
    // Kotak-kotak keren: geometri kotak + titik di atas ungu gelap.
    id: "geometris",
    name: "Geometris",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='%23ffffff' stroke-opacity='0.28' stroke-width='1.5'><rect x='14' y='14' width='34' height='34' rx='7'/><rect x='62' y='56' width='42' height='42' rx='9'/><rect x='72' y='10' width='22' height='22' rx='5'/></g><g fill='%23ffffff' fill-opacity='0.16'><circle cx='28' cy='92' r='5'/><circle cx='102' cy='102' r='3'/><circle cx='52' cy='52' r='2.5'/></g></svg>") 0 0/120px 120px, linear-gradient(135deg, #312e81 0%, #6d28d9 60%, #a855f7 100%)`,
    meBg: "#8b5cf6",
    meText: "#ffffff",
    otherBg: "#ede9fe",
    otherText: "#4c1d95",
    otherBorder: "#c4b5fd",
  },
  {
    // Pemandangan gunung: langit + matahari + 2 lapis gunung + salju.
    id: "gunung",
    name: "Gunung",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23bae6fd'/><stop offset='.6' stop-color='%23e0f2fe'/><stop offset='1' stop-color='%23fef9c3'/></linearGradient></defs><rect width='800' height='600' fill='url(%23s)'/><circle cx='620' cy='120' r='70' fill='%23fde68a' opacity='.30'/><circle cx='620' cy='120' r='50' fill='%23fde68a'/><polygon points='0,430 170,230 310,390 470,210 640,410 800,290 800,600 0,600' fill='%2393a8c8' opacity='.9'/><polygon points='0,480 200,320 360,460 540,310 700,470 800,380 800,600 0,600' fill='%2346616e'/><polygon points='170,230 196,262 170,278 146,260' fill='%23ffffff'/><polygon points='470,210 499,245 470,262 443,243' fill='%23ffffff'/><rect y='560' width='800' height='40' fill='%233f6212' opacity='.30'/></svg>") center/cover no-repeat`,
    meBg: "#0284c7",
    meText: "#ffffff",
    otherBg: "#ffffff",
    otherText: "#0c4a6e",
    otherBorder: "#bae6fd",
  },
  {
    // Sunset di pantai: langit senja + matahari + laut + pasir + kilau ombak.
    id: "sunset",
    name: "Sunset",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='k' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23312e81'/><stop offset='.45' stop-color='%23db2777'/><stop offset='.75' stop-color='%23fb923c'/><stop offset='1' stop-color='%23fde68a'/></linearGradient><linearGradient id='l' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23fb923c'/><stop offset='1' stop-color='%237c2d12'/></linearGradient></defs><rect width='800' height='600' fill='url(%23k)'/><circle cx='400' cy='375' r='85' fill='%23fef3c7' opacity='.30'/><circle cx='400' cy='375' r='58' fill='%23fef3c7'/><rect y='400' width='800' height='120' fill='url(%23l)' opacity='.88'/><rect y='520' width='800' height='80' fill='%23fde68a' opacity='.75'/><g stroke='%23fef3c7' stroke-opacity='.55' stroke-width='3' stroke-linecap='round'><line x1='120' y1='442' x2='680' y2='442'/><line x1='185' y1='468' x2='615' y2='468'/><line x1='250' y1='494' x2='550' y2='494'/></g></svg>") center/cover no-repeat`,
    meBg: "#c2410c",
    meText: "#ffffff",
    otherBg: "#fff7ed",
    otherText: "#7c2d12",
    otherBorder: "#fed7aa",
  },
  {
    // Daun tropis: pola daun di atas hijau segar.
    id: "tropis",
    name: "Tropis",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'><g fill='%23065f46' fill-opacity='0.25'><ellipse cx='45' cy='48' rx='28' ry='12' transform='rotate(-30 45 48)'/><ellipse cx='132' cy='122' rx='32' ry='13' transform='rotate(-30 132 122)'/><ellipse cx='122' cy='42' rx='22' ry='10' transform='rotate(25 122 42)'/><ellipse cx='55' cy='135' rx='20' ry='9' transform='rotate(20 55 135)'/></g><g fill='none' stroke='%23a7f3d0' stroke-opacity='0.55' stroke-width='1.5'><path d='M22 48 L68 48'/><path d='M104 122 L160 122'/></g></svg>") 0 0/180px 180px, linear-gradient(135deg, #d1fae5 0%, #6ee7b7 55%, #34d399 100%)`,
    meBg: "#047857",
    meText: "#ffffff",
    otherBg: "#ecfdf5",
    otherText: "#064e3b",
    otherBorder: "#6ee7b7",
  },
  {
    // Langit malam: bulan + taburan bintang di atas navy.
    id: "bintang",
    name: "Bintang",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><circle cx='152' cy='46' r='20' fill='%23fde68a'/><circle cx='145' cy='40' r='16' fill='%231e1b4b' opacity='.45'/><g fill='%23ffffff'><circle cx='24' cy='30' r='1.7' opacity='.95'/><circle cx='58' cy='66' r='1.2' opacity='.8'/><circle cx='88' cy='28' r='1.4' opacity='.9'/><circle cx='118' cy='80' r='1.1' opacity='.75'/><circle cx='40' cy='110' r='1.5' opacity='.9'/><circle cx='76' cy='140' r='1.2' opacity='.8'/><circle cx='110' cy='120' r='1.6' opacity='.9'/><circle cx='160' cy='130' r='1.2' opacity='.8'/><circle cx='180' cy='80' r='1.5' opacity='.9'/><circle cx='30' cy='165' r='1.2' opacity='.8'/></g></svg>") 0 0/200px 200px, linear-gradient(135deg, #0f172a 0%, #1e1b4b 70%, #312e81 100%)`,
    meBg: "#3b82f6",
    meText: "#ffffff",
    otherBg: "#334155",
    otherText: "#ffffff",
    otherBorder: "#475569",
  },
  {
    // Ombak laut: pola gelombang putih di atas biru segar.
    id: "ombak",
    name: "Ombak",
    chatBackground: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='80' viewBox='0 0 160 80'><g fill='none' stroke='%23ffffff' stroke-opacity='0.35' stroke-width='2' stroke-linecap='round'><path d='M0 20 Q20 10 40 20 T80 20 T120 20 T160 20'/><path d='M0 45 Q20 35 40 45 T80 45 T120 45 T160 45'/><path d='M0 70 Q20 60 40 70 T80 70 T120 70 T160 70'/></g></svg>") 0 0/160px 80px, linear-gradient(135deg, #38bdf8 0%, #0284c7 60%, #0c4a6e 100%)`,
    meBg: "#0369a1",
    meText: "#ffffff",
    otherBg: "#f0f9ff",
    otherText: "#0c4a6e",
    otherBorder: "#7dd3fc",
  },
];

export const getChatTheme = (id: string | null | undefined) =>
  CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0];

export const chatThemeStorageKey = (conversationId: string) =>
  `lentera-chat-theme-${conversationId}`;
"use client";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useMemo, Fragment } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  Button,
  IconButton,
  Flex,
  Spinner,
  Badge,
  Image,
} from "@chakra-ui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  Search,
  EllipsisVertical,
  Undo2,
  Star,
  Pin,
  PinOff,
  Copy,
  Reply,
  X,
  CheckCheck,
  Check,
  Play,
  Pause,
  Mic,
  Image as ImageIcon,
  FileText,
  Paintbrush,
  Ban,
  Trash2,
  Plus,
  Smile,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useChatSocketListener,
  useUnsendMessage,
  useStarMessage,
  usePinMessage,
  useUnpinMessage,
  useClearChat,
  usePresence,
  clearConversationUnread,
} from "./chat.service";
import type { ChatMessage } from "./chat.interface";
import {
  POST_SHARE_DEFAULT_TEXT,
  FILE_SHARE_DEFAULT_TEXT,
  IMAGE_SHARE_DEFAULT_TEXT,
  VOICE_SHARE_DEFAULT_TEXT,
} from "./chat.interface";
import { uploadToCloudinary, uploadChatDocument, uploadChatVoice } from "@/app/lib/upload";
import NoteReplyPreview from "./components/NoteReplyPreview";
import PostSharePreview from "./components/PostSharePreview";
import FileAttachmentPreview from "./components/FileAttachmentPreview";
import MessageMenu, { type MenuPosition } from "./components/MessageMenu";
import DMVoiceBubble from "./components/DMVoiceBubble";
import DMVoiceRecorder from "./components/DMVoiceRecorder";
import NotesRail from "./components/NotesRail";
import ConversationSidebar from "./components/ConversationSidebar";
import {
  parseAsUTC,
  formatWIBTime,
  formatReadAt,
  getWIBDayKey,
  getWIBDayStartUTC,
  formatDateSeparator,
  wibDayFormatter,
} from "./utils/chat-time";
import {
  PIN_DURATIONS,
  CHAT_EMOJIS,
  formatFileSize,
  getFileExt,
  isHiddenShareText,
  voicePreviewLabel,
  isNoteReplyExpired,
  getFindMatchInfo,
  formatBadge4,
} from "./utils/chat-helpers";
import { MAX_DM_VN_SECS } from "./utils/dm-voice";
import { MusicPlayingIcon } from "./NotesBar";
import NoteEditor from "./NoteEditor";
import TeraChatView from "./TeraChatView";
import CommunityCreateView from "./CommunityCreateView";
import CommunityChatView from "./CommunityChatView";
import ChannelCreateView from "./ChannelCreateView";
import ChannelChatView from "./ChannelChatView";
import {
  loadCommunities,
  saveCommunities,
  communityAvatar,
  type Community,
  type CommunityMember,
} from "./community.store";
import {
  useBackendCommunities,
  useBackendCommunityMessages,
  useCreateBackendCommunity,
  useUpdateBackendCommunity,
  useSendBackendCommunityMessage,
  useAddBackendCommunityMembers,
  useClearBackendCommunityChat,
  useExploreCommunities,
  useJoinCommunity,
  useLeaveBackendCommunity,
  useMarkCommunityRead,
  usePromoteCommunityAdmin,
  useRemoveCommunityMember,
} from "./community.service";
import {
  channelAvatar,
  formatVoiceDuration,
  useBackendChannelDetail,
  useBackendChannelMessages,
  useBackendChannels,
  useCreateBackendChannel,
  useExploreChannels,
  useFollowChannel,
  useMarkChannelRead,
  useSendBackendChannelText,
  useSendBackendChannelVoice,
  useUnfollowChannel,
  useUpdateBackendChannel,
} from "./channel.service";
import {
  CHAT_THEMES,
  CHAT_THEME_DEFAULT_ID,
  chatThemeStorageKey,
  getChatTheme,
} from "./chat-theme";
import {
  TERA_CONVERSATION_ID,
  loadTeraMessages,
} from "./tera.service";
import { useVisibleNotes, useReplyNote, useDeleteNote } from "./note.service";
import { useProfile } from "../profile/profile.service";
import { useBlockUser } from "../akun/block.service";
import { StoryAvatar } from "../stories/StoryAvatar";
import { PostDetailModal } from "../post/PostDetailModal";
import { useGetPostById } from "../post/post.service";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

// Kotak animasi (menu header): pola yang sama seperti di /story.
const MotionBox = motion.create(Box);
function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [ownNoteView, setOwnNoteView] = useState<null | "detail" | "editor">(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Filter daftar tengah: Pesan / Komunitas / Saluran.
  // Default Pesan (DM 1-on-1 yang sudah ada). Komunitas & Saluran masih
  // placeholder (backend belum ada) — tampilkan empty state.
  const [activeFilter, setActiveFilter] = useState<
    "pesan" | "komunitas" | "saluran"
  >("pesan");
  // Komunitas lokal (frontend-only, siap diganti data real backend nanti).
  // Buat via buletan plus → form di panel kanan → chat komunitas di panel kanan.
  // Init malas dari localStorage biar save pertama tidak menimpa data lama
  // dengan [] (bug yang bikin "Keluarga Fullstack Developer" hilang).
  const [communityCreateOpen, setCommunityCreateOpen] = useState(false);
  const [communities, setCommunities] = useState<Community[]>(() => {
    try {
      return loadCommunities(Cookies.get("uuid") || "");
    } catch {
      return [];
    }
  });
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  // Saluran (backend beneran, mirip komunitas): buat + daftar + chat.
  const [channelCreateOpen, setChannelCreateOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  // Garis panjang Komunitas & Saluran (antara yang sudah Gabung/Follow
  // vs Populer) bisa digeser atas-bawah ala sash VS Code Extensions.
  // Batas: paling atas = 2 ter-Gabung/Follow terlihat,
  // paling bawah = 4 ter-Gabung/Follow terlihat.
  const COMMUNITY_ITEM_H = 80;
  const COMMUNITY_MIN_H = COMMUNITY_ITEM_H * 2;
  const COMMUNITY_MAX_H = COMMUNITY_ITEM_H * 4;
  const [joinedPaneH, setJoinedPaneH] = useState(COMMUNITY_ITEM_H * 3);
  const sashDragRef = useRef<{ startY: number; startH: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = Cookies.get("uuid") || "";
  const queryClient = useQueryClient();
  const router = useRouter();
  // Komunitas backend (beneran, lintas-akun) + lokal legacy.
  // Baru dibuat via backend; yang lokal lama tetap tampil biar tidak hilang.
  const { data: backendCommunitiesData } = useBackendCommunities(!!currentUserId);
  const backendCommunities = backendCommunitiesData?.data ?? [];
  const { data: exploreCommunitiesData } = useExploreCommunities(!!currentUserId);
  const exploreCommunities = exploreCommunitiesData?.data ?? [];
  const joinCommunityMutation = useJoinCommunity();
  const isBackendCommunityId = (id: string | null) =>
    !!id && !id.startsWith("local-");
  const selectedBackendId =
    selectedCommunityId && isBackendCommunityId(selectedCommunityId)
      ? selectedCommunityId
      : null;
  const { data: backendMessagesData } =
    useBackendCommunityMessages(selectedBackendId);
  const createBackendCommunityMutation = useCreateBackendCommunity();
  const updateBackendCommunityMutation = useUpdateBackendCommunity(
    selectedBackendId ?? "",
  );
  const sendBackendCommunityMutation = useSendBackendCommunityMessage(
    selectedBackendId ?? "",
  );
  const addBackendMembersMutation = useAddBackendCommunityMembers(
    selectedBackendId ?? "",
  );
  const clearBackendCommunityMutation = useClearBackendCommunityChat(
    selectedBackendId ?? "",
  );
  const leaveBackendCommunityMutation = useLeaveBackendCommunity();
  const promoteAdminMutation = usePromoteCommunityAdmin(selectedBackendId ?? "");
  const removeMemberMutation = useRemoveCommunityMember(selectedBackendId ?? "");
  const markCommunityReadMutation = useMarkCommunityRead(selectedBackendId ?? "");
  // Badge merah: angka >4 jadi "4+". Filter = jumlah komunitas yang belum dibaca,
  // list = jumlah pesan yang belum dibaca per komunitas.
  // formatBadge4 pindah ke utils/chat-helpers
  const unreadCommunityCount = backendCommunities.filter(
    (c) => (c.unreadCount ?? 0) > 0,
  ).length;
  const activeUnreadCount = backendMessagesData?.data?.unreadCount ?? 0;
  const activeFirstUnreadId = backendMessagesData?.data?.firstUnreadId ?? null;
  // Saluran backend (daftar + chat + unread ala komunitas).
  // Preview ala WA: selectedChannelId bisa belum diikuti -> fallback ke
  // detail publik (/channels/:id) + messages publik, lalu Join dari header.
  const { data: backendChannelsData } = useBackendChannels(!!currentUserId);
  const backendChannels = backendChannelsData?.data ?? [];
  const { data: exploreChannelsData } = useExploreChannels(!!currentUserId);
  const exploreChannels = exploreChannelsData?.data ?? [];
  const { data: backendChannelMessagesData } = useBackendChannelMessages(selectedChannelId);
  const mySelectedChannel = backendChannels.find((c) => c.id === selectedChannelId) ?? null;
  const needPreviewDetail = !!selectedChannelId && !mySelectedChannel;
  const { data: previewChannelData, isLoading: loadingPreviewChannel } =
    useBackendChannelDetail(needPreviewDetail ? selectedChannelId : null);
  const previewChannel = previewChannelData?.data ?? null;
  const createBackendChannelMutation = useCreateBackendChannel();
  const sendChannelTextMutation = useSendBackendChannelText(selectedChannelId ?? "");
  const sendChannelVoiceMutation = useSendBackendChannelVoice(selectedChannelId ?? "");
  const markChannelReadMutation = useMarkChannelRead(selectedChannelId ?? "");
  const unfollowChannelMutation = useUnfollowChannel();
  const followChannelMutation = useFollowChannel();
  const updateChannelMutation = useUpdateBackendChannel(selectedChannelId ?? "");
  const [sendingVoice, setSendingVoice] = useState(false);
  const [joiningChannel, setJoiningChannel] = useState(false);
  const unreadChannelCount = backendChannels.filter((c) => (c.unreadCount ?? 0) > 0).length;
  const activeChannelUnreadCount = backendChannelMessagesData?.data?.unreadCount ?? 0;
  const activeChannelFirstUnreadId = backendChannelMessagesData?.data?.firstUnreadId ?? null;
  const selectedChannel = mySelectedChannel
    ? {
      id: mySelectedChannel.id,
      name: mySelectedChannel.name,
      description: mySelectedChannel.description,
      avatarUrl: mySelectedChannel.avatarUrl,
      ownerId: mySelectedChannel.ownerId,
      followerCount: mySelectedChannel.followerCount,
      createdAt: mySelectedChannel.createdAt,
    }
    : (previewChannel
      ? {
        id: previewChannel.id,
        name: previewChannel.name,
        description: previewChannel.description,
        avatarUrl: previewChannel.avatarUrl,
        ownerId: previewChannel.ownerId,
        followerCount: previewChannel.followerCount,
        createdAt: previewChannel.createdAt,
      }
      : null);
  const selectedChannelIsFollowing = !!mySelectedChannel || (previewChannel?.isFollowing ?? false);
  const selectedChannelIsOwner = mySelectedChannel
    ? mySelectedChannel.ownerId === currentUserId
    : (previewChannel?.isOwner ?? false);
  // Preview = ada detail publik tapi belum join & bukan owner.
  const selectedChannelIsPreview = !!selectedChannelId
    && !mySelectedChannel
    && !!previewChannel
    && !previewChannel.isFollowing
    && !previewChannel.isOwner;
  const channelMessages = backendChannelMessagesData?.data?.messages ?? [];
  const handleJoinPreviewChannel = () => {
    if (!selectedChannelId || followChannelMutation.isPending || joiningChannel) return;
    setJoiningChannel(true);
    followChannelMutation.mutate(selectedChannelId, {
      onSuccess: () => setJoiningChannel(false),
      onError: (err: unknown) => {
        setJoiningChannel(false);
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Gagal bergabung ke saluran";
        Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
      },
    });
  };
  // Komunitas: muat ulang kalau akun berganti. Simpan dilakukan eksplisit
  // di tiap aksi (buat/kirim/hapus/keluar) — tanpa auto-save effect agar
  // tidak ada race yang menimpa storage dengan data basi.
  useEffect(() => {
    try {
      setCommunities(loadCommunities(currentUserId));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);
  const persistCommunities = (next: Community[]) => {
    setCommunities(next);
    try {
      saveCommunities(currentUserId, next);
    } catch {}
  };
  // Bersih-bersih dobel: kalau nama komunitas lokal sama dengan yang backend
  // (mis. "Keluarga Fullstack Developer"), backend yang menang.
  // Hapus duplikat lokal dari localStorage + pindahkan seleksi ke id backend.
  useEffect(() => {
    if (!backendCommunities.length || !currentUserId) return;
    try {
      const backendNames = new Set(
        backendCommunities.map((c) => c.name.trim().toLowerCase()),
      );
      const backendByName = new Map(
        backendCommunities.map((c) => [c.name.trim().toLowerCase(), c.id]),
      );
      let changed = false;
      const next = communities.filter((c) => {
        if (backendNames.has(c.name.trim().toLowerCase())) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) {
        setCommunities(next);
        try {
          saveCommunities(currentUserId, next);
        } catch {}
      }
      if (selectedCommunityId?.startsWith("local-")) {
        const dup = communities.find((c) => c.id === selectedCommunityId);
        if (dup) {
          const backendId = backendByName.get(dup.name.trim().toLowerCase());
          if (backendId) setSelectedCommunityId(backendId);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendCommunitiesData, currentUserId]);
  // Menandai percakapan mana yang badge-nya sudah disinkronkan ke server,
  // supaya invalidate daftar percakapan cukup sekali per obrolan yang dibuka.
  const readSyncedRef = useRef<string | null>(null);

  const { data: conversationsData, isLoading: loadingConversations } = useConversations();
  const conversations = conversationsData?.data ?? [];

  const { data: messagesData, isLoading: loadingMessages } = useMessages(selectedConversation);
  const messages = messagesData?.data?.messages ?? [];

  const sendMessageMutation = useSendMessage();
  const unsendMutation = useUnsendMessage(selectedConversation);
  const starMutation = useStarMessage(selectedConversation);
  const pinMutation = usePinMessage(selectedConversation);
  const unpinMutation = useUnpinMessage(selectedConversation);
  const onlineUserIds = usePresence();
  const { data: notesData } = useVisibleNotes();
  const { data: profile } = useProfile();
  const clearChatMutation = useClearChat(selectedConversation);
  const blockMutation = useBlockUser();
  // Kotak konfirmasi Clear chat: muncul di tengah kotak percakapan.
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const ownNote = useMemo(
    () => (notesData?.data ?? []).find((n) => n.isOwn) ?? null,
    [notesData],
  );

  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition>({});
  // Menu titik tiga di header kanan (isi menyusul).
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  // Mode Find ala VS Code: menggantikan header kanan saat Search dipencet.
  // - Kiri: ChevronLeft buat keluar
  // - Tengah: kotak input "Cari pesan..."
  // - Kanan luar kotak: "No results" / "[n] of [total]"
  // - Paling kanan: panah atas (prev) + panah bawah (next)
  const [isFinding, setIsFinding] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Chat theme per-obrolan (lokal): akun A ganti wallpaper obrolan dengan
  // akun B hanya ngaruh di HP akun A, akun B tidak ikut (tidak terhubung).
  const [themeView, setThemeView] = useState<null | "preview" | "all">(null);
  const [chatThemeId, setChatThemeId] = useState<string>(CHAT_THEME_DEFAULT_ID);
  const activeTheme = getChatTheme(chatThemeId);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  // Emoji + lampiran di kotak input (ala WA/IG).
  const [emojiOpen, setEmojiOpen] = useState(false);
  interface PendingAttachment {
    kind: "image" | "document";
    previewUrl: string;
    uploadedUrl: string | null;
    uploadedName: string;
    uploadedSize: number;
    progress: number;
    ready: boolean;
    error: string | null;
  }
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentSeq = useRef(0);
  // VN DM (ala saluran): mode rekaman + id VN yang lagi diputar + status kirim.
  const [dmRecording, setDmRecording] = useState(false);
  const [dmPlayingId, setDmPlayingId] = useState<string | null>(null);
  const [dmSendingVoice, setDmSendingVoice] = useState(false);
  // Kotak postingan di chat dipencet -> ambil detail + buka kotak besar.
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const {
    data: sharedPostData,
    isLoading: sharedPostLoading,
    isError: sharedPostError,
  } = useGetPostById(sharedPostId);

  useEffect(() => {
    if (sharedPostError && sharedPostId) {
      setSharedPostId(null);
      Swal.fire({
        title: "Tidak tersedia",
        text: "Postingan sudah tidak tersedia.",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }, [sharedPostError, sharedPostId]);

  const closeMenu = () => {
    setMenuMessageId(null);
    setPinMode(false);
  };

  const openMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    msgId: string,
  ) => {
    if (menuMessageId === msgId) {
      closeMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_HEIGHT = 230;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT;

    setMenuPos({
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      left: rect.left,
    });
    setMenuMessageId(msgId);
    setPinMode(false);
  };

  const handleUnsend = (msg: ChatMessage) => {
    unsendMutation.mutate(msg.id);
    closeMenu();
  };

  const handleStar = (msg: ChatMessage) => {
    starMutation.mutate(msg.id);
    closeMenu();
  };

  const handlePin = (msg: ChatMessage, minutes: number) => {
    pinMutation.mutate({ messageId: msg.id, durationInMinutes: minutes });
    closeMenu();
  };

  const handleUnpin = (msg: ChatMessage) => {
    unpinMutation.mutate(msg.id);
    closeMenu();
  };

  const handleCopy = (msg: ChatMessage) => {
    if (msg.audioUrl) {
      closeMenu();
      return;
    }
    navigator.clipboard.writeText(msg.text);
    closeMenu();
  };

  const pinnedMessage = useMemo(() => {
    const nowPinned = Date.now();
    return (
      [...messages]
        .filter(
          (m) =>
            !m.isDeleted &&
            m.pinnedUntil &&
            parseAsUTC(m.pinnedUntil).getTime() > nowPinned,
        )
        .sort(
          (a, b) =>
            parseAsUTC(b.pinnedUntil!).getTime() -
            parseAsUTC(a.pinnedUntil!).getTime(),
        )[0] ?? null
    );
  }, [messages]);

  // Pesan terakhir yang saya kirim (untuk label "Dilihat • ...").
  const lastOwnMessage = useMemo(() => {
    return (
      [...messages]
        .reverse()
        .find(
          (m) =>
            !m.isEvent && !m.isDeleted && m.senderId === currentUserId,
        ) ?? null
    );
  }, [messages, currentUserId]);

  // Jam sekarang untuk label "Dilihat • ...".
  // Timer presisi: berdetak tepat di batas menit berikutnya (saat label
  // akan berubah), jadi tulisan selalu realtime tanpa reload halaman.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastOwnMessage?.readAt) return;
    const elapsed = Date.now() - parseAsUTC(lastOwnMessage.readAt).getTime();
    const msToNextMinute = 60000 - (elapsed % 60000);
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(msToNextMinute, 1000),
    );
    return () => clearTimeout(timer);
  }, [lastOwnMessage?.readAt, now]);

  useChatSocketListener(selectedConversation);

  useEffect(() => {
    // Saat mode Find aktif jangan auto-scroll ke bawah biar posisi hasil tetap.
    if (isFinding) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isFinding]);

  // Ganti obrolan dari jalur mana pun (klik list, balas catatan, deep-link):
  // hentikan mode rekaman VN DM + putar VN biar tidak nyangkut di obrolan lama.
  useEffect(() => {
    setDmRecording(false);
    setDmPlayingId(null);
    setDmSendingVoice(false);
  }, [selectedConversation]);

  // Membuka obrolan = membaca pesan. GET messages sudah menandai isRead=true
  // di server, jadi refresh daftar percakapan supaya badge merah ikut hilang.
  useEffect(() => {
    if (
      !selectedConversation ||
      !messagesData ||
      readSyncedRef.current === selectedConversation
    ) {
      return;
    }
    readSyncedRef.current = selectedConversation;
    queryClient.invalidateQueries({ queryKey: ["/chat/conversations"] });
  }, [selectedConversation, messagesData, queryClient]);

  const handleSelectConversation = (convId: string) => {
    setSelectedConversation(convId);
    setOwnNoteView(null);
    // Pindah ke DM → tutup form/chat komunitas + saluran.
    setCommunityCreateOpen(false);
    setSelectedCommunityId(null);
    setChannelCreateOpen(false);
    setSelectedChannelId(null);
    closeMenu();
    setHeaderMenuOpen(false);
    setClearConfirmOpen(false);
    setReplyTo(null);
    setAttachment(null);
    setEmojiOpen(false);
    setDmRecording(false);
    setDmPlayingId(null);
    setDmSendingVoice(false);
    // Ganti obrolan -> keluar dari mode Find + Theme.
    setIsFinding(false);
    setFindQuery("");
    setFindIndex(0);
    setThemeView(null);
    // Tera AI virtual: tidak ada badge/unread di server.
    if (convId === TERA_CONVERSATION_ID) return;
    // Hilangkan badge seketika (optimistic), sinkronisasi server menyusul
    // lewat effect di atas.
    clearConversationUnread(queryClient, convId);
  };

  // Deep-link: Tera AI (?chat=tera-ai) + komunitas (?community=:id dari notif).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("chat") === TERA_CONVERSATION_ID) {
        setSelectedConversation(TERA_CONVERSATION_ID);
        setOwnNoteView(null);
        window.history.replaceState(null, "", "/messages");
      } else if (params.get("community")) {
        const cid = params.get("community") as string;
        setSelectedConversation(null);
        setOwnNoteView(null);
        setCommunityCreateOpen(false);
        setSelectedCommunityId(cid);
        setChannelCreateOpen(false);
        setSelectedChannelId(null);
        setActiveFilter("komunitas");
        window.history.replaceState(null, "", "/messages");
      } else if (params.get("channel")) {
        const chid = params.get("channel") as string;
        setSelectedConversation(null);
        setOwnNoteView(null);
        setCommunityCreateOpen(false);
        setSelectedCommunityId(null);
        setChannelCreateOpen(false);
        setSelectedChannelId(chid);
        setActiveFilter("saluran");
        window.history.replaceState(null, "", "/messages");
      }
    } catch {
      // abaikan kalau URL tidak bisa dibaca
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Muat tema tersimpan per-obrolan (hanya di perangkat ini).
  useEffect(() => {
    if (!selectedConversation) {
      setChatThemeId(CHAT_THEME_DEFAULT_ID);
      return;
    }
    try {
      const saved = localStorage.getItem(
        chatThemeStorageKey(selectedConversation),
      );
      setChatThemeId(saved || CHAT_THEME_DEFAULT_ID);
    } catch {
      setChatThemeId(CHAT_THEME_DEFAULT_ID);
    }
  }, [selectedConversation]);

  const applyChatTheme = (id: string) => {
    setChatThemeId(id);
    if (!selectedConversation) return;
    try {
      if (id === CHAT_THEME_DEFAULT_ID) {
        localStorage.removeItem(chatThemeStorageKey(selectedConversation));
      } else {
        localStorage.setItem(chatThemeStorageKey(selectedConversation), id);
      }
    } catch {
      // abaikan kalau storage penuh / diblokir
    }
  };

  const resetChatTheme = () => applyChatTheme(CHAT_THEME_DEFAULT_ID);

  const openThemePreview = () => {
    setHeaderMenuOpen(false);
    setIsFinding(false);
    setThemeView("preview");
  };

  const closeThemeToChat = () => setThemeView(null);

  // ===== FIND DALAM PERCAKAPAN (ala VS Code) =====
  // Daftar id pesan yang cocok (urutan kronologis = urutan messages).
  // Hanya kotak pesan teks + nama dokumen (lihat getFindMatchInfo).
  const findMatches = useMemo(() => {
    const q = findQuery.trim().toLowerCase();
    if (!isFinding || !q) return [];
    return messages
      .filter((m) => getFindMatchInfo(m, q).matched)
      .map((m) => m.id);
  }, [findQuery, messages, isFinding]);

  const findTotal = findMatches.length;
  const findActiveId = findTotal > 0 ? findMatches[Math.min(findIndex, findTotal - 1)] : null;
  const findLabel =
    findQuery.trim() && findTotal > 0
      ? `${Math.min(findIndex, findTotal - 1) + 1} of ${findTotal}`
      : "No results";

  const openFind = () => {
    setHeaderMenuOpen(false);
    setThemeView(null);
    setIsFinding(true);
    setFindQuery("");
    setFindIndex(0);
    // Fokus ke kotak input setelah header keganti.
    setTimeout(() => findInputRef.current?.focus(), 50);
  };

  const closeFind = () => {
    setIsFinding(false);
    setFindQuery("");
    setFindIndex(0);
  };

  const goToFind = (dir: 1 | -1) => {
    if (findTotal === 0) return;
    setFindIndex((prev) => {
      const clamped = Math.min(Math.max(prev, 0), findTotal - 1);
      return (clamped + dir + findTotal) % findTotal;
    });
  };

  // Ketik kata baru -> balik ke hasil pertama.
  const handleFindChange = (value: string) => {
    setFindQuery(value);
    setFindIndex(0);
  };

  // Scroll ke pesan aktif setiap pindah hasil.
  useEffect(() => {
    if (!isFinding || !findActiveId) return;
    const el = messageRefs.current.get(findActiveId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [findActiveId, isFinding]);

  // Menu titik-tiga header: Search buka Find, Chat theme buka panel tema,
  // Clear chat buka kotak konfirmasi di tengah percakapan.
  const handleHeaderMenuSelect = (label: string) => {
    if (label === "Search") {
      setThemeView(null);
      openFind();
      return;
    }
    if (label === "Chat theme") {
      openThemePreview();
      return;
    }
    if (label === "Clear chat") {
      setHeaderMenuOpen(false);
      setThemeView(null);
      setIsFinding(false);
      setClearConfirmOpen(true);
      return;
    }
    if (label === "Block") {
      // Cara blokir akun B: blokir lawan bicara, chat ikut hilang (backend filter).
      const otherId = conversations.find((c) => c.id === selectedConversation)?.otherUser?.id;
      setHeaderMenuOpen(false);
      if (!otherId || blockMutation.isPending) return;
      blockMutation.mutate(otherId, {
        onSuccess: () => {
          setSelectedConversation(null);
          Swal.fire({
            title: "Berhasil",
            text: "Akun berhasil diblokir",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
        },
        onError: () => {
          Swal.fire({
            title: "Gagal",
            text: "Gagal memblokir akun",
            icon: "error",
            timer: 2000,
            showConfirmButton: false,
          });
        },
      });
      return;
    }
    setHeaderMenuOpen(false);
  };

  const handleConfirmClearChat = () => {
    if (!selectedConversation || clearChatMutation.isPending) return;
    clearChatMutation.mutate(selectedConversation, {
      onSuccess: () => {
        setClearConfirmOpen(false);
        setReplyTo(null);
      },
      onError: () => {
        setClearConfirmOpen(false);
        Swal.fire({
          title: "Gagal",
          text: "Gagal menghapus chat",
          icon: "error",
          timer: 2000,
          showConfirmButton: false,
        });
      },
    });
  };

  // Highlight potongan yang cocok: kuning untuk semua, oranye untuk pesan aktif.
  const renderFoundText = (text: string, isActive: boolean) => {
    const q = findQuery.trim();
    if (!isFinding || !q || !isActive && findTotal === 0) return text;
    if (!q) return text;
    const lowerText = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    // Pesan ini tidak cocok -> teks biasa.
    if (!lowerText.includes(lowerQ)) return text;
    const parts: React.ReactNode[] = [];
    let i = 0;
    let key = 0;
    while (i < text.length) {
      const idx = lowerText.indexOf(lowerQ, i);
      if (idx === -1) {
        parts.push(text.slice(i));
        break;
      }
      if (idx > i) parts.push(text.slice(i, idx));
      parts.push(
        <Box
          key={`find-${key++}`}
          as="span"
          bg={isActive ? "orange.300" : "yellow.200"}
          color="black"
          px="1px"
          borderRadius="sm"
        >
          {text.slice(idx, idx + q.length)}
        </Box>,
      );
      i = idx + q.length;
    }
    return <>{parts}</>;
  };

  const handleOwnNoteClick = () => {
    // Detail (lihat/hapus) muncul di sebelah kiri.
    // Di sini hanya buka editor kanan untuk buat baru / edit.
    setSelectedConversation(null);
    setCommunityCreateOpen(false);
    setSelectedCommunityId(null);
    setOwnNoteView("editor");
  };

  const handleNoteReplied = (conversationId: string) => {
    // Balas catatan akun B -> langsung buka DM dengan akun B.
    setOwnNoteView(null);
    closeMenu();
    setReplyTo(null);
    clearConversationUnread(queryClient, conversationId);
    setSelectedConversation(conversationId);
  };

  // Kotak Catatan akun B: muncul saat kursor diarahkan ke avatarnya
  // (overlay di kanan avatar, menutupi bagian tengah, tidak menggeser).
  // Kursor pergi -> hilang lagi. Kotak dipencet -> ganti jadi kotak balasan.
  const replyNoteMutation = useReplyNote();
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<{ top: number; left: number } | null>(null);
  const [replyNoteId, setReplyNoteId] = useState<string | null>(null);
  const [replyAnchor, setReplyAnchor] = useState<{ top: number; left: number } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);
  const hoverTimer = useRef<number | null>(null);

  const cancelHideHover = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const scheduleHideHover = () => {
    cancelHideHover();
    hoverTimer.current = window.setTimeout(() => {
      setHoveredNoteId(null);
      setHoverAnchor(null);
      hoverTimer.current = null;
    }, 160);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const allNotes = notesData?.data ?? [];
  const hoveredNote = allNotes.find((n) => n.id === hoveredNoteId) ?? null;
  const replyingNote = allNotes.find((n) => n.id === replyNoteId) ?? null;

  const openReplyForNote = (noteId: string, anchor: { top: number; left: number } | null) => {
    cancelHideHover();
    setHoveredNoteId(null);
    setHoverAnchor(null);
    setReplyNoteId(noteId);
    setReplyAnchor(anchor);
    setReplyText("");
    setReplyError(null);
    setShowReplyEmoji(false);
  };

  const closeNoteReply = () => {
    setReplyNoteId(null);
    setReplyAnchor(null);
    setReplyText("");
    setReplyError(null);
    setShowReplyEmoji(false);
  };

  // Hapus Catatan sendiri dari popover hover akun sendiri.
  const deleteOwnNoteMutation = useDeleteNote();

  const handleDeleteOwnNote = () => {
    if (deleteOwnNoteMutation.isPending) return;
    deleteOwnNoteMutation.mutate(undefined, {
      onSuccess: () => {
        cancelHideHover();
        setHoveredNoteId(null);
        setHoverAnchor(null);
      },
    });
  };  const sendNoteReply = () => {
    if (!replyingNote || replyNoteMutation.isPending) return;
    const text = replyText.trim();
    if (!text) return;
    setReplyError(null);
    replyNoteMutation.mutate(
      { noteId: replyingNote.id, text },
      {
        onSuccess: (res) => {
          const conversationId = res?.data?.conversationId;
          closeNoteReply();
          if (conversationId) handleNoteReplied(conversationId);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Gagal membalas catatan";
          setReplyError(msg);
        },
      },
    );
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || sendMessageMutation.isPending) return;
    if (dmRecording || dmSendingVoice) return;
    const text = messageText.trim();
    const att = attachment?.ready && attachment.uploadedUrl ? attachment : null;
    if (!text && !att) return;
    try {
      // File/gambar dikirim sebagai pesan sendiri (kotak terpisah).
      // Kalau ada ketikan tambahan, dikirim setelahnya sebagai pesan teks.
      if (att) {
        const isImage = att.kind === "image";
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConversation,
          text: isImage ? IMAGE_SHARE_DEFAULT_TEXT : FILE_SHARE_DEFAULT_TEXT,
          replyToId: replyTo?.id ?? null,
          fileUrl: att.uploadedUrl,
          fileName: att.uploadedName,
          fileSize: att.uploadedSize,
          fileType: isImage ? "image" : getFileExt(att.uploadedName),
        });
      }
      if (text) {
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConversation,
          text,
          replyToId: replyTo?.id ?? null,
        });
      }
      setMessageText("");
      setReplyTo(null);
      if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
      setAttachment(null);
      setEmojiOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Gagal mengirim pesan";
      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2000, showConfirmButton: false });
    }
  };

  // Kirim VN DM: upload dulu ke /upload/file, lalu kirim audioUrl + durasi.
  // Alur sama kayak owner saluran kirim VN.
  const handleSendDmVoice = async (blob: Blob, secs: number) => {
    if (!selectedConversation || dmSendingVoice) return;
    const replyId = replyTo?.id ?? null;
    setDmRecording(false);
    setDmSendingVoice(true);
    try {
      const url = await uploadChatVoice(blob);
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation,
        text: VOICE_SHARE_DEFAULT_TEXT,
        replyToId: replyId,
        audioUrl: url,
        voiceDuration: Math.min(Math.max(1, Math.round(secs)), MAX_DM_VN_SECS),
      });
      setReplyTo(null);
      setEmojiOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message ||
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal mengirim VN";
      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
    } finally {
      setDmSendingVoice(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Batas: dokumen pdf/doc/xls/ppt/txt maks 20MB, 1 file per pesan.
  const ALLOWED_DOC_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"];
  const MAX_DOC_SIZE = 20 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = getFileExt(file.name);
    if (!ALLOWED_DOC_EXTS.includes(ext)) {
      Swal.fire({ title: "Tidak didukung", text: "Hanya file pdf, doc, xls, ppt, atau txt", icon: "warning", timer: 2200, showConfirmButton: false });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      Swal.fire({ title: "Terlalu besar", text: "Ukuran dokumen maksimal 20MB", icon: "warning", timer: 2200, showConfirmButton: false });
      e.target.value = "";
      return;
    }
    const seq = ++attachmentSeq.current;
    setAttachment({
      kind: "document",
      previewUrl: "",
      uploadedUrl: null,
      uploadedName: file.name,
      uploadedSize: file.size,
      progress: 0,
      ready: false,
      error: null,
    });
    try {
      const res = await uploadChatDocument(file, (p) => {
        if (attachmentSeq.current !== seq) return;
        setAttachment((prev) =>
          prev ? { ...prev, progress: p } : prev,
        );
      });
      if (attachmentSeq.current !== seq) return;
      setAttachment((prev) =>
        prev
          ? { ...prev, uploadedUrl: res.url, uploadedName: res.name, uploadedSize: res.size, progress: 100, ready: true }
          : prev,
      );
    } catch {
      if (attachmentSeq.current !== seq) return;
      setAttachment((prev) =>
        prev ? { ...prev, error: "Gagal mengupload dokumen" } : prev,
      );
    }
  };

  // Galeri: gambar saja (jpg/png/webp/gif), 1 gambar per pesan, maks 10MB.
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({ title: "Tidak didukung", text: "Hanya file gambar", icon: "warning", timer: 2200, showConfirmButton: false });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      Swal.fire({ title: "Terlalu besar", text: "Ukuran gambar maksimal 10MB", icon: "warning", timer: 2200, showConfirmButton: false });
      e.target.value = "";
      return;
    }
    const seq = ++attachmentSeq.current;
    const previewUrl = URL.createObjectURL(file);
    setAttachment({
      kind: "image",
      previewUrl,
      uploadedUrl: null,
      uploadedName: file.name,
      uploadedSize: file.size,
      progress: 0,
      ready: false,
      error: null,
    });
    try {
      const url = await uploadToCloudinary(file, (p) => {
        if (attachmentSeq.current !== seq) return;
        setAttachment((prev) =>
          prev ? { ...prev, progress: p } : prev,
        );
      });
      if (attachmentSeq.current !== seq) return;
      setAttachment((prev) =>
        prev ? { ...prev, uploadedUrl: url, progress: 100, ready: true } : prev,
      );
    } catch {
      if (attachmentSeq.current !== seq) return;
      setAttachment((prev) =>
        prev ? { ...prev, error: "Gagal mengupload gambar" } : prev,
      );
    }
  };

  // Lagu Catatan ikut kesetel berulang selama kotaknya kebuka (tanpa play/pause).
  const hoverAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (hoveredNote?.type === "music" && hoveredNote.musicUrl) {
      hoverAudioRef.current?.play().catch(() => {});
    } else {
      hoverAudioRef.current?.pause();
    }
  }, [hoveredNote?.id]);

  useEffect(() => {
    if (replyingNote?.type === "music" && replyingNote.musicUrl) {
      replyAudioRef.current?.play().catch(() => {});
    } else {
      replyAudioRef.current?.pause();
    }
  }, [replyingNote?.id]);

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const isTeraActive = selectedConversation === TERA_CONVERSATION_ID;
  // Entri virtual Tera AI di paling atas daftar: buletan icon + nama +
  // "Mulai Percakapan" / pesan terakhir dari localStorage.
  const teraMessages = useMemo(() => {
    try {
      return loadTeraMessages(currentUserId);
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, selectedConversation, conversations.length]);
  const teraLastText =
    teraMessages.length > 0
      ? teraMessages[teraMessages.length - 1].text
      : "Mulai Percakapan";
  const showTeraRow =
    "tera ai".includes(searchQuery.toLowerCase()) ||
    "tera".includes(searchQuery.toLowerCase()) ||
    searchQuery.trim() === "";
  // Tampilan chat biasa (bukan editor catatan / panel tema / kosong):
  // wallpaper memenuhi seluruh kolom kanan, area input transparan.
  const isChatView =
    !!selectedConversation &&
    !!selectedConv &&
    !themeView &&
    ownNoteView !== "editor";

  return (
    <Box
      h="calc(100vh - 140px)"
      bg="var(--app-card)"
      borderRadius="2xl"
      shadow="md"
      border="1px solid"
      borderColor="blue.100"
      overflow="hidden"
    >
      <HStack h="full" gap={0} align="stretch">
        <NotesRail
          profileAvatar={profile?.avatar ?? null}
          profileUsername={profile?.username ?? "saya"}
          ownNoteId={ownNote?.id ?? null}
          notes={(notesData?.data ?? []) as Array<{ id: string; isOwn?: boolean; user: { avatar: string | null; username: string } }>}
          replyNoteId={replyNoteId}
          onOwnNoteClick={handleOwnNoteClick}
          onHoverNote={(noteId, anchor) => {
            cancelHideHover();
            setHoverAnchor(anchor);
            setHoveredNoteId(noteId);
          }}
          onLeaveHover={scheduleHideHover}
        />

        <ConversationSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          unreadCommunityCount={unreadCommunityCount}
          unreadChannelCount={unreadChannelCount}
          conversations={conversations}
          filteredConversations={filteredConversations}
          loadingConversations={loadingConversations}
          selectedConversation={selectedConversation}
          currentUserId={currentUserId}
          showTeraRow={showTeraRow}
          teraLastText={teraLastText}
          onSelectConversation={handleSelectConversation}
          backendCommunities={backendCommunities}
          exploreCommunities={exploreCommunities}
          communities={communities}
          selectedCommunityId={selectedCommunityId}
          communityCreateOpen={communityCreateOpen}
          joinCommunityPending={joinCommunityMutation.isPending}
          onOpenCommunity={(id) => {
            setSelectedConversation(null);
            setOwnNoteView(null);
            setCommunityCreateOpen(false);
            setSelectedCommunityId(id);
            setChannelCreateOpen(false);
            setSelectedChannelId(null);
          }}
          onJoinAndOpenCommunity={(id) => {
            joinCommunityMutation.mutate(id, {
              onSuccess: () => {
                setSelectedConversation(null);
                setOwnNoteView(null);
                setCommunityCreateOpen(false);
                setSelectedCommunityId(id);
                setChannelCreateOpen(false);
                setSelectedChannelId(null);
              },
              onError: (err: unknown) => {
                const msg =
                  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  "Gagal bergabung ke komunitas";
                Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
              },
            });
          }}
          backendChannels={backendChannels}
          exploreChannels={exploreChannels}
          selectedChannelId={selectedChannelId}
          channelCreateOpen={channelCreateOpen}
          followChannelPending={followChannelMutation.isPending}
          onOpenChannel={(id) => {
            setSelectedConversation(null);
            setOwnNoteView(null);
            setCommunityCreateOpen(false);
            setSelectedCommunityId(null);
            setChannelCreateOpen(false);
            setSelectedChannelId(id);
          }}
          onFollowAndOpenChannel={(id) => {
            followChannelMutation.mutate(id, {
              onSuccess: (res: { data?: { id?: string } }) => {
                const nid = res?.data?.id ?? id;
                setSelectedConversation(null);
                setOwnNoteView(null);
                setCommunityCreateOpen(false);
                setSelectedCommunityId(null);
                setChannelCreateOpen(false);
                setSelectedChannelId(nid);
              },
              onError: (err: unknown) => {
                const msg =
                  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  "Gagal mengikuti saluran";
                Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
              },
            });
          }}
          onCreateCommunity={() => {
            setSelectedConversation(null);
            setOwnNoteView(null);
            setSelectedCommunityId(null);
            setCommunityCreateOpen(true);
            setSelectedChannelId(null);
            setChannelCreateOpen(false);
          }}
          onCreateChannel={() => {
            setSelectedConversation(null);
            setOwnNoteView(null);
            setSelectedCommunityId(null);
            setCommunityCreateOpen(false);
            setSelectedChannelId(null);
            setChannelCreateOpen(true);
          }}
          joinedPaneH={joinedPaneH}
          setJoinedPaneH={setJoinedPaneH}
          sashDragRef={sashDragRef}
          setSelectedConversation={setSelectedConversation}
          setOwnNoteView={setOwnNoteView}
          setCommunityCreateOpen={setCommunityCreateOpen}
          setSelectedCommunityId={setSelectedCommunityId}
          setChannelCreateOpen={setChannelCreateOpen}
          setSelectedChannelId={setSelectedChannelId}
          joinCommunityMutation={joinCommunityMutation}
          followChannelMutation={followChannelMutation}
        />

        {/* KANAN: WINDOW CHAT / EDITOR CATATAN.
            Saat chat biasa, wallpaper memenuhi kolom kanan (header solid,
            pesan + input transparan) biar input terlihat mengambang. */}
        <Flex
          flex={1}
          direction="column"
          position="relative"
          bg={isChatView ? undefined : "var(--app-card)"}
          style={isChatView ? { background: activeTheme.chatBackground } : undefined}
        >
          {communityCreateOpen ? (
            <CommunityCreateView
              onClose={() => setCommunityCreateOpen(false)}
              onCreated={({ name, description, avatarUrl }) => {
                // Backend beneran (lintas-akun). Gagal -> fallback lokal.
                createBackendCommunityMutation.mutate(
                  { name, description, avatarUrl },
                  {
                    onSuccess: (res: { data: { id: string } }) => {
                      setCommunityCreateOpen(false);
                      setSelectedConversation(null);
                      setOwnNoteView(null);
                      setSelectedCommunityId(res.data.id);
                      setActiveFilter("komunitas");
                    },
                    onError: () => {
                      const now = new Date().toISOString();
                      const newcom: Community = {
                        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        name,
                        description,
                        avatarUrl,
                        ownerId: currentUserId,
                        createdAt: now,
                        messages: [],
                        members: [
                          {
                            id: currentUserId,
                            username: profile?.username ?? "saya",
                            name: profile?.name ?? profile?.username ?? "saya",
                            avatar: profile?.avatar ?? null,
                          },
                        ],
                      };
                      persistCommunities([newcom, ...communities]);
                      setCommunityCreateOpen(false);
                      setSelectedConversation(null);
                      setOwnNoteView(null);
                      setSelectedCommunityId(newcom.id);
                      setActiveFilter("komunitas");
                    },
                  },
                );
              }}
            />
          ) : channelCreateOpen ? (
            <ChannelCreateView
              onClose={() => setChannelCreateOpen(false)}
              onCreated={({ name, description, avatarUrl }) => {
                createBackendChannelMutation.mutate(
                  { name, description, avatarUrl },
                  {
                    onSuccess: (res: { data: { id: string } }) => {
                      setChannelCreateOpen(false);
                      setSelectedConversation(null);
                      setOwnNoteView(null);
                      setSelectedCommunityId(null);
                      setCommunityCreateOpen(false);
                      setSelectedChannelId(res.data.id);
                      setActiveFilter("saluran");
                    },
                    onError: (err: unknown) => {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                        "Gagal membuat saluran";
                      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                    },
                  },
                );
              }}
            />
          ) : selectedChannelId && needPreviewDetail && loadingPreviewChannel ? (
            <Flex flex={1} align="center" justify="center" bg="var(--app-card)">
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : selectedChannelId && needPreviewDetail && !loadingPreviewChannel && !previewChannel ? (
            <Flex flex={1} align="center" justify="center" bg="var(--app-card)" p={8}>
              <VStack gap={3} textAlign="center">
                <Text fontWeight="bold" color="var(--app-text)">
                  Saluran tidak tersedia
                </Text>
                <Text fontSize="sm" color="var(--app-muted)">
                  Mungkin sudah dihapus atau kamu diblokir pemiliknya.
                </Text>
                <Button size="sm" borderRadius="full" variant="outline" colorPalette="blue" onClick={() => setSelectedChannelId(null)}>
                  Kembali
                </Button>
              </VStack>
            </Flex>
          ) : selectedChannel ? (
            <ChannelChatView
              channel={{
                id: selectedChannel.id,
                name: selectedChannel.name,
                description: selectedChannel.description,
                avatarUrl: selectedChannel.avatarUrl,
                ownerId: selectedChannel.ownerId,
                followerCount: selectedChannel.followerCount,
                createdAt: typeof selectedChannel.createdAt === "string" ? selectedChannel.createdAt : new Date(selectedChannel.createdAt).toISOString(),
              }}
              messages={channelMessages.map((m) => ({
                ...m,
                createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
              }))}
              isOwner={selectedChannelIsOwner}
              isPreview={selectedChannelIsPreview}
              isFollowing={selectedChannelIsFollowing}
              unreadCount={activeChannelUnreadCount}
              firstUnreadId={activeChannelFirstUnreadId}
              onRead={() => {
                if ((activeChannelUnreadCount ?? 0) > 0) {
                  markChannelReadMutation.mutate(undefined);
                }
              }}
              onSendText={(txt) => {
                sendChannelTextMutation.mutate(txt);
              }}
              onSendVoice={(blob, secs) => {
                setSendingVoice(true);
                sendChannelVoiceMutation.mutate(
                  { blob, duration: secs },
                  {
                    onSuccess: () => setSendingVoice(false),
                    onError: (err: unknown) => {
                      setSendingVoice(false);
                      const msg =
                        (err as Error)?.message || "Gagal mengirim VN";
                      Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                    },
                  },
                );
              }}
              sendingVoice={sendingVoice || sendChannelVoiceMutation.isPending}
              onUnfollow={() => {
                unfollowChannelMutation.mutate(selectedChannel.id, {
                  onSuccess: () => setSelectedChannelId(null),
                  onError: (err: unknown) => {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                      "Gagal keluar dari saluran";
                    Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                  },
                });
              }}
              onJoin={handleJoinPreviewChannel}
              joining={joiningChannel || followChannelMutation.isPending}
              onUpdateChannel={(patch) => {
                updateChannelMutation.mutate(patch, {
                  onError: (err: unknown) => {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                      "Gagal memperbarui saluran";
                    Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                  },
                });
              }}
              conversations={conversations}
              onForwardToDM={(conversationId) => {
                const link = `${window.location.origin}/messages?channel=${encodeURIComponent(selectedChannel.id)}`;
                sendMessageMutation.mutate(
                  {
                    conversationId,
                    text: `Ikuti saluran ${selectedChannel.name}: ${link}`,
                  },
                  {
                    onSuccess: () => {
                      Swal.fire({ icon: "success", title: "Diteruskan ke chat", timer: 1500, showConfirmButton: false });
                    },
                    onError: () => {
                      Swal.fire({ icon: "error", title: "Gagal meneruskan", timer: 1800, showConfirmButton: false });
                    },
                  },
                );
              }}
            />
          ) : (() => {
            // Backend dulu (bisa dibuka member yang baru ditambahkan),
            // baru lokal legacy.
            const selectedBackend = backendCommunities.find((c) => c.id === selectedCommunityId) ?? null;
            if (selectedBackend) {
              const backendMsgs = (backendMessagesData?.data?.messages ?? []).map((m) => ({
                id: m.id,
                senderId: m.senderId ?? "",
                senderName: m.senderName,
                isMine: m.isMine ?? m.senderId === currentUserId,
                text: m.text,
                createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date(m.createdAt).toISOString(),
                isEvent: m.isEvent,
              }));
              const adapted: Community = {
                id: selectedBackend.id,
                name: selectedBackend.name,
                description: selectedBackend.description,
                avatarUrl: selectedBackend.avatarUrl,
                ownerId: selectedBackend.ownerId,
                createdAt: typeof selectedBackend.createdAt === "string" ? selectedBackend.createdAt : new Date(selectedBackend.createdAt).toISOString(),
                messages: backendMsgs,
                members: (selectedBackend.members ?? []).map((m) => ({
                  id: m.id,
                  username: m.username,
                  name: m.name,
                  avatar: m.avatar ?? null,
                  isAdmin: m.isAdmin ?? m.id === selectedBackend.ownerId,
                })),
              };
              return (
                <CommunityChatView
                  community={adapted}
                  currentUserId={currentUserId}
                  currentUsername={profile?.username ?? "saya"}
                  currentAvatar={profile?.avatar ?? null}
                  currentName={profile?.name ?? profile?.username ?? "saya"}
                  unreadCount={activeUnreadCount}
                  firstUnreadId={activeFirstUnreadId}
                  onRead={() => {
                    if ((activeUnreadCount ?? 0) > 0) {
                      markCommunityReadMutation.mutate(undefined);
                    }
                  }}
                  onSend={(txt) => {
                    sendBackendCommunityMutation.mutate(txt);
                  }}
                  onClear={() => {
                    clearBackendCommunityMutation.mutate(undefined);
                  }}
                  onLeave={() => {
                    leaveBackendCommunityMutation.mutate(selectedBackend.id, {
                      onSuccess: () => setSelectedCommunityId(null),
                    });
                  }}
                  onUpdateCommunity={(patch) => {
                    updateBackendCommunityMutation.mutate(patch);
                  }}
                  onAddMembers={(next: CommunityMember[]) => {
                    addBackendMembersMutation.mutate(
                      next.map((m) => m.id),
                      {
                        onError: (err: unknown) => {
                          const msg =
                            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                            "Gagal menambahkan anggota";
                          Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                        },
                      },
                    );
                  }}
                  onPromoteMember={(memberId: string) => {
                    promoteAdminMutation.mutate(memberId, {
                      onError: (err: unknown) => {
                        const msg =
                          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          "Gagal menaikkan admin";
                        Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                      },
                    });
                  }}
                  onRemoveMember={(memberId: string) => {
                    removeMemberMutation.mutate(memberId, {
                      onError: (err: unknown) => {
                        const msg =
                          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          "Gagal mengeluarkan anggota";
                        Swal.fire({ title: "Gagal", text: msg, icon: "error", timer: 2200, showConfirmButton: false });
                      },
                    });
                  }}
                />
              );
            }
            const selectedCommunity = communities.find((c) => c.id === selectedCommunityId) ?? null;
            if (selectedCommunity) {
              return (
                <CommunityChatView
                  community={selectedCommunity}
                  currentUserId={currentUserId}
                  currentUsername={profile?.username ?? "saya"}
                  currentAvatar={profile?.avatar ?? null}
                  currentName={profile?.name ?? profile?.username ?? "saya"}
                  onSend={(txt) => {
                    const now = new Date().toISOString();
                    persistCommunities(
                      communities.map((c) =>
                        c.id === selectedCommunity.id
                          ? {
                              ...c,
                              messages: [
                                ...c.messages,
                                {
                                  id: `m-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                  senderId: currentUserId,
                                  senderName: profile?.username ?? "saya",
                                  isMine: true,
                                  text: txt,
                                  createdAt: now,
                                },
                              ],
                            }
                          : c,
                      ),
                    );
                  }}
                  onClear={() => {
                    persistCommunities(
                      communities.map((c) => (c.id === selectedCommunity.id ? { ...c, messages: [] } : c)),
                    );
                  }}
                  onLeave={() => {
                    persistCommunities(communities.filter((c) => c.id !== selectedCommunity.id));
                    setSelectedCommunityId(null);
                  }}
                  onUpdateCommunity={(patch) => {
                    persistCommunities(
                      communities.map((c) =>
                        c.id === selectedCommunity.id ? { ...c, ...patch } : c,
                      ),
                    );
                  }}
                  onAddMembers={(next) => {
                    persistCommunities(
                      communities.map((c) => {
                        if (c.id !== selectedCommunity.id) return c;
                        const merged = [...(c.members ?? [])];
                        // Pastikan owner selalu ada (perbaiki data lama yang
                        // owner-nya sempat hilang saat tambah anggota).
                        if (!merged.some((m) => m.id === c.ownerId)) {
                          if (c.ownerId === currentUserId) {
                            merged.unshift({
                              id: currentUserId,
                              username: profile?.username ?? "saya",
                              name: profile?.name ?? profile?.username ?? "saya",
                              avatar: profile?.avatar ?? null,
                            });
                          } else {
                            const known = (selectedCommunity.members ?? []).find(
                              (m) => m.id === c.ownerId,
                            );
                            if (known) merged.unshift(known);
                          }
                        }
                        const existing = new Set(merged.map((m) => m.id));
                        for (const m of next) {
                          if (!existing.has(m.id)) {
                            existing.add(m.id);
                            merged.push(m);
                          }
                        }
                        return { ...c, members: merged };
                      }),
                    );
                  }}
                />
              );
            }
            return null;
          })() ?? (ownNoteView === "editor" ? (
            <NoteEditor
              key={ownNote?.id ?? "new"}
              initialText={ownNote?.text ?? ""}
              initialAudience={ownNote?.audience ?? "mutual"}
              initialMusic={
                ownNote?.type === "music"
                  ? {
                      title: ownNote.musicTitle ?? ownNote.text,
                      artist: ownNote.musicArtist ?? "",
                      cover: ownNote.musicCover,
                      url: ownNote.musicUrl,
                    }
                  : null
              }
              avatarSrc={profile?.avatar || ownNote?.user.avatar || "/default-avatar.jpg"}
              onClose={() => setOwnNoteView(null)}
              onDone={() => setOwnNoteView(null)}
            />
          ) : isTeraActive ? (
            <TeraChatView currentUserId={currentUserId} />
          ) : selectedConversation && selectedConv ? (
            themeView ? (
              /* ===== PANEL CHAT THEME: ganti kotak percakapan =====
                 Preview: header [back + Chat theme + refresh], bawahnya
                 baris [Theme + deskripsi | See all], grid 2x2 (4 wallpaper).
                 Full ("Themes"): header [back + Themes], grid 2x4 (8 wallpaper). */
              <Flex flex={1} direction="column" overflowY="auto">
                {/* Header panel (masuknya header). */}
                <Flex
                  p={4}
                  borderBottom="1px solid"
                  borderColor="var(--app-hover)"
                  justify="space-between"
                  align="center"
                  shadow="sm"
                  flexShrink={0}
                >
                  <HStack gap={2}>
                    <IconButton
                      aria-label={
                        themeView === "all"
                          ? "Kembali ke Chat theme"
                          : "Kembali ke percakapan"
                      }
                      variant="ghost"
                      size="sm"
                      borderRadius="full"
                      color="var(--app-muted)"
                      _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                      onClick={() =>
                        themeView === "all"
                          ? setThemeView("preview")
                          : closeThemeToChat()
                      }
                    >
                      <ArrowLeft size={20} />
                    </IconButton>
                    <Text fontWeight="bold" color="var(--app-text)" fontSize="md">
                      {themeView === "all" ? "Themes" : "Chat theme"}
                    </Text>
                  </HStack>
                  {themeView === "preview" && (
                    <IconButton
                      aria-label="Kembalikan ke wallpaper normal"
                      title="Kembalikan ke wallpaper normal"
                      variant="ghost"
                      size="sm"
                      borderRadius="full"
                      color="var(--app-muted)"
                      _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                      onClick={resetChatTheme}
                    >
                      <RefreshCw size={18} />
                    </IconButton>
                  )}
                </Flex>
                {themeView === "preview" ? (
                  <>
                    {/* Baris Theme + deskripsi | See all (buletan). */}
                    <Flex
                      px={5}
                      pt={4}
                      pb={2}
                      justify="space-between"
                      align="center"
                      gap={3}
                      flexShrink={0}
                    >
                      <VStack align="start" gap={0}>
                        <Text
                          fontWeight="semibold"
                          color="var(--app-text)"
                          fontSize="md"
                        >
                          Theme
                        </Text>
                        <Text fontSize="xs" color="var(--app-muted)">
                          The chat color and wallpaper will both change.
                        </Text>
                      </VStack>
                      <Button
                        borderRadius="full"
                        size="xs"
                        variant="outline"
                        borderColor="var(--app-border)"
                        color="var(--app-text)"
                        _hover={{ bg: "var(--app-hover)" }}
                        onClick={() => setThemeView("all")}
                        flexShrink={0}
                      >
                        See all
                      </Button>
                    </Flex>
                    {/* Preview: 2 kolom x 2 baris = 4 wallpaper. */}
                    <Flex px={5} pb={5} pt={2} wrap="wrap" gap={3}>
                      {CHAT_THEMES.slice(0, 4).map((t) => {
                        const isActive = t.id === chatThemeId;
                        return (
                          <Box
                            key={t.id}
                            w="calc(50% - 6px)"
                            cursor="pointer"
                            onClick={() => applyChatTheme(t.id)}
                          >
                            <Box
                              borderRadius="xl"
                              overflow="hidden"
                              border={isActive ? "2px solid" : "1px solid"}
                              borderColor={
                                isActive ? "blue.500" : "var(--app-border)"
                              }
                              h="120px"
                              position="relative"
                              style={{ background: t.chatBackground }}
                            >
                              {/* Mini bubble biar kelihatan selaras. */}
                              <VStack
                                gap={1.5}
                                p={2.5}
                                align="stretch"
                                h="full"
                                justify="center"
                              >
                                <Box
                                  alignSelf="flex-start"
                                  px={2.5}
                                  py={1.5}
                                  borderRadius="lg"
                                  fontSize="10px"
                                  fontWeight="medium"
                                  maxW="80%"
                                  style={{
                                    background: t.otherBg,
                                    color: t.otherText,
                                  }}
                                >
                                  Halo!
                                </Box>
                                <Box
                                  alignSelf="flex-end"
                                  px={2.5}
                                  py={1.5}
                                  borderRadius="lg"
                                  fontSize="10px"
                                  fontWeight="medium"
                                  maxW="80%"
                                  style={{
                                    background: t.meBg,
                                    color: t.meText,
                                  }}
                                >
                                  Hai juga!
                                </Box>
                              </VStack>
                              {isActive && (
                                <Box
                                  position="absolute"
                                  top={1.5}
                                  right={1.5}
                                  w="22px"
                                  h="22px"
                                  borderRadius="full"
                                  bg="blue.500"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Check size={14} color="white" />
                                </Box>
                              )}
                            </Box>
                            <Text
                              fontSize="xs"
                              fontWeight={isActive ? "bold" : "medium"}
                              color="var(--app-text)"
                              textAlign="center"
                              mt={1.5}
                            >
                              {t.name}
                            </Text>
                          </Box>
                        );
                      })}
                    </Flex>
                  </>
                ) : (
                  /* Full: 2 kolom x 4 baris = 8 wallpaper. */
                  <Flex px={5} py={4} wrap="wrap" gap={3}>
                    {CHAT_THEMES.map((t) => {
                      const isActive = t.id === chatThemeId;
                      return (
                        <Box
                          key={t.id}
                          w="calc(50% - 6px)"
                          cursor="pointer"
                          onClick={() => applyChatTheme(t.id)}
                        >
                          <Box
                            borderRadius="xl"
                            overflow="hidden"
                            border={isActive ? "2px solid" : "1px solid"}
                            borderColor={
                              isActive ? "blue.500" : "var(--app-border)"
                            }
                            h="120px"
                            position="relative"
                            style={{ background: t.chatBackground }}
                          >
                            <VStack
                              gap={1.5}
                              p={2.5}
                              align="stretch"
                              h="full"
                              justify="center"
                            >
                              <Box
                                alignSelf="flex-start"
                                px={2.5}
                                py={1.5}
                                borderRadius="lg"
                                fontSize="10px"
                                fontWeight="medium"
                                maxW="80%"
                                style={{
                                  background: t.otherBg,
                                  color: t.otherText,
                                }}
                              >
                                Halo!
                              </Box>
                              <Box
                                alignSelf="flex-end"
                                px={2.5}
                                py={1.5}
                                borderRadius="lg"
                                fontSize="10px"
                                fontWeight="medium"
                                maxW="80%"
                                style={{
                                  background: t.meBg,
                                  color: t.meText,
                                }}
                              >
                                Hai juga!
                              </Box>
                            </VStack>
                            {isActive && (
                              <Box
                                position="absolute"
                                top={1.5}
                                right={1.5}
                                w="22px"
                                h="22px"
                                borderRadius="full"
                                bg="blue.500"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Check size={14} color="white" />
                              </Box>
                            )}
                          </Box>
                          <Text
                            fontSize="xs"
                            fontWeight={isActive ? "bold" : "medium"}
                            color="var(--app-text)"
                            textAlign="center"
                            mt={1.5}
                          >
                            {t.name}
                          </Text>
                        </Box>
                      );
                    })}
                  </Flex>
                )}
              </Flex>
            ) : (
            <>
              {menuMessageId && (
                <Box
                  position="fixed"
                  inset={0}
                  zIndex={20}
                  onClick={closeMenu}
                />
              )}
              {/* Pembungkus header: relative biar kotak Find bisa nempel
                  di kanan-bawah header ala VS Code (overlay, bukan ganti header). */}
              <Box position="relative" zIndex={10}>
              <Flex
                p={4}
                bg="var(--app-card)"
                borderBottom="1px solid"
                borderColor="var(--app-hover)"
                justify="space-between"
                align="center"
                shadow="sm"
                position="relative"
              >
                <HStack gap={3}>
                  {/* Avatar: ada story -> /story/[username],
                      tidak ada -> /profile/[username] (via fallback). */}
                  <StoryAvatar
                    userId={selectedConv.otherUser.id}
                    username={selectedConv.otherUser.username}
                    avatarUrl={selectedConv.otherUser.avatar}
                    size={48}
                    fallbackHref={`/profile/${selectedConv.otherUser.username}`}
                  />
                  <VStack align="start" gap={0}>
                    <Text
                      fontWeight="bold"
                      color="var(--app-text)"
                      fontSize="md"
                      cursor="pointer"
                      title={`Lihat profil ${selectedConv.otherUser.username}`}
                      onClick={() =>
                        router.push(
                          `/profile/${encodeURIComponent(selectedConv.otherUser.username)}`,
                        )
                      }
                    >
                      {selectedConv.otherUser.name}
                    </Text>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color={
                        onlineUserIds.has(selectedConv.otherUser.id)
                          ? "green.500"
                          : "var(--app-faint)"
                      }
                    >
                      {onlineUserIds.has(selectedConv.otherUser.id)
                        ? "Online"
                        : "Offline"}
                    </Text>
                  </VStack>
                </HStack>
                {/* Titik tiga header kanan (isi menu menyusul). */}
                <Box position="relative">
                  <IconButton
                    aria-label="Menu percakapan"
                    variant="ghost"
                    size="sm"
                    borderRadius="full"
                    color="var(--app-muted)"
                    _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                    onClick={() => setHeaderMenuOpen((v) => !v)}
                  >
                    <EllipsisVertical size={20} />
                  </IconButton>
                  {headerMenuOpen && (
                    <Box
                      position="fixed"
                      inset={0}
                      zIndex={20}
                      onClick={() => setHeaderMenuOpen(false)}
                    />
                  )}
                  {/* Muncul meluncur dari atas, hilang meluncur ke atas. */}
                  <AnimatePresence>
                    {headerMenuOpen && (
                      <MotionBox
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        position="absolute"
                        top="calc(100% + 4px)"
                        right={0}
                        bg="var(--app-card)"
                        borderRadius="xl"
                        shadow="lg"
                        border="1px solid"
                        borderColor="var(--app-border)"
                        minW="190px"
                        py={2}
                        zIndex={30}
                      >
                        {/* Menu header: Search, Chat theme, Block, Clear chat.
                            Icon di kiri teks, semua mengikuti tema
                            (putih di dark mode, hitam di light mode).
                            Fungsi masing-masing menyusul. */}
                        {(
                          [
                            { label: "Search", Icon: Search },
                            { label: "Chat theme", Icon: Paintbrush },
                            { label: "Block", Icon: Ban },
                            { label: "Clear chat", Icon: Trash2 },
                          ] as const
                        ).map(({ label, Icon }) => (
                          <Flex
                            key={label}
                            px={4}
                            py={2.5}
                            gap={3}
                            align="center"
                            justify="start"
                            cursor="pointer"
                            color="var(--app-text)"
                            _hover={{ bg: "var(--app-hover)" }}
                            transition="0.15s"
                            onClick={() => handleHeaderMenuSelect(label)}
                          >
                            <Box
                              color="var(--app-text)"
                              display="flex"
                              alignItems="center"
                            >
                              <Icon size={16} />
                            </Box>
                            <Text fontSize="sm" fontWeight="medium">
                              {label}
                            </Text>
                          </Flex>
                        ))}
                      </MotionBox>
                    )}
                  </AnimatePresence>
                </Box>
              </Flex>
              {/* Kotak Find ala VS Code: overlay di kanan-bawah header.
                  Susunan: [chevron kiri][kotak input][No results / x of y][atas][bawah].
                  Semua warna pakai variabel tema (var(--app-*)) biar otomatis
                  terang di light mode (putih/abu) dan gelap di dark mode (hitam). */}
              <AnimatePresence>
                {isFinding && (
                  <MotionBox
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    position="absolute"
                    top="calc(100% + 6px)"
                    right={3}
                    zIndex={30}
                    bg="var(--app-card)"
                    color="var(--app-text)"
                    border="1px solid"
                    borderColor="var(--app-border)"
                    borderRadius="xl"
                    shadow="lg"
                    p={2}
                    w="430px"
                    maxW="calc(100% - 24px)"
                  >
                    <Flex align="center" gap={1.5}>
                      <IconButton
                        aria-label="Keluar dari pencarian"
                        variant="ghost"
                        size="sm"
                        borderRadius="full"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={closeFind}
                      >
                        <ChevronLeft size={18} />
                      </IconButton>
                      <Input
                        ref={findInputRef}
                        placeholder="Cari pesan..."
                        value={findQuery}
                        onChange={(e) => handleFindChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") closeFind();
                          else if (e.key === "Enter") {
                            e.preventDefault();
                            goToFind(e.shiftKey ? -1 : 1);
                          }
                        }}
                        fontSize="sm"
                        color="var(--app-text)"
                        bg="var(--app-input)"
                        border="1px solid"
                        borderColor="var(--app-border)"
                        borderRadius="lg"
                        px={3}
                        h="36px"
                        flex={1}
                        minW={0}
                        _placeholder={{ color: "var(--app-faint)" }}
                        _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px #60a5fa" }}
                      />
                      <Text
                        fontSize="xs"
                        color="var(--app-muted)"
                        fontWeight="medium"
                        minW="68px"
                        textAlign="center"
                        flexShrink={0}
                      >
                        {findLabel}
                      </Text>
                      <IconButton
                        aria-label="Hasil sebelumnya (ke atas)"
                        variant="ghost"
                        size="sm"
                        borderRadius="md"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => goToFind(-1)}
                        disabled={findTotal === 0}
                        opacity={findTotal === 0 ? 0.4 : 1}
                      >
                        <ChevronUp size={18} />
                      </IconButton>
                      <IconButton
                        aria-label="Hasil berikutnya (ke bawah)"
                        variant="ghost"
                        size="sm"
                        borderRadius="md"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => goToFind(1)}
                        disabled={findTotal === 0}
                        opacity={findTotal === 0 ? 0.4 : 1}
                      >
                        <ChevronDown size={18} />
                      </IconButton>
                    </Flex>
                  </MotionBox>
                )}
              </AnimatePresence>
              </Box>

              {pinnedMessage && (
                <HStack
                  px={6}
                  py={2.5}
                  bg="var(--app-hover)"
                  borderBottom="1px solid"
                  borderColor="blue.100"
                  gap={2}
                >
                  <Pin size={14} color="#2563eb" />
                  <Text
                    fontSize="xs"
                    color="blue.700"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                    flex={1}
                  >
                    <Box as="span" fontWeight="bold">
                      Pesan tersemat:
                    </Box>{" "}
                    {voicePreviewLabel(pinnedMessage)}
                  </Text>
                </HStack>
              )}

              <VStack
                flex={1}
                p={6}
                overflowY="auto"
                gap={4}
                align="stretch"
                bg="transparent"
                onScroll={() => {
                  if (menuMessageId) closeMenu();
                }}
                css={{
                  "&::-webkit-scrollbar": { width: "4px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#cbd5e1",
                    borderRadius: "10px",
                  },
                }}
              >
                {loadingMessages ? (
                  <Flex justify="center" py={8}>
                    <Spinner size="md" color="blue.500" />
                  </Flex>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showDateSeparator =
                        !prevMsg ||
                        getWIBDayKey(prevMsg.createdAt) !==
                          getWIBDayKey(msg.createdAt);
                      const dateLabel = showDateSeparator
                        ? formatDateSeparator(msg.createdAt, now)
                        : null;
                      const dateSeparator = showDateSeparator ? (
                        <Flex justify="center" my={1}>
                          <Box
                            bg="var(--app-card)"
                            border="1px solid"
                            borderColor="blue.100"
                            px={3}
                            py={1}
                            borderRadius="full"
                            shadow="sm"
                          >
                            <Text
                              fontSize="11px"
                              fontWeight="bold"
                              color="var(--app-chat-date-text)"
                            >
                              {dateLabel}
                            </Text>
                          </Box>
                        </Flex>
                      ) : null;

                      if (msg.isEvent) {
                        return (
                          <Fragment key={msg.id}>
                            {dateSeparator}
                            <Text
                              textAlign="center"
                              fontSize="xs"
                              fontWeight="medium"
                              color="var(--app-faint)"
                            >
                              {msg.text}
                            </Text>
                          </Fragment>
                        );
                      }

                      const isMe = msg.senderId === currentUserId;
                      const isPinned =
                        !!msg.pinnedUntil &&
                        parseAsUTC(msg.pinnedUntil).getTime() > Date.now();
                      const isMenuOpen = menuMessageId === msg.id;
                      // Tandai pesan yang cocok: hanya teks bubble + nama dokumen.
                      // Postingan/gambar/story/note metadata sengaja diabaikan.
                      const findQ = findQuery.trim().toLowerCase();
                      const findInfo =
                        isFinding && findQ
                          ? getFindMatchInfo(msg, findQ)
                          : { textMatch: false, docMatch: false, matched: false };
                      const isFindMatch = findInfo.matched;
                      const isTextFindMatch = findInfo.textMatch;
                      const isDocFindMatch = findInfo.docMatch;
                      const isActiveFind =
                        isFindMatch && msg.id === findActiveId;
                      // Outline oranye di bubble hanya kalau teksnya yang cocok.
                      // Kalau yang cocok nama dokumen, outline pindah ke kartu dokumen.
                      const isActiveTextFind = isActiveFind && isTextFindMatch;
                      return (
                        <Fragment key={msg.id}>
                          {dateSeparator}
                          <Flex
                            ref={(el) => {
                              if (el)
                                messageRefs.current.set(
                                  msg.id,
                                  el as unknown as HTMLDivElement,
                                );
                              else messageRefs.current.delete(msg.id);
                            }}
                            role="group"
                          justify={isMe ? "flex-end" : "flex-start"}
                          align="center"
                          gap={2}
                          scrollMarginTop="16px"
                          scrollMarginBottom="16px"
                        >
                          {isMe && (
                            <HStack
                              gap={0}
                            >
                              <IconButton
                                aria-label="Balas pesan"
                                variant="ghost"
                                size="xs"
                                borderRadius="full"
                                color="var(--app-muted)"
                                onClick={() => setReplyTo(msg)}
                              >
                                <Reply size={16} />
                              </IconButton>
                              <Box position="relative">
                              <IconButton
                                aria-label="Menu pesan"
                                variant="ghost"
                                size="xs"
                                borderRadius="full"
                                color="var(--app-muted)"
                                onClick={(e) => openMenu(e, msg.id)}
                              >
                                <EllipsisVertical size={16} />
                              </IconButton>
                              {isMenuOpen && (
                                <MessageMenu
                                  msg={msg}
                                  isMe={isMe}
                                  isPinned={isPinned}
                                  pinMode={pinMode}
                                  menuPos={menuPos}
                                  onUnsend={() => handleUnsend(msg)}
                                  onStar={() => handleStar(msg)}
                                  onPin={(minutes) => handlePin(msg, minutes)}
                                  onUnpin={() => handleUnpin(msg)}
                                  onOpenPinMode={() => setPinMode(true)}
                                  onCopy={() => handleCopy(msg)}
                                  onClose={closeMenu}
                                />
                              )}
                              </Box>
                            </HStack>
                          )}
                          <Box maxW="70%">
                            {/* Balasan story: label + media di LUAR kotak pesan,
                                rata kiri. Kotak biru/putih hanya berisi teks. */}
                            {!!msg.storyId && (
                              <VStack align={isMe ? "end" : "start"} gap={1} mb={1}>
                                <Text
                                  fontSize="11px"
                                  fontWeight="bold"
                                  color="var(--app-text)"
                                  textAlign="left"
                                >
                                  Membalas cerita {msg.storyOwnerUsername ?? ""}
                                </Text>
                                {msg.storyMediaUrl &&
                                  (msg.storyMediaType === "video" ? (
                                    <video
                                      src={msg.storyMediaUrl}
                                      muted
                                      playsInline
                                      preload="metadata"
                                      title={`Lihat story ${msg.storyOwnerUsername ?? ""}`}
                                      onClick={() => {
                                        if (msg.storyOwnerUsername) {
                                          router.push(
                                            `/story/${encodeURIComponent(msg.storyOwnerUsername)}`,
                                          );
                                        }
                                      }}
                                      style={{
                                        width: "140px",
                                        maxHeight: "180px",
                                        objectFit: "cover",
                                        display: "block",
                                        borderRadius: "12px",
                                        cursor: "pointer",
                                      }}
                                    />
                                  ) : (
                                    <Image
                                      src={msg.storyMediaUrl}
                                      alt={`Story ${msg.storyOwnerUsername ?? ""}`}
                                      title={`Lihat story ${msg.storyOwnerUsername ?? ""}`}
                                      w="140px"
                                      maxH="180px"
                                      objectFit="cover"
                                      display="block"
                                      borderRadius="lg"
                                      cursor="pointer"
                                      onClick={() => {
                                        if (msg.storyOwnerUsername) {
                                          router.push(
                                            `/story/${encodeURIComponent(msg.storyOwnerUsername)}`,
                                          );
                                        }
                                      }}
                                    />
                                  ))}
                              </VStack>
                            )}
                            {/* Balasan catatan: kotak catatan + PP avatar di ATAS
                                (di luar kotak pesan), kotak pesan balasan di bawah.
                                Kalau kedaluwarsa -> teks italic abu. */}
                            {!!msg.noteId && (
                              <NoteReplyPreview msg={msg} isMe={isMe} />
                            )}
                            {/* Kotak postingan yang dibagikan: di luar bubble,
                                pencet untuk buka kotak besar postingan. */}
                            {!!msg.postId && (
                              <PostSharePreview
                                msg={msg}
                                isMe={isMe}
                                onOpen={setSharedPostId}
                              />
                            )}
                            {/* Kotak lampiran (gambar/dokumen): di luar bubble,
                                pencet untuk buka penuh / unduh.
                                Find: gambar diabaikan, dokumen cocok via nama file. */}
                            {!!msg.fileUrl && (
                              <FileAttachmentPreview
                                msg={msg}
                                isMe={isMe}
                                findQuery={isDocFindMatch || isActiveFind ? findQuery : ""}
                                isActiveFind={isActiveFind && isDocFindMatch}
                              />
                            )}
                            {/* Bubble teks disembunyikan kalau isinya teks
                                default bagikan postingan / lampiran / VN
                                (kotaknya yang tampil). Ketikan tambahan
                                dikirim sebagai pesan terpisah.
                                Kalau dibatalkan tetap tampil "Pesan ini dibatalkan". */}
                            {(msg.isDeleted ||
                              !(
                                (msg.postId &&
                                  msg.text === POST_SHARE_DEFAULT_TEXT) ||
                                (msg.fileUrl &&
                                  (msg.text === FILE_SHARE_DEFAULT_TEXT ||
                                    msg.text === IMAGE_SHARE_DEFAULT_TEXT)) ||
                                (msg.audioUrl &&
                                  msg.text === VOICE_SHARE_DEFAULT_TEXT)
                              )) && (
                            <Box
                              bg={
                                isActiveTextFind
                                  ? isMe
                                    ? "orange.400"
                                    : "orange.100"
                                  : msg.isDeleted
                                    ? "var(--app-subtle)"
                                    : isMe
                                      ? activeTheme.meBg
                                      : activeTheme.otherBg
                              }
                              color={
                                msg.isDeleted
                                  ? "var(--app-faint)"
                                  : isActiveTextFind && !isMe
                                    ? "black"
                                    : isMe
                                      ? activeTheme.meText
                                      : activeTheme.otherText
                              }
                              p={3}
                              px={4}
                              borderRadius="2xl"
                              borderBottomRightRadius={isMe ? "0" : "2xl"}
                              borderBottomLeftRadius={!isMe ? "0" : "2xl"}
                              shadow={isActiveTextFind ? "md" : "sm"}
                              border={
                                isActiveTextFind || !isMe || msg.isDeleted
                                  ? "2px solid"
                                  : "none"
                              }
                              borderColor={
                                isActiveTextFind
                                  ? "orange.500"
                                  : isMe
                                    ? "transparent"
                                    : activeTheme.otherBorder
                              }
                              // Balasan story/catatan/postingan: lebar kotak ngikutin isi teks,
                              // bukan ngikutin media (media sudah di luar kotak).
                              w={
                                msg.storyId || msg.noteId || msg.postId
                                  ? "fit-content"
                                  : undefined
                              }
                              maxW={
                                msg.storyId || msg.noteId || msg.postId
                                  ? "full"
                                  : undefined
                              }
                              ml={
                                (msg.storyId || msg.noteId || msg.postId) && isMe
                                  ? "auto"
                                  : undefined
                              }
                            >
                              {msg.replyTo && !msg.audioUrl && (
                                <Box
                                  borderLeft="3px solid"
                                  borderColor={isMe ? "blue.200" : "blue.400"}
                                  pl={2}
                                  mb={2}
                                  overflow="hidden"
                                >
                                  <Text
                                    fontSize="10px"
                                    fontWeight="bold"
                                    color={isMe ? "blue.100" : "blue.600"}
                                  >
                                    {msg.replyTo.sender.name}
                                  </Text>
                                  <Text
                                    fontSize="xs"
                                    color={isMe ? "blue.100" : "blue.500"}
                                    overflow="hidden"
                                    textOverflow="ellipsis"
                                    whiteSpace="nowrap"
                                  >
                                    {msg.replyTo.isDeleted
                                      ? "Pesan ini dibatalkan"
                                      : voicePreviewLabel(msg.replyTo)}
                                  </Text>
                                </Box>
                              )}
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                fontStyle={msg.isDeleted ? "italic" : "normal"}
                              >
                                {msg.isDeleted
                                  ? "Pesan ini dibatalkan"
                                  : isTextFindMatch
                                    ? renderFoundText(msg.text, isActiveTextFind)
                                    : msg.text}
                              </Text>
                            </Box>
                            )}
                            {/* Bubble VN DM: jenisnya ngikutin bubble VN saluran,
                                tapi posisi tetap kiri/kanan kayak bubble biasa. */}
                            {!!msg.audioUrl && !msg.isDeleted && (
                              <VStack align={isMe ? "end" : "start"} gap={1}>
                                {msg.replyTo && (
                                  <Box
                                    borderLeft="3px solid"
                                    borderColor={isMe ? "blue.200" : "blue.400"}
                                    pl={2}
                                    overflow="hidden"
                                    maxW="280px"
                                  >
                                    <Text
                                      fontSize="10px"
                                      fontWeight="bold"
                                      color="var(--app-text)"
                                    >
                                      {msg.replyTo.sender.name}
                                    </Text>
                                    <Text
                                      fontSize="xs"
                                      color="var(--app-muted)"
                                      overflow="hidden"
                                      textOverflow="ellipsis"
                                      whiteSpace="nowrap"
                                    >
                                      {msg.replyTo.isDeleted
                                        ? "Pesan ini dibatalkan"
                                        : voicePreviewLabel(msg.replyTo)}
                                    </Text>
                                  </Box>
                                )}
                                <DMVoiceBubble
                                  url={msg.audioUrl}
                                  duration={msg.voiceDuration ?? 0}
                                  playing={dmPlayingId === msg.id}
                                  onPlay={() => setDmPlayingId(msg.id)}
                                  onPause={() => setDmPlayingId((prev) => (prev === msg.id ? null : prev))}
                                  avatarUrl={msg.sender?.avatar ?? null}
                                  avatarName={msg.sender?.username ?? msg.sender?.name ?? "VN"}
                                  createdAt={msg.createdAt}
                                />
                              </VStack>
                            )}
                            <HStack
                              gap={1}
                              mt={1}
                              justify={isMe ? "flex-end" : "flex-start"}
                            >
                              {msg.isStarred && (
                                <Star size={11} fill="#2563eb" color="#2563eb" />
                              )}
                              <Text
                                fontSize="10px"
                                color="var(--app-muted)"
                                fontWeight="bold"
                              >
                                {formatWIBTime(msg.createdAt)}
                              </Text>
                              {isMe && !msg.isDeleted && (
                                <CheckCheck
                                  size={14}
                                  color={msg.isRead ? "#2563eb" : "#94a3b8"}
                                />
                              )}
                            </HStack>
                          </Box>
                          {!isMe && (
                            <HStack
                              gap={0}
                            >
                              <IconButton
                                aria-label="Balas pesan"
                                variant="ghost"
                                size="xs"
                                borderRadius="full"
                                color="var(--app-muted)"
                                onClick={() => setReplyTo(msg)}
                              >
                                <Reply size={16} />
                              </IconButton>
                              <Box position="relative">
                              <IconButton
                                aria-label="Menu pesan"
                                variant="ghost"
                                size="xs"
                                borderRadius="full"
                                color="var(--app-muted)"
                                onClick={(e) => openMenu(e, msg.id)}
                              >
                                <EllipsisVertical size={16} />
                              </IconButton>
                              {isMenuOpen && (
                                <MessageMenu
                                  msg={msg}
                                  isMe={isMe}
                                  isPinned={isPinned}
                                  pinMode={pinMode}
                                  menuPos={menuPos}
                                  onUnsend={() => handleUnsend(msg)}
                                  onStar={() => handleStar(msg)}
                                  onPin={(minutes) => handlePin(msg, minutes)}
                                  onUnpin={() => handleUnpin(msg)}
                                  onOpenPinMode={() => setPinMode(true)}
                                  onCopy={() => handleCopy(msg)}
                                  onClose={closeMenu}
                                />
                              )}
                              </Box>
                            </HStack>
                          )}
                          </Flex>
                        </Fragment>
                      );
                    })}
                    {lastOwnMessage?.isRead && lastOwnMessage.readAt && (
                      <Flex justify="flex-end" pr={1}>
                        <Text
                          fontSize="10px"
                          color="var(--app-muted)"
                          fontWeight="medium"
                        >
                          Dilihat • {formatReadAt(lastOwnMessage.readAt, now)}
                        </Text>
                      </Flex>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </VStack>

              {/* Pembungkus input dihapus background-nya: transparan total,
                  tersisa pill "Ketik pesan..." + buletan biru yang mengambang. */}
              <Box p={4} position="relative" bg="transparent">
                {/* Popup emoji: sama seperti di komentar postingan. */}
                {emojiOpen && (
                  <>
                    <Box
                      position="fixed"
                      inset={0}
                      zIndex={40}
                      bg="transparent"
                      onClick={() => setEmojiOpen(false)}
                    />
                    <Box
                      position="absolute"
                      bottom="76px"
                      right={4}
                      zIndex={41}
                      bg="var(--app-card)"
                      borderRadius="xl"
                      boxShadow="lg"
                      border="1px solid"
                      borderColor="var(--app-border)"
                      p={3}
                      w="260px"
                    >
                      <Flex wrap="wrap" gap={1} maxH="180px" overflowY="auto">
                        {CHAT_EMOJIS.map((emoji) => (
                          <Box
                            key={emoji}
                            as="button"
                            fontSize="xl"
                            w="32px"
                            h="32px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            borderRadius="md"
                            cursor="pointer"
                            _hover={{ bg: "var(--app-subtle)" }}
                            onClick={() => setMessageText((prev) => prev + emoji)}
                          >
                            {emoji}
                          </Box>
                        ))}
                      </Flex>
                    </Box>
                  </>
                )}
                {replyTo && (
                  <Flex
                    px={4}
                    py={2}
                    mb={2}
                    bg="var(--app-hover)"
                    borderRadius="xl"
                    justify="space-between"
                    align="center"
                    gap={3}
                  >
                    <VStack align="start" gap={0} overflow="hidden">
                      <Text fontSize="xs" fontWeight="bold" color="blue.600">
                        Membalas {replyTo.sender.name}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="blue.700"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="full"
                      >
                        {replyTo.isDeleted ? "Pesan ini dibatalkan" : voicePreviewLabel(replyTo)}
                      </Text>
                    </VStack>
                    <IconButton
                      aria-label="Batal balas"
                      variant="ghost"
                      size="xs"
                      borderRadius="full"
                      color="blue.400"
                      onClick={() => setReplyTo(null)}
                    >
                      <X size={14} />
                    </IconButton>
                  </Flex>
                )}
                {/* Preview lampiran: file di kiri, nama di kanan, loading /
                    ceklis di kanannya. */}
                {attachment && (
                  <Flex
                    px={4}
                    py={2}
                    mb={2}
                    bg="var(--app-hover)"
                    borderRadius="xl"
                    align="center"
                    gap={3}
                  >
                    {attachment.kind === "image" && attachment.previewUrl ? (
                      <Box
                        w="44px"
                        h="44px"
                        borderRadius="lg"
                        overflow="hidden"
                        bg="var(--app-subtle)"
                        flexShrink={0}
                      >
                        <Image
                          src={attachment.previewUrl}
                          alt={attachment.uploadedName}
                          w="full"
                          h="full"
                          objectFit="cover"
                        />
                      </Box>
                    ) : (
                      <Box
                        w="44px"
                        h="44px"
                        borderRadius="lg"
                        bg="var(--app-card)"
                        border="1px solid"
                        borderColor="var(--app-border)"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <FileText size={20} color="#2563eb" />
                      </Box>
                    )}
                    <VStack align="start" gap={0} flex={1} minW={0}>
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        color="var(--app-text)"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="full"
                      >
                        {attachment.uploadedName}
                      </Text>
                      <Text fontSize="11px" color="var(--app-muted)">
                        {attachment.error
                          ? attachment.error
                          : attachment.ready
                            ? `Siap dikirim • ${formatFileSize(attachment.uploadedSize)}`
                            : `Mengupload... ${attachment.progress}%`}
                      </Text>
                    </VStack>
                    {attachment.error ? (
                      <Text fontSize="xs" fontWeight="bold" color="red.500">
                        Gagal
                      </Text>
                    ) : attachment.ready ? (
                      <Box
                        w="22px"
                        h="22px"
                        borderRadius="full"
                        bg="green.500"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <Check size={14} color="white" />
                      </Box>
                    ) : (
                      <Spinner size="sm" color="blue.500" />
                    )}
                    <IconButton
                      aria-label="Batalkan lampiran"
                      variant="ghost"
                      size="xs"
                      borderRadius="full"
                      color="var(--app-muted)"
                      onClick={removeAttachment}
                    >
                      <X size={14} />
                    </IconButton>
                  </Flex>
                )}
                {/* Pilihan file tersembunyi: dokumen + galeri (1 file). */}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileSelect}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageSelect}
                />
                {/* Baris kirim: kotak teks + tombol kirim bulat di luarnya.
                    Kalau lagi rekaman VN -> ganti jadi pill rekaman + tombol kirim VN.
                    Kalau teks kosong -> buletan biru jadi mic (ala saluran). */}
                {dmRecording ? (
                  <HStack gap={2} align="center">
                    <HStack
                      flex={1}
                      bg="var(--app-card)"
                      border="1px solid"
                      borderColor="var(--app-border)"
                      borderRadius="full"
                      px={3}
                      py={1}
                      gap={1}
                      minW={0}
                    >
                      <DMVoiceRecorder
                        onCancel={() => setDmRecording(false)}
                        onSend={handleSendDmVoice}
                      />
                    </HStack>
                    <IconButton
                      bg="blue.600"
                      color="white"
                      borderRadius="full"
                      w="40px"
                      h="40px"
                      flexShrink={0}
                      shadow="lg"
                      _hover={{ bg: "blue.700" }}
                      aria-label="Kirim VN"
                      loading={dmSendingVoice}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("lentera:send-dm-vn"));
                      }}
                    >
                      <Send size={18} />
                    </IconButton>
                  </HStack>
                ) : (
                <HStack gap={2} align="center">
                  <HStack
                    bg="var(--app-input)"
                    px={4}
                    py={2}
                    borderRadius="2xl"
                    gap={1}
                    border="1px solid"
                    borderColor="var(--app-border)"
                    flex={1}
                    shadow="lg"
                  >
                  {/* Field teks: input transparan tanpa kotak sendiri,
                      3 icon menempel di dalam kanan field (ala WA). */}
                  <Box position="relative" flex={1} display="flex" alignItems="center">
                    <Input
                      placeholder="Ketik pesan..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyPress}
                      fontSize="sm"
                      color="var(--app-text)"
                      fontWeight="medium"
                      disabled={sendMessageMutation.isPending}
                      flex={1}
                      bg="transparent"
                      border="none"
                      outline="none"
                      boxShadow="none"
                      px={0}
                      pr="96px"
                      _placeholder={{ color: "var(--app-faint)" }}
                      _hover={{ border: "none", boxShadow: "none" }}
                      _focus={{ border: "none", outline: "none", boxShadow: "none" }}
                    />
                    <HStack
                      position="absolute"
                      right={0}
                      top="50%"
                      transform="translateY(-50%)"
                      gap={0}
                    >
                      <IconButton
                        aria-label="Pilih emoji"
                        variant="ghost"
                        size="xs"
                        borderRadius="full"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => setEmojiOpen((v) => !v)}
                      >
                        <Smile size={18} />
                      </IconButton>
                      <IconButton
                        aria-label="Kirim file"
                        variant="ghost"
                        size="xs"
                        borderRadius="full"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!!attachment || sendMessageMutation.isPending}
                      >
                        <FileText size={18} />
                      </IconButton>
                      <IconButton
                        aria-label="Kirim gambar"
                        variant="ghost"
                        size="xs"
                        borderRadius="full"
                        color="var(--app-muted)"
                        _hover={{ bg: "var(--app-subtle)", color: "var(--app-text)" }}
                        onClick={() => imageInputRef.current?.click()}
                        disabled={!!attachment || sendMessageMutation.isPending}
                      >
                        <ImageIcon size={18} />
                      </IconButton>
                    </HStack>
                  </Box>
                  </HStack>
                  {/* Buletan biru: ada isi/lampiran -> icon kirim, kosong -> icon mic.
                      Alur mic sama kayak owner saluran VN. */}
                  {messageText.trim() || attachment?.ready ? (
                  <IconButton
                    bg="blue.600"
                    color="white"
                    borderRadius="full"
                    w="40px"
                    h="40px"
                    flexShrink={0}
                    shadow="lg"
                    _hover={{ bg: "blue.700" }}
                    aria-label="Send"
                    onClick={handleSendMessage}
                    loading={sendMessageMutation.isPending}
                    disabled={
                      (!messageText.trim() && !attachment?.ready) ||
                      (!!attachment && !attachment.ready) ||
                      sendMessageMutation.isPending
                    }
                  >
                    <Send size={18} />
                  </IconButton>
                  ) : (
                  <IconButton
                    bg="blue.600"
                    color="white"
                    borderRadius="full"
                    w="40px"
                    h="40px"
                    flexShrink={0}
                    shadow="lg"
                    _hover={{ bg: "blue.700" }}
                    aria-label="Rekam VN"
                    onClick={() => setDmRecording(true)}
                  >
                    <Mic size={18} />
                  </IconButton>
                  )}
                </HStack>
                )}
              </Box>
            </>
            )
          ) : (
            <Flex
              flex={1}
              justify="center"
              align="center"
              direction="column"
              gap={4}
            >
              <Box
                w="80px"
                h="80px"
                bg="var(--app-hover)"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Send size={32} color="var(--app-text)" />
              </Box>
              <VStack gap={1}>
                <Text color="var(--app-text)" fontWeight="bold" fontSize="lg">
                  Pilih percakapan
                </Text>
                <Text color="var(--app-text)" fontSize="sm">
                  Pilih percakapan dari daftar sebelah kiri untuk mulai mengirim pesan
                </Text>
              </VStack>
            </Flex>
          ))}
          {/* Kotak konfirmasi Clear chat: di tengah kotak percakapan.
              Overlay menutupi kolom kanan saja (absolute inset-0),
              kotak putih berisi teks + 2 tombol sejajar di kanan bawah. */}
          <AnimatePresence>
            {clearConfirmOpen && isChatView && (
              <Box
                position="absolute"
                inset={0}
                zIndex={35}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="rgba(0, 0, 0, 0.4)"
                onClick={() => {
                  if (!clearChatMutation.isPending) setClearConfirmOpen(false);
                }}
              >
                <MotionBox
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  bg="var(--app-card)"
                  borderRadius="xl"
                  shadow="xl"
                  border="1px solid"
                  borderColor="var(--app-border)"
                  p={5}
                  w="340px"
                  maxW="calc(100% - 48px)"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Text
                    fontSize="md"
                    fontWeight="medium"
                    color="var(--app-text)"
                  >
                    Yakin ingin menghapus semua chat?
                  </Text>
                  <Flex justify="flex-end" gap={2} mt={5}>
                    <Button
                      variant="ghost"
                      borderRadius="lg"
                      size="sm"
                      color="var(--app-text)"
                      _hover={{ bg: "var(--app-hover)" }}
                      onClick={() => setClearConfirmOpen(false)}
                      disabled={clearChatMutation.isPending}
                    >
                      Tidak
                    </Button>
                    <Button
                      borderRadius="lg"
                      size="sm"
                      bg="red.500"
                      color="white"
                      _hover={{ bg: "red.600" }}
                      onClick={handleConfirmClearChat}
                      loading={clearChatMutation.isPending}
                      disabled={clearChatMutation.isPending}
                    >
                      Ya, hapus
                    </Button>
                  </Flex>
                </MotionBox>
              </Box>
            )}
          </AnimatePresence>
        </Flex>
      </HStack>

      {/* Kotak Catatan akun B (hover): overlay fixed di kanan avatar,
          menutupi bagian tengah, tidak menggeser. Dipencet -> jadi kotak balasan. */}
      {hoveredNote && !replyNoteId && hoverAnchor && (
        <Box
          position="fixed"
          zIndex={60}
          w="230px"
          bg="black"
          border="1px solid"
          borderColor="blue.100"
          borderRadius="2xl"
          shadow="lg"
          p={4}
          cursor={hoveredNote.isOwn ? "default" : "pointer"}
          style={{
            top: Math.max(
              8,
              Math.min(
                hoverAnchor.top,
                (typeof window !== "undefined" ? window.innerHeight : 800) - 260,
              ),
            ),
            left: Math.min(
              hoverAnchor.left,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 246,
            ),
          }}
          onMouseEnter={cancelHideHover}
          onMouseLeave={scheduleHideHover}
          onClick={() => {
            if (!hoveredNote.isOwn) openReplyForNote(hoveredNote.id, hoverAnchor);
          }}
        >
          {hoveredNote.type === "music" && hoveredNote.musicUrl && (
            <audio ref={hoverAudioRef} src={hoveredNote.musicUrl} loop preload="auto" />
          )}
          <Flex direction="column" align="center">
            {/* Bubble nempel ke avatar (atas avatar ketutup bubble) +
                segitiga kecil tengah-bawah menyatu kayak kotak pesan. */}
            <Box position="relative" zIndex={1} mb="-12px">
            <Box
              bg="white"
              color="black"
              px={3}
              py={2}
              borderRadius="xl"
              maxW="full"
              minW="64px"
              textAlign="center"
              shadow="sm"
              border="1px solid"
              borderColor="var(--app-border)"
            >
              {hoveredNote.type === "music" ? (
                <Flex align="center" gap={1.5} justify="center">
                  <MusicPlayingIcon color="black" />
                  <Box textAlign="left" overflow="hidden">
                    <Text
                      fontSize="11px"
                      fontWeight="bold"
                      lineHeight="1.2"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      maxW="130px"
                    >
                      {hoveredNote.musicTitle || hoveredNote.text}
                    </Text>
                    {hoveredNote.musicArtist && (
                      <Text
                        fontSize="10px"
                        opacity={0.85}
                        lineHeight="1.2"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="130px"
                      >
                        {hoveredNote.musicArtist}
                      </Text>
                    )}
                  </Box>
                </Flex>
              ) : (
                <Text fontSize="11px" fontWeight="medium" lineHeight="1.3" lineClamp={4}>
                  {hoveredNote.text}
                </Text>
              )}
            </Box>
            <Box
              position="absolute"
              bottom="-5px"
              left="50%"
              transform="translateX(-50%) rotate(45deg)"
              w="10px"
              h="10px"
              bg="white"
              borderRight="1px solid"
              borderBottom="1px solid"
              borderColor="var(--app-border)"
            />
            </Box>
            <Avatar style={{ width: "60px", height: "60px" }}>
              <AvatarImage src={hoveredNote.user.avatar || "/default-avatar.jpg"} />
              <AvatarFallback>
                {hoveredNote.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Text fontSize="sm" fontWeight="bold" color="white" mt={2}>
              @{hoveredNote.user.username}
            </Text>
            {hoveredNote.isOwn && (
              <>
                <Text fontSize="11px" color="var(--app-muted)" textAlign="center" mt={1}>
                  {hoveredNote.audience === "close"
                    ? "Dibagikan kepada Teman dekat"
                    : "Dibagikan kepada pengikut yang Anda ikuti"}
                </Text>
                <Flex direction="column" gap={2} mt={3} w="full">
                  <Button
                    borderRadius="full"
                    bg="blue.600"
                    color="white"
                    fontWeight="bold"
                    size="sm"
                    _hover={{ bg: "blue.700" }}
                    onClick={() => {
                      cancelHideHover();
                      setHoveredNoteId(null);
                      setHoverAnchor(null);
                      handleOwnNoteClick();
                    }}
                  >
                    Buat Catatan Baru
                  </Button>
                  <Text
                    as="button"
                    fontSize="sm"
                    fontWeight="bold"
                    color="blue.600"
                    textAlign="center"
                    cursor="pointer"
                    bg="transparent"
                    border="none"
                    opacity={deleteOwnNoteMutation.isPending ? 0.6 : 1}
                    _hover={{ textDecoration: "underline" }}
                    onClick={handleDeleteOwnNote}
                  >
                    {deleteOwnNoteMutation.isPending ? "Menghapus..." : "Hapus Catatan"}
                  </Text>
                </Flex>
              </>
            )}
          </Flex>
        </Box>
      )}

      {/* Kotak balasan: menggantikan kotak Catatan di posisi yang sama. */}
      {replyingNote && replyAnchor && (
        <Box
          position="fixed"
          zIndex={60}
          w="230px"
          bg="black"
          border="1px solid"
          borderColor="blue.100"
          borderRadius="2xl"
          shadow="lg"
          p={4}
          style={{
            top: Math.max(
              8,
              Math.min(
                replyAnchor.top,
                (typeof window !== "undefined" ? window.innerHeight : 800) - 300,
              ),
            ),
            left: Math.min(
              replyAnchor.left,
              (typeof window !== "undefined" ? window.innerWidth : 1200) - 246,
            ),
          }}
        >
          {replyingNote.type === "music" && replyingNote.musicUrl && (
            <audio ref={replyAudioRef} src={replyingNote.musicUrl} loop preload="auto" />
          )}
          <Box
            as="button"
            aria-label="Tutup balasan"
            onClick={closeNoteReply}
            position="absolute"
            top={2}
            right={2}
            w="24px"
            h="24px"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="var(--app-muted)"
            cursor="pointer"
            _hover={{ bg: "var(--app-subtle)" }}
          >
            <X size={14} />
          </Box>
          {/* Atas: kotak isi catatan + segitiga, bawahnya pp avatar menyatu. */}
          <Flex direction="column" align="center">
            <Box position="relative" zIndex={1} mb="-12px">
              <Box
                bg="white"
                color="black"
                px={3}
                py={2}
                borderRadius="xl"
                maxW="full"
                minW="64px"
                textAlign="center"
                shadow="sm"
                border="1px solid"
                borderColor="var(--app-border)"
              >
                {replyingNote.type === "music" ? (
                  <Flex align="center" gap={1.5} justify="center">
                    <MusicPlayingIcon color="black" />
                    <Box textAlign="left" overflow="hidden">
                      <Text
                        fontSize="11px"
                        fontWeight="bold"
                        lineHeight="1.2"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        maxW="130px"
                      >
                        {replyingNote.musicTitle || replyingNote.text}
                      </Text>
                      {replyingNote.musicArtist && (
                        <Text
                          fontSize="10px"
                          opacity={0.85}
                          lineHeight="1.2"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="130px"
                        >
                          {replyingNote.musicArtist}
                        </Text>
                      )}
                    </Box>
                  </Flex>
                ) : (
                  <Text fontSize="11px" fontWeight="medium" lineHeight="1.3" lineClamp={4}>
                    {replyingNote.text}
                  </Text>
                )}
              </Box>
              <Box
                position="absolute"
                bottom="-5px"
                left="50%"
                transform="translateX(-50%) rotate(45deg)"
                w="10px"
                h="10px"
                bg="white"
                borderRight="1px solid"
                borderBottom="1px solid"
                borderColor="var(--app-border)"
              />
            </Box>
            <Avatar style={{ width: "60px", height: "60px" }}>
              <AvatarImage src={replyingNote.user.avatar || "/default-avatar.jpg"} />
              <AvatarFallback>
                {replyingNote.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Text fontSize="sm" fontWeight="bold" color="white" mt={2}>
              @{replyingNote.user.username}
            </Text>
          </Flex>
          <Flex
            align="center"
            bg="var(--app-card)"
            border="1px solid"
            borderColor="var(--app-border)"
            borderRadius="full"
            pl={4}
            pr={2}
            h="40px"
            mt={3}
            _focusWithin={{
              borderColor: "var(--app-faint)",
              boxShadow: "0 0 0 1px #d1d5db",
            }}
          >
            <Input
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value.slice(0, 500));
                if (replyError) setReplyError(null);
              }}
              placeholder={`Balas ${replyingNote.user.username}...`}
              fontSize="sm"
              color="var(--app-secondary)"
              bg="transparent"
              border="none"
              outline="none"
              p={0}
              h="full"
              flex={1}
              minW={0}
              _placeholder={{ color: "var(--app-faint)" }}
              _focus={{ border: "none", outline: "none", boxShadow: "none" }}
              disabled={replyNoteMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeNoteReply();
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendNoteReply();
                }
              }}
              autoFocus
            />
            <Box
              as="button"
              aria-label="Emoji"
              onClick={() => setShowReplyEmoji((v) => !v)}
              w="30px"
              h="30px"
              flexShrink={0}
              borderRadius="full"
              bg="transparent"
              color="var(--app-muted)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ bg: "var(--app-subtle)", color: "var(--app-secondary)" }}
            >
              <Smile size={18} />
            </Box>
          </Flex>
          {showReplyEmoji && (
            <Flex mt={2} gap={1} flexWrap="wrap" justify="center">
              {["😀", "😂", "😍", "😭", "🔥", "🎉", "❤️", "👍"].map((em) => (
                <Box
                  key={em}
                  as="button"
                  fontSize="18px"
                  p={1}
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: "var(--app-subtle)" }}
                  onClick={() => {
                    setReplyText((t) => (t + em).slice(0, 500));
                    if (replyError) setReplyError(null);
                  }}
                >
                  {em}
                </Box>
              ))}
            </Flex>
          )}
          {replyError && (
            <Text fontSize="xs" color="red.500" textAlign="center" mt={2}>
              {replyError}
            </Text>
          )}
        </Box>
      )}

      {/* Kotak besar postingan dari chat (dipencet dari kotak postingan). */}
      {sharedPostId && sharedPostData?.data && (
        <PostDetailModal
          post={sharedPostData.data}
          open={!!sharedPostId && !!sharedPostData?.data}
          onClose={() => setSharedPostId(null)}
          variant="own"
        />
      )}
    </Box>
  );
}

export default dynamic(() => Promise.resolve(MessagesPage), {
  ssr: false,
});
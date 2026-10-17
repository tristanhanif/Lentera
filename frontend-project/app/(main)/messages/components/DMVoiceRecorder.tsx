"use client";
import { useEffect, useRef, useState } from "react";
import { Box, HStack, Flex, Text, IconButton } from "@chakra-ui/react";
import { Play, Pause, Mic, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import { formatVoiceDuration } from "../channel.service";
import { MAX_DM_VN_SECS, pickDmMime } from "../utils/dm-voice";

type DMRecPhase = "recording" | "paused";

export default function DMVoiceRecorder({
  onCancel,
  onSend,
  sendEvent = "lentera:send-dm-vn",
}: {
  onCancel: () => void;
  onSend: (blob: Blob, duration: number) => void;
  sendEvent?: string;
}) {
  const [phase, setPhase] = useState<DMRecPhase>("recording");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 32 }, () => 0.2));
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqArrRef = useRef<any>(null);
  const rafRef = useRef(0);
  const accRef = useRef(0);
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef("");
  const doneRef = useRef(false);
  // Preview hasil rekaman saat jeda: play kiri = menyetel sampai titik pause,
  // mic merah = melanjutkan rekaman. Bukan sebaliknya.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewChunksLenRef = useRef(0);
  // Saat ambil mic baru (lanjutkan), cegah dobel-klik.
  const [resuming, setResuming] = useState(false);

  const stopPreview = () => {
    try {
      previewAudioRef.current?.pause();
    } catch {}
    setPreviewPlaying(false);
  };

  const revokePreview = () => {
    stopPreview();
    const url = previewUrlRef.current ?? previewUrl;
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    previewUrlRef.current = null;
    previewChunksLenRef.current = 0;
    setPreviewUrl(null);
  };

  const stopTracks = () => {
    try {
      previewAudioRef.current?.pause();
    } catch {}
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    try {
      if (audioCtxRef.current?.state !== "closed") void audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    freqArrRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Matikan mic + gelombang ala story (ketika sudah ada hasil rekaman).
  // Pause = izin browser dimatikan TOTAL (track.stop, indikator Google mati)
  // biar preview bisa disetel jelas, tidak bentrok sama mic yang masih nyala.
  // Nyalakan lagi via mic merah (getUserMedia baru).
  const setMicEnabled = (enabled: boolean) => {
    try {
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = enabled;
      });
      streamRef.current?.getVideoTracks().forEach((t) => {
        t.enabled = enabled;
      });
    } catch {}
  };

  // Matikan total izin mic ala story.stopStream(): track.stop + tutup analyser.
  // Dipakai saat jeda (pause) biar indikator Google mati.
  const killMicTracks = () => {
    try {
      streamRef.current?.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    } catch {}
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      if (audioCtxRef.current?.state !== "closed") void audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;
    freqArrRef.current = null;
  };

  const stopLevelsLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    try {
      void audioCtxRef.current?.suspend();
    } catch {}
  };

  const startLevelsLoop = () => {
    const actx = audioCtxRef.current;
    const an = analyserRef.current;
    const arr = freqArrRef.current;
    if (!actx || !an || !arr) return;
    try {
      void actx.resume();
    } catch {}
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const loop = () => {
      try {
        an.getByteFrequencyData(arr);
        const out: number[] = [];
        for (let i = 0; i < 32; i++) {
          const v = arr[Math.floor((i / 32) * arr.length)] / 255;
          out.push(Math.max(0.12, Math.min(1, v * 1.4)));
        }
        setLevels(out);
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  // Bersihkan URL preview saat komponen dilepas.
  useEffect(
    () => () => {
      const url = previewUrlRef.current;
      if (url) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
      try {
        previewAudioRef.current?.pause();
      } catch {}
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        mimeRef.current = pickDmMime();
        const rec = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recRef.current = rec;
        rec.start(250);
        startRef.current = Date.now();
        accRef.current = 0;
        timerRef.current = window.setInterval(() => {
          const st = recRef.current?.state;
          const s = Math.floor(
            st === "recording" ? accRef.current + (Date.now() - startRef.current) / 1000 : accRef.current,
          );
          setElapsed(s);
          if (s >= MAX_DM_VN_SECS) finish(true);
        }, 250);
        try {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const actx = new Ctx();
          audioCtxRef.current = actx;
          const src = actx.createMediaStreamSource(stream);
          const an = actx.createAnalyser();
          an.fftSize = 64;
          src.connect(an);
          const arr = new Uint8Array(an.frequencyBinCount);
          analyserRef.current = an;
          freqArrRef.current = arr;
          startLevelsLoop();
        } catch {}
      } catch {
        Swal.fire({ icon: "error", title: "Izin mic ditolak", text: "Aktifkan izin mikrofon dulu ya.", timer: 2200, showConfirmButton: false });
        onCancel();
      }
    })();
    return () => {
      cancelled = true;
      stopTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (send: boolean) => {
    if (doneRef.current) return;
    revokePreview();
    const rec = recRef.current;
    const live = rec?.state === "recording" && startRef.current > 0;
    const secs = Math.max(1, Math.round(accRef.current + (live ? (Date.now() - startRef.current) / 1000 : 0)));
    if (!rec || rec.state === "inactive") {
      doneRef.current = true;
      stopTracks();
      if (send && chunksRef.current.length > 0) {
        onSend(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }), Math.min(secs, MAX_DM_VN_SECS));
      } else onCancel();
      return;
    }
    doneRef.current = true;
    rec.onstop = () => {
      stopTracks();
      if (send && chunksRef.current.length > 0) {
        onSend(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }), Math.min(secs, MAX_DM_VN_SECS));
      } else onCancel();
    };
    try {
      rec.stop();
    } catch {
      stopTracks();
      onCancel();
    }
  };

  const pauseRec = () => {
    try {
      const rec = recRef.current;
      if (rec?.state === "recording") {
        accRef.current += (Date.now() - startRef.current) / 1000;
        setElapsed(Math.floor(accRef.current));
        // Flush potongan terakhir dulu biar preview lengkap.
        try {
          rec.requestData();
        } catch {}
        try {
          rec.pause();
        } catch {}
        // Masuk jeda: matikan TOTAL izin mic ala story.stopStream()
        // (indikator Google mati), gelombang berhenti. Preview bisa disetel.
        stopPreview();
        killMicTracks();
        setPhase("paused");
      }
    } catch {}
  };

  const resumeRec = async () => {
    if (resuming) return;
    try {
      const rec = recRef.current;
      // Kalau recorder lama masih paused (stream sudah mati), buang recorder lama.
      // Nanti diganti recorder baru dari stream baru. Chunk lama tetap di chunksRef.
      if (rec && rec.state === "paused") {
        try {
          rec.ondataavailable = null;
        } catch {}
        try {
          rec.stop();
        } catch {}
        recRef.current = null;
      } else if (rec && rec.state === "recording") {
        return;
      }
      // Lanjutkan VN via mic merah: ambil izin mic baru (indikator nyala lagi).
      revokePreview();
      setResuming(true);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        Swal.fire({ icon: "error", title: "Izin mic ditolak", text: "Aktifkan izin mikrofon dulu ya.", timer: 2200, showConfirmButton: false });
        setResuming(false);
        return;
      }
      if (doneRef.current) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        setResuming(false);
        return;
      }
      streamRef.current = stream;
      if (!mimeRef.current) mimeRef.current = pickDmMime();
      const next = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
      next.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recRef.current = next;
      // Analyser baru untuk gelombang (mic nyala lagi).
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new Ctx();
        try {
          await actx.resume();
        } catch {}
        audioCtxRef.current = actx;
        const src = actx.createMediaStreamSource(stream);
        const an = actx.createAnalyser();
        an.fftSize = 64;
        src.connect(an);
        const arr = new Uint8Array(an.frequencyBinCount);
        analyserRef.current = an;
        freqArrRef.current = arr;
        startLevelsLoop();
      } catch {}
      next.start(250);
      startRef.current = Date.now();
      setPhase("recording");
      setResuming(false);
    } catch {
      setResuming(false);
    }
  };

  // Play kiri saat jeda = menyetel hasil rekaman sampai titik pause (preview).
  // Bukan melanjutkan rekaman. Melanjutkan hanya via buletan merah mic.
  const togglePreview = () => {
    try {
      const audio = previewAudioRef.current;
      if (!audio) return;
      if (previewPlaying) {
        audio.pause();
        setPreviewPlaying(false);
        return;
      }
      if (chunksRef.current.length === 0) {
        Swal.fire({ icon: "warning", title: "Belum ada suara", text: "Rekam dulu sebentar ya.", timer: 1500, showConfirmButton: false });
        return;
      }
      const curLen = chunksRef.current.length;
      // Pakai ulang URL hanya kalau potongan belum berubah
      // (belum ada lanjutan rekaman baru setelah preview dibuat).
      if (previewUrl && previewChunksLenRef.current === curLen) {
        audio.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
        return;
      }
      // Bikin URL fresh dari potongan sampai titik pause.
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {}
      }
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      previewChunksLenRef.current = curLen;
      setPreviewUrl(url);
      setTimeout(() => {
        const a = previewAudioRef.current;
        if (a) {
          try {
            (a as HTMLAudioElement).src = url;
          } catch {}
          a.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
        }
      }, 30);
    } catch {}
  };

  const discard = () => {
    doneRef.current = true;
    revokePreview();
    try {
      recRef.current?.stop();
    } catch {}
    stopTracks();
    onCancel();
  };

  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const h = () => finishRef.current(true);
    window.addEventListener(sendEvent, h);
    return () => window.removeEventListener(sendEvent, h);
  }, [sendEvent]);

  return (
    <HStack flex={1} gap={2} align="center" minW={0}>
      {/* Audio tersembunyi buat menyetel hasil sampai titik pause */}
      <audio
        ref={previewAudioRef}
        src={previewUrl ?? undefined}
        preload="metadata"
        onEnded={() => setPreviewPlaying(false)}
        onPause={() => setPreviewPlaying(false)}
      />
      <IconButton
        aria-label="Hapus rekaman"
        variant="ghost"
        size="sm"
        borderRadius="full"
        color="var(--app-muted)"
        _hover={{ bg: "var(--app-subtle)", color: "red.500" }}
        onClick={discard}
        flexShrink={0}
      >
        <Trash2 size={18} />
      </IconButton>
      {phase === "recording" ? (
        <Box w="10px" h="10px" borderRadius="full" bg="red.500" flexShrink={0} />
      ) : (
        <IconButton
          aria-label={previewPlaying ? "Jeda putar hasil" : "Putar hasil rekaman"}
          title={previewPlaying ? "Jeda putar" : "Setel hasil sampai pause"}
          variant="ghost"
          size="sm"
          borderRadius="full"
          color="var(--app-text)"
          _hover={{ bg: "var(--app-subtle)" }}
          onClick={togglePreview}
          flexShrink={0}
        >
          {previewPlaying ? <Pause size={18} /> : <Play size={18} />}
        </IconButton>
      )}
      {phase === "paused" && (
        <Box w="8px" h="8px" borderRadius="full" bg="green.500" flexShrink={0} />
      )}
      <Text fontSize="sm" color="var(--app-text)" fontWeight="medium" minW="38px" flexShrink={0}>
        {formatVoiceDuration(elapsed)}
      </Text>
      <Flex flex={1} minW={0} align="center" gap="2px" h="32px" overflow="hidden">
        {levels.map((lv, i) => (
          <Box
            key={i}
            w="3px"
            borderRadius="full"
            bg={phase === "paused" ? "green.500" : "red.400"}
            style={{ height: `${Math.round(lv * 100)}%`, opacity: phase === "paused" ? 0.55 : 1 }}
            flexShrink={0}
          />
        ))}
      </Flex>
      {phase === "recording" ? (
        <Box
          as="button"
          aria-label="Jeda rekaman"
          w="36px"
          h="36px"
          borderRadius="full"
          bg="red.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          flexShrink={0}
          _hover={{ bg: "red.600" }}
          onClick={pauseRec}
        >
          <Pause size={16} />
        </Box>
      ) : (
        <Box
          as="button"
          aria-label="Lanjutkan rekaman"
          title="Nyalakan mic lagi & lanjutkan"
          w="36px"
          h="36px"
          borderRadius="full"
          bg="red.500"
          color="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          cursor={resuming ? "wait" : "pointer"}
          flexShrink={0}
          opacity={resuming ? 0.6 : 1}
          _hover={{ bg: "red.600" }}
          onClick={resumeRec}
        >
          <Mic size={16} />
        </Box>
      )}
    </HStack>
  );
}

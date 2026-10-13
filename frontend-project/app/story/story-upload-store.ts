"use client";

import { useSyncExternalStore } from "react";

export type StoryUploadStatus = "idle" | "uploading" | "done" | "error";

interface StoryUploadState {
  status: StoryUploadStatus;
  progress: number;
  message: string;
}

let state: StoryUploadState = {
  status: "idle",
  progress: 0,
  message: "",
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

const setState = (next: Partial<StoryUploadState>) => {
  state = { ...state, ...next };
  emit();
};

export const startStoryUpload = (message = "Story mu sedang dalam tahap upload") => {
  setState({ status: "uploading", progress: 0, message });
};

export const setStoryUploadProgress = (progress: number, message?: string) => {
  setState({
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    ...(message ? { message } : {}),
  });
};

export const completeStoryUpload = (
  message = "Story selesai, user lain bisa melihat storynya",
) => {
  setState({ status: "done", progress: 100, message });
};

export const failStoryUpload = (message = "Gagal mengunggah story") => {
  setState({ status: "error", progress: 0, message });
};

export const resetStoryUpload = () => {
  setState({ status: "idle", progress: 0, message: "" });
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const getSnapshot = () => state;

export const useStoryUpload = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

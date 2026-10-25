import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface AudioSpectrum {
  bins: number[];
  level: number;
  peak: number;
}

const EMPTY: AudioSpectrum = { bins: new Array(64).fill(0), level: 0, peak: 0 };

let current: AudioSpectrum = EMPTY;
let unlisten: (() => void) | null = null;
let pending: Promise<void> | null = null;
let wanted = false;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

function begin() {
  wanted = true;
  void invoke('set_spectrum_active', { active: true }).catch(() => {});

  // подписка уже создаётся, второй listen не нужен
  if (pending) return;

  pending = listen<AudioSpectrum>('audio:spectrum', (event) => {
    const payload = event.payload;
    if (!payload || !Array.isArray(payload.bins)) return;
    current = {
      bins: payload.bins,
      level: payload.level ?? 0,
      peak: payload.peak ?? 0,
    };
    notify();
  }).then((off) => {
    pending = null;
    if (!wanted) {
      off();
      return;
    }
    unlisten = off;
  });
}

function end() {
  wanted = false;
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  if (current !== EMPTY) {
    current = EMPTY;
    notify();
  }
  void invoke('set_spectrum_active', { active: false }).catch(() => {});
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (listeners.size === 1) begin();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) end();
  };
}

function getSnapshot() {
  return current;
}

const noopSubscribe = () => () => {};

// enabled=false не подписывается, чтобы не гонять тики спектра без нужды
export function useAudioSpectrum(enabled = true): AudioSpectrum {
  return useSyncExternalStore(enabled ? subscribe : noopSubscribe, getSnapshot);
}

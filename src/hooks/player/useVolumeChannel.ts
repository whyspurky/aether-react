import { useEffect, useRef } from 'react';
import { invoke, Channel } from '@tauri-apps/api/core';

type Listener = (volume: number) => void;

class VolumeChannelManager {
  private channel: Channel<number> | null = null;
  private listeners = new Set<Listener>();
  private started = false;

  async start() {
    if (this.started) return;
    this.started = true;

    this.channel = new Channel<number>();
    this.channel.onmessage = (vol) => {
      this.listeners.forEach((l) => l(vol));
    };

    try {
      await invoke('start_volume_stream', { onVolume: this.channel });
    } catch (e) {
      console.error('[volume-channel] failed to start', e);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (!this.started) this.start();
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy() {
    this.channel = null;
    this.listeners.clear();
    this.started = false;
  }
}

export const volumeChannel = new VolumeChannelManager();

export function useVolumeChannel(onVolume: (v: number) => void) {
  const onVolumeRef = useRef(onVolume);
  onVolumeRef.current = onVolume;

  useEffect(() => {
    const unsub = volumeChannel.subscribe((v) => onVolumeRef.current(v));
    return unsub;
  }, []);
}
const soundEnabledKey = "bullent.soundEnabled";

type OscillatorWave = OscillatorType;

type SoundManager = {
  isEnabled: () => boolean;
  setEnabled: (nextEnabled: boolean) => void;
  unlock: () => void;
  setLetargoActive: (active: boolean) => void;
  playDash: () => void;
  playPickup: () => void;
  playPresagio: () => void;
  playDeath: () => void;
  playReplayStart: () => void;
  playReplayImpact: () => void;
  playToggle: () => void;
};

type HumNodes = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

export function createSoundManager(): SoundManager {
  let enabled = loadSoundEnabled();
  let context: AudioContext | null = null;
  let hum: HumNodes | null = null;

  function audioContext(): AudioContext | null {
    if (!enabled) return null;

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtor) return null;

    context ??= new AudioCtor();

    if (context.state === "suspended") {
      void context.resume();
    }

    return context;
  }

  function unlock(): void {
    void audioContext();
  }

  function setEnabled(nextEnabled: boolean): void {
    enabled = nextEnabled;
    saveSoundEnabled(enabled);

    if (!enabled) {
      stopLetargoHum();
      return;
    }

    unlock();
  }

  function playTone(args: {
    frequency: number;
    endFrequency?: number;
    duration: number;
    volume: number;
    type?: OscillatorWave;
    delay?: number;
  }): void {
    const ctx = audioContext();
    if (!ctx) return;

    const start = ctx.currentTime + (args.delay ?? 0);
    const end = start + args.duration;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = args.type ?? "sine";
    oscillator.frequency.setValueAtTime(args.frequency, start);

    if (args.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, args.endFrequency),
        end,
      );
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(args.volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  function playNoise(args: {
    duration: number;
    volume: number;
    filterFrequency: number;
    delay?: number;
  }): void {
    const ctx = audioContext();
    if (!ctx) return;

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * args.duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      const progress = index / frameCount;
      data[index] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 2.2);
    }

    const start = ctx.currentTime + (args.delay ?? 0);
    const end = start + args.duration;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(args.filterFrequency, start);
    filter.frequency.exponentialRampToValueAtTime(120, end);

    gain.gain.setValueAtTime(args.volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
  }

  function startLetargoHum(): void {
    if (hum) return;

    const ctx = audioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(82, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.028, ctx.currentTime + 0.08);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();

    hum = { oscillator, gain };
  }

  function stopLetargoHum(): void {
    if (!hum || !context) return;

    const end = context.currentTime + 0.12;
    hum.gain.gain.cancelScheduledValues(context.currentTime);
    hum.gain.gain.setValueAtTime(hum.gain.gain.value, context.currentTime);
    hum.gain.gain.exponentialRampToValueAtTime(0.0001, end);
    hum.oscillator.stop(end + 0.02);
    hum = null;
  }

  return {
    isEnabled() {
      return enabled;
    },

    setEnabled,
    unlock,

    setLetargoActive(active) {
      if (active && enabled) {
        startLetargoHum();
        return;
      }

      stopLetargoHum();
    },

    playDash() {
      playTone({
        frequency: 960,
        endFrequency: 260,
        duration: 0.11,
        volume: 0.055,
        type: "triangle",
      });
      playTone({
        frequency: 1440,
        endFrequency: 720,
        duration: 0.055,
        volume: 0.025,
        type: "sine",
      });
    },

    playPickup() {
      playTone({
        frequency: 660,
        duration: 0.075,
        volume: 0.045,
        type: "sine",
      });
      playTone({
        frequency: 990,
        duration: 0.12,
        volume: 0.055,
        type: "triangle",
        delay: 0.055,
      });
    },

    playPresagio() {
      playTone({
        frequency: 520,
        duration: 0.06,
        volume: 0.035,
        type: "triangle",
      });
      playTone({
        frequency: 780,
        duration: 0.075,
        volume: 0.04,
        type: "triangle",
        delay: 0.045,
      });
      playTone({
        frequency: 1170,
        duration: 0.11,
        volume: 0.035,
        type: "sine",
        delay: 0.095,
      });
    },

    playDeath() {
      playNoise({ duration: 0.2, volume: 0.08, filterFrequency: 900 });
      playTone({
        frequency: 180,
        endFrequency: 46,
        duration: 0.32,
        volume: 0.075,
        type: "sawtooth",
      });
    },

    playReplayStart() {
      playTone({
        frequency: 180,
        endFrequency: 360,
        duration: 0.16,
        volume: 0.045,
        type: "triangle",
      });
      playTone({
        frequency: 540,
        endFrequency: 420,
        duration: 0.12,
        volume: 0.03,
        type: "sine",
        delay: 0.12,
      });
    },

    playReplayImpact() {
      playNoise({ duration: 0.24, volume: 0.1, filterFrequency: 1100 });
      playTone({
        frequency: 130,
        endFrequency: 38,
        duration: 0.42,
        volume: 0.09,
        type: "sawtooth",
      });
    },

    playToggle() {
      playTone({
        frequency: enabled ? 720 : 240,
        endFrequency: enabled ? 960 : 180,
        duration: 0.09,
        volume: 0.035,
        type: "sine",
      });
    },
  };
}

function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem(soundEnabledKey) !== "false";
  } catch {
    return true;
  }
}

function saveSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(soundEnabledKey, String(enabled));
  } catch {
    // Sound preference is optional; gameplay should never depend on storage.
  }
}

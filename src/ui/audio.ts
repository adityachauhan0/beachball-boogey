import type { FeedbackEvent } from '../game/feedback';

export type AudioStatus = 'locked' | 'running' | 'suspended' | 'unavailable';
/** No delayed event playback: events are dropped until the gesture unlock completes. */
export function createGameAudio(factory: () => AudioContext = () => new AudioContext()) {
  let context: AudioContext | undefined;
  let muted = false;
  let active = false;
  let unavailable = false;
  const voices = new Set<OscillatorNode>();
  function stopVoices() {
    for (const voice of voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    voices.clear();
  }
  function unavailableAudio() { unavailable = true; stopVoices(); }
  function tone(frequency: number, end: number, duration: number, delay = 0, type: OscillatorType = 'sine') {
    if (!context || context.state !== 'running' || muted || !active || unavailable || voices.size >= 12) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = context.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.075, at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(at); oscillator.stop(at + duration + 0.01);
    } catch { unavailableAudio(); }
  }
  return {
    get muted() { return muted; },
    get voiceCount() { return voices.size; },
    get status(): AudioStatus { return unavailable ? 'unavailable' : !context ? 'locked' : context.state === 'running' ? 'running' : 'suspended'; },
    unlock() {
      active = true;
      if (unavailable) return;
      try {
        context ??= factory();
        void context.resume().then(() => {
          if (!active) void context?.suspend().catch(unavailableAudio);
        }).catch(unavailableAudio);
      } catch { unavailableAudio(); }
    },
    pause() {
      active = false; stopVoices();
      if (context && context.state !== 'closed') void context.suspend().catch(unavailableAudio);
    },
    clear: stopVoices,
    setMuted(value: boolean) { muted = value; if (muted) stopVoices(); },
    consume(event: FeedbackEvent) {
      if (event.type === 'contact') {
        if (event.quality === 'powered') { tone(120, 45, 0.18, 0, 'triangle'); tone(660, 180, 0.2); }
        else if (event.quality === 'perfect') { tone(440, 880, 0.12, 0, 'triangle'); tone(1100, 660, 0.1, 0.06); }
        else tone(170, 70, 0.09, 0, 'triangle');
      } else if (event.type === 'bounce') tone(110, 55, 0.07);
      else if (event.type === 'point') { tone(event.side === 'player' ? 660 : 330, event.side === 'player' ? 880 : 220, 0.14, 0, 'triangle'); }
      else if (event.type === 'match') {
        const notes = event.side === 'player' ? [523, 659, 784, 1046] : [440, 349, 262];
        notes.forEach((note, index) => tone(note, note, 0.18, index * 0.12, 'triangle'));
      }
    },
    dispose() { active = false; stopVoices(); if (context) void context.close().catch(() => {}); context = undefined; },
  };
}

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createGameEffects } from '../src/render/effects';
import { createGameAudio } from '../src/ui/audio';
import type { FeedbackEvent } from '../src/game/feedback';
import { characterSkin, clipForFeedback, PROVISIONAL_SKINS } from '../src/render/character-presentation';

const contact: FeedbackEvent = { sequence: 1, type: 'contact', position: { x: 0, y: 1, z: 5 }, side: 'player', quality: 'powered', flight: 1 };
function fakeAudio(failResume = false) {
  const stopped: number[] = []; let starts = 0;
  const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
  const context = {
    state: 'suspended', currentTime: 0, destination: {},
    resume() { if (failResume) return Promise.reject(new Error('denied')); this.state = 'running'; return Promise.resolve(); },
    suspend() { this.state = 'suspended'; return Promise.resolve(); },
    close() { this.state = 'closed'; return Promise.resolve(); },
    createGain() { return { gain: param, connect() {}, disconnect() {} }; },
    createOscillator() {
      const id = starts;
      return { frequency: param, type: 'sine', onended: undefined, connect() {}, disconnect() {}, start() { starts++; }, stop() { stopped.push(id); } };
    },
  };
  return { context: context as unknown as AudioContext, stopped, get starts() { return starts; } };
}

describe('presentation lifecycles', () => {
  it('maps accepted actions to authored clips without inferring contact from transforms', () => {
    expect(PROVISIONAL_SKINS).toEqual({ player: 'orange', rival: 'brown' });
    expect(characterSkin('bunny', 'orange')).toBe('bunny');
    expect(characterSkin('unknown', 'orange')).toBe('orange');
    expect(clipForFeedback({ ...contact, quality: 'regular', action: 'jump_header' })).toBe('jump_header');
    expect(clipForFeedback(contact)).toBe('bicycle_kick');
    expect(clipForFeedback(contact, true)).toBe('ground_kick');
    expect(clipForFeedback({ ...contact, side: 'rival', quality: 'regular' })).toBe('ground_kick');
    expect(clipForFeedback({ ...contact, type: 'bounce' })).toBeUndefined();
  });
  it('drops audio before unlock and while muted/paused; resume does not replay', async () => {
    const fake = fakeAudio(); const audio = createGameAudio(() => fake.context);
    audio.consume(contact); expect(fake.starts).toBe(0); expect(audio.status).toBe('locked');
    audio.setMuted(true); audio.unlock(); await Promise.resolve(); audio.consume(contact); expect(fake.starts).toBe(0);
    audio.setMuted(false); audio.consume(contact); expect(fake.starts).toBe(2);
    audio.pause(); expect(audio.voiceCount).toBe(0); expect(audio.status).toBe('suspended');
    const count = fake.starts; audio.consume(contact); expect(fake.starts).toBe(count);
    audio.unlock(); await Promise.resolve(); expect(fake.starts).toBe(count);
    audio.setMuted(true); audio.clear(); expect(audio.muted).toBe(true); audio.dispose();
  });
  it('unsupported and rejected audio leave consumption and controls usable', async () => {
    const unsupported = createGameAudio(() => { throw new Error('no audio'); }); unsupported.unlock(); unsupported.consume(contact);
    expect(unsupported.status).toBe('unavailable'); unsupported.pause(); unsupported.dispose();
    const rejected = createGameAudio(() => fakeAudio(true).context); rejected.unlock(); await Promise.resolve(); await Promise.resolve();
    expect(rejected.status).toBe('unavailable'); expect(() => rejected.consume(contact)).not.toThrow(); rejected.dispose();
  });
  it('handles a pending unlock followed by pause without resuming sounds', async () => {
    const fake = fakeAudio(); const audio = createGameAudio(() => fake.context);
    audio.unlock(); audio.pause(); await Promise.resolve();
    expect(audio.status).toBe('suspended'); audio.consume(contact); expect(fake.starts).toBe(0); audio.dispose();
  });
  it('pools contact bursts, freezes on zero time, clears at point boundaries and disposes', () => {
    const scene = new THREE.Scene(); const effects = createGameEffects(scene);
    effects.consume(contact); expect(effects.activeCount).toBe(14);
    const positions = scene.children.map(child => child.position.clone());
    effects.step(0, undefined, false); expect(scene.children.map(child => child.position)).toEqual(positions);
    for (let i = 0; i < 20; i++) effects.consume(contact);
    expect(scene.children).toHaveLength(72); expect(effects.activeCount).toBeLessThanOrEqual(72);
    effects.consume({ ...contact, type: 'point' }); expect(effects.activeCount).toBe(0);
    effects.dispose(); expect(scene.children).toHaveLength(0);
  });
  it('reduced motion suppresses trails and reduces contact particles without movement', () => {
    const scene = new THREE.Scene(); const effects = createGameEffects(scene); effects.setReducedMotion(true);
    effects.consume(contact); expect(effects.activeCount).toBe(2);
    const positions = scene.children.map(child => child.position.clone());
    effects.step(0.05, { position: contact.position, previousPosition: contact.position, velocity: {x:0,y:0,z:0}, receiver: 'rival', bounces: 0, flight: 2 }, true);
    expect(effects.activeCount).toBe(2); expect(scene.children.map(child => child.position)).toEqual(positions);
    effects.step(0.2, undefined, false); expect(effects.activeCount).toBe(0); effects.dispose();
  });
});

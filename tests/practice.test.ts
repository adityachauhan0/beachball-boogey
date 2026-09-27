import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, groundTime, type BallState } from '../src/game/ball';
import { canKick, createPractice, KICK_BUFFER, practiceLanding, stepPractice, type PracticeState } from '../src/game/practice';
import type { MovementInput } from '../src/game/movement';
import { KeyboardInput } from '../src/input';

const idle: MovementInput = { left: false, right: false, forward: false, backward: false };
const player = { x: 0, z: 2 };
const aimedShots: Array<{ name: string; input: MovementInput; x: number; z: number }> = [
  { name: 'left', input: { ...idle, left: true }, x: -3, z: -5 },
  { name: 'right', input: { ...idle, right: true }, x: 3, z: -5 },
  { name: 'deep', input: { ...idle, forward: true }, x: 0, z: -6.8 },
  { name: 'short', input: { ...idle, backward: true }, x: 0, z: -3.2 },
  { name: 'neutral', input: idle, x: 0, z: -5 },
];

function makeBall(overrides: Partial<BallState> = {}): BallState {
  const position = { x: 0, y: 1, z: 2 };
  return {
    position,
    previousPosition: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    receiver: 'player',
    bounces: 0,
    flight: 1,
    ...overrides,
  };
}

function makePractice(ball = makeBall()): PracticeState {
  const state = createPractice();
  state.time = 1;
  state.nextFeed = 10;
  state.ball = ball;
  state.feeds = 1;
  return state;
}

describe('kick practice', () => {
  it('accepts an early buffered press when the ball enters contact range before expiry', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 1, z: 4 } }));

    stepPractice(state, player, idle, true, 0.04);
    expect(state.returns).toBe(0);
    expect(state.kickUntil).toBeCloseTo(1 + KICK_BUFFER);

    state.ball!.position.z = 2.1;
    stepPractice(state, player, idle, false, 1 / 60);
    expect(state.returns).toBe(1);
    expect(state.ball!.receiver).toBe('rival');
    expect(state.kickUntil).toBe(-1);
  });

  it('expires a buffered press before a later contact becomes reachable', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 1, z: 4 } }));

    stepPractice(state, player, idle, true, KICK_BUFFER + 0.01);
    expect(state.kickUntil).toBe(-1);
    state.ball!.position.z = 2.1;
    stepPractice(state, player, idle, false, 1 / 60);

    expect(state.returns).toBe(0);
    expect(state.ball!.receiver).toBe('player');
  });

  it('keeps an early header buffered until the ball reaches header range', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 2, z: 4 } }));

    stepPractice(state, player, idle, false, 0.04, { time: state.time });
    expect(state.returns).toBe(0);
    expect(state.headerUntil).toBeCloseTo(1 + KICK_BUFFER);

    state.ball!.position.z = 2.1;
    stepPractice(state, player, idle, false, 1 / 60);
    expect(state.returns).toBe(1);
    expect(state.feedback.lastShot?.action).toBe('header');
  });

  it('does not kick from beyond the contact radius', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 1, z: 2.91 } }));

    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.returns).toBe(0);
    expect(state.ball!.receiver).toBe('player');
  });

  it('accepts contact at zero horizontal distance', () => {
    const state = makePractice(makeBall({ position: { x: player.x, y: 1, z: player.z } }));

    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.returns).toBe(1);
    expect(state.ball!.receiver).toBe('rival');
  });

  it.each(aimedShots)('aims a $name kick at its landing target and returns it legally', ({ input, x, z }) => {
    const state = makePractice();

    stepPractice(state, player, input, true, 1 / 60);
    expect(state.returns).toBe(1);
    expect(state.ball!.receiver).toBe('rival');

    const landing = practiceLanding(state)!;
    expect(landing.x).toBeCloseTo(x);
    expect(landing.y).toBeCloseTo(BALL_RADIUS);
    expect(landing.z).toBeCloseTo(z);

    stepPractice(state, player, idle, false, groundTime(state.ball!.position, state.ball!.velocity));
    expect(state.result).toBe('Returned');
  });

  it('uses an explicit continuous mouse target without changing contact rules', () => {
    const state = makePractice();
    const target = { x: 1.37, z: -4.42 };

    stepPractice(state, player, idle, true, 1 / 60, false, 0, target);

    expect(state.returns).toBe(1);
    expect(practiceLanding(state)?.x).toBeCloseTo(target.x);
    expect(practiceLanding(state)?.z).toBeCloseTo(target.z);
  });

  it.each([
    { name: 'a ball beyond the net', ball: makeBall({ position: { x: 0, y: 1, z: -0.1 } }) },
    { name: 'a ball assigned to the rival', ball: makeBall({ receiver: 'rival' }) },
    { name: 'a low ball below the contact window', ball: makeBall({ position: { x: 0, y: 0.34, z: 2 } }) },
    { name: 'a high ball above the contact window', ball: makeBall({ position: { x: 0, y: 2.81, z: 2 } }) },
  ])('rejects contact with $name', ({ ball }) => {
    const state = makePractice(ball);

    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.returns).toBe(0);
    expect(state.ball!.receiver).toBe(ball.receiver);
  });

  it('does not accept a second contact on an already contacted flight after cooldown', () => {
    const state = makePractice();
    stepPractice(state, player, idle, true, 1 / 60);
    expect(state.returns).toBe(1);

    state.time = state.cooldownUntil + 0.1;
    state.ball!.receiver = 'player';
    state.ball!.flight = state.contactedFlight;
    expect(canKick(state, player)).toBe(false);
    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.returns).toBe(1);
  });

  it('enforces contact cooldown even when the next flight identifier differs', () => {
    const state = makePractice();
    stepPractice(state, player, idle, true, 1 / 60);
    expect(state.returns).toBe(1);

    state.ball!.receiver = 'player';
    state.ball!.flight++;
    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.time).toBeLessThan(state.cooldownUntil);
    expect(state.returns).toBe(1);
  });

  it('turns held F into one kick request instead of repeated returns', () => {
    const keyboard = new KeyboardInput();
    const state = makePractice();

    keyboard.keyDown('KeyF');
    stepPractice(state, player, idle, keyboard.takeKick(), 1 / 60);
    expect(state.returns).toBe(1);

    keyboard.keyDown('KeyF', true);
    expect(keyboard.takeKick()).toBe(false);
    stepPractice(state, player, idle, keyboard.takeKick(), 1 / 60);
    expect(state.returns).toBe(1);
  });

  it('does not let movement sampling consume action edges and clears them on focus loss', () => {
    const keyboard = new KeyboardInput();
    keyboard.keyDown('KeyF');

    expect(keyboard.sample()).toEqual(idle);
    expect(keyboard.takeKick()).toBe(true);
    expect(keyboard.takeKick()).toBe(false);

    keyboard.keyDown('KeyF');
    keyboard.clear();
    expect(keyboard.takeKick()).toBe(false);
    keyboard.keyDown('KeyF', true);
    expect(keyboard.takeKick()).toBe(false);

    keyboard.keyUp('KeyF');
    keyboard.keyDown('KeyF');
    expect(keyboard.takeKick()).toBe(true);
  });

  it('accepts a header in its higher window without spending a full power meter', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 2, z: 2 } }));
    state.feedback.charge = 3;
    stepPractice(state, player, idle, false, 1 / 60, { time: state.time });
    expect(state.returns).toBe(1);
    expect(state.feedback.charge).toBe(3);
    expect(state.feedback.quality).toBe('regular');
    expect(state.feedback.lastShot?.action).toBe('header');
    expect(state.feedback.events.at(-1)?.action).toBe('header');
  });

  it('allows a perfect header at full charge without converting it to power or spending charge', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 1.2, z: 2 } }));
    state.feedback.charge = 3;
    state.feedback.timing = { flight: 1, bounce: 0, at: state.time };
    stepPractice(state, player, idle, false, 1 / 60, { time: state.time });
    expect(state.feedback.quality).toBe('perfect');
    expect(state.feedback.charge).toBe(3);
    expect(state.feedback.lastShot?.action).toBe('header');
  });

  it('accepts a jump header at raised contact height', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 2.2, z: 2 } }));
    stepPractice(state, player, idle, false, 1 / 60, { time: state.time }, 0.8);
    expect(state.returns).toBe(1);
    expect(state.feedback.lastShot?.action).toBe('jump_header');
  });

  it('accepts an aerial kick while airborne and labels it distinctly', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: 1.1, z: 2 } }));
    stepPractice(state, player, idle, true, 1 / 60, false, 0.8);
    expect(state.returns).toBe(1);
    expect(state.feedback.lastShot?.action).toBe('aerial_kick');
  });

  it('does not advance practice time or ball position on a zero-duration step', () => {
    const state = makePractice();
    const before = { ...state.ball!.position };
    const beforeTime = state.time;

    stepPractice(state, player, idle, false, 0);

    expect(state.time).toBe(beforeTime);
    expect(state.ball!.position).toEqual(before);
  });

  it('creates a clean state for reset without carrying ball, buffer, or counters forward', () => {
    const oldState = makePractice();
    oldState.returns = 5;
    oldState.kickUntil = 12;
    oldState.result = 'Net';

    const reset = createPractice();

    expect(reset.ball).toBeUndefined();
    expect(reset.time).toBe(0);
    expect(reset.nextFeed).toBeGreaterThan(0);
    expect(reset.kickUntil).toBe(-1);
    expect(reset.feeds).toBe(0);
    expect(reset.returns).toBe(0);
    expect(reset.result).toBeUndefined();
  });

  it('clears a stale kick as a completed feed is replaced with a fresh one', () => {
    const state = makePractice(makeBall());
    state.result = 'Net';
    state.nextFeed = state.time;
    state.kickUntil = state.time + 1;
    const returnsBefore = state.returns;

    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.feeds).toBe(2);
    expect(state.ball!.flight).toBe(2);
    expect(state.ball!.receiver).toBe('player');
    expect(state.kickUntil).toBe(-1);
    expect(state.returns).toBe(returnsBefore);
  });

  it('records a terminal practice event once and holds it until the next feed', () => {
    const state = makePractice(makeBall({
      position: { x: 0, y: 0.4, z: -3 },
      velocity: { x: 0, y: -10, z: 0 },
      receiver: 'rival',
    }));

    stepPractice(state, player, idle, false, 0.1);
    expect(state.result).toBe('Returned');
    const terminalMessage = state.message;
    const terminalPosition = { ...state.ball!.position };

    stepPractice(state, player, idle, true, 0.1);

    expect(state.result).toBe('Returned');
    expect(state.message).toBe(terminalMessage);
    expect(state.ball!.position).toEqual(terminalPosition);
    expect(state.feeds).toBe(1);
  });

  it('applies a kick before advancing the ball through its airborne trajectory', () => {
    const state = makePractice(makeBall({ position: { x: 0, y: BALL_RADIUS + 0.2, z: 2 } }));

    stepPractice(state, player, idle, true, 1 / 60);

    expect(state.ball!.receiver).toBe('rival');
    expect(state.ball!.position.y).toBeGreaterThan(BALL_RADIUS);
  });
});

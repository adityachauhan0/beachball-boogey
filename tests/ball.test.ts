import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  NET_HALF_DEPTH,
  NET_TOP,
  groundTime,
  landingIn,
  launchToTarget,
  predictLanding,
  positionAt,
  safeLaunch,
  stepBall,
  type BallState,
} from '../src/game/ball';
import { COURT } from '../src/game/court';

function makeBall(overrides: Partial<BallState> = {}): BallState {
  const position = { x: 0, y: 1.5, z: 3 };
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

describe('ball trajectories', () => {
  it('launches through the requested point at the requested flight time', () => {
    const start = { x: -1.25, y: 1.7, z: 4.5 };
    const target = { x: 2.2, z: -5.4 };
    const duration = 1.8;
    const velocity = launchToTarget(start, target, duration);
    const arrival = positionAt(start, velocity, duration);

    expect(arrival.x).toBeCloseTo(target.x);
    expect(arrival.y).toBeCloseTo(BALL_RADIUS);
    expect(arrival.z).toBeCloseTo(target.z);
    expect(() => launchToTarget(start, target, 0)).toThrow(/positive/);
  });

  it('predicts the same first landing point reached by the simulated trajectory', () => {
    const ball = makeBall({
      position: { x: -1, y: 2, z: 4 },
      previousPosition: { x: -1, y: 2, z: 4 },
      velocity: { x: 2, y: 3, z: -1 },
    });
    const predicted = predictLanding(ball);
    const landingSeconds = groundTime(ball.position, ball.velocity);

    expect(predicted.y).toBeCloseTo(BALL_RADIUS);
    expect(stepBall(ball, landingSeconds)).toBeUndefined();
    expect(ball.bounces).toBe(1);
    expect(ball.position.x).toBeCloseTo(predicted.x);
    expect(ball.position.y).toBeCloseTo(predicted.y);
    expect(ball.position.z).toBeCloseTo(predicted.z);
  });

  it('raises a return enough to clear both edges of the net slab from a low contact', () => {
    const start = { x: 0, y: 1.35, z: 0.8 };
    const target = { x: 1.5, z: -5.5 };
    const velocity = safeLaunch(start, target, 0.6);

    for (const z of [-NET_HALF_DEPTH - BALL_RADIUS, NET_HALF_DEPTH + BALL_RADIUS]) {
      const seconds = (z - start.z) / velocity.z;
      const height = positionAt(start, velocity, seconds).y;
      expect(height).toBeGreaterThan(NET_TOP + BALL_RADIUS);
    }
    const flightSeconds = groundTime(start, velocity);
    const landing = positionAt(start, velocity, flightSeconds);
    expect(landing.x).toBeCloseTo(target.x);
    expect(landing.y).toBeCloseTo(BALL_RADIUS);
    expect(landing.z).toBeCloseTo(target.z);
  });

  it('detects a fast low net crossing inside one simulation step', () => {
    const ball = makeBall({
      position: { x: 0, y: 1, z: 0.5 },
      previousPosition: { x: 0, y: 1, z: 0.5 },
      velocity: { x: 0, y: 0, z: -100 },
    });

    expect(stepBall(ball, 0.02)).toBe('Net');
  });

  it('detects a fast lateral entry into the net slab', () => {
    const ball = makeBall({
      position: { x: -6, y: 1, z: 0 },
      previousPosition: { x: -6, y: 1, z: 0 },
      velocity: { x: 120, y: 0, z: 0 },
    });

    expect(stepBall(ball, 0.1)).toBe('Net');
  });

  it('detects descending contact with the net after entering its slab above the tape', () => {
    const ball = makeBall({
      position: { x: 0, y: 1.7, z: 0.4 },
      previousPosition: { x: 0, y: 1.7, z: 0.4 },
      velocity: { x: 0, y: -1, z: -1 },
    });

    expect(stepBall(ball, 0.4)).toBe('Net');
  });

  it('resolves a fast ground crossing and keeps the first in-bounds bounce alive', () => {
    const ball = makeBall({
      position: { x: 0, y: 0.24, z: 3 },
      previousPosition: { x: 0, y: 0.24, z: 3 },
      velocity: { x: 0, y: -80, z: 0 },
    });

    expect(stepBall(ball, 0.02)).toBeUndefined();
    expect(ball.bounces).toBe(1);
    expect(ball.position.y).toBeGreaterThan(BALL_RADIUS);
  });

  it('adjudicates a fast first landing outside the court as out', () => {
    const ball = makeBall({
      position: { x: COURT.maxX + 0.01, y: 0.4, z: 3 },
      previousPosition: { x: COURT.maxX + 0.01, y: 0.4, z: 3 },
      velocity: { x: 0, y: -10, z: 0 },
    });

    expect(stepBall(ball, 0.1)).toBe('Out');
  });

  it('counts ball-center court lines as in and rejects points outside or on the wrong half', () => {
    expect(landingIn({ x: COURT.maxX, y: BALL_RADIUS, z: COURT.playerEndZ }, 'player')).toBe(true);
    expect(landingIn({ x: COURT.minX, y: BALL_RADIUS, z: COURT.rivalEndZ }, 'rival')).toBe(true);
    expect(landingIn({ x: COURT.maxX + 0.001, y: BALL_RADIUS, z: 4 }, 'player')).toBe(false);
    expect(landingIn({ x: 0, y: BALL_RADIUS, z: COURT.playerEndZ + 0.001 }, 'player')).toBe(false);
    expect(landingIn({ x: 0, y: BALL_RADIUS, z: -0.01 }, 'player')).toBe(false);
    expect(landingIn({ x: 0, y: BALL_RADIUS, z: 0.01 }, 'rival')).toBe(false);
  });

  it('terminates a receiving flight on its second bounce', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS, z: 4 },
      previousPosition: { x: 0, y: BALL_RADIUS, z: 4 },
      receiver: 'player',
    });

    expect(stepBall(ball, 1.21)).toBe('Second bounce');
    expect(ball.bounces).toBe(2);
  });
});

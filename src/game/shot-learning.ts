import { COURT, PLAYER_START } from './court';
import type { Vector2 } from './movement';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const SHOT_NAMES = ['centre', 'left', 'right', 'short', 'deep'] as const;
export const DIFFICULTIES = {
  easy: { safe: 0.55, explore: 0.3, width: 0.45, reaction: 1.4 },
  normal: { safe: 0.15, explore: 0.25, width: 0.65, reaction: 1 },
  hard: { safe: 0, explore: 0.15, width: 0.8, reaction: 0.7 },
} as const;
export type ShotLearning = {
  difficulty: Difficulty;
  attempts: number[];
  wins: number[];
  decisions: number;
  pending?: { arm: number; flight: number };
};

export function createShotLearning(difficulty: Difficulty = 'normal'): ShotLearning {
  return { difficulty, attempts: [0, 0, 0, 0, 0], wins: [0, 0, 0, 0, 0], decisions: 0 };
}

function randomUnit(sequence: number, salt: number): number {
  let value = Math.imul(sequence + salt, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** Epsilon-greedy Bernoulli bandit, with a neutral Beta(1,1) prior. */
export function chooseShot(state: ShotLearning, forgiving: boolean): { arm: number; target: Vector2 } {
  const config = DIFFICULTIES[state.difficulty];
  const n = ++state.decisions;
  let arm = 0;
  if (!forgiving && randomUnit(n, 19) >= config.safe) {
    if (randomUnit(n, 47) < config.explore) arm = Math.floor(randomUnit(n, 97) * 5);
    else {
      // Rotate ties so a cold start explores placements instead of sticking to centre.
      arm = n % 5;
      for (let offset = 1; offset < 5; offset++) {
        const candidate = (n + offset) % 5;
        if ((state.wins[candidate] + 1) / (state.attempts[candidate] + 2) >
          (state.wins[arm] + 1) / (state.attempts[arm] + 2)) arm = candidate;
      }
    }
  }
  const spread = (COURT.maxX - 0.3) * config.width;
  const target = { x: arm === 1 ? -spread : arm === 2 ? spread : 0,
    z: arm === 3 ? 2.8 : arm === 4 ? COURT.playerEndZ - 1 : PLAYER_START.z };
  target.x += (randomUnit(n, 131) - 0.5) * 0.4;
  return { arm, target };
}

/** Resolve only the actual outgoing rival flight, once. Serves have no pending arm. */
export function settleShot(state: ShotLearning, flight: number, playerMissed: boolean): void {
  if (!state.pending || state.pending.flight !== flight) return;
  const arm = state.pending.arm;
  state.attempts[arm] += 1;
  if (playerMissed) state.wins[arm] += 1;
  state.pending = undefined;
}

export function tacticLabel(state: ShotLearning): string {
  const samples = state.attempts.reduce((sum, n) => sum + n, 0);
  if (samples < 3) return 'Rival is learning your returns';
  let best = 0;
  for (let i = 1; i < 5; i++) {
    if ((state.wins[i] + 1) / (state.attempts[i] + 2) >
      (state.wins[best] + 1) / (state.attempts[best] + 2)) best = i;
  }
  return ['Rival favours centre shots', 'Rival is testing your left side',
    'Rival is testing your right side', 'Rival is drawing you forward',
    'Rival is targeting your backcourt'][best];
}

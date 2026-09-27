import type { MovementInput } from './game/movement';

const KEY_DIRECTIONS: Record<string, keyof MovementInput> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
};

export class KeyboardInput {
  private heldKeys = new Set<string>();
  private tappedKeys = new Set<string>();
  private kickRequest = false;
  private kickTime: number | undefined;
  private headerRequest = false;
  private headerTime: number | undefined;
  private jumpRequest = false;
  private jumpTime: number | undefined;

  keyDown(code: string, repeat = false, time?: number): boolean {
    if (code === 'Space' || code === 'KeyF' || code === 'KeyE') {
      if (!repeat && !this.heldKeys.has(code)) {
        if (code === 'Space') { this.jumpRequest = true; this.jumpTime = time; }
        if (code === 'KeyF') this.requestKick(time);
        if (code === 'KeyE') this.requestHeader(time);
      }
      this.heldKeys.add(code);
      return true;
    }
    if (!(code in KEY_DIRECTIONS)) return false;
    if (!this.heldKeys.has(code)) this.tappedKeys.add(code);
    this.heldKeys.add(code);
    return true;
  }

  requestKick(time?: number): void {
    this.kickRequest = true;
    this.kickTime = time;
  }

  requestHeader(time?: number): void {
    this.headerRequest = true;
    this.headerTime = time;
  }

  keyUp(code: string): boolean {
    const recognized = code === 'Space' || code === 'KeyF' || code === 'KeyE' || code in KEY_DIRECTIONS;
    this.heldKeys.delete(code);
    return recognized;
  }

  sample(): MovementInput {
    const active = new Set([...this.heldKeys, ...this.tappedKeys]);
    this.tappedKeys.clear();
    const pressed = (direction: keyof MovementInput) =>
      [...active].some((code) => KEY_DIRECTIONS[code] === direction);

    return {
      left: pressed('left'),
      right: pressed('right'),
      forward: pressed('forward'),
      backward: pressed('backward'),
    };
  }

  takeKick(): boolean {
    const kick = this.kickRequest;
    this.kickRequest = false;
    return kick;
  }

  takeTimedKick(time: number): false | { time: number } {
    return this.takeTimedAction('kick', time);
  }

  takeTimedHeader(time: number): false | { time: number } {
    return this.takeTimedAction('header', time);
  }

  takeTimedJump(time: number): false | { time: number } {
    return this.takeTimedAction('jump', time);
  }

  private takeTimedAction(action: 'kick' | 'header' | 'jump', time: number): false | { time: number } {
    const requestedAt = action === 'kick' ? this.kickTime ?? time : action === 'header' ? this.headerTime ?? time : this.jumpTime ?? time;
    const requested = action === 'kick' ? this.kickRequest : action === 'header' ? this.headerRequest : this.jumpRequest;
    if (action === 'kick') { this.kickRequest = false; this.kickTime = undefined; }
    else if (action === 'header') { this.headerRequest = false; this.headerTime = undefined; }
    else { this.jumpRequest = false; this.jumpTime = undefined; }
    return requested ? { time: requestedAt } : false;
  }

  clear(): void {
    this.kickTime = undefined;
    this.kickRequest = false;
    this.headerTime = undefined;
    this.headerRequest = false;
    this.jumpTime = undefined;
    this.jumpRequest = false;
    this.heldKeys.clear();
    this.tappedKeys.clear();
  }
}

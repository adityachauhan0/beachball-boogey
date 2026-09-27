import { createBackgroundMusic } from './ui/music';
import { createMenu } from './ui/menu';
import { drainFeedback, POWER_POSE_DURATION } from './game/feedback';
import { createGameEffects } from './render/effects';
import { createGameAudio } from './ui/audio';
import { COURT_BOUNDS, FIXED_STEP, PLAYER_SPEED, createPlayerState, facingLabel, interpolatePlayer, stepPlayer } from './game/movement';
import { createRally, createRivalForRally, clearRallyKick, rallyLanding, stepRally } from './game/rally';
import { RIVAL_BOUNDS, RIVAL_SPEED } from './game/opponent';
import { shotTarget } from './game/contact';
import { KeyboardInput } from './input';
import { createCourtScene, placePlayer, setPlayerFacingIndicator } from './render/scene';
import './style.css';
import './ui/menu.css';
import { createPractice, clearKick, stepPractice, practiceLanding } from './game/practice';
import { createBallVisual } from './render/ball';
import { characterSkin, createCharacterPresentation, PROVISIONAL_SKINS } from './render/character-presentation';
import { createMatch, startMatch, stepMatch } from './game/match';
import { tacticLabel, type Difficulty } from './game/shot-learning';
import { createMouseAim } from './input/mouse-aim';

type GameStatus = 'ready' | 'playing' | 'paused';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required page element: #${id}`);
  return element as T;
};

const host = byId<HTMLDivElement>('scene-root');
const app = byId<HTMLDivElement>('app');
const introPanel = byId<HTMLElement>('intro-panel');
const playButton = byId<HTMLButtonElement>('play-button');
const resetButton = byId<HTMLButtonElement>('reset-button');
const statusChip = byId<HTMLSpanElement>('status-chip');
const playLabel = byId<HTMLSpanElement>('play-label');
const panelHint = byId<HTMLSpanElement>('panel-hint');
const gameDescription = byId<HTMLParagraphElement>('game-description');
const layerTag = byId<HTMLSpanElement>('layer-tag');
const kickControlRow = byId<HTMLDivElement>('kick-control-row');
const kickActionControlRow = byId<HTMLDivElement>('kick-action-control-row');
const headerActionControlRow = byId<HTMLDivElement>('header-action-control-row');
const kickControlCopy = byId<HTMLSpanElement>('kick-control-copy');
const resetControlCopy = byId<HTMLSpanElement>('reset-control-copy');
const resetLabel = byId<HTMLSpanElement>('reset-label');
const courtModeCopy = byId<HTMLSpanElement>('court-mode-copy');
const pauseOverlay = byId<HTMLElement>('pause-overlay');
const resumeButton = byId<HTMLButtonElement>('resume-button');
const debugTelemetry = byId<HTMLElement>('dev-telemetry');
const debugStatus = byId<HTMLElement>('dev-status');
const debugPosition = byId<HTMLElement>('dev-position');
const debugFacing = byId<HTMLElement>('dev-facing');
const debugBounds = byId<HTMLElement>('dev-bounds');
const debugSpeed = byId<HTMLElement>('dev-speed');
const debugRival = byId<HTMLElement>('dev-rival');
const debugRally = byId<HTMLElement>('dev-rally');
const debugMatch = byId<HTMLElement>('dev-match');
const scoreboard = byId<HTMLElement>('scoreboard');
const scorePlayer = byId<HTMLElement>('score-player');
const scoreRival = byId<HTMLElement>('score-rival');
const serverLabel = byId<HTMLElement>('server-label');
const matchResultOverlay = byId<HTMLElement>('match-result-overlay');
const matchResultTitle = byId<HTMLHeadingElement>('match-result-title');
const matchResultCopy = byId<HTMLParagraphElement>('match-result-copy');
const rematchButton = byId<HTMLButtonElement>('rematch-button');
const difficultySelect = byId<HTMLSelectElement>('difficulty');
const difficultyControl = byId<HTMLElement>('difficulty-control');

const muteButton = byId<HTMLButtonElement>('mute-button');
const powerHud = byId<HTMLElement>('power-hud');
const powerMeter = byId<HTMLElement>('power-meter');
const powerCopy = byId<HTMLElement>('power-copy');
const timingCue = byId<HTMLElement>('timing-cue');
const court = createCourtScene(host);
const characterParams = new URLSearchParams(location.search);
const characters = createCharacterPresentation(court.playerPose, court.rivalPose, court.playerCube, court.rivalCube, {
  player: characterSkin(import.meta.env.DEV ? characterParams.get('playerSkin') : null, PROVISIONAL_SKINS.player),
  rival: characterSkin(import.meta.env.DEV ? characterParams.get('rivalSkin') : null, PROVISIONAL_SKINS.rival),
});
const effects = createGameEffects(court.scene);
const audio = createGameAudio();
const music = createBackgroundMusic(byId<HTMLButtonElement>('music-button'));
const motionButton = byId<HTMLButtonElement>('motion-button');
let reducedByPlayer = false;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function onMotionPreference() {
  const reduced = motionPreference.matches || reducedByPlayer;
  effects.setReducedMotion(reduced);
  characters.setReducedMotion(reduced);
  motionButton.setAttribute('aria-pressed', String(reduced));
  motionButton.textContent = reduced ? 'Reduced motion on' : 'Reduce motion';
  motionButton.disabled = motionPreference.matches;
}
function onMotionAction() { reducedByPlayer = !reducedByPlayer; onMotionPreference(); }
motionButton.addEventListener('click', onMotionAction);
onMotionPreference();
motionPreference.addEventListener('change', onMotionPreference);
const keyboard = new KeyboardInput();
const ballVisual = createBallVisual(court.scene);
const mouseAim = createMouseAim(court.renderer.domElement, court.camera, court.player);
type GameMode = 'match' | 'rally' | 'practice' | 'movement';
const modeParam = new URLSearchParams(location.search).get('mode');
const mode: GameMode = modeParam === 'match' || modeParam === 'practice' || modeParam === 'movement' || modeParam === 'rally'
  ? modeParam
  : new URLSearchParams(location.search).get('practice') === '0' ? 'movement' : 'match';
const matchEnabled = mode === 'match';
const practiceEnabled = mode === 'practice';
const rallyEnabled = mode === 'rally';
const movementOnly = mode === 'movement';
const practiceStatus = byId<HTMLElement>('practice-status');
const debugBall = byId<HTMLElement>('dev-ball');
let practice = createPractice();
let rally = createRally();
let match = createMatch();
let aimInput = { left: false, right: false, forward: false, backward: false };
const telemetryEnabled = import.meta.env.DEV;
if (telemetryEnabled) {
  debugTelemetry.hidden = !characterParams.has('debug');
  debugTelemetry.dataset.mode = mode;
  debugBounds.textContent = `player x ${COURT_BOUNDS.minX.toFixed(1)}…${COURT_BOUNDS.maxX.toFixed(1)} z ${COURT_BOUNDS.minZ.toFixed(1)}…${COURT_BOUNDS.maxZ.toFixed(1)} · rival z ${RIVAL_BOUNDS.minZ.toFixed(1)}…${RIVAL_BOUNDS.maxZ.toFixed(1)}`;
  debugSpeed.textContent = mode === 'rally' || matchEnabled
    ? `player ${PLAYER_SPEED.toFixed(1)} · rival ${RIVAL_SPEED.toFixed(1)} u/s`
    : `${PLAYER_SPEED.toFixed(2)} u/s`;
}

let player = createPlayerState();
let rival = createRivalForRally();
let status: GameStatus = 'ready';
let focusedOverlay: HTMLElement | undefined;
let accumulator = 0;
let previousFrame: number | undefined;
let telemetryElapsed = 0;
let animationFrameId = 0;
let performanceFrames = 0;
let performanceStarted = 0;
const maxFrameDelta = 0.1;
const maxCatchUpSteps = 5;

function applyModeCopy(): void {
  const modeTitle = mode === 'match' ? 'Match' : mode === 'rally' ? 'AI Rally' : mode === 'practice' ? 'Kick Practice' : 'Movement Playground';
  document.title = `Beach Ball Boogey — ${modeTitle}`;
  app.dataset.mode = mode;
  const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (metaDescription) metaDescription.content = mode === 'match'
    ? 'Beach Ball Boogey — play a first-to-five match against a local rival.'
    : mode === 'rally'
    ? 'Beach Ball Boogey AI rally — return the serve and play a local rival.'
    : mode === 'practice'
      ? 'Beach Ball Boogey kick practice — follow the landing cue and return each feed.'
      : 'Beach Ball Boogey movement playground — move around the court with keyboard controls.';
  layerTag.textContent = mode === 'match' ? 'MATCH PLAY' : mode === 'rally' ? 'AI RALLY' : mode === 'practice' ? 'KICK PRACTICE' : 'MOVEMENT PLAYGROUND';
  gameDescription.textContent = mode === 'match'
    ? 'Play first to five against the local rival. Aim with the mouse; left-click kicks and right-click headers. One bounce per side.'
    : mode === 'rally'
    ? 'Return the opening serve, then rally with the local rival. Aim with the mouse; left-click kicks and right-click headers. One bounce per side.'
    : mode === 'practice'
      ? 'Aim with the mouse; left-click kicks and right-click heads the ball back. One bounce is allowed.'
      : 'Move with WASD or the arrow keys; Space jumps. Ball strikes are disabled in this playground.';
  kickControlRow.hidden = false;
  kickActionControlRow.hidden = movementOnly;
  headerActionControlRow.hidden = movementOnly;
  kickControlCopy.textContent = 'Jump · stay responsive in the air';
  scoreboard.hidden = !matchEnabled;
  const resetText = mode === 'match' ? 'Reset match' : mode === 'rally' ? 'Reset rally' : mode === 'practice' ? 'Reset practice' : 'Reset movement';
  resetLabel.textContent = resetText;
  resetControlCopy.textContent = mode === 'match' ? 'Reset score and match' : mode === 'rally' ? 'Reset the rally' : mode === 'practice' ? 'Reset practice' : 'Reset player position';
  resetButton.setAttribute('aria-label', resetText);
  courtModeCopy.textContent = mode === 'match'
    ? 'First to five · one bounce per side'
    : mode === 'rally'
    ? 'One bounce per side · one return each'
    : mode === 'practice' ? 'Kick practice · one bounce' : 'Movement playground';
}

function setStatus(next: GameStatus, reason?: 'focus'): void {
  status = next;
  accumulator = 0;
  previousFrame = undefined;
  keyboard.clear();
  if (next !== 'playing') audio.pause();
  aimInput = { left: false, right: false, forward: false, backward: false };
  performanceFrames = 0;
  performanceStarted = 0;
  clearKick(practice);
  clearRallyKick(rally);
  clearRallyKick(match.rally);

  const labels: Record<GameStatus, string> = { ready: 'READY', playing: 'IN PLAY', paused: 'PAUSED' };
  statusChip.textContent = labels[status];
  statusChip.dataset.status = status;
  app.dataset.status = status;
  introPanel.dataset.status = status;
  playLabel.textContent = status === 'ready' ? 'Play' : status === 'playing' ? 'Pause' : 'Resume';
  playButton.setAttribute('aria-label', status === 'playing' ? 'Pause game' : status === 'paused' ? 'Resume game' : `Start ${mode === 'match' ? 'match' : mode === 'rally' ? 'rally' : mode === 'practice' ? 'kick practice' : 'movement playground'}`);
  pauseOverlay.hidden = status !== 'paused';

  if (status === 'ready') panelHint.textContent = mode === 'match'
    ? 'Hit Play · return the serve · first to five.'
    : mode === 'rally'
    ? 'Hit Play · return the serve · rally with the rival.'
    : mode === 'practice' ? 'Hit Play · Space jump · LMB kick · RMB header.' : 'Hit Play · move with WASD or the arrows.';
  if (status === 'playing') panelHint.textContent = movementOnly
    ? 'WASD / Arrows · SPACE jump · ESC pause'
    : 'WASD / Arrows move · MOUSE aim · LMB kick · RMB header · SPACE jump · ESC pause';
  if (status === 'paused') panelHint.textContent = reason === 'focus'
    ? 'Focus lost · ESC or Resume to continue'
    : 'ESC or Resume to continue';

  if (telemetryEnabled) {
    debugStatus.textContent = status;
    debugStatus.dataset.status = status;
  }
  updateTelemetry(true);
}

function resetPosition(): void {
  effects.clear();
  audio.clear();
  characters.reset();
  if (matchEnabled) {
    startMatch(match, player, rival);
    if (status === 'ready') match.phase = 'menu';
  } else {
    player = createPlayerState();
    rival = createRivalForRally();
  }
  rally = createRally();
  practice = createPractice();
  aimInput = { left: false, right: false, forward: false, backward: false };
  mouseAim.reset();
  keyboard.clear();
  accumulator = 0;
  previousFrame = undefined;
  telemetryElapsed = 0;
  performanceFrames = 0;
  performanceStarted = 0;
  placePlayer(court.player, player.position);
  placePlayer(court.rival, rival.position);
  setPlayerFacingIndicator(court.playerFacing, player.facing);
  updateTelemetry(true);
  if (status === 'playing') host.focus({ preventScroll: true });
}

function onPlayAction(): void {
  if (status === 'playing') {
    setStatus('paused');
  } else {
    if (matchEnabled && match.phase === 'menu') {
      match.rally.learning.difficulty = difficultySelect.value as Difficulty;
      startMatch(match, player, rival);
    }
    if (rallyEnabled && status === 'ready') rally.learning.difficulty = difficultySelect.value as Difficulty;
    audio.unlock();
    setStatus('playing');
    host.focus({ preventScroll: true });
  }
}

function onRematchAction(): void {
  if (!matchEnabled) return;
  effects.clear();
  audio.clear();
  characters.reset();
  mouseAim.reset();
  audio.unlock();
  match.rally.learning.difficulty = difficultySelect.value as Difficulty;
  startMatch(match, player, rival);
  setStatus('playing');
  host.focus({ preventScroll: true });
}

function pauseForFocusLoss(): void {
  keyboard.clear();
  if (status === 'playing') setStatus('paused', 'focus');
}

function handleKeyDown(event: KeyboardEvent): void {
  if (document.querySelector('dialog[open]')) return;
  if (event.code === 'Tab' && focusedOverlay) {
    const buttons = [...focusedOverlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
      event.preventDefault();
      buttons[event.shiftKey ? buttons.length - 1 : 0]?.focus();
    }
    return;
  }
  if (event.code === 'Escape') {
    event.preventDefault();
    if (event.repeat) return;
    if (matchEnabled && match.phase === 'match_result') return;
    if (status === 'playing') setStatus('paused');
    else if (status === 'paused') { audio.unlock(); setStatus('playing'); }
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : undefined;
  if (target?.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
  if (status !== 'playing') return;
  const liveKickPhase = matchEnabled
    ? match.phase === 'rally' && match.rally.phase === 'playing'
    : rallyEnabled ? rally.phase === 'playing' : practiceEnabled && !practice.result;
  if (event.code === 'Space' && !liveKickPhase && !movementOnly) return;
  if (keyboard.keyDown(event.code, event.repeat, matchEnabled ? match.rally.time : rallyEnabled ? rally.time : practice.time)) event.preventDefault();
}

function onControlFocus(event: FocusEvent): void {
  if ((event.target as HTMLElement)?.closest('button, a, select, dialog')) keyboard.clear();
}

function handleKeyUp(event: KeyboardEvent): void {
  const recognized = keyboard.keyUp(event.code);
  const target = event.target instanceof HTMLElement ? event.target : undefined;
  if (recognized && !target?.closest('button, a, input, select, textarea, [contenteditable="true"]')) event.preventDefault();
}

function handleVisibilityChange(): void {
  if (document.hidden) pauseForFocusLoss();
}

function liveActionTime(): number {
  return matchEnabled ? match.rally.time : rallyEnabled ? rally.time : practice.time;
}

function canRequestAction(): boolean {
  if (status !== 'playing' || movementOnly) return false;
  return matchEnabled
    ? match.phase === 'rally' && match.rally.phase === 'playing'
    : rallyEnabled ? rally.phase === 'playing' : practiceEnabled && !practice.result;
}

function handlePointerAction(event: PointerEvent): void {
  if ((event.button !== 0 && event.button !== 2) || !canRequestAction()) return;
  event.preventDefault();
  if (event.button === 0) keyboard.requestKick(liveActionTime());
  else keyboard.requestHeader(liveActionTime());
}

function handleCanvasContextMenu(event: MouseEvent): void {
  if (status === 'playing' && !movementOnly) event.preventDefault();
}

function onResumeAction(): void {
  audio.unlock();
  setStatus('playing');
  host.focus({ preventScroll: true });
}

function onMuteAction(): void {
  audio.setMuted(!audio.muted);
  muteButton.setAttribute('aria-pressed', String(audio.muted));
  muteButton.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
  muteButton.textContent = audio.muted ? 'Sound off' : 'Sound on';
}
muteButton.addEventListener('click', onMuteAction);
playButton.addEventListener('click', onPlayAction);
resumeButton.addEventListener('click', onResumeAction);
resetButton.addEventListener('click', resetPosition);
rematchButton.addEventListener('click', onRematchAction);
document.addEventListener('focusin', onControlFocus);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', pauseForFocusLoss);
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('resize', court.resize);
court.renderer.domElement.addEventListener('pointerdown', handlePointerAction);
court.renderer.domElement.addEventListener('contextmenu', handleCanvasContextMenu);

function updateTelemetry(force = false): void {
  const activeRally = matchEnabled ? match.rally : rally;
  const rallyMode = matchEnabled || rallyEnabled;
  const activeBall = rallyMode ? activeRally.ball : practiceEnabled ? practice.ball : undefined;
  const activeLanding = rallyMode ? rallyLanding(activeRally) : practiceEnabled ? practiceLanding(practice) : undefined;
  const activeResult = matchEnabled ? match.result : rallyEnabled ? rally.result : practiceEnabled ? practice.result : undefined;
  const activeContacts = rallyMode ? activeRally.contactCount : practiceEnabled ? practice.returns : 0;
  const activeWinner = matchEnabled ? match.winner ?? match.pointWinner : rallyEnabled ? rally.winner : undefined;
  const activeTime = rallyMode ? activeRally.time : practiceEnabled ? practice.time : 0;
  const activeServes = matchEnabled ? match.runServes : rallyEnabled ? rally.serves : 0;
  const totalContacts = rallyMode ? activeRally.totalContacts : activeContacts;
  const terminalResolutions = matchEnabled ? match.terminalResolutions : rallyEnabled ? rally.terminalResolutions : 0;

  scoreboard.hidden = !matchEnabled;
  difficultyControl.hidden = !rallyMode;
  difficultySelect.disabled = matchEnabled ? !['menu', 'match_result'].includes(match.phase) : status !== 'ready';
  scorePlayer.textContent = String(match.score.player);
  scoreRival.textContent = String(match.score.rival);
  serverLabel.textContent = match.phase === 'match_result' ? 'MATCH OVER' : `${match.server.toUpperCase()} SERVES`;
  matchResultOverlay.hidden = !matchEnabled || match.phase !== 'match_result' || status === 'paused';
  app.dataset.result = String(matchEnabled && match.phase === 'match_result');
  const overlay = status === 'paused' ? pauseOverlay : !matchResultOverlay.hidden ? matchResultOverlay : undefined;
  if (overlay !== focusedOverlay) {
    focusedOverlay = overlay;
    overlay?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  matchResultTitle.textContent = `${match.winner === 'player' ? 'You win' : 'Rival wins'}.`;
  matchResultCopy.textContent = `Final score · ${match.score.player}–${match.score.rival}`;

  practiceStatus.textContent = matchEnabled
    ? match.phase === 'point_result'
      ? `${match.result} · ${match.pointWinner === 'player' ? 'You win' : 'Rival wins'} the point · ${match.score.player}–${match.score.rival}`
      : match.phase === 'rally'
        ? `${activeRally.message} · ${activeRally.contactCount} contact${activeRally.contactCount === 1 ? '' : 's'}`
        : match.phase === 'ready' ? `${match.server === 'player' ? 'Your' : 'Rival'} serve · get ready` : ''
    : rallyEnabled
      ? `${rally.message}${rally.phase === 'result' ? ' · next serve shortly' : ''} · ${rally.contactCount} contact${rally.contactCount === 1 ? '' : 's'}`
      : practiceEnabled ? `${practice.message} · ${practice.returns} returns` : 'Movement playground';
  if (rallyMode && (matchEnabled ? ['ready', 'point_result'].includes(match.phase) : rally.phase === 'result')) {
    practiceStatus.textContent += ` · ${tacticLabel(activeRally.learning)}`;
  }
  if (telemetryEnabled && rallyMode) {
    debugRival.dataset.difficulty = activeRally.learning.difficulty;
    debugRival.dataset.learnedShots = String(activeRally.learning.attempts.reduce((a, b) => a + b, 0));
    debugRival.dataset.shotAttempts = activeRally.learning.attempts.join(',');
    debugRival.dataset.shotWins = activeRally.learning.wins.join(',');
  }

  if (matchEnabled) {
    debugMatch.textContent = `${match.phase} · ${match.score.player}–${match.score.rival} · ${match.server} serves · ${match.delay.toFixed(2)}s`;
    debugMatch.dataset.phase = match.phase;
    debugMatch.dataset.scorePlayer = String(match.score.player);
    debugMatch.dataset.scoreRival = String(match.score.rival);
    debugMatch.dataset.server = match.server;
    debugMatch.dataset.pointSequence = String(match.pointSequence);
    debugMatch.dataset.delay = match.delay.toFixed(3);
    debugMatch.dataset.runServes = String(match.runServes);
    debugMatch.dataset.terminalResolutions = String(match.terminalResolutions);
    debugMatch.dataset.pointWinner = match.pointWinner ?? '';
    debugMatch.dataset.winner = match.winner ?? '';
    debugMatch.dataset.result = match.result ?? '';
    debugMatch.dataset.status = status;
  }
  if (!telemetryEnabled) return;
  debugBall.textContent = activeBall
    ? `${activeBall.receiver} · flight ${activeBall.flight} · bounce ${activeBall.bounces} · ${activeBall.position.x.toFixed(2)},${activeBall.position.y.toFixed(2)},${activeBall.position.z.toFixed(2)}`
    : movementOnly ? 'disabled in movement mode' : 'waiting';
  debugBall.dataset.returns = String(practice.returns);
  debugBall.dataset.feed = String(practice.feeds);
  if (activeBall) debugBall.textContent += ` · landing ${activeLanding?.x.toFixed(1) ?? '—'}, ${activeLanding?.z.toFixed(1) ?? '—'}`;
  debugBall.dataset.receiver = activeBall?.receiver ?? '';
  debugBall.dataset.flight = String(activeBall?.flight ?? '');
  debugBall.dataset.bounce = String(activeBall?.bounces ?? '');
  debugBall.dataset.bounces = String(activeBall?.bounces ?? '');
  debugBall.dataset.x = String(activeBall?.position.x ?? '');
  debugBall.dataset.y = String(activeBall?.position.y ?? '');
  debugBall.dataset.z = String(activeBall?.position.z ?? '');
  debugBall.dataset.landingX = String(activeLanding?.x ?? '');
  debugBall.dataset.landingZ = String(activeLanding?.z ?? '');
  debugBall.dataset.contactCount = String(activeContacts);
  debugBall.dataset.serves = String(activeServes);
  debugBall.dataset.terminalResolutions = String(terminalResolutions);
  debugBall.dataset.result = activeResult ?? '';
  debugBall.dataset.winner = activeWinner ?? '';
  debugBall.dataset.time = activeTime.toFixed(3);
  const positionText = `x ${player.position.x.toFixed(2)} · z ${player.position.z.toFixed(2)}`;
  const facing = facingLabel(player.facing);
  debugPosition.textContent = positionText;
  debugPosition.dataset.x = player.position.x.toFixed(3);
  debugPosition.dataset.z = player.position.z.toFixed(3);
  debugFacing.textContent = facing;
  debugFacing.dataset.facing = facing;
  debugRival.textContent = `x ${rival.position.x.toFixed(2)} · z ${rival.position.z.toFixed(2)} · ${rallyMode ? activeRally.opponent.mode : 'stationary'}`;
  debugRival.dataset.x = rival.position.x.toFixed(3);
  debugRival.dataset.z = rival.position.z.toFixed(3);
  debugRival.dataset.state = rallyMode ? activeRally.opponent.mode : 'stationary';
  debugRival.dataset.mode = rallyMode ? activeRally.opponent.mode : 'stationary';
  debugRival.dataset.reaction = String(rallyMode ? activeRally.opponent.reactionRemaining : 0);
  debugRival.dataset.reactionRemaining = String(rallyMode ? activeRally.opponent.reactionRemaining : 0);
  debugRally.textContent = activeBall
    ? `${activeBall.receiver} · flight ${activeBall.flight} · bounce ${activeBall.bounces} · contacts ${activeContacts} · ${activeResult ?? 'in play'} · ${activeWinner ?? 'no winner'}`
    : `${matchEnabled ? match.phase : rallyEnabled ? rally.phase : mode} · contacts ${activeContacts}`;
  debugRally.dataset.receiver = activeBall?.receiver ?? '';
  debugRally.dataset.flight = String(activeBall?.flight ?? '');
  debugRally.dataset.bounces = String(activeBall?.bounces ?? '');
  debugRally.dataset.contactCount = String(activeContacts);
  debugRally.dataset.result = activeResult ?? '';
  debugRally.dataset.winner = activeWinner ?? '';
  debugRally.dataset.time = activeTime.toFixed(3);
  debugRally.dataset.phase = matchEnabled ? match.phase : rallyEnabled ? rally.phase : mode;
  debugRally.dataset.serves = String(activeServes);
  debugRally.dataset.totalContacts = String(totalContacts);
  debugRally.dataset.terminalResolutions = String(terminalResolutions);
  debugRally.dataset.playerContactedFlight = rallyMode ? String(activeRally.contacts.player.contactedFlight) : '';
  debugRally.dataset.playerCooldownUntil = rallyMode ? String(activeRally.contacts.player.cooldownUntil) : '';
  debugRally.dataset.rivalContactedFlight = rallyMode ? String(activeRally.contacts.rival.contactedFlight) : '';
  debugRally.dataset.rivalCooldownUntil = rallyMode ? String(activeRally.contacts.rival.cooldownUntil) : '';
  if (force) {
    debugStatus.textContent = status;
    debugStatus.dataset.status = status;
  }
}

function presentActionRequest(kick: boolean, header: boolean): void {
  if (!kick && !header) return;
  const airborne = player.jumpHeight >= 0.12;
  characters.requestAction(header ? (airborne ? 'jump_header' : 'header') : airborne ? 'aerial_kick' : 'ground_kick');
}

function frame(now: number): void {
  animationFrameId = requestAnimationFrame(frame);
  let visualDelta = 0;
  if (telemetryEnabled && status === 'playing') {
    if (!performanceStarted) performanceStarted = now;
    performanceFrames += 1;
    const measuredMs = now - performanceStarted;
    if (measuredMs >= 1000) {
      debugTelemetry.dataset.fps = ((performanceFrames - 1) * 1000 / measuredMs).toFixed(1);
      performanceStarted = now;
      performanceFrames = 1;
    }
  }
  if (status === 'playing') {
    const elapsed = previousFrame === undefined ? 0 : Math.min((now - previousFrame) / 1000, maxFrameDelta);
    visualDelta = elapsed;
    previousFrame = now;
    accumulator += elapsed;
    let stepCount = 0;
    while (accumulator >= FIXED_STEP && stepCount < maxCatchUpSteps) {
      if (matchEnabled) {
        if (match.phase === 'rally') {
          aimInput = keyboard.sample();
          const jump = keyboard.takeTimedJump(match.rally.time);
          stepPlayer(player, aimInput, FIXED_STEP, undefined, undefined, Boolean(jump));
          const kick = keyboard.takeTimedKick(match.rally.time);
          const header = keyboard.takeTimedHeader(match.rally.time);
          presentActionRequest(Boolean(kick), Boolean(header));
          stepMatch(match, player, rival, aimInput, kick, FIXED_STEP, header, mouseAim.target);
          if (match.phase !== 'rally') {
            keyboard.clear();
            aimInput = { left: false, right: false, forward: false, backward: false };
          }
        } else {
          keyboard.clear();
          aimInput = { left: false, right: false, forward: false, backward: false };
          stepPlayer(player, aimInput, FIXED_STEP);
          rival.previousPosition = { ...rival.position };
          stepMatch(match, player, rival, aimInput, false, FIXED_STEP);
        }
      } else {
        aimInput = keyboard.sample();
        const simulationTime = rallyEnabled ? rally.time : practice.time;
        const jump = keyboard.takeTimedJump(simulationTime);
        stepPlayer(player, aimInput, FIXED_STEP, undefined, undefined, Boolean(jump));
        const kick = keyboard.takeTimedKick(simulationTime);
        const header = keyboard.takeTimedHeader(simulationTime);
        if (!movementOnly) presentActionRequest(Boolean(kick), Boolean(header));
        if (rallyEnabled) stepRally(rally, player, rival, aimInput, kick, FIXED_STEP, header, mouseAim.target);
        else if (practiceEnabled) stepPractice(practice, player.position, aimInput, kick, FIXED_STEP, header, player.jumpHeight, mouseAim.target);
      }
      const feedback = matchEnabled ? match.feedback : rallyEnabled ? rally.feedback : practice.feedback;
      for (const event of drainFeedback(feedback)) { effects.consume(event); audio.consume(event); characters.consume(event); }
      const liveBall = matchEnabled ? match.rally.ball : rallyEnabled ? rally.ball : practice.ball;
      const live = matchEnabled ? match.phase === 'rally' : rallyEnabled ? rally.phase === 'playing' : practiceEnabled && !practice.result;
      effects.step(FIXED_STEP, liveBall, live);
      const playerMoving = Math.hypot(player.position.x - player.previousPosition.x, player.position.z - player.previousPosition.z) > 1e-5;
      const rivalMoving = Math.hypot(rival.position.x - rival.previousPosition.x, rival.position.z - rival.previousPosition.z) > 1e-5;
      characters.update(FIXED_STEP, { moving: playerMoving, jumping: player.jumpHeight > 0, jumpVelocity: player.jumpVelocity }, { moving: rivalMoving, jumping: false });
      accumulator -= FIXED_STEP;
      stepCount += 1;
    }
    if (accumulator >= FIXED_STEP) accumulator %= FIXED_STEP;

    const interpolated = interpolatePlayer(player, accumulator / FIXED_STEP);
    placePlayer(court.player, interpolated);
    setPlayerFacingIndicator(court.playerFacing, player.facing);
    placePlayer(court.rival, (matchEnabled && match.phase === 'rally' || rallyEnabled && rally.phase === 'playing')
      ? interpolatePlayer(rival, accumulator / FIXED_STEP)
      : rival.position);

    telemetryElapsed += elapsed;
    if (telemetryElapsed >= 0.08) {
      updateTelemetry();
      telemetryElapsed = 0;
    }
  } else {
    previousFrame = undefined;
    accumulator = 0;
    placePlayer(court.player, player.position);
    placePlayer(court.rival, rival.position);
  }

  court.update(visualDelta);

  const alpha = status === 'playing' ? accumulator / FIXED_STEP : 1;
  const activeRally = matchEnabled ? match.rally : rally;
  const rallyMode = matchEnabled || rallyEnabled;
  const currentBall = rallyMode ? activeRally.ball : practiceEnabled ? practice.ball : undefined;
  const ballVisible = matchEnabled
    ? match.phase === 'rally' && activeRally.phase === 'playing'
    : rallyEnabled ? rally.phase === 'playing' : practiceEnabled ? !practice.result : false;
  const landing = rallyMode ? rallyLanding(activeRally) : practiceEnabled ? practiceLanding(practice) : undefined;
  const aimTarget = mouseAim.target ?? shotTarget(aimInput, 'player');
  mouseAim.update(player.position, status === 'playing' && ballVisible && currentBall?.receiver === 'player');
  ballVisual.update({ ball: currentBall, time: rallyMode ? activeRally.time : practice.time, visible: ballVisible, landing, aim: undefined }, alpha);
  const feedback = matchEnabled ? match.feedback : rallyEnabled ? rally.feedback : practice.feedback;
  powerHud.hidden = movementOnly;
  powerMeter.setAttribute('aria-valuenow', String(feedback.charge));
  powerMeter.setAttribute('aria-valuetext', feedback.charge === 3 ? 'Fully charged. Next valid kick is powered.' : `${feedback.charge} of 3 perfect returns`);
  powerMeter.dataset.charge = String(feedback.charge);
  [...powerMeter.children].forEach((segment, i) => segment.classList.toggle('filled', i < feedback.charge));
  powerCopy.textContent = feedback.charge === 3 ? 'READY · NEXT KICK!' : `${feedback.charge} / 3 perfects`;
  timingCue.hidden = movementOnly || feedback.cueRemaining === 0;
  const headerShot = feedback.lastShot?.action === 'header' || feedback.lastShot?.action === 'jump_header';
  const cueText = feedback.quality === 'powered' ? 'POWER KICK!' : feedback.quality === 'perfect' ? 'PERFECT!' : headerShot ? 'NICE HEADER' : 'NICE KICK';
  if (timingCue.textContent !== cueText) timingCue.textContent = cueText;
  timingCue.dataset.quality = feedback.quality;
  if (telemetryEnabled) {
    powerHud.dataset.requestTime = String(feedback.requestTime ?? '');
    powerHud.dataset.lastShot = JSON.stringify(feedback.lastShot ?? null);
    powerHud.dataset.quality = feedback.quality;
    powerHud.dataset.reference = String(feedback.timing?.at ?? '');
    powerHud.dataset.time = String(rallyMode ? activeRally.time : practice.time);
    powerHud.dataset.pose = String(feedback.poseRemaining);
    powerHud.dataset.cue = String(feedback.cueRemaining);
    powerHud.dataset.sequence = String(feedback.sequence);
    powerHud.dataset.particles = String(effects.activeCount);
    powerHud.dataset.reducedMotion = String(effects.reducedMotion);
    debugTelemetry.dataset.characters = characters.status;
    debugTelemetry.dataset.aim = `${aimTarget.x.toFixed(3)},${aimTarget.z.toFixed(3)}`;
    debugTelemetry.dataset.mouseAim = String(mouseAim.active);
    muteButton.dataset.audioStatus = audio.status;
    muteButton.dataset.voices = String(audio.voiceCount);
  }
  const kickFlash = rallyMode ? activeRally.kickFlash : practice.kickFlash;
  const poseProgress = feedback.poseRemaining > 0 ? 1 - feedback.poseRemaining / POWER_POSE_DURATION : 0;
  if (characters.status !== 'characters') {
    court.playerPose.rotation.x = effects.reducedMotion ? 0 : feedback.poseRemaining > 0 ? -poseProgress * Math.PI * 2 : -Math.sin(kickFlash / 0.22 * Math.PI) * 0.22;
    court.playerPose.position.y = player.jumpHeight + (effects.reducedMotion ? 0 : Math.sin(poseProgress * Math.PI) * 0.6);
    court.rivalPose.rotation.x = !effects.reducedMotion && rallyMode && activeRally.opponent.mode === 'return' ? 0.18 : 0;
  } else {
    court.playerPose.rotation.x = 0;
    court.playerPose.position.y = player.previousJumpHeight + (player.jumpHeight - player.previousJumpHeight) * alpha;
    court.rivalPose.rotation.x = 0;
  }
  const striking = characters.playerClip && !['idle', 'run', 'jump'].includes(characters.playerClip);
  const facing = striking ? { x: aimTarget.x - player.position.x, z: aimTarget.z - player.position.z } : player.facing;
  court.playerPose.rotation.y = Math.atan2(-facing.x, -facing.z);
  court.rivalPose.rotation.y = Math.atan2(rival.facing.x, rival.facing.z);
  if (telemetryEnabled) {
    debugTelemetry.dataset.jumpHeight = String(player.jumpHeight);
    debugTelemetry.dataset.visualHeight = String(court.playerPose.position.y);
    debugTelemetry.dataset.playerClip = characters.playerClip ?? 'cube';
    debugTelemetry.dataset.rivalClip = characters.rivalClip ?? 'cube';
  }
  court.renderer.render(court.scene, court.camera);
}

const menu = createMenu({
  start(skin, difficulty) {
    characters.setSkins(skin, skin === 'brown' ? 'orange' : 'brown');
    difficultySelect.value = difficulty;
    onPlayAction();
  },
  home() {
    setStatus('ready');
    resetPosition();
  },
  restart() {
    resetPosition();
    onResumeAction();
  },
  sound: onMuteAction,
  motion: onMotionAction,
  soundLabel: () => muteButton.textContent ?? 'Sound',
  motionLabel: () => motionButton.textContent ?? 'Reduce motion',
});
applyModeCopy();
setStatus('ready');
placePlayer(court.player, player.position);
placePlayer(court.rival, rival.position);
setPlayerFacingIndicator(court.playerFacing, player.facing);
updateTelemetry(true);
animationFrameId = requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('focusin', onControlFocus);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', pauseForFocusLoss);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('resize', court.resize);
    court.renderer.domElement.removeEventListener('pointerdown', handlePointerAction);
    court.renderer.domElement.removeEventListener('contextmenu', handleCanvasContextMenu);
    playButton.removeEventListener('click', onPlayAction);
    resumeButton.removeEventListener('click', onResumeAction);
    resetButton.removeEventListener('click', resetPosition);
    rematchButton.removeEventListener('click', onRematchAction);
    muteButton.removeEventListener('click', onMuteAction);
    motionButton.removeEventListener('click', onMotionAction);
    motionPreference.removeEventListener('change', onMotionPreference);
    menu.dispose();
    music.dispose();
    effects.dispose();
    audio.dispose();
    characters.dispose();
    mouseAim.dispose();
    court.dispose();
  });
}

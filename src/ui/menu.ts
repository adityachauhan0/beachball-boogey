import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CHARACTER_ASSET, CHARACTER_SKINS, type CharacterSkin } from '../render/character-presentation';
import type { Difficulty } from '../game/shot-learning';

const names: Record<CharacterSkin, string> = { orange: 'Sunny', bunny: 'Hopper', brown: 'Coco' };
type Screen = 'home' | 'player' | 'difficulty' | 'game';
export function createMenu(actions: {
  start: (skin: CharacterSkin, difficulty: Difficulty) => void;
  home: () => void;
  restart: () => void;
  sound: () => void;
  motion: () => void;
  soundLabel: () => string;
  motionLabel: () => string;
}) {
  const app = document.querySelector<HTMLElement>('#app')!;
  const root = document.createElement('section');
  root.className = 'menu-shell';
  root.setAttribute('aria-label', 'Game menu');
  root.innerHTML = `
    <div class="menu-home" data-screen="home">
      <div class="game-logo"><span class="beach-ball" aria-hidden="true"></span><h1>BEACH BALL<strong><span>BOO</span>GEY</strong></h1></div>
      <p class="menu-tagline">BIG SHOES. GOOD TIMES.</p>
      <div class="menu-actions"><button class="boogey-button primary" data-action="play">PLAY <span aria-hidden="true">▶</span></button><button class="boogey-button" data-action="help">HOW TO PLAY</button><button class="boogey-button" data-action="options">OPTIONS</button></div>
      <p class="menu-note">PRESS ENTER TO PLAY · FIRST TO FIVE</p>
    </div>
    <div class="setup-panel" data-screen="player" hidden>
      <p class="step-label">01 / 02 · PICK YOUR PLAYER</p><h2>Who's bringing the boogie?</h2><p class="setup-copy">Three beach regulars. Same moves. Your style.</p>
      <div class="player-choices">${CHARACTER_SKINS.map((skin) => `<button class="player-choice" data-skin="${skin}" aria-pressed="${skin === 'orange'}"><span class="portrait" data-portrait="${skin}"><span class="portrait-loading">Loading player…</span></span><strong>${names[skin]}</strong><span>${skin === 'orange' ? 'Sunshine energy' : skin === 'bunny' ? 'Hop to it' : 'Island spirit'}</span><small class="selected-marker">${skin === 'orange' ? 'SELECTED' : 'CHOOSE'}</small></button>`).join('')}</div>
      <div class="setup-actions"><button class="boogey-button" data-action="home">BACK</button><button class="boogey-button primary" data-action="difficulty">NEXT <span aria-hidden="true">→</span></button></div>
    </div>
    <div class="setup-panel difficulty-panel" data-screen="difficulty" hidden>
      <p class="step-label">02 / 02 · SET THE PACE</p><h2>A little friendly competition.</h2><p class="setup-copy" id="selected-player-copy">Sunny is ready. Pick your rival's difficulty.</p>
      <div class="difficulty-choices">${(['easy', 'normal', 'hard'] as const).map((value, i) => `<button class="difficulty-choice" data-difficulty="${value}" aria-pressed="${value === 'normal'}"><span class="difficulty-symbol" aria-hidden="true">${['☀', '≈', 'ϟ'][i]}</span><strong>${value.toUpperCase()}</strong><span>${['Find your feet', 'Bring your game', 'Make a splash'][i]}</span><small>${['More time to react. Gentler returns.', 'A balanced rival that learns your play.', 'Quicker reactions. Wider shots.'][i]}</small></button>`).join('')}</div>
      <div class="setup-actions"><button class="boogey-button" data-action="player">BACK</button><button class="boogey-button primary" data-action="start">LET'S PLAY <span aria-hidden="true">▶</span></button></div>
    </div>`;
  app.append(root);
  const dialog = document.createElement('dialog');
  dialog.className = 'boogey-dialog';
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  app.append(dialog);
  let screen: Screen = 'home';
  let skin: CharacterSkin = 'orange';
  let difficulty: Difficulty = 'normal';
  function show(next: Screen) {
    screen = next;
    app.dataset.screen = next;
    root.hidden = next === 'game';
    root.querySelectorAll<HTMLElement>('[data-screen]').forEach((panel) => { panel.hidden = panel.dataset.screen !== next; });
    root.querySelector<HTMLElement>(`[data-screen="${next}"] button`)?.focus({ preventScroll: true });
  }
  function openDialog(kind: 'help' | 'options') {
    dialog.innerHTML = kind === 'help' ? `<p class="step-label">A QUICK WARM-UP</p><h2 id="dialog-title">How to boogie</h2><p>Send the ball over the net and into your rival's half. One bounce allowed, one return per side. First to five wins!</p><dl class="help-controls"><dt>WASD / Arrows</dt><dd>Move</dd><dt>Mouse</dt><dd>Aim your shot</dd><dt>Left click / F</dt><dd>Kick</dd><dt>Right click / E</dt><dd>Header</dd><dt>Space</dt><dd>Jump for aerial shots</dd><dt>Esc</dt><dd>Pause / resume</dd></dl><p>Time your returns well: three perfects charge your next kick with power.</p><button class="boogey-button primary" data-dialog="close">GOT IT</button>` : `<p class="step-label">YOUR BEACH, YOUR WAY</p><h2 id="dialog-title">Options</h2><p>Tune the feel of your next rally.</p><button class="boogey-button" data-dialog="sound">${actions.soundLabel()}</button><button class="boogey-button" data-dialog="motion">${actions.motionLabel()}</button><button class="boogey-button primary" data-dialog="close">DONE</button>`;
    dialog.showModal();
  }
  dialog.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-dialog]');
    if (!button) return;
    if (button.dataset.dialog === 'close') dialog.close();
    if (button.dataset.dialog === 'sound') { actions.sound(); button.textContent = actions.soundLabel(); }
    if (button.dataset.dialog === 'motion') { actions.motion(); button.textContent = actions.motionLabel(); }
  });
  function returnHome(next: Screen = 'home') { actions.home(); show(next); }
  const click = (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button, a');
    if (!button) return;
    if (button.dataset.skin) {
      skin = button.dataset.skin as CharacterSkin;
      root.querySelectorAll<HTMLElement>('[data-skin]').forEach((choice) => {
        const selected = choice.dataset.skin === skin;
        choice.setAttribute('aria-pressed', String(selected));
        choice.querySelector('.selected-marker')!.textContent = selected ? 'SELECTED' : 'CHOOSE';
      });
      root.querySelector('#selected-player-copy')!.textContent = `${names[skin]} is ready. Pick your rival's difficulty.`;
    }
    if (button.dataset.difficulty) {
      difficulty = button.dataset.difficulty as Difficulty;
      root.querySelectorAll('[data-difficulty]').forEach((choice) => choice.setAttribute('aria-pressed', String((choice as HTMLElement).dataset.difficulty === difficulty)));
    }
    switch (button.dataset.action) {
      case 'play': case 'player': show('player'); break;
      case 'difficulty': show('difficulty'); break;
      case 'home': returnHome(); break;
      case 'setup': returnHome('player'); break;
      case 'start': show('game'); actions.start(skin, difficulty); break;
      case 'restart': actions.restart(); break;
      case 'help': openDialog('help'); break;
      case 'options': openDialog('options'); break;
    }
  };
  app.addEventListener('click', click);
  const keydown = (event: KeyboardEvent) => {
    if (dialog.open) { event.stopImmediatePropagation(); return; }
    if (screen === 'game') return;
    if (event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); show(screen === 'difficulty' ? 'player' : 'home'); }
    if (event.code === 'Enter' && !event.repeat && !(event.target as HTMLElement).closest('button')) { event.preventDefault(); if (screen === 'home') show('player'); }
  };
  window.addEventListener('keydown', keydown, true);
  show('home');
  void loadPortraits(root);
  return { dispose() { app.removeEventListener('click', click); window.removeEventListener('keydown', keydown, true); root.remove(); dialog.remove(); } };
}

/** Portraits use the shipped models, so selection matches the in-game skin. */
async function loadPortraits(root: HTMLElement) {
  let renderer: THREE.WebGLRenderer | undefined;
  try {
    const gltf = await new GLTFLoader().loadAsync(CHARACTER_ASSET);
    if (!root.isConnected) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(300, 300);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcab590, 2.7));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 5); scene.add(light);
    scene.add(gltf.scene);
    for (const skin of CHARACTER_SKINS) {
      gltf.scene.traverse((object) => { if (object.name.startsWith('Skin_')) object.visible = object.name === `Skin_${skin}`; });
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y) * 0.6;
      const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 0.1, 100);
      camera.position.set(center.x + 0.4, center.y + 0.25, center.z + 8);
      camera.lookAt(center);
      renderer.render(scene, camera);
      const image = document.createElement('img');
      image.src = renderer.domElement.toDataURL(); image.alt = `${names[skin]} character preview`;
      root.querySelector(`[data-portrait="${skin}"]`)?.replaceChildren(image);
    }
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((m) => m.dispose()); }
    });
  } catch {
    root.querySelectorAll('.portrait-loading').forEach((label) => { label.textContent = 'Preview unavailable'; });
  } finally { renderer?.dispose(); }
}

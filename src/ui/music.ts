/** Background track is independent from gameplay sound effects. */
export function createBackgroundMusic(button: HTMLButtonElement) {
  const track = document.createElement('audio');
  track.src = '/assets/audio/vintage-hawaii.mp3';
  track.loop = true;
  track.volume = 0.35;
  track.preload = 'metadata';
  track.dataset.backgroundMusic = 'true';
  document.body.append(track);
  let enabled = true;
  let unlocked = false;
  let disposed = false;
  try { enabled = localStorage.getItem('boogey.music') !== 'off'; } catch { /* Storage is optional. */ }
  function render() {
    button.textContent = enabled ? '♫ Music on' : '♫ Music off';
    button.setAttribute('aria-label', enabled ? 'Turn background music off' : 'Turn background music on');
    button.setAttribute('aria-pressed', String(enabled));
  }
  function play() {
    if (enabled && unlocked && !document.hidden && !disposed) {
      void track.play().catch(() => { /* Retry on the next user gesture if autoplay is blocked. */ });
    }
  }
  function gesture(event: Event) {
    unlocked = true;
    if ((event.target as HTMLElement)?.closest('#music-button')) return;
    if (track.paused) play();
  }
  function toggle() {
    unlocked = true;
    enabled = !enabled;
    try { localStorage.setItem('boogey.music', enabled ? 'on' : 'off'); } catch { /* Storage is optional. */ }
    if (enabled) play(); else track.pause();
    render();
  }
  function visibility() { if (document.hidden) track.pause(); else play(); }
  function failed() { button.textContent = 'Music unavailable'; button.disabled = true; button.setAttribute('aria-label', 'Background music unavailable'); }
  button.addEventListener('click', toggle);
  window.addEventListener('pointerdown', gesture, true);
  window.addEventListener('keydown', gesture, true);
  document.addEventListener('visibilitychange', visibility);
  track.addEventListener('error', failed);
  render();
  return { dispose() {
    disposed = true;
    track.pause(); track.removeAttribute('src'); track.load(); track.remove();
    button.removeEventListener('click', toggle);
    window.removeEventListener('pointerdown', gesture, true);
    window.removeEventListener('keydown', gesture, true);
    document.removeEventListener('visibilitychange', visibility);
    track.removeEventListener('error', failed);
  } };
}

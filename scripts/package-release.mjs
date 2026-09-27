import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Build first. All runtime resources are embedded, including GLB-contained textures.
let html = await readFile('dist/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)];
if (scripts.length !== 1) throw new Error('Expected one bundled entry script');
let js = await readFile(`dist/${scripts[0][1].replace(/^\//, '')}`, 'utf8');
for (const [path, mime] of [
  ['/assets/environments/beach-court.glb', 'model/gltf-binary'],
  ['/assets/characters/chibi-animated.glb', 'model/gltf-binary'],
  ['/assets/audio/vintage-hawaii.mp3', 'audio/mpeg'],
]) {
  if (!js.includes(path)) throw new Error(`Missing runtime asset reference: ${path}`);
  const bytes = await readFile(`public${path}`);
  js = js.replaceAll(path, `data:${mime};base64,${bytes.toString('base64')}`);
}
if (/['"]\/assets\//.test(js)) throw new Error('Unbundled runtime asset remains');
html = html.replace(scripts[0][0], () => `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`);
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]) {
  const css = await readFile(`dist/${match[1].replace(/^\//, '')}`, 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const notices = await readFile('THIRD_PARTY_NOTICES', 'utf8');
html = html.replace('</body>', `<script type="text/plain" id="third-party-notices">${notices.replaceAll('</script', '<\\/script')}</script></body>`);
await mkdir('release', { recursive: true });
const name = 'Beach-Ball-Boogey.html';
await writeFile(`release/${name}`, html);
const hash = createHash('sha256').update(html).digest('hex');
await writeFile('release/SHA256SUMS.txt', `${hash}  ${name}\n`);
console.log(`Packaged ${name}: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB, all runtime assets embedded.`);

import * as THREE from 'three';
import type { BallState, Vec3 } from '../game/ball';
import type { FeedbackEvent } from '../game/feedback';
import type { ShotQuality } from '../game/contact';

const COLORS = { regular: 0xeefbff, perfect: 0x19ebdf, powered: 0xffbd3e };
/** Fixed pools; presentation never changes simulation or starts its own clock. */
export function createGameEffects(scene: THREE.Scene) {
  const geometry = new THREE.SphereGeometry(0.085, 6, 4);
  const pool = Array.from({ length: 72 }, () => {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    mesh.visible = false; scene.add(mesh);
    return { mesh, life: 0, duration: 0, velocity: { x: 0, y: 0, z: 0 }, burst: false, opacity: 0.25 };
  });
  let cursor = 0;
  let trailQuality: ShotQuality = 'regular';
  let sample = 0;
  let reduced = false;
  function spawn(position: Vec3, quality: ShotQuality, duration: number, burst: boolean, velocity = { x: 0, y: 0, z: 0 }) {
    const particle = pool[cursor++ % pool.length];
    particle.life = particle.duration = duration;
    particle.velocity = velocity; particle.burst = burst; particle.opacity = burst ? 0.95 : quality === 'regular' ? 0.25 : 0.6;
    particle.mesh.position.set(position.x, position.y, position.z);
    particle.mesh.material.color.setHex(COLORS[quality]);
    particle.mesh.visible = true;
  }
  function clear() { for (const p of pool) { p.life = 0; p.mesh.visible = false; } sample = 0; trailQuality = 'regular'; }
  return {
    get activeCount() { return pool.filter(p => p.life > 0).length; },
    get reducedMotion() { return reduced; },
    setReducedMotion(value: boolean) { reduced = value; clear(); },
    clear,
    consume(event: FeedbackEvent) {
      if (event.type === 'serve' || event.type === 'point' || event.type === 'match') { clear(); return; }
      if (event.type !== 'contact') return;
      trailQuality = event.quality;
      const count = reduced ? 2 : event.quality === 'powered' ? 14 : event.quality === 'perfect' ? 10 : 5;
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        const speed = reduced ? 0 : event.quality === 'regular' ? 1.3 : 2.4;
        spawn(event.position, event.quality, reduced ? 0.16 : 0.32, true, { x: Math.cos(angle) * speed, y: reduced ? 0 : 0.5 + i % 3 * 0.35, z: Math.sin(angle) * speed });
      }
    },
    step(dt: number, ball: BallState | undefined, visible: boolean) {
      if (dt <= 0) return;
      for (const p of pool) {
        p.life = Math.max(0, p.life - dt);
        p.mesh.visible = p.life > 0;
        if (!p.mesh.visible) continue;
        p.mesh.position.x += p.velocity.x * dt; p.mesh.position.y += p.velocity.y * dt; p.mesh.position.z += p.velocity.z * dt;
        p.mesh.material.opacity = p.life / p.duration * p.opacity;
        p.mesh.scale.setScalar((p.burst ? 1.3 : 1) * (0.4 + p.life / p.duration));
      }
      if (ball && visible && !reduced && ++sample % 2 === 0) spawn(ball.position, trailQuality, trailQuality === 'regular' ? 0.14 : trailQuality === 'perfect' ? 0.22 : 0.3, false);
    },
    dispose() { for (const p of pool) { scene.remove(p.mesh); p.mesh.material.dispose(); } geometry.dispose(); },
  };
}

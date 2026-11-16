import { useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { B, Blob, Slab, canvasTexture, rng, useMats } from './kit';
import { STUDY } from './layout';
import { Model } from './Model';
import { BookRows, Framed, Laptop, Rug, codeScreen, type Shelf } from './props';
import { coursesTexture } from './Story3D';

/**
 * The study (education): a wall of walnut shelves full of books, a big walnut desk with a lamp
 * and open books, a whiteboard and a pinboard, framed school certificates over a low credenza.
 */

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = STUDY;
const SHELF_D = 0.36;
const LEVELS = [0.42, 0.82, 1.22, 1.62, 2.02, 2.42, 2.82];
const BAYS = 4;

export function whiteboardTexture() {
  return canvasTexture(1024, 560, (g) => {
    g.fillStyle = '#fbfbf9';
    g.fillRect(0, 0, 1024, 560);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // A parabola on axes
    g.strokeStyle = '#1d4f91';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(70, 300);
    g.lineTo(420, 300);
    g.moveTo(240, 470);
    g.lineTo(240, 70);
    g.stroke();
    g.strokeStyle = '#c0392b';
    g.beginPath();
    for (let x = -150; x <= 150; x += 5) {
      const y = 300 - (x * x) / 110 + 120;
      if (x === -150) g.moveTo(240 + x, y);
      else g.lineTo(240 + x, y);
    }
    g.stroke();
    // A flow of boxes and arrows
    g.strokeStyle = '#222';
    g.lineWidth = 4;
    [
      [520, 90],
      [760, 90],
      [640, 260],
    ].forEach(([x, y]) => g.strokeRect(x!, y!, 170, 80));
    g.beginPath();
    g.moveTo(690, 130);
    g.lineTo(760, 130);
    g.moveTo(605, 170);
    g.lineTo(680, 260);
    g.moveTo(845, 170);
    g.lineTo(770, 260);
    g.stroke();
    // Scribbled lines (notes)
    const r = rng(12);
    g.strokeStyle = '#2b2b2b';
    g.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = 520;
      const y = 400 + i * 30;
      g.moveTo(x, y);
      while (x < 520 + 200 + r() * 220) {
        x += 6;
        g.lineTo(x, y + Math.sin(x * 0.4) * 4 + (r() - 0.5) * 3);
      }
      g.stroke();
    }
    g.fillStyle = '#1d4f91';
    g.font = 'italic 44px Georgia, serif';
    g.fillText('y = ax² + bx + c', 90, 530);
  });
}

function corkTexture() {
  return canvasTexture(512, 400, (g) => {
    g.fillStyle = '#b58a5a';
    g.fillRect(0, 0, 512, 400);
    const r = rng(5);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = r() > 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(230,200,150,0.25)';
      g.fillRect(r() * 512, r() * 400, 2, 2);
    }
    const notes = ['#fff3a8', '#ffd1dc', '#c9f0ff', '#ffffff', '#d8f5c4', '#fff3a8', '#ffffff'];
    notes.forEach((c, i) => {
      const x = 30 + (i % 4) * 120 + r() * 20;
      const y = 30 + Math.floor(i / 4) * 180 + r() * 30;
      g.save();
      g.translate(x + 50, y + 60);
      g.rotate((r() - 0.5) * 0.2);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(-48, -56, 104, 124);
      g.fillStyle = c;
      g.fillRect(-52, -60, 100, 120);
      g.fillStyle = 'rgba(40,40,40,0.55)';
      for (let k = 0; k < 5; k++) g.fillRect(-40, -35 + k * 18, 60 + r() * 15, 3);
      g.fillStyle = '#c0392b';
      g.beginPath();
      g.arc(0, -50, 7, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
  });
}

/** A school certificate frame: the real school name only. */
function schoolTexture(line: string) {
  return canvasTexture(768, 1000, (g) => {
    g.fillStyle = '#f8f4ea';
    g.fillRect(0, 0, 768, 1000);
    g.strokeStyle = '#1f3a5a';
    g.lineWidth = 5;
    g.strokeRect(40, 40, 688, 920);
    g.lineWidth = 1.5;
    g.strokeRect(56, 56, 656, 888);
    g.fillStyle = '#1f3a5a';
    g.textAlign = 'center';
    g.font = '600 50px Georgia, "Times New Roman", serif';
    g.fillText('Fulton Science', 384, 330);
    g.fillText('Academy', 384, 395);
    g.fillRect(300, 440, 168, 2);
    g.fillStyle = '#4a4440';
    g.font = 'italic 34px Georgia, serif';
    g.fillText(line, 384, 520);
    g.font = '600 40px Georgia, serif';
    g.fillStyle = '#2a2420';
    g.fillText('Shreyas Ballari', 384, 640);
  });
}

export function Study() {
  const m = useMats();
  const tex = useMemo(() => ({ wb: coursesTexture(), cork: corkTexture(), a: schoolTexture('Student'), b: schoolTexture('Honors List'), lap: codeScreen(17) }), []);
  const mats = useMemo(
    () => ({
      wb: new MeshStandardMaterial({ map: tex.wb, roughness: 0.15 }),
      cork: new MeshStandardMaterial({ map: tex.cork, roughness: 0.95 }),
      paper: new MeshStandardMaterial({ color: '#f3efe6', roughness: 0.9 }),
    }),
    [tex],
  );
  const z0 = Z0 + 0.15;
  const z1 = Z1 - 0.15;
  const bay = (z1 - z0) / BAYS;
  const shelves = useMemo<Shelf[]>(() => {
    const out: Shelf[] = [];
    for (let b = 0; b < BAYS; b++) for (const y of LEVELS.slice(0, -1)) out.push({ a: z0 + b * bay + 0.03, b: z0 + (b + 1) * bay - 0.03, y: y + 0.02, c: X0, depth: SHELF_D });
    return out;
  }, [z0, bay]);
  return (
    <group>
      <Slab p={[(X0 + X1) / 2, -0.05, (Z0 + Z1) / 2]} s={[X1 - X0, 0.1, Z1 - Z0]} m={m.oakDark} tile={2.4} cast={false} />
      {/* The library wall */}
      <Slab p={[X0 + 0.01, 1.6, (Z0 + Z1) / 2]} s={[0.02, 3.2, z1 - z0]} m={m.walnut} tile={1.2} cast={false} />
      {Array.from({ length: BAYS + 1 }, (_, i) => (
        <Slab key={`u${i}`} p={[X0 + SHELF_D / 2, 1.6, z0 + i * bay]} s={[SHELF_D, 3.2, 0.04]} m={m.walnut} tile={1.2} />
      ))}
      {LEVELS.map((y) => (
        <Slab key={`s${y}`} p={[X0 + SHELF_D / 2, y, (z0 + z1) / 2]} s={[SHELF_D, 0.035, z1 - z0]} m={m.walnut} tile={1.2} />
      ))}
      <Slab p={[X0 + SHELF_D / 2 + 0.02, 0.2, (z0 + z1) / 2]} s={[SHELF_D, 0.4, z1 - z0]} m={m.walnut} tile={1.2} />
      <BookRows shelves={shelves} along="z" face={1} seed={2} fill={0.9} />
      {/* Desk in the middle of the room */}
      <Slab p={[-10.4, 0.75, -1.85]} s={[0.85, 0.04, 1.9]} m={m.walnut} tile={1.2} />
      <Slab p={[-10.4, 0.37, -2.73]} s={[0.8, 0.74, 0.04]} m={m.walnut} tile={1.2} />
      <Slab p={[-10.4, 0.37, -0.97]} s={[0.8, 0.74, 0.04]} m={m.walnut} tile={1.2} />
      <Model id="desk_lamp_arm_01" position={[-10.15, 0.77, -2.6]} rotation={2.4} scale={0.9} />
      <Laptop position={[-10.35, 0.77, -1.6]} rotation={-Math.PI / 2} tex={tex.lap} />
      {/* Open book and a stack */}
      <group position={[-10.5, 0.775, -2.2]} rotation={[0, 0.3, 0]}>
        <B p={[-0.08, 0.006, 0]} s={[0.15, 0.012, 0.22]} r={[0, 0, 0.06]} m={mats.paper} />
        <B p={[0.08, 0.006, 0]} s={[0.15, 0.012, 0.22]} r={[0, 0, -0.06]} m={mats.paper} />
      </group>
      {[0, 1, 2].map((i) => (
        <B key={i} p={[-10.55, 0.79 + i * 0.035, -1.1]} s={[0.24, 0.032, 0.17]} r={[0, i * 0.15, 0]} m={i === 1 ? m.felt : i === 2 ? m.fabric : m.walnut} />
      ))}
      <Model id="dining_chair_02" position={[-11.15, 0, -1.8]} rotation={Math.PI / 2} />
      <Blob p={[-10.6, -1.85]} s={[1.6, 2.4]} />
      <Rug position={[-10.5, -1.85]} w={2.4} d={3.0} color="#7b8a8f" stripe="#c9bfae" />
      {/* Whiteboard and pinboard on the north wall */}
      <B p={[-10.9, 1.55, Z0 + 0.015]} s={[2.1, 1.15, 0.03]} m={m.steel} />
      <mesh position={[-10.9, 1.55, Z0 + 0.032]} scale={[2.04, 1.09, 1]} material={mats.wb}>
        <planeGeometry />
      </mesh>
      <B p={[-10.9, 0.96, Z0 + 0.05]} s={[1.6, 0.025, 0.06]} m={m.steel} />
      <B p={[-8.55, 1.55, Z0 + 0.02]} s={[1.05, 0.85, 0.04]} m={m.walnut} />
      <mesh position={[-8.55, 1.55, Z0 + 0.041]} scale={[0.98, 0.78, 1]} material={mats.cork}>
        <planeGeometry />
      </mesh>
      {/* Credenza and certificates on the south wall */}
      <Slab p={[-10.0, 0.32, Z1 - 0.22]} s={[2.2, 0.64, 0.44]} m={m.walnut} tile={1.2} />
      <B p={[-10.0, 0.645, Z1 - 0.22]} s={[2.22, 0.012, 0.45]} m={m.black} cast={false} />
      <Framed position={[-10.55, 1.6, Z1]} rotation={Math.PI} w={0.5} h={0.66} tex={tex.a} frame="#c8a46a" />
      <Framed position={[-9.45, 1.6, Z1]} rotation={Math.PI} w={0.5} h={0.66} tex={tex.b} frame="#c8a46a" />
      <Model id="ceramic_vase_01" position={[-11.0, 0.65, Z1 - 0.22]} scale={0.7} />
      {/* Reading corner */}
      <Model id="mid_century_lounge_chair" position={[-8.15, 0, Z0 + 0.75]} rotation={-0.9} />
      <Blob p={[-8.15, Z0 + 0.75]} s={[1.0, 1.0]} />
      <B p={[-10.1, 3.19, (Z0 + Z1) / 2]} s={[0.05, 0.02, 3.4]} m={m.warmGlow} cast={false} />
    </group>
  );
}

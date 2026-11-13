import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MathUtils, SRGBColorSpace, type Group } from 'three';
import { drawAward, type Award } from '../awards';
import { PANEL_XS, PANELS_Y, PANELS_Z, STOPS } from './path';

/**
 * Above the clouds: a deep sea of soft, shaded cloud puffs and tall floating cards with Shreyas's
 * awards and certificates. Cards lift on hover and open the full view on screen when clicked.
 */

function puffTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) {
    // Keep every puff well inside the square so sprites have no hard edges.
    const r = 30 + rnd() * 34;
    const x = 128 + (rnd() - 0.5) * (200 - 2 * r);
    const y = 136 + (rnd() - 0.5) * (120 - r) - (i % 3) * 8;
    // Lit from above: bright tops, rosy shaded bellies.
    const grad = g.createRadialGradient(x, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.55, 'rgba(255,240,240,0.7)');
    grad.addColorStop(0.85, 'rgba(236,196,206,0.35)');
    grad.addColorStop(1, 'rgba(236,196,206,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  // Feather the whole sprite towards its border.
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(128, 128, 60, 128, 128, 128);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export function Clouds() {
  const texs = useMemo(() => [puffTexture(3), puffTexture(17), puffTexture(41)], []);
  const puffs = useMemo(() => {
    const rnd = seeded(7);
    const out: { pos: [number, number, number]; s: number; tint: string; tex: number }[] = [];
    // The cloud deck under the cards, layered from dense below to wispy above.
    for (let i = 0; i < 230; i++) {
      const layer = rnd();
      out.push({
        pos: [-240 + rnd() * 480, 96 + layer * 52, -680 - rnd() * 620],
        s: 40 + rnd() * 70,
        tint: layer > 0.6 ? '#ffffff' : ['#ffe3e6', '#f8cfd8', '#ffeae2'][Math.floor(rnd() * 3)]!,
        tex: i % 3,
      });
    }
    for (let i = 0; i < 30; i++) {
      out.push({ pos: [-150 + rnd() * 300, 168 + rnd() * 40, PANELS_Z - 40 - rnd() * 140], s: 30 + rnd() * 30, tint: '#fff6f2', tex: i % 3 });
    }
    return out;
  }, []);
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y > 55 || camera.position.z < -930;
  });
  return (
    <group ref={ref}>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.s, p.s * 0.62, 1]}>
          <spriteMaterial map={texs[p.tex]} color={p.tint} transparent opacity={0.95} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

function cardTexture(award: Award, index: number) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 900;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 640, 900);
    g.save();
    g.beginPath();
    g.roundRect(6, 6, 628, 888, 30);
    g.clip();
    g.fillStyle = 'rgba(40,24,40,0.55)';
    g.fillRect(0, 0, 640, 900);
    // The certificate itself, like a framed print.
    g.save();
    g.translate(40, 50);
    drawAward(g, award, 560, 700);
    g.restore();
    // Title band
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.font = '400 30px "Michroma", sans-serif';
    g.textAlign = 'center';
    g.fillText(award.title, 320, 808);
    g.fillStyle = 'rgba(255,230,220,0.85)';
    g.font = '500 24px "Manrope", sans-serif';
    g.fillText(`${String(index + 1).padStart(2, '0')} · ${award.line}`, 320, 852);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(6, 6, 628, 888, 30);
    g.stroke();
  };
  draw();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  void document.fonts?.ready.then(() => {
    draw();
    t.needsUpdate = true;
  });
  return t;
}

/** How far each card has risen out of the clouds (0 = hidden in the clouds, 1 = up). */
function rise(p: number, index: number) {
  const a = STOPS.statue + 0.03 + index * 0.006;
  const up = MathUtils.smootherstep(p, a, a + 0.03);
  // Sink back as the skydive starts.
  const down = 1 - MathUtils.smootherstep(p, STOPS.awardsEnd + 0.004 + index * 0.003, STOPS.fall + 0.01);
  return Math.min(up, down);
}

function Card({ award, index, x, onOpen, progress }: { award: Award; index: number; x: number; onOpen: (id: string) => void; progress: RefObject<number> }) {
  const map = useMemo(() => cardTexture(award, index), [award, index]);
  const ref = useRef<Group>(null);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = 'pointer';
    return () => void (document.body.style.cursor = '');
  }, [hover]);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 8);
    const r = rise(progress.current ?? 0, index);
    g.position.y = MathUtils.lerp(PANELS_Y - 62, PANELS_Y, r) + Math.sin(t * 0.6 + index) * 0.7 * r + (hover ? 1.4 : 0);
    g.rotation.x = (1 - r) * 0.35;
    g.visible = r > 0.01;
    g.scale.setScalar(MathUtils.lerp(g.scale.x, hover ? 1.08 : 1, k));
    g.rotation.y = MathUtils.lerp(g.rotation.y, hover ? 0 : -x * 0.004, k);
  });
  return (
    <group ref={ref} position={[x, PANELS_Y, PANELS_Z]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(award.id);
        }}
      >
        <planeGeometry args={[16, 22.5]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[16.8, 23.3]} />
        <meshBasicMaterial color="#ffd7c8" transparent opacity={hover ? 0.5 : 0.12} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}

export function AwardCards({ items, onOpen, progress }: { items: Award[]; onOpen: (id: string) => void; progress: RefObject<number> }) {
  const ref = useRef<Group>(null);
  // Only shown once the journey reaches the sky (they would be specks from town).
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.z < -700 && camera.position.y > 60;
  });
  return (
    <group ref={ref}>
      {items.slice(0, PANEL_XS.length).map((a, i) => (
        <Card key={a.id} award={a} index={i} x={PANEL_XS[i]!} onOpen={onOpen} progress={progress} />
      ))}
    </group>
  );
}

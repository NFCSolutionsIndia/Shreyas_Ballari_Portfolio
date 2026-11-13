import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, CanvasTexture, ExtrudeGeometry, MathUtils, MeshStandardMaterial, Path, Quaternion, SRGBColorSpace, Shape, Vector3, type Group, type Texture } from 'three';
import { WORLD } from '../data/worldData';
import { FINALE_Z, GROUND, HOUSE_Z } from './path';
import { TOUCH_WALKERS, Traffic, Walkers } from './People';
import { useEnvMap } from './Statue';
import {
  bannerTexture,
  calendarTexture,
  certificateTexture,
  oncurePosterTexture,
  pavingTexture,
  pinboardTexture,
  stockScreenTexture,
} from './textures';
import { Houses, type House } from './Town';
import { VoxelText } from './VoxelText';

/**
 * The finale: a suburban street at dusk with giant "SAY HELLO" letters, closed by a house whose
 * lit window the camera flies through into Shreyas's room. The room tells his story: framed
 * achievements, the Oncure poster, his school journey on a pinboard, the stock app on the
 * laptop, a microscope and books for the sciences, a calendar showing today, and the motto.
 */

const WIN = { w: 5, h: 3.6, y: 8.6 };
const WALL_Z = HOUSE_Z;
const ROOM_D = 30;
const ROOM_W = 26;
const HOUSE_W = 32;

function wallWithWindow(width: number, height: number) {
  const s = new Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  const hole = new Path();
  const y0 = WIN.y - GROUND - WIN.h / 2;
  hole.moveTo(-WIN.w / 2, y0);
  hole.lineTo(WIN.w / 2, y0);
  hole.lineTo(WIN.w / 2, y0 + WIN.h);
  hole.lineTo(-WIN.w / 2, y0 + WIN.h);
  hole.closePath();
  s.holes.push(hole);
  return new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
}

function Frame({ map, position, size }: { map: ReturnType<typeof calendarTexture>; position: [number, number, number]; size: [number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[size[0] + 0.12, size[1] + 0.12, 0.08]} />
        <meshStandardMaterial color="#4a3326" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={size} />
        <meshStandardMaterial map={map} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** A framed glass board with text, for the room's walls. */
function boardTexture(title: string, rows: [string, string][], accent: string) {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 640;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 900, 640);
    const grad = g.createLinearGradient(0, 0, 900, 640);
    grad.addColorStop(0, '#fbf7f2');
    grad.addColorStop(1, '#efe6dc');
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(0, 0, 900, 640, 28);
    g.fill();
    g.fillStyle = accent;
    g.fillRect(56, 70, 60, 6);
    g.fillStyle = '#2d2026';
    g.font = '400 46px "Michroma", sans-serif';
    g.fillText(title, 56, 140);
    let y = 210;
    for (const [k, v] of rows) {
      g.fillStyle = '#9b7a8a';
      g.font = '600 22px "Manrope", sans-serif';
      g.fillText(k.toUpperCase(), 56, y);
      g.fillStyle = '#2d2026';
      g.font = '500 30px "Manrope", sans-serif';
      // Wrap long values.
      const words = v.split(' ');
      let line = '';
      let yy = y + 38;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (g.measureText(test).width > 780 && line) {
          g.fillText(line, 56, yy);
          line = w;
          yy += 36;
        } else line = test;
      }
      g.fillText(line, 56, yy);
      y = yy + 50;
    }
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

function planksTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 4; j++) {
      const off = (i % 2) * 64;
      const k = 0.85 + (((i * 7 + j * 13) % 10) / 10) * 0.2;
      g.fillStyle = `rgb(${Math.round(176 * k)},${Math.round(124 * k)},${Math.round(88 * k)})`;
      g.fillRect(j * 128 + off - 128, i * 64, 126, 62);
      g.fillRect(j * 128 + off, i * 64, 126, 62);
      g.strokeStyle = 'rgba(80,45,25,0.18)';
      for (let l = 0; l < 4; l++) {
        g.beginPath();
        g.moveTo(j * 128 + off, i * 64 + 10 + l * 13);
        g.bezierCurveTo(j * 128 + off + 40, i * 64 + 6 + l * 13, j * 128 + off + 80, i * 64 + 16 + l * 13, j * 128 + off + 126, i * 64 + 10 + l * 13);
        g.stroke();
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = 1000; // RepeatWrapping
  t.repeat.set(4, 5);
  return t;
}

function Board({ map, position, rotation = 0, size }: { map: Texture; position: [number, number, number]; rotation?: number; size: [number, number] }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[size[0] + 0.24, size[1] + 0.24, 0.1]} />
        <meshStandardMaterial color="#2d2026" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial map={map} roughness={0.45} />
      </mesh>
    </group>
  );
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.42, 1.2, 18]} />
        <meshStandardMaterial color="#e9e2d6" roughness={0.5} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.35, 2 + (i % 3) * 0.5, Math.sin(a) * 0.35]} rotation={[Math.sin(a) * 0.6, a, Math.cos(a) * 0.6]} scale={[0.35, 1.3, 0.08]} castShadow>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#3f7d4f' : '#5a9a5e'} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

function Room() {
  const portrait = useLoader(TextureLoader, WORLD.portrait);
  portrait.colorSpace = SRGBColorSpace;
  const tex = useMemo(
    () => ({
      cal: calendarTexture(),
      psat: certificateTexture('PSAT 8/9', '1280 out of 1440', '★', '#2f5d8c', 'SCORE'),
      authors: certificateTexture('Young Authors Contest', 'Winner · District 204', '2023', '#c44d3f'),
      med: certificateTexture('Mini-Medical School', 'Certificate of completion', '2021', '#3f7d6a'),
      poster: oncurePosterTexture(),
      screen: stockScreenTexture(),
      board: pinboardTexture(WORLD.schools),
      banner: bannerTexture(WORLD.motto),
      floor: planksTexture(),
      about: boardTexture(
        'About me',
        [
          ['Name', WORLD.name],
          ['Studies at', `${WORLD.school} · ${WORLD.grade}`],
          ['Loves', WORLD.subjects.join(' · ')],
          ['Codes in', WORLD.languages.join(' · ')],
          ['Goal', WORLD.goals.career[1] ?? ''],
        ],
        '#b0627a',
      ),
      projects: boardTexture(
        'Projects',
        [
          ['Oncure · research concept', 'AI-guided nanobot cancer therapy: a concept, not a cure.'],
          ['AI stock trading app', 'An AI model suggests how much to buy, when to buy and when to sell. In progress.'],
          ['Peer tutoring', 'Tutored 7th and 8th graders in Math and Science.'],
        ],
        '#2f8f8a',
      ),
      recognition: boardTexture(
        'Recognition',
        [
          ['College Board', 'National Recognition Program award'],
          ['Principal’s Honors List', 'Fulton Science Academy, 2025 and 2026'],
          ['PSAT and MAP', '98th to 99th percentile'],
          ['Also', 'Project Arrow since 2nd grade · Young Authors winner 2023'],
        ],
        '#c9a24a',
      ),
      contact: boardTexture(
        'Get in touch',
        [
          ['Name', WORLD.contact.name],
          ['Phone', WORLD.contact.phone],
          ['Based in', WORLD.location],
          ['Email', WORLD.contact.email || 'To be supplied'],
        ],
        '#8a6a80',
      ),
    }),
    [],
  );
  const z0 = WALL_Z - 1;
  const back = z0 - ROOM_D;
  const fy = WIN.y - 4.2;
  const bz = back + 0.06;
  const deskZ = back + 5.5;
  const deskY = fy + 2.5;
  const L = -ROOM_W / 2;
  const R = ROOM_W / 2;
  const bookColors = ['#c44d3f', '#3f7d86', '#e0b04a', '#6d5a8c', '#2f5d8c', '#7a8f4e'];
  const fairy = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    return [-12 + t * 24, fy + 11.3 - Math.sin(t * Math.PI * 3) ** 2 * 0.6, bz + 0.3] as [number, number, number];
  });
  return (
    <group>
      {/* Shell: warm white walls, oak floor, ceiling */}
      <mesh position={[0, fy + 6, z0 - ROOM_D / 2]}>
        <boxGeometry args={[ROOM_W, 12, ROOM_D]} />
        <meshStandardMaterial color="#efe9e1" roughness={0.95} side={1} />
      </mesh>
      <mesh position={[0, fy + 0.02, z0 - ROOM_D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={tex.floor} roughness={0.45} metalness={0.05} />
      </mesh>
      {/* Wainscot panelling round the lower walls */}
      {[
        [0, bz + 0.02, ROOM_W, 0],
        [L + 0.04, z0 - ROOM_D / 2, ROOM_D, Math.PI / 2],
        [R - 0.04, z0 - ROOM_D / 2, ROOM_D, -Math.PI / 2],
      ].map(([x, z, len, ry], i) => (
        <mesh key={i} position={[x!, fy + 1.6, z!]} rotation={[0, ry!, 0]}>
          <planeGeometry args={[len!, 3.2]} />
          <meshStandardMaterial color="#2f3a4a" roughness={0.6} />
        </mesh>
      ))}
      {/* Ceiling: recessed lights and an LED cove */}
      {[-6, 0, 6].map((x) =>
        [-8, -18].map((dz) => (
          <mesh key={`${x}${dz}`} position={[x, fy + 11.95, z0 + dz]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 20]} />
            <meshBasicMaterial color="#fff4e0" toneMapped={false} />
          </mesh>
        )),
      )}
      <mesh position={[0, fy + 11.7, bz + 0.15]}>
        <boxGeometry args={[ROOM_W - 0.4, 0.08, 0.08]} />
        <meshBasicMaterial color="#ffd9a8" toneMapped={false} />
      </mesh>
      <mesh position={[0, fy + 0.05, deskZ + 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#5b4a6d" roughness={1} />
      </mesh>
      <mesh position={[0, fy + 0.06, deskZ + 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.4, 5.7, 48]} />
        <meshStandardMaterial color="#d9b77a" roughness={1} />
      </mesh>

      {/* Back wall: motto, achievements, journey, Oncure poster, today's date */}
      <mesh position={[0, fy + 10.2, bz]}>
        <planeGeometry args={[15, 2.3]} />
        <meshBasicMaterial map={tex.banner} transparent toneMapped={false} />
      </mesh>
      <Frame map={tex.psat} position={[-10, fy + 7.6, bz]} size={[3.2, 2.4]} />
      <Frame map={tex.authors} position={[-6.4, fy + 7.6, bz]} size={[3.2, 2.4]} />
      <Frame map={tex.med} position={[-8.2, fy + 4.8, bz]} size={[3.2, 2.4]} />
      <Frame map={tex.board} position={[4.6, fy + 7.2, bz]} size={[5.4, 3.4]} />
      <Frame map={tex.poster} position={[10.2, fy + 6.4, bz]} size={[3.6, 5.1]} />
      <Frame map={tex.cal} position={[-3.6, fy + 4.8, bz]} size={[2.6, 1.3]} />
      {fairy.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshBasicMaterial color={i % 2 ? '#ffd88a' : '#fff1c9'} toneMapped={false} />
        </mesh>
      ))}

      {/* Left wall: About me board, bookshelf, reading chair, floor lamp */}
      <Board map={tex.about} position={[L + 0.08, fy + 7, z0 - 21]} rotation={Math.PI / 2} size={[7.2, 5.1]} />
      <group position={[L + 0.1, fy + 7.2, z0 - 16]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[3.1, 4.2, 0.1]} />
          <meshStandardMaterial color="#c9a24a" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh>
          <planeGeometry args={[2.8, 3.9]} />
          <meshStandardMaterial color="#efe4d6" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.15, 0.01]}>
          <planeGeometry args={[2.6, 3.57]} />
          <meshBasicMaterial map={portrait} transparent toneMapped={false} />
        </mesh>
      </group>
      <group position={[L + 0.7, fy, z0 - 11]}>
        <mesh position={[0, 4.5, 0]}>
          <boxGeometry args={[1.2, 9, 7]} />
          <meshStandardMaterial color="#6b4430" roughness={0.6} />
        </mesh>
        {[1.5, 3.7, 5.9, 8.1].map((y, r) =>
          Array.from({ length: 10 }, (_, i) => (
            <mesh key={`${r}${i}`} position={[0.5, y + 0.65, -3 + i * 0.62]} rotation={[(i + r) % 4 === 0 ? 0.15 : 0, 0, 0]}>
              <boxGeometry args={[0.6, 1.2 + ((i + r) % 3) * 0.18, 0.5]} />
              <meshStandardMaterial color={bookColors[(i + r * 2) % bookColors.length]} roughness={0.7} />
            </mesh>
          )),
        )}
      </group>
      <group position={[L + 3.4, fy, z0 - 5.5]} rotation={[0, Math.PI / 2 + 0.4, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[2.6, 1, 2.4]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 2.2, -1]} castShadow>
          <boxGeometry args={[2.6, 2.2, 0.5]} />
          <meshStandardMaterial color="#c9a24a" roughness={0.85} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, 1.6, 0]}>
            <boxGeometry args={[0.35, 1, 2.4]} />
            <meshStandardMaterial color="#b58f3e" roughness={0.85} />
          </mesh>
        ))}
      </group>
      <group position={[L + 1.6, fy, z0 - 3]}>
        <mesh position={[0, 3, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 6, 8]} />
          <meshStandardMaterial color="#2d2c33" metalness={0.6} />
        </mesh>
        <mesh position={[0, 6.1, 0]}>
          <cylinderGeometry args={[0.6, 0.9, 1, 20, 1, true]} />
          <meshStandardMaterial color="#f3ead7" emissive="#ffd9a8" emissiveIntensity={0.7} side={2} />
        </mesh>
        <pointLight position={[0, 5.6, 0]} intensity={14} distance={14} color="#ffd6a0" />
      </group>
      <Plant position={[L + 1.4, fy, back + 1.6]} scale={1.3} />

      {/* Right wall: Projects board, a window onto the evening city, globe */}
      <Board map={tex.projects} position={[R - 0.08, fy + 7, z0 - 12]} rotation={-Math.PI / 2} size={[7.6, 5.4]} />
      <group position={[R - 0.06, fy + 6.6, z0 - 22.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[5.2, 4.6]} />
          <meshBasicMaterial color="#2a3a66" toneMapped={false} />
        </mesh>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} position={[-2.2 + (i % 7) * 0.72, -1.4 + Math.floor(i / 7) * 0.5 + ((i * 3) % 4) * 0.12, 0.01]}>
            <planeGeometry args={[0.18, 0.24]} />
            <meshBasicMaterial color="#ffd59a" toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[5.4, 0.18, 0.12]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.18, 4.8, 0.12]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
      </group>
      <group position={[R - 2.4, fy, z0 - 4]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.1, 0.4, 2.4, 10]} />
          <meshStandardMaterial color="#6b4430" />
        </mesh>
        <mesh position={[0, 3, 0]} rotation={[0, 0, 0.4]}>
          <sphereGeometry args={[0.85, 24, 18]} />
          <meshStandardMaterial color="#4f86b8" roughness={0.4} />
        </mesh>
      </group>
      <Plant position={[R - 1.4, fy, back + 1.6]} scale={1.1} />

      {/* Front wall (the window you came in by): Recognition and Get in touch */}
      <Board map={tex.recognition} position={[-7.6, fy + 6.6, z0 - 0.12]} rotation={Math.PI} size={[7.2, 5.1]} />
      <Board map={tex.contact} position={[7.6, fy + 6.6, z0 - 0.12]} rotation={Math.PI} size={[7.2, 5.1]} />

      {/* Desk */}
      <group position={[0, 0, deskZ]}>
        <mesh position={[0, deskY, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 0.24, 3.6]} />
          <meshStandardMaterial color="#8a5a42" roughness={0.4} />
        </mesh>
        {[-4.6, 4.6].map((x) => (
          <mesh key={x} position={[x, fy + 1.2, 0]} castShadow>
            <boxGeometry args={[0.25, 2.4, 3.2]} />
            <meshStandardMaterial color="#2d2c33" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[-0.6, deskY + 0.17, 0.3]}>
          <boxGeometry args={[2.6, 0.1, 1.7]} />
          <meshStandardMaterial color="#c9c6cc" metalness={0.6} roughness={0.35} />
        </mesh>
        <group position={[-0.6, deskY + 1.02, -0.55]} rotation={[-0.22, 0, 0]}>
          <mesh>
            <boxGeometry args={[2.6, 1.7, 0.06]} />
            <meshStandardMaterial color="#2a2c33" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[2.42, 1.52]} />
            <meshBasicMaterial map={tex.screen} toneMapped={false} />
          </mesh>
        </group>
        <group position={[-3.6, deskY + 0.12, 0.2]}>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.9, 0.16, 1.1]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.8, -0.35]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.22, 1.5, 0.3]} />
            <meshStandardMaterial color="#e9ecef" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.55, 0.05]}>
            <boxGeometry args={[0.7, 0.08, 0.6]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
          <mesh position={[0, 1.25, 0.05]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 0.9, 12]} />
            <meshStandardMaterial color="#2d2c33" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
        {bookColors.slice(0, 4).map((c, i) => (
          <mesh key={c} position={[2.6, deskY + 0.25 + i * 0.3, 0.2]} rotation={[0, i * 0.15, 0]} castShadow>
            <boxGeometry args={[1.6, 0.28, 1.1]} />
            <meshStandardMaterial color={c} roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[-2.2, deskY + 0.37, 1.1]}>
          <cylinderGeometry args={[0.2, 0.18, 0.5, 16]} />
          <meshStandardMaterial color="#c44d3f" roughness={0.5} />
        </mesh>
        <group position={[3.9, deskY + 0.12, 0.4]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.35, 0.4, 0.1, 16]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
          <mesh position={[-0.2, 0.8, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
          <mesh position={[-0.55, 1.55, 0.2]} rotation={[0.4, 0, 0.6]}>
            <coneGeometry args={[0.4, 0.6, 16, 1, true]} />
            <meshStandardMaterial color="#e0b04a" emissive="#ffcf86" emissiveIntensity={0.8} side={2} />
          </mesh>
          <pointLight position={[-0.7, 1.2, 0.5]} intensity={18} distance={14} color="#ffcf96" />
        </group>
        <group position={[6.2, fy, 3.6]} rotation={[0, -0.9, 0]}>
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[1.8, 0.25, 1.7]} />
            <meshStandardMaterial color="#2e4566" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3, 0.8]}>
            <boxGeometry args={[1.8, 2.4, 0.25]} />
            <meshStandardMaterial color="#2e4566" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 1.6, 8]} />
            <meshStandardMaterial color="#2d2c33" />
          </mesh>
        </group>
      </group>

      <pointLight position={[0, fy + 10, z0 - 9]} intensity={45} distance={40} color="#ffe2bf" />
      <pointLight position={[0, fy + 10, z0 - 22]} intensity={35} distance={36} color="#fff0dd" />
      <pointLight position={[0, fy + 9, bz + 2]} intensity={16} distance={20} color="#ffd88a" />
    </group>
  );
}

/** Tall pastel houses round the square, his house closing it at the far end. */
function touchHouses(): House[] {
  let seed = 61;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: House[] = [];
  for (const side of [-1, 1]) {
    for (let z = FINALE_Z + 80; z > HOUSE_Z - 20; ) {
      const w = 8 + rnd() * 4;
      out.push({ x: side * 49, z: z - w / 2, w, d: 10, h: 13 + rnd() * 9, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2, tint: rnd() });
      z -= w + 0.2;
    }
    for (let x = side * 21; Math.abs(x) < 44; ) {
      const w = 8 + rnd() * 4;
      out.push({ x: x + side * (w / 2), z: HOUSE_Z - 6, w, d: 12, h: 14 + rnd() * 9, ry: 0, tint: rnd() });
      x += side * (w + 0.2);
    }
  }
  return out;
}

/** A chrome double helix: biomedical science as the city's landmark. */
function Helix({ env }: { env: Texture }) {
  const chrome = useMemo(() => new MeshStandardMaterial({ color: '#e9eef5', metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.6 }), [env]);
  const rungMat = useMemo(() => new MeshStandardMaterial({ color: '#c9d4e2', metalness: 0.9, roughness: 0.2, envMap: env }), [env]);
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15;
  });
  const rungs = useMemo(() => {
    const up = new Vector3(0, 1, 0);
    return Array.from({ length: 18 }, (_, i) => {
      const y = 2 + i * 2.2;
      const a = i * 0.55;
      const p1 = new Vector3(Math.cos(a) * 6, y, Math.sin(a) * 6);
      const p2 = new Vector3(-Math.cos(a) * 6, y, -Math.sin(a) * 6);
      const q = new Quaternion().setFromUnitVectors(up, p2.clone().sub(p1).normalize());
      return { p1, p2, mid: p1.clone().add(p2).multiplyScalar(0.5), q };
    });
  }, []);
  return (
    <group>
      <mesh position={[0, 1, 0]} receiveShadow>
        <cylinderGeometry args={[9, 10, 2, 40]} />
        <meshStandardMaterial color="#eef2f7" roughness={0.6} />
      </mesh>
      <group ref={ref} position={[0, 2, 0]}>
        {rungs.map((r, i) => (
          <group key={i}>
            <mesh position={r.p1} material={chrome} castShadow>
              <sphereGeometry args={[1.5, 24, 16]} />
            </mesh>
            <mesh position={r.p2} material={chrome} castShadow>
              <sphereGeometry args={[1.5, 24, 16]} />
            </mesh>
            <mesh position={r.mid} quaternion={r.q} material={rungMat}>
              <cylinderGeometry args={[0.32, 0.32, 12, 10]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Floating glass panels with contact icons; clicking one opens it on screen. */
function ContactPanel({ icon, label, position, onOpen }: { icon: string; label: string; position: [number, number, number]; onOpen: () => void }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 400;
    const draw = () => {
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, 512, 400);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const grad = g.createLinearGradient(0, 60, 0, 300);
      grad.addColorStop(0, '#ffb3c1');
      grad.addColorStop(1, '#c9758c');
      g.fillStyle = grad;
      g.font = '700 200px "Arial Black", sans-serif';
      g.fillText(icon, 256, 170);
      g.fillStyle = '#ffffff';
      g.font = '400 42px "Michroma", sans-serif';
      g.fillText(label, 256, 350);
    };
    draw();
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    void document.fonts?.ready.then(() => {
      draw();
      t.needsUpdate = true;
    });
    return t;
  }, [icon, label]);
  const [hover, setHover] = useState(false);
  const ref = useRef<Group>(null);
  useEffect(() => {
    if (!hover) return;
    document.body.style.cursor = 'pointer';
    return () => void (document.body.style.cursor = '');
  }, [hover]);
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = position[1] + Math.sin(clock.elapsedTime * 0.8 + position[0]) * 0.4;
    g.scale.setScalar(MathUtils.lerp(g.scale.x, hover ? 1.1 : 1, 1 - Math.exp(-dt * 8)));
  });
  return (
    <group ref={ref} position={position}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <planeGeometry args={[8, 6.25]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} transparent opacity={hover ? 0.42 : 0.26} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[7.4, 5.8]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Plaza() {
  const umbrellas = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 0; i < 10; i++) out.push([(i < 5 ? -34 : 16) + (i % 5) * 4.5, FINALE_Z - 44 + (i % 2) * 5]);
    return out;
  }, []);
  return (
    <group>
      {umbrellas.map(([x, z], i) => (
        <group key={i} position={[x, GROUND, z]}>
          <mesh position={[0, 3.3, 0]} castShadow>
            <coneGeometry args={[2.2, 0.9, 12]} />
            <meshStandardMaterial color={i % 2 ? '#f2b6c4' : '#ffffff'} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 3.2, 6]} />
            <meshStandardMaterial color="#9a8f8a" />
          </mesh>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 0.08, 12]} />
            <meshStandardMaterial color="#e9e4dc" />
          </mesh>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[sd * 1.2, 0.6, 0]}>
              <boxGeometry args={[0.6, 1.2, 0.6]} />
              <meshStandardMaterial color="#e86f8a" />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: 14 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const z = FINALE_Z + 20 - Math.floor(i / 2) * 14;
        return (
          <group key={`t${i}`} position={[side * 37, GROUND, z]}>
            <mesh position={[0, 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.28, 3.6, 6]} />
              <meshStandardMaterial color="#6a5a66" />
            </mesh>
            <mesh position={[0, 4.6, 0]} rotation={[0, i, 0]} castShadow>
              <icosahedronGeometry args={[2.1, 0]} />
              <meshStandardMaterial color="#8fb37a" flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Finale({ onContact }: { onContact: (kind: 'phone' | 'email' | 'message') => void }) {
  const houses = useMemo(touchHouses, []);
  const env = useEnvMap();
  const wall = useMemo(() => wallWithWindow(HOUSE_W, 13), []);
  const paving = useMemo(() => {
    const t = pavingTexture();
    t.repeat.set(30, 40);
    return t;
  }, []);
  const depth = ROOM_D + 4;
  return (
    <group>
      {/* Bright square, paving and the surrounding ground */}
      <mesh position={[0, GROUND - 0.1, FINALE_Z - 40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1600, 1200]} />
        <meshStandardMaterial color="#c8d3c0" roughness={1} />
      </mesh>
      <mesh position={[0, GROUND - 0.05, FINALE_Z - 40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[84, 200]} />
        <meshStandardMaterial map={paving} color="#eef0f4" roughness={0.95} />
      </mesh>
      <Houses list={houses} style="touch" />
      <Plaza />
      <Traffic z={FINALE_Z + 30} len={300} count={6} />
      <Walkers paths={TOUCH_WALKERS} />
      <group position={[-24, GROUND, FINALE_Z - 28]}>
        <Helix env={env} />
      </group>
      <VoxelText lines={['GET IN TOUCH']} cube={0.5} colors={['#e98aa0', '#f2a9b8']} position={[4, GROUND, FINALE_Z - 66]} />
      <ContactPanel icon="✆" label="PHONE" position={[-12, 15, FINALE_Z - 20]} onOpen={() => onContact('phone')} />
      <ContactPanel icon="@" label="EMAIL" position={[0, 19, FINALE_Z - 22]} onOpen={() => onContact('email')} />
      <ContactPanel icon="✉" label="MESSAGE" position={[12, 15, FINALE_Z - 20]} onOpen={() => onContact('message')} />

      {/* His house closes the street: front wall with the lit window, side walls, roof */}
      <mesh geometry={wall} position={[0, GROUND, WALL_Z - 1]} castShadow receiveShadow>
        <meshStandardMaterial color="#e3e7f1" roughness={0.85} />
      </mesh>
      {/* Siding lines, other windows (some lit), shutters */}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={`sd${i}`} position={[0, GROUND + 0.6 + i * 1.05, WALL_Z + 0.02]}>
          <planeGeometry args={[HOUSE_W, 0.05]} />
          <meshBasicMaterial color="#c7cddb" />
        </mesh>
      ))}
      {(
        [
          [-9, WIN.y, true],
          [9, WIN.y, false],
          [-9, GROUND + 3.4, false],
          [-2, GROUND + 3.4, true],
        ] as [number, number, boolean][]
      ).map(([x, y, lit], i) => (
        <group key={`w${i}`} position={[x, y, WALL_Z + 0.05]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[3.6, 3.2]} />
            <meshStandardMaterial color="#f4f1ea" />
          </mesh>
          <mesh>
            <planeGeometry args={[3, 2.6]} />
            {lit ? <meshBasicMaterial color="#ffcf8a" toneMapped={false} /> : <meshStandardMaterial color="#2b3350" roughness={0.3} />}
          </mesh>
          {[-2.2, 2.2].map((sx) => (
            <mesh key={sx} position={[sx, 0, 0]}>
              <planeGeometry args={[1, 3.2]} />
              <meshStandardMaterial color="#3d4a6b" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Frame round the study window */}
      {[
        [0, WIN.y + WIN.h / 2 + 0.2, WIN.w + 0.8, 0.4],
        [-WIN.w / 2 - 0.2, WIN.y, 0.4, WIN.h + 0.4],
        [WIN.w / 2 + 0.2, WIN.y, 0.4, WIN.h + 0.4],
      ].map(([x, y, w, h], i) => (
        <mesh key={`f${i}`} position={[x!, y!, WALL_Z + 0.15]}>
          <boxGeometry args={[w!, h!, 0.3]} />
          <meshStandardMaterial color="#f4f1ea" />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (HOUSE_W / 2 - 0.5), GROUND + 6.5, WALL_Z - 1.2 - depth / 2]} castShadow>
          <boxGeometry args={[1, 13, depth]} />
          <meshStandardMaterial color="#dfe4ef" roughness={0.85} />
        </mesh>
      ))}
      <group position={[0, GROUND + 16.5, WALL_Z - depth / 2]} scale={[1, 1, depth / HOUSE_W]}>
        <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
          <cylinderGeometry args={[0.01, (HOUSE_W / 2 + 1.2) * Math.SQRT2, 7, 4, 1]} />
          <meshStandardMaterial color="#4b546e" flatShading />
        </mesh>
      </group>
      {/* Porch and door below the window */}
      <mesh position={[0, GROUND + 0.3, WALL_Z + 2]} receiveShadow>
        <boxGeometry args={[10, 0.6, 4]} />
        <meshStandardMaterial color="#c9cfe0" />
      </mesh>
      <mesh position={[6, GROUND + 2, WALL_Z + 0.06]}>
        <planeGeometry args={[2, 4]} />
        <meshStandardMaterial color="#7a3b33" />
      </mesh>
      <mesh position={[0, WIN.y - WIN.h / 2 - 0.25, WALL_Z + 0.4]}>
        <boxGeometry args={[WIN.w + 1, 0.4, 0.8]} />
        <meshStandardMaterial color="#f4f1ea" />
      </mesh>
      <pointLight position={[0, WIN.y, WALL_Z + 3]} intensity={22} distance={18} color="#ffc78a" />
      <Room />
    </group>
  );
}

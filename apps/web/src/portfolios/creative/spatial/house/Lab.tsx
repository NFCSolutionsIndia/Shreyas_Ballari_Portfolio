import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { appCalcTexture, appDashboardTexture, appStockTexture } from './Story3D';
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three';
import { B, Blob, Slab, canvasTexture, rng, useMats } from './kit';
import { LAB } from './layout';
import { Model } from './Model';
import { Monitor } from './props';

/**
 * The innovation lab (Oncure, a research CONCEPT: AI-guided nanobots for cancer therapy): white
 * benches, a microscope, glassware, glowing data screens, and at the centre a slowly turning
 * hologram of a cell with nanobots orbiting it.
 */

const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = LAB;
const HOLO: [number, number, number] = [-10.25, 0, -6.6];

const fresnelVert = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const fresnelFrag = /* glsl */ `
uniform vec3 uColor; uniform float uPower; uniform float uBase; uniform float uTime;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(vN, vV)), uPower);
  float pulse = 0.85 + 0.15 * sin(uTime * 1.3);
  gl_FragColor = vec4(uColor * (f * 0.6 + uBase) * pulse, 1.0);
}`;

function fresnel(color: string, power: number, base: number) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uPower: { value: power }, uBase: { value: base }, uTime: { value: 0 } },
    vertexShader: fresnelVert,
    fragmentShader: fresnelFrag,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
}

const BOTS = 26;

function Hologram() {
  const m = useMats();
  const spin = useRef<Group>(null);
  const bots = useRef<InstancedMesh>(null);
  const ring = useRef<Group>(null);
  const parts = useMemo(() => {
    const r = rng(42);
    const orbit = Array.from({ length: BOTS }, () => ({ r: 0.42 + r() * 0.16, speed: 0.25 + r() * 0.35, phase: r() * Math.PI * 2, tilt: (r() - 0.5) * 2.4, yaw: r() * Math.PI * 2 }));
    const membrane = new IcosahedronGeometry(0.34, 5);
    // A gently lumpy membrane
    const p = membrane.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const k = 1 + 0.05 * Math.sin(x * 14 + y * 6) * Math.cos(z * 11 - y * 4);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    membrane.computeVertexNormals();
    return {
      orbit,
      membrane,
      nucleus: new SphereGeometry(0.11, 32, 16),
      wire: new IcosahedronGeometry(0.4, 1),
      bot: new OctahedronGeometry(0.018, 0),
      receptors: new IcosahedronGeometry(0.012, 0),
      ringGeo: new TorusGeometry(0.5, 0.0035, 6, 96),
      mats: {
        membrane: fresnel('#5fd4ff', 2.6, 0.02),
        nucleus: fresnel('#ff5fa8', 1.2, 0.25),
        wire: new MeshStandardMaterial({ color: '#000', emissive: '#7fe3ff', emissiveIntensity: 0.9, wireframe: true, transparent: true, opacity: 0.25, depthWrite: false }),
        bot: new MeshStandardMaterial({ color: '#000', emissive: '#ffe08a', emissiveIntensity: 3 }),
        ring: new MeshStandardMaterial({ color: '#000', emissive: '#7fe3ff', emissiveIntensity: 2.5, transparent: true, opacity: 0.8 }),
        beam: fresnel('#4cc8ff', 3, 0.0),
      },
    };
  }, []);
  const tmp = useMemo(() => ({ o: new Object3D() }), []);
  useLayoutEffect(() => {
    if (bots.current) bots.current.frustumCulled = false;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * 0.22;
    for (const mt of [parts.mats.membrane, parts.mats.nucleus, parts.mats.beam]) mt.uniforms.uTime!.value = t;
    if (ring.current) {
      ring.current.position.y = Math.sin(t * 0.7) * 0.32;
      const s = Math.sqrt(Math.max(0.05, 1 - (ring.current.position.y / 0.5) ** 2));
      ring.current.scale.set(s * 0.9, 1, s * 0.9);
    }
    const mesh = bots.current;
    if (!mesh) return;
    const { o } = tmp;
    parts.orbit.forEach((b, i) => {
      const a = b.phase + t * b.speed;
      o.position.set(Math.cos(a) * b.r, 0, Math.sin(a) * b.r);
      o.position.applyAxisAngle(AX_X, b.tilt);
      o.position.applyAxisAngle(AX_Y, b.yaw);
      o.rotation.set(t * 2 + i, t * 1.5, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={HOLO}>
      {/* Projector base */}
      <mesh position={[0, 0.45, 0]} geometry={BASE} material={m.white} castShadow receiveShadow />
      <mesh position={[0, 0.905, 0]} rotation={[-Math.PI / 2, 0, 0]} material={parts.mats.ring}>
        <ringGeometry args={[0.2, 0.235, 64]} />
      </mesh>
      <mesh position={[0, 0.906, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.screenOff}>
        <circleGeometry args={[0.2, 48]} />
      </mesh>
      <mesh position={[0, 1.16, 0]} geometry={BEAM} material={parts.mats.beam} />
      <group position={[0, 1.55, 0]}>
        <group ref={spin}>
          <mesh geometry={parts.membrane} material={parts.mats.membrane} />
          <mesh geometry={parts.nucleus} material={parts.mats.nucleus} position={[0.04, 0.02, 0]} />
          <mesh geometry={parts.wire} material={parts.mats.wire} rotation={[0.4, 0, 0.2]} />
        </group>
        <instancedMesh ref={bots} args={[parts.bot, parts.mats.bot, BOTS]} />
        <group ref={ring}>
          <mesh geometry={parts.ringGeo} material={parts.mats.ring} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      </group>
      <pointLight position={[0, 1.55, 0]} color="#6fd8ff" intensity={3.5} distance={4.5} decay={2} />
      <Blob p={[0, 0]} s={[1.2, 1.2]} />
    </group>
  );
}

const AX_X = new Vector3(1, 0, 0);
const AX_Y = new Vector3(0, 1, 0);
const BASE = new CylinderGeometry(0.32, 0.38, 0.9, 48);
const BEAM = new CylinderGeometry(0.26, 0.2, 0.5, 48, 1, true);

function dataScreen(seed: number, hue: string) {
  return canvasTexture(640, 360, (g) => {
    const r = rng(seed);
    g.fillStyle = '#071019';
    g.fillRect(0, 0, 640, 360);
    g.strokeStyle = 'rgba(120,200,255,0.12)';
    g.lineWidth = 1;
    for (let x = 0; x < 640; x += 32) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, 360);
      g.stroke();
    }
    for (let y = 0; y < 360; y += 32) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(640, y);
      g.stroke();
    }
    // A cell with targets
    g.strokeStyle = hue;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(170, 180, 110, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(255,95,168,0.55)';
    g.beginPath();
    g.arc(185, 170, 38, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      g.fillStyle = '#ffe08a';
      g.beginPath();
      g.arc(170 + Math.cos(a) * (120 + r() * 30), 180 + Math.sin(a) * (120 + r() * 30), 5, 0, Math.PI * 2);
      g.fill();
    }
    // Charts
    g.strokeStyle = '#7fe3ff';
    g.lineWidth = 2.5;
    g.beginPath();
    let y = 120;
    for (let x = 340; x < 620; x += 8) {
      y = Math.max(40, Math.min(150, y + (r() - 0.48) * 22));
      if (x === 340) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    for (let i = 0; i < 12; i++) {
      const h = 20 + r() * 110;
      g.fillStyle = i % 3 ? 'rgba(127,227,255,0.6)' : 'rgba(255,224,138,0.75)';
      g.fillRect(345 + i * 22, 330 - h, 14, h);
    }
  });
}

const FLASK = new LatheGeometry(
  [
    [0.0, 0],
    [0.06, 0],
    [0.065, 0.01],
    [0.04, 0.09],
    [0.016, 0.13],
    [0.016, 0.18],
    [0.019, 0.185],
  ].map(([r, y]) => new Vector2(r, y)),
  28,
);
const TUBE = new CylinderGeometry(0.009, 0.009, 0.12, 12);

export function Lab() {
  const m = useMats();
  // His trading app (concept screens) on the monitors; the wall screen plays his Oncure video (Story3D).
  const tex = useMemo(() => [appDashboardTexture(), appStockTexture(), dataScreen(3, '#7fe3ff'), appCalcTexture()], []);
  const mats = useMemo(
    () => ({
      top: new MeshStandardMaterial({ color: '#fafafa', roughness: 0.25 }),
      front: new MeshStandardMaterial({ color: '#eceef0', roughness: 0.45 }),
      glass: new MeshPhysicalMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.28, roughness: 0.05, envMapIntensity: 1.6, side: DoubleSide, depthWrite: false }),
      liquid: [new MeshStandardMaterial({ color: '#000', emissive: '#4fd1ff', emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }), new MeshStandardMaterial({ color: '#000', emissive: '#ff6fae', emissiveIntensity: 0.8, transparent: true, opacity: 0.85 })],
      wall: new MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: tex[2]!, emissiveIntensity: 1.2 }),
    }),
    [tex],
  );
  const benchH = 0.9;
  return (
    <group>
      <Slab p={[(X0 + X1) / 2, -0.05, (Z0 + Z1) / 2]} s={[X1 - X0, 0.1, Z1 - Z0]} m={m.concrete} tile={3} cast={false} />
      {/* West bench (under the window) */}
      <Slab p={[X0 + 0.38, benchH / 2, (Z0 + Z1) / 2]} s={[0.72, benchH - 0.04, Z1 - Z0 - 0.3]} m={mats.front} tile={2} />
      <B p={[X0 + 0.4, benchH - 0.015, (Z0 + Z1) / 2]} s={[0.78, 0.03, Z1 - Z0 - 0.26]} m={mats.top} />
      <B p={[X0 + 0.745, 0.05, (Z0 + Z1) / 2]} s={[0.02, 0.1, Z1 - Z0 - 0.3]} m={m.black} cast={false} />
      {Array.from({ length: 6 }, (_, i) => (
        <B key={i} p={[X0 + 0.745, 0.72, Z0 + 0.45 + i * 0.7]} s={[0.012, 0.012, 0.3]} m={m.black} cast={false} />
      ))}
      <Model id="industrial_microscope" position={[X0 + 0.42, benchH, -7.9]} rotation={Math.PI / 2} />
      <Monitor position={[X0 + 0.32, benchH, -5.15]} rotation={Math.PI / 2 - 0.2} tex={tex[3]!} w={0.74} h={0.43} />
      {/* Glassware */}
      {[
        [-7.25, 0],
        [-7.05, 1],
        [-6.75, 0],
      ].map(([z, k]) => (
        <group key={z} position={[X0 + 0.45, benchH, z!]}>
          <mesh geometry={FLASK} material={mats.glass} />
          <mesh position={[0, 0.03, 0]} scale={[0.85, 0.5, 0.85]} geometry={FLASK} material={mats.liquid[k!]} />
        </group>
      ))}
      <group position={[X0 + 0.45, benchH, -6.2]}>
        <B p={[0, 0.03, 0]} s={[0.08, 0.06, 0.3]} m={m.white} />
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[0, 0.08, -0.12 + i * 0.048]} geometry={TUBE} material={mats.liquid[i % 2]!} />
        ))}
      </group>
      {/* North bench with screens, a wall display above */}
      <Slab p={[(X0 + 0.8 + X1 - 0.9) / 2, benchH / 2, Z0 + 0.36]} s={[X1 - X0 - 1.7, benchH - 0.04, 0.68]} m={mats.front} tile={2} />
      <B p={[(X0 + 0.8 + X1 - 0.9) / 2, benchH - 0.015, Z0 + 0.38]} s={[X1 - X0 - 1.66, 0.03, 0.74]} m={mats.top} />
      <Monitor position={[-10.6, benchH, Z0 + 0.25]} tex={tex[1]!} w={0.74} h={0.43} />
      <Monitor position={[-9.75, benchH, Z0 + 0.28]} rotation={-0.25} tex={tex[0]!} w={0.74} h={0.43} />
      <B p={[-10.1, 1.95, Z0 + 0.03]} s={[1.9, 1.07, 0.04]} m={m.black} />
      <mesh position={[-10.1, 1.95, Z0 + 0.052]} scale={[1.84, 1.01, 1]} material={mats.wall}>
        <planeGeometry />
      </mesh>
      <Model id="metal_stool_01" position={[-10.6, 0, Z0 + 1.05]} />
      <Model id="metal_stool_01" position={[-9.6, 0, Z0 + 1.05]} rotation={0.6} />
      <Blob p={[(X0 + X1) / 2, Z0 + 0.4]} s={[4.4, 1.2]} />
      <Blob p={[X0 + 0.4, (Z0 + Z1) / 2]} s={[1.2, 4.6]} />
      {/* Ceiling light panels */}
      {[-11.3, -9.0].map((x) => (
        <B key={x} p={[x, 3.19, (Z0 + Z1) / 2]} s={[0.6, 0.02, 2.6]} m={m.coolGlow} cast={false} />
      ))}
      <Hologram />
      <Model id="calathea_orbifolia_01" pick={0} position={[X1 - 0.35, 0, Z1 - 0.35]} />
    </group>
  );
}

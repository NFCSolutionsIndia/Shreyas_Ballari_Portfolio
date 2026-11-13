import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  Points,
  Shape,
  ShaderMaterial,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { F, seg, smooth } from './timeline';

/**
 * The 3D layer of the scroll story: a breathing sphere of particles (white to violet) that grows
 * inside the black star, then bursts into drifting dust; and, at the end, a chrome four-point
 * star turning beside the closing call to action.
 */

const N = 14000;

const VERT = /* glsl */ `
uniform float uTime;
uniform float uBurst;
uniform float uSize;
attribute float aRand;
varying float vShade;
varying float vRand;
// Cheap smooth noise from a few sines.
float n3(vec3 p) {
  return sin(p.x * 2.1 + uTime * 0.7) * sin(p.y * 2.6 - uTime * 0.5) * sin(p.z * 2.3 + uTime * 0.6);
}
void main() {
  vec3 dir = normalize(position);
  float wob = n3(dir * 2.0) * 0.16 + n3(dir * 4.0 + 1.7) * 0.06;
  float r = 1.0 + wob;
  // The burst throws every point outwards at its own speed, then lets it drift.
  float fly = uBurst * (1.5 + aRand * 5.5);
  vec3 p = dir * (r + fly);
  p += vec3(sin(uTime * 0.3 + aRand * 20.0), cos(uTime * 0.25 + aRand * 13.0), sin(uTime * 0.2 + aRand * 7.0)) * uBurst * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.6 + aRand * 0.8) * (3.0 / -mv.z);
  vShade = dir.x * 0.5 + 0.5;
  vRand = aRand;
}
`;
const FRAG = /* glsl */ `
uniform float uAlpha;
varying float vShade;
varying float vRand;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  vec3 white = vec3(0.95, 0.93, 1.0);
  vec3 violet = vec3(0.78, 0.3, 1.0);
  vec3 col = mix(violet, white, smoothstep(0.25, 0.9, vShade));
  float a = (1.0 - d * 2.0) * uAlpha * (0.8 + vRand * 0.7);
  gl_FragColor = vec4(col, a);
}
`;

function Sphere({ p }: { p: MutableRefObject<number> }) {
  const ref = useRef<Points>(null);
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry();
    const pos = new Float32Array(N * 3);
    const rnd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      // Even spread over the sphere (golden spiral).
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      pos.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3);
      rnd[i] = Math.random();
    }
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aRand', new BufferAttribute(rnd, 1));
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uBurst: { value: 0 }, uAlpha: { value: 0 }, uSize: { value: 3.2 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const { size } = useThree();
  useFrame((state) => {
    const t = p.current;
    const pts = ref.current;
    if (!pts) return;
    const grow = smooth(seg(t, F.star[0] + 0.01, F.star[1]));
    const burst = smooth(seg(t, F.burst[0], F.burst[1]));
    const gone = seg(t, F.detail[1] - 0.012, F.detail[1]);
    const on = grow > 0 && gone < 1;
    pts.visible = on;
    if (!on) return;
    const u = mat.uniforms;
    u.uTime!.value = state.clock.elapsedTime;
    u.uBurst!.value = burst;
    u.uAlpha!.value = grow * (1 - burst * 0.55) * (1 - gone);
    u.uSize!.value = (size.width < 700 ? 3 : 4.2) * Math.min(2, state.viewport.dpr);
    const s = 0.35 + grow * 0.85 + burst * 0.4;
    pts.scale.setScalar(s);
    pts.rotation.y = state.clock.elapsedTime * 0.12 + t * 4;
    pts.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}

// --- Light ribbons behind the details (after the Cortex hero) --------------------------------------

const RIB_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
`;
const RIB_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 p = vUv;
  vec3 col = vec3(0.0);
  // Strands of light, flowing down and twisting around a centre line on the right.
  for (int i = 0; i < 14; i++) {
    float f = float(i);
    float y = p.y * 2.2;
    float x0 = 0.68 + 0.07 * sin(y * 1.7 + uTime * 0.35 + f * 0.9) + 0.035 * sin(y * 4.3 - uTime * 0.6 + f * 2.1);
    float w = 0.0025 + 0.004 * (0.5 + 0.5 * sin(f * 3.7 + y * 2.0 + uTime * 0.4));
    float d = abs((p.x - x0) * uAspect);
    float g = w / (d + w * 0.6);
    vec3 tint = mix(vec3(0.35, 0.45, 1.0), vec3(0.85, 0.55, 1.0), 0.5 + 0.5 * sin(f * 1.3 + y));
    col += tint * g * 0.11;
  }
  // A bright core where the strands gather.
  float core = exp(-pow((p.x - 0.68) * uAspect * 7.0, 2.0)) * (0.35 + 0.25 * sin(p.y * 6.0 + uTime));
  col += vec3(0.9, 0.92, 1.0) * core * 0.35;
  col = min(col, vec3(1.4));
  gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0) * uAlpha);
}
`;

function Ribbons({ p }: { p: MutableRefObject<number> }) {
  const ref = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: RIB_VERT,
        fragmentShader: RIB_FRAG,
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uAspect: { value: 1 } },
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    const t = p.current;
    const a = Math.min(seg(t, F.detail[0], F.detail[0] + 0.02), 1 - seg(t, F.detail[1] - 0.015, F.detail[1]));
    const m = ref.current;
    if (!m) return;
    m.visible = a > 0;
    if (!m.visible) return;
    mat.uniforms.uTime!.value = state.clock.elapsedTime;
    mat.uniforms.uAlpha!.value = a;
    mat.uniforms.uAspect!.value = state.size.width / state.size.height;
  });
  return (
    <mesh ref={ref} material={mat} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** A four-point star (concave sides), extruded and bevelled. */
function starShape(r: number, inner: number) {
  const s = new Shape();
  const pts = 4;
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else {
      const m = a - Math.PI / pts;
      s.quadraticCurveTo(Math.cos(m) * inner, Math.sin(m) * inner, x, y);
    }
  }
  return s;
}

function ChromeStar({ p }: { p: MutableRefObject<number> }) {
  const group = useRef<Group>(null);
  const { gl, scene } = useThree();
  const { geo, mat } = useMemo(() => {
    const g = new ExtrudeGeometry(starShape(1.25, 0.16), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 10, curveSegments: 48 });
    g.center();
    const m = new MeshStandardMaterial({ color: '#f4f2ff', metalness: 1, roughness: 0.12 });
    return { geo: g, mat: m };
  }, []);
  // A soft studio reflection for the chrome, built in code (no download).
  useEffect(() => {
    const pm = new PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      env.dispose();
      pm.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const { viewport } = useThree();
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const k = smooth(seg(p.current, F.cta[0] + 0.02, F.cta[0] + 0.08));
    g.visible = k > 0;
    if (!g.visible) return;
    const narrow = viewport.width < viewport.height;
    g.position.set(narrow ? viewport.width * 0.12 : viewport.width * 0.27, narrow ? -viewport.height * 0.24 : -0.05, 0);
    const sc = (narrow ? 0.55 : 0.95) * (0.6 + k * 0.4);
    g.scale.setScalar(sc);
    g.rotation.set(0.35 + Math.sin(state.clock.elapsedTime * 0.4) * 0.12, -0.6 + state.clock.elapsedTime * 0.25 + (1 - k) * 1.5, 0.3);
  });
  return (
    <group ref={group}>
      <mesh geometry={geo} material={mat} />
      <pointLight position={[2, 2, 3]} intensity={30} color="#c9a6ff" />
      <pointLight position={[-3, -1, 2]} intensity={20} color="#7d5cff" />
    </group>
  );
}

export default function FlowCanvas({ progress, active }: { progress: MutableRefObject<number>; active: boolean }) {
  return (
    <Canvas
      className="fl-canvas"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      frameloop={active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 35 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.3} />
      <Ribbons p={progress} />
      <Sphere p={progress} />
      <ChromeStar p={progress} />
    </Canvas>
  );
}


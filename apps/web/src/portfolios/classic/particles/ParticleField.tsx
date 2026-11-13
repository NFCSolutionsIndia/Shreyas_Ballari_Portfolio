import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  NearestFilter,
  NormalBlending,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
  type Points as ThreePoints,
} from 'three';
import { buildFormation, FORMATIONS, type Ctx } from './formations';

/**
 * The global particle engine: ONE THREE.Points that lives for the whole page. Every section's
 * formation is a pair of float textures (position + size, colour + alpha); the vertex shader
 * morphs between the current and the next formation as the page scrolls, with per-particle
 * delays, flowing turbulence, depth, an intro where streams pour in from every edge, and a
 * gentle push away from the pointer. All per-particle work happens on the GPU.
 */

export interface FieldState {
  /** Section index of formation A, formation B, mix 0–1, and world y offsets. */
  a: number;
  b: number;
  mix: number;
  offA: number;
  offB: number;
  /** Pointer in normalised device coords (−1…1). */
  mouse: Vector2;
  ripple: number;
  /** Set when a formation is (re)built, to report progress. */
  ready: number;
}

const FOV = 40;
const CAM_Z = 14;
const TEX_W = 256;

const vertex = /* glsl */ `
  uniform sampler2D uPosA; uniform sampler2D uPosB; uniform sampler2D uColA; uniform sampler2D uColB;
  uniform sampler2D uPosA2; uniform sampler2D uColA2; uniform float uSwap;
  uniform float uDriftA; uniform float uDriftB; uniform float uDriftXA; uniform float uDriftXB;
  uniform float uMix; uniform float uOffA; uniform float uOffB; uniform float uTime; uniform float uIntro;
  uniform float uTurb; uniform float uSize; uniform float uPR; uniform float uRipple;
  uniform float uMarqA; uniform float uMarqB; uniform float uLenA; uniform float uLenB;
  uniform float uHalfW; uniform float uHalfH; uniform vec2 uMouse; uniform float uRepel;
  attribute vec2 aRef; attribute vec4 aRand;
  varying vec4 vCol;
  varying float vPx;

  vec3 flow(vec3 p) {
    return vec3(sin(p.y * 1.3 + uTime * 0.4) + sin(p.z * 0.7 + uTime * 0.2),
                sin(p.z * 1.1 + uTime * 0.3) + sin(p.x * 0.9),
                sin(p.x * 1.2 - uTime * 0.35) + sin(p.y * 0.6));
  }
  float wrapX(float x, float L) { return mod(x + L * 0.5, L) - L * 0.5; }

  void main() {
    vec4 a = texture2D(uPosA, aRef);
    vec4 b = texture2D(uPosB, aRef);
    vec4 ca = texture2D(uColA, aRef);
    vec4 cb = texture2D(uColB, aRef);
    // In-section rebuild (a new capability or step): the current formation re-forms in place.
    if (uSwap > 0.0) {
      float sd = aRand.y * 0.4;
      float st = smoothstep(sd, sd + 0.6, uSwap);
      vec4 a2 = texture2D(uPosA2, aRef);
      vec3 mid = mix(a.xyz, a2.xyz, st) + vec3(sin(aRand.x * 40.0), cos(aRand.z * 40.0), aRand.w - 0.5) * sin(st * 3.14159) * 1.2;
      a = vec4(mid, mix(a.w, a2.w, st));
      ca = mix(ca, texture2D(uColA2, aRef), st);
    }
    // Drift: on the far side of the portrait a few particles peel away like smoke and fade.
    float driftFade = 1.0;
    if (uDriftA > 0.0 && a.x > uDriftXA && aRand.w > 0.8) {
      float ph = fract(uTime * 0.05 + aRand.y * 7.0);
      a.x += ph * ph * 6.0;
      a.y += sin(ph * 6.0 + aRand.z * 10.0) * 0.25 * ph + ph * 0.6;
      a.z += ph * 1.5;
      driftFade = 1.0 - ph;
    }
    if (uLenA > 0.0) a.x = wrapX(a.x - uTime * uMarqA, uLenA);
    if (uLenB > 0.0) b.x = wrapX(b.x - uTime * uMarqB, uLenB);
    a.y += uOffA;
    b.y += uOffB;

    // Each particle leaves at its own moment, so formations dissolve and rebuild in waves.
    float d = aRand.x * 0.42;
    float t = smoothstep(d, d + 0.58, uMix);
    vec3 p = mix(a.xyz, b.xyz, t);
    float fly = sin(t * 3.14159);
    p += flow(p * 0.35 + aRand.yzw * 3.0) * fly * uTurb * (0.35 + aRand.y);
    p.z += fly * (aRand.z - 0.5) * 6.0 * uTurb;
    // Always alive: a slow breathing drift. Spatially coherent, so neighbours move together and
    // dense formations (the portrait) never open gaps.
    p += flow(p * 0.6) * 0.03;

    // Intro: streams pour in from the four edges and curl into place.
    if (uIntro < 1.0) {
      float e = floor(aRand.w * 4.0);
      float along = (aRand.y - 0.5) * 2.0;
      vec3 s = e < 1.0 ? vec3(-uHalfW * 1.5, along * uHalfH, -aRand.z * 4.0)
             : e < 2.0 ? vec3(uHalfW * 1.5, along * uHalfH, -aRand.z * 4.0)
             : e < 3.0 ? vec3(along * uHalfW, uHalfH * 1.5, -aRand.z * 4.0)
             : vec3(along * uHalfW, -uHalfH * 1.5, -aRand.z * 4.0);
      float ti = smoothstep(aRand.x * 0.55, aRand.x * 0.55 + 0.45, uIntro);
      vec3 mid = mix(s, p, 0.5) + flow(s * 0.3) * 1.6;
      p = mix(mix(s, mid, ti), mix(mid, p, ti), ti);
    }

    // Pointer: particles part around the cursor (stronger on a ripple).
    vec2 dm = p.xy - uMouse;
    float dist = length(dm);
    p.xy += dm / (dist + 0.001) * exp(-dist * dist * 1.6 / uRepel) * (0.32 + uRipple * 0.9) * uRepel;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = mix(a.w, b.w, t);
    gl_PointSize = size * uSize * uPR * (${CAM_Z.toFixed(1)} / -mv.z) * (1.0 + fly * 0.6);
    vPx = gl_PointSize;
    vCol = mix(ca, cb, t);
    vCol.a *= mix(driftFade, 1.0, t);
    vCol.a *= mix(1.0, smoothstep(0.0, 0.35, uIntro), step(uIntro, 0.999));
  }
`;

const fragment = /* glsl */ `
  varying vec4 vCol;
  varying float vPx;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 && vPx > 3.0) discard;
    // Tiny points tile as solid squares (a round mask leaves dark gaps); larger ones stay round.
    float a = mix(1.0, smoothstep(0.5, 0.3, d), smoothstep(3.0, 5.0, vPx)) * vCol.a;
    gl_FragColor = vec4(vCol.rgb, a);
  }
`;

function makeTex(data: Float32Array, N: number) {
  const t = new DataTexture(data, TEX_W, N / TEX_W, RGBAFormat, FloatType);
  t.minFilter = t.magFilter = NearestFilter;
  t.needsUpdate = true;
  return t;
}

interface FieldProps {
  state: RefObject<FieldState>;
  N: number;
  reduced: boolean;
  sections: RefObject<HTMLElement[]>;
  choice: RefObject<{ cap: number; step: number }>;
  onBuilt: (done: number, total: number) => void;
}

function Field({ state, N, reduced, sections, choice, onBuilt }: FieldProps) {
  const { size, gl, camera } = useThree();
  const points = useRef<ThreePoints>(null);
  const textures = useRef<{ pos: DataTexture; col: DataTexture }[]>([]);
  const intro = useRef(reduced ? 1 : 0);
  const swap = useRef<{ index: number; tex: { pos: DataTexture; col: DataTexture }; t: number } | null>(null);
  const introStart = useRef(-1);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const ref = new Float32Array(N * 2);
    const rand = new Float32Array(N * 4);
    const rows = N / TEX_W;
    for (let i = 0; i < N; i++) {
      ref[i * 2] = ((i % TEX_W) + 0.5) / TEX_W;
      ref[i * 2 + 1] = (Math.floor(i / TEX_W) + 0.5) / rows;
      for (let k = 0; k < 4; k++) rand[i * 4 + k] = Math.random();
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aRef', new BufferAttribute(ref, 2));
    g.setAttribute('aRand', new BufferAttribute(rand, 4));
    return g;
  }, [N]);

  const material = useMemo(() => {
    const empty = makeTex(new Float32Array(N * 4), N);
    return new ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uPosA: { value: empty },
        uPosB: { value: empty },
        uColA: { value: empty },
        uColB: { value: empty },
        uMix: { value: 0 },
        uOffA: { value: 0 },
        uOffB: { value: 0 },
        uTime: { value: 0 },
        uIntro: { value: intro.current },
        uTurb: { value: reduced ? 0 : 1 },
        uSize: { value: 2.3 },
        uPR: { value: 1 },
        uRipple: { value: 0 },
        uMarqA: { value: 0 },
        uMarqB: { value: 0 },
        uLenA: { value: 0 },
        uLenB: { value: 0 },
        uHalfW: { value: 1 },
        uHalfH: { value: 1 },
        uMouse: { value: new Vector2(99, 99) },
        uPosA2: { value: empty },
        uColA2: { value: empty },
        uSwap: { value: 0 },
        uDriftA: { value: 0 },
        uDriftB: { value: 0 },
        uDriftXA: { value: 0 },
        uDriftXB: { value: 0 },
        uRepel: { value: 1 },
      },
    });
  }, [N, reduced]);

  // Build every formation from the DOM slots: the current section first, the rest when idle.
  useEffect(() => {
    let cancelled = false;
    const H = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);
    const W = H * (size.width / size.height);
    material.uniforms.uHalfW!.value = W / 2;
    material.uniforms.uHalfH!.value = H / 2;
    material.uniforms.uPR!.value = gl.getPixelRatio();
    material.uniforms.uSize!.value = size.width < 700 ? 3.0 : size.width < 1100 ? 2.6 : 2.2;
    const mobile = size.width < 820;
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}assets/shreyas/portrait.png`;
    const makeCtx = (i: number): Ctx => {
      const sec = (sections.current ?? []).find((x) => x.id === FORMATIONS[i]!.id);
      return {
        N,
        W,
        H,
        mobile,
        pxPerUnit: size.height / H,
        baseSize: material.uniforms.uSize!.value as number,
        portrait: img.complete && img.naturalWidth ? img : null,
        choice: { ...(choice.current ?? { cap: 0, step: 0 }) },
        slot: (id) => {
          const el = sec?.querySelector<HTMLElement>(`[data-slot="${id}"]`);
          if (!el || !sec) return null;
          const r = el.getBoundingClientRect();
          const sr = sec.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top - sr.top + r.height / 2;
          return { x: (cx / size.width - 0.5) * W, y: (0.5 - cy / size.height) * H, w: (r.width / size.width) * W, h: (r.height / size.height) * H };
        },
      };
    };
    // Rebuild one formation (a capability or process step changed) and morph to it in place.
    const onRebuild = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const i = FORMATIONS.findIndex((f) => f.id === id);
      if (i < 0 || !textures.current.length) return;
      const f = buildFormation(FORMATIONS[i]!, makeCtx(i), i);
      const fresh = { pos: makeTex(f.pos, N), col: makeTex(f.col, N) };
      swap.current = { index: i, tex: fresh, t: 0 };
    };
    window.addEventListener('pf-rebuild', onRebuild);
    const build = async () => {
      await Promise.all([img.decode().catch(() => undefined), document.fonts?.ready]);
      if (cancelled) return;
      const old = textures.current;
      const next: { pos: DataTexture; col: DataTexture }[] = [];
      const order = FORMATIONS.map((_, i) => i).sort((x, y) => Math.abs(x - (state.current?.a ?? 0)) - Math.abs(y - (state.current?.a ?? 0)));
      for (const i of order) {
        if (cancelled) return;
        const f = buildFormation(FORMATIONS[i]!, makeCtx(i), i);
        next[i] = { pos: makeTex(f.pos, N), col: makeTex(f.col, N) };
        textures.current = FORMATIONS.map((_, k) => next[k] ?? old[k] ?? next[i]!);
        onBuilt(next.filter(Boolean).length, FORMATIONS.length);
        // Yield so the page stays responsive while the rest are built.
        await new Promise((r) => setTimeout(r, 0));
      }
      old.forEach((t) => {
        t.pos.dispose();
        t.col.dispose();
      });
    };
    const id = window.setTimeout(build, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      window.removeEventListener('pf-rebuild', onRebuild);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, N, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      textures.current.forEach((t) => {
        t.pos.dispose();
        t.col.dispose();
      });
    },
    [geometry, material],
  );

  const cam = useRef(new Vector2());
  useFrame(({ clock }, dt) => {
    const s = state.current;
    const u = material.uniforms;
    const tex = textures.current;
    if (!s || !tex.length) return;
    const A = tex[s.a] ?? tex[0]!;
    const B = tex[s.b] ?? A;
    u.uPosA!.value = A.pos;
    u.uColA!.value = A.col;
    u.uPosB!.value = B.pos;
    u.uColB!.value = B.col;
    u.uMix!.value = s.mix;
    const sw = swap.current;
    if (sw) {
      sw.t = Math.min(1, sw.t + dt / (reduced ? 0.01 : 1.1));
      if (sw.index === s.a) {
        u.uPosA2!.value = sw.tex.pos;
        u.uColA2!.value = sw.tex.col;
        u.uSwap!.value = sw.t;
      }
      if (sw.t >= 1 || sw.index !== s.a) {
        const old = tex[sw.index];
        tex[sw.index] = sw.tex;
        old?.pos.dispose();
        old?.col.dispose();
        swap.current = null;
        u.uSwap!.value = 0;
      }
    } else u.uSwap!.value = 0;
    const da = FORMATIONS[s.a]?.drift;
    const db = FORMATIONS[s.b]?.drift;
    u.uDriftA!.value = da && !reduced ? 1 : 0;
    u.uDriftB!.value = db && !reduced ? 1 : 0;
    u.uDriftXA!.value = da?.x ?? 0;
    u.uDriftXB!.value = db?.x ?? 0;
    u.uOffA!.value = s.offA;
    u.uOffB!.value = s.offB;
    u.uTime!.value = clock.elapsedTime;
    const ma = FORMATIONS[s.a]?.marquee;
    const mb = FORMATIONS[s.b]?.marquee;
    u.uMarqA!.value = reduced ? 0 : (ma?.speed ?? 0);
    u.uMarqB!.value = reduced ? 0 : (mb?.speed ?? 0);
    u.uLenA!.value = ma?.length ?? 0;
    u.uLenB!.value = mb?.length ?? 0;
    // Bigger, softer push in the Lab section.
    u.uRepel!.value = FORMATIONS[s.a]?.id === 'lab' && s.mix < 0.5 ? 2.2 : 1;
    // Intro plays once the first formation exists.
    if (introStart.current < 0) introStart.current = clock.elapsedTime;
    intro.current = reduced ? 1 : Math.min(1, (clock.elapsedTime - introStart.current) / 3.6);
    u.uIntro!.value = intro.current;
    s.ripple = Math.max(0, s.ripple - dt * 1.6);
    u.uRipple!.value = s.ripple;
    const H = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);
    const W = H * (size.width / size.height);
    (u.uMouse!.value as Vector2).set((s.mouse.x * W) / 2, (s.mouse.y * H) / 2);
    // Gentle parallax.
    const k = 1 - Math.exp(-dt * 2.5);
    // The pointer is parked far off-screen when it leaves the page: no parallax then.
    const inside = Math.abs(s.mouse.x) <= 1 && Math.abs(s.mouse.y) <= 1;
    const px = inside && !reduced ? s.mouse.x : 0;
    const py = inside && !reduced ? s.mouse.y : 0;
    cam.current.x += (px * 0.35 - cam.current.x) * k;
    cam.current.y += (py * 0.22 - cam.current.y) * k;
    camera.position.set(cam.current.x, cam.current.y, CAM_Z);
    camera.lookAt(cam.current.x * 0.4, cam.current.y * 0.4, 0);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

export default function ParticleField(props: FieldProps) {
  return (
    <Canvas
      className="pf-canvas"
      dpr={[1, 1.75]}
      camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, CAM_Z] }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#030306', 1)}
    >
      <Field {...props} />
    </Canvas>
  );
}

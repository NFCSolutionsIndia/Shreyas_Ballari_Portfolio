import { useEffect, useMemo, useRef, type MutableRefObject, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BackSide, CanvasTexture, Color, RepeatWrapping, ShaderMaterial, Vector3, type Mesh } from 'three';
import type { Palette } from './timeOfDay';
import { MeshReflectorMaterial } from '@react-three/drei/core/MeshReflectorMaterial.js';
import { BANK_Y, LAKE } from './Town';
import { brickFacadeTexture, calendarTexture, clockTexture, titleTexture, towerTexture } from './textures';

/** Sun direction shared by the sky, the light and the haze (updated from the palette). */
export const SUN = new Vector3(0.18, 0.09, -1).normalize();

/**
 * Sky dome driven by the current palette (time of day, blended to bright day for the Get in
 * touch city): gradient, sun glow and disc, drifting cloud streaks, stars at night.
 */
export function Sky({ palette, matRef }: { palette: RefObject<Palette>; matRef?: MutableRefObject<ShaderMaterial | null> }) {
  const ref = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uSun: { value: SUN },
          uZen: { value: new Color() },
          uMid: { value: new Color() },
          uHor: { value: new Color() },
          uGlow: { value: new Color() },
          uNight: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uSun; uniform vec3 uZen; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uGlow;
          uniform float uNight; uniform float uTime; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
            float a=hash(vec3(i,0.)); float b=hash(vec3(i+vec2(1.,0.),0.)); float c=hash(vec3(i+vec2(0.,1.),0.)); float d=hash(vec3(i+vec2(1.,1.),0.));
            return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
          float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
          void main(){
            float h = vDir.y;
            float mu = dot(vDir, uSun);
            // Sky: deep at the zenith, paling towards a hazy horizon.
            float t = pow(max(h, 0.0), 0.45);
            vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.35, t));
            col = mix(col, uZen, smoothstep(0.3, 1.0, t));
            col = mix(col, uHor * 1.06, exp(-max(h, 0.0) * 16.0) * 0.45);
            // Sunlight scattering: a forward halo round the sun, then the disc.
            float g = 0.76;
            float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) / 12.566;
            float day = 1.0 - uNight;
            col += uGlow * hg * 0.32 * day;
            col += uGlow * pow(max(mu, 0.0), 6.0) * 0.32;
            col += vec3(1.0, 0.95, 0.85) * smoothstep(0.99935, 0.99975, mu) * 1.8 * day;
            if (h > 0.0) {
              // Cumulus: domain-warped noise on a cloud deck, lit from the sun's side.
              vec2 uv = vDir.xz / (h + 0.08) * 0.9 + vec2(uTime * 0.004, uTime * 0.0015);
              vec2 w = vec2(fbm(uv * 0.7), fbm(uv * 0.7 + 5.2));
              float dens = fbm(uv * 1.3 + w * 1.4);
              float cover = smoothstep(0.5, 0.74, dens);
              vec2 toSun = normalize(uSun.xz + vec2(1e-4)) * 0.07;
              float dens2 = fbm((uv + toSun) * 1.3 + w * 1.4);
              float shade = clamp((dens - dens2) * 3.5 + 0.55, 0.0, 1.0);
              vec3 base = uMid * 0.72 + uHor * 0.18;
              vec3 lit = mix(base, vec3(1.0, 0.97, 0.93) * (0.9 + 0.3 * hg), shade);
              lit = mix(lit, uGlow * 1.1 + vec3(0.12), pow(max(mu, 0.0), 4.0) * 0.5 * day);
              lit *= mix(1.0, 0.22, uNight);
              col = mix(col, lit, cover * smoothstep(0.0, 0.12, h) * 0.92);
              // High cirrus streaks.
              float ci = fbm(vec2(uv.x * 0.4, uv.y * 2.5) * 1.1 + 3.0);
              col = mix(col, vec3(1.0, 0.97, 0.95) * mix(1.0, 0.3, uNight), smoothstep(0.62, 0.85, ci) * 0.22 * smoothstep(0.08, 0.3, h) * (1.0 - cover));
            }
            // Stars at night.
            vec3 sp = floor(vDir * 340.0);
            float star = step(0.9965, hash(sp)) * smoothstep(0.05, 0.3, h) * uNight;
            col += vec3(star) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(sp) * 30.0));
            col = mix(col, uHor * 0.92, smoothstep(0.0, -0.12, h));
            // The palette is authored in display colours: convert to linear, then let three apply
            // tone mapping and the output colour space (direct render or post-processing alike).
            gl_FragColor = vec4(pow(col, vec3(2.2)) * 1.25, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  if (matRef) matRef.current = mat;
  // The dome travels with the camera so the horizon is always there.
  useFrame(({ camera, clock }) => {
    ref.current?.position.copy(camera.position);
    const p = palette.current;
    if (!p) return;
    const u = mat.uniforms;
    (u.uZen!.value as Color).copy(p.zenith);
    (u.uMid!.value as Color).copy(p.mid);
    (u.uHor!.value as Color).copy(p.horizon);
    (u.uGlow!.value as Color).copy(p.sunGlow);
    (u.uSun!.value as Vector3).copy(p.sunDir);
    u.uNight!.value = p.night;
    u.uTime!.value = clock.elapsedTime;
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={-1}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  );
}

/** Soft ripple pattern for the lake (drawn in code, tiled). */
function rippleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 2;
      const v = (y / 256) * Math.PI * 2;
      const h = Math.sin(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 + Math.sin(v * 5 + u) * 0.3 + Math.sin((u + v) * 7) * 0.2;
      const k = (y * 256 + x) * 4;
      const val = 128 + h * 50;
      img.data[k] = val;
      img.data[k + 1] = val;
      img.data[k + 2] = val;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(10, 8);
  return t;
}

/** The lake: a soft, slightly rippled mirror with a warm glow path. */
export function Lake() {
  const ripples = useMemo(rippleTexture, []);
  useFrame((_, dt) => {
    ripples.offset.x += dt * 0.004;
    ripples.offset.y += dt * 0.007;
  });
  return (
    <mesh position={[0, 0.6, (LAKE.zNear + LAKE.zFar) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[LAKE.x * 2 + 4, LAKE.zNear - LAKE.zFar + 4]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={0.55}
        blur={[220, 90]}
        mixBlur={1.1}
        mixStrength={1.35}
        mixContrast={0.95}
        depthScale={0.25}
        minDepthThreshold={0.6}
        maxDepthThreshold={1.4}
        distortionMap={ripples}
        distortion={0.35}
        color="#8794c2"
        metalness={0.15}
        roughness={0.4}
      />
    </mesh>
  );
}

/**
 * The courthouse on the square: a two-storey red-brick hall with a white portico, and a white
 * cupola carrying the clock (the visitor's real time) and a calendar drum showing today. It is
 * the "every moment has a story" landmark. Local +z is the front.
 */
export function Courthouse({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const clock = useMemo(() => clockTexture(), []);
  const cal = useMemo(() => calendarTexture(), []);
  useEffect(() => {
    const id = window.setInterval(() => {
      const fresh = clockTexture();
      (clock as CanvasTexture).image = fresh.image;
      clock.needsUpdate = true;
    }, 60_000);
    return () => window.clearInterval(id);
  }, [clock]);
  const brick = useMemo(() => {
    const t = brickFacadeTexture();
    t.repeat.set(6, 3);
    return t;
  }, []);
  const white = '#f4f0e8';
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Steps, hall, cornice */}
      <mesh position={[0, 0.5, 9]} receiveShadow>
        <boxGeometry args={[16, 1, 4]} />
        <meshStandardMaterial color="#e6ddd0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[30, 14, 16]} />
        <meshStandardMaterial map={brick} roughness={0.85} />
      </mesh>
      <mesh position={[0, 14.4, 0]} castShadow>
        <boxGeometry args={[31.5, 1, 17.5]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      {/* Portico: columns and pediment */}
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 6.5, 9.4]} castShadow>
          <cylinderGeometry args={[0.65, 0.75, 12, 16]} />
          <meshStandardMaterial color={white} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 13, 9.4]} castShadow>
        <boxGeometry args={[15, 1.4, 2.4]} />
        <meshStandardMaterial color={white} roughness={0.6} />
      </mesh>
      <mesh position={[0, 15.4, 9.4]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.16]} castShadow>
        <coneGeometry args={[10.6, 3.6, 4]} />
        <meshStandardMaterial color={white} roughness={0.6} />
      </mesh>
      {/* Cupola: base, calendar drum, clock storey, dome */}
      <mesh position={[0, 17, 0]} castShadow>
        <boxGeometry args={[8, 4, 8]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <mesh key={`c${a}`} position={[Math.sin(a) * 4.02, 17, Math.cos(a) * 4.02]} rotation={[0, a, 0]}>
          <planeGeometry args={[6.4, 3.2]} />
          <meshStandardMaterial map={cal} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 22, 0]} castShadow>
        <boxGeometry args={[7, 6, 7]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <group key={`k${a}`} position={[Math.sin(a) * 3.56, 22, Math.cos(a) * 3.56]} rotation={[0, a, 0]}>
          <mesh>
            <circleGeometry args={[2.5, 40]} />
            <meshStandardMaterial map={clock} emissive="#ffd9a8" emissiveIntensity={0.3} emissiveMap={clock} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, -0.04]}>
            <ringGeometry args={[2.5, 2.85, 40]} />
            <meshStandardMaterial color="#2d2c33" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 25, 0]} castShadow>
        <cylinderGeometry args={[3.2, 3.6, 1, 16]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      <mesh position={[0, 25.5, 0]} castShadow>
        <sphereGeometry args={[3.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#8fb3a8" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 30, 0]}>
        <coneGeometry args={[0.3, 3, 8]} />
        <meshStandardMaterial color="#ffd27a" metalness={0.9} roughness={0.25} emissive="#ff9a4a" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

/** The town water tower, lettered with the town's name. */
export function WaterTower({ position, label }: { position: [number, number, number]; label: string }) {
  const band = useMemo(() => towerTexture(label), [label]);
  useEffect(() => {
    void document.fonts?.load('700 74px "Michroma"').then(() => {
      const fresh = towerTexture(label);
      (band as CanvasTexture).image = fresh.image;
      band.needsUpdate = true;
    });
  }, [band, label]);
  const legs = 4;
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {Array.from({ length: legs }, (_, i) => {
        const a = (i / legs) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 5, 15, Math.sin(a) * 5]} rotation={[Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]} castShadow>
            <cylinderGeometry args={[0.35, 0.45, 30, 8]} />
            <meshStandardMaterial color="#c9d1d8" metalness={0.4} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 31, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.9, 6, 10]} />
        <meshStandardMaterial color="#c9d1d8" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 33.5, 0]} castShadow>
        <sphereGeometry args={[8, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#e9eef2" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 37, 0]} castShadow>
        <cylinderGeometry args={[8, 8, 7, 40, 1, true]} />
        <meshStandardMaterial map={band} metalness={0.2} roughness={0.5} side={2} />
      </mesh>
      <mesh position={[0, 40.5, 0]} castShadow>
        <coneGeometry args={[8.4, 4, 40]} />
        <meshStandardMaterial color="#e9eef2" metalness={0.3} roughness={0.45} />
      </mesh>
    </group>
  );
}

/** The name and title floating in the sky, like the reference's opening (our own words). */
export function SkyTitle({ title, sub, position }: { title: string; sub: string; position: [number, number, number] }) {
  const map = useMemo(() => titleTexture(title, sub), [title, sub]);
  useEffect(() => {
    // Redraw once the web font has arrived.
    void document.fonts?.load('400 150px "Michroma"').then(() => {
      const fresh = titleTexture(title, sub);
      (map as CanvasTexture).image = fresh.image;
      map.needsUpdate = true;
    });
  }, [map, title, sub]);
  // On a portrait screen, bring the name to the middle and size it to fit.
  const portrait = useThree((st) => st.size.width < st.size.height);
  return (
    <mesh position={portrait ? [-3, position[1] - 2, position[2] + 20] : position} scale={portrait ? 0.5 : 1}>
      <planeGeometry args={[64, 16]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} fog={false} toneMapped={false} />
    </mesh>
  );
}

export { BANK_Y };

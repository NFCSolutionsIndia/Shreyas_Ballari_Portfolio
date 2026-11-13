import { useMemo } from 'react';
import { CanvasTexture, Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SphereGeometry, SRGBColorSpace, TorusGeometry } from 'three';

/**
 * An original mixed-reality headset, built in code: a curved black glass visor (with a soft
 * purple-to-blue glow behind it), a brushed aluminium frame, a knit light seal and head band,
 * two buttons on top and small camera lenses under the glass. Real-world-ish scale (about 0.19 m
 * wide), centred on the origin, facing +z.
 */

const W = 0.095; // half width
const H = 0.05; // half height
const D = 0.04; // visor depth

/** The visor: a flattened ellipsoid with a nose cut-out along the bottom edge. */
function visorGeometry(scale = 1) {
  const g = new SphereGeometry(1, 128, 64, 0, Math.PI * 2, 0, Math.PI);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    // A rounder, wider "goggle" silhouette: push the corners out a little (superellipse).
    const k = 1 + 0.12 * Math.abs(x * y);
    x *= k;
    y *= k;
    // Nose bridge: lift the bottom edge in the middle.
    if (y < 0) y += 0.42 * Math.exp(-((x / 0.32) ** 2)) * -y;
    // Only the front half bulges; the back is flattened against the frame.
    z = z > 0 ? z : z * 0.25;
    p.setXYZ(i, x * W * scale, y * H * scale, z * D * scale);
  }
  g.computeVertexNormals();
  return g;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#020204';
  g.fillRect(0, 0, 512, 256);
  g.filter = 'blur(28px)';
  const grad = g.createLinearGradient(60, 0, 452, 0);
  grad.addColorStop(0, '#c35bd6');
  grad.addColorStop(0.45, '#f0c8f0');
  grad.addColorStop(0.75, '#6f6cf2');
  grad.addColorStop(1, '#2b3fe0');
  g.strokeStyle = grad;
  g.lineWidth = 70;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(80, 120);
  g.bezierCurveTo(200, 40, 330, 70, 440, 150);
  g.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function knitTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7f7f86';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const v = 100 + ((x * 7 + y * 13) % 40);
      g.fillStyle = `rgb(${v},${v},${v + 6})`;
      g.fillRect(x + ((y / 4) % 2) * 2, y, 3, 3);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(10, 3);
  return t;
}

export function Headset() {
  const parts = useMemo(() => {
    const knit = knitTexture();
    return {
      visor: visorGeometry(1),
      inner: visorGeometry(0.965),
      frame: new TorusGeometry(1, 0.075, 24, 200),
      seal: new TorusGeometry(1, 0.16, 24, 160),
      band: new TorusGeometry(1, 0.05, 16, 120, Math.PI * 1.25),
      glass: new MeshPhysicalMaterial({
        color: new Color('#020203'),
        metalness: 0.05,
        roughness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        iridescence: 0.35,
        iridescenceIOR: 1.3,
        transparent: true,
        opacity: 0.62,
        envMapIntensity: 0.55,
      }),
      glow: new MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: glowTexture(), emissiveIntensity: 1.7, side: DoubleSide }),
      metal: new MeshPhysicalMaterial({ color: '#8e939c', metalness: 1, roughness: 0.3, clearcoat: 0.3 }),
      darkMetal: new MeshPhysicalMaterial({ color: '#2a2c31', metalness: 0.9, roughness: 0.35 }),
      fabric: new MeshStandardMaterial({ color: '#8a8a90', map: knit, roughness: 1 }),
      bandFabric: new MeshStandardMaterial({ color: '#1d1e22', map: knit, roughness: 1 }),
      lens: new MeshPhysicalMaterial({ color: '#0b0b12', metalness: 0.5, roughness: 0.1, clearcoat: 1 }),
    };
  }, []);
  return (
    <group>
      {/* Glow behind the glass, then the glass itself */}
      <mesh geometry={parts.inner} material={parts.glow} />
      <mesh geometry={parts.visor} material={parts.glass} />
      {/* Brushed aluminium frame around the glass */}
      <mesh geometry={parts.frame} material={parts.metal} scale={[W * 1.0, H * 1.03, D * 0.35]} position={[0, 0, -0.004]} />
      {/* Knit light seal and the head band */}
      <mesh geometry={parts.seal} material={parts.fabric} scale={[W * 0.9, H * 0.86, D * 0.28]} position={[0, -0.002, -0.022]} />
      <mesh geometry={parts.band} material={parts.bandFabric} rotation={[Math.PI / 2, 0, Math.PI * 0.875]} scale={[W * 1.02, W * 1.3, 0.38]} position={[0, -0.004, -0.03]} />
      {/* Buttons on top */}
      {[-0.05, 0.055].map((x, i) => (
        <mesh key={x} material={parts.metal} position={[x, H * 0.99, -0.008]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[i ? 0.008 : 0.0055, i ? 0.008 : 0.0055, 0.0028, 32]} />
        </mesh>
      ))}
      {/* Camera lenses along the lower glass */}
      {[-0.058, -0.032, 0.032, 0.058].map((x) => (
        <group key={x} position={[x, -H * 0.42, D * 0.78]}>
          <mesh material={parts.darkMetal} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.0055, 0.0015, 12, 32]} />
          </mesh>
          <mesh material={parts.lens}>
            <sphereGeometry args={[0.0045, 24, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

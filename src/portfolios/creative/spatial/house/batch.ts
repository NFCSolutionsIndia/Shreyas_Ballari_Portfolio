import { Matrix4, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * "Static batching": after the house has loaded, every still object that shares a material with
 * others (walls, slats, books, furniture parts…) is merged into one object per material. The
 * browser then sends a few dozen draw requests per frame instead of hundreds, which is what makes
 * the house slow on Windows (Chrome and Edge translate each request into a DirectX call).
 *
 * Left alone: anything that moves or changes (marked userData.dynamic, or hidden at load time),
 * instanced and skinned meshes, see-through materials (they must be sorted one by one), and
 * multi-material meshes. Each room (a group with userData.room) is merged on its own, so the
 * rooms can still be hidden when the camera is far away.
 */

const _inv = new Matrix4();
const _m = new Matrix4();

function signature(g: BufferGeometry) {
  return `${g.index ? 'i' : 'n'}|${Object.keys(g.attributes).sort().join(',')}`;
}

/** Can this mesh be merged? Walks up to `stop` checking for dynamic or hidden ancestors. */
function still(mesh: Mesh, stop: Object3D) {
  if ((mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || (mesh as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh) return false;
  if (Array.isArray(mesh.material)) return false;
  const mat = mesh.material as Material;
  if (mat.transparent || mesh.geometry.morphAttributes.position) return false;
  for (let o: Object3D | null = mesh; o && o !== stop; o = o.parent) {
    if (!o.visible || o.userData.dynamic) return false;
  }
  return true;
}

function batchIn(container: Object3D) {
  container.updateMatrixWorld(true);
  _inv.copy(container.matrixWorld).invert();
  const groups = new Map<string, Mesh[]>();
  const visit = (o: Object3D) => {
    for (const c of o.children) {
      if (c !== container && c.userData.room) continue; // rooms are merged on their own
      const mesh = c as Mesh;
      if (mesh.isMesh && still(mesh, container)) {
        const mat = mesh.material as Material;
        const key = `${mat.uuid}|${signature(mesh.geometry)}|${mesh.castShadow ? 1 : 0}${mesh.receiveShadow ? 1 : 0}`;
        const list = groups.get(key);
        if (list) list.push(mesh);
        else groups.set(key, [mesh]);
      }
      visit(c);
    }
  };
  visit(container);
  let saved = 0;
  groups.forEach((list) => {
    if (list.length < 2) return;
    const geos = list.map((mesh) => {
      const g = mesh.geometry.clone();
      g.applyMatrix4(_m.multiplyMatrices(_inv, mesh.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) return;
    const first = list[0]!;
    const out = new Mesh(merged, first.material);
    out.castShadow = first.castShadow;
    out.receiveShadow = first.receiveShadow;
    out.name = 'batched';
    container.add(out);
    list.forEach((mesh) => mesh.parent?.remove(mesh));
    saved += list.length - 1;
  });
  return saved;
}

/** A copy of an image no larger than `max` pixels on its longest side (or the image itself). */
function shrink(img: unknown, max: number): unknown {
  const src = img as { width?: number; height?: number } | null;
  if (!src?.width || !src.height || Math.max(src.width, src.height) <= max) return img;
  const k = max / Math.max(src.width, src.height);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  c.getContext('2d')?.drawImage(img as CanvasImageSource, 0, 0, c.width, c.height);
  return c;
}

/**
 * Light version for built-in graphics chips, which share memory with the computer: keep only the
 * colour of each surface (at most 512 px; the sky view at most 2048 px) and drop the bump,
 * roughness, metal and shading maps. Graphics memory falls by about four fifths, which keeps the
 * house smooth on ordinary laptops.
 */
export function lighten(scene: Object3D & { background?: unknown }) {
  const done = new Set<unknown>();
  const slim = (t: { image?: unknown; needsUpdate?: boolean } | null | undefined, max: number) => {
    if (!t || done.has(t) || !t.image) return;
    done.add(t);
    // Posters and boards are drawn with text: keep them sharp.
    if (typeof HTMLCanvasElement !== 'undefined' && t.image instanceof HTMLCanvasElement) return;
    const next = shrink(t.image, max);
    if (next !== t.image) {
      t.image = next;
      t.needsUpdate = true;
    }
  };
  scene.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => {
      const m = mat as Material & Record<string, unknown>;
      let changed = false;
      for (const key of ['normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'clearcoatNormalMap', 'bumpMap']) {
        if (m[key]) {
          m[key] = null;
          changed = true;
        }
      }
      slim(m.map as never, 512);
      slim(m.emissiveMap as never, 512);
      if (changed) m.needsUpdate = true;
    });
  });
  const bg = scene.background as { isTexture?: boolean } | undefined;
  if (bg?.isTexture) slim(bg as never, 2048);
}

/** Merges the still objects of one group (a room loaded later); returns the draw requests saved. */
export function batchGroup(group: Object3D) {
  return batchIn(group);
}

/** Merges the still objects of the whole house; returns how many draw requests it saved. */
export function batchStatic(scene: Object3D) {
  let saved = 0;
  const rooms: Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData.room) rooms.push(o);
  });
  rooms.forEach((r) => (saved += batchIn(r)));
  saved += batchIn(scene);
  return saved;
}

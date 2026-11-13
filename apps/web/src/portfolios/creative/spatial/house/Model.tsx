import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Mesh, type Object3D } from 'three';

const BASE = `${import.meta.env.BASE_URL}assets/house/models`;

/** Poly Haven glTF files (CC0, real-world metres), by asset id. */
export const MODEL = (id: string) => `${BASE}/${id}/${id}_1k.gltf`;

/**
 * A furniture model: cloned (so it can be placed more than once), set on the floor (its lowest
 * point at y = 0 before `position`), casting and receiving shadows.
 */
export function Model({ id, position = [0, 0, 0], rotation = 0, scale = 1, pick }: { id: string; position?: [number, number, number]; rotation?: number; scale?: number; pick?: number }) {
  const gltf = useGLTF(MODEL(id));
  const { object, lift } = useMemo(() => {
    let object: Object3D = gltf.scene.clone(true);
    // Some files hold several variants side by side: keep one, centred.
    if (pick !== undefined) {
      let root: Object3D = object;
      while (root.children.length === 1 && !(root.children[0] as Mesh).isMesh) root = root.children[0]!;
      const chosen = root.children[Math.min(pick, root.children.length - 1)];
      if (chosen) {
        const one = chosen.clone(true);
        one.position.set(0, one.position.y, 0);
        const wrap = new Group();
        wrap.add(one);
        const b = new Box3().setFromObject(wrap);
        one.position.x -= (b.min.x + b.max.x) / 2;
        one.position.z -= (b.min.z + b.max.z) / 2;
        object = wrap;
      }
    }
    object.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(object);
    return { object, lift: -box.min.y };
  }, [gltf, pick]);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={object} position={[0, lift, 0]} />
    </group>
  );
}

export function preloadModels(ids: string[]) {
  ids.forEach((id) => useGLTF.preload(MODEL(id)));
}

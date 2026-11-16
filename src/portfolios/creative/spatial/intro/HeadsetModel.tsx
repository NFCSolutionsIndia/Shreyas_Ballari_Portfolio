import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { Headset } from './Headset';

/**
 * The supplied headset model (public/models/apple_vision_pro.glb, "Apple Vision Pro" by
 * pravinvamp on Sketchfab, CC BY 4.0, credited in the intro). Loaded once and cached; its shape
 * and materials are kept as they are. It is only centred, uniformly scaled to the scene's size
 * (about 0.19 m wide) and turned to face the camera (+z). If it cannot load, the code-built
 * headset stands in.
 */

export const HEADSET_URL = `${import.meta.env.BASE_URL}models/apple_vision_pro.glb`;
export { HEADSET_CREDIT } from '@/content/credits';

/** Rotation that turns the model to face the camera (radians, applied before centring). */
const FACE: [number, number, number] = [0, -Math.PI / 2, 0];
const WIDTH = 0.19;

function Loaded() {
  const gltf = useGLTF(HEADSET_URL);
  const object = useMemo(() => {
    const inner: Object3D = gltf.scene.clone(true);
    inner.rotation.set(...FACE);
    inner.updateMatrixWorld(true);
    inner.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      // Keep the materials; just let the studio reflections read well on them.
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        if ((mat as MeshStandardMaterial).isMeshStandardMaterial) (mat as MeshStandardMaterial).envMapIntensity = 1;
      });
    });
    const box = new Box3().setFromObject(inner);
    const size = box.getSize(new Vector3());
    const centre = box.getCenter(new Vector3());
    // Scale by the visor's width (x, once facing the camera); the band reaches back behind it.
    const s = WIDTH / Math.max(size.x, 1e-6);
    const wrap = new Group();
    inner.position.sub(centre);
    wrap.add(inner);
    wrap.scale.setScalar(s);
    return wrap;
  }, [gltf]);
  // Its shaders are prepared in the background first (no freeze on the first frame), then it
  // appears, and the house may start loading (see SpatialPortfolio).
  const get = useThree((st) => st.get);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const { gl, camera, scene } = get();
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
      window.dispatchEvent(new Event('sp-headset-ready'));
    };
    gl.compileAsync(object, camera, scene).then(show, show);
    const t = window.setTimeout(show, 8000);
    return () => window.clearTimeout(t);
  }, [object, get]);
  return <primitive object={object} visible={shown} />;
}

class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Headset /> : this.props.children;
  }
}

export function HeadsetModel() {
  return (
    <Fallback>
      <Suspense fallback={null}>
        <Loaded />
      </Suspense>
    </Fallback>
  );
}

useGLTF.preload(HEADSET_URL);

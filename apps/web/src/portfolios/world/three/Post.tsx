import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BackSide,
  HalfFloatType,
  MathUtils,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderChunk,
  SphereGeometry,
  Vector2,
  type ShaderMaterial,
  type Texture,
} from 'three';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { cameraAt } from './path';
import { ripple } from './rippleStore';

/**
 * The look: soft sky fill from a PMREM of the live sky, height-and-distance haze, and a
 * post-processing stack (ambient occlusion, soft bloom, gentle depth of field, colour grade,
 * vignette, plus the section ripple). Quality tiers:
 *   high   all of it
 *   medium bloom, grade, vignette, ripple (no AO, no depth of field)
 *   low    straight render (no post), haze and sky fill only
 */

export type Tier = 'high' | 'medium' | 'low';

// --- Height + distance haze: patch three's fog so it thins with height (like the reference). ---
let patched = false;
export function patchHeightFog() {
  if (patched) return;
  patched = true;
  ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG
  varying float vFogDepth;
  varying float vFogHeight;
#endif`;
  ShaderChunk.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogHeight = ( inverse( viewMatrix ) * mvPosition ).y;
#endif`;
  ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying float vFogHeight;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  ShaderChunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
    // Thinner haze higher up; never quite zero so towers still fade into the distance.
    fogFactor *= mix( 0.35, 1.0, exp( - max( vFogHeight - 4.0, 0.0 ) * 0.018 ) );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
}

const GRADE = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uT: { value: -1 },
    uCenter: { value: new Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
    uVignette: { value: 0.32 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uCenter; uniform float uAspect; uniform float uVignette;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv;
      vec3 crest = vec3(0.0);
      // Section ripple: rings spreading like a stone dropped into water.
      if (uT >= 0.0) {
        vec2 d = vUv - uCenter; d.x *= uAspect;
        float r = length(d);
        float wave = 0.0; float c = 0.0;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float front = uT * 0.55 - fi * 0.09;
          if (front <= 0.0) continue;
          float env = exp(-pow((r - front) * 9.0, 2.0)) * (1.0 - fi * 0.18);
          float s = sin((r - front) * 70.0);
          wave += s * env; c += max(s, 0.0) * env;
        }
        float fade = exp(-uT * 1.6) * smoothstep(0.0, 0.08, uT);
        float splash = exp(-r * 18.0) * sin(r * 90.0 - uT * 30.0) * exp(-uT * 5.0);
        float amp = (wave * 0.016 + splash * 0.02) * fade;
        vec2 dir = r > 0.0001 ? d / r : vec2(0.0);
        dir.x /= uAspect;
        uv += dir * amp;
        crest = vec3(1.0, 0.97, 0.93) * c * fade * 0.22;
      }
      vec3 col = texture2D(tDiffuse, uv).rgb;
      // Grade (linear, before tone mapping): cool blue-violet shadows, warm highlights.
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float sh = 1.0 - smoothstep(0.0, 0.35, l);
      float hi = smoothstep(0.4, 1.4, l);
      col = mix(col, col * vec3(0.9, 0.94, 1.12) + vec3(0.006, 0.008, 0.02), sh * 0.85);
      col = mix(col, col * vec3(1.06, 1.0, 0.9), hi * 0.6);
      // Gentle saturation lift.
      col = mix(vec3(l), col, 1.08);
      col += crest;
      // Light vignette.
      vec2 v = vUv - 0.5; v.x *= uAspect * 0.8;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.85, length(v));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function Post({ tier, envSource, progress }: { tier: RefObject<Tier>; envSource: RefObject<ShaderMaterial | null>; progress: RefObject<number> }) {
  const { gl, scene, camera, size } = useThree();

  const stack = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.renderTarget1.texture.type = HalfFloatType;
    composer.renderTarget2.texture.type = HalfFloatType;
    const render = new RenderPass(scene, camera);
    const ao = new GTAOPass(scene, camera, size.width, size.height);
    ao.blendIntensity = 0.55;
    ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
    const bloom = new UnrealBloomPass(new Vector2(size.width, size.height), 0.3, 0.5, 1.25);
    const dof = new BokehPass(scene, camera, { focus: 60, aperture: 0.00004, maxblur: 0.0042 });
    // Blur only what is nearer than the focus (like a real portrait lens on the reference):
    // the sky and the far town stay crisp under the haze.
    dof.materialBokeh.fragmentShader = dof.materialBokeh.fragmentShader.replace(
      'float factor = ( focus + viewZ );',
      'float factor = max( focus + viewZ, 0.0 );',
    );
    dof.materialBokeh.needsUpdate = true;
    const grade = new ShaderPass(GRADE);
    const output = new OutputPass();
    composer.addPass(render);
    composer.addPass(ao);
    composer.addPass(bloom);
    composer.addPass(dof);
    composer.addPass(grade);
    composer.addPass(output);
    return { composer, ao, bloom, dof, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    stack.composer.setPixelRatio(gl.getPixelRatio());
    stack.composer.setSize(size.width, size.height);
    stack.grade.uniforms.uAspect!.value = size.width / size.height;
  }, [gl, size, stack]);
  useEffect(() => () => stack.composer.dispose(), [stack]);

  // Soft fill light: a PMREM of the live sky, refreshed every few seconds.
  const env = useMemo(() => {
    const s = new Scene();
    const mesh = new Mesh(new SphereGeometry(100, 32, 16));
    s.add(mesh);
    return { scene: s, mesh, pm: new PMREMGenerator(gl), tex: null as Texture | null, last: -10 };
  }, [gl]);
  useEffect(
    () => () => {
      env.tex?.dispose();
      env.pm.dispose();
    },
    [env],
  );

  useFrame(({ clock }) => {
    const t = tier.current ?? 'high';
    // Environment fill (all tiers; cheap at 64 px).
    const src = envSource.current;
    if (src && clock.elapsedTime - env.last > 3) {
      env.last = clock.elapsedTime;
      env.mesh.material = src;
      (src as ShaderMaterial).side = BackSide;
      const rt = env.pm.fromScene(env.scene, 0.02, 0.1, 400);
      env.tex?.dispose();
      env.tex = rt.texture;
      scene.environment = env.tex;
      scene.environmentIntensity = 0.55;
    }

    const rt = ripple.t0 < 0 ? -1 : (performance.now() - ripple.t0) / 1000;
    const rippling = rt >= 0 && rt < 2.2;
    if (t === 'low' && !rippling) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }
    stack.ao.enabled = t === 'high';
    stack.dof.enabled = t === 'high';
    stack.bloom.enabled = t !== 'low';
    // Focus on what the camera is looking at (the arch in the welcome view).
    const target = cameraAt(MathUtils.clamp(progress.current ?? 0, 0, 1)).look;
    (stack.dof.uniforms as Record<string, { value: number }>).focus!.value = camera.position.distanceTo(target) * 0.55;
    const u = stack.grade.uniforms;
    u.uT!.value = rippling ? rt : -1;
    (u.uCenter!.value as Vector2).set(ripple.x, ripple.y);
    u.uVignette!.value = t === 'low' ? 0 : 0.32;
    stack.composer.render();
  }, 1);
  return null;
}


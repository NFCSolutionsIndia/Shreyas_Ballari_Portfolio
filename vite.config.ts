/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/; set BASE_PATH there. Local dev stays at /.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The 3D desk is lazy-loaded, so the dev server wouldn't see these until the first click and
  // would then re-bundle and reload the page. Pre-bundle them up front.
  // drei is NOT pre-bundled: on this machine, security software deletes the single large
  // pre-bundled drei file seconds after Vite writes it, which breaks the desk in dev. Serving
  // drei's own ES modules avoids that file entirely. Production builds are unaffected.
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      // Used only by lazily loaded pages; listed so the first visit doesn't trigger a re-bundle
      // and reload (which left a blank page while the browser asked for outdated copies).
      '@phosphor-icons/react',
      'lenis',
      'gsap',
      // Loaded only when a visitor turns on hand gestures.
      '@mediapipe/tasks-vision',
      // three.js add-ons used by the Studio room (reflections, merged mouldings).
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      // RoundedBox imports three-stdlib's index; unbundled it is hundreds of requests.
      '@react-three/drei > three-stdlib',
      // drei's CommonJS-only dependencies still need converting; they're small.
      '@react-three/drei > stats.js',
      '@react-three/drei > zustand',
      '@react-three/drei > zustand/traditional',
      '@react-three/drei > use-sync-external-store/shim/with-selector.js',
      '@react-three/drei > troika-three-text > bidi-js',
      '@react-three/drei > troika-three-text > webgl-sdf-generator',
      '@react-three/drei > troika-three-text > troika-three-utils',
      '@react-three/drei > troika-three-text > troika-worker-utils',
    ],
    exclude: ['@react-three/drei'],
  },
  ssgOptions: {
    // Admin and preview routes stay client-only; never pre-render or index them.
    includedRoutes: (paths) =>
      paths.filter((p) => !p.startsWith('/admin') && !p.startsWith('/preview')),
    formatting: 'none',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});

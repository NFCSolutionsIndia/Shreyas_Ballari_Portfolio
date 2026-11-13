import type { HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import {
  GestureRecognizer,
  SENSITIVITY,
  type FrameResult,
  type GestureEvent,
  type Sensitivity,
} from './recognizer';

/**
 * Camera + MediaPipe Hand Landmarker + gesture recogniser. Frames are processed locally in the
 * browser and never stored or sent anywhere. The only download is the hand model itself.
 */

/** MediaPipe's WebAssembly runtime, served from this site (copied from @mediapipe/tasks-vision). */
const WASM_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`;
/** Google's official hand landmarker model (float16, ~7.5 MB), downloaded on first use. */
export const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type CameraStatus =
  'idle' | 'loading' | 'ready' | 'denied' | 'unavailable' | 'disconnected' | 'error';

export interface TrackingState {
  status: CameraStatus;
  present: boolean;
  gesture: FrameResult['gesture'];
  active: boolean;
  paused: boolean;
  pinching: boolean;
  /** Frames processed per second (for the panel). */
  fps: number;
  message?: string;
}

export const INITIAL_STATE: TrackingState = {
  status: 'idle',
  present: false,
  gesture: 'none',
  active: false,
  paused: false,
  pinching: false,
  fps: 0,
};

let landmarkerPromise: Promise<HandLandmarker> | null = null;

/** Load once per visit; the second "enable" is instant. */
async function loadLandmarker(): Promise<HandLandmarker> {
  landmarkerPromise ??= (async () => {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO' as const,
      numHands: 1,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.5,
    });
    try {
      return await HandLandmarker.createFromOptions(fileset, options('GPU'));
    } catch {
      return HandLandmarker.createFromOptions(fileset, options('CPU'));
    }
  })().catch((e) => {
    landmarkerPromise = null;
    throw e;
  });
  return landmarkerPromise;
}

export interface EngineCallbacks {
  /** Low-frequency: called only when something in the state changes. */
  onState: (s: TrackingState) => void;
  /** Every processed frame: update the cursor directly, no React state. */
  onFrame: (r: FrameResult, landmarks: NormalizedLandmark[] | null) => void;
  onEvent: (e: GestureEvent) => void;
}

export class HandTrackingEngine {
  private stream: MediaStream | null = null;
  private landmarker: HandLandmarker | null = null;
  private recognizer: GestureRecognizer;
  private state: TrackingState = { ...INITIAL_STATE };
  private handle = 0;
  private usingVideoFrameCallback = false;
  private running = false;
  private lastVideoTime = -1;
  private lastDetect = 0;
  private frames = 0;
  private fpsStart = 0;

  constructor(
    private video: HTMLVideoElement,
    private cb: EngineCallbacks,
    sensitivity: Sensitivity = SENSITIVITY.medium,
  ) {
    this.recognizer = new GestureRecognizer(sensitivity);
  }

  setSensitivity(s: Sensitivity) {
    this.recognizer.setSensitivity(s);
  }

  async start() {
    if (this.running) return;
    this.set({ status: 'loading', message: 'Asking for your camera…' });
    if (!navigator.mediaDevices?.getUserMedia) {
      this.set({ status: 'unavailable', message: 'This browser cannot use a camera.' });
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
    } catch (e) {
      const name = (e as DOMException).name;
      if (name === 'NotAllowedError' || name === 'SecurityError')
        this.set({ status: 'denied', message: 'Camera permission was declined.' });
      else if (
        name === 'NotFoundError' ||
        name === 'OverconstrainedError' ||
        name === 'NotReadableError'
      )
        this.set({
          status: 'unavailable',
          message:
            name === 'NotReadableError'
              ? 'The camera is in use by another app.'
              : 'No camera was found.',
        });
      else this.set({ status: 'error', message: 'The camera could not be started.' });
      return;
    }
    const track = this.stream.getVideoTracks()[0];
    track?.addEventListener('ended', () => {
      if (!this.running) return;
      this.stop('disconnected');
    });

    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    try {
      await this.video.play();
    } catch {
      // Autoplay of a muted inline stream is allowed after the click that started this.
    }

    this.set({ message: 'Loading the hand-tracking model…' });
    try {
      this.landmarker = await loadLandmarker();
    } catch {
      this.releaseCamera();
      this.set({
        status: 'error',
        message: 'The hand-tracking model could not be loaded. Check your connection.',
      });
      return;
    }
    if (!this.stream) return; // stopped while loading
    this.running = true;
    this.recognizer.reset();
    this.fpsStart = performance.now();
    this.frames = 0;
    this.set({ status: 'ready', message: undefined });
    this.schedule();
  }

  /** Stop tracking and turn the camera off (its light goes out). */
  stop(status: CameraStatus = 'idle') {
    this.running = false;
    if (this.usingVideoFrameCallback) this.video.cancelVideoFrameCallback?.(this.handle);
    else cancelAnimationFrame(this.handle);
    this.releaseCamera();
    this.recognizer.reset();
    this.cb.onFrame(
      {
        present: false,
        gesture: 'none',
        cursor: null,
        grip: null,
        pinchRatio: null,
        pinching: false,
        active: false,
        paused: false,
        events: [],
      },
      null,
    );
    this.set({
      ...INITIAL_STATE,
      status,
      message: status === 'disconnected' ? 'The camera was disconnected.' : undefined,
    });
  }

  private releaseCamera() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  private schedule() {
    if (!this.running) return;
    if ('requestVideoFrameCallback' in this.video) {
      this.usingVideoFrameCallback = true;
      this.handle = this.video.requestVideoFrameCallback(() => this.process());
    } else {
      this.handle = requestAnimationFrame(() => this.process());
    }
  }

  private process() {
    if (!this.running || !this.landmarker) return;
    const now = performance.now();
    const v = this.video;
    // One detection per new video frame, at most ~30 per second.
    if (v.readyState >= 2 && v.currentTime !== this.lastVideoTime && now - this.lastDetect >= 30) {
      this.lastVideoTime = v.currentTime;
      this.lastDetect = now;
      let landmarks: NormalizedLandmark[] | null = null;
      try {
        const res = this.landmarker.detectForVideo(v, now);
        landmarks = res.landmarks[0] ?? null;
      } catch {
        landmarks = null;
      }
      const aspect = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 4 / 3;
      const r = this.recognizer.update(landmarks, now, aspect);
      if (import.meta.env.DEV) {
        // Development only: the last few seconds of frames, for debugging gestures in the console.
        const w = window as unknown as { __gestureLog?: unknown[] };
        const log = (w.__gestureLog ??= []);
        log.push({ t: Math.round(now), g: r.gesture, x: r.cursor ? +r.cursor.x.toFixed(3) : null, e: r.events.map((e) => (e.type === 'swipe' ? `swipe-${e.dir}` : e.type)) });
        if (log.length > 400) log.splice(0, log.length - 400);
      }
      this.cb.onFrame(r, landmarks);
      r.events.forEach((e) => this.cb.onEvent(e));
      this.frames++;
      const elapsed = now - this.fpsStart;
      const fps = elapsed > 1000 ? Math.round((this.frames * 1000) / elapsed) : this.state.fps;
      if (elapsed > 1000) {
        this.fpsStart = now;
        this.frames = 0;
      }
      this.set({
        present: r.present,
        gesture: r.gesture,
        active: r.active,
        paused: r.paused,
        pinching: r.pinching,
        fps,
      });
    }
    this.schedule();
  }

  private set(patch: Partial<TrackingState>) {
    const next = { ...this.state, ...patch };
    const changed = (Object.keys(next) as (keyof TrackingState)[]).some(
      (k) => next[k] !== this.state[k],
    );
    this.state = next;
    if (changed) this.cb.onState(next);
  }
}

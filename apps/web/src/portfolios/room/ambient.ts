/**
 * Soft ambient room tone, generated in the browser (no audio files): two quiet detuned sine
 * voices through a low-pass filter, with a slow swell. Only ever starts from a click.
 */
export function createAmbient() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;

  const start = () => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      filter.connect(master);
      master.connect(ctx.destination);

      for (const [freq, detune] of [
        [220, -4],
        [329.63, 3],
        [164.81, 0],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const voice = ctx.createGain();
        voice.gain.value = 0.25;
        // Slow swell on each voice, out of step with the others.
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + freq / 20000;
        const depth = ctx.createGain();
        depth.gain.value = 0.15;
        lfo.connect(depth).connect(voice.gain);
        osc.connect(voice).connect(filter);
        osc.start();
        lfo.start();
      }
    }
    void ctx.resume();
    master?.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2);
  };

  const stop = () => {
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  };

  const dispose = () => {
    void ctx?.close();
    ctx = null;
    master = null;
  };

  return { start, stop, dispose };
}

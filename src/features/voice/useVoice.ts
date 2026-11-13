import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice control with the browser's own speech recognition. It only listens after the visitor
 * presses the microphone button (the browser asks for permission), and stops when pressed again.
 */

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function getRecognition(): Recognition | null {
  if (typeof window === 'undefined') return null;
  const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  return C ? new C() : null;
}

export function useVoice(onCommand: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const rec = useRef<Recognition | null>(null);
  const want = useRef(false);
  const handler = useRef(onCommand);
  handler.current = onCommand;

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => {
      want.current = false;
      rec.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const r = getRecognition();
    if (!r) return;
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0].transcript.trim();
        setHeard(text);
        if (res.isFinal && text) handler.current(text);
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        want.current = false;
        setError('Microphone permission was not given.');
      }
    };
    // Browsers stop listening after a pause; carry on while the visitor wants it.
    r.onend = () => {
      if (want.current) {
        try {
          r.start();
        } catch {
          /* already started */
        }
      } else setListening(false);
    };
    rec.current = r;
    want.current = true;
    setError('');
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Voice could not start.');
    }
  }, []);

  const stop = useCallback(() => {
    want.current = false;
    rec.current?.stop();
    setListening(false);
    setHeard('');
  }, []);

  return { supported, listening, heard, error, start, stop };
}

/** Read a reply aloud with the browser's speech synthesis. */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowSquareOut, ArrowUp, ChatsCircle, Copy, Folder, Microphone, Plus, SpeakerHigh, Sparkle } from '@phosphor-icons/react';
import { profile } from '@/content/portfolio';
import { useVoice } from '@/portfolios/world/useVoice';
import { speak } from '../story/narrator';
import { spatial, useSpatial } from '../store';
import { ask, SUGGESTIONS, type Answer } from './assistant';
import { openApp } from './Dashboard';

/**
 * "Ask about Shreyas": a chat window with a rail on the left, the conversation in the middle and
 * suggestions, recent questions and collections on the right. Answers come only from his
 * portfolio (see assistant.ts), type in, show related cards fanned like photos, and are read
 * aloud when the narrator is on. Type, tap a suggestion, or press the mic and speak.
 */

interface Msg {
  id: number;
  from: 'you' | 'ai';
  text: string;
  answer?: Answer;
}

const COLLECTIONS = [
  { k: 'Projects', q: 'What is his trading app?' },
  { k: 'Research', q: 'Tell me about Oncure' },
  { k: 'Timeline', q: 'Show his timeline' },
  { k: 'Awards', q: 'What are his awards?' },
  { k: 'School', q: 'What does he study?' },
];

function Typed({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 3)), 16);
    return () => window.clearInterval(id);
  }, [text]);
  return <>{text.slice(0, n)}</>;
}

export function Chat() {
  const pending = useSpatial((s) => s.pendingAsk);
  const narrate = useSpatial((s) => s.narrate);
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: 'ai', text: `Hi! I'm the guide to ${profile.firstName}'s world. Ask me about his research, his projects, his school, his awards, his timeline or his goals.` }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const list = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const voice = useVoice((t) => send(t));

  const send = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setInput('');
    setRecent((r) => [text, ...r.filter((x) => x !== text)].slice(0, 6));
    setMsgs((m) => [...m, { id: idRef.current++, from: 'you', text }]);
    setThinking(true);
    window.setTimeout(() => {
      const a = ask(text);
      setThinking(false);
      setMsgs((m) => [...m, { id: idRef.current++, from: 'ai', text: a.text, answer: a }]);
      if (spatial.get().narrate) speak(a.text);
    }, 550);
  };

  // A question handed over from elsewhere ("Ask AI" buttons).
  useEffect(() => {
    if (!pending) return;
    spatial.set({ pendingAsk: null });
    send(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, thinking]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="ch">
      <nav className="ch-rail" aria-label="Chat">
        <button type="button" className="ch-rail-btn is-plus" aria-label="New chat" data-voice="new chat" onClick={() => setMsgs((m) => m.slice(0, 1))}>
          <Plus weight="bold" />
        </button>
        <button type="button" className="ch-rail-btn" aria-label="Topics" onClick={() => send('Who is Shreyas?')}>
          <Sparkle weight="bold" />
        </button>
        <button type="button" className="ch-rail-btn" aria-label="Conversations" onClick={() => list.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ChatsCircle weight="bold" />
        </button>
        <img className="ch-rail-me" src={profile.portrait} alt="" />
      </nav>

      <section className="ch-main">
        <header className="ch-head">
          <span>
            <Sparkle weight="fill" aria-hidden="true" /> Shreyas AI
          </span>
          <small>Answers from his portfolio only</small>
        </header>
        <div ref={list} className="ch-list os-scroll" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={m.id} className={`ch-msg is-${m.from}`}>
              <div className="ch-bubble">{m.from === 'ai' && i === msgs.length - 1 && m.answer ? <Typed text={m.text} /> : m.text}</div>
              {m.answer?.cards && m.answer.cards.length > 0 && (
                <div className="ch-fan">
                  {m.answer.cards.map((c, k) => (
                    <button key={c.id} type="button" className="ch-fan-card" style={{ '--k': k - (m.answer!.cards!.length - 1) / 2 } as CSSProperties} data-voice={c.title} onClick={() => openApp(c.app)}>
                      <img src={c.image} alt="" />
                      <b>{c.title}</b>
                    </button>
                  ))}
                </div>
              )}
              {m.from === 'ai' && m.answer && (
                <div className="ch-tools">
                  <button type="button" className="os-round is-sm" aria-label="Listen" onClick={() => speak(m.text)}>
                    <SpeakerHigh weight="bold" />
                  </button>
                  <button type="button" className="os-round is-sm" aria-label="Copy" onClick={() => void navigator.clipboard?.writeText(m.text)}>
                    <Copy weight="bold" />
                  </button>
                  {m.answer.open && (
                    <button type="button" className="os-chip" data-voice={m.answer.open.label} onClick={() => openApp(m.answer!.open!.app)}>
                      <ArrowSquareOut weight="bold" aria-hidden="true" /> {m.answer.open.label}
                    </button>
                  )}
                </div>
              )}
              {m.from === 'ai' && i === msgs.length - 1 && m.answer?.chips && (
                <div className="ch-chips">
                  {m.answer.chips.map((c) => (
                    <button key={c} type="button" className="os-chip is-soft" data-voice={c} onClick={() => send(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="ch-msg is-ai">
              <div className="ch-bubble ch-dots" aria-label="Thinking">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
        <form className="ch-input" onSubmit={onSubmit}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about Shreyas…" aria-label="Your question" />
          <button type="button" className={`os-round ${voice.listening ? 'is-on' : ''}`} aria-label={voice.supported ? 'Speak your question' : 'Voice not available'} disabled={!voice.supported} onClick={() => (voice.listening ? voice.stop() : voice.start())}>
            <Microphone weight="bold" />
          </button>
          <button type="submit" className="ch-send" aria-label="Send" data-voice="send">
            <ArrowUp weight="bold" />
          </button>
        </form>
      </section>

      <aside className="ch-side os-scroll">
        <p className="os-label">Ask about</p>
        <div className="ch-sugg">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="os-chip is-soft" data-voice={s} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="os-label">Conversations</p>
        <ul className="ch-recent">
          {recent.length === 0 && <li className="os-empty">Your questions appear here</li>}
          {recent.map((r) => (
            <li key={r}>
              <button type="button" onClick={() => send(r)}>
                {r}
              </button>
            </li>
          ))}
        </ul>
        <p className="os-label">Collections</p>
        <ul className="ch-coll">
          {COLLECTIONS.map((c) => (
            <li key={c.k}>
              <button type="button" data-voice={c.k} onClick={() => send(c.q)}>
                <Folder weight="duotone" aria-hidden="true" /> {c.k}
              </button>
            </li>
          ))}
        </ul>
        <p className="os-fine">{narrate ? 'Answers are read aloud (narrator on).' : 'Turn the narrator on to hear answers.'}</p>
      </aside>
    </div>
  );
}

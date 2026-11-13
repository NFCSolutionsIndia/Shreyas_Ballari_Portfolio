import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { env } from '@/lib/env';
import '@/features/details/style';

/**
 * /contact: a short message form. Messages go to the address set in VITE_CONTACT_ENDPOINT (for
 * example a Formspree form, which forwards to a family inbox). Until that is set, the page says
 * plainly that the form is not connected, so nobody thinks a message was sent. No email address,
 * phone number or home address is ever shown here.
 */
export function Component() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'offline' | 'failed'>('idle');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const next: Record<string, string> = {};
    if (!data.name?.trim()) next.name = 'Please add your name.';
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? '')) next.email = 'Please add an email address we can reply to.';
    if ((data.message ?? '').trim().length < 10) next.message = 'Please write a little more (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!env.VITE_CONTACT_ENDPOINT) {
      setState('offline');
      return;
    }
    setState('sending');
    try {
      const res = await fetch(env.VITE_CONTACT_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      setState('sent');
      form.reset();
    } catch {
      setState('failed');
    }
  };

  const field = (name: string) => ({ name, 'aria-invalid': errors[name] ? true : undefined, 'aria-describedby': errors[name] ? `${name}-err` : undefined });

  return (
    <>
      <Seo title="Contact" description="Send Shreyas Ballari a message about his research, his projects or tutoring." />
      <div className="dt dt--page is-static">
        <div className="dt-body">
          <header className="dt-head">
            <p className="dt-kicker">Contact</p>
            <h1 className="dt-title">Send Shreyas a message</h1>
            <p className="dt-lede">Questions about Oncure, the AI trading app or tutoring are welcome. Messages are read by his family first.</p>
          </header>

          {state === 'sent' ? (
            <p className="dt-status" role="status">
              Thank you. Your message was sent, and the family will reply by email.
            </p>
          ) : (
            <form className="dt-form" noValidate onSubmit={submit}>
              <label>
                Your name
                <input type="text" autoComplete="name" {...field('name')} />
                {errors.name && (
                  <span id="name-err" className="dt-err">
                    {errors.name}
                  </span>
                )}
              </label>
              <label>
                Your email
                <input type="email" autoComplete="email" {...field('email')} />
                {errors.email && (
                  <span id="email-err" className="dt-err">
                    {errors.email}
                  </span>
                )}
              </label>
              <label>
                Message
                <textarea rows={6} {...field('message')} />
                {errors.message && (
                  <span id="message-err" className="dt-err">
                    {errors.message}
                  </span>
                )}
              </label>
              <button type="submit" className="dt-send" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send message'}
              </button>
              {state === 'offline' && (
                <p className="dt-status" role="status">
                  The contact form is not connected yet, so this message was not sent. Please try again later.
                </p>
              )}
              {state === 'failed' && (
                <p className="dt-status" role="alert">
                  Sending failed. Please check your connection and try again.
                </p>
              )}
            </form>
          )}

          <section className="dt-end">
            <b className="dt-h">While you wait</b>
            <p>
              Ask the AI guide about his work in the{' '}
              <a href={`${import.meta.env.BASE_URL}?style=creative`} className="dt-go">
                Creative tab
              </a>
              , or read about <Link to="/research/oncure" className="dt-go">Oncure</Link> and the <Link to="/projects/stock-trading-app" className="dt-go">AI trading app</Link>.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}

'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, ShieldCheck, Check, ArrowLeft } from 'lucide-react';
import { Brand, Neighborhood, Notice } from './ui';
import { DEMO_NAMES } from '@/lib/demo';
import type { Role } from '@/lib/types';
export function AuthScreen({
  mode = 'login',
}: {
  mode?: 'login' | 'signup' | 'forgot' | 'reset' | 'demo';
}) {
  const [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('error') === 'callback')
      setError('The sign-in link expired or could not be verified. Please try signing in again.');
  }, []);
  const request = async (url: string, data: Record<string, unknown>) => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ...(new URL(window.location.href).searchParams.get('next')
            ? { next: new URL(window.location.href).searchParams.get('next') }
            : {}),
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error ?? 'Could not connect. Try again.');
      if (result.redirect) window.location.assign(result.redirect);
      else setMessage(result.message ?? 'Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (mode === 'signup' && f.get('password') !== f.get('confirmation')) {
      setError('Your passwords do not match.');
      return;
    }
    const data: Record<string, unknown> = {
      action: { login: 'login', signup: 'signup', forgot: 'forgot', reset: 'reset', demo: 'login' }[
        mode
      ],
    };
    for (const key of ['email', 'password', 'display_name', 'zip', 'role', 'language'])
      if (f.has(key)) data[key] = f.get(key);
    void request('/api/auth', data);
  }
  const title = {
    login: 'A little support.\nA steadier tomorrow.',
    signup: 'Your next chapter\nstarts here.',
    forgot: 'Let’s get you\nback on track.',
    reset: 'A fresh start\nfor your account.',
    demo: 'See a path\nforward, together.',
  }[mode];
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div className="auth-story-copy">
          <p className="eyebrow">A PLACE TO FIND YOUR WAY FORWARD</p>
          <div className="story-title">
            {title.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </div>
          <p>
            Prevent eviction. Find assistance.
            <br />
            Stay housed.
          </p>
          <div className="story-points">
            <span>
              <Check size={17} /> Find help in your community
            </span>
            <span>
              <Check size={17} /> Make a plan that fits your situation
            </span>
            <span>
              <Check size={17} /> Take the next step with confidence
            </span>
          </div>
        </div>
        <Neighborhood />
        <div className="story-bottom">
          A stronger foundation starts with a connection.
          <span>Independent civic technology prototype</span>
        </div>
      </aside>
      <main id="main-content" className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <div className="auth-top">
          <Link href="/about">
            About the project <ArrowRight size={14} />
          </Link>
        </div>
        <div className="auth-form-wrap">
          <div className="mini-label">
            <span className="tiny-dot" /> A LITTLE HELP GOES A LONG WAY
          </div>
          <h1 className="auth-title">
            {mode === 'login'
              ? 'Welcome to StableHome.'
              : mode === 'signup'
                ? 'Let’s create your account.'
                : mode === 'forgot'
                  ? 'Forgot your password?'
                  : mode === 'reset'
                    ? 'Choose a new password.'
                    : 'Make yourself at home.'}
          </h1>
          <p className="muted auth-description">
            {mode === 'login'
              ? 'You don’t have to figure it all out alone. Sign in to find resources, make a plan, and move forward.'
              : mode === 'signup'
                ? 'A private space to find support and organize your next steps.'
                : mode === 'demo'
                  ? 'Explore a complete fictional scenario. No account or real personal information needed.'
                  : 'We’ll help you securely access your housing workspace.'}
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          {message && <Notice tone="success">{message}</Notice>}
          {(mode === 'login' || mode === 'signup') && (
            <>
              <button
                className="btn google-btn"
                disabled={busy}
                onClick={() => request('/api/auth', { action: 'google' })}
              >
                <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M44 24c0-1.4-.1-2.8-.4-4H24v8h11.2c-.5 2.6-2 4.8-4.2 6.2v5.2h6.8C41.8 35.8 44 30.4 44 24Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.6 0 10.3-1.9 13.8-5.1L31 33.7c-1.9 1.3-4.3 2-7 2-5.4 0-10-3.7-11.6-8.6h-7v5.4A20 20 0 0 0 24 44Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.4 27.1a12 12 0 0 1 0-7.2v-5.4h-7a20 20 0 0 0 0 18l7-5.4Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 12.3c3 0 5.7 1 7.8 3l5.9-5.9A20 20 0 0 0 5.4 14.5l7 5.4C14 15 18.6 12.3 24 12.3Z"
                  />
                </svg>
                Continue with Google
              </button>
              <div className="divider">
                <span>or continue with email</span>
              </div>
            </>
          )}
          {mode === 'demo' ? (
            <div className="demo-roles">
              {(['tenant', 'landlord', 'provider', 'admin'] as Role[]).map((role) => (
                <button
                  key={role}
                  className="demo-role"
                  disabled={busy}
                  onClick={() => request('/api/demo', { role })}
                >
                  <span className="avatar">
                    {DEMO_NAMES[role]
                      .split(' ')
                      .map((x) => x[0])
                      .join('')}
                  </span>
                  <span>
                    <strong>{DEMO_NAMES[role]}</strong>
                    <small>
                      {role === 'provider' ? 'Fictional mediator' : `Fictional ${role}`}
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
              <Notice>
                Demo records are synthetic and saved in this browser. Please do not enter real
                personal information.
              </Notice>
            </div>
          ) : (
            <form onSubmit={submit} className="form-stack">
              {mode === 'signup' && (
                <label>
                  Full name
                  <input
                    name="display_name"
                    autoComplete="name"
                    required
                    maxLength={100}
                    placeholder="Your full name"
                  />
                </label>
              )}
              {mode !== 'reset' && (
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {mode !== 'forgot' && (
                <label>
                  <span className="label-row">
                    Password
                    {mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}
                  </span>
                  <span className="password-input">
                    <input
                      aria-label="Password"
                      name="password"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      minLength={8}
                      maxLength={128}
                      required
                      placeholder={
                        mode === 'signup' ? 'At least 8 characters' : 'Enter your password'
                      }
                    />
                    <button
                      type="button"
                      aria-label={show ? 'Hide password' : 'Show password'}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              )}
              {mode === 'signup' && (
                <>
                  <label>
                    Confirm password
                    <input
                      name="confirmation"
                      type={show ? 'text' : 'password'}
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      ZIP code
                      <input
                        name="zip"
                        pattern="[0-9]{5}"
                        inputMode="numeric"
                        maxLength={5}
                        required
                        placeholder="19013"
                      />
                    </label>
                    <label>
                      Preferred language
                      <select name="language">
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="other">Other / interpreter</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    I’m here as a
                    <select name="role">
                      <option value="tenant">Tenant</option>
                      <option value="landlord">Landlord</option>
                    </select>
                  </label>
                  <small className="muted">
                    Google accounts start as tenants. Professional accounts require independent
                    verification.
                  </small>
                </>
              )}
              <button disabled={busy} className="btn primary full" type="submit">
                {busy
                  ? 'Connecting…'
                  : mode === 'login'
                    ? 'Log in'
                    : mode === 'signup'
                      ? 'Create account'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Save new password'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          {(mode === 'login' || mode === 'signup') && (
            <p className="auth-switch">
              {mode === 'login' ? 'New to StableHome?' : 'Already have an account?'}{' '}
              <Link href={mode === 'login' ? '/signup' : '/login'}>
                {mode === 'login' ? 'Create an account' : 'Log in'}
              </Link>
            </p>
          )}
          {mode === 'login' && (
            <div className="demo-callout">
              <div>
                <strong>Just looking around?</strong>
                <span>Try a guided experience with fictional data.</span>
              </div>
              <button disabled={busy} onClick={() => request('/api/demo', { role: 'tenant' })}>
                Explore the demo <ArrowRight size={15} />
              </button>
              <Link href="/demo" className="small-link">
                Choose a demo role
              </Link>
            </div>
          )}
          {(mode === 'forgot' || mode === 'reset' || mode === 'demo') && (
            <Link className="text-link back-link" href="/login">
              <ArrowLeft size={15} />
              Back to log in
            </Link>
          )}
          <div className="privacy-note">
            <ShieldCheck size={19} />
            <p>
              Your information stays private. We never share it with landlords or organizations
              without your choice.
            </p>
          </div>
        </div>
        <footer className="auth-footer">
          <span>Independent prototype · Not a government or legal service</span>
          <Link href="/privacy">Privacy policy</Link>
        </footer>
      </main>
    </div>
  );
}

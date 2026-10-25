'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  House,
  Wallet,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { Notice, PageHeading } from './ui';
import { CATEGORIES, STATES, STAGES } from '@/lib/states';
import { toCents } from '@/lib/algorithms';
import type { Assessment, Category } from '@/lib/types';
import { ResourceCard, useMatches } from './resources';
export function AssessmentPage({ results = false }: { results?: boolean }) {
  const { state, run, busy } = useWorkspace();
  const router = useRouter();
  const [step, setStep] = useState(0),
    [error, setError] = useState('');
  const [a, setA] = useState<Assessment>(
    state.assessment ?? {
      state: state.profile.state,
      county: state.profile.county,
      zip: state.profile.zip,
      county_confirmed: false,
      stage: 'Early housing concern',
      needs: ['Rental assistance'],
      rent_cents: 0,
      arrears_cents: 0,
      income_cents: 0,
      expenses_cents: 0,
      household_size: 1,
      language: state.profile.language,
      court_case: false,
      hearing: false,
      safety: false,
      notice: false,
      utilities: false,
      communication: 'in-app',
      accessibility: '',
    },
  );
  const matches = useMatches();
  const update = (key: keyof Assessment, value: unknown) =>
    setA((prev) => ({ ...prev, [key]: value }));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      if (step === 2) {
        const f = new FormData(e.currentTarget);
        const parsed = {
          rent_cents: toCents(String(f.get('rent') || '0')),
          arrears_cents: toCents(String(f.get('arrears') || '0')),
          income_cents: toCents(String(f.get('income') || '0')),
          expenses_cents: toCents(String(f.get('expenses') || '0')),
        };
        setA((prev) => ({ ...prev, ...parsed }));
      }
      if (step < 3) {
        setStep(step + 1);
        return;
      }
      const result = await run('save_assessment', a as unknown as Record<string, unknown>);
      if (result) router.push('/assessment/results');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check your answers.');
    }
  }
  if (results)
    return (
      <>
        <PageHeading
          eyebrow="YOUR NEXT CHAPTER"
          title="A clearer path starts here."
          description="Here are potential connections and next steps based on what you shared."
        />
        {!state.assessment ? (
          <Notice>
            Complete your assessment first. <Link href="/assessment">Start here</Link>.
          </Notice>
        ) : (
          <>
            <div className="results-summary panel">
              <span className="success-icon">
                <Check size={25} />
              </span>
              <div>
                <h2>Your private housing plan is ready.</h2>
                <p>
                  You reported {state.assessment.stage.toLowerCase()} in {state.assessment.county},{' '}
                  {state.assessment.state}. We found {matches.length} potentially relevant
                  assistance pathways.
                </p>
              </div>
              <Link href="/navigator" className="btn primary">
                View my next steps
                <ArrowRight size={17} />
              </Link>
            </div>
            {(state.assessment.court_case ||
              state.assessment.hearing ||
              state.assessment.safety) && (
              <Notice tone="warning">
                Contact qualified legal help promptly for court papers, an upcoming hearing, a
                lockout, or an immediate concern. Call 911 for immediate danger. This app cannot
                extend a deadline.
              </Notice>
            )}
            <div className="resource-grid">
              {matches.slice(0, 4).map((m) => (
                <ResourceCard key={m.resource.id} match={m} />
              ))}
            </div>
            <div className="button-row">
              <Link className="btn secondary" href="/assessment">
                Edit my answers
              </Link>
              <Link className="btn primary" href="/dashboard">
                Go to my dashboard
                <ArrowRight size={16} />
              </Link>
            </div>
          </>
        )}
        <Notice>
          This assessment organizes your reported needs. It does not determine legal rights,
          benefits eligibility, court status, or the likelihood of an eviction.
        </Notice>
      </>
    );
  const steps = [
    { title: 'Your location', icon: MapPin },
    { title: 'Your situation', icon: House },
    { title: 'Your estimates', icon: Wallet },
    { title: 'Your preferences', icon: HeartHandshake },
  ];
  return (
    <>
      <PageHeading
        eyebrow="A FEW QUESTIONS. A MORE PERSONAL PATH."
        title="Let’s understand your situation."
        description="Share only what you’re comfortable with. Your answers stay private."
      />
      <div className="assessment-layout">
        <aside className="assessment-steps">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={'assessment-step ' + (step === i ? 'active' : step > i ? 'complete' : '')}
            >
              <span>{step > i ? <Check size={18} /> : <s.icon size={19} />}</span>
              <div>
                <small>STEP {i + 1}</small>
                <strong>{s.title}</strong>
              </div>
            </div>
          ))}
          <div className="assessment-reassurance">
            <ShieldCheck size={22} />
            <h3>Your story belongs to you.</h3>
            <p>
              We don’t ask for Social Security numbers, bank credentials, immigration information,
              or medical records.
            </p>
            <Link href="/resources">You can browse resources anytime.</Link>
          </div>
        </aside>
        <section className="panel assessment-form">
          <div className="assessment-form-header">
            <p className="eyebrow">STEP {step + 1} OF 4</p>
            <h2>
              {
                [
                  'Where is your rental home?',
                  'What would you like help with?',
                  'A few numbers, only if you want.',
                  'What kind of support feels right?',
                ][step]
              }
            </h2>
            <p className="muted">
              {
                [
                  'Your location helps us avoid suggesting programs that don’t serve your community.',
                  'There’s no right or wrong answer. Tell us where things stand today.',
                  'Estimates are enough. Leave a field empty if you prefer not to share.',
                  'Choose the help you’d like to explore. You’re in control of the next step.',
                ][step]
              }
            </p>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <form key={step} onSubmit={submit} className="form-stack">
            {step === 0 && (
              <>
                <label>
                  State or territory
                  <select
                    value={a.state}
                    onChange={(e) =>
                      setA({ ...a, state: e.target.value, county: '', county_confirmed: false })
                    }
                  >
                    {STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    County, parish, borough, or equivalent
                    <input
                      required
                      maxLength={100}
                      value={a.county}
                      onChange={(e) =>
                        setA({ ...a, county: e.target.value, county_confirmed: false })
                      }
                      placeholder="e.g. Delaware"
                      list="county-examples"
                    />
                    <datalist id="county-examples">
                      {a.state === 'PA' &&
                        ['Delaware', 'Philadelphia', 'Bucks', 'Chester', 'Montgomery'].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                    </datalist>
                  </label>
                  <label>
                    Rental property ZIP code
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      value={a.zip}
                      onChange={(e) => update('zip', e.target.value)}
                    />
                  </label>
                </div>
                <Notice>
                  ZIP codes can cross county boundaries. We don’t use an unverified ZIP-to-county
                  guess. Please confirm your county from a reliable address record.
                </Notice>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    required
                    checked={a.county_confirmed}
                    onChange={(e) => update('county_confirmed', e.target.checked)}
                  />
                  <span>
                    I confirm this is the county or equivalent where my rental home is located.
                  </span>
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <div className="form-grid">
                  <label>
                    Are you currently renting?
                    <select
                      value={String(a.renting ?? true)}
                      onChange={(e) => update('renting', e.target.value === 'true')}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No / exploring housing support</option>
                    </select>
                  </label>
                  <label>
                    Are you behind on rent?
                    <select
                      value={String(a.behind_rent ?? a.arrears_cents > 0)}
                      onChange={(e) => update('behind_rent', e.target.value === 'true')}
                    >
                      <option value="false">No / not sure</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                </div>
                <label>
                  Which stage best describes your situation?
                  <select
                    value={a.stage}
                    onChange={(e) =>
                      setA({
                        ...a,
                        stage: e.target.value,
                        court_case: e.target.value === 'Court case reported' ? true : a.court_case,
                      })
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Do any of these apply?</legend>
                  {[
                    { key: 'notice', text: 'I received a notice from my landlord' },
                    { key: 'court_case', text: 'A housing court case has been filed' },
                    { key: 'hearing', text: 'I have an upcoming hearing or urgent deadline' },
                    { key: 'utilities', text: 'I need help with utilities or repairs' },
                    {
                      key: 'safety',
                      text: 'I am locked out, without shelter, or have an immediate safety concern',
                    },
                  ].map((q) => (
                    <label className="choice-card" key={q.key}>
                      <input
                        type="checkbox"
                        checked={Boolean(a[q.key as keyof Assessment])}
                        onChange={(e) => update(q.key as keyof Assessment, e.target.checked)}
                      />
                      <span>{q.text}</span>
                    </label>
                  ))}
                </fieldset>
                {(a.court_case || a.hearing || a.safety) && (
                  <Notice tone="warning">
                    Please contact qualified legal or housing help promptly. You can browse
                    resources now without finishing this form. For immediate danger, call 911.
                  </Notice>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <div className="form-grid">
                  {[
                    { name: 'rent', key: 'rent_cents', title: 'Monthly rent' },
                    { name: 'arrears', key: 'arrears_cents', title: 'Unpaid rent' },
                    { name: 'income', key: 'income_cents', title: 'Monthly household income' },
                    {
                      name: 'expenses',
                      key: 'expenses_cents',
                      title: 'Essential expenses, excluding rent',
                    },
                  ].map((f) => (
                    <label key={f.name}>
                      {f.title} <small className="muted">optional</small>
                      <span className="currency-input">
                        <span>$</span>
                        <input
                          name={f.name}
                          type="number"
                          min="0"
                          max="100000000"
                          step="0.01"
                          defaultValue={
                            Number(a[f.key as keyof Assessment])
                              ? Number(a[f.key as keyof Assessment]) / 100
                              : ''
                          }
                          placeholder="0.00"
                        />
                      </span>
                    </label>
                  ))}
                </div>
                <label>
                  People in your household
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={a.household_size}
                    onChange={(e) => update('household_size', Number(e.target.value))}
                  />
                </label>
                <label>
                  Expected changes to income <small className="muted">optional</small>
                  <input
                    maxLength={300}
                    value={a.future_income_change ?? ''}
                    onChange={(e) => update('future_income_change', e.target.value)}
                    placeholder="For your own notes; no documents required"
                  />
                </label>
                <Notice>
                  These estimates help you compare scenarios. They are not a benefits application,
                  credit evaluation, or financial recommendation.
                </Notice>
              </>
            )}
            {step === 3 && (
              <>
                <fieldset>
                  <legend>I’m interested in…</legend>
                  <div className="choice-grid">
                    {CATEGORIES.map((c) => (
                      <label
                        key={c}
                        className={'choice-card ' + (a.needs.includes(c) ? 'selected' : '')}
                      >
                        <input
                          type="checkbox"
                          checked={a.needs.includes(c)}
                          onChange={(e) =>
                            update(
                              'needs',
                              e.target.checked
                                ? [...a.needs, c]
                                : (a.needs.filter((n) => n !== c) as Category[]),
                            )
                          }
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="form-grid">
                  <label>
                    Preferred language
                    <select value={a.language} onChange={(e) => update('language', e.target.value)}>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="other">Other / interpreter requested</option>
                    </select>
                  </label>
                  <label>
                    Preferred contact method
                    <select
                      value={a.communication}
                      onChange={(e) => update('communication', e.target.value)}
                    >
                      <option value="in-app">In-app only</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                  </label>
                </div>
                <label>
                  Communication or accessibility needs <small className="muted">optional</small>
                  <textarea
                    value={a.accessibility}
                    maxLength={500}
                    onChange={(e) => update('accessibility', e.target.value)}
                    placeholder="For example: an interpreter or large-print information. Please avoid medical details."
                  />
                </label>
                <small className="muted">
                  Preferences are saved for your reference. This prototype sends in-app
                  notifications only; it does not arrange interpretation or contact providers
                  automatically.
                </small>
              </>
            )}
            <div className="form-navigation">
              <button
                type="button"
                disabled={step === 0 || busy}
                className="btn secondary"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button disabled={busy} className="btn primary" type="submit">
                {step === 3 ? 'Create my housing plan' : 'Continue'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

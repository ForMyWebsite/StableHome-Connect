'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  Plus,
  Trash2,
  CalendarDays,
  Download,
  ArrowRight,
  ShieldCheck,
  HandHeart,
  Route,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { PageHeading, Notice, Empty, ExternalLink, downloadText } from './ui';
import { daysUntil, formatDate, money, toCents } from '@/lib/algorithms';
import { clearDemoFiles } from '@/lib/demo-files';
import { STATES } from '@/lib/states';
export function DateManager() {
  const { state, run, busy } = useWorkspace();
  const [show, setShow] = useState(false);
  const dates = state.dates
    .filter((d) => d.user_id === state.profile.id)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  function exportDate(title: string, date: string, id: string) {
    const escape = (s: string) =>
      s
        .replaceAll('\\', '\\\\')
        .replaceAll('\n', '\\n')
        .replaceAll(',', '\\,')
        .replaceAll(';', '\\;');
    downloadText(
      'personal-reminder.ics',
      `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StableHome Connect//Personal reminder//EN\r\nBEGIN:VEVENT\r\nUID:${id}@stablehome.local\r\nDTSTAMP:${new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(
          /\.\d{3}/,
          '',
        )}\r\nDTSTART;VALUE=DATE:${date.replaceAll('-', '')}\r\nSUMMARY:${escape(title)}\r\nDESCRIPTION:User-entered personal reminder. Not an official court notification.\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
      'text/calendar',
    );
  }
  return (
    <section className="panel date-manager">
      <div className="section-title">
        <h2>Your important dates</h2>
        <button className="text-link" onClick={() => setShow(!show)}>
          <Plus size={15} />
          Add a date
        </button>
      </div>
      <p className="muted small">
        Personal reminders, entered by you. The app never calculates a legal deadline.
      </p>
      {show && (
        <form
          className="form-stack inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget,
              f = new FormData(form);
            if (
              await run('add_date', {
                title: f.get('title'),
                scheduled_at: f.get('scheduled_at'),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })
            ) {
              form.reset();
              setShow(false);
            }
          }}
        >
          <label>
            Reminder or appointment title
            <input name="title" required maxLength={120} />
          </label>
          <label>
            Date from your own record
            <input name="scheduled_at" type="date" required />
          </label>
          <button className="btn primary" disabled={busy}>
            Save personal reminder
          </button>
        </form>
      )}
      {dates.map((d) => (
        <div className="reminder-row" key={d.id}>
          <span className="icon-tile">
            <CalendarDays size={19} />
          </span>
          <div>
            <strong>{d.title}</strong>
            <p>
              {formatDate(d.scheduled_at)} ·{' '}
              {daysUntil(d.scheduled_at) < 0
                ? 'Past date'
                : daysUntil(d.scheduled_at) === 0
                  ? 'Today'
                  : `${daysUntil(d.scheduled_at)} days away`}
            </p>
            <small>
              {d.confirmation_status} · Date only · {d.timezone}
            </small>
          </div>
          <button
            className="icon-btn"
            aria-label={'Export reminder ' + d.title}
            onClick={() => exportDate(d.title, d.scheduled_at, d.id)}
          >
            <Download size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label={'Delete reminder ' + d.title}
            disabled={busy}
            onClick={() => run('delete_date', { id: d.id })}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {!dates.length && (
        <p className="small-empty muted">
          No dates yet. Add an appointment or reminder from your own records.
        </p>
      )}
    </section>
  );
}
export function NavigatorPage() {
  const { state, run, busy } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const tasks = state.tasks.filter((t) => t.user_id === state.profile.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  return (
    <>
      <PageHeading
        eyebrow="ONE STEP AT A TIME"
        title="Your path, at your pace."
        description="A flexible guide to organizing your housing next steps. You can edit it as your situation changes."
        action={
          <button className="btn primary" onClick={() => setAdding(!adding)}>
            <Plus size={16} />
            Add my own step
          </button>
        }
      />
      {!state.assessment && (
        <Notice>
          Complete the <Link href="/assessment">housing assessment</Link> for personalized suggested
          tasks. You can also add your own steps below.
        </Notice>
      )}
      <div className="navigator-layout">
        <section className="panel action-plan">
          <div className="section-title">
            <h2>
              <Route size={20} />
              Your housing action plan
            </h2>
            <span className="pill soft-green">
              {done} of {tasks.length} complete
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Action plan progress"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={tasks.length || 1}
          >
            <span style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
          </div>
          {adding && (
            <form
              className="form-stack inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  f = new FormData(form);
                if (
                  await run('add_task', {
                    title: f.get('title'),
                    description: f.get('description') ?? '',
                    due_date: f.get('due_date') || null,
                  })
                ) {
                  form.reset();
                  setAdding(false);
                }
              }}
            >
              <label>
                Your next step
                <input name="title" required maxLength={200} />
              </label>
              <label>
                A little more detail
                <textarea name="description" maxLength={2000} />
              </label>
              <label>
                Optional personal target date
                <input type="date" name="due_date" />
              </label>
              <button className="btn primary" disabled={busy}>
                Save my step
              </button>
            </form>
          )}
          <div className="plan-timeline">
            {tasks.map((t, i) => (
              <div className={'plan-step ' + (t.status === 'done' ? 'complete' : '')} key={t.id}>
                <span className="step-number">
                  {t.status === 'done' ? <Check size={18} /> : i + 1}
                </span>
                <div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={t.status === 'done'}
                      disabled={busy}
                      onChange={() =>
                        run('toggle_task', {
                          id: t.id,
                          status: t.status === 'done' ? 'todo' : 'done',
                        })
                      }
                    />
                    <strong>{t.title}</strong>
                  </label>
                  <p>{t.description}</p>
                  {t.due_date && (
                    <small>
                      Personal target: {formatDate(t.due_date)} · {t.date_source}
                    </small>
                  )}
                  {/resource|legal|organization/.test(t.title) && (
                    <Link className="text-link" href="/resources">
                      Explore assistance
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {/document/.test(t.title) && (
                    <Link className="text-link" href="/documents">
                      Open my documents
                      <ArrowRight size={14} />
                    </Link>
                  )}
                  {/repayment/.test(t.title) && (
                    <Link className="text-link" href="/planner">
                      Try the planner
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!tasks.length && (
            <div className="small-empty">
              <p>Your plan starts with one step.</p>
              <Link className="btn secondary" href="/assessment">
                Describe your situation
              </Link>
            </div>
          )}
        </section>
        <aside>
          <DateManager />
          <div className="panel detail-panel">
            <h2>Know where this guide ends.</h2>
            <p>
              Tasks reflect what you reported. They are educational suggestions, not a court process
              or legal advice.
            </p>
            <p>
              Have a notice or a hearing? Ask a qualified legal aid professional about your
              location’s rules promptly.
            </p>
            <Link href="/resources?category=Legal%20aid" className="text-link">
              Find legal assistance
              <ArrowRight size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
export function BenefitsPage() {
  const { state, run, busy } = useWorkspace();
  const [error, setError] = useState('');
  const logs = state.support_logs.filter((l) => l.user_id === state.profile.id);
  return (
    <>
      <PageHeading
        eyebrow="COMMUNITY MAKES A DIFFERENCE"
        title="Keep track of the help around you."
        description="A private support log for help from family, friends, and your community."
      />
      <Notice>
        SSI, SNAP, rental assistance, and federal housing programs have different rules for informal
        support. Logging help here does not preserve or determine eligibility. This prototype does
        not treat proposed legislation as enacted law.
      </Notice>
      <div className="two-column">
        <section className="panel detail-panel">
          <h2>
            <HandHeart size={20} />
            Record a little support
          </h2>
          {error && <Notice tone="error">{error}</Notice>}
          <form
            className="form-stack"
            onSubmit={async (e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              setError('');
              const form = e.currentTarget,
                f = new FormData(form);
              try {
                const amount = String(f.get('value'));
                if (
                  await run('add_support', {
                    support_type: f.get('support_type'),
                    description: f.get('description'),
                    value_cents: amount ? toCents(amount) : null,
                    recorded_date: f.get('recorded_date'),
                    notes: f.get('notes'),
                  })
                )
                  form.reset();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Check the amount.');
              }
            }}
          >
            <div className="form-grid">
              <label>
                Type of support
                <select name="support_type">
                  {['Groceries', 'Housing expenses', 'Utilities', 'Transportation', 'Other'].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Date
                <input name="recorded_date" type="date" required />
              </label>
            </div>
            <label>
              Description <small className="muted">optional</small>
              <input
                name="description"
                maxLength={1000}
                placeholder="For example: groceries from a family member"
              />
            </label>
            <label>
              Estimated value <small className="muted">optional</small>
              <span className="currency-input">
                <span>$</span>
                <input name="value" type="number" min={0} step="0.01" />
              </span>
            </label>
            <label>
              Your private notes
              <textarea name="notes" maxLength={2000} />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              <Plus size={16} />
              Save to my private log
            </button>
          </form>
        </section>
        <aside className="panel detail-panel">
          <h2>Every program has its own rules.</h2>
          <p>
            For individual guidance, contact a qualified benefits counselor or the agency that
            administers your program.
          </p>
          <div className="education-links">
            <ExternalLink href="https://www.ssa.gov/ssi/">
              Social Security · SSI information
            </ExternalLink>
            <ExternalLink href="https://www.fns.usda.gov/snap/recipient/eligibility">
              USDA · SNAP eligibility information
            </ExternalLink>
            <ExternalLink href="https://www.hud.gov/">
              HUD · Housing program information
            </ExternalLink>
          </div>
          <Link className="btn secondary full" href="/resources?category=Benefits%20counseling">
            Find benefits counseling
            <ArrowRight size={15} />
          </Link>
          <p className="muted small">
            Your log is never shared with landlords, discussion participants, or organizations
            automatically.
          </p>
        </aside>
      </div>
      <div className="section-title">
        <h2>Your support history</h2>
        <span className="muted small">{logs.length} private entries</span>
      </div>
      {logs.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Support</th>
                <th>Description & notes</th>
                <th>Estimated value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDate(l.recorded_date)}</td>
                  <td>
                    <span className="pill">{l.support_type}</span>
                  </td>
                  <td>
                    {l.description}
                    <small className="cell-note">{l.notes}</small>
                  </td>
                  <td>{l.value_cents === null ? 'Not entered' : money(l.value_cents)}</td>
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={'Delete support log ' + l.description}
                      disabled={busy}
                      onClick={() => run('delete_support', { id: l.id })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="A place for the small things that help">
          Your private entries will appear here.
        </Empty>
      )}
    </>
  );
}
export function NotificationsPage() {
  const { state, run, busy } = useWorkspace();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const mine = state.notifications.filter((n) => n.user_id === state.profile.id),
    notifications = mine.filter((n) => !unreadOnly || !n.read_at);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE UPDATES"
        title="Stay connected to your next step."
        description="In-app updates only. These are not official notices or externally sent messages."
        action={
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => run('mark_notifications', {})}
          >
            <Check size={16} />
            Mark all read
          </button>
        }
      />
      <div className="tabs">
        <button className={!unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(false)}>
          All updates
        </button>
        <button className={unreadOnly ? 'active' : ''} onClick={() => setUnreadOnly(true)}>
          Unread ({mine.filter((n) => !n.read_at).length})
        </button>
      </div>
      <div className="panel notification-list">
        {notifications.map((n) => (
          <article key={n.id} className={'notification-item ' + (!n.read_at ? 'unread' : '')}>
            <span className="icon-tile">
              <Bell size={21} />
            </span>
            <div>
              <h2>{n.title}</h2>
              <p>{n.description}</p>
              <small>{formatDate(n.created_at)}</small>
              <div className="button-row">
                <Link
                  className="text-link"
                  href={n.destination}
                  onClick={() => run('mark_notifications', { id: n.id })}
                >
                  View update
                  <ArrowRight size={14} />
                </Link>
                {!n.read_at && (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() => run('mark_notifications', { id: n.id })}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {!notifications.length && (
          <Empty title="You’re all caught up.">
            New in-app updates will appear here. You can change your preferences in settings.
          </Empty>
        )}
      </div>
    </>
  );
}
export function SettingsPage() {
  const { state, run, busy, demo } = useWorkspace();
  const [confirm, setConfirm] = useState(''),
    [error, setError] = useState('');
  const p = state.profile;
  async function deleteAccount() {
    setError('');
    try {
      if (demo) {
        await clearDemoFiles();
        localStorage.removeItem('stablehome-fictional-v1');
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout' }),
        });
        window.location.assign(new URL('/login', window.location.origin).href);
        return;
      }
      const r = await fetch('/api/workspace', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      window.location.assign(new URL('/login', window.location.origin).href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete your account.');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR INFORMATION. YOUR CHOICES."
        title="Make this space your own."
        description="Manage your profile, notification preferences, and the information you keep here."
      />
      <div className="settings-layout">
        <section className="panel detail-panel">
          <h2>Your profile</h2>
          <p className="small muted">
            Account role: {p.role}. Professional and administrator roles are verified separately.
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await run('save_settings', {
                display_name: f.get('display_name'),
                state: f.get('state'),
                county: f.get('county'),
                zip: f.get('zip'),
                language: f.get('language'),
                notification_preferences: f.get('notification_preferences') === 'on',
              });
            }}
          >
            <label>
              Display name
              <input name="display_name" required defaultValue={p.display_name} maxLength={100} />
            </label>
            <div className="form-grid">
              <label>
                State or territory
                <select name="state" defaultValue={p.state}>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ZIP code
                <input name="zip" required pattern="[0-9]{5}" defaultValue={p.zip} maxLength={5} />
              </label>
            </div>
            <label>
              Confirmed county / equivalent
              <input name="county" defaultValue={p.county} maxLength={100} />
            </label>
            <label>
              Preferred language
              <select name="language" defaultValue={p.language}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="other">Other / interpreter</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                name="notification_preferences"
                type="checkbox"
                defaultChecked={p.notification_preferences}
              />
              <span>Show new discussion notifications in my in-app notification center.</span>
            </label>
            <small className="muted">
              No external email or SMS notifications are sent by this prototype. The interface is
              currently in English.
            </small>
            <button disabled={busy} className="btn primary">
              Save my preferences
            </button>
          </form>
        </section>
        <aside>
          <section className="panel detail-panel">
            <h2>
              <ShieldCheck size={19} />
              Your privacy controls
            </h2>
            <p>
              Export your visible workspace records as JSON. Download document contents separately
              from your vault.
            </p>
            <button
              className="btn secondary full"
              onClick={() =>
                downloadText(
                  'stablehome-workspace-export.json',
                  JSON.stringify(
                    {
                      ...state,
                      assessment: p.role === 'tenant' ? state.assessment : null,
                      tasks: state.tasks.filter((t) => t.user_id === p.id),
                      support_logs: state.support_logs.filter((l) => l.user_id === p.id),
                      documents: state.documents.filter(
                        (d) => d.owner_id === p.id || d.shared_with.includes(p.id),
                      ),
                    },
                    null,
                    2,
                  ),
                  'application/json',
                )
              }
            >
              <Download size={16} />
              Export my records
            </button>
            <Link className="text-link" href="/privacy">
              Read the privacy policy
              <ArrowRight size={15} />
            </Link>
          </section>
          {p.role !== 'provider' && p.role !== 'admin' && (
            <section className="panel detail-panel">
              <h2>Work with a housing organization?</h2>
              <p className="small muted">
                Request a provider account. An administrator must independently verify your
                credentials and affiliation.
              </p>
              <form
                className="form-stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await run('request_provider', {
                    organization: f.get('organization'),
                    credential_reference: f.get('credential_reference'),
                  });
                }}
              >
                <label>
                  Organization
                  <input name="organization" required minLength={3} maxLength={200} />
                </label>
                <label>
                  Public professional verification reference
                  <textarea
                    name="credential_reference"
                    required
                    minLength={5}
                    maxLength={1000}
                    placeholder="Public staff directory or professional licensing reference. Do not enter private credentials."
                  />
                </label>
                <button className="btn secondary" disabled={busy}>
                  Request verification
                </button>
              </form>
            </section>
          )}
          <section className="panel detail-panel danger-zone">
            <h2>{demo ? 'Reset the fictional demo' : 'Delete your account'}</h2>
            <p>
              {demo
                ? 'Remove the fictional workspace and demo files saved in this browser.'
                : 'Delete your account, private files, and associated records. Discussions you created are also deleted. This cannot recall copies other people already downloaded. Export anything you want to keep first.'}
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <label>
              Type DELETE to confirm
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              className="btn danger-btn"
              disabled={confirm !== 'DELETE' || busy}
              onClick={deleteAccount}
            >
              <Trash2 size={16} />
              {demo ? 'Reset demo data' : 'Permanently delete my account'}
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}

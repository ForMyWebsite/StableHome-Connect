'use client';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ClipboardList,
  MessagesSquare,
  FolderLock,
  Calculator,
  CalendarDays,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Leaf,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { PageHeading, SectionTitle, Neighborhood, Notice } from './ui';
import { ResourceCard, useMatches } from './resources';
import { daysUntil, formatDate, money } from '@/lib/algorithms';
export function Dashboard() {
  const { state, run, busy, demo } = useWorkspace();
  const p = state.profile;
  const tasks = state.tasks.filter((t) => t.user_id === p.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  const matches = useMatches().slice(0, 3);
  const dates = state.dates
    .filter((d) => d.user_id === p.id)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const a = state.assessment;
  const caseStatus = state.cases.find((c) =>
    state.participants.some((cp) => cp.case_id === c.id && cp.user_id === p.id && !cp.blocked),
  )?.status;
  return (
    <>
      <PageHeading
        title={`Welcome back, ${p.display_name.split(' ')[0]}.`}
        description="Your path toward housing stability starts here. One step at a time."
        action={
          <Link href="/assessment" className="btn secondary">
            <ClipboardList size={17} />
            {a ? 'Update assessment' : 'Start assessment'}
          </Link>
        }
      />
      <div className="dashboard-overview">
        <section className="stability-card">
          <div className="stability-copy">
            <div className="status-label">
              <span className="tiny-dot" /> YOUR HOUSING JOURNEY
            </div>
            <h2>
              {caseStatus === 'Plan active'
                ? 'A plan. A path forward.'
                : 'Small steps. Stronger footing.'}
            </h2>
            <p>
              You’ve already taken the first step by being here.
              <br />
              Let’s make your next one a little clearer.
            </p>
            <span className="status-pill">
              <Leaf size={14} />
              {caseStatus ?? (a ? 'Exploring options' : 'Getting started')}
            </span>
            <small>Progress reflects your workflow, not a housing outcome.</small>
          </div>
          <Neighborhood small />
        </section>
        <section className="plan-summary panel">
          <div className="section-title">
            <span className="plan-overline">YOUR ACTION PLAN</span>
            <span className="icon-tile">
              <RouteIcon />
            </span>
          </div>
          <div className="progress-number">
            {done}
            <span> / {tasks.length || '–'}</span>
          </div>
          <p>recommended steps complete</p>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Housing action plan completion"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={tasks.length || 1}
          >
            <span style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
          </div>
          <Link className="text-link" href={a ? '/navigator' : '/assessment'}>
            {a ? 'Keep moving forward' : 'Create your private plan'}
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      {(a?.court_case || a?.hearing || a?.safety) && (
        <Notice tone="warning">
          If you have a court date, lockout, or immediate concern, contact qualified legal help
          promptly. A discussion here does not change court deadlines.{' '}
          <Link href="/resources?category=Legal%20aid">Find legal assistance</Link>. For immediate
          danger, call 911.
        </Notice>
      )}
      <div className="quick-actions">
        {[
          {
            href: '/resources',
            icon: MapPin,
            title: 'Find assistance',
            sub: 'Connect with support',
          },
          {
            href: '/mediation',
            icon: MessagesSquare,
            title: 'Open discussion hub',
            sub: 'Explore options together',
          },
          {
            href: '/documents',
            icon: FolderLock,
            title: 'My documents',
            sub: 'Keep everything organized',
          },
          {
            href: '/planner',
            icon: Calculator,
            title: 'Explore repayment',
            sub: 'See what the numbers say',
          },
        ].map((q) => (
          <Link href={q.href} key={q.href}>
            <span className="quick-icon">
              <q.icon size={21} />
            </span>
            <span>
              <strong>{q.title}</strong>
              <small>{q.sub}</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        ))}
      </div>
      <SectionTitle
        title="Connections for your next step"
        href="/resources"
        link="Explore all resources"
      />
      <p className="section-description">
        Potential support based on {a ? 'your assessment' : 'your saved location'}. Confirm
        eligibility and availability directly.
      </p>
      <div className="dashboard-resources">
        {matches.map((m) => (
          <ResourceCard key={m.resource.id} match={m} compact />
        ))}
        {!matches.length && (
          <div className="panel detail-panel">
            <h3>Your connections start here.</h3>
            <p>Complete your assessment to see assistance pathways for your location.</p>
            <Link href="/assessment" className="text-link">
              Describe your situation
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
      <div className="dashboard-lower">
        <section className="panel">
          <div className="panel-header">
            <SectionTitle title="Your next steps" href="/navigator" link="View plan" />
          </div>
          <div className="task-list">
            {tasks.slice(0, 4).map((t) => (
              <label key={t.id} className={'task-row ' + (t.status === 'done' ? 'completed' : '')}>
                <input
                  type="checkbox"
                  checked={t.status === 'done'}
                  disabled={busy}
                  onChange={() =>
                    run('toggle_task', { id: t.id, status: t.status === 'done' ? 'todo' : 'done' })
                  }
                />
                <span>
                  <strong>{t.title}</strong>
                  <small>{t.description}</small>
                </span>
                <span className="task-status">
                  {t.status === 'done' ? <Check size={15} /> : <ArrowRight size={15} />}
                </span>
              </label>
            ))}
            {!tasks.length && (
              <div className="small-empty">
                <ClipboardList size={28} />
                <p>A private action plan can help you take things one step at a time.</p>
                <Link href="/assessment" className="text-link">
                  Start your assessment
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </section>
        <section className="panel important-dates">
          <div className="panel-header">
            <SectionTitle title="On your calendar" href="/navigator" link="Manage" />
          </div>
          {dates.slice(0, 3).map((d) => (
            <div className="date-card" key={d.id}>
              <div className="calendar-tile">
                <small>
                  {new Date(d.scheduled_at + 'T12:00:00Z').toLocaleDateString('en-US', {
                    month: 'short',
                    timeZone: 'UTC',
                  })}
                </small>
                <strong>{d.scheduled_at.slice(8, 10)}</strong>
              </div>
              <div>
                <strong>{d.title}</strong>
                <span>
                  <Clock3 size={12} />
                  {daysUntil(d.scheduled_at) < 0
                    ? 'Past date'
                    : daysUntil(d.scheduled_at) === 0
                      ? 'Today'
                      : `In ${daysUntil(d.scheduled_at)} days`}
                </span>
                <small>
                  {d.confirmation_status} · {demo ? 'Fictional example' : 'Personal reminder'}
                </small>
              </div>
            </div>
          ))}
          {!dates.length && (
            <div className="small-empty">
              <CalendarDays size={26} />
              <p>Add your own appointments and reminders to keep them in one place.</p>
              <Link className="text-link" href="/navigator">
                Add a date
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
          <div className="calendar-note">
            <ShieldCheck size={14} /> Your reminders aren’t official court notifications.
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section>
          <SectionTitle title="Recent activity" />
          <div className="activity-list">
            {state.activity
              .filter((x) => x.user_id === p.id)
              .slice(0, 3)
              .map((e) => (
                <div key={e.id}>
                  <span className="activity-dot">
                    <CheckCircle2 size={15} />
                  </span>
                  <p>
                    {e.description}
                    <small>{formatDate(e.created_at)}</small>
                  </p>
                </div>
              ))}
            {!state.activity.some((x) => x.user_id === p.id) && (
              <p className="muted">Your saved steps and updates will appear here.</p>
            )}
          </div>
        </section>
        <div className="budget-nudge">
          <span className="icon-tile">
            <Calculator size={22} />
          </span>
          <div>
            <h3>A clearer picture of your options.</h3>
            <p>
              {a
                ? `${money(a.arrears_cents)} in reported unpaid rent. Explore different repayment schedules using your own estimates.`
                : 'Try different repayment schedules before starting a conversation.'}
            </p>
            <Link href="/planner" className="text-link">
              Open the repayment planner <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
function RouteIcon() {
  return <CheckCircle2 size={20} />;
}

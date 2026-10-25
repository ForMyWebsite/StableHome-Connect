'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MessagesSquare,
  Plus,
  ArrowRight,
  ArrowLeft,
  Send,
  Users,
  Link as LinkIcon,
  ShieldCheck,
  History,
  Copy,
  FileText,
  Flag,
  LogOut,
  Check,
  CalendarDays,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { Empty, Notice, PageHeading, downloadText } from './ui';
import { formatDate, money, buildSchedule } from '@/lib/algorithms';
import { STATES } from '@/lib/states';
export function MediationPage({ id }: { id?: string }) {
  const { state, run, busy, demo } = useWorkspace();
  const router = useRouter(),
    params = useSearchParams();
  const [creating, setCreating] = useState(false),
    [invitationLink, setInvitationLink] = useState(''),
    [copied, setCopied] = useState(false);
  const uid = state.profile.id;
  const role = state.profile.role;
  const mine = state.participants
    .filter((p) => p.user_id === uid && p.accepted_at && !p.blocked)
    .map((p) => p.case_id);
  const cases = state.cases.filter((c) => mine.includes(c.id));
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await run('create_case', {
      title: f.get('title'),
      issue_type: f.get('issue_type'),
      state: f.get('state'),
      county: f.get('county'),
      description: f.get('description'),
      consent: f.get('consent') === 'on',
    });
    if (r?.id) router.push('/mediation/' + r.id);
  }
  if (id === 'invite')
    return (
      <>
        <PageHeading
          title="You’re invited to a discussion."
          description="Joining is voluntary. Your private assessment, support log, and documents are never shared automatically."
        />
        <section className="panel detail-panel narrow-panel">
          <h2>Review the invitation</h2>
          <p>
            You must sign in with the invited email address before joining. Invitations expire after
            72 hours and can be used once.
          </p>
          {demo && (
            <Notice>
              Fictional actor emails: jordan@example.test · taylor@example.test ·
              casey@example.test. Use the role switcher above before accepting.
            </Notice>
          )}
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const token = String(new FormData(e.currentTarget).get('token'))
                .trim()
                .split('token=')
                .at(-1);
              const r = await run('accept_invitation', { token });
              if (r?.id) router.push('/mediation/' + r.id);
            }}
          >
            <label>
              Invitation token or link
              <input
                name="token"
                defaultValue={params.get('token') ?? ''}
                required
                minLength={64}
                placeholder="Paste your invitation link or token"
              />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" required />
              <span>
                I choose to join this private discussion and share messages with the accepted
                participants.
              </span>
            </label>
            <button className="btn primary" disabled={busy} type="submit">
              Accept invitation
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </>
    );
  if (id) {
    const c = cases.find((c) => c.id === id);
    if (!c)
      return (
        <Empty
          title="This discussion is private"
          action={
            <Link className="btn secondary" href="/mediation">
              Back to discussions
            </Link>
          }
        >
          Only accepted participants can view it. Check your invitation or sign in with the correct
          account.
        </Empty>
      );
    const participants = state.participants.filter(
      (p) => p.case_id === id && p.accepted_at && !p.blocked,
    );
    const messages = state.messages
      .filter((m) => m.case_id === id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const proposals = state.proposals
      .filter((p) => p.case_id === id)
      .sort((a, b) => b.version - a.version);
    const latest = proposals[0];
    const own = participants.find((p) => p.user_id === uid);
    const closed = ['Closed', 'Resolved'].includes(c.status);
    const summary = () =>
      downloadText(
        'negotiation-summary.txt',
        `STABLEHOME CONNECT — ${demo ? 'FICTIONAL ' : ''}NEGOTIATION SUMMARY\n\n${c.title}\nStatus recorded by participant: ${c.status}\nLocation: ${c.county}, ${c.state}\nParticipants: ${participants.map((p) => p.display_name).join(', ')}\n\n${proposals
          .map(
            (p) =>
              `Version ${p.version}: ${money(p.terms.total_cents)} total, ${money(p.terms.initial_cents)} initial, ${p.terms.count} ${p.terms.interval} installments. Response: ${p.status}.\n${buildSchedule(
                p.terms,
              )
                .map((r) => `${r.date}: ${money(r.amount_cents)}`)
                .join('\n')}`,
          )
          .join(
            '\n\n',
          )}\n\nThis is an informal discussion record, not a binding contract or legal opinion. Obtain qualified legal review. No court deadline is changed.`,
      );
    return (
      <>
        <Link className="text-link" href="/mediation">
          <ArrowLeft size={15} />
          All discussions
        </Link>
        <PageHeading
          eyebrow="PRIVATE, VOLUNTARY DISCUSSION"
          title={c.title}
          description={`${c.county}, ${c.state} · ${c.issue_type}`}
          action={
            <button onClick={summary} className="btn secondary">
              <FileText size={16} />
              Save summary
            </button>
          }
        />
        <Notice>
          Participation is voluntary. A proposal or agreement here does not pause an eviction or
          extend a court deadline. <Link href="/resources">Find qualified legal assistance</Link>.
        </Notice>
        <div className="mediation-layout">
          <div>
            <section className="panel conversation-panel">
              <div className="panel-header">
                <div>
                  <h2>Conversation</h2>
                  <span className="small muted">Visible only to accepted participants</span>
                </div>
                <span className="pill soft-green">{c.status}</span>
              </div>
              <div className="conversation-read">
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => run('mark_case_read', { case_id: id })}
                >
                  <Check size={14} />
                  Mark conversation read
                </button>
              </div>
              <div className="message-list" aria-label="Discussion messages">
                {messages.map((m) => {
                  const sender = participants.find((p) => p.user_id === m.sender_id);
                  return (
                    <article className={'message ' + (m.sender_id === uid ? 'own' : '')} key={m.id}>
                      <span className="avatar small-avatar">
                        {(sender?.display_name ?? 'Former participant')
                          .split(' ')
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <div className="message-meta">
                          <strong>{sender?.display_name ?? 'Former participant'}</strong>
                          <time dateTime={m.created_at}>
                            {new Date(m.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        <p>{m.content}</p>
                        <small>
                          {state.message_reads?.some(
                            (r) => r.message_id === m.id && r.user_id !== m.sender_id,
                          )
                            ? 'Read by a participant'
                            : m.sender_id === uid
                              ? 'Not marked read by another participant'
                              : demo
                                ? 'Fictional discussion message'
                                : 'Saved to the private discussion'}
                        </small>
                      </div>
                    </article>
                  );
                })}
                {!messages.length && (
                  <div className="small-empty">
                    <MessagesSquare size={30} />
                    <p>
                      Start with what you would like to discuss. Avoid sharing sensitive financial
                      or legal information unnecessarily.
                    </p>
                  </div>
                )}
              </div>
              <form
                className="message-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const content = String(new FormData(form).get('content'));
                  if (await run('send_message', { case_id: id, content })) form.reset();
                }}
              >
                <label className="sr-only" htmlFor="message-content">
                  Your message
                </label>
                <textarea
                  id="message-content"
                  name="content"
                  required
                  maxLength={4000}
                  placeholder={
                    closed ? 'This discussion is closed.' : 'Write a respectful message…'
                  }
                  disabled={closed}
                />
                <button className="btn primary" type="submit" disabled={busy || closed}>
                  <Send size={17} />
                  <span>Send</span>
                </button>
              </form>
            </section>
            <section className="panel proposal-panel">
              <div className="section-title">
                <h2>Proposal history</h2>
                {role !== 'provider' && !closed && (
                  <Link className="text-link" href="/planner">
                    <Plus size={15} />
                    Create a version
                  </Link>
                )}
              </div>
              <p className="muted small">
                Each proposal is preserved. “Review for discussion” records interest in continuing
                the conversation, not a legal signature.
              </p>
              {proposals.map((p, i) => (
                <div className="proposal-version" key={p.id}>
                  <div className="section-title">
                    <strong>
                      <History size={16} />
                      Version {p.version} {i === 0 && <span className="pill">Latest</span>}
                    </strong>
                    <span className="small muted">{p.status.replaceAll('_', ' ')}</span>
                  </div>
                  <div className="proposal-figures">
                    <span>
                      <small>Amount discussed</small>
                      <strong>{money(p.terms.total_cents)}</strong>
                    </span>
                    <span>
                      <small>Initial payment</small>
                      <strong>{money(p.terms.initial_cents)}</strong>
                    </span>
                    <span>
                      <small>Remaining installments</small>
                      <strong>
                        {p.terms.count} · {p.terms.interval}
                      </strong>
                    </span>
                  </div>
                  <p className="small muted">
                    Proposed start: {formatDate(p.terms.start_date)} · By{' '}
                    {participants.find((x) => x.user_id === p.created_by)?.display_name ??
                      'Former participant'}
                  </p>
                  <details>
                    <summary>View exact payment schedule</summary>
                    <ul className="plain-list">
                      {buildSchedule(p.terms).map((r, j) => (
                        <li key={j}>
                          {r.label} · {formatDate(r.date)} · {money(r.amount_cents)}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {Object.entries(p.responses).map(([person, response]) => (
                    <p key={person} className="review-record">
                      <Check size={14} />
                      {participants.find((x) => x.user_id === person)?.display_name ??
                        'Participant'}{' '}
                      reviewed version {p.version}: {response.replaceAll('_', ' ')}
                    </p>
                  ))}
                  {i === 0 &&
                    p.created_by !== uid &&
                    ['tenant', 'landlord'].includes(role) &&
                    !closed && (
                      <div className="button-row">
                        <button
                          className="btn primary"
                          disabled={busy}
                          onClick={() =>
                            run('respond_proposal', { id: p.id, response: 'discussion' })
                          }
                        >
                          Review for discussion
                        </button>
                        <button
                          className="btn secondary"
                          disabled={busy}
                          onClick={() =>
                            run('respond_proposal', { id: p.id, response: 'changes_requested' })
                          }
                        >
                          Suggest changes
                        </button>
                        <button
                          className="btn text-danger"
                          disabled={busy}
                          onClick={() =>
                            run('respond_proposal', { id: p.id, response: 'rejected' })
                          }
                        >
                          Decline
                        </button>
                      </div>
                    )}
                </div>
              ))}
              {!proposals.length && (
                <p className="muted">
                  No proposals yet. The repayment planner can help you explore a starting point.
                </p>
              )}
            </section>
          </div>
          <aside className="discussion-sidebar">
            <section className="panel detail-panel">
              <h2>
                <Users size={18} />
                Participants
              </h2>
              {participants.map((p) => (
                <div className="participant-row" key={p.user_id}>
                  <span className="avatar">
                    {p.display_name
                      .split(' ')
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span>
                    <strong>{p.display_name}</strong>
                    <small>
                      {p.participant_role}
                      {p.user_id === uid ? ' · You' : ''}
                    </small>
                  </span>
                </div>
              ))}
              <hr />
              {role !== 'provider' && (
                <>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={own?.consent_mediator ?? false}
                      disabled={busy}
                      onChange={(e) =>
                        run('mediator_consent', { case_id: id, consent: e.target.checked })
                      }
                    />
                    <span>I consent to a verified mediator joining this discussion.</span>
                  </label>
                  <small className="muted">
                    Both tenant and landlord must agree.
                    {demo
                      ? ' A fictional mediator joins automatically after both consents.'
                      : ' Then invite a verified provider using their email.'}
                  </small>
                  <details>
                    <summary>
                      <LinkIcon size={14} />
                      Invite a participant
                    </summary>
                    <form
                      className="form-stack"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const r = await run('invite', {
                          case_id: id,
                          email: f.get('email'),
                          consent: f.get('consent') === 'on',
                        });
                        if (r?.invite_link) setInvitationLink(r.invite_link);
                      }}
                    >
                      <label>
                        Participant email
                        <input
                          type="email"
                          name="email"
                          required
                          placeholder={demo ? 'taylor@example.test' : 'person@example.com'}
                        />
                      </label>
                      <label className="checkbox-row">
                        <input name="consent" type="checkbox" required />
                        <span>I choose to invite this person into this shared workspace.</span>
                      </label>
                      <button type="submit" disabled={busy} className="btn secondary full">
                        Create expiring link
                      </button>
                    </form>
                    {invitationLink && (
                      <div className="invite-link">
                        <label>
                          Share this link yourself
                          <input readOnly value={invitationLink} />
                        </label>
                        <button
                          className="btn secondary full"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(invitationLink);
                              setCopied(true);
                            } catch {
                              setCopied(false);
                            }
                          }}
                        >
                          <Copy size={14} />
                          {copied ? 'Copied' : 'Copy invitation link'}
                        </button>
                        <small>No email was sent. The link expires in 72 hours.</small>
                      </div>
                    )}
                  </details>
                </>
              )}
            </section>
            <section className="panel detail-panel">
              <h2>
                <FileText size={18} />
                Shared documents
              </h2>
              {state.documents
                .filter((d) =>
                  d.owner_id === uid
                    ? d.shared_with.some((u) => participants.some((p) => p.user_id === u))
                    : d.shared_with.includes(uid),
                )
                .map((d) => (
                  <p key={d.id}>
                    <Link href="/documents">{d.filename}</Link>
                  </p>
                ))}
              <p className="muted small">
                Nothing is shared by default. Choose individual participants from your document
                vault.
              </p>
              <Link className="text-link" href="/documents">
                Manage sharing
                <ArrowRight size={14} />
              </Link>
            </section>
            <section className="panel detail-panel">
              <h2>Record your next step</h2>
              {['tenant', 'landlord'].includes(role) && (
                <>
                  <p className="small muted">
                    Only record progress that participants have actually discussed.
                  </p>
                  <button
                    className="btn secondary full"
                    disabled={busy || latest?.status !== 'discussion' || closed}
                    onClick={() => run('case_status', { case_id: id, status: 'Plan active' })}
                  >
                    Record plan active
                  </button>
                  <button
                    className="btn secondary full"
                    disabled={busy || closed}
                    onClick={() => run('case_status', { case_id: id, status: 'Resolved' })}
                  >
                    Record discussion resolved
                  </button>
                </>
              )}
              <Link className="text-link" href="/navigator">
                <CalendarDays size={15} />
                Set your own reminder
              </Link>
              <details>
                <summary>Activity history</summary>
                {state.case_events
                  ?.filter((e) => e.case_id === id)
                  .map((e) => (
                    <p className="small muted" key={e.id}>
                      {e.event_type} · {formatDate(e.created_at)}
                    </p>
                  ))}
                {demo && (
                  <p className="small muted">
                    Fictional message and proposal history is shown in this workspace.
                  </p>
                )}
              </details>
            </section>
            <section className="panel detail-panel safety-controls">
              <h2>
                <ShieldCheck size={18} />
                You stay in control
              </h2>
              <p className="small muted">
                Leave at any time. Get private support if you feel pressured or unsafe.
              </p>
              <Link className="text-link" href="/resources?category=Legal%20aid">
                Find legal support
                <ArrowRight size={14} />
              </Link>
              <details>
                <summary>
                  <Flag size={14} />
                  Report a concern
                </summary>
                <form
                  className="form-stack"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await run('report', {
                      case_id: id,
                      reason: new FormData(e.currentTarget).get('reason'),
                    });
                  }}
                >
                  <label>
                    Describe the concern
                    <textarea name="reason" required minLength={10} maxLength={2000} />
                  </label>
                  <button className="btn secondary" disabled={busy}>
                    Submit in-app report
                  </button>
                  <small>
                    Reports are not emergency services. Administrator response times are not
                    guaranteed.
                  </small>
                </form>
              </details>
              <button
                className="btn text-danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    window.confirm(
                      'Leave this discussion? You will lose workspace access. Existing messages remain in the discussion.',
                    )
                  ) {
                    const r = await run('leave_case', { case_id: id });
                    if (r) router.push('/mediation');
                  }
                }}
              >
                <LogOut size={15} />
                Leave discussion
              </button>
            </section>
          </aside>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="A CONVERSATION CAN BE A START"
        title="Find a way forward, together."
        description="A private space for voluntary tenant–landlord discussions. You choose when and what to share."
        action={
          ['tenant', 'landlord'].includes(role) && (
            <button className="btn primary" onClick={() => setCreating(!creating)}>
              <Plus size={17} />
              New discussion
            </button>
          )
        }
      />
      <Notice>
        This hub supports informal private discussion. It does not enroll you in an official
        diversion program or connect you to a mediator automatically.{' '}
        <Link href="/resources">Explore professional support</Link>.
      </Notice>
      {creating && (
        <section className="panel detail-panel">
          <h2>Open a voluntary discussion</h2>
          <form className="form-stack" onSubmit={create}>
            <label>
              Give your discussion a title
              <input
                name="title"
                required
                minLength={3}
                maxLength={120}
                placeholder="For example: Exploring a rent repayment schedule"
              />
            </label>
            <div className="form-grid">
              <label>
                Issue
                <select name="issue_type">
                  <option>Rent payment</option>
                  <option>Repairs or utilities</option>
                  <option>Communication</option>
                  <option>Other housing concern</option>
                </select>
              </label>
              <label>
                State
                <select name="state" defaultValue={state.profile.state}>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Confirmed county / equivalent
              <input name="county" required defaultValue={state.profile.county} maxLength={100} />
            </label>
            <label>
              What would you like to discuss?
              <textarea
                name="description"
                minLength={10}
                maxLength={2000}
                required
                placeholder="Share a brief description. Avoid sensitive personal or legal details."
              />
            </label>
            <label className="checkbox-row">
              <input name="consent" required type="checkbox" />
              <span>
                I’m choosing to open a voluntary discussion. I’ll separately choose whether to
                invite anyone.
              </span>
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              Create private discussion
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      )}
      <div className="section-title">
        <h2>Your discussions</h2>
        <Link href="/mediation/invite" className="text-link">
          Have an invitation?
          <ArrowRight size={14} />
        </Link>
      </div>
      {cases.length ? (
        <div className="case-grid">
          {cases.map((c) => (
            <Link className="case-card panel" href={'/mediation/' + c.id} key={c.id}>
              <div className="section-title">
                <span className="icon-tile">
                  <MessagesSquare size={23} />
                </span>
                <span className="pill soft-green">{c.status}</span>
              </div>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <div className="case-card-footer">
                <span>
                  <Users size={14} />
                  {
                    state.participants.filter(
                      (p) => p.case_id === c.id && !p.blocked && p.accepted_at,
                    ).length
                  }{' '}
                  accepted participants
                </span>
                <ArrowRight size={19} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title={
            role === 'provider' ? 'No authorized discussions yet' : 'Start with a conversation'
          }
        >
          {role === 'provider'
            ? 'A tenant and landlord must both consent and invite your verified account before you can view a discussion.'
            : 'Create a discussion, then choose whether to invite the other person with a secure, expiring link.'}
        </Empty>
      )}
    </>
  );
}

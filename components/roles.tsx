'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  MessagesSquare,
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  Search,
  Plus,
  Save,
  ArrowLeft,
  MapPin,
  ChartNoAxesCombined,
  Flag,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { PageHeading, Notice, Empty, ExternalLink } from './ui';
import { DateManager } from './supporting';
import { MediationPage } from './mediation';
import type { Resource } from '@/lib/types';
import { CATEGORIES, STATES } from '@/lib/states';
import { toCents } from '@/lib/algorithms';
export function RoleDashboard({ section, id }: { section?: string; id?: string }) {
  const { state, demo } = useWorkspace();
  const role = state.profile.role;
  const provider = role === 'provider';
  const mine = state.cases.filter((c) =>
    state.participants.some(
      (p) => p.case_id === c.id && p.user_id === state.profile.id && !p.blocked && p.accepted_at,
    ),
  );
  if (section === 'cases') return <MediationPage id={id} />;
  return (
    <>
      <PageHeading
        eyebrow={provider ? 'VERIFIED PROFESSIONAL WORKSPACE' : 'VOLUNTARY RESOLUTION WORKSPACE'}
        title={`${provider ? 'Support' : 'Move'} the conversation forward.`}
        description={
          provider
            ? 'Review only the cases you have been explicitly authorized to access.'
            : 'Organize discussions, review proposals, and coordinate mutually chosen next steps.'
        }
        action={
          <Link className="btn primary" href="/mediation">
            <MessagesSquare size={16} />
            {provider ? 'View assigned discussions' : 'Open discussion hub'}
          </Link>
        }
      />
      <Notice>
        {demo ? 'Fictional demonstration. ' : ''}
        {provider
          ? 'Provider access requires administrator verification, consent from both parties, and an accepted invitation. A suggested match is not an accepted referral.'
          : 'Tenant assessments, income estimates, resource searches, support logs, and private documents are not available in this workspace.'}
      </Notice>
      <div className="metric-grid">
        {[
          { title: 'Authorized discussions', value: mine.length, icon: MessagesSquare },
          {
            title: 'Proposals to review',
            value: state.proposals.filter(
              (p) =>
                mine.some((c) => c.id === p.case_id) &&
                p.created_by !== state.profile.id &&
                p.status === 'proposed',
            ).length,
            icon: ClipboardCheck,
          },
          {
            title: 'Shared documents',
            value: state.documents.filter((d) => d.shared_with.includes(state.profile.id)).length,
            icon: ShieldCheck,
          },
        ].map((m) => (
          <section className="panel metric-card" key={m.title}>
            <span className="icon-tile">
              <m.icon size={21} />
            </span>
            <strong>{m.value}</strong>
            <p>{m.title}</p>
          </section>
        ))}
      </div>
      <div className="navigator-layout">
        <section className="panel detail-panel">
          <div className="section-title">
            <h2>{provider ? 'Assigned discussions' : 'Your active discussions'}</h2>
            <Link className="text-link" href={'/' + role + '/cases'}>
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
          {mine.map((c) => (
            <Link className="role-case-row" href={`/${role}/cases/${c.id}`} key={c.id}>
              <span className="icon-tile">
                <MessagesSquare size={22} />
              </span>
              <span>
                <strong>{c.title}</strong>
                <small>
                  {c.county}, {c.state} · {c.status}
                </small>
              </span>
              <ArrowRight size={17} />
            </Link>
          ))}
          {!mine.length && (
            <Empty
              title={
                provider ? 'No authorized assignments yet' : 'Your next conversation starts here'
              }
            >
              {provider
                ? 'The participants must both consent before inviting your verified account. No tenant information is exposed automatically.'
                : 'Start a voluntary discussion or accept an invitation from the other participant.'}
            </Empty>
          )}
          {provider && (
            <Notice>
              Record case notes in the shared conversation only when appropriate. This prototype
              does not maintain separate clinical or confidential professional notes.
            </Notice>
          )}
        </section>
        <DateManager />
      </div>
    </>
  );
}
function freshResource(): Resource {
  return {
    id: '',
    organization: '',
    description: '',
    category: 'Rental assistance',
    scope: 'national',
    state: null,
    counties: [],
    website: 'https://',
    phone: null,
    address: null,
    application_method: '',
    eligibility_notes: '',
    max_income_cents: null,
    languages: [],
    urgent: false,
    appointment_required: null,
    intake_status: 'Contact organization; availability unconfirmed',
    last_verified_at: null,
    source_url: 'https://',
    review_status: 'Needs source review',
    active: true,
  };
}
export function AdminPage({ section, id }: { section?: string; id?: string }) {
  const { state, run, busy, demo } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState(''),
    [error, setError] = useState(''),
    [addingJurisdiction, setAddingJurisdiction] = useState(false);
  const edit = id === 'new' ? freshResource() : state.resources.find((r) => r.id === id);
  const resources = state.resources.filter((r) =>
    r.organization.toLowerCase().includes(query.toLowerCase()),
  );
  if (section === 'resources' && id && edit)
    return (
      <>
        <Link className="text-link" href="/admin/resources">
          <ArrowLeft size={15} />
          Back to directory management
        </Link>
        <PageHeading
          title={
            id === 'new'
              ? 'Add a documented assistance pathway.'
              : 'Review and update this listing.'
          }
          description="Use published information and an authoritative source. Leave unknown facts empty."
        />
        {error && <Notice tone="error">{error}</Notice>}
        <section className="panel detail-panel">
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              const f = new FormData(e.currentTarget);
              try {
                const scope = f.get('scope') as Resource['scope'];
                const r = {
                  ...edit,
                  id: String(f.get('id')),
                  organization: String(f.get('organization')),
                  description: String(f.get('description')),
                  category: f.get('category'),
                  scope,
                  state: scope === 'national' ? null : f.get('state'),
                  counties:
                    scope === 'county'
                      ? String(f.get('counties'))
                          .split(',')
                          .map((c) => c.trim())
                          .filter(Boolean)
                      : [],
                  website: f.get('website'),
                  phone: f.get('phone') || null,
                  address: f.get('address') || null,
                  application_method: f.get('application_method'),
                  eligibility_notes: f.get('eligibility_notes'),
                  max_income_cents: f.get('max_income')
                    ? toCents(String(f.get('max_income')))
                    : null,
                  languages: String(f.get('languages'))
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  urgent: f.get('urgent') === 'on',
                  appointment_required:
                    f.get('appointment') === 'unknown' ? null : f.get('appointment') === 'yes',
                  intake_status: f.get('intake_status'),
                  source_url: f.get('source_url'),
                  active: f.get('active') === 'on',
                  last_verified_at:
                    f.get('reviewed') === 'on' ? new Date().toISOString() : edit.last_verified_at,
                  review_status:
                    f.get('reviewed') === 'on'
                      ? 'Source reviewed by administrator'
                      : edit.review_status,
                };
                if (await run('resource_upsert', r)) router.push('/admin/resources');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Check the fields.');
              }
            }}
          >
            <div className="form-grid">
              <label>
                Listing identifier
                <input
                  name="id"
                  defaultValue={edit.id}
                  required
                  pattern="[a-z0-9-]+"
                  placeholder="organization-housing-support"
                  readOnly={id !== 'new'}
                />
              </label>
              <label>
                Organization name
                <input
                  name="organization"
                  defaultValue={edit.organization}
                  required
                  maxLength={160}
                />
              </label>
            </div>
            <label>
              Plain-language description
              <textarea
                name="description"
                defaultValue={edit.description}
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Category
                <select name="category" defaultValue={edit.category}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Service area type
                <select name="scope" defaultValue={edit.scope}>
                  <option value="national">National directory / service</option>
                  <option value="state">Specific state</option>
                  <option value="county">Specific counties</option>
                </select>
              </label>
              <label>
                State for local listings
                <select name="state" defaultValue={edit.state ?? 'PA'}>
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Counties served, separated by commas
                <input name="counties" defaultValue={edit.counties.join(', ')} />
              </label>
              <label>
                Official website
                <input
                  name="website"
                  type="url"
                  pattern="https://.*"
                  defaultValue={edit.website}
                  required
                />
              </label>
              <label>
                Source URL for this information
                <input
                  name="source_url"
                  type="url"
                  pattern="https://.*"
                  defaultValue={edit.source_url}
                  required
                />
              </label>
              <label>
                Phone, if published
                <input name="phone" defaultValue={edit.phone ?? ''} maxLength={40} />
              </label>
              <label>
                Address, if published
                <input name="address" defaultValue={edit.address ?? ''} maxLength={300} />
              </label>
            </div>
            <label>
              How to apply or contact
              <textarea
                name="application_method"
                defaultValue={edit.application_method}
                minLength={3}
                maxLength={1000}
                required
              />
            </label>
            <label>
              Published eligibility information
              <textarea
                name="eligibility_notes"
                defaultValue={edit.eligibility_notes}
                minLength={3}
                maxLength={2000}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                Published monthly income ceiling, if universally applicable
                <input
                  name="max_income"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={edit.max_income_cents === null ? '' : edit.max_income_cents / 100}
                />
                <small className="muted">
                  Leave empty for variable, household-size-based, or unknown limits.
                </small>
              </label>
              <label>
                Published language codes, separated by commas
                <input
                  name="languages"
                  defaultValue={edit.languages.join(', ')}
                  placeholder="Only when documented: en, es"
                />
              </label>
              <label>
                Appointment required?
                <select
                  name="appointment"
                  defaultValue={
                    edit.appointment_required === null
                      ? 'unknown'
                      : edit.appointment_required
                        ? 'yes'
                        : 'no'
                  }
                >
                  <option value="unknown">Not confirmed</option>
                  <option value="yes">Published as required</option>
                  <option value="no">Published as not required</option>
                </select>
              </label>
              <label>
                Current intake / funding statement
                <input
                  name="intake_status"
                  defaultValue={edit.intake_status}
                  minLength={3}
                  maxLength={300}
                  required
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input type="checkbox" name="active" defaultChecked={edit.active} />
              <span>Show this listing in the directory</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="urgent" defaultChecked={edit.urgent} />
              <span>The published service includes urgent assistance or referrals</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" name="reviewed" />
              <span>
                I personally reviewed the authoritative source today. Record today’s source-review
                date; this does not verify funding or individual eligibility.
              </span>
            </label>
            <button className="btn primary" disabled={busy}>
              <Save size={16} />
              Save listing
            </button>
          </form>
        </section>
      </>
    );
  if (section === 'resources')
    return (
      <>
        <PageHeading
          title="Keep the directory useful."
          description="Maintain documented assistance pathways and flag information that needs review."
          action={
            <Link className="btn primary" href="/admin/resources/new">
              <Plus size={16} />
              Add a listing
            </Link>
          }
        />
        <label className="search-field admin-search">
          <Search size={17} />
          <input
            aria-label="Search managed resources"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an organization…"
          />
        </label>
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Service area</th>
                <th>Source review</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.organization}</strong>
                    <small className="cell-note">{r.category}</small>
                  </td>
                  <td>
                    {r.scope === 'national' ? 'National' : r.counties.join(', ') + ' ' + r.state}
                  </td>
                  <td>{r.last_verified_at?.slice(0, 10) ?? 'Needs live review'}</td>
                  <td>
                    <span className="pill">{r.active ? 'Listed' : 'Inactive'}</span>
                  </td>
                  <td>
                    <Link className="text-link" href={'/admin/resources/' + r.id}>
                      Review / edit
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  if (section === 'providers')
    return (
      <>
        <PageHeading
          title="Trust starts with verification."
          description="Independently verify organizational affiliation and professional credentials before approving a provider."
        />
        <Notice>
          Approval grants the provider role only. Private case access still requires consent and an
          accepted invitation. Administrator status does not grant access to private tenant
          documents.
        </Notice>
        <section className="panel detail-panel">
          <h2>Pending requests</h2>
          {state.provider_requests
            ?.filter((r) => r.status === 'Pending')
            .map((r) => (
              <div className="provider-request" key={r.user_id}>
                <h3>{r.organization}</h3>
                <p>{r.credential_reference}</p>
                <small>Requesting account: {r.user_id}</small>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run('verify_provider', { user_id: r.user_id, confirmed: true });
                  }}
                >
                  <label className="checkbox-row">
                    <input type="checkbox" required />
                    <span>
                      I independently verified the affiliation and professional credentials.
                    </span>
                  </label>
                  <button className="btn primary" disabled={busy}>
                    Approve verified provider
                  </button>
                </form>
              </div>
            ))}
          {!state.provider_requests?.some((r) => r.status === 'Pending') && (
            <p className="small-empty muted">No pending verification requests.</p>
          )}
          <h2>Approved providers</h2>
          {state.providers.map((p) => (
            <div className="participant-row" key={p.id}>
              <span className="icon-tile">
                <ShieldCheck size={20} />
              </span>
              <span>
                <strong>{p.display_name}</strong>
                <small>
                  {demo ? 'Fictional verified mediator' : 'Administrator-approved provider'}
                </small>
              </span>
            </div>
          ))}
        </section>
      </>
    );
  if (section === 'jurisdictions')
    return (
      <>
        <PageHeading
          title="Build on local knowledge."
          description="Maintain jurisdiction notes and authoritative sources. Nationwide directories remain available in every state."
          action={
            <button
              className="btn primary"
              onClick={() => setAddingJurisdiction(!addingJurisdiction)}
            >
              <Plus size={16} />
              Add / update an area
            </button>
          }
        />
        <Notice>
          No ZIP-to-county mappings are seeded without verified source data. Users explicitly
          confirm their county. A ZIP can map to multiple jurisdictions.
        </Notice>
        {addingJurisdiction && (
          <section className="panel detail-panel">
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await run('jurisdiction_upsert', {
                    state: f.get('state'),
                    county: f.get('county'),
                    source_url: f.get('source_url'),
                    notes: f.get('notes'),
                    verified_at: f.get('reviewed') === 'on' ? new Date().toISOString() : null,
                  })
                )
                  setAddingJurisdiction(false);
              }}
            >
              <div className="form-grid">
                <label>
                  State
                  <select name="state">
                    {STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  County / equivalent
                  <input name="county" required maxLength={100} />
                </label>
              </div>
              <label>
                Authoritative source
                <input type="url" name="source_url" pattern="https://.*" required />
              </label>
              <label>
                Local notes
                <textarea name="notes" maxLength={2000} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" name="reviewed" />
                <span>I reviewed this source today.</span>
              </label>
              <button className="btn primary" disabled={busy}>
                Save service area
              </button>
            </form>
          </section>
        )}
        <div className="resource-grid">
          {state.jurisdictions.map((j) => (
            <section className="panel detail-panel" key={j.id}>
              <span className="icon-tile">
                <MapPin size={22} />
              </span>
              <h2>
                {j.county}, {j.state}
              </h2>
              <p>{j.notes}</p>
              <ExternalLink href={j.source_url}>Review source</ExternalLink>
              <small className="cell-note">
                {j.verified_at
                  ? 'Last reviewed ' + j.verified_at.slice(0, 10)
                  : 'Source review pending'}
              </small>
            </section>
          ))}
        </div>
      </>
    );
  const counts = state.metrics ?? {
    assessments: state.assessment ? 1 : 0,
    discussions: state.cases.length,
    proposals: state.proposals.length,
  };
  return (
    <>
      <PageHeading
        eyebrow="RESPONSIBLE PLATFORM STEWARDSHIP"
        title={
          section === 'analytics'
            ? 'Understand engagement. Respect privacy.'
            : 'A stronger network of support.'
        }
        description={
          section === 'analytics'
            ? 'Workflow engagement is not evidence of an eviction prevented or a verified housing outcome.'
            : 'Keep resources current, verify providers, and review safety concerns.'
        }
      />
      <div className="metric-grid">
        {[
          { title: 'Assessments recorded', value: counts.assessments, icon: ClipboardCheck },
          { title: 'Voluntary discussions', value: counts.discussions, icon: MessagesSquare },
          { title: 'Proposal versions', value: counts.proposals, icon: ChartNoAxesCombined },
        ].map((m) => (
          <div className="panel metric-card" key={m.title}>
            <span className="icon-tile">
              <m.icon size={21} />
            </span>
            <strong>{m.value === null || m.value < 5 ? 'Suppressed' : m.value}</strong>
            <p>{m.title}</p>
            <small>Counts below 5 are suppressed</small>
          </div>
        ))}
      </div>
      <Notice>
        No personal tenant records appear in these aggregates. A completed workflow does not
        establish that an eviction was prevented.
      </Notice>
      {section !== 'analytics' && (
        <>
          <div className="resource-grid">
            {[
              {
                title: 'Resource directory',
                detail: `${state.resources.length} listings · ${state.resources.filter((r) => !r.last_verified_at).length} need live source review`,
                href: '/admin/resources',
                icon: Building2,
              },
              {
                title: 'Provider verification',
                detail: 'Review affiliation and professional credentials',
                href: '/admin/providers',
                icon: Users,
              },
              {
                title: 'Local service areas',
                detail: 'Keep geographic coverage documented',
                href: '/admin/jurisdictions',
                icon: MapPin,
              },
            ].map((x) => (
              <Link href={x.href} key={x.href} className="panel admin-action">
                <span className="icon-tile">
                  <x.icon size={22} />
                </span>
                <h2>{x.title}</h2>
                <p>{x.detail}</p>
                <span className="text-link">
                  Open workspace
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
          <section className="panel detail-panel">
            <h2>
              <Flag size={18} />
              Safety reports
            </h2>
            {state.reports.map((r) => (
              <div className="report-row" key={r.id}>
                <div>
                  <strong>{r.status}</strong>
                  <p>{r.reason}</p>
                  <small>Report {r.id}</small>
                </div>
                {r.status === 'Open' && (
                  <button
                    className="btn secondary"
                    disabled={busy}
                    onClick={() => run('resolve_report', { id: r.id })}
                  >
                    Mark reviewed
                  </button>
                )}
              </div>
            ))}
            {!state.reports.length && <p className="muted">No reports are available for review.</p>}
          </section>
        </>
      )}
    </>
  );
}

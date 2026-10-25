'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Bookmark,
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  Scale,
  House,
  HandHeart,
  MessagesSquare,
  Flame,
  Check,
  ExternalLink as ExternalIcon,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { Empty, ExternalLink, Notice, PageHeading } from './ui';
import { rankResources } from '@/lib/algorithms';
import { CATEGORIES, STATES } from '@/lib/states';
import type { Assessment, Match } from '@/lib/types';
const icons = {
  'Legal aid': Scale,
  'Rental assistance': House,
  Mediation: MessagesSquare,
  'Emergency housing': Flame,
  'Housing counseling': HandHeart,
  'Utility assistance': House,
  'Benefits counseling': HandHeart,
};
export function useMatches() {
  const { state } = useWorkspace();
  const p = state.profile;
  return rankResources(
    state.resources,
    state.assessment && p.role === 'tenant'
      ? state.assessment
      : {
          state: p.state,
          county: p.county,
          county_confirmed: Boolean(p.county),
          needs: ['Rental assistance', 'Legal aid', 'Housing counseling'],
          income_cents: 0,
          court_case: false,
          hearing: false,
          safety: false,
          language: p.language,
        },
  );
}
export function ResourceCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const { state, run, busy } = useWorkspace();
  const r = match.resource;
  const Icon = icons[r.category];
  const saved = state.saved_resources.includes(r.id);
  return (
    <article className={'resource-card ' + (compact ? 'compact' : '')}>
      <div className="resource-card-top">
        <span className={'resource-icon category-' + r.category.toLowerCase().replaceAll(' ', '-')}>
          <Icon size={22} />
        </span>
        <span className="category-label">{r.category}</span>
        <button
          className={'icon-btn bookmark ' + (saved ? 'saved' : '')}
          aria-label={(saved ? 'Unsave ' : 'Save ') + r.organization}
          aria-pressed={saved}
          disabled={busy}
          onClick={() => run('save_resource', { id: r.id, saved: !saved })}
        >
          <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3>
        <Link href={'/resources/' + r.id}>{r.organization}</Link>
      </h3>
      <p className="resource-description">{r.description}</p>
      <div className="resource-area">
        <MapPin size={14} />
        {r.scope === 'national'
          ? 'National finder · confirm local services'
          : `${r.counties.length ? r.counties.join(', ') + ' County' : r.state}, ${r.state}`}
      </div>
      {!compact && (
        <div className="match-explainer">
          <span>
            <Check size={14} />
            {match.score}/100 relevance
          </span>
          <p>{match.reasons.find((r) => r.startsWith('Matches')) ?? match.reasons[0]}</p>
        </div>
      )}
      <div className="resource-card-bottom">
        <span className="review-note">
          {r.last_verified_at
            ? 'Reviewed ' + r.last_verified_at.slice(0, 10)
            : 'Live verification pending'}
        </span>
        <Link className="text-link" href={'/resources/' + r.id}>
          View resource
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
}
export function ResourcesPage({ id }: { id?: string }) {
  const { state, run, busy } = useWorkspace();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? ''),
    [category, setCategory] = useState('All categories'),
    [saved, setSaved] = useState(false),
    [stateFilter, setStateFilter] = useState(state.profile.state),
    [county, setCounty] = useState(state.profile.county),
    [sort, setSort] = useState('relevance');
  const base: Assessment = state.assessment ?? {
    state: state.profile.state,
    county: state.profile.county,
    zip: state.profile.zip,
    county_confirmed: Boolean(state.profile.county),
    stage: 'Exploring',
    needs: ['Rental assistance', 'Legal aid', 'Housing counseling'],
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
  };
  const matches = rankResources(state.resources, {
    ...base,
    state: stateFilter,
    county,
    county_confirmed: Boolean(county),
  }).filter(
    (m) =>
      (!saved || state.saved_resources.includes(m.resource.id)) &&
      (category === 'All categories' || m.resource.category === category) &&
      `${m.resource.organization} ${m.resource.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === 'name')
    matches.sort((a, b) => a.resource.organization.localeCompare(b.resource.organization));
  if (id) {
    const resource = state.resources.find((r) => r.id === id);
    if (!resource)
      return (
        <Empty title="Resource not found">
          The listing may have been removed. Return to the directory to find another option.
        </Empty>
      );
    const match = rankResources([resource], base)[0];
    return (
      <>
        <Link className="text-link" href="/resources">
          <ArrowLeft size={15} />
          Back to assistance
        </Link>
        <PageHeading
          eyebrow={resource.category.toUpperCase()}
          title={resource.organization}
          description={resource.description}
        />
        <div className="two-column">
          <section className="panel detail-panel">
            <span className="pill">{resource.category}</span>
            <h2>How to connect</h2>
            <p>{resource.application_method}</p>
            <div className="button-row">
              <ExternalLink href={resource.website} className="btn primary">
                Visit official website
              </ExternalLink>
              {resource.phone && (
                <a className="btn secondary" href={'tel:' + resource.phone.replaceAll('-', '')}>
                  <Phone size={17} />
                  {resource.phone}
                </a>
              )}
            </div>
            <h2>Who the organization may help</h2>
            <p>{resource.eligibility_notes}</p>
            <h2>Service area</h2>
            <p>
              {resource.scope === 'national'
                ? 'National directory. Select your location on the external site.'
                : resource.counties.join(', ') + ' · ' + resource.state}
            </p>
            {resource.address && <p>{resource.address}</p>}
            <h2>Why this appears</h2>
            {match ? (
              <ul className="reason-list">
                {match.reasons.map((r) => (
                  <li key={r}>
                    <Check size={15} />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <Notice tone="warning">
                This program is outside your confirmed location. It is not a local recommendation.
              </Notice>
            )}
            <Notice>
              Relevance scores describe how a listing fits your stated needs. They do not predict
              eligibility or acceptance.
            </Notice>
          </section>
          <aside className="panel detail-panel">
            <h2>Before you reach out</h2>
            <p>
              Ask about current intake, service area, application requirements, language support,
              and any costs.
            </p>
            <dl className="definition-list">
              <dt>Current intake</dt>
              <dd>{resource.intake_status}</dd>
              <dt>Last verified</dt>
              <dd>{resource.last_verified_at ?? 'Not yet verified live. Confirm directly.'}</dd>
              <dt>Information completeness</dt>
              <dd>{match?.completeness ?? 0}% · missing details do not mean ineligibility</dd>
              <dt>Source</dt>
              <dd>
                <ExternalLink href={resource.source_url}>Official organization source</ExternalLink>
              </dd>
            </dl>
            <button
              className="btn secondary full"
              disabled={busy}
              onClick={() =>
                run('save_resource', {
                  id: resource.id,
                  saved: !state.saved_resources.includes(resource.id),
                })
              }
            >
              <Bookmark size={16} />
              {state.saved_resources.includes(resource.id)
                ? 'Remove from saved'
                : 'Save this resource'}
            </button>
          </aside>
        </div>
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="SUPPORT IS CLOSER THAN YOU THINK"
        title="Find your next connection."
        description="Explore assistance pathways that fit your location and what you need."
      />
      <div className="directory-note">
        <span className="resource-icon">
          <MapPin size={20} />
        </span>
        <div>
          <strong>Local needs. A nationwide starting point.</strong>
          <p>
            National finders cover all states. Local listings appear only for their published
            service area. Contact organizations to confirm current details.
          </p>
        </div>
      </div>
      <div className="panel resource-controls">
        <div className="tabs">
          <button
            aria-pressed={!saved}
            className={!saved ? 'active' : ''}
            onClick={() => setSaved(false)}
          >
            All resources
          </button>
          <button
            aria-pressed={saved}
            className={saved ? 'active' : ''}
            onClick={() => setSaved(true)}
          >
            <Bookmark size={15} />
            Saved resources <span>{state.saved_resources.length}</span>
          </button>
        </div>
        <div className="filter-grid">
          <label className="search-field">
            <span className="sr-only">Search directory</span>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search organizations or type of help…"
            />
          </label>
          <label>
            <span className="sr-only">State</span>
            <select
              aria-label="Filter state"
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setCounty('');
              }}
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">County or equivalent</span>
            <input
              aria-label="Filter county or equivalent"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="Confirmed county / parish"
            />
          </label>
          <label>
            <span className="sr-only">Category</span>
            <select
              aria-label="Filter category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="results-row">
        <p>
          <strong>{matches.length}</strong> {saved ? 'saved ' : ''}potential connections{' '}
          <span className="muted">
            · {STATES.find((s) => s.code === stateFilter)?.name}
            {county ? ', ' + county : ''}
          </span>
        </p>
        <label>
          Sort by{' '}
          <select
            aria-label="Sort resources"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      {matches.length ? (
        <div className="resource-grid">
          {matches.map((m) => (
            <ResourceCard key={m.resource.id} match={m} />
          ))}
        </div>
      ) : (
        <Empty
          title="Let’s try another search"
          action={
            <button
              className="btn secondary"
              onClick={() => {
                setQuery('');
                setCategory('All categories');
                setSaved(false);
              }}
            >
              Clear filters
            </button>
          }
        >
          No matching listings are available for these filters. National directories can help locate
          additional support.
        </Empty>
      )}
      <Notice>
        <ExternalIcon size={14} /> Official websites open externally. No application is submitted by
        viewing or saving a listing.
      </Notice>
    </>
  );
}

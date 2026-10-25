import { describe, it, expect } from 'vitest';
import {
  toCents,
  buildSchedule,
  monthlyObligation,
  rankResources,
  generateTasks,
  canVisit,
  daysUntil,
} from '../lib/algorithms';
import type { Resource, Assessment } from '../lib/types';
const profile: Assessment = {
  state: 'PA',
  county: 'Delaware',
  zip: '19013',
  county_confirmed: true,
  stage: 'Rent payment issue',
  needs: ['Rental assistance'],
  rent_cents: 150000,
  arrears_cents: 120000,
  income_cents: 280000,
  expenses_cents: 75000,
  household_size: 1,
  language: 'en',
  court_case: false,
  hearing: false,
  safety: false,
  notice: false,
  utilities: false,
  communication: 'email',
  accessibility: '',
};
const resource: Resource = {
  id: 'a',
  organization: 'National finder',
  description: 'A national directory',
  category: 'Rental assistance',
  scope: 'national',
  state: null,
  counties: [],
  website: 'https://www.211.org/',
  phone: '211',
  address: null,
  application_method: 'Call',
  eligibility_notes: 'Contact local agency',
  max_income_cents: null,
  languages: ['en'],
  urgent: true,
  appointment_required: null,
  intake_status: 'Contact organization',
  last_verified_at: null,
  source_url: 'https://www.211.org/',
  review_status: 'Needs review',
  active: true,
};
describe('money and calendar schedules', () => {
  it('parses currency without floating point loss', () => {
    expect(toCents('1,200.01')).toBe(120001);
    expect(toCents('0.29')).toBe(29);
  });
  it.each(['-1', 'NaN', 'Infinity', '1.001', '1e9', '900719925474099.99'])(
    'rejects invalid amount %s',
    (value) => expect(() => toCents(value)).toThrow(),
  );
  it('preserves every cent across uneven installments', () => {
    const rows = buildSchedule({
      total_cents: 10001,
      initial_cents: 1000,
      count: 3,
      interval: 'monthly',
      start_date: '2026-01-31',
    });
    expect(rows.reduce((s, r) => s + r.amount_cents, 0)).toBe(10001);
    expect(rows.map((r) => r.date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(rows.at(-1)?.balance_cents).toBe(0);
  });
  it('matches the demonstration five-payment plan', () => {
    const rows = buildSchedule({
      total_cents: 120000,
      initial_cents: 20000,
      count: 5,
      interval: 'monthly',
      start_date: '2026-11-01',
    });
    expect(rows.slice(1).map((r) => r.amount_cents)).toEqual([20000, 20000, 20000, 20000, 20000]);
  });
  it('handles zero balance without inventing payments', () =>
    expect(
      buildSchedule({
        total_cents: 0,
        initial_cents: 0,
        count: 5,
        interval: 'monthly',
        start_date: '2026-01-01',
      }),
    ).toEqual([]));
  it('includes initial payment in the peak calendar-month budget', () =>
    expect(
      monthlyObligation(
        buildSchedule({
          total_cents: 120000,
          initial_cents: 20000,
          count: 5,
          interval: 'weekly',
          start_date: '2026-11-01',
        }),
      ),
    ).toBe(100000));
  it.each([
    { count: 0 },
    { count: 1.5 },
    { initial_cents: 120001 },
    { total_cents: -1 },
    { start_date: '2026-02-30' },
  ])('rejects invalid plans %o', (part) =>
    expect(() =>
      buildSchedule({
        total_cents: 120000,
        initial_cents: 0,
        count: 5,
        interval: 'monthly',
        start_date: '2026-01-01',
        ...part,
      }),
    ).toThrow(),
  );
});
describe('transparent jurisdiction matching', () => {
  it('excludes Philadelphia-only programs in Delaware County', () =>
    expect(
      rankResources(
        [
          resource,
          { ...resource, id: 'b', scope: 'county', state: 'PA', counties: ['Philadelphia'] },
        ],
        profile,
      ).map((m) => m.resource.id),
    ).toEqual(['a']));
  it('never lists state-only resources in other states', () =>
    expect(
      rankResources([{ ...resource, scope: 'state', state: 'PA' }], { ...profile, state: 'CA' }),
    ).toEqual([]));
  it('still includes national directories when county is unknown', () =>
    expect(
      rankResources([resource], { ...profile, county: '', county_confirmed: false }),
    ).toHaveLength(1));
  it('requires confirmed county before suggesting county-only listings', () =>
    expect(
      rankResources([{ ...resource, scope: 'county', state: 'PA', counties: ['Delaware'] }], {
        ...profile,
        county_confirmed: false,
      }),
    ).toEqual([]));
  it('does not disqualify unknown eligibility, or award invented eligibility points', () => {
    const m = rankResources([resource], profile)[0];
    expect(m.score).toBe(65);
    expect(m.reasons.join(' ')).toContain('not verified');
    expect(m.completeness).toBeLessThan(100);
  });
  it('awards the documented 100-point score only for known alignment', () => {
    const m = rankResources(
      [{ ...resource, max_income_cents: 300000, last_verified_at: '2026-10-25' }],
      { ...profile, court_case: true },
    )[0];
    expect(m.score).toBe(100);
  });
  it('ranks deterministically and prioritizes requested categories', () => {
    const rs = [{ ...resource, id: 'z', category: 'Legal aid' as const }, resource];
    expect(rankResources(rs, profile)[0].resource.id).toBe('a');
    expect(rankResources(rs, profile)).toEqual(rankResources([...rs].reverse(), profile));
  });
});
describe('workflow and authorization boundaries', () => {
  it('prioritizes legal help for reported court issues', () =>
    expect(generateTasks({ ...profile, court_case: true }, 'user')[0].title).toContain('legal'));
  it('never grants administrator routes to tenants or providers', () => {
    expect(canVisit('tenant', '/admin/resources')).toBe(false);
    expect(canVisit('provider', '/admin')).toBe(false);
    expect(canVisit('landlord', '/assessment')).toBe(false);
    expect(canVisit('admin', '/admin/resources')).toBe(true);
  });
  it('calculates date-only countdowns across DST without invented deadlines', () =>
    expect(daysUntil('2026-11-02', '2026-10-31')).toBe(2));
});
describe('currency entry grouping', () => {
  it.each(['1,,200', '12,00', '1,2,3'])('rejects malformed grouping %s', (v) =>
    expect(() => toCents(v)).toThrow(),
  );
});

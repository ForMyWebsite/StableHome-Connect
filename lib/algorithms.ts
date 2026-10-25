import type { Assessment, Installment, Match, PlanInput, Resource, Role, Task } from './types';
export function toCents(value: string | number): number {
  const raw = String(value).trim();
  if (raw.includes(',') && !/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw))
    throw new Error('Enter a valid currency amount.');
  const normalized = raw.replaceAll(',', '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error('Enter a nonnegative amount with at most two decimal places.');
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_00)
    throw new Error('Amount is too large.');
  return cents;
}
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function dateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date.');
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value)
    throw new Error('Enter a valid date.');
  return d;
}
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateOnly(value.slice(0, 10)));
export function daysUntil(value: string, from = today()): number {
  return Math.round((dateOnly(value.slice(0, 10)).getTime() - dateOnly(from).getTime()) / 86400000);
}
export function buildSchedule(input: PlanInput): Installment[] {
  const { total_cents: total, initial_cents: initial, count, interval, start_date: start } = input;
  for (const n of [total, initial, count])
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error('Use whole cents and a whole payment count.');
  if (count < 1 || count > 120 || initial > total || total > 100_000_000_00)
    throw new Error('Check the balance, initial payment, and payment count (1–120).');
  if (!['monthly', 'weekly', 'biweekly'].includes(interval))
    throw new Error('Choose a payment interval.');
  const base = dateOnly(start);
  if (total === 0) return [];
  const rows: Installment[] =
    initial > 0
      ? [
          {
            date: start,
            amount_cents: initial,
            balance_cents: total - initial,
            label: 'Initial payment',
          },
        ]
      : [];
  const remaining = total - initial;
  if (remaining === 0) return rows;
  const whole = Math.floor(remaining / count),
    remainder = remaining % count;
  let balance = remaining;
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    const step = i + (initial > 0 ? 1 : 0);
    if (interval === 'monthly') {
      const month = base.getUTCMonth() + step;
      const lastDay = new Date(Date.UTC(base.getUTCFullYear(), month + 1, 0)).getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(month);
      d.setUTCDate(Math.min(base.getUTCDate(), lastDay));
    } else d.setUTCDate(base.getUTCDate() + step * (interval === 'weekly' ? 7 : 14));
    const amount = whole + (i < remainder ? 1 : 0);
    balance -= amount;
    rows.push({
      date: d.toISOString().slice(0, 10),
      amount_cents: amount,
      balance_cents: balance,
      label: `Installment ${i + 1}`,
    });
  }
  return rows;
}
export function monthlyObligation(rows: Installment[]): number {
  const months: Record<string, number> = {};
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    months[key] = (months[key] ?? 0) + row.amount_cents;
  }
  return Math.max(0, ...Object.values(months));
}
export function rankResources(
  resources: Resource[],
  a: Pick<
    Assessment,
    | 'state'
    | 'county'
    | 'county_confirmed'
    | 'needs'
    | 'income_cents'
    | 'court_case'
    | 'hearing'
    | 'safety'
    | 'language'
  >,
): Match[] {
  return resources
    .filter(
      (r) =>
        r.active &&
        (r.scope === 'national' ||
          (r.state === a.state &&
            (r.scope === 'state' ||
              (a.county_confirmed &&
                r.counties.some(
                  (c) =>
                    c.toLowerCase() ===
                    a.county
                      .trim()
                      .replace(/ county$/i, '')
                      .toLowerCase(),
                ))))),
    )
    .map((resource) => {
      let score = 30;
      const reasons = [
        resource.scope === 'national'
          ? 'National service directory; local availability must be confirmed.'
          : `Published service area includes ${resource.scope === 'county' ? a.county : a.state}.`,
      ];
      if (a.needs.includes(resource.category)) {
        score += 25;
        reasons.push(`Matches your interest in ${resource.category.toLowerCase()}.`);
      }
      if (resource.max_income_cents !== null && a.income_cents > 0) {
        if (a.income_cents <= resource.max_income_cents) {
          score += 20;
          reasons.push(
            'Your income estimate is within the published threshold; other conditions may apply.',
          );
        } else
          reasons.push(
            'Your estimate is above the listed income threshold; confirm current criteria with the organization.',
          );
      } else
        reasons.push(
          'Eligibility is not verified; contact the organization for individual guidance.',
        );
      if ((a.court_case || a.hearing || a.safety) && resource.urgent) {
        score += 15;
        reasons.push('Includes an urgent support or referral pathway.');
      }
      if (resource.languages.includes(a.language)) {
        score += 10;
        reasons.push(
          'Your selected language is listed; confirm local interpretation availability.',
        );
      }
      const fields = [
        Boolean(resource.phone),
        Boolean(resource.last_verified_at),
        resource.max_income_cents !== null,
        resource.appointment_required !== null,
        resource.languages.length > 0,
      ];
      return {
        resource,
        score,
        reasons,
        completeness: Math.round((fields.filter(Boolean).length / fields.length) * 100),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.completeness - a.completeness ||
        a.resource.organization.localeCompare(b.resource.organization) ||
        a.resource.id.localeCompare(b.resource.id),
    );
}
export function generateTasks(a: Assessment, userId: string): Task[] {
  const items: [string, string][] = [];
  if (a.court_case || a.hearing || a.safety)
    items.push([
      'Contact qualified legal assistance promptly',
      'Tell a legal aid professional about any court papers, lockout, or immediate concern. This app does not change deadlines.',
    ]);
  if (a.notice)
    items.push([
      'Review your notice with a qualified professional',
      'Keep the original and ask for an explanation of local options.',
    ]);
  items.push(
    [
      'Review your assistance matches',
      'Save a resource and confirm its current service area, eligibility, and availability.',
    ],
    [
      'Contact a housing organization',
      'Use the official contact details and record your own follow-up reminder.',
    ],
    [
      'Organize useful documents',
      'Privately save a lease, rent records, and relevant correspondence.',
    ],
  );
  if (a.needs.includes('Mediation'))
    items.push([
      'Explore voluntary discussion options',
      'Consider legal guidance before agreeing to repayment terms. Participation is optional.',
    ]);
  items.push([
    'Explore repayment scenarios',
    'Use your own budget estimates. A calculation is not a recommendation to agree.',
  ]);
  return items.map(([title, description], i) => ({
    id: `assessment-task-${i}`,
    user_id: userId,
    title,
    description,
    due_date: null,
    date_source: 'No date set',
    status: 'todo',
  }));
}
export function homeFor(role: Role) {
  return { tenant: '/dashboard', landlord: '/landlord', provider: '/provider', admin: '/admin' }[
    role
  ];
}
export function canVisit(role: Role, path: string): boolean {
  if (/^\/admin(?:\/|$)/.test(path)) return role === 'admin';
  if (/^\/provider(?:\/|$)/.test(path)) return role === 'provider';
  if (/^\/landlord(?:\/|$)/.test(path)) return role === 'landlord';
  if (/^\/(assessment|dashboard|benefits|navigator)(?:\/|$)/.test(path)) return role === 'tenant';
  return true;
}
export function isAllowedDocument(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'application/pdf') return new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
  if (mime === 'image/png')
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  return mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}

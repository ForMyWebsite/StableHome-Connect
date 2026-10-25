import { z } from 'zod';
import { CATEGORIES, STATES } from './states';
const cents = z.number().int().min(0).max(10000000000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date');
export const stateCode = z.enum(STATES.map((s) => s.code));
export const assessmentSchema = z
  .object({
    renting: z.boolean().default(true),
    behind_rent: z.boolean().default(false),
    future_income_change: z.string().max(300).default(''),
    state: stateCode,
    county: z.string().trim().min(1).max(100),
    zip: z.string().regex(/^\d{5}$/),
    county_confirmed: z.literal(true),
    stage: z.string().min(1).max(80),
    needs: z.array(z.enum(CATEGORIES)).max(7),
    rent_cents: cents,
    arrears_cents: cents,
    income_cents: cents,
    expenses_cents: cents,
    household_size: z.number().int().min(1).max(30),
    language: z.enum(['en', 'es', 'other']),
    court_case: z.boolean(),
    hearing: z.boolean(),
    safety: z.boolean(),
    notice: z.boolean(),
    utilities: z.boolean(),
    communication: z.enum(['email', 'phone', 'in-app']),
    accessibility: z.string().max(500),
  })
  .strict();
export const planSchema = z
  .object({
    total_cents: cents,
    initial_cents: cents,
    count: z.number().int().min(1).max(120),
    interval: z.enum(['monthly', 'weekly', 'biweekly']),
    start_date: date,
  })
  .strict()
  .refine((p) => p.initial_cents <= p.total_cents, 'Initial payment cannot exceed the total.');
const id = z.string().min(1).max(100);
const text = z.string().trim();
export const resourceSchema = z
  .object({
    id: text
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/),
    organization: text.min(3).max(160),
    description: text.min(10).max(2000),
    category: z.enum(CATEGORIES),
    scope: z.enum(['national', 'state', 'county']),
    state: stateCode.nullable(),
    counties: z.array(text.min(1).max(100)).max(100),
    website: z.url().startsWith('https://'),
    phone: text.max(40).nullable(),
    address: text.max(300).nullable(),
    application_method: text.min(3).max(1000),
    eligibility_notes: text.min(3).max(2000),
    max_income_cents: cents.nullable(),
    languages: z.array(text.max(20)).max(20),
    urgent: z.boolean(),
    appointment_required: z.boolean().nullable(),
    intake_status: text.min(3).max(300),
    last_verified_at: z.iso.datetime().nullable(),
    source_url: z.url().startsWith('https://'),
    review_status: text.min(3).max(200),
    active: z.boolean(),
  })
  .strict()
  .refine(
    (r) => r.scope === 'national' || r.state !== null,
    'State is required for local resources.',
  )
  .refine(
    (r) => r.scope !== 'county' || r.counties.length > 0,
    'County resources need a service county.',
  );
export const schemas = {
  save_assessment: assessmentSchema,
  toggle_task: z.object({ id, status: z.enum(['todo', 'done']) }),
  add_task: z.object({
    title: text.min(1).max(200),
    description: text.max(2000).default(''),
    due_date: date.nullable(),
  }),
  save_resource: z.object({ id, saved: z.boolean() }),
  create_case: z.object({
    title: text.min(3).max(120),
    issue_type: text.min(1).max(80),
    state: stateCode,
    county: text.min(1).max(100),
    description: text.min(10).max(2000),
    consent: z.literal(true),
  }),
  invite: z.object({ case_id: id, email: z.email().max(254), consent: z.literal(true) }),
  accept_invitation: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }),
  mark_case_read: z.object({ case_id: id }),
  send_message: z.object({ case_id: id, content: text.min(1).max(4000) }),
  propose: z.object({ case_id: id, terms: planSchema }),
  respond_proposal: z.object({
    id,
    response: z.enum(['discussion', 'rejected', 'changes_requested']),
  }),
  mediator_consent: z.object({ case_id: id, consent: z.boolean() }),
  leave_case: z.object({ case_id: id }),
  case_status: z.object({ case_id: id, status: z.enum(['Plan active', 'Resolved', 'Closed']) }),
  report: z.object({ case_id: id, reason: text.min(10).max(2000) }),
  add_date: z.object({
    title: text.min(1).max(120),
    scheduled_at: date,
    timezone: text.min(1).max(80),
  }),
  delete_date: z.object({ id }),
  add_support: z.object({
    support_type: z.enum(['Groceries', 'Housing expenses', 'Utilities', 'Transportation', 'Other']),
    description: text.max(1000),
    value_cents: cents.nullable(),
    recorded_date: date,
    notes: text.max(2000),
  }),
  delete_support: z.object({ id }),
  mark_notifications: z.object({ id: id.optional() }),
  save_settings: z.object({
    display_name: text.min(1).max(100),
    state: stateCode,
    county: text.max(100),
    zip: z.string().regex(/^\d{5}$/),
    language: z.enum(['en', 'es', 'other']),
    notification_preferences: z.boolean(),
  }),
  document_rename: z.object({ id, filename: text.min(1).max(200), category: text.min(1).max(80) }),
  share_document: z.object({ id, user_id: id, shared: z.boolean() }),
  resource_upsert: resourceSchema,
  jurisdiction_upsert: z.object({
    id: z.uuid().optional(),
    state: stateCode,
    county: text.min(1).max(100),
    notes: text.max(2000),
    source_url: z.url().startsWith('https://'),
    verified_at: z.iso.datetime().nullable(),
  }),
  verify_provider: z.object({ user_id: z.uuid(), confirmed: z.literal(true) }),
  request_provider: z.object({
    organization: text.min(3).max(200),
    credential_reference: text.min(5).max(1000),
  }),
  resolve_report: z.object({ id }),
} as const;
export type ActionName = keyof typeof schemas;
export function validateCommand(input: unknown) {
  const cmd = z
    .object({ action: z.string(), data: z.record(z.string(), z.unknown()) })
    .parse(input);
  if (!(cmd.action in schemas)) throw new Error('Choose a supported action.');
  const schema = schemas[cmd.action as ActionName];
  const parsed = schema.safeParse(cmd.data);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 250),
    );
  return { action: cmd.action as ActionName, data: parsed.data as Record<string, unknown> };
}

// Database ownership/timestamp columns never become editable form fields.
export function assessmentFromRecord(record: unknown) {
  return assessmentSchema.strip().parse(record);
}

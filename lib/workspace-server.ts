import 'server-only';
import { supabaseServer } from './supabase';
import { emptyWorkspace } from './demo';
import { assessmentFromRecord } from './validation';
import type { Profile, Workspace } from './types';
export async function loadWorkspace(userId: string): Promise<Workspace> {
  const sb = await supabaseServer();
  const { data: p, error: pe } = await sb.from('profiles').select('*').eq('id', userId).single();
  const profile = (p ?? {
    id: userId,
    display_name: 'Neighbor',
    role: 'tenant',
    state: 'PA',
    county: '',
    zip: '',
    language: 'en',
    notification_preferences: true,
  }) as Profile;
  const state = emptyWorkspace(profile);
  if (pe)
    return {
      ...state,
      setup_error:
        'Your account is authenticated, but the application database is not available. Apply migrations 001–003 in the Supabase SQL Editor before saving housing information.',
    };
  const tables = {
    assessment: 'tenant_assessments',
    tasks: 'action_items',
    resources: 'assistance_resources',
    saved_resources: 'saved_resources',
    cases: 'cases',
    participants: 'case_participants',
    messages: 'messages',
    proposals: 'proposals',
    invitations: 'invitations',
    documents: 'documents',
    permissions: 'document_permissions',
    dates: 'appointments',
    support_logs: 'benefit_support_logs',
    notifications: 'notifications',
    activity: 'user_activity',
    reports: 'moderation_reports',
    jurisdictions: 'jurisdictions',
    case_events: 'case_events',
    provider_requests: 'provider_requests',
    message_reads: 'message_reads',
  };
  const entries = await Promise.all(
    Object.entries(tables).map(async ([key, table]) => {
      const selection =
        table === 'invitations' ? 'id,case_id,invitee_email,expires_at,accepted_at' : '*';
      // ponytail: prototype screens load at most 1,000 rows per collection; add cursor pagination before larger deployments.
      const query = sb.from(table).select(selection).limit(1000);
      const { data, error } = await query;
      return { key, data: (data ?? []) as unknown[], error: Boolean(error) };
    }),
  );
  const map = Object.fromEntries(entries.map((e) => [e.key, e.data]));
  for (const key of [
    'tasks',
    'resources',
    'cases',
    'participants',
    'messages',
    'proposals',
    'invitations',
    'dates',
    'support_logs',
    'notifications',
    'activity',
    'reports',
    'jurisdictions',
    'case_events',
    'provider_requests',
    'message_reads',
  ] as const)
    Object.assign(state, { [key]: map[key] });
  state.assessment = map.assessment[0] ? assessmentFromRecord(map.assessment[0]) : null;
  state.saved_resources = map.saved_resources.map(
    (r: unknown) => (r as { resource_id: string }).resource_id,
  );
  state.documents = map.documents.map((r: unknown) => ({
    ...(r as Workspace['documents'][number]),
    shared_with: map.permissions
      .filter(
        (p: unknown) => (p as { document_id: string }).document_id === (r as { id: string }).id,
      )
      .map((p: unknown) => (p as { authorized_user_id: string }).authorized_user_id),
  }));
  state.notifications.sort((a, b) => b.created_at.localeCompare(a.created_at));
  state.activity.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (profile.role === 'admin') {
    const { data } = await sb.from('profiles').select('*').eq('role', 'provider');
    state.providers = (data ?? []) as Profile[];
    const metrics = await sb.rpc('aggregate_metrics');
    Object.assign(state, { metrics: metrics.data });
  }
  if (entries.some((e) => e.error))
    state.setup_error =
      'Some records could not be loaded. Check the Supabase migrations and network connection. Saving is paused to protect your data.';
  return state;
}

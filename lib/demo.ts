import resources from './resources.json';
import { generateTasks, today } from './algorithms';
import { validateCommand } from './validation';
import type { Assessment, Command, Profile, Proposal, Resource, Role, Workspace } from './types';
export const DEMO_IDS = {
  tenant: '00000000-0000-4000-8000-000000000001',
  landlord: '00000000-0000-4000-8000-000000000002',
  provider: '00000000-0000-4000-8000-000000000003',
  admin: '00000000-0000-4000-8000-000000000004',
};
export const DEMO_NAMES = {
  tenant: 'Jordan Rivera',
  landlord: 'Taylor Morgan',
  provider: 'Casey Brooks',
  admin: 'Demo Administrator',
};
const CASE = '00000000-0000-4000-8000-000000000010';
export function demoProfile(role: Role): Profile {
  return {
    id: DEMO_IDS[role],
    display_name: DEMO_NAMES[role],
    role,
    state: 'PA',
    county: 'Delaware',
    zip: '19013',
    language: 'en',
    notification_preferences: true,
  };
}
export function demoWorkspace(role: Role): Workspace {
  const now = new Date().toISOString();
  const later = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const assessment: Assessment = {
    state: 'PA',
    county: 'Delaware',
    zip: '19013',
    county_confirmed: true,
    stage: 'Early housing concern',
    needs: ['Rental assistance', 'Legal aid', 'Mediation'],
    rent_cents: 150000,
    arrears_cents: 120000,
    income_cents: 280000,
    expenses_cents: 75000,
    household_size: 2,
    language: 'en',
    court_case: false,
    hearing: false,
    safety: false,
    notice: false,
    utilities: false,
    communication: 'in-app',
    accessibility: '',
  };
  return {
    profile: demoProfile(role),
    assessment,
    tasks: generateTasks(assessment, DEMO_IDS.tenant).map((t, i) => ({
      ...t,
      status: i < 2 ? 'done' : 'todo',
    })),
    resources: resources as Resource[],
    saved_resources: ['lasp-delaware'],
    cases: [
      {
        id: CASE,
        creator_id: DEMO_IDS.tenant,
        title: 'Working toward a rent repayment plan',
        issue_type: 'Rent payment',
        state: 'PA',
        county: 'Delaware',
        description:
          'Fictional scenario: Jordan and Taylor are exploring a voluntary plan for $1,200 in unpaid rent. No court case has been filed.',
        status: 'Negotiation in progress',
        created_at: now,
      },
    ],
    participants: [
      {
        case_id: CASE,
        user_id: DEMO_IDS.tenant,
        display_name: 'Jordan Rivera',
        participant_role: 'tenant',
        consent_mediator: false,
        accepted_at: now,
        blocked: false,
      },
      {
        case_id: CASE,
        user_id: DEMO_IDS.landlord,
        display_name: 'Taylor Morgan',
        participant_role: 'landlord',
        consent_mediator: false,
        accepted_at: now,
        blocked: false,
      },
    ],
    messages: [
      {
        id: 'demo-message-1',
        case_id: CASE,
        sender_id: DEMO_IDS.tenant,
        content:
          'Hi Taylor. I would like to talk about a manageable repayment schedule. Could we review the options together?',
        created_at: now,
      },
      {
        id: 'demo-message-2',
        case_id: CASE,
        sender_id: DEMO_IDS.landlord,
        content:
          'Thanks for reaching out, Jordan. I’m open to discussing a schedule. We can also ask a mediator to help if we both agree.',
        created_at: now,
      },
    ],
    proposals: [
      {
        id: 'demo-proposal-1',
        case_id: CASE,
        created_by: DEMO_IDS.tenant,
        version: 1,
        terms: {
          total_cents: 120000,
          initial_cents: 20000,
          count: 5,
          interval: 'monthly',
          start_date: later,
        },
        status: 'proposed',
        responses: {},
        created_at: now,
      },
    ],
    invitations: [],
    documents: [
      {
        id: 'demo-document-1',
        owner_id: DEMO_IDS.tenant,
        filename: 'Sample rental agreement.pdf',
        category: 'Lease',
        storage_path: 'demo/sample',
        size_bytes: 1024,
        mime_type: 'application/pdf',
        shared_with: [],
        uploaded_at: now,
        demo: true,
      },
    ],
    dates: [
      {
        id: 'demo-date-1',
        user_id: DEMO_IDS.tenant,
        case_id: null,
        title: 'Call a housing counselor',
        scheduled_at: later,
        timezone: 'America/New_York',
        confirmation_status: 'User-entered',
      },
    ],
    support_logs: [
      {
        id: 'demo-support-1',
        user_id: DEMO_IDS.tenant,
        support_type: 'Groceries',
        description: 'Fictional grocery help from a family member',
        value_cents: 4500,
        recorded_date: today(),
        notes: 'Synthetic example only; no eligibility determination.',
      },
    ],
    notifications: [
      {
        id: 'demo-notification-1',
        user_id: DEMO_IDS.tenant,
        title: 'Your next step is ready',
        description:
          'Review your potential matches and confirm current availability with an organization.',
        destination: '/resources',
        created_at: now,
        read_at: null,
      },
    ],
    activity: [
      {
        id: 'demo-activity-1',
        user_id: DEMO_IDS.tenant,
        description: 'Saved Legal Aid of Southeastern PA',
        created_at: now,
      },
      {
        id: 'demo-activity-2',
        user_id: DEMO_IDS.tenant,
        description: 'Completed the housing assessment',
        created_at: now,
      },
    ],
    reports: [],
    providers: [demoProfile('provider')],
    jurisdictions: [
      {
        id: '00000000-0000-4000-8000-000000000020',
        state: 'PA',
        county: 'Delaware',
        notes: 'Confirm county manually. No verified ZIP mapping is seeded.',
        source_url: 'https://www.lasp.org/',
        verified_at: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000021',
        state: 'PA',
        county: 'Philadelphia',
        notes:
          'Official diversion information is available externally; check current program rules.',
        source_url: 'https://eviction-diversion.phila.gov/',
        verified_at: null,
      },
    ],
  };
}
export function emptyWorkspace(profile: Profile): Workspace {
  return {
    ...demoWorkspace('tenant'),
    profile,
    assessment: null,
    tasks: [],
    resources: [],
    saved_resources: [],
    cases: [],
    participants: [],
    messages: [],
    proposals: [],
    invitations: [],
    documents: [],
    dates: [],
    support_logs: [],
    notifications: [],
    activity: [],
    reports: [],
    providers: [],
    jurisdictions: [],
  };
}
export function demoCommand(
  previous: Workspace,
  input: Command,
): { state: Workspace; id?: string; token?: string } {
  const { action, data: d } = validateCommand(input);
  const s = structuredClone(previous);
  const uid = s.profile.id;
  const role = s.profile.role;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  let token: string | undefined;
  const member = (caseId: unknown) => {
    const m = s.participants.find(
      (p) => p.case_id === caseId && p.user_id === uid && p.accepted_at && !p.blocked,
    );
    if (!m) throw new Error('Not authorized for this discussion.');
    return m;
  };
  const tenant = () => {
    if (role !== 'tenant') throw new Error('Only tenants can edit their private housing plan.');
  };
  const admin = () => {
    if (role !== 'admin') throw new Error('Not authorized.');
  };
  const notify = (caseId: unknown, title: string) =>
    s.participants
      .filter((p) => p.case_id === caseId && p.user_id !== uid && !p.blocked && p.accepted_at)
      .forEach((p) =>
        s.notifications.unshift({
          id: crypto.randomUUID(),
          user_id: p.user_id,
          title,
          description: 'A participant updated your fictional discussion.',
          destination: '/mediation/' + caseId,
          created_at: now,
          read_at: null,
        }),
      );
  switch (action) {
    case 'save_assessment':
      tenant();
      s.assessment = d as Assessment;
      s.profile = {
        ...s.profile,
        state: d.state as string,
        county: d.county as string,
        zip: d.zip as string,
      };
      s.tasks = s.tasks
        .filter((t) => t.user_id !== uid)
        .concat(generateTasks(d as Assessment, uid));
      break;
    case 'toggle_task': {
      const task = s.tasks.find((t) => t.id === d.id && t.user_id === uid);
      if (!task) throw new Error('Task not found.');
      task.status = d.status as 'done' | 'todo';
      break;
    }
    case 'add_task':
      s.tasks.push({
        id,
        user_id: uid,
        title: d.title as string,
        description: d.description as string,
        due_date: d.due_date as string | null,
        date_source: 'User-entered',
        status: 'todo',
      });
      break;
    case 'save_resource':
      s.saved_resources = d.saved
        ? [...new Set([...s.saved_resources, d.id as string])]
        : s.saved_resources.filter((r) => r !== d.id);
      break;
    case 'create_case':
      if (!['tenant', 'landlord'].includes(role))
        throw new Error('Only tenants and landlords can create a discussion.');
      s.cases.push({
        id,
        creator_id: uid,
        title: d.title as string,
        issue_type: d.issue_type as string,
        state: d.state as string,
        county: d.county as string,
        description: d.description as string,
        status: 'Discussion open',
        created_at: now,
      });
      s.participants.push({
        case_id: id,
        user_id: uid,
        display_name: s.profile.display_name,
        participant_role: role,
        consent_mediator: false,
        accepted_at: now,
        blocked: false,
      });
      break;
    case 'invite':
      member(d.case_id);
      if (!['tenant', 'landlord'].includes(role)) throw new Error('Not authorized.');
      token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
      s.invitations.push({
        id,
        case_id: d.case_id as string,
        invitee_email: d.email as string,
        expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
        accepted_at: null,
        demo_token: token,
      });
      break;
    case 'accept_invitation': {
      const inv = s.invitations.find((i) => i.demo_token === d.token);
      if (!inv || inv.accepted_at || new Date(inv.expires_at).getTime() < Date.now())
        throw new Error('Invitation is invalid or expired.');
      const expected = {
        tenant: 'jordan@example.test',
        landlord: 'taylor@example.test',
        provider: 'casey@example.test',
        admin: '',
      }[role];
      if (inv.invitee_email.toLowerCase() !== expected)
        throw new Error('Sign in with the invited fictional account.');
      if (
        role === 'provider' &&
        s.participants.filter((p) => p.case_id === inv.case_id && p.consent_mediator && !p.blocked)
          .length < 2
      )
        throw new Error('Both parties must consent first.');
      if (!s.participants.some((p) => p.case_id === inv.case_id && p.user_id === uid))
        s.participants.push({
          case_id: inv.case_id,
          user_id: uid,
          display_name: s.profile.display_name,
          participant_role: role,
          accepted_at: now,
          blocked: false,
          consent_mediator: false,
        });
      inv.accepted_at = now;
      return { state: s, id: inv.case_id };
    }
    case 'mark_case_read':
      member(d.case_id);
      s.message_reads ??= [];
      s.messages
        .filter((m) => m.case_id === d.case_id && m.sender_id !== uid)
        .forEach((m) => {
          if (!s.message_reads!.some((r) => r.message_id === m.id && r.user_id === uid))
            s.message_reads!.push({ message_id: m.id, user_id: uid, read_at: now });
        });
      break;
    case 'send_message':
      member(d.case_id);
      if (['Closed', 'Resolved'].includes(s.cases.find((c) => c.id === d.case_id)?.status ?? ''))
        throw new Error('Discussion is closed.');
      s.messages.push({
        id,
        case_id: d.case_id as string,
        sender_id: uid,
        content: d.content as string,
        created_at: now,
      });
      notify(d.case_id, 'New discussion message');
      break;
    case 'propose': {
      member(d.case_id);
      if (!['tenant', 'landlord'].includes(role)) throw new Error('Not authorized.');
      const version =
        Math.max(0, ...s.proposals.filter((p) => p.case_id === d.case_id).map((p) => p.version)) +
        1;
      s.proposals.push({
        id,
        case_id: d.case_id as string,
        created_by: uid,
        version,
        terms: d.terms as Proposal['terms'],
        status: 'proposed',
        responses: {},
        created_at: now,
      });
      notify(d.case_id, 'New proposal version');
      break;
    }
    case 'respond_proposal': {
      const p = s.proposals.find((p) => p.id === d.id);
      if (!p) throw new Error('Proposal not found.');
      member(p.case_id);
      if (p.created_by === uid || !['tenant', 'landlord'].includes(role))
        throw new Error('Not authorized to review your own proposal.');
      if (
        p.version !==
        Math.max(...s.proposals.filter((x) => x.case_id === p.case_id).map((x) => x.version))
      )
        throw new Error('Review the latest proposal.');
      p.status = d.response as Proposal['status'];
      p.responses[uid] = d.response as string;
      notify(p.case_id, 'Proposal reviewed');
      break;
    }
    case 'mediator_consent': {
      const p = member(d.case_id);
      if (!['tenant', 'landlord'].includes(role)) throw new Error('Not authorized.');
      p.consent_mediator = d.consent as boolean;
      const both =
        new Set(
          s.participants
            .filter(
              (p) =>
                p.case_id === d.case_id &&
                ['tenant', 'landlord'].includes(p.participant_role) &&
                p.consent_mediator &&
                !p.blocked,
            )
            .map((p) => p.participant_role),
        ).size >= 2;
      let provider = s.participants.find(
        (p) => p.case_id === d.case_id && p.user_id === DEMO_IDS.provider,
      );
      if (both && !provider) {
        provider = {
          case_id: d.case_id as string,
          user_id: DEMO_IDS.provider,
          display_name: DEMO_NAMES.provider,
          participant_role: 'provider',
          accepted_at: now,
          blocked: false,
          consent_mediator: false,
        };
        s.participants.push(provider);
      } else if (provider) provider.blocked = !both;
      break;
    }
    case 'leave_case': {
      member(d.case_id).blocked = true;
      s.participants
        .filter((p) => p.case_id === d.case_id && p.participant_role === 'provider')
        .forEach((p) => (p.blocked = true));
      break;
    }
    case 'case_status': {
      member(d.case_id);
      if (!['tenant', 'landlord'].includes(role)) throw new Error('Not authorized.');
      const c = s.cases.find((c) => c.id === d.case_id)!;
      const latest = s.proposals
        .filter((p) => p.case_id === d.case_id)
        .sort((a, b) => b.version - a.version)[0];
      if (d.status === 'Plan active' && latest?.status !== 'discussion')
        throw new Error('Another participant must review the latest proposal first.');
      c.status = d.status as string;
      break;
    }
    case 'report':
      member(d.case_id);
      s.reports.push({
        id,
        case_id: d.case_id as string,
        reporter_id: uid,
        reason: d.reason as string,
        created_at: now,
        status: 'Open',
      });
      break;
    case 'add_date':
      s.dates.push({
        id,
        user_id: uid,
        case_id: null,
        title: d.title as string,
        scheduled_at: d.scheduled_at as string,
        timezone: d.timezone as string,
        confirmation_status: 'User-entered',
      });
      break;
    case 'delete_date':
      s.dates = s.dates.filter((x) => !(x.id === d.id && x.user_id === uid));
      break;
    case 'add_support':
      tenant();
      s.support_logs.push({ id, user_id: uid, ...d } as Workspace['support_logs'][number]);
      break;
    case 'delete_support':
      tenant();
      s.support_logs = s.support_logs.filter((x) => !(x.id === d.id && x.user_id === uid));
      break;
    case 'mark_notifications':
      s.notifications
        .filter((n) => n.user_id === uid && (!d.id || n.id === d.id))
        .forEach((n) => (n.read_at = now));
      break;
    case 'save_settings':
      s.profile = { ...s.profile, ...d } as Profile;
      break;
    case 'document_rename': {
      const doc = s.documents.find((x) => x.id === d.id && x.owner_id === uid);
      if (!doc) throw new Error('Not authorized.');
      doc.filename = d.filename as string;
      doc.category = d.category as string;
      break;
    }
    case 'share_document': {
      const doc = s.documents.find((x) => x.id === d.id && x.owner_id === uid);
      if (!doc) throw new Error('Not authorized.');
      const mine = s.participants
        .filter((p) => p.user_id === uid && !p.blocked)
        .map((p) => p.case_id);
      if (
        !s.participants.some(
          (p) => p.user_id === d.user_id && !p.blocked && mine.includes(p.case_id),
        )
      )
        throw new Error('Only accepted participants may receive a document.');
      doc.shared_with = d.shared
        ? [...new Set([...doc.shared_with, d.user_id as string])]
        : doc.shared_with.filter((x) => x !== d.user_id);
      break;
    }
    case 'resource_upsert':
      admin();
      s.resources = s.resources.filter((r) => r.id !== d.id).concat(d as Resource);
      break;
    case 'jurisdiction_upsert':
      admin();
      s.jurisdictions = s.jurisdictions
        .filter((j) => j.id !== d.id)
        .concat({ ...d, id: (d.id as string) || id } as Workspace['jurisdictions'][number]);
      break;
    case 'verify_provider': {
      admin();
      const r = s.provider_requests?.find((r) => r.user_id === d.user_id && r.status === 'Pending');
      if (!r) throw new Error('No pending verification request.');
      r.status = 'Approved';
      s.providers = s.providers
        .filter((p) => p.id !== d.user_id)
        .concat({
          ...demoProfile('provider'),
          id: d.user_id as string,
          display_name:
            Object.entries(DEMO_IDS).find(([, v]) => v === d.user_id)?.[0] === 'tenant'
              ? DEMO_NAMES.tenant
              : 'Fictional verified provider',
        });
      break;
    }
    case 'request_provider':
      s.provider_requests = [
        ...(s.provider_requests ?? []).filter((r) => r.user_id !== uid),
        {
          user_id: uid,
          organization: d.organization as string,
          credential_reference: d.credential_reference as string,
          status: 'Pending',
        },
      ];
      break;
    case 'resolve_report':
      admin();
      s.reports.filter((r) => r.id === d.id).forEach((r) => (r.status = 'Reviewed'));
      break;
  }
  s.activity.unshift({
    id: crypto.randomUUID(),
    user_id: uid,
    description:
      (
        {
          save_assessment: 'Housing assessment updated',
          save_resource: 'Resource collection updated',
          send_message: 'Discussion message sent',
          propose: 'New proposal version saved',
          toggle_task: 'Action plan updated',
        } as Record<string, string>
      )[action] ?? action.replaceAll('_', ' '),
    created_at: now,
  });
  return { state: s, id, token };
}

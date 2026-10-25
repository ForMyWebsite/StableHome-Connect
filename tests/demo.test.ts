import { describe, it, expect } from 'vitest';
import { demoWorkspace, demoCommand, DEMO_IDS } from '../lib/demo';
describe('fictional multi-party workflow', () => {
  it('persists messages and immutable proposal versions across actor switches', () => {
    let s = demoWorkspace('tenant');
    const case_id = s.cases[0].id;
    s = demoCommand(s, {
      action: 'send_message',
      data: { case_id, content: 'I can discuss a payment plan.' },
    }).state;
    expect(s.messages.at(-1)?.content).toContain('payment plan');
    const terms = {
      total_cents: 120000,
      initial_cents: 20000,
      count: 5,
      interval: 'monthly',
      start_date: '2026-11-01',
    };
    s = demoCommand(s, { action: 'propose', data: { case_id, terms } }).state;
    const first = structuredClone(s.proposals.at(-1)!);
    s.profile = demoWorkspace('landlord').profile;
    s = demoCommand(s, {
      action: 'respond_proposal',
      data: { id: first.id, response: 'discussion' },
    }).state;
    s = demoCommand(s, {
      action: 'propose',
      data: { case_id, terms: { ...terms, count: 6 } },
    }).state;
    expect(s.proposals.at(-1)?.version).toBe(first.version + 1);
    expect(s.proposals.find((p) => p.id === first.id)?.terms).toEqual(terms);
  });
  it('rejects unauthorized messages and self-review', () => {
    const s = demoWorkspace('admin');
    expect(() =>
      demoCommand(s, { action: 'send_message', data: { case_id: s.cases[0].id, content: 'no' } }),
    ).toThrow();
    const t = demoWorkspace('tenant');
    expect(() =>
      demoCommand(t, {
        action: 'respond_proposal',
        data: { id: t.proposals[0].id, response: 'discussion' },
      }),
    ).toThrow();
  });
  it('requires both parties to permit mediator access', () => {
    let s = demoWorkspace('tenant');
    const case_id = s.cases[0].id;
    s = demoCommand(s, { action: 'mediator_consent', data: { case_id, consent: true } }).state;
    expect(s.participants.some((p) => p.user_id === DEMO_IDS.provider && p.accepted_at)).toBe(
      false,
    );
    s.profile = demoWorkspace('landlord').profile;
    s = demoCommand(s, { action: 'mediator_consent', data: { case_id, consent: true } }).state;
    expect(s.participants.some((p) => p.user_id === DEMO_IDS.provider && p.accepted_at)).toBe(true);
  });
  it('prevents landlords from changing a private tenant assessment', () => {
    const s = demoWorkspace('landlord');
    expect(() => demoCommand(s, { action: 'save_assessment', data: s.assessment! })).toThrow();
  });
  it('creates and accepts a fictional expiring invitation as the other actor', () => {
    let s = demoWorkspace('tenant');
    const r = demoCommand(s, {
      action: 'create_case',
      data: {
        title: 'A voluntary discussion',
        issue_type: 'Rent payment',
        state: 'PA',
        county: 'Delaware',
        description: 'I would like to discuss a private plan.',
        consent: true,
      },
    });
    s = r.state;
    const invite = demoCommand(s, {
      action: 'invite',
      data: { case_id: r.id, email: 'taylor@example.test', consent: true },
    });
    s = invite.state;
    s.profile = demoWorkspace('landlord').profile;
    s = demoCommand(s, { action: 'accept_invitation', data: { token: invite.token } }).state;
    expect(
      s.participants.some(
        (p) => p.case_id === r.id && p.user_id === DEMO_IDS.landlord && p.accepted_at,
      ),
    ).toBe(true);
  });
});

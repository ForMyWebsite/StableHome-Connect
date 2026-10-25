import { it, expect } from 'vitest';
import { assessmentFromRecord, assessmentSchema } from '../lib/validation';
import { demoWorkspace } from '../lib/demo';
it('removes database-owned columns so a saved assessment can be edited and resubmitted', () => {
  const original = demoWorkspace('tenant').assessment!;
  const loaded = assessmentFromRecord({
    ...original,
    id: 'server-id',
    tenant_id: 'owner-id',
    updated_at: '2026-10-25T12:00:00Z',
  });
  expect(loaded).not.toHaveProperty('tenant_id');
  expect(loaded).not.toHaveProperty('id');
  expect(assessmentSchema.safeParse(loaded).success).toBe(true);
});
it('rejects attempts to submit database-owned fields through an assessment command', () => {
  expect(
    assessmentSchema.safeParse({ ...demoWorkspace('tenant').assessment!, tenant_id: 'other-user' })
      .success,
  ).toBe(false);
});

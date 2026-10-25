import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
const ids = {
  tenant: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  landlord: '10000000-0000-4000-8000-000000000003',
  provider: '10000000-0000-4000-8000-000000000004',
  admin: '10000000-0000-4000-8000-000000000005',
};
let db: PGlite, caseId: string, proposalId: string;
async function actor(name: keyof typeof ids) {
  await db.exec('reset role');
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [ids[name], JSON.stringify({ sub: ids[name], email: name + '@example.test' })],
  );
  await db.exec('set role authenticated');
}
async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  return (await db.query<T>(text, params)).rows;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;grant usage on schema public,auth to anon,authenticated;`,
  );
  await db.exec(readFileSync('supabase/migrations/001_core.sql', 'utf8'));
  await db.exec(
    `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`,
  );
  await db.exec(readFileSync('supabase/migrations/002_private_storage.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/003_resources.sql', 'utf8'));
  for (const [role, id] of Object.entries(ids))
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)', [
      id,
      role + '@example.test',
      JSON.stringify({ display_name: role, role: role === 'other' ? 'admin' : role }),
    ]);
  await db.query("update public.profiles set role='provider' where id=$1", [ids.provider]);
  await db.query("update public.profiles set role='admin' where id=$1", [ids.admin]);
});
afterAll(async () => {
  await db?.close();
});
describe('database authorization and private storage', () => {
  it('never trusts admin/provider signup metadata', async () => {
    await actor('other');
    const rows = await sql<{ role: string }>('select role from public.profiles where id=$1', [
      ids.other,
    ]);
    expect(rows[0].role).toBe('tenant');
    await expect(
      sql("update public.profiles set role='admin' where id=$1", [ids.other]),
    ).rejects.toThrow();
  });
  it('saves an assessment and generated tasks atomically under its owner', async () => {
    await actor('tenant');
    await sql('select public.save_housing_assessment($1,$2)', [
      {
        state: 'PA',
        county: 'Delaware',
        zip: '19013',
        county_confirmed: true,
        stage: 'Early concern',
        needs: ['Rental assistance'],
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
      },
      [{ title: 'Contact a housing organization', description: 'Confirm local options' }],
    ]);
    expect(await sql('select * from public.tenant_assessments')).toHaveLength(1);
    expect(await sql('select * from public.action_items')).toHaveLength(1);
  });
  it('keeps tenant assessments and tasks private from another tenant, landlord, provider, and administrator', async () => {
    for (const a of ['other', 'landlord', 'provider', 'admin'] as const) {
      await actor(a);
      expect(await sql('select * from public.tenant_assessments')).toHaveLength(0);
      expect(await sql('select * from public.action_items')).toHaveLength(0);
    }
  });
  it('keeps document metadata and storage objects private even from administrators', async () => {
    await actor('tenant');
    const path = ids.tenant + '/test.pdf';
    await sql("insert into storage.objects(bucket_id,name) values('housing-documents',$1)", [path]);
    await sql(
      "insert into public.documents(id,owner_id,filename,category,storage_path,size_bytes,mime_type) values('10000000-0000-4000-8000-000000000020',$1,'test.pdf','Lease',$2,100,'application/pdf')",
      [ids.tenant, path],
    );
    for (const a of ['other', 'landlord', 'provider', 'admin'] as const) {
      await actor(a);
      expect(await sql('select * from public.documents')).toHaveLength(0);
      expect(await sql('select * from storage.objects')).toHaveLength(0);
    }
  });
  it('prevents direct participant injection and unauthorized message reads', async () => {
    await actor('tenant');
    const r = await sql<{ id: string }>(
      "select public.create_discussion('A voluntary discussion','Rent payment','PA','Delaware','A fictional request to discuss unpaid rent.') as id",
    );
    caseId = r[0].id;
    await sql('select public.post_message($1,$2)', [caseId, 'Hello, can we discuss a plan?']);
    await actor('other');
    expect(await sql('select * from public.messages')).toHaveLength(0);
    await expect(
      sql(
        'insert into public.case_participants(case_id,user_id,display_name,participant_role,accepted_at) values($1,$2,$3,$4,now())',
        [caseId, ids.other, 'Intruder', 'tenant'],
      ),
    ).rejects.toThrow();
    await expect(
      sql('select public.post_message($1,$2)', [caseId, 'Unauthorized']),
    ).rejects.toThrow();
  });
  it('rejects expired and wrong-email invitations', async () => {
    await actor('tenant');
    const hash = 'a'.repeat(64);
    await sql('select public.invite_participant($1,$2,$3)', [
      caseId,
      'landlord@example.test',
      hash,
    ]);
    await actor('other');
    await expect(sql('select public.accept_invitation($1)', [hash])).rejects.toThrow(/email/);
    await db.exec('reset role');
    await sql(
      "update public.invitations set expires_at=now()-interval '1 minute' where invitation_token_hash=$1",
      [hash],
    );
    await actor('landlord');
    await expect(sql('select public.accept_invitation($1)', [hash])).rejects.toThrow(/expired/);
  });
  it('accepts an invitation once and allows messages only for the accepted participant', async () => {
    await actor('tenant');
    const hash = 'b'.repeat(64);
    await sql('select public.invite_participant($1,$2,$3)', [
      caseId,
      'landlord@example.test',
      hash,
    ]);
    await actor('landlord');
    await sql('select public.accept_invitation($1)', [hash]);
    await expect(sql('select public.accept_invitation($1)', [hash])).rejects.toThrow(/used/);
    expect(await sql('select * from public.messages')).toHaveLength(1);
    await sql('select public.post_message($1,$2)', [caseId, 'Yes, let us explore options.']);
    expect(await sql('select * from public.messages')).toHaveLength(2);
  });
  it('shares only a selected document, then revokes metadata and file access', async () => {
    await actor('tenant');
    await sql(
      "insert into public.document_permissions(document_id,authorized_user_id) values('10000000-0000-4000-8000-000000000020',$1)",
      [ids.landlord],
    );
    await actor('landlord');
    expect(await sql('select * from public.documents')).toHaveLength(1);
    expect(await sql('select * from storage.objects')).toHaveLength(1);
    expect(await sql('select * from public.tenant_assessments')).toHaveLength(0);
    await actor('tenant');
    await sql('delete from public.document_permissions where authorized_user_id=$1', [
      ids.landlord,
    ]);
    await actor('landlord');
    expect(await sql('select * from public.documents')).toHaveLength(0);
    expect(await sql('select * from storage.objects')).toHaveLength(0);
  });
  it('requires both tenant and landlord consent for a verified provider', async () => {
    await actor('tenant');
    const hash = 'c'.repeat(64);
    await sql('select public.invite_participant($1,$2,$3)', [
      caseId,
      'provider@example.test',
      hash,
    ]);
    await sql('select public.set_mediator_consent($1,true)', [caseId]);
    await actor('provider');
    await expect(sql('select public.accept_invitation($1)', [hash])).rejects.toThrow(/Both/);
    await actor('landlord');
    await sql('select public.set_mediator_consent($1,true)', [caseId]);
    await actor('provider');
    await sql('select public.accept_invitation($1)', [hash]);
    expect(await sql('select * from public.messages')).toHaveLength(2);
    await actor('tenant');
    await sql('select public.set_mediator_consent($1,false)', [caseId]);
    await actor('provider');
    expect(await sql('select * from public.messages')).toHaveLength(0);
  });
  it('preserves proposal terms, rejects self-review, and serializes revisions', async () => {
    await actor('tenant');
    const terms = {
      total_cents: 120000,
      initial_cents: 20000,
      count: 5,
      interval: 'monthly',
      start_date: '2026-11-01',
    };
    proposalId = (
      await sql<{ id: string }>('select public.create_proposal($1,$2) as id', [caseId, terms])
    )[0].id;
    await expect(
      sql('select public.respond_proposal($1,$2)', [proposalId, 'discussion']),
    ).rejects.toThrow();
    await expect(
      sql('update public.proposals set terms=$1 where id=$2', [{ ...terms, count: 1 }, proposalId]),
    ).rejects.toThrow();
    await actor('landlord');
    await sql('select public.respond_proposal($1,$2)', [proposalId, 'discussion']);
    await sql('select public.create_proposal($1,$2)', [caseId, { ...terms, count: 6 }]);
    const rows = await sql<{ version: number; terms: typeof terms }>(
      'select version,terms from public.proposals order by version',
    );
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
    expect(rows[0].terms).toEqual(terms);
  });
  it('rejects incomplete and invalid proposal terms at the database boundary', async () => {
    await actor('tenant');
    for (const terms of [
      {},
      { count: 5, interval: 'monthly', start_date: '2026-11-01' },
      { total_cents: 1000, count: 5 },
      {
        total_cents: 1000,
        initial_cents: 1001,
        count: 5,
        interval: 'monthly',
        start_date: '2026-11-01',
      },
    ])
      await expect(sql('select public.create_proposal($1,$2)', [caseId, terms])).rejects.toThrow();
  });
  it('keeps a departing participant’s own messages exportable without exposing other participants’ messages', async () => {
    await actor('landlord');
    await sql('select public.leave_discussion($1)', [caseId]);
    const own = await sql<{ sender_id: string }>('select sender_id from public.messages');
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((m) => m.sender_id === ids.landlord)).toBe(true);
    await expect(
      sql('select public.post_message($1,$2)', [caseId, 'Cannot continue after leaving']),
    ).rejects.toThrow();
  });
  it('suppresses small aggregates and requires the admin role', async () => {
    await actor('tenant');
    await expect(sql('select public.aggregate_metrics()')).rejects.toThrow();
    await actor('admin');
    const r = await sql<{ value: Record<string, unknown> }>(
      'select public.aggregate_metrics() as value',
    );
    expect(r[0].value).toEqual({ assessments: null, discussions: null, proposals: null });
  });
  it('denies all unauthenticated private data and internal privileged helper calls', async () => {
    await db.exec('reset role;set role anon');
    await expect(sql('select * from public.messages')).rejects.toThrow();
    await expect(
      sql('select public.notify_case($1,$2,$3)', [caseId, 'Fake', 'Fake notification']),
    ).rejects.toThrow();
  });
});

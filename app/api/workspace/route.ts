import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { isConfigured, supabaseServer } from '@/lib/supabase';
import { loadWorkspace } from '@/lib/workspace-server';
import { assertSameOrigin, rateLimit, readJson, safeError, siteOrigin } from '@/lib/security';
import { validateCommand } from '@/lib/validation';
import { generateTasks, rankResources } from '@/lib/algorithms';
import type { Assessment, Resource } from '@/lib/types';
export async function GET(request: NextRequest) {
  if (request.cookies.has('sh-demo'))
    return NextResponse.json(
      { error: 'The fictional demo cannot access live account data.' },
      { status: 403 },
    );
  if (!isConfigured())
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  return NextResponse.json(await loadWorkspace(user.id), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (request.cookies.has('sh-demo'))
      return NextResponse.json(
        { error: 'The fictional demo cannot access live account data.' },
        { status: 403 },
      );
    if (!isConfigured())
      return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    rateLimit('workspace:' + user.id, 60);
    const { action, data: d } = validateCommand(await readJson(request));
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();
    if (!profile) throw new Error('Database is not configured. Apply the migrations.');
    const uid = user.id;
    let id: string | undefined;
    let invite_link: string | undefined;
    const check = async (query: PromiseLike<{ data: unknown; error: unknown }>) => {
      const r = await query;
      if (r.error)
        throw new Error('Your change could not be saved. Check access permissions and try again.');
      return r.data;
    };
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const { data, error } = await sb.rpc(name, args);
      if (error) throw new Error(error.message);
      return data;
    };
    const mustAdmin = () => {
      if (profile.role !== 'admin') throw new Error('Not authorized.');
    };
    switch (action) {
      case 'save_assessment': {
        if (profile.role !== 'tenant') throw new Error('Not authorized.');
        await rpc('save_housing_assessment', {
          p_answers: d,
          p_tasks: generateTasks(d as Assessment, uid).map((t) => ({
            title: t.title,
            description: t.description,
          })),
        });
        const { data: a } = await sb
          .from('tenant_assessments')
          .select('id')
          .eq('tenant_id', uid)
          .single();
        const { data: resources } = await sb
          .from('assistance_resources')
          .select('*')
          .eq('active', true);
        if (a && resources) {
          await check(sb.from('resource_matches').delete().eq('assessment_id', a.id));
          const matches = rankResources(resources as Resource[], d as Assessment);
          if (matches.length)
            await check(
              sb.from('resource_matches').insert(
                matches.map((m) => ({
                  assessment_id: a.id,
                  resource_id: m.resource.id,
                  score: m.score,
                  reasons_json: m.reasons,
                })),
              ),
            );
        }
        break;
      }
      case 'toggle_task':
        await check(
          sb
            .from('action_items')
            .update({ status: d.status })
            .eq('id', d.id)
            .eq('user_id', uid)
            .select('id')
            .single(),
        );
        break;
      case 'add_task':
        await check(
          sb.from('action_items').insert({ ...d, user_id: uid, date_source: 'User-entered' }),
        );
        break;
      case 'save_resource':
        await check(
          d.saved
            ? sb.from('saved_resources').upsert({ user_id: uid, resource_id: d.id })
            : sb.from('saved_resources').delete().eq('user_id', uid).eq('resource_id', d.id),
        );
        break;
      case 'create_case':
        id = await rpc('create_discussion', {
          p_title: d.title,
          p_issue: d.issue_type,
          p_state: d.state,
          p_county: d.county,
          p_description: d.description,
        });
        break;
      case 'invite': {
        const token = randomBytes(32).toString('hex');
        await rpc('invite_participant', {
          p_case: d.case_id,
          p_email: d.email,
          p_hash: createHash('sha256').update(token).digest('hex'),
        });
        invite_link = siteOrigin(request) + '/mediation/invite?token=' + token;
        break;
      }
      case 'accept_invitation':
        id = await rpc('accept_invitation', {
          p_hash: createHash('sha256')
            .update(d.token as string)
            .digest('hex'),
        });
        break;
      case 'mark_case_read': {
        const { data: c } = await sb.from('cases').select('id').eq('id', d.case_id).single();
        if (!c) throw new Error('Not authorized.');
        const { data: messages } = await sb
          .from('messages')
          .select('id')
          .eq('case_id', d.case_id)
          .neq('sender_id', uid);
        if (messages?.length)
          await check(
            sb.from('message_reads').upsert(
              messages.map((m) => ({
                message_id: m.id,
                user_id: uid,
                read_at: new Date().toISOString(),
              })),
            ),
          );
        break;
      }
      case 'send_message':
        id = await rpc('post_message', { p_case: d.case_id, p_content: d.content });
        break;
      case 'propose':
        id = await rpc('create_proposal', { p_case: d.case_id, p_terms: d.terms });
        break;
      case 'respond_proposal':
        await rpc('respond_proposal', { p_proposal: d.id, p_response: d.response });
        break;
      case 'mediator_consent':
        await rpc('set_mediator_consent', { p_case: d.case_id, p_consent: d.consent });
        break;
      case 'leave_case':
        await rpc('leave_discussion', { p_case: d.case_id });
        break;
      case 'case_status':
        await rpc('set_case_status', { p_case: d.case_id, p_status: d.status });
        break;
      case 'report':
        await check(
          sb
            .from('moderation_reports')
            .insert({ case_id: d.case_id, reporter_id: uid, reason: d.reason }),
        );
        break;
      case 'add_date':
        await check(
          sb
            .from('appointments')
            .insert({ ...d, user_id: uid, confirmation_status: 'User-entered' }),
        );
        break;
      case 'delete_date':
        await check(sb.from('appointments').delete().eq('id', d.id).eq('user_id', uid));
        break;
      case 'add_support':
        if (profile.role !== 'tenant') throw new Error('Not authorized.');
        await check(sb.from('benefit_support_logs').insert({ ...d, user_id: uid }));
        break;
      case 'delete_support':
        await check(sb.from('benefit_support_logs').delete().eq('id', d.id).eq('user_id', uid));
        break;
      case 'mark_notifications': {
        let q = sb
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', uid);
        if (d.id) q = q.eq('id', d.id);
        await check(q);
        break;
      }
      case 'save_settings':
        await check(sb.from('profiles').update(d).eq('id', uid));
        break;
      case 'document_rename':
        await check(
          sb
            .from('documents')
            .update({ filename: d.filename, category: d.category })
            .eq('id', d.id)
            .eq('owner_id', uid)
            .select('id')
            .single(),
        );
        break;
      case 'share_document':
        await check(
          d.shared
            ? sb
                .from('document_permissions')
                .upsert({ document_id: d.id, authorized_user_id: d.user_id })
            : sb
                .from('document_permissions')
                .delete()
                .eq('document_id', d.id)
                .eq('authorized_user_id', d.user_id),
        );
        break;
      case 'resource_upsert':
        mustAdmin();
        await check(sb.from('assistance_resources').upsert(d));
        break;
      case 'jurisdiction_upsert':
        mustAdmin();
        await check(sb.from('jurisdictions').upsert(d, { onConflict: 'state,county' }));
        break;
      case 'verify_provider':
        mustAdmin();
        await rpc('verify_provider', { p_user: d.user_id });
        break;
      case 'request_provider':
        await check(
          sb.from('provider_requests').insert({
            user_id: uid,
            organization: d.organization,
            credential_reference: d.credential_reference,
            status: 'Pending',
          }),
        );
        break;
      case 'resolve_report':
        mustAdmin();
        await check(sb.from('moderation_reports').update({ status: 'Reviewed' }).eq('id', d.id));
        break;
    }
    if (action !== 'save_assessment')
      await sb
        .from('user_activity')
        .insert({ user_id: uid, description: action.replaceAll('_', ' ') });
    return NextResponse.json({ state: await loadWorkspace(uid), id, invite_link });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (request.cookies.has('sh-demo'))
      return NextResponse.json(
        { error: 'The fictional demo cannot access live account data.' },
        { status: 403 },
      );
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    rateLimit('delete:' + user.id, 3, 60000);
    const { confirm } = await readJson(request);
    if (confirm !== 'DELETE')
      return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 422 });
    // Page through every owned file rather than relying on PostgREST's default row cap.
    for (let offset = 0; ; offset += 500) {
      const { data: docs, error: listError } = await sb
        .from('documents')
        .select('storage_path')
        .eq('owner_id', user.id)
        .order('id')
        .range(offset, offset + 499);
      if (listError) throw new Error('Could not load documents for deletion.');
      if (docs?.length) {
        const { error } = await sb.storage
          .from('housing-documents')
          .remove(docs.map((d) => d.storage_path));
        if (error) throw new Error('Could not delete private files. Try again.');
      }
      if (!docs || docs.length < 500) break;
    }
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw new Error('Account deletion could not be completed.');
    await sb.auth.signOut();
    return NextResponse.json({ redirect: '/login' });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

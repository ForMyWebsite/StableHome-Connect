import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { assertSameOrigin, rateLimit, safeError } from '@/lib/security';
import { z } from 'zod';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (request.cookies.has('sh-demo'))
      return NextResponse.json(
        { error: 'The fictional demo cannot access live account data.' },
        { status: 403 },
      );
    const { id } = await params;
    z.uuid().parse(id);
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    rateLimit('download:' + user.id, 40);
    const { data: doc } = await sb
      .from('documents')
      .select('storage_path,filename')
      .eq('id', id)
      .single();
    if (!doc)
      return NextResponse.json(
        { error: 'Document not found or not shared with you.' },
        { status: 404 },
      );
    const { data, error } = await sb.storage
      .from('housing-documents')
      .createSignedUrl(doc.storage_path, 60, {
        download: request.nextUrl.searchParams.has('download') ? doc.filename : false,
      });
    if (error || !data) throw new Error('Download could not be prepared.');
    return NextResponse.redirect(data.signedUrl, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    if (request.cookies.has('sh-demo'))
      return NextResponse.json(
        { error: 'The fictional demo cannot access live account data.' },
        { status: 403 },
      );
    const { id } = await params;
    z.uuid().parse(id);
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const { data: doc } = await sb
      .from('documents')
      .select('storage_path')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();
    if (!doc) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    const { error } = await sb.storage.from('housing-documents').remove([doc.storage_path]);
    if (error) throw new Error('File deletion failed.');
    const result = await sb.from('documents').delete().eq('id', id).eq('owner_id', user.id);
    if (result.error) throw new Error('Metadata deletion failed.');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { assertSameOrigin, rateLimit, safeError } from '@/lib/security';
import { isAllowedDocument } from '@/lib/algorithms';
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (request.cookies.has('sh-demo'))
      return NextResponse.json(
        { error: 'The fictional demo cannot access live account data.' },
        { status: 403 },
      );
    if (Number(request.headers.get('content-length')) > 11 * 1024 * 1024)
      throw new Error('File is too large. Maximum size is 10 MB.');
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    rateLimit('upload:' + user.id, 15);
    const form = await request.formData();
    const file = form.get('file');
    const category = String(form.get('category') ?? 'Other').slice(0, 80);
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024)
      throw new Error('File is too large or empty. Maximum size is 10 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isAllowedDocument(bytes, file.type))
      return NextResponse.json(
        { error: 'Choose a genuine PDF, JPG, or PNG file.' },
        { status: 422 },
      );
    const id = crypto.randomUUID();
    const ext = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' }[file.type];
    const path = `${user.id}/${id}.${ext}`;
    const { error: uploadError } = await sb.storage
      .from('housing-documents')
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (uploadError)
      throw new Error('Upload could not be completed. Check the private bucket setup.');
    const { error } = await sb.from('documents').insert({
      id,
      owner_id: user.id,
      filename: file.name.slice(0, 200),
      category,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type,
    });
    if (error) {
      await sb.storage.from('housing-documents').remove([path]);
      throw new Error('File metadata could not be saved.');
    }
    await sb
      .from('user_activity')
      .insert({ user_id: user.id, description: 'Private document uploaded' });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

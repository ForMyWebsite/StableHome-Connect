import { NextRequest, NextResponse } from 'next/server';
import { isConfigured, supabaseServer } from '@/lib/supabase';
import { homeFor } from '@/lib/algorithms';
import { siteOrigin } from '@/lib/security';
import type { Role } from '@/lib/types';
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const code = request.nextUrl.searchParams.get('code');
  if (code && isConfigured()) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      const { data: p } = await sb
        .from('profiles')
        .select('role')
        .eq('id', user?.id ?? '')
        .single();
      const next = request.nextUrl.searchParams.get('next');
      const r = NextResponse.redirect(
        origin +
          (next === '/reset-password' ||
          (next && /^\/mediation\/invite\?token=[a-f0-9]{64}$/.test(next))
            ? next
            : homeFor((p?.role ?? 'tenant') as Role)),
      );
      r.cookies.delete('sh-demo');
      return r;
    }
  }
  return NextResponse.redirect(origin + '/login?error=callback');
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isConfigured, supabaseServer } from '@/lib/supabase';
import { assertSameOrigin, rateLimit, readJson, safeError, siteOrigin } from '@/lib/security';
import { homeFor } from '@/lib/algorithms';
import type { Role } from '@/lib/types';
const authSchema = z
  .object({
    action: z.enum(['login', 'signup', 'google', 'forgot', 'reset', 'logout']),
    email: z.email().max(254).optional(),
    password: z.string().min(8).max(128).optional(),
    display_name: z.string().trim().min(1).max(100).optional(),
    role: z.enum(['tenant', 'landlord']).optional(),
    zip: z
      .string()
      .regex(/^\d{5}$/)
      .optional(),
    language: z.enum(['en', 'es', 'other']).optional(),
    next: z
      .string()
      .regex(/^\/mediation\/invite\?token=[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    rateLimit('auth:' + request.headers.get('x-forwarded-for')?.split(',')[0], 15, 60000);
    const parsed = authSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Check the form fields. Passwords must contain at least 8 characters.' },
        { status: 422 },
      );
    const d = parsed.data;
    if (d.action === 'logout') {
      if (isConfigured()) {
        const sb = await supabaseServer();
        await sb.auth.signOut({ scope: 'local' });
      }
      const r = NextResponse.json({ redirect: '/login' });
      r.cookies.delete('sh-demo');
      return r;
    }
    if (!isConfigured())
      return NextResponse.json(
        {
          error:
            'Supabase is not configured. Set the two public project variables in .env.local. You can use the fictional demo meanwhile.',
        },
        { status: 503 },
      );
    const sb = await supabaseServer();
    const origin = siteOrigin(request);
    const callback =
      origin + '/auth/callback' + (d.next ? '?next=' + encodeURIComponent(d.next) : '');
    if (d.action === 'google') {
      const settings = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/settings', {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        cache: 'no-store',
      });
      if (!settings.ok || !(await settings.json()).external?.google)
        return NextResponse.json(
          {
            error:
              'Google sign-in is not enabled for this project yet. Enable Google in Supabase Authentication and configure its OAuth client.',
          },
          { status: 503 },
        );
      const { data, error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback, queryParams: { prompt: 'select_account' } },
      });
      if (error || !data.url)
        return NextResponse.json(
          {
            error:
              'Google sign-in is unavailable. Enable the Google provider and allow this app’s callback URL in Supabase.',
          },
          { status: 503 },
        );
      const res = NextResponse.json({ redirect: data.url });
      res.cookies.delete('sh-demo');
      return res;
    }
    if (d.action === 'forgot') {
      if (!d.email)
        return NextResponse.json({ error: 'Enter your email address.' }, { status: 422 });
      const { error } = await sb.auth.resetPasswordForEmail(d.email, {
        redirectTo: origin + '/auth/callback?next=/reset-password',
      });
      if (error)
        return NextResponse.json(
          { error: 'Password reset could not be requested. Check your connection and try again.' },
          { status: 503 },
        );
      return NextResponse.json({
        message:
          'If an account exists, a password reset email will arrive. Check your inbox and spam folder.',
      });
    }
    if (d.action === 'reset') {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || !d.password)
        return NextResponse.json(
          { error: 'Open a valid password recovery email first.' },
          { status: 401 },
        );
      const { error } = await sb.auth.updateUser({ password: d.password });
      if (error)
        return NextResponse.json(
          { error: 'Could not update your password. Request a fresh recovery email.' },
          { status: 400 },
        );
      return NextResponse.json({ redirect: '/dashboard' });
    }
    if (!d.email || !d.password)
      return NextResponse.json({ error: 'Enter an email address and password.' }, { status: 422 });
    if (d.action === 'signup') {
      if (!d.display_name || !d.zip || !d.role)
        return NextResponse.json({ error: 'Complete the account fields.' }, { status: 422 });
      const { data, error } = await sb.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          emailRedirectTo: callback,
          data: {
            display_name: d.display_name,
            role: d.role,
            zip: d.zip,
            language: d.language ?? 'en',
          },
        },
      });
      if (error)
        return NextResponse.json(
          {
            error: 'Account creation could not be completed. Check your details or try signing in.',
          },
          { status: 400 },
        );
      const response = NextResponse.json(
        data.session
          ? { redirect: d.next ?? (d.role === 'landlord' ? '/landlord' : '/assessment?welcome=1') }
          : {
              message:
                'Check your email to confirm your account. Then sign in to create your housing plan.',
            },
      );
      if (data.session) response.cookies.delete('sh-demo');
      return response;
    }
    const { data, error } = await sb.auth.signInWithPassword({
      email: d.email,
      password: d.password,
    });
    if (error || !data.user)
      return NextResponse.json(
        {
          error:
            'Unable to sign in. Check your email and password, and confirm your email if needed.',
        },
        { status: 401 },
      );
    const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).single();
    const res = NextResponse.json({ redirect: d.next ?? homeFor((p?.role ?? 'tenant') as Role) });
    res.cookies.delete('sh-demo');
    return res;
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

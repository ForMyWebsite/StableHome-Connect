import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canVisit, homeFor } from './lib/algorithms';
import type { Role } from './lib/types';
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/privacy',
  '/demo',
];
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/') || path.startsWith('/auth/') || publicPaths.includes(path))
    return NextResponse.next();
  const demo = request.cookies.get('sh-demo')?.value as Role | undefined;
  if (demo && ['tenant', 'landlord', 'provider', 'admin'].includes(demo))
    return canVisit(demo, path)
      ? NextResponse.next()
      : NextResponse.redirect(new URL(homeFor(demo), request.url));
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return NextResponse.redirect(new URL('/login', request.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          for (const { name, value } of items) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of items) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const target = new URL('/login', request.url);
    if (
      /^\/mediation\/invite$/.test(path) &&
      /^[a-f0-9]{64}$/.test(request.nextUrl.searchParams.get('token') ?? '')
    )
      target.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(target);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = (profile?.role ?? 'tenant') as Role;
  if (!canVisit(role, path)) return NextResponse.redirect(new URL(homeFor(role), request.url));
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};

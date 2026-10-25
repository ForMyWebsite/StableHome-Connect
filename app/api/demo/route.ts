import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, readJson } from '@/lib/security';
import { homeFor } from '@/lib/algorithms';
import { z } from 'zod';
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { role } = z
      .object({ role: z.enum(['tenant', 'landlord', 'provider', 'admin']) })
      .parse(await readJson(request));
    const r = NextResponse.json({ redirect: homeFor(role) });
    r.cookies.set('sh-demo', role, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 86400,
    });
    return r;
  } catch {
    return NextResponse.json(
      { error: 'Choose a fictional demo role from this app.' },
      { status: 400 },
    );
  }
}

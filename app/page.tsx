import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { homeFor } from '@/lib/algorithms';
import { isConfigured, supabaseServer } from '@/lib/supabase';
import type { Role } from '@/lib/types';
export default async function Home() {
  const demo = (await cookies()).get('sh-demo')?.value as Role;
  if (demo && ['tenant', 'landlord', 'provider', 'admin'].includes(demo)) redirect(homeFor(demo));
  if (isConfigured()) {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).single();
      redirect(homeFor((p?.role ?? 'tenant') as Role));
    }
  }
  redirect('/login');
}

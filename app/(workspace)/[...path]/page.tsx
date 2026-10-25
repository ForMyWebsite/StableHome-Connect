import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { demoWorkspace } from '@/lib/demo';
import { canVisit, homeFor } from '@/lib/algorithms';
import { isConfigured, supabaseServer } from '@/lib/supabase';
import { loadWorkspace } from '@/lib/workspace-server';
import { WorkspaceProvider } from '@/components/workspace-context';
import { Shell } from '@/components/shell';
import { WorkspaceRouter } from '@/components/workspace-router';
import type { Role, Workspace } from '@/lib/types';
export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const demo = (await cookies()).get('sh-demo')?.value as Role;
  let initial: Workspace;
  const isDemo = ['tenant', 'landlord', 'provider', 'admin'].includes(demo);
  if (isDemo) initial = demoWorkspace(demo);
  else {
    if (!isConfigured()) redirect('/login');
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect('/login');
    initial = await loadWorkspace(user.id);
  }
  if (!canVisit(initial.profile.role, '/' + path.join('/')))
    redirect(homeFor(initial.profile.role));
  return (
    <WorkspaceProvider initial={initial} demo={isDemo}>
      <Shell>
        <WorkspaceRouter path={path} />
      </Shell>
    </WorkspaceProvider>
  );
}

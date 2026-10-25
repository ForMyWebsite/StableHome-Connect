'use client';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { demoCommand, demoProfile } from '@/lib/demo';
import type { Command, Workspace } from '@/lib/types';
const DEMO_KEY = 'stablehome-fictional-v1';
type Result = { id?: string; invite_link?: string };
type Context = {
  state: Workspace;
  demo: boolean;
  busy: boolean;
  error: string;
  success: string;
  clearFeedback: () => void;
  run: (action: string, data: Command['data']) => Promise<Result | null>;
  reload: () => Promise<void>;
  replaceDemo: (state: Workspace) => void;
};
const WorkspaceContext = createContext<Context | null>(null);
export const useWorkspace = () => {
  const c = useContext(WorkspaceContext);
  if (!c) throw new Error('Workspace provider missing');
  return c;
};
export function WorkspaceProvider({
  initial,
  demo,
  children,
}: {
  initial: Workspace;
  demo: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [hydrated, setHydrated] = useState(!demo);
  useEffect(() => {
    if (!demo) return;
    try {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Workspace;
        if (Array.isArray(parsed.resources) && Array.isArray(parsed.cases) && parsed.profile) {
          setState({ ...parsed, profile: demoProfile(initial.profile.role) });
        }
      }
    } catch {
      setError('Browser storage is unavailable. Changes may not survive closing this page.');
    }
    setHydrated(true);
    const sync = (event: StorageEvent) => {
      if (event.key === DEMO_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          setState({ ...parsed, profile: demoProfile(initial.profile.role) });
        } catch {
          setError('Demo storage could not be refreshed.');
        }
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [demo, initial.profile.role]);
  const replaceDemo = useCallback((next: Workspace) => {
    localStorage.setItem(DEMO_KEY, JSON.stringify(next));
    setState(next);
  }, []);
  const reload = useCallback(async () => {
    if (demo) return;
    const r = await fetch('/api/workspace', { cache: 'no-store' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? 'Could not refresh the workspace.');
    setState(data);
  }, [demo]);
  async function run(action: string, data: Command['data']): Promise<Result | null> {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (state.setup_error && !demo)
        throw new Error('Saving is paused until the database connection is ready.');
      if (demo) {
        const result = demoCommand(state, { action, data });
        replaceDemo(result.state);
        setSuccess('Saved to this fictional demo.');
        return {
          id: result.id,
          invite_link: result.token
            ? window.location.origin + '/mediation/invite?token=' + result.token
            : undefined,
        };
      }
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error ?? 'Your changes were not saved.');
      setState(result.state);
      setSuccess('Your changes are saved.');
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your changes were not saved.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  if (!hydrated)
    return (
      <main id="main-content" className="loading-page" role="status" aria-busy="true">
        <p>Opening your fictional workspace…</p>
      </main>
    );
  return (
    <WorkspaceContext.Provider
      value={{
        state,
        demo,
        busy,
        error,
        success,
        clearFeedback: () => {
          setError('');
          setSuccess('');
        },
        run,
        reload,
        replaceDemo,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

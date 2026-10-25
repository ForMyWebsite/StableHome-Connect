'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  MessagesSquare,
  Calculator,
  FolderLock,
  Route,
  HandHeart,
  Bell,
  Settings,
  LogOut,
  LifeBuoy,
  Menu,
  X,
  ArrowUpRight,
  ChevronDown,
  ShieldCheck,
  Building2,
  Users,
  ChartNoAxesCombined,
  MapPin,
} from 'lucide-react';
import { Brand, Notice, SafetyFooter } from './ui';
import { useWorkspace } from './workspace-context';
import { homeFor } from '@/lib/algorithms';
import type { Role } from '@/lib/types';
const shared = [
  { href: '/resources', name: 'Find assistance', icon: Search },
  { href: '/mediation', name: 'Discussion hub', icon: MessagesSquare },
  { href: '/planner', name: 'Repayment planner', icon: Calculator },
  { href: '/documents', name: 'My documents', icon: FolderLock },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const { state, demo, error, success, busy } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width:1023px)');
    const change = () => {
      setMobile(media.matches);
      if (!media.matches) setOpen(false);
    };
    change();
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (mobile && open) {
      wasOpen.current = true;
      navRef.current?.querySelector<HTMLAnchorElement>('nav a')?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      menuRef.current?.focus();
    }
    document.body.style.overflow = mobile && open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile, open]);
  const path = usePathname();
  const p = state.profile;
  const links =
    p.role === 'tenant'
      ? [
          { href: '/dashboard', name: 'Overview', icon: LayoutDashboard },
          { href: '/assessment', name: 'Housing assessment', icon: ClipboardList },
          ...shared,
          { href: '/navigator', name: 'My action plan', icon: Route },
          { href: '/benefits', name: 'Community support', icon: HandHeart },
        ]
      : p.role === 'admin'
        ? [
            { href: '/admin', name: 'Administration', icon: LayoutDashboard },
            { href: '/admin/resources', name: 'Resource directory', icon: Building2 },
            { href: '/admin/providers', name: 'Provider verification', icon: Users },
            { href: '/admin/analytics', name: 'Engagement insights', icon: ChartNoAxesCombined },
            { href: '/admin/jurisdictions', name: 'Service areas', icon: MapPin },
          ]
        : [
            {
              href: homeFor(p.role),
              name: p.role === 'landlord' ? 'Landlord overview' : 'Provider overview',
              icon: LayoutDashboard,
            },
            ...shared,
          ];
  const unread = state.notifications.filter((n) => n.user_id === p.id && !n.read_at).length;
  async function logout() {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    if (r.ok) window.location.assign(new URL('/login', window.location.origin).href);
  }
  async function switchRole(role: Role) {
    const r = await fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const data = await r.json();
    if (r.ok) window.location.assign(data.redirect);
  }
  return (
    <div className="app-layout">
      <aside
        ref={navRef}
        inert={mobile && !open}
        aria-hidden={mobile && !open}
        role={mobile && open ? 'dialog' : undefined}
        aria-modal={mobile && open ? true : undefined}
        aria-label={mobile && open ? 'Workspace navigation' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            e.preventDefault();
          }
          if (e.key === 'Tab' && mobile && open) {
            const nodes = Array.from(
              navRef.current?.querySelectorAll<HTMLElement>(
                'a[href],button:not(:disabled),select',
              ) ?? [],
            ).filter((el) => el.getClientRects().length);
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              last?.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first?.focus();
              e.preventDefault();
            }
          }
        }}
        className={'sidebar ' + (open ? 'is-open' : '')}
      >
        <div className="sidebar-brand">
          <Brand light />
          <button
            className="icon-btn mobile-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-section">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={
                'nav-item ' +
                (path === l.href ||
                (l.href !== '/admin' && l.href !== '/dashboard' && path.startsWith(l.href + '/'))
                  ? 'active'
                  : '')
              }
              aria-current={path === l.href ? 'page' : undefined}
            >
              <l.icon size={19} />
              <span>{l.name}</span>
              {l.href === '/mediation' && state.cases.length > 0 && (
                <span className="nav-count">
                  {
                    state.cases.filter((c) =>
                      state.participants.some(
                        (cp) => cp.case_id === c.id && cp.user_id === p.id && !cp.blocked,
                      ),
                    ).length
                  }
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <div className="help-icon">
            <LifeBuoy size={23} />
          </div>
          <strong>A person can help.</strong>
          <p>Connect with local support when you need it.</p>
          <a href="tel:211">
            Call 211 <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="sidebar-bottom">
          <Link className="nav-item" href="/settings">
            <Settings size={19} />
            Settings & privacy
          </Link>
          <button className="nav-item" onClick={logout}>
            <LogOut size={19} />
            Log out
          </button>
          <div className="sidebar-profile">
            <span className="avatar">
              {p.display_name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <span>
              <strong>{p.display_name}</strong>
              <small>
                {demo ? 'Fictional ' : ''}
                {p.role === 'provider' ? 'Mediator / provider' : p.role}
              </small>
            </span>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main" inert={mobile && open}>
        <header className="topbar">
          <button
            ref={menuRef}
            aria-expanded={open}
            className="icon-btn mobile-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            My workspace<span>/</span>
            <strong>
              {links.find((l) => path === l.href)?.name ??
                (path.startsWith('/mediation/') ? 'Private discussion' : 'Your next step')}
            </strong>
          </div>
          <form action="/resources" className="top-search">
            <Search size={16} />
            <input
              name="q"
              aria-label="Search assistance resources"
              placeholder="Search resources…"
            />
            <kbd>↵</kbd>
          </form>
          <Link
            href="/notifications"
            className="notification-btn"
            aria-label={`Notifications, ${unread} unread`}
          >
            <Bell size={20} />
            {unread > 0 && <span className="notification-dot" />}
          </Link>
          <Link href="/settings" aria-label="Account settings" className="avatar top-avatar">
            {p.display_name
              .split(' ')
              .map((s) => s[0])
              .slice(0, 2)
              .join('')}
          </Link>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="tiny-dot" />
              <strong>Demo workspace</strong>
              <span className="demo-banner-detail">
                {' '}
                · Fictional data, real possibilities. Changes stay in this browser.
              </span>
            </span>
            <label className="demo-switch">
              <span>View as</span>
              <select
                aria-label="Switch fictional demo role"
                value={p.role}
                onChange={(e) => switchRole(e.target.value as Role)}
              >
                <option value="tenant">Jordan · Tenant</option>
                <option value="landlord">Taylor · Landlord</option>
                <option value="provider">Casey · Mediator</option>
                <option value="admin">Administrator</option>
              </select>
              <ChevronDown size={13} />
            </label>
          </div>
        )}
        <main id="main-content" className="workspace-content">
          {state.setup_error && <Notice tone="warning">{state.setup_error}</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          {success && (
            <div className="save-toast" role="status">
              <ShieldCheck size={16} />
              {success}
            </div>
          )}
          {busy && (
            <div className="saving-indicator" role="status">
              Saving…
            </div>
          )}
          {children}
          <SafetyFooter />
        </main>
        <nav className="bottom-nav" aria-label="Mobile quick navigation">
          {[
            links[0],
            ...links.filter((l) => ['/resources', '/mediation', '/documents'].includes(l.href)),
          ]
            .slice(0, 4)
            .map((l) => (
              <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>
                <l.icon size={20} />
                <span>
                  {l.name === 'Find assistance'
                    ? 'Find help'
                    : l.name === 'Discussion hub'
                      ? 'Discuss'
                      : l.name === 'My documents'
                        ? 'Documents'
                        : 'Overview'}
                </span>
              </Link>
            ))}
        </nav>
      </div>
    </div>
  );
}

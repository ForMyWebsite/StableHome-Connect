'use client';
import Link from 'next/link';
import { Dashboard } from './dashboard';
import { AssessmentPage } from './assessment';
import { ResourcesPage } from './resources';
import { PlannerPage } from './planner';
import { MediationPage } from './mediation';
import { DocumentsPage } from './documents';
import { NavigatorPage, BenefitsPage, NotificationsPage, SettingsPage } from './supporting';
import { AdminPage, RoleDashboard } from './roles';
import { Empty } from './ui';
export function WorkspaceRouter({ path }: { path: string[] }) {
  switch (path[0]) {
    case 'dashboard':
      return <Dashboard />;
    case 'assessment':
      return <AssessmentPage results={path[1] === 'results'} />;
    case 'resources':
      return <ResourcesPage id={path[1]} />;
    case 'mediation':
      return <MediationPage id={path[1]} />;
    case 'planner':
      return <PlannerPage />;
    case 'documents':
      return <DocumentsPage />;
    case 'navigator':
      return <NavigatorPage />;
    case 'benefits':
      return <BenefitsPage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'settings':
      return <SettingsPage />;
    case 'landlord':
    case 'provider':
      return <RoleDashboard section={path[1]} id={path[2]} />;
    case 'admin':
      return <AdminPage section={path[1]} id={path[2]} />;
    default:
      return (
        <Empty
          title="Let’s get you back on track."
          action={
            <Link className="btn primary" href="/">
              Go to my workspace
            </Link>
          }
        >
          This page isn’t part of your housing workspace.
        </Empty>
      );
  }
}

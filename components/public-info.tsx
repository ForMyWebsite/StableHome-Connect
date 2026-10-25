import Link from 'next/link';
import { ArrowRight, ShieldCheck, Home, HeartHandshake, MapPin } from 'lucide-react';
import { Brand, Neighborhood, ExternalLink } from './ui';
export function PublicInfo({ privacy = false }: { privacy?: boolean }) {
  return (
    <div className="public-page">
      <header>
        <Brand />
        <nav>
          <Link href="/about">About</Link>
          <Link href="/privacy">Privacy</Link>
          <Link className="btn primary" href="/login">
            Log in
            <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="main-content">
        <p className="eyebrow">STABLEHOME CONNECT</p>
        <h1>{privacy ? 'Your story belongs to you.' : 'A little support. A steadier tomorrow.'}</h1>
        <p className="public-intro">
          {privacy
            ? 'Understand what this prototype collects, how sharing works, and how you can export or delete your information.'
            : 'Prevent eviction. Find assistance. Stay housed. A civic technology project that brings housing resources, private planning, and voluntary conversations into one place.'}
        </p>
        {privacy ? (
          <article className="prose panel">
            <h2>What we collect and why</h2>
            <p>
              Accounts store a display name, email through Supabase Auth, account role, general
              location, language, and notification preferences. A housing assessment can optionally
              store rent, arrears, household income, essential expenses, and household size to help
              organize your own plan. You can browse resource pathways in the fictional demo without
              providing real personal information.
            </p>
            <p>
              Do not upload Social Security numbers, bank credentials, immigration records, medical
              records, or information unrelated to your housing support needs.
            </p>
            <h2>Private records and chosen sharing</h2>
            <p>
              Assessments, benefits support logs, and unshared documents are limited to their owner
              through database policies. Landlords and providers do not automatically see these
              records. Administrators do not receive blanket access to document content.
            </p>
            <p>
              Discussion messages, proposal versions, and selected shared files are visible to
              accepted participants. A verified provider needs both tenant and landlord consent plus
              an invitation. Sharing is voluntary. You can revoke document access, but cannot recall
              a copy already downloaded. A signed file link can remain usable for up to 60 seconds
              after access is revoked.
            </p>
            <h2>Where information is stored</h2>
            <p>
              Real accounts use the configured Supabase project for authentication, PostgreSQL
              records, and private Storage. Hosting infrastructure processes requests and may retain
              operational logs under its own policies. Google sign-in redirects through Google and
              Supabase. The app does not use advertising trackers or send your assessment to an AI
              service.
            </p>
            <p>
              Google and email sign-in use server-managed HttpOnly session cookies. The fictional
              demo uses a separate role cookie, browser local storage, and IndexedDB for synthetic
              files. Demo records never sync to the real database. Do not enter real information in
              demo mode, especially on a shared device.
            </p>
            <h2>Retention, exports, and deletion</h2>
            <p>
              Workspace records are retained until you delete individual files or entries, reset the
              fictional demo, or delete your account. This prototype does not promise automated
              archival cleanup. Invitation links expire after 72 hours. Expired invitation metadata
              remains until the associated discussion or account is removed.
            </p>
            <p>
              In Settings, export your visible workspace records and permanently delete your
              account. Download file contents separately. Account deletion removes owned files,
              private records, and discussions you created; participant records and messages
              associated with your account are removed through database cascades. It cannot delete
              exports or copies held by other people. Hosting and database backups follow the
              infrastructure provider’s retention policy and are not immediately erased by the app.
            </p>
            <h2>Notifications and safety reports</h2>
            <p>
              Notifications exist inside the app. This prototype does not send external email or SMS
              updates except authentication messages sent by Supabase. Safety reports go to platform
              administrators and include the concern and case identifier. Reports are not an
              emergency service, and response times are not guaranteed.
            </p>
            <h2>Prototype status</h2>
            <p>
              This is an independent educational prototype, not a government portal, legal service,
              court system, financial institution, or benefits authority. Do not use it as the only
              place to keep essential records or respond to time-sensitive legal notices. Consult
              qualified assistance and the responsible organization.
            </p>
            <Link className="btn primary" href="/settings">
              Manage my privacy settings
              <ArrowRight size={16} />
            </Link>
          </article>
        ) : (
          <>
            <div className="public-hero">
              <Neighborhood />
              <div>
                <span className="pill">Independent civic technology prototype</span>
                <h2>Housing stability starts with a connection.</h2>
                <p>
                  Describe your situation, explore documented assistance pathways, build a private
                  action plan, and coordinate a voluntary discussion at your own pace.
                </p>
                <Link className="btn primary" href="/demo">
                  Explore the fictional demo
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="public-features">
              {[
                {
                  icon: MapPin,
                  title: 'A nationwide starting point',
                  text: 'National assistance finders for all U.S. states and territories, with locally scoped listings where documented.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Privacy by design',
                  text: 'Private assessments and files. Explicit invitations and individual sharing choices. Restricted professional roles.',
                },
                {
                  icon: HeartHandshake,
                  title: 'Practical next steps',
                  text: 'Explainable matches, precise repayment scenarios, personal reminders, and a voluntary discussion workspace.',
                },
              ].map((f) => (
                <section key={f.title}>
                  <f.icon size={25} />
                  <h2>{f.title}</h2>
                  <p>{f.text}</p>
                </section>
              ))}
            </div>
            <section className="prose panel">
              <h2>Built for people, with honest limits.</h2>
              <p>
                StableHome Connect helps organize information and connect people with existing
                support. It does not determine legal rights, eligibility, court status, or eviction
                risk, and does not submit applications to organizations or enroll users in official
                programs.
              </p>
              <p>
                Source-linked listings must be checked directly for current intake, funding, contact
                details, and eligibility. A private discussion does not change a court deadline.
                Repayment calculations are educational, not legal or financial recommendations.
              </p>
              <p>
                The fictional scenario follows Jordan Rivera and Taylor Morgan exploring a voluntary
                resolution with the optional involvement of Casey Brooks, a fictional mediator. Demo
                progress is never reported as a verified eviction prevented.
              </p>
              <h2>Need immediate support?</h2>
              <p>
                Call 211 to ask about local housing support. For immediate danger, call 911. For
                court papers, lockouts, or urgent deadlines, seek qualified legal help promptly.
              </p>
              <ExternalLink href="https://www.lsc.gov/about-lsc/what-legal-aid/get-legal-help">
                Find legal aid through the official LSC directory
              </ExternalLink>
            </section>
          </>
        )}
      </main>
      <footer>
        <Home size={16} />
        StableHome Connect · Independent educational prototype
        <Link href="/privacy">Privacy policy</Link>
      </footer>
    </div>
  );
}

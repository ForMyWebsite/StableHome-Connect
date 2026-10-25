# StableHome Connect

**Prevent eviction. Find assistance. Stay housed.**

A working civic-technology prototype with a calm, responsive interface, Google/email sign-in integration, a private tenant workspace, explainable assistance matching, exact repayment calculations, voluntary discussions, document sharing, and separate landlord, provider, and administrator workflows.

This is an independent educational prototype. It is not a government portal, law firm, court service, lender, or benefits eligibility authority. No money moves through this app. No official application or diversion enrollment is submitted.

## Open in GitHub Codespaces

1. Push this repository to GitHub, then choose **Code → Codespaces → Create codespace** on the branch containing this app.
2. The included `.devcontainer/devcontainer.json` installs locked dependencies, creates an ignored `.env.local` without replacing existing configuration, and starts the app.
3. Open **Ports**, find **3000 — StableHome Connect**, and open it in the browser. Keep the port private while developing with housing data.
4. Choose **Explore the demo** on the login page. All fictional workflows work without a live database or Google credentials.
5. For real accounts, complete the Supabase setup below. Codespaces callback origins are inferred from its environment variables. If forwarding changes, explicitly set `SITE_URL` to the origin shown in the Ports panel.

You can also start it manually in the terminal:

```bash
npm ci --ignore-scripts
npm run setup
npm run dev
```

Use Node 24 (`.nvmrc`). The project was tested with Node 24.19 and npm 11.9. Dependencies are locked. Dependency lifecycle scripts stay disabled; supported native packages are distributed as platform-specific optional packages. No external AI key is required.

## Supabase setup — required for real accounts

The supplied project is `sarpvayghisotjiiowgo`. Its public URL and publishable key belong in `.env.local` or deployment variables. Publishable keys are browser-safe project identifiers; they never bypass RLS. **Do not add a service-role key or a Google client secret to a `NEXT_PUBLIC_` variable.**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sarpvayghisotjiiowgo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
# Optional outside Codespaces; required when the deployment origin cannot be inferred:
SITE_URL=https://your-public-app-origin
```

The owner-supplied browser-safe connection is included in `.env.example` and copied into the ignored `.env.local` by setup, so Codespaces opens with this project configured. To use another project, set both variables before setup or edit `.env.local`. Neither a Google client secret nor a service-role/database administrator credential is included in the repository.

### 1. Create the app database and private bucket

Open the [Supabase project dashboard](https://supabase.com/dashboard/project/sarpvayghisotjiiowgo), select **SQL Editor**, and run **`supabase/bootstrap.sql` once** against the fresh project. It is a transactional bundle of:

- `001_core.sql`: profiles, private assessments, resources, tasks, discussions, participants, invitations, messages, immutable proposal versions, document metadata and permissions, support logs, notifications, moderation, provider requests, audit logs, quotas, guarded functions, RLS, and restricted grants.
- `002_private_storage.sql`: the private `housing-documents` bucket, MIME/size constraints, and owner/explicit-sharing policies.
- `003_resources.sql`: source-linked national and southeastern Pennsylvania resource pathways and jurisdiction notes. It inserts no real or demo user records.

Alternatively, with an authenticated Supabase CLI and project-owner permissions:

```bash
supabase link --project-ref sarpvayghisotjiiowgo
supabase db push
```

Use one migration approach per new database. The bootstrap bundle is not designed to be reapplied over existing tables. New changes should be new numbered migrations. Regenerate the seed/bundle after editing source migrations or `lib/resources.json`:

```bash
npm run seed:generate
```

### 2. Configure Google sign-in

1. In Google Cloud Console, create an OAuth client for a web application and configure its consent screen. Add the intended testers if the Google app is in testing mode.
2. Use this **Google authorized redirect URI**:
   `https://sarpvayghisotjiiowgo.supabase.co/auth/v1/callback`
3. In **Supabase → Authentication → Sign In / Providers → Google**, enable Google and enter that client ID and client secret securely there.
4. In **Supabase → Authentication → URL Configuration**, set the Site URL to your current app origin and allow:
   - Your app origin followed by `/auth/callback`
   - Your app origin followed by `/auth/callback?next=/reset-password` for recovery
   - Your Codespaces preview callback origin. Supabase supports callback allowlist patterns; prefer your exact development hostname, or a narrowly scoped Codespaces pattern you control.
5. Restart the Next.js process after changing local environment variables. Click **Continue with Google** and complete the real consent flow.

An app callback and the Google authorized redirect URI are different: Google returns to Supabase, then Supabase returns to this app. Invitation return paths are restricted to the app’s own invitation route.

### 3. Email/password accounts and privileged roles

Enable Supabase email authentication. Configure SMTP for dependable real-world delivery; default Supabase email delivery has testing limits. Confirmation and recovery links must return to the permitted app origin. The app provides account creation, sign-in, show/hide password, recovery, reset, and logout.

Users can sign up only as **tenant** or **landlord**. Google accounts start as tenants. Editing user metadata cannot create a provider or admin. Once an account exists, a project owner can create the initial administrator in the SQL Editor:

```sql
-- Replace with the specific account UUID from Authentication → Users.
update public.profiles
set role = 'admin'
where id = 'REPLACE-WITH-THAT-USER-UUID';
```

Tenants/landlords can submit a provider verification request in Settings. An administrator must independently check the organization and professional credentials before approval. Approval is audited. Provider access to a discussion still requires tenant and landlord consent and an accepted invitation.

### Live project checks performed

On October 25, 2026, the supplied publishable key successfully reached the project’s authentication settings. Email authentication was enabled; Google was **disabled**; `assistance_resources` was **not yet created**. This session has no project-owner management connector or credentials to change those settings. The SQL and OAuth setup above must be completed before claiming live accounts, cloud persistence, and private Storage are validated. The fully fictional browser demo is independently functional.

## What you can do

| Area              | Implemented behavior                                                                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login and roles   | Google OAuth code flow, email/password/signup/recovery/logout, HttpOnly sessions, protected routes, server/DB role checks, fictional role switcher                                                                                                                                          |
| Tenant dashboard  | Workflow status, actual task progress, top resource matches, personal dates, quick actions, persisted activity                                                                                                                                                                              |
| Assessment        | Location and explicit county confirmation; housing situation/urgency; optional budget estimates; assistance/communication/language preferences; saved results and generated tasks                                                                                                           |
| Assistance        | All states/DC/territories via national finders; documented local service areas; search/category/location/saved filters; official source links; review dates and unknown fields                                                                                                              |
| Matching          | Geography is filtered first. Relevance weights: geography 30, category 25, known income alignment 20, urgent-path fit 15, documented language 10. Unknown eligibility remains included. Ties prefer more complete information, then organization/name ID. Every contribution is explained.  |
| Discussions       | Voluntary case creation, copied invitation links (no email claim), 72-hour one-use tokens hashed in storage, matching-account acceptance, accepted-participant messaging, versioned proposals/reviews, consent-based mediator access, reporting, leaving, and participant-recorded progress |
| Repayment         | Integer cents, exact rounding, weekly/biweekly/monthly schedules, month-end handling, initial payment, budget comparison using the highest calendar-month obligation, interactive chart, alternative schedules, CSV export, explicit proposal sharing                                       |
| Documents         | PDF/JPG/PNG, signature/MIME/size checks, private bucket, short-lived authorized links, preview/download, rename/category/delete, individual sharing/revocation, browser-only synthetic file storage for demo                                                                                |
| Navigator         | Suggested and custom tasks, completion tracking, personal target dates, explicit-source reminders, countdowns, calendar export                                                                                                                                                              |
| Community support | Private informal-support entries and history; separate SSI/SNAP/housing education; no eligibility calculator                                                                                                                                                                                |
| Notifications     | Actual in-app discussion notifications and read/unread controls, notification preference; no external messaging claims                                                                                                                                                                      |
| Landlord/provider | Authorized discussion lists, proposal review, shared files, personal calendar, explicit-consent boundaries                                                                                                                                                                                  |
| Administration    | Source-linked resource CRUD, jurisdiction notes, provider verification, moderation report review, small-group-suppressed engagement metrics, audited listing/approval changes                                                                                                               |
| Privacy           | Workspace export, file downloads, account deletion, demo reset, explicit privacy policy                                                                                                                                                                                                     |
| App experience    | Responsive sidebar/mobile navigation, labeled forms, keyboard focus/skip link, loading/empty/error states, installable web manifest and local branding; no caching of private pages in a service worker                                                                                     |

## Demonstration walkthrough

All actors and case records are fictional. Demo changes persist in this browser’s local storage and IndexedDB, separately from the real database. They are not synchronized across devices. Use synthetic files only.

1. On `/login`, choose **Explore the demo** to become **Jordan Rivera, tenant**. Demo starting estimates: monthly rent $1,500; unpaid rent $1,200; household income $2,800; essential non-rent expenses $750; Delaware County, PA; no filed court case.
2. Complete or edit the assessment. View explained assistance matches, open an official source, save a resource, and complete a task in the action plan.
3. In the repayment planner, try $1,200 total, $200 initial, five monthly installments: the remaining payments total exactly $1,000, or $200 each.
4. Open the seeded discussion or create a new one. Send a respectful message, create an invitation for `taylor@example.test`, and copy its link.
5. Use **View as → Taylor, Landlord**. Accept the copied invitation. In the seeded discussion, Taylor is already an accepted participant. Review Jordan’s proposal for discussion, suggest changes, or create a revised version through the planner. Older terms remain unchanged.
6. Jordan and Taylor must each give mediator consent. In the demo only, **Casey Brooks** then joins automatically as a fictional mediator. In real mode, a verified provider must also receive and accept an invitation.
7. Casey sees only authorized discussions and explicitly shared files. Private assessments and support logs do not appear in professional or landlord workspaces.
8. Record a participant-reviewed plan as active, download a plain-language negotiation summary, and add your own follow-up reminder. This is not a binding agreement or an officially prevented eviction.
9. Explore the fictional administrator to edit a resource, inspect suppressed aggregate counts, and review service areas. In Settings, type `DELETE` to reset fictional browser data.

Demo actors: Jordan Rivera (`jordan@example.test`), Taylor Morgan (`taylor@example.test`), Casey Brooks (`casey@example.test`), and Demo Administrator. Demo mode does not create auth users or passwords.

## Test and inspect

```bash
npm test                    # Algorithms, origin security, fictional workflows, actual Postgres RLS tests
npm run typecheck
npm run lint
npm run build
npm start                   # Serve the production build on port 3000

# Browser testing (once, if Chromium is not already installed)
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright uses `/usr/bin/chromium` when available, `CHROMIUM_PATH` when supplied, otherwise its installed Chromium. Tests use isolated profiles and synthetic files. The E2E runner builds/starts the app automatically unless an existing local server is running. Restart an existing production server after rebuilding; otherwise it can serve an older build. CI runs all checks and preserves failure traces. Google consent and real email delivery need separate project-owner testing; the automated login UI error test uses an intercepted provider error and does not pretend to authenticate a Google account.

Database tests run the real migrations and Storage policies inside PGlite/Postgres with multiple authenticated roles. They assert isolation, invitation validation, explicit file sharing/revocation, provider consent, immutable proposal terms, and privileged-access restrictions. They validate SQL behavior locally, not the hosted project’s operational setup.

## Project layout

- `app/`: Next.js App Router pages, auth callback, protected JSON endpoints, document routes, and global styling.
- `components/`: feature screens, app frame, UI primitives, client workspace state.
- `lib/`: shared types/validation, deterministic algorithms, server-only Supabase/request helpers, synthetic demo state and browser file storage.
- `supabase/migrations/`: application schema, access policies, private Storage, source-linked seed.
- `supabase/bootstrap.sql`: generated transactional setup bundle for the project SQL Editor.
- `tests/`: logic and SQL authorization tests; `e2e/`: actual browser workflows and accessibility checks.
- `docs/`: original user brief, implementation contract, verified-source notes, and current limitations.
- `.devcontainer/`: Codespaces configuration; `.github/workflows/`: quality checks.

Each cloud task is already isolated: use its existing checkout. Do not create a Git worktree unless explicitly requested.

## Limits and production work

Read `docs/LIMITATIONS.md` before collecting real housing information. Local functional tests do not certify compliance or professional suitability. No database, Google settings, deployment, government integration, or new cloud snapshot is claimed to exist merely because source files were generated.

# StableHome Connect implementation contract

The user-supplied PRODUCT_BRIEF.txt is the specification; the user's follow-up adds Google authentication and nationwide US discovery.

Build order: identity → tenant assessment and plans → assistance matching → discussions → repayment → private documents and supporting tools → role dashboards → verification.

- Next.js App Router, TypeScript, Supabase Auth/Postgres/private Storage; server-only authentication with HttpOnly cookies.
- Synthetic demo data persists separately in this browser and never reaches the real database. Switch fictional actors to demonstrate negotiation.
- Nationwide national finders; curated local resources only where their published service area matches. No unverified ZIP mapping: require explicit county confirmation.
- No eligibility guarantees, invented court dates, claims of funding, government affiliation, or legal advice.
- Money uses safe integer cents. Calendar schedules preserve month-end behavior. Rankings filter geography first and explain each contribution.
- Access is enforced in both request handlers and database RLS. Roles come from profiles, never editable client metadata. Signup grants tenant or landlord only.
- Auth, tasks, messages, proposals and documents show failures instead of silently pretending a save succeeded.
- Public project identifiers are configuration, never service-role credentials. Administrative migrations/provider enablement need project-owner access.

Validation: npm test; npm run typecheck; npm run lint; npm run build; npm run test:e2e. Browser tests use isolated Chromium and synthetic records; SQL tests use Postgres through PGlite and two authenticated actors. Live Google login and cloud Storage must be separately validated after project-owner setup.

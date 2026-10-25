# Current limits and launch requirements

The app is a functional competition prototype with local automated validation. Complete the hosted-project setup and professional operational review before using real sensitive housing records.

## Requires the Supabase project owner

- Apply `supabase/bootstrap.sql` once to the fresh hosted project. The app tables were absent during the live check. Local SQL tests do not apply a hosted migration.
- Enable Google and configure a Google OAuth web client. Google was disabled during the live check. Enter its secret only in Supabase’s Google provider settings.
- Configure auth callback allowlists, production origin, email delivery, and the initial administrator. Validate real sign-in, email confirmation, recovery, cross-account access, uploads, sharing/revocation, and deletion in a disposable hosted test scenario.
- No Supabase service-role key is needed by this application. Project-owner setup can be performed in the dashboard without granting this chat administrator credentials.

## Data and geography

- All states, DC, and territories can select national directory pathways. This is not a complete database of local assistance programs or laws. Only documented local service areas are suggested as local matches.
- Resource source reviews are recorded in `SOURCES.md`. Some sources remain pending or unavailable; no listing asserts verified available funding or acceptance. Organizations can change their details at any time.
- County is explicitly confirmed. No ZIP-to-county mapping is claimed without a verified overlapping-jurisdiction dataset. Administrators can add verified mappings to the schema in a separate data maintenance task.
- No court data is queried, dates are never invented, and the app cannot calculate legally binding deadlines. Reminders are date-only, entered by users. No official appointment is booked.
- Language preferences are saved; the interface is currently English, and the app does not arrange interpreters.

## Discussions, privacy, and professional workflows

- Invitations are copied and shared by the sender. No invitation email/SMS delivery integration is claimed. Supabase sends authentication messages when configured.
- The fictional demo runs in one browser’s local storage/IndexedDB and can demonstrate multiple actors through the switcher. Real accounts use PostgreSQL and private Storage. Demo records never sync across devices.
- In-app notifications are persisted for real discussion updates. The workspace refreshes on navigation or explicit reload; it does not yet use a Realtime subscription or background push.
- Shared messages and proposal history are the discussion record. There are no confidential professional-only notes, electronic signatures, binding contract generation, court submissions, or payment processing.
- Providers require independent human verification. The admin verification form is a record of an administrator’s review, not an automated professional-credential validation service.
- Administrator engagement analytics suppress counts under five. They do not expose tenant assessments or document contents and do not count an eviction as prevented.
- Leaving blocks access to the shared discussion. Previously and explicitly shared files must be revoked separately by their owner. Copies already downloaded cannot be recalled, and already-issued signed links remain valid for up to 60 seconds.

## Before a wider production deployment

- Adopt a retention/deletion and incident-response policy appropriate to your organization. Account deletion is implemented; automatic record archival and backup erasure are not claimed. Document real support/report response staffing and contact information before public launch.
- Verify the configured Supabase region, security settings, backups, provider contracts, and applicable privacy requirements. The prototype does not claim regulatory compliance.
- HTTP throttling is process-local for a single Codespaces server. Database quotas protect case creation, messages, proposals, and invitations even through direct RPC calls. Use a shared HTTP limiter/platform protection before horizontal deployment, especially for upload/auth abuse.
- Security headers are enabled. Next.js currently requires inline script/style allowances in the configured CSP; adopt nonce-based CSP as part of a production hardening review.
- File magic/MIME/size checks reject obvious spoofing. No antivirus scanning, PDF content interpretation, or OCR is implemented. Treat uploaded documents as untrusted, restrict sharing, and add a scanning/quarantine workflow before accepting files from an untrusted public audience.
- The web manifest supports installation; there is no service worker that caches private pages. No offline account synchronization is promised.
- CI configuration exists and is locally exercised through its commands, but a successful GitHub Actions run or Codespaces provisioning is not claimed unless independently observed.

- Prototype workspace screens load up to 1,000 visible records per collection. JSON export covers those loaded records; it is not an archival backup. Add cursor pagination before larger deployments. Account deletion separately pages through all owned document metadata to remove files. After leaving a discussion, a participant can still export their own authored messages and proposals through the data policies, while other participants’ messages remain inaccessible.
- The optional npm registry signature/provenance audit could not download Sigstore trust metadata through this cloud network (HTTP 403). Lockfile integrity and TLS verification remained enabled, and the standard dependency vulnerability audit reported zero known vulnerabilities.

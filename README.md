# TaksirUtama

The multi-school upgrade to `taksir-utama`: one Next.js application serving 10 schools with tenant-isolated UPSA, UASA, and PBD analysis.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

`SCHOOLS_CONFIG` and `SESSION_SECRET` are required. Generate a valid password hash and prepare a private registry with:

```bash
npm run school:onboard -- --file /secure/path/schools.private.json
```

The command writes a prepared registry and temporary credentials with owner-only permissions. Review the redacted report, then upload and deploy:

```bash
npm run school:onboard -- --file /secure/path/schools.private.json --apply
```

Keep the private registry and credentials in an approved password manager. Never commit them.

## Workbook templates

- [UPSA template](/templates/templat-upsa-v1.xlsx)
- [UASA template](/templates/templat-uasa-v1.xlsx)
- [PBD template](/templates/templat-pbd-v1.xlsx)

Change `schoolCode` in each workbook's `_CONFIG` tab before onboarding. Share private workbooks read-only with `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

Regenerate the templates with `npm run templates:generate`.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run security:audit
npm run build
```

## Post-MVP production setup

The application keeps the launch registry as a rollback source, but can use Clerk Organizations for named accounts and Neon Postgres for tenant configuration, workbook connections, readiness history, fingerprints, and audit events.

1. Create one Clerk Organization per school. Add its ID to `clerkOrganizationId` in the school registry, then assign `org:school_admin`, `org:teacher`, or viewer membership roles.
2. Provision Neon and set `DATABASE_URL`. Run `npm run db:migrate`, then `npm run db:import-schools`.
3. Generate `WORKBOOK_ENCRYPTION_KEY` with `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`. Store it only in the password manager and Vercel. Changing it requires re-encrypting saved workbook IDs first.
4. Generate `CRON_SECRET` and deploy. Vercel calls `/api/cron/readiness` every day at 06:00 Malaysia time.
5. Set `NEXT_PUBLIC_ASSESSMENT_TEMPLATE_URL` and `NEXT_PUBLIC_PBD_TEMPLATE_URL` to official Google template-copy links. Local XLSX templates remain the fallback.
6. Configure Sentry DSNs, Vercel Analytics, and Speed Insights. The health monitor may call `/api/health`; it exposes no tenant or dependency details.
7. Run `npm run vercel:firewall` with `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` to install the 10-login-attempts-per-IP-per-minute WAF rule. The in-application limiter remains secondary protection.

The self-service workflow is available at `/settings/data-sources`. Only School Admin and Platform Admin roles can validate, activate, recheck, or disable sources. The active workbook remains unchanged until a replacement passes validation and activation commits. Saved spreadsheet IDs are AES-256-GCM encrypted when the database is enabled, and APIs never return them.

### Safe rollout and rollback

- First run database reads alongside `SCHOOLS_CONFIG`, reconcile every school, and keep the environment registry for one stable release.
- If Clerk or Neon is unavailable during rollout, remove their environment keys and redeploy to return to signed launch sessions and the environment registry.
- Do not remove `SCHOOLS_CONFIG` until all ten schools pass login, dashboard, readiness, CSV, and PDF acceptance checks.
- Never log or paste passwords, session cookies, workbook IDs, pupil names, marks, exports, Clerk secrets, database URLs, or encryption keys.

### Alert policy

Create alerts for authentication spikes, Google API errors, export failures, fatal readiness checks, and p95 route latency above the acceptance targets. After every production deployment, check Vercel runtime errors and Sentry before promotion. The GitHub Actions workflow runs lint, TypeScript, tenant tests, a high-severity dependency audit, and a production build.

The operating baseline for pupil information, support access, retention, incidents, and offboarding is in [docs/PDPA-OPERATING-POLICY.md](docs/PDPA-OPERATING-POLICY.md).

## Database-native PBD proof of concept

New schools can enter aggregate PBD TP data without creating or sharing a workbook. This proof of concept stores class-subject totals only; it does not store pupil-level TP records.

1. Provision Neon and set `DATABASE_URL` alongside the existing school registry and session secret.
2. Run `npm run db:migrate`. The command applies every numbered SQL migration in `database/`.
3. Import the school registry with `npm run db:import-schools`. For a direct-entry-only pilot that keeps Google workbook IDs out of Neon, use `npm run db:import-schools -- --metadata-only`.
4. Sign in as the school pilot administrator, open `/pbd/entry`, then add classes, subjects, class-subject assignments, and PBD TP summaries.

Adding the first database class switches that school to the database PBD provider. The existing Google Sheets provider remains active for every school that has not made this explicit migration. A final PBD entry must reconcile TP1-TP6 plus pupils not assessed to the recorded class enrolment.

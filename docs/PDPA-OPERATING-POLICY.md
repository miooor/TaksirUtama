# Malaysian PDPA Operating Policy

This policy applies to production operation of Analisa Kurikulum. It is an operational baseline and must be reviewed by the appointed data-protection owner and legal adviser before schools sign the production agreement.

## Purpose and data boundaries

Google Sheets owned by each school remain the source of pupil marks and PBD records. Postgres stores school configuration, named memberships, teaching assignments, workbook connection metadata, readiness findings, fingerprints, and audit events. It must not become a second master copy of pupil marks.

The platform processes school data only to deliver the dashboards, readiness checks, exports, and support explicitly requested by the school. Cross-school comparisons and rankings are disabled unless every participating school provides documented consent and a privacy review is complete.

## Access

- School Admins manage staff and workbook connections for their own organization.
- Teachers receive only assigned class and subject access.
- Viewers cannot mutate data sources.
- Platform support access requires a documented ticket, explicit school approval, a time limit, least privilege, and an audit event. Impersonation must show a persistent support-access notice.
- Service accounts receive Viewer access only to approved workbooks.

## Retention and deletion

- Session and application logs must contain no pupil names, marks, report contents, passwords, cookies, or workbook IDs.
- Operational request logs are retained for 30 days unless an incident hold is approved.
- Audit events are retained for 24 months.
- Disabled workbook metadata and readiness history are retained for 90 days, then deleted unless the school requests earlier deletion.
- On offboarding, revoke memberships and workbook sharing immediately, suspend the school, provide any agreed export, then delete tenant configuration and metadata after the contractual retention window.

## Support and incidents

Every support access, data-source change, activation, disable action, and export failure must carry a request ID and tenant-safe audit record. Suspected disclosure, cross-tenant access, lost credentials, or unauthorized workbook sharing must be escalated immediately to the data-protection owner. Preserve relevant audit evidence, rotate affected secrets, revoke access, assess affected schools and pupils, and follow the approved notification process.

## Security operations

Secrets are stored only in Vercel encrypted environment variables and the approved password manager. Workbook IDs in Postgres are encrypted with AES-256-GCM. Production uses HSTS, CSP, frame protection, origin validation, named accounts, tenant-derived authorization, WAF login limiting, structured redacted logs, error monitoring, uptime checks, dependency scanning, and tested backups.

Review this policy quarterly, after every material architecture change, and after every incident.

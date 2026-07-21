# PPD Cross-School Operations Dashboard

## Summary

Add a read-only PPD workspace for a named Clerk PPD organisation, initially scoped to the 11 pilot schools. It will show district-wide and per-school UPSA, UASA, and PBD aggregates without exposing student names, marks, or slips.

Default district identity: **PPD Pilot**. It can be renamed to the official PPD name before launch.

## Implementation Changes

- Add a district model in Neon:
  - `districts` with Clerk organisation ID and active status.
  - `district_schools` mapping the PPD Pilot district to exactly the 11 registered schools.
  - `assessment_summary_snapshots` for safe UPSA/UASA school-level aggregates only, source fingerprint, freshness state, and refresh timestamps.
  - Refresh audit records and rate-limited manual refresh requests.

- Extend authentication with a distinct `ppd_admin` role:
  - Named Clerk accounts in the PPD Clerk organisation.
  - A discriminated school-versus-district actor context.
  - PPD routes reject school users; school routes reject PPD users.
  - PPD access is read-only: no Setup, entry, workbook configuration, or educational-data edits. A refresh request only recomputes summaries.

- Add PPD routes:
  - `/ppd/dashboard?year=YYYY&semester=1|2`
  - `/ppd/schools/[schoolId]?year=YYYY&semester=1|2`
  - A PPD-specific shell and navigation, separate from the school sidebar.

- PPD dashboard:
  - Year selector and persistent PBD semester context.
  - Separate UPSA, UASA, and PBD sections. No fabricated combined score.
  - UPSA/UASA: contributing schools, pupils, marks entered, missing marks, weighted average, pass rate, absence, and source freshness.
  - PBD: finalized assignment rate, incomplete/mismatched/ready/final counts, and finalized TP distribution using stored final enrolment snapshots.
  - School comparison table with data-status first, then completion and outcome indicators.
  - Every aggregate states how many schools contributed; unavailable or stale sources are excluded from its denominator.

- School drill-down:
  - School headline metrics, source freshness, and assessment status.
  - UPSA/UASA subject and class aggregates.
  - PBD subject and class aggregates by the selected semester.
  - Never render student names, individual marks, intervention lists, or report-slip links.

- Data refresh:
  - PBD queries Neon directly and remains current.
  - UPSA/UASA summaries refresh every six hours through a secured Vercel cron (`0 */6 * * *`).
  - PPD may request a rate-limited manual refresh; the server recomputes the same safe summaries and records per-school success or failure.
  - A summary is stale when its source fingerprint changes or it is older than 12 hours. Failed, missing, and stale sources remain visible as status rows but do not affect district metrics.

## Interfaces and Safety

- Add pure aggregate helpers such as `summarizePpdPbd` and `summarizeDistrictAssessments`.
- PPD repositories always derive school IDs from the authenticated district membership, never from a browser-supplied unrestricted ID.
- Preserve existing school tenant checks, PBD revisions, workbook fallback, school dashboards, and assessment routes.
- Keep spreadsheet IDs, workbook findings with sensitive details, passwords, and student records server-only.

## Test and Rollout Plan

- Test district role resolution, school-to-district isolation, PPD denial of school mutation routes, and school denial of PPD routes.
- Test PBD aggregation, finalized snapshots, archived records, weighted UPSA/UASA metrics, stale-source exclusion, and partial-school failures.
- Test that detail pages contain no student-level fields or slip links.
- Test cron and manual refresh authorization, rate limiting, source-fingerprint freshness, and failure recovery.
- Verify responsive PPD dashboard and school detail pages at 1440px, 1100px, 900px, and 390px.
- Run migration, seed PPD Pilot with the 11 active schools, create the Clerk PPD organisation and named officers, then complete authenticated production smoke tests before rollout.

## Assumptions

- PPD Pilot is the temporary district name until the official PPD name is supplied.
- PPD officers monitor aggregates only.
- UPSA/UASA stay workbook-backed for this phase; their summaries are cached in Neon rather than migrating raw assessment data.
- Exports are deferred until the monitoring dashboard has been proven in the pilot.

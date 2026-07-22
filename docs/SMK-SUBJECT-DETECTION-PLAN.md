# SMK Subject Detection and Academic Configuration

## Summary

Replace the fixed primary-school subject assumptions with a tenant-specific academic profile. Each of the five SMK schools will manage its canonical subjects, aliases, and analysis thresholds through an Admin UI. UPSA/UASA subjects will continue to be discovered from each class sheet, while PBD tabs will resolve to the same canonical identities.

A subject is required only when it appears in that class's sheet. This supports different subject combinations across schools, forms, and classes without falsely reporting missing marks.

## Key Changes

- Add a versioned `school_academic_configs` record containing:
  - `schoolLevel`: `primary` or `secondary`.
  - Canonical subjects with stable code, display name, aliases, active status, and optional alternative-choice group.
  - Percentage thresholds for pass, intervention, and high achievement.
  - Configured core subjects used by intervention rules.
  - Revision number and update metadata for safe concurrent editing.
- Add `AcademicProfile`, `SubjectDefinition`, `SubjectRequirementGroup`, `AcademicPolicy`, and `SubjectResolution` types.
- Preserve the current primary-school catalogue and BA/BTSK/BCSK and PAI/MORAL grouping as the fallback profile for existing schools.

### Admin and API

- Add `/settings/subjects`, editable by `school_admin` and `platform_admin`; teachers and viewers receive read-only access.
- Provide one atomic API:
  - `GET /api/settings/academic-config`
  - `PUT /api/settings/academic-config`
- Let administrators add subjects, maintain aliases, deactivate historical subjects, configure optional choice groups, and set thresholds.
- Reject duplicate canonical codes, normalized alias collisions, invalid thresholds, and references to nonexistent subjects.
- Record successful and rejected updates in `audit_events`; invalidate the school academic-config and analysis caches after a successful save.
- Keep inactive subjects resolvable for historical reports, but exclude them from new workbook validation and template guidance.

### Detection and Workbook Processing

- Replace global alias lookup with resolution against the authenticated school's academic profile.
- Normalize case, spacing, punctuation, and diacritics, but never guess between ambiguous aliases.
- UPSA/UASA:
  - Discover paired subject/GRED columns dynamically.
  - Treat only columns present in a class tab as that class's required subjects.
  - Apply an alternative-choice group only when explicitly configured.
- PBD:
  - Resolve each subject tab and PANITIA label through the same catalogue.
  - Match UPSA/UASA and PBD insights by canonical code, removing the fixed cross-assessment alias table.
- Treat an unknown or ambiguous subject as fatal during workbook validation so a typo cannot silently split results. Runtime reads remain graceful and show the raw label with a diagnostic rather than crashing.
- Introduce schema-version-2 SMK templates and level-aware validation:
  - Secondary class tabs accept Tingkatan 1-5.
  - Primary compatibility remains Tahun 1-6.
  - UI and validation messages use "Tingkatan" for SMK tenants.
  - Staff duplicate the standard class tab and retain only subjects taught by that class.
- Evaluate pass, intervention, and high-achiever rules as percentages of each subject's maximum mark. Keep raw marks for slips and add normalized averages for threshold decisions.

## Test and Pilot Plan

- Unit-test school-specific alias resolution, collision rejection, inactive subjects, punctuation variants, and unknown subjects.
- Verify two schools can map the same raw label differently without tenant leakage.
- Test SMK subjects across different class headers and confirm a subject absent from a class sheet is not reported as missing.
- Test canonical matching across UPSA, UASA, PBD, insights, readiness, CSV, PDF, and slips.
- Test configurable thresholds, non-100 maximum marks, core-subject interventions, and alternative-choice groups.
- Retain regression coverage for the existing primary school and its current subject-choice behavior.
- Test authorization, origin protection, optimistic revision checks, audit events, and cache invalidation.
- Add an end-to-end flow covering catalogue editing, workbook validation, activation, analysis, and report generation.
- Roll out by migrating the database, preserving the primary fallback, configuring each of the five SMK catalogues, validating version-2 workbooks as drafts, comparing sample reports with school-provided expected results, then activating one school at a time.
- Perform the promised point-by-point anti-slop UI review at desktop and mobile widths: verify alignment, readable contrast, complete text, unclipped controls, visible-by-default content, functional interactions, keyboard access, loading/error states, and the absence of generic decorative UI patterns.

## Assumptions

- The pilot covers UPSA/UASA and PBD.
- All students in a class share the class-level subject set.
- The five schools can adopt the standard version-2 workbook structure.
- The database is available because the selected Admin UI requires persistent tenant configuration.
- The pilot uses one academic policy per school; year-specific policy versioning is deferred.
- Subjects will be entered and verified by each school administrator rather than inferred from a hard-coded national SMK list.

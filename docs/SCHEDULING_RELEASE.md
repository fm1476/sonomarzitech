# Scheduling release: Work Group calendars

Deploy the frontend and the API Lambda together. This release adds `lambdas/api/lib/scheduling-access.mjs`; package the complete `lambdas/api` directory, including `lib/`, rather than uploading only `index.mjs`. The existing deployment workflow already packages that directory. There is no database schema migration. Deployment remains manual.

## Administrator setup

1. Sign in with an actual agency System Admin or Platform Admin account.
2. Open Personnel > Scheduling. Use **Work Group Calendars** to create calendars or open **Access & Settings** for an existing one.
3. Give each calendar a unique name, choose Active or Inactive, and select its visibility: mapped Unit members, all agency personnel, or selected people.
4. Map Units using their exact names. Matching ignores case and surrounding spaces, but does not use partial matching.
5. Select additional viewers and named Scheduling Managers. A manager needs the applicable action ability as well as assignment to the calendar. Role-wide scheduling abilities alone do not grant cross-calendar editing.
6. Save calendar settings before testing staff access. Older shift definitions without group membership are assigned to the legacy Patrol calendar. Missing definitions are repaired in the administrator workspace and persisted on the next administrator save. Unknown group IDs are recovered with selected-person visibility and require administrator configuration.
7. Create or edit shift patterns and select their Work Group. New bid cycles and extra-duty jobs also select a Work Group. Existing unscoped vacation cycles and extra-duty jobs remain agency-wide activities; only agency/platform administrators can manage them.

Inactive calendars retain their stored history. Administrators can reactivate them from Work Group Calendars. Staff retain their own assigned shifts and coverage in My Work even if department-wide calendar visibility is unavailable.

## Staff and scheduler behavior

Officers can view eligible overtime and Special Events without full department-wide roster permission. Shift Swaps has its own tab. Staff can submit their own pending requests, cancel their own pending leave or swap request, submit their own bid preferences during the open window, and sign up for an accessible open extra-duty job. They cannot alter another employee's request or approve their own request through the staff workflow.

Named managers can modify only the calendars assigned to them. Changes affecting several groups require management of every affected group. Leave decisions follow the employee's assignment group for the requested dates. Swap decisions consider both employees' groups. Roll call follows the shift's group. Callback list edits consider each affected employee's group. Agency-wide scheduling settings and calendar access configuration are restricted to agency/platform administrators.

Shift bids now apply seniority awards directly to the roster on an explicit effective date. Prior assignments end on that date (exclusive), preserving history. Future assignments must be resolved before awarding; unmatched preferences leave the employee unchanged. Award results and all roster changes save atomically. Named bidding managers can apply these linked changes without general roster editing rights. They receive only employee seniority fields when they lack HR record access. Existing cycles ask for an effective date when first awarded. Vacation awards create schedule exceptions.

Special-event awards check the full event date range, with a maximum event span of one year. Regular-duty reassignment uses a schedule exception; conflicting coverage or another awarded event must be resolved separately. Extra-duty conflict and fatigue warnings remain advisory, while job capacity is enforced.

## Reports

The configurable Personnel report builder includes Shift Assignments, Overtime Coverage, Time Off Requests, Special Events, Roll Call, and Extra Duty Signups. Work Group and status/shift grouping options vary by dataset. Existing date and personnel filters still apply. Displayed and exported scheduling rows respect calendar visibility. CSV exports use actual line breaks.

## Consistency and authorization

API reads filter records before they are returned to staff. Template scaffolding cannot reintroduce hidden scheduling records. Writes check persisted calendar managers and the authenticated person's abilities, not browser role-preview settings. Hidden collection-order and callback entries are preserved during scoped writes.

Scheduling writes take a workspace-specific transaction lock before loading their validation snapshot. Award/approval validation checks the proposed batch as a whole. Capacity violations, duplicate assignments, conflicting overtime, or leave approvals missing their matching exception reject the batch. Existing record versions still reject stale updates.

## Verification completed

Run `bash scripts/verify-source.sh`. It checks source syntax and existing role, attachment, and MFA invariants, plus scheduling access, browser save abilities, report visibility, CSV output, legacy initialization, template isolation, and the actual API save function against a simulated database. Tests replay competing approvals, verify rollback, preserve hidden order entries, and compare browser/server rotation calculations.

## After-deployment acceptance checks

Use actual separate accounts. Administrator **View As** is a UI preview and does not test a staff account's server authorization.

- Create Patrol and Dispatch calendars with different named managers; save, reload, and confirm their settings and assignments persist.
- As the Patrol manager, modify a Patrol pattern and assignment. Confirm Dispatch mutations fail. Repeat with the Dispatch manager.
- As an Officer, request overtime and a special event, submit/cancel leave and swaps, update bid preferences, and sign up for extra duty. Reload after each saved operation.
- Approve leave, swaps, overtime, and extra duty with the appropriate manager; verify roster changes and persisted statuses.
- In two sessions, try approving the final extra-duty slot or awarding conflicting overtime. Confirm the later operation fails without partial changes.
- Award a shift cycle with a future effective date. Reload, verify the winner's new assignment and the prior assignment's exclusive end date, and confirm an unmatched employee remains unchanged. Repeat with a bidding manager lacking general roster editing and HR access.
- Verify multi-day event reassignment, roll call, custom reports, and CSV exports with each account.
- Confirm affected staff receive the configured notices. No live AWS, browser, PostgreSQL concurrency, or push-delivery test was performed in the development workspace.

## Pending review batch: direct event assignments

Special Events now offers **Assign Personnel** to select one or several eligible people without an opt-in request. Existing pending requests are converted to awards; manual assignments are marked as assigned by a scheduler. Remaining capacity is enforced before changing any employee. Regular-duty reassignment requires an explicit selection and adds a date-range event exception, preserving the original shift pattern. Time off, overtime/one-off coverage, other events, and unauthorized source calendars block the operation. Assigned staff see the event across its date range in My Calendar, with a link to event details. API validation repeats eligibility, capacity, and full-range conflict checks. Include both frontend and API in the next deployment.

## Pending review batch: definable staffing categories for all calendars

Every Work Group's shift patterns can define arbitrary staffing categories and required counts. Configure **New/Edit Shift Pattern → Staffing Requirements by Category**, then select a category on regular assignments or one-off coverage. The total minimum is calculated from category requirements. Monthly coverage stays red until every category is satisfied; unclassified or excess staff in another category cannot mask a shortage. Leave removes that employee from their category's count. Each employee counts once per shift/day. Existing assignments remain unchanged and visibly unclassified.

Overtime gaps identify the missing category; published opportunities and awarded coverage carry that category. Shift swaps carry the original staffing position, subject to scheduler approval. Automatic shift-bid assignments preserve a category only when its name maps unambiguously to the awarded shift, otherwise requiring later classification.

Special Events use the same configurable categories, with per-category slot limits and requested/awarded/manual assignment categories. Existing event assignments can be classified in **Staffing Needs**. Each category requires a skill from the agency-defined Special Skills Catalog. Personnel records can hold multiple Special Skills. Employee pickers filter to matching skills; API validation rejects mismatched assignments, event requests, overtime requests/awards, and swap coverage. Categories do not change application permission roles. Existing records without staffing skills are not assumed qualified. Frontend and API must be deployed together.

Schedulers without HR access receive only scoped operational Special Skills, plus seniority when they manage bidding. Staff receive their own skill list for availability checks. Skills continue to be edited through the existing Personnel Record permissions; staff cannot self-grant a staffing qualification. Define the catalog in Personnel Administration → Special Skills Catalog, assign skills under Personnel Records → Edit → Special Skills & Scheduling Eligibility, and link each shift/event category to its required skill.

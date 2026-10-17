import { civilDate, CivilError } from "./civil-california-domain.mjs";
export function validateCalendarRange(fromDate, toDate) {
  if (
    !civilDate(fromDate) ||
    !civilDate(toDate) ||
    fromDate > toDate ||
    new Date(toDate) - new Date(fromDate) > 366 * 86400000
  )
    throw new CivilError("Choose a valid calendar range of up to one year.");
}
export function calendarEvents(rows, fromDate, toDate) {
  validateCalendarRange(fromDate, toDate);
  const events = [];
  for (const row of rows) {
    if (["Closed", "Cancelled"].includes(row.stage)) continue;
    const add = (date, title, kind, reference) => {
      if (civilDate(date) && date >= fromDate && date <= toDate)
        events.push({
          caseId: row.id,
          caseNumber: row.case_number,
          date,
          title,
          kind,
          reference: reference || "",
          stage: row.stage,
        });
    };
    if (!["Closed", "Cancelled", "Returned to Court"].includes(row.stage))
      add(row.return_by, "Court return due", "Court return", "");
    for (const d of row.deadlines || [])
      if (!d.completedAt) add(d.dueDate, d.title, d.kind, d.authorityReference);
  }
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.caseNumber.localeCompare(b.caseNumber) ||
      a.title.localeCompare(b.title),
  );
}

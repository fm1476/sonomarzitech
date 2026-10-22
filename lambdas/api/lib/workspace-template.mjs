// Templates supply defaults, not an alternate authorization channel. Record
// collections must come exclusively from the server-filtered workspace rows.
export function personnelSafeTemplate(template, administrator) {
  if (administrator) return template;
  const safe = structuredClone(template || {});
  safe.personnel = [];
  safe.accounts = [];
  safe.pm ||= {};
  for (const name of ['records', 'trainingRecords', 'trainingRequests',
    'disciplinaryActions', 'inquiries', 'instructors', 'extraDutySignups']) {
    safe.pm[name] = [];
  }
  safe.fieldTraining = {};
  return safe;
}

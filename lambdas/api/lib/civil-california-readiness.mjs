import {
  CivilError,
  CA_RULE_VERSION,
  CA_WORKFLOWS,
} from "./civil-california-domain.mjs";
export const CA_RELEASE_CHECKS = Object.freeze({
  legalRules: "California rules and workflow-specific deadlines reviewed",
  forms: "Current court forms and generated output accepted",
  fees: "County fees, deposits, holding periods and accounting accepted",
  permissions: "Staff roles and tenant isolation verified",
  uploads: "Live document upload and download verified",
  independentReview: "Live independent return and finance review verified",
  concurrency: "Live simultaneous edits and financial safeguards verified",
  refresh: "Live open-form refresh and cancellation verified",
  rollback: "Rollback and existing-module regression verified",
});
export function readinessStatus(saved = {}, profile = {}) {
  const entries =
    saved.ruleVersion === CA_RULE_VERSION && saved.county === profile.county
      ? saved.entries || {}
      : {};
  const missing = Object.keys(CA_RELEASE_CHECKS).filter(
    (k) => entries[k]?.status !== "passed",
  );
  const missingWorkflows = Object.keys(CA_WORKFLOWS).filter(
    (k) =>
      !(
        saved.ruleVersion === CA_RULE_VERSION &&
        saved.county === profile.county &&
        saved.acceptedWorkflows?.includes(k)
      ),
  );
  return {
    ...saved,
    revision: saved.revision || 0,
    entries,
    acceptedWorkflows:
      saved.ruleVersion === CA_RULE_VERSION && saved.county === profile.county
        ? saved.acceptedWorkflows || []
        : [],
    currentRuleVersion: CA_RULE_VERSION,
    checks: CA_RELEASE_CHECKS,
    missing,
    missingWorkflows,
    readyForApproval: missing.length === 0 && missingWorkflows.length === 0,
    activationEnabled: false,
  };
}
export function saveReadinessEvidence(saved, input, ctx) {
  if (!Object.hasOwn(CA_RELEASE_CHECKS, input.check))
    throw new CivilError("Choose a release check.");
  if (!["pending", "passed", "failed"].includes(input.status))
    throw new CivilError("Choose pending, passed or failed.");
  if (
    typeof input.reference !== "string" ||
    !input.reference.trim() ||
    input.reference.length > 2000
  )
    throw new CivilError(
      "A verification or review evidence reference is required.",
    );
  if (
    !Array.isArray(input.acceptedWorkflows) ||
    !input.acceptedWorkflows.every((k) => Object.hasOwn(CA_WORKFLOWS, k))
  )
    throw new CivilError("Choose supported workflows.");
  const current =
    saved.ruleVersion === CA_RULE_VERSION && saved.county === ctx.county
      ? saved
      : {
          revision: saved.revision || 0,
          entries: {},
          history: saved.history || [],
        };
  const entry = {
    status: input.status,
    reference: input.reference.trim(),
    by: ctx.userId,
    at: ctx.at,
  };
  return {
    ...current,
    revision: (saved.revision || 0) + 1,
    ruleVersion: CA_RULE_VERSION,
    county: ctx.county,
    acceptedWorkflows: [...new Set(input.acceptedWorkflows)],
    entries: { ...current.entries, [input.check]: entry },
    history: [...(current.history || []), { check: input.check, ...entry }],
  };
}

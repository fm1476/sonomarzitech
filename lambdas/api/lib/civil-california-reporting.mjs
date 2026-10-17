import {
  CivilError,
  ledgerBalance,
  civilDate,
} from "./civil-california-domain.mjs";
const total = (a, b) => {
  const n = a + b;
  if (!Number.isSafeInteger(n))
    throw new CivilError(
      "Report amount exceeds the supported accounting range.",
      422,
    );
  return n;
};
export function californiaFinancialReport(
  records,
  { fromDate = "", toDate = "" } = {},
) {
  if (
    (fromDate && !civilDate(fromDate)) ||
    (toDate && !civilDate(toDate)) ||
    (fromDate && toDate && fromDate > toDate)
  )
    throw new CivilError("Choose a valid report date range.");
  const summary = {
    caseCount: records.length,
    openingBalanceCents: 0,
    receiptsCents: 0,
    expensesCents: 0,
    disbursementsCents: 0,
    closingBalanceCents: 0,
    openHoldCases: 0,
    unreconciledCases: 0,
    pendingDisbursementsCents: 0,
    stages: {},
  };
  const inRange = (date) =>
      (!fromDate || date >= fromDate) && (!toDate || date <= toDate),
    cases = [];
  for (const r of records) {
    const c = r.california,
      balance = ledgerBalance(r);
    summary.stages[r.stage] = (summary.stages[r.stage] || 0) + 1;
    const line = {
      id: r.id,
      caseNumber: r.caseNumber,
      stage: r.stage,
      openingBalanceCents: 0,
      receiptsCents: 0,
      expensesCents: 0,
      disbursementsCents: 0,
      closingBalanceCents: 0,
    };
    for (const e of c.ledger || []) {
      const date = e.accountingDate || e.at.slice(0, 10),
        signed = e.direction === "in" ? e.amountCents : -e.amountCents;
      if (fromDate && date < fromDate)
        line.openingBalanceCents = total(line.openingBalanceCents, signed);
      if (!toDate || date <= toDate)
        line.closingBalanceCents = total(line.closingBalanceCents, signed);
      if (inRange(date)) {
        const key =
          e.direction === "in"
            ? "receiptsCents"
            : e.kind === "Disbursement"
              ? "disbursementsCents"
              : "expensesCents";
        line[key] = total(line[key], e.amountCents);
      }
    }
    for (const key of [
      "openingBalanceCents",
      "receiptsCents",
      "expensesCents",
      "disbursementsCents",
      "closingBalanceCents",
    ])
      summary[key] = total(summary[key], line[key]);
    if (c.holds.some((h) => !h.resolvedAt)) summary.openHoldCases++;
    if (
      c.ledger.length &&
      (c.reconciliation?.ledgerCount !== c.ledger.length ||
        c.reconciliation?.balanceCents !== balance)
    )
      summary.unreconciledCases++;
    for (const d of c.disbursements.filter((d) =>
      ["pending", "approved"].includes(d.status),
    ))
      summary.pendingDisbursementsCents = total(
        summary.pendingDisbursementsCents,
        d.amountCents,
      );
    cases.push(line);
  }
  return {
    summary,
    cases,
    fromDate,
    toDate,
    generatedAt: new Date().toISOString(),
    basis:
      "Accounting dates; opening excludes from-date, closing includes to-date. Holds, reconciliation and pending approvals reflect current state.",
  };
}
export function californiaLedgerRows(
  record,
  { fromDate = "", toDate = "" } = {},
) {
  return record.california.ledger
    .filter((e) => {
      const d = e.accountingDate || e.at.slice(0, 10);
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    })
    .map((e) => ({
      caseId: record.id,
      caseNumber: record.caseNumber,
      ...e,
      accountingDate: e.accountingDate || e.at.slice(0, 10),
    }));
}

// Reference amounts published by Sonoma County Sheriff's Civil Bureau.
// These are quote inputs, not automatic charges or a waiver determination.
export const SONOMA_FEE_REFERENCE = Object.freeze({
  county: "Sonoma",
  scheduleEffectiveDate: "2024-01-01",
  printingEffectiveDate: "2026-01-01",
  reviewedAt: "2026-10-17",
  source: "https://www.sonomasheriff.org/s/Website-Service-Fees.pdf",
  updates: "https://www.sonomasheriff.org/about-civil-bureau",
  serviceCents: {
    summons: 5000,
    "small-claims": 5000,
    subpoena: 5000,
    "bank-levy": 5000,
    possession: 18000,
    "earnings-withholding": 4500,
  },
  printingPerPageCents: 125,
  disbursementProcessingCents: 1500,
  notes:
    "Fee waivers, statutory exemptions, additional charges and levy deposits require packet-specific review. Bank levy fee is per debtor per bank. Possession amount here is for real-property eviction. Restraining-order fees require a separate exemption review.",
});

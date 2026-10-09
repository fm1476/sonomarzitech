/* =========================================================================
   CIVIL PROCESS MODULE (IIFE-scoped; reads/writes STATE.civil)
   Grounded in the Arizona Rules of Civil Procedure (Rule 4 summons; Rule 4.1
   service within Arizona -- personal, substituted, posting/"nail and mail",
   publication, waiver; Rule 4.2 extraterritorial service; Rule 45 subpoenas),
   and how county Sheriff's civil units actually structure the workflow
   (Lane County, Orange County, LASD, Salt Lake, Kern, and Lee County civil
   process units): intake with signed instructions, assignment to a deputy
   or civil process server, logged service attempts, and a Return of
   Service / Affidavit of Service as the final proof-of-service document.
   ========================================================================= */
(function(){

const PAPER_TYPES = ["Summons & Complaint","Small Claims","Writ of Garnishment","Wage Garnishment / Earnings Withholding",
  "Writ of Execution","Writ of Restitution (Eviction)","Forcible Entry & Detainer (FED)","Order of Protection",
  "Injunction Against Harassment","Civil Subpoena","Notice","Writ of Assistance","Writ of Possession","Writ of Attachment",
  "Claim and Delivery","Order to Appear","Child Support Process","Foreclosure / Sheriff's Sale"];
const COURTS_OF_ORIGIN = ["Coconino County Superior Court","Flagstaff Municipal Court","Coconino County Justice Court - Precinct 1","Coconino County Justice Court - Precinct 2","U.S. District Court - District of Arizona"];
const SERVICE_METHODS = ["Personal Service","Substituted Service","Posting (Nail and Mail)","Publication","Waiver of Service","Certified Mail"];
const ATTEMPT_RESULTS = ["Served","Not Home","Refused Service","Moved / No Longer Resides","Bad Address","Business Closed","Evading Service","Other"];
const PAYMENT_METHODS = ["Cash","Check","Money Order","Credit Card","County Invoice","Fee Waiver"];
const FEE_CATEGORIES = ["Base Service Fee","Mileage","Additional Attempt","Notary Fee","Copy Fee","Other"];
const PAPER_STAGES = ["Unassigned","Assigned","Attempting","Served","Unable to Serve","Returned to Court","Cancelled"];
// Papers requiring immediate/same-day attention per Arizona practice (protective orders may be
// served by any law enforcement officer at any time, and are treated as top priority statewide).
const PRIORITY_PAPER_TYPES = ["Order of Protection","Injunction Against Harassment"];

// Personal property seized under a levy (Writ of Execution, Writ of Possession, Claim and
// Delivery). Distinct from real property below: personal property is physically taken into
// custody and stored, real property is not.
const PROPERTY_TYPES = ["Vehicle","Business Equipment","Household Goods / Furniture","Cash / Currency",
  "Jewelry & Valuables","Firearms","Electronics","Inventory / Stock","Livestock","Other Personal Property"];
const PROPERTY_DISPOSAL_METHODS = ["Sold at Public Auction","Sold via Private Sale","Returned to Judgment Debtor",
  "Returned to Third-Party Claimant","Turned Over to Judgment Creditor","Destroyed","Donated to Charity","Abandoned (Unclaimed)"];
const PROPERTY_STORAGE_LOCATIONS = ["Main Impound Lot","Evidence Storage Warehouse","Secure Storage Unit"];
// A status list is intentionally admin-editable, like everything else here -- but nothing in the
// module's math or reporting parses this text to decide what happened. Whether a piece of
// property counts as sold, released, or disbursed is always read from its own dedicated dates
// and amounts (saleDate, disposalDate, disbursed), so relabeling or reordering this list can
// never silently change what a report counts.
const PROPERTY_SEIZURE_STATUSES = ["Seized / In Custody","In Storage","Appraisal Pending","Notice of Sale Posted",
  "Ready for Sale / Auction","Sold","Released to Debtor","Released to Third-Party Claimant","Turned Over to Creditor",
  "Destroyed","Abandoned"];

// Real property (land, homes, businesses) levied under the same writs. A levy here is a notice
// recorded against title, not a physical seizure -- the debtor stays in possession throughout,
// so there is no storage location, no physical custody, and the eventual sale is of the title
// interest itself at a sheriff's sale, with its own redemption-period concept personal property
// doesn't have.
const REAL_PROPERTY_TYPES = ["Single-Family Residential","Multi-Family Residential","Commercial Building","Vacant Land","Agricultural","Industrial"];
const REAL_PROPERTY_LEVY_STATUSES = ["Notice of Levy Recorded","Appraisal Pending","Notice of Sale Posted",
  "Sold \u2014 Redemption Period","Sold \u2014 Deed Issued","Redeemed by Debtor","Levy Released / Withdrawn"];

function defaultFeeScheduleCivil(){
  // Sensible starting points, fully editable by a Civil Process Supervisor in Admin > Fee
  // Schedule & Rates. Nothing here is hard-coded into the logic elsewhere -- every dollar
  // amount, rate, and allowed-method list used across the module (intake fee auto-fill,
  // mileage cost on attempts, interest accrual on enforcement records, the Mark Served
  // method dropdown) reads from this structure at calculation time.
  const perType = {
    "Summons & Complaint": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:21, requiredAttempts:3, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Substituted Service","Posting (Nail and Mail)","Publication","Waiver of Service"]},
    "Small Claims": {baseFee:25, additionalAttemptFee:10, defaultDeadlineDays:30, requiredAttempts:3, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Substituted Service","Certified Mail"]},
    "Writ of Garnishment": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:30, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Certified Mail"]},
    "Wage Garnishment / Earnings Withholding": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:30, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Certified Mail"]},
    "Writ of Execution": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:60, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)"]},
    "Writ of Restitution (Eviction)": {baseFee:50, additionalAttemptFee:20, defaultDeadlineDays:5, requiredAttempts:1, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)"]},
    "Forcible Entry & Detainer (FED)": {baseFee:50, additionalAttemptFee:20, defaultDeadlineDays:10, requiredAttempts:2, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Substituted Service","Posting (Nail and Mail)"]},
    "Order of Protection": {baseFee:0, additionalAttemptFee:0, defaultDeadlineDays:7, requiredAttempts:5, feeWaived:true, enforceable:false,
      allowedServiceMethods:["Personal Service"]},
    "Injunction Against Harassment": {baseFee:0, additionalAttemptFee:0, defaultDeadlineDays:7, requiredAttempts:5, feeWaived:true, enforceable:false,
      allowedServiceMethods:["Personal Service"]},
    "Civil Subpoena": {baseFee:25, additionalAttemptFee:10, defaultDeadlineDays:14, requiredAttempts:2, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Certified Mail"]},
    "Notice": {baseFee:20, additionalAttemptFee:10, defaultDeadlineDays:14, requiredAttempts:2, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Certified Mail","Posting (Nail and Mail)"]},
    "Writ of Assistance": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:30, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)"]},
    "Writ of Possession": {baseFee:50, additionalAttemptFee:20, defaultDeadlineDays:10, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)"]},
    "Writ of Attachment": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:30, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)"]},
    "Claim and Delivery": {baseFee:45, additionalAttemptFee:15, defaultDeadlineDays:21, requiredAttempts:2, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Substituted Service"]},
    "Order to Appear": {baseFee:25, additionalAttemptFee:10, defaultDeadlineDays:14, requiredAttempts:2, feeWaived:false, enforceable:false,
      allowedServiceMethods:["Personal Service","Substituted Service","Certified Mail"]},
    "Child Support Process": {baseFee:0, additionalAttemptFee:0, defaultDeadlineDays:21, requiredAttempts:3, feeWaived:true, enforceable:false,
      allowedServiceMethods:["Personal Service","Substituted Service","Certified Mail"]},
    "Foreclosure / Sheriff's Sale": {baseFee:50, additionalAttemptFee:20, defaultDeadlineDays:30, requiredAttempts:1, feeWaived:false, enforceable:true,
      allowedServiceMethods:["Personal Service","Posting (Nail and Mail)","Publication"]},
  };
  return {
    mileageRatePerMile: 0.67,
    interestRateAnnualPercent: 10,
    commissionRatePercent: 5,
    feeWaiverApprovalThreshold: 100,
    voidApprovalThreshold: 100,
    byType: perType,
  };
}
function feeConfigFor(paperType){
  const sched = STATE.civil.refData.feeSchedule;
  return sched.byType[paperType] || {baseFee:0, additionalAttemptFee:0, defaultDeadlineDays:21, requiredAttempts:2, feeWaived:false, enforceable:false, allowedServiceMethods:[...SERVICE_METHODS]};
}

function defaultRefDataCivil(){
  return { paperTypes:[...PAPER_TYPES], courtsOfOrigin:[...COURTS_OF_ORIGIN], serviceMethods:[...SERVICE_METHODS], attemptResults:[...ATTEMPT_RESULTS], feeSchedule: defaultFeeScheduleCivil(), feeCategoryGLCodes:{}, paymentMethodGLCodes:{},
    propertyTypes:[...PROPERTY_TYPES], propertyDisposalMethods:[...PROPERTY_DISPOSAL_METHODS], propertyStorageLocations:[...PROPERTY_STORAGE_LOCATIONS], propertySeizureStatuses:[...PROPERTY_SEIZURE_STATUSES],
    realPropertyTypes:[...REAL_PROPERTY_TYPES], realPropertyLevyStatuses:[...REAL_PROPERTY_LEVY_STATUSES] };
}

/* =========================================================================
   SEED DATA
   ========================================================================= */
function seedCivilPapers(){
  const today = new Date();
  const rows = [
    // [caseNumber, court, paperType, plaintiff, defendant, attorney, receivedDaysAgo, returnByDaysFromNow, stage, serverId, addr,
    //  feeLineItems: [[description, category, amount]...], feePayments: [[daysAgo, amount, method, reference, receivedBy, notes]...]]
    ["OP2026-00341","Coconino County Superior Court","Order of Protection","Jane R. Whitfield","Marcus D. Whitfield","Pro Se (self-represented)",0,7,"Assigned","p2","1420 N San Francisco St, Flagstaff, AZ 86001",
      [["Base Service Fee","Base Service Fee",35]],
      [[0,35,"Fee Waiver","N/A","Fred Marziano","Statutory fee exemption for protective order service (A.R.S. \u00a7 12-1809) \u2014 no fee charged to petitioner."]]],
    ["CV2026-00892","Coconino County Superior Court","Summons & Complaint","First Regional Credit Union","Daniel R. Osei","Hunter & Marsh PLLC",-4,21,"Attempting","p3","2210 E Route 66, Flagstaff, AZ 86004",
      [["Base Service Fee","Base Service Fee",45],["2nd Attempt Fee","Additional Attempt",15]],
      []],
    ["LT2026-00119","Flagstaff Municipal Court","Writ of Restitution (Eviction)","Peaks View Apartments LLC","Priya Nair","Coconino Property Law Group",-9,-1,"Served","p1","815 W University Ave, Flagstaff, AZ 86001",
      [["Base Service Fee","Base Service Fee",50],["Mileage (12 mi)","Mileage",15]],
      [[-9,65,"Check","Check #4471","Fred Marziano","Paid in full by plaintiff's counsel at intake."]]],
    ["SC2026-00504","Coconino County Justice Court - Precinct 1","Small Claims","Alan Brooks","Reno Automotive Repair LLC","Pro Se (self-represented)",-1,29,"Unassigned",null,"3300 N Fourth St, Flagstaff, AZ 86004",
      [["Base Service Fee","Base Service Fee",25]],
      []],
    ["CV2026-00877","Coconino County Superior Court","Writ of Garnishment","Summit Collections Inc.","James M. Whitfield","Desert Legal Services",-6,24,"Assigned","p6","4150 E Huntington Dr, Flagstaff, AZ 86004",
      [["Base Service Fee","Base Service Fee",45]],
      [[-6,45,"Money Order","MO-88213","Fred Marziano","Paid in full at filing."]]],
    ["CR2026-01894S","Coconino County Superior Court","Civil Subpoena","State of Arizona","Witness: Carla Ellis","County Attorney's Office",-12,-2,"Served","p4","920 S Beaver St, Flagstaff, AZ 86001",
      [["Base Service Fee","Base Service Fee",25]],
      [[-12,25,"Fee Waiver","N/A","Fred Marziano","Government agency subpoena \u2014 statutory fee exemption for County Attorney's Office."]]],
    ["CV2025-01502","Coconino County Superior Court","Wage Garnishment / Earnings Withholding","Northland Medical Billing","Robert T. Hayes","Flagstaff Collections Law",-45,-10,"Returned to Court","p5","1101 E Cedar Ave, Flagstaff, AZ 86004",
      [["Base Service Fee","Base Service Fee",45],["2nd Attempt Fee","Additional Attempt",15]],
      [[-45,60,"Check","Check #2290","Fred Marziano","Paid in full at intake, including anticipated additional-attempt fee."]]],
    ["LT2026-00133","Flagstaff Municipal Court","Forcible Entry & Detainer (FED)","Mountain Vista Rentals","Wendy Gilbert","Self-managed landlord",-3,11,"Attempting","p1","615 N Beaver St, Flagstaff, AZ 86001",
      [["Base Service Fee","Base Service Fee",50],["Mileage (9 mi)","Mileage",15]],
      []],
    ["CV2026-00901","Coconino County Superior Court","Writ of Execution","Cinder Lake Lending","Justin White","Hunter & Marsh PLLC",-20,5,"Unable to Serve","p3","2 E Route 66, Flagstaff, AZ 86001",
      [["Base Service Fee","Base Service Fee",45]],
      [[-20,20,"Cash","Receipt #5510","Fred Marziano","Partial payment received at intake; balance due upon successful service or supplemental instructions from counsel."]]],
  ];
  return rows.map(([caseNumber,court,paperType,plaintiff,defendant,attorney,receivedDaysAgo,returnByDaysFromNow,stage,serverId,addr,feeLineItems,feePayments],i)=>{
    const receivedDate = fmt(addDays(today, Number(receivedDaysAgo)));
    return {
      id:"cp"+(i+1), caseNumber, courtOfOrigin: court, paperType, plaintiff, defendant, attorneyOfRecord: attorney,
      priority: PRIORITY_PAPER_TYPES.includes(paperType) ? "Immediate" : "Standard",
      receivedDate, returnByDate: fmt(addDays(today, returnByDaysFromNow)),
      serviceAddresses: [{id:"addr1", address: addr, isPrimary: true}],
      assignedServerId: serverId, stage,
      serviceMethod: stage==='Served'||stage==='Returned to Court' ? "Personal Service" : null,
      attempts: [], servedDate: null, servedTime: null, servedOnName: null,
      feeLineItems: feeLineItems.map(([desc,cat,amt],fi)=>({id:`fee${i+1}_${fi+1}`, description:desc, category:cat, amount:amt})),
      feePayments: feePayments.map(([daysAgo,amt,method,ref,recvBy,notes],pi)=>({id:`pay${i+1}_${pi+1}`, date: fmt(addDays(today,daysAgo)), amount:amt, method, referenceNumber:ref, receivedBy:recvBy, notes})),
      deposits: [],
      mileage: 0,
      returnFiledDate: stage==='Returned to Court' ? fmt(addDays(today,-2)) : null,
      generatedDocuments: [],
      attachedDocuments: [],
      photos: [],
      safetyFlags: [],
      additionalPlaintiffs: [],
      additionalDefendants: [],
      witnesses: [],
      fieldHistory: [], notes: "",
    };
  });
}

function seedAttemptsAndOutcomes(papers){
  const today = new Date();
  const byCase = {};
  papers.forEach(p=>byCase[p.caseNumber]=p);

  const cv892 = byCase["CV2026-00892"];
  cv892.attempts = [
    {id:"att1", date: fmt(addDays(today,-3)), time:"09:15", deputyId:"p3", result:"Not Home", notes:"No answer; vehicle in driveway. Left business card."},
    {id:"att2", date: fmt(addDays(today,-1)), time:"18:40", deputyId:"p3", result:"Not Home", notes:"No answer at evening attempt. Neighbor confirmed resident still lives here."},
  ];

  const lt119 = byCase["LT2026-00119"];
  lt119.attempts = [
    {id:"att1", date: fmt(addDays(today,-9)), time:"10:00", deputyId:"p1", result:"Served", notes:"Personally served defendant at front door; identity confirmed by driver's license."},
  ];
  lt119.serviceMethod = "Personal Service"; lt119.servedDate = fmt(addDays(today,-9)); lt119.servedTime = "10:00"; lt119.servedOnName = "Priya Nair";

  const cr1894s = byCase["CR2026-01894S"];
  cr1894s.attempts = [
    {id:"att1", date: fmt(addDays(today,-12)), time:"14:20", deputyId:"p4", result:"Served", notes:"Personally served witness at place of employment."},
  ];
  cr1894s.serviceMethod = "Personal Service"; cr1894s.servedDate = fmt(addDays(today,-12)); cr1894s.servedTime = "14:20"; cr1894s.servedOnName = "Carla Ellis";

  const cv1502 = byCase["CV2025-01502"];
  cv1502.attempts = [
    {id:"att1", date: fmt(addDays(today,-46)), time:"08:30", deputyId:"p5", result:"Not Home", notes:"No answer."},
    {id:"att2", date: fmt(addDays(today,-44)), time:"17:10", deputyId:"p5", result:"Served", notes:"Personally served at residence; identity confirmed verbally and by mail addressed to defendant on premises."},
  ];
  cv1502.serviceMethod = "Personal Service"; cv1502.servedDate = fmt(addDays(today,-44)); cv1502.servedTime="17:10"; cv1502.servedOnName = "Robert T. Hayes";

  const lt133 = byCase["LT2026-00133"];
  lt133.attempts = [
    {id:"att1", date: fmt(addDays(today,-3)), time:"11:00", deputyId:"p1", result:"Not Home", notes:"No answer; posted notice on door per landlord-tenant nail-and-mail authorization, certified copy mailed same day."},
  ];

  const cv901 = byCase["CV2026-00901"];
  cv901.attempts = [
    {id:"att1", date: fmt(addDays(today,-19)), time:"09:00", deputyId:"p3", result:"Bad Address", notes:"Address does not exist; unit number not found at this location. Requesting updated address from plaintiff's counsel."},
    {id:"att2", date: fmt(addDays(today,-15)), time:"13:30", deputyId:"p3", result:"Bad Address", notes:"Confirmed with property manager that defendant never resided at this address."},
  ];

  return papers;
}

/* =========================================================================
   STATE LIFECYCLE
   ========================================================================= */
function buildData(){
  const papers = seedAttemptsAndOutcomes(seedCivilPapers());
  const flagged = papers.find(p=>p.caseNumber==='CV2026-00892');
  if(flagged){
    flagged.safetyFlags.push({
      id:'sf1', category:'Prior Aggression Toward Server', text:'Subject refused entry and made verbal threats toward the process server on the first attempt. Approach with a second officer present; consider daytime attempts only.',
      addedBy:'Ofc. James Whitfield', addedDate: fmt(addDays(new Date(),-3)), expiresDate: fmt(addDays(new Date(),90)), active:true,
    });
  }
  return {
    papers,
    refData: defaultRefDataCivil(),
    enforcements: [],
    cashierReconciliations: [],
    notifications: [],
    notifySettings: { returnDueRoleId:"role_admin", priorityUnassignedRoleId:"role_admin" },
    activity: [],
  };
}

function migrateData(){
  if(!STATE.civil.refData) STATE.civil.refData = defaultRefDataCivil();
  if(!STATE.civil.refData.feeSchedule) STATE.civil.refData.feeSchedule = defaultFeeScheduleCivil();
  // Backfill anything added to the fee schedule shape after a tenant's schedule was first
  // saved: allowedServiceMethods (new field on every type) and any brand-new paper types
  // (Writ of Possession, Writ of Attachment, etc.) that a tenant provisioned before this
  // list existed. Never overwrites a value an admin already configured.
  const defaults = defaultFeeScheduleCivil();
  const sched = STATE.civil.refData.feeSchedule;
  if(sched.mileageRatePerMile===undefined) sched.mileageRatePerMile = defaults.mileageRatePerMile;
  if(sched.interestRateAnnualPercent===undefined) sched.interestRateAnnualPercent = defaults.interestRateAnnualPercent;
  if(sched.commissionRatePercent===undefined) sched.commissionRatePercent = defaults.commissionRatePercent;
  if(sched.feeWaiverApprovalThreshold===undefined) sched.feeWaiverApprovalThreshold = defaults.feeWaiverApprovalThreshold;
  if(sched.voidApprovalThreshold===undefined) sched.voidApprovalThreshold = defaults.voidApprovalThreshold;
  if(!sched.byType || typeof sched.byType!=='object') sched.byType = {};
  Object.keys(defaults.byType).forEach(type=>{
    if(!sched.byType[type]) sched.byType[type] = {...defaults.byType[type]};
    else if(!Array.isArray(sched.byType[type].allowedServiceMethods)) sched.byType[type].allowedServiceMethods = [...defaults.byType[type].allowedServiceMethods];
  });
  if(!STATE.civil.refData.paperTypes) STATE.civil.refData.paperTypes = [...PAPER_TYPES];
  else PAPER_TYPES.forEach(t=>{ if(!STATE.civil.refData.paperTypes.includes(t)) STATE.civil.refData.paperTypes.push(t); });
  // Property Seizure & Levy tracking (added after this tenant's refData was first created)
  // needs these six reference lists backfilled the same way paperTypes is above -- otherwise
  // a tenant that existed before that feature has no propertyTypes/etc. arrays at all, which
  // breaks both the admin screens for them and the levy-entry forms that read from them.
  if(!STATE.civil.refData.propertyTypes) STATE.civil.refData.propertyTypes = [...PROPERTY_TYPES];
  else PROPERTY_TYPES.forEach(t=>{ if(!STATE.civil.refData.propertyTypes.includes(t)) STATE.civil.refData.propertyTypes.push(t); });
  if(!STATE.civil.refData.propertyDisposalMethods) STATE.civil.refData.propertyDisposalMethods = [...PROPERTY_DISPOSAL_METHODS];
  else PROPERTY_DISPOSAL_METHODS.forEach(t=>{ if(!STATE.civil.refData.propertyDisposalMethods.includes(t)) STATE.civil.refData.propertyDisposalMethods.push(t); });
  if(!STATE.civil.refData.propertyStorageLocations) STATE.civil.refData.propertyStorageLocations = [...PROPERTY_STORAGE_LOCATIONS];
  else PROPERTY_STORAGE_LOCATIONS.forEach(t=>{ if(!STATE.civil.refData.propertyStorageLocations.includes(t)) STATE.civil.refData.propertyStorageLocations.push(t); });
  if(!STATE.civil.refData.propertySeizureStatuses) STATE.civil.refData.propertySeizureStatuses = [...PROPERTY_SEIZURE_STATUSES];
  else PROPERTY_SEIZURE_STATUSES.forEach(t=>{ if(!STATE.civil.refData.propertySeizureStatuses.includes(t)) STATE.civil.refData.propertySeizureStatuses.push(t); });
  if(!STATE.civil.refData.realPropertyTypes) STATE.civil.refData.realPropertyTypes = [...REAL_PROPERTY_TYPES];
  else REAL_PROPERTY_TYPES.forEach(t=>{ if(!STATE.civil.refData.realPropertyTypes.includes(t)) STATE.civil.refData.realPropertyTypes.push(t); });
  if(!STATE.civil.refData.realPropertyLevyStatuses) STATE.civil.refData.realPropertyLevyStatuses = [...REAL_PROPERTY_LEVY_STATUSES];
  else REAL_PROPERTY_LEVY_STATUSES.forEach(t=>{ if(!STATE.civil.refData.realPropertyLevyStatuses.includes(t)) STATE.civil.refData.realPropertyLevyStatuses.push(t); });
  if(!STATE.civil.refData.feeCategoryGLCodes) STATE.civil.refData.feeCategoryGLCodes = {};
  if(!STATE.civil.refData.paymentMethodGLCodes) STATE.civil.refData.paymentMethodGLCodes = {};
  if(!STATE.civil.notifications) STATE.civil.notifications = [];
  if(!STATE.civil.notifySettings) STATE.civil.notifySettings = { returnDueRoleId: STATE.roles[0].id, priorityUnassignedRoleId: STATE.roles[0].id };
  if(!STATE.civil.enforcements) STATE.civil.enforcements = [];
  if(!STATE.civil.cashierReconciliations) STATE.civil.cashierReconciliations = [];
  STATE.civil.papers.forEach(p=>{
    if(!p.fieldHistory) p.fieldHistory = [];
    if(!p.attempts) p.attempts = [];
    if(!p.serviceAddresses) p.serviceAddresses = [];
    if(!p.feeLineItems) p.feeLineItems = [];
    if(!p.feePayments) p.feePayments = [];
    if(!p.deposits) p.deposits = [];
    if(!p.generatedDocuments) p.generatedDocuments = [];
    if(!p.attachedDocuments) p.attachedDocuments = [];
    if(!p.photos) p.photos = [];
    if(!p.safetyFlags) p.safetyFlags = [];
    if(!p.additionalPlaintiffs) p.additionalPlaintiffs = [];
    if(!p.additionalDefendants) p.additionalDefendants = [];
    if(!p.witnesses) p.witnesses = [];
    if(p.mileage===undefined) p.mileage = 0;
  });
}

function logActivity(text, entityType, entityId){
  STATE.civil.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('Civil', text, entityType);
}

function paperFor(id){ return STATE.civil.papers.find(p=>p.id===id); }
// Full fee reconciliation per paper: itemized owed, itemized received (with method/reference/who
// processed it), and a computed remaining balance -- fee waivers count as "recovered" since they
// are a documented, authorized resolution of the fee, not an outstanding debt.
function feeTotalOwed(p){ return (p.feeLineItems||[]).filter(f=>!f.voided).reduce((s,f)=>s+f.amount,0); }
function feeTotalReceived(p){ return (p.feePayments||[]).filter(pay=>!pay.voided).reduce((s,pay)=>s+pay.amount,0); }
function feeBalance(p){ return feeTotalOwed(p) - feeTotalReceived(p); }
function depositTotal(p){ return (p.deposits||[]).filter(d=>!d.voided).reduce((s,d)=>s+d.amount,0); }
function depositAppliedTotal(p){ return (p.feePayments||[]).filter(pay=>!pay.voided && pay.method==='Applied from Deposit').reduce((s,pay)=>s+pay.amount,0); }
function depositBalance(p){ return depositTotal(p) - depositAppliedTotal(p); }
function feeReconciliationStatus(p){
  const owed = feeTotalOwed(p), balance = feeBalance(p);
  if(owed===0) return "N/A";
  if(balance<=0) return (p.feePayments||[]).some(pay=>pay.method==='Fee Waiver') && (p.feePayments||[]).every(pay=>pay.method==='Fee Waiver') ? "Waived" : "Paid in Full";
  if(feeTotalReceived(p)>0) return "Partial";
  return "Outstanding";
}
function feeStatusBadgeClass(status){
  return {"Paid in Full":"badge-available","Waived":"badge-role","Partial":"badge-assigned","Outstanding":"badge-missing","N/A":"badge-role"}[status] || "badge-role";
}
// money() (shared, global) rounds to whole dollars, which is fine for flat fees but silently
// truncates real cents on a mileage-rate fee (e.g. 14mi @ $0.67 = $9.38). Fee amounts in this
// module can now carry cents, so anywhere a dollar figure is actually money owed or paid uses
// this instead.
function moneyPrecise(n){
  const num = Number(n);
  return "$"+num.toLocaleString(undefined, {minimumFractionDigits: Number.isInteger(num)?0:2, maximumFractionDigits:2});
}
function enforcementFor(paperId){ return STATE.civil.enforcements.find(e=>e.paperId===paperId); }
// Simple (not compounded) interest, the common statutory default and the safer assumption to
// build in without a specific state's compounding rule in front of us -- the per-case rate is
// still editable, since a judgment can specify its own rate that overrides the agency default.
function interestAccrued(e, asOfDateStr){
  const asOf = asOfDateStr || fmt(new Date());
  const days = Math.max(0, daysBetween(e.judgmentDate, asOf));
  return Math.round(e.judgmentAmount * (e.interestRateAnnualPercent/100) * (days/365) * 100) / 100;
}
function enforcementTotalOwed(e){ return e.judgmentAmount + (e.costsAwarded||0) + interestAccrued(e); }
function enforcementTotalCollected(e){
  const fromCredits = (e.creditsAndPayments||[]).reduce((s,c)=>s+c.amount,0);
  const fromProperty = (e.leviedProperty||[]).filter(lp=>lp.disbursed && lp.salePrice).reduce((s,lp)=>s+lp.salePrice,0);
  const fromRealProperty = (e.realPropertyLevies||[]).filter(rp=>rp.disbursed && rp.salePrice).reduce((s,rp)=>s+rp.salePrice,0);
  return fromCredits + fromProperty + fromRealProperty;
}
function enforcementBalance(e){ return Math.round((enforcementTotalOwed(e) - enforcementTotalCollected(e))*100)/100; }
function enforcementTotalDisbursed(e){ return (e.disbursements||[]).reduce((s,d)=>s+d.amount,0); }
// Trust balance: funds already collected on this writ that haven't been paid out yet -- this is
// money the agency is currently holding in trust, awaiting disbursement to the creditor (or
// wherever else it's due), not money still owed by the debtor. Distinct from enforcementBalance,
// which is about what's still owed, not what's already collected but not yet disbursed.
function enforcementTrustBalance(e){ return Math.round((enforcementTotalCollected(e) - enforcementTotalDisbursed(e))*100)/100; }
function enforcementCommissionAmount(e){
  const rate = (e.commissionRatePercent ?? STATE.civil.refData.feeSchedule.commissionRatePercent ?? 0);
  return Math.round(enforcementTotalCollected(e) * (rate/100) * 100) / 100;
}
// Storage cost owed on a piece of levied personal property so far: per-day rate times days held,
// counting from seizure to disposal (or today, if still in custody). Stops accruing the day
// property is actually disposed of, rather than continuing to run up cost after the fact.
function leviedPropertyStorageCostAccrued(lp){
  if(!lp.seizedDate || !lp.storageCostPerDay) return 0;
  const through = lp.disposalDate || lp.saleDate || lp.releasedDate || fmt(new Date());
  const days = Math.max(0, daysBetween(lp.seizedDate, through));
  return Math.round(days * lp.storageCostPerDay * 100) / 100;
}

function recordFieldChangeCivil(entity, field, oldVal, newVal){
  if(JSON.stringify(oldVal)===JSON.stringify(newVal)) return;
  entity.fieldHistory.push({
    date: fmt(new Date()), field, before: oldVal, after: newVal,
    changedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System',
  });
}
function daysSinceReceived(p){ return daysBetween(p.receivedDate, fmt(new Date())); }
function stageColor(stage){
  return {"Unassigned":"var(--text-dim)","Assigned":"var(--blue)","Attempting":"var(--gold)","Served":"var(--green)","Unable to Serve":"var(--red)","Returned to Court":"#8B5CF6","Cancelled":"var(--text-dim)"}[stage] || "var(--text-dim)";
}

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  {id:"civil-dashboard",label:"Dashboard",icon:"scale",title:"Civil Process",sub:"Service assignments, court deadlines, lookup, and administration",requiredAbility:null},
  {id:"civil-board", label:"Service Board", icon:"scale", title:"Civil Process Service Board", sub:"Drag papers through intake, assignment, attempts, and return to court", requiredAbility:"civil_paper_view_all"},
  {id:"civil-mine", label:"My Assignments", icon:"clipboardcheck", title:"My Assignments", sub:"Papers assigned to you, with attempt logging and Return of Service generation", requiredAbility:"civil_paper_view_own"},
  {id:"civil-calendar", label:"Master Calendar", icon:"dashboard", title:"Civil Process Master Calendar", sub:"Every return-by deadline across the unit, by case", requiredAbility:"civil_paper_view_all"},
  {id:"civil-lookup", label:"Party & Address Lookup", icon:"search", title:"Party & Address Lookup", sub:"Search every case a name or address has ever appeared in, including safety history", requiredAbility:"civil_paper_view_all"},
  {id:"civil-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Fee collection and service performance across the unit", requiredAbility:"civil_reports_view"},
  {id:"civil-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Courts, paper types, and the system audit log", requiredAbility:["civil_admin_categories","civil_admin_audit"]},
];
let ACTIVE_VIEW = "civil-board";

function navItemVisible(item){
  if(!can('module_civil')) return false;
  if(!item) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}
function renderNav(){
  const nav = document.getElementById('navlist');
  const visibleItems = NAV_ITEMS.filter(navItemVisible);
  if(!visibleItems.find(it=>it.id===ACTIVE_VIEW) && visibleItems.length) ACTIVE_VIEW = visibleItems[0].id;
  nav.innerHTML = visibleItems.map(item=>`
    <button class="navitem ${item.id===ACTIVE_VIEW?'active':''}" data-nav="${item.id}">
      ${ICONS[item.icon]}<span>${item.label}</span>
    </button>
  `).join('');
  nav.querySelectorAll('[data-nav]').forEach(btn=>{
    btn.addEventListener('click', ()=> switchView(btn.dataset.nav));
  });
}
function switchView(id){
  const target = NAV_ITEMS.find(n=>n.id===id);
  if(!target || !navItemVisible(target)) return;
  if(!SuiteUX.beforeView(id)) return;
  ACTIVE_VIEW = id;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  const meta = NAV_ITEMS.find(n=>n.id===id);
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-sub').textContent = meta.sub;
  renderNav();
  renderView(id);
}
function renderView(id){
  if(id==='civil-dashboard'){
    const root=document.getElementById('view-civil-dashboard');root.innerHTML='';SuiteUX.renderModuleHub(root,'civil','civil-dashboard');
  }
  else if(id==="civil-board") renderBoard();
  else if(id==="civil-mine") renderMyAssignments();
  else if(id==="civil-calendar") renderMasterCalendarCivil();
  else if(id==="civil-lookup") renderPartyLookup();
  else if(id==="civil-reports") renderReports();
  else if(id==="civil-admin") renderAdmin();
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  STATE.civil.papers.filter(p=>!['Returned to Court','Cancelled'].includes(p.stage)).forEach(p=>{
    const days = daysBetween(fmt(today), p.returnByDate);
    if(days<=3) upcoming.push({type:"return_due", entityId:p.id, message:`${p.caseNumber} (${p.paperType}) ${days<0?'is past its return-by date by '+Math.abs(days)+' days':'must be returned to court in '+days+' day(s)'} (${p.returnByDate}).`, recipientRoleId: STATE.civil.notifySettings.returnDueRoleId});
    if(p.priority==='Immediate' && p.stage==='Unassigned') upcoming.push({type:"priority_unassigned", entityId:p.id, message:`${p.caseNumber} is an Order of Protection / Injunction and is still unassigned \u2014 these require immediate service.`, recipientRoleId: STATE.civil.notifySettings.priorityUnassignedRoleId});
  });
  const prevReadBy = {};
  STATE.civil.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.civil.notifications = upcoming.map(n=>({
    id: n.type+'_'+n.entityId, ts: fmt(today),
    type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
    readBy: prevReadBy[n.type+'|'+n.entityId] || [],
  }));
}

function lockedNote(msg){ return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`; }
function permissionBlockedView(msg){
  return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
}

/* =========================================================================
   SERVICE BOARD (kanban -- the primary Civil Process workflow view)
   ========================================================================= */
const BOARD_STAGES = ["Unassigned","Assigned","Attempting","Served","Unable to Serve","Returned to Court"];
let BOARD_FILTER = {q:"", paperType:"All", court:"All"};

function renderBoard(){
  if(!can('civil_paper_view_all')){
    document.getElementById('view-civil-board').innerHTML = permissionBlockedView("You don't have permission to view the full service board in this role. Try My Assignments instead.");
    return;
  }
  const canIntake = can('civil_paper_intake');
  const f = BOARD_FILTER;
  let papers = STATE.civil.papers.filter(p=>{
    const q = f.q.toLowerCase();
    const matchQ = !q || p.caseNumber.toLowerCase().includes(q) || p.defendant.toLowerCase().includes(q) || p.plaintiff.toLowerCase().includes(q);
    const matchType = f.paperType==="All" || p.paperType===f.paperType;
    const matchCourt = f.court==="All" || p.courtOfOrigin===f.court;
    return matchQ && matchType && matchCourt && p.stage!=='Cancelled';
  });

  const unassignedCount = STATE.civil.papers.filter(p=>p.stage==='Unassigned').length;
  const priorityUnassigned = STATE.civil.papers.filter(p=>p.stage==='Unassigned' && p.priority==='Immediate').length;
  const overdueCount = STATE.civil.papers.filter(p=>!['Returned to Court','Cancelled'].includes(p.stage) && daysBetween(fmt(new Date()),p.returnByDate)<0).length;
  const servedThisWeek = STATE.civil.papers.filter(p=>p.servedDate && p.servedDate >= suiteWeekStart() && p.servedDate <= fmt(new Date())).length;

  document.getElementById('view-civil-board').innerHTML = `
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="label">Unassigned</div><div class="value" style="color:${unassignedCount?'var(--red)':'var(--heading)'}">${unassignedCount}</div><div class="delta ${priorityUnassigned?'warn':'neutral'}">${priorityUnassigned} priority (protective orders)</div></div>
      <div class="stat-card"><div class="label">Past Return-By Date</div><div class="value" style="color:${overdueCount?'var(--red)':'var(--heading)'}">${overdueCount}</div></div>
      <div class="stat-card"><div class="label">Served This Week</div><div class="value">${servedThisWeek}</div></div>
      <div class="stat-card"><div class="label">Total Active Papers</div><div class="value">${STATE.civil.papers.filter(p=>!['Returned to Court','Cancelled'].includes(p.stage)).length}</div></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="boardSearch" title="Filters the board below as you type, matching case number, plaintiff, or defendant" placeholder="Search case #, plaintiff, or defendant..." style="width:260px;" value="${escapeHtml(f.q)}">
        <select id="boardTypeFilter" title="Filter to a single paper type"><option>All</option>${STATE.civil.refData.paperTypes.map(t=>`<option ${f.paperType===t?'selected':''}>${t}</option>`).join('')}</select>
        <select id="boardCourtFilter" title="Filter to a single court of origin"><option>All</option>${STATE.civil.refData.courtsOfOrigin.map(t=>`<option ${f.court===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      ${canIntake ? `<button class="btn btn-primary" id="btnIntakePaper">${ICONS.plus} Intake New Paper</button>` : ''}
    </div>
    <div class="civil-board-scroll">
      <div class="civil-board">
        ${BOARD_STAGES.map(stage=>{
          const stagePapers = papers.filter(p=>p.stage===stage);
          return `
          <div class="civil-column" data-stage-col="${stage}">
            <div class="civil-column-head" style="border-top-color:${stageColor(stage)};">
              <span>${stage}</span><span class="civil-column-count">${stagePapers.length}</span>
            </div>
            <div class="civil-column-body" data-stage-dropzone="${stage}">
              ${stagePapers.map(p=>renderPaperCard(p)).join('') || `<div class="civil-column-empty">No papers</div>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
  document.getElementById('boardSearch').addEventListener('input', e=>{ BOARD_FILTER.q=e.target.value; renderBoard(); refocusFilterInput('boardSearch'); });
  document.getElementById('boardTypeFilter').addEventListener('change', e=>{ BOARD_FILTER.paperType=e.target.value; renderBoard(); });
  document.getElementById('boardCourtFilter').addEventListener('change', e=>{ BOARD_FILTER.court=e.target.value; renderBoard(); });
  const intakeBtn = document.getElementById('btnIntakePaper');
  if(intakeBtn) intakeBtn.addEventListener('click', ()=>openIntakeModal());
  wireBoardCards();
  wireBoardDragDrop();
}

function renderPaperCard(p){
  const days = daysSinceReceived(p);
  const overdue = !['Returned to Court','Cancelled'].includes(p.stage) && daysBetween(fmt(new Date()),p.returnByDate)<0;
  const balance = feeBalance(p);
  const hasActiveSafety = (p.safetyFlags||[]).some(f=>f.active && (!f.expiresDate || f.expiresDate>=fmt(new Date())));
  return `
    <div class="civil-card ${p.priority==='Immediate'?'civil-card-priority':''}" draggable="true" data-paper-card="${p.id}" data-drag-id="${p.id}">
      <button type="button" class="civil-card-move-btn" data-move-card="${p.id}" title="Move to another stage" aria-label="Move ${escapeHtml(p.caseNumber)} to another stage" aria-haspopup="menu" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/></svg>
      </button>
      ${p.priority==='Immediate' ? `<div class="civil-card-priority-tag">PRIORITY</div>` : ''}
      <div class="civil-card-case">${escapeHtml(p.caseNumber)}</div>
      <div class="civil-card-type">${escapeHtml(p.paperType)}</div>
      ${hasActiveSafety ? `<div title="Officer safety flag on file -- open the record before contact" style="display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;color:var(--red);margin:0 0 6px;"><span style="width:12px;height:12px;display:inline-flex;flex-shrink:0;">${ICONS.alert||'\u26A0'}</span> SAFETY FLAG</div>` : ''}
      <div class="civil-card-party"><strong>Def:</strong> ${escapeHtml(p.defendant)}${(p.additionalDefendants||[]).length?` <span style="color:var(--text-dim);">+${p.additionalDefendants.length} more</span>`:''}</div>
      <div class="civil-card-meta">
        <span>${p.assignedServerId ? escapeHtml(personName(p.assignedServerId)) : 'Unassigned'}</span>
        <span style="${overdue?'color:var(--red);font-weight:700;':''}">${days}d</span>
      </div>
      ${balance>0 ? `<div class="civil-card-fee">${ICONS.dollar} ${moneyPrecise(balance)} due</div>` : ''}
    </div>
  `;
}

function wireBoardCards(){
  document.querySelectorAll('[data-paper-card]').forEach(el=>{
    el.addEventListener('click', (ev)=>{ if(!el.dataset.justDragged) openPaperDetail(el.dataset.paperCard); });
  });
  // A single shared floating menu, appended to <body> and positioned with `fixed` coordinates
  // computed from the clicked button's actual on-screen position. Kanban columns scroll their
  // own card list (.civil-column-body{overflow-y:auto}), and a menu living *inside* a card would
  // get clipped the moment it needed to extend past that column's visible edge -- which is
  // exactly what was happening. A `fixed`-position portal at the body level is never subject to
  // any ancestor's overflow, so it always renders in full regardless of where the card sits.
  let moveMenu = document.getElementById('civilMoveMenuPortal');
  if(!moveMenu){
    moveMenu = document.createElement('div');
    moveMenu.className = 'civil-move-menu';
    moveMenu.id = 'civilMoveMenuPortal';
    moveMenu.setAttribute('role','menu');
    moveMenu.hidden = true;
    document.body.appendChild(moveMenu);
  }
  function closeMoveMenu(){
    moveMenu.hidden = true;
    document.querySelectorAll('.civil-card-move-btn[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));
  }
  document.querySelectorAll('[data-move-card]').forEach(btn=>{
    btn.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      const id = btn.dataset.moveCard;
      const wasOpenForThisButton = !moveMenu.hidden && moveMenu.dataset.forId === id;
      closeMoveMenu();
      if(wasOpenForThisButton) return;
      const p = paperFor(id);
      moveMenu.dataset.forId = id;
      moveMenu.innerHTML = BOARD_STAGES.filter(s=>s!==p.stage).map(s=>`<button type="button" role="menuitem" data-move-to="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('');
      moveMenu.querySelectorAll('[data-move-to]').forEach(opt=>{
        opt.addEventListener('click', (e)=>{
          e.stopPropagation();
          closeMoveMenu();
          handleStageDrop(p, opt.dataset.moveTo);
        });
      });
      // Position after content is set, so offsetHeight reflects the real menu size.
      moveMenu.hidden = false;
      const r = btn.getBoundingClientRect();
      const menuW = moveMenu.offsetWidth, menuH = moveMenu.offsetHeight;
      let left = r.right - menuW, top = r.bottom + 4;
      if(left < 8) left = 8;
      if(left + menuW > window.innerWidth - 8) left = window.innerWidth - menuW - 8;
      if(top + menuH > window.innerHeight - 8) top = r.top - menuH - 4; // flip above the button if there's no room below
      if(top < 8) top = 8;
      moveMenu.style.left = left+'px';
      moveMenu.style.top = top+'px';
      btn.setAttribute('aria-expanded','true');
    });
  });
  if(!document.documentElement.dataset.civilMoveMenuBound){
    document.documentElement.dataset.civilMoveMenuBound = 'true';
    document.addEventListener('click', (ev)=>{
      if(ev.target.closest('.civil-card-move-btn') || ev.target.closest('.civil-move-menu')) return;
      const m = document.getElementById('civilMoveMenuPortal');
      if(m){ m.hidden = true; document.querySelectorAll('.civil-card-move-btn[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false')); }
    });
    // Also close on scroll of the board column itself, since a `fixed` menu would otherwise
    // stay visually anchored to the wrong spot as the card it belongs to scrolls away underneath it.
    document.addEventListener('scroll', (ev)=>{
      if(ev.target.classList && ev.target.classList.contains('civil-column-body')){
        const m = document.getElementById('civilMoveMenuPortal');
        if(m){ m.hidden = true; document.querySelectorAll('.civil-card-move-btn[aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false')); }
      }
    }, true);
  }
}

function wireBoardDragDrop(){
  let draggedId = null;
  document.querySelectorAll('[data-drag-id]').forEach(card=>{
    card.addEventListener('dragstart', (ev)=>{ draggedId = card.dataset.dragId; ev.dataTransfer.effectAllowed = 'move'; setTimeout(()=>card.classList.add('dragging'),0); });
    card.addEventListener('dragend', ()=>{ card.classList.remove('dragging'); });
  });
  document.querySelectorAll('[data-stage-dropzone]').forEach(zone=>{
    zone.addEventListener('dragover', (ev)=>{ ev.preventDefault(); zone.classList.add('civil-dropzone-active'); });
    zone.addEventListener('dragleave', ()=>{ zone.classList.remove('civil-dropzone-active'); });
    zone.addEventListener('drop', (ev)=>{
      ev.preventDefault();
      zone.classList.remove('civil-dropzone-active');
      const newStage = zone.dataset.stageDropzone;
      if(!draggedId) return;
      const p = paperFor(draggedId);
      if(!p || p.stage===newStage) return;
      handleStageDrop(p, newStage);
    });
  });
}

function handleStageDrop(p, newStage){
  if(!can('civil_paper_log_attempt') && !can('civil_paper_intake')){ toast("You don't have permission to move papers.", true); renderBoard(); return; }
  if(newStage==='Served'){
    openMarkServedModal(p.id);
    return;
  }
  if(newStage==='Assigned' && !p.assignedServerId){
    openAssignServerModal(p.id);
    return;
  }
  if(newStage==='Unable to Serve'){
    openUnableToServeModal(p.id);
    return;
  }
  if(newStage==='Returned to Court'){
    p.returnFiledDate = fmt(new Date());
  }
  recordFieldChangeCivil(p, 'stage', p.stage, newStage);
  p.stage = newStage;
  logActivity(`Moved ${p.caseNumber} to "${newStage}".`, "civil_paper", p.id);
  persist();
  toast(`Moved to "${newStage}".`);
  renderBoard();
}

function openAssignServerModal(paperId){
  const p = paperFor(paperId);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Assign Server \u2014 ${escapeHtml(p.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Assign To</label><select id="fAssignServer">${STATE.personnel.map(person=>`<option value="${person.id}" ${p.assignedServerId===person.id?'selected':''}>${escapeHtml(person.name)}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Assign</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>{ closeModal(); renderBoard(); };
  document.getElementById('mCancel').onclick = ()=>{ closeModal(); renderBoard(); };
  document.getElementById('mSave').onclick = ()=>{
    const nextServerId = document.getElementById('fAssignServer').value;
    recordFieldChangeCivil(p, 'assignedServerId', p.assignedServerId, nextServerId);
    p.assignedServerId = nextServerId;
    recordFieldChangeCivil(p, 'stage', p.stage, 'Assigned');
    p.stage = 'Assigned';
    logActivity(`Assigned ${p.caseNumber} to ${personName(p.assignedServerId)}.`, "civil_paper", p.id);
    persist();
    toast("Paper assigned.");
    closeModal();
    renderBoard();
  };
}

function openUnableToServeModal(paperId){
  const p = paperFor(paperId);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Mark Unable to Serve \u2014 ${escapeHtml(p.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Reason</label><select id="fUtsReason">${STATE.civil.refData.attemptResults.filter(r=>r!=='Served').map(r=>`<option>${r}</option>`).join('')}</select></div>
      <div class="form-row"><label>Notes</label><textarea id="fUtsNotes" rows="3" placeholder="Explain what was tried and why service could not be completed."></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Confirm</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>{ closeModal(); renderBoard(); };
  document.getElementById('mCancel').onclick = ()=>{ closeModal(); renderBoard(); };
  document.getElementById('mSave').onclick = ()=>{
    const reason = document.getElementById('fUtsReason').value;
    const notes = document.getElementById('fUtsNotes').value.trim();
    p.attempts.push({id:'att'+Date.now(), date: fmt(new Date()), time: new Date().toTimeString().slice(0,5), deputyId: p.assignedServerId||CURRENT_USER_ID, result: reason, notes});
    recordFieldChangeCivil(p, 'stage', p.stage, 'Unable to Serve');
    p.stage = 'Unable to Serve';
    logActivity(`Marked ${p.caseNumber} unable to serve (${reason}).`, "civil_paper", p.id);
    persist();
    toast("Marked unable to serve.");
    closeModal();
    renderBoard();
  };
}

/* =========================================================================
   PAPER DETAIL MODAL (Overview / Attempts / Fees & Reconciliation / Documents / Change History)
   ========================================================================= */
let PAPER_DETAIL_ID = null;
let PAPER_DETAIL_TAB = 'overview';
let PAPER_ADDRESS_SELECTED = 0;
// Belt-and-suspenders alongside migrateData(): that function backfills every paper at app
// load, but a record fetched or merged in some other way (an older cached tab, a bulk import,
// a sync edge case) could still reach the detail view without every array field populated.
// Every tab in this modal assumes these arrays exist, so guarantee it right where a paper is
// actually opened, not scattered across a dozen individual render call sites.
function healPaperRecord(p){
  if(!p.serviceAddresses) p.serviceAddresses = [];
  if(!p.attempts) p.attempts = [];
  if(!p.feeLineItems) p.feeLineItems = [];
  if(!p.feePayments) p.feePayments = [];
  if(!p.generatedDocuments) p.generatedDocuments = [];
  if(!p.attachedDocuments) p.attachedDocuments = [];
  if(!p.photos) p.photos = [];
  if(!p.safetyFlags) p.safetyFlags = [];
  if(!p.fieldHistory) p.fieldHistory = [];
  if(!p.additionalPlaintiffs) p.additionalPlaintiffs = [];
  if(!p.additionalDefendants) p.additionalDefendants = [];
  if(!p.witnesses) p.witnesses = [];
  if(p.mileage===undefined) p.mileage = 0;
  return p;
}
function openPaperDetail(id){
  // A record can be re-dispatched while it is already open (for example after a confirmed
  // shared-workspace save/live refresh). In that case keep the user's current tab instead of
  // bouncing them back to Overview. A normal open from the board/calendar still starts at Overview.
  const recordViewAlreadyActive =
    PAPER_DETAIL_ID === id &&
    document.getElementById('view-record')?.classList.contains('active');
  if(!SuiteUX.openRecord("civil","paper",id)) return;
  healPaperRecord(paperFor(id));
  PAPER_DETAIL_ID = id;
  if(!recordViewAlreadyActive){
    PAPER_DETAIL_TAB = 'overview';
    PAPER_ADDRESS_SELECTED = 0;
  }
  renderPaperDetailModal();
}
// No API key required -- Google Maps' plain query-string embed geocodes a full address string
// server-side and requires no setup, unlike the JS Maps API or the "official" Embed API.
function mapEmbedSrc(address){ return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`; }

function renderPaperDetailModal(){
  const p = paperFor(PAPER_DETAIL_ID);
  if(!p){ closeModal(); return; }
  const isEnforceable = feeConfigFor(p.paperType).enforceable || !!enforcementFor(p.id);
  const tabs = [['overview','Overview'],['attempts','Attempts'],['fees','Fees & Reconciliation']];
  if(isEnforceable) tabs.push(['enforcement','Enforcement']);
  tabs.push(['photos','Photos'],['documents','Documents'],['history','Change History']);
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-xl';
  box.innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(p.caseNumber)} ${p.priority==='Immediate'?'<span class="badge badge-missing" style="margin-left:8px;">PRIORITY</span>':''}</h3>
        <div style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(p.paperType)} &bull; ${escapeHtml(p.courtOfOrigin)}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${PAPER_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-pd-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="paperDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>{ closeModal(); if(ACTIVE_VIEW==='civil-board') renderBoard(); else if(ACTIVE_VIEW==='civil-mine') renderMyAssignments(); };
  document.getElementById('mCancel').onclick = document.getElementById('mClose').onclick;
  document.querySelectorAll('[data-pd-tab]').forEach(b=>b.addEventListener('click', ()=>{ PAPER_DETAIL_TAB=b.dataset.pdTab; renderPaperDetailModal(); }));
  renderPaperDetailTabContent(p);
}

function renderPaperDetailTabContent(p){
  const body = document.getElementById('paperDetailBody');
  const canIntake = can('civil_paper_intake');
  const canManageSafety = can('civil_safety_flag_manage');
  const canLog = can('civil_paper_log_attempt');
  const canFee = can('civil_fee_manage');
  const canDoc = can('civil_document_generate');

  if(PAPER_DETAIL_TAB==='overview'){
    const activeFlags = (p.safetyFlags||[]).filter(f=>f.active && (!f.expiresDate || f.expiresDate>=fmt(new Date())));
    body.innerHTML = `
      ${canIntake ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditPaperFromDetail">${ICONS.edit} Edit</button>` : ''}
      ${activeFlags.length ? `
        <div style="border:1px solid var(--red);background:var(--red)14;border-radius:8px;padding:14px 16px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:8px;font-weight:800;color:var(--red);margin-bottom:8px;"><span style="width:18px;height:18px;flex-shrink:0;">${ICONS.alert||'\u26A0'}</span> OFFICER SAFETY \u2014 READ BEFORE CONTACT</div>
          ${activeFlags.map(f=>`
            <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--red)33;">
              <div style="font-size:12.5px;font-weight:700;color:var(--red);">${escapeHtml(f.category)}</div>
              <div style="font-size:13px;margin:3px 0;">${escapeHtml(f.text)}</div>
              <div style="font-size:11px;color:var(--text-dim);">Added by ${escapeHtml(f.addedBy)} on ${f.addedDate}${f.expiresDate?` &bull; expires ${f.expiresDate}`:''}
                ${canManageSafety ? ` &bull; <a href="#" data-clear-safety-flag="${f.id}" style="color:var(--text-dim);text-decoration:underline;">clear</a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${canManageSafety ? `<button class="btn btn-sm btn-outline" style="margin-bottom:14px;" id="btnAddSafetyFlag"><span style="display:inline-flex;width:14px;height:14px;vertical-align:-2px;">${ICONS.alert||'+'}</span> ${activeFlags.length?'Add Another Safety Flag':'Add Safety Flag'}</button>` : ''}
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Plaintiff / Petitioner</div><div class="v">${escapeHtml(p.plaintiff)}${(p.additionalPlaintiffs||[]).length?` <span class="badge badge-role">+${p.additionalPlaintiffs.length} more</span>`:''}</div></div>
        <div><div class="k">Defendant / Respondent</div><div class="v">${escapeHtml(p.defendant)}${(p.additionalDefendants||[]).length?` <span class="badge badge-role">+${p.additionalDefendants.length} more</span>`:''}</div></div>
        <div><div class="k">Attorney of Record</div><div class="v">${(p.attorneyOfRecord ? escapeHtml(p.attorneyOfRecord) : '—')}</div></div>
        <div><div class="k">Stage</div><div class="v"><span class="badge" style="background:${stageColor(p.stage)}22;color:${stageColor(p.stage)};">${p.stage}</span></div></div>
        <div><div class="k">Assigned Server</div><div class="v">${p.assignedServerId ? escapeHtml(personName(p.assignedServerId)) : 'Unassigned'}</div></div>
        <div><div class="k">Received</div><div class="v">${p.receivedDate}</div></div>
        <div><div class="k">Return By</div><div class="v">${p.returnByDate}</div></div>
        <div><div class="k">Service Method</div><div class="v">${escapeHtml(p.serviceMethod||'Not yet determined')}</div></div>
        ${p.servedDate ? `<div><div class="k">Served</div><div class="v">${p.servedDate} ${p.servedTime||''}${p.servedOnName?' on '+escapeHtml(p.servedOnName):''}</div></div>` : ''}
      </div>
      ${(()=>{
        const siblings = STATE.civil.papers.filter(x=>x.id!==p.id && x.caseNumber.trim().toLowerCase()===p.caseNumber.trim().toLowerCase());
        if(!siblings.length) return '';
        return `<div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Other Papers on Case ${escapeHtml(p.caseNumber)}</h2><span class="hint">${siblings.length} other${siblings.length===1?'':'s'}</span></div>
          <div class="panel-body" style="padding:0;"><table><thead><tr><th>Paper Type</th><th>Stage</th><th>Received</th><th></th></tr></thead><tbody>
          ${siblings.map(s=>`<tr>
            <td>${escapeHtml(s.paperType)}</td>
            <td><span class="badge" style="background:${stageColor(s.stage)}22;color:${stageColor(s.stage)};">${s.stage}</span></td>
            <td>${s.receivedDate}</td>
            <td><button class="btn btn-sm btn-outline" data-open-sibling="${s.id}">Open</button></td>
          </tr>`).join('')}
          </tbody></table></div>
        </div>`;
      })()}
      ${((p.additionalPlaintiffs||[]).length || (p.additionalDefendants||[]).length || (p.witnesses||[]).length) ? `
      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>All Named Parties</h2></div>
        <div class="panel-body">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div style="flex:1;min-width:180px;">
              <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Plaintiffs / Petitioners</div>
              <div style="font-size:13px;">${escapeHtml(p.plaintiff)} <span class="badge badge-role">Primary</span></div>
              ${(p.additionalPlaintiffs||[]).map(x=>`<div style="font-size:13px;margin-top:4px;">${escapeHtml(x.name)}</div>`).join('')}
            </div>
            <div style="flex:1;min-width:180px;">
              <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Defendants / Respondents</div>
              <div style="font-size:13px;">${escapeHtml(p.defendant)} <span class="badge badge-role">Primary</span></div>
              ${(p.additionalDefendants||[]).map(x=>`<div style="font-size:13px;margin-top:4px;">${escapeHtml(x.name)}</div>`).join('')}
            </div>
            ${(p.witnesses||[]).length ? `<div style="flex:1;min-width:180px;">
              <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:6px;">Witnesses</div>
              ${p.witnesses.map(x=>`<div style="font-size:13px;margin-top:4px;">${escapeHtml(x.name)}</div>`).join('')}
            </div>` : ''}
          </div>
        </div>
      </div>` : ''}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Service Address(es)</h2>${canIntake ? `<button class="btn btn-sm btn-outline" id="btnAddAddress">${ICONS.plus} Add Address</button>` : ''}</div>
        <div class="panel-body">
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:6px;">
              ${(p.serviceAddresses||[]).map((a,ai)=>`
                <button class="civil-address-chip ${ai===PAPER_ADDRESS_SELECTED?'active':''}" data-address-idx="${ai}">
                  ${ICONS.mappin}<span>${escapeHtml(a.address)}</span>${a.isPrimary?'<span class="badge badge-role" style="margin-left:auto;">Primary</span>':''}
                </button>
              `).join('') || `<div style="font-size:12.5px;color:var(--text-dim);">No service address on file.</div>`}
            </div>
            <div style="flex:2;min-width:280px;">
              ${(p.serviceAddresses||[]).length ? `<iframe id="paperAddressMap" src="${mapEmbedSrc((p.serviceAddresses[PAPER_ADDRESS_SELECTED] || p.serviceAddresses[0]).address)}" style="width:100%;height:260px;border:0;border-radius:8px;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    document.querySelectorAll('[data-address-idx]').forEach(btn=>btn.addEventListener('click', ()=>{
      PAPER_ADDRESS_SELECTED = Number(btn.dataset.addressIdx);
      document.querySelectorAll('[data-address-idx]').forEach(b=>b.classList.toggle('active', Number(b.dataset.addressIdx)===PAPER_ADDRESS_SELECTED));
      const frame = document.getElementById('paperAddressMap');
      if(frame && p.serviceAddresses[PAPER_ADDRESS_SELECTED]) frame.src = mapEmbedSrc(p.serviceAddresses[PAPER_ADDRESS_SELECTED].address);
    }));
    const addAddrBtn = document.getElementById('btnAddAddress');
    if(addAddrBtn) addAddrBtn.addEventListener('click', ()=>openAddAddressModal(p));
    const editBtn = document.getElementById('btnEditPaperFromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>{ closeModal(); openIntakeModal(p.id); });
    const addFlagBtn = document.getElementById('btnAddSafetyFlag');
    if(addFlagBtn) addFlagBtn.addEventListener('click', ()=>openAddSafetyFlagModal(p));
    document.querySelectorAll('[data-clear-safety-flag]').forEach(a=>a.addEventListener('click', (ev)=>{
      ev.preventDefault();
      const flag = (p.safetyFlags||[]).find(f=>f.id===a.dataset.clearSafetyFlag);
      if(!flag) return;
      if(!confirm('Clear this safety flag? This removes the active warning from the record (it stays in Change History).')) return;
      flag.active = false;
      recordFieldChangeCivil(p, 'Safety Flag', flag.text, 'Cleared');
      logActivity(`Cleared safety flag on ${p.caseNumber}: "${flag.category}".`, "civil_paper", p.id);
      persist();
      renderPaperDetailTabContent(p);
    }));
    document.querySelectorAll('[data-open-sibling]').forEach(btn=>btn.addEventListener('click', ()=>openPaperDetail(btn.dataset.openSibling)));

  } else if(PAPER_DETAIL_TAB==='attempts'){
    const rows = p.attempts.slice().reverse().map(a=>`
      <tr><td>${a.date} ${a.time}</td><td>${escapeHtml(personName(a.deputyId))}</td>
      <td><span class="badge ${a.result==='Served'?'badge-available':'badge-missing'}">${escapeHtml(a.result)}</span></td>
      <td style="font-size:12.5px;">${escapeHtml(a.notes||'')}${a.mileage?`<div style="color:var(--text-dim);">${a.mileage} mi</div>`:''}${a.gps?`<div style="color:var(--text-dim);"><a href="https://www.google.com/maps?q=${a.gps.lat},${a.gps.lng}" target="_blank" rel="noopener">${a.gps.lat.toFixed(5)}, ${a.gps.lng.toFixed(5)}</a></div>`:''}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No service attempts logged yet.</td></tr>`;
    body.innerHTML = `
      ${canLog ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnLogAttempt">${ICONS.plus} Log Attempt</button>` : ''}
      <table><thead><tr><th>Date / Time</th><th>Deputy</th><th>Result</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const logBtn = document.getElementById('btnLogAttempt');
    if(logBtn) logBtn.addEventListener('click', ()=>openLogAttemptModal(p.id));

  } else if(PAPER_DETAIL_TAB==='fees'){
    const owed = feeTotalOwed(p), received = feeTotalReceived(p), balance = feeBalance(p);
    const depTotal = depositTotal(p), depApplied = depositAppliedTotal(p), depAvailable = depositBalance(p);
    const status = feeReconciliationStatus(p);
    const glCodes = STATE.civil.refData.feeCategoryGLCodes||{};
    const payGlCodes = STATE.civil.refData.paymentMethodGLCodes||{};
    body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:16px;">
        <div><div class="k">Total Fees Owed</div><div class="v" style="font-size:17px;">${moneyPrecise(owed)}</div></div>
        <div><div class="k">Total Received</div><div class="v" style="font-size:17px;color:var(--green);">${moneyPrecise(received)}</div></div>
        <div><div class="k">Remaining Balance</div><div class="v" style="font-size:17px;font-weight:800;color:${balance>0?'var(--red)':'var(--green)'};">${moneyPrecise(balance)}</div></div>
        <div><div class="k">Reconciliation Status</div><div class="v"><span class="badge ${feeStatusBadgeClass(status)}">${status}</span></div></div>
      </div>
      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Deposits &amp; Retainers</h2>${canFee ? `<button class="btn btn-sm btn-outline" id="btnAddDeposit">${ICONS.plus} Record Deposit</button>` : ''}</div>
        <div class="panel-body">
          <div class="detail-grid" style="margin-bottom:${(p.deposits||[]).length?'14px':'0'};">
            <div><div class="k">Total Deposited</div><div class="v">${moneyPrecise(depTotal)}</div></div>
            <div><div class="k">Applied to Fees</div><div class="v">${moneyPrecise(depApplied)}</div></div>
            <div><div class="k">Available Balance</div><div class="v" style="font-weight:800;color:${depAvailable>0?'var(--green)':'var(--text)'};">${moneyPrecise(depAvailable)}</div>${depAvailable>0 && canFee ? `<button class="btn btn-sm btn-outline" id="btnApplyDeposit" style="margin-top:6px;">Apply to Fees</button>` : ''}</div>
          </div>
          ${(p.deposits||[]).length ? `<table><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference #</th><th>Notes</th><th></th></tr></thead><tbody>
            ${p.deposits.map((d,di)=>`<tr style="${d.voided?'opacity:0.5;':''}"><td>${d.date}</td><td>${moneyPrecise(d.amount)}</td><td><span class="badge badge-role">${escapeHtml(d.method)}</span></td>
              <td class="mono" style="font-size:11.5px;">${d.referenceNumber?escapeHtml(d.referenceNumber):'—'}</td>
              <td style="font-size:12px;">${d.voided?`<strong>VOIDED:</strong> ${escapeHtml(d.voidReason||'')}`:escapeHtml(d.notes||'')}</td>
              <td>${(canFee && !d.voided)?`<button class="btn-icon" data-void-deposit="${di}" title="Void">${ICONS.trash}</button>`:''}</td></tr>`).join('')}
            </tbody></table>` : ''}
        </div>
      </div>
      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Fees Owed (Itemized)</h2>${canFee ? `<button class="btn btn-sm btn-outline" id="btnAddFeeLine">${ICONS.plus} Add Fee Line</button>` : ''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Description</th><th>Category</th><th>GL Code</th><th>Amount</th><th></th></tr></thead><tbody>
        ${p.feeLineItems.map((f,fi)=>`<tr style="${f.voided?'opacity:0.5;':''}"><td>${escapeHtml(f.description)}${f.voided?` <strong style="color:var(--red);">(VOIDED: ${escapeHtml(f.voidReason||'')})</strong>`:''}</td><td>${escapeHtml(f.category)}</td><td class="mono" style="font-size:11.5px;">${glCodes[f.category]?escapeHtml(glCodes[f.category]):'—'}</td><td>${moneyPrecise(f.amount)}</td>
          <td>${(canFee && !f.voided)?`<button class="btn-icon" data-void-fee="${fi}" title="Void">${ICONS.trash}</button>`:''}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:14px;">No fees logged yet.</td></tr>`}
        </tbody></table></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Payments &amp; Recovery Method</h2>${canFee ? `<button class="btn btn-sm btn-primary" id="btnAddPayment">${ICONS.plus} Record Payment</button>` : ''}</div>
        <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>GL Code</th><th>Reference #</th><th>Received By</th><th>Notes</th><th></th></tr></thead><tbody>
        ${p.feePayments.map((pay,pi)=>`<tr style="${pay.voided?'opacity:0.5;':''}"><td>${pay.date}</td><td>${moneyPrecise(pay.amount)}</td><td><span class="badge badge-role">${escapeHtml(pay.method)}</span></td><td class="mono" style="font-size:11.5px;">${payGlCodes[pay.method]?escapeHtml(payGlCodes[pay.method]):'—'}</td><td class="mono" style="font-size:11.5px;">${(pay.referenceNumber ? escapeHtml(pay.referenceNumber) : '—')}</td><td>${escapeHtml(pay.receivedBy)}</td><td style="font-size:12px;">${pay.voided?`<strong style="color:var(--red);">VOIDED: ${escapeHtml(pay.voidReason||'')}</strong>`:escapeHtml(pay.notes||'')}</td>
          <td>${(canFee && !pay.voided)?`<button class="btn-icon" data-void-payment="${pi}" title="Void">${ICONS.trash}</button>`:''}</td></tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:14px;">No payments recorded yet.</td></tr>`}
        </tbody></table></div>
      </div>
    `;
    const addFeeBtn = document.getElementById('btnAddFeeLine');
    if(addFeeBtn) addFeeBtn.addEventListener('click', ()=>openAddFeeLineModal(p));
    const addPayBtn = document.getElementById('btnAddPayment');
    if(addPayBtn) addPayBtn.addEventListener('click', ()=>openAddPaymentModal(p));
    const addDepBtn = document.getElementById('btnAddDeposit');
    if(addDepBtn) addDepBtn.addEventListener('click', ()=>openAddDepositModal(p));
    const applyDepBtn = document.getElementById('btnApplyDeposit');
    if(applyDepBtn) applyDepBtn.addEventListener('click', ()=>openApplyDepositModal(p));
    document.querySelectorAll('[data-void-fee]').forEach(b=>b.addEventListener('click', ()=>{
      const f = p.feeLineItems[Number(b.dataset.voidFee)];
      openVoidModal('fee line', f.amount, (reason, approvedBy)=>{
        f.voided = true; f.voidReason = reason; f.voidedBy = personName(CURRENT_USER_ID); f.voidedDate = fmt(new Date()); if(approvedBy) f.voidApprovedBy = approvedBy;
        recordFieldChangeCivil(p, 'Fee Line Voided', f.description, reason);
        logActivity(`Voided fee line "${f.description}" (${moneyPrecise(f.amount)}) on ${p.caseNumber}: ${reason}`, "civil_paper", p.id);
        persist();
        PAPER_DETAIL_TAB = 'fees';
        renderPaperDetailModal();
      });
    }));
    document.querySelectorAll('[data-void-payment]').forEach(b=>b.addEventListener('click', ()=>{
      const pay = p.feePayments[Number(b.dataset.voidPayment)];
      openVoidModal('payment', pay.amount, (reason, approvedBy)=>{
        pay.voided = true; pay.voidReason = reason; pay.voidedBy = personName(CURRENT_USER_ID); pay.voidedDate = fmt(new Date()); if(approvedBy) pay.voidApprovedBy = approvedBy;
        recordFieldChangeCivil(p, 'Payment Voided', moneyPrecise(pay.amount), reason);
        logActivity(`Voided a ${moneyPrecise(pay.amount)} payment on ${p.caseNumber}: ${reason}`, "civil_paper", p.id);
        persist();
        PAPER_DETAIL_TAB = 'fees';
        renderPaperDetailModal();
      });
    }));
    document.querySelectorAll('[data-void-deposit]').forEach(b=>b.addEventListener('click', ()=>{
      const d = p.deposits[Number(b.dataset.voidDeposit)];
      openVoidModal('deposit', d.amount, (reason, approvedBy)=>{
        d.voided = true; d.voidReason = reason; d.voidedBy = personName(CURRENT_USER_ID); d.voidedDate = fmt(new Date()); if(approvedBy) d.voidApprovedBy = approvedBy;
        logActivity(`Voided a ${moneyPrecise(d.amount)} deposit on ${p.caseNumber}: ${reason}`, "civil_paper", p.id);
        persist();
        PAPER_DETAIL_TAB = 'fees';
        renderPaperDetailModal();
      });
    }));

  } else if(PAPER_DETAIL_TAB==='enforcement'){
    const canEnforce = can('civil_fee_manage');
    let e = enforcementFor(p.id);
    if(!e){
      body.innerHTML = `
        <div class="empty-state">${ICONS.scale||ICONS.dollar}<div class="msg">No enforcement record yet for this ${escapeHtml(p.paperType)}.</div>
        ${canEnforce ? `<button class="btn btn-primary btn-sm" id="btnStartEnforcement" style="margin-top:10px;">Start Enforcement Record</button>` : ''}</div>
      `;
      const startBtn = document.getElementById('btnStartEnforcement');
      if(startBtn) startBtn.addEventListener('click', ()=>{
        STATE.civil.enforcements.push({
          id:'enf'+Date.now(), paperId:p.id, judgmentAmount:0, judgmentDate: fmt(new Date()),
          interestRateAnnualPercent: STATE.civil.refData.feeSchedule.interestRateAnnualPercent, costsAwarded:0,
          creditsAndPayments:[], garnishee:null, leviedProperty:[], realPropertyLevies:[], disbursements:[],
          satisfactionStatus:'Open', satisfactionDate:null, notes:'', fieldHistory:[],
        });
        logActivity(`Started an enforcement record for ${p.caseNumber}.`, "civil_paper", p.id);
        persist();
        renderPaperDetailTabContent(p);
      });
      return;
    }
    const owed = enforcementTotalOwed(e), collected = enforcementTotalCollected(e), balance = enforcementBalance(e);
    const interest = interestAccrued(e);
    const trustBalance = enforcementTrustBalance(e);
    const commission = enforcementCommissionAmount(e);
    const g = e.garnishee;
    body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:16px;">
        <div><div class="k">Judgment Amount</div><div class="v">${moneyPrecise(e.judgmentAmount)}</div></div>
        <div><div class="k">Judgment Date</div><div class="v">${e.judgmentDate}</div></div>
        <div><div class="k">Interest Rate (annual)</div><div class="v">${e.interestRateAnnualPercent}%</div></div>
        <div><div class="k">Interest Accrued (simple, to date)</div><div class="v">${moneyPrecise(interest)}</div></div>
        <div><div class="k">Costs Awarded</div><div class="v">${moneyPrecise(e.costsAwarded||0)}</div></div>
        <div><div class="k">Total Owed</div><div class="v" style="font-weight:800;">${moneyPrecise(owed)}</div></div>
        <div><div class="k">Total Collected</div><div class="v" style="color:var(--green);">${moneyPrecise(collected)}</div></div>
        <div><div class="k">Balance Remaining (Owed by Debtor)</div><div class="v" style="font-weight:800;color:${balance>0?'var(--red)':'var(--green)'};">${moneyPrecise(Math.max(0,balance))}</div></div>
        <div><div class="k">Satisfaction Status</div><div class="v"><span class="badge ${e.satisfactionStatus==='Satisfied'?'badge-available':e.satisfactionStatus==='Returned Unsatisfied'?'badge-missing':'badge-assigned'}">${e.satisfactionStatus}</span></div></div>
      </div>
      <div class="panel" style="box-shadow:none;margin-bottom:14px;background:${trustBalance>0?'var(--callout-yellow-bg)':'transparent'};"><div class="panel-head"><h2>Trust Balance</h2></div>
        <div class="panel-body">
          <div class="detail-grid">
            <div><div class="k">Collected, Not Yet Disbursed</div><div class="v" style="font-size:17px;font-weight:800;color:${trustBalance>0?'var(--gold)':'var(--text)'};">${moneyPrecise(Math.max(0,trustBalance))}</div></div>
            <div><div class="k">Agency Commission (${e.commissionRatePercent ?? STATE.civil.refData.feeSchedule.commissionRatePercent ?? 0}% of collected)</div><div class="v">${moneyPrecise(commission)}</div>${(canEnforce && trustBalance>0) ? `<button class="btn btn-sm btn-outline" id="btnDisburseCommission" style="margin-top:6px;">Disburse Commission</button>` : ''}</div>
          </div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">This is money the agency is currently holding on this writ, collected but not yet paid out to anyone — not the same as what the debtor still owes. Record a disbursement below once funds are actually paid out (to the judgment creditor, the agency's own commission, or anyone else with a claim on it).</div>
        </div>
      </div>
      ${canEnforce ? `<button class="btn btn-sm btn-outline" id="btnEditJudgment" style="margin-bottom:16px;">${ICONS.edit} Edit Judgment Details</button>` : ''}

      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Garnishee / Employer / Bank</h2>${canEnforce ? `<button class="btn btn-sm btn-outline" id="btnEditGarnishee">${g?ICONS.edit+' Edit':ICONS.plus+' Add'}</button>` : ''}</div>
        <div class="panel-body">
          ${g ? `
            <div class="detail-grid">
              <div><div class="k">Name</div><div class="v">${escapeHtml(g.name)}</div></div>
              <div><div class="k">Type</div><div class="v">${escapeHtml(g.type)}</div></div>
              <div><div class="k">Address</div><div class="v">${escapeHtml(g.address||'')||'—'}</div></div>
              <div><div class="k">Contact</div><div class="v">${escapeHtml(g.contactPhone||'')||'—'}</div></div>
              <div><div class="k">Notice Served</div><div class="v">${g.noticeServedDate||'—'}</div></div>
              <div><div class="k">Response Received</div><div class="v">${g.responseReceivedDate||'—'}${g.responseAmount?` (${moneyPrecise(g.responseAmount)})`:''}</div></div>
            </div>
            ${g.notes ? `<div style="font-size:12px;color:var(--text-dim);margin-top:10px;">${escapeHtml(g.notes)}</div>` : ''}
          ` : `<div style="color:var(--text-dim);font-size:12.5px;">No garnishee or employer on file yet.</div>`}
        </div>
      </div>

      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Levied Property (Personal)</h2>${canEnforce ? `<button class="btn btn-sm btn-outline" id="btnAddLevy">${ICONS.plus} Add Property</button>` : ''}</div>
        <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Description</th><th>Type</th><th>Status</th><th>Est. Value</th><th>Storage</th><th>Sale / Disposal</th><th>Claims</th><th></th></tr></thead><tbody>
        ${(e.leviedProperty||[]).map((lp,li)=>{
          const claimCount = (lp.thirdPartyClaims||[]).length + (lp.exemptionClaims||[]).length;
          const openClaimCount = (lp.thirdPartyClaims||[]).filter(c=>c.status==='Pending').length + (lp.exemptionClaims||[]).filter(c=>c.status==='Pending').length;
          return `<tr>
          <td>${escapeHtml(lp.description)}${(lp.photos||[]).length?` <span style="color:var(--text-dim);font-size:11px;">${ICONS.camera||''} ${lp.photos.length}</span>`:''}</td>
          <td style="font-size:12px;">${escapeHtml(lp.propertyType||'\u2014')}</td>
          <td><span class="badge badge-role">${escapeHtml(lp.status||'\u2014')}</span></td>
          <td>${moneyPrecise(lp.estimatedValue||0)}</td>
          <td style="font-size:11.5px;">${escapeHtml(lp.storageLocation||'')||'—'}</td>
          <td style="font-size:12px;">${lp.salePrice?`Sold ${moneyPrecise(lp.salePrice)}${lp.buyerName?' \u2014 '+escapeHtml(lp.buyerName):''}`:(lp.disposalMethod?escapeHtml(lp.disposalMethod):'—')}</td>
          <td>${claimCount?`<span class="badge ${openClaimCount?'badge-missing':'badge-role'}">${claimCount}${openClaimCount?' open':''}</span>`:'—'}</td>
          <td>${canEnforce?`<button class="btn-icon" data-edit-levy="${li}">${ICONS.edit}</button>`:''}</td>
        </tr>`;}).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:14px;">No property levied on this writ.</td></tr>`}
        </tbody></table></div>
      </div>

      <div class="panel" style="box-shadow:none;margin-bottom:14px;"><div class="panel-head"><h2>Levied Real Property</h2>${canEnforce ? `<button class="btn btn-sm btn-outline" id="btnAddRealPropertyLevy">${ICONS.plus} Add Real Property</button>` : ''}</div>
        <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Address</th><th>Type</th><th>Status</th><th>Est. Value</th><th>Sale / Redemption</th><th>Claims</th><th></th></tr></thead><tbody>
        ${(e.realPropertyLevies||[]).map((rp,ri)=>{
          const claimCount = (rp.thirdPartyClaims||[]).length + (rp.exemptionClaims||[]).length;
          const openClaimCount = (rp.thirdPartyClaims||[]).filter(c=>c.status==='Pending').length + (rp.exemptionClaims||[]).filter(c=>c.status==='Pending').length;
          return `<tr>
          <td>${escapeHtml(rp.propertyAddress)}</td>
          <td style="font-size:12px;">${escapeHtml(rp.realPropertyType||'\u2014')}</td>
          <td><span class="badge badge-role">${escapeHtml(rp.status||'\u2014')}</span></td>
          <td>${moneyPrecise(rp.estimatedValue||0)}</td>
          <td style="font-size:12px;">${rp.salePrice?`Sold ${moneyPrecise(rp.salePrice)}${rp.redemptionPeriodEndDate&&!rp.redeemedDate?' \u2014 redeemable until '+rp.redemptionPeriodEndDate:''}${rp.redeemedDate?' \u2014 redeemed '+rp.redeemedDate:''}`:'—'}</td>
          <td>${claimCount?`<span class="badge ${openClaimCount?'badge-missing':'badge-role'}">${claimCount}${openClaimCount?' open':''}</span>`:'—'}</td>
          <td>${canEnforce?`<button class="btn-icon" data-edit-real-levy="${ri}">${ICONS.edit}</button>`:''}</td>
        </tr>`;}).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:14px;">No real property levied on this writ.</td></tr>`}
        </tbody></table></div>
      </div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Credits, Payments &amp; Disbursements</h2>${canEnforce ? `<div style="display:flex;gap:6px;"><button class="btn btn-sm btn-outline" id="btnAddCredit">${ICONS.plus} Credit/Payment</button><button class="btn btn-sm btn-primary" id="btnAddDisbursement">${ICONS.plus} Disbursement</button></div>` : ''}</div>
        <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Amount</th><th>Notes</th></tr></thead><tbody>
        ${[...(e.creditsAndPayments||[]).map(c=>({...c, kind:'Credit / Payment', party:c.source})), ...(e.disbursements||[]).map(d=>({...d, kind:'Disbursement', party:d.payee, amount:-d.amount}))]
          .sort((a,b)=>a.date.localeCompare(b.date))
          .map(row=>`<tr><td>${row.date}</td><td><span class="badge badge-role">${row.kind}</span></td><td>${escapeHtml(row.party||'')}</td><td style="color:${row.amount<0?'var(--red)':'var(--green)'};">${row.amount<0?'-':''}${moneyPrecise(Math.abs(row.amount))}</td><td style="font-size:12px;">${escapeHtml(row.notes||row.method||'')}</td></tr>`).join('')
          || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:14px;">No credits, payments, or disbursements recorded yet.</td></tr>`}
        </tbody></table></div>
      </div>
      ${e.notes ? `<div style="font-size:12px;color:var(--text-dim);margin-top:12px;"><strong>Enforcement Notes:</strong> ${escapeHtml(e.notes)}</div>` : ''}
    `;
    const editJBtn = document.getElementById('btnEditJudgment');
    if(editJBtn) editJBtn.addEventListener('click', ()=>openEditJudgmentModal(p, e));
    const editGBtn = document.getElementById('btnEditGarnishee');
    if(editGBtn) editGBtn.addEventListener('click', ()=>openEditGarnisheeModal(p, e));
    const addLevyBtn = document.getElementById('btnAddLevy');
    if(addLevyBtn) addLevyBtn.addEventListener('click', ()=>openLeviedPropertyModal(p, e, null));
    document.querySelectorAll('[data-edit-levy]').forEach(b=>b.addEventListener('click', ()=>openLeviedPropertyModal(p, e, Number(b.dataset.editLevy))));
    const addRealLevyBtn = document.getElementById('btnAddRealPropertyLevy');
    if(addRealLevyBtn) addRealLevyBtn.addEventListener('click', ()=>openRealPropertyLevyModal(p, e, null));
    document.querySelectorAll('[data-edit-real-levy]').forEach(b=>b.addEventListener('click', ()=>openRealPropertyLevyModal(p, e, Number(b.dataset.editRealLevy))));
    const addCreditBtn = document.getElementById('btnAddCredit');
    if(addCreditBtn) addCreditBtn.addEventListener('click', ()=>openAddCreditModal(p, e));
    const addDisbBtn = document.getElementById('btnAddDisbursement');
    if(addDisbBtn) addDisbBtn.addEventListener('click', ()=>openAddDisbursementModal(p, e));
    const disburseCommBtn = document.getElementById('btnDisburseCommission');
    if(disburseCommBtn) disburseCommBtn.addEventListener('click', ()=>openAddDisbursementModal(p, e, {payee:'Agency (Commission)', amount: commission}));

  } else if(PAPER_DETAIL_TAB==='photos'){
    const canUpload = can('civil_paper_intake') || can('civil_paper_log_attempt');
    const photos = p.photos || [];
    body.innerHTML = `
      ${canUpload ? `
      <div id="civilPhotoDropZone" style="border:2px dashed var(--border);border-radius:10px;padding:18px;text-align:center;cursor:pointer;margin-bottom:16px;">
        <span style="width:26px;height:26px;display:inline-block;color:var(--text-dim);">${ICONS.camera || ICONS.paperclip}</span>
        <div style="font-weight:700;font-size:13px;margin-top:8px;">Drag &amp; drop photos here, or click to browse</div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">On a phone, this also lets you take a new photo directly with your camera.</div>
        <input type="file" id="civilPhotoFileInput" accept="image/*" multiple style="display:none;">
      </div>` : ''}
      <div class="civil-photo-grid">
        ${photos.map((ph,pi)=>`
          <div class="civil-photo-card">
            <img src="${ph.dataUrl}" alt="${escapeHtml(ph.description||'Case photo')}">
            <div class="civil-photo-meta">${ph.uploadedDate} \u2014 ${escapeHtml(ph.uploadedBy)}</div>
            <textarea class="civil-photo-desc" data-photo-idx="${pi}" placeholder="Describe this photo (e.g. damage to front door, item seized, address marker)..." ${!canUpload?'disabled':''}>${escapeHtml(ph.description||'')}</textarea>
            ${canUpload ? `<button class="btn btn-sm btn-danger" data-remove-photo="${pi}" style="width:100%;margin-top:6px;">${ICONS.trash} Remove</button>` : ''}
          </div>
        `).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.camera || ICONS.paperclip}<div class="msg">No photos attached yet</div></div>`}
      </div>
    `;
    const dropZone = document.getElementById('civilPhotoDropZone');
    if(dropZone){
      const input = document.getElementById('civilPhotoFileInput');
      const processFiles = (fileList)=>{
        Array.from(fileList).forEach(file=>{
          if(!file.type.startsWith('image/')) return;
          resizeImageForStorage(file, 1100, 0.82, (dataUrl)=>{
            if(!p.photos) p.photos = [];
            p.photos.push({id:'photo'+Date.now()+Math.random().toString(36).slice(2,7), dataUrl, filename:file.name,
              uploadedDate: fmt(new Date()), uploadedBy: personName(CURRENT_USER_ID), description:''});
            logActivity(`Added a photo to ${p.caseNumber}.`, "civil_paper", p.id);
            persist();
            renderPaperDetailTabContent(p);
          });
        });
      };
      dropZone.addEventListener('click', ()=>input.click());
      input.addEventListener('change', (e)=>processFiles(e.target.files));
      dropZone.addEventListener('dragover', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--blue)'; });
      dropZone.addEventListener('dragleave', ()=>{ dropZone.style.borderColor='var(--border)'; });
      dropZone.addEventListener('drop', (e)=>{ e.preventDefault(); dropZone.style.borderColor='var(--border)'; if(e.dataTransfer.files.length) processFiles(e.dataTransfer.files); });
    }
    document.querySelectorAll('.civil-photo-desc').forEach(ta=>ta.addEventListener('change', ()=>{
      const idx = Number(ta.dataset.photoIdx);
      p.photos[idx].description = ta.value.trim();
      logActivity(`Updated description for a photo on ${p.caseNumber}.`, "civil_paper", p.id);
      persist();
      toast("Description saved.");
    }));
    document.querySelectorAll('[data-remove-photo]').forEach(b=>b.addEventListener('click', ()=>{
      if(!confirm("Remove this photo?")) return;
      const idx = Number(b.dataset.removePhoto);
      p.photos.splice(idx,1);
      logActivity(`Removed a photo from ${p.caseNumber}.`, "civil_paper", p.id);
      persist();
      renderPaperDetailTabContent(p);
    }));

  } else if(PAPER_DETAIL_TAB==='documents'){
    const docs = (p.generatedDocuments||[]).slice().reverse();
    const attached = (p.attachedDocuments||[]).slice().reverse();
    body.innerHTML = `
      ${canDoc ? `
      <div id="civilDocumentDropZone" style="border:2px dashed var(--border);border-radius:10px;padding:18px;text-align:center;cursor:pointer;margin-bottom:16px;">
        <span style="width:26px;height:26px;display:inline-block;color:var(--text-dim);">${ICONS.paperclip||ICONS.download}</span>
        <div style="font-weight:700;font-size:13px;margin-top:8px;">Drag &amp; drop documents here, or click to browse</div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">PDFs, court documents, scans, photos, and other files are stored privately in AWS S3. Maximum 25 MB per file.</div>
        <input type="file" id="civilDocumentFileInput" multiple style="display:none;">
      </div>` : ''}
      <div class="panel" style="box-shadow:none;margin-bottom:16px;"><div class="panel-head"><h2>Uploaded Documents</h2><span class="hint">${attached.length} file${attached.length===1?'':'s'}</span></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>File</th><th>Uploaded</th><th>Uploaded By</th><th>Size</th><th></th></tr></thead><tbody>
          ${attached.map(d=>`<tr>
            <td>${escapeHtml(d.filename||'Document')}</td>
            <td class="mono" style="font-size:12.5px;">${escapeHtml(d.uploadedDate||'')}</td>
            <td>${escapeHtml(d.uploadedBy||'')}</td>
            <td>${d.sizeKb?escapeHtml(String(d.sizeKb))+' KB':'—'}</td>
            <td><div class="cell-actions">
              <button class="btn btn-sm btn-outline" data-open-civil-doc="${d.id}">Open</button>
              ${canDoc? `<button class="btn btn-sm btn-danger" data-remove-civil-doc="${d.id}">${ICONS.trash||''} Remove</button>` : ''}
            </div></td>
          </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No documents uploaded yet.</td></tr>`}
          </tbody></table>
        </div>
      </div>
      ${canDoc ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnGenerateROS">${ICONS.download} Generate Return of Service</button>` : ''}
      ${!p.servedDate ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">A Return of Service can be generated once the paper has been marked served (or unable to serve, for an Affidavit of Non-Service).</div>` : ''}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Generated Returns &amp; Affidavits</h2></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Document Type</th><th>Reason</th><th>Generated</th><th>Generated By</th><th></th></tr></thead><tbody>
          ${docs.map(d=>`<tr><td>${escapeHtml(d.type)}</td><td style="font-size:12.5px;">${escapeHtml(d.reason||'Not specified')}</td><td class="mono" style="font-size:12.5px;">${d.generatedDate} at ${d.generatedTime}</td><td>${escapeHtml(d.generatedBy)}</td>
            <td><button class="btn btn-sm btn-outline" data-view-doc="${d.id}">View</button></td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No generated returns or affidavits yet.</td></tr>`}
          </tbody></table>
        </div>
      </div>
    `;

    const genBtn = document.getElementById('btnGenerateROS');
    if(genBtn) genBtn.addEventListener('click', ()=>openGenerateDocReasonModal(p));
    document.querySelectorAll('[data-view-doc]').forEach(b=>b.addEventListener('click', ()=>viewSavedDocument(p, b.dataset.viewDoc)));

    document.querySelectorAll('[data-open-civil-doc]').forEach(b=>b.addEventListener('click', async ()=>{
      const doc=(p.attachedDocuments||[]).find(d=>d.id===b.dataset.openCivilDoc);
      if(!doc) return;
      try{ await AWS_ATTACHMENTS.download(doc); }
      catch(error){ toast(error.message||'Document could not be opened.',true); }
    }));

    document.querySelectorAll('[data-remove-civil-doc]').forEach(b=>b.addEventListener('click', async ()=>{
      const doc=(p.attachedDocuments||[]).find(d=>d.id===b.dataset.removeCivilDoc);
      if(!doc || !confirm(`Remove "${doc.filename||'this document'}" from this civil paper?`)) return;
      b.disabled=true;
      try{
        if(doc.storageKey) await AWS_ATTACHMENTS.remove(doc,{collection:'civil.papers',itemId:p.id});
        p.attachedDocuments=(p.attachedDocuments||[]).filter(d=>d.id!==doc.id);
        recordFieldChangeCivil(p,'Attached Document',doc.filename||doc.id,null);
        logActivity(`Removed document "${doc.filename||'Document'}" from ${p.caseNumber}.`,"civil_paper",p.id);
        persist();
        toast('Document removed.');
        renderPaperDetailTabContent(p);
      }catch(error){
        b.disabled=false;
        toast(error.message||'Document could not be removed.',true);
      }
    }));

    const dropZone=document.getElementById('civilDocumentDropZone');
    const input=document.getElementById('civilDocumentFileInput');
    if(dropZone&&input){
      const processFiles=async fileList=>{
        const files=Array.from(fileList||[]);
        if(!files.length) return;
        dropZone.style.pointerEvents='none';
        dropZone.style.opacity='.65';
        try{
          for(const file of files){
            const meta=await AWS_ATTACHMENTS.upload(file,{collection:'civil.papers',itemId:p.id});
            const doc={id:'civdoc'+Date.now()+Math.random().toString(36).slice(2,7),...meta};
            p.attachedDocuments.push(doc);
            recordFieldChangeCivil(p,'Attached Document',null,doc.filename);
            logActivity(`Uploaded document "${doc.filename}" to ${p.caseNumber}.`,"civil_paper",p.id);
          }
          persist();
          toast(files.length===1?'Document uploaded to AWS.':`${files.length} documents uploaded to AWS.`);
          renderPaperDetailTabContent(p);
        }catch(error){
          toast(error.message||'Document upload failed.',true);
        }finally{
          dropZone.style.pointerEvents='';
          dropZone.style.opacity='';
          input.value='';
        }
      };
      dropZone.addEventListener('click',()=>input.click());
      input.addEventListener('change',e=>processFiles(e.target.files));
      dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.style.borderColor='var(--blue)';});
      dropZone.addEventListener('dragleave',()=>{dropZone.style.borderColor='var(--border)';});
      dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.style.borderColor='var(--border)';processFiles(e.dataTransfer.files);});
    }

  } else if(PAPER_DETAIL_TAB==='history'){
    const rows = p.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function openAddAddressModal(p){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Service Address</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Address</label><input type="text" id="fNewAddr" placeholder="Street, City, State ZIP"></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fNewAddrPrimary" style="width:auto;">Set as primary address</label></div>
      <div style="font-size:11px;color:var(--text-dim);">Useful when a defendant may be found at more than one location (e.g. a home address and a place of employment) \u2014 the map will let you switch between them.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add Address</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const address = document.getElementById('fNewAddr').value.trim();
    if(!address){ toast("Enter an address.", true); return; }
    const isPrimary = document.getElementById('fNewAddrPrimary').checked;
    if(!p.serviceAddresses) p.serviceAddresses = [];
    if(isPrimary) p.serviceAddresses.forEach(a=>a.isPrimary=false);
    const previousAddresses = JSON.parse(JSON.stringify(p.serviceAddresses));
    p.serviceAddresses.push({id:'addr'+Date.now(), address, isPrimary});
    recordFieldChangeCivil(p, 'serviceAddresses', previousAddresses, p.serviceAddresses);
    logActivity(`Added a service address to ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Address added.");
    PAPER_ADDRESS_SELECTED = p.serviceAddresses.length - 1;
    closeModal();
    renderPaperDetailModal();
  };
}

const SAFETY_FLAG_CATEGORIES = ["Weapons in Residence","Prior Aggression Toward Server","Known Violent History","Aggressive Animal on Property",
  "Hazardous Property Condition","Mental Health / Behavioral Caution","Active Protective Order Involving Subject","Evading Service \u2014 Repeated Attempts",
  "Request Two-Officer Response","Other (see notes)"];

function openAddSafetyFlagModal(p){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Safety Flag</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">This will display prominently at the top of this record for anyone who opens it, including in the field. Only add flags based on documented, first-hand information.</div>
      <div class="form-row"><label>Category</label><select id="fSafetyCategory">${SAFETY_FLAG_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
      <div class="form-row"><label>Details</label><textarea id="fSafetyText" rows="3" placeholder="What happened, and what should the next person know before making contact?"></textarea></div>
      <div class="form-row"><label>Expires</label><input type="date" id="fSafetyExpires" value="${fmt(addDays(new Date(),90))}"></div>
      <div style="font-size:11px;color:var(--text-dim);">Defaults to 90 days out. Flags don't disappear on their own before that — someone with edit access has to actively clear one early, and clearing it is recorded in Change History either way.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add Flag</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const text = document.getElementById('fSafetyText').value.trim();
    if(!text){ toast("Enter what the next person should know.", true); return; }
    const flag = {
      id:'sf'+Date.now(), category: document.getElementById('fSafetyCategory').value, text,
      addedBy: personName(CURRENT_USER_ID), addedDate: fmt(new Date()),
      expiresDate: document.getElementById('fSafetyExpires').value || null, active:true,
    };
    p.safetyFlags.push(flag);
    recordFieldChangeCivil(p, 'Safety Flag', null, `${flag.category}: ${flag.text}`);
    logActivity(`Added a safety flag to ${p.caseNumber}: "${flag.category}".`, "civil_paper", p.id);
    persist();
    toast("Safety flag added.");
    closeModal();
    renderPaperDetailModal();
  };
}

function openAddFeeLineModal(p){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Fee Line</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Description</label><input type="text" id="fFeeDesc" placeholder="e.g. Additional attempt fee"></div>
      <div class="form-2col">
        <div class="form-row"><label>Category</label><select id="fFeeCat">${FEE_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div class="form-row"><label>Amount ($)</label><input type="number" id="fFeeAmt" value="0"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const desc = document.getElementById('fFeeDesc').value.trim();
    if(!desc){ toast("Enter a description.", true); return; }
    p.feeLineItems.push({id:'fee'+Date.now(), description:desc, category: document.getElementById('fFeeCat').value, amount: Number(document.getElementById('fFeeAmt').value)||0});
    logActivity(`Added fee line "${desc}" to ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Fee line added.");
    closeModal();
    PAPER_DETAIL_TAB = 'fees';
    renderPaperDetailModal();
  };
}

function openAddPaymentModal(p){
  const balance = feeBalance(p);
  const threshold = STATE.civil.refData.feeSchedule.feeWaiverApprovalThreshold ?? 100;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Record Payment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:12.5px;margin-bottom:10px;">Outstanding balance: <strong>${money(balance)}</strong></div>
      <div class="form-2col">
        <div class="form-row"><label>Amount ($)</label><input type="number" id="fPayAmt" value="${balance>0?balance:0}"></div>
        <div class="form-row"><label>Date</label><input type="date" id="fPayDate" value="${fmt(new Date())}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Method</label><select id="fPayMethod">${PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="form-row"><label>Reference # (check #, receipt #, etc.)</label><input type="text" id="fPayRef"></div>
      </div>
      <div class="form-row" id="fPayApprovalRow" hidden>
        <label>Approved By (required for fee waivers over ${money(threshold)})</label>
        <select id="fPayApprovedBy"><option value="">Select a supervisor...</option>${STATE.personnel.map(person=>`<option value="${escapeHtml(person.name)}">${escapeHtml(person.name)}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fPayNotes" rows="2" placeholder="How was this fee recovered? e.g. paid at intake, invoiced to county, waived by court order."></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Record Payment</button></div>
  `;
  openModal();
  function refreshApprovalRow(){
    const method = document.getElementById('fPayMethod').value;
    const amount = Number(document.getElementById('fPayAmt').value)||0;
    document.getElementById('fPayApprovalRow').hidden = !(method==='Fee Waiver' && amount>threshold);
  }
  document.getElementById('fPayMethod').addEventListener('change', refreshApprovalRow);
  document.getElementById('fPayAmt').addEventListener('input', refreshApprovalRow);
  refreshApprovalRow();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const amount = Number(document.getElementById('fPayAmt').value)||0;
    if(amount<=0){ toast("Enter a payment amount.", true); return; }
    const method = document.getElementById('fPayMethod').value;
    const approvedBy = document.getElementById('fPayApprovedBy').value;
    if(method==='Fee Waiver' && amount>threshold && !approvedBy){ toast(`Fee waivers over ${money(threshold)} require a supervisor's approval.`, true); return; }
    p.feePayments.push({id:'pay'+Date.now(), date: document.getElementById('fPayDate').value, amount,
      method, referenceNumber: document.getElementById('fPayRef').value.trim(),
      receivedBy: personName(CURRENT_USER_ID), approvedBy: approvedBy||null, notes: document.getElementById('fPayNotes').value.trim()});
    logActivity(`Recorded ${money(amount)} payment for ${p.caseNumber} via ${method}.`, "civil_paper", p.id);
    persist();
    toast("Payment recorded.");
    closeModal();
    PAPER_DETAIL_TAB = 'fees';
    renderPaperDetailModal();
  };
}

function openAddDepositModal(p){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Record Deposit / Retainer</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">A deposit is money collected up front, held against fees as they're incurred -- distinct from a payment against a specific fee already owed.</div>
      <div class="form-2col">
        <div class="form-row"><label>Amount ($)</label><input type="number" id="fDepAmt" min="0" step="0.01"></div>
        <div class="form-row"><label>Date</label><input type="date" id="fDepDate" value="${fmt(new Date())}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Method</label><select id="fDepMethod">${PAYMENT_METHODS.filter(m=>m!=='Fee Waiver').map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="form-row"><label>Reference #</label><input type="text" id="fDepRef"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fDepNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Record Deposit</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const amount = Number(document.getElementById('fDepAmt').value)||0;
    if(amount<=0){ toast("Enter a deposit amount.", true); return; }
    if(!p.deposits) p.deposits = [];
    p.deposits.push({id:'dep'+Date.now(), date: document.getElementById('fDepDate').value, amount,
      method: document.getElementById('fDepMethod').value, referenceNumber: document.getElementById('fDepRef').value.trim(),
      receivedBy: personName(CURRENT_USER_ID), notes: document.getElementById('fDepNotes').value.trim()});
    logActivity(`Recorded a ${money(amount)} deposit for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Deposit recorded.");
    closeModal();
    PAPER_DETAIL_TAB = 'fees';
    renderPaperDetailModal();
  };
}

function openApplyDepositModal(p){
  const available = depositBalance(p);
  const owed = Math.max(0, feeBalance(p));
  const suggested = Math.min(available, owed) || 0;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Apply Deposit to Fees</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:12.5px;margin-bottom:10px;">Available deposit balance: <strong>${moneyPrecise(available)}</strong> &bull; Current fee balance: <strong>${moneyPrecise(owed)}</strong></div>
      <div class="form-row"><label>Amount to Apply</label><input type="number" id="fApplyAmt" min="0" max="${available}" step="0.01" value="${suggested}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Apply</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const amount = Number(document.getElementById('fApplyAmt').value)||0;
    if(amount<=0){ toast("Enter an amount to apply.", true); return; }
    if(amount>available){ toast(`Only ${moneyPrecise(available)} is available to apply.`, true); return; }
    p.feePayments.push({id:'pay'+Date.now(), date: fmt(new Date()), amount, method:'Applied from Deposit',
      referenceNumber:'', receivedBy: personName(CURRENT_USER_ID), notes:'Applied from an existing deposit/retainer.'});
    logActivity(`Applied ${moneyPrecise(amount)} from deposit to fees on ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Deposit applied.");
    closeModal();
    PAPER_DETAIL_TAB = 'fees';
    renderPaperDetailModal();
  };
}

function openVoidModal(label, amount, onConfirm){
  const threshold = STATE.civil.refData.feeSchedule.voidApprovalThreshold ?? 100;
  const needsApproval = amount > threshold;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Void This ${escapeHtml(label)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Voiding never deletes the original record -- it stays visible, marked void, with a reason and who approved it. This is the audit-safe way to correct a mistake instead of overwriting or deleting it.</div>
      <div class="form-row"><label>Reason for Voiding</label><textarea id="fVoidReason" rows="2" placeholder="Why is this being voided?"></textarea></div>
      ${needsApproval ? `<div class="form-row"><label>Approved By (required over ${money(threshold)})</label><select id="fVoidApprovedBy"><option value="">Select a supervisor...</option>${STATE.personnel.map(person=>`<option value="${escapeHtml(person.name)}">${escapeHtml(person.name)}</option>`).join('')}</select></div>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-danger" id="mSave">Void ${moneyPrecise(amount)}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const reason = document.getElementById('fVoidReason').value.trim();
    if(!reason){ toast("Enter a reason for voiding.", true); return; }
    let approvedBy = null;
    if(needsApproval){
      approvedBy = document.getElementById('fVoidApprovedBy').value;
      if(!approvedBy){ toast(`Voiding over ${money(threshold)} requires a supervisor's approval.`, true); return; }
    }
    closeModal();
    onConfirm(reason, approvedBy);
  };
}

const GARNISHEE_TYPES = ["Employer","Bank / Financial Institution","Other Third Party"];
const SATISFACTION_STATUSES = ["Open","Partially Satisfied","Satisfied","Returned Unsatisfied"];

function openEditJudgmentModal(p, e){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Judgment Details \u2014 ${escapeHtml(p.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Judgment Amount</label><input type="number" id="fJAmt" min="0" step="0.01" value="${e.judgmentAmount}"></div>
        <div class="form-row"><label>Judgment Date</label><input type="date" id="fJDate" value="${e.judgmentDate}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Interest Rate (annual %)</label><input type="number" id="fJRate" min="0" step="0.1" value="${e.interestRateAnnualPercent}"></div>
        <div class="form-row"><label>Costs Awarded</label><input type="number" id="fJCosts" min="0" step="0.01" value="${e.costsAwarded||0}"></div>
      </div>
      <div class="form-row"><label>Satisfaction Status</label><select id="fJStatus">${SATISFACTION_STATUSES.map(s=>`<option ${e.satisfactionStatus===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="form-row"><label>Notes</label><textarea id="fJNotes" rows="2">${escapeHtml(e.notes||'')}</textarea></div>
      <div style="font-size:11px;color:var(--text-dim);">Interest defaults to the agency rate configured in Admin &gt; Fee Schedule &amp; Rates, but can be overridden here if this specific judgment specifies a different rate. Interest is calculated as simple interest from the judgment date.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const status = document.getElementById('fJStatus').value;
    e.judgmentAmount = Number(document.getElementById('fJAmt').value)||0;
    e.judgmentDate = document.getElementById('fJDate').value;
    e.interestRateAnnualPercent = Number(document.getElementById('fJRate').value)||0;
    e.costsAwarded = Number(document.getElementById('fJCosts').value)||0;
    e.satisfactionStatus = status;
    e.satisfactionDate = (status==='Satisfied'||status==='Returned Unsatisfied') ? (e.satisfactionDate||fmt(new Date())) : null;
    e.notes = document.getElementById('fJNotes').value.trim();
    logActivity(`Updated judgment details for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Judgment details saved.");
    closeModal();
    renderPaperDetailModal();
  };
}

function openEditGarnisheeModal(p, e){
  const g = e.garnishee || {name:'', type:GARNISHEE_TYPES[0], address:'', contactPhone:'', noticeServedDate:'', responseReceivedDate:'', responseAmount:0, notes:''};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Garnishee / Employer</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Name</label><input type="text" id="fGName" value="${escapeHtml(g.name)}" placeholder="e.g. Acme Manufacturing, First National Bank"></div>
        <div class="form-row"><label>Type</label><select id="fGType">${GARNISHEE_TYPES.map(t=>`<option ${g.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Address</label><input type="text" id="fGAddress" value="${escapeHtml(g.address||'')}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Contact Phone</label><input type="text" id="fGPhone" value="${escapeHtml(g.contactPhone||'')}"></div>
        <div class="form-row"><label>Notice Served Date</label><input type="date" id="fGServed" value="${g.noticeServedDate||''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Response Received Date</label><input type="date" id="fGResponse" value="${g.responseReceivedDate||''}"></div>
        <div class="form-row"><label>Response Amount</label><input type="number" id="fGRespAmt" min="0" step="0.01" value="${g.responseAmount||0}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fGNotes" rows="2">${escapeHtml(g.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fGName').value.trim();
    if(!name){ toast("Enter a name.", true); return; }
    e.garnishee = {
      name, type: document.getElementById('fGType').value, address: document.getElementById('fGAddress').value.trim(),
      contactPhone: document.getElementById('fGPhone').value.trim(), noticeServedDate: document.getElementById('fGServed').value||null,
      responseReceivedDate: document.getElementById('fGResponse').value||null, responseAmount: Number(document.getElementById('fGRespAmt').value)||0,
      notes: document.getElementById('fGNotes').value.trim(),
    };
    logActivity(`Recorded garnishee/employer "${name}" for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Garnishee saved.");
    closeModal();
    renderPaperDetailModal();
  };
}

function openLeviedPropertyModal(p, e, idx, draftOverride){
  const editing = idx!==null && idx!==undefined;
  const lp = draftOverride || (editing ? e.leviedProperty[idx] : {
    description:'', propertyType:'', identifyingDetails:'', estimatedValue:0,
    seizedDate: fmt(new Date()), seizedFromAddress:'', seizedByPersonId:null,
    storageLocation:'', storageCostPerDay:0, status: STATE.civil.refData.propertySeizureStatuses[0]||'',
    appraisalValue:0, appraisedBy:'', appraisalDate:'',
    noticeOfSalePostedDate:'', saleDate:'', salePrice:0, buyerName:'',
    disposalMethod:'', disposalDate:'', releaseReason:'', releasedToName:'', releasedDate:'',
    disbursed:false, thirdPartyClaims:[], exemptionClaims:[], photos:[], notes:'', fieldHistory:[],
  });
  const officerOpts = STATE.personnel.map(pr=>`<option value="${pr.id}" ${lp.seizedByPersonId===pr.id?'selected':''}>${escapeHtml(pr.name)}</option>`).join('');
  const accrued = leviedPropertyStorageCostAccrued(lp);
  document.getElementById('modalBox').className = 'modal modal-xl';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Levied Property</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Description</label><input type="text" id="fLpDesc" value="${escapeHtml(lp.description)}" placeholder="e.g. 2019 Ford F-150, VIN ..."></div>
      <div class="form-2col">
        <div class="form-row"><label>Property Type</label><select id="fLpType"><option value="">Select...</option>${STATE.civil.refData.propertyTypes.map(t=>`<option ${lp.propertyType===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Identifying Details</label><input type="text" id="fLpIdent" value="${escapeHtml(lp.identifyingDetails||'')}" placeholder="VIN, serial #, plate, etc."></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Estimated Value</label><input type="number" id="fLpEst" min="0" step="0.01" value="${lp.estimatedValue||0}"></div>
        <div class="form-row"><label>Status</label><select id="fLpStatus">${STATE.civil.refData.propertySeizureStatuses.map(s=>`<option ${lp.status===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">SEIZURE</div>
      <div class="form-2col">
        <div class="form-row"><label>Seized Date</label><input type="date" id="fLpSeized" value="${lp.seizedDate||''}"></div>
        <div class="form-row"><label>Seized From (Address)</label><input type="text" id="fLpSeizedFrom" value="${escapeHtml(lp.seizedFromAddress||'')}"></div>
      </div>
      <div class="form-row"><label>Seized By (Chain of Custody)</label><select id="fLpSeizedBy"><option value="">Not recorded</option>${officerOpts}</select></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">STORAGE</div>
      <div class="form-2col">
        <div class="form-row"><label>Storage Location</label><select id="fLpStorage"><option value="">Select...</option>${STATE.civil.refData.propertyStorageLocations.map(s=>`<option ${lp.storageLocation===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}<option value="__custom__">Other (type below)</option></select></div>
        <div class="form-row"><label>Storage Cost (per day)</label><input type="number" id="fLpStorageCost" min="0" step="0.01" value="${lp.storageCostPerDay||0}"></div>
      </div>
      <div class="form-row" id="fLpStorageCustomWrap" style="${STATE.civil.refData.propertyStorageLocations.includes(lp.storageLocation)||!lp.storageLocation?'display:none;':''}"><label>Custom Storage Location</label><input type="text" id="fLpStorageCustom" value="${escapeHtml(STATE.civil.refData.propertyStorageLocations.includes(lp.storageLocation)?'':(lp.storageLocation||''))}"></div>
      ${accrued>0?`<div class="callout callout-blue" style="font-size:12px;margin-top:4px;">Storage cost accrued so far: <strong>${moneyPrecise(accrued)}</strong> (from seizure through ${lp.disposalDate||lp.saleDate||lp.releasedDate||'today'})</div>`:''}
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">APPRAISAL</div>
      <div class="form-2col">
        <div class="form-row"><label>Appraisal Value</label><input type="number" id="fLpAppraisal" min="0" step="0.01" value="${lp.appraisalValue||0}"></div>
        <div class="form-row"><label>Appraised By</label><input type="text" id="fLpAppraisedBy" value="${escapeHtml(lp.appraisedBy||'')}"></div>
      </div>
      <div class="form-row"><label>Appraisal Date</label><input type="date" id="fLpAppraisalDate" value="${lp.appraisalDate||''}"></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">SALE (once sold at sheriff's sale/auction)</div>
      <div class="form-row"><label>Notice of Sale Posted</label><input type="date" id="fLpNoticeDate" value="${lp.noticeOfSalePostedDate||''}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Sale Date</label><input type="date" id="fLpSaleDate" value="${lp.saleDate||''}"></div>
        <div class="form-row"><label>Sale Price</label><input type="number" id="fLpSalePrice" min="0" step="0.01" value="${lp.salePrice||0}"></div>
      </div>
      <div class="form-row"><label>Buyer Name</label><input type="text" id="fLpBuyer" value="${escapeHtml(lp.buyerName||'')}"></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">DISPOSAL / RELEASE (if not sold)</div>
      <div class="form-2col">
        <div class="form-row"><label>Disposal Method</label><select id="fLpDisposal"><option value="">Not disposed</option>${STATE.civil.refData.propertyDisposalMethods.map(d=>`<option ${lp.disposalMethod===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Disposal Date</label><input type="date" id="fLpDisposalDate" value="${lp.disposalDate||''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Released To</label><input type="text" id="fLpReleasedTo" value="${escapeHtml(lp.releasedToName||'')}" placeholder="Name, if released rather than sold"></div>
        <div class="form-row"><label>Released Date</label><input type="date" id="fLpReleasedDate" value="${lp.releasedDate||''}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fLpDisbursed" style="width:auto;" ${lp.disbursed?'checked':''}>Sale proceeds disbursed (counts toward balance collected)</label></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">THIRD-PARTY CLAIMS</div>
      <table><thead><tr><th>Claimant</th><th>Basis</th><th>Status</th><th></th></tr></thead><tbody>
        ${(lp.thirdPartyClaims||[]).map((c,ci)=>`<tr><td>${escapeHtml(c.claimantName)}</td><td style="font-size:12px;">${escapeHtml(c.basisOfClaim||'')}</td><td><span class="badge ${c.status==='Pending'?'badge-missing':'badge-role'}">${escapeHtml(c.status)}</span></td><td><button class="btn-icon" data-edit-tpc="${ci}">${ICONS.edit}</button></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:8px;font-size:12px;">None on file.</td></tr>`}
      </tbody></table>
      <button class="btn btn-sm btn-outline" id="btnAddTpc" style="margin-top:6px;">${ICONS.plus} Add Third-Party Claim</button>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:14px 0 2px;">EXEMPTION CLAIMS</div>
      <table><thead><tr><th>Claimed By</th><th>Exemption Type</th><th>Status</th><th></th></tr></thead><tbody>
        ${(lp.exemptionClaims||[]).map((c,ci)=>`<tr><td>${escapeHtml(c.claimedBy)}</td><td style="font-size:12px;">${escapeHtml(c.exemptionType||'')}</td><td><span class="badge ${c.status==='Pending'?'badge-missing':'badge-role'}">${escapeHtml(c.status)}</span></td><td><button class="btn-icon" data-edit-exc="${ci}">${ICONS.edit}</button></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:8px;font-size:12px;">None on file.</td></tr>`}
      </tbody></table>
      <button class="btn btn-sm btn-outline" id="btnAddExc" style="margin-top:6px;">${ICONS.plus} Add Exemption Claim</button>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:14px 0 2px;">PHOTOS</div>
      <div class="civil-photo-grid" id="fLpPhotoGrid">
        ${(lp.photos||[]).map((ph,pi)=>`<div class="civil-photo-card"><img src="${ph.dataUrl}" alt="Property photo"><div class="civil-photo-meta">${ph.uploadedDate} \u2014 ${escapeHtml(ph.uploadedBy)}</div><button class="btn btn-sm btn-danger" data-remove-lp-photo="${pi}" style="width:100%;margin-top:6px;">${ICONS.trash} Remove</button></div>`).join('')}
      </div>
      <input type="file" id="fLpPhotoInput" accept="image/*" multiple style="margin-top:6px;">
      <div class="form-row" style="margin-top:10px;"><label>Notes</label><textarea id="fLpNotes" rows="2">${escapeHtml(lp.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${editing ? `<button class="btn btn-outline" id="mDelete" style="margin-right:auto;color:var(--red);">Remove</button>` : ''}
      <button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fLpStorage').addEventListener('change', (ev)=>{
    document.getElementById('fLpStorageCustomWrap').style.display = ev.target.value==='__custom__' ? '' : 'none';
  });
  function readFormIntoDraft(){
    const storageSel = document.getElementById('fLpStorage').value;
    const storageLocation = storageSel==='__custom__' ? document.getElementById('fLpStorageCustom').value.trim() : storageSel;
    Object.assign(lp, {
      description: document.getElementById('fLpDesc').value.trim(),
      propertyType: document.getElementById('fLpType').value, identifyingDetails: document.getElementById('fLpIdent').value.trim(),
      estimatedValue: Number(document.getElementById('fLpEst').value)||0, status: document.getElementById('fLpStatus').value,
      seizedDate: document.getElementById('fLpSeized').value||null, seizedFromAddress: document.getElementById('fLpSeizedFrom').value.trim(),
      seizedByPersonId: document.getElementById('fLpSeizedBy').value||null,
      storageLocation, storageCostPerDay: Number(document.getElementById('fLpStorageCost').value)||0,
      appraisalValue: Number(document.getElementById('fLpAppraisal').value)||0, appraisedBy: document.getElementById('fLpAppraisedBy').value.trim(),
      appraisalDate: document.getElementById('fLpAppraisalDate').value||null,
      noticeOfSalePostedDate: document.getElementById('fLpNoticeDate').value||null,
      saleDate: document.getElementById('fLpSaleDate').value||null, salePrice: Number(document.getElementById('fLpSalePrice').value)||0,
      buyerName: document.getElementById('fLpBuyer').value.trim(),
      disposalMethod: document.getElementById('fLpDisposal').value, disposalDate: document.getElementById('fLpDisposalDate').value||null,
      releasedToName: document.getElementById('fLpReleasedTo').value.trim(), releasedDate: document.getElementById('fLpReleasedDate').value||null,
      disbursed: document.getElementById('fLpDisbursed').checked,
      notes: document.getElementById('fLpNotes').value.trim(),
    });
  }
  document.getElementById('fLpPhotoInput').addEventListener('change', (ev)=>{
    Array.from(ev.target.files).forEach(file=>{
      if(!file.type.startsWith('image/')) return;
      resizeImageForStorage(file, 1100, 0.82, (dataUrl)=>{
        readFormIntoDraft();
        if(!lp.photos) lp.photos = [];
        lp.photos.push({id:'lpphoto'+Date.now()+Math.random().toString(36).slice(2,7), dataUrl, uploadedDate: fmt(new Date()), uploadedBy: personName(CURRENT_USER_ID)});
        if(editing){ persist(); }
        openLeviedPropertyModal(p, e, editing?idx:null, editing?null:lp); // re-render with the new photo and everything else already typed intact
      });
    });
  });
  document.querySelectorAll('[data-remove-lp-photo]').forEach(b=>b.addEventListener('click', ()=>{
    readFormIntoDraft();
    lp.photos.splice(Number(b.dataset.removeLpPhoto), 1);
    if(editing) persist();
    openLeviedPropertyModal(p, e, editing?idx:null, editing?null:lp);
  }));
  document.getElementById('btnAddTpc').addEventListener('click', ()=>{ readFormIntoDraft(); openThirdPartyClaimModal(p, e, 'personal', editing?idx:null, lp, null); });
  document.querySelectorAll('[data-edit-tpc]').forEach(b=>b.addEventListener('click', ()=>{ readFormIntoDraft(); openThirdPartyClaimModal(p, e, 'personal', editing?idx:null, lp, Number(b.dataset.editTpc)); }));
  document.getElementById('btnAddExc').addEventListener('click', ()=>{ readFormIntoDraft(); openExemptionClaimModal(p, e, 'personal', editing?idx:null, lp, null); });
  document.querySelectorAll('[data-edit-exc]').forEach(b=>b.addEventListener('click', ()=>{ readFormIntoDraft(); openExemptionClaimModal(p, e, 'personal', editing?idx:null, lp, Number(b.dataset.editExc)); }));
  const delBtn = document.getElementById('mDelete');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm('Remove this levied property record?')) return;
    e.leviedProperty.splice(idx,1);
    logActivity(`Removed levied property from ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    closeModal();
    renderPaperDetailModal();
  });
  document.getElementById('mSave').onclick = ()=>{
    if(!document.getElementById('fLpDesc').value.trim()){ toast("Enter a description.", true); return; }
    readFormIntoDraft();
    const record = { ...lp, id: editing ? lp.id : 'lp'+Date.now(),
      thirdPartyClaims: lp.thirdPartyClaims||[], exemptionClaims: lp.exemptionClaims||[], photos: lp.photos||[], fieldHistory: lp.fieldHistory||[] };
    if(!e.leviedProperty) e.leviedProperty = [];
    if(editing) e.leviedProperty[idx] = record; else e.leviedProperty.push(record);
    logActivity(`${editing?'Updated':'Added'} levied property "${record.description}" for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Saved.");
    closeModal();
    renderPaperDetailModal();
  };
}

function reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord){
  const draftOverride = (parentIdx===null || parentIdx===undefined) ? propertyRecord : null;
  if(kind==='personal') openLeviedPropertyModal(p, e, parentIdx, draftOverride);
  else openRealPropertyLevyModal(p, e, parentIdx, draftOverride);
}
function openThirdPartyClaimModal(p, e, kind, parentIdx, propertyRecord, claimIdx){
  const editing = claimIdx!==null && claimIdx!==undefined;
  if(!propertyRecord.thirdPartyClaims) propertyRecord.thirdPartyClaims = [];
  const c = editing ? propertyRecord.thirdPartyClaims[claimIdx] : {claimantName:'', claimDate: fmt(new Date()), basisOfClaim:'', status:'Pending', resolutionDate:'', notes:''};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Third-Party Claim</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Claimant Name</label><input type="text" id="fTpcName" value="${escapeHtml(c.claimantName)}"></div>
      <div class="form-row"><label>Claim Date</label><input type="date" id="fTpcDate" value="${c.claimDate||''}"></div>
      <div class="form-row"><label>Basis of Claim</label><textarea id="fTpcBasis" rows="2" placeholder="e.g. Vehicle registered to claimant, not judgment debtor">${escapeHtml(c.basisOfClaim||'')}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Status</label><select id="fTpcStatus">${['Pending','Upheld','Denied'].map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="form-row"><label>Resolution Date</label><input type="date" id="fTpcResDate" value="${c.resolutionDate||''}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fTpcNotes" rows="2">${escapeHtml(c.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${editing ? `<button class="btn btn-outline" id="mDelete" style="margin-right:auto;color:var(--red);">Remove</button>` : ''}
      <button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  document.getElementById('mCancel').onclick = ()=>reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  const delBtn = document.getElementById('mDelete');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm('Remove this third-party claim?')) return;
    propertyRecord.thirdPartyClaims.splice(claimIdx,1);
    logActivity(`Removed a third-party claim on levied property for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  });
  document.getElementById('mSave').onclick = ()=>{
    const claimantName = document.getElementById('fTpcName').value.trim();
    if(!claimantName){ toast("Enter the claimant's name.", true); return; }
    const record = {
      id: editing ? c.id : 'tpc'+Date.now(), claimantName,
      claimDate: document.getElementById('fTpcDate').value||null, basisOfClaim: document.getElementById('fTpcBasis').value.trim(),
      status: document.getElementById('fTpcStatus').value, resolutionDate: document.getElementById('fTpcResDate').value||null,
      notes: document.getElementById('fTpcNotes').value.trim(),
    };
    if(editing) propertyRecord.thirdPartyClaims[claimIdx] = record; else propertyRecord.thirdPartyClaims.push(record);
    logActivity(`${editing?'Updated':'Added'} a third-party claim on levied property for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Saved.");
    reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  };
}
function openExemptionClaimModal(p, e, kind, parentIdx, propertyRecord, claimIdx){
  const editing = claimIdx!==null && claimIdx!==undefined;
  if(!propertyRecord.exemptionClaims) propertyRecord.exemptionClaims = [];
  const c = editing ? propertyRecord.exemptionClaims[claimIdx] : {claimedBy:'', claimDate: fmt(new Date()), exemptionType:'', statuteReference:'', status:'Pending', resolutionDate:'', notes:''};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Exemption Claim</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Claimed By</label><input type="text" id="fExcName" value="${escapeHtml(c.claimedBy)}" placeholder="Usually the judgment debtor"></div>
      <div class="form-2col">
        <div class="form-row"><label>Claim Date</label><input type="date" id="fExcDate" value="${c.claimDate||''}"></div>
        <div class="form-row"><label>Exemption Type</label><input type="text" id="fExcType" value="${escapeHtml(c.exemptionType||'')}" placeholder="e.g. Tools of the trade, Homestead"></div>
      </div>
      <div class="form-row"><label>Statute Reference</label><input type="text" id="fExcStatute" value="${escapeHtml(c.statuteReference||'')}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Status</label><select id="fExcStatus">${['Pending','Granted','Denied'].map(s=>`<option ${c.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="form-row"><label>Resolution Date</label><input type="date" id="fExcResDate" value="${c.resolutionDate||''}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fExcNotes" rows="2">${escapeHtml(c.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${editing ? `<button class="btn btn-outline" id="mDelete" style="margin-right:auto;color:var(--red);">Remove</button>` : ''}
      <button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  document.getElementById('mCancel').onclick = ()=>reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  const delBtn = document.getElementById('mDelete');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm('Remove this exemption claim?')) return;
    propertyRecord.exemptionClaims.splice(claimIdx,1);
    logActivity(`Removed an exemption claim on levied property for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  });
  document.getElementById('mSave').onclick = ()=>{
    const claimedBy = document.getElementById('fExcName').value.trim();
    if(!claimedBy){ toast("Enter who is claiming the exemption.", true); return; }
    const record = {
      id: editing ? c.id : 'exc'+Date.now(), claimedBy,
      claimDate: document.getElementById('fExcDate').value||null, exemptionType: document.getElementById('fExcType').value.trim(),
      statuteReference: document.getElementById('fExcStatute').value.trim(),
      status: document.getElementById('fExcStatus').value, resolutionDate: document.getElementById('fExcResDate').value||null,
      notes: document.getElementById('fExcNotes').value.trim(),
    };
    if(editing) propertyRecord.exemptionClaims[claimIdx] = record; else propertyRecord.exemptionClaims.push(record);
    logActivity(`${editing?'Updated':'Added'} an exemption claim on levied property for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Saved.");
    reopenPropertyParentModal(p, e, kind, parentIdx, propertyRecord);
  };
}

function openRealPropertyLevyModal(p, e, idx, draftOverride){
  const editing = idx!==null && idx!==undefined;
  const rp = draftOverride || (editing ? e.realPropertyLevies[idx] : {
    propertyAddress:'', legalDescription:'', realPropertyType:'', currentOwnerOfRecord:'', estimatedValue:0,
    lienholders:[], noticeOfLevyRecordedDate: fmt(new Date()), noticeOfLevyRecordingNumber:'',
    appraisalValue:0, appraisedBy:'', appraisalDate:'', status: STATE.civil.refData.realPropertyLevyStatuses[0]||'',
    noticeOfSalePostedDate:'', saleDate:'', salePrice:0, buyerName:'', minimumBid:0,
    certificateOfSaleIssuedDate:'', redemptionPeriodEndDate:'', redeemedDate:'', deedIssuedDate:'',
    disposalMethod:'', releaseReason:'', releasedDate:'', disbursed:false,
    thirdPartyClaims:[], exemptionClaims:[], notes:'', fieldHistory:[],
  });
  document.getElementById('modalBox').className = 'modal modal-xl';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Real Property Levy</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="callout callout-blue" style="font-size:12px;margin-bottom:10px;">A levy on real property is a notice recorded against title, not a physical seizure. The debtor stays in possession until any sale is confirmed.</div>
      <div class="form-row"><label>Property Address</label><input type="text" id="fRpAddress" value="${escapeHtml(rp.propertyAddress)}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Real Property Type</label><select id="fRpType"><option value="">Select...</option>${STATE.civil.refData.realPropertyTypes.map(t=>`<option ${rp.realPropertyType===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fRpStatus">${STATE.civil.refData.realPropertyLevyStatuses.map(s=>`<option ${rp.status===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Legal Description / APN</label><textarea id="fRpLegal" rows="2">${escapeHtml(rp.legalDescription||'')}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Current Owner of Record</label><input type="text" id="fRpOwner" value="${escapeHtml(rp.currentOwnerOfRecord||'')}"></div>
        <div class="form-row"><label>Estimated Value</label><input type="number" id="fRpEst" min="0" step="0.01" value="${rp.estimatedValue||0}"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">NOTICE OF LEVY</div>
      <div class="form-2col">
        <div class="form-row"><label>Recorded Date</label><input type="date" id="fRpNolDate" value="${rp.noticeOfLevyRecordedDate||''}"></div>
        <div class="form-row"><label>Recording Number</label><input type="text" id="fRpNolNum" value="${escapeHtml(rp.noticeOfLevyRecordingNumber||'')}"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">LIENHOLDERS (affect sale proceeds priority)</div>
      <table><thead><tr><th>Name</th><th>Amount</th><th></th></tr></thead><tbody id="fRpLienBody">
        ${(rp.lienholders||[]).map((l,li)=>`<tr><td><input type="text" class="fRpLienName" value="${escapeHtml(l.name||'')}"></td><td><input type="number" class="fRpLienAmt" min="0" step="0.01" value="${l.amount||0}" style="width:110px;"></td><td><button class="btn-icon" data-remove-lien="${li}">${ICONS.trash}</button></td></tr>`).join('')}
      </tbody></table>
      <button class="btn btn-sm btn-outline" id="btnAddLien" style="margin-top:6px;">${ICONS.plus} Add Lienholder</button>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:14px 0 2px;">APPRAISAL</div>
      <div class="form-2col">
        <div class="form-row"><label>Appraisal Value</label><input type="number" id="fRpAppraisal" min="0" step="0.01" value="${rp.appraisalValue||0}"></div>
        <div class="form-row"><label>Appraised By</label><input type="text" id="fRpAppraisedBy" value="${escapeHtml(rp.appraisedBy||'')}"></div>
      </div>
      <div class="form-row"><label>Appraisal Date</label><input type="date" id="fRpAppraisalDate" value="${rp.appraisalDate||''}"></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">SHERIFF'S SALE</div>
      <div class="form-2col">
        <div class="form-row"><label>Notice of Sale Posted</label><input type="date" id="fRpNoticeDate" value="${rp.noticeOfSalePostedDate||''}"></div>
        <div class="form-row"><label>Minimum Bid</label><input type="number" id="fRpMinBid" min="0" step="0.01" value="${rp.minimumBid||0}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Sale Date</label><input type="date" id="fRpSaleDate" value="${rp.saleDate||''}"></div>
        <div class="form-row"><label>Sale Price</label><input type="number" id="fRpSalePrice" min="0" step="0.01" value="${rp.salePrice||0}"></div>
      </div>
      <div class="form-row"><label>Buyer Name</label><input type="text" id="fRpBuyer" value="${escapeHtml(rp.buyerName||'')}"></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">CERTIFICATE OF SALE &amp; REDEMPTION</div>
      <div class="form-2col">
        <div class="form-row"><label>Certificate of Sale Issued</label><input type="date" id="fRpCertDate" value="${rp.certificateOfSaleIssuedDate||''}"></div>
        <div class="form-row"><label>Redemption Period Ends</label><input type="date" id="fRpRedemptionEnd" value="${rp.redemptionPeriodEndDate||''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Redeemed Date (if debtor redeemed)</label><input type="date" id="fRpRedeemedDate" value="${rp.redeemedDate||''}"></div>
        <div class="form-row"><label>Deed Issued Date (if not redeemed)</label><input type="date" id="fRpDeedDate" value="${rp.deedIssuedDate||''}"></div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">RELEASE (if levy withdrawn without a sale)</div>
      <div class="form-2col">
        <div class="form-row"><label>Release Reason</label><input type="text" id="fRpReleaseReason" value="${escapeHtml(rp.releaseReason||'')}" placeholder="e.g. Judgment satisfied, Writ recalled"></div>
        <div class="form-row"><label>Released Date</label><input type="date" id="fRpReleasedDate" value="${rp.releasedDate||''}"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fRpDisbursed" style="width:auto;" ${rp.disbursed?'checked':''}>Sale proceeds disbursed (counts toward balance collected)</label></div>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:10px 0 2px;">THIRD-PARTY CLAIMS</div>
      <table><thead><tr><th>Claimant</th><th>Basis</th><th>Status</th><th></th></tr></thead><tbody>
        ${(rp.thirdPartyClaims||[]).map((c,ci)=>`<tr><td>${escapeHtml(c.claimantName)}</td><td style="font-size:12px;">${escapeHtml(c.basisOfClaim||'')}</td><td><span class="badge ${c.status==='Pending'?'badge-missing':'badge-role'}">${escapeHtml(c.status)}</span></td><td><button class="btn-icon" data-edit-tpc="${ci}">${ICONS.edit}</button></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:8px;font-size:12px;">None on file.</td></tr>`}
      </tbody></table>
      <button class="btn btn-sm btn-outline" id="btnAddTpc" style="margin-top:6px;">${ICONS.plus} Add Third-Party Claim</button>
      <div style="font-size:11px;font-weight:700;color:var(--text-dim);margin:14px 0 2px;">EXEMPTION CLAIMS (e.g. Homestead)</div>
      <table><thead><tr><th>Claimed By</th><th>Exemption Type</th><th>Status</th><th></th></tr></thead><tbody>
        ${(rp.exemptionClaims||[]).map((c,ci)=>`<tr><td>${escapeHtml(c.claimedBy)}</td><td style="font-size:12px;">${escapeHtml(c.exemptionType||'')}</td><td><span class="badge ${c.status==='Pending'?'badge-missing':'badge-role'}">${escapeHtml(c.status)}</span></td><td><button class="btn-icon" data-edit-exc="${ci}">${ICONS.edit}</button></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:8px;font-size:12px;">None on file.</td></tr>`}
      </tbody></table>
      <button class="btn btn-sm btn-outline" id="btnAddExc" style="margin-top:6px;">${ICONS.plus} Add Exemption Claim</button>
      <div class="form-row" style="margin-top:10px;"><label>Notes</label><textarea id="fRpNotes" rows="2">${escapeHtml(rp.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot">
      ${editing ? `<button class="btn btn-outline" id="mDelete" style="margin-right:auto;color:var(--red);">Remove</button>` : ''}
      <button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  const readLienholders = ()=>{
    return Array.from(document.querySelectorAll('#fRpLienBody tr')).map(row=>({
      name: row.querySelector('.fRpLienName').value.trim(),
      amount: Number(row.querySelector('.fRpLienAmt').value)||0,
    })).filter(l=>l.name);
  };
  function readFormIntoDraft(){
    Object.assign(rp, {
      propertyAddress: document.getElementById('fRpAddress').value.trim(),
      realPropertyType: document.getElementById('fRpType').value, status: document.getElementById('fRpStatus').value,
      legalDescription: document.getElementById('fRpLegal').value.trim(), currentOwnerOfRecord: document.getElementById('fRpOwner').value.trim(),
      estimatedValue: Number(document.getElementById('fRpEst').value)||0,
      noticeOfLevyRecordedDate: document.getElementById('fRpNolDate').value||null, noticeOfLevyRecordingNumber: document.getElementById('fRpNolNum').value.trim(),
      lienholders: readLienholders(),
      appraisalValue: Number(document.getElementById('fRpAppraisal').value)||0, appraisedBy: document.getElementById('fRpAppraisedBy').value.trim(),
      appraisalDate: document.getElementById('fRpAppraisalDate').value||null,
      noticeOfSalePostedDate: document.getElementById('fRpNoticeDate').value||null, minimumBid: Number(document.getElementById('fRpMinBid').value)||0,
      saleDate: document.getElementById('fRpSaleDate').value||null, salePrice: Number(document.getElementById('fRpSalePrice').value)||0,
      buyerName: document.getElementById('fRpBuyer').value.trim(),
      certificateOfSaleIssuedDate: document.getElementById('fRpCertDate').value||null, redemptionPeriodEndDate: document.getElementById('fRpRedemptionEnd').value||null,
      redeemedDate: document.getElementById('fRpRedeemedDate').value||null, deedIssuedDate: document.getElementById('fRpDeedDate').value||null,
      releaseReason: document.getElementById('fRpReleaseReason').value.trim(), releasedDate: document.getElementById('fRpReleasedDate').value||null,
      disbursed: document.getElementById('fRpDisbursed').checked,
      notes: document.getElementById('fRpNotes').value.trim(),
    });
  }
  document.getElementById('btnAddLien').addEventListener('click', ()=>{
    readFormIntoDraft();
    rp.lienholders.push({name:'', amount:0});
    openRealPropertyLevyModal(p, e, editing?idx:null, editing?null:rp);
  });
  document.querySelectorAll('[data-remove-lien]').forEach(b=>b.addEventListener('click', ()=>{
    readFormIntoDraft();
    rp.lienholders.splice(Number(b.dataset.removeLien),1);
    openRealPropertyLevyModal(p, e, editing?idx:null, editing?null:rp);
  }));
  document.getElementById('btnAddTpc').addEventListener('click', ()=>{ readFormIntoDraft(); openThirdPartyClaimModal(p, e, 'real', editing?idx:null, rp, null); });
  document.querySelectorAll('[data-edit-tpc]').forEach(b=>b.addEventListener('click', ()=>{ readFormIntoDraft(); openThirdPartyClaimModal(p, e, 'real', editing?idx:null, rp, Number(b.dataset.editTpc)); }));
  document.getElementById('btnAddExc').addEventListener('click', ()=>{ readFormIntoDraft(); openExemptionClaimModal(p, e, 'real', editing?idx:null, rp, null); });
  document.querySelectorAll('[data-edit-exc]').forEach(b=>b.addEventListener('click', ()=>{ readFormIntoDraft(); openExemptionClaimModal(p, e, 'real', editing?idx:null, rp, Number(b.dataset.editExc)); }));
  const delBtn = document.getElementById('mDelete');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm('Remove this real property levy record?')) return;
    e.realPropertyLevies.splice(idx,1);
    logActivity(`Removed a real property levy from ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    closeModal();
    renderPaperDetailModal();
  });
  document.getElementById('mSave').onclick = ()=>{
    if(!document.getElementById('fRpAddress').value.trim()){ toast("Enter the property address.", true); return; }
    readFormIntoDraft();
    const record = { ...rp, id: editing ? rp.id : 'rp'+Date.now(),
      thirdPartyClaims: rp.thirdPartyClaims||[], exemptionClaims: rp.exemptionClaims||[], fieldHistory: rp.fieldHistory||[] };
    if(!e.realPropertyLevies) e.realPropertyLevies = [];
    if(editing) e.realPropertyLevies[idx] = record; else e.realPropertyLevies.push(record);
    logActivity(`${editing?'Updated':'Added'} a real property levy at "${record.propertyAddress}" for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Saved.");
    closeModal();
    renderPaperDetailModal();
  };
}

function openAddCreditModal(p, e){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Credit / Payment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Use this for money that reduces the judgment balance: a payment from the debtor, a remittance from a garnishee, or any other credit toward satisfaction.</div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fCrDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Amount</label><input type="number" id="fCrAmt" min="0" step="0.01"></div>
      </div>
      <div class="form-row"><label>Source</label><input type="text" id="fCrSource" placeholder="e.g. Garnishee remittance, debtor payment"></div>
      <div class="form-row"><label>Notes</label><textarea id="fCrNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const amount = Number(document.getElementById('fCrAmt').value)||0;
    if(amount<=0){ toast("Enter an amount.", true); return; }
    if(!e.creditsAndPayments) e.creditsAndPayments = [];
    e.creditsAndPayments.push({id:'cr'+Date.now(), date: document.getElementById('fCrDate').value, amount,
      source: document.getElementById('fCrSource').value.trim(), notes: document.getElementById('fCrNotes').value.trim()});
    logActivity(`Recorded a ${moneyPrecise(amount)} credit/payment for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Credit recorded.");
    closeModal();
    renderPaperDetailModal();
  };
}

function openAddDisbursementModal(p, e, prefill){
  const balance = enforcementBalance(e);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Disbursement</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">Use this to record money paid out (to the judgment creditor, county fees, or another payee) from funds already collected on this writ.</div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fDbDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Amount</label><input type="number" id="fDbAmt" min="0" step="0.01" value="${prefill&&prefill.amount?prefill.amount:''}"></div>
      </div>
      <div class="form-row"><label>Payee</label><input type="text" id="fDbPayee" placeholder="e.g. Judgment creditor, County General Fund" value="${prefill&&prefill.payee?escapeHtml(prefill.payee):''}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Method</label><select id="fDbMethod">${PAYMENT_METHODS.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="form-row"><label>Reference #</label><input type="text" id="fDbRef"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fDbNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const amount = Number(document.getElementById('fDbAmt').value)||0;
    const payee = document.getElementById('fDbPayee').value.trim();
    if(amount<=0 || !payee){ toast("Enter a payee and amount.", true); return; }
    if(!e.disbursements) e.disbursements = [];
    e.disbursements.push({id:'db'+Date.now(), date: document.getElementById('fDbDate').value, amount, payee,
      method: document.getElementById('fDbMethod').value, reference: document.getElementById('fDbRef').value.trim(),
      notes: document.getElementById('fDbNotes').value.trim()});
    logActivity(`Recorded a ${moneyPrecise(amount)} disbursement to ${payee} for ${p.caseNumber}.`, "civil_paper", p.id);
    persist();
    toast("Disbursement recorded.");
    closeModal();
    renderPaperDetailModal();
  };
}

/* =========================================================================
   LOG ATTEMPT / MARK SERVED
   ========================================================================= */
function openLogAttemptModal(paperId){
  const p = paperFor(paperId);
  const now = new Date();
  const cfg = feeConfigFor(p.paperType);
  const attemptNumber = p.attempts.length + 1;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Service Attempt \u2014 ${escapeHtml(p.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">This will be attempt #${attemptNumber}${cfg.requiredAttempts?` (agency guideline for ${escapeHtml(p.paperType)}: ${cfg.requiredAttempts} attempt${cfg.requiredAttempts===1?'':'s'} before returning unable to serve)`:''}.</div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fAttDate" value="${fmt(now)}"></div>
        <div class="form-row"><label>Time</label><input type="time" id="fAttTime" value="${now.toTimeString().slice(0,5)}"></div>
      </div>
      <div class="form-row"><label>Result</label><select id="fAttResult">${STATE.civil.refData.attemptResults.map(r=>`<option>${r}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Mileage for this attempt (optional)</label><input type="number" id="fAttMileage" min="0" step="0.1" placeholder="e.g. 12"></div>
        <div class="form-row">
          <label>Location (optional)</label>
          <button type="button" class="btn btn-outline btn-sm" id="btnCaptureGps" style="width:100%;justify-content:center;">${ICONS.mappin||'\ud83d\udccd'} Capture Current Location</button>
          <div id="gpsStatus" style="font-size:11px;color:var(--text-dim);margin-top:4px;"></div>
        </div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fAttNotes" rows="3" placeholder="What happened at this attempt?"></textarea></div>
      ${(attemptNumber>1 && cfg.additionalAttemptFee>0) ? `<div style="font-size:11px;color:var(--text-dim);">A ${money(cfg.additionalAttemptFee)} additional-attempt fee will be added to this paper's fee record automatically.</div>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Attempt</button></div>
  `;
  openModal();
  let capturedGps = null;
  document.getElementById('btnCaptureGps').addEventListener('click', ()=>{
    const status = document.getElementById('gpsStatus');
    if(!navigator.geolocation){ status.textContent = 'Location not available on this device.'; return; }
    status.textContent = 'Getting location\u2026';
    navigator.geolocation.getCurrentPosition(
      (pos)=>{ capturedGps = {lat: pos.coords.latitude, lng: pos.coords.longitude}; status.textContent = `Captured: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`; },
      (err)=>{ status.textContent = 'Could not get location (' + err.message + ').'; },
      {enableHighAccuracy:true, timeout:8000}
    );
  });
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const result = document.getElementById('fAttResult').value;
    const notes = document.getElementById('fAttNotes').value.trim();
    const mileage = Number(document.getElementById('fAttMileage').value) || 0;
    p.attempts.push({id:'att'+Date.now(), date: document.getElementById('fAttDate').value, time: document.getElementById('fAttTime').value,
      deputyId: p.assignedServerId||CURRENT_USER_ID, result, notes, mileage, gps: capturedGps});
    if(mileage>0){
      p.mileage = (p.mileage||0) + mileage;
      const rate = STATE.civil.refData.feeSchedule.mileageRatePerMile;
      if(rate>0) p.feeLineItems.push({id:'fee'+Date.now(), description:`Mileage (${mileage} mi @ $${rate.toFixed(2)}/mi)`, category:'Mileage', amount: Math.round(mileage*rate*100)/100});
    }
    if(attemptNumber>1 && cfg.additionalAttemptFee>0){
      p.feeLineItems.push({id:'fee'+Date.now()+1, description:`Attempt #${attemptNumber} Fee`, category:'Additional Attempt', amount: cfg.additionalAttemptFee});
    }
    if(p.stage==='Assigned') { p.stage = 'Attempting'; }
    logActivity(`Logged service attempt for ${p.caseNumber}: ${result}.`, "civil_paper", p.id);
    persist();
    toast("Attempt logged.");
    if(result==='Served'){
      closeModal();
      openMarkServedModal(p.id, notes);
    } else {
      PAPER_DETAIL_TAB = 'attempts';
      renderPaperDetailModal();
    }
  };
}

function openMarkServedModal(paperId, carryOverNotes){
  const p = paperFor(paperId);
  const now = new Date();
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Mark Served \u2014 ${escapeHtml(p.caseNumber)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Date Served</label><input type="date" id="fSrvDate" value="${fmt(now)}"></div>
        <div class="form-row"><label>Time Served</label><input type="time" id="fSrvTime" value="${now.toTimeString().slice(0,5)}"></div>
      </div>
      <div class="form-row"><label>Service Method</label><select id="fSrvMethod">${(feeConfigFor(p.paperType).allowedServiceMethods||STATE.civil.refData.serviceMethods).map(m=>`<option ${p.serviceMethod===m?'selected':''}>${m}</option>`).join('')}</select>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Limited to methods allowed for a ${escapeHtml(p.paperType)} (Admin &gt; Fee Schedule &amp; Rates controls this per paper type).</div>
      </div>
      <div class="form-row"><label>Served On (name of recipient)</label><input type="text" id="fSrvOnName" value="${escapeHtml(p.defendant)}" placeholder="Defendant's name, or name of person accepting substituted service"></div>
      <div class="form-row"><label>Notes for Return of Service</label><textarea id="fSrvNotes" rows="3">${escapeHtml(carryOverNotes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Confirm Served</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = ()=>{ closeModal(); if(ACTIVE_VIEW==='civil-board') renderBoard(); else if(ACTIVE_VIEW==='civil-mine') renderMyAssignments(); };
  document.getElementById('mCancel').onclick = document.getElementById('mClose').onclick;
  document.getElementById('mSave').onclick = ()=>{
    const servedOnName = document.getElementById('fSrvOnName').value.trim();
    if(!servedOnName){ toast("Enter who was served.", true); return; }
    const servedFields = {
      servedDate: document.getElementById('fSrvDate').value,
      servedTime: document.getElementById('fSrvTime').value,
      serviceMethod: document.getElementById('fSrvMethod').value,
      servedOnName,
    };
    Object.keys(servedFields).forEach(field=>recordFieldChangeCivil(p,field,p[field],servedFields[field]));
    Object.assign(p,servedFields);
    const notes = document.getElementById('fSrvNotes').value.trim();
    if(!p.attempts.some(a=>a.result==='Served')){
      p.attempts.push({id:'att'+Date.now(), date: p.servedDate, time: p.servedTime, deputyId: p.assignedServerId||CURRENT_USER_ID, result:'Served', notes});
    }
    recordFieldChangeCivil(p, 'stage', p.stage, 'Served');
    p.stage = 'Served';
    logActivity(`Marked ${p.caseNumber} served on ${servedOnName} via ${p.serviceMethod}.`, "civil_paper", p.id);
    persist();
    toast("Marked served.");
    PAPER_DETAIL_ID = p.id;
    PAPER_DETAIL_TAB = 'overview';
    renderPaperDetailModal();
  };
}

/* =========================================================================
   INTAKE / EDIT PAPER
   ========================================================================= */
function openIntakeModal(existingId){
  const editing = !!existingId;
  const p = editing ? paperFor(existingId) : {
    caseNumber:"", courtOfOrigin: STATE.civil.refData.courtsOfOrigin[0], paperType: STATE.civil.refData.paperTypes[0],
    plaintiff:"", defendant:"", attorneyOfRecord:"", receivedDate: fmt(new Date()), returnByDate: fmt(addDays(new Date(),21)),
    serviceAddresses:[{id:"addr1", address:"", isPrimary:true}], assignedServerId:null, notes:"",
    additionalPlaintiffs:[], additionalDefendants:[], witnesses:[],
  };
  // Deep copies of every editable list, so cancelling the form never mutates the real record.
  let cpAdditionalPlaintiffs = (p.additionalPlaintiffs||[]).map(x=>({...x}));
  let cpAdditionalDefendants = (p.additionalDefendants||[]).map(x=>({...x}));
  let cpWitnesses = (p.witnesses||[]).map(x=>({...x}));

  // A simple reusable name-list editor: used identically for additional plaintiffs, additional
  // defendants, and witnesses -- all three are "just a list of names," nothing fancier than the
  // address list needs (no primary flag, since the single main plaintiff/defendant field above
  // already covers that role).
  function wireSimpleNameList(containerId, addBtnId, arr){
    function render(){
      const host = document.getElementById(containerId);
      if(!host) return;
      host.innerHTML = arr.map((item,i)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <input type="text" data-idx="${i}" value="${escapeHtml(item.name)}" placeholder="Full name" style="flex:1;">
          <button type="button" class="btn-icon" data-remove="${i}" title="Remove" aria-label="Remove">${ICONS.trash}</button>
        </div>
      `).join('');
      host.querySelectorAll('[data-idx]').forEach(input=>input.addEventListener('input', ()=>{ arr[Number(input.dataset.idx)].name = input.value; }));
      host.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click', ()=>{ arr.splice(Number(btn.dataset.remove),1); render(); }));
    }
    document.getElementById(addBtnId).addEventListener('click', ()=>{
      arr.push({id:'party'+Date.now()+Math.random().toString(36).slice(2,5), name:''});
      render();
      const inputs = document.querySelectorAll(`#${containerId} [data-idx]`);
      inputs[inputs.length-1]?.focus();
    });
    render();
  }

  // Work on a deep copy of the existing addresses so cancelling the form never mutates the
  // real record, and so we can freely add/remove/reorder rows before Save is actually clicked.
  let cpAddresses = ((p.serviceAddresses||[]).length ? p.serviceAddresses : [{id:'addr1', address:'', isPrimary:true}])
    .map(a=>({...a}));
  if(!cpAddresses.some(a=>a.isPrimary)) cpAddresses[0].isPrimary = true;

  function renderCpAddressRows(){
    const host = document.getElementById('cpAddressList');
    if(!host) return;
    host.innerHTML = cpAddresses.map((a,i)=>`
      <div class="cp-address-row" data-addr-row="${i}" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <input type="text" data-addr-field="${i}" value="${escapeHtml(a.address)}" placeholder="Street, City, State ZIP" style="flex:1;">
        <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--text-dim);white-space:nowrap;cursor:pointer;font-weight:400;">
          <input type="radio" name="cpAddrPrimary" data-addr-primary="${i}" style="width:auto;" ${a.isPrimary?'checked':''}>Primary
        </label>
        <button type="button" class="btn-icon" data-addr-remove="${i}" title="Remove address" aria-label="Remove this address" ${cpAddresses.length<=1?'disabled':''}>${ICONS.trash}</button>
      </div>
    `).join('');
    host.querySelectorAll('[data-addr-field]').forEach(input=>input.addEventListener('input', ()=>{
      cpAddresses[Number(input.dataset.addrField)].address = input.value;
    }));
    host.querySelectorAll('[data-addr-primary]').forEach(radio=>radio.addEventListener('change', ()=>{
      const idx = Number(radio.dataset.addrPrimary);
      cpAddresses.forEach((a,i)=>a.isPrimary = i===idx);
    }));
    host.querySelectorAll('[data-addr-remove]').forEach(btn=>btn.addEventListener('click', ()=>{
      if(cpAddresses.length<=1) return;
      const idx = Number(btn.dataset.addrRemove);
      const wasPrimary = cpAddresses[idx].isPrimary;
      cpAddresses.splice(idx,1);
      if(wasPrimary && cpAddresses.length) cpAddresses[0].isPrimary = true;
      renderCpAddressRows();
    }));
  }

  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Intake New'} Civil Paper</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('civil.caseNumber')}</label><input type="text" id="fCpCase" value="${escapeHtml(p.caseNumber)}" placeholder="e.g. CV2026-00123"></div>
        <div class="form-row"><label>${fieldLabel('civil.paperType')}</label><select id="fCpType">${STATE.civil.refData.paperTypes.map(t=>`<option ${p.paperType===t?'selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('civil.courtOfOrigin')}</label><select id="fCpCourt">${STATE.civil.refData.courtsOfOrigin.map(c=>`<option ${p.courtOfOrigin===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="form-row"><label>Attorney of Record (or "Pro Se")</label><input type="text" id="fCpAttorney" value="${escapeHtml(p.attorneyOfRecord||'')}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('civil.plaintiff')} / Petitioner</label><input type="text" id="fCpPlaintiff" value="${escapeHtml(p.plaintiff)}"></div>
        <div class="form-row"><label>${fieldLabel('civil.defendant')} / Respondent</label><input type="text" id="fCpDefendant" value="${escapeHtml(p.defendant)}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row">
          <label>Additional Plaintiffs / Petitioners</label>
          <div id="cpAdditionalPlaintiffsList"></div>
          <button type="button" class="btn btn-sm btn-outline" id="btnCpAddPlaintiff" style="margin-top:2px;">${ICONS.plus} Add another plaintiff</button>
        </div>
        <div class="form-row">
          <label>Additional Defendants / Respondents</label>
          <div id="cpAdditionalDefendantsList"></div>
          <button type="button" class="btn btn-sm btn-outline" id="btnCpAddDefendant" style="margin-top:2px;">${ICONS.plus} Add another defendant</button>
        </div>
      </div>
      <div class="form-row">
        <label>Witnesses</label>
        <div id="cpWitnessesList"></div>
        <button type="button" class="btn btn-sm btn-outline" id="btnCpAddWitness" style="margin-top:2px;">${ICONS.plus} Add a witness</button>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">Common for civil subpoenas and cases naming more than one party on the same side.</div>
      </div>
      <div class="form-row">
        <label>Service Address(es)</label>
        <div id="cpAddressList"></div>
        <button type="button" class="btn btn-sm btn-outline" id="btnCpAddAddress" style="margin-top:2px;">${ICONS.plus} Add another address</button>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">Useful when a defendant may be found at more than one location (e.g. a home address and a place of employment) — on the record's Overview tab, clicking any address updates the map to that location. Mark one as Primary.</div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('civil.receivedDate')}</label><input type="date" id="fCpReceived" value="${p.receivedDate}"></div>
        <div class="form-row"><label>${fieldLabel('civil.returnByDate')}</label><input type="date" id="fCpReturnBy" value="${p.returnByDate}"></div>
      </div>
      <div class="form-row"><label>Assign To (optional)</label><select id="fCpAssign"><option value="">Leave unassigned</option>${STATE.personnel.map(person=>`<option value="${person.id}" ${p.assignedServerId===person.id?'selected':''}>${escapeHtml(person.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Notes</label><textarea id="fCpNotes" rows="2">${escapeHtml(p.notes||'')}</textarea></div>
      <div style="font-size:11px;color:var(--text-dim);">Per Arizona practice, all requests for service must be accompanied by signed instructions from the attorney of record or self-represented party \u2014 keep those on file with the physical paper.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Intake Paper'}</button></div>
  `;
  openModal();
  renderCpAddressRows();
  wireSimpleNameList('cpAdditionalPlaintiffsList', 'btnCpAddPlaintiff', cpAdditionalPlaintiffs);
  wireSimpleNameList('cpAdditionalDefendantsList', 'btnCpAddDefendant', cpAdditionalDefendants);
  wireSimpleNameList('cpWitnessesList', 'btnCpAddWitness', cpWitnesses);
  if(!editing){
    document.getElementById('fCpType').addEventListener('change', (ev)=>{
      const cfg = feeConfigFor(ev.target.value);
      document.getElementById('fCpReturnBy').value = fmt(addDays(new Date(document.getElementById('fCpReceived').value+'T00:00:00'), cfg.defaultDeadlineDays));
    });
  }
  document.getElementById('btnCpAddAddress').addEventListener('click', ()=>{
    cpAddresses.push({id:'addr'+Date.now(), address:'', isPrimary:false});
    renderCpAddressRows();
    const rows = document.querySelectorAll('#cpAddressList [data-addr-field]');
    rows[rows.length-1]?.focus();
  });
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const caseNumber = document.getElementById('fCpCase').value.trim();
    const defendant = document.getElementById('fCpDefendant').value.trim();
    if(!caseNumber || !defendant){ toast("Enter a case number and defendant.", true); return; }
    const paperType = document.getElementById('fCpType').value;
    const assignedServerId = document.getElementById('fCpAssign').value || null;
    const finalAddresses = cpAddresses.map(a=>({...a, address:a.address.trim()})).filter(a=>a.address);
    if(finalAddresses.length && !finalAddresses.some(a=>a.isPrimary)) finalAddresses[0].isPrimary = true;
    const finalPlaintiffs = cpAdditionalPlaintiffs.map(x=>({...x, name:x.name.trim()})).filter(x=>x.name);
    const finalDefendants = cpAdditionalDefendants.map(x=>({...x, name:x.name.trim()})).filter(x=>x.name);
    const finalWitnesses = cpWitnesses.map(x=>({...x, name:x.name.trim()})).filter(x=>x.name);
    if(!editing){
      // A single court case commonly generates more than one physical paper over its life --
      // a Summons & Complaint today, a Writ of Garnishment once judgment is entered, maybe a
      // Writ of Execution after that -- all sharing one case number. So the case number alone
      // is deliberately NOT unique. What *is* worth flagging is the same case number with the
      // same paper type already on file, since that's the pattern a genuine accidental
      // re-entry would produce, not a new document in the case's normal lifecycle.
      const dupeCase = STATE.civil.papers.find(x=>x.caseNumber.trim().toLowerCase()===caseNumber.toLowerCase() && x.paperType===paperType);
      if(dupeCase && !confirm(`A ${paperType} for case "${caseNumber}" is already on file (${dupeCase.stage}). Intake this as a separate paper anyway?`)) return;
      const primaryAddr = (finalAddresses.find(a=>a.isPrimary)||finalAddresses[0]||{}).address||'';
      const dupeParty = STATE.civil.papers.find(x=>x.defendant.trim().toLowerCase()===defendant.toLowerCase() &&
        primaryAddr && (x.serviceAddresses||[]).some(a=>a.address.trim().toLowerCase()===primaryAddr.toLowerCase()));
      if(dupeParty && !confirm(`${defendant} at this address already has an open or recent paper on file (${dupeParty.caseNumber}, ${dupeParty.paperType}). Intake this as a separate paper anyway?`)) return;
    }
    const data = {
      caseNumber, paperType, courtOfOrigin: document.getElementById('fCpCourt').value,
      attorneyOfRecord: document.getElementById('fCpAttorney').value.trim(),
      plaintiff: document.getElementById('fCpPlaintiff').value.trim(), defendant,
      additionalPlaintiffs: finalPlaintiffs, additionalDefendants: finalDefendants, witnesses: finalWitnesses,
      serviceAddresses: finalAddresses,
      receivedDate: document.getElementById('fCpReceived').value, returnByDate: document.getElementById('fCpReturnBy').value,
      assignedServerId, notes: document.getElementById('fCpNotes').value.trim(),
      priority: PRIORITY_PAPER_TYPES.includes(paperType) ? "Immediate" : "Standard",
    };
    if(editing){
      Object.keys(data).forEach(field=>recordFieldChangeCivil(p,field,p[field],data[field]));
      Object.assign(p, data);
      logActivity(`Updated civil paper ${caseNumber}.`, "civil_paper", p.id);
      toast("Paper updated.");
    } else {
      const cfg = feeConfigFor(paperType);
      const feeLineItems = cfg.baseFee>0 ? [{id:'fee'+Date.now(), description:'Base Service Fee', category:'Base Service Fee', amount: cfg.baseFee}] : [];
      const newP = {id:'cp'+Date.now(), stage: assignedServerId?'Assigned':'Unassigned', serviceMethod:null, attempts:[],
        servedDate:null, servedTime:null, servedOnName:null, feeLineItems, feePayments:[], mileage:0, returnFiledDate:null,
        generatedDocuments:[], photos:[], safetyFlags:[], fieldHistory:[], ...data};
      STATE.civil.papers.push(newP);
      logActivity(`Intook new civil paper ${caseNumber} (${paperType}).`, "civil_paper", newP.id);
      toast(cfg.feeWaived ? "Paper intaken. Note: this paper type is customarily fee-exempt \u2014 record a Fee Waiver payment on the Fees tab if applicable." : "Paper intaken.");
    }
    persist();
    closeModal();
    if(ACTIVE_VIEW==='civil-board') renderBoard();
  };
}

/* =========================================================================
   GENERATED RETURN OF SERVICE / AFFIDAVIT OF SERVICE (or NON-SERVICE)
   Formatted to match the real structure required under Arizona Rule 4.1(g):
   endorsement by the sheriff/deputy, or affidavit (with county of registration)
   by any other person effecting service -- a real proof-of-service document,
   not just a status label.
   ========================================================================= */
function openGenerateDocReasonModal(p){
  const isNonService = p.stage==='Unable to Serve';
  const docType = isNonService ? 'Affidavit of Non-Service' : 'Return of Service';
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Generate ${docType}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Reason for Generating This Copy</label>
        <textarea id="fDocReason" rows="3" placeholder="e.g. Original copy for court filing, re-issued at attorney's request, replacing a lost or damaged original, generated for internal case review, etc."></textarea>
      </div>
      <div style="font-size:11px;color:var(--text-dim);">This explanation is saved permanently with this copy and printed on the document itself, alongside the date and time it was generated.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Generate</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const reason = document.getElementById('fDocReason').value.trim();
    if(!reason){ toast("Enter a reason for generating this document.", true); return; }
    closeModal();
    generateReturnOfService(p, reason);
  };
}

function generateReturnOfService(p, reason){
  if(!p.servedDate && p.stage!=='Unable to Serve'){
    toast("Mark this paper served (or unable to serve) before generating a return.", true);
    return;
  }
  reason = (reason||'').trim() || 'Not specified';
  const isNonService = p.stage==='Unable to Serve';
  const docType = isNonService ? 'Affidavit of Non-Service' : 'Return of Service';
  const server = STATE.personnel.find(pp=>pp.id===p.assignedServerId) || {};
  const attemptsHtml = p.attempts.map((a,i)=>`
    <tr><td>${i+1}</td><td>${a.date} at ${a.time}</td><td>${escapeHtml(a.result)}</td><td>${escapeHtml(a.notes||'')}</td></tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center;color:#666;">No attempts logged.</td></tr>`;

  const feeRows = p.feeLineItems.map(f=>`<tr><td>${escapeHtml(f.description)}</td><td style="text-align:right;">$${f.amount.toFixed(2)}</td></tr>`).join('');
  const totalOwed = feeTotalOwed(p);

  const bodyNarrative = isNonService
    ? `That after diligent search and inquiry, affiant was unable to effect service of the within ${escapeHtml(p.paperType)} upon ${escapeHtml(p.defendant)}, as detailed in the attempt log below.`
    : `That on ${p.servedDate} at approximately ${p.servedTime}, affiant served the within ${escapeHtml(p.paperType)} upon ${escapeHtml(p.servedOnName||p.defendant)} by means of ${escapeHtml(p.serviceMethod||'personal service')}, at the address of ${escapeHtml(((p.serviceAddresses||[])[0]||{}).address||'')}.`;

  // A precise, permanent generation timestamp -- used both in the printed document itself and as
  // the record kept in the paper's saved-document archive, so there's never any ambiguity later
  // about exactly when a given copy was produced.
  const now = new Date();
  const generatedDate = fmt(now);
  const generatedTime = now.toTimeString().slice(0,8);
  const timestampDisplay = `${generatedDate} at ${generatedTime}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docType} - ${escapeHtml(p.caseNumber)} - Generated ${timestampDisplay}</title>
  <link rel="stylesheet" href="assets/css/print.css"><link rel="stylesheet" href="assets/css/workspace-overrides.css">
</head><body>
    <div class="no-print"><button onclick="window.print()" style="padding:8px 16px;font-size:14px;">Print / Save as PDF</button></div>
    <div class="caption-box">
      <div class="caption-row"><strong>${escapeHtml(p.courtOfOrigin).toUpperCase()}</strong></div>
      <div class="caption-row"><span>Case No. ${escapeHtml(p.caseNumber)}</span></div>
    </div>
    <div class="reason-box"><strong>Reason for This Copy:</strong> ${escapeHtml(reason)}</div>
    <div class="party-block">
      <strong>${escapeHtml(p.plaintiff)}</strong>${(p.additionalPlaintiffs||[]).length?`, et al.`:''},<br>Plaintiff${(p.additionalPlaintiffs||[]).length?'s':''} / Petitioner${(p.additionalPlaintiffs||[]).length?'s':''},<br><br>
      v.<br><br>
      <strong>${escapeHtml(p.defendant)}</strong>${(p.additionalDefendants||[]).length?`, et al.`:''},<br>Defendant${(p.additionalDefendants||[]).length?'s':''} / Respondent${(p.additionalDefendants||[]).length?'s':''}.
    </div>
    ${((p.additionalPlaintiffs||[]).length || (p.additionalDefendants||[]).length || (p.witnesses||[]).length) ? `
    <div class="party-block" style="font-size:12px;">
      ${(p.additionalPlaintiffs||[]).length ? `<div><strong>Additional Plaintiffs/Petitioners:</strong> ${(p.additionalPlaintiffs||[]).map(x=>escapeHtml(x.name)).join('; ')}</div>` : ''}
      ${(p.additionalDefendants||[]).length ? `<div><strong>Additional Defendants/Respondents:</strong> ${(p.additionalDefendants||[]).map(x=>escapeHtml(x.name)).join('; ')}</div>` : ''}
      ${(p.witnesses||[]).length ? `<div><strong>Witnesses:</strong> ${(p.witnesses||[]).map(x=>escapeHtml(x.name)).join('; ')}</div>` : ''}
    </div>` : ''}
    <h1>${docType}</h1>
    <p>I, ${escapeHtml(server.name||'the undersigned')}, being first duly sworn upon oath, depose and state that I am over the age of twenty-one (21) years, am not a party to this action, and am competent to make this affidavit.</p>
    <p>${bodyNarrative}</p>
    <table><thead><tr><th>#</th><th>Date / Time</th><th>Result</th><th>Notes</th></tr></thead><tbody>${attemptsHtml}</tbody></table>
    ${p.feeLineItems.length ? `
    <p><strong>Fees Charged:</strong></p>
    <table><tbody>${feeRows}<tr class="fee-total-row"><td>Total</td><td style="text-align:right;">$${totalOwed.toFixed(2)}</td></tr></tbody></table>
    ` : ''}
    <p>I declare under penalty of perjury under the laws of the State of Arizona that the foregoing is true and correct.</p>
    <div class="sig-block">
      <div class="sig-line">Signature of Server — ${escapeHtml(server.name||'')}${server.badge?' (Badge #'+escapeHtml(server.badge)+')':''}</div>
    </div>
    <div class="jurat">
      Subscribed and sworn to before me this _____ day of ______________, ${new Date().getFullYear()}.
      <div class="sig-block"><div class="sig-line">Notary Public / Deputy Clerk</div></div>
    </div>
    <div style="margin-top:40px;font-size:11px;color:#666;text-align:center;">Generated ${timestampDisplay} \u2014 Civil Process Module, per Arizona Rule of Civil Procedure 4.1(g)</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();

  // Save a permanent, timestamped copy alongside the paper's own record -- opening a new tab is
  // ephemeral (lost the moment it's closed without an explicit save), so this is the real "save a
  // copy" behavior: a durable archival entry that always reflects exactly what was generated,
  // even if the underlying paper's data changes later.
  if(!p.generatedDocuments) p.generatedDocuments = [];
  p.generatedDocuments.push({id:'doc'+Date.now(), type:docType, generatedDate, generatedTime, generatedBy: personName(CURRENT_USER_ID), reason, html});

  logActivity(`Generated and saved a copy of the ${docType} for ${p.caseNumber} (${timestampDisplay}). Reason: ${reason}`, "civil_paper", p.id);
  persist();
  toast(`${docType} generated and saved with a timestamp.`);
  // The reason-prompt modal replaced the paper detail modal's content entirely (this app uses one
  // shared modal element, not stacked modals), so re-open the detail modal properly rather than try
  // to update DOM that the reason prompt already overwrote and closed.
  if(PAPER_DETAIL_ID===p.id){ PAPER_DETAIL_TAB = 'documents'; renderPaperDetailModal(); }
}

function viewSavedDocument(p, docId){
  const doc = (p.generatedDocuments||[]).find(d=>d.id===docId);
  if(!doc) return;
  const win = window.open('', '_blank');
  win.document.write(doc.html);
  win.document.close();
}

/* =========================================================================
   MY ASSIGNMENTS (server-facing simplified view)
   ========================================================================= */
/* =========================================================================
   MASTER CALENDAR (department-wide, every return-by date across the unit)
   ========================================================================= */
let CIVIL_CAL_YEAR = new Date().getFullYear(), CIVIL_CAL_MONTH = new Date().getMonth();
let CIVIL_CAL_FILTER_TYPE = '', CIVIL_CAL_FILTER_ASSIGNED = '', CIVIL_CAL_FILTER_RANGE = 'month';

/* =========================================================================
   PARTY & ADDRESS LOOKUP (cross-case history -- has this name or address
   shown up in any prior civil process activity, regardless of stage?)
   ========================================================================= */
let PARTY_LOOKUP_QUERY = '';

function partyLookupMatches(query){
  const q = query.trim().toLowerCase();
  if(!q) return [];
  return STATE.civil.papers.map(p=>{
    const matchedAs = [];
    if(p.plaintiff && p.plaintiff.toLowerCase().includes(q)) matchedAs.push('Plaintiff: '+p.plaintiff);
    if(p.defendant && p.defendant.toLowerCase().includes(q)) matchedAs.push('Defendant: '+p.defendant);
    (p.additionalPlaintiffs||[]).forEach(x=>{ if(x.name.toLowerCase().includes(q)) matchedAs.push('Plaintiff: '+x.name); });
    (p.additionalDefendants||[]).forEach(x=>{ if(x.name.toLowerCase().includes(q)) matchedAs.push('Defendant: '+x.name); });
    (p.witnesses||[]).forEach(x=>{ if(x.name.toLowerCase().includes(q)) matchedAs.push('Witness: '+x.name); });
    (p.serviceAddresses||[]).forEach(a=>{ if(a.address.toLowerCase().includes(q)) matchedAs.push('Address: '+a.address); });
    return matchedAs.length ? {paper:p, matchedAs} : null;
  }).filter(Boolean).sort((a,b)=>b.paper.receivedDate.localeCompare(a.paper.receivedDate));
}

function renderPartyLookup(){
  const results = partyLookupMatches(PARTY_LOOKUP_QUERY);
  document.getElementById('view-civil-lookup').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-body">
        <div class="form-row" style="margin-bottom:0;">
          <label>Search a name or address</label>
          <input type="text" id="partyLookupInput" placeholder="e.g. John Smith, or 123 Main St" value="${escapeHtml(PARTY_LOOKUP_QUERY)}">
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:6px;">Searches every civil paper on file, across every stage and every case — not just what's currently active on the board. Useful for "has this person or address come up before, and was there ever a safety concern?"</div>
      </div>
    </div>
    ${PARTY_LOOKUP_QUERY.trim() ? `
    <div class="panel">
      <div class="panel-head"><h2>Results</h2><span class="hint">${results.length} paper${results.length===1?'':'s'}</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Case #</th><th>Paper Type</th><th>Matched As</th><th>Stage</th><th>Received</th><th>Safety</th><th></th></tr></thead><tbody>
        ${results.map(r=>{
          const hasActiveSafety = (r.paper.safetyFlags||[]).some(f=>f.active && (!f.expiresDate || f.expiresDate>=fmt(new Date())));
          return `<tr>
            <td>${escapeHtml(r.paper.caseNumber)}</td>
            <td>${escapeHtml(r.paper.paperType)}</td>
            <td style="font-size:12px;">${r.matchedAs.map(m=>escapeHtml(m)).join('<br>')}</td>
            <td><span class="badge" style="background:${stageColor(r.paper.stage)}22;color:${stageColor(r.paper.stage)};">${r.paper.stage}</span></td>
            <td>${r.paper.receivedDate}</td>
            <td>${hasActiveSafety ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--red);font-weight:700;font-size:11px;"><span style="width:13px;height:13px;display:inline-flex;">${ICONS.alert||'\u26A0'}</span> Flagged</span>` : ''}</td>
            <td><button class="btn btn-sm btn-outline" data-open-lookup-result="${r.paper.id}">Open</button></td>
          </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No matches on file.</td></tr>`}
        </tbody></table>
      </div>
    </div>` : ''}
  `;
  const input = document.getElementById('partyLookupInput');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  input.addEventListener('input', ()=>{ PARTY_LOOKUP_QUERY = input.value; renderPartyLookup(); refocusFilterInput('partyLookupInput'); });
  document.querySelectorAll('[data-open-lookup-result]').forEach(b=>b.addEventListener('click', ()=>openPaperDetail(b.dataset.openLookupResult)));
}

function renderMasterCalendarCivil(){
  const year = CIVIL_CAL_YEAR, month = CIVIL_CAL_MONTH;
  const monthStr = String(month+1).padStart(2,'0');
  const today = fmt(new Date());

  // Base set: every open paper (not yet served/returned/cancelled), narrowed by the paper-type
  // and assigned-to filters. Date narrowing happens separately below, since it depends on which
  // view mode is active (month grid vs. a relative day-range list).
  const openPapers = STATE.civil.papers.filter(p=>!['Served','Returned to Court','Cancelled'].includes(p.stage));
  const filtered = openPapers.filter(p=>
    (!CIVIL_CAL_FILTER_TYPE || p.paperType===CIVIL_CAL_FILTER_TYPE) &&
    (!CIVIL_CAL_FILTER_ASSIGNED || (CIVIL_CAL_FILTER_ASSIGNED==='__unassigned__' ? !p.assignedServerId : p.assignedServerId===CIVIL_CAL_FILTER_ASSIGNED))
  );

  const assignedOptions = STATE.personnel
    .filter(pr=>openPapers.some(p=>p.assignedServerId===pr.id))
    .sort((a,b)=>a.name.localeCompare(b.name));

  const filterBar = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
      <select id="civilCalFilterType" style="min-width:160px;">
        <option value="">All Paper Types</option>
        ${STATE.civil.refData.paperTypes.map(t=>`<option value="${escapeHtml(t)}" ${CIVIL_CAL_FILTER_TYPE===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}
      </select>
      <select id="civilCalFilterAssigned" style="min-width:160px;">
        <option value="">All Staff</option>
        <option value="__unassigned__" ${CIVIL_CAL_FILTER_ASSIGNED==='__unassigned__'?'selected':''}>Unassigned</option>
        ${assignedOptions.map(pr=>`<option value="${pr.id}" ${CIVIL_CAL_FILTER_ASSIGNED===pr.id?'selected':''}>${escapeHtml(pr.name)}</option>`).join('')}
      </select>
      <select id="civilCalFilterRange" style="min-width:170px;">
        <option value="month" ${CIVIL_CAL_FILTER_RANGE==='month'?'selected':''}>This Month (calendar view)</option>
        <option value="3" ${CIVIL_CAL_FILTER_RANGE==='3'?'selected':''}>Due in next 3 days</option>
        <option value="5" ${CIVIL_CAL_FILTER_RANGE==='5'?'selected':''}>Due in next 5 days</option>
        <option value="7" ${CIVIL_CAL_FILTER_RANGE==='7'?'selected':''}>Due in next 7 days (1 week)</option>
        <option value="14" ${CIVIL_CAL_FILTER_RANGE==='14'?'selected':''}>Due in next 14 days (2 weeks)</option>
        <option value="30" ${CIVIL_CAL_FILTER_RANGE==='30'?'selected':''}>Due in next 30 days</option>
        <option value="overdue" ${CIVIL_CAL_FILTER_RANGE==='overdue'?'selected':''}>Overdue</option>
      </select>
      ${(CIVIL_CAL_FILTER_TYPE||CIVIL_CAL_FILTER_ASSIGNED||CIVIL_CAL_FILTER_RANGE!=='month') ? `<button class="btn btn-sm btn-outline" id="civilCalFilterClear">Clear Filters</button>` : ''}
    </div>
  `;

  let body;
  if(CIVIL_CAL_FILTER_RANGE==='month'){
    const inMonth = filtered.filter(p=>p.returnByDate.startsWith(`${year}-${monthStr}`));
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const startWeekday = firstOfMonth.getDay();
    const monthName = firstOfMonth.toLocaleString('en-US', {month:'long'});
    const byDate = {};
    inMonth.forEach(p=>{ (byDate[p.returnByDate] = byDate[p.returnByDate]||[]).push(p); });

    let cells = '';
    for(let i=0;i<startWeekday;i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
    for(let d=1; d<=daysInMonth; d++){
      const dateStr = `${year}-${monthStr}-${String(d).padStart(2,'0')}`;
      const todays = byDate[dateStr] || [];
      const isToday = dateStr === today;
      const isPast = dateStr < today;
      cells += `<div class="cal-cell ${isToday?'cal-cell-today':''}">
        <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday+d-1)%7]}">${d}</div>
        ${todays.map(p=>`<a href="#" data-cal-event="${p.id}" class="cal-event" style="background:${stageColor(p.stage)}22;color:${isPast?'var(--red)':stageColor(p.stage)};border-left:3px solid ${isPast?'var(--red)':stageColor(p.stage)};" title="${escapeHtml(p.caseNumber)} \u2014 ${escapeHtml(p.defendant)}">${escapeHtml(p.caseNumber)} \u2014 ${escapeHtml(p.defendant)}</a>`).join('')}
      </div>`;
    }
    body = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-sm btn-outline" data-civilcal-nav="prev">&larr;</button>
          <h2 style="margin:0;min-width:170px;text-align:center;">${monthName} ${year}</h2>
          <button class="btn btn-sm btn-outline" data-civilcal-nav="next">&rarr;</button>
          <button class="btn btn-sm btn-outline" data-civilcal-nav="today">Today</button>
        </div>
        ${can('civil_paper_intake') ? `<button class="btn btn-primary btn-sm" id="btnNewPaperFromCal">${ICONS.plus} Intake New Paper</button>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every open paper's return-by deadline across the unit, labeled by case number and defendant. Papers already served, returned, or cancelled aren't shown. Dates in red are past due. Click an event for full details.</div>
      <div class="cal-grid-head">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div>${d}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
    `;
  } else {
    // A relative day-range or "overdue" is selected: a focused list, grouped by day, reads far
    // better here than a mostly-empty month grid -- especially since a "next 5 days" window
    // routinely spans a month boundary and wouldn't sensibly fit one grid anyway.
    const rangeLabel = CIVIL_CAL_FILTER_RANGE==='overdue' ? 'Overdue' : `Due in the next ${CIVIL_CAL_FILTER_RANGE} days`;
    const windowed = CIVIL_CAL_FILTER_RANGE==='overdue'
      ? filtered.filter(p=>p.returnByDate < today)
      : filtered.filter(p=>p.returnByDate >= today && p.returnByDate <= fmt(addDays(new Date(), Number(CIVIL_CAL_FILTER_RANGE))));
    windowed.sort((a,b)=>a.returnByDate.localeCompare(b.returnByDate));
    const byDate = {};
    windowed.forEach(p=>{ (byDate[p.returnByDate] = byDate[p.returnByDate]||[]).push(p); });
    const dateKeys = Object.keys(byDate).sort();
    body = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;">${rangeLabel}</h2>
        ${can('civil_paper_intake') ? `<button class="btn btn-primary btn-sm" id="btnNewPaperFromCal">${ICONS.plus} Intake New Paper</button>` : ''}
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">${windowed.length} open paper${windowed.length===1?'':'s'} match${windowed.length===1?'es':''} the filters above. Papers already served, returned, or cancelled aren't shown.</div>
      ${dateKeys.length ? dateKeys.map(dateStr=>{
        const isPast = dateStr < today;
        const dayLabel = new Date(dateStr+'T00:00:00').toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
        return `<div style="margin-bottom:16px;">
          <div style="font-size:12.5px;font-weight:700;color:${isPast?'var(--red)':'var(--text-dim)'};margin-bottom:6px;">${dayLabel}${isPast?' \u2014 PAST DUE':''}</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${byDate[dateStr].map(p=>`<a href="#" data-cal-event="${p.id}" class="cal-event" style="display:block;padding:8px 12px;background:${stageColor(p.stage)}15;color:var(--text);border-left:3px solid ${isPast?'var(--red)':stageColor(p.stage)};border-radius:6px;">
              <strong>${escapeHtml(p.caseNumber)}</strong> \u2014 ${escapeHtml(p.defendant)}
              <span style="color:var(--text-dim);font-size:12px;"> &bull; ${escapeHtml(p.paperType)}${p.assignedServerId?` &bull; ${escapeHtml(personName(p.assignedServerId))}`:' &bull; Unassigned'}</span>
            </a>`).join('')}
          </div>
        </div>`;
      }).join('') : `<div style="text-align:center;color:var(--text-dim);padding:30px;">Nothing matches this filter.</div>`}
    `;
  }

  document.getElementById('view-civil-calendar').innerHTML = filterBar + body;
  document.getElementById('civilCalFilterType').addEventListener('change', (ev)=>{ CIVIL_CAL_FILTER_TYPE = ev.target.value; renderMasterCalendarCivil(); });
  document.getElementById('civilCalFilterAssigned').addEventListener('change', (ev)=>{ CIVIL_CAL_FILTER_ASSIGNED = ev.target.value; renderMasterCalendarCivil(); });
  document.getElementById('civilCalFilterRange').addEventListener('change', (ev)=>{ CIVIL_CAL_FILTER_RANGE = ev.target.value; renderMasterCalendarCivil(); });
  const clearBtn = document.getElementById('civilCalFilterClear');
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ CIVIL_CAL_FILTER_TYPE=''; CIVIL_CAL_FILTER_ASSIGNED=''; CIVIL_CAL_FILTER_RANGE='month'; renderMasterCalendarCivil(); });
  document.querySelectorAll('[data-civilcal-nav]').forEach(b=>b.addEventListener('click', ()=>{
    const dir = b.dataset.civilcalNav;
    if(dir==='prev'){ CIVIL_CAL_MONTH--; if(CIVIL_CAL_MONTH<0){CIVIL_CAL_MONTH=11;CIVIL_CAL_YEAR--;} }
    else if(dir==='next'){ CIVIL_CAL_MONTH++; if(CIVIL_CAL_MONTH>11){CIVIL_CAL_MONTH=0;CIVIL_CAL_YEAR++;} }
    else { CIVIL_CAL_YEAR = new Date().getFullYear(); CIVIL_CAL_MONTH = new Date().getMonth(); }
    renderMasterCalendarCivil();
  }));
  document.querySelectorAll('[data-cal-event]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openPaperDetail(a.dataset.calEvent); }));
  const newBtn = document.getElementById('btnNewPaperFromCal');
  if(newBtn) newBtn.addEventListener('click', ()=>openIntakeModal(null));
}

function renderMyAssignments(){
  if(!can('civil_paper_view_own')){
    document.getElementById('view-civil-mine').innerHTML = permissionBlockedView("You don't have permission to view your assignments in this role.");
    return;
  }
  const canLog = can('civil_paper_log_attempt');
  const mine = STATE.civil.papers.filter(p=>p.assignedServerId===CURRENT_USER_ID && !['Returned to Court','Cancelled'].includes(p.stage));
  mine.sort((a,b)=>{
    if(a.priority!==b.priority) return a.priority==='Immediate'?-1:1;
    return a.returnByDate.localeCompare(b.returnByDate);
  });
  const cards = mine.map(p=>{
    const days = daysBetween(fmt(new Date()), p.returnByDate);
    const primaryAddr = ((p.serviceAddresses||[]).find(a=>a.isPrimary)||(p.serviceAddresses||[])[0]||{}).address||'';
    const hasActiveSafety = (p.safetyFlags||[]).some(f=>f.active && (!f.expiresDate || f.expiresDate>=fmt(new Date())));
    return `
    <div class="drone-card ${p.priority==='Immediate'?'civil-card-priority':''}">
      ${p.priority==='Immediate' ? `<div class="civil-card-priority-tag">PRIORITY</div>` : ''}
      <div style="font-size:16px;font-weight:800;">${escapeHtml(p.caseNumber)}</div>
      <div style="font-size:11.5px;color:var(--blue);font-weight:700;margin:2px 0 8px;">${escapeHtml(p.paperType)}</div>
      <div style="font-size:12.5px;margin-bottom:10px;"><strong>Defendant:</strong> ${escapeHtml(p.defendant)}</div>
      ${hasActiveSafety ? `<div style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px;"><span style="width:13px;height:13px;display:inline-flex;">${ICONS.alert||'\u26A0'}</span> Safety flag on file</div>` : ''}
      <div style="font-size:12.5px;margin-bottom:6px;display:flex;align-items:center;gap:5px;"><span style="width:13px;height:13px;flex-shrink:0;display:inline-flex;">${ICONS.mappin}</span> ${escapeHtml(primaryAddr||'No address on file')}</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;">
        <span class="badge" style="background:${stageColor(p.stage)}22;color:${stageColor(p.stage)};">${p.stage}</span>
        <span style="${days<0?'color:var(--red);font-weight:700;':'color:var(--text-dim);'}">Return by ${p.returnByDate}</span>
      </div>
      <div class="cell-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);justify-content:flex-start;gap:8px;flex-wrap:wrap;">
        ${canLog ? `<button class="btn btn-sm btn-outline" data-view-mine="${p.id}">View / Log Attempt</button>` : ''}
        ${primaryAddr ? `<a class="btn btn-sm btn-outline" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(primaryAddr)}" target="_blank" rel="noopener">${ICONS.mappin} Navigate</a>` : ''}
      </div>
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.clipboardcheck}<div class="msg">No papers currently assigned to you</div></div>`;

  document.getElementById('view-civil-mine').innerHTML = `
    ${!canLog ? lockedNote("You're viewing your assignments in read-only mode.") : ""}
    ${mine.length ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">Sorted for today's route: priority papers first, then by return-by date. Tap Navigate on any card for turn-by-turn directions to that address.</div>` : ''}
    <div class="k9-card-grid">${cards}</div>
  `;
  document.querySelectorAll('[data-view-mine]').forEach(b=>b.addEventListener('click', ()=>openPaperDetail(b.dataset.viewMine)));
}

/* =========================================================================
   REPORTS & ANALYTICS (including full fee reconciliation summary)
   ========================================================================= */
function renderReports(){
  if(!can('civil_reports_view')){
    document.getElementById('view-civil-reports').innerHTML = permissionBlockedView("You don't have permission to view Civil Process reports in this role.");
    return;
  }
  const canExport = can('civil_reports_export');
  const papers = STATE.civil.papers;
  const today = fmt(new Date());
  const activeStages = ['Unassigned','Assigned','Attempting'];
  const closedPapers = papers.filter(p=>['Served','Returned to Court'].includes(p.stage));

  // --- Service performance -------------------------------------------------
  const served = papers.filter(p=>p.servedDate);
  const avgAttempts = served.length ? served.reduce((s,p)=>s+(p.attempts||[]).length,0)/served.length : 0;
  const papersWithFirstAttempt = papers.filter(p=>(p.attempts||[]).length);
  const avgDaysToFirstAttempt = papersWithFirstAttempt.length
    ? papersWithFirstAttempt.reduce((s,p)=>s+Math.max(0,daysBetween(p.receivedDate, p.attempts[0].date)),0)/papersWithFirstAttempt.length : 0;
  const avgDaysToCompletion = served.length
    ? served.reduce((s,p)=>s+Math.max(0,daysBetween(p.receivedDate, p.servedDate)),0)/served.length : 0;
  const successRate = closedPapers.length ? Math.round(100*served.length/closedPapers.length) : null;

  // --- Workload by deputy ----------------------------------------------------
  const deputyIds = [...new Set(papers.filter(p=>p.assignedServerId).map(p=>p.assignedServerId))];
  const deputyRows = deputyIds.map(id=>{
    const mine = papers.filter(p=>p.assignedServerId===id);
    const active = mine.filter(p=>activeStages.includes(p.stage)).length;
    const servedMine = mine.filter(p=>p.servedDate);
    const avgDays = servedMine.length ? Math.round(servedMine.reduce((s,p)=>s+Math.max(0,daysBetween(p.receivedDate,p.servedDate)),0)/servedMine.length) : null;
    return { name: personName(id), active, completed: servedMine.length, avgDays };
  }).sort((a,b)=>b.active-a.active);

  // --- Papers approaching expiration (next 7 days) & outstanding returns ---
  const expiringSoon = papers.filter(p=>activeStages.includes(p.stage) && daysBetween(today,p.returnByDate)>=0 && daysBetween(today,p.returnByDate)<=7)
    .sort((a,b)=>a.returnByDate.localeCompare(b.returnByDate));
  const outstandingReturns = papers.filter(p=>['Served','Unable to Serve'].includes(p.stage) && !(p.generatedDocuments||[]).length);

  // --- Enforcement rollup ----------------------------------------------------
  const enforcements = STATE.civil.enforcements||[];
  const enfTotalJudgment = enforcements.reduce((s,e)=>s+e.judgmentAmount,0);
  const enfTotalCollected = enforcements.reduce((s,e)=>s+enforcementTotalCollected(e),0);
  const enfTotalOutstanding = enforcements.reduce((s,e)=>s+Math.max(0,enforcementBalance(e)),0);
  const enfByStatus = {}; SATISFACTION_STATUSES.forEach(s=>enfByStatus[s]=0);
  enforcements.forEach(e=>enfByStatus[e.satisfactionStatus]=(enfByStatus[e.satisfactionStatus]||0)+1);

  const totalOwed = papers.reduce((s,p)=>s+feeTotalOwed(p),0);
  const totalReceived = papers.reduce((s,p)=>s+feeTotalReceived(p),0);
  const totalOutstanding = papers.reduce((s,p)=>s+Math.max(0,feeBalance(p)),0);
  const waivedCount = papers.filter(p=>feeReconciliationStatus(p)==='Waived').length;

  // --- Aging: outstanding fee balances bucketed by days since the paper was received ---
  const agingBuckets = {"0-30":0, "31-60":0, "61-90":0, "90+":0};
  const agingPapers = {"0-30":[], "31-60":[], "61-90":[], "90+":[]};
  papers.forEach(p=>{
    const bal = feeBalance(p);
    if(bal<=0) return;
    const age = daysBetween(p.receivedDate, today);
    const bucket = age<=30 ? "0-30" : age<=60 ? "31-60" : age<=90 ? "61-90" : "90+";
    agingBuckets[bucket] += bal;
    agingPapers[bucket].push(p);
  });

  // --- Daily cashier: every payment/deposit actually recorded today, across every paper ----
  const todaysCollections = [];
  papers.forEach(p=>{
    (p.feePayments||[]).filter(pay=>!pay.voided && pay.date===today && pay.method!=='Applied from Deposit').forEach(pay=>todaysCollections.push({...pay, caseNumber:p.caseNumber, kind:'Payment'}));
    (p.deposits||[]).filter(d=>!d.voided && d.date===today).forEach(d=>todaysCollections.push({...d, caseNumber:p.caseNumber, kind:'Deposit'}));
  });
  const todaysTotal = todaysCollections.reduce((s,c)=>s+c.amount,0);
  const todaysByMethod = {};
  todaysCollections.forEach(c=>{ todaysByMethod[c.method] = (todaysByMethod[c.method]||0) + c.amount; });
  const todaysReconciliation = (STATE.civil.cashierReconciliations||[]).find(r=>r.date===today);

  const byStage = {}; BOARD_STAGES.concat(['Cancelled']).forEach(s=>byStage[s]=0);
  papers.forEach(p=>byStage[p.stage]=(byStage[p.stage]||0)+1);

  document.getElementById('view-civil-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Service Performance</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Avg. Attempts per Completed Service</div><div class="v" style="font-size:17px;">${avgAttempts.toFixed(1)}</div></div>
          <div><div class="k">Avg. Days to First Attempt</div><div class="v" style="font-size:17px;">${avgDaysToFirstAttempt.toFixed(1)}</div></div>
          <div><div class="k">Avg. Days to Completion</div><div class="v" style="font-size:17px;">${avgDaysToCompletion.toFixed(1)}</div></div>
          <div><div class="k">Service Success Rate</div><div class="v" style="font-size:17px;">${successRate===null?'—':successRate+'%'}</div></div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">Success rate is served vs. served+unable-to-serve among closed papers — not a per-deputy quota, just an overall unit trend.</div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Workload by Deputy</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Deputy</th><th>Active Papers</th><th>Completed (Served)</th><th>Avg. Days to Serve</th></tr></thead><tbody>
        ${deputyRows.map(d=>`<tr><td>${escapeHtml(d.name)}</td><td>${d.active}</td><td>${d.completed}</td><td>${d.avgDays===null?'—':d.avgDays}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">No papers currently assigned to anyone.</td></tr>`}
        </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Enforcement (Writs, Levies &amp; Garnishments)</h2></div>
      <div class="panel-body">
        <div class="detail-grid" style="margin-bottom:14px;">
          <div><div class="k">Total Judgment Amount</div><div class="v" style="font-size:17px;">${moneyPrecise(enfTotalJudgment)}</div></div>
          <div><div class="k">Total Collected</div><div class="v" style="font-size:17px;color:var(--green);">${moneyPrecise(enfTotalCollected)}</div></div>
          <div><div class="k">Total Outstanding</div><div class="v" style="font-size:17px;font-weight:800;color:${enfTotalOutstanding>0?'var(--red)':'var(--green)'};">${moneyPrecise(enfTotalOutstanding)}</div></div>
          <div><div class="k">Open Enforcement Records</div><div class="v" style="font-size:17px;">${enforcements.length}</div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${SATISFACTION_STATUSES.map(s=>`<span class="badge badge-role">${s}: ${enfByStatus[s]||0}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Papers Approaching Expiration (Next 7 Days)</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Case #</th><th>Paper Type</th><th>Assigned Server</th><th>Return By</th></tr></thead><tbody>
        ${expiringSoon.map(p=>`<tr><td>${escapeHtml(p.caseNumber)}</td><td>${escapeHtml(p.paperType)}</td><td>${p.assignedServerId?escapeHtml(personName(p.assignedServerId)):'Unassigned'}</td><td style="color:var(--red);font-weight:700;">${p.returnByDate}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">Nothing expiring in the next 7 days.</td></tr>`}
        </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Outstanding Returns</h2><span class="hint">Served or Unable to Serve, no Return of Service generated yet</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Case #</th><th>Paper Type</th><th>Stage</th><th>Assigned Server</th></tr></thead><tbody>
        ${outstandingReturns.map(p=>`<tr><td>${escapeHtml(p.caseNumber)}</td><td>${escapeHtml(p.paperType)}</td><td><span class="badge" style="background:${stageColor(p.stage)}22;color:${stageColor(p.stage)};">${p.stage}</span></td><td>${p.assignedServerId?escapeHtml(personName(p.assignedServerId)):'Unassigned'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">No outstanding returns.</td></tr>`}
        </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Fee Reconciliation Summary</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportFeeSummary">${ICONS.download} Export (CSV)</button>` : ''}</div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Total Fees Owed (All Papers)</div><div class="v" style="font-size:17px;">${money(totalOwed)}</div></div>
          <div><div class="k">Total Received</div><div class="v" style="font-size:17px;color:var(--green);">${money(totalReceived)}</div></div>
          <div><div class="k">Total Outstanding</div><div class="v" style="font-size:17px;font-weight:800;color:${totalOutstanding>0?'var(--red)':'var(--green)'};">${money(totalOutstanding)}</div></div>
          <div><div class="k">Fee-Waived Papers</div><div class="v" style="font-size:17px;">${waivedCount}</div></div>
        </div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Aging — Outstanding Balances</h2></div>
      <div class="panel-body">
        <div class="detail-grid" style="margin-bottom:10px;">
          ${Object.entries(agingBuckets).map(([label,amt])=>`<div><div class="k">${label} days</div><div class="v" style="font-size:17px;${amt>0?'color:var(--red);':''}">${moneyPrecise(amt)}</div><div style="font-size:11px;color:var(--text-dim);">${agingPapers[label].length} paper${agingPapers[label].length===1?'':'s'}</div></div>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-dim);">Aged from the date each paper was received. A paper only appears once, in whichever bucket matches its current age — it doesn't split across buckets.</div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Daily Cashier Reconciliation</h2>${todaysReconciliation ? `<span class="badge badge-available">Reconciled by ${escapeHtml(todaysReconciliation.reconciledBy)}</span>` : (canExport ? `<button class="btn btn-sm btn-primary" id="btnReconcileToday">Mark Today Reconciled</button>` : '')}</div>
      <div class="panel-body">
        <div class="detail-grid" style="margin-bottom:10px;">
          <div><div class="k">Today's Total Collected</div><div class="v" style="font-size:17px;font-weight:800;">${moneyPrecise(todaysTotal)}</div></div>
          ${Object.entries(todaysByMethod).map(([m,amt])=>`<div><div class="k">${escapeHtml(m)}</div><div class="v">${moneyPrecise(amt)}</div></div>`).join('')}
        </div>
        ${todaysCollections.length ? `<table><thead><tr><th>Case #</th><th>Type</th><th>Amount</th><th>Method</th><th>Received By</th></tr></thead><tbody>
          ${todaysCollections.map(c=>`<tr><td>${escapeHtml(c.caseNumber)}</td><td>${c.kind}</td><td>${moneyPrecise(c.amount)}</td><td><span class="badge badge-role">${escapeHtml(c.method)}</span></td><td>${escapeHtml(c.receivedBy)}</td></tr>`).join('')}
          </tbody></table>` : `<div style="font-size:12.5px;color:var(--text-dim);">No payments or deposits recorded today yet.</div>`}
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Papers by Stage</h2></div>
      <div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartCivilStage"></canvas></div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Fee Reconciliation by Paper</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Case #</th><th>Paper Type</th><th>Owed</th><th>Received</th><th>Balance</th><th>Status</th></tr></thead><tbody>
        ${papers.map(p=>`<tr><td>${escapeHtml(p.caseNumber)}</td><td>${escapeHtml(p.paperType)}</td><td>${money(feeTotalOwed(p))}</td><td>${money(feeTotalReceived(p))}</td>
          <td style="${feeBalance(p)>0?'color:var(--red);font-weight:700;':''}">${money(feeBalance(p))}</td><td><span class="badge ${feeStatusBadgeClass(feeReconciliationStatus(p))}">${feeReconciliationStatus(p)}</span></td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>
  `;
  if(CHART_REFS_CIVIL.stage) CHART_REFS_CIVIL.stage.destroy();
  CHART_REFS_CIVIL.stage = safeChart('chartCivilStage', { type:'bar',
    data:{ labels:Object.keys(byStage), datasets:[{label:'Papers', data:Object.values(byStage), backgroundColor:'#134DD1'}] },
    options:{maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:9}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}},grid:{color:chartGridColor()}}}} });
  const exportBtn = document.getElementById('btnExportFeeSummary');
  if(exportBtn) exportBtn.onclick = ()=>{
    const headers = ["Case #","Paper Type","Owed","Received","Balance","Status"];
    const rows = papers.map(p=>[p.caseNumber, p.paperType, feeTotalOwed(p), feeTotalReceived(p), feeBalance(p), feeReconciliationStatus(p)]);
    const csv = [headers, ...rows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'civil_fee_reconciliation.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Report exported.");
  };
  const reconcileBtn = document.getElementById('btnReconcileToday');
  if(reconcileBtn) reconcileBtn.addEventListener('click', ()=>{
    if(!confirm(`Mark today's cashier drawer reconciled? Total collected today: ${moneyPrecise(todaysTotal)}.`)) return;
    if(!STATE.civil.cashierReconciliations) STATE.civil.cashierReconciliations = [];
    STATE.civil.cashierReconciliations.push({id:'recon'+Date.now(), date: today, reconciledBy: personName(CURRENT_USER_ID), reconciledAt: new Date().toISOString(), totalCollected: todaysTotal});
    logActivity(`Reconciled the cashier drawer for ${today}: ${moneyPrecise(todaysTotal)} collected.`, 'admin');
    persist();
    toast("Marked reconciled.");
    renderReports();
  });
}
let CHART_REFS_CIVIL = {};

/* =========================================================================
   ADMIN: reference data, notification routing, audit log
   ========================================================================= */
let ADMIN_TAB = 'paperTypes';
const SIMPLE_LIST_TABS = {
  paperTypes: {label:'Paper Types', usageCheck:(v)=>STATE.civil.papers.filter(p=>p.paperType===v).length},
  courtsOfOrigin: {label:'Courts of Origin', usageCheck:(v)=>STATE.civil.papers.filter(p=>p.courtOfOrigin===v).length},
  serviceMethods: {label:'Service Methods', usageCheck:(v)=>STATE.civil.papers.filter(p=>p.serviceMethod===v).length},
  attemptResults: {label:'Attempt Results', usageCheck:(v)=>STATE.civil.papers.some(p=>p.attempts.some(a=>a.result===v))},
  propertyTypes: {label:'Property Types', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.leviedProperty||[]).some(lp=>lp.propertyType===v))},
  propertyDisposalMethods: {label:'Property Disposal Methods', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.leviedProperty||[]).some(lp=>lp.disposalMethod===v)||(e.realPropertyLevies||[]).some(rp=>rp.disposalMethod===v))},
  propertyStorageLocations: {label:'Property Storage Locations', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.leviedProperty||[]).some(lp=>lp.storageLocation===v))},
  propertySeizureStatuses: {label:'Property Seizure Statuses', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.leviedProperty||[]).some(lp=>lp.status===v))},
  realPropertyTypes: {label:'Real Property Types', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.realPropertyLevies||[]).some(rp=>rp.realPropertyType===v))},
  realPropertyLevyStatuses: {label:'Real Property Levy Statuses', usageCheck:(v)=>(STATE.civil.enforcements||[]).some(e=>(e.realPropertyLevies||[]).some(rp=>rp.status===v))},
};

function renderAdmin(){
  const canManage = can('civil_admin_categories');
  const canAudit = can('civil_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-civil-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){ Object.entries(SIMPLE_LIST_TABS).forEach(([key,cfg])=>tabs.push([key,cfg.label])); tabs.push(['feeSchedule','Fee Schedule & Rates']); tabs.push(['notifications','Notification Routing']); }
  if(can('civil_bulk_import')) tabs.push(['bulkImport','Bulk Import']);
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-civil-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab-civil="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyCivil"></div>
  `;
  document.querySelectorAll('[data-admin-tab-civil]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTabCivil; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBodyCivil');
  if(SIMPLE_LIST_TABS[ADMIN_TAB]) renderSimpleListTab(body, ADMIN_TAB);
  else if(ADMIN_TAB==='feeSchedule') renderFeeScheduleTab(body);
  else if(ADMIN_TAB==='notifications') renderNotificationRoutingTab(body);
  else if(ADMIN_TAB==='bulkImport') renderBulkImportTab(body, 'civil');
  else if(ADMIN_TAB==='audit') renderPlatformAuditLogTab(body);
}

function renderFeeScheduleTab(body){
  const sched = STATE.civil.refData.feeSchedule;
  const canManage = can('civil_admin_categories');
  body.innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-head"><h2>Agency-Wide Rates</h2></div>
      <div class="panel-body">
        <div class="form-2col">
          <div class="form-row"><label>Mileage Rate (per mile)</label><input type="number" id="fRateMileage" min="0" step="0.01" value="${sched.mileageRatePerMile}" ${canManage?'':'disabled'}></div>
          <div class="form-row"><label>Statutory Judgment Interest Rate (annual %)</label><input type="number" id="fRateInterest" min="0" step="0.1" value="${sched.interestRateAnnualPercent}" ${canManage?'':'disabled'}></div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:16px;">The mileage rate is applied automatically when a deputy logs mileage on a service attempt. The interest rate is the default used when calculating accrued interest on a new writ or judgment in Enforcement — it can still be overridden per-case if the judgment specifies a different rate.</div>
        <div class="form-2col">
          <div class="form-row"><label>Agency Commission Rate on Collections (%)</label><input type="number" id="fRateCommission" min="0" step="0.1" value="${sched.commissionRatePercent??5}" ${canManage?'':'disabled'}></div>
          <div class="form-row"><label>Fee Waiver Approval Threshold ($)</label><input type="number" id="fThreshWaiver" min="0" step="1" value="${sched.feeWaiverApprovalThreshold??100}" ${canManage?'':'disabled'}></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Void/Reversal Approval Threshold ($)</label><input type="number" id="fThreshVoid" min="0" step="1" value="${sched.voidApprovalThreshold??100}" ${canManage?'':'disabled'}></div>
          <div></div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);">Commission is the agency's share of funds collected on a writ or judgment in Enforcement, shown there as a suggested disbursement. The two approval thresholds require selecting a supervisor's name before a fee waiver or a void/reversal above that dollar amount can be saved.</div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Fees &amp; Deadlines by Paper Type</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Paper Type</th><th>Base Fee</th><th>Additional Attempt Fee</th><th>Default Deadline (days)</th><th>Guideline Attempts</th><th>Fee-Exempt</th><th>Enforcement Type</th><th>Allowed Service Methods</th></tr></thead>
        <tbody>
          ${STATE.civil.refData.paperTypes.map(t=>{
            const c = sched.byType[t] || {baseFee:0, additionalAttemptFee:0, defaultDeadlineDays:21, requiredAttempts:2, feeWaived:false, enforceable:false, allowedServiceMethods:[...SERVICE_METHODS]};
            const methods = c.allowedServiceMethods || SERVICE_METHODS;
            return `<tr>
              <td style="font-weight:600;white-space:nowrap;">${escapeHtml(t)}</td>
              <td><input type="number" min="0" step="1" data-fee-field="baseFee" data-fee-type="${escapeHtml(t)}" value="${c.baseFee}" style="width:90px;" ${canManage?'':'disabled'}></td>
              <td><input type="number" min="0" step="1" data-fee-field="additionalAttemptFee" data-fee-type="${escapeHtml(t)}" value="${c.additionalAttemptFee}" style="width:90px;" ${canManage?'':'disabled'}></td>
              <td><input type="number" min="1" step="1" data-fee-field="defaultDeadlineDays" data-fee-type="${escapeHtml(t)}" value="${c.defaultDeadlineDays}" style="width:80px;" ${canManage?'':'disabled'}></td>
              <td><input type="number" min="1" step="1" data-fee-field="requiredAttempts" data-fee-type="${escapeHtml(t)}" value="${c.requiredAttempts}" style="width:70px;" ${canManage?'':'disabled'}></td>
              <td style="text-align:center;"><input type="checkbox" data-fee-field="feeWaived" data-fee-type="${escapeHtml(t)}" ${c.feeWaived?'checked':''} style="width:auto;" ${canManage?'':'disabled'}></td>
              <td style="text-align:center;"><input type="checkbox" data-fee-field="enforceable" data-fee-type="${escapeHtml(t)}" ${c.enforceable?'checked':''} style="width:auto;" ${canManage?'':'disabled'}></td>
              <td style="font-size:11px;min-width:220px;">${methods.map(m=>escapeHtml(m)).join(', ')}${canManage ? `<div><button type="button" class="btn btn-sm btn-outline" data-edit-methods="${escapeHtml(t)}" style="margin-top:4px;">${ICONS.edit} Edit</button></div>` : ''}</td>
            </tr>`;
          }).join('')}
        </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-top:16px;"><div class="panel-head"><h2>GL Codes</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <div style="flex:1;min-width:220px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Fee Categories</div>
            ${FEE_CATEGORIES.map(c=>`<div class="form-row" style="margin-bottom:8px;"><label style="font-weight:400;">${escapeHtml(c)}</label><input type="text" data-gl-fee-category="${escapeHtml(c)}" value="${escapeHtml(STATE.civil.refData.feeCategoryGLCodes[c]||'')}" placeholder="e.g. 4010" ${canManage?'':'disabled'}></div>`).join('')}
          </div>
          <div style="flex:1;min-width:220px;">
            <div style="font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Payment Methods</div>
            ${PAYMENT_METHODS.map(m=>`<div class="form-row" style="margin-bottom:8px;"><label style="font-weight:400;">${escapeHtml(m)}</label><input type="text" data-gl-payment-method="${escapeHtml(m)}" value="${escapeHtml(STATE.civil.refData.paymentMethodGLCodes[m]||'')}" placeholder="e.g. 1010" ${canManage?'':'disabled'}></div>`).join('')}
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Optional. Shown alongside each fee line and payment in the Fees &amp; Reconciliation tab, and available for export -- lets this data slot into whatever chart of accounts your county finance system already uses.</div>
      </div>
    </div>
    ${canManage ? `<button class="btn btn-primary" id="btnSaveFeeSchedule" style="margin-top:14px;">Save Fee Schedule &amp; Rates</button>` : ''}
    <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">"Enforcement Type" marks paper types (writs, garnishments) that generate an Enforcement record for tracking judgment amount, interest, levies, and disbursement, instead of just a standard service fee record. "Allowed Service Methods" controls what shows up in the Mark Served dropdown for that paper type.</div>
  `;
  document.querySelectorAll('[data-edit-methods]').forEach(btn=>btn.addEventListener('click', ()=>openServiceMethodsModal(btn.dataset.editMethods)));
  const saveBtn = document.getElementById('btnSaveFeeSchedule');
  if(saveBtn) saveBtn.addEventListener('click', ()=>{
    sched.mileageRatePerMile = Number(document.getElementById('fRateMileage').value) || 0;
    sched.interestRateAnnualPercent = Number(document.getElementById('fRateInterest').value) || 0;
    sched.commissionRatePercent = Number(document.getElementById('fRateCommission').value) || 0;
    sched.feeWaiverApprovalThreshold = Number(document.getElementById('fThreshWaiver').value) || 0;
    sched.voidApprovalThreshold = Number(document.getElementById('fThreshVoid').value) || 0;
    STATE.civil.refData.paperTypes.forEach(t=>{
      const existing = sched.byType[t] || {};
      const row = (field)=>body.querySelector(`[data-fee-field="${field}"][data-fee-type="${CSS.escape(t)}"]`);
      sched.byType[t] = {
        baseFee: Number(row('baseFee').value)||0,
        additionalAttemptFee: Number(row('additionalAttemptFee').value)||0,
        defaultDeadlineDays: Math.max(1, Number(row('defaultDeadlineDays').value)||21),
        requiredAttempts: Math.max(1, Number(row('requiredAttempts').value)||2),
        feeWaived: row('feeWaived').checked,
        enforceable: row('enforceable').checked,
        allowedServiceMethods: existing.allowedServiceMethods || [...SERVICE_METHODS],
      };
    });
    document.querySelectorAll('[data-gl-fee-category]').forEach(input=>{
      STATE.civil.refData.feeCategoryGLCodes[input.dataset.glFeeCategory] = input.value.trim();
    });
    document.querySelectorAll('[data-gl-payment-method]').forEach(input=>{
      STATE.civil.refData.paymentMethodGLCodes[input.dataset.glPaymentMethod] = input.value.trim();
    });
    logActivity('Updated the civil process fee schedule and rates.', 'admin');
    persist();
    toast('Fee schedule saved.');
  });
}

function openServiceMethodsModal(paperType){
  const sched = STATE.civil.refData.feeSchedule;
  const current = (sched.byType[paperType] && sched.byType[paperType].allowedServiceMethods) || [...SERVICE_METHODS];
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Allowed Service Methods \u2014 ${escapeHtml(paperType)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Only checked methods will appear in the Mark Served dropdown for this paper type. Uncheck a method your jurisdiction doesn't allow for this type of process.</div>
      ${SERVICE_METHODS.map(m=>`
        <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;">
          <input type="checkbox" data-method="${escapeHtml(m)}" style="width:auto;" ${current.includes(m)?'checked':''}>${escapeHtml(m)}
        </label>
      `).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const selected = [...document.querySelectorAll('[data-method]:checked')].map(c=>c.dataset.method);
    if(!selected.length){ toast("At least one service method must remain allowed.", true); return; }
    if(!sched.byType[paperType]) sched.byType[paperType] = {...feeConfigFor(paperType)};
    sched.byType[paperType].allowedServiceMethods = selected;
    logActivity(`Updated allowed service methods for ${paperType}.`, 'admin');
    persist();
    toast("Service methods saved.");
    closeModal();
    renderAdminTabBody();
  };
}

function renderSimpleListTab(body, key){
  const cfg = SIMPLE_LIST_TABS[key];
  const list = STATE.civil.refData[key] || (STATE.civil.refData[key] = []);
  const rows = list.map((v,i)=>{
    const inUse = cfg.usageCheck(v);
    return `<tr><td>${escapeHtml(v)}</td><td>${inUse?`<span class="badge badge-role">In use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item-civil="${i}">${ICONS.trash}</button></td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputCivil" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/,'')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemCivil">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddItemCivil').addEventListener('click', ()=>{
    const val = document.getElementById('newItemInputCivil').value.trim();
    if(!val){ toast("Enter a value first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-item-civil]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeItemCivil); const val = list[idx];
    if(cfg.usageCheck(val)){ toast(`Can't remove "${val}" \u2014 it's in use.`, true); return; }
    if(!confirm(`Remove "${val}"?`)) return;
    list.splice(idx,1);
    logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function renderNotificationRoutingTab(body){
  const roleOpts = (sel)=>STATE.roles.map(r=>`<option value="${r.id}" ${sel===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Return-By Date Approaching Alerts</label><select id="fRouteCivilReturn">${roleOpts(STATE.civil.notifySettings.returnDueRoleId)}</select></div>
        <div class="form-row"><label>Priority Paper Unassigned Alerts</label><select id="fRouteCivilPriority">${roleOpts(STATE.civil.notifySettings.priorityUnassignedRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingCivil">Save Routing</button>
      </div>
    </div>
  `;
  document.getElementById('btnSaveRoutingCivil').addEventListener('click', ()=>{
    STATE.civil.notifySettings.returnDueRoleId = document.getElementById('fRouteCivilReturn').value;
    STATE.civil.notifySettings.priorityUnassignedRoleId = document.getElementById('fRouteCivilPriority').value;
    logActivity("Updated Civil Process notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

/* =========================================================================
   MODULE ENTRY POINT
   ========================================================================= */
function startCivilModule(){
  renderNav();
  switchView(ACTIVE_VIEW);
}
window.CIVIL = { start: startCivilModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openPaperDetail };

})();


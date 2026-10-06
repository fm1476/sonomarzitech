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
  if(id==="civil-board") renderBoard();
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
    p.assignedServerId = document.getElementById('fAssignServer').value;
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
    p.serviceAddresses.push({id:'addr'+Date.now(), address, isPrimary});
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
    p.servedDate = document.getElementById('fSrvDate').value;
    p.servedTime = document.getElementById('fSrvTime').value;
    p.serviceMethod = document.getElementById('fSrvMethod').value;
    p.servedOnName = servedOnName;
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

/* Public Safety Suite: unified workspaces, accessible interaction, and durable record storage.
   Domain modules above remain the source of business workflows. */
function suiteWeekStart(){ const d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return fmt(d); }
/* My Work, readiness, and agency workflow views. The database authorizes every workflow action. */
const WorkOperations=(()=>{
 const esc=escapeHtml;
 const date=()=>fmt(new Date());
 const localDate=value=>{if(!value)return '';try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:SuiteUX.userTimeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}catch{return value.slice(0,10);}};
 const daysUntil=value=>Math.round((new Date(value+'T12:00:00').getTime()-new Date(date()+'T12:00:00').getTime())/86400000);
 const current=()=>STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{};
 const actualRoles=()=>SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(current().roleIds||[]);
 const allowed=id=>actualRoles().some(r=>STATE.roles.find(x=>x.id===r)?.abilities?.[id]);
 const manager=()=>allowed('workflow_manage');
 const canApprove=()=>allowed('workflow_approve');
 const canUse=()=>allowed('workflow_use');
 const visible=mod=>({fleet:'module_fleet',qm:'module_quartermaster',personnel:'module_personnel',k9:'module_k9',drone:'module_drone'})[mod] && allowed(({fleet:'module_fleet',qm:'module_quartermaster',personnel:'module_personnel',k9:'module_k9',drone:'module_drone'})[mod]);
 const safeList=v=>Array.isArray(v)?v:[];
 let cache={key:'',templates:[],items:[],loaded:false,busy:false,error:'',at:0};
 function readiness(){
  const items=[],today=date(),me=current(),people=safeList(STATE.personnel);
  const add=(group,title,due,detail,route,owner)=>items.push({group,title,due:due||'',detail:detail||'',route,owner:owner||'',urgent:!!due&&due<today});
  // The signed-in employee always sees their own qualifications. Coordinators see the roster.
  const broad=allowed('pm_training_manage')||allowed('personnel_manage');
  for(const p of people.filter(p=>broad||p.id===me.id))for(const q of safeList(p.qualifications)){
   if(q.expirationDate&&daysUntil(q.expirationDate)<=60)add('People',`${p.name}: ${q.weaponType||'Qualification'} ${q.expirationDate<today?'expired':'due soon'}`,q.expirationDate,'Qualification expiration','pm-training',p.id);
  }
  if(visible('personnel')&&(allowed('pm_training_manage')||allowed('pm_training_view_own')))for(const r of safeList(STATE.pm?.trainingRecords)){
   if(!broad&&r.personId!==me.id)continue;
   if(r.recertRequired&&r.recertDate&&daysUntil(r.recertDate)<=60)add('People',`${personName(r.personId)}: ${r.description||'Training'} recertification`,r.recertDate,'Training renewal','pm-training',r.personId);
  }
  if(visible('personnel')&&allowed('pm_overtime_view')&&typeof computeCoverageGaps==='function'){
   for(const gap of computeCoverageGaps(7))add('Staffing',`${gap.shift.name}: ${gap.needed} open position${gap.needed===1?'':'s'}`,gap.date,`${gap.staffed}/${gap.minStaff} staffed`,'pm-scheduling');
  }
  if(visible('fleet')&&allowed('fleet_vehicle_view'))for(const v of safeList(STATE.fleet?.vehicles)){
   if(['Out of Service','In Maintenance','Maintenance'].includes(v.status))add('Fleet',`${v.unitNumber||v.name||'Vehicle'}: ${v.status}`,'',v.make+' '+v.model,'fleet-vehicles');
  }
  if(visible('qm')&&allowed('qm_equip_view'))for(const e of safeList(STATE.qm?.equipment)){
   if(['Needs Repair','Damaged','Out of Service'].includes(e.condition)||e.status==='Out of Service')add('Equipment',`${e.name||e.assetId}: ${e.condition||e.status}`,'',e.assetId||'Equipment requires attention','qm-inventory');
  }
  if(visible('k9')&&allowed('k9_certification_view'))for(const c of safeList(STATE.k9?.certifications)){
   if(c.expirationDate&&daysUntil(c.expirationDate)<=60)add('Specialty',`K9 certification: ${c.certType||'Renewal'}`,c.expirationDate,'K9 qualification','k9-certifications');
  }
  if(visible('drone')&&allowed('drone_operator_view'))for(const o of safeList(STATE.drone?.operators))for(const w of safeList(o.waivers)){
   if(w.expirationDate&&daysUntil(w.expirationDate)<=60)add('Specialty',`UAS waiver: ${w.type||'Renewal'}`,w.expirationDate,'Operator authorization','drone-operators');
  }
  return items.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||(a.due||'9999').localeCompare(b.due||'9999'));
 }
 function readinessTasks(){return readiness().filter(x=>(x.group==='People'&&(x.owner===CURRENT_USER_ID||allowed('pm_training_manage')))||(x.group==='Staffing'&&allowed('pm_overtime_manage'))).slice(0,25).map(x=>({title:x.title,owner:x.owner===CURRENT_USER_ID?'You':x.group==='Staffing'?'Scheduling':'Training',due:x.due,type:x.owner===CURRENT_USER_ID?'mine':'attention',consequence:x.detail,action:()=>SuiteUX.go(x.route)}));}
 function renderReadiness(el){const items=readiness(),groups=['Staffing','People','Fleet','Equipment','Specialty'];const cards=groups.map(g=>({g,rows:items.filter(i=>i.group===g)}));
  el.innerHTML=`<div class="work-hero"><div><div class="work-eyebrow">Agency operations</div><h2>Operational readiness</h2><p>Live exceptions from the records available to your role. Clear each item in its source workspace.</p></div><div class="work-date">${esc(SuiteUX.displayDate(date()))}</div></div><div class="work-metrics">${cards.map(({g,rows})=>`<div class="work-metric ${rows.some(x=>x.urgent)?'urgent':'good'}"><span>${esc(g)}</span><strong>${rows.length}</strong><small>${rows.filter(x=>x.urgent).length} overdue</small></div>`).join('')}</div><div class="work-layout"><div>${cards.map(({g,rows})=>`<section class="panel"><div class="panel-head"><h2>${esc(g)}</h2><span class="hint">${rows.length} items</span></div><div class="readiness-items" data-readiness-group="${g}"></div></section>`).join('')}</div><aside class="work-aside"><section class="panel"><div class="panel-head"><h2>How this view works</h2></div><div class="panel-body"><p>Only records loaded for your role appear here. Expirations enter the list 60 days before their due date. Staffing gaps use the next seven days of shift minimums and actual coverage. Vehicle and equipment exceptions remain until their source status is cleared.</p><p>This view does not certify that every employee is deployable.</p></div></section></aside></div>`;
  for(const {g,rows} of cards){const box=el.querySelector(`[data-readiness-group="${g}"]`);if(!rows.length){box.innerHTML='<div class="panel-body">No visible exceptions.</div>';continue;}for(const x of rows.slice(0,80)){const row=document.createElement('div');row.className='work-item';row.innerHTML=`<div class="work-priority ${x.urgent?'urgent':''}"></div><div><h3>${esc(x.title)}</h3><p>${esc(x.detail)}${x.due?' · '+esc(SuiteUX.displayDate(x.due)):''}</p></div>`;const b=document.createElement('button');b.className='btn btn-outline btn-sm';b.textContent='Open';b.onclick=()=>SuiteUX.go(x.route);row.append(b);box.append(row);}}
 }
 const key=()=>{const c=SuiteStore.remoteContext();return SuiteStore.mode()==='shared'?`${c.tenantId}/${c.agencyId}/${CURRENT_USER_ID}`:`local/${CURRENT_USER_ID}`;};
 function localData(){STATE.workflows ||= {templates:[],items:[]};return STATE.workflows;}
 async function call(action,payload={}){
  if(SuiteStore.mode()==='local')return localCall(action,payload);
  const c=SuiteStore.remoteContext();if(!c.tenantId||!c.agencyId)throw Error('Choose an agency first.');
  const result=await SuiteStore.api('/workflow',{method:'POST',body:JSON.stringify({action,tenantId:c.tenantId,agencyId:c.agencyId,payload})});
  if(result?.success===false)throw Error(result.error||'Workflow request failed.');return result?.data;
 }
 function localCall(action,p){const d=localData(),now=new Date().toISOString();
  if(action==='list')return {templates:d.templates,items:d.items};
  if(action==='save_template'){if(!manager())throw Error('Workflow management access is required.');let t=d.templates.find(t=>t.id===p.id);if(t&&t.version!==p.version)throw Error('Workflow changed. Reload before editing.');if(!t&&p.clientId){t=d.templates.find(x=>x.client_id===p.clientId);if(t){if(t.name!==p.name||t.description!==p.description||JSON.stringify(t.definition)!==JSON.stringify(p.definition))throw Error('This workflow was already created with different content. Refresh before editing.');return t;}}if(t)Object.assign(t,{name:p.name,description:p.description,definition:p.definition,version:t.version+1,updated_at:now});else{t={id:crypto.randomUUID(),client_id:p.clientId,name:p.name,description:p.description,definition:p.definition,active:false,version:1,updated_at:now};d.templates.push(t);}SuiteStore.persist();return t;}
  if(action==='set_active'){const t=d.templates.find(t=>t.id===p.id);if(!manager()||!t||t.version!==p.version)throw Error('Workflow changed. Reload before editing.');t.active=p.active;t.version++;SuiteStore.persist();return t;}
  if(action==='submit'){let i=d.items.find(x=>x.client_id===p.clientId);if(i)return i;const t=d.templates.find(t=>t.id===p.templateId&&t.active);if(!t||!canUse())throw Error('Workflow unavailable.');i={id:crypto.randomUUID(),template_id:t.id,definition:structuredClone(t.definition),answers:p.answers,title:t.name,requester_id:CURRENT_USER_ID,requester_person_id:CURRENT_USER_ID,status:'pending',step_index:0,due_at:new Date(Date.now()+(Number(t.definition.steps[0].dueDays??2))*86400000).toISOString(),version:1,history:[{action:'submitted',by:CURRENT_USER_ID,at:now}],created_at:now,updated_at:now,client_id:p.clientId};d.items.push(i);SuiteStore.persist();return i;}
  const i=d.items.find(x=>x.id===p.id);if(!i||i.version!==p.version||i.status!=='pending')throw Error('Request changed. Reload before deciding.');if(action==='cancel'){if(i.requester_id!==CURRENT_USER_ID&&!manager())throw Error('Only the requester can cancel.');i.status='cancelled';}else{const role=i.definition.steps[i.step_index].roleId;if(!manager()&&(!canApprove()||!actualRoles().includes(role)))throw Error('This approval is assigned to another role.');if(action==='reject')i.status='rejected';else if(++i.step_index>=i.definition.steps.length)i.status='approved';}i.due_at=i.status==='pending'?new Date(Date.now()+(Number(i.definition.steps[i.step_index].dueDays??2))*86400000).toISOString():null;i.version++;i.updated_at=now;i.history.push({action,by:CURRENT_USER_ID,at:now,note:p.note||''});SuiteStore.persist();return i;
 }
 async function refresh(force=false){const k=key();if(cache.key!==k)cache={key:k,templates:[],items:[],loaded:false,busy:false,error:'',at:0};if(cache.busy||(!force&&Date.now()-cache.at<20000))return;cache.busy=true;
  try{const data=await call('list');if(key()!==k)return;cache.templates=safeList(data.templates);cache.items=safeList(data.items);cache.loaded=true;cache.error='';cache.at=Date.now();if(document.getElementById('view-home')?.classList.contains('active')&&!SuiteUX.hasDirty())SuiteUX.home();else if(document.getElementById('view-workflows')?.classList.contains('active')&&!SuiteUX.hasDirty())SuiteUX.workflowView();}
  catch(e){cache.error=e.message;cache.at=Date.now();console.error('Workflow list failed:',e);if(key()===k&&document.getElementById('view-workflows')?.classList.contains('active')&&!SuiteUX.hasDirty())SuiteUX.workflowView();}finally{cache.busy=false;}
 }
 function pendingForMe(i){return i.status==='pending'&&canApprove()&&actualRoles().includes(i.definition?.steps?.[i.step_index]?.roleId);}
 function tasks(){return cache.items.filter(i=>i.status==='pending'&&(i.requester_id===CURRENT_USER_ID||pendingForMe(i))).map(i=>({title:(pendingForMe(i)?'Approve: ':'Track: ')+i.title,owner:pendingForMe(i)?'Approval assigned to you':'Submitted by you',due:pendingForMe(i)?localDate(i.due_at):'',type:pendingForMe(i)?'approvals':'mine',consequence:i.definition?.steps?.[i.step_index]?.label||'Workflow request',action:()=>{SuiteUX.workflowView();openItem(i.id);}}));}
 function available(){return manager()||canApprove()||canUse();}
 function renderWorkflows(el){if(!available()){el.innerHTML='<div class="empty-state">Workflows are not enabled for your role.</div>';return;}
  refresh();const mine=cache.items.filter(i=>i.requester_id===CURRENT_USER_ID||pendingForMe(i)||manager());
  el.innerHTML=`<div class="work-hero"><div><div class="work-eyebrow">Agency workflows</div><h2>Requests and approvals</h2><p>Submit an agency form, follow its progress, or review the approval step assigned to your role.</p></div></div><div class="panel"><div class="panel-head"><h2>Available workflows</h2>${manager()?'<button id="newWorkflow" class="btn btn-primary">Build workflow</button>':''}</div><div class="panel-body workflow-grid" id="workflowTemplates"></div></div><div class="panel"><div class="panel-head"><h2>Requests</h2><button id="refreshWorkflows" class="btn btn-outline btn-sm">Refresh</button></div><div id="workflowItems"></div></div>${cache.error?`<p role="alert" class="field-error">${esc(cache.error)}</p>`:''}`;
  if(manager())el.querySelector('#newWorkflow').onclick=()=>editTemplate();
  el.querySelector('#refreshWorkflows').onclick=()=>refresh(true);
  const tb=el.querySelector('#workflowTemplates');for(const t of cache.templates){const card=document.createElement('div');card.className='panel workflow-card';card.innerHTML=`<h3>${esc(t.name)}</h3><p>${esc(t.description||'Agency request')}</p><small>${t.definition?.fields?.length||0} fields · ${t.definition?.steps?.length||0} approval steps · ${t.active?'Active':'Draft'}</small><div class="workflow-actions"></div>`;const actions=card.querySelector('.workflow-actions');if(t.active&&canUse())addButton(actions,'Start',()=>startCase(t),'btn btn-primary btn-sm');if(manager()){addButton(actions,'Edit',()=>editTemplate(t));addButton(actions,t.active?'Pause':'Activate',()=>toggleTemplate(t));}tb.append(card);}if(!cache.templates.length)tb.innerHTML=`<p>${cache.loaded?'No workflows are available yet.':cache.error?'Could not load workflows. Use Refresh to retry.':'Loading workflows…'}</p>`;
  const ib=el.querySelector('#workflowItems');for(const i of mine){const row=document.createElement('div');row.className='work-item';row.innerHTML=`<div class="work-priority ${pendingForMe(i)&&localDate(i.due_at)<date()?'urgent':''}"></div><div><h3>${esc(i.title)}</h3><p>${esc(i.status)} · ${esc(i.requester_person_id===CURRENT_USER_ID?'You':personName(i.requester_person_id))} · ${esc(i.definition?.steps?.[i.step_index]?.label||'Decision recorded')}</p><small>${esc(SuiteUX.displayInstant(i.updated_at))}${i.status==='pending'&&i.due_at?' · Due '+esc(SuiteUX.displayInstant(i.due_at)):''}</small></div>`;addButton(row,pendingForMe(i)?'Review':'Details',()=>openItem(i.id));ib.append(row);}if(!mine.length)ib.innerHTML='<div class="panel-body">No requests to show.</div>';
 }
 function addButton(parent,label,handler,cls='btn btn-outline btn-sm'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.onclick=handler;parent.append(b);return b;}
 function modal(title,body,footer){const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" id="workflowClose" aria-label="Close">×</button></div><div class="modal-body">${body}<p class="field-error" id="workflowError" role="alert"></p></div><div class="modal-foot" id="workflowFooter"></div>`;SuiteUX.openModal();box.querySelector('#workflowClose').onclick=()=>SuiteUX.closeModal();footer(box.querySelector('#workflowFooter'),box);return box;}
 async function run(action,payload,button){if(button)button.disabled=true;try{await call(action,payload);SuiteUX.clearDirty();SuiteUX.closeModal();cache.at=0;await refresh(true);toast('Workflow saved.');}catch(e){document.getElementById('workflowError').textContent=e.message;if(button)button.disabled=false;}}
 function editTemplate(t){if(!manager())return;const clientId=crypto.randomUUID();const roles=STATE.roles.filter(r=>!r.hidden&&(r.abilities?.workflow_approve||r.id==='role_admin'));const fields=t?.definition?.fields||[{key:'details',label:'Details',type:'textarea',required:true,options:[]}];const steps=t?.definition?.steps||[{label:'Supervisor review',roleId:roles.find(r=>r.id==='role_supervisor')?.id||roles[0]?.id}];
  const box=modal(t?'Edit workflow':'Build workflow',`<div class="form-row"><label for="wfName">Workflow name</label><input id="wfName" maxlength="100" value="${esc(t?.name||'')}"></div><div class="form-row"><label for="wfDescription">Description</label><input id="wfDescription" maxlength="600" value="${esc(t?.description||'')}"></div><h4>Form fields</h4><p class="hint">Add the information the requester must supply. Field identifiers are preserved while a workflow is edited.</p><div id="wfFields"></div><button type="button" class="btn btn-outline btn-sm" id="wfAddField">Add field</button><h4>Approval route</h4><p class="hint">Each step goes to members of the selected role who have the Approve workflows ability.</p><div id="wfSteps"></div><button type="button" class="btn btn-outline btn-sm" id="wfAddStep">Add step</button>`,foot=>{addButton(foot,'Cancel',()=>SuiteUX.closeModal());addButton(foot,'Save draft',save,'btn btn-primary');});
  const fieldBox=box.querySelector('#wfFields'),stepBox=box.querySelector('#wfSteps');
  function addField(f={}){const row=document.createElement('div');row.className='workflow-builder-row';row.innerHTML=`<input class="wf-label" aria-label="Field label" placeholder="Field label" maxlength="80" value="${esc(f.label||'')}"><select class="wf-type" aria-label="Field type">${['text','textarea','date','number','select'].map(x=>`<option value="${x}" ${f.type===x?'selected':''}>${x}</option>`).join('')}</select><input class="wf-options" aria-label="Select options" placeholder="Options, separated by commas" value="${esc((f.options||[]).join(', '))}"><label><input class="wf-required" type="checkbox" ${f.required?'checked':''}> Required</label><button type="button" class="btn btn-outline btn-sm wf-remove">Remove</button>`;row.dataset.key=f.key||'';row.querySelector('.wf-remove').onclick=()=>row.remove();fieldBox.append(row);}
  function addStep(s={}){const row=document.createElement('div');row.className='workflow-builder-row';row.innerHTML=`<input class="wf-step-label" aria-label="Step name" placeholder="Approval step" maxlength="80" value="${esc(s.label||'')}"><select class="wf-role" aria-label="Approver role">${roles.map(r=>`<option value="${esc(r.id)}" ${s.roleId===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select><label>Due in days <input class="wf-due" type="number" min="0" max="90" value="${Number(s.dueDays??2)}" style="width:65px"></label><button type="button" class="btn btn-outline btn-sm wf-remove">Remove</button>`;row.querySelector('.wf-remove').onclick=()=>row.remove();stepBox.append(row);}
  fields.forEach(addField);steps.forEach(addStep);box.querySelector('#wfAddField').onclick=()=>addField();box.querySelector('#wfAddStep').onclick=()=>addStep();
  function save(){const name=box.querySelector('#wfName').value.trim(),description=box.querySelector('#wfDescription').value.trim();const used=new Set();const f=[...fieldBox.children].map((r,index)=>{const label=r.querySelector('.wf-label').value.trim(),type=r.querySelector('.wf-type').value;let key=r.dataset.key||label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,36);if(!/^[a-z]/.test(key))key='field_'+index;while(used.has(key))key=key.replace(/_\d+$/,'')+'_'+index;used.add(key);return {key,label,type,required:r.querySelector('.wf-required').checked,options:type==='select'?r.querySelector('.wf-options').value.split(',').map(x=>x.trim()).filter(Boolean):[]};});const s=[...stepBox.children].map(r=>({label:r.querySelector('.wf-step-label').value.trim(),roleId:r.querySelector('.wf-role').value,dueDays:Number(r.querySelector('.wf-due').value)}));
   if(name.length<3||!f.length||f.length>20||f.some(x=>!x.label||(x.type==='select'&&!x.options.length))||!s.length||s.length>8||s.some(x=>!x.label||!x.roleId||!Number.isInteger(x.dueDays)||x.dueDays<0||x.dueDays>90)){box.querySelector('#workflowError').textContent='Add a name, valid fields, and at least one approval step with a deadline of 0 to 90 days.';return;}
   run('save_template',{id:t?.id,version:t?.version,clientId,name,description,definition:{fields:f,steps:s}},box.querySelector('.modal-foot .btn-primary'));
  }
 }
 async function toggleTemplate(t){try{await call('set_active',{id:t.id,version:t.version,active:!t.active});cache.at=0;await refresh(true);toast(t.active?'Workflow paused.':'Workflow activated.');}catch(e){toast(e.message,true);}}
 function startCase(t){if(!canUse())return;const fields=t.definition.fields;let clientId=crypto.randomUUID();const box=modal(t.name,`<p>${esc(t.description||'Complete the form and submit it for approval.')}</p>${fields.map(f=>`<div class="form-row"><label for="wfAnswer_${esc(f.key)}">${esc(f.label)}${f.required?' *':''}</label>${f.type==='textarea'?`<textarea id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}" maxlength="2000"></textarea>`:f.type==='select'?`<select id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}"><option value="">Choose…</option>${f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`:`<input id="wfAnswer_${esc(f.key)}" data-answer="${esc(f.key)}" type="${f.type==='number'?'number':f.type==='date'?'date':'text'}" maxlength="2000">`}</div>`).join('')}`,foot=>{addButton(foot,'Cancel',()=>SuiteUX.closeModal());addButton(foot,'Submit request',submit,'btn btn-primary');});
  function submit(){const answers=Object.fromEntries([...box.querySelectorAll('[data-answer]')].map(x=>[x.dataset.answer,x.value.trim()]));if(fields.some(f=>f.required&&!answers[f.key])){box.querySelector('#workflowError').textContent='Complete every required field.';return;}run('submit',{templateId:t.id,answers,clientId},box.querySelector('.modal-foot .btn-primary'));}
 }
 function openItem(id){const i=cache.items.find(x=>x.id===id);if(!i)return;const step=i.definition?.steps?.[i.step_index],review=pendingForMe(i)||manager();const box=modal(i.title,`<p><strong>Status:</strong> ${esc(i.status)} · <strong>Submitted:</strong> ${esc(SuiteUX.displayInstant(i.created_at))}</p><h4>Request details</h4>${safeList(i.definition?.fields).map(f=>`<div class="readiness-line"><strong>${esc(f.label)}</strong><span>${esc(String(i.answers?.[f.key]||'Not supplied'))}</span></div>`).join('')}<h4>Approval route</h4><ol>${safeList(i.definition?.steps).map((s,n)=>`<li>${esc(s.label)} · ${esc(STATE.roles.find(r=>r.id===s.roleId)?.name||s.roleId)} ${i.status==='pending'&&n===i.step_index?'(current)':''}</li>`).join('')}</ol><h4>History</h4>${safeList(i.history).map(h=>`<p>${esc(h.action)} · ${esc(SuiteUX.displayInstant(h.at))}${h.note?' · '+esc(h.note):''}</p>`).join('')}${i.status==='pending'&&review?'<div class="form-row"><label for="wfDecisionNote">Decision note</label><textarea id="wfDecisionNote" maxlength="500"></textarea></div>':''}`,foot=>{addButton(foot,'Close',()=>SuiteUX.closeModal());if(i.status==='pending'&&i.requester_id===CURRENT_USER_ID)addButton(foot,'Cancel request',()=>run('cancel',{id:i.id,version:i.version},box.querySelector('.modal-foot .btn-outline:last-child')));if(i.status==='pending'&&review){addButton(foot,'Reject',()=>decide('reject'));addButton(foot,'Approve',()=>decide('approve'),'btn btn-primary');}});
  function decide(action){run(action,{id:i.id,version:i.version,note:box.querySelector('#wfDecisionNote')?.value.trim()||''},box.querySelector('.modal-foot .btn-primary'));}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CURRENT_USER_ID&&available())refresh(true);});
 window.addEventListener('online',()=>{if(CURRENT_USER_ID&&available())refresh(true);});
 return {readiness,readinessTasks,renderReadiness,renderWorkflows,refresh,tasks,available,openItem};
})();

const FieldTraining=(()=>{
 const esc=escapeHtml, today=()=>new Date().toLocaleDateString('en-CA'), states={draft:'Draft',supervisor_review:'Pending supervisor review',trainee_ack:'Pending trainee acknowledgment',acknowledged:'Acknowledged',disputed:'Trainee response / dispute',returned:'Returned to FTO'};
 const statusBadge=status=>{const cls=status==='acknowledged'?'badge-available':status==='supervisor_review'||status==='trainee_ack'?'badge-assigned':status==='returned'||status==='disputed'?'badge-missing':'badge-role';return `<span class="badge ${cls}">${esc(states[status]||status)}</span>`;};
 const defaultTemplate=model=>({ratingScale:model==='reno'?[{id:'not_observed',label:'Not observed'},{id:'needs_improvement',label:'Needs coaching'},{id:'developing',label:'Developing'},{id:'meets_standard',label:'Meets standard'},{id:'exceeds_standard',label:'Exceeds standard'},{id:'nrt',label:'NRT — Not Responding To Training'}]:[{id:'not_observed',label:'Not observed'},...[1,2,3,4,5,6,7].map(n=>({id:String(n),label:String(n)})),{id:'nrt',label:'NRT — Not Responding To Training'}],phases:model==='reno'?['Non-emergency response','Emergency response','Patrol activities','Criminal investigation']:['Orientation','Phase 1','Phase 2','Phase 3','Final evaluation'],categories:(model==='reno'?['Officer safety','Communication','Critical thinking','Problem solving','Community engagement','Report writing','Legal authority','Ethics']:['Officer safety','Driving','Radio use','Investigations','Report writing','Legal knowledge','Decision making','Community relations','Professional conduct']).map((label,i)=>({id:'category_'+(i+1),label})),items:(model==='reno'?['Learning matrix','Problem based exercise','Neighborhood portfolio','Weekly coaching','Trainee journal']:['Orientation checklist','Policy review','Traffic stops','Calls for service','Report completion','Remedial training']).map((label,i)=>({id:'item_'+(i+1),label}))});
 let actorId=null;
 let cache={key:'',loaded:false,busy:false,config:null,members:[],enrollments:[],reports:[],coverage:[],shifts:[],attachments:[],error:''};
 const context=()=>SuiteStore.remoteContext(),key=()=>{const c=context();return `${c.tenantId}/${c.agencyId}/${actorId}`;};
 const manage=()=>SuiteUX.isAdmin()||can('ft_manage'),coverManage=()=>manage()||can('ft_assign_cover'),available=()=>SuiteStore.mode()==='shared'&&(manage()||can('ft_participate'));
 const name=id=>STATE.personnel.find(p=>p.id===id||p.id==='person_'+String(id).replaceAll('-',''))?.name||cache.members.find(m=>m.user_id===id||m.person_id===id)?.display_name||'Staff member';
 const memberName=user=>{const m=cache.members.find(x=>x.user_id===user);return m?m.display_name||name(m.person_id):name(user);};
 const humanDate=x=>SuiteUX.displayDate(x||''),instant=x=>SuiteUX.displayInstant(x);
 async function call(action,payload={}){const c=context();if(!c.tenantId||!c.agencyId)throw Error('Choose an agency first.');const result=await SuiteStore.api('/field-training',{method:'POST',body:JSON.stringify({tenant_id:c.tenantId,agency_id:c.agencyId,action,payload})});return result?.data;}
 async function load(force=false){if(!available())return;if(!actorId){const me=await SuiteStore.api('/me');actorId=me?.user?.id||null;}if(!actorId)return;const k=key();if(cache.key!==k)cache={key:k,loaded:false,busy:false,config:null,members:[],enrollments:[],reports:[],coverage:[],shifts:[],attachments:[],error:''};if(cache.busy||(!force&&cache.loaded))return;cache.busy=true;try{const data=await call('list');if(key()!==k)return;Object.assign(cache,{...data,loaded:true,error:''});if(document.getElementById('view-fieldtraining')?.classList.contains('active'))render(document.getElementById('view-fieldtraining'));else if(document.getElementById('view-home')?.classList.contains('active')&&!SuiteUX.hasDirty())SuiteUX.home();}catch(e){cache.error=e.message;cache.loaded=false;const el=document.getElementById('view-fieldtraining');if(el?.classList.contains('active'))render(el);}finally{cache.busy=false;}}
 function button(host,text,fn,cls='btn btn-outline btn-sm'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;b.onclick=fn;host.append(b);return b;}
 function modal(title,html,actions){const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><h3>${esc(title)}</h3><button class="modal-close" aria-label="Close">×</button></div><div class="modal-body">${html}<p class="field-error" role="alert" data-ft-error></p></div><div class="modal-foot" data-ft-actions></div>`;SuiteUX.openModal();box.querySelector('.modal-close').onclick=()=>SuiteUX.closeModal();button(box.querySelector('[data-ft-actions]'),'Close',()=>SuiteUX.closeModal());actions?.(box,box.querySelector('[data-ft-actions]'));return box;}
 function fail(box,e){box.querySelector('[data-ft-error]').textContent=e.message||String(e);}
 async function mutate(action,payload,box,b){if(b)b.disabled=true;try{await call(action,payload);SuiteUX.closeModal();await load(true);toast('Field Training record saved.');}catch(e){fail(box,e);if(b)b.disabled=false;}}
 function tasks(){if(!available()||!cache.loaded)return [];const reportTasks=cache.reports.filter(r=>r.status==='supervisor_review'&&r.supervisor_user===actorId||r.status==='trainee_ack'&&r.trainee_user===actorId||r.status==='returned'&&r.trainer_user===actorId).map(r=>({title:(r.status==='supervisor_review'?'Review':r.status==='trainee_ack'?'Acknowledge':'Revise')+' field training '+r.kind+' report',owner:memberName(r.trainee_user),due:r.period_end,type:r.status==='supervisor_review'?'approvals':'mine',action:()=>{SuiteUX.fieldTrainingView();setTimeout(()=>openReport(r.id),0);}}));const covers=(cache.coverage||[]).filter(c=>c.cover_user===actorId&&!c.cancelled_at&&c.end_on>=today()).map(c=>({title:'Cover Field Training · '+name(cache.enrollments.find(e=>e.id===c.enrollment_id)?.trainee_person),owner:'Assigned coverage',due:c.start_on,type:'mine',action:()=>{SuiteUX.fieldTrainingView();setTimeout(()=>openFile(c.enrollment_id),0);}}));return reportTasks.concat(covers);}
 function render(el){if(!available()){el.innerHTML='<div class="empty-state">Field Training is not enabled for this role.</div>';return;}if(!cache.loaded){el.innerHTML=`<div class="work-hero"><div><h2>Field Training</h2><p>${esc(cache.error||'Loading the agency program…')}</p></div></div><button id="ftRetry" class="btn btn-outline">Retry</button>`;el.querySelector('#ftRetry').onclick=()=>load(true);load();return;}
 const active=cache.enrollments.filter(e=>['active','extended'].includes(e.status)),due=cache.reports.filter(r=>['supervisor_review','trainee_ack','returned'].includes(r.status));
 el.innerHTML=`<div class="work-hero"><div><div class="work-eyebrow">Training and evaluation</div><h2>Field Training</h2><p>${cache.config?esc(cache.config.model==='reno'?'Reno style PTO program':'San Jose style FTO program'):'Set up an agency program to begin'} · trainee files, evaluations and program outcomes</p></div></div><div class="work-metrics"><div class="work-metric good"><span>Active trainees</span><strong>${active.length}</strong></div><div class="work-metric"><span>Reports</span><strong>${cache.reports.length}</strong></div><div class="work-metric urgent"><span>Awaiting action</span><strong>${due.length}</strong></div><div class="work-metric"><span>Completed</span><strong>${cache.enrollments.filter(e=>e.status==='completed').length}</strong></div></div><div class="panel"><div class="panel-head"><h2>Trainee files</h2><div id="ftActions"></div></div><div id="ftFiles"></div></div><div class="panel"><div class="panel-head"><h2>Field Training analytics</h2><div class="hint">Filters and exports use the files you are authorized to view.</div></div><div class="panel-body" id="ftStats"></div></div>`;
 const a=el.querySelector('#ftActions');button(a,'Refresh',()=>load(true));if(manage()){button(a,'Program setup',setup);if(cache.config)button(a,'Enroll trainee',enroll,'btn btn-primary btn-sm');}

 const files=el.querySelector('#ftFiles');for(const e of cache.enrollments){const rs=cache.reports.filter(r=>r.enrollment_id===e.id),phase=e.template?.phases?.[e.phase_index]?.name||'Phase',pendingReview=rs.filter(r=>r.status==='supervisor_review').length;const row=document.createElement('div');row.className='work-item ft-file-card';row.innerHTML=`<div class="work-priority ${rs.some(r=>r.status==='returned'||r.status==='disputed')?'urgent':''}"></div><div class="ft-file-main"><h3>${esc(name(e.trainee_person))}</h3><p>${esc(e.model==='reno'?'Reno PTO':'San Jose FTO')} · ${esc(phase)} · ${esc(e.status)} · ${rs.length} report${rs.length===1?'':'s'}${pendingReview?` · ${pendingReview} awaiting supervisor review`:''}</p><small>Started ${esc(humanDate(e.started_on))} · Trainer: ${esc(memberName(e.trainer_user))} · Supervisor: ${esc(memberName(e.supervisor_user))}</small></div><div class="ft-file-card-actions"></div>`;const actions=row.querySelector('.ft-file-card-actions');button(actions,pendingReview&&(actorId===e.supervisor_user||manage())?'Open & review':'Open file',()=>openFile(e.id),pendingReview&&(actorId===e.supervisor_user||manage())?'btn btn-primary btn-sm':'btn btn-outline btn-sm');button(actions,'Download PDF',()=>exportFilePdf(e.id));files.append(row);}if(!cache.enrollments.length)files.innerHTML='<div class="panel-body">No trainees enrolled. Configure the program, then enroll the first trainee.</div>';
 renderStats(el.querySelector('#ftStats'));
 }
 function editableRows(host,items,label){host.innerHTML='';for(const x of items){const row=document.createElement('div');row.className='workflow-builder-row';row.dataset.id=x.id||'';row.innerHTML=`<input aria-label="${esc(label)}" value="${esc(x.label||x.name)}" maxlength="120"><button type="button" class="btn btn-outline btn-sm">Remove</button>`;row.querySelector('button').onclick=()=>row.remove();host.append(row);}}
 function setup(){if(!manage())return;const cfg=cache.config,box=modal('Agency Field Training program',`<p>Choose the evaluation model and tailor its terms. Existing trainee files retain the version they started with.</p><div class="form-row"><label>Program model</label><select id="ftModel"><option value="san_jose">San Jose style · daily observations</option><option value="reno">Reno style · weekly coaching</option></select></div><h4>Phases</h4><div id="ftPhases"></div><button class="btn btn-outline btn-sm" id="ftAddPhase">Add phase</button><h4>Rating choices</h4><p class="hint">Rename labels to match your agency manual. Existing reports keep their original choices.</p><div id="ftRatings"></div><h4>Evaluation categories</h4><div id="ftCategories"></div><button class="btn btn-outline btn-sm" id="ftAddCategory">Add category</button><h4>Documentation items and competencies</h4><div id="ftItems"></div><button class="btn btn-outline btn-sm" id="ftAddItem">Add item</button>`,(box,foot)=>button(foot,'Save program',save,'btn btn-primary'));
 const model=box.querySelector('#ftModel');model.value=cfg?.model||'san_jose';let draft={...(cfg?.template||defaultTemplate(model.value)),model:model.value};
 function fill(t){editableRows(box.querySelector('#ftPhases'),t.phases.map((x,i)=>({id:x.id||'phase_'+(i+1),name:x.name})),'Phase name');const baseRatings=t.ratingScale||defaultTemplate(model.value).ratingScale;const ratings=baseRatings.some(x=>x.id==='nrt'||/^NRT\b/i.test(String(x.label||x.name||'')))?baseRatings:[...baseRatings,{id:'nrt',label:'NRT — Not Responding To Training'}];editableRows(box.querySelector('#ftRatings'),ratings,'Rating label');editableRows(box.querySelector('#ftCategories'),t.categories,'Category name');editableRows(box.querySelector('#ftItems'),t.items,'Documentation item');}
 fill(draft);model.onchange=()=>{if(!confirm('Use the new model for future enrollments? Existing trainee files will retain their original model.')){model.value=draft.model;return;}draft={...defaultTemplate(model.value),model:model.value};fill(draft);};
 for(const [id,target,prefix] of [['#ftAddPhase','#ftPhases','phase'],['#ftAddCategory','#ftCategories','category'],['#ftAddItem','#ftItems','item']])box.querySelector(id).onclick=()=>{const host=box.querySelector(target);const row=document.createElement('div');row.className='workflow-builder-row';row.dataset.id=prefix+'_'+crypto.randomUUID().replace(/-/g,'').slice(0,16);row.innerHTML=`<input aria-label="New ${prefix}" maxlength="120" placeholder="Name"><button class="btn btn-outline btn-sm">Remove</button>`;row.querySelector('button').onclick=()=>row.remove();host.append(row);row.querySelector('input').focus();};
 function save(){const get=sel=>[...box.querySelector(sel).children].map(r=>({id:r.dataset.id,label:r.querySelector('input').value.trim()}));const phaseRows=get('#ftPhases'),ratingScale=get('#ftRatings'),categories=get('#ftCategories'),items=get('#ftItems');if(!phaseRows.length){fail(box,Error('Add at least one Field Training phase.'));return;}if(!categories.length){fail(box,Error('Add at least one evaluation category.'));return;}if(!items.length){fail(box,Error('Add at least one documentation item or competency.'));return;}if(ratingScale.length<2){fail(box,Error('Add at least two rating choices.'));return;}const unnamed=[['phase',phaseRows],['rating choice',ratingScale],['evaluation category',categories],['documentation item',items]].find(([,rows])=>rows.some(x=>!x.label));if(unnamed){fail(box,Error(`Every ${unnamed[0]} must have a name.`));return;}const phases=phaseRows.map(x=>({id:x.id,name:x.label}));mutate('save_config',{model:model.value,version:cfg?.version,template:{phases,ratingScale,categories,items}},box,box.querySelector('.modal-foot .btn-primary'));}
 }
 function eligibleTrainers(){return cache.members.filter(m=>(m.role_ids||[]).some(id=>id==='role_admin'||id==='role_platform_admin'||STATE.roles.find(r=>r.id===id)?.abilities?.ft_train));}
 function enroll(){if(!manage()||!cache.config)return;const opts=cache.members.map(m=>`<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join('');const trainers=eligibleTrainers().map(m=>`<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join('');const box=modal('Enroll trainee',`<div class="form-row"><label>Trainee</label><select id="ftTrainee">${opts}</select></div><div class="form-row"><label>Assigned trainer</label><select id="ftTrainer">${trainers}</select></div><div class="form-row"><label>Assigned supervisor</label><select id="ftSupervisor">${opts}</select></div><div class="form-row"><label>Start date</label><input type="date" id="ftStart" value="${today()}"></div>`,(box,foot)=>button(foot,'Enroll trainee',save,'btn btn-primary'));function save(){const ids=['ftTrainee','ftTrainer','ftSupervisor'].map(id=>box.querySelector('#'+id).value);if(new Set(ids).size!==3){fail(box,Error('Choose three different people.'));return;}mutate('enroll',{traineeUser:ids[0],trainerUser:ids[1],supervisorUser:ids[2],startedOn:box.querySelector('#ftStart').value},box,box.querySelector('.modal-foot .btn-primary'));}}
 async function openPerson(personId){await load();const e=cache.enrollments.find(x=>x.trainee_person===personId);SuiteUX.fieldTrainingView();if(e)openFile(e.id);else toast('No accessible Field Training file for this employee.',true);}
 function openFile(id){const e=cache.enrollments.find(x=>x.id===id);if(!e)return;const rs=cache.reports.filter(r=>r.enrollment_id===id),phase=e.template.phases[e.phase_index]?.name||'Phase';const box=modal(name(e.trainee_person)+' · Field Training file',`<p><strong>${esc(e.model==='reno'?'Reno PTO':'San Jose FTO')}</strong> · ${esc(phase)} · ${esc(e.status)} · template version ${e.template_version}</p><p>Trainer: ${esc(memberName(e.trainer_user))} · Supervisor: ${esc(memberName(e.supervisor_user))}</p><div id="ftFileActions"></div><h4>Coverage assignments</h4><div id="ftCoverage"></div><h4>Training shifts</h4><div id="ftShifts"></div><h4>Evaluation timeline</h4><div id="ftTimeline"></div>`,(box,foot)=>{});
 const acts=box.querySelector('#ftFileActions');if(e.status==='active'||e.status==='extended'){if(actorId===e.trainer_user||manage())button(acts,'Create evaluation',()=>newReport(e),'btn btn-primary btn-sm');if(actorId===e.supervisor_user||manage())button(acts,'Phase decision',()=>phaseDecision(e));if(manage())button(acts,'Reassign trainer / supervisor',()=>reassign(e));if(manage()||(coverManage()&&actorId===e.supervisor_user))button(acts,'Arrange coverage',()=>coverageEditor(e));if(manage()||actorId===e.supervisor_user||actorId===e.trainer_user||(cache.coverage||[]).some(c=>c.enrollment_id===e.id&&c.cover_user===actorId&&!c.cancelled_at))button(acts,'Log training shift',()=>shiftEditor(e));button(acts,'Download file PDF',()=>exportFilePdf(e.id));if((cache.coverage||[]).some(c=>c.enrollment_id===e.id&&c.cover_user===actorId&&!c.cancelled_at))button(acts,'Document covered shift',()=>newReport(e));}
 const coverList=box.querySelector('#ftCoverage');for(const c of (cache.coverage||[]).filter(x=>x.enrollment_id===e.id)){const line=document.createElement('div');line.className='readiness-line';line.innerHTML=`<span>${esc(memberName(c.cover_user))} · ${esc(humanDate(c.start_on))} to ${esc(humanDate(c.end_on))} · ${esc(c.reason)}${c.cancelled_at?' · cancelled':''}</span>`;coverList.append(line);}if(!coverList.children.length)coverList.textContent='No substitute trainer assignments.';
 const shiftList=box.querySelector('#ftShifts');for(const sh of (cache.shifts||[]).filter(x=>x.enrollment_id===e.id)){const row=document.createElement('div');row.className='readiness-line';row.innerHTML=`<span>${esc(humanDate(sh.shift_on))} · ${esc(memberName(sh.trainer_user))} · ${esc(sh.hours)} hours${sh.cancelled_at?' · cancelled':''}${sh.notes?' · '+esc(sh.notes):''}</span>`;shiftList.append(row);}if(!shiftList.children.length)shiftList.textContent='No training shifts logged. Missing report counts require logged shifts.';
 const timeline=box.querySelector('#ftTimeline');for(const r of rs){const line=document.createElement('div');line.className='readiness-line';line.innerHTML=`<div><strong>${esc({daily:'Daily observation',weekly:e.model==='reno'?'Weekly coaching':'Weekly summary',phase:'End of phase',final:'End of training',coverage:'Coverage observation'}[r.kind])}</strong><div style="margin-top:5px">${statusBadge(r.status)}</div><small style="display:block;margin-top:4px">${esc(humanDate(r.period_start))} to ${esc(humanDate(r.period_end))}</small></div>`;button(line,r.status==='supervisor_review'&&(actorId===r.supervisor_user||manage())?'Review':'Open',()=>openReport(r.id),r.status==='supervisor_review'&&(actorId===r.supervisor_user||manage())?'btn btn-primary btn-sm':'btn btn-outline btn-sm');timeline.append(line);}if(!rs.length)timeline.textContent='No reports yet.';
 }
 function coverageEditor(e){if(!(manage()||(coverManage()&&actorId===e.supervisor_user)))return;const options=eligibleTrainers().filter(m=>![e.trainee_user,e.trainer_user,e.supervisor_user].includes(m.user_id)).map(m=>`<option value="${esc(m.user_id)}">${esc(memberName(m.user_id))}</option>`).join('');const items=(cache.coverage||[]).filter(c=>c.enrollment_id===e.id&&!c.cancelled_at);const box=modal('Substitute trainer coverage',`<p>Assign an eligible FTO or PTO for up to 14 consecutive days. The substitute documents only those dates. The primary trainer remains assigned to the file.</p><div id="ftCoverItems"></div><div class="form-row"><label>Covering trainer</label><select id="ftCoverPerson">${options}</select></div><div class="form-row"><label>From</label><input id="ftCoverFrom" type="date" value="${today()}"></div><div class="form-row"><label>Through</label><input id="ftCoverTo" type="date" value="${today()}"></div><div class="form-row"><label>Reason</label><input id="ftCoverReason" maxlength="500" placeholder="Scheduled day off, sick leave, or reassignment"></div>`,(box,foot)=>button(foot,'Assign coverage',save,'btn btn-primary'));const list=box.querySelector('#ftCoverItems');for(const c of items){const row=document.createElement('div');row.className='readiness-line';row.innerHTML=`<span>${esc(memberName(c.cover_user))} · ${esc(humanDate(c.start_on))} to ${esc(humanDate(c.end_on))} · ${esc(c.reason)}</span>`;button(row,'Cancel',()=>mutate('coverage_cancel',{enrollmentId:e.id,coverageId:c.id},box));list.append(row);}if(!items.length)list.textContent='No active coverage assignments.';function save(){const coverUser=box.querySelector('#ftCoverPerson').value,startOn=box.querySelector('#ftCoverFrom').value,endOn=box.querySelector('#ftCoverTo').value,reason=box.querySelector('#ftCoverReason').value.trim();if(!coverUser||!startOn||!endOn||reason.length<3){fail(box,Error('Select a trainer, dates, and a reason.'));return;}mutate('coverage_add',{enrollmentId:e.id,coverUser,startOn,endOn,reason},box,box.querySelector('.modal-foot .btn-primary'));}}
 function reassign(e){if(!manage())return;const opts=eligibleTrainers().map(m=>`<option value=\"${esc(m.user_id)}\">${esc(memberName(m.user_id))}</option>`).join('');const supervisors=cache.members.map(m=>`<option value=\"${esc(m.user_id)}\">${esc(memberName(m.user_id))}</option>`).join('');const box=modal('Reassign training team',`<p>Existing reports retain their original trainer and supervisor signoffs.</p><div class=\"form-row\"><label>Trainer</label><select id=\"ftNewTrainer\">${opts}</select></div><div class=\"form-row\"><label>Supervisor</label><select id=\"ftNewSupervisor\">${supervisors}</select></div>`,(box,foot)=>button(foot,'Save assignment',save,'btn btn-primary'));box.querySelector('#ftNewTrainer').value=e.trainer_user;box.querySelector('#ftNewSupervisor').value=e.supervisor_user;function save(){const trainer=box.querySelector('#ftNewTrainer').value,supervisor=box.querySelector('#ftNewSupervisor').value;if(trainer===supervisor||trainer===e.trainee_user||supervisor===e.trainee_user){fail(box,Error('Choose different participants.'));return;}mutate('reassign',{enrollmentId:e.id,version:e.version,trainerUser:trainer,supervisorUser:supervisor},box,box.querySelector('.btn-primary'));}}
 function newReport(e){const assignments=(cache.coverage||[]).filter(c=>c.enrollment_id===e.id&&c.cover_user===actorId&&!c.cancelled_at).sort((a,b)=>b.start_on.localeCompare(a.start_on));const cover=assignments.find(c=>c.start_on<=today()&&c.end_on>=today())||assignments[0];const covering=actorId!==e.trainer_user&&!!cover;const types=covering?(e.model==='reno'?['coverage']:['daily','coverage']):(e.model==='reno'?['weekly','phase','final']:['daily','weekly','phase','final']);const chosenDate=covering?(cover.start_on>today()?cover.start_on:cover.end_on<today()?cover.end_on:today()):today();const box=modal('New evaluation',`<div class="form-row"><label>Report type</label><select id="ftKind">${types.map(k=>`<option value="${k}">${esc({daily:'Daily observation',weekly:e.model==='reno'?'Weekly coaching':'Weekly summary',phase:'End of phase',final:'End of training',coverage:'Coverage observation'}[k])}</option>`).join('')}</select></div><div class="form-row"><label>From</label><input type="date" id="ftFrom" value="${chosenDate}"></div><div class="form-row"><label>Through</label><input type="date" id="ftThrough" value="${chosenDate}"></div>`,(box,foot)=>button(foot,'Create draft',create,'btn btn-primary'));async function create(){const b=box.querySelector('.btn-primary');b.disabled=true;try{const r=await call('new_report',{enrollmentId:e.id,kind:box.querySelector('#ftKind').value,periodStart:box.querySelector('#ftFrom').value,periodEnd:box.querySelector('#ftThrough').value});SuiteUX.closeModal();await load(true);openReport(r.id);}catch(err){fail(box,err);b.disabled=false;}}}
 function openReport(id){const r=cache.reports.find(x=>x.id===id),e=cache.enrollments.find(x=>x.id===r?.enrollment_id);if(!r||!e)return;const editable=['draft','returned'].includes(r.status)&&(actorId===r.trainer_user||manage()),canSupervisorReview=r.status==='supervisor_review'&&(actorId===r.supervisor_user||manage());const ratings=r.content?.ratings||{},items=r.content?.items||{};
 const box=modal(`${{daily:'Daily observation',weekly:'Weekly evaluation',phase:'End of phase',final:'End of training',coverage:'Coverage observation'}[r.kind]} · ${name(e.trainee_person)}`,`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">${statusBadge(r.status)}<span>${esc(humanDate(r.period_start))} to ${esc(humanDate(r.period_end))} · ${esc(e.template.phases[r.phase_index]?.name||'Phase')} · Trainer: ${esc(memberName(r.trainer_user))}</span></div><h4>Evaluation categories</h4><div class="ft-form-grid">${e.template.categories.map(c=>`<div class="form-row"><label>${esc(c.label)}</label><select data-native-select="1" data-ft-rating="${esc(c.id)}" ${editable?'':'disabled'}>${(e.template.ratingScale||defaultTemplate(e.model).ratingScale).map(v=>`<option value="${esc(v.id)}" ${ratings[c.id]===v.id?'selected':''}>${esc(v.label)}</option>`).join('')}</select></div>`).join('')}</div><h4>Documentation and competencies</h4><div class="ft-form-grid">${e.template.items.map(c=>`<div class="form-row"><label>${esc(c.label)}</label><select data-native-select="1" data-ft-item="${esc(c.id)}" ${editable?'':'disabled'}>${['pending','demonstrated','remediation'].map(v=>`<option value="${v}" ${items[c.id]===v?'selected':''}>${esc(v)}</option>`).join('')}</select></div>`).join('')}</div><div class="form-row"><label>Observed conduct, coaching and supporting examples</label><textarea id="ftNarrative" maxlength="12000" rows="8" ${editable?'':'readonly'}>${esc(r.content?.narrative||'')}</textarea></div><div class="form-row"><label>Recommendations and next steps</label><textarea id="ftRecommendation" maxlength="3000" rows="4" ${editable?'':'readonly'}>${esc(r.content?.recommendation||'')}</textarea></div><h4>Attachments</h4><div id="ftAttachments"></div>${editable?'<div class="form-row"><label>Add file (PDF, image, Word document or text, up to 10 MB)</label><input type="file" id="ftFile" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"></div><div class="form-row"><label>Attachment description</label><input id="ftFileDescription" maxlength="500"></div><button id="ftUpload" class="btn btn-outline btn-sm">Upload attachment</button>':''}<h4>Approval history</h4><div>${(r.history||[]).map(h=>`<p>${esc(h.action)} · ${esc(instant(h.at))}${h.note?' · '+esc(h.note):''}</p>`).join('')}</div>${r.status==='supervisor_review'?`<div class="callout callout-blue"><strong>Supervisor review required</strong><div style="margin-top:6px">Assigned supervisor: ${esc(memberName(r.supervisor_user))}${canSupervisorReview?' · You may approve or return this DOR below.':' · This DOR is waiting for that supervisor.'}</div></div>`:''}${canSupervisorReview?'<div class="form-row"><label>Review note</label><textarea id="ftReviewNote" maxlength="1000" placeholder="Optional note for approval or return"></textarea></div>':''}${r.status==='trainee_ack'&&actorId===r.trainee_user?'<div class="form-row"><label>Optional response or reason for dispute</label><textarea id="ftReviewNote" maxlength="3000"></textarea></div>':''}`, (box,foot)=>{if(editable){button(foot,'Save draft',save,'btn btn-outline');if(actorId===r.trainer_user)button(foot,'Submit to supervisor',()=>decide('submit'),'btn btn-primary');}if(canSupervisorReview){button(foot,'Return to trainer',()=>decide('return'));button(foot,'Approve DOR',()=>decide('approve'),'btn btn-primary');}if(r.status==='trainee_ack'&&actorId===r.trainee_user){button(foot,'Dispute',()=>decide('dispute'));button(foot,'Acknowledge receipt',()=>decide('acknowledge'),'btn btn-primary');}});
 button(box.querySelector('[data-ft-actions]'),'Download PDF',()=>exportReportPdf(r.id));
 const attachments=cache.attachments.filter(x=>x.report_id===r.id),target=box.querySelector('#ftAttachments');for(const a of attachments){const line=document.createElement('div');line.className='readiness-line';line.innerHTML=`<span>${esc(a.file_name)} <small>${esc(a.description||'')}</small></span>`;button(line,'Download',()=>download(r,a));target.append(line);}if(!attachments.length)target.textContent='No attachments.';
 if(editable)box.querySelector('#ftUpload').onclick=()=>upload(box,r,content);
 function content(){return {ratings:Object.fromEntries([...box.querySelectorAll('[data-ft-rating]')].map(x=>[x.dataset.ftRating,x.value])),items:Object.fromEntries([...box.querySelectorAll('[data-ft-item]')].map(x=>[x.dataset.ftItem,x.value])),narrative:box.querySelector('#ftNarrative').value.trim(),recommendation:box.querySelector('#ftRecommendation').value.trim()};}
 function save(){mutate('save_report',{reportId:r.id,version:r.version,content:content()},box,box.querySelector('.modal-foot .btn-outline:last-child'));}
 async function decide(action){const b=box.querySelector('.modal-foot .btn-primary');if(b)b.disabled=true;try{let version=r.version;if(action==='submit'){const saved=await call('save_report',{reportId:r.id,version,content:content()});version=saved.version;}await call(action,{reportId:r.id,version,note:box.querySelector('#ftReviewNote')?.value.trim()||''});SuiteUX.closeModal();await load(true);toast('Report '+(action==='acknowledge'?'acknowledged':action)+'.');}catch(err){fail(box,err);if(b)b.disabled=false;}}
 }
 async function upload(box,r,content){const file=box.querySelector('#ftFile').files[0];if(!file){fail(box,Error('Choose a file first.'));return;}const types={'pdf':'application/pdf','jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp','txt':'text/plain','docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};const ext=file.name.split('.').pop().toLowerCase(),type=types[ext];if(!type||file.size>10485760||!file.size){fail(box,Error('Choose a supported file up to 10 MB.'));return;}const b=box.querySelector('#ftUpload');b.disabled=true;try{const saved=await call('save_report',{reportId:r.id,version:r.version,content:content()});const meta=await AWS_ATTACHMENTS.upload(file);await call('confirm_attachment',{reportId:r.id,version:saved.version,fileName:file.name,contentType:type,byteCount:file.size,description:box.querySelector('#ftFileDescription').value.trim(),storageKey:meta.storageKey});SuiteUX.closeModal();await load(true);openReport(r.id);toast('Attachment added to AWS.');}catch(err){fail(box,err);b.disabled=false;}}
 async function download(r,a){try{await AWS_ATTACHMENTS.download({storageKey:a.storage_key||a.storageKey,filename:a.file_name||a.filename});}catch(e){toast(e.message,true);}}
 function phaseDecision(e){const box=modal('Phase decision · '+name(e.trainee_person),`<p>Advance only after the end of phase report has supervisor approval. Completing training requires an approved end of training report.</p><div class="form-row"><label>Decision</label><select id="ftOutcome"><option value="next">Advance to next phase</option><option value="extended">Extend current phase</option><option value="completed">Complete training</option><option value="separated">Separate from program</option></select></div>`,(box,foot)=>button(foot,'Record decision',()=>mutate('advance',{enrollmentId:e.id,version:e.version,outcome:box.querySelector('#ftOutcome').value},box,box.querySelector('.btn-primary')),'btn btn-primary'));}
 function shiftEditor(e){
  const rows=(cache.shifts||[]).filter(x=>x.enrollment_id===e.id&&!x.cancelled_at);
  const box=modal('Training shifts · '+name(e.trainee_person),`<p>Log actual training days to measure missing evaluations. A substitute trainer is selected automatically for their assigned dates.</p><div id="ftShiftRows"></div><div class="form-row"><label>Training date</label><input id="ftShiftDate" type="date" value="${today()}"></div><div class="form-row"><label>Hours</label><input id="ftShiftHours" type="number" min="0.25" max="24" step="0.25" value="8"></div><div class="form-row"><label>Trainer for this date</label><strong id="ftShiftTrainer"></strong></div><div class="form-row"><label>Notes</label><input id="ftShiftNotes" maxlength="1000" placeholder="Patrol assignment or training activity"></div>`,(box,foot)=>button(foot,'Log training shift',save,'btn btn-primary'));
  const host=box.querySelector('#ftShiftRows');for(const sh of rows){const row=document.createElement('div');row.className='readiness-line';row.innerHTML=`<span>${esc(humanDate(sh.shift_on))} · ${esc(memberName(sh.trainer_user))} · ${esc(sh.hours)} hours</span>`;if(manage()||actorId===e.supervisor_user||actorId===sh.recorded_by)button(row,'Void',()=>mutate('shift_cancel',{enrollmentId:e.id,shiftId:sh.id},box));host.append(row);}if(!rows.length)host.textContent='No shifts logged yet.';
  function trainer(){const day=box.querySelector('#ftShiftDate').value,c=(cache.coverage||[]).find(x=>x.enrollment_id===e.id&&!x.cancelled_at&&x.start_on<=day&&x.end_on>=day);const user=c?.cover_user||e.trainer_user;box.querySelector('#ftShiftTrainer').textContent=memberName(user);return user;}
  box.querySelector('#ftShiftDate').onchange=trainer;trainer();function save(){const shiftOn=box.querySelector('#ftShiftDate').value,hours=Number(box.querySelector('#ftShiftHours').value);if(!shiftOn||hours<0.25||hours>24){fail(box,Error('Enter a date and 0.25 to 24 hours.'));return;}mutate('shift_add',{enrollmentId:e.id,shiftOn,hours,trainerUser:trainer(),notes:box.querySelector('#ftShiftNotes').value.trim()},box,box.querySelector('.modal-foot .btn-primary'));}
 }
 const reportKind={daily:'Daily observation',weekly:'Weekly evaluation',phase:'End of phase',final:'End of training',coverage:'Coverage observation'};
 const approvedStatus=r=>['trainee_ack','acknowledged','disputed'].includes(r.status);
 const submittedStatus=r=>['supervisor_review','trainee_ack','acknowledged','disputed'].includes(r.status);
 const dateOnly=x=>String(x||'').slice(0,10);
 const daysBetween=(a,b)=>Math.floor((new Date(dateOnly(b)+'T12:00:00Z')-new Date(dateOnly(a)+'T12:00:00Z'))/86400000);
 const hoursBetween=(a,b)=>a&&b?Math.max(0,Math.round((new Date(b)-new Date(a))/3600000*10)/10):null;
 function monday(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
 const phaseLabel=(e,i)=>e.template?.phases?.[i]?.name||`Phase ${Number(i)+1}`;
 const ftCsv=(rows,filename)=>{if(!rows.length){toast('No matching records to export.',true);return;}const cols=[...new Set(rows.flatMap(Object.keys))],csv=[cols.join(','),...rows.map(row=>cols.map(k=>{let v=String(row[k]??'');if(/^[=+@\t\r-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}).join(','))].join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
 const reportingFilter={model:'all',outcome:'all',phase:'all',type:'all',status:'all',trainee:'all',trainer:'all',from:'',through:'',view:'overview',gap:'all'};
 function reportingData(){
  const f=reportingFilter,dates=x=>(!f.from||dateOnly(x)>=f.from)&&(!f.through||dateOnly(x)<=f.through);
  const files=cache.enrollments.filter(e=>(f.model==='all'||e.model===f.model)&&(f.outcome==='all'||e.status===f.outcome)&&(f.trainee==='all'||e.trainee_user===f.trainee));
  const ids=new Set(files.map(e=>e.id)),byId=new Map(files.map(e=>[e.id,e]));
  const reports=cache.reports.filter(r=>ids.has(r.enrollment_id)&&dates(r.period_start)&&(f.phase==='all'||String(r.phase_index)===f.phase)&&(f.type==='all'||r.kind===f.type)&&(f.status==='all'||r.status===f.status)&&(f.trainer==='all'||r.trainer_user===f.trainer));
  const shifts=(cache.shifts||[]).filter(s=>ids.has(s.enrollment_id)&&!s.cancelled_at&&dates(s.shift_on)&&(f.trainer==='all'||s.trainer_user===f.trainer)&&(f.phase==='all'||String(s.phase_index)===f.phase));
  const selectedIds=new Set([...reports.map(r=>r.enrollment_id),...shifts.map(s=>s.enrollment_id)]);
  return {files:files.filter(e=>!(f.from||f.through||f.phase!=='all'||f.type!=='all'||f.status!=='all'||f.trainer!=='all')||selectedIds.has(e.id)||dates(e.started_on)),reports,shifts,byId};
 }
 function complianceRows(data){
  const out=[];
  for(const e of data.files){
   const shifts=data.shifts.filter(s=>s.enrollment_id===e.id&&s.shift_on<=today());
   const reports=cache.reports.filter(r=>r.enrollment_id===e.id);
   const groups=new Map();
   for(const sh of shifts){
    const period=e.model==='reno'?monday(sh.shift_on):sh.shift_on;
    const key=[e.id,period,sh.trainer_user,sh.phase_index,!!sh.coverage_id].join('|');
    let row=groups.get(key);
    if(!row){row={enrollment_id:e.id,trainee:name(e.trainee_person),model:e.model,period,trainer:memberName(sh.trainer_user),trainer_user:sh.trainer_user,phase:phaseLabel(e,sh.phase_index),shifts:0,hours:0,kind:e.model==='reno'?(sh.coverage_id?'PTO coverage observations':'Weekly evaluation'):'Daily / coverage',status:'Missing',report_id:'',coverage:sh.coverage_id?'Yes':'No',phase_index:sh.phase_index,days:[]};groups.set(key,row);}
    row.shifts++;row.hours+=Number(sh.hours);row.days.push(sh.shift_on);
   }
   for(const row of groups.values()){
    const eligible=reports.filter(r=>r.trainer_user===row.trainer_user&&r.phase_index===row.phase_index);
    const primaryWeekly=e.model==='reno'&&row.coverage==='No';
    const candidate=day=>eligible.filter(r=>primaryWeekly?r.kind==='weekly'&&row.days.every(d=>r.period_start<=d&&r.period_end>=d):r.period_start===day&&(e.model==='reno'?r.kind==='coverage':r.kind==='daily'||r.kind==='coverage'));
    const sets=primaryWeekly?[candidate(row.days[0])]:row.days.map(candidate);
    const allApproved=sets.every(rs=>rs.some(approvedStatus));
    const allSubmitted=sets.every(rs=>rs.some(submittedStatus));
    const anyReport=sets.some(rs=>rs.length);
    row.status=allApproved?'Supervisor approved':allSubmitted?'Submitted, awaiting approval':anyReport?'Partial / draft / returned':(e.model==='reno'?daysBetween(row.period,today())<7:row.period===today())?'In progress':'Missing';
    row.report_id=sets.flat()[0]?.id||'';
    delete row.days;
    out.push(row);
   }
  }
  return out.sort((a,b)=>b.period.localeCompare(a.period)||a.trainee.localeCompare(b.trainee));
 }
 function metricCells(el,cards){el.insertAdjacentHTML('beforeend',`<div class="work-metrics">${cards.map(([label,value])=>`<div class="work-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}</div>`);}
 function table(el,head,rows){const wrap=document.createElement('div');wrap.style.overflowX='auto';wrap.innerHTML=`<table class="data-table" style="width:100%"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map(v=>`<td>${esc(String(v??''))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${head.length}">No matching records.</td></tr>`}</tbody></table>`;el.append(wrap);}
 function exportRows(type,data,gaps){const {files,reports,shifts,byId}=data;
  if(type==='trainees')return files.map(e=>({trainee:name(e.trainee_person),model:e.model,started_on:e.started_on,finished_on:e.finished_on||'',status:e.status,current_phase:phaseLabel(e,e.phase_index),template_version:e.template_version,trainer:memberName(e.trainer_user),supervisor:memberName(e.supervisor_user),logged_shifts:shifts.filter(s=>s.enrollment_id===e.id).length,training_hours:shifts.filter(s=>s.enrollment_id===e.id).reduce((n,s)=>n+Number(s.hours),0),reports:reports.filter(r=>r.enrollment_id===e.id).length,approved:reports.filter(r=>r.enrollment_id===e.id&&approvedStatus(r)).length,disputed:reports.filter(r=>r.enrollment_id===e.id&&r.status==='disputed').length}));
  if(type==='evaluations')return reports.flatMap(r=>{const e=byId.get(r.enrollment_id);return (e?.template?.categories||[]).map(c=>({trainee:name(e.trainee_person),report_id:r.id,report_type:r.kind,report_status:r.status,period_start:r.period_start,period_end:r.period_end,phase:phaseLabel(e,r.phase_index),trainer:memberName(r.trainer_user),supervisor:memberName(r.supervisor_user),coverage:r.coverage_id?'Yes':'No',category:c.label,rating:r.content?.ratings?.[c.id]||'',documentation:JSON.stringify(r.content?.items||{}),attachment_count:cache.attachments.filter(a=>a.report_id===r.id).length}));});
  if(type==='gaps')return gaps;
  if(type==='shifts')return shifts.map(s=>({trainee:name(byId.get(s.enrollment_id)?.trainee_person),date:s.shift_on,trainer:memberName(s.trainer_user),hours:s.hours,notes:s.notes,logged_at:s.created_at}));
  if(type==='progress')return reports.filter(approvedStatus).flatMap(r=>{const e=byId.get(r.enrollment_id);return (e?.template?.categories||[]).map(c=>({trainee:name(e.trainee_person),model:e.model,template_version:e.template_version,phase:phaseLabel(e,r.phase_index),date:r.period_start,category:c.label,rating:e.template.ratingScale.find(x=>x.id===r.content?.ratings?.[c.id])?.label||'',trainer:memberName(r.trainer_user)}));});
  if(type==='trainers')return [...new Set([...reports.map(r=>r.trainer_user),...shifts.map(s=>s.trainer_user)])].map(id=>{const rs=reports.filter(r=>r.trainer_user===id),ss=shifts.filter(s=>s.trainer_user===id);return {trainer:memberName(id),logged_shifts:ss.length,hours:ss.reduce((n,x)=>n+Number(x.hours),0),reports:rs.length,coverage_reports:rs.filter(r=>!!r.coverage_id).length,approved:rs.filter(approvedStatus).length,returned:rs.filter(r=>r.status==='returned').length,disputed:rs.filter(r=>r.status==='disputed').length};});
  if(type==='ratings'){const rows=[];for(const r of reports.filter(approvedStatus)){const e=byId.get(r.enrollment_id);for(const c of e.template.categories){const id=r.content?.ratings?.[c.id];if(id&&id!=='not_observed')rows.push({model:e.model,template_version:e.template_version,category:c.label,rating:e.template.ratingScale.find(x=>x.id===id)?.label||id,trainee:name(e.trainee_person),date:r.period_start,phase:phaseLabel(e,r.phase_index)});}}return rows;}
  if(type==='milestones')return files.flatMap(e=>{const rs=cache.reports.filter(r=>r.enrollment_id===e.id);return [...Array(e.phase_index).keys()].map(i=>({trainee:name(e.trainee_person),phase:phaseLabel(e,i),report:'End of phase',status:rs.some(r=>r.phase_index===i&&r.kind==='phase'&&approvedStatus(r))?'Approved':'Missing approval'})).concat(['completed','separated'].includes(e.status)?[{trainee:name(e.trainee_person),phase:phaseLabel(e,e.phase_index),report:'End of training',status:rs.some(r=>r.kind==='final'&&approvedStatus(r))?'Approved':'Missing approval'}]:[]);});
  if(type==='approvals')return reports.map(r=>({trainee:name(byId.get(r.enrollment_id)?.trainee_person),type:r.kind,period:r.period_start,status:r.status,trainer:memberName(r.trainer_user),supervisor:memberName(r.supervisor_user),submitted_at:r.trainer_submitted_at||'',supervisor_approved_at:r.supervisor_approved_at||'',trainee_responded_at:r.trainee_responded_at||'',supervisor_hours:hoursBetween(r.trainer_submitted_at,r.supervisor_approved_at),trainee_hours:hoursBetween(r.supervisor_approved_at,r.trainee_responded_at),coverage:r.coverage_id?'Yes':'No'}));
  if(type==='competencies')return reports.filter(approvedStatus).flatMap(r=>{const e=byId.get(r.enrollment_id);return (e?.template?.items||[]).map(item=>({trainee:name(e.trainee_person),phase:phaseLabel(e,r.phase_index),date:r.period_start,item:item.label,state:r.content?.items?.[item.id]||'pending',trainer:memberName(r.trainer_user)}));});
  return [];
 }
 function renderStats(el){const data=reportingData(),{files,reports,shifts,byId}=data,gaps=complianceRows(data),f=reportingFilter;
  const opt=(pairs,value)=>pairs.map(([id,label])=>`<option value="${esc(String(id))}" ${String(id)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
  const memberOpts=(ids)=>[['all','All'],...[...ids].sort((a,b)=>memberName(a).localeCompare(memberName(b))).map(id=>[id,memberName(id)])];
  el.innerHTML=`<div class="ft-stat-filters"><label>Model <select data-ft-filter="model">${opt([['all','All'],['san_jose','San Jose'],['reno','Reno']],f.model)}</select></label><label>Trainee <select data-ft-filter="trainee">${opt(memberOpts(cache.enrollments.map(e=>e.trainee_user)),f.trainee)}</select></label><label>Trainer <select data-ft-filter="trainer">${opt(memberOpts(new Set([...cache.reports.map(r=>r.trainer_user),...(cache.shifts||[]).map(s=>s.trainer_user),...cache.enrollments.map(e=>e.trainer_user)])),f.trainer)}</select></label><label>Outcome <select data-ft-filter="outcome">${opt([['all','All'],['active','Active'],['extended','Extended'],['completed','Completed'],['separated','Separated']],f.outcome)}</select></label><label>Historical phase <select data-ft-filter="phase">${opt([['all','All'],...[0,1,2,3,4,5,6,7,8,9].map(i=>[i,`Phase ${i+1}`])],f.phase)}</select></label><label>Report type <select data-ft-filter="type">${opt([['all','All'],...Object.entries(reportKind)],f.type)}</select></label><label>Report status <select data-ft-filter="status">${opt([['all','All'],...Object.entries(states)],f.status)}</select></label><label>From <input data-ft-filter="from" type="date" value="${esc(f.from)}"></label><label>Through <input data-ft-filter="through" type="date" value="${esc(f.through)}"></label></div><div class="ft-stat-filters" id="ftReportTabs"></div><div id="ftReportBody"></div><div class="ft-stat-filters" id="ftReportExports"></div>`;
  el.querySelectorAll('[data-ft-filter]').forEach(input=>input.onchange=()=>{reportingFilter[input.dataset.ftFilter]=input.value;renderStats(el);});
  const tabs=el.querySelector('#ftReportTabs');for(const [id,label] of [['overview','Overview'],['progress','Progress'],['compliance','Report compliance'],['trainers','Trainers & coverage'],['categories','Ratings'],['competencies','Competencies'],['approvals','Approvals']])button(tabs,label,()=>{f.view=id;renderStats(el);},f.view===id?'btn btn-primary btn-sm':'btn btn-outline btn-sm');
  const body=el.querySelector('#ftReportBody');const missing=gaps.filter(g=>g.status==='Missing'),pending=reports.filter(r=>['supervisor_review','trainee_ack','returned'].includes(r.status));
  if(f.view==='overview'){metricCells(body,[['Trainees',files.length],['Training shifts',shifts.length],['Training hours',shifts.reduce((n,s)=>n+Number(s.hours),0).toFixed(1)],['Evaluations',reports.length],['Approved',reports.filter(approvedStatus).length],['Missing from logged shifts',missing.length]]);table(body,['Trainee','Model','Current phase','Outcome','Shifts','Hours','Reports','Approved','Disputed'],files.map(e=>{const ss=shifts.filter(s=>s.enrollment_id===e.id),rs=reports.filter(r=>r.enrollment_id===e.id);return [name(e.trainee_person),e.model==='reno'?'Reno':'San Jose',phaseLabel(e,e.phase_index),e.status,ss.length,ss.reduce((n,s)=>n+Number(s.hours),0).toFixed(1),rs.length,rs.filter(approvedStatus).length,rs.filter(r=>r.status==='disputed').length];}));}
  if(f.view==='progress'){const rows=reports.filter(approvedStatus).flatMap(r=>{const e=byId.get(r.enrollment_id);return (e?.template?.categories||[]).map(c=>({trainee:name(e.trainee_person),model:e.model,version:e.template_version,phase:phaseLabel(e,r.phase_index),date:r.period_start,category:c.label,rating:e.template.ratingScale.find(x=>x.id===r.content?.ratings?.[c.id])?.label||'',trainer:memberName(r.trainer_user)}));}).sort((a,b)=>a.trainee.localeCompare(b.trainee)||a.date.localeCompare(b.date));table(body,['Trainee','Date','Model / template','Historical phase','Category','Rating','Trainer'],rows.map(r=>[r.trainee,humanDate(r.date),`${r.model} v${r.version}`,r.phase,r.category,r.rating,r.trainer]));body.insertAdjacentHTML('beforeend','<p class="hint">Ratings are shown chronologically within each trainee and template. No numeric averages are combined across agency-defined rating scales.</p>');}
  if(f.view==='compliance'){metricCells(body,[['Logged shifts',shifts.length],['Expected periods',gaps.length],['Missing',missing.length],['In progress',gaps.filter(g=>g.status==='In progress').length],['Partial / draft / returned',gaps.filter(g=>g.status==='Partial / draft / returned').length],['Submitted',gaps.filter(g=>g.status==='Submitted, awaiting approval').length],['Approved',gaps.filter(g=>g.status==='Supervisor approved').length]]);const sel=document.createElement('label');sel.textContent='Show ';sel.innerHTML+=`<select id="ftGapFilter">${opt([['all','All'],['Missing','Missing'],['In progress','In progress'],['Partial / draft / returned','Partial / draft / returned'],['Submitted, awaiting approval','Submitted, awaiting approval'],['Supervisor approved','Supervisor approved']],f.gap)}</select>`;body.append(sel);sel.querySelector('select').onchange=()=>{f.gap=sel.querySelector('select').value;renderStats(el);};table(body,['Trainee','Period starting','Historical phase','Expected','Shifts','Hours','Trainer','Report state'],gaps.filter(g=>f.gap==='all'||g.status===f.gap).map(g=>[g.trainee,humanDate(g.period),g.phase,g.kind,g.shifts,g.hours.toFixed(1),g.trainer,g.status]));body.insertAdjacentHTML('beforeend','<p class="hint">Expected daily observations are based on logged San Jose training days. Reno weekly evaluations are based on weeks with logged training shifts. Coverage observations are checked for each covered shift. The current day or week is shown as in progress until it closes. Unlogged shifts cannot be counted. Phase and final reports are tracked separately below.</p>');const milestones=files.flatMap(e=>{const rs=cache.reports.filter(r=>r.enrollment_id===e.id);return [...Array(e.phase_index).keys()].map(i=>[name(e.trainee_person),phaseLabel(e,i),'End of phase',rs.some(r=>r.phase_index===i&&r.kind==='phase'&&approvedStatus(r))?'Approved':'Missing approval']).concat(['completed','separated'].includes(e.status)?[[name(e.trainee_person),phaseLabel(e,e.phase_index),'End of training',rs.some(r=>r.kind==='final'&&approvedStatus(r))?'Approved':'Missing approval']]:[]);});table(body,['Trainee','Phase','Milestone','State'],milestones);}
  if(f.view==='trainers'){const ids=new Set([...shifts.map(s=>s.trainer_user),...reports.map(r=>r.trainer_user)]);table(body,['Trainer','Training shifts','Hours','Reports','Coverage reports','Approved','Returned','Disputed'],[...ids].map(id=>{const ss=shifts.filter(s=>s.trainer_user===id),rs=reports.filter(r=>r.trainer_user===id);return [memberName(id),ss.length,ss.reduce((n,s)=>n+Number(s.hours),0).toFixed(1),rs.length,rs.filter(r=>!!r.coverage_id).length,rs.filter(approvedStatus).length,rs.filter(r=>r.status==='returned').length,rs.filter(r=>r.status==='disputed').length];}));table(body,['Trainee','Covering trainer','Dates','Reason','State'],(cache.coverage||[]).filter(c=>byId.has(c.enrollment_id)&&(!f.from||c.end_on>=f.from)&&(!f.through||c.start_on<=f.through)&&(f.trainer==='all'||c.cover_user===f.trainer)).map(c=>[name(byId.get(c.enrollment_id).trainee_person),memberName(c.cover_user),`${humanDate(c.start_on)} to ${humanDate(c.end_on)}`,c.reason,c.cancelled_at?'Cancelled':'Active']));}
  if(f.view==='categories'){const categories=new Map();for(const r of reports.filter(approvedStatus)){const e=byId.get(r.enrollment_id);for(const c of e.template.categories){const rating=r.content?.ratings?.[c.id];if(!rating||rating==='not_observed')continue;const key=[e.model,e.template_version,c.id].join('|');let x=categories.get(key);if(!x){x={model:e.model,version:e.template_version,label:c.label,counts:{},total:0};categories.set(key,x);}const label=e.template.ratingScale.find(y=>y.id===rating)?.label||rating;x.counts[label]=(x.counts[label]||0)+1;x.total++;}}table(body,['Model','Template','Category','Observed','Rating distribution'],[...categories.values()].map(x=>[x.model,x.version,x.label,x.total,Object.entries(x.counts).map(([k,v])=>`${k}: ${v}`).join(', ')]));body.insertAdjacentHTML('beforeend','<p class="hint">Only supervisor-approved ratings are counted. Different models and template versions are kept separate.</p>');}
  if(f.view==='competencies'){const items=new Map();for(const r of reports.filter(approvedStatus)){const e=byId.get(r.enrollment_id);for(const item of e.template.items){const key=[e.model,e.template_version,item.id].join('|');let x=items.get(key);if(!x){x={model:e.model,version:e.template_version,label:item.label,pending:0,demonstrated:0,remediation:0};items.set(key,x);}const state=r.content?.items?.[item.id]||'pending';if(state in x)x[state]++;}}table(body,['Model','Template','Documentation item','Pending','Demonstrated','Remediation'],[...items.values()].map(x=>[x.model,x.version,x.label,x.pending,x.demonstrated,x.remediation]));}
  if(f.view==='approvals'){metricCells(body,[['Awaiting action',pending.length],['Supervisor review',pending.filter(r=>r.status==='supervisor_review').length],['Trainee acknowledgment',pending.filter(r=>r.status==='trainee_ack').length],['Returned',pending.filter(r=>r.status==='returned').length],['Disputed',reports.filter(r=>r.status==='disputed').length]]);table(body,['Trainee','Report','Period','Trainer','State','Supervisor hours','Trainee hours','Age (days)'],reports.map(r=>[name(byId.get(r.enrollment_id).trainee_person),reportKind[r.kind],humanDate(r.period_start),memberName(r.trainer_user),states[r.status],hoursBetween(r.trainer_submitted_at,r.supervisor_approved_at)??'',hoursBetween(r.supervisor_approved_at,r.trainee_responded_at)??'',['supervisor_review','trainee_ack','returned'].includes(r.status)?daysBetween(dateOnly(r.updated_at),today()):'']));}
  const actions=el.querySelector('#ftReportExports');for(const [id,label] of [['trainees','Trainees CSV'],['evaluations','Evaluations CSV'],['progress','Progress CSV'],['ratings','Ratings CSV'],['gaps','Compliance CSV'],['milestones','Milestones CSV'],['shifts','Shifts CSV'],['trainers','Trainers CSV'],['competencies','Competencies CSV'],['approvals','Approvals CSV']])button(actions,label,()=>ftCsv(exportRows(id,data,gaps),`field-training-${id}.csv`));actions.insertAdjacentHTML('beforeend','<p class="hint">CSV exports honor the selected filters and your access to trainee files.</p>');
 }
 function pdfSafe(value){return String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[^\x20-\x7e]/g,'?');}
 function pdfLines(lines,filename){const wrapped=[];for(const value of lines){for(const original of String(value??'').split('\n')){let line=pdfSafe(original);if(!line){wrapped.push('');continue;}while(line.length>96){let cut=line.lastIndexOf(' ',96);if(cut<30)cut=96;wrapped.push(line.slice(0,cut));line=line.slice(cut).trimStart();}wrapped.push(line);}}const pages=[];for(let i=0;i<wrapped.length;i+=54)pages.push(wrapped.slice(i,i+54));if(!pages.length)pages.push([]);
  const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  pages.forEach((page,index)=>{const pageId=4+index*2,streamId=pageId+1;objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`;const content=['BT /F1 9 Tf 11 TL 48 744 Td',...page.map((line,i)=>`${i?'T* ':''}(${line.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)')}) Tj`),'ET',`BT /F1 8 Tf 48 35 Td (Page ${index+1} of ${pages.length}) Tj ET`].join('\n');objects[streamId]=`<< /Length ${content.length} >>\nstream\n${content}\nendstream`;});
  let pdf='%PDF-1.4\n';const offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const start=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  const url=URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 function reportPdfLines(r,e){const lines=[`FIELD TRAINING EVALUATION | ${reportKind[r.kind]||r.kind}`,`Trainee: ${name(e.trainee_person)}    Model: ${e.model==='reno'?'Reno PTO':'San Jose FTO'}`,`Period: ${humanDate(r.period_start)} to ${humanDate(r.period_end)}    Phase: ${phaseLabel(e,r.phase_index)}`,`Trainer: ${memberName(r.trainer_user)}    Supervisor: ${memberName(r.supervisor_user)}`,`Status: ${states[r.status]||r.status}    Report ID: ${r.id}`,'','EVALUATION CATEGORIES'];for(const c of e.template.categories){const id=r.content?.ratings?.[c.id],label=e.template.ratingScale.find(x=>x.id===id)?.label||id||'Not recorded';lines.push(`${c.label}: ${label}`);}lines.push('','DOCUMENTATION ITEMS');for(const item of e.template.items)lines.push(`${item.label}: ${r.content?.items?.[item.id]||'Not recorded'}`);lines.push('','OBSERVATIONS',r.content?.narrative||'None recorded','','RECOMMENDATIONS',r.content?.recommendation||'None recorded','','ATTACHMENTS');for(const a of cache.attachments.filter(x=>x.report_id===r.id))lines.push(`${a.file_name}${a.description?' - '+a.description:''}`);if(!cache.attachments.some(x=>x.report_id===r.id))lines.push('None recorded');lines.push('','APPROVALS AND HISTORY',`Trainer submitted: ${r.trainer_submitted_at?instant(r.trainer_submitted_at):'Pending'}`,`Supervisor approved: ${r.supervisor_approved_at?instant(r.supervisor_approved_at):'Pending'}`,`Trainee responded: ${r.trainee_responded_at?instant(r.trainee_responded_at):'Pending'}`);for(const h of r.history||[])lines.push(`${h.action} | ${instant(h.at)} | ${memberName(h.by)}${h.note?' | '+h.note:''}`);lines.push('','Attachment files are listed above and are not embedded in this PDF.');return lines;}
 function exportReportPdf(id){const r=cache.reports.find(x=>x.id===id),e=cache.enrollments.find(x=>x.id===r?.enrollment_id);if(!r||!e){toast('Report unavailable.',true);return;}pdfLines(reportPdfLines(r,e),`field-training-${r.kind}-${r.period_start}-${r.id.slice(0,8)}.pdf`);}
 function exportFilePdf(id){const e=cache.enrollments.find(x=>x.id===id);if(!e){toast('Trainee file unavailable.',true);return;}const rs=cache.reports.filter(r=>r.enrollment_id===id).sort((a,b)=>a.period_start.localeCompare(b.period_start));const ss=(cache.shifts||[]).filter(s=>s.enrollment_id===id&&!s.cancelled_at);const lines=['FIELD TRAINING FILE',`Trainee: ${name(e.trainee_person)}    Model: ${e.model==='reno'?'Reno PTO':'San Jose FTO'}`,`Started: ${humanDate(e.started_on)}    Outcome: ${e.status}`,`Current phase: ${phaseLabel(e,e.phase_index)}    Template version: ${e.template_version}`,`Assigned trainer: ${memberName(e.trainer_user)}    Supervisor: ${memberName(e.supervisor_user)}`,`Logged shifts: ${ss.length}    Hours: ${ss.reduce((n,s)=>n+Number(s.hours),0).toFixed(1)}`,'','TRAINING SHIFTS'];for(const s of ss)lines.push(`${humanDate(s.shift_on)} | ${memberName(s.trainer_user)} | ${s.hours} hours | ${s.notes||''}`);lines.push('','COVERAGE ASSIGNMENTS');for(const c of (cache.coverage||[]).filter(x=>x.enrollment_id===id))lines.push(`${memberName(c.cover_user)} | ${humanDate(c.start_on)} to ${humanDate(c.end_on)} | ${c.reason}${c.cancelled_at?' | Cancelled':''}`);for(const r of rs)lines.push('','================================================',...reportPdfLines(r,e));if(!rs.length)lines.push('','No evaluations recorded.');pdfLines(lines,`field-training-file-${dateOnly(e.started_on)}-${e.id.slice(0,8)}.pdf`);}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&available())load(true);});window.addEventListener('online',()=>{if(available())load(true);});
 return {available,manage,load,render,tasks,openFile,openPerson};
})();

const SuiteUX = (()=>{
  let route='home', restoring=false, record=null, modalDirty=false, focusReturn=null, lastViews={}, viewScroll={}, activeTab='mine', dashboardCalendar='mine';
  let uiObserver, observerQueued=false, tableSequence=0;
  const modules=()=>({qm:QM,fleet:FLEET,personnel:PM,k9:K9,drone:DRONE,eod:EOD,subpoena:SUBPOENA,grants:GRANTS,civil:CIVIL,permits:PERMITS});
  const esc=escapeHtml;
  const userTimeZone=(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{return 'UTC';}})();
  const pad=n=>String(n).padStart(2,'0');
  function displayDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[2]}/${m[3]}/${m[1]}`:String(value||'');}
  function sourceTimeZone(){try{return TenantPlatform?.tenant?.()?.timezone||userTimeZone;}catch{return userTimeZone;}}
  function zoneShort(){try{return new Intl.DateTimeFormat('en-US',{timeZone:userTimeZone,timeZoneName:'short'}).formatToParts(new Date()).find(p=>p.type==='timeZoneName')?.value||userTimeZone;}catch{return userTimeZone;}}
  function zonedInstant(date,time,zone){const [y,m,d]=date.split('-').map(Number),[h,minute]=time.split(':').map(Number),target=Date.UTC(y,m-1,d,h,minute);let utc=target;try{const partsFormatter=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});for(let i=0;i<2;i++){const parts=Object.fromEntries(partsFormatter.formatToParts(new Date(utc)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));const represented=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute));utc-=represented-target;}return new Date(utc);}catch{return new Date(`${date}T${time}:00`);}}
  function displayInstant(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value||'');try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:userTimeZone,month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute}`;}catch{return displayDate(String(value).slice(0,10))+' '+pad(d.getHours())+':'+pad(d.getMinutes());}}
  function displayOperationalTime(date,start,end){const source=sourceTimeZone(),startInstant=zonedInstant(date,start,source),startText=displayInstant(startInstant.toISOString());if(!end)return startText;let endInstant=zonedInstant(date,end,source);if(Number(end.replace(':',''))<Number(start.replace(':','')))endInstant=new Date(endInstant.getTime()+86400000);const endText=displayInstant(endInstant.toISOString()),startDate=startText.slice(0,10),endDate=endText.slice(0,10);return startDate===endDate?`${startText}\u2013${endText.slice(11)}`:`${startText}\u2013${endText}`;}
  function displayTimeOnly(time,date=fmt(new Date())){const converted=displayOperationalTime(date,time),shownDate=converted.slice(0,10),baseDate=displayDate(date),shownTime=converted.slice(11);if(shownDate===baseDate)return shownTime;const [sm,sd,sy]=shownDate.split('/').map(Number),[bm,bd,by]=baseDate.split('/').map(Number),days=Math.round((Date.UTC(sy,sm-1,sd)-Date.UTC(by,bm-1,bd))/86400000);return shownTime+(days>0?' (+1 day)':' (-1 day)');}
  function normalizeDisplayText(value){return String(value||'').replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\b/g,displayInstant).replace(/\b(\d{4}-\d{2}-\d{2})\s*(?:(?:,|·|•|at)\s*)?(\d{1,2}:\d{2})(?:\s*[\u2013-]\s*(\d{1,2}:\d{2}))?/gi,(_,date,start,end)=>displayOperationalTime(date,start,end)).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$2/$3/$1').replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,(_,m,d,y)=>`${pad(m)}/${pad(d)}/${y}`);}
  function formatVisibleDates(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const parent=node.parentElement;if(!parent||parent.closest('script,style,template,select,option,.suite-no-date-format'))return NodeFilter.FILTER_REJECT;return /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{node.nodeValue=normalizeDisplayText(node.nodeValue);});root.querySelectorAll?.('input[type="date"]').forEach(input=>input.lang='en-US');}
  const preferences={get(key,fallback){try{return JSON.parse(localStorage.getItem('pss.ux.'+(CURRENT_USER_ID||'device')+'.'+key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem('pss.ux.'+(CURRENT_USER_ID||'device')+'.'+key,JSON.stringify(value));}catch{}}};
  const isAdmin=()=>!!CURRENT_USER_ID && (SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(STATE.personnel.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[])).some(id=>['role_admin','role_platform_admin'].includes(id));
  const assignedRoles=()=>SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(STATE.personnel.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[]);
  const previewing=()=>isAdmin() && [...(STATE.currentRoleIds||[])].sort().join('|')!==[...assignedRoles()].sort().join('|');
  const permits=(mod,ability)=>can(MODULE_META[mod].ability)&&(!ability||(Array.isArray(ability)?ability.some(can):can(ability)));
  function metaFor(id){for(const [mod,m] of Object.entries(modules())){const meta=m.NAV_ITEMS.find(n=>n.id===id);if(meta)return {mod,...meta};}return null;}
  function allowedView(id){const m=metaFor(id);return m&&permits(m.mod,m.requiredAbility);}
  function currentPerson(){return STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{name:'Staff member',unit:''};}
  function rememberRoute(next,replace=false){route=next;if(!restoring){const hash='#/'+next;try{if(location.hash!==hash)history[replace?'replaceState':'pushState']({suite:next},'',hash);}catch{}}}
  function leaveRecord(){const box=document.getElementById('modalBox');document.getElementById('modalOverlay').appendChild(box);box.classList.remove('record-page');record=null;document.getElementById('view-record')?.classList.remove('active');}
  function guard(){if(!modalDirty)return true;return confirm('Discard the unsaved changes in this form?');}
  function beforeView(id){if(!guard())return false;modalDirty=false;document.getElementById('modalOverlay').classList.remove('open');leaveRecord();const old=route;viewScroll[old]=document.getElementById('content').scrollTop;const m=metaFor(id);if(m){ACTIVE_MODULE=m.mod;ACTIVE_SHARED_VIEW=null;lastViews[m.mod]=id;rememberRoute('view/'+id);renderSuiteNav();queueMicrotask(()=>{document.getElementById('content').scrollTop=viewScroll[route]||0;enhance();});}return true;}
  function go(id){if(!allowedView(id)){toast('This workspace is not available to your current role.',true);return;}const m=metaFor(id);modules()[m.mod].switchView(id);}
  function showCustom(id,title,subtitle){if(!guard())return false;modalDirty=false;leaveRecord();document.getElementById('modalOverlay').classList.remove('open');ACTIVE_MODULE=null;ACTIVE_SHARED_VIEW=id;document.querySelectorAll('.view').forEach(e=>e.classList.remove('active'));let el=document.getElementById('view-'+id);if(!el){el=document.createElement('div');el.id='view-'+id;el.className='view';document.getElementById('content').appendChild(el);}el.classList.add('active');document.getElementById('page-title').textContent=title;document.getElementById('page-sub').textContent=subtitle;document.getElementById('navlist').innerHTML='';rememberRoute(id);renderSuiteNav();return el;}
  function button(label,icon,action,cls='quick-action'){const b=document.createElement('button');b.className=cls;b.type='button';b.title=label;b.innerHTML=(ICONS[icon]||'')+'<span>'+esc(label)+'</span>';b.onclick=action;return b;}
  const navGroups=[
    ['People & Readiness',[['Personnel Administration','pm-records','idcard'],['Training & Qualifications','pm-training','award'],['Schedule','pm-scheduling','calendar']]],
    ['Equipment & Fleet',[['Quartermaster','qm-inventory','box'],['Fleet','fleet-vehicles','truck']]],
    ['Specialized Units',[['K9','k9-roster','pawprint'],['UAS','drone-fleet','drone'],['EOD','eod-technicians','bomb']]],
    ['Court & Civil',[['Subpoenas','subpoena','gavel'],['Civil Process','civil','scale']]],
    ['Financial Management',[['Grants','grants-awards','briefcase'],['Asset Forfeiture','grants-seizures','dollar']]]
  ];
  function resolveDestination(id){if(modules()[id])return accessibleModules().includes(id);return allowedView(id);}
  function visit(id){if(modules()[id]){enterModule(id);return;}go(id);}
  let NAV_FILTER_TEXT='';
  // Pure visibility toggling, no rebuild -- keeps focus in the search box while typing. Matches
  // against every top-level nav line AND, when a module is open, its nested sub-pages, and
  // auto-opens (or hides, if empty) each category so a match never sits inside a collapsed group.
  function applyNavFilter(){
    const q=NAV_FILTER_TEXT.trim().toLowerCase();
    const sidebar=document.getElementById('sidebar');
    sidebar.querySelectorAll('.navgroup').forEach(group=>{
      let anyVisible=false;
      group.querySelectorAll(':scope > .navline').forEach(line=>{
        const match=!q||(line.dataset.searchText||'').includes(q);
        line.style.display=match?'':'none';
        if(match)anyVisible=true;
      });
      group.style.display=(!q||anyVisible)?'':'none';
      if(q)group.open=anyVisible;
    });
    const nested=document.getElementById('navlist');
    if(nested)nested.querySelectorAll('.navitem').forEach(item=>{
      const match=!q||(item.dataset.searchText||item.textContent||'').toLowerCase().includes(q);
      item.style.display=match?'':'none';
    });
  }
  function setSidebarCollapsed(collapsed){
    preferences.set('sidebarCollapsed',collapsed);
    document.getElementById('sidebar').classList.toggle('sidebar-collapsed',collapsed);
    if(collapsed)document.querySelectorAll('#suiteNav .navgroup').forEach(g=>g.open=true);
    else document.querySelectorAll('#suiteNav .navgroup').forEach(g=>g.open=preferences.get('group.'+g.dataset.label,true));
  }
  function navigation(){const nav=document.getElementById('suiteNav');const navlistEl=document.getElementById('navlist');if(navlistEl.parentElement===nav||navlistEl.parentElement?.closest('#suiteNav'))document.getElementById('sidebar').insertBefore(navlistEl,nav.nextSibling);nav.innerHTML='';const top=document.createElement('div');top.style.padding='0 10px';top.append(button('My Work','dashboard',home,'navitem'+(route==='home'?' active':'')));top.append(button('Workspaces','grid',workspaces,'navitem'+(route==='workspaces'?' active':'')));top.append(button('Readiness','checklist',readinessView,'navitem'+(route==='readiness'?' active':'')));if(WorkOperations.available())top.append(button('Workflows','briefcase',workflowView,'navitem'+(route==='workflows'?' active':'')));nav.append(top);
    const searchWrap=document.createElement('div');searchWrap.className='nav-search-wrap';
    const searchInput=document.createElement('input');searchInput.type='search';searchInput.placeholder='Jump to anything';searchInput.className='nav-search';searchInput.value=NAV_FILTER_TEXT;searchInput.setAttribute('aria-label','Filter navigation');
    searchInput.addEventListener('input',()=>{NAV_FILTER_TEXT=searchInput.value;applyNavFilter();});
    searchWrap.append(ICONS.search?Object.assign(document.createElement('span'),{className:'nav-search-icon',innerHTML:ICONS.search}):document.createTextNode(''));
    searchWrap.append(searchInput);
    const collapseBtn=document.createElement('button');collapseBtn.className='nav-collapse-btn';collapseBtn.type='button';const isCollapsed=document.getElementById('sidebar').classList.contains('sidebar-collapsed');collapseBtn.title=isCollapsed?'Expand sidebar':'Collapse sidebar';collapseBtn.setAttribute('aria-label',collapseBtn.title);collapseBtn.textContent=isCollapsed?'\u00bb':'\u00ab';
    collapseBtn.onclick=()=>setSidebarCollapsed(!document.getElementById('sidebar').classList.contains('sidebar-collapsed'));
    // Distinct from collapseBtn above: that one shrinks the whole sidebar to icon-only, this one
    // folds every module's accordion group shut without changing the sidebar's width. A role with
    // broad access accumulates open groups over time -- every module ever visited stays expanded
    // by design (see the toggle handler below), which is exactly right for one or two modules but
    // becomes clutter once someone's touched all of them. This button resets that accumulation in
    // one click rather than making someone close a dozen groups by hand. The currently active
    // module still reopens itself on the very next render regardless (see group.open below), since
    // losing sight of where you currently are would be a worse problem than the clutter this fixes.
    const collapseAllBtn=document.createElement('button');collapseAllBtn.className='nav-collapse-btn nav-collapse-all-btn';collapseAllBtn.type='button';collapseAllBtn.title='Collapse all module groups';collapseAllBtn.setAttribute('aria-label','Collapse all module groups');collapseAllBtn.textContent='\u2261\u2212';
    collapseAllBtn.onclick=()=>{ for(const key of accessibleModules()) preferences.set('group.mod:'+key, false); navigation(); };
    const topRow=document.createElement('div');topRow.className='nav-top-row';topRow.append(searchWrap);topRow.append(collapseAllBtn);topRow.append(collapseBtn);
    nav.append(topRow);
    const navDivider=document.createElement('div');navDivider.style.cssText='height:1px;background:#2B3B54;margin:2px 14px 12px;flex-shrink:0;';nav.append(navDivider);
    const pins=preferences.get('pins',[]);if(pins.length){const d=document.createElement('div');d.className='navgroup';d.dataset.label='__pins';for(const id of pins){const m=metaFor(id);if(m&&allowedView(id)){const line=document.createElement('div');line.className='navline';line.dataset.searchText=m.title.toLowerCase();line.append(button(m.title,m.icon,()=>go(id),'navitem'));d.append(line);}}nav.append(d);}
    // Modules are listed alphabetically by display name, one per accordion group. Each group's
    // own sub-pages (from that module's NAV_ITEMS, filtered to what this role can see) render
    // directly inside it, so opening a module always reveals its submenu right there -- no
    // dependence on which specific sub-page happens to be active.
    const mainModules=accessibleModules().map(key=>({type:'module',key,name:MODULE_META[key].name}));if(FieldTraining.available())mainModules.push({type:'fieldtraining',key:'fieldtraining',name:'Field Training'});mainModules.sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of mainModules){
      if(entry.type==='fieldtraining'){
        const group=document.createElement('details');group.className='navgroup module-navgroup';group.dataset.label='mod:fieldtraining';group.open=route==='fieldtraining'||preferences.get('group.mod:fieldtraining',false);
        const s=document.createElement('summary');s.innerHTML='<span class="nav-mod-icon">'+(ICONS.award||'')+'</span><span>Field Training</span>';group.append(s);group.addEventListener('toggle',()=>preferences.set('group.mod:fieldtraining',group.open));
        const line=document.createElement('div');line.className='navline';line.dataset.searchText='field training trainee files reports';line.append(button('Trainee files & reports','award',fieldTrainingView,'navitem'+(route==='fieldtraining'?' active':'')));group.append(line);nav.append(group);continue;
      }
      const key=entry.key,items=modules()[key].NAV_ITEMS.filter(n=>allowedView(n.id));
      if(!items.length)continue;
      const group=document.createElement('details');group.className='navgroup module-navgroup';group.dataset.label='mod:'+key;
      group.open=ACTIVE_MODULE===key||preferences.get('group.mod:'+key,false);
      const s=document.createElement('summary');s.innerHTML='<span class="nav-mod-icon">'+(ICONS[MODULE_META[key].icon]||'')+'</span><span>'+esc(MODULE_META[key].name)+'</span>';
      group.append(s);
      group.addEventListener('toggle',()=>preferences.set('group.mod:'+key,group.open));
      for(const item of items){
        const isActive=route==='view/'+item.id;
        const line=document.createElement('div');line.className='navline';line.dataset.searchText=item.label.toLowerCase();
        line.append(button(item.label,item.icon,()=>go(item.id),'navitem'+(isActive?' active':'')));
        const pin=document.createElement('button');pin.className='nav-favorite';pin.textContent=pins.includes(item.id)?'★':'☆';pin.title=(pins.includes(item.id)?'Unpin ':'Pin ')+item.label;pin.setAttribute('aria-label',pin.title);
        pin.onclick=()=>{preferences.set('pins',pins.includes(item.id)?pins.filter(p=>p!==item.id):[...pins,item.id]);navigation();};
        line.append(pin);
        group.append(line);
      }
      nav.append(group);
    }
    const sharedTools=document.createElement('div');sharedTools.style.padding='10px 10px 3px';sharedTools.innerHTML='<div style="height:1px;background:#2B3B54;margin:0 4px 10px"></div><div style="padding:0 8px 6px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)">Shared tools</div>';if(SuiteStore.mode()==='shared'){const noticeNav=button('Staff Notices','bell',()=>shared('notices','Staff Notices','Scheduling and staff messages'),'navitem staff-notices-nav'+(route==='shared/notices'?' active':''));noticeNav.id='staffNoticesNav';const count=document.createElement('strong');count.id='staffNoticeCount';count.className='staff-notice-count';count.hidden=true;noticeNav.append(count);sharedTools.append(noticeNav);}nav.append(sharedTools);if(SuiteStore.mode()==='shared')StaffNotices.updateNavBadge();
    const bottom=document.createElement('div');bottom.style.padding='5px 10px';if(Object.values(modules()).some(m=>m.NAV_ITEMS.some(n=>n.id.endsWith('-reports')&&allowedView(n.id))))bottom.append(button('Reports','chart',reports,'navitem'+(route==='reports'?' active':'')));if(adminDestinations().length)bottom.append(button('Administration','gear',administration,'navitem'+(route==='administration'?' active':'')));nav.append(bottom);
    document.getElementById('sidebar').querySelector('.nav-context')?.remove();
    // Each module's submenu now renders inline inside its own accordion group above, so the old
    // shared #navlist (previously repositioned under whichever category line was active) is no
    // longer part of the visible tree. It's left empty/hidden rather than removed outright, since
    // individual modules still populate it internally on their own view switches.
    const navlist=document.getElementById('navlist');
    navlist.classList.remove('navlist-nested');navlist.innerHTML='';navlist.style.display='none';
    // Collapse-to-icons is a desktop affordance for a persistent rail. Below the drawer
    // breakpoint the sidebar is already a temporary overlay (see toggleSidebar()), so
    // collapsing it to icons on top of that would stack two different "smaller sidebar"
    // behaviors and leave no visible way to read or re-expand it. Only apply the saved
    // preference when there's room for a persistent rail in the first place.
    if(preferences.get('sidebarCollapsed',false) && window.innerWidth>860)document.getElementById('sidebar').classList.add('sidebar-collapsed');
    else document.getElementById('sidebar').classList.remove('sidebar-collapsed');
    applyNavFilter();
  }
  function tasks(){const p=currentPerson(),out=[],today=fmt(new Date());const add=(title,owner,due,type,action,consequence)=>out.push({title,owner,due,type,action,consequence,urgent:!!due&&due<today});
    if(permits('subpoena',['subpoena_view_own','subpoena_view_all']))for(const s of STATE.subpoena.subpoenas.filter(s=>s.personId===p.id&&s.status==='Active'))add(s.acknowledgedDate?'Court appearance · '+s.caseNumber:'Acknowledge subpoena · '+s.caseNumber,p.name,s.courtDate,'mine',()=>SUBPOENA.openSubpoenaDetail(s.id),displayTimeOnly(s.courtTime,s.courtDate)+' · '+s.courtroom);
    if(permits('civil','civil_paper_view_own'))for(const c of STATE.civil.papers.filter(c=>c.assignedServerId===p.id&&!['Cancelled','Returned to Court'].includes(c.stage)))add('Serve '+c.paperType+' · '+c.caseNumber,p.name,c.returnByDate,'mine',()=>CIVIL.openPaperDetail(c.id),'Return to court deadline · '+c.stage);
    if(permits('qm','qm_equip_view'))for(const a of STATE.qm.assignments.filter(a=>(a.targetId||a.personId)===p.id&&a.status!=='Returned')){const e=STATE.qm.equipment.find(e=>e.id===a.equipmentId);if(e)add('Equipment return · '+e.name,p.name,a.dueDate,'mine',()=>QM.openEquipmentDetail(e.id),'Assigned equipment · '+e.assetId);}
    if(permits('qm','qm_request_approve'))for(const r of STATE.qm.requests.filter(r=>r.status==='Pending'&&(STATE.currentRoleIds.includes(r.approverRoleId)||STATE.currentRoleIds.includes('role_admin'))))add('Review equipment request',personName(r.requesterId||r.personId),r.createdDate,'approvals',()=>go('qm-requests'),r.itemDescription||r.justification||'Approval required');
    if(permits('personnel','pm_training_manage'))for(const r of STATE.pm.trainingRequests.filter(r=>r.status==='Pending'))add('Review training request',personName(r.personId),r.requestDate,'approvals',()=>go('pm-training'),'Course participation approval');
    if(permits('personnel','pm_leave_request_approve'))for(const r of (STATE.pm.leaveRequests||[]).filter(r=>r.status==='pending'))add('Review time-off request',personName(r.personId),r.startDate,'approvals',()=>go('pm-scheduling'),'Requested time off · '+r.code);
    if(permits('personnel','pm_schedule_manage'))for(const r of (STATE.pm.shiftSwapRequests||[]).filter(r=>r.status==='pending'))add('Review shift swap',personName(r.requesterId),r.date,'approvals',()=>go('pm-scheduling'),'Proposed cover · '+personName(r.coveringId));
    if(permits('personnel','pm_training_request'))for(const r of (STATE.pm.trainingRequests||[]).filter(r=>r.personId===p.id&&r.status==='Pending'))add('Training request pending',p.name,null,'mine',()=>go('pm-training'),'Awaiting training approval');
    const names={Quartermaster:'qm',Fleet:'fleet',Personnel:'personnel',K9:'k9',Drone:'drone',EOD:'eod',Subpoena:'subpoena',Grants:'grants',Civil:'civil','Licensing & Permits':'permits'};
    for(const n of window.__SUITE_NOTIFS||[]){const mod=names[n.module];if(!mod||!accessibleModules().includes(mod)||(n.readBy||[]).includes(CURRENT_USER_ID))continue;add(n.message,n.module,n.dueDate||n.date||null,'attention',()=>enterModule(mod),'Role-routed notification');}
    for(const t of WorkOperations.readinessTasks().concat(WorkOperations.tasks(),FieldTraining.tasks()))out.push({...t,urgent:!!t.due&&t.due<today});
    return out.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||(a.due||'9999').localeCompare(b.due||'9999'));
  }
  function home(){renderNotifBell();const el=showCustom('home','My Work','Assignments, readiness, and the next action');if(!el)return;const all=tasks(),today=fmt(new Date()),p=currentPerson();if(!isAdmin())dashboardCalendar='mine';const filtered=all.filter(t=>activeTab==='all'||(activeTab==='urgent'?t.urgent:t.type===activeTab));el.innerHTML=`<div class="work-hero"><div><div class="work-eyebrow">Your operational workspace</div><h2>${esc(greeting())}, ${esc(p.name.replace(/^(Sgt\.|Ofc\.|Officer|Deputy|Lt\.|Capt\.)\s*/,'').split(' ')[0])}.</h2><p>One place to see what needs you and move work forward.</p></div><div class="work-date">${esc(new Intl.DateTimeFormat('en-US',{timeZone:userTimeZone,weekday:'long',month:'2-digit',day:'2-digit',year:'numeric'}).format(new Date()))}<br>${esc(p.unit||'Agency workspace')}</div></div><div class="work-metrics">${[['urgent','Overdue',all.filter(t=>t.urgent).length,'Review deadlines and follow-up'],['mine','My assignments',all.filter(t=>t.type==='mine').length,'Court, civil process, and equipment'],['approvals','Awaiting approval',all.filter(t=>t.type==='approvals').length,'Requests needing a decision'],['attention','Needs attention',all.filter(t=>t.type==='attention').length,'Exceptions routed to your role']].map(([id,l,n,h])=>`<button class="work-metric ${n===0?'good':'urgent'}" data-task-filter="${id}"><span>${l}</span><strong>${n}</strong><small>${h}</small></button>`).join('')}</div><div class="work-layout"><div><section class="panel"><div class="panel-head"><h2>Priority work</h2><span class="hint">${filtered.length} items</span></div><div class="work-tabs">${[['mine','My Work'],['all','All Work'],['approvals','Approvals'],['attention','Attention'],['urgent','Overdue']].map(([id,l])=>`<button class="work-tab ${activeTab===id?'active':''}" aria-pressed="${activeTab===id}" data-task-filter="${id}">${l}</button>`).join('')}</div><div id="workQueue"></div></section><section class="panel"><div class="panel-head"><h2>Continue working</h2><span class="hint">Recent records on this device</span></div><div class="panel-body" id="recentRecords"></div></section></div><aside class="work-aside"><section class="panel"><div class="panel-head"><h2>Quick actions</h2></div><div class="panel-body quick-grid" id="quickActions"></div></section><section class="panel"><div class="panel-head"><h2>Workspace readiness</h2></div><div class="panel-body" id="readiness"></div></section></aside></div><section class="panel work-calendar-panel" aria-labelledby="workCalendarTitle"><div class="panel-head work-calendar-head"><div><h2 id="workCalendarTitle">${dashboardCalendar==='master'?'Master Calendar':'My Calendar'}</h2><span class="hint">${dashboardCalendar==='master'?'Department-wide training schedule':'Your training sessions and court dates'}</span></div>${isAdmin()?`<div class="work-tabs work-calendar-tabs" aria-label="Calendar view">${[['mine','My Calendar'],['master','Master Calendar']].map(([id,l])=>`<button class="work-tab ${dashboardCalendar===id?'active':''}" aria-pressed="${dashboardCalendar===id}" data-calendar-view="${id}">${l}</button>`).join('')}</div>`:''}</div><div class="panel-body" id="workCalendarBody"></div></section>`;
    const queue=el.querySelector('#workQueue');if(!filtered.length)queue.innerHTML='<div class="empty-state"><div class="msg">Nothing in this queue</div><div class="sub">No matching items are visible to your current role.</div></div>';filtered.slice(0,100).forEach(t=>{const row=document.createElement('div');row.className='work-item';row.innerHTML=`<div class="work-priority ${t.urgent?'urgent':''}"></div><div><h3>${esc(t.title)}</h3><p>${esc(t.owner)} · ${esc(t.consequence)}</p>${t.due?`<div class="${t.urgent?'due':''}" style="font-size:12px">${t.urgent?'Overdue · ':t.due===today?'Today · ':''}${esc(t.due)}</div>`:''}</div>`;row.append(button('Review','',t.action,'btn btn-outline btn-sm'));queue.append(row);});if(filtered.length>100){const note=document.createElement('p');note.className='panel-body';note.textContent='Showing the first 100 priority items. Use the relevant workspace to review all records.';queue.append(note);}
    el.querySelectorAll('[data-task-filter]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.taskFilter;home();});
    const actions=[['Inspect a vehicle','checklist','fleet-inspections','btnNewInspection','fleet_inspection_conduct'],['Request equipment','box','qm-requests','btnNewRequest','qm_request_submit'],['Log K9 deployment','pawprint','k9-deployments','btnLogDeployQuick','k9_deployment_log'],['Log a UAS flight','drone','drone-flights','btnLogFlightQuick','drone_flight_log'],['Intake civil paper','scale','civil-board','btnIntakePaper','civil_paper_intake'],['Review training','award','pm-training',null,null]];
    const quick=el.querySelector('#quickActions');for(const [label,icon,id,btn,ability] of actions)if(allowedView(id)&&(!ability||can(ability)))quick.append(button(label,icon,()=>{go(id);if(btn)document.getElementById(btn)?.click();}));if(!quick.children.length)quick.append(button('Open workspaces','grid',workspaces));
    const recents=preferences.get('recent',[]).filter(r=>recordAllowed(r));const recBox=el.querySelector('#recentRecords');for(const r of recents.slice(0,6)){const b=document.createElement('button');b.className='recent-item';b.innerHTML=esc(r.title)+`<small>${esc(MODULE_META[r.mod].name)}</small>`;b.onclick=()=>dispatchRecord(r);recBox.append(b);}if(!recents.length)recBox.innerHTML='<p style="color:var(--text-dim);font-size:13px">Records you open will appear here.</p>';
    const readiness=el.querySelector('#readiness');const exceptions=WorkOperations.readiness();const urgent=exceptions.filter(x=>x.urgent).length;readiness.innerHTML=`<div class="readiness-line"><span>Visible exceptions</span><strong>${exceptions.length}</strong></div><div class="readiness-line"><span>Overdue</span><strong>${urgent}</strong></div>`;const openReadiness=document.createElement('button');openReadiness.className='btn btn-outline btn-sm';openReadiness.textContent='Open readiness';openReadiness.onclick=readinessView;readiness.append(openReadiness);if(WorkOperations.available()){const openFlow=document.createElement('button');openFlow.className='btn btn-outline btn-sm';openFlow.textContent='Agency workflows';openFlow.style.marginLeft='8px';openFlow.onclick=workflowView;readiness.append(openFlow);WorkOperations.refresh();}
    const calendar=el.querySelector('#workCalendarBody');PM.renderCalendarSub(calendar,dashboardCalendar==='master'?null:CURRENT_USER_ID);calendar.querySelector('#btnScheduleSession')?.remove();el.querySelectorAll('[data-calendar-view]').forEach(b=>b.onclick=()=>{dashboardCalendar=b.dataset.calendarView;home();});
  }
  function readinessView(){const el=showCustom('readiness','Operational readiness','Exceptions from your authorized workspaces');if(!el)return;WorkOperations.renderReadiness(el);}
  function workflowView(){const el=showCustom('workflows','Agency workflows','Requests and approvals');if(!el)return;WorkOperations.renderWorkflows(el);}
  function fieldTrainingView(){const el=showCustom('fieldtraining','Field Training','Trainee files, reports and program performance');if(!el)return;FieldTraining.render(el);FieldTraining.load();}
  function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}
  function workspaces(){const el=showCustom('workspaces','Workspaces','Your authorized public safety tools');if(!el)return;el.innerHTML='<div class="work-hero"><div><div class="work-eyebrow">Public safety suite</div><h2>Everything your team needs.</h2><p>Open a workspace. Pick up where you left off.</p></div></div><div class="workspace-grid"></div>';const grid=el.querySelector('.workspace-grid');const entries=accessibleModules().map(key=>({name:MODULE_META[key].name,icon:MODULE_META[key].icon,tagline:MODULE_META[key].tagline,open:()=>enterModule(key)}));if(FieldTraining.available())entries.push({name:'Field Training',icon:'award',tagline:'Trainee files, daily observation reports, phase evaluations, approvals, and program performance.',open:fieldTrainingView});entries.sort((a,b)=>a.name.localeCompare(b.name));for(const m of entries){const b=document.createElement('button');b.className='workspace-tile';b.innerHTML=(ICONS[m.icon]||'')+`<strong>${esc(m.name)}</strong><span>${esc(m.tagline)}</span>`;b.onclick=m.open;grid.append(b);}}
  function reports(){const el=showCustom('reports','Reports','Reporting across your authorized workspaces');if(!el)return;el.innerHTML='<div class="workspace-grid"></div>';for(const [key,m] of Object.entries(modules()))for(const n of m.NAV_ITEMS.filter(n=>n.id.endsWith('-reports')&&allowedView(n.id)))el.firstChild.append(button(MODULE_META[key].name,'chart',()=>go(n.id),'workspace-tile'));}
  function adminDestinations(){const list=[];for(const [id,label,ability] of [['roles','Roles & Abilities','admin_roles'],['fieldlabels','Field Labels','manage_field_labels'],['branding','Agency Branding','manage_branding'],['sso','Single Sign-On','admin_sso']])if(can(ability))list.push({id,label,shared:true});if(ALL_ABILITY_IDS.some(a=>a.endsWith('_admin_audit')&&can(a)))list.push({id:'audit',label:'Platform Audit Log',shared:true});for(const m of Object.values(modules()))for(const n of m.NAV_ITEMS.filter(n=>n.id.endsWith('-admin')&&allowedView(n.id)))list.push({id:n.id,label:MODULE_META[metaFor(n.id).mod].name+' settings'});list.sort((a,b)=>a.label.localeCompare(b.label));return list;}
  function administration(){const el=showCustom('administration','Administration','Access, configuration, and accountability');if(!el)return;el.innerHTML='<div class="workspace-grid"></div>';for(const d of adminDestinations())el.firstChild.append(button(d.label,'gear',()=>d.shared?shared(d.id,d.label,'Platform administration'):go(d.id),'workspace-tile'));if(isAdmin())el.firstChild.append(button('Data & connection','database',dataSettings,'workspace-tile'));}
  function shared(id,title,sub){if(!guard())return;modalDirty=false;leaveRecord();const ok=id==='personnel'?can('personnel_view'):id==='roles'?can('admin_roles'):id==='branding'?can('manage_branding'):id==='fieldlabels'?can('manage_field_labels'):id==='sso'?can('admin_sso'):id==='notices'?SuiteStore.mode()==='shared':ALL_ABILITY_IDS.some(a=>a.endsWith('_admin_audit')&&can(a));if(!ok)return;enterSharedView(id,title,sub);rememberRoute('shared/'+id);navigation();}
  const recordTypes={equipment:['qm','qm_equip_view','equipment','openEquipmentDetail'],vehicle:['fleet','fleet_vehicle_view','vehicles','openVehicleDetail'],person:['personnel','pm_records_view','records','openRecordDetail'],k9:['k9','k9_roster_view','k9s','openK9Detail'],drone:['drone','drone_fleet_view','drones','openDroneDetail'],operator:['drone','drone_operator_view','operators','openOperatorDetail'],technician:['eod','eod_technician_view','technicians','openTechDetail'],magazine:['eod','eod_magazine_view','magazines','openMagazineDetail'],subpoena:['subpoena',['subpoena_view_all','subpoena_view_own'],'subpoenas','openSubpoenaDetail'],paper:['civil',['civil_paper_view_all','civil_paper_view_own'],'papers','openPaperDetail'],seizure:['grants','grants_seizure_view','seizures','openSeizureDetail'],grant:['grants','grants_award_view','grants','openGrantDetail']};
  function recordData(r){const t=recordTypes[r.kind];if(!t)return null;const s=STATE[r.mod==='personnel'?'pm':r.mod];return (s?.[t[2]]||[]).find(x=>(['person','operator','technician'].includes(r.kind)?x.personId:x.id)===r.id);}
  function recordAllowed(r){const t=recordTypes[r.kind];if(!t||t[0]!==r.mod||!permits(r.mod,t[1]))return false;const d=recordData(r);if(!d)return false;const scope=currentRole().agencyScope||[];if(r.kind==='equipment'&&scope.length&&!d.isSharedAsset&&!scope.includes(d.agency))return false;if(r.kind==='subpoena'&&!can('subpoena_view_all')&&d.personId!==CURRENT_USER_ID)return false;if(r.kind==='paper'&&!can('civil_paper_view_all')&&d.assignedServerId!==CURRENT_USER_ID)return false;return true;}
  function dispatchRecord(r){if(!recordAllowed(r)){toast('This record is unavailable to your current role.',true);return;}modules()[r.mod][recordTypes[r.kind][3]](r.id);}
  function openRecord(mod,kind,id){const next={mod,kind,id};if(!recordAllowed(next)){toast('This record is unavailable to your current role.',true);return false;}if(!guard())return false;modalDirty=false;const parent=record?.parent||route;record={...next,parent};ACTIVE_MODULE=mod;rememberRoute('record/'+mod+'/'+kind+'/'+encodeURIComponent(id));return true;}
  function recordTitle(r){const d=recordData(r)||{};return ['person','operator','technician'].includes(r.kind)?personName(r.id):d.name||d.unitNumber||d.grantName||d.caseNumber||d.description||r.id;}
  function openModal(){const box=document.getElementById('modalBox'),overlay=document.getElementById('modalOverlay');modalDirty=false;const detail=!!box.querySelector('#eqDetailBody,#vehDetailBody,#recDetailBody,#k9DetailBody,#droneDetailBody,#operatorDetailBody,#techDetailBody,#magDetailBody,#subDetailBody,#seizureDetailBody,#grantDetailBody,#paperDetailBody');
    if(record&&detail){overlay.classList.remove('open');document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));let host=document.getElementById('view-record');if(!host){host=document.createElement('div');host.id='view-record';host.className='view suite-record-host';document.getElementById('content').append(host);}host.classList.add('active');host.querySelector('.record-bar')?.remove();const bar=document.createElement('div');bar.className='record-bar';bar.append(button('Back to workspace','',()=>{const parent=record.parent;leaveRecord();navigate(parent);},'btn btn-outline btn-sm'));const trail=document.createElement('span');trail.textContent=MODULE_META[record.mod].name+' / '+recordTitle(record);bar.append(trail);bar.append(button('Copy record link','',()=>{if(navigator.clipboard)navigator.clipboard.writeText(location.href).then(()=>toast('Record link copied.'),()=>toast('Copy the address from your browser.',true));else toast('Copy the address from your browser.');},'btn btn-outline btn-sm'));host.prepend(bar);host.append(box);box.classList.add('record-page');box.removeAttribute('aria-modal');box.setAttribute('role','region');document.getElementById('page-title').textContent=recordTitle(record);document.getElementById('page-sub').textContent=MODULE_META[record.mod].name+' · Record workspace';const recent=preferences.get('recent',[]).filter(r=>!(r.mod===record.mod&&r.kind===record.kind&&r.id===record.id));preferences.set('recent',[{mod:record.mod,kind:record.kind,id:record.id,title:recordTitle(record)},...recent].slice(0,12));navigation();}
    else{overlay.append(box);box.classList.remove('record-page');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');focusReturn=document.activeElement;overlay.classList.add('open');requestAnimationFrame(()=>{associateLabels(box);(box.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button')||box).focus();});}
    associateLabels(box);queueMicrotask(enhance);
  }
  function closeModal(event){const user=event&&typeof event==='object'&&'type' in event;if(user&&!guard())return false;modalDirty=false;const overlay=document.getElementById('modalOverlay'),box=document.getElementById('modalBox');overlay.classList.remove('open');box.innerHTML='';if(record){const r={...record};queueMicrotask(()=>{if(!overlay.classList.contains('open')&&!box.innerHTML)dispatchRecord(r);});}else focusReturn?.focus?.();return true;}
  function navigate(next){if(next==='home'||!next){home();return;}if(next==='readiness'){readinessView();return;}if(next==='workflows'){workflowView();return;}if(next==='fieldtraining'){fieldTrainingView();return;}if(next==='workspaces'){workspaces();return;}if(next==='reports'){reports();return;}if(next==='administration'){administration();return;}if(next.startsWith('agency/')){const slug=decodeURIComponent(next.split('/')[1]||'');const match=TenantPlatform.contexts().find(c=>c.tenant&&c.tenant.slug===slug);if(!match){home();toast('No agency was found for that address.',true);return;}switchContext(match.tenant.id,match.agency.id);return;}if(next.startsWith('view/')){if(!allowedView(next.slice(5))){home();toast('That workspace is not available to your current role.',true);return;}go(next.slice(5));return;}if(next.startsWith('record/')){const [,mod,kind,id]=next.split('/');const target={mod,kind,id:decodeURIComponent(id||'')};if(!recordAllowed(target)){home();toast('That record is not available to your current role.',true);return;}dispatchRecord(target);return;}if(next.startsWith('checkin/')){const sessionId=decodeURIComponent(next.slice(8));if(!allowedView('pm-training')){home();toast('Training check-in is not available to your current role.',true);return;}go('pm-training');setTimeout(()=>{if(window.PM&&window.PM.openCheckinFlow)window.PM.openCheckinFlow(sessionId);},60);return;}if(next.startsWith('shared/')){const id=next.slice(7);if(id==='personnel'){home();return;}shared(id,id==='roles'?'Roles & Abilities':id==='audit'?'Platform Audit Log':id==='branding'?'Agency Branding':id==='sso'?'Single Sign-On':id==='notices'?'Staff Notices':'Field Labels','Shared agency workspace');return;}home();}
  function search(){document.getElementById('modalBox').className='modal';document.getElementById('modalBox').innerHTML='<div class="modal-head"><h3>Find records and workspaces</h3><button class="modal-close" id="searchClose" aria-label="Close search">×</button></div><div class="panel-body"><label for="suiteSearchInput">Name, badge, asset, vehicle, or case number</label><input id="suiteSearchInput" type="text" style="width:100%;margin-top:8px" autocomplete="off"></div><div class="search-results" id="suiteSearchResults"></div>';openModal();document.getElementById('searchClose').onclick=closeModal;const field=document.getElementById('suiteSearchInput');const run=()=>{const q=field.value.trim().toLowerCase();const entries=[];for(const m of Object.values(modules()))for(const n of m.NAV_ITEMS)if(allowedView(n.id)&&(!q||(n.title+' '+MODULE_META[metaFor(n.id).mod].name).toLowerCase().includes(q)))entries.push({title:n.title,sub:MODULE_META[metaFor(n.id).mod].name,action:()=>go(n.id)});if(q.length>=2)for(const [kind,t] of Object.entries(recordTypes)){const mod=t[0];if(!permits(mod,t[1]))continue;const list=STATE[mod==='personnel'?'pm':mod]?.[t[2]]||[];for(const d of list){const id=['person','operator','technician'].includes(kind)?d.personId:d.id,r={mod,kind,id};if(!recordAllowed(r))continue;const title=recordTitle(r);const text=[title,d.assetId,d.serialNumber,d.vin,d.licensePlate,d.badgeNumber,d.employeeId,d.caseNumber].filter(Boolean).join(' ').toLowerCase();if(text.includes(q))entries.push({title,sub:MODULE_META[mod].name+' · '+(d.assetId||d.badgeNumber||d.caseNumber||id),action:()=>dispatchRecord(r)});}}
      const results=document.getElementById('suiteSearchResults');results.innerHTML='';for(const e of entries.slice(0,40)){const b=document.createElement('button');b.className='search-result';b.innerHTML=esc(e.title)+'<small>'+esc(e.sub)+'</small>';b.onclick=()=>{modalDirty=false;document.getElementById('modalOverlay').classList.remove('open');e.action();};results.append(b);}if(!entries.length)results.innerHTML='<div class="empty-state"><div class="msg">No matching records</div><div class="sub">Try another identifier or check your workspace permissions.</div></div>';};field.oninput=run;field.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();document.querySelector('.search-result')?.focus();}};run();}
  function associateLabels(root){root.querySelectorAll('.form-row').forEach(row=>{const label=row.querySelector('label'),field=row.querySelector('input:not([type=hidden]),select,textarea');if(label&&field&&!label.htmlFor&&!label.contains(field)){if(!field.id)field.id='suite-field-'+(++tableSequence);label.htmlFor=field.id;}});root.querySelectorAll('button.modal-close').forEach(b=>b.setAttribute('aria-label','Close'));const title=root.querySelector('h3,h2');if(title){if(!title.id)title.id='suite-dialog-title-'+(++tableSequence);root.setAttribute('aria-labelledby',title.id);}}
  function filterLabel(control){const raw=filterLabelRaw(control);return raw.charAt(0).toUpperCase()+raw.slice(1);}
  function filterLabelRaw(control){const id=(control.id||'').replace(/Filter$/i,'');const title=(control.title||'').trim();let match=title.match(/filter(?:s)? (?:the )?.*? to a single ([^(]+?)(?:\s*\(|$)/i);if(match)return match[1].trim();match=title.match(/filter(?:s)? the (.+?)(?: below)? as you type/i);if(match)return 'Search '+match[1].trim();if(/on or after|from date/i.test(title)||/(Date)?From$/i.test(id))return 'From date';if(/on or before|to date/i.test(title)||/(Date)?To$/i.test(id))return 'To date';if(/sort/i.test(id)||control.options?.[0]?.textContent.trim().startsWith('Sort:'))return 'Sort by';if(/search|query|(^|_)q$/i.test(id)||control.placeholder?.toLowerCase().startsWith('search'))return 'Search records';const terms=[['Personnel','Personnel'],['Vehicle','Vehicle'],['Aircraft|Drone','Aircraft'],['K9','K9'],['Agency','Agency'],['Provider','Provider'],['Course','Course'],['Location|Court','Location'],['Category','Category'],['Mission','Mission type'],['Phase','Lifecycle phase'],['Type','Type'],['Status','Status'],['Unit','Unit'],['Rank','Rank'],['Year','Year'],['Month','Month']];for(const [pattern,label] of terms)if(new RegExp(pattern,'i').test(id))return label;const first=control.options?.[0]?.textContent.trim().replace(/^(All|Any)\s+/i,'');if(first&&first!=='All'&&first!=='Any')return first.replace(/s$/,'');return 'Filter';}
  function filterHelp(control,label){const title=(control.title||'').trim();if(title)return /[.!?]$/.test(title)?title:title+'.';if(control.type==='date')return label==='From date'?'Sets the earliest date included.':'Sets the latest date included.';if(control.matches('input'))return 'Searches the records shown below as you type.';if(label==='Sort by')return 'Changes the order of the records shown below.';return 'Shows only records matching the selected '+label.toLowerCase()+'.';}
  function labelFilters(root=document){root.querySelectorAll('.filters').forEach(filters=>{[...filters.children].forEach(node=>{const direct=node.matches?.('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,.searchable-select-wrap');if(!direct||node.closest('.suite-filter-field'))return;const source=node.matches('select,input')?node:node.querySelector('select,input');if(!source)return;const field=document.createElement('div');field.className='suite-filter-field';const label=document.createElement('span');label.className='suite-filter-label';label.textContent=filterLabel(source);label.id='suite-filter-label-'+(++tableSequence);const help=document.createElement('small');help.className='suite-filter-help';help.textContent=filterHelp(source,label.textContent);help.id='suite-filter-help-'+(++tableSequence);
    // Moving a currently-focused element to a new parent (even just wrapping it in-place, as
    // below) silently drops its focus in every browser -- there's no way to move a node without
    // that side effect. Every filter input on every screen passes through here the moment a
    // fresh, not-yet-wrapped copy of it shows up in the DOM, which is exactly what happens on
    // every keystroke in a search box that re-renders its whole toolbar. Restoring focus and
    // cursor position immediately after the move is what makes that invisible to whoever's
    // typing, instead of silently ejecting them from the field they were just using.
    const wasFocused = document.activeElement===source;
    const selStart = wasFocused && typeof source.selectionStart==='number' ? source.selectionStart : null;
    const selEnd = wasFocused && typeof source.selectionEnd==='number' ? source.selectionEnd : null;
    node.before(field);field.append(label,node,help);
    if(wasFocused){ source.focus(); if(selStart!==null) source.setSelectionRange(selStart, selEnd); }
  });filters.querySelectorAll('.suite-filter-field').forEach(field=>{const label=field.querySelector('.suite-filter-label'),help=field.querySelector('.suite-filter-help'),source=field.querySelector('select,input:not(.searchable-select-input)'),visible=field.querySelector('.searchable-select-input')||source;if(!label||!visible)return;visible.setAttribute('aria-labelledby',label.id);visible.setAttribute('aria-describedby',help.id);if(source&&source!==visible){source.setAttribute('aria-labelledby',label.id);source.setAttribute('aria-describedby',help.id);}});});}
  function enhance(){if(!CURRENT_USER_ID)return;associateLabels(document.getElementById('modalBox'));document.querySelectorAll('.view.active .form-row').forEach(row=>associateLabels(row));labelFilters(document.querySelector('.view.active')||document);formatVisibleDates(document.querySelector('.view.active'));formatVisibleDates(document.getElementById('modalBox'));formatVisibleDates(document.getElementById('notifPanel'));document.querySelectorAll('.navitem.active').forEach(n=>n.setAttribute('aria-current','page'));
    document.querySelectorAll('th.sortable').forEach(th=>{if(th.dataset.keyboardWired)return;th.dataset.keyboardWired='1';th.tabIndex=0;th.setAttribute('aria-sort',th.classList.contains('sort-active')?(th.textContent.includes('▼')?'descending':'ascending'):'none');th.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();th.click();}});});
    document.querySelectorAll('.civil-card,.photo-drop-zone,.role-list-item').forEach(el=>{if(el.dataset.keyboardWired)return;el.dataset.keyboardWired='1';el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.target===el&&['Enter',' '].includes(e.key)){e.preventDefault();el.click();}});});
    document.querySelectorAll('.view.active table').forEach(table=>{if(table.dataset.enhanced)return;table.dataset.enhanced='1';const heads=[...table.querySelectorAll('thead th')];if(!heads.length)return;table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>td.dataset.columnLabel=heads[i]?.textContent.trim()||(i===heads.length-1?'Actions':'')));table.classList.add('field-card-table');if(heads.length<4)return;const parent=table.parentElement;if(!parent)return;const row=document.createElement('div');row.className='table-preferences';const ctrl=document.createElement('details');ctrl.className='column-control';const summary=document.createElement('summary');summary.textContent='Columns';summary.style.cursor='pointer';ctrl.append(summary);const menu=document.createElement('div');menu.className='column-menu';const key='columns.'+route+'.'+heads.map(h=>h.textContent.trim()).join('|');const hidden=preferences.get(key,[]);heads.forEach((h,i)=>{if(i===0||i===heads.length-1)return;const apply=hide=>{table.querySelectorAll('tr').forEach(tr=>{if(tr.children[i])tr.children[i].hidden=hide;});};apply(hidden.includes(i));const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=!hidden.includes(i);check.onchange=()=>{apply(!check.checked);preferences.set(key,heads.map((_,j)=>j).filter(j=>table.querySelector('thead tr')?.children[j]?.hidden));};label.append(check,document.createTextNode(h.textContent.trim()||'Column '+(i+1)));menu.append(label);});ctrl.append(menu);row.append(ctrl);parent.insertBefore(row,table);});
  }
  function roleUI(){const b=document.getElementById('btnRoleSwitcher');b.style.display=isAdmin()?'':'none';document.getElementById('btnResetDemo').style.display=isAdmin()?'':'none';if(!isAdmin())STATE.currentRoleIds=[...assignedRoles()];const strip=document.getElementById('rolePreviewStrip');if(strip){strip.hidden=!previewing();strip.firstChild.textContent='Role preview: '+currentRole().name+' · '+currentPerson().name+' remains the signed-in user.';} }
  function pushUrlBase64ToUint8Array(value){const padding='='.repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));}
  async function notificationSettings(){
    const box=document.getElementById('modalBox');box.className='modal';
    box.innerHTML='<div class="modal-head"><h3>Notification settings</h3><button id="notifSettingsClose" class="modal-close">×</button></div><div class="modal-body"><h4>Device push Notification</h4><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button type="button" id="devicePushEnable" class="btn btn-outline">Enable</button><button type="button" id="devicePushDisable" class="btn btn-outline">Disable</button></div></div><div class="modal-foot"><button id="notifSettingsDone" class="btn btn-primary">Done</button></div>';
    openModal();box.querySelector('#notifSettingsClose').onclick=box.querySelector('#notifSettingsDone').onclick=closeModal;
    const enable=box.querySelector('#devicePushEnable'),disable=box.querySelector('#devicePushDisable');
    const paint=enabled=>{enable.className='btn '+(enabled?'btn-primary':'btn-outline');disable.className='btn '+(!enabled?'btn-primary':'btn-outline');};
    const ctx=SuiteStore.remoteContext();
    const call=(action,payload={})=>SuiteStore.api('/staff-notices',{method:'POST',body:JSON.stringify({tenant_id:ctx.tenantId,agency_id:ctx.agencyId,action,payload})});
    if(!('serviceWorker' in navigator)||!('PushManager' in window)){enable.disabled=true;disable.disabled=true;toast('Device push is not supported by this browser.',true);return;}
    let registration,subscription;
    try{
      registration=await navigator.serviceWorker.ready;
      subscription=await registration.pushManager.getSubscription();
      let enabled=false;
      if(subscription){const status=await call('push_status',{endpoint:subscription.endpoint});enabled=Boolean(status?.data?.enabled);}
      paint(enabled);
    }catch(error){enable.disabled=true;disable.disabled=true;toast(error.message||'Could not check device push status.',true);return;}
    enable.onclick=async()=>{
      enable.disabled=true;disable.disabled=true;
      try{
        if(Notification.permission==='denied')throw Error('Notifications are blocked for this site in your browser settings.');
        const config=await call('push_config');
        if(!config?.data?.enabled||!config.data.publicKey)throw Error('Device push is not configured on the server yet.');
        if(Notification.permission!=='granted'){const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Notification permission was not granted.');}
        subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushUrlBase64ToUint8Array(config.data.publicKey)});
        const json=subscription.toJSON();
        await call('push_subscribe',{endpoint:subscription.endpoint,keys:json.keys||{},userAgent:navigator.userAgent});
        paint(true);toast('Device push enabled for Staff Notices.');
      }catch(error){toast(error.message||'Could not enable device push.',true);}
      finally{enable.disabled=false;disable.disabled=false;}
    };
    disable.onclick=async()=>{
      enable.disabled=true;disable.disabled=true;
      try{
        subscription=subscription||await registration.pushManager.getSubscription();
        if(subscription){await call('push_unsubscribe',{endpoint:subscription.endpoint});await subscription.unsubscribe();subscription=null;}
        paint(false);toast('Device push disabled.');
      }catch(error){toast(error.message||'Could not disable device push.',true);}
      finally{enable.disabled=false;disable.disabled=false;}
    };
  }
    function dataSettings(){if(!isAdmin())return;const box=document.getElementById('modalBox');box.className='modal';box.innerHTML=`<div class="modal-head"><h3>Data & connection</h3><button id="dataClose" class="modal-close">×</button></div><div class="modal-body"><p id="dataModeText"></p><p>Exports contain the records available in this application session. Store backups appropriately.</p><div class="quick-grid"><button class="btn btn-outline" id="exportSnapshot">Download data backup</button><button class="btn btn-outline" id="retrySync">Retry pending saves</button></div></div>`;openModal();document.getElementById('dataModeText').textContent=SuiteStore.description();document.getElementById('dataClose').onclick=closeModal;document.getElementById('exportSnapshot').onclick=()=>{const blob=new Blob([JSON.stringify(STATE,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='public-safety-backup-'+fmt(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};document.getElementById('retrySync').onclick=()=>SuiteStore.flush();}
  function init(){const skip=document.createElement('a');skip.className='skip-link';skip.href='#content';skip.textContent='Skip to workspace';document.body.prepend(skip);document.getElementById('content').tabIndex=-1;
    const profile=document.createElement('div');profile.id='suiteProfile';profile.className='profile-menu';profile.hidden=true;profile.innerHTML='<div class="profile-name" id="suiteProfileName"></div><button type="button" class="btn btn-outline" id="btnTextSizeToggle" style="display:flex;align-items:center;justify-content:space-between;"><span>Text Size <span id="textSizeCurrentLabel" style="color:var(--text-dim);font-weight:400;"></span></span><svg id="textSizeChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;flex-shrink:0;transition:transform .15s;"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div id="textSizeSubmenu" style="display:none;padding:8px 6px 4px;"><div style="display:flex;gap:5px;" role="group" aria-label="Text size"><button type="button" class="text-zoom-btn" data-zoom="100" title="Normal">A</button><button type="button" class="text-zoom-btn" data-zoom="115" title="Large">A</button><button type="button" class="text-zoom-btn" data-zoom="130" title="Larger">A</button><button type="button" class="text-zoom-btn" data-zoom="150" title="Extra large">A</button><button type="button" class="text-zoom-btn" data-zoom="175" title="Maximum">A</button></div></div>';for(const id of ['btnChangePassword','btnResetDemo','btnLogout'])profile.append(document.getElementById(id));profile.append(button('Notification settings','',notificationSettings,'btn btn-outline'));profile.append(button('Data & connection','',dataSettings,'btn btn-outline'));document.getElementById('main').append(profile);profile.querySelectorAll('.text-zoom-btn').forEach(b=>b.addEventListener('click', e=>{e.stopPropagation();const pct=Number(b.dataset.zoom);applyTextZoom(pct);saveTextZoom(pct);}));const currentZoomPct=parseInt(document.documentElement.style.zoom)||115;profile.querySelectorAll('.text-zoom-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.zoom)===currentZoomPct));updateTextSizeLabel();document.getElementById('btnTextSizeToggle').addEventListener('click', e=>{e.stopPropagation();const sub=document.getElementById('textSizeSubmenu');const willOpen=sub.style.display==='none';sub.style.display=willOpen?'':'none';document.getElementById('textSizeChevron').style.transform=willOpen?'rotate(180deg)':'rotate(0deg)';});
    const toolbar=document.querySelector('#topbar .role-switch');const find=button('Find records…','',search,'suite-search');find.innerHTML='<span>Find records…</span><kbd>Ctrl K</kbd>';find.setAttribute('aria-label','Find records and workspaces');toolbar.prepend(find);const zone=document.createElement('span');zone.className='user-timezone';zone.textContent='Times: '+zoneShort();zone.title='Displayed times use your local time zone: '+userTimeZone;find.after(zone);const profileToggleBtn=button('My profile','users',()=>{document.getElementById('suiteProfileName').textContent=currentPerson().name;profile.hidden=!profile.hidden;},'btn btn-outline btn-sm');toolbar.append(profileToggleBtn);
    // Any actual action inside this menu (Change Password, Reset Demo Data, Data & connection,
    // and the admin-only buttons appended later by addPlatformAdminButtons) should close the panel
    // the moment it's chosen, the same way Log Out already does -- otherwise it's left open behind
    // whatever modal or screen the choice just opened. The Text Size control is deliberately
    // excluded: someone adjusting text size is likely to try more than one size in a row, and
    // closing the panel after the first click would undo the point of it being a submenu.
    profile.addEventListener('click',e=>{if(e.target.closest('#btnTextSizeToggle')||e.target.closest('#textSizeSubmenu'))return;if(e.target.closest('button'))profile.hidden=true;});
    const strip=document.createElement('div');strip.className='preview-strip';strip.id='rolePreviewStrip';strip.hidden=true;strip.append(document.createElement('span'));strip.append(button('Exit preview','',()=>{STATE.currentRoleIds=[...assignedRoles()];renderRoleSwitcher();navigation();home();},''));document.getElementById('topbar').after(strip);
    const save=document.createElement('div');save.className='save-strip';save.id='saveWarning';save.hidden=true;save.innerHTML='<span></span>';save.append(button('Download pending changes','',()=>SuiteStore.backupPending(),''));save.append(button('Reload saved copy','',()=>SuiteStore.reload(),''));
    const retryBtn=button('Retry','',async()=>{
      if(SuiteStore.needsReloadBeforeRetry()){
        toast('This needs a reload first -- use "Reload saved copy" instead. Retrying the same save again would only fail the same way.', true);
        return;
      }
      // A manual click has no cooldown of its own otherwise, and clicking this repeatedly while
      // a save looks stuck would start a brand new, completely unthrottled flush() attempt every
      // time -- bypassing the backoff/retry-cap protection entirely, since that protection only
      // paces the automatic retry chain, not fresh calls triggered from outside it. Disabling the
      // button for the duration of this attempt closes that gap.
      retryBtn.disabled=true;
      try{ await SuiteStore.flush(); }finally{ retryBtn.disabled=false; }
    },'');
    save.append(retryBtn);strip.after(save);
    const updateStrip=document.createElement('div');updateStrip.className='update-strip';updateStrip.id='updateAvailableStrip';updateStrip.hidden=true;updateStrip.innerHTML='<span>A newer version of this app is available. Reload this page (or close and reopen the app if it is installed) when you have a moment, to get the latest fixes.</span>';updateStrip.append(button('Reload now','',()=>location.reload(),''));save.after(updateStrip);
    const overlay=document.getElementById('modalOverlay');overlay.addEventListener('click',e=>{if(e.target===overlay){if(modalDirty){toast('Use Save or Cancel to finish this form.');return;}closeModal(e);}});
    document.addEventListener('input',e=>{if(overlay.classList.contains('open')&&e.target.closest('#modalBox')&&!['suiteSearchInput','chatInput'].includes(e.target.id))modalDirty=true;});document.addEventListener('change',e=>{if(overlay.classList.contains('open')&&e.target.closest('#modalBox'))modalDirty=true;});
    document.addEventListener('keydown',e=>{if(!CURRENT_USER_ID)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(guard())search();}if(overlay.classList.contains('open')){if(e.key==='Escape'){e.preventDefault();closeModal(e);}if(e.key==='Tab'){const f=[...document.getElementById('modalBox').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(x=>!x.hidden&&x.getClientRects().length);if(!f.length){e.preventDefault();document.getElementById('modalBox').focus();}else if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus();}}}else if(e.key==='Escape'){profile.hidden=true;document.getElementById('roleSwitcherPanel').style.display='none';document.getElementById('notifPanel').style.display='none';}});
    window.addEventListener('beforeunload',e=>{if(modalDirty||SuiteStore.pending()){e.preventDefault();e.returnValue='';}});window.addEventListener('popstate',()=>{if(!CURRENT_USER_ID)return;if(!guard()){history.pushState({},'','#/'+route);return;}modalDirty=false;restoring=true;navigate(location.hash.replace(/^#\//,''));restoring=false;});document.addEventListener('click',e=>{if(!profile.contains(e.target)&&!profileToggleBtn.contains(e.target))profile.hidden=true;const notifPanel=document.getElementById('notifPanel');const path=e.composedPath?e.composedPath():[];if(notifPanel&&notifPanel.style.display!=='none'&&!path.includes(notifPanel)&&!e.target.closest('#btnNotifBell'))notifPanel.style.display='none';});
    uiObserver=new MutationObserver(()=>{if(observerQueued)return;observerQueued=true;queueMicrotask(()=>{observerQueued=false;uiObserver.disconnect();SuiteUX.enhance();uiObserver.observe(document.getElementById('content'),{childList:true,subtree:true});});});uiObserver.observe(document.getElementById('content'),{childList:true,subtree:true});
  }
  return {init,openModal,closeModal,openRecord,beforeView,home,readinessView,workflowView,fieldTrainingView,navigation,go,visit,navigate,search,roleUI,isAdmin,previewing,recordAllowed,recordData,recordTypes,metaFor,allowedView,preferences,modules,tasks,dataSettings,guard,displayDate,displayInstant,displayOperationalTime,displayTimeOnly,normalizeDisplayText,userTimeZone,clearDirty:()=>{modalDirty=false;},hasDirty:()=>modalDirty,lastViews,enhance};
})();

/* Record storage: local IndexedDB transactions plus optional authenticated server RPC.
   No writes are made to the legacy all-in-one app_state row. */
const SuiteStore=(()=>{
  const AWS_DEV_MODE=true;
  window.SONOMARZI_AWS_DEV=true;
  const AWS_DEV={
    apiBase:'https://7debzkoq7k.execute-api.us-east-2.amazonaws.com',
    tokenKey:'sonomarzi.aws.id_token',
    tenantId:'f15865be-cf46-41e0-9d60-7cd753437501',
    agencyId:'64624bcc-232d-4af5-bae6-a8e621cde447'
  };

  function awsToken(){
    return sessionStorage.getItem(AWS_DEV.tokenKey);
  }

  function agencySubdomainFromHost(){
    const host=location.hostname.toLowerCase();
    if(!host.endsWith('.sonomarzi.com')) return '';
    const subdomain=host.slice(0,-'.sonomarzi.com'.length);
    if(!subdomain || subdomain.includes('.') || ['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(subdomain)) return '';
    return subdomain;
  }

  async function awsJson(path, options={}){
    const token=awsToken();
    if(!token) throw Error('AWS Cognito session is not available.');

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);

    try{
      const res=await fetch(`${AWS_DEV.apiBase}${path}`,{
        ...options,
        signal:controller.signal,
        headers:{
          Authorization:`Bearer ${token}`,
          ...(options.body?{'Content-Type':'application/json'}:{}),
          ...(options.headers||{})
        }
      });

      const text=await res.text();
      let body=null;
      try{ body=text?JSON.parse(text):null; }catch{ body={raw:text}; }

      if(!res.ok){
        const error=Error(body?.error||body?.message||`AWS request failed (${res.status}).`);
        error.status=res.status;
        error.code=body?.code||String(res.status);
        error.conflictKey=body?.conflict_key||null;
        error.expectedVersion=Number.isSafeInteger(body?.expected_version)?body.expected_version:null;
        error.currentVersion=Number.isSafeInteger(body?.current_version)?body.current_version:null;
        error.responseBody=body;
        throw error;
      }
      return body;
    }catch(error){
      if(error?.name==='AbortError') throw Error('AWS request timed out after 15 seconds.');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  async function remoteRpc(name,args={}){
    if(!AWS_DEV_MODE) return supabaseClient.rpc(name,args);

    if(name==='suite_load_workspace'){
      try{
        const explicitTenantId=args?.p_tenant_id||null;
        const explicitAgencyId=args?.p_agency_id||null;
        let path;
        if(explicitTenantId&&explicitAgencyId){
          path=`/workspace?tenantId=${encodeURIComponent(explicitTenantId)}&agencyId=${encodeURIComponent(explicitAgencyId)}`;
        }else{
          const subdomain=agencySubdomainFromHost();
          path=subdomain
            ? `/workspace?subdomain=${encodeURIComponent(subdomain)}`
            : `/workspace?tenantId=${encodeURIComponent(AWS_DEV.tenantId)}&agencyId=${encodeURIComponent(AWS_DEV.agencyId)}`;
        }
        const data=await awsJson(path);
        return {data,error:null};
      }catch(error){
        return {data:null,error};
      }
    }

    if(name==='suite_apply_changes'){
      try{
        const data=await awsJson('/apply-changes',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:args?.p_tenant_id||AWS_DEV.tenantId,
            agency_id:args?.p_agency_id||AWS_DEV.agencyId,
            changes:args?.p_changes||[]
          })
        });
        return {data,error:null};
      }catch(error){
        return {data:null,error};
      }
    }

    // Do not silently fall back to Supabase from the core AWS transport.
    return {data:null,error:Error(`This feature is not yet migrated to AWS: ${name}`)};
  }
  let db=null,baseline=new Map(),saving=false,pendingWrites=false,serverReady=false,serverVersions={},serverOrders=new Map(),notificationReads=new Set(),debounce=null,saveAgain=false,waiters=[],consecutiveFailures=0,lastErrorWasVersionConflict=false,sessionEpoch=0;
  async function resolveSpuriousConflict(batch){
    // A 40001 here means the server's current version for these rows doesn't match what this tab
    // last read. That is sometimes a REAL conflict (someone else's edit this tab hasn't seen yet),
    // but just as often it is not: the same idempotent login-time healing running twice, the same
    // account open in a second tab or device, a retried request landing twice, anything where the
    // version number moved but the actual data didn't end up any different from what this tab
    // wants. The only reliable way to tell those apart is to check the server's CURRENT value: if
    // it already matches what this tab was trying to write, for every row in this batch, nothing is
    // lost by moving on, so adopt the server's version numbers and continue instead of alarming the
    // person about a write that was already redundant. If even one row's current server value
    // genuinely differs from what this tab intended, this returns false and the caller falls
    // through to the normal conflict handling below, so no one's actual, different work is ever
    // silently discarded.
    const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
    if(error) throw error;
    const byKey=new Map((data.records||[]).map(r=>[r.key,r]));
    for(const p of batch){
      const row=byKey.get(p.key);
      const rowDeleted=!row||row.deleted;
      if(p.deleted){ if(!rowDeleted) return false; }
      else{ if(rowDeleted||!equal(row.value,p.value)) return false; }
    }
    for(const p of batch){
      const row=byKey.get(p.key);
      if(!row) continue;
      serverVersions[p.key]=row.version;
      if(JSON.parse(p.key)[1]==='$order'&&!row.deleted)serverOrders.set(p.key,clone(row.value));
      if(p.deleted) baseline.delete(p.key); else baseline.set(p.key,clone(row.value));
    }
    return true;
  }
  let mode='local',remoteContext={tenantId:null,agencyId:null};
  const clone=v=>JSON.parse(JSON.stringify(v));
  function flatten(state){const result=new Map();function add(path,value){const selfService=path[0]==='pm'&&['trainingCheckins','leaveRequests'].includes(path[1]);const hasRecords=Array.isArray(value)&&(selfService||value.length&&value.every(x=>x&&typeof x==='object'&&(x.id||x.personId)));const idFor=x=>String(x.id||x.personId);if(hasRecords&&new Set(value.map(idFor)).size===value.length){result.set(JSON.stringify([path,'$order']),value.map(idFor));value.forEach(x=>result.set(JSON.stringify([path,idFor(x)]),x));}else result.set(JSON.stringify([path,'$value']),value);}
    Object.entries(state).forEach(([key,value])=>{
      // These values are derived from authenticated workspace/tenant context and are
      // server-owned configuration, not ordinary suite records. Persisting them from
      // every user session makes unrelated module saves carry stale tenant config.
      if(['currentRoleIds','currentRoleId','enabledModules'].includes(key))return;
      if(['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil'].includes(key)&&value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>add([key,k],v));else add([key],value);
    });return new Map([...result].map(([k,v])=>[k,clone(v)]));}
  function inflate(map){const state={},groups=new Map();for(const [key,value] of map){const [path,id]=JSON.parse(key),p=JSON.stringify(path);if(!groups.has(p))groups.set(p,{path,items:new Map()});groups.get(p).items.set(id,value);}for(const {path,items} of groups.values()){let target=state;for(const p of path.slice(0,-1))target=target[p]||(target[p]={});target[path.at(-1)]=items.has('$value')?clone(items.get('$value')):(items.get('$order')||[...items.keys()]).filter(id=>items.has(id)&&!id.startsWith('$')).map(id=>clone(items.get(id)));}return state;}
  function mergeTemplate(base,data){if(Array.isArray(data))return data;if(!data||typeof data!=='object')return data;const out={...base};for(const [k,v] of Object.entries(data))out[k]=mergeTemplate(base?.[k],v);return out;}
  function equal(a,b){
    if(Object.is(a,b))return true;
    if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)!==Array.isArray(b))return false;
    if(Array.isArray(a))return a.length===b.length&&a.every((value,i)=>equal(value,b[i]));
    const keys=Object.keys(a),other=Object.keys(b);
    return keys.length===other.length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&equal(a[key],b[key]));
  }
  function changes(before,after){const out=[];for(const key of new Set([...before.keys(),...after.keys()]))if(!equal(before.get(key),after.get(key)))out.push({key,value:after.has(key)?after.get(key):null,deleted:!after.has(key),expected:before.has(key)?before.get(key):null,existed:before.has(key)});return out;}
  function collectionOrder(p){
    const [path,id]=JSON.parse(p.key);
    return id==='$order' && Array.isArray(path) && path.length>0;
  }
  function mergeSharedOrder(p){
    const before=Array.isArray(p.expected)?p.expected:[];
    const after=Array.isArray(p.value)?p.value:[];
    const remote=serverOrders.get(p.key)||[];
    const removed=new Set(before.filter(id=>!after.includes(id)));
    return [...remote.filter(id=>!removed.has(id)),...after.filter(id=>!remote.includes(id))];
  }
  function status(type,message){const el=document.getElementById('syncStatus');el.textContent=message;el.style.color=type==='error'?'var(--red)':type==='saving'?'var(--gold)':'var(--text-dim)';el.setAttribute('role','status');const strip=document.getElementById('saveWarning');if(strip){strip.hidden=type!=='error';strip.firstChild.textContent=message;} }
  function openDb(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('Durable local storage is unavailable.'));return;}const req=indexedDB.open('PublicSafetySuite.v2',1);req.onupgradeneeded=()=>{req.result.createObjectStore('records',{keyPath:'key'});req.result.createObjectStore('meta',{keyPath:'key'});};req.onsuccess=()=>{db=req.result;resolve(db);};req.onerror=()=>reject(req.error);});}
  function readAll(){return new Promise((resolve,reject)=>{const req=db.transaction('records').objectStore('records').getAll();req.onsuccess=()=>resolve(new Map(req.result.map(r=>[r.key,r.value])));req.onerror=()=>reject(req.error);});}
  function transaction(patches){return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');let conflict=null;for(const p of patches){const req=store.get(p.key);req.onsuccess=()=>{const found=req.result;if((!!found!==p.existed)||(found&&!equal(found.value,p.expected))){conflict=Error('Another session changed this record. Your changes remain in this tab. Download a backup before reloading.');tx.abort();return;}if(p.deleted)store.delete(p.key);else store.put({key:p.key,value:p.value});};}tx.oncomplete=()=>resolve();tx.onabort=()=>reject(conflict||tx.error||Error('Local save failed.'));tx.onerror=()=>{};});}
  async function load(){try{await openDb();const saved=await readAll();if(saved.size){STATE=inflate(saved);baseline=saved;try{runCoreMigrations();}catch(e){console.error('Core migrations failed (continuing anyway):',e);}STATE.currentRoleIds=[];status('ok','Saved on this device · Demo workspace');return;} }catch(e){status('error','Session only · Local storage unavailable');}
    let legacy=null;try{if(window.storage){const item=await window.storage.get(STORAGE_KEY,false);if(item?.value)legacy=JSON.parse(item.value);}}catch{}
    STATE=legacy||await buildSeedState();STATE.currentRoleIds=[];if(db){const initial=flatten(STATE);try{await transaction(changes(new Map(),initial));baseline=initial;status('ok','Saved on this device · Demo workspace');}catch(e){status('error',e.message);}}else baseline=flatten(STATE);
  }
  function persist(){if(!STATE)return;SuiteUX.clearDirty();pendingWrites=true;clearTimeout(debounce);status('saving','Saving changes…');debounce=setTimeout(flush,200);try{renderNotifBell();}catch(e){console.error('renderNotifBell failed after persist() (save is unaffected):',e);}}
  async function flush(){
    clearTimeout(debounce);
    if(saving){saveAgain=true;return new Promise(resolve=>waiters.push(resolve));}
    saving=true;
    const myEpoch=sessionEpoch;
    // If a logout, a different account signing in, or a tenant/agency switch makes a different
    // session current on this tab while this save is still in flight, its outcome no longer means
    // anything for what's on screen now. Every point below that would touch
    // serverVersions/baseline/status/pendingWrites, or schedule a retry, checks this first and
    // quietly stands down instead of writing into whichever session IS current using version
    // expectations that belong to the one that just ended.
    const staleSession=()=>sessionEpoch!==myEpoch;
    let success=false;
    try{
      const snapshot=flatten(STATE);
      let patches=changes(baseline,snapshot);
      const rejected=[];
      if(mode==='shared')patches=patches.filter(p=>{
        const [path]=JSON.parse(p.key);
        if(path[0]==='accounts'||path[0]==='auditLog'||path[0]==='enabledModules') return false;
        // Alerts are derived while rendering. Read receipts have their own per-user table.
        if(['activity','dashboardPrefs','notifications'].includes(path[1])) return false;
        if(path[0]==='ssoConfig'){
          if(!(HOME_ROLE_IDS||[]).some(id=>id==='role_admin'||id==='role_platform_admin')){rejected.push(p);return false;}
        }
        // Never attempt to save a module this role has no access to at all. STATE keeps default
        // scaffolding in memory for every module regardless of which ones the current role can
        // actually use, so without this, saving anything at all also tries to resave every other
        // module's untouched defaults right alongside it. A save is one all-or-nothing
        // transaction, so the server correctly refusing write access to a module this role was
        // never meant to touch would silently fail the entire save, including whatever the
        // person actually meant to change, a training check-in bundled in with an untouched copy
        // of an entirely different module's data, for example.
        const moduleAbility = {qm:'module_quartermaster', fleet:'module_fleet', pm:'module_personnel', k9:'module_k9', drone:'module_drone', eod:'module_eod', subpoena:'module_subpoena', grants:'module_grants', civil:'module_civil'}[path[0]];
        if(moduleAbility){
          const assigned=(HOME_ROLE_IDS||[]).some(id=>STATE.roles.find(role=>role.id===id)?.abilities?.[moduleAbility]);
          if(!assigned){rejected.push(p);return false;}
        }
        // Same problem one level deeper: a role can have write access to a module overall
        // (module_personnel) while suite_access_rules still denies write on most collections
        // inside it -- only pm_training_checkins and pm_leaveRequests are self-service (own
        // record only, checked server-side by personId), everything else in pm (refData,
        // rollCalls, bidCycles, extraDutyJobs, extraDutySignups, schedulingSettings, etc.) has
        // no suite_access_rules row at all for Officer or Training Coordinator, only for
        // Admin. STATE still carries default/placeholder values for all of it locally, so
        // without this it rides along in every save and the server's rejection of that one
        // untouched collection fails the entire all-or-nothing batch, including a check-in or
        // leave request that would otherwise have gone through fine.
        if(path[0]==='pm'){
          const collection = path[1];
          const selfService = collection==='trainingCheckins' || collection==='leaveRequests';
          if(!selfService && !(HOME_ROLE_IDS||[]).some(id=>STATE.roles.find(role=>role.id===id)?.abilities?.personnel_manage)){rejected.push(p);return false;}
        }
        return true;
      });
      if(mode==='local'&&!db)throw Error('Session only · Durable local storage is unavailable. Download a backup before leaving.');
      if(!patches.length){
        if(!staleSession()){
          pendingWrites=!!rejected.length;
          if(rejected.length)saveAgain=false;
          else lastErrorWasVersionConflict=false;
          status(rejected.length?'error':'ok',rejected.length?'A change is not authorized for this account. Download pending changes before reloading.':mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
        }
        return !rejected.length;
      }
      if(mode==='shared'){
        if(!serverReady)throw Error('Agency connection unavailable. Changes are pending in this tab.');
        // Splitting into batches keeps any single database round trip small and fast regardless
        // of how much total work there is to save -- a first-ever migration healing pass on a
        // brand new tenant can legitimately touch several hundred records at once (every role,
        // every module's reference data), and asking one request to do all of that in one breath
        // is a needless amount of risk for what gains nothing over doing it in smaller pieces.
        // Updating baseline/serverVersions after each batch (not just once at the very end) means
        // that if a later batch fails, everything already confirmed saved stays confirmed --
        // a retry only has to redo what's actually still outstanding, not start over from zero.
        const BATCH_SIZE = 60;
        const batches = [];
        for(let i=0;i<patches.length;i+=BATCH_SIZE) batches.push(patches.slice(i,i+BATCH_SIZE));
        if(patches.length>20) debugLog(`[save] ${patches.length} record(s) to save in ${batches.length} batch(es):`, patches.map(p=>p.key));
        for(let i=0;i<batches.length;i++){
          if(staleSession()) return false; // the session moved on; abandon the rest of this save quietly
          if(batches.length>1) status('saving',`Saving changes… (${i+1} of ${batches.length})`);
          const batch = batches[i];
          let wireChanges=batch.map(p=>({
            key:p.key,value:collectionOrder(p)?mergeSharedOrder(p):p.value,
            deleted:p.deleted,expected_version:serverVersions[p.key]||0,
          }));
          let data, error;
          try{
            ({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:wireChanges}));
          }catch(thrown){
            // Some client-library failure modes throw directly instead of resolving with a clean
            // {error} object -- a version conflict must be caught and classified the SAME way
            // regardless of which shape it arrives in, or it silently falls through to the
            // generic backoff-retry path below and gets auto-retried when it should never be.
            error = thrown;
          }
          if(staleSession()) return false; // the session moved on while this request was in flight
          if(error && /changed in another session/i.test(error.message||'') && batch.some(collectionOrder)){
            // Rebase only the shared order row. A conflict on a real record still
            // stops the save so another person's changes cannot be overwritten.
            const latest=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
            if(!latest.error&&!staleSession()){
              const rows=new Map((latest.data.records||[]).map(r=>[r.key,r]));
              const safe=batch.every(p=>collectionOrder(p)||((rows.get(p.key)?.version||0)===(serverVersions[p.key]||0)));
              if(safe){
                for(const p of batch.filter(collectionOrder)){
                  const row=rows.get(p.key);
                  serverVersions[p.key]=row?.version||0;
                  if(row&&!row.deleted)serverOrders.set(p.key,clone(row.value));else serverOrders.delete(p.key);
                }
                wireChanges=batch.map(p=>({key:p.key,value:collectionOrder(p)?mergeSharedOrder(p):p.value,deleted:p.deleted,expected_version:serverVersions[p.key]||0}));
                try{({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:wireChanges}));}catch(thrown){error=thrown;}
              }
            }
          }
          if(staleSession())return false;
          if(patches.length>20) debugLog(`[save] batch ${i+1}/${batches.length}:`, error?`FAILED: ${error.code||''} ${error.message||''}`:'ok');
          if(error){
            // A version-conflict / serialization-failure error (Postgres class 40001) means this
            // tab's own view of the record is already stale -- someone or something else saved a
            // newer version first. Resending the exact same patch against the exact same expected
            // version can only ever fail the exact same way, forever. This is NOT a transient error
            // to blindly retry: it's an explicit signal (the message literally says "reload before
            // retrying") that a reload has to happen before another write attempt can possibly
            // succeed. Flagging it distinctly here is what lets the catch block below refuse to
            // queue another automatic retry for this specific failure, instead of hammering the
            // server with the same doomed request over and over.
            const isVersionConflict = error.code==='40001' || /reload before retrying|another session/i.test(error.message||'');
            if(isVersionConflict){
              // Before treating this as something a person needs to act on, check whether the
              // server's current value for these specific rows already matches what this tab was
              // trying to write. If so, the version number moved for a reason that changed nothing --
              // the same idempotent login-time healing running again, the same account open in a
              // second tab or device, a retried request landing twice -- and there is nothing to lose
              // by moving on quietly. If any row's current server value genuinely differs, this
              // returns false and falls straight through to the real-conflict handling below, exactly
              // as before.
              try{
                const resolved = await resolveSpuriousConflict(batch);
                if(staleSession()) return false;
                if(resolved){
                  debugLog('[save] absorbed a spurious version conflict (server value already matched) for', batch.map(p=>p.key));
                  continue;
                }
              }catch(resolveError){
                console.error('Could not check for a spurious version conflict, falling back to normal conflict handling:', resolveError);
                // fall through to the normal path below
              }
            }
            const conflictDetail = isVersionConflict && error.conflictKey
              ? ` [record ${error.conflictKey}; expected v${error.expectedVersion ?? '?'}; server v${error.currentVersion ?? '?'}]`
              : '';
            const staleErr = Error((error.message||'Shared save failed. Changes remain pending.') + conflictDetail);
            if(isVersionConflict){
              staleErr.isVersionConflict = true;
              staleErr.conflictKey = error.conflictKey || null;
              staleErr.expectedVersion = error.expectedVersion;
              staleErr.currentVersion = error.currentVersion;
            }
            if(error.code==='42501'||/cannot change this collection or record/i.test(error.message||''))staleErr.isPermissionFailure=true;
            throw staleErr;
          }
          for(const r of data||[]) serverVersions[r.key]=r.version;
          for(const p of wireChanges)if(JSON.parse(p.key)[1]==='$order'){
            if(p.deleted)serverOrders.delete(p.key);else serverOrders.set(p.key,clone(p.value));
          }
          for(const p of batch) if(p.deleted) baseline.delete(p.key); else baseline.set(p.key, p.value);
        }
      }else{
        if(!db)throw Error('Not saved · Local storage unavailable. Download a backup before leaving.');
        await transaction(patches);
        baseline=snapshot;
      }
      if(staleSession()) return false;
      pendingWrites=!!rejected.length||!equal([...snapshot],[...flatten(STATE)]);
      if(rejected.length){
        saveAgain=false;
        status('error','Some changes were saved, but another change is not authorized. Download pending changes before reloading.');
        return false;
      }
      status('ok',mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
      if(mode==='local'&&typeof TenantPlatform!=='undefined')TenantPlatform.snapshotCurrent();
      success=true;consecutiveFailures=0;lastErrorWasVersionConflict=false;
    }catch(e){
      if(staleSession()){
        // This save belonged to a session that's no longer current on this tab -- its failure
        // doesn't apply to anything on screen anymore, so it settles quietly instead of raising an
        // error banner or marking pendingWrites for a session that never made this change.
      }else{
        pendingWrites=true;
        if(e.isVersionConflict){
          // Never auto-retry this class of error -- it cannot succeed without a reload first, and
          // retrying anyway is exactly what was hammering the database. Drop any queued retry and
          // point the person at the reload action that's already sitting in the save-status strip.
          saveAgain=false;
          lastErrorWasVersionConflict=true;
          if(e.conflictKey){
            console.warn('Concurrent edit conflict', {
              conflictKey:e.conflictKey,
              expectedVersion:e.expectedVersion,
              currentVersion:e.currentVersion
            });
          }
          status('error','This record was updated by another user while you were editing it. Your changes have not been saved. Use "Reload saved copy" below to load the latest version before continuing.');
        }else if(e.isPermissionFailure){
          saveAgain=false;
          lastErrorWasVersionConflict=false;
          status('error','This account cannot save one of the changed records. Download pending changes before reloading.');
        }else{
          consecutiveFailures++;
          lastErrorWasVersionConflict=false;
          const networkFailure = navigator.onLine===false || e?.name==='TypeError' || /failed to fetch|networkerror|network request failed/i.test(String(e?.message||''));
          if(networkFailure){
            status('error','Connection lost. Your changes are still here but have not been saved. Reconnect to the internet, then click "Retry".');
          }else{
            status('error',e.message||'Save failed. Your changes remain in this tab and have not been saved.');
          }
        }
      }
    }finally{
      const waiting=waiters.splice(0);
      if(staleSession()){
        // Don't touch `saving` here -- signOut()/acceptRemote() already forced it back to false
        // (and may already have a newer flush of their own running) the moment the session moved
        // on, so resetting it here could clobber that newer flush's own lock instead of this one's.
        saveAgain=false;
        waiting.forEach(resolve=>resolve(false));
      }else{
        saving=false;
        if(saveAgain&&consecutiveFailures<6){
          saveAgain=false;
          const delay=success?0:Math.min(30000,1000*Math.pow(2,consecutiveFailures));
          setTimeout(()=>{flush().then(ok=>waiting.forEach(resolve=>resolve(ok)));},delay);
        }else{
          saveAgain=false;
          waiting.forEach(resolve=>resolve(success));
        }
      }
    }
    return success;
  }
  function acceptRemote(data){if(!data?.records)throw Error('The agency workspace has not been provisioned.');
    sessionEpoch++;
    clearTimeout(debounce);
    saving=false;
    saveAgain=false;
    consecutiveFailures=0;
    const orphanedWaiters=waiters.splice(0);
    orphanedWaiters.forEach(resolve=>resolve(false));
    const rows=new Map(data.records.filter(r=>!r.deleted).map(r=>[r.key,r.value]));STATE=mergeTemplate(data.template||{},inflate(rows));STATE.accounts=STATE.accounts||[];STATE.personnel=STATE.personnel||[];STATE.roles=(STATE.roles&&STATE.roles.length)?STATE.roles:[{id:'role_platform_admin',name:'SonoMarzi Platform Admin',locked:true,hidden:true,agencyScope:[],abilities:Object.fromEntries(ALL_ABILITY_IDS.map(id=>[id,id!=='chatbot_access']))}];
    debugLog('[access] RAW roles exactly as received from the server, before any client-side healing:', (STATE.roles||[]).map(r=>({id:r.id, name:r.name})));
    serverVersions={};serverOrders=new Map();for(const r of data.records){serverVersions[r.key]=r.version;if(JSON.parse(r.key)[1]==='$order'&&!r.deleted)serverOrders.set(r.key,clone(r.value));}lastRecordRevision=(data.records||[]).reduce((max,r)=>r.updated_at&&r.updated_at>max?r.updated_at:max,'')||lastRecordRevision;remoteUpdatePending=false;updateNoticeShown=false;try{runCoreMigrations();}catch(e){console.error('Core migrations failed (continuing anyway):',e);}baseline=flatten(STATE);CURRENT_USER_ID=data.person_id;HOME_ROLE_IDS=data.role_ids;STATE.currentRoleIds=[...(data.role_ids||[])];remoteContext={tenantId:data.tenant_id,agencyId:data.agency_id};window.SonoMarziCurrentTenantSecurity={mfaPolicy:(data?.tenant?.metadata?.security?.mfaPolicy||'off'),tenantName:data?.tenant?.name||'',agencyName:data?.agency?.name||''};serverReady=true;mode='shared';pendingWrites=false;notificationReads=new Set();status('ok','Saved to agency workspace');}
  const notificationModule={Quartermaster:'qm',Fleet:'fleet',Personnel:'pm',K9:'k9',Drone:'drone',EOD:'eod',Subpoena:'subpoena',Grants:'grants',Civil:'civil'};
  const notificationKey=(module,id)=>(notificationModule[module]||module)+'|'+id;
  function isNotificationRead(module,id){return notificationReads.has(notificationKey(module,id));}
  async function loadNotificationReads(){
    if(mode!=='shared'||!remoteContext.tenantId||!remoteContext.agencyId)return;
    if(AWS_DEV_MODE){
      try{
        const result=await awsJson('/staff-notices',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:remoteContext.tenantId,
            agency_id:remoteContext.agencyId,
            action:'notification_reads_list',
            payload:{}
          })
        });
        notificationReads=new Set((Array.isArray(result?.data)?result.data:[]).map(row=>notificationKey(row.module,row.notification_id)));
        if(document.getElementById('app')?.classList.contains('authenticated'))renderNotifBell();
      }catch(error){
        console.error('Could not load AWS notification read status:',error);
      }
      return;
    }
    const {data,error}=await supabaseClient.from('suite_notification_reads').select('module,notification_id').eq('tenant_id',remoteContext.tenantId).eq('agency_id',remoteContext.agencyId).limit(10000);
    if(error){console.error('Could not load notification read status:',error);return;}
    notificationReads=new Set((data||[]).map(row=>notificationKey(row.module,row.notification_id)));
    if(document.getElementById('app')?.classList.contains('authenticated'))renderNotifBell();
  }
  async function markNotificationsRead(items){
    if(!items.length)return true;
    if(mode!=='shared'){
      for(const item of items){const key=notificationModule[item.module]||item.module;const found=STATE[key]?.notifications?.find(n=>n.id===item.id);if(found){found.readBy=found.readBy||[];if(!found.readBy.includes(CURRENT_USER_ID))found.readBy.push(CURRENT_USER_ID);}}
      persist();return true;
    }
    const unseen=items.filter(item=>!isNotificationRead(item.module,item.id));
    if(!unseen.length)return true;
    if(AWS_DEV_MODE){
      try{
        await awsJson('/staff-notices',{
          method:'POST',
          body:JSON.stringify({
            tenant_id:remoteContext.tenantId,
            agency_id:remoteContext.agencyId,
            action:'notification_reads_mark',
            payload:{items:unseen}
          })
        });
        unseen.forEach(item=>notificationReads.add(notificationKey(item.module,item.id)));
        return true;
      }catch(error){
        console.error('AWS notification read status failed:',error);
        return false;
      }
    }
    const rows=unseen.map(item=>({tenant_id:remoteContext.tenantId,agency_id:remoteContext.agencyId,module:notificationModule[item.module]||item.module,notification_id:item.id}));
    const {error}=await supabaseClient.from('suite_notification_reads').upsert(rows,{onConflict:'tenant_id,agency_id,user_id,module,notification_id',ignoreDuplicates:true});
    if(error){console.error('Notification read status failed:',error);return false;}
    unseen.forEach(item=>notificationReads.add(notificationKey(item.module,item.id)));
    return true;
  }
  async function signIn(email,password){
    if(AWS_DEV_MODE){
      if(!awsToken()){
        if(typeof window.SonoMarziAwsAuth?.signIn==='function'){
          await window.SonoMarziAwsAuth.signIn();
          return Boolean(awsToken());
        }
        throw Error('Secure sign-in is not available. Reload the page and try again.');
      }
      const {data,error}=await remoteRpc('suite_load_workspace');
      if(error) throw error;
      acceptRemote(data);
      await loadNotificationReads();
      logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed in.`,'auth');
      return true;
    }
    if(!supabaseClient)throw Error('The agency connection could not load. Check your connection and try again.');
    const {error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw Error('Unable to sign in with those credentials.');
    const {data,error:readError}=await supabaseClient.rpc('suite_load_workspace');
    if(readError)throw Error('The agency workspace is not configured for this application version.');
    acceptRemote(data);
    await loadNotificationReads();
    logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed in.`,'auth');
    return true;
  }

  async function resumeSession(){
    if(AWS_DEV_MODE){
      if(!awsToken()) return false;
      const {data,error}=await remoteRpc('suite_load_workspace');
      if(error){
        console.error('AWS workspace resume failed:',error);
        if(error.status===401||error.status===403){
          sessionStorage.removeItem(AWS_DEV.tokenKey);
        }
        return false;
      }
      acceptRemote(data);
      await loadNotificationReads();
      return true;
    }
    if(!supabaseClient)return false;
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session)return false;
    const {data,error}=await supabaseClient.rpc('suite_load_workspace');
    if(error){await supabaseClient.auth.signOut();return false;}
    acceptRemote(data);
    await loadNotificationReads();
    return true;
  }
  async function loadRemoteContext(tenantId,agencyId){if(mode!=='shared'||!awsToken())throw Error('Agency context changes require an authenticated Cognito session.');if(pendingWrites||saving){const saved=await flush();if(!saved||pendingWrites)throw Error('Save your pending changes before switching agencies. Download a backup if the save is blocked.');}const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:tenantId,p_agency_id:agencyId});if(error)throw Error(error.message||'That agency workspace could not be loaded.');acceptRemote(data);await loadNotificationReads();return true;}
  async function signOut(){
    // Bump the epoch BEFORE anything else. Any flush() still in flight for the account that's
    // leaving captured the old epoch when it started; once this changes, that save will notice
    // (see the staleSession checks inside flush()) and quietly stand down instead of writing into
    // whatever session becomes current, or leaving this tab's save lock stuck forever waiting on
    // a request that may never come back.
    sessionEpoch++;
    clearTimeout(debounce);
    saving=false;
    saveAgain=false;
    consecutiveFailures=0;
    const orphanedWaiters=waiters.splice(0);
    orphanedWaiters.forEach(resolve=>resolve(false));
    if(mode==='shared'){
      await StaffNotices.beforeSignOut();
      try{sessionStorage.removeItem(AWS_DEV.tokenKey);}catch{}
    }
    serverReady=false;mode='local';serverVersions={};serverOrders=new Map();notificationReads=new Set();remoteContext={tenantId:null,agencyId:null};await load();
  }
  function backupPending(){
    const pending=changes(baseline,flatten(STATE)).filter(p=>{
      const [path]=JSON.parse(p.key);
      return !['accounts','auditLog'].includes(path[0])&&!['activity','dashboardPrefs','notifications'].includes(path[1]);
    });
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),tenantId:remoteContext.tenantId,agencyId:remoteContext.agencyId,changes:pending},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='public-safety-pending-changes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function reload(silent=false){
    if(saving){toast('Wait for the current save to finish.',true);return false;}
    if(silent && (pendingWrites||SuiteUX.hasDirty())){
      toast('The latest server copy is available, but this tab has unsaved changes. Save or download them before refreshing.',true);
      return false;
    }
    if(!silent && !confirm('Replace this tab with the latest saved records? Download pending changes first if you need to retain them.'))return false;
    const user=CURRENT_USER_ID;
    clearTimeout(debounce);
    try{
      if(mode==='shared'){
        const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
        if(error)throw error;
        acceptRemote(data);
        await loadNotificationReads();
      }else{
        await load();
        STATE.currentRoleIds=[...(STATE.personnel.find(p=>p.id===user)?.roleIds||[])];
      }
      pendingWrites=false;
      SuiteUX.clearDirty();
      renderRoleSwitcher();
      if(!silent){document.getElementById('modalOverlay').classList.remove('open');SuiteUX.home();}
      status('ok',mode==='shared'?'Saved to agency workspace':'Saved on this device · Demo workspace');
      return true;
    }catch(error){status('error',error.message||'Could not reload saved records.');return false;}
  }
  async function adopt(next){
    if(mode!=='local')throw Error('Agency context changes are loaded from the server.');
    if(!db)throw Error('Durable local storage is unavailable.');
    const snapshot=flatten(next),patches=changes(baseline,snapshot);
    await transaction(patches);
    STATE=next;baseline=snapshot;pendingWrites=false;status('ok','Saved on this device · Demo workspace');
    return true;
  }
  async function submitSelfServiceRecord(collection,newRecord){
    // A training check-in is its own tiny, self-contained save -- it only ever touches the
    // trainingCheckins collection, so it never goes through flush()/changes(), which diffs and
    // resends the ENTIRE state tree (every module's current values, including collections this
    // role has no write access to at all). That bundling is what kept silently failing
    // check-ins: one unrelated, unwritable collection riding along in the same all-or-nothing
    // batch was enough to reject the whole thing, check-in included. Bypassing that pipeline
    // here removes this entire class of bug for this action, permanently, regardless of what
    // else is sitting changed-or-not in STATE at the moment someone scans a code.
    if(mode!=='shared'){
      // Local demo mode has no server-side permission model to collide with; fold it into
      // STATE and let normal local persistence handle it like everything else.
      STATE.pm[collection].push(newRecord);
      persist();
      return {ok:true};
    }
    if(!serverReady) return {ok:false, error:Error("Agency connection unavailable. Try scanning again once you're back online.")};
    if(!['trainingCheckins','leaveRequests'].includes(collection))return {ok:false,error:Error('Unsupported self-service collection.')};
    const collectionKey = JSON.stringify([["pm",collection],"$value"]);
    const orderKey = JSON.stringify([["pm",collection],"$order"]);
    const recordKey = JSON.stringify([["pm",collection],newRecord.id]);
    const attempt = async ()=>{
      // The server's order can include records this user cannot read. Inflating the
      // workspace removes those records, so an order rebuilt from STATE would erase IDs.
      const currentOrder=serverOrders.get(orderKey)||[];
      const patches=[];
      if(!serverOrders.has(orderKey) && serverVersions[collectionKey]){
        // The very first check-in this tenant/agency ever records requires deleting the
        // empty-array placeholder blob in the same save that adds the first real record, or
        // the shape mismatch rejects the whole thing.
        patches.push({key:collectionKey,value:null,deleted:true,expected_version:serverVersions[collectionKey]||0});
      }
      patches.push({key:orderKey,value:[...currentOrder,newRecord.id],deleted:false,expected_version:serverVersions[orderKey]||0});
      patches.push({key:recordKey,value:newRecord,deleted:false,expected_version:0});
      let data,error;
      try{ ({data,error}=await remoteRpc('suite_apply_changes',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId,p_changes:patches})); }
      catch(thrown){ error=thrown; }
      return {data,error,order:[...currentOrder,newRecord.id]};
    };
    let {data,error,order}=await attempt();
    if(error && /changed in another session/i.test(error.message||'')){
      // Refresh only this collection's version bookkeeping. A full reload here
      // would discard a separate unsaved form on the phone or another tab.
      const latest=await remoteRpc('suite_load_workspace',{p_tenant_id:remoteContext.tenantId,p_agency_id:remoteContext.agencyId});
      if(latest.error)return {ok:false,error:latest.error};
      const relevant=new Map((latest.data.records||[]).filter(r=>[collectionKey,orderKey,recordKey].includes(r.key)).map(r=>[r.key,r]));
      for(const key of [collectionKey,orderKey,recordKey]){
        const row=relevant.get(key);
        if(row)serverVersions[key]=row.version;
      }
      const remoteOrder=relevant.get(orderKey);
      if(remoteOrder&&!remoteOrder.deleted)serverOrders.set(orderKey,clone(remoteOrder.value));
      else serverOrders.delete(orderKey);
      const existing=relevant.get(recordKey);
      if(existing&&!existing.deleted){
        if(!equal(existing.value,newRecord))return {ok:false,error:Error('This request ID was used for a different record. No local changes were discarded.')};
        if(!(STATE.pm[collection]||[]).some(c=>c.id===newRecord.id))STATE.pm[collection].push(newRecord);
        baseline.set(recordKey,clone(existing.value));
        baseline.set(orderKey,(STATE.pm[collection]||[]).map(c=>c.id));
        return {ok:true};
      }
      ({data,error,order}=await attempt());
    }
    if(error){ status('error', error.message||'Check-in could not be saved.'); return {ok:false,error}; }
    for(const r of data||[]) serverVersions[r.key]=r.version;
    serverOrders.set(orderKey,order);
    if((STATE.pm[collection]||[]).every(c=>c.id!==newRecord.id)) STATE.pm[collection].push(newRecord);
    baseline.delete(collectionKey);
    baseline.set(orderKey,(STATE.pm[collection]||[]).map(c=>c.id));
    baseline.set(recordKey,newRecord);
    status(pendingWrites?'saving':'ok',pendingWrites?'Other changes are still pending in this tab.':'Saved to agency workspace');
    return {ok:true};
  }
  async function submitTrainingCheckin(newRecord){return submitSelfServiceRecord('trainingCheckins',newRecord);}
  let refreshing=false,lastRefresh=0,lastRecordRevision=null,lastAuditRevision=null,remoteUpdatePending=false,updateNoticeShown=false;
  async function refreshIfClean(){
    if(refreshing||mode!=='shared'||!serverReady||pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open'))return false;
    const context={...remoteContext},epoch=sessionEpoch;
    refreshing=true;lastRefresh=Date.now();
    try{
      const {data,error}=await remoteRpc('suite_load_workspace',{p_tenant_id:context.tenantId,p_agency_id:context.agencyId});
      if(error)throw error;
      if(epoch!==sessionEpoch||pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open'))return false;
      const changed=data.records.some(row=>serverVersions[row.key]!==row.version) ||
        Object.keys(serverVersions).some(key=>!data.records.some(row=>row.key===key));
      if(!changed){
        lastRecordRevision=(data.records||[]).reduce((max,r)=>r.updated_at&&r.updated_at>max?r.updated_at:max,'')||lastRecordRevision;
        await loadNotificationReads();
        return false;
      }
      acceptRemote(data);
      await loadNotificationReads();
      renderRoleSwitcher();
      const destination=location.hash.replace(/^#\//,'');
      if(destination&&destination!=='content')SuiteUX.navigate(destination);else SuiteUX.home();
      toast('Agency records refreshed from another session.');
      return true;
    }catch(error){console.error('Could not refresh agency records:',error);return false;}
    finally{refreshing=false;}
  }
  function liveSyncBlocked(){
    return pendingWrites||saving||SuiteUX.hasDirty()||document.getElementById('modalOverlay')?.classList.contains('open');
  }
  async function checkLiveWorkspace(){
    if(mode!=='shared'||!serverReady||document.hidden||!document.getElementById('app')?.classList.contains('authenticated'))return false;
    const context={...remoteContext};
    if(!context.tenantId||!context.agencyId)return false;
    try{
      const result=await awsJson(`/workspace?tenantId=${encodeURIComponent(context.tenantId)}&agencyId=${encodeURIComponent(context.agencyId)}&revision=1`);
      const revision=result?.data||{};
      const recordRevision=revision.records_revision||null;
      const auditRevision=Number(revision.audit_revision||0);

      const recordsChanged=Boolean(lastRecordRevision&&recordRevision&&recordRevision!==lastRecordRevision);
      const auditChanged=lastAuditRevision!==null&&auditRevision!==lastAuditRevision;
      if(lastRecordRevision===null)lastRecordRevision=recordRevision;
      if(lastAuditRevision===null)lastAuditRevision=auditRevision;

      if(auditChanged){
        lastAuditRevision=auditRevision;
        if(typeof window.SonoMarziRefreshAudit==='function')window.SonoMarziRefreshAudit();
      }

      if(recordsChanged||remoteUpdatePending){
        if(liveSyncBlocked()){
          remoteUpdatePending=true;
          if(!updateNoticeShown){
            updateNoticeShown=true;
            try{toast('New agency updates are available. Your current work will not be interrupted.');}catch{}
          }
          return false;
        }
        remoteUpdatePending=false;
        updateNoticeShown=false;
        const refreshed=await refreshIfClean();
        if(refreshed)lastRecordRevision=recordRevision;
        return refreshed;
      }
      return auditChanged;
    }catch(error){
      console.warn('Live workspace sync check failed:',error.message);
      return false;
    }
  }
  setInterval(checkLiveWorkspace,15000);

  window.addEventListener('online',async()=>{
    if(pendingWrites){const saved=await flush();if(!saved||pendingWrites)return;}
    await refreshIfClean();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&Date.now()-lastRefresh>30000)refreshIfClean();
  });
  async function useWorkspace(data){acceptRemote(data);await loadNotificationReads();return true;}
  return {load,persist,flush,signIn,resumeSession,useWorkspace,signOut,backupPending,reload,adopt,loadRemoteContext,flatten,inflate,changes,equal,submitTrainingCheckin,submitSelfServiceRecord,refreshIfClean,isNotificationRead,markNotificationsRead,api:awsJson,pending:()=>pendingWrites||saving,mode:()=>mode,remoteContext:()=>({...remoteContext}),needsReloadBeforeRetry:()=>lastErrorWasVersionConflict,description:()=>mode==='shared'?'Connected to the authenticated agency workspace. Each changed record is checked for concurrent edits.':'This is a demo workspace saved in this browser. It is not shared with other staff. Agency sign-in requires the supplied database migration and account provisioning.'};
})();

/* Install unified shell without duplicating domain workflows. */
renderSuiteNav=()=>SuiteUX.navigation();
showLauncher=()=>SuiteUX.home();
enterModule=function(key){if(!MODULE_META[key]||!can(MODULE_META[key].ability))return;const module=SuiteUX.modules()[key];const remembered=SuiteUX.lastViews[key];const dest=remembered&&SuiteUX.allowedView(remembered)?remembered:module.NAV_ITEMS.find(n=>SuiteUX.allowedView(n.id))?.id;if(dest)SuiteUX.go(dest);};
loadState=()=>SuiteStore.load();
persist=()=>SuiteStore.persist();
setSyncStatus=function(){}; // Status is owned by confirmed storage outcomes in SuiteStore.
const previousRoleRender=renderRoleSwitcher;
renderRoleSwitcher=function(){previousRoleRender();SuiteUX.roleUI();};
renderRoleSwitcherPanel=function(){if(!SuiteUX.isAdmin()){document.getElementById('roleSwitcherPanel').style.display='none';return;}const panel=document.getElementById('roleSwitcherPanel');const allowed=STATE.roles.filter(r=>!r.hidden||loggedInPersonHasRole('role_platform_admin'));panel.innerHTML='<div style="padding:16px"><strong>View as other roles</strong><p style="font-size:12px;color:var(--text-dim)">Preview the workspace permissions. Actions remain attributed to your signed-in account.</p><div id="rolePreviewOptions"></div><button id="applyPreview" class="btn btn-primary" style="margin-top:12px">Apply preview</button></div>';const options=panel.querySelector('#rolePreviewOptions');allowed.forEach(r=>{const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:center;padding:7px 0;font-size:13px';const input=document.createElement('input');input.type='checkbox';input.value=r.id;input.checked=STATE.currentRoleIds.includes(r.id);label.append(input,document.createTextNode(r.name));options.append(label);});panel.querySelector('#applyPreview').onclick=()=>{if(!SuiteUX.isAdmin())return;const ids=[...options.querySelectorAll('input:checked')].map(i=>i.value);if(!ids.length){toast('Select at least one role.',true);return;}if(!SuiteUX.guard())return;SuiteUX.clearDirty();STATE.currentRoleIds=ids;panel.style.display='none';logAuditEntry('Shared','Role preview changed to '+ids.join(', '),'auth');renderRoleSwitcher();SuiteUX.home();};};
startShell=function(){applyAgencyBranding();renderRoleSwitcher();renderSuiteNav();document.getElementById('btnSwitchModule').onclick=showLauncher;document.getElementById('btnResetDemo').onclick=async()=>{if(!SuiteUX.isAdmin()||SuiteStore.mode()!=='local'){toast('Demo reset is available only to administrators in the local demo.',true);return;}if(!confirm('Reset the demo records on this device? Export a backup first if you need these changes.'))return;STATE=await buildSeedState();STATE.currentRoleIds=[...(STATE.personnel.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[])];persist();await SuiteStore.flush();SuiteUX.home();};document.getElementById('btnLogout').onclick=async()=>{const btn=document.getElementById('btnLogout');if(btn.disabled)return;btn.disabled=true;try{await logout();}finally{btn.disabled=false;}};document.getElementById('btnChangePassword').onclick=()=>{if(SuiteStore.mode()==='shared'){openSharedPassword();return;}openChangePasswordModal();};document.getElementById('btnNotifBell').onclick=e=>{e.stopPropagation();toggleNotifPanel();};renderNotifBell();StaffNotices.loadInbox().catch(e=>console.warn('Notice inbox unavailable',e));FieldTraining.load().catch(e=>console.warn('Field Training unavailable',e));const destination=location.hash.replace(/^#\//,'');if(destination&&destination!=='content')SuiteUX.navigate(destination);else SuiteUX.home();};
attemptLogin=async function(){const error=document.getElementById('loginError'),login=document.getElementById('btnLogin');if(window.SONOMARZI_AWS_DEV&&typeof window.SonoMarziAwsAuth?.signIn==='function'){return window.SonoMarziAwsAuth.signIn();}login.disabled=true;try{await SuiteStore.signIn(document.getElementById('loginUsername').value.trim(),document.getElementById('loginPassword').value);document.getElementById('loginScreen').classList.add('hidden');document.getElementById('app').classList.add('authenticated');startShell();await maybeForcePasswordChange();await syncTextZoomFromProfile();}catch(e){error.textContent=e.message;error.style.display='';}finally{login.disabled=false;}};
logout=async function(){
  if(!SuiteUX.guard())return;
  let saved;
  const pendingBeforeAttempt = SuiteStore.pending();
  if(pendingBeforeAttempt) toast('Trying to save your changes before signing out…');
  try{
    saved = !pendingBeforeAttempt || await Promise.race([
      SuiteStore.flush(),
      new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),5000)),
    ]);
  }catch(e){
    // Timed out (or threw outright) -- treat exactly like a failed save. Nothing else gets
    // sent as a result of this; the real attempt may still be running in the background, but
    // logging out doesn't depend on its outcome and starts no competing request of its own.
    saved = false;
  }
  if(!saved && SuiteStore.pending()){
    const proceed = confirm('Your latest changes could not be saved to the server (the connection may still be having trouble). Log out anyway and lose those unsaved changes? Choose Cancel to stay and try saving again, or download a backup first from Data & Connection.');
    if(!proceed) return;
  }
  try{ if(CURRENT_USER_ID) await logAuditEntry('Shared',`${personName(CURRENT_USER_ID)} signed out.`,'auth'); }catch(e){ console.error('Audit log entry on sign-out failed (logging out anyway):', e); }
  try{ await SuiteStore.signOut(); }catch(e){ console.error('Sign-out failed (clearing this tab anyway):', e); }
  // AWS/Cognito keeps its own browser session at the hosted login domain. Clearing the app
  // session alone is not enough to switch users, so end the Cognito hosted session as well.
  const awsHostedLogout = typeof window.SonoMarziAwsAuth?.logout === 'function'
    ? window.SonoMarziAwsAuth.logout
    : null;
  // Everything below here is the actual, visible effect of "logging out" -- it must run
  // unconditionally, even if every step above failed, or clicking Log Out can silently do
  // nothing at all from the person's point of view, which is exactly the bug this replaces.
  SuiteUX.clearDirty();
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('suiteProfile').hidden=true;
  document.getElementById('roleSwitcherPanel').style.display='none';
  document.getElementById('notifPanel').style.display='none';
  CURRENT_USER_ID=null;
  HOME_ROLE_IDS=null;
  ACTIVE_MODULE=null;
  document.getElementById('app').classList.remove('authenticated');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginPassword').value='';
  if(awsHostedLogout){
    awsHostedLogout();
    return;
  }
};
// DOJ-style complexity: 8+ characters, at least one uppercase, one lowercase, one special
// character. The two named accounts are explicitly exempt -- existing passwords set before this
// rule existed, deliberately not force-invalidated by a policy that came later.
const PASSWORD_POLICY_EXEMPT_EMAILS = ['fm1476@gmail.com','fred@sonomarzi.com'];
function passwordMeetsPolicy(password, email){
  if(email && PASSWORD_POLICY_EXEMPT_EMAILS.includes(String(email).trim().toLowerCase())) return {ok:true};
  if(!password || password.length<8) return {ok:false, message:'Use at least 8 characters.'};
  if(!/[A-Z]/.test(password)) return {ok:false, message:'Include at least one uppercase letter.'};
  if(!/[a-z]/.test(password)) return {ok:false, message:'Include at least one lowercase letter.'};
  if(!/[^A-Za-z0-9]/.test(password)) return {ok:false, message:'Include at least one special character.'};
  return {ok:true};
}
function openSharedPassword(){
  const box=document.getElementById('modalBox');
  box.className='modal';
  box.innerHTML=`<div class="modal-head"><h3>Change password</h3><button id="pwClose" class="modal-close">×</button></div><div class="modal-body"><div class="callout callout-blue"><strong>Passwords are managed by AWS Cognito.</strong><div style="margin-top:6px">Sign out, choose <em>Forgot password</em> on the Cognito sign-in screen, and follow the verification flow to set a new password.</div></div></div><div class="modal-foot"><button id="pwCancel" class="btn btn-outline">Close</button><button id="pwCognito" class="btn btn-primary">Sign out to Cognito</button></div>`;
  SuiteUX.openModal();
  box.querySelector('#pwClose').onclick=box.querySelector('#pwCancel').onclick=closeModal;
  box.querySelector('#pwCognito').onclick=()=>{SuiteUX.clearDirty();if(typeof window.SonoMarziAwsAuth?.logout==='function')window.SonoMarziAwsAuth.logout();};
}

// A full-screen overlay outside the normal modal system on purpose: the standard modal can
// always be dismissed via Escape or a backdrop click once its dirty-tracking hasn't kicked in
// yet (i.e. before anything's been typed), which would let someone skip past this entirely.
// This one has no close affordance at all and isn't wired into that system, so there's no way
// past it except successfully setting a new password.
function openForcedPasswordChangeModal(){
  // Retained as a compatibility no-op. Cognito Hosted UI owns first-login password challenges.
}
async function maybeForcePasswordChange(){ return; }

// Explicitly distinguish demonstration data from authenticated agency data.
{

}

/* Saved filter views and table paging use device preferences, never agency records. */
(()=>{
 const base=SuiteUX.enhance;
 SuiteUX.enhance=function(){base();const active=document.querySelector('.view.active');if(!active)return;
  const filters=[...active.querySelectorAll('.toolbar .filters input[id]:not(.searchable-select-input),.toolbar .filters select[id]')];
  if(filters.length&&!active.querySelector('.saved-view-tools')){const bar=document.createElement('div');bar.className='saved-view-tools';bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px';const key='saved-filters.'+active.id;const saved=SuiteUX.preferences.get(key,[]);const select=document.createElement('select');select.setAttribute('aria-label','Saved filter view');select.innerHTML='<option value="">Saved views</option>';saved.forEach((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=s.name;select.append(o);});select.onchange=()=>{const s=saved[Number(select.value)];if(select.value===''||!s)return;for(const [id,value]of Object.entries(s.values)){const field=document.getElementById(id);if(field){field.value=value;field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));}}};bar.append(select);const btn=document.createElement('button');btn.className='btn btn-outline btn-sm';btn.textContent='Save current filters';btn.onclick=()=>{const values=Object.fromEntries(filters.map(f=>[f.id,f.value]));const box=document.getElementById('modalBox');box.className='modal';box.innerHTML='<div class="modal-head"><h3>Save filter view</h3><button class="modal-close" id="savedViewClose">×</button></div><div class="modal-body"><div class="form-row"><label for="savedViewName">View name</label><input id="savedViewName" type="text" maxlength="60" placeholder="e.g. Patrol equipment overdue"></div></div><div class="modal-foot"><button class="btn btn-primary" id="savedViewSave">Save view</button></div>';SuiteUX.openModal();document.getElementById('savedViewClose').onclick=closeModal;document.getElementById('savedViewSave').onclick=()=>{const name=document.getElementById('savedViewName').value.trim();if(!name){document.getElementById('savedViewName').focus();return;}SuiteUX.preferences.set(key,[{name,values},...saved.filter(s=>s.name!==name)].slice(0,12));SuiteUX.clearDirty();closeModal();bar.remove();SuiteUX.enhance();toast('Filter view saved on this device.');};};bar.append(btn);active.prepend(bar);}
  active.querySelectorAll('table').forEach(table=>{if(table.dataset.paged)return;table.dataset.paged='1';const rows=[...table.querySelectorAll('tbody>tr')];if(rows.length<=50)return;let page=0,size=50;const bar=document.createElement('div');bar.className='table-pagination';bar.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px;font-size:12px';const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.className=next.className='btn btn-outline btn-sm';prev.textContent='Previous';next.textContent='Next';const show=()=>{rows.forEach((r,i)=>r.hidden=i<page*size||i>=(page+1)*size);label.textContent=`${page*size+1}–${Math.min((page+1)*size,rows.length)} of ${rows.length}`;prev.disabled=page===0;next.disabled=(page+1)*size>=rows.length;};prev.onclick=()=>{page--;show();};next.onclick=()=>{page++;show();};bar.append(prev,label,next);table.after(bar);show();});
 };
})();

/* Multi-tenant platform control plane. Agency records remain in SuiteStore. */
const TenantPlatform=(()=>{
  const CATALOG_KEY='pss.platform.catalog.v1';
  const CONTEXT_KEY='pss.platform.context.v1';
  const MODULE_KEYS=['qm','fleet','personnel','k9','drone','eod','subpoena','grants','civil','permits'];
  const MODULE_LABELS={qm:'Quartermaster',fleet:'Fleet',personnel:'Personnel',k9:'K9',drone:'UAS',eod:'EOD',subpoena:'Subpoenas',grants:'Grants & Forfeiture',civil:'Civil Process',permits:'Licensing & Permits'};
  const STATUS_LABELS={provisioning:'Provisioning',setup:'Setup',active:'Active',suspended:'Suspended'};
  let catalog=null,current=null,wizard=null,detailTenantId=null;
  const esc=s=>escapeHtml(s??'');
  const uuid=prefix=>prefix+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  const now=()=>new Date().toISOString();
  async function platformApi(action,payload={}){
    const res=await SuiteStore.api('/tenant-admin',{method:'POST',body:JSON.stringify({action,...payload})});
    if(res?.success===false) throw Error(res.error||'Platform administration request failed.');
    return res?.data??res;
  }
  async function identityPlatformApi(action,payload={}){
    const res=await SuiteStore.api('/identity-admin',{method:'POST',body:JSON.stringify({action,...payload})});
    if(res?.success===false) throw Error(res.error||'Identity administration request failed.');
    return res?.data??res;
  }
  async function registerAgencySubdomain(payload={}){
    const token=sessionStorage.getItem('sonomarzi.aws.id_token');
    if(!token) throw Error('Your secure sign-in session is not available. Sign in again and retry.');
    const res=await fetch('https://7debzkoq7k.execute-api.us-east-2.amazonaws.com/identity-admin',{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({action:'register_subdomain',...payload})
    });
    const text=await res.text();
    let body={};
    try{body=text?JSON.parse(text):{}}catch{body={raw:text}}
    if(!res.ok||body?.success===false) throw Error(body?.error||body?.message||`Agency URL registration failed (${res.status}).`);
    return body?.data??body;
  }
  const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const put=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{toast('Tenant settings could not be saved on this device.',true)}};
  function seedCatalog(){return {version:1,tenants:[{id:'tenant_demo',slug:'reno-public-safety',name:'Reno Public Safety',timezone:'America/Los_Angeles',status:'active',plan:'Enterprise',enabledModules:[...MODULE_KEYS],createdAt:now(),updatedAt:now(),agencies:[{id:'agency_reno',name:'Reno Police Department',abbreviation:'RPD',type:'Municipal Police',ori:'NV0160100',status:'active',branding:{title:'Reno Public Safety Management Suite',subtitle:'Operational readiness in one workspace'}}],admins:[{id:'admin_fred',personId:'p9',name:'Fred Marziano',email:'fred.marziano@mark43.com',roleIds:['role_admin','role_platform_admin'],status:'active'}],invites:[],regionalWorkspaces:[],supportSessions:[],audit:[{id:uuid('ta'),at:now(),actor:'Platform bootstrap',action:'Tenant activated'}]}],current:{tenantId:'tenant_demo',agencyId:'agency_reno'}};}
  function load(){catalog=stored(CATALOG_KEY,null)||seedCatalog();current=stored(CONTEXT_KEY,null)||catalog.current||{tenantId:catalog.tenants[0]?.id,agencyId:catalog.tenants[0]?.agencies[0]?.id};normalize();save();}
  function normalize(){catalog.tenants=Array.isArray(catalog.tenants)?catalog.tenants:[];for(const t of catalog.tenants){t.enabledModules=t.enabledModules||[];t.mfaPolicy=['off','admins','all_users'].includes(t.mfaPolicy)?t.mfaPolicy:'off';t.agencies=t.agencies||[];t.admins=t.admins||[];t.invites=t.invites||[];t.regionalWorkspaces=t.regionalWorkspaces||[];t.supportSessions=t.supportSessions||[];t.audit=t.audit||[];}if(!tenant(current?.tenantId)||!agency(current?.tenantId,current?.agencyId)){const t=catalog.tenants.find(t=>t.status!=='suspended')||catalog.tenants[0];current=t?{tenantId:t.id,agencyId:t.agencies[0]?.id}:null;}}
  function save(){catalog.current=current;put(CATALOG_KEY,catalog);put(CONTEXT_KEY,current);}
  function tenant(id=current?.tenantId){return catalog?.tenants.find(t=>t.id===id)}
  function agency(tenantId=current?.tenantId,agencyId=current?.agencyId){return tenant(tenantId)?.agencies.find(a=>a.id===agencyId)}
  function actualRoles(){return SuiteStore.mode()==='shared'?(HOME_ROLE_IDS||[]):(STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID)?.roleIds||[])}
  function isPlatformAdmin(){return actualRoles().includes('role_platform_admin')}
  function isSystemAdmin(){return actualRoles().includes('role_admin')}
  function contexts(){if(isPlatformAdmin())return catalog.tenants.flatMap(t=>t.agencies.map(a=>({tenant:t,agency:a})));const memberships=currentPersonMemberships();return memberships.map(m=>({tenant:tenant(m.tenantId),agency:agency(m.tenantId,m.agencyId)})).filter(x=>x.tenant&&x.agency)}
  function currentPersonMemberships(){const p=STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID);return p?.tenantMemberships||[{tenantId:current.tenantId,agencyId:current.agencyId,roleIds:p?.roleIds||[]}];}
  function activeModules(){const t=tenant();return t?.enabledModules||[]}
  function moduleEnabled(key){
    // The tenant catalog behind this is only readable by admins (suite_list_contexts). For an
    // ordinary user it comes back empty, and treating that "I don't know" as "not licensed"
    // hides every module from them permanently, no matter what their role grants. Module
    // licensing is a vendor/billing concern, not the per-user security boundary -- that's the
    // role ability check, which is applied separately and is unaffected by this. So when the
    // catalog genuinely isn't available to this user, defer to their role instead of denying.
    const t = tenant();
    if(!t || !Array.isArray(t.enabledModules) || !t.enabledModules.length) return true;
    return t.enabledModules.includes(key);
  }
  function audit(t,action){t.audit.unshift({id:uuid('ta'),at:now(),actor:STATE?.personnel?.find(p=>p.id===CURRENT_USER_ID)?.name||'Platform Admin',action});t.updatedAt=now();save();}
  function contextLabel(){const t=tenant(),a=agency();return a?`${a.abbreviation||a.name} · ${t?.name||''}`:'No agency selected'}
  function renderContext(){const host=document.getElementById('tenantContextHost');if(!host)return;const list=contexts();host.hidden=list.length<2&&!isPlatformAdmin();host.innerHTML=`<div style="position:relative"><button class="btn btn-outline btn-sm" id="tenantContextButton" aria-haspopup="menu" aria-expanded="false"><span class="tenant-context-name">${esc(contextLabel())}</span> ▾</button><div class="tenant-menu" id="tenantContextMenu" role="menu" hidden></div></div>`;const btn=host.querySelector('#tenantContextButton'),menu=host.querySelector('#tenantContextMenu');btn.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)renderMenu(menu)};}
  function renderMenu(menu){const list=contexts();menu.innerHTML='<div style="padding:9px 12px;font-size:11px;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Agency workspace</div>';for(const c of list){const b=document.createElement('button');b.className='tenant-option';b.role='menuitem';b.innerHTML=`<span><strong>${esc(c.agency.name)}</strong><small>${esc(c.tenant.name)} · ${esc(STATUS_LABELS[c.tenant.status])}</small></span><span class="check">${c.tenant.id===current.tenantId&&c.agency.id===current.agencyId?'✓':''}</span>`;b.disabled=c.tenant.status==='suspended';b.onclick=()=>switchContext(c.tenant.id,c.agency.id);menu.append(b)}if(isPlatformAdmin()){const manage=document.createElement('button');manage.className='tenant-option';manage.innerHTML='<span><strong>Tenant Management</strong><small>Provision and administer customers</small></span><span>→</span>';manage.onclick=showTenantManagement;menu.append(manage)}}
  async function switchContext(tenantId,agencyId){const t=tenant(tenantId),a=agency(tenantId,agencyId);if(!t||!a||t.status==='suspended'){toast('That tenant is not available.',true);return}if(!isPlatformAdmin()&&!currentPersonMemberships().some(m=>m.tenantId===tenantId&&m.agencyId===agencyId)){toast('You are not assigned to that agency.',true);return}if(!hasAccess(t,a)){toast('That agency membership is not active.',true);return}if(!SuiteUX.guard())return;const subdomain=(a.subdomain||'').trim().toLowerCase();if(SuiteStore.mode()==='shared'&&subdomain){const targetHost=`${subdomain}.sonomarzi.com`;if(location.hostname.toLowerCase()!==targetHost){location.assign(`https://${targetHost}/`);return}}try{if(SuiteStore.mode()==='shared')await SuiteStore.loadRemoteContext(tenantId,agencyId);else{if(!await SuiteStore.flush())throw Error('Save pending changes before switching agencies.');snapshotCurrent();let next=stored(workspaceKey(tenantId,agencyId),null);if(!next)next=await newAgencyState(t,a);await SuiteStore.adopt(next);STATE.currentRoleIds=[...actualRolesForContext(next)]}}catch(error){toast(error.message,true);return}current={tenantId,agencyId};save();applyAgencyBranding();renderRoleSwitcher();renderContext();renderBanner();try{history.replaceState({},'','#/agency/'+encodeURIComponent(t.slug));}catch{}SuiteUX.home();toast(`Switched to ${a.name}.`)}
  function hasAccess(t,a){return t.status==='active'||t.status==='setup'||isPlatformAdmin()}
  function actualRolesForContext(state){if(SuiteStore.mode()==='shared')return HOME_ROLE_IDS||[];return state.personnel?.find(p=>p.id===CURRENT_USER_ID)?.roleIds||['role_admin','role_platform_admin']}
  function workspaceKey(tid,aid){return `pss.workspace.${tid}.${aid}.v1`}
  function snapshotCurrent(){if(SuiteStore.mode()!=='local'||!current||!STATE)return;put(workspaceKey(current.tenantId,current.agencyId),STATE)}
  async function newAgencyState(t,a){const state=await buildSeedState();for(const [root,data] of Object.entries(state)){if(!['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil','permits'].includes(root)||!data||typeof data!=='object')continue;for(const [k,v] of Object.entries(data))if(Array.isArray(v)&&!['refData'].includes(k))data[k]=[];}
    const fred=state.personnel.find(p=>p.name==='Fred Marziano')||state.personnel[0];state.personnel=[fred];state.accounts=state.accounts.filter(ac=>ac.personId===fred.id);fred.roleIds=['role_admin','role_platform_admin'];state.currentRoleIds=[...fred.roleIds];state.agencyBranding={logoDataUrl:null,title:a.branding?.title||`${a.name} Public Safety Suite`,subtitle:a.branding?.subtitle||'Operational readiness in one workspace'};state.tenantContext={tenantId:t.id,agencyId:a.id,tenantName:t.name,agencyName:a.name,enabledModules:t.enabledModules};return state}
  function init(){load();const remote=SuiteStore.remoteContext?.();if(remote?.tenantId&&remote?.agencyId)current=remote;if(!document.getElementById('tenantContextHost')){const toolbar=document.querySelector('#topbar .role-switch');const host=document.createElement('div');host.id='tenantContextHost';host.className='tenant-switcher';toolbar.prepend(host)}if(!document.getElementById('tenantIdentityBanner')){const banner=document.createElement('div');banner.className='tenant-banner';banner.id='tenantIdentityBanner';document.getElementById('topbar').after(banner)}renderContext();renderBanner();if(!document.documentElement.dataset.tenantMenuBound){document.documentElement.dataset.tenantMenuBound='true';document.addEventListener('click',e=>{const menu=document.getElementById('tenantContextMenu');if(menu&&!e.target.closest('#tenantContextHost'))menu.hidden=true})}if(SuiteStore.mode()==='shared')refreshRemote().catch(e=>toast(e.message||'Tenant catalog could not be loaded.',true));}
  function renderBanner(){const b=document.getElementById('tenantIdentityBanner'),t=tenant(),a=agency();if(!b||!t||!a)return;b.innerHTML=`<strong>${esc(a.name)}</strong><span>${esc(t.name)}</span><span>${esc(t.timezone)}</span><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span>`}
  function refresh(){renderContext();renderBanner();}
  function showTenantManagement(){if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}const el=SuiteUX.showPlatformView?SuiteUX.showPlatformView('tenant-management','Tenant Management','Provision agencies, control modules, and manage tenant lifecycle'):null;if(!el){const target=document.getElementById('view-home');return}renderTenantList(el)}
  function renderTenantList(el){detailTenantId=null;const counts={active:catalog.tenants.filter(t=>t.status==='active').length,setup:catalog.tenants.filter(t=>['setup','provisioning'].includes(t.status)).length,suspended:catalog.tenants.filter(t=>t.status==='suspended').length,agencies:catalog.tenants.reduce((n,t)=>n+t.agencies.length,0)};el.innerHTML=`<div class="tenant-toolbar"><div><div class="work-eyebrow">Platform control plane</div><h2 style="margin:0;color:var(--heading)">Customer tenants</h2></div><div style="display:flex;gap:8px"><button class="btn btn-outline" id="platformAdmins">Platform Admins</button><button class="btn btn-outline" id="addAgencyExisting">Add agency</button><button class="btn btn-primary" id="createTenant">Create tenant</button></div></div><div class="tenant-summary"><div class="tenant-stat"><strong>${counts.active}</strong><span>Active tenants</span></div><div class="tenant-stat"><strong>${counts.setup}</strong><span>In setup</span></div><div class="tenant-stat"><strong>${counts.agencies}</strong><span>Total agencies</span></div><div class="tenant-stat"><strong>${counts.suspended}</strong><span>Suspended</span></div></div><div class="tenant-table-wrap"><table><thead><tr><th>Tenant</th><th>Status</th><th>Agencies</th><th>Modules</th><th>Plan</th><th></th></tr></thead><tbody>${catalog.tenants.map(t=>`<tr><td><div class="tenant-name">${esc(t.name)}</div><div class="tenant-slug">${esc(t.slug)}</div></td><td><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></td><td>${t.agencies.length}</td><td><div class="tenant-module-list">${t.enabledModules.slice(0,4).map(m=>`<span class="tenant-module">${esc(MODULE_LABELS[m])}</span>`).join('')}${t.enabledModules.length>4?`<span class="tenant-module">+${t.enabledModules.length-4}</span>`:''}</div></td><td>${esc(t.plan)}</td><td><button class="btn btn-outline btn-sm" data-open-tenant="${esc(t.id)}">Manage</button></td></tr>`).join('')}</tbody></table></div>`;el.querySelector('#platformAdmins').onclick=showPlatformAdmins;el.querySelector('#createTenant').onclick=()=>startWizard('tenant');el.querySelector('#addAgencyExisting').onclick=()=>startWizard('agency');el.querySelectorAll('[data-open-tenant]').forEach(b=>b.onclick=()=>showTenantDetail(b.dataset.openTenant))}
  function defaultWizard(kind){const baseTenant=tenant();return {kind,step:0,tenantId:kind==='agency'?baseTenant?.id:null,name:'',slug:'',timezone:'America/Los_Angeles',plan:'Enterprise',agencyName:'',abbreviation:'',agencyType:'Municipal Police',ori:'',subdomain:'',modules:kind==='agency'?[...(baseTenant?.enabledModules||MODULE_KEYS)]:[...MODULE_KEYS],template:'Standard Law Enforcement',adminName:'',adminEmail:'',importMode:'empty',status:'setup'}}
  function startWizard(kind){if(!isPlatformAdmin())return;wizard=defaultWizard(kind);renderWizard()}
  const STEPS=['Tenant','Agency','Modules','Template','Administrator','Data','Review'];
  function renderWizard(){const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><div><h3>${wizard.kind==='tenant'?'Create New Tenant':'Add Agency to Tenant'}</h3><div style="font-size:12px;color:var(--text-dim)">Guided onboarding · no code deployment required</div></div><button class="modal-close" id="wizardClose">×</button></div><div class="modal-body" style="padding:0"><div class="onboarding-shell"><aside class="onboarding-steps">${STEPS.map((s,i)=>`<div class="onboarding-step ${i===wizard.step?'active':i<wizard.step?'done':''}"><span class="num">${i<wizard.step?'✓':i+1}</span><span>${s}</span></div>`).join('')}</aside><main class="onboarding-main" id="wizardMain"></main></div></div>`;SuiteUX.openModal();box.querySelector('#wizardClose').onclick=e=>SuiteUX.closeModal(e);renderWizardStep()}
  function field(id,label,value,type='text',extra=''){return `<div class="form-row"><label for="${id}">${esc(label)}</label><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></div>`}
  function renderWizardStep(){const main=document.getElementById('wizardMain');let body='',title='',sub='';switch(wizard.step){case 0:title=wizard.kind==='tenant'?'Define the customer tenant':'Select the customer tenant';sub='The tenant is the customer boundary for licensing, lifecycle, and billing.';body=wizard.kind==='tenant'?`<div class="onboarding-fields">${field('wTenantName','Customer or tenant name',wizard.name)}${field('wTenantSlug','Tenant URL identifier',wizard.slug,'text','pattern="[a-z0-9-]+"')}${field('wTimezone','Time zone',wizard.timezone)}<div class="form-row"><label for="wPlan">Subscription plan</label><select id="wPlan"><option>Enterprise</option><option>Professional</option><option>Pilot</option></select></div></div>`:`<div class="form-row"><label for="wExistingTenant">Existing tenant</label><select id="wExistingTenant">${catalog.tenants.filter(t=>t.status!=='suspended').map(t=>`<option value="${t.id}" ${t.id===wizard.tenantId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>`;break;case 1:title='Add the first agency';sub='An agency is the operational data boundary within the tenant.';body=`<div class="onboarding-fields">${field('wAgencyName','Agency name',wizard.agencyName)}${field('wAbbreviation','Abbreviation',wizard.abbreviation)}<div class="form-row"><label for="wAgencyType">Agency type</label><select id="wAgencyType">${['Municipal Police','Sheriff’s Office','Fire / EMS','Regional Authority','Prosecutor','Other Public Safety'].map(x=>`<option ${x===wizard.agencyType?'selected':''}>${x}</option>`).join('')}</select></div>${field('wOri','ORI or agency identifier',wizard.ori)}${field('wSubdomain','Agency URL',wizard.subdomain,'text','placeholder="agencyname" pattern="[a-z0-9-]+"')}<div style="font-size:12px;color:var(--text-dim);margin-top:-8px">This agency will use <strong>${esc(wizard.subdomain||'agencyname')}.sonomarzi.com</strong>.</div></div>`;break;case 2:title='Enable licensed modules';sub='Users see only modules that are enabled here and allowed by their roles.';body=`<div class="module-select-grid">${MODULE_KEYS.map(k=>`<label class="module-choice"><input type="checkbox" data-module="${k}" ${wizard.modules.includes(k)?'checked':''}><span><strong>${MODULE_LABELS[k]}</strong><span>${esc(MODULE_META[k].tagline)}</span></span></label>`).join('')}</div>`;break;case 3:title='Apply a configuration template';sub='Templates establish reference values and baseline workflows. Agency administrators can refine them later.';body=`<div class="onboarding-fields"><div class="form-row full"><label for="wTemplate">Starting template</label><select id="wTemplate">${['Standard Law Enforcement','Sheriff / Countywide','Regional Multi-Agency','Fire / EMS','Blank Configuration'].map(x=>`<option ${x===wizard.template?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="setup-checklist" style="margin-top:18px"><div class="setup-check">${ICONS.check}<span>Standard roles and abilities</span></div><div class="setup-check">${ICONS.check}<span>Module reference lists and notification routes</span></div><div class="setup-check">${ICONS.check}<span>Agency branding defaults and audit controls</span></div></div>`;break;case 4:title='Invite the agency System Admin';sub='The first agency administrator can configure this agency but cannot enter other tenants.';body=`<div class="onboarding-fields">${field('wAdminName','Administrator name',wizard.adminName)}${field('wAdminEmail','Government email',wizard.adminEmail,'email')}</div><div class="callout callout-blue" style="margin-top:18px">The invitation creates an agency-scoped System Admin membership. Platform Admin access cannot be granted from this workflow.</div>`;break;case 5:title='Choose the initial data path';sub='Start empty or prepare a validated import after tenant creation.';body=`<div class="module-select-grid"><label class="module-choice"><input type="radio" name="importMode" value="empty" ${wizard.importMode==='empty'?'checked':''}><span><strong>Start empty</strong><span>Use the selected template and enter data through the application.</span></span></label><label class="module-choice"><input type="radio" name="importMode" value="import" ${wizard.importMode==='import'?'checked':''}><span><strong>Prepare validated import</strong><span>Create the tenant now and hold activation until an import is verified.</span></span></label></div>`;break;case 6:title='Review and create';sub='The new tenant begins in Setup so Platform and Agency administrators can validate it before activation.';body=`<div class="review-grid"><div class="review-card"><h3>Tenant</h3><p><strong>${esc(wizard.kind==='tenant'?wizard.name:tenant(wizard.tenantId)?.name)}</strong></p><p>${esc(wizard.kind==='tenant'?wizard.slug:tenant(wizard.tenantId)?.slug)}</p><p>${esc(wizard.kind==='tenant'?wizard.timezone:tenant(wizard.tenantId)?.timezone)}</p></div><div class="review-card"><h3>Agency</h3><p><strong>${esc(wizard.agencyName)}</strong> (${esc(wizard.abbreviation)})</p><p>${esc(wizard.agencyType)}</p><p>${esc(wizard.ori||'No identifier provided')}</p><p><strong>URL:</strong> ${esc(wizard.subdomain)}.sonomarzi.com</p></div><div class="review-card"><h3>Modules</h3><p>${wizard.modules.map(m=>esc(MODULE_LABELS[m])).join(', ')}</p></div><div class="review-card"><h3>Administrator</h3><p>${esc(wizard.adminName)}</p><p>${esc(wizard.adminEmail)}</p><p>System Admin · Invitation pending</p></div></div>`;}
    main.innerHTML=`<h2>${title}</h2><div class="sub">${sub}</div>${body}<div id="wizardError" class="field-error" role="alert" style="margin-top:14px"></div><div class="onboarding-actions"><button class="btn btn-outline" id="wizardBack" ${wizard.step===0?'disabled':''}>Back</button><button class="btn btn-primary" id="wizardNext">${wizard.step===6?'Create tenant':'Continue'}</button></div>`;main.querySelector('#wizardBack').onclick=()=>{captureStep();wizard.step--;renderWizard()};main.querySelector('#wizardNext').onclick=async()=>{if(!captureStep(true))return;if(wizard.step<6){wizard.step++;renderWizard();}else await provision()};SuiteUX.enhance()}
  function captureStep(validate=false){const value=id=>document.getElementById(id)?.value.trim();const error=msg=>{const e=document.getElementById('wizardError');if(e)e.textContent=msg;return false};switch(wizard.step){case 0:if(wizard.kind==='tenant'){wizard.name=value('wTenantName');wizard.slug=value('wTenantSlug').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');wizard.timezone=value('wTimezone');wizard.plan=document.getElementById('wPlan')?.value||wizard.plan;if(validate&&(!wizard.name||wizard.slug.length<3||!wizard.timezone))return error('Enter a tenant name, URL identifier, and time zone.');if(validate&&catalog.tenants.some(t=>t.slug===wizard.slug))return error('That internal tenant key is already in use.')}else{wizard.tenantId=document.getElementById('wExistingTenant')?.value;if(validate&&!wizard.tenantId)return error('Select a tenant.')}break;case 1:wizard.agencyName=value('wAgencyName');wizard.abbreviation=value('wAbbreviation').toUpperCase();wizard.agencyType=document.getElementById('wAgencyType')?.value||wizard.agencyType;wizard.ori=value('wOri');wizard.subdomain=(value('wSubdomain')||'').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(validate&&(!wizard.agencyName||!wizard.abbreviation||!wizard.subdomain))return error('Enter an agency name, abbreviation, and agency URL.');if(validate&&(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(wizard.subdomain)||['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(wizard.subdomain)))return error('Choose a valid, non-reserved agency URL using lowercase letters, numbers, and hyphens.');if(validate&&catalog.tenants.some(t=>t.agencies.some(a=>(a.subdomain||'').toLowerCase()===wizard.subdomain)))return error('That agency URL is already in use.');{const t=wizard.kind==='tenant'?null:tenant(wizard.tenantId);if(validate&&t?.agencies.some(a=>a.name.toLowerCase()===wizard.agencyName.toLowerCase()))return error('That agency already exists in this tenant.')}break;case 2:wizard.modules=[...document.querySelectorAll('[data-module]:checked')].map(x=>x.dataset.module);if(validate&&!wizard.modules.length)return error('Enable at least one module.');break;case 3:wizard.template=document.getElementById('wTemplate')?.value||wizard.template;break;case 4:wizard.adminName=value('wAdminName');wizard.adminEmail=value('wAdminEmail').toLowerCase();if(validate&&(!wizard.adminName||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wizard.adminEmail)))return error('Enter the administrator’s name and a valid email address.');break;case 5:wizard.importMode=document.querySelector('[name=importMode]:checked')?.value||'empty';}return true}
  async function provision(){const next=document.getElementById('wizardNext');next.disabled=true;next.textContent='Creating…';try{let result;if(SuiteStore.mode()==='shared')result=await provisionRemote();else result=await provisionLocal();SuiteUX.clearDirty();SuiteUX.closeModal();toast(`${result.agency.name} created in Setup.${wizard.adminEmail?' Secure administrator activation email requested.':''}`);showTenantDetail(result.tenant.id)}catch(e){next.disabled=false;next.textContent='Create tenant';document.getElementById('wizardError').textContent=e.message||'Tenant creation failed.'}}
  async function provisionLocal(){let t;if(wizard.kind==='tenant'){t={id:uuid('tenant'),slug:wizard.slug,name:wizard.name,timezone:wizard.timezone,status:'setup',plan:wizard.plan,enabledModules:[...wizard.modules],createdAt:now(),updatedAt:now(),agencies:[],admins:[],invites:[],regionalWorkspaces:[],supportSessions:[],audit:[]};catalog.tenants.push(t)}else{t=tenant(wizard.tenantId);t.enabledModules=[...new Set([...t.enabledModules,...wizard.modules])]}
    const a={id:uuid('agency'),name:wizard.agencyName,abbreviation:wizard.abbreviation,type:wizard.agencyType,ori:wizard.ori,subdomain:wizard.subdomain,status:'setup',branding:{title:`${wizard.agencyName} Public Safety Suite`,subtitle:'Operational readiness in one workspace'}};t.agencies.push(a);t.invites.push({id:uuid('invite'),agencyId:a.id,name:wizard.adminName,email:wizard.adminEmail,roleIds:['role_admin'],status:'pending',createdAt:now()});audit(t,`Created ${a.name} in ${t.name}; System Admin invitation queued for ${wizard.adminEmail}`);const state=await newAgencyState(t,a);state.tenantContext={tenantId:t.id,agencyId:a.id,tenantName:t.name,agencyName:a.name,enabledModules:wizard.modules,template:wizard.template,importMode:wizard.importMode};put(workspaceKey(t.id,a.id),state);save();return {tenant:t,agency:a}}
  async function provisionRemote(){
    const templateState=await buildSeedState();
    templateState.accounts=[];templateState.personnel=[];templateState.currentRoleIds=[];templateState.auditLog=[];
    for(const root of ['qm','fleet','pm','k9','drone','eod','subpoena','grants','civil'])for(const [k,v] of Object.entries(templateState[root]||{}))if(Array.isArray(v)&&k!=='refData')templateState[root][k]=[];
    for(const root of ['qm','fleet','pm'])if(templateState[root]?.refData?.agencies)templateState[root].refData.agencies=[wizard.agencyName];
    const data=await platformApi(wizard.kind==='tenant'?'create_tenant':'add_agency',{tenantId:wizard.tenantId,tenant:{name:wizard.name,slug:wizard.slug,timezone:wizard.timezone,plan:wizard.plan},agency:{name:wizard.agencyName,abbreviation:wizard.abbreviation,type:wizard.agencyType,ori:wizard.ori,subdomain:wizard.subdomain},enabledModules:wizard.modules,template:wizard.template,templateState,importMode:wizard.importMode});
    await registerAgencySubdomain({tenantId:data.tenantId,agencyId:data.agencyId,subdomain:wizard.subdomain});
    if(wizard.adminName&&wizard.adminEmail){
      const invite=await SuiteStore.api('/identity-admin',{method:'POST',body:JSON.stringify({action:'invite_user',tenantId:data.tenantId,agencyId:data.agencyId,name:wizard.adminName,email:wizard.adminEmail,roleIds:['role_admin']})});
    }
    await refreshRemote();
    return {tenant:tenant(data.tenantId),agency:agency(data.tenantId,data.agencyId)};
  }
  async function refreshRemote(){
    if(SuiteStore.mode()!=='shared')return;
    const data=await platformApi('list_contexts',{currentTenantId:current?.tenantId||null,currentAgencyId:current?.agencyId||null});
    catalog={version:1,tenants:data.tenants||[],current:data.current||current};
    current=data.current||current;normalize();save();refresh();
  }
  async function insertSampleData(tenantId, agencyId, enabledModules, button){
    if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}
    if(!confirm('Add sample equipment, vehicles, civil papers, and training courses to this agency? Nothing will be assigned to any specific person. This writes directly to the live agency.')) return;
    if(button){button.disabled=true;button.textContent='Adding sample data…';}
    try{
      // Read this SPECIFIC tenant/agency's current data directly, rather than assuming it
      // matches whatever the admin's own active session happens to be signed into. Platform
      // Admins routinely view a different tenant than their own -- using the admin's local
      // STATE here would silently write sample data into the wrong agency, the exact class of
      // bug found and reverted earlier tonight in the invite flow.
      const data = await SuiteStore.api(`/workspace?tenantId=${encodeURIComponent(tenantId)}&agencyId=${encodeURIComponent(agencyId)}`);
      const versions = {}; const existing = {};
      for(const r of data.records){ versions[r.key] = r.version; existing[r.key] = r.value; }
      const patches = [];
      const addRecord = (path, id, value) => {
        const key = JSON.stringify([path, id]);
        patches.push({ key, value, deleted: false, expected_version: versions[key] || 0 });
      };
      // Merges new ids into whatever this collection's existing $order list already contains,
      // rather than replacing it -- overwriting it outright would silently delete every
      // existing equipment item, vehicle, paper, or course this agency already had.
      const addOrder = (path, newIds) => {
        const key = JSON.stringify([path, '$order']);
        const current = Array.isArray(existing[key]) ? existing[key] : [];
        patches.push({ key, value: [...current, ...newIds.filter(id=>!current.includes(id))], deleted: false, expected_version: versions[key] || 0 });
      };

      const stamp = Date.now();
      const added = [];

      if(enabledModules.includes('qm')){
        const eqItems = [
          ["Aegis II Ballistic Vest - Size M","Body Armor","Good","Main Armory",680],
          ["Glock 22 Duty Sidearm","Firearms","Good","Main Armory",520],
          ["Motorola APX 8000 Radio","Radios & Electronics","Good","Patrol Division Cage",5200],
          ["Body-Worn Camera","Radios & Electronics","New","Patrol Division Cage",699],
          ["IFAK Trauma Kit","Medical / Trauma","Good","Supply Room B",120],
          ["Duty Belt - Nylon","Duty Gear","Good","Supply Room B",145],
          ["Patrol Uniform Set (2)","Uniforms","Good","Supply Room B",180],
          ["TASER 10 CEW","Less-Lethal","Good","Patrol Division Cage",1650],
        ];
        const eqIds = eqItems.map((it,i)=>{
          const id = 'sample_eq'+stamp+i;
          addRecord(['qm','equipment'], id, {
            id, assetId:'QM-S'+(1000+i), name:it[0], category:it[1], condition:it[2], location:it[3],
            value:it[4], purchaseDate: fmt(new Date()), inServiceDate: fmt(new Date()), replacementDate: null,
            serialNumber:null, manufacturer:null, model:null, equipmentType:'Tool / Kit', vendorId:null,
            agency: agencyId, ownershipType:'Agency', personalWeaponAuth:null, isSharedAsset:false,
            isConsumable:false, quantity:1, minQuantity:null,
            status:'Available', assignedTo:null, assignedToType:null, disposal:null,
            notes:'Sample record for demo/testing purposes.',
          });
          return id;
        });
        addOrder(['qm','equipment'], eqIds);
        added.push(`${eqIds.length} equipment item(s)`);
      }

      if(enabledModules.includes('fleet')){
        const vehItems = [
          ["Sample Unit 90","Ford","Police Interceptor Utility",2023,"Patrol SUV",5000,"Unleaded"],
          ["Sample Unit 91","Dodge","Charger Pursuit",2022,"Patrol Sedan",12000,"Unleaded"],
          ["Sample Moto 90","Harley-Davidson","Road King Police",2023,"Motorcycle",1500,"Unleaded"],
          ["Sample Admin 90","Chevrolet","Impala",2020,"Administrative Sedan",30000,"Unleaded"],
        ];
        const vehIds = vehItems.map((it,i)=>{
          const id = 'sample_veh'+stamp+i;
          addRecord(['fleet','vehicles'], id, {
            id, unitNumber:it[0], make:it[1], model:it[2], year:it[3],
            vin: 'SAMPLE'+String(stamp).slice(-8)+i, licensePlate:'SAMP-'+(100+i),
            vehicleType:it[4], status:'In Service', mileage:it[5], fuelType:it[6],
            currentFuelLevel:80, purchaseDate: fmt(new Date()), inServiceDate: fmt(new Date()),
            agency: agencyId, location:'Main Fleet Garage', isSharedAsset:false,
            assignedToType:null, assignedTo:null,
            equipmentChecklist:[], photoDataUrl:null, notes:'Sample record for demo/testing purposes.', disposal:null,
          });
          return id;
        });
        addOrder(['fleet','vehicles'], vehIds);
        added.push(`${vehIds.length} vehicle(s)`);
      }

      if(enabledModules.includes('civil')){
        const paperItems = [
          ["SAMPLE-CV-0001","Sample Superior Court","Summons & Complaint","Sample Plaintiff LLC","Sample Defendant"],
          ["SAMPLE-CV-0002","Sample Superior Court","Writ of Garnishment","Sample Creditor Inc.","Sample Debtor"],
          ["SAMPLE-SC-0001","Sample Justice Court","Small Claims","Sample Claimant","Sample Respondent"],
        ];
        const paperIds = paperItems.map((it,i)=>{
          const id = 'sample_cp'+stamp+i;
          addRecord(['civil','papers'], id, {
            id, caseNumber:it[0], courtOfOrigin:it[1], paperType:it[2], plaintiff:it[3], defendant:it[4], attorneyOfRecord:'',
            priority:'Standard', receivedDate: fmt(new Date()), returnByDate: fmt(addDays(new Date(),21)),
            serviceAddresses:[], assignedServerId:null, stage:'Unassigned',
            serviceMethod:null, attempts:[], servedDate:null, servedTime:null, servedOnName:null,
            feeLineItems:[], feePayments:[], deposits:[], mileage:0, returnFiledDate:null, generatedDocuments:[],
            photos:[], safetyFlags:[], additionalPlaintiffs:[], additionalDefendants:[], witnesses:[],
            fieldHistory:[], notes:'Sample record for demo/testing purposes.',
          });
          return id;
        });
        addOrder(['civil','papers'], paperIds);
        added.push(`${paperIds.length} civil paper(s)`);
      }

      if(enabledModules.includes('personnel')){
        const courseItems = [
          ["Sample Training Course: Radio Procedures","Technology / RMS","Recommended"],
          ["Sample Training Course: De-escalation Techniques","Specialty / Tactical","Recommended"],
        ];
        const courseIds = courseItems.map((it,i)=>{
          const id = 'sample_crs'+stamp+i;
          addRecord(['pm','trainingCourses'], id, {
            id, name:it[0], category:it[1], classification:it[2], isRequired:false, recertRequired:false, recertIntervalMonths:null,
          });
          return id;
        });
        addOrder(['pm','trainingCourses'], courseIds);
        // A couple of scheduled sessions for those courses -- empty roster, no attendees signed
        // up, no instructor named, so nothing here is tied to any specific person either.
        const sessionIds = courseIds.map((courseId,i)=>{
          const id = 'sample_sess'+stamp+i;
          addRecord(['pm','trainingSessions'], id, {
            id, courseId, instructorId:null, location:'TBD',
            date: fmt(addDays(new Date(), 14+i*7)), startTime:'09:00', endTime:'12:00', capacity:20,
            status:'Scheduled', notes:'Sample record for demo/testing purposes.', roster:[],
          });
          return id;
        });
        addOrder(['pm','trainingSessions'], sessionIds);
        added.push(`${courseIds.length} training course(s) with ${sessionIds.length} scheduled session(s)`);
      }

      if(!patches.length){ toast('None of this agency\u2019s licensed modules have sample data defined for them yet.', true); return; }

      await SuiteStore.api('/apply-changes',{method:'POST',body:JSON.stringify({tenant_id:tenantId,agency_id:agencyId,changes:patches})});
      toast(`Added ${added.join(', ')} -- nothing assigned to any person.`);
    }catch(err){
      toast(`Could not add sample data: ${err.message}`, true);
    }finally{
      if(button){button.disabled=false;button.textContent='Insert Sample Data';}
    }
  }

  async function showPlatformAdmins(){
    if(!isPlatformAdmin()){toast('Platform Admin access is required.',true);return}
    const el=SuiteUX.showPlatformView('platform-admins','Platform Admins','SonoMarzi-wide administrator access');if(!el)return;
    el.innerHTML=`<div class="tenant-toolbar"><button class="btn btn-outline" id="backPlatformTenants">← Tenant Management</button><div><div class="work-eyebrow">Platform security</div><h2 style="margin:0;color:var(--heading)">Platform Administrators</h2></div><button class="btn btn-primary" id="addPlatformAdmin">Add Platform Admin</button></div><div class="callout callout-blue" style="margin-bottom:18px"><strong>Platform Admin is SonoMarzi-level access.</strong><div style="margin-top:4px">Only current Platform Admins are shown here. New Platform Admins can only be selected from users who belong to the internal Demo tenant.</div></div><section class="panel"><div class="panel-head"><h2>Current Platform Admins</h2><span class="hint">Loading…</span></div><div class="panel-body" id="platformAdminList"><div class="empty-state"><div class="msg">Loading Platform Admins…</div></div></div></section>`;
    el.querySelector('#backPlatformTenants').onclick=showTenantManagement;
    el.querySelector('#addPlatformAdmin').onclick=openAddPlatformAdmin;
    try{
      const data=await platformApi('list_platform_admins');const users=data?.users||[];const list=el.querySelector('#platformAdminList');
      el.querySelector('.panel-head .hint').textContent=`${users.length} enabled`;
      list.innerHTML=users.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--border)"><div><strong style="color:var(--heading)">${esc(u.name||u.email)}</strong><div class="hint" style="margin-top:3px">${esc(u.email)}</div></div><button class="btn btn-danger btn-sm" data-platform-user="${esc(u.user_id)}">Revoke Platform Admin</button></div>`).join('')||'<div class="empty-state"><div class="msg">No Platform Admins found</div></div>';
      list.querySelectorAll('[data-platform-user]').forEach(b=>b.onclick=async()=>{if(!confirm('Revoke Platform Admin access from this user?'))return;b.disabled=true;try{await platformApi('set_platform_admin',{userId:b.dataset.platformUser,enabled:false});toast('Platform Admin revoked.');await refreshRemote();showPlatformAdmins()}catch(error){b.disabled=false;toast(error.message,true)}});
    }catch(error){el.querySelector('#platformAdminList').innerHTML=`<div class="callout callout-red">${esc(error.message)}</div>`}
  }

  function openAddPlatformAdmin(){
    const box=document.getElementById('modalBox');box.className='modal';
    box.innerHTML=`<div class="modal-head"><div><h3>Add Platform Admin</h3><div style="font-size:12px;color:var(--text-dim)">Search users in the internal Demo tenant only</div></div><button class="modal-close" id="platformAdminAddClose">×</button></div><div class="modal-body"><div class="form-row"><label for="platformAdminSearch">Name or email</label><div style="display:flex;gap:8px"><input id="platformAdminSearch" placeholder="Search Demo users"><button class="btn btn-outline" id="platformAdminSearchButton">Search</button></div></div><div class="callout callout-blue" style="margin:12px 0">A person must first be added as a user in the Demo tenant before they can receive SonoMarzi Platform Admin access.</div><div id="platformAdminCandidates"><div class="empty-state"><div class="sub">Search for a Demo tenant user to promote.</div></div></div></div><div class="modal-foot"><button class="btn btn-outline" id="platformAdminAddCancel">Close</button></div>`;
    SuiteUX.openModal();
    box.querySelector('#platformAdminAddClose').onclick=box.querySelector('#platformAdminAddCancel').onclick=event=>SuiteUX.closeModal(event);
    const runSearch=async()=>{
      const q=box.querySelector('#platformAdminSearch').value.trim();const host=box.querySelector('#platformAdminCandidates');host.innerHTML='<div class="empty-state"><div class="sub">Searching…</div></div>';
      try{
        const data=await platformApi('search_platform_admin_candidates',{search:q});const users=data?.users||[];
        host.innerHTML=users.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--border)"><div><strong>${esc(u.name||u.email)}</strong><div class="hint">${esc(u.email)} · ${esc(u.agency_name||'Demo')}</div></div><button class="btn btn-primary btn-sm" data-grant-platform="${esc(u.user_id)}">Grant</button></div>`).join('')||'<div class="empty-state"><div class="msg">No matching Demo users</div><div class="sub">Add the person to the Demo tenant first, then search again.</div></div>';
        host.querySelectorAll('[data-grant-platform]').forEach(b=>b.onclick=async()=>{if(!confirm('Grant SonoMarzi Platform Admin access to this user?'))return;b.disabled=true;try{await platformApi('set_platform_admin',{userId:b.dataset.grantPlatform,enabled:true});toast('Platform Admin granted.');SuiteUX.closeModal();await refreshRemote();showPlatformAdmins()}catch(error){b.disabled=false;toast(error.message,true)}});
      }catch(error){host.innerHTML=`<div class="callout callout-red">${esc(error.message)}</div>`}
    };
    box.querySelector('#platformAdminSearchButton').onclick=runSearch;
    box.querySelector('#platformAdminSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runSearch();}});
  }

  function showTenantDetail(id){if(!isPlatformAdmin())return;detailTenantId=id;const t=tenant(id),el=SuiteUX.showPlatformView('tenant-detail',t.name,'Tenant lifecycle, agencies, modules, and access');if(!el)return;el.innerHTML=`<div class="tenant-toolbar"><button class="btn btn-outline" id="backTenants">← All tenants</button><div style="display:flex;gap:8px"><button class="btn btn-outline" id="exportTenant">Export manifest</button><button class="btn btn-outline" id="addAgencyHere">Add agency</button><button class="btn btn-primary" id="saveTenant">Save changes</button></div></div><div class="tenant-detail-grid"><div><section class="panel"><div class="panel-head"><h2>Tenant profile</h2><span class="tenant-status ${esc(t.status)}">${esc(STATUS_LABELS[t.status])}</span></div><div class="panel-body"><div class="onboarding-fields">${field('tdName','Tenant name',t.name)}${field('tdSlug','Internal tenant key',t.slug)}${field('tdTimezone','Time zone',t.timezone)}<div class="form-row"><label for="tdPlan">Plan</label><select id="tdPlan">${['Enterprise','Professional','Pilot'].map(x=>`<option ${x===t.plan?'selected':''}>${x}</option>`).join('')}</select></div></div></div></section><section class="panel"><div class="panel-head"><h2>Authentication security</h2></div><div class="panel-body"><div class="form-row"><label for="tdMfaPolicy">Multi-factor authentication requirement</label><select id="tdMfaPolicy"><option value="off" ${t.mfaPolicy==='off'?'selected':''}>Off</option><option value="admins" ${t.mfaPolicy==='admins'?'selected':''}>Required for administrators</option><option value="all_users" ${t.mfaPolicy==='all_users'?'selected':''}>Required for all users</option></select><div class="hint" style="margin-top:6px;line-height:1.45">MFA is enforced when users enter this tenant. TOTP authenticator apps are used. Once a person enrolls an authenticator, that factor remains attached to their SonoMarzi account, even if they also have access to another tenant that does not require enrollment.</div></div></div></section><section class="panel"><div class="panel-head"><h2>Licensed modules</h2></div><div class="panel-body module-select-grid">${MODULE_KEYS.map(k=>`<label class="module-choice"><input type="checkbox" data-tenant-module="${k}" ${t.enabledModules.includes(k)?'checked':''}><span><strong>${MODULE_LABELS[k]}</strong></span></label>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Agencies</h2></div><div class="panel-body">${t.agencies.map(a=>`<div class="agency-card"><div class="agency-card-head"><div><h3>${esc(a.name)}</h3><div class="agency-meta">${esc(a.abbreviation)} · ${esc(a.type)} · ${esc(a.ori||'No identifier')}</div><div style="margin-top:8px;font-size:12px;color:var(--text-dim)">Agency URL</div><div style="display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap"><input id="agencySubdomain-${esc(a.id)}" value="${esc(a.subdomain||'')}" placeholder="agencyname" style="max-width:180px"><span style="font-size:12px;color:var(--text-dim)">.sonomarzi.com</span><button class="btn btn-outline btn-sm" data-save-subdomain="${esc(a.id)}">Save URL</button>${a.subdomain?`<a class="btn btn-outline btn-sm" href="https://${esc(a.subdomain)}.sonomarzi.com" target="_blank" rel="noopener">Open</a>`:''}</div></div><span class="tenant-status ${esc(a.status)}">${esc(STATUS_LABELS[a.status]||a.status)}</span></div><div style="margin-top:10px"><button class="btn btn-outline btn-sm" data-insert-sample="${esc(a.id)}" title="Adds sample equipment, vehicles, civil papers, and training courses to this specific agency, with nothing assigned to any person. Only visible to Platform Admins.">Insert Sample Data</button></div></div>`).join('')}</div></section><section class="panel" id="mark43Panel"><div class="panel-head"><h2>Mark43 RMS Integration</h2><span class="hint" id="mark43StatusHint">Loading…</span></div><div class="panel-body" id="mark43PanelBody"><div style="text-align:center;color:var(--text-dim);padding:20px;font-size:12.5px;">Loading connection status…</div></div></section></div><aside><section class="panel"><div class="panel-head"><h2>Administrators & invitations</h2></div><div class="panel-body">${t.admins.map(a=>`<div class="support-session"><span><strong>${esc(a.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(a.email)}</small></span><span class="badge badge-available">Active</span></div>`).join('')}${t.invites.map(i=>`<div class="support-session"><span><strong>${esc(i.name)}</strong><small style="display:block;color:var(--text-dim)">${esc(i.email)}</small></span><span class="badge badge-maintenance">Pending</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h2>Regional workspaces</h2><button class="btn btn-outline btn-sm" id="createRegional">Create</button></div><div class="panel-body">${t.regionalWorkspaces.map(w=>`<div class="support-session"><span><strong>${esc(w.name)}</strong><small style="display:block;color:var(--text-dim)">${w.agencyIds.length} agencies · ${w.modules.length} modules</small></span><span class="badge badge-available">Explicit</span></div>`).join('')||'<p style="font-size:12px;color:var(--text-dim)">No cross-agency workspace has been authorized.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Support access</h2><button class="btn btn-outline btn-sm" id="grantSupport">Grant</button></div><div class="panel-body">${t.supportSessions.filter(x=>!x.revokedAt&&new Date(x.expiresAt)>new Date()).map(x=>`<div class="support-session"><span><strong>${esc(x.reason)}</strong><small style="display:block;color:var(--text-dim)">Expires ${esc(new Date(x.expiresAt).toLocaleString())}</small></span><button class="btn btn-outline btn-sm" data-revoke-support="${x.id}">Revoke</button></div>`).join('')||'<p style="font-size:12px;color:var(--text-dim)">No active support session.</p>'}</div></section><section class="panel"><div class="panel-head"><h2>Recent tenant activity</h2></div><div class="panel-body">${t.audit.slice(0,8).map(a=>`<div class="tenant-audit-row">${esc(a.action)}<small>${esc(new Date(a.at).toLocaleString())} · ${esc(a.actor)}</small></div>`).join('')||'<p>No activity yet.</p>'}</div></section><section class="danger-zone"><h3>Tenant status</h3><p style="font-size:12px">Suspension blocks ordinary agency access while retaining data.</p><button class="btn ${t.status==='suspended'?'btn-primary':'btn-danger'}" id="toggleTenantStatus">${t.status==='suspended'?'Reactivate tenant':t.status==='setup'?'Activate tenant':'Suspend tenant'}</button></section></aside></div>`;el.querySelector('#backTenants').onclick=showTenantManagement;el.querySelector('#addAgencyHere').onclick=()=>{wizard=defaultWizard('agency');wizard.tenantId=t.id;renderWizard()};el.querySelector('#saveTenant').onclick=()=>saveTenantDetail(t);el.querySelector('#exportTenant').onclick=()=>exportManifest(t);el.querySelector('#createRegional').onclick=()=>openRegional(t);el.querySelector('#grantSupport').onclick=()=>openSupport(t);el.querySelectorAll('[data-revoke-support]').forEach(b=>b.onclick=()=>revokeSupport(t,b.dataset.revokeSupport));el.querySelector('#toggleTenantStatus').onclick=()=>toggleStatus(t);el.querySelectorAll('[data-insert-sample]').forEach(b=>b.onclick=()=>insertSampleData(t.id,b.dataset.insertSample,t.enabledModules,b));el.querySelectorAll('[data-save-subdomain]').forEach(b=>b.onclick=()=>saveAgencySubdomain(t,b.dataset.saveSubdomain));loadMark43Panel(t)}
  function exportManifest(t){const manifest={exportedAt:now(),tenant:{id:t.id,slug:t.slug,name:t.name,timezone:t.timezone,plan:t.plan,status:t.status,enabledModules:t.enabledModules},agencies:t.agencies,regionalWorkspaces:t.regionalWorkspaces,activeSupportSessions:t.supportSessions.filter(x=>!x.revokedAt&&new Date(x.expiresAt)>new Date())};const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${t.slug}-tenant-manifest.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);audit(t,'Exported tenant configuration manifest')}
  function openRegional(t){if(t.agencies.length<2){toast('Add at least two agencies before creating a regional workspace.',true);return}const box=document.getElementById('modalBox');box.className='modal';box.innerHTML=`<div class="modal-head"><h3>Create regional workspace</h3><button class="modal-close" id="rwClose">×</button></div><div class="modal-body"><div class="form-row"><label for="rwName">Workspace name</label><input id="rwName"></div><div class="form-row"><label>Authorized agencies</label>${t.agencies.map(a=>`<label class="check-row"><input type="checkbox" data-rw-agency="${a.id}"> ${esc(a.name)}</label>`).join('')}</div><div class="form-row"><label>Authorized modules</label>${t.enabledModules.map(m=>`<label class="check-row"><input type="checkbox" data-rw-module="${m}"> ${esc(MODULE_LABELS[m])}</label>`).join('')}</div><div id="rwError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="rwCancel">Cancel</button><button class="btn btn-primary" id="rwCreate">Authorize workspace</button></div></div>`;SuiteUX.openModal();box.querySelector('#rwClose').onclick=box.querySelector('#rwCancel').onclick=e=>SuiteUX.closeModal(e);box.querySelector('#rwCreate').onclick=async()=>{const name=box.querySelector('#rwName').value.trim(),agencyIds=[...box.querySelectorAll('[data-rw-agency]:checked')].map(x=>x.dataset.rwAgency),modules=[...box.querySelectorAll('[data-rw-module]:checked')].map(x=>x.dataset.rwModule);if(!name||agencyIds.length<2||!modules.length){box.querySelector('#rwError').textContent='Enter a name, select at least two agencies, and select a module.';return}if(SuiteStore.mode()==='shared'){try{await platformApi('create_regional_workspace',{tenantId:t.id,name,agencyIds,modules})}catch(error){box.querySelector('#rwError').textContent=error.message;return}}enableRegionalWorkspace(t.id,name,agencyIds,modules);SuiteUX.closeModal();showTenantDetail(t.id);toast('Regional workspace authorized and audited.')}}
  function openSupport(t){const box=document.getElementById('modalBox');box.className='modal';box.innerHTML=`<div class="modal-head"><h3>Grant temporary support access</h3><button class="modal-close" id="saClose">×</button></div><div class="modal-body"><div class="callout callout-blue">Access is time-limited, scoped, and written to the tenant audit log.</div>${field('saUser','Support user UUID','')}${field('saReason','Business reason','')}<div class="form-row"><label for="saHours">Duration</label><select id="saHours"><option value="1">1 hour</option><option value="4">4 hours</option><option value="8">8 hours</option><option value="24">24 hours</option></select></div><div class="form-row"><label>Scope</label>${['configuration','audit','diagnostics'].map(x=>`<label class="check-row"><input type="checkbox" data-sa-scope="${x}"> ${x}</label>`).join('')}</div><div id="saError" class="field-error"></div><div class="modal-actions"><button class="btn btn-outline" id="saCancel">Cancel</button><button class="btn btn-primary" id="saGrant">Grant access</button></div></div>`;SuiteUX.openModal();box.querySelector('#saClose').onclick=box.querySelector('#saCancel').onclick=e=>SuiteUX.closeModal(e);box.querySelector('#saGrant').onclick=async()=>{const supportUserId=box.querySelector('#saUser').value.trim(),reason=box.querySelector('#saReason').value.trim(),hours=Number(box.querySelector('#saHours').value),scope=[...box.querySelectorAll('[data-sa-scope]:checked')].map(x=>x.dataset.saScope);if(!/^[0-9a-f-]{36}$/i.test(supportUserId)||reason.length<10||!scope.length){box.querySelector('#saError').textContent='Enter a valid support user UUID, a specific reason, and at least one scope.';return}let session={id:uuid('support'),supportUserId,reason,scope,expiresAt:new Date(Date.now()+hours*3600000).toISOString()};if(SuiteStore.mode()==='shared'){try{const data=await platformApi('grant_support',{tenantId:t.id,supportUserId,reason,hours,scope});session=data.supportSession}catch(error){box.querySelector('#saError').textContent=error.message;return}}t.supportSessions.push(session);audit(t,`Granted temporary support access: ${reason}`);SuiteUX.closeModal();showTenantDetail(t.id);toast('Temporary support access granted.')}}
  async function revokeSupport(t,id){if(SuiteStore.mode()==='shared'){try{await platformApi('revoke_support',{tenantId:t.id,sessionId:id})}catch(error){toast(error.message,true);return}}const x=t.supportSessions.find(x=>x.id===id);if(x)x.revokedAt=now();audit(t,'Revoked temporary support access');showTenantDetail(t.id)}
  async function saveTenantDetail(t){
    const name=document.getElementById('tdName').value.trim(),slug=document.getElementById('tdSlug').value.trim().toLowerCase(),timezone=document.getElementById('tdTimezone').value.trim(),plan=document.getElementById('tdPlan').value,mfaPolicy=document.getElementById('tdMfaPolicy')?.value||'off',modules=[...document.querySelectorAll('[data-tenant-module]:checked')].map(x=>x.dataset.tenantModule);
    if(!name||!slug||!timezone||!modules.length){toast('Tenant name, internal tenant key, time zone, and at least one module are required.',true);return}
    if(SuiteStore.mode()==='shared'){
      try{
        if(mfaPolicy!=='off') await identityPlatformApi('ensure_mfa_capability');
        await platformApi('update_tenant',{tenantId:t.id,tenant:{name,slug,timezone,plan},enabledModules:modules});
        if(mfaPolicy!==t.mfaPolicy) await platformApi('set_tenant_mfa_policy',{tenantId:t.id,mfaPolicy});
      }catch(error){toast(error.message,true);return}
    }
    t.name=name;t.slug=slug;t.timezone=timezone;t.plan=plan;t.enabledModules=modules;t.mfaPolicy=mfaPolicy;audit(t,`Updated tenant profile, modules, and MFA policy (${mfaPolicy})`);refresh();showTenantDetail(t.id);toast('Tenant settings saved.');
  }

  // ---- Mark43 RMS Integration panel ----
  // The connection is only ever real (not a demo toast) when running in shared mode against a
  // deployed tenant-admin Edge Function with the get/save/test/sync_mark43_connection actions
  // added -- see the code + SQL migration provided alongside this file. In local/demo mode this
  // renders as an explained, inert preview so the screen still looks and reads correctly.
  async function loadMark43Panel(t){
    const hint=document.getElementById('mark43StatusHint'),body=document.getElementById('mark43PanelBody');
    if(!hint||!body)return;
    hint.textContent='Connector not configured';
    renderMark43Panel(t,{enabled:false,tenantSubdomain:'',authMode:'basic',hasToken:false,lastSyncAt:null,lastSyncStatus:null,lastSyncMessage:'Mark43 outbound connectivity is not configured for this agency.'},true);
  }

  async function saveAgencySubdomain(t,agencyId){const a=t.agencies.find(x=>x.id===agencyId);if(!a)return;const input=document.getElementById(`agencySubdomain-${agencyId}`);const previousSubdomain=(a.subdomain||'').trim().toLowerCase();const subdomain=(input?.value||'').trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');if(!subdomain||!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)||['www','app','login','auth','api','admin','support','static','assets','mail','email'].includes(subdomain)){toast('Choose a valid, non-reserved agency URL using lowercase letters, numbers, and hyphens.',true);return}if(catalog.tenants.some(other=>other.agencies.some(x=>x.id!==agencyId&&(x.subdomain||'').toLowerCase()===subdomain))){toast('That agency URL is already in use.',true);return}try{if(SuiteStore.mode()==='shared')await platformApi('update_agency_subdomain',{tenantId:t.id,agencyId,subdomain});const token=sessionStorage.getItem('sonomarzi.aws.id_token');if(token)await registerAgencySubdomain({tenantId:t.id,agencyId,subdomain,previousSubdomain})}catch(error){toast(error.message,true);return}a.subdomain=subdomain;audit(t,`Updated ${a.name} agency URL to ${subdomain}.sonomarzi.com`);refresh();showTenantDetail(t.id);toast(`Agency URL saved: ${subdomain}.sonomarzi.com`) }

  function renderMark43Panel(t, conn, isPreview){
    const body = document.getElementById('mark43PanelBody');
    body.innerHTML = `
      ${isPreview ? `<div class="locked-note" style="margin-bottom:14px;">${ICONS.alert}<div>This panel only does something real when connected to a live agency workspace with the matching Edge Function actions deployed. Switch to a shared session to configure a real connection.</div></div>` : ''}
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:${conn.hasToken?'pointer':'not-allowed'};opacity:${conn.hasToken?'1':'0.5'};">
        <input type="checkbox" id="fMark43Enabled" style="width:auto;" ${conn.enabled?'checked':''} ${!conn.hasToken?'disabled':''}> Pull personnel from Mark43 automatically
      </label></div>
      <div class="form-row"><label>Mark43 tenant name <span style="font-weight:400;color:var(--text-dim);">(the subdomain in your Mark43 URL)</span></label>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="text" id="fMark43Tenant" value="${escapeHtml(conn.tenantSubdomain||'')}" placeholder="e.g. reno-nv-demo" style="flex:1;">
          <span style="color:var(--text-dim);font-size:12.5px;white-space:nowrap;">.mark43.com</span>
        </div>
      </div>
      <div class="form-row"><label>Auth style</label>
        <select id="fMark43AuthMode">
          <option value="basic" ${conn.authMode==='basic'?'selected':''}>HTTP Basic (token:x-api-token)</option>
          <option value="apikey" ${conn.authMode==='apikey'?'selected':''}>X-Api-Key header</option>
        </select>
      </div>
      <div class="form-row"><label>API token <span style="font-weight:400;color:var(--text-dim);">(from your Mark43 Technical Services Representative)</span></label>
        <input type="password" id="fMark43Token" value="" autocomplete="new-password" placeholder="${conn.hasToken ? 'Configured — leave blank to keep it' : 'Paste the API token'}">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        <button class="btn btn-primary btn-sm" id="btnSaveMark43">Save Connection</button>
        <button class="btn btn-outline btn-sm" id="btnTestMark43" ${conn.hasToken?'':'disabled'}>Test Connection</button>
        <button class="btn btn-outline btn-sm" id="btnSyncMark43" ${conn.enabled && conn.hasToken?'':'disabled'}>Sync Now</button>
      </div>
      <div id="mark43Result" style="font-size:12.5px;line-height:1.5;margin-top:10px;"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:12px;border-top:1px solid var(--border);padding-top:10px;">
        ${conn.lastSyncAt ? `Last sync ${escapeHtml(new Date(conn.lastSyncAt).toLocaleString())} \u2014 ${escapeHtml(conn.lastSyncStatus||'')}${conn.lastSyncMessage?': '+escapeHtml(conn.lastSyncMessage):''}` : 'Never synced yet.'}
        Switching this off stops any sync from running, on demand or scheduled, without deleting the saved connection.
      </div>
    `;
    document.getElementById('btnSaveMark43').onclick = ()=>saveMark43Connection(t);
    const testBtn = document.getElementById('btnTestMark43');
    if(testBtn) testBtn.onclick = ()=>testMark43Connection(t);
    const syncBtn = document.getElementById('btnSyncMark43');
    if(syncBtn) syncBtn.onclick = ()=>syncMark43Now(t);
    const enabledToggle = document.getElementById('fMark43Enabled');
    if(enabledToggle) enabledToggle.onchange = ()=>saveMark43Connection(t, {enabledOnly:true});
  }

  async function saveMark43Connection(t,opts){
    const resultBox=document.getElementById('mark43Result');
    if(resultBox) resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> Mark43 credentials are not stored in the browser or the tenant database.';
  }

  async function testMark43Connection(t){
    const resultBox=document.getElementById('mark43Result');if(resultBox)resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> Live outbound testing is intentionally disabled until the dedicated connector is deployed.';
  }

  async function syncMark43Now(t){
    const resultBox=document.getElementById('mark43Result');if(resultBox)resultBox.innerHTML='<span style="color:var(--gold);font-weight:700;">AWS connector pending.</span> No Supabase fallback is used.';
  }
  async function toggleStatus(t){const next=t.status==='suspended'||t.status==='setup'?'active':'suspended';if(next==='suspended'&&!confirm(`Suspend ${t.name}? Ordinary agency users will be blocked, but data will be retained.`))return;if(SuiteStore.mode()==='shared'){try{await platformApi('set_tenant_status',{tenantId:t.id,status:next})}catch(error){toast(error.message,true);return}}t.status=next;audit(t,`${next==='active'?'Reactivated':'Suspended'} tenant`);refresh();showTenantDetail(t.id)}
  function enableRegionalWorkspace(tenantId,name,agencyIds,modules){const t=tenant(tenantId);if(!t||!isPlatformAdmin())throw Error('Platform Admin required.');const ws={id:uuid('regional'),name,agencyIds:[...new Set(agencyIds)],modules:modules.filter(m=>t.enabledModules.includes(m)),status:'active',createdAt:now()};t.regionalWorkspaces.push(ws);audit(t,`Created regional workspace ${name}`);return ws}
  function seedForTests(data){catalog=data;current=data.current;normalize();save();refresh()}
  return {init,load,refresh,renderContext,renderBanner,showTenantManagement,showPlatformAdmins,showTenantDetail,startWizard,switchContext,snapshotCurrent,moduleEnabled,activeModules,isPlatformAdmin,isSystemAdmin,tenant,agency,contexts,enableRegionalWorkspace,seedForTests,workspaceKey,get catalog(){return catalog},get current(){return current}};
})();

// Expose a stable platform page helper without widening module permissions.
SuiteUX.showPlatformView=function(id,title,subtitle){if(!TenantPlatform.isPlatformAdmin())return null;const el=document.getElementById('view-'+id)||(()=>{const x=document.createElement('div');x.id='view-'+id;x.className='view';document.getElementById('content').append(x);return x})();document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el.classList.add('active');document.getElementById('page-title').textContent=title;document.getElementById('page-sub').textContent=subtitle;history.pushState({suite:id},'','#/'+id);return el};

const originalAccessibleModules=accessibleModules;
accessibleModules=function(){return originalAccessibleModules().filter(key=>TenantPlatform.moduleEnabled(key))};
const originalCan=can;
can=function(abilityId){if(abilityId.startsWith('module_')){const key={module_quartermaster:'qm',module_fleet:'fleet',module_personnel:'personnel',module_k9:'k9',module_drone:'drone',module_eod:'eod',module_subpoena:'subpoena',module_grants:'grants',module_civil:'civil'}[abilityId];if(key&&!TenantPlatform.moduleEnabled(key))return false}return originalCan(abilityId)};
const originalStartShell=startShell;
function addPlatformAdminButtons(){const p=document.getElementById('suiteProfile');if(!p)return;if(TenantPlatform.isPlatformAdmin()&&!p.querySelector('#btnTenantManagement'))p.append(Object.assign(document.createElement('button'),{id:'btnTenantManagement',className:'btn btn-outline',textContent:'Tenant Management',onclick:TenantPlatform.showTenantManagement}));if((TenantPlatform.isPlatformAdmin()||TenantPlatform.isSystemAdmin())&&SuiteStore.mode()==='shared'&&!p.querySelector('#btnUserAdministration'))p.append(Object.assign(document.createElement('button'),{id:'btnUserAdministration',className:'btn btn-outline',textContent:'User Administration',onclick:()=>TenantUserAdmin.show()}));}
startShell=function(){try{TenantPlatform.init();originalStartShell();TenantPlatform.refresh();}catch(e){console.error('startShell error (continuing so admin buttons still get added):',e);}addPlatformAdminButtons();setTimeout(addPlatformAdminButtons,600);setTimeout(addPlatformAdminButtons,1500);
  // Module visibility depends on three independent things, and when a module is missing it is
  // otherwise impossible to tell which one is at fault from the UI alone. Logging all three at
  // login turns "no modules are showing" from guesswork into a single readable answer.
  try{
    const assigned = STATE.currentRoleIds||[];
    const knownRoleIds = (STATE.roles||[]).map(r=>r.id);
    const missingRoles = assigned.filter(id=>!knownRoleIds.includes(id));
    debugLog('[access] signed in as:', CURRENT_USER_ID);
    debugLog('[access] roles assigned to this login:', assigned);
    debugLog('[access] roles that exist in this workspace:', knownRoleIds);
    if(missingRoles.length) console.warn('[access] PROBLEM: these assigned roles do not exist in this workspace, so they grant nothing:', missingRoles);
    debugLog('[access] modules licensed for this tenant:', TenantPlatform.activeModules());
    debugLog('[access] RAW tenant() lookup for this session:', TenantPlatform.tenant());
    debugLog('[access] current tenant/agency context:', TenantPlatform.current);
    debugLog('[access] full tenant catalog this session can see:', TenantPlatform.catalog);
    debugLog('[access] modules visible to you:', accessibleModules());
    const moduleAbilities = ['module_quartermaster','module_fleet','module_personnel','module_k9','module_drone','module_eod','module_subpoena','module_grants','module_civil'];
    debugLog('[access] per-module check (needs BOTH tenant-licensed AND granted-by-your-role):',
      Object.fromEntries(moduleAbilities.map(a=>{
        const key = a.replace('module_','').replace('quartermaster','qm');
        const grantedByRole = assigned.some(rid=>(STATE.roles.find(r=>r.id===rid)||{}).abilities?.[a]);
        return [a, {licensedForTenant: TenantPlatform.moduleEnabled(key), grantedByYourRole: grantedByRole}];
      }))
    );
  }catch(e){ console.error('[access] diagnostic failed:', e); }
};

const AUTH_LINK_TYPE=new URLSearchParams(location.hash.replace(/^#/,'')).get('type')||new URLSearchParams(location.search).get('type');

function openInvitationPassword(){
  if(window.SONOMARZI_AWS_DEV){
    toast('This invitation flow has moved to AWS Cognito. Sign in through Cognito to continue.',true);
    return;
  }
}


const TenantUserAdmin=(()=>{
  let selectedTenantId=null,loading=false;
  const escape=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function contexts(){const list=TenantPlatform.contexts();const seen=new Map();for(const item of list)if(item.tenant&&!seen.has(item.tenant.id))seen.set(item.tenant.id,item.tenant);return [...seen.values()]}
  function host(){let el=document.getElementById('view-user-administration');if(!el){el=document.createElement('div');el.id='view-user-administration';el.className='view';document.getElementById('content').append(el)}document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));el.classList.add('active');document.getElementById('page-title').textContent='User Administration';document.getElementById('page-sub').textContent='Invite users, review authentication status, resend invitations, and remove access';history.pushState({suite:'user-administration'},'','#/user-administration');return el}
  async function invoke(action,body={}){
    const identityActions=new Set([
      'invite_user',
      'update_user_profile',
      'reset_password',
      'reset_all_passwords',
      'delete_user',
      'resend_invitation',
      'send_access_email',
      'ensure_custom_auth'
    ]);
    const path=identityActions.has(action)?'/identity-admin':'/tenant-admin';
    const result=await SuiteStore.api(path,{
      method:'POST',
      body:JSON.stringify({action,...body})
    });
    if(result?.success===false)throw Error(result.error||'User administration request failed.');
    return result?.data;
  }
  async function show(tenantId){
    if(SuiteStore.mode()!=='shared'||(!TenantPlatform.isPlatformAdmin()&&!TenantPlatform.isSystemAdmin())){toast('System Admin or Platform Admin access is required.',true);return}
    const tenants=contexts();selectedTenantId=tenantId||selectedTenantId||TenantPlatform.current?.tenantId||tenants[0]?.id;
    const el=host();el.innerHTML='<section class="panel"><div class="panel-body"><div class="empty-state"><div class="msg">Loading user access…</div><div class="sub">Confirming tenant memberships and authentication status.</div></div></div></section>';
    if(!selectedTenantId){el.innerHTML='<div class="empty-state"><div class="msg">No authorized tenant</div></div>';return}
    if(loading)return;loading=true;
    try{const data=await invoke('list_users',{tenantId:selectedTenantId});render(el,tenants,data.users||[],data.invitations||[])}catch(error){el.innerHTML=`<div class="callout" style="border-color:var(--red)"><strong>User administration could not load.</strong><div style="margin-top:6px">${escape(error.message)}</div><button id="retryUsers" class="btn btn-outline" style="margin-top:12px">Retry</button></div>`;el.querySelector('#retryUsers').onclick=()=>show(selectedTenantId)}finally{loading=false}
  }
  function render(el,tenants,users,invitations){
    const tenant=tenants.find(t=>t.id===selectedTenantId),agencies=tenant?.agencies||[];
    const pendingByUser=new Map(invitations.filter(i=>i.auth_user_id).map(i=>[i.auth_user_id,i]));
    const rows=users.map(user=>{const agency=agencies.find(a=>a.id===user.agency_id),pending=pendingByUser.get(user.user_id),status=user.confirmedAt?'Active':'Invitation pending',roleNames=(user.role_ids||[]).map(id=>STATE.roles.find(r=>r.id===id)?.name||id).join(', ');return `<tr><td><strong>${escape(user.name)}</strong><small style="display:block;color:var(--text-dim)">${escape(user.email)}</small></td><td>${escape(agency?.name||user.agency_id)}</td><td>${escape(roleNames)}</td><td><span class="badge ${user.confirmedAt?'badge-available':'badge-maintenance'}">${status}</span>${!user.confirmedAt&&user.mustChangePassword?'<span class="badge badge-maintenance" style="margin-left:4px">Activation required</span>':''}<small style="display:block;color:var(--text-dim);margin-top:4px">${user.lastSignInAt?'Last sign-in '+SuiteUX.displayInstant(user.lastSignInAt):'No sign-in recorded'}</small></td><td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn btn-outline btn-sm" data-edit-user="${escape(user.user_id)}">Edit</button><button class="btn btn-outline btn-sm" data-send-access="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Send access email</button>${!user.confirmedAt&&user.mustChangePassword?`<button class="btn btn-outline btn-sm" data-resend-user="${escape(user.user_id)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}">Resend invite</button>`:''}<button class="btn btn-outline btn-sm" data-reset-password="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Reset password</button><button class="btn btn-danger btn-sm" data-delete-user="${escape(user.user_id)}" data-user-name="${escape(user.name)}" data-email="${escape(user.email)}" data-agency="${escape(user.agency_id)}" ${user.isPlatformAdmin?'disabled title="Platform Admins require the protected platform process"':''}>Delete user</button></div></td></tr>`}).join('');
    el.innerHTML=`<div class="tenant-toolbar"><div><div class="work-eyebrow">Authenticated access control</div><h2 style="margin:0;color:var(--heading)">${escape(tenant?.name||'Tenant users')}</h2></div><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">${tenants.length>1?`<div class="form-row" style="margin:0"><label for="userTenantSelect">Tenant</label><select id="userTenantSelect">${tenants.map(t=>`<option value="${escape(t.id)}" ${t.id===selectedTenantId?'selected':''}>${escape(t.name)}</option>`).join('')}</select></div>`:''}<button class="btn btn-outline" id="refreshUsers">Refresh</button><button class="btn btn-danger" id="resetAllPasswords">Send password resets…</button><button class="btn btn-primary" id="inviteUser">Invite user</button></div></div><div class="callout callout-blue" style="margin-bottom:16px"><strong>Secure email invitation onboarding</strong><div style="margin-top:4px">New users receive a single-use activation link for their agency. No temporary password is sent by email or shown to an administrator. The user creates their own permanent password before first sign-in. Existing SonoMarzi users keep their current password when another agency is added.</div></div><section class="panel"><div class="panel-head"><h2>Users and invitations</h2><span class="hint">${users.length} agency membership${users.length===1?'':'s'}</span></div><div class="panel-body" style="padding:0;overflow:auto"><table><thead><tr><th>User</th><th>Agency</th><th>Roles</th><th>Authentication</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows||'<tr><td colspan="5"><div class="empty-state"><div class="msg">No users have been added</div><div class="sub">Create the first agency user to begin.</div></div></td></tr>'}</tbody></table></div></section>`;
    el.querySelector('#userTenantSelect')?.addEventListener('change',event=>{selectedTenantId=event.target.value;show(selectedTenantId)});
    el.querySelector('#refreshUsers').onclick=()=>show(selectedTenantId);
    el.querySelector('#inviteUser').onclick=()=>openInvite(tenant,agencies);
    el.querySelector('#resetAllPasswords').onclick=()=>openResetAllPasswords();
    el.querySelectorAll('[data-edit-user]').forEach(button=>button.onclick=()=>{const user=users.find(u=>u.user_id===button.dataset.editUser);if(user)openEditUser(user,tenant,agencies);});
    el.querySelectorAll('[data-send-access]').forEach(button=>button.onclick=()=>sendAccessEmail(button.dataset.sendAccess,button.dataset.userName,button.dataset.email,button.dataset.agency));
    el.querySelectorAll('[data-resend-user]').forEach(button=>button.onclick=()=>resend(button.dataset.resendUser,button.dataset.email,button.dataset.agency));
    el.querySelectorAll('[data-reset-password]').forEach(button=>button.onclick=()=>resetPassword(button.dataset.resetPassword,button.dataset.userName,button.dataset.agency));
    el.querySelectorAll('[data-delete-user]').forEach(button=>button.onclick=()=>remove(button.dataset.deleteUser,button.dataset.userName,button.dataset.email,button.dataset.agency));
  }
  function openInvite(tenant,agencies){
    const roles=STATE.roles.filter(role=>role.id!=='role_platform_admin'&&!role.hidden),defaultRole=roles.find(role=>role.id==='role_officer')||roles.at(-1);
    const box=document.getElementById('modalBox');box.className='modal modal-xl';box.innerHTML=`<div class="modal-head"><div><h3>Invite user</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="inviteClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label for="newUserFirstName">First name</label><input id="newUserFirstName" autocomplete="given-name"></div><div class="form-row"><label for="newUserLastName">Last name</label><input id="newUserLastName" autocomplete="family-name"></div></div><div class="form-row"><label for="newUserEmail">Email address</label><input id="newUserEmail" type="email" autocomplete="email"></div><div class="form-row"><label for="newUserAgency">Agency</label><select id="newUserAgency">${agencies.filter(a=>a.status!=='suspended').map(a=>`<option value="${escape(a.id)}">${escape(a.name)}</option>`).join('')}</select></div><div class="form-row"><label for="newUserBadge">Badge or employee number</label><input id="newUserBadge"></div><div class="form-row"><label for="newUserUnit">Unit or assignment</label><input id="newUserUnit"></div><div class="form-row full"><label>Authorized roles</label><div class="module-select-grid">${roles.map(role=>`<label class="module-choice"><input type="checkbox" data-new-user-role="${escape(role.id)}" ${role.id===defaultRole?.id?'checked':''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description||'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px"><strong>A secure activation email will be sent automatically.</strong> It contains a single-use link to this agency's SonoMarzi site. The user creates their own password. No password is emailed or shown to you.</div><div id="newUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="inviteCancel">Cancel</button><button class="btn btn-primary" id="sendInvite">Send invitation</button></div>`;
    SuiteUX.openModal();box.querySelector('#inviteClose').onclick=box.querySelector('#inviteCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#sendInvite').onclick=async()=>{const firstName=box.querySelector('#newUserFirstName').value.trim(),lastName=box.querySelector('#newUserLastName').value.trim(),name=`${firstName} ${lastName}`.trim(),email=box.querySelector('#newUserEmail').value.trim().toLowerCase(),agencyId=box.querySelector('#newUserAgency').value,badge=box.querySelector('#newUserBadge').value.trim(),unit=box.querySelector('#newUserUnit').value.trim(),roleIds=[...box.querySelectorAll('[data-new-user-role]:checked')].map(input=>input.dataset.newUserRole),error=box.querySelector('#newUserError'),button=box.querySelector('#sendInvite');if(!firstName||!lastName||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!agencyId||!roleIds.length){error.textContent='Enter a first and last name, valid email, agency, and at least one role.';return}button.disabled=true;button.textContent='Sending…';try{const inviteResult=await invoke('invite_user',{tenantId:selectedTenantId,agencyId,name,email,badge,unit,roleIds});
      const ctx = SuiteStore.remoteContext();
      if(ctx.tenantId===selectedTenantId && ctx.agencyId===agencyId){
        try{
          let person = STATE.personnel.find(p=>p.email && p.email.toLowerCase()===email);
          if(!person){
            person={
              id:inviteResult.personId,
              name,
              badge,
              unit,
              roleIds:roleIds.slice(),
              email,
              qualifications:[]
            };
            STATE.personnel.push(person);
          }
          if(!STATE.pm) STATE.pm = {};
          if(!STATE.pm.records) STATE.pm.records = [];
          if(!STATE.pm.records.some(r=>r.personId===person.id)){
            STATE.pm.records.push({
              personId: person.id,
              agency: (STATE.pm.refData && STATE.pm.refData.agencies) ? STATE.pm.refData.agencies[0] : '',
              employeeId:'', unitId:'', driversLicense:{number:'',licenseClass:'',state:'',expiration:''},
              hireDate:'', terminationDate:null, promotionHistory:[], bloodType:'Unknown', phones:[],
              address:{street:'',city:'',state:'',zip:''},
              sex:'Undisclosed', race:'Undisclosed', maritalStatus:'Undisclosed', rank:'',
              badgeNumber: person.badge||'', employmentStatus:'Active', specialSkills:[], assignment:'',
              medical:{bloodType:'Unknown',vaccinations:[],medicalNotes:'',injuryHistory:[],exposureHistory:[]},
              lodd:{wishes:'',emergencyContactName:'',emergencyContactPhone:'',emergencyContactRelation:'',notes:''},
              supervisorIds:[], education:[], swornDate:'', photoDataUrl:null, documents:[], fieldHistory:[],
            });
          }
          persist();
          const saved=await SuiteStore.flush();
          if(!saved)throw Error('Account created, but the local personnel record could not be saved.');
        }catch(reloadErr){ console.error('Post-create personnel save failed:', reloadErr); }
      }
      if(inviteResult?.emailSent){
        toast(inviteResult?.needsActivation?`Secure activation email sent to ${email}.`:`Agency access email sent to ${email}.`);
      } else {
        toast(`The account/access was created, but email delivery failed: ${inviteResult?.emailError||'unknown delivery error'}. Use Resend invite after email delivery is available.`,true);
      }
      SuiteUX.clearDirty();SuiteUX.closeModal();await show(selectedTenantId)}catch(inviteError){error.textContent=inviteError.message;button.disabled=false;button.textContent='Send invitation'}};
  }
  function openEditUser(user,tenant,agencies){
    // The invite/auth side (name shown here, agency, login status) lives entirely server-side --
    // this app has no direct write access to it beyond the specific dedicated actions the
    // tenant-admin function already exposes (update_roles being the one relevant here). Badge and
    // Unit are purely local roster fields, so those are read from and written straight back to
    // this tenant's own Personnel data, same as everywhere else in the app.
    let localPerson = STATE.personnel.find(p=>
      (p.email && p.email.toLowerCase()===user.email.toLowerCase()) ||
      p.name.trim().toLowerCase()===user.name.trim().toLowerCase()
    );
    if(!localPerson){
      // Someone was invited before this reconciliation existed, or their local record was
      // otherwise never created -- don't block editing on that; create it now instead.
      const created = createPersonAndRecord({name:user.name, badge:'', email:user.email, unit:'', roleIds:user.role_ids||[]});
      localPerson = created.person;
      persist();
    }
    const roles=STATE.roles.filter(role=>role.id!=='role_platform_admin'&&!role.hidden);
    const box=document.getElementById('modalBox');box.className='modal modal-xl';
    box.innerHTML=`<div class="modal-head"><div><h3>Edit ${escape(user.name)}</h3><div style="font-size:12px;color:var(--text-dim)">${escape(tenant.name)}</div></div><button class="modal-close" id="editUserClose">×</button></div><div class="modal-body"><div class="onboarding-fields"><div class="form-2col"><div class="form-row"><label>Name</label><input id="editUserName" value="${escape(user.name)}"></div><div class="form-row"><label>Email address</label><input id="editUserEmail" type="email" value="${escape(user.email)}"></div></div><div class="form-2col"><div class="form-row"><label>Badge or employee number</label><input id="editUserBadge" value="${escape(localPerson.badge||'')}"></div><div class="form-row"><label>Unit or assignment</label><input id="editUserUnit" value="${escape(localPerson.unit||'')}"></div></div><div class="form-row full"><label>Authorized roles (permissions)</label><div class="module-select-grid">${roles.map(role=>`<label class="module-choice"><input type="checkbox" data-edit-user-role="${escape(role.id)}" ${(user.role_ids||[]).includes(role.id)?'checked':''}><span><strong>${escape(role.name)}</strong><span>${escape(role.description||'Agency role')}</span></span></label>`).join('')}</div></div></div><div class="callout callout-blue" style="margin-top:16px">Agency is fixed once a user is added -- remove access and re-invite to move someone to a different agency.</div><div id="editUserError" class="field-error" role="alert" style="margin-top:12px"></div></div><div class="modal-foot"><button class="btn btn-outline" id="editUserCancel">Cancel</button><button class="btn btn-primary" id="saveEditUser">Save changes</button></div>`;
    SuiteUX.openModal();box.querySelector('#editUserClose').onclick=box.querySelector('#editUserCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#saveEditUser').onclick=async()=>{
      const roleIds=[...box.querySelectorAll('[data-edit-user-role]:checked')].map(input=>input.dataset.editUserRole);
      const newName=box.querySelector('#editUserName').value.trim();
      const newEmail=box.querySelector('#editUserEmail').value.trim().toLowerCase();
      const error=box.querySelector('#editUserError'),button=box.querySelector('#saveEditUser');
      if(!roleIds.length){error.textContent='At least one role is required.';return}
      if(!newName){error.textContent='Enter a name.';return}
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)){error.textContent='Enter a valid email address.';return}
      button.disabled=true;button.textContent='Saving…';
      try{
        // Badge and unit are local-only fields -- neither update_user_profile nor update_roles
        // ever touches them server-side -- so they're safe to save through the normal versioned
        // path. Flushing this first and waiting for it to land means this write is settled before
        // the edge function calls below, instead of racing whatever comes after them.
        const newBadge=box.querySelector('#editUserBadge').value.trim();
        const newUnit=box.querySelector('#editUserUnit').value.trim();
        localPerson.badge=newBadge;
        localPerson.unit=newUnit;
        const record=STATE.pm.records&&STATE.pm.records.find(r=>r.personId===localPerson.id);
        if(record) record.badgeNumber=newBadge;
        persist();
        await SuiteStore.flush();

        const profileChanged=(newName!==user.name)||(newEmail!==user.email.toLowerCase());
        if(profileChanged) await invoke('update_user_profile',{tenantId:selectedTenantId,userId:user.user_id,name:newName,email:newEmail});
        await invoke('update_roles',{tenantId:selectedTenantId,agencyId:user.agency_id,userId:user.user_id,personId:user.person_id||localPerson.id,roleIds});

        localPerson.name=newName;
        localPerson.email=newEmail;
        localPerson.roleIds=roleIds.slice();
        persist();
        if(!await SuiteStore.flush())throw Error('Authentication settings changed, but the personnel record could not be saved.');

        logAuditEntry('Shared',`Updated permissions and roster details for "${newName}" (roles: ${roleIds.map(id=>STATE.roles.find(r=>r.id===id)?.name||id).join(', ')}).`,'personnel');
        if(localPerson.id===CURRENT_USER_ID){HOME_ROLE_IDS=roleIds.slice();STATE.currentRoleIds=roleIds.slice();renderRoleSwitcher();}
        SuiteUX.clearDirty();SuiteUX.closeModal();toast('User updated.');await show(selectedTenantId);
      }catch(saveError){error.textContent=saveError.message;button.disabled=false;button.textContent='Save changes'}
    };
  }
  async function sendAccessEmail(userId,name,email,agencyId){if(!confirm(`Send ${name||email} an account access email for this agency?`))return;try{const result=await invoke('send_access_email',{tenantId:selectedTenantId,agencyId,userId});toast(result?.needsActivation?`Secure activation email sent to ${result.email}.`:`Access email sent to ${result.email}.`);await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  async function resend(userId,email,agencyId){if(!confirm(`Send a new secure invitation email to ${email}?`))return;try{const result=await invoke('resend_invitation',{tenantId:selectedTenantId,agencyId,userId});if(result?.emailSent)toast(`Secure invitation email sent to ${email}.`);else toast(`The invitation was renewed, but email delivery failed: ${result?.emailError||'unknown delivery error'}`,true);await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  async function resetPassword(userId,name,agencyId){
    if(!confirm(`Send ${name} a secure password-reset email?\n\nNo password will be displayed or sent to you.`))return;
    try{
      const result=await invoke('reset_password',{tenantId:selectedTenantId,agencyId,userId});
      toast(`Password-reset instructions were sent to ${result.email}.`);
    }catch(error){toast(error.message,true)}
  }

  function openResetAllPasswords(){
    const box=document.getElementById('modalBox');box.className='modal';
    box.innerHTML=`<div class="modal-head"><h3>Send Password Resets</h3><button class="modal-close" id="resetAllClose">×</button></div>
      <div class="modal-body">
        <div class="callout" style="border-color:var(--red);margin-bottom:14px;"><strong>This sends a secure Cognito password-reset message to every active account in this tenant</strong>, except the emails listed below. No passwords are displayed to administrators. Each person completes their own reset through Cognito.</div>
        <div class="form-row"><label for="resetAllExclude">Emails to leave unchanged (one per line)</label><textarea id="resetAllExclude" rows="5" placeholder="someone@example.com">fm1476@gmail.com
fred@sonomarzi.com
fm1476+john@gmail.com</textarea></div>
        <p id="resetAllError" class="field-error" role="alert"></p>
      </div>
      <div class="modal-foot"><button class="btn btn-outline" id="resetAllCancel">Cancel</button><button class="btn btn-danger" id="resetAllConfirm">Send Password Resets</button></div>`;
    SuiteUX.openModal();
    box.querySelector('#resetAllClose').onclick=box.querySelector('#resetAllCancel').onclick=event=>SuiteUX.closeModal(event);
    box.querySelector('#resetAllConfirm').onclick=async()=>{
      const excludeEmails=box.querySelector('#resetAllExclude').value.split('\n').map(s=>s.trim().toLowerCase()).filter(Boolean);
      const errorEl=box.querySelector('#resetAllError'),button=box.querySelector('#resetAllConfirm');
      if(!confirm(`Final confirmation: send password-reset messages to every account in this tenant except ${excludeEmails.length} excluded email(s)?`))return;
      button.disabled=true;button.textContent='Sending…';
      try{
        const result=await invoke('reset_all_passwords',{tenantId:selectedTenantId,confirm:true,excludeEmails});
        SuiteUX.closeModal();
        alert(`Done.\n\nReset emails sent: ${result.resetCount}\nSkipped (excluded): ${result.skipped.join(', ')||'none'}\n${result.failed.length?`Failed: ${result.failed.join(', ')}`:''}\n\nNo passwords were shown to an administrator.`);
        await show(selectedTenantId);
      }catch(error){errorEl.textContent=error.message;button.disabled=false;button.textContent='Send Password Resets'}
    };
  }
  async function remove(userId,name,email,agencyId){const warning=`Delete ${name} (${email}) from this agency?\n\nThe login and tenant access will be removed. Operational records, historical assignments, and audit history will be preserved. This cannot be undone.`;if(!confirm(warning))return;try{const result=await invoke('delete_user',{tenantId:selectedTenantId,agencyId,userId});toast(result.authDeleted?'User access and authentication account deleted.':'Agency access deleted. The authentication account remains because it is used by another tenant.');await show(selectedTenantId)}catch(error){toast(error.message,true)}}
  return {show};
})();

// ---------------------------------------------------------------------------------------
// Idle-session lock. CJIS Security Policy requires a session lock (up to and including a
// full sign-out) after a defined period of inactivity, and nothing in this app previously
// enforced one -- a signed-in device left unattended stayed signed in indefinitely. This
// watches for real user activity (mouse, keyboard, touch, scroll) and, once the account has
// been idle past the warning threshold, shows a dismissible countdown; if nobody responds
// before the full timeout, it calls the app's own logout() so the session is fully cleared,
// not just visually hidden. Only acts once the app is actually authenticated, so it's a
// no-op on the login screen or in an unauthenticated tab.
// ---------------------------------------------------------------------------------------
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // full sign-out after this long with no activity
const IDLE_WARNING_MS = 60 * 1000;        // show the countdown this long before that happens
let idleLastActivity = Date.now();
let idleWarningShown = false;

function idleOverlayEl(){
  let el = document.getElementById('idleLockOverlay');
  if(!el){
    el = document.createElement('div');
    el.id = 'idleLockOverlay';
    el.setAttribute('role','alertdialog');
    el.setAttribute('aria-modal','true');
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(6,15,29,.72);';
    el.innerHTML = `
      <div style="background:#1E1E22;color:#D6D6D9;border-radius:12px;padding:28px 30px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:inherit;">
        <h2 style="margin:0 0 10px;font-size:17px;color:#ECECEE;">Still there?</h2>
        <p style="margin:0 0 18px;font-size:13px;line-height:1.5;">For security, this session will sign out automatically after a period of inactivity.
        You'll be signed out in <span id="idleCountdown" style="font-weight:700;">60</span> seconds.</p>
        <button type="button" id="idleStayBtn" style="width:100%;min-height:40px;border:0;border-radius:6px;background:#134DD1;color:#fff;font-weight:700;font-size:13px;cursor:pointer;">Stay signed in</button>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('idleStayBtn').addEventListener('click', ()=>{ idleRegisterActivity(); });
  }
  return el;
}

function idleRegisterActivity(){
  idleLastActivity = Date.now();
  if(idleWarningShown){
    idleWarningShown = false;
    const overlay = document.getElementById('idleLockOverlay');
    if(overlay) overlay.style.display = 'none';
  }
}

['mousemove','mousedown','keydown','touchstart','scroll','wheel'].forEach(evt=>{
  window.addEventListener(evt, idleRegisterActivity, {passive:true, capture:true});
});

setInterval(()=>{
  const authed = document.getElementById('app')?.classList.contains('authenticated');
  if(!authed){ idleWarningShown = false; const ov = document.getElementById('idleLockOverlay'); if(ov) ov.style.display='none'; return; }
  const idleFor = Date.now() - idleLastActivity;
  if(idleFor >= IDLE_TIMEOUT_MS){
    idleWarningShown = false;
    const ov = document.getElementById('idleLockOverlay'); if(ov) ov.style.display = 'none';
    logout().then(()=>{ try{ toast('You were signed out after a period of inactivity.'); }catch(e){} });
    return;
  }
  if(idleFor >= IDLE_TIMEOUT_MS - IDLE_WARNING_MS){
    idleWarningShown = true;
    const overlay = idleOverlayEl();
    overlay.style.display = 'flex';
    const remaining = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - idleFor)/1000));
    const span = document.getElementById('idleCountdown');
    if(span) span.textContent = String(remaining);
  }
}, 1000);


const SonoMarziSecurity=(()=>{
  const apiBase='https://7debzkoq7k.execute-api.us-east-2.amazonaws.com',accessTokenKey='sonomarzi.aws.access_token',idTokenKey='sonomarzi.aws.id_token',cognitoEndpoint='https://cognito-idp.us-east-2.amazonaws.com/';
  function activationParam(){return new URLSearchParams(location.search).get('activation')||'';}
  function cleanActivationUrl(){const u=new URL(location.href);u.searchParams.delete('activation');history.replaceState({},document.title,u.pathname+(u.search?u.search:'')+u.hash);}
  async function jsonFetch(url,options={}){const r=await fetch(url,options),text=await r.text();let b={};try{b=text?JSON.parse(text):{}}catch{b={raw:text}}if(!r.ok||b?.success===false)throw Error(b?.error||b?.message||`Request failed (${r.status}).`);return b?.data??b;}
  async function showActivation(){
    const token=activationParam();if(!token)return false;
    document.getElementById('loginLoading').style.display='none';document.getElementById('loginFormFields').style.display='none';
    const card=document.querySelector('#loginScreen .login-card')||document.getElementById('loginScreen');let host=document.getElementById('secureActivationPanel');if(host)host.remove();host=document.createElement('div');host.id='secureActivationPanel';host.style.marginTop='18px';
    host.innerHTML=`<div style="text-align:left"><h3 style="margin:0 0 8px;color:var(--heading)">Activate your SonoMarzi account</h3><p style="font-size:13px;color:var(--text-dim);line-height:1.5">Create your own password to activate this account. Your invitation link is single-use. No password was sent by email or provided to your administrator.</p><div class="form-row"><label for="activatePassword">New password</label><input id="activatePassword" type="password" autocomplete="new-password" minlength="8"></div><div class="form-row"><label for="activatePassword2">Confirm password</label><input id="activatePassword2" type="password" autocomplete="new-password" minlength="8"></div><div id="activateError" class="field-error" role="alert"></div><button id="activateSubmit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px">Activate account</button></div>`;
    card.append(host);document.getElementById('activatePassword').focus();document.getElementById('activateSubmit').onclick=async()=>{const p=document.getElementById('activatePassword').value,p2=document.getElementById('activatePassword2').value,err=document.getElementById('activateError'),btn=document.getElementById('activateSubmit');err.textContent='';if(p.length<8){err.textContent='Use at least 8 characters.';return}if(!/[A-Z]/.test(p)){err.textContent='Include at least one uppercase letter.';return}if(!/[a-z]/.test(p)){err.textContent='Include at least one lowercase letter.';return}if(!/[0-9]/.test(p)){err.textContent='Include at least one number.';return}if(!/[^A-Za-z0-9]/.test(p)){err.textContent='Include at least one special character.';return}if(p!==p2){err.textContent='The passwords do not match.';return}btn.disabled=true;btn.textContent='Activating…';try{await jsonFetch(`${apiBase}/activation`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:p})});cleanActivationUrl();host.innerHTML=`<div class="callout callout-blue"><strong>Account activated.</strong><div style="margin-top:6px">Your password is set. You can now sign in to this agency.</div></div><button id="activateSignIn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:12px">Sign in securely</button>`;document.getElementById('activateSignIn').onclick=()=>window.SonoMarziAwsAuth?.startLogin();}catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent='Activate account'}};return true;
  }
  async function cognito(action,payload){const r=await fetch(cognitoEndpoint,{method:'POST',headers:{'content-type':'application/x-amz-json-1.1','x-amz-target':`AWSCognitoIdentityProviderService.${action}`},body:JSON.stringify(payload)});const text=await r.text();let b={};try{b=text?JSON.parse(text):{}}catch{}if(!r.ok)throw Error(b?.message||b?.Message||`Cognito ${action} failed (${r.status}).`);return b;}
  function decodeJwt(token){try{const part=(token||'').split('.')[1]||'',json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));return JSON.parse(json)}catch{return {}}}
  function jwtEmail(){return decodeJwt(sessionStorage.getItem(idTokenKey)||'').email||'SonoMarzi user'}
  function hasUserAdminScope(token){const scope=String(decodeJwt(token).scope||'');return scope.split(/\s+/).includes('aws.cognito.signin.user.admin')}
  function policyApplies(policy){if(policy==='all_users')return true;if(policy==='admins')return (HOME_ROLE_IDS||[]).some(r=>['role_admin','role_platform_admin'].includes(r));return false;}
  async function enforceMfa(){
    const policy=window.SonoMarziCurrentTenantSecurity?.mfaPolicy||'off';if(!policyApplies(policy))return true;const accessToken=sessionStorage.getItem(accessTokenKey);if(!accessToken||!hasUserAdminScope(accessToken)){alert('This agency requires multi-factor authentication. SonoMarzi will securely sign you in again once to enable authenticator setup.');try{sessionStorage.removeItem(idTokenKey);sessionStorage.removeItem(accessTokenKey);}catch{}window.SonoMarziAwsAuth?.startLogin(true);return false;}
    const me=await cognito('GetUser',{AccessToken:accessToken});if((me.UserMFASettingList||[]).includes('SOFTWARE_TOKEN_MFA'))return true;const assoc=await cognito('AssociateSoftwareToken',{AccessToken:accessToken}),secret=assoc.SecretCode;if(!secret)throw Error('Cognito did not return an authenticator secret.');
    return await new Promise(resolve=>{const overlay=document.createElement('div');overlay.id='tenantMfaOverlay';overlay.style.cssText='position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;background:rgba(6,15,29,.88);padding:20px';overlay.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:460px;width:100%;padding:28px"><h3 style="margin:0 0 8px;color:var(--heading)">Set up multi-factor authentication</h3><p style="font-size:13px;line-height:1.5;color:var(--text-dim)">${escapeHtml(window.SonoMarziCurrentTenantSecurity?.tenantName||'This agency')} requires an authenticator app for this account. Scan the QR code with Microsoft Authenticator, Google Authenticator, 1Password, Authy, or another TOTP app.</p><div id="tenantMfaQr" style="display:flex;justify-content:center;margin:18px 0"></div><details style="font-size:12px;color:var(--text-dim);margin-bottom:14px"><summary>Can't scan the QR code?</summary><div style="margin-top:8px;word-break:break-all">Setup key: <strong>${escapeHtml(secret)}</strong></div></details><div class="form-row"><label for="tenantMfaCode">6-digit code</label><input id="tenantMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*"></div><div id="tenantMfaError" class="field-error"></div><button id="tenantMfaVerify" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px">Verify & enable MFA</button><button id="tenantMfaSignOut" class="btn btn-outline" style="width:100%;justify-content:center;margin-top:8px">Sign out</button></div>`;document.body.append(overlay);const otp=`otpauth://totp/${encodeURIComponent('SonoMarzi:'+jwtEmail())}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent('SonoMarzi')}`;try{new QRCode(document.getElementById('tenantMfaQr'),{text:otp,width:180,height:180});}catch{}document.getElementById('tenantMfaSignOut').onclick=()=>window.SonoMarziAwsAuth?.logout();document.getElementById('tenantMfaVerify').onclick=async()=>{const code=document.getElementById('tenantMfaCode').value.trim(),err=document.getElementById('tenantMfaError'),btn=document.getElementById('tenantMfaVerify');if(!/^\d{6}$/.test(code)){err.textContent='Enter the 6-digit code from your authenticator app.';return}btn.disabled=true;btn.textContent='Verifying…';try{const verify=await cognito('VerifySoftwareToken',{AccessToken:accessToken,UserCode:code,FriendlyDeviceName:'SonoMarzi'});if(verify.Status!=='SUCCESS')throw Error('The authenticator code could not be verified.');await cognito('SetUserMFAPreference',{AccessToken:accessToken,SoftwareTokenMfaSettings:{Enabled:true,PreferredMfa:true}});overlay.remove();resolve(true)}catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent='Verify & enable MFA'}};});
  }
  return {showActivation,enforceMfa};
})();

(async function init(){
  SuiteUX.init();
  if(await SonoMarziSecurity.showActivation()) return;
  enhanceAllSelects(document); // catch anything already in the DOM before the observer starts watching
  loadTheme(); // defaults to dark (night mode); restores a saved preference if one exists
  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);
  loadTextZoom(); // defaults to 115%; restores a saved (device or, once signed in, account) preference if one exists
  // Mobile sidebar drawer: harmless no-op on desktop since the CSS transform/position rules
  // that make this visible are scoped to the narrow-viewport media query.
  function toggleSidebar(forceOpen){
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const open = forceOpen !== undefined ? forceOpen : !sidebar.classList.contains('sidebar-open');
    sidebar.classList.toggle('sidebar-open', open);
    backdrop.classList.toggle('open', open);
  }
  document.getElementById('btnSidebarToggle').addEventListener('click', ()=>toggleSidebar());
  document.getElementById('sidebarBackdrop').addEventListener('click', ()=>toggleSidebar(false));
  document.getElementById('sidebar').addEventListener('click', (e)=>{
    if(e.target.closest('.navitem') || e.target.closest('#btnSwitchModule')) toggleSidebar(false);
  });
  await loadState();
  let resumedAgencySession = false;
  try{
    resumedAgencySession = await SuiteStore.resumeSession();
  }catch(e){
    // Whatever went wrong (a bad stored session, a migration hitting unexpected real-world
    // data, a network hiccup) must never leave someone stuck on this spinner forever -- fall
    // through to a normal login screen instead of hanging indefinitely.
    console.error('Session resume failed, falling back to manual login:', e);
    resumedAgencySession = false;
  }
  document.getElementById('loginLoading').style.display = 'none';
  document.getElementById('loginFormFields').style.display = '';
  if(STATE.ssoConfig && STATE.ssoConfig.enabled && STATE.ssoConfig.connectionName){
    const ssoBox = document.getElementById('ssoLoginOption');
    ssoBox.innerHTML = `<button type="button" class="btn btn-outline" id="btnSsoLogin" style="width:100%;justify-content:center;">Sign in with ${escapeHtml(STATE.ssoConfig.connectionName)}</button><div style="display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--text-dim);font-size:11px;"><div style="flex:1;height:1px;background:var(--border);"></div>or sign in with a password<div style="flex:1;height:1px;background:var(--border);"></div></div>`;
    ssoBox.style.display = '';
    document.getElementById('btnSsoLogin').addEventListener('click', ()=>{
      toast(`This would redirect to "${STATE.ssoConfig.connectionName}" to finish signing in.`);
    });
  }
  document.getElementById('btnLogin').addEventListener('click', attemptLogin);
  document.getElementById('loginPassword').addEventListener('keydown', (e)=>{ if(e.key==='Enter') attemptLogin(); });
  document.getElementById('loginUsername').addEventListener('keydown', (e)=>{ if(e.key==='Enter') document.getElementById('loginPassword').focus(); });
  document.getElementById('btnForgotPassword').addEventListener('click', openForgotPasswordModal);
  if(resumedAgencySession){document.getElementById('loginScreen').classList.add('hidden');document.getElementById('app').classList.add('authenticated');try{if(!await SonoMarziSecurity.enforceMfa())return;}catch(e){console.error('MFA enforcement failed',e);document.getElementById('loginScreen').classList.remove('hidden');document.getElementById('app').classList.remove('authenticated');toast('This agency requires MFA, but setup could not be completed: '+e.message,true);return;}startShell();if(AUTH_LINK_TYPE==='invite'||AUTH_LINK_TYPE==='recovery')setTimeout(openInvitationPassword,0);maybeForcePasswordChange();syncTextZoomFromProfile();}
})();


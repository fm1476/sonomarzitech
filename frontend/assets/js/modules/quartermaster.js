/* =========================================================================
   QUARTERMASTER MODULE (IIFE-scoped; reads/writes STATE.qm and shared roles/personnel)
   ========================================================================= */
(function(){

/* =========================================================================
   ICONS (inline SVG, stroke-based, matches Mark43 line-icon convention)
   ========================================================================= */
const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  arrowOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>',
  arrowIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7L7 17"/><path d="M17 17H7V7"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
  wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12l2 2 4-4"/></svg>',
  checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6l1 1 2-2"/><path d="M4 12l1 1 2-2"/><path d="M4 18l1 1 2-2"/></svg>',
};

/* =========================================================================
   ABILITY CATALOG + DEFAULT ROLES
   ========================================================================= */
const ABILITY_CATALOG = {
  "Equipment & Inventory": [
    ["qm_equip_view","View equipment inventory"],
    ["qm_equip_add","Add new equipment"],
    ["qm_equip_edit","Edit equipment details"],
    ["qm_equip_delete","Delete equipment records"],
    ["qm_equip_retire","Retire / decommission equipment"],
  ],
  "Assignments & Checkout": [
    ["qm_assign_checkout","Check out equipment to personnel"],
    ["qm_assign_checkin","Check in returned equipment"],
    ["qm_assign_approve","Approve checkout requests"],
    ["qm_assign_history","View assignment history"],
  ],
  "Maintenance": [
    ["qm_maint_log","Log maintenance / repairs"],
    ["qm_maint_schedule","Schedule maintenance"],
    ["qm_maint_outofservice","Mark item out of service"],
  ],
  "Personnel": [
    ["personnel_view","View personnel roster"],
    ["personnel_manage","Add / edit personnel"],
  ],
  "Reports": [
    ["qm_reports_view","View reports & analytics"],
    ["qm_reports_export","Export reports (CSV)"],
  ],
  "Administration": [
    ["admin_roles","Manage roles & abilities"],
    ["qm_admin_categories","Manage categories & locations"],
    ["qm_admin_audit","View system audit log"],
  ],
  "Equipment Requests": [
    ["qm_request_submit","Submit equipment requests"],
    ["qm_request_approve","Approve / deny / modify requests"],
    ["qm_request_view_all","View all requests agency-wide"],
  ],
  "Inventory Audits": [
    ["qm_audit_conduct","Conduct inventory audits"],
    ["qm_audit_view","View audit history"],
  ],
};
const ALL_ABILITY_IDS = Object.values(ABILITY_CATALOG).flat().map(a=>a[0]);
function abilityLabel(id){for(const g of Object.values(ABILITY_CATALOG)){const f=g.find(a=>a[0]===id); if(f) return f[1];} return id;}

function abilitiesFor(list){const o={}; ALL_ABILITY_IDS.forEach(id=>o[id]=list.includes(id)); return o;}

const DEFAULT_ROLES = [
  {id:"role_admin", name:"Quartermaster Admin", locked:true, description:"Full access to every module. Intended for property/quartermaster staff who own the system.",
    agencyScope: [], // empty = sees all agencies
    abilities: abilitiesFor(ALL_ABILITY_IDS)},
  {id:"role_supervisor", name:"Supervisor", locked:false, description:"Manages day-to-day equipment operations for a shift or unit.",
    agencyScope: [],
    abilities: abilitiesFor(["qm_equip_view","qm_equip_add","qm_equip_edit","qm_assign_checkout","qm_assign_checkin","qm_assign_approve","qm_assign_history","personnel_view","qm_maint_log","qm_maint_schedule","qm_reports_view","qm_reports_export","qm_request_submit","qm_request_approve","qm_request_view_all","qm_audit_conduct","qm_audit_view"])},
  {id:"role_officer", name:"Field Officer", locked:false, description:"Line personnel who check equipment in and out for their own use.",
    agencyScope: ["Reno PD - Patrol Division"],
    abilities: abilitiesFor(["qm_equip_view","qm_assign_checkout","qm_assign_history","qm_request_submit"])},
  {id:"role_auditor", name:"Auditor / Read-Only", locked:false, description:"Oversight or compliance role with visibility but no ability to change records.",
    agencyScope: [],
    abilities: abilitiesFor(["qm_equip_view","qm_assign_history","personnel_view","qm_reports_view","qm_request_view_all","qm_audit_view"])},
];

const CATEGORIES = ["Duty Gear","Firearms","Less-Lethal","Body Armor","Radios & Electronics","Vehicle Equipment","Medical / Trauma","Tactical / SWAT","Uniforms","Spare Parts","Badges","Keys"];
const LOCATIONS = ["Main Armory","Patrol Division Cage","Vehicle Fleet Bay","SWAT Locker","Supply Room B","Evidence-Adjacent Storage"];
const EQUIPMENT_TYPES = ["Weapon","Protective Gear","Electronics","Vehicle-Mounted","Consumable Supply","Uniform Item","Tool / Kit","Mobile Device","Credential / Access Item"];
const VENDORS = [
  {id:"v1", name:"Axon Enterprise", contact:"Sales Desk", phone:"800-555-0199", email:"orders@axon-example.com"},
  {id:"v2", name:"Motorola Solutions", contact:"Public Safety Accounts", phone:"800-555-0142", email:"psaccounts@motorola-example.com"},
  {id:"v3", name:"5.11 Tactical", contact:"Agency Supply", phone:"800-555-0117", email:"agency@511-example.com"},
  {id:"v4", name:"Safariland Group", contact:"Armor Division", phone:"800-555-0163", email:"armor@safariland-example.com"},
];
const MAINTENANCE_TYPES = ["Scheduled","Repair","Inspection","Calibration","Recall Service"];
const DISPOSAL_METHODS = ["Destroyed - Witnessed","Returned to Vendor","Auctioned / Surplus Sale","Donated","Recycled","Transferred to Another Agency"];
const AGENCIES = ["Reno PD - Patrol Division", "Reno PD - SWAT", "Reno PD - Traffic Unit", "Regional Task Force (Mutual Aid)"];
const UNITS = [
  {id:"u1", name:"Patrol A Shift", kind:"Unit"},
  {id:"u2", name:"Patrol B Shift", kind:"Unit"},
  {id:"u3", name:"SWAT Team", kind:"Unit"},
  {id:"u4", name:"Traffic Unit", kind:"Unit"},
  {id:"u5", name:"Unit 12 (Patrol Vehicle)", kind:"Vehicle"},
  {id:"u6", name:"Unit 7 (Patrol Vehicle)", kind:"Vehicle"},
  {id:"u7", name:"SWAT Armored Vehicle", kind:"Vehicle"},
];
const EQUIPMENT_STATUSES = ["Available","Assigned","Maintenance","Retired","Missing","Lost","Stolen","Destroyed"];
const CONDITIONS = ["New","Good","Fair","Used","Needs Repair","Damaged"];

function defaultRefData(){
  return {
    categories: [...CATEGORIES],
    equipmentTypes: [...EQUIPMENT_TYPES],
    locations: [...LOCATIONS],
    vendors: JSON.parse(JSON.stringify(VENDORS)),
    maintenanceTypes: [...MAINTENANCE_TYPES],
    disposalMethods: [...DISPOSAL_METHODS],
    agencies: [...AGENCIES],
    units: JSON.parse(JSON.stringify(UNITS)),
  };
}

/* =========================================================================
   SEED DATA
   ========================================================================= */
function seedPersonnel(){
  const today = new Date();
  const people = [
    {id:"p1", name:"Sgt. Maria Torres", badge:"1042", unit:"Patrol - A Shift", roleId:"role_supervisor", email:"maria.torres@renopd.gov"},
    {id:"p2", name:"Ofc. Daniel Kim", badge:"2216", unit:"Patrol - A Shift", roleId:"role_officer", email:"daniel.kim@renopd.gov"},
    {id:"p3", name:"Ofc. James Whitfield", badge:"2298", unit:"Patrol - B Shift", roleId:"role_officer", email:"james.whitfield@renopd.gov"},
    {id:"p4", name:"Ofc. Priya Nair", badge:"2310", unit:"Traffic Unit", roleId:"role_officer", email:"priya.nair@renopd.gov"},
    {id:"p5", name:"Lt. Robert Hayes", badge:"0510", unit:"SWAT", roleId:"role_supervisor", email:"robert.hayes@renopd.gov"},
    {id:"p6", name:"Ofc. Alan Brooks", badge:"2401", unit:"SWAT", roleId:"role_officer", email:"alan.brooks@renopd.gov"},
    {id:"p7", name:"C. Ellis (Compliance)", badge:"AUD-04", unit:"Professional Standards", roleId:"role_auditor", email:"c.ellis@renopd.gov"},
    {id:"p8", name:"Quartermaster - R. Osei", badge:"QM-01", unit:"Logistics", roleId:"role_admin", email:"r.osei@renopd.gov"},
    {id:"p9", name:"Fred Marziano", badge:"1476", unit:"Logistics", roleId:"role_admin", email:"fred.marziano@mark43.com"},
  ];
  people.forEach(p=>p.qualifications = []);
  // seed a few qualification records, one intentionally expiring soon to demo the alert
  people[1].qualifications.push({id:"q1", weaponType:"Handgun", qualDate: fmt(addDays(today,-340)), expirationDate: fmt(addDays(today,25))});
  people[2].qualifications.push({id:"q2", weaponType:"Handgun", qualDate: fmt(addDays(today,-120)), expirationDate: fmt(addDays(today,245))});
  people[5].qualifications.push({id:"q3", weaponType:"Handgun", qualDate: fmt(addDays(today,-100)), expirationDate: fmt(addDays(today,265))});
  people[5].qualifications.push({id:"q4", weaponType:"Patrol Rifle", qualDate: fmt(addDays(today,-100)), expirationDate: fmt(addDays(today,265))});
  return people;
}

function seedEquipment(){
  // [name, category, condition, location, value, purchaseDate, serial-or-null]
  const items = [
    ["Aegis II Ballistic Vest - Size M","Body Armor","Good","Main Armory",680,"2023-02-10","BA-77291"],
    ["Aegis II Ballistic Vest - Size L","Body Armor","Good","Main Armory",680,"2023-02-10","BA-77292"],
    ["Ballistic Helmet - ACH","Tactical / SWAT","New","SWAT Locker",410,"2024-11-01","BH-40021"],
    ["Glock 22 Duty Sidearm","Firearms","Good","Main Armory",520,"2021-06-15","GL22-88410"],
    ["Glock 22 Duty Sidearm","Firearms","Good","Main Armory",520,"2021-06-15","GL22-88411"],
    ["Remington 870 Shotgun","Firearms","Fair","Main Armory",610,"2019-03-01","R870-10938"],
    ["Colt M4 Patrol Rifle","Firearms","Good","Vehicle Fleet Bay",1450,"2022-08-20","M4-55219"],
    ["TASER 10 CEW","Less-Lethal","Good","Patrol Division Cage",1650,"2023-05-12","T10-30044"],
    ["TASER 10 CEW","Less-Lethal","Needs Repair","Patrol Division Cage",1650,"2023-05-12","T10-30045"],
    ["40mm Less-Lethal Launcher","Less-Lethal","Good","SWAT Locker",980,"2022-01-09","LL40-11209"],
    ["Motorola APX 8000 Radio","Radios & Electronics","Good","Patrol Division Cage",5200,"2023-09-01","APX-990412"],
    ["Motorola APX 8000 Radio","Radios & Electronics","Good","Patrol Division Cage",5200,"2023-09-01","APX-990413"],
    ["In-Car Video Unit","Radios & Electronics","Good","Vehicle Fleet Bay",3100,"2021-12-01","ICV-20871"],
    ["Body-Worn Camera - Axon Body 4","Radios & Electronics","Good","Patrol Division Cage",699,"2024-02-14","AB4-60312"],
    ["Body-Worn Camera - Axon Body 4","Radios & Electronics","Good","Patrol Division Cage",699,"2024-02-14","AB4-60313"],
    ["Stop Stick Spike Strip","Vehicle Equipment","Good","Vehicle Fleet Bay",240,"2022-04-18",null],
    ["Traffic Cone Set (10)","Vehicle Equipment","Fair","Vehicle Fleet Bay",95,"2020-07-01",null],
    ["AED - Trauma Kit Vehicle Mount","Medical / Trauma","Good","Vehicle Fleet Bay",1350,"2023-01-22","AED-70091"],
    ["IFAK Trauma Kit","Medical / Trauma","Good","Supply Room B",120,"2024-05-01",null],
    ["IFAK Trauma Kit","Medical / Trauma","Good","Supply Room B",120,"2024-05-01",null],
    ["Duty Belt - Nylon","Duty Gear","Good","Supply Room B",145,"2023-03-11",null],
    ["Duty Belt - Nylon","Duty Gear","New","Supply Room B",145,"2024-11-20",null],
    ["Handcuffs - Chain Link","Duty Gear","Good","Supply Room B",42,"2022-09-05",null],
    ["Class A Dress Uniform - Set","Uniforms","Good","Supply Room B",310,"2021-10-01",null],
    ["Patrol Uniform Set (2)","Uniforms","Good","Supply Room B",180,"2023-06-01",null],
    ["Breaching Ram","Tactical / SWAT","Good","SWAT Locker",380,"2020-11-01",null],
    ["Ballistic Shield","Tactical / SWAT","Fair","SWAT Locker",890,"2019-05-05","BS-10883"],
    ["Night Vision Monocular","Tactical / SWAT","Good","Evidence-Adjacent Storage",2900,"2022-02-01","NV-33456"],
    // Retired/disposed & lost/stolen items, to exercise disposal + status reporting
    ["Glock 17 Duty Sidearm (Retired Model)","Firearms","Fair","Evidence-Adjacent Storage",480,"2014-04-02","GL17-51002"],
    ["Motorola XTS Radio (Legacy)","Radios & Electronics","Fair","Evidence-Adjacent Storage",1800,"2015-01-10","XTS-88213"],
    ["TASER X26 (Legacy Model)","Less-Lethal","Fair","Evidence-Adjacent Storage",900,"2016-03-01","X26-40987"],
  ];
  // category -> {vendorId, equipmentType, replacementYears, agency}
  const CAT_META = {
    "Body Armor": {vendorId:"v4", equipmentType:"Protective Gear", replacementYears:5},
    "Tactical / SWAT": {vendorId:"v4", equipmentType:"Protective Gear", replacementYears:8},
    "Firearms": {vendorId:null, equipmentType:"Weapon", replacementYears:15},
    "Less-Lethal": {vendorId:"v1", equipmentType:"Weapon", replacementYears:6},
    "Radios & Electronics": {vendorId:"v2", equipmentType:"Electronics", replacementYears:6},
    "Vehicle Equipment": {vendorId:null, equipmentType:"Vehicle-Mounted", replacementYears:7},
    "Medical / Trauma": {vendorId:null, equipmentType:"Tool / Kit", replacementYears:3},
    "Duty Gear": {vendorId:"v3", equipmentType:"Tool / Kit", replacementYears:5},
    "Uniforms": {vendorId:"v3", equipmentType:"Uniform Item", replacementYears:3},
  };
  const MFR_MODEL = {
    "Glock 22 Duty Sidearm": ["Glock", "22 Gen4"],
    "Glock 17 Duty Sidearm (Retired Model)": ["Glock", "17 Gen3"],
    "Remington 870 Shotgun": ["Remington", "870 Police"],
    "Colt M4 Patrol Rifle": ["Colt", "M4 Carbine"],
    "TASER 10 CEW": ["Axon", "TASER 10"],
    "TASER X26 (Legacy Model)": ["Axon", "X26"],
    "40mm Less-Lethal Launcher": ["Defense Technology", "40mm Single Launcher"],
    "Motorola APX 8000 Radio": ["Motorola Solutions", "APX 8000"],
    "Motorola XTS Radio (Legacy)": ["Motorola Solutions", "XTS 5000"],
    "Body-Worn Camera - Axon Body 4": ["Axon", "Body 4"],
    "In-Car Video Unit": ["WatchGuard", "4RE"],
  };
  const serialized = items.map((it,i)=>{
    const meta = CAT_META[it[1]] || {vendorId:null, equipmentType:"Tool / Kit", replacementYears:6};
    const purchase = new Date(it[5]);
    const inService = fmt(addDays(purchase, 14));
    const replacement = fmt(new Date(purchase.getFullYear()+meta.replacementYears, purchase.getMonth(), purchase.getDate()));
    // Axon-branded items get v1 specifically regardless of category default
    const vendorId = it[0].includes('Axon') || it[0].includes('TASER') ? 'v1' : meta.vendorId;
    const mm = MFR_MODEL[it[0]] || [null, null];
    return {
      id:"e"+(i+1),
      assetId:"QM-"+String(1000+i+1),
      name:it[0], category:it[1], condition:it[2], location:it[3],
      value:it[4], purchaseDate:it[5], inServiceDate: inService, replacementDate: replacement,
      serialNumber: it[6], manufacturer: mm[0], model: mm[1],
      equipmentType: meta.equipmentType, vendorId, agency: it[3]==="SWAT Locker" ? AGENCIES[1] : (it[3]==="Vehicle Fleet Bay" && it[1]==="Vehicle Equipment" ? AGENCIES[2] : AGENCIES[0]),
      ownershipType: "Agency", personalWeaponAuth: null,
      isSharedAsset: it[3]==="SWAT Locker",
      isConsumable:false, quantity:1, minQuantity:null,
      status:"Available", assignedTo:null, assignedToType:null, disposal:null, notes:"",
    };
  });

  // three seed items get a disposed / lost / stolen status for demo purposes
  serialized[28].status = "Destroyed";
  serialized[28].disposal = {method:"Destroyed - Witnessed", date: fmt(addDays(new Date(),-120)), reason:"Failed annual safety inspection; decommissioned per armory policy."};
  serialized[29].status = "Lost";
  serialized[29].disposal = null;
  serialized[30].status = "Stolen";
  serialized[30].disposal = null;

  // consumables tracked by quantity on-hand rather than individual serialized units
  const consumables = [
    ["Duty Ammunition - 9mm (rounds)","Firearms","Main Armory",0.45, "2024-06-01", 3200, 1000],
    ["Duty Ammunition - .223 (rounds)","Firearms","Main Armory",0.85, "2024-06-01", 850, 500],
    ["TASER Cartridges","Less-Lethal","Patrol Division Cage",28, "2024-08-15", 34, 40],
    ["IFAK Refill Pack (tourniquet + gauze)","Medical / Trauma","Supply Room B",38, "2024-09-01", 18, 15],
    ["Radio Battery Pack - APX Series","Radios & Electronics","Patrol Division Cage",95, "2024-07-10", 22, 10],
    ["Road Flares (case of 24)","Vehicle Equipment","Vehicle Fleet Bay",65, "2023-11-01", 6, 8],
    ["Nitrile Gloves (box of 100)","Spare Parts","Supply Room B",12, "2025-01-05", 40, 15],
  ].map((it,i)=>{
    const meta = CAT_META[it[1]] || {vendorId:null, equipmentType:"Consumable Supply"};
    return {
      id:"c"+(i+1),
      assetId:"QM-C"+String(200+i+1),
      name:it[0], category:it[1], condition:"New", location:it[2],
      value:it[3], purchaseDate:it[4], inServiceDate:it[4], replacementDate:null,
      serialNumber:null, manufacturer:null, model:null, equipmentType:"Consumable Supply", vendorId: meta.vendorId, agency: AGENCIES[0],
      ownershipType:"Agency", personalWeaponAuth:null, isSharedAsset:false,
      isConsumable:true, quantity:it[5], minQuantity:it[6],
      status:"Available", assignedTo:null, assignedToType:null, disposal:null, notes:"",
    };
  });

  return [...serialized, ...consumables];
}

function seedAssignments(state){
  // pick a handful of equipment items to mark as assigned / overdue
  const pick = (idx)=> state.equipment[idx];
  const out = [];
  const setups = [
    {eq:3, target:"p2", days:-5, due:2, status:"Checked Out"},
    {eq:7, target:"p3", days:-3, due:4, status:"Checked Out"},
    {eq:10,target:"p2", days:-14,due:-4,status:"Overdue"},
    {eq:13,target:"p4", days:-2, due:5, status:"Checked Out"},
    {eq:20,target:"p6", days:-30,due:-16,status:"Overdue"},
    {eq:1, target:"p5", days:-40,due:-10,status:"Returned", returned:-1},
    {eq:14,target:"p3", days:-60,due:-46,status:"Returned", returned:-45},
    {eq:6, target:"u5", targetType:"unit", days:-8, due:22, status:"Checked Out"}, // rifle assigned to a patrol vehicle
  ];
  const today = new Date();
  setups.forEach((s,i)=>{
    const eq = pick(s.eq);
    const checkoutDate = addDays(today, s.days);
    const dueDate = addDays(today, s.due);
    const targetType = s.targetType || "person";
    const rec = {
      id:"a"+(i+1), equipmentId:eq.id,
      assignedToType: targetType, personId: targetType==="person" ? s.target : null, targetId: s.target,
      checkoutDate: fmt(checkoutDate), checkoutTime: "08:00",
      checkoutLocation: eq.location,
      dueDate: fmt(dueDate),
      status: s.status,
      returnedDate: s.returned!==undefined ? fmt(addDays(today,s.returned)) : null,
      conditionOut: eq.condition,
      notes:"",
    };
    out.push(rec);
    if(s.status!=="Returned"){
      eq.status="Assigned"; eq.assignedTo=s.target; eq.assignedToType=targetType;
    }
  });
  // mark a couple items in maintenance / retired for variety
  state.equipment[8].status="Maintenance"; // TASER needs repair one
  state.equipment[25].status="Maintenance"; // ballistic shield fair
  return out;
}
function addDays(d,n){const r=new Date(d); r.setDate(r.getDate()+n); return r;}
function fmt(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function daysBetween(a,b){return Math.round((new Date(b)-new Date(a))/86400000);}

function seedMaintenance(state){
  const today = new Date();
  const rows = [
    {eq:8,  type:"Repair",    daysAgo:1,  labor:0,  parts:0,  vendor:"Armory - In House", status:"Open",      notes:"Trigger mechanism intermittent, flagged by Ofc. Whitfield.", recurring:false},
    {eq:25, type:"Repair",    daysAgo:6,  labor:0,  parts:0,  vendor:"Armory - In House", status:"Open",      notes:"Shield facing cracked, awaiting replacement part.", recurring:false},
    {eq:6,  type:"Scheduled", daysAgo:40, labor:60, parts:25, vendor:"Precision Arms Service", status:"Completed", notes:"Annual inspection and cleaning.", recurring:true, intervalDays:365},
    {eq:12, type:"Scheduled", daysAgo:70, labor:0,  parts:0,  vendor:"Armory - In House", status:"Completed", notes:"Firmware update and battery calibration.", recurring:true, intervalDays:180},
    {eq:2,  type:"Scheduled", daysAgo:-14,labor:0,  parts:0,  vendor:"Armory - In House", status:"Scheduled", notes:"Due for annual ballistic panel inspection.", recurring:true, intervalDays:365},
    {eq:9,  type:"Scheduled", daysAgo:-6, labor:0,  parts:0,  vendor:"Axon Certified Tech", status:"Scheduled", notes:"Recurring 6-month service window.", recurring:true, intervalDays:180},
  ];
  return rows.map((r,i)=>{
    const eq = state.equipment[r.eq];
    const date = fmt(addDays(today, -r.daysAgo));
    return {
      id:"m"+(i+1), equipmentId: eq.id, type:r.type,
      date: r.status==="Scheduled" ? fmt(addDays(today, Math.abs(r.daysAgo))) : date,
      laborCost: r.labor, partsCost: r.parts, cost: r.labor+r.parts,
      vendor: r.vendor, status: r.status, notes: r.notes,
      isRecurring: !!r.recurring, intervalDays: r.intervalDays || null,
    };
  });
}

/* ---------- Password hashing (demo-grade; see login screen note) ---------- */
async function hashPassword(pw){
  if(window.crypto && window.crypto.subtle && window.crypto.subtle.digest){
    try{
      const enc = new TextEncoder().encode(pw);
      const buf = await window.crypto.subtle.digest('SHA-256', enc);
      return 'sha256:'+Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){ /* fall through */ }
  }
  let h = 0;
  for(let i=0;i<pw.length;i++){ h = (h*31 + pw.charCodeAt(i)) | 0; }
  return 'simple:'+h;
}
const DEMO_PASSWORD = "quartermaster123";

async function seedAccounts(personnel){
  const hash = await hashPassword(DEMO_PASSWORD);
  return personnel.map(p => ({
    id: 'acct_'+p.id,
    personId: p.id,
    username: p.email ? p.email.split('@')[0] : p.name.toLowerCase().replace(/[^a-z]/g,''),
    passwordHash: hash,
  }));
}

function buildQmData(){
  const equipment = seedEquipment();
  const state = {
    equipment: equipment,
    assignments: [],
    maintenance: [],
    consumptionLog: [],
    notifications: [],
    notifySettings: { lowStockRoleId: "role_admin", maintenanceDueRoleId: "role_admin", replacementDueRoleId: "role_admin", qualificationDueRoleId: "role_admin", requestPendingRoleId: "role_admin" },
    refData: defaultRefData(),
    requests: [],
    requestRoutingRules: [
      {id:"rr1", categoryFilter:"Firearms", minValue:0, approverRoleId:"role_admin", escalationDays:3, escalationRoleId:"role_admin"},
      {id:"rr2", categoryFilter:"All", minValue:500, approverRoleId:"role_admin", escalationDays:5, escalationRoleId:"role_admin"},
      {id:"rr3", categoryFilter:"All", minValue:0, approverRoleId:"role_supervisor", escalationDays:5, escalationRoleId:"role_admin"},
    ],
    audits: [],
    activity: [],
    dashboardPrefs: {}, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
  };
  state.assignments = seedAssignments(state);
  state.maintenance = seedMaintenance(state);
  state.requests = seedRequests(state);
  state.activity = [
    {ts:fmt(addDays(new Date(),-14)), text:"Overdue: Motorola APX 8000 Radio not returned by Ofc. Daniel Kim.", entityType:"assignment"},
    {ts:fmt(addDays(new Date(),-5)), text:"Glock 22 Duty Sidearm checked out to Ofc. Daniel Kim.", entityType:"assignment"},
    {ts:fmt(addDays(new Date(),-3)), text:"TASER 10 CEW checked out to Ofc. James Whitfield.", entityType:"assignment"},
    {ts:fmt(addDays(new Date(),-2)), text:"Body-Worn Camera checked out to Ofc. Priya Nair.", entityType:"assignment"},
    {ts:fmt(addDays(new Date(),-1)), text:"TASER 10 CEW (unit 2) flagged Needs Repair.", entityType:"equipment"},
    {ts:fmt(addDays(new Date(),-120)), text:"Glock 17 Duty Sidearm (Retired Model) destroyed per armory policy (failed safety inspection).", entityType:"disposal"},
  ];
  return state;
}

function seedRequests(state){
  const today = new Date();
  return [
    {id:"req1", requesterId:"p2", itemDescription:"Replacement duty belt (worn out)", category:"Duty Gear", estimatedValue:145, quantity:1,
      justification:"Current belt stitching has failed at the holster mount.", status:"Pending",
      createdDate:fmt(addDays(today,-2)), decisionDate:null, decisionNotes:"", approverRoleId:"role_supervisor", escalated:false},
    {id:"req2", requesterId:"p6", itemDescription:"Additional TASER cartridges", category:"Less-Lethal", estimatedValue:28, quantity:10,
      justification:"Used remaining cartridges during quarterly qualification.", status:"Approved",
      createdDate:fmt(addDays(today,-9)), decisionDate:fmt(addDays(today,-8)), decisionNotes:"Approved - routine resupply.", approverRoleId:"role_supervisor", escalated:false},
    {id:"req3", requesterId:"p4", itemDescription:"Colt M4 Patrol Rifle for traffic unit cross-training", category:"Firearms", estimatedValue:1450, quantity:1,
      justification:"Cross-training assignment approved by watch commander.", status:"Pending",
      createdDate:fmt(addDays(today,-6)), decisionDate:null, decisionNotes:"", approverRoleId:"role_admin", escalated:true},
    {id:"req4", requesterId:"p3", itemDescription:"IFAK refill", category:"Medical / Trauma", estimatedValue:38, quantity:2,
      justification:"Kit used during a field response.", status:"Denied",
      createdDate:fmt(addDays(today,-20)), decisionDate:fmt(addDays(today,-19)), decisionNotes:"Denied - refill already issued this month; resubmit if still needed.", approverRoleId:"role_supervisor", escalated:false},
  ];
}

/* =========================================================================
   TENANT CONNECTION (in-memory only — never persisted, never saved to disk)
   ========================================================================= */
const CONNECTION = {
  baseUrl: "https://reno-nv-demo.mark43.com/partnerships/api",
  endpointPath: "/external/users",
  authMode: "basic", // basic | apikey
  token: "",
  status: "disconnected", // disconnected | testing | connected | error
  lastMessage: "",
  lastRawUsers: null,
};

/* backfill any qm-specific fields added after a session was already saved; roles/personnel/accounts are migrated once, centrally, by the shared shell */
function migrateQmData(){
  if(!STATE.qm.refData) STATE.qm.refData = defaultRefData();
  if(!STATE.qm.consumptionLog) STATE.qm.consumptionLog = [];
  if(!STATE.qm.notifications) STATE.qm.notifications = [];
  if(!STATE.qm.notifySettings) STATE.qm.notifySettings = { lowStockRoleId: STATE.roles[0].id, maintenanceDueRoleId: STATE.roles[0].id, replacementDueRoleId: STATE.roles[0].id };
  if(STATE.qm.notifySettings.qualificationDueRoleId===undefined) STATE.qm.notifySettings.qualificationDueRoleId = STATE.roles[0].id;
  if(STATE.qm.notifySettings.requestPendingRoleId===undefined) STATE.qm.notifySettings.requestPendingRoleId = STATE.roles[0].id;
  if(!STATE.qm.requests) STATE.qm.requests = [];
  if(!STATE.qm.requestRoutingRules) STATE.qm.requestRoutingRules = [{id:"rr_default", categoryFilter:"All", minValue:0, approverRoleId:STATE.roles[0].id, escalationDays:5, escalationRoleId:STATE.roles[0].id}];
  if(!STATE.qm.audits) STATE.qm.audits = [];
  if(!STATE.qm.dashboardPrefs) STATE.qm.dashboardPrefs = {};
  STATE.qm.equipment.forEach(e=>{
    if(e.assignedToType===undefined) e.assignedToType = e.assignedTo ? 'person' : null;
    if(e.disposal===undefined) e.disposal = null;
    if(e.equipmentType===undefined) e.equipmentType = STATE.qm.refData.equipmentTypes[0];
    if(e.vendorId===undefined) e.vendorId = null;
    if(e.agency===undefined) e.agency = STATE.qm.refData.agencies[0];
    if(e.inServiceDate===undefined) e.inServiceDate = e.purchaseDate || null;
    if(e.replacementDate===undefined) e.replacementDate = null;
    if(e.manufacturer===undefined) e.manufacturer = null;
    if(e.model===undefined) e.model = null;
    if(e.ownershipType===undefined) e.ownershipType = 'Agency';
    if(e.homeUnit===undefined) e.homeUnit = '';
    if(e.personalWeaponAuth===undefined) e.personalWeaponAuth = null;
    if(e.isSharedAsset===undefined) e.isSharedAsset = false;
    if(e.photoDataUrl===undefined) e.photoDataUrl = null;
    if(!e.photos) e.photos = [];
  });
  STATE.qm.assignments.forEach(a=>{
    if(a.assignedToType===undefined) a.assignedToType = 'person';
    if(a.targetId===undefined) a.targetId = a.personId;
    if(a.checkoutTime===undefined) a.checkoutTime = '';
    if(a.checkoutLocation===undefined) a.checkoutLocation = '';
  });
  STATE.qm.maintenance.forEach(m=>{
    if(m.laborCost===undefined) m.laborCost = m.cost||0;
    if(m.partsCost===undefined) m.partsCost = 0;
    if(m.isRecurring===undefined) m.isRecurring = false;
    if(m.intervalDays===undefined) m.intervalDays = null;
  });
}

/* =========================================================================
   ABILITY HELPERS
   ========================================================================= */
function currentRole(){ return window.currentRole(); }
function can(abilityId){ const r=currentRole(); return !!(r && r.abilities && r.abilities[abilityId]); }
function countAbilities(role){ return Object.values(role.abilities).filter(Boolean).length; }

/* =========================================================================
   TOAST
   ========================================================================= */
function toast(msg, isErr){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast'+(isErr?' err':'');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 3200);
}

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  {id:"qm-dashboard", label:"Dashboard", icon:"dashboard", title:"Dashboard", sub:"Fleet-wide equipment status at a glance", requiredAbility:null},
  {id:"qm-inventory", label:"Inventory", icon:"box", title:"Equipment Inventory", sub:"Every asset tracked by the quartermaster module", requiredAbility:"qm_equip_view"},
  {id:"qm-assignments", label:"Assignments", icon:"swap", title:"Assignments & Checkout", sub:"Check equipment in and out, and track what's overdue", requiredAbility:"qm_assign_history"},
  {id:"qm-maintenance", label:"Maintenance", icon:"wrench", title:"Maintenance", sub:"Repairs, inspections, and scheduled service across the fleet", requiredAbility:"qm_equip_view"},
  {id:"qm-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Inventory value, utilization, and overdue trends", requiredAbility:"qm_reports_view"},
  {id:"qm-requests", label:"Requests", icon:"clipboard", title:"Equipment Requests", sub:"Submit, route, and decide on equipment requests", requiredAbility:["qm_request_submit","qm_request_approve","qm_request_view_all"]},
  {id:"qm-audits", label:"Audits", icon:"checklist", title:"Inventory Audits", sub:"Spot-check or fully reconcile inventory against records", requiredAbility:["qm_audit_conduct","qm_audit_view"]},
  {id:"qm-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Reference data, disposal methods, and the system audit log", requiredAbility:["qm_admin_categories","qm_admin_audit"]},
];
let ACTIVE_VIEW = "qm-dashboard";

function navItemVisible(item){
  if(!can('module_quartermaster')) return false;
  if(!item) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}

function renderNav(){ document.getElementById('navlist').innerHTML=''; }
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
  if(id!=='qm-dashboard'){
    const root=document.getElementById('view-'+id);
    if(root && !root.querySelector('[data-module-dashboard-back]')){
      const back=document.createElement('button');
      back.type='button'; back.className='btn btn-outline';
      back.dataset.moduleDashboardBack='1';
      back.innerHTML='&#8592; Back to Dashboard';
      back.style.marginBottom='16px';
      back.onclick=()=>switchView('qm-dashboard');
      root.prepend(back);
    }
  }
}

function renderRoleSwitcher(){
  const sel = document.getElementById('roleSwitcher');
  const fixedLabel = document.getElementById('fixedRoleLabel');
  const switcherLabel = document.getElementById('roleSwitcherLabel');
  const loggedInEl = document.getElementById('loggedInAs');
  const person = STATE.personnel.find(p=>p.id===CURRENT_USER_ID);
  loggedInEl.textContent = person ? `Logged in as ${person.name}` : '';

  // The role switcher stays available to everyone while logged in - this is a
  // deliberate demo feature so any account can show off how the app looks for
  // other roles. What changes per-role is which menu items are visible (see
  // renderNav), not whether you can preview a role at all.
  fixedLabel.style.display='none';
  sel.style.display=''; switcherLabel.style.display='';
  sel.innerHTML = STATE.roles.map(r=>`<option value="${r.id}" ${r.id===STATE.currentRoleId?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  sel.onchange = ()=>{
    STATE.currentRoleId = sel.value;
    document.getElementById('abilityCountPill').textContent = countAbilities(currentRole())+" abilities";
    renderNav();
    if(!navItemVisible(NAV_ITEMS.find(n=>n.id===ACTIVE_VIEW))){
      switchView('dashboard');
    } else {
      renderView(ACTIVE_VIEW);
    }
    renderNotifBell();
  };
  document.getElementById('abilityCountPill').textContent = countAbilities(currentRole())+" abilities";
}

/* ---------- Notification bell ---------- */
function renderNotifBell(){
  recalcNotifications();
  const mine = STATE.qm.notifications.filter(n=>n.recipientRoleId===STATE.currentRoleId);
  const unread = mine.filter(n=>!n.read).length;
  const badge = document.getElementById('notifBadge');
  badge.style.display = unread ? '' : 'none';
  badge.textContent = unread>9 ? '9+' : String(unread);
}
function toggleNotifPanel(){
  const panel = document.getElementById('notifPanel');
  if(panel.style.display==='none' || !panel.innerHTML){
    renderNotifPanel();
    panel.style.display = '';
  } else {
    panel.style.display = 'none';
  }
}
function renderNotifPanel(){
  const panel = document.getElementById('notifPanel');
  const mine = STATE.qm.notifications.filter(n=>n.recipientRoleId===STATE.currentRoleId).sort((a,b)=> (a.read===b.read?0:a.read?1:-1));
  const typeLabel = {low_stock:'Low Stock', maintenance_due:'Maintenance', replacement_due:'Replacement'};
  const rows = mine.map(n=>`
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);${n.read?'opacity:0.55;':''}display:flex;gap:10px;align-items:flex-start;">
      <span class="badge ${n.type==='low_stock'?'badge-maintenance':n.type==='maintenance_due'?'badge-assigned':'badge-overdue'}" style="flex-shrink:0;">${typeLabel[n.type]}</span>
      <div style="flex:1;font-size:12.5px;line-height:1.4;">
        ${escapeHtml(n.message)}
        ${!n.read ? `<div style="margin-top:4px;"><button class="btn btn-sm btn-outline" data-mark-read="${n.id}" style="padding:2px 8px;font-size:11px;">Mark read</button></div>` : ''}
      </div>
    </div>
  `).join('') || `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No notifications for this role right now.</div>`;
  panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-weight:800;color:var(--heading);font-size:13.5px;display:flex;justify-content:space-between;align-items:center;">
      Notifications for ${escapeHtml(roleName(STATE.currentRoleId))}
      ${mine.some(n=>!n.read) ? `<button class="btn btn-sm btn-outline" id="btnMarkAllRead" style="padding:3px 8px;font-size:11px;">Mark all read</button>` : ''}
    </div>
    ${rows}
  `;
  document.querySelectorAll('[data-mark-read]').forEach(b=>b.addEventListener('click', ()=>{
    const n = STATE.qm.notifications.find(n=>n.id===b.dataset.markRead);
    if(n) n.read = true;
    persist();
    renderNotifPanel();
    renderNotifBell();
  }));
  const markAll = document.getElementById('btnMarkAllRead');
  if(markAll) markAll.addEventListener('click', ()=>{
    mine.forEach(n=>n.read=true);
    persist();
    renderNotifPanel();
    renderNotifBell();
  });
}

/* =========================================================================
   RENDER DISPATCH
   ========================================================================= */
function renderView(id){
  if(id==="qm-dashboard") renderDashboard();
  else if(id==="qm-inventory") renderInventory();
  else if(id==="qm-assignments") renderAssignments();
  else if(id==="qm-maintenance") renderMaintenanceView();
  else if(id==="qm-reports") renderReports();
  else if(id==="qm-admin") renderAdmin();
  else if(id==="qm-requests") renderRequests();
  else if(id==="qm-audits") renderAudits();
}
function renderAll(){
  renderRoleSwitcher();
  renderView(ACTIVE_VIEW);
  renderNotifBell();
}

/* =========================================================================
   SORTING (shared across Inventory, Assignments, Personnel tables)
   ========================================================================= */
const SORT = {
  inventory: {key:'assetId', dir:'asc'},
  assignActive: {key:'dueDate', dir:'asc'},
  assignHistory: {key:'returnedDate', dir:'desc'},
  personnel: {key:'name', dir:'asc'},
  maintenance: {key:'date', dir:'desc'},
};
function sortHeaderHtml(label, table, key){
  const s = SORT[table];
  const active = s.key===key;
  const arrow = active ? (s.dir==='asc' ? '&#9650;' : '&#9660;') : '&#8597;';
  return `<th class="sortable ${active?'sort-active':''}" data-sort-table="${table}" data-sort-key="${key}">${label}<span class="arrow">${arrow}</span></th>`;
}
function wireSortHeaders(table, rerenderFn){
  document.querySelectorAll(`[data-sort-table="${table}"]`).forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.dataset.sortKey;
      const s = SORT[table];
      if(s.key===key){ s.dir = s.dir==='asc' ? 'desc' : 'asc'; }
      else { s.key = key; s.dir = 'asc'; }
      rerenderFn();
    });
  });
}

/* =========================================================================
   UTIL
   ========================================================================= */
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(n){ return "$"+Number(n).toLocaleString(undefined,{maximumFractionDigits:0}); }
function personName(id){ const p=STATE.personnel.find(p=>p.id===id); return p?p.name:"Unassigned"; }
function unitName(id){ const u=STATE.qm.refData.units.find(u=>u.id===id); return u?u.name:"Unknown Unit"; }
function vendorName(id){ const v=STATE.qm.refData.vendors.find(v=>v.id===id); return v?v.name:""; }
function targetName(assignedToType, targetId){
  if(!targetId) return "Unassigned";
  if(assignedToType==="unit") return unitName(targetId);
  if(assignedToType==="location") return targetId; // location stored as its name string directly
  return personName(targetId);
}
function roleName(id){ const r=STATE.roles.find(r=>r.id===id); return r?r.name:"—"; }
function equipmentById(id){ return STATE.qm.equipment.find(e=>e.id===id); }
/* Shared clickable equipment name link, used anywhere an item is referenced
   outside the Inventory table itself, so clicking it opens the same detail
   modal as the Inventory / Maintenance views. */
function eqLink(item){
  if(!item) return '—';
  return `<a href="#" data-open-eq="${item.id}" class="record-link">${escapeHtml(item.name)}</a>`;
}
function wireEqLinks(){
  document.querySelectorAll('[data-open-eq]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openEquipmentDetail(a.dataset.openEq); }));
}
/* Agency visibility: roles with an empty agencyScope see everything; scoped roles
   see only their agency's equipment, plus anything flagged as a shared task-force asset. */
function canSeeEquipment(e){
  const role = currentRole();
  if(role && role.agencyScope && role.agencyScope.length>0 && !e.isSharedAsset && !role.agencyScope.includes(e.agency)) return false;
  if(can('qm_unit_scope') && !can('qm_bypass_unit_scope')){
    const myUnit = (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).unit;
    if(!myUnit) return false;
    const checkedOutToUnit = e.assignedToType==='person' && STATE.personnel.find(p=>p.id===e.assignedTo)?.unit===myUnit;
    const taggedToUnit = e.homeUnit && e.homeUnit===myUnit;
    if(!checkedOutToUnit && !taggedToUnit) return false;
  }
  return true;
}
function visibleEquipment(){
  return STATE.qm.equipment.filter(canSeeEquipment);
}
function statusBadgeClass(status){
  return {
    "Available":"badge-available","Assigned":"badge-assigned","Maintenance":"badge-maintenance",
    "Retired":"badge-retired","Missing":"badge-missing","Lost":"badge-missing","Stolen":"badge-missing","Destroyed":"badge-retired",
    "Checked Out":"badge-assigned",
    "Overdue":"badge-overdue","Returned":"badge-available",
  }[status] || "badge-role";
}
function logActivity(text, entityType, entityId){
  STATE.qm.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('Quartermaster', text, entityType);
}

/* ---------- Notifications: low stock / maintenance due / replacement due ---------- */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  // low stock
  STATE.qm.equipment.forEach(e=>{
    if(e.isConsumable && e.minQuantity!=null && e.quantity<=e.minQuantity){
      upcoming.push({type:"low_stock", entityId:e.id, message:`${e.name} is at or below its reorder threshold (${e.quantity} on hand, min ${e.minQuantity}).`, recipientRoleId: STATE.qm.notifySettings.lowStockRoleId});
    }
  });
  // maintenance due soon (scheduled within 14 days, or overdue/open)
  STATE.qm.maintenance.forEach(m=>{
    if(m.status==="Scheduled"){
      const days = daysBetween(fmt(today), m.date);
      if(days<=14){
        const item = equipmentById(m.equipmentId);
        if(item) upcoming.push({type:"maintenance_due", entityId:item.id, message:`${item.name} has ${m.type.toLowerCase()} maintenance ${days<0?'overdue by '+Math.abs(days)+' days':'due in '+days+' days'} (${m.date}).`, recipientRoleId: STATE.qm.notifySettings.maintenanceDueRoleId});
      }
    }
    if(m.status==="Open"){
      const item = equipmentById(m.equipmentId);
      if(item) upcoming.push({type:"maintenance_due", entityId:item.id, message:`${item.name} has an open repair awaiting completion.`, recipientRoleId: STATE.qm.notifySettings.maintenanceDueRoleId});
    }
  });
  // replacement due within 60 days or past due
  STATE.qm.equipment.forEach(e=>{
    if(e.replacementDate && !["Retired","Destroyed","Lost","Stolen"].includes(e.status)){
      const days = daysBetween(fmt(today), e.replacementDate);
      if(days<=60){
        upcoming.push({type:"replacement_due", entityId:e.id, message:`${e.name} ${days<0?'is past its replacement date by '+Math.abs(days)+' days':'reaches its replacement date in '+days+' days'} (${e.replacementDate}).`, recipientRoleId: STATE.qm.notifySettings.replacementDueRoleId});
      }
    }
  });
  // firearm qualification due within 30 days or expired
  STATE.personnel.forEach(p=>{
    (p.qualifications||[]).forEach(q=>{
      const days = daysBetween(fmt(today), q.expirationDate);
      if(days<=30){
        upcoming.push({type:"qualification_due", entityId:p.id, message:`${p.name}'s ${q.weaponType} qualification ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'} (${q.expirationDate}).`, recipientRoleId: STATE.qm.notifySettings.qualificationDueRoleId});
      }
    });
  });
  // pending equipment requests: notify the routed approver, or escalate if it's sat too long
  (STATE.qm.requests||[]).forEach(r=>{
    if(r.status==="Pending"){
      const days = daysBetween(r.createdDate, fmt(today));
      const rule = STATE.qm.requestRoutingRules.find(rr=>rr.id === r.routingRuleId) || STATE.qm.requestRoutingRules[0];
      const escalate = rule && days >= rule.escalationDays;
      upcoming.push({
        type:"request_pending", entityId:r.id,
        message: `${personName(r.requesterId)} requested ${r.quantity}x "${r.itemDescription}" ${days}d ago${escalate?' \u2014 escalated, awaiting decision':''}.`,
        recipientRoleId: escalate ? (rule.escalationRoleId || STATE.qm.notifySettings.requestPendingRoleId) : r.approverRoleId,
      });
    } else if(r.decisionDate && daysBetween(r.decisionDate, fmt(today)) <= 5){
      const requester = STATE.personnel.find(p=>p.id===r.requesterId);
      if(requester){
        upcoming.push({type:"request_decided", entityId:r.id, message:`Your request for "${r.itemDescription}" was ${r.status.toLowerCase()}. ${r.decisionNotes||''}`.trim(), recipientRoleId: (requester.roleIds||[])[0]});
      }
    }
  });
  // merge with existing read-state: keep read flag if the same alert already existed
  const prevReadBy = {};
  STATE.qm.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.qm.notifications = upcoming.map((n,i)=>({
    id: n.type+'_'+n.entityId,
    ts: fmt(today),
    type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
    readBy: prevReadBy[n.type+'|'+n.entityId] || [],
  }));
}
function unreadNotificationCount(){ return STATE.qm.notifications.filter(n=>!n.read).length; }


/* =========================================================================
   DASHBOARD
   ========================================================================= */
// TOP_WIDGETS mirrors the four pinned cards already wired for click-navigation -- they are never
// hidden, resized, or removed, only reordered amongst themselves.
const TOP_WIDGETS = [
  {id:"stat_total_assets", label:"Total Assets"},
  {id:"stat_currently_assigned", label:"Currently Assigned"},
  {id:"stat_overdue_returns_count", label:"Overdue Returns (count)"},
  {id:"stat_in_maintenance", label:"In Maintenance"},
];
// Everything that used to be a fixed panel below the top row is now an optional, addable,
// draggable, resizable widget. All five are enabled by default so an existing tenant's dashboard
// looks the same on first login after this update -- nothing disappears, it just becomes movable.
const EXTRA_WIDGETS = [
  {id:"list_overdue_returns", label:"Overdue Returns (list)", defaultSize:"half"},
  {id:"list_recent_activity", label:"Recent Activity", defaultSize:"half"},
  {id:"list_low_stock", label:"Low Stock Consumables", defaultSize:"half"},
  {id:"list_open_maintenance", label:"Open & Scheduled Maintenance", defaultSize:"half"},
  {id:"list_replacement_due", label:"Approaching / Past Replacement Date", defaultSize:"full"},
];
const DEFAULT_EXTRAS = EXTRA_WIDGETS.map(w=>({id:w.id, size:w.defaultSize}));
function myWidgetPrefs(){
  let p = STATE.qm.dashboardPrefs[CURRENT_USER_ID];
  const topIds = TOP_WIDGETS.map(w=>w.id), extraIds = EXTRA_WIDGETS.map(w=>w.id);
  if(!p || (!p.topOrder && !p.extras)){
    p = { topOrder:[...topIds], extras: DEFAULT_EXTRAS.map(e=>({...e})) };
    STATE.qm.dashboardPrefs[CURRENT_USER_ID] = p;
  }
  if(!Array.isArray(p.topOrder)) p.topOrder = [...topIds];
  if(!Array.isArray(p.extras)) p.extras = [];
  p.topOrder = [...p.topOrder.filter(id=>topIds.includes(id)), ...topIds.filter(id=>!p.topOrder.includes(id))];
  p.extras = p.extras.filter(e=>e && extraIds.includes(e.id));
  return p;
}
function renderWidget(id){
  if(id==='stat_total_assets'){
    const eq = visibleEquipment();
    const totalValue = eq.reduce((s,e)=>s+e.value,0);
    return `<button class="stat-card dash-clickable" data-nav-dest="qm-inventory"><div class="label">Total Assets</div><div class="value">${eq.length}</div><div class="delta neutral">${money(totalValue)} total value</div></button>`;
  }
  if(id==='stat_currently_assigned'){
    const eq = visibleEquipment();
    const assigned = eq.filter(e=>e.status==="Assigned").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="qm-assignments"><div class="label">Currently Assigned</div><div class="value">${assigned}</div><div class="delta neutral">${(eq.length ? Math.round(assigned/eq.length*100) : 0)}% of inventory in the field</div></button>`;
  }
  if(id==='stat_overdue_returns_count'){
    const overdue = STATE.qm.assignments.filter(a=>a.status==="Overdue");
    return `<button class="stat-card dash-clickable" data-nav-dest="qm-assignments"><div class="label">Overdue Returns</div><div class="value" style="color:${overdue.length?'var(--red)':'var(--navy)'}">${overdue.length}</div><div class="delta ${overdue.length?'warn':'ok'}">${overdue.length? 'Needs follow-up' : 'All caught up'}</div></button>`;
  }
  if(id==='stat_in_maintenance'){
    const eq = visibleEquipment();
    const maintenance = eq.filter(e=>e.status==="Maintenance").length;
    const needsAttention = eq.filter(e=>e.condition==="Needs Repair" || e.condition==="Damaged").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="qm-maintenance"><div class="label">In Maintenance</div><div class="value">${maintenance}</div><div class="delta ${needsAttention?'warn':'neutral'}">${needsAttention} flagged needs repair</div></button>`;
  }
  if(id==='list_overdue_returns'){
    const overdue = STATE.qm.assignments.filter(a=>a.status==="Overdue").sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
    const rows = overdue.map(a=>{
      const item = equipmentById(a.equipmentId);
      const days = Math.abs(daysBetween(a.dueDate, fmt(new Date())));
      return `<tr><td>${eqLink(item)}<div class="mono">${item.assetId}</div></td><td>${escapeHtml(targetName(a.assignedToType, a.targetId))}</td><td>${a.dueDate}</td><td><span class="badge badge-overdue">${days}d overdue</span></td></tr>`;
    }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:18px;">Nothing overdue right now.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Overdue Returns</h2><span class="hint">Sorted by days overdue</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Item</th><th>Checked out to</th><th>Due</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='list_recent_activity'){
    const rows = STATE.qm.activity.slice().reverse().slice(0,6).map(a=>`<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);"><div class="mono" style="width:78px;flex-shrink:0;color:var(--text-dim);">${a.ts}</div><div style="font-size:13px;">${escapeHtml(a.text)}</div></div>`).join('');
    return `<div class="panel"><div class="panel-head"><h2>Recent Activity</h2></div><div class="panel-body">${rows}</div></div>`;
  }
  if(id==='list_low_stock'){
    const eq = visibleEquipment();
    const lowStock = eq.filter(e=>e.isConsumable && e.minQuantity!=null && e.quantity<=e.minQuantity);
    const rows = lowStock.map(e=>`<tr><td>${eqLink(e)}</td><td>${escapeHtml(e.location)}</td><td><span class="qty-low">${e.quantity}</span> / min ${e.minQuantity}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">All consumables are above threshold.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Low Stock Consumables</h2><span class="hint">${lowStock.length} at or below threshold</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Item</th><th>Location</th><th>On Hand</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='list_open_maintenance'){
    const openMaint = STATE.qm.maintenance.filter(m=>m.status==="Open" || m.status==="Scheduled");
    const rows = openMaint.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(m=>{
      const eqItem = equipmentById(m.equipmentId);
      return `<tr><td>${eqLink(eqItem)}</td><td>${m.type}</td><td>${m.date}</td><td><span class="badge ${m.status==='Open'?'badge-maintenance':'badge-assigned'}">${m.status}</span></td></tr>`;
    }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing open or scheduled.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Open &amp; Scheduled Maintenance</h2><span class="hint">${openMaint.length} in progress</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Item</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='list_replacement_due'){
    const replacementDue = STATE.qm.notifications.filter(n=>n.type==="replacement_due");
    const rows = replacementDue.map(n=>{
      const it = equipmentById(n.entityId);
      return `<tr><td>${eqLink(it)}</td><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`;
    }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing approaching its replacement date.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Approaching / Past Replacement Date</h2><span class="hint">${replacementDue.length} item(s) within 60 days or overdue</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Item</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
}
const DASH_SIZE_LABELS = {quarter:'\u00bc', half:'\u00bd', threeQuarter:'\u00be', full:'Full'};
function renderTopWidget(id){
  return `<div class="dash-widget" data-widget-id="${id}">
    <div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>
    ${renderWidget(id)}
  </div>`;
}
function renderExtraWidget(id, size){
  return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}">
    <div class="dash-widget-toolbar">
      <span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span>
      <button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size]||'\u00bd'}</button>
      <button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button>
    </div>
    ${renderWidget(id)}
  </div>`;
}
function wireDashDragDrop(zone, orderedArray, isExtras){
  if(!zone) return;
  let draggedId = null;
  zone.querySelectorAll('.dash-drag-handle').forEach(handle=>{
    handle.setAttribute('draggable','true');
    handle.addEventListener('dragstart', e=>{
      const card = handle.closest('[data-widget-id]');
      if(!card) return;
      draggedId = card.dataset.widgetId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setDragImage(card, 24, 24); }catch(err){}
    });
    handle.addEventListener('dragend', ()=>{
      zone.querySelectorAll('.dash-widget').forEach(c=>c.classList.remove('dragging','dash-drop-target'));
      draggedId = null;
    });
  });
  zone.querySelectorAll('[data-widget-id]').forEach(card=>{
    card.addEventListener('dragover', e=>{
      if(!draggedId || draggedId===card.dataset.widgetId) return;
      e.preventDefault();
      card.classList.add('dash-drop-target');
    });
    card.addEventListener('dragleave', ()=>card.classList.remove('dash-drop-target'));
    card.addEventListener('drop', e=>{
      e.preventDefault();
      card.classList.remove('dash-drop-target');
      const targetId = card.dataset.widgetId;
      if(!draggedId || draggedId===targetId) return;
      if(isExtras){
        const fromIdx = orderedArray.findIndex(x=>x.id===draggedId);
        const toIdx = orderedArray.findIndex(x=>x.id===targetId);
        if(fromIdx<0 || toIdx<0) return;
        const [moved] = orderedArray.splice(fromIdx,1);
        orderedArray.splice(toIdx,0,moved);
      }else{
        const fromIdx = orderedArray.indexOf(draggedId);
        const toIdx = orderedArray.indexOf(targetId);
        if(fromIdx<0 || toIdx<0) return;
        orderedArray.splice(fromIdx,1);
        orderedArray.splice(toIdx,0,draggedId);
      }
      persist();
      renderDashboard();
    });
  });
}
function openCustomizeDashboardModal(){
  const prefs = myWidgetPrefs();
  const enabled = new Set(prefs.extras.map(e=>e.id));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add / Remove Widgets</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Check the widgets you want on your dashboard. Once added, drag any widget's handle to reposition it, and use its resize button to change how much room it takes up.</div>
      ${EXTRA_WIDGETS.map(w=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">
        <input type="checkbox" class="widgetCheck" data-widget-id="${w.id}" ${enabled.has(w.id)?'checked':''} style="width:auto;">
        <span style="flex:1;font-size:13px;">${escapeHtml(w.label)}</span>
      </div>`).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const checked = Array.from(document.querySelectorAll('.widgetCheck')).filter(c=>c.checked).map(c=>c.dataset.widgetId);
    const stillThere = prefs.extras.filter(e=>checked.includes(e.id));
    const added = checked.filter(id=>!prefs.extras.some(e=>e.id===id)).map(id=>({id, size:(EXTRA_WIDGETS.find(w=>w.id===id)||{}).defaultSize||'half'}));
    prefs.extras = [...stillThere, ...added];
    logActivity(`Customized personal Quartermaster dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
    persist();
    toast("Dashboard saved.");
    closeModal();
    renderDashboard();
  };
}
function renderDashboard(){
  recalcNotifications();
  const prefs = myWidgetPrefs();
  const root = document.getElementById('view-qm-dashboard');
  root.innerHTML = `
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Drag the handle on any card to rearrange it. This layout is saved to your account only.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map(id=>renderTopWidget(id)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map(e=>renderExtraWidget(e.id,e.size)).join('')}
    </div>
  `;
  // Navigation hub follows the other dashboard-first modules.
  const destinations=NAV_ITEMS.filter(item=>item.id!=='qm-dashboard' && navItemVisible(item));
  const hub=document.createElement('div');
  hub.className='qm-hub-grid';
  hub.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:14px;margin-bottom:20px;';
  hub.innerHTML=destinations.map((item,i)=>`<button class="qm-hub-card" data-qm-destination="${item.id}" style="min-height:140px;text-align:left;padding:19px;border:1px solid var(--border);border-radius:12px;background:var(--panel);color:inherit;cursor:pointer;font:inherit;"><div style="color:${['#4D8DFF','#43D59B','#B47CFF','#FF9F43','#20C7D9'][i%5]};width:30px;height:30px;margin-bottom:12px;">${ICONS[item.icon]||ICONS.box}</div><strong style="display:block;color:var(--heading);font-size:16px;margin-bottom:8px;">${escapeHtml(item.label)}</strong><span style="font-size:12px;color:var(--text-dim);line-height:1.45;">${escapeHtml(item.sub)}</span></button>`).join('');
  root.prepend(hub);
  hub.querySelectorAll('[data-qm-destination]').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.qmDestination));
  const equipment = visibleEquipment();
  const categories = [...new Set(equipment.map(item=>item.category))].sort();
  const categoryRows = categories.map(category=>{
    const items = equipment.filter(item=>item.category===category);
    return `<tr><td>${escapeHtml(category || 'Uncategorized')}</td><td>${items.length}</td><td>${money(items.reduce((sum,item)=>sum+(Number(item.value)||0),0))}</td></tr>`;
  }).join('') || '<tr><td colspan="3">No inventory available.</td></tr>';
  const panels = [
    ['Inventory by Category', `<div class="panel-body" style="overflow:auto"><table><thead><tr><th>Category</th><th>Assets</th><th>Value</th></tr></thead><tbody>${categoryRows}</tbody></table></div>`],
    ['Upcoming Maintenance/Inspections', renderWidget('list_open_maintenance')],
    ['Recent Quartermaster Activity', renderWidget('list_recent_activity')],
    ['Low Stock Items', renderWidget('list_low_stock')],
  ];
  const status = document.createElement('div');
  status.className = 'qm-status-panels';
  status.innerHTML = panels.map(([title,content])=>`<details style="border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-bottom:14px"><summary style="padding:16px 20px;cursor:pointer;font-weight:800">${title}</summary><div style="overflow:auto">${content}</div></details>`).join('');
  const extras = root.querySelector('#dashExtrasZone');
  extras.before(status);
  const details = document.createElement('details');
  details.style.cssText='border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-top:14px';
  const summary = document.createElement('summary');
  summary.style.cssText='padding:16px 20px;cursor:pointer;font-weight:800';
  summary.textContent='My Customizable Widgets';
  extras.before(details);
  details.append(summary,extras);
  wireEqLinks();
  // Every one of these is scoped to `root`, this module's own dashboard container, rather than
  // searched for across the whole document. Every module's dashboard uses the same internal ids
  // (dashTopZone, dashExtrasZone, btnCustomizeDashboard), and every module's dashboard markup is
  // sitting in the page at the same time, just hidden behind CSS when it isn't the active one.
  // An unscoped document.getElementById would happily return a DIFFERENT, hidden module's element
  // that merely happens to come first in the page, so the click handlers would end up wired to
  // something invisible instead of what's actually on screen.
  root.querySelectorAll('[data-nav-dest]').forEach(b=>b.addEventListener('click', ()=>switchView(b.dataset.navDest)));
  wireDashDragDrop(root.querySelector('#dashTopZone'), prefs.topOrder, false);
  wireDashDragDrop(root.querySelector('#dashExtrasZone'), prefs.extras, true);
  root.querySelectorAll('[data-widget-size-cycle]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    const entry = prefs.extras.find(x=>x.id===b.dataset.widgetSizeCycle);
    if(!entry) return;
    const order = ['quarter','half','threeQuarter','full'];
    entry.size = order[(order.indexOf(entry.size)+1) % order.length];
    persist(); renderDashboard();
  }));
  root.querySelectorAll('[data-widget-remove]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    prefs.extras = prefs.extras.filter(x=>x.id!==b.dataset.widgetRemove);
    persist(); renderDashboard();
  }));
  const custBtn = root.querySelector('#btnCustomizeDashboard');
  if(custBtn) custBtn.addEventListener('click', openCustomizeDashboardModal);
}

/* =========================================================================
   INVENTORY
   ========================================================================= */
let INV_FILTER = {q:"", category:"All", status:"All", location:"All"};
let INV_SELECTED = new Set();

function invSortValue(e, key){
  switch(key){
    case 'assignedTo': return e.assignedTo ? targetName(e.assignedToType, e.assignedTo).toLowerCase() : '';
    case 'quantity': return e.isConsumable ? e.quantity : 1;
    case 'serialNumber': return e.serialNumber || '';
    default: {
      const v = e[key];
      return typeof v==='string' ? v.toLowerCase() : v;
    }
  }
}

function renderInventory(){
  const canAdd = can('qm_equip_add');
  const canEdit = can('qm_equip_edit');
  const canDelete = can('qm_equip_delete');

  const filtered = visibleEquipment().filter(e=>{
    const q = INV_FILTER.q.toLowerCase();
    const matchQ = !q || e.name.toLowerCase().includes(q) || e.assetId.toLowerCase().includes(q) || (e.serialNumber||'').toLowerCase().includes(q);
    const matchCat = INV_FILTER.category==="All" || e.category===INV_FILTER.category;
    const matchStatus = INV_FILTER.status==="All" || e.status===INV_FILTER.status;
    const matchLoc = INV_FILTER.location==="All" || e.location===INV_FILTER.location;
    return matchQ && matchCat && matchStatus && matchLoc;
  });

  const s = SORT.inventory;
  filtered.sort((a,b)=>{
    const av = invSortValue(a,s.key), bv = invSortValue(b,s.key);
    if(av<bv) return s.dir==='asc'?-1:1;
    if(av>bv) return s.dir==='asc'?1:-1;
    return 0;
  });

  const rows = filtered.map(e=>{
    const low = e.isConsumable && e.minQuantity!=null && e.quantity<=e.minQuantity;
    return `
    <tr>
      <td>${canEdit ? `<input type="checkbox" class="inv-check" data-eq-check="${e.id}" ${INV_SELECTED.has(e.id)?'checked':''}>` : ""}</td>
      <td class="mono">${e.assetId}</td>
      <td><a href="#" data-open-eq="${e.id}" class="record-link">${escapeHtml(e.name)}</a></td>
      <td class="mono">${e.serialNumber ? escapeHtml(e.serialNumber) : "—"}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.condition)}</td>
      <td>${escapeHtml(e.location)}</td>
      <td><span class="badge ${statusBadgeClass(e.status)}">${e.status}</span></td>
      <td>${e.assignedTo ? escapeHtml(targetName(e.assignedToType, e.assignedTo)) : "—"}</td>
      <td>${e.isConsumable ? `<span class="${low?'qty-low':''}">${e.quantity}${low?' &#9888;':''}</span>` : "1"}</td>
      <td>${money(e.value)}</td>
      <td>
        <div class="cell-actions">
          ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-eq="${e.id}">${ICONS.edit} Edit</button>` : ""}
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-eq="${e.id}">${ICONS.trash} Delete</button>` : ""}
        </div>
      </td>
    </tr>
  `;}).join('') || `<tr><td colspan="12"><div class="empty-state">${ICONS.empty}<div class="msg">No equipment matches these filters</div><div class="sub">Try clearing the search or category filter</div></div></td></tr>`;

  const cols = [
    [fieldLabel('qm.assetId'),'assetId'], [fieldLabel('qm.itemName'),'name'], ['Serial #','serialNumber'], [fieldLabel('qm.category'),'category'],
    [fieldLabel('qm.condition'),'condition'], [fieldLabel('qm.location'),'location'], [fieldLabel('qm.status'),'status'],
    [fieldLabel('qm.assignedTo'),'assignedTo'], ['Qty','quantity'], ['Value','value'],
  ];
  const headHtml = `<th>${canEdit?`<input type="checkbox" id="invCheckAll">`:''}</th>` + cols.map(([label,key])=>sortHeaderHtml(label,'inventory',key)).join('') + '<th>Actions</th>';

  document.getElementById('view-qm-inventory').innerHTML = `
    ${!canAdd && !canEdit ? lockedNote("You're viewing this role's read-only access. Switch to a role with edit permissions to manage inventory.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="invSearch" title="Filters the inventory below as you type, matching item name, asset ID, or serial number" placeholder="Search by name, asset ID, or serial..." style="width:230px;" value="${escapeHtml(INV_FILTER.q)}">
        <select id="invCat" title="Filter the inventory to a single equipment category">
          <option ${INV_FILTER.category==="All"?"selected":""}>All</option>
          ${STATE.qm.refData.categories.map(c=>`<option ${INV_FILTER.category===c?"selected":""}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <select id="invLocation" title="Filter the inventory to a single storage location">
          <option ${INV_FILTER.location==="All"?"selected":""}>All</option>
          ${STATE.qm.refData.locations.map(l=>`<option ${INV_FILTER.location===l?"selected":""}>${escapeHtml(l)}</option>`).join('')}
        </select>
        <select id="invStatus" title="Filter the inventory to a single status (e.g. Available, Assigned, Maintenance)">
          <option ${INV_FILTER.status==="All"?"selected":""}>All</option>
          ${EQUIPMENT_STATUSES.map(s=>`<option ${INV_FILTER.status===s?"selected":""}>${s}</option>`).join('')}
        </select>
        <input type="text" id="invBarcodeScan" placeholder="Scan barcode/QR/RFID + Enter" style="width:210px;" title="Works with any USB/Bluetooth barcode, QR, or RFID reader configured in keyboard-wedge mode - they all just type the code followed by Enter, same as typing it by hand">
      </div>
      ${canAdd ? `<button class="btn btn-primary" id="btnAddEq">${ICONS.plus} Add Equipment</button>` : ""}
    </div>
    ${canEdit ? `<div class="toolbar" id="bulkBar" style="${INV_SELECTED.size?'':'display:none;'}background:var(--callout-blue-bg);border:1px solid var(--callout-blue-border);border-radius:5px;padding:8px 12px;">
      <div style="font-size:12.5px;font-weight:700;color:var(--heading);">${INV_SELECTED.size} selected</div>
      <div style="display:flex;gap:8px;">
        <select id="bulkField">
          <option value="status">Set Status</option>
          <option value="location">Set Location</option>
          <option value="category">Set Category</option>
          <option value="condition">Set Condition</option>
        </select>
        <select id="bulkValue"></select>
        <button class="btn btn-sm btn-primary" id="btnApplyBulk">Apply to Selected</button>
        <button class="btn btn-sm btn-outline" id="btnClearBulk">Clear Selection</button>
      </div>
    </div>` : ""}
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Showing ${filtered.length} of ${STATE.qm.equipment.length} assets &bull; click a column header to sort, click an item name for full history</div>
  `;

  document.getElementById('invSearch').addEventListener('input', e=>{INV_FILTER.q=e.target.value; renderInventory(); refocusFilterInput('invSearch');});
  document.getElementById('invCat').addEventListener('change', e=>{INV_FILTER.category=e.target.value; renderInventory();});
  document.getElementById('invLocation').addEventListener('change', e=>{INV_FILTER.location=e.target.value; renderInventory();});
  document.getElementById('invStatus').addEventListener('change', e=>{INV_FILTER.status=e.target.value; renderInventory();});
  document.getElementById('invBarcodeScan').addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      const code = e.target.value.trim();
      if(!code) return;
      const match = STATE.qm.equipment.find(eq=>(eq.serialNumber||'').toLowerCase()===code.toLowerCase() || eq.assetId.toLowerCase()===code.toLowerCase());
      if(match){ e.target.value=''; openEquipmentDetail(match.id); }
      else { toast(`No item found matching "${code}".`, true); }
    }
  });
  const addBtn = document.getElementById('btnAddEq');
  if(addBtn) addBtn.addEventListener('click', ()=>openEquipmentModal(null));
  document.querySelectorAll('[data-edit-eq]').forEach(b=>b.addEventListener('click', ()=>openEquipmentModal(b.dataset.editEq)));
  document.querySelectorAll('[data-del-eq]').forEach(b=>b.addEventListener('click', ()=>deleteEquipment(b.dataset.delEq)));
  document.querySelectorAll('[data-open-eq]').forEach(a=>a.addEventListener('click', (ev)=>{ev.preventDefault(); openEquipmentDetail(a.dataset.openEq);}));
  wireSortHeaders('inventory', renderInventory);

  if(canEdit){
    document.querySelectorAll('[data-eq-check]').forEach(chk=>{
      chk.addEventListener('change', ()=>{
        if(chk.checked) INV_SELECTED.add(chk.dataset.eqCheck); else INV_SELECTED.delete(chk.dataset.eqCheck);
        renderInventory();
      });
    });
    const checkAll = document.getElementById('invCheckAll');
    if(checkAll) checkAll.addEventListener('change', (e)=>{
      filtered.forEach(eq=> e.target.checked ? INV_SELECTED.add(eq.id) : INV_SELECTED.delete(eq.id));
      renderInventory();
    });
    const bulkField = document.getElementById('bulkField');
    const bulkValue = document.getElementById('bulkValue');
    const populateBulkValues = ()=>{
      const f = bulkField.value;
      const opts = f==='status' ? EQUIPMENT_STATUSES : f==='location' ? STATE.qm.refData.locations : f==='category' ? STATE.qm.refData.categories : CONDITIONS;
      bulkValue.innerHTML = opts.map(o=>`<option>${escapeHtml(o)}</option>`).join('');
    };
    if(bulkField){ populateBulkValues(); bulkField.addEventListener('change', populateBulkValues); }
    const applyBtn = document.getElementById('btnApplyBulk');
    if(applyBtn) applyBtn.addEventListener('click', ()=>{
      const field = bulkField.value, value = bulkValue.value;
      let count = 0;
      STATE.qm.equipment.forEach(eq=>{
        if(INV_SELECTED.has(eq.id)){ eq[field]=value; count++; }
      });
      logActivity(`Mass update: set ${field} to "${value}" on ${count} item(s).`, "bulk");
      persist();
      toast(`Updated ${count} item(s).`);
      INV_SELECTED.clear();
      renderInventory();
    });
    const clearBtn = document.getElementById('btnClearBulk');
    if(clearBtn) clearBtn.addEventListener('click', ()=>{ INV_SELECTED.clear(); renderInventory(); });
  }
}

function lockedNote(msg){
  return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`;
}

function generateBarcodeValue(){
  return "AUTO-" + Math.random().toString(36).slice(2,6).toUpperCase() + "-" + Date.now().toString().slice(-6);
}

function openEquipmentModal(id){
  const editing = !!id;
  const item = editing ? equipmentById(id) : {
    assetId:"QM-"+(1000+STATE.qm.equipment.length+1), name:"", category:STATE.qm.refData.categories[0], condition:"New",
    location:STATE.qm.refData.locations[0], value:0, purchaseDate: fmt(new Date()), inServiceDate: fmt(new Date()), replacementDate:"",
    status:"Available", notes:"", serialNumber:"", isConsumable:false, quantity:1, minQuantity:"",
    equipmentType: STATE.qm.refData.equipmentTypes[0], vendorId:"", agency: STATE.qm.refData.agencies[0], disposal:null,
    manufacturer:"", model:"", ownershipType:"Agency", personalWeaponAuth:null, isSharedAsset:false, photoDataUrl:null, homeUnit:"",
  };
  const showDisposal = ["Retired","Lost","Stolen","Destroyed"].includes(item.status);
  const showPersonalAuth = item.ownershipType === "Personal";
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?"Edit Equipment":"Add Equipment"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Asset ID</label><input type="text" id="fAssetId" value="${escapeHtml(item.assetId)}"></div>
        <div class="form-row"><label>Value ($ per unit)</label><input type="number" id="fValue" value="${item.value}"></div>
      </div>
      <div class="form-row"><label>Name</label><input type="text" id="fName" value="${escapeHtml(item.name)}" placeholder="e.g. Aegis II Ballistic Vest - Size M"></div>
      <div class="form-2col">
        <div class="form-row"><label>Manufacturer</label><input type="text" id="fManufacturer" value="${escapeHtml(item.manufacturer||'')}" placeholder="e.g. Glock"></div>
        <div class="form-row"><label>Model</label><input type="text" id="fModel" value="${escapeHtml(item.model||'')}" placeholder="e.g. 22 Gen4"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Category</label><select id="fCategory">${STATE.qm.refData.categories.map(c=>`<option ${item.category===c?"selected":""}>${escapeHtml(c)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Equipment Type</label><select id="fEquipType">${STATE.qm.refData.equipmentTypes.map(c=>`<option ${item.equipmentType===c?"selected":""}>${escapeHtml(c)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Condition</label><select id="fCondition">${CONDITIONS.map(c=>`<option ${item.condition===c?"selected":""}>${c}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fStatus">${EQUIPMENT_STATUSES.map(s=>`<option ${item.status===s?"selected":""}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><select id="fLocation">${STATE.qm.refData.locations.map(l=>`<option ${item.location===l?"selected":""}>${escapeHtml(l)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Agency</label><select id="fAgency">${STATE.qm.refData.agencies.map(a=>`<option ${item.agency===a?"selected":""}>${escapeHtml(a)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Home Unit (optional -- for agencies scoping equipment visibility by unit)</label><select id="fHomeUnit"><option value="">— none —</option>${(STATE.pm?.refData?.units||[]).map(u=>`<option ${item.homeUnit===u?"selected":""}>${escapeHtml(u)}</option>`).join('')}</select></div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fIsShared" ${item.isSharedAsset?'checked':''} style="width:auto;">
          Shared task-force asset (visible to every agency regardless of role scope, e.g. joint SWAT gear)
        </label>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Vendor</label><select id="fVendor"><option value="">— none —</option>${STATE.qm.refData.vendors.map(v=>`<option value="${v.id}" ${item.vendorId===v.id?"selected":""}>${escapeHtml(v.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Purchase Date</label><input type="date" id="fPurchase" value="${item.purchaseDate}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>In-Service Date</label><input type="date" id="fInService" value="${item.inServiceDate||''}"></div>
        <div class="form-row"><label>Replacement / Expiration Date</label><input type="date" id="fReplacement" value="${item.replacementDate||''}"></div>
      </div>
      <div class="form-row">
        <label style="display:block;margin-bottom:5px;">Ownership</label>
        <select id="fOwnership">
          <option value="Agency" ${item.ownershipType==="Agency"?"selected":""}>Agency-Owned</option>
          <option value="Personal" ${item.ownershipType==="Personal"?"selected":""}>Personally-Owned (authorized duty weapon)</option>
        </select>
      </div>
      <div id="fPersonalAuthWrap" class="form-2col" style="${showPersonalAuth?'':'display:none;'}background:var(--callout-yellow-bg);border:1px solid var(--callout-yellow-border);border-radius:5px;padding:10px 12px;margin-bottom:13px;">
        <div class="form-row"><label>Authorized By</label><input type="text" id="fAuthBy" value="${item.personalWeaponAuth?escapeHtml(item.personalWeaponAuth.authorizedBy||''):''}" placeholder="e.g. Rangemaster name"></div>
        <div class="form-row"><label>Authorization Date</label><input type="date" id="fAuthDate" value="${item.personalWeaponAuth?item.personalWeaponAuth.authorizedDate||'':''}"></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fIsConsumable" ${item.isConsumable?'checked':''} style="width:auto;">
          Tracked as a consumable (managed by quantity on hand, not an individual serial)
        </label>
      </div>
      <div id="fSerialWrap" class="form-row" style="${item.isConsumable?'display:none;':''}">
        <label>Serial / barcode / QR number</label>
        <div style="display:flex;gap:6px;">
          <input type="text" id="fSerial" value="${escapeHtml(item.serialNumber||"")}" placeholder="Optional - leave blank if not individually serialized" style="flex:1;">
          <button type="button" class="btn btn-sm btn-outline" id="btnGenBarcode">Generate</button>
        </div>
        <div id="fSerialWarning" style="color:var(--red);font-size:12px;margin-top:4px;display:none;">That serial number is already assigned to another item.</div>
      </div>
      <div id="fQtyWrap" class="form-2col" style="${item.isConsumable?'':'display:none;'}">
        <div class="form-row"><label>Quantity on hand</label><input type="number" id="fQuantity" value="${item.quantity||0}"></div>
        <div class="form-row"><label>Low-stock threshold</label><input type="number" id="fMinQuantity" value="${item.minQuantity||""}" placeholder="e.g. 10"></div>
      </div>
      <div class="form-row">
        <label>Photo</label>
        <div style="display:flex;align-items:center;gap:12px;">
          ${item.photoDataUrl ? `<img src="${item.photoDataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:5px;border:1px solid var(--border);">` : `<div style="width:64px;height:64px;border-radius:5px;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:10px;text-align:center;">No photo</div>`}
          <input type="file" id="fPhoto" accept="image/*" style="flex:1;">
        </div>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Stored as a small thumbnail in this prototype's data record; a production build would use object storage instead.</div>
      </div>
      <div id="fDisposalWrap" style="${showDisposal?'':'display:none;'}background:var(--callout-red-bg);border:1px solid var(--callout-red-border);border-radius:5px;padding:10px 12px;margin-bottom:13px;">
        <div style="font-size:12px;font-weight:800;color:var(--red);margin-bottom:8px;">Disposal Details</div>
        <div class="form-2col">
          <div class="form-row"><label>Disposal Method</label><select id="fDisposalMethod">${STATE.qm.refData.disposalMethods.map(m=>`<option ${item.disposal&&item.disposal.method===m?"selected":""}>${escapeHtml(m)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Disposal Date</label><input type="date" id="fDisposalDate" value="${item.disposal?item.disposal.date:fmt(new Date())}"></div>
        </div>
        <div class="form-row"><label>Reason</label><textarea id="fDisposalReason" rows="2">${escapeHtml(item.disposal?item.disposal.reason:'')}</textarea></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fNotes" rows="2">${escapeHtml(item.notes||"")}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing?"Save Changes":"Add Equipment"}</button>
    </div>
  `;
  openModal();
  let pendingPhotoDataUrl = item.photoDataUrl || null;
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fIsConsumable').addEventListener('change', (e)=>{
    document.getElementById('fSerialWrap').style.display = e.target.checked ? 'none' : '';
    document.getElementById('fQtyWrap').style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('fOwnership').addEventListener('change', (e)=>{
    document.getElementById('fPersonalAuthWrap').style.display = e.target.value==='Personal' ? '' : 'none';
  });
  document.getElementById('btnGenBarcode').addEventListener('click', ()=>{
    document.getElementById('fSerial').value = generateBarcodeValue();
    document.getElementById('fSerialWarning').style.display = 'none';
  });
  document.getElementById('fSerial').addEventListener('input', (e)=>{
    const v = e.target.value.trim().toLowerCase();
    const dup = v && STATE.qm.equipment.some(eq => eq.id!==item.id && (eq.serialNumber||'').toLowerCase()===v);
    document.getElementById('fSerialWarning').style.display = dup ? '' : 'none';
  });
  document.getElementById('fPhoto').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev)=>{
      img.onload = ()=>{
        const canvas = document.createElement('canvas');
        const size = 160;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size/img.width, size/img.height);
        const w = img.width*scale, h = img.height*scale;
        ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
        pendingPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        toast("Photo attached (will save with this item).");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('fStatus').addEventListener('change', (e)=>{
    document.getElementById('fDisposalWrap').style.display = ["Retired","Lost","Stolen","Destroyed"].includes(e.target.value) ? '' : 'none';
  });
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fName').value.trim();
    if(!name){ toast("Enter a name for this item.", true); return; }
    const isConsumable = document.getElementById('fIsConsumable').checked;
    const status = document.getElementById('fStatus').value;
    const needsDisposal = ["Retired","Lost","Stolen","Destroyed"].includes(status);
    const ownershipType = document.getElementById('fOwnership').value;
    const serialNumber = isConsumable ? null : (document.getElementById('fSerial').value.trim() || null);
    if(serialNumber){
      const dup = STATE.qm.equipment.some(eq => eq.id!==item.id && (eq.serialNumber||'').toLowerCase()===serialNumber.toLowerCase());
      if(dup){ toast("That serial number is already in use on another item. Serial numbers must be unique.", true); return; }
    }
    const data = {
      assetId: document.getElementById('fAssetId').value.trim(),
      name, manufacturer: document.getElementById('fManufacturer').value.trim() || null, model: document.getElementById('fModel').value.trim() || null,
      category: document.getElementById('fCategory').value,
      equipmentType: document.getElementById('fEquipType').value,
      condition: document.getElementById('fCondition').value,
      status,
      location: document.getElementById('fLocation').value,
      agency: document.getElementById('fAgency').value,
      homeUnit: document.getElementById('fHomeUnit').value,
      isSharedAsset: document.getElementById('fIsShared').checked,
      vendorId: document.getElementById('fVendor').value || null,
      value: Number(document.getElementById('fValue').value)||0,
      purchaseDate: document.getElementById('fPurchase').value,
      inServiceDate: document.getElementById('fInService').value,
      replacementDate: document.getElementById('fReplacement').value || null,
      notes: document.getElementById('fNotes').value,
      isConsumable,
      serialNumber,
      quantity: isConsumable ? (Number(document.getElementById('fQuantity').value)||0) : 1,
      minQuantity: isConsumable ? (document.getElementById('fMinQuantity').value ? Number(document.getElementById('fMinQuantity').value) : null) : null,
      ownershipType,
      personalWeaponAuth: ownershipType==='Personal' ? {
        authorizedBy: document.getElementById('fAuthBy').value.trim(),
        authorizedDate: document.getElementById('fAuthDate').value,
      } : null,
      photoDataUrl: pendingPhotoDataUrl,
      disposal: needsDisposal ? {
        method: document.getElementById('fDisposalMethod').value,
        date: document.getElementById('fDisposalDate').value,
        reason: document.getElementById('fDisposalReason').value.trim(),
      } : null,
    };
    if(editing){
      const changes = Object.keys(data).filter(key=>key!=='photoDataUrl' && JSON.stringify(item[key] ?? null)!==JSON.stringify(data[key] ?? null));
      const prior = Object.fromEntries(changes.map(key=>[key,item[key]]));
      Object.assign(item, data);
      changes.forEach(key=>{
        const display = key.replace(/([A-Z])/g,' $1').toLowerCase();
        const isSensitive = ['notes','personalWeaponAuth','disposal'].includes(key);
        const valueText = value=>value==null || value==='' ? '(empty)' : typeof value==='object' ? '(structured value)' : String(value).slice(0,120);
        logActivity(isSensitive
          ? `${item.name} (${item.assetId}): ${display} updated.`
          : `${item.name} (${item.assetId}): ${display} changed from "${valueText(prior[key])}" to "${valueText(data[key])}".`,
          key==='status' && needsDisposal ? 'disposal' : 'equipment', item.id);
      });
      if(changes.length===0 && item.photoDataUrl!==data.photoDataUrl) logActivity(`${item.name} (${item.assetId}): equipment photo updated.`, 'equipment', item.id);
      toast("Equipment updated.");
    }else{
      const newItem = {id:"e"+(Date.now()), assignedTo:null, assignedToType:null, ...data};
      STATE.qm.equipment.push(newItem);
      logActivity(`${newItem.name} (${newItem.assetId}) added to inventory.`, "equipment", newItem.id);
      toast("Equipment added to inventory.");
    }
    persist();
    closeModal();
    renderInventory();
  };
}

function deleteEquipment(id){
  const item = equipmentById(id);
  if(!confirm(`Delete "${item.name}" (${item.assetId}) from inventory? This cannot be undone.`)) return;
  STATE.qm.equipment = STATE.qm.equipment.filter(e=>e.id!==id);
  STATE.qm.assignments = STATE.qm.assignments.filter(a=>a.equipmentId!==id);
  STATE.qm.maintenance = STATE.qm.maintenance.filter(m=>m.equipmentId!==id);
  STATE.qm.consumptionLog = STATE.qm.consumptionLog.filter(c=>c.equipmentId!==id);
  logActivity(`${item.name} (${item.assetId}) deleted from inventory.`, "equipment", id);
  persist();
  toast("Equipment deleted.");
  renderInventory();
}

/* ---------- Equipment detail drawer: overview / assignment history / maintenance ---------- */
let EQ_DETAIL_TAB = 'overview';

function fakeBarcodeSvg(text){
  if(!text) return '';
  let bars = ''; let x = 2;
  for(let i=0;i<text.length;i++){
    const code = text.charCodeAt(i);
    const w = 2 + (code % 3);
    const gap = 1 + (code % 2);
    bars += `<rect x="${x}" y="0" width="${w}" height="36" fill="#24364E"/>`;
    x += w + gap;
  }
  return `<svg viewBox="0 0 ${x+2} 36" style="width:100%;max-width:210px;height:36px;display:block;">${bars}</svg>`;
}

function openEquipmentDetail(id){
  const item = equipmentById(id);
  if(item && !canSeeEquipment(item)){
    toast("This item isn't visible to your current role.", true);
    return;
  }
  if(!SuiteUX.openRecord("qm","equipment",id)) return;

  EQ_DETAIL_TAB = 'overview';
  renderEquipmentDetailModal(id);
}

function renderEquipmentDetailModal(id){
  const item = equipmentById(id);
  if(!item){ closeModal(); return; }
  const tabs = [['overview','Overview'],['assignments','Assignment History'],['maintenance','Maintenance']];
  if(item.isConsumable) tabs.push(['consumption','Usage Log']);
  tabs.push(['photos','Photos']);
  tabs.push(['activity','Activity Log']);
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-wide';
  box.innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(item.name)}</h3>
        <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${item.assetId}${item.serialNumber ? ' &bull; SN '+escapeHtml(item.serialNumber) : ''}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${EQ_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-eq-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="eqDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-eq-tab]').forEach(b=>b.addEventListener('click', ()=>{ EQ_DETAIL_TAB=b.dataset.eqTab; renderEquipmentDetailModal(id); }));
  renderEqDetailTabContent(item);
}

function renderEqDetailTabContent(item){
  const body = document.getElementById('eqDetailBody');
  const canOOS = can('qm_maint_outofservice');
  const canEdit = can('qm_equip_edit');

  if(EQ_DETAIL_TAB==='overview'){
    const replDays = item.replacementDate ? daysBetween(fmt(new Date()), item.replacementDate) : null;
    body.innerHTML = `
      ${canEdit ? `<div style="margin-bottom:14px;"><button class="btn btn-sm btn-primary" id="btnEditFromDetail">${ICONS.edit} Edit Equipment</button></div>` : ''}
      <div class="eq-detail-top" style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:14px;">
        <div class="detail-grid" style="flex:1;">
          <div><div class="k">Category</div><div class="v">${escapeHtml(item.category)}</div></div>
          <div><div class="k">Equipment Type</div><div class="v">${(item.equipmentType?escapeHtml(item.equipmentType):'—')}</div></div>
          <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClass(item.status)}">${item.status}</span></div></div>
          <div><div class="k">Condition</div><div class="v">${escapeHtml(item.condition)}</div></div>
          <div><div class="k">Location</div><div class="v">${escapeHtml(item.location)}</div></div>
          <div><div class="k">Agency</div><div class="v">${(item.agency?escapeHtml(item.agency):'—')}</div></div>
          <div><div class="k">Assigned To</div><div class="v">${item.assignedTo?escapeHtml(targetName(item.assignedToType, item.assignedTo)):'—'}</div></div>
          <div><div class="k">Vendor</div><div class="v">${item.vendorId?escapeHtml(vendorName(item.vendorId)):'—'}</div></div>
          <div><div class="k">Value</div><div class="v">${money(item.value)}${item.isConsumable?' / unit':''}</div></div>
          <div><div class="k">Purchase Date</div><div class="v">${item.purchaseDate||'—'}</div></div>
          <div><div class="k">In-Service Date</div><div class="v">${item.inServiceDate||'—'}</div></div>
          <div><div class="k">Replacement Date</div><div class="v" style="${replDays!=null && replDays<=60 ? 'color:var(--red);':''}">${item.replacementDate||'—'}${replDays!=null && replDays<=60 ? (replDays<0?' (past due)':' ('+replDays+'d)'):''}</div></div>
          <div><div class="k">Tracking Type</div><div class="v">${item.isConsumable ? 'Consumable (quantity)' : 'Serialized asset'}</div></div>
        </div>
        ${item.serialNumber ? `<div style="text-align:center;">${fakeBarcodeSvg(item.serialNumber)}<div class="mono" style="font-size:11px;margin-top:4px;color:var(--text-dim);">${escapeHtml(item.serialNumber)}</div></div>` : ''}
      </div>
      ${item.disposal ? `
        <div class="panel" style="box-shadow:none;border-color:var(--callout-red-border);">
          <div class="panel-head" style="background:var(--callout-red-bg);"><h2 style="color:var(--red);">Disposal Record</h2></div>
          <div class="panel-body">
            <div class="detail-grid">
              <div><div class="k">Method</div><div class="v">${escapeHtml(item.disposal.method)}</div></div>
              <div><div class="k">Date</div><div class="v">${item.disposal.date}</div></div>
            </div>
            ${item.disposal.reason ? `<div style="margin-top:8px;font-size:13px;">${escapeHtml(item.disposal.reason)}</div>` : ''}
          </div>
        </div>
      ` : ''}
      ${item.isConsumable ? `
        <div class="panel" style="box-shadow:none;">
          <div class="panel-head"><h2>Quantity On Hand</h2>${item.minQuantity!=null && item.quantity<=item.minQuantity ? `<span class="badge badge-overdue">Below threshold of ${item.minQuantity}</span>`:''}</div>
          <div class="panel-body" style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:24px;font-weight:800;color:var(--heading);min-width:60px;">${item.quantity}</div>
            ${canEdit ? `
              <button class="btn btn-sm btn-outline" data-qty-adjust="-10">-10</button>
              <button class="btn btn-sm btn-outline" data-qty-adjust="-1">-1</button>
              <button class="btn btn-sm btn-outline" data-qty-adjust="1">+1</button>
              <button class="btn btn-sm btn-outline" data-qty-adjust="10">+10</button>
            ` : ''}
          </div>
        </div>
      ` : ''}
      ${item.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(item.notes)}</div></div>` : ''}
      ${canOOS && item.status!=="Maintenance" && item.status!=="Retired" ? `<button class="btn btn-danger btn-sm" id="btnMarkOOS">${ICONS.alert} Mark Out of Service</button>` : ''}
    `;
    document.querySelectorAll('[data-qty-adjust]').forEach(b=>b.addEventListener('click', ()=>{
      const delta = Number(b.dataset.qtyAdjust);
      let reason = delta>0 ? "Restock / received" : "Issued / used";
      if(delta<0){ reason = prompt("Reason for this decrease (e.g. issued to patrol, expired, damaged)?", "Issued for use") || "Issued / used"; }
      item.quantity = Math.max(0, item.quantity + delta);
      STATE.qm.consumptionLog.push({id:"cl"+Date.now(), equipmentId:item.id, date:fmt(new Date()), qtyChange:delta, reason, roleId:primaryRoleId()});
      logActivity(`${item.name} quantity ${delta>0?'increased':'decreased'} by ${Math.abs(delta)} (${reason}). New total: ${item.quantity}.`, "consumption", item.id);
      persist();
      renderEqDetailTabContent(item);
      if(ACTIVE_VIEW==='qm-inventory') renderInventory();
      if(ACTIVE_VIEW==='qm-dashboard') renderDashboard();
    }));
    const oosBtn = document.getElementById('btnMarkOOS');
    if(oosBtn) oosBtn.addEventListener('click', ()=>{
      item.status = 'Maintenance';
      STATE.qm.maintenance.push({id:'m'+Date.now(), equipmentId:item.id, type:'Repair', date:fmt(new Date()), cost:0, vendor:'', status:'Open', notes:'Marked out of service.'});
      logActivity(`${item.name} (${item.assetId}) marked out of service.`, "equipment", item.id);
      persist();
      toast('Item marked out of service.');
      renderEquipmentDetailModal(item.id);
      if(ACTIVE_VIEW==='qm-inventory') renderInventory();
    });
    const editFromDetailBtn = document.getElementById('btnEditFromDetail');
    if(editFromDetailBtn) editFromDetailBtn.addEventListener('click', ()=> openEquipmentModal(item.id));

  } else if(EQ_DETAIL_TAB==='assignments'){
    const list = STATE.qm.assignments.filter(a=>a.equipmentId===item.id).slice().sort((a,b)=>b.checkoutDate.localeCompare(a.checkoutDate));
    const rows = list.map(a=>`
      <tr>
        <td>${escapeHtml(personName(a.personId))}</td>
        <td>${a.checkoutDate}</td>
        <td>${a.dueDate}</td>
        <td>${a.returnedDate||'—'}</td>
        <td><span class="badge ${statusBadgeClass(a.status)}">${a.status}</span></td>
      </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No checkout history for this item yet.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Person</th><th>Checked out</th><th>Due</th><th>Returned</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;

  } else if(EQ_DETAIL_TAB==='maintenance'){
    const canLog = can('qm_maint_log');
    const canSchedule = can('qm_maint_schedule');
    const list = STATE.qm.maintenance.filter(m=>m.equipmentId===item.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(m=>`
      <tr>
        <td>${m.type}${m.isRecurring?` <span class="badge badge-role" title="Repeats every ${m.intervalDays} days">&#8635; every ${m.intervalDays}d</span>`:''}</td>
        <td>${m.date}</td>
        <td>${(m.vendor?escapeHtml(m.vendor):'—')}</td>
        <td>${(m.laborCost||m.partsCost) ? `L:${money(m.laborCost||0)} / P:${money(m.partsCost||0)}` : (m.cost?money(m.cost):'—')}</td>
        <td><span class="badge ${m.status==='Open'?'badge-maintenance':m.status==='Scheduled'?'badge-assigned':'badge-available'}">${m.status}</span></td>
        <td style="max-width:180px;font-size:12px;color:var(--text-dim);">${escapeHtml(m.notes||'')}</td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No maintenance recorded for this item yet.</td></tr>`;
    body.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        ${canLog ? `<button class="btn btn-sm btn-primary" id="btnLogMaint">${ICONS.plus} Log Maintenance</button>` : ''}
        ${canSchedule ? `<button class="btn btn-sm btn-outline" id="btnScheduleMaint">${ICONS.plus} Schedule Maintenance</button>` : ''}
      </div>
      <table><thead><tr><th>Type</th><th>Date</th><th>Vendor</th><th>Cost (Labor/Parts)</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const logBtn = document.getElementById('btnLogMaint');
    if(logBtn) logBtn.addEventListener('click', ()=>openMaintenanceForm(item, false));
    const schedBtn = document.getElementById('btnScheduleMaint');
    if(schedBtn) schedBtn.addEventListener('click', ()=>openMaintenanceForm(item, true));

  } else if(EQ_DETAIL_TAB==='consumption'){
    const list = STATE.qm.consumptionLog.filter(c=>c.equipmentId===item.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const totalUsed = list.filter(c=>c.qtyChange<0).reduce((s,c)=>s+Math.abs(c.qtyChange),0);
    const rows = list.map(c=>`
      <tr>
        <td>${c.date}</td>
        <td style="color:${c.qtyChange<0?'var(--red)':'var(--green)'};font-weight:700;">${c.qtyChange>0?'+':''}${c.qtyChange}</td>
        <td>${escapeHtml(c.reason||'')}</td>
      </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No usage recorded yet. Adjust quantity from the Overview tab to log usage.</td></tr>`;
    body.innerHTML = `
      <div style="margin-bottom:10px;font-size:13px;"><strong>${totalUsed}</strong> units used all-time.</div>
      <table><thead><tr><th>Date</th><th>Change</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>
    `;

  } else if(EQ_DETAIL_TAB==='photos'){
    if(!item.photos) item.photos = [];
    const canManage = can('qm_equip_edit');
    body.innerHTML = photoManagerHtml(item.photos, 'qmEq', canManage);
    wirePhotoManager('eqDetailBody', item.photos, 'qmEq', canManage, (action)=>{
      logActivity(`${action==='add'?'Added a photo to':action==='remove'?'Removed a photo from':'Updated a photo description on'} ${item.name} (${item.assetId}).`, "equipment", item.id);
      persist();
      renderEqDetailTabContent(item);
    }, {collection:'qm.equipment', itemId:item.id});

  } else if(EQ_DETAIL_TAB==='activity'){
    const list = STATE.qm.activity.filter(a=>a.entityId===item.id).slice().reverse();
    const rows = list.map(a=>`
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <div class="mono" style="width:80px;flex-shrink:0;color:var(--text-dim);font-size:11.5px;">${a.ts}</div>
        <div style="font-size:13px;">${escapeHtml(a.text)}</div>
      </div>`).join('') || `<div style="text-align:center;color:var(--text-dim);padding:16px;">No activity recorded for this item yet.</div>`;
    body.innerHTML = rows;
  }
}

function openMaintenanceForm(item, isSchedule){
  const box = document.getElementById('modalBox');
  box.className = 'modal';
  box.innerHTML = `
    <div class="modal-head"><h3>${isSchedule?'Schedule Maintenance':'Log Maintenance'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Item</label><input type="text" value="${escapeHtml(item.name)} (${item.assetId})" disabled></div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fMType">${STATE.qm.refData.maintenanceTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>${isSchedule?'Scheduled for':'Date performed'}</label><input type="date" id="fMDate" value="${isSchedule ? fmt(addDays(new Date(),14)) : fmt(new Date())}"></div>
      </div>
      <div class="form-row"><label>Vendor / performed by</label><input type="text" id="fMVendor" placeholder="e.g. Armory - In House"></div>
      <div class="form-2col">
        <div class="form-row"><label>Labor Cost ($)</label><input type="number" id="fMLabor" value="0"></div>
        <div class="form-row"><label>Parts Cost ($)</label><input type="number" id="fMParts" value="0"></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fMRecurring" style="width:auto;">
          Recurring — automatically schedule the next occurrence when this is marked completed
        </label>
      </div>
      <div class="form-row" id="fMIntervalWrap" style="display:none;">
        <label>Repeat every (days)</label><input type="number" id="fMInterval" value="180">
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fMNotes" rows="2" placeholder="What was done or why it's needed"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${isSchedule?'Schedule':'Save Record'}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fMRecurring').addEventListener('change', (e)=>{
    document.getElementById('fMIntervalWrap').style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('mSave').onclick = ()=>{
    const isRecurring = document.getElementById('fMRecurring').checked;
    const laborCost = Number(document.getElementById('fMLabor').value)||0;
    const partsCost = Number(document.getElementById('fMParts').value)||0;
    const rec = {
      id:'m'+Date.now(), equipmentId:item.id,
      type: document.getElementById('fMType').value,
      date: document.getElementById('fMDate').value,
      vendor: document.getElementById('fMVendor').value.trim(),
      laborCost, partsCost, cost: laborCost+partsCost,
      status: isSchedule ? 'Scheduled' : 'Completed',
      notes: document.getElementById('fMNotes').value.trim(),
      isRecurring, intervalDays: isRecurring ? (Number(document.getElementById('fMInterval').value)||180) : null,
    };
    STATE.qm.maintenance.push(rec);
    if(!isSchedule){
      logActivity(`Maintenance logged for ${item.name}: ${rec.notes||rec.type}.`, "maintenance", item.id);
    } else {
      logActivity(`Maintenance scheduled for ${item.name} on ${rec.date}.`, "maintenance", item.id);
    }
    persist();
    toast(isSchedule ? 'Maintenance scheduled.' : 'Maintenance logged.');
    EQ_DETAIL_TAB = 'maintenance';
    renderEquipmentDetailModal(item.id);
    if(ACTIVE_VIEW==='qm-dashboard') renderDashboard();
  };
}

/* =========================================================================
   ASSIGNMENTS
   ========================================================================= */
function renderAssignments(){
  const canOut = can('qm_assign_checkout');
  const canIn = can('qm_assign_checkin');
  const canViewHistory = can('qm_assign_history');

  if(!canViewHistory){
    document.getElementById('view-qm-assignments').innerHTML = permissionBlockedView("You don't have permission to view assignment history in this role.");
    return;
  }

  const active = STATE.qm.assignments.filter(a=>a.status!=="Returned");
  const history = STATE.qm.assignments.filter(a=>a.status==="Returned");

  const sa = SORT.assignActive;
  const activeSortVal = (a,key)=>{
    if(key==='item') return equipmentById(a.equipmentId).name.toLowerCase();
    if(key==='personId') return targetName(a.assignedToType, a.targetId).toLowerCase();
    return a[key];
  };
  active.sort((a,b)=>{
    const av=activeSortVal(a,sa.key), bv=activeSortVal(b,sa.key);
    if(av<bv) return sa.dir==='asc'?-1:1; if(av>bv) return sa.dir==='asc'?1:-1; return 0;
  });
  const sh = SORT.assignHistory;
  const histSortVal = (a,key)=>{
    if(key==='item') return equipmentById(a.equipmentId).name.toLowerCase();
    if(key==='personId') return targetName(a.assignedToType, a.targetId).toLowerCase();
    return a[key];
  };
  history.sort((a,b)=>{
    const av=histSortVal(a,sh.key), bv=histSortVal(b,sh.key);
    if(av<bv) return sh.dir==='asc'?-1:1; if(av>bv) return sh.dir==='asc'?1:-1; return 0;
  });

  const activeRows = active.map(a=>{
    const item = equipmentById(a.equipmentId);
    return `<tr>
      <td>${eqLink(item)}<div class="mono">${item.assetId}</div></td>
      <td>${escapeHtml(targetName(a.assignedToType, a.targetId))} <span class="badge badge-role" style="margin-left:4px;">${a.assignedToType||'person'}</span></td>
      <td>${a.checkoutDate}${a.checkoutTime?' '+a.checkoutTime:''}</td>
      <td>${a.dueDate}</td>
      <td><span class="badge ${statusBadgeClass(a.status)}">${a.status}</span></td>
      <td>${canIn ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-checkin="${a.id}">${ICONS.arrowIn} Check In</button><button class="btn btn-sm btn-danger" data-report-issue="${a.id}" title="Report Lost / Stolen / Damaged">${ICONS.alert}</button></div>` : "—"}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:18px;">No equipment currently checked out.</td></tr>`;

  const historyRows = history.map(a=>{
    const item = equipmentById(a.equipmentId);
    return `<tr>
      <td>${eqLink(item)}<div class="mono">${item.assetId}</div></td>
      <td>${escapeHtml(targetName(a.assignedToType, a.targetId))}</td>
      <td>${a.checkoutDate}</td>
      <td>${a.returnedDate}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:18px;">No return history yet.</td></tr>`;

  document.getElementById('view-qm-assignments').innerHTML = `
    <div class="toolbar">
      <div></div>
      ${canOut ? `<button class="btn btn-primary" id="btnCheckout">${ICONS.arrowOut} Check Out Equipment</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Currently Checked Out</h2><span class="hint">${active.length} active</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Item','assignActive','item')}
          ${sortHeaderHtml('Assigned to','assignActive','personId')}
          ${sortHeaderHtml('Checked out','assignActive','checkoutDate')}
          ${sortHeaderHtml('Due','assignActive','dueDate')}
          ${sortHeaderHtml('Status','assignActive','status')}
          <th></th>
        </tr></thead>
        <tbody>${activeRows}</tbody></table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Return History</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Item','assignHistory','item')}
          ${sortHeaderHtml('Assigned to','assignHistory','personId')}
          ${sortHeaderHtml('Checked out','assignHistory','checkoutDate')}
          ${sortHeaderHtml('Returned','assignHistory','returnedDate')}
        </tr></thead>
        <tbody>${historyRows}</tbody></table>
      </div>
    </div>
  `;

  const co = document.getElementById('btnCheckout');
  if(co) co.addEventListener('click', openCheckoutModal);
  document.querySelectorAll('[data-checkin]').forEach(b=>b.addEventListener('click', ()=>checkInAssignment(b.dataset.checkin)));
  document.querySelectorAll('[data-report-issue]').forEach(b=>b.addEventListener('click', ()=>openReportIssueModal(b.dataset.reportIssue)));
  wireSortHeaders('assignActive', renderAssignments);
  wireSortHeaders('assignHistory', renderAssignments);
  wireEqLinks();
}

function permissionBlockedView(msg){
  return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
}

function openCheckoutModal(presetEquipId){
  const available = STATE.qm.equipment.filter(e=>e.status==="Available" && !e.isConsumable);
  if(available.length===0){ toast("No available equipment to check out.", true); return; }
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Check Out Equipment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Equipment</label>
        <select id="fEquip">${available.map(e=>`<option value="${e.id}" ${presetEquipId===e.id?'selected':''}>${escapeHtml(e.name)} (${e.assetId})</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Assign to</label>
        <select id="fTargetType">
          <option value="person">Person</option>
          <option value="unit">Unit / Vehicle</option>
          <option value="location">Location / Building / Station</option>
        </select>
      </div>
      <div class="form-row" id="fTargetWrap">
        <label>Person</label>
        <select id="fTarget">${STATE.personnel.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} - ${escapeHtml(p.unit)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Checkout Date</label><input type="date" id="fCoDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Checkout Time</label><input type="text" id="fCoTime" value="${new Date().toTimeString().slice(0,5)}" placeholder="HH:MM"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Due Date</label><input type="date" id="fDueDate" value="${fmt(addDays(new Date(),7))}"></div>
        <div class="form-row"><label>Checkout Location</label>
          <select id="fCoLocation">${STATE.qm.refData.locations.map(l=>`<option>${escapeHtml(l)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fCoNotes" rows="2" placeholder="Optional"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Check Out</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fTargetType').addEventListener('change', (e)=>{
    const t = e.target.value;
    const wrap = document.getElementById('fTargetWrap');
    if(t==='person'){
      wrap.innerHTML = `<label>Person</label><select id="fTarget">${STATE.personnel.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} - ${escapeHtml(p.unit)}</option>`).join('')}</select>`;
    } else if(t==='unit'){
      wrap.innerHTML = `<label>Unit / Vehicle</label><select id="fTarget">${STATE.qm.refData.units.map(u=>`<option value="${u.id}">${escapeHtml(u.name)} (${u.kind})</option>`).join('')}</select>`;
    } else {
      wrap.innerHTML = `<label>Location</label><select id="fTarget">${STATE.qm.refData.locations.map(l=>`<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('')}</select>`;
    }
  });
  document.getElementById('mSave').onclick = ()=>{
    const eqId = document.getElementById('fEquip').value;
    const assignedToType = document.getElementById('fTargetType').value;
    const targetId = document.getElementById('fTarget').value;
    const checkoutDate = document.getElementById('fCoDate').value;
    const checkoutTime = document.getElementById('fCoTime').value.trim();
    const dueDate = document.getElementById('fDueDate').value;
    const checkoutLocation = document.getElementById('fCoLocation').value;
    const item = equipmentById(eqId);
    STATE.qm.assignments.push({
      id:"a"+Date.now(), equipmentId:eqId,
      assignedToType, personId: assignedToType==='person'?targetId:null, targetId,
      checkoutDate, checkoutTime, checkoutLocation, dueDate,
      status:"Checked Out", returnedDate:null, conditionOut:item.condition,
      notes: document.getElementById('fCoNotes').value,
    });
    item.status="Assigned"; item.assignedTo=targetId; item.assignedToType=assignedToType;
    logActivity(`${item.name} checked out to ${targetName(assignedToType, targetId)} (${assignedToType}) at ${checkoutLocation}.`, "assignment", item.id);
    persist();
    toast("Equipment checked out.");
    closeModal();
    renderAssignments();
    if(ACTIVE_VIEW==='qm-inventory') renderInventory();
  };
}

function checkInAssignment(id){
  const a = STATE.qm.assignments.find(a=>a.id===id);
  const item = equipmentById(a.equipmentId);
  a.status="Returned"; a.returnedDate = fmt(new Date());
  item.status="Available"; item.assignedTo=null; item.assignedToType=null;
  logActivity(`${item.name} checked in from ${targetName(a.assignedToType, a.targetId)}.`, "assignment", item.id);
  persist();
  toast("Equipment checked in.");
  renderAssignments();
}

function openReportIssueModal(assignmentId){
  const a = STATE.qm.assignments.find(a=>a.id===assignmentId);
  const item = equipmentById(a.equipmentId);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Report Lost, Stolen, or Damaged</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Item</label><input type="text" value="${escapeHtml(item.name)} (${item.assetId})" disabled></div>
      <div class="form-row"><label>Currently with</label><input type="text" value="${escapeHtml(targetName(a.assignedToType, a.targetId))}" disabled></div>
      <div class="form-row"><label>Outcome</label>
        <select id="fIssueType">
          <option value="Lost">Lost</option>
          <option value="Stolen">Stolen</option>
          <option value="Damaged">Damaged (needs repair, not lost)</option>
        </select>
      </div>
      <div class="form-row"><label>Details</label><textarea id="fIssueNotes" rows="3" placeholder="What happened, when, and where"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-danger" id="mSave">Submit Report</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const issueType = document.getElementById('fIssueType').value;
    const notes = document.getElementById('fIssueNotes').value.trim();
    a.status = "Returned";
    a.returnedDate = fmt(new Date());
    a.notes = (a.notes ? a.notes+' | ' : '') + `Reported ${issueType}: ${notes}`;
    if(issueType === "Damaged"){
      item.status = "Maintenance";
      item.condition = "Damaged";
      item.assignedTo = null; item.assignedToType = null;
      STATE.qm.maintenance.push({id:'m'+Date.now(), equipmentId:item.id, type:'Repair', date:fmt(new Date()), laborCost:0, partsCost:0, cost:0, vendor:'', status:'Open', notes:`Reported damaged while issued to ${targetName(a.assignedToType,a.targetId)}: ${notes}`, isRecurring:false, intervalDays:null});
    } else {
      item.status = issueType; // "Lost" or "Stolen"
      item.assignedTo = null; item.assignedToType = null;
      item.disposal = {method: issueType==="Stolen" ? "Destroyed - Witnessed" : STATE.qm.refData.disposalMethods[0], date: fmt(new Date()), reason: `Reported ${issueType.toLowerCase()} while issued. ${notes}`};
    }
    logActivity(`${item.name} reported ${issueType} while issued to ${targetName(a.assignedToType,a.targetId)}. ${notes}`, "disposal", item.id);
    persist();
    toast(`Reported as ${issueType}.`);
    closeModal();
    renderAssignments();
  };
}

/* refresh "overdue" statuses live based on today's date */
function recalcOverdue(){
  const today = fmt(new Date());
  STATE.qm.assignments.forEach(a=>{
    if(a.status!=="Returned" && a.dueDate < today) a.status="Overdue";
    else if(a.status==="Overdue" && a.dueDate >= today) a.status="Checked Out";
  });
}

/* =========================================================================
   MAINTENANCE (fleet-wide view)
   ========================================================================= */
let MAINT_FILTER = {status:"All"};

function renderMaintenanceView(){
  if(!can('qm_equip_view')){
    document.getElementById('view-qm-maintenance').innerHTML = permissionBlockedView("You don't have permission to view maintenance records in this role.");
    return;
  }
  const canLog = can('qm_maint_log');
  const canSchedule = can('qm_maint_schedule');

  const filtered = STATE.qm.maintenance.filter(m=> MAINT_FILTER.status==="All" || m.status===MAINT_FILTER.status);
  const s = SORT.maintenance;
  const sortVal = (m,key)=>{
    if(key==='item') return equipmentById(m.equipmentId).name.toLowerCase();
    if(key==='category') return equipmentById(m.equipmentId).category.toLowerCase();
    return typeof m[key]==='string' ? m[key].toLowerCase() : m[key];
  };
  filtered.sort((a,b)=>{
    const av=sortVal(a,s.key), bv=sortVal(b,s.key);
    if(av<bv) return s.dir==='asc'?-1:1; if(av>bv) return s.dir==='asc'?1:-1; return 0;
  });

  const openCount = STATE.qm.maintenance.filter(m=>m.status==="Open").length;
  const scheduledCount = STATE.qm.maintenance.filter(m=>m.status==="Scheduled").length;
  const totalCost = STATE.qm.maintenance.filter(m=>m.status==="Completed").reduce((sum,m)=>sum+m.cost,0);

  const rows = filtered.map(m=>{
    const item = equipmentById(m.equipmentId);
    return `<tr>
      <td><a href="#" data-open-eq="${item.id}" class="record-link">${escapeHtml(item.name)}</a><div class="mono">${item.assetId}</div></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${m.type}</td>
      <td>${m.date}</td>
      <td>${(m.vendor?escapeHtml(m.vendor):'—')}</td>
      <td>${m.cost?money(m.cost):'—'}</td>
      <td><span class="badge ${m.status==='Open'?'badge-maintenance':m.status==='Scheduled'?'badge-assigned':'badge-available'}">${m.status}</span></td>
      <td>
        ${(canLog||canSchedule) && m.status!=="Completed" ? `<button class="btn btn-sm btn-outline" data-complete-maint="${m.id}">Mark Completed</button>` : ""}
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No maintenance records match this filter.</td></tr>`;

  document.getElementById('view-qm-maintenance').innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-card"><div class="label">Open Repairs</div><div class="value" style="color:${openCount?'var(--red)':'var(--navy)'}">${openCount}</div></div>
      <div class="stat-card"><div class="label">Scheduled</div><div class="value">${scheduledCount}</div></div>
      <div class="stat-card"><div class="label">Completed Maintenance Cost (all time)</div><div class="value">${money(totalCost)}</div></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select id="maintStatus" title="Filter maintenance records to a single status">
          <option ${MAINT_FILTER.status==="All"?"selected":""}>All</option>
          ${["Open","Scheduled","Completed"].map(st=>`<option ${MAINT_FILTER.status===st?"selected":""}>${st}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        ${canLog ? `<button class="btn btn-outline" id="btnGlobalLog">${ICONS.plus} Log Maintenance</button>` : ""}
        ${canSchedule ? `<button class="btn btn-primary" id="btnGlobalSchedule">${ICONS.plus} Schedule Maintenance</button>` : ""}
      </div>
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Item','maintenance','item')}
          ${sortHeaderHtml('Category','maintenance','item')}
          ${sortHeaderHtml('Type','maintenance','type')}
          ${sortHeaderHtml('Date','maintenance','date')}
          ${sortHeaderHtml('Vendor','maintenance','vendor')}
          ${sortHeaderHtml('Cost','maintenance','cost')}
          ${sortHeaderHtml('Status','maintenance','status')}
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;

  document.getElementById('maintStatus').addEventListener('change', e=>{MAINT_FILTER.status=e.target.value; renderMaintenanceView();});
  document.querySelectorAll('[data-open-eq]').forEach(a=>a.addEventListener('click', (ev)=>{ev.preventDefault(); EQ_DETAIL_TAB='maintenance'; openEquipmentDetail(a.dataset.openEq);}));
  document.querySelectorAll('[data-complete-maint]').forEach(b=>b.addEventListener('click', ()=>{
    const rec = STATE.qm.maintenance.find(m=>m.id===b.dataset.completeMaint);
    rec.status = "Completed";
    rec.date = fmt(new Date());
    const item = equipmentById(rec.equipmentId);
    if(item.status==="Maintenance") item.status = "Available";
    if(rec.isRecurring && rec.intervalDays){
      STATE.qm.maintenance.push({
        id:'m'+Date.now(), equipmentId:item.id, type:rec.type,
        date: fmt(addDays(new Date(), rec.intervalDays)),
        vendor: rec.vendor, laborCost:0, partsCost:0, cost:0,
        status:'Scheduled', notes:`Auto-scheduled follow-up (recurring every ${rec.intervalDays} days).`,
        isRecurring:true, intervalDays:rec.intervalDays,
      });
      logActivity(`${item.name}: next ${rec.type.toLowerCase()} maintenance auto-scheduled for ${fmt(addDays(new Date(), rec.intervalDays))}.`, "maintenance", item.id);
    }
    logActivity(`Maintenance marked completed for ${item.name}.`, "maintenance", item.id);
    persist();
    toast(rec.isRecurring ? "Marked completed \u2014 next occurrence auto-scheduled." : "Marked completed.");
    renderMaintenanceView();
  }));
  const gLog = document.getElementById('btnGlobalLog');
  if(gLog) gLog.addEventListener('click', ()=>openMaintenanceFormGlobal(false));
  const gSched = document.getElementById('btnGlobalSchedule');
  if(gSched) gSched.addEventListener('click', ()=>openMaintenanceFormGlobal(true));
  wireSortHeaders('maintenance', renderMaintenanceView);
}

function openMaintenanceFormGlobal(isSchedule){
  const box = document.getElementById('modalBox');
  box.className = 'modal';
  box.innerHTML = `
    <div class="modal-head"><h3>${isSchedule?'Schedule Maintenance':'Log Maintenance'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Equipment</label>
        <select id="fMEquip">${STATE.qm.equipment.filter(e=>!e.isConsumable).map(e=>`<option value="${e.id}">${escapeHtml(e.name)} (${e.assetId})</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fMType">${STATE.qm.refData.maintenanceTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>${isSchedule?'Scheduled for':'Date performed'}</label><input type="date" id="fMDate" value="${isSchedule ? fmt(addDays(new Date(),14)) : fmt(new Date())}"></div>
      </div>
      <div class="form-row"><label>Vendor / performed by</label><input type="text" id="fMVendor" placeholder="e.g. Armory - In House"></div>
      <div class="form-2col">
        <div class="form-row"><label>Labor Cost ($)</label><input type="number" id="fMLabor" value="0"></div>
        <div class="form-row"><label>Parts Cost ($)</label><input type="number" id="fMParts" value="0"></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fMRecurring" style="width:auto;">
          Recurring — auto-schedule next occurrence on completion
        </label>
      </div>
      <div class="form-row" id="fMIntervalWrap" style="display:none;">
        <label>Repeat every (days)</label><input type="number" id="fMInterval" value="180">
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fMNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${isSchedule?'Schedule':'Save Record'}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fMRecurring').addEventListener('change', (e)=>{
    document.getElementById('fMIntervalWrap').style.display = e.target.checked ? '' : 'none';
  });
  document.getElementById('mSave').onclick = ()=>{
    const item = equipmentById(document.getElementById('fMEquip').value);
    const isRecurring = document.getElementById('fMRecurring').checked;
    const laborCost = Number(document.getElementById('fMLabor').value)||0;
    const partsCost = Number(document.getElementById('fMParts').value)||0;
    const rec = {
      id:'m'+Date.now(), equipmentId:item.id,
      type: document.getElementById('fMType').value,
      date: document.getElementById('fMDate').value,
      vendor: document.getElementById('fMVendor').value.trim(),
      laborCost, partsCost, cost: laborCost+partsCost,
      status: isSchedule ? 'Scheduled' : 'Completed',
      notes: document.getElementById('fMNotes').value.trim(),
      isRecurring, intervalDays: isRecurring ? (Number(document.getElementById('fMInterval').value)||180) : null,
    };
    STATE.qm.maintenance.push(rec);
    logActivity(isSchedule ? `Maintenance scheduled for ${item.name} on ${rec.date}.` : `Maintenance logged for ${item.name}: ${rec.notes||rec.type}.`, "maintenance", item.id);
    persist();
    toast(isSchedule ? 'Maintenance scheduled.' : 'Maintenance logged.');
    closeModal();
    renderMaintenanceView();
  };
}

/* =========================================================================
   ROLES & ABILITIES
   ========================================================================= */
let SELECTED_ROLE_ID = null;

function renderRoles(){
  const canManage = can('admin_roles');
  // System Admin is locked (its checkboxes are intentionally disabled, since it's meant to
  // always carry every customer ability automatically) -- but that only holds if its *saved*
  // abilities object actually has every current key in it. A role saved before a new ability
  // category existed (like Bulk Import) simply doesn't have those keys yet, and since it's
  // locked, there's no checkbox to fix it by hand. Self-heal it here instead of relying on a
  // manual toggle that was never going to be clickable in the first place.
  const systemAdminRole = STATE.roles.find(r=>r.id==='role_admin');
  if(systemAdminRole){ ALL_CUSTOMER_ABILITY_IDS.forEach(id=>{ if(systemAdminRole.abilities[id]===undefined) systemAdminRole.abilities[id]=true; }); }
  if(!SELECTED_ROLE_ID) SELECTED_ROLE_ID = STATE.currentRoleId;

  const roleListHtml = STATE.roles.map(r=>`
    <div class="role-list-item ${r.id===SELECTED_ROLE_ID?'active':''}" data-select-role="${r.id}">
      <div>
        <div class="name">${escapeHtml(r.name)}</div>
        <div class="count">${countAbilities(r)} of ${ALL_ABILITY_IDS.length} abilities</div>
      </div>
      ${r.locked ? ICONS.lock : ""}
    </div>
  `).join('');

  const selRole = STATE.roles.find(r=>r.id===SELECTED_ROLE_ID) || STATE.roles[0];
  const agencyScopeHtml = `
    <div class="ability-group">
      <h3>Agency Visibility</h3>
      <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:8px;">Leave everything unchecked to see all agencies. Check specific agencies to restrict this role to only their equipment (shared task-force assets remain visible regardless).</div>
      ${STATE.qm.refData.agencies.map(a=>`
        <div class="ability-row">
          <div class="lbl">${escapeHtml(a)}</div>
          <label class="switch">
            <input type="checkbox" data-agency-scope="${escapeHtml(a)}" ${selRole.agencyScope.includes(a)?'checked':''} ${!canManage?'disabled':''}>
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `;
  const groupsHtml = Object.entries(ABILITY_CATALOG).map(([group, abilities])=>`
    <div class="ability-group">
      <h3>${group}</h3>
      ${abilities.map(([id,label])=>`
        <div class="ability-row">
          <div class="lbl">${label}</div>
          <label class="switch">
            <input type="checkbox" data-ability="${id}" ${selRole.abilities[id]?'checked':''} ${(!canManage || (selRole.locked && id!=='chatbot_access'))?'disabled':''}>
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');

  document.getElementById('view-roles').innerHTML = `
    ${!canManage ? lockedNote("You're viewing role definitions in read-only mode. Switch to Quartermaster Admin to edit abilities.") : ""}
    <div class="toolbar">
      <div></div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddRole">${ICONS.plus} New Role</button>` : ""}
    </div>
    <div class="role-grid">
      <div>
        <div class="role-list">${roleListHtml}</div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>${escapeHtml(selRole.name)}</h2>
            <div class="hint" style="margin-top:3px;">${escapeHtml(selRole.description||"")}</div>
          </div>
          ${canManage && !selRole.locked ? `
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-outline" id="btnRenameRole">${ICONS.edit} Rename</button>
              <button class="btn btn-sm btn-danger" id="btnDeleteRole">${ICONS.trash} Delete</button>
            </div>` : (selRole.locked ? `<span class="hint">${ICONS.lock} Built-in role</span>` : '')}
        </div>
        <div class="panel-body">
          ${agencyScopeHtml}
          ${groupsHtml}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-select-role]').forEach(el=>{
    el.addEventListener('click', ()=>{ SELECTED_ROLE_ID = el.dataset.selectRole; renderRoles(); });
  });

  if(canManage){
    document.querySelectorAll('[data-ability]').forEach(chk=>{
      chk.addEventListener('change', ()=>{
        selRole.abilities[chk.dataset.ability] = chk.checked;
        persist();
        renderRoles();
        if(selRole.id===STATE.currentRoleId){ document.getElementById('abilityCountPill').textContent = countAbilities(selRole)+" abilities"; }
      });
    });
    document.querySelectorAll('[data-agency-scope]').forEach(chk=>{
      chk.addEventListener('change', ()=>{
        const agency = chk.dataset.agencyScope;
        if(chk.checked){ if(!selRole.agencyScope.includes(agency)) selRole.agencyScope.push(agency); }
        else { selRole.agencyScope = selRole.agencyScope.filter(a=>a!==agency); }
        logActivity(`Updated agency visibility scope for role "${selRole.name}".`, "admin");
        persist();
        toast("Agency scope updated.");
      });
    });
    const addBtn = document.getElementById('btnAddRole');
    if(addBtn) addBtn.addEventListener('click', ()=>openAddRoleModal());
    const renameBtn = document.getElementById('btnRenameRole');
    if(renameBtn) renameBtn.addEventListener('click', ()=>openAddRoleModal(selRole));
    const delBtn = document.getElementById('btnDeleteRole');
    if(delBtn) delBtn.addEventListener('click', ()=>deleteRole(selRole));
  }
}

function openAddRoleModal(existing){
  const editing = !!existing;
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?"Rename Role":"Create New Role"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Role name</label><input type="text" id="fRoleName" value="${editing?escapeHtml(existing.name):''}" placeholder="e.g. Evidence Custodian"></div>
      <div class="form-row"><label>Description</label><textarea id="fRoleDesc" rows="2" placeholder="What is this role for?">${editing?escapeHtml(existing.description||''):''}</textarea></div>
      ${!editing ? `<div class="form-row"><label>Start from</label>
        <select id="fRoleTemplate">
          <option value="blank">Blank (no abilities)</option>
          ${STATE.roles.map(r=>`<option value="${r.id}">Copy from ${escapeHtml(r.name)}</option>`).join('')}
        </select></div>` : ''}
      <div style="font-size:12px;color:var(--text-dim);">There's no limit on how many roles you can create. You'll set the specific abilities on the next screen.</div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing?"Save":"Create Role"}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fRoleName').value.trim();
    if(!name){ toast("Enter a role name.", true); return; }
    if(editing){
      existing.name = name;
      existing.description = document.getElementById('fRoleDesc').value.trim();
      toast("Role updated.");
    }else{
      const tmplId = document.getElementById('fRoleTemplate').value;
      const abilities = tmplId==="blank" ? abilitiesFor([]) : JSON.parse(JSON.stringify(STATE.roles.find(r=>r.id===tmplId).abilities));
      abilities.chatbot_access=false;
      abilities.workflow_use=false;
      abilities.workflow_approve=false;
      abilities.workflow_manage=false;
      const newRole = {id:"role_"+Date.now(), name, description: document.getElementById('fRoleDesc').value.trim(), locked:false, agencyScope:[], abilities};
      STATE.roles.push(newRole);
      SELECTED_ROLE_ID = newRole.id;
      toast("Role created.");
    }
    persist();
    closeModal();
    renderRoles();
    renderRoleSwitcher();
  };
}

function deleteRole(role){
  const inUse = STATE.personnel.some(p=>p.roleId===role.id);
  if(inUse){ toast("Can't delete a role that's still assigned to personnel. Reassign them first.", true); return; }
  if(!confirm(`Delete the role "${role.name}"? This cannot be undone.`)) return;
  STATE.roles = STATE.roles.filter(r=>r.id!==role.id);
  if(STATE.currentRoleId===role.id) STATE.currentRoleId = STATE.roles[0].id;
  SELECTED_ROLE_ID = STATE.roles[0].id;
  persist();
  toast("Role deleted.");
  renderRoles();
  renderRoleSwitcher();
}

/* =========================================================================
   PERSONNEL
   ========================================================================= */
function renderPersonnel(){
  const canView = can('personnel_view');
  const canManage = can('personnel_manage');
  if(!canView){
    document.getElementById('view-personnel').innerHTML = permissionBlockedView("You don't have permission to view the personnel roster in this role.");
    return;
  }
  const s = SORT.personnel;
  const personnel = STATE.personnel.slice().sort((a,b)=>{
    const av = s.key==='roleId' ? roleName(a.roleId).toLowerCase() : String(a[s.key]).toLowerCase();
    const bv = s.key==='roleId' ? roleName(b.roleId).toLowerCase() : String(b[s.key]).toLowerCase();
    if(av<bv) return s.dir==='asc'?-1:1; if(av>bv) return s.dir==='asc'?1:-1; return 0;
  });

  const rows = personnel.map(p=>`
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="mono">${escapeHtml(p.badge)}</td>
      <td>${p.email?escapeHtml(p.email):'—'}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td><span class="badge badge-role">${escapeHtml(roleName(p.roleId))}</span></td>
      <td>
        ${canManage ? `<div class="cell-actions"><button class="btn-icon" data-edit-p="${p.id}" title="Edit">${ICONS.edit}</button></div>` : ""}
      </td>
    </tr>
  `).join('');

  document.getElementById('view-personnel').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the roster in read-only mode.") : ""}
    <div class="toolbar">
      <div></div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddPerson">${ICONS.plus} Add Personnel</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Name','personnel','name')}
          ${sortHeaderHtml('Badge #','personnel','badge')}
          <th>Email</th>
          ${sortHeaderHtml('Unit','personnel','unit')}
          ${sortHeaderHtml('Role','personnel','roleId')}
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  wireSortHeaders('personnel', renderPersonnel);
  const addBtn = document.getElementById('btnAddPerson');
  if(addBtn) addBtn.addEventListener('click', ()=>openPersonModal(null));
  document.querySelectorAll('[data-edit-p]').forEach(b=>b.addEventListener('click', ()=>openPersonModal(b.dataset.editP)));
}

function openPersonModal(id){
  const editing = !!id;
  const p = editing ? STATE.personnel.find(p=>p.id===id) : {name:"",badge:"",email:"",unit:"",roleId:STATE.roles[STATE.roles.length-1].id, qualifications:[]};
  const qualRows = (p.qualifications||[]).map((q,i)=>{
    const days = daysBetween(fmt(new Date()), q.expirationDate);
    return `<tr>
      <td>${escapeHtml(q.weaponType)}</td>
      <td>${q.qualDate}</td>
      <td style="${days<=30?'color:var(--red);font-weight:700;':''}">${q.expirationDate}${days<=30?(days<0?' (expired)':' (due soon)'):''}</td>
      <td><button class="btn-icon" data-remove-qual="${i}" title="Remove">${ICONS.trash}</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:10px;font-size:12px;">No qualifications on file.</td></tr>`;

  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?"Edit Personnel":"Add Personnel"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>First name</label><input type="text" id="fPFirstName" value="${escapeHtml((p.name||'').split(' ')[0]||'')}"></div>
        <div class="form-row"><label>Last name</label><input type="text" id="fPLastName" value="${escapeHtml((p.name||'').split(' ').slice(1).join(' '))}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Badge / ID #</label><input type="text" id="fPBadge" value="${escapeHtml(p.badge)}"></div>
        <div class="form-row"><label>Email</label><input type="text" id="fPEmail" value="${escapeHtml(p.email||'')}" placeholder="name@agency.gov"></div>
      </div>
      <div class="form-row"><label>Unit</label><input type="text" id="fPUnit" value="${escapeHtml(p.unit)}"></div>
      <div class="form-row"><label>Role</label>
        <select id="fPRole">${STATE.roles.map(r=>`<option value="${r.id}" ${p.roleId===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('')}</select>
      </div>
      ${editing ? `
        <div class="panel" style="box-shadow:none;margin-top:6px;">
          <div class="panel-head"><h2>Firearm Qualifications</h2></div>
          <div class="panel-body">
            <table><thead><tr><th>Weapon</th><th>Qualified</th><th>Expires</th><th></th></tr></thead><tbody>${qualRows}</tbody></table>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:flex-end;flex-wrap:wrap;">
              <div class="form-row" style="margin-bottom:0;"><label>Weapon</label><select id="fQualType"><option>Handgun</option><option>Patrol Rifle</option><option>Shotgun</option><option>Less-Lethal</option></select></div>
              <div class="form-row" style="margin-bottom:0;"><label>Qual Date</label><input type="date" id="fQualDate" value="${fmt(new Date())}"></div>
              <div class="form-row" style="margin-bottom:0;"><label>Expires</label><input type="date" id="fQualExpire" value="${fmt(addDays(new Date(),365))}"></div>
              <button class="btn btn-sm btn-outline" id="btnAddQual">${ICONS.plus} Add</button>
            </div>
          </div>
        </div>
      ` : `<div style="font-size:12px;color:var(--text-dim);">Save this person first, then reopen to add firearm qualifications.</div>`}
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing?"Save Changes":"Add Personnel"}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  if(editing){
    const addQualBtn = document.getElementById('btnAddQual');
    if(addQualBtn) addQualBtn.addEventListener('click', ()=>{
      p.qualifications = p.qualifications || [];
      p.qualifications.push({id:'q'+Date.now(), weaponType: document.getElementById('fQualType').value, qualDate: document.getElementById('fQualDate').value, expirationDate: document.getElementById('fQualExpire').value});
      logActivity(`Added ${document.getElementById('fQualType').value} qualification for ${p.name}.`, "personnel", p.id);
      persist();
      openPersonModal(id);
    });
    document.querySelectorAll('[data-remove-qual]').forEach(b=>b.addEventListener('click', ()=>{
      p.qualifications.splice(Number(b.dataset.removeQual),1);
      persist();
      openPersonModal(id);
    }));
  }
  document.getElementById('mSave').onclick = ()=>{
    const firstName = document.getElementById('fPFirstName').value.trim();
    const lastName = document.getElementById('fPLastName').value.trim();
    if(!firstName || !lastName){ toast("Enter a first and last name.", true); return; }
    const name = `${firstName} ${lastName}`;
    const data = {name, badge:document.getElementById('fPBadge').value.trim(), email:document.getElementById('fPEmail').value.trim(), unit:document.getElementById('fPUnit').value.trim(), roleId:document.getElementById('fPRole').value};
    if(editing){ Object.assign(p, data); toast("Personnel updated."); }
    else{ STATE.personnel.push({id:"p"+Date.now(), qualifications:[], ...data}); toast("Personnel added."); }
    persist();
    closeModal();
    renderPersonnel();
  };
}

/* =========================================================================
   REPORTS
   ========================================================================= */
let CHART_REFS = {};
function destroyCharts(){ Object.values(CHART_REFS).forEach(c=>c && c.destroy()); CHART_REFS = {}; }

/* =========================================================================
   EQUIPMENT REQUESTS: submit, route, approve/deny/return/modify
   ========================================================================= */
function routeRequest(category, value){
  // first matching rule wins; rules are checked in stored order so more specific
  // rules (like a category-specific one) should be listed before catch-alls
  const rule = STATE.qm.requestRoutingRules.find(rr =>
    (rr.categoryFilter==="All" || rr.categoryFilter===category) && value >= rr.minValue
  ) || STATE.qm.requestRoutingRules[STATE.qm.requestRoutingRules.length-1];
  return rule;
}

let REQUEST_FILTER = {status:"All"};

function renderRequests(){
  const canSubmit = can('qm_request_submit');
  const canApprove = can('qm_request_approve');
  const canViewAll = can('qm_request_view_all') || canApprove;
  if(!canSubmit && !canViewAll){
    document.getElementById('view-qm-requests').innerHTML = permissionBlockedView("You don't have permission to view or submit equipment requests in this role.");
    return;
  }
  const filtered = STATE.qm.requests.filter(r => REQUEST_FILTER.status==="All" || r.status===REQUEST_FILTER.status)
    .slice().sort((a,b)=> b.createdDate.localeCompare(a.createdDate));

  const rows = filtered.map(r=>{
    const canDecide = canApprove && r.status==="Pending" && (STATE.currentRoleIds.includes(r.approverRoleId) || STATE.currentRoleIds.includes("role_admin"));
    return `<tr>
      <td>${escapeHtml(personName(r.requesterId))}</td>
      <td>${escapeHtml(r.itemDescription)}<div style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(r.category)} &bull; qty ${r.quantity} &bull; ${money(r.estimatedValue)} est.</div></td>
      <td>${r.createdDate}</td>
      <td><span class="badge badge-role">${escapeHtml(roleName(r.approverRoleId))}</span>${r.escalated?' <span class="badge badge-overdue">escalated</span>':''}</td>
      <td><span class="badge ${r.status==='Approved'?'badge-available':r.status==='Denied'?'badge-missing':r.status==='Returned'?'badge-maintenance':'badge-assigned'}">${r.status}</span></td>
      <td>${canDecide ? `<button class="btn btn-sm btn-primary" data-decide-request="${r.id}">Decide</button>` : (r.decisionNotes ? `<span style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(r.decisionNotes)}</span>` : '—')}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:18px;">No requests match this filter.</td></tr>`;

  document.getElementById('view-qm-requests').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <select id="reqStatus" title="Filter equipment requests to a single status">
          <option ${REQUEST_FILTER.status==="All"?"selected":""}>All</option>
          ${["Pending","Approved","Denied","Returned"].map(s=>`<option ${REQUEST_FILTER.status===s?"selected":""}>${s}</option>`).join('')}
        </select>
      </div>
      ${canSubmit ? `<button class="btn btn-primary" id="btnNewRequest">${ICONS.plus} Submit Request</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Requester</th><th>Item</th><th>Submitted</th><th>Routed To</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Routing is configurable in Admin &gt; Reference Data. Requests pending past a rule's escalation window surface to the escalation role via the notification bell.</div>
  `;
  document.getElementById('reqStatus').addEventListener('change', e=>{REQUEST_FILTER.status=e.target.value; renderRequests();});
  const newBtn = document.getElementById('btnNewRequest');
  if(newBtn) newBtn.addEventListener('click', openNewRequestModal);
  document.querySelectorAll('[data-decide-request]').forEach(b=>b.addEventListener('click', ()=>openDecideRequestModal(b.dataset.decideRequest)));
}

function openNewRequestModal(){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Submit Equipment Request</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Requesting on behalf of</label>
        <select id="fReqPerson">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===CURRENT_USER_ID?'selected':''}>${escapeHtml(p.name)} - ${escapeHtml(p.unit)}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Item description</label><input type="text" id="fReqItem" placeholder="e.g. Replacement duty belt"></div>
      <div class="form-2col">
        <div class="form-row"><label>Category</label><select id="fReqCategory">${STATE.qm.refData.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Quantity</label><input type="number" id="fReqQty" value="1" min="1"></div>
      </div>
      <div class="form-row"><label>Estimated value ($, total)</label><input type="number" id="fReqValue" value="0"></div>
      <div class="form-row"><label>Justification</label><textarea id="fReqJust" rows="3" placeholder="Why is this needed?"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Submit</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const itemDescription = document.getElementById('fReqItem').value.trim();
    if(!itemDescription){ toast("Describe what you're requesting.", true); return; }
    const category = document.getElementById('fReqCategory').value;
    const estimatedValue = Number(document.getElementById('fReqValue').value)||0;
    const rule = routeRequest(category, estimatedValue);
    const req = {
      id:'req'+Date.now(), requesterId: document.getElementById('fReqPerson').value,
      itemDescription, category, estimatedValue, quantity: Number(document.getElementById('fReqQty').value)||1,
      justification: document.getElementById('fReqJust').value.trim(),
      status:"Pending", createdDate: fmt(new Date()), decisionDate:null, decisionNotes:"",
      approverRoleId: rule.approverRoleId, routingRuleId: rule.id, escalated:false,
    };
    STATE.qm.requests.push(req);
    logActivity(`${personName(req.requesterId)} submitted a request for ${req.quantity}x "${itemDescription}", routed to ${roleName(rule.approverRoleId)}.`, "request", req.id);
    persist();
    toast("Request submitted.");
    closeModal();
    renderRequests();
  };
}

function openDecideRequestModal(id){
  const r = STATE.qm.requests.find(r=>r.id===id);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Decide Request</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Requester</div><div class="v">${escapeHtml(personName(r.requesterId))}</div></div>
        <div><div class="k">Category</div><div class="v">${escapeHtml(r.category)}</div></div>
        <div><div class="k">Est. Value</div><div class="v">${money(r.estimatedValue)}</div></div>
        <div><div class="k">Submitted</div><div class="v">${r.createdDate}</div></div>
      </div>
      <div class="form-row"><label>Item</label><input type="text" value="${escapeHtml(r.itemDescription)}" disabled></div>
      <div class="form-row"><label>Justification</label><textarea rows="2" disabled>${escapeHtml(r.justification)}</textarea></div>
      <div class="form-row"><label>Quantity to approve (modify if needed)</label><input type="number" id="fDecideQty" value="${r.quantity}" min="0"></div>
      <div class="form-row"><label>Decision</label>
        <select id="fDecision">
          <option value="Approved">Approve</option>
          <option value="Denied">Deny</option>
          <option value="Returned">Return for More Info</option>
        </select>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fDecisionNotes" rows="2" placeholder="Visible to the requester"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Save Decision</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const decision = document.getElementById('fDecision').value;
    const notes = document.getElementById('fDecisionNotes').value.trim();
    const newQty = Number(document.getElementById('fDecideQty').value);
    const modified = newQty !== r.quantity;
    r.status = decision;
    r.decisionDate = fmt(new Date());
    r.decisionNotes = notes + (modified ? ` (quantity adjusted from ${r.quantity} to ${newQty})` : '');
    if(decision==="Approved") r.quantity = newQty;
    logActivity(`Request from ${personName(r.requesterId)} for "${r.itemDescription}" marked ${decision}${modified?' with a modified quantity':''}.`, "request", r.id);
    persist();
    toast(`Request ${decision.toLowerCase()}.`);
    closeModal();
    renderRequests();
  };
}

/* =========================================================================
   INVENTORY AUDITS: spot / full audits, scan-to-verify, discrepancies
   ========================================================================= */
let AUDIT_ACTIVE_ID = null;

function renderAudits(){
  const canConduct = can('qm_audit_conduct');
  const canView = can('qm_audit_view') || canConduct;
  if(!canView){
    document.getElementById('view-qm-audits').innerHTML = permissionBlockedView("You don't have permission to view inventory audits in this role.");
    return;
  }
  const inProgress = STATE.qm.audits.find(a=>a.status==="In Progress");
  if(inProgress && canConduct){ AUDIT_ACTIVE_ID = inProgress.id; renderAuditInProgress(inProgress); return; }

  const history = STATE.qm.audits.filter(a=>a.status==="Completed").slice().sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const rows = history.map(a=>`
    <tr>
      <td>${a.startDate}</td>
      <td>${a.type}</td>
      <td>${escapeHtml(a.scopeLabel)}</td>
      <td>${a.expectedItemIds.length}</td>
      <td>${a.scannedItemIds.length}</td>
      <td>${a.discrepancies.length ? `<span class="badge badge-overdue">${a.discrepancies.length} discrepancies</span>` : `<span class="badge badge-available">Clean</span>`}</td>
      <td><button class="btn btn-sm btn-outline" data-view-audit="${a.id}">View</button></td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No completed audits yet.</td></tr>`;

  document.getElementById('view-qm-audits').innerHTML = `
    <div class="toolbar">
      <div></div>
      ${canConduct ? `<button class="btn btn-primary" id="btnStartAudit">${ICONS.plus} Start Audit</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Audit History</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Date</th><th>Type</th><th>Scope</th><th>Expected</th><th>Verified</th><th>Result</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  const startBtn = document.getElementById('btnStartAudit');
  if(startBtn) startBtn.addEventListener('click', openStartAuditModal);
  document.querySelectorAll('[data-view-audit]').forEach(b=>b.addEventListener('click', ()=>viewCompletedAudit(b.dataset.viewAudit)));
}

function openStartAuditModal(){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Start Inventory Audit</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Audit Type</label>
        <select id="fAuditType"><option>Spot Check</option><option>Full Agency-Wide</option></select>
      </div>
      <div class="form-row"><label>Scope by Location</label>
        <select id="fAuditLocation"><option value="All">All Locations</option>${STATE.qm.refData.locations.map(l=>`<option>${escapeHtml(l)}</option>`).join('')}</select>
      </div>
      <div class="form-row"><label>Scope by Category (optional)</label>
        <select id="fAuditCategory"><option value="All">All Categories</option>${STATE.qm.refData.categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select>
      </div>
      <div style="font-size:12px;color:var(--text-dim);">Serialized, non-disposed items matching this scope will be listed for you to verify one by one, either by scanning or checking off manually.</div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Start</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const type = document.getElementById('fAuditType').value;
    const location = document.getElementById('fAuditLocation').value;
    const category = document.getElementById('fAuditCategory').value;
    const expected = STATE.qm.equipment.filter(e=>
      !e.isConsumable && !["Retired","Destroyed"].includes(e.status) &&
      (location==="All" || e.location===location) && (category==="All" || e.category===category)
    );
    if(expected.length===0){ toast("No items match that scope.", true); return; }
    const scopeParts = [];
    if(location!=="All") scopeParts.push(location); if(category!=="All") scopeParts.push(category);
    const audit = {
      id:'aud'+Date.now(), type: type==="Spot Check"?"Spot":"Full",
      scopeLabel: scopeParts.length ? scopeParts.join(' / ') : 'All Locations & Categories',
      startDate: fmt(new Date()), completedDate:null, status:"In Progress",
      expectedItemIds: expected.map(e=>e.id), scannedItemIds: [], discrepancies: [],
      conductedByRoleId: primaryRoleId(),
    };
    STATE.qm.audits.push(audit);
    logActivity(`Started ${audit.type.toLowerCase()} audit (${audit.scopeLabel}) covering ${expected.length} items.`, "audit", audit.id);
    persist();
    closeModal();
    AUDIT_ACTIVE_ID = audit.id;
    renderAuditInProgress(audit);
  };
}

function renderAuditInProgress(audit){
  const remaining = audit.expectedItemIds.filter(id=>!audit.scannedItemIds.includes(id));
  const rows = audit.expectedItemIds.map(id=>{
    const item = equipmentById(id);
    if(!item) return '';
    const found = audit.scannedItemIds.includes(id);
    return `<tr style="${found?'opacity:0.55;':''}">
      <td class="mono">${item.assetId}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="mono">${item.serialNumber||'—'}</td>
      <td>${escapeHtml(item.location)}</td>
      <td>${found ? `<span class="badge badge-available">Verified</span>` : `<button class="btn btn-sm btn-outline" data-verify-item="${item.id}">Mark Found</button>`}</td>
    </tr>`;
  }).join('');

  document.getElementById('view-qm-audits').innerHTML = `
    <div class="panel" style="border-color:var(--blue);">
      <div class="panel-head">
        <h2>Audit In Progress — ${escapeHtml(audit.scopeLabel)}</h2>
        <span class="hint">${audit.scannedItemIds.length} of ${audit.expectedItemIds.length} verified</span>
      </div>
      <div class="panel-body">
        <input type="text" id="auditScanInput" title="Scan a barcode/QR/RFID tag, or type an asset ID or serial number, then press Enter to check it off this audit" placeholder="Scan or type asset ID / serial number, then Enter" style="width:100%;margin-bottom:12px;">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <button class="btn btn-primary btn-sm" id="btnCompleteAudit">Complete Audit</button>
          <button class="btn btn-outline btn-sm" id="btnCancelAudit">Cancel Audit</button>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Asset ID</th><th>Name</th><th>Serial</th><th>Location</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  const scanInput = document.getElementById('auditScanInput');
  scanInput.focus();
  scanInput.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      const code = e.target.value.trim().toLowerCase();
      e.target.value = '';
      if(!code) return;
      const match = equipmentById(audit.expectedItemIds.find(id=>{
        const it = equipmentById(id);
        return it && (it.assetId.toLowerCase()===code || (it.serialNumber||'').toLowerCase()===code);
      }));
      if(!match){ toast("No matching item in this audit's scope.", true); return; }
      if(!audit.scannedItemIds.includes(match.id)){
        audit.scannedItemIds.push(match.id);
        persist();
      }
      renderAuditInProgress(audit);
    }
  });
  document.querySelectorAll('[data-verify-item]').forEach(b=>b.addEventListener('click', ()=>{
    if(!audit.scannedItemIds.includes(b.dataset.verifyItem)) audit.scannedItemIds.push(b.dataset.verifyItem);
    persist();
    renderAuditInProgress(audit);
  }));
  document.getElementById('btnCompleteAudit').addEventListener('click', ()=>{
    const missing = audit.expectedItemIds.filter(id=>!audit.scannedItemIds.includes(id));
    audit.discrepancies = missing.map(id=>({equipmentId:id, issue:"Missing", notes:""}));
    audit.status = "Completed";
    audit.completedDate = fmt(new Date());
    logActivity(`Completed ${audit.type.toLowerCase()} audit (${audit.scopeLabel}): ${audit.scannedItemIds.length}/${audit.expectedItemIds.length} verified, ${missing.length} discrepancy(ies).`, "audit", audit.id);
    persist();
    toast(missing.length ? `Audit completed with ${missing.length} discrepancy(ies).` : "Audit completed clean.");
    AUDIT_ACTIVE_ID = null;
    renderAudits();
  });
  document.getElementById('btnCancelAudit').addEventListener('click', ()=>{
    if(!confirm("Cancel this audit? Progress will be discarded.")) return;
    STATE.qm.audits = STATE.qm.audits.filter(a=>a.id!==audit.id);
    persist();
    AUDIT_ACTIVE_ID = null;
    renderAudits();
  });
}

function viewCompletedAudit(id){
  const audit = STATE.qm.audits.find(a=>a.id===id);
  const rows = audit.discrepancies.map(d=>{
    const item = equipmentById(d.equipmentId);
    return `<tr>
      <td>${item?escapeHtml(item.name):'(deleted item)'}</td>
      <td>${item?item.assetId:'—'}</td>
      <td><span class="badge badge-overdue">${d.issue}</span></td>
      <td>${can('qm_equip_edit') && item ? `<button class="btn btn-sm btn-danger" data-mark-missing="${d.equipmentId}">Mark Missing in Inventory</button>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No discrepancies — every expected item was verified.</td></tr>`;
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Audit: ${escapeHtml(audit.scopeLabel)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Type</div><div class="v">${audit.type}</div></div>
        <div><div class="k">Completed</div><div class="v">${audit.completedDate}</div></div>
        <div><div class="k">Expected</div><div class="v">${audit.expectedItemIds.length}</div></div>
        <div><div class="k">Verified</div><div class="v">${audit.scannedItemIds.length}</div></div>
      </div>
      <table><thead><tr><th>Item</th><th>Asset ID</th><th>Issue</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-mark-missing]').forEach(b=>b.addEventListener('click', ()=>{
    const item = equipmentById(b.dataset.markMissing);
    item.status = "Missing";
    item.assignedTo = null; item.assignedToType = null;
    logActivity(`${item.name} marked Missing following audit discrepancy.`, "audit", item.id);
    persist();
    toast("Item marked Missing.");
    closeModal();
  }));
}

/* =========================================================================
   ADMIN: reference data, notification routing, audit log
   ========================================================================= */
let ADMIN_TAB = 'categories';
const SIMPLE_LIST_TABS = {
  categories: {label:'Categories', usageCheck:(v)=>STATE.qm.equipment.filter(e=>e.category===v).length},
  equipmentTypes: {label:'Equipment Types', usageCheck:(v)=>STATE.qm.equipment.filter(e=>e.equipmentType===v).length},
  locations: {label:'Locations', usageCheck:(v)=>STATE.qm.equipment.filter(e=>e.location===v).length},
  maintenanceTypes: {label:'Maintenance Types', usageCheck:(v)=>STATE.qm.maintenance.filter(m=>m.type===v).length},
  disposalMethods: {label:'Disposal Methods', usageCheck:(v)=>STATE.qm.equipment.filter(e=>e.disposal && e.disposal.method===v).length},
  agencies: {label:'Agencies', usageCheck:(v)=>STATE.qm.equipment.filter(e=>e.agency===v).length},
};

function renderAdmin(){
  const canManage = can('qm_admin_categories');
  const canAudit = can('qm_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-qm-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){
    Object.entries(SIMPLE_LIST_TABS).forEach(([key,cfg])=>tabs.push([key,cfg.label]));
    tabs.push(['vendors','Vendors']);
    tabs.push(['units','Units & Vehicles']);
    tabs.push(['notifications','Notification Routing']);
  }
  if(can('qm_bulk_import')) tabs.push(['bulkImport','Bulk Import']);
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-qm-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBody"></div>
  `;
  document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTab; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBody');
  if(SIMPLE_LIST_TABS[ADMIN_TAB]){
    renderSimpleListTab(body, ADMIN_TAB);
  } else if(ADMIN_TAB==='vendors'){
    renderVendorsTab(body);
  } else if(ADMIN_TAB==='units'){
    renderUnitsTab(body);
  } else if(ADMIN_TAB==='notifications'){
    renderNotificationRoutingTab(body);
  } else if(ADMIN_TAB==='bulkImport'){
    renderBulkImportTab(body, 'quartermaster');
  } else if(ADMIN_TAB==='audit'){
    renderPlatformAuditLogTab(body);
  }
}

function renderSimpleListTab(body, key){
  const cfg = SIMPLE_LIST_TABS[key];
  const list = STATE.qm.refData[key];
  const rows = list.map((v,i)=>{
    const inUse = cfg.usageCheck(v);
    return `<tr>
      <td>${escapeHtml(v)}</td>
      <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
      <td><button class="btn-icon" data-remove-item="${i}" title="Remove">${ICONS.trash}</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>${cfg.label}</h2><span class="hint">Agency-defined — add as many as you need</span></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInput" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/,'')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItem">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddItem').addEventListener('click', ()=>{
    const val = document.getElementById('newItemInput').value.trim();
    if(!val){ toast("Enter a value first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-item]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeItem);
    const val = list[idx];
    if(cfg.usageCheck(val)>0){ toast(`Can't remove "${val}" \u2014 it's currently used by ${cfg.usageCheck(val)} record(s). Reassign them first.`, true); return; }
    if(!confirm(`Remove "${val}" from ${cfg.label}?`)) return;
    list.splice(idx,1);
    logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function renderVendorsTab(body){
  const rows = STATE.qm.refData.vendors.map(v=>{
    const inUse = STATE.qm.equipment.filter(e=>e.vendorId===v.id).length;
    return `<tr>
      <td>${escapeHtml(v.name)}</td>
      <td>${escapeHtml(v.contact||'')}</td>
      <td>${escapeHtml(v.phone||'')}</td>
      <td>${escapeHtml(v.email||'')}</td>
      <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : ''}</td>
      <td><div class="cell-actions">
        <button class="btn-icon" data-edit-vendor="${v.id}" title="Edit">${ICONS.edit}</button>
        <button class="btn-icon" data-del-vendor="${v.id}" title="Delete">${ICONS.trash}</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No vendors yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Vendors</h2><span class="hint">Purchase and repair vendors for cost/vendor tracking</span></div>
      <div class="panel-body">
        <div style="margin-bottom:12px;"><button class="btn btn-primary btn-sm" id="btnAddVendor">${ICONS.plus} Add Vendor</button></div>
        <table><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddVendor').addEventListener('click', ()=>openVendorModal(null));
  document.querySelectorAll('[data-edit-vendor]').forEach(b=>b.addEventListener('click', ()=>openVendorModal(b.dataset.editVendor)));
  document.querySelectorAll('[data-del-vendor]').forEach(b=>b.addEventListener('click', ()=>{
    const v = STATE.qm.refData.vendors.find(v=>v.id===b.dataset.delVendor);
    const inUse = STATE.qm.equipment.filter(e=>e.vendorId===v.id).length;
    if(inUse>0){ toast(`Can't remove "${v.name}" \u2014 linked to ${inUse} equipment record(s).`, true); return; }
    if(!confirm(`Remove vendor "${v.name}"?`)) return;
    STATE.qm.refData.vendors = STATE.qm.refData.vendors.filter(x=>x.id!==v.id);
    logActivity(`Removed vendor "${v.name}".`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function openVendorModal(id){
  const editing = !!id;
  const v = editing ? STATE.qm.refData.vendors.find(v=>v.id===id) : {name:'',contact:'',phone:'',email:''};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit Vendor':'Add Vendor'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Vendor Name</label><input type="text" id="fVName" value="${escapeHtml(v.name)}"></div>
      <div class="form-row"><label>Contact Person</label><input type="text" id="fVContact" value="${escapeHtml(v.contact||'')}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Phone</label><input type="text" id="fVPhone" value="${escapeHtml(v.phone||'')}"></div>
        <div class="form-row"><label>Email</label><input type="text" id="fVEmail" value="${escapeHtml(v.email||'')}"></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing?'Save Changes':'Add Vendor'}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fVName').value.trim();
    if(!name){ toast("Enter a vendor name.", true); return; }
    const data = {name, contact:document.getElementById('fVContact').value.trim(), phone:document.getElementById('fVPhone').value.trim(), email:document.getElementById('fVEmail').value.trim()};
    if(editing){ Object.assign(v, data); logActivity(`Updated vendor "${name}".`, "admin"); }
    else { STATE.qm.refData.vendors.push({id:'v'+Date.now(), ...data}); logActivity(`Added vendor "${name}".`, "admin"); }
    persist();
    closeModal();
    renderAdminTabBody();
  };
}

function renderUnitsTab(body){
  const rows = STATE.qm.refData.units.map(u=>{
    const inUse = STATE.qm.equipment.filter(e=>e.assignedToType==='unit' && e.assignedTo===u.id).length;
    return `<tr>
      <td>${escapeHtml(u.name)}</td>
      <td>${escapeHtml(u.kind)}</td>
      <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : ''}</td>
      <td><div class="cell-actions">
        <button class="btn-icon" data-edit-unit="${u.id}" title="Edit">${ICONS.edit}</button>
        <button class="btn-icon" data-del-unit="${u.id}" title="Delete">${ICONS.trash}</button>
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No units or vehicles yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Units &amp; Vehicles</h2><span class="hint">Assignable targets for equipment that isn't issued to one person</span></div>
      <div class="panel-body">
        <div style="margin-bottom:12px;"><button class="btn btn-primary btn-sm" id="btnAddUnit">${ICONS.plus} Add Unit / Vehicle</button></div>
        <table><thead><tr><th>Name</th><th>Kind</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddUnit').addEventListener('click', ()=>openUnitModal(null));
  document.querySelectorAll('[data-edit-unit]').forEach(b=>b.addEventListener('click', ()=>openUnitModal(b.dataset.editUnit)));
  document.querySelectorAll('[data-del-unit]').forEach(b=>b.addEventListener('click', ()=>{
    const u = STATE.qm.refData.units.find(u=>u.id===b.dataset.delUnit);
    const inUse = STATE.qm.equipment.filter(e=>e.assignedToType==='unit' && e.assignedTo===u.id).length;
    if(inUse>0){ toast(`Can't remove "${u.name}" \u2014 equipment is currently assigned to it.`, true); return; }
    if(!confirm(`Remove "${u.name}"?`)) return;
    STATE.qm.refData.units = STATE.qm.refData.units.filter(x=>x.id!==u.id);
    logActivity(`Removed unit "${u.name}".`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function openUnitModal(id){
  const editing = !!id;
  const u = editing ? STATE.qm.refData.units.find(u=>u.id===id) : {name:'',kind:'Unit'};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit Unit / Vehicle':'Add Unit / Vehicle'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Name</label><input type="text" id="fUName" value="${escapeHtml(u.name)}" placeholder="e.g. Unit 14 (Patrol Vehicle) or SWAT Team"></div>
      <div class="form-row"><label>Kind</label><select id="fUKind"><option ${u.kind==='Unit'?'selected':''}>Unit</option><option ${u.kind==='Vehicle'?'selected':''}>Vehicle</option></select></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing?'Save Changes':'Add'}</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fUName').value.trim();
    if(!name){ toast("Enter a name.", true); return; }
    const data = {name, kind: document.getElementById('fUKind').value};
    if(editing){ Object.assign(u, data); logActivity(`Updated unit "${name}".`, "admin"); }
    else { STATE.qm.refData.units.push({id:'u'+Date.now(), ...data}); logActivity(`Added unit "${name}".`, "admin"); }
    persist();
    closeModal();
    renderAdminTabBody();
  };
}

function renderNotificationRoutingTab(body){
  const roleOpts = (selected)=> STATE.roles.map(r=>`<option value="${r.id}" ${selected===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Notification Routing</h2><span class="hint">Which role receives each type of automatic alert</span></div>
      <div class="panel-body">
        <div class="form-row"><label>Low Stock Alerts</label><select id="fRouteLowStock">${roleOpts(STATE.qm.notifySettings.lowStockRoleId)}</select></div>
        <div class="form-row"><label>Maintenance Due Alerts</label><select id="fRouteMaint">${roleOpts(STATE.qm.notifySettings.maintenanceDueRoleId)}</select></div>
        <div class="form-row"><label>Replacement Due Alerts</label><select id="fRouteReplacement">${roleOpts(STATE.qm.notifySettings.replacementDueRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRouting">Save Routing</button>
        <div style="font-size:12px;color:var(--text-dim);margin-top:10px;">Anyone viewing the app as the selected role sees these alerts in the bell icon, top right. This is in-app only in this prototype — not email or SMS.</div>
      </div>
    </div>
  `;
  document.getElementById('btnSaveRouting').addEventListener('click', ()=>{
    STATE.qm.notifySettings.lowStockRoleId = document.getElementById('fRouteLowStock').value;
    STATE.qm.notifySettings.maintenanceDueRoleId = document.getElementById('fRouteMaint').value;
    STATE.qm.notifySettings.replacementDueRoleId = document.getElementById('fRouteReplacement').value;
    logActivity("Updated notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

let AUDIT_FILTER = {entityType:"All"};
function renderAuditLogTab(body){
  const canExport = can('qm_reports_export');
  const types = ["All", ...new Set(STATE.qm.activity.map(a=>a.entityType||"general"))];
  const filtered = STATE.qm.activity.filter(a=> AUDIT_FILTER.entityType==="All" || (a.entityType||"general")===AUDIT_FILTER.entityType).slice().reverse();
  const eqEntityTypes = ["equipment","disposal","consumption","maintenance"];
  const rows = filtered.map(a=>{
    const linkedItem = (eqEntityTypes.includes(a.entityType) && a.entityId) ? equipmentById(a.entityId) : null;
    return `<tr>
      <td class="mono" style="white-space:nowrap;">${a.ts}</td>
      <td><span class="badge badge-role">${escapeHtml(a.entityType||'general')}</span></td>
      <td>${escapeHtml(a.text)}</td>
      <td>${linkedItem ? `<button class="btn btn-sm btn-outline" data-open-eq="${linkedItem.id}">View Item</button>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No activity recorded yet.</td></tr>`;
  body.innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <select id="auditType" title="Filter the physical audit log to a single entity type">${types.map(t=>`<option ${AUDIT_FILTER.entityType===t?'selected':''}>${t}</option>`).join('')}</select>
      </div>
      ${canExport ? `<button class="btn btn-outline" id="btnExportAudit">${ICONS.download} Export Log (CSV)</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Timestamp</th><th>Type</th><th>Event</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${filtered.length} of ${STATE.qm.activity.length} events</div>
  `;
  document.getElementById('auditType').addEventListener('change', e=>{AUDIT_FILTER.entityType=e.target.value; renderAdminTabBody();});
  wireEqLinks();
  const exportBtn = document.getElementById('btnExportAudit');
  if(exportBtn) exportBtn.addEventListener('click', ()=>{
    const headers = ["Timestamp","Type","Event"];
    const csvRows = filtered.map(a=>[a.ts, a.entityType||'general', a.text]);
    const csv = [headers, ...csvRows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'quartermaster_audit_log.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Audit log exported.");
  });
}

let QM_REPORT_FILTERS = { dateFrom:'', dateTo:'', category:'All', agency:'All' };
function renderReports(){
  if(!can('qm_reports_view')){
    document.getElementById('view-qm-reports').innerHTML = permissionBlockedView("You don't have permission to view reports in this role.");
    return;
  }
  const canExport = can('qm_reports_export');
  const f = QM_REPORT_FILTERS;
  let eq = visibleEquipment();
  if(f.category!=='All') eq = eq.filter(e=>e.category===f.category);
  if(f.agency!=='All') eq = eq.filter(e=>(e.agency||'Unassigned')===f.agency);
  // Activity logs (maintenance, assignments, consumption) respect the date range in addition to
  // category/agency -- but the category/agency filter has to be re-checked against the equipment
  // *those specific records* point to, since STATE.qm.maintenance etc. aren't scoped to `eq` above.
  const inScope = id => { const item = equipmentById(id); if(!item) return false; if(f.category!=='All' && item.category!==f.category) return false; if(f.agency!=='All' && (item.agency||'Unassigned')!==f.agency) return false; return true; };
  const filteredMaintenance = STATE.qm.maintenance.filter(m=>inScope(m.equipmentId) && withinDateRange(m.date, f.dateFrom, f.dateTo));
  const filteredAssignments = STATE.qm.assignments.filter(a=>inScope(a.equipmentId) && withinDateRange(a.checkoutDate, f.dateFrom, f.dateTo));
  const filteredConsumption = STATE.qm.consumptionLog.filter(c=>inScope(c.equipmentId) && withinDateRange(c.date, f.dateFrom, f.dateTo));

  const byCategory = {};
  STATE.qm.refData.categories.forEach(c=>byCategory[c]=0);
  eq.forEach(e=>byCategory[e.category]=(byCategory[e.category]||0)+1);

  const valueByCategory = {};
  STATE.qm.refData.categories.forEach(c=>valueByCategory[c]=0);
  eq.forEach(e=>valueByCategory[e.category]=(valueByCategory[e.category]||0)+e.value);

  const byStatus = {};
  eq.forEach(e=>byStatus[e.status]=(byStatus[e.status]||0)+1);

  const byAgency = {};
  STATE.qm.refData.agencies.forEach(a=>byAgency[a]=0);
  eq.forEach(e=>byAgency[e.agency||'Unassigned']=(byAgency[e.agency||'Unassigned']||0)+1);

  // assignment counts per target (person, unit, or location - currently active + historical)
  const byTarget = {};
  filteredAssignments.forEach(a=>{
    const key = targetName(a.assignedToType, a.targetId);
    byTarget[key]=(byTarget[key]||0)+1;
  });
  const topTargets = Object.entries(byTarget).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const overdueCount = filteredAssignments.filter(a=>a.status==="Overdue").length;
  const conditionCounts = {};
  eq.forEach(e=>conditionCounts[e.condition]=(conditionCounts[e.condition]||0)+1);

  const maintCostByCategory = {};
  STATE.qm.refData.categories.forEach(c=>maintCostByCategory[c]=0);
  filteredMaintenance.filter(m=>m.status==="Completed").forEach(m=>{
    const item = equipmentById(m.equipmentId);
    if(item) maintCostByCategory[item.category] = (maintCostByCategory[item.category]||0) + m.cost;
  });

  const lowStockItems = eq.filter(e=>e.isConsumable && e.minQuantity!=null && e.quantity<=e.minQuantity);
  const lowStockRows = lowStockItems.map(e=>`
    <tr><td>${eqLink(e)}</td><td>${escapeHtml(e.location)}</td><td><span class="qty-low">${e.quantity}</span></td><td>${e.minQuantity}</td></tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing below threshold.</td></tr>`;

  const consumables = eq.filter(e=>e.isConsumable);
  const onHandRows = consumables.map(e=>`
    <tr><td>${eqLink(e)}</td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(e.location)}</td><td>${e.quantity}</td><td>${money(e.value*e.quantity)}</td></tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No consumables tracked yet.</td></tr>`;

  const usageByItem = {};
  filteredConsumption.filter(c=>c.qtyChange<0).forEach(c=>{
    usageByItem[c.equipmentId] = (usageByItem[c.equipmentId]||0) + Math.abs(c.qtyChange);
  });
  const usageRows = Object.entries(usageByItem).sort((a,b)=>b[1]-a[1]).map(([eqId,total])=>{
    const item = equipmentById(eqId);
    return `<tr><td>${eqLink(item)}</td><td>${total}</td></tr>`;
  }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">No consumption logged yet.</td></tr>`;

  const disposedCount = eq.filter(e=>e.disposal).length;

  const firearms = eq.filter(e=>e.category==="Firearms" || e.equipmentType==="Weapon");
  const firearmRows = firearms.map(e=>`
    <tr>
      <td>${eqLink(e)}</td>
      <td class="mono">${e.serialNumber||'—'}</td>
      <td>${escapeHtml(e.manufacturer||'')} ${escapeHtml(e.model||'')}</td>
      <td>${e.ownershipType==='Personal'?'<span class="badge badge-role">Personal</span>':'Agency'}</td>
      <td><span class="badge ${statusBadgeClass(e.status)}">${e.status}</span></td>
      <td>${e.assignedTo?escapeHtml(targetName(e.assignedToType,e.assignedTo)):'—'}</td>
    </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No firearms in inventory.</td></tr>`;

  const planningWindow = eq.filter(e=>e.replacementDate && !["Retired","Destroyed","Lost","Stolen"].includes(e.status))
    .map(e=>({e, days: daysBetween(fmt(new Date()), e.replacementDate)}))
    .filter(x=>x.days<=365).sort((a,b)=>a.days-b.days);
  const planningRows = planningWindow.map(({e,days})=>`
    <tr>
      <td>${eqLink(e)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${e.replacementDate}</td>
      <td style="${days<=60?'color:var(--red);font-weight:700;':''}">${days<0?Math.abs(days)+'d overdue':days+'d'}</td>
      <td>${money(e.value)}</td>
    </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due for replacement within a year.</td></tr>`;
  const planningTotal = planningWindow.reduce((s,{e})=>s+e.value,0);

  document.getElementById('view-qm-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="qmReportFilterHost"></div></div></div>
    <div class="toolbar">
      <div class="hint" style="color:var(--text-dim);font-size:12.5px;">${eq.length} assets &bull; ${money(eq.reduce((s,e)=>s+e.value,0))} total value &bull; ${overdueCount} overdue</div>
      <div style="display:flex;gap:8px;">
        ${canExport ? `<button class="btn btn-outline" id="btnExportCsv">${ICONS.download} Export Inventory (CSV)</button>` : ""}
        <button class="btn btn-outline" id="btnPrintReport">Print / Save as PDF</button>
      </div>
    </div>
    <div class="chart-grid">
      <div class="panel">
        <div class="panel-head"><h2>Assets by Category</h2></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartCategory"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Inventory Value by Category</h2></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartValue"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Status Breakdown</h2></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartStatus"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Most-Assigned To (Person / Unit / Location)</h2></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartPeople"></canvas></div></div>
      </div>
    </div>
    <div class="chart-grid">
      <div class="panel">
        <div class="panel-head"><h2>Condition Overview</h2><span class="hint">Flag items needing attention before the next inspection cycle</span></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartCondition"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Completed Maintenance Cost by Category</h2></div>
        <div class="panel-body"><div class="chart-box"><canvas id="chartMaintCost"></canvas></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Assets by Agency</h2></div>
      <div class="panel-body"><div class="chart-box" style="height:180px;"><canvas id="chartAgency"></canvas></div></div>
    </div>
    <div class="two-col">
      <div class="panel">
        <div class="panel-head"><h2>Low Stock Consumables</h2><span class="hint">${lowStockItems.length} item${lowStockItems.length===1?'':'s'} at or below threshold</span></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Item</th><th>Location</th><th>On Hand</th><th>Threshold</th></tr></thead>
          <tbody>${lowStockRows}</tbody></table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Items Used (All-Time)</h2><span class="hint">From logged consumption</span></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Item</th><th>Total Used</th></tr></thead>
          <tbody>${usageRows}</tbody></table>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Inventory On Hand (Consumables)</h2><span class="hint">${consumables.length} tracked consumable items</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Item</th><th>Category</th><th>Location</th><th>Qty</th><th>Value on Hand</th></tr></thead>
        <tbody>${onHandRows}</tbody></table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Firearm Assignment Report</h2><span class="hint">${firearms.length} firearms tracked</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Item</th><th>Serial</th><th>Mfr / Model</th><th>Ownership</th><th>Status</th><th>Assigned To</th></tr></thead>
        <tbody>${firearmRows}</tbody></table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Replacement Planning</h2><span class="hint">${money(planningTotal)} in items due within 12 months</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Item</th><th>Category</th><th>Replacement Date</th><th>Time Remaining</th><th>Est. Cost</th></tr></thead>
        <tbody>${planningRows}</tbody></table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Disposal Summary</h2></div>
      <div class="panel-body" style="font-size:13px;">${disposedCount} item(s) have a disposal record (Retired, Lost, Stolen, or Destroyed). See the Admin &gt; Audit Log for full disposal history, or filter Inventory by status.</div>
    </div>
  `;
  document.getElementById('btnPrintReport').addEventListener('click', ()=>window.print());
  wireEqLinks();
  renderReportFilterBar(document.getElementById('qmReportFilterHost'), [
    {type:'daterange', keyFrom:'dateFrom', keyTo:'dateTo', label:'Activity Date Range'},
    {type:'select', key:'category', label:'Category', options: STATE.qm.refData.categories},
    {type:'select', key:'agency', label:'Agency', options: STATE.qm.refData.agencies},
  ], QM_REPORT_FILTERS, renderReports);

  destroyCharts();
  const navy = '#24364E', blue='#134DD1', slate='#B4C7CF', gold='#FFAC12', red='#D34120';
  const palette = [blue, navy, slate, gold, '#6C8AA8', '#4E6C8C', '#8FA6B8', '#1E2E44', '#3D6BC7'];

  CHART_REFS.category = safeChart('chartCategory', {
    type:'bar',
    data:{ labels:Object.keys(byCategory), datasets:[{label:'Assets', data:Object.values(byCategory), backgroundColor:blue}] },
    options: baseBarOpts()
  });
  CHART_REFS.value = safeChart('chartValue', {
    type:'bar',
    data:{ labels:Object.keys(valueByCategory), datasets:[{label:'Value ($)', data:Object.values(valueByCategory), backgroundColor:navy}] },
    options: baseBarOpts(true)
  });
  CHART_REFS.status = safeChart('chartStatus', {
    type:'doughnut',
    data:{ labels:Object.keys(byStatus), datasets:[{data:Object.values(byStatus), backgroundColor:palette}] },
    options:{ plugins:{ legend:{position:'right', labels:{color:navy, font:{family:'Archivo'}}} }, maintainAspectRatio:false }
  });
  CHART_REFS.people = safeChart('chartPeople', {
    type:'bar',
    data:{ labels:topTargets.map(([name])=>name), datasets:[{label:'Assignments', data:topTargets.map(([,c])=>c), backgroundColor:gold}] },
    options: {...baseBarOpts(), indexAxis:'y'}
  });
  CHART_REFS.condition = safeChart('chartCondition', {
    type:'bar',
    data:{ labels:Object.keys(conditionCounts), datasets:[{label:'Assets', data:Object.values(conditionCounts), backgroundColor:[ '#8FA6B8','#2E7D46','#FFAC12','#D34120','#6C8AA8','#B4372A' ]}] },
    options: {...baseBarOpts(), indexAxis:'y'}
  });
  CHART_REFS.maintCost = safeChart('chartMaintCost', {
    type:'bar',
    data:{ labels:Object.keys(maintCostByCategory), datasets:[{label:'Cost ($)', data:Object.values(maintCostByCategory), backgroundColor:red}] },
    options: baseBarOpts(true)
  });
  CHART_REFS.agency = safeChart('chartAgency', {
    type:'bar',
    data:{ labels:Object.keys(byAgency), datasets:[{label:'Assets', data:Object.values(byAgency), backgroundColor:slate}] },
    options: {...baseBarOpts(), indexAxis:'y'}
  });

  const exportBtn = document.getElementById('btnExportCsv');
  if(exportBtn) exportBtn.addEventListener('click', exportInventoryCsv);
}

function baseBarOpts(currency){
  return {
    maintainAspectRatio:false,
    plugins:{ legend:{display:false} },
    scales:{
      x:{ ticks:{color:chartTextColor(), font:{family:'Archivo', size:11}}, grid:{display:false} },
      y:{ ticks:{color:chartTextColor(), font:{family:'Archivo', size:11}, callback: v=> currency ? '$'+v : v}, grid:{color:chartGridColor()} }
    }
  };
}

function exportInventoryCsv(){
  const headers = ["Asset ID","Name","Serial #","Category","Condition","Location","Status","Assigned To","Tracking","Quantity","Value","Purchase Date"];
  const rows = STATE.qm.equipment.map(e=>[e.assetId,e.name,e.serialNumber||"",e.category,e.condition,e.location,e.status,e.assignedTo?targetName(e.assignedToType,e.assignedTo):"",e.isConsumable?"Consumable":"Serialized",e.isConsumable?e.quantity:1,e.value,e.purchaseDate]);
  const csv = [headers, ...rows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'quartermaster_inventory.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("Inventory exported.");
}

/* =========================================================================
   MODAL PLUMBING
   ========================================================================= */
function openModal(){ SuiteUX.openModal(); }
function closeModal(event){ return SuiteUX.closeModal(event); }


function openTenantInfoModal(){
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Tenant Connection</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <p style="font-size:13.5px;line-height:1.55;margin-top:0;">This prototype is labeled for <strong>reno-nv-demo.mark43.com</strong>, a real Mark43 tenant, but the personnel list below is sample data by default, not a live sync.</p>
      <p style="font-size:13.5px;line-height:1.55;"><span class="mono">${escapeHtml(CONNECTION.baseUrl)}/external/users</span> is confirmed working server-side. Mark43's Basic Auth isn't a plain token: the Authorization value is Base64 of <span class="mono">token:x-api-token</span> (literally appending that suffix before encoding), which is easy to miss since it doesn't look like normal Basic Auth. An <span class="mono">X-Api-Key: &lt;token&gt;</span> header also works. But that test ran outside the browser, on purpose.</p>
      <p style="font-size:13.5px;line-height:1.55;">This tenant's API sends no <span class="mono">Access-Control-Allow-Origin</span> header, so a browser calling it directly — which is what this artifact would have to do — gets blocked before the request ever leaves. That's not a wrong token or path; it's how the API is built, since it's meant for server-to-server integrations, not client-side JavaScript.</p>
      <p style="font-size:13.5px;line-height:1.55;">Use <strong>Connect&hellip;</strong> in the sidebar to try it yourself, or route this through a small backend you control that holds the token and proxies the call.</p>
    </div>
    <div class="modal-foot"><button class="btn btn-primary" id="mCancel">Got it</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
}

/* ---------- Live tenant connection: test + import ---------- */
function updateTenantStatusUI(){
  const dot = document.getElementById('tenantStatusDot');
  const text = document.getElementById('tenantStatusText');
  if(!dot || !text) return;
  const colors = {disconnected:'var(--gold)', testing:'var(--slate)', connected:'#3FB56C', error:'var(--red)'};
  dot.style.background = colors[CONNECTION.status] || 'var(--gold)';
  const labels = {
    disconnected: "Personnel below is sample data, not a live tenant sync.",
    testing: "Testing connection\u2026",
    connected: "Connected \u2014 personnel imported from live tenant data.",
    error: "Connection attempt failed \u2014 see Connect for details.",
  };
  text.textContent = labels[CONNECTION.status] || labels.disconnected;
}

function openConnectionModal(){
  renderConnectionModal();
}

function renderConnectionModal(){
  const box = document.getElementById('modalBox');
  box.className = 'modal';
  box.innerHTML = `
    <div class="modal-head"><h3>Connect to Mark43 Tenant</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <p style="font-size:12.5px;color:var(--text-dim);margin-top:0;line-height:1.5;">Held in memory for this browser tab only. Nothing here is saved to disk, to this artifact's storage, or written into the file if you download it. Refreshing the page clears it.</p>
      <div class="locked-note" style="background:var(--callout-green-bg);border-color:var(--callout-green-border);color:var(--callout-green-text);">
        ${ICONS.alert}
        <div>Verified server-side: <span class="mono">${escapeHtml(CONNECTION.baseUrl)}/external/users</span> works with Mark43's documented Basic Auth format — encode <span class="mono">token:x-api-token</span> (not just the raw token) as the Basic Authorization value. But this tenant's API sends no CORS headers, so a browser fetch from here will be blocked before it reaches the server \u2014 that's expected, not a sign your token or path is wrong.</div>
      </div>
      <div class="form-row"><label>Base URL</label>
        <input type="text" id="fBaseUrl" value="${escapeHtml(CONNECTION.baseUrl)}">
      </div>
      <div class="form-row"><label>Endpoint path</label>
        <input type="text" id="fPath" value="${escapeHtml(CONNECTION.endpointPath)}">
      </div>
      <div class="form-row"><label>Auth style</label>
        <select id="fAuthMode">
          <option value="basic" ${CONNECTION.authMode==='basic'?'selected':''}>HTTP Basic, token:x-api-token (confirmed \u2014 matches Mark43's documented format)</option>
          <option value="apikey" ${CONNECTION.authMode==='apikey'?'selected':''}>X-Api-Key header (also confirmed working for this tenant)</option>
        </select>
      </div>
      <div class="form-row"><label>API token</label>
        <input type="password" id="fToken" value="${escapeHtml(CONNECTION.token)}" placeholder="Paste token \u2014 not stored anywhere but this session" autocomplete="off">
      </div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-bottom:10px;">Full request URL: <span class="mono" id="fullUrlPreview"></span></div>
      <div id="connTestResult" style="font-size:12.5px;line-height:1.5;margin-top:6px;"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mForget">Forget Credentials</button>
      <button class="btn btn-primary" id="mTest">Test Connection</button>
    </div>
  `;
  openModal();
  const updatePreview = ()=>{
    const b = document.getElementById('fBaseUrl').value.trim().replace(/\/$/,'');
    const p = document.getElementById('fPath').value.trim();
    document.getElementById('fullUrlPreview').textContent = b + (p.startsWith('/')?p:'/'+p);
  };
  document.getElementById('fBaseUrl').addEventListener('input', updatePreview);
  document.getElementById('fPath').addEventListener('input', updatePreview);
  updatePreview();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mForget').onclick = ()=>{
    CONNECTION.baseUrl = "https://reno-nv-demo.mark43.com/partnerships/api";
    CONNECTION.endpointPath = "/external/department_users";
    CONNECTION.token = "";
    CONNECTION.status = "disconnected";
    CONNECTION.lastRawUsers = null;
    updateTenantStatusUI();
    toast("Credentials cleared from memory.");
    closeModal();
  };
  document.getElementById('mTest').onclick = testConnection;
}

async function testConnection(){
  const baseUrl = document.getElementById('fBaseUrl').value.trim().replace(/\/$/,'');
  const path = document.getElementById('fPath').value.trim();
  const token = document.getElementById('fToken').value.trim();
  const authMode = document.getElementById('fAuthMode').value;
  const resultBox = document.getElementById('connTestResult');
  if(!baseUrl || !path || !token){
    resultBox.innerHTML = `<span style="color:var(--red);">Fill in base URL, endpoint path, and token first.</span>`;
    return;
  }
  CONNECTION.baseUrl = baseUrl;
  CONNECTION.endpointPath = path;
  CONNECTION.token = token;
  CONNECTION.authMode = authMode;
  CONNECTION.status = "testing";
  updateTenantStatusUI();
  resultBox.innerHTML = `<span style="color:var(--text-dim);">Testing\u2026</span>`;

  const url = baseUrl + (path.startsWith('/') ? path : '/'+path);
  const headers = { 'Accept': 'application/json' };
  if(authMode === 'apikey') headers['X-Api-Key'] = token;
  else headers['Authorization'] = 'Basic ' + btoa(token + ':x-api-token');

  try{
    const resp = await fetch(url, { method: 'GET', headers });
    if(resp.ok){
      const body = await resp.json();
      const users = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
      CONNECTION.status = "connected";
      CONNECTION.lastRawUsers = users;
      updateTenantStatusUI();
      resultBox.innerHTML = `
        <span style="color:#3FB56C;font-weight:700;">Connected.</span> Received ${users.length} user record${users.length===1?'':'s'}.
        <div style="margin-top:8px;"><button class="btn btn-sm btn-primary" id="btnImportUsers">Import as Personnel</button></div>
      `;
      const importBtn = document.getElementById('btnImportUsers');
      if(importBtn) importBtn.onclick = ()=>importPersonnelFromMark43(users);
    } else {
      CONNECTION.status = "error";
      updateTenantStatusUI();
      let hint = "";
      if(resp.status===404) hint = "The API path likely isn't correct for this tenant, or Partnerships API isn't provisioned here.";
      else if(resp.status===401 || resp.status===403) hint = "The token was rejected, or the Basic Auth encoding doesn't match what this tenant expects \u2014 confirm the format with your technical contact.";
      resultBox.innerHTML = `<span style="color:var(--red);font-weight:700;">HTTP ${resp.status}.</span> ${hint}`;
    }
  } catch(err){
    CONNECTION.status = "error";
    updateTenantStatusUI();
    resultBox.innerHTML = `
      <span style="color:var(--red);font-weight:700;">Request blocked before reaching the server.</span>
      This is almost always a CORS restriction \u2014 the Mark43 Partnerships API is built for server-to-server calls, not browser JavaScript from an arbitrary origin like this artifact. A real integration needs a small backend to hold the token and make this call server-side.
    `;
  }
}

function importPersonnelFromMark43(users){
  let added = 0, updated = 0;
  users.forEach(u=>{
    const name = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').trim() || u.primaryEmail || 'Unnamed User';
    const badge = u.badgeNumber || u.cityIdNumber || '';
    const unit = u.mark43UserGroup || '';
    const email = u.primaryEmail || '';
    const externalKey = u.mark43Id != null ? String(u.mark43Id) : (u.primaryEmail || name);
    const existing = STATE.personnel.find(p=>p.mark43ExternalId===externalKey);
    if(existing){
      Object.assign(existing, {name, badge, unit, email});
      updated++;
    } else {
      STATE.personnel.push({
        id: "p_m43_"+externalKey.replace(/[^a-zA-Z0-9]/g,'_'),
        name, badge, unit, email, qualifications:[],
        roleIds: [STATE.roles[STATE.roles.length-1].id], // default to lowest-privilege role; reassign manually
        mark43ExternalId: externalKey,
      });
      added++;
    }
  });
  persist();
  toast(`Imported: ${added} added, ${updated} updated. New personnel default to "${STATE.roles[STATE.roles.length-1].name}" \u2014 reassign roles as needed.`);
  closeModal();
  if(ACTIVE_VIEW==='personnel') renderPersonnel();
}

/* =========================================================================
   INIT
   ========================================================================= */
/* ---------- Authentication (demo-grade; see login screen note) ---------- */
// Uses the authenticated identity from the shared shell.
let HOME_ROLE_ID = null;    // the role actually tied to the logged-in account, distinct from STATE.currentRoleId which admins can change to preview other roles

function accountForUsername(username){
  return STATE.accounts.find(a=>a.username.toLowerCase()===username.toLowerCase());
}

async function attemptLogin(){
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginError');
  errBox.style.display = 'none';
  if(!username || !password){ errBox.textContent = "Enter a username and password."; errBox.style.display=''; return; }
  const account = accountForUsername(username);
  if(!account){ errBox.textContent = "No account with that username."; errBox.style.display=''; return; }
  const hash = await hashPassword(password);
  if(hash !== account.passwordHash){ errBox.textContent = "Incorrect password."; errBox.style.display=''; return; }
  const person = STATE.personnel.find(p=>p.id===account.personId);
  if(!person){ errBox.textContent = "This account isn't linked to an active personnel record."; errBox.style.display=''; return; }
  CURRENT_USER_ID = person.id;
  HOME_ROLE_ID = person.roleId;
  STATE.currentRoleId = person.roleId;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.add('authenticated');
  await startApp();
}

function renderDemoAccountsList(){
  const box = document.getElementById('demoAccountsBox');
  const rows = STATE.accounts.map(a=>{
    const person = STATE.personnel.find(p=>p.id===a.personId);
    return `<div style="padding:3px 0;"><span class="mono">${escapeHtml(a.username)}</span> — ${person?escapeHtml(person.name)+' ('+escapeHtml(roleName(person.roleId))+')':'(unlinked)'}</div>`;
  }).join('');
  box.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">Password for all demo accounts: <span class="mono">${DEMO_PASSWORD}</span></div>${rows}`;
}

function startQmModule(){
  recalcOverdue();
  renderNav();
  switchView('qm-dashboard');
  const tenantBtn = document.getElementById('btnTenantInfo');
  if(tenantBtn && !tenantBtn.dataset.wired){ tenantBtn.addEventListener('click', openTenantInfoModal); tenantBtn.dataset.wired='1'; }
  const connectBtn = document.getElementById('btnConnectTenant');
  if(connectBtn && !connectBtn.dataset.wired){ connectBtn.addEventListener('click', openConnectionModal); connectBtn.dataset.wired='1'; }
  updateTenantStatusUI();
}
window.QM = { start: startQmModule, buildData: buildQmData, migrateData: migrateQmData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openEquipmentDetail };

})();


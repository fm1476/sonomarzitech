/* =========================================================================
   SHARED ICONS
   ========================================================================= */
const WEEKDAY_ABBR: any = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ICONS: any = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l4 4-4 4"/><path d="M3 7h8"/><path d="M17 21l-4-4 4-4"/><path d="M21 17h-8"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17H2V6a1 1 0 0 1 1-1h11v12z"/><path d="M14 9h4l4 4v4h-8V9z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg>',
    checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6l1 1 2-2"/><path d="M4 12l1 1 2-2"/><path d="M4 18l1 1 2-2"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18"/><path d="M14 9h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V7l-3-3"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12l2 2 4-4"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    idcard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 17c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5"/><path d="M14 9h5"/><path d="M14 13h5"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M9 13.5L7 22l5-3 5 3-2-8.5"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    pawprint: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 0-3.5 8.5 3.5 3.5 0 0 0 5 0 5 5 0 0 0 5 0 3.5 3.5 0 0 0 5 0A5 5 0 0 0 17 12"/><circle cx="4" cy="12" r="2"/></svg>',
    ribbon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M9 13.5L7 22l5-3 5 3-2-8.5"/><path d="M9.5 8l1.7 1.7L15 6.3"/></svg>',
    bone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9.5a2.5 2.5 0 1 1 3.6-3.5l7.9 7.9a2.5 2.5 0 1 1 3.5 3.6 2.5 2.5 0 1 1-3.6 3.5l-7.9-7.9a2.5 2.5 0 1 1-3.5-3.6z"/></svg>',
    drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="10" width="6" height="4" rx="1"/><path d="M9 11L4 6"/><path d="M15 11l5-5"/><path d="M9 13l-5 5"/><path d="M15 13l5 5"/><circle cx="4" cy="5" r="2.2"/><circle cx="20" cy="5" r="2.2"/><circle cx="4" cy="19" r="2.2"/><circle cx="20" cy="19" r="2.2"/></svg>',
    battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4"/><path d="M6 11v2"/></svg>',
    radio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l4 2"/></svg>',
    bomb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="14" r="8"/><path d="M16 8l2-2"/><path d="M17 4l3 1-1 3"/><path d="M19 3l1.5 1.5"/></svg>',
    vial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6.5L4.5 18a2 2 0 0 0 1.8 2.9h11.4a2 2 0 0 0 1.8-2.9L15 8.5V2"/><path d="M8.5 2h7"/><path d="M7 15h10"/></svg>',
    boxlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="11" rx="1"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/><circle cx="12" cy="15" r="1.5"/></svg>',
    gavel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10l-7.5 7.5a2.12 2.12 0 1 1-3-3L11 7"/><path d="M16 4l4 4"/><path d="M12.5 7.5l4-4 4 4-4 4z"/><path d="M2 21h9"/></svg>',
    dollar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M5 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M19 8l-3 6a3.5 3.5 0 0 0 6 0z"/><path d="M5 8h14"/><path d="M8 21h8"/></svg>',
    clipboardcheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M9 13l2 2 4-4"/></svg>',
    mappin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    filetext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
} as any;
/* =========================================================================
   SHARED LOW-LEVEL UTILS
   ========================================================================= */
/* =========================================================================
   SHARED SORTABLE TABLE HEADERS
   A single, generic click-to-sort utility any module or screen can use --
   several modules (Quartermaster, Fleet, Personnel, K9) already had their own
   working, independently-tested versions of this before this shared one was
   added, so those are left alone rather than risking a disruptive rewrite.
   This shared version is what every table built from here forward uses,
   avoiding yet another one-off duplicate per screen.
   ========================================================================= */
const SHARED_SORT: any = (window as any).SonoMarziShared.SHARED_SORT;
function sharedSortHeader(tableName?: any, label?: any, key?: any): any {
    return (window as any).SonoMarziShared.sharedSortHeader(tableName, label, key);
}
function wireSharedSortHeaders(tableName?: any, rerenderFn?: any): any {
    return (window as any).SonoMarziShared.wireSharedSortHeaders(tableName, rerenderFn);
}
function applySharedSort(tableName?: any, list?: any, accessorFn?: any): any {
    return (window as any).SonoMarziShared.applySharedSort(tableName, list, accessorFn);
}
/* =========================================================================
   SHARED FILTER INPUT (real-time, with persistent helper text)
   ========================================================================= */
// Every real-time filter re-renders its container via innerHTML on each keystroke, which destroys
// and recreates the <input> itself -- without this, focus (and the rest of what someone just typed)
// is lost after the very first character. Call this at the end of a filter's 'input' handler, after
// the render call that rebuilt the DOM, to restore focus and put the cursor back at the end.
function refocusFilterInput(id?: any): any {
    const el: any = (document as any).getElementById(id);
    if (el) {
        el.focus();
        const v: any = el.value;
        el.setSelectionRange(v.length, v.length);
    }
}
function filterInputHtml(id?: any, placeholder?: any, helperText?: any, currentValue?: any, width?: any): any {
    return `<input type="text" id="${id}" placeholder="${escapeHtml(placeholder)}" title="${escapeHtml(helperText)}" value="${escapeHtml(currentValue || '')}" style="width:${width || '220px'};">`;
}
/* =========================================================================
   FIELD DISPLAY NAME REGISTRY
   ========================================================================= */
const DEFAULT_FIELD_LABELS: any = {
    "pm.name": "Name", "pm.badgeNumber": "Badge #", "pm.rank": "Rank", "pm.unit": "Unit", "pm.employmentStatus": "Status",
    "pm.hireDate": "Hire Date", "pm.employeeId": "Employee ID", "pm.assignment": "Assignment",
    "qm.assetId": "Asset ID", "qm.itemName": "Item / Name", "qm.category": "Category", "qm.status": "Status",
    "qm.location": "Location", "qm.condition": "Condition", "qm.assignedTo": "Assigned To", "qm.dueDate": "Due",
    "fleet.unitNumber": "Unit #", "fleet.makeModel": "Vehicle", "fleet.status": "Status", "fleet.mileage": "Mileage",
    "fleet.location": "Location", "fleet.assignedTo": "Assigned To", "fleet.vehicleType": "Type",
    "eod.materialType": "Material", "eod.classification": "Classification", "eod.magazine": "Storage Magazine",
    "eod.quantity": "Quantity", "eod.acquisitionDate": "Acquired", "eod.status": "Status",
    "subpoena.staffMember": "Staff Member", "subpoena.caseNumber": "Case Number", "subpoena.courtDate": "Court Date",
    "subpoena.status": "Status", "subpoena.location": "Court Location",
    "audit.timestamp": "Timestamp", "audit.user": "User", "audit.module": "Module", "audit.entityType": "Entity Type", "audit.action": "Action",
    "grants.caseNumber": "Case Number", "grants.seizureType": "Seizure Type", "grants.estimatedValue": "Estimated Value",
    "grants.status": "Status", "grants.seizureDate": "Seizure Date", "grants.forfeitureType": "Forfeiture Type",
    "grants.grantName": "Grant Name", "grants.fundingAgency": "Funding Agency", "grants.awardAmount": "Award Amount",
    "grants.programArea": "Program Area", "grants.awardEndDate": "Award End Date",
    "k9.name": "K9 Name", "k9.breed": "Breed", "k9.sex": "Sex", "k9.handler": "Handler", "k9.status": "Status",
    "k9.tagId": "Tag ID", "k9.vendor": "Vendor",
    "drone.name": "Callsign / Name", "drone.model": "Model", "drone.category": "Category", "drone.status": "Status",
    "drone.serialNumber": "Serial Number", "drone.faaRegistration": "FAA Registration", "drone.operator": "Assigned Operator",
    "civil.caseNumber": "Case Number", "civil.paperType": "Paper Type", "civil.plaintiff": "Plaintiff", "civil.defendant": "Defendant",
    "civil.courtOfOrigin": "Court of Origin", "civil.receivedDate": "Received Date", "civil.returnByDate": "Return By Date"
} as any;
function fieldLabel(key?: any): any {
    return (STATE.fieldLabels && STATE.fieldLabels[key]) || DEFAULT_FIELD_LABELS[key] || key;
}
function escapeHtml(s?: any): any { return (window as any).SonoMarziShared.escapeHtml(s); }
// Neutralizes CSV/Excel formula injection (CWE-1236): a cell whose text begins with
// =, +, -, @, or a tab/CR is treated as a formula by Excel/Sheets/LibreOffice on open,
// which lets a value typed into any free-text field (name, notes, description, etc.)
// run as a formula on whoever opens an exported report. Prefixing with a bare single
// quote keeps every spreadsheet application treating the cell as plain text while
// leaving the visible content unchanged, and is the standard OWASP-recommended fix.
function csvSafeCell(v?: any): any {
    let s: any = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s))
        s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
}
// Gates the '[access]'/'[save]' console traces below behind an opt-in flag instead of
// always logging them. Those traces include the signed-in user's ID, their assigned
// roles, every module a tenant is licensed for, and (for a Platform Admin) the full
// tenant/agency catalog visible to that session -- useful when actually diagnosing an
// access problem, but not something every session should be printing to the console by
// default. Turn it on for the current browser by running
// localStorage.setItem('suite_debug_access','1') in devtools, then reload.
const DEBUG_ACCESS: any = ((): any => { try {
    return localStorage.getItem('suite_debug_access') === '1';
}
catch (e: any) {
    return false;
} })();
function debugLog(...args: any[]): any { if (DEBUG_ACCESS)
    console.log(...args); }
// ============================================================================
// SHARED REPORT FILTER BAR
// Every module's Reports tab uses this same small building block so filtering
// looks and behaves consistently across the whole suite, rather than each
// module inventing its own date-picker layout. A module keeps its OWN filter
// state object (so modules never interfere with each other) and its OWN
// filtering logic (since what "category" or "assignee" even means differs
// completely module to module) -- this only standardizes the UI and wiring.
//
// filters: array of field descriptors, each one of:
//   {type:'daterange', keyFrom, keyTo, label}
//   {type:'select', key, label, options:[...strings], allLabel?}
// state: a plain object the caller owns, read/written by key
// onChange: called after any control changes, so the caller can re-render
function renderReportFilterBar(hostEl?: any, filters?: any, state?: any, onChange?: any): any {
    hostEl.innerHTML = `
    <div class="report-filter-bar">
      ${filters.map((f?: any): any => {
        if (f.type === 'daterange') {
            return `<div class="form-row report-filter-field">
            <label>${escapeHtml(f.label)}</label>
            <div style="display:flex;gap:6px;align-items:center;">
              <input type="date" data-rf-key="${f.keyFrom}" value="${state[f.keyFrom] || ''}">
              <span style="color:var(--text-dim);font-size:11px;">to</span>
              <input type="date" data-rf-key="${f.keyTo}" value="${state[f.keyTo] || ''}">
            </div>
          </div>`;
        }
        return `<div class="form-row report-filter-field">
          <label>${escapeHtml(f.label)}</label>
          <select data-rf-key="${f.key}">
            <option value="All">${escapeHtml(f.allLabel || 'All')}</option>
            ${f.options.map((o?: any): any => `<option value="${escapeHtml(o)}" ${state[f.key] === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
          </select>
        </div>`;
    }).join('')}
      <div class="form-row report-filter-field" style="justify-content:flex-end;">
        <label>&nbsp;</label>
        <button type="button" class="btn btn-sm btn-outline" id="btnReportFilterClear">Clear Filters</button>
      </div>
    </div>
  `;
    hostEl.querySelectorAll('[data-rf-key]').forEach((el?: any): any => {
        el.addEventListener('change', (): any => { state[el.dataset.rfKey] = el.value; onChange(); });
    });
    hostEl.querySelector('#btnReportFilterClear').addEventListener('click', (): any => {
        filters.forEach((f?: any): any => {
            if (f.type === 'daterange') {
                state[f.keyFrom] = '';
                state[f.keyTo] = '';
            }
            else
                state[f.key] = 'All';
        });
        onChange();
    });
}
// True if dateStr falls within [from,to] -- either bound may be blank, meaning unbounded on
// that side. Used identically by every module's filtering logic.
function withinDateRange(dateStr?: any, from?: any, to?: any): any {
    if (!dateStr)
        return false;
    if (from && dateStr < from)
        return false;
    if (to && dateStr > to)
        return false;
    return true;
}
// backendClient.functions.invoke() always reports the generic "Edge Function returned a
// non-2xx status code" on error.message whenever the function itself returns any non-2xx
// status -- even though our tenant-admin function always sends a specific, useful message
// in its JSON body (e.g. "Assign another active System Admin before deleting this user.").
// The real message lives on the raw Response object at error.context and has to be read
// out of there manually; this is what every call site below should use instead of
// error.message directly.
async function functionErrorMessage(error?: any, fallback?: any): Promise<any> {
    fallback = fallback || 'Request failed.';
    if (!error)
        return fallback;
    const response: any = error.context;
    if (response && typeof response.json === 'function') {
        try {
            const body: any = await response.clone().json();
            if (body && body.error)
                return body.error;
        }
        catch { }
    }
    return error.message || fallback;
}
/* =========================================================================
   BULK IMPORT — one shared engine (template download, CSV parsing, per-row
   validation, preview, import) driven by a schema per module, rather than a
   bespoke implementation nine times over. Each schema below defines exactly
   what a real "Add" form for that module already accepts, so a template
   downloaded today always matches what the screen actually supports; when a
   field gets added to a module later, add it here too and every template
   downloaded after that reflects it automatically.
   ========================================================================= */
const BULK_IMPORT_SCHEMAS: any = {
    personnel: {
        label: 'Personnel',
        ability: 'personnel_bulk_import',
        fields: [
            { key: 'name', label: 'Full Name', required: true } as any,
            { key: 'badge', label: 'Badge Number', required: false } as any,
            { key: 'email', label: 'Email', required: false } as any,
            { key: 'unit', label: 'Unit', required: false } as any,
        ],
        sample: { name: 'Jane Doe', badge: '1234', email: 'jane.doe@department.gov', unit: 'Patrol - A Shift' } as any,
        build(row?: any) {
            return { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 7), name: row.name, badge: row.badge || '', email: row.email || '', unit: row.unit || '', roleIds: [], status: 'Active' } as any;
        },
        existingArray() { return STATE.personnel; },
        matchExisting(row?: any, arr?: any) { return row.email ? arr.find((p?: any): any => (p.email || '').toLowerCase() === row.email.toLowerCase()) : null; }
    } as any,
    training: {
        label: 'Training Records',
        ability: 'pm_training_bulk_import',
        fields: [
            { key: 'personName', label: 'Person (Full Name or Badge)', required: true } as any,
            { key: 'courseName', label: 'Course Name (must match an existing course in the catalog)', required: true } as any,
            { key: 'date', label: 'Date Completed (YYYY-MM-DD)', required: true } as any,
            { key: 'hours', label: 'Hours', required: false } as any,
            { key: 'provider', label: 'Provider', required: false } as any,
            { key: 'location', label: 'Location', required: false } as any,
            { key: 'passed', label: 'Passed (true/false)', required: false } as any,
            { key: 'score', label: 'Score', required: false } as any,
        ],
        sample: { personName: 'Jane Doe', courseName: 'Firearms Qualification', date: '2026-01-15', hours: '4', provider: 'Range Staff', location: 'Indoor Range', passed: 'true', score: '95' } as any,
        resolve(row?: any) {
            const person: any = STATE.personnel.find((p?: any): any => p.name.toLowerCase() === row.personName.toLowerCase() || (p.badge && p.badge === row.personName));
            if (!person)
                return { error: `No matching person found for "${row.personName}"` } as any;
            const course: any = STATE.pm.trainingCourses.find((c?: any): any => c.name.toLowerCase() === row.courseName.toLowerCase());
            if (!course)
                return { error: `No matching course found for "${row.courseName}" \u2014 add it to the course catalog first` } as any;
            return { person, course } as any;
        },
        build(row?: any, resolved?: any) {
            return { id: 'tr' + Date.now() + Math.random().toString(36).slice(2, 7), personId: resolved.person.id, courseId: resolved.course.id, date: row.date,
                hours: Number(row.hours) || 0, cost: 0, description: resolved.course.name, provider: row.provider || '', location: row.location || '', method: '',
                attendedStatus: 'Completed', score: row.score ? Number(row.score) : null, passed: row.passed ? /^true$/i.test(row.passed) : null,
                recertRequired: false, recertDate: null, narrative: '', documents: [] } as any;
        },
        existingArray() { return STATE.pm.trainingRecords; }
    } as any,
    quartermaster: {
        label: 'Quartermaster Equipment',
        ability: 'qm_bulk_import',
        fields: [
            { key: 'assetId', label: 'Asset ID', required: false } as any,
            { key: 'name', label: 'Item Name', required: true } as any,
            { key: 'category', label: 'Category', required: false } as any,
            { key: 'manufacturer', label: 'Manufacturer', required: false } as any,
            { key: 'model', label: 'Model', required: false } as any,
            { key: 'serialNumber', label: 'Serial Number', required: false } as any,
            { key: 'status', label: 'Status', required: false } as any,
            { key: 'condition', label: 'Condition', required: false } as any,
            { key: 'location', label: 'Location', required: false } as any,
            { key: 'value', label: 'Value ($)', required: false } as any,
            { key: 'purchaseDate', label: 'Purchase Date (YYYY-MM-DD)', required: false } as any,
            { key: 'quantity', label: 'Quantity (for consumables)', required: false } as any,
        ],
        sample: { assetId: 'QM-1001', name: 'Duty Belt - Nylon', category: 'Gear', manufacturer: '5.11', model: 'VTAC', serialNumber: '', status: 'Available', condition: 'New', location: 'Main Armory', value: '85', purchaseDate: '2026-01-10', quantity: '1' } as any,
        build(row?: any) {
            return { id: 'e' + Date.now() + Math.random().toString(36).slice(2, 7), assetId: row.assetId || '', name: row.name, manufacturer: row.manufacturer || null, model: row.model || null,
                category: row.category || 'Gear', equipmentType: row.category || 'Gear', condition: row.condition || 'New', status: row.status || 'Available', location: row.location || '',
                agency: '', isSharedAsset: false, vendorId: null, value: Number(row.value) || 0, purchaseDate: row.purchaseDate || '', inServiceDate: row.purchaseDate || '',
                replacementDate: null, notes: '', isConsumable: false, serialNumber: row.serialNumber || null, quantity: Number(row.quantity) || 1, minQuantity: null,
                ownershipType: 'Agency', assignedTo: null, assignedToType: null, personalWeaponAuth: null, photoDataUrl: null, disposal: null } as any;
        },
        existingArray() { return STATE.qm.equipment; },
        matchExisting(row?: any, arr?: any) { return row.assetId ? arr.find((e?: any): any => e.assetId === row.assetId) : null; }
    } as any,
    fleet: {
        label: 'Fleet Vehicles',
        ability: 'fleet_bulk_import',
        fields: [
            { key: 'unitNumber', label: 'Unit Number / Call Sign', required: true } as any,
            { key: 'make', label: 'Make', required: false } as any,
            { key: 'model', label: 'Model', required: false } as any,
            { key: 'year', label: 'Year', required: false } as any,
            { key: 'vin', label: 'VIN', required: false } as any,
            { key: 'licensePlate', label: 'License Plate', required: false } as any,
            { key: 'vehicleType', label: 'Vehicle Type', required: false } as any,
            { key: 'status', label: 'Status', required: false } as any,
            { key: 'mileage', label: 'Mileage', required: false } as any,
            { key: 'location', label: 'Location', required: false } as any,
            { key: 'purchaseDate', label: 'Purchase Date (YYYY-MM-DD)', required: false } as any,
        ],
        sample: { unitNumber: 'Patrol-14', make: 'Ford', model: 'Explorer', year: '2024', vin: '', licensePlate: '', vehicleType: 'Patrol SUV', status: 'In Service', mileage: '1200', location: 'North Substation', purchaseDate: '2026-01-05' } as any,
        build(row?: any) {
            return { id: 'veh' + Date.now() + Math.random().toString(36).slice(2, 7), unitNumber: row.unitNumber, make: row.make || '', model: row.model || '',
                year: Number(row.year) || (new Date() as any).getFullYear(), vin: row.vin || '', licensePlate: row.licensePlate || '', vehicleType: row.vehicleType || 'Patrol',
                status: row.status || 'In Service', mileage: Number(row.mileage) || 0, fuelType: 'Gasoline', location: row.location || '', agency: '', isSharedAsset: false,
                assignedToType: null, assignedTo: null, purchaseDate: row.purchaseDate || '', inServiceDate: row.purchaseDate || '', notes: '', currentFuelLevel: 100,
                equipmentChecklist: (typeof stdEquipmentChecklist === 'function' ? stdEquipmentChecklist() : []), photoDataUrl: null, disposal: null } as any;
        },
        existingArray() { return STATE.fleet.vehicles; },
        matchExisting(row?: any, arr?: any) { return arr.find((v?: any): any => v.unitNumber === row.unitNumber); }
    } as any,
    k9: {
        label: 'K9',
        ability: 'k9_bulk_import',
        fields: [
            { key: 'name', label: 'K9 Name', required: true } as any,
            { key: 'breed', label: 'Breed', required: false } as any,
            { key: 'sex', label: 'Sex', required: false } as any,
            { key: 'dob', label: 'Date of Birth (YYYY-MM-DD)', required: false } as any,
            { key: 'dateAcquired', label: 'Date Acquired (YYYY-MM-DD)', required: false } as any,
            { key: 'handlerName', label: 'Handler (Full Name or Badge)', required: false } as any,
            { key: 'status', label: 'Status', required: false } as any,
            { key: 'tagId', label: 'Tag ID', required: false } as any,
            { key: 'vendor', label: 'Vendor', required: false } as any,
            { key: 'microchipNumber', label: 'Microchip Number', required: false } as any,
        ],
        sample: { name: 'Rex', breed: 'Belgian Malinois', sex: 'Male', dob: '2022-03-01', dateAcquired: '2023-01-15', handlerName: 'Jane Doe', status: 'Active', tagId: 'K-501', vendor: 'K9 Partners LLC', microchipNumber: '' } as any,
        resolve(row?: any) {
            if (!row.handlerName)
                return {} as any;
            const handler: any = STATE.personnel.find((p?: any): any => p.name.toLowerCase() === row.handlerName.toLowerCase() || (p.badge && p.badge === row.handlerName));
            if (!handler)
                return { error: `No matching handler found for "${row.handlerName}"` } as any;
            return { handler } as any;
        },
        build(row?: any, resolved?: any) {
            return { id: 'k9_' + Date.now() + Math.random().toString(36).slice(2, 7), name: row.name, breed: row.breed || '', sex: row.sex || 'Male', dob: row.dob || '',
                dateAcquired: row.dateAcquired || '', handlerId: resolved.handler ? resolved.handler.id : '', backupHandlerId: null, status: row.status || 'Active',
                tagId: row.tagId || '', skills: [], vendor: row.vendor || '', microchipNumber: row.microchipNumber || '', gpsCollarId: '', notes: '', retirementDate: null,
                retirementDisposition: 'N/A', photoDataUrl: null, agency: '', unit: 'K9 Unit', medical: (typeof emptyMedicalK9 === 'function' ? emptyMedicalK9() : {} as any),
                equipment: [], deceasedDate: null, lastKnownLocation: null, locationHistory: [], fieldHistory: [] } as any;
        },
        existingArray() { return STATE.k9.k9s; },
        matchExisting(row?: any, arr?: any) { return row.tagId ? arr.find((k?: any): any => k.tagId === row.tagId) : null; }
    } as any,
    drone: {
        label: 'Drone / UAS',
        ability: 'drone_bulk_import',
        fields: [
            { key: 'name', label: 'Callsign / Name', required: true } as any,
            { key: 'model', label: 'Model', required: false } as any,
            { key: 'category', label: 'Category', required: false } as any,
            { key: 'serialNumber', label: 'Serial Number', required: false } as any,
            { key: 'faaRegistrationNumber', label: 'FAA Registration (N-Number)', required: false } as any,
            { key: 'status', label: 'Status', required: false } as any,
            { key: 'dateAcquired', label: 'Date Acquired (YYYY-MM-DD)', required: false } as any,
            { key: 'registrationExpiration', label: 'Registration Expiration (YYYY-MM-DD)', required: false } as any,
            { key: 'vendor', label: 'Vendor', required: false } as any,
        ],
        sample: { name: 'Air-1', model: 'DJI Matrice 30', category: 'Quadcopter', serialNumber: '', faaRegistrationNumber: 'FA3XXXX', status: 'Available', dateAcquired: '2026-01-01', registrationExpiration: '2029-01-01', vendor: 'DJI' } as any,
        build(row?: any) {
            return { id: 'd' + Date.now() + Math.random().toString(36).slice(2, 7), name: row.name, model: row.model || '', make: (row.model || '').split(' ')[0] || '',
                category: row.category || 'Quadcopter', status: row.status || 'Available', serialNumber: row.serialNumber || '', faaRegistrationNumber: row.faaRegistrationNumber || '',
                assignedOperatorId: '', homeDock: '', sensorPayload: [], dateAcquired: row.dateAcquired || '', registrationExpiration: row.registrationExpiration || '',
                maxFlightTimeMin: 30, vendor: row.vendor || '', purchasePrice: 0, notes: '', retirementDate: null, photoDataUrl: null, remoteIdCompliant: true,
                totalFlightHours: 0, totalFlights: 0, batteries: [], deceasedDate: null, fieldHistory: [] } as any;
        },
        existingArray() { return STATE.drone.drones; },
        matchExisting(row?: any, arr?: any) { return row.serialNumber ? arr.find((d?: any): any => d.serialNumber === row.serialNumber) : null; }
    } as any,
    eod: {
        label: 'EOD Technicians',
        ability: 'eod_bulk_import',
        fields: [
            { key: 'personName', label: 'Person (Full Name or Badge, must already exist in Personnel Administration)', required: true } as any,
            { key: 'hdsCertNumber', label: 'HDS Certification Number', required: false } as any,
            { key: 'hdsCertDate', label: 'HDS Cert Date (YYYY-MM-DD)', required: false } as any,
            { key: 'hdsRecertDueDate', label: 'HDS Recert Due (YYYY-MM-DD)', required: false } as any,
            { key: 'hazmatTechCert', label: 'HazMat Tech Certified (true/false)', required: false } as any,
            { key: 'cesCredential', label: 'CES Credential (true/false)', required: false } as any,
            { key: 'cesNumber', label: 'CES Number', required: false } as any,
            { key: 'status', label: 'Status', required: false } as any,
        ],
        sample: { personName: 'Jane Doe', hdsCertNumber: 'HDS-1234', hdsCertDate: '2024-06-01', hdsRecertDueDate: '2027-06-01', hazmatTechCert: 'true', cesCredential: 'false', cesNumber: '', status: 'Active' } as any,
        resolve(row?: any) {
            const person: any = STATE.personnel.find((p?: any): any => p.name.toLowerCase() === row.personName.toLowerCase() || (p.badge && p.badge === row.personName));
            if (!person)
                return { error: `No matching person found for "${row.personName}" \u2014 add them in Personnel Administration first` } as any;
            return { person } as any;
        },
        build(row?: any, resolved?: any) {
            return { personId: resolved.person.id, hdsCertNumber: row.hdsCertNumber || '', hdsCertDate: row.hdsCertDate || '', hdsRecertDueDate: row.hdsRecertDueDate || '',
                hazmatTechCert: /^true$/i.test(row.hazmatTechCert || ''), hazmatTechCertDate: null, cesCredential: /^true$/i.test(row.cesCredential || ''),
                cesNumber: row.cesNumber || null, cesCertDate: null, status: row.status || 'Active', fieldHistory: [] } as any;
        },
        existingArray() { return STATE.eod.technicians; },
        matchExisting(row?: any, arr?: any, resolved?: any) { return resolved.person ? arr.find((t?: any): any => t.personId === resolved.person.id) : null; }
    } as any,
    civil: {
        label: 'Civil Process',
        ability: 'civil_bulk_import',
        fields: [
            { key: 'caseNumber', label: 'Case Number', required: true } as any,
            { key: 'paperType', label: 'Paper Type', required: true } as any,
            { key: 'plaintiff', label: 'Plaintiff', required: false } as any,
            { key: 'defendant', label: 'Defendant', required: true } as any,
            { key: 'courtOfOrigin', label: 'Court of Origin', required: false } as any,
            { key: 'attorneyOfRecord', label: 'Attorney of Record', required: false } as any,
            { key: 'address', label: 'Service Address', required: false } as any,
            { key: 'receivedDate', label: 'Received Date (YYYY-MM-DD)', required: false } as any,
            { key: 'returnByDate', label: 'Return By Date (YYYY-MM-DD)', required: false } as any,
        ],
        sample: { caseNumber: 'CV-2026-001', paperType: 'Summons', plaintiff: 'Smith Bank', defendant: 'John Public', courtOfOrigin: 'Superior Court', attorneyOfRecord: 'Law Offices of X', address: '123 Main St', receivedDate: '2026-01-10', returnByDate: '2026-02-10' } as any,
        build(row?: any) {
            return { id: 'cp' + Date.now() + Math.random().toString(36).slice(2, 7), caseNumber: row.caseNumber, paperType: row.paperType, courtOfOrigin: row.courtOfOrigin || '',
                attorneyOfRecord: row.attorneyOfRecord || '', plaintiff: row.plaintiff || '', defendant: row.defendant,
                serviceAddresses: row.address ? [{ id: 'addr1', address: row.address, isPrimary: true } as any] : [], receivedDate: row.receivedDate || '', returnByDate: row.returnByDate || '',
                assignedServerId: null, notes: '', priority: 'Standard', stage: 'Unassigned', serviceMethod: null, attempts: [], servedDate: null, servedTime: null,
                servedOnName: null, feeLineItems: [], feePayments: [], mileage: 0, returnFiledDate: null, fieldHistory: [] } as any;
        },
        existingArray() { return STATE.civil.papers; },
        matchExisting(row?: any, arr?: any) { return arr.find((p?: any): any => p.caseNumber === row.caseNumber); }
    } as any,
    subpoena: {
        label: 'Subpoenas',
        ability: 'subpoena_bulk_import',
        fields: [
            { key: 'personName', label: 'Person (Full Name or Badge)', required: true } as any,
            { key: 'caseNumber', label: 'Case Number', required: true } as any,
            { key: 'courtDate', label: 'Court Date (YYYY-MM-DD)', required: true } as any,
            { key: 'courtTime', label: 'Court Time', required: false } as any,
            { key: 'courtLocation', label: 'Court Location', required: false } as any,
            { key: 'courtroom', label: 'Courtroom / Department', required: false } as any,
            { key: 'subject', label: 'Subject / Description', required: false } as any,
            { key: 'issuedBy', label: 'Issued By', required: false } as any,
        ],
        sample: { personName: 'Jane Doe', caseNumber: 'CR-2026-045', courtDate: '2026-03-01', courtTime: '09:00', courtLocation: 'Main Courthouse', courtroom: 'Dept 3', subject: 'Testimony re: traffic stop', issuedBy: "District Attorney's Office" } as any,
        resolve(row?: any) {
            const person: any = STATE.personnel.find((p?: any): any => p.name.toLowerCase() === row.personName.toLowerCase() || (p.badge && p.badge === row.personName));
            if (!person)
                return { error: `No matching person found for "${row.personName}"` } as any;
            return { person } as any;
        },
        build(row?: any, resolved?: any) {
            return { id: 'sub' + Date.now() + Math.random().toString(36).slice(2, 7), personId: resolved.person.id, caseNumber: row.caseNumber, courtDate: row.courtDate,
                courtTime: row.courtTime || '', status: 'Pending', courtLocation: row.courtLocation || '', courtroom: row.courtroom || '', subject: row.subject || '',
                issuedDate: fmt(new Date() as any), issuedBy: row.issuedBy || '', notes: '', notifiedDate: null, notifiedBy: null, acknowledgedDate: null, acknowledgedBy: null,
                attachments: [], fieldHistory: [] } as any;
        },
        existingArray() { return STATE.subpoena.subpoenas; }
    } as any
} as any;
function bulkImportDownloadTemplate(schemaKey?: any): any {
    const schema: any = BULK_IMPORT_SCHEMAS[schemaKey];
    const headers: any = schema.fields.map((f?: any): any => f.label);
    const sampleRow: any = schema.fields.map((f?: any): any => schema.sample?.[f.key] ?? '');
    const csv: any = Papa.unparse({ fields: headers, data: [sampleRow] } as any);
    const blob: any = new Blob([csv], { type: 'text/csv;charset=utf-8;' } as any);
    const url: any = URL.createObjectURL(blob);
    const a: any = (document as any).createElement('a');
    a.href = url;
    a.download = `${schema.label.replace(/[^a-z0-9]+/gi, '_')}_import_template.csv`;
    (document as any).body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
function renderBulkImportTab(body?: any, schemaKey?: any): any {
    const schema: any = BULK_IMPORT_SCHEMAS[schemaKey];
    let parsedRows: any = null;
    function draw(): any {
        body.innerHTML = `
      <div class="panel"><div class="panel-head"><h2>Bulk Import \u2014 ${escapeHtml(schema.label)}</h2></div>
        <div class="panel-body">
          <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:14px;max-width:680px;">
            Download the current template, fill in one row per record, then upload it here. The template's columns match what this screen actually supports right now \u2014 re-download it any time fields change, rather than reusing an old copy.
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;align-items:center;">
            <button class="btn btn-outline" id="btnDownloadTemplate">${ICONS.download || ''} Download Template</button>
            <label class="btn btn-primary" style="cursor:pointer;margin:0;">${ICONS.plus || ''} Choose File to Upload<input type="file" id="fBulkFile" accept=".csv" style="display:none;"></label>
          </div>
          <div id="bulkPreviewArea"></div>
        </div>
      </div>
    `;
        (document as any).getElementById('btnDownloadTemplate').addEventListener('click', (): any => bulkImportDownloadTemplate(schemaKey));
        (document as any).getElementById('fBulkFile').addEventListener('change', handleFile);
    }
    function handleFile(e?: any): any {
        const file: any = e.target.files[0];
        if (!file)
            return;
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete(results?: any) {
                const rawRows: any = results.data;
                parsedRows = rawRows.map((rawRow?: any): any => {
                    const row: any = {} as any;
                    schema.fields.forEach((f?: any): any => { row[f.key] = (rawRow[f.label] ?? '').toString().trim(); });
                    const errors: any = [];
                    schema.fields.forEach((f?: any): any => { if (f.required && !row[f.key])
                        errors.push(`Missing required "${f.label}"`); });
                    let resolved: any = {} as any;
                    if (!errors.length && schema.resolve) {
                        const r: any = schema.resolve(row);
                        if (r.error)
                            errors.push(r.error);
                        else
                            resolved = r;
                    }
                    const existingArr: any = schema.existingArray();
                    const dup: any = !errors.length && schema.matchExisting ? schema.matchExisting(row, existingArr, resolved) : null;
                    return { row, errors, resolved, dup } as any;
                });
                drawPreview();
            },
            error(err?: any) { toast("Could not read that file: " + err.message, true); }
        } as any);
    }
    function drawPreview(): any {
        const area: any = (document as any).getElementById('bulkPreviewArea');
        const validRows: any = parsedRows.filter((r?: any): any => !r.errors.length);
        const errorCount: any = parsedRows.length - validRows.length;
        const updateCount: any = validRows.filter((r?: any): any => r.dup).length;
        area.innerHTML = `
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;">
        ${parsedRows.length} row${parsedRows.length === 1 ? '' : 's'} found \u2014
        <span style="color:var(--green);">${validRows.length} ready</span>${updateCount ? ` (${updateCount} will update existing records)` : ''}${errorCount ? `, <span style="color:var(--red);">${errorCount} with errors (will be skipped)</span>` : ''}
      </div>
      <div style="max-height:320px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:14px;">
        <table><thead><tr><th>#</th><th>Status</th>${schema.fields.map((f?: any): any => `<th>${escapeHtml(f.label)}</th>`).join('')}</tr></thead><tbody>
          ${parsedRows.map((r?: any, i?: any): any => `<tr>
            <td>${i + 1}</td>
            <td>${r.errors.length ? `<span style="color:var(--red);" title="${escapeHtml(r.errors.join('; '))}">Error</span>` : r.dup ? '<span style="color:var(--gold);">Update</span>' : '<span style="color:var(--green);">New</span>'}</td>
            ${schema.fields.map((f?: any): any => `<td>${escapeHtml(r.row[f.key] || '')}</td>`).join('')}
          </tr>`).join('')}
        </tbody></table>
      </div>
      ${validRows.length ? `<button class="btn btn-primary" id="btnConfirmImport">Import ${validRows.length} Record${validRows.length === 1 ? '' : 's'}</button>` : ''}
      <button class="btn btn-outline" id="btnCancelImport" style="margin-left:8px;">Cancel</button>
    `;
        const confirmBtn: any = (document as any).getElementById('btnConfirmImport');
        if (confirmBtn)
            confirmBtn.addEventListener('click', doImport);
        (document as any).getElementById('btnCancelImport').addEventListener('click', (): any => { parsedRows = null; draw(); });
    }
    function doImport(): any {
        let added: any = 0, updated: any = 0;
        const arr: any = schema.existingArray();
        parsedRows.filter((r?: any): any => !r.errors.length).forEach((r?: any): any => {
            const record: any = schema.build(r.row, r.resolved);
            if (r.dup) {
                const keepId: any = r.dup.id;
                Object.assign(r.dup, record);
                if (keepId !== undefined)
                    r.dup.id = keepId;
                updated++;
            }
            else {
                arr.push(record);
                added++;
            }
        });
        logAuditEntry('Shared', `Bulk imported ${schema.label}: ${added} added, ${updated} updated.`, 'bulk_import');
        persist();
        toast(`Import complete: ${added} added, ${updated} updated.`);
        parsedRows = null;
        draw();
    }
    draw();
}
function money(n?: any): any { return (window as any).SonoMarziShared.money(n); }
// A single address should open whichever maps app actually makes sense for the device it's
// clicked on -- Apple Maps on Apple hardware (where it's the one already installed and signed
// in), Google Maps everywhere else, since a plain web link can't know the user's preference,
// only their platform.
function mapsUrlFor(address?: any): any {
    const encoded: any = encodeURIComponent(address);
    const isApple: any = /Mac|iPhone|iPad|iPod/.test((navigator as any).platform || '') || /iPhone|iPad|iPod/.test((navigator as any).userAgent || '');
    return isApple ? `https://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
// A small, real, live map (Google's free no-API-key embed, so this doesn't depend on anyone
// provisioning and paying for a Maps API key) with a fully transparent link laid over the top,
// so the whole picture -- not just a caption underneath it -- opens the maps app on click.
// pointer-events:none on the iframe keeps every click going to that overlay instead of panning
// the embedded map itself.
function mapPictureHtml(address?: any, opts?: any): any {
    opts = opts || {} as any;
    const height: any = opts.height || 160;
    const maxWidth: any = opts.maxWidth || 420;
    const url: any = mapsUrlFor(address);
    const embedSrc: any = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
    return `<div style="position:relative;width:100%;max-width:${maxWidth}px;height:${height}px;border-radius:8px;overflow:hidden;border:1px solid var(--border);background:var(--lightgray);">
    <iframe src="${embedSrc}" style="width:100%;height:100%;border:0;pointer-events:none;" loading="lazy" title="Map of ${address.replace(/"/g, '&quot;')}"></iframe>
    <a href="${url}" target="_blank" rel="noopener" style="position:absolute;inset:0;" title="Open in Maps"></a>
  </div>`;
}
function addDays(d?: any, n?: any): any { const r: any = new Date(d) as any; r.setDate(r.getDate() + n); return r; }
function fmt(d?: any): any { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function daysBetween(a?: any, b?: any): any { return Math.round(((new Date(b) as any) - (new Date(a) as any)) / 86400000); }
function toast(msg?: any, isErr?: any): any {
    return (window as any).SonoMarziShared.toast(msg, isErr);
}
function openModal(): any { SuiteUX.openModal(); }
function closeModal(event?: any): any { return SuiteUX.closeModal(event); }
/* =========================================================================
   PLATFORM AUDIT LOG (shared, cross-module) — who did what, when, from where.
   IP is looked up once per session via a public IP-echo service (no backend
   of our own to log from); if that lookup fails (offline, blocked network)
   we fall back to "Unknown" rather than fabricate one.
   ========================================================================= */
let SESSION_IP: any = null;
async function fetchSessionIp(): Promise<any> {
    try {
        const res: any = await fetch('https://api.ipify.org?format=json');
        const data: any = await res.json();
        SESSION_IP = data.ip || 'Unknown';
    }
    catch (e: any) {
        SESSION_IP = 'Unknown';
    }
}
function logAuditEntry(moduleName?: any, action?: any, entityType?: any): any {
    if (!STATE.auditLog)
        STATE.auditLog = [];
    const person: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID);
    STATE.auditLog.push({
        id: 'aud' + Date.now() + Math.random().toString(36).slice(2, 7),
        timestamp: (new Date() as any).toISOString(),
        userId: CURRENT_USER_ID || null,
        userName: person ? person.name : 'System',
        module: moduleName,
        entityType: entityType || 'general',
        action,
        ip: SESSION_IP || 'Unknown'
    } as any);
    // The push above is local-only and gives instant feedback in this tab, but doesn't survive a
    // reload or reach anyone else -- suite_apply_changes deliberately refuses to save auditLog
    // changes at all (a real, intentional security boundary, not a bug: it stops any authenticated
    // user from tampering with their own audit trail through the generic save path). This is the
    // actual durable write, through the dedicated, restricted function built for exactly this,
    // fired without blocking whatever code just called logAuditEntry synchronously.
    if (typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared' && typeof backendClient !== 'undefined' && backendClient) {
        const ctx: any = SuiteStore.remoteContext();
        if (ctx.tenantId && ctx.agencyId) {
            backendClient.rpc('suite_log_activity', {
                p_tenant_id: ctx.tenantId, p_agency_id: ctx.agencyId,
                p_module: moduleName, p_description: action, p_entity_type: entityType || 'general'
            } as any).then(({ error }: any): any => { if (error)
                console.error('Activity log write failed:', error.message); });
        }
    }
}
/* =========================================================================
   UNIVERSAL SEARCHABLE DROPDOWNS
   Every <select> in the app (across all three modules, present and future)
   gets a type-to-filter text input in front of it automatically. The
   original <select> stays in the DOM, hidden, so every existing line of
   code that reads/writes its .value or listens for its 'change' event
   keeps working completely unchanged \u2014 nothing elsewhere had to be edited.
   ========================================================================= */
function enhanceSelectToSearchable(select?: any): any {
    if (select.dataset.searchEnhanced || select.multiple)
        return;
    select.dataset.searchEnhanced = '1';
    const wrap: any = (document as any).createElement('span');
    wrap.className = 'searchable-select-wrap' + (select.closest('.form-row, .form-2col, .form-3col') ? ' block' : '');
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.style.display = 'none';
    const input: any = (document as any).createElement('input');
    input.type = 'text';
    input.className = 'searchable-select-input';
    input.id = (select.id || ('select-' + Math.random().toString(36).slice(2))) + '-input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const sourceLabel: any = select.closest('.form-row')?.querySelector('label');
    if (sourceLabel) {
        sourceLabel.htmlFor = input.id;
        input.setAttribute('aria-label', sourceLabel.textContent);
    }
    else
        input.setAttribute('aria-label', select.title || select.id || 'Select an option');
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (select.disabled)
        input.disabled = true;
    wrap.appendChild(input);
    const list: any = (document as any).createElement('div');
    list.className = 'searchable-select-list';
    list.id = input.id + '-list';
    list.setAttribute('role', 'listbox');
    input.setAttribute('aria-controls', list.id);
    new MutationObserver((): any => input.setAttribute('aria-expanded', String(list.style.display !== 'none'))).observe(list, { attributes: true, attributeFilter: ['style'] } as any);
    list.style.display = 'none';
    wrap.appendChild(list);
    function syncInputFromSelect(): any {
        const opt: any = select.options[select.selectedIndex];
        input.value = opt ? (typeof SuiteUX !== 'undefined' ? SuiteUX.normalizeDisplayText(opt.textContent) : opt.textContent) : '';
    }
    syncInputFromSelect();
    // keep the visible text in sync if code elsewhere rebuilds this select's
    // options in place (rare in this app, but cheap to guard against)
    new MutationObserver(syncInputFromSelect).observe(select, { childList: true, subtree: true } as any);
    let highlighted: any = -1;
    function renderList(filterText?: any): any {
        const q: any = (filterText || '').toLowerCase();
        const opts: any = Array.from(select.options).filter((o?: any): any => o.textContent.toLowerCase().includes(q));
        highlighted = opts.length ? 0 : -1;
        list.innerHTML = opts.map((o?: any, i?: any): any => `<div role="option" aria-selected="${o.value === select.value}" id="${input.id}-option-${i}" class="searchable-select-option ${o.value === select.value ? 'selected' : ''} ${i === highlighted ? 'hl' : ''}" data-value="${o.value.replace(/"/g, '&quot;')}">${escapeHtml(o.textContent)}</div>`).join('')
            || `<div class="searchable-select-empty">No matches</div>`;
        list.querySelectorAll('.searchable-select-option').forEach((div?: any): any => {
            div.addEventListener('mousedown', (e?: any): any => {
                e.preventDefault();
                select.value = div.dataset.value;
                select.dispatchEvent(new Event('change', { bubbles: true } as any));
                syncInputFromSelect();
                closeList();
            });
        });
    }
    // The list is only moved into document.body (position:fixed) while it's actually open, so a
    // dropdown that would otherwise be clipped by a scrolling modal can render on top of everything
    // instead. It moves back into its normal spot in the wrap the instant it closes, so nothing gets
    // left behind in the DOM if the modal itself closes or gets rebuilt while a list is open.
    function positionList(): any {
        const rect: any = input.getBoundingClientRect();
        const zoom: any = (parseFloat((document as any).documentElement.style.zoom) || 100) / 100;
        const wantHeight: any = Math.min(220, list.scrollHeight || 220);
        const spaceBelow: any = (window as any).innerHeight - rect.bottom;
        const spaceAbove: any = rect.top;
        const openUpward: any = spaceBelow < wantHeight + 8 && spaceAbove > spaceBelow;
        list.style.left = (rect.left / zoom) + 'px';
        list.style.width = (rect.width / zoom) + 'px';
        if (openUpward) {
            list.style.top = 'auto';
            list.style.bottom = (((window as any).innerHeight - rect.top + 2) / zoom) + 'px';
        }
        else {
            list.style.bottom = 'auto';
            list.style.top = ((rect.bottom + 2) / zoom) + 'px';
        }
    }
    function repositionIfOpen(): any { if (list.style.display !== 'none')
        positionList(); }
    (window as any).addEventListener('scroll', repositionIfOpen, true);
    (window as any).addEventListener('resize', repositionIfOpen);
    function openList(): any {
        if (input.disabled)
            return;
        renderList('');
        if (list.parentNode !== (document as any).body)
            (document as any).body.appendChild(list);
        list.style.display = '';
        positionList();
        input.select();
    }
    function closeList(): any {
        list.style.display = 'none';
        if (list.parentNode === (document as any).body)
            wrap.appendChild(list);
    }
    input.addEventListener('focus', openList);
    input.addEventListener('mousedown', (): any => { if (list.style.display === 'none')
        openList(); });
    input.addEventListener('input', (): any => { renderList(input.value); list.style.display = ''; positionList(); });
    input.addEventListener('keydown', (e?: any): any => {
        const opts: any = Array.from(list.querySelectorAll('.searchable-select-option'));
        if (e.key === 'Escape') {
            e.stopPropagation();
            closeList();
            syncInputFromSelect();
            input.blur();
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (list.style.display === 'none')
                return openList();
            highlighted = Math.min(highlighted + 1, opts.length - 1);
            opts.forEach((o?: any, i?: any): any => o.classList.toggle('hl', i === highlighted));
            if (opts[highlighted])
                input.setAttribute('aria-activedescendant', opts[highlighted].id);
            opts[highlighted] && opts[highlighted].scrollIntoView({ block: 'nearest' } as any);
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            highlighted = Math.max(highlighted - 1, 0);
            opts.forEach((o?: any, i?: any): any => o.classList.toggle('hl', i === highlighted));
            if (opts[highlighted])
                input.setAttribute('aria-activedescendant', opts[highlighted].id);
            opts[highlighted] && opts[highlighted].scrollIntoView({ block: 'nearest' } as any);
        }
        else if (e.key === 'Enter') {
            e.preventDefault();
            const pick: any = opts[highlighted] || opts[0];
            if (pick) {
                select.value = pick.dataset.value;
                select.dispatchEvent(new Event('change', { bubbles: true } as any));
                syncInputFromSelect();
            }
            closeList();
        }
    });
    input.addEventListener('blur', (): any => { setTimeout((): any => { closeList(); syncInputFromSelect(); }, 150); });
}
function enhanceAllSelects(root?: any): any {
    (root || document as any).querySelectorAll('select:not([multiple])').forEach(enhanceSelectToSearchable);
}
(function watchForNewSelects(): any {
    const observer: any = new MutationObserver((mutations?: any): any => {
        mutations.forEach((m?: any): any => {
            m.addedNodes.forEach((node?: any): any => {
                if (node.nodeType !== 1)
                    return;
                if (node.tagName === 'SELECT')
                    enhanceSelectToSearchable(node);
                else if (node.querySelectorAll)
                    enhanceAllSelects(node);
            });
        });
    });
    observer.observe((document as any).body, { childList: true, subtree: true } as any);
})();
/* Defensive chart creation: if Chart.js failed to load (bad CDN version, network
   block, ad-blocker, etc.) or a chart throws for any reason, show a visible
   message in that panel instead of leaving it silently blank. */
/* Chart.js takes literal color strings, not CSS variables, so charts need to
   read the current theme's colors at render time to stay legible in dark mode. */
function chartTextColor(): any { return getComputedStyle((document as any).documentElement).getPropertyValue('--text').trim() || '#3A3A3A'; }
function chartGridColor(): any { return getComputedStyle((document as any).documentElement).getPropertyValue('--border').trim() || '#EEF1F3'; }
function safeChart(canvasId?: any, config?: any): any {
    const el: any = (document as any).getElementById(canvasId);
    if (!el)
        return null;
    if (typeof Chart === 'undefined') {
        if (el.parentElement)
            el.parentElement.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">Chart library failed to load (check network access to cdnjs.cloudflare.com).</div>';
        return null;
    }
    try {
        return new Chart(el, config);
    }
    catch (e: any) {
        console.error('Chart render failed for', canvasId, e);
        if (el.parentElement)
            el.parentElement.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">This chart failed to render.</div>';
        return null;
    }
}
function lockedNote(msg?: any): any { return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`; }
function permissionBlockedView(msg?: any): any {
    return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
}
function personName(id?: any): any { const p: any = STATE.personnel.find((p?: any): any => p.id === id); return p ? p.name : "Unassigned"; }
/* Photos live on the Personnel Management HR record (STATE.pm.records), not the shared
   roster itself, but this reads that data directly so any screen can show a thumbnail
   without depending on the PM module being loaded first. */
function personPhotoUrl(id?: any): any {
    if (!STATE.pm || !STATE.pm.records)
        return null;
    const r: any = STATE.pm.records.find((r?: any): any => r.personId === id);
    return r ? r.photoDataUrl : null;
}
function personAvatarHtml(id?: any, size?: any): any {
    size = size || 32;
    const url: any = personPhotoUrl(id);
    if (url)
        return `<img src="${url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;">`;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--lightgray);display:inline-flex;align-items:center;justify-content:center;color:var(--text-dim);vertical-align:middle;">${ICONS.idcard}</div>`;
}
/* =========================================================================
   SHARED: drag-and-drop photo upload, embeddable directly inside any edit form.
   Renders a preview + drop zone; call wirePhotoDropZone() after inserting the
   HTML to attach the drag/drop/click/file-picker behavior. onPhotoReady(dataUrl)
   fires once a file is chosen or dropped, resized down to a thumbnail.
   ========================================================================= */
function photoDropZoneHtml(idPrefix?: any, currentPhotoUrl?: any, opts?: any): any {
    opts = opts || {} as any;
    const shape: any = opts.round ? '50%' : '10px';
    const size: any = opts.size || 84;
    const placeholderIcon: any = opts.placeholderIcon || ICONS.idcard;
    return `
    <div class="form-row">
      <label>${opts.label || 'Photo'}</label>
      <div id="${idPrefix}DropZone" class="photo-drop-zone">
        <div id="${idPrefix}Preview" style="width:${size}px;height:${size}px;border-radius:${shape};overflow:hidden;flex-shrink:0;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);">
          ${currentPhotoUrl ? `<img src="${currentPhotoUrl}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="width:30px;height:30px;display:inline-block;">${placeholderIcon}</span>`}
        </div>
        <div class="photo-drop-text">
          <div style="font-weight:700;font-size:12.5px;">Drag &amp; drop an image here</div>
          <div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">or click to browse &bull; JPG/PNG</div>
        </div>
        <input type="file" id="${idPrefix}FileInput" accept="image/*" style="display:none;">
      </div>
    </div>
  `;
}
function wirePhotoDropZone(idPrefix?: any, onPhotoReady?: any, size?: any): any {
    size = size || 200;
    const zone: any = (document as any).getElementById(idPrefix + 'DropZone');
    const input: any = (document as any).getElementById(idPrefix + 'FileInput');
    const preview: any = (document as any).getElementById(idPrefix + 'Preview');
    if (!zone)
        return;
    function processFile(file?: any): any {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            toast("Please choose an image file.", true);
            return;
        }
        const img: any = new Image();
        const reader: any = new FileReader();
        reader.onload = (ev?: any): any => {
            img.onload = (): any => {
                const canvas: any = (document as any).createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx: any = canvas.getContext('2d');
                const scale: any = Math.max(size / img.width, size / img.height);
                const w: any = img.width * scale, h: any = img.height * scale;
                ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
                const dataUrl: any = canvas.toDataURL('image/jpeg', 0.75);
                preview.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
                onPhotoReady(dataUrl);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
    zone.addEventListener('click', (): any => input.click());
    input.addEventListener('change', (e?: any): any => processFile(e.target.files[0]));
    zone.addEventListener('dragover', (e?: any): any => { e.preventDefault(); e.stopPropagation(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', (e?: any): any => { e.preventDefault(); e.stopPropagation(); zone.classList.remove('drag-over'); });
    zone.addEventListener('drop', (e?: any): any => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0])
            processFile(e.dataTransfer.files[0]);
    });
}
// Unlike wirePhotoDropZone above (which crops to a square avatar thumbnail), this preserves the
// original aspect ratio and just caps the longest side -- appropriate for reference/evidence
// photos attached to a record, where cropping would lose real information.
function resizeImageForStorage(file?: any, maxDim?: any, quality?: any, callback?: any): any {
    if (!file || !file.type || !file.type.startsWith('image/')) {
        toast("Please choose an image file.", true);
        return;
    }
    const img: any = new Image();
    const reader: any = new FileReader();
    reader.onload = (ev?: any): any => {
        img.onload = (): any => {
            const scale: any = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w: any = Math.round(img.width * scale), h: any = Math.round(img.height * scale);
            const canvas: any = (document as any).createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', quality || 0.82));
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
/* =========================================================================
   SHARED PHOTO MANAGER (drag & drop / browse / mobile camera, with a
   per-photo description) -- built once for Civil Process papers, reused
   as-is for Quartermaster equipment, Fleet vehicles, and Grants seizures
   so every record type gets the identical, already-tested experience
   rather than three separate near-duplicate implementations.
   ========================================================================= */
function photoManagerHtml(photos?: any, idPrefix?: any, canManage?: any): any {
    return `
    ${canManage ? `
    <div id="${idPrefix}PhotoDropZone" style="border:2px dashed var(--border);border-radius:10px;padding:18px;text-align:center;cursor:pointer;margin-bottom:16px;">
      <span style="width:26px;height:26px;display:inline-block;color:var(--text-dim);">${ICONS.camera || ICONS.paperclip}</span>
      <div style="font-weight:700;font-size:13px;margin-top:8px;">Drag &amp; drop photos here, or click to browse</div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:2px;">Photos are stored privately in AWS S3. On a phone, you can also take a new photo with the camera.</div>
      <input type="file" id="${idPrefix}PhotoFileInput" accept="image/*" multiple style="display:none;">
    </div>` : ''}
    <div class="civil-photo-grid">
      ${(photos || []).map((ph?: any, pi?: any): any => `
        <div class="civil-photo-card">
          ${ph.storageKey
        ? `<img data-aws-photo-key="${escapeHtml(ph.storageKey)}" data-photo-idx="${pi}" alt="${escapeHtml(ph.description || 'Photo')}" style="opacity:.45;">`
        : `<img src="${ph.dataUrl || ''}" alt="${escapeHtml(ph.description || 'Photo')}">`}
          <div class="civil-photo-meta">${ph.uploadedDate || ''} — ${escapeHtml(ph.uploadedBy || '')}</div>
          <textarea class="civil-photo-desc" data-photo-idx="${pi}" placeholder="Describe this photo if needed..." ${!canManage ? 'disabled' : ''}>${escapeHtml(ph.description || '')}</textarea>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn btn-sm btn-outline" data-open-photo="${pi}" style="flex:1;">Open</button>
            ${canManage ? `<button class="btn btn-sm btn-danger" data-remove-photo="${pi}" style="flex:1;">${ICONS.trash} Remove</button>` : ''}
          </div>
        </div>
      `).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.camera || ICONS.paperclip}<div class="msg">No photos attached yet</div></div>`}
    </div>
  `;
}
function resizeImageForAwsUpload(file?: any, maxDim?: any, quality?: any): any {
    return new Promise((resolve?: any, reject?: any): any => {
        if (!file || !file.type || !file.type.startsWith('image/')) {
            reject(Error("Please choose an image file."));
            return;
        }
        const img: any = new Image();
        const reader: any = new FileReader();
        reader.onerror = (): any => reject(Error("Could not read that image."));
        reader.onload = (ev?: any): any => {
            img.onerror = (): any => reject(Error("Could not process that image."));
            img.onload = (): any => {
                const scale: any = Math.min(1, maxDim / Math.max(img.width, img.height));
                const w: any = Math.round(img.width * scale), h: any = Math.round(img.height * scale);
                const canvas: any = (document as any).createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob?: any): any => {
                    if (!blob) {
                        reject(Error("Could not prepare that image for upload."));
                        return;
                    }
                    const base: any = (file.name || 'photo').replace(/\.[^.]+$/, '');
                    resolve(new File([blob], `${base}.jpg`, { type: 'image/jpeg' } as any));
                }, 'image/jpeg', quality || 0.82);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}
async function hydrateAwsPhotoImages(container?: any, photos?: any): Promise<any> {
    const imgs: any = Array.from(container.querySelectorAll('img[data-aws-photo-key]'));
    await Promise.all(imgs.map(async (img?: any): Promise<any> => {
        const idx: any = Number(img.dataset.photoIdx);
        const ph: any = photos[idx];
        if (!ph?.storageKey)
            return;
        try {
            img.src = await (window as any).AWS_ATTACHMENTS.signedUrl(ph);
            img.style.opacity = '1';
        }
        catch (error: any) {
            img.removeAttribute('src');
            img.alt = 'Photo unavailable';
            img.style.opacity = '.35';
        }
    }));
}
function wirePhotoManager(containerId?: any, photos?: any, idPrefix?: any, canManage?: any, afterChange?: any): any {
    const container: any = (document as any).getElementById(containerId);
    if (!container)
        return;
    hydrateAwsPhotoImages(container, photos);
    container.querySelectorAll('[data-open-photo]').forEach((b?: any): any => b.addEventListener('click', async (): Promise<any> => {
        const idx: any = Number(b.dataset.openPhoto);
        try {
            await (window as any).AWS_ATTACHMENTS.download(photos[idx]);
        }
        catch (error: any) {
            toast(error.message || "Photo could not be opened.", true);
        }
    }));
    if (canManage) {
        const dropZone: any = (document as any).getElementById(idPrefix + 'PhotoDropZone');
        if (dropZone) {
            const input: any = (document as any).getElementById(idPrefix + 'PhotoFileInput');
            const processFiles: any = async (fileList?: any): Promise<any> => {
                const files: any = Array.from(fileList).filter((file?: any): any => file.type && file.type.startsWith('image/'));
                if (!files.length)
                    return;
                dropZone.style.pointerEvents = 'none';
                dropZone.style.opacity = '.65';
                try {
                    for (const file of files) {
                        const prepared: any = await resizeImageForAwsUpload(file, 1600, 0.82);
                        const meta: any = await (window as any).AWS_ATTACHMENTS.upload(prepared);
                        photos.push({
                            id: 'photo' + Date.now() + Math.random().toString(36).slice(2, 7),
                            ...meta,
                            originalFilename: file.name,
                            description: ''
                        } as any);
                    }
                    afterChange('add');
                    toast(files.length === 1 ? "Photo uploaded to AWS." : `${files.length} photos uploaded to AWS.`);
                }
                catch (error: any) {
                    toast(error.message || "Photo upload failed.", true);
                }
                finally {
                    dropZone.style.pointerEvents = '';
                    dropZone.style.opacity = '';
                    input.value = '';
                }
            };
            dropZone.addEventListener('click', (): any => input.click());
            input.addEventListener('change', (e?: any): any => processFiles(e.target.files));
            dropZone.addEventListener('dragover', (e?: any): any => { e.preventDefault(); dropZone.style.borderColor = 'var(--blue)'; });
            dropZone.addEventListener('dragleave', (): any => { dropZone.style.borderColor = 'var(--border)'; });
            dropZone.addEventListener('drop', (e?: any): any => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--border)';
                if (e.dataTransfer.files.length)
                    processFiles(e.dataTransfer.files);
            });
        }
    }
    container.querySelectorAll('.civil-photo-desc').forEach((ta?: any): any => ta.addEventListener('change', (): any => {
        const idx: any = Number(ta.dataset.photoIdx);
        photos[idx].description = ta.value.trim();
        afterChange('description');
    }));
    container.querySelectorAll('[data-remove-photo]').forEach((b?: any): any => b.addEventListener('click', async (): Promise<any> => {
        if (!confirm("Remove this photo from the record?"))
            return;
        const idx: any = Number(b.dataset.removePhoto);
        const ph: any = photos[idx];
        if (!ph)
            return;
        // Removing the metadata is the user-facing operation. Physical S3 deletion is
        // attempted for admins, but a denied cleanup must not block the record change.
        try {
            if (ph.storageKey && ['role_admin', 'role_platform_admin'].some((id?: any): any => (HOME_ROLE_IDS || []).includes(id))) {
                await (window as any).AWS_ATTACHMENTS.remove(ph);
            }
        }
        catch (error: any) {
            console.warn('S3 photo cleanup deferred:', error);
        }
        photos.splice(idx, 1);
        afterChange('remove');
    }));
}
function roleName(id?: any): any { const r: any = STATE.roles.find((r?: any): any => r.id === id); return r ? r.name : "—"; }
function personRoleNames(p?: any): any { return (p.roleIds || []).map(roleName).join(', ') || '—'; }
/* A person can hold more than one role. The "current role" used everywhere for
   permission checks is a synthesized role: the union (OR) of every ability
   across all currently-active roles, so can('x') keeps working unchanged
   everywhere it's already called. */
function currentRole(): any {
    const actual: any = (typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared') ? (HOME_ROLE_IDS || []) : (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.roleIds || []);
    const admin: any = actual.some((id?: any): any => ['role_admin', 'role_platform_admin'].includes(id));
    const ids: any = admin ? (STATE.currentRoleIds || actual) : actual;
    const roles: any = ids.map((id?: any): any => STATE.roles.find((r?: any): any => r.id === id)).filter(Boolean);
    if (roles.length === 0)
        return { id: "none", name: "No assigned role", abilities: {} as any, agencyScope: [] } as any;
    if (roles.length === 1)
        return roles[0];
    const abilities: any = {} as any;
    ALL_ABILITY_IDS.forEach((id?: any): any => { abilities[id] = roles.some((r?: any): any => r.abilities && r.abilities[id]); });
    const scopes: any = roles.map((r?: any): any => r.agencyScope || []);
    const agencyScope: any = scopes.some((s?: any): any => s.length === 0) ? [] : [...new Set(scopes.flat())];
    return {
        id: 'merged:' + ids.join(','),
        name: roles.map((r?: any): any => r.name).join(' + '),
        description: 'Combined abilities from: ' + roles.map((r?: any): any => r.name).join(', '),
        locked: false,
        agencyScope,
        abilities
    } as any;
}
/* A single role id to stamp on new records (audit entries, requests, etc.)
   when something needs "the" active role rather than the full set. */
function primaryRoleId(): any { return (STATE.currentRoleIds && STATE.currentRoleIds[0]) || STATE.roles[0].id; }
// Hidden roles (currently just the vendor-internal SonoMarzi Platform Admin role) are invisible to
// anyone who doesn't actually hold them -- checked against the logged-in person's real assigned
// roles, not just which ones are currently active, so someone can safely uncheck a hidden role in
// the switcher without it vanishing from view and becoming impossible to check back on.
function loggedInPersonHasRole(roleId?: any): any {
    if (typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared')
        return (HOME_ROLE_IDS || []).includes(roleId);
    const p: any = STATE.personnel.find((x?: any): any => x.id === CURRENT_USER_ID);
    return !!(p && p.roleIds && p.roleIds.includes(roleId));
}
function visibleRolesFor(personId?: any): any {
    return STATE.roles.filter((r?: any): any => !r.hidden || loggedInPersonHasRole(r.id) || (personId && (STATE.personnel.find((p?: any): any => p.id === personId) || {} as any).roleIds?.includes(r.id)));
}
function can(abilityId?: any): any { const r: any = currentRole(); return !!(r && r.abilities && r.abilities[abilityId]); }
function countAbilities(role?: any): any { return (Object.values(role.abilities) as any).filter(Boolean).length; }
/* =========================================================================
   COMBINED ABILITY CATALOG + DEFAULT ROLES
   ========================================================================= */
const ABILITY_CATALOG: any = {
    "Module Access": [
        ["module_quartermaster", "Access the Quartermaster module"],
        ["module_fleet", "Access the Fleet Management module"],
        ["module_personnel", "Access the Personnel Management module"],
        ["module_k9", "Access the K9 Management module"],
        ["module_drone", "Access the Drone Management module"],
        ["module_eod", "Access the EOD Management module"],
        ["module_subpoena", "Access the Subpoena Management module"],
        ["module_grants", "Access the Grants & Asset Forfeiture module"],
        ["module_civil", "Access the Civil Process module"],
    ],
    "SonoMarzi Internal": [
        ["manage_application_access", "Control which modules exist for this deployment (SonoMarzi internal use only)"],
    ],
    "Shared: Personnel": [
        ["personnel_view", "View personnel roster"],
        ["personnel_manage", "Add / edit personnel"],
    ],
    "Shared: Administration": [
        ["admin_roles", "Manage roles & abilities"],
        ["manage_field_labels", "Customize field display names across the suite"],
        ["manage_branding", "Customize the agency logo, title, and tagline shown in the sidebar"],
        ["admin_sso", "Configure Single Sign-On"],
    ],
    "Shared: Agency Workflows": [
        ["workflow_use", "Submit and track agency workflows"],
        ["workflow_approve", "Decide approval steps assigned to a role"],
        ["workflow_manage", "Build and manage agency workflows"],
    ],
    "Shared: Field Training": [
        ["ft_participate", "Participate in assigned field training files"],
        ["ft_manage", "Configure field training and manage trainee enrollments"],
        ["ft_train", "Serve as a field or police training officer"],
        ["ft_assign_cover", "Assign substitute trainers for specific dates"],
    ],
    "Shared: AI Assistant": [
        ["chatbot_access", "Use the AI assistant"],
    ],
    "Bulk Import": [
        ["personnel_bulk_import", "Bulk import personnel records"],
        ["pm_training_bulk_import", "Bulk import training records"],
        ["qm_bulk_import", "Bulk import Quartermaster equipment"],
        ["fleet_bulk_import", "Bulk import Fleet vehicles"],
        ["k9_bulk_import", "Bulk import K9 records"],
        ["drone_bulk_import", "Bulk import Drone / UAS records"],
        ["eod_bulk_import", "Bulk import EOD technician certifications"],
        ["civil_bulk_import", "Bulk import Civil Process papers"],
        ["subpoena_bulk_import", "Bulk import Subpoenas"],
    ],
    "Quartermaster: Equipment & Inventory": [
        ["qm_equip_view", "View equipment inventory"],
        ["qm_equip_add", "Add new equipment"],
        ["qm_equip_edit", "Edit equipment details"],
        ["qm_equip_delete", "Delete equipment records"],
        ["qm_equip_retire", "Retire / decommission equipment"],
    ],
    "Quartermaster: Access Scope": [
        ["qm_unit_scope", "Limit visibility to equipment tied to your own unit (optional -- off unless enabled for a role)"],
        ["qm_bypass_unit_scope", "See equipment across every unit, overriding the restriction above"],
    ],
    "Quartermaster: Assignments & Checkout": [
        ["qm_assign_checkout", "Check out equipment to personnel"],
        ["qm_assign_checkin", "Check in returned equipment"],
        ["qm_assign_approve", "Approve checkout requests"],
        ["qm_assign_history", "View assignment history"],
    ],
    "Quartermaster: Maintenance": [
        ["qm_maint_log", "Log equipment maintenance / repairs"],
        ["qm_maint_schedule", "Schedule equipment maintenance"],
        ["qm_maint_outofservice", "Mark equipment out of service"],
    ],
    "Quartermaster: Reports": [
        ["qm_reports_view", "View Quartermaster reports & analytics"],
        ["qm_reports_export", "Export Quartermaster reports (CSV)"],
    ],
    "Quartermaster: Equipment Requests": [
        ["qm_request_submit", "Submit equipment requests"],
        ["qm_request_approve", "Approve / deny / modify requests"],
        ["qm_request_view_all", "View all requests agency-wide"],
    ],
    "Quartermaster: Inventory Audits": [
        ["qm_audit_conduct", "Conduct inventory audits"],
        ["qm_audit_view", "View audit history"],
    ],
    "Quartermaster: Administration": [
        ["qm_admin_categories", "Manage categories, vendors & reference data"],
        ["qm_admin_audit", "View Quartermaster system audit log"],
    ],
    "Fleet: Vehicles": [
        ["fleet_vehicle_view", "View fleet vehicles"],
        ["fleet_vehicle_add", "Add new vehicles"],
        ["fleet_vehicle_edit", "Edit vehicle details"],
        ["fleet_vehicle_delete", "Delete vehicle records"],
        ["fleet_vehicle_retire", "Retire / decommission vehicles"],
    ],
    "Fleet: Access Scope": [
        ["fleet_unit_scope", "Limit visibility to vehicles assigned to your own unit (optional -- off unless enabled for a role)"],
        ["fleet_bypass_unit_scope", "See vehicles across every unit, overriding the restriction above"],
    ],
    "Fleet: Vehicle Inspections": [
        ["fleet_inspection_conduct", "Conduct vehicle inspections"],
        ["fleet_inspection_view_all", "View all inspections agency-wide"],
        ["fleet_inspection_delete", "Delete inspection records"],
    ],
    "Fleet: Maintenance": [
        ["fleet_maint_log", "Log vehicle maintenance / repairs"],
        ["fleet_maint_schedule", "Schedule vehicle maintenance"],
        ["fleet_maint_outofservice", "Mark vehicle out of service"],
    ],
    "Fleet: Reports": [
        ["fleet_reports_view", "View Fleet reports & analytics"],
        ["fleet_reports_export", "Export Fleet reports (CSV)"],
    ],
    "Fleet: Administration": [
        ["fleet_admin_categories", "Manage vehicle types, vendors & reference data"],
        ["fleet_admin_audit", "View Fleet system audit log"],
    ],
    "Personnel Mgmt: Records": [
        ["pm_records_view", "View personnel HR records"],
        ["pm_records_edit", "Edit personnel HR records"],
        ["pm_records_delete", "Delete personnel HR records"],
        ["pm_documents_manage", "Attach photos & documents to a record"],
    ],
    "Personnel Mgmt: Disciplinary": [
        ["pm_discipline_view", "View disciplinary actions"],
        ["pm_discipline_manage", "Record / edit disciplinary actions"],
    ],
    "Personnel Mgmt: Medical": [
        ["pm_medical_view", "View medical & vaccination records"],
        ["pm_medical_manage", "Record / edit medical & vaccination data"],
    ],
    "Personnel Mgmt: RMS Inquiries": [
        ["pm_inquiries_view", "View RMS-data inquiry / early-intervention entries"],
        ["pm_inquiries_manage", "Record RMS-data inquiry / early-intervention entries"],
    ],
    "Personnel Mgmt: LODD": [
        ["pm_lodd_view", "View Line-of-Duty-Death information"],
        ["pm_lodd_manage", "Edit Line-of-Duty-Death information"],
    ],
    "Personnel Mgmt: Scheduling": [
        ["pm_schedule_view", "View shift patterns & duty roster"],
        ["pm_schedule_manage", "Manage shift patterns & assignments"],
    ],
    "Personnel Mgmt: Time-Off Requests": [
        ["pm_leave_request_submit", "Submit their own request for a comp day, vacation day, or other time off"],
        ["pm_leave_request_approve", "Review, approve, or deny time-off requests and update the schedule when approved"],
    ],
    "Staff Messaging": [["staff_notify_send", "Send staff notices by person, unit, or shift pattern"], ["staff_sms_send", "Send SMS to staff when enabled"]],
    "Personnel Mgmt: Overtime & Callback": [
        ["pm_overtime_view", "View coverage gaps and the overtime callback list"],
        ["pm_overtime_optin", "Add or remove themselves from the overtime callback list"],
        ["pm_overtime_manage", "Fill coverage gaps and log overtime callbacks for anyone"],
    ],
    "Personnel Mgmt: Shift Bidding & Vacation Picks": [
        ["pm_bidding_view", "View bid cycles and awarded results"],
        ["pm_bidding_submit", "Submit their own shift bid or vacation pick preferences"],
        ["pm_bidding_manage", "Create bid cycles and run the seniority award"],
    ],
    "Personnel Mgmt: Extra Duty": [
        ["pm_extraduty_view", "View extra-duty job postings and assignments"],
        ["pm_extraduty_signup", "Sign up for an open extra-duty job"],
        ["pm_extraduty_manage", "Post extra-duty jobs and approve or deny signups"],
    ],
    "Personnel Mgmt: Roll Call": [
        ["pm_rollcall_view", "View roll call sheets"],
        ["pm_rollcall_manage", "Take roll call, assign beats, and record briefing notes"],
    ],
    "Personnel Mgmt: Training": [
        ["pm_training_view_own", "View their own training records"],
        ["pm_training_manage", "Manage training records for any employee"],
        ["pm_training_request", "Request training electronically"],
        ["pm_training_checkin_submit", "Check in to a training session via QR code"],
        ["pm_instructor_manage", "Manage the course catalog and the instructor roster"],
    ],
    "Personnel Mgmt: Reports": [
        ["pm_reports_view", "View Personnel Mgmt reports & analytics"],
        ["pm_reports_export", "Export Personnel Mgmt reports (CSV)"],
    ],
    "Personnel Mgmt: Administration": [
        ["pm_admin_categories", "Manage ranks, units & reference data"],
        ["pm_admin_audit", "View Personnel Mgmt system audit log"],
    ],
    "K9 Mgmt: Roster": [
        ["k9_roster_view", "View the K9 roster"],
        ["k9_roster_edit", "Add / edit K9 roster records"],
        ["k9_roster_delete", "Delete K9 roster records"],
    ],
    "K9 Mgmt: Medical": [
        ["k9_medical_view", "View K9 medical & vaccination records"],
        ["k9_medical_manage", "Record / edit K9 medical & vaccination data"],
    ],
    "K9 Mgmt: Training": [
        ["k9_training_view", "View K9 training records"],
        ["k9_training_manage", "Log / edit K9 training sessions"],
    ],
    "K9 Mgmt: Certifications": [
        ["k9_certification_view", "View K9 certifications"],
        ["k9_certification_manage", "Record / edit K9 certifications"],
    ],
    "K9 Mgmt: Deployments": [
        ["k9_deployment_view", "View K9 deployment / activity log"],
        ["k9_deployment_log", "Log new K9 deployments / activity"],
    ],
    "K9 Mgmt: Incidents": [
        ["k9_incident_view", "View K9 incident reports"],
        ["k9_incident_manage", "Record / review K9 incident reports"],
    ],
    "K9 Mgmt: GPS": [
        ["k9_gps_view", "View K9 GPS location & history"],
    ],
    "K9 Mgmt: Reports": [
        ["k9_reports_view", "View K9 reports & analytics"],
        ["k9_reports_export", "Export K9 reports (CSV)"],
    ],
    "K9 Mgmt: Administration": [
        ["k9_admin_categories", "Manage K9 reference data"],
        ["k9_admin_audit", "View K9 Mgmt system audit log"],
    ],
    "Drone Mgmt: Fleet": [
        ["drone_fleet_view", "View the drone fleet"],
        ["drone_fleet_edit", "Add / edit drone fleet records"],
        ["drone_fleet_delete", "Delete drone fleet records"],
    ],
    "Drone Mgmt: Operators": [
        ["drone_operator_view", "View drone operator / pilot roster"],
        ["drone_operator_manage", "Add / edit operator certifications & waivers"],
    ],
    "Drone Mgmt: Flights": [
        ["drone_flight_view", "View the flight log"],
        ["drone_flight_log", "Log new flights"],
    ],
    "Drone Mgmt: Maintenance": [
        ["drone_maint_view", "View drone maintenance records"],
        ["drone_maint_manage", "Log / edit drone maintenance"],
    ],
    "Drone Mgmt: Incidents": [
        ["drone_incident_view", "View drone incident reports"],
        ["drone_incident_manage", "Record / review drone incident reports"],
    ],
    "Drone Mgmt: Reports": [
        ["drone_reports_view", "View Drone Mgmt reports & analytics"],
        ["drone_reports_export", "Export Drone Mgmt reports (CSV)"],
    ],
    "Drone Mgmt: Administration": [
        ["drone_admin_categories", "Manage drone reference data & agency authorizations"],
        ["drone_admin_audit", "View Drone Mgmt system audit log"],
    ],
    "EOD Mgmt: Technicians": [
        ["eod_technician_view", "View bomb technician certification roster"],
        ["eod_technician_manage", "Manage technician certifications (HDS, HazMat, CES)"],
    ],
    "EOD Mgmt: Explosives Inventory": [
        ["eod_inventory_view", "View the explosives inventory (ATF Form 5400.30)"],
        ["eod_inventory_manage", "Add / edit / dispose of explosives inventory"],
    ],
    "EOD Mgmt: Magazines & Storage": [
        ["eod_magazine_view", "View explosives storage magazines"],
        ["eod_magazine_manage", "Add / edit storage magazines"],
        ["eod_inspection_log", "Log the required periodic magazine inspection"],
    ],
    "EOD Mgmt: Incidents & Callouts": [
        ["eod_incident_view", "View EOD incidents & callouts"],
        ["eod_incident_log", "Log new EOD incidents & callouts"],
        ["eod_rsp_view", "View Render Safe Procedure technical detail (certified technicians only)"],
    ],
    "EOD Mgmt: Theft / Loss Reporting": [
        ["eod_theft_report_view", "View theft / loss reports"],
        ["eod_theft_report_manage", "File theft / loss reports to ATF & USBDC"],
    ],
    "EOD Mgmt: Reports": [
        ["eod_reports_view", "View EOD reports & analytics"],
        ["eod_reports_export", "Export EOD reports (CSV)"],
    ],
    "EOD Mgmt: Administration": [
        ["eod_admin_categories", "Manage EOD reference data"],
        ["eod_admin_audit", "View EOD Mgmt system audit log"],
    ],
    "Subpoena Mgmt: Subpoenas": [
        ["subpoena_view_own", "View subpoenas assigned to yourself"],
        ["subpoena_view_all", "View every subpoena across the department"],
        ["subpoena_manage", "Create, assign, modify, and cancel subpoenas"],
        ["subpoena_acknowledge", "Acknowledge receipt of your own subpoena"],
    ],
    "Subpoena Mgmt: Documents & Notifications": [
        ["subpoena_document_upload", "Upload and attach documents to a subpoena"],
        ["subpoena_notify", "Send subpoena notifications to staff"],
    ],
    "Subpoena Mgmt: Reports": [
        ["subpoena_reports_view", "View Subpoena Mgmt reports & analytics"],
        ["subpoena_reports_export", "Export Subpoena Mgmt reports (CSV)"],
    ],
    "Subpoena Mgmt: Administration": [
        ["subpoena_admin_categories", "Manage court locations & reference data"],
        ["subpoena_admin_audit", "View Subpoena Mgmt system audit log"],
    ],
    "Grants Mgmt: Asset Forfeiture": [
        ["grants_seizure_view", "View seized property and forfeiture records"],
        ["grants_seizure_manage", "Log, modify, and close out seizure and forfeiture records"],
    ],
    "Grants Mgmt: Grant Awards": [
        ["grants_award_view", "View grant awards and funded equipment"],
        ["grants_award_manage", "Create, modify, and close out grant awards"],
    ],
    "Grants Mgmt: Dashboard & Reports": [
        ["grants_dashboard_customize", "Customize which analytics widgets appear on the Grants dashboard"],
        ["grants_reports_view", "View Grants Mgmt reports & analytics"],
        ["grants_reports_export", "Export Grants Mgmt reports (CSV)"],
    ],
    "Grants Mgmt: Administration": [
        ["grants_admin_categories", "Manage funding agencies, program areas & reference data"],
        ["grants_admin_audit", "View Grants Mgmt system audit log"],
    ],
    "Civil Process: Papers & Service": [
        ["civil_paper_view_all", "View every civil paper across the department"],
        ["civil_paper_view_own", "View civil papers assigned to yourself"],
        ["civil_paper_intake", "Intake new civil papers and assign servers"],
        ["civil_paper_log_attempt", "Log service attempts and mark papers served"],
        ["civil_safety_flag_manage", "Add and clear officer safety flags on civil papers"],
    ],
    "Civil Process: Documents & Fees": [
        ["civil_document_generate", "Generate Return of Service / Affidavit of Service documents"],
        ["civil_fee_manage", "Record and reconcile civil process fees"],
    ],
    "Civil Process: Reports": [
        ["civil_reports_view", "View Civil Process reports & analytics"],
        ["civil_reports_export", "Export Civil Process reports (CSV)"],
    ],
    "Civil Process: Administration": [
        ["civil_admin_categories", "Manage courts, paper types & reference data"],
        ["civil_admin_audit", "View Civil Process system audit log"],
    ]
} as any;
const ALL_ABILITY_IDS: any = (Object.values(ABILITY_CATALOG) as any).flat().map((a?: any): any => a[0]);
function abilityLabel(id?: any): any { for (const g of Object.values(ABILITY_CATALOG) as any) {
    const f: any = g.find((a?: any): any => a[0] === id);
    if (f)
        return f[1];
} return id; }
function abilitiesFor(list?: any): any { const o: any = {} as any; ALL_ABILITY_IDS.forEach((id?: any): any => o[id] = list.includes(id)); return o; }
// Vendor-only abilities are deliberately excluded from "every ability" grants (like System Admin's
// base definition below) so that a customer's most powerful role still can't see or control which
// modules exist for their deployment -- that's a SonoMarzi-internal concern, held only by the hidden
// Platform Admin role, defined further down.
const VENDOR_ONLY_ABILITIES: any = ['manage_application_access'];
const DEFAULT_OFF_ABILITIES: any = ['chatbot_access'];
const ALL_CUSTOMER_ABILITY_IDS: any = ALL_ABILITY_IDS.filter((id?: any): any => !VENDOR_ONLY_ABILITIES.includes(id) && !DEFAULT_OFF_ABILITIES.includes(id));
const QM_SUPERVISOR_ABILITIES: any = ["qm_equip_view", "qm_equip_add", "qm_equip_edit", "qm_assign_checkout", "qm_assign_checkin", "qm_assign_approve", "qm_assign_history", "qm_maint_log", "qm_maint_schedule", "qm_reports_view", "qm_reports_export", "qm_request_submit", "qm_request_approve", "qm_request_view_all", "qm_audit_conduct", "qm_audit_view"];
const QM_OFFICER_ABILITIES: any = ["qm_equip_view", "qm_assign_checkout", "qm_assign_history", "qm_request_submit"];
const QM_AUDITOR_ABILITIES: any = ["qm_equip_view", "qm_assign_history", "qm_reports_view", "qm_request_view_all", "qm_audit_view"];
const FLEET_SUPERVISOR_ABILITIES: any = ["fleet_vehicle_view", "fleet_vehicle_add", "fleet_vehicle_edit", "fleet_inspection_conduct", "fleet_inspection_view_all", "fleet_maint_log", "fleet_maint_schedule", "fleet_maint_outofservice", "fleet_reports_view", "fleet_reports_export"];
const FLEET_OFFICER_ABILITIES: any = ["fleet_vehicle_view", "fleet_inspection_conduct"];
const FLEET_AUDITOR_ABILITIES: any = ["fleet_vehicle_view", "fleet_inspection_view_all", "fleet_reports_view"];
const PM_ADMIN_ABILITIES: any = ["pm_records_view", "pm_records_edit", "pm_records_delete", "pm_documents_manage",
    "pm_discipline_view", "pm_discipline_manage", "pm_medical_view", "pm_medical_manage",
    "pm_inquiries_view", "pm_inquiries_manage", "pm_lodd_view", "pm_lodd_manage",
    "pm_schedule_view", "pm_schedule_manage", "pm_leave_request_submit", "pm_leave_request_approve", "pm_training_view_own", "pm_training_manage", "pm_training_request", "pm_training_checkin_submit", "pm_instructor_manage",
    "pm_overtime_view", "pm_overtime_optin", "pm_overtime_manage", "pm_bidding_view", "pm_bidding_submit", "pm_bidding_manage",
    "pm_extraduty_view", "pm_extraduty_signup", "pm_extraduty_manage", "pm_rollcall_view", "pm_rollcall_manage",
    "pm_reports_view", "pm_reports_export", "pm_admin_categories", "pm_admin_audit"];
const PM_SUPERVISOR_ABILITIES: any = ["pm_records_view", "pm_records_edit", "pm_discipline_view", "pm_discipline_manage",
    "pm_medical_view", "pm_inquiries_view", "pm_schedule_view", "pm_schedule_manage", "pm_leave_request_submit", "pm_leave_request_approve",
    "pm_overtime_view", "pm_overtime_optin", "pm_overtime_manage", "pm_bidding_view", "pm_bidding_submit", "pm_bidding_manage",
    "pm_extraduty_view", "pm_extraduty_signup", "pm_extraduty_manage", "pm_rollcall_view", "pm_rollcall_manage",
    "pm_training_view_own", "pm_training_manage", "pm_training_checkin_submit", "pm_reports_view", "pm_reports_export"];
const PM_OFFICER_ABILITIES: any = ["pm_training_view_own", "pm_training_request", "pm_training_checkin_submit", "pm_leave_request_submit",
    "pm_overtime_view", "pm_overtime_optin", "pm_bidding_view", "pm_bidding_submit", "pm_extraduty_view", "pm_extraduty_signup", "pm_rollcall_view"];
const PM_AUDITOR_ABILITIES: any = ["pm_records_view", "pm_discipline_view", "pm_medical_view", "pm_inquiries_view", "pm_schedule_view", "pm_training_view_own", "pm_reports_view",
    "pm_overtime_view", "pm_bidding_view", "pm_extraduty_view", "pm_rollcall_view"];
const PM_TRAINING_COORDINATOR_ABILITIES: any = ["pm_training_view_own", "pm_training_manage", "pm_training_request", "pm_instructor_manage", "pm_reports_view", "pm_reports_export"];
const K9_ADMIN_ABILITIES: any = ["k9_roster_view", "k9_roster_edit", "k9_roster_delete", "k9_medical_view", "k9_medical_manage",
    "k9_training_view", "k9_training_manage", "k9_certification_view", "k9_certification_manage",
    "k9_deployment_view", "k9_deployment_log", "k9_incident_view", "k9_incident_manage", "k9_gps_view",
    "k9_reports_view", "k9_reports_export", "k9_admin_categories", "k9_admin_audit"];
const K9_HANDLER_ABILITIES: any = ["k9_roster_view", "k9_medical_view", "k9_training_view", "k9_training_manage",
    "k9_certification_view", "k9_deployment_view", "k9_deployment_log", "k9_incident_view", "k9_incident_manage",
    "k9_gps_view", "k9_reports_view"];
const K9_SUPERVISOR_ABILITIES: any = ["k9_roster_view", "k9_roster_edit", "k9_medical_view", "k9_medical_manage",
    "k9_training_view", "k9_training_manage", "k9_certification_view", "k9_certification_manage",
    "k9_deployment_view", "k9_deployment_log", "k9_incident_view", "k9_incident_manage", "k9_gps_view",
    "k9_reports_view", "k9_reports_export"];
const K9_OFFICER_ABILITIES: any = ["k9_roster_view", "k9_deployment_view"];
const K9_AUDITOR_ABILITIES: any = ["k9_roster_view", "k9_medical_view", "k9_training_view", "k9_certification_view",
    "k9_deployment_view", "k9_incident_view", "k9_gps_view", "k9_reports_view"];
const DRONE_ADMIN_ABILITIES: any = ["drone_fleet_view", "drone_fleet_edit", "drone_fleet_delete", "drone_operator_view", "drone_operator_manage",
    "drone_flight_view", "drone_flight_log", "drone_maint_view", "drone_maint_manage", "drone_incident_view", "drone_incident_manage",
    "drone_reports_view", "drone_reports_export", "drone_admin_categories", "drone_admin_audit"];
const DRONE_PILOT_ABILITIES: any = ["drone_fleet_view", "drone_operator_view", "drone_flight_view", "drone_flight_log",
    "drone_maint_view", "drone_incident_view", "drone_incident_manage", "drone_reports_view"];
const DRONE_SUPERVISOR_ABILITIES: any = ["drone_fleet_view", "drone_fleet_edit", "drone_operator_view", "drone_operator_manage",
    "drone_flight_view", "drone_flight_log", "drone_maint_view", "drone_maint_manage", "drone_incident_view", "drone_incident_manage",
    "drone_reports_view", "drone_reports_export"];
const DRONE_OFFICER_ABILITIES: any = ["drone_fleet_view", "drone_flight_view"];
const DRONE_AUDITOR_ABILITIES: any = ["drone_fleet_view", "drone_operator_view", "drone_flight_view", "drone_maint_view", "drone_incident_view", "drone_reports_view"];
const EOD_ADMIN_ABILITIES: any = ["eod_technician_view", "eod_technician_manage", "eod_inventory_view", "eod_inventory_manage",
    "eod_magazine_view", "eod_magazine_manage", "eod_inspection_log", "eod_incident_view", "eod_incident_log", "eod_rsp_view",
    "eod_theft_report_view", "eod_theft_report_manage", "eod_reports_view", "eod_reports_export", "eod_admin_categories", "eod_admin_audit"];
const EOD_TECH_ABILITIES: any = ["eod_technician_view", "eod_inventory_view", "eod_magazine_view", "eod_inspection_log",
    "eod_incident_view", "eod_incident_log", "eod_rsp_view", "eod_theft_report_view", "eod_theft_report_manage", "eod_reports_view"];
const EOD_SUPERVISOR_ABILITIES: any = ["eod_technician_view", "eod_inventory_view", "eod_magazine_view", "eod_incident_view", "eod_theft_report_view", "eod_reports_view"];
const EOD_AUDITOR_ABILITIES: any = ["eod_technician_view", "eod_inventory_view", "eod_magazine_view", "eod_incident_view", "eod_rsp_view", "eod_theft_report_view", "eod_reports_view"];
const SUBPOENA_ADMIN_ABILITIES: any = ["subpoena_view_own", "subpoena_view_all", "subpoena_manage", "subpoena_acknowledge",
    "subpoena_document_upload", "subpoena_notify", "subpoena_reports_view", "subpoena_reports_export", "subpoena_admin_categories", "subpoena_admin_audit"];
const SUBPOENA_BASIC_ABILITIES: any = ["subpoena_view_own", "subpoena_acknowledge"];
const SUBPOENA_SUPERVISOR_ABILITIES: any = ["subpoena_view_own", "subpoena_view_all", "subpoena_manage", "subpoena_acknowledge", "subpoena_document_upload", "subpoena_notify", "subpoena_reports_view", "subpoena_reports_export"];
const SUBPOENA_AUDITOR_ABILITIES: any = ["subpoena_view_all", "subpoena_reports_view"];
const GRANTS_ADMIN_ABILITIES: any = ["grants_seizure_view", "grants_seizure_manage", "grants_award_view", "grants_award_manage",
    "grants_dashboard_customize", "grants_reports_view", "grants_reports_export", "grants_admin_categories", "grants_admin_audit"];
const GRANTS_SUPERVISOR_ABILITIES: any = ["grants_seizure_view", "grants_award_view", "grants_dashboard_customize", "grants_reports_view", "grants_reports_export"];
const GRANTS_AUDITOR_ABILITIES: any = ["grants_seizure_view", "grants_award_view", "grants_dashboard_customize", "grants_reports_view"];
const CIVIL_ADMIN_ABILITIES: any = ["civil_paper_view_all", "civil_paper_view_own", "civil_paper_intake", "civil_paper_log_attempt", "civil_safety_flag_manage",
    "civil_document_generate", "civil_fee_manage", "civil_reports_view", "civil_reports_export", "civil_admin_categories", "civil_admin_audit"];
const CIVIL_SERVER_ABILITIES: any = ["civil_paper_view_own", "civil_paper_log_attempt", "civil_document_generate"];
const CIVIL_SUPERVISOR_ABILITIES: any = ["civil_paper_view_all", "civil_paper_view_own", "civil_paper_intake", "civil_safety_flag_manage", "civil_document_generate", "civil_fee_manage", "civil_reports_view", "civil_reports_export"];
const CIVIL_AUDITOR_ABILITIES: any = ["civil_paper_view_all", "civil_reports_view"];
const DEFAULT_ROLES: any = [
    { id: "role_admin", name: "System Admin", locked: true, description: "Full access to every module and every ability. The top-level administrator for the whole suite.",
        agencyScope: [], abilities: abilitiesFor(ALL_CUSTOMER_ABILITY_IDS) } as any,
    { id: "role_qm_admin", name: "Quartermaster Admin", locked: false, description: "Full control over the Quartermaster module only \u2014 cannot see or access Fleet Management or Personnel Management.",
        agencyScope: [], abilities: abilitiesFor(["module_quartermaster", "personnel_view", "personnel_manage", "qm_bypass_unit_scope",
            "qm_equip_view", "qm_equip_add", "qm_equip_edit", "qm_equip_delete", "qm_equip_retire",
            "qm_assign_checkout", "qm_assign_checkin", "qm_assign_approve", "qm_assign_history",
            "qm_maint_log", "qm_maint_schedule", "qm_maint_outofservice", "qm_reports_view", "qm_reports_export",
            "qm_request_submit", "qm_request_approve", "qm_request_view_all", "qm_audit_conduct", "qm_audit_view",
            "qm_admin_categories", "qm_admin_audit"]) } as any,
    { id: "role_fleet_admin", name: "Fleet Admin", locked: false, description: "Full control over the Fleet Management module only \u2014 cannot see or access Quartermaster or Personnel Management.",
        agencyScope: [], abilities: abilitiesFor(["module_fleet", "personnel_view", "personnel_manage", "fleet_bypass_unit_scope",
            "fleet_vehicle_view", "fleet_vehicle_add", "fleet_vehicle_edit", "fleet_vehicle_delete", "fleet_vehicle_retire",
            "fleet_inspection_conduct", "fleet_inspection_view_all", "fleet_inspection_delete",
            "fleet_maint_log", "fleet_maint_schedule", "fleet_maint_outofservice", "fleet_reports_view", "fleet_reports_export",
            "fleet_admin_categories", "fleet_admin_audit"]) } as any,
    { id: "role_pm_admin", name: "Personnel Admin", locked: false, description: "Full control over the Personnel Management module only \u2014 cannot see or access Quartermaster or Fleet Management.",
        agencyScope: [], abilities: abilitiesFor(["module_personnel", "personnel_view", "personnel_manage", ...PM_ADMIN_ABILITIES]) } as any,
    { id: "role_training_coordinator", name: "Training Coordinator", locked: false, description: "Manages training records, instructors, and course requests within Personnel Management only.",
        agencyScope: [], abilities: abilitiesFor(["module_personnel", "personnel_view", ...PM_TRAINING_COORDINATOR_ABILITIES]) } as any,
    { id: "role_fto", name: "Field Training Officer", locked: false, description: "Trains assigned recruits and documents field training or temporary coverage. Access is limited to assigned trainee files.", agencyScope: [], abilities: abilitiesFor(["ft_participate", "ft_train"]) } as any,
    { id: "role_k9_admin", name: "K9 Unit Admin", locked: false, description: "Full control over the K9 Management module only \u2014 cannot see or access Quartermaster, Fleet, or Personnel Management.",
        agencyScope: [], abilities: abilitiesFor(["module_k9", "personnel_view", ...K9_ADMIN_ABILITIES]) } as any,
    { id: "role_k9_handler", name: "K9 Handler", locked: false, description: "A K9 handler who logs their own dog's activity, training, and certifications within K9 Management only.",
        agencyScope: [], abilities: abilitiesFor(["module_k9", "personnel_view", ...K9_HANDLER_ABILITIES]) } as any,
    { id: "role_drone_admin", name: "Drone Program Admin", locked: false, description: "Full control over the Drone Management module only \u2014 cannot see or access Quartermaster, Fleet, Personnel, or K9 Management.",
        agencyScope: [], abilities: abilitiesFor(["module_drone", "personnel_view", ...DRONE_ADMIN_ABILITIES]) } as any,
    { id: "role_drone_pilot", name: "Drone Pilot", locked: false, description: "A certified remote pilot who logs their own flights and maintains their currency within Drone Management only.",
        agencyScope: [], abilities: abilitiesFor(["module_drone", "personnel_view", ...DRONE_PILOT_ABILITIES]) } as any,
    { id: "role_eod_admin", name: "EOD Unit Commander", locked: false, description: "Full control over the EOD Management module only \u2014 cannot see or access any other module. Manages technician certifications, the explosives inventory, storage compliance, and ATF/USBDC reporting.",
        agencyScope: [], abilities: abilitiesFor(["module_eod", "personnel_view", ...EOD_ADMIN_ABILITIES]) } as any,
    { id: "role_bomb_technician", name: "Bomb Technician", locked: false, description: "An FBI Hazardous Devices School\u2013certified bomb technician. Can log incidents and Render Safe Procedure detail, conduct magazine inspections, and file time-critical theft/loss reports \u2014 restricted to EOD Management only, matching real-world bomb-tech-only access to Render Safe Procedure data in national systems like BATS.",
        agencyScope: [], abilities: abilitiesFor(["module_eod", "personnel_view", ...EOD_TECH_ABILITIES]) } as any,
    { id: "role_supervisor", name: "Supervisor", locked: false, description: "Manages day-to-day operations across all six modules for a shift or unit. EOD visibility is intentionally limited to summary-level information \u2014 Render Safe Procedure technical detail is restricted to certified Bomb Technicians, mirroring real-world bomb-squad data handling.",
        agencyScope: [], abilities: abilitiesFor(["module_quartermaster", "module_fleet", "module_personnel", "module_k9", "module_drone", "module_eod", "module_subpoena", "module_grants", "module_civil", "personnel_view", "personnel_manage", ...QM_SUPERVISOR_ABILITIES, ...FLEET_SUPERVISOR_ABILITIES, ...PM_SUPERVISOR_ABILITIES, ...K9_SUPERVISOR_ABILITIES, ...DRONE_SUPERVISOR_ABILITIES, ...EOD_SUPERVISOR_ABILITIES, ...SUBPOENA_SUPERVISOR_ABILITIES, ...GRANTS_SUPERVISOR_ABILITIES, ...CIVIL_SUPERVISOR_ABILITIES]) } as any,
    { id: "role_officer", name: "Officer", locked: false, description: "Line personnel who use five modules day-to-day: checking out equipment, conducting vehicle inspections, managing their own training, and viewing the K9 and drone rosters. EOD Management is a specialized bomb-squad function and is not part of the general Officer role by default, matching real-world restricted access to bomb-squad systems.",
        agencyScope: [], abilities: abilitiesFor(["module_quartermaster", "module_fleet", "module_personnel", "module_k9", "module_drone", "module_subpoena", ...QM_OFFICER_ABILITIES, ...FLEET_OFFICER_ABILITIES, ...PM_OFFICER_ABILITIES, ...K9_OFFICER_ABILITIES, ...DRONE_OFFICER_ABILITIES, ...SUBPOENA_BASIC_ABILITIES]) } as any,
    { id: "role_auditor", name: "Auditor / Read-Only", locked: false, description: "Oversight or compliance role with visibility into all six modules but no ability to change records. Includes Render Safe Procedure visibility for after-action and compliance review purposes.",
        agencyScope: [], abilities: abilitiesFor(["module_quartermaster", "module_fleet", "module_personnel", "module_k9", "module_drone", "module_eod", "module_subpoena", "module_grants", "module_civil", "personnel_view", ...QM_AUDITOR_ABILITIES, ...FLEET_AUDITOR_ABILITIES, ...PM_AUDITOR_ABILITIES, ...K9_AUDITOR_ABILITIES, ...DRONE_AUDITOR_ABILITIES, ...EOD_AUDITOR_ABILITIES, ...SUBPOENA_AUDITOR_ABILITIES, ...GRANTS_AUDITOR_ABILITIES, ...CIVIL_AUDITOR_ABILITIES]) } as any,
    { id: "role_subpoena_admin", name: "Subpoena Coordinator", locked: false, description: "Full control over the Subpoena Management module: assigning, modifying, cancelling, notifying, and tracking acknowledgment of subpoenas for any staff member.",
        agencyScope: [], abilities: abilitiesFor(["module_subpoena", "personnel_view", ...SUBPOENA_ADMIN_ABILITIES]) } as any,
    { id: "role_grants_admin", name: "Grants & Forfeiture Admin", locked: false, description: "Full control over the Grants & Asset Forfeiture module: logging seizures, tracking disposition and equitable sharing, and managing grant awards, funded equipment, and compliance deadlines.",
        agencyScope: [], abilities: abilitiesFor(["module_grants", "personnel_view", ...GRANTS_ADMIN_ABILITIES]) } as any,
    { id: "role_civil_admin", name: "Civil Process Supervisor", locked: false, description: "Full control over the Civil Process module: intake, assignment, service tracking, fee reconciliation, and generating Return of Service documents for any paper.",
        agencyScope: [], abilities: abilitiesFor(["module_civil", "personnel_view", ...CIVIL_ADMIN_ABILITIES]) } as any,
    { id: "role_civil_server", name: "Civil Process Server", locked: false, description: "A deputy or civil process technician who logs service attempts and generates Return of Service documents for papers assigned to themselves.",
        agencyScope: [], abilities: abilitiesFor(["module_civil", "personnel_view", ...CIVIL_SERVER_ABILITIES]) } as any,
    { id: "role_platform_admin", name: "SonoMarzi Platform Admin", locked: true, hidden: true,
        description: "SonoMarzi-internal role that controls which modules exist for this deployment. Not visible to customer administrators \u2014 this is a vendor-side control, separate from how a customer's own admins manage roles within whatever modules they've been granted.",
        agencyScope: [], abilities: abilitiesFor(["admin_roles", "manage_application_access", "manage_field_labels", "manage_branding", "personnel_view",
            "module_quartermaster", "module_fleet", "module_personnel", "module_k9", "module_drone", "module_eod", "module_subpoena", "module_grants", "module_civil"]) } as any,
];
DEFAULT_ROLES.forEach((r?: any): any => {
    r.abilities.workflow_use = r.id !== 'role_auditor';
    r.abilities.workflow_approve = ['role_supervisor', 'role_admin', 'role_platform_admin'].includes(r.id);
    r.abilities.workflow_manage = ['role_admin', 'role_platform_admin'].includes(r.id);
    r.abilities.ft_participate = ['role_admin', 'role_platform_admin', 'role_pm_admin', 'role_training_coordinator', 'role_supervisor', 'role_officer', 'role_fto'].includes(r.id);
    r.abilities.ft_manage = ['role_admin', 'role_platform_admin', 'role_pm_admin', 'role_training_coordinator'].includes(r.id);
    r.abilities.ft_train = r.id === 'role_fto';
    r.abilities.ft_assign_cover = ['role_admin', 'role_platform_admin', 'role_pm_admin', 'role_training_coordinator', 'role_supervisor'].includes(r.id);
    r.abilities.chatbot_access = false;
    if (r.id === 'role_supervisor' || r.id === 'role_admin' || r.id === 'role_platform_admin' || /^role_.*_admin$/.test(r.id)) {
        r.abilities.staff_sms_send = true;
        r.abilities.staff_notify_send = true;
    }
});
/* =========================================================================
   SHARED PERSONNEL (one roster for the whole suite)
   ========================================================================= */
function seedPersonnel(): any {
    return [
        { id: "p1", name: "Sgt. Maria Torres", badge: "1042", unit: "Patrol - A Shift", roleIds: ["role_supervisor", "role_auditor"], email: "maria.torres@mark43.com", qualifications: [] } as any,
        { id: "p2", name: "Ofc. Daniel Kim", badge: "2216", unit: "Patrol - A Shift", roleIds: ["role_officer"], email: "daniel.kim@mark43.com", qualifications: [] } as any,
        { id: "p3", name: "Ofc. James Whitfield", badge: "2298", unit: "Patrol - B Shift", roleIds: ["role_officer"], email: "james.whitfield@mark43.com", qualifications: [] } as any,
        { id: "p4", name: "Ofc. Priya Nair", badge: "2310", unit: "Traffic Unit", roleIds: ["role_officer"], email: "priya.nair@mark43.com", qualifications: [] } as any,
        { id: "p5", name: "Lt. Robert Hayes", badge: "0510", unit: "SWAT", roleIds: ["role_supervisor"], email: "robert.hayes@mark43.com", qualifications: [] } as any,
        { id: "p6", name: "Ofc. Alan Brooks", badge: "2401", unit: "SWAT", roleIds: ["role_officer"], email: "alan.brooks@mark43.com", qualifications: [] } as any,
        { id: "p7", name: "C. Ellis (Compliance)", badge: "AUD-04", unit: "Professional Standards", roleIds: ["role_auditor"], email: "c.ellis@mark43.com", qualifications: [] } as any,
        { id: "p8", name: "Quartermaster - R. Osei", badge: "QM-01", unit: "Logistics", roleIds: ["role_qm_admin"], email: "r.osei@mark43.com", qualifications: [] } as any,
        { id: "p9", name: "Fred Marziano", badge: "1476", unit: "Logistics", roleIds: ["role_admin", "role_platform_admin"], email: "fred.marziano@mark43.com", qualifications: [] } as any,
        { id: "p10", name: "Fleet Manager - T. Alvarez", badge: "FM-01", unit: "Fleet Services", roleIds: ["role_fleet_admin"], email: "t.alvarez@mark43.com", qualifications: [] } as any,
        { id: "p11", name: "Mechanic - D. Brennan", badge: "MX-02", unit: "Fleet Services", roleIds: ["role_fleet_admin"], email: "d.brennan@mark43.com", qualifications: [] } as any,
        { id: "p12", name: "Lyle Coguill", badge: "2501", unit: "Patrol - A Shift", roleIds: ["role_officer"], email: "lyle.coguill@mark43.com", qualifications: [] } as any,
        { id: "p13", name: "Kevin Fray", badge: "2502", unit: "Patrol - A Shift", roleIds: ["role_officer"], email: "kevin.fray@mark43.com", qualifications: [] } as any,
        { id: "p14", name: "Shelby Smith", badge: "2503", unit: "Patrol - B Shift", roleIds: ["role_officer"], email: "shelby.smith@mark43.com", qualifications: [] } as any,
        { id: "p15", name: "Justin White", badge: "2504", unit: "Patrol - B Shift", roleIds: ["role_officer"], email: "justin.white@mark43.com", qualifications: [] } as any,
        { id: "p16", name: "Kyle Kucharik", badge: "2505", unit: "Traffic Unit", roleIds: ["role_officer"], email: "kyle.kucharik@mark43.com", qualifications: [] } as any,
        { id: "p17", name: "Jody Shoaf", badge: "2506", unit: "Traffic Unit", roleIds: ["role_officer"], email: "jody.shoaf@mark43.com", qualifications: [] } as any,
        { id: "p18", name: "Flo Mayr", badge: "2507", unit: "Patrol - A Shift", roleIds: ["role_officer"], email: "flo.mayr@mark43.com", qualifications: [] } as any,
        { id: "p19", name: "Wendy Gilbert", badge: "2508", unit: "Patrol - B Shift", roleIds: ["role_officer"], email: "wendy.gilbert@mark43.com", qualifications: [] } as any,
        { id: "p20", name: "Brandon Lam", badge: "2509", unit: "SWAT", roleIds: ["role_officer"], email: "brandon.lam@mark43.com", qualifications: [] } as any,
        { id: "p21", name: "Erich Dark", badge: "2510", unit: "SWAT", roleIds: ["role_officer"], email: "erich.dark@mark43.com", qualifications: [] } as any,
        { id: "p22", name: "Juan Minton", badge: "2511", unit: "Professional Standards", roleIds: ["role_auditor"], email: "juan.minton@mark43.com", qualifications: [] } as any,
        { id: "p23", name: "Kristopher Cooper", badge: "2512", unit: "Fleet Services", roleIds: ["role_officer"], email: "kristopher.cooper@mark43.com", qualifications: [] } as any,
        { id: "p24", name: "Abbey Temple", badge: "2513", unit: "Logistics", roleIds: ["role_officer"], email: "abbey.temple@mark43.com", qualifications: [] } as any,
        { id: "p25", name: "Tom Corwin", badge: "2514", unit: "Patrol - A Shift", roleIds: ["role_officer"], email: "tom.corwin@mark43.com", qualifications: [] } as any,
    ];
}
/* =========================================================================
   AUTHENTICATION (demo-grade; see login screen note)
   ========================================================================= */
async function hashPassword(pw?: any): Promise<any> {
    if ((window as any).crypto && (window as any).crypto.subtle && (window as any).crypto.subtle.digest) {
        try {
            const enc: any = new TextEncoder().encode(pw);
            const buf: any = await (window as any).crypto.subtle.digest('SHA-256', enc);
            return 'sha256:' + Array.from(new Uint8Array(buf)).map((b?: any): any => b.toString(16).padStart(2, '0')).join('');
        }
        catch (e: any) { /* fall through */ }
    }
    let h: any = 0;
    for (let i: any = 0; i < pw.length; i++) {
        h = (h * 31 + pw.charCodeAt(i)) | 0;
    }
    return 'simple:' + h;
}
const DEMO_PASSWORD: any = "suite12345";
async function seedAccounts(personnel?: any): Promise<any> {
    const hash: any = await hashPassword(DEMO_PASSWORD);
    return personnel.map((p?: any): any => ({
        id: 'acct_' + p.id, personId: p.id,
        username: p.email ? p.email.split('@')[0] : p.name.toLowerCase().replace(/[^a-z]/g, ''),
        passwordHash: hash
    } as any));
}
let CURRENT_USER_ID: any = null;
let HOME_ROLE_IDS: any = null;
function accountForUsername(username?: any): any {
    return STATE.accounts.find((a?: any): any => a.username.toLowerCase() === username.toLowerCase());
}
async function attemptLogin(): Promise<any> {
    const username: any = (document as any).getElementById('loginUsername').value.trim();
    const password: any = (document as any).getElementById('loginPassword').value;
    const errBox: any = (document as any).getElementById('loginError');
    errBox.style.display = 'none';
    if (!username || !password) {
        errBox.textContent = "Enter a username and password.";
        errBox.style.display = '';
        return;
    }
    const account: any = accountForUsername(username);
    if (!account) {
        errBox.textContent = "No account with that username.";
        errBox.style.display = '';
        return;
    }
    const hash: any = await hashPassword(password);
    if (hash !== account.passwordHash) {
        errBox.textContent = "Incorrect password.";
        errBox.style.display = '';
        return;
    }
    const person: any = STATE.personnel.find((p?: any): any => p.id === account.personId);
    if (!person) {
        errBox.textContent = "This account isn't linked to an active personnel record.";
        errBox.style.display = '';
        return;
    }
    CURRENT_USER_ID = person.id;
    HOME_ROLE_IDS = (person.roleIds || []).slice();
    STATE.currentRoleIds = (person.roleIds || []).slice();
    logAuditEntry('Shared', `${person.name} signed in.`, 'auth');
    persist();
    (document as any).getElementById('loginScreen').classList.add('hidden');
    (document as any).getElementById('app').classList.add('authenticated');
    startShell();
}
async function logout(): Promise<any> {
    try {
        if (CURRENT_USER_ID)
            logAuditEntry('Shared', `${personName(CURRENT_USER_ID)} signed out.`, 'auth');
    }
    catch (e: any) {
        console.error('Audit log entry on sign-out failed (logging out anyway):', e);
    }
    try {
        persist();
    }
    catch (e: any) {
        console.error('Save on sign-out failed (logging out anyway):', e);
    }
    try {
        await SuiteStore.signOut();
    }
    catch (e: any) {
        console.error('Sign-out failed (clearing this tab anyway):', e);
    }
    // Everything below here is the actual, visible effect of "logging out" -- it must run
    // unconditionally, even if every step above failed, or clicking Log Out can silently do
    // nothing at all from the person's point of view.
    CURRENT_USER_ID = null;
    HOME_ROLE_IDS = null;
    ACTIVE_MODULE = null;
    (document as any).getElementById('app').classList.remove('authenticated');
    (document as any).getElementById('loginScreen').classList.remove('hidden');
    (document as any).getElementById('loginPassword').value = '';
    (document as any).getElementById('loginError').style.display = 'none';
}
function renderDemoAccountsList(): any {
    const box: any = (document as any).getElementById('demoAccountsBox');
    const rows: any = STATE.accounts.map((a?: any): any => {
        const person: any = STATE.personnel.find((p?: any): any => p.id === a.personId);
        return `<div style="padding:3px 0;"><span class="mono">${escapeHtml(a.username)}</span> — ${person ? escapeHtml(person.name) + ' (' + personRoleNames(person) + ')' : '(unlinked)'}</div>`;
    }).join('');
    box.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">Password for all demo accounts: <span class="mono">${DEMO_PASSWORD}</span></div>${rows}`;
}
/* =========================================================================
   SELF-SERVICE PASSWORD RESET (demo-grade; see login screen note)
   ========================================================================= */
/* Change Password — available to anyone already signed in, for their own account. */
function openChangePasswordModal(): any {
    const account: any = STATE.accounts.find((a?: any): any => a.personId === CURRENT_USER_ID);
    (document as any).getElementById('modalBox').className = 'modal';
    (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Change Password</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Current Password</label><input type="password" id="fCurrentPw" autocomplete="current-password"></div>
      <div class="form-row"><label>New Password</label><input type="password" id="fNewPw" autocomplete="new-password"></div>
      <div class="form-row"><label>Confirm New Password</label><input type="password" id="fConfirmPw" autocomplete="new-password"></div>
      <div id="cpwError" style="color:var(--red);font-size:12.5px;margin-bottom:10px;display:none;"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Save New Password</button>
    </div>
  `;
    openModal();
    (document as any).getElementById('mClose').onclick = closeModal;
    (document as any).getElementById('mCancel').onclick = closeModal;
    (document as any).getElementById('mSave').onclick = async (): Promise<any> => {
        const errBox: any = (document as any).getElementById('cpwError');
        errBox.style.display = 'none';
        const current: any = (document as any).getElementById('fCurrentPw').value;
        const next: any = (document as any).getElementById('fNewPw').value;
        const confirmVal: any = (document as any).getElementById('fConfirmPw').value;
        if (!current || !next || !confirmVal) {
            errBox.textContent = "Fill in all three fields.";
            errBox.style.display = '';
            return;
        }
        const currentHash: any = await hashPassword(current);
        if (currentHash !== account.passwordHash) {
            errBox.textContent = "Current password is incorrect.";
            errBox.style.display = '';
            return;
        }
        const check: any = passwordMeetsPolicy(next, STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID)?.email);
        if (!check.ok) {
            errBox.textContent = check.message;
            errBox.style.display = '';
            return;
        }
        if (next !== confirmVal) {
            errBox.textContent = "New password and confirmation don't match.";
            errBox.style.display = '';
            return;
        }
        account.passwordHash = await hashPassword(next);
        logAuditEntry('Shared', `${personName(CURRENT_USER_ID)} changed their own password.`, 'auth');
        persist();
        toast("Password updated.");
        closeModal();
    };
}
/* Forgot Password — reachable from the login screen, before signing in.
   A real system would verify identity via emailed/texted one-time code before
   allowing this; this prototype has no backend to send one, so it skips
   straight to letting you set a new password once you've named a valid
   username. That's a deliberate demo simplification, not a security model. */
// Shown after a real recovery session is established from clicking the link in a genuine
// password-reset email (see the PASSWORD_RECOVERY listener registered next to backendClient
// above) -- this is never reachable by just navigating to a URL by hand.
function openPasswordRecoveryModal(): any {
    if ((document as any).getElementById('recoveryPwOverlay'))
        return;
    const overlay: any = (document as any).createElement('div');
    overlay.id = 'recoveryPwOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,15,29,.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:440px;width:100%;padding:28px;">
      <h3 style="margin:0 0 8px;color:var(--heading);">Choose a New Password</h3>
      <p style="font-size:13px;color:var(--text-dim);margin:0 0 18px;">You followed a password reset link. Choose a new password to finish signing in.</p>
      <div class="form-row"><label for="recoveryNewPassword">New password (at least 8 characters, with an uppercase letter, a lowercase letter, and a special character)</label><input id="recoveryNewPassword" type="password" autocomplete="new-password" minlength="8"></div>
      <p id="recoveryPwError" role="alert" style="color:var(--red);font-size:12px;min-height:16px;"></p>
      <button id="recoveryPwSave" class="btn btn-primary" style="width:100%;margin-top:8px;">Set Password &amp; Continue</button>
    </div>`;
    (document as any).body.append(overlay);
    (document as any).getElementById('recoveryNewPassword').focus();
    (document as any).getElementById('recoveryPwSave').onclick = async (): Promise<any> => {
        const password: any = (document as any).getElementById('recoveryNewPassword').value;
        const { data: { user } }: any = await backendClient.auth.getUser().catch((): any => ({ data: { user: null } as any } as any));
        const check: any = passwordMeetsPolicy(password, user?.email);
        if (!check.ok) {
            (document as any).getElementById('recoveryPwError').textContent = check.message;
            return;
        }
        const btn: any = (document as any).getElementById('recoveryPwSave');
        btn.disabled = true;
        btn.textContent = 'Saving\u2026';
        const { error }: any = await backendClient.auth.updateUser({ password, data: { must_change_password: false } as any } as any);
        if (error) {
            (document as any).getElementById('recoveryPwError').textContent = error.message;
            btn.disabled = false;
            btn.textContent = 'Set Password & Continue';
            return;
        }
        overlay.remove();
        // The recovery link's token lives in the URL hash -- clear it so a page refresh (or
        // someone re-opening the same email later) doesn't try to reuse an already-spent token,
        // then reload so the app boots normally into the now-fully-authenticated session.
        history.replaceState(null, '', location.pathname + location.search);
        location.reload();
    };
    (document as any).getElementById('recoveryNewPassword').addEventListener('keydown', (e?: any): any => { if (e.key === 'Enter')
        (document as any).getElementById('recoveryPwSave').click(); });
}
function openForgotPasswordModal(): any {
    // "Forgot password" only ever happens BEFORE signing in, so SuiteStore.mode() is always
    // still 'local' at this exact moment regardless of whether this is a real deployment --
    // mode only flips to 'shared' after a successful login. The real signal for "does this
    // build even have a working Supabase backend to send an email from" is whether the client
    // was constructed at all, which happens at page load independent of login state.
    if (!backendClient)
        return openForgotPasswordModalLocalDemo();
    // Deliberately NOT using the shared #modalOverlay/#modalBox system (openModal/closeModal)
    // here -- this builds its own independent overlay instead, appended fresh to <body> each
    // time, the same reliable pattern already used by the idle-timeout screen and the
    // set-new-password screen elsewhere in this file. Self-contained: nothing to conflict with,
    // nothing stale to inherit from a previous state.
    if ((document as any).getElementById('forgotPwOverlay'))
        return;
    const overlay: any = (document as any).createElement('div');
    overlay.id = 'forgotPwOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(6,15,29,.72);padding:20px;';
    overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;max-width:420px;width:100%;padding:26px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <h3 style="margin:0;color:var(--heading);font-size:17px;">Reset Password</h3>
        <button type="button" id="fpClose" aria-label="Close" style="background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:var(--text-dim);">&times;</button>
      </div>
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;line-height:1.5;">Enter the email address on your account. If it matches an active account, we'll send a link to reset your password.</div>
      <div class="form-row"><label for="fFpEmail">Email</label><input type="email" id="fFpEmail" autocomplete="username" style="width:100%;box-sizing:border-box;"></div>
      <div id="fpStep1Error" style="color:var(--red);font-size:12.5px;margin:8px 0 0;display:none;"></div>
      <div id="fpStep1Success" style="color:var(--green);font-size:12.5px;margin:8px 0 0;display:none;"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px;">
        <button type="button" class="btn btn-outline" id="fpCancel">Close</button>
        <button type="button" class="btn btn-primary" id="fpNext">Send reset link</button>
      </div>
    </div>`;
    (document as any).body.append(overlay);
    (document as any).getElementById('fFpEmail').focus();
    const close: any = (): any => overlay.remove();
    (document as any).getElementById('fpClose').onclick = close;
    (document as any).getElementById('fpCancel').onclick = close;
    overlay.addEventListener('click', (e?: any): any => { if (e.target === overlay)
        close(); });
    (document as any).getElementById('fpNext').onclick = async (): Promise<any> => {
        const email: any = (document as any).getElementById('fFpEmail').value.trim().toLowerCase();
        const errBox: any = (document as any).getElementById('fpStep1Error');
        const okBox: any = (document as any).getElementById('fpStep1Success');
        errBox.style.display = 'none';
        okBox.style.display = 'none';
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errBox.textContent = "Enter a valid email address.";
            errBox.style.display = '';
            return;
        }
        const btn: any = (document as any).getElementById('fpNext');
        const original: any = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Sending\u2026';
        try {
            await backendClient.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname } as any);
        }
        catch (e: any) {
            console.error('Password reset email request failed:', e);
        }
        btn.disabled = false;
        btn.textContent = original;
        // Supabase's resetPasswordForEmail never reveals whether the email actually matched an
        // account (same response either way), so showing this message regardless of the real
        // outcome is accurate, not just reassuring -- it doesn't give anyone a way to test which
        // email addresses have accounts on this system.
        okBox.textContent = "If that email matches an active account, a reset link is on its way. Check your inbox (and spam folder).";
        okBox.style.display = '';
    };
    (document as any).getElementById('fFpEmail').addEventListener('keydown', (e?: any): any => { if (e.key === 'Enter')
        (document as any).getElementById('fpNext').click(); });
}
function openForgotPasswordModalLocalDemo(): any {
    (document as any).getElementById('modalBox').className = 'modal';
    (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Reset Password</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;line-height:1.5;">In a production system this step would email or text you a one-time code before letting you continue. This is a client-side prototype with no server to send one from, so it skips that step — enter your username to continue.</div>
      <div class="form-row"><label>Username</label><input type="text" id="fFpUsername" autocomplete="username"></div>
      <div id="fpStep1Error" style="color:var(--red);font-size:12.5px;margin-bottom:10px;display:none;"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mNext">Continue</button>
    </div>
  `;
    openModal();
    (document as any).getElementById('mClose').onclick = closeModal;
    (document as any).getElementById('mCancel').onclick = closeModal;
    (document as any).getElementById('mNext').onclick = (): any => {
        const username: any = (document as any).getElementById('fFpUsername').value.trim();
        const errBox: any = (document as any).getElementById('fpStep1Error');
        if (!username) {
            errBox.textContent = "Enter a username.";
            errBox.style.display = '';
            return;
        }
        const account: any = accountForUsername(username);
        if (!account) {
            errBox.textContent = "No account with that username.";
            errBox.style.display = '';
            return;
        }
        openForgotPasswordStep2(account);
    };
}
function openForgotPasswordStep2(account?: any): any {
    const person: any = STATE.personnel.find((p?: any): any => p.id === account.personId);
    (document as any).getElementById('modalBox').className = 'modal';
    (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Reset Password</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:13px;margin-bottom:14px;">Setting a new password for <strong>${escapeHtml(account.username)}</strong>${person ? ' (' + escapeHtml(person.name) + ')' : ''}.</div>
      <div class="form-row"><label>New Password</label><input type="password" id="fFpNewPw" autocomplete="new-password"></div>
      <div class="form-row"><label>Confirm New Password</label><input type="password" id="fFpConfirmPw" autocomplete="new-password"></div>
      <div id="fpStep2Error" style="color:var(--red);font-size:12.5px;margin-bottom:10px;display:none;"></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Set New Password</button>
    </div>
  `;
    openModal();
    (document as any).getElementById('mClose').onclick = closeModal;
    (document as any).getElementById('mCancel').onclick = closeModal;
    (document as any).getElementById('mSave').onclick = async (): Promise<any> => {
        const errBox: any = (document as any).getElementById('fpStep2Error');
        errBox.style.display = 'none';
        const next: any = (document as any).getElementById('fFpNewPw').value;
        const confirmVal: any = (document as any).getElementById('fFpConfirmPw').value;
        if (!next || !confirmVal) {
            errBox.textContent = "Fill in both fields.";
            errBox.style.display = '';
            return;
        }
        if (next.length < 6) {
            errBox.textContent = "Password must be at least 6 characters.";
            errBox.style.display = '';
            return;
        }
        if (next !== confirmVal) {
            errBox.textContent = "Passwords don't match.";
            errBox.style.display = '';
            return;
        }
        account.passwordHash = await hashPassword(next);
        logAuditEntry('Shared', `Password reset via "Forgot Password" for account "${account.username}"${person ? ' (' + person.name + ')' : ''}.`, 'auth');
        persist();
        closeModal();
        toast("Password reset. You can sign in with your new password now.");
    };
}
/* =========================================================================
   SHARED STATE + PERSISTENCE (orchestrates shared data + both modules)
   ========================================================================= */
let STATE: any = null;
const STORAGE_KEY: any = "pss_state_v1";
/* The initial seed supports the local demo while SuiteStore loads the authenticated workspace. */
const backendClient: any = (window as any).SonoMarziClient;
// Supabase fires this once it has parsed a password-recovery link's token out of the URL
// and established a temporary recovery session from it. That's the ONLY trustworthy signal
// that this page load is "someone followed a real reset-password email" -- not a URL flag,
// which anyone could type in by hand with no actual token behind it.
if (backendClient) {
    backendClient.auth.onAuthStateChange((event?: any): any => {
        if (event === 'PASSWORD_RECOVERY')
            openPasswordRecoveryModal();
    });
}
function setSyncStatus(status?: any): any {
    // status: 'saved' | 'saving' | 'offline' | 'loading'
    const el: any = (document as any).getElementById('syncStatus');
    if (!el)
        return;
    const label: any = ({ saved: 'Saved', saving: 'Saving\u2026', offline: 'Offline \u2014 local copy only', loading: 'Loading\u2026' } as any)[status] || '';
    const color: any = ({ saved: 'var(--green)', saving: 'var(--gold)', offline: 'var(--red)', loading: 'var(--text-dim)' } as any)[status] || 'var(--text-dim)';
    el.textContent = label;
    el.style.color = color;
}
async function buildSeedState(): Promise<any> {
    const personnel: any = seedPersonnel();
    return {
        roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)),
        personnel,
        accounts: await seedAccounts(personnel),
        currentRoleIds: ["role_admin"],
        auditLog: [],
        qm: QM.buildData(),
        fleet: FLEET.buildData(),
        pm: PM.buildData(),
        k9: K9.buildData(),
        drone: DRONE.buildData(),
        eod: EOD.buildData(),
        subpoena: SUBPOENA.buildData(),
        grants: GRANTS.buildData(),
        civil: CIVIL.buildData(),
        fieldLabels: {} as any,
        agencyBranding: { logoDataUrl: null, title: "SonoMarzi PS Management Suite", subtitle: "Choose a module to begin" } as any,
        ssoConfig: { enabled: false } as any
    } as any;
}
async function loadState(): Promise<any> {
    setSyncStatus('loading');
    // Restore the optional local artifact session before using fresh demo seed data.
    try {
        if ((window as any).storage) {
            const res: any = await (window as any).storage.get(STORAGE_KEY, false);
            if (res && res.value) {
                STATE = JSON.parse(res.value);
                await migrateState();
                setSyncStatus('saved');
                return;
            }
        }
    }
    catch (e: any) { /* key not found or storage unavailable -> fall through to seed */ }
    // The authenticated workspace is loaded after this initial seed.
    STATE = await buildSeedState();
    persist();
    setSyncStatus('saved');
}
function runCoreMigrations(): any {
    // Every step below runs in its own try/catch. This function used to be one long sequence where
    // a single throw anywhere (say, in Fleet's migration) would silently abort everything after it --
    // including Civil's migration, which ran dead last. That meant one unrelated module's bad data
    // could permanently prevent Civil Process from ever getting its fee schedule, enforcement array,
    // or per-paper field backfills, with no visible error. Isolating each step means one module's
    // problem stays contained to that module instead of taking the rest of the app down with it.
    function step(label?: any, fn?: any): any {
        try {
            fn();
        }
        catch (e: any) {
            console.error(`Migration step "${label}" failed (continuing with the rest):`, e);
        }
    }
    step('base module data', (): any => {
        if (!STATE.accounts)
            STATE.accounts = [];
        if (!STATE.qm)
            STATE.qm = QM.buildData();
        if (!STATE.fleet)
            STATE.fleet = FLEET.buildData();
        if (!STATE.pm)
            STATE.pm = PM.buildData();
        if (!STATE.k9)
            STATE.k9 = K9.buildData();
        if (!STATE.drone)
            STATE.drone = DRONE.buildData();
        if (!STATE.eod)
            STATE.eod = EOD.buildData();
        if (!STATE.subpoena)
            STATE.subpoena = SUBPOENA.buildData();
        if (!STATE.grants)
            STATE.grants = GRANTS.buildData();
        if (!STATE.civil)
            STATE.civil = CIVIL.buildData();
        if (!STATE.auditLog)
            STATE.auditLog = [];
        if (!STATE.fieldLabels)
            STATE.fieldLabels = {} as any;
        if (!STATE.agencyBranding)
            STATE.agencyBranding = { logoDataUrl: null, title: "SonoMarzi PS Management Suite", subtitle: "Choose a module to begin" } as any;
        if (!STATE.ssoConfig)
            STATE.ssoConfig = { enabled: false } as any;
    });
    step('PM exception codes', (): any => {
        // Inlined rather than calling defaultExceptionCodes(), which lives inside the Personnel
        // module's private scope and isn't reachable from here -- calling it threw a ReferenceError
        // on every login, so this step never actually completed.
        if (STATE.pm && STATE.pm.refData && !STATE.pm.refData.exceptionCodes)
            STATE.pm.refData.exceptionCodes = [
                { code: 'RDO', name: 'Regular Day Off', color: '#8A94A6', active: true, requestable: false } as any,
                { code: 'VDO', name: 'Vacation Day Off', color: '#14B8A6', active: true, requestable: true } as any,
                { code: 'CDO', name: 'Compensatory Day Off', color: '#D8AA50', active: true, requestable: true } as any,
                { code: 'SDO', name: 'Sick Day Off', color: '#EC4899', active: true, requestable: true } as any,
                { code: 'TDO', name: 'Training Day Off', color: '#F97316', active: true, requestable: false } as any,
                { code: 'SWP', name: 'Shift Swap (Covered by Someone Else)', color: '#0EA5E9', active: true, locked: true, requestable: false } as any,
            ];
        // requestable governs which codes show up in the self-service "Request Time Off" picker.
        // Codes an agency already had saved before this flag existed won't have it set at all -- default
        // those to requestable, except the ones that were always system- or schedule-assigned rather
        // than something an employee would ask for, so existing custom codes stay usable by employees
        // rather than silently vanishing from the request picker.
        if (STATE.pm && STATE.pm.refData && STATE.pm.refData.exceptionCodes) {
            STATE.pm.refData.exceptionCodes.forEach((c?: any): any => {
                if (c.requestable === undefined)
                    c.requestable = !c.locked && c.code !== 'RDO' && c.code !== 'TDO';
            });
        }
        if (STATE.pm && !STATE.pm.leaveRequests)
            STATE.pm.leaveRequests = [];
    });
    step('roles: drop malformed entries and backfill required fields', (): any => {
        STATE.roles = (STATE.roles || []).filter((r?: any): any => r && typeof r === 'object'); // drop any non-object garbage entries outright
        STATE.roles.forEach((r?: any, idx?: any): any => {
            if (r.agencyScope === undefined)
                r.agencyScope = [];
            if (!r.abilities || typeof r.abilities !== 'object')
                r.abilities = {} as any;
            // Backfill the name BEFORE deriving an ID from it. Doing this in the other order meant
            // every role missing both fields derived the exact same id ('role_untitled'), collapsing
            // all of them onto one identifier and destroying every membership that referenced them.
            if (!r.name)
                r.name = 'Untitled Role ' + (idx + 1);
            if (!r.id) {
                // NEVER generate a random ID here. This runs on every login, and memberships stored
                // server-side reference roles BY ID -- a fresh random ID silently orphans every user
                // assigned to that role, and two sessions healing the same role would invent two
                // different IDs for it. Recover the canonical ID by name where possible (that's what
                // memberships actually point at), otherwise derive one deterministically, and never
                // hand out an ID that already belongs to a different role.
                const canonical: any = DEFAULT_ROLES.find((dr?: any): any => dr.name === r.name);
                let candidate: any = canonical ? canonical.id
                    : 'role_' + String(r.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
                if (!candidate || candidate === 'role_')
                    candidate = 'role_untitled_' + (idx + 1);
                let unique: any = candidate, n: any = 2;
                while (STATE.roles.some((other?: any): any => other !== r && other.id === unique))
                    unique = candidate + '_' + (n++);
                r.id = unique;
            }
        });
    });
    step('roles: recover canonical IDs for default roles that were given generated IDs', (): any => {
        // Repairs workspaces already damaged by the bug above: a default role sitting under a
        // generated ID (role_1788850167012xxxx) while memberships point at its canonical ID
        // (role_fleet_admin). Only touches roles whose name matches a known default AND whose
        // current ID isn't already canonical, and never creates a duplicate. The match is
        // case/whitespace-insensitive so a trivial formatting difference ("civil admin" vs "Civil
        // Process Supervisor" differing only in case) doesn't silently defeat the repair -- but it
        // still requires the actual wording to match, so two genuinely different roles never merge.
        const norm: any = (s?: any): any => String(s || '').trim().toLowerCase();
        (STATE.roles || []).forEach((r?: any): any => {
            if (!r.name || !/^role_\d{10,}/.test(r.id || ''))
                return;
            const canonical: any = DEFAULT_ROLES.find((dr?: any): any => norm(dr.name) === norm(r.name));
            if (canonical && !STATE.roles.some((other?: any): any => other !== r && other.id === canonical.id))
                r.id = canonical.id;
        });
    });
    step('roles: guarantee the full default role set exists', (): any => {
        // This is the general fix for a real bug: a tenant can end up with only a handful of role
        // records actually persisted (a brand-new tenant that only ever saved one stray role, for
        // instance) while its full 19-role starting template sits unused, because a non-empty
        // roles array read from the database always wins over the template, even when that array
        // is far thinner than it should be. Rather than trying to prevent every possible way that
        // could happen, this guarantees the outcome directly: any DEFAULT_ROLES entry missing by ID
        // gets added, on every login, automatically -- the same repair the "Add Missing Default
        // Roles" button already offers, just applied without requiring anyone to notice and click
        // it. Never touches or removes an existing role, only adds what's missing.
        const existingIds: any = new Set((STATE.roles || []).map((r?: any): any => r.id));
        DEFAULT_ROLES.forEach((dr?: any): any => {
            if (!existingIds.has(dr.id))
                STATE.roles.push(JSON.parse(JSON.stringify(dr)));
        });
    });
    step('roles: backfill abilities introduced after a role was saved', (): any => {
        // A locked role (System Admin is the only one) is defined as "every ability, every module" by
        // design -- this is enforced unconditionally on every load, not just for newly-missing keys, so
        // that a value already incorrectly persisted as false (e.g. by an older build's migration bug)
        // gets corrected too rather than staying wrong forever. One deliberate exception: vendor-only
        // abilities (currently just manage_application_access) are never auto-granted this way, even to
        // a locked role -- that's the whole point of separating a SonoMarzi-internal control from "the
        // most powerful role a customer's own admin can hold."
        const VENDOR_ONLY_ABILITIES: any = ['manage_application_access', 'chatbot_access'];
        STATE.roles.forEach((r?: any): any => {
            ALL_ABILITY_IDS.forEach((id?: any): any => {
                if (VENDOR_ONLY_ABILITIES.includes(id)) {
                    if (r.abilities[id] === undefined)
                        r.abilities[id] = false;
                    return;
                }
                if (r.locked || r.id === 'role_platform_admin')
                    r.abilities[id] = true;
                else if (r.abilities[id] === undefined)
                    r.abilities[id] = false;
            });
        });
    });
    step('roles: admin_roles is restricted to System Admin and Platform Admin', (): any => {
        // Managing roles and abilities is a different class of power than administering a single
        // module -- it can grant its holder ANY ability, including abilities for modules they were
        // never meant to touch, simply by editing a role to add them. Several of the default
        // module-admin roles (Fleet Admin, K9 Unit Admin, and others) shipped with this ability
        // included by mistake; a Fleet Admin should administer Fleet, not the entire permission
        // system. This runs on every login, unconditionally, the same way the locked-role ability
        // backfill above does, so it corrects roles that already have this wrongly set in an
        // existing, already-saved tenant, not just newly-created ones. role_admin and
        // role_platform_admin are the only two roles this is ever allowed to be true for.
        STATE.roles.forEach((r?: any): any => {
            if (r.id === 'role_admin' || r.id === 'role_platform_admin')
                return;
            if (r.abilities)
                r.abilities.admin_roles = false;
        });
    });
    step('personnel: migrate roleId -> roleIds, backfill required fields', (): any => {
        STATE.personnel = (STATE.personnel || []).filter((p?: any): any => p && typeof p === 'object');
        STATE.personnel.forEach((p?: any): any => {
            if (!p.qualifications)
                p.qualifications = [];
            if (p.email === undefined)
                p.email = '';
            if (!p.roleIds) {
                p.roleIds = p.roleId ? [p.roleId] : ['role_officer'];
            }
            delete p.roleId;
        });
    });
    step('session: migrate currentRoleId -> currentRoleIds', (): any => {
        if (!STATE.currentRoleIds) {
            STATE.currentRoleIds = STATE.currentRoleId ? [STATE.currentRoleId] : ['role_admin'];
        }
        delete STATE.currentRoleId;
    });
    step('Quartermaster module migration', (): any => QM.migrateData());
    step('Fleet module migration', (): any => FLEET.migrateData());
    step('Personnel module migration', (): any => PM.migrateData());
    step('K9 module migration', (): any => K9.migrateData());
    step('Drone module migration', (): any => DRONE.migrateData());
    step('EOD module migration', (): any => EOD.migrateData());
    step('Subpoena module migration', (): any => SUBPOENA.migrateData());
    step('Grants module migration', (): any => GRANTS.migrateData());
    step('Civil Process module migration', (): any => CIVIL.migrateData());
}
async function migrateState(): Promise<any> {
    runCoreMigrations();
    // Everything below this line is local/demo-mode bootstrapping only (a fabricated "Fred
    // Marziano" admin, a fixed roster of demo accounts, password-hash-linked login accounts) --
    // it has no business running against a real tenant's actual personnel roster, which is why
    // it lives here rather than in runCoreMigrations() above.
    // ensure Fred Marziano exists and is set to the System Admin role, even for sessions saved before this was added
    let fred: any = STATE.personnel.find((p?: any): any => p.email && p.email.toLowerCase() === 'fred.marziano@mark43.com');
    if (!fred) {
        fred = { id: 'p_fred_marziano', name: 'Fred Marziano', badge: '1476', unit: 'Logistics', roleIds: ['role_admin'], email: 'fred.marziano@mark43.com', qualifications: [] } as any;
        STATE.personnel.push(fred);
    }
    else if (!fred.roleIds.includes('role_admin')) {
        fred.roleIds.push('role_admin');
    }
    // ensure the hidden SonoMarzi Platform Admin role exists and Fred Marziano always holds it, even for
    // sessions saved before this control existed -- this is the vendor-side "which modules exist at all"
    // gate, deliberately separate from customer-editable roles, so it must be self-healing like the above.
    if (!STATE.roles.find((r?: any): any => r.id === 'role_platform_admin')) {
        STATE.roles.push({ id: "role_platform_admin", name: "SonoMarzi Platform Admin", locked: true, hidden: true,
            description: "SonoMarzi-internal role that controls which modules exist for this deployment. Not visible to customer administrators \u2014 this is a vendor-side control, separate from how a customer's own admins manage roles within whatever modules they've been granted.",
            agencyScope: [], abilities: abilitiesFor(["admin_roles", "manage_application_access", "manage_field_labels", "manage_branding", "personnel_view",
                "module_quartermaster", "module_fleet", "module_personnel", "module_k9", "module_drone", "module_eod", "module_subpoena", "module_grants", "module_civil"]) } as any);
    }
    if (!fred.roleIds.includes('role_platform_admin'))
        fred.roleIds.push('role_platform_admin');
    // ensure the built-in Supervisor role can manage personnel, even for sessions saved before this was added
    const supervisorRole: any = STATE.roles.find((r?: any): any => r.id === 'role_supervisor');
    if (supervisorRole)
        supervisorRole.abilities.personnel_manage = true;
    // ensure the requested set of named accounts exists, even for sessions saved before this was added
    const REQUIRED_ACCOUNTS: any = [
        ["Lyle Coguill", "lyle.coguill@mark43.com", "2501", "Patrol - A Shift"],
        ["Kevin Fray", "kevin.fray@mark43.com", "2502", "Patrol - A Shift"],
        ["Shelby Smith", "shelby.smith@mark43.com", "2503", "Patrol - B Shift"],
        ["Justin White", "justin.white@mark43.com", "2504", "Patrol - B Shift"],
        ["Kyle Kucharik", "kyle.kucharik@mark43.com", "2505", "Traffic Unit"],
        ["Jody Shoaf", "jody.shoaf@mark43.com", "2506", "Traffic Unit"],
        ["Flo Mayr", "flo.mayr@mark43.com", "2507", "Patrol - A Shift"],
        ["Wendy Gilbert", "wendy.gilbert@mark43.com", "2508", "Patrol - B Shift"],
        ["Brandon Lam", "brandon.lam@mark43.com", "2509", "SWAT"],
        ["Erich Dark", "erich.dark@mark43.com", "2510", "SWAT"],
        ["Juan Minton", "juan.minton@mark43.com", "2511", "Professional Standards"],
        ["Kristopher Cooper", "kristopher.cooper@mark43.com", "2512", "Fleet Services"],
        ["Abbey Temple", "abbey.temple@mark43.com", "2513", "Logistics"],
        ["Tom Corwin", "tom.corwin@mark43.com", "2514", "Patrol - A Shift"],
    ];
    REQUIRED_ACCOUNTS.forEach(([name, email, badge, unit]: any, i?: any): any => {
        const exists: any = STATE.personnel.some((p?: any): any => p.email && p.email.toLowerCase() === email);
        if (!exists) {
            STATE.personnel.push({ id: 'p_req_' + (i + 1), name, badge, unit, roleIds: [unit === 'Professional Standards' ? 'role_auditor' : 'role_officer'], email, qualifications: [] } as any);
        }
    });
    // ensure every personnel record has a linked login account
    const linkedPersonIds: any = new Set(STATE.accounts.map((a?: any): any => a.personId));
    for (const p of STATE.personnel) {
        if (!linkedPersonIds.has(p.id)) {
            const hash: any = await hashPassword(DEMO_PASSWORD);
            STATE.accounts.push({ id: 'acct_' + p.id, personId: p.id, username: p.email ? p.email.split('@')[0] : p.name.toLowerCase().replace(/[^a-z]/g, ''), passwordHash: hash } as any);
        }
    }
}
/* =========================================================================
   DAY / NIGHT MODE — defaults to night mode; choice persists across sessions
   ========================================================================= */
const THEME_STORAGE_KEY: any = 'pss_theme_v1';
function applyTheme(theme?: any): any {
    (document as any).documentElement.dataset.theme = theme;
    const icon: any = (document as any).getElementById('themeIcon');
    const label: any = (document as any).getElementById('themeLabel');
    const knob: any = (document as any).getElementById('themeKnob');
    const toggleBtn: any = (document as any).getElementById('btnThemeToggle');
    if (icon) {
        icon.innerHTML = theme === 'dark' ? ICONS.moon : ICONS.sun;
        label.textContent = theme === 'dark' ? 'Night mode' : 'Day mode';
        knob.style.left = theme === 'dark' ? '20px' : '2px';
        toggleBtn.style.background = theme === 'dark' ? 'var(--blue)' : 'rgba(255,255,255,0.15)';
        toggleBtn.setAttribute('aria-checked', theme === 'dark');
    }
    // charts read colors live from CSS variables at render time, but already-drawn
    // charts need a redraw to pick up the new theme
    if (ACTIVE_MODULE === 'qm')
        QM.refresh();
    else if (ACTIVE_MODULE === 'fleet')
        FLEET.refresh();
    else if (ACTIVE_MODULE === 'personnel')
        PM.refresh();
}
function toggleTheme(): any {
    const next: any = (document as any).documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
        if ((window as any).storage)
            (window as any).storage.set(THEME_STORAGE_KEY, next, false).catch((): any => { });
        else
            localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    catch (e: any) { /* non-fatal */ }
}
async function loadTheme(): Promise<any> {
    try {
        if ((window as any).storage) {
            const res: any = await (window as any).storage.get(THEME_STORAGE_KEY, false);
            if (res && res.value) {
                applyTheme(res.value);
                return;
            }
        }
        else {
            const saved: any = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved) {
                applyTheme(saved);
                return;
            }
        }
    }
    catch (e: any) { /* not saved yet, or storage unavailable - fall through to default */ }
    applyTheme('dark');
}
/* =========================================================================
   TEXT SIZE — a persistent zoom level (5 steps), for anyone who finds the
   app's default text sizing too small. Uses the CSS `zoom` property on the
   whole page rather than rewriting the app's many hardcoded font-size values
   one by one: this scales fonts, spacing, and layout together, exactly like a
   person pressing Ctrl/Cmd+ in their own browser -- something every part of
   this app already has to tolerate correctly regardless.
   Defaults to 115% (a bit larger than the historical default) the first time
   anyone opens the app, since "everything's a little small" was the original
   complaint; from there it's fully adjustable.
   Saved to the signed-in account itself (via Supabase Auth's own self-service
   profile metadata) whenever one exists, so it follows a person to any
   device -- not just this browser. A device-local copy is kept too, both as
   an offline-friendly fallback and because the sign-in screen itself, shown
   before anyone's authenticated, has nothing else to read a preference from.
   ========================================================================= */
const TEXT_ZOOM_STORAGE_KEY: any = 'pss_text_zoom_v1';
const TEXT_ZOOM_LABELS: any = { 100: 'Normal', 115: 'Large', 130: 'Larger', 150: 'Extra large', 175: 'Maximum' } as any;
function updateTextSizeLabel(): any {
    const label: any = (document as any).getElementById('textSizeCurrentLabel');
    if (!label)
        return;
    const pct: any = parseInt((document as any).documentElement.style.zoom) || 115;
    label.textContent = '· ' + (TEXT_ZOOM_LABELS[pct] || (pct + '%'));
}
function applyTextZoom(pct?: any): any {
    (document as any).documentElement.style.zoom = pct + '%';
    (document as any).querySelectorAll('.text-zoom-btn').forEach((b?: any): any => {
        b.classList.toggle('active', Number(b.dataset.zoom) === Number(pct));
    });
    updateTextSizeLabel();
}
function saveTextZoomLocally(pct?: any): any {
    try {
        if ((window as any).storage)
            (window as any).storage.set(TEXT_ZOOM_STORAGE_KEY, String(pct), false).catch((): any => { });
        else
            localStorage.setItem(TEXT_ZOOM_STORAGE_KEY, String(pct));
    }
    catch (e: any) { /* non-fatal */ }
}
async function saveTextZoom(pct?: any): Promise<any> {
    saveTextZoomLocally(pct);
    if ((window as any).SONOMARZI_AWS_DEV)
        return;
    if (typeof SuiteStore === 'undefined' || SuiteStore.mode() !== 'shared' || !backendClient)
        return;
    try {
        // Merge into whatever metadata the account already has (display name, the
        // must-change-password flag, etc.) rather than overwriting it outright.
        const { data: { user } }: any = await backendClient.auth.getUser();
        if (!user)
            return;
        await backendClient.auth.updateUser({ data: { ...(user.user_metadata || {} as any), text_zoom: pct } as any } as any);
    }
    catch (e: any) {
        console.error('Could not save text size to the account (kept on this device only):', e.message);
    }
}
async function loadTextZoom(): Promise<any> {
    try {
        if ((window as any).storage) {
            const res: any = await (window as any).storage.get(TEXT_ZOOM_STORAGE_KEY, false);
            if (res && res.value) {
                applyTextZoom(Number(res.value));
                return;
            }
        }
        else {
            const saved: any = localStorage.getItem(TEXT_ZOOM_STORAGE_KEY);
            if (saved) {
                applyTextZoom(Number(saved));
                return;
            }
        }
    }
    catch (e: any) { /* not saved yet, or storage unavailable - fall through to default */ }
    applyTextZoom(115);
}
// Called right after a successful sign-in (and again on a resumed session), to prefer whatever
// the account itself has saved over the device-local fallback loadTextZoom() already applied on
// page load -- this is what makes the setting follow a person to a different computer.
async function syncTextZoomFromProfile(): Promise<any> {
    if ((window as any).SONOMARZI_AWS_DEV)
        return;
    if (typeof SuiteStore === 'undefined' || SuiteStore.mode() !== 'shared')
        return;
    try {
        const { data: { user } }: any = await backendClient.auth.getUser();
        const pct: any = user?.user_metadata?.text_zoom;
        if (pct) {
            applyTextZoom(Number(pct));
            saveTextZoomLocally(Number(pct));
        }
    }
    catch (e: any) {
        console.error('Could not load text size from the account:', e.message);
    }
}
function persist(): any {
    // window.storage save (only relevant when running inside a Claude artifact) happens immediately -
    // it's local/fast and doesn't need debouncing.
    try {
        if ((window as any).storage) {
            (window as any).storage.set(STORAGE_KEY, JSON.stringify(STATE), false).catch((): any => { });
        }
    }
    catch (e: any) { /* non-fatal */ }
    const bellBtn: any = (document as any).getElementById('btnNotifBell');
    if (bellBtn)
        renderNotifBell();
}
async function resetDemoData(): Promise<any> {
    if (!confirm("Reset all demo data back to the original seed set? Any changes you've made will be lost."))
        return;
    STATE = await buildSeedState();
    persist();
    toast("Demo data reset to original seed set.");
    if (ACTIVE_MODULE)
        enterModule(ACTIVE_MODULE);
    else
        showLauncher();
    renderRoleSwitcher();
}
/* =========================================================================
   SHARED: ROLES & ABILITIES
   ========================================================================= */
let SELECTED_ROLE_ID: any = null;
function renderRoles(): any {
    const canManage: any = can('admin_roles');
    // System Admin is locked (its checkboxes are intentionally disabled, since it's meant to
    // always carry every customer ability automatically) -- but that only holds if its *saved*
    // abilities object actually has every current key in it. A role saved before a new ability
    // category existed (like Bulk Import) simply doesn't have those keys yet, and since it's
    // locked, there's no checkbox to fix it by hand. Self-heal it here instead of relying on a
    // manual toggle that was never going to be clickable in the first place.
    const systemAdminRole: any = STATE.roles.find((r?: any): any => r.id === 'role_admin');
    if (systemAdminRole) {
        ALL_CUSTOMER_ABILITY_IDS.forEach((id?: any): any => { if (systemAdminRole.abilities[id] === undefined)
            systemAdminRole.abilities[id] = true; });
    }
    if (!SELECTED_ROLE_ID)
        SELECTED_ROLE_ID = primaryRoleId();
    const visibleRoles: any = STATE.roles.filter((r?: any): any => !r.hidden || loggedInPersonHasRole(r.id));
    if (!visibleRoles.find((r?: any): any => r.id === SELECTED_ROLE_ID))
        SELECTED_ROLE_ID = visibleRoles[0].id;
    const roleListHtml: any = visibleRoles.map((r?: any): any => `
    <div class="role-list-item ${r.id === SELECTED_ROLE_ID ? 'active' : ''}" data-select-role="${r.id}">
      <div>
        <div class="name">${escapeHtml(r.name)}</div>
        <div class="count">${countAbilities(r)} of ${ALL_ABILITY_IDS.length} abilities</div>
      </div>
      ${r.locked ? ICONS.lock : ""}
    </div>
  `).join('');
    const selRole: any = visibleRoles.find((r?: any): any => r.id === SELECTED_ROLE_ID) || visibleRoles[0];
    const RESTRICTED_CATEGORIES: any = ['SonoMarzi Internal'];
    const canSeeRestricted: any = can('manage_application_access');
    const groupsHtml: any = (Object.entries(ABILITY_CATALOG) as any).filter(([group]: any): any => canSeeRestricted || !RESTRICTED_CATEGORIES.includes(group))
        .map(([group, abilities]: any): any => `
    <div class="ability-group">
      <h3>${group}</h3>
      ${abilities.map(([id, label]: any): any => `
        <div class="ability-row">
          <div class="lbl">${label}</div>
          <label class="switch">
            <input type="checkbox" data-ability="${id}" ${selRole.abilities[id] ? 'checked' : ''} ${(!canManage || (selRole.locked && id !== 'chatbot_access')) ? 'disabled' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');
    const missingDefaults: any = DEFAULT_ROLES.filter((dr?: any): any => !STATE.roles.some((r?: any): any => r.id === dr.id));
    (document as any).getElementById('view-roles').innerHTML = `
    ${!canManage ? lockedNote("You're viewing role definitions in read-only mode. An authorized administrator can edit abilities.") : ""}
    <div class="toolbar">
      <div></div>
      <div style="display:flex;gap:8px;">
        ${canManage && missingDefaults.length ? `<button class="btn btn-outline" id="btnAddDefaultRoles">${ICONS.plus} Add ${missingDefaults.length} Missing Default Role${missingDefaults.length === 1 ? '' : 's'}</button>` : ''}
        ${canManage ? `<button class="btn btn-primary" id="btnAddRole">${ICONS.plus} New Role</button>` : ""}
      </div>
    </div>
    <div class="role-grid">
      <div><div class="role-list">${roleListHtml}</div></div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h2>${escapeHtml(selRole.name)}</h2>
            <div class="hint" style="margin-top:3px;">${escapeHtml(selRole.description || "")}</div>
          </div>
          ${canManage && !selRole.locked ? `
            <div style="display:flex;gap:8px;">
              <button class="btn btn-sm btn-outline" id="btnRenameRole">${ICONS.edit} Rename</button>
              <button class="btn btn-sm btn-danger" id="btnDeleteRole">${ICONS.trash} Delete</button>
            </div>` : (selRole.locked ? `<span class="hint">${ICONS.lock} Built-in role</span>` : '')}
        </div>
        <div class="panel-body">${groupsHtml}</div>
      </div>
    </div>
  `;
    (document as any).querySelectorAll('[data-select-role]').forEach((el?: any): any => {
        el.addEventListener('click', (): any => { SELECTED_ROLE_ID = el.dataset.selectRole; renderRoles(); });
    });
    if (canManage) {
        (document as any).querySelectorAll('[data-ability]').forEach((chk?: any): any => {
            chk.addEventListener('change', async (): Promise<any> => {
                selRole.abilities[chk.dataset.ability] = chk.checked;
                logAuditEntry('Shared', `${chk.checked ? 'Granted' : 'Removed'} ability "${abilityLabel(chk.dataset.ability)}" ${chk.checked ? 'to' : 'from'} role "${selRole.name}".`, 'role');
                SuiteUX.clearDirty();
                const saved: any = await SuiteStore.flush();
                if (saved)
                    toast(`${chk.checked ? 'Granted' : 'Removed'} "${abilityLabel(chk.dataset.ability)}" -- saved.`);
                else
                    toast(`"${abilityLabel(chk.dataset.ability)}" was changed here, but saving to the server failed. Check the status at the bottom of the sidebar and use Retry -- until that shows saved, this change has NOT reached anyone else.`, true);
                renderRoles();
                if (STATE.currentRoleIds.includes(selRole.id)) {
                    (document as any).getElementById('abilityCountPill').textContent = countAbilities(selRole) + " abilities";
                    renderModuleGate();
                }
            });
        });
        const addBtn: any = (document as any).getElementById('btnAddRole');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openAddRoleModal());
        const renameBtn: any = (document as any).getElementById('btnRenameRole');
        if (renameBtn)
            renameBtn.addEventListener('click', (): any => openAddRoleModal(selRole));
        const delBtn: any = (document as any).getElementById('btnDeleteRole');
        if (delBtn)
            delBtn.addEventListener('click', (): any => deleteRole(selRole));
        const addDefaultsBtn: any = (document as any).getElementById('btnAddDefaultRoles');
        if (addDefaultsBtn)
            addDefaultsBtn.addEventListener('click', (): any => {
                if (!confirm(`Add ${missingDefaults.length} standard platform role(s) (module admins and end-user roles) to this tenant? This never modifies or removes any role you already have.`))
                    return;
                missingDefaults.forEach((dr?: any): any => STATE.roles.push(JSON.parse(JSON.stringify(dr))));
                logAuditEntry('Shared', `Added ${missingDefaults.length} standard platform role(s): ${missingDefaults.map((r?: any): any => r.name).join(', ')}.`, 'role');
                persist();
                toast(`Added ${missingDefaults.length} role(s).`);
                renderRoles();
            });
    }
}
function openAddRoleModal(existing?: any): any {
    const editing: any = !!existing;
    (document as any).getElementById('modalBox').className = 'modal';
    (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? "Rename Role" : "Create New Role"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Role name</label><input type="text" id="fRoleName" value="${editing ? escapeHtml(existing.name) : ''}" placeholder="e.g. Records Clerk"></div>
      <div class="form-row"><label>Description</label><textarea id="fRoleDesc" rows="2" placeholder="What is this role for?">${editing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      ${!editing ? `<div class="form-row"><label>Start from</label>
        <select id="fRoleTemplate">
          <option value="blank">Blank (no abilities)</option>
          ${STATE.roles.map((r?: any): any => `<option value="${r.id}">Copy from ${escapeHtml(r.name)}</option>`).join('')}
        </select></div>` : ''}
      <div style="font-size:12px;color:var(--text-dim);">There's no limit on how many roles you can create. Module access (Quartermaster / Fleet) is set separately, per-ability, below once the role is created.</div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing ? "Save" : "Create Role"}</button>
    </div>
  `;
    openModal();
    (document as any).getElementById('mClose').onclick = closeModal;
    (document as any).getElementById('mCancel').onclick = closeModal;
    (document as any).getElementById('mSave').onclick = (): any => {
        const name: any = (document as any).getElementById('fRoleName').value.trim();
        if (!name) {
            toast("Enter a role name.", true);
            return;
        }
        if (editing) {
            existing.name = name;
            existing.description = (document as any).getElementById('fRoleDesc').value.trim();
            logAuditEntry('Shared', `Renamed/updated role to "${name}".`, 'role');
            toast("Role updated.");
        }
        else {
            const tmplId: any = (document as any).getElementById('fRoleTemplate').value;
            const abilities: any = tmplId === "blank" ? abilitiesFor([]) : JSON.parse(JSON.stringify(STATE.roles.find((r?: any): any => r.id === tmplId).abilities));
            abilities.chatbot_access = false;
            abilities.workflow_use = false;
            abilities.workflow_approve = false;
            abilities.workflow_manage = false;
            const newRole: any = { id: "role_" + Date.now(), name, description: (document as any).getElementById('fRoleDesc').value.trim(), locked: false, agencyScope: [], abilities } as any;
            STATE.roles.push(newRole);
            SELECTED_ROLE_ID = newRole.id;
            logAuditEntry('Shared', `Created new role "${name}".`, 'role');
            toast("Role created.");
        }
        persist();
        closeModal();
        renderRoles();
        renderRoleSwitcher();
    };
}
function deleteRole(role?: any): any {
    const inUse: any = STATE.personnel.some((p?: any): any => (p.roleIds || []).includes(role.id));
    if (inUse) {
        toast("Can't delete a role that's still assigned to personnel. Reassign them first.", true);
        return;
    }
    if (!confirm(`Delete the role "${role.name}"? This cannot be undone.`))
        return;
    STATE.roles = STATE.roles.filter((r?: any): any => r.id !== role.id);
    if (STATE.currentRoleIds.includes(role.id))
        STATE.currentRoleIds = STATE.currentRoleIds.filter((id?: any): any => id !== role.id);
    if (STATE.currentRoleIds.length === 0)
        STATE.currentRoleIds = [STATE.roles[0].id];
    SELECTED_ROLE_ID = STATE.roles[0].id;
    logAuditEntry('Shared', `Deleted role "${role.name}".`, 'role');
    persist();
    toast("Role deleted.");
    renderRoles();
    renderRoleSwitcher();
}
/* =========================================================================
   SHARED: PERSONNEL
   ========================================================================= */
let PERSONNEL_SORT: any = { key: 'name', dir: 'asc' } as any;
// Single source of truth for "add a brand-new person to the roster." Every entry point that
// can create a person -- Personnel Administration's Add Personnel Record, and a successful
// User Administration invite -- calls this instead of each independently deciding what a new
// person looks like. That guarantees a person created from either place always ends up with
// BOTH a shared roster identity (STATE.personnel, used for role/permission assignment) and a
// linked HR record (STATE.pm.records) from the moment they're created, rather than only
// whichever one that specific screen happened to touch directly.
function createPersonAndRecord({ name, badge = '', email = '', unit = '', roleIds = [] }: any): any {
    const newPerson: any = { id: 'p' + Date.now() + Math.random().toString(36).slice(2, 5), name, badge, email, unit, roleIds, qualifications: [] } as any;
    STATE.personnel.push(newPerson);
    if (!STATE.pm)
        STATE.pm = { records: [] } as any;
    if (!STATE.pm.records)
        STATE.pm.records = [];
    let record: any = STATE.pm.records.find((r?: any): any => r.personId === newPerson.id);
    if (!record) {
        record = {
            personId: newPerson.id, agency: (STATE.pm.refData && STATE.pm.refData.agencies) ? STATE.pm.refData.agencies[0] : "Reno PD - Patrol Division",
            employeeId: "", unitId: "", driversLicense: { number: "", licenseClass: "", state: "", expiration: "" } as any,
            hireDate: "", terminationDate: null, promotionHistory: [], bloodType: "Unknown", phones: [], address: { street: "", city: "", state: "", zip: "" } as any,
            sex: "Undisclosed", race: "Undisclosed", maritalStatus: "Undisclosed", rank: "", badgeNumber: badge || "", employmentStatus: "Active",
            specialSkills: [], assignment: "", medical: { bloodType: "Unknown", vaccinations: [], medicalNotes: "", injuryHistory: [], exposureHistory: [] } as any,
            lodd: { wishes: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "", notes: "" } as any,
            supervisorIds: [], education: [], swornDate: "", photoDataUrl: null, documents: [], fieldHistory: []
        } as any;
        STATE.pm.records.push(record);
    }
    return { person: newPerson, record } as any;
}
/* =========================================================================
   SHARED: PLATFORM AUDIT LOG — every logged action across both modules plus
   shared actions (login, personnel/role changes, password changes), with
   who did it, when, from where, filterable on any of those fields.
   ========================================================================= */
let AUDIT_LOG_FILTER: any = { module: "All", userId: "All", entityType: "All", dateFrom: "", dateTo: "", q: "" } as any;
// Converts a Supabase auth user_id (a UUID) to this app's own person_id format, matching
// exactly how invite_user constructs it server-side: person_ + the UUID with dashes removed.
// Verified against the actual roster rather than blindly trusted -- someone whose account
// predates this convention, or was created through a different path (a direct Mark43 sync, for
// instance), won't have a matching id, and returning an unverified guess would be worse than
// admitting we don't know.
function authUserIdToPersonId(authUserId?: any): any {
    if (!authUserId)
        return null;
    const candidate: any = 'person_' + String(authUserId).replaceAll('-', '');
    return STATE.personnel.some((p?: any): any => p.id === candidate) ? candidate : null;
}
// Resolves a person_id (or, when that lookup above came up empty, the raw auth id it fell back
// to) into a human-readable name for the audit log's display -- never throws on an id that
// doesn't match anyone currently in the roster (someone since removed, or from before this
// tenant's data was fully migrated), it just says so plainly instead.
function auditActorName(id?: any): any {
    if (!id)
        return 'System';
    const person: any = STATE.personnel.find((p?: any): any => p.id === id);
    if (person)
        return person.name;
    if (RESOLVED_ACTOR_NAMES[id])
        return RESOLVED_ACTOR_NAMES[id];
    return 'Unknown user';
}
// Populated by fetchRemoteAuditLog() below for any actor with no local personnel record --
// most often a SonoMarzi Platform Admin, who has no agency membership to be found in
// STATE.personnel at all. Keyed by the raw auth.users id (what audit rows fall back to when
// authUserIdToPersonId can't map them to a person_xxx id).
let RESOLVED_ACTOR_NAMES: any = {} as any;
let REMOTE_AUDIT_LOG: any = null;
let REMOTE_AUDIT_LOG_LOADING: any = false;
async function fetchRemoteAuditLog(): Promise<any> {
    if (typeof SuiteStore === 'undefined' || SuiteStore.mode() !== 'shared')
        return;
    const ctx: any = SuiteStore.remoteContext();
    if (!ctx.tenantId || !ctx.agencyId)
        return;
    REMOTE_AUDIT_LOG_LOADING = true;
    try {
        const { data, error }: any = await backendClient.rpc('suite_get_activity_log', { p_tenant_id: ctx.tenantId, p_agency_id: ctx.agencyId } as any);
        if (error)
            throw error;
        // Resolve names for whichever actors don't map to anyone in the local roster (typically
        // Platform Admins) before building the display rows below, so auditActorName can pick the
        // result up on the very first render instead of only after a second pass.
        const unresolvedIds: any = [...new Set((data || []).map((row?: any): any => row.actor_id).filter((id?: any): any => id && !authUserIdToPersonId(id) && !RESOLVED_ACTOR_NAMES[id]))];
        if (unresolvedIds.length) {
            try {
                const { data: resolved, error: resolveError }: any = await backendClient.rpc('suite_resolve_actor_names', { p_tenant_id: ctx.tenantId, p_agency_id: ctx.agencyId, p_actor_ids: unresolvedIds } as any);
                if (resolveError)
                    throw resolveError;
                for (const r of (resolved || []))
                    RESOLVED_ACTOR_NAMES[r.actor_id] = r.display_name || r.email;
            }
            catch (resolveErr: any) {
                console.error('Could not resolve actor names for the audit log:', resolveErr.message);
            }
        }
        REMOTE_AUDIT_LOG = (data || []).map((row?: any): any => {
            const personId: any = authUserIdToPersonId(row.actor_id) || row.actor_id;
            return {
                id: 'act' + row.id,
                timestamp: row.occurred_at,
                userId: personId,
                userName: auditActorName(personId),
                module: row.module,
                entityType: row.entity_type || 'general',
                action: row.description,
                ip: row.ip_address || 'Unknown'
            } as any;
        });
    }
    catch (err: any) {
        console.error('Could not load the durable activity log:', err.message);
    }
    finally {
        REMOTE_AUDIT_LOG_LOADING = false;
    }
}
function renderPlatformAuditLogTab(body?: any): any {
    const canExport: any = can('qm_reports_export') || can('fleet_reports_export') || can('pm_reports_export') || can('k9_reports_export') || can('drone_reports_export') || can('eod_reports_export') || can('subpoena_reports_export') || can('grants_reports_export') || can('civil_reports_export');
    // suite_apply_changes deliberately refuses to save auditLog changes (a real security boundary,
    // not a bug), so STATE.auditLog is only ever this tab's own, in-memory, since-page-load view.
    // The real, durable, cross-session history lives in suite_activity_log and is fetched below;
    // prefer that once it's loaded, and only fall back to the local copy before it arrives.
    const log: any = REMOTE_AUDIT_LOG || STATE.auditLog || [];
    const entityTypes: any = ["All", ...new Set(log.map((a?: any): any => a.entityType || 'general'))];
    const userIds: any = ["All", ...new Set(log.map((a?: any): any => a.userId).filter(Boolean))];
    const f: any = AUDIT_LOG_FILTER;
    let filtered: any = log.filter((a?: any): any => {
        if (f.module !== "All" && a.module !== f.module)
            return false;
        if (f.userId !== "All" && a.userId !== f.userId)
            return false;
        if (f.entityType !== "All" && (a.entityType || 'general') !== f.entityType)
            return false;
        const d: any = a.timestamp.slice(0, 10);
        if (f.dateFrom && d < f.dateFrom)
            return false;
        if (f.dateTo && d > f.dateTo)
            return false;
        if (f.q && !a.action.toLowerCase().includes(f.q.toLowerCase()))
            return false;
        return true;
    });
    filtered = applySharedSort('auditLog', filtered, (row?: any, key?: any): any => {
        if (key === 'userName')
            return auditActorName(row.userId).toLowerCase();
        if (key === 'entityType')
            return row.entityType || 'general';
        return row[key];
    });
    if (!SHARED_SORT.auditLog || !SHARED_SORT.auditLog.key) {
        filtered = filtered.slice().sort((a?: any, b?: any): any => b.timestamp.localeCompare(a.timestamp));
    }
    const rows: any = filtered.map((a?: any): any => {
        const dt: any = SuiteUX.displayInstant(a.timestamp);
        return `<tr>
      <td class="mono" style="white-space:nowrap;font-size:12px;">${dt}</td>
      <td>${escapeHtml(a.userName)}</td>
      <td><span class="badge badge-role">${escapeHtml(a.module)}</span></td>
      <td>${escapeHtml(a.entityType || 'general')}</td>
      <td style="font-size:13px;">${escapeHtml(a.action)}</td>
      <td class="mono" style="font-size:12px;">${escapeHtml(a.ip || 'Unknown')}</td>
    </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No audit entries match this filter.</td></tr>`;
    body.innerHTML = `
    <div class="panel" style="box-shadow:none;margin-bottom:14px;">
      <div class="panel-body">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">Module</label>
            <select id="auditModuleFilter" title="Filter to audit entries from a single module">
              <option ${f.module === 'All' ? 'selected' : ''}>All</option>
              <option ${f.module === 'Quartermaster' ? 'selected' : ''}>Quartermaster</option>
              <option ${f.module === 'Fleet' ? 'selected' : ''}>Fleet</option>
              <option ${f.module === 'Personnel' ? 'selected' : ''}>Personnel</option>
              <option ${f.module === 'K9' ? 'selected' : ''}>K9</option>
              <option ${f.module === 'Drone' ? 'selected' : ''}>Drone</option>
              <option ${f.module === 'EOD' ? 'selected' : ''}>EOD</option>
              <option ${f.module === 'Subpoena' ? 'selected' : ''}>Subpoena</option>
              <option ${f.module === 'Grants' ? 'selected' : ''}>Grants</option>
              <option ${f.module === 'Civil' ? 'selected' : ''}>Civil</option>
              <option ${f.module === 'Shared' ? 'selected' : ''}>Shared</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">User</label>
            <select id="auditUserFilter" title="Filter to audit entries created by a single user">
              ${userIds.map((uid?: any): any => `<option value="${uid}" ${f.userId === uid ? 'selected' : ''}>${uid === 'All' ? 'All Users' : escapeHtml(auditActorName(uid))}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">Entity Type</label>
            <select id="auditEntityFilter" title="Filter to a single kind of record (e.g. personnel, vehicle, role)">
              ${entityTypes.map((t?: any): any => `<option ${f.entityType === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">From</label>
            <input type="date" id="auditDateFrom" value="${f.dateFrom}" title="Only show entries on or after this date">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">To</label>
            <input type="date" id="auditDateTo" value="${f.dateTo}" title="Only show entries on or before this date">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:var(--heading);margin-bottom:5px;">Search</label>
            <input type="text" id="auditSearch" title="Filters the log below as you type, matching against the logged action text" placeholder="Search action text..." value="${escapeHtml(f.q)}" style="width:200px;">
          </div>
          <button class="btn btn-sm btn-outline" id="btnClearAuditFilter">Clear Filters</button>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportAuditLog" style="margin-left:auto;">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sharedSortHeader('auditLog', fieldLabel('audit.timestamp'), 'timestamp')}
          ${sharedSortHeader('auditLog', fieldLabel('audit.user'), 'userName')}
          ${sharedSortHeader('auditLog', fieldLabel('audit.module'), 'module')}
          ${sharedSortHeader('auditLog', fieldLabel('audit.entityType'), 'entityType')}
          ${sharedSortHeader('auditLog', fieldLabel('audit.action'), 'action')}
          <th>IP Address</th>
        </tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${filtered.length} of ${log.length} events &bull; this log spans both modules plus shared actions (login, personnel, and role changes)${REMOTE_AUDIT_LOG === null && SuiteStore.mode() === 'shared' ? ' &bull; loading full history\u2026' : ''}</div>
  `;
    wireSharedSortHeaders('auditLog', (): any => renderPlatformAuditLogTab(body));
    if (REMOTE_AUDIT_LOG === null && !REMOTE_AUDIT_LOG_LOADING && typeof SuiteStore !== 'undefined' && SuiteStore.mode() === 'shared') {
        fetchRemoteAuditLog().then((): any => renderPlatformAuditLogTab(body));
    }
    const wireFilter: any = (id?: any, key?: any): any => (document as any).getElementById(id).addEventListener('change', (e?: any): any => { AUDIT_LOG_FILTER[key] = e.target.value; renderPlatformAuditLogTab(body); });
    wireFilter('auditModuleFilter', 'module');
    wireFilter('auditUserFilter', 'userId');
    wireFilter('auditEntityFilter', 'entityType');
    wireFilter('auditDateFrom', 'dateFrom');
    wireFilter('auditDateTo', 'dateTo');
    (document as any).getElementById('auditSearch').addEventListener('input', (e?: any): any => { AUDIT_LOG_FILTER.q = e.target.value; renderPlatformAuditLogTab(body); refocusFilterInput('auditSearch'); });
    (document as any).getElementById('btnClearAuditFilter').addEventListener('click', (): any => {
        AUDIT_LOG_FILTER = { module: "All", userId: "All", entityType: "All", dateFrom: "", dateTo: "", q: "" } as any;
        renderPlatformAuditLogTab(body);
    });
    const exportBtn: any = (document as any).getElementById('btnExportAuditLog');
    if (exportBtn)
        exportBtn.addEventListener('click', (): any => {
            const headers: any = ["Timestamp", "User", "Module", "Entity Type", "Action", "IP Address"];
            const csvRows: any = filtered.map((a?: any): any => [a.timestamp, a.userName, a.module, a.entityType || 'general', a.action, a.ip || 'Unknown']);
            const csv: any = [headers, ...csvRows].map((r?: any): any => r.map((v?: any): any => csvSafeCell(v)).join(',')).join('\n');
            const blob: any = new Blob([csv], { type: 'text/csv' } as any);
            const url: any = URL.createObjectURL(blob);
            const a: any = (document as any).createElement('a');
            a.href = url;
            a.download = 'platform_audit_log.csv';
            (document as any).body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast("Audit log exported.");
        });
}

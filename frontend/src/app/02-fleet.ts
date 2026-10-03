/* =========================================================================
   FLEET MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.fleet and shared roles/personnel)
   ========================================================================= */
(function (): any {
    /* =========================================================================
       ICONS
       ========================================================================= */
    const ICONS: any = {
        dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
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
        bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>'
    } as any;
    /* =========================================================================
       ABILITY CATALOG + DEFAULT ROLES
       ========================================================================= */
    const ABILITY_CATALOG: any = {
        "Vehicles": [
            ["fleet_vehicle_view", "View fleet vehicles"],
            ["fleet_vehicle_add", "Add new vehicles"],
            ["fleet_vehicle_edit", "Edit vehicle details"],
            ["fleet_vehicle_delete", "Delete vehicle records"],
            ["fleet_vehicle_retire", "Retire / decommission vehicles"],
        ],
        "Vehicle Inspections": [
            ["fleet_inspection_conduct", "Conduct vehicle inspections"],
            ["fleet_inspection_view_all", "View all inspections agency-wide"],
            ["fleet_inspection_delete", "Delete inspection records"],
        ],
        "Maintenance": [
            ["fleet_maint_log", "Log maintenance / repairs"],
            ["fleet_maint_schedule", "Schedule maintenance"],
            ["fleet_maint_outofservice", "Mark vehicle out of service"],
        ],
        "Personnel": [
            ["personnel_view", "View personnel roster"],
            ["personnel_manage", "Add / edit personnel"],
        ],
        "Reports": [
            ["fleet_reports_view", "View reports & analytics"],
            ["fleet_reports_export", "Export reports (CSV)"],
        ],
        "Administration": [
            ["admin_roles", "Manage roles & abilities"],
            ["fleet_admin_categories", "Manage vehicle types, vendors & reference data"],
            ["fleet_admin_audit", "View system audit log"],
        ]
    } as any;
    const ALL_ABILITY_IDS: any = (Object.values(ABILITY_CATALOG) as any).flat().map((a?: any): any => a[0]);
    function abilityLabel(id?: any): any { for (const g of Object.values(ABILITY_CATALOG) as any) {
        const f: any = g.find((a?: any): any => a[0] === id);
        if (f)
            return f[1];
    } return id; }
    function abilitiesFor(list?: any): any { const o: any = {} as any; ALL_ABILITY_IDS.forEach((id?: any): any => o[id] = list.includes(id)); return o; }
    const DEFAULT_ROLES: any = [
        { id: "role_admin", name: "Fleet Admin", locked: true, description: "Full access to every module. Intended for fleet managers who own the system.",
            agencyScope: [],
            abilities: abilitiesFor(ALL_ABILITY_IDS) } as any,
        { id: "role_supervisor", name: "Fleet Supervisor / Mechanic Lead", locked: false, description: "Manages day-to-day vehicle maintenance and assignments.",
            agencyScope: [],
            abilities: abilitiesFor(["fleet_vehicle_view", "fleet_vehicle_add", "fleet_vehicle_edit", "fleet_inspection_conduct", "fleet_inspection_view_all", "fleet_maint_log", "fleet_maint_schedule", "fleet_maint_outofservice", "personnel_view", "fleet_reports_view", "fleet_reports_export"]) } as any,
        { id: "role_officer", name: "Driver / Officer", locked: false, description: "Line personnel who drive fleet vehicles and conduct routine inspections.",
            agencyScope: [],
            abilities: abilitiesFor(["fleet_vehicle_view", "fleet_inspection_conduct"]) } as any,
        { id: "role_auditor", name: "Auditor / Read-Only", locked: false, description: "Oversight or compliance role with visibility but no ability to change records.",
            agencyScope: [],
            abilities: abilitiesFor(["fleet_vehicle_view", "fleet_inspection_view_all", "personnel_view", "fleet_reports_view"]) } as any,
    ];
    const VEHICLE_TYPES: any = ["Patrol Sedan", "Patrol SUV", "Motorcycle", "K9 Unit Vehicle", "Command Vehicle", "Prisoner Transport Van", "Traffic Enforcement Motorcycle", "Armored Rescue Vehicle", "Administrative Sedan", "Utility Truck"];
    const MAINTENANCE_TYPES: any = ["Oil Change", "Tire Rotation", "Brake Service", "Scheduled Service (Manufacturer)", "Repair", "Inspection / Safety Check", "Recall Service", "Body Work", "Emergency Equipment Service"];
    const LOCATIONS: any = ["Main Fleet Garage", "North Substation", "South Substation", "Impound Lot", "Body Shop (Contracted)", "Evidence-Adjacent Storage"];
    const AGENCIES: any = ["Reno PD - Patrol Division", "Reno PD - SWAT", "Reno PD - Traffic Unit", "Regional Task Force (Mutual Aid)"];
    const VENDORS: any = [
        { id: "v1", name: "Reno Fleet Service Center", contact: "Service Desk", phone: "800-555-0188", email: "service@renofleetsvc-example.com", servicesProvided: "General repair, oil changes, brakes, tires" } as any,
        { id: "v2", name: "Capitol Ford Fleet Sales & Service", contact: "Fleet Accounts", phone: "800-555-0122", email: "fleet@capitolford-example.com", servicesProvided: "Manufacturer scheduled service, warranty repair" } as any,
        { id: "v3", name: "Sierra Emergency Vehicle Upfitters", contact: "Upfit Shop", phone: "800-555-0177", email: "upfit@sierraevu-example.com", servicesProvided: "Light bars, radios, prisoner cages, push bumpers" } as any,
        { id: "v4", name: "Precision Collision Body Shop", contact: "Estimator", phone: "800-555-0166", email: "estimates@precisioncollision-example.com", servicesProvided: "Body work, paint, collision repair" } as any,
    ];
    const EQUIPMENT_CATALOG: any = ["First Aid Kit", "Fire Extinguisher", "Road Flares / Triangles", "Spike Strip", "Prisoner Partition Cage", "Push Bumper", "Light Bar", "In-Car Radio", "In-Car Video / Camera System", "Radar / LIDAR Unit", "Rifle Rack", "Traffic Cones (Set)", "Jumper Cables", "Tire Inflation Kit"];
    const VEHICLE_STATUSES: any = ["In Service", "Out of Service", "In Maintenance", "Retired", "Impounded"];
    const CONDITIONS: any = ["Excellent", "Good", "Fair", "Poor", "Needs Attention"];
    const FUEL_TYPES: any = ["Unleaded", "Diesel", "Hybrid", "Electric"];
    const SHIFTS: any = ["Day Shift", "Swing Shift", "Graveyard", "Special Detail"];
    function defaultRefData(): any {
        return {
            vehicleTypes: [...VEHICLE_TYPES],
            maintenanceTypes: [...MAINTENANCE_TYPES],
            locations: [...LOCATIONS],
            agencies: [...AGENCIES],
            vendors: JSON.parse(JSON.stringify(VENDORS)),
            equipmentCatalog: [...EQUIPMENT_CATALOG]
        } as any;
    }
    /* =========================================================================
       PASSWORD HASHING (demo-grade; see login screen note)
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
    const DEMO_PASSWORD: any = "fleetmanager123";
    async function seedAccounts(personnel?: any): Promise<any> {
        const hash: any = await hashPassword(DEMO_PASSWORD);
        return personnel.map((p?: any): any => ({
            id: 'acct_' + p.id,
            personId: p.id,
            username: p.email ? p.email.split('@')[0] : p.name.toLowerCase().replace(/[^a-z]/g, ''),
            passwordHash: hash
        } as any));
    }
    /* =========================================================================
       UTIL (date helpers, needed before seed data)
       ========================================================================= */
    function addDays(d?: any, n?: any): any { const r: any = new Date(d) as any; r.setDate(r.getDate() + n); return r; }
    function fmt(d?: any): any { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
    function daysBetween(a?: any, b?: any): any { return Math.round(((new Date(b) as any) - (new Date(a) as any)) / 86400000); }
    /* =========================================================================
       SEED DATA
       ========================================================================= */
    function seedPersonnel(): any {
        return [
            { id: "p1", name: "Sgt. Maria Torres", badge: "1042", unit: "Patrol - A Shift", roleId: "role_supervisor", email: "maria.torres@renopd.gov" } as any,
            { id: "p2", name: "Ofc. Daniel Kim", badge: "2216", unit: "Patrol - A Shift", roleId: "role_officer", email: "daniel.kim@renopd.gov" } as any,
            { id: "p3", name: "Ofc. James Whitfield", badge: "2298", unit: "Patrol - B Shift", roleId: "role_officer", email: "james.whitfield@renopd.gov" } as any,
            { id: "p4", name: "Ofc. Priya Nair", badge: "2310", unit: "Traffic Unit", roleId: "role_officer", email: "priya.nair@renopd.gov" } as any,
            { id: "p5", name: "Lt. Robert Hayes", badge: "0510", unit: "SWAT", roleId: "role_supervisor", email: "robert.hayes@renopd.gov" } as any,
            { id: "p6", name: "Ofc. Alan Brooks", badge: "2401", unit: "SWAT", roleId: "role_officer", email: "alan.brooks@renopd.gov" } as any,
            { id: "p7", name: "C. Ellis (Compliance)", badge: "AUD-04", unit: "Professional Standards", roleId: "role_auditor", email: "c.ellis@renopd.gov" } as any,
            { id: "p8", name: "Fleet Manager - T. Alvarez", badge: "FM-01", unit: "Fleet Services", roleId: "role_admin", email: "t.alvarez@renopd.gov" } as any,
            { id: "p9", name: "Fred Marziano", badge: "1476", unit: "Fleet Services", roleId: "role_admin", email: "fred.marziano@mark43.com" } as any,
            { id: "p10", name: "Mechanic - D. Brennan", badge: "MX-02", unit: "Fleet Services", roleId: "role_supervisor", email: "d.brennan@renopd.gov" } as any,
        ];
    }
    function seedVendors(): any { return JSON.parse(JSON.stringify(VENDORS)); }
    function stdEquipmentChecklist(overrides?: any): any {
        overrides = overrides || {} as any;
        return EQUIPMENT_CATALOG.map((name?: any): any => ({
            name, required: true,
            present: overrides[name] !== undefined ? overrides[name] : true,
            condition: "Good"
        } as any));
    }
    function seedVehicles(): any {
        const today: any = new Date() as any;
        const rows: any = [
            // [unitNumber, make, model, year, type, mileage, fuel, agency, location, assignedType, assignedTarget, status, purchaseDate]
            ["Unit 7", "Ford", "Police Interceptor Utility", 2023, "Patrol SUV", 18420, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", "person", "p2", "In Service", "2023-03-01"],
            ["Unit 12", "Ford", "Police Interceptor Utility", 2022, "Patrol SUV", 34110, "Unleaded", "Reno PD - Patrol Division", "North Substation", "person", "p3", "In Service", "2022-05-15"],
            ["Unit 14", "Dodge", "Charger Pursuit", 2021, "Patrol Sedan", 51200, "Unleaded", "Reno PD - Patrol Division", "South Substation", "person", "p1", "In Service", "2021-02-10"],
            ["Unit 19", "Dodge", "Charger Pursuit", 2020, "Patrol Sedan", 68900, "Unleaded", "Reno PD - Traffic Unit", "Main Fleet Garage", null, null, "In Maintenance", "2020-06-01"],
            ["Unit 21", "Chevrolet", "Tahoe PPV", 2023, "Patrol SUV", 12040, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", "person", "p4", "In Service", "2023-08-01"],
            ["K9-3", "Ford", "Explorer K9", 2022, "K9 Unit Vehicle", 29870, "Unleaded", "Reno PD - Patrol Division", "North Substation", null, "K9 Unit", "In Service", "2022-01-20"],
            ["Command 1", "Ford", "Explorer", 2021, "Command Vehicle", 22300, "Unleaded", "Reno PD - SWAT", "Main Fleet Garage", "person", "p5", "In Service", "2021-09-01"],
            ["Moto 2", "Harley-Davidson", "Road King Police", 2022, "Motorcycle", 8100, "Unleaded", "Reno PD - Traffic Unit", "Main Fleet Garage", "person", "p4", "In Service", "2022-04-01"],
            ["Moto 5", "BMW", "R1250RT-P", 2023, "Traffic Enforcement Motorcycle", 4210, "Unleaded", "Reno PD - Traffic Unit", "Main Fleet Garage", null, null, "In Service", "2023-05-01"],
            ["Transport 1", "Ford", "Transit Prisoner Transport", 2019, "Prisoner Transport Van", 77250, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", null, null, "In Service", "2019-11-01"],
            ["Rescue 1", "Lenco", "BearCat G3", 2018, "Armored Rescue Vehicle", 15600, "Diesel", "Reno PD - SWAT", "Main Fleet Garage", null, "SWAT Team", "In Service", "2018-07-01"],
            ["Admin 3", "Chevrolet", "Impala", 2017, "Administrative Sedan", 92400, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", null, null, "In Service", "2017-03-15"],
            ["Admin 4", "Chevrolet", "Impala", 2017, "Administrative Sedan", 88750, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", null, null, "Out of Service", "2017-03-15"],
            ["Utility 2", "Ford", "F-150 Responder", 2020, "Utility Truck", 41200, "Unleaded", "Reno PD - Patrol Division", "Main Fleet Garage", null, null, "In Service", "2020-10-01"],
            ["Unit 26", "Ford", "Police Interceptor Utility", 2024, "Patrol SUV", 3200, "Hybrid", "Reno PD - Patrol Division", "Main Fleet Garage", null, null, "In Service", "2024-02-01"],
            ["Unit 9", "Dodge", "Charger Pursuit", 2016, "Patrol Sedan", 118400, "Unleaded", "Reno PD - Patrol Division", "Impound Lot", null, null, "Retired", "2016-01-10"],
        ];
        return rows.map((r?: any, i?: any): any => {
            const [unitNumber, make, model, year, vehicleType, mileage, fuelType, agency, location, assignedToType, assignedTo, status, purchaseDate]: any = r;
            return {
                id: "veh" + (i + 1),
                unitNumber, make, model, year,
                vin: "1FT" + (100000 + i * 137).toString().padStart(14, '0').slice(0, 14).toUpperCase(),
                licensePlate: "GOV-" + String(1000 + i),
                vehicleType, status, mileage, fuelType,
                currentFuelLevel: 55 + (i * 7 % 40),
                purchaseDate, inServiceDate: fmt(addDays(new Date(purchaseDate) as any, 10)),
                agency, location, isSharedAsset: vehicleType === "Armored Rescue Vehicle" || vehicleType === "K9 Unit Vehicle",
                assignedToType, assignedTo,
                equipmentChecklist: stdEquipmentChecklist(),
                photoDataUrl: null, notes: "", disposal: null
            } as any;
        });
    }
    function seedMaintenance(state?: any): any {
        const today: any = new Date() as any;
        const rows: any = [
            { veh: 3, type: "Repair", daysAgo: 2, labor: 180, parts: 220, vendor: "v1", status: "Open", notes: "Check engine light, diagnosing transmission fault.", recurring: false } as any,
            { veh: 12, type: "Repair", daysAgo: 1, labor: 0, parts: 0, vendor: "v4", status: "Open", notes: "Rear quarter panel damage from parking lot incident.", recurring: false } as any,
            { veh: 0, type: "Oil Change", daysAgo: 35, labor: 45, parts: 60, vendor: "v1", status: "Completed", notes: "Routine oil and filter change.", recurring: true, intervalMiles: 5000, intervalDays: null } as any,
            { veh: 1, type: "Tire Rotation", daysAgo: 60, labor: 35, parts: 0, vendor: "v1", status: "Completed", notes: "Rotated and balanced all four tires.", recurring: true, intervalMiles: 6000, intervalDays: null } as any,
            { veh: 4, type: "Scheduled Service (Manufacturer)", daysAgo: 90, labor: 120, parts: 340, vendor: "v2", status: "Completed", notes: "30,000 mile manufacturer service.", recurring: true, intervalMiles: 30000, intervalDays: null } as any,
            { veh: 2, type: "Brake Service", daysAgo: -10, labor: 0, parts: 0, vendor: "v1", status: "Scheduled", notes: "Front brake pads due for replacement per last inspection.", recurring: false } as any,
            { veh: 9, type: "Scheduled Service (Manufacturer)", daysAgo: -5, labor: 0, parts: 0, vendor: "v2", status: "Scheduled", notes: "Annual manufacturer service window.", recurring: true, intervalDays: 365, intervalMiles: null } as any,
            { veh: 6, type: "Emergency Equipment Service", daysAgo: -3, labor: 0, parts: 0, vendor: "v3", status: "Scheduled", notes: "Light bar and radio system check.", recurring: true, intervalDays: 180, intervalMiles: null } as any,
        ];
        return rows.map((r?: any, i?: any): any => {
            const veh: any = state.vehicles[r.veh];
            const date: any = r.status === "Scheduled" ? fmt(addDays(today, Math.abs(r.daysAgo))) : fmt(addDays(today, -r.daysAgo));
            return {
                id: "m" + (i + 1), vehicleId: veh.id, type: r.type, date,
                vendorId: r.vendor, laborCost: r.labor, partsCost: r.parts, cost: r.labor + r.parts,
                mileageAtService: veh.mileage, status: r.status, notes: r.notes,
                isRecurring: !!r.recurring, intervalDays: r.intervalDays || null, intervalMiles: r.intervalMiles || null
            } as any;
        });
    }
    function seedInspections(state?: any): any {
        const today: any = new Date() as any;
        const setups: any = [
            { veh: 0, people: ["p2"], daysAgo: 1, shift: "Day Shift", fuel: 85, gallons: 0, quarts: 0, cond: "Good", clean: "Good", damage: false } as any,
            { veh: 1, people: ["p3"], daysAgo: 1, shift: "Day Shift", fuel: 40, gallons: 9, quarts: 0, cond: "Good", clean: "Fair", damage: false } as any,
            { veh: 2, people: ["p1"], daysAgo: 2, shift: "Swing Shift", fuel: 20, gallons: 14, quarts: 1, cond: "Fair", clean: "Good", damage: true, damageNotes: "Small scuff on rear bumper, pre-existing, noted for record." } as any,
            { veh: 6, people: ["p5", "p6"], daysAgo: 3, shift: "Special Detail", fuel: 70, gallons: 0, quarts: 0, cond: "Good", clean: "Excellent", damage: false } as any,
            { veh: 7, people: ["p4"], daysAgo: 1, shift: "Day Shift", fuel: 60, gallons: 3, quarts: 0, cond: "Good", clean: "Good", damage: false } as any,
        ];
        return setups.map((s?: any, i?: any): any => {
            const veh: any = state.vehicles[s.veh];
            return {
                id: "insp" + (i + 1), vehicleId: veh.id,
                dateTime: fmt(addDays(today, -s.daysAgo)) + "T07:30",
                personnelIds: s.people, shift: s.shift,
                fuelLevel: s.fuel, gallonsAdded: s.gallons, quartsOilAdded: s.quarts,
                mileageAtInspection: veh.mileage,
                equipmentChecklist: stdEquipmentChecklist(),
                vehicleCondition: s.cond, vehicleConditionComments: "",
                cleanliness: s.clean, cleanlinessComments: "",
                bodyDamage: s.damage, bodyDamageComments: s.damageNotes || "",
                narrative: "Routine pre-shift inspection, no issues to report beyond what's noted above.",
                submittedByRoleId: "role_officer"
            } as any;
        });
    }
    function buildFleetData(): any {
        const vehicles: any = seedVehicles();
        const state: any = {
            vehicles: vehicles,
            maintenance: [],
            inspections: [],
            notifications: [],
            notifySettings: { maintenanceDueRoleId: "role_admin", inspectionOverdueRoleId: "role_admin", missingEquipmentRoleId: "role_admin" } as any,
            refData: defaultRefData(),
            activity: [],
            dashboardPrefs: {} as any
        } as any;
        state.maintenance = seedMaintenance(state);
        state.inspections = seedInspections(state);
        state.activity = [
            { ts: fmt(addDays(new Date() as any, -2)), text: "Unit 14 flagged for check engine light, transmission diagnosis in progress.", entityType: "maintenance" } as any,
            { ts: fmt(addDays(new Date() as any, -1)), text: "Unit 12 involved in a parking lot incident, body work scheduled.", entityType: "maintenance" } as any,
            { ts: fmt(addDays(new Date() as any, -1)), text: "Pre-shift inspection completed on Unit 7 by Ofc. Daniel Kim.", entityType: "inspection" } as any,
            { ts: fmt(addDays(new Date() as any, -3)), text: "Command 1 inspected by Lt. Robert Hayes and Ofc. Alan Brooks ahead of special detail.", entityType: "inspection" } as any,
        ];
        return state;
    }
    /* backfill any fleet-specific fields added after a session was already saved; roles/personnel/accounts are migrated once, centrally, by the shared shell */
    function migrateFleetData(): any {
        if (!STATE.fleet.refData)
            STATE.fleet.refData = defaultRefData();
        if (!STATE.fleet.notifications)
            STATE.fleet.notifications = [];
        if (!STATE.fleet.dashboardPrefs)
            STATE.fleet.dashboardPrefs = {} as any;
        if (!STATE.fleet.notifySettings)
            STATE.fleet.notifySettings = { maintenanceDueRoleId: STATE.roles[0].id, inspectionOverdueRoleId: STATE.roles[0].id, missingEquipmentRoleId: STATE.roles[0].id } as any;
        STATE.fleet.vehicles.forEach((v?: any): any => {
            if (v.isSharedAsset === undefined)
                v.isSharedAsset = false;
            if (v.photoDataUrl === undefined)
                v.photoDataUrl = null;
            if (v.disposal === undefined)
                v.disposal = null;
            if (v.equipmentChecklist === undefined)
                v.equipmentChecklist = stdEquipmentChecklist();
            if (!v.photos)
                v.photos = [];
        });
        STATE.fleet.maintenance.forEach((m?: any): any => {
            if (m.intervalMiles === undefined)
                m.intervalMiles = null;
            if (m.mileageAtService === undefined)
                m.mileageAtService = null;
        });
    }
    /* =========================================================================
       ABILITY HELPERS
       ========================================================================= */
    function currentRole(): any { return (window as any).currentRole(); }
    function can(abilityId?: any): any { const r: any = currentRole(); return !!(r && r.abilities && r.abilities[abilityId]); }
    function countAbilities(role?: any): any { return (Object.values(role.abilities) as any).filter(Boolean).length; }
    /* =========================================================================
       TOAST
       ========================================================================= */
    function toast(msg?: any, isErr?: any): any {
        const wrap: any = (document as any).getElementById('toastWrap');
        const el: any = (document as any).createElement('div');
        el.className = 'toast' + (isErr ? ' err' : '');
        el.textContent = msg;
        wrap.appendChild(el);
        setTimeout((): any => { el.remove(); }, 3200);
    }
    /* =========================================================================
       AUTHENTICATION (demo-grade; see login screen note)
       ========================================================================= */
    // Shared CURRENT_USER_ID is inherited from the shell.
    let HOME_ROLE_ID: any = null;
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
        HOME_ROLE_ID = person.roleId;
        STATE.currentRoleId = person.roleId;
        (document as any).getElementById('loginScreen').classList.add('hidden');
        (document as any).getElementById('app').classList.add('authenticated');
        startShell();
    }
    function renderDemoAccountsList(): any {
        const box: any = (document as any).getElementById('demoAccountsBox');
        const rows: any = STATE.accounts.map((a?: any): any => {
            const person: any = STATE.personnel.find((p?: any): any => p.id === a.personId);
            return `<div style="padding:3px 0;"><span class="mono">${escapeHtml(a.username)}</span> — ${person ? escapeHtml(person.name) + ' (' + escapeHtml(roleName(person.roleId)) + ')' : '(unlinked)'}</div>`;
        }).join('');
        box.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">Password for all demo accounts: <span class="mono">${DEMO_PASSWORD}</span></div>${rows}`;
    }
    /* =========================================================================
       SORTING (shared across tables)
       ========================================================================= */
    const SORT: any = {
        vehicles: { key: 'unitNumber', dir: 'asc' } as any,
        maintenance: { key: 'date', dir: 'desc' } as any,
        inspections: { key: 'dateTime', dir: 'desc' } as any,
        personnel: { key: 'name', dir: 'asc' } as any
    } as any;
    function sortHeaderHtml(label?: any, table?: any, key?: any): any {
        const s: any = SORT[table];
        const active: any = s.key === key;
        const arrow: any = active ? (s.dir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;';
        return `<th class="sortable ${active ? 'sort-active' : ''}" data-sort-table="${table}" data-sort-key="${key}">${label}<span class="arrow">${arrow}</span></th>`;
    }
    function wireSortHeaders(table?: any, rerenderFn?: any): any {
        (document as any).querySelectorAll(`[data-sort-table="${table}"]`).forEach((th?: any): any => {
            th.addEventListener('click', (): any => {
                const key: any = th.dataset.sortKey;
                const s: any = SORT[table];
                if (s.key === key) {
                    s.dir = s.dir === 'asc' ? 'desc' : 'asc';
                }
                else {
                    s.key = key;
                    s.dir = 'asc';
                }
                rerenderFn();
            });
        });
    }
    /* =========================================================================
       UTIL
       ========================================================================= */
    function escapeHtml(s?: any): any { return String(s).replace(/[&<>"']/g, (c?: any): any => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c])); }
    function money(n?: any): any { return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 } as any); }
    function personName(id?: any): any { const p: any = STATE.personnel.find((p?: any): any => p.id === id); return p ? p.name : "Unassigned"; }
    function roleName(id?: any): any { const r: any = STATE.roles.find((r?: any): any => r.id === id); return r ? r.name : "—"; }
    function vendorName(id?: any): any { const v: any = STATE.fleet.refData.vendors.find((v?: any): any => v.id === id); return v ? v.name : ""; }
    function vehicleById(id?: any): any { return STATE.fleet.vehicles.find((v?: any): any => v.id === id); }
    function assignmentLabel(v?: any): any {
        if (!v.assignedToType)
            return "—";
        if (v.assignedToType === 'person')
            return personName(v.assignedTo);
        return escapeHtml(v.assignedTo || '');
    }
    function statusBadgeClass(status?: any): any {
        return ({
            "In Service": "badge-available", "Out of Service": "badge-missing", "In Maintenance": "badge-maintenance",
            "Retired": "badge-retired", "Impounded": "badge-missing",
            "Open": "badge-maintenance", "Scheduled": "badge-assigned", "Completed": "badge-available"
        } as any)[status] || "badge-role";
    }
    function logActivity(text?: any, entityType?: any, entityId?: any): any {
        STATE.fleet.activity.push({ ts: fmt(new Date() as any), text, entityType: entityType || "general", entityId: entityId || null } as any);
        logAuditEntry('Fleet', text, entityType);
    }
    /* Agency visibility: roles with an empty agencyScope see everything; scoped roles
       see only their agency's vehicles, plus anything flagged as a shared task-force asset. */
    function canSeeVehicle(v?: any): any {
        if (!can('fleet_vehicle_view'))
            return false;
        const role: any = currentRole();
        if (role && role.agencyScope && role.agencyScope.length > 0 && !v.isSharedAsset && !role.agencyScope.includes(v.agency))
            return false;
        if (can('fleet_unit_scope') && !can('fleet_bypass_unit_scope')) {
            const myUnit: any = (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).unit;
            if (v.assignedToType === 'person' && v.assignedTo === CURRENT_USER_ID)
                return true;
            if (!myUnit)
                return false;
            const inMyUnit: any = v.assignedToType === 'unit'
                ? v.assignedTo === myUnit
                : v.assignedToType === 'person'
                    ? STATE.personnel.find((p?: any): any => p.id === v.assignedTo)?.unit === myUnit
                    : false;
            if (!inMyUnit)
                return false;
        }
        return true;
    }
    function visibleVehicles(): any {
        return STATE.fleet.vehicles.filter(canSeeVehicle);
    }
    function vehicleLink(v?: any): any {
        if (!v)
            return '—';
        return `<a href="#" data-open-veh="${v.id}" class="record-link">${escapeHtml(v.unitNumber)} — ${escapeHtml(v.make)} ${escapeHtml(v.model)}</a>`;
    }
    function wireVehicleLinks(): any {
        (document as any).querySelectorAll('[data-open-veh]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openVehicleDetail(a.dataset.openVeh); }));
    }
    /* =========================================================================
       NOTIFICATIONS: maintenance due (date or mileage), inspection overdue, missing equipment
       ========================================================================= */
    function recalcNotifications(): any {
        const today: any = new Date() as any;
        const upcoming: any = [];
        // maintenance due soon (date-based) or open repairs
        STATE.fleet.maintenance.forEach((m?: any): any => {
            const veh: any = vehicleById(m.vehicleId);
            if (!veh)
                return;
            if (m.status === "Scheduled" && m.intervalDays != null) {
                const days: any = daysBetween(fmt(today), m.date);
                if (days <= 14) {
                    upcoming.push({ type: "maintenance_due", entityId: veh.id, message: `${veh.unitNumber} has ${m.type.toLowerCase()} ${days < 0 ? 'overdue by ' + Math.abs(days) + ' days' : 'due in ' + days + ' days'} (${m.date}).`, recipientRoleId: STATE.fleet.notifySettings.maintenanceDueRoleId } as any);
                }
            }
            else if (m.status === "Scheduled") {
                const days: any = daysBetween(fmt(today), m.date);
                if (days <= 14) {
                    upcoming.push({ type: "maintenance_due", entityId: veh.id, message: `${veh.unitNumber} has ${m.type.toLowerCase()} ${days < 0 ? 'overdue by ' + Math.abs(days) + ' days' : 'due in ' + days + ' days'} (${m.date}).`, recipientRoleId: STATE.fleet.notifySettings.maintenanceDueRoleId } as any);
                }
            }
            if (m.status === "Open") {
                upcoming.push({ type: "maintenance_due", entityId: veh.id, message: `${veh.unitNumber} has an open repair awaiting completion (${m.type}).`, recipientRoleId: STATE.fleet.notifySettings.maintenanceDueRoleId } as any);
            }
            // mileage-based recurring: if current mileage has passed the interval since last service
            if (m.status === "Completed" && m.intervalMiles && veh.mileage - m.mileageAtService >= m.intervalMiles - 500) {
                const over: any = veh.mileage - m.mileageAtService - m.intervalMiles;
                upcoming.push({ type: "maintenance_due", entityId: veh.id, message: `${veh.unitNumber} is ${over > 0 ? over + ' miles past' : 'approaching'} its ${m.type.toLowerCase()} interval (every ${m.intervalMiles} mi).`, recipientRoleId: STATE.fleet.notifySettings.maintenanceDueRoleId } as any);
            }
        });
        // inspection overdue: no inspection within the last 7 days for an in-service vehicle
        STATE.fleet.vehicles.filter((v?: any): any => v.status === "In Service").forEach((v?: any): any => {
            const lastInsp: any = STATE.fleet.inspections.filter((i?: any): any => i.vehicleId === v.id).sort((a?: any, b?: any): any => b.dateTime.localeCompare(a.dateTime))[0];
            const daysSince: any = lastInsp ? daysBetween(lastInsp.dateTime.slice(0, 10), fmt(today)) : 999;
            if (daysSince > 7) {
                upcoming.push({ type: "inspection_overdue", entityId: v.id, message: `${v.unitNumber} hasn't been inspected in ${daysSince === 999 ? 'over a year' : daysSince + ' days'}.`, recipientRoleId: STATE.fleet.notifySettings.inspectionOverdueRoleId } as any);
            }
        });
        // missing equipment
        STATE.fleet.vehicles.forEach((v?: any): any => {
            const missing: any = (v.equipmentChecklist || []).filter((e?: any): any => !e.present);
            if (missing.length) {
                upcoming.push({ type: "missing_equipment", entityId: v.id, message: `${v.unitNumber} is missing: ${missing.map((e?: any): any => e.name).join(', ')}.`, recipientRoleId: STATE.fleet.notifySettings.missingEquipmentRoleId } as any);
            }
        });
        const prevReadBy: any = {} as any;
        STATE.fleet.notifications.forEach((n?: any): any => { prevReadBy[n.type + '|' + n.entityId] = n.readBy || []; });
        STATE.fleet.notifications = upcoming.map((n?: any): any => ({
            id: n.type + '_' + n.entityId,
            ts: fmt(today),
            type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
            readBy: prevReadBy[n.type + '|' + n.entityId] || []
        } as any));
    }
    function unreadNotificationCount(): any { return STATE.fleet.notifications.filter((n?: any): any => !n.read).length; }
    /* =========================================================================
       NAV
       ========================================================================= */
    const NAV_ITEMS: any = [
        { id: "fleet-dashboard", label: "Dashboard", icon: "dashboard", title: "Dashboard", sub: "Fleet-wide vehicle status at a glance", requiredAbility: null } as any,
        { id: "fleet-vehicles", label: "Vehicles", icon: "truck", title: "Fleet Vehicles", sub: "Every vehicle tracked by the fleet management module", requiredAbility: "fleet_vehicle_view" } as any,
        { id: "fleet-inspections", label: "Inspections", icon: "checklist", title: "Vehicle Inspections", sub: "Pre/post-shift inspections and condition history", requiredAbility: ["fleet_inspection_conduct", "fleet_inspection_view_all"] } as any,
        { id: "fleet-maintenance", label: "Maintenance", icon: "wrench", title: "Maintenance", sub: "Repairs, service, and vendor tracking across the fleet", requiredAbility: "fleet_vehicle_view" } as any,
        { id: "fleet-reports", label: "Reports", icon: "chart", title: "Reports & Analytics", sub: "Inspections, maintenance, mileage, and equipment reporting", requiredAbility: "fleet_reports_view" } as any,
        { id: "fleet-admin", label: "Admin", icon: "gear", title: "Administration", sub: "Reference data, vendors, and the system audit log", requiredAbility: ["fleet_admin_categories", "fleet_admin_audit"] } as any,
    ];
    let ACTIVE_VIEW: any = "fleet-dashboard";
    function navItemVisible(item?: any): any {
        if (!can('module_fleet'))
            return false;
        if (!item)
            return false;
        if (!item.requiredAbility)
            return true;
        if (Array.isArray(item.requiredAbility))
            return item.requiredAbility.some((a?: any): any => can(a));
        return can(item.requiredAbility);
    }
    function renderNav(): any {
        const nav: any = (document as any).getElementById('navlist');
        const visibleItems: any = NAV_ITEMS.filter(navItemVisible);
        nav.innerHTML = visibleItems.map((item?: any): any => `
    <button class="navitem ${item.id === ACTIVE_VIEW ? 'active' : ''}" data-nav="${item.id}">
      ${ICONS[item.icon]}<span>${item.label}</span>
    </button>
  `).join('');
        nav.querySelectorAll('[data-nav]').forEach((btn?: any): any => {
            btn.addEventListener('click', (): any => switchView(btn.dataset.nav));
        });
    }
    function switchView(id?: any): any {
        const target: any = NAV_ITEMS.find((n?: any): any => n.id === id);
        if (!target || !navItemVisible(target))
            return;
        if (!SuiteUX.beforeView(id))
            return;
        ACTIVE_VIEW = id;
        (document as any).querySelectorAll('.view').forEach((v?: any): any => v.classList.remove('active'));
        (document as any).getElementById('view-' + id).classList.add('active');
        const meta: any = NAV_ITEMS.find((n?: any): any => n.id === id);
        (document as any).getElementById('page-title').textContent = meta.title;
        (document as any).getElementById('page-sub').textContent = meta.sub;
        renderNav();
        renderView(id);
    }
    function renderRoleSwitcher(): any {
        const sel: any = (document as any).getElementById('roleSwitcher');
        const loggedInEl: any = (document as any).getElementById('loggedInAs');
        const person: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID);
        loggedInEl.textContent = person ? `Logged in as ${person.name}` : '';
        sel.innerHTML = STATE.roles.map((r?: any): any => `<option value="${r.id}" ${r.id === STATE.currentRoleId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        sel.onchange = (): any => {
            STATE.currentRoleId = sel.value;
            (document as any).getElementById('abilityCountPill').textContent = countAbilities(currentRole()) + " abilities";
            renderNav();
            if (!navItemVisible(NAV_ITEMS.find((n?: any): any => n.id === ACTIVE_VIEW))) {
                switchView('dashboard');
            }
            else {
                renderView(ACTIVE_VIEW);
            }
            renderNotifBell();
        };
        (document as any).getElementById('abilityCountPill').textContent = countAbilities(currentRole()) + " abilities";
    }
    /* ---------- Notification bell ---------- */
    function renderNotifBell(): any {
        recalcNotifications();
        const mine: any = STATE.fleet.notifications.filter((n?: any): any => n.recipientRoleId === STATE.currentRoleId);
        const unread: any = mine.filter((n?: any): any => !n.read).length;
        const badge: any = (document as any).getElementById('notifBadge');
        badge.style.display = unread ? '' : 'none';
        badge.textContent = unread > 9 ? '9+' : String(unread);
    }
    function toggleNotifPanel(): any {
        const panel: any = (document as any).getElementById('notifPanel');
        if (panel.style.display === 'none' || !panel.innerHTML) {
            renderNotifPanel();
            panel.style.display = '';
        }
        else {
            panel.style.display = 'none';
        }
    }
    function renderNotifPanel(): any {
        const panel: any = (document as any).getElementById('notifPanel');
        const mine: any = STATE.fleet.notifications.filter((n?: any): any => n.recipientRoleId === STATE.currentRoleId).sort((a?: any, b?: any): any => (a.read === b.read ? 0 : a.read ? 1 : -1));
        const typeLabel: any = { maintenance_due: 'Maintenance', inspection_overdue: 'Inspection', missing_equipment: 'Equipment' } as any;
        const rows: any = mine.map((n?: any): any => `
    <div style="padding:10px 14px;border-bottom:1px solid var(--border);${n.read ? 'opacity:0.55;' : ''}display:flex;gap:10px;align-items:flex-start;">
      <span class="badge ${n.type === 'maintenance_due' ? 'badge-maintenance' : n.type === 'inspection_overdue' ? 'badge-overdue' : 'badge-missing'}" style="flex-shrink:0;">${typeLabel[n.type]}</span>
      <div style="flex:1;font-size:12.5px;line-height:1.4;">
        ${escapeHtml(n.message)}
        ${!n.read ? `<div style="margin-top:4px;"><button class="btn btn-sm btn-outline" data-mark-read="${n.id}" style="padding:2px 8px;font-size:11px;">Mark read</button></div>` : ''}
      </div>
    </div>
  `).join('') || `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">No notifications for this role right now.</div>`;
        panel.innerHTML = `
    <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-weight:800;color:var(--heading);font-size:13.5px;display:flex;justify-content:space-between;align-items:center;">
      Notifications for ${escapeHtml(roleName(STATE.currentRoleId))}
      ${mine.some((n?: any): any => !n.read) ? `<button class="btn btn-sm btn-outline" id="btnMarkAllRead" style="padding:3px 8px;font-size:11px;">Mark all read</button>` : ''}
    </div>
    ${rows}
  `;
        (document as any).querySelectorAll('[data-mark-read]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const n: any = STATE.fleet.notifications.find((n?: any): any => n.id === b.dataset.markRead);
            if (n)
                n.read = true;
            persist();
            renderNotifPanel();
            renderNotifBell();
        }));
        const markAll: any = (document as any).getElementById('btnMarkAllRead');
        if (markAll)
            markAll.addEventListener('click', (): any => {
                mine.forEach((n?: any): any => n.read = true);
                persist();
                renderNotifPanel();
                renderNotifBell();
            });
    }
    /* =========================================================================
       RENDER DISPATCH
       ========================================================================= */
    function renderView(id?: any): any {
        if (id === "fleet-dashboard")
            renderDashboard();
        else if (id === "fleet-vehicles")
            renderVehicles();
        else if (id === "fleet-inspections")
            renderInspections();
        else if (id === "fleet-maintenance")
            renderMaintenanceView();
        else if (id === "fleet-reports")
            renderReports();
        else if (id === "fleet-admin")
            renderAdmin();
    }
    function renderAll(): any {
        renderRoleSwitcher();
        renderView(ACTIVE_VIEW);
        renderNotifBell();
    }
    function lockedNote(msg?: any): any {
        return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`;
    }
    function permissionBlockedView(msg?: any): any {
        return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
    }
    /* =========================================================================
       DASHBOARD
       ========================================================================= */
    const TOP_WIDGETS: any = [
        { id: "stat_total_vehicles", label: "Total Vehicles" } as any,
        { id: "stat_in_service", label: "In Service" } as any,
        { id: "stat_out_of_service", label: "Out of Service / In Maintenance" } as any,
        { id: "stat_inspections_overdue", label: "Inspections Overdue" } as any,
    ];
    const EXTRA_WIDGETS: any = [
        { id: "list_inspections_overdue", label: "Inspections Overdue (list)", defaultSize: "half" } as any,
        { id: "list_recent_activity", label: "Recent Activity", defaultSize: "half" } as any,
        { id: "list_open_maintenance", label: "Open & Scheduled Maintenance", defaultSize: "half" } as any,
        { id: "list_missing_equipment", label: "Missing Equipment", defaultSize: "half" } as any,
    ];
    const DEFAULT_EXTRAS: any = EXTRA_WIDGETS.map((w?: any): any => ({ id: w.id, size: w.defaultSize } as any));
    function myWidgetPrefs(): any {
        let p: any = STATE.fleet.dashboardPrefs[CURRENT_USER_ID];
        const topIds: any = TOP_WIDGETS.map((w?: any): any => w.id), extraIds: any = EXTRA_WIDGETS.map((w?: any): any => w.id);
        if (!p || (!p.topOrder && !p.extras)) {
            p = { topOrder: [...topIds], extras: DEFAULT_EXTRAS.map((e?: any): any => ({ ...e } as any)) } as any;
            STATE.fleet.dashboardPrefs[CURRENT_USER_ID] = p;
        }
        if (!Array.isArray(p.topOrder))
            p.topOrder = [...topIds];
        if (!Array.isArray(p.extras))
            p.extras = [];
        p.topOrder = [...p.topOrder.filter((id?: any): any => topIds.includes(id)), ...topIds.filter((id?: any): any => !p.topOrder.includes(id))];
        p.extras = p.extras.filter((e?: any): any => e && extraIds.includes(e.id));
        return p;
    }
    function renderWidget(id?: any): any {
        const veh: any = visibleVehicles();
        if (id === 'stat_total_vehicles') {
            const inService: any = veh.filter((v?: any): any => v.status === "In Service").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="fleet-vehicles"><div class="label">Total Vehicles</div><div class="value">${veh.length}</div><div class="delta neutral">${veh.length ? Math.round(inService / veh.length * 100) : 0}% in service</div></button>`;
        }
        if (id === 'stat_in_service') {
            const inService: any = veh.filter((v?: any): any => v.status === "In Service").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="fleet-vehicles"><div class="label">In Service</div><div class="value">${inService}</div><div class="delta neutral">Ready for duty</div></button>`;
        }
        if (id === 'stat_out_of_service') {
            const outOfService: any = veh.filter((v?: any): any => v.status === "Out of Service" || v.status === "In Maintenance").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="fleet-maintenance"><div class="label">Out of Service / In Maintenance</div><div class="value" style="color:${outOfService ? 'var(--red)' : 'var(--navy)'}">${outOfService}</div><div class="delta ${outOfService ? 'warn' : 'ok'}">${outOfService ? 'Needs attention' : 'All clear'}</div></button>`;
        }
        if (id === 'stat_inspections_overdue') {
            const inspOverdue: any = STATE.fleet.notifications.filter((n?: any): any => n.type === "inspection_overdue");
            return `<button class="stat-card dash-clickable" data-nav-dest="fleet-inspections"><div class="label">Inspections Overdue</div><div class="value" style="color:${inspOverdue.length ? 'var(--red)' : 'var(--navy)'}">${inspOverdue.length}</div><div class="delta ${inspOverdue.length ? 'warn' : 'ok'}">${inspOverdue.length ? 'Follow up needed' : 'Up to date'}</div></button>`;
        }
        if (id === 'list_inspections_overdue') {
            const inspOverdue: any = STATE.fleet.notifications.filter((n?: any): any => n.type === "inspection_overdue");
            const rows: any = inspOverdue.map((n?: any): any => {
                const v: any = vehicleById(n.entityId);
                return `<tr><td>${vehicleLink(v)}</td><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`;
            }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">Every in-service vehicle has been inspected recently.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Inspections Overdue</h2><span class="hint">No inspection in 7+ days</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Vehicle</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'list_recent_activity') {
            const rows: any = STATE.fleet.activity.slice().reverse().slice(0, 6).map((a?: any): any => `<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);"><div class="mono" style="width:78px;flex-shrink:0;color:var(--text-dim);">${a.ts}</div><div style="font-size:13px;">${escapeHtml(a.text)}</div></div>`).join('');
            return `<div class="panel"><div class="panel-head"><h2>Recent Activity</h2></div><div class="panel-body">${rows}</div></div>`;
        }
        if (id === 'list_open_maintenance') {
            const openMaint: any = STATE.fleet.maintenance.filter((m?: any): any => m.status === "Open" || m.status === "Scheduled");
            const rows: any = openMaint.slice().sort((a?: any, b?: any): any => a.date.localeCompare(b.date)).map((m?: any): any => {
                const v: any = vehicleById(m.vehicleId);
                return `<tr><td>${vehicleLink(v)}</td><td>${m.type}</td><td>${m.date}</td><td><span class="badge ${statusBadgeClass(m.status)}">${m.status}</span></td></tr>`;
            }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing open or scheduled.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Open &amp; Scheduled Maintenance</h2><span class="hint">${openMaint.length} in progress</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'list_missing_equipment') {
            const missingEquip: any = STATE.fleet.notifications.filter((n?: any): any => n.type === "missing_equipment");
            const rows: any = missingEquip.map((n?: any): any => {
                const v: any = vehicleById(n.entityId);
                return `<tr><td>${vehicleLink(v)}</td><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`;
            }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">No vehicles are missing required equipment.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Missing Equipment</h2><span class="hint">${missingEquip.length} vehicle(s) flagged</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Vehicle</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
    }
    const DASH_SIZE_LABELS: any = { quarter: '\u00bc', half: '\u00bd', threeQuarter: '\u00be', full: 'Full' } as any;
    function renderTopWidget(id?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}">
    <div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>
    ${renderWidget(id)}
  </div>`;
    }
    function renderExtraWidget(id?: any, size?: any): any {
        return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}">
    <div class="dash-widget-toolbar">
      <span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span>
      <button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size] || '\u00bd'}</button>
      <button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button>
    </div>
    ${renderWidget(id)}
  </div>`;
    }
    function wireDashDragDrop(zone?: any, orderedArray?: any, isExtras?: any): any {
        if (!zone)
            return;
        let draggedId: any = null;
        zone.querySelectorAll('.dash-drag-handle').forEach((handle?: any): any => {
            handle.setAttribute('draggable', 'true');
            handle.addEventListener('dragstart', (e?: any): any => {
                const card: any = handle.closest('[data-widget-id]');
                if (!card)
                    return;
                draggedId = card.dataset.widgetId;
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                try {
                    e.dataTransfer.setDragImage(card, 24, 24);
                }
                catch (err: any) { }
            });
            handle.addEventListener('dragend', (): any => {
                zone.querySelectorAll('.dash-widget').forEach((c?: any): any => c.classList.remove('dragging', 'dash-drop-target'));
                draggedId = null;
            });
        });
        zone.querySelectorAll('[data-widget-id]').forEach((card?: any): any => {
            card.addEventListener('dragover', (e?: any): any => {
                if (!draggedId || draggedId === card.dataset.widgetId)
                    return;
                e.preventDefault();
                card.classList.add('dash-drop-target');
            });
            card.addEventListener('dragleave', (): any => card.classList.remove('dash-drop-target'));
            card.addEventListener('drop', (e?: any): any => {
                e.preventDefault();
                card.classList.remove('dash-drop-target');
                const targetId: any = card.dataset.widgetId;
                if (!draggedId || draggedId === targetId)
                    return;
                if (isExtras) {
                    const fromIdx: any = orderedArray.findIndex((x?: any): any => x.id === draggedId);
                    const toIdx: any = orderedArray.findIndex((x?: any): any => x.id === targetId);
                    if (fromIdx < 0 || toIdx < 0)
                        return;
                    const [moved]: any = orderedArray.splice(fromIdx, 1);
                    orderedArray.splice(toIdx, 0, moved);
                }
                else {
                    const fromIdx: any = orderedArray.indexOf(draggedId);
                    const toIdx: any = orderedArray.indexOf(targetId);
                    if (fromIdx < 0 || toIdx < 0)
                        return;
                    orderedArray.splice(fromIdx, 1);
                    orderedArray.splice(toIdx, 0, draggedId);
                }
                persist();
                renderDashboard();
            });
        });
    }
    function openCustomizeDashboardModal(): any {
        const prefs: any = myWidgetPrefs();
        const enabled: any = new Set(prefs.extras.map((e?: any): any => e.id));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add / Remove Widgets</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">Check the widgets you want on your dashboard. Once added, drag any widget's handle to reposition it, and use its resize button to change how much room it takes up.</div>
      ${EXTRA_WIDGETS.map((w?: any): any => `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;">
        <input type="checkbox" class="widgetCheck" data-widget-id="${w.id}" ${enabled.has(w.id) ? 'checked' : ''} style="width:auto;">
        <span style="flex:1;font-size:13px;">${escapeHtml(w.label)}</span>
      </div>`).join('')}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const checked: any = Array.from((document as any).querySelectorAll('.widgetCheck')).filter((c?: any): any => c.checked).map((c?: any): any => c.dataset.widgetId);
            const stillThere: any = prefs.extras.filter((e?: any): any => checked.includes(e.id));
            const added: any = checked.filter((id?: any): any => !prefs.extras.some((e?: any): any => e.id === id)).map((id?: any): any => ({ id, size: (EXTRA_WIDGETS.find((w?: any): any => w.id === id) || {} as any).defaultSize || 'half' } as any));
            prefs.extras = [...stillThere, ...added];
            logActivity(`Customized personal Fleet dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
            persist();
            toast("Dashboard saved.");
            closeModal();
            renderDashboard();
        };
    }
    function renderDashboard(): any {
        recalcNotifications();
        const prefs: any = myWidgetPrefs();
        const root: any = (document as any).getElementById('view-fleet-dashboard');
        root.innerHTML = `
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Drag the handle on any card to rearrange it. This layout is saved to your account only.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map((id?: any): any => renderTopWidget(id)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map((e?: any): any => renderExtraWidget(e.id, e.size)).join('')}
    </div>
  `;
        wireVehicleLinks();
        // Scoped to `root`, this module's own dashboard container -- see the identical note in QM's
        // renderDashboard for why an unscoped document-wide lookup here is the actual bug being avoided.
        root.querySelectorAll('[data-nav-dest]').forEach((b?: any): any => b.addEventListener('click', (): any => switchView(b.dataset.navDest)));
        wireDashDragDrop(root.querySelector('#dashTopZone'), prefs.topOrder, false);
        wireDashDragDrop(root.querySelector('#dashExtrasZone'), prefs.extras, true);
        root.querySelectorAll('[data-widget-size-cycle]').forEach((b?: any): any => b.addEventListener('click', (e?: any): any => {
            e.preventDefault();
            e.stopPropagation();
            const entry: any = prefs.extras.find((x?: any): any => x.id === b.dataset.widgetSizeCycle);
            if (!entry)
                return;
            const order: any = ['quarter', 'half', 'threeQuarter', 'full'];
            entry.size = order[(order.indexOf(entry.size) + 1) % order.length];
            persist();
            renderDashboard();
        }));
        root.querySelectorAll('[data-widget-remove]').forEach((b?: any): any => b.addEventListener('click', (e?: any): any => {
            e.preventDefault();
            e.stopPropagation();
            prefs.extras = prefs.extras.filter((x?: any): any => x.id !== b.dataset.widgetRemove);
            persist();
            renderDashboard();
        }));
        const custBtn: any = root.querySelector('#btnCustomizeDashboard');
        if (custBtn)
            custBtn.addEventListener('click', openCustomizeDashboardModal);
    }
    /* =========================================================================
       VEHICLES
       ========================================================================= */
    let VEH_FILTER: any = { q: "", type: "All", status: "All", location: "All", assignedTo: "All" } as any;
    function vehSortValue(v?: any, key?: any): any {
        switch (key) {
            case 'assignedTo': return assignmentLabel(v).toLowerCase();
            default: {
                const val: any = v[key];
                return typeof val === 'string' ? val.toLowerCase() : val;
            }
        }
    }
    function generateVin(): any {
        return "1" + Math.random().toString(36).slice(2, 10).toUpperCase() + Date.now().toString().slice(-8);
    }
    function renderVehicles(): any {
        const canAdd: any = can('fleet_vehicle_add');
        const canEdit: any = can('fleet_vehicle_edit');
        const canDelete: any = can('fleet_vehicle_delete');
        const filtered: any = visibleVehicles().filter((v?: any): any => {
            const q: any = VEH_FILTER.q.toLowerCase();
            const matchQ: any = !q || v.unitNumber.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q) || v.licensePlate.toLowerCase().includes(q) || (v.make + ' ' + v.model).toLowerCase().includes(q);
            const matchType: any = VEH_FILTER.type === "All" || v.vehicleType === VEH_FILTER.type;
            const matchStatus: any = VEH_FILTER.status === "All" || v.status === VEH_FILTER.status;
            const matchLoc: any = VEH_FILTER.location === "All" || v.location === VEH_FILTER.location;
            const matchAssigned: any = VEH_FILTER.assignedTo === "All" ||
                (VEH_FILTER.assignedTo.startsWith('person:') ? (v.assignedToType === 'person' && v.assignedTo === VEH_FILTER.assignedTo.slice(7)) :
                    VEH_FILTER.assignedTo.startsWith('unit:') ? (v.assignedToType === 'unit' && v.assignedTo === VEH_FILTER.assignedTo.slice(5)) :
                        VEH_FILTER.assignedTo === 'unassigned' ? !v.assignedToType : true);
            return matchQ && matchType && matchStatus && matchLoc && matchAssigned;
        });
        const s: any = SORT.vehicles;
        filtered.sort((a?: any, b?: any): any => {
            const av: any = vehSortValue(a, s.key), bv: any = vehSortValue(b, s.key);
            if (av < bv)
                return s.dir === 'asc' ? -1 : 1;
            if (av > bv)
                return s.dir === 'asc' ? 1 : -1;
            return 0;
        });
        const rows: any = filtered.map((v?: any): any => {
            const missingCount: any = (v.equipmentChecklist || []).filter((e?: any): any => !e.present).length;
            return `
    <tr>
      <td class="mono">${escapeHtml(v.unitNumber)}</td>
      <td><a href="#" data-open-veh="${v.id}" class="record-link">${escapeHtml(v.make)} ${escapeHtml(v.model)} (${v.year})</a><div class="mono" style="font-size:11px;color:var(--text-dim);">${v.vin}</div></td>
      <td>${escapeHtml(v.vehicleType)}</td>
      <td><span class="badge ${statusBadgeClass(v.status)}">${v.status}</span></td>
      <td>${v.mileage.toLocaleString()} mi</td>
      <td>${escapeHtml(v.location)}</td>
      <td>${assignmentLabel(v)}</td>
      <td>${missingCount ? `<span class="qty-low">${missingCount} missing</span>` : `<span style="color:var(--green);">Complete</span>`}</td>
      <td>
        <div class="cell-actions">
        <div class="cell-actions">
          ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-veh="${v.id}">${ICONS.edit} Edit</button>` : ""}
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-veh="${v.id}">${ICONS.trash} Delete</button>` : ""}
        </div>
        </div>
      </td>
    </tr>`;
        }).join('') || `<tr><td colspan="9"><div class="empty-state">${ICONS.empty}<div class="msg">No vehicles match these filters</div><div class="sub">Try clearing the search or type filter</div></div></td></tr>`;
        const cols: any = [
            [fieldLabel('fleet.unitNumber'), 'unitNumber'], [fieldLabel('fleet.makeModel'), 'make'], [fieldLabel('fleet.vehicleType'), 'vehicleType'], [fieldLabel('fleet.status'), 'status'],
            [fieldLabel('fleet.mileage'), 'mileage'], [fieldLabel('fleet.location'), 'location'], [fieldLabel('fleet.assignedTo'), 'assignedTo'],
        ];
        const headHtml: any = cols.map(([label, key]: any): any => sortHeaderHtml(label, 'vehicles', key)).join('') + '<th>Equipment</th><th>Actions</th>';
        (document as any).getElementById('view-fleet-vehicles').innerHTML = `
    ${!canAdd && !canEdit ? lockedNote("You're viewing this role's read-only access. Switch to a role with edit permissions to manage vehicles.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="vehSearch" title="Filters the fleet below as you type, matching unit number, VIN, license plate, make, or model" placeholder="Search unit #, VIN, plate, make/model..." style="width:250px;" value="${escapeHtml(VEH_FILTER.q)}">
        <select id="vehType" title="Filter the fleet to a single vehicle type">
          <option ${VEH_FILTER.type === "All" ? "selected" : ""}>All</option>
          ${STATE.fleet.refData.vehicleTypes.map((t?: any): any => `<option ${VEH_FILTER.type === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join('')}
        </select>
        <select id="vehLocation" title="Filter the fleet to a single home station or location">
          <option ${VEH_FILTER.location === "All" ? "selected" : ""}>All</option>
          ${STATE.fleet.refData.locations.map((l?: any): any => `<option ${VEH_FILTER.location === l ? "selected" : ""}>${escapeHtml(l)}</option>`).join('')}
        </select>
        <select id="vehStatus" title="Filter the fleet to a single status (e.g. In Service, Out of Service)">
          <option ${VEH_FILTER.status === "All" ? "selected" : ""}>All</option>
          ${VEHICLE_STATUSES.map((st?: any): any => `<option ${VEH_FILTER.status === st ? "selected" : ""}>${st}</option>`).join('')}
        </select>
        <select id="vehAssignedTo" title="Filter the fleet to a single assigned person or unit">
          <option value="All" ${VEH_FILTER.assignedTo === "All" ? "selected" : ""}>All</option>
          <option value="unassigned" ${VEH_FILTER.assignedTo === "unassigned" ? "selected" : ""}>Unassigned</option>
          ${[...new Set(STATE.fleet.vehicles.filter((v?: any): any => v.assignedToType === 'person').map((v?: any): any => v.assignedTo))]
            .map((pid?: any): any => ({ pid, name: STATE.personnel.find((p?: any): any => p.id === pid)?.name } as any))
            .filter((p?: any): any => p.name)
            .sort((a?: any, b?: any): any => a.name.localeCompare(b.name))
            .map((p?: any): any => `<option value="person:${p.pid}" ${VEH_FILTER.assignedTo === ('person:' + p.pid) ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join('')}
          ${[...new Set(STATE.fleet.vehicles.filter((v?: any): any => v.assignedToType === 'unit').map((v?: any): any => v.assignedTo))]
            .sort((a?: any, b?: any): any => a.localeCompare(b))
            .map((u?: any): any => `<option value="unit:${escapeHtml(u)}" ${VEH_FILTER.assignedTo === ('unit:' + u) ? "selected" : ""}>${escapeHtml(u)} (Unit)</option>`).join('')}
        </select>
      </div>
      ${canAdd ? `<button class="btn btn-primary" id="btnAddVeh">${ICONS.plus} Add Vehicle</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>${headHtml}</tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Showing ${filtered.length} of ${STATE.fleet.vehicles.length} vehicles &bull; click a column header to sort, click a vehicle name for full history</div>
  `;
        (document as any).getElementById('vehSearch').addEventListener('input', (e?: any): any => { VEH_FILTER.q = e.target.value; renderVehicles(); refocusFilterInput('vehSearch'); });
        (document as any).getElementById('vehType').addEventListener('change', (e?: any): any => { VEH_FILTER.type = e.target.value; renderVehicles(); });
        (document as any).getElementById('vehLocation').addEventListener('change', (e?: any): any => { VEH_FILTER.location = e.target.value; renderVehicles(); });
        (document as any).getElementById('vehStatus').addEventListener('change', (e?: any): any => { VEH_FILTER.status = e.target.value; renderVehicles(); });
        (document as any).getElementById('vehAssignedTo').addEventListener('change', (e?: any): any => { VEH_FILTER.assignedTo = e.target.value; renderVehicles(); });
        const addBtn: any = (document as any).getElementById('btnAddVeh');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openVehicleModal(null));
        (document as any).querySelectorAll('[data-edit-veh]').forEach((b?: any): any => b.addEventListener('click', (): any => openVehicleModal(b.dataset.editVeh)));
        (document as any).querySelectorAll('[data-del-veh]').forEach((b?: any): any => b.addEventListener('click', (): any => deleteVehicle(b.dataset.delVeh)));
        (document as any).querySelectorAll('[data-open-veh]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openVehicleDetail(a.dataset.openVeh); }));
        wireSortHeaders('vehicles', renderVehicles);
    }
    function openVehicleModal(id?: any): any {
        const editing: any = !!id;
        const v: any = editing ? vehicleById(id) : {
            unitNumber: "", make: "", model: "", year: (new Date() as any).getFullYear(), vin: generateVin(), licensePlate: "",
            vehicleType: STATE.fleet.refData.vehicleTypes[0], status: "In Service", mileage: 0, fuelType: "Unleaded", currentFuelLevel: 100,
            purchaseDate: fmt(new Date() as any), inServiceDate: fmt(new Date() as any), agency: STATE.fleet.refData.agencies[0], location: STATE.fleet.refData.locations[0],
            isSharedAsset: false, assignedToType: null, assignedTo: null, equipmentChecklist: stdEquipmentChecklist(), photoDataUrl: null, notes: "", disposal: null
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? "Edit Vehicle" : "Add Vehicle"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Unit / Call Sign</label><input type="text" id="fUnitNumber" value="${escapeHtml(v.unitNumber)}" placeholder="e.g. Unit 14"></div>
        <div class="form-row"><label>License Plate</label><input type="text" id="fPlate" value="${escapeHtml(v.licensePlate)}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Make</label><input type="text" id="fMake" value="${escapeHtml(v.make)}"></div>
        <div class="form-row"><label>Model</label><input type="text" id="fModel" value="${escapeHtml(v.model)}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Year</label><input type="number" id="fYear" value="${v.year}"></div>
        <div class="form-row"><label>VIN</label>
          <div style="display:flex;gap:6px;">
            <input type="text" id="fVin" value="${escapeHtml(v.vin)}" style="flex:1;">
            <button type="button" class="btn btn-sm btn-outline" id="btnGenVin">Generate</button>
          </div>
          <div id="fVinWarning" style="color:var(--red);font-size:12px;margin-top:4px;display:none;">That VIN is already assigned to another vehicle.</div>
        </div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Vehicle Type</label><select id="fVehType">${STATE.fleet.refData.vehicleTypes.map((t?: any): any => `<option ${v.vehicleType === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fVehStatus">${VEHICLE_STATUSES.map((st?: any): any => `<option ${v.status === st ? "selected" : ""}>${st}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Mileage</label><input type="number" id="fMileage" value="${v.mileage}"></div>
        <div class="form-row"><label>Fuel Type</label><select id="fFuelType">${FUEL_TYPES.map((f?: any): any => `<option ${v.fuelType === f ? "selected" : ""}>${f}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><select id="fLocation">${STATE.fleet.refData.locations.map((l?: any): any => `<option ${v.location === l ? "selected" : ""}>${escapeHtml(l)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Agency</label><select id="fAgency">${STATE.fleet.refData.agencies.map((a?: any): any => `<option ${v.agency === a ? "selected" : ""}>${escapeHtml(a)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fIsShared" ${v.isSharedAsset ? 'checked' : ''} style="width:auto;">
          Shared task-force asset (visible to every agency regardless of role scope, e.g. joint SWAT/K9 vehicle)
        </label>
      </div>
      <div class="form-row"><label>Assign to</label>
        <select id="fAssignType">
          <option value="">Unassigned</option>
          <option value="person" ${v.assignedToType === 'person' ? 'selected' : ''}>Person</option>
          <option value="unit" ${v.assignedToType === 'unit' ? 'selected' : ''}>Unit / Team</option>
        </select>
      </div>
      <div class="form-row" id="fAssignTargetWrap">
        ${v.assignedToType === 'person'
            ? `<select id="fAssignTarget">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${v.assignedTo === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select>`
            : v.assignedToType === 'unit'
                ? `<select id="fAssignTarget">${(STATE.pm?.refData?.units || []).map((u?: any): any => `<option ${v.assignedTo === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}</select>`
                : `<input type="text" id="fAssignTarget" placeholder="Select a type above first" disabled>`}
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Purchase Date</label><input type="date" id="fPurchase" value="${v.purchaseDate}"></div>
        <div class="form-row"><label>In-Service Date</label><input type="date" id="fInService" value="${v.inServiceDate}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fNotes" rows="2">${escapeHtml(v.notes || "")}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing ? "Save Changes" : "Add Vehicle"}</button>
    </div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('btnGenVin').addEventListener('click', (): any => {
            (document as any).getElementById('fVin').value = generateVin();
            (document as any).getElementById('fVinWarning').style.display = 'none';
        });
        (document as any).getElementById('fVin').addEventListener('input', (e?: any): any => {
            const val: any = e.target.value.trim().toLowerCase();
            const dup: any = val && STATE.fleet.vehicles.some((x?: any): any => x.id !== v.id && x.vin.toLowerCase() === val);
            (document as any).getElementById('fVinWarning').style.display = dup ? '' : 'none';
        });
        (document as any).getElementById('fAssignType').addEventListener('change', (e?: any): any => {
            const t: any = e.target.value;
            const wrap: any = (document as any).getElementById('fAssignTargetWrap');
            if (t === 'person')
                wrap.innerHTML = `<select id="fAssignTarget">${STATE.personnel.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>`;
            else if (t === 'unit')
                wrap.innerHTML = `<select id="fAssignTarget">${(STATE.pm?.refData?.units || []).map((u?: any): any => `<option>${escapeHtml(u)}</option>`).join('')}</select>`;
            else
                wrap.innerHTML = `<input type="text" id="fAssignTarget" placeholder="Select a type above first" disabled>`;
        });
        (document as any).getElementById('mSave').onclick = (): any => {
            const unitNumber: any = (document as any).getElementById('fUnitNumber').value.trim();
            if (!unitNumber) {
                toast("Enter a unit number / call sign.", true);
                return;
            }
            const vin: any = (document as any).getElementById('fVin').value.trim();
            if (vin && STATE.fleet.vehicles.some((x?: any): any => x.id !== v.id && x.vin.toLowerCase() === vin.toLowerCase())) {
                toast("That VIN is already in use on another vehicle.", true);
                return;
            }
            const assignType: any = (document as any).getElementById('fAssignType').value || null;
            const assignTargetEl: any = (document as any).getElementById('fAssignTarget');
            const data: any = {
                unitNumber, make: (document as any).getElementById('fMake').value.trim(), model: (document as any).getElementById('fModel').value.trim(),
                year: Number((document as any).getElementById('fYear').value) || (new Date() as any).getFullYear(), vin, licensePlate: (document as any).getElementById('fPlate').value.trim(),
                vehicleType: (document as any).getElementById('fVehType').value, status: (document as any).getElementById('fVehStatus').value,
                mileage: Number((document as any).getElementById('fMileage').value) || 0, fuelType: (document as any).getElementById('fFuelType').value,
                location: (document as any).getElementById('fLocation').value, agency: (document as any).getElementById('fAgency').value,
                isSharedAsset: (document as any).getElementById('fIsShared').checked,
                assignedToType: assignType, assignedTo: assignType ? assignTargetEl.value : null,
                purchaseDate: (document as any).getElementById('fPurchase').value, inServiceDate: (document as any).getElementById('fInService').value,
                notes: (document as any).getElementById('fNotes').value
            } as any;
            if (editing) {
                Object.assign(v, data);
                logActivity(`${v.unitNumber} details updated.`, "vehicle", v.id);
                toast("Vehicle updated.");
            }
            else {
                const newVeh: any = { id: "veh" + Date.now(), currentFuelLevel: 100, equipmentChecklist: stdEquipmentChecklist(), photoDataUrl: null, disposal: null, ...data } as any;
                STATE.fleet.vehicles.push(newVeh);
                logActivity(`${newVeh.unitNumber} (${newVeh.make} ${newVeh.model}) added to fleet.`, "vehicle", newVeh.id);
                toast("Vehicle added to fleet.");
            }
            persist();
            closeModal();
            renderVehicles();
        };
    }
    function deleteVehicle(id?: any): any {
        const v: any = vehicleById(id);
        if (!confirm(`Delete "${v.unitNumber}" (${v.make} ${v.model}) from the fleet? This cannot be undone.`))
            return;
        STATE.fleet.vehicles = STATE.fleet.vehicles.filter((x?: any): any => x.id !== id);
        STATE.fleet.maintenance = STATE.fleet.maintenance.filter((m?: any): any => m.vehicleId !== id);
        STATE.fleet.inspections = STATE.fleet.inspections.filter((i?: any): any => i.vehicleId !== id);
        logActivity(`${v.unitNumber} deleted from fleet.`, "vehicle", id);
        persist();
        toast("Vehicle deleted.");
        renderVehicles();
    }
    /* ---------- Vehicle detail: overview / inspections / maintenance / equipment / activity ---------- */
    let VEH_DETAIL_TAB: any = 'overview';
    function openVehicleDetail(id?: any): any {
        const v: any = vehicleById(id);
        if (v && !canSeeVehicle(v)) {
            toast("This vehicle isn't visible to your current role.", true);
            return;
        }
        if (!SuiteUX.openRecord("fleet", "vehicle", id))
            return;
        VEH_DETAIL_TAB = 'overview';
        renderVehicleDetailModal(id);
    }
    function renderVehicleDetailModal(id?: any): any {
        const v: any = vehicleById(id);
        if (!v) {
            closeModal();
            return;
        }
        const tabs: any = [['overview', 'Overview'], ['inspections', 'Inspection History'], ['maintenance', 'Maintenance'], ['equipment', 'Equipment Checklist'], ['photos', 'Photos'], ['activity', 'Activity Log']];
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-wide';
        box.innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(v.unitNumber)} — ${escapeHtml(v.make)} ${escapeHtml(v.model)} (${v.year})</h3>
        <div class="mono" style="font-size:11.5px;color:var(--text-dim);">VIN ${v.vin} &bull; ${escapeHtml(v.licensePlate)}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid, label]: any): any => `<button class="btn btn-sm ${VEH_DETAIL_TAB === tid ? 'btn-primary' : 'btn-outline'}" data-veh-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="vehDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-veh-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { VEH_DETAIL_TAB = b.dataset.vehTab; renderVehicleDetailModal(id); }));
        renderVehDetailTabContent(v);
    }
    function renderVehDetailTabContent(v?: any): any {
        const body: any = (document as any).getElementById('vehDetailBody');
        const canOOS: any = can('fleet_maint_outofservice');
        const canEdit: any = can('fleet_vehicle_edit');
        if (VEH_DETAIL_TAB === 'overview') {
            body.innerHTML = `
      ${canEdit ? `<div style="margin-bottom:14px;"><button class="btn btn-sm btn-primary" id="btnEditFromDetail">${ICONS.edit} Edit Vehicle</button></div>` : ''}
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Vehicle Type</div><div class="v">${escapeHtml(v.vehicleType)}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClass(v.status)}">${v.status}</span></div></div>
        <div><div class="k">Mileage</div><div class="v">${v.mileage.toLocaleString()} mi</div></div>
        <div><div class="k">Fuel Type / Level</div><div class="v">${v.fuelType} &bull; ${v.currentFuelLevel}%</div></div>
        <div><div class="k">Location</div><div class="v">${escapeHtml(v.location)}</div></div>
        <div><div class="k">Agency</div><div class="v">${escapeHtml(v.agency)}</div></div>
        <div><div class="k">Assigned To</div><div class="v">${assignmentLabel(v)}</div></div>
        <div><div class="k">License Plate</div><div class="v">${escapeHtml(v.licensePlate)}</div></div>
        <div><div class="k">Purchase Date</div><div class="v">${v.purchaseDate}</div></div>
        <div><div class="k">In-Service Date</div><div class="v">${v.inServiceDate}</div></div>
      </div>
      ${v.disposal ? `
        <div class="panel" style="box-shadow:none;border-color:var(--callout-red-border);">
          <div class="panel-head" style="background:var(--callout-red-bg);"><h2 style="color:var(--red);">Disposal Record</h2></div>
          <div class="panel-body">
            <div class="detail-grid">
              <div><div class="k">Method</div><div class="v">${escapeHtml(v.disposal.method)}</div></div>
              <div><div class="k">Date</div><div class="v">${v.disposal.date}</div></div>
            </div>
            ${v.disposal.reason ? `<div style="margin-top:8px;font-size:13px;">${escapeHtml(v.disposal.reason)}</div>` : ''}
          </div>
        </div>
      ` : ''}
      ${v.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(v.notes)}</div></div>` : ''}
      ${canOOS && v.status !== "Out of Service" && v.status !== "Retired" ? `<button class="btn btn-danger btn-sm" id="btnMarkOOS">${ICONS.alert} Mark Out of Service</button>` : ''}
    `;
            const oosBtn: any = (document as any).getElementById('btnMarkOOS');
            if (oosBtn)
                oosBtn.addEventListener('click', (): any => {
                    v.status = 'Out of Service';
                    logActivity(`${v.unitNumber} marked out of service.`, "vehicle", v.id);
                    persist();
                    toast('Vehicle marked out of service.');
                    renderVehicleDetailModal(v.id);
                    if (ACTIVE_VIEW === 'fleet-vehicles')
                        renderVehicles();
                });
            const editFromDetailBtn: any = (document as any).getElementById('btnEditFromDetail');
            if (editFromDetailBtn)
                editFromDetailBtn.addEventListener('click', (): any => openVehicleModal(v.id));
        }
        else if (VEH_DETAIL_TAB === 'inspections') {
            const list: any = STATE.fleet.inspections.filter((i?: any): any => i.vehicleId === v.id &&
                (can('fleet_inspection_view_all') || i.personnelIds?.includes(CURRENT_USER_ID) || i.submittedByPersonId === CURRENT_USER_ID))
                .slice().sort((a?: any, b?: any): any => b.dateTime.localeCompare(a.dateTime));
            const rows: any = list.map((i?: any): any => `
      <tr>
        <td>${i.dateTime.replace('T', ' ')}</td>
        <td>${i.personnelIds.map((pid?: any): any => escapeHtml(personName(pid))).join(', ')}</td>
        <td>${escapeHtml(i.shift)}</td>
        <td>${i.fuelLevel}%</td>
        <td>${i.bodyDamage ? `<span class="badge badge-overdue">Damage noted</span>` : `<span class="badge badge-available">Clean</span>`}</td>
        <td><button class="btn btn-sm btn-outline" data-view-insp="${i.id}">View</button></td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No inspections recorded for this vehicle yet.</td></tr>`;
            body.innerHTML = `<table><thead><tr><th>Date/Time</th><th>Personnel</th><th>Shift</th><th>Fuel</th><th>Damage</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
            (document as any).querySelectorAll('[data-view-insp]').forEach((b?: any): any => b.addEventListener('click', (): any => viewInspectionDetail(b.dataset.viewInsp)));
        }
        else if (VEH_DETAIL_TAB === 'maintenance') {
            const canLog: any = can('fleet_maint_log');
            const canSchedule: any = can('fleet_maint_schedule');
            const list: any = STATE.fleet.maintenance.filter((m?: any): any => m.vehicleId === v.id).slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
            const rows: any = list.map((m?: any): any => `
      <tr>
        <td>${m.type}${m.isRecurring ? ` <span class="badge badge-role" title="Recurring">&#8635;</span>` : ''}</td>
        <td>${m.date}</td>
        <td>${m.vendorId ? escapeHtml(vendorName(m.vendorId)) : '—'}</td>
        <td>${money(m.cost)}</td>
        <td><span class="badge ${statusBadgeClass(m.status)}">${m.status}</span></td>
        <td style="max-width:180px;font-size:12px;color:var(--text-dim);">${escapeHtml(m.notes || '')}</td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No maintenance recorded for this vehicle yet.</td></tr>`;
            body.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        ${canLog ? `<button class="btn btn-sm btn-primary" id="btnLogMaint">${ICONS.plus} Log Maintenance</button>` : ''}
        ${canSchedule ? `<button class="btn btn-sm btn-outline" id="btnScheduleMaint">${ICONS.plus} Schedule Maintenance</button>` : ''}
      </div>
      <table><thead><tr><th>Type</th><th>Date</th><th>Vendor</th><th>Cost</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>
    `;
            const logBtn: any = (document as any).getElementById('btnLogMaint');
            if (logBtn)
                logBtn.addEventListener('click', (): any => openMaintenanceForm(v, false));
            const schedBtn: any = (document as any).getElementById('btnScheduleMaint');
            if (schedBtn)
                schedBtn.addEventListener('click', (): any => openMaintenanceForm(v, true));
        }
        else if (VEH_DETAIL_TAB === 'equipment') {
            const rows: any = (v.equipmentChecklist || []).map((e?: any, i?: any): any => `
      <tr>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.present ? `<span class="badge badge-available">Present</span>` : `<span class="badge badge-missing">Missing</span>`}</td>
        <td>${escapeHtml(e.condition || '')}</td>
        <td>${canEdit ? `<button class="btn btn-sm btn-outline" data-toggle-equip="${i}">${e.present ? 'Mark Missing' : 'Mark Present'}</button>` : ''}</td>
      </tr>`).join('');
            body.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">This checklist is captured fresh on every inspection. Toggling here updates the vehicle's current record between inspections (e.g. equipment pulled for another vehicle).</div>
      <table><thead><tr><th>Equipment</th><th>Status</th><th>Condition</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    `;
            (document as any).querySelectorAll('[data-toggle-equip]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const idx: any = Number(b.dataset.toggleEquip);
                v.equipmentChecklist[idx].present = !v.equipmentChecklist[idx].present;
                logActivity(`${v.unitNumber}: ${v.equipmentChecklist[idx].name} marked ${v.equipmentChecklist[idx].present ? 'present' : 'missing'}.`, "vehicle", v.id);
                persist();
                renderVehDetailTabContent(v);
                if (ACTIVE_VIEW === 'fleet-dashboard')
                    renderDashboard();
            }));
        }
        else if (VEH_DETAIL_TAB === 'photos') {
            if (!v.photos)
                v.photos = [];
            const canManage: any = can('fleet_vehicle_edit');
            body.innerHTML = photoManagerHtml(v.photos, 'fleetVeh', canManage);
            wirePhotoManager('vehDetailBody', v.photos, 'fleetVeh', canManage, (action?: any): any => {
                logActivity(`${action === 'add' ? 'Added a photo to' : action === 'remove' ? 'Removed a photo from' : 'Updated a photo description on'} ${v.unitNumber}.`, "vehicle", v.id);
                persist();
                renderVehDetailTabContent(v);
            });
        }
        else if (VEH_DETAIL_TAB === 'activity') {
            const list: any = STATE.fleet.activity.filter((a?: any): any => a.entityId === v.id).slice().reverse();
            const rows: any = list.map((a?: any): any => `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <div class="mono" style="width:80px;flex-shrink:0;color:var(--text-dim);font-size:11.5px;">${a.ts}</div>
        <div style="font-size:13px;">${escapeHtml(a.text)}</div>
      </div>`).join('') || `<div style="text-align:center;color:var(--text-dim);padding:16px;">No activity recorded for this vehicle yet.</div>`;
            body.innerHTML = rows;
        }
    }
    /* =========================================================================
       MAINTENANCE (fleet-wide view)
       ========================================================================= */
    let MAINT_FILTER: any = { status: "All" } as any;
    function renderMaintenanceView(): any {
        if (!can('fleet_vehicle_view')) {
            (document as any).getElementById('view-fleet-maintenance').innerHTML = permissionBlockedView("You don't have permission to view maintenance records in this role.");
            return;
        }
        const canLog: any = can('fleet_maint_log');
        const canSchedule: any = can('fleet_maint_schedule');
        const filtered: any = STATE.fleet.maintenance.filter((m?: any): any => MAINT_FILTER.status === "All" || m.status === MAINT_FILTER.status);
        const s: any = SORT.maintenance;
        const sortVal: any = (m?: any, key?: any): any => {
            if (key === 'vehicle')
                return vehicleById(m.vehicleId).unitNumber.toLowerCase();
            return typeof m[key] === 'string' ? m[key].toLowerCase() : m[key];
        };
        filtered.sort((a?: any, b?: any): any => {
            const av: any = sortVal(a, s.key), bv: any = sortVal(b, s.key);
            if (av < bv)
                return s.dir === 'asc' ? -1 : 1;
            if (av > bv)
                return s.dir === 'asc' ? 1 : -1;
            return 0;
        });
        const openCount: any = STATE.fleet.maintenance.filter((m?: any): any => m.status === "Open").length;
        const scheduledCount: any = STATE.fleet.maintenance.filter((m?: any): any => m.status === "Scheduled").length;
        const totalCost: any = STATE.fleet.maintenance.filter((m?: any): any => m.status === "Completed").reduce((sum?: any, m?: any): any => sum + m.cost, 0);
        const rows: any = filtered.map((m?: any): any => {
            const v: any = vehicleById(m.vehicleId);
            return `<tr>
      <td>${vehicleLink(v)}</td>
      <td>${m.type}</td>
      <td>${m.date}</td>
      <td>${m.vendorId ? escapeHtml(vendorName(m.vendorId)) : '—'}</td>
      <td>${money(m.cost)}</td>
      <td><span class="badge ${statusBadgeClass(m.status)}">${m.status}</span></td>
      <td>
        ${(canLog || canSchedule) && m.status !== "Completed" ? `<button class="btn btn-sm btn-outline" data-complete-maint="${m.id}">Mark Completed</button>` : ""}
      </td>
    </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No maintenance records match this filter.</td></tr>`;
        (document as any).getElementById('view-fleet-maintenance').innerHTML = `
    <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
      <div class="stat-card"><div class="label">Open Repairs</div><div class="value" style="color:${openCount ? 'var(--red)' : 'var(--navy)'}">${openCount}</div></div>
      <div class="stat-card"><div class="label">Scheduled</div><div class="value">${scheduledCount}</div></div>
      <div class="stat-card"><div class="label">Completed Maintenance Cost (all time)</div><div class="value">${money(totalCost)}</div></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select id="maintStatusFleet" title="Filter maintenance records to a single status">
          <option ${MAINT_FILTER.status === "All" ? "selected" : ""}>All</option>
          ${["Open", "Scheduled", "Completed"].map((st?: any): any => `<option ${MAINT_FILTER.status === st ? "selected" : ""}>${st}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        ${canLog ? `<button class="btn btn-outline" id="btnGlobalLogFleet">${ICONS.plus} Log Maintenance</button>` : ""}
        ${canSchedule ? `<button class="btn btn-primary" id="btnGlobalScheduleFleet">${ICONS.plus} Schedule Maintenance</button>` : ""}
      </div>
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Vehicle', 'maintenance', 'vehicle')}
          ${sortHeaderHtml('Type', 'maintenance', 'type')}
          ${sortHeaderHtml('Date', 'maintenance', 'date')}
          <th>Vendor</th>
          ${sortHeaderHtml('Cost', 'maintenance', 'cost')}
          ${sortHeaderHtml('Status', 'maintenance', 'status')}
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('maintStatusFleet').addEventListener('change', (e?: any): any => { MAINT_FILTER.status = e.target.value; renderMaintenanceView(); });
        wireVehicleLinks();
        (document as any).querySelectorAll('[data-complete-maint]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const rec: any = STATE.fleet.maintenance.find((m?: any): any => m.id === b.dataset.completeMaint);
            rec.status = "Completed";
            rec.date = fmt(new Date() as any);
            const v: any = vehicleById(rec.vehicleId);
            rec.mileageAtService = v.mileage;
            if (v.status === "In Maintenance")
                v.status = "In Service";
            if (rec.isRecurring && (rec.intervalDays || rec.intervalMiles)) {
                STATE.fleet.maintenance.push({
                    id: 'm' + Date.now(), vehicleId: v.id, type: rec.type,
                    date: rec.intervalDays ? fmt(addDays(new Date() as any, rec.intervalDays)) : fmt(addDays(new Date() as any, 90)),
                    vendorId: rec.vendorId, laborCost: 0, partsCost: 0, cost: 0, mileageAtService: v.mileage,
                    status: 'Scheduled', notes: `Auto-scheduled follow-up${rec.intervalDays ? ` (every ${rec.intervalDays} days)` : ''}${rec.intervalMiles ? ` (every ${rec.intervalMiles} mi)` : ''}.`,
                    isRecurring: true, intervalDays: rec.intervalDays || null, intervalMiles: rec.intervalMiles || null
                } as any);
                logActivity(`${v.unitNumber}: next ${rec.type.toLowerCase()} auto-scheduled.`, "maintenance", v.id);
            }
            logActivity(`Maintenance marked completed for ${v.unitNumber} (${rec.type}).`, "maintenance", v.id);
            persist();
            toast(rec.isRecurring ? "Marked completed \u2014 next occurrence auto-scheduled." : "Marked completed.");
            renderMaintenanceView();
        }));
        const gLog: any = (document as any).getElementById('btnGlobalLogFleet');
        if (gLog)
            gLog.addEventListener('click', (): any => openMaintenanceFormGlobal(false));
        const gSched: any = (document as any).getElementById('btnGlobalScheduleFleet');
        if (gSched)
            gSched.addEventListener('click', (): any => openMaintenanceFormGlobal(true));
        wireSortHeaders('maintenance', renderMaintenanceView);
    }
    function maintenanceFormFields(v?: any, isSchedule?: any, prefillVehicleSelect?: any): any {
        return `
    ${prefillVehicleSelect ? `<div class="form-row"><label>Vehicle</label>
      <select id="fMVehicle">${STATE.fleet.vehicles.map((x?: any): any => `<option value="${x.id}">${escapeHtml(x.unitNumber)} — ${escapeHtml(x.make)} ${escapeHtml(x.model)}</option>`).join('')}</select>
    </div>` : `<div class="form-row"><label>Vehicle</label><input type="text" value="${escapeHtml(v.unitNumber)} (${escapeHtml(v.make)} ${escapeHtml(v.model)})" disabled></div>`}
    <div class="form-2col">
      <div class="form-row"><label>Type</label><select id="fMType">${STATE.fleet.refData.maintenanceTypes.map((t?: any): any => `<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-row"><label>${isSchedule ? 'Scheduled for' : 'Date performed'}</label><input type="date" id="fMDate" value="${isSchedule ? fmt(addDays(new Date() as any, 14)) : fmt(new Date() as any)}"></div>
    </div>
    <div class="form-row"><label>Vendor</label><select id="fMVendor"><option value="">— none / in-house —</option>${STATE.fleet.refData.vendors.map((ve?: any): any => `<option value="${ve.id}">${escapeHtml(ve.name)}</option>`).join('')}</select></div>
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
    <div class="form-2col" id="fMIntervalWrap" style="display:none;">
      <div class="form-row"><label>Repeat every (days, optional)</label><input type="number" id="fMIntervalDays" placeholder="e.g. 180"></div>
      <div class="form-row"><label>Repeat every (miles, optional)</label><input type="number" id="fMIntervalMiles" placeholder="e.g. 5000"></div>
    </div>
    <div class="form-row"><label>Notes</label><textarea id="fMNotes" rows="2" placeholder="What was done or why it's needed"></textarea></div>
  `;
    }
    function wireMaintenanceFormCommon(): any {
        const rec: any = (document as any).getElementById('fMRecurring');
        if (rec)
            rec.addEventListener('change', (e?: any): any => {
                (document as any).getElementById('fMIntervalWrap').style.display = e.target.checked ? '' : 'none';
            });
    }
    function collectMaintenanceFormData(vehicleId?: any, isSchedule?: any): any {
        const isRecurring: any = (document as any).getElementById('fMRecurring').checked;
        const laborCost: any = Number((document as any).getElementById('fMLabor').value) || 0;
        const partsCost: any = Number((document as any).getElementById('fMParts').value) || 0;
        const v: any = vehicleById(vehicleId);
        return {
            id: 'm' + Date.now(), vehicleId,
            type: (document as any).getElementById('fMType').value,
            date: (document as any).getElementById('fMDate').value,
            vendorId: (document as any).getElementById('fMVendor').value || null,
            laborCost, partsCost, cost: laborCost + partsCost,
            mileageAtService: v ? v.mileage : null,
            status: isSchedule ? 'Scheduled' : 'Completed',
            notes: (document as any).getElementById('fMNotes').value.trim(),
            isRecurring,
            intervalDays: isRecurring ? (Number((document as any).getElementById('fMIntervalDays').value) || null) : null,
            intervalMiles: isRecurring ? (Number((document as any).getElementById('fMIntervalMiles').value) || null) : null
        } as any;
    }
    function openMaintenanceForm(v?: any, isSchedule?: any): any {
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal';
        box.innerHTML = `
    <div class="modal-head"><h3>${isSchedule ? 'Schedule Maintenance' : 'Log Maintenance'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">${maintenanceFormFields(v, isSchedule, false)}</div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${isSchedule ? 'Schedule' : 'Save Record'}</button>
    </div>
  `;
        openModal();
        wireMaintenanceFormCommon();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const rec: any = collectMaintenanceFormData(v.id, isSchedule);
            STATE.fleet.maintenance.push(rec);
            logActivity(isSchedule ? `Maintenance scheduled for ${v.unitNumber} on ${rec.date}.` : `Maintenance logged for ${v.unitNumber}: ${rec.notes || rec.type}.`, "maintenance", v.id);
            if (!isSchedule && v.status === "In Service" && rec.type === "Repair") { /* leave status as-is; explicit OOS is a separate action */ }
            persist();
            toast(isSchedule ? 'Maintenance scheduled.' : 'Maintenance logged.');
            VEH_DETAIL_TAB = 'maintenance';
            renderVehicleDetailModal(v.id);
            if (ACTIVE_VIEW === 'fleet-dashboard')
                renderDashboard();
        };
    }
    function openMaintenanceFormGlobal(isSchedule?: any): any {
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal';
        box.innerHTML = `
    <div class="modal-head"><h3>${isSchedule ? 'Schedule Maintenance' : 'Log Maintenance'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">${maintenanceFormFields(null, isSchedule, true)}</div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${isSchedule ? 'Schedule' : 'Save Record'}</button>
    </div>
  `;
        openModal();
        wireMaintenanceFormCommon();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const vehicleId: any = (document as any).getElementById('fMVehicle').value;
            const v: any = vehicleById(vehicleId);
            const rec: any = collectMaintenanceFormData(vehicleId, isSchedule);
            STATE.fleet.maintenance.push(rec);
            logActivity(isSchedule ? `Maintenance scheduled for ${v.unitNumber} on ${rec.date}.` : `Maintenance logged for ${v.unitNumber}: ${rec.notes || rec.type}.`, "maintenance", v.id);
            persist();
            toast(isSchedule ? 'Maintenance scheduled.' : 'Maintenance logged.');
            closeModal();
            renderMaintenanceView();
        };
    }
    /* =========================================================================
       VEHICLE INSPECTIONS
       ========================================================================= */
    let INSP_FILTER: any = { vehicle: "All", personnel: "All", dateFrom: "", dateTo: "" } as any;
    function renderInspections(): any {
        const canConduct: any = can('fleet_inspection_conduct');
        const canViewAll: any = can('fleet_inspection_view_all');
        if (!canViewAll && !canConduct) {
            (document as any).getElementById('view-fleet-inspections').innerHTML = permissionBlockedView("You don't have permission to view vehicle inspections in this role.");
            return;
        }
        const visibleIds: any = new Set(visibleVehicles().map((v?: any): any => v.id));
        const filtered: any = STATE.fleet.inspections.filter((i?: any): any => {
            if (!visibleIds.has(i.vehicleId))
                return false;
            if (!canViewAll && !i.personnelIds?.includes(CURRENT_USER_ID) && i.submittedByPersonId !== CURRENT_USER_ID)
                return false;
            const matchVeh: any = INSP_FILTER.vehicle === "All" || i.vehicleId === INSP_FILTER.vehicle;
            const matchPerson: any = INSP_FILTER.personnel === "All" || i.personnelIds.includes(INSP_FILTER.personnel);
            const d: any = i.dateTime.slice(0, 10);
            const matchFrom: any = !INSP_FILTER.dateFrom || d >= INSP_FILTER.dateFrom;
            const matchTo: any = !INSP_FILTER.dateTo || d <= INSP_FILTER.dateTo;
            return matchVeh && matchPerson && matchFrom && matchTo;
        }).slice().sort((a?: any, b?: any): any => b.dateTime.localeCompare(a.dateTime));
        const rows: any = filtered.map((i?: any): any => {
            const v: any = vehicleById(i.vehicleId);
            return `<tr>
      <td>${i.dateTime.replace('T', ' ')}</td>
      <td>${vehicleLink(v)}</td>
      <td>${i.personnelIds.map((pid?: any): any => escapeHtml(personName(pid))).join(', ')}</td>
      <td>${escapeHtml(i.shift)}</td>
      <td>${i.fuelLevel}%</td>
      <td>${i.bodyDamage ? `<span class="badge badge-overdue">Damage noted</span>` : `<span class="badge badge-available">Clean</span>`}</td>
      <td><button class="btn btn-sm btn-outline" data-view-insp="${i.id}">View</button></td>
    </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No inspections match this filter.</td></tr>`;
        (document as any).getElementById('view-fleet-inspections').innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <select id="inspVehicle"><option value="All">All Vehicles</option>${visibleVehicles().map((v?: any): any => `<option value="${v.id}" ${INSP_FILTER.vehicle === v.id ? 'selected' : ''}>${escapeHtml(v.unitNumber)}</option>`).join('')}</select>
        <select id="inspPersonnel"><option value="All">All Personnel</option>${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${INSP_FILTER.personnel === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select>
        <input type="date" id="inspFrom" value="${INSP_FILTER.dateFrom}" title="From date">
        <input type="date" id="inspTo" value="${INSP_FILTER.dateTo}" title="To date">
      </div>
      ${canConduct ? `<button class="btn btn-primary" id="btnNewInspection">${ICONS.plus} New Inspection</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Date/Time</th><th>Vehicle</th><th>Personnel</th><th>Shift</th><th>Fuel</th><th>Damage</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${filtered.length} of ${STATE.fleet.inspections.length} inspections</div>
  `;
        ['inspVehicle', 'inspPersonnel', 'inspFrom', 'inspTo'].forEach((id?: any): any => {
            (document as any).getElementById(id).addEventListener('change', (e?: any): any => {
                const key: any = ({ inspVehicle: 'vehicle', inspPersonnel: 'personnel', inspFrom: 'dateFrom', inspTo: 'dateTo' } as any)[id];
                INSP_FILTER[key] = e.target.value;
                renderInspections();
            });
        });
        const newBtn: any = (document as any).getElementById('btnNewInspection');
        if (newBtn)
            newBtn.addEventListener('click', (): any => openNewInspectionModal());
        wireVehicleLinks();
        (document as any).querySelectorAll('[data-view-insp]').forEach((b?: any): any => b.addEventListener('click', (): any => viewInspectionDetail(b.dataset.viewInsp)));
    }
    /* ---------- New Inspection: mobile-optimized single-column flow ----------
       This form is intentionally single-column with large touch targets so it
       works as-is on a phone browser, standing in for the "mobile application"
       requirement. A native app would call the same underlying record shape. */
    function openNewInspectionModal(prefillVehicleId?: any): any {
        if (!can('fleet_inspection_conduct'))
            return toast('Your role cannot conduct vehicle inspections.', true);
        const available: any = visibleVehicles();
        if (!available.length)
            return toast('No vehicles are visible to this role. Check the Fleet vehicle visibility and unit scope abilities.', true);
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-wide';
        const equipRows: any = EQUIPMENT_CATALOG.map((name?: any, i?: any): any => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      <div style="flex:1;min-width:160px;font-size:13.5px;font-weight:600;">${escapeHtml(name)}</div>
      <label class="switch"><input type="checkbox" class="insp-equip-present" data-equip-idx="${i}" checked><span class="slider"></span></label>
      <select class="insp-equip-condition" data-equip-idx="${i}" style="width:140px;">${CONDITIONS.map((c?: any): any => `<option>${c}</option>`).join('')}</select>
    </div>
  `).join('');
        box.innerHTML = `
    <div class="modal-head"><h3>New Vehicle Inspection</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body" style="max-width:520px;margin:0 auto;">
      <div class="form-row"><label>Vehicle</label>
        <select id="fIVehicle">${available.map((v?: any): any => `<option value="${v.id}" ${prefillVehicleId === v.id ? 'selected' : ''}>${escapeHtml(v.unitNumber)} — ${escapeHtml(v.make)} ${escapeHtml(v.model)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Inspection Date</label><input type="date" id="fIDate" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>Time</label><input type="time" id="fITime" value="${(new Date() as any).toTimeString().slice(0, 5)}"></div>
      </div>
      <div class="form-row"><label>Shift</label><select id="fIShift">${SHIFTS.map((s?: any): any => `<option>${s}</option>`).join('')}</select></div>
      <div class="form-row"><label>Personnel Performing Inspection</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:140px;overflow-y:auto;">
          ${(can('fleet_inspection_view_all') ? STATE.personnel : STATE.personnel.filter((p?: any): any => p.id === CURRENT_USER_ID)).map((p?: any): any => `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;"><input type="checkbox" class="insp-person" value="${p.id}" ${CURRENT_USER_ID === p.id ? 'checked' : ''} ${can('fleet_inspection_view_all') ? '' : 'disabled'} style="width:auto;">${escapeHtml(p.name)}</label>`).join('')}
        </div>
      </div>
      <div class="form-row"><label>Current Mileage</label><input type="number" id="fIMileage" value=""></div>
      <div class="form-2col">
        <div class="form-row"><label>Fuel Level (%)</label><input type="number" id="fIFuel" value="100" min="0" max="100"></div>
        <div class="form-row"><label>Gallons of Fuel Added</label><input type="number" id="fIGallons" value="0" step="0.1"></div>
      </div>
      <div class="form-row"><label>Quarts of Oil Added</label><input type="number" id="fIQuarts" value="0" step="0.5"></div>

      <div class="panel" style="box-shadow:none;">
        <div class="panel-head"><h2>Equipment Condition</h2></div>
        <div class="panel-body">
          ${equipRows}
          <div class="form-row" style="margin-top:10px;"><label>Equipment Comments</label><textarea id="fIEquipComments" rows="2" placeholder="Optional"></textarea></div>
        </div>
      </div>

      <div class="form-2col">
        <div class="form-row"><label>Vehicle Condition</label><select id="fIVehCondition">${CONDITIONS.map((c?: any): any => `<option>${c}</option>`).join('')}</select></div>
        <div class="form-row"><label>Cleanliness</label><select id="fICleanliness">${CONDITIONS.map((c?: any): any => `<option>${c}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Vehicle Condition Comments</label><textarea id="fIConditionComments" rows="2" placeholder="Optional"></textarea></div>
      <div class="form-row"><label>Cleanliness Comments</label><textarea id="fICleanlinessComments" rows="2" placeholder="Optional"></textarea></div>

      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
          <input type="checkbox" id="fIBodyDamage" style="width:auto;">
          Body damage noted
        </label>
      </div>
      <div class="form-row" id="fIDamageWrap" style="display:none;">
        <label>Body Damage Comments</label><textarea id="fIDamageComments" rows="2" placeholder="Describe location and extent of damage"></textarea>
      </div>

      <div class="form-row"><label>Narrative / Comments</label><textarea id="fINarrative" rows="3" placeholder="Anything else worth noting"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Submit Inspection</button>
    </div>
  `;
        const vSel: any = (document as any).getElementById('fIVehicle');
        const setMileageDefault: any = (): any => {
            const v: any = vehicleById(vSel.value);
            (document as any).getElementById('fIMileage').value = v ? v.mileage : '';
            (document as any).getElementById('fIFuel').value = v ? v.currentFuelLevel : 100;
        };
        openModal();
        setMileageDefault();
        vSel.addEventListener('change', setMileageDefault);
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fIBodyDamage').addEventListener('change', (e?: any): any => {
            (document as any).getElementById('fIDamageWrap').style.display = e.target.checked ? '' : 'none';
        });
        let inspectionAttemptId: any = null;
        (document as any).getElementById('mSave').onclick = async (): Promise<any> => {
            const vehicleId: any = vSel.value;
            const v: any = available.find((item?: any): any => item.id === vehicleId);
            if (!v)
                return toast('This vehicle is no longer available for inspection.', true);
            const personnelIds: any = Array.from((document as any).querySelectorAll('.insp-person:checked')).map((el?: any): any => el.value);
            if (personnelIds.length === 0) {
                toast("Select at least one person performing the inspection.", true);
                return;
            }
            const equipmentChecklist: any = EQUIPMENT_CATALOG.map((name?: any, i?: any): any => ({
                name,
                required: true,
                present: (document as any).querySelector(`.insp-equip-present[data-equip-idx="${i}"]`).checked,
                condition: (document as any).querySelector(`.insp-equip-condition[data-equip-idx="${i}"]`).value
            } as any));
            const bodyDamage: any = (document as any).getElementById('fIBodyDamage').checked;
            const inspection: any = {
                id: 'insp' + Date.now(), vehicleId,
                dateTime: (document as any).getElementById('fIDate').value + 'T' + (document as any).getElementById('fITime').value,
                personnelIds, shift: (document as any).getElementById('fIShift').value,
                fuelLevel: Number((document as any).getElementById('fIFuel').value) || 0,
                gallonsAdded: Number((document as any).getElementById('fIGallons').value) || 0,
                quartsOilAdded: Number((document as any).getElementById('fIQuarts').value) || 0,
                mileageAtInspection: Number((document as any).getElementById('fIMileage').value) || v.mileage,
                equipmentChecklist,
                equipmentComments: (document as any).getElementById('fIEquipComments').value.trim(),
                vehicleCondition: (document as any).getElementById('fIVehCondition').value,
                vehicleConditionComments: (document as any).getElementById('fIConditionComments').value.trim(),
                cleanliness: (document as any).getElementById('fICleanliness').value,
                cleanlinessComments: (document as any).getElementById('fICleanlinessComments').value.trim(),
                bodyDamage,
                bodyDamageComments: bodyDamage ? (document as any).getElementById('fIDamageComments').value.trim() : '',
                narrative: (document as any).getElementById('fINarrative').value.trim(),
                submittedByRoleId: primaryRoleId()
            } as any;
            if (SuiteStore.mode() === 'shared') {
                const button: any = (document as any).getElementById('mSave');
                button.disabled = true;
                let saved: any = false;
                try {
                    if (SuiteStore.pending() && !await SuiteStore.flush())
                        throw Error('Save pending changes before submitting this inspection.');
                    const { tenantId, agencyId }: any = SuiteStore.remoteContext();
                    inspectionAttemptId = inspectionAttemptId || crypto.randomUUID();
                    const { error }: any = await backendClient.rpc('suite_submit_vehicle_inspection', {
                        p_tenant: tenantId, p_agency: agencyId, p_client_id: inspectionAttemptId, p_inspection: inspection
                    } as any);
                    if (error)
                        throw error;
                    saved = true;
                    await SuiteStore.loadRemoteContext(tenantId, agencyId);
                    inspectionAttemptId = null;
                    closeModal();
                    toast('Inspection submitted.');
                    renderInspections();
                }
                catch (error: any) {
                    toast(saved ? 'Inspection saved, but the display could not refresh. Reopen the workspace to see it.' : (error.message || 'Inspection could not be saved.'), true);
                }
                finally {
                    button.disabled = false;
                }
                return;
            }
            STATE.fleet.inspections.push(inspection);
            // an inspection is the source of truth for the vehicle's live state
            v.mileage = Math.max(v.mileage, inspection.mileageAtInspection);
            v.currentFuelLevel = inspection.fuelLevel;
            v.equipmentChecklist = equipmentChecklist;
            logActivity(`Inspection completed on ${v.unitNumber} by ${personnelIds.map((pid?: any): any => personName(pid)).join(', ')}.`, "inspection", v.id);
            if (bodyDamage) {
                STATE.fleet.maintenance.push({
                    id: 'm' + Date.now(), vehicleId: v.id, type: "Body Work", date: fmt(new Date() as any),
                    vendorId: null, laborCost: 0, partsCost: 0, cost: 0, mileageAtService: v.mileage,
                    status: "Open", notes: `Body damage reported during inspection: ${inspection.bodyDamageComments}`,
                    isRecurring: false, intervalDays: null, intervalMiles: null
                } as any);
                logActivity(`${v.unitNumber}: body work ticket auto-created from inspection damage report.`, "maintenance", v.id);
            }
            persist();
            toast("Inspection submitted.");
            closeModal();
            if (ACTIVE_VIEW === 'fleet-inspections')
                renderInspections();
            if (ACTIVE_VIEW === 'fleet-dashboard')
                renderDashboard();
            if (ACTIVE_VIEW === 'fleet-vehicles')
                renderVehicles();
        };
    }
    function viewInspectionDetail(id?: any): any {
        const i: any = STATE.fleet.inspections.find((x?: any): any => x.id === id);
        if (!i || (!can('fleet_inspection_view_all') && !i.personnelIds?.includes(CURRENT_USER_ID) && i.submittedByPersonId !== CURRENT_USER_ID))
            return toast('This inspection is not visible to your role.', true);
        const v: any = vehicleById(i.vehicleId);
        if (!v || !canSeeVehicle(v))
            return toast('This vehicle is not visible to your role.', true);
        const equipRows: any = (i.equipmentChecklist || []).map((e?: any): any => `
    <tr><td>${escapeHtml(e.name)}</td><td>${e.present ? `<span class="badge badge-available">Present</span>` : `<span class="badge badge-missing">Missing</span>`}</td><td>${escapeHtml(e.condition)}</td></tr>
  `).join('');
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">Inspection — ${escapeHtml(v.unitNumber)}</h3>
        <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${i.dateTime.replace('T', ' ')}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Personnel</div><div class="v">${i.personnelIds.map((pid?: any): any => escapeHtml(personName(pid))).join(', ')}</div></div>
        <div><div class="k">Shift</div><div class="v">${escapeHtml(i.shift)}</div></div>
        <div><div class="k">Mileage</div><div class="v">${i.mileageAtInspection.toLocaleString()} mi</div></div>
        <div><div class="k">Fuel Level</div><div class="v">${i.fuelLevel}%</div></div>
        <div><div class="k">Gallons Added</div><div class="v">${i.gallonsAdded}</div></div>
        <div><div class="k">Quarts Oil Added</div><div class="v">${i.quartsOilAdded}</div></div>
        <div><div class="k">Vehicle Condition</div><div class="v">${escapeHtml(i.vehicleCondition)}</div></div>
        <div><div class="k">Cleanliness</div><div class="v">${escapeHtml(i.cleanliness)}</div></div>
      </div>
      ${i.vehicleConditionComments ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Condition Comments</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.vehicleConditionComments)}</div></div>` : ''}
      ${i.cleanlinessComments ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Cleanliness Comments</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.cleanlinessComments)}</div></div>` : ''}
      <div class="panel" style="box-shadow:none;${i.bodyDamage ? 'border-color:var(--callout-red-border);' : ''}">
        <div class="panel-head" style="${i.bodyDamage ? 'background:var(--callout-red-bg);' : ''}"><h2 style="${i.bodyDamage ? 'color:var(--red);' : ''}">Body Damage</h2></div>
        <div class="panel-body" style="font-size:13px;">${i.bodyDamage ? escapeHtml(i.bodyDamageComments || 'Noted, no further comments.') : 'None noted.'}</div>
      </div>
      <div class="panel" style="box-shadow:none;">
        <div class="panel-head"><h2>Equipment Checklist</h2></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Equipment</th><th>Status</th><th>Condition</th></tr></thead><tbody>${equipRows}</tbody></table>
          ${i.equipmentComments ? `<div style="padding:10px 14px;font-size:13px;">${escapeHtml(i.equipmentComments)}</div>` : ''}
        </div>
      </div>
      ${i.narrative ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Narrative</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.narrative)}</div></div>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
    }
    /* =========================================================================
       ROLES & ABILITIES
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
            SELECTED_ROLE_ID = STATE.currentRoleId;
        const roleListHtml: any = STATE.roles.map((r?: any): any => `
    <div class="role-list-item ${r.id === SELECTED_ROLE_ID ? 'active' : ''}" data-select-role="${r.id}">
      <div>
        <div class="name">${escapeHtml(r.name)}</div>
        <div class="count">${countAbilities(r)} of ${ALL_ABILITY_IDS.length} abilities</div>
      </div>
      ${r.locked ? ICONS.lock : ""}
    </div>
  `).join('');
        const selRole: any = STATE.roles.find((r?: any): any => r.id === SELECTED_ROLE_ID) || STATE.roles[0];
        const agencyScopeHtml: any = `
    <div class="ability-group">
      <h3>Agency Visibility</h3>
      <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:8px;">Leave everything unchecked to see all agencies. Check specific agencies to restrict this role to only their vehicles (shared task-force assets remain visible regardless).</div>
      ${STATE.fleet.refData.agencies.map((a?: any): any => `
        <div class="ability-row">
          <div class="lbl">${escapeHtml(a)}</div>
          <label class="switch">
            <input type="checkbox" data-agency-scope="${escapeHtml(a)}" ${selRole.agencyScope.includes(a) ? 'checked' : ''} ${!canManage ? 'disabled' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `;
        const groupsHtml: any = (Object.entries(ABILITY_CATALOG) as any).map(([group, abilities]: any): any => `
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
        (document as any).getElementById('view-roles').innerHTML = `
    ${!canManage ? lockedNote("You're viewing role definitions in read-only mode. Switch to Fleet Admin to edit abilities.") : ""}
    <div class="toolbar">
      <div></div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddRole">${ICONS.plus} New Role</button>` : ""}
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
        <div class="panel-body">
          ${agencyScopeHtml}
          ${groupsHtml}
        </div>
      </div>
    </div>
  `;
        (document as any).querySelectorAll('[data-select-role]').forEach((el?: any): any => {
            el.addEventListener('click', (): any => { SELECTED_ROLE_ID = el.dataset.selectRole; renderRoles(); });
        });
        if (canManage) {
            (document as any).querySelectorAll('[data-ability]').forEach((chk?: any): any => {
                chk.addEventListener('change', (): any => {
                    selRole.abilities[chk.dataset.ability] = chk.checked;
                    persist();
                    renderRoles();
                    if (selRole.id === STATE.currentRoleId) {
                        (document as any).getElementById('abilityCountPill').textContent = countAbilities(selRole) + " abilities";
                    }
                });
            });
            (document as any).querySelectorAll('[data-agency-scope]').forEach((chk?: any): any => {
                chk.addEventListener('change', (): any => {
                    const agency: any = chk.dataset.agencyScope;
                    if (chk.checked) {
                        if (!selRole.agencyScope.includes(agency))
                            selRole.agencyScope.push(agency);
                    }
                    else {
                        selRole.agencyScope = selRole.agencyScope.filter((a?: any): any => a !== agency);
                    }
                    logActivity(`Updated agency visibility scope for role "${selRole.name}".`, "admin");
                    persist();
                    toast("Agency scope updated.");
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
        }
    }
    function openAddRoleModal(existing?: any): any {
        const editing: any = !!existing;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? "Rename Role" : "Create New Role"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Role name</label><input type="text" id="fRoleName" value="${editing ? escapeHtml(existing.name) : ''}" placeholder="e.g. Motor Pool Clerk"></div>
      <div class="form-row"><label>Description</label><textarea id="fRoleDesc" rows="2" placeholder="What is this role for?">${editing ? escapeHtml(existing.description || '') : ''}</textarea></div>
      ${!editing ? `<div class="form-row"><label>Start from</label>
        <select id="fRoleTemplate">
          <option value="blank">Blank (no abilities)</option>
          ${STATE.roles.map((r?: any): any => `<option value="${r.id}">Copy from ${escapeHtml(r.name)}</option>`).join('')}
        </select></div>` : ''}
      <div style="font-size:12px;color:var(--text-dim);">There's no limit on how many roles you can create.</div>
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
                toast("Role created.");
            }
            persist();
            closeModal();
            renderRoles();
            renderRoleSwitcher();
        };
    }
    function deleteRole(role?: any): any {
        const inUse: any = STATE.personnel.some((p?: any): any => p.roleId === role.id);
        if (inUse) {
            toast("Can't delete a role that's still assigned to personnel. Reassign them first.", true);
            return;
        }
        if (!confirm(`Delete the role "${role.name}"? This cannot be undone.`))
            return;
        STATE.roles = STATE.roles.filter((r?: any): any => r.id !== role.id);
        if (STATE.currentRoleId === role.id)
            STATE.currentRoleId = STATE.roles[0].id;
        SELECTED_ROLE_ID = STATE.roles[0].id;
        persist();
        toast("Role deleted.");
        renderRoles();
        renderRoleSwitcher();
    }
    /* =========================================================================
       PERSONNEL
       ========================================================================= */
    function renderPersonnel(): any {
        const canView: any = can('personnel_view');
        const canManage: any = can('personnel_manage');
        if (!canView) {
            (document as any).getElementById('view-personnel').innerHTML = permissionBlockedView("You don't have permission to view the personnel roster in this role.");
            return;
        }
        const s: any = SORT.personnel;
        const personnel: any = STATE.personnel.slice().sort((a?: any, b?: any): any => {
            const av: any = s.key === 'roleId' ? roleName(a.roleId).toLowerCase() : String(a[s.key]).toLowerCase();
            const bv: any = s.key === 'roleId' ? roleName(b.roleId).toLowerCase() : String(b[s.key]).toLowerCase();
            if (av < bv)
                return s.dir === 'asc' ? -1 : 1;
            if (av > bv)
                return s.dir === 'asc' ? 1 : -1;
            return 0;
        });
        const rows: any = personnel.map((p?: any): any => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="mono">${escapeHtml(p.badge)}</td>
      <td>${p.email ? escapeHtml(p.email) : '—'}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td><span class="badge badge-role">${escapeHtml(roleName(p.roleId))}</span></td>
      <td>${canManage ? `<div class="cell-actions"><button class="btn-icon" data-edit-p="${p.id}" title="Edit">${ICONS.edit}</button></div>` : ""}</td>
    </tr>
  `).join('');
        (document as any).getElementById('view-personnel').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the roster in read-only mode.") : ""}
    <div class="toolbar">
      <div></div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddPerson">${ICONS.plus} Add Personnel</button>` : ""}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          ${sortHeaderHtml('Name', 'personnel', 'name')}
          ${sortHeaderHtml('Badge #', 'personnel', 'badge')}
          <th>Email</th>
          ${sortHeaderHtml('Unit', 'personnel', 'unit')}
          ${sortHeaderHtml('Role', 'personnel', 'roleId')}
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        wireSortHeaders('personnel', renderPersonnel);
        const addBtn: any = (document as any).getElementById('btnAddPerson');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openPersonModal(null));
        (document as any).querySelectorAll('[data-edit-p]').forEach((b?: any): any => b.addEventListener('click', (): any => openPersonModal(b.dataset.editP)));
    }
    function openPersonModal(id?: any): any {
        const editing: any = !!id;
        const p: any = editing ? STATE.personnel.find((p?: any): any => p.id === id) : { name: "", badge: "", email: "", unit: "", roleId: STATE.roles[STATE.roles.length - 1].id } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? "Edit Personnel" : "Add Personnel"}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>First name</label><input type="text" id="fPFirstName" value="${escapeHtml((p.name || '').split(' ')[0] || '')}"></div>
        <div class="form-row"><label>Last name</label><input type="text" id="fPLastName" value="${escapeHtml((p.name || '').split(' ').slice(1).join(' '))}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Badge / ID #</label><input type="text" id="fPBadge" value="${escapeHtml(p.badge)}"></div>
        <div class="form-row"><label>Email</label><input type="text" id="fPEmail" value="${escapeHtml(p.email || '')}" placeholder="name@agency.gov"></div>
      </div>
      <div class="form-row"><label>Unit</label><input type="text" id="fPUnit" value="${escapeHtml(p.unit)}"></div>
      <div class="form-row"><label>Role</label>
        <select id="fPRole">${STATE.roles.map((r?: any): any => `<option value="${r.id}" ${p.roleId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}</select>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing ? "Save Changes" : "Add Personnel"}</button>
    </div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const firstName: any = (document as any).getElementById('fPFirstName').value.trim();
            const lastName: any = (document as any).getElementById('fPLastName').value.trim();
            if (!firstName || !lastName) {
                toast("Enter a first and last name.", true);
                return;
            }
            const name: any = `${firstName} ${lastName}`;
            const data: any = { name, badge: (document as any).getElementById('fPBadge').value.trim(), email: (document as any).getElementById('fPEmail').value.trim(), unit: (document as any).getElementById('fPUnit').value.trim(), roleId: (document as any).getElementById('fPRole').value } as any;
            if (editing) {
                Object.assign(p, data);
                toast("Personnel updated.");
            }
            else {
                STATE.personnel.push({ id: "p" + Date.now(), ...data } as any);
                toast("Personnel added.");
            }
            persist();
            closeModal();
            PM.switchView('pm-records');
        };
    }
    /* =========================================================================
       REPORTS
       ========================================================================= */
    let CHART_REFS: any = {} as any;
    function destroyCharts(): any { (Object.values(CHART_REFS) as any).forEach((c?: any): any => c && c.destroy()); CHART_REFS = {} as any; }
    let REPORT_RANGE: any = { from: "", to: "", vehicleType: "All", agency: "All" } as any;
    function inRange(dateStr?: any): any {
        if (!dateStr)
            return false;
        const d: any = dateStr.slice(0, 10);
        if (REPORT_RANGE.from && d < REPORT_RANGE.from)
            return false;
        if (REPORT_RANGE.to && d > REPORT_RANGE.to)
            return false;
        return true;
    }
    function renderReports(): any {
        if (!can('fleet_reports_view')) {
            (document as any).getElementById('view-fleet-reports').innerHTML = permissionBlockedView("You don't have permission to view reports in this role.");
            return;
        }
        const canExport: any = can('fleet_reports_export');
        let veh: any = visibleVehicles();
        if (REPORT_RANGE.vehicleType !== 'All')
            veh = veh.filter((v?: any): any => v.vehicleType === REPORT_RANGE.vehicleType);
        if (REPORT_RANGE.agency !== 'All')
            veh = veh.filter((v?: any): any => v.agency === REPORT_RANGE.agency);
        const inScopeVehicle: any = (id?: any): any => { const v: any = vehicleById(id); if (!v)
            return false; if (REPORT_RANGE.vehicleType !== 'All' && v.vehicleType !== REPORT_RANGE.vehicleType)
            return false; if (REPORT_RANGE.agency !== 'All' && v.agency !== REPORT_RANGE.agency)
            return false; return true; };
        const hasRange: any = REPORT_RANGE.from || REPORT_RANGE.to;
        // 1. Vehicle inspections by personnel
        const inspInRange: any = STATE.fleet.inspections.filter((i?: any): any => inScopeVehicle(i.vehicleId) && (!hasRange || inRange(i.dateTime)));
        const byPerson: any = {} as any;
        inspInRange.forEach((i?: any): any => i.personnelIds.forEach((pid?: any): any => { byPerson[pid] = (byPerson[pid] || 0) + 1; }));
        const inspByPersonRows: any = (Object.entries(byPerson) as any).sort((a?: any, b?: any): any => b[1] - a[1]).map(([pid, count]: any): any => `
    <tr><td>${escapeHtml(personName(pid))}</td><td>${count}</td></tr>
  `).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">No inspections in this range.</td></tr>`;
        // 2. Vehicles by fuel, oil, mileage (gallons/quarts summed from inspections in range; mileage is current odometer)
        const fuelOilByVehicle: any = {} as any;
        inspInRange.forEach((i?: any): any => {
            if (!fuelOilByVehicle[i.vehicleId])
                fuelOilByVehicle[i.vehicleId] = { gallons: 0, quarts: 0 } as any;
            fuelOilByVehicle[i.vehicleId].gallons += i.gallonsAdded;
            fuelOilByVehicle[i.vehicleId].quarts += i.quartsOilAdded;
        });
        const fuelOilRows: any = veh.map((v?: any): any => {
            const agg: any = fuelOilByVehicle[v.id] || { gallons: 0, quarts: 0 } as any;
            return `<tr><td>${vehicleLink(v)}</td><td>${v.currentFuelLevel}%</td><td>${agg.gallons.toFixed(1)}</td><td>${agg.quarts.toFixed(1)}</td><td>${v.mileage.toLocaleString()} mi</td></tr>`;
        }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No vehicles.</td></tr>`;
        // 3. Vehicles by assignment
        const assignmentRows: any = veh.map((v?: any): any => `
    <tr><td>${vehicleLink(v)}</td><td>${escapeHtml(v.vehicleType)}</td><td>${assignmentLabel(v)}</td><td>${escapeHtml(v.location)}</td></tr>
  `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No vehicles.</td></tr>`;
        // 4. Vehicle maintenance by type (date range on maintenance date)
        const maintInRange: any = STATE.fleet.maintenance.filter((m?: any): any => inScopeVehicle(m.vehicleId) && (!hasRange || inRange(m.date)));
        const maintByType: any = {} as any;
        STATE.fleet.refData.maintenanceTypes.forEach((t?: any): any => maintByType[t] = { count: 0, cost: 0 } as any);
        maintInRange.forEach((m?: any): any => {
            if (!maintByType[m.type])
                maintByType[m.type] = { count: 0, cost: 0 } as any;
            maintByType[m.type].count++;
            maintByType[m.type].cost += m.cost;
        });
        const maintByTypeRows: any = (Object.entries(maintByType) as any).filter(([, v]: any): any => v.count > 0).map(([type, v]: any): any => `
    <tr><td>${escapeHtml(type)}</td><td>${v.count}</td><td>${money(v.cost)}</td></tr>
  `).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No maintenance in this range.</td></tr>`;
        // 5. Vehicles with assigned equipment (fully equipped)
        const fullyEquipped: any = veh.filter((v?: any): any => (v.equipmentChecklist || []).every((e?: any): any => e.present));
        const equippedRows: any = fullyEquipped.map((v?: any): any => `
    <tr><td>${vehicleLink(v)}</td><td>${(v.equipmentChecklist || []).length} items</td></tr>
  `).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">No fully-equipped vehicles found.</td></tr>`;
        // 6. Vehicles with missing equipment
        const missingVehicles: any = veh.filter((v?: any): any => (v.equipmentChecklist || []).some((e?: any): any => !e.present));
        const missingRows: any = missingVehicles.map((v?: any): any => {
            const missing: any = v.equipmentChecklist.filter((e?: any): any => !e.present).map((e?: any): any => e.name);
            return `<tr><td>${vehicleLink(v)}</td><td>${escapeHtml(missing.join(', '))}</td></tr>`;
        }).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-dim);padding:16px;">No vehicles are missing equipment.</td></tr>`;
        // 7. Vehicles with repairs needed (Open maintenance)
        const needsRepair: any = STATE.fleet.maintenance.filter((m?: any): any => m.status === "Open" && inScopeVehicle(m.vehicleId));
        const repairRows: any = needsRepair.map((m?: any): any => {
            const v: any = vehicleById(m.vehicleId);
            return `<tr><td>${vehicleLink(v)}</td><td>${m.type}</td><td>${m.date}</td><td style="font-size:12px;color:var(--text-dim);">${escapeHtml(m.notes || '')}</td></tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No open repairs.</td></tr>`;
        // Bonus charts data
        const byType: any = {} as any;
        STATE.fleet.refData.vehicleTypes.forEach((t?: any): any => byType[t] = 0);
        veh.forEach((v?: any): any => byType[v.vehicleType] = (byType[v.vehicleType] || 0) + 1);
        const byStatus: any = {} as any;
        veh.forEach((v?: any): any => byStatus[v.status] = (byStatus[v.status] || 0) + 1);
        const costByVendor: any = {} as any;
        STATE.fleet.maintenance.filter((m?: any): any => m.status === "Completed").forEach((m?: any): any => {
            const name: any = m.vendorId ? vendorName(m.vendorId) : "In-House";
            costByVendor[name] = (costByVendor[name] || 0) + m.cost;
        });
        (document as any).getElementById('view-fleet-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="fleetReportFilterHost"></div></div></div>
    <div class="toolbar">
      <div></div>
      <div style="display:flex;gap:8px;">
        ${canExport ? `<button class="btn btn-outline" id="btnExportFleet">${ICONS.download} Export Fleet (CSV)</button>` : ""}
        <button class="btn btn-outline" id="btnPrintReportFleet">Print / Save as PDF</button>
      </div>
    </div>

    <div class="chart-grid">
      <div class="panel"><div class="panel-head"><h2>Vehicles by Type</h2></div><div class="panel-body"><div class="chart-box"><canvas id="chartFleetType"></canvas></div></div></div>
      <div class="panel"><div class="panel-head"><h2>Status Breakdown</h2></div><div class="panel-body"><div class="chart-box"><canvas id="chartFleetStatus"></canvas></div></div></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Maintenance Cost by Vendor</h2></div>
      <div class="panel-body"><div class="chart-box" style="height:180px;"><canvas id="chartFleetVendorCost"></canvas></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Vehicle Inspections by Personnel</h2><span class="hint">${hasRange ? 'Filtered by date range' : 'All time'} &bull; ${inspInRange.length} inspections</span></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Personnel</th><th># Inspections</th></tr></thead><tbody>${inspByPersonRows}</tbody></table></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Vehicles by Fuel, Oil &amp; Mileage</h2><span class="hint">Gallons/quarts totaled ${hasRange ? 'within range' : 'all time'} from inspections</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Vehicle</th><th>Current Fuel</th><th>Gallons Added</th><th>Quarts Oil Added</th><th>Mileage</th></tr></thead><tbody>${fuelOilRows}</tbody></table></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Vehicles by Assignment</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Assigned To</th><th>Location</th></tr></thead><tbody>${assignmentRows}</tbody></table></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Vehicle Maintenance by Type</h2><span class="hint">${hasRange ? 'Filtered by date range' : 'All time'}</span></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Type</th><th>Count</th><th>Total Cost</th></tr></thead><tbody>${maintByTypeRows}</tbody></table></div>
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="panel-head"><h2>Vehicles with Assigned Equipment</h2><span class="hint">Fully equipped &bull; ${fullyEquipped.length}</span></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Vehicle</th><th>Equipment Count</th></tr></thead><tbody>${equippedRows}</tbody></table></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Vehicles with Missing Equipment</h2><span class="hint">${missingVehicles.length} flagged</span></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Vehicle</th><th>Missing Items</th></tr></thead><tbody>${missingRows}</tbody></table></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h2>Vehicles with Repairs Needed</h2><span class="hint">${needsRepair.length} open repair(s)</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Vehicle</th><th>Type</th><th>Reported</th><th>Notes</th></tr></thead><tbody>${repairRows}</tbody></table></div>
    </div>
  `;
        destroyCharts();
        const navy: any = '#24364E', blue: any = '#134DD1', slate: any = '#B4C7CF', gold: any = '#FFAC12', red: any = '#D34120';
        const palette: any = [blue, navy, slate, gold, '#6C8AA8', '#4E6C8C', '#8FA6B8', '#1E2E44', '#3D6BC7', '#B4372A'];
        const baseBarOpts: any = (currency?: any): any => ({
            maintainAspectRatio: false,
            plugins: { legend: { display: false } as any } as any,
            scales: {
                x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any, grid: { display: false } as any } as any,
                y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any, callback: (v?: any): any => currency ? '$' + v : v } as any, grid: { color: chartGridColor() } as any } as any
            } as any
        } as any);
        CHART_REFS.type = safeChart('chartFleetType', {
            type: 'bar', data: { labels: Object.keys(byType) as any, datasets: [{ label: 'Vehicles', data: Object.values(byType) as any, backgroundColor: blue } as any] } as any, options: baseBarOpts()
        } as any);
        CHART_REFS.status = safeChart('chartFleetStatus', {
            type: 'doughnut', data: { labels: Object.keys(byStatus) as any, datasets: [{ data: Object.values(byStatus) as any, backgroundColor: palette } as any] } as any,
            options: { plugins: { legend: { position: 'right', labels: { color: navy, font: { family: 'Archivo' } as any } as any } as any } as any, maintainAspectRatio: false } as any
        } as any);
        CHART_REFS.vendorCost = safeChart('chartFleetVendorCost', {
            type: 'bar', data: { labels: Object.keys(costByVendor) as any, datasets: [{ label: 'Cost ($)', data: Object.values(costByVendor) as any, backgroundColor: red } as any] } as any,
            options: { ...baseBarOpts(true), indexAxis: 'y' } as any
        } as any);
        renderReportFilterBar((document as any).getElementById('fleetReportFilterHost'), [
            { type: 'daterange', keyFrom: 'from', keyTo: 'to', label: 'Activity Date Range' } as any,
            { type: 'select', key: 'vehicleType', label: 'Vehicle Type', options: STATE.fleet.refData.vehicleTypes } as any,
            { type: 'select', key: 'agency', label: 'Agency', options: STATE.fleet.refData.agencies } as any,
        ], REPORT_RANGE, renderReports);
        (document as any).getElementById('btnPrintReportFleet').addEventListener('click', (): any => (window as any).print());
        const exportBtn: any = (document as any).getElementById('btnExportFleet');
        if (exportBtn)
            exportBtn.addEventListener('click', exportFleetCsv);
        wireVehicleLinks();
    }
    function exportFleetCsv(): any {
        const headers: any = ["Unit #", "Make", "Model", "Year", "VIN", "Type", "Status", "Mileage", "Location", "Agency", "Assigned To"];
        const rows: any = STATE.fleet.vehicles.map((v?: any): any => [v.unitNumber, v.make, v.model, v.year, v.vin, v.vehicleType, v.status, v.mileage, v.location, v.agency, v.assignedToType === 'person' ? personName(v.assignedTo) : (v.assignedTo || '')]);
        const csv: any = [headers, ...rows].map((r?: any): any => r.map((x?: any): any => csvSafeCell(x)).join(',')).join('\n');
        const blob: any = new Blob([csv], { type: 'text/csv' } as any);
        const url: any = URL.createObjectURL(blob);
        const a: any = (document as any).createElement('a');
        a.href = url;
        a.download = 'fleet_vehicles.csv';
        (document as any).body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Fleet exported.");
    }
    /* =========================================================================
       ADMIN: reference data, vendors, notification routing, audit log
       ========================================================================= */
    let ADMIN_TAB: any = 'vehicleTypes';
    const SIMPLE_LIST_TABS: any = {
        vehicleTypes: { label: 'Vehicle Types', usageCheck: (v?: any): any => STATE.fleet.vehicles.filter((x?: any): any => x.vehicleType === v).length } as any,
        maintenanceTypes: { label: 'Maintenance Types', usageCheck: (v?: any): any => STATE.fleet.maintenance.filter((m?: any): any => m.type === v).length } as any,
        locations: { label: 'Locations', usageCheck: (v?: any): any => STATE.fleet.vehicles.filter((x?: any): any => x.location === v).length } as any,
        agencies: { label: 'Agencies', usageCheck: (v?: any): any => STATE.fleet.vehicles.filter((x?: any): any => x.agency === v).length } as any,
        equipmentCatalog: { label: 'Equipment Catalog', usageCheck: (v?: any): any => STATE.fleet.vehicles.filter((x?: any): any => (x.equipmentChecklist || []).some((e?: any): any => e.name === v)).length } as any
    } as any;
    function renderAdmin(): any {
        const canManage: any = can('fleet_admin_categories');
        const canAudit: any = can('fleet_admin_audit');
        if (!canManage && !canAudit) {
            (document as any).getElementById('view-fleet-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
            return;
        }
        const tabs: any = [];
        if (canManage) {
            (Object.entries(SIMPLE_LIST_TABS) as any).forEach(([key, cfg]: any): any => tabs.push([key, cfg.label]));
            tabs.push(['vendors', 'Vendors']);
            tabs.push(['notifications', 'Notification Routing']);
        }
        if (can('fleet_bulk_import'))
            tabs.push(['bulkImport', 'Bulk Import']);
        if (canAudit)
            tabs.push(['audit', 'Platform Audit Log']);
        if (!tabs.find(([k]: any): any => k === ADMIN_TAB))
            ADMIN_TAB = tabs[0][0];
        (document as any).getElementById('view-fleet-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key, label]: any): any => `<button class="btn btn-sm ${ADMIN_TAB === key ? 'btn-primary' : 'btn-outline'}" data-admin-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyFleet"></div>
  `;
        (document as any).querySelectorAll('[data-admin-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { ADMIN_TAB = b.dataset.adminTab; renderAdmin(); }));
        renderAdminTabBody();
    }
    function renderAdminTabBody(): any {
        const body: any = (document as any).getElementById('adminTabBodyFleet');
        if (SIMPLE_LIST_TABS[ADMIN_TAB]) {
            renderSimpleListTab(body, ADMIN_TAB);
        }
        else if (ADMIN_TAB === 'vendors') {
            renderVendorsTab(body);
        }
        else if (ADMIN_TAB === 'notifications') {
            renderNotificationRoutingTab(body);
        }
        else if (ADMIN_TAB === 'bulkImport') {
            renderBulkImportTab(body, 'fleet');
        }
        else if (ADMIN_TAB === 'audit') {
            renderPlatformAuditLogTab(body);
        }
    }
    function renderSimpleListTab(body?: any, key?: any): any {
        const cfg: any = SIMPLE_LIST_TABS[key];
        const list: any = STATE.fleet.refData[key];
        const rows: any = list.map((v?: any, i?: any): any => {
            const inUse: any = cfg.usageCheck(v);
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
          <input type="text" id="newItemInputFleet" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/, '')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemFleet">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddItemFleet').addEventListener('click', (): any => {
            const val: any = (document as any).getElementById('newItemInputFleet').value.trim();
            if (!val) {
                toast("Enter a value first.", true);
                return;
            }
            if (list.includes(val)) {
                toast("That already exists.", true);
                return;
            }
            list.push(val);
            logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
            persist();
            renderAdminTabBody();
        });
        (document as any).querySelectorAll('[data-remove-item]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const idx: any = Number(b.dataset.removeItem);
            const val: any = list[idx];
            if (cfg.usageCheck(val) > 0) {
                toast(`Can't remove "${val}" \u2014 it's currently used by ${cfg.usageCheck(val)} record(s). Reassign them first.`, true);
                return;
            }
            if (!confirm(`Remove "${val}" from ${cfg.label}?`))
                return;
            list.splice(idx, 1);
            logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    function renderVendorsTab(body?: any): any {
        const rows: any = STATE.fleet.refData.vendors.map((v?: any): any => {
            const inUse: any = STATE.fleet.maintenance.filter((m?: any): any => m.vendorId === v.id).length;
            return `<tr>
      <td>${escapeHtml(v.name)}</td>
      <td>${escapeHtml(v.contact || '')}</td>
      <td>${escapeHtml(v.phone || '')}</td>
      <td style="font-size:12px;">${escapeHtml(v.servicesProvided || '')}</td>
      <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : ''}</td>
      <td><div class="cell-actions">
        <button class="btn-icon" data-edit-vendor="${v.id}" title="Edit">${ICONS.edit}</button>
        <button class="btn-icon" data-del-vendor="${v.id}" title="Delete">${ICONS.trash}</button>
      </div></td>
    </tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No vendors yet.</td></tr>`;
        body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Vendors</h2><span class="hint">Repair, service, and upfit vendors for cost tracking</span></div>
      <div class="panel-body">
        <div style="margin-bottom:12px;"><button class="btn btn-primary btn-sm" id="btnAddVendorFleet">${ICONS.plus} Add Vendor</button></div>
        <table><thead><tr><th>Name</th><th>Contact</th><th>Phone</th><th>Services Provided</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddVendorFleet').addEventListener('click', (): any => openVendorModal(null));
        (document as any).querySelectorAll('[data-edit-vendor]').forEach((b?: any): any => b.addEventListener('click', (): any => openVendorModal(b.dataset.editVendor)));
        (document as any).querySelectorAll('[data-del-vendor]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const v: any = STATE.fleet.refData.vendors.find((v?: any): any => v.id === b.dataset.delVendor);
            const inUse: any = STATE.fleet.maintenance.filter((m?: any): any => m.vendorId === v.id).length;
            if (inUse > 0) {
                toast(`Can't remove "${v.name}" \u2014 linked to ${inUse} maintenance record(s).`, true);
                return;
            }
            if (!confirm(`Remove vendor "${v.name}"?`))
                return;
            STATE.fleet.refData.vendors = STATE.fleet.refData.vendors.filter((x?: any): any => x.id !== v.id);
            logActivity(`Removed vendor "${v.name}".`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    function openVendorModal(id?: any): any {
        const editing: any = !!id;
        const v: any = editing ? STATE.fleet.refData.vendors.find((v?: any): any => v.id === id) : { name: '', contact: '', phone: '', email: '', servicesProvided: '' } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit Vendor' : 'Add Vendor'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Vendor Name</label><input type="text" id="fVName" value="${escapeHtml(v.name)}"></div>
      <div class="form-row"><label>Contact Person</label><input type="text" id="fVContact" value="${escapeHtml(v.contact || '')}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Phone</label><input type="text" id="fVPhone" value="${escapeHtml(v.phone || '')}"></div>
        <div class="form-row"><label>Email</label><input type="text" id="fVEmail" value="${escapeHtml(v.email || '')}"></div>
      </div>
      <div class="form-row"><label>Services Provided</label><textarea id="fVServices" rows="2" placeholder="e.g. Oil changes, brakes, tires">${escapeHtml(v.servicesProvided || '')}</textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">${editing ? 'Save Changes' : 'Add Vendor'}</button>
    </div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fVName').value.trim();
            if (!name) {
                toast("Enter a vendor name.", true);
                return;
            }
            const data: any = { name, contact: (document as any).getElementById('fVContact').value.trim(), phone: (document as any).getElementById('fVPhone').value.trim(), email: (document as any).getElementById('fVEmail').value.trim(), servicesProvided: (document as any).getElementById('fVServices').value.trim() } as any;
            if (editing) {
                Object.assign(v, data);
                logActivity(`Updated vendor "${name}".`, "admin");
            }
            else {
                STATE.fleet.refData.vendors.push({ id: 'v' + Date.now(), ...data } as any);
                logActivity(`Added vendor "${name}".`, "admin");
            }
            persist();
            closeModal();
            renderAdminTabBody();
        };
    }
    function renderNotificationRoutingTab(body?: any): any {
        const roleOpts: any = (selected?: any): any => STATE.roles.map((r?: any): any => `<option value="${r.id}" ${selected === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        body.innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Notification Routing</h2><span class="hint">Which role receives each type of automatic alert</span></div>
      <div class="panel-body">
        <div class="form-row"><label>Maintenance Due Alerts</label><select id="fRouteMaintFleet">${roleOpts(STATE.fleet.notifySettings.maintenanceDueRoleId)}</select></div>
        <div class="form-row"><label>Inspection Overdue Alerts</label><select id="fRouteInsp">${roleOpts(STATE.fleet.notifySettings.inspectionOverdueRoleId)}</select></div>
        <div class="form-row"><label>Missing Equipment Alerts</label><select id="fRouteEquip">${roleOpts(STATE.fleet.notifySettings.missingEquipmentRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingFleet">Save Routing</button>
        <div style="font-size:12px;color:var(--text-dim);margin-top:10px;">Anyone viewing the app as the selected role sees these alerts in the bell icon, top right. This is in-app only in this prototype — not email or SMS.</div>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveRoutingFleet').addEventListener('click', (): any => {
            STATE.fleet.notifySettings.maintenanceDueRoleId = (document as any).getElementById('fRouteMaintFleet').value;
            STATE.fleet.notifySettings.inspectionOverdueRoleId = (document as any).getElementById('fRouteInsp').value;
            STATE.fleet.notifySettings.missingEquipmentRoleId = (document as any).getElementById('fRouteEquip').value;
            logActivity("Updated notification routing settings.", "admin");
            persist();
            toast("Notification routing saved.");
            renderNotifBell();
        });
    }
    let AUDIT_FILTER: any = { entityType: "All" } as any;
    function renderAuditLogTab(body?: any): any {
        const canExport: any = can('fleet_reports_export');
        const types: any = ["All", ...new Set(STATE.fleet.activity.map((a?: any): any => a.entityType || "general"))];
        const filtered: any = STATE.fleet.activity.filter((a?: any): any => AUDIT_FILTER.entityType === "All" || (a.entityType || "general") === AUDIT_FILTER.entityType).slice().reverse();
        const vehEntityTypes: any = ["vehicle", "maintenance", "inspection"];
        const rows: any = filtered.map((a?: any): any => {
            const linkedVeh: any = (vehEntityTypes.includes(a.entityType) && a.entityId) ? vehicleById(a.entityId) : null;
            return `<tr>
      <td class="mono" style="white-space:nowrap;">${a.ts}</td>
      <td><span class="badge badge-role">${escapeHtml(a.entityType || 'general')}</span></td>
      <td>${escapeHtml(a.text)}</td>
      <td>${linkedVeh ? `<button class="btn btn-sm btn-outline" data-open-veh="${linkedVeh.id}">View Vehicle</button>` : ''}</td>
    </tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No activity recorded yet.</td></tr>`;
        body.innerHTML = `
    <div class="toolbar">
      <div class="filters"><select id="auditTypeFleet" title="Filter the physical audit log to a single entity type">${types.map((t?: any): any => `<option ${AUDIT_FILTER.entityType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      ${canExport ? `<button class="btn btn-outline" id="btnExportAuditFleet">${ICONS.download} Export Log (CSV)</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Timestamp</th><th>Type</th><th>Event</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${filtered.length} of ${STATE.fleet.activity.length} events</div>
  `;
        (document as any).getElementById('auditTypeFleet').addEventListener('change', (e?: any): any => { AUDIT_FILTER.entityType = e.target.value; renderAdminTabBody(); });
        wireVehicleLinks();
        const exportBtn: any = (document as any).getElementById('btnExportAuditFleet');
        if (exportBtn)
            exportBtn.addEventListener('click', (): any => {
                const headers: any = ["Timestamp", "Type", "Event"];
                const csvRows: any = filtered.map((a?: any): any => [a.ts, a.entityType || 'general', a.text]);
                const csv: any = [headers, ...csvRows].map((r?: any): any => r.map((v?: any): any => csvSafeCell(v)).join(',')).join('\n');
                const blob: any = new Blob([csv], { type: 'text/csv' } as any);
                const url: any = URL.createObjectURL(blob);
                const a: any = (document as any).createElement('a');
                a.href = url;
                a.download = 'fleet_audit_log.csv';
                (document as any).body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                toast("Audit log exported.");
            });
    }
    /* =========================================================================
       MODAL PLUMBING
       ========================================================================= */
    function openModal(): any { SuiteUX.openModal(); }
    function closeModal(event?: any): any { return SuiteUX.closeModal(event); }
    /* =========================================================================
       INIT
       ========================================================================= */
    function startFleetModule(): any {
        renderNav();
        switchView('fleet-dashboard');
    }
    (window as any).FLEET = { start: startFleetModule, buildData: buildFleetData, migrateData: migrateFleetData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: (): any => renderView(ACTIVE_VIEW), openVehicleDetail } as any;
})();

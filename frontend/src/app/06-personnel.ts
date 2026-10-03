/* =========================================================================
   PERSONNEL MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.pm and shared roles/personnel)
   ========================================================================= */
(function (): any {
    const RANKS: any = ["Recruit", "Officer", "Corporal", "Sergeant", "Lieutenant", "Captain", "Deputy Chief", "Chief"];
    const UNITS_PM: any = ["Patrol - A Shift", "Patrol - B Shift", "Patrol - C Shift", "Traffic Unit", "SWAT", "K9 Unit", "Detectives", "Professional Standards", "Fleet Services", "Logistics", "Records", "Administration"];
    const DISCIPLINARY_TYPES: any = ["Verbal Warning", "Written Reprimand", "Suspension (Unpaid)", "Suspension (Paid)", "Demotion", "Termination", "Last Chance Agreement", "Performance Improvement Plan"];
    const EMPLOYMENT_STATUSES: any = ["Active", "On Leave", "Suspended", "Terminated", "Retired"];
    const TRAINING_CATEGORIES: any = ["Firearms", "Defensive Tactics", "Legal Update", "Driving / EVOC", "Medical / First Aid", "Technology / RMS", "Leadership", "Compliance", "Specialty / Tactical"];
    const TRAINING_LOCATIONS: any = ["Regional Training Academy", "In-House Range", "Online / LMS", "Main Fleet Garage Classroom", "Off-Site Vendor Facility"];
    const TRAINING_PROVIDERS: any = ["State POST Academy", "In-House Instructor Cadre", "Axon Training Services", "Red Cross", "Vendor: Sierra Tactical Training", "Online: PoliceOne Academy"];
    const INQUIRY_CATEGORIES: any = ["Biased-Based Policing", "Use of Force", "Vehicle Pursuit", "Vehicle Crash", "Personnel Injury", "Citation Review", "Field Contact Report", "Citizen Complaint", "Civil Action", "Criminal Action"];
    const SKILLS_CATALOG: any = ["Spanish Fluency", "Crisis Negotiation", "Drone Operator", "Accident Reconstruction", "Field Training Officer", "Firearms Instructor", "K9 Handler", "Bomb Technician", "Sign Language", "Public Speaking"];
    const SEX_OPTIONS: any = ["Male", "Female", "Non-Binary", "Undisclosed"];
    const RACE_OPTIONS: any = ["White", "Black or African American", "Hispanic or Latino", "Asian", "American Indian or Alaska Native", "Native Hawaiian or Pacific Islander", "Two or More Races", "Undisclosed"];
    const MARITAL_OPTIONS: any = ["Single", "Married", "Divorced", "Widowed", "Separated", "Undisclosed"];
    const BLOOD_TYPES: any = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
    const LICENSE_CLASSES: any = ["Class A", "Class B", "Class C", "Class D", "Motorcycle Endorsement", "CDL"];
    /* Illustrated placeholder avatars (original generic silhouettes, not photos of any real
       individual) so the roster doesn't show a generic icon for every person. */
    const AVATAR_PEOPLE: any = {
        p1: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0M2OEU2OCIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0M2OEU2OCIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIwLDQwIFExOCw3MCAyNCw4OCBMMzIsODggUTI4LDYwIDMwLDQyIFoiIGZpbGw9IiMzQjJBMUYiLz48cGF0aCBkPSJNODAsNDAgUTgyLDcwIDc2LDg4IEw2OCw4OCBRNzIsNjAgNzAsNDIgWiIgZmlsbD0iIzNCMkExRiIvPjxwYXRoIGQ9Ik0yMiw0MCBRNTAsMTAgNzgsNDAgTDc4LDMyIFE1MCwxNCAyMiwzMiBaIiBmaWxsPSIjM0IyQTFGIi8+CiAgICAKICA8L3N2Zz4=",
        p2: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iIzhENUEzQyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iIzhENUEzQyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIzLDM2IFE1MCwxOCA3NywzNiBMNzcsMzAgUTUwLDIyIDIzLDMwIFoiIGZpbGw9IiMxQTFBMUEiLz4KICAgIAogIDwvc3ZnPg==",
        p3: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0U4Qjk4QyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0U4Qjk4QyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIyLDM4IFE1MCwxMCA3OCwzOCBMNzgsMzAgUTUwLDE2IDIyLDMwIFoiIGZpbGw9IiM0QTMyMjIiLz48cGF0aCBkPSJNMjIsMzggUTIyLDI2IDMwLDIwIFE1MCwxMCA3MCwyMCBRNzgsMjYgNzgsMzggTDc4LDQ0IFE3MywzMiA1MCwzMCBRMjcsMzIgMjIsNDQgWiIgZmlsbD0iIzRBMzIyMiIvPgogICAgCiAgPC9zdmc+",
        p4: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0Q5QTg3NiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0Q5QTg3NiIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIwLDQwIFExOCw3MCAyNCw4OCBMMzIsODggUTI4LDYwIDMwLDQyIFoiIGZpbGw9IiMyNDFFMUEiLz48cGF0aCBkPSJNODAsNDAgUTgyLDcwIDc2LDg4IEw2OCw4OCBRNzIsNjAgNzAsNDIgWiIgZmlsbD0iIzI0MUUxQSIvPjxwYXRoIGQ9Ik0yMiw0MCBRNTAsMTAgNzgsNDAgTDc4LDMyIFE1MCwxNCAyMiwzMiBaIiBmaWxsPSIjMjQxRTFBIi8+CiAgICAKICA8L3N2Zz4=",
        p5: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0M2OEU2OCIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0M2OEU2OCIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIyLDM4IFE1MCwxMCA3OCwzOCBMNzgsMzAgUTUwLDE2IDIyLDMwIFoiIGZpbGw9IiM1QzVDNUMiLz48cGF0aCBkPSJNMjIsMzggUTIyLDI2IDMwLDIwIFE1MCwxMCA3MCwyMCBRNzgsMjYgNzgsMzggTDc4LDQ0IFE3MywzMiA1MCwzMCBRMjcsMzIgMjIsNDQgWiIgZmlsbD0iIzVDNUM1QyIvPgogICAgCiAgPC9zdmc+",
        p6: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iIzhENUEzQyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iIzhENUEzQyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIyLDM4IFE1MCwxMCA3OCwzOCBMNzgsMzAgUTUwLDE2IDIyLDMwIFoiIGZpbGw9IiMxQTFBMUEiLz48cGF0aCBkPSJNMjIsMzggUTIyLDI2IDMwLDIwIFE1MCwxMCA3MCwyMCBRNzgsMjYgNzgsMzggTDc4LDQ0IFE3MywzMiA1MCwzMCBRMjcsMzIgMjIsNDQgWiIgZmlsbD0iIzFBMUExQSIvPgogICAgCiAgPC9zdmc+",
        p7: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0U4Qjk4QyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0U4Qjk4QyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIwLDQwIFExOCw3MCAyNCw4OCBMMzIsODggUTI4LDYwIDMwLDQyIFoiIGZpbGw9IiM2QjQyMjYiLz48cGF0aCBkPSJNODAsNDAgUTgyLDcwIDc2LDg4IEw2OCw4OCBRNzIsNjAgNzAsNDIgWiIgZmlsbD0iIzZCNDIyNiIvPjxwYXRoIGQ9Ik0yMiw0MCBRNTAsMTAgNzgsNDAgTDc4LDMyIFE1MCwxNCAyMiwzMiBaIiBmaWxsPSIjNkI0MjI2Ii8+CiAgICAKICA8L3N2Zz4=",
        p8: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0I5N0E1MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0I5N0E1MiIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgCiAgICAKICA8L3N2Zz4=",
        p9: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0U4Qjk4QyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0U4Qjk4QyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIyLDM4IFE1MCwxMCA3OCwzOCBMNzgsMzAgUTUwLDE2IDIyLDMwIFoiIGZpbGw9IiM4QzhDOEMiLz48cGF0aCBkPSJNMjIsMzggUTIyLDI2IDMwLDIwIFE1MCwxMCA3MCwyMCBRNzgsMjYgNzgsMzggTDc4LDQ0IFE3MywzMiA1MCwzMCBRMjcsMzIgMjIsNDQgWiIgZmlsbD0iIzhDOEM4QyIvPgogICAgCiAgPC9zdmc+",
        p10: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iI0M2OEU2OCIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iI0M2OEU2OCIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIwLDQwIFExOCw3MCAyNCw4OCBMMzIsODggUTI4LDYwIDMwLDQyIFoiIGZpbGw9IiMzQjJBMUYiLz48cGF0aCBkPSJNODAsNDAgUTgyLDcwIDc2LDg4IEw2OCw4OCBRNzIsNjAgNzAsNDIgWiIgZmlsbD0iIzNCMkExRiIvPjxwYXRoIGQ9Ik0yMiw0MCBRNTAsMTAgNzgsNDAgTDc4LDMyIFE1MCwxNCAyMiwzMiBaIiBmaWxsPSIjM0IyQTFGIi8+CiAgICAKICA8L3N2Zz4=",
        p11: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iIzhENUEzQyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iIzhENUEzQyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIzLDM2IFE1MCwxOCA3NywzNiBMNzcsMzAgUTUwLDIyIDIzLDMwIFoiIGZpbGw9IiMxQTFBMUEiLz4KICAgIAogIDwvc3ZnPg=="
    } as any;
    function defaultExceptionCodes(): any {
        return [
            { code: 'RDO', name: 'Regular Day Off', color: '#8A94A6', active: true, requestable: false } as any,
            { code: 'VDO', name: 'Vacation Day Off', color: '#14B8A6', active: true, requestable: true } as any,
            { code: 'CDO', name: 'Compensatory Day Off', color: '#D8AA50', active: true, requestable: true } as any,
            { code: 'SDO', name: 'Sick Day Off', color: '#EC4899', active: true, requestable: true } as any,
            { code: 'TDO', name: 'Training Day Off', color: '#F97316', active: true, requestable: false } as any,
            { code: 'SWP', name: 'Shift Swap (Covered by Someone Else)', color: '#0EA5E9', active: true, locked: true, requestable: false } as any,
        ];
    }
    function defaultRefData(): any {
        return {
            ranks: [...RANKS], units: [...UNITS_PM], disciplinaryTypes: [...DISCIPLINARY_TYPES],
            employmentStatuses: [...EMPLOYMENT_STATUSES], trainingCategories: [...TRAINING_CATEGORIES],
            trainingLocations: TRAINING_LOCATIONS.map((name?: any): any => ({ name, address: '' } as any)), trainingProviders: [...TRAINING_PROVIDERS],
            inquiryCategories: [...INQUIRY_CATEGORIES], skillsCatalog: [...SKILLS_CATALOG],
            agencies: ["Reno PD - Patrol Division", "Reno PD - SWAT", "Reno PD - Traffic Unit", "Regional Task Force (Mutual Aid)"],
            exceptionCodes: defaultExceptionCodes()
        } as any;
    }
    /* =========================================================================
       SEED DATA
       ========================================================================= */
    function emptyMedical(): any { return { bloodType: "Unknown", vaccinations: [], medicalNotes: "", injuryHistory: [], exposureHistory: [] } as any; }
    function emptyLodd(): any { return { wishes: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "", notes: "" } as any; }
    function seedRecords(): any {
        const today: any = new Date() as any;
        const defs: any = [
            ["p1", "role_supervisor", "Sergeant", "1042", "Reno PD - Patrol Division", "Patrol - A Shift", "2010-03-01", "2010-06-15", "A+", "Female", "White", "Married"],
            ["p2", "role_officer", "Officer", "2216", "Reno PD - Patrol Division", "Patrol - A Shift", "2018-07-01", "2018-10-01", "O+", "Male", "Asian", "Single"],
            ["p3", "role_officer", "Officer", "2298", "Reno PD - Patrol Division", "Patrol - B Shift", "2019-01-15", "2019-04-01", "B+", "Male", "White", "Married"],
            ["p4", "role_officer", "Officer", "2310", "Reno PD - Traffic Unit", "Traffic Unit", "2017-05-01", "2017-08-01", "AB-", "Female", "Hispanic or Latino", "Single"],
            ["p5", "role_supervisor", "Lieutenant", "0510", "Reno PD - SWAT", "SWAT", "2005-02-01", "2005-05-15", "O-", "Male", "Black or African American", "Married"],
            ["p6", "role_officer", "Officer", "2401", "Reno PD - SWAT", "SWAT", "2016-09-01", "2016-12-01", "A-", "Male", "White", "Divorced"],
            ["p7", "role_auditor", "Corporal", "AUD-04", "Reno PD - Patrol Division", "Professional Standards", "2014-04-01", "2014-07-01", "B-", "Female", "White", "Married"],
            ["p8", "role_qm_admin", "Civilian - Logistics Manager", "QM-01", "Reno PD - Patrol Division", "Logistics", "2012-06-01", null, "Unknown", "Male", "Undisclosed", "Undisclosed"],
            ["p9", "role_admin", "Deputy Chief", "1476", "Reno PD - Patrol Division", "Administration", "2008-01-01", "2008-04-01", "O+", "Male", "White", "Married"],
            ["p10", "role_fleet_admin", "Civilian - Fleet Manager", "FM-01", "Reno PD - Patrol Division", "Fleet Services", "2015-03-01", null, "Unknown", "Female", "Undisclosed", "Undisclosed"],
            ["p11", "role_fleet_admin", "Civilian - Mechanic", "MX-02", "Reno PD - Patrol Division", "Fleet Services", "2019-08-01", null, "Unknown", "Male", "Undisclosed", "Undisclosed"],
        ];
        const records: any = defs.map(([personId, roleId, rank, badge, agency, unit, hireDate, swornDate, bloodType, sex, race, marital]: any): any => ({
            personId, agency, employeeId: "EMP-" + badge, unitId: unit,
            driversLicense: { number: "DL" + Math.floor(1000000 + Math.random() * 8999999), licenseClass: "Class C", state: "NV", expiration: fmt(addDays(today, 365 + Math.floor(Math.random() * 700))) } as any,
            hireDate, terminationDate: null,
            promotionHistory: [{ rank, startDate: hireDate, endDate: null } as any],
            bloodType, phones: [{ type: "Mobile", number: "(775) 555-" + String(1000 + Math.floor(Math.random() * 8999)).slice(0, 4) } as any],
            address: { street: "100 Example St", city: "Reno", state: "NV", zip: "89501" } as any,
            sex, race, maritalStatus: marital, rank, badgeNumber: badge,
            employmentStatus: "Active", specialSkills: [], assignment: unit,
            medical: emptyMedical(), lodd: emptyLodd(),
            supervisorIds: [], education: [], swornDate: swornDate,
            photoDataUrl: AVATAR_PEOPLE[personId] || null, documents: [], fieldHistory: []
        } as any));
        // a few realistic supervisor links and specialty skills / education for demo depth
        const byId: any = (id?: any): any => records.find((r?: any): any => r.personId === id);
        byId('p2').supervisorIds = ['p1'];
        byId('p3').supervisorIds = ['p1'];
        byId('p4').supervisorIds = ['p1'];
        byId('p6').supervisorIds = ['p5'];
        byId('p1').supervisorIds = ['p9'];
        byId('p5').supervisorIds = ['p9'];
        byId('p2').specialSkills = ["Spanish Fluency", "Field Training Officer"];
        byId('p6').specialSkills = ["K9 Handler", "Firearms Instructor"];
        byId('p4').specialSkills = ["Accident Reconstruction"];
        byId('p2').education = [{ degree: "A.A. Criminal Justice", institution: "Truckee Meadows CC", year: 2016 } as any];
        byId('p1').education = [{ degree: "B.S. Criminal Justice", institution: "University of Nevada, Reno", year: 2008 } as any];
        byId('p1').medical.vaccinations = [
            { name: "Hepatitis B", date: fmt(addDays(today, -800)), expirationDate: null, notes: "3-dose series complete" } as any,
            { name: "Influenza (Annual)", date: fmt(addDays(today, -200)), expirationDate: fmt(addDays(today, 165)), notes: "" } as any,
        ];
        byId('p6').medical.vaccinations = [
            { name: "Influenza (Annual)", date: fmt(addDays(today, -380)), expirationDate: fmt(addDays(today, -15)), notes: "Overdue for renewal" } as any,
        ];
        byId('p6').medical.injuryHistory = [{ date: fmt(addDays(today, -500)), description: "Shoulder strain during defensive tactics training.", notes: "Cleared for full duty after 3 weeks light duty." } as any];
        byId('p3').medical.exposureHistory = [{ date: fmt(addDays(today, -90)), type: "Bloodborne Pathogen Exposure", notes: "Exposure during arrest; follow-up bloodwork clear." } as any];
        return records;
    }
    function seedDisciplinary(): any {
        const today: any = new Date() as any;
        return [
            { id: "disc1", personId: "p6", type: "Written Reprimand", startDateTime: fmt(addDays(today, -120)) + "T09:00", endDateTime: fmt(addDays(today, -120)) + "T09:30",
                status: "Closed", rank: "Officer", evaluationDates: [fmt(addDays(today, -60))], history: ["Issued for policy violation regarding vehicle pursuit procedure.", "30-day follow-up review completed, no recurrence."], notes: "Follow-up review clean." } as any,
            { id: "disc2", personId: "p3", type: "Verbal Warning", startDateTime: fmt(addDays(today, -20)) + "T14:00", endDateTime: fmt(addDays(today, -20)) + "T14:15",
                status: "Active", rank: "Officer", evaluationDates: [fmt(addDays(today, 10))], history: ["Verbal counseling regarding tardiness."], notes: "" } as any,
            { id: "disc3", personId: "p4", type: "Suspension (Unpaid)", startDateTime: fmt(addDays(today, 5)) + "T00:00", endDateTime: fmt(addDays(today, 8)) + "T23:59",
                status: "Pending", rank: "Officer", evaluationDates: [], history: ["Pending IA review completion before suspension is served."], notes: "Awaiting union representative sign-off." } as any,
        ];
    }
    function seedInquiries(): any {
        const today: any = new Date() as any;
        return [
            { id: "inq1", personId: "p6", category: "Use of Force", date: fmt(addDays(today, -200)), caseRef: "UOF-2025-0114", summary: "Taser deployment during resisting-arrest incident.", outcome: "Within policy" } as any,
            { id: "inq2", personId: "p4", category: "Vehicle Pursuit", date: fmt(addDays(today, -45)), caseRef: "PUR-2026-0022", summary: "Pursuit terminated per policy after speeds exceeded threshold.", outcome: "Within policy" } as any,
            { id: "inq3", personId: "p3", category: "Citizen Complaint", date: fmt(addDays(today, -15)), caseRef: "CC-2026-0057", summary: "Complaint regarding tone during traffic stop.", outcome: "Under review" } as any,
            { id: "inq4", personId: "p2", category: "Vehicle Crash", date: fmt(addDays(today, -300)), caseRef: "CR-2025-0301", summary: "Minor at-fault collision with patrol vehicle, no injuries.", outcome: "Remedial driving training assigned" } as any,
        ];
    }
    function seedTrainingCourses(): any {
        return [
            { id: "crs1", name: "Annual Firearms Qualification", category: "Firearms", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 12 } as any,
            { id: "crs2", name: "CPR / First Aid Certification", category: "Medical / First Aid", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 24 } as any,
            { id: "crs3", name: "NCIC Certification", category: "Technology / RMS", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 24 } as any,
            { id: "crs4", name: "Defensive Tactics Refresher", category: "Defensive Tactics", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 12 } as any,
            { id: "crs5", name: "Emergency Vehicle Operations Course (EVOC)", category: "Driving / EVOC", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 36 } as any,
            { id: "crs6", name: "Crisis Intervention Training", category: "Specialty / Tactical", classification: "Recommended", isRequired: false, recertRequired: false, recertIntervalMonths: null } as any,
            { id: "crs7", name: "Supervisor Leadership Development", category: "Leadership", classification: "Recommended", isRequired: false, recertRequired: false, recertIntervalMonths: null } as any,
            { id: "crs8", name: "Legal Update: Use of Force Case Law", category: "Legal Update", classification: "Required", isRequired: true, recertRequired: true, recertIntervalMonths: 12 } as any,
        ];
    }
    function seedInstructors(): any {
        return [
            { id: "ins1", name: "Sgt. Maria Torres", bio: "Lead firearms and defensive tactics instructor.", coursesTaught: ["crs1", "crs4"] } as any,
            { id: "ins2", name: "Lt. Robert Hayes", bio: "SWAT tactics and leadership development.", coursesTaught: ["crs6", "crs7"] } as any,
            { id: "ins3", name: "External: Red Cross Trainer", bio: "Contracted CPR/First Aid certification provider.", coursesTaught: ["crs2"] } as any,
        ];
    }
    function seedTrainingRecords(): any {
        const today: any = new Date() as any;
        const rows: any = [
            ["p1", "crs1", -80, 4, 0, "Passed", 96, "Sgt. Maria Torres", 12],
            ["p2", "crs1", -80, 4, 0, "Passed", 91, "Sgt. Maria Torres", 12],
            ["p3", "crs1", -80, 4, 0, "Failed", 68, "Sgt. Maria Torres", 12],
            ["p4", "crs1", -400, 4, 0, "Passed", 94, "Sgt. Maria Torres", 12],
            ["p6", "crs1", -80, 4, 0, "Passed", 98, "Sgt. Maria Torres", 12],
            ["p2", "crs2", -600, 8, 85, "Passed", null, "External: Red Cross Trainer", 24],
            ["p3", "crs2", -600, 8, 85, "Passed", null, "External: Red Cross Trainer", 24],
            ["p1", "crs3", -700, 6, 0, "Passed", null, "In-House Instructor Cadre", 24],
            ["p4", "crs5", -1000, 16, 0, "Passed", null, "In-House Instructor Cadre", 36],
            ["p6", "crs4", -200, 8, 0, "Passed", 90, "Sgt. Maria Torres", 12],
            ["p5", "crs7", -300, 16, 250, "Passed", null, "In-House Instructor Cadre", null],
        ];
        return rows.map(([personId, courseId, daysAgo, hours, cost, result, score, provider, recertMonths]: any, i?: any): any => {
            const course: any = seedTrainingCourses().find((c?: any): any => c.id === courseId);
            const date: any = fmt(addDays(today, daysAgo));
            return {
                id: "tr" + (i + 1), personId, courseId, date, hours, cost,
                description: course.name, narrative: "", provider, location: TRAINING_LOCATIONS[i % TRAINING_LOCATIONS.length],
                score, passed: result === "Passed", method: "In-Person", attendedStatus: "Attended",
                recertRequired: !!recertMonths, recertDate: recertMonths ? fmt(addDays(new Date(date) as any, recertMonths * 30)) : null,
                documents: []
            } as any;
        });
    }
    function seedTrainingRequests(): any {
        const today: any = new Date() as any;
        return [
            { id: "treq1", personId: "p3", courseId: "crs6", requestDate: fmt(addDays(today, -5)), status: "Pending", notes: "Interested in CIT for patrol calls involving mental health crises." } as any,
            { id: "treq2", personId: "p2", courseId: "crs7", requestDate: fmt(addDays(today, -30)), status: "Approved", notes: "Approved ahead of upcoming Corporal promotion board." } as any,
        ];
    }
    function seedScheduleShifts(): any {
        return [
            { id: "shift1", name: "Patrol A - Days", daysOn: 4, daysOff: 3, hoursStart: "06:00", hoursEnd: "18:00" } as any,
            { id: "shift2", name: "Patrol B - Nights", daysOn: 4, daysOff: 3, hoursStart: "18:00", hoursEnd: "06:00" } as any,
            { id: "shift3", name: "Traffic - Standard", daysOn: 5, daysOff: 2, hoursStart: "07:00", hoursEnd: "15:00" } as any,
            { id: "shift4", name: "SWAT - On-Call Rotation", daysOn: 7, daysOff: 7, hoursStart: "00:00", hoursEnd: "23:59" } as any,
        ];
    }
    function seedScheduleAssignments(): any {
        const today: any = new Date() as any;
        return [
            { id: "sa1", personId: "p2", shiftId: "shift1", unit: "Patrol - A Shift", location: "North Substation", startDate: fmt(addDays(today, -60)), endDate: null } as any,
            { id: "sa2", personId: "p3", shiftId: "shift2", unit: "Patrol - B Shift", location: "South Substation", startDate: fmt(addDays(today, -60)), endDate: null } as any,
            { id: "sa3", personId: "p4", shiftId: "shift3", unit: "Traffic Unit", location: "Main Fleet Garage", startDate: fmt(addDays(today, -60)), endDate: null } as any,
            { id: "sa4", personId: "p6", shiftId: "shift4", unit: "SWAT", location: "Main Fleet Garage", startDate: fmt(addDays(today, -60)), endDate: null } as any,
            { id: "sa5", personId: "p1", shiftId: "shift1", unit: "Patrol - A Shift", location: "North Substation", startDate: fmt(addDays(today, -60)), endDate: null } as any,
        ];
    }
    /* =========================================================================
       STATE LIFECYCLE
       ========================================================================= */
    function buildData(): any {
        return {
            records: seedRecords(),
            disciplinaryActions: seedDisciplinary(),
            inquiries: seedInquiries(),
            trainingCourses: seedTrainingCourses(),
            trainingRecords: seedTrainingRecords(),
            trainingRequests: seedTrainingRequests(),
            trainingSessions: seedTrainingSessions(),
            trainingCheckins: [], // {id, sessionId, personId, checkedInAt, applied} -- self-owned QR check-in receipts, reviewed and applied to a session's roster by a training coordinator rather than writing to the shared roster directly
            instructors: seedInstructors(),
            scheduleShifts: seedScheduleShifts(),
            scheduleAssignments: seedScheduleAssignments(),
            scheduleCoverages: [],
            otCallbackOptIns: ["p2", "p3", "p6"],
            schedulingSettings: { fatigueThresholdHours: 16 } as any,
            bidCycles: [],
            extraDutyJobs: seedExtraDutyJobs(),
            extraDutySignups: [],
            rollCalls: [],
            refData: defaultRefData(),
            notifications: [],
            notifySettings: { disciplinaryExpiringRoleId: "role_admin", trainingExpiringRoleId: "role_admin", medicalDueRoleId: "role_admin" } as any,
            activity: [],
            dashboardPrefs: {} as any
        } as any;
    }
    function seedExtraDutyJobs(): any {
        const today: any = new Date() as any;
        return [
            { id: "ed1", employer: "Reno Events Center", description: "Stadium security detail - concert", location: "Reno Events Center, 400 N Center St",
                date: fmt(addDays(today, 12)), startTime: "17:00", endTime: "23:30", slots: 4, hourlyRate: 55,
                notes: "Marked patrol vehicle requested at main entrance. Coordinate with venue security supervisor on arrival.", status: "open" } as any,
        ];
    }
    function seedTrainingSessions(): any {
        const today: any = new Date() as any;
        const defs: any = [
            // [courseId, instructorId, location, daysFromToday, startTime, endTime, capacity, status, attendeePersonIds, rollCallStatuses]
            ["crs1", "ins1", "In-House Range", -80, "08:00", "12:00", 20, "Completed", ["p1", "p2", "p3", "p4", "p6"], ["Attended", "Attended", "No-Show", "Attended", "Attended"]],
            ["crs4", "ins1", "In-House Range", -14, "13:00", "17:00", 16, "Completed", ["p6"], ["Attended"]],
            ["crs6", "ins2", "Regional Training Academy", 10, "08:00", "16:00", 24, "Scheduled", ["p2"], ["Confirmed"]],
            ["crs7", "ins2", "Off-Site Vendor Facility", 21, "09:00", "15:00", 12, "Scheduled", ["p5"], ["Enrolled"]],
            ["crs2", "ins3", "Online / LMS", 5, "10:00", "14:00", 30, "Scheduled", [], []],
            ["crs8", "ins2", "Main Fleet Garage Classroom", -3, "09:00", "11:00", 40, "Completed", ["p1", "p2", "p3", "p4", "p5", "p6"], ["Attended", "Attended", "Attended", "Excused", "Attended", "Attended"]],
            ["crs1", "ins1", "In-House Range", 45, "08:00", "12:00", 20, "Scheduled", [], []],
        ];
        return defs.map(([courseId, instructorId, location, daysFromToday, startTime, endTime, capacity, status, attendees, rollCall]: any, i?: any): any => ({
            id: "sess" + (i + 1), courseId, instructorId, location,
            date: fmt(addDays(today, daysFromToday)), startTime, endTime, capacity, status, notes: "",
            roster: attendees.map((personId?: any, j?: any): any => ({ personId, status: rollCall[j] || "Enrolled", requestId: null } as any))
        } as any));
    }
    function migrateData(): any {
        if (!STATE.pm.refData)
            STATE.pm.refData = defaultRefData();
        if (!STATE.pm.notifications)
            STATE.pm.notifications = [];
        if (!STATE.pm.dashboardPrefs)
            STATE.pm.dashboardPrefs = {} as any;
        if (!STATE.pm.notifySettings)
            STATE.pm.notifySettings = { disciplinaryExpiringRoleId: STATE.roles[0].id, trainingExpiringRoleId: STATE.roles[0].id, medicalDueRoleId: STATE.roles[0].id } as any;
        if (!STATE.pm.inquiries)
            STATE.pm.inquiries = [];
        if (!STATE.pm.trainingRequests)
            STATE.pm.trainingRequests = [];
        if (!STATE.pm.trainingSessions)
            STATE.pm.trainingSessions = [];
        if (!STATE.pm.trainingCheckins)
            STATE.pm.trainingCheckins = [];
        STATE.pm.trainingRequests.forEach((r?: any): any => {
            if (r.sessionId === undefined)
                r.sessionId = null;
            if (r.reviewedBy === undefined)
                r.reviewedBy = null;
            if (r.reviewDate === undefined)
                r.reviewDate = null;
            if (r.reviewNotes === undefined)
                r.reviewNotes = "";
        });
        STATE.pm.trainingSessions.forEach((s?: any): any => {
            if (!s.roster)
                s.roster = [];
            if (s.capacity === undefined)
                s.capacity = null;
            if (s.notes === undefined)
                s.notes = "";
            if (s.address === undefined)
                s.address = "";
        });
        if (STATE.pm.refData && Array.isArray(STATE.pm.refData.trainingLocations) && STATE.pm.refData.trainingLocations.some((l?: any): any => typeof l === 'string')) {
            // Pre-existing tenants had training locations as plain strings; upgrade in place to
            // {name,address} objects (address starts blank, an admin fills it in once) without losing
            // any location already in use by a session or training record, which still match on name.
            STATE.pm.refData.trainingLocations = STATE.pm.refData.trainingLocations.map((l?: any): any => typeof l === 'string' ? { name: l, address: '' } as any : l);
        }
        if (!STATE.pm.instructors)
            STATE.pm.instructors = [];
        if (!STATE.pm.scheduleShifts)
            STATE.pm.scheduleShifts = [];
        if (!STATE.pm.scheduleAssignments)
            STATE.pm.scheduleAssignments = [];
        if (!STATE.pm.scheduleExceptions)
            STATE.pm.scheduleExceptions = [];
        if (!STATE.pm.shiftSwapRequests)
            STATE.pm.shiftSwapRequests = [];
        if (!STATE.pm.scheduleCoverages)
            STATE.pm.scheduleCoverages = [];
        if (!STATE.pm.otCallbackOptIns)
            STATE.pm.otCallbackOptIns = [];
        if (!STATE.pm.bidCycles)
            STATE.pm.bidCycles = [];
        if (!STATE.pm.extraDutyJobs)
            STATE.pm.extraDutyJobs = [];
        if (!STATE.pm.extraDutySignups)
            STATE.pm.extraDutySignups = [];
        if (!STATE.pm.rollCalls)
            STATE.pm.rollCalls = [];
        if (!STATE.pm.schedulingSettings)
            STATE.pm.schedulingSettings = { fatigueThresholdHours: 16 } as any;
        if (STATE.pm.schedulingSettings.fatigueThresholdHours === undefined)
            STATE.pm.schedulingSettings.fatigueThresholdHours = 16;
        STATE.pm.bidCycles.forEach((c?: any): any => {
            if (!c.submissions)
                c.submissions = [];
            if (!c.awards)
                c.awards = [];
            if (c.status === undefined)
                c.status = 'open';
        });
        STATE.pm.extraDutyJobs.forEach((j?: any): any => { if (j.status === undefined)
            j.status = 'open'; });
        STATE.pm.extraDutySignups.forEach((s?: any): any => { if (s.status === undefined)
            s.status = 'pending'; });
        STATE.pm.rollCalls.forEach((rc?: any): any => { if (!rc.entries)
            rc.entries = []; if (rc.briefingNotes === undefined)
            rc.briefingNotes = ''; });
        STATE.pm.records.forEach((r?: any): any => {
            if (!r.medical)
                r.medical = emptyMedical();
            if (!r.lodd)
                r.lodd = emptyLodd();
            if (!r.documents)
                r.documents = [];
            if (!r.fieldHistory)
                r.fieldHistory = [];
            if (!r.education)
                r.education = [];
            if (!r.supervisorIds)
                r.supervisorIds = [];
            if (!r.specialSkills)
                r.specialSkills = [];
            if (!r.promotionHistory)
                r.promotionHistory = [];
            if (r.terminationDate === undefined)
                r.terminationDate = null;
        });
    }
    function logActivity(text?: any, entityType?: any, entityId?: any): any {
        STATE.pm.activity.push({ ts: fmt(new Date() as any), text, entityType: entityType || "general", entityId: entityId || null } as any);
        logAuditEntry('Personnel', text, entityType);
    }
    function recordFor(personId?: any): any { return STATE.pm.records.find((r?: any): any => r.personId === personId); }
    function ensureRecord(personId?: any): any {
        let r: any = recordFor(personId);
        if (!r) {
            r = { personId, agency: STATE.pm.refData.agencies ? STATE.pm.refData.agencies[0] : "Reno PD - Patrol Division",
                employeeId: "", unitId: "", driversLicense: { number: "", licenseClass: "", state: "", expiration: "" } as any,
                hireDate: "", terminationDate: null, promotionHistory: [], bloodType: "Unknown", phones: [], address: { street: "", city: "", state: "", zip: "" } as any,
                sex: "Undisclosed", race: "Undisclosed", maritalStatus: "Undisclosed", rank: "", badgeNumber: "", employmentStatus: "Active",
                specialSkills: [], assignment: "", medical: emptyMedical(), lodd: emptyLodd(), supervisorIds: [], education: [], swornDate: "",
                photoDataUrl: null, documents: [], fieldHistory: [] } as any;
            STATE.pm.records.push(r);
        }
        return r;
    }
    /* records a before/after change for the audit trail on the record itself */
    function recordFieldChange(record?: any, field?: any, oldVal?: any, newVal?: any): any {
        if (JSON.stringify(oldVal) === JSON.stringify(newVal))
            return;
        record.fieldHistory.push({
            date: fmt(new Date() as any), field, before: oldVal, after: newVal,
            changedBy: (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || 'System'
        } as any);
    }
    /* =========================================================================
       NAV
       ========================================================================= */
    const NAV_ITEMS: any = [
        { id: "pm-dashboard", label: "Dashboard", icon: "dashboard", title: "Dashboard", sub: "Workforce status at a glance", requiredAbility: null } as any,
        { id: "pm-records", label: "Personnel Records", icon: "idcard", title: "Personnel Records", sub: "Complete HR record for every employee", requiredAbility: "pm_records_view" } as any,
        { id: "pm-disciplinary", label: "Disciplinary", icon: "alert", title: "Disciplinary Actions", sub: "Track disciplinary actions and pending expirations", requiredAbility: "pm_discipline_view" } as any,
        { id: "pm-training", label: "Training", icon: "award", title: "Training & Certifications", sub: "Courses, records, requests, and instructors", requiredAbility: ["pm_training_view_own", "pm_training_manage", "pm_training_request", "pm_instructor_manage"] } as any,
        { id: "pm-scheduling", label: "Scheduling", icon: "calendar", title: "Scheduling & Duty Roster", sub: "Shift patterns, coverage, bidding, extra duty, and roll call", requiredAbility: ["pm_schedule_view", "pm_overtime_view", "pm_bidding_view", "pm_extraduty_view", "pm_rollcall_view"] } as any,
        { id: "pm-reports", label: "Reports", icon: "chart", title: "Reports & Analytics", sub: "Configurable reporting across the personnel record", requiredAbility: "pm_reports_view" } as any,
        { id: "pm-admin", label: "Admin", icon: "gear", title: "Administration", sub: "Reference data and the system audit log", requiredAbility: ["pm_admin_categories", "pm_admin_audit"] } as any,
    ];
    let ACTIVE_VIEW: any = "pm-dashboard";
    function navItemVisible(item?: any): any {
        if (!can('module_personnel'))
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
    function renderView(id?: any): any {
        if (id === "pm-dashboard")
            renderDashboard();
        else if (id === "pm-records")
            renderRecords();
        else if (id === "pm-disciplinary")
            renderDisciplinary();
        else if (id === "pm-training")
            renderTraining();
        else if (id === "pm-scheduling")
            renderScheduling();
        else if (id === "pm-reports")
            renderReports();
        else if (id === "pm-admin")
            renderAdmin();
    }
    /* =========================================================================
       NOTIFICATIONS: disciplinary evaluation dates, cert/training expirations, medical
       ========================================================================= */
    function recalcNotifications(): any {
        const today: any = new Date() as any;
        const upcoming: any = [];
        STATE.pm.disciplinaryActions.forEach((d?: any): any => {
            if (d.status !== "Closed") {
                d.evaluationDates.forEach((ed?: any): any => {
                    const days: any = daysBetween(fmt(today), ed);
                    if (days <= 14) {
                        upcoming.push({ type: "discipline_eval", entityId: d.id, message: `${personName(d.personId)}'s ${d.type} evaluation ${days < 0 ? 'was due ' + Math.abs(days) + ' days ago' : 'is due in ' + days + ' days'} (${ed}).`, recipientRoleId: STATE.pm.notifySettings.disciplinaryExpiringRoleId } as any);
                    }
                });
            }
        });
        STATE.pm.trainingRecords.forEach((t?: any): any => {
            if (t.recertRequired && t.recertDate) {
                const days: any = daysBetween(fmt(today), t.recertDate);
                if (days <= 30) {
                    upcoming.push({ type: "training_expiring", entityId: t.id, message: `${personName(t.personId)}'s "${t.description}" recertification ${days < 0 ? 'expired ' + Math.abs(days) + ' days ago' : 'is due in ' + days + ' days'} (${t.recertDate}).`, recipientRoleId: STATE.pm.notifySettings.trainingExpiringRoleId } as any);
                }
            }
        });
        STATE.pm.records.forEach((r?: any): any => {
            (r.medical.vaccinations || []).forEach((v?: any): any => {
                if (v.expirationDate) {
                    const days: any = daysBetween(fmt(today), v.expirationDate);
                    if (days <= 30) {
                        upcoming.push({ type: "medical_due", entityId: r.personId, message: `${personName(r.personId)}'s ${v.name} ${days < 0 ? 'expired ' + Math.abs(days) + ' days ago' : 'is due in ' + days + ' days'} (${v.expirationDate}).`, recipientRoleId: STATE.pm.notifySettings.medicalDueRoleId } as any);
                    }
                }
            });
            if (r.driversLicense && r.driversLicense.expiration) {
                const days: any = daysBetween(fmt(today), r.driversLicense.expiration);
                if (days <= 30) {
                    upcoming.push({ type: "medical_due", entityId: r.personId, message: `${personName(r.personId)}'s driver's license ${days < 0 ? 'expired ' + Math.abs(days) + ' days ago' : 'expires in ' + days + ' days'} (${r.driversLicense.expiration}).`, recipientRoleId: STATE.pm.notifySettings.medicalDueRoleId } as any);
                }
            }
        });
        const prevReadBy: any = {} as any;
        STATE.pm.notifications.forEach((n?: any): any => { prevReadBy[n.type + '|' + n.entityId] = n.readBy || []; });
        STATE.pm.notifications = upcoming.map((n?: any): any => ({
            id: n.type + '_' + n.entityId, ts: fmt(today),
            type: n.type, entityId: n.entityId, message: n.message, recipientRoleId: n.recipientRoleId,
            readBy: prevReadBy[n.type + '|' + n.entityId] || []
        } as any));
    }
    function lockedNote(msg?: any): any { return `<div class="locked-note">${ICONS.lock}<div>${msg}</div></div>`; }
    function permissionBlockedView(msg?: any): any {
        return `<div class="panel"><div class="panel-body">
    <div class="empty-state">${ICONS.lock}<div class="msg">Access restricted</div><div class="sub">${msg}</div></div>
  </div></div>`;
    }
    function statusBadgeClass(status?: any): any {
        return ({
            "Active": "badge-available", "On Leave": "badge-assigned", "Suspended": "badge-missing", "Terminated": "badge-missing", "Retired": "badge-role",
            "Closed": "badge-available", "Pending": "badge-assigned", "Passed": "badge-available", "Failed": "badge-missing", "Approved": "badge-available", "Denied": "badge-missing"
        } as any)[status] || "badge-role";
    }
    function recordLink(personId?: any): any {
        return `<a href="#" data-open-record="${personId}" class="record-link">${escapeHtml(personName(personId))}</a>`;
    }
    function wireRecordLinks(): any {
        (document as any).querySelectorAll('[data-open-record]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openRecordDetail(a.dataset.openRecord); }));
    }
    /* =========================================================================
       DASHBOARD
       ========================================================================= */
    const TOP_WIDGETS: any = [
        { id: "stat_active_personnel", label: "Active Personnel" } as any,
        { id: "stat_open_discipline", label: "Open Disciplinary Actions" } as any,
        { id: "stat_certs_expiring", label: "Certifications Expiring Soon" } as any,
        { id: "stat_pending_training", label: "Pending Training Requests" } as any,
    ];
    const EXTRA_WIDGETS: any = [
        { id: "list_discipline_due", label: "Disciplinary Evaluations Due", defaultSize: "half" } as any,
        { id: "list_certs_due", label: "Certifications / Recert Due", defaultSize: "half" } as any,
        { id: "chart_inquiries_by_category", label: "RMS-Data Inquiries by Category", defaultSize: "full" } as any,
    ];
    const DEFAULT_EXTRAS: any = EXTRA_WIDGETS.map((w?: any): any => ({ id: w.id, size: w.defaultSize } as any));
    let CHART_REFS_PM: any = {} as any;
    function destroyChartsPm(): any { (Object.values(CHART_REFS_PM) as any).forEach((c?: any): any => c && c.destroy()); CHART_REFS_PM = {} as any; }
    function myWidgetPrefs(): any {
        let p: any = STATE.pm.dashboardPrefs[CURRENT_USER_ID];
        const topIds: any = TOP_WIDGETS.map((w?: any): any => w.id), extraIds: any = EXTRA_WIDGETS.map((w?: any): any => w.id);
        if (!p || (!p.topOrder && !p.extras)) {
            p = { topOrder: [...topIds], extras: DEFAULT_EXTRAS.map((e?: any): any => ({ ...e } as any)) } as any;
            STATE.pm.dashboardPrefs[CURRENT_USER_ID] = p;
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
        const records: any = STATE.pm.records;
        if (id === 'stat_active_personnel') {
            const active: any = records.filter((r?: any): any => r.employmentStatus === "Active").length;
            const onLeave: any = records.filter((r?: any): any => r.employmentStatus === "On Leave").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="pm-records"><div class="label">Active Personnel</div><div class="value">${active}</div><div class="delta neutral">${onLeave} on leave</div></button>`;
        }
        if (id === 'stat_open_discipline') {
            const openDiscipline: any = STATE.pm.disciplinaryActions.filter((d?: any): any => d.status !== "Closed").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="pm-disciplinary"><div class="label">Open Disciplinary Actions</div><div class="value" style="color:${openDiscipline ? 'var(--red)' : 'var(--navy)'}">${openDiscipline}</div><div class="delta ${openDiscipline ? 'warn' : 'ok'}">${openDiscipline ? 'Needs review' : 'All clear'}</div></button>`;
        }
        if (id === 'stat_certs_expiring') {
            const trainingExpiring: any = STATE.pm.notifications.filter((n?: any): any => n.type === "training_expiring").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="pm-training"><div class="label">Certifications Expiring Soon</div><div class="value" style="color:${trainingExpiring ? 'var(--red)' : 'var(--navy)'}">${trainingExpiring}</div><div class="delta ${trainingExpiring ? 'warn' : 'ok'}">Within 30 days</div></button>`;
        }
        if (id === 'stat_pending_training') {
            const pendingRequests: any = STATE.pm.trainingRequests.filter((r?: any): any => r.status === "Pending").length;
            return `<button class="stat-card dash-clickable" data-nav-dest="pm-training"><div class="label">Pending Training Requests</div><div class="value">${pendingRequests}</div><div class="delta neutral">Awaiting decision</div></button>`;
        }
        if (id === 'list_discipline_due') {
            const upcomingDiscipline: any = STATE.pm.notifications.filter((n?: any): any => n.type === "discipline_eval").slice(0, 6);
            const rows: any = upcomingDiscipline.map((n?: any): any => `<tr><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`).join('') || `<tr><td style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Disciplinary Evaluations Due</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'list_certs_due') {
            const upcomingTraining: any = STATE.pm.notifications.filter((n?: any): any => n.type === "training_expiring").slice(0, 6);
            const rows: any = upcomingTraining.map((n?: any): any => `<tr><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`).join('') || `<tr><td style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due.</td></tr>`;
            return `<div class="panel"><div class="panel-head"><h2>Certifications / Recert Due</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
        }
        if (id === 'chart_inquiries_by_category') {
            return `<div class="panel"><div class="panel-head"><h2>RMS-Data Inquiries by Category</h2><span class="hint">Early-intervention style tracking \u2014 see note in Reports</span></div><div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartInquiries"></canvas></div></div></div>`;
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
            logActivity(`Customized personal Personnel dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
            persist();
            toast("Dashboard saved.");
            closeModal();
            renderDashboard();
        };
    }
    function renderDashboard(): any {
        recalcNotifications();
        const prefs: any = myWidgetPrefs();
        const root: any = (document as any).getElementById('view-pm-dashboard');
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
        root.querySelectorAll('[data-nav-dest]').forEach((b?: any): any => b.addEventListener('click', (): any => switchView(b.dataset.navDest)));
        destroyChartsPm();
        if (prefs.extras.some((e?: any): any => e.id === 'chart_inquiries_by_category')) {
            const inquiryByCategory: any = {} as any;
            STATE.pm.refData.inquiryCategories.forEach((c?: any): any => inquiryByCategory[c] = 0);
            STATE.pm.inquiries.forEach((i?: any): any => inquiryByCategory[i.category] = (inquiryByCategory[i.category] || 0) + 1);
            const blue: any = '#134DD1';
            CHART_REFS_PM.inquiries = safeChart('chartInquiries', {
                type: 'bar',
                data: { labels: Object.keys(inquiryByCategory) as any, datasets: [{ label: 'Inquiries', data: Object.values(inquiryByCategory) as any, backgroundColor: blue } as any] } as any,
                options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any, grid: { color: chartGridColor() } as any } as any } as any } as any
            } as any);
        }
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
       PERSONNEL RECORDS
       ========================================================================= */
    let RECORDS_FILTER: any = { q: "", rank: "All", unit: "All", status: "All" } as any;
    let RECORDS_SORT: any = { key: 'name', dir: 'asc' } as any;
    function renderRecords(): any {
        const canView: any = can('pm_records_view');
        const canEdit: any = can('pm_records_edit');
        const canDelete: any = can('pm_records_delete');
        if (!canView) {
            (document as any).getElementById('view-pm-records').innerHTML = permissionBlockedView("You don't have permission to view personnel records in this role.");
            return;
        }
        const f: any = RECORDS_FILTER;
        let rows: any = STATE.pm.records.filter((r?: any): any => {
            const q: any = f.q.toLowerCase();
            const name: any = personName(r.personId).toLowerCase();
            const matchQ: any = !q || name.includes(q) || (r.badgeNumber || '').toLowerCase().includes(q) || (r.employeeId || '').toLowerCase().includes(q);
            const matchRank: any = f.rank === "All" || r.rank === f.rank;
            const matchUnit: any = f.unit === "All" || r.unitId === f.unit;
            const matchStatus: any = f.status === "All" || r.employmentStatus === f.status;
            return matchQ && matchRank && matchUnit && matchStatus;
        });
        const s: any = RECORDS_SORT;
        rows.sort((a?: any, b?: any): any => {
            const av: any = s.key === 'name' ? personName(a.personId).toLowerCase() : String(a[s.key] || '').toLowerCase();
            const bv: any = s.key === 'name' ? personName(b.personId).toLowerCase() : String(b[s.key] || '').toLowerCase();
            if (av < bv)
                return s.dir === 'asc' ? -1 : 1;
            if (av > bv)
                return s.dir === 'asc' ? 1 : -1;
            return 0;
        });
        const trs: any = rows.map((r?: any): any => `
    <tr>
      <td>${r.photoDataUrl ? `<img src="${r.photoDataUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;">` : `<div style="width:32px;height:32px;border-radius:50%;background:var(--lightgray);display:inline-flex;align-items:center;justify-content:center;color:var(--text-dim);vertical-align:middle;">${ICONS.idcard}</div>`}</td>
      <td>${recordLink(r.personId)}</td>
      <td class="mono">${escapeHtml(r.badgeNumber)}</td>
      <td>${escapeHtml(r.rank)}</td>
      <td>${escapeHtml(r.unitId)}</td>
      <td><span class="badge ${statusBadgeClass(r.employmentStatus)}">${r.employmentStatus}</span></td>
      <td>${r.hireDate || '—'}</td>
      <td>
        <div class="cell-actions">
          ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-record="${r.personId}">${ICONS.edit} Edit</button>` : ''}
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-record="${r.personId}">${ICONS.trash} Delete</button>` : ''}
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No records match this filter.</td></tr>`;
        (document as any).getElementById('view-pm-records').innerHTML = `
    ${!canEdit ? lockedNote("You're viewing personnel records in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="recSearch" title="Filters the roster below as you type, matching name, badge number, or employee ID" placeholder="Search name, badge, employee ID..." style="width:230px;" value="${escapeHtml(f.q)}">
        <select id="recRank" title="Filter personnel records to a single rank"><option ${f.rank === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.ranks.map((r?: any): any => `<option ${f.rank === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}</select>
        <select id="recUnit" title="Filter personnel records to a single unit"><option ${f.unit === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.units.map((u?: any): any => `<option ${f.unit === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}</select>
        <select id="recStatus" title="Filter personnel records to a single employment status"><option ${f.status === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.employmentStatuses.map((st?: any): any => `<option ${f.status === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}</select>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="btnAddRecord">${ICONS.plus} Add Personnel Record</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          <th></th>${sortHeaderHtmlPm(fieldLabel('pm.name'), 'name')}${sortHeaderHtmlPm(fieldLabel('pm.badgeNumber'), 'badgeNumber')}${sortHeaderHtmlPm(fieldLabel('pm.rank'), 'rank')}${sortHeaderHtmlPm(fieldLabel('pm.unit'), 'unitId')}${sortHeaderHtmlPm(fieldLabel('pm.employmentStatus'), 'employmentStatus')}${sortHeaderHtmlPm(fieldLabel('pm.hireDate'), 'hireDate')}<th>Actions</th>
        </tr></thead><tbody>${trs}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Showing ${rows.length} of ${STATE.pm.records.length} personnel records &bull; click a name for the full record</div>
  `;
        ['recSearch'].forEach((id?: any): any => (document as any).getElementById(id).addEventListener('input', (e?: any): any => { RECORDS_FILTER.q = e.target.value; renderRecords(); refocusFilterInput('recSearch'); }));
        (document as any).getElementById('recRank').addEventListener('change', (e?: any): any => { RECORDS_FILTER.rank = e.target.value; renderRecords(); });
        (document as any).getElementById('recUnit').addEventListener('change', (e?: any): any => { RECORDS_FILTER.unit = e.target.value; renderRecords(); });
        (document as any).getElementById('recStatus').addEventListener('change', (e?: any): any => { RECORDS_FILTER.status = e.target.value; renderRecords(); });
        const addBtn: any = (document as any).getElementById('btnAddRecord');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openAddPersonWithRecordModal());
        (document as any).querySelectorAll('[data-edit-record]').forEach((b?: any): any => b.addEventListener('click', (): any => openRecordEditModal(b.dataset.editRecord)));
        (document as any).querySelectorAll('[data-del-record]').forEach((b?: any): any => b.addEventListener('click', (): any => deleteRecord(b.dataset.delRecord)));
        wireRecordLinks();
    }
    function sortHeaderHtmlPm(label?: any, key?: any): any {
        const s: any = RECORDS_SORT;
        const active: any = s.key === key;
        const arrow: any = active ? (s.dir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;';
        return `<th class="sortable ${active ? 'sort-active' : ''}" data-sort-key="${key}">${label}<span class="arrow">${arrow}</span></th>`;
    }
    (document as any).addEventListener('click', (e?: any): any => {
        const th: any = e.target.closest && e.target.closest('[data-sort-key]');
        if (th && (document as any).getElementById('view-pm-records') && (document as any).getElementById('view-pm-records').contains(th)) {
            const key: any = th.dataset.sortKey;
            if (RECORDS_SORT.key === key)
                RECORDS_SORT.dir = RECORDS_SORT.dir === 'asc' ? 'desc' : 'asc';
            else {
                RECORDS_SORT.key = key;
                RECORDS_SORT.dir = 'asc';
            }
            renderRecords();
        }
    });
    function openAddPersonWithRecordModal(): any {
        (document as any).getElementById('modalBox').className = 'modal';
        const unlinked: any = STATE.personnel.filter((p?: any): any => !recordFor(p.id));
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Personnel Record</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="display:flex;gap:16px;margin-bottom:14px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="fRecMode" value="existing" checked style="width:auto;"> Link an existing person</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="fRecMode" value="new" style="width:auto;"> Add a brand-new person</label>
      </div>
      <div id="fRecExistingFields">
        <div class="form-row"><label>Person</label>
          <select id="fRecPerson">${unlinked.length ? unlinked.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') : `<option value="">-- everyone already has a record --</option>`}</select>
        </div>
        <div style="font-size:12px;color:var(--text-dim);">Links a full HR record to someone already in the shared roster.</div>
      </div>
      <div id="fRecNewFields" style="display:none;">
        <div class="form-2col">
          <div class="form-row"><label>First name</label><input type="text" id="fRecFirstName"></div>
          <div class="form-row"><label>Last name</label><input type="text" id="fRecLastName"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Badge / ID #</label><input type="text" id="fRecBadge"></div>
          <div class="form-row"><label>Email</label><input type="text" id="fRecEmail" placeholder="name@agency.gov"></div>
        </div>
        <div class="form-row"><label>Unit</label><input type="text" id="fRecUnit"></div>
        <div style="font-size:12px;color:var(--text-dim);">Creates their Directory identity and this HR record together -- they'll also show up in the shared roster right away.</div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mNext" ${unlinked.length ? '' : 'disabled'}>Continue</button>
    </div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[name="fRecMode"]').forEach((radio?: any): any => radio.addEventListener('change', (): any => {
            const isNew: any = (document as any).querySelector('[name="fRecMode"]:checked').value === 'new';
            (document as any).getElementById('fRecExistingFields').style.display = isNew ? 'none' : '';
            (document as any).getElementById('fRecNewFields').style.display = isNew ? '' : 'none';
            (document as any).getElementById('mNext').disabled = isNew ? false : !unlinked.length;
        }));
        (document as any).getElementById('mNext').onclick = (): any => {
            const isNew: any = (document as any).querySelector('[name="fRecMode"]:checked').value === 'new';
            if (isNew) {
                const firstName: any = (document as any).getElementById('fRecFirstName').value.trim();
                const lastName: any = (document as any).getElementById('fRecLastName').value.trim();
                if (!firstName || !lastName) {
                    toast("Enter a first and last name.", true);
                    return;
                }
                const { person }: any = createPersonAndRecord({
                    name: `${firstName} ${lastName}`, badge: (document as any).getElementById('fRecBadge').value.trim(),
                    email: (document as any).getElementById('fRecEmail').value.trim(), unit: (document as any).getElementById('fRecUnit').value.trim(),
                    roleIds: ['role_officer']
                } as any);
                logAuditEntry('Shared', `Added new personnel record for "${person.name}" from Personnel Administration.`, 'personnel');
                openRecordEditModal(person.id);
                return;
            }
            const personId: any = (document as any).getElementById('fRecPerson').value;
            if (!personId)
                return;
            ensureRecord(personId);
            openRecordEditModal(personId);
        };
    }
    function openRecordEditModal(personId?: any): any {
        const r: any = ensureRecord(personId);
        const before: any = JSON.parse(JSON.stringify(r));
        let pendingPhoto: any = r.photoDataUrl || null;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Personnel Record — ${escapeHtml(personName(personId))}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${photoDropZoneHtml('fPmPhoto', r.photoDataUrl, { label: 'Photo', round: true, placeholderIcon: ICONS.idcard } as any)}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Employment</h2></div><div class="panel-body">
        <div class="form-2col">
          <div class="form-row"><label>Agency</label><select id="fAgencyPm">${STATE.pm.refData.agencies.map((a?: any): any => `<option ${r.agency === a ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Employee ID</label><input type="text" id="fEmployeeId" value="${escapeHtml(r.employeeId || '')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Unit / Assignment ID</label><select id="fUnitId">${STATE.pm.refData.units.map((u?: any): any => `<option ${r.unitId === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Current Assignment (free text)</label><input type="text" id="fAssignment" value="${escapeHtml(r.assignment || '')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Rank</label><select id="fRank">${STATE.pm.refData.ranks.map((rk?: any): any => `<option ${r.rank === rk ? 'selected' : ''}>${escapeHtml(rk)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Badge Number</label><input type="text" id="fBadgeNum" value="${escapeHtml(r.badgeNumber || '')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Employment Status</label><select id="fEmpStatus">${STATE.pm.refData.employmentStatuses.map((st?: any): any => `<option ${r.employmentStatus === st ? 'selected' : ''}>${escapeHtml(st)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Supervisor(s)</label>
            <div style="border:1px solid var(--border);border-radius:5px;padding:6px 10px;max-height:100px;overflow-y:auto;">
              ${STATE.personnel.filter((p?: any): any => p.id !== personId).map((p?: any): any => `<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;padding:2px 0;"><input type="checkbox" class="fSupervisor" value="${p.id}" ${r.supervisorIds.includes(p.id) ? 'checked' : ''} style="width:auto;">${escapeHtml(p.name)}</label>`).join('')}
            </div>
          </div>
        </div>
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>Hire Date</label><input type="date" id="fHireDate" value="${r.hireDate || ''}"></div>
          <div class="form-row"><label>Sworn Date</label><input type="date" id="fSwornDate" value="${r.swornDate || ''}"></div>
          <div class="form-row"><label>Termination / Separation Date</label><input type="date" id="fTermDate" value="${r.terminationDate || ''}"></div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Identity &amp; Demographics</h2></div><div class="panel-body">
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>Sex</label><select id="fSex">${SEX_OPTIONS.map((o?: any): any => `<option ${r.sex === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Race</label><select id="fRace">${RACE_OPTIONS.map((o?: any): any => `<option ${r.race === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Marital Status</label><select id="fMarital">${MARITAL_OPTIONS.map((o?: any): any => `<option ${r.maritalStatus === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Blood Type</label><select id="fBloodType">${BLOOD_TYPES.map((o?: any): any => `<option ${r.bloodType === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Phone Number</label><input type="text" id="fPhone" value="${escapeHtml((r.phones[0] || {} as any).number || '')}" placeholder="(555) 555-5555"></div>
        </div>
        <div class="form-row"><label>Address</label>
          <div class="form-2col">
            <input type="text" id="fAddrStreet" value="${escapeHtml(r.address.street || '')}" placeholder="Street">
            <input type="text" id="fAddrCity" value="${escapeHtml(r.address.city || '')}" placeholder="City">
          </div>
          <div class="form-2col" style="margin-top:8px;">
            <input type="text" id="fAddrState" value="${escapeHtml(r.address.state || '')}" placeholder="State">
            <input type="text" id="fAddrZip" value="${escapeHtml(r.address.zip || '')}" placeholder="ZIP">
          </div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Driver's License</h2></div><div class="panel-body">
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>License Number</label><input type="text" id="fDlNumber" value="${escapeHtml(r.driversLicense.number || '')}"></div>
          <div class="form-row"><label>Class</label><select id="fDlClass">${LICENSE_CLASSES.map((c?: any): any => `<option ${r.driversLicense.licenseClass === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="form-row"><label>Expiration</label><input type="date" id="fDlExpiration" value="${r.driversLicense.expiration || ''}"></div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Special Skills</h2></div><div class="panel-body">
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${STATE.pm.refData.skillsCatalog.map((sk?: any): any => `<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;"><input type="checkbox" class="fSkill" value="${escapeHtml(sk)}" ${r.specialSkills.includes(sk) ? 'checked' : ''} style="width:auto;">${escapeHtml(sk)}</label>`).join('')}
        </div>
      </div></div>

      <div style="font-size:12px;color:var(--text-dim);">Promotion history, medical/vaccination data, disciplinary actions, training, inquiries, documents, and LODD information are managed from their own tabs on the full record — open the record after saving to reach them.</div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-outline" id="mCancel">Cancel</button>
      <button class="btn btn-primary" id="mSave">Save Record</button>
    </div>
  `;
        openModal();
        wirePhotoDropZone('fPmPhoto', (dataUrl?: any): any => { pendingPhoto = dataUrl; });
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const newRank: any = (document as any).getElementById('fRank').value;
            if (newRank !== r.rank) {
                const last: any = r.promotionHistory[r.promotionHistory.length - 1];
                if (last && !last.endDate)
                    last.endDate = fmt(new Date() as any);
                r.promotionHistory.push({ rank: newRank, startDate: fmt(new Date() as any), endDate: null } as any);
            }
            recordFieldChange(r, 'employmentStatus', r.employmentStatus, (document as any).getElementById('fEmpStatus').value);
            recordFieldChange(r, 'unitId', r.unitId, (document as any).getElementById('fUnitId').value);
            recordFieldChange(r, 'rank', r.rank, newRank);
            Object.assign(r, {
                photoDataUrl: pendingPhoto,
                agency: (document as any).getElementById('fAgencyPm').value,
                employeeId: (document as any).getElementById('fEmployeeId').value.trim(),
                unitId: (document as any).getElementById('fUnitId').value,
                assignment: (document as any).getElementById('fAssignment').value.trim(),
                rank: newRank,
                badgeNumber: (document as any).getElementById('fBadgeNum').value.trim(),
                employmentStatus: (document as any).getElementById('fEmpStatus').value,
                supervisorIds: Array.from((document as any).querySelectorAll('.fSupervisor:checked')).map((el?: any): any => el.value),
                hireDate: (document as any).getElementById('fHireDate').value,
                swornDate: (document as any).getElementById('fSwornDate').value,
                terminationDate: (document as any).getElementById('fTermDate').value || null,
                sex: (document as any).getElementById('fSex').value,
                race: (document as any).getElementById('fRace').value,
                maritalStatus: (document as any).getElementById('fMarital').value,
                bloodType: (document as any).getElementById('fBloodType').value,
                phones: [{ type: "Mobile", number: (document as any).getElementById('fPhone').value.trim() } as any],
                address: { street: (document as any).getElementById('fAddrStreet').value.trim(), city: (document as any).getElementById('fAddrCity').value.trim(), state: (document as any).getElementById('fAddrState').value.trim(), zip: (document as any).getElementById('fAddrZip').value.trim() } as any,
                driversLicense: { number: (document as any).getElementById('fDlNumber').value.trim(), licenseClass: (document as any).getElementById('fDlClass').value, state: r.driversLicense.state || 'NV', expiration: (document as any).getElementById('fDlExpiration').value } as any,
                specialSkills: Array.from((document as any).querySelectorAll('.fSkill:checked')).map((el?: any): any => el.value)
            } as any);
            logActivity(`Updated personnel record for ${personName(personId)}.`, "personnel_record", personId);
            persist();
            toast("Personnel record saved.");
            closeModal();
            if (ACTIVE_VIEW === 'pm-records')
                renderRecords();
        };
    }
    function deleteRecord(personId?: any): any {
        if (!confirm(`Delete the HR record for ${personName(personId)}? This does not remove them from the shared personnel roster, only their Personnel Management record.`))
            return;
        STATE.pm.records = STATE.pm.records.filter((r?: any): any => r.personId !== personId);
        STATE.pm.disciplinaryActions = STATE.pm.disciplinaryActions.filter((d?: any): any => d.personId !== personId);
        STATE.pm.trainingRecords = STATE.pm.trainingRecords.filter((t?: any): any => t.personId !== personId);
        STATE.pm.inquiries = STATE.pm.inquiries.filter((i?: any): any => i.personId !== personId);
        logActivity(`Deleted personnel record for ${personName(personId)}.`, "personnel_record", personId);
        persist();
        toast("Personnel record deleted.");
        renderRecords();
    }
    /* =========================================================================
       RECORD DETAIL (full tabbed view: opened by clicking a name anywhere)
       ========================================================================= */
    let RECORD_DETAIL_TAB: any = 'overview';
    let RECORD_DETAIL_PERSON_ID: any = null;
    function openRecordDetail(personId?: any): any {
        if (!SuiteUX.openRecord("personnel", "person", personId))
            return;
        RECORD_DETAIL_TAB = 'overview';
        RECORD_DETAIL_PERSON_ID = personId;
        renderRecordDetailModal();
    }
    function renderRecordDetailModal(): any {
        const personId: any = RECORD_DETAIL_PERSON_ID;
        const r: any = recordFor(personId);
        if (!r) {
            closeModal();
            return;
        }
        const canLodd: any = can('pm_lodd_view');
        const tabs: any = [
            ['overview', 'Overview'], ['promotions', 'Promotion History'], ['disciplinary', 'Disciplinary'],
            ['medical', 'Medical'], ['training', 'Training'], ['inquiries', 'Inquiries'], ['documents', 'Documents'],
        ];
        if (canLodd)
            tabs.push(['lodd', 'LODD']);
        tabs.push(['history', 'Change History']);
        const box: any = (document as any).getElementById('modalBox');
        box.className = 'modal modal-xl';
        box.innerHTML = `
    <div class="modal-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${r.photoDataUrl ? `<img src="${r.photoDataUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">` : `<div style="width:44px;height:44px;border-radius:50%;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);">${ICONS.idcard}</div>`}
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(personName(personId))}</h3>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(r.rank)} &bull; Badge ${escapeHtml(r.badgeNumber)} &bull; ${escapeHtml(r.unitId)}</div>
        </div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid, label]: any): any => `<button class="btn btn-sm ${RECORD_DETAIL_TAB === tid ? 'btn-primary' : 'btn-outline'}" data-rec-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="recDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-rec-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { RECORD_DETAIL_TAB = b.dataset.recTab; renderRecordDetailModal(); }));
        renderRecordDetailTabContent(r);
    }
    function renderRecordDetailTabContent(r?: any): any {
        const body: any = (document as any).getElementById('recDetailBody');
        const personId: any = r.personId;
        const canEdit: any = can('pm_records_edit');
        const canDocs: any = can('pm_documents_manage');
        const canLoddEdit: any = can('pm_lodd_manage');
        const canDiscManage: any = can('pm_discipline_manage');
        const canMedManage: any = can('pm_medical_manage');
        const canInqManage: any = can('pm_inquiries_manage');
        if (RECORD_DETAIL_TAB === 'overview') {
            body.innerHTML = `
      ${(canEdit || canDocs) ? `<div style="margin-bottom:14px;display:flex;gap:8px;">${canEdit ? `<button class="btn btn-sm btn-primary" id="btnEditFromDetail">${ICONS.edit} Edit Record</button>` : ''}${canDocs ? `<button class="btn btn-sm btn-outline" id="btnUploadPhoto">${ICONS.camera} ${r.photoDataUrl ? 'Change' : 'Attach'} Photo</button>` : ''}</div>` : ''}
      <div class="detail-grid">
        <div><div class="k">Agency</div><div class="v">${escapeHtml(r.agency)}</div></div>
        <div><div class="k">Employee ID</div><div class="v">${(r.employeeId ? escapeHtml(r.employeeId) : '—')}</div></div>
        <div><div class="k">Unit</div><div class="v">${escapeHtml(r.unitId)}</div></div>
        <div><div class="k">Assignment</div><div class="v">${(r.assignment ? escapeHtml(r.assignment) : '—')}</div></div>
        <div><div class="k">Rank</div><div class="v">${escapeHtml(r.rank)}</div></div>
        <div><div class="k">Badge #</div><div class="v">${escapeHtml(r.badgeNumber)}</div></div>
        <div><div class="k">Employment Status</div><div class="v"><span class="badge ${statusBadgeClass(r.employmentStatus)}">${r.employmentStatus}</span></div></div>
        <div><div class="k">Supervisor(s)</div><div class="v">${r.supervisorIds.length ? r.supervisorIds.map((sid?: any): any => escapeHtml(personName(sid))).join(', ') : '—'}</div></div>
        <div><div class="k">Hire Date</div><div class="v">${r.hireDate || '—'}</div></div>
        <div><div class="k">Sworn Date</div><div class="v">${r.swornDate || '—'}</div></div>
        <div><div class="k">Termination Date</div><div class="v">${r.terminationDate || '—'}</div></div>
        <div><div class="k">Sex / Race / Marital</div><div class="v">${escapeHtml(r.sex)} &bull; ${escapeHtml(r.race)} &bull; ${escapeHtml(r.maritalStatus)}</div></div>
        <div><div class="k">Blood Type</div><div class="v">${escapeHtml(r.bloodType)}</div></div>
        <div><div class="k">Phone</div><div class="v">${escapeHtml((r.phones[0] || {} as any).number || '—')}</div></div>
        <div><div class="k">Address</div><div class="v">${escapeHtml(r.address.street || '')}, ${escapeHtml(r.address.city || '')} ${escapeHtml(r.address.state || '')} ${escapeHtml(r.address.zip || '')}</div></div>
        <div><div class="k">Driver's License</div><div class="v">${(r.driversLicense.number ? escapeHtml(r.driversLicense.number) : '—')} (${escapeHtml(r.driversLicense.licenseClass || '')})${r.driversLicense.expiration ? ' exp. ' + r.driversLicense.expiration : ''}</div></div>
        <div><div class="k">Special Skills</div><div class="v">${r.specialSkills.length ? r.specialSkills.map(escapeHtml).join(', ') : '—'}</div></div>
        <div><div class="k">Education</div><div class="v">${r.education.length ? r.education.map((e?: any): any => `${escapeHtml(e.degree)}, ${escapeHtml(e.institution)} (${e.year})`).join('; ') : '—'}</div></div>
      </div>
    `;
            const editBtn: any = (document as any).getElementById('btnEditFromDetail');
            if (editBtn)
                editBtn.addEventListener('click', (): any => openRecordEditModal(personId));
            const photoBtn: any = (document as any).getElementById('btnUploadPhoto');
            if (photoBtn)
                photoBtn.addEventListener('click', (): any => openPhotoUploadModal(r));
        }
        else if (RECORD_DETAIL_TAB === 'promotions') {
            const rows: any = r.promotionHistory.map((p?: any, i?: any): any => ({ p, i } as any)).sort((a?: any, b?: any): any => b.p.startDate.localeCompare(a.p.startDate)).map(({ p, i }: any): any => `
      <tr><td>${escapeHtml(p.rank)}</td><td>${p.startDate}</td><td>${p.endDate || 'Current'}</td>
      <td>${canEdit ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-promo="${i}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-danger" data-del-promo="${i}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No promotion history recorded.</td></tr>`;
            body.innerHTML = `
      ${canEdit ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddPromotion">${ICONS.plus} Add Promotion History Entry</button>` : ''}
      <table><thead><tr><th>Rank</th><th>Start Date</th><th>End Date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
    `;
            const addPromoBtn: any = (document as any).getElementById('btnAddPromotion');
            if (addPromoBtn)
                addPromoBtn.addEventListener('click', (): any => openPromotionFormModal(r, null));
            (document as any).querySelectorAll('[data-edit-promo]').forEach((b?: any): any => b.addEventListener('click', (): any => openPromotionFormModal(r, Number(b.dataset.editPromo))));
            (document as any).querySelectorAll('[data-del-promo]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const i: any = Number(b.dataset.delPromo);
                const entry: any = r.promotionHistory[i];
                if (!confirm(`Delete the "${entry.rank}" promotion history entry (${entry.startDate})?`))
                    return;
                r.promotionHistory.splice(i, 1);
                logActivity(`Removed a promotion history entry (${entry.rank}) for ${personName(personId)}.`, "personnel_record", personId);
                persist();
                renderRecordDetailModal();
            }));
        }
        else if (RECORD_DETAIL_TAB === 'disciplinary') {
            const list: any = STATE.pm.disciplinaryActions.filter((d?: any): any => d.personId === personId).slice().sort((a?: any, b?: any): any => b.startDateTime.localeCompare(a.startDateTime));
            const rows: any = list.map((d?: any): any => `
      <tr>
        <td>${escapeHtml(d.type)}</td><td>${d.startDateTime.replace('T', ' ')}</td>
        <td><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></td>
        <td><button class="btn btn-sm btn-outline" data-view-disc="${d.id}">View</button></td>
      </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No disciplinary actions on file.</td></tr>`;
            body.innerHTML = `
      ${canDiscManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDiscFromRecord">${ICONS.plus} Record Disciplinary Action</button>` : ''}
      <table><thead><tr><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
            (document as any).querySelectorAll('[data-view-disc]').forEach((b?: any): any => b.addEventListener('click', (): any => openDisciplinaryDetailModal(b.dataset.viewDisc)));
            const addDiscBtn: any = (document as any).getElementById('btnAddDiscFromRecord');
            if (addDiscBtn)
                addDiscBtn.addEventListener('click', (): any => openDisciplinaryFormModal(null, personId));
        }
        else if (RECORD_DETAIL_TAB === 'medical') {
            const m: any = r.medical;
            const vaxRows: any = m.vaccinations.map((v?: any, i?: any): any => `
      <tr><td>${escapeHtml(v.name)}</td><td>${v.date}</td><td>${v.expirationDate || 'No expiration'}</td><td style="font-size:12px;">${escapeHtml(v.notes || '')}</td>
      ${canMedManage ? `<td><button class="btn-icon" data-del-vax="${i}">${ICONS.trash}</button></td>` : '<td></td>'}</tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:12px;">No vaccinations on file.</td></tr>`;
            const injRows: any = m.injuryHistory.map((inj?: any): any => `<tr><td>${inj.date}</td><td style="font-size:13px;">${escapeHtml(inj.description)}</td><td style="font-size:12px;">${escapeHtml(inj.notes || '')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No injuries on file.</td></tr>`;
            const expRows: any = m.exposureHistory.map((ex?: any): any => `<tr><td>${ex.date}</td><td>${escapeHtml(ex.type)}</td><td style="font-size:12px;">${escapeHtml(ex.notes || '')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No exposures on file.</td></tr>`;
            body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:14px;"><div><div class="k">Blood Type</div><div class="v">${escapeHtml(m.bloodType)}</div></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Vaccinations</h2>${canMedManage ? `<button class="btn btn-sm btn-outline" id="btnAddVax">${ICONS.plus} Add</button>` : ''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Vaccine</th><th>Date</th><th>Expiration</th><th>Notes</th><th></th></tr></thead><tbody>${vaxRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Injury History</h2>${canMedManage ? `<button class="btn btn-sm btn-outline" id="btnAddInjury">${ICONS.plus} Add</button>` : ''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Description</th><th>Notes</th></tr></thead><tbody>${injRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Exposure History</h2>${canMedManage ? `<button class="btn btn-sm btn-outline" id="btnAddExposure">${ICONS.plus} Add</button>` : ''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Type</th><th>Notes</th></tr></thead><tbody>${expRows}</tbody></table></div></div>
      ${!canMedManage ? '<div style="font-size:12px;color:var(--text-dim);">You have view-only access to medical data in this role.</div>' : ''}
    `;
            if (canMedManage) {
                (document as any).getElementById('btnAddVax').addEventListener('click', (): any => openVaccinationFormModal(r));
                (document as any).getElementById('btnAddInjury').addEventListener('click', (): any => openInjuryFormModal(r, 'injuryHistory', 'Injury'));
                (document as any).getElementById('btnAddExposure').addEventListener('click', (): any => openInjuryFormModal(r, 'exposureHistory', 'Exposure'));
                (document as any).querySelectorAll('[data-del-vax]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                    m.vaccinations.splice(Number(b.dataset.delVax), 1);
                    logActivity(`Removed a vaccination record for ${personName(personId)}.`, "medical", personId);
                    persist();
                    renderRecordDetailModal();
                }));
            }
        }
        else if (RECORD_DETAIL_TAB === 'training') {
            const list: any = STATE.pm.trainingRecords.filter((t?: any): any => t.personId === personId).slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
            const rows: any = list.map((t?: any): any => `
      <tr><td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${t.hours}</td><td>${t.passed === null ? '—' : (t.passed ? 'Passed' : 'Failed')}${t.score != null ? ' (' + t.score + '%)' : ''}</td>
      <td>${t.recertDate || '—'}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No training records on file.</td></tr>`;
            body.innerHTML = `<table><thead><tr><th>Course</th><th>Date</th><th>Hours</th><th>Result</th><th>Recert Due</th></tr></thead><tbody>${rows}</tbody></table>`;
            if (FieldTraining.available()) {
                const link: any = (document as any).createElement('button');
                link.type = 'button';
                link.className = 'btn btn-outline btn-sm';
                link.style.marginBottom = '12px';
                link.textContent = 'Open Field Training file';
                link.onclick = (): any => FieldTraining.openPerson(personId);
                body.prepend(link);
            }
        }
        else if (RECORD_DETAIL_TAB === 'inquiries') {
            const list: any = STATE.pm.inquiries.filter((i?: any): any => i.personId === personId).slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
            const rows: any = list.map((i?: any): any => `
      <tr><td>${escapeHtml(i.category)}</td><td>${i.date}</td><td class="mono">${escapeHtml(i.caseRef)}</td><td style="font-size:12.5px;">${escapeHtml(i.summary)}</td><td>${escapeHtml(i.outcome)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No RMS-data inquiry entries on file.</td></tr>`;
            body.innerHTML = `
      ${canInqManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddInquiry">${ICONS.plus} Log Inquiry Entry</button>` : ''}
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Represents inquiries against RMS data (use of force, pursuits, complaints, etc.) for early-intervention purposes. In a full deployment these would be pulled automatically from the records/CAD system rather than logged manually here.</div>
      <table><thead><tr><th>Category</th><th>Date</th><th>Case Ref</th><th>Summary</th><th>Outcome</th></tr></thead><tbody>${rows}</tbody></table>`;
            const addInqBtn: any = (document as any).getElementById('btnAddInquiry');
            if (addInqBtn)
                addInqBtn.addEventListener('click', (): any => openInquiryFormModal(personId));
        }
        else if (RECORD_DETAIL_TAB === 'documents') {
            const rows: any = r.documents.map((d?: any, i?: any): any => `
      <tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.docType || 'General')}</td><td>${d.uploadDate}</td><td>${escapeHtml(d.uploadedBy)}</td>
      ${canDocs ? `<td><button class="btn-icon" data-del-doc="${i}">${ICONS.trash}</button></td>` : '<td></td>'}</tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No documents attached.</td></tr>`;
            body.innerHTML = `
      ${canDocs ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDoc">${ICONS.plus} Attach Document</button>` : ''}
      <table><thead><tr><th>Name</th><th>Type</th><th>Uploaded</th><th>By</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">Documents are tracked by metadata (name, type, date) in this prototype rather than storing full file contents.</div>
    `;
            const addDocBtn: any = (document as any).getElementById('btnAddDoc');
            if (addDocBtn)
                addDocBtn.addEventListener('click', (): any => openDocumentFormModal(r));
            (document as any).querySelectorAll('[data-del-doc]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                r.documents.splice(Number(b.dataset.delDoc), 1);
                persist();
                renderRecordDetailModal();
            }));
        }
        else if (RECORD_DETAIL_TAB === 'lodd') {
            const l: any = r.lodd;
            body.innerHTML = `
      ${canLoddEdit ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnEditLodd">${ICONS.edit} Edit LODD Information</button>` : ''}
      <div class="locked-note">${ICONS.lock}<div>Line-of-Duty-Death information is sensitive personal data, restricted to a small number of roles.</div></div>
      <div class="detail-grid">
        <div><div class="k">Personnel Wishes</div><div class="v">${(l.wishes ? escapeHtml(l.wishes) : '—')}</div></div>
        <div><div class="k">Emergency Contact</div><div class="v">${(l.emergencyContactName ? escapeHtml(l.emergencyContactName) : '—')} ${l.emergencyContactRelation ? '(' + escapeHtml(l.emergencyContactRelation) + ')' : ''}</div></div>
        <div><div class="k">Emergency Contact Phone</div><div class="v">${(l.emergencyContactPhone ? escapeHtml(l.emergencyContactPhone) : '—')}</div></div>
        <div><div class="k">Notes</div><div class="v">${(l.notes ? escapeHtml(l.notes) : '—')}</div></div>
      </div>`;
            const loddBtn: any = (document as any).getElementById('btnEditLodd');
            if (loddBtn)
                loddBtn.addEventListener('click', (): any => openLoddFormModal(r));
        }
        else if (RECORD_DETAIL_TAB === 'history') {
            const rows: any = r.fieldHistory.slice().reverse().map((h?: any): any => `
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
            body.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every change to key fields (rank, unit, employment status) is captured here with who made the change and the before/after values. Every other action on this record is also in the Platform Audit Log under Admin.</div>
      <table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
        }
    }
    function openPhotoUploadModal(r?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Attach Photo</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        ${r.photoDataUrl ? `<img src="${r.photoDataUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">` : `<div style="width:64px;height:64px;border-radius:50%;background:var(--lightgray);"></div>`}
        <input type="file" id="fPhotoFile" accept="image/*">
      </div>
      <div style="font-size:11px;color:var(--text-dim);">Stored as a small resized thumbnail in this prototype's data record.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save Photo</button></div>
  `;
        openModal();
        let pending: any = r.photoDataUrl;
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fPhotoFile').addEventListener('change', (e?: any): any => {
            const file: any = e.target.files[0];
            if (!file)
                return;
            const img: any = new Image();
            const reader: any = new FileReader();
            reader.onload = (ev?: any): any => {
                img.onload = (): any => {
                    const canvas: any = (document as any).createElement('canvas');
                    const size: any = 160;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx: any = canvas.getContext('2d');
                    const scale: any = Math.max(size / img.width, size / img.height);
                    const w: any = img.width * scale, h: any = img.height * scale;
                    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
                    pending = canvas.toDataURL('image/jpeg', 0.7);
                    toast("Photo ready to save.");
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        (document as any).getElementById('mSave').onclick = (): any => {
            r.photoDataUrl = pending;
            logActivity(`Updated photo for ${personName(r.personId)}.`, "personnel_record", r.personId);
            persist();
            closeModal();
            renderRecordDetailModal();
        };
    }
    function openPromotionFormModal(r?: any, index?: any): any {
        const editing: any = index != null;
        const p: any = editing ? r.promotionHistory[index] : { rank: STATE.pm.refData.ranks[0], startDate: fmt(new Date() as any), endDate: null } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Add'} Promotion History Entry</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Rank</label><select id="fPromoRank">${STATE.pm.refData.ranks.map((rk?: any): any => `<option ${p.rank === rk ? 'selected' : ''}>${escapeHtml(rk)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fPromoStart" value="${p.startDate || ''}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fPromoEnd" value="${p.endDate || ''}"></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);">Leave End Date blank if this is their current rank. Doing so automatically closes out any other entry marked as current and updates the record's Rank field to match.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Add Entry'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const rank: any = (document as any).getElementById('fPromoRank').value;
            const startDate: any = (document as any).getElementById('fPromoStart').value;
            const endDate: any = (document as any).getElementById('fPromoEnd').value || null;
            if (!startDate) {
                toast("Enter a start date.", true);
                return;
            }
            if (editing) {
                Object.assign(p, { rank, startDate, endDate } as any);
                logActivity(`Updated promotion history entry (${rank}) for ${personName(r.personId)}.`, "personnel_record", r.personId);
            }
            else {
                const newEntry: any = { rank, startDate, endDate } as any;
                r.promotionHistory.push(newEntry);
                logActivity(`Added promotion history entry (${rank}, ${startDate}) for ${personName(r.personId)}.`, "personnel_record", r.personId);
            }
            const savedEntry: any = editing ? p : r.promotionHistory[r.promotionHistory.length - 1];
            if (endDate === null) {
                // this entry is now "current" - close out any other open-ended entry and sync the record's Rank field
                r.promotionHistory.forEach((entry?: any): any => { if (entry !== savedEntry && !entry.endDate)
                    entry.endDate = startDate; });
                recordFieldChange(r, 'rank', r.rank, rank);
                r.rank = rank;
            }
            persist();
            toast("Promotion history saved.");
            renderRecordDetailModal();
        };
    }
    function openVaccinationFormModal(r?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Vaccination</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Vaccine / Immunization</label><input type="text" id="fVaxName" placeholder="e.g. Influenza (Annual)"></div>
      <div class="form-2col">
        <div class="form-row"><label>Date Administered</label><input type="date" id="fVaxDate" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>Expiration (if applicable)</label><input type="date" id="fVaxExpire"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fVaxNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fVaxName').value.trim();
            if (!name) {
                toast("Enter a vaccine name.", true);
                return;
            }
            r.medical.vaccinations.push({ name, date: (document as any).getElementById('fVaxDate').value, expirationDate: (document as any).getElementById('fVaxExpire').value || null, notes: (document as any).getElementById('fVaxNotes').value.trim() } as any);
            logActivity(`Added vaccination "${name}" for ${personName(r.personId)}.`, "medical", r.personId);
            persist();
            renderRecordDetailModal();
        };
    }
    function openInjuryFormModal(r?: any, listKey?: any, label?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add ${label}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Date</label><input type="date" id="fInjDate" value="${fmt(new Date() as any)}"></div>
      ${listKey === 'exposureHistory' ? `<div class="form-row"><label>Exposure Type</label><input type="text" id="fInjDesc" placeholder="e.g. Bloodborne Pathogen Exposure"></div>` : `<div class="form-row"><label>Description</label><input type="text" id="fInjDesc" placeholder="What happened"></div>`}
      <div class="form-row"><label>Notes</label><textarea id="fInjNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const desc: any = (document as any).getElementById('fInjDesc').value.trim();
            if (!desc) {
                toast("Enter a description.", true);
                return;
            }
            const entry: any = listKey === 'exposureHistory'
                ? { date: (document as any).getElementById('fInjDate').value, type: desc, notes: (document as any).getElementById('fInjNotes').value.trim() } as any : { date: (document as any).getElementById('fInjDate').value, description: desc, notes: (document as any).getElementById('fInjNotes').value.trim() } as any;
            r.medical[listKey].push(entry);
            logActivity(`Added ${label.toLowerCase()} record for ${personName(r.personId)}.`, "medical", r.personId);
            persist();
            renderRecordDetailModal();
        };
    }
    function openInquiryFormModal(personId?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log RMS-Data Inquiry Entry</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Category</label><select id="fInqCategory">${STATE.pm.refData.inquiryCategories.map((c?: any): any => `<option>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fInqDate" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>Case Reference #</label><input type="text" id="fInqCaseRef" placeholder="e.g. UOF-2026-0001"></div>
      </div>
      <div class="form-row"><label>Summary</label><textarea id="fInqSummary" rows="2"></textarea></div>
      <div class="form-row"><label>Outcome</label><input type="text" id="fInqOutcome" placeholder="e.g. Within policy, Under review"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Entry</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const entry: any = {
                id: 'inq' + Date.now(), personId, category: (document as any).getElementById('fInqCategory').value,
                date: (document as any).getElementById('fInqDate').value, caseRef: (document as any).getElementById('fInqCaseRef').value.trim(),
                summary: (document as any).getElementById('fInqSummary').value.trim(), outcome: (document as any).getElementById('fInqOutcome').value.trim() || 'Under review'
            } as any;
            STATE.pm.inquiries.push(entry);
            logActivity(`Logged ${entry.category} inquiry entry for ${personName(personId)}.`, "inquiry", personId);
            persist();
            toast("Inquiry entry logged.");
            renderRecordDetailModal();
        };
    }
    function openDocumentFormModal(r?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Attach Document</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Document Name</label><input type="text" id="fDocName" placeholder="e.g. Signed Acknowledgment Form"></div>
      <div class="form-row"><label>Type</label><input type="text" id="fDocType" placeholder="e.g. Policy Acknowledgment, Medical, Legal"></div>
      <div style="font-size:11px;color:var(--text-dim);">This prototype tracks document metadata only, not the underlying file.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Attach</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fDocName').value.trim();
            if (!name) {
                toast("Enter a document name.", true);
                return;
            }
            r.documents.push({ name, docType: (document as any).getElementById('fDocType').value.trim() || 'General', uploadDate: fmt(new Date() as any), uploadedBy: (STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) || {} as any).name || 'System' } as any);
            logActivity(`Attached document "${name}" to ${personName(r.personId)}'s record.`, "document", r.personId);
            persist();
            renderRecordDetailModal();
        };
    }
    function openLoddFormModal(r?: any): any {
        const l: any = r.lodd;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Edit LODD Information</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Personnel Wishes</label><textarea id="fLoddWishes" rows="3">${escapeHtml(l.wishes || '')}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Emergency Contact Name</label><input type="text" id="fLoddContactName" value="${escapeHtml(l.emergencyContactName || '')}"></div>
        <div class="form-row"><label>Relationship</label><input type="text" id="fLoddContactRel" value="${escapeHtml(l.emergencyContactRelation || '')}"></div>
      </div>
      <div class="form-row"><label>Emergency Contact Phone</label><input type="text" id="fLoddContactPhone" value="${escapeHtml(l.emergencyContactPhone || '')}"></div>
      <div class="form-row"><label>Additional Notes</label><textarea id="fLoddNotes" rows="2">${escapeHtml(l.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            Object.assign(l, {
                wishes: (document as any).getElementById('fLoddWishes').value.trim(),
                emergencyContactName: (document as any).getElementById('fLoddContactName').value.trim(),
                emergencyContactRelation: (document as any).getElementById('fLoddContactRel').value.trim(),
                emergencyContactPhone: (document as any).getElementById('fLoddContactPhone').value.trim(),
                notes: (document as any).getElementById('fLoddNotes').value.trim()
            } as any);
            logActivity(`Updated LODD information for ${personName(r.personId)}.`, "lodd", r.personId);
            persist();
            renderRecordDetailModal();
        };
    }
    /* =========================================================================
       DISCIPLINARY ACTIONS
       ========================================================================= */
    let DISC_FILTER: any = { status: "All", type: "All" } as any;
    function renderDisciplinary(): any {
        if (!can('pm_discipline_view')) {
            (document as any).getElementById('view-pm-disciplinary').innerHTML = permissionBlockedView("You don't have permission to view disciplinary actions in this role.");
            return;
        }
        const canManage: any = can('pm_discipline_manage');
        const f: any = DISC_FILTER;
        const list: any = STATE.pm.disciplinaryActions.filter((d?: any): any => {
            return (f.status === "All" || d.status === f.status) && (f.type === "All" || d.type === f.type);
        }).slice().sort((a?: any, b?: any): any => b.startDateTime.localeCompare(a.startDateTime));
        const today: any = new Date() as any;
        const pendingExpirations: any = STATE.pm.disciplinaryActions.filter((d?: any): any => d.status !== "Closed" && d.evaluationDates.length)
            .flatMap((d?: any): any => d.evaluationDates.map((ed?: any): any => ({ d, ed, days: daysBetween(fmt(today), ed) } as any)))
            .filter((x?: any): any => x.days <= 30).sort((a?: any, b?: any): any => a.days - b.days);
        const rows: any = list.map((d?: any): any => `
    <tr>
      <td>${recordLink(d.personId)}</td>
      <td>${escapeHtml(d.type)}</td>
      <td>${d.startDateTime.replace('T', ' ')}</td>
      <td>${d.endDateTime ? d.endDateTime.replace('T', ' ') : '—'}</td>
      <td><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></td>
      <td>${escapeHtml(d.rank)}</td>
      <td><button class="btn btn-sm btn-outline" data-view-disc="${d.id}">View</button></td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No disciplinary actions match this filter.</td></tr>`;
        const pendingRows: any = pendingExpirations.map(({ d, ed, days }: any): any => `
    <tr><td>${recordLink(d.personId)}</td><td>${escapeHtml(d.type)}</td><td>${ed}</td>
    <td style="${days <= 7 ? 'color:var(--red);font-weight:700;' : ''}">${days < 0 ? Math.abs(days) + 'd overdue' : days + 'd'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due within 30 days.</td></tr>`;
        (document as any).getElementById('view-pm-disciplinary').innerHTML = `
    ${!canManage ? lockedNote("You're viewing disciplinary actions in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Pending Expiration Report</h2><span class="hint">${pendingExpirations.length} evaluation date(s) due within 30 days</span></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Employee</th><th>Type</th><th>Evaluation Date</th><th>Time Remaining</th></tr></thead><tbody>${pendingRows}</tbody></table></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select id="discStatusFilter" title="Filter disciplinary records to a single status"><option ${f.status === 'All' ? 'selected' : ''}>All</option>${["Pending", "Active", "Closed"].map((s?: any): any => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <select id="discTypeFilter" title="Filter disciplinary records to a single incident type"><option ${f.type === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.disciplinaryTypes.map((t?: any): any => `<option ${f.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddDisc">${ICONS.plus} Record Disciplinary Action</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Status</th><th>Rank at Time</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('discStatusFilter').addEventListener('change', (e?: any): any => { DISC_FILTER.status = e.target.value; renderDisciplinary(); });
        (document as any).getElementById('discTypeFilter').addEventListener('change', (e?: any): any => { DISC_FILTER.type = e.target.value; renderDisciplinary(); });
        const addBtn: any = (document as any).getElementById('btnAddDisc');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openDisciplinaryFormModal(null, null));
        (document as any).querySelectorAll('[data-view-disc]').forEach((b?: any): any => b.addEventListener('click', (): any => openDisciplinaryDetailModal(b.dataset.viewDisc)));
        wireRecordLinks();
    }
    function openDisciplinaryFormModal(existingId?: any, prefillPersonId?: any): any {
        const editing: any = !!existingId;
        const d: any = editing ? STATE.pm.disciplinaryActions.find((x?: any): any => x.id === existingId) : {
            personId: prefillPersonId || STATE.personnel[0].id, type: STATE.pm.refData.disciplinaryTypes[0],
            startDateTime: fmt(new Date() as any) + "T09:00", endDateTime: "", status: "Pending", rank: "", evaluationDates: [], history: [], notes: ""
        } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Record'} Disciplinary Action</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label>
        <select id="fDiscPerson" ${prefillPersonId ? 'disabled' : ''}>${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${d.personId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fDiscType">${STATE.pm.refData.disciplinaryTypes.map((t?: any): any => `<option ${d.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fDiscStatus">${["Pending", "Active", "Closed"].map((s?: any): any => `<option ${d.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date/Time</label><input type="datetime-local" id="fDiscStart" value="${d.startDateTime}"></div>
        <div class="form-row"><label>End Date/Time</label><input type="datetime-local" id="fDiscEnd" value="${d.endDateTime || ''}"></div>
      </div>
      <div class="form-row"><label>Evaluation Date(s) (comma-separated)</label><input type="text" id="fDiscEvalDates" value="${d.evaluationDates.join(', ')}" placeholder="2026-10-01, 2026-11-01"></div>
      <div class="form-row"><label>Notes</label><textarea id="fDiscNotes" rows="2">${escapeHtml(d.notes || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Record'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const personId: any = prefillPersonId || (document as any).getElementById('fDiscPerson').value;
            const rank: any = (recordFor(personId) || {} as any).rank || '';
            const evalDates: any = (document as any).getElementById('fDiscEvalDates').value.split(',').map((s?: any): any => s.trim()).filter(Boolean);
            const data: any = {
                personId, type: (document as any).getElementById('fDiscType').value, status: (document as any).getElementById('fDiscStatus').value,
                startDateTime: (document as any).getElementById('fDiscStart').value, endDateTime: (document as any).getElementById('fDiscEnd').value || null,
                evaluationDates: evalDates, rank, notes: (document as any).getElementById('fDiscNotes').value.trim()
            } as any;
            if (editing) {
                d.history.push(`Updated: status set to ${data.status}.`);
                Object.assign(d, data);
                logActivity(`Updated disciplinary action (${d.type}) for ${personName(personId)}.`, "disciplinary", d.id);
            }
            else {
                const newDisc: any = { id: 'disc' + Date.now(), history: [`${data.type} recorded.`], ...data } as any;
                STATE.pm.disciplinaryActions.push(newDisc);
                logActivity(`Recorded ${data.type} for ${personName(personId)}.`, "disciplinary", newDisc.id);
            }
            persist();
            toast("Disciplinary action saved.");
            closeModal();
            if (ACTIVE_VIEW === 'pm-disciplinary')
                renderDisciplinary();
        };
    }
    function openDisciplinaryDetailModal(discId?: any): any {
        const d: any = STATE.pm.disciplinaryActions.find((x?: any): any => x.id === discId);
        const canManage: any = can('pm_discipline_manage');
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(d.type)} \u2014 ${escapeHtml(personName(d.personId))}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></div></div>
        <div><div class="k">Rank at Time</div><div class="v">${escapeHtml(d.rank)}</div></div>
        <div><div class="k">Start</div><div class="v">${d.startDateTime.replace('T', ' ')}</div></div>
        <div><div class="k">End</div><div class="v">${d.endDateTime ? d.endDateTime.replace('T', ' ') : '—'}</div></div>
        <div><div class="k">Evaluation Dates</div><div class="v">${d.evaluationDates.join(', ') || '—'}</div></div>
      </div>
      ${d.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(d.notes)}</div></div>` : ''}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>History</h2></div>
        <div class="panel-body">${d.history.map((h?: any): any => `<div style="padding:4px 0;font-size:13px;border-bottom:1px solid var(--border);">${escapeHtml(h)}</div>`).join('') || '<div style="color:var(--text-dim);">No history entries.</div>'}</div>
      </div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditDiscFromDetail">${ICONS.edit} Edit</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        const editBtn: any = (document as any).getElementById('btnEditDiscFromDetail');
        if (editBtn)
            editBtn.addEventListener('click', (): any => openDisciplinaryFormModal(discId, d.personId));
    }
    /* =========================================================================
       TRAINING & CERTIFICATIONS
       ========================================================================= */
    let TRAINING_SUBTAB: any = 'mycalendar';
    function renderTraining(): any {
        const canManage: any = can('pm_training_manage');
        const canViewOwn: any = can('pm_training_view_own');
        const canRequest: any = can('pm_training_request');
        const canInstructors: any = can('pm_instructor_manage');
        if (!canManage && !canViewOwn && !canRequest && !canInstructors) {
            (document as any).getElementById('view-pm-training').innerHTML = permissionBlockedView("You don't have permission to view training in this role.");
            return;
        }
        const subtabs: any = [];
        if (canViewOwn || canRequest)
            subtabs.push(['mycalendar', 'My Calendar']);
        if (canInstructors)
            subtabs.push(['mastercalendar', 'Master Calendar']);
        if (canManage)
            subtabs.push(['records', 'All Training Records']);
        if (canViewOwn)
            subtabs.push(['mine', 'My Training']);
        subtabs.push(['courses', 'Course Catalog']);
        if (canRequest || canManage)
            subtabs.push(['requests', 'Training Requests']);
        subtabs.push(['instructors', 'Instructors']);
        if (canManage)
            subtabs.push(['search', 'Search']);
        if (canManage)
            subtabs.push(['compliance', 'Required Training Compliance']);
        if (!subtabs.find(([k]: any): any => k === TRAINING_SUBTAB))
            TRAINING_SUBTAB = subtabs[0][0];
        (document as any).getElementById('view-pm-training').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${subtabs.map(([key, label]: any): any => `<button class="btn btn-sm ${TRAINING_SUBTAB === key ? 'btn-primary' : 'btn-outline'}" data-training-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="trainingSubtabBody"></div>
  `;
        (document as any).querySelectorAll('[data-training-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { TRAINING_SUBTAB = b.dataset.trainingTab; renderTraining(); }));
        renderTrainingSubtab();
    }
    function renderTrainingSubtab(): any {
        const body: any = (document as any).getElementById('trainingSubtabBody');
        if (TRAINING_SUBTAB === 'mycalendar')
            renderCalendarSub(body, CURRENT_USER_ID);
        else if (TRAINING_SUBTAB === 'mastercalendar')
            renderCalendarSub(body, null);
        else if (TRAINING_SUBTAB === 'records')
            renderTrainingRecordsSub(body, null);
        else if (TRAINING_SUBTAB === 'mine')
            renderTrainingRecordsSub(body, CURRENT_USER_ID);
        else if (TRAINING_SUBTAB === 'courses')
            renderCourseCatalogSub(body);
        else if (TRAINING_SUBTAB === 'requests')
            renderTrainingRequestsSub(body);
        else if (TRAINING_SUBTAB === 'instructors')
            renderInstructorsSub(body);
        else if (TRAINING_SUBTAB === 'search')
            renderTrainingSearchSub(body);
        else if (TRAINING_SUBTAB === 'compliance')
            renderComplianceSub(body);
    }
    function renderTrainingRecordsSub(body?: any, lockedPersonId?: any): any {
        const canManage: any = can('pm_training_manage');
        const list: any = STATE.pm.trainingRecords.filter((t?: any): any => !lockedPersonId || t.personId === lockedPersonId).slice().sort((a?: any, b?: any): any => b.date.localeCompare(a.date));
        const rows: any = list.map((t?: any): any => `
    <tr>
      ${lockedPersonId ? '' : `<td>${recordLink(t.personId)}</td>`}
      <td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${t.hours}</td><td>${money(t.cost)}</td>
      <td>${escapeHtml(t.provider)}</td><td>${escapeHtml(t.attendedStatus)}</td>
      <td>${t.score != null ? t.score + '%' : (t.passed === null ? '—' : (t.passed ? 'Passed' : 'Failed'))}</td>
      <td>${t.recertDate || '—'}</td>
      ${canManage && !lockedPersonId ? `<td><button class="btn btn-sm btn-outline" data-edit-training="${t.id}">${ICONS.edit}</button></td>` : '<td></td>'}
    </tr>`).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:16px;">No training records${lockedPersonId ? ' for you' : ''} yet.</td></tr>`;
        body.innerHTML = `
    ${lockedPersonId ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Read-only view of your own training history.</div>` : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddTraining">${ICONS.plus} Log Training Record</button>` : ''}
    <table><thead><tr>
      ${lockedPersonId ? '' : '<th>Employee</th>'}
      <th>Course</th><th>Date</th><th>Hours</th><th>Cost</th><th>Provider</th><th>Attendance</th><th>Result</th><th>Recert Due</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>
  `;
        const addBtn: any = (document as any).getElementById('btnAddTraining');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openTrainingRecordFormModal(null));
        (document as any).querySelectorAll('[data-edit-training]').forEach((b?: any): any => b.addEventListener('click', (): any => openTrainingRecordFormModal(b.dataset.editTraining)));
        if (!lockedPersonId)
            wireRecordLinks();
    }
    function openTrainingRecordFormModal(existingId?: any): any {
        ensureTrainingLocationsShape();
        const editing: any = !!existingId;
        const t: any = editing ? STATE.pm.trainingRecords.find((x?: any): any => x.id === existingId) : {
            personId: STATE.personnel[0].id, courseId: STATE.pm.trainingCourses[0].id, date: fmt(new Date() as any), hours: 0, cost: 0,
            description: STATE.pm.trainingCourses[0].name, narrative: "", provider: STATE.pm.refData.trainingProviders[0], location: STATE.pm.refData.trainingLocations[0]?.name || '',
            score: null, passed: null, method: "In-Person", attendedStatus: "Attended", recertRequired: false, recertDate: null, documents: []
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-wide';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Log'} Training Record</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Attendee(s) \u2014 primary</label><select id="fTrPerson">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${t.personId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Course</label><select id="fTrCourse">${STATE.pm.trainingCourses.map((c?: any): any => `<option value="${c.id}" ${t.courseId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Date</label><input type="date" id="fTrDate" value="${t.date}"></div>
        <div class="form-row"><label>Hours</label><input type="number" id="fTrHours" value="${t.hours}"></div>
        <div class="form-row"><label>Cost ($)</label><input type="number" id="fTrCost" value="${t.cost}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Provider</label><select id="fTrProvider">${STATE.pm.refData.trainingProviders.map((p?: any): any => `<option ${t.provider === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Location</label><select id="fTrLocation">${STATE.pm.refData.trainingLocations.map((l?: any): any => `<option ${t.location === l.name ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Method</label><select id="fTrMethod">${["In-Person", "Online / LMS", "Field Training", "Practical Exercise"].map((m?: any): any => `<option ${t.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="form-row"><label>Attendance</label><select id="fTrAttended">${["Attended", "No-Show", "Scheduled"].map((a?: any): any => `<option ${t.attendedStatus === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Score / Result (%)</label><input type="number" id="fTrScore" value="${t.score != null ? t.score : ''}" placeholder="Optional"></div>
        <div class="form-row"><label>Pass / Fail</label><select id="fTrPassed"><option value="">N/A</option><option value="true" ${t.passed === true ? 'selected' : ''}>Passed</option><option value="false" ${t.passed === false ? 'selected' : ''}>Failed</option></select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fTrRecertRequired" ${t.recertRequired ? 'checked' : ''} style="width:auto;">Recertification required</label>
      </div>
      <div class="form-row" id="fTrRecertDateWrap" style="${t.recertRequired ? '' : 'display:none;'}"><label>Date of Recertification</label><input type="date" id="fTrRecertDate" value="${t.recertDate || ''}"></div>
      <div class="form-row"><label>Narrative / Comments</label><textarea id="fTrNarrative" rows="2">${escapeHtml(t.narrative || '')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Log Record'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fTrRecertRequired').addEventListener('change', (e?: any): any => { (document as any).getElementById('fTrRecertDateWrap').style.display = e.target.checked ? '' : 'none'; });
        (document as any).getElementById('mSave').onclick = (): any => {
            const courseId: any = (document as any).getElementById('fTrCourse').value;
            const course: any = STATE.pm.trainingCourses.find((c?: any): any => c.id === courseId);
            const passedVal: any = (document as any).getElementById('fTrPassed').value;
            const data: any = {
                personId: (document as any).getElementById('fTrPerson').value, courseId, date: (document as any).getElementById('fTrDate').value,
                hours: Number((document as any).getElementById('fTrHours').value) || 0, cost: Number((document as any).getElementById('fTrCost').value) || 0,
                description: course.name, provider: (document as any).getElementById('fTrProvider').value, location: (document as any).getElementById('fTrLocation').value,
                method: (document as any).getElementById('fTrMethod').value, attendedStatus: (document as any).getElementById('fTrAttended').value,
                score: (document as any).getElementById('fTrScore').value ? Number((document as any).getElementById('fTrScore').value) : null,
                passed: passedVal === '' ? null : passedVal === 'true',
                recertRequired: (document as any).getElementById('fTrRecertRequired').checked,
                recertDate: (document as any).getElementById('fTrRecertRequired').checked ? (document as any).getElementById('fTrRecertDate').value : null,
                narrative: (document as any).getElementById('fTrNarrative').value.trim()
            } as any;
            if (editing) {
                Object.assign(t, data);
                logActivity(`Updated training record (${course.name}) for ${personName(data.personId)}.`, "training", t.id);
            }
            else {
                const newT: any = { id: 'tr' + Date.now(), documents: [], ...data } as any;
                STATE.pm.trainingRecords.push(newT);
                logActivity(`Logged training "${course.name}" for ${personName(data.personId)}.`, "training", newT.id);
            }
            persist();
            toast("Training record saved.");
            closeModal();
            renderTraining();
        };
    }
    function renderCourseCatalogSub(body?: any): any {
        const canManage: any = can('pm_instructor_manage');
        const rows: any = STATE.pm.trainingCourses.map((c?: any): any => `
    <tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.category)}</td><td>${escapeHtml(c.classification)}</td>
    <td>${c.recertRequired ? `Every ${c.recertIntervalMonths} mo.` : '—'}</td>
    <td>${canManage ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-course="${c.id}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-danger" data-del-course="${c.id}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>`).join('')
            || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No courses in the catalog yet.</td></tr>`;
        body.innerHTML = `
    ${!canManage ? lockedNote("You're viewing the course catalog in read-only mode.") : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddCourse">${ICONS.plus} Add Course</button>` : ''}
    <table><thead><tr><th>Course</th><th>Category</th><th>Classification</th><th>Recertification</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  `;
        const addBtn: any = (document as any).getElementById('btnAddCourse');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openCourseFormModal(null));
        (document as any).querySelectorAll('[data-edit-course]').forEach((b?: any): any => b.addEventListener('click', (): any => openCourseFormModal(b.dataset.editCourse)));
        (document as any).querySelectorAll('[data-del-course]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const c: any = STATE.pm.trainingCourses.find((x?: any): any => x.id === b.dataset.delCourse);
            const inUse: any = STATE.pm.trainingRecords.some((t?: any): any => t.courseId === c.id) || STATE.pm.trainingRequests.some((r?: any): any => r.courseId === c.id);
            if (inUse) {
                toast("Can't delete a course that has training records or requests linked to it.", true);
                return;
            }
            if (!confirm(`Delete "${c.name}" from the course catalog?`))
                return;
            STATE.pm.trainingCourses = STATE.pm.trainingCourses.filter((x?: any): any => x.id !== c.id);
            logActivity(`Deleted course "${c.name}" from the catalog.`, "training_course", c.id);
            persist();
            renderTrainingSubtab();
        }));
    }
    function openCourseFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const c: any = editing ? STATE.pm.trainingCourses.find((x?: any): any => x.id === existingId) : {
            name: "", category: STATE.pm.refData.trainingCategories[0], classification: "Recommended", isRequired: false, recertRequired: false, recertIntervalMonths: 12
        } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Add'} Course</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Course Name</label><input type="text" id="fCourseName" value="${escapeHtml(c.name)}" placeholder="e.g. Annual Firearms Qualification"></div>
      <div class="form-2col">
        <div class="form-row"><label>Category</label><select id="fCourseCategory">${STATE.pm.refData.trainingCategories.map((cat?: any): any => `<option ${c.category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Classification</label><select id="fCourseClassification"><option ${c.classification === 'Required' ? 'selected' : ''}>Required</option><option ${c.classification === 'Recommended' ? 'selected' : ''}>Recommended</option></select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fCourseIsRequired" ${c.isRequired ? 'checked' : ''} style="width:auto;">Counts toward mandatory training compliance</label>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fCourseRecertRequired" ${c.recertRequired ? 'checked' : ''} style="width:auto;">Recertification required</label>
      </div>
      <div class="form-row" id="fCourseRecertWrap" style="${c.recertRequired ? '' : 'display:none;'}"><label>Recertify every (months)</label><input type="number" id="fCourseRecertMonths" value="${c.recertIntervalMonths || 12}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Add Course'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fCourseRecertRequired').addEventListener('change', (e?: any): any => { (document as any).getElementById('fCourseRecertWrap').style.display = e.target.checked ? '' : 'none'; });
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fCourseName').value.trim();
            if (!name) {
                toast("Enter a course name.", true);
                return;
            }
            const recertRequired: any = (document as any).getElementById('fCourseRecertRequired').checked;
            const data: any = {
                name, category: (document as any).getElementById('fCourseCategory').value, classification: (document as any).getElementById('fCourseClassification').value,
                isRequired: (document as any).getElementById('fCourseIsRequired').checked, recertRequired,
                recertIntervalMonths: recertRequired ? (Number((document as any).getElementById('fCourseRecertMonths').value) || 12) : null
            } as any;
            if (editing) {
                Object.assign(c, data);
                logActivity(`Updated course "${name}" in the catalog.`, "training_course", c.id);
            }
            else {
                const newC: any = { id: 'crs' + Date.now(), ...data } as any;
                STATE.pm.trainingCourses.push(newC);
                logActivity(`Added course "${name}" to the catalog.`, "training_course", newC.id);
            }
            persist();
            toast("Course saved.");
            closeModal();
            renderTrainingSubtab();
        };
    }
    function renderTrainingRequestsSub(body?: any): any {
        const canManage: any = can('pm_training_manage') || can('pm_instructor_manage');
        const canRequest: any = can('pm_training_request');
        const list: any = STATE.pm.trainingRequests.slice().sort((a?: any, b?: any): any => b.requestDate.localeCompare(a.requestDate));
        const rows: any = list.map((r?: any): any => {
            const course: any = STATE.pm.trainingCourses.find((c?: any): any => c.id === r.courseId);
            const session: any = r.sessionId ? STATE.pm.trainingSessions.find((s?: any): any => s.id === r.sessionId) : null;
            return `<tr>
      <td>${recordLink(r.personId)}</td><td>${(course ? escapeHtml(course.name) : '—')}</td>
      <td>${session ? `${session.date} <span style="color:var(--text-dim);">(${escapeHtml(session.location)})</span>` : '<span style="color:var(--text-dim);">General interest</span>'}</td>
      <td>${r.requestDate}</td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span>${r.reviewedBy ? `<div style="font-size:10.5px;color:var(--text-dim);margin-top:2px;">by ${escapeHtml(r.reviewedBy)}</div>` : ''}</td>
      <td>${canManage && r.status === 'Pending' ? `<button class="btn btn-sm btn-outline" data-approve-treq="${r.id}">Approve</button> <button class="btn btn-sm btn-danger" data-deny-treq="${r.id}">Deny</button>` : ''}</td>
    </tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No training requests yet.</td></tr>`;
        body.innerHTML = `
    ${canRequest ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnRequestTraining">${ICONS.plus} Request Training</button>` : ''}
    <table><thead><tr><th>Employee</th><th>Course</th><th>Requested Session</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
        const reqBtn: any = (document as any).getElementById('btnRequestTraining');
        if (reqBtn)
            reqBtn.addEventListener('click', (): any => openTrainingRequestFormModal());
        (document as any).querySelectorAll('[data-approve-treq]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const r: any = STATE.pm.trainingRequests.find((x?: any): any => x.id === b.dataset.approveTreq);
            r.status = 'Approved';
            r.reviewedBy = personName(CURRENT_USER_ID);
            r.reviewDate = fmt(new Date() as any);
            if (r.sessionId) {
                const session: any = STATE.pm.trainingSessions.find((s?: any): any => s.id === r.sessionId);
                if (session && !session.roster.some((x?: any): any => x.personId === r.personId)) {
                    session.roster.push({ personId: r.personId, status: "Confirmed", requestId: r.id } as any);
                }
                logActivity(`Approved and confirmed ${personName(r.personId)}'s enrollment in ${sessionCourse(session).name}.`, "training_request", r.id);
                toast("Request approved and person confirmed on the session roster.");
            }
            else {
                logActivity(`Approved training request for ${personName(r.personId)}.`, "training_request", r.id);
                toast("Request approved. Schedule a session and add them to its roster when one's ready.");
            }
            persist();
            renderTrainingSubtab();
        }));
        (document as any).querySelectorAll('[data-deny-treq]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const r: any = STATE.pm.trainingRequests.find((x?: any): any => x.id === b.dataset.denyTreq);
            r.status = 'Denied';
            r.reviewedBy = personName(CURRENT_USER_ID);
            r.reviewDate = fmt(new Date() as any);
            logActivity(`Denied training request for ${personName(r.personId)}.`, "training_request", r.id);
            persist();
            renderTrainingSubtab();
        }));
        wireRecordLinks();
    }
    function openTrainingRequestFormModal(): any {
        const upcomingForCourse: any = (courseId?: any): any => STATE.pm.trainingSessions.filter((s?: any): any => s.courseId === courseId && s.status === 'Scheduled');
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Training</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Requesting for</label><select id="fTreqPerson">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${p.id === CURRENT_USER_ID ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Course</label><select id="fTreqCourse">${STATE.pm.trainingCourses.map((c?: any): any => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Session (optional)</label><select id="fTreqSession"></select>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Pick a specific upcoming date if one's already scheduled, or leave as general interest and the training coordinator will schedule one.</div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fTreqNotes" rows="2" placeholder="Why is this training needed?"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
        const refreshSessionOptions: any = (): any => {
            const courseId: any = (document as any).getElementById('fTreqCourse').value;
            const sessions: any = upcomingForCourse(courseId);
            (document as any).getElementById('fTreqSession').innerHTML =
                `<option value="">General interest \u2014 no specific date yet</option>` +
                    sessions.map((s?: any): any => `<option value="${s.id}">${s.date} at ${s.location}</option>`).join('');
        };
        openModal();
        refreshSessionOptions();
        (document as any).getElementById('fTreqCourse').addEventListener('change', refreshSessionOptions);
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const personId: any = (document as any).getElementById('fTreqPerson').value;
            const req: any = { id: 'treq' + Date.now(), personId, courseId: (document as any).getElementById('fTreqCourse').value,
                sessionId: (document as any).getElementById('fTreqSession').value || null,
                requestDate: fmt(new Date() as any), status: "Pending", notes: (document as any).getElementById('fTreqNotes').value.trim(),
                reviewedBy: null, reviewDate: null, reviewNotes: "" } as any;
            STATE.pm.trainingRequests.push(req);
            logActivity(`${personName(personId)} requested training electronically.`, "training_request", req.id);
            persist();
            toast("Training request submitted.");
            closeModal();
            renderTrainingSubtab();
        };
    }
    /* =========================================================================
       TRAINING CALENDARS (personal "My Calendar" and coordinator "Master Calendar")
       Both render the same underlying trainingSessions data through a shared
       month-grid renderer; events are hyperlinked into the session detail modal.
       ========================================================================= */
    let MY_CAL_YEAR: any = (new Date() as any).getFullYear(), MY_CAL_MONTH: any = (new Date() as any).getMonth();
    let MASTER_CAL_YEAR: any = (new Date() as any).getFullYear(), MASTER_CAL_MONTH: any = (new Date() as any).getMonth();
    function sessionCourse(s?: any): any { return STATE.pm.trainingCourses.find((c?: any): any => c.id === s.courseId); }
    function sessionInstructor(s?: any): any { return STATE.pm.instructors.find((i?: any): any => i.id === s.instructorId); }
    function rosterStatusBadgeClass(status?: any): any {
        return ({ "Enrolled": "badge-role", "Confirmed": "badge-assigned", "Attended": "badge-available", "No-Show": "badge-missing", "Excused": "badge-role" } as any)[status] || "badge-role";
    }
    function sessionStatusColor(s?: any): any {
        if (s.status === "Cancelled")
            return "var(--red)";
        if (s.status === "Completed")
            return "var(--text-dim)";
        return "var(--blue)";
    }
    function renderCalendarSub(body?: any, lockedPersonId?: any): any {
        const isMaster: any = !lockedPersonId;
        const canSchedule: any = can('pm_instructor_manage');
        let year: any, month: any;
        if (isMaster) {
            year = MASTER_CAL_YEAR;
            month = MASTER_CAL_MONTH;
        }
        else {
            year = MY_CAL_YEAR;
            month = MY_CAL_MONTH;
        }
        const sessions: any = STATE.pm.trainingSessions.filter((s?: any): any => isMaster || s.roster.some((r?: any): any => r.personId === lockedPersonId));
        const monthStr: any = String(month + 1).padStart(2, '0');
        const inMonth: any = sessions.filter((s?: any): any => s.date.startsWith(`${year}-${monthStr}`));
        // "My Calendar" also surfaces the logged-in person's own subpoena court dates, from the separate
        // Subpoena Management module -- the master calendar here stays training-only by design, since
        // Subpoena Management has its own dedicated department-wide master calendar.
        const mySubpoenas: any = (!isMaster && STATE.subpoena && can('subpoena_view_own'))
            ? STATE.subpoena.subpoenas.filter((s?: any): any => s.personId === lockedPersonId && s.status !== "Cancelled" && s.courtDate.startsWith(`${year}-${monthStr}`))
            : [];
        // "My Calendar" also surfaces the person's own duty roster assignment -- which days they're
        // actually on shift per their pattern's rotation -- and any day-off exception (RDO/VDO/CDO/
        // SDO/TDO) that overrides it. Same department-wide-vs-personal split as the subpoena block above.
        const myScheduleAssignments: any = (!isMaster && STATE.pm.scheduleAssignments) ? STATE.pm.scheduleAssignments.filter((a?: any): any => a.personId === lockedPersonId) : [];
        const firstOfMonth: any = new Date(year, month, 1) as any;
        const daysInMonth: any = (new Date(year, month + 1, 0) as any).getDate();
        const startWeekday: any = firstOfMonth.getDay();
        const monthName: any = firstOfMonth.toLocaleString('en-US', { month: 'long' } as any);
        const byDate: any = {} as any;
        inMonth.forEach((s?: any): any => { (byDate[s.date] = byDate[s.date] || []).push(s); });
        const subByDate: any = {} as any;
        mySubpoenas.forEach((s?: any): any => { (subByDate[s.courtDate] = subByDate[s.courtDate] || []).push(s); });
        let cells: any = '';
        for (let i: any = 0; i < startWeekday; i++)
            cells += `<div class="cal-cell cal-cell-empty"></div>`;
        for (let d: any = 1; d <= daysInMonth; d++) {
            const dateStr: any = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
            const todays: any = byDate[dateStr] || [];
            const todaysSubpoenas: any = subByDate[dateStr] || [];
            const isToday: any = dateStr === fmt(new Date() as any);
            let dutyTag: any = '', exceptionTag: any = '', coverageTag: any = '';
            if (!isMaster) {
                const myException: any = activeExceptionFor(lockedPersonId, dateStr);
                const myCoverage: any = (STATE.pm.scheduleCoverages || []).find((c?: any): any => c.personId === lockedPersonId && c.date === dateStr);
                if (myException) {
                    const code: any = exceptionCodeInfo(myException.code);
                    exceptionTag = `<a href="#" data-cal-duty-exception-event="${myException.id}" class="cal-event" style="background:${code.color}22;color:${code.color};border-left:3px solid ${code.color};" title="${escapeHtml(code.name)}">${escapeHtml(myException.code + ' \u2014 ' + code.name)}</a>`;
                }
                else {
                    const myDuty: any = myScheduleAssignments.find((a?: any): any => isOnDutyOnDate(a, STATE.pm.scheduleShifts.find((s?: any): any => s.id === a.shiftId), dateStr));
                    if (myDuty) {
                        const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === myDuty.shiftId);
                        const color: any = shift ? shiftColor(shift) : 'var(--blue)';
                        const label: any = shift ? `${shift.name} (${SuiteUX.displayTimeOnly(shift.hoursStart)} - ${SuiteUX.displayTimeOnly(shift.hoursEnd)})` : 'Shift';
                        dutyTag = `<a href="#" data-cal-duty-event="${myDuty.id}" class="cal-event" style="background:${color}22;color:${color};border-left:3px solid ${color};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
                    }
                }
                if (myCoverage) {
                    const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === myCoverage.shiftId);
                    const label: any = shift ? `Covering: ${shift.name} (${SuiteUX.displayTimeOnly(shift.hoursStart)} - ${SuiteUX.displayTimeOnly(shift.hoursEnd)})` : 'Covering a shift';
                    coverageTag = `<a href="#" class="cal-event" style="background:${SWAP_COVERAGE_COLOR}22;color:${SWAP_COVERAGE_COLOR};border-left:3px solid ${SWAP_COVERAGE_COLOR};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
                }
            }
            cells += `<div class="cal-cell ${isToday ? 'cal-cell-today' : ''}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday + d - 1) % 7]}">${d}</div>
      ${coverageTag}
      ${dutyTag}
      ${exceptionTag}
      ${todays.map((s?: any): any => {
                const course: any = sessionCourse(s);
                const mine: any = !isMaster ? (s.roster.find((r?: any): any => r.personId === lockedPersonId) || {} as any).status : null;
                return `<a href="#" data-cal-event="${s.id}" class="cal-event" style="background:${sessionStatusColor(s)}22;color:${sessionStatusColor(s)};border-left:3px solid ${sessionStatusColor(s)};" title="${escapeHtml(course ? course.name : '')}">${escapeHtml(course ? course.name : 'Session')}${mine ? ` (${mine})` : ''}</a>`;
            }).join('')}
      ${todaysSubpoenas.map((s?: any): any => `<a href="#" data-cal-subpoena-event="${s.id}" class="cal-event" style="background:#8B5CF622;color:#8B5CF6;border-left:3px solid #8B5CF6;" title="Subpoena \u2014 ${escapeHtml(s.caseNumber)}">\u2696 ${escapeHtml(s.caseNumber)}</a>`).join('')}
    </div>`;
        }
        body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn btn-sm btn-outline" data-cal-nav="prev">&larr;</button>
        <h2 style="margin:0;min-width:170px;text-align:center;">${monthName} ${year}</h2>
        <button class="btn btn-sm btn-outline" data-cal-nav="next">&rarr;</button>
        <button class="btn btn-sm btn-outline" data-cal-nav="today">Today</button>
      </div>
      ${canSchedule ? `<button class="btn btn-primary btn-sm" id="btnScheduleSession">${ICONS.plus} Schedule Session</button>` : ''}
    </div>
    ${!isMaster ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Showing your assigned shifts, any day-off exception (RDO/VDO/CDO/SDO/TDO), every training session you're enrolled in, confirmed for, or have attended${mySubpoenas.length ? ', plus any subpoena court dates (\u2696)' : ''}. Click an event for full details.</div>` : `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every scheduled training session across the department. Click an event to manage its roster and take roll call.</div>`}
    <div class="cal-grid-head">
      ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d?: any): any => `<div>${d}</div>`).join('')}
    </div>
    <div class="cal-grid">${cells}</div>
  `;
        body.querySelectorAll('[data-cal-subpoena-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => {
            ev.preventDefault();
            const id: any = a.dataset.calSubpoenaEvent;
            enterModule('subpoena');
            setTimeout((): any => { SUBPOENA.switchView('subpoena-mine'); SUBPOENA.openSubpoenaDetail(id); }, 60);
        }));
        body.querySelectorAll('[data-cal-duty-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => {
            ev.preventDefault();
            if (!can('pm_schedule_manage')) {
                toast("Contact your scheduling admin to change a shift assignment.", true);
                return;
            }
            const assign: any = STATE.pm.scheduleAssignments.find((x?: any): any => x.id === a.dataset.calDutyEvent);
            if (assign)
                openAssignmentFormModal(assign);
        }));
        body.querySelectorAll('[data-cal-duty-exception-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => {
            ev.preventDefault();
            if (!can('pm_schedule_manage')) {
                toast("Contact your scheduling admin about this entry.", true);
                return;
            }
            const exception: any = STATE.pm.scheduleExceptions.find((x?: any): any => x.id === a.dataset.calDutyExceptionEvent);
            if (exception)
                openExceptionFormModal(exception);
        }));
        body.querySelectorAll('[data-cal-nav]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const dir: any = b.dataset.calNav;
            let y: any = isMaster ? MASTER_CAL_YEAR : MY_CAL_YEAR, m: any = isMaster ? MASTER_CAL_MONTH : MY_CAL_MONTH;
            if (dir === 'prev') {
                m--;
                if (m < 0) {
                    m = 11;
                    y--;
                }
            }
            else if (dir === 'next') {
                m++;
                if (m > 11) {
                    m = 0;
                    y++;
                }
            }
            else {
                y = (new Date() as any).getFullYear();
                m = (new Date() as any).getMonth();
            }
            if (isMaster) {
                MASTER_CAL_YEAR = y;
                MASTER_CAL_MONTH = m;
            }
            else {
                MY_CAL_YEAR = y;
                MY_CAL_MONTH = m;
            }
            renderCalendarSub(body, lockedPersonId);
        }));
        body.querySelectorAll('[data-cal-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => { ev.preventDefault(); openSessionDetailModal(a.dataset.calEvent); }));
        const scheduleBtn: any = (document as any).getElementById('btnScheduleSession');
        if (scheduleBtn)
            scheduleBtn.addEventListener('click', (): any => openSessionFormModal(null));
    }
    function openSessionFormModal(existingId?: any): any {
        ensureTrainingLocationsShape();
        const editing: any = !!existingId;
        const s: any = editing ? STATE.pm.trainingSessions.find((x?: any): any => x.id === existingId) : {
            courseId: STATE.pm.trainingCourses[0].id, instructorId: STATE.pm.instructors[0].id,
            location: STATE.pm.refData.trainingLocations[0]?.name || '', address: STATE.pm.refData.trainingLocations[0]?.address || '',
            date: fmt(new Date() as any), startTime: "09:00", endTime: "12:00",
            capacity: 20, status: "Scheduled", notes: "", roster: []
        } as any;
        (document as any).getElementById('modalBox').className = 'modal modal-xl';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Schedule'} Training Session</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Course</label><select id="fSessCourse">${STATE.pm.trainingCourses.map((c?: any): any => `<option value="${c.id}" ${s.courseId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Instructor</label><select id="fSessInstructor">${STATE.pm.instructors.map((i?: any): any => `<option value="${i.id}" ${s.instructorId === i.id ? 'selected' : ''}>${escapeHtml(i.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><select id="fSessLocation">${STATE.pm.refData.trainingLocations.map((l?: any): any => `<option ${s.location === l.name ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fSessStatus"><option ${s.status === 'Scheduled' ? 'selected' : ''}>Scheduled</option><option ${s.status === 'Completed' ? 'selected' : ''}>Completed</option><option ${s.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></div>      </div>
      <div class="form-row"><label>Street Address <span style="font-weight:400;color:var(--text-dim);">(fills in from the location above; edit it for a one-off venue)</span></label><input type="text" id="fSessAddress" value="${escapeHtml(s.address || '')}" placeholder="e.g. 455 E 2nd St, Reno, NV 89502"></div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Date</label><input type="date" id="fSessDate" value="${s.date}"></div>
        <div class="form-row"><label>Start Time</label><input type="time" id="fSessStart" value="${s.startTime}"></div>
        <div class="form-row"><label>End Time</label><input type="time" id="fSessEnd" value="${s.endTime}"></div>
      </div>
      <div class="form-row"><label>Capacity</label><input type="number" id="fSessCapacity" value="${s.capacity || ''}" placeholder="Optional seat limit"></div>
      <div class="form-row"><label>Notes</label><textarea id="fSessNotes" rows="2">${escapeHtml(s.notes || '')}</textarea></div>
      <div class="form-row"><label>Assign Attendees</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:200px;overflow-y:auto;">
          ${STATE.personnel.map((p?: any): any => `<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:4px 0;"><input type="checkbox" class="fSessAttendee" value="${p.id}" ${s.roster.some((r?: any): any => r.personId === p.id) ? 'checked' : ''} style="width:auto;">${escapeHtml(p.name)}</label>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Schedule Session'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fSessLocation').addEventListener('change', (e?: any): any => {
            const loc: any = STATE.pm.refData.trainingLocations.find((l?: any): any => l.name === e.target.value);
            (document as any).getElementById('fSessAddress').value = loc?.address || '';
        });
        (document as any).getElementById('mSave').onclick = (): any => {
            const selectedIds: any = Array.from((document as any).querySelectorAll('.fSessAttendee:checked')).map((el?: any): any => el.value);
            const data: any = {
                courseId: (document as any).getElementById('fSessCourse').value, instructorId: (document as any).getElementById('fSessInstructor').value,
                location: (document as any).getElementById('fSessLocation').value, address: (document as any).getElementById('fSessAddress').value.trim(),
                status: (document as any).getElementById('fSessStatus').value,
                date: (document as any).getElementById('fSessDate').value, startTime: (document as any).getElementById('fSessStart').value, endTime: (document as any).getElementById('fSessEnd').value,
                capacity: (document as any).getElementById('fSessCapacity').value ? Number((document as any).getElementById('fSessCapacity').value) : null,
                notes: (document as any).getElementById('fSessNotes').value.trim()
            } as any;
            if (editing) {
                // preserve existing roster statuses for people still selected; add newcomers as Enrolled; drop unselected
                const preserved: any = s.roster.filter((r?: any): any => selectedIds.includes(r.personId));
                const newOnes: any = selectedIds.filter((id?: any): any => !s.roster.some((r?: any): any => r.personId === id)).map((personId?: any): any => ({ personId, status: "Enrolled", requestId: null } as any));
                Object.assign(s, data, { roster: [...preserved, ...newOnes] } as any);
                logActivity(`Updated training session: ${sessionCourse(s).name} on ${s.date}.`, "training_session", s.id);
                toast("Session saved.");
            }
            else {
                const newS: any = { id: 'sess' + Date.now(), roster: selectedIds.map((personId?: any): any => ({ personId, status: "Enrolled", requestId: null } as any)), ...data } as any;
                STATE.pm.trainingSessions.push(newS);
                logActivity(`Scheduled new training session: ${sessionCourse(newS).name} on ${newS.date}.`, "training_session", newS.id);
                toast("Session scheduled.");
            }
            persist();
            closeModal();
            renderTrainingSubtab();
        };
    }
    function openSessionDetailModal(sessionId?: any): any {
        const s: any = STATE.pm.trainingSessions.find((x?: any): any => x.id === sessionId);
        if (!s) {
            closeModal();
            return;
        }
        const course: any = sessionCourse(s);
        const instructor: any = sessionInstructor(s);
        const canManage: any = can('pm_instructor_manage');
        const isMyOwnRow: any = s.roster.find((r?: any): any => r.personId === CURRENT_USER_ID);
        const locationValue: any = s.address
            ? `${escapeHtml(s.location)}<br><a href="${mapsUrlFor(s.address)}" target="_blank" rel="noopener" style="color:var(--blue);">${escapeHtml(s.address)}</a>`
            : escapeHtml(s.location);
        (document as any).getElementById('modalBox').className = 'modal modal-xl';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(course ? course.name : 'Training Session')}</h3>
        <div style="font-size:11.5px;color:var(--text-dim);">${s.date} &bull; ${s.startTime}&ndash;${s.endTime} &bull; ${escapeHtml(s.location)}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div class="modal-body">
      ${canManage ? `<div style="text-align:right;margin-bottom:10px;"><button class="btn btn-sm btn-outline" id="btnShowSessionQr">${ICONS.qr || ICONS.download || ''} Generate Check-In QR Code</button></div>` : ''}
      <div class="detail-grid" style="margin-bottom:16px;">
        <div><div class="k">Course</div><div class="v">${(course ? escapeHtml(course.name) : '—')}</div></div>
        <div><div class="k">Category</div><div class="v">${(course ? escapeHtml(course.category) : '—')}</div></div>
        <div><div class="k">Instructor</div><div class="v">${(instructor ? escapeHtml(instructor.name) : '—')}</div></div>
        <div><div class="k">Location</div><div class="v">${locationValue}</div></div>
        ${s.address ? `<div style="grid-column:1/-1;">${mapPictureHtml(s.address)}</div>` : ''}
        <div><div class="k">Date / Time</div><div class="v">${s.date}, ${s.startTime}&ndash;${s.endTime}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge" style="background:${sessionStatusColor(s)}22;color:${sessionStatusColor(s)};">${s.status}</span></div></div>
        <div><div class="k">Capacity</div><div class="v">${s.roster.length}${s.capacity ? ' / ' + s.capacity : ''} enrolled</div></div>
        ${isMyOwnRow ? `<div><div class="k">Your Status</div><div class="v"><span class="badge ${rosterStatusBadgeClass(isMyOwnRow.status)}">${isMyOwnRow.status}</span></div></div>` : ''}
      </div>
      ${s.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(s.notes)}</div></div>` : ''}
      ${canManage && STATE.pm.trainingCheckins.some((c?: any): any => c.sessionId === s.id && !c.applied) ? `
      <div class="panel" style="box-shadow:none;border-color:var(--gold);">
        <div class="panel-head"><h2>Pending Self Check-Ins</h2><button class="btn btn-sm btn-outline" id="btnApplyAllCheckins">Apply All</button></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Name</th><th>Checked In</th><th></th></tr></thead><tbody>
          ${STATE.pm.trainingCheckins.filter((c?: any): any => c.sessionId === s.id && !c.applied).map((c?: any): any => `
            <tr><td>${recordLink(c.personId)}</td><td>${(new Date(c.checkedInAt) as any).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)}</td>
            <td><button class="btn btn-sm btn-primary" data-apply-checkin="${c.id}">Apply to Roster</button></td></tr>`).join('')}
          </tbody></table>
        </div>
      </div>` : ''}
      <div class="panel" style="box-shadow:none;">
        <div class="panel-head"><h2>Roster ${canManage ? '&amp; Roll Call' : ''}</h2>
          ${canManage ? `<div style="display:flex;gap:8px;"><button class="btn btn-sm btn-outline" id="btnAddAttendee">${ICONS.plus} Add Attendee</button><button class="btn btn-sm btn-outline" id="btnMarkAllAttended">Mark All Attended</button></div>` : ''}
        </div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Name</th><th>Status</th>${canManage ? '<th></th>' : ''}</tr></thead><tbody>
          ${s.roster.map((r?: any, i?: any): any => `
            <tr><td>${recordLink(r.personId)}</td>
            <td>${canManage
            ? `<select data-roster-status="${i}"><option value="Enrolled" ${r.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option><option value="Confirmed" ${r.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option><option value="Attended" ${r.status === 'Attended' ? 'selected' : ''}>Attended</option><option value="No-Show" ${r.status === 'No-Show' ? 'selected' : ''}>No-Show</option><option value="Excused" ${r.status === 'Excused' ? 'selected' : ''}>Excused</option></select>`
            : `<span class="badge ${rosterStatusBadgeClass(r.status)}">${r.status}</span>`}</td>
            ${canManage ? `<td><button class="btn-icon" data-remove-attendee="${i}">${ICONS.trash}</button></td>` : ''}
            </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No one enrolled yet.</td></tr>`}
          </tbody></table>
        </div>
      </div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditSessionFromDetail" style="margin-top:12px;">${ICONS.edit} Edit Session</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        wireRecordLinks();
        const editBtn: any = (document as any).getElementById('btnEditSessionFromDetail');
        if (editBtn)
            editBtn.addEventListener('click', (): any => { closeModal(); openSessionFormModal(s.id); });
        const qrBtn: any = (document as any).getElementById('btnShowSessionQr');
        if (qrBtn)
            qrBtn.addEventListener('click', (): any => openSessionQrModal(s.id));
        (document as any).querySelectorAll('[data-apply-checkin]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            applyCheckin(b.dataset.applyCheckin);
            openSessionDetailModal(sessionId);
        }));
        const applyAllBtn: any = (document as any).getElementById('btnApplyAllCheckins');
        if (applyAllBtn)
            applyAllBtn.addEventListener('click', (): any => {
                STATE.pm.trainingCheckins.filter((c?: any): any => c.sessionId === s.id && !c.applied).forEach((c?: any): any => applyCheckin(c.id));
                openSessionDetailModal(sessionId);
            });
        if (canManage) {
            (document as any).querySelectorAll('[data-roster-status]').forEach((sel?: any): any => sel.addEventListener('change', (): any => {
                const idx: any = Number(sel.dataset.rosterStatus);
                s.roster[idx].status = sel.value;
                logActivity(`Marked ${personName(s.roster[idx].personId)} as ${sel.value} for ${course ? course.name : 'a session'}.`, "training_session", s.id);
                persist();
            }));
            (document as any).querySelectorAll('[data-remove-attendee]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const idx: any = Number(b.dataset.removeAttendee);
                const removed: any = s.roster.splice(idx, 1)[0];
                logActivity(`Removed ${personName(removed.personId)} from ${course ? course.name : 'a session'}.`, "training_session", s.id);
                persist();
                openSessionDetailModal(sessionId);
            }));
            const addBtn: any = (document as any).getElementById('btnAddAttendee');
            if (addBtn)
                addBtn.addEventListener('click', (): any => openAddAttendeeModal(s));
            const markAllBtn: any = (document as any).getElementById('btnMarkAllAttended');
            if (markAllBtn)
                markAllBtn.addEventListener('click', (): any => {
                    s.roster.forEach((r?: any): any => r.status = 'Attended');
                    logActivity(`Marked all attendees as Attended for ${course ? course.name : 'a session'}.`, "training_session", s.id);
                    persist();
                    openSessionDetailModal(sessionId);
                });
        }
    }
    function openAddAttendeeModal(s?: any): any {
        const available: any = STATE.personnel.filter((p?: any): any => !s.roster.some((r?: any): any => r.personId === p.id));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Attendee</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Person</label><select id="fAddAttendee">${available.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') || '<option value="">Everyone is already enrolled</option>'}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const personId: any = (document as any).getElementById('fAddAttendee').value;
            if (!personId)
                return;
            s.roster.push({ personId, status: "Enrolled", requestId: null } as any);
            logActivity(`Added ${personName(personId)} to ${sessionCourse(s).name}.`, "training_session", s.id);
            persist();
            toast("Attendee added.");
            openSessionDetailModal(s.id);
        };
    }
    // ---------- QR self check-in for training sessions ----------
    // Design: scanning a session's QR code never writes directly to the shared session/roster record.
    // It only ever creates a small, self-owned "I was here at this time" receipt in
    // STATE.pm.trainingCheckins, tied to the scanning person's own account. A training coordinator
    // then reviews those receipts and applies them to the official roster with one click. This means
    // an attendee never needs write access to a shared record they don't own, the exact same pattern
    // already used for training requests -- and it keeps a person in the loop before anyone's official
    // attendance status changes, since a scanned QR code proves someone had a phone with that code
    // in front of them, not that they were physically in the room.
    function checkinSourceTimeZone(): any {
        // The agency's own configured timezone is the correct frame for a training session's stored
        // date/time -- NOT whatever timezone the device doing the scanning happens to be set to. Without
        // this, someone scanning from a phone set to a different timezone than the agency (or just a
        // browser with a different system clock zone) would have the window computed against the wrong
        // local time entirely, making a session that's actually in progress look closed, or vice versa.
        try {
            return TenantPlatform?.tenant?.()?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        }
        catch {
            return 'UTC';
        }
    }
    function checkinZonedInstant(date?: any, time?: any, zone?: any): any {
        // Converts a date+time pair, understood as being IN `zone`, into the one real, absolute instant
        // it actually represents -- the same iterative correction already used elsewhere in this app for
        // calendar and roll-call display, so a session's start/end time means the same real moment no
        // matter which timezone the person checking a calendar or scanning a QR code happens to be in.
        const [y, m, d]: any = date.split('-').map(Number), [h, minute]: any = time.split(':').map(Number), target: any = Date.UTC(y, m - 1, d, h, minute);
        let utc: any = target;
        try {
            const partsFormatter: any = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as any);
            for (let i: any = 0; i < 2; i++) {
                const parts: any = Object.fromEntries(partsFormatter.formatToParts(new Date(utc) as any).filter((p?: any): any => p.type !== 'literal').map((p?: any): any => [p.type, p.value]));
                const represented: any = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
                utc -= represented - target;
            }
            return new Date(utc) as any;
        }
        catch {
            return new Date(`${date}T${time}:00`) as any;
        }
    }
    function sessionCheckinWindow(s?: any): any {
        const zone: any = checkinSourceTimeZone();
        const graceMs: any = 30 * 60 * 1000;
        const opensAt: any = new Date(checkinZonedInstant(s.date, s.startTime, zone).getTime() - graceMs) as any;
        const closesAt: any = new Date(checkinZonedInstant(s.date, s.endTime, zone).getTime() + graceMs) as any;
        const now: any = new Date() as any; // always a genuine absolute instant, safe to compare against either boundary above regardless of the device's own local timezone
        return { opensAt, closesAt, isOpen: now >= opensAt && now <= closesAt } as any;
    }
    function sessionCheckinUrl(s?: any): any {
        return location.origin + location.pathname + '#/checkin/' + s.id;
    }
    function openSessionQrModal(sessionId?: any): any {
        const s: any = STATE.pm.trainingSessions.find((x?: any): any => x.id === sessionId);
        if (!s) {
            closeModal();
            return;
        }
        const course: any = sessionCourse(s);
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head no-print"><h3>Check-In QR Code</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body" style="text-align:center;">
      <h2 style="margin-bottom:2px;">${escapeHtml(course ? course.name : 'Training Session')}</h2>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:16px;">${s.date} &bull; ${s.startTime}&ndash;${s.endTime} &bull; ${escapeHtml(s.location)}</div>
      <div id="sessionQrTarget" style="display:inline-block;padding:16px;background:#fff;border-radius:8px;"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:14px;">Scan with a phone camera, or open the app and use "Check In" if the PWA is installed.<br>Active from ${sessionCheckinWindow(s).opensAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)} to ${sessionCheckinWindow(s).closesAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)}.</div>
    </div>
    <div class="modal-foot no-print"><button class="btn btn-outline" id="mCancel">Close</button><button class="btn btn-primary" id="btnPrintQr">${ICONS.download} Print / Save as PDF</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('btnPrintQr').onclick = (): any => (window as any).print();
        // QRCode.js draws directly into the target element -- no canvas id or extra wiring needed.
        new QRCode((document as any).getElementById('sessionQrTarget'), {
            text: sessionCheckinUrl(s), width: 220, height: 220, colorDark: "#000000", colorLight: "#ffffff"
        } as any);
    }
    async function openCheckinFlow(sessionId?: any): Promise<any> {
        const s: any = STATE.pm.trainingSessions.find((x?: any): any => x.id === sessionId);
        const me: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID);
        (document as any).getElementById('modalBox').className = 'modal';
        const shell: any = (title?: any, body?: any): any => {
            (document as any).getElementById('modalBox').innerHTML = `
      <div class="modal-head"><h3>${title}</h3><button class="modal-close" id="mClose">&times;</button></div>
      <div class="modal-body" style="text-align:center;padding:24px 20px;">${body}</div>
      <div class="modal-foot"><button class="btn btn-primary" id="mCancel">Done</button></div>
    `;
            openModal();
            (document as any).getElementById('mClose').onclick = closeModal;
            (document as any).getElementById('mCancel').onclick = closeModal;
        };
        if (!s) {
            shell("Check-In", `<p>This check-in code doesn't match any training session on file. It may have been for a session that's since been removed.</p>`);
            return;
        }
        if (!me) {
            shell("Check-In", `<p>No personnel record is linked to this account, so a check-in can't be tied to an employee.</p>`);
            return;
        }
        if (!can('pm_training_checkin_submit')) {
            shell("Check-In Not Available", `<p>Your current role doesn't include training check-in. Ask an administrator to enable it in Roles &amp; Abilities if you believe this is a mistake.</p>`);
            return;
        }
        const course: any = sessionCourse(s);
        const win: any = sessionCheckinWindow(s);
        if (!win.isOpen) {
            const now: any = new Date() as any;
            const msg: any = now < win.opensAt
                ? `This code isn't active yet. It opens at ${win.opensAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)} on ${s.date}.`
                : `This code is no longer active. It closed at ${win.closesAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)} on ${s.date}. Talk to your training coordinator if you were actually present.`;
            shell("Check-In Closed", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course ? course.name : 'Training Session')}</p><p style="color:var(--text-dim);">${msg}</p>`);
            return;
        }
        const existing: any = STATE.pm.trainingCheckins.find((c?: any): any => c.sessionId === s.id && c.personId === me.id);
        if (existing) {
            shell("Already Checked In", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course ? course.name : 'Training Session')}</p><p style="color:var(--text-dim);">You checked in at ${(new Date(existing.checkedInAt) as any).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)}. ${existing.applied ? 'Your coordinator has already applied this to the roster.' : 'Your training coordinator will apply this to the official roster.'}</p>`);
            return;
        }
        // Shown immediately, then replaced once the server actually confirms the save -- the old
        // version showed "You're Checked In" the instant the button was pressed, before any save was
        // even attempted, so a rejected save still told the officer they were checked in.
        shell("Checking In\u2026", `<p style="color:var(--text-dim);">Recording your attendance\u2026</p>`);
        const record: any = { id: 'chk' + Date.now() + Math.random().toString(36).slice(2, 6), sessionId: s.id, personId: me.id, checkedInAt: (new Date() as any).toISOString(), applied: false } as any;
        const result: any = await SuiteStore.submitTrainingCheckin(record);
        if (!result.ok) {
            shell("Check-In Not Saved", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course ? course.name : 'Training Session')}</p><p style="color:var(--text-dim);">${escapeHtml(result.error?.message || 'Something went wrong saving this check-in.')}</p><p style="color:var(--text-dim);margin-top:8px;">Nothing was recorded. Try scanning again, and tell your training coordinator if it keeps failing.</p>`);
            return;
        }
        logActivity(`${personName(me.id)} self-checked in for ${course ? course.name : 'a training session'}.`, "training_session", s.id);
        try {
            renderNotifBell();
        }
        catch (e: any) {
            console.error('renderNotifBell failed after check-in (check-in itself is unaffected):', e);
        }
        shell("You're Checked In", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course ? course.name : 'Training Session')}</p><p style="color:var(--text-dim);">Recorded at ${(new Date(record.checkedInAt) as any).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' } as any)}. Your training coordinator will confirm your attendance on the official roster.</p>`);
    }
    function applyCheckin(checkinId?: any): any {
        const c: any = STATE.pm.trainingCheckins.find((x?: any): any => x.id === checkinId);
        if (!c || c.applied)
            return;
        const s: any = STATE.pm.trainingSessions.find((x?: any): any => x.id === c.sessionId);
        if (!s)
            return;
        let entry: any = s.roster.find((r?: any): any => r.personId === c.personId);
        if (entry)
            entry.status = "Attended";
        else
            s.roster.push({ personId: c.personId, status: "Attended", requestId: null } as any);
        c.applied = true;
        logActivity(`Applied self check-in for ${personName(c.personId)} to ${sessionCourse(s).name} \u2014 marked Attended.`, "training_session", s.id);
        persist();
    }
    function renderInstructorsSub(body?: any): any {
        const canManage: any = can('pm_instructor_manage');
        const rows: any = STATE.pm.instructors.map((ins?: any): any => {
            const totalHours: any = (ins.hoursLogged || []).reduce((s?: any, h?: any): any => s + h.hours, 0);
            return `<tr><td>${escapeHtml(ins.name)}</td><td style="font-size:12.5px;">${escapeHtml(ins.bio)}</td>
    <td>${ins.coursesTaught.map((cid?: any): any => { const c: any = STATE.pm.trainingCourses.find((x?: any): any => x.id === cid); return c ? escapeHtml(c.name) : ''; }).join(', ') || '—'}</td>
    <td>${totalHours}</td>
    <td>${canManage ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-instructor="${ins.id}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-outline" data-log-hours="${ins.id}">Log Hours</button><button class="btn btn-sm btn-danger" data-del-instructor="${ins.id}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>`;
        }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No instructors on file.</td></tr>`;
        body.innerHTML = `
    ${!canManage ? lockedNote("You're viewing the instructor roster in read-only mode.") : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddInstructor">${ICONS.plus} Add Instructor</button>` : ''}
    <table><thead><tr><th>Name</th><th>Bio</th><th>Courses Taught</th><th>Total Hours Logged</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  `;
        const addBtn: any = (document as any).getElementById('btnAddInstructor');
        if (addBtn)
            addBtn.addEventListener('click', (): any => openInstructorFormModal(null));
        (document as any).querySelectorAll('[data-edit-instructor]').forEach((b?: any): any => b.addEventListener('click', (): any => openInstructorFormModal(b.dataset.editInstructor)));
        (document as any).querySelectorAll('[data-log-hours]').forEach((b?: any): any => b.addEventListener('click', (): any => openInstructorHoursModal(b.dataset.logHours)));
        (document as any).querySelectorAll('[data-del-instructor]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const ins: any = STATE.pm.instructors.find((i?: any): any => i.id === b.dataset.delInstructor);
            if (!confirm(`Remove instructor "${ins.name}"? This does not affect training records they've already delivered.`))
                return;
            STATE.pm.instructors = STATE.pm.instructors.filter((i?: any): any => i.id !== ins.id);
            logActivity(`Removed instructor "${ins.name}".`, "instructor", ins.id);
            persist();
            renderTrainingSubtab();
        }));
    }
    function openInstructorFormModal(existingId?: any): any {
        const editing: any = !!existingId;
        const ins: any = editing ? STATE.pm.instructors.find((i?: any): any => i.id === existingId) : { name: "", bio: "", coursesTaught: [], hoursLogged: [] } as any;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit' : 'Add'} Instructor</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Name</label><input type="text" id="fInsName" value="${escapeHtml(ins.name)}" placeholder="e.g. Sgt. Maria Torres, or an outside provider"></div>
      <div class="form-row"><label>Bio / Specialty</label><textarea id="fInsBio" rows="2">${escapeHtml(ins.bio || '')}</textarea></div>
      <div class="form-row"><label>Courses Taught</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:140px;overflow-y:auto;">
          ${STATE.pm.trainingCourses.map((c?: any): any => `<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:2px 0;"><input type="checkbox" class="fInsCourse" value="${c.id}" ${ins.coursesTaught.includes(c.id) ? 'checked' : ''} style="width:auto;">${escapeHtml(c.name)}</label>`).join('') || '<div style="color:var(--text-dim);font-size:12px;">No courses in the catalog yet.</div>'}
        </div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save' : 'Add Instructor'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fInsName').value.trim();
            if (!name) {
                toast("Enter an instructor name.", true);
                return;
            }
            const data: any = { name, bio: (document as any).getElementById('fInsBio').value.trim(), coursesTaught: Array.from((document as any).querySelectorAll('.fInsCourse:checked')).map((el?: any): any => el.value) } as any;
            if (editing) {
                Object.assign(ins, data);
                logActivity(`Updated instructor "${name}".`, "instructor", ins.id);
            }
            else {
                const newIns: any = { id: 'ins' + Date.now(), hoursLogged: [], ...data } as any;
                STATE.pm.instructors.push(newIns);
                logActivity(`Added instructor "${name}".`, "instructor", newIns.id);
            }
            persist();
            toast("Instructor saved.");
            closeModal();
            renderTrainingSubtab();
        };
    }
    function openInstructorHoursModal(instructorId?: any): any {
        const ins: any = STATE.pm.instructors.find((i?: any): any => i.id === instructorId);
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Instructional Hours \u2014 ${escapeHtml(ins.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fInsHoursDate" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>Hours</label><input type="number" id="fInsHours" value="4"></div>
      </div>
      <div class="form-row"><label>Course (optional)</label><select id="fInsHoursCourse"><option value="">General / Not Course-Specific</option>${STATE.pm.trainingCourses.map((c?: any): any => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Hours</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const hours: any = Number((document as any).getElementById('fInsHours').value) || 0;
            if (hours <= 0) {
                toast("Enter a positive number of hours.", true);
                return;
            }
            if (!ins.hoursLogged)
                ins.hoursLogged = [];
            ins.hoursLogged.push({ date: (document as any).getElementById('fInsHoursDate').value, hours, courseId: (document as any).getElementById('fInsHoursCourse').value || null } as any);
            logActivity(`Logged ${hours} instructional hours for ${ins.name}.`, "instructor", ins.id);
            persist();
            toast("Hours logged.");
            closeModal();
            renderTrainingSubtab();
        };
    }
    function renderTrainingSearchSub(body?: any): any {
        body.innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="tsName" placeholder="Name">
        <select id="tsUnit"><option value="">Any Unit</option>${STATE.pm.refData.units.map((u?: any): any => `<option>${escapeHtml(u)}</option>`).join('')}</select>
        <select id="tsCourse"><option value="">Any Course</option>${STATE.pm.trainingCourses.map((c?: any): any => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
        <select id="tsProvider"><option value="">Any Provider</option>${STATE.pm.refData.trainingProviders.map((p?: any): any => `<option>${escapeHtml(p)}</option>`).join('')}</select>
        <button class="btn btn-sm btn-outline" id="btnRunTrainingSearch">Search</button>
      </div>
    </div>
    <div id="trainingSearchResults"></div>
  `;
        (document as any).getElementById('btnRunTrainingSearch').addEventListener('click', (): any => {
            const name: any = (document as any).getElementById('tsName').value.toLowerCase();
            const unit: any = (document as any).getElementById('tsUnit').value;
            const courseId: any = (document as any).getElementById('tsCourse').value;
            const provider: any = (document as any).getElementById('tsProvider').value;
            const results: any = STATE.pm.trainingRecords.filter((t?: any): any => {
                const rec: any = recordFor(t.personId);
                if (name && !personName(t.personId).toLowerCase().includes(name))
                    return false;
                if (unit && (!rec || rec.unitId !== unit))
                    return false;
                if (courseId && t.courseId !== courseId)
                    return false;
                if (provider && t.provider !== provider)
                    return false;
                return true;
            });
            const rows: any = results.map((t?: any): any => `<tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${escapeHtml(t.provider)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No matching training records.</td></tr>`;
            (document as any).getElementById('trainingSearchResults').innerHTML = `<table><thead><tr><th>Employee</th><th>Course</th><th>Date</th><th>Provider</th></tr></thead><tbody>${rows}</tbody></table>`;
            wireRecordLinks();
        });
    }
    function renderComplianceSub(body?: any): any {
        const required: any = STATE.pm.trainingCourses.filter((c?: any): any => c.isRequired);
        const rows: any = STATE.pm.records.filter((r?: any): any => r.employmentStatus === 'Active').map((r?: any): any => {
            const missing: any = required.filter((c?: any): any => !STATE.pm.trainingRecords.some((t?: any): any => t.personId === r.personId && t.courseId === c.id && t.passed !== false));
            return `<tr><td>${recordLink(r.personId)}</td><td>${missing.length ? missing.map((c?: any): any => escapeHtml(c.name)).join(', ') : '<span style="color:var(--green);">Complete</span>'}</td></tr>`;
        }).join('');
        body.innerHTML = `
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Required courses each active employee has not yet passed.</div>
    <table><thead><tr><th>Employee</th><th>Missing Required Training</th></tr></thead><tbody>${rows}</tbody></table>
  `;
        wireRecordLinks();
    }
    /* =========================================================================
       SCHEDULING & DUTY ROSTER
       ========================================================================= */
    let SCHED_VIEW: any = 'roster';
    let SCHED_CAL_YEAR: any = (new Date() as any).getFullYear(), SCHED_CAL_MONTH: any = (new Date() as any).getMonth();
    let SCHED_CAL_SHIFT: any = 'all';
    let SHOW_PAST_SHIFT_PATTERNS: any = false;
    let SCHED_SUBTAB: any = 'roster';
    let OT_LOOKAHEAD_DAYS: any = 14;
    let OT_GAP_SELECTED: any = null; // {date, shiftId} of the coverage gap currently open in the fill panel
    let ROLLCALL_DATE: any = fmt(new Date() as any);
    let ROLLCALL_SHIFT: any = null; // set to the first visible shift once shifts are known
    let BIDDING_CYCLE_ID: any = null;
    let EXTRADUTY_JOB_ID: any = null;
    let EXCEPTIONS_FILTER: any = { q: '', showPast: false, dateFrom: '', dateTo: '' } as any;
    let SWAP_FILTER: any = { q: '', showPast: false, dateFrom: '', dateTo: '' } as any;
    // Collapsible Roster & Patterns cards: default open, remembered per person via the same
    // localStorage-backed preferences store the sidebar's own collapsible groups already use.
    function schedCardCollapsed(key?: any): any { return SuiteUX.preferences.get('schedCardCollapsed.' + key, false); }
    function setSchedCardCollapsed(key?: any, val?: any): any { SuiteUX.preferences.set('schedCardCollapsed.' + key, val); }
    function collapsibleCardHead(key?: any, titleHtml?: any, actionsHtml?: any, hintHtml?: any): any {
        const collapsed: any = schedCardCollapsed(key);
        return `<div class="panel-head sched-card-head" data-panel-toggle="${key}" style="cursor:pointer;user-select:none;">
    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
      <svg data-panel-chevron="${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;color:var(--text-dim);transition:transform .15s;transform:rotate(${collapsed ? '-90deg' : '0deg'});"><polyline points="6 9 12 15 18 9"></polyline></svg>
      ${titleHtml}
    </div>
    ${actionsHtml ? `<div data-panel-actions style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">${actionsHtml}</div>` : ''}
  </div>
  ${hintHtml || ''}`;
    }
    function wireCollapsibleCards(container?: any): any {
        container.querySelectorAll('[data-panel-toggle]').forEach((head?: any): any => {
            const key: any = head.dataset.panelToggle;
            head.addEventListener('click', (): any => {
                const collapsed: any = !schedCardCollapsed(key);
                setSchedCardCollapsed(key, collapsed);
                const body: any = container.querySelector(`[data-panel-body="${key}"]`);
                if (body)
                    body.style.display = collapsed ? 'none' : '';
                const chevron: any = container.querySelector(`[data-panel-chevron="${key}"]`);
                if (chevron)
                    chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
            });
            const actions: any = head.querySelector('[data-panel-actions]');
            if (actions)
                actions.addEventListener('click', (e?: any): any => e.stopPropagation());
        });
    }
    const WEEKDAY_LABELS: any = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Whether a given assignment has someone on duty on a specific date. Two pattern types:
    // - 'rotation' (the original model): a repeating on/off cycle (e.g. "4 on / 3 off") counted
    //   forward from the assignment's start date. Cycle length of 0 is treated as always on.
    // - 'weekly': fixed days of the week the team always works, plus an optional second set of
    //   days worked only every other week (e.g. "Thu-Sat every week, plus every other Wednesday"),
    //   anchored to a reference date that's defined to fall on an "on" alternating week.
    // Patterns saved before this feature existed have no patternType, so 'rotation' is the default.
    function isOnDutyOnDate(assignment?: any, shift?: any, dateStr?: any): any {
        if (!shift)
            return false;
        // A pattern itself can have a validity window (it only exists as "the rotation" for a period
        // before a different one takes over), separate from when a given person was assigned to it.
        if (shift.startDate && shift.startDate > dateStr)
            return false;
        if (shift.endDate && shift.endDate < dateStr)
            return false;
        if (assignment.startDate > dateStr)
            return false;
        if (assignment.endDate && assignment.endDate <= dateStr)
            return false;
        if (shift.patternType === 'weekly') {
            const weekday: any = (new Date(dateStr + 'T00:00:00') as any).getDay();
            if ((shift.weekdays || []).includes(weekday))
                return true;
            if ((shift.altWeekdays || []).includes(weekday) && shift.altAnchorDate) {
                const weeksSince: any = Math.floor(daysBetween(shift.altAnchorDate, dateStr) / 7);
                return (((weeksSince % 2) + 2) % 2) === 0;
            }
            return false;
        }
        const cycle: any = (Number(shift.daysOn) || 0) + (Number(shift.daysOff) || 0);
        if (cycle <= 0)
            return true;
        const daysSince: any = daysBetween(assignment.startDate, dateStr);
        const pos: any = ((daysSince % cycle) + cycle) % cycle;
        return pos < (Number(shift.daysOn) || 0);
    }
    // A shift pattern's own lifecycle -- rotations get set up for a period (a month, a quarter, six
    // months, a year) and then a different pattern takes over. "current" covers patterns with no
    // end date at all (open-ended, the common case), so only ones explicitly given a past end date
    // count as "past".
    function shiftPatternStatus(shift?: any, todayStr?: any): any {
        todayStr = todayStr || fmt(new Date() as any);
        if (shift.startDate && shift.startDate > todayStr)
            return 'future';
        if (shift.endDate && shift.endDate < todayStr)
            return 'past';
        return 'current';
    }
    // Current patterns first, then future ones (soonest-starting first), with past ones (when
    // included at all) last, most-recently-ended first -- used everywhere a person picks a pattern
    // from a list, so what's relevant right now is always what they see first.
    function sortShiftsForSelection(shifts?: any, todayStr?: any): any {
        todayStr = todayStr || fmt(new Date() as any);
        const rank: any = { current: 0, future: 1, past: 2 } as any;
        return shifts.slice().sort((a?: any, b?: any): any => {
            const ra: any = rank[shiftPatternStatus(a, todayStr)], rb: any = rank[shiftPatternStatus(b, todayStr)];
            if (ra !== rb)
                return ra - rb;
            if (ra === 2)
                return (b.startDate || '').localeCompare(a.startDate || '');
            return (a.startDate || '').localeCompare(b.startDate || '');
        });
    }
    function formatShiftDateRange(shift?: any): any {
        if (!shift.startDate && !shift.endDate)
            return 'Ongoing';
        const start: any = shift.startDate ? (new Date(shift.startDate + 'T00:00:00') as any).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' } as any) : 'Always';
        const end: any = shift.endDate ? (new Date(shift.endDate + 'T00:00:00') as any).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' } as any) : 'ongoing';
        return `${start} \u2013 ${end}`;
    }
    // Human-readable summary of a pattern's schedule for the Shift Patterns table.
    function describeShiftPattern(shift?: any): any {
        if (shift.patternType === 'weekly') {
            const main: any = (shift.weekdays || []).slice().sort().map((d?: any): any => WEEKDAY_LABELS[d]).join(', ') || 'No days set';
            const alt: any = (shift.altWeekdays || []).slice().sort().map((d?: any): any => WEEKDAY_LABELS[d]).join(', ');
            return alt ? `${main} + alt ${alt}` : main;
        }
        return `${shift.daysOn} on / ${shift.daysOff} off`;
    }
    // Day-off / leave exception codes. These are what actually change a shift's effective
    // staffing count day to day -- someone can be "on duty" per their rotation and still not
    // count toward coverage because they're on an approved exception for that date.
    // Codes themselves are tenant-configurable (Administration > Exception Codes), not fixed --
    // this just looks up whatever the agency currently has defined, with a safe fallback for a
    // code that's since been removed so historical records still render sensibly.
    function exceptionCodeInfo(code?: any): any {
        const found: any = (STATE.pm.refData.exceptionCodes || []).find((c?: any): any => c.code === code);
        return found || { name: code, color: 'var(--text-dim)' } as any;
    }
    // Codes selectable for a *new* entry -- excludes expired ones, except we always keep the
    // code an in-progress edit is already using so switching tabs on the modal never silently
    // discards the existing value.
    function selectableExceptionCodes(currentCode?: any): any {
        const all: any = STATE.pm.refData.exceptionCodes || [];
        const active: any = all.filter((c?: any): any => c.active !== false);
        if (currentCode && !active.some((c?: any): any => c.code === currentCode)) {
            const existing: any = all.find((c?: any): any => c.code === currentCode);
            if (existing)
                return [...active, existing];
        }
        return active;
    }
    const SWAP_COVERAGE_COLOR: any = '#0EA5E9';
    // The exception (if any) covering a person on a given date, inclusive of both endpoints.
    function activeExceptionFor(personId?: any, dateStr?: any): any {
        return (STATE.pm.scheduleExceptions || []).find((e?: any): any => e.personId === personId && e.startDate <= dateStr && e.endDate >= dateStr) || null;
    }
    const SHIFT_COLOR_PALETTE: any = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899', '#14B8A6', '#EAB308', '#EF4444', '#6366F1', '#84CC16'];
    // Every shift pattern gets its own color for the calendar. Patterns created from now on get one
    // assigned and stored at creation time; patterns that already existed before this feature get a
    // color derived deterministically from their id instead, so they still look distinct and stable
    // (same pattern always gets the same color) without needing any data migration.
    function shiftColor(shift?: any): any {
        if (shift.color)
            return shift.color;
        let hash: any = 0;
        const str: any = shift.id || shift.name || '';
        for (let i: any = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }
        return SHIFT_COLOR_PALETTE[hash % SHIFT_COLOR_PALETTE.length];
    }
    const SCHED_TABS: any = [
        { key: 'roster', label: 'Roster & Patterns', ability: 'pm_schedule_view' } as any,
        { key: 'timeoff', label: 'Time Off Requests', ability: ['pm_leave_request_submit', 'pm_leave_request_approve'] } as any,
        { key: 'overtime', label: 'Overtime & Callback', ability: 'pm_overtime_view' } as any,
        { key: 'bidding', label: 'Bidding & Vacation Picks', ability: 'pm_bidding_view' } as any,
        { key: 'extraduty', label: 'Extra Duty', ability: 'pm_extraduty_view' } as any,
        { key: 'rollcall', label: 'Roll Call', ability: 'pm_rollcall_view' } as any,
    ];
    function renderScheduling(): any {
        if (!STATE.pm.scheduleExceptions)
            STATE.pm.scheduleExceptions = [];
        if (!STATE.pm.shiftSwapRequests)
            STATE.pm.shiftSwapRequests = [];
        if (!STATE.pm.scheduleCoverages)
            STATE.pm.scheduleCoverages = [];
        if (!STATE.pm.otCallbackOptIns)
            STATE.pm.otCallbackOptIns = [];
        if (!STATE.pm.bidCycles)
            STATE.pm.bidCycles = [];
        if (!STATE.pm.extraDutyJobs)
            STATE.pm.extraDutyJobs = [];
        if (!STATE.pm.extraDutySignups)
            STATE.pm.extraDutySignups = [];
        if (!STATE.pm.rollCalls)
            STATE.pm.rollCalls = [];
        if (!STATE.pm.leaveRequests)
            STATE.pm.leaveRequests = [];
        const visibleTabs: any = SCHED_TABS.filter((t?: any): any => Array.isArray(t.ability) ? t.ability.some((a?: any): any => can(a)) : can(t.ability));
        if (!visibleTabs.length) {
            (document as any).getElementById('view-pm-scheduling').innerHTML = permissionBlockedView("You don't have permission to view scheduling in this role.");
            return;
        }
        if (!visibleTabs.some((t?: any): any => t.key === SCHED_SUBTAB))
            SCHED_SUBTAB = visibleTabs[0].key;
        (document as any).getElementById('view-pm-scheduling').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${visibleTabs.map((t?: any): any => `<button class="btn btn-sm ${SCHED_SUBTAB === t.key ? 'btn-primary' : 'btn-outline'}" data-sched-tab="${t.key}">${t.label}</button>`).join('')}
    </div>
    <div id="schedSubBody"></div>
  `;
        (document as any).querySelectorAll('[data-sched-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { SCHED_SUBTAB = b.dataset.schedTab; renderScheduling(); }));
        if (SCHED_SUBTAB === 'roster')
            renderRosterSub();
        else if (SCHED_SUBTAB === 'timeoff')
            renderTimeOffSub();
        else if (SCHED_SUBTAB === 'overtime')
            renderOvertimeSub();
        else if (SCHED_SUBTAB === 'bidding')
            renderBiddingSub();
        else if (SCHED_SUBTAB === 'extraduty')
            renderExtraDutySub();
        else if (SCHED_SUBTAB === 'rollcall')
            renderRollCallSub();
    }
    function renderRosterSub(): any {
        if (!STATE.pm.scheduleExceptions)
            STATE.pm.scheduleExceptions = [];
        if (!STATE.pm.shiftSwapRequests)
            STATE.pm.shiftSwapRequests = [];
        if (!STATE.pm.scheduleCoverages)
            STATE.pm.scheduleCoverages = [];
        const canManage: any = can('pm_schedule_manage');
        const todayStr: any = fmt(new Date() as any);
        const visibleShifts: any = sortShiftsForSelection(SHOW_PAST_SHIFT_PATTERNS ? STATE.pm.scheduleShifts : STATE.pm.scheduleShifts.filter((s?: any): any => shiftPatternStatus(s, todayStr) !== 'past'), todayStr);
        const pastCount: any = STATE.pm.scheduleShifts.filter((s?: any): any => shiftPatternStatus(s, todayStr) === 'past').length;
        const shiftRows: any = visibleShifts.map((s?: any): any => {
            const status: any = shiftPatternStatus(s, todayStr);
            const statusBadge: any = status === 'future' ? `<span class="badge" style="background:var(--gold)22;color:var(--gold);margin-left:8px;">Upcoming</span>` : status === 'past' ? `<span class="badge" style="background:var(--text-dim)22;color:var(--text-dim);margin-left:8px;">Past</span>` : '';
            return `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${shiftColor(s)};margin-right:8px;"></span>${escapeHtml(s.name)}${statusBadge}</td><td>${escapeHtml(describeShiftPattern(s))}</td><td>${SuiteUX.displayTimeOnly(s.hoursStart)} - ${SuiteUX.displayTimeOnly(s.hoursEnd)}</td><td>${s.minStaff || 0}</td><td style="font-size:12px;color:var(--text-dim);">${escapeHtml(formatShiftDateRange(s))}</td>
    ${canManage ? `<td><div class="cell-actions"><button class="btn-icon" data-edit-shift="${s.id}" title="Edit">${ICONS.edit}</button><button class="btn-icon" data-del-shift="${s.id}" title="Delete">${ICONS.trash}</button></div></td>` : '<td></td>'}</tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">${SHOW_PAST_SHIFT_PATTERNS ? 'No shift patterns defined yet.' : 'No current or upcoming shift patterns. ' + (pastCount ? '<button class="btn-sm btn btn-outline" id="btnShowPastShiftsInline">Show past patterns</button>' : '')}</td></tr>`;
        const rosterRows: any = STATE.pm.scheduleAssignments.filter((a?: any): any => !a.endDate).map((a?: any): any => {
            const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === a.shiftId);
            return `<tr><td>${recordLink(a.personId)}</td><td>${escapeHtml(a.unit)}</td><td>${shift ? escapeHtml(shift.name) : '—'}</td>
    <td>${shift ? SuiteUX.displayTimeOnly(shift.hoursStart) + ' - ' + SuiteUX.displayTimeOnly(shift.hoursEnd) : ''}</td><td>${escapeHtml(a.location)}</td>
    ${canManage ? `<td><div class="cell-actions"><button class="btn-icon" data-edit-assign="${a.id}" title="Edit">${ICONS.edit}</button><button class="btn-icon" data-del-assign="${a.id}" title="End assignment">${ICONS.trash}</button></div></td>` : '<td></td>'}</tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No active shift assignments.</td></tr>`;
        const exceptionRows: any = (STATE.pm.scheduleExceptions || []).slice()
            .filter((e?: any): any => {
            if (!EXCEPTIONS_FILTER.showPast && e.endDate < todayStr)
                return false;
            const q: any = EXCEPTIONS_FILTER.q.trim().toLowerCase();
            if (q && !personName(e.personId).toLowerCase().includes(q) && !(e.notes || '').toLowerCase().includes(q) && !e.code.toLowerCase().includes(q))
                return false;
            if (EXCEPTIONS_FILTER.dateFrom && e.endDate < EXCEPTIONS_FILTER.dateFrom)
                return false;
            if (EXCEPTIONS_FILTER.dateTo && e.startDate > EXCEPTIONS_FILTER.dateTo)
                return false;
            return true;
        })
            .sort((a?: any, b?: any): any => b.startDate.localeCompare(a.startDate)).map((e?: any): any => {
            const code: any = exceptionCodeInfo(e.code);
            const dateRange: any = e.startDate === e.endDate ? e.startDate : `${e.startDate} to ${e.endDate}`;
            return `<tr><td>${recordLink(e.personId)}</td><td><span class="badge" style="background:${code.color}22;color:${code.color};border:1px solid ${code.color}55;">${escapeHtml(e.code)}</span> <span style="color:var(--text-dim);font-size:11px;">${escapeHtml(code.name)}</span></td><td>${escapeHtml(dateRange)}</td><td>${escapeHtml(e.notes || '')}</td>
    ${canManage ? `<td><div class="cell-actions"><button class="btn-icon" data-edit-exception="${e.id}" title="Edit">${ICONS.edit}</button><button class="btn-icon" data-del-exception="${e.id}" title="Delete">${ICONS.trash}</button></div></td>` : '<td></td>'}</tr>`;
        }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">${(STATE.pm.scheduleExceptions || []).length ? 'No time off or exceptions match this filter.' : 'No time off or exceptions logged.'}</td></tr>`;
        const excPastCount: any = (STATE.pm.scheduleExceptions || []).filter((e?: any): any => e.endDate < todayStr).length;
        const swapStatusColors: any = { pending: 'var(--gold)', approved: 'var(--green)', denied: 'var(--red)', cancelled: 'var(--text-dim)' } as any;
        const swapRows: any = (STATE.pm.shiftSwapRequests || []).slice()
            .filter((r?: any): any => {
            if (!SWAP_FILTER.showPast && r.date < todayStr)
                return false;
            const q: any = SWAP_FILTER.q.trim().toLowerCase();
            if (q && !personName(r.requesterId).toLowerCase().includes(q) && !personName(r.coveringId).toLowerCase().includes(q) && !(r.reason || '').toLowerCase().includes(q))
                return false;
            if (SWAP_FILTER.dateFrom && r.date < SWAP_FILTER.dateFrom)
                return false;
            if (SWAP_FILTER.dateTo && r.date > SWAP_FILTER.dateTo)
                return false;
            return true;
        })
            .sort((a?: any, b?: any): any => b.date.localeCompare(a.date)).map((r?: any): any => {
            const isOwn: any = r.requesterId === CURRENT_USER_ID;
            const actions: any = [];
            if (r.status === 'pending' && canManage)
                actions.push(`<button class="btn-icon" data-approve-swap="${r.id}" title="Approve" style="color:var(--green);">${ICONS.check || '&check;'}</button><button class="btn-icon" data-deny-swap="${r.id}" title="Deny" style="color:var(--red);">${ICONS.x || '&times;'}</button>`);
            if (r.status === 'pending' && isOwn)
                actions.push(`<button class="btn-sm btn btn-outline" data-cancel-swap="${r.id}">Cancel</button>`);
            if (canManage)
                actions.push(`<button class="btn-icon" data-del-swap="${r.id}" title="Delete record">${ICONS.trash}</button>`);
            return `<tr><td>${escapeHtml(r.date)}</td><td>${recordLink(r.requesterId)}</td><td>${recordLink(r.coveringId)}</td><td>${escapeHtml(r.reason || '')}</td>
    <td><span style="color:${swapStatusColors[r.status] || 'var(--text-dim)'};font-weight:700;text-transform:capitalize;">${escapeHtml(r.status)}</span></td>
    <td><div class="cell-actions">${actions.join('')}</div></td></tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">${(STATE.pm.shiftSwapRequests || []).length ? 'No shift swap requests match this filter.' : 'No shift swap requests.'}</td></tr>`;
        const swapPastCount: any = (STATE.pm.shiftSwapRequests || []).filter((r?: any): any => r.date < todayStr).length;
        (document as any).getElementById('schedSubBody').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the schedule in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      ${collapsibleCardHead('shiftPatterns', '<h2>Shift Patterns</h2>', `
          ${pastCount ? `<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkShowPastShifts" style="width:auto;" ${SHOW_PAST_SHIFT_PATTERNS ? 'checked' : ''}> Show ${pastCount} past pattern${pastCount === 1 ? '' : 's'}</label>` : ''}
          ${canManage ? `<button class="btn btn-sm btn-primary" id="btnAddShift">${ICONS.plus} New Pattern</button>` : ''}
        `)}
      <div data-panel-body="shiftPatterns" style="${schedCardCollapsed('shiftPatterns') ? 'display:none;' : ''}">
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Pattern</th><th>Rotation</th><th>Hours</th><th>Min Staff</th><th>Dates</th><th></th></tr></thead><tbody>${shiftRows}</tbody></table></div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      ${collapsibleCardHead('dutyRoster', `<div><h2 style="display:inline;">Duty Roster</h2> <span class="hint">${STATE.pm.scheduleAssignments.filter((a?: any): any => !a.endDate).length} active assignments</span></div>`, `
          <div class="work-tabs" style="padding:0;border:0;" aria-label="Duty roster view">
            <button class="work-tab ${SCHED_VIEW === 'roster' ? 'active' : ''}" aria-pressed="${SCHED_VIEW === 'roster'}" data-sched-view="roster">List</button>
            <button class="work-tab ${SCHED_VIEW === 'calendar' ? 'active' : ''}" aria-pressed="${SCHED_VIEW === 'calendar'}" data-sched-view="calendar">Calendar</button>
          </div>
          ${canManage ? `<button class="btn btn-sm btn-outline" id="btnAddAssignment">${ICONS.plus} Assign Shift</button>` : ''}
          <button class="btn btn-sm btn-outline" id="btnPrintRoster">Print / Save as PDF</button>
        `)}
      <div data-panel-body="dutyRoster" style="${schedCardCollapsed('dutyRoster') ? 'display:none;' : ''}">
        <div class="panel-body" id="dutyRosterBody" style="overflow-x:auto;"></div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      ${collapsibleCardHead('exceptions', '<h2>Time Off &amp; Exceptions</h2>', canManage ? `<button class="btn btn-sm btn-outline" id="btnAddException">${ICONS.plus} Log Exception</button>` : '', `<div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">RDO (Regular Day Off), VDO (Vacation), CDO (Compensatory Day Off), SDO (Scheduled Day Off), and TDO (Training Day Off) all reduce that day's on-duty count on the Calendar below, even for someone who'd otherwise be working per their rotation.</div>`)}
      <div data-panel-body="exceptions" style="${schedCardCollapsed('exceptions') ? 'display:none;' : ''}">
        <div class="toolbar" style="padding:14px 20px 0;margin-bottom:0;">
          <div class="filters">
            <input type="text" id="excSearch" placeholder="Search name, code, or notes..." style="width:220px;" value="${escapeHtml(EXCEPTIONS_FILTER.q)}">
            <input type="date" id="excDateFrom" title="On or after this date" value="${EXCEPTIONS_FILTER.dateFrom}">
            <input type="date" id="excDateTo" title="On or before this date" value="${EXCEPTIONS_FILTER.dateTo}">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkExcShowPast" style="width:auto;" ${EXCEPTIONS_FILTER.showPast ? 'checked' : ''}> Show past${excPastCount ? ` (${excPastCount})` : ''}</label>
          </div>
        </div>
        <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Code</th><th>Dates</th><th>Notes</th><th></th></tr></thead><tbody>${exceptionRows}</tbody></table></div>
      </div>
    </div>
    <div class="panel">
      ${collapsibleCardHead('swaps', '<h2>Shift Swap Requests</h2>', `<button class="btn btn-sm btn-primary" id="btnRequestSwap">${ICONS.plus} Request Swap</button>`, `<div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">Anyone can submit a swap request; approving it here logs an SWP entry for the person taking the day off and adds the covering officer to that day's Calendar and staffing count.</div>`)}
      <div data-panel-body="swaps" style="${schedCardCollapsed('swaps') ? 'display:none;' : ''}">
        <div class="toolbar" style="padding:14px 20px 0;margin-bottom:0;">
          <div class="filters">
            <input type="text" id="swapSearch" placeholder="Search name or reason..." style="width:220px;" value="${escapeHtml(SWAP_FILTER.q)}">
            <input type="date" id="swapDateFrom" title="On or after this date" value="${SWAP_FILTER.dateFrom}">
            <input type="date" id="swapDateTo" title="On or before this date" value="${SWAP_FILTER.dateTo}">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkSwapShowPast" style="width:auto;" ${SWAP_FILTER.showPast ? 'checked' : ''}> Show past${swapPastCount ? ` (${swapPastCount})` : ''}</label>
          </div>
        </div>
        <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Requesting</th><th>Covering</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${swapRows}</tbody></table></div>
      </div>
    </div>
  `;
        wireCollapsibleCards((document as any).getElementById('schedSubBody'));
        (document as any).getElementById('btnPrintRoster').addEventListener('click', (): any => (window as any).print());
        (document as any).getElementById('btnRequestSwap').addEventListener('click', (): any => openSwapRequestModal());
        (document as any).querySelectorAll('[data-sched-view]').forEach((b?: any): any => b.addEventListener('click', (): any => { SCHED_VIEW = b.dataset.schedView; renderScheduling(); }));
        const rosterBody: any = (document as any).getElementById('dutyRosterBody');
        if (SCHED_VIEW === 'calendar') {
            rosterBody.style.padding = '16px';
            renderDutyCalendar(rosterBody);
        }
        else {
            rosterBody.style.padding = '0';
            rosterBody.innerHTML = `<table><thead><tr><th>Employee</th><th>Unit</th><th>Shift Pattern</th><th>Hours</th><th>Location</th><th></th></tr></thead><tbody>${rosterRows}</tbody></table>`;
        }
        (document as any).querySelectorAll('[data-approve-swap]').forEach((b?: any): any => b.addEventListener('click', (): any => approveSwapRequest(b.dataset.approveSwap)));
        (document as any).querySelectorAll('[data-deny-swap]').forEach((b?: any): any => b.addEventListener('click', (): any => denySwapRequest(b.dataset.denySwap)));
        (document as any).querySelectorAll('[data-cancel-swap]').forEach((b?: any): any => b.addEventListener('click', (): any => cancelSwapRequest(b.dataset.cancelSwap)));
        (document as any).querySelectorAll('[data-del-swap]').forEach((b?: any): any => b.addEventListener('click', (): any => deleteSwapRequest(b.dataset.delSwap)));
        const showPastChk: any = (document as any).getElementById('chkShowPastShifts');
        if (showPastChk)
            showPastChk.addEventListener('change', (): any => { SHOW_PAST_SHIFT_PATTERNS = showPastChk.checked; renderScheduling(); });
        const showPastInline: any = (document as any).getElementById('btnShowPastShiftsInline');
        if (showPastInline)
            showPastInline.addEventListener('click', (): any => { SHOW_PAST_SHIFT_PATTERNS = true; renderScheduling(); });
        (document as any).getElementById('excSearch').addEventListener('input', (e?: any): any => { EXCEPTIONS_FILTER.q = e.target.value; renderScheduling(); refocusFilterInput('excSearch'); });
        (document as any).getElementById('excDateFrom').addEventListener('change', (e?: any): any => { EXCEPTIONS_FILTER.dateFrom = e.target.value; renderScheduling(); });
        (document as any).getElementById('excDateTo').addEventListener('change', (e?: any): any => { EXCEPTIONS_FILTER.dateTo = e.target.value; renderScheduling(); });
        (document as any).getElementById('chkExcShowPast').addEventListener('change', (e?: any): any => { EXCEPTIONS_FILTER.showPast = e.target.checked; renderScheduling(); });
        (document as any).getElementById('swapSearch').addEventListener('input', (e?: any): any => { SWAP_FILTER.q = e.target.value; renderScheduling(); refocusFilterInput('swapSearch'); });
        (document as any).getElementById('swapDateFrom').addEventListener('change', (e?: any): any => { SWAP_FILTER.dateFrom = e.target.value; renderScheduling(); });
        (document as any).getElementById('swapDateTo').addEventListener('change', (e?: any): any => { SWAP_FILTER.dateTo = e.target.value; renderScheduling(); });
        (document as any).getElementById('chkSwapShowPast').addEventListener('change', (e?: any): any => { SWAP_FILTER.showPast = e.target.checked; renderScheduling(); });
        if (canManage) {
            (document as any).getElementById('btnAddShift').addEventListener('click', (): any => openShiftFormModal(null));
            (document as any).getElementById('btnAddAssignment').addEventListener('click', (): any => openAssignmentFormModal(null));
            (document as any).getElementById('btnAddException').addEventListener('click', (): any => openExceptionFormModal(null));
            (document as any).querySelectorAll('[data-edit-shift]').forEach((b?: any): any => b.addEventListener('click', (): any => openShiftFormModal(STATE.pm.scheduleShifts.find((s?: any): any => s.id === b.dataset.editShift))));
            (document as any).querySelectorAll('[data-del-shift]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const inUse: any = STATE.pm.scheduleAssignments.some((a?: any): any => a.shiftId === b.dataset.delShift && !a.endDate);
                if (inUse) {
                    toast("Can't remove a pattern that's actively assigned.", true);
                    return;
                }
                STATE.pm.scheduleShifts = STATE.pm.scheduleShifts.filter((s?: any): any => s.id !== b.dataset.delShift);
                persist();
                renderScheduling();
            }));
            (document as any).querySelectorAll('[data-edit-assign]').forEach((b?: any): any => b.addEventListener('click', (): any => openAssignmentFormModal(STATE.pm.scheduleAssignments.find((a?: any): any => a.id === b.dataset.editAssign))));
            (document as any).querySelectorAll('[data-del-assign]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const a: any = STATE.pm.scheduleAssignments.find((x?: any): any => x.id === b.dataset.delAssign);
                if (!confirm(`End the shift assignment for ${personName(a.personId)}?`))
                    return;
                a.endDate = fmt(new Date() as any);
                logActivity(`Ended shift assignment for ${personName(a.personId)}.`, "schedule", a.id);
                persist();
                renderScheduling();
            }));
            (document as any).querySelectorAll('[data-edit-exception]').forEach((b?: any): any => b.addEventListener('click', (): any => openExceptionFormModal(STATE.pm.scheduleExceptions.find((e?: any): any => e.id === b.dataset.editException))));
            (document as any).querySelectorAll('[data-del-exception]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const e: any = STATE.pm.scheduleExceptions.find((x?: any): any => x.id === b.dataset.delException);
                if (!confirm(`Delete this ${e.code} entry for ${personName(e.personId)}?`))
                    return;
                STATE.pm.scheduleExceptions = STATE.pm.scheduleExceptions.filter((x?: any): any => x.id !== e.id);
                logActivity(`Deleted a ${e.code} exception for ${personName(e.personId)}.`, "schedule");
                persist();
                renderScheduling();
            }));
        }
        wireRecordLinks();
    }
    /* =========================================================================
       SCHEDULING: shared helpers used by Overtime, Bidding, Extra Duty, Roll Call
       ========================================================================= */
    // Earliest hire date wins (most senior). Missing hire dates sort last, not first --
    // treating an unknown hire date as "senior" would be actively wrong.
    function seniorityDate(personId?: any): any {
        const r: any = recordFor(personId);
        return (r && r.hireDate) ? r.hireDate : '9999-99-99';
    }
    function personPhone(personId?: any): any {
        const r: any = recordFor(personId);
        return (r && r.phones && r.phones[0] && r.phones[0].number) || '';
    }
    // Duration of a shift pattern in hours, handling the overnight-wrap case (e.g. 18:00-06:00).
    function shiftHours(shift?: any): any {
        if (!shift)
            return 0;
        const toMin: any = (t?: any): any => { const parts: any = (t || '00:00').split(':'); return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0); };
        let mins: any = toMin(shift.hoursEnd) - toMin(shift.hoursStart);
        if (mins <= 0)
            mins += 24 * 60;
        return Math.round((mins / 60) * 100) / 100;
    }
    // Everyone actually on duty for a shift/date: assigned per rotation, minus anyone with an
    // active time-off exception that day, plus anyone added via a one-off coverage (swap or OT).
    function onDutyRoster(shift?: any, dateStr?: any): any {
        const assigned: any = STATE.pm.scheduleAssignments.filter((a?: any): any => !a.endDate && isOnDutyOnDate(a, shift, dateStr) && !activeExceptionFor(a.personId, dateStr)).map((a?: any): any => a.personId);
        const covering: any = (STATE.pm.scheduleCoverages || []).filter((c?: any): any => c.date === dateStr && c.shiftId === shift.id).map((c?: any): any => c.personId);
        return [...new Set([...assigned, ...covering])];
    }
    function computeCoverageGaps(days?: any): any {
        const todayStr: any = fmt(new Date() as any);
        const shifts: any = STATE.pm.scheduleShifts.filter((s?: any): any => shiftPatternStatus(s, todayStr) !== 'past' && (Number(s.minStaff) || 0) > 0);
        const gaps: any = [];
        for (let i: any = 0; i < days; i++) {
            const dateStr: any = fmt(addDays(new Date() as any, i));
            shifts.forEach((shift?: any): any => {
                const minStaff: any = Number(shift.minStaff) || 0;
                const staffed: any = onDutyRoster(shift, dateStr).length;
                if (staffed < minStaff)
                    gaps.push({ date: dateStr, shiftId: shift.id, shift, staffed, minStaff, needed: minStaff - staffed } as any);
            });
        }
        return gaps;
    }
    // Overtime hours a person has actually worked (confirmed coverages logged as overtime),
    // counted over a trailing window -- this is what fairness rotation sorts by.
    function otHoursSince(personId?: any, sinceDateStr?: any): any {
        return (STATE.pm.scheduleCoverages || []).filter((c?: any): any => c.personId === personId && c.source === 'overtime' && c.date >= sinceDateStr)
            .reduce((sum?: any, c?: any): any => sum + (Number(c.hours) || 0), 0);
    }
    // Fewest overtime hours in the last 90 days gets called first; ties break by seniority.
    // This is the standard "equalization" rule most agencies actually run callback lists by --
    // straight seniority order would let senior officers hoard overtime indefinitely.
    function rankedCallbackList(): any {
        const since: any = fmt(addDays(new Date() as any, -90));
        return (STATE.pm.otCallbackOptIns || []).map((personId?: any): any => ({
            personId, hours: otHoursSince(personId, since), seniority: seniorityDate(personId)
        } as any)).sort((a?: any, b?: any): any => a.hours - b.hours || a.seniority.localeCompare(b.seniority));
    }
    function renderOvertimeSub(): any {
        const canManage: any = can('pm_overtime_manage');
        const canOptIn: any = can('pm_overtime_optin');
        const gaps: any = computeCoverageGaps(OT_LOOKAHEAD_DAYS);
        const ranked: any = rankedCallbackList();
        const isOptedIn: any = STATE.pm.otCallbackOptIns.includes(CURRENT_USER_ID);
        const eligibleToAdd: any = STATE.personnel.filter((p?: any): any => !STATE.pm.otCallbackOptIns.includes(p.id));
        const gapRows: any = gaps.map((g?: any): any => `<tr>
    <td>${escapeHtml(g.date)}</td>
    <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${shiftColor(g.shift)};margin-right:8px;"></span>${escapeHtml(g.shift.name)}</td>
    <td style="color:var(--red);font-weight:700;">${g.staffed}/${g.minStaff} staffed</td>
    <td>${g.needed} needed</td>
    ${canManage ? `<td><button class="btn btn-sm btn-primary" data-fill-gap="${escapeHtml(g.date)}|${escapeHtml(g.shiftId)}">Fill</button></td>` : '<td></td>'}
  </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No coverage gaps in the next ${OT_LOOKAHEAD_DAYS} days.</td></tr>`;
        const rankRows: any = ranked.map((row?: any, i?: any): any => `<tr>
    <td>${i + 1}</td><td>${recordLink(row.personId)}</td><td>${escapeHtml(personPhone(row.personId) || '—')}</td><td>${row.hours.toFixed(1)} hrs</td>
    ${canManage ? `<td><button class="btn-icon" data-remove-optin="${row.personId}" title="Remove from list">${ICONS.trash}</button></td>` : '<td></td>'}
  </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No one is currently on the callback list.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Coverage Gaps</h2><span class="hint">Next ${OT_LOOKAHEAD_DAYS} days &middot; current shift patterns with a minimum staffing requirement</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Shift</th><th>Staffing</th><th></th><th></th></tr></thead><tbody>${gapRows}</tbody></table></div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h2>Overtime Callback List</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          ${canOptIn ? `<button class="btn btn-sm ${isOptedIn ? 'btn-outline' : 'btn-primary'}" id="btnToggleOptIn">${isOptedIn ? 'Leave the list' : 'Join the callback list'}</button>` : ''}
          ${canManage ? `<select id="fAddOptIn" style="max-width:220px;"><option value="">Add someone…</option>${eligibleToAdd.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>` : ''}
        </div>
      </div>
      <div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">Ranked by fewest overtime hours worked in the last 90 days, so the person owed the least overtime gets called first. Ties break by seniority.</div>
      <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>#</th><th>Employee</th><th>Phone</th><th>OT Hours (90d)</th><th></th></tr></thead><tbody>${rankRows}</tbody></table></div>
    </div>
  `;
        (document as any).querySelectorAll('[data-fill-gap]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const [date, shiftId]: any = b.dataset.fillGap.split('|');
            openFillGapModal(date, shiftId);
        }));
        const optInBtn: any = (document as any).getElementById('btnToggleOptIn');
        if (optInBtn)
            optInBtn.addEventListener('click', (): any => {
                if (isOptedIn)
                    STATE.pm.otCallbackOptIns = STATE.pm.otCallbackOptIns.filter((id?: any): any => id !== CURRENT_USER_ID);
                else
                    STATE.pm.otCallbackOptIns.push(CURRENT_USER_ID);
                logActivity(`${isOptedIn ? 'Left' : 'Joined'} the overtime callback list.`, "schedule");
                persist();
                renderOvertimeSub();
            });
        const addSel: any = (document as any).getElementById('fAddOptIn');
        if (addSel)
            addSel.addEventListener('change', (): any => {
                if (!addSel.value)
                    return;
                STATE.pm.otCallbackOptIns.push(addSel.value);
                logActivity(`Added ${personName(addSel.value)} to the overtime callback list.`, "schedule");
                persist();
                renderOvertimeSub();
            });
        (document as any).querySelectorAll('[data-remove-optin]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            STATE.pm.otCallbackOptIns = STATE.pm.otCallbackOptIns.filter((id?: any): any => id !== b.dataset.removeOptin);
            logActivity(`Removed ${personName(b.dataset.removeOptin)} from the overtime callback list.`, "schedule");
            persist();
            renderOvertimeSub();
        }));
        wireRecordLinks();
    }
    function openFillGapModal(date?: any, shiftId?: any): any {
        const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === shiftId);
        if (!shift)
            return;
        const onDuty: any = new Set(onDutyRoster(shift, date));
        const ranked: any = rankedCallbackList().filter((row?: any): any => !onDuty.has(row.personId));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Fill Coverage Gap</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-dim);margin-top:0;">${escapeHtml(shift.name)} &middot; ${escapeHtml(date)}</p>
      <table><thead><tr><th>#</th><th>Employee</th><th>Phone</th><th>OT Hours (90d)</th><th></th></tr></thead><tbody>
        ${ranked.map((row?: any, i?: any): any => `<tr><td>${i + 1}</td><td>${escapeHtml(personName(row.personId))}</td><td>${escapeHtml(personPhone(row.personId) || '—')}</td><td>${row.hours.toFixed(1)}</td><td><button class="btn btn-sm btn-primary" data-confirm-fill="${row.personId}">Log as Filled</button></td></tr>`).join('')
            || (STATE.pm.otCallbackOptIns.length ? `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">Everyone on the callback list is already working that day.</td></tr>` : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No one is on the callback list yet. Add people from the Overtime &amp; Callback tab first.</td></tr>`)}
      </tbody></table>
      <p style="font-size:11px;color:var(--text-dim);">Not on this list? Add them to the callback list first from the Overtime &amp; Callback tab.</p>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button>${StaffNotices.canCompose() ? '<button class="btn btn-primary" id="mOfferSms">Notify eligible staff</button>' : ''}</div>
  `;
        openModal();
        (document as any).getElementById('mOfferSms')?.addEventListener('click', (): any => StaffNotices.offer(ranked.map((row?: any): any => row.personId), shift, date));
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).querySelectorAll('[data-confirm-fill]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const personId: any = b.dataset.confirmFill;
            STATE.pm.scheduleCoverages.push({ id: 'cov' + Date.now(), personId, shiftId, unit: shift.name, location: '', date, source: 'overtime', hours: shiftHours(shift) } as any);
            logActivity(`Logged overtime callback: ${personName(personId)} to cover ${shift.name} on ${date}.`, "schedule");
            persist();
            toast("Overtime callback logged.");
            closeModal();
            renderOvertimeSub();
        }));
    }
    /* =========================================================================
       SCHEDULING: Bidding & Vacation Picks
       ========================================================================= */
    function bidCycleFor(id?: any): any { return (STATE.pm.bidCycles || []).find((c?: any): any => c.id === id); }
    function renderBiddingSub(): any {
        const canManage: any = can('pm_bidding_manage');
        const cycle: any = BIDDING_CYCLE_ID ? bidCycleFor(BIDDING_CYCLE_ID) : null;
        if (cycle)
            renderBidCycleDetail(cycle, canManage);
        else
            renderBidCycleList(canManage);
    }
    function renderBidCycleList(canManage?: any): any {
        const rows: any = (STATE.pm.bidCycles || []).slice().sort((a?: any, b?: any): any => (b.opensDate || '').localeCompare(a.opensDate || '')).map((c?: any): any => {
            const statusColor: any = c.status === 'awarded' ? 'var(--green)' : c.status === 'closed' ? 'var(--gold)' : 'var(--blue)';
            return `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td><span class="badge" style="background:${c.type === 'vacation' ? '#14B8A622' : '#1855C622'};color:${c.type === 'vacation' ? '#14B8A6' : '#1855C6'};">${c.type === 'vacation' ? 'Vacation Pick' : 'Shift Bid'}</span></td>
      <td style="font-size:12px;">${escapeHtml(c.opensDate)} to ${escapeHtml(c.closesDate)}</td>      <td style="color:${statusColor};font-weight:700;text-transform:capitalize;">${escapeHtml(c.status)}</td>
      <td>${(c.submissions || []).length}</td>
      <td><button class="btn btn-sm btn-outline" data-view-cycle="${c.id}">View</button></td>
    </tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No bid cycles created yet.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Bid Cycles</h2>${canManage ? `<button class="btn btn-sm btn-primary" id="btnNewBidCycle">${ICONS.plus} New Cycle</button>` : ''}</div>
      <div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">A shift bid awards open shift-pattern slots by seniority. A vacation pick awards date-range requests by seniority, respecting a daily cap on how many people can be off at once.</div>
      <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Name</th><th>Type</th><th>Window</th><th>Status</th><th>Submissions</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
        const newBtn: any = (document as any).getElementById('btnNewBidCycle');
        if (newBtn)
            newBtn.addEventListener('click', openBidCycleFormModal);
        (document as any).querySelectorAll('[data-view-cycle]').forEach((b?: any): any => b.addEventListener('click', (): any => { BIDDING_CYCLE_ID = b.dataset.viewCycle; renderBiddingSub(); }));
    }
    function renderBidCycleDetail(cycle?: any, canManage?: any): any {
        const canSubmit: any = can('pm_bidding_submit');
        const today: any = fmt(new Date() as any);
        const windowOpen: any = cycle.status === 'open' && today >= cycle.opensDate && today <= cycle.closesDate;
        const mySubmission: any = (cycle.submissions || []).find((s?: any): any => s.personId === CURRENT_USER_ID);
        const subRows: any = (cycle.submissions || []).slice().sort((a?: any, b?: any): any => seniorityDate(a.personId).localeCompare(seniorityDate(b.personId))).map((s?: any): any => {
            const award: any = (cycle.awards || []).find((a?: any): any => a.personId === s.personId);
            let awardText: any = '—';
            if (award) {
                if (cycle.type === 'shift')
                    awardText = award.shiftId ? escapeHtml((STATE.pm.scheduleShifts.find((sh?: any): any => sh.id === award.shiftId) || {} as any).name || award.shiftId) : '<span style="color:var(--red);">No preference honored</span>';
                else
                    awardText = award.start ? `${escapeHtml(award.start)} to ${escapeHtml(award.end)}` : '<span style="color:var(--red);">No preference honored</span>';
            }
            const prefsText: any = cycle.type === 'shift'
                ? s.prefs.map((id?: any): any => (STATE.pm.scheduleShifts.find((sh?: any): any => sh.id === id) || {} as any).name || id).join(' → ')
                : s.prefs.map((p?: any): any => `${p.start}–${p.end}`).join(' → ');
            return `<tr><td>${recordLink(s.personId)}</td><td style="font-size:12px;">${escapeHtml(prefsText)}</td><td>${awardText}</td></tr>`;
        }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No submissions yet.</td></tr>`;
        const shiftSlotsSummary: any = cycle.type === 'shift' ? (Object.entries(cycle.shiftSlots || {} as any) as any).map(([id, cap]: any): any => {
            const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === id);
            const taken: any = (cycle.awards || []).filter((a?: any): any => a.shiftId === id).length;
            return `<span class="badge" style="margin:2px 4px 2px 0;">${escapeHtml(shift ? shift.name : id)}: ${taken}/${cap} awarded</span>`;
        }).join('') : `Window: ${escapeHtml(cycle.vacationWindowStart)} to ${escapeHtml(cycle.vacationWindowEnd)} &middot; Daily cap: ${cycle.dailyCap}`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <button class="btn btn-sm btn-outline" id="btnBackToCycles" style="margin-bottom:12px;">&larr; All cycles</button>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <div><h2>${escapeHtml(cycle.name)}</h2><span class="hint">${escapeHtml(cycle.opensDate)} to ${escapeHtml(cycle.closesDate)} &middot; <span style="text-transform:capitalize;">${escapeHtml(cycle.status)}</span></span></div>
        <div style="display:flex;gap:8px;">
          ${canSubmit && windowOpen ? `<button class="btn btn-sm btn-primary" id="btnSubmitPicks">${mySubmission ? 'Update My Picks' : 'Submit My Picks'}</button>` : ''}
          ${canManage && cycle.status !== 'awarded' ? `<button class="btn btn-sm btn-outline" id="btnRunAward">Run Seniority Award</button>` : ''}
          ${canManage ? `<button class="btn btn-sm btn-danger" id="btnDeleteCycle">${ICONS.trash}</button>` : ''}
        </div>
      </div>
      <div class="panel-body" style="font-size:12.5px;">${shiftSlotsSummary}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Submissions &amp; Awards</h2><span class="hint">Sorted by seniority (hire date)</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Ranked Preferences</th><th>Awarded</th></tr></thead><tbody>${subRows}</tbody></table></div>
    </div>
  `;
        (document as any).getElementById('btnBackToCycles').addEventListener('click', (): any => { BIDDING_CYCLE_ID = null; renderBiddingSub(); });
        const submitBtn: any = (document as any).getElementById('btnSubmitPicks');
        if (submitBtn)
            submitBtn.addEventListener('click', (): any => openBidSubmitModal(cycle, mySubmission));
        const awardBtn: any = (document as any).getElementById('btnRunAward');
        if (awardBtn)
            awardBtn.addEventListener('click', (): any => {
                if (!confirm(`Run the seniority award for "${cycle.name}"? This locks in results based on every submission received so far.`))
                    return;
                runBidAward(cycle);
                logActivity(`Ran the seniority award for bid cycle "${cycle.name}".`, "schedule");
                persist();
                toast("Award complete.");
                renderBiddingSub();
            });
        const delBtn: any = (document as any).getElementById('btnDeleteCycle');
        if (delBtn)
            delBtn.addEventListener('click', (): any => {
                if (!confirm(`Delete "${cycle.name}"? This cannot be undone.`))
                    return;
                STATE.pm.bidCycles = STATE.pm.bidCycles.filter((c?: any): any => c.id !== cycle.id);
                BIDDING_CYCLE_ID = null;
                logActivity(`Deleted bid cycle "${cycle.name}".`, "schedule");
                persist();
                renderBiddingSub();
            });
        wireRecordLinks();
    }
    function openBidCycleFormModal(): any {
        const activeShifts: any = sortShiftsForSelection(STATE.pm.scheduleShifts.filter((s?: any): any => shiftPatternStatus(s, fmt(new Date() as any)) !== 'past'), fmt(new Date() as any));
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>New Bid Cycle</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Name</label><input type="text" id="fCycleName" placeholder="e.g. 2027 Annual Vacation Picks"></div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fCycleType"><option value="vacation">Vacation Pick</option><option value="shift">Shift Bid</option></select></div>
        <div></div>
        <div class="form-row"><label>Opens</label><input type="date" id="fCycleOpens" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>Closes</label><input type="date" id="fCycleCloses" value="${fmt(addDays(new Date() as any, 14))}"></div>
      </div>
      <div id="fCycleShiftFields">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Open shift slots</label>
        ${activeShifts.map((s?: any): any => `<div class="form-row" style="display:flex;align-items:center;gap:10px;"><span style="flex:1;">${escapeHtml(s.name)}</span><input type="number" min="0" value="1" data-shift-cap="${s.id}" style="width:80px;"></div>`).join('') || '<p style="font-size:12px;color:var(--text-dim);">No current shift patterns to bid on.</p>'}
      </div>
      <div id="fCycleVacationFields" style="display:none;">
        <div class="form-2col">
          <div class="form-row"><label>Vacation Window Start</label><input type="date" id="fVacWindowStart"></div>
          <div class="form-row"><label>Vacation Window End</label><input type="date" id="fVacWindowEnd"></div>
        </div>
        <div class="form-row"><label>Max people off per day (agency-wide)</label><input type="number" min="1" value="2" id="fVacDailyCap"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Create Cycle</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        const typeSel: any = (document as any).getElementById('fCycleType');
        const syncType: any = (): any => {
            (document as any).getElementById('fCycleShiftFields').style.display = typeSel.value === 'shift' ? '' : 'none';
            (document as any).getElementById('fCycleVacationFields').style.display = typeSel.value === 'vacation' ? '' : 'none';
        };
        typeSel.addEventListener('change', syncType);
        syncType();
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fCycleName').value.trim();
            const opensDate: any = (document as any).getElementById('fCycleOpens').value, closesDate: any = (document as any).getElementById('fCycleCloses').value;
            if (!name || !opensDate || !closesDate) {
                toast("Enter a name and both dates.", true);
                return;
            }
            const type: any = typeSel.value;
            const cycle: any = { id: 'bid' + Date.now(), name, type, opensDate, closesDate, status: 'open', createdAt: fmt(new Date() as any), submissions: [], awards: [] } as any;
            if (type === 'shift') {
                cycle.shiftSlots = {} as any;
                (document as any).querySelectorAll('[data-shift-cap]').forEach((inp?: any): any => { const n: any = Number(inp.value) || 0; if (n > 0)
                    cycle.shiftSlots[inp.dataset.shiftCap] = n; });
                if (!(Object.keys(cycle.shiftSlots) as any).length) {
                    toast("Open at least one shift slot.", true);
                    return;
                }
            }
            else {
                cycle.vacationWindowStart = (document as any).getElementById('fVacWindowStart').value;
                cycle.vacationWindowEnd = (document as any).getElementById('fVacWindowEnd').value;
                cycle.dailyCap = Math.max(1, Number((document as any).getElementById('fVacDailyCap').value) || 1);
                if (!cycle.vacationWindowStart || !cycle.vacationWindowEnd) {
                    toast("Enter the vacation window.", true);
                    return;
                }
            }
            STATE.pm.bidCycles.push(cycle);
            logActivity(`Created ${type === 'vacation' ? 'vacation pick' : 'shift bid'} cycle "${name}".`, "schedule");
            persist();
            toast("Bid cycle created.");
            closeModal();
            renderBiddingSub();
        };
    }
    function openBidSubmitModal(cycle?: any, existing?: any): any {
        (document as any).getElementById('modalBox').className = 'modal';
        let fieldsHtml: any = '';
        if (cycle.type === 'shift') {
            const rankFor: any = (id?: any): any => { if (!existing)
                return ''; const i: any = existing.prefs.indexOf(id); return i >= 0 ? i + 1 : ''; };
            fieldsHtml = `<p style="font-size:12px;color:var(--text-dim);margin-top:0;">Give each shift you'd accept a rank (1 = first choice). Leave blank for any shift you wouldn't take.</p>` +
                (Object.keys(cycle.shiftSlots || {} as any) as any).map((id?: any): any => {
                    const shift: any = STATE.pm.scheduleShifts.find((s?: any): any => s.id === id);
                    return `<div class="form-row" style="display:flex;align-items:center;gap:10px;"><span style="flex:1;">${escapeHtml(shift ? shift.name : id)}</span><input type="number" min="1" placeholder="Rank" value="${rankFor(id)}" data-shift-rank="${id}" style="width:80px;"></div>`;
                }).join('');
        }
        else {
            const prefs: any = existing ? existing.prefs : [];
            fieldsHtml = `<p style="font-size:12px;color:var(--text-dim);margin-top:0;">Enter up to 3 date-range choices, in order of preference. Leave a choice blank if you don't need it.</p>` +
                [0, 1, 2].map((i?: any): any => `<div class="form-2col"><div class="form-row"><label>Choice ${i + 1} Start</label><input type="date" id="fVacPickStart${i}" value="${(prefs[i] || {} as any).start || ''}" min="${cycle.vacationWindowStart}" max="${cycle.vacationWindowEnd}"></div><div class="form-row"><label>Choice ${i + 1} End</label><input type="date" id="fVacPickEnd${i}" value="${(prefs[i] || {} as any).end || ''}" min="${cycle.vacationWindowStart}" max="${cycle.vacationWindowEnd}"></div></div>`).join('');
        }
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${cycle.type === 'shift' ? 'Submit Shift Bid' : 'Submit Vacation Picks'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">${fieldsHtml}</div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            let prefs: any;
            if (cycle.type === 'shift') {
                const ranked: any = [];
                (document as any).querySelectorAll('[data-shift-rank]').forEach((inp?: any): any => { const rank: any = Number(inp.value); if (rank > 0)
                    ranked.push({ id: inp.dataset.shiftRank, rank } as any); });
                if (!ranked.length) {
                    toast("Rank at least one shift.", true);
                    return;
                }
                ranked.sort((a?: any, b?: any): any => a.rank - b.rank);
                prefs = ranked.map((r?: any): any => r.id);
            }
            else {
                prefs = [0, 1, 2].map((i?: any): any => ({ start: (document as any).getElementById('fVacPickStart' + i).value, end: (document as any).getElementById('fVacPickEnd' + i).value } as any)).filter((p?: any): any => p.start && p.end);
                if (!prefs.length) {
                    toast("Enter at least one date-range choice.", true);
                    return;
                }
                for (const p of prefs)
                    if (p.end < p.start) {
                        toast("A choice's end date can't be before its start date.", true);
                        return;
                    }
            }
            cycle.submissions = (cycle.submissions || []).filter((s?: any): any => s.personId !== CURRENT_USER_ID);
            cycle.submissions.push({ personId: CURRENT_USER_ID, submittedAt: fmt(new Date() as any), prefs } as any);
            logActivity(`Submitted ${cycle.type === 'shift' ? 'a shift bid' : 'vacation picks'} for cycle "${cycle.name}".`, "schedule");
            persist();
            toast("Submitted.");
            closeModal();
            renderBiddingSub();
        };
    }
    // Awards strictly by seniority (earliest hire date first): each person gets the highest-ranked
    // choice that still has room, in seniority order -- the same "senior people pick first" logic
    // almost every agency's MOU already specifies, just automated instead of run by hand on a spreadsheet.
    function runBidAward(cycle?: any): any {
        const bySeniority: any = (cycle.submissions || []).slice().sort((a?: any, b?: any): any => seniorityDate(a.personId).localeCompare(seniorityDate(b.personId)));
        cycle.awards = [];
        if (cycle.type === 'shift') {
            const remaining: any = { ...(cycle.shiftSlots || {} as any) } as any;
            bySeniority.forEach((sub?: any): any => {
                const got: any = sub.prefs.find((id?: any): any => (remaining[id] || 0) > 0);
                if (got) {
                    remaining[got]--;
                    cycle.awards.push({ personId: sub.personId, shiftId: got } as any);
                }
                else
                    cycle.awards.push({ personId: sub.personId, shiftId: null } as any);
            });
        }
        else {
            const dailyUsed: any = {} as any;
            bySeniority.forEach((sub?: any): any => {
                let awarded: any = null;
                for (const pick of sub.prefs) {
                    const days: any = [];
                    let d: any = new Date(pick.start + 'T00:00:00') as any;
                    const end: any = new Date(pick.end + 'T00:00:00') as any;
                    let ok: any = true;
                    while (d <= end) {
                        const ds: any = fmt(d);
                        if ((dailyUsed[ds] || 0) >= cycle.dailyCap) {
                            ok = false;
                            break;
                        }
                        days.push(ds);
                        d = addDays(d, 1);
                    }
                    if (ok) {
                        days.forEach((ds?: any): any => dailyUsed[ds] = (dailyUsed[ds] || 0) + 1);
                        awarded = pick;
                        break;
                    }
                }
                if (awarded) {
                    cycle.awards.push({ personId: sub.personId, start: awarded.start, end: awarded.end } as any);
                    STATE.pm.scheduleExceptions.push({ id: 'exc' + Date.now() + Math.random().toString(36).slice(2, 6), personId: sub.personId, code: 'VDO', startDate: awarded.start, endDate: awarded.end, notes: `Awarded via vacation pick cycle "${cycle.name}".` } as any);
                }
                else {
                    cycle.awards.push({ personId: sub.personId, start: null, end: null } as any);
                }
            });
        }
        cycle.status = 'awarded';
    }
    /* =========================================================================
       SCHEDULING: Extra Duty (off-duty employment)
       ========================================================================= */
    // Soft fatigue/conflict check: flags (doesn't block) a job that overlaps this person's regular
    // on-duty hours that day, or that would push their combined on-duty + extra-duty hours past a
    // standard 16-hour fatigue threshold. A supervisor still has to actually approve the signup, so
    // this is information for that decision, not an automatic denial.
    function extraDutyConflict(personId?: any, job?: any): any {
        const shift: any = STATE.pm.scheduleAssignments.filter((a?: any): any => !a.endDate).map((a?: any): any => ({ a, shift: STATE.pm.scheduleShifts.find((s?: any): any => s.id === a.shiftId) } as any))
            .find(({ a, shift }: any): any => a.personId === personId && shift && isOnDutyOnDate(a, shift, job.date) && !activeExceptionFor(personId, job.date));
        const jobHours: any = ((): any => { const toMin: any = (t?: any): any => { const p: any = (t || '00:00').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }; let m: any = toMin(job.endTime) - toMin(job.startTime); if (m <= 0)
            m += 24 * 60; return m / 60; })();
        const onDutyHours: any = shift ? shiftHours(shift.shift) : 0;
        const otherApproved: any = (STATE.pm.extraDutySignups || []).filter((s?: any): any => s.personId === personId && s.status === 'approved' && s.jobId !== job.id)
            .map((s?: any): any => STATE.pm.extraDutyJobs.find((j?: any): any => j.id === s.jobId)).filter((j?: any): any => j && j.date === job.date);
        const otherHours: any = otherApproved.reduce((sum?: any, j?: any): any => { const toMin: any = (t?: any): any => { const p: any = (t || '00:00').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0); }; let m: any = toMin(j.endTime) - toMin(j.startTime); if (m <= 0)
            m += 24 * 60; return sum + m / 60; }, 0);
        const combined: any = jobHours + onDutyHours + otherHours;
        const flags: any = [];
        if (shift)
            flags.push(`Regularly on duty (${shift.shift.name}) that day.`);
        const threshold: any = Number((STATE.pm.schedulingSettings || {} as any).fatigueThresholdHours) || 16;
        if (combined > threshold)
            flags.push(`Combined hours that day would be ${combined.toFixed(1)} (exceeds the ${threshold}-hour fatigue threshold).`);
        return flags;
    }
    function renderExtraDutySub(): any {
        const canManage: any = can('pm_extraduty_manage');
        const canSignup: any = can('pm_extraduty_signup');
        if (EXTRADUTY_JOB_ID) {
            renderExtraDutyJobDetail(EXTRADUTY_JOB_ID, canManage, canSignup);
            return;
        }
        const jobs: any = (STATE.pm.extraDutyJobs || []).slice().sort((a?: any, b?: any): any => (a.date || '').localeCompare(b.date || ''));
        const rows: any = jobs.map((j?: any): any => {
            const signups: any = (STATE.pm.extraDutySignups || []).filter((s?: any): any => s.jobId === j.id);
            const approved: any = signups.filter((s?: any): any => s.status === 'approved').length;
            const pending: any = signups.filter((s?: any): any => s.status === 'pending').length;
            const mine: any = signups.find((s?: any): any => s.personId === CURRENT_USER_ID);
            return `<tr>
      <td>${escapeHtml(j.employer)}<div style="font-size:11px;color:var(--text-dim);">${escapeHtml(j.description)}</div></td>
      <td style="font-size:12px;">${escapeHtml(j.date)}<br>${SuiteUX.displayTimeOnly(j.startTime)} - ${SuiteUX.displayTimeOnly(j.endTime)}</td>
      <td>${approved}/${j.slots}${pending ? ` <span style="color:var(--gold);font-size:11px;">(${pending} pending)</span>` : ''}</td>
      <td>$${Number(j.hourlyRate || 0).toFixed(2)}/hr</td>
      <td><span class="badge" style="background:${j.status === 'open' ? '#24633D22' : '#8A94A622'};color:${j.status === 'open' ? 'var(--green)' : 'var(--text-dim)'};text-transform:capitalize;">${escapeHtml(j.status)}</span></td>
      <td>${mine ? `<span style="font-size:11px;color:var(--text-dim);text-transform:capitalize;">${mine.status}</span>` : ''} <button class="btn btn-sm btn-outline" data-view-job="${j.id}">View</button></td>
    </tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No extra-duty jobs posted yet.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Extra-Duty Jobs</h2>${canManage ? `<button class="btn btn-sm btn-primary" id="btnNewJob">${ICONS.plus} Post Job</button>` : ''}</div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employer / Description</th><th>Date &amp; Time</th><th>Slots</th><th>Rate</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
        const newBtn: any = (document as any).getElementById('btnNewJob');
        if (newBtn)
            newBtn.addEventListener('click', openExtraDutyJobFormModal);
        (document as any).querySelectorAll('[data-view-job]').forEach((b?: any): any => b.addEventListener('click', (): any => { EXTRADUTY_JOB_ID = b.dataset.viewJob; renderExtraDutySub(); }));
    }
    function renderExtraDutyJobDetail(jobId?: any, canManage?: any, canSignup?: any): any {
        const job: any = STATE.pm.extraDutyJobs.find((j?: any): any => j.id === jobId);
        if (!job) {
            EXTRADUTY_JOB_ID = null;
            renderExtraDutySub();
            return;
        }
        const signups: any = (STATE.pm.extraDutySignups || []).filter((s?: any): any => s.jobId === jobId);
        const approvedCount: any = signups.filter((s?: any): any => s.status === 'approved').length;
        const mine: any = signups.find((s?: any): any => s.personId === CURRENT_USER_ID);
        const canApplyNow: any = canSignup && !mine && job.status === 'open' && approvedCount < job.slots;
        const rows: any = signups.map((s?: any): any => {
            const flags: any = extraDutyConflict(s.personId, job);
            const statusColor: any = s.status === 'approved' ? 'var(--green)' : s.status === 'denied' ? 'var(--red)' : 'var(--gold)';
            return `<tr>
      <td>${recordLink(s.personId)}</td>
      <td style="color:${statusColor};font-weight:700;text-transform:capitalize;">${escapeHtml(s.status)}</td>
      <td style="font-size:11px;color:${flags.length ? 'var(--red)' : 'var(--text-dim)'};">${flags.length ? flags.join('<br>') : 'No conflicts detected.'}</td>
      <td>${canManage && s.status === 'pending' ? `<div class="cell-actions"><button class="btn-icon" data-approve-signup="${s.id}" title="Approve" style="color:var(--green);">${ICONS.check || '&check;'}</button><button class="btn-icon" data-deny-signup="${s.id}" title="Deny" style="color:var(--red);">${ICONS.x || '&times;'}</button></div>` : ''}</td>
    </tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No signups yet.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <button class="btn btn-sm btn-outline" id="btnBackToJobs" style="margin-bottom:12px;">&larr; All jobs</button>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <div><h2>${escapeHtml(job.employer)}</h2><span class="hint">${escapeHtml(job.date)} &middot; ${SuiteUX.displayTimeOnly(job.startTime)} - ${SuiteUX.displayTimeOnly(job.endTime)} &middot; $${Number(job.hourlyRate || 0).toFixed(2)}/hr &middot; ${approvedCount}/${job.slots} filled</span></div>
        <div style="display:flex;gap:8px;">
          ${canApplyNow ? `<button class="btn btn-sm btn-primary" id="btnSignUp">Sign Up</button>` : ''}
          ${canManage ? `<button class="btn btn-sm btn-danger" id="btnDeleteJob">${ICONS.trash}</button>` : ''}
        </div>
      </div>
      <div class="panel-body"><p style="margin:0 0 8px;">${escapeHtml(job.description)}</p><p style="font-size:12px;color:var(--text-dim);margin:0;">${escapeHtml(job.location)}${job.notes ? ' — ' + escapeHtml(job.notes) : ''}</p></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Signups</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Status</th><th>Conflict Check</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
        (document as any).getElementById('btnBackToJobs').addEventListener('click', (): any => { EXTRADUTY_JOB_ID = null; renderExtraDutySub(); });
        const signUpBtn: any = (document as any).getElementById('btnSignUp');
        if (signUpBtn)
            signUpBtn.addEventListener('click', (): any => {
                const flags: any = extraDutyConflict(CURRENT_USER_ID, job);
                if (flags.length && !confirm(`Heads up:\n\n${flags.join('\n')}\n\nSign up anyway? A supervisor still has to approve this.`))
                    return;
                STATE.pm.extraDutySignups.push({ id: 'eds' + Date.now(), jobId: job.id, personId: CURRENT_USER_ID, status: 'pending', signedUpAt: fmt(new Date() as any) } as any);
                logActivity(`Signed up for extra duty: ${job.employer} on ${job.date}.`, "schedule");
                persist();
                toast("Signed up — awaiting supervisor approval.");
                renderExtraDutySub();
            });
        const delBtn: any = (document as any).getElementById('btnDeleteJob');
        if (delBtn)
            delBtn.addEventListener('click', (): any => {
                if (!confirm(`Delete this job posting? Existing signups will be removed too.`))
                    return;
                STATE.pm.extraDutyJobs = STATE.pm.extraDutyJobs.filter((j?: any): any => j.id !== jobId);
                STATE.pm.extraDutySignups = STATE.pm.extraDutySignups.filter((s?: any): any => s.jobId !== jobId);
                EXTRADUTY_JOB_ID = null;
                logActivity(`Deleted extra-duty job posting "${job.employer}".`, "schedule");
                persist();
                renderExtraDutySub();
            });
        (document as any).querySelectorAll('[data-approve-signup]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const s: any = STATE.pm.extraDutySignups.find((x?: any): any => x.id === b.dataset.approveSignup);
            if (approvedCount >= job.slots) {
                toast("All slots for this job are already filled.", true);
                return;
            }
            s.status = 'approved';
            logActivity(`Approved ${personName(s.personId)} for extra duty: ${job.employer}.`, "schedule");
            persist();
            renderExtraDutySub();
        }));
        (document as any).querySelectorAll('[data-deny-signup]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const s: any = STATE.pm.extraDutySignups.find((x?: any): any => x.id === b.dataset.denySignup);
            s.status = 'denied';
            logActivity(`Denied ${personName(s.personId)}'s signup for extra duty: ${job.employer}.`, "schedule");
            persist();
            renderExtraDutySub();
        }));
        wireRecordLinks();
    }
    function openExtraDutyJobFormModal(): any {
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Post Extra-Duty Job</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employer</label><input type="text" id="fJobEmployer" placeholder="e.g. Reno Events Center"></div>
      <div class="form-row"><label>Description</label><input type="text" id="fJobDesc" placeholder="e.g. Stadium security detail - concert"></div>
      <div class="form-row"><label>Location</label><input type="text" id="fJobLocation"></div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fJobDate" value="${fmt(new Date() as any)}"></div>
        <div></div>
        <div class="form-row"><label>Start Time</label><input type="time" id="fJobStart" value="17:00"></div>
        <div class="form-row"><label>End Time</label><input type="time" id="fJobEnd" value="23:00"></div>
        <div class="form-row"><label>Slots</label><input type="number" min="1" value="1" id="fJobSlots"></div>
        <div class="form-row"><label>Hourly Rate ($)</label><input type="number" min="0" step="0.01" value="45" id="fJobRate"></div>
      </div>
      <div class="form-row"><label>Notes</label><input type="text" id="fJobNotes" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Post Job</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const employer: any = (document as any).getElementById('fJobEmployer').value.trim();
            const date: any = (document as any).getElementById('fJobDate').value;
            if (!employer || !date) {
                toast("Enter an employer and date.", true);
                return;
            }
            STATE.pm.extraDutyJobs.push({
                id: 'ed' + Date.now(), employer, description: (document as any).getElementById('fJobDesc').value.trim(), location: (document as any).getElementById('fJobLocation').value.trim(),
                date, startTime: (document as any).getElementById('fJobStart').value, endTime: (document as any).getElementById('fJobEnd').value,
                slots: Math.max(1, Number((document as any).getElementById('fJobSlots').value) || 1), hourlyRate: Number((document as any).getElementById('fJobRate').value) || 0,
                notes: (document as any).getElementById('fJobNotes').value.trim(), status: 'open'
            } as any);
            logActivity(`Posted extra-duty job: ${employer}.`, "schedule");
            persist();
            toast("Job posted.");
            closeModal();
            renderExtraDutySub();
        };
    }
    /* =========================================================================
       SCHEDULING: Roll Call
       ========================================================================= */
    function rollCallFor(date?: any, shiftId?: any): any { return (STATE.pm.rollCalls || []).find((rc?: any): any => rc.date === date && rc.shiftId === shiftId); }
    function renderTimeOffSub(): any {
        if (!STATE.pm.leaveRequests)
            STATE.pm.leaveRequests = [];
        const canSubmit: any = can('pm_leave_request_submit');
        const canApprove: any = can('pm_leave_request_approve');
        const me: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID);
        const requestableCodes: any = (STATE.pm.refData.exceptionCodes || []).filter((c?: any): any => c.active !== false && c.requestable);
        const pending: any = STATE.pm.leaveRequests.filter((r?: any): any => r.status === 'pending').slice().sort((a?: any, b?: any): any => (a.submittedAt || '').localeCompare(b.submittedAt || ''));
        const mine: any = (canSubmit && me) ? STATE.pm.leaveRequests.filter((r?: any): any => r.personId === me.id).slice().sort((a?: any, b?: any): any => (b.submittedAt || '').localeCompare(a.submittedAt || '')) : [];
        const codeBadge: any = (code?: any): any => {
            const def: any = (STATE.pm.refData.exceptionCodes || []).find((c?: any): any => c.code === code);
            return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${def ? def.color : '#8A94A6'};margin-right:6px;"></span>${escapeHtml(def ? def.name : code)}`;
        };
        const statusBadge: any = (status?: any): any => {
            if (status === 'approved')
                return `<span class="badge badge-available">Approved</span>`;
            if (status === 'denied')
                return `<span class="badge badge-missing">Denied</span>`;
            return `<span class="badge badge-maintenance">Pending</span>`;
        };
        const dateRange: any = (r?: any): any => r.startDate === r.endDate ? escapeHtml(r.startDate) : `${escapeHtml(r.startDate)} \u2192 ${escapeHtml(r.endDate)}`;
        const pendingRows: any = pending.map((r?: any): any => `<tr>
    <td>${recordLink(r.personId)}</td>
    <td>${codeBadge(r.code)}</td>
    <td>${dateRange(r)}</td>
    <td style="max-width:220px;">${escapeHtml(r.reason || '\u2014')}</td>
    <td style="font-size:12px;color:var(--text-dim);">${r.submittedAt ? SuiteUX.displayInstant(r.submittedAt) : '\u2014'}</td>
    <td><div class="cell-actions"><button class="btn btn-sm btn-primary" data-approve-leave="${r.id}">Approve</button><button class="btn btn-sm btn-outline" data-deny-leave="${r.id}">Deny</button></div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No requests waiting on approval.</td></tr>`;
        const myRows: any = mine.map((r?: any): any => `<tr>
    <td>${codeBadge(r.code)}</td>
    <td>${dateRange(r)}</td>
    <td style="max-width:220px;">${escapeHtml(r.reason || '\u2014')}</td>
    <td>${statusBadge(r.status)}${r.decisionNotes ? `<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${escapeHtml(r.decisionNotes)}</div>` : ''}</td>
    <td style="font-size:12px;color:var(--text-dim);">${r.submittedAt ? SuiteUX.displayInstant(r.submittedAt) : '\u2014'}</td>
    <td>${r.status === 'pending' ? `<button class="btn-icon" data-cancel-leave="${r.id}" title="Cancel request">${ICONS.trash}</button>` : ''}</td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No requests submitted yet.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    ${canApprove ? `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Pending Approval</h2><span class="hint">${pending.length} waiting</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Submitted</th><th></th></tr></thead><tbody>${pendingRows}</tbody></table></div>
    </div>` : ''}
    ${canSubmit ? `
    <div class="panel">
      <div class="panel-head"><h2>My Requests</h2>${me ? `<button class="btn btn-sm btn-primary" id="btnRequestTimeOff">Request Time Off</button>` : ''}</div>
      ${!me ? `<div style="padding:14px 20px;font-size:12px;color:var(--text-dim);">No personnel record is linked to this account, so a request can't be tied to an employee.</div>` : ''}
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>${myRows}</tbody></table></div>
    </div>` : ''}
  `;
        const reqBtn: any = (document as any).getElementById('btnRequestTimeOff');
        if (reqBtn)
            reqBtn.addEventListener('click', (): any => openRequestTimeOffModal(requestableCodes, me));
        (document as any).querySelectorAll('[data-approve-leave]').forEach((b?: any): any => b.addEventListener('click', (): any => decideLeaveRequest(b.dataset.approveLeave, 'approved')));
        (document as any).querySelectorAll('[data-deny-leave]').forEach((b?: any): any => b.addEventListener('click', (): any => decideLeaveRequest(b.dataset.denyLeave, 'denied')));
        (document as any).querySelectorAll('[data-cancel-leave]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            if (!confirm('Cancel this time-off request?'))
                return;
            STATE.pm.leaveRequests = STATE.pm.leaveRequests.filter((r?: any): any => r.id !== b.dataset.cancelLeave);
            logActivity('Cancelled a time-off request.', "schedule");
            persist();
            renderTimeOffSub();
        }));
    }
    function openRequestTimeOffModal(requestableCodes?: any, me?: any): any {
        if (!me) {
            toast('No personnel record is linked to this account.', true);
            return;
        }
        if (!requestableCodes.length) {
            toast('No requestable time-off types are set up for this agency yet.', true);
            return;
        }
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Time Off</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Type</label>
        <select id="fLeaveCode">${requestableCodes.map((c?: any): any => `<option value="${c.code}">${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fLeaveStart" value="${fmt(new Date() as any)}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fLeaveEnd" value="${fmt(new Date() as any)}"></div>
      </div>
      <div class="form-row"><label>Reason / note</label><input type="text" id="fLeaveReason" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        let pendingRecord: any = null;
        (document as any).getElementById('mSave').onclick = async (): Promise<any> => {
            const code: any = (document as any).getElementById('fLeaveCode').value;
            const startDate: any = (document as any).getElementById('fLeaveStart').value;
            const endDate: any = (document as any).getElementById('fLeaveEnd').value;
            const reason: any = (document as any).getElementById('fLeaveReason').value.trim();
            if (!startDate || !endDate || endDate < startDate) {
                toast('Enter a valid date range.', true);
                return;
            }
            // Reuse the same ID if the response was lost after the server committed the request.
            // A changed form is a new request; leave the old attempt available for reconciliation.
            if (!pendingRecord || [code, startDate, endDate, reason].some((v?: any, i?: any): any => v !== [pendingRecord.code, pendingRecord.startDate, pendingRecord.endDate, pendingRecord.reason][i])) {
                pendingRecord = { id: 'leave' + Date.now() + Math.random().toString(36).slice(2, 6),
                    personId: me.id, code, startDate, endDate, reason, status: 'pending',
                    submittedAt: (new Date() as any).toISOString(), submittedBy: CURRENT_USER_ID } as any;
            }
            const button: any = (document as any).getElementById('mSave');
            button.disabled = true;
            const result: any = await SuiteStore.submitSelfServiceRecord('leaveRequests', pendingRecord);
            if (!result.ok) {
                button.disabled = false;
                toast(result.error?.message || 'The request could not be saved.', true);
                return;
            }
            logActivity(`Requested ${(STATE.pm.refData.exceptionCodes.find((c?: any): any => c.code === code) || {} as any).name || code} for ${personName(me.id)} (${dateRangeText(startDate, endDate)}).`, "schedule");
            toast('Request submitted.');
            closeModal();
            renderTimeOffSub();
        };
    }
    function dateRangeText(startDate?: any, endDate?: any): any { return startDate === endDate ? startDate : `${startDate} to ${endDate}`; }
    function decideLeaveRequest(id?: any, decision?: any): any {
        const req: any = STATE.pm.leaveRequests.find((r?: any): any => r.id === id);
        if (!req || req.status !== 'pending')
            return;
        if (decision === 'denied') {
            const note: any = (prompt('Optional note for the employee (visible on their request):', '') || '').trim();
            req.status = 'denied';
            req.decidedAt = (new Date() as any).toISOString();
            req.decidedBy = CURRENT_USER_ID;
            req.decisionNotes = note;
            logActivity(`Denied a ${req.code} request for ${personName(req.personId)}.`, "schedule");
            toast('Request denied.');
        }
        else {
            // Approving isn't just a status flip -- it's the moment this becomes a real change to the
            // schedule. It's written as the same kind of schedule exception record the duty roster and
            // calendar views already read everywhere else, so it shows up as time off exactly the way a
            // supervisor manually logging it would, rather than living in a separate "requests" table
            // that the rest of scheduling would need to know to also check.
            if (!STATE.pm.scheduleExceptions)
                STATE.pm.scheduleExceptions = [];
            const exceptionId: any = 'exc' + Date.now() + Math.random().toString(36).slice(2, 6);
            STATE.pm.scheduleExceptions.push({
                id: exceptionId, personId: req.personId, code: req.code,
                startDate: req.startDate, endDate: req.endDate,
                notes: req.reason ? `Approved time-off request: ${req.reason}` : 'Approved time-off request.'
            } as any);
            req.status = 'approved';
            req.decidedAt = (new Date() as any).toISOString();
            req.decidedBy = CURRENT_USER_ID;
            req.exceptionId = exceptionId;
            logActivity(`Approved a ${req.code} request for ${personName(req.personId)} (${dateRangeText(req.startDate, req.endDate)}) and updated the schedule.`, "schedule");
            toast('Approved \u2014 the schedule has been updated.');
        }
        persist();
        renderTimeOffSub();
    }
    function renderRollCallSub(): any {
        const canManage: any = can('pm_rollcall_manage');
        const todayStr: any = fmt(new Date() as any);
        const shifts: any = sortShiftsForSelection(STATE.pm.scheduleShifts.filter((s?: any): any => shiftPatternStatus(s, todayStr) !== 'past'), todayStr);
        if (!ROLLCALL_SHIFT && shifts.length)
            ROLLCALL_SHIFT = shifts[0].id;
        const shift: any = shifts.find((s?: any): any => s.id === ROLLCALL_SHIFT) || null;
        let rc: any = shift ? rollCallFor(ROLLCALL_DATE, shift.id) : null;
        const rosterIds: any = shift ? onDutyRoster(shift, ROLLCALL_DATE) : [];
        // Started fresh: pre-populate one entry per person actually on duty that day (auto-marking
        // anyone with an active time-off exception as excused, rather than silently dropping them --
        // a supervisor should still see who was supposed to be there and why they're not).
        const entries: any = rc ? rc.entries : rosterIds.map((personId?: any): any => {
            const ex: any = activeExceptionFor(personId, ROLLCALL_DATE);
            return { personId, beat: '', unit: shift ? shift.name : '', vehicleId: '', status: ex ? 'excused' : 'present', notes: ex ? `${ex.code} on file` : '' } as any;
        });
        const rows: any = entries.map((e?: any, i?: any): any => `<tr>
    <td>${escapeHtml(personName(e.personId))}</td>
    <td><input type="text" data-rc-field="beat" data-rc-idx="${i}" value="${escapeHtml(e.beat || '')}" placeholder="Beat / zone" ${canManage ? '' : 'disabled'} style="width:110px;"></td>
    <td><input type="text" data-rc-field="unit" data-rc-idx="${i}" value="${escapeHtml(e.unit || '')}" placeholder="Unit" ${canManage ? '' : 'disabled'} style="width:110px;"></td>
    <td><input type="text" data-rc-field="vehicleId" data-rc-idx="${i}" value="${escapeHtml(e.vehicleId || '')}" placeholder="Vehicle #" ${canManage ? '' : 'disabled'} style="width:100px;"></td>
    <td><select data-rc-field="status" data-rc-idx="${i}" ${canManage ? '' : 'disabled'}>${['present', 'late', 'absent', 'excused'].map((s?: any): any => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></td>
    <td><input type="text" data-rc-field="notes" data-rc-idx="${i}" value="${escapeHtml(e.notes || '')}" placeholder="Notes" ${canManage ? '' : 'disabled'} style="width:150px;"></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No one is on the duty roster for this shift on this date.</td></tr>`;
        (document as any).getElementById('schedSubBody').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <h2>Roll Call</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="fRcDate" value="${ROLLCALL_DATE}">
          <select id="fRcShift">${shifts.map((s?: any): any => `<option value="${s.id}" ${ROLLCALL_SHIFT === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Beat/Zone</th><th>Unit</th><th>Vehicle #</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="panel-body" style="border-top:1px solid var(--border);">
        <div class="form-row"><label>Briefing Notes</label><textarea id="fRcBriefing" rows="4" placeholder="BOLOs, equipment issues, roll call announcements..." ${canManage ? '' : 'disabled'}>${escapeHtml(rc ? rc.briefingNotes || '' : '')}</textarea></div>
        ${canManage ? `<button class="btn btn-primary" id="btnSaveRollCall">Save Roll Call</button>` : ''}
        ${rc ? `<span class="hint" style="margin-left:10px;">Last saved by ${escapeHtml(personName(rc.takenBy))} at ${escapeHtml(rc.takenAt)}</span>` : ''}
      </div>
    </div>
  `;
        (document as any).getElementById('fRcDate').addEventListener('change', (e?: any): any => { ROLLCALL_DATE = e.target.value; renderRollCallSub(); });
        (document as any).getElementById('fRcShift').addEventListener('change', (e?: any): any => { ROLLCALL_SHIFT = e.target.value; renderRollCallSub(); });
        if (canManage) {
            const saveBtn: any = (document as any).getElementById('btnSaveRollCall');
            saveBtn.addEventListener('click', (): any => {
                const updated: any = entries.map((e?: any, i?: any): any => ({
                    personId: e.personId,
                    beat: (document as any).querySelector(`[data-rc-field="beat"][data-rc-idx="${i}"]`).value.trim(),
                    unit: (document as any).querySelector(`[data-rc-field="unit"][data-rc-idx="${i}"]`).value.trim(),
                    vehicleId: (document as any).querySelector(`[data-rc-field="vehicleId"][data-rc-idx="${i}"]`).value.trim(),
                    status: (document as any).querySelector(`[data-rc-field="status"][data-rc-idx="${i}"]`).value,
                    notes: (document as any).querySelector(`[data-rc-field="notes"][data-rc-idx="${i}"]`).value.trim()
                } as any));
                const briefingNotes: any = (document as any).getElementById('fRcBriefing').value.trim();
                if (rc) {
                    rc.entries = updated;
                    rc.briefingNotes = briefingNotes;
                    rc.takenBy = CURRENT_USER_ID;
                    rc.takenAt = (new Date() as any).toLocaleString();
                }
                else {
                    rc = { id: 'rc' + Date.now(), date: ROLLCALL_DATE, shiftId: shift.id, entries: updated, briefingNotes, takenBy: CURRENT_USER_ID, takenAt: (new Date() as any).toLocaleString() } as any;
                    STATE.pm.rollCalls.push(rc);
                }
                logActivity(`Took roll call for ${shift.name} on ${ROLLCALL_DATE}.`, "schedule");
                persist();
                toast("Roll call saved.");
                renderRollCallSub();
            });
        }
    }
    function renderDutyCalendar(body?: any): any {
        const shifts: any = sortShiftsForSelection(STATE.pm.scheduleShifts);
        const shiftOrder: any = new Map(shifts.map((s?: any, i?: any): any => [s.id, i]));
        if (SCHED_CAL_SHIFT !== 'all' && !shifts.some((s?: any): any => s.id === SCHED_CAL_SHIFT))
            SCHED_CAL_SHIFT = 'all';
        const year: any = SCHED_CAL_YEAR, month: any = SCHED_CAL_MONTH;
        const monthStr: any = String(month + 1).padStart(2, '0');
        const firstOfMonth: any = new Date(year, month, 1) as any;
        const daysInMonth: any = (new Date(year, month + 1, 0) as any).getDate();
        const startWeekday: any = firstOfMonth.getDay();
        const monthName: any = firstOfMonth.toLocaleString('en-US', { month: 'long' } as any);
        const relevantAssignments: any = STATE.pm.scheduleAssignments.filter((a?: any): any => SCHED_CAL_SHIFT === 'all' || a.shiftId === SCHED_CAL_SHIFT);
        let cells: any = '';
        for (let i: any = 0; i < startWeekday; i++)
            cells += `<div class="cal-cell cal-cell-empty"></div>`;
        for (let d: any = 1; d <= daysInMonth; d++) {
            const dateStr: any = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
            const onDutyAll: any = relevantAssignments.filter((a?: any): any => isOnDutyOnDate(a, shifts.find((s?: any): any => s.id === a.shiftId), dateStr));
            const working: any = [], excepted: any = [];
            onDutyAll.forEach((a?: any): any => {
                const ex: any = activeExceptionFor(a.personId, dateStr);
                if (ex)
                    excepted.push({ assignment: a, exception: ex } as any);
                else
                    working.push(a);
            });
            // Group everyone on the same shift pattern together (in the same current/future order used
            // everywhere else) rather than leaving people from different patterns interleaved in
            // whatever order they happen to sit in the assignments list.
            working.sort((a?: any, b?: any): any => (shiftOrder.get(a.shiftId) ?? 999) - (shiftOrder.get(b.shiftId) ?? 999));
            const dayCoverages: any = (STATE.pm.scheduleCoverages || []).filter((c?: any): any => c.date === dateStr && (SCHED_CAL_SHIFT === 'all' || c.shiftId === SCHED_CAL_SHIFT));
            const isToday: any = dateStr === fmt(new Date() as any);
            let staffingBadge: any = '';
            let cellClass: any = 'cal-cell' + (isToday ? ' cal-cell-today' : '');
            if (SCHED_CAL_SHIFT !== 'all') {
                const shift: any = shifts.find((s?: any): any => s.id === SCHED_CAL_SHIFT);
                const minStaff: any = shift ? (Number(shift.minStaff) || 0) : 0;
                const staffed: any = working.length + dayCoverages.length;
                const ok: any = staffed >= minStaff;
                staffingBadge = `<div style="font-size:10px;font-weight:800;color:${ok ? 'var(--green)' : 'var(--red)'};">${staffed}/${minStaff} staffed</div>`;
            }
            cells += `<div class="${cellClass}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday + d - 1) % 7]}">${d}</div>
      ${staffingBadge}
      ${working.map((a?: any): any => {
                const shift: any = shifts.find((s?: any): any => s.id === a.shiftId);
                const color: any = shift ? shiftColor(shift) : 'var(--blue)';
                const label: any = SCHED_CAL_SHIFT === 'all' ? `${personName(a.personId)} (${shift ? shift.name : ''})` : personName(a.personId);
                return `<a href="#" data-cal-assign-event="${a.id}" class="cal-event" style="background:${color}22;color:${color};border-left:3px solid ${color};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
            }).join('')}
      ${excepted.map(({ assignment: a, exception: ex }: any): any => {
                const code: any = exceptionCodeInfo(ex.code);
                const label: any = `${personName(a.personId)} (${ex.code})`;
                return `<a href="#" data-cal-exception-event="${ex.id}" class="cal-event" style="background:${code.color}22;color:${code.color};border-left:3px solid ${code.color};" title="${escapeHtml(personName(a.personId) + ' — ' + code.name)}">${escapeHtml(label)}</a>`;
            }).join('')}
      ${dayCoverages.map((c?: any): any => {
                const shift: any = shifts.find((s?: any): any => s.id === c.shiftId);
                const label: any = SCHED_CAL_SHIFT === 'all' ? `${personName(c.personId)} (covering, ${shift ? shift.name : ''})` : `${personName(c.personId)} (covering)`;
                return `<a href="#" class="cal-event" style="background:${SWAP_COVERAGE_COLOR}22;color:${SWAP_COVERAGE_COLOR};border-left:3px solid ${SWAP_COVERAGE_COLOR};" title="${escapeHtml(personName(c.personId) + ' is covering this shift via an approved swap')}">${escapeHtml(label)}</a>`;
            }).join('')}
    </div>`;
        }
        body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="prev">&larr;</button>
        <h2 style="margin:0;min-width:170px;text-align:center;">${monthName} ${year}</h2>
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="next">&rarr;</button>
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="today">Today</button>
      </div>
      <div class="form-row" style="margin:0;min-width:220px;">
        <select id="fSchedCalShift">
          <option value="all" ${SCHED_CAL_SHIFT === 'all' ? 'selected' : ''}>All Shifts</option>
          ${shifts.map((s?: any): any => `<option value="${s.id}" ${SCHED_CAL_SHIFT === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">
      ${SCHED_CAL_SHIFT === 'all' ? "Showing everyone on duty across all shift patterns, each pattern in its own color, plus anyone on an RDO/VDO/CDO/SDO/TDO shown in their exception's color. Pick a specific shift to see staffing levels against its minimum." : "Green means this day meets the minimum staff required for this shift; red means it's short. Colored tags other than this shift's own color are people who'd normally be working but are on an approved RDO/VDO/CDO/SDO/TDO, so they don't count toward staffing."}
    </div>
    ${SCHED_CAL_SHIFT === 'all' ? `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;">${shifts.map((s?: any): any => `<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${shiftColor(s)};"></span>${escapeHtml(s.name)}</div>`).join('')}</div>` : ''}
    <div class="cal-grid-head">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d?: any): any => `<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
        body.querySelectorAll('[data-sched-cal-nav]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const dir: any = b.dataset.schedCalNav;
            let y: any = SCHED_CAL_YEAR, m: any = SCHED_CAL_MONTH;
            if (dir === 'prev') {
                m--;
                if (m < 0) {
                    m = 11;
                    y--;
                }
            }
            else if (dir === 'next') {
                m++;
                if (m > 11) {
                    m = 0;
                    y++;
                }
            }
            else {
                y = (new Date() as any).getFullYear();
                m = (new Date() as any).getMonth();
            }
            SCHED_CAL_YEAR = y;
            SCHED_CAL_MONTH = m;
            renderDutyCalendar(body);
        }));
        const shiftSelect: any = (document as any).getElementById('fSchedCalShift');
        if (shiftSelect)
            shiftSelect.addEventListener('change', (): any => { SCHED_CAL_SHIFT = shiftSelect.value; renderDutyCalendar(body); });
        body.querySelectorAll('[data-cal-assign-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => {
            ev.preventDefault();
            const assign: any = STATE.pm.scheduleAssignments.find((x?: any): any => x.id === a.dataset.calAssignEvent);
            if (assign && can('pm_schedule_manage'))
                openAssignmentFormModal(assign);
        }));
        body.querySelectorAll('[data-cal-exception-event]').forEach((a?: any): any => a.addEventListener('click', (ev?: any): any => {
            ev.preventDefault();
            const exception: any = STATE.pm.scheduleExceptions.find((x?: any): any => x.id === a.dataset.calExceptionEvent);
            if (exception && can('pm_schedule_manage'))
                openExceptionFormModal(exception);
        }));
    }
    function openShiftFormModal(existing?: any): any {
        const editing: any = !!existing;
        const patternType: any = existing?.patternType === 'weekly' ? 'weekly' : 'rotation';
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit Shift Pattern' : 'New Shift Pattern'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Pattern Name</label><input type="text" id="fShiftName" value="${editing ? escapeHtml(existing.name) : ''}" placeholder="e.g. Patrol C - Days"></div>
      <div class="form-row"><label>Schedule Type</label>
        <select id="fShiftPatternType">
          <option value="rotation" ${patternType === 'rotation' ? 'selected' : ''}>Fixed rotation (days on / days off)</option>
          <option value="weekly" ${patternType === 'weekly' ? 'selected' : ''}>Specific days of the week</option>
        </select>
      </div>
      <div id="fShiftRotationFields" style="display:${patternType === 'weekly' ? 'none' : 'block'};">
        <div class="form-2col">
          <div class="form-row"><label>Days On</label><input type="number" id="fShiftDaysOn" value="${editing ? existing.daysOn : 4}"></div>
          <div class="form-row"><label>Days Off</label><input type="number" id="fShiftDaysOff" value="${editing ? existing.daysOff : 3}"></div>
        </div>
      </div>
      <div id="fShiftWeeklyFields" style="display:${patternType === 'weekly' ? 'block' : 'none'};">
        <div class="form-row"><label>Works every week on</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${WEEKDAY_LABELS.map((lbl?: any, i?: any): any => `<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="fShiftWeekday" value="${i}" style="width:auto;" ${(existing?.weekdays || []).includes(i) ? 'checked' : ''}> ${lbl}</label>`).join('')}
          </div>
        </div>
        <div class="form-row"><label>Also works every other week on <span style="font-weight:400;color:var(--text-dim);">(optional)</span></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${WEEKDAY_LABELS.map((lbl?: any, i?: any): any => `<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="fShiftAltWeekday" value="${i}" style="width:auto;" ${(existing?.altWeekdays || []).includes(i) ? 'checked' : ''}> ${lbl}</label>`).join('')}
          </div>
        </div>
        <div class="form-row"><label>Reference date for the alternating day <span style="font-weight:400;color:var(--text-dim);">(any date that should count as an "on" week for that day)</span></label>
          <input type="date" id="fShiftAltAnchor" value="${existing?.altAnchorDate || fmt(new Date() as any)}">
        </div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Time</label><input type="time" id="fShiftStart" value="${editing ? existing.hoursStart : '06:00'}"></div>
        <div class="form-row"><label>End Time</label><input type="time" id="fShiftEnd" value="${editing ? existing.hoursEnd : '18:00'}"></div>
      </div>
      <div class="form-row"><label>Minimum Staff Required</label><input type="number" min="0" id="fShiftMinStaff" value="${editing ? (existing.minStaff || 0) : 1}"></div>
      <div class="form-row"><label>Effective Dates <span style="font-weight:400;color:var(--text-dim);">(when this rotation itself is in effect \u2014 not when a specific person is assigned to it)</span></label>
        <div class="form-2col">
          <input type="date" id="fShiftStartDate" value="${editing ? (existing.startDate || '') : fmt(new Date() as any)}">
          <input type="date" id="fShiftEndDate" value="${editing ? (existing.endDate || '') : ''}" placeholder="Leave blank if ongoing">
        </div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:4px;">Leave the end date blank if this pattern doesn't have a known end yet. Once a pattern's end date passes, it drops off the list here automatically (there's a toggle to still see it).</div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save Changes' : 'Create'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('fShiftPatternType').addEventListener('change', (e?: any): any => {
            const isWeekly: any = e.target.value === 'weekly';
            (document as any).getElementById('fShiftRotationFields').style.display = isWeekly ? 'none' : 'block';
            (document as any).getElementById('fShiftWeeklyFields').style.display = isWeekly ? 'block' : 'none';
        });
        (document as any).getElementById('mSave').onclick = (): any => {
            const name: any = (document as any).getElementById('fShiftName').value.trim();
            if (!name) {
                toast("Enter a pattern name.", true);
                return;
            }
            const selectedType: any = (document as any).getElementById('fShiftPatternType').value;
            const weekdays: any = Array.from((document as any).querySelectorAll('.fShiftWeekday:checked')).map((el?: any): any => Number(el.value));
            const altWeekdays: any = Array.from((document as any).querySelectorAll('.fShiftAltWeekday:checked')).map((el?: any): any => Number(el.value));
            const altAnchorDate: any = (document as any).getElementById('fShiftAltAnchor').value;
            if (selectedType === 'weekly' && weekdays.length === 0 && altWeekdays.length === 0) {
                toast("Select at least one day of the week.", true);
                return;
            }
            if (selectedType === 'weekly' && altWeekdays.length > 0 && !altAnchorDate) {
                toast("Pick a reference date for the alternating day.", true);
                return;
            }
            const startDate: any = (document as any).getElementById('fShiftStartDate').value;
            const endDate: any = (document as any).getElementById('fShiftEndDate').value || null;
            if (!startDate) {
                toast("Enter an effective start date.", true);
                return;
            }
            if (endDate && endDate < startDate) {
                toast("End date can't be before the start date.", true);
                return;
            }
            const data: any = {
                name,
                patternType: selectedType,
                daysOn: Number((document as any).getElementById('fShiftDaysOn').value) || 4,
                daysOff: Number((document as any).getElementById('fShiftDaysOff').value) || 3,
                weekdays, altWeekdays, altAnchorDate,
                hoursStart: (document as any).getElementById('fShiftStart').value,
                hoursEnd: (document as any).getElementById('fShiftEnd').value,
                minStaff: Math.max(0, Number((document as any).getElementById('fShiftMinStaff').value) || 0),
                startDate, endDate
            } as any;
            if (editing) {
                Object.assign(existing, data);
                logActivity(`Updated shift pattern "${name}".`, "schedule");
                toast("Shift pattern updated.");
            }
            else {
                const color: any = SHIFT_COLOR_PALETTE[STATE.pm.scheduleShifts.length % SHIFT_COLOR_PALETTE.length];
                STATE.pm.scheduleShifts.push({ id: 'shift' + Date.now(), color, ...data } as any);
                logActivity(`Created shift pattern "${name}".`, "schedule");
                toast("Shift pattern created.");
            }
            persist();
            closeModal();
            renderScheduling();
        };
    }
    function openAssignmentFormModal(existing?: any): any {
        const editing: any = !!existing;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit Shift Assignment' : 'Assign Shift'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label><select id="fAssignPerson">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${editing && existing.personId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Shift Pattern</label><select id="fAssignShift">${sortShiftsForSelection(STATE.pm.scheduleShifts).map((s?: any): any => `<option value="${s.id}" ${editing && existing.shiftId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Unit</label><select id="fAssignUnit">${STATE.pm.refData.units.map((u?: any): any => `<option ${editing && existing.unit === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Location</label><input type="text" id="fAssignLocation" value="${editing ? escapeHtml(existing.location || '') : ''}" placeholder="e.g. North Substation"></div>
      </div>
      <div class="form-row"><label>Start Date</label><input type="date" id="fAssignStart" value="${editing ? existing.startDate : fmt(new Date() as any)}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save Changes' : 'Assign'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const personId: any = (document as any).getElementById('fAssignPerson').value;
            const data: any = {
                personId,
                shiftId: (document as any).getElementById('fAssignShift').value,
                unit: (document as any).getElementById('fAssignUnit').value,
                location: (document as any).getElementById('fAssignLocation').value.trim(),
                startDate: (document as any).getElementById('fAssignStart').value
            } as any;
            if (editing) {
                Object.assign(existing, data);
                logActivity(`Updated shift assignment for ${personName(personId)}.`, "schedule", existing.id);
                toast("Shift assignment updated.");
            }
            else {
                STATE.pm.scheduleAssignments.push({ id: 'sa' + Date.now(), ...data, endDate: null } as any);
                logActivity(`Assigned ${personName(personId)} to a new shift.`, "schedule");
                toast("Shift assigned.");
            }
            persist();
            closeModal();
            renderScheduling();
        };
    }
    function openExceptionFormModal(existing?: any): any {
        const editing: any = !!existing;
        const codes: any = selectableExceptionCodes(editing ? existing.code : null);
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing ? 'Edit Time Off / Exception' : 'Log Time Off / Exception'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label><select id="fExPerson">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${editing && existing.personId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Code</label>
        <select id="fExCode">${codes.map((c?: any): any => `<option value="${c.code}" ${editing && existing.code === c.code ? 'selected' : ''}>${c.code} — ${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fExStart" value="${editing ? existing.startDate : fmt(new Date() as any)}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fExEnd" value="${editing ? existing.endDate : fmt(new Date() as any)}"></div>
      </div>
      <div class="form-row"><label>Notes</label><input type="text" id="fExNotes" value="${editing ? escapeHtml(existing.notes || '') : ''}" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing ? 'Save Changes' : 'Log It'}</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const personId: any = (document as any).getElementById('fExPerson').value;
            const startDate: any = (document as any).getElementById('fExStart').value;
            const endDate: any = (document as any).getElementById('fExEnd').value;
            if (!startDate || !endDate || endDate < startDate) {
                toast("Enter a valid date range.", true);
                return;
            }
            const data: any = {
                personId,
                code: (document as any).getElementById('fExCode').value,
                startDate,
                endDate,
                notes: (document as any).getElementById('fExNotes').value.trim()
            } as any;
            if (!STATE.pm.scheduleExceptions)
                STATE.pm.scheduleExceptions = [];
            if (editing) {
                Object.assign(existing, data);
                logActivity(`Updated a ${data.code} entry for ${personName(personId)}.`, "schedule");
                toast("Exception updated.");
            }
            else {
                STATE.pm.scheduleExceptions.push({ id: 'exc' + Date.now(), ...data } as any);
                logActivity(`Logged a ${data.code} for ${personName(personId)} (${startDate}${endDate !== startDate ? ' to ' + endDate : ''}).`, "schedule");
                toast("Logged.");
            }
            persist();
            closeModal();
            renderScheduling();
        };
    }
    function openSwapRequestModal(): any {
        // Best-effort default: if the logged-in user is a real person with an active assignment,
        // preselect them as the one requesting off, since that's who's using this form 95% of the time.
        const defaultRequester: any = STATE.personnel.find((p?: any): any => p.id === CURRENT_USER_ID) ? CURRENT_USER_ID : (STATE.personnel[0] || {} as any).id;
        (document as any).getElementById('modalBox').className = 'modal';
        (document as any).getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Shift Swap</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Requesting (wants the day off)</label><select id="fSwapRequester">${STATE.personnel.map((p?: any): any => `<option value="${p.id}" ${defaultRequester === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Covering (will work the shift instead)</label><select id="fSwapCovering">${STATE.personnel.map((p?: any): any => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Date</label><input type="date" id="fSwapDate" value="${fmt(new Date() as any)}"></div>
      <div class="form-row"><label>Reason</label><input type="text" id="fSwapReason" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
        openModal();
        (document as any).getElementById('mClose').onclick = closeModal;
        (document as any).getElementById('mCancel').onclick = closeModal;
        (document as any).getElementById('mSave').onclick = (): any => {
            const requesterId: any = (document as any).getElementById('fSwapRequester').value;
            const coveringId: any = (document as any).getElementById('fSwapCovering').value;
            const date: any = (document as any).getElementById('fSwapDate').value;
            if (!date) {
                toast("Choose a date.", true);
                return;
            }
            if (requesterId === coveringId) {
                toast("Pick two different people.", true);
                return;
            }
            if (!STATE.pm.shiftSwapRequests)
                STATE.pm.shiftSwapRequests = [];
            STATE.pm.shiftSwapRequests.push({
                id: 'swap' + Date.now(), requesterId, coveringId, date,
                reason: (document as any).getElementById('fSwapReason').value.trim(),
                status: 'pending', requestedAt: fmt(new Date() as any), requestedBy: CURRENT_USER_ID
            } as any);
            logActivity(`Requested a shift swap: ${personName(coveringId)} to cover for ${personName(requesterId)} on ${date}.`, "schedule");
            persist();
            toast("Swap request submitted for approval.");
            closeModal();
            renderScheduling();
        };
    }
    function approveSwapRequest(id?: any): any {
        const req: any = (STATE.pm.shiftSwapRequests || []).find((r?: any): any => r.id === id);
        if (!req || req.status !== 'pending')
            return;
        if (!confirm(`Approve this swap? ${personName(req.coveringId)} will cover for ${personName(req.requesterId)} on ${req.date}.`))
            return;
        if (!STATE.pm.scheduleExceptions)
            STATE.pm.scheduleExceptions = [];
        if (!STATE.pm.scheduleCoverages)
            STATE.pm.scheduleCoverages = [];
        // Mark the requester off that day, same mechanism as any other logged exception.
        STATE.pm.scheduleExceptions.push({ id: 'exc' + Date.now(), personId: req.requesterId, code: 'SWP', startDate: req.date, endDate: req.date, notes: `Covered by ${personName(req.coveringId)}`, swapRequestId: req.id } as any);
        // Whatever shift/unit/location the requester would have worked, attribute a one-off coverage
        // to the covering officer for that single date, even if it isn't part of their own rotation.
        const requesterAssignment: any = STATE.pm.scheduleAssignments.find((a?: any): any => a.personId === req.requesterId && isOnDutyOnDate(a, STATE.pm.scheduleShifts.find((s?: any): any => s.id === a.shiftId), req.date));
        if (requesterAssignment) {
            STATE.pm.scheduleCoverages.push({ id: 'cov' + Date.now(), personId: req.coveringId, shiftId: requesterAssignment.shiftId, unit: requesterAssignment.unit, location: requesterAssignment.location, date: req.date, swapRequestId: req.id } as any);
        }
        req.status = 'approved';
        req.decidedAt = fmt(new Date() as any);
        req.decidedBy = CURRENT_USER_ID;
        logActivity(`Approved a shift swap: ${personName(req.coveringId)} covering for ${personName(req.requesterId)} on ${req.date}.`, "schedule");
        persist();
        toast("Swap approved.");
        renderScheduling();
    }
    function denySwapRequest(id?: any): any {
        const req: any = (STATE.pm.shiftSwapRequests || []).find((r?: any): any => r.id === id);
        if (!req || req.status !== 'pending')
            return;
        if (!confirm(`Deny the swap request from ${personName(req.requesterId)}?`))
            return;
        req.status = 'denied';
        req.decidedAt = fmt(new Date() as any);
        req.decidedBy = CURRENT_USER_ID;
        logActivity(`Denied a shift swap request from ${personName(req.requesterId)}.`, "schedule");
        persist();
        toast("Swap denied.");
        renderScheduling();
    }
    function cancelSwapRequest(id?: any): any {
        const req: any = (STATE.pm.shiftSwapRequests || []).find((r?: any): any => r.id === id);
        if (!req || req.status !== 'pending')
            return;
        if (!confirm("Cancel this swap request?"))
            return;
        req.status = 'cancelled';
        req.decidedAt = fmt(new Date() as any);
        logActivity(`Cancelled a shift swap request for ${personName(req.requesterId)}.`, "schedule");
        persist();
        toast("Request cancelled.");
        renderScheduling();
    }
    function deleteSwapRequest(id?: any): any {
        const req: any = (STATE.pm.shiftSwapRequests || []).find((r?: any): any => r.id === id);
        if (!req)
            return;
        if (!confirm("Delete this swap request record? This also removes any coverage or day-off entry it created."))
            return;
        STATE.pm.scheduleExceptions = (STATE.pm.scheduleExceptions || []).filter((e?: any): any => e.swapRequestId !== id);
        STATE.pm.scheduleCoverages = (STATE.pm.scheduleCoverages || []).filter((c?: any): any => c.swapRequestId !== id);
        STATE.pm.shiftSwapRequests = STATE.pm.shiftSwapRequests.filter((r?: any): any => r.id !== id);
        logActivity(`Deleted a shift swap request record.`, "schedule");
        persist();
        toast("Deleted.");
        renderScheduling();
    }
    /* =========================================================================
       REPORTS & ANALYTICS (fixed required reports + a configurable report builder)   ========================================================================= */
    let CUSTOM_REPORT: any = { entity: "records", groupBy: "unitId", unit: "All", rank: "All", dateFrom: "", dateTo: "" } as any;
    let PM_REPORT_FILTERS: any = { dateFrom: '', dateTo: '', unit: 'All' } as any;
    function renderReports(): any {
        if (!can('pm_reports_view')) {
            (document as any).getElementById('view-pm-reports').innerHTML = permissionBlockedView("You don't have permission to view reports in this role.");
            return;
        }
        const canExport: any = can('pm_reports_export');
        const f: any = PM_REPORT_FILTERS;
        const personInScope: any = (pid?: any): any => f.unit === 'All' || (STATE.personnel.find((p?: any): any => p.id === pid)?.unit === f.unit);
        // Required report: training + expiration dates
        const trainingExpRows: any = STATE.pm.trainingRecords.filter((t?: any): any => t.recertDate && personInScope(t.personId) && withinDateRange(t.recertDate, f.dateFrom, f.dateTo)).sort((a?: any, b?: any): any => a.recertDate.localeCompare(b.recertDate)).map((t?: any): any => `
    <tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.recertDate}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No recertification dates on file.</td></tr>`;
        // Required report: training costs
        const costByProvider: any = {} as any;
        STATE.pm.trainingRecords.filter((t?: any): any => personInScope(t.personId) && withinDateRange(t.date, f.dateFrom, f.dateTo)).forEach((t?: any): any => { costByProvider[t.provider] = (costByProvider[t.provider] || 0) + t.cost; });
        const totalTrainingCost: any = (Object.values(costByProvider) as any).reduce((a?: any, b?: any): any => a + b, 0);
        // Required report: scheduled but no-show
        const noShowRows: any = STATE.pm.trainingRecords.filter((t?: any): any => t.attendedStatus === "No-Show" && personInScope(t.personId) && withinDateRange(t.date, f.dateFrom, f.dateTo)).map((t?: any): any => `
    <tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.date}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No no-shows on file.</td></tr>`;
        // Required-ish: pending disciplinary expirations (mirrors the Disciplinary screen's report)
        const today: any = new Date() as any;
        const pendingDiscipline: any = STATE.pm.disciplinaryActions.filter((d?: any): any => d.status !== "Closed" && d.evaluationDates.length && personInScope(d.personId))
            .flatMap((d?: any): any => d.evaluationDates.map((ed?: any): any => ({ d, ed, days: daysBetween(fmt(today), ed) } as any))).filter((x?: any): any => x.days <= 60).sort((a?: any, b?: any): any => a.days - b.days);
        (document as any).getElementById('view-pm-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="pmReportFilterHost"></div></div></div>
    <div class="panel"><div class="panel-head"><h2>Training &amp; Expiration Dates</h2>${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportTrainExp">${ICONS.download} Export</button>` : ''}</div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Course</th><th>Recert Due</th></tr></thead><tbody>${trainingExpRows}</tbody></table></div></div>

    <div class="two-col">
      <div class="panel"><div class="panel-head"><h2>Training Costs by Provider</h2><span class="hint">${money(totalTrainingCost)} total</span></div>
        <div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartTrainCost"></canvas></div></div></div>
      <div class="panel"><div class="panel-head"><h2>Scheduled but No-Show</h2></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Employee</th><th>Course</th><th>Date</th></tr></thead><tbody>${noShowRows}</tbody></table></div></div>
    </div>

    <div class="panel"><div class="panel-head"><h2>Pending Disciplinary Expirations</h2><span class="hint">Within 60 days</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Type</th><th>Evaluation Date</th><th>Time Remaining</th></tr></thead><tbody>
      ${pendingDiscipline.map(({ d, ed, days }: any): any => `<tr><td>${recordLink(d.personId)}</td><td>${escapeHtml(d.type)}</td><td>${ed}</td><td style="${days <= 14 ? 'color:var(--red);font-weight:700;' : ''}">${days < 0 ? Math.abs(days) + 'd overdue' : days + 'd'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">Nothing pending.</td></tr>`}
      </tbody></table></div></div>

    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="crEntity">
              <option value="records" ${CUSTOM_REPORT.entity === 'records' ? 'selected' : ''}>Personnel Records</option>
              <option value="training" ${CUSTOM_REPORT.entity === 'training' ? 'selected' : ''}>Training Records</option>
              <option value="disciplinary" ${CUSTOM_REPORT.entity === 'disciplinary' ? 'selected' : ''}>Disciplinary Actions</option>
              <option value="inquiries" ${CUSTOM_REPORT.entity === 'inquiries' ? 'selected' : ''}>RMS-Data Inquiries</option>
            </select>
            <select id="crGroupBy"></select>
            <select id="crUnit"><option ${CUSTOM_REPORT.unit === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.units.map((u?: any): any => `<option ${CUSTOM_REPORT.unit === u ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}</select>
            <select id="crRank"><option ${CUSTOM_REPORT.rank === 'All' ? 'selected' : ''}>All</option>${STATE.pm.refData.ranks.map((r?: any): any => `<option ${CUSTOM_REPORT.rank === r ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('')}</select>
            <input type="date" id="crDateFrom" value="${CUSTOM_REPORT.dateFrom}">
            <input type="date" id="crDateTo" value="${CUSTOM_REPORT.dateTo}">
          </div>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportCustomReport">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
        <div class="chart-box" style="height:220px;margin-top:14px;"><canvas id="chartCustomReport"></canvas></div>
        <div id="customReportTable" style="margin-top:14px;overflow-x:auto;"></div>
      </div>
    </div>
  `;
        renderReportFilterBar((document as any).getElementById('pmReportFilterHost'), [
            { type: 'daterange', keyFrom: 'dateFrom', keyTo: 'dateTo', label: 'Date Range' } as any,
            { type: 'select', key: 'unit', label: 'Unit', options: STATE.pm.refData.units } as any,
        ], PM_REPORT_FILTERS, renderReports);
        destroyChartsPm();
        const blue: any = '#134DD1', navy: any = '#24364E', slate: any = '#B4C7CF';
        CHART_REFS_PM.trainCost = safeChart('chartTrainCost', {
            type: 'bar', data: { labels: Object.keys(costByProvider) as any, datasets: [{ label: 'Cost ($)', data: Object.values(costByProvider) as any, backgroundColor: navy } as any] } as any,
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any } as any } as any } as any
        } as any);
        const exportTrainExp: any = (document as any).getElementById('btnExportTrainExp');
        if (exportTrainExp)
            exportTrainExp.addEventListener('click', (): any => exportCsv(["Employee", "Course", "Recert Due"], STATE.pm.trainingRecords.filter((t?: any): any => t.recertDate).map((t?: any): any => [personName(t.personId), t.description, t.recertDate]), 'training_expirations.csv'));
        renderCustomReportBuilder();
        (document as any).getElementById('crEntity').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.entity = e.target.value; renderCustomReportBuilder(); });
        (document as any).getElementById('crGroupBy').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.groupBy = e.target.value; renderCustomReportBuilder(); });
        (document as any).getElementById('crUnit').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.unit = e.target.value; renderCustomReportBuilder(); });
        (document as any).getElementById('crRank').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.rank = e.target.value; renderCustomReportBuilder(); });
        (document as any).getElementById('crDateFrom').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.dateFrom = e.target.value; renderCustomReportBuilder(); });
        (document as any).getElementById('crDateTo').addEventListener('change', (e?: any): any => { CUSTOM_REPORT.dateTo = e.target.value; renderCustomReportBuilder(); });
        wireRecordLinks();
    }
    const REPORT_GROUPBY_OPTIONS: any = {
        records: [['unitId', 'Unit'], ['rank', 'Rank'], ['employmentStatus', 'Employment Status'], ['race', 'Race'], ['sex', 'Sex']],
        training: [['description', 'Course'], ['provider', 'Provider'], ['attendedStatus', 'Attendance']],
        disciplinary: [['type', 'Type'], ['status', 'Status']],
        inquiries: [['category', 'Category'], ['outcome', 'Outcome']]
    } as any;
    function renderCustomReportBuilder(): any {
        const groupSel: any = (document as any).getElementById('crGroupBy');
        const opts: any = REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity];
        if (!opts.find(([k]: any): any => k === CUSTOM_REPORT.groupBy))
            CUSTOM_REPORT.groupBy = opts[0][0];
        groupSel.innerHTML = opts.map(([k, label]: any): any => `<option value="${k}" ${CUSTOM_REPORT.groupBy === k ? 'selected' : ''}>Group by ${label}</option>`).join('');
        let dataset: any;
        if (CUSTOM_REPORT.entity === 'records')
            dataset = STATE.pm.records.map((r?: any): any => ({ ...r, __date: r.hireDate } as any));
        else if (CUSTOM_REPORT.entity === 'training')
            dataset = STATE.pm.trainingRecords.map((t?: any): any => ({ ...t, __date: t.date } as any));
        else if (CUSTOM_REPORT.entity === 'disciplinary')
            dataset = STATE.pm.disciplinaryActions.map((d?: any): any => ({ ...d, __date: d.startDateTime.slice(0, 10) } as any));
        else
            dataset = STATE.pm.inquiries.map((i?: any): any => ({ ...i, __date: i.date } as any));
        dataset = dataset.filter((row?: any): any => {
            if (CUSTOM_REPORT.unit !== "All") {
                const rec: any = row.personId ? recordFor(row.personId) : null;
                const unitVal: any = row.unitId || (rec ? rec.unitId : null);
                if (unitVal !== CUSTOM_REPORT.unit)
                    return false;
            }
            if (CUSTOM_REPORT.rank !== "All") {
                const rec: any = row.personId ? recordFor(row.personId) : row;
                if (!rec || rec.rank !== CUSTOM_REPORT.rank)
                    return false;
            }
            if (CUSTOM_REPORT.dateFrom && row.__date && row.__date < CUSTOM_REPORT.dateFrom)
                return false;
            if (CUSTOM_REPORT.dateTo && row.__date && row.__date > CUSTOM_REPORT.dateTo)
                return false;
            return true;
        });
        const counts: any = {} as any;
        dataset.forEach((row?: any): any => { const key: any = row[CUSTOM_REPORT.groupBy] || 'Unspecified'; counts[key] = (counts[key] || 0) + 1; });
        if (CHART_REFS_PM.custom)
            CHART_REFS_PM.custom.destroy();
        CHART_REFS_PM.custom = safeChart('chartCustomReport', {
            type: 'bar',
            data: { labels: Object.keys(counts) as any, datasets: [{ label: 'Count', data: Object.values(counts) as any, backgroundColor: '#134DD1' } as any] } as any,
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } as any } as any, scales: { x: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 10 } as any } as any, grid: { display: false } as any } as any, y: { ticks: { color: chartTextColor(), font: { family: 'Archivo', size: 11 } as any } as any } as any } as any } as any
        } as any);
        const nameCol: any = CUSTOM_REPORT.entity === 'records' ? 'personId' : 'personId';
        const tableRows: any = dataset.slice(0, 200).map((row?: any): any => `
    <tr><td>${row.personId ? recordLink(row.personId) : ''}</td><td>${escapeHtml(String(row[CUSTOM_REPORT.groupBy] || ''))}</td><td>${escapeHtml(row.__date || '')}</td></tr>
  `).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
        (document as any).getElementById('customReportTable').innerHTML = `
    <table><thead><tr><th>Employee</th><th>${REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity].find(([k]: any): any => k === CUSTOM_REPORT.groupBy)[1]}</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length > 200 ? ' (showing first 200)' : ''}</div>
  `;
        wireRecordLinks();
        const exportBtn: any = (document as any).getElementById('btnExportCustomReport');
        if (exportBtn)
            exportBtn.onclick = (): any => exportCsv(["Employee", REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity].find(([k]: any): any => k === CUSTOM_REPORT.groupBy)[1], "Date"], dataset.map((row?: any): any => [row.personId ? personName(row.personId) : '', row[CUSTOM_REPORT.groupBy] || '', row.__date || '']), `personnel_custom_report_${CUSTOM_REPORT.entity}.csv`);
    }
    function exportCsv(headers?: any, rows?: any, filename?: any): any {
        const csv: any = [headers, ...rows].map((r?: any): any => r.map((v?: any): any => csvSafeCell(v)).join(',')).join('\\n');
        const blob: any = new Blob([csv], { type: 'text/csv' } as any);
        const url: any = URL.createObjectURL(blob);
        const a: any = (document as any).createElement('a');
        a.href = url;
        a.download = filename;
        (document as any).body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("Report exported.");
    }
    /* =========================================================================
       ADMIN: reference data, notification routing, platform audit log
       ========================================================================= */
    let ADMIN_TAB: any = 'ranks';
    const SIMPLE_LIST_TABS: any = {
        ranks: { label: 'Ranks', usageCheck: (v?: any): any => STATE.pm.records.filter((r?: any): any => r.rank === v).length } as any,
        units: { label: 'Units', usageCheck: (v?: any): any => STATE.pm.records.filter((r?: any): any => r.unitId === v).length } as any,
        disciplinaryTypes: { label: 'Disciplinary Types', usageCheck: (v?: any): any => STATE.pm.disciplinaryActions.filter((d?: any): any => d.type === v).length } as any,
        employmentStatuses: { label: 'Employment Statuses', usageCheck: (v?: any): any => STATE.pm.records.filter((r?: any): any => r.employmentStatus === v).length } as any,
        trainingCategories: { label: 'Training Categories', usageCheck: (v?: any): any => STATE.pm.trainingCourses.filter((c?: any): any => c.category === v).length } as any,
        trainingProviders: { label: 'Training Providers', usageCheck: (v?: any): any => STATE.pm.trainingRecords.filter((t?: any): any => t.provider === v).length } as any,
        inquiryCategories: { label: 'Inquiry Categories', usageCheck: (v?: any): any => STATE.pm.inquiries.filter((i?: any): any => i.category === v).length } as any,
        skillsCatalog: { label: 'Special Skills Catalog', usageCheck: (v?: any): any => STATE.pm.records.filter((r?: any): any => r.specialSkills.includes(v)).length } as any
    } as any;
    function renderAdmin(): any {
        const canManage: any = can('pm_admin_categories');
        const canAudit: any = can('pm_admin_audit');
        if (!canManage && !canAudit) {
            (document as any).getElementById('view-pm-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
            return;
        }
        const tabs: any = [];
        if (canManage) {
            (Object.entries(SIMPLE_LIST_TABS) as any).forEach(([key, cfg]: any): any => tabs.push([key, cfg.label]));
            tabs.push(['trainingLocations', 'Training Locations']);
            tabs.push(['exceptionCodes', 'Time Off Codes']);
            tabs.push(['schedulingSettings', 'Scheduling Settings']);
            tabs.push(['notifications', 'Notification Routing']);
        }
        if (can('personnel_bulk_import'))
            tabs.push(['bulkImportPersonnel', 'Bulk Import: Personnel']);
        if (can('pm_training_bulk_import'))
            tabs.push(['bulkImportTraining', 'Bulk Import: Training']);
        if (canAudit)
            tabs.push(['audit', 'Platform Audit Log']);
        if (!tabs.find(([k]: any): any => k === ADMIN_TAB))
            ADMIN_TAB = tabs[0][0];
        (document as any).getElementById('view-pm-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key, label]: any): any => `<button class="btn btn-sm ${ADMIN_TAB === key ? 'btn-primary' : 'btn-outline'}" data-admin-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyPm"></div>
  `;
        (document as any).querySelectorAll('[data-admin-tab]').forEach((b?: any): any => b.addEventListener('click', (): any => { ADMIN_TAB = b.dataset.adminTab; renderAdmin(); }));
        renderAdminTabBody();
    }
    function renderAdminTabBody(): any {
        const body: any = (document as any).getElementById('adminTabBodyPm');
        if (SIMPLE_LIST_TABS[ADMIN_TAB])
            renderSimpleListTab(body, ADMIN_TAB);
        else if (ADMIN_TAB === 'trainingLocations')
            renderTrainingLocationsTab(body);
        else if (ADMIN_TAB === 'exceptionCodes')
            renderExceptionCodesTab(body);
        else if (ADMIN_TAB === 'schedulingSettings')
            renderSchedulingSettingsTab(body);
        else if (ADMIN_TAB === 'notifications')
            renderNotificationRoutingTab(body);
        else if (ADMIN_TAB === 'bulkImportPersonnel')
            renderBulkImportTab(body, 'personnel');
        else if (ADMIN_TAB === 'bulkImportTraining')
            renderBulkImportTab(body, 'training');
        else if (ADMIN_TAB === 'audit')
            renderPlatformAuditLogTab(body);
    }
    // Defensive, not reliant on any migration hook actually having run (one already didn't, for real
    // tenant data -- see the fix history). Upgrades any lingering plain-string entries in place, in
    // whatever function actually reads this list, so it's correct regardless of how STATE was loaded.
    function ensureTrainingLocationsShape(): any {
        if (!STATE.pm.refData.trainingLocations)
            STATE.pm.refData.trainingLocations = [];
        STATE.pm.refData.trainingLocations = STATE.pm.refData.trainingLocations.map((l?: any): any => typeof l === 'string' ? { name: l, address: '' } as any : l);
    }
    function renderTrainingLocationsTab(body?: any): any {
        ensureTrainingLocationsShape();
        const list: any = STATE.pm.refData.trainingLocations;
        const usageCount: any = (name?: any): any => STATE.pm.trainingRecords.filter((t?: any): any => t.location === name).length + STATE.pm.trainingSessions.filter((s?: any): any => s.location === name).length;
        let editingIndex: any = null;
        function draw(): any {
            const rows: any = list.map((loc?: any, i?: any): any => {
                const inUse: any = usageCount(loc.name);
                const isEditing: any = editingIndex === i;
                if (isEditing) {
                    return `<tr>
          <td><input type="text" id="fLocEditName" value="${escapeHtml(loc.name)}" style="width:100%;"></td>
          <td><input type="text" id="fLocEditAddress" value="${escapeHtml(loc.address || '')}" placeholder="Street address" style="width:100%;"></td>
          <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
          <td><div class="cell-actions"><button class="btn btn-sm btn-primary" id="btnSaveLocEdit">Save</button><button class="btn btn-sm btn-outline" id="btnCancelLocEdit">Cancel</button></div></td>
        </tr>`;
                }
                return `<tr>
        <td>${escapeHtml(loc.name)}</td>
        <td>${loc.address ? escapeHtml(loc.address) : `<span style="color:var(--text-dim);font-size:12px;">No address on file</span>`}</td>
        <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
        <td><div class="cell-actions"><button class="btn-icon" data-edit-loc="${i}" title="Edit">${ICONS.edit}</button>${!inUse ? `<button class="btn-icon" data-remove-loc="${i}" title="Delete">${ICONS.trash}</button>` : ''}</div></td>
      </tr>`;
            }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No training locations defined yet.</td></tr>`;
            body.innerHTML = `
      <div class="panel"><div class="panel-head"><h2>Training Locations</h2></div>
        <div class="panel-body">
          <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:14px;max-width:640px;">
            A street address here lets a Training Session at that location show a map and a one-tap link to Apple Maps or Google Maps. Leave the address blank for locations like "Online / LMS" that don't have one.
          </div>
          <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
            <input type="text" id="newLocName" placeholder="Location name, e.g. In-House Range" style="flex:1;min-width:200px;">
            <input type="text" id="newLocAddress" placeholder="Street address (optional)" style="flex:1;min-width:220px;">
            <button class="btn btn-primary btn-sm" id="btnAddLoc">${ICONS.plus} Add</button>
          </div>
          <table><thead><tr><th>Name</th><th>Address</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        </div>
      </div>
    `;
            (document as any).getElementById('btnAddLoc').addEventListener('click', (): any => {
                const name: any = (document as any).getElementById('newLocName').value.trim();
                const address: any = (document as any).getElementById('newLocAddress').value.trim();
                if (!name) {
                    toast("Enter a location name.", true);
                    return;
                }
                if (list.some((l?: any): any => l.name.toLowerCase() === name.toLowerCase())) {
                    toast(`"${name}" already exists.`, true);
                    return;
                }
                list.push({ name, address } as any);
                logActivity(`Added training location "${name}".`, "admin");
                persist();
                toast("Location added.");
                draw();
            });
            (document as any).querySelectorAll('[data-edit-loc]').forEach((b?: any): any => b.addEventListener('click', (): any => { editingIndex = Number(b.dataset.editLoc); draw(); }));
            const saveBtn: any = (document as any).getElementById('btnSaveLocEdit');
            if (saveBtn)
                saveBtn.addEventListener('click', (): any => {
                    const name: any = (document as any).getElementById('fLocEditName').value.trim();
                    const address: any = (document as any).getElementById('fLocEditAddress').value.trim();
                    if (!name) {
                        toast("Enter a location name.", true);
                        return;
                    }
                    const oldName: any = list[editingIndex].name;
                    if (list.some((l?: any, i?: any): any => i !== editingIndex && l.name.toLowerCase() === name.toLowerCase())) {
                        toast(`"${name}" already exists.`, true);
                        return;
                    }
                    list[editingIndex] = { name, address } as any;
                    // Renaming a location that's already referenced by sessions/records keeps them pointed at
                    // the right place -- they're matched by name, so update those references along with it.
                    if (oldName !== name) {
                        STATE.pm.trainingRecords.forEach((t?: any): any => { if (t.location === oldName)
                            t.location = name; });
                        STATE.pm.trainingSessions.forEach((s?: any): any => { if (s.location === oldName)
                            s.location = name; });
                    }
                    logActivity(`Updated training location "${oldName}"${oldName !== name ? ` (renamed to "${name}")` : ''}.`, "admin");
                    persist();
                    toast("Location updated.");
                    editingIndex = null;
                    draw();
                });
            const cancelBtn: any = (document as any).getElementById('btnCancelLocEdit');
            if (cancelBtn)
                cancelBtn.addEventListener('click', (): any => { editingIndex = null; draw(); });
            (document as any).querySelectorAll('[data-remove-loc]').forEach((b?: any): any => b.addEventListener('click', (): any => {
                const idx: any = Number(b.dataset.removeLoc);
                const loc: any = list[idx];
                if (usageCount(loc.name) > 0) {
                    toast(`Can't remove "${loc.name}" \u2014 it's in use.`, true);
                    return;
                }
                if (!confirm(`Delete the training location "${loc.name}"?`))
                    return;
                list.splice(idx, 1);
                logActivity(`Deleted training location "${loc.name}".`, "admin");
                persist();
                toast("Location deleted.");
                draw();
            }));
        }
        draw();
    }
    function renderExceptionCodesTab(body?: any): any {
        if (!STATE.pm.refData.exceptionCodes)
            STATE.pm.refData.exceptionCodes = defaultExceptionCodes();
        const list: any = STATE.pm.refData.exceptionCodes;
        const usageCount: any = (code?: any): any => (STATE.pm.scheduleExceptions || []).filter((e?: any): any => e.code === code).length;
        const rows: any = list.map((c?: any, i?: any): any => {
            const inUse: any = usageCount(c.code);
            const statusBadge: any = c.active === false
                ? `<span style="color:var(--text-dim);font-size:12px;">Expired</span>`
                : `<span class="badge" style="background:var(--callout-green-bg);color:var(--callout-green-text);">Active</span>`;
            let actions: any = '';
            if (c.locked) {
                actions = `<span style="color:var(--text-dim);font-size:11px;">System-managed</span>`;
            }
            else {
                actions = `<button class="btn btn-sm btn-outline" data-toggle-code="${i}">${c.active === false ? 'Reactivate' : 'Expire'}</button>`;
                if (!inUse)
                    actions += ` <button class="btn-icon" data-remove-code="${i}" title="Delete">${ICONS.trash}</button>`;
            }
            return `<tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:8px;"></span>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
      <td>${statusBadge}</td>
      <td><div class="cell-actions">${actions}</div></td>
    </tr>`;
        }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No time off codes defined yet.</td></tr>`;
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Time Off Codes</h2></div>
      <div class="panel-body">
        <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:14px;max-width:640px;">
          These are the day-off/leave codes available when logging Time Off &amp; Exceptions in Scheduling. Expiring a code stops it from being offered for new entries but keeps every past record that already used it intact; delete is only available once a code is no longer in use anywhere.
        </div>
        <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
          <input type="text" id="newCodeAbbrev" placeholder="Code, e.g. PDO" style="width:140px;text-transform:uppercase;" maxlength="6">
          <input type="text" id="newCodeName" placeholder="What it stands for, e.g. Parental Day Off" style="flex:1;min-width:220px;">
          <button class="btn btn-primary btn-sm" id="btnAddCode">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>Code</th><th>Name</th><th>Usage</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddCode').addEventListener('click', (): any => {
            const code: any = (document as any).getElementById('newCodeAbbrev').value.trim().toUpperCase();
            const name: any = (document as any).getElementById('newCodeName').value.trim();
            if (!code || !name) {
                toast("Enter both a code and what it stands for.", true);
                return;
            }
            if (!/^[A-Z0-9]{2,6}$/.test(code)) {
                toast("Codes should be 2-6 letters or numbers.", true);
                return;
            }
            if (list.some((c?: any): any => c.code === code)) {
                toast(`"${code}" already exists.`, true);
                return;
            }
            const palette: any = ['#8A94A6', '#14B8A6', '#D8AA50', '#EC4899', '#F97316', '#0EA5E9', '#A855F7', '#22C55E', '#EAB308', '#EF4444'];
            const color: any = palette[list.length % palette.length];
            list.push({ code, name, color, active: true } as any);
            logActivity(`Added time off code "${code} \u2014 ${name}".`, "admin");
            persist();
            toast("Code added.");
            renderAdminTabBody();
        });
        (document as any).querySelectorAll('[data-toggle-code]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const item: any = list[Number(b.dataset.toggleCode)];
            item.active = item.active === false ? true : false;
            logActivity(`${item.active ? 'Reactivated' : 'Expired'} time off code "${item.code}".`, "admin");
            persist();
            renderAdminTabBody();
        }));
        (document as any).querySelectorAll('[data-remove-code]').forEach((b?: any): any => b.addEventListener('click', (): any => {
            const idx: any = Number(b.dataset.removeCode);
            const item: any = list[idx];
            if (usageCount(item.code) > 0) {
                toast(`Can't remove "${item.code}" \u2014 it's in use.`, true);
                return;
            }
            if (!confirm(`Delete the "${item.code}" code entirely? This can't be undone.`))
                return;
            list.splice(idx, 1);
            logActivity(`Deleted time off code "${item.code}".`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    function renderSimpleListTab(body?: any, key?: any): any {
        const cfg: any = SIMPLE_LIST_TABS[key];
        const list: any = STATE.pm.refData[key];
        const rows: any = list.map((v?: any, i?: any): any => {
            const inUse: any = cfg.usageCheck(v);
            return `<tr><td>${escapeHtml(v)}</td><td>${inUse ? `<span class="badge badge-role">${inUse} in use</span>` : `<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item="${i}">${ICONS.trash}</button></td></tr>`;
        }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputPm" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/, '')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemPm">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
        (document as any).getElementById('btnAddItemPm').addEventListener('click', (): any => {
            const val: any = (document as any).getElementById('newItemInputPm').value.trim();
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
                toast(`Can't remove "${val}" \u2014 it's in use.`, true);
                return;
            }
            if (!confirm(`Remove "${val}"?`))
                return;
            list.splice(idx, 1);
            logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
            persist();
            renderAdminTabBody();
        }));
    }
    // A single, agency-configurable policy number rather than a hardcoded rule -- how many combined
    // on-duty + extra-duty hours in one day trips the fatigue flag on an Extra Duty signup. Different
    // agencies (and different union contracts) set this differently, so it has to be an admin setting,
    // not a constant buried in the code.
    function renderSchedulingSettingsTab(body?: any): any {
        const settings: any = STATE.pm.schedulingSettings || (STATE.pm.schedulingSettings = { fatigueThresholdHours: 16 } as any);
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Scheduling Settings</h2></div>
      <div class="panel-body">
        <div class="form-row">
          <label>Fatigue Threshold (combined hours per day)</label>
          <input type="number" min="1" step="0.5" id="fFatigueThreshold" value="${settings.fatigueThresholdHours}">
        </div>
        <p style="font-size:12px;color:var(--text-dim);margin:0 0 14px;">Extra Duty flags a signup when a person's regular on-duty hours plus extra-duty hours that day would exceed this number. It's a warning shown to whoever approves the signup, not a hard block.</p>
        <button class="btn btn-primary btn-sm" id="btnSaveSchedulingSettings">Save</button>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveSchedulingSettings').addEventListener('click', (): any => {
            const val: any = Number((document as any).getElementById('fFatigueThreshold').value);
            if (!val || val <= 0) {
                toast("Enter a positive number of hours.", true);
                return;
            }
            settings.fatigueThresholdHours = val;
            logActivity(`Set the fatigue threshold to ${val} combined hours per day.`, "admin");
            persist();
            toast("Scheduling settings saved.");
        });
    }
    function renderNotificationRoutingTab(body?: any): any {
        const roleOpts: any = (sel?: any): any => STATE.roles.map((r?: any): any => `<option value="${r.id}" ${sel === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('');
        body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Disciplinary Evaluation Alerts</label><select id="fRoutePmDisc">${roleOpts(STATE.pm.notifySettings.disciplinaryExpiringRoleId)}</select></div>
        <div class="form-row"><label>Training / Certification Expiring Alerts</label><select id="fRoutePmTrain">${roleOpts(STATE.pm.notifySettings.trainingExpiringRoleId)}</select></div>
        <div class="form-row"><label>Medical / Vaccination Due Alerts</label><select id="fRoutePmMed">${roleOpts(STATE.pm.notifySettings.medicalDueRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingPm">Save Routing</button>
      </div>
    </div>
  `;
        (document as any).getElementById('btnSaveRoutingPm').addEventListener('click', (): any => {
            STATE.pm.notifySettings.disciplinaryExpiringRoleId = (document as any).getElementById('fRoutePmDisc').value;
            STATE.pm.notifySettings.trainingExpiringRoleId = (document as any).getElementById('fRoutePmTrain').value;
            STATE.pm.notifySettings.medicalDueRoleId = (document as any).getElementById('fRoutePmMed').value;
            logActivity("Updated notification routing settings.", "admin");
            persist();
            toast("Notification routing saved.");
            renderNotifBell();
        });
    }
    /* =========================================================================
       MODULE ENTRY POINT
       ========================================================================= */
    function startPmModule(): any {
        renderNav();
        switchView('pm-dashboard');
    }
    (window as any).PM = { start: startPmModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: (): any => renderView(ACTIVE_VIEW), openRecordDetail, openSessionDetailModal, openCheckinFlow, renderCalendarSub } as any;
})();

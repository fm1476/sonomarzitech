/* =========================================================================
   PERSONNEL MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.pm and shared roles/personnel)
   ========================================================================= */
(function(){

const RANKS = ["Recruit","Officer","Corporal","Sergeant","Lieutenant","Captain","Deputy Chief","Chief"];
const UNITS_PM = ["Patrol - A Shift","Patrol - B Shift","Patrol - C Shift","Traffic Unit","SWAT","K9 Unit","Detectives","Professional Standards","Fleet Services","Logistics","Records","Administration"];
const DISCIPLINARY_TYPES = ["Verbal Warning","Written Reprimand","Suspension (Unpaid)","Suspension (Paid)","Demotion","Termination","Last Chance Agreement","Performance Improvement Plan"];
const EMPLOYMENT_STATUSES = ["Active","On Leave","Suspended","Terminated","Retired"];
const TRAINING_CATEGORIES = ["Firearms","Defensive Tactics","Legal Update","Driving / EVOC","Medical / First Aid","Technology / RMS","Leadership","Compliance","Specialty / Tactical"];
const TRAINING_LOCATIONS = ["Regional Training Academy","In-House Range","Online / LMS","Main Fleet Garage Classroom","Off-Site Vendor Facility"];
const TRAINING_PROVIDERS = ["State POST Academy","In-House Instructor Cadre", "Axon Training Services","Red Cross","Vendor: Sierra Tactical Training","Online: PoliceOne Academy"];
const INQUIRY_CATEGORIES = ["Biased-Based Policing","Use of Force","Vehicle Pursuit","Vehicle Crash","Personnel Injury","Citation Review","Field Contact Report","Citizen Complaint","Civil Action","Criminal Action"];
const SKILLS_CATALOG = ["Spanish Fluency","Crisis Negotiation","Drone Operator","Accident Reconstruction","Field Training Officer","Firearms Instructor","K9 Handler","Bomb Technician","Sign Language","Public Speaking"];
const SEX_OPTIONS = ["Male","Female","Non-Binary","Undisclosed"];
const RACE_OPTIONS = ["White","Black or African American","Hispanic or Latino","Asian","American Indian or Alaska Native","Native Hawaiian or Pacific Islander","Two or More Races","Undisclosed"];
const MARITAL_OPTIONS = ["Single","Married","Divorced","Widowed","Separated","Undisclosed"];
const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"];
const LICENSE_CLASSES = ["Class A","Class B","Class C","Class D","Motorcycle Endorsement","CDL"];

/* Illustrated placeholder avatars (original generic silhouettes, not photos of any real
   individual) so the roster doesn't show a generic icon for every person. */
const AVATAR_PEOPLE = {
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
  p11: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTdFQ0YxIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjQyIiByPSIyMCIgZmlsbD0iIzhENUEzQyIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2MiA1MCw2MCBRODAsNjIgODUsOTUgWiIgZmlsbD0iIzhENUEzQyIgb3BhY2l0eT0iMC45MiIvPgogICAgPHBhdGggZD0iTTE1LDk1IFEyMCw2OCA1MCw2NiBRODAsNjggODUsOTUgWiIgZmlsbD0iIzNBNDY1NiIvPgogICAgPHBhdGggZD0iTTIzLDM2IFE1MCwxOCA3NywzNiBMNzcsMzAgUTUwLDIyIDIzLDMwIFoiIGZpbGw9IiMxQTFBMUEiLz4KICAgIAogIDwvc3ZnPg==",
};


function defaultExceptionCodes(){
  return [
    {code:'RDO', name:'Regular Day Off', color:'#8A94A6', active:true, requestable:false},
    {code:'VDO', name:'Vacation Day Off', color:'#14B8A6', active:true, requestable:true},
    {code:'CDO', name:'Compensatory Day Off', color:'#D8AA50', active:true, requestable:true},
    {code:'SDO', name:'Sick Day Off', color:'#EC4899', active:true, requestable:true},
    {code:'TDO', name:'Training Day Off', color:'#F97316', active:true, requestable:false},
    {code:'SWP', name:'Shift Swap (Covered by Someone Else)', color:'#0EA5E9', active:true, locked:true, requestable:false},
  ];
}
function defaultRefData(){
  return {
    ranks: [...RANKS], units: [...UNITS_PM], disciplinaryTypes: [...DISCIPLINARY_TYPES],
    employmentStatuses: [...EMPLOYMENT_STATUSES], trainingCategories: [...TRAINING_CATEGORIES],
    trainingLocations: TRAINING_LOCATIONS.map(name=>({name, address:''})), trainingProviders: [...TRAINING_PROVIDERS],
    inquiryCategories: [...INQUIRY_CATEGORIES], skillsCatalog: [...SKILLS_CATALOG],
    agencies: ["Reno PD - Patrol Division","Reno PD - SWAT","Reno PD - Traffic Unit","Regional Task Force (Mutual Aid)"],
    exceptionCodes: defaultExceptionCodes(),
  };
}

/* =========================================================================
   SEED DATA
   ========================================================================= */
function emptyMedical(){ return { bloodType:"Unknown", vaccinations: [], medicalNotes: "", injuryHistory: [], exposureHistory: [] }; }
function emptyLodd(){ return { wishes: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "", notes: "" }; }

function seedRecords(){
  const today = new Date();
  const defs = [
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
  const records = defs.map(([personId, roleId, rank, badge, agency, unit, hireDate, swornDate, bloodType, sex, race, marital])=>({
    personId, agency, employeeId: "EMP-"+badge, unitId: unit,
    driversLicense: { number: "DL"+Math.floor(1000000+Math.random()*8999999), licenseClass: "Class C", state: "NV", expiration: fmt(addDays(today, 365+Math.floor(Math.random()*700))) },
    hireDate, terminationDate: null,
    promotionHistory: [ {rank, startDate: hireDate, endDate: null} ],
    bloodType, phones: [ {type:"Mobile", number: "(775) 555-"+String(1000+Math.floor(Math.random()*8999)).slice(0,4)} ],
    address: { street: "100 Example St", city: "Reno", state: "NV", zip: "89501" },
    sex, race, maritalStatus: marital, rank, badgeNumber: badge,
    employmentStatus: "Active", specialSkills: [], assignment: unit,
    medical: emptyMedical(), lodd: emptyLodd(),
    supervisorIds: [], education: [], swornDate: swornDate,
    photoDataUrl: AVATAR_PEOPLE[personId] || null, documents: [], fieldHistory: [],
  }));
  // a few realistic supervisor links and specialty skills / education for demo depth
  const byId = id => records.find(r=>r.personId===id);
  byId('p2').supervisorIds = ['p1']; byId('p3').supervisorIds = ['p1']; byId('p4').supervisorIds = ['p1'];
  byId('p6').supervisorIds = ['p5']; byId('p1').supervisorIds = ['p9']; byId('p5').supervisorIds = ['p9'];
  byId('p2').specialSkills = ["Spanish Fluency","Field Training Officer"];
  byId('p6').specialSkills = ["K9 Handler","Firearms Instructor"];
  byId('p4').specialSkills = ["Accident Reconstruction"];
  byId('p2').education = [{degree:"A.A. Criminal Justice", institution:"Truckee Meadows CC", year:2016}];
  byId('p1').education = [{degree:"B.S. Criminal Justice", institution:"University of Nevada, Reno", year:2008}];
  byId('p1').medical.vaccinations = [
    {name:"Hepatitis B", date: fmt(addDays(today,-800)), expirationDate: null, notes:"3-dose series complete"},
    {name:"Influenza (Annual)", date: fmt(addDays(today,-200)), expirationDate: fmt(addDays(today,165)), notes:""},
  ];
  byId('p6').medical.vaccinations = [
    {name:"Influenza (Annual)", date: fmt(addDays(today,-380)), expirationDate: fmt(addDays(today,-15)), notes:"Overdue for renewal"},
  ];
  byId('p6').medical.injuryHistory = [{date: fmt(addDays(today,-500)), description:"Shoulder strain during defensive tactics training.", notes:"Cleared for full duty after 3 weeks light duty."}];
  byId('p3').medical.exposureHistory = [{date: fmt(addDays(today,-90)), type:"Bloodborne Pathogen Exposure", notes:"Exposure during arrest; follow-up bloodwork clear."}];
  return records;
}

function seedDisciplinary(){
  const today = new Date();
  return [
    {id:"disc1", personId:"p6", type:"Written Reprimand", startDateTime: fmt(addDays(today,-120))+"T09:00", endDateTime: fmt(addDays(today,-120))+"T09:30",
      status:"Closed", rank:"Officer", evaluationDates:[fmt(addDays(today,-60))], history:["Issued for policy violation regarding vehicle pursuit procedure.","30-day follow-up review completed, no recurrence."], notes:"Follow-up review clean."},
    {id:"disc2", personId:"p3", type:"Verbal Warning", startDateTime: fmt(addDays(today,-20))+"T14:00", endDateTime: fmt(addDays(today,-20))+"T14:15",
      status:"Active", rank:"Officer", evaluationDates:[fmt(addDays(today,10))], history:["Verbal counseling regarding tardiness."], notes:""},
    {id:"disc3", personId:"p4", type:"Suspension (Unpaid)", startDateTime: fmt(addDays(today,5))+"T00:00", endDateTime: fmt(addDays(today,8))+"T23:59",
      status:"Pending", rank:"Officer", evaluationDates:[], history:["Pending IA review completion before suspension is served."], notes:"Awaiting union representative sign-off."},
  ];
}

function seedInquiries(){
  const today = new Date();
  return [
    {id:"inq1", personId:"p6", category:"Use of Force", date: fmt(addDays(today,-200)), caseRef:"UOF-2025-0114", summary:"Taser deployment during resisting-arrest incident.", outcome:"Within policy"},
    {id:"inq2", personId:"p4", category:"Vehicle Pursuit", date: fmt(addDays(today,-45)), caseRef:"PUR-2026-0022", summary:"Pursuit terminated per policy after speeds exceeded threshold.", outcome:"Within policy"},
    {id:"inq3", personId:"p3", category:"Citizen Complaint", date: fmt(addDays(today,-15)), caseRef:"CC-2026-0057", summary:"Complaint regarding tone during traffic stop.", outcome:"Under review"},
    {id:"inq4", personId:"p2", category:"Vehicle Crash", date: fmt(addDays(today,-300)), caseRef:"CR-2025-0301", summary:"Minor at-fault collision with patrol vehicle, no injuries.", outcome:"Remedial driving training assigned"},
  ];
}

function seedTrainingCourses(){
  return [
    {id:"crs1", name:"Annual Firearms Qualification", category:"Firearms", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:12},
    {id:"crs2", name:"CPR / First Aid Certification", category:"Medical / First Aid", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:24},
    {id:"crs3", name:"NCIC Certification", category:"Technology / RMS", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:24},
    {id:"crs4", name:"Defensive Tactics Refresher", category:"Defensive Tactics", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:12},
    {id:"crs5", name:"Emergency Vehicle Operations Course (EVOC)", category:"Driving / EVOC", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:36},
    {id:"crs6", name:"Crisis Intervention Training", category:"Specialty / Tactical", classification:"Recommended", isRequired:false, recertRequired:false, recertIntervalMonths:null},
    {id:"crs7", name:"Supervisor Leadership Development", category:"Leadership", classification:"Recommended", isRequired:false, recertRequired:false, recertIntervalMonths:null},
    {id:"crs8", name:"Legal Update: Use of Force Case Law", category:"Legal Update", classification:"Required", isRequired:true, recertRequired:true, recertIntervalMonths:12},
  ];
}

function seedInstructors(){
  return [
    {id:"ins1", name:"Sgt. Maria Torres", bio:"Lead firearms and defensive tactics instructor.", coursesTaught:["crs1","crs4"]},
    {id:"ins2", name:"Lt. Robert Hayes", bio:"SWAT tactics and leadership development.", coursesTaught:["crs6","crs7"]},
    {id:"ins3", name:"External: Red Cross Trainer", bio:"Contracted CPR/First Aid certification provider.", coursesTaught:["crs2"]},
  ];
}

function seedTrainingRecords(){
  const today = new Date();
  const rows = [
    ["p1","crs1", -80, 4, 0, "Passed", 96, "Sgt. Maria Torres", 12],
    ["p2","crs1", -80, 4, 0, "Passed", 91, "Sgt. Maria Torres", 12],
    ["p3","crs1", -80, 4, 0, "Failed", 68, "Sgt. Maria Torres", 12],
    ["p4","crs1", -400, 4, 0, "Passed", 94, "Sgt. Maria Torres", 12],
    ["p6","crs1", -80, 4, 0, "Passed", 98, "Sgt. Maria Torres", 12],
    ["p2","crs2", -600, 8, 85, "Passed", null, "External: Red Cross Trainer", 24],
    ["p3","crs2", -600, 8, 85, "Passed", null, "External: Red Cross Trainer", 24],
    ["p1","crs3", -700, 6, 0, "Passed", null, "In-House Instructor Cadre", 24],
    ["p4","crs5", -1000, 16, 0, "Passed", null, "In-House Instructor Cadre", 36],
    ["p6","crs4", -200, 8, 0, "Passed", 90, "Sgt. Maria Torres", 12],
    ["p5","crs7", -300, 16, 250, "Passed", null, "In-House Instructor Cadre", null],
  ];
  return rows.map(([personId,courseId,daysAgo,hours,cost,result,score,provider,recertMonths],i)=>{
    const course = seedTrainingCourses().find(c=>c.id===courseId);
    const date = fmt(addDays(today, daysAgo));
    return {
      id:"tr"+(i+1), personId, courseId, date, hours, cost,
      description: course.name, narrative: "", provider, location: TRAINING_LOCATIONS[i % TRAINING_LOCATIONS.length],
      score, passed: result==="Passed", method: "In-Person", attendedStatus:"Attended",
      recertRequired: !!recertMonths, recertDate: recertMonths ? fmt(addDays(new Date(date), recertMonths*30)) : null,
      documents: [],
    };
  });
}

function seedTrainingRequests(){
  const today = new Date();
  return [
    {id:"treq1", personId:"p3", courseId:"crs6", requestDate: fmt(addDays(today,-5)), status:"Pending", notes:"Interested in CIT for patrol calls involving mental health crises."},
    {id:"treq2", personId:"p2", courseId:"crs7", requestDate: fmt(addDays(today,-30)), status:"Approved", notes:"Approved ahead of upcoming Corporal promotion board."},
  ];
}

function seedScheduleShifts(){
  return [
    {id:"shift1", name:"Patrol A - Days", daysOn:4, daysOff:3, hoursStart:"06:00", hoursEnd:"18:00"},
    {id:"shift2", name:"Patrol B - Nights", daysOn:4, daysOff:3, hoursStart:"18:00", hoursEnd:"06:00"},
    {id:"shift3", name:"Traffic - Standard", daysOn:5, daysOff:2, hoursStart:"07:00", hoursEnd:"15:00"},
    {id:"shift4", name:"SWAT - On-Call Rotation", daysOn:7, daysOff:7, hoursStart:"00:00", hoursEnd:"23:59"},
  ];
}

function seedScheduleAssignments(){
  const today = new Date();
  return [
    {id:"sa1", personId:"p2", shiftId:"shift1", unit:"Patrol - A Shift", location:"North Substation", startDate: fmt(addDays(today,-60)), endDate: null},
    {id:"sa2", personId:"p3", shiftId:"shift2", unit:"Patrol - B Shift", location:"South Substation", startDate: fmt(addDays(today,-60)), endDate: null},
    {id:"sa3", personId:"p4", shiftId:"shift3", unit:"Traffic Unit", location:"Main Fleet Garage", startDate: fmt(addDays(today,-60)), endDate: null},
    {id:"sa4", personId:"p6", shiftId:"shift4", unit:"SWAT", location:"Main Fleet Garage", startDate: fmt(addDays(today,-60)), endDate: null},
    {id:"sa5", personId:"p1", shiftId:"shift1", unit:"Patrol - A Shift", location:"North Substation", startDate: fmt(addDays(today,-60)), endDate: null},
  ];
}

/* =========================================================================
   STATE LIFECYCLE
   ========================================================================= */
function buildData(){
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
    scheduleWorkGroups: [
      {id:"wg_patrol",name:"Patrol",active:true,visibility:"unit",unitNames:["Patrol"],viewerIds:[],managerIds:[]},
      {id:"wg_dispatch",name:"Dispatch",active:true,visibility:"unit",unitNames:["Dispatch"],viewerIds:[],managerIds:[]},
      {id:"wg_records",name:"Records",active:true,visibility:"unit",unitNames:["Records"],viewerIds:[],managerIds:[]},
      {id:"wg_investigations",name:"Investigations",active:true,visibility:"unit",unitNames:["Investigations","Detectives"],viewerIds:[],managerIds:[]}
    ],
    scheduleShifts: seedScheduleShifts().map(s=>({...s,workGroupId:"wg_patrol"})),
    scheduleAssignments: seedScheduleAssignments(),
    scheduleCoverages: [],
    overtimeOpportunities: [],
    specialEvents: [],
    otCallbackOptIns: ["p2","p3","p6"],
    schedulingSettings: { fatigueThresholdHours: 16 },
    bidCycles: [],
    extraDutyJobs: seedExtraDutyJobs(),
    extraDutySignups: [],
    rollCalls: [],
    refData: defaultRefData(),
    notifications: [],
    notifySettings: { disciplinaryExpiringRoleId:"role_admin", trainingExpiringRoleId:"role_admin", medicalDueRoleId:"role_admin" },
    activity: [],
    dashboardPrefs: {}, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
  };
}

function seedExtraDutyJobs(){
  const today = new Date();
  return [
    {id:"ed1", employer:"Reno Events Center", description:"Stadium security detail - concert", location:"Reno Events Center, 400 N Center St",
      date: fmt(addDays(today,12)), startTime:"17:00", endTime:"23:30", slots:4, hourlyRate:55,
      notes:"Marked patrol vehicle requested at main entrance. Coordinate with venue security supervisor on arrival.", status:"open"},
  ];
}


function seedTrainingSessions(){
  const today = new Date();
  const defs = [
    // [courseId, instructorId, location, daysFromToday, startTime, endTime, capacity, status, attendeePersonIds, rollCallStatuses]
    ["crs1","ins1","In-House Range", -80, "08:00","12:00", 20, "Completed", ["p1","p2","p3","p4","p6"], ["Attended","Attended","No-Show","Attended","Attended"]],
    ["crs4","ins1","In-House Range", -14, "13:00","17:00", 16, "Completed", ["p6"], ["Attended"]],
    ["crs6","ins2","Regional Training Academy", 10, "08:00","16:00", 24, "Scheduled", ["p2"], ["Confirmed"]],
    ["crs7","ins2","Off-Site Vendor Facility", 21, "09:00","15:00", 12, "Scheduled", ["p5"], ["Enrolled"]],
    ["crs2","ins3","Online / LMS", 5, "10:00","14:00", 30, "Scheduled", [], []],
    ["crs8","ins2","Main Fleet Garage Classroom", -3, "09:00","11:00", 40, "Completed", ["p1","p2","p3","p4","p5","p6"], ["Attended","Attended","Attended","Excused","Attended","Attended"]],
    ["crs1","ins1","In-House Range", 45, "08:00","12:00", 20, "Scheduled", [], []],
  ];
  return defs.map(([courseId,instructorId,location,daysFromToday,startTime,endTime,capacity,status,attendees,rollCall],i)=>({
    id:"sess"+(i+1), courseId, instructorId, location,
    date: fmt(addDays(today, daysFromToday)), startTime, endTime, capacity, status, notes:"",
    roster: attendees.map((personId,j)=>({personId, status: rollCall[j]||"Enrolled", requestId:null})),
  }));
}


function migrateData(){
  if(!STATE.pm.refData) STATE.pm.refData = defaultRefData();
  if(!STATE.pm.notifications) STATE.pm.notifications = [];
  if(!STATE.pm.dashboardPrefs) STATE.pm.dashboardPrefs = {};
  if(!STATE.pm.personnelSettings) STATE.pm.personnelSettings = { authorizedStaffingEnabled:false, authorizedPositionsByUnit:{} };
  if(STATE.pm.personnelSettings.authorizedStaffingEnabled===undefined) STATE.pm.personnelSettings.authorizedStaffingEnabled=false;
  if(!STATE.pm.personnelSettings.authorizedPositionsByUnit) STATE.pm.personnelSettings.authorizedPositionsByUnit={};
  if(!STATE.pm.notifySettings) STATE.pm.notifySettings = { disciplinaryExpiringRoleId: STATE.roles[0].id, trainingExpiringRoleId: STATE.roles[0].id, medicalDueRoleId: STATE.roles[0].id };
  if(!STATE.pm.inquiries) STATE.pm.inquiries = [];
  if(!STATE.pm.trainingRequests) STATE.pm.trainingRequests = [];
  if(!STATE.pm.trainingSessions) STATE.pm.trainingSessions = [];
  if(!STATE.pm.trainingCheckins) STATE.pm.trainingCheckins = [];
  STATE.pm.trainingRequests.forEach(r=>{
    if(r.sessionId===undefined) r.sessionId = null;
    if(r.reviewedBy===undefined) r.reviewedBy = null;
    if(r.reviewDate===undefined) r.reviewDate = null;
    if(r.reviewNotes===undefined) r.reviewNotes = "";
  });
  STATE.pm.trainingSessions.forEach(s=>{
    if(!s.roster) s.roster = [];
    if(s.capacity===undefined) s.capacity = null;
    if(s.notes===undefined) s.notes = "";
    if(s.address===undefined) s.address = "";
  });
  if(STATE.pm.refData && Array.isArray(STATE.pm.refData.trainingLocations) && STATE.pm.refData.trainingLocations.some(l=>typeof l === 'string')){
    // Pre-existing tenants had training locations as plain strings; upgrade in place to
    // {name,address} objects (address starts blank, an admin fills it in once) without losing
    // any location already in use by a session or training record, which still match on name.
    STATE.pm.refData.trainingLocations = STATE.pm.refData.trainingLocations.map(l=>typeof l==='string' ? {name:l, address:''} : l);
  }
  if(!STATE.pm.instructors) STATE.pm.instructors = [];
  if(!STATE.pm.scheduleWorkGroups) STATE.pm.scheduleWorkGroups = [{id:"wg_patrol",name:"Patrol",active:true,visibility:"unit",unitNames:["Patrol"],viewerIds:[],managerIds:[]}];
  STATE.pm.scheduleWorkGroups.forEach(g=>{if(!g.visibility)g.visibility='unit';if(!Array.isArray(g.unitNames))g.unitNames=[g.name];if(!Array.isArray(g.viewerIds))g.viewerIds=[];if(!Array.isArray(g.managerIds))g.managerIds=[];});
  if(!STATE.pm.scheduleShifts) STATE.pm.scheduleShifts = [];
  STATE.pm.scheduleShifts.forEach(s=>{ if(!s.workGroupId) s.workGroupId="wg_patrol"; });
  if(!STATE.pm.scheduleAssignments) STATE.pm.scheduleAssignments = [];
  if(!STATE.pm.overtimeOpportunities) STATE.pm.overtimeOpportunities = [];
  if(!STATE.pm.specialEvents) STATE.pm.specialEvents = [];
  if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
  if(!STATE.pm.shiftSwapRequests) STATE.pm.shiftSwapRequests = [];
  if(!STATE.pm.scheduleCoverages) STATE.pm.scheduleCoverages = [];
  if(!STATE.pm.otCallbackOptIns) STATE.pm.otCallbackOptIns = [];
  if(!STATE.pm.bidCycles) STATE.pm.bidCycles = [];
  if(!STATE.pm.extraDutyJobs) STATE.pm.extraDutyJobs = [];
  if(!STATE.pm.extraDutySignups) STATE.pm.extraDutySignups = [];
  if(!STATE.pm.rollCalls) STATE.pm.rollCalls = [];
  if(!STATE.pm.schedulingSettings) STATE.pm.schedulingSettings = { fatigueThresholdHours: 16 };
  if(STATE.pm.schedulingSettings.fatigueThresholdHours===undefined) STATE.pm.schedulingSettings.fatigueThresholdHours = 16;
  STATE.pm.bidCycles.forEach(c=>{
    if(!c.submissions) c.submissions = [];
    if(!c.awards) c.awards = [];
    if(c.status===undefined) c.status = 'open';
  });
  STATE.pm.extraDutyJobs.forEach(j=>{ if(j.status===undefined) j.status = 'open'; });
  STATE.pm.extraDutySignups.forEach(s=>{ if(s.status===undefined) s.status = 'pending'; });
  STATE.pm.rollCalls.forEach(rc=>{ if(!rc.entries) rc.entries = []; if(rc.briefingNotes===undefined) rc.briefingNotes = ''; });
  STATE.pm.records.forEach(r=>{
    if(!r.medical) r.medical = emptyMedical();
    if(!r.lodd) r.lodd = emptyLodd();
    if(!r.documents) r.documents = [];
    if(!r.fieldHistory) r.fieldHistory = [];
    if(!r.education) r.education = [];
    if(!r.supervisorIds) r.supervisorIds = [];
    if(!r.specialSkills) r.specialSkills = [];
    if(!r.promotionHistory) r.promotionHistory = [];
    if(r.terminationDate===undefined) r.terminationDate = null;
  });
}

function logActivity(text, entityType, entityId){
  STATE.pm.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('Personnel', text, entityType);
}

function recordFor(personId){ return STATE.pm.records.find(r=>r.personId===personId); }
function ensureRecord(personId){
  let r = recordFor(personId);
  if(!r){
    r = { personId, agency: STATE.pm.refData.agencies ? STATE.pm.refData.agencies[0] : "Reno PD - Patrol Division",
      employeeId:"", unitId:"", driversLicense:{number:"",licenseClass:"",state:"",expiration:""},
      hireDate:"", terminationDate:null, promotionHistory:[], bloodType:"Unknown", phones:[], address:{street:"",city:"",state:"",zip:""},
      sex:"Undisclosed", race:"Undisclosed", maritalStatus:"Undisclosed", rank:"", badgeNumber:"", employmentStatus:"Active",
      specialSkills:[], assignment:"", medical: emptyMedical(), lodd: emptyLodd(), supervisorIds:[], education:[], swornDate:"",
      photoDataUrl:null, documents:[], fieldHistory:[] };
    STATE.pm.records.push(r);
  }
  return r;
}
/* records a before/after change for the audit trail on the record itself */
function recordFieldChange(record, field, oldVal, newVal){
  if(JSON.stringify(oldVal)===JSON.stringify(newVal)) return;
  record.fieldHistory.push({
    date: fmt(new Date()), field, before: oldVal, after: newVal,
    changedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System',
  });
}

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  {id:"pm-dashboard", label:"Dashboard", icon:"dashboard", title:"Dashboard", sub:"Workforce status at a glance", requiredAbility:null},
  {id:"pm-records", label:"Personnel Records", icon:"idcard", title:"Personnel Records", sub:"Complete HR record for every employee", requiredAbility:"pm_records_view"},
  {id:"pm-disciplinary", label:"Disciplinary", icon:"alert", title:"Disciplinary Actions", sub:"Track disciplinary actions and pending expirations", requiredAbility:"pm_discipline_view"},
  {id:"pm-training", label:"Training", icon:"award", title:"Training & Certifications", sub:"Courses, records, requests, and instructors", requiredAbility:["pm_training_view_own","pm_training_manage","pm_training_request","pm_instructor_manage"]},
  {id:"pm-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Configurable reporting across the personnel record", requiredAbility:"pm_reports_view"},
  {id:"pm-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Reference data and the system audit log", requiredAbility:["pm_admin_categories","pm_admin_audit"]},
];
const SCHEDULING_NAV_ITEMS = [
  {id:'sched-dashboard',label:'Dashboard',icon:'calendar',title:'Scheduling',sub:'Calendars, staffing, court conflicts, and duty assignments',requiredAbility:null},
  {id:"pm-scheduling", label:"Scheduling", icon:"calendar", title:"Scheduling & Duty Roster", sub:"Shift patterns, coverage, bidding, extra duty, and roll call", requiredAbility:["pm_schedule_view","pm_overtime_view","pm_bidding_view","pm_extraduty_view","pm_rollcall_view","pm_leave_request_submit","pm_leave_request_approve"]},
  {id:'sched-settings',label:'Administration',icon:'gear',title:'Scheduling Administration',sub:'Time off codes and scheduling settings',requiredAbility:'pm_admin_categories'},
];
let ACTIVE_VIEW = "pm-dashboard";

function navItemVisible(item){
  const schedulingItem = SCHEDULING_NAV_ITEMS.some(n=>n.id===item?.id);
  if(schedulingItem ? !schedulingModuleAccess() : !can('module_personnel')) return false;
  if(!item) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}
function renderNav(){ document.getElementById('navlist').innerHTML=''; }
function switchView(id){
  if(id==='sched-dashboard') id='pm-scheduling';
  const target = [...NAV_ITEMS,...SCHEDULING_NAV_ITEMS].find(n=>n.id===id);
  if(!target || !navItemVisible(target)) return;
  if(!SuiteUX.beforeView(id)) return;
  ACTIVE_VIEW = id;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  const meta = target;
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-sub').textContent = meta.sub;
  renderNav();
  renderView(id);
  if(id!=="pm-dashboard" && id!=="sched-dashboard" && id!=="pm-scheduling" && id!=="sched-settings"){
    const root=document.getElementById('view-'+id);
    if(root && !root.querySelector('[data-module-dashboard-back]')){
      const back=document.createElement('button'); back.type='button'; back.className='btn btn-outline'; back.dataset.moduleDashboardBack='1';
      back.innerHTML='&#8592; Back to Dashboard'; back.style.marginBottom='16px'; back.onclick=()=>switchView(SCHEDULING_NAV_ITEMS.some(n=>n.id===id)?'sched-dashboard':'pm-dashboard'); root.prepend(back);
    }
  }
}
function renderView(id){
  if(id==='sched-dashboard') renderSchedulingDashboard();
  else if(id==='sched-settings') renderSchedulingAdministration();
  else if(id==="pm-dashboard") renderDashboard();
  else if(id==="pm-records") renderRecords();
  else if(id==="pm-disciplinary") renderDisciplinary();
  else if(id==="pm-training") renderTraining();
  else if(id==="pm-scheduling") renderScheduling();
  else if(id==="pm-reports") renderReports();
  else if(id==="pm-admin") renderAdmin();
}

/* =========================================================================
   NOTIFICATIONS: disciplinary evaluation dates, cert/training expirations, medical
   ========================================================================= */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  STATE.pm.disciplinaryActions.forEach(d=>{
    if(d.status!=="Closed"){
      d.evaluationDates.forEach(ed=>{
        const days = daysBetween(fmt(today), ed);
        if(days<=14){
          upcoming.push({type:"discipline_eval", entityId:d.id, message:`${personName(d.personId)}'s ${d.type} evaluation ${days<0?'was due '+Math.abs(days)+' days ago':'is due in '+days+' days'} (${ed}).`, recipientRoleId: STATE.pm.notifySettings.disciplinaryExpiringRoleId});
        }
      });
    }
  });
  STATE.pm.trainingRecords.forEach(t=>{
    if(t.recertRequired && t.recertDate){
      const days = daysBetween(fmt(today), t.recertDate);
      if(days<=30){
        upcoming.push({type:"training_expiring", entityId:t.id, message:`${personName(t.personId)}'s "${t.description}" recertification ${days<0?'expired '+Math.abs(days)+' days ago':'is due in '+days+' days'} (${t.recertDate}).`, recipientRoleId: STATE.pm.notifySettings.trainingExpiringRoleId});
      }
    }
  });
  STATE.pm.records.forEach(r=>{
    (r.medical.vaccinations||[]).forEach(v=>{
      if(v.expirationDate){
        const days = daysBetween(fmt(today), v.expirationDate);
        if(days<=30){
          upcoming.push({type:"medical_due", entityId:r.personId, message:`${personName(r.personId)}'s ${v.name} ${days<0?'expired '+Math.abs(days)+' days ago':'is due in '+days+' days'} (${v.expirationDate}).`, recipientRoleId: STATE.pm.notifySettings.medicalDueRoleId});
        }
      }
    });
    if(r.driversLicense && r.driversLicense.expiration){
      const days = daysBetween(fmt(today), r.driversLicense.expiration);
      if(days<=30){
        upcoming.push({type:"medical_due", entityId:r.personId, message:`${personName(r.personId)}'s driver's license ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'} (${r.driversLicense.expiration}).`, recipientRoleId: STATE.pm.notifySettings.medicalDueRoleId});
      }
    }
  });
  const prevReadBy = {};
  STATE.pm.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.pm.notifications = upcoming.map(n=>({
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
function statusBadgeClass(status){
  return {
    "Active":"badge-available","On Leave":"badge-assigned","Suspended":"badge-missing","Terminated":"badge-missing","Retired":"badge-role",
    "Closed":"badge-available","Pending":"badge-assigned","Passed":"badge-available","Failed":"badge-missing","Approved":"badge-available","Denied":"badge-missing",
  }[status] || "badge-role";
}
function recordLink(personId){
  return `<a href="#" data-open-record="${personId}" class="record-link">${escapeHtml(personName(personId))}</a>`;
}
function wireRecordLinks(){
  document.querySelectorAll('[data-open-record]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openRecordDetail(a.dataset.openRecord); }));
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
const TOP_WIDGETS = [
  {id:"stat_active_personnel", label:"Active Personnel"},
  {id:"stat_open_discipline", label:"Open Disciplinary Actions"},
  {id:"stat_certs_expiring", label:"Certifications Expiring Soon"},
  {id:"stat_pending_training", label:"Pending Training Requests"},
];
const EXTRA_WIDGETS = [
  {id:"list_discipline_due", label:"Disciplinary Evaluations Due", defaultSize:"half"},
  {id:"list_certs_due", label:"Certifications / Recert Due", defaultSize:"half"},
  {id:"chart_inquiries_by_category", label:"RMS-Data Inquiries by Category", defaultSize:"full"},
];
const DEFAULT_EXTRAS = EXTRA_WIDGETS.map(w=>({id:w.id, size:w.defaultSize}));
let CHART_REFS_PM = {};
function destroyChartsPm(){ Object.values(CHART_REFS_PM).forEach(c=>c && c.destroy()); CHART_REFS_PM = {}; }
function myWidgetPrefs(){
  let p = STATE.pm.dashboardPrefs[CURRENT_USER_ID];
  const topIds = TOP_WIDGETS.map(w=>w.id), extraIds = EXTRA_WIDGETS.map(w=>w.id);
  if(!p || (!p.topOrder && !p.extras)){
    p = { topOrder:[...topIds], extras: DEFAULT_EXTRAS.map(e=>({...e})) };
    STATE.pm.dashboardPrefs[CURRENT_USER_ID] = p;
  }
  if(!Array.isArray(p.topOrder)) p.topOrder = [...topIds];
  if(!Array.isArray(p.extras)) p.extras = [];
  p.topOrder = [...p.topOrder.filter(id=>topIds.includes(id)), ...topIds.filter(id=>!p.topOrder.includes(id))];
  p.extras = p.extras.filter(e=>e && extraIds.includes(e.id));
  return p;
}
function renderWidget(id){
  const records = STATE.pm.records;
  if(id==='stat_active_personnel'){
    const active = records.filter(r=>r.employmentStatus==="Active").length;
    const onLeave = records.filter(r=>r.employmentStatus==="On Leave").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="pm-records"><div class="label">Active Personnel</div><div class="value">${active}</div><div class="delta neutral">${onLeave} on leave</div></button>`;
  }
  if(id==='stat_open_discipline'){
    const openDiscipline = STATE.pm.disciplinaryActions.filter(d=>d.status!=="Closed").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="pm-disciplinary"><div class="label">Open Disciplinary Actions</div><div class="value" style="color:${openDiscipline?'var(--red)':'var(--navy)'}">${openDiscipline}</div><div class="delta ${openDiscipline?'warn':'ok'}">${openDiscipline?'Needs review':'All clear'}</div></button>`;
  }
  if(id==='stat_certs_expiring'){
    const trainingExpiring = STATE.pm.notifications.filter(n=>n.type==="training_expiring").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="pm-training"><div class="label">Certifications Expiring Soon</div><div class="value" style="color:${trainingExpiring?'var(--red)':'var(--navy)'}">${trainingExpiring}</div><div class="delta ${trainingExpiring?'warn':'ok'}">Within 30 days</div></button>`;
  }
  if(id==='stat_pending_training'){
    const pendingRequests = STATE.pm.trainingRequests.filter(r=>r.status==="Pending").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="pm-training"><div class="label">Pending Training Requests</div><div class="value">${pendingRequests}</div><div class="delta neutral">Awaiting decision</div></button>`;
  }
  if(id==='list_discipline_due'){
    const upcomingDiscipline = STATE.pm.notifications.filter(n=>n.type==="discipline_eval").slice(0,6);
    const rows = upcomingDiscipline.map(n=>`<tr><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`).join('') || `<tr><td style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Disciplinary Evaluations Due</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='list_certs_due'){
    const upcomingTraining = STATE.pm.notifications.filter(n=>n.type==="training_expiring").slice(0,6);
    const rows = upcomingTraining.map(n=>`<tr><td style="font-size:12.5px;">${escapeHtml(n.message)}</td></tr>`).join('') || `<tr><td style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Certifications / Recert Due</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='chart_inquiries_by_category'){
    return `<div class="panel"><div class="panel-head"><h2>RMS-Data Inquiries by Category</h2><span class="hint">Early-intervention style tracking \u2014 see note in Reports</span></div><div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartInquiries"></canvas></div></div></div>`;
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
    logActivity(`Customized personal Personnel dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
    persist();
    toast("Dashboard saved.");
    closeModal();
    renderDashboard();
  };
}
function renderDashboard(){
  recalcNotifications();
  const root=document.getElementById('view-pm-dashboard'),records=STATE.pm.records,active=records.filter(r=>r.employmentStatus==='Active'),onLeave=records.filter(r=>r.employmentStatus==='On Leave').length;
  const settings=STATE.pm.personnelSettings||(STATE.pm.personnelSettings={authorizedStaffingEnabled:false,authorizedPositionsByUnit:{}});
  const unitCounts={};active.forEach(r=>{if(r.unitId)unitCounts[r.unitId]=(unitCounts[r.unitId]||0)+1;});
  const unassigned=active.filter(r=>!r.unitId||!String(r.unitId).trim()).length;
  const expiring=STATE.pm.notifications.filter(n=>n.type==='training_expiring'||n.type==='medical_due');
  const staffingRows=STATE.pm.refData.units.map(u=>({unit:u,assigned:unitCounts[u]||0,authorized:settings.authorizedPositionsByUnit[u]}));
  const vacancyCount=staffingRows.reduce((n,x)=>x.authorized==null||x.authorized===''?n:n+Math.max(0,Number(x.authorized)-x.assigned),0);
  const hub=[
    ['pm-records','Personnel','users','Manage employee profiles, contact information, and employment data','#4D8DFF'],
    ['pm-admin','Units & Organization','organization','Units, divisions, teams, command structure, and staffing','#43D59B'],
    ['pm-records','Assignments','idcard','Current assignments, supervisors, ranks, and positions','#D94DFF'],
    ['pm-training','Qualifications','award','Certifications, training, skills, and expiration tracking','#FF9F43'],
    ...(settings.authorizedStaffingEnabled?[['pm-admin','Positions & Vacancies','organization','Authorized positions, assigned staffing, vacancies, and overages','#20C7D9']]:[]),
    ['pm-reports','Reports','chart','Staffing, personnel, and qualification analytics','#4D8DFF'],
    ['pm-admin','Admin','gear','Ranks, titles, units, statuses, employment types, and configuration','#9AAAC0']
  ].filter(x=>navItemVisible(NAV_ITEMS.find(n=>n.id===x[0])));
  const attention=[
    [expiring.filter(n=>n.type==='training_expiring').length,'Qualifications expiring (next 30 days)','alert'],
    [unassigned,'Unassigned personnel','users'],
    [STATE.pm.trainingRequests.filter(r=>r.status==='Pending').length,'Training requests awaiting decision','award'],
    [STATE.pm.disciplinaryActions.filter(d=>d.status!=='Closed').length,'Open disciplinary actions','alert']
  ];
  const recent=(STATE.pm.activity||[]).slice().reverse().slice(0,5);
  root.innerHTML=`
  <style>
    #view-pm-dashboard .pm-hub{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;margin-bottom:16px}.pm-hub-card{grid-column:span 3;min-height:155px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--panel);text-align:left;color:inherit;font-family:inherit;cursor:pointer;transition:.15s}.pm-hub-card:hover{transform:translateY(-2px);border-color:var(--blue);background:var(--lightgray)}.pm-hub-icon{width:31px;height:31px;margin-bottom:13px;filter:drop-shadow(0 0 8px currentColor)}.pm-hub-title{font-size:16px;font-weight:800;color:var(--heading);margin-bottom:7px}.pm-hub-sub{font-size:12.5px;line-height:1.45;color:var(--text-dim)}
    .pm-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}.pm-kpi{border:1px solid var(--border);border-radius:12px;background:var(--panel);padding:18px 20px}.pm-kpi-label{font-size:12px;color:var(--text-dim);display:flex;gap:8px;align-items:center}.pm-kpi-label svg{width:18px;height:18px}.pm-kpi-value{font-size:28px;font-weight:800;color:var(--heading);margin:7px 0}.pm-kpi-sub{font-size:11.5px;color:var(--text-dim)}
    .pm-two{display:grid;grid-template-columns:1.15fr .85fr;gap:14px;margin-bottom:14px}.pm-panel{border:1px solid var(--border);border-radius:12px;background:var(--panel);overflow:hidden}.pm-panel-head{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border);font-weight:800;color:var(--heading)}.pm-panel-body{padding:16px 18px}.pm-unit-row{display:grid;grid-template-columns:minmax(130px,1fr) 3fr auto;gap:12px;align-items:center;margin:9px 0;font-size:12px}.pm-unit-bar{height:9px;border-radius:8px;background:var(--lightgray);overflow:hidden}.pm-unit-fill{height:100%;background:var(--blue);border-radius:8px}.pm-attention-row{display:grid;grid-template-columns:22px 1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:12.5px}.pm-attention-row svg{width:18px;height:18px;color:var(--gold)}
    @media(max-width:1100px){.pm-hub-card{grid-column:span 6}#view-pm-dashboard .pm-two{grid-template-columns:1fr}.pm-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.pm-hub-card{grid-column:1/-1}.pm-kpis{grid-template-columns:1fr}}
  </style>
  <div class="pm-hub">${hub.map(x=>`<button class="pm-hub-card" data-nav-dest="${x[0]}"><div class="pm-hub-icon" style="color:${x[4]}">${ICONS[x[2]]||ICONS.idcard}</div><div class="pm-hub-title">${x[1]}</div><div class="pm-hub-sub">${x[3]}</div></button>`).join('')}</div>
  <div class="pm-kpis">
    <div class="pm-kpi"><div class="pm-kpi-label">${ICONS.users} Total Staff</div><div class="pm-kpi-value">${records.length}</div><div class="pm-kpi-sub">${active.length} active personnel</div></div>
    <div class="pm-kpi"><div class="pm-kpi-label">${ICONS.check} Active Staff</div><div class="pm-kpi-value">${active.length}</div><div class="pm-kpi-sub">${onLeave} on leave</div></div>
    <div class="pm-kpi"><div class="pm-kpi-label">${ICONS.organization||ICONS.users} Unassigned</div><div class="pm-kpi-value">${unassigned}</div><div class="pm-kpi-sub">Personnel needing a unit assignment</div></div>
    <div class="pm-kpi"><div class="pm-kpi-label">${ICONS.alert} Expiring Qualifications</div><div class="pm-kpi-value">${expiring.length}</div><div class="pm-kpi-sub">Training, certifications, and credentials</div></div>
  </div>
  <div class="pm-two">
    <div class="pm-panel"><div class="pm-panel-head"><span>Staff by Unit</span><span style="color:var(--blue);font-size:12px;">${settings.authorizedStaffingEnabled?'Authorized staffing enabled':'Workforce distribution'}</span></div><div class="pm-panel-body">
      ${staffingRows.slice(0,10).map(x=>{const max=Math.max(1,...staffingRows.map(y=>y.assigned));const pct=Math.max(3,Math.round(x.assigned/max*100));const status=settings.authorizedStaffingEnabled&&x.authorized!=null?` · ${x.assigned}/${x.authorized} authorized`:'';return `<div class="pm-unit-row"><strong>${escapeHtml(x.unit)}</strong><div class="pm-unit-bar"><div class="pm-unit-fill" style="width:${pct}%"></div></div><span>${x.assigned}${status}</span></div>`;}).join('')}
    </div></div>
    <div class="pm-panel"><div class="pm-panel-head"><span>Personnel Attention Needed</span><span style="color:var(--blue);font-size:12px;">${settings.authorizedStaffingEnabled?vacancyCount+' vacancies':''}</span></div><div class="pm-panel-body">
      ${attention.map(a=>`<div class="pm-attention-row"><span>${ICONS[a[2]]||ICONS.alert}</span><span>${a[1]}</span><strong>${a[0]}</strong></div>`).join('')}
    </div></div>
  </div>
  <div class="pm-two">
    <div class="pm-panel"><div class="pm-panel-head"><span>Recent Personnel Activity</span><span></span></div><div class="pm-panel-body">${recent.length?recent.map(a=>`<div class="pm-attention-row"><span>${ICONS.history}</span><span>${escapeHtml(a.message||a.action||'Personnel activity')}</span><span>${escapeHtml(a.ts||a.date||'')}</span></div>`).join(''):'<div style="color:var(--text-dim);font-size:12px;">No recent personnel activity.</div>'}</div></div>
    <div class="pm-panel"><div class="pm-panel-head"><span>Upcoming Expirations</span><span style="color:var(--blue);font-size:12px;">Next 30 days</span></div><div class="pm-panel-body">${expiring.slice(0,5).map(n=>`<div class="pm-attention-row"><span>${ICONS.alert}</span><span>${escapeHtml(n.message)}</span><span></span></div>`).join('')||'<div style="color:var(--text-dim);font-size:12px;">No upcoming expirations.</div>'}</div></div>
  </div>`;
  root.querySelectorAll('.pm-panel').forEach(panel=>{const head=panel.querySelector('.pm-panel-head');const body=panel.querySelector('.pm-panel-body');if(!head||!body)return;const details=document.createElement('details');details.className=panel.className;details.style.cssText=panel.style.cssText;const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;list-style:none;';summary.append(head);details.append(summary,body);panel.replaceWith(details);});
  // Show operational metrics and analytics before module navigation.
  const navHub=root.querySelector('.pm-hub');
  if(navHub)root.append(navHub);
  root.querySelectorAll('[data-nav-dest]').forEach(b=>b.onclick=()=>switchView(b.dataset.navDest));
}

/* =========================================================================
   PERSONNEL RECORDS
   ========================================================================= */
let RECORDS_FILTER = {q:"", rank:"All", unit:"All", status:"All"};
let RECORDS_SORT = {key:'name', dir:'asc'};

function renderRecords(){
  const canView = can('pm_records_view');
  const canEdit = can('pm_records_edit');
  const canDelete = can('pm_records_delete');
  if(!canView){
    document.getElementById('view-pm-records').innerHTML = permissionBlockedView("You don't have permission to view personnel records in this role.");
    return;
  }
  const f = RECORDS_FILTER;
  let rows = STATE.pm.records.filter(r=>{
    const q = f.q.toLowerCase();
    const name = personName(r.personId).toLowerCase();
    const matchQ = !q || name.includes(q) || (r.badgeNumber||'').toLowerCase().includes(q) || (r.employeeId||'').toLowerCase().includes(q);
    const matchRank = f.rank==="All" || r.rank===f.rank;
    const matchUnit = f.unit==="All" || r.unitId===f.unit;
    const matchStatus = f.status==="All" || r.employmentStatus===f.status;
    return matchQ && matchRank && matchUnit && matchStatus;
  });
  const s = RECORDS_SORT;
  rows.sort((a,b)=>{
    const av = s.key==='name' ? personName(a.personId).toLowerCase() : String(a[s.key]||'').toLowerCase();
    const bv = s.key==='name' ? personName(b.personId).toLowerCase() : String(b[s.key]||'').toLowerCase();
    if(av<bv) return s.dir==='asc'?-1:1; if(av>bv) return s.dir==='asc'?1:-1; return 0;
  });

  const trs = rows.map(r=>`
    <tr>
      <td>${r.photoDataUrl ? `<img src="${r.photoDataUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;vertical-align:middle;">` : `<div style="width:32px;height:32px;border-radius:50%;background:var(--lightgray);display:inline-flex;align-items:center;justify-content:center;color:var(--text-dim);vertical-align:middle;">${ICONS.idcard}</div>`}</td>
      <td>${recordLink(r.personId)}</td>
      <td class="mono">${escapeHtml(r.badgeNumber)}</td>
      <td>${escapeHtml(r.rank)}</td>
      <td>${escapeHtml(r.unitId)}</td>
      <td><span class="badge ${statusBadgeClass(r.employmentStatus)}">${r.employmentStatus}</span></td>
      <td>${r.hireDate||'—'}</td>
      <td>
        <div class="cell-actions">
          ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-record="${r.personId}">${ICONS.edit} Edit</button>` : ''}
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-record="${r.personId}">${ICONS.trash} Delete</button>` : ''}
        </div>
      </td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No records match this filter.</td></tr>`;

  document.getElementById('view-pm-records').innerHTML = `
    ${!canEdit ? lockedNote("You're viewing personnel records in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="recSearch" title="Filters the roster below as you type, matching name, badge number, or employee ID" placeholder="Search name, badge, employee ID..." style="width:230px;" value="${escapeHtml(f.q)}">
        <select id="recRank" title="Filter personnel records to a single rank"><option ${f.rank==='All'?'selected':''}>All</option>${STATE.pm.refData.ranks.map(r=>`<option ${f.rank===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select>
        <select id="recUnit" title="Filter personnel records to a single unit"><option ${f.unit==='All'?'selected':''}>All</option>${STATE.pm.refData.units.map(u=>`<option ${f.unit===u?'selected':''}>${escapeHtml(u)}</option>`).join('')}</select>
        <select id="recStatus" title="Filter personnel records to a single employment status"><option ${f.status==='All'?'selected':''}>All</option>${STATE.pm.refData.employmentStatuses.map(st=>`<option ${f.status===st?'selected':''}>${escapeHtml(st)}</option>`).join('')}</select>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="btnAddRecord">${ICONS.plus} Add Personnel Record</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr>
          <th></th>${sortHeaderHtmlPm(fieldLabel('pm.name'),'name')}${sortHeaderHtmlPm(fieldLabel('pm.badgeNumber'),'badgeNumber')}${sortHeaderHtmlPm(fieldLabel('pm.rank'),'rank')}${sortHeaderHtmlPm(fieldLabel('pm.unit'),'unitId')}${sortHeaderHtmlPm(fieldLabel('pm.employmentStatus'),'employmentStatus')}${sortHeaderHtmlPm(fieldLabel('pm.hireDate'),'hireDate')}<th>Actions</th>
        </tr></thead><tbody>${trs}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Showing ${rows.length} of ${STATE.pm.records.length} personnel records &bull; click a name for the full record</div>
  `;
  ['recSearch'].forEach(id=>document.getElementById(id).addEventListener('input', e=>{RECORDS_FILTER.q=e.target.value; renderRecords(); refocusFilterInput('recSearch');}));
  document.getElementById('recRank').addEventListener('change', e=>{RECORDS_FILTER.rank=e.target.value; renderRecords();});
  document.getElementById('recUnit').addEventListener('change', e=>{RECORDS_FILTER.unit=e.target.value; renderRecords();});
  document.getElementById('recStatus').addEventListener('change', e=>{RECORDS_FILTER.status=e.target.value; renderRecords();});
  const addBtn = document.getElementById('btnAddRecord');
  if(addBtn) addBtn.addEventListener('click', ()=>openAddPersonWithRecordModal());
  document.querySelectorAll('[data-edit-record]').forEach(b=>b.addEventListener('click', ()=>openRecordEditModal(b.dataset.editRecord)));
  document.querySelectorAll('[data-del-record]').forEach(b=>b.addEventListener('click', ()=>deleteRecord(b.dataset.delRecord)));
  wireRecordLinks();
}
function sortHeaderHtmlPm(label, key){
  const s = RECORDS_SORT;
  const active = s.key===key;
  const arrow = active ? (s.dir==='asc' ? '&#9650;' : '&#9660;') : '&#8597;';
  return `<th class="sortable ${active?'sort-active':''}" data-sort-key="${key}">${label}<span class="arrow">${arrow}</span></th>`;
}
document.addEventListener('click', (e)=>{
  const th = e.target.closest && e.target.closest('[data-sort-key]');
  if(th && document.getElementById('view-pm-records') && document.getElementById('view-pm-records').contains(th)){
    const key = th.dataset.sortKey;
    if(RECORDS_SORT.key===key) RECORDS_SORT.dir = RECORDS_SORT.dir==='asc'?'desc':'asc';
    else { RECORDS_SORT.key = key; RECORDS_SORT.dir = 'asc'; }
    renderRecords();
  }
});

function openAddPersonWithRecordModal(){
  document.getElementById('modalBox').className = 'modal';
  const unlinked = STATE.personnel.filter(p=>!recordFor(p.id));
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Personnel Record</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="display:flex;gap:16px;margin-bottom:14px;">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="fRecMode" value="existing" checked style="width:auto;"> Link an existing person</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="fRecMode" value="new" style="width:auto;"> Add a brand-new person</label>
      </div>
      <div id="fRecExistingFields">
        <div class="form-row"><label>Person</label>
          <select id="fRecPerson">${unlinked.length ? unlinked.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') : `<option value="">-- everyone already has a record --</option>`}</select>
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
      <button class="btn btn-primary" id="mNext" ${unlinked.length?'':'disabled'}>Continue</button>
    </div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[name="fRecMode"]').forEach(radio=>radio.addEventListener('change', ()=>{
    const isNew = document.querySelector('[name="fRecMode"]:checked').value==='new';
    document.getElementById('fRecExistingFields').style.display = isNew ? 'none' : '';
    document.getElementById('fRecNewFields').style.display = isNew ? '' : 'none';
    document.getElementById('mNext').disabled = isNew ? false : !unlinked.length;
  }));
  document.getElementById('mNext').onclick = ()=>{
    const isNew = document.querySelector('[name="fRecMode"]:checked').value==='new';
    if(isNew){
      const firstName = document.getElementById('fRecFirstName').value.trim();
      const lastName = document.getElementById('fRecLastName').value.trim();
      if(!firstName || !lastName){ toast("Enter a first and last name.", true); return; }
      const {person} = createPersonAndRecord({
        name: `${firstName} ${lastName}`, badge: document.getElementById('fRecBadge').value.trim(),
        email: document.getElementById('fRecEmail').value.trim(), unit: document.getElementById('fRecUnit').value.trim(),
        roleIds: ['role_officer'],
      });
      logAuditEntry('Shared', `Added new personnel record for "${person.name}" from Personnel Administration.`, 'personnel');
      openRecordEditModal(person.id);
      return;
    }
    const personId = document.getElementById('fRecPerson').value;
    if(!personId) return;
    ensureRecord(personId);
    openRecordEditModal(personId);
  };
}

function openRecordEditModal(personId){
  const r = ensureRecord(personId);
  const before = JSON.parse(JSON.stringify(r));
  let pendingPhoto = r.photoDataUrl || null;
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Personnel Record — ${escapeHtml(personName(personId))}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${photoDropZoneHtml('fPmPhoto', r.photoDataUrl, {label:'Photo', round:true, placeholderIcon:ICONS.idcard})}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Employment</h2></div><div class="panel-body">
        <div class="form-2col">
          <div class="form-row"><label>Agency</label><select id="fAgencyPm">${STATE.pm.refData.agencies.map(a=>`<option ${r.agency===a?'selected':''}>${escapeHtml(a)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Employee ID</label><input type="text" id="fEmployeeId" value="${escapeHtml(r.employeeId||'')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Unit / Assignment ID</label><select id="fUnitId">${STATE.pm.refData.units.map(u=>`<option ${r.unitId===u?'selected':''}>${escapeHtml(u)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Current Assignment (free text)</label><input type="text" id="fAssignment" value="${escapeHtml(r.assignment||'')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Rank</label><select id="fRank">${STATE.pm.refData.ranks.map(rk=>`<option ${r.rank===rk?'selected':''}>${escapeHtml(rk)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Badge Number</label><input type="text" id="fBadgeNum" value="${escapeHtml(r.badgeNumber||'')}"></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Employment Status</label><select id="fEmpStatus">${STATE.pm.refData.employmentStatuses.map(st=>`<option ${r.employmentStatus===st?'selected':''}>${escapeHtml(st)}</option>`).join('')}</select></div>
          <div class="form-row"><label>Supervisor(s)</label>
            <div style="border:1px solid var(--border);border-radius:5px;padding:6px 10px;max-height:100px;overflow-y:auto;">
              ${STATE.personnel.filter(p=>p.id!==personId).map(p=>`<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;padding:2px 0;"><input type="checkbox" class="fSupervisor" value="${p.id}" ${r.supervisorIds.includes(p.id)?'checked':''} style="width:auto;">${escapeHtml(p.name)}</label>`).join('')}
            </div>
          </div>
        </div>
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>Hire Date</label><input type="date" id="fHireDate" value="${r.hireDate||''}"></div>
          <div class="form-row"><label>Sworn Date</label><input type="date" id="fSwornDate" value="${r.swornDate||''}"></div>
          <div class="form-row"><label>Termination / Separation Date</label><input type="date" id="fTermDate" value="${r.terminationDate||''}"></div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Identity &amp; Demographics</h2></div><div class="panel-body">
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>Sex</label><select id="fSex">${SEX_OPTIONS.map(o=>`<option ${r.sex===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Race</label><select id="fRace">${RACE_OPTIONS.map(o=>`<option ${r.race===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Marital Status</label><select id="fMarital">${MARITAL_OPTIONS.map(o=>`<option ${r.maritalStatus===o?'selected':''}>${o}</option>`).join('')}</select></div>
        </div>
        <div class="form-2col">
          <div class="form-row"><label>Blood Type</label><select id="fBloodType">${BLOOD_TYPES.map(o=>`<option ${r.bloodType===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div class="form-row"><label>Phone Number</label><input type="text" id="fPhone" value="${escapeHtml((r.phones[0]||{}).number||'')}" placeholder="(555) 555-5555"></div>
        </div>
        <div class="form-row"><label>Address</label>
          <div class="form-2col">
            <input type="text" id="fAddrStreet" value="${escapeHtml(r.address.street||'')}" placeholder="Street">
            <input type="text" id="fAddrCity" value="${escapeHtml(r.address.city||'')}" placeholder="City">
          </div>
          <div class="form-2col" style="margin-top:8px;">
            <input type="text" id="fAddrState" value="${escapeHtml(r.address.state||'')}" placeholder="State">
            <input type="text" id="fAddrZip" value="${escapeHtml(r.address.zip||'')}" placeholder="ZIP">
          </div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Driver's License</h2></div><div class="panel-body">
        <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-row"><label>License Number</label><input type="text" id="fDlNumber" value="${escapeHtml(r.driversLicense.number||'')}"></div>
          <div class="form-row"><label>Class</label><select id="fDlClass">${LICENSE_CLASSES.map(c=>`<option ${r.driversLicense.licenseClass===c?'selected':''}>${c}</option>`).join('')}</select></div>
          <div class="form-row"><label>Expiration</label><input type="date" id="fDlExpiration" value="${r.driversLicense.expiration||''}"></div>
        </div>
      </div></div>

      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Special Skills & Scheduling Eligibility</h2></div><div class="panel-body"><p class="hint">Select every skill this employee is qualified to perform. Scheduling uses these skills to determine eligibility for required staffing categories.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${STATE.pm.refData.skillsCatalog.map(sk=>`<label style="display:flex;gap:6px;align-items:center;font-size:12.5px;"><input type="checkbox" class="fSkill" value="${escapeHtml(sk)}" ${r.specialSkills.includes(sk)?'checked':''} style="width:auto;">${escapeHtml(sk)}</label>`).join('')}
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
  wirePhotoDropZone('fPmPhoto', (dataUrl)=>{ pendingPhoto = dataUrl; });
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const newRank = document.getElementById('fRank').value;
    if(newRank !== r.rank){
      const last = r.promotionHistory[r.promotionHistory.length-1];
      if(last && !last.endDate) last.endDate = fmt(new Date());
      r.promotionHistory.push({rank:newRank, startDate: fmt(new Date()), endDate:null});
    }
    const previousValues = JSON.parse(JSON.stringify(r));
    const nextValues = {
      photoDataUrl: pendingPhoto,
      agency: document.getElementById('fAgencyPm').value,
      employeeId: document.getElementById('fEmployeeId').value.trim(),
      unitId: document.getElementById('fUnitId').value,
      assignment: document.getElementById('fAssignment').value.trim(),
      rank: newRank,
      badgeNumber: document.getElementById('fBadgeNum').value.trim(),
      employmentStatus: document.getElementById('fEmpStatus').value,
      supervisorIds: Array.from(document.querySelectorAll('.fSupervisor:checked')).map(el=>el.value),
      hireDate: document.getElementById('fHireDate').value,
      swornDate: document.getElementById('fSwornDate').value,
      terminationDate: document.getElementById('fTermDate').value || null,
      sex: document.getElementById('fSex').value,
      race: document.getElementById('fRace').value,
      maritalStatus: document.getElementById('fMarital').value,
      bloodType: document.getElementById('fBloodType').value,
      phones: [{type:"Mobile", number: document.getElementById('fPhone').value.trim()}],
      address: { street: document.getElementById('fAddrStreet').value.trim(), city: document.getElementById('fAddrCity').value.trim(), state: document.getElementById('fAddrState').value.trim(), zip: document.getElementById('fAddrZip').value.trim() },
      driversLicense: { number: document.getElementById('fDlNumber').value.trim(), licenseClass: document.getElementById('fDlClass').value, state: r.driversLicense.state||'NV', expiration: document.getElementById('fDlExpiration').value },
      specialSkills: Array.from(document.querySelectorAll('.fSkill:checked')).map(el=>el.value),
    };
    const publicFields = ['agency','employeeId','unitId','assignment','rank','badgeNumber','employmentStatus','supervisorIds','hireDate','swornDate','terminationDate','specialSkills'];
    const restrictedFields = ['sex','race','maritalStatus','bloodType','phones','address','driversLicense','photoDataUrl'];
    const formatAuditValue = value=>value==null || value==='' ? '(empty)' : Array.isArray(value) ? value.join(', ') || '(empty)' : String(value).slice(0,120);
    const updatedFields = [];
    publicFields.forEach(field=>{
      if(JSON.stringify(previousValues[field] ?? null)===JSON.stringify(nextValues[field] ?? null)) return;
      recordFieldChange(r,field,previousValues[field],nextValues[field]);
      updatedFields.push(field);
      logActivity(`Updated ${field} for ${personName(personId)}: "${formatAuditValue(previousValues[field])}" to "${formatAuditValue(nextValues[field])}".`, "personnel_record", personId);
    });
    restrictedFields.forEach(field=>{
      if(JSON.stringify(previousValues[field] ?? null)===JSON.stringify(nextValues[field] ?? null)) return;
      updatedFields.push(field);
      logActivity(`Updated restricted personnel field ${field} for ${personName(personId)} (values withheld).`, "personnel_record", personId);
    });
    Object.assign(r,nextValues);
    if(!updatedFields.length) logActivity(`Personnel record for ${personName(personId)} saved with no field changes.`, "personnel_record", personId);
    persist();
    toast("Personnel record saved.");
    closeModal();
    if(ACTIVE_VIEW==='pm-records') renderRecords();
  };
}

function deleteRecord(personId){
  if(!confirm(`Delete the HR record for ${personName(personId)}? This does not remove them from the shared personnel roster, only their Personnel Management record.`)) return;
  STATE.pm.records = STATE.pm.records.filter(r=>r.personId!==personId);
  STATE.pm.disciplinaryActions = STATE.pm.disciplinaryActions.filter(d=>d.personId!==personId);
  STATE.pm.trainingRecords = STATE.pm.trainingRecords.filter(t=>t.personId!==personId);
  STATE.pm.inquiries = STATE.pm.inquiries.filter(i=>i.personId!==personId);
  logActivity(`Deleted personnel record for ${personName(personId)}.`, "personnel_record", personId);
  persist();
  toast("Personnel record deleted.");
  renderRecords();
}

/* =========================================================================
   RECORD DETAIL (full tabbed view: opened by clicking a name anywhere)
   ========================================================================= */
let RECORD_DETAIL_TAB = 'overview';
let RECORD_DETAIL_PERSON_ID = null;

function openRecordDetail(personId){
  if(!SuiteUX.openRecord("personnel","person",personId)) return;

  RECORD_DETAIL_TAB = 'overview';
  RECORD_DETAIL_PERSON_ID = personId;
  renderRecordDetailModal();
}

function renderRecordDetailModal(){
  const personId = RECORD_DETAIL_PERSON_ID;
  const r = recordFor(personId);
  if(!r){ closeModal(); return; }
  const canLodd = can('pm_lodd_view');
  const tabs = [
    ['overview','Overview'], ['promotions','Promotion History'], ['disciplinary','Disciplinary'],
    ['medical','Medical'], ['training','Training'], ['inquiries','Inquiries'], ['documents','Documents'],
  ];
  if(canLodd) tabs.push(['lodd','LODD']);
  tabs.push(['history','Change History']);
  const box = document.getElementById('modalBox');
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
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${RECORD_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-rec-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="recDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-rec-tab]').forEach(b=>b.addEventListener('click', ()=>{ RECORD_DETAIL_TAB=b.dataset.recTab; renderRecordDetailModal(); }));
  renderRecordDetailTabContent(r);
}

function renderRecordDetailTabContent(r){
  const body = document.getElementById('recDetailBody');
  const personId = r.personId;
  const canEdit = can('pm_records_edit');
  const canDocs = can('pm_documents_manage');
  const canLoddEdit = can('pm_lodd_manage');
  const canDiscManage = can('pm_discipline_manage');
  const canMedManage = can('pm_medical_manage');
  const canInqManage = can('pm_inquiries_manage');

  if(RECORD_DETAIL_TAB==='overview'){
    body.innerHTML = `
      ${(canEdit || canDocs) ? `<div style="margin-bottom:14px;display:flex;gap:8px;">${canEdit?`<button class="btn btn-sm btn-primary" id="btnEditFromDetail">${ICONS.edit} Edit Record</button>`:''}${canDocs?`<button class="btn btn-sm btn-outline" id="btnUploadPhoto">${ICONS.camera} ${r.photoDataUrl?'Change':'Attach'} Photo</button>`:''}</div>` : ''}
      <div class="detail-grid">
        <div><div class="k">Agency</div><div class="v">${escapeHtml(r.agency)}</div></div>
        <div><div class="k">Employee ID</div><div class="v">${(r.employeeId?escapeHtml(r.employeeId):'—')}</div></div>
        <div><div class="k">Unit</div><div class="v">${escapeHtml(r.unitId)}</div></div>
        <div><div class="k">Assignment</div><div class="v">${(r.assignment?escapeHtml(r.assignment):'—')}</div></div>
        <div><div class="k">Rank</div><div class="v">${escapeHtml(r.rank)}</div></div>
        <div><div class="k">Badge #</div><div class="v">${escapeHtml(r.badgeNumber)}</div></div>
        <div><div class="k">Employment Status</div><div class="v"><span class="badge ${statusBadgeClass(r.employmentStatus)}">${r.employmentStatus}</span></div></div>
        <div><div class="k">Supervisor(s)</div><div class="v">${r.supervisorIds.length ? r.supervisorIds.map(sid=>escapeHtml(personName(sid))).join(', ') : '—'}</div></div>
        <div><div class="k">Hire Date</div><div class="v">${r.hireDate||'—'}</div></div>
        <div><div class="k">Sworn Date</div><div class="v">${r.swornDate||'—'}</div></div>
        <div><div class="k">Termination Date</div><div class="v">${r.terminationDate||'—'}</div></div>
        <div><div class="k">Sex / Race / Marital</div><div class="v">${escapeHtml(r.sex)} &bull; ${escapeHtml(r.race)} &bull; ${escapeHtml(r.maritalStatus)}</div></div>
        <div><div class="k">Blood Type</div><div class="v">${escapeHtml(r.bloodType)}</div></div>
        <div><div class="k">Phone</div><div class="v">${escapeHtml((r.phones[0]||{}).number||'—')}</div></div>
        <div><div class="k">Address</div><div class="v">${escapeHtml(r.address.street||'')}, ${escapeHtml(r.address.city||'')} ${escapeHtml(r.address.state||'')} ${escapeHtml(r.address.zip||'')}</div></div>
        <div><div class="k">Driver's License</div><div class="v">${(r.driversLicense.number?escapeHtml(r.driversLicense.number):'—')} (${escapeHtml(r.driversLicense.licenseClass||'')})${r.driversLicense.expiration?' exp. '+r.driversLicense.expiration:''}</div></div>
        <div><div class="k">Special Skills</div><div class="v">${r.specialSkills.length?r.specialSkills.map(escapeHtml).join(', '):'—'}</div></div>
        <div><div class="k">Education</div><div class="v">${r.education.length?r.education.map(e=>`${escapeHtml(e.degree)}, ${escapeHtml(e.institution)} (${e.year})`).join('; '):'—'}</div></div>
      </div>
    `;
    const editBtn = document.getElementById('btnEditFromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>openRecordEditModal(personId));
    const photoBtn = document.getElementById('btnUploadPhoto');
    if(photoBtn) photoBtn.addEventListener('click', ()=>openPhotoUploadModal(r));

  } else if(RECORD_DETAIL_TAB==='promotions'){
    const rows = r.promotionHistory.map((p,i)=>({p,i})).sort((a,b)=>b.p.startDate.localeCompare(a.p.startDate)).map(({p,i})=>`
      <tr><td>${escapeHtml(p.rank)}</td><td>${p.startDate}</td><td>${p.endDate||'Current'}</td>
      <td>${canEdit ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-promo="${i}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-danger" data-del-promo="${i}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No promotion history recorded.</td></tr>`;
    body.innerHTML = `
      ${canEdit ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddPromotion">${ICONS.plus} Add Promotion History Entry</button>` : ''}
      <table><thead><tr><th>Rank</th><th>Start Date</th><th>End Date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const addPromoBtn = document.getElementById('btnAddPromotion');
    if(addPromoBtn) addPromoBtn.addEventListener('click', ()=>openPromotionFormModal(r, null));
    document.querySelectorAll('[data-edit-promo]').forEach(b=>b.addEventListener('click', ()=>openPromotionFormModal(r, Number(b.dataset.editPromo))));
    document.querySelectorAll('[data-del-promo]').forEach(b=>b.addEventListener('click', ()=>{
      const i = Number(b.dataset.delPromo);
      const entry = r.promotionHistory[i];
      if(!confirm(`Delete the "${entry.rank}" promotion history entry (${entry.startDate})?`)) return;
      r.promotionHistory.splice(i,1);
      logActivity(`Removed a promotion history entry (${entry.rank}) for ${personName(personId)}.`, "personnel_record", personId);
      persist();
      renderRecordDetailModal();
    }));

  } else if(RECORD_DETAIL_TAB==='disciplinary'){
    const list = STATE.pm.disciplinaryActions.filter(d=>d.personId===personId).slice().sort((a,b)=>b.startDateTime.localeCompare(a.startDateTime));
    const rows = list.map(d=>`
      <tr>
        <td>${escapeHtml(d.type)}</td><td>${d.startDateTime.replace('T',' ')}</td>
        <td><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></td>
        <td><button class="btn btn-sm btn-outline" data-view-disc="${d.id}">View</button></td>
      </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No disciplinary actions on file.</td></tr>`;
    body.innerHTML = `
      ${canDiscManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDiscFromRecord">${ICONS.plus} Record Disciplinary Action</button>` : ''}
      <table><thead><tr><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    document.querySelectorAll('[data-view-disc]').forEach(b=>b.addEventListener('click', ()=>openDisciplinaryDetailModal(b.dataset.viewDisc)));
    const addDiscBtn = document.getElementById('btnAddDiscFromRecord');
    if(addDiscBtn) addDiscBtn.addEventListener('click', ()=>openDisciplinaryFormModal(null, personId));

  } else if(RECORD_DETAIL_TAB==='medical'){
    const m = r.medical;
    const vaxRows = m.vaccinations.map((v,i)=>`
      <tr><td>${escapeHtml(v.name)}</td><td>${v.date}</td><td>${v.expirationDate||'No expiration'}</td><td style="font-size:12px;">${escapeHtml(v.notes||'')}</td>
      ${canMedManage?`<td><button class="btn-icon" data-del-vax="${i}">${ICONS.trash}</button></td>`:'<td></td>'}</tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:12px;">No vaccinations on file.</td></tr>`;
    const injRows = m.injuryHistory.map(inj=>`<tr><td>${inj.date}</td><td style="font-size:13px;">${escapeHtml(inj.description)}</td><td style="font-size:12px;">${escapeHtml(inj.notes||'')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No injuries on file.</td></tr>`;
    const expRows = m.exposureHistory.map(ex=>`<tr><td>${ex.date}</td><td>${escapeHtml(ex.type)}</td><td style="font-size:12px;">${escapeHtml(ex.notes||'')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No exposures on file.</td></tr>`;
    body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:14px;"><div><div class="k">Blood Type</div><div class="v">${escapeHtml(m.bloodType)}</div></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Vaccinations</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddVax">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Vaccine</th><th>Date</th><th>Expiration</th><th>Notes</th><th></th></tr></thead><tbody>${vaxRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Injury History</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddInjury">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Description</th><th>Notes</th></tr></thead><tbody>${injRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Exposure History</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddExposure">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Type</th><th>Notes</th></tr></thead><tbody>${expRows}</tbody></table></div></div>
      ${!canMedManage ? '<div style="font-size:12px;color:var(--text-dim);">You have view-only access to medical data in this role.</div>' : ''}
    `;
    if(canMedManage){
      document.getElementById('btnAddVax').addEventListener('click', ()=>openVaccinationFormModal(r));
      document.getElementById('btnAddInjury').addEventListener('click', ()=>openInjuryFormModal(r, 'injuryHistory', 'Injury'));
      document.getElementById('btnAddExposure').addEventListener('click', ()=>openInjuryFormModal(r, 'exposureHistory', 'Exposure'));
      document.querySelectorAll('[data-del-vax]').forEach(b=>b.addEventListener('click', ()=>{
        m.vaccinations.splice(Number(b.dataset.delVax),1);
        logActivity(`Removed a vaccination record for ${personName(personId)}.`, "medical", personId);
        persist(); renderRecordDetailModal();
      }));
    }

  } else if(RECORD_DETAIL_TAB==='training'){
    const list = STATE.pm.trainingRecords.filter(t=>t.personId===personId).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(t=>`
      <tr><td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${t.hours}</td><td>${t.passed===null?'—':(t.passed?'Passed':'Failed')}${t.score!=null?' ('+t.score+'%)':''}</td>
      <td>${t.recertDate||'—'}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No training records on file.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Course</th><th>Date</th><th>Hours</th><th>Result</th><th>Recert Due</th></tr></thead><tbody>${rows}</tbody></table>`;
    if(FieldTraining.available()){const link=document.createElement('button');link.type='button';link.className='btn btn-outline btn-sm';link.style.marginBottom='12px';link.textContent='Open Field Training file';link.onclick=()=>FieldTraining.openPerson(personId);body.prepend(link);}

  } else if(RECORD_DETAIL_TAB==='inquiries'){
    const list = STATE.pm.inquiries.filter(i=>i.personId===personId).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(i=>`
      <tr><td>${escapeHtml(i.category)}</td><td>${i.date}</td><td class="mono">${escapeHtml(i.caseRef)}</td><td style="font-size:12.5px;">${escapeHtml(i.summary)}</td><td>${escapeHtml(i.outcome)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No RMS-data inquiry entries on file.</td></tr>`;
    body.innerHTML = `
      ${canInqManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddInquiry">${ICONS.plus} Log Inquiry Entry</button>` : ''}
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Represents inquiries against RMS data (use of force, pursuits, complaints, etc.) for early-intervention purposes. In a full deployment these would be pulled automatically from the records/CAD system rather than logged manually here.</div>
      <table><thead><tr><th>Category</th><th>Date</th><th>Case Ref</th><th>Summary</th><th>Outcome</th></tr></thead><tbody>${rows}</tbody></table>`;
    const addInqBtn = document.getElementById('btnAddInquiry');
    if(addInqBtn) addInqBtn.addEventListener('click', ()=>openInquiryFormModal(personId));

  } else if(RECORD_DETAIL_TAB==='documents'){
    const rows = r.documents.map((d,i)=>`
      <tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.docType||'General')}</td><td>${d.uploadDate}</td><td>${escapeHtml(d.uploadedBy)}</td>
      ${canDocs?`<td><button class="btn-icon" data-del-doc="${i}">${ICONS.trash}</button></td>`:'<td></td>'}</tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No documents attached.</td></tr>`;
    body.innerHTML = `
      ${canDocs ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDoc">${ICONS.plus} Attach Document</button>` : ''}
      <table><thead><tr><th>Name</th><th>Type</th><th>Uploaded</th><th>By</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <div style="font-size:11px;color:var(--text-dim);margin-top:10px;">Documents are tracked by metadata (name, type, date) in this prototype rather than storing full file contents.</div>
    `;
    const addDocBtn = document.getElementById('btnAddDoc');
    if(addDocBtn) addDocBtn.addEventListener('click', ()=>openDocumentFormModal(r));
    document.querySelectorAll('[data-del-doc]').forEach(b=>b.addEventListener('click', ()=>{
      r.documents.splice(Number(b.dataset.delDoc),1);
      persist(); renderRecordDetailModal();
    }));

  } else if(RECORD_DETAIL_TAB==='lodd'){
    const l = r.lodd;
    body.innerHTML = `
      ${canLoddEdit ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnEditLodd">${ICONS.edit} Edit LODD Information</button>` : ''}
      <div class="locked-note">${ICONS.lock}<div>Line-of-Duty-Death information is sensitive personal data, restricted to a small number of roles.</div></div>
      <div class="detail-grid">
        <div><div class="k">Personnel Wishes</div><div class="v">${(l.wishes?escapeHtml(l.wishes):'—')}</div></div>
        <div><div class="k">Emergency Contact</div><div class="v">${(l.emergencyContactName?escapeHtml(l.emergencyContactName):'—')} ${l.emergencyContactRelation?'('+escapeHtml(l.emergencyContactRelation)+')':''}</div></div>
        <div><div class="k">Emergency Contact Phone</div><div class="v">${(l.emergencyContactPhone?escapeHtml(l.emergencyContactPhone):'—')}</div></div>
        <div><div class="k">Notes</div><div class="v">${(l.notes?escapeHtml(l.notes):'—')}</div></div>
      </div>`;
    const loddBtn = document.getElementById('btnEditLodd');
    if(loddBtn) loddBtn.addEventListener('click', ()=>openLoddFormModal(r));

  } else if(RECORD_DETAIL_TAB==='history'){
    const rows = r.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every change to key fields (rank, unit, employment status) is captured here with who made the change and the before/after values. Every other action on this record is also in the Platform Audit Log under Admin.</div>
      <table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function openPhotoUploadModal(r){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
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
  let pending = r.photoDataUrl;
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fPhotoFile').addEventListener('change', (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const img = new Image(); const reader = new FileReader();
    reader.onload = (ev)=>{ img.onload = ()=>{
      const canvas = document.createElement('canvas'); const size = 160;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size/img.width, size/img.height);
      const w = img.width*scale, h = img.height*scale;
      ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
      pending = canvas.toDataURL('image/jpeg', 0.7);
      toast("Photo ready to save.");
    }; img.src = ev.target.result; };
    reader.readAsDataURL(file);
  });
  document.getElementById('mSave').onclick = ()=>{
    r.photoDataUrl = pending;
    logActivity(`Updated photo for ${personName(r.personId)}.`, "personnel_record", r.personId);
    persist();
    closeModal();
    renderRecordDetailModal();
  };
}

function openPromotionFormModal(r, index){
  const editing = index!=null;
  const p = editing ? r.promotionHistory[index] : { rank: STATE.pm.refData.ranks[0], startDate: fmt(new Date()), endDate: null };
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Promotion History Entry</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Rank</label><select id="fPromoRank">${STATE.pm.refData.ranks.map(rk=>`<option ${p.rank===rk?'selected':''}>${escapeHtml(rk)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fPromoStart" value="${p.startDate||''}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fPromoEnd" value="${p.endDate||''}"></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);">Leave End Date blank if this is their current rank. Doing so automatically closes out any other entry marked as current and updates the record's Rank field to match.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add Entry'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const rank = document.getElementById('fPromoRank').value;
    const startDate = document.getElementById('fPromoStart').value;
    const endDate = document.getElementById('fPromoEnd').value || null;
    if(!startDate){ toast("Enter a start date.", true); return; }
    if(editing){
      Object.assign(p, {rank, startDate, endDate});
      logActivity(`Updated promotion history entry (${rank}) for ${personName(r.personId)}.`, "personnel_record", r.personId);
    } else {
      const newEntry = {rank, startDate, endDate};
      r.promotionHistory.push(newEntry);
      logActivity(`Added promotion history entry (${rank}, ${startDate}) for ${personName(r.personId)}.`, "personnel_record", r.personId);
    }
    const savedEntry = editing ? p : r.promotionHistory[r.promotionHistory.length-1];
    if(endDate===null){
      // this entry is now "current" - close out any other open-ended entry and sync the record's Rank field
      r.promotionHistory.forEach(entry=>{ if(entry!==savedEntry && !entry.endDate) entry.endDate = startDate; });
      recordFieldChange(r, 'rank', r.rank, rank);
      r.rank = rank;
    }
    persist();
    toast("Promotion history saved.");
    renderRecordDetailModal();
  };
}

function openVaccinationFormModal(r){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Vaccination</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Vaccine / Immunization</label><input type="text" id="fVaxName" placeholder="e.g. Influenza (Annual)"></div>
      <div class="form-2col">
        <div class="form-row"><label>Date Administered</label><input type="date" id="fVaxDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Expiration (if applicable)</label><input type="date" id="fVaxExpire"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fVaxNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fVaxName').value.trim();
    if(!name){ toast("Enter a vaccine name.", true); return; }
    r.medical.vaccinations.push({ name, date: document.getElementById('fVaxDate').value, expirationDate: document.getElementById('fVaxExpire').value || null, notes: document.getElementById('fVaxNotes').value.trim() });
    logActivity(`Added vaccination "${name}" for ${personName(r.personId)}.`, "medical", r.personId);
    persist();
    renderRecordDetailModal();
  };
}

function openInjuryFormModal(r, listKey, label){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add ${label}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Date</label><input type="date" id="fInjDate" value="${fmt(new Date())}"></div>
      ${listKey==='exposureHistory' ? `<div class="form-row"><label>Exposure Type</label><input type="text" id="fInjDesc" placeholder="e.g. Bloodborne Pathogen Exposure"></div>` : `<div class="form-row"><label>Description</label><input type="text" id="fInjDesc" placeholder="What happened"></div>`}
      <div class="form-row"><label>Notes</label><textarea id="fInjNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const desc = document.getElementById('fInjDesc').value.trim();
    if(!desc){ toast("Enter a description.", true); return; }
    const entry = listKey==='exposureHistory'
      ? { date: document.getElementById('fInjDate').value, type: desc, notes: document.getElementById('fInjNotes').value.trim() }
      : { date: document.getElementById('fInjDate').value, description: desc, notes: document.getElementById('fInjNotes').value.trim() };
    r.medical[listKey].push(entry);
    logActivity(`Added ${label.toLowerCase()} record for ${personName(r.personId)}.`, "medical", r.personId);
    persist();
    renderRecordDetailModal();
  };
}

function openInquiryFormModal(personId){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log RMS-Data Inquiry Entry</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Category</label><select id="fInqCategory">${STATE.pm.refData.inquiryCategories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fInqDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Case Reference #</label><input type="text" id="fInqCaseRef" placeholder="e.g. UOF-2026-0001"></div>
      </div>
      <div class="form-row"><label>Summary</label><textarea id="fInqSummary" rows="2"></textarea></div>
      <div class="form-row"><label>Outcome</label><input type="text" id="fInqOutcome" placeholder="e.g. Within policy, Under review"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Entry</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const entry = {
      id:'inq'+Date.now(), personId, category: document.getElementById('fInqCategory').value,
      date: document.getElementById('fInqDate').value, caseRef: document.getElementById('fInqCaseRef').value.trim(),
      summary: document.getElementById('fInqSummary').value.trim(), outcome: document.getElementById('fInqOutcome').value.trim() || 'Under review',
    };
    STATE.pm.inquiries.push(entry);
    logActivity(`Logged ${entry.category} inquiry entry for ${personName(personId)}.`, "inquiry", personId);
    persist();
    toast("Inquiry entry logged.");
    renderRecordDetailModal();
  };
}

function openDocumentFormModal(r){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Attach Document</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Document Name</label><input type="text" id="fDocName" placeholder="e.g. Signed Acknowledgment Form"></div>
      <div class="form-row"><label>Type</label><input type="text" id="fDocType" placeholder="e.g. Policy Acknowledgment, Medical, Legal"></div>
      <div style="font-size:11px;color:var(--text-dim);">This prototype tracks document metadata only, not the underlying file.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Attach</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fDocName').value.trim();
    if(!name){ toast("Enter a document name.", true); return; }
    r.documents.push({ name, docType: document.getElementById('fDocType').value.trim() || 'General', uploadDate: fmt(new Date()), uploadedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System' });
    logActivity(`Attached document "${name}" to ${personName(r.personId)}'s record.`, "document", r.personId);
    persist();
    renderRecordDetailModal();
  };
}

function openLoddFormModal(r){
  const l = r.lodd;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Edit LODD Information</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Personnel Wishes</label><textarea id="fLoddWishes" rows="3">${escapeHtml(l.wishes||'')}</textarea></div>
      <div class="form-2col">
        <div class="form-row"><label>Emergency Contact Name</label><input type="text" id="fLoddContactName" value="${escapeHtml(l.emergencyContactName||'')}"></div>
        <div class="form-row"><label>Relationship</label><input type="text" id="fLoddContactRel" value="${escapeHtml(l.emergencyContactRelation||'')}"></div>
      </div>
      <div class="form-row"><label>Emergency Contact Phone</label><input type="text" id="fLoddContactPhone" value="${escapeHtml(l.emergencyContactPhone||'')}"></div>
      <div class="form-row"><label>Additional Notes</label><textarea id="fLoddNotes" rows="2">${escapeHtml(l.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    Object.assign(l, {
      wishes: document.getElementById('fLoddWishes').value.trim(),
      emergencyContactName: document.getElementById('fLoddContactName').value.trim(),
      emergencyContactRelation: document.getElementById('fLoddContactRel').value.trim(),
      emergencyContactPhone: document.getElementById('fLoddContactPhone').value.trim(),
      notes: document.getElementById('fLoddNotes').value.trim(),
    });
    logActivity(`Updated LODD information for ${personName(r.personId)}.`, "lodd", r.personId);
    persist();
    renderRecordDetailModal();
  };
}

/* =========================================================================
   DISCIPLINARY ACTIONS
   ========================================================================= */
let DISC_FILTER = {status:"All", type:"All"};

function renderDisciplinary(){
  if(!can('pm_discipline_view')){
    document.getElementById('view-pm-disciplinary').innerHTML = permissionBlockedView("You don't have permission to view disciplinary actions in this role.");
    return;
  }
  const canManage = can('pm_discipline_manage');
  const f = DISC_FILTER;
  const list = STATE.pm.disciplinaryActions.filter(d=>{
    return (f.status==="All"||d.status===f.status) && (f.type==="All"||d.type===f.type);
  }).slice().sort((a,b)=>b.startDateTime.localeCompare(a.startDateTime));

  const today = new Date();
  const pendingExpirations = STATE.pm.disciplinaryActions.filter(d=>d.status!=="Closed" && d.evaluationDates.length)
    .flatMap(d=>d.evaluationDates.map(ed=>({d, ed, days: daysBetween(fmt(today), ed)})))
    .filter(x=>x.days<=30).sort((a,b)=>a.days-b.days);

  const rows = list.map(d=>`
    <tr>
      <td>${recordLink(d.personId)}</td>
      <td>${escapeHtml(d.type)}</td>
      <td>${d.startDateTime.replace('T',' ')}</td>
      <td>${d.endDateTime?d.endDateTime.replace('T',' '):'—'}</td>
      <td><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></td>
      <td>${escapeHtml(d.rank)}</td>
      <td><button class="btn btn-sm btn-outline" data-view-disc="${d.id}">View</button></td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No disciplinary actions match this filter.</td></tr>`;

  const pendingRows = pendingExpirations.map(({d,ed,days})=>`
    <tr><td>${recordLink(d.personId)}</td><td>${escapeHtml(d.type)}</td><td>${ed}</td>
    <td style="${days<=7?'color:var(--red);font-weight:700;':''}">${days<0?Math.abs(days)+'d overdue':days+'d'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">Nothing due within 30 days.</td></tr>`;

  document.getElementById('view-pm-disciplinary').innerHTML = `
    ${!canManage ? lockedNote("You're viewing disciplinary actions in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Pending Expiration Report</h2><span class="hint">${pendingExpirations.length} evaluation date(s) due within 30 days</span></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Employee</th><th>Type</th><th>Evaluation Date</th><th>Time Remaining</th></tr></thead><tbody>${pendingRows}</tbody></table></div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select id="discStatusFilter" title="Filter disciplinary records to a single status"><option ${f.status==='All'?'selected':''}>All</option>${["Pending","Active","Closed"].map(s=>`<option ${f.status===s?'selected':''}>${s}</option>`).join('')}</select>
        <select id="discTypeFilter" title="Filter disciplinary records to a single incident type"><option ${f.type==='All'?'selected':''}>All</option>${STATE.pm.refData.disciplinaryTypes.map(t=>`<option ${f.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="btnAddDisc">${ICONS.plus} Record Disciplinary Action</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Status</th><th>Rank at Time</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('discStatusFilter').addEventListener('change', e=>{DISC_FILTER.status=e.target.value; renderDisciplinary();});
  document.getElementById('discTypeFilter').addEventListener('change', e=>{DISC_FILTER.type=e.target.value; renderDisciplinary();});
  const addBtn = document.getElementById('btnAddDisc');
  if(addBtn) addBtn.addEventListener('click', ()=>openDisciplinaryFormModal(null, null));
  document.querySelectorAll('[data-view-disc]').forEach(b=>b.addEventListener('click', ()=>openDisciplinaryDetailModal(b.dataset.viewDisc)));
  wireRecordLinks();
}

function openDisciplinaryFormModal(existingId, prefillPersonId){
  const editing = !!existingId;
  const d = editing ? STATE.pm.disciplinaryActions.find(x=>x.id===existingId) : {
    personId: prefillPersonId || STATE.personnel[0].id, type: STATE.pm.refData.disciplinaryTypes[0],
    startDateTime: fmt(new Date())+"T09:00", endDateTime: "", status:"Pending", rank:"", evaluationDates:[], history:[], notes:"",
  };
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Record'} Disciplinary Action</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label>
        <select id="fDiscPerson" ${prefillPersonId?'disabled':''}>${STATE.personnel.map(p=>`<option value="${p.id}" ${d.personId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fDiscType">${STATE.pm.refData.disciplinaryTypes.map(t=>`<option ${d.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fDiscStatus">${["Pending","Active","Closed"].map(s=>`<option ${d.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date/Time</label><input type="datetime-local" id="fDiscStart" value="${d.startDateTime}"></div>
        <div class="form-row"><label>End Date/Time</label><input type="datetime-local" id="fDiscEnd" value="${d.endDateTime||''}"></div>
      </div>
      <div class="form-row"><label>Evaluation Date(s) (comma-separated)</label><input type="text" id="fDiscEvalDates" value="${d.evaluationDates.join(', ')}" placeholder="2026-10-01, 2026-11-01"></div>
      <div class="form-row"><label>Notes</label><textarea id="fDiscNotes" rows="2">${escapeHtml(d.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Record'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const personId = prefillPersonId || document.getElementById('fDiscPerson').value;
    const rank = (recordFor(personId)||{}).rank || '';
    const evalDates = document.getElementById('fDiscEvalDates').value.split(',').map(s=>s.trim()).filter(Boolean);
    const data = {
      personId, type: document.getElementById('fDiscType').value, status: document.getElementById('fDiscStatus').value,
      startDateTime: document.getElementById('fDiscStart').value, endDateTime: document.getElementById('fDiscEnd').value || null,
      evaluationDates: evalDates, rank, notes: document.getElementById('fDiscNotes').value.trim(),
    };
    if(editing){
      d.history.push(`Updated: status set to ${data.status}.`);
      Object.assign(d, data);
      logActivity(`Updated disciplinary action (${d.type}) for ${personName(personId)}.`, "disciplinary", d.id);
    } else {
      const newDisc = {id:'disc'+Date.now(), history:[`${data.type} recorded.`], ...data};
      STATE.pm.disciplinaryActions.push(newDisc);
      logActivity(`Recorded ${data.type} for ${personName(personId)}.`, "disciplinary", newDisc.id);
    }
    persist();
    toast("Disciplinary action saved.");
    closeModal();
    if(ACTIVE_VIEW==='pm-disciplinary') renderDisciplinary();
  };
}

function openDisciplinaryDetailModal(discId){
  const d = STATE.pm.disciplinaryActions.find(x=>x.id===discId);
  const canManage = can('pm_discipline_manage');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(d.type)} \u2014 ${escapeHtml(personName(d.personId))}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClass(d.status)}">${d.status}</span></div></div>
        <div><div class="k">Rank at Time</div><div class="v">${escapeHtml(d.rank)}</div></div>
        <div><div class="k">Start</div><div class="v">${d.startDateTime.replace('T',' ')}</div></div>
        <div><div class="k">End</div><div class="v">${d.endDateTime?d.endDateTime.replace('T',' '):'—'}</div></div>
        <div><div class="k">Evaluation Dates</div><div class="v">${d.evaluationDates.join(', ')||'—'}</div></div>
      </div>
      ${d.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(d.notes)}</div></div>` : ''}
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>History</h2></div>
        <div class="panel-body">${d.history.map(h=>`<div style="padding:4px 0;font-size:13px;border-bottom:1px solid var(--border);">${escapeHtml(h)}</div>`).join('')||'<div style="color:var(--text-dim);">No history entries.</div>'}</div>
      </div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditDiscFromDetail">${ICONS.edit} Edit</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  const editBtn = document.getElementById('btnEditDiscFromDetail');
  if(editBtn) editBtn.addEventListener('click', ()=>openDisciplinaryFormModal(discId, d.personId));
}

/* =========================================================================
   TRAINING & CERTIFICATIONS
   ========================================================================= */
let TRAINING_SUBTAB = 'mycalendar';

function renderTraining(){
  const canManage = can('pm_training_manage');
  const canViewOwn = can('pm_training_view_own');
  const canRequest = can('pm_training_request');
  const canInstructors = can('pm_instructor_manage');
  if(!canManage && !canViewOwn && !canRequest && !canInstructors){
    document.getElementById('view-pm-training').innerHTML = permissionBlockedView("You don't have permission to view training in this role.");
    return;
  }
  const subtabs = [];
  if(canViewOwn || canRequest) subtabs.push(['mycalendar','My Calendar']);
  if(canInstructors) subtabs.push(['mastercalendar','Master Calendar']);
  if(canManage) subtabs.push(['records','All Training Records']);
  if(canViewOwn) subtabs.push(['mine','My Training']);
  subtabs.push(['courses','Course Catalog']);
  if(canRequest || canManage) subtabs.push(['requests','Training Requests']);
  subtabs.push(['instructors','Instructors']);
  if(canManage) subtabs.push(['search','Search']);
  if(canManage) subtabs.push(['compliance','Required Training Compliance']);
  if(!subtabs.find(([k])=>k===TRAINING_SUBTAB)) TRAINING_SUBTAB = subtabs[0][0];

  document.getElementById('view-pm-training').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${subtabs.map(([key,label])=>`<button class="btn btn-sm ${TRAINING_SUBTAB===key?'btn-primary':'btn-outline'}" data-training-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="trainingSubtabBody"></div>
  `;
  document.querySelectorAll('[data-training-tab]').forEach(b=>b.addEventListener('click', ()=>{ TRAINING_SUBTAB=b.dataset.trainingTab; renderTraining(); }));
  renderTrainingSubtab();
}

function renderTrainingSubtab(){
  const body = document.getElementById('trainingSubtabBody');
  if(TRAINING_SUBTAB==='mycalendar') renderCalendarSub(body, CURRENT_USER_ID);
  else if(TRAINING_SUBTAB==='mastercalendar') renderCalendarSub(body, null);
  else if(TRAINING_SUBTAB==='records') renderTrainingRecordsSub(body, null);
  else if(TRAINING_SUBTAB==='mine') renderTrainingRecordsSub(body, CURRENT_USER_ID);
  else if(TRAINING_SUBTAB==='courses') renderCourseCatalogSub(body);
  else if(TRAINING_SUBTAB==='requests') renderTrainingRequestsSub(body);
  else if(TRAINING_SUBTAB==='instructors') renderInstructorsSub(body);
  else if(TRAINING_SUBTAB==='search') renderTrainingSearchSub(body);
  else if(TRAINING_SUBTAB==='compliance') renderComplianceSub(body);
}

function renderTrainingRecordsSub(body, lockedPersonId){
  const canManage = can('pm_training_manage');
  const list = STATE.pm.trainingRecords.filter(t=>!lockedPersonId || t.personId===lockedPersonId).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const rows = list.map(t=>`
    <tr>
      ${lockedPersonId ? '' : `<td>${recordLink(t.personId)}</td>`}
      <td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${t.hours}</td><td>${money(t.cost)}</td>
      <td>${escapeHtml(t.provider)}</td><td>${escapeHtml(t.attendedStatus)}</td>
      <td>${t.score!=null?t.score+'%':(t.passed===null?'—':(t.passed?'Passed':'Failed'))}</td>
      <td>${t.recertDate||'—'}</td>
      ${canManage && !lockedPersonId ? `<td><button class="btn btn-sm btn-outline" data-edit-training="${t.id}">${ICONS.edit}</button></td>` : '<td></td>'}
    </tr>`).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);padding:16px;">No training records${lockedPersonId?' for you':''} yet.</td></tr>`;
  body.innerHTML = `
    ${lockedPersonId ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Read-only view of your own training history.</div>` : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddTraining">${ICONS.plus} Log Training Record</button>` : ''}
    <table><thead><tr>
      ${lockedPersonId ? '' : '<th>Employee</th>'}
      <th>Course</th><th>Date</th><th>Hours</th><th>Cost</th><th>Provider</th><th>Attendance</th><th>Result</th><th>Recert Due</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>
  `;
  const addBtn = document.getElementById('btnAddTraining');
  if(addBtn) addBtn.addEventListener('click', ()=>openTrainingRecordFormModal(null));
  document.querySelectorAll('[data-edit-training]').forEach(b=>b.addEventListener('click', ()=>openTrainingRecordFormModal(b.dataset.editTraining)));
  if(!lockedPersonId) wireRecordLinks();
}

function openTrainingRecordFormModal(existingId){
  ensureTrainingLocationsShape();
  const editing = !!existingId;
  const t = editing ? STATE.pm.trainingRecords.find(x=>x.id===existingId) : {
    personId: STATE.personnel[0].id, courseId: STATE.pm.trainingCourses[0].id, date: fmt(new Date()), hours:0, cost:0,
    description: STATE.pm.trainingCourses[0].name, narrative:"", provider: STATE.pm.refData.trainingProviders[0], location: STATE.pm.refData.trainingLocations[0]?.name || '',
    score:null, passed:null, method:"In-Person", attendedStatus:"Attended", recertRequired:false, recertDate:null, documents:[],
  };
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Log'} Training Record</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Attendee(s) \u2014 primary</label><select id="fTrPerson">${STATE.personnel.map(p=>`<option value="${p.id}" ${t.personId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Course</label><select id="fTrCourse">${STATE.pm.trainingCourses.map(c=>`<option value="${c.id}" ${t.courseId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Date</label><input type="date" id="fTrDate" value="${t.date}"></div>
        <div class="form-row"><label>Hours</label><input type="number" id="fTrHours" value="${t.hours}"></div>
        <div class="form-row"><label>Cost ($)</label><input type="number" id="fTrCost" value="${t.cost}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Provider</label><select id="fTrProvider">${STATE.pm.refData.trainingProviders.map(p=>`<option ${t.provider===p?'selected':''}>${escapeHtml(p)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Location</label><select id="fTrLocation">${STATE.pm.refData.trainingLocations.map(l=>`<option ${t.location===l.name?'selected':''}>${escapeHtml(l.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Method</label><select id="fTrMethod">${["In-Person","Online / LMS","Field Training","Practical Exercise"].map(m=>`<option ${t.method===m?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="form-row"><label>Attendance</label><select id="fTrAttended">${["Attended","No-Show","Scheduled"].map(a=>`<option ${t.attendedStatus===a?'selected':''}>${a}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Score / Result (%)</label><input type="number" id="fTrScore" value="${t.score!=null?t.score:''}" placeholder="Optional"></div>
        <div class="form-row"><label>Pass / Fail</label><select id="fTrPassed"><option value="">N/A</option><option value="true" ${t.passed===true?'selected':''}>Passed</option><option value="false" ${t.passed===false?'selected':''}>Failed</option></select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fTrRecertRequired" ${t.recertRequired?'checked':''} style="width:auto;">Recertification required</label>
      </div>
      <div class="form-row" id="fTrRecertDateWrap" style="${t.recertRequired?'':'display:none;'}"><label>Date of Recertification</label><input type="date" id="fTrRecertDate" value="${t.recertDate||''}"></div>
      <div class="form-row"><label>Narrative / Comments</label><textarea id="fTrNarrative" rows="2">${escapeHtml(t.narrative||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Log Record'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fTrRecertRequired').addEventListener('change', e=>{ document.getElementById('fTrRecertDateWrap').style.display = e.target.checked?'':'none'; });
  document.getElementById('mSave').onclick = ()=>{
    const courseId = document.getElementById('fTrCourse').value;
    const course = STATE.pm.trainingCourses.find(c=>c.id===courseId);
    const passedVal = document.getElementById('fTrPassed').value;
    const data = {
      personId: document.getElementById('fTrPerson').value, courseId, date: document.getElementById('fTrDate').value,
      hours: Number(document.getElementById('fTrHours').value)||0, cost: Number(document.getElementById('fTrCost').value)||0,
      description: course.name, provider: document.getElementById('fTrProvider').value, location: document.getElementById('fTrLocation').value,
      method: document.getElementById('fTrMethod').value, attendedStatus: document.getElementById('fTrAttended').value,
      score: document.getElementById('fTrScore').value ? Number(document.getElementById('fTrScore').value) : null,
      passed: passedVal==='' ? null : passedVal==='true',
      recertRequired: document.getElementById('fTrRecertRequired').checked,
      recertDate: document.getElementById('fTrRecertRequired').checked ? document.getElementById('fTrRecertDate').value : null,
      narrative: document.getElementById('fTrNarrative').value.trim(),
    };
    if(editing){ Object.assign(t, data); logActivity(`Updated training record (${course.name}) for ${personName(data.personId)}.`, "training", t.id); }
    else{ const newT = {id:'tr'+Date.now(), documents:[], ...data}; STATE.pm.trainingRecords.push(newT); logActivity(`Logged training "${course.name}" for ${personName(data.personId)}.`, "training", newT.id); }
    persist();
    toast("Training record saved.");
    closeModal();
    renderTraining();
  };
}

function renderCourseCatalogSub(body){
  const canManage = can('pm_instructor_manage');
  const rows = STATE.pm.trainingCourses.map(c=>`
    <tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.category)}</td><td>${escapeHtml(c.classification)}</td>
    <td>${c.recertRequired?`Every ${c.recertIntervalMonths} mo.`:'—'}</td>
    <td>${canManage ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-course="${c.id}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-danger" data-del-course="${c.id}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>`).join('')
    || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No courses in the catalog yet.</td></tr>`;
  body.innerHTML = `
    ${!canManage ? lockedNote("You're viewing the course catalog in read-only mode.") : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddCourse">${ICONS.plus} Add Course</button>` : ''}
    <table><thead><tr><th>Course</th><th>Category</th><th>Classification</th><th>Recertification</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  `;
  const addBtn = document.getElementById('btnAddCourse');
  if(addBtn) addBtn.addEventListener('click', ()=>openCourseFormModal(null));
  document.querySelectorAll('[data-edit-course]').forEach(b=>b.addEventListener('click', ()=>openCourseFormModal(b.dataset.editCourse)));
  document.querySelectorAll('[data-del-course]').forEach(b=>b.addEventListener('click', ()=>{
    const c = STATE.pm.trainingCourses.find(x=>x.id===b.dataset.delCourse);
    const inUse = STATE.pm.trainingRecords.some(t=>t.courseId===c.id) || STATE.pm.trainingRequests.some(r=>r.courseId===c.id);
    if(inUse){ toast("Can't delete a course that has training records or requests linked to it.", true); return; }
    if(!confirm(`Delete "${c.name}" from the course catalog?`)) return;
    STATE.pm.trainingCourses = STATE.pm.trainingCourses.filter(x=>x.id!==c.id);
    logActivity(`Deleted course "${c.name}" from the catalog.`, "training_course", c.id);
    persist();
    renderTrainingSubtab();
  }));
}

function openCourseFormModal(existingId){
  const editing = !!existingId;
  const c = editing ? STATE.pm.trainingCourses.find(x=>x.id===existingId) : {
    name:"", category: STATE.pm.refData.trainingCategories[0], classification:"Recommended", isRequired:false, recertRequired:false, recertIntervalMonths:12,
  };
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Course</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Course Name</label><input type="text" id="fCourseName" value="${escapeHtml(c.name)}" placeholder="e.g. Annual Firearms Qualification"></div>
      <div class="form-2col">
        <div class="form-row"><label>Category</label><select id="fCourseCategory">${STATE.pm.refData.trainingCategories.map(cat=>`<option ${c.category===cat?'selected':''}>${escapeHtml(cat)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Classification</label><select id="fCourseClassification"><option ${c.classification==='Required'?'selected':''}>Required</option><option ${c.classification==='Recommended'?'selected':''}>Recommended</option></select></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fCourseIsRequired" ${c.isRequired?'checked':''} style="width:auto;">Counts toward mandatory training compliance</label>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fCourseRecertRequired" ${c.recertRequired?'checked':''} style="width:auto;">Recertification required</label>
      </div>
      <div class="form-row" id="fCourseRecertWrap" style="${c.recertRequired?'':'display:none;'}"><label>Recertify every (months)</label><input type="number" id="fCourseRecertMonths" value="${c.recertIntervalMonths||12}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add Course'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fCourseRecertRequired').addEventListener('change', e=>{ document.getElementById('fCourseRecertWrap').style.display = e.target.checked?'':'none'; });
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fCourseName').value.trim();
    if(!name){ toast("Enter a course name.", true); return; }
    const recertRequired = document.getElementById('fCourseRecertRequired').checked;
    const data = {
      name, category: document.getElementById('fCourseCategory').value, classification: document.getElementById('fCourseClassification').value,
      isRequired: document.getElementById('fCourseIsRequired').checked, recertRequired,
      recertIntervalMonths: recertRequired ? (Number(document.getElementById('fCourseRecertMonths').value)||12) : null,
    };
    if(editing){ Object.assign(c, data); logActivity(`Updated course "${name}" in the catalog.`, "training_course", c.id); }
    else { const newC = {id:'crs'+Date.now(), ...data}; STATE.pm.trainingCourses.push(newC); logActivity(`Added course "${name}" to the catalog.`, "training_course", newC.id); }
    persist();
    toast("Course saved.");
    closeModal();
    renderTrainingSubtab();
  };
}

function renderTrainingRequestsSub(body){
  const canManage = can('pm_training_manage') || can('pm_instructor_manage');
  const canRequest = can('pm_training_request');
  const list = STATE.pm.trainingRequests.slice().sort((a,b)=>b.requestDate.localeCompare(a.requestDate));
  const rows = list.map(r=>{
    const course = STATE.pm.trainingCourses.find(c=>c.id===r.courseId);
    const session = r.sessionId ? STATE.pm.trainingSessions.find(s=>s.id===r.sessionId) : null;
    return `<tr>
      <td>${recordLink(r.personId)}</td><td>${(course ? escapeHtml(course.name) : '—')}</td>
      <td>${session ? `${session.date} <span style="color:var(--text-dim);">(${escapeHtml(session.location)})</span>` : '<span style="color:var(--text-dim);">General interest</span>'}</td>
      <td>${r.requestDate}</td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span>${r.reviewedBy?`<div style="font-size:10.5px;color:var(--text-dim);margin-top:2px;">by ${escapeHtml(r.reviewedBy)}</div>`:''}</td>
      <td>${canManage && r.status==='Pending' ? `<button class="btn btn-sm btn-outline" data-approve-treq="${r.id}">Approve</button> <button class="btn btn-sm btn-danger" data-deny-treq="${r.id}">Deny</button>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No training requests yet.</td></tr>`;
  body.innerHTML = `
    ${canRequest ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnRequestTraining">${ICONS.plus} Request Training</button>` : ''}
    <table><thead><tr><th>Employee</th><th>Course</th><th>Requested Session</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
  `;
  const reqBtn = document.getElementById('btnRequestTraining');
  if(reqBtn) reqBtn.addEventListener('click', ()=>openTrainingRequestFormModal());
  document.querySelectorAll('[data-approve-treq]').forEach(b=>b.addEventListener('click', ()=>{
    const r = STATE.pm.trainingRequests.find(x=>x.id===b.dataset.approveTreq);
    r.status='Approved'; r.reviewedBy = personName(CURRENT_USER_ID); r.reviewDate = fmt(new Date());
    if(r.sessionId){
      const session = STATE.pm.trainingSessions.find(s=>s.id===r.sessionId);
      if(session && !session.roster.some(x=>x.personId===r.personId)){
        session.roster.push({personId: r.personId, status:"Confirmed", requestId: r.id});
      }
      logActivity(`Approved and confirmed ${personName(r.personId)}'s enrollment in ${sessionCourse(session).name}.`, "training_request", r.id);
      toast("Request approved and person confirmed on the session roster.");
    } else {
      logActivity(`Approved training request for ${personName(r.personId)}.`, "training_request", r.id);
      toast("Request approved. Schedule a session and add them to its roster when one's ready.");
    }
    persist(); renderTrainingSubtab();
  }));
  document.querySelectorAll('[data-deny-treq]').forEach(b=>b.addEventListener('click', ()=>{
    const r = STATE.pm.trainingRequests.find(x=>x.id===b.dataset.denyTreq);
    r.status='Denied'; r.reviewedBy = personName(CURRENT_USER_ID); r.reviewDate = fmt(new Date());
    logActivity(`Denied training request for ${personName(r.personId)}.`, "training_request", r.id); persist(); renderTrainingSubtab();
  }));
  wireRecordLinks();
}

function openTrainingRequestFormModal(){
  const upcomingForCourse = (courseId)=>STATE.pm.trainingSessions.filter(s=>s.courseId===courseId && s.status==='Scheduled');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Training</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Requesting for</label><select id="fTreqPerson">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===CURRENT_USER_ID?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Course</label><select id="fTreqCourse">${STATE.pm.trainingCourses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Session (optional)</label><select id="fTreqSession"></select>
        <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Pick a specific upcoming date if one's already scheduled, or leave as general interest and the training coordinator will schedule one.</div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fTreqNotes" rows="2" placeholder="Why is this training needed?"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
  const refreshSessionOptions = ()=>{
    const courseId = document.getElementById('fTreqCourse').value;
    const sessions = upcomingForCourse(courseId);
    document.getElementById('fTreqSession').innerHTML =
      `<option value="">General interest \u2014 no specific date yet</option>` +
      sessions.map(s=>`<option value="${s.id}">${s.date} at ${s.location}</option>`).join('');
  };
  openModal();
  refreshSessionOptions();
  document.getElementById('fTreqCourse').addEventListener('change', refreshSessionOptions);
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const personId = document.getElementById('fTreqPerson').value;
    const req = {id:'treq'+Date.now(), personId, courseId: document.getElementById('fTreqCourse').value,
      sessionId: document.getElementById('fTreqSession').value || null,
      requestDate: fmt(new Date()), status:"Pending", notes: document.getElementById('fTreqNotes').value.trim(),
      reviewedBy: null, reviewDate: null, reviewNotes: "",
    };
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
let MY_CAL_YEAR = new Date().getFullYear(), MY_CAL_MONTH = new Date().getMonth();
let MASTER_CAL_YEAR = new Date().getFullYear(), MASTER_CAL_MONTH = new Date().getMonth();

function sessionCourse(s){ return STATE.pm.trainingCourses.find(c=>c.id===s.courseId); }
function sessionInstructor(s){ return STATE.pm.instructors.find(i=>i.id===s.instructorId); }
function rosterStatusBadgeClass(status){
  return {"Enrolled":"badge-role","Confirmed":"badge-assigned","Attended":"badge-available","No-Show":"badge-missing","Excused":"badge-role"}[status] || "badge-role";
}
function sessionStatusColor(s){
  if(s.status==="Cancelled") return "var(--red)";
  if(s.status==="Completed") return "var(--text-dim)";
  return "var(--blue)";
}

function renderCalendarSub(body, lockedPersonId){
  const isMaster = !lockedPersonId;
  const canSchedule = can('pm_instructor_manage');
  let year, month;
  if(isMaster){ year = MASTER_CAL_YEAR; month = MASTER_CAL_MONTH; } else { year = MY_CAL_YEAR; month = MY_CAL_MONTH; }

  const sessions = STATE.pm.trainingSessions.filter(s=>isMaster || s.roster.some(r=>r.personId===lockedPersonId));
  const monthStr = String(month+1).padStart(2,'0');
  const inMonth = sessions.filter(s=>s.date.startsWith(`${year}-${monthStr}`));
  // "My Calendar" also surfaces the logged-in person's own subpoena court dates, from the separate
  // Subpoena Management module -- the master calendar here stays training-only by design, since
  // Subpoena Management has its own dedicated department-wide master calendar.
  const mySubpoenas = (!isMaster && STATE.subpoena && can('subpoena_view_own'))
    ? STATE.subpoena.subpoenas.filter(s=>s.personId===lockedPersonId && s.status!=="Cancelled" && s.courtDate.startsWith(`${year}-${monthStr}`))
    : [];
  // "My Calendar" also surfaces the person's own duty roster assignment -- which days they're
  // actually on shift per their pattern's rotation -- and any day-off exception (RDO/VDO/CDO/
  // SDO/TDO) that overrides it. Same department-wide-vs-personal split as the subpoena block above.
  const myScheduleAssignments = (!isMaster && STATE.pm.scheduleAssignments) ? STATE.pm.scheduleAssignments.filter(a=>a.personId===lockedPersonId) : [];
  const mySpecialEvents = !isMaster ? (STATE.pm.specialEvents||[]).filter(e=>e.status!=='cancelled'&&(e.requests||[]).some(r=>r.personId===lockedPersonId&&r.status==='awarded')) : [];

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const monthName = firstOfMonth.toLocaleString('en-US', {month:'long'});

  const byDate = {};
  inMonth.forEach(s=>{ (byDate[s.date] = byDate[s.date]||[]).push(s); });
  const subByDate = {};
  mySubpoenas.forEach(s=>{ (subByDate[s.courtDate] = subByDate[s.courtDate]||[]).push(s); });

  let cells = '';
  for(let i=0;i<startWeekday;i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2,'0')}`;
    const todays = byDate[dateStr] || [];
    const todaysSubpoenas = subByDate[dateStr] || [];
    const isToday = dateStr === fmt(new Date());
    let dutyTag = '', exceptionTag = '', coverageTag = '';
    const specialTag=mySpecialEvents.filter(e=>e.startDate<=dateStr&&(e.endDate||e.startDate)>=dateStr).map(e=>`<a href="#" data-cal-personal-special-event="${e.id}" class="cal-event" style="background:var(--blue-soft);color:var(--blue);border-left:3px solid var(--blue);">${escapeHtml(e.name)} (${SuiteUX.displayTimeOnly(e.startTime)} - ${SuiteUX.displayTimeOnly(e.endTime)})</a>`).join('');
    if(!isMaster){
      const myException = activeExceptionFor(lockedPersonId, dateStr);
      const myCoverage = (STATE.pm.scheduleCoverages||[]).find(c=>c.personId===lockedPersonId && c.date===dateStr);
      if(myException){
        const code = exceptionCodeInfo(myException.code);
        exceptionTag = `<a href="#" data-cal-duty-exception-event="${myException.id}" class="cal-event" style="background:${code.color}22;color:${code.color};border-left:3px solid ${code.color};" title="${escapeHtml(code.name)}">${escapeHtml(myException.code+' \u2014 '+code.name)}</a>`;
      } else {
        const myDuty = myScheduleAssignments.find(a=>isOnDutyOnDate(a, STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId), dateStr));
        if(myDuty){
          const shift = STATE.pm.scheduleShifts.find(s=>s.id===myDuty.shiftId);
          const color = shift ? shiftColor(shift) : 'var(--blue)';
          const label = shift ? `${shift.name} (${SuiteUX.displayTimeOnly(shift.hoursStart)} - ${SuiteUX.displayTimeOnly(shift.hoursEnd)})` : 'Shift';
          dutyTag = `<a href="#" data-cal-duty-event="${myDuty.id}" class="cal-event" style="background:${color}22;color:${color};border-left:3px solid ${color};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
        }
      }
      if(myCoverage){
        const shift = STATE.pm.scheduleShifts.find(s=>s.id===myCoverage.shiftId);
        const label = shift ? `Covering: ${shift.name} (${SuiteUX.displayTimeOnly(shift.hoursStart)} - ${SuiteUX.displayTimeOnly(shift.hoursEnd)})` : 'Covering a shift';
        coverageTag = `<a href="#" class="cal-event" style="background:${SWAP_COVERAGE_COLOR}22;color:${SWAP_COVERAGE_COLOR};border-left:3px solid ${SWAP_COVERAGE_COLOR};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
      }
    }
    cells += `<div class="cal-cell ${isToday?'cal-cell-today':''}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday+d-1)%7]}">${d}</div>
      ${specialTag}
      ${coverageTag}
      ${dutyTag}
      ${exceptionTag}
      ${todays.map(s=>{
        const course = sessionCourse(s);
        const mine = !isMaster ? (s.roster.find(r=>r.personId===lockedPersonId)||{}).status : null;
        return `<a href="#" data-cal-event="${s.id}" class="cal-event" style="background:${sessionStatusColor(s)}22;color:${sessionStatusColor(s)};border-left:3px solid ${sessionStatusColor(s)};" title="${escapeHtml(course?course.name:'')}">${escapeHtml(course?course.name:'Session')}${mine?` (${mine})`:''}</a>`;
      }).join('')}
      ${todaysSubpoenas.map(s=>`<a href="#" data-cal-subpoena-event="${s.id}" class="cal-event" style="background:#8B5CF622;color:#8B5CF6;border-left:3px solid #8B5CF6;" title="Subpoena \u2014 ${escapeHtml(s.caseNumber)}">\u2696 ${escapeHtml(s.caseNumber)}</a>`).join('')}
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
    ${!isMaster ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Showing your assigned shifts and special assignments, any day-off exception (RDO/VDO/CDO/SDO/TDO), every training session you're enrolled in, confirmed for, or have attended${mySubpoenas.length ? ', plus any subpoena court dates (\u2696)' : ''}. Click an event for full details.</div>` : `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Every scheduled training session across the department. Click an event to manage its roster and take roll call.</div>`}
    <div class="cal-grid-head">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div>${d}</div>`).join('')}
    </div>
    <div class="cal-grid">${cells}</div>
  `;
  body.querySelectorAll('[data-cal-personal-special-event]').forEach(a=>a.addEventListener('click',ev=>{ev.preventDefault();openSpecialEventDetail(mySpecialEvents.find(e=>e.id===a.dataset.calPersonalSpecialEvent));}));
  body.querySelectorAll('[data-cal-subpoena-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const id = a.dataset.calSubpoenaEvent;
    enterModule('subpoena');
    setTimeout(()=>{ SUBPOENA.switchView('subpoena-mine'); SUBPOENA.openSubpoenaDetail(id); }, 60);
  }));
  body.querySelectorAll('[data-cal-duty-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    if(!can('pm_schedule_manage')){ toast("Contact your scheduling admin to change a shift assignment.", true); return; }
    const assign = STATE.pm.scheduleAssignments.find(x=>x.id===a.dataset.calDutyEvent);
    if(assign) openAssignmentFormModal(assign);
  }));
  body.querySelectorAll('[data-cal-duty-exception-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    if(!can('pm_schedule_manage')){ toast("Contact your scheduling admin about this entry.", true); return; }
    const exception = STATE.pm.scheduleExceptions.find(x=>x.id===a.dataset.calDutyExceptionEvent);
    if(exception) openExceptionFormModal(exception);
  }));
  body.querySelectorAll('[data-cal-nav]').forEach(b=>b.addEventListener('click', ()=>{
    const dir = b.dataset.calNav;
    let y = isMaster?MASTER_CAL_YEAR:MY_CAL_YEAR, m = isMaster?MASTER_CAL_MONTH:MY_CAL_MONTH;
    if(dir==='prev'){ m--; if(m<0){m=11;y--;} }
    else if(dir==='next'){ m++; if(m>11){m=0;y++;} }
    else { y = new Date().getFullYear(); m = new Date().getMonth(); }
    if(isMaster){ MASTER_CAL_YEAR=y; MASTER_CAL_MONTH=m; } else { MY_CAL_YEAR=y; MY_CAL_MONTH=m; }
    renderCalendarSub(body, lockedPersonId);
  }));
  body.querySelectorAll('[data-cal-event]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openSessionDetailModal(a.dataset.calEvent); }));
  const scheduleBtn = document.getElementById('btnScheduleSession');
  if(scheduleBtn) scheduleBtn.addEventListener('click', ()=>openSessionFormModal(null));
}

function openSessionFormModal(existingId){
  ensureTrainingLocationsShape();
  const editing = !!existingId;
  const s = editing ? STATE.pm.trainingSessions.find(x=>x.id===existingId) : {
    courseId: STATE.pm.trainingCourses[0].id, instructorId: STATE.pm.instructors[0].id,
    location: STATE.pm.refData.trainingLocations[0]?.name || '', address: STATE.pm.refData.trainingLocations[0]?.address || '',
    date: fmt(new Date()), startTime:"09:00", endTime:"12:00",
    capacity: 20, status:"Scheduled", notes:"", roster:[],
  };
  document.getElementById('modalBox').className = 'modal modal-xl';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Schedule'} Training Session</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Course</label><select id="fSessCourse">${STATE.pm.trainingCourses.map(c=>`<option value="${c.id}" ${s.courseId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Instructor</label><select id="fSessInstructor">${STATE.pm.instructors.map(i=>`<option value="${i.id}" ${s.instructorId===i.id?'selected':''}>${escapeHtml(i.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><select id="fSessLocation">${STATE.pm.refData.trainingLocations.map(l=>`<option ${s.location===l.name?'selected':''}>${escapeHtml(l.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Status</label><select id="fSessStatus"><option ${s.status==='Scheduled'?'selected':''}>Scheduled</option><option ${s.status==='Completed'?'selected':''}>Completed</option><option ${s.status==='Cancelled'?'selected':''}>Cancelled</option></select></div>
      </div>
      <div class="form-row"><label>Street Address <span style="font-weight:400;color:var(--text-dim);">(fills in from the location above; edit it for a one-off venue)</span></label><input type="text" id="fSessAddress" value="${escapeHtml(s.address||'')}" placeholder="e.g. 455 E 2nd St, Reno, NV 89502"></div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Date</label><input type="date" id="fSessDate" value="${s.date}"></div>
        <div class="form-row"><label>Start Time</label><input type="time" id="fSessStart" value="${s.startTime}"></div>
        <div class="form-row"><label>End Time</label><input type="time" id="fSessEnd" value="${s.endTime}"></div>
      </div>
      <div class="form-row"><label>Capacity</label><input type="number" id="fSessCapacity" value="${s.capacity||''}" placeholder="Optional seat limit"></div>
      <div class="form-row"><label>Notes</label><textarea id="fSessNotes" rows="2">${escapeHtml(s.notes||'')}</textarea></div>
      <div class="form-row"><label>Assign Attendees</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:200px;overflow-y:auto;">
          ${STATE.personnel.map(p=>`<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:4px 0;"><input type="checkbox" class="fSessAttendee" value="${p.id}" ${s.roster.some(r=>r.personId===p.id)?'checked':''} style="width:auto;">${escapeHtml(p.name)}</label>`).join('')}
        </div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Schedule Session'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fSessLocation').addEventListener('change', (e)=>{
    const loc = STATE.pm.refData.trainingLocations.find(l=>l.name===e.target.value);
    document.getElementById('fSessAddress').value = loc?.address || '';
  });
  document.getElementById('mSave').onclick = ()=>{
    const selectedIds = Array.from(document.querySelectorAll('.fSessAttendee:checked')).map(el=>el.value);
    const data = {
      courseId: document.getElementById('fSessCourse').value, instructorId: document.getElementById('fSessInstructor').value,
      location: document.getElementById('fSessLocation').value, address: document.getElementById('fSessAddress').value.trim(),
      status: document.getElementById('fSessStatus').value,
      date: document.getElementById('fSessDate').value, startTime: document.getElementById('fSessStart').value, endTime: document.getElementById('fSessEnd').value,
      capacity: document.getElementById('fSessCapacity').value ? Number(document.getElementById('fSessCapacity').value) : null,
      notes: document.getElementById('fSessNotes').value.trim(),
    };
    if(editing){
      // preserve existing roster statuses for people still selected; add newcomers as Enrolled; drop unselected
      const preserved = s.roster.filter(r=>selectedIds.includes(r.personId));
      const newOnes = selectedIds.filter(id=>!s.roster.some(r=>r.personId===id)).map(personId=>({personId, status:"Enrolled", requestId:null}));
      Object.assign(s, data, {roster: [...preserved, ...newOnes]});
      logActivity(`Updated training session: ${sessionCourse(s).name} on ${s.date}.`, "training_session", s.id);
      toast("Session saved.");
    } else {
      const newS = {id:'sess'+Date.now(), roster: selectedIds.map(personId=>({personId, status:"Enrolled", requestId:null})), ...data};
      STATE.pm.trainingSessions.push(newS);
      logActivity(`Scheduled new training session: ${sessionCourse(newS).name} on ${newS.date}.`, "training_session", newS.id);
      toast("Session scheduled.");
    }
    persist();
    closeModal();
    renderTrainingSubtab();
  };
}

function openSessionDetailModal(sessionId){
  const s = STATE.pm.trainingSessions.find(x=>x.id===sessionId);
  if(!s){ closeModal(); return; }
  const course = sessionCourse(s);
  const instructor = sessionInstructor(s);
  const canManage = can('pm_instructor_manage');
  const isMyOwnRow = s.roster.find(r=>r.personId===CURRENT_USER_ID);
  const locationValue = s.address
    ? `${escapeHtml(s.location)}<br><a href="${mapsUrlFor(s.address)}" target="_blank" rel="noopener" style="color:var(--blue);">${escapeHtml(s.address)}</a>`
    : escapeHtml(s.location);

  document.getElementById('modalBox').className = 'modal modal-xl';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head">
      <div>
        <h3 style="margin-bottom:2px;">${escapeHtml(course?course.name:'Training Session')}</h3>
        <div style="font-size:11.5px;color:var(--text-dim);">${s.date} &bull; ${s.startTime}&ndash;${s.endTime} &bull; ${escapeHtml(s.location)}</div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div class="modal-body">
      ${canManage ? `<div style="text-align:right;margin-bottom:10px;"><button class="btn btn-sm btn-outline" id="btnShowSessionQr">${ICONS.qr||ICONS.download||''} Generate Check-In QR Code</button></div>` : ''}
      <div class="detail-grid" style="margin-bottom:16px;">
        <div><div class="k">Course</div><div class="v">${(course ? escapeHtml(course.name) : '—')}</div></div>
        <div><div class="k">Category</div><div class="v">${(course ? escapeHtml(course.category) : '—')}</div></div>
        <div><div class="k">Instructor</div><div class="v">${(instructor ? escapeHtml(instructor.name) : '—')}</div></div>
        <div><div class="k">Location</div><div class="v">${locationValue}</div></div>
        ${s.address ? `<div style="grid-column:1/-1;">${mapPictureHtml(s.address)}</div>` : ''}
        <div><div class="k">Date / Time</div><div class="v">${s.date}, ${s.startTime}&ndash;${s.endTime}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge" style="background:${sessionStatusColor(s)}22;color:${sessionStatusColor(s)};">${s.status}</span></div></div>
        <div><div class="k">Capacity</div><div class="v">${s.roster.length}${s.capacity?' / '+s.capacity:''} enrolled</div></div>
        ${isMyOwnRow ? `<div><div class="k">Your Status</div><div class="v"><span class="badge ${rosterStatusBadgeClass(isMyOwnRow.status)}">${isMyOwnRow.status}</span></div></div>` : ''}
      </div>
      ${s.notes ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Notes</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(s.notes)}</div></div>` : ''}
      ${canManage && STATE.pm.trainingCheckins.some(c=>c.sessionId===s.id && !c.applied) ? `
      <div class="panel" style="box-shadow:none;border-color:var(--gold);">
        <div class="panel-head"><h2>Pending Self Check-Ins</h2><button class="btn btn-sm btn-outline" id="btnApplyAllCheckins">Apply All</button></div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Name</th><th>Checked In</th><th></th></tr></thead><tbody>
          ${STATE.pm.trainingCheckins.filter(c=>c.sessionId===s.id && !c.applied).map(c=>`
            <tr><td>${recordLink(c.personId)}</td><td>${new Date(c.checkedInAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</td>
            <td><button class="btn btn-sm btn-primary" data-apply-checkin="${c.id}">Apply to Roster</button></td></tr>`).join('')}
          </tbody></table>
        </div>
      </div>` : ''}
      <div class="panel" style="box-shadow:none;">
        <div class="panel-head"><h2>Roster ${canManage ? '&amp; Roll Call' : ''}</h2>
          ${canManage ? `<div style="display:flex;gap:8px;"><button class="btn btn-sm btn-outline" id="btnAddAttendee">${ICONS.plus} Add Attendee</button><button class="btn btn-sm btn-outline" id="btnMarkAllAttended">Mark All Attended</button></div>` : ''}
        </div>
        <div class="panel-body" style="padding:0;">
          <table><thead><tr><th>Name</th><th>Status</th>${canManage?'<th></th>':''}</tr></thead><tbody>
          ${s.roster.map((r,i)=>`
            <tr><td>${recordLink(r.personId)}</td>
            <td>${canManage
              ? `<select data-roster-status="${i}"><option value="Enrolled" ${r.status==='Enrolled'?'selected':''}>Enrolled</option><option value="Confirmed" ${r.status==='Confirmed'?'selected':''}>Confirmed</option><option value="Attended" ${r.status==='Attended'?'selected':''}>Attended</option><option value="No-Show" ${r.status==='No-Show'?'selected':''}>No-Show</option><option value="Excused" ${r.status==='Excused'?'selected':''}>Excused</option></select>`
              : `<span class="badge ${rosterStatusBadgeClass(r.status)}">${r.status}</span>`}</td>
            ${canManage?`<td><button class="btn-icon" data-remove-attendee="${i}">${ICONS.trash}</button></td>`:''}
            </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No one enrolled yet.</td></tr>`}
          </tbody></table>
        </div>
      </div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditSessionFromDetail" style="margin-top:12px;">${ICONS.edit} Edit Session</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  SuiteCalendarExports.attach(s,course,instructor);
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  wireRecordLinks();
  const editBtn = document.getElementById('btnEditSessionFromDetail');
  if(editBtn) editBtn.addEventListener('click', ()=>{ closeModal(); openSessionFormModal(s.id); });
  const qrBtn = document.getElementById('btnShowSessionQr');
  if(qrBtn) qrBtn.addEventListener('click', ()=>openSessionQrModal(s.id));
  document.querySelectorAll('[data-apply-checkin]').forEach(b=>b.addEventListener('click', ()=>{
    applyCheckin(b.dataset.applyCheckin);
    openSessionDetailModal(sessionId);
  }));
  const applyAllBtn = document.getElementById('btnApplyAllCheckins');
  if(applyAllBtn) applyAllBtn.addEventListener('click', ()=>{
    STATE.pm.trainingCheckins.filter(c=>c.sessionId===s.id && !c.applied).forEach(c=>applyCheckin(c.id));
    openSessionDetailModal(sessionId);
  });
  if(canManage){
    document.querySelectorAll('[data-roster-status]').forEach(sel=>sel.addEventListener('change', ()=>{
      const idx = Number(sel.dataset.rosterStatus);
      s.roster[idx].status = sel.value;
      logActivity(`Marked ${personName(s.roster[idx].personId)} as ${sel.value} for ${course?course.name:'a session'}.`, "training_session", s.id);
      persist();
    }));
    document.querySelectorAll('[data-remove-attendee]').forEach(b=>b.addEventListener('click', ()=>{
      const idx = Number(b.dataset.removeAttendee);
      const removed = s.roster.splice(idx,1)[0];
      logActivity(`Removed ${personName(removed.personId)} from ${course?course.name:'a session'}.`, "training_session", s.id);
      persist();
      openSessionDetailModal(sessionId);
    }));
    const addBtn = document.getElementById('btnAddAttendee');
    if(addBtn) addBtn.addEventListener('click', ()=>openAddAttendeeModal(s));
    const markAllBtn = document.getElementById('btnMarkAllAttended');
    if(markAllBtn) markAllBtn.addEventListener('click', ()=>{
      s.roster.forEach(r=>r.status='Attended');
      logActivity(`Marked all attendees as Attended for ${course?course.name:'a session'}.`, "training_session", s.id);
      persist();
      openSessionDetailModal(sessionId);
    });
  }
}

function openAddAttendeeModal(s){
  const available = STATE.personnel.filter(p=>!s.roster.some(r=>r.personId===p.id));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Attendee</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Person</label><select id="fAddAttendee">${available.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') || '<option value="">Everyone is already enrolled</option>'}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const personId = document.getElementById('fAddAttendee').value;
    if(!personId) return;
    s.roster.push({personId, status:"Enrolled", requestId:null});
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
function checkinSourceTimeZone(){
  // The agency's own configured timezone is the correct frame for a training session's stored
  // date/time -- NOT whatever timezone the device doing the scanning happens to be set to. Without
  // this, someone scanning from a phone set to a different timezone than the agency (or just a
  // browser with a different system clock zone) would have the window computed against the wrong
  // local time entirely, making a session that's actually in progress look closed, or vice versa.
  try{ return TenantPlatform?.tenant?.()?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch{ return 'UTC'; }
}
function checkinZonedInstant(date, time, zone){
  // Converts a date+time pair, understood as being IN `zone`, into the one real, absolute instant
  // it actually represents -- the same iterative correction already used elsewhere in this app for
  // calendar and roll-call display, so a session's start/end time means the same real moment no
  // matter which timezone the person checking a calendar or scanning a QR code happens to be in.
  const [y,m,d] = date.split('-').map(Number), [h,minute] = time.split(':').map(Number), target = Date.UTC(y,m-1,d,h,minute);
  let utc = target;
  try{
    const partsFormatter = new Intl.DateTimeFormat('en-US', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
    for(let i=0;i<2;i++){
      const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(utc)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
      const represented = Date.UTC(Number(parts.year), Number(parts.month)-1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      utc -= represented - target;
    }
    return new Date(utc);
  }catch{ return new Date(`${date}T${time}:00`); }
}
function sessionCheckinWindow(s){
  const zone = checkinSourceTimeZone();
  const graceMs = 30*60*1000;
  const opensAt = new Date(checkinZonedInstant(s.date, s.startTime, zone).getTime() - graceMs);
  const closesAt = new Date(checkinZonedInstant(s.date, s.endTime, zone).getTime() + graceMs);
  const now = new Date(); // always a genuine absolute instant, safe to compare against either boundary above regardless of the device's own local timezone
  return { opensAt, closesAt, isOpen: now>=opensAt && now<=closesAt };
}
function sessionCheckinUrl(s){
  return location.origin + location.pathname + '#/checkin/' + s.id;
}
function openSessionQrModal(sessionId){
  const s = STATE.pm.trainingSessions.find(x=>x.id===sessionId);
  if(!s){ closeModal(); return; }
  const course = sessionCourse(s);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head no-print"><h3>Check-In QR Code</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body" style="text-align:center;">
      <h2 style="margin-bottom:2px;">${escapeHtml(course?course.name:'Training Session')}</h2>
      <div style="font-size:13px;color:var(--text-dim);margin-bottom:16px;">${s.date} &bull; ${s.startTime}&ndash;${s.endTime} &bull; ${escapeHtml(s.location)}</div>
      <div id="sessionQrTarget" style="display:inline-block;padding:16px;background:#fff;border-radius:8px;"></div>
      <div style="font-size:11.5px;color:var(--text-dim);margin-top:14px;">Scan with a phone camera, or open the app and use "Check In" if the PWA is installed.<br>Active from ${sessionCheckinWindow(s).opensAt.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} to ${sessionCheckinWindow(s).closesAt.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}.</div>
    </div>
    <div class="modal-foot no-print"><button class="btn btn-outline" id="mCancel">Close</button><button class="btn btn-primary" id="btnPrintQr">${ICONS.download} Print / Save as PDF</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('btnPrintQr').onclick = ()=>window.print();
  // QRCode.js draws directly into the target element -- no canvas id or extra wiring needed.
  new QRCode(document.getElementById('sessionQrTarget'), {
    text: sessionCheckinUrl(s), width: 220, height: 220, colorDark:"#000000", colorLight:"#ffffff",
  });
}
async function openCheckinFlow(sessionId){
  const s = STATE.pm.trainingSessions.find(x=>x.id===sessionId);
  const me = STATE.personnel.find(p=>p.id===CURRENT_USER_ID);
  document.getElementById('modalBox').className = 'modal';
  const shell = (title, body) => {
    document.getElementById('modalBox').innerHTML = `
      <div class="modal-head"><h3>${title}</h3><button class="modal-close" id="mClose">&times;</button></div>
      <div class="modal-body" style="text-align:center;padding:24px 20px;">${body}</div>
      <div class="modal-foot"><button class="btn btn-primary" id="mCancel">Done</button></div>
    `;
    openModal();
    document.getElementById('mClose').onclick = closeModal;
    document.getElementById('mCancel').onclick = closeModal;
  };
  if(!s){ shell("Check-In", `<p>This check-in code doesn't match any training session on file. It may have been for a session that's since been removed.</p>`); return; }
  if(!me){ shell("Check-In", `<p>No personnel record is linked to this account, so a check-in can't be tied to an employee.</p>`); return; }
  if(!can('pm_training_checkin_submit')){ shell("Check-In Not Available", `<p>Your current role doesn't include training check-in. Ask an administrator to enable it in Roles &amp; Abilities if you believe this is a mistake.</p>`); return; }
  const course = sessionCourse(s);
  const win = sessionCheckinWindow(s);
  if(!win.isOpen){
    const now = new Date();
    const msg = now < win.opensAt
      ? `This code isn't active yet. It opens at ${win.opensAt.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} on ${s.date}.`
      : `This code is no longer active. It closed at ${win.closesAt.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})} on ${s.date}. Talk to your training coordinator if you were actually present.`;
    shell("Check-In Closed", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course?course.name:'Training Session')}</p><p style="color:var(--text-dim);">${msg}</p>`);
    return;
  }
  const existing = STATE.pm.trainingCheckins.find(c=>c.sessionId===s.id && c.personId===me.id);
  if(existing){
    shell("Already Checked In", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course?course.name:'Training Session')}</p><p style="color:var(--text-dim);">You checked in at ${new Date(existing.checkedInAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}. ${existing.applied?'Your coordinator has already applied this to the roster.':'Your training coordinator will apply this to the official roster.'}</p>`);
    return;
  }
  // Shown immediately, then replaced once the server actually confirms the save -- the old
  // version showed "You're Checked In" the instant the button was pressed, before any save was
  // even attempted, so a rejected save still told the officer they were checked in.
  shell("Checking In\u2026", `<p style="color:var(--text-dim);">Recording your attendance\u2026</p>`);
  const record = { id:'chk'+Date.now()+Math.random().toString(36).slice(2,6), sessionId:s.id, personId:me.id, checkedInAt:new Date().toISOString(), applied:false };
  const result = await SuiteStore.submitTrainingCheckin(record);
  if(!result.ok){
    shell("Check-In Not Saved", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course?course.name:'Training Session')}</p><p style="color:var(--text-dim);">${escapeHtml(result.error?.message||'Something went wrong saving this check-in.')}</p><p style="color:var(--text-dim);margin-top:8px;">Nothing was recorded. Try scanning again, and tell your training coordinator if it keeps failing.</p>`);
    return;
  }
  logActivity(`${personName(me.id)} self-checked in for ${course?course.name:'a training session'}.`, "training_session", s.id);
  try{ renderNotifBell(); }catch(e){ console.error('renderNotifBell failed after check-in (check-in itself is unaffected):', e); }
  shell("You're Checked In", `<p style="font-weight:700;margin-bottom:6px;">${escapeHtml(course?course.name:'Training Session')}</p><p style="color:var(--text-dim);">Recorded at ${new Date(record.checkedInAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}. Your training coordinator will confirm your attendance on the official roster.</p>`);
}
function applyCheckin(checkinId){
  const c = STATE.pm.trainingCheckins.find(x=>x.id===checkinId);
  if(!c || c.applied) return;
  const s = STATE.pm.trainingSessions.find(x=>x.id===c.sessionId);
  if(!s) return;
  let entry = s.roster.find(r=>r.personId===c.personId);
  if(entry) entry.status = "Attended";
  else s.roster.push({personId:c.personId, status:"Attended", requestId:null});
  c.applied = true;
  logActivity(`Applied self check-in for ${personName(c.personId)} to ${sessionCourse(s).name} \u2014 marked Attended.`, "training_session", s.id);
  persist();
}
function renderInstructorsSub(body){
  const canManage = can('pm_instructor_manage');
  const rows = STATE.pm.instructors.map(ins=>{
    const totalHours = (ins.hoursLogged||[]).reduce((s,h)=>s+h.hours,0);
    return `<tr><td>${escapeHtml(ins.name)}</td><td style="font-size:12.5px;">${escapeHtml(ins.bio)}</td>
    <td>${ins.coursesTaught.map(cid=>{const c=STATE.pm.trainingCourses.find(x=>x.id===cid); return c?escapeHtml(c.name):'';}).join(', ')||'—'}</td>
    <td>${totalHours}</td>
    <td>${canManage ? `<div class="cell-actions"><button class="btn btn-sm btn-outline" data-edit-instructor="${ins.id}">${ICONS.edit} Edit</button><button class="btn btn-sm btn-outline" data-log-hours="${ins.id}">Log Hours</button><button class="btn btn-sm btn-danger" data-del-instructor="${ins.id}">${ICONS.trash} Delete</button></div>` : ''}</td></tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No instructors on file.</td></tr>`;
  body.innerHTML = `
    ${!canManage ? lockedNote("You're viewing the instructor roster in read-only mode.") : ''}
    ${canManage ? `<button class="btn btn-primary btn-sm" style="margin-bottom:12px;" id="btnAddInstructor">${ICONS.plus} Add Instructor</button>` : ''}
    <table><thead><tr><th>Name</th><th>Bio</th><th>Courses Taught</th><th>Total Hours Logged</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
  `;
  const addBtn = document.getElementById('btnAddInstructor');
  if(addBtn) addBtn.addEventListener('click', ()=>openInstructorFormModal(null));
  document.querySelectorAll('[data-edit-instructor]').forEach(b=>b.addEventListener('click', ()=>openInstructorFormModal(b.dataset.editInstructor)));
  document.querySelectorAll('[data-log-hours]').forEach(b=>b.addEventListener('click', ()=>openInstructorHoursModal(b.dataset.logHours)));
  document.querySelectorAll('[data-del-instructor]').forEach(b=>b.addEventListener('click', ()=>{
    const ins = STATE.pm.instructors.find(i=>i.id===b.dataset.delInstructor);
    if(!confirm(`Remove instructor "${ins.name}"? This does not affect training records they've already delivered.`)) return;
    STATE.pm.instructors = STATE.pm.instructors.filter(i=>i.id!==ins.id);
    logActivity(`Removed instructor "${ins.name}".`, "instructor", ins.id);
    persist();
    renderTrainingSubtab();
  }));
}

function openInstructorFormModal(existingId){
  const editing = !!existingId;
  const ins = editing ? STATE.pm.instructors.find(i=>i.id===existingId) : {name:"", bio:"", coursesTaught:[], hoursLogged:[]};
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Instructor</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Name</label><input type="text" id="fInsName" value="${escapeHtml(ins.name)}" placeholder="e.g. Sgt. Maria Torres, or an outside provider"></div>
      <div class="form-row"><label>Bio / Specialty</label><textarea id="fInsBio" rows="2">${escapeHtml(ins.bio||'')}</textarea></div>
      <div class="form-row"><label>Courses Taught</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;max-height:140px;overflow-y:auto;">
          ${STATE.pm.trainingCourses.map(c=>`<label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:2px 0;"><input type="checkbox" class="fInsCourse" value="${c.id}" ${ins.coursesTaught.includes(c.id)?'checked':''} style="width:auto;">${escapeHtml(c.name)}</label>`).join('') || '<div style="color:var(--text-dim);font-size:12px;">No courses in the catalog yet.</div>'}
        </div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add Instructor'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fInsName').value.trim();
    if(!name){ toast("Enter an instructor name.", true); return; }
    const data = { name, bio: document.getElementById('fInsBio').value.trim(), coursesTaught: Array.from(document.querySelectorAll('.fInsCourse:checked')).map(el=>el.value) };
    if(editing){ Object.assign(ins, data); logActivity(`Updated instructor "${name}".`, "instructor", ins.id); }
    else { const newIns = {id:'ins'+Date.now(), hoursLogged:[], ...data}; STATE.pm.instructors.push(newIns); logActivity(`Added instructor "${name}".`, "instructor", newIns.id); }
    persist();
    toast("Instructor saved.");
    closeModal();
    renderTrainingSubtab();
  };
}

function openInstructorHoursModal(instructorId){
  const ins = STATE.pm.instructors.find(i=>i.id===instructorId);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Instructional Hours \u2014 ${escapeHtml(ins.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fInsHoursDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Hours</label><input type="number" id="fInsHours" value="4"></div>
      </div>
      <div class="form-row"><label>Course (optional)</label><select id="fInsHoursCourse"><option value="">General / Not Course-Specific</option>${STATE.pm.trainingCourses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Hours</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const hours = Number(document.getElementById('fInsHours').value)||0;
    if(hours<=0){ toast("Enter a positive number of hours.", true); return; }
    if(!ins.hoursLogged) ins.hoursLogged = [];
    ins.hoursLogged.push({date: document.getElementById('fInsHoursDate').value, hours, courseId: document.getElementById('fInsHoursCourse').value || null});
    logActivity(`Logged ${hours} instructional hours for ${ins.name}.`, "instructor", ins.id);
    persist();
    toast("Hours logged.");
    closeModal();
    renderTrainingSubtab();
  };
}

function renderTrainingSearchSub(body){
  body.innerHTML = `
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="tsName" placeholder="Name">
        <select id="tsUnit"><option value="">Any Unit</option>${STATE.pm.refData.units.map(u=>`<option>${escapeHtml(u)}</option>`).join('')}</select>
        <select id="tsCourse"><option value="">Any Course</option>${STATE.pm.trainingCourses.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select>
        <select id="tsProvider"><option value="">Any Provider</option>${STATE.pm.refData.trainingProviders.map(p=>`<option>${escapeHtml(p)}</option>`).join('')}</select>
        <button class="btn btn-sm btn-outline" id="btnRunTrainingSearch">Search</button>
      </div>
    </div>
    <div id="trainingSearchResults"></div>
  `;
  document.getElementById('btnRunTrainingSearch').addEventListener('click', ()=>{
    const name = document.getElementById('tsName').value.toLowerCase();
    const unit = document.getElementById('tsUnit').value;
    const courseId = document.getElementById('tsCourse').value;
    const provider = document.getElementById('tsProvider').value;
    const results = STATE.pm.trainingRecords.filter(t=>{
      const rec = recordFor(t.personId);
      if(name && !personName(t.personId).toLowerCase().includes(name)) return false;
      if(unit && (!rec || rec.unitId!==unit)) return false;
      if(courseId && t.courseId!==courseId) return false;
      if(provider && t.provider!==provider) return false;
      return true;
    });
    const rows = results.map(t=>`<tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.date}</td><td>${escapeHtml(t.provider)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No matching training records.</td></tr>`;
    document.getElementById('trainingSearchResults').innerHTML = `<table><thead><tr><th>Employee</th><th>Course</th><th>Date</th><th>Provider</th></tr></thead><tbody>${rows}</tbody></table>`;
    wireRecordLinks();
  });
}

function renderComplianceSub(body){
  const required = STATE.pm.trainingCourses.filter(c=>c.isRequired);
  const rows = STATE.pm.records.filter(r=>r.employmentStatus==='Active').map(r=>{
    const missing = required.filter(c=>!STATE.pm.trainingRecords.some(t=>t.personId===r.personId && t.courseId===c.id && t.passed!==false));
    return `<tr><td>${recordLink(r.personId)}</td><td>${missing.length ? missing.map(c=>escapeHtml(c.name)).join(', ') : '<span style="color:var(--green);">Complete</span>'}</td></tr>`;
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
let SCHED_VIEW = 'calendar';
let SCHED_CAL_YEAR = new Date().getFullYear(), SCHED_CAL_MONTH = new Date().getMonth();
let SCHED_CAL_SHIFT = 'all';
let SCHED_DRAFT_PREVIEW_ID = null; // Client-only scheduler preview; never persisted or published.
let SCHED_CAL_WORKGROUPS = [];
let SCHED_CAL_PICKER_OPEN = false;
let SHOW_PAST_SHIFT_PATTERNS = false;
let SCHED_SUBTAB = 'roster';
let OT_LOOKAHEAD_DAYS = 14;
let OT_GAP_SELECTED = null; // {date, shiftId} of the coverage gap currently open in the fill panel
let ROLLCALL_DATE = fmt(new Date());
let ROLLCALL_SHIFT = null; // set to the first visible shift once shifts are known
let BIDDING_CYCLE_ID = null;
let EXTRADUTY_JOB_ID = null;
let EXCEPTIONS_FILTER = { q:'', showPast:false, dateFrom:'', dateTo:'' };
let SWAP_FILTER = { q:'', showPast:false, dateFrom:'', dateTo:'' };

// Collapsible Roster & Patterns cards: default open, remembered per person via the same
// localStorage-backed preferences store the sidebar's own collapsible groups already use.
function schedCardCollapsed(key){ return SuiteUX.preferences.get('schedCardCollapsed.'+key, false); }
function setSchedCardCollapsed(key, val){ SuiteUX.preferences.set('schedCardCollapsed.'+key, val); }
function collapsibleCardHead(key, titleHtml, actionsHtml, hintHtml){
  const collapsed = schedCardCollapsed(key);
  return `<div class="panel-head sched-card-head" data-panel-toggle="${key}" style="cursor:pointer;user-select:none;">
    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
      <svg data-panel-chevron="${key}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;flex-shrink:0;color:var(--text-dim);transition:transform .15s;transform:rotate(${collapsed?'-90deg':'0deg'});"><polyline points="6 9 12 15 18 9"></polyline></svg>
      ${titleHtml}
    </div>
    ${actionsHtml ? `<div data-panel-actions style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">${actionsHtml}</div>` : ''}
  </div>
  ${hintHtml || ''}`;
}
function wireCollapsibleCards(container){
  container.querySelectorAll('[data-panel-toggle]').forEach(head=>{
    const key = head.dataset.panelToggle;
    head.addEventListener('click', ()=>{
      const collapsed = !schedCardCollapsed(key);
      setSchedCardCollapsed(key, collapsed);
      const body = container.querySelector(`[data-panel-body="${key}"]`);
      if(body) body.style.display = collapsed ? 'none' : '';
      const chevron = container.querySelector(`[data-panel-chevron="${key}"]`);
      if(chevron) chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    });
    const actions = head.querySelector('[data-panel-actions]');
    if(actions) actions.addEventListener('click', e=>e.stopPropagation());
  });
}

const WEEKDAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Whether a given assignment has someone on duty on a specific date. Two pattern types:
// - 'rotation' (the original model): a repeating on/off cycle (e.g. "4 on / 3 off") counted
//   forward from the assignment's start date. Cycle length of 0 is treated as always on.
// - 'weekly': fixed days of the week the team always works, plus an optional second set of
//   days worked only every other week (e.g. "Thu-Sat every week, plus every other Wednesday"),
//   anchored to a reference date that's defined to fall on an "on" alternating week.
// Patterns saved before this feature existed have no patternType, so 'rotation' is the default.
function isOnDutyOnDate(assignment, shift, dateStr){
  if(!shift) return false;
  // A pattern itself can have a validity window (it only exists as "the rotation" for a period
  // before a different one takes over), separate from when a given person was assigned to it.
  if(shift.startDate && shift.startDate > dateStr) return false;
  if(shift.endDate && shift.endDate < dateStr) return false;
  if(assignment.startDate > dateStr) return false;
  if(assignment.endDate && assignment.endDate <= dateStr) return false;
  if(shift.patternType === 'weekly'){
    const weekday = new Date(dateStr+'T00:00:00').getDay();
    if((shift.weekdays||[]).includes(weekday)) return true;
    if((shift.altWeekdays||[]).includes(weekday) && shift.altAnchorDate){
      const weeksSince = Math.floor(daysBetween(shift.altAnchorDate, dateStr)/7);
      return (((weeksSince % 2) + 2) % 2) === 0;
    }
    return false;
  }
  const cycle = (Number(shift.daysOn)||0) + (Number(shift.daysOff)||0);
  if(cycle<=0) return true;
  const daysSince = daysBetween(assignment.startDate, dateStr);
  const pos = ((daysSince % cycle) + cycle) % cycle;
  return pos < (Number(shift.daysOn)||0);
}

// A shift pattern's own lifecycle -- rotations get set up for a period (a month, a quarter, six
// months, a year) and then a different pattern takes over. "current" covers patterns with no
// end date at all (open-ended, the common case), so only ones explicitly given a past end date
// count as "past".
function shiftPatternStatus(shift, todayStr){
  todayStr = todayStr || fmt(new Date());
  if(shift.startDate && shift.startDate > todayStr) return 'future';
  if(shift.endDate && shift.endDate < todayStr) return 'past';
  return 'current';
}
// Current patterns first, then future ones (soonest-starting first), with past ones (when
// included at all) last, most-recently-ended first -- used everywhere a person picks a pattern
// from a list, so what's relevant right now is always what they see first.
function sortShiftsForSelection(shifts, todayStr){
  todayStr = todayStr || fmt(new Date());
  const rank = {current:0, future:1, past:2};
  return shifts.slice().sort((a,b)=>{
    const ra = rank[shiftPatternStatus(a,todayStr)], rb = rank[shiftPatternStatus(b,todayStr)];
    if(ra!==rb) return ra-rb;
    if(ra===2) return (b.startDate||'').localeCompare(a.startDate||'');
    return (a.startDate||'').localeCompare(b.startDate||'');
  });
}
function formatShiftDateRange(shift){
  if(!shift.startDate && !shift.endDate) return 'Ongoing';
  const start = shift.startDate ? new Date(shift.startDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Always';
  const end = shift.endDate ? new Date(shift.endDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'ongoing';
  return `${start} \u2013 ${end}`;
}

// Human-readable summary of a pattern's schedule for the Shift Patterns table.
function describeShiftPattern(shift){
  if(shift.patternType === 'weekly'){
    const main = (shift.weekdays||[]).slice().sort().map(d=>WEEKDAY_LABELS[d]).join(', ') || 'No days set';
    const alt = (shift.altWeekdays||[]).slice().sort().map(d=>WEEKDAY_LABELS[d]).join(', ');
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
function exceptionCodeInfo(code){
  const found = (STATE.pm.refData.exceptionCodes||[]).find(c=>c.code===code);
  return found || {name:code, color:'var(--text-dim)'};
}
// Codes selectable for a *new* entry -- excludes expired ones, except we always keep the
// code an in-progress edit is already using so switching tabs on the modal never silently
// discards the existing value.
function selectableExceptionCodes(currentCode){
  const all = STATE.pm.refData.exceptionCodes||[];
  const active = all.filter(c=>c.active!==false);
  if(currentCode && !active.some(c=>c.code===currentCode)){
    const existing = all.find(c=>c.code===currentCode);
    if(existing) return [...active, existing];
  }
  return active;
}
const SWAP_COVERAGE_COLOR = '#0EA5E9';

// The exception (if any) covering a person on a given date, inclusive of both endpoints.
function activeExceptionFor(personId, dateStr){
  return (STATE.pm.scheduleExceptions||[]).find(e=>e.personId===personId && e.startDate<=dateStr && e.endDate>=dateStr) || null;
}

const SHIFT_COLOR_PALETTE = ['#3B82F6','#22C55E','#F97316','#A855F7','#EC4899','#14B8A6','#EAB308','#EF4444','#6366F1','#84CC16'];
// Every shift pattern gets its own color for the calendar. Patterns created from now on get one
// assigned and stored at creation time; patterns that already existed before this feature get a
// color derived deterministically from their id instead, so they still look distinct and stable
// (same pattern always gets the same color) without needing any data migration.
function shiftColor(shift){
  if(shift.color) return shift.color;
  let hash = 0;
  const str = shift.id || shift.name || '';
  for(let i=0;i<str.length;i++){ hash = (hash*31 + str.charCodeAt(i)) >>> 0; }
  return SHIFT_COLOR_PALETTE[hash % SHIFT_COLOR_PALETTE.length];
}

const SCHED_TABS = [
  {key:'roster', label:'Roster & Patterns', ability:'pm_schedule_view'},
  {key:'events', label:'Special Events', ability:['pm_schedule_view','pm_overtime_view']},
  {key:'swaps', label:'Shift Swaps', ability:['pm_schedule_view','pm_leave_request_submit']},
  {key:'timeoff', label:'Time Off Requests', ability:['pm_leave_request_submit','pm_leave_request_approve']},
  {key:'overtime', label:'Overtime & Callback', ability:'pm_overtime_view'},
  {key:'bidding', label:'Bidding & Vacation Picks', ability:'pm_bidding_view'},
  {key:'extraduty', label:'Extra Duty', ability:'pm_extraduty_view'},
  {key:'rollcall', label:'Roll Call', ability:'pm_rollcall_view'},
];
function renderScheduling(){
  if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
  if(!STATE.pm.shiftSwapRequests) STATE.pm.shiftSwapRequests = [];
  if(!STATE.pm.scheduleCoverages) STATE.pm.scheduleCoverages = [];
  if(!STATE.pm.otCallbackOptIns) STATE.pm.otCallbackOptIns = [];
  if(!STATE.pm.bidCycles) STATE.pm.bidCycles = [];
  if(!STATE.pm.extraDutyJobs) STATE.pm.extraDutyJobs = [];
  if(!STATE.pm.extraDutySignups) STATE.pm.extraDutySignups = [];
  if(!STATE.pm.rollCalls) STATE.pm.rollCalls = [];
  if(!STATE.pm.leaveRequests) STATE.pm.leaveRequests = [];
  const visibleTabs = SCHED_TABS.filter(t=>Array.isArray(t.ability) ? t.ability.some(a=>can(a)) : can(t.ability));
  if(!visibleTabs.length){
    document.getElementById('view-pm-scheduling').innerHTML = permissionBlockedView("You don't have permission to view scheduling in this role.");
    return;
  }
  if(!visibleTabs.some(t=>t.key===SCHED_SUBTAB)) SCHED_SUBTAB = visibleTabs[0].key;
  document.getElementById('view-pm-scheduling').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${visibleTabs.map(t=>`<button class="btn btn-sm ${SCHED_SUBTAB===t.key?'btn-primary':'btn-outline'}" data-sched-tab="${t.key}">${t.label}</button>`).join('')}
    </div>
    ${SCHED_SUBTAB==='roster' && ((STATE.pm.scheduleWorkGroups||[]).some(canManageWorkGroup)||isGlobalScheduleAdmin())?`
      <div class="panel" style="margin-bottom:16px;">
        <div class="panel-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;overflow:visible;">
          <h2 style="margin:0;">Work Group Calendars</h2>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div style="position:relative;">
              <button type="button" class="btn btn-sm btn-outline" id="btnManageScheduleGroups" aria-expanded="false" aria-controls="scheduleGroupManager">Manage Calendars ▾</button>
              <div id="scheduleGroupManager" hidden style="position:absolute;right:0;top:calc(100% + 8px);width:320px;max-width:calc(100vw - 32px);z-index:100;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 14px 32px rgba(0,0,0,.25);padding:10px;max-height:360px;overflow-y:auto;">
                ${(STATE.pm.scheduleWorkGroups||[]).filter(canManageWorkGroup).map(g=>`<div style="display:flex;gap:6px;align-items:center;justify-content:space-between;padding:6px 4px;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;min-width:0;overflow-wrap:anywhere;">${escapeHtml(g.name)}${g.active===false?' (Inactive)':''}</span>
                  <div style="display:flex;gap:5px;flex-shrink:0;">
                    ${isGlobalScheduleAdmin()?`<button type="button" class="btn btn-sm btn-outline" data-schedule-group-edit="${g.id}" aria-label="Edit ${escapeHtml(g.name)} calendar">Edit</button>`:''}
                    <button type="button" class="btn btn-sm btn-danger" data-schedule-group-delete="${g.id}" aria-label="Delete ${escapeHtml(g.name)} calendar" title="Delete ${escapeHtml(g.name)} calendar" style="display:inline-flex;align-items:center;justify-content:center;padding:6px 9px;"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg></button>
                  </div>
                </div>`).join('')}
              </div>
            </div>
            ${isGlobalScheduleAdmin()?'<button type="button" class="btn btn-primary btn-sm" id="btnNewScheduleGroup">New Calendar</button>':''}
          </div>
        </div>
      </div>`:''}
    <div id="schedSubBody"></div>
    ${can('pm_admin_categories')&&isGlobalScheduleAdmin()?'<div style="margin-top:28px;padding-top:16px;border-top:1px solid var(--border);"><button type="button" class="panel" id="scheduleAdmin" style="display:block;width:100%;max-width:330px;padding:20px;text-align:left;cursor:pointer;color:var(--heading);font:inherit;"><strong>Administration</strong><div style="font-size:12px;color:var(--text-dim);margin-top:10px">Time off codes and scheduling settings</div></button></div>':''}
  `;
  document.querySelectorAll('[data-sched-tab]').forEach(b=>b.addEventListener('click', ()=>{ SCHED_SUBTAB=b.dataset.schedTab; renderScheduling(); }));
  document.getElementById('scheduleAdmin')?.addEventListener('click',()=>switchView('sched-settings'));
  document.getElementById('btnNewScheduleGroup')?.addEventListener('click',()=>openWorkGroupAccessModal({id:'wg'+Date.now()+Math.random().toString(36).slice(2,6),name:'',active:true,visibility:'unit',unitNames:[],viewerIds:[],managerIds:[]},true));
  document.getElementById('btnManageScheduleGroups')?.addEventListener('click',()=>{
    const panel=document.getElementById('scheduleGroupManager'),btn=document.getElementById('btnManageScheduleGroups');
    panel.hidden=!panel.hidden;
    btn.setAttribute('aria-expanded',String(!panel.hidden));
    btn.textContent=panel.hidden?'Manage Calendars ▾':'Manage Calendars ▴';
  });
  document.getElementById('scheduleGroupManager')?.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',function closeScheduleManager(e){
    const menu=document.getElementById('scheduleGroupManager');
    const toggle=document.getElementById('btnManageScheduleGroups');
    if(menu&&!menu.hidden&&toggle&&!toggle.contains(e.target)&&!menu.contains(e.target)){
      menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='Manage Calendars ▾';
    }
  },{signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?undefined:undefined});
  document.querySelectorAll('[data-schedule-group-delete]').forEach(b=>b.addEventListener('click',()=>openDeleteScheduleCalendarModal(b.dataset.scheduleGroupDelete)));
  document.querySelectorAll('[data-schedule-group-edit]').forEach(b=>b.onclick=()=>openWorkGroupAccessModal(STATE.pm.scheduleWorkGroups.find(g=>g.id===b.dataset.scheduleGroupEdit)));
  if(SCHED_SUBTAB==='roster') renderRosterSub();
  else if(SCHED_SUBTAB==='events') renderSpecialEventsSub();
  else if(SCHED_SUBTAB==='swaps') renderShiftSwapsSub();
  else if(SCHED_SUBTAB==='timeoff') renderTimeOffSub();
  else if(SCHED_SUBTAB==='overtime') renderOvertimeSub();
  else if(SCHED_SUBTAB==='bidding') renderBiddingSub();
  else if(SCHED_SUBTAB==='extraduty') renderExtraDutySub();
  else if(SCHED_SUBTAB==='rollcall') renderRollCallSub();
}
function scheduleWorkGroupName(id){ return (STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)?.name || 'Unassigned'; }
function currentPerson(){return STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{};}
function isGlobalScheduleAdmin(){
  const id=currentRole()?.id || '';
  const ids=id.startsWith('merged:')?id.slice(7).split(','):[id];
  return ids.some(roleId=>roleId==='role_admin'||roleId==='role_platform_admin');
}
function canViewWorkGroup(group){
  if(!group||group.active===false)return false;if(isGlobalScheduleAdmin())return true;if(group.visibility==='agency')return true;
  if((group.viewerIds||[]).includes(CURRENT_USER_ID)||(group.managerIds||[]).includes(CURRENT_USER_ID))return true;
  const p=currentPerson(), unit=String(p.unit||p.department||'').trim().toLowerCase();
  return group.visibility==='unit'&&(group.unitNames||[]).some(u=>unit!==''&&unit===String(u).trim().toLowerCase());
}
function canManageWorkGroup(group){return !!group&&(isGlobalScheduleAdmin()||((group.managerIds||[]).includes(CURRENT_USER_ID)&&can('pm_schedule_manage')));}
function canViewScheduleShift(shift){return !!shift&&canViewWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===shift.workGroupId));}
function canManageScheduleShift(shift){return !!shift&&canManageWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===shift.workGroupId));}
function manageableScheduleWorkGroups(){return (STATE.pm.scheduleWorkGroups||[]).filter(g=>g.active!==false&&canManageWorkGroup(g));}
function personScheduleGroupIds(personId,record={}){
  const start=record.startDate||record.date||'0000-00-00',end=record.endDate||record.date||'9999-99-99';
  const ids=(STATE.pm.scheduleAssignments||[]).filter(a=>a.personId===personId&&(!a.startDate||a.startDate<=end)&&(!a.endDate||a.endDate>=start)).map(a=>STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId)?.workGroupId).filter(Boolean);
  if(ids.length)return [...new Set(ids)];
  const p=STATE.personnel.find(p=>p.id===personId),unit=String(p?.unit||p?.department||'').trim().toLowerCase();
  return (STATE.pm.scheduleWorkGroups||[]).filter(g=>unit&&(g.unitNames||[]).some(u=>String(u).trim().toLowerCase()===unit)).map(g=>g.id);
}
function canManagePersonSchedule(personId,record={},ability='pm_schedule_manage'){
  if(isGlobalScheduleAdmin())return true;
  const ids=personScheduleGroupIds(personId,record);
  return can(ability)&&ids.length>0&&ids.every(id=>(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)?.managerIds?.includes(CURRENT_USER_ID));
}
function canViewPersonSchedule(personId,record={}){
  return personId===CURRENT_USER_ID||isGlobalScheduleAdmin()||personScheduleGroupIds(personId,record).some(id=>canViewWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)));
}
function canManageSwapRequest(req){return !!req&&canManagePersonSchedule(req.requesterId,req)&&canManagePersonSchedule(req.coveringId,req);}
function canManageRollCallShift(shift){return !!shift&&(isGlobalScheduleAdmin()||(can('pm_rollcall_manage')&&(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===shift.workGroupId)?.managerIds?.includes(CURRENT_USER_ID)));}
function activityWorkGroupIds(record,type){
  const ids=record?.workGroupId?[record.workGroupId]:[];
  if(type==='bid')Object.keys(record?.shiftSlots||{}).forEach(id=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===id);if(shift?.workGroupId)ids.push(shift.workGroupId);});
  return [...new Set(ids)];
}
function canViewScheduleActivity(record,type){
  if(!record)return false;if(isGlobalScheduleAdmin())return true;
  const ids=activityWorkGroupIds(record,type);
  return ids.length?ids.some(id=>canViewWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id))):type==='job'||type==='bid'&&record.type==='vacation';
}
function canManageScheduleActivity(record,type,ability){
  if(!record)return false;if(isGlobalScheduleAdmin())return true;
  const ids=activityWorkGroupIds(record,type);
  return can(ability)&&ids.length>0&&ids.every(id=>(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)?.managerIds?.includes(CURRENT_USER_ID));
}
function manageableActivityGroups(ability){return (STATE.pm.scheduleWorkGroups||[]).filter(g=>g.active!==false&&(isGlobalScheduleAdmin()||can(ability)&&(g.managerIds||[]).includes(CURRENT_USER_ID)));}
function personScheduledDuring(personId,startDate,endDate){
  for(let day=new Date(startDate+'T00:00:00');fmt(day)<=endDate;day=addDays(day,1))if(personScheduledOnDate(personId,fmt(day)))return true;
  return false;
}
function canManageOvertimeShift(shift){return !!shift&&(isGlobalScheduleAdmin()||((can('pm_schedule_manage')||can('pm_overtime_manage'))&&(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===shift.workGroupId)?.active!==false&&(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===shift.workGroupId)?.managerIds?.includes(CURRENT_USER_ID)));}
function visibleScheduleWorkGroups(){return (STATE.pm.scheduleWorkGroups||[]).filter(g=>g.active!==false&&canViewWorkGroup(g));}
function staffingSkillOptions(selected=''){
  return '<option value="">Select required skill</option>'+[...new Set([...(STATE.pm.refData?.skillsCatalog||[]),...(selected?[selected]:[])])].sort((a,b)=>a.localeCompare(b)).map(skill=>`<option value="${escapeHtml(skill)}" ${skill===selected?'selected':''}>${escapeHtml(skill)}</option>`).join('');
}
function staffingNeedsRow(row={}){
  return `<div class="staffing-need-row" data-staffing-row data-category-id="${escapeHtml(row.id||'cat'+Date.now()+Math.random().toString(36).slice(2,8))}"><input data-staffing-name aria-label="Staffing category name" placeholder="e.g. Law Dispatcher" value="${escapeHtml(row.name||'')}"><select data-staffing-skill aria-label="Required skill">${staffingSkillOptions(row.requiredSkill)}</select><input data-staffing-count aria-label="Required number" type="number" min="1" step="1" value="${row.count||1}"><button type="button" class="btn btn-sm btn-outline" data-remove-staffing aria-label="Remove staffing category">Remove</button></div>`;
}
function staffingNeedsEditor(id,record){
  return `<div class="form-row"><label>Staffing Requirements by Category</label><p class="hint">Optional. Define any staffing categories and required counts, such as 2 Deputies and 1 Sergeant, or Law Dispatchers, Fire Dispatchers, and Call Takers. Choose the personnel skill required for each category. Define skills in Personnel Administration → Special Skills Catalog and assign them on the employee record. These are separate from permission roles.</p><div id="${id}">${(record?.staffingRequirements||[]).map(staffingNeedsRow).join('')}</div><button type="button" class="btn btn-sm btn-outline" id="${id}Add">Add Staffing Category</button></div>`;
}
function readStaffingNeeds(id){
  const rows=[...document.getElementById(id).querySelectorAll('[data-staffing-row]')].map(row=>({id:row.dataset.categoryId,name:row.querySelector('[data-staffing-name]').value.trim(),requiredSkill:row.querySelector('[data-staffing-skill]').value,count:Number(row.querySelector('[data-staffing-count]').value)}));
  try{validateStaffingRequirements(rows);return rows;}catch(error){toast(error.message,true);return null;}
}
function wireStaffingNeedsEditor(id,totalId){
  const container=document.getElementById(id),total=document.getElementById(totalId);
  const update=()=>{const rows=[...container.querySelectorAll('[data-staffing-row]')];total.readOnly=rows.length>0;if(rows.length)total.value=rows.reduce((sum,row)=>sum+(Number(row.querySelector('[data-staffing-count]').value)||0),0);};
  container.addEventListener('input',update);container.addEventListener('click',e=>{if(e.target.closest('[data-remove-staffing]')){e.target.closest('[data-staffing-row]').remove();update();}});
  document.getElementById(id+'Add').onclick=()=>{container.insertAdjacentHTML('beforeend',staffingNeedsRow());update();};update();
}
function staffingCategoryOptions(record,selected=''){
  return '<option value="">'+((record?.staffingRequirements||[]).length?'Select Staffing Category':'General / Unclassified')+'</option>'+(record?.staffingRequirements||[]).map(row=>`<option value="${escapeHtml(row.id)}" ${row.id===selected?'selected':''}>${escapeHtml(row.name)}</option>`).join('');
}
function wireStaffingPersonPicker(shiftId,categoryId,personId,existing){
  const shiftSelect=document.getElementById(shiftId),categorySelect=document.getElementById(categoryId),personSelect=document.getElementById(personId);
  const update=()=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===shiftSelect.value),category=(shift?.staffingRequirements||[]).find(c=>c.id===categorySelect.value),selected=personSelect.value;
    const people=STATE.personnel.filter(p=>(!(shift?.staffingRequirements||[]).length||category)&&staffingPersonHasSkill(STATE.pm.records,p.id,category));
    personSelect.innerHTML='<option value="">Select personnel</option>'+people.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  };
  categorySelect.addEventListener('change',update);shiftSelect.addEventListener('change',update);update();
}
function staffingCategoryName(record,id){return (record?.staffingRequirements||[]).find(row=>row.id===id)?.name||'Unclassified';}
function staffingBreakdownHtml(summary){
  return summary.categories.map(row=>`<span class="badge" style="margin:2px 4px 2px 0;color:${row.needed?'var(--red)':'var(--green)'};">${escapeHtml(row.name)}: ${row.staffed}/${row.count}</span>`).join('')+(summary.categories.length&&summary.unclassified?`<span class="hint">${summary.unclassified} unclassified</span>`:'');
}
function shiftStaffingSummary(shift,date){
  const assigned=STATE.pm.scheduleAssignments.filter(a=>a.shiftId===shift.id&&isOnDutyOnDate(a,shift,date)&&!activeExceptionFor(a.personId,date));
  const coverage=(STATE.pm.scheduleCoverages||[]).filter(c=>c.shiftId===shift.id&&c.date===date&&!activeExceptionFor(c.personId,date));
  return staffingSummary(shift.staffingRequirements,[...assigned,...coverage],shift.minStaff,STATE.pm.records);
}
function eventStaffingSummary(event){return staffingSummary(event.staffingRequirements,(event.requests||[]).filter(r=>r.status==='awarded'),event.staffNeeded,STATE.pm.records);}
function openEventStaffingNeedsModal(event){
  if(!canManageSpecialEvent(event))return;
  document.getElementById('modalBox').className='modal modal-lg';
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>Staffing Needs: ${escapeHtml(event.name)}</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body"><div class="form-row"><label>Total People Needed</label><input type="number" min="1" id="fEventStaffTotal" value="${event.staffNeeded}"></div>${staffingNeedsEditor('fEventStaffNeeds',event)}<div id="fExistingEventCategories">${(event.requests||[]).filter(r=>r.status==='awarded').map(r=>`<div class="form-row"><label>${escapeHtml(personName(r.personId))}</label><select data-existing-event-category="${r.personId}">${staffingCategoryOptions(event,r.staffingCategoryId)}</select></div>`).join('')}</div></div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Back</button><button class="btn btn-primary" id="mSave">Save Staffing Needs</button></div>`;
  openModal();wireStaffingNeedsEditor('fEventStaffNeeds','fEventStaffTotal');
  const syncAssigned=()=>{const requirements=[...document.getElementById('fEventStaffNeeds').querySelectorAll('[data-staffing-row]')].map(row=>({id:row.dataset.categoryId,name:row.querySelector('[data-staffing-name]').value}));document.querySelectorAll('[data-existing-event-category]').forEach(select=>{const selected=select.value;select.innerHTML=staffingCategoryOptions({staffingRequirements:requirements},selected);});};
  document.getElementById('fEventStaffNeeds').addEventListener('input',syncAssigned);document.getElementById('fEventStaffNeeds').addEventListener('click',syncAssigned);document.getElementById('fEventStaffNeedsAdd').addEventListener('click',syncAssigned);
  document.getElementById('mClose').onclick=()=>openSpecialEventDetail(event);document.getElementById('mCancel').onclick=()=>openSpecialEventDetail(event);
  document.getElementById('mSave').onclick=()=>{
    const requirements=readStaffingNeeds('fEventStaffNeeds');if(!requirements)return;
    const staffNeeded=Number(document.getElementById('fEventStaffTotal').value);
    if(!Number.isSafeInteger(staffNeeded)||staffNeeded<1){toast('Enter a positive whole-number staffing requirement.',true);return;}
    const requests=(event.requests||[]).map(r=>r.status==='awarded'?{...r,staffingCategoryId:document.querySelector('[data-existing-event-category="'+r.personId+'"]').value}:r);
    const awards=requests.filter(r=>r.status==='awarded'),summary=staffingSummary(requirements,awards,staffNeeded,STATE.pm.records);
    if(awards.some(r=>{const category=requirements.find(c=>c.id===r.staffingCategoryId);return category&&!staffingPersonHasSkill(STATE.pm.records,r.personId,category);})){toast('An assigned employee lacks the required skill. Update their personnel record or choose a matching staffing category.',true);return;}
    if(awards.length>staffNeeded||requirements.length&&awards.some(r=>!requirements.some(c=>c.id===r.staffingCategoryId))||summary.categories.some(r=>r.staffed>r.count)){toast('Existing assignments must fit the revised staffing categories and counts. Keep assigned categories or increase their requirements.',true);return;}
    Object.assign(event,{staffingRequirements:requirements,staffNeeded,requests});persist();openSpecialEventDetail(event);renderSpecialEventsSub();
  };
}
function calendarUnitOptions(group){
  const units=new Map();
  [...(STATE.pm.refData?.units||[]),...STATE.personnel.map(p=>p.unit||p.department||''),...(group.unitNames||[])].forEach(value=>{
    const name=String(value||'').trim(),key=name.toLowerCase();
    if(name&&!units.has(key))units.set(key,name);
  });
  return [...units.values()].sort((a,b)=>a.localeCompare(b));
}
function openWorkGroupAccessModal(group,isNew=false){
  if(!group||!isGlobalScheduleAdmin())return;document.getElementById('modalBox').className='modal modal-lg';
  const people=STATE.personnel.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const units=calendarUnitOptions(group),selectedUnits=new Set((group.unitNames||[]).map(u=>String(u).trim().toLowerCase()));
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>${escapeHtml(group.name)} Calendar Access</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body">
  <div class="form-row"><label>Calendar / Work Group Name</label><input id="fWgName" value="${escapeHtml(group.name||'')}" placeholder="e.g. Dispatch"></div>
  <div class="form-row"><label><input type="checkbox" id="fWgActive" ${group.active!==false?'checked':''}> Active Calendar</label><div class="hint">Inactive calendars retain their history and can be reactivated by an administrator.</div></div>
  <div class="form-row"><label>Default Calendar Visibility</label><select id="fWgVisibility"><option value="unit" ${group.visibility==='unit'?'selected':''}>Mapped Unit Members + Selected People</option><option value="agency" ${group.visibility==='agency'?'selected':''}>All Agency Personnel</option><option value="selected" ${group.visibility==='selected'?'selected':''}>Selected People Only</option></select></div>
  <div class="form-row"><label>Mapped Units</label><div class="hint" style="margin-bottom:8px;">Select the Units whose members can view this calendar when visibility is set to Mapped Unit Members + Selected People.</div><div class="access-person-list access-unit-list">${units.map(unit=>`<label><input type="checkbox" data-wg-unit="${escapeHtml(unit)}" ${selectedUnits.has(unit.toLowerCase())?'checked':''}><span>${escapeHtml(unit)}</span></label>`).join('')||'<p class="hint">Add Units in Personnel settings to make them available here.</p>'}</div></div>
  <div class="form-2col"><div class="form-row"><label>Additional Viewers</label><div class="access-person-list">${people.map(p=>`<label><input type="checkbox" data-wg-viewer="${p.id}" ${(group.viewerIds||[]).includes(p.id)?'checked':''}><span>${escapeHtml(p.name)}</span></label>`).join('')}</div></div>
  <div class="form-row"><label>Scheduling Managers</label><div class="access-person-list">${people.map(p=>`<label><input type="checkbox" data-wg-manager="${p.id}" ${(group.managerIds||[]).includes(p.id)?'checked':''}><span>${escapeHtml(p.name)}</span></label>`).join('')}</div><div class="hint">Managers may modify only this Work Group's schedule, subject to their scheduling abilities.</div></div></div></div>
  <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save Access</button></div>`;
  openModal();document.getElementById('mClose').onclick=closeModal;document.getElementById('mCancel').onclick=closeModal;document.getElementById('mSave').onclick=()=>{if(!isGlobalScheduleAdmin())return;const name=document.getElementById('fWgName').value.trim();if(!name||(STATE.pm.scheduleWorkGroups||[]).some(g=>g.id!==group.id&&g.name.trim().toLowerCase()===name.toLowerCase())){toast('Enter a unique calendar name.',true);return;}group.name=name;group.active=document.getElementById('fWgActive').checked;group.visibility=document.getElementById('fWgVisibility').value;group.unitNames=[...document.querySelectorAll('[data-wg-unit]:checked')].map(x=>x.dataset.wgUnit);group.viewerIds=[...document.querySelectorAll('[data-wg-viewer]:checked')].map(x=>x.dataset.wgViewer);group.managerIds=[...document.querySelectorAll('[data-wg-manager]:checked')].map(x=>x.dataset.wgManager);if(isNew)STATE.pm.scheduleWorkGroups.push(group);logActivity(`Updated calendar access for ${group.name}.`,'schedule');persist();closeModal();renderScheduling();};
}
function calendarDeletionLinks(id){
  const shiftIds=new Set((STATE.pm.scheduleShifts||[]).filter(s=>(s.workGroupId||'wg_patrol')===id).map(s=>s.id));
  return Object.entries(STATE.pm).filter(([collection,rows])=>collection!=='scheduleWorkGroups'&&collection!=='deletedCalendarArchives'&&Array.isArray(rows)).flatMap(([collection,rows])=>rows.filter(row=>row&&typeof row==='object'&&(row.workGroupId===id||(row.eligibleWorkGroupIds||[]).includes(id)||shiftIds.has(row.shiftId)||Object.keys(row.shiftSlots||{}).some(shiftId=>shiftIds.has(shiftId)))).map(row=>({collection,id:row.id})));
}
function openDeleteScheduleCalendarModal(selectedGroupId){
  const groups=(STATE.pm.scheduleWorkGroups||[]).filter(canManageWorkGroup);
  if(!groups.length){toast('You do not manage any calendars.',true);return;}
  document.getElementById('modalBox').className='modal';
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>Delete Calendar</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body">
    <div class="form-row"><label>Select a calendar you are authorized to manage</label><select id="fDeleteCalendar">${groups.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}${g.active===false?' (Inactive)':''}</option>`).join('')}</select></div>
    <div id="calendarDeleteImpact" class="hint"></div>
    <p class="hint">Deletion is permanent in the active workspace. A snapshot is retained in deleted calendar archives for administrators. Other work groups are preserved.</p>
    </div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-danger" id="mSave">Review Deletion</button></div>`;
  openModal();document.getElementById('mClose').onclick=closeModal;document.getElementById('mCancel').onclick=closeModal;
  const select=document.getElementById('fDeleteCalendar'),impact=document.getElementById('calendarDeleteImpact');
  const update=()=>{const links=calendarDeletionLinks(select.value);impact.textContent=links.length+' linked scheduling records will be detached or removed from the active calendar. Any affected event history will be archived.';};
  if(selectedGroupId && groups.some(g=>g.id===selectedGroupId)) select.value=selectedGroupId;
  select.addEventListener('change',update);update();
  document.getElementById('mSave').onclick=()=>deleteScheduleCalendar(select.value);
}
async function deleteScheduleCalendar(id){
  const group=(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id);
  if(!canManageWorkGroup(group))return;
  const links=calendarDeletionLinks(id),shiftIds=new Set((STATE.pm.scheduleShifts||[]).filter(s=>(s.workGroupId||'wg_patrol')===id).map(s=>s.id));
  if(!confirm('Delete calendar "'+group.name+'"? '+links.length+' linked scheduling records may be removed from the active workspace. This cannot be undone through the interface. Continue?'))return;
  if(!confirm('FINAL CONFIRMATION: Delete "'+group.name+'" and its associated shift patterns/assignments?'))return;
  const before=JSON.parse(JSON.stringify(STATE.pm));
  const archivedAt=new Date().toISOString();
  STATE.pm.deletedCalendarArchives=STATE.pm.deletedCalendarArchives||[];
  STATE.pm.deletedCalendarArchives.push({id,group:before.scheduleWorkGroups.find(g=>g.id===id),archivedAt,deletedBy:CURRENT_USER_ID,linkedRecords:links.map(link=>({collection:link.collection,record:(before[link.collection]||[]).find(row=>row.id===link.id)}))});
  STATE.pm.scheduleWorkGroups=STATE.pm.scheduleWorkGroups.filter(g=>g.id!==id);
  STATE.pm.scheduleShifts=(STATE.pm.scheduleShifts||[]).filter(x=>!shiftIds.has(x.id));
  STATE.pm.scheduleAssignments=(STATE.pm.scheduleAssignments||[]).filter(x=>!shiftIds.has(x.shiftId)&&x.workGroupId!==id);
  // Shared events survive; remove just the deleted work-group eligibility. Sole-group events are cancelled.
  (STATE.pm.specialEvents||[]).forEach(e=>{
    if(!(e.eligibleWorkGroupIds||[]).includes(id))return;
    e.eligibleWorkGroupIds=e.eligibleWorkGroupIds.filter(groupId=>groupId!==id);
    if(!e.eligibleWorkGroupIds.length){e.status='cancelled';e.cancelledAt=archivedAt;e.cancelledBy=CURRENT_USER_ID;}
  });
  for(const [collection,rows] of Object.entries(STATE.pm)){
    if(!Array.isArray(rows)||['scheduleWorkGroups','deletedCalendarArchives','scheduleShifts','scheduleAssignments','specialEvents'].includes(collection))continue;
    STATE.pm[collection]=rows.filter(row=>!row||typeof row!=='object'||!(row.workGroupId===id||shiftIds.has(row.shiftId)||Object.keys(row.shiftSlots||{}).some(key=>shiftIds.has(key))));
  }
  persist();
  if(!await SuiteStore.flush()){
    STATE.pm=before;persist();toast('Calendar deletion could not be saved. Reload to check concurrent changes.',true);closeModal();renderScheduling();return;
  }
  SCHED_CAL_WORKGROUPS=SCHED_CAL_WORKGROUPS.filter(groupId=>groupId!==id);
  logActivity('Deleted work group calendar '+group.name+' with '+links.length+' linked records archived.','schedule');persist();
  toast('Calendar deleted.');closeModal();renderScheduling();
}
function selectedCalendarWorkGroups(){
  const active=visibleScheduleWorkGroups();
  if(!SCHED_CAL_WORKGROUPS.length) return active.map(g=>g.id);
  return SCHED_CAL_WORKGROUPS.filter(id=>active.some(g=>g.id===id));
}
function personScheduledOnDate(personId,dateStr){
  return STATE.pm.scheduleAssignments.some(a=>a.personId===personId && isOnDutyOnDate(a,STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId),dateStr) && !activeExceptionFor(personId,dateStr))
    || (STATE.pm.scheduleCoverages||[]).some(c=>c.personId===personId&&c.date===dateStr);
}
function renderSpecialEventsSub(){
  const canManage=can('pm_schedule_manage');
  const visibleGroupIds=new Set(visibleScheduleWorkGroups().map(g=>g.id));
  const rows=(STATE.pm.specialEvents||[]).filter(e=>e.status!=='deleted').filter(e=>(e.requests||[]).some(r=>r.personId===CURRENT_USER_ID&&r.status==='awarded')||!(e.eligibleWorkGroupIds||[]).length||(e.eligibleWorkGroupIds||[]).some(id=>visibleGroupIds.has(id))).slice().sort((a,b)=>a.startDate.localeCompare(b.startDate)).map(e=>{
    const summary=eventStaffingSummary(e),awarded=summary.staffed,needed=summary.minStaff;
    return `<tr><td><strong>${escapeHtml(e.name)}</strong>${e.status==='cancelled'?' <span class="badge badge-missing">Cancelled</span>':''}</td><td>${escapeHtml(e.startDate)}${e.endDate&&e.endDate!==e.startDate?' to '+escapeHtml(e.endDate):''}</td><td>${escapeHtml(e.startTime)} - ${escapeHtml(e.endTime)}</td><td>${escapeHtml(e.location||'—')}</td><td style="color:${awarded>=needed?'var(--green)':'var(--red)'};font-weight:700;">${awarded}/${needed}<br>${staffingBreakdownHtml(summary)}</td><td><button class="btn btn-sm btn-outline" data-event-open="${e.id}">Open</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:18px;">No special events created yet.</td></tr>';
  document.getElementById('schedSubBody').innerHTML=`<div class="panel"><div class="panel-head"><div><h2>Special Events & Activities</h2><span class="hint">Standalone assignments, details, staffing requests, and awards</span></div>${canManage?'<button class="btn btn-primary btn-sm" id="btnNewSpecialEvent">'+ICONS.plus+' New Event</button>':''}</div><div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Event</th><th>Date(s)</th><th>Hours</th><th>Location</th><th>Staffed</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  document.getElementById('btnNewSpecialEvent')?.addEventListener('click',()=>openSpecialEventModal());
  document.querySelectorAll('[data-event-open]').forEach(b=>b.addEventListener('click',()=>openSpecialEventDetail((STATE.pm.specialEvents||[]).find(e=>e.id===b.dataset.eventOpen))));
}
function openSpecialEventModal(){
  const groups=manageableScheduleWorkGroups();
  if(!groups.length)return;
  document.getElementById('modalBox').className='modal';
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>New Special Event / Activity</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body">
  <div class="form-row"><label>Event / Activity</label><input id="fEventName" placeholder="e.g. Butter & Egg Days"></div>
  <div class="form-2col"><div class="form-row"><label>Start Date</label><input type="date" id="fEventStart" value="${fmt(new Date())}"></div><div class="form-row"><label>End Date</label><input type="date" id="fEventEnd" value="${fmt(new Date())}"></div>
  <div class="form-row"><label>Start Time</label><input type="time" id="fEventStartTime" value="08:00"></div><div class="form-row"><label>End Time</label><input type="time" id="fEventEndTime" value="17:00"></div></div>
  <div class="form-row"><label>Location</label><input id="fEventLocation"></div><div class="form-row"><label>People Needed</label><input type="number" min="1" id="fEventNeeded" value="1"></div>
  ${staffingNeedsEditor('fEventStaffNeeds',null)}
  <div class="form-row"><label>Eligible Work Groups</label><div style="display:flex;gap:12px;flex-wrap:wrap;">${groups.map(g=>`<label><input type="checkbox" data-event-wg="${g.id}" checked> ${escapeHtml(g.name)}</label>`).join('')}</div></div>
  <div class="form-row"><label>Notes / Instructions</label><textarea id="fEventNotes" rows="4"></textarea></div></div>
  <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Create Event</button></div>`;
  openModal();wireStaffingNeedsEditor('fEventStaffNeeds','fEventNeeded'); document.getElementById('mClose').onclick=closeModal;document.getElementById('mCancel').onclick=closeModal;
  document.getElementById('mSave').onclick=()=>{const name=document.getElementById('fEventName').value.trim();if(!name){toast('Event name is required.',true);return;} const startDate=document.getElementById('fEventStart').value,endDate=document.getElementById('fEventEnd').value;if(!startDate||!endDate||endDate<startDate||daysBetween(startDate,endDate)>366){toast('Enter a valid event date range of no more than one year.',true);return;} const eligibleWorkGroupIds=[...document.querySelectorAll('[data-event-wg]:checked')].map(x=>x.dataset.eventWg);if(!eligibleWorkGroupIds.length){toast('Select at least one Work Group.',true);return;}const staffingRequirements=readStaffingNeeds('fEventStaffNeeds');if(!staffingRequirements)return;STATE.pm.specialEvents.push({staffingRequirements,id:'sev'+Date.now(),name,startDate,endDate,startTime:document.getElementById('fEventStartTime').value,endTime:document.getElementById('fEventEndTime').value,location:document.getElementById('fEventLocation').value.trim(),staffNeeded:Math.max(1,Number(document.getElementById('fEventNeeded').value)||1),notes:document.getElementById('fEventNotes').value.trim(),eligibleWorkGroupIds,status:'published',requests:[],createdBy:CURRENT_USER_ID,createdAt:new Date().toISOString()});logActivity(`Created special event "${name}".`,'schedule');persist();closeModal();renderSpecialEventsSub();};
}
function openEditSpecialEventModal(e){
  if(!canManageSpecialEvent(e)||e.status!=='published')return;
  const existingAssignments=(e.requests||[]).filter(r=>r.status==='awarded');
  document.getElementById('modalBox').className='modal';
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>Edit Special Event</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body">
    <div class="form-row"><label>Event Name</label><input id="fEvEditName" value="${escapeHtml(e.name)}"></div>
    <div class="form-2col"><div class="form-row"><label>Start Date</label><input type="date" id="fEvEditStart" value="${escapeHtml(e.startDate)}"></div><div class="form-row"><label>End Date</label><input type="date" id="fEvEditEnd" value="${escapeHtml(e.endDate||e.startDate)}"></div>
    <div class="form-row"><label>Start Time</label><input type="time" id="fEvEditStartTime" value="${escapeHtml(e.startTime)}"></div><div class="form-row"><label>End Time</label><input type="time" id="fEvEditEndTime" value="${escapeHtml(e.endTime)}"></div></div>
    <div class="form-row"><label>Location</label><input id="fEvEditLocation" value="${escapeHtml(e.location||'')}"></div>
    <div class="form-row"><label>Instructions</label><textarea id="fEvEditNotes" rows="3">${escapeHtml(e.notes||'')}</textarea></div>
    ${existingAssignments.length?'<p class="hint">Staff have been awarded. Dates and times cannot be changed until their assignments are resolved.</p>':''}
    </div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Back</button><button class="btn btn-primary" id="mSave">Save Changes</button></div>`;
  openModal();
  document.getElementById('mClose').onclick=()=>openSpecialEventDetail(e);
  document.getElementById('mCancel').onclick=()=>openSpecialEventDetail(e);
  document.getElementById('mSave').onclick=()=>{
    if(!canManageSpecialEvent(e)||e.status!=='published')return;
    const changes={name:document.getElementById('fEvEditName').value.trim(),startDate:document.getElementById('fEvEditStart').value,endDate:document.getElementById('fEvEditEnd').value,startTime:document.getElementById('fEvEditStartTime').value,endTime:document.getElementById('fEvEditEndTime').value,location:document.getElementById('fEvEditLocation').value.trim(),notes:document.getElementById('fEvEditNotes').value.trim()};
    if(!changes.name||!changes.startDate||!changes.endDate||changes.endDate<changes.startDate||daysBetween(changes.startDate,changes.endDate)>366||!changes.startTime||!changes.endTime||changes.endTime<=changes.startTime){toast('Enter a valid event name, dates and times.',true);return;}
    if(existingAssignments.length&&['startDate','endDate','startTime','endTime'].some(k=>changes[k]!==e[k])){toast('Resolve awarded assignments before changing event dates or times.',true);return;}
    const changed=Object.keys(changes).filter(k=>e[k]!==changes[k]);
    if(!changed.length){openSpecialEventDetail(e);return;}
    const description=changed.map(k=>k+': '+String(e[k]||'')+' → '+String(changes[k]||'')).join('; ');
    Object.assign(e,changes);e.updatedAt=new Date().toISOString();e.updatedBy=CURRENT_USER_ID;
    e.changeHistory=e.changeHistory||[];e.changeHistory.push({at:e.updatedAt,by:CURRENT_USER_ID,description});
    logActivity('Edited special event "'+e.name+'": '+description,'schedule');persist();renderSpecialEventsSub();openSpecialEventDetail(e);
  };
}
function canManageSpecialEvent(event){
  return !!event&&(isGlobalScheduleAdmin()||((event.eligibleWorkGroupIds||[]).length>0&&(event.eligibleWorkGroupIds||[]).every(id=>canManageWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)))));
}
function personEligibleForSpecialEvent(personId,event){
  const person=STATE.personnel.find(p=>p.id===personId);
  if(!person)return false;
  const ids=event.eligibleWorkGroupIds||[];
  if(!ids.length)return isGlobalScheduleAdmin();
  const membership=personScheduleGroupIds(personId,event),unit=String(person.unit||person.department||'').trim().toLowerCase();
  return ids.some(id=>{
    const group=(STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id);
    return group&&group.active!==false&&(membership.includes(id)||group.visibility==='agency'||(group.viewerIds||[]).includes(personId)||(group.managerIds||[]).includes(personId)||group.visibility==='unit'&&(group.unitNames||[]).some(u=>unit&&String(u).trim().toLowerCase()===unit));
  });
}
function specialEventConflicts(personId,event){
  const end=event.endDate||event.startDate;
  let regularDuty=false;
  for(let day=new Date(event.startDate+'T00:00:00');fmt(day)<=end;day=addDays(day,1)){
    const date=fmt(day);
    if((STATE.pm.scheduleExceptions||[]).some(e=>e.personId===personId&&e.startDate<=date&&e.endDate>=date&&!(e.code==='EVT'&&e.sourceEventId===event.id)))return {blocking:'Time off or another schedule exception on '+date,regularDuty:false};
    if((STATE.pm.scheduleCoverages||[]).some(c=>c.personId===personId&&c.date===date))return {blocking:'Overtime or one-off coverage on '+date,regularDuty:false};
    if((STATE.pm.specialEvents||[]).some(e=>e.id!==event.id&&e.status!=='cancelled'&&e.startDate<=date&&(e.endDate||e.startDate)>=date&&(e.requests||[]).some(r=>r.personId===personId&&r.status==='awarded')))return {blocking:'Another special assignment on '+date,regularDuty:false};
    if(!activeExceptionFor(personId,date)&&STATE.pm.scheduleAssignments.some(a=>a.personId===personId&&isOnDutyOnDate(a,STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId),date)))regularDuty=true;
  }
  return {blocking:'',regularDuty};
}
function planSpecialEventAssignments(event,personIds,reassign=false,manual=true,categoryId=''){
  if(!canManageSpecialEvent(event)||event.status!=='published')throw new Error("Only this calendar's schedulers can assign personnel to a published event.");
  if(!personIds.length||new Set(personIds).size!==personIds.length)throw new Error('Select one or more employees, once each.');
  const requirements=validateStaffingRequirements(event.staffingRequirements||[]);
  if(requirements.length&&!requirements.some(r=>r.id===categoryId))throw new Error('Choose the staffing category these personnel will fill.');
  const requests=(event.requests||[]).map(r=>({...r})),exceptions=[];
  const category=requirements.find(r=>r.id===categoryId);
  if(category&&requests.filter(r=>r.status==='awarded'&&r.staffingCategoryId===categoryId).length+personIds.length>category.count)throw new Error('Your selections exceed the remaining slots for '+category.name+'.');
  const count=requests.filter(r=>r.status==='awarded').length;
  if(count+personIds.length>event.staffNeeded)throw new Error("Your selections exceed the event's remaining staffing slots.");
  const now=new Date().toISOString();
  for(const personId of personIds){
    if(!personEligibleForSpecialEvent(personId,event))throw new Error("An employee is outside the event's eligible Work Groups.");
    if(category&&!staffingPersonHasSkill(STATE.pm.records,personId,category))throw new Error(personName(personId)+' does not have the required skill for '+category.name+'.');
    const existing=requests.find(r=>r.personId===personId);
    if(existing?.status==='awarded')throw new Error('An employee is already assigned to this event.');
    const conflict=specialEventConflicts(personId,event);
    if(conflict.blocking)throw new Error(personName(personId)+': '+conflict.blocking+'. Resolve it before assigning.');
    if(conflict.regularDuty){
      if(!reassign)throw new Error('Selected personnel have regular duty. Select the reassignment option to move them to this event for these dates.');
      if(!canManagePersonSchedule(personId,event))throw new Error("You must manage the employee's existing calendar to reassign regular duty.");
      exceptions.push({id:'ex'+Date.now()+Math.random().toString(36).slice(2,8),personId,code:'EVT',startDate:event.startDate,endDate:event.endDate||event.startDate,notes:'Reassigned to special event: '+event.name,sourceEventId:event.id});
    }
    const assigned={...(existing||{personId,requestedAt:now}),status:'awarded',staffingCategoryId:categoryId,conflict:false,awardedAt:now,awardedBy:CURRENT_USER_ID,...(manual?{source:'manual'}:{})};
    if(existing)Object.assign(existing,assigned);else requests.push(assigned);
  }
  return {requests,exceptions};
}
function applySpecialEventAssignments(event,personIds,reassign=false,manual=true,categoryId=''){
  try{
    const plan=planSpecialEventAssignments(event,personIds,reassign,manual,categoryId);
    event.requests=plan.requests;STATE.pm.scheduleExceptions.push(...plan.exceptions);
    logActivity(`Assigned ${personIds.length} employee(s) to special event "${event.name}".`,'schedule');persist();
    toast('Personnel assigned.');openSpecialEventDetail(event);renderSpecialEventsSub();return true;
  }catch(error){toast(error.message,true);return false;}
}
function openSpecialEventAssignmentModal(event){
  if(!canManageSpecialEvent(event)||event.status!=='published')return;
  const assigned=new Set((event.requests||[]).filter(r=>r.status==='awarded').map(r=>r.personId));
  const people=STATE.personnel.filter(p=>personEligibleForSpecialEvent(p.id,event)&&!assigned.has(p.id)).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const remaining=Math.max(0,event.staffNeeded-assigned.size);
  document.getElementById('modalBox').className='modal modal-lg';
  document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>Assign Personnel: ${escapeHtml(event.name)}</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body"><p class="hint">${remaining} staffing slot(s) remaining. Select one or several people; a volunteer request is not required.</p><div class="form-row"><label>Staffing Category to Fill</label><select id="fEventAssignCategory">${staffingCategoryOptions(event)}</select></div><div>${staffingBreakdownHtml(eventStaffingSummary(event))}</div><div class="form-row"><label>Find Personnel</label><input id="fEventPersonnelSearch" placeholder="Name or Unit"></div><div class="access-person-list">${people.map(p=>{const conflict=specialEventConflicts(p.id,event);return `<label data-event-person-row="${p.id}" data-search="${escapeHtml((p.name+' '+(p.unit||'')).toLowerCase())}"><input type="checkbox" data-event-person="${p.id}" data-blocked="${conflict.blocking?'true':'false'}" ${conflict.blocking?'disabled':''}><span>${escapeHtml(p.name)} <span class="hint">${escapeHtml(p.unit||'')}</span>${conflict.blocking?`<br><span class="hint" style="color:var(--red);">${escapeHtml(conflict.blocking)}</span>`:conflict.regularDuty?'<br><span class="hint">Regular duty; reassignment required</span>':''}</span></label>`;}).join('')||'<p class="hint">No eligible unassigned personnel.</p>'}</div><div class="form-row" style="margin-top:12px;"><label style="display:flex;gap:10px;align-items:center;"><input type="checkbox" id="fEventReassign" style="width:18px;height:18px;"> Reassign selected personnel from regular duty for these dates</label><div class="hint">Preserves their normal shift pattern and adds an event exception for this date range. Time off, overtime, and other special assignments must be resolved first.</div></div></div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Back</button><button class="btn btn-primary" id="mAssign" ${remaining?'':'disabled'}>Assign Selected Personnel</button></div>`;
  openModal();document.getElementById('mClose').onclick=()=>openSpecialEventDetail(event);document.getElementById('mCancel').onclick=()=>openSpecialEventDetail(event);
  const syncEventPeople=()=>{const category=(event.staffingRequirements||[]).find(c=>c.id===document.getElementById('fEventAssignCategory').value),q=document.getElementById('fEventPersonnelSearch').value.trim().toLowerCase();document.querySelectorAll('[data-event-person-row]').forEach(row=>{const input=row.querySelector('[data-event-person]'),matches=staffingPersonHasSkill(STATE.pm.records,input.dataset.eventPerson,category);input.disabled=input.dataset.blocked==='true'||!matches||((event.staffingRequirements||[]).length>0&&!category);if(input.disabled)input.checked=false;row.style.display=matches&&row.dataset.search.includes(q)?'grid':'none';});};
  document.getElementById('fEventPersonnelSearch').oninput=syncEventPeople;document.getElementById('fEventAssignCategory').onchange=syncEventPeople;syncEventPeople();
  document.getElementById('mAssign').onclick=()=>applySpecialEventAssignments(event,[...document.querySelectorAll('[data-event-person]:checked')].map(x=>x.dataset.eventPerson),document.getElementById('fEventReassign').checked,true,document.getElementById('fEventAssignCategory').value);
}
function openSpecialEventDetail(e){
  if(!e)return; const mine=(e.requests||[]).find(r=>r.personId===CURRENT_USER_ID),canManage=canManageSpecialEvent(e);const conflict=personScheduledDuring(CURRENT_USER_ID,e.startDate,e.endDate||e.startDate);
  const reqRows=(e.requests||[]).map(r=>`<tr><td>${recordLink(r.personId)}</td><td>${r.conflict?'<span style="color:var(--red);font-weight:700;">Schedule conflict</span>':'Clear'}</td><td style="text-transform:capitalize;">${escapeHtml(r.status)}${r.source==='manual'?' <span class="badge">Assigned by scheduler</span>':''}${r.staffingCategoryId?' · '+escapeHtml(staffingCategoryName(e,r.staffingCategoryId)):''}</td>${canManage?`<td>${r.status==='pending'&&e.status==='published'?'<select aria-label="Award staffing category" data-event-award-category="'+r.personId+'">'+staffingCategoryOptions(e,r.staffingCategoryId)+' </select><button class="btn btn-sm btn-primary" data-event-award="'+r.personId+'">Award</button>':''}</td>`:''}</tr>`).join('')||`<tr><td colspan="${canManage?4:3}" style="padding:16px;color:var(--text-dim);text-align:center;">No requests or assignments yet.</td></tr>`;
  document.getElementById('modalBox').className='modal modal-lg';document.getElementById('modalBox').innerHTML=`<div class="modal-head"><div><h3>${escapeHtml(e.name)}</h3><div class="hint">${escapeHtml(e.startDate)}${e.endDate!==e.startDate?' to '+escapeHtml(e.endDate):''} · ${escapeHtml(e.startTime)}-${escapeHtml(e.endTime)} · ${escapeHtml(e.location||'')}</div></div><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body"><div>${staffingBreakdownHtml(eventStaffingSummary(e))}</div><p>${escapeHtml(e.notes||'No additional instructions.')}</p>${conflict&&!mine?'<div class="callout" style="margin-bottom:12px;color:var(--red);">You are already scheduled to work on this date. A Schedule Admin must reassign you before you can be awarded this event.</div>':''}<table><thead><tr><th>Employee</th><th>Availability</th><th>Status</th>${canManage?'<th></th>':''}</tr></thead><tbody>${reqRows}</tbody></table></div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button>${canManage&&e.status==='published'?'<button class="btn btn-outline" id="mEditEvent">Edit Event</button><button class="btn btn-outline" id="mCancelEvent">Cancel Event</button>':''}${isGlobalScheduleAdmin()&&e.status==='cancelled'?'<button class="btn btn-danger" id="mDeleteEvent">Delete Event</button>':''}${canManage&&e.status==='published'?'<button class="btn btn-outline" id="mEventStaffNeeds">Staffing Needs</button>':''}${canManage&&e.status==='published'?'<button class="btn btn-primary" id="mAssignEvent">Assign Personnel</button>':''}${!mine&&e.status==='published'&&can('pm_overtime_optin')?'<select aria-label="Requested staffing category" id="mRequestEventCategory">'+staffingCategoryOptions(e)+' </select><button class="btn btn-outline" id="mRequestEvent">Request Assignment</button>':''}</div>`;
  openModal();document.getElementById('mClose').onclick=closeModal;document.getElementById('mCancel').onclick=closeModal;
  document.getElementById('mEditEvent')?.addEventListener('click',()=>openEditSpecialEventModal(e));
  document.getElementById('mCancelEvent')?.addEventListener('click',()=>{
    if(!canManageSpecialEvent(e)||e.status!=='published'||!confirm('Cancel this event? Staffing assignments and history will be retained for audit.'))return;
    e.status='cancelled';e.cancelledAt=new Date().toISOString();e.cancelledBy=CURRENT_USER_ID;
    (STATE.pm.scheduleExceptions||[]).filter(x=>x.sourceEventId===e.id).forEach(x=>{x.cancelled=true;});
    logActivity('Cancelled special event "'+e.name+'".','schedule');persist();closeModal();renderSpecialEventsSub();
  });
  document.getElementById('mDeleteEvent')?.addEventListener('click',()=>{
    if(!isGlobalScheduleAdmin()||e.status!=='cancelled'||(e.requests||[]).length){toast('Only an unstaffed cancelled event can be removed. Keep staffed events for the audit record.',true);return;}
    if(!confirm('Remove this cancelled, unstaffed event from the calendar list?'))return;
    e.status='deleted';e.deletedAt=new Date().toISOString();e.deletedBy=CURRENT_USER_ID;
    logActivity('Archived deleted event "'+e.name+'".','schedule');persist();closeModal();renderSpecialEventsSub();
  });
  document.getElementById('mAssignEvent')?.addEventListener('click',()=>openSpecialEventAssignmentModal(e));
  document.getElementById('mRequestEvent')?.addEventListener('click',()=>{const staffingCategoryId=document.getElementById('mRequestEventCategory').value;if((e.staffingRequirements||[]).length&&!staffingCategoryId){toast('Choose the staffing category you are requesting.',true);return;}const category=(e.staffingRequirements||[]).find(c=>c.id===staffingCategoryId);if(!staffingPersonHasSkill(STATE.pm.records,CURRENT_USER_ID,category)){toast('You do not have the required skill for this category.',true);return;}e.requests.push({personId:CURRENT_USER_ID,staffingCategoryId,status:'pending',conflict,requestedAt:new Date().toISOString()});logActivity(`Requested assignment to special event "${e.name}".`,'schedule');persist();closeModal();renderSpecialEventsSub();});
  document.querySelectorAll('[data-event-award]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.eventAward;const regular=specialEventConflicts(id,e).regularDuty;if(regular&&!confirm(personName(id)+' is scheduled for regular duty. Reassign them to this special event for these dates?'))return;applySpecialEventAssignments(e,[id],regular,false,document.querySelector('[data-event-award-category="'+id+'"]').value);}));
  wireRecordLinks();
}

function renderShiftSwapsSub(){
  const requests=(STATE.pm.shiftSwapRequests||[]).filter(r=>[r.requesterId,r.coveringId].includes(CURRENT_USER_ID)||canViewPersonSchedule(r.requesterId,r)).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const rows=requests.map(r=>{
    const manages=canManageSwapRequest(r),pending=r.status==='pending';
    return `<tr><td>${escapeHtml(r.date)}</td><td>${recordLink(r.requesterId)}</td><td>${recordLink(r.coveringId)}</td><td>${escapeHtml(r.reason||'')}</td><td>${escapeHtml(r.status)}</td><td>${pending&&manages?`<button class="btn btn-sm btn-primary" data-swap-approve="${r.id}">Approve</button> <button class="btn btn-sm btn-outline" data-swap-deny="${r.id}">Deny</button>`:''}${pending&&r.requesterId===CURRENT_USER_ID?`<button class="btn btn-sm btn-outline" data-swap-cancel="${r.id}">Cancel Request</button>`:''}</td></tr>`;
  }).join('')||'<tr><td colspan="6" style="padding:16px;text-align:center;">No shift swap requests.</td></tr>';
  document.getElementById('schedSubBody').innerHTML=`<div class="panel"><div class="panel-head"><h2>Shift Swap Requests</h2>${can('pm_leave_request_submit')||can('pm_schedule_manage')?'<button class="btn btn-primary btn-sm" id="btnNewSwap">Request Swap</button>':''}</div><div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Requesting</th><th>Covering</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  document.getElementById('btnNewSwap')?.addEventListener('click',()=>openSwapRequestModal());
  document.querySelectorAll('[data-swap-approve]').forEach(b=>b.onclick=()=>approveSwapRequest(b.dataset.swapApprove));
  document.querySelectorAll('[data-swap-deny]').forEach(b=>b.onclick=()=>denySwapRequest(b.dataset.swapDeny));
  document.querySelectorAll('[data-swap-cancel]').forEach(b=>b.onclick=()=>cancelSwapRequest(b.dataset.swapCancel));
  wireRecordLinks();
}

function renderRosterSub(){
  if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
  if(!STATE.pm.shiftSwapRequests) STATE.pm.shiftSwapRequests = [];
  if(!STATE.pm.scheduleCoverages) STATE.pm.scheduleCoverages = [];
  const canManage = can('pm_schedule_manage');
  const todayStr = fmt(new Date());
  const visibleShifts = sortShiftsForSelection(
    STATE.pm.scheduleShifts.filter(s=>canViewScheduleShift(s)&&(SHOW_PAST_SHIFT_PATTERNS||shiftPatternStatus(s,todayStr)!=='past')),
    todayStr
  );
  const pastCount = STATE.pm.scheduleShifts.filter(s=>shiftPatternStatus(s,todayStr)==='past').length;
  const shiftRows = visibleShifts.map(s=>{
    const canManage=canManageScheduleShift(s);
    const status = shiftPatternStatus(s, todayStr);
    const published = s.published !== false;
    const statusBadge = !published ? `<span class="badge" style="background:var(--text-dim)22;color:var(--text-dim);margin-left:8px;">Draft / Hidden</span>` : status==='future' ? `<span class="badge" style="background:var(--gold)22;color:var(--gold);margin-left:8px;">Upcoming</span>` : status==='past' ? `<span class="badge" style="background:var(--text-dim)22;color:var(--text-dim);margin-left:8px;">Past</span>` : '';
    return `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${shiftColor(s)};margin-right:8px;"></span>${escapeHtml(s.name)}${statusBadge}</td><td>${escapeHtml(describeShiftPattern(s))}</td><td>${SuiteUX.displayTimeOnly(s.hoursStart)} - ${SuiteUX.displayTimeOnly(s.hoursEnd)}</td><td>${s.minStaff||0}${(s.staffingRequirements||[]).map(r=>`<br><span class="hint">${escapeHtml(r.name)}: ${r.count}</span>`).join('')}</td><td style="font-size:12px;color:var(--text-dim);">${escapeHtml(formatShiftDateRange(s))}</td>
    ${canManage?`<td><div class="cell-actions">${!published? `<button class="btn btn-sm btn-outline" data-preview-shift="${s.id}">View</button>`:''}${can('pm_schedule_publish')?`<button class="btn btn-sm btn-outline" data-publish-shift="${s.id}">${published?'Hide':'Publish'}</button>`:''}<button class="btn-icon" data-edit-shift="${s.id}" title="Edit">${ICONS.edit}</button><button class="btn-icon" data-del-shift="${s.id}" title="Delete">${ICONS.trash}</button></div></td>`:'<td></td>'}</tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">${SHOW_PAST_SHIFT_PATTERNS ? 'No shift patterns defined yet.' : 'No current or upcoming shift patterns. '+(pastCount?'<button class="btn-sm btn btn-outline" id="btnShowPastShiftsInline">Show past patterns</button>':'')}</td></tr>`;

  const rosterRows = STATE.pm.scheduleAssignments.filter(a=>!a.endDate&&canViewScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId))).map(a=>{
    const shift = STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId);
    const canManage=canManageScheduleShift(shift);
    return `<tr><td>${recordLink(a.personId)}</td><td>${escapeHtml(a.unit)}</td><td>${shift?escapeHtml(shift.name)+(a.staffingCategoryId?' · '+escapeHtml(staffingCategoryName(shift,a.staffingCategoryId)):'')+(shift.published===false?' <span class="badge" style="background:var(--text-dim)22;color:var(--text-dim);">Draft</span>':''):'—'}</td>
    <td>${shift?SuiteUX.displayTimeOnly(shift.hoursStart)+' - '+SuiteUX.displayTimeOnly(shift.hoursEnd):''}</td><td>${escapeHtml(a.location)}</td>
    ${canManage?`<td><div class="cell-actions"><button class="btn-icon" data-edit-assign="${a.id}" title="Edit">${ICONS.edit}</button><button class="btn btn-sm btn-outline" data-del-assign="${a.id}" title="End assignment">End Assignment</button></div></td>`:'<td></td>'}</tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No active shift assignments.</td></tr>`;

  const exceptionRows = (STATE.pm.scheduleExceptions||[]).slice()
    .filter(e=>{
      if(!canViewPersonSchedule(e.personId,e))return false;
      if(!EXCEPTIONS_FILTER.showPast && e.endDate < todayStr) return false;
      const q = EXCEPTIONS_FILTER.q.trim().toLowerCase();
      if(q && !personName(e.personId).toLowerCase().includes(q) && !(e.notes||'').toLowerCase().includes(q) && !e.code.toLowerCase().includes(q)) return false;
      if(EXCEPTIONS_FILTER.dateFrom && e.endDate < EXCEPTIONS_FILTER.dateFrom) return false;
      if(EXCEPTIONS_FILTER.dateTo && e.startDate > EXCEPTIONS_FILTER.dateTo) return false;
      return true;
    })
    .sort((a,b)=>b.startDate.localeCompare(a.startDate)).map(e=>{
    const canManage=canManagePersonSchedule(e.personId,e);
    const code = exceptionCodeInfo(e.code);
    const dateRange = e.startDate===e.endDate ? e.startDate : `${e.startDate} to ${e.endDate}`;
    return `<tr><td>${recordLink(e.personId)}</td><td><span class="badge" style="background:${code.color}22;color:${code.color};border:1px solid ${code.color}55;">${escapeHtml(e.code)}</span> <span style="color:var(--text-dim);font-size:11px;">${escapeHtml(code.name)}</span></td><td>${escapeHtml(dateRange)}</td><td>${escapeHtml(e.notes||'')}</td>
    ${canManage?`<td><div class="cell-actions"><button class="btn-icon" data-edit-exception="${e.id}" title="Edit">${ICONS.edit}</button><button class="btn-icon" data-del-exception="${e.id}" title="Delete">${ICONS.trash}</button></div></td>`:'<td></td>'}</tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">${(STATE.pm.scheduleExceptions||[]).length ? 'No time off or exceptions match this filter.' : 'No time off or exceptions logged.'}</td></tr>`;
  const excPastCount = (STATE.pm.scheduleExceptions||[]).filter(e=>e.endDate < todayStr).length;

  const swapStatusColors = {pending:'var(--gold)', approved:'var(--green)', denied:'var(--red)', cancelled:'var(--text-dim)'};
  const swapRows = (STATE.pm.shiftSwapRequests||[]).slice()
    .filter(r=>{
      if(![r.requesterId,r.coveringId].includes(CURRENT_USER_ID)&&!canViewPersonSchedule(r.requesterId,r))return false;
      if(!SWAP_FILTER.showPast && r.date < todayStr) return false;
      const q = SWAP_FILTER.q.trim().toLowerCase();
      if(q && !personName(r.requesterId).toLowerCase().includes(q) && !personName(r.coveringId).toLowerCase().includes(q) && !(r.reason||'').toLowerCase().includes(q)) return false;
      if(SWAP_FILTER.dateFrom && r.date < SWAP_FILTER.dateFrom) return false;
      if(SWAP_FILTER.dateTo && r.date > SWAP_FILTER.dateTo) return false;
      return true;
    })
    .sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{
    const canManage=canManageSwapRequest(r);
    const isOwn = r.requesterId===CURRENT_USER_ID;
    const actions = [];
    if(r.status==='pending' && canManage) actions.push(`<button class="btn-icon" data-approve-swap="${r.id}" title="Approve" style="color:var(--green);">${ICONS.check||'&check;'}</button><button class="btn-icon" data-deny-swap="${r.id}" title="Deny" style="color:var(--red);">${ICONS.x||'&times;'}</button>`);
    if(r.status==='pending' && isOwn) actions.push(`<button class="btn-sm btn btn-outline" data-cancel-swap="${r.id}">Cancel</button>`);
    if(canManage) actions.push(`<button class="btn-icon" data-del-swap="${r.id}" title="Delete record">${ICONS.trash}</button>`);
    return `<tr><td>${escapeHtml(r.date)}</td><td>${recordLink(r.requesterId)}</td><td>${recordLink(r.coveringId)}</td><td>${escapeHtml(r.reason||'')}</td>
    <td><span style="color:${swapStatusColors[r.status]||'var(--text-dim)'};font-weight:700;text-transform:capitalize;">${escapeHtml(r.status)}</span></td>
    <td><div class="cell-actions">${actions.join('')}</div></td></tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">${(STATE.pm.shiftSwapRequests||[]).length ? 'No shift swap requests match this filter.' : 'No shift swap requests.'}</td></tr>`;
  const swapPastCount = (STATE.pm.shiftSwapRequests||[]).filter(r=>r.date < todayStr).length;

  document.getElementById('schedSubBody').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the schedule in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      ${collapsibleCardHead('dutyRoster', `<div><h2 style="display:inline;">Duty Roster</h2> <span class="hint">${STATE.pm.scheduleAssignments.filter(a=>!a.endDate).length} active assignments</span></div>`, `
          <div class="work-tabs" style="padding:0;border:0;" aria-label="Duty roster view">
            <button class="work-tab ${SCHED_VIEW==='roster'?'active':''}" aria-pressed="${SCHED_VIEW==='roster'}" data-sched-view="roster">List</button>
            <button class="work-tab ${SCHED_VIEW==='calendar'?'active':''}" aria-pressed="${SCHED_VIEW==='calendar'}" data-sched-view="calendar">Calendar</button>
          </div>
          ${canManage?`<button class="btn btn-sm btn-outline" id="btnAddAssignment">${ICONS.plus} Assign Pattern</button><button class="btn btn-sm btn-outline" id="btnAddOneOff">${ICONS.plus} Add Person to Shift</button>`:''}
          ${can('staff_notify_send')?`<button class="btn btn-sm btn-outline" id="btnRosterStaffNotice">${ICONS.chat||''} Send Staff Notice</button>`:''}
          <button class="btn btn-sm btn-outline" id="btnPrintRoster">Print / Save as PDF</button>
        `)}
      <div data-panel-body="dutyRoster" style="${schedCardCollapsed('dutyRoster')?'display:none;':''}">
        <div class="panel-body" id="dutyRosterBody" style="overflow-x:auto;"></div>
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px;">
      ${collapsibleCardHead('exceptions', '<h2>Time Off &amp; Exceptions</h2>', canManage?`<button class="btn btn-sm btn-outline" id="btnAddException">${ICONS.plus} Log Exception</button>`:'',
        `<div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">RDO (Regular Day Off), VDO (Vacation), CDO (Compensatory Day Off), SDO (Scheduled Day Off), and TDO (Training Day Off) all reduce that day's on-duty count on the Calendar below, even for someone who'd otherwise be working per their rotation.</div>`)}
      <div data-panel-body="exceptions" style="${schedCardCollapsed('exceptions')?'display:none;':''}">
        <div class="toolbar" style="padding:14px 20px 0;margin-bottom:0;">
          <div class="filters">
            <input type="text" id="excSearch" placeholder="Search name, code, or notes..." style="width:220px;" value="${escapeHtml(EXCEPTIONS_FILTER.q)}">
            <input type="date" id="excDateFrom" title="On or after this date" value="${EXCEPTIONS_FILTER.dateFrom}">
            <input type="date" id="excDateTo" title="On or before this date" value="${EXCEPTIONS_FILTER.dateTo}">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkExcShowPast" style="width:auto;" ${EXCEPTIONS_FILTER.showPast?'checked':''}> Show past${excPastCount?` (${excPastCount})`:''}</label>
          </div>
        </div>
        <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Code</th><th>Dates</th><th>Notes</th><th></th></tr></thead><tbody>${exceptionRows}</tbody></table></div>
      </div>
    </div>
    <div class="panel">
      ${collapsibleCardHead('swaps', '<h2>Shift Swap Requests</h2>', `<button class="btn btn-sm btn-primary" id="btnRequestSwap">${ICONS.plus} Request Swap</button>`,
        `<div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">Anyone can submit a swap request; approving it here logs an SWP entry for the person taking the day off and adds the covering officer to that day's Calendar and staffing count.</div>`)}
      <div data-panel-body="swaps" style="${schedCardCollapsed('swaps')?'display:none;':''}">
        <div class="toolbar" style="padding:14px 20px 0;margin-bottom:0;">
          <div class="filters">
            <input type="text" id="swapSearch" placeholder="Search name or reason..." style="width:220px;" value="${escapeHtml(SWAP_FILTER.q)}">
            <input type="date" id="swapDateFrom" title="On or after this date" value="${SWAP_FILTER.dateFrom}">
            <input type="date" id="swapDateTo" title="On or before this date" value="${SWAP_FILTER.dateTo}">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkSwapShowPast" style="width:auto;" ${SWAP_FILTER.showPast?'checked':''}> Show past${swapPastCount?` (${swapPastCount})`:''}</label>
          </div>
        </div>
        <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Requesting</th><th>Covering</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>${swapRows}</tbody></table></div>
      </div>
    </div>
    <div class="panel" style="margin-top:16px;">
      ${collapsibleCardHead('shiftPatterns', '<h2>Shift Patterns</h2>', `
          ${pastCount ? `<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);cursor:pointer;font-weight:400;"><input type="checkbox" id="chkShowPastShifts" style="width:auto;" ${SHOW_PAST_SHIFT_PATTERNS?'checked':''}> Show ${pastCount} past pattern${pastCount===1?'':'s'}</label>` : ''}
          ${canManage?`<button class="btn btn-sm btn-primary" id="btnAddShift">${ICONS.plus} New Pattern</button>`:''}
        `)}
      <div data-panel-body="shiftPatterns" style="${schedCardCollapsed('shiftPatterns')?'display:none;':''}">
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Pattern</th><th>Rotation</th><th>Hours</th><th>Min Staff</th><th>Dates</th><th></th></tr></thead><tbody>${shiftRows}</tbody></table></div>
      </div>
    </div>
  `;
  wireCollapsibleCards(document.getElementById('schedSubBody'));
  document.getElementById('btnPrintRoster').addEventListener('click', ()=>window.print());
  document.getElementById('btnRosterStaffNotice')?.addEventListener('click', ()=>{
    sessionStorage.setItem('sonomarzi.staffNotice.return','scheduling');
    SuiteUX.navigate('shared/notices');
  });
  document.getElementById('btnRequestSwap').addEventListener('click', ()=>openSwapRequestModal());
  document.querySelectorAll('[data-sched-view]').forEach(b=>b.addEventListener('click', ()=>{ SCHED_VIEW=b.dataset.schedView; renderScheduling(); }));
  const rosterBody = document.getElementById('dutyRosterBody');
  if(SCHED_VIEW==='calendar'){
    rosterBody.style.padding = '16px';
    renderDutyCalendar(rosterBody);
  } else {
    rosterBody.style.padding = '0';
    rosterBody.innerHTML = `<table><thead><tr><th>Employee</th><th>Unit</th><th>Shift Pattern</th><th>Hours</th><th>Location</th><th></th></tr></thead><tbody>${rosterRows}</tbody></table>`;
  }
  document.querySelectorAll('[data-approve-swap]').forEach(b=>b.addEventListener('click', ()=>approveSwapRequest(b.dataset.approveSwap)));
  document.querySelectorAll('[data-deny-swap]').forEach(b=>b.addEventListener('click', ()=>denySwapRequest(b.dataset.denySwap)));
  document.querySelectorAll('[data-cancel-swap]').forEach(b=>b.addEventListener('click', ()=>cancelSwapRequest(b.dataset.cancelSwap)));
  document.querySelectorAll('[data-del-swap]').forEach(b=>b.addEventListener('click', ()=>deleteSwapRequest(b.dataset.delSwap)));
  const showPastChk = document.getElementById('chkShowPastShifts');
  if(showPastChk) showPastChk.addEventListener('change', ()=>{ SHOW_PAST_SHIFT_PATTERNS = showPastChk.checked; renderScheduling(); });
  const showPastInline = document.getElementById('btnShowPastShiftsInline');
  if(showPastInline) showPastInline.addEventListener('click', ()=>{ SHOW_PAST_SHIFT_PATTERNS = true; renderScheduling(); });
  document.getElementById('excSearch').addEventListener('input', e=>{ EXCEPTIONS_FILTER.q=e.target.value; renderScheduling(); refocusFilterInput('excSearch'); });
  document.getElementById('excDateFrom').addEventListener('change', e=>{ EXCEPTIONS_FILTER.dateFrom=e.target.value; renderScheduling(); });
  document.getElementById('excDateTo').addEventListener('change', e=>{ EXCEPTIONS_FILTER.dateTo=e.target.value; renderScheduling(); });
  document.getElementById('chkExcShowPast').addEventListener('change', e=>{ EXCEPTIONS_FILTER.showPast=e.target.checked; renderScheduling(); });
  document.getElementById('swapSearch').addEventListener('input', e=>{ SWAP_FILTER.q=e.target.value; renderScheduling(); refocusFilterInput('swapSearch'); });
  document.getElementById('swapDateFrom').addEventListener('change', e=>{ SWAP_FILTER.dateFrom=e.target.value; renderScheduling(); });
  document.getElementById('swapDateTo').addEventListener('change', e=>{ SWAP_FILTER.dateTo=e.target.value; renderScheduling(); });
  document.getElementById('chkSwapShowPast').addEventListener('change', e=>{ SWAP_FILTER.showPast=e.target.checked; renderScheduling(); });
  if(canManage){
    document.getElementById('btnAddShift').addEventListener('click', ()=>openShiftFormModal(null));
    document.getElementById('btnAddAssignment').addEventListener('click', ()=>openAssignmentFormModal(null));
    document.getElementById('btnAddOneOff').addEventListener('click', ()=>openOneOffCoverageModal());
    document.querySelectorAll('[data-preview-shift]').forEach(b=>b.addEventListener('click', ()=>{
      const shift=STATE.pm.scheduleShifts.find(s=>s.id===b.dataset.previewShift);
      if(!shift||shift.published!==false||!canManageScheduleShift(shift)){toast('You cannot preview this draft pattern.',true);return;}
      SCHED_DRAFT_PREVIEW_ID=shift.id;SCHED_CAL_SHIFT=shift.id;SCHED_CAL_WORKGROUPS=[shift.workGroupId];
      const first=shift.startDate||shift.date;
      if(first && /^\d{4}-\d{2}-\d{2}$/.test(first)){SCHED_CAL_YEAR=Number(first.slice(0,4));SCHED_CAL_MONTH=Number(first.slice(5,7))-1;}
      SCHED_VIEW='calendar';renderScheduling();
    }));
    document.querySelectorAll('[data-publish-shift]').forEach(b=>b.addEventListener('click', ()=>{
      if(!can('pm_schedule_publish')) return;
      const shift=STATE.pm.scheduleShifts.find(s=>s.id===b.dataset.publishShift); if(!shift||!canManageScheduleShift(shift))return;
      shift.published = shift.published===false;
      logActivity((shift.published?'Published ':'Hid ')+'shift pattern "'+shift.name+'" '+(shift.published?'to':'from')+' the duty roster.', 'schedule', shift.id);
      persist(); renderScheduling();
    }));
    document.getElementById('btnAddException').addEventListener('click', ()=>openExceptionFormModal(null));
    document.querySelectorAll('[data-edit-shift]').forEach(b=>b.addEventListener('click', ()=>openShiftFormModal(STATE.pm.scheduleShifts.find(s=>s.id===b.dataset.editShift))));
    document.querySelectorAll('[data-del-shift]').forEach(b=>b.addEventListener('click', ()=>{
      if(!canManageScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===b.dataset.delShift)))return;
      const inUse = STATE.pm.scheduleAssignments.some(a=>a.shiftId===b.dataset.delShift && !a.endDate);
      if(inUse){ toast("Can't remove a pattern that's actively assigned.", true); return; }
      STATE.pm.scheduleShifts = STATE.pm.scheduleShifts.filter(s=>s.id!==b.dataset.delShift);
      persist(); renderScheduling();
    }));
    document.querySelectorAll('[data-edit-assign]').forEach(b=>b.addEventListener('click', ()=>openAssignmentFormModal(STATE.pm.scheduleAssignments.find(a=>a.id===b.dataset.editAssign))));
    document.querySelectorAll('[data-del-assign]').forEach(b=>b.addEventListener('click', ()=>{
      const a = STATE.pm.scheduleAssignments.find(x=>x.id===b.dataset.delAssign);
      if(!a||!canManageScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId)))return;
      if(!confirm(`End the shift assignment for ${personName(a.personId)}?`)) return;
      const effectiveDate=fmt(new Date());
      if(a.startDate>effectiveDate)STATE.pm.scheduleAssignments=STATE.pm.scheduleAssignments.filter(row=>row.id!==a.id);
      else a.endDate=effectiveDate;
      logActivity(`Ended shift assignment for ${personName(a.personId)}.`, "schedule", a.id);
      persist(); renderScheduling();
    }));
    document.querySelectorAll('[data-edit-exception]').forEach(b=>b.addEventListener('click', ()=>openExceptionFormModal(STATE.pm.scheduleExceptions.find(e=>e.id===b.dataset.editException))));
    document.querySelectorAll('[data-del-exception]').forEach(b=>b.addEventListener('click', ()=>{
      const e = STATE.pm.scheduleExceptions.find(x=>x.id===b.dataset.delException);
      if(!e||!canManagePersonSchedule(e.personId,e))return;
      if(!confirm(`Delete this ${e.code} entry for ${personName(e.personId)}?`)) return;
      STATE.pm.scheduleExceptions = STATE.pm.scheduleExceptions.filter(x=>x.id!==e.id);
      logActivity(`Deleted a ${e.code} exception for ${personName(e.personId)}.`, "schedule");
      persist(); renderScheduling();
    }));
  }
  wireRecordLinks();
}

/* =========================================================================
   SCHEDULING: shared helpers used by Overtime, Bidding, Extra Duty, Roll Call
   ========================================================================= */
// Earliest hire date wins (most senior). Missing hire dates sort last, not first --
// treating an unknown hire date as "senior" would be actively wrong.
function seniorityDate(personId){
  const r = recordFor(personId);
  return (r && r.hireDate) ? r.hireDate : '9999-99-99';
}
function personPhone(personId){
  const r = recordFor(personId);
  return (r && r.phones && r.phones[0] && r.phones[0].number) || '';
}
// Duration of a shift pattern in hours, handling the overnight-wrap case (e.g. 18:00-06:00).
function shiftHours(shift){
  if(!shift) return 0;
  const toMin = t=>{ const parts=(t||'00:00').split(':'); return (Number(parts[0])||0)*60 + (Number(parts[1])||0); };
  let mins = toMin(shift.hoursEnd) - toMin(shift.hoursStart);
  if(mins <= 0) mins += 24*60;
  return Math.round((mins/60)*100)/100;
}
// Everyone actually on duty for a shift/date: assigned per rotation, minus anyone with an
// active time-off exception that day, plus anyone added via a one-off coverage (swap or OT).
function onDutyRoster(shift, dateStr){
  const assigned = STATE.pm.scheduleAssignments.filter(a=>a.shiftId===shift.id && isOnDutyOnDate(a, shift, dateStr) && !activeExceptionFor(a.personId, dateStr)).map(a=>a.personId);
  const covering = (STATE.pm.scheduleCoverages||[]).filter(c=>c.date===dateStr && c.shiftId===shift.id).map(c=>c.personId);
  return [...new Set([...assigned, ...covering])];
}
function computeCoverageGaps(days){
  const todayStr = fmt(new Date());
  const shifts = STATE.pm.scheduleShifts.filter(s=>s.published!==false && shiftPatternStatus(s,todayStr)!=='past' && (Number(s.minStaff)||0)>0);
  const gaps = [];
  for(let i=0;i<days;i++){
    const dateStr = fmt(addDays(new Date(), i));
    shifts.forEach(shift=>{
      const summary=shiftStaffingSummary(shift,dateStr);
      if(!summary.ok){
        if(summary.categories.length)summary.categories.filter(r=>r.needed>0).forEach(r=>gaps.push({date:dateStr,shiftId:shift.id,shift,staffed:r.staffed,minStaff:r.count,needed:r.needed,staffingCategoryId:r.id,categoryName:r.name}));
        else gaps.push({date:dateStr,shiftId:shift.id,shift,staffed:summary.staffed,minStaff:summary.minStaff,needed:summary.needed});
      }
    });
  }
  return gaps;
}
// Overtime hours a person has actually worked (confirmed coverages logged as overtime),
// counted over a trailing window -- this is what fairness rotation sorts by.
function otHoursSince(personId, sinceDateStr){
  return (STATE.pm.scheduleCoverages||[]).filter(c=>c.personId===personId && c.source==='overtime' && c.date>=sinceDateStr)
    .reduce((sum,c)=>sum+(Number(c.hours)||0), 0);
}
// Fewest overtime hours in the last 90 days gets called first; ties break by seniority.
// This is the standard "equalization" rule most agencies actually run callback lists by --
// straight seniority order would let senior officers hoard overtime indefinitely.
function rankedCallbackList(){
  const since = fmt(addDays(new Date(), -90));
  return (STATE.pm.otCallbackOptIns||[]).map(personId=>({
    personId, hours: otHoursSince(personId, since), seniority: seniorityDate(personId),
  })).sort((a,b)=> a.hours-b.hours || a.seniority.localeCompare(b.seniority));
}

function renderOvertimeSub(){
  const canManage = can('pm_overtime_manage');
  const canRequest = can('pm_overtime_optin');
  const gaps = computeCoverageGaps(OT_LOOKAHEAD_DAYS).filter(g=>canViewWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(w=>w.id===g.shift.workGroupId)));
  const ranked = rankedCallbackList(), isOptedIn=STATE.pm.otCallbackOptIns.includes(CURRENT_USER_ID);
  const eligibleToAdd=STATE.personnel.filter(p=>!STATE.pm.otCallbackOptIns.includes(p.id)&&canManagePersonSchedule(p.id,{},'pm_overtime_manage'));
  const opportunities=(STATE.pm.overtimeOpportunities||[]).filter(o=>o.status!=='closed'&&canViewScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===o.shiftId))).sort((a,b)=>a.date.localeCompare(b.date));
  const oppRows=opportunities.map(o=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===o.shiftId);if(!shift)return '';const mine=(o.requests||[]).find(r=>r.personId===CURRENT_USER_ID);const mgr=canManageOvertimeShift(shift);const qualified=staffingPersonHasSkill(STATE.pm.records,CURRENT_USER_ID,(shift.staffingRequirements||[]).find(c=>c.id===o.staffingCategoryId));return `<tr><td>${escapeHtml(o.date)}</td><td>${escapeHtml(scheduleWorkGroupName(shift.workGroupId))}</td><td>${escapeHtml(shift.name)}${o.staffingCategoryId?' · '+escapeHtml(staffingCategoryName(shift,o.staffingCategoryId)):''}</td><td>${(o.requests||[]).filter(r=>r.status==='pending').length} pending</td><td>${mine?'<span class="badge">'+escapeHtml(mine.status)+'</span>':canRequest&&qualified?'<button class="btn btn-sm btn-primary" data-request-ot="'+o.id+'">Request Shift</button>':''}${mgr?' <button class="btn btn-sm btn-outline" data-review-ot="'+o.id+'">Review</button>':''}</td></tr>`;}).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No open overtime opportunities.</td></tr>';
  const gapRows=gaps.map(g=>{const mgr=canManageOvertimeShift(g.shift);const existing=opportunities.find(o=>o.date===g.date&&o.shiftId===g.shiftId&&(o.staffingCategoryId||'')===(g.staffingCategoryId||''));return `<tr><td>${escapeHtml(g.date)}</td><td>${escapeHtml(scheduleWorkGroupName(g.shift.workGroupId))}</td><td>${escapeHtml(g.shift.name)}${g.categoryName?' · '+escapeHtml(g.categoryName):''}</td><td style="color:var(--red);font-weight:700;">${g.staffed}/${g.minStaff}</td><td>${g.needed}</td><td>${mgr&&!existing?'<button class="btn btn-sm btn-primary" data-publish-ot="'+escapeHtml(g.date)+'|'+g.shiftId+'|'+(g.staffingCategoryId||'')+'">Publish OT</button>':existing?'<span class="badge">Published</span>':''}</td></tr>`;}).join('')||`<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No coverage gaps in the next ${OT_LOOKAHEAD_DAYS} days.</td></tr>`;
  const rankRows=ranked.map((row,i)=>`<tr><td>${i+1}</td><td>${recordLink(row.personId)}</td><td>${escapeHtml(personPhone(row.personId)||'—')}</td><td>${row.hours.toFixed(1)} hrs</td>${canManage&&canManagePersonSchedule(row.personId,{},'pm_overtime_manage')?`<td><button class="btn-icon" data-remove-optin="${row.personId}" title="Remove from list">${ICONS.trash}</button></td>`:'<td></td>'}</tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No one is currently on the callback list.</td></tr>';
  document.getElementById('schedSubBody').innerHTML=`<div class="panel" style="margin-bottom:16px;"><div class="panel-head"><div><h2>Open Overtime Opportunities</h2><span class="hint">Published vacancies staff can request</span></div></div><div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Work Group</th><th>Shift</th><th>Requests</th><th></th></tr></thead><tbody>${oppRows}</tbody></table></div></div>
  <div class="panel" style="margin-bottom:16px;"><div class="panel-head"><h2>Coverage Gaps</h2><span class="hint">Next ${OT_LOOKAHEAD_DAYS} days</span></div><div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Date</th><th>Work Group</th><th>Shift</th><th>Staffing</th><th>Needed</th><th></th></tr></thead><tbody>${gapRows}</tbody></table></div></div>
  <div class="panel"><div class="panel-head"><h2>Overtime Callback List</h2><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${canRequest?`<button class="btn btn-sm ${isOptedIn?'btn-outline':'btn-primary'}" id="btnToggleOptIn">${isOptedIn?'Leave the list':'Join the callback list'}</button>`:''}${canManage?`<select id="fAddOptIn" style="max-width:220px;"><option value="">Add someone…</option>${eligibleToAdd.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>`:''}</div></div><div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">Ranked by fewest overtime hours worked in the last 90 days; ties break by seniority.</div><div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>#</th><th>Employee</th><th>Phone</th><th>OT Hours (90d)</th><th></th></tr></thead><tbody>${rankRows}</tbody></table></div></div>`;
  document.querySelectorAll('[data-publish-ot]').forEach(b=>b.onclick=()=>{const [date,shiftId,staffingCategoryId='']=b.dataset.publishOt.split('|');STATE.pm.overtimeOpportunities.push({id:'oto'+Date.now(),date,shiftId,staffingCategoryId,status:'open',requests:[],createdBy:CURRENT_USER_ID,createdAt:new Date().toISOString()});logActivity(`Published overtime opportunity for ${STATE.pm.scheduleShifts.find(s=>s.id===shiftId)?.name||'shift'} on ${date}.`,'schedule');persist();renderOvertimeSub();});
  document.querySelectorAll('[data-request-ot]').forEach(b=>b.onclick=()=>{const o=STATE.pm.overtimeOpportunities.find(x=>x.id===b.dataset.requestOt),shift=STATE.pm.scheduleShifts.find(s=>s.id===o.shiftId);if(!staffingPersonHasSkill(STATE.pm.records,CURRENT_USER_ID,(shift.staffingRequirements||[]).find(c=>c.id===o.staffingCategoryId))){toast('You do not have the required skill for this overtime slot.',true);return;}const conflict=personScheduledOnDate(CURRENT_USER_ID,o.date);if(conflict){toast('You are already scheduled to work on this date.',true);return;}o.requests.push({personId:CURRENT_USER_ID,status:'pending',requestedAt:new Date().toISOString()});logActivity(`Requested overtime on ${o.date} for ${shift.name}.`,'schedule');persist();renderOvertimeSub();});
  document.querySelectorAll('[data-review-ot]').forEach(b=>b.onclick=()=>openOvertimeOpportunity(b.dataset.reviewOt));
  document.getElementById('btnToggleOptIn')?.addEventListener('click',()=>{if(isOptedIn)STATE.pm.otCallbackOptIns=STATE.pm.otCallbackOptIns.filter(id=>id!==CURRENT_USER_ID);else STATE.pm.otCallbackOptIns.push(CURRENT_USER_ID);logActivity(`${isOptedIn?'Left':'Joined'} the overtime callback list.`,'schedule');persist();renderOvertimeSub();});
  document.getElementById('fAddOptIn')?.addEventListener('change',e=>{if(!e.target.value||!canManagePersonSchedule(e.target.value,{},'pm_overtime_manage'))return;STATE.pm.otCallbackOptIns.push(e.target.value);persist();renderOvertimeSub();});
  document.querySelectorAll('[data-remove-optin]').forEach(b=>b.onclick=()=>{if(!canManagePersonSchedule(b.dataset.removeOptin,{},'pm_overtime_manage'))return;STATE.pm.otCallbackOptIns=STATE.pm.otCallbackOptIns.filter(id=>id!==b.dataset.removeOptin);persist();renderOvertimeSub();});wireRecordLinks();
}
function openOvertimeOpportunity(id){
 const o=STATE.pm.overtimeOpportunities.find(x=>x.id===id),shift=STATE.pm.scheduleShifts.find(s=>s.id===o?.shiftId);if(!o||!shift||!canManageOvertimeShift(shift)||o.status==='closed')return;
 const req=(o.requests||[]).map(r=>`<tr><td>${recordLink(r.personId)}</td><td>${otHoursSince(r.personId,fmt(addDays(new Date(),-90))).toFixed(1)}</td><td>${escapeHtml(seniorityDate(r.personId))}</td><td>${escapeHtml(r.status)}</td><td>${r.status==='pending'?'<button class="btn btn-sm btn-primary" data-award-ot="'+r.personId+'">Award</button>':''}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-dim);">No requests yet.</td></tr>';
 document.getElementById('modalBox').className='modal modal-lg';document.getElementById('modalBox').innerHTML=`<div class="modal-head"><h3>Overtime Requests</h3><button class="modal-close" id="mClose">&times;</button></div><div class="modal-body"><p>${escapeHtml(shift.name)} · ${escapeHtml(o.date)}</p><table><thead><tr><th>Employee</th><th>OT Hours (90d)</th><th>Seniority</th><th>Status</th><th></th></tr></thead><tbody>${req}</tbody></table></div><div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>`;openModal();document.getElementById('mClose').onclick=closeModal;document.getElementById('mCancel').onclick=closeModal;
 document.querySelectorAll('[data-award-ot]').forEach(b=>b.onclick=()=>{if(personScheduledOnDate(b.dataset.awardOt,o.date)){toast('This employee has a schedule conflict.',true);return;}const r=o.requests.find(x=>x.personId===b.dataset.awardOt);if(!staffingPersonHasSkill(STATE.pm.records,r.personId,(shift.staffingRequirements||[]).find(c=>c.id===o.staffingCategoryId))){toast('This employee does not have the required skill.',true);return;}r.status='awarded';o.requests.filter(x=>x!==r&&x.status==='pending').forEach(x=>x.status='not_awarded');STATE.pm.scheduleCoverages.push({id:'cov'+Date.now(),personId:r.personId,shiftId:o.shiftId,unit:shift.name,location:'',date:o.date,source:'overtime',hours:shiftHours(shift),staffingCategoryId:o.staffingCategoryId||'',overtimeOpportunityId:o.id});o.status='closed';logActivity(`Awarded overtime to ${personName(r.personId)} for ${shift.name} on ${o.date}.`,'schedule');persist();closeModal();renderOvertimeSub();});wireRecordLinks();
}

function openFillGapModal(date, shiftId){
  const shift = STATE.pm.scheduleShifts.find(s=>s.id===shiftId);
  if(!shift||!canManageOvertimeShift(shift)) return;
  const onDuty = new Set(onDutyRoster(shift, date));
  const ranked = rankedCallbackList().filter(row=>!onDuty.has(row.personId));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Fill Coverage Gap</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--text-dim);margin-top:0;">${escapeHtml(shift.name)} &middot; ${escapeHtml(date)}</p>
      <div class="form-row"><label>Staffing Category to Fill</label><select id="fCallbackCategory">${staffingCategoryOptions(shift)}</select></div>
      <table><thead><tr><th>#</th><th>Employee</th><th>Phone</th><th>OT Hours (90d)</th><th></th></tr></thead><tbody>
        ${ranked.map((row,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(personName(row.personId))}</td><td>${escapeHtml(personPhone(row.personId)||'—')}</td><td>${row.hours.toFixed(1)}</td><td><button class="btn btn-sm btn-primary" data-confirm-fill="${row.personId}">Log as Filled</button></td></tr>`).join('')
        || (STATE.pm.otCallbackOptIns.length ? `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">Everyone on the callback list is already working that day.</td></tr>` : `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No one is on the callback list yet. Add people from the Overtime &amp; Callback tab first.</td></tr>`)}
      </tbody></table>
      <p style="font-size:11px;color:var(--text-dim);">Not on this list? Add them to the callback list first from the Overtime &amp; Callback tab.</p>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button>${StaffNotices.canCompose()?'<button class="btn btn-primary" id="mOfferSms">Notify eligible staff</button>':''}</div>
  `;
  openModal();
  const syncCallbackSkills=()=>{const category=(shift.staffingRequirements||[]).find(c=>c.id===document.getElementById('fCallbackCategory').value);document.querySelectorAll('[data-confirm-fill]').forEach(button=>button.closest('tr').style.display=staffingPersonHasSkill(STATE.pm.records,button.dataset.confirmFill,category)?'':'none');};
  document.getElementById('fCallbackCategory').onchange=syncCallbackSkills;syncCallbackSkills();
  document.getElementById('mOfferSms')?.addEventListener('click',()=>StaffNotices.offer(ranked.map(row=>row.personId),shift,date));
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-confirm-fill]').forEach(b=>b.addEventListener('click', ()=>{
    const personId = b.dataset.confirmFill;
    if(!staffingPersonHasSkill(STATE.pm.records,personId,(shift.staffingRequirements||[]).find(c=>c.id===document.getElementById('fCallbackCategory').value))){toast('This employee does not have the required skill.',true);return;}
    STATE.pm.scheduleCoverages.push({id:'cov'+Date.now(), personId, shiftId, unit:shift.name, location:'', date, source:'overtime', staffingCategoryId:document.getElementById('fCallbackCategory').value, hours:shiftHours(shift)});
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
function bidCycleFor(id){ return (STATE.pm.bidCycles||[]).find(c=>c.id===id); }
function renderBiddingSub(){
  const canManage = manageableActivityGroups('pm_bidding_manage').length>0;
  const cycle = BIDDING_CYCLE_ID ? bidCycleFor(BIDDING_CYCLE_ID) : null;
  if(cycle&&canViewScheduleActivity(cycle,'bid')) renderBidCycleDetail(cycle, canManageScheduleActivity(cycle,'bid','pm_bidding_manage'));
  else if(cycle){BIDDING_CYCLE_ID=null;renderBidCycleList(canManage);}
  else renderBidCycleList(canManage);
}
function renderBidCycleList(canManage){
  const rows = (STATE.pm.bidCycles||[]).filter(c=>canViewScheduleActivity(c,'bid')).slice().sort((a,b)=>(b.opensDate||'').localeCompare(a.opensDate||'')).map(c=>{
    const statusColor = c.status==='awarded' ? 'var(--green)' : c.status==='closed' ? 'var(--gold)' : 'var(--blue)';
    return `<tr>
      <td>${escapeHtml(c.name)}</td>
      <td><span class="badge" style="background:${c.type==='vacation'?'#14B8A622':'#1855C622'};color:${c.type==='vacation'?'#14B8A6':'#1855C6'};">${c.type==='vacation'?'Vacation Pick':'Shift Bid'}</span></td>
      <td style="font-size:12px;">${escapeHtml(c.opensDate)} to ${escapeHtml(c.closesDate)}</td>
      <td style="color:${statusColor};font-weight:700;text-transform:capitalize;">${escapeHtml(c.status)}</td>
      <td>${(c.submissions||[]).length}</td>
      <td><button class="btn btn-sm btn-outline" data-view-cycle="${c.id}">View</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No bid cycles created yet.</td></tr>`;
  document.getElementById('schedSubBody').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Bid Cycles</h2>${canManage?`<button class="btn btn-sm btn-primary" id="btnNewBidCycle">${ICONS.plus} New Cycle</button>`:''}</div>
      <div style="padding:14px 20px 0;font-size:12px;color:var(--text-dim);">A shift bid awards open shift-pattern slots by seniority. A vacation pick awards date-range requests by seniority, respecting a daily cap on how many people can be off at once.</div>
      <div class="panel-body" style="padding:14px 0 0;overflow-x:auto;"><table><thead><tr><th>Name</th><th>Type</th><th>Window</th><th>Status</th><th>Submissions</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
  const newBtn = document.getElementById('btnNewBidCycle');
  if(newBtn) newBtn.addEventListener('click', openBidCycleFormModal);
  document.querySelectorAll('[data-view-cycle]').forEach(b=>b.addEventListener('click', ()=>{ BIDDING_CYCLE_ID=b.dataset.viewCycle; renderBiddingSub(); }));
}
function renderBidCycleDetail(cycle, canManage){
  const canSubmit = can('pm_bidding_submit');
  const today = fmt(new Date());
  const windowOpen = cycle.status==='open' && today>=cycle.opensDate && today<=cycle.closesDate;
  const mySubmission = (cycle.submissions||[]).find(s=>s.personId===CURRENT_USER_ID);
  const subRows = (cycle.submissions||[]).slice().sort((a,b)=>seniorityDate(a.personId).localeCompare(seniorityDate(b.personId))).map(s=>{
    const award = (cycle.awards||[]).find(a=>a.personId===s.personId);
    let awardText = '—';
    if(award){
      if(cycle.type==='shift') awardText = award.shiftId ? escapeHtml((STATE.pm.scheduleShifts.find(sh=>sh.id===award.shiftId)||{}).name||award.shiftId) : '<span style="color:var(--red);">No preference honored</span>';
      else awardText = award.start ? `${escapeHtml(award.start)} to ${escapeHtml(award.end)}` : '<span style="color:var(--red);">No preference honored</span>';
    }
    const prefsText = cycle.type==='shift'
      ? s.prefs.map(id=>(STATE.pm.scheduleShifts.find(sh=>sh.id===id)||{}).name||id).join(' → ')
      : s.prefs.map(p=>`${p.start}–${p.end}`).join(' → ');
    return `<tr><td>${recordLink(s.personId)}</td><td style="font-size:12px;">${escapeHtml(prefsText)}</td><td>${awardText}</td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No submissions yet.</td></tr>`;

  const shiftSlotsSummary = cycle.type==='shift' ? `Effective: ${escapeHtml(cycle.effectiveDate || 'Set when awarding')}<br>` + Object.entries(cycle.shiftSlots||{}).map(([id,cap])=>{
    const shift = STATE.pm.scheduleShifts.find(s=>s.id===id);
    const taken = (cycle.awards||[]).filter(a=>a.shiftId===id).length;
    return `<span class="badge" style="margin:2px 4px 2px 0;">${escapeHtml(shift?shift.name:id)}: ${taken}/${cap} awarded</span>`;
  }).join('') : `Window: ${escapeHtml(cycle.vacationWindowStart)} to ${escapeHtml(cycle.vacationWindowEnd)} &middot; Daily cap: ${cycle.dailyCap}`;

  document.getElementById('schedSubBody').innerHTML = `
    <button class="btn btn-sm btn-outline" id="btnBackToCycles" style="margin-bottom:12px;">&larr; All cycles</button>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <div><h2>${escapeHtml(cycle.name)}</h2><span class="hint">${escapeHtml(cycle.opensDate)} to ${escapeHtml(cycle.closesDate)} &middot; <span style="text-transform:capitalize;">${escapeHtml(cycle.status)}</span></span></div>
        <div style="display:flex;gap:8px;">
          ${canSubmit && windowOpen ? `<button class="btn btn-sm btn-primary" id="btnSubmitPicks">${mySubmission?'Update My Picks':'Submit My Picks'}</button>` : ''}
          ${canManage && cycle.status!=='awarded' ? `<button class="btn btn-sm btn-outline" id="btnRunAward">Run Seniority Award</button>` : ''}
          ${canManage && !(cycle.type==='shift'&&cycle.status==='awarded') ? `<button class="btn btn-sm btn-danger" id="btnDeleteCycle">${ICONS.trash}</button>` : ''}
        </div>
      </div>
      <div class="panel-body" style="font-size:12.5px;">${shiftSlotsSummary}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Submissions &amp; Awards</h2><span class="hint">Sorted by seniority (hire date)</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Ranked Preferences</th><th>Awarded</th></tr></thead><tbody>${subRows}</tbody></table></div>
    </div>
  `;
  document.getElementById('btnBackToCycles').addEventListener('click', ()=>{ BIDDING_CYCLE_ID=null; renderBiddingSub(); });
  const submitBtn = document.getElementById('btnSubmitPicks');
  if(submitBtn) submitBtn.addEventListener('click', ()=>openBidSubmitModal(cycle, mySubmission));
  const awardBtn = document.getElementById('btnRunAward');
  if(awardBtn) awardBtn.addEventListener('click', ()=>{
    if(!confirm(`Run the seniority award for "${cycle.name}"? This locks in results based on every submission received so far.`)) return;
    if(!runBidAward(cycle))return;
    logActivity(`Ran the seniority award for bid cycle "${cycle.name}".`, "schedule");
    persist();
    toast("Award complete.");
    renderBiddingSub();
  });
  const delBtn = document.getElementById('btnDeleteCycle');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm(`Delete "${cycle.name}"? This cannot be undone.`)) return;
    STATE.pm.bidCycles = STATE.pm.bidCycles.filter(c=>c.id!==cycle.id);
    BIDDING_CYCLE_ID = null;
    logActivity(`Deleted bid cycle "${cycle.name}".`, "schedule");
    persist(); renderBiddingSub();
  });
  wireRecordLinks();
}
function openBidCycleFormModal(){
  const groups=manageableActivityGroups('pm_bidding_manage');
  if(!groups.length)return;
  const activeShifts = sortShiftsForSelection(STATE.pm.scheduleShifts.filter(s=>groups.some(g=>g.id===s.workGroupId)&&shiftPatternStatus(s,fmt(new Date()))!=='past'), fmt(new Date()));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>New Bid Cycle</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Work Group</label><select id="fCycleWorkGroup">${groups.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Name</label><input type="text" id="fCycleName" placeholder="e.g. 2027 Annual Vacation Picks"></div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fCycleType"><option value="vacation">Vacation Pick</option><option value="shift">Shift Bid</option></select></div>
        <div></div>
        <div class="form-row"><label>Opens</label><input type="date" id="fCycleOpens" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Closes</label><input type="date" id="fCycleCloses" value="${fmt(addDays(new Date(),14))}"></div>
      </div>
      <div id="fCycleShiftFields">
        <div class="form-row"><label>Assignment Effective Date</label><input type="date" id="fCycleEffective" min="${fmt(new Date())}" value="${fmt(addDays(new Date(),15))}"></div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">Open shift slots</label>
        ${activeShifts.map(s=>`<div class="form-row" style="display:flex;align-items:center;gap:10px;"><span style="flex:1;">${escapeHtml(s.name)}</span><input type="number" min="0" value="1" data-shift-cap="${s.id}" style="width:80px;"></div>`).join('') || '<p style="font-size:12px;color:var(--text-dim);">No current shift patterns to bid on.</p>'}
      </div>
      <div id="fCycleVacationFields" style="display:none;">
        <div class="form-2col">
          <div class="form-row"><label>Vacation Window Start</label><input type="date" id="fVacWindowStart"></div>
          <div class="form-row"><label>Vacation Window End</label><input type="date" id="fVacWindowEnd"></div>
        </div>
        <div class="form-row"><label>Max people off per day (selected work group)</label><input type="number" min="1" value="2" id="fVacDailyCap"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Create Cycle</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  const typeSel = document.getElementById('fCycleType');
  const syncType = ()=>{
    document.getElementById('fCycleShiftFields').style.display = typeSel.value==='shift' ? '' : 'none';
    document.getElementById('fCycleVacationFields').style.display = typeSel.value==='vacation' ? '' : 'none';
  };
  const groupSel=document.getElementById('fCycleWorkGroup');
  const syncGroup=()=>{document.querySelectorAll('[data-shift-cap]').forEach(inp=>{const matches=STATE.pm.scheduleShifts.find(s=>s.id===inp.dataset.shiftCap)?.workGroupId===groupSel.value;inp.closest('.form-row').style.display=matches?'flex':'none';inp.disabled=!matches;});};
  groupSel.addEventListener('change',syncGroup);syncGroup();
  typeSel.addEventListener('change', syncType); syncType();
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fCycleName').value.trim();
    const opensDate = document.getElementById('fCycleOpens').value, closesDate = document.getElementById('fCycleCloses').value;
    if(!name || !opensDate || !closesDate||closesDate<opensDate){ toast("Enter a name and both dates.", true); return; }
    const type = typeSel.value;
    const cycle = {id:'bid'+Date.now(), workGroupId:groupSel.value, name, type, opensDate, closesDate, status:'open', createdAt:fmt(new Date()), submissions:[], awards:[]};
    if(type==='shift'){
      cycle.effectiveDate=document.getElementById("fCycleEffective").value;
      if(!cycle.effectiveDate||cycle.effectiveDate<fmt(new Date())){toast("Choose an effective date today or later.",true);return;}
      cycle.shiftSlots = {};
      document.querySelectorAll('[data-shift-cap]').forEach(inp=>{ const n=Number(inp.value)||0; if(!inp.disabled&&n>0) cycle.shiftSlots[inp.dataset.shiftCap]=n; });
      if(!Object.keys(cycle.shiftSlots).length){ toast("Open at least one shift slot.", true); return; }
    } else {
      cycle.vacationWindowStart = document.getElementById('fVacWindowStart').value;
      cycle.vacationWindowEnd = document.getElementById('fVacWindowEnd').value;
      cycle.dailyCap = Math.max(1, Number(document.getElementById('fVacDailyCap').value)||1);
      if(!cycle.vacationWindowStart || !cycle.vacationWindowEnd||cycle.vacationWindowEnd<cycle.vacationWindowStart){ toast("Enter the vacation window.", true); return; }
    }
    if(!canManageScheduleActivity(cycle,'bid','pm_bidding_manage'))return;
    STATE.pm.bidCycles.push(cycle);
    logActivity(`Created ${type==='vacation'?'vacation pick':'shift bid'} cycle "${name}".`, "schedule");
    persist();
    toast("Bid cycle created.");
    closeModal();
    renderBiddingSub();
  };
}
function openBidSubmitModal(cycle, existing){
  if(!can('pm_bidding_submit')||!canViewScheduleActivity(cycle,'bid')||cycle.status!=='open')return;
  document.getElementById('modalBox').className = 'modal';
  let fieldsHtml = '';
  if(cycle.type==='shift'){
    const rankFor = id=>{ if(!existing) return ''; const i=existing.prefs.indexOf(id); return i>=0?i+1:''; };
    fieldsHtml = `<p style="font-size:12px;color:var(--text-dim);margin-top:0;">Give each shift you'd accept a rank (1 = first choice). Leave blank for any shift you wouldn't take.</p>` +
      Object.keys(cycle.shiftSlots||{}).map(id=>{
        const shift = STATE.pm.scheduleShifts.find(s=>s.id===id);
        return `<div class="form-row" style="display:flex;align-items:center;gap:10px;"><span style="flex:1;">${escapeHtml(shift?shift.name:id)}</span><input type="number" min="1" placeholder="Rank" value="${rankFor(id)}" data-shift-rank="${id}" style="width:80px;"></div>`;
      }).join('');
  } else {
    const prefs = existing ? existing.prefs : [];
    fieldsHtml = `<p style="font-size:12px;color:var(--text-dim);margin-top:0;">Enter up to 3 date-range choices, in order of preference. Leave a choice blank if you don't need it.</p>` +
      [0,1,2].map(i=>`<div class="form-2col"><div class="form-row"><label>Choice ${i+1} Start</label><input type="date" id="fVacPickStart${i}" value="${(prefs[i]||{}).start||''}" min="${cycle.vacationWindowStart}" max="${cycle.vacationWindowEnd}"></div><div class="form-row"><label>Choice ${i+1} End</label><input type="date" id="fVacPickEnd${i}" value="${(prefs[i]||{}).end||''}" min="${cycle.vacationWindowStart}" max="${cycle.vacationWindowEnd}"></div></div>`).join('');
  }
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${cycle.type==='shift'?'Submit Shift Bid':'Submit Vacation Picks'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">${fieldsHtml}</div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    let prefs;
    if(cycle.type==='shift'){
      const ranked = [];
      document.querySelectorAll('[data-shift-rank]').forEach(inp=>{ const rank=Number(inp.value); if(rank>0) ranked.push({id:inp.dataset.shiftRank, rank}); });
      if(!ranked.length){ toast("Rank at least one shift.", true); return; }
      ranked.sort((a,b)=>a.rank-b.rank);
      prefs = ranked.map(r=>r.id);
    } else {
      prefs = [0,1,2].map(i=>({start:document.getElementById('fVacPickStart'+i).value, end:document.getElementById('fVacPickEnd'+i).value})).filter(p=>p.start && p.end);
      if(!prefs.length){ toast("Enter at least one date-range choice.", true); return; }
      for(const p of prefs) if(p.end<p.start||p.start<cycle.vacationWindowStart||p.end>cycle.vacationWindowEnd){ toast("A choice's end date can't be before its start date.", true); return; }
    }
    const today=fmt(new Date());if(cycle.status!=='open'||today<cycle.opensDate||today>cycle.closesDate)return;
    cycle.submissions = (cycle.submissions||[]).filter(s=>s.personId!==CURRENT_USER_ID);
    cycle.submissions.push({personId:CURRENT_USER_ID, submittedAt:fmt(new Date()), prefs});
    logActivity(`Submitted ${cycle.type==='shift'?'a shift bid':'vacation picks'} for cycle "${cycle.name}".`, "schedule");
    persist();
    toast("Submitted.");
    closeModal();
    renderBiddingSub();
  };
}
// Awards strictly by seniority (earliest hire date first): each person gets the highest-ranked
// choice that still has room, in seniority order -- the same "senior people pick first" logic
// almost every agency's MOU already specifies, just automated instead of run by hand on a spreadsheet.
function runBidAward(cycle){
  if(!canManageScheduleActivity(cycle,'bid','pm_bidding_manage')||cycle.status==='awarded')return;
  const bySeniority = (cycle.submissions||[]).slice().sort((a,b)=>seniorityDate(a.personId).localeCompare(seniorityDate(b.personId)));
  if(cycle.type==='shift'){
    // Legacy cycles need an explicit date before their first automatic award.
    if(!cycle.effectiveDate||cycle.effectiveDate<fmt(new Date())){
      const date=prompt('Enter the assignment effective date (YYYY-MM-DD).',fmt(new Date()));
      if(!date)return false;
      cycle={...cycle,effectiveDate:date};
    }
    try {
      const plan=planShiftBidAward(cycle,STATE.pm.records,STATE.pm.scheduleShifts,STATE.pm.scheduleAssignments,fmt(new Date()));
      for(const row of plan.updates){
        const shift=STATE.pm.scheduleShifts.find(s=>s.id===row.shiftId);
        if(!shift||!canManageScheduleActivity({workGroupId:shift.workGroupId || 'wg_patrol'},'bid','pm_bidding_manage'))throw new Error('You must manage both the existing and awarded calendars to move an employee.');
      }
      const stored=STATE.pm.bidCycles.find(c=>c.id===cycle.id);
      plan.updates.forEach(row=>{const i=STATE.pm.scheduleAssignments.findIndex(a=>a.id===row.id);if(i<0)STATE.pm.scheduleAssignments.push(row);else STATE.pm.scheduleAssignments[i]=row;});
      Object.assign(stored,{effectiveDate:cycle.effectiveDate,awards:plan.awards,status:'awarded'});
      return true;
    } catch(error){toast(error.message,true);return false;}
  } else {
    cycle.awards = [];
    const dailyUsed = {};
    bySeniority.forEach(sub=>{
      let awarded = null;
      for(const pick of sub.prefs){
        const days = [];
        let d = new Date(pick.start+'T00:00:00');
        const end = new Date(pick.end+'T00:00:00');
        let ok = true;
        while(d<=end){
          const ds = fmt(d);
          if((dailyUsed[ds]||0) >= cycle.dailyCap){ ok=false; break; }
          days.push(ds);
          d = addDays(d,1);
        }
        if(ok){ days.forEach(ds=>dailyUsed[ds]=(dailyUsed[ds]||0)+1); awarded = pick; break; }
      }
      if(awarded){
        cycle.awards.push({personId:sub.personId, start:awarded.start, end:awarded.end});
        STATE.pm.scheduleExceptions.push({id:'exc'+Date.now()+Math.random().toString(36).slice(2,6), personId:sub.personId, code:'VDO', startDate:awarded.start, endDate:awarded.end, notes:`Awarded via vacation pick cycle "${cycle.name}".`});
      } else {
        cycle.awards.push({personId:sub.personId, start:null, end:null});
      }
    });
  }
  cycle.status = 'awarded';
  return true;
}

/* =========================================================================
   SCHEDULING: Extra Duty (off-duty employment)
   ========================================================================= */
// Soft fatigue/conflict check: flags (doesn't block) a job that overlaps this person's regular
// on-duty hours that day, or that would push their combined on-duty + extra-duty hours past a
// standard 16-hour fatigue threshold. A supervisor still has to actually approve the signup, so
// this is information for that decision, not an automatic denial.
function extraDutyConflict(personId, job){
  const shift = STATE.pm.scheduleAssignments.filter(a=>!a.endDate).map(a=>({a,shift:STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId)}))
    .find(({a,shift})=>a.personId===personId && shift && isOnDutyOnDate(a, shift, job.date) && !activeExceptionFor(personId, job.date));
  const jobHours = (()=>{ const toMin=t=>{const p=(t||'00:00').split(':');return (Number(p[0])||0)*60+(Number(p[1])||0);}; let m=toMin(job.endTime)-toMin(job.startTime); if(m<=0)m+=24*60; return m/60; })();
  const onDutyHours = shift ? shiftHours(shift.shift) : 0;
  const otherApproved = (STATE.pm.extraDutySignups||[]).filter(s=>s.personId===personId && s.status==='approved' && s.jobId!==job.id)
    .map(s=>STATE.pm.extraDutyJobs.find(j=>j.id===s.jobId)).filter(j=>j && j.date===job.date);
  const otherHours = otherApproved.reduce((sum,j)=>{ const toMin=t=>{const p=(t||'00:00').split(':');return (Number(p[0])||0)*60+(Number(p[1])||0);}; let m=toMin(j.endTime)-toMin(j.startTime); if(m<=0)m+=24*60; return sum+m/60; },0);
  const combined = jobHours + onDutyHours + otherHours;
  const flags = [];
  if(shift) flags.push(`Regularly on duty (${shift.shift.name}) that day.`);
  const threshold = Number((STATE.pm.schedulingSettings||{}).fatigueThresholdHours) || 16;
  if(combined > threshold) flags.push(`Combined hours that day would be ${combined.toFixed(1)} (exceeds the ${threshold}-hour fatigue threshold).`);
  return flags;
}
function renderExtraDutySub(){
  const canManage = manageableActivityGroups('pm_extraduty_manage').length>0;
  const canSignup = can('pm_extraduty_signup');
  if(EXTRADUTY_JOB_ID){ renderExtraDutyJobDetail(EXTRADUTY_JOB_ID, canManage, canSignup); return; }
  const jobs = (STATE.pm.extraDutyJobs||[]).filter(j=>canViewScheduleActivity(j,'job')).slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const rows = jobs.map(j=>{
    const signups = (STATE.pm.extraDutySignups||[]).filter(s=>s.jobId===j.id);
    const approved = signups.filter(s=>s.status==='approved').length;
    const pending = signups.filter(s=>s.status==='pending').length;
    const mine = signups.find(s=>s.personId===CURRENT_USER_ID);
    return `<tr>
      <td>${escapeHtml(j.employer)}<div style="font-size:11px;color:var(--text-dim);">${escapeHtml(j.description)}</div></td>
      <td style="font-size:12px;">${escapeHtml(j.date)}<br>${SuiteUX.displayTimeOnly(j.startTime)} - ${SuiteUX.displayTimeOnly(j.endTime)}</td>
      <td>${approved}/${j.slots}${pending?` <span style="color:var(--gold);font-size:11px;">(${pending} pending)</span>`:''}</td>
      <td>$${Number(j.hourlyRate||0).toFixed(2)}/hr</td>
      <td><span class="badge" style="background:${j.status==='open'?'#24633D22':'#8A94A622'};color:${j.status==='open'?'var(--green)':'var(--text-dim)'};text-transform:capitalize;">${escapeHtml(j.status)}</span></td>
      <td>${mine?`<span style="font-size:11px;color:var(--text-dim);text-transform:capitalize;">${mine.status}</span>`:''} <button class="btn btn-sm btn-outline" data-view-job="${j.id}">View</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No extra-duty jobs posted yet.</td></tr>`;
  document.getElementById('schedSubBody').innerHTML = `
    <div class="panel">
      <div class="panel-head"><h2>Extra-Duty Jobs</h2>${canManage?`<button class="btn btn-sm btn-primary" id="btnNewJob">${ICONS.plus} Post Job</button>`:''}</div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employer / Description</th><th>Date &amp; Time</th><th>Slots</th><th>Rate</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
  const newBtn = document.getElementById('btnNewJob');
  if(newBtn) newBtn.addEventListener('click', openExtraDutyJobFormModal);
  document.querySelectorAll('[data-view-job]').forEach(b=>b.addEventListener('click', ()=>{ EXTRADUTY_JOB_ID=b.dataset.viewJob; renderExtraDutySub(); }));
}
function renderExtraDutyJobDetail(jobId, canManage, canSignup){
  const job = STATE.pm.extraDutyJobs.find(j=>j.id===jobId);
  if(!job||!canViewScheduleActivity(job,'job')){ EXTRADUTY_JOB_ID=null; renderExtraDutySub(); return; }
  canManage=canManageScheduleActivity(job,'job','pm_extraduty_manage');
  const signups = (STATE.pm.extraDutySignups||[]).filter(s=>s.jobId===jobId);
  const approvedCount = signups.filter(s=>s.status==='approved').length;
  const mine = signups.find(s=>s.personId===CURRENT_USER_ID);
  const canApplyNow = canSignup && !mine && job.status==='open' && approvedCount<job.slots;
  const rows = signups.map(s=>{
    const flags = extraDutyConflict(s.personId, job);
    const statusColor = s.status==='approved'?'var(--green)':s.status==='denied'?'var(--red)':'var(--gold)';
    return `<tr>
      <td>${recordLink(s.personId)}</td>
      <td style="color:${statusColor};font-weight:700;text-transform:capitalize;">${escapeHtml(s.status)}</td>
      <td style="font-size:11px;color:${flags.length?'var(--red)':'var(--text-dim)'};">${flags.length?flags.join('<br>'):'No conflicts detected.'}</td>
      <td>${canManage && s.status==='pending' ? `<div class="cell-actions"><button class="btn-icon" data-approve-signup="${s.id}" title="Approve" style="color:var(--green);">${ICONS.check||'&check;'}</button><button class="btn-icon" data-deny-signup="${s.id}" title="Deny" style="color:var(--red);">${ICONS.x||'&times;'}</button></div>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No signups yet.</td></tr>`;
  document.getElementById('schedSubBody').innerHTML = `
    <button class="btn btn-sm btn-outline" id="btnBackToJobs" style="margin-bottom:12px;">&larr; All jobs</button>
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <div><h2>${escapeHtml(job.employer)}</h2><span class="hint">${escapeHtml(job.date)} &middot; ${SuiteUX.displayTimeOnly(job.startTime)} - ${SuiteUX.displayTimeOnly(job.endTime)} &middot; $${Number(job.hourlyRate||0).toFixed(2)}/hr &middot; ${approvedCount}/${job.slots} filled</span></div>
        <div style="display:flex;gap:8px;">
          ${canApplyNow?`<button class="btn btn-sm btn-primary" id="btnSignUp">Sign Up</button>`:''}
          ${canManage?`<button class="btn btn-sm btn-danger" id="btnDeleteJob">${ICONS.trash}</button>`:''}
        </div>
      </div>
      <div class="panel-body"><p style="margin:0 0 8px;">${escapeHtml(job.description)}</p><p style="font-size:12px;color:var(--text-dim);margin:0;">${escapeHtml(job.location)}${job.notes?' — '+escapeHtml(job.notes):''}</p></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Signups</h2></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Status</th><th>Conflict Check</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
  `;
  document.getElementById('btnBackToJobs').addEventListener('click', ()=>{ EXTRADUTY_JOB_ID=null; renderExtraDutySub(); });
  const signUpBtn = document.getElementById('btnSignUp');
  if(signUpBtn) signUpBtn.addEventListener('click', ()=>{
    const flags = extraDutyConflict(CURRENT_USER_ID, job);
    if(flags.length && !confirm(`Heads up:\n\n${flags.join('\n')}\n\nSign up anyway? A supervisor still has to approve this.`)) return;
    STATE.pm.extraDutySignups.push({id:'eds'+Date.now(), jobId:job.id, personId:CURRENT_USER_ID, status:'pending', signedUpAt:fmt(new Date())});
    logActivity(`Signed up for extra duty: ${job.employer} on ${job.date}.`, "schedule");
    persist();
    toast("Signed up — awaiting supervisor approval.");
    renderExtraDutySub();
  });
  const delBtn = document.getElementById('btnDeleteJob');
  if(delBtn) delBtn.addEventListener('click', ()=>{
    if(!confirm(`Delete this job posting? Existing signups will be removed too.`)) return;
    STATE.pm.extraDutyJobs = STATE.pm.extraDutyJobs.filter(j=>j.id!==jobId);
    STATE.pm.extraDutySignups = STATE.pm.extraDutySignups.filter(s=>s.jobId!==jobId);
    EXTRADUTY_JOB_ID = null;
    logActivity(`Deleted extra-duty job posting "${job.employer}".`, "schedule");
    persist(); renderExtraDutySub();
  });
  document.querySelectorAll('[data-approve-signup]').forEach(b=>b.addEventListener('click', ()=>{
    const s = STATE.pm.extraDutySignups.find(x=>x.id===b.dataset.approveSignup);
    if(approvedCount>=job.slots){ toast("All slots for this job are already filled.", true); return; }
    s.status='approved';
    logActivity(`Approved ${personName(s.personId)} for extra duty: ${job.employer}.`, "schedule");
    persist(); renderExtraDutySub();
  }));
  document.querySelectorAll('[data-deny-signup]').forEach(b=>b.addEventListener('click', ()=>{
    const s = STATE.pm.extraDutySignups.find(x=>x.id===b.dataset.denySignup);
    s.status='denied';
    logActivity(`Denied ${personName(s.personId)}'s signup for extra duty: ${job.employer}.`, "schedule");
    persist(); renderExtraDutySub();
  }));
  wireRecordLinks();
}
function openExtraDutyJobFormModal(){
  const groups=manageableActivityGroups('pm_extraduty_manage');
  if(!groups.length)return;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Post Extra-Duty Job</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Work Group</label><select id="fJobWorkGroup">${groups.map(g=>`<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Employer</label><input type="text" id="fJobEmployer" placeholder="e.g. Reno Events Center"></div>
      <div class="form-row"><label>Description</label><input type="text" id="fJobDesc" placeholder="e.g. Stadium security detail - concert"></div>
      <div class="form-row"><label>Location</label><input type="text" id="fJobLocation"></div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fJobDate" value="${fmt(new Date())}"></div>
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
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const employer = document.getElementById('fJobEmployer').value.trim();
    const date = document.getElementById('fJobDate').value;
    if(!employer || !date){ toast("Enter an employer and date.", true); return; }
    STATE.pm.extraDutyJobs.push({
      id:'ed'+Date.now(), workGroupId:document.getElementById('fJobWorkGroup').value, employer, description:document.getElementById('fJobDesc').value.trim(), location:document.getElementById('fJobLocation').value.trim(),
      date, startTime:document.getElementById('fJobStart').value, endTime:document.getElementById('fJobEnd').value,
      slots:Math.max(1,Number(document.getElementById('fJobSlots').value)||1), hourlyRate:Number(document.getElementById('fJobRate').value)||0,
      notes:document.getElementById('fJobNotes').value.trim(), status:'open',
    });
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
function rollCallFor(date, shiftId){ return (STATE.pm.rollCalls||[]).find(rc=>rc.date===date && rc.shiftId===shiftId); }
function renderTimeOffSub(){
  if(!STATE.pm.leaveRequests) STATE.pm.leaveRequests = [];
  const canSubmit = can('pm_leave_request_submit');
  const canApprove = authoritativeRoleAdmin() || can('pm_leave_request_approve');
  const me = STATE.personnel.find(p=>p.id===CURRENT_USER_ID);
  const requestableCodes = (STATE.pm.refData.exceptionCodes||[]).filter(c=>c.active!==false && c.requestable);

  const pending = STATE.pm.leaveRequests.filter(r=>r.status==='pending'&&canManagePersonSchedule(r.personId,r,'pm_leave_request_approve')).slice().sort((a,b)=>(a.submittedAt||'').localeCompare(b.submittedAt||''));
  const mine = (canSubmit && me) ? STATE.pm.leaveRequests.filter(r=>r.personId===me.id).slice().sort((a,b)=>(b.submittedAt||'').localeCompare(a.submittedAt||'')) : [];

  const codeBadge = code=>{
    const def = (STATE.pm.refData.exceptionCodes||[]).find(c=>c.code===code);
    return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${def?def.color:'#8A94A6'};margin-right:6px;"></span>${escapeHtml(def?def.name:code)}`;
  };
  const statusBadge = status=>{
    if(status==='approved') return `<span class="badge badge-available">Approved</span>`;
    if(status==='denied') return `<span class="badge badge-missing">Denied</span>`;
    if(status==='cancelled') return `<span class="badge">Rescinded</span>`;
    return `<span class="badge badge-maintenance">Pending</span>`;
  };
  const dateRange = r => r.startDate===r.endDate ? escapeHtml(r.startDate) : `${escapeHtml(r.startDate)} \u2192 ${escapeHtml(r.endDate)}`;

  const pendingRows = pending.map(r=>`<tr>
    <td>${recordLink(r.personId)}</td>
    <td>${codeBadge(r.code)}</td>
    <td>${dateRange(r)}</td>
    <td style="max-width:220px;">${escapeHtml(r.reason||'\u2014')}</td>
    <td style="font-size:12px;color:var(--text-dim);">${r.submittedAt?SuiteUX.displayInstant(r.submittedAt):'\u2014'}</td>
    <td><div class="cell-actions"><button class="btn btn-sm btn-primary" data-approve-leave="${r.id}">Approve</button><button class="btn btn-sm btn-outline" data-deny-leave="${r.id}">Deny</button></div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No requests waiting on approval.</td></tr>`;

  const myRows = mine.map(r=>`<tr>
    <td>${codeBadge(r.code)}</td>
    <td>${dateRange(r)}</td>
    <td style="max-width:220px;">${escapeHtml(r.reason||'\u2014')}</td>
    <td>${statusBadge(r.status)}${r.courtConflictOverride?`<div style="margin-top:5px;font-size:11px;color:var(--warning,#d8aa50);font-weight:700;" title="${escapeHtml(r.courtConflictOverride.reason||'')}">Court conflict override recorded</div>`:''}${r.decisionNotes?`<div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${escapeHtml(r.decisionNotes)}</div>`:''}</td>
    <td style="font-size:12px;color:var(--text-dim);">${r.submittedAt?SuiteUX.displayInstant(r.submittedAt):'\u2014'}</td>
    <td>${r.status==='pending'?`<button class="btn btn-sm btn-outline" data-cancel-leave="${r.id}" title="Rescind request">Rescind</button>`:''}</td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No requests submitted yet.</td></tr>`;

  document.getElementById('schedSubBody').innerHTML = `
    ${canApprove?`
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Pending Approval</h2><span class="hint">${pending.length} waiting</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Submitted</th><th></th></tr></thead><tbody>${pendingRows}</tbody></table></div>
    </div>`:''}
    ${canSubmit?`
    <div class="panel">
      <div class="panel-head"><h2>My Requests</h2>${me?`<button class="btn btn-sm btn-primary" id="btnRequestTimeOff">Request Time Off</button>`:''}</div>
      ${!me?`<div style="padding:14px 20px;font-size:12px;color:var(--text-dim);">No personnel record is linked to this account, so a request can't be tied to an employee.</div>`:''}
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>${myRows}</tbody></table></div>
    </div>`:''}
  `;

  const reqBtn = document.getElementById('btnRequestTimeOff');
  if(reqBtn) reqBtn.addEventListener('click', ()=>openRequestTimeOffModal(requestableCodes, me));
  document.querySelectorAll('[data-approve-leave]').forEach(b=>b.addEventListener('click', ()=>decideLeaveRequest(b.dataset.approveLeave, 'approved')));
  document.querySelectorAll('[data-deny-leave]').forEach(b=>b.addEventListener('click', ()=>decideLeaveRequest(b.dataset.denyLeave, 'denied')));
  document.querySelectorAll('[data-cancel-leave]').forEach(b=>b.addEventListener('click', ()=>{
    const req = STATE.pm.leaveRequests.find(r=>r.id===b.dataset.cancelLeave);
    if(!req || req.status!=='pending'||req.personId!==CURRENT_USER_ID||!can('pm_leave_request_submit')) return;
    if(!confirm('Rescind this pending time-off request?')) return;
    req.status = 'cancelled';
    req.rescindedAt = new Date().toISOString();
    req.rescindedBy = CURRENT_USER_ID;
    logActivity(`Rescinded a ${req.code} time-off request for ${personName(req.personId)}.`, "schedule");
    persist(); renderTimeOffSub();
  }));
}
function openRequestTimeOffModal(requestableCodes, me){
  if(!me){ toast('No personnel record is linked to this account.', true); return; }
  if(!requestableCodes.length){ toast('No requestable time-off types are set up for this agency yet.', true); return; }
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Time Off</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Type</label>
        <select id="fLeaveCode">${requestableCodes.map(c=>`<option value="${c.code}">${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fLeaveStart" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fLeaveEnd" value="${fmt(new Date())}"></div>
      </div>
      <div class="form-row"><label>Reason / note</label><input type="text" id="fLeaveReason" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  let pendingRecord=null;
  document.getElementById('mSave').onclick = async ()=>{
    const code = document.getElementById('fLeaveCode').value;
    const startDate = document.getElementById('fLeaveStart').value;
    const endDate = document.getElementById('fLeaveEnd').value;
    const reason = document.getElementById('fLeaveReason').value.trim();
    if(!startDate || !endDate || endDate<startDate){ toast('Enter a valid date range.', true); return; }
    // Reuse the same ID if the response was lost after the server committed the request.
    // A changed form is a new request; leave the old attempt available for reconciliation.
    if(!pendingRecord || [code,startDate,endDate,reason].some((v,i)=>v!==[pendingRecord.code,pendingRecord.startDate,pendingRecord.endDate,pendingRecord.reason][i])){
      pendingRecord={id:'leave'+Date.now()+Math.random().toString(36).slice(2,6),
        personId:me.id,code,startDate,endDate,reason,status:'pending',
        submittedAt:new Date().toISOString(),submittedBy:CURRENT_USER_ID};
    }
    const courtConflicts=window.SonoMarziCourtLeaveConflicts?.subpoenasForLeave(me.id,startDate,endDate)||[];
    if(courtConflicts.length){
      const summary=courtConflicts.map(s=>s.caseNumber+' ('+s.courtDate+' '+(s.courtTime||'')+')').join('; ');
      if(!confirm('Court appearance conflict detected: '+summary+'. You may submit this request. Approval requires resolving the conflict or an authorized, documented override. Continue submitting?'))return;
    }
    const button=document.getElementById('mSave');button.disabled=true;
    const result=await SuiteStore.submitSelfServiceRecord('leaveRequests',pendingRecord);
    if(!result.ok){button.disabled=false;toast(result.error?.message||'The request could not be saved.',true);return;}
    logActivity(`Requested ${(STATE.pm.refData.exceptionCodes.find(c=>c.code===code)||{}).name||code} for ${personName(me.id)} (${dateRangeText(startDate,endDate)}).`, "schedule");
    toast('Request submitted.');
    closeModal();
    renderTimeOffSub();
  };
}
function dateRangeText(startDate,endDate){ return startDate===endDate ? startDate : `${startDate} to ${endDate}`; }
function decideLeaveRequest(id, decision){
  const req = STATE.pm.leaveRequests.find(r=>r.id===id);
  if(!req || req.status!=='pending'||!canManagePersonSchedule(req.personId,req,'pm_leave_request_approve')||!['approved','denied'].includes(decision)) return;
  if(decision==='denied'){
    const note = (prompt('Optional note for the employee (visible on their request):','') || '').trim();
    req.status = 'denied';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = CURRENT_USER_ID;
    req.decisionNotes = note;
    logActivity(`Denied a ${req.code} request for ${personName(req.personId)}.`, "schedule");
    toast('Request denied.');
  } else {
    const courtConflicts=window.SonoMarziCourtLeaveConflicts?.subpoenasForLeave(req.personId,req.startDate,req.endDate)||[];
    if(courtConflicts.length){
      const summary=courtConflicts.map(s=>s.caseNumber+' on '+s.courtDate+(s.courtTime?' at '+s.courtTime:'')).join('; ');
      if(!confirm('COURT CONFLICT: '+personName(req.personId)+' has an active subpoena: '+summary+'.\\n\\nPress OK to continue to an override explanation, or Cancel to leave the request pending.'))return;
      const overrideReason=(prompt('Required: explain why time off is being approved despite the court conflict:','')||'').trim();
      if(overrideReason.length<8){toast('Approval not completed. Enter an override explanation of at least 8 characters.',true);return;}
      req.courtConflictOverride={
        reason:overrideReason,approvedBy:CURRENT_USER_ID,approvedAt:new Date().toISOString(),
        subpoenas:courtConflicts.map(s=>({id:s.id,caseNumber:s.caseNumber,courtDate:s.courtDate,courtTime:s.courtTime}))
      };
      logActivity('Approved time off with subpoena conflict override for '+personName(req.personId)+': '+summary+'. Reason: '+overrideReason, 'schedule');
    }
    // Approving isn't just a status flip -- it's the moment this becomes a real change to the
    // schedule. It's written as the same kind of schedule exception record the duty roster and
    // calendar views already read everywhere else, so it shows up as time off exactly the way a
    // supervisor manually logging it would, rather than living in a separate "requests" table
    // that the rest of scheduling would need to know to also check.
    if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
    const exceptionId = 'exc'+Date.now()+Math.random().toString(36).slice(2,6);
    STATE.pm.scheduleExceptions.push({
      id: exceptionId, personId: req.personId, code: req.code,
      startDate: req.startDate, endDate: req.endDate,
      notes: req.reason ? `Approved time-off request: ${req.reason}` : 'Approved time-off request.',
    });
    req.status = 'approved';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = CURRENT_USER_ID;
    req.exceptionId = exceptionId;
    logActivity(`Approved a ${req.code} request for ${personName(req.personId)} (${dateRangeText(req.startDate,req.endDate)}) and updated the schedule.`, "schedule");
    toast('Approved \u2014 the schedule has been updated.');
  }
  persist();
  renderTimeOffSub();
}
function renderRollCallSub(){
  const todayStr = fmt(new Date());
  const shifts = sortShiftsForSelection(STATE.pm.scheduleShifts.filter(s=>s.published!==false && canViewScheduleShift(s) && shiftPatternStatus(s,todayStr)!=='past'), todayStr);
  if(!shifts.some(s=>s.id===ROLLCALL_SHIFT))ROLLCALL_SHIFT='';
  if(!ROLLCALL_SHIFT && shifts.length) ROLLCALL_SHIFT = shifts[0].id;
  const shift = shifts.find(s=>s.id===ROLLCALL_SHIFT) || null;
  const canManage=canManageRollCallShift(shift);
  let rc = shift ? rollCallFor(ROLLCALL_DATE, shift.id) : null;

  const rosterIds = shift ? onDutyRoster(shift, ROLLCALL_DATE) : [];
  // Started fresh: pre-populate one entry per person actually on duty that day (auto-marking
  // anyone with an active time-off exception as excused, rather than silently dropping them --
  // a supervisor should still see who was supposed to be there and why they're not).
  const entries = rc ? rc.entries : rosterIds.map(personId=>{
    const ex = activeExceptionFor(personId, ROLLCALL_DATE);
    return {personId, beat:'', unit: shift?shift.name:'', vehicleId:'', status: ex?'excused':'present', notes: ex?`${ex.code} on file`:''};
  });

  const rows = entries.map((e,i)=>`<tr>
    <td>${escapeHtml(personName(e.personId))}</td>
    <td><input type="text" data-rc-field="beat" data-rc-idx="${i}" value="${escapeHtml(e.beat||'')}" placeholder="Beat / zone" ${canManage?'':'disabled'} style="width:110px;"></td>
    <td><input type="text" data-rc-field="unit" data-rc-idx="${i}" value="${escapeHtml(e.unit||'')}" placeholder="Unit" ${canManage?'':'disabled'} style="width:110px;"></td>
    <td><input type="text" data-rc-field="vehicleId" data-rc-idx="${i}" value="${escapeHtml(e.vehicleId||'')}" placeholder="Vehicle #" ${canManage?'':'disabled'} style="width:100px;"></td>
    <td><select data-rc-field="status" data-rc-idx="${i}" ${canManage?'':'disabled'}>${['present','late','absent','excused'].map(s=>`<option value="${s}" ${e.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></td>
    <td><input type="text" data-rc-field="notes" data-rc-idx="${i}" value="${escapeHtml(e.notes||'')}" placeholder="Notes" ${canManage?'':'disabled'} style="width:150px;"></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No one is on the duty roster for this shift on this date.</td></tr>`;

  document.getElementById('schedSubBody').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <h2>Roll Call</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="date" id="fRcDate" value="${ROLLCALL_DATE}">
          <select id="fRcShift">${shifts.map(s=>`<option value="${s.id}" ${ROLLCALL_SHIFT===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Beat/Zone</th><th>Unit</th><th>Vehicle #</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="panel-body" style="border-top:1px solid var(--border);">
        <div class="form-row"><label>Briefing Notes</label><textarea id="fRcBriefing" rows="4" placeholder="BOLOs, equipment issues, roll call announcements..." ${canManage?'':'disabled'}>${escapeHtml(rc?rc.briefingNotes||'':'')}</textarea></div>
        ${canManage?`<button class="btn btn-primary" id="btnSaveRollCall">Save Roll Call</button>`:''}
        ${rc?`<span class="hint" style="margin-left:10px;">Last saved by ${escapeHtml(personName(rc.takenBy))} at ${escapeHtml(rc.takenAt)}</span>`:''}
      </div>
    </div>
  `;
  document.getElementById('fRcDate').addEventListener('change', e=>{ ROLLCALL_DATE=e.target.value; renderRollCallSub(); });
  document.getElementById('fRcShift').addEventListener('change', e=>{ ROLLCALL_SHIFT=e.target.value; renderRollCallSub(); });
  if(canManage){
    const saveBtn = document.getElementById('btnSaveRollCall');
    saveBtn.addEventListener('click', ()=>{
      if(!canManageRollCallShift(shift))return;
      const updated = entries.map((e,i)=>({
        personId: e.personId,
        beat: document.querySelector(`[data-rc-field="beat"][data-rc-idx="${i}"]`).value.trim(),
        unit: document.querySelector(`[data-rc-field="unit"][data-rc-idx="${i}"]`).value.trim(),
        vehicleId: document.querySelector(`[data-rc-field="vehicleId"][data-rc-idx="${i}"]`).value.trim(),
        status: document.querySelector(`[data-rc-field="status"][data-rc-idx="${i}"]`).value,
        notes: document.querySelector(`[data-rc-field="notes"][data-rc-idx="${i}"]`).value.trim(),
      }));
      const briefingNotes = document.getElementById('fRcBriefing').value.trim();
      if(rc){ rc.entries = updated; rc.briefingNotes = briefingNotes; rc.takenBy = CURRENT_USER_ID; rc.takenAt = new Date().toLocaleString(); }
      else{
        rc = {id:'rc'+Date.now(), date:ROLLCALL_DATE, shiftId:shift.id, entries:updated, briefingNotes, takenBy:CURRENT_USER_ID, takenAt:new Date().toLocaleString()};
        STATE.pm.rollCalls.push(rc);
      }
      logActivity(`Took roll call for ${shift.name} on ${ROLLCALL_DATE}.`, "schedule");
      persist();
      toast("Roll call saved.");
      renderRollCallSub();
    });
  }
}

function renderDutyCalendar(body){
  const allGroups=visibleScheduleWorkGroups();
  if(!SCHED_CAL_WORKGROUPS.length) SCHED_CAL_WORKGROUPS=allGroups.map(g=>g.id);
  const groupIds=new Set(selectedCalendarWorkGroups());
  const preview=STATE.pm.scheduleShifts.find(s=>s.id===SCHED_DRAFT_PREVIEW_ID&&s.published===false&&canManageScheduleShift(s));
  if(SCHED_DRAFT_PREVIEW_ID&&!preview)SCHED_DRAFT_PREVIEW_ID=null;
  const shifts = sortShiftsForSelection(STATE.pm.scheduleShifts.filter(s=>groupIds.has(s.workGroupId)&&(s.published!==false||(preview&&s.id===preview.id))));
  const shiftOrder = new Map(shifts.map((s,i)=>[s.id,i]));
  if(SCHED_CAL_SHIFT!=='all' && !shifts.some(s=>s.id===SCHED_CAL_SHIFT)) SCHED_CAL_SHIFT = 'all';
  const year = SCHED_CAL_YEAR, month = SCHED_CAL_MONTH;
  const monthStr = String(month+1).padStart(2,'0');
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const monthName = firstOfMonth.toLocaleString('en-US', {month:'long'});
  const displayedShiftIds=new Set(shifts.map(s=>s.id));
  const relevantAssignments = STATE.pm.scheduleAssignments.filter(a=>displayedShiftIds.has(a.shiftId)&&(SCHED_CAL_SHIFT==='all'||a.shiftId===SCHED_CAL_SHIFT));

  let cells = '';
  for(let i=0;i<startWeekday;i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2,'0')}`;
    const onDutyAll = relevantAssignments.filter(a=>{const sh=shifts.find(s=>s.id===a.shiftId);return !!sh&&isOnDutyOnDate(a,sh,dateStr);});
    const working = [], excepted = [];
    onDutyAll.forEach(a=>{
      const ex = activeExceptionFor(a.personId, dateStr);
      if(ex) excepted.push({assignment:a, exception:ex}); else working.push(a);
    });
    // Group everyone on the same shift pattern together (in the same current/future order used
    // everywhere else) rather than leaving people from different patterns interleaved in
    // whatever order they happen to sit in the assignments list.
    working.sort((a,b)=> (shiftOrder.get(a.shiftId) ?? 999) - (shiftOrder.get(b.shiftId) ?? 999));
    const dayCoverages = (STATE.pm.scheduleCoverages||[]).filter(c=>c.date===dateStr && displayedShiftIds.has(c.shiftId) && (SCHED_CAL_SHIFT==='all' || c.shiftId===SCHED_CAL_SHIFT));
    const isToday = dateStr === fmt(new Date());
    let staffingBadge = '';
    // A day is operationally covered only when every displayed shift with a configured
    // minimum meets that minimum. Shifts with no minimum do not create an artificial shortage.
    const displayedShifts = SCHED_CAL_SHIFT==='all' ? shifts : shifts.filter(s=>s.id===SCHED_CAL_SHIFT);
    const dayEvents=(STATE.pm.specialEvents||[]).filter(e=>e.status!=='cancelled'&&e.startDate<=dateStr&&e.endDate>=dateStr&&(!(e.eligibleWorkGroupIds||[]).length||(e.eligibleWorkGroupIds||[]).some(id=>groupIds.has(id))));
    const staffingChecks = displayedShifts.map(shift=>{
      return {shift,...shiftStaffingSummary(shift,dateStr)};
    });
    const eventChecks=dayEvents.map(e=>({event:e,...eventStaffingSummary(e)}));
    const dayCovered = staffingChecks.every(x=>x.ok) && eventChecks.every(x=>x.ok);
    let cellClass = 'cal-cell' + (isToday ? ' cal-cell-today' : '') + (dayCovered ? ' cal-cell-covered' : ' cal-cell-short');
    if(SCHED_CAL_SHIFT!=='all'){
      const check=staffingChecks[0];
      if(check?.minStaff>0) staffingBadge = `<div style="font-size:10px;font-weight:800;color:${check.ok?'var(--green)':'var(--red)'};">${check.staffed}/${check.minStaff} staffed</div>`;
    }
    cells += `<div class="${cellClass}">
      <div class="cal-daynum" data-weekday="${WEEKDAY_ABBR[(startWeekday+d-1)%7]}">${d}</div>
      ${staffingBadge}
      ${staffingChecks.filter(x=>x.categories.length).map(x=>`<div class="calendar-staffing-breakdown"><strong>${escapeHtml(x.shift.name)}</strong><br>${staffingBreakdownHtml(x)}</div>`).join('')}
      ${dayEvents.map(e=>{const summary=eventStaffingSummary(e),staffed=summary.staffed,needed=summary.minStaff,ok=summary.ok;return `<a href="#" data-cal-special-event="${e.id}" class="cal-event" style="background:${ok?'var(--green)':'var(--red)'}22;color:${ok?'var(--green)':'var(--red)'};border-left:3px solid ${ok?'var(--green)':'var(--red)'};" title="${escapeHtml(e.name+' — '+staffed+'/'+needed+' staffed')}">${escapeHtml(e.name)} (${staffed}/${needed})</a>${staffingBreakdownHtml(summary)}`;}).join('')}
      ${working.map(a=>{
        const shift = shifts.find(s=>s.id===a.shiftId);
        const color = shift ? shiftColor(shift) : 'var(--blue)';
        const label = SCHED_CAL_SHIFT==='all' ? `${personName(a.personId)} (${shift?shift.name:''})` : personName(a.personId);
        return `<a href="#" data-cal-assign-event="${a.id}" class="cal-event" style="background:${color}22;color:${color};border-left:3px solid ${color};" title="${escapeHtml(label)}">${escapeHtml(label)}</a>`;
      }).join('')}
      ${excepted.map(({assignment:a,exception:ex})=>{
        const code = exceptionCodeInfo(ex.code);
        const label = `${personName(a.personId)} (${ex.code})`;
        return `<a href="#" data-cal-exception-event="${ex.id}" class="cal-event" style="background:${code.color}22;color:${code.color};border-left:3px solid ${code.color};" title="${escapeHtml(personName(a.personId)+' — '+code.name)}">${escapeHtml(label)}</a>`;
      }).join('')}
      ${dayCoverages.map(c=>{
        const shift = shifts.find(s=>s.id===c.shiftId);
        const label = SCHED_CAL_SHIFT==='all' ? `${personName(c.personId)} (covering, ${shift?shift.name:''})` : `${personName(c.personId)} (covering)`;
        return `<a href="#" data-cal-coverage-event="${c.id}" class="cal-event" style="background:${SWAP_COVERAGE_COLOR}22;color:${SWAP_COVERAGE_COLOR};border-left:3px solid ${SWAP_COVERAGE_COLOR};" title="${escapeHtml(personName(c.personId)+(c.swapRequestId?' is covering this shift via an approved swap':' is assigned to this one-off shift'))}">${escapeHtml(label)}</a>`;
      }).join('')}
    </div>`;
  }

  body.innerHTML = `
    ${preview?`<div class="callout" style="margin-bottom:14px;border:1px solid var(--gold);"><strong>Draft preview: ${escapeHtml(preview.name)}</strong> — only you can see this unpublished pattern here. This preview does not publish it or change the live roster. <button class="btn btn-sm btn-outline" id="btnExitDraftPreview">Exit Preview</button></div>`:''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="prev">&larr;</button>
        <h2 style="margin:0;min-width:170px;text-align:center;">${monthName} ${year}</h2>
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="next">&rarr;</button>
        <button class="btn btn-sm btn-outline" data-sched-cal-nav="today">Today</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <details id="schedCalendarPicker" ${SCHED_CAL_PICKER_OPEN?'open':''} style="position:relative;width:290px;max-width:100%;">
          <summary class="btn btn-outline" style="height:40px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;list-style:none;">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><strong>Calendar Selection</strong> <span style="color:var(--text-dim);font-size:11px;">(${groupIds.size} selected)</span></span><span aria-hidden="true">▾</span>
          </summary>
          <div style="position:absolute;top:calc(100% + 5px);left:0;width:290px;max-width:calc(100vw - 40px);z-index:30;background:var(--surface);border:1px solid var(--border);border-radius:9px;box-shadow:0 10px 28px rgba(0,0,0,.19);padding:8px;max-height:320px;overflow-y:auto;">
            ${allGroups.map(g=>`<div style="display:flex;align-items:center;gap:6px;justify-content:space-between;padding:5px 4px;border-bottom:1px solid var(--border);"><label style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;font-size:12px;cursor:pointer;"><input type="checkbox" data-cal-workgroup="${g.id}" ${groupIds.has(g.id)?'checked':''}><span style="overflow-wrap:anywhere;">${escapeHtml(g.name)}</span></label>${isGlobalScheduleAdmin()?`<button type="button" class="btn btn-sm btn-outline" data-cal-access="${g.id}" title="Configure ${escapeHtml(g.name)} calendar access" style="flex-shrink:0;">Access</button>`:''}</div>`).join('')}
            <div style="display:flex;justify-content:flex-end;padding-top:8px;"><button type="button" class="btn btn-sm btn-primary" id="schedCalendarPickerDone">Done</button></div>
          </div>
        </details>
        <div class="form-row" style="margin:0;min-width:220px;">
        <select id="fSchedCalShift">
          <option value="all" ${SCHED_CAL_SHIFT==='all'?'selected':''}>All Shifts</option>
          ${shifts.map(s=>`<option value="${s.id}" ${SCHED_CAL_SHIFT===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
        </div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">
      ${SCHED_CAL_SHIFT==='all' ? "Showing everyone on duty across all shift patterns, each pattern in its own color, plus anyone on an RDO/VDO/CDO/SDO/TDO shown in their exception's color. Pick a specific shift to see staffing levels against its minimum." : "Green means this day meets the minimum staff required for this shift; red means it's short. Colored tags other than this shift's own color are people who'd normally be working but are on an approved RDO/VDO/CDO/SDO/TDO, so they don't count toward staffing."}
    </div>
    ${SCHED_CAL_SHIFT==='all' ? `<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;">${shifts.map(s=>`<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${shiftColor(s)};"></span>${escapeHtml(s.name)}</div>`).join('')}</div>` : ''}
    <div class="cal-grid-head">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  `;
  body.querySelector('#btnExitDraftPreview')?.addEventListener('click',()=>{SCHED_DRAFT_PREVIEW_ID=null;SCHED_CAL_SHIFT='all';renderDutyCalendar(body);});
  body.querySelectorAll('[data-sched-cal-nav]').forEach(b=>b.addEventListener('click', ()=>{
    const dir = b.dataset.schedCalNav;
    let y=SCHED_CAL_YEAR, m=SCHED_CAL_MONTH;
    if(dir==='prev'){ m--; if(m<0){m=11;y--;} }
    else if(dir==='next'){ m++; if(m>11){m=0;y++;} }
    else { y=new Date().getFullYear(); m=new Date().getMonth(); }
    SCHED_CAL_YEAR=y; SCHED_CAL_MONTH=m;
    renderDutyCalendar(body);
  }));
  const calPicker=body.querySelector('#schedCalendarPicker');
  calPicker?.addEventListener('toggle',()=>{SCHED_CAL_PICKER_OPEN=calPicker.open;});
  body.querySelector('#schedCalendarPickerDone')?.addEventListener('click',()=>{SCHED_CAL_PICKER_OPEN=false;calPicker.open=false;});
    body.querySelectorAll('[data-cal-access]').forEach(b=>b.addEventListener('click',()=>openWorkGroupAccessModal(allGroups.find(g=>g.id===b.dataset.calAccess))));
  body.querySelectorAll('[data-cal-workgroup]').forEach(cb=>cb.addEventListener('change',()=>{
    const chosen=[...body.querySelectorAll('[data-cal-workgroup]:checked')].map(x=>x.dataset.calWorkgroup);
    if(!chosen.length){ cb.checked=true; toast("Keep at least one work group visible.",true); return; }
    SCHED_CAL_WORKGROUPS=chosen; SCHED_CAL_SHIFT='all'; SCHED_DRAFT_PREVIEW_ID=null;renderDutyCalendar(body);
  }));
  const shiftSelect = document.getElementById('fSchedCalShift');
  if(shiftSelect) shiftSelect.addEventListener('change', ()=>{ SCHED_CAL_SHIFT = shiftSelect.value; if(SCHED_CAL_SHIFT!==SCHED_DRAFT_PREVIEW_ID)SCHED_DRAFT_PREVIEW_ID=null;renderDutyCalendar(body); });
  body.querySelectorAll('[data-cal-special-event]').forEach(a=>a.addEventListener('click',(ev)=>{ev.preventDefault();openSpecialEventDetail((STATE.pm.specialEvents||[]).find(e=>e.id===a.dataset.calSpecialEvent));}));
  body.querySelectorAll('[data-cal-assign-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const assign = STATE.pm.scheduleAssignments.find(x=>x.id===a.dataset.calAssignEvent);
    if(assign && can('pm_schedule_manage')) openAssignmentFormModal(assign);
  }));
  body.querySelectorAll('[data-cal-coverage-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const coverage = (STATE.pm.scheduleCoverages||[]).find(x=>x.id===a.dataset.calCoverageEvent);
    if(coverage && can('pm_schedule_manage')) openCoverageDetailModal(coverage);
  }));
  body.querySelectorAll('[data-cal-exception-event]').forEach(a=>a.addEventListener('click', (ev)=>{
    ev.preventDefault();
    const exception = STATE.pm.scheduleExceptions.find(x=>x.id===a.dataset.calExceptionEvent);
    if(exception && can('pm_schedule_manage')) openExceptionFormModal(exception);
  }));
}


function openCoverageDetailModal(coverage){
  const shift=STATE.pm.scheduleShifts.find(s=>s.id===coverage.shiftId);
  const sourceLabel=coverage.swapRequestId?'Approved Shift Swap':coverage.source==='overtime'?'Overtime':coverage.source==='callback'?'Callback':'One-Off Staffing';
  document.getElementById('modalBox').className='modal';
  document.getElementById('modalBox').innerHTML=`
    <div class="modal-head"><h3>One-Off Shift Assignment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid">
        <div><div class="detail-label">Employee</div><div class="detail-value">${escapeHtml(personName(coverage.personId))}</div></div>
        <div><div class="detail-label">Date</div><div class="detail-value">${escapeHtml(coverage.date||'—')}</div></div>
        <div><div class="detail-label">Shift</div><div class="detail-value">${escapeHtml(shift?.name||'—')}</div></div>
        <div><div class="detail-label">Hours</div><div class="detail-value">${shift?escapeHtml(SuiteUX.displayTimeOnly(shift.hoursStart)+' - '+SuiteUX.displayTimeOnly(shift.hoursEnd)):'—'}</div></div>
        <div><div class="detail-label">Assignment Type</div><div class="detail-value">${escapeHtml(sourceLabel)}</div></div>
        <div><div class="detail-label">Notes</div><div class="detail-value">${escapeHtml(coverage.notes||'—')}</div></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick=closeModal;
  document.getElementById('mCancel').onclick=closeModal;
}

function openShiftFormModal(existing){
  const groups=manageableScheduleWorkGroups();
  if(!groups.length){toast(isGlobalScheduleAdmin()?'Create or activate a Work Group Calendar before adding a shift pattern.':'An administrator must give you access to an active Work Group Calendar before you can add a shift pattern.',true);return;}
  if(existing&&!canManageScheduleShift(existing))return;
  const editing = !!existing;
  const patternType = existing?.patternType === 'weekly' ? 'weekly' : 'rotation';
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit Shift Pattern':'New Shift Pattern'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Work Group</label><select id="fShiftWorkGroup">${groups.map(g=>`<option value="${g.id}" ${existing?.workGroupId===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Pattern Name</label><input type="text" id="fShiftName" value="${editing?escapeHtml(existing.name):''}" placeholder="e.g. Patrol C - Days"></div>
      <div class="form-row"><label>Schedule Type</label>
        <select id="fShiftPatternType">
          <option value="rotation" ${patternType==='rotation'?'selected':''}>Fixed rotation (days on / days off)</option>
          <option value="weekly" ${patternType==='weekly'?'selected':''}>Specific days of the week</option>
        </select>
      </div>
      <div id="fShiftRotationFields" style="display:${patternType==='weekly'?'none':'block'};">
        <div class="form-2col">
          <div class="form-row"><label>Days On</label><input type="number" id="fShiftDaysOn" value="${editing?existing.daysOn:4}"></div>
          <div class="form-row"><label>Days Off</label><input type="number" id="fShiftDaysOff" value="${editing?existing.daysOff:3}"></div>
        </div>
      </div>
      <div id="fShiftWeeklyFields" style="display:${patternType==='weekly'?'block':'none'};">
        <div class="form-row"><label>Works every week on</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${WEEKDAY_LABELS.map((lbl,i)=>`<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="fShiftWeekday" value="${i}" style="width:auto;" ${(existing?.weekdays||[]).includes(i)?'checked':''}> ${lbl}</label>`).join('')}
          </div>
        </div>
        <div class="form-row"><label>Also works every other week on <span style="font-weight:400;color:var(--text-dim);">(optional)</span></label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            ${WEEKDAY_LABELS.map((lbl,i)=>`<label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="fShiftAltWeekday" value="${i}" style="width:auto;" ${(existing?.altWeekdays||[]).includes(i)?'checked':''}> ${lbl}</label>`).join('')}
          </div>
        </div>
        <div class="form-row"><label>Reference date for the alternating day <span style="font-weight:400;color:var(--text-dim);">(any date that should count as an "on" week for that day)</span></label>
          <input type="date" id="fShiftAltAnchor" value="${existing?.altAnchorDate || fmt(new Date())}">
        </div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Time</label><input type="time" id="fShiftStart" value="${editing?existing.hoursStart:'06:00'}"></div>
        <div class="form-row"><label>End Time</label><input type="time" id="fShiftEnd" value="${editing?existing.hoursEnd:'18:00'}"></div>
      </div>
      <div class="form-row"><label>Minimum Staff Required</label><input type="number" min="0" id="fShiftMinStaff" value="${editing?(existing.minStaff||0):1}"></div>
      ${staffingNeedsEditor('fShiftStaffNeeds',existing)}
      <div class="form-row"><label>Effective Dates <span style="font-weight:400;color:var(--text-dim);">(when this rotation itself is in effect \u2014 not when a specific person is assigned to it)</span></label>
        <div class="form-2col">
          <input type="date" id="fShiftStartDate" value="${editing?(existing.startDate||''):fmt(new Date())}">
          <input type="date" id="fShiftEndDate" value="${editing?(existing.endDate||''):''}" placeholder="Leave blank if ongoing">
        </div>
        <div style="font-size:11.5px;color:var(--text-dim);margin-top:4px;">Leave the end date blank if this pattern doesn't have a known end yet. Once a pattern's end date passes, it drops off the list here automatically (there's a toggle to still see it).</div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save Changes':'Create'}</button></div>
  `;
  openModal();
  wireStaffingNeedsEditor('fShiftStaffNeeds','fShiftMinStaff');
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fShiftPatternType').addEventListener('change', (e)=>{
    const isWeekly = e.target.value==='weekly';
    document.getElementById('fShiftRotationFields').style.display = isWeekly ? 'none' : 'block';
    document.getElementById('fShiftWeeklyFields').style.display = isWeekly ? 'block' : 'none';
  });
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fShiftName').value.trim();
    if(!name){ toast("Enter a pattern name.", true); return; }
    const selectedType = document.getElementById('fShiftPatternType').value;
    const weekdays = Array.from(document.querySelectorAll('.fShiftWeekday:checked')).map(el=>Number(el.value));
    const altWeekdays = Array.from(document.querySelectorAll('.fShiftAltWeekday:checked')).map(el=>Number(el.value));
    const altAnchorDate = document.getElementById('fShiftAltAnchor').value;
    if(selectedType==='weekly' && weekdays.length===0 && altWeekdays.length===0){ toast("Select at least one day of the week.", true); return; }
    if(selectedType==='weekly' && altWeekdays.length>0 && !altAnchorDate){ toast("Pick a reference date for the alternating day.", true); return; }
    const startDate = document.getElementById('fShiftStartDate').value;
    const endDate = document.getElementById('fShiftEndDate').value || null;
    if(!startDate){ toast("Enter an effective start date.", true); return; }
    if(endDate && endDate < startDate){ toast("End date can't be before the start date.", true); return; }
    const workGroupId=document.getElementById('fShiftWorkGroup').value;
    if(!groups.some(g=>g.id===workGroupId)||(editing&&!canManageScheduleShift(existing)))return;
    const staffingRequirements=readStaffingNeeds('fShiftStaffNeeds');if(!staffingRequirements)return;
    const data = {
      name, workGroupId, staffingRequirements,
      patternType: selectedType,
      daysOn: Number(document.getElementById('fShiftDaysOn').value)||4,
      daysOff: Number(document.getElementById('fShiftDaysOff').value)||3,
      weekdays, altWeekdays, altAnchorDate,
      hoursStart: document.getElementById('fShiftStart').value,
      hoursEnd: document.getElementById('fShiftEnd').value,
      minStaff: Math.max(0, Number(document.getElementById('fShiftMinStaff').value)||0),
      startDate, endDate,
    };
    if(editing){
      Object.assign(existing, data);
      logActivity(`Updated shift pattern "${name}".`, "schedule");
      toast("Shift pattern updated.");
    } else {
      const color = SHIFT_COLOR_PALETTE[STATE.pm.scheduleShifts.length % SHIFT_COLOR_PALETTE.length];
      STATE.pm.scheduleShifts.push({id:'shift'+Date.now(), color, published:false, ...data});
      logActivity(`Created draft shift pattern "${name}".`, "schedule");
      toast("Shift pattern created as Draft. A Schedule Admin must publish it before it appears on the live Duty Roster.");
    }
    persist();
    closeModal();
    renderScheduling();
  };
}

function openOneOffCoverageModal(){
  const liveShifts=sortShiftsForSelection(STATE.pm.scheduleShifts.filter(s=>s.published!==false&&canManageScheduleShift(s)));
  if(!liveShifts.length){ toast("Publish at least one shift pattern before adding one-off staffing.", true); return; }
  document.getElementById('modalBox').className='modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Person to a Single Shift</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label><select id="fOneOffPerson">${STATE.personnel.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Shift</label><select id="fOneOffShift">${liveShifts.map(s=>`<option value="${s.id}">${escapeHtml(s.name)} (${SuiteUX.displayTimeOnly(s.hoursStart)} - ${SuiteUX.displayTimeOnly(s.hoursEnd)})</option>`).join('')}</select></div>
      <div class="form-row"><label>Date</label><input type="date" id="fOneOffDate" value="${fmt(new Date())}"></div>
      <div class="form-2col"><div class="form-row"><label>Reason</label><select id="fOneOffSource"><option value="overtime">Overtime</option><option value="callback">Callback</option><option value="manual">Other / Manual Coverage</option></select></div><div class="form-row"><label>Notes</label><input type="text" id="fOneOffNotes" placeholder="Optional"></div></div>
      <div class="form-row"><label>Staffing Category</label><select id="fOneOffCategory"></select></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add to Duty Roster</button></div>`;
  openModal();
  const syncCategory=()=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===document.getElementById('fOneOffShift').value);document.getElementById('fOneOffCategory').innerHTML=staffingCategoryOptions(shift);};
  document.getElementById('fOneOffShift').addEventListener('change',syncCategory);syncCategory();wireStaffingPersonPicker('fOneOffShift','fOneOffCategory','fOneOffPerson',null);
  document.getElementById('mClose').onclick=closeModal;
  document.getElementById('mCancel').onclick=closeModal;
  document.getElementById('mSave').onclick=()=>{
    const personId=document.getElementById('fOneOffPerson').value, shiftId=document.getElementById('fOneOffShift').value, date=document.getElementById('fOneOffDate').value;
    const source=document.getElementById('fOneOffSource').value, notes=document.getElementById('fOneOffNotes').value.trim();
    if(!date){toast("Choose a date.",true);return;}
    const duplicate=(STATE.pm.scheduleCoverages||[]).some(x=>x.personId===personId&&x.shiftId===shiftId&&x.date===date);
    if(duplicate){toast("That person is already added to this shift on this date.",true);return;}
    const shift=STATE.pm.scheduleShifts.find(s=>s.id===shiftId);
    if(!personId||!staffingPersonHasSkill(STATE.pm.records,personId,(shift.staffingRequirements||[]).find(c=>c.id===document.getElementById('fOneOffCategory').value))){toast('Select personnel with the required skill.',true);return;}
    if(onDutyRoster(shift,date).includes(personId)){toast("That person is already scheduled to work this shift on this date.",true);return;}
    if(activeExceptionFor(personId,date)){toast("That person has time off or another schedule exception on this date. Adjust the exception before adding one-off staffing.",true);return;}
    STATE.pm.scheduleCoverages.push({id:'cov'+Date.now(),personId,shiftId,date,source,staffingCategoryId:document.getElementById('fOneOffCategory').value,hours:shiftHours(shift),notes,createdBy:CURRENT_USER_ID,createdAt:new Date().toISOString()});
    logActivity(`Added ${personName(personId)} to ${shift?.name||'a shift'} on ${date} as one-off ${source} coverage.`, 'schedule');
    persist(); closeModal(); toast("Person added to the Duty Roster."); renderScheduling();
  };
}

function openAssignmentFormModal(existing){
  if(existing&&!canManageScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===existing.shiftId)))return;
  const availableShifts=STATE.pm.scheduleShifts.filter(canManageScheduleShift);
  if(!availableShifts.length)return;
  const editing = !!existing;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit Shift Assignment':'Assign Shift'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label><select id="fAssignPerson">${STATE.personnel.map(p=>`<option value="${p.id}" ${editing&&existing.personId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Shift Pattern</label><select id="fAssignShift">${sortShiftsForSelection(availableShifts).map(s=>`<option value="${s.id}" ${editing&&existing.shiftId===s.id?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Staffing Category</label><select id="fAssignCategory"></select></div>
      <div class="form-2col">
        <div class="form-row"><label>Unit</label><select id="fAssignUnit">${STATE.pm.refData.units.map(u=>`<option ${editing&&existing.unit===u?'selected':''}>${escapeHtml(u)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Location</label><input type="text" id="fAssignLocation" value="${editing?escapeHtml(existing.location||''):''}" placeholder="e.g. North Substation"></div>
      </div>
      <div class="form-row"><label>Start Date</label><input type="date" id="fAssignStart" value="${editing?existing.startDate:fmt(new Date())}"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save Changes':'Assign'}</button></div>
  `;
  openModal();
  const syncCategory=()=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===document.getElementById('fAssignShift').value);document.getElementById('fAssignCategory').innerHTML=staffingCategoryOptions(shift,existing?.staffingCategoryId||'');};
  document.getElementById('fAssignShift').addEventListener('change',syncCategory);syncCategory();wireStaffingPersonPicker('fAssignShift','fAssignCategory','fAssignPerson',existing);
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const personId = document.getElementById('fAssignPerson').value;
    const data = {
      personId, staffingCategoryId:document.getElementById('fAssignCategory').value,
      shiftId: document.getElementById('fAssignShift').value,
      unit: document.getElementById('fAssignUnit').value,
      location: document.getElementById('fAssignLocation').value.trim(),
      startDate: document.getElementById('fAssignStart').value,
    };
    const selectedShift=STATE.pm.scheduleShifts.find(s=>s.id===data.shiftId);
    if((selectedShift?.staffingRequirements||[]).length&&!data.staffingCategoryId){toast('Select the staffing category this employee will fill.',true);return;}
    if(!data.personId||!staffingPersonHasSkill(STATE.pm.records,data.personId,(selectedShift?.staffingRequirements||[]).find(c=>c.id===data.staffingCategoryId))){toast('Select personnel with the required skill.',true);return;}
    if(!canManageScheduleShift(selectedShift))return;
    if(editing){
      Object.assign(existing, data);
      logActivity(`Updated shift assignment for ${personName(personId)}.`, "schedule", existing.id);
      toast("Shift assignment updated.");
    } else {
      STATE.pm.scheduleAssignments.push({id:'sa'+Date.now(), ...data, endDate: null});
      logActivity(`Assigned ${personName(personId)} to a new shift.`, "schedule");
      toast("Shift assigned.");
    }
    persist();
    closeModal();
    renderScheduling();
  };
}

function openExceptionFormModal(existing){
  if(existing&&!canManagePersonSchedule(existing.personId,existing))return;
  const people=STATE.personnel.filter(p=>canManagePersonSchedule(p.id));
  if(!people.length)return;
  const editing = !!existing;
  const codes = selectableExceptionCodes(editing ? existing.code : null);
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit Time Off / Exception':'Log Time Off / Exception'}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Employee</label><select id="fExPerson">${people.map(p=>`<option value="${p.id}" ${editing&&existing.personId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Code</label>
        <select id="fExCode">${codes.map(c=>`<option value="${c.code}" ${editing&&existing.code===c.code?'selected':''}>${c.code} — ${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Start Date</label><input type="date" id="fExStart" value="${editing?existing.startDate:fmt(new Date())}"></div>
        <div class="form-row"><label>End Date</label><input type="date" id="fExEnd" value="${editing?existing.endDate:fmt(new Date())}"></div>
      </div>
      <div class="form-row"><label>Notes</label><input type="text" id="fExNotes" value="${editing?escapeHtml(existing.notes||''):''}" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save Changes':'Log It'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const personId = document.getElementById('fExPerson').value;
    const startDate = document.getElementById('fExStart').value;
    const endDate = document.getElementById('fExEnd').value;
    if(!startDate || !endDate || endDate<startDate){ toast("Enter a valid date range.", true); return; }
    const data = {
      personId,
      code: document.getElementById('fExCode').value,
      startDate,
      endDate,
      notes: document.getElementById('fExNotes').value.trim(),
    };
    if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
    if(!canManagePersonSchedule(data.personId,data)||!data.startDate||!data.endDate||data.endDate<data.startDate){toast("Choose a valid date range in a calendar you manage.",true);return;}
    if(editing){
      Object.assign(existing, data);
      logActivity(`Updated a ${data.code} entry for ${personName(personId)}.`, "schedule");
      toast("Exception updated.");
    } else {
      STATE.pm.scheduleExceptions.push({id:'exc'+Date.now(), ...data});
      logActivity(`Logged a ${data.code} for ${personName(personId)} (${startDate}${endDate!==startDate?' to '+endDate:''}).`, "schedule");
      toast("Logged.");
    }
    persist();
    closeModal();
    renderScheduling();
  };
}

function openSwapRequestModal(){
  // Best-effort default: if the logged-in user is a real person with an active assignment,
  // preselect them as the one requesting off, since that's who's using this form 95% of the time.
  const defaultRequester = STATE.personnel.find(p=>p.id===CURRENT_USER_ID) ? CURRENT_USER_ID : (STATE.personnel[0]||{}).id;
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Request Shift Swap</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Requesting (wants the day off)</label><select id="fSwapRequester">${STATE.personnel.filter(p=>p.id===CURRENT_USER_ID||canManagePersonSchedule(p.id)).map(p=>`<option value="${p.id}" ${defaultRequester===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Covering (will work the shift instead)</label><select id="fSwapCovering">${STATE.personnel.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Date</label><input type="date" id="fSwapDate" value="${fmt(new Date())}"></div>
      <div class="form-row"><label>Reason</label><input type="text" id="fSwapReason" placeholder="Optional"></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Submit Request</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const requesterId = document.getElementById('fSwapRequester').value;
    const coveringId = document.getElementById('fSwapCovering').value;
    const date = document.getElementById('fSwapDate').value;
    if(!date){ toast("Choose a date.", true); return; }
    if(requesterId!==CURRENT_USER_ID&&!(canManagePersonSchedule(requesterId,{date})&&canManagePersonSchedule(coveringId,{date})))return;
    if(requesterId===coveringId){ toast("Pick two different people.", true); return; }
    if(!STATE.pm.shiftSwapRequests) STATE.pm.shiftSwapRequests = [];
    STATE.pm.shiftSwapRequests.push({
      id:'swap'+Date.now(), requesterId, coveringId, date,
      reason: document.getElementById('fSwapReason').value.trim(),
      status:'pending', requestedAt: fmt(new Date()), requestedBy: CURRENT_USER_ID,
    });
    logActivity(`Requested a shift swap: ${personName(coveringId)} to cover for ${personName(requesterId)} on ${date}.`, "schedule");
    persist();
    toast("Swap request submitted for approval.");
    closeModal();
    renderScheduling();
  };
}

function approveSwapRequest(id){
  const req = (STATE.pm.shiftSwapRequests||[]).find(r=>r.id===id);
  if(!req || req.status!=='pending'||!canManageSwapRequest(req)) return;
  if(!confirm(`Approve this swap? ${personName(req.coveringId)} will cover for ${personName(req.requesterId)} on ${req.date}.`)) return;
  if(!STATE.pm.scheduleExceptions) STATE.pm.scheduleExceptions = [];
  if(!STATE.pm.scheduleCoverages) STATE.pm.scheduleCoverages = [];
  // Resolve the requester's actual assignment before changing anything. A stale request must
  // never become "approved" without putting the covering employee onto the roster.
  const requesterAssignment = STATE.pm.scheduleAssignments.find(a=>a.personId===req.requesterId && isOnDutyOnDate(a, STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId), req.date));
  if(!requesterAssignment){toast("This swap can no longer be approved because the requester's scheduled assignment for that date was not found. Review the schedule and submit a new swap if needed.",true);return;}
  const swapShift=STATE.pm.scheduleShifts.find(s=>s.id===requesterAssignment.shiftId);
  if(!staffingPersonHasSkill(STATE.pm.records,req.coveringId,(swapShift?.staffingRequirements||[]).find(c=>c.id===requesterAssignment.staffingCategoryId))){toast('The covering employee does not have the required staffing skill.',true);return;}
  // Mark the requester off that day, same mechanism as any other logged exception.
  STATE.pm.scheduleExceptions.push({id:'exc'+Date.now(), personId:req.requesterId, code:'SWP', startDate:req.date, endDate:req.date, notes:`Covered by ${personName(req.coveringId)}`, swapRequestId:req.id});
  STATE.pm.scheduleCoverages.push({id:'cov'+Date.now(), personId:req.coveringId, shiftId:requesterAssignment.shiftId, unit:requesterAssignment.unit, location:requesterAssignment.location, date:req.date, staffingCategoryId:requesterAssignment.staffingCategoryId||'', swapRequestId:req.id});
  req.status = 'approved';
  req.decidedAt = fmt(new Date());
  req.decidedBy = CURRENT_USER_ID;
  logActivity(`Approved a shift swap: ${personName(req.coveringId)} covering for ${personName(req.requesterId)} on ${req.date}.`, "schedule");
  persist();
  toast("Swap approved.");
  renderScheduling();
}

function denySwapRequest(id){
  const req = (STATE.pm.shiftSwapRequests||[]).find(r=>r.id===id);
  if(!req || req.status!=='pending'||!canManageSwapRequest(req)) return;
  if(!confirm(`Deny the swap request from ${personName(req.requesterId)}?`)) return;
  req.status = 'denied';
  req.decidedAt = fmt(new Date());
  req.decidedBy = CURRENT_USER_ID;
  logActivity(`Denied a shift swap request from ${personName(req.requesterId)}.`, "schedule");
  persist();
  toast("Swap denied.");
  renderScheduling();
}

function cancelSwapRequest(id){
  const req = (STATE.pm.shiftSwapRequests||[]).find(r=>r.id===id);
  if(!req || req.status!=='pending'||req.requesterId!==CURRENT_USER_ID) return;
  if(!confirm("Cancel this swap request?")) return;
  req.status = 'cancelled';
  req.decidedAt = fmt(new Date());
  logActivity(`Cancelled a shift swap request for ${personName(req.requesterId)}.`, "schedule");
  persist();
  toast("Request cancelled.");
  renderScheduling();
}

function deleteSwapRequest(id){
  const req = (STATE.pm.shiftSwapRequests||[]).find(r=>r.id===id);
  if(!req||!canManageSwapRequest(req)) return;
  if(!confirm("Delete this swap request record? This also removes any coverage or day-off entry it created.")) return;
  STATE.pm.scheduleExceptions = (STATE.pm.scheduleExceptions||[]).filter(e=>e.swapRequestId!==id);
  STATE.pm.scheduleCoverages = (STATE.pm.scheduleCoverages||[]).filter(c=>c.swapRequestId!==id);
  STATE.pm.shiftSwapRequests = STATE.pm.shiftSwapRequests.filter(r=>r.id!==id);
  logActivity(`Deleted a shift swap request record.`, "schedule");
  persist();
  toast("Deleted.");
  renderScheduling();
}

/* =========================================================================
   REPORTS & ANALYTICS (fixed required reports + a configurable report builder)
   ========================================================================= */
let CUSTOM_REPORT = {entity:"records", groupBy:"unitId", unit:"All", rank:"All", dateFrom:"", dateTo:""};
let PM_REPORT_FILTERS = { dateFrom:'', dateTo:'', unit:'All' };

function renderReports(){
  if(!can('pm_reports_view')){
    document.getElementById('view-pm-reports').innerHTML = permissionBlockedView("You don't have permission to view reports in this role.");
    return;
  }
  const canExport = can('pm_reports_export');
  const f = PM_REPORT_FILTERS;
  const personInScope = pid => f.unit==='All' || (STATE.personnel.find(p=>p.id===pid)?.unit === f.unit);

  // Required report: training + expiration dates
  const trainingExpRows = STATE.pm.trainingRecords.filter(t=>t.recertDate && personInScope(t.personId) && withinDateRange(t.recertDate, f.dateFrom, f.dateTo)).sort((a,b)=>a.recertDate.localeCompare(b.recertDate)).map(t=>`
    <tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.recertDate}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No recertification dates on file.</td></tr>`;

  // Required report: training costs
  const costByProvider = {};
  STATE.pm.trainingRecords.filter(t=>personInScope(t.personId) && withinDateRange(t.date, f.dateFrom, f.dateTo)).forEach(t=>{ costByProvider[t.provider] = (costByProvider[t.provider]||0) + t.cost; });
  const totalTrainingCost = Object.values(costByProvider).reduce((a,b)=>a+b,0);

  // Required report: scheduled but no-show
  const noShowRows = STATE.pm.trainingRecords.filter(t=>t.attendedStatus==="No-Show" && personInScope(t.personId) && withinDateRange(t.date, f.dateFrom, f.dateTo)).map(t=>`
    <tr><td>${recordLink(t.personId)}</td><td>${escapeHtml(t.description)}</td><td>${t.date}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No no-shows on file.</td></tr>`;

  // Required-ish: pending disciplinary expirations (mirrors the Disciplinary screen's report)
  const today = new Date();
  const pendingDiscipline = STATE.pm.disciplinaryActions.filter(d=>d.status!=="Closed" && d.evaluationDates.length && personInScope(d.personId))
    .flatMap(d=>d.evaluationDates.map(ed=>({d,ed,days:daysBetween(fmt(today),ed)}))).filter(x=>x.days<=60).sort((a,b)=>a.days-b.days);

  document.getElementById('view-pm-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div id="pmReportFilterHost"></div></div></div>
    <div class="panel"><div class="panel-head"><h2>Training &amp; Expiration Dates</h2>${canExport?`<button class="btn btn-sm btn-outline" id="btnExportTrainExp">${ICONS.download} Export</button>`:''}</div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Course</th><th>Recert Due</th></tr></thead><tbody>${trainingExpRows}</tbody></table></div></div>

    <div class="two-col">
      <div class="panel"><div class="panel-head"><h2>Training Costs by Provider</h2><span class="hint">${money(totalTrainingCost)} total</span></div>
        <div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartTrainCost"></canvas></div></div></div>
      <div class="panel"><div class="panel-head"><h2>Scheduled but No-Show</h2></div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Employee</th><th>Course</th><th>Date</th></tr></thead><tbody>${noShowRows}</tbody></table></div></div>
    </div>

    <div class="panel"><div class="panel-head"><h2>Pending Disciplinary Expirations</h2><span class="hint">Within 60 days</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;"><table><thead><tr><th>Employee</th><th>Type</th><th>Evaluation Date</th><th>Time Remaining</th></tr></thead><tbody>
      ${pendingDiscipline.map(({d,ed,days})=>`<tr><td>${recordLink(d.personId)}</td><td>${escapeHtml(d.type)}</td><td>${ed}</td><td style="${days<=14?'color:var(--red);font-weight:700;':''}">${days<0?Math.abs(days)+'d overdue':days+'d'}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:14px;">Nothing pending.</td></tr>`}
      </tbody></table></div></div>

    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="crEntity">
              <option value="records" ${CUSTOM_REPORT.entity==='records'?'selected':''}>Personnel Records</option>
              <option value="training" ${CUSTOM_REPORT.entity==='training'?'selected':''}>Training Records</option>
              <option value="disciplinary" ${CUSTOM_REPORT.entity==='disciplinary'?'selected':''}>Disciplinary Actions</option>
              <option value="inquiries" ${CUSTOM_REPORT.entity==='inquiries'?'selected':''}>RMS-Data Inquiries</option>
              ${[['assignments','Shift Assignments'],['overtime','Overtime Coverage'],['leave','Time Off Requests'],['events','Special Events'],['rollcall','Roll Call'],['extraduty','Extra Duty Signups']].map(([id,label])=>`<option value="${id}" ${CUSTOM_REPORT.entity===id?'selected':''}>${label}</option>`).join('')}
            </select>
            <select id="crGroupBy"></select>
            <select id="crUnit"><option ${CUSTOM_REPORT.unit==='All'?'selected':''}>All</option>${STATE.pm.refData.units.map(u=>`<option ${CUSTOM_REPORT.unit===u?'selected':''}>${escapeHtml(u)}</option>`).join('')}</select>
            <select id="crRank"><option ${CUSTOM_REPORT.rank==='All'?'selected':''}>All</option>${STATE.pm.refData.ranks.map(r=>`<option ${CUSTOM_REPORT.rank===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select>
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
  renderReportFilterBar(document.getElementById('pmReportFilterHost'), [
    {type:'daterange', keyFrom:'dateFrom', keyTo:'dateTo', label:'Date Range'},
    {type:'select', key:'unit', label:'Unit', options: STATE.pm.refData.units},
  ], PM_REPORT_FILTERS, renderReports);
  destroyChartsPm();
  const blue='#134DD1', navy='#24364E', slate='#B4C7CF';
  CHART_REFS_PM.trainCost = safeChart('chartTrainCost', {
    type:'bar', data:{ labels:Object.keys(costByProvider), datasets:[{label:'Cost ($)', data:Object.values(costByProvider), backgroundColor:navy}] },
    options: {indexAxis:'y', maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}}}}}
  });
  const exportTrainExp = document.getElementById('btnExportTrainExp');
  if(exportTrainExp) exportTrainExp.addEventListener('click', ()=>exportCsv(
    ["Employee","Course","Recert Due"],
    STATE.pm.trainingRecords.filter(t=>t.recertDate).map(t=>[personName(t.personId), t.description, t.recertDate]),
    'training_expirations.csv'
  ));
  renderCustomReportBuilder();
  document.getElementById('crEntity').addEventListener('change', e=>{CUSTOM_REPORT.entity=e.target.value; renderCustomReportBuilder();});
  document.getElementById('crGroupBy').addEventListener('change', e=>{CUSTOM_REPORT.groupBy=e.target.value; renderCustomReportBuilder();});
  document.getElementById('crUnit').addEventListener('change', e=>{CUSTOM_REPORT.unit=e.target.value; renderCustomReportBuilder();});
  document.getElementById('crRank').addEventListener('change', e=>{CUSTOM_REPORT.rank=e.target.value; renderCustomReportBuilder();});
  document.getElementById('crDateFrom').addEventListener('change', e=>{CUSTOM_REPORT.dateFrom=e.target.value; renderCustomReportBuilder();});
  document.getElementById('crDateTo').addEventListener('change', e=>{CUSTOM_REPORT.dateTo=e.target.value; renderCustomReportBuilder();});
  wireRecordLinks();
}

const REPORT_GROUPBY_OPTIONS = {
  records: [['unitId','Unit'],['rank','Rank'],['employmentStatus','Employment Status'],['race','Race'],['sex','Sex']],
  training: [['description','Course'],['provider','Provider'],['attendedStatus','Attendance']],
  disciplinary: [['type','Type'],['status','Status']],
  inquiries: [['category','Category'],['outcome','Outcome']],
  assignments: [['workGroup','Work Group'],['shiftName','Shift'],['unit','Unit']],
  overtime: [['workGroup','Work Group'],['shiftName','Shift'],['source','Source']],
  leave: [['workGroup','Work Group'],['status','Status'],['code','Time Off Code']],
  events: [['workGroup','Work Group'],['status','Status'],['location','Location']],
  rollcall: [['workGroup','Work Group'],['shiftName','Shift'],['status','Attendance']],
  extraduty: [['workGroup','Work Group'],['status','Status'],['employer','Employer']],
};

function schedulingReportDataset(entity){
  const shiftFields=shiftId=>{const shift=STATE.pm.scheduleShifts.find(s=>s.id===shiftId);return {workGroup:scheduleWorkGroupName(shift?.workGroupId),shiftName:shift?.name||''};};
  if(entity==='assignments')return (STATE.pm.scheduleAssignments||[]).filter(a=>canViewScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===a.shiftId))).map(a=>({...a,...shiftFields(a.shiftId),__date:a.startDate}));
  if(entity==='overtime')return (STATE.pm.scheduleCoverages||[]).filter(c=>['overtime','callback'].includes(c.source)&&canViewScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===c.shiftId))).map(c=>({...c,...shiftFields(c.shiftId),__date:c.date}));
  if(entity==='leave')return (STATE.pm.leaveRequests||[]).filter(r=>canViewPersonSchedule(r.personId,r)).map(r=>({...r,workGroup:personScheduleGroupIds(r.personId,r).map(scheduleWorkGroupName).join(', '),__date:r.startDate}));
  if(entity==='events')return (STATE.pm.specialEvents||[]).filter(e=>!(e.eligibleWorkGroupIds||[]).length||(e.eligibleWorkGroupIds||[]).some(id=>canViewWorkGroup((STATE.pm.scheduleWorkGroups||[]).find(g=>g.id===id)))).map(e=>({...e,workGroup:(e.eligibleWorkGroupIds||[]).map(scheduleWorkGroupName).join(', ')||'Agency-wide',__date:e.startDate,__label:e.name}));
  if(entity==='rollcall')return (STATE.pm.rollCalls||[]).filter(r=>canViewScheduleShift(STATE.pm.scheduleShifts.find(s=>s.id===r.shiftId))).flatMap(r=>(r.entries||[]).map(e=>({...e,...shiftFields(r.shiftId),__date:r.date})));
  if(entity==='extraduty')return (STATE.pm.extraDutySignups||[]).flatMap(s=>{const job=(STATE.pm.extraDutyJobs||[]).find(j=>j.id===s.jobId);return job&&canViewScheduleActivity(job,'job')?[{...s,workGroup:job.workGroupId?scheduleWorkGroupName(job.workGroupId):'Agency-wide',employer:job.employer,__date:job.date}]:[];});
  return [];
}

function renderCustomReportBuilder(){
  const groupSel = document.getElementById('crGroupBy');
  const opts = REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity];
  if(!opts.find(([k])=>k===CUSTOM_REPORT.groupBy)) CUSTOM_REPORT.groupBy = opts[0][0];
  groupSel.innerHTML = opts.map(([k,label])=>`<option value="${k}" ${CUSTOM_REPORT.groupBy===k?'selected':''}>Group by ${label}</option>`).join('');

  let dataset;
  if(CUSTOM_REPORT.entity==='records') dataset = STATE.pm.records.map(r=>({...r, __date: r.hireDate}));
  else if(CUSTOM_REPORT.entity==='training') dataset = STATE.pm.trainingRecords.map(t=>({...t, __date: t.date}));
  else if(CUSTOM_REPORT.entity==='disciplinary') dataset = STATE.pm.disciplinaryActions.map(d=>({...d, __date: d.startDateTime.slice(0,10)}));
  else if(CUSTOM_REPORT.entity==='inquiries') dataset = STATE.pm.inquiries.map(i=>({...i, __date: i.date}));
  else dataset=schedulingReportDataset(CUSTOM_REPORT.entity);

  dataset = dataset.filter(row=>{
    if(CUSTOM_REPORT.unit!=="All"){
      const rec = row.personId ? recordFor(row.personId) : null;
      const unitVal = row.unitId || (rec ? rec.unitId : null);
      if(unitVal !== CUSTOM_REPORT.unit) return false;
    }
    if(CUSTOM_REPORT.rank!=="All"){
      const rec = row.personId ? recordFor(row.personId) : row;
      if(!rec || rec.rank!==CUSTOM_REPORT.rank) return false;
    }
    if(CUSTOM_REPORT.dateFrom && row.__date && row.__date < CUSTOM_REPORT.dateFrom) return false;
    if(CUSTOM_REPORT.dateTo && row.__date && row.__date > CUSTOM_REPORT.dateTo) return false;
    return true;
  });

  const counts = {};
  dataset.forEach(row=>{ const key = row[CUSTOM_REPORT.groupBy] || 'Unspecified'; counts[key] = (counts[key]||0)+1; });

  if(CHART_REFS_PM.custom) CHART_REFS_PM.custom.destroy();
  CHART_REFS_PM.custom = safeChart('chartCustomReport', {
    type:'bar',
    data:{ labels:Object.keys(counts), datasets:[{label:'Count', data:Object.values(counts), backgroundColor:'#134DD1'}] },
    options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}}}}}
  });

  const nameCol = CUSTOM_REPORT.entity==='records' ? 'personId' : 'personId';
  const tableRows = dataset.slice(0,200).map(row=>`
    <tr><td>${row.personId?recordLink(row.personId):escapeHtml(row.__label||'')}</td><td>${escapeHtml(String(row[CUSTOM_REPORT.groupBy]||''))}</td><td>${escapeHtml(row.__date||'')}</td></tr>
  `).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
  document.getElementById('customReportTable').innerHTML = `
    <table><thead><tr><th>Employee</th><th>${REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity].find(([k])=>k===CUSTOM_REPORT.groupBy)[1]}</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length>200?' (showing first 200)':''}</div>
  `;
  wireRecordLinks();

  const exportBtn = document.getElementById('btnExportCustomReport');
  if(exportBtn) exportBtn.onclick = ()=>exportCsv(
    ["Employee", REPORT_GROUPBY_OPTIONS[CUSTOM_REPORT.entity].find(([k])=>k===CUSTOM_REPORT.groupBy)[1], "Date"],
    dataset.map(row=>[row.personId?personName(row.personId):row.__label||'', row[CUSTOM_REPORT.groupBy]||'', row.__date||'']),
    `personnel_custom_report_${CUSTOM_REPORT.entity}.csv`
  );
}

function exportCsv(headers, rows, filename){
  const csv = [headers, ...rows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast("Report exported.");
}

/* =========================================================================
   ADMIN: reference data, notification routing, platform audit log
   ========================================================================= */
let ADMIN_TAB = 'ranks';
const SIMPLE_LIST_TABS = {
  ranks: {label:'Ranks', usageCheck:(v)=>STATE.pm.records.filter(r=>r.rank===v).length},
  units: {label:'Units', usageCheck:(v)=>STATE.pm.records.filter(r=>r.unitId===v).length},
  disciplinaryTypes: {label:'Disciplinary Types', usageCheck:(v)=>STATE.pm.disciplinaryActions.filter(d=>d.type===v).length},
  employmentStatuses: {label:'Employment Statuses', usageCheck:(v)=>STATE.pm.records.filter(r=>r.employmentStatus===v).length},
  trainingCategories: {label:'Training Categories', usageCheck:(v)=>STATE.pm.trainingCourses.filter(c=>c.category===v).length},
  trainingProviders: {label:'Training Providers', usageCheck:(v)=>STATE.pm.trainingRecords.filter(t=>t.provider===v).length},
  inquiryCategories: {label:'Inquiry Categories', usageCheck:(v)=>STATE.pm.inquiries.filter(i=>i.category===v).length},
  skillsCatalog: {label:'Special Skills Catalog', usageCheck:(v)=>STATE.pm.records.filter(r=>r.specialSkills.includes(v)).length+[...(STATE.pm.scheduleShifts||[]),...(STATE.pm.specialEvents||[])].filter(r=>(r.staffingRequirements||[]).some(c=>c.requiredSkill===v)).length},
};

function renderAdmin(){
  const canManage = can('pm_admin_categories');
  const canAudit = can('pm_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-pm-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){
    Object.entries(SIMPLE_LIST_TABS).forEach(([key,cfg])=>tabs.push([key,cfg.label]));
    tabs.push(['trainingLocations','Training Locations']);
    tabs.push(['personnelSettings','Personnel Settings']);
    tabs.push(['notifications','Notification Routing']);
  }
  if(can('personnel_bulk_import')) tabs.push(['bulkImportPersonnel','Data Migration: Personnel']);
  if(can('pm_training_bulk_import')) tabs.push(['bulkImportTraining','Data Migration: Training Records']);
  if(can('pm_reference_bulk_import')){
    tabs.push(['bulkImportRanks','Data Migration: Ranks']);
    tabs.push(['bulkImportUnits','Data Migration: Units']);
    tabs.push(['bulkImportTrainingLocations','Data Migration: Training Locations']);
    tabs.push(['bulkImportTrainingCourses','Data Migration: Course Catalog']);
    tabs.push(['bulkImportShiftPatterns','Data Migration: Shift Patterns']);
  }
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-pm-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyPm"></div>
  `;
  document.querySelectorAll('[data-admin-tab]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTab; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBodyPm');
  if(SIMPLE_LIST_TABS[ADMIN_TAB]) renderSimpleListTab(body, ADMIN_TAB);
  else if(ADMIN_TAB==='trainingLocations') renderTrainingLocationsTab(body);
  else if(ADMIN_TAB==='exceptionCodes') renderExceptionCodesTab(body);
  else if(ADMIN_TAB==='personnelSettings') renderPersonnelSettingsTab(body);
  else if(ADMIN_TAB==='schedulingSettings') renderSchedulingSettingsTab(body);
  else if(ADMIN_TAB==='notifications') renderNotificationRoutingTab(body);
  else if(ADMIN_TAB==='bulkImportPersonnel') renderBulkImportTab(body, 'personnel');
  else if(ADMIN_TAB==='bulkImportTraining') renderBulkImportTab(body, 'training');
  else if(ADMIN_TAB==='bulkImportRanks') renderBulkImportTab(body, 'pm_ranks');
  else if(ADMIN_TAB==='bulkImportUnits') renderBulkImportTab(body, 'pm_units');
  else if(ADMIN_TAB==='bulkImportTrainingLocations') renderBulkImportTab(body, 'pm_training_locations');
  else if(ADMIN_TAB==='bulkImportTrainingCourses') renderBulkImportTab(body, 'pm_training_courses');
  else if(ADMIN_TAB==='bulkImportShiftPatterns') renderBulkImportTab(body, 'pm_shift_patterns');
  else if(ADMIN_TAB==='audit') renderPlatformAuditLogTab(body);
}

// Defensive, not reliant on any migration hook actually having run (one already didn't, for real
// tenant data -- see the fix history). Upgrades any lingering plain-string entries in place, in
// whatever function actually reads this list, so it's correct regardless of how STATE was loaded.
function ensureTrainingLocationsShape(){
  if(!STATE.pm.refData.trainingLocations) STATE.pm.refData.trainingLocations = [];
  STATE.pm.refData.trainingLocations = STATE.pm.refData.trainingLocations.map(l=>typeof l==='string' ? {name:l, address:''} : l);
}
function renderTrainingLocationsTab(body){
  ensureTrainingLocationsShape();
  const list = STATE.pm.refData.trainingLocations;
  const usageCount = (name)=> STATE.pm.trainingRecords.filter(t=>t.location===name).length + STATE.pm.trainingSessions.filter(s=>s.location===name).length;
  let editingIndex = null;

  function draw(){
    const rows = list.map((loc,i)=>{
      const inUse = usageCount(loc.name);
      const isEditing = editingIndex===i;
      if(isEditing){
        return `<tr>
          <td><input type="text" id="fLocEditName" value="${escapeHtml(loc.name)}" style="width:100%;"></td>
          <td><input type="text" id="fLocEditAddress" value="${escapeHtml(loc.address||'')}" placeholder="Street address" style="width:100%;"></td>
          <td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
          <td><div class="cell-actions"><button class="btn btn-sm btn-primary" id="btnSaveLocEdit">Save</button><button class="btn btn-sm btn-outline" id="btnCancelLocEdit">Cancel</button></div></td>
        </tr>`;
      }
      return `<tr>
        <td>${escapeHtml(loc.name)}</td>
        <td>${loc.address ? escapeHtml(loc.address) : `<span style="color:var(--text-dim);font-size:12px;">No address on file</span>`}</td>
        <td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
        <td><div class="cell-actions"><button class="btn-icon" data-edit-loc="${i}" title="Edit">${ICONS.edit}</button>${!inUse?`<button class="btn-icon" data-remove-loc="${i}" title="Delete">${ICONS.trash}</button>`:''}</div></td>
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
    document.getElementById('btnAddLoc').addEventListener('click', ()=>{
      const name = document.getElementById('newLocName').value.trim();
      const address = document.getElementById('newLocAddress').value.trim();
      if(!name){ toast("Enter a location name.", true); return; }
      if(list.some(l=>l.name.toLowerCase()===name.toLowerCase())){ toast(`"${name}" already exists.`, true); return; }
      list.push({name, address});
      logActivity(`Added training location "${name}".`, "admin");
      persist();
      toast("Location added.");
      draw();
    });
    document.querySelectorAll('[data-edit-loc]').forEach(b=>b.addEventListener('click', ()=>{ editingIndex = Number(b.dataset.editLoc); draw(); }));
    const saveBtn = document.getElementById('btnSaveLocEdit');
    if(saveBtn) saveBtn.addEventListener('click', ()=>{
      const name = document.getElementById('fLocEditName').value.trim();
      const address = document.getElementById('fLocEditAddress').value.trim();
      if(!name){ toast("Enter a location name.", true); return; }
      const oldName = list[editingIndex].name;
      if(list.some((l,i)=>i!==editingIndex && l.name.toLowerCase()===name.toLowerCase())){ toast(`"${name}" already exists.`, true); return; }
      list[editingIndex] = {name, address};
      // Renaming a location that's already referenced by sessions/records keeps them pointed at
      // the right place -- they're matched by name, so update those references along with it.
      if(oldName !== name){
        STATE.pm.trainingRecords.forEach(t=>{ if(t.location===oldName) t.location = name; });
        STATE.pm.trainingSessions.forEach(s=>{ if(s.location===oldName) s.location = name; });
      }
      logActivity(`Updated training location "${oldName}"${oldName!==name?` (renamed to "${name}")`:''}.`, "admin");
      persist();
      toast("Location updated.");
      editingIndex = null;
      draw();
    });
    const cancelBtn = document.getElementById('btnCancelLocEdit');
    if(cancelBtn) cancelBtn.addEventListener('click', ()=>{ editingIndex = null; draw(); });
    document.querySelectorAll('[data-remove-loc]').forEach(b=>b.addEventListener('click', ()=>{
      const idx = Number(b.dataset.removeLoc);
      const loc = list[idx];
      if(usageCount(loc.name)>0){ toast(`Can't remove "${loc.name}" \u2014 it's in use.`, true); return; }
      if(!confirm(`Delete the training location "${loc.name}"?`)) return;
      list.splice(idx,1);
      logActivity(`Deleted training location "${loc.name}".`, "admin");
      persist();
      toast("Location deleted.");
      draw();
    }));
  }
  draw();
}

function renderExceptionCodesTab(body){
  if(!STATE.pm.refData.exceptionCodes) STATE.pm.refData.exceptionCodes = defaultExceptionCodes();
  const list = STATE.pm.refData.exceptionCodes;
  const usageCount = (code)=> (STATE.pm.scheduleExceptions||[]).filter(e=>e.code===code).length;
  const rows = list.map((c,i)=>{
    const inUse = usageCount(c.code);
    const statusBadge = c.active===false
      ? `<span style="color:var(--text-dim);font-size:12px;">Expired</span>`
      : `<span class="badge" style="background:var(--callout-green-bg);color:var(--callout-green-text);">Active</span>`;
    let actions = '';
    if(c.locked){
      actions = `<span style="color:var(--text-dim);font-size:11px;">System-managed</span>`;
    } else {
      actions = `<button class="btn btn-sm btn-outline" data-toggle-code="${i}">${c.active===false?'Reactivate':'Expire'}</button>`;
      if(!inUse) actions += ` <button class="btn-icon" data-remove-code="${i}" title="Delete">${ICONS.trash}</button>`;
    }
    return `<tr>
      <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.color};margin-right:8px;"></span>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
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
  document.getElementById('btnAddCode').addEventListener('click', ()=>{
    const code = document.getElementById('newCodeAbbrev').value.trim().toUpperCase();
    const name = document.getElementById('newCodeName').value.trim();
    if(!code || !name){ toast("Enter both a code and what it stands for.", true); return; }
    if(!/^[A-Z0-9]{2,6}$/.test(code)){ toast("Codes should be 2-6 letters or numbers.", true); return; }
    if(list.some(c=>c.code===code)){ toast(`"${code}" already exists.`, true); return; }
    const palette = ['#8A94A6','#14B8A6','#D8AA50','#EC4899','#F97316','#0EA5E9','#A855F7','#22C55E','#EAB308','#EF4444'];
    const color = palette[list.length % palette.length];
    list.push({code, name, color, active:true});
    logActivity(`Added time off code "${code} \u2014 ${name}".`, "admin");
    persist();
    toast("Code added.");
    renderExceptionCodesTab(body);
  });
  body.querySelectorAll('[data-toggle-code]').forEach(b=>b.addEventListener('click', ()=>{
    const item = list[Number(b.dataset.toggleCode)];
    item.active = item.active===false ? true : false;
    logActivity(`${item.active?'Reactivated':'Expired'} time off code "${item.code}".`, "admin");
    persist();
    renderExceptionCodesTab(body);
  }));
  body.querySelectorAll('[data-remove-code]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeCode); const item = list[idx];
    if(usageCount(item.code)>0){ toast(`Can't remove "${item.code}" \u2014 it's in use.`, true); return; }
    if(!confirm(`Delete the "${item.code}" code entirely? This can't be undone.`)) return;
    list.splice(idx,1);
    logActivity(`Deleted time off code "${item.code}".`, "admin");
    persist();
    renderExceptionCodesTab(body);
  }));
}

function renderSimpleListTab(body, key){
  const cfg = SIMPLE_LIST_TABS[key];
  const list = STATE.pm.refData[key];
  const rows = list.map((v,i)=>{
    const inUse = cfg.usageCheck(v);
    return `<tr><td>${escapeHtml(v)}</td><td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item="${i}">${ICONS.trash}</button></td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputPm" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/,'')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemPm">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddItemPm').addEventListener('click', ()=>{
    const val = document.getElementById('newItemInputPm').value.trim();
    if(!val){ toast("Enter a value first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-item]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeItem); const val = list[idx];
    if(cfg.usageCheck(val)>0){ toast(`Can't remove "${val}" \u2014 it's in use.`, true); return; }
    if(!confirm(`Remove "${val}"?`)) return;
    list.splice(idx,1);
    logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

// A single, agency-configurable policy number rather than a hardcoded rule -- how many combined
// on-duty + extra-duty hours in one day trips the fatigue flag on an Extra Duty signup. Different
// agencies (and different union contracts) set this differently, so it has to be an admin setting,
// not a constant buried in the code.
function renderPersonnelSettingsTab(body){
  const settings=STATE.pm.personnelSettings||(STATE.pm.personnelSettings={authorizedStaffingEnabled:false,authorizedPositionsByUnit:{}});
  const counts={}; STATE.pm.records.filter(r=>r.employmentStatus==='Active').forEach(r=>{if(r.unitId)counts[r.unitId]=(counts[r.unitId]||0)+1;});
  body.innerHTML=`
    <div class="panel"><div class="panel-head"><h2>Authorized Staffing Tracking</h2></div><div class="panel-body">
      <label style="display:flex;gap:10px;align-items:center;font-weight:700;margin-bottom:8px;"><input type="checkbox" id="fAuthorizedStaffingEnabled" ${settings.authorizedStaffingEnabled?'checked':''}> Enable authorized staffing tracking</label>
      <p style="font-size:12.5px;color:var(--text-dim);max-width:760px;">When enabled, each unit can optionally have an authorized staffing number. SonoMarzi compares active personnel assignments with that number to show vacancies, fully staffed units, and units over authorized strength. Units without a number remain Not Set.</p>
      <div id="authorizedUnitSettings" style="${settings.authorizedStaffingEnabled?'':'display:none;'};margin-top:18px;">
        <table><thead><tr><th>Unit</th><th>Assigned</th><th>Authorized Positions</th><th>Status</th></tr></thead><tbody>
          ${STATE.pm.refData.units.map(unit=>{const auth=settings.authorizedPositionsByUnit[unit],assigned=counts[unit]||0,status=auth==null||auth===''?'Not Set':assigned<Number(auth)?(Number(auth)-assigned)+' Vacant':assigned>Number(auth)?'+'+(assigned-Number(auth))+' Over':'Fully Staffed';return `<tr><td>${escapeHtml(unit)}</td><td>${assigned}</td><td><input type="number" min="0" step="1" data-auth-unit="${escapeHtml(unit)}" value="${auth==null?'':auth}" placeholder="Optional" style="width:130px;"></td><td>${status}</td></tr>`;}).join('')}
        </tbody></table>
      </div>
      <button class="btn btn-primary btn-sm" id="btnSavePersonnelSettings" style="margin-top:16px;">Save Personnel Settings</button>
    </div></div>`;
  const toggle=body.querySelector('#fAuthorizedStaffingEnabled'); toggle.onchange=()=>{body.querySelector('#authorizedUnitSettings').style.display=toggle.checked?'':'none';};
  body.querySelector('#btnSavePersonnelSettings').onclick=()=>{
    settings.authorizedStaffingEnabled=toggle.checked;
    const next={}; body.querySelectorAll('[data-auth-unit]').forEach(inp=>{if(inp.value!=='')next[inp.dataset.authUnit]=Math.max(0,Math.floor(Number(inp.value)||0));});
    settings.authorizedPositionsByUnit=next; logActivity(`${settings.authorizedStaffingEnabled?'Enabled':'Disabled'} authorized staffing tracking.`,'admin'); persist(); toast('Personnel settings saved.'); renderAdminTabBody();
  };
}

function renderSchedulingSettingsTab(body){
  if(!isGlobalScheduleAdmin()){body.innerHTML=lockedNote('An agency or platform administrator manages agency-wide scheduling settings.');return;}
  const settings = STATE.pm.schedulingSettings || (STATE.pm.schedulingSettings = { fatigueThresholdHours: 16 });
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
  document.getElementById('btnSaveSchedulingSettings').addEventListener('click', ()=>{
    const val = Number(document.getElementById('fFatigueThreshold').value);
    if(!val || val<=0){ toast("Enter a positive number of hours.", true); return; }
    settings.fatigueThresholdHours = val;
    logActivity(`Set the fatigue threshold to ${val} combined hours per day.`, "admin");
    persist();
    toast("Scheduling settings saved.");
  });
}
function renderNotificationRoutingTab(body){
  const roleOpts = (sel)=>STATE.roles.map(r=>`<option value="${r.id}" ${sel===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
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
  document.getElementById('btnSaveRoutingPm').addEventListener('click', ()=>{
    STATE.pm.notifySettings.disciplinaryExpiringRoleId = document.getElementById('fRoutePmDisc').value;
    STATE.pm.notifySettings.trainingExpiringRoleId = document.getElementById('fRoutePmTrain').value;
    STATE.pm.notifySettings.medicalDueRoleId = document.getElementById('fRoutePmMed').value;
    logActivity("Updated notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

/* =========================================================================
   MODULE ENTRY POINT
   ========================================================================= */
function schedulingModuleAccess(){
  return SCHED_TABS.some(tab=>(Array.isArray(tab.ability)?tab.ability:[tab.ability]).some(can));
}
function schedulingTabVisible(tab){
  return (Array.isArray(tab.ability)?tab.ability:[tab.ability]).some(can);
}
function renderSchedulingDashboard(){
  const root=document.getElementById('view-sched-dashboard');
  const tabs=SCHED_TABS.filter(schedulingTabVisible);
  root.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">${tabs.map(tab=>`<button type="button" class="panel" data-schedule-area="${tab.key}" style="padding:22px;text-align:left;cursor:pointer;color:var(--heading);font:inherit"><div style="width:30px;height:30px;color:var(--blue);margin-bottom:12px">${ICONS.calendar}</div><strong>${escapeHtml(tab.label)}</strong><div style="font-size:12px;color:var(--text-dim);margin-top:10px">Open ${escapeHtml(tab.label.toLowerCase())}</div></button>`).join('')}${can('pm_admin_categories')&&isGlobalScheduleAdmin()?'<button type="button" class="panel" id="scheduleAdmin" style="padding:22px;text-align:left;cursor:pointer;color:var(--heading);font:inherit"><strong>Administration</strong><div style="font-size:12px;color:var(--text-dim);margin-top:10px">Time off codes and scheduling settings</div></button>':''}</div>`;
  root.querySelectorAll('[data-schedule-area]').forEach(button=>button.onclick=()=>{SCHED_SUBTAB=button.dataset.scheduleArea;switchView('pm-scheduling');});
  root.querySelector('#scheduleAdmin')?.addEventListener('click',()=>switchView('sched-settings'));
}
function renderSchedulingAdministration(){
  const root=document.getElementById('view-sched-settings');
  if(!isGlobalScheduleAdmin()||!can('pm_admin_categories')){root.innerHTML=lockedNote('An agency or platform administrator manages scheduling configuration.');return;}
  root.innerHTML='<div class="toolbar"><button type="button" class="btn btn-outline" id="scheduleSettings">Scheduling Settings</button><button type="button" class="btn btn-outline" id="scheduleCodes">Time Off Codes</button></div><div id="scheduleAdminBody"></div>';
  const body=root.querySelector('#scheduleAdminBody');
  root.querySelector('#scheduleSettings').onclick=()=>renderSchedulingSettingsTab(body);
  root.querySelector('#scheduleCodes').onclick=()=>renderExceptionCodesTab(body);
  renderSchedulingSettingsTab(body);
}
function startPmModule(){
  renderNav();
  switchView('pm-dashboard');
}
window.SCHEDULING = {start:()=>switchView('pm-scheduling'),NAV_ITEMS:SCHEDULING_NAV_ITEMS,switchView,refresh:()=>renderView(ACTIVE_VIEW),hasAccess:schedulingModuleAccess};
window.PM = { start: startPmModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openRecordDetail, openSessionDetailModal, openCheckinFlow, renderCalendarSub, readinessCoverageGaps: (days=7)=>computeCoverageGaps(days).filter(g=>canViewScheduleShift(g.shift)) };

})();


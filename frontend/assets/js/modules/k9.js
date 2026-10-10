/* =========================================================================
   K9 MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.k9 and shared roles/personnel)
   ========================================================================= */
(function(){

const BREEDS = ["German Shepherd","Belgian Malinois","Dutch Shepherd","Labrador Retriever","Bloodhound","German Shorthaired Pointer","Springer Spaniel"];
const SKILLS_CATALOG_K9 = ["Patrol / Apprehension","Narcotics Detection","Explosives Detection","Tracking / Trailing","Article Search",
  "Search and Rescue (Area Search)","Human Remains Detection","Accelerant Detection","Electronics Detection","Cadaver Recovery","Agility / Obedience"];
const CERT_TYPES = ["Patrol","Patrol 2","Narcotics Detection","Explosives Detection","Tracking / Trailing","Search and Rescue Area Search",
  "Human Remains Detection","Accelerant Detection","Electronics Detection","Obedience / Courage"];
const CERTIFYING_BODIES = ["USPCA (United States Police Canine Association)","NPCA (National Police Canine Association)",
  "NAPWDA (North American Police Work Dog Association)","Agency Master Trainer","State POST","Other Accredited Trainer"];
const DEPLOYMENT_TYPES = ["Patrol Check","Article Search","Area Search","Building Search","Tracking / Trailing","Narcotics Sniff",
  "Explosives Sniff","Apprehension","Vehicle Sniff","Public Demonstration","Mutual Aid Assist","Training Deployment","Other"];
const DEPLOYMENT_OUTCOMES = ["Find","No Find","Apprehension - No Bite","Apprehension - Bite","Deployed - No Use","Assist Only","Demonstration Complete","Other"];
const TRAINING_TYPES = ["Patrol / Obedience","Narcotics Detection","Explosives Detection","Tracking / Trailing","Agility",
  "Multi-Discipline","Recertification Prep","Scenario-Based","Handler-Only (No K9)"];
const TRAINING_PROVIDERS_K9 = ["In-House K9 Training Cadre","USPCA Regional Training","NPCA Certified Trainer",
  "NAPWDA Regional Trainer","Vendor: Sierra Tactical K9","Vendor: Apex Detection K9","State POST Academy"];
const INCIDENT_TYPES = ["Bite","Injury to K9","Injury to Officer","Injury to Third Party","Property Damage","Use of Force Review","Equipment Failure","Complaint","Other"];
const K9_STATUSES = ["Active","Light Duty","In Training","Retired","Deceased"];
const RETIREMENT_DISPOSITIONS = ["Retained by Handler","Retained by Agency","Adopted - Other Family","Deceased in Service","N/A"];

function defaultRefDataK9(){
  return {
    breeds: [...BREEDS], skillsCatalog: [...SKILLS_CATALOG_K9], certTypes: [...CERT_TYPES],
    certifyingBodies: [...CERTIFYING_BODIES], deploymentTypes: [...DEPLOYMENT_TYPES], deploymentOutcomes: [...DEPLOYMENT_OUTCOMES],
    trainingTypes: [...TRAINING_TYPES], trainingProviders: [...TRAINING_PROVIDERS_K9], incidentTypes: [...INCIDENT_TYPES],
    statuses: [...K9_STATUSES], retirementDispositions: [...RETIREMENT_DISPOSITIONS],
  };
}
const MONTHLY_TRAINING_HOURS_STANDARD = 16; // USPCA / NPCA / NAPWDA industry maintenance-training standard

/* Illustrated placeholder avatars (original, breed-colored line art - not photos) so the
   roster doesn't show a generic paw-print icon for every dog. */
const AVATAR_DOGS = {
  gsd: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRDhDREJBIi8+CiAgICAKICAgICAgICA8cGF0aCBkPSJNMjIsMzggTDE0LDEwIEwzOCwzMCBaIiBmaWxsPSIjMUMxNzEyIi8+CiAgICAgICAgPHBhdGggZD0iTTc4LDM4IEw4NiwxMCBMNjIsMzAgWiIgZmlsbD0iIzFDMTcxMiIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNTUiIHJ4PSIzMCIgcnk9IjI3IiBmaWxsPSIjQzY5QTVBIi8+CiAgICAKICAgIDxlbGxpcHNlIGN4PSI1MCIgY3k9IjQ2IiByeD0iMTkiIHJ5PSIxNSIgZmlsbD0iIzI0MWQxOCIgb3BhY2l0eT0iMC44NSIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNjYiIHJ4PSIxNSIgcnk9IjEyIiBmaWxsPSIjMkEyMTFBIi8+CiAgICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjQ4IiByPSIzLjIiIGZpbGw9IiMyNDFkMTgiLz4KICAgIDxjaXJjbGUgY3g9IjU5IiBjeT0iNDgiIHI9IjMuMiIgZmlsbD0iIzI0MWQxOCIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNzAiIHJ4PSI0IiByeT0iMyIgZmlsbD0iIzI0MWQxOCIvPgogICAgPHBhdGggZD0iTTQyLDc2IFE1MCw4MiA1OCw3NiIgc3Ryb2tlPSIjMjQxZDE4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvc3ZnPg==",
  malinois: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTREM0I4Ii8+CiAgICAKICAgICAgICA8cGF0aCBkPSJNMjIsMzggTDE0LDEwIEwzOCwzMCBaIiBmaWxsPSIjMjQxYTEyIi8+CiAgICAgICAgPHBhdGggZD0iTTc4LDM4IEw4NiwxMCBMNjIsMzAgWiIgZmlsbD0iIzI0MWExMiIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNTUiIHJ4PSIzMCIgcnk9IjI3IiBmaWxsPSIjQjU3MTNBIi8+CiAgICAKICAgIDxlbGxpcHNlIGN4PSI1MCIgY3k9IjQ2IiByeD0iMTkiIHJ5PSIxNSIgZmlsbD0iIzJjMWYxNiIgb3BhY2l0eT0iMC44NSIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNjYiIHJ4PSIxNSIgcnk9IjEyIiBmaWxsPSIjMjQxYTEyIi8+CiAgICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjQ4IiByPSIzLjIiIGZpbGw9IiMyNDFkMTgiLz4KICAgIDxjaXJjbGUgY3g9IjU5IiBjeT0iNDgiIHI9IjMuMiIgZmlsbD0iIzI0MWQxOCIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNzAiIHJ4PSI0IiByeT0iMyIgZmlsbD0iIzI0MWQxOCIvPgogICAgPHBhdGggZD0iTTQyLDc2IFE1MCw4MiA1OCw3NiIgc3Ryb2tlPSIjMjQxZDE4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvc3ZnPg==",
  dutch: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRENENkM4Ii8+CiAgICAKICAgICAgICA8cGF0aCBkPSJNMjIsMzggTDE0LDEwIEwzOCwzMCBaIiBmaWxsPSIjM2EyZjIyIi8+CiAgICAgICAgPHBhdGggZD0iTTc4LDM4IEw4NiwxMCBMNjIsMzAgWiIgZmlsbD0iIzNhMmYyMiIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNTUiIHJ4PSIzMCIgcnk9IjI3IiBmaWxsPSIjOEM3MjU2Ii8+CiAgICA8cGF0aCBkPSJNMjgsMjggcTYsMTAgLTIsMjAiIHN0cm9rZT0iIzJiMjQxZiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik0zNiwzNCBxNiwxMCAtMiwyMCIgc3Ryb2tlPSIjMmIyNDFmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTQ0LDQwIHE2LDEwIC0yLDIwIiBzdHJva2U9IiMyYjI0MWYiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cGF0aCBkPSJNNTIsMjggcTYsMTAgLTIsMjAiIHN0cm9rZT0iIzJiMjQxZiIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwYXRoIGQ9Ik02MCwzNCBxNiwxMCAtMiwyMCIgc3Ryb2tlPSIjMmIyNDFmIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiIG9wYWNpdHk9IjAuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTY4LDQwIHE2LDEwIC0yLDIwIiBzdHJva2U9IiMyYjI0MWYiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIAogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNjYiIHJ4PSIxNSIgcnk9IjEyIiBmaWxsPSIjM2EyZjIyIi8+CiAgICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjQ4IiByPSIzLjIiIGZpbGw9IiMyNDFkMTgiLz4KICAgIDxjaXJjbGUgY3g9IjU5IiBjeT0iNDgiIHI9IjMuMiIgZmlsbD0iIzI0MWQxOCIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNzAiIHJ4PSI0IiByeT0iMyIgZmlsbD0iIzI0MWQxOCIvPgogICAgPHBhdGggZD0iTTQyLDc2IFE1MCw4MiA1OCw3NiIgc3Ryb2tlPSIjMjQxZDE4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvc3ZnPg==",
  lab: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRjBFNkM4Ii8+CiAgICAKICAgICAgICA8ZWxsaXBzZSBjeD0iMjQiIGN5PSI0MiIgcng9IjExIiByeT0iMTgiIGZpbGw9IiNEMUEyM0EiIHRyYW5zZm9ybT0icm90YXRlKC0xOCAyNCA0MikiLz4KICAgICAgICA8ZWxsaXBzZSBjeD0iNzYiIGN5PSI0MiIgcng9IjExIiByeT0iMTgiIGZpbGw9IiNEMUEyM0EiIHRyYW5zZm9ybT0icm90YXRlKDE4IDc2IDQyKSIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNTUiIHJ4PSIzMCIgcnk9IjI3IiBmaWxsPSIjRTRCODRBIi8+CiAgICAKICAgIAogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNjYiIHJ4PSIxNSIgcnk9IjEyIiBmaWxsPSIjOGE1YTJhIi8+CiAgICA8Y2lyY2xlIGN4PSI0MSIgY3k9IjQ4IiByPSIzLjIiIGZpbGw9IiMyNDFkMTgiLz4KICAgIDxjaXJjbGUgY3g9IjU5IiBjeT0iNDgiIHI9IjMuMiIgZmlsbD0iIzI0MWQxOCIvPgogICAgPGVsbGlwc2UgY3g9IjUwIiBjeT0iNzAiIHJ4PSI0IiByeT0iMyIgZmlsbD0iIzI0MWQxOCIvPgogICAgPHBhdGggZD0iTTQyLDc2IFE1MCw4MiA1OCw3NiIgc3Ryb2tlPSIjMjQxZDE4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwvc3ZnPg==",
};


/* =========================================================================
   SEED DATA
   ========================================================================= */
function emptyMedicalK9(){ return { weight:"", vetClinic:"", vetPhone:"", allergies:"", medications:[], vaccinations:[], vetVisits:[], injuries:[] }; }

function breedAvatarKey(breed){
  return {"German Shepherd":"gsd","Belgian Malinois":"malinois","Dutch Shepherd":"dutch","Labrador Retriever":"lab"}[breed] || null;
}
function seedK9s(){
  const today = new Date();
  const defs = [
    ["k9_1","Rex","German Shepherd","Male","2019-03-14","p2",["Patrol / Apprehension","Narcotics Detection"],"K9-01","Active","K-501"],
    ["k9_2","Bolt","Belgian Malinois","Male","2020-06-02","p6",["Patrol / Apprehension","Explosives Detection"],"K9-02","Active","K-502"],
    ["k9_3","Luna","Dutch Shepherd","Female","2018-11-20","p4",["Narcotics Detection","Article Search"],"K9-03","Active","K-503"],
    ["k9_4","Diesel","Belgian Malinois","Male","2021-01-08","p3",["Patrol / Apprehension","Tracking / Trailing"],"K9-04","Active","K-504"],
    ["k9_5","Nova","Labrador Retriever","Female","2017-05-30","p5",["Explosives Detection","Electronics Detection"],"K9-05","Light Duty","K-505"],
    ["k9_6","Gunner","German Shepherd","Male","2015-02-17","p1",["Patrol / Apprehension","Tracking / Trailing"],"K9-06","Retired","K-506"],
  ];
  return defs.map(([id,name,breed,sex,dob,handlerId,skills,tag,status,gpsCollarId])=>{
    const avatarKey = breedAvatarKey(breed);
    const rec = {
      id, name, photoDataUrl: avatarKey ? AVATAR_DOGS[avatarKey] : null, breed, sex, dob, dateAcquired: fmt(addDays(new Date(dob), 500)),
      handlerId, backupHandlerId:null, agency:"Reno PD - Patrol Division", unit:"K9 Unit", tagId:tag,
      status, skills, vendor:"Vetted Working Dogs LLC", microchipNumber:"985"+Math.floor(100000000+Math.random()*899999999),
      medical: emptyMedicalK9(), equipment:["Patrol Harness","Bite Sleeve","Tracking Lead","Water/Bowl Kit"],
      retirementDate: status==="Retired" ? fmt(addDays(today,-90)) : null,
      retirementDisposition: status==="Retired" ? "Retained by Handler" : "N/A",
      deceasedDate: null, gpsCollarId,
      lastKnownLocation: { lat: 39.5296 + (Math.random()-0.5)*0.08, lng: -119.8138 + (Math.random()-0.5)*0.08, timestamp: new Date().toISOString(), address: "Patrol Zone " + (Math.floor(Math.random()*4)+1) },
      locationHistory: [], notes:"", fieldHistory:[],
    };
    for(let i=0;i<6;i++){
      rec.locationHistory.push({ lat: 39.5296 + (Math.random()-0.5)*0.08, lng: -119.8138 + (Math.random()-0.5)*0.08, timestamp: new Date(Date.now() - i*3600*1000).toISOString() });
    }
    return rec;
  });
}

function seedK9Medical(){
  const k9s = seedK9s();
  const today = new Date();
  const byId = id => k9s.find(k=>k.id===id);
  byId('k9_1').medical = { weight:"72 lbs", vetClinic:"Sierra Veterinary Hospital", vetPhone:"(775) 555-0110", allergies:"None known", medications:[],
    vaccinations:[
      {name:"Rabies", date: fmt(addDays(today,-200)), expirationDate: fmt(addDays(today,165)), notes:""},
      {name:"DHPP", date: fmt(addDays(today,-200)), expirationDate: fmt(addDays(today,165)), notes:""},
      {name:"Bordetella", date: fmt(addDays(today,-100)), expirationDate: fmt(addDays(today,-5)), notes:"Overdue for renewal"},
    ],
    vetVisits:[{date: fmt(addDays(today,-30)), reason:"Annual wellness exam", notes:"Clean bill of health.", cost:185}], injuries:[] };
  byId('k9_2').medical = { weight:"78 lbs", vetClinic:"Sierra Veterinary Hospital", vetPhone:"(775) 555-0110", allergies:"None known", medications:["Joint supplement (daily)"],
    vaccinations:[
      {name:"Rabies", date: fmt(addDays(today,-400)), expirationDate: fmt(addDays(today,-35)), notes:"Overdue"},
      {name:"DHPP", date: fmt(addDays(today,-100)), expirationDate: fmt(addDays(today,265)), notes:""},
    ],
    vetVisits:[{date: fmt(addDays(today,-60)), reason:"Limping - left rear leg", notes:"Mild strain, prescribed rest 2 weeks.", cost:340}],
    injuries:[{date: fmt(addDays(today,-60)), description:"Left rear leg strain during apprehension training.", notes:"Recovered fully after 2 weeks light duty."}] };
  byId('k9_3').medical = { weight:"55 lbs", vetClinic:"Truckee Meadows Animal Hospital", vetPhone:"(775) 555-0199", allergies:"Chicken-based treats", medications:[],
    vaccinations:[{name:"Rabies", date: fmt(addDays(today,-90)), expirationDate: fmt(addDays(today,275)), notes:""}], vetVisits:[], injuries:[] };
  byId('k9_4').medical = { weight:"70 lbs", vetClinic:"Sierra Veterinary Hospital", vetPhone:"(775) 555-0110", allergies:"None known", medications:[],
    vaccinations:[{name:"Rabies", date: fmt(addDays(today,-500)), expirationDate: fmt(addDays(today,-135)), notes:"Overdue"}], vetVisits:[], injuries:[] };
  byId('k9_5').medical = { weight:"64 lbs", vetClinic:"Truckee Meadows Animal Hospital", vetPhone:"(775) 555-0199", allergies:"None known", medications:["Hip/joint supplement"],
    vaccinations:[{name:"Rabies", date: fmt(addDays(today,-60)), expirationDate: fmt(addDays(today,305)), notes:""}],
    vetVisits:[{date: fmt(addDays(today,-10)), reason:"Hip evaluation - approaching retirement age", notes:"Mild hip dysplasia noted; recommend light duty.", cost:410}], injuries:[] };
  byId('k9_6').medical = { weight:"68 lbs", vetClinic:"Sierra Veterinary Hospital", vetPhone:"(775) 555-0110", allergies:"None known", medications:["Senior joint care (daily)"],
    vaccinations:[{name:"Rabies", date: fmt(addDays(today,-40)), expirationDate: fmt(addDays(today,325)), notes:""}], vetVisits:[], injuries:[] };
  return k9s;
}

function seedTrainingSessionsK9(){
  const today = new Date();
  const rows = [
    ["k9_1", -25, 4, "Patrol / Obedience", "In-House K9 Training Cadre", "Passed", "Weekly maintenance training - obedience and controlled aggression."],
    ["k9_1", -18, 4, "Narcotics Detection", "In-House K9 Training Cadre", "Passed", "Narcotics detection proficiency drills, 6 hides, 6/6 correct."],
    ["k9_1", -11, 4, "Patrol / Obedience", "In-House K9 Training Cadre", "Passed", "Bite work and recall drills."],
    ["k9_1", -4, 4, "Scenario-Based", "In-House K9 Training Cadre", "Passed", "Building search scenario, multi-room."],
    ["k9_2", -20, 8, "Multi-Discipline", "USPCA Regional Training", "Passed", "Regional 2-day multi-discipline training block."],
    ["k9_2", -6, 4, "Explosives Detection", "Vendor: Apex Detection K9", "Passed", "Explosives odor recognition refresher."],
    ["k9_3", -15, 4, "Narcotics Detection", "In-House K9 Training Cadre", "Passed", "Vehicle sniff proficiency, 4/4 correct."],
    ["k9_3", -8, 4, "Article Search", "In-House K9 Training Cadre", "Passed", "Article search in open field, 3 for 3."],
    ["k9_4", -30, 4, "Tracking / Trailing", "NAPWDA Regional Trainer", "Passed", "Urban trailing exercise, 45 min aged track."],
    ["k9_5", -14, 4, "Explosives Detection", "In-House K9 Training Cadre", "Passed", "Maintenance detection training, vehicle and package searches."],
    ["k9_6", -400, 4, "Patrol / Obedience", "In-House K9 Training Cadre", "Passed", "Final training session prior to retirement."],
  ];
  return rows.map(([k9Id,daysAgo,hours,type,provider,result,narrative],i)=>({
    id:"k9tr"+(i+1), k9Id, handlerId: seedK9s().find(k=>k.id===k9Id).handlerId,
    date: fmt(addDays(today,daysAgo)), hours, type, provider, location:"K9 Training Facility",
    instructor: provider==="In-House K9 Training Cadre" ? "Sgt. Maria Torres" : "External Instructor",
    passed: result==="Passed", narrative,
  }));
}

function seedCertificationsK9(){
  const today = new Date();
  const rows = [
    ["k9_1","Patrol","USPCA (United States Police Canine Association)", -300, 65, "Passed", "Passed all phases: obedience, agility, courage, apprehension."],
    ["k9_1","Narcotics Detection","NPCA (National Police Canine Association)", -280, 85, "Passed", "8 for 8 hides located within time limit."],
    ["k9_2","Patrol","USPCA (United States Police Canine Association)", -320, 61, "Passed", ""],
    ["k9_2","Explosives Detection","NAPWDA (North American Police Work Dog Association)", -40, -1, "Failed", "Missed 1 of 6 hides; remedial training scheduled, retest within 30 days."],
    ["k9_3","Narcotics Detection","NPCA (National Police Canine Association)", -310, 90, "Passed", ""],
    ["k9_4","Patrol","USPCA (United States Police Canine Association)", -290, 68, "Passed", ""],
    ["k9_4","Tracking / Trailing","Agency Master Trainer", -25, 45, "Passed", "Completed 1-mile aged trail with 2 turns and a cross-trail in under an hour."],
    ["k9_5","Explosives Detection","NAPWDA (North American Police Work Dog Association)", -330, 88, "Passed", ""],
    ["k9_6","Patrol","USPCA (United States Police Canine Association)", -700, 70, "Passed", "Last certification prior to retirement."],
  ];
  return rows.map(([k9Id,certType,body,daysAgo,score,result,notes],i)=>{
    const certDate = fmt(addDays(today,daysAgo));
    return {
      id:"k9cert"+(i+1), k9Id, certType, certifyingBody:body, certDate,
      expirationDate: result==="Passed" ? fmt(addDays(new Date(certDate), 365)) : null,
      certifyingOfficial: "Master Trainer J. Alvarez", passFail: result, score: score>=0?score:null, notes,
    };
  });
}

function seedDeploymentsK9(){
  const today = new Date();
  const rows = [
    ["k9_1","Building Search", -12, "445 Commerce St", "CAD-2026-08821", "Find", "Located suspect hiding in stockroom; taken into custody without incident.", false],
    ["k9_1","Narcotics Sniff", -9, "I-80 / Exit 14 traffic stop", "CAD-2026-08902", "Find", "Positive alert on vehicle; narcotics located in trunk compartment.", false],
    ["k9_1","Patrol Check", -3, "Downtown Reno", "CAD-2026-09015", "No Find", "Routine perimeter check, negative.", false],
    ["k9_2","Apprehension", -20, "1200 block of 4th St", "CAD-2026-08655", "Apprehension - Bite", "Suspect fled on foot; K9 deployed after verbal warnings, single bite to left forearm, suspect treated at scene and transported.", true],
    ["k9_2","Explosives Sniff", -5, "Reno-Tahoe Airport (mutual aid)", "CAD-2026-09040", "No Find", "Suspicious package swept, negative.", false],
    ["k9_3","Vehicle Sniff", -15, "Traffic stop, Virginia St", "CAD-2026-08770", "Find", "Positive alert; small quantity of narcotics recovered.", false],
    ["k9_3","Article Search", -7, "Idlewild Park", "CAD-2026-08988", "Find", "Located discarded firearm in search area.", false],
    ["k9_4","Tracking / Trailing", -18, "Residential burglary, Wells Ave", "CAD-2026-08699", "Apprehension - No Bite", "Tracked suspect scent 0.4 mi to nearby yard; suspect surrendered on K9 announcement.", false],
    ["k9_5","Public Demonstration", -25, "Reno Elementary School", "N/A", "Demonstration Complete", "Community outreach demonstration, no incidents.", false],
    ["k9_6","Patrol Check", -450, "Final patrol shift prior to retirement", "CAD-2025-07711", "No Find", "", false],
  ];
  return rows.map(([k9Id,type,daysAgo,location,cad,outcome,narrative,bite],i)=>({
    id:"dep"+(i+1), k9Id, handlerId: seedK9s().find(k=>k.id===k9Id).handlerId,
    date: fmt(addDays(today,daysAgo)), time:"14:30", type, location, callNumber:cad, outcome, narrative,
    biteOccurred: bite, subjectInjured: bite, duration: 25,
  }));
}

function seedIncidentsK9(){
  const today = new Date();
  return [
    {id:"k9inc1", k9Id:"k9_2", handlerId:"p6", date: fmt(addDays(today,-20)), type:"Bite", caseNumber:"IA-2026-0031",
      description:"K9 bite during apprehension of fleeing burglary suspect on 4th St. Suspect sustained puncture wounds to left forearm, treated and released.",
      outcome:"Within policy", reviewStatus:"Reviewed", reviewedBy:"Lt. Robert Hayes", reviewDate: fmt(addDays(today,-10)),
      subjectRace:"White", subjectSex:"Male", subjectAge:34},
    {id:"k9inc2", k9Id:"k9_2", handlerId:"p6", date: fmt(addDays(today,-60)), type:"Injury to K9", caseNumber:"N/A",
      description:"K9 sustained left rear leg strain during scheduled apprehension training exercise.",
      outcome:"Non-disciplinary - training injury", reviewStatus:"Cleared", reviewedBy:"Sgt. Maria Torres", reviewDate: fmt(addDays(today,-55)),
      subjectRace:null, subjectSex:null, subjectAge:null},
    {id:"k9inc3", k9Id:"k9_1", handlerId:"p2", date: fmt(addDays(today,-2)), type:"Complaint", caseNumber:"CC-2026-0061",
      description:"Citizen complaint alleging K9 was deployed unnecessarily during a low-level traffic stop.",
      outcome:"Under review", reviewStatus:"Pending", reviewedBy:"", reviewDate:null,
      subjectRace:null, subjectSex:null, subjectAge:null},
    {id:"k9inc4", k9Id:"k9_4", handlerId:"p3", date: fmt(addDays(today,-95)), type:"Bite", caseNumber:"IA-2025-0288",
      description:"K9 bite during tracking apprehension following residential burglary; suspect resisted commands to surrender.",
      outcome:"Within policy", reviewStatus:"Cleared", reviewedBy:"Lt. Robert Hayes", reviewDate: fmt(addDays(today,-85)),
      subjectRace:"Hispanic or Latino", subjectSex:"Male", subjectAge:22},
    {id:"k9inc5", k9Id:"k9_1", handlerId:"p2", date: fmt(addDays(today,-160)), type:"Bite", caseNumber:"IA-2025-0201",
      description:"K9 bite during building search after suspect failed to comply with K9 warning announcement.",
      outcome:"Within policy", reviewStatus:"Cleared", reviewedBy:"Sgt. Maria Torres", reviewDate: fmt(addDays(today,-150)),
      subjectRace:"Black or African American", subjectSex:"Male", subjectAge:29},
  ];
}

/* =========================================================================
   STATE LIFECYCLE
   ========================================================================= */
function buildData(){
  return {
    k9s: seedK9Medical(), // returns k9s array with medical attached
    trainingSessions: seedTrainingSessionsK9(),
    certifications: seedCertificationsK9(),
    deployments: seedDeploymentsK9(),
    incidents: seedIncidentsK9(),
    refData: defaultRefDataK9(),
    notifications: [],
    notifySettings: { certExpiringRoleId:"role_admin", vaccineDueRoleId:"role_admin", trainingComplianceRoleId:"role_admin", retirementRoleId:"role_admin" },
    activity: [],
    dashboardPrefs: {}, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
  };
}

function migrateData(){
  if(!STATE.k9.refData) STATE.k9.refData = defaultRefDataK9();
  if(!STATE.k9.notifications) STATE.k9.notifications = [];
  if(!STATE.k9.notifySettings) STATE.k9.notifySettings = { certExpiringRoleId: STATE.roles[0].id, vaccineDueRoleId: STATE.roles[0].id, trainingComplianceRoleId: STATE.roles[0].id, retirementRoleId: STATE.roles[0].id };
  if(!STATE.k9.incidents) STATE.k9.incidents = [];
  if(!STATE.k9.dashboardPrefs) STATE.k9.dashboardPrefs = {};
  STATE.k9.k9s.forEach(k=>{
    if(!k.medical) k.medical = emptyMedicalK9();
    if(!k.equipment) k.equipment = [];
    if(!k.fieldHistory) k.fieldHistory = [];
    if(!k.locationHistory) k.locationHistory = [];
    if(k.backupHandlerId===undefined) k.backupHandlerId = null;
    if(k.deceasedDate===undefined) k.deceasedDate = null;
  });
}

function logActivity(text, entityType, entityId){
  STATE.k9.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('K9', text, entityType);
}

function k9For(id){ return STATE.k9.k9s.find(k=>k.id===id); }
function recordFieldChangeK9(k9, field, oldVal, newVal){
  if(JSON.stringify(oldVal)===JSON.stringify(newVal)) return;
  k9.fieldHistory.push({
    date: fmt(new Date()), field, before: oldVal, after: newVal,
    changedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System',
  });
}
function recordK9Event(k9, label, summary){
  if(!k9) return;
  k9.fieldHistory = k9.fieldHistory || [];
  k9.fieldHistory.push({date:fmt(new Date()),field:label,before:null,after:summary,changedBy:(STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name||'System'});
}
function monthlyTrainingHours(k9Id, monthsBack){
  monthsBack = monthsBack||1;
  const cutoff = addDays(new Date(), -30*monthsBack);
  return STATE.k9.trainingSessions.filter(t=>t.k9Id===k9Id && new Date(t.date) >= cutoff).reduce((s,t)=>s+t.hours,0);
}

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  {id:"k9-dashboard", label:"Dashboard", icon:"dashboard", title:"Dashboard", sub:"K9 unit status at a glance", requiredAbility:null},
  {id:"k9-roster", label:"K9 Roster", icon:"pawprint", title:"K9 Roster", sub:"Every dog, handler, and profile in the unit", requiredAbility:"k9_roster_view"},
  {id:"k9-deployments", label:"Deployments", icon:"activity", title:"Deployments & Activity", sub:"The full activity log for every K9 team", requiredAbility:"k9_deployment_view"},
  {id:"k9-training", label:"Training", icon:"award", title:"Training", sub:"Sessions, hours, and maintenance-training compliance", requiredAbility:"k9_training_view"},
  {id:"k9-certifications", label:"Certifications", icon:"ribbon", title:"Certifications", sub:"Discipline certifications and recertification tracking", requiredAbility:"k9_certification_view"},
  {id:"k9-incidents", label:"Incidents", icon:"alert", title:"Incidents", sub:"Bites, injuries, and reviewable incidents", requiredAbility:"k9_incident_view"},
  {id:"k9-gps", label:"GPS Tracking", icon:"mappin", title:"GPS Tracking", sub:"Last known location and location history per K9", requiredAbility:"k9_gps_view", featureDisabled:true},
  {id:"k9-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Individual K9 activity reports and configurable analytics", requiredAbility:"k9_reports_view"},
  {id:"k9-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Reference data and the system audit log", requiredAbility:["k9_admin_categories","k9_admin_audit"]},
];
let ACTIVE_VIEW = "k9-dashboard";

function navItemVisible(item){
  if(!can('module_k9')) return false;
  if(!item) return false;
  if(item.featureDisabled) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}
function renderNav(){
  // K9 Management is dashboard-first. All section navigation lives on the dashboard hub.
  const nav = document.getElementById('navlist');
  nav.innerHTML = '';
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
  if(id!=="k9-dashboard"){
    const root=document.getElementById('view-'+id);
    if(root && !root.querySelector('[data-module-dashboard-back]')){
      const back=document.createElement('button');
      back.type='button'; back.className='btn btn-outline'; back.dataset.moduleDashboardBack='1';
      back.innerHTML='&#8592; Back to Dashboard'; back.style.marginBottom='16px';
      back.addEventListener('click',()=>switchView('k9-dashboard'));
      root.prepend(back);
    }
  }
}
function renderView(id){
  if(id==="k9-dashboard") renderDashboard();
  else if(id==="k9-roster") renderRoster();
  else if(id==="k9-deployments") renderDeployments();
  else if(id==="k9-training") renderTraining();
  else if(id==="k9-certifications") renderCertifications();
  else if(id==="k9-incidents") renderIncidents();
  else if(id==="k9-gps") renderGps();
  else if(id==="k9-reports") renderReports();
  else if(id==="k9-admin") renderAdmin();
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  STATE.k9.k9s.filter(k=>k.status!=="Retired" && k.status!=="Deceased").forEach(k=>{
    (k.medical.vaccinations||[]).forEach(v=>{
      if(v.expirationDate){
        const days = daysBetween(fmt(today), v.expirationDate);
        if(days<=30) upcoming.push({type:"vaccine_due", entityId:k.id, message:`${k.name}'s ${v.name} vaccination ${days<0?'expired '+Math.abs(days)+' days ago':'is due in '+days+' days'} (${v.expirationDate}).`, recipientRoleId: STATE.k9.notifySettings.vaccineDueRoleId});
      }
    });
    const hrs = monthlyTrainingHours(k.id, 1);
    if(hrs < MONTHLY_TRAINING_HOURS_STANDARD){
      upcoming.push({type:"training_compliance", entityId:k.id, message:`${k.name} has logged ${hrs} of ${MONTHLY_TRAINING_HOURS_STANDARD} required maintenance-training hours in the last 30 days.`, recipientRoleId: STATE.k9.notifySettings.trainingComplianceRoleId});
    }
  });
  STATE.k9.certifications.forEach(c=>{
    if(c.expirationDate){
      const days = daysBetween(fmt(today), c.expirationDate);
      if(days<=45){
        const k = k9For(c.k9Id);
        if(k) upcoming.push({type:"cert_expiring", entityId:c.id, message:`${k.name}'s ${c.certType} certification ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'} (${c.expirationDate}).`, recipientRoleId: STATE.k9.notifySettings.certExpiringRoleId});
      }
    }
  });
  const prevReadBy = {};
  STATE.k9.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.k9.notifications = upcoming.map(n=>({
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
function statusBadgeClassK9(status){
  return {
    "Active":"badge-available","Light Duty":"badge-assigned","In Training":"badge-role","Retired":"badge-retired","Deceased":"badge-missing",
    "Passed":"badge-available","Failed":"badge-missing","Pending":"badge-assigned","Reviewed":"badge-available","Cleared":"badge-available",
    "Sustained":"badge-missing","Under review":"badge-assigned","Within policy":"badge-available",
  }[status] || "badge-role";
}
function k9Link(k9Id){
  const k = k9For(k9Id);
  return `<a href="#" data-open-k9="${k9Id}" class="record-link">${escapeHtml(k?k.name:'Unknown')}</a>`;
}
function wireK9Links(){
  document.querySelectorAll('[data-open-k9]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openK9Detail(a.dataset.openK9); }));
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
let CHART_REFS_K9 = {};
function destroyChartsK9(){ Object.values(CHART_REFS_K9).forEach(c=>c && c.destroy()); CHART_REFS_K9 = {}; }

const TOP_WIDGETS = [
  {id:"stat_active_k9s", label:"Active K9s"},
  {id:"stat_certs_expiring", label:"Certifications Expiring"},
  {id:"stat_below_compliance", label:"Below Training Compliance"},
  {id:"stat_open_incidents", label:"Open Incident Reviews"},
];
const EXTRA_WIDGETS = [
  {id:"list_training_compliance", label:"Monthly Maintenance-Training Compliance", defaultSize:"full"},
  {id:"chart_deployments_by_type", label:"Deployments by Type", defaultSize:"half"},
  {id:"list_recent_incidents", label:"Recent Incidents", defaultSize:"half"},
];
const DEFAULT_EXTRAS = EXTRA_WIDGETS.map(w=>({id:w.id, size:w.defaultSize}));
function myWidgetPrefs(){
  let p = STATE.k9.dashboardPrefs[CURRENT_USER_ID];
  const topIds = TOP_WIDGETS.map(w=>w.id), extraIds = EXTRA_WIDGETS.map(w=>w.id);
  if(!p || (!p.topOrder && !p.extras)){
    p = { topOrder:[...topIds], extras: DEFAULT_EXTRAS.map(e=>({...e})) };
    STATE.k9.dashboardPrefs[CURRENT_USER_ID] = p;
  }
  if(!Array.isArray(p.topOrder)) p.topOrder = [...topIds];
  if(!Array.isArray(p.extras)) p.extras = [];
  p.topOrder = [...p.topOrder.filter(id=>topIds.includes(id)), ...topIds.filter(id=>!p.topOrder.includes(id))];
  p.extras = p.extras.filter(e=>e && extraIds.includes(e.id));
  return p;
}
function renderWidget(id){
  if(id==='stat_active_k9s'){
    const active = STATE.k9.k9s.filter(k=>k.status==="Active").length;
    const lightDuty = STATE.k9.k9s.filter(k=>k.status==="Light Duty").length;
    const retired = STATE.k9.k9s.filter(k=>k.status==="Retired").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="k9-roster"><div class="label">${ICONS.pawprint} <span>Active K9s</span></div><div class="value">${active}</div><div class="delta neutral">${lightDuty} light duty &bull; ${retired} retired</div></button>`;
  }
  if(id==='stat_certs_expiring'){
    const certsExpiring = STATE.k9.notifications.filter(n=>n.type==="cert_expiring").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="k9-certifications"><div class="label">${ICONS.ribbon} <span>Certifications Expiring</span></div><div class="value" style="color:${certsExpiring?'var(--red)':'var(--heading)'}">${certsExpiring}</div><div class="delta ${certsExpiring?'warn':'ok'}">Within 45 days</div></button>`;
  }
  if(id==='stat_below_compliance'){
    const belowCompliance = STATE.k9.notifications.filter(n=>n.type==="training_compliance").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="k9-training"><div class="label">${ICONS.award} <span>Below Training Compliance</span></div><div class="value" style="color:${belowCompliance?'var(--red)':'var(--heading)'}">${belowCompliance}</div><div class="delta ${belowCompliance?'warn':'ok'}">${MONTHLY_TRAINING_HOURS_STANDARD}hrs/mo standard</div></button>`;
  }
  if(id==='stat_open_incidents'){
    const openIncidents = STATE.k9.incidents.filter(i=>i.reviewStatus==="Pending").length;
    const last30Deployments = STATE.k9.deployments.filter(d=>daysBetween(d.date, fmt(new Date()))<=30).length;
    return `<button class="stat-card dash-clickable" data-nav-dest="k9-incidents"><div class="label">${ICONS.alert} <span>Open Incident Reviews</span></div><div class="value" style="color:${openIncidents?'var(--red)':'var(--heading)'}">${openIncidents}</div><div class="delta neutral">${last30Deployments} deployments (30d)</div></button>`;
  }
  if(id==='list_training_compliance'){
    const complianceRows = STATE.k9.k9s.filter(k=>k.status!=="Retired" && k.status!=="Deceased").map(k=>{
      const hrs = monthlyTrainingHours(k.id,1);
      const pct = Math.min(100, Math.round((hrs/MONTHLY_TRAINING_HOURS_STANDARD)*100));
      return {k, hrs, pct};
    });
    const rows = complianceRows.map(({k,hrs,pct})=>`<tr><td>${k9Link(k.id)}</td><td>${escapeHtml(personName(k.handlerId))}</td><td>${hrs} / ${MONTHLY_TRAINING_HOURS_STANDARD}</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;max-width:140px;"><div style="width:${pct}%;height:100%;background:${pct>=100?'var(--green)':(pct>=50?'var(--gold)':'var(--red)')};"></div></div><span style="font-size:11.5px;color:var(--text-dim);">${pct}%</span></div></td></tr>`).join('');
    return `<div class="panel"><div class="panel-head"><h2>Monthly Maintenance-Training Compliance</h2><span class="hint">USPCA / NPCA / NAPWDA standard: ${MONTHLY_TRAINING_HOURS_STANDARD} hrs / month per team</span></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>K9</th><th>Handler</th><th>Hours (30d)</th><th>Compliance</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  if(id==='chart_deployments_by_type'){
    return `<div class="panel"><div class="panel-head"><h2>Deployments by Type</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartDeployType"></canvas></div></div></div>`;
  }
  if(id==='list_recent_incidents'){
    const rows = STATE.k9.incidents.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(i=>`<tr><td>${k9Link(i.k9Id)}</td><td>${escapeHtml(i.type)}</td><td>${i.date}</td><td><span class="badge ${statusBadgeClassK9(i.reviewStatus)}">${i.reviewStatus}</span></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No incidents on file.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Recent Incidents</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>K9</th><th>Type</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
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
    logActivity(`Customized personal K9 dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
    persist();
    toast("Dashboard saved.");
    closeModal();
    renderDashboard();
  };
}
function renderDashboard(){
  recalcNotifications();
  const prefs = myWidgetPrefs();
  const root = document.getElementById('view-k9-dashboard');
  const dashboardDestinations = NAV_ITEMS.filter(item=>item.id!=='k9-dashboard' && navItemVisible(item));
  const hubColors=['#4D8DFF','#43D59B','#B47CFF','#FF9F43','#FF6678','#41C7C7','#63A7FF','#8A9DB8'];
  root.innerHTML = `
    <style>
      #view-k9-dashboard .k9-hub-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;margin-bottom:20px}
      #view-k9-dashboard .k9-hub-card{grid-column:span 3;min-height:145px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--panel);text-align:left;color:inherit;font-family:inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease,box-shadow .15s ease}
      #view-k9-dashboard .k9-hub-card:hover{transform:translateY(-2px);border-color:var(--blue);background:var(--lightgray);box-shadow:0 10px 28px rgba(0,0,0,.16)}
      #view-k9-dashboard .k9-hub-icon{width:30px;height:30px;margin-bottom:13px;filter:drop-shadow(0 0 8px currentColor)}
      #view-k9-dashboard .k9-hub-title{font-size:16px;font-weight:800;color:var(--heading);margin-bottom:7px}
      #view-k9-dashboard .k9-hub-sub{font-size:12.5px;line-height:1.45;color:var(--text-dim)}
      #view-k9-dashboard .stat-card .label svg{width:18px;height:18px;vertical-align:middle;margin-right:6px}
      @media(max-width:1100px){#view-k9-dashboard .k9-hub-card{grid-column:span 6}}
      @media(max-width:700px){#view-k9-dashboard .k9-hub-card{grid-column:1/-1}}
    </style>
    <div class="k9-hub-grid">
      ${dashboardDestinations.map((item,index)=>`<button class="k9-hub-card" data-nav-dest="${item.id}"><div class="k9-hub-icon" style="color:${hubColors[index%hubColors.length]};">${ICONS[item.icon]||ICONS.pawprint}</div><div class="k9-hub-title">${escapeHtml(item.label)}</div><div class="k9-hub-sub">${escapeHtml(item.sub)}</div></button>`).join('')}
    </div>
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Drag the handle on any card to rearrange it. This layout is saved to your account only.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout||""} Add / Remove Widgets</button>
    </div>
    <div class="stat-grid" id="dashTopZone">
      ${prefs.topOrder.map(id=>renderTopWidget(id)).join('')}
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">
      ${prefs.extras.map(e=>renderExtraWidget(e.id,e.size)).join('')}
    </div>
  `;
  // Show operational metrics and analytics before module navigation.
  const navHub=root.querySelector('.k9-hub-grid');
  if(navHub)root.append(navHub);
  root.querySelectorAll('[data-nav-dest]').forEach(b=>b.addEventListener('click', ()=>switchView(b.dataset.navDest)));
  destroyChartsK9();
  if(prefs.extras.some(e=>e.id==='chart_deployments_by_type')){
    const deploysByType = {};
    STATE.k9.refData.deploymentTypes.forEach(t=>deploysByType[t]=0);
    STATE.k9.deployments.forEach(d=>deploysByType[d.type]=(deploysByType[d.type]||0)+1);
    CHART_REFS_K9.deployType = safeChart('chartDeployType', {
      type:'bar',
      data:{ labels:Object.keys(deploysByType), datasets:[{label:'Deployments', data:Object.values(deploysByType), backgroundColor:'#134DD1'}] },
      options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:9}},grid:{display:false}}, y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}},grid:{color:chartGridColor()}}}}
    });
  }
  wireK9Links();
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
   K9 ROSTER
   ========================================================================= */
let ROSTER_FILTER = {q:"", status:"All", skill:"All"};
let ROSTER_SORT = {key:'name', dir:'asc'};

function renderRoster(){
  const canView = can('k9_roster_view');
  const canEdit = can('k9_roster_edit');
  const canDelete = can('k9_roster_delete');
  if(!canView){
    document.getElementById('view-k9-roster').innerHTML = permissionBlockedView("You don't have permission to view the K9 roster in this role.");
    return;
  }
  const f = ROSTER_FILTER;
  let rows = STATE.k9.k9s.filter(k=>{
    const q = f.q.toLowerCase();
    const matchQ = !q || k.name.toLowerCase().includes(q) || k.tagId.toLowerCase().includes(q) || personName(k.handlerId).toLowerCase().includes(q);
    const matchStatus = f.status==="All" || k.status===f.status;
    const matchSkill = f.skill==="All" || k.skills.includes(f.skill);
    return matchQ && matchStatus && matchSkill;
  });
  const s = ROSTER_SORT;
  rows.sort((a,b)=>{
    const av = s.key==='handler' ? personName(a.handlerId).toLowerCase() : String(a[s.key]||'').toLowerCase();
    const bv = s.key==='handler' ? personName(b.handlerId).toLowerCase() : String(b[s.key]||'').toLowerCase();
    if(av<bv) return s.dir==='asc'?-1:1; if(av>bv) return s.dir==='asc'?1:-1; return 0;
  });

  const cards = rows.map(k=>{
    const hrs = monthlyTrainingHours(k.id,1);
    const compliant = k.status==="Retired"||k.status==="Deceased" ? null : hrs>=MONTHLY_TRAINING_HOURS_STANDARD;
    const photo = k.photoDataUrl
      ? `<img src="${k.photoDataUrl}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:72px;height:72px;border-radius:50%;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);flex-shrink:0;"><span style="width:32px;height:32px;display:inline-block;">${ICONS.pawprint}</span></div>`;
    return `
    <div class="k9-card">
      <div style="display:flex;gap:14px;">
        ${photo}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;">${k9Link(k.id)}</div>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);margin:2px 0 6px;">${escapeHtml(k.tagId)} &bull; ${escapeHtml(k.breed)}</div>
          <span class="badge ${statusBadgeClassK9(k.status)}">${k.status}</span>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12.5px;">
        <div style="color:var(--text-dim);margin-bottom:4px;">${fieldLabel('k9.handler')}</div>
        <div style="font-weight:600;margin-bottom:10px;">${escapeHtml(personName(k.handlerId))}</div>
        <div style="color:var(--text-dim);margin-bottom:4px;">Skills</div>
        <div style="margin-bottom:10px;">${k.skills.map(sk=>`<span class="badge badge-role" style="margin:1px;">${escapeHtml(sk)}</span>`).join(' ')||'—'}</div>
        <div style="color:var(--text-dim);margin-bottom:4px;">Training (30d)</div>
        <div>${compliant===null ? '—' : (compliant ? `<span style="color:var(--green);font-weight:700;">&#10003; ${hrs}h / ${MONTHLY_TRAINING_HOURS_STANDARD}h</span>` : `<span style="color:var(--red);font-weight:700;">${hrs}h / ${MONTHLY_TRAINING_HOURS_STANDARD}h</span>`)}</div>
      </div>
      ${(canEdit || canDelete) ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-k9="${k.id}">${ICONS.edit} Edit</button>` : ''}
        ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-k9="${k.id}">${ICONS.trash} Delete</button>` : ''}
      </div>` : ''}
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.pawprint}<div class="msg">No K9s match this filter</div></div>`;

  document.getElementById('view-k9-roster').innerHTML = `
    ${!canEdit ? lockedNote("You're viewing the K9 roster in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="rosterSearch" title="Filters the K9 roster below as you type, matching name, tag number, or handler name" placeholder="Search name, tag #, handler..." style="width:220px;" value="${escapeHtml(f.q)}">
        <select id="rosterStatus" title="Filter the K9 roster to a single status (e.g. Active, Retired)"><option ${f.status==='All'?'selected':''}>All</option>${STATE.k9.refData.statuses.map(st=>`<option ${f.status===st?'selected':''}>${escapeHtml(st)}</option>`).join('')}</select>
        <select id="rosterSkill" title="Filter the K9 roster to dogs trained in a single discipline"><option ${f.skill==='All'?'selected':''}>All</option>${STATE.k9.refData.skillsCatalog.map(sk=>`<option ${f.skill===sk?'selected':''}>${escapeHtml(sk)}</option>`).join('')}</select>
        <select id="rosterSortKey">
          <option value="name" ${s.key==='name'?'selected':''}>Sort: Name</option>
          <option value="tagId" ${s.key==='tagId'?'selected':''}>Sort: Tag #</option>
          <option value="breed" ${s.key==='breed'?'selected':''}>Sort: Breed</option>
          <option value="handler" ${s.key==='handler'?'selected':''}>Sort: Handler</option>
          <option value="status" ${s.key==='status'?'selected':''}>Sort: Status</option>
        </select>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="btnAddK9">${ICONS.plus} Add K9</button>` : ''}
    </div>
    <div class="k9-card-grid">${cards}</div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:12px;">Showing ${rows.length} of ${STATE.k9.k9s.length} K9s &bull; click a name for the full profile</div>
  `;
  document.getElementById('rosterSearch').addEventListener('input', e=>{ROSTER_FILTER.q=e.target.value; renderRoster(); refocusFilterInput('rosterSearch');});
  document.getElementById('rosterStatus').addEventListener('change', e=>{ROSTER_FILTER.status=e.target.value; renderRoster();});
  document.getElementById('rosterSkill').addEventListener('change', e=>{ROSTER_FILTER.skill=e.target.value; renderRoster();});
  document.getElementById('rosterSortKey').addEventListener('change', e=>{ROSTER_SORT.key=e.target.value; ROSTER_SORT.dir='asc'; renderRoster();});
  const addBtn = document.getElementById('btnAddK9');
  if(addBtn) addBtn.addEventListener('click', ()=>openK9FormModal(null));
  document.querySelectorAll('[data-edit-k9]').forEach(b=>b.addEventListener('click', ()=>openK9FormModal(b.dataset.editK9)));
  document.querySelectorAll('[data-del-k9]').forEach(b=>b.addEventListener('click', ()=>deleteK9(b.dataset.delK9)));
  wireK9Links();
}
function sortHeaderHtmlK9(label, key){
  const s = ROSTER_SORT;
  const active = s.key===key;
  const arrow = active ? (s.dir==='asc' ? '&#9650;' : '&#9660;') : '&#8597;';
  return `<th class="sortable ${active?'sort-active':''}" data-sort-key-k9="${key}">${label}<span class="arrow">${arrow}</span></th>`;
}
document.addEventListener('click', (e)=>{
  const th = e.target.closest && e.target.closest('[data-sort-key-k9]');
  if(th && document.getElementById('view-k9-roster') && document.getElementById('view-k9-roster').contains(th)){
    const key = th.dataset.sortKeyK9;
    if(ROSTER_SORT.key===key) ROSTER_SORT.dir = ROSTER_SORT.dir==='asc'?'desc':'asc';
    else { ROSTER_SORT.key = key; ROSTER_SORT.dir = 'asc'; }
    renderRoster();
  }
});

function openK9FormModal(existingId){
  const editing = !!existingId;
  const k = editing ? k9For(existingId) : {
    name:"", breed: STATE.k9.refData.breeds[0], sex:"Male", dob:"", dateAcquired:fmt(new Date()),
    handlerId: STATE.personnel[0].id, backupHandlerId:null, agency:"Reno PD - Patrol Division", unit:"K9 Unit",
    tagId:"", status:"Active", skills:[], vendor:"", microchipNumber:"", gpsCollarId:"", notes:"", photoDataUrl:null,
  };
  let pendingPhoto = k.photoDataUrl || null;
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} K9</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${photoDropZoneHtml('fK9', k.photoDataUrl, {label:'K9 Photo', round:true, placeholderIcon:ICONS.pawprint})}
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('k9.name')}</label><input type="text" id="fK9Name" value="${escapeHtml(k.name)}"></div>
        <div class="form-row"><label>${fieldLabel('k9.tagId')}</label><input type="text" id="fK9Tag" value="${escapeHtml(k.tagId)}" placeholder="e.g. K9-07"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('k9.breed')}</label><select id="fK9Breed">${STATE.k9.refData.breeds.map(b=>`<option ${k.breed===b?'selected':''}>${escapeHtml(b)}</option>`).join('')}</select></div>
        <div class="form-row"><label>${fieldLabel('k9.sex')}</label><select id="fK9Sex"><option ${k.sex==='Male'?'selected':''}>Male</option><option ${k.sex==='Female'?'selected':''}>Female</option></select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Date of Birth</label><input type="date" id="fK9Dob" value="${k.dob||''}"></div>
        <div class="form-row"><label>Date Acquired</label><input type="date" id="fK9Acquired" value="${k.dateAcquired||''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Primary Handler</label><select id="fK9Handler">${STATE.personnel.map(p=>`<option value="${p.id}" ${k.handlerId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Backup Handler</label><select id="fK9BackupHandler"><option value="">None</option>${STATE.personnel.map(p=>`<option value="${p.id}" ${k.backupHandlerId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>${fieldLabel('k9.status')}</label><select id="fK9Status">${STATE.k9.refData.statuses.map(st=>`<option ${k.status===st?'selected':''}>${escapeHtml(st)}</option>`).join('')}</select></div>
      <div class="form-row" id="fK9RetireWrap" style="${k.status==='Retired'?'':'display:none;'}">
        <div class="form-2col">
          <div class="form-row"><label>Retirement Date</label><input type="date" id="fK9RetireDate" value="${k.retirementDate||fmt(new Date())}"></div>
          <div class="form-row"><label>Disposition</label><select id="fK9RetireDisposition">${STATE.k9.refData.retirementDispositions.map(d=>`<option ${k.retirementDisposition===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="form-row"><label>Skills / Disciplines</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;">
          ${STATE.k9.refData.skillsCatalog.map(sk=>`<label style="display:inline-flex;gap:6px;align-items:center;font-size:12.5px;padding:3px 10px 3px 0;"><input type="checkbox" class="fK9Skill" value="${escapeHtml(sk)}" ${k.skills.includes(sk)?'checked':''} style="width:auto;">${escapeHtml(sk)}</label>`).join('')}
        </div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('k9.vendor')}</label><input type="text" id="fK9Vendor" value="${escapeHtml(k.vendor||'')}"></div>
        <div class="form-row"><label>Microchip #</label><input type="text" id="fK9Microchip" value="${escapeHtml(k.microchipNumber||'')}"></div>
      </div>
      <div class="form-row"><label>GPS Collar ID</label><input type="text" id="fK9Gps" value="${escapeHtml(k.gpsCollarId||'')}" placeholder="e.g. K-501"></div>
      <div class="form-row"><label>Notes</label><textarea id="fK9Notes" rows="2">${escapeHtml(k.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add K9'}</button></div>
  `;
  openModal();
  wirePhotoDropZone('fK9', (dataUrl)=>{ pendingPhoto = dataUrl; });
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fK9Status').addEventListener('change', e=>{ document.getElementById('fK9RetireWrap').style.display = e.target.value==='Retired'?'':'none'; });
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fK9Name').value.trim();
    if(!name){ toast("Enter a K9 name.", true); return; }
    const status = document.getElementById('fK9Status').value;
    const backupVal = document.getElementById('fK9BackupHandler').value;
    const data = {
      name, breed: document.getElementById('fK9Breed').value, sex: document.getElementById('fK9Sex').value,
      dob: document.getElementById('fK9Dob').value, dateAcquired: document.getElementById('fK9Acquired').value,
      handlerId: document.getElementById('fK9Handler').value, backupHandlerId: backupVal || null,
      status, tagId: document.getElementById('fK9Tag').value.trim(),
      skills: Array.from(document.querySelectorAll('.fK9Skill:checked')).map(el=>el.value),
      vendor: document.getElementById('fK9Vendor').value.trim(), microchipNumber: document.getElementById('fK9Microchip').value.trim(),
      gpsCollarId: document.getElementById('fK9Gps').value.trim(), notes: document.getElementById('fK9Notes').value.trim(),
      retirementDate: status==='Retired' ? document.getElementById('fK9RetireDate').value : null,
      retirementDisposition: status==='Retired' ? document.getElementById('fK9RetireDisposition').value : 'N/A',
    };
    if(editing){
      const changed = [];
      const visibleFields = ['name','breed','sex','dob','dateAcquired','handlerId','backupHandlerId','status','tagId','skills','vendor','retirementDate','retirementDisposition'];
      const restrictedFields = ['microchipNumber','gpsCollarId','notes'];
      visibleFields.forEach(field=>{
        if(JSON.stringify(k[field] ?? null)===JSON.stringify(data[field] ?? null)) return;
        recordFieldChangeK9(k,field,k[field],data[field]);
        changed.push(field);
        logActivity(`Updated K9 ${name}: ${field} changed.`,"k9",k.id);
      });
      restrictedFields.forEach(field=>{
        if(JSON.stringify(k[field] ?? null)===JSON.stringify(data[field] ?? null)) return;
        changed.push(field);
        recordK9Event(k,field+' updated','Restricted value changed');
        logActivity(`Updated restricted K9 field ${field} for ${name} (values withheld).`,"k9",k.id);
      });
      if(k.photoDataUrl!==pendingPhoto){changed.push('photo');recordK9Event(k,'photo updated','Photo changed');logActivity(`Updated K9 photo for ${name}.`,"k9",k.id);}
      Object.assign(k, data, {photoDataUrl: pendingPhoto});
      if(!changed.length) logActivity(`Saved K9 record for ${name} with no field changes.`,"k9",k.id);
      toast("K9 record saved.");
    } else {
      const newK = {id:'k9_'+Date.now(), photoDataUrl: pendingPhoto, agency:"Reno PD - Patrol Division", unit:"K9 Unit",
        medical: emptyMedicalK9(), equipment:[], deceasedDate:null, lastKnownLocation:null, locationHistory:[], fieldHistory:[], ...data};
      STATE.k9.k9s.push(newK);
      logActivity(`Added new K9 "${name}" to the roster.`, "k9", newK.id);
      toast("K9 added to roster.");
    }
    persist();
    closeModal();
    if(ACTIVE_VIEW==='k9-roster') renderRoster();
  };
}

function deleteK9(id){
  const k = k9For(id);
  if(!confirm(`Delete ${k.name} from the roster? This also removes their training, certification, deployment, and incident history.`)) return;
  STATE.k9.k9s = STATE.k9.k9s.filter(x=>x.id!==id);
  STATE.k9.trainingSessions = STATE.k9.trainingSessions.filter(t=>t.k9Id!==id);
  STATE.k9.certifications = STATE.k9.certifications.filter(c=>c.k9Id!==id);
  STATE.k9.deployments = STATE.k9.deployments.filter(d=>d.k9Id!==id);
  STATE.k9.incidents = STATE.k9.incidents.filter(i=>i.k9Id!==id);
  logActivity(`Deleted K9 "${k.name}" from the roster.`, "k9", id);
  persist();
  toast("K9 removed from roster.");
  renderRoster();
}

/* =========================================================================
   K9 DETAIL (full tabbed profile)
   ========================================================================= */
let K9_DETAIL_TAB = 'overview';
let K9_DETAIL_ID = null;

function openK9Detail(k9Id){
  if(!SuiteUX.openRecord("k9","k9",k9Id)) return;

  K9_DETAIL_TAB = 'overview';
  K9_DETAIL_ID = k9Id;
  renderK9DetailModal();
}

function renderK9DetailModal(){
  const k = k9For(K9_DETAIL_ID);
  if(!k){ closeModal(); return; }
  const tabs = [
    ['overview','Overview'], ['medical','Medical'], ['training','Training'], ['certifications','Certifications'],
    ['deployments','Deployments'], ['incidents','Incidents'], ['gps','GPS'], ['history','Change History'],
  ];
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-xl';
  const hrs = monthlyTrainingHours(k.id,1);
  box.innerHTML = `
    <div class="modal-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${k.photoDataUrl ? `<img src="${k.photoDataUrl}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">` : `<div style="width:44px;height:44px;border-radius:50%;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);">${ICONS.pawprint}</div>`}
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(k.name)}</h3>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(k.breed)} &bull; ${escapeHtml(k.tagId)} &bull; Handler: ${escapeHtml(personName(k.handlerId))}</div>
        </div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${K9_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-k9-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="k9DetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-k9-tab]').forEach(b=>b.addEventListener('click', ()=>{ K9_DETAIL_TAB=b.dataset.k9Tab; renderK9DetailModal(); }));
  renderK9DetailTabContent(k);
}

function renderK9DetailTabContent(k){
  const body = document.getElementById('k9DetailBody');
  const canEdit = can('k9_roster_edit');
  const canMedManage = can('k9_medical_manage');
  const canTrainManage = can('k9_training_manage');
  const canCertManage = can('k9_certification_manage');
  const canDeployLog = can('k9_deployment_log');
  const canIncidentManage = can('k9_incident_manage');

  if(K9_DETAIL_TAB==='overview'){
    const age = k.dob ? Math.floor(daysBetween(k.dob, fmt(new Date()))/365) : null;
    body.innerHTML = `
      ${canEdit ? `<div style="margin-bottom:14px;display:flex;gap:8px;"><button class="btn btn-sm btn-primary" id="btnEditK9FromDetail">${ICONS.edit} Edit K9</button><button class="btn btn-sm btn-outline" id="btnUploadK9Photo">${ICONS.camera} ${k.photoDataUrl?'Change':'Attach'} Photo</button></div>` : ''}
      <div class="detail-grid">
        <div><div class="k">Breed</div><div class="v">${escapeHtml(k.breed)}</div></div>
        <div><div class="k">Sex</div><div class="v">${escapeHtml(k.sex)}</div></div>
        <div><div class="k">Date of Birth</div><div class="v">${k.dob||'—'}${age!=null?' ('+age+' yrs)':''}</div></div>
        <div><div class="k">Date Acquired</div><div class="v">${k.dateAcquired||'—'}</div></div>
        <div><div class="k">Primary Handler</div><div class="v">${escapeHtml(personName(k.handlerId))}</div></div>
        <div><div class="k">Backup Handler</div><div class="v">${k.backupHandlerId?escapeHtml(personName(k.backupHandlerId)):'—'}</div></div>
        <div><div class="k">Agency / Unit</div><div class="v">${escapeHtml(k.agency)} — ${escapeHtml(k.unit)}</div></div>
        <div><div class="k">Tag / Unit #</div><div class="v">${escapeHtml(k.tagId)}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClassK9(k.status)}">${k.status}</span></div></div>
        <div><div class="k">Skills / Disciplines</div><div class="v">${k.skills.map(sk=>`<span class="badge badge-role" style="margin:1px;">${escapeHtml(sk)}</span>`).join(' ')||'—'}</div></div>
        <div><div class="k">Vendor / Source</div><div class="v">${(k.vendor?escapeHtml(k.vendor):'—')}</div></div>
        <div><div class="k">Microchip #</div><div class="v">${(k.microchipNumber?escapeHtml(k.microchipNumber):'—')}</div></div>
        <div><div class="k">GPS Collar ID</div><div class="v">${(k.gpsCollarId?escapeHtml(k.gpsCollarId):'—')}</div></div>
        <div><div class="k">Equipment</div><div class="v">${(k.equipment||[]).join(', ')||'—'}</div></div>
        ${k.status==='Retired' ? `<div><div class="k">Retirement Date</div><div class="v">${k.retirementDate||'—'}</div></div><div><div class="k">Disposition</div><div class="v">${(k.retirementDisposition?escapeHtml(k.retirementDisposition):'—')}</div></div>` : ''}
        <div><div class="k">Notes</div><div class="v">${(k.notes?escapeHtml(k.notes):'—')}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;margin-top:14px;"><div class="panel-head"><h2>Maintenance-Training Compliance</h2></div>
        <div class="panel-body">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;height:10px;background:var(--border);border-radius:5px;overflow:hidden;max-width:260px;"><div style="width:${Math.min(100,Math.round((monthlyTrainingHours(k.id,1)/MONTHLY_TRAINING_HOURS_STANDARD)*100))}%;height:100%;background:${monthlyTrainingHours(k.id,1)>=MONTHLY_TRAINING_HOURS_STANDARD?'var(--green)':'var(--red)'};"></div></div>
            <span style="font-size:13px;font-weight:700;">${monthlyTrainingHours(k.id,1)} / ${MONTHLY_TRAINING_HOURS_STANDARD} hrs (last 30 days)</span>
          </div>
        </div>
      </div>
    `;
    const editBtn = document.getElementById('btnEditK9FromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>openK9FormModal(k.id));
    const photoBtn = document.getElementById('btnUploadK9Photo');
    if(photoBtn) photoBtn.addEventListener('click', ()=>openK9PhotoUploadModal(k));

  } else if(K9_DETAIL_TAB==='medical'){
    const m = k.medical;
    const vaxRows = m.vaccinations.map((v,i)=>`
      <tr><td>${escapeHtml(v.name)}</td><td>${v.date}</td><td>${v.expirationDate||'No expiration'}</td><td style="font-size:12px;">${escapeHtml(v.notes||'')}</td>
      ${canMedManage?`<td><button class="btn-icon" data-del-k9vax="${i}">${ICONS.trash}</button></td>`:'<td></td>'}</tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:12px;">No vaccinations on file.</td></tr>`;
    const visitRows = m.vetVisits.map(v=>`<tr><td>${v.date}</td><td style="font-size:12.5px;">${escapeHtml(v.reason)}</td><td style="font-size:12px;">${escapeHtml(v.notes||'')}</td><td>${money(v.cost||0)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px;">No vet visits on file.</td></tr>`;
    const injRows = m.injuries.map(inj=>`<tr><td>${inj.date}</td><td style="font-size:12.5px;">${escapeHtml(inj.description)}</td><td style="font-size:12px;">${escapeHtml(inj.notes||'')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:12px;">No injuries on file.</td></tr>`;
    body.innerHTML = `
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Weight</div><div class="v">${(m.weight?escapeHtml(m.weight):'—')}</div></div>
        <div><div class="k">Vet Clinic</div><div class="v">${(m.vetClinic?escapeHtml(m.vetClinic):'—')} ${m.vetPhone?'('+escapeHtml(m.vetPhone)+')':''}</div></div>
        <div><div class="k">Allergies</div><div class="v">${escapeHtml(m.allergies||'None known')}</div></div>
        <div><div class="k">Medications</div><div class="v">${(m.medications||[]).join(', ')||'—'}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Vaccinations</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddK9Vax">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Vaccine</th><th>Date</th><th>Expiration</th><th>Notes</th><th></th></tr></thead><tbody>${vaxRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Vet Visits</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddK9Visit">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Reason</th><th>Notes</th><th>Cost</th></tr></thead><tbody>${visitRows}</tbody></table></div></div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Injuries</h2>${canMedManage?`<button class="btn btn-sm btn-outline" id="btnAddK9Injury">${ICONS.plus} Add</button>`:''}</div>
        <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Description</th><th>Notes</th></tr></thead><tbody>${injRows}</tbody></table></div></div>
      ${!canMedManage ? '<div style="font-size:12px;color:var(--text-dim);">You have view-only access to medical data in this role.</div>' : ''}
    `;
    if(canMedManage){
      document.getElementById('btnAddK9Vax').addEventListener('click', ()=>openK9VaxFormModal(k));
      document.getElementById('btnAddK9Visit').addEventListener('click', ()=>openK9VetVisitFormModal(k));
      document.getElementById('btnAddK9Injury').addEventListener('click', ()=>openK9InjuryFormModal(k));
      document.querySelectorAll('[data-del-k9vax]').forEach(b=>b.addEventListener('click', ()=>{
        m.vaccinations.splice(Number(b.dataset.delK9vax),1);
        logActivity(`Removed a vaccination record for ${k.name}.`, "k9_medical", k.id);
        persist(); renderK9DetailModal();
      }));
    }

  } else if(K9_DETAIL_TAB==='training'){
    const list = STATE.k9.trainingSessions.filter(t=>t.k9Id===k.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(t=>`
      <tr><td>${t.date}</td><td>${escapeHtml(t.type)}</td><td>${t.hours}</td><td>${escapeHtml(t.provider)}</td><td>${t.passed===null?'—':(t.passed?'Passed':'Failed')}</td>
      <td style="font-size:12px;">${escapeHtml(t.narrative||'')}</td></tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No training sessions logged yet.</td></tr>`;
    body.innerHTML = `
      ${canTrainManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddK9Training">${ICONS.plus} Log Training Session</button>` : ''}
      <table><thead><tr><th>Date</th><th>Type</th><th>Hours</th><th>Provider</th><th>Result</th><th>Narrative</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const addBtn = document.getElementById('btnAddK9Training');
    if(addBtn) addBtn.addEventListener('click', ()=>openK9TrainingFormModal(k));

  } else if(K9_DETAIL_TAB==='certifications'){
    const list = STATE.k9.certifications.filter(c=>c.k9Id===k.id).slice().sort((a,b)=>b.certDate.localeCompare(a.certDate));
    const rows = list.map(c=>`
      <tr><td>${escapeHtml(c.certType)}</td><td>${escapeHtml(c.certifyingBody)}</td><td>${c.certDate}</td><td>${c.expirationDate||'—'}</td>
      <td><span class="badge ${statusBadgeClassK9(c.passFail)}">${c.passFail}</span></td><td>${c.score!=null?c.score:'—'}</td></tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:16px;">No certifications on file.</td></tr>`;
    body.innerHTML = `
      ${canCertManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddK9Cert">${ICONS.plus} Record Certification</button>` : ''}
      <table><thead><tr><th>Type</th><th>Certifying Body</th><th>Date</th><th>Expires</th><th>Result</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const addBtn = document.getElementById('btnAddK9Cert');
    if(addBtn) addBtn.addEventListener('click', ()=>openK9CertFormModal(k));

  } else if(K9_DETAIL_TAB==='deployments'){
    const list = STATE.k9.deployments.filter(d=>d.k9Id===k.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(d=>`
      <tr><td>${d.date}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.location)}</td><td>${escapeHtml(d.outcome)}</td>
      <td>${d.biteOccurred?'<span class="badge badge-missing">Bite</span>':''}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No deployments logged yet.</td></tr>`;
    body.innerHTML = `
      ${canDeployLog ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddK9Deploy">${ICONS.plus} Log Deployment</button>` : ''}
      <table><thead><tr><th>Date</th><th>Type</th><th>Location</th><th>Outcome</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const addBtn = document.getElementById('btnAddK9Deploy');
    if(addBtn) addBtn.addEventListener('click', ()=>openK9DeploymentFormModal(k));

  } else if(K9_DETAIL_TAB==='incidents'){
    const list = STATE.k9.incidents.filter(i=>i.k9Id===k.id).slice().sort((a,b)=>b.date.localeCompare(a.date));
    const rows = list.map(i=>`
      <tr><td>${escapeHtml(i.type)}</td><td>${i.date}</td><td class="mono">${escapeHtml(i.caseNumber)}</td><td><span class="badge ${statusBadgeClassK9(i.reviewStatus)}">${i.reviewStatus}</span></td>
      <td><button class="btn btn-sm btn-outline" data-view-k9inc="${i.id}">View</button></td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No incidents on file.</td></tr>`;
    body.innerHTML = `
      ${canIncidentManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddK9Incident">${ICONS.plus} Record Incident</button>` : ''}
      <table><thead><tr><th>Type</th><th>Date</th><th>Case #</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    `;
    const addBtn = document.getElementById('btnAddK9Incident');
    if(addBtn) addBtn.addEventListener('click', ()=>openK9IncidentFormModal(null, k.id));
    document.querySelectorAll('[data-view-k9inc]').forEach(b=>b.addEventListener('click', ()=>openK9IncidentDetailModal(b.dataset.viewK9inc)));

  } else if(K9_DETAIL_TAB==='gps'){
    const loc = k.lastKnownLocation;
    const hist = (k.locationHistory||[]).slice().sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Simulated GPS collar telemetry. In a full deployment, this feed would come from the K9 unit's actual GPS collar hardware and would also surface live on CAD and Mobile for dispatch and responding units.</div>
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Collar ID</div><div class="v">${(k.gpsCollarId?escapeHtml(k.gpsCollarId):'—')}</div></div>
        <div><div class="k">Last Known Location</div><div class="v">${loc?escapeHtml(loc.address)+' ('+loc.lat.toFixed(4)+', '+loc.lng.toFixed(4)+')':'—'}</div></div>
        <div><div class="k">Last Ping</div><div class="v">${loc?new Date(loc.timestamp).toLocaleString():'—'}</div></div>
      </div>
      ${can('k9_gps_view') ? `<button class="btn btn-sm btn-outline" id="btnPingK9Gps" style="margin-bottom:12px;">${ICONS.mappin} Simulate New Ping</button>` : ''}
      <table><thead><tr><th>Timestamp</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>
      ${hist.map(h=>`<tr><td>${new Date(h.timestamp).toLocaleString()}</td><td class="mono">${h.lat.toFixed(5)}</td><td class="mono">${h.lng.toFixed(5)}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No location history recorded.</td></tr>`}
      </tbody></table>
    `;
    const pingBtn = document.getElementById('btnPingK9Gps');
    if(pingBtn) pingBtn.addEventListener('click', ()=>{
      const newLoc = { lat: 39.5296 + (Math.random()-0.5)*0.08, lng: -119.8138 + (Math.random()-0.5)*0.08, timestamp: new Date().toISOString(), address: "Patrol Zone " + (Math.floor(Math.random()*4)+1) };
      k.lastKnownLocation = newLoc;
      k.locationHistory.push({lat:newLoc.lat, lng:newLoc.lng, timestamp:newLoc.timestamp});
      persist();
      renderK9DetailModal();
    });

  } else if(K9_DETAIL_TAB==='history'){
    const rows = k.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `
      <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">K9 profile changes, training sessions, certifications and deployments are tracked here. The Platform Audit Log also records actions without exposing restricted values.</div>
      <table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function openK9PhotoUploadModal(k){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Attach Photo</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        ${k.photoDataUrl ? `<img src="${k.photoDataUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">` : `<div style="width:64px;height:64px;border-radius:50%;background:var(--lightgray);"></div>`}
        <input type="file" id="fK9PhotoFile" accept="image/*">
      </div>
      <div style="font-size:11px;color:var(--text-dim);">Stored as a small resized thumbnail in this prototype's data record.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Save Photo</button></div>
  `;
  openModal();
  let pending = k.photoDataUrl;
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('fK9PhotoFile').addEventListener('change', (e)=>{
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
    k.photoDataUrl = pending;
    logActivity(`Updated photo for ${k.name}.`, "k9", k.id);
    persist();
    renderK9DetailModal();
  };
}

function openK9VaxFormModal(k){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Vaccination</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Vaccine</label><input type="text" id="fVaxName" placeholder="e.g. Rabies, DHPP, Bordetella"></div>
      <div class="form-2col">
        <div class="form-row"><label>Date Administered</label><input type="date" id="fVaxDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Expiration</label><input type="date" id="fVaxExpire"></div>
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
    k.medical.vaccinations.push({ name, date: document.getElementById('fVaxDate').value, expirationDate: document.getElementById('fVaxExpire').value || null, notes: document.getElementById('fVaxNotes').value.trim() });
    logActivity(`Added vaccination "${name}" for ${k.name}.`, "k9_medical", k.id);
    persist();
    toast("Vaccination added.");
    renderK9DetailModal();
  };
}

function openK9VetVisitFormModal(k){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Vet Visit</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fVisitDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Cost ($)</label><input type="number" id="fVisitCost" value="0"></div>
      </div>
      <div class="form-row"><label>Reason</label><input type="text" id="fVisitReason" placeholder="e.g. Annual wellness exam"></div>
      <div class="form-row"><label>Notes</label><textarea id="fVisitNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const reason = document.getElementById('fVisitReason').value.trim();
    if(!reason){ toast("Enter a reason for the visit.", true); return; }
    k.medical.vetVisits.push({ date: document.getElementById('fVisitDate').value, reason, notes: document.getElementById('fVisitNotes').value.trim(), cost: Number(document.getElementById('fVisitCost').value)||0 });
    logActivity(`Logged vet visit for ${k.name}: ${reason}.`, "k9_medical", k.id);
    persist();
    toast("Vet visit added.");
    renderK9DetailModal();
  };
}

function openK9InjuryFormModal(k){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Injury</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Date</label><input type="date" id="fInjDate" value="${fmt(new Date())}"></div>
      <div class="form-row"><label>Description</label><input type="text" id="fInjDesc" placeholder="What happened"></div>
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
    k.medical.injuries.push({ date: document.getElementById('fInjDate').value, description: desc, notes: document.getElementById('fInjNotes').value.trim() });
    logActivity(`Logged injury for ${k.name}.`, "k9_medical", k.id);
    persist();
    toast("Injury logged.");
    renderK9DetailModal();
  };
}

function openK9TrainingFormModal(k){
  const fromDetail = !!document.getElementById('k9DetailBody');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Training Session</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label for="fTrHandler">Handler Performing Activity</label><select id="fTrHandler">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===CURRENT_USER_ID?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      ${fromDetail ? '' : `<div class="form-row"><label>K9</label><select id="fTrK9">${STATE.k9.k9s.map(x=>`<option value="${x.id}" ${x.id===k.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`}
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fTrDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Hours</label><input type="number" id="fTrHours" value="4"></div>
      </div>
      <div class="form-row"><label>Type</label><select id="fTrType">${STATE.k9.refData.trainingTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Provider</label><select id="fTrProvider">${STATE.k9.refData.trainingProviders.map(p=>`<option>${escapeHtml(p)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Location</label><input type="text" id="fTrLocation" value="K9 Training Facility"></div>
      </div>
      <div class="form-row"><label>Instructor</label><input type="text" id="fTrInstructor" placeholder="Instructor name"></div>
      <div class="form-row"><label>Result</label><select id="fTrPassed"><option value="true">Passed</option><option value="false">Needs Follow-up</option></select></div>
      <div class="form-row"><label>Narrative</label><textarea id="fTrNarrative" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Session</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const hours = Number(document.getElementById('fTrHours').value)||0;
    if(hours<=0){ toast("Enter a positive number of hours.", true); return; }
    const actualK9 = fromDetail ? k : k9For(document.getElementById('fTrK9').value);
    const newT = {
      id:'k9tr'+Date.now(), k9Id:actualK9.id, handlerId:document.getElementById('fTrHandler').value, date: document.getElementById('fTrDate').value, hours,
      type: document.getElementById('fTrType').value, provider: document.getElementById('fTrProvider').value,
      location: document.getElementById('fTrLocation').value.trim(), instructor: document.getElementById('fTrInstructor').value.trim(),
      passed: document.getElementById('fTrPassed').value==='true', narrative: document.getElementById('fTrNarrative').value.trim(),
    };
    STATE.k9.trainingSessions.push(newT);
    recordK9Event(actualK9,'Training recorded',`${newT.date}: ${hours} hr ${newT.type} (${newT.passed?'Passed':'Not passed'})`);
    logActivity(`Logged ${hours}hr ${newT.type} training session for ${actualK9.name} (training ID ${newT.id}).`, "k9_training", actualK9.id);
    persist();
    toast("Training session logged.");
    if(fromDetail){ renderK9DetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='k9-training') renderTraining(); }
  };
}

function openK9CertFormModal(k){
  const fromDetail = !!document.getElementById('k9DetailBody');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Record Certification</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${fromDetail ? '' : `<div class="form-row"><label>K9</label><select id="fCertK9">${STATE.k9.k9s.map(x=>`<option value="${x.id}" ${x.id===k.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`}
      <div class="form-row"><label>Certification Type</label><select id="fCertType">${STATE.k9.refData.certTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Certifying Body</label><select id="fCertBody">${STATE.k9.refData.certifyingBodies.map(b=>`<option>${escapeHtml(b)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Certification Date</label><input type="date" id="fCertDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Result</label><select id="fCertResult"><option value="Passed">Passed</option><option value="Failed">Failed</option></select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Score (optional)</label><input type="number" id="fCertScore" placeholder="e.g. 88"></div>
        <div class="form-row"><label>Certifying Official</label><input type="text" id="fCertOfficial" placeholder="Master Trainer name"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fCertNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Record</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const result = document.getElementById('fCertResult').value;
    const certDate = document.getElementById('fCertDate').value;
    const actualK9 = fromDetail ? k : k9For(document.getElementById('fCertK9').value);
    const newC = {
      id:'k9cert'+Date.now(), k9Id:actualK9.id, certType: document.getElementById('fCertType').value, certifyingBody: document.getElementById('fCertBody').value,
      certDate, expirationDate: result==='Passed' ? fmt(addDays(new Date(certDate), 365)) : null,
      certifyingOfficial: document.getElementById('fCertOfficial').value.trim(),
      passFail: result, score: document.getElementById('fCertScore').value ? Number(document.getElementById('fCertScore').value) : null,
      notes: document.getElementById('fCertNotes').value.trim(),
    };
    STATE.k9.certifications.push(newC);
    recordK9Event(actualK9,'Certification recorded',`${newC.certType}: ${result} on ${certDate}, expires ${newC.expirationDate||'N/A'}`);
    logActivity(`Recorded ${newC.certType} certification (${result}) for ${actualK9.name} (certification ID ${newC.id}).`, "k9_certification", actualK9.id);
    persist();
    toast("Certification recorded.");
    if(fromDetail){ renderK9DetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='k9-certifications') renderCertifications(); }
  };
}

function openK9DeploymentFormModal(k){
  const fromDetail = !!document.getElementById('k9DetailBody');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Deployment</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label for="fDepHandler">Handler Performing Activity</label><select id="fDepHandler">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===CURRENT_USER_ID?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      ${fromDetail ? '' : `<div class="form-row"><label>K9</label><select id="fDepK9">${STATE.k9.k9s.map(x=>`<option value="${x.id}" ${x.id===k.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`}
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fDepDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Time</label><input type="time" id="fDepTime" value="12:00"></div>
      </div>
      <div class="form-row"><label>Type</label><select id="fDepType">${STATE.k9.refData.deploymentTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><input type="text" id="fDepLocation" placeholder="Address or area"></div>
        <div class="form-row"><label>CAD / Call #</label><input type="text" id="fDepCad" placeholder="e.g. CAD-2026-01234"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Outcome</label><select id="fDepOutcome">${STATE.k9.refData.deploymentOutcomes.map(o=>`<option>${escapeHtml(o)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Duration (min)</label><input type="number" id="fDepDuration" value="15"></div>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fDepBite" style="width:auto;">A bite occurred during this deployment</label>
      </div>
      <div class="form-row">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fDepInjury" style="width:auto;">A subject was injured during this deployment</label>
      </div>
      <div class="form-row"><label>Narrative</label><textarea id="fDepNarrative" rows="3"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Deployment</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const location = document.getElementById('fDepLocation').value.trim();
    if(!location){ toast("Enter a location.", true); return; }
    const actualK9 = fromDetail ? k : k9For(document.getElementById('fDepK9').value);
    const biteOccurred = document.getElementById('fDepBite').checked;
    const newD = {
      id:'dep'+Date.now(), k9Id:actualK9.id, handlerId:document.getElementById('fDepHandler').value, date: document.getElementById('fDepDate').value, time: document.getElementById('fDepTime').value,
      type: document.getElementById('fDepType').value, location, callNumber: document.getElementById('fDepCad').value.trim(),
      outcome: document.getElementById('fDepOutcome').value, narrative: document.getElementById('fDepNarrative').value.trim(),
      biteOccurred, subjectInjured: document.getElementById('fDepInjury').checked, duration: Number(document.getElementById('fDepDuration').value)||0,
    };
    STATE.k9.deployments.push(newD);
    recordK9Event(actualK9,'Deployment recorded',`${newD.date}: ${newD.type}; outcome ${newD.outcome}`);
    logActivity(`Logged ${newD.type} deployment for ${actualK9.name} (deployment ID ${newD.id}).`, "k9_deployment", actualK9.id);
    persist();
    toast("Deployment logged.");
    if(biteOccurred){
      toast("Bite reported \u2014 don't forget to file an Incident record for review.", true);
    }
    if(fromDetail){ renderK9DetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='k9-deployments') renderDeployments(); }
  };
}

function openK9IncidentFormModal(existingId, prefillK9Id){
  const editing = !!existingId;
  const fromDetail = !!document.getElementById('k9DetailBody');
  const i = editing ? STATE.k9.incidents.find(x=>x.id===existingId) : {
    k9Id: prefillK9Id || STATE.k9.k9s[0].id, type: STATE.k9.refData.incidentTypes[0], date: fmt(new Date()),
    caseNumber:"", description:"", outcome:"", reviewStatus:"Pending", reviewedBy:"", reviewDate:null,
    subjectRace:null, subjectSex:null, subjectAge:null,
  };
  const raceOptions = ["","White","Black or African American","Hispanic or Latino","Asian","American Indian or Alaska Native","Native Hawaiian or Pacific Islander","Two or More Races","Unknown"];
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Record'} Incident</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label for="fIncHandler">Handler Performing Activity</label><select id="fIncHandler">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===(editing?i.handlerId:CURRENT_USER_ID)?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>K9</label><select id="fIncK9" ${prefillK9Id?'disabled':''}>${STATE.k9.k9s.map(k=>`<option value="${k.id}" ${i.k9Id===k.id?'selected':''}>${escapeHtml(k.name)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fIncType">${STATE.k9.refData.incidentTypes.map(t=>`<option ${i.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Date</label><input type="date" id="fIncDate" value="${i.date}"></div>
      </div>
      <div class="form-row"><label>Case / IA Number</label><input type="text" id="fIncCase" value="${escapeHtml(i.caseNumber)}" placeholder="e.g. IA-2026-0001 or N/A"></div>
      <div class="form-row"><label>Description</label><textarea id="fIncDesc" rows="3">${escapeHtml(i.description)}</textarea></div>
      <div class="form-row"><label>Outcome</label><input type="text" id="fIncOutcome" value="${escapeHtml(i.outcome)}" placeholder="e.g. Within policy, Under review"></div>
      <div class="form-2col">
        <div class="form-row"><label>Review Status</label><select id="fIncStatus"><option ${i.reviewStatus==='Pending'?'selected':''}>Pending</option><option ${i.reviewStatus==='Reviewed'?'selected':''}>Reviewed</option><option ${i.reviewStatus==='Cleared'?'selected':''}>Cleared</option><option ${i.reviewStatus==='Sustained'?'selected':''}>Sustained</option></select></div>
        <div class="form-row"><label>Reviewed By</label><input type="text" id="fIncReviewer" value="${escapeHtml(i.reviewedBy||'')}"></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin:10px 0 4px;">Subject information below is optional and used only for aggregate bite-ratio reporting (never displayed as a searchable personal record here).</div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Subject Race/Ethnicity</label><select id="fIncSubjectRace">${raceOptions.map(r=>`<option ${i.subjectRace===r?'selected':''}>${r||'\u2014 Not applicable \u2014'}</option>`).join('')}</select></div>
        <div class="form-row"><label>Subject Sex</label><select id="fIncSubjectSex"><option ${!i.subjectSex?'selected':''}></option><option ${i.subjectSex==='Male'?'selected':''}>Male</option><option ${i.subjectSex==='Female'?'selected':''}>Female</option><option ${i.subjectSex==='Unknown'?'selected':''}>Unknown</option></select></div>
        <div class="form-row"><label>Subject Age</label><input type="number" id="fIncSubjectAge" value="${i.subjectAge||''}"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Record'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const k9Id = prefillK9Id || document.getElementById('fIncK9').value;
    const k = k9For(k9Id);
    const reviewStatus = document.getElementById('fIncStatus').value;
    const data = {
      k9Id, handlerId: document.getElementById('fIncHandler').value, type: document.getElementById('fIncType').value, date: document.getElementById('fIncDate').value,
      caseNumber: document.getElementById('fIncCase').value.trim(), description: document.getElementById('fIncDesc').value.trim(),
      outcome: document.getElementById('fIncOutcome').value.trim(), reviewStatus,
      reviewedBy: document.getElementById('fIncReviewer').value.trim(),
      reviewDate: (reviewStatus!=='Pending') ? fmt(new Date()) : null,
      subjectRace: document.getElementById('fIncSubjectRace').value || null,
      subjectSex: document.getElementById('fIncSubjectSex').value || null,
      subjectAge: document.getElementById('fIncSubjectAge').value ? Number(document.getElementById('fIncSubjectAge').value) : null,
    };
    if(editing){ Object.assign(i, data); logActivity(`Updated incident (${data.type}) for ${k.name}.`, "k9_incident", i.id); }
    else { const newI = {id:'k9inc'+Date.now(), ...data}; STATE.k9.incidents.push(newI); logActivity(`Recorded ${data.type} incident for ${k.name}.`, "k9_incident", newI.id); }
    persist();
    toast("Incident saved.");
    if(fromDetail){ renderK9DetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='k9-incidents') renderIncidents(); }
  };
}

function openK9IncidentDetailModal(incId){
  const i = STATE.k9.incidents.find(x=>x.id===incId);
  const k = k9For(i.k9Id);
  const canManage = can('k9_incident_manage');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(i.type)} \u2014 ${escapeHtml(k.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Date</div><div class="v">${i.date}</div></div>
        <div><div class="k">Case #</div><div class="v">${(i.caseNumber?escapeHtml(i.caseNumber):'—')}</div></div>
        <div><div class="k">Handler</div><div class="v">${escapeHtml(personName(i.handlerId))}</div></div>
        <div><div class="k">Review Status</div><div class="v"><span class="badge ${statusBadgeClassK9(i.reviewStatus)}">${i.reviewStatus}</span></div></div>
        <div><div class="k">Reviewed By</div><div class="v">${(i.reviewedBy?escapeHtml(i.reviewedBy):'—')}</div></div>
        <div><div class="k">Review Date</div><div class="v">${i.reviewDate||'—'}</div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Description</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.description)}</div></div>
      ${i.outcome ? `<div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Outcome</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.outcome)}</div></div>` : ''}
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditK9IncFromDetail">${ICONS.edit} Edit</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  const editBtn = document.getElementById('btnEditK9IncFromDetail');
  if(editBtn) editBtn.addEventListener('click', ()=>openK9IncidentFormModal(incId, i.k9Id));
}

/* =========================================================================
   DEPLOYMENTS & ACTIVITY LOG (suite-wide view across every K9)
   ========================================================================= */
let DEPLOY_FILTER = {k9:"All", type:"All", dateFrom:"", dateTo:""};

function renderDeployments(){
  if(!can('k9_deployment_view')){
    document.getElementById('view-k9-deployments').innerHTML = permissionBlockedView("You don't have permission to view the deployment log in this role.");
    return;
  }
  const canLog = can('k9_deployment_log');
  const f = DEPLOY_FILTER;
  const list = STATE.k9.deployments.filter(d=>{
    if(f.k9!=="All" && d.k9Id!==f.k9) return false;
    if(f.type!=="All" && d.type!==f.type) return false;
    if(f.dateFrom && d.date<f.dateFrom) return false;
    if(f.dateTo && d.date>f.dateTo) return false;
    return true;
  }).slice().sort((a,b)=>b.date.localeCompare(a.date));

  const rows = list.map(d=>`
    <tr><td>${k9Link(d.k9Id)}</td><td>${escapeHtml(personName(d.handlerId))}</td><td>${d.date} ${d.time||''}</td><td>${escapeHtml(d.type)}</td>
    <td>${escapeHtml(d.location)}</td><td class="mono">${escapeHtml(d.callNumber||'')}</td><td>${escapeHtml(d.outcome)}</td>
    <td>${d.biteOccurred?'<span class="badge badge-missing">Bite</span>':''}</td></tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:18px;">No deployments match this filter.</td></tr>`;

  document.getElementById('view-k9-deployments').innerHTML = `
    ${!canLog ? lockedNote("You're viewing the deployment log in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <select id="depK9Filter" title="Filter deployments to a single K9"><option value="All">All K9s</option>${STATE.k9.k9s.map(k=>`<option value="${k.id}" ${f.k9===k.id?'selected':''}>${escapeHtml(k.name)}</option>`).join('')}</select>
        <select id="depTypeFilter" title="Filter deployments to a single deployment type"><option>All</option>${STATE.k9.refData.deploymentTypes.map(t=>`<option ${f.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
        <input type="date" id="depDateFrom" value="${f.dateFrom}" title="Only show deployments on or after this date">
        <input type="date" id="depDateTo" value="${f.dateTo}" title="Only show deployments on or before this date">
      </div>
      ${canLog ? `<button class="btn btn-primary" id="btnLogDeployQuick">${ICONS.plus} Log Deployment</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>K9</th><th>Handler</th><th>Date / Time</th><th>Type</th><th>Location</th><th>CAD #</th><th>Outcome</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${list.length} of ${STATE.k9.deployments.length} deployments shown</div>
  `;
  document.getElementById('depK9Filter').addEventListener('change', e=>{DEPLOY_FILTER.k9=e.target.value; renderDeployments();});
  document.getElementById('depTypeFilter').addEventListener('change', e=>{DEPLOY_FILTER.type=e.target.value; renderDeployments();});
  document.getElementById('depDateFrom').addEventListener('change', e=>{DEPLOY_FILTER.dateFrom=e.target.value; renderDeployments();});
  document.getElementById('depDateTo').addEventListener('change', e=>{DEPLOY_FILTER.dateTo=e.target.value; renderDeployments();});
  const quickBtn = document.getElementById('btnLogDeployQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>openK9DeploymentFormModal(STATE.k9.k9s[0]));
  wireK9Links();
}

/* =========================================================================
   TRAINING (suite-wide view)
   ========================================================================= */
function renderTraining(){
  if(!can('k9_training_view')){
    document.getElementById('view-k9-training').innerHTML = permissionBlockedView("You don't have permission to view training in this role.");
    return;
  }
  const canManage = can('k9_training_manage');
  const complianceRows = STATE.k9.k9s.filter(k=>k.status!=="Retired" && k.status!=="Deceased").map(k=>{
    const hrs = monthlyTrainingHours(k.id,1);
    return {k, hrs, compliant: hrs>=MONTHLY_TRAINING_HOURS_STANDARD};
  });
  const list = STATE.k9.trainingSessions.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const rows = list.map(t=>`
    <tr><td>${k9Link(t.k9Id)}</td><td>${escapeHtml(personName(t.handlerId))}</td><td>${t.date}</td><td>${escapeHtml(t.type)}</td>
    <td>${t.hours}</td><td>${escapeHtml(t.provider)}</td><td>${t.passed?'Passed':'Follow-up'}</td></tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No training sessions logged yet.</td></tr>`;

  document.getElementById('view-k9-training').innerHTML = `
    ${!canManage ? lockedNote("You're viewing training records in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Monthly Maintenance-Training Compliance</h2><span class="hint">Industry standard: ${MONTHLY_TRAINING_HOURS_STANDARD} hrs / month per K9 team (USPCA / NPCA / NAPWDA)</span></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>K9</th><th>Hours (30d)</th><th>Status</th></tr></thead><tbody>
      ${complianceRows.map(({k,hrs,compliant})=>`<tr><td>${k9Link(k.id)}</td><td>${hrs} / ${MONTHLY_TRAINING_HOURS_STANDARD}</td><td>${compliant?'<span class="badge badge-available">Compliant</span>':'<span class="badge badge-missing">Below Standard</span>'}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnLogTrainingQuick">${ICONS.plus} Log Training Session</button>` : ''}</div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>K9</th><th>Handler</th><th>Date</th><th>Type</th><th>Hours</th><th>Provider</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  const quickBtn = document.getElementById('btnLogTrainingQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>openK9TrainingFormModal(STATE.k9.k9s[0]));
  wireK9Links();
}

/* =========================================================================
   CERTIFICATIONS (suite-wide view)
   ========================================================================= */
function renderCertifications(){
  if(!can('k9_certification_view')){
    document.getElementById('view-k9-certifications').innerHTML = permissionBlockedView("You don't have permission to view certifications in this role.");
    return;
  }
  const canManage = can('k9_certification_manage');
  const today = new Date();
  const list = STATE.k9.certifications.slice().sort((a,b)=>b.certDate.localeCompare(a.certDate));
  const rows = list.map(c=>{
    const daysLeft = c.expirationDate ? daysBetween(fmt(today), c.expirationDate) : null;
    return `<tr><td>${k9Link(c.k9Id)}</td><td>${escapeHtml(c.certType)}</td><td>${escapeHtml(c.certifyingBody)}</td><td>${c.certDate}</td>
    <td>${c.expirationDate||'—'}</td><td><span class="badge ${statusBadgeClassK9(c.passFail)}">${c.passFail}</span></td>
    <td>${daysLeft==null?'—':(daysLeft<0?`<span style="color:var(--red);font-weight:700;">Expired</span>`:(daysLeft<=45?`<span style="color:var(--red);">${daysLeft}d</span>`:daysLeft+'d'))}</td></tr>`;
  }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No certifications on file.</td></tr>`;

  document.getElementById('view-k9-certifications').innerHTML = `
    ${!canManage ? lockedNote("You're viewing certifications in read-only mode.") : ""}
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnRecordCertQuick">${ICONS.plus} Record Certification</button>` : ''}</div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>K9</th><th>Type</th><th>Certifying Body</th><th>Date</th><th>Expires</th><th>Result</th><th>Time Remaining</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Industry standard is annual (re)certification for every K9 team, per USPCA / NPCA / NAPWDA guidance.</div>
  `;
  const quickBtn = document.getElementById('btnRecordCertQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>openK9CertFormModal(STATE.k9.k9s[0]));
  wireK9Links();
}

/* =========================================================================
   INCIDENTS (+ bite-ratio-by-demographics liability report)
   ========================================================================= */
let INCIDENT_FILTER = {k9:"All", type:"All", status:"All"};

function renderIncidents(){
  if(!can('k9_incident_view')){
    document.getElementById('view-k9-incidents').innerHTML = permissionBlockedView("You don't have permission to view incidents in this role.");
    return;
  }
  const canManage = can('k9_incident_manage');
  const f = INCIDENT_FILTER;
  const list = STATE.k9.incidents.filter(i=>{
    if(f.k9!=="All" && i.k9Id!==f.k9) return false;
    if(f.type!=="All" && i.type!==f.type) return false;
    if(f.status!=="All" && i.reviewStatus!==f.status) return false;
    return true;
  }).slice().sort((a,b)=>b.date.localeCompare(a.date));

  const rows = list.map(i=>`
    <tr><td>${k9Link(i.k9Id)}</td><td>${escapeHtml(personName(i.handlerId))}</td><td>${escapeHtml(i.type)}</td><td>${i.date}</td>
    <td class="mono">${escapeHtml(i.caseNumber)}</td><td><span class="badge ${statusBadgeClassK9(i.reviewStatus)}">${i.reviewStatus}</span></td>
    <td><button class="btn btn-sm btn-outline" data-view-k9inc-list="${i.id}">View</button></td></tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:18px;">No incidents match this filter.</td></tr>`;

  // Bite-ratio-by-demographics: a well-documented K9-program liability metric
  const bites = STATE.k9.incidents.filter(i=>i.type==="Bite");
  const totalApprehensions = STATE.k9.deployments.filter(d=>d.outcome==="Apprehension - No Bite" || d.outcome==="Apprehension - Bite").length;
  const biteRatio = totalApprehensions ? Math.round((bites.length/totalApprehensions)*100) : 0;
  const byRace = {};
  bites.forEach(b=>{ const key = b.subjectRace||'Not Recorded'; byRace[key] = (byRace[key]||0)+1; });

  document.getElementById('view-k9-incidents').innerHTML = `
    ${!canManage ? lockedNote("You're viewing incidents in read-only mode.") : ""}
    <div class="two-col" style="margin-bottom:16px;">
      <div class="panel">
        <div class="panel-head"><h2>Bite Ratio</h2><span class="hint">Bites as a share of apprehension deployments</span></div>
        <div class="panel-body">
          <div style="font-size:32px;font-weight:800;color:${biteRatio>20?'var(--red)':'var(--heading)'};">${biteRatio}%</div>
          <div style="font-size:12.5px;color:var(--text-dim);">${bites.length} bite incident(s) across ${totalApprehensions} apprehension deployment(s)</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">This metric is tracked by most K9 programs (per USPCA / Eden K9 Consulting liability guidance) to identify training issues early and to respond to allegations of excessive force with data.</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Bites by Subject Demographics</h2></div>
        <div class="panel-body"><div class="chart-box" style="height:180px;"><canvas id="chartBiteDemo"></canvas></div></div>
      </div>
    </div>
    <div class="toolbar">
      <div class="filters">
        <select id="incK9Filter" title="Filter incidents to a single K9"><option value="All">All K9s</option>${STATE.k9.k9s.map(k=>`<option value="${k.id}" ${f.k9===k.id?'selected':''}>${escapeHtml(k.name)}</option>`).join('')}</select>
        <select id="incTypeFilter" title="Filter incidents to a single incident type"><option>All</option>${STATE.k9.refData.incidentTypes.map(t=>`<option ${f.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
        <select id="incStatusFilter" title="Filter incidents to a single review status"><option>All</option><option>Pending</option><option>Reviewed</option><option>Cleared</option><option>Sustained</option></select>
      </div>
      ${canManage ? `<button class="btn btn-primary" id="btnRecordIncidentQuick">${ICONS.plus} Record Incident</button>` : ''}
    </div>
    <div class="panel">
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>K9</th><th>Handler</th><th>Type</th><th>Date</th><th>Case #</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  destroyChartsK9();
  CHART_REFS_K9.biteDemo = safeChart('chartBiteDemo', {
    type:'doughnut',
    data:{ labels:Object.keys(byRace), datasets:[{data:Object.values(byRace), backgroundColor:['#134DD1','#FFAC12','#D34120','#2E7D46','#8B5CF6','#B4C7CF']}] },
    options: {maintainAspectRatio:false, plugins:{legend:{position:'right', labels:{color:chartTextColor(),font:{family:'Archivo',size:10}}}}}
  });
  document.getElementById('incK9Filter').addEventListener('change', e=>{INCIDENT_FILTER.k9=e.target.value; renderIncidents();});
  document.getElementById('incTypeFilter').addEventListener('change', e=>{INCIDENT_FILTER.type=e.target.value; renderIncidents();});
  document.getElementById('incStatusFilter').addEventListener('change', e=>{INCIDENT_FILTER.status=e.target.value; renderIncidents();});
  const quickBtn = document.getElementById('btnRecordIncidentQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>openK9IncidentFormModal(null, null));
  document.querySelectorAll('[data-view-k9inc-list]').forEach(b=>b.addEventListener('click', ()=>openK9IncidentDetailModal(b.dataset.viewK9incList)));
  wireK9Links();
}

/* =========================================================================
   GPS TRACKING (suite-wide view; simulated collar telemetry)
   ========================================================================= */
function renderGps(){
  if(!can('k9_gps_view')){
    document.getElementById('view-k9-gps').innerHTML = permissionBlockedView("You don't have permission to view K9 GPS data in this role.");
    return;
  }
  const activeK9s = STATE.k9.k9s.filter(k=>k.status!=="Retired" && k.status!=="Deceased" && k.lastKnownLocation);
  document.getElementById('view-k9-gps').innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.mappin}<div>This is simulated GPS collar telemetry for demo purposes. In a full deployment, this data would stream from each K9's actual collar hardware and would also appear live on CAD's map view and on responding units' Mobile clients, so dispatch and backup officers can see K9 team location in real time.</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Last Known Locations</h2><span class="hint">${activeK9s.length} active K9 team(s) reporting</span></div>
      <div class="panel-body" style="padding:0;overflow-x:auto;">
        <table><thead><tr><th>K9</th><th>Handler</th><th>Collar ID</th><th>Location</th><th>Coordinates</th><th>Last Ping</th><th></th></tr></thead><tbody>
        ${activeK9s.map(k=>{
          const loc = k.lastKnownLocation;
          const minsAgo = Math.round((Date.now() - new Date(loc.timestamp).getTime())/60000);
          return `<tr><td>${k9Link(k.id)}</td><td>${escapeHtml(personName(k.handlerId))}</td><td class="mono">${(k.gpsCollarId?escapeHtml(k.gpsCollarId):'—')}</td>
          <td>${escapeHtml(loc.address)}</td><td class="mono">${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</td>
          <td>${minsAgo<60?minsAgo+' min ago':new Date(loc.timestamp).toLocaleString()}</td>
          <td><button class="btn btn-sm btn-outline" data-view-k9-gps="${k.id}">View History</button></td></tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-dim);padding:16px;">No active K9 teams reporting GPS data.</td></tr>`}
        </tbody></table>
      </div>
    </div>
  `;
  document.querySelectorAll('[data-view-k9-gps]').forEach(b=>b.addEventListener('click', ()=>{ K9_DETAIL_TAB='gps'; openK9Detail(b.dataset.viewK9Gps); }));
  wireK9Links();
}

/* =========================================================================
   REPORTS & ANALYTICS
   ========================================================================= */
let K9_REPORT_TARGET = "All";

function renderReports(){
  if(!can('k9_reports_view')){
    document.getElementById('view-k9-reports').innerHTML = permissionBlockedView("You don't have permission to view K9 reports in this role.");
    return;
  }
  const canExport = can('k9_reports_export');
  document.getElementById('view-k9-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Individual K9 Activity Report</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="k9ReportTarget">${STATE.k9.k9s.map(k=>`<option value="${k.id}" ${K9_REPORT_TARGET===k.id?'selected':''}>${escapeHtml(k.name)}</option>`).join('')}</select>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportK9Report">${ICONS.download} Export (CSV)</button>` : ''}
          <button class="btn btn-sm btn-outline" id="btnPrintK9Report">Print / Save as PDF</button>
        </div>
      </div>
      <div class="panel-body" id="individualK9ReportBody"></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="k9crEntity">
              <option value="deployments">Deployments</option>
              <option value="training">Training Sessions</option>
              <option value="certifications">Certifications</option>
              <option value="incidents">Incidents</option>
            </select>
            <select id="k9crGroupBy"></select>
            <select id="k9crK9"><option value="All">All K9s</option>${STATE.k9.k9s.map(k=>`<option value="${k.id}">${escapeHtml(k.name)}</option>`).join('')}</select>
            <input type="date" id="k9crDateFrom">
            <input type="date" id="k9crDateTo">
          </div>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportK9CustomReport">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
        <div class="chart-box" style="height:220px;margin-top:14px;"><canvas id="chartK9CustomReport"></canvas></div>
        <div id="k9CustomReportTable" style="margin-top:14px;overflow-x:auto;"></div>
      </div>
    </div>
  `;
  document.getElementById('k9ReportTarget').addEventListener('change', e=>{ K9_REPORT_TARGET=e.target.value; renderIndividualK9Report(); });
  document.getElementById('btnPrintK9Report').addEventListener('click', ()=>window.print());
  if(!K9_REPORT_TARGET || K9_REPORT_TARGET==="All") K9_REPORT_TARGET = STATE.k9.k9s[0].id;
  document.getElementById('k9ReportTarget').value = K9_REPORT_TARGET;
  renderIndividualK9Report();
  renderK9CustomReportBuilder();
  document.getElementById('k9crEntity').addEventListener('change', renderK9CustomReportBuilder);
  document.getElementById('k9crK9').addEventListener('change', renderK9CustomReportBuilder);
  document.getElementById('k9crDateFrom').addEventListener('change', renderK9CustomReportBuilder);
  document.getElementById('k9crDateTo').addEventListener('change', renderK9CustomReportBuilder);
}

function renderIndividualK9Report(){
  const k = k9For(K9_REPORT_TARGET);
  if(!k) return;
  const deployments = STATE.k9.deployments.filter(d=>d.k9Id===k.id).sort((a,b)=>b.date.localeCompare(a.date));
  const training = STATE.k9.trainingSessions.filter(t=>t.k9Id===k.id);
  const certs = STATE.k9.certifications.filter(c=>c.k9Id===k.id).sort((a,b)=>b.certDate.localeCompare(a.certDate));
  const incidents = STATE.k9.incidents.filter(i=>i.k9Id===k.id);
  const totalHours = training.reduce((s,t)=>s+t.hours,0);
  const bites = incidents.filter(i=>i.type==="Bite").length;

  document.getElementById('individualK9ReportBody').innerHTML = `
    <div class="detail-grid" style="margin-bottom:14px;">
      <div><div class="k">K9</div><div class="v">${escapeHtml(k.name)} (${escapeHtml(k.breed)})</div></div>
      <div><div class="k">Handler</div><div class="v">${escapeHtml(personName(k.handlerId))}</div></div>
      <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClassK9(k.status)}">${k.status}</span></div></div>
      <div><div class="k">Total Deployments on File</div><div class="v">${deployments.length}</div></div>
      <div><div class="k">Total Training Hours on File</div><div class="v">${totalHours}</div></div>
      <div><div class="k">Bite Incidents on File</div><div class="v">${bites}</div></div>
      <div><div class="k">Active Certifications</div><div class="v">${certs.filter(c=>c.expirationDate && c.expirationDate>=fmt(new Date())).length}</div></div>
      <div><div class="k">30-Day Training Compliance</div><div class="v">${monthlyTrainingHours(k.id,1)} / ${MONTHLY_TRAINING_HOURS_STANDARD} hrs</div></div>
    </div>
    <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Deployment History</h2></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Type</th><th>Location</th><th>Outcome</th></tr></thead><tbody>
      ${deployments.map(d=>`<tr><td>${d.date}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.location)}</td><td>${escapeHtml(d.outcome)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px;">No deployments on file.</td></tr>`}
      </tbody></table></div>
    </div>
    <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Certification History</h2></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Type</th><th>Body</th><th>Date</th><th>Result</th></tr></thead><tbody>
      ${certs.map(c=>`<tr><td>${escapeHtml(c.certType)}</td><td>${escapeHtml(c.certifyingBody)}</td><td>${c.certDate}</td><td><span class="badge ${statusBadgeClassK9(c.passFail)}">${c.passFail}</span></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px;">No certifications on file.</td></tr>`}
      </tbody></table></div>
    </div>
  `;
  const exportBtn = document.getElementById('btnExportK9Report');
  if(exportBtn) exportBtn.onclick = ()=>{
    const headers = ["Section","Date","Type","Detail","Outcome/Result"];
    const csvRows = [
      ...deployments.map(d=>["Deployment", d.date, d.type, d.location, d.outcome]),
      ...training.map(t=>["Training", t.date, t.type, t.provider, t.hours+"h"]),
      ...certs.map(c=>["Certification", c.certDate, c.certType, c.certifyingBody, c.passFail]),
      ...incidents.map(i=>["Incident", i.date, i.type, i.caseNumber, i.reviewStatus]),
    ];
    exportCsvK9(headers, csvRows, `${k.name.replace(/\s+/g,'_')}_activity_report.csv`);
  };
}

const K9_REPORT_GROUPBY = {
  deployments: [['type','Type'],['outcome','Outcome'],['location','Location']],
  training: [['type','Type'],['provider','Provider']],
  certifications: [['certType','Cert Type'],['certifyingBody','Certifying Body'],['passFail','Result']],
  incidents: [['type','Type'],['reviewStatus','Review Status']],
};

function renderK9CustomReportBuilder(){
  const entity = document.getElementById('k9crEntity').value;
  const groupSel = document.getElementById('k9crGroupBy');
  const opts = K9_REPORT_GROUPBY[entity];
  const currentGroup = groupSel.dataset.current;
  const groupBy = (currentGroup && opts.find(([k])=>k===currentGroup)) ? currentGroup : opts[0][0];
  groupSel.innerHTML = opts.map(([k,label])=>`<option value="${k}" ${groupBy===k?'selected':''}>Group by ${label}</option>`).join('');
  groupSel.onchange = ()=>{ groupSel.dataset.current = groupSel.value; renderK9CustomReportBuilder(); };
  groupSel.dataset.current = groupBy;

  const k9Filter = document.getElementById('k9crK9').value;
  const dateFrom = document.getElementById('k9crDateFrom').value;
  const dateTo = document.getElementById('k9crDateTo').value;

  let dataset;
  if(entity==='deployments') dataset = STATE.k9.deployments.map(d=>({...d, __date:d.date}));
  else if(entity==='training') dataset = STATE.k9.trainingSessions.map(t=>({...t, __date:t.date}));
  else if(entity==='certifications') dataset = STATE.k9.certifications.map(c=>({...c, __date:c.certDate}));
  else dataset = STATE.k9.incidents.map(i=>({...i, __date:i.date}));

  dataset = dataset.filter(row=>{
    if(k9Filter!=="All" && row.k9Id!==k9Filter) return false;
    if(dateFrom && row.__date < dateFrom) return false;
    if(dateTo && row.__date > dateTo) return false;
    return true;
  });

  const counts = {};
  dataset.forEach(row=>{ const key = row[groupBy] || 'Unspecified'; counts[key] = (counts[key]||0)+1; });

  if(CHART_REFS_K9.custom) CHART_REFS_K9.custom.destroy();
  CHART_REFS_K9.custom = safeChart('chartK9CustomReport', {
    type:'bar',
    data:{ labels:Object.keys(counts), datasets:[{label:'Count', data:Object.values(counts), backgroundColor:'#134DD1'}] },
    options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}},grid:{color:chartGridColor()}}}}
  });

  const groupLabel = opts.find(([k])=>k===groupBy)[1];
  const tableRows = dataset.slice(0,200).map(row=>`<tr><td>${row.k9Id?k9Link(row.k9Id):''}</td><td>${escapeHtml(String(row[groupBy]||''))}</td><td>${escapeHtml(row.__date||'')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
  document.getElementById('k9CustomReportTable').innerHTML = `
    <table><thead><tr><th>K9</th><th>${groupLabel}</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length>200?' (showing first 200)':''}</div>
  `;
  wireK9Links();

  const exportBtn = document.getElementById('btnExportK9CustomReport');
  if(exportBtn) exportBtn.onclick = ()=>exportCsvK9(
    ["K9", groupLabel, "Date"],
    dataset.map(row=>[row.k9Id?k9For(row.k9Id).name:'', row[groupBy]||'', row.__date||'']),
    `k9_custom_report_${entity}.csv`
  );
}

function exportCsvK9(headers, rows, filename){
  const csv = [headers, ...rows].map(r=>r.map(v=>csvSafeCell(v)).join(',')).join('\\n');
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
let ADMIN_TAB = 'breeds';
const SIMPLE_LIST_TABS = {
  breeds: {label:'Breeds', usageCheck:(v)=>STATE.k9.k9s.filter(k=>k.breed===v).length},
  skillsCatalog: {label:'Skills / Disciplines', usageCheck:(v)=>STATE.k9.k9s.filter(k=>k.skills.includes(v)).length},
  certTypes: {label:'Certification Types', usageCheck:(v)=>STATE.k9.certifications.filter(c=>c.certType===v).length},
  certifyingBodies: {label:'Certifying Bodies', usageCheck:(v)=>STATE.k9.certifications.filter(c=>c.certifyingBody===v).length},
  deploymentTypes: {label:'Deployment Types', usageCheck:(v)=>STATE.k9.deployments.filter(d=>d.type===v).length},
  deploymentOutcomes: {label:'Deployment Outcomes', usageCheck:(v)=>STATE.k9.deployments.filter(d=>d.outcome===v).length},
  trainingTypes: {label:'Training Types', usageCheck:(v)=>STATE.k9.trainingSessions.filter(t=>t.type===v).length},
  trainingProviders: {label:'Training Providers', usageCheck:(v)=>STATE.k9.trainingSessions.filter(t=>t.provider===v).length},
  incidentTypes: {label:'Incident Types', usageCheck:(v)=>STATE.k9.incidents.filter(i=>i.type===v).length},
};

function renderAdmin(){
  const canManage = can('k9_admin_categories');
  const canAudit = can('k9_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-k9-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){
    Object.entries(SIMPLE_LIST_TABS).forEach(([key,cfg])=>tabs.push([key,cfg.label]));
    tabs.push(['notifications','Notification Routing']);
  }
  if(can('k9_bulk_import')) tabs.push(['bulkImport','Bulk Import']);
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-k9-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab-k9="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyK9"></div>
  `;
  document.querySelectorAll('[data-admin-tab-k9]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTabK9; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBodyK9');
  if(SIMPLE_LIST_TABS[ADMIN_TAB]) renderSimpleListTab(body, ADMIN_TAB);
  else if(ADMIN_TAB==='notifications') renderNotificationRoutingTab(body);
  else if(ADMIN_TAB==='bulkImport') renderBulkImportTab(body, 'k9');
  else if(ADMIN_TAB==='audit') renderPlatformAuditLogTab(body);
}

function renderSimpleListTab(body, key){
  const cfg = SIMPLE_LIST_TABS[key];
  const list = STATE.k9.refData[key];
  const rows = list.map((v,i)=>{
    const inUse = cfg.usageCheck(v);
    return `<tr><td>${escapeHtml(v)}</td><td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item-k9="${i}">${ICONS.trash}</button></td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputK9" placeholder="Add a new ${cfg.label.toLowerCase().replace(/s$/,'')}..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemK9">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddItemK9').addEventListener('click', ()=>{
    const val = document.getElementById('newItemInputK9').value.trim();
    if(!val){ toast("Enter a value first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-item-k9]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeItemK9); const val = list[idx];
    if(cfg.usageCheck(val)>0){ toast(`Can't remove "${val}" \u2014 it's in use.`, true); return; }
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
        <div class="form-row"><label>Vaccination Due Alerts</label><select id="fRouteK9Vax">${roleOpts(STATE.k9.notifySettings.vaccineDueRoleId)}</select></div>
        <div class="form-row"><label>Certification Expiring Alerts</label><select id="fRouteK9Cert">${roleOpts(STATE.k9.notifySettings.certExpiringRoleId)}</select></div>
        <div class="form-row"><label>Training Compliance Shortfall Alerts</label><select id="fRouteK9Train">${roleOpts(STATE.k9.notifySettings.trainingComplianceRoleId)}</select></div>
        <div class="form-row"><label>Retirement Alerts</label><select id="fRouteK9Retire">${roleOpts(STATE.k9.notifySettings.retirementRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingK9">Save Routing</button>
      </div>
    </div>
  `;
  document.getElementById('btnSaveRoutingK9').addEventListener('click', ()=>{
    STATE.k9.notifySettings.vaccineDueRoleId = document.getElementById('fRouteK9Vax').value;
    STATE.k9.notifySettings.certExpiringRoleId = document.getElementById('fRouteK9Cert').value;
    STATE.k9.notifySettings.trainingComplianceRoleId = document.getElementById('fRouteK9Train').value;
    STATE.k9.notifySettings.retirementRoleId = document.getElementById('fRouteK9Retire').value;
    logActivity("Updated K9 notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

/* =========================================================================
   MODULE ENTRY POINT
   ========================================================================= */
function startK9Module(){
  renderNav();
  switchView('k9-dashboard');
}
window.K9 = { start: startK9Module, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openK9Detail, k9For, monthlyTrainingHours, MONTHLY_TRAINING_HOURS_STANDARD };

})();


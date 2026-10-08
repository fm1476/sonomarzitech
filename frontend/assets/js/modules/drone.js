/* =========================================================================
   DRONE MANAGEMENT MODULE (IIFE-scoped; reads/writes STATE.drone and shared roles/personnel)
   ========================================================================= */
(function(){

const AVATAR_DRONES = {
  m30t: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRDhDREJBIi8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzNBM0EzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjM0EzQTNBIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiMzQTNBM0EiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzNBM0EzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkFDMTIiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGQUMxMiIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkZBQzEyIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiNGRkFDMTIiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjM0EzQTNBIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjRkZBQzEyIi8+CiAgPC9zdmc+",
  m350: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRENFNEU4Ii8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzI0MzY0RSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjMjQzNjRFIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiMyNDM2NEUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzI0MzY0RSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMxMzRERDEiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzEzNEREMSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTM0REQxIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMxMzRERDEiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjMjQzNjRFIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjMTM0REQxIi8+CiAgPC9zdmc+",
  x10: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRThFNEYwIi8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzRBM0Y2QiIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjNEEzRjZCIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiM0QTNGNkIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzRBM0Y2QiIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjVDRjYiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhCNUNGNiIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEI1Q0Y2IiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjVDRjYiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjNEEzRjZCIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjOEI1Q0Y2Ii8+CiAgPC9zdmc+",
  mini4: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRTRFRUU0Ii8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzNBM0EzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjM0EzQTNBIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiMzQTNBM0EiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzNBM0EzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMyRTdENDYiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJFN0Q0NiIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkU3RDQ2IiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMyRTdENDYiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjM0EzQTNBIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjMkU3RDQ2Ii8+CiAgPC9zdmc+",
  lemur2: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRjBEQ0RDIi8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzVDMUExQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjNUMxQTFBIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiM1QzFBMUEiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzVDMUExQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiNEMzQxMjAiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0QzNDEyMCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRDM0MTIwIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiNEMzQxMjAiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjNUMxQTFBIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjRDM0MTIwIi8+CiAgPC9zdmc+",
  fotokite: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICAgIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSIjRENFOEU0Ii8+CiAgICA8bGluZSB4MT0iMjgiIHkxPSIyOCIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzFBNEEzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxsaW5lIHgxPSI3MiIgeTE9IjI4IiB4Mj0iNTAiIHkyPSI1MCIgc3Ryb2tlPSIjMUE0QTNBIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogICAgPGxpbmUgeDE9IjI4IiB5MT0iNzIiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiMxQTRBM0EiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgICA8bGluZSB4MT0iNzIiIHkxPSI3MiIgeDI9IjUwIiB5Mj0iNTAiIHN0cm9rZT0iIzFBNEEzQSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICAgIDxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMyRTdEOUUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPGNpcmNsZSBjeD0iNzIiIGN5PSIyOCIgcj0iMTMiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzJFN0Q5RSIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgICA8Y2lyY2xlIGN4PSIyOCIgY3k9IjcyIiByPSIxMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMkU3RDlFIiBzdHJva2Utd2lkdGg9IjMiLz4KICAgIDxjaXJjbGUgY3g9IjcyIiBjeT0iNzIiIHI9IjEzIiBmaWxsPSJub25lIiBzdHJva2U9IiMyRTdEOUUiIHN0cm9rZS13aWR0aD0iMyIvPgogICAgPHJlY3QgeD0iMzgiIHk9IjQwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjAiIHJ4PSI1IiBmaWxsPSIjMUE0QTNBIi8+CiAgICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1IiBmaWxsPSIjMkU3RDlFIi8+CiAgPC9zdmc+",
};

const DRONE_MAKES_MODELS = ["DJI Matrice 30T","DJI Matrice 350 RTK","DJI Mini 4 Pro","Skydio X10","Skydio X2","BRINC Lemur 2","Fotokite Sigma (Tethered)","Autel EVO Max 4T","Parrot Anafi USA Gov"];
const DRONE_CATEGORIES = ["Multi-Rotor","Tethered","Fixed-Wing"];
const DRONE_STATUSES = ["Ready","Deployed","Charging","Maintenance","Grounded","Retired"];
const SENSOR_PAYLOADS = ["Zoom Camera","Thermal / FLIR","Spotlight","Loudspeaker (LRAD)","Winch / Delivery","LiDAR","Multispectral"];
const MISSION_TYPES = ["DFR Response","Patrol Overwatch","Search and Rescue","Traffic Crash Reconstruction","Tactical / SWAT Support",
  "Search Warrant Support","Training","Public Event Safety","Infrastructure Inspection","Fire / HazMat Support"];
const AIRSPACE_AUTH_TYPES = ["Class G (Uncontrolled)","LAANC Authorization","COA (Certificate of Authorization)","Part 91 Public Aircraft Operation","TFR Coordination"];
const WAIVER_TYPES = ["Night Operations (107.29)","Beyond Visual Line of Sight (BVLOS)","Flights Over People (107.39)","Part 91 Public Aircraft COA","Operations Over Moving Vehicles"];
const MAINT_TYPES_DRONE = ["Firmware Update","Battery Replacement","Propeller Replacement","Gimbal Calibration","Sensor / Camera Repair","Compass / IMU Calibration","Scheduled Inspection","Dock Servicing"];
const INCIDENT_TYPES_DRONE = ["Crash","Flyaway","Hard Landing","Lost Link","Airspace Violation","Near-Miss (Manned Aircraft)","Privacy Complaint","Equipment Failure","Other"];
const DOCK_LOCATIONS = ["HQ Rooftop Dock","North Substation Dock","South Substation Dock","Patrol Vehicle - Mobile Dock","Evidence/Storage Locker"];

function defaultRefDataDrone(){
  return {
    makesModels: [...DRONE_MAKES_MODELS], categories: [...DRONE_CATEGORIES], statuses: [...DRONE_STATUSES],
    sensorPayloads: [...SENSOR_PAYLOADS], missionTypes: [...MISSION_TYPES], airspaceAuthTypes: [...AIRSPACE_AUTH_TYPES],
    waiverTypes: [...WAIVER_TYPES], maintTypes: [...MAINT_TYPES_DRONE], incidentTypes: [...INCIDENT_TYPES_DRONE],
    dockLocations: [...DOCK_LOCATIONS],
  };
}
const DFR_RESPONSE_TARGET_SECONDS = 90; // Chula Vista PD reference model: airborne over the scene within 90 seconds

/* =========================================================================
   SEED DATA
   ========================================================================= */
function droneAvatarKey(model){
  if(model.includes("M30T")) return "m30t";
  if(model.includes("350")) return "m350";
  if(model.includes("Mini")) return "mini4";
  if(model.includes("X10") || model.includes("X2")) return "x10";
  if(model.includes("Lemur")) return "lemur2";
  if(model.includes("Fotokite")) return "fotokite";
  return null;
}

function seedDrones(){
  const today = new Date();
  const defs = [
    ["d1","Falcon-1","DJI Matrice 30T","Multi-Rotor","2023-08-01","p2","HQ Rooftop Dock","Ready","N930FA",["Zoom Camera","Thermal / FLIR"],41],
    ["d2","Falcon-2","DJI Matrice 350 RTK","Multi-Rotor","2024-02-15","p6","North Substation Dock","Ready","N935FB",["Zoom Camera","Thermal / FLIR","Winch / Delivery"],55],
    ["d3","Raven-1","Skydio X10","Multi-Rotor","2024-11-01","p1","HQ Rooftop Dock","Deployed","N941RV",["Zoom Camera","Thermal / FLIR","Spotlight"],35],
    ["d4","Scout-1","DJI Mini 4 Pro","Multi-Rotor","2022-05-10","p3","South Substation Dock","Charging","N922SC",["Zoom Camera"],34],
    ["d5","Talon-1","BRINC Lemur 2","Multi-Rotor","2024-06-20","p5","Evidence/Storage Locker","Maintenance","N944TL",["Spotlight","Loudspeaker (LRAD)"],22],
    ["d6","Sentinel-1","Fotokite Sigma (Tethered)","Tethered","2021-09-05","p2","HQ Rooftop Dock","Retired","N918SN",["Spotlight"],0],
  ];
  return defs.map(([id,name,model,category,dateAcquired,operatorId,dock,status,nNumber,sensors,maxFlightMin])=>{
    const avatarKey = droneAvatarKey(model);
    return {
      id, name, photoDataUrl: avatarKey ? AVATAR_DRONES[avatarKey] : null, make: model.split(' ')[0], model, category,
      serialNumber: "SN"+Math.floor(100000+Math.random()*899999), faaRegistrationNumber: nNumber,
      remoteIdCompliant: true, dateAcquired, vendor: "Vetted UAS Solutions Inc.", purchasePrice: 8500+Math.floor(Math.random()*22000),
      status, assignedOperatorId: operatorId, homeDock: dock, sensorPayload: sensors, maxFlightTimeMin: maxFlightMin,
      totalFlightHours: Math.round((20+Math.random()*180)*10)/10, totalFlights: Math.floor(30+Math.random()*220),
      batteries: [
        {id:'bat1', cycles: Math.floor(20+Math.random()*180), healthPct: Math.floor(72+Math.random()*26), lastCharged: fmt(addDays(today,-Math.floor(Math.random()*3)))},
        {id:'bat2', cycles: Math.floor(20+Math.random()*180), healthPct: Math.floor(72+Math.random()*26), lastCharged: fmt(addDays(today,-Math.floor(Math.random()*3)))},
      ],
      registrationExpiration: fmt(addDays(today, status==="Retired" ? -30 : (200+Math.floor(Math.random()*700)))),
      retirementDate: status==="Retired" ? fmt(addDays(today,-45)) : null,
      notes:"", fieldHistory:[],
    };
  });
}

function seedOperators(){
  const today = new Date();
  const defs = [
    ["p1", "RP-2024-88301", -500, 24, ["Beyond Visual Line of Sight (BVLOS)","Night Operations (107.29)"]],
    ["p2", "RP-2023-71144", -700, 24, ["Night Operations (107.29)"]],
    ["p3", "RP-2024-90210", -300, 24, []],
    ["p5", "RP-2022-55019", -800, 24, ["Beyond Visual Line of Sight (BVLOS)","Part 91 Public Aircraft COA"]],
    ["p6", "RP-2025-10233", -60, 24, []],
  ];
  return defs.map(([personId, certNumber, issueDaysAgo, currencyMonths, waiverTypes])=>{
    const certIssueDate = fmt(addDays(today, issueDaysAgo));
    return {
      personId, certNumber, certIssueDate,
      certExpiration: fmt(addDays(new Date(certIssueDate), currencyMonths*30)),
      recurrentTrainingDate: fmt(addDays(today, -Math.floor(Math.random()*300))),
      totalFlightHours: Math.round((15+Math.random()*140)*10)/10, totalFlights: Math.floor(20+Math.random()*180),
      waivers: waiverTypes.map((wt,i)=>({
        id:'wv_'+personId+'_'+i, type: wt, issueDate: fmt(addDays(today,-Math.floor(100+Math.random()*300))),
        expirationDate: fmt(addDays(today, Math.floor(-30+Math.random()*400))), status:"Active",
      })),
      fieldHistory: [],
    };
  });
}

function seedFlights(){
  const today = new Date();
  const rows = [
    ["d1","p2","DFR Response",-1,"CAD-2026-09301","445 Commerce St - Alarm Call",62,8,320,"Cleared - false alarm confirmed via aerial view before officer arrival.",true],
    ["d1","p2","Patrol Overwatch",-3,"CAD-2026-09210","Downtown Reno corridor",null,45,280,"Routine overwatch during large public gathering.",false],
    ["d2","p6","Search and Rescue",-5,"CAD-2026-09150","Truckee River Greenbelt",null,52,410,"Located missing person via thermal camera near riverbank; EMS dispatched.",false],
    ["d2","p6","Traffic Crash Reconstruction",-8,"CAD-2026-09080","I-80 / Exit 14",null,22,180,"Aerial mapping of multi-vehicle collision scene for reconstruction unit.",false],
    ["d3","p1","DFR Response",-1,"CAD-2026-09305","1200 block of 4th St - Shots Fired",71,12,350,"First unit on scene; provided live video to responding patrol units.",true],
    ["d3","p1","Tactical / SWAT Support",-12,"CAD-2026-08990","Barricaded subject, Wells Ave",null,68,420,"Extended overwatch during barricade situation; battery swap mid-mission.",false],
    ["d4","p3","Training",-2,"N/A","K9 Training Facility",null,18,120,"Routine currency flight and pattern practice.",false],
    ["d4","p3","Public Event Safety",-15,"N/A","Downtown Reno - Parade Route",null,40,300,"Overwatch coverage for annual parade event.",false],
    ["d5","p5","Search Warrant Support",-20,"CAD-2026-08750","Residential warrant service, Sparks",null,15,150,"Pre-entry perimeter check prior to warrant service.",false],
    ["d6","p2","Fire / HazMat Support",-200,"CAD-2025-04410","Industrial fire, South Reno",null,90,600,"Tethered overwatch and scene lighting during extended fire operation.",false],
  ];
  return rows.map(([droneId,operatorId,missionType,daysAgo,cad,location,dispatchSec,durationMin,maxAlt,narrative,dfr],i)=>({
    id:"flt"+(i+1), droneId, operatorId, date: fmt(addDays(today,daysAgo)), time:"14:"+String(10+i*3).padStart(2,'0'),
    missionType, cadNumber:cad, location, dispatchToAirborneSeconds: dispatchSec, durationMin, maxAltitudeFt: maxAlt,
    outcome: dfr ? "Resolved without ground unit deployment" : "Mission complete", videoEvidenceLinked: true,
    weatherConditions:"Clear, winds < 10mph", airspaceAuthorization: STATE_AIRSPACE_DEFAULT, narrative,
  }));
}
const STATE_AIRSPACE_DEFAULT = "Class G (Uncontrolled)";

function seedMaintenanceDrone(){
  const today = new Date();
  return [
    {id:"dmx1", droneId:"d5", date: fmt(addDays(today,-3)), type:"Sensor / Camera Repair", technician:"Vetted UAS Solutions Inc.", cost:850, notes:"Gimbal camera replaced after hard-landing damage.", groundedDuring:true},
    {id:"dmx2", droneId:"d1", date: fmt(addDays(today,-20)), type:"Firmware Update", technician:"In-House UAS Tech", cost:0, notes:"Routine firmware update to latest stable release.", groundedDuring:false},
    {id:"dmx3", droneId:"d2", date: fmt(addDays(today,-35)), type:"Propeller Replacement", technician:"In-House UAS Tech", cost:120, notes:"Preventive propeller replacement at manufacturer-recommended interval.", groundedDuring:false},
    {id:"dmx4", droneId:"d6", date: fmt(addDays(today,-50)), type:"Scheduled Inspection", technician:"Vetted UAS Solutions Inc.", cost:200, notes:"Pre-retirement inspection; tether line showing wear, recommend retirement.", groundedDuring:true},
  ];
}

function seedIncidentsDrone(){
  const today = new Date();
  return [
    {id:"dinc1", droneId:"d5", operatorId:"p5", date: fmt(addDays(today,-3)), type:"Hard Landing", caseNumber:"UAS-2026-0012",
      description:"Hard landing during return-to-home after low battery warning; gimbal camera housing cracked on impact.",
      faaReportable:false, outcome:"Non-reportable; repaired in-house budget", reviewStatus:"Cleared", reviewedBy:"Lt. Robert Hayes", reviewDate: fmt(addDays(today,-1))},
    {id:"dinc2", droneId:"d3", operatorId:"p1", date: fmt(addDays(today,-45)), type:"Lost Link", caseNumber:"UAS-2025-0044",
      description:"Momentary lost-link event during BVLOS training flight; aircraft executed automated return-to-home per lost-link procedure with no incident.",
      faaReportable:false, outcome:"Within normal lost-link failsafe behavior", reviewStatus:"Reviewed", reviewedBy:"Sgt. Maria Torres", reviewDate: fmt(addDays(today,-40))},
  ];
}

/* =========================================================================
   STATE LIFECYCLE
   ========================================================================= */
function buildData(){
  return {
    drones: seedDrones(),
    operators: seedOperators(),
    flights: seedFlights(),
    maintenanceRecords: seedMaintenanceDrone(),
    incidents: seedIncidentsDrone(),
    refData: defaultRefDataDrone(),
    notifications: [],
    notifySettings: { certExpiringRoleId:"role_admin", registrationExpiringRoleId:"role_admin", waiverExpiringRoleId:"role_admin", maintenanceRoleId:"role_admin" },
    activity: [],
    dashboardPrefs: {}, // personId -> { topOrder:[ids...], extras:[{id,size}...] } -- each user's own configurable dashboard
  };
}

function migrateData(){
  if(!STATE.drone.refData) STATE.drone.refData = defaultRefDataDrone();
  if(!STATE.drone.notifications) STATE.drone.notifications = [];
  if(!STATE.drone.notifySettings) STATE.drone.notifySettings = { certExpiringRoleId: STATE.roles[0].id, registrationExpiringRoleId: STATE.roles[0].id, waiverExpiringRoleId: STATE.roles[0].id, maintenanceRoleId: STATE.roles[0].id };
  if(!STATE.drone.incidents) STATE.drone.incidents = [];
  if(!STATE.drone.dashboardPrefs) STATE.drone.dashboardPrefs = {};
  STATE.drone.drones.forEach(d=>{
    if(!d.fieldHistory) d.fieldHistory = [];
    if(!d.batteries) d.batteries = [];
    if(!d.sensorPayload) d.sensorPayload = [];
  });
  STATE.drone.operators.forEach(o=>{
    if(!o.waivers) o.waivers = [];
    if(!o.fieldHistory) o.fieldHistory = [];
  });
}

function logActivity(text, entityType, entityId){
  STATE.drone.activity.push({ts: fmt(new Date()), text, entityType: entityType||"general", entityId: entityId||null});
  logAuditEntry('Drone', text, entityType);
}

function droneFor(id){ return STATE.drone.drones.find(d=>d.id===id); }
function operatorFor(personId){ return STATE.drone.operators.find(o=>o.personId===personId); }
function ensureOperator(personId){
  let o = operatorFor(personId);
  if(!o){
    o = { personId, certNumber:"", certIssueDate:"", certExpiration:"", recurrentTrainingDate:"", totalFlightHours:0, totalFlights:0, waivers:[], fieldHistory:[] };
    STATE.drone.operators.push(o);
  }
  return o;
}
function recordFieldChangeDrone(entity, field, oldVal, newVal){
  if(JSON.stringify(oldVal)===JSON.stringify(newVal)) return;
  entity.fieldHistory.push({
    date: fmt(new Date()), field, before: oldVal, after: newVal,
    changedBy: (STATE.personnel.find(p=>p.id===CURRENT_USER_ID)||{}).name || 'System',
  });
}
function operatorCurrent(o){ return o.certExpiration && o.certExpiration >= fmt(new Date()); }

/* =========================================================================
   NAV
   ========================================================================= */
const NAV_ITEMS = [
  // Drone Management is dashboard-first. All operational destinations remain
  // permission-aware and are launched from the dashboard rather than the sidebar.
  {id:"drone-dashboard", label:"Dashboard", icon:"dashboard", title:"Dashboard", sub:"Fleet status and mission activity at a glance", requiredAbility:null, hideFromSidebar:true},
  {id:"drone-fleet", label:"Drone Fleet", icon:"drone", title:"Drone Fleet", sub:"Every aircraft, its status, and its assigned operator", requiredAbility:"drone_fleet_view", hideFromSidebar:true},
  {id:"drone-operators", label:"Operators", icon:"users", title:"Operators", sub:"Certified remote pilots, currency, and waivers", requiredAbility:"drone_operator_view", hideFromSidebar:true},
  {id:"drone-flights", label:"Flight Log", icon:"bookopen", title:"Flight Log", sub:"Chronological record of every mission flown", requiredAbility:"drone_flight_view", hideFromSidebar:true},
  {id:"drone-maintenance", label:"Maintenance", icon:"wrench", title:"Maintenance", sub:"Service history and battery health for the fleet", requiredAbility:"drone_maint_view", hideFromSidebar:true},
  {id:"drone-incidents", label:"Incidents", icon:"alert", title:"Incidents", sub:"Crashes, flyaways, and reviewable incidents", requiredAbility:"drone_incident_view", hideFromSidebar:true},
  {id:"drone-reports", label:"Reports", icon:"chart", title:"Reports & Analytics", sub:"Individual aircraft activity and configurable analytics", requiredAbility:"drone_reports_view", hideFromSidebar:true},
  {id:"drone-admin", label:"Admin", icon:"gear", title:"Administration", sub:"Reference data, agency authorizations, and the system audit log", requiredAbility:["drone_admin_categories","drone_admin_audit"], hideFromSidebar:true},
];
let ACTIVE_VIEW = "drone-dashboard";

function navItemVisible(item){
  if(!can('module_drone')) return false;
  if(!item) return false;
  if(!item.requiredAbility) return true;
  if(Array.isArray(item.requiredAbility)) return item.requiredAbility.some(a=>can(a));
  return can(item.requiredAbility);
}
function renderNav(){
  // Drone Management is dashboard-first. Clear the legacy module submenu entirely;
  // every destination is available from the dashboard hub.
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
  if(id!=="drone-dashboard"){
    const root = document.getElementById('view-'+id);
    if(root && !root.querySelector('[data-module-dashboard-back]')){
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'btn btn-outline';
      back.dataset.moduleDashboardBack = '1';
      back.innerHTML = '&#8592; Back to Dashboard';
      back.style.marginBottom = '16px';
      back.addEventListener('click', ()=>switchView('drone-dashboard'));
      root.prepend(back);
    }
  }
}
function renderView(id){
  if(id==="drone-dashboard") renderDashboard();
  else if(id==="drone-fleet") renderFleet();
  else if(id==="drone-operators") renderOperators();
  else if(id==="drone-flights") renderFlights();
  else if(id==="drone-maintenance") renderMaintenance();
  else if(id==="drone-incidents") renderIncidents();
  else if(id==="drone-reports") renderReports();
  else if(id==="drone-admin") renderAdmin();
}

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function recalcNotifications(){
  const today = new Date();
  const upcoming = [];
  STATE.drone.drones.filter(d=>d.status!=="Retired").forEach(d=>{
    if(d.registrationExpiration){
      const days = daysBetween(fmt(today), d.registrationExpiration);
      if(days<=45) upcoming.push({type:"registration_expiring", entityId:d.id, message:`${d.name}'s FAA registration ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'} (${d.registrationExpiration}).`, recipientRoleId: STATE.drone.notifySettings.registrationExpiringRoleId});
    }
    d.batteries.forEach(b=>{
      if(b.healthPct < 80) upcoming.push({type:"battery_health", entityId:d.id, message:`${d.name}'s battery (${b.id}) is at ${b.healthPct}% health after ${b.cycles} cycles \u2014 consider replacement.`, recipientRoleId: STATE.drone.notifySettings.maintenanceRoleId});
    });
  });
  STATE.drone.operators.forEach(o=>{
    if(o.certExpiration){
      const days = daysBetween(fmt(today), o.certExpiration);
      if(days<=45) upcoming.push({type:"cert_expiring", entityId:o.personId, message:`${personName(o.personId)}'s Part 107 certificate ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'} (${o.certExpiration}).`, recipientRoleId: STATE.drone.notifySettings.certExpiringRoleId});
    }
    o.waivers.forEach(w=>{
      if(w.expirationDate){
        const days = daysBetween(fmt(today), w.expirationDate);
        if(days<=30) upcoming.push({type:"waiver_expiring", entityId:o.personId, message:`${personName(o.personId)}'s ${w.type} waiver ${days<0?'expired '+Math.abs(days)+' days ago':'expires in '+days+' days'}.`, recipientRoleId: STATE.drone.notifySettings.waiverExpiringRoleId});
      }
    });
  });
  const prevReadBy = {};
  STATE.drone.notifications.forEach(n=>{ prevReadBy[n.type+'|'+n.entityId] = n.readBy || []; });
  STATE.drone.notifications = upcoming.map(n=>({
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
function statusColorDrone(status){
  return {"Ready":"var(--green)","Deployed":"var(--blue)","Charging":"var(--gold)","Maintenance":"#9A6B00","Grounded":"var(--red)","Retired":"var(--text-dim)"}[status] || "var(--text-dim)";
}
function statusBadgeClassDrone(status){
  return {
    "Ready":"badge-available","Deployed":"badge-assigned","Charging":"badge-role","Maintenance":"badge-maintenance","Grounded":"badge-missing","Retired":"badge-retired",
    "Active":"badge-available","Expired":"badge-missing","Cleared":"badge-available","Reviewed":"badge-assigned","Pending":"badge-assigned","Sustained":"badge-missing",
  }[status] || "badge-role";
}
function droneLink(droneId){
  const d = droneFor(droneId);
  return `<a href="#" data-open-drone="${droneId}" class="record-link">${escapeHtml(d?d.name:'Unknown')}</a>`;
}
function wireDroneLinks(){
  document.querySelectorAll('[data-open-drone]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openDroneDetail(a.dataset.openDrone); }));
}
function operatorLink(personId){
  return `<a href="#" data-open-operator="${personId}" class="record-link">${escapeHtml(personName(personId))}</a>`;
}
function wireOperatorLinks(){
  document.querySelectorAll('[data-open-operator]').forEach(a=>a.addEventListener('click', (ev)=>{ ev.preventDefault(); openOperatorDetail(a.dataset.openOperator); }));
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
let CHART_REFS_DRONE = {};
function destroyChartsDrone(){ Object.values(CHART_REFS_DRONE).forEach(c=>c && c.destroy()); CHART_REFS_DRONE = {}; }

const TOP_WIDGETS = [
  {id:"stat_total_drones", label:"Total Drones"},
  {id:"stat_flight_hours_30d", label:"Flight Hours (30 days)"},
  {id:"stat_active_operators", label:"Active Operators"},
  {id:"stat_maintenance_due", label:"Maintenance Due"},
  {id:"stat_incidents_30d", label:"Incidents (30 days)"},
];
const EXTRA_WIDGETS = [
  {id:"list_fleet_status_board", label:"Drone Fleet Status", defaultSize:"full"},
  {id:"chart_missions_by_type", label:"Missions by Type", defaultSize:"half"},
  {id:"list_recent_flights", label:"Recent Flights", defaultSize:"half"},
];
const DEFAULT_EXTRAS = EXTRA_WIDGETS.map(w=>({id:w.id, size:w.defaultSize}));
function myWidgetPrefs(){
  let p = STATE.drone.dashboardPrefs[CURRENT_USER_ID];
  const topIds = TOP_WIDGETS.map(w=>w.id), extraIds = EXTRA_WIDGETS.map(w=>w.id);
  if(!p || (!p.topOrder && !p.extras)){ p={topOrder:[...topIds],extras:DEFAULT_EXTRAS.map(e=>({...e}))}; STATE.drone.dashboardPrefs[CURRENT_USER_ID]=p; }
  if(!Array.isArray(p.topOrder)) p.topOrder=[...topIds];
  if(!Array.isArray(p.extras)) p.extras=[];
  p.topOrder=[...p.topOrder.filter(id=>topIds.includes(id)),...topIds.filter(id=>!p.topOrder.includes(id))];
  p.extras=p.extras.filter(e=>e&&extraIds.includes(e.id));
  return p;
}
function renderWidget(id){
  const today=fmt(new Date());
  const fleet=STATE.drone.drones.filter(d=>d.status!=="Retired");
  const flights30=STATE.drone.flights.filter(f=>daysBetween(f.date,today)>=0&&daysBetween(f.date,today)<=30);
  if(id==='stat_total_drones'){
    const active=fleet.filter(d=>d.status!=="Maintenance"&&d.status!=="Grounded").length;
    const maintenance=fleet.filter(d=>d.status==="Maintenance"||d.status==="Grounded").length;
    const retired=STATE.drone.drones.filter(d=>d.status==="Retired").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="drone-fleet"><div class="label">${ICONS.drone} <span>Total Drones</span></div><div class="value">${STATE.drone.drones.length}</div><div class="delta neutral"><span style="color:var(--green);">${active} active</span> &bull; <span style="color:var(--gold);">${maintenance} maintenance</span> &bull; ${retired} retired</div></button>`;
  }
  if(id==='stat_flight_hours_30d'){
    const mins=flights30.reduce((sum,f)=>sum+(Number(f.durationMin)||0),0), hours=Math.round((mins/60)*10)/10;
    return `<button class="stat-card dash-clickable" data-nav-dest="drone-flights"><div class="label">${ICONS.clock} <span>Flight Hours (30 days)</span></div><div class="value">${hours.toFixed(1)}</div><div class="delta neutral">${flights30.length} flights in the last 30 days</div></button>`;
  }
  if(id==='stat_active_operators'){
    const active=STATE.drone.operators.filter(operatorCurrent).length, expiring=STATE.drone.notifications.filter(n=>n.type==="cert_expiring").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="drone-operators"><div class="label">${ICONS.users} <span>Active Operators</span></div><div class="value">${active}</div><div class="delta ${expiring?'warn':'ok'}">${expiring?expiring+' certification'+(expiring===1?'':'s')+' expiring':'All certifications current'}</div></button>`;
  }
  if(id==='stat_maintenance_due'){
    const down=fleet.filter(d=>d.status==="Maintenance"||d.status==="Grounded").length, alerts=STATE.drone.notifications.filter(n=>n.type==="battery_health").length;
    return `<button class="stat-card dash-clickable" data-nav-dest="drone-maintenance"><div class="label">${ICONS.wrench} <span>Maintenance Due</span></div><div class="value">${down}</div><div class="delta ${down||alerts?'warn':'ok'}">${alerts?alerts+' battery health alert'+(alerts===1?'':'s'):(down?'Aircraft currently down':'No current maintenance alerts')}</div></button>`;
  }
  if(id==='stat_incidents_30d'){
    const recent=STATE.drone.incidents.filter(i=>daysBetween(i.date,today)>=0&&daysBetween(i.date,today)<=30);
    return `<button class="stat-card dash-clickable" data-nav-dest="drone-incidents"><div class="label">${ICONS.alert} <span>Incidents (30 days)</span></div><div class="value" style="color:${recent.length?'var(--red)':'var(--heading)'}">${recent.length}</div><div class="delta ${recent.length?'warn':'ok'}">${recent.length?'Review recent incidents':'No recent incidents'}</div></button>`;
  }
  if(id==='list_fleet_status_board'){
    const rows=fleet.map(d=>{
      const avg=d.batteries&&d.batteries.length?Math.round(d.batteries.reduce((s,b)=>s+(Number(b.healthPct)||0),0)/d.batteries.length):null;
      const last=STATE.drone.flights.filter(f=>f.droneId===d.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
      const aircraftPhoto=d.photoDataUrl?`<img src="${d.photoDataUrl}" alt="${escapeHtml(d.name)}" style="width:100%;height:105px;object-fit:contain;display:block;margin-bottom:12px;border-radius:8px;background:rgba(255,255,255,.025);">`:`<div style="height:105px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;border-radius:8px;background:rgba(255,255,255,.025);color:var(--text-dim);"><span style="width:64px;height:64px;display:inline-block;">${ICONS.drone}</span></div>`;
      return `<div class="dash-clickable" data-open-drone="${d.id}" style="border:1px solid var(--border);border-radius:10px;padding:16px;text-align:left;background:var(--lightgray);cursor:pointer;min-width:0;">${aircraftPhoto}<div style="display:flex;justify-content:space-between;gap:10px;"><div><div style="font-weight:800;font-size:14px;color:var(--heading);">${escapeHtml(d.name)}</div><div style="font-size:11px;color:var(--text-dim);margin-top:3px;">${escapeHtml(d.model)}</div></div><div style="width:10px;height:10px;border-radius:50%;background:${statusColorDrone(d.status)};box-shadow:0 0 0 4px ${statusColorDrone(d.status)}22;"></div></div><div style="margin-top:12px;"><span class="badge ${statusBadgeClassDrone(d.status)}">${escapeHtml(d.status)}</span></div><div style="margin-top:12px;font-size:11.5px;color:var(--text-dim);display:grid;gap:6px;"><div>Battery health: <strong style="color:var(--heading);">${avg==null?'—':avg+'%'}</strong></div><div>Last flight: <strong style="color:var(--heading);">${last?last.date:'No flights on file'}</strong></div></div></div>`;
    }).join('');
    return `<div class="panel"><div class="panel-head"><h2>Drone Fleet Status</h2><span class="hint">Live status of all active aircraft</span></div><div class="panel-body"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;">${rows}</div></div></div>`;
  }
  if(id==='chart_missions_by_type') return `<div class="panel"><div class="panel-head"><h2>Missions by Type</h2></div><div class="panel-body"><div class="chart-box" style="height:220px;"><canvas id="chartMissionType"></canvas></div></div></div>`;
  if(id==='list_recent_flights'){
    const rows=STATE.drone.flights.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(f=>`<tr><td>${droneLink(f.droneId)}</td><td>${escapeHtml(f.missionType)}</td><td>${f.date}</td></tr>`).join('')||`<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No flights on file.</td></tr>`;
    return `<div class="panel"><div class="panel-head"><h2>Recent Flights</h2></div><div class="panel-body" style="padding:0;"><table><thead><tr><th>Aircraft</th><th>Mission</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  return `<div class="panel"><div class="panel-body">Unknown widget.</div></div>`;
}
const DASH_SIZE_LABELS={quarter:'¼',half:'½',threeQuarter:'¾',full:'Full'};
function renderTopWidget(id){ return `<div class="dash-widget" data-widget-id="${id}"><div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span></div>${renderWidget(id)}</div>`; }
function renderExtraWidget(id,size){ return `<div class="dash-widget" data-widget-id="${id}" data-size="${size}"><div class="dash-widget-toolbar"><span class="dash-drag-handle" role="button" tabindex="0" title="Drag to reorder" aria-label="Drag to reorder">☰</span><button data-widget-size-cycle="${id}" title="Resize (currently ${size})">${DASH_SIZE_LABELS[size]||'½'}</button><button data-widget-remove="${id}" title="Remove from dashboard" aria-label="Remove">&times;</button></div>${renderWidget(id)}</div>`; }
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
    logActivity(`Customized personal Drone dashboard (${prefs.extras.length} extra widget(s) shown).`, "dashboard_prefs");
    persist();
    toast("Dashboard saved.");
    closeModal();
    renderDashboard();
  };
}
function renderDashboard(){
  recalcNotifications();
  const prefs = myWidgetPrefs();
  const root = document.getElementById('view-drone-dashboard');
  const dashboardDestinations = NAV_ITEMS.filter(item=>item.id!=='drone-dashboard' && navItemVisible(item));
  root.innerHTML = `
    <style>
      #view-drone-dashboard .drone-hub-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;margin-bottom:20px}
      #view-drone-dashboard .drone-hub-card{grid-column:span 4;min-height:145px;padding:20px;border:1px solid var(--border);border-radius:12px;background:var(--panel);text-align:left;color:inherit;font-family:inherit;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
      #view-drone-dashboard .drone-hub-card:nth-child(n+4){grid-column:span 3}
      #view-drone-dashboard .drone-hub-card:hover{transform:translateY(-2px);border-color:var(--blue);background:var(--lightgray);box-shadow:0 10px 28px rgba(0,0,0,.16)}
      #view-drone-dashboard .drone-hub-icon{width:30px;height:30px;margin-bottom:13px;filter:drop-shadow(0 0 8px currentColor)}
      #view-drone-dashboard .drone-hub-title{font-size:16px;font-weight:800;color:var(--heading);margin-bottom:7px}
      #view-drone-dashboard .drone-hub-sub{font-size:12.5px;line-height:1.45;color:var(--text-dim)}
      #view-drone-dashboard .drone-kpi-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:22px}
      #view-drone-dashboard .drone-kpi-grid .dash-widget{min-width:0}
      #view-drone-dashboard .drone-kpi-grid .stat-card{height:100%;min-height:130px}
      #view-drone-dashboard .stat-card .label svg{width:18px;height:18px;vertical-align:middle;margin-right:6px}
      @media(max-width:1100px){#view-drone-dashboard .drone-hub-card,#view-drone-dashboard .drone-hub-card:nth-child(n+4){grid-column:span 6}#view-drone-dashboard .drone-kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:700px){#view-drone-dashboard .drone-hub-card,#view-drone-dashboard .drone-hub-card:nth-child(n+4){grid-column:1/-1}#view-drone-dashboard .drone-kpi-grid{grid-template-columns:1fr}}
    </style>
    <div class="drone-hub-grid">
      ${dashboardDestinations.map((item,index)=>`<button class="drone-hub-card" data-nav-dest="${item.id}"><div class="drone-hub-icon" style="color:${["#4D8DFF","#43D59B","#B47CFF","#FF9F43","#FF6678","#63A7FF","#8A9DB8"][index%7]};">${ICONS[item.icon]||ICONS.grid}</div><div class="drone-hub-title">${escapeHtml(item.label)}</div><div class="drone-hub-sub">${escapeHtml(item.sub)}</div></button>`).join('')}
    </div>
    <div class="drone-kpi-grid" id="dashTopZone">${prefs.topOrder.map(id=>renderTopWidget(id)).join('')}</div>
    <div class="toolbar">
      <div style="font-size:12px;color:var(--text-dim);">Dashboard widgets below can be rearranged and customized for your account.</div>
      <button class="btn btn-primary btn-sm" id="btnCustomizeDashboard">${ICONS.layout} Add / Remove Widgets</button>
    </div>
    <div class="dash-extras-zone" id="dashExtrasZone">${prefs.extras.map(e=>renderExtraWidget(e.id,e.size)).join('')}</div>
  `;
  root.querySelectorAll('[data-nav-dest]').forEach(b=>b.addEventListener('click', ()=>switchView(b.dataset.navDest)));
  destroyChartsDrone();
  if(prefs.extras.some(e=>e.id==='chart_missions_by_type')){
    const missionCounts = {};
    STATE.drone.refData.missionTypes.forEach(t=>missionCounts[t]=0);
    STATE.drone.flights.forEach(f=>missionCounts[f.missionType]=(missionCounts[f.missionType]||0)+1);
    CHART_REFS_DRONE.missionType = safeChart('chartMissionType', {
      type:'bar',
      data:{ labels:Object.keys(missionCounts), datasets:[{label:'Flights', data:Object.values(missionCounts), backgroundColor:'#134DD1'}] },
      options: {indexAxis:'y', maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{color:chartGridColor()}}, y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:9}},grid:{display:false}}}}
    });
  }
  const statusZone=root.querySelector('#dashExtrasZone');
  if(statusZone){const details=document.createElement('details');details.style.cssText='border:1px solid var(--border);border-radius:12px;background:var(--panel);margin-top:14px;';const summary=document.createElement('summary');summary.textContent='Drone Status ▾';summary.style.cssText='padding:16px 20px;cursor:pointer;font-weight:800;';statusZone.parentNode.insertBefore(details,statusZone);details.append(summary,statusZone);}
  wireDroneLinks();
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
   DRONE FLEET (card grid)
   ========================================================================= */
let FLEET_FILTER = {q:"", status:"All", category:"All"};
let FLEET_SORT_KEY = "name";

function renderFleet(){
  const canView = can('drone_fleet_view');
  const canEdit = can('drone_fleet_edit');
  const canDelete = can('drone_fleet_delete');
  if(!canView){
    document.getElementById('view-drone-fleet').innerHTML = permissionBlockedView("You don't have permission to view the drone fleet in this role.");
    return;
  }
  const f = FLEET_FILTER;
  let list = STATE.drone.drones.filter(d=>{
    const q = f.q.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.model.toLowerCase().includes(q) || d.faaRegistrationNumber.toLowerCase().includes(q);
    const matchStatus = f.status==="All" || d.status===f.status;
    const matchCat = f.category==="All" || d.category===f.category;
    return matchQ && matchStatus && matchCat;
  });
  list.sort((a,b)=>{
    const av = FLEET_SORT_KEY==='operator' ? personName(a.assignedOperatorId).toLowerCase() : String(a[FLEET_SORT_KEY]||'').toLowerCase();
    const bv = FLEET_SORT_KEY==='operator' ? personName(b.assignedOperatorId).toLowerCase() : String(b[FLEET_SORT_KEY]||'').toLowerCase();
    return av<bv?-1:(av>bv?1:0);
  });

  const cards = list.map(d=>{
    const avgBattery = d.batteries.length ? Math.round(d.batteries.reduce((s,b)=>s+b.healthPct,0)/d.batteries.length) : null;
    const photo = d.photoDataUrl
      ? `<img src="${d.photoDataUrl}" style="width:72px;height:72px;border-radius:14px;object-fit:cover;flex-shrink:0;">`
      : `<div style="width:72px;height:72px;border-radius:14px;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);flex-shrink:0;"><span style="width:32px;height:32px;display:inline-block;">${ICONS.drone}</span></div>`;
    return `
    <div class="drone-card">
      <div style="position:absolute;top:14px;right:14px;width:9px;height:9px;border-radius:50%;background:${statusColorDrone(d.status)};box-shadow:0 0 0 4px ${statusColorDrone(d.status)}22;"></div>
      <div style="display:flex;gap:14px;">
        ${photo}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;">${droneLink(d.id)}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);margin:2px 0 6px;">${escapeHtml(d.model)}</div>
          <span class="badge ${statusBadgeClassDrone(d.status)}">${d.status}</span>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">Operator</span><span style="font-weight:600;">${escapeHtml(personName(d.assignedOperatorId))}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">Home Dock</span><span style="font-weight:600;">${escapeHtml(d.homeDock)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">Flight Hours</span><span style="font-weight:600;">${d.totalFlightHours}h / ${d.totalFlights} flights</span>
        </div>
        ${avgBattery!=null ? `
        <div style="margin-top:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);margin-bottom:3px;"><span>Battery Health</span><span>${avgBattery}%</span></div>
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="width:${avgBattery}%;height:100%;background:${avgBattery>=80?'var(--green)':(avgBattery>=60?'var(--gold)':'var(--red)')};"></div></div>
        </div>` : ''}
        <div style="margin-top:10px;">${d.sensorPayload.map(s=>`<span class="badge badge-role" style="margin:1px;">${escapeHtml(s)}</span>`).join(' ')}</div>
      </div>
      ${(canEdit || canDelete) ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        ${canEdit ? `<button class="btn btn-sm btn-outline" data-edit-drone="${d.id}">${ICONS.edit} Edit</button>` : ''}
        ${canDelete ? `<button class="btn btn-sm btn-danger" data-del-drone="${d.id}">${ICONS.trash} Delete</button>` : ''}
      </div>` : ''}
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.drone}<div class="msg">No aircraft match this filter</div></div>`;

  document.getElementById('view-drone-fleet').innerHTML = `
    ${!canEdit ? lockedNote("You're viewing the drone fleet in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <input type="text" id="fleetSearch" title="Filters the drone fleet below as you type, matching aircraft name, model, or FAA N-number" placeholder="Search name, model, N-number..." style="width:220px;" value="${escapeHtml(f.q)}">
        <select id="fleetStatus" title="Filter the drone fleet to a single status (e.g. Ready, Grounded)"><option ${f.status==='All'?'selected':''}>All</option>${STATE.drone.refData.statuses.map(st=>`<option ${f.status===st?'selected':''}>${escapeHtml(st)}</option>`).join('')}</select>
        <select id="fleetCategory" title="Filter the drone fleet to a single aircraft category"><option ${f.category==='All'?'selected':''}>All</option>${STATE.drone.refData.categories.map(c=>`<option ${f.category===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select>
        <select id="fleetSortKey">
          <option value="name" ${FLEET_SORT_KEY==='name'?'selected':''}>Sort: Name</option>
          <option value="model" ${FLEET_SORT_KEY==='model'?'selected':''}>Sort: Model</option>
          <option value="operator" ${FLEET_SORT_KEY==='operator'?'selected':''}>Sort: Operator</option>
          <option value="status" ${FLEET_SORT_KEY==='status'?'selected':''}>Sort: Status</option>
        </select>
      </div>
      ${canEdit ? `<button class="btn btn-primary" id="btnAddDrone">${ICONS.plus} Add Drone</button>` : ''}
    </div>
    <div class="k9-card-grid">${cards}</div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:12px;">Showing ${list.length} of ${STATE.drone.drones.length} aircraft &bull; click a name for the full profile</div>
  `;
  document.getElementById('fleetSearch').addEventListener('input', e=>{FLEET_FILTER.q=e.target.value; renderFleet(); refocusFilterInput('fleetSearch');});
  document.getElementById('fleetStatus').addEventListener('change', e=>{FLEET_FILTER.status=e.target.value; renderFleet();});
  document.getElementById('fleetCategory').addEventListener('change', e=>{FLEET_FILTER.category=e.target.value; renderFleet();});
  document.getElementById('fleetSortKey').addEventListener('change', e=>{FLEET_SORT_KEY=e.target.value; renderFleet();});
  const addBtn = document.getElementById('btnAddDrone');
  if(addBtn) addBtn.addEventListener('click', ()=>openDroneFormModal(null));
  document.querySelectorAll('[data-edit-drone]').forEach(b=>b.addEventListener('click', ()=>openDroneFormModal(b.dataset.editDrone)));
  document.querySelectorAll('[data-del-drone]').forEach(b=>b.addEventListener('click', ()=>deleteDrone(b.dataset.delDrone)));
  wireDroneLinks();
}

function openDroneFormModal(existingId){
  const editing = !!existingId;
  const d = editing ? droneFor(existingId) : {
    name:"", model: STATE.drone.refData.makesModels[0], category:"Multi-Rotor", serialNumber:"", faaRegistrationNumber:"",
    dateAcquired: fmt(new Date()), assignedOperatorId: STATE.personnel[0].id, homeDock: STATE.drone.refData.dockLocations[0],
    status:"Ready", sensorPayload:[], vendor:"", purchasePrice:0, maxFlightTimeMin:30, registrationExpiration: fmt(addDays(new Date(),1000)), notes:"", photoDataUrl:null,
  };
  let pendingPhoto = d.photoDataUrl || null;
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Drone</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${photoDropZoneHtml('fDrone', d.photoDataUrl, {label:'Aircraft Photo', round:false, placeholderIcon:ICONS.drone})}
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('drone.name')}</label><input type="text" id="fDroneName" value="${escapeHtml(d.name)}" placeholder="e.g. Falcon-3"></div>
        <div class="form-row"><label>${fieldLabel('drone.model')}</label><select id="fDroneModel">${STATE.drone.refData.makesModels.map(m=>`<option ${d.model===m?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('drone.category')}</label><select id="fDroneCategory">${STATE.drone.refData.categories.map(c=>`<option ${d.category===c?'selected':''}>${escapeHtml(c)}</option>`).join('')}</select></div>
        <div class="form-row"><label>${fieldLabel('drone.status')}</label><select id="fDroneStatus">${STATE.drone.refData.statuses.map(s=>`<option ${d.status===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('drone.serialNumber')}</label><input type="text" id="fDroneSerial" value="${escapeHtml(d.serialNumber||'')}"></div>
        <div class="form-row"><label>${fieldLabel('drone.faaRegistration')} # (N-Number)</label><input type="text" id="fDroneNNumber" value="${escapeHtml(d.faaRegistrationNumber||'')}" placeholder="e.g. N930FA"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>${fieldLabel('drone.operator')}</label><select id="fDroneOperator">${STATE.personnel.map(p=>`<option value="${p.id}" ${d.assignedOperatorId===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Home Dock / Base</label><select id="fDroneDock">${STATE.drone.refData.dockLocations.map(loc=>`<option ${d.homeDock===loc?'selected':''}>${escapeHtml(loc)}</option>`).join('')}</select></div>
      </div>
      <div class="form-row"><label>Sensor Payload</label>
        <div style="border:1px solid var(--border);border-radius:5px;padding:8px 10px;">
          ${STATE.drone.refData.sensorPayloads.map(s=>`<label style="display:inline-flex;gap:6px;align-items:center;font-size:12.5px;padding:3px 10px 3px 0;"><input type="checkbox" class="fDroneSensor" value="${escapeHtml(s)}" ${d.sensorPayload.includes(s)?'checked':''} style="width:auto;">${escapeHtml(s)}</label>`).join('')}
        </div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Date Acquired</label><input type="date" id="fDroneAcquired" value="${d.dateAcquired||''}"></div>
        <div class="form-row"><label>Registration Expires</label><input type="date" id="fDroneRegExp" value="${d.registrationExpiration||''}"></div>
        <div class="form-row"><label>Max Flight Time (min)</label><input type="number" id="fDroneMaxFlight" value="${d.maxFlightTimeMin||30}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Vendor</label><input type="text" id="fDroneVendor" value="${escapeHtml(d.vendor||'')}"></div>
        <div class="form-row"><label>Purchase Price ($)</label><input type="number" id="fDronePrice" value="${d.purchasePrice||0}"></div>
      </div>
      <div class="form-row"><label>Notes</label><textarea id="fDroneNotes" rows="2">${escapeHtml(d.notes||'')}</textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add Drone'}</button></div>
  `;
  openModal();
  wirePhotoDropZone('fDrone', (dataUrl)=>{ pendingPhoto = dataUrl; });
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const name = document.getElementById('fDroneName').value.trim();
    if(!name){ toast("Enter a callsign / name.", true); return; }
    const status = document.getElementById('fDroneStatus').value;
    const data = {
      name, model: document.getElementById('fDroneModel').value, make: document.getElementById('fDroneModel').value.split(' ')[0],
      category: document.getElementById('fDroneCategory').value, status,
      serialNumber: document.getElementById('fDroneSerial').value.trim(), faaRegistrationNumber: document.getElementById('fDroneNNumber').value.trim(),
      assignedOperatorId: document.getElementById('fDroneOperator').value, homeDock: document.getElementById('fDroneDock').value,
      sensorPayload: Array.from(document.querySelectorAll('.fDroneSensor:checked')).map(el=>el.value),
      dateAcquired: document.getElementById('fDroneAcquired').value, registrationExpiration: document.getElementById('fDroneRegExp').value,
      maxFlightTimeMin: Number(document.getElementById('fDroneMaxFlight').value)||30,
      vendor: document.getElementById('fDroneVendor').value.trim(), purchasePrice: Number(document.getElementById('fDronePrice').value)||0,
      notes: document.getElementById('fDroneNotes').value.trim(),
      retirementDate: status==='Retired' ? (d.retirementDate||fmt(new Date())) : null,
    };
    if(editing){
      Object.keys(data).forEach(field=>recordFieldChangeDrone(d, field, d[field], data[field]));
      Object.assign(d, data, {photoDataUrl: pendingPhoto});
      logActivity(`Updated drone record for ${name}.`, "drone", d.id);
      toast("Drone record saved.");
    } else {
      const newD = {id:'d'+Date.now(), photoDataUrl: pendingPhoto || AVATAR_DRONES[droneAvatarKey(data.model)] || null,
        remoteIdCompliant:true, totalFlightHours:0, totalFlights:0, batteries:[], deceasedDate:null, fieldHistory:[], ...data};
      STATE.drone.drones.push(newD);
      logActivity(`Added new drone "${name}" to the fleet.`, "drone", newD.id);
      toast("Drone added to fleet.");
    }
    persist();
    closeModal();
    if(ACTIVE_VIEW==='drone-fleet') renderFleet();
  };
}

function deleteDrone(id){
  const d = droneFor(id);
  if(!confirm(`Delete ${d.name} from the fleet? This also removes its flight, maintenance, and incident history.`)) return;
  STATE.drone.drones = STATE.drone.drones.filter(x=>x.id!==id);
  STATE.drone.flights = STATE.drone.flights.filter(f=>f.droneId!==id);
  STATE.drone.maintenanceRecords = STATE.drone.maintenanceRecords.filter(m=>m.droneId!==id);
  STATE.drone.incidents = STATE.drone.incidents.filter(i=>i.droneId!==id);
  logActivity(`Deleted drone "${d.name}" from the fleet.`, "drone", id);
  persist();
  toast("Drone removed from fleet.");
  renderFleet();
}

/* =========================================================================
   OPERATORS (pilot cards)
   ========================================================================= */
function renderOperators(){
  const canView = can('drone_operator_view');
  const canManage = can('drone_operator_manage');
  if(!canView){
    document.getElementById('view-drone-operators').innerHTML = permissionBlockedView("You don't have permission to view the operator roster in this role.");
    return;
  }
  const cards = STATE.drone.operators.map(o=>{
    const current = operatorCurrent(o);
    const daysLeft = o.certExpiration ? daysBetween(fmt(new Date()), o.certExpiration) : null;
    const activeWaivers = o.waivers.filter(w=>w.expirationDate>=fmt(new Date()));
    return `
    <div class="drone-card">
      <div style="display:flex;gap:14px;align-items:center;">
        ${personAvatarHtml(o.personId, 64)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;">${operatorLink(o.personId)}</div>
          <div class="mono" style="font-size:11px;color:var(--text-dim);margin:2px 0 6px;">${escapeHtml(o.certNumber)}</div>
          <span class="badge ${current?'badge-available':'badge-missing'}">${current ? 'Current' : 'Expired'}</span>
        </div>
      </div>
      <div style="margin-top:12px;font-size:12.5px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">Part 107 Expires</span>
          <span style="font-weight:600;${daysLeft!=null && daysLeft<=45?'color:var(--red);':''}">${o.certExpiration||'—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:var(--text-dim);">Flight Hours</span><span style="font-weight:600;">${o.totalFlightHours}h / ${o.totalFlights} flights</span>
        </div>
        <div style="color:var(--text-dim);margin-bottom:4px;">Active Waivers</div>
        <div>${activeWaivers.length ? activeWaivers.map(w=>`<span class="badge badge-role" style="margin:1px;">${escapeHtml(w.type)}</span>`).join(' ') : '<span style="color:var(--text-dim);">None</span>'}</div>
      </div>
      ${canManage ? `
      <div class="cell-actions" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);justify-content:flex-start;">
        <button class="btn btn-sm btn-outline" data-edit-operator="${o.personId}">${ICONS.edit} Edit</button>
      </div>` : ''}
    </div>`;
  }).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.radio}<div class="msg">No operators on file</div></div>`;

  document.getElementById('view-drone-operators').innerHTML = `
    ${!canManage ? lockedNote("You're viewing the operator roster in read-only mode.") : ""}
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnAddOperator">${ICONS.plus} Add Operator</button>` : ''}</div>
    <div class="k9-card-grid">${cards}</div>
  `;
  const addBtn = document.getElementById('btnAddOperator');
  if(addBtn) addBtn.addEventListener('click', ()=>openOperatorFormModal(null));
  document.querySelectorAll('[data-edit-operator]').forEach(b=>b.addEventListener('click', ()=>openOperatorFormModal(b.dataset.editOperator)));
  wireOperatorLinks();
}

function openOperatorFormModal(personId){
  const editing = !!personId;
  const o = editing ? operatorFor(personId) : { certNumber:"", certIssueDate: fmt(new Date()), certExpiration: fmt(addDays(new Date(),730)), recurrentTrainingDate:"" };
  const unassigned = STATE.personnel.filter(p=>p && p.id && !operatorFor(p.id) && !['inactive','terminated','separated','disabled'].includes(String(p.status||'').toLowerCase()));
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Add'} Operator</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${editing ? `<div class="form-row"><label>Operator</label><input type="text" value="${escapeHtml(personName(personId))}" disabled></div>`
        : `<div class="form-row"><label>Person</label><select id="fOpPerson">${unassigned.length ? unassigned.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('') : `<option value="">-- everyone already has an operator record --</option>`}</select></div>`}
      <div class="form-2col">
        <div class="form-row"><label>Part 107 Certificate #</label><input type="text" id="fOpCertNum" value="${escapeHtml(o.certNumber||'')}" placeholder="e.g. RP-2026-00123"></div>
        <div class="form-row"><label>Recurrent Training Date</label><input type="date" id="fOpRecurrent" value="${o.recurrentTrainingDate||''}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Certificate Issue Date</label><input type="date" id="fOpIssue" value="${o.certIssueDate||''}"></div>
        <div class="form-row"><label>Certificate Expiration</label><input type="date" id="fOpExpire" value="${o.certExpiration||''}"></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);">Part 107 certificates are valid 24 months; recurrent training via the FAA WINGS program keeps a pilot current without retesting.</div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Add Operator'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const targetId = editing ? personId : document.getElementById('fOpPerson').value;
    if(!targetId || (!editing && !unassigned.some(p=>p.id===targetId))){ toast("Select an eligible active personnel record first.", true); return; }
    const certNumber = document.getElementById('fOpCertNum').value.trim();
    if(!certNumber){ toast("Enter a certificate number.", true); return; }
    const oRec = ensureOperator(targetId);
    const changes = {
      certNumber, certIssueDate: document.getElementById('fOpIssue').value, certExpiration: document.getElementById('fOpExpire').value,
      recurrentTrainingDate: document.getElementById('fOpRecurrent').value,
    };
    if(editing) Object.keys(changes).forEach(field=>recordFieldChangeDrone(oRec, field, oRec[field], changes[field]));
    Object.assign(oRec, changes);
    logActivity(`${editing?'Updated':'Added'} operator record for ${personName(targetId)}.`, "drone_operator", targetId);
    persist();
    toast("Operator record saved.");
    closeModal();
    if(ACTIVE_VIEW==='drone-operators') renderOperators();
  };
}

/* =========================================================================
   FLIGHT LOG (vertical timeline, not a table - the mission history feed)
   ========================================================================= */
let FLIGHT_FILTER = {drone:"All", mission:"All", dateFrom:"", dateTo:""};

function renderFlights(){
  if(!can('drone_flight_view')){
    document.getElementById('view-drone-flights').innerHTML = permissionBlockedView("You don't have permission to view the flight log in this role.");
    return;
  }
  const canLog = can('drone_flight_log');
  const f = FLIGHT_FILTER;
  const list = STATE.drone.flights.filter(fl=>{
    if(f.drone!=="All" && fl.droneId!==f.drone) return false;
    if(f.mission!=="All" && fl.missionType!==f.mission) return false;
    if(f.dateFrom && fl.date<f.dateFrom) return false;
    if(f.dateTo && fl.date>f.dateTo) return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const items = list.map(fl=>{
    const isDfr = fl.missionType==="DFR Response";
    const dfrBadge = (isDfr && fl.dispatchToAirborneSeconds!=null)
      ? `<span class="badge ${fl.dispatchToAirborneSeconds<=DFR_RESPONSE_TARGET_SECONDS?'badge-available':'badge-missing'}" style="margin-left:6px;">${fl.dispatchToAirborneSeconds}s to airborne</span>` : '';
    return `
    <div class="drone-timeline-item">
      <div class="panel" style="box-shadow:none;margin-bottom:0;">
        <div class="panel-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <span style="font-weight:800;font-size:14px;">${escapeHtml(fl.missionType)}</span>${dfrBadge}
              <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${fl.date} ${fl.time?'at '+fl.time:''} &bull; ${droneLink(fl.droneId)} &bull; ${operatorLink(fl.operatorId)}</div>
            </div>
            ${fl.cadNumber && fl.cadNumber!=='N/A' ? `<span class="mono badge badge-role">${escapeHtml(fl.cadNumber)}</span>` : ''}
          </div>
          <div style="font-size:12.5px;margin-top:10px;color:var(--text);">${escapeHtml(fl.narrative||'')}</div>
          <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px;font-size:11.5px;color:var(--text-dim);">
            <span>${escapeHtml(fl.location)}</span>
            <span>Duration: ${fl.durationMin} min</span>
            <span>Max Alt: ${fl.maxAltitudeFt} ft</span>
            <span>${escapeHtml(fl.airspaceAuthorization||'')}</span>
            ${fl.videoEvidenceLinked ? `<span style="color:var(--blue);">&#128247; Video linked</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('') || `<div class="empty-state">${ICONS.grid}<div class="msg">No flights match this filter</div></div>`;

  document.getElementById('view-drone-flights').innerHTML = `
    ${!canLog ? lockedNote("You're viewing the flight log in read-only mode.") : ""}
    <div class="toolbar">
      <div class="filters">
        <select id="flightDroneFilter" title="Filter the flight log to a single aircraft"><option value="All">All Aircraft</option>${STATE.drone.drones.map(d=>`<option value="${d.id}" ${f.drone===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}</select>
        <select id="flightMissionFilter" title="Filter the flight log to a single mission type"><option>All</option>${STATE.drone.refData.missionTypes.map(t=>`<option ${f.mission===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select>
        <input type="date" id="flightDateFrom" value="${f.dateFrom}" title="Only show flights on or after this date">
        <input type="date" id="flightDateTo" value="${f.dateTo}" title="Only show flights on or before this date">
      </div>
      ${canLog ? `<button class="btn btn-primary" id="btnLogFlightQuick">${ICONS.plus} Log Flight</button>` : ''}
    </div>
    <div class="drone-timeline">${items}</div>
    <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">${list.length} of ${STATE.drone.flights.length} flights shown</div>
  `;
  document.getElementById('flightDroneFilter').addEventListener('change', e=>{FLIGHT_FILTER.drone=e.target.value; renderFlights();});
  document.getElementById('flightMissionFilter').addEventListener('change', e=>{FLIGHT_FILTER.mission=e.target.value; renderFlights();});
  document.getElementById('flightDateFrom').addEventListener('change', e=>{FLIGHT_FILTER.dateFrom=e.target.value; renderFlights();});
  document.getElementById('flightDateTo').addEventListener('change', e=>{FLIGHT_FILTER.dateTo=e.target.value; renderFlights();});
  const quickBtn = document.getElementById('btnLogFlightQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>openFlightFormModal(STATE.drone.drones[0]));
  wireDroneLinks(); wireOperatorLinks();
}

function openFlightFormModal(drone){
  const fromDroneDetail = !!document.getElementById('droneDetailBody');
  const fromOperatorDetail = !!document.getElementById('operatorDetailBody');
  const fromDetail = fromDroneDetail || fromOperatorDetail;
  document.getElementById('modalBox').className = 'modal modal-wide';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Flight</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${fromDetail ? '' : `<div class="form-row"><label>Aircraft</label><select id="fFlDrone">${STATE.drone.drones.map(x=>`<option value="${x.id}" ${x.id===drone.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`}
      <div class="form-row"><label>Operator</label><select id="fFlOperator">${STATE.personnel.map(p=>`<option value="${p.id}" ${p.id===CURRENT_USER_ID?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
      <div class="form-row"><label>Mission Type</label><select id="fFlMission">${STATE.drone.refData.missionTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Date</label><input type="date" id="fFlDate" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Time</label><input type="time" id="fFlTime" value="12:00"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Location</label><input type="text" id="fFlLocation" placeholder="Address or area"></div>
        <div class="form-row"><label>CAD / Call #</label><input type="text" id="fFlCad" placeholder="e.g. CAD-2026-01234 or N/A"></div>
      </div>
      <div class="form-3col" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div class="form-row"><label>Duration (min)</label><input type="number" id="fFlDuration" value="15"></div>
        <div class="form-row"><label>Max Altitude (ft)</label><input type="number" id="fFlAlt" value="200"></div>
        <div class="form-row"><label>Dispatch-to-Airborne (sec)</label><input type="number" id="fFlDispatch" placeholder="DFR only"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Airspace Authorization</label><select id="fFlAirspace">${STATE.drone.refData.airspaceAuthTypes.map(a=>`<option>${escapeHtml(a)}</option>`).join('')}</select></div>
        <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:22px;"><input type="checkbox" id="fFlVideo" checked style="width:auto;">Video evidence linked</label></div>
      </div>
      <div class="form-row"><label>Narrative</label><textarea id="fFlNarrative" rows="3"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Flight</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const location = document.getElementById('fFlLocation').value.trim();
    if(!location){ toast("Enter a location.", true); return; }
    const actualDrone = fromDetail ? drone : droneFor(document.getElementById('fFlDrone').value);
    const newF = {
      id:'flt'+Date.now(), droneId: actualDrone.id, operatorId: document.getElementById('fFlOperator').value,
      missionType: document.getElementById('fFlMission').value, date: document.getElementById('fFlDate').value, time: document.getElementById('fFlTime').value,
      location, cadNumber: document.getElementById('fFlCad').value.trim() || 'N/A',
      durationMin: Number(document.getElementById('fFlDuration').value)||0, maxAltitudeFt: Number(document.getElementById('fFlAlt').value)||0,
      dispatchToAirborneSeconds: document.getElementById('fFlDispatch').value ? Number(document.getElementById('fFlDispatch').value) : null,
      airspaceAuthorization: document.getElementById('fFlAirspace').value, videoEvidenceLinked: document.getElementById('fFlVideo').checked,
      outcome: "Mission complete", weatherConditions: "Not recorded", narrative: document.getElementById('fFlNarrative').value.trim(),
    };
    STATE.drone.flights.push(newF);
    actualDrone.totalFlights += 1; actualDrone.totalFlightHours = Math.round((actualDrone.totalFlightHours + newF.durationMin/60)*10)/10;
    const op = ensureOperator(newF.operatorId); op.totalFlights += 1; op.totalFlightHours = Math.round((op.totalFlightHours + newF.durationMin/60)*10)/10;
    logActivity(`Logged ${newF.missionType} flight for ${actualDrone.name} at ${location}.`, "drone_flight", newF.id);
    persist();
    toast("Flight logged.");
    if(fromDroneDetail){ renderDroneDetailModal(); }
    else if(fromOperatorDetail){ renderOperatorDetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='drone-flights') renderFlights(); }
  };
}

/* =========================================================================
   MAINTENANCE (card-based, plus battery health board)
   ========================================================================= */
function renderMaintenance(){
  if(!can('drone_maint_view')){
    document.getElementById('view-drone-maintenance').innerHTML = permissionBlockedView("You don't have permission to view maintenance records in this role.");
    return;
  }
  const canManage = can('drone_maint_manage');
  const active = STATE.drone.drones.filter(d=>d.status!=="Retired");
  const records = STATE.drone.maintenanceRecords.slice().sort((a,b)=>b.date.localeCompare(a.date));

  document.getElementById('view-drone-maintenance').innerHTML = `
    ${!canManage ? lockedNote("You're viewing maintenance in read-only mode.") : ""}
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Battery Health Board</h2><span class="hint">All batteries across the active fleet</span></div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;">
          ${active.flatMap(d=>d.batteries.map(b=>`
            <div style="border:1px solid var(--border);border-radius:8px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:12.5px;">${escapeHtml(d.name)}</span>
                <span style="color:var(--text-dim);font-size:11px;">${escapeHtml(b.id)}</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:6px;"><div style="width:${b.healthPct}%;height:100%;background:${b.healthPct>=80?'var(--green)':(b.healthPct>=60?'var(--gold)':'var(--red)')};"></div></div>
              <div style="font-size:11px;color:var(--text-dim);">${b.healthPct}% health &bull; ${b.cycles} cycles</div>
            </div>
          `)).join('') || `<div style="color:var(--text-dim);">No batteries on file.</div>`}
        </div>
      </div>
    </div>
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnLogMaintQuick">${ICONS.plus} Log Maintenance</button>` : ''}</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${records.map(m=>`
        <div class="panel" style="box-shadow:none;margin-bottom:0;">
          <div class="panel-body" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
            <div>
              <span style="font-weight:800;">${escapeHtml(m.type)}</span> — ${droneLink(m.droneId)}
              <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${m.date} &bull; ${escapeHtml(m.technician)}${m.groundedDuring?' &bull; <span style="color:var(--red);">Grounded aircraft</span>':''}</div>
              <div style="font-size:12.5px;margin-top:6px;">${escapeHtml(m.notes||'')}</div>
            </div>
            <div style="font-weight:700;">${money(m.cost)}</div>
          </div>
        </div>
      `).join('') || `<div class="empty-state">${ICONS.wrench}<div class="msg">No maintenance records yet</div></div>`}
    </div>
  `;
  const quickBtn = document.getElementById('btnLogMaintQuick');
  if(quickBtn) quickBtn.addEventListener('click', ()=>{
    if(!STATE.drone.drones.length){ toast("Add an aircraft before logging maintenance.", true); return; }
    openMaintFormModal(STATE.drone.drones[0]);
  });
  wireDroneLinks();
}

function openMaintFormModal(drone){
  if(!drone){ toast("Add an aircraft before logging maintenance.", true); return; }
  const fromDetail = !!document.getElementById('droneDetailBody');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Log Maintenance</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      ${fromDetail ? '' : `<div class="form-row"><label>Aircraft</label><select id="fMxDrone">${STATE.drone.drones.map(x=>`<option value="${x.id}" ${x.id===drone.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></div>`}
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fMxType">${STATE.drone.refData.maintTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Date</label><input type="date" id="fMxDate" value="${fmt(new Date())}"></div>
      </div>
      <div class="form-2col">
        <div class="form-row"><label>Technician / Vendor</label><input type="text" id="fMxTech" placeholder="e.g. In-House UAS Tech"></div>
        <div class="form-row"><label>Cost ($)</label><input type="number" id="fMxCost" value="0"></div>
      </div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fMxGrounded" style="width:auto;">Aircraft grounded during this maintenance</label></div>
      <div class="form-row"><label>Notes</label><textarea id="fMxNotes" rows="2"></textarea></div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Log Maintenance</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const actualDrone = fromDetail ? drone : droneFor(document.getElementById('fMxDrone').value);
    if(!actualDrone){ toast("Select an existing aircraft before logging maintenance.", true); return; }
    const grounded = document.getElementById('fMxGrounded').checked;
    const newM = {
      id:'dmx'+Date.now(), droneId: actualDrone.id, date: document.getElementById('fMxDate').value, type: document.getElementById('fMxType').value,
      technician: document.getElementById('fMxTech').value.trim() || 'Unspecified', cost: Number(document.getElementById('fMxCost').value)||0,
      notes: document.getElementById('fMxNotes').value.trim(), groundedDuring: grounded,
    };
    STATE.drone.maintenanceRecords.push(newM);
    if(grounded){ recordFieldChangeDrone(actualDrone, 'status', actualDrone.status, 'Maintenance'); actualDrone.status = 'Maintenance'; }
    logActivity(`Logged ${newM.type} maintenance for ${actualDrone.name}.`, "drone_maintenance", newM.id);
    persist();
    toast("Maintenance logged.");
    if(fromDetail){ renderDroneDetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='drone-maintenance') renderMaintenance(); }
  };
}

/* =========================================================================
   INCIDENTS (card-based)
   ========================================================================= */
function renderIncidents(){
  if(!can('drone_incident_view')){
    document.getElementById('view-drone-incidents').innerHTML = permissionBlockedView("You don't have permission to view incidents in this role.");
    return;
  }
  const canManage = can('drone_incident_manage');
  const list = STATE.drone.incidents.slice().sort((a,b)=>b.date.localeCompare(a.date));
  const faaReportableCount = list.filter(i=>i.faaReportable).length;

  document.getElementById('view-drone-incidents').innerHTML = `
    ${!canManage ? lockedNote("You're viewing incidents in read-only mode.") : ""}
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="label">Total Incidents</div><div class="value">${list.length}</div></div>
      <div class="stat-card"><div class="label">FAA-Reportable</div><div class="value" style="color:${faaReportableCount?'var(--red)':'var(--heading)'}">${faaReportableCount}</div></div>
      <div class="stat-card"><div class="label">Pending Review</div><div class="value">${list.filter(i=>i.reviewStatus==='Pending').length}</div></div>
    </div>
    <div class="toolbar"><div></div>${canManage ? `<button class="btn btn-primary" id="btnRecordDroneIncident">${ICONS.plus} Record Incident</button>` : ''}</div>
    <div class="k9-card-grid">
      ${list.map(i=>`
        <div class="drone-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-weight:800;font-size:15px;">${escapeHtml(i.type)}</div>
              <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${droneLink(i.droneId)} &bull; ${i.date}</div>
            </div>
            <span class="badge ${statusBadgeClassDrone(i.reviewStatus)}">${i.reviewStatus}</span>
          </div>
          <div style="font-size:12.5px;margin:10px 0;">${escapeHtml(i.description)}</div>
          ${i.faaReportable ? `<span class="badge badge-missing" style="margin-bottom:8px;">FAA Reportable</span>` : ''}
          <div style="font-size:11.5px;color:var(--text-dim);">Case: ${escapeHtml(i.caseNumber)}</div>
          <div class="cell-actions" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);justify-content:flex-start;">
            <button class="btn btn-sm btn-outline" data-view-drone-inc="${i.id}">View</button>
          </div>
        </div>
      `).join('') || `<div class="empty-state" style="grid-column:1/-1;">${ICONS.alert}<div class="msg">No incidents on file</div></div>`}
    </div>
  `;
  const addBtn = document.getElementById('btnRecordDroneIncident');
  if(addBtn) addBtn.addEventListener('click', ()=>openDroneIncidentFormModal(null, null));
  document.querySelectorAll('[data-view-drone-inc]').forEach(b=>b.addEventListener('click', ()=>openDroneIncidentDetailModal(b.dataset.viewDroneInc)));
  wireDroneLinks();
}

function openDroneIncidentFormModal(existingId, prefillDroneId){
  const editing = !!existingId;
  const fromDetail = !!document.getElementById('droneDetailBody');
  const i = editing ? STATE.drone.incidents.find(x=>x.id===existingId) : {
    droneId: prefillDroneId || STATE.drone.drones[0].id, type: STATE.drone.refData.incidentTypes[0], date: fmt(new Date()),
    caseNumber:"", description:"", faaReportable:false, outcome:"", reviewStatus:"Pending", reviewedBy:"", reviewDate:null,
  };
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${editing?'Edit':'Record'} Incident</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Aircraft</label><select id="fDIncDrone" ${prefillDroneId?'disabled':''}>${STATE.drone.drones.map(d=>`<option value="${d.id}" ${i.droneId===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Type</label><select id="fDIncType">${STATE.drone.refData.incidentTypes.map(t=>`<option ${i.type===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></div>
        <div class="form-row"><label>Date</label><input type="date" id="fDIncDate" value="${i.date}"></div>
      </div>
      <div class="form-row"><label>Case Number</label><input type="text" id="fDIncCase" value="${escapeHtml(i.caseNumber)}" placeholder="e.g. UAS-2026-0001"></div>
      <div class="form-row"><label>Description</label><textarea id="fDIncDesc" rows="3">${escapeHtml(i.description)}</textarea></div>
      <div class="form-row"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="fDIncFaa" ${i.faaReportable?'checked':''} style="width:auto;">FAA-reportable incident</label></div>
      <div class="form-row"><label>Outcome</label><input type="text" id="fDIncOutcome" value="${escapeHtml(i.outcome)}"></div>
      <div class="form-2col">
        <div class="form-row"><label>Review Status</label><select id="fDIncStatus"><option ${i.reviewStatus==='Pending'?'selected':''}>Pending</option><option ${i.reviewStatus==='Reviewed'?'selected':''}>Reviewed</option><option ${i.reviewStatus==='Cleared'?'selected':''}>Cleared</option><option ${i.reviewStatus==='Sustained'?'selected':''}>Sustained</option></select></div>
        <div class="form-row"><label>Reviewed By</label><input type="text" id="fDIncReviewer" value="${escapeHtml(i.reviewedBy||'')}"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">${editing?'Save':'Record'}</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const droneId = prefillDroneId || document.getElementById('fDIncDrone').value;
    const d = droneFor(droneId);
    const reviewStatus = document.getElementById('fDIncStatus').value;
    const data = {
      droneId, operatorId: d.assignedOperatorId, type: document.getElementById('fDIncType').value, date: document.getElementById('fDIncDate').value,
      caseNumber: document.getElementById('fDIncCase').value.trim(), description: document.getElementById('fDIncDesc').value.trim(),
      faaReportable: document.getElementById('fDIncFaa').checked, outcome: document.getElementById('fDIncOutcome').value.trim(),
      reviewStatus, reviewedBy: document.getElementById('fDIncReviewer').value.trim(), reviewDate: reviewStatus!=='Pending' ? fmt(new Date()) : null,
    };
    if(editing){ Object.assign(i, data); logActivity(`Updated incident (${data.type}) for ${d.name}.`, "drone_incident", i.id); }
    else { const newI = {id:'dinc'+Date.now(), ...data}; STATE.drone.incidents.push(newI); logActivity(`Recorded ${data.type} incident for ${d.name}.`, "drone_incident", newI.id); }
    persist();
    toast("Incident saved.");
    if(fromDetail){ renderDroneDetailModal(); }
    else { closeModal(); if(ACTIVE_VIEW==='drone-incidents') renderIncidents(); }
  };
}

function openDroneIncidentDetailModal(incId){
  const i = STATE.drone.incidents.find(x=>x.id===incId);
  const d = droneFor(i.droneId);
  const canManage = can('drone_incident_manage');
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>${escapeHtml(i.type)} \u2014 ${escapeHtml(d.name)}</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="detail-grid" style="margin-bottom:14px;">
        <div><div class="k">Date</div><div class="v">${i.date}</div></div>
        <div><div class="k">Case #</div><div class="v">${(i.caseNumber?escapeHtml(i.caseNumber):'—')}</div></div>
        <div><div class="k">FAA Reportable</div><div class="v">${i.faaReportable?'Yes':'No'}</div></div>
        <div><div class="k">Review Status</div><div class="v"><span class="badge ${statusBadgeClassDrone(i.reviewStatus)}">${i.reviewStatus}</span></div></div>
      </div>
      <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Description</h2></div><div class="panel-body" style="font-size:13px;">${escapeHtml(i.description)}</div></div>
      ${canManage ? `<button class="btn btn-sm btn-outline" id="btnEditDroneIncFromDetail">${ICONS.edit} Edit</button>` : ''}
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  const editBtn = document.getElementById('btnEditDroneIncFromDetail');
  if(editBtn) editBtn.addEventListener('click', ()=>openDroneIncidentFormModal(incId, i.droneId));
}

/* =========================================================================
   DRONE DETAIL (full tabbed profile)
   ========================================================================= */
let DRONE_DETAIL_TAB = 'overview';
let DRONE_DETAIL_ID = null;

function openDroneDetail(droneId){
  if(!SuiteUX.openRecord("drone","drone",droneId)) return;

  DRONE_DETAIL_TAB = 'overview';
  DRONE_DETAIL_ID = droneId;
  renderDroneDetailModal();
}

function renderDroneDetailModal(){
  const d = droneFor(DRONE_DETAIL_ID);
  if(!d){ closeModal(); return; }
  const tabs = [['overview','Overview'],['batteries','Batteries'],['maintenance','Maintenance'],['flights','Flights'],['incidents','Incidents'],['history','Change History']];
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-xl';
  box.innerHTML = `
    <div class="modal-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${d.photoDataUrl ? `<img src="${d.photoDataUrl}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;">` : `<div style="width:44px;height:44px;border-radius:10px;background:var(--lightgray);display:flex;align-items:center;justify-content:center;color:var(--text-dim);">${ICONS.drone}</div>`}
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(d.name)}</h3>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(d.model)} &bull; ${escapeHtml(d.faaRegistrationNumber)} &bull; Operator: ${escapeHtml(personName(d.assignedOperatorId))}</div>
        </div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${DRONE_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-drone-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="droneDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-drone-tab]').forEach(b=>b.addEventListener('click', ()=>{ DRONE_DETAIL_TAB=b.dataset.droneTab; renderDroneDetailModal(); }));
  renderDroneDetailTabContent(d);
}

function renderDroneDetailTabContent(d){
  const body = document.getElementById('droneDetailBody');
  const canEdit = can('drone_fleet_edit');
  const canMaintManage = can('drone_maint_manage');
  const canFlightLog = can('drone_flight_log');
  const canIncidentManage = can('drone_incident_manage');

  if(DRONE_DETAIL_TAB==='overview'){
    body.innerHTML = `
      ${canEdit ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditDroneFromDetail">${ICONS.edit} Edit Drone</button>` : ''}
      <div class="detail-grid">
        <div><div class="k">Make / Model</div><div class="v">${escapeHtml(d.model)}</div></div>
        <div><div class="k">Category</div><div class="v">${escapeHtml(d.category)}</div></div>
        <div><div class="k">Serial Number</div><div class="v">${(d.serialNumber?escapeHtml(d.serialNumber):'—')}</div></div>
        <div><div class="k">FAA Registration</div><div class="v">${(d.faaRegistrationNumber?escapeHtml(d.faaRegistrationNumber):'—')}</div></div>
        <div><div class="k">Remote ID Compliant</div><div class="v">${d.remoteIdCompliant?'Yes':'No'}</div></div>
        <div><div class="k">Registration Expires</div><div class="v">${d.registrationExpiration||'—'}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClassDrone(d.status)}">${d.status}</span></div></div>
        <div><div class="k">Assigned Operator</div><div class="v">${escapeHtml(personName(d.assignedOperatorId))}</div></div>
        <div><div class="k">Home Dock</div><div class="v">${escapeHtml(d.homeDock)}</div></div>
        <div><div class="k">Date Acquired</div><div class="v">${d.dateAcquired||'—'}</div></div>
        <div><div class="k">Sensor Payload</div><div class="v">${d.sensorPayload.map(s=>escapeHtml(s)).join(', ')||'—'}</div></div>
        <div><div class="k">Max Flight Time</div><div class="v">${d.maxFlightTimeMin} min</div></div>
        <div><div class="k">Total Flight Hours</div><div class="v">${d.totalFlightHours}h (${d.totalFlights} flights)</div></div>
        <div><div class="k">Vendor</div><div class="v">${(d.vendor?escapeHtml(d.vendor):'—')}</div></div>
        ${d.status==='Retired' ? `<div><div class="k">Retirement Date</div><div class="v">${d.retirementDate||'—'}</div></div>` : ''}
        <div><div class="k">Notes</div><div class="v">${(d.notes?escapeHtml(d.notes):'—')}</div></div>
      </div>
    `;
    const editBtn = document.getElementById('btnEditDroneFromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>openDroneFormModal(d.id));

  } else if(DRONE_DETAIL_TAB==='batteries'){
    body.innerHTML = `
      <table><thead><tr><th>Battery</th><th>Cycles</th><th>Health</th><th>Last Charged</th></tr></thead><tbody>
      ${d.batteries.map(b=>`<tr><td>${escapeHtml(b.id)}</td><td>${b.cycles}</td><td style="color:${b.healthPct>=80?'var(--green)':(b.healthPct>=60?'#9A6B00':'var(--red)')};font-weight:700;">${b.healthPct}%</td><td>${b.lastCharged}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No batteries on file.</td></tr>`}
      </tbody></table>
    `;

  } else if(DRONE_DETAIL_TAB==='maintenance'){
    const list = STATE.drone.maintenanceRecords.filter(m=>m.droneId===d.id).sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML = `
      ${canMaintManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDroneMaint">${ICONS.plus} Log Maintenance</button>` : ''}
      <table><thead><tr><th>Date</th><th>Type</th><th>Technician</th><th>Cost</th></tr></thead><tbody>
      ${list.map(m=>`<tr><td>${m.date}</td><td>${escapeHtml(m.type)}</td><td>${escapeHtml(m.technician)}</td><td>${money(m.cost)}</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No maintenance on file.</td></tr>`}
      </tbody></table>
    `;
    const addBtn = document.getElementById('btnAddDroneMaint');
    if(addBtn) addBtn.addEventListener('click', ()=>openMaintFormModal(d));

  } else if(DRONE_DETAIL_TAB==='flights'){
    const list = STATE.drone.flights.filter(f=>f.droneId===d.id).sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML = `
      ${canFlightLog ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDroneFlight">${ICONS.plus} Log Flight</button>` : ''}
      <table><thead><tr><th>Date</th><th>Mission</th><th>Location</th><th>Duration</th></tr></thead><tbody>
      ${list.map(f=>`<tr><td>${f.date}</td><td>${escapeHtml(f.missionType)}</td><td>${escapeHtml(f.location)}</td><td>${f.durationMin} min</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No flights on file.</td></tr>`}
      </tbody></table>
    `;
    const addBtn = document.getElementById('btnAddDroneFlight');
    if(addBtn) addBtn.addEventListener('click', ()=>openFlightFormModal(d));

  } else if(DRONE_DETAIL_TAB==='incidents'){
    const list = STATE.drone.incidents.filter(i=>i.droneId===d.id).sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML = `
      ${canIncidentManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddDroneIncFromDetail">${ICONS.plus} Record Incident</button>` : ''}
      <table><thead><tr><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
      ${list.map(i=>`<tr><td>${escapeHtml(i.type)}</td><td>${i.date}</td><td><span class="badge ${statusBadgeClassDrone(i.reviewStatus)}">${i.reviewStatus}</span></td><td><button class="btn btn-sm btn-outline" data-view-drone-inc-detail="${i.id}">View</button></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No incidents on file.</td></tr>`}
      </tbody></table>
    `;
    const addBtn = document.getElementById('btnAddDroneIncFromDetail');
    if(addBtn) addBtn.addEventListener('click', ()=>openDroneIncidentFormModal(null, d.id));
    document.querySelectorAll('[data-view-drone-inc-detail]').forEach(b=>b.addEventListener('click', ()=>openDroneIncidentDetailModal(b.dataset.viewDroneIncDetail)));

  } else if(DRONE_DETAIL_TAB==='history'){
    const rows = d.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

/* =========================================================================
   OPERATOR DETAIL
   ========================================================================= */
let OPERATOR_DETAIL_TAB = 'overview';
let OPERATOR_DETAIL_ID = null;

function openOperatorDetail(personId){
  if(!SuiteUX.openRecord("drone","operator",personId)) return;

  OPERATOR_DETAIL_TAB = 'overview';
  OPERATOR_DETAIL_ID = personId;
  renderOperatorDetailModal();
}

function renderOperatorDetailModal(){
  const o = ensureOperator(OPERATOR_DETAIL_ID);
  const tabs = [['overview','Overview'],['waivers','Waivers'],['flights','Flights'],['history','Change History']];
  const box = document.getElementById('modalBox');
  box.className = 'modal modal-xl';
  box.innerHTML = `
    <div class="modal-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${personAvatarHtml(o.personId, 44)}
        <div>
          <h3 style="margin-bottom:2px;">${escapeHtml(personName(o.personId))}</h3>
          <div class="mono" style="font-size:11.5px;color:var(--text-dim);">${escapeHtml(o.certNumber)} &bull; ${operatorCurrent(o)?'Current':'Expired'}</div>
        </div>
      </div>
      <button class="modal-close" id="mClose">&times;</button>
    </div>
    <div style="display:flex;gap:6px;padding:12px 20px 0 20px;border-bottom:1px solid var(--border);flex-wrap:wrap;">
      ${tabs.map(([tid,label])=>`<button class="btn btn-sm ${OPERATOR_DETAIL_TAB===tid?'btn-primary':'btn-outline'}" data-op-tab="${tid}" style="border-radius:5px 5px 0 0;border-bottom:none;">${label}</button>`).join('')}
    </div>
    <div class="modal-body" id="operatorDetailBody"></div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Close</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.querySelectorAll('[data-op-tab]').forEach(b=>b.addEventListener('click', ()=>{ OPERATOR_DETAIL_TAB=b.dataset.opTab; renderOperatorDetailModal(); }));
  renderOperatorDetailTabContent(o);
}

function renderOperatorDetailTabContent(o){
  const body = document.getElementById('operatorDetailBody');
  const canManage = can('drone_operator_manage');
  const canFlightLog = can('drone_flight_log');

  if(OPERATOR_DETAIL_TAB==='overview'){
    body.innerHTML = `
      ${canManage ? `<button class="btn btn-sm btn-primary" style="margin-bottom:14px;" id="btnEditOpFromDetail">${ICONS.edit} Edit Operator</button>` : ''}
      <div class="detail-grid">
        <div><div class="k">Part 107 Certificate #</div><div class="v">${escapeHtml(o.certNumber)}</div></div>
        <div><div class="k">Status</div><div class="v"><span class="badge ${operatorCurrent(o)?'badge-available':'badge-missing'}">${operatorCurrent(o)?'Current':'Expired'}</span></div></div>
        <div><div class="k">Certificate Issued</div><div class="v">${o.certIssueDate||'—'}</div></div>
        <div><div class="k">Certificate Expires</div><div class="v">${o.certExpiration||'—'}</div></div>
        <div><div class="k">Last Recurrent Training</div><div class="v">${o.recurrentTrainingDate||'—'}</div></div>
        <div><div class="k">Total Flight Hours</div><div class="v">${o.totalFlightHours}h (${o.totalFlights} flights)</div></div>
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:12px;">Part 107 certificates are valid for 24 months. Recurrent training through the FAA WINGS program keeps a pilot current without retaking the knowledge test.</div>
    `;
    const editBtn = document.getElementById('btnEditOpFromDetail');
    if(editBtn) editBtn.addEventListener('click', ()=>openOperatorFormModal(o.personId));

  } else if(OPERATOR_DETAIL_TAB==='waivers'){
    body.innerHTML = `
      ${can('drone_operator_manage') ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddWaiver">${ICONS.plus} Add Waiver</button>` : ''}
      <table><thead><tr><th>Type</th><th>Issued</th><th>Expires</th><th>Status</th></tr></thead><tbody>
      ${o.waivers.map(w=>`<tr><td>${escapeHtml(w.type)}</td><td>${w.issueDate}</td><td>${w.expirationDate}</td><td><span class="badge ${w.expirationDate>=fmt(new Date())?'badge-available':'badge-missing'}">${w.expirationDate>=fmt(new Date())?'Active':'Expired'}</span></td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No waivers on file.</td></tr>`}
      </tbody></table>
    `;
    const addBtn = document.getElementById('btnAddWaiver');
    if(addBtn) addBtn.addEventListener('click', ()=>openWaiverFormModal(o));

  } else if(OPERATOR_DETAIL_TAB==='flights'){
    const list = STATE.drone.flights.filter(f=>f.operatorId===o.personId).sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML = `
      ${canFlightLog ? `<button class="btn btn-sm btn-primary" style="margin-bottom:12px;" id="btnAddOpFlight">${ICONS.plus} Log Flight</button>` : ''}
      <table><thead><tr><th>Date</th><th>Aircraft</th><th>Mission</th><th>Duration</th></tr></thead><tbody>
      ${list.map(f=>`<tr><td>${f.date}</td><td>${droneLink(f.droneId)}</td><td>${escapeHtml(f.missionType)}</td><td>${f.durationMin} min</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:16px;">No flights on file.</td></tr>`}
      </tbody></table>
    `;
    const addBtn = document.getElementById('btnAddOpFlight');
    if(addBtn) addBtn.addEventListener('click', ()=>openFlightFormModal(STATE.drone.drones.find(d=>d.assignedOperatorId===o.personId) || STATE.drone.drones[0]));
    wireDroneLinks();

  } else if(OPERATOR_DETAIL_TAB==='history'){
    const rows = o.fieldHistory.slice().reverse().map(h=>`
      <tr><td class="mono" style="font-size:12px;">${h.date}</td><td>${escapeHtml(h.field)}</td>
      <td style="font-size:12px;">${escapeHtml(JSON.stringify(h.before))}</td><td style="font-size:12px;">${escapeHtml(JSON.stringify(h.after))}</td><td>${escapeHtml(h.changedBy)}</td></tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);padding:16px;">No tracked field changes yet.</td></tr>`;
    body.innerHTML = `<table><thead><tr><th>Date</th><th>Field</th><th>Before</th><th>After</th><th>Changed By</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
}

function openWaiverFormModal(o){
  document.getElementById('modalBox').className = 'modal';
  document.getElementById('modalBox').innerHTML = `
    <div class="modal-head"><h3>Add Waiver</h3><button class="modal-close" id="mClose">&times;</button></div>
    <div class="modal-body">
      <div class="form-row"><label>Waiver Type</label><select id="fWvType">${STATE.drone.refData.waiverTypes.map(t=>`<option>${escapeHtml(t)}</option>`).join('')}</select></div>
      <div class="form-2col">
        <div class="form-row"><label>Issue Date</label><input type="date" id="fWvIssue" value="${fmt(new Date())}"></div>
        <div class="form-row"><label>Expiration Date</label><input type="date" id="fWvExpire" value="${fmt(addDays(new Date(),365))}"></div>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add Waiver</button></div>
  `;
  openModal();
  document.getElementById('mClose').onclick = closeModal;
  document.getElementById('mCancel').onclick = closeModal;
  document.getElementById('mSave').onclick = ()=>{
    const newW = { id:'wv'+Date.now(), type: document.getElementById('fWvType').value, issueDate: document.getElementById('fWvIssue').value, expirationDate: document.getElementById('fWvExpire').value, status:"Active" };
    o.waivers.push(newW);
    logActivity(`Added ${newW.type} waiver for ${personName(o.personId)}.`, "drone_operator", o.personId);
    persist();
    toast("Waiver added.");
    renderOperatorDetailModal();
  };
}

/* =========================================================================
   REPORTS & ANALYTICS
   ========================================================================= */
let DRONE_REPORT_TARGET = null;

function renderReports(){
  if(!can('drone_reports_view')){
    document.getElementById('view-drone-reports').innerHTML = permissionBlockedView("You don't have permission to view Drone Mgmt reports in this role.");
    return;
  }
  const canExport = can('drone_reports_export');
  if(!DRONE_REPORT_TARGET) DRONE_REPORT_TARGET = STATE.drone.drones[0].id;

  document.getElementById('view-drone-reports').innerHTML = `
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head"><h2>Individual Aircraft Activity Report</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <select id="droneReportTarget">${STATE.drone.drones.map(d=>`<option value="${d.id}" ${DRONE_REPORT_TARGET===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('')}</select>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportDroneReport">${ICONS.download} Export (CSV)</button>` : ''}
          <button class="btn btn-sm btn-outline" id="btnPrintDroneReport">Print / Save as PDF</button>
        </div>
      </div>
      <div class="panel-body" id="individualDroneReportBody"></div>
    </div>
    <div class="two-col" style="margin-bottom:16px;">
      <div class="panel">
        <div class="panel-head"><h2>DFR Response Times</h2><span class="hint">Target: under ${DFR_RESPONSE_TARGET_SECONDS}s</span></div>
        <div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartDfrTimes"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Flight Hours by Aircraft</h2></div>
        <div class="panel-body"><div class="chart-box" style="height:200px;"><canvas id="chartHoursByDrone"></canvas></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>Configurable Report Builder</h2><span class="hint">Pick an entity, group it, filter it, export it</span></div>
      <div class="panel-body">
        <div class="toolbar" style="margin-bottom:0;">
          <div class="filters">
            <select id="droneCrEntity">
              <option value="flights">Flights</option>
              <option value="maintenance">Maintenance</option>
              <option value="incidents">Incidents</option>
            </select>
            <select id="droneCrGroupBy"></select>
            <select id="droneCrDrone"><option value="All">All Aircraft</option>${STATE.drone.drones.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('')}</select>
            <input type="date" id="droneCrDateFrom">
            <input type="date" id="droneCrDateTo">
          </div>
          ${canExport ? `<button class="btn btn-sm btn-outline" id="btnExportDroneCustomReport">${ICONS.download} Export (CSV)</button>` : ''}
        </div>
        <div class="chart-box" style="height:220px;margin-top:14px;"><canvas id="chartDroneCustomReport"></canvas></div>
        <div id="droneCustomReportTable" style="margin-top:14px;overflow-x:auto;"></div>
      </div>
    </div>
  `;
  document.getElementById('droneReportTarget').addEventListener('change', e=>{ DRONE_REPORT_TARGET=e.target.value; renderIndividualDroneReport(); });
  document.getElementById('btnPrintDroneReport').addEventListener('click', ()=>window.print());
  renderIndividualDroneReport();
  renderDfrAndHoursCharts();
  renderDroneCustomReportBuilder();
  document.getElementById('droneCrEntity').addEventListener('change', renderDroneCustomReportBuilder);
  document.getElementById('droneCrDrone').addEventListener('change', renderDroneCustomReportBuilder);
  document.getElementById('droneCrDateFrom').addEventListener('change', renderDroneCustomReportBuilder);
  document.getElementById('droneCrDateTo').addEventListener('change', renderDroneCustomReportBuilder);
}

function renderIndividualDroneReport(){
  const d = droneFor(DRONE_REPORT_TARGET);
  if(!d) return;
  const flights = STATE.drone.flights.filter(f=>f.droneId===d.id).sort((a,b)=>b.date.localeCompare(a.date));
  const maint = STATE.drone.maintenanceRecords.filter(m=>m.droneId===d.id);
  const incidents = STATE.drone.incidents.filter(i=>i.droneId===d.id);
  const totalCost = maint.reduce((s,m)=>s+m.cost,0);

  document.getElementById('individualDroneReportBody').innerHTML = `
    <div class="detail-grid" style="margin-bottom:14px;">
      <div><div class="k">Aircraft</div><div class="v">${escapeHtml(d.name)} (${escapeHtml(d.model)})</div></div>
      <div><div class="k">Operator</div><div class="v">${escapeHtml(personName(d.assignedOperatorId))}</div></div>
      <div><div class="k">Status</div><div class="v"><span class="badge ${statusBadgeClassDrone(d.status)}">${d.status}</span></div></div>
      <div><div class="k">Total Flights on File</div><div class="v">${flights.length}</div></div>
      <div><div class="k">Total Flight Hours</div><div class="v">${d.totalFlightHours}h</div></div>
      <div><div class="k">Maintenance Cost on File</div><div class="v">${money(totalCost)}</div></div>
      <div><div class="k">Incidents on File</div><div class="v">${incidents.length}</div></div>
      <div><div class="k">Avg Battery Health</div><div class="v">${d.batteries.length ? Math.round(d.batteries.reduce((s,b)=>s+b.healthPct,0)/d.batteries.length)+'%' : '—'}</div></div>
    </div>
    <div class="panel" style="box-shadow:none;"><div class="panel-head"><h2>Flight History</h2></div>
      <div class="panel-body" style="padding:0;"><table><thead><tr><th>Date</th><th>Mission</th><th>Location</th><th>Duration</th></tr></thead><tbody>
      ${flights.map(f=>`<tr><td>${f.date}</td><td>${escapeHtml(f.missionType)}</td><td>${escapeHtml(f.location)}</td><td>${f.durationMin} min</td></tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:var(--text-dim);padding:12px;">No flights on file.</td></tr>`}
      </tbody></table></div>
    </div>
  `;
  const exportBtn = document.getElementById('btnExportDroneReport');
  if(exportBtn) exportBtn.onclick = ()=>{
    const headers = ["Section","Date","Type","Detail","Notes"];
    const csvRows = [
      ...flights.map(f=>["Flight", f.date, f.missionType, f.location, f.durationMin+"min"]),
      ...maint.map(m=>["Maintenance", m.date, m.type, m.technician, money(m.cost)]),
      ...incidents.map(i=>["Incident", i.date, i.type, i.caseNumber, i.reviewStatus]),
    ];
    exportCsvDrone(headers, csvRows, `${d.name.replace(/\s+/g,'_')}_activity_report.csv`);
  };
}

function renderDfrAndHoursCharts(){
  const dfrFlights = STATE.drone.flights.filter(f=>f.missionType==="DFR Response" && f.dispatchToAirborneSeconds!=null).sort((a,b)=>a.date.localeCompare(b.date));
  if(CHART_REFS_DRONE.dfr) CHART_REFS_DRONE.dfr.destroy();
  CHART_REFS_DRONE.dfr = safeChart('chartDfrTimes', {
    type:'bar',
    data:{ labels: dfrFlights.map(f=>f.date), datasets:[{label:'Seconds to Airborne', data: dfrFlights.map(f=>f.dispatchToAirborneSeconds), backgroundColor: dfrFlights.map(f=>f.dispatchToAirborneSeconds<=DFR_RESPONSE_TARGET_SECONDS?'#2E7D46':'#D34120')}] },
    options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:9}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{color:chartGridColor()}}}}
  });
  const hoursByDrone = {};
  STATE.drone.drones.forEach(d=>hoursByDrone[d.name]=d.totalFlightHours);
  if(CHART_REFS_DRONE.hours) CHART_REFS_DRONE.hours.destroy();
  CHART_REFS_DRONE.hours = safeChart('chartHoursByDrone', {
    type:'bar',
    data:{ labels:Object.keys(hoursByDrone), datasets:[{label:'Flight Hours', data:Object.values(hoursByDrone), backgroundColor:'#134DD1'}] },
    options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:9}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{color:chartGridColor()}}}}
  });
}

const DRONE_REPORT_GROUPBY = {
  flights: [['missionType','Mission Type'],['outcome','Outcome'],['airspaceAuthorization','Airspace Authorization']],
  maintenance: [['type','Type'],['technician','Technician']],
  incidents: [['type','Type'],['reviewStatus','Review Status']],
};

function renderDroneCustomReportBuilder(){
  const entity = document.getElementById('droneCrEntity').value;
  const groupSel = document.getElementById('droneCrGroupBy');
  const opts = DRONE_REPORT_GROUPBY[entity];
  const currentGroup = groupSel.dataset.current;
  const groupBy = (currentGroup && opts.find(([k])=>k===currentGroup)) ? currentGroup : opts[0][0];
  groupSel.innerHTML = opts.map(([k,label])=>`<option value="${k}" ${groupBy===k?'selected':''}>Group by ${label}</option>`).join('');
  groupSel.onchange = ()=>{ groupSel.dataset.current = groupSel.value; renderDroneCustomReportBuilder(); };
  groupSel.dataset.current = groupBy;

  const droneFilter = document.getElementById('droneCrDrone').value;
  const dateFrom = document.getElementById('droneCrDateFrom').value;
  const dateTo = document.getElementById('droneCrDateTo').value;

  let dataset;
  if(entity==='flights') dataset = STATE.drone.flights.map(f=>({...f, __date:f.date}));
  else if(entity==='maintenance') dataset = STATE.drone.maintenanceRecords.map(m=>({...m, __date:m.date}));
  else dataset = STATE.drone.incidents.map(i=>({...i, __date:i.date}));

  dataset = dataset.filter(row=>{
    if(droneFilter!=="All" && row.droneId!==droneFilter) return false;
    if(dateFrom && row.__date < dateFrom) return false;
    if(dateTo && row.__date > dateTo) return false;
    return true;
  });

  const counts = {};
  dataset.forEach(row=>{ const key = row[groupBy] || 'Unspecified'; counts[key] = (counts[key]||0)+1; });

  if(CHART_REFS_DRONE.custom) CHART_REFS_DRONE.custom.destroy();
  CHART_REFS_DRONE.custom = safeChart('chartDroneCustomReport', {
    type:'bar',
    data:{ labels:Object.keys(counts), datasets:[{label:'Count', data:Object.values(counts), backgroundColor:'#134DD1'}] },
    options: {maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:10}},grid:{display:false}},y:{ticks:{color:chartTextColor(),font:{family:'Archivo',size:11}},grid:{color:chartGridColor()}}}}
  });

  const groupLabel = opts.find(([k])=>k===groupBy)[1];
  const tableRows = dataset.slice(0,200).map(row=>`<tr><td>${row.droneId?droneLink(row.droneId):''}</td><td>${escapeHtml(String(row[groupBy]||''))}</td><td>${escapeHtml(row.__date||'')}</td></tr>`).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:14px;">No matching rows.</td></tr>`;
  document.getElementById('droneCustomReportTable').innerHTML = `
    <table><thead><tr><th>Aircraft</th><th>${groupLabel}</th><th>Date</th></tr></thead><tbody>${tableRows}</tbody></table>
    <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">${dataset.length} matching row(s)${dataset.length>200?' (showing first 200)':''}</div>
  `;
  wireDroneLinks();

  const exportBtn = document.getElementById('btnExportDroneCustomReport');
  if(exportBtn) exportBtn.onclick = ()=>exportCsvDrone(
    ["Aircraft", groupLabel, "Date"],
    dataset.map(row=>[row.droneId?droneFor(row.droneId).name:'', row[groupBy]||'', row.__date||'']),
    `drone_custom_report_${entity}.csv`
  );
}

function exportCsvDrone(headers, rows, filename){
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
   ADMIN: reference data, agency authorizations, notification routing, audit log
   ========================================================================= */
let ADMIN_TAB = 'makesModels';
const SIMPLE_LIST_TABS = {
  makesModels: {label:'Make / Model Catalog', usageCheck:(v)=>STATE.drone.drones.filter(d=>d.model===v).length},
  sensorPayloads: {label:'Sensor Payloads', usageCheck:(v)=>STATE.drone.drones.filter(d=>d.sensorPayload.includes(v)).length},
  missionTypes: {label:'Mission Types', usageCheck:(v)=>STATE.drone.flights.filter(f=>f.missionType===v).length},
  waiverTypes: {label:'Waiver Types', usageCheck:(v)=>STATE.drone.operators.some(o=>o.waivers.some(w=>w.type===v))?1:0},
  maintTypes: {label:'Maintenance Types', usageCheck:(v)=>STATE.drone.maintenanceRecords.filter(m=>m.type===v).length},
  incidentTypes: {label:'Incident Types', usageCheck:(v)=>STATE.drone.incidents.filter(i=>i.type===v).length},
  dockLocations: {label:'Dock / Base Locations', usageCheck:(v)=>STATE.drone.drones.filter(d=>d.homeDock===v).length},
};

function renderAdmin(){
  const canManage = can('drone_admin_categories');
  const canAudit = can('drone_admin_audit');
  if(!canManage && !canAudit){
    document.getElementById('view-drone-admin').innerHTML = permissionBlockedView("You don't have permission to view administration settings in this role.");
    return;
  }
  const tabs = [];
  if(canManage){
    Object.entries(SIMPLE_LIST_TABS).forEach(([key,cfg])=>tabs.push([key,cfg.label]));
    tabs.push(['authorizations','Agency Authorizations']);
    tabs.push(['notifications','Notification Routing']);
  }
  if(can('drone_bulk_import')) tabs.push(['bulkImport','Bulk Import']);
  if(canAudit) tabs.push(['audit','Platform Audit Log']);
  if(!tabs.find(([k])=>k===ADMIN_TAB)) ADMIN_TAB = tabs[0][0];

  document.getElementById('view-drone-admin').innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(([key,label])=>`<button class="btn btn-sm ${ADMIN_TAB===key?'btn-primary':'btn-outline'}" data-admin-tab-drone="${key}">${label}</button>`).join('')}
    </div>
    <div id="adminTabBodyDrone"></div>
  `;
  document.querySelectorAll('[data-admin-tab-drone]').forEach(b=>b.addEventListener('click', ()=>{ ADMIN_TAB=b.dataset.adminTabDrone; renderAdmin(); }));
  renderAdminTabBody();
}

function renderAdminTabBody(){
  const body = document.getElementById('adminTabBodyDrone');
  if(SIMPLE_LIST_TABS[ADMIN_TAB]) renderSimpleListTab(body, ADMIN_TAB);
  else if(ADMIN_TAB==='authorizations') renderAuthorizationsTab(body);
  else if(ADMIN_TAB==='notifications') renderNotificationRoutingTab(body);
  else if(ADMIN_TAB==='bulkImport') renderBulkImportTab(body, 'drone');
  else if(ADMIN_TAB==='audit') renderPlatformAuditLogTab(body);
}

function renderSimpleListTab(body, key){
  const cfg = SIMPLE_LIST_TABS[key];
  const list = STATE.drone.refData[key];
  const rows = list.map((v,i)=>{
    const inUse = cfg.usageCheck(v);
    return `<tr><td>${escapeHtml(v)}</td><td>${inUse?`<span class="badge badge-role">${inUse} in use</span>`:`<span style="color:var(--text-dim);font-size:12px;">unused</span>`}</td>
    <td><button class="btn-icon" data-remove-item-drone="${i}">${ICONS.trash}</button></td></tr>`;
  }).join('') || `<tr><td colspan="3" style="text-align:center;color:var(--text-dim);padding:16px;">No ${cfg.label.toLowerCase()} defined yet.</td></tr>`;
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>${cfg.label}</h2></div>
      <div class="panel-body">
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input type="text" id="newItemInputDrone" placeholder="Add a new item..." style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btnAddItemDrone">${ICONS.plus} Add</button>
        </div>
        <table><thead><tr><th>${cfg.label}</th><th>Usage</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
  document.getElementById('btnAddItemDrone').addEventListener('click', ()=>{
    const val = document.getElementById('newItemInputDrone').value.trim();
    if(!val){ toast("Enter a value first.", true); return; }
    if(list.includes(val)){ toast("That already exists.", true); return; }
    list.push(val);
    logActivity(`Added "${val}" to ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  });
  document.querySelectorAll('[data-remove-item-drone]').forEach(b=>b.addEventListener('click', ()=>{
    const idx = Number(b.dataset.removeItemDrone); const val = list[idx];
    if(cfg.usageCheck(val)>0){ toast(`Can't remove "${val}" \u2014 it's in use.`, true); return; }
    if(!confirm(`Remove "${val}"?`)) return;
    list.splice(idx,1);
    logActivity(`Removed "${val}" from ${cfg.label}.`, "admin");
    persist();
    renderAdminTabBody();
  }));
}

function renderAuthorizationsTab(body){
  body.innerHTML = `
    <div class="locked-note" style="background:var(--callout-blue-bg);border-color:var(--callout-blue-border);color:var(--blue);">
      ${ICONS.radio}<div>Agency-level airspace authorizations sit alongside individual pilot certifications and waivers (tracked per-operator). Most established public safety UAS programs operate under a mix of FAA Part 107 (fast to obtain, individual pilot-based) and Part 91 Public Aircraft Operations under a Certificate of Authorization (COA), which unlocks broader operational flexibility in exchange for more paperwork.</div>
    </div>
    <div class="panel"><div class="panel-head"><h2>Agency Authorization Reference</h2></div>
      <div class="panel-body">
        <div class="detail-grid">
          <div><div class="k">Operating Basis</div><div class="v">FAA Part 107 (Small UAS Rule)</div></div>
          <div><div class="k">COA on File</div><div class="v">Not on file in this prototype \u2014 track your agency's actual COA number and renewal date here in a full deployment.</div></div>
          <div><div class="k">Remote ID</div><div class="v">All active aircraft in this fleet are marked Remote ID compliant, a requirement for nearly all registered drones.</div></div>
          <div><div class="k">Registration Renewal Cycle</div><div class="v">Every 36 months per aircraft (tracked individually on each drone's record)</div></div>
        </div>
      </div>
    </div>
  `;
}

function renderNotificationRoutingTab(body){
  const roleOpts = (sel)=>STATE.roles.map(r=>`<option value="${r.id}" ${sel===r.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('');
  body.innerHTML = `
    <div class="panel"><div class="panel-head"><h2>Notification Routing</h2></div>
      <div class="panel-body">
        <div class="form-row"><label>Part 107 Certification Expiring Alerts</label><select id="fRouteDroneCert">${roleOpts(STATE.drone.notifySettings.certExpiringRoleId)}</select></div>
        <div class="form-row"><label>Aircraft Registration Expiring Alerts</label><select id="fRouteDroneReg">${roleOpts(STATE.drone.notifySettings.registrationExpiringRoleId)}</select></div>
        <div class="form-row"><label>Waiver Expiring Alerts</label><select id="fRouteDroneWaiver">${roleOpts(STATE.drone.notifySettings.waiverExpiringRoleId)}</select></div>
        <div class="form-row"><label>Maintenance / Battery Health Alerts</label><select id="fRouteDroneMaint">${roleOpts(STATE.drone.notifySettings.maintenanceRoleId)}</select></div>
        <button class="btn btn-primary btn-sm" id="btnSaveRoutingDrone">Save Routing</button>
      </div>
    </div>
  `;
  document.getElementById('btnSaveRoutingDrone').addEventListener('click', ()=>{
    STATE.drone.notifySettings.certExpiringRoleId = document.getElementById('fRouteDroneCert').value;
    STATE.drone.notifySettings.registrationExpiringRoleId = document.getElementById('fRouteDroneReg').value;
    STATE.drone.notifySettings.waiverExpiringRoleId = document.getElementById('fRouteDroneWaiver').value;
    STATE.drone.notifySettings.maintenanceRoleId = document.getElementById('fRouteDroneMaint').value;
    logActivity("Updated Drone Mgmt notification routing settings.", "admin");
    persist();
    toast("Notification routing saved.");
    renderNotifBell();
  });
}

/* =========================================================================
   MODULE ENTRY POINT
   ========================================================================= */
function startDroneModule(){
  renderNav();
  switchView('drone-dashboard');
}
window.DRONE = { start: startDroneModule, buildData, migrateData, recalcNotifications, NAV_ITEMS, switchView, renderView, refresh: ()=>renderView(ACTIVE_VIEW), openDroneDetail, openOperatorDetail, droneFor, operatorCurrent };

})();


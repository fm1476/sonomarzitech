import {response,resolveWorkspaceMembership,filterOfficerWorkspaceRecords} from "./core.mjs";

// Deliberate whitelist: only fields already exposed in record lists can be searched.
// Never search notes, case narratives, attachments or private personnel fields.
const TYPES={
  "qm.equipment":{kind:"equipment",mod:"qm",label:"Quartermaster",fields:["name","assetId","serialNumber","category"]},
  "fleet.vehicles":{kind:"vehicle",mod:"fleet",label:"Fleet",fields:["unitNumber","vin","licensePlate","make","model"]},
  "pm.records":{kind:"person",mod:"personnel",label:"Personnel",fields:["name","badgeNumber","employeeId"]},
  "k9.k9s":{kind:"k9",mod:"k9",label:"K9",fields:["name","badgeNumber"]},
  "drone.drones":{kind:"drone",mod:"drone",label:"Drone",fields:["name","serialNumber","faaNumber"]},
  "subpoena.subpoenas":{kind:"subpoena",mod:"subpoena",label:"Subpoenas",fields:["caseNumber","subpoenaNumber"]},
  "civil.papers":{kind:"paper",mod:"civil",label:"Civil Process",fields:["caseNumber","paperNumber"]},
  "grants.grants":{kind:"grant",mod:"grants",label:"Grants",fields:["grantName","name"]},
  "grants.seizures":{kind:"seizure",mod:"grants",label:"Asset Forfeiture",fields:["caseNumber","seizureNumber"]},
  "permits.applications":{kind:"permitApplication",mod:"permits",label:"Licensing & Permits",fields:["applicationNumber","status"]},
  "permits.licenses":{kind:"permitLicense",mod:"permits",label:"Licensing & Permits",fields:["licenseNumber","status"]},
  "permits.applicants":{kind:"permitApplicant",mod:"permits",label:"Licensing & Permits",fields:["name","email","phone"]},
  "permits.locations":{kind:"permitLocation",mod:"permits",label:"Licensing & Permits",fields:["address","city","zip"]}
};
function parseKey(key){
  try{const [path,id]=JSON.parse(key);return {collection:path.join("."),id:String(id)};}catch{return null;}
}
export async function searchWorkspaceRecords(client,auth,body){
  const tenantId=String(body?.tenant_id||""),agencyId=String(body?.agency_id||"");
  const q=String(body?.query||"").trim().toLowerCase();
  if(q.length<3||q.length>100)return response(400,{success:false,error:"Search requires 3–100 characters."});
  if(!/^[\w\s.@#/-]+$/u.test(q))return response(400,{success:false,error:"Invalid search characters."});
  const membership=await resolveWorkspaceMembership(client,auth,tenantId,agencyId);
  if(membership.error)return membership.error;
  // Search only explicitly whitelisted collections, tenant-scoped and agency-scoped.
  const clauses=[],values=[membership.tenantId,membership.agencyId,"%"+q.replace(/[\\%_]/g,"\\$&")+"%"];
  let i=4;
  for(const [collection,type] of Object.entries(TYPES)){
    const tests=type.fields.map(field=>"(value->>'"+field+"') ILIKE $3 ESCAPE '\\'").join(" OR ");
    clauses.push("((key::jsonb)->0 = $"+i++ +"::jsonb AND ("+tests+"))");
    values.push(JSON.stringify(collection.split(".")));
  }
  const result=await client.query(
    "SELECT key,value,deleted FROM suite_records WHERE tenant_id=$1 AND agency_id=$2 AND deleted=false AND ("+clauses.join(" OR ")+") LIMIT 120",
    values
  );
  // Reapply the exact authorization filter used to serve the workspace itself.
  const visible=membership.admin?result.rows:await filterOfficerWorkspaceRecords(client,membership,result.rows);
  const results=[];
  for(const row of visible){
    const key=parseKey(row.key);if(!key||key.id==='$order'||key.id==='$value')continue;
    const type=TYPES[key.collection];if(!type)continue;
    const value=row.value||{};
    const title=type.fields.map(f=>value[f]).find(v=>typeof v==="string"&&v.trim())||key.id;
    results.push({kind:type.kind,mod:type.mod,id:key.id,title:String(title).slice(0,180),sub:type.label});
    if(results.length>=20)break;
  }
  return response(200,{success:true,results});
}

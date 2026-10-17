// Evidence controls for fictional Demo cases only. These are not statutory rules.
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function date(value) {
  if (!text(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value+'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
}
export function validateTestIntake(record) {
  if (!object(record)) return ['Case record required.'];
  const errors=[];
  for (const key of ['caseNumber','courtOfOrigin','defendant','plaintiff','signedInstructions']) {
    if (!text(record[key])) errors.push('Required text: '+key);
  }
  if (!date(record.receivedDate)) errors.push('Valid received date required.');
  if (!Array.isArray(record.serviceAddresses) || !record.serviceAddresses.length ||
      !record.serviceAddresses.every(a=>object(a)&&text(a.address))) errors.push('Valid service addresses required.');
  if (JSON.stringify(record).length>20000) errors.push('Test record too large.');
  return errors;
}
export function validateTestTransition(stage,evidence,record,actor) {
  if (!object(evidence)) return ['Evidence object required.'];
  const errors=[];
  if (!text(evidence.note)) errors.push('Documented evidence note required.');
  if (JSON.stringify(evidence).length>20000) errors.push('Evidence too large.');
  const required={assigned:['assignedTo'],attempted:['attemptDate','attemptTime','attemptResult'],
    served:['serviceMethod','servedDate','servedTime','servedOnName','serverIdentity'],
    reviewed:['approvalReference'],closed:['returnReference','returnedDate']};
  if (!required[stage]) return ['Unsupported test stage.'];
  for (const key of required[stage]) if (!text(evidence[key])) errors.push('Missing evidence: '+key);
  for (const key of ['attemptDate','servedDate','returnedDate']) {
    if (key in evidence && !date(evidence[key])) errors.push('Invalid calendar date: '+key);
  }
  for (const key of ['attemptTime','servedTime']) {
    if (key in evidence && !/^([01]\d|2[0-3]):[0-5]\d$/.test(evidence[key])) errors.push('Invalid time: '+key);
  }
  if (stage==='served') {
    if (!['Personal Service','Substituted Service','Posting (Nail and Mail)'].includes(evidence.serviceMethod)) errors.push('Unsupported service method.');
    const extra=evidence.serviceMethod==='Substituted Service'
      ? ['substituteRecipient','recipientRelationship','followupMailingDate','followupMailingAddress']
      : evidence.serviceMethod==='Posting (Nail and Mail)' ? ['courtAuthorization','postingDate','mailingDate','mailingAddress'] : [];
    for(const key of extra) {
      if(!text(evidence[key])) errors.push('Missing evidence: '+key);
      else if(key.endsWith('Date')&&!date(evidence[key])) errors.push('Invalid calendar date: '+key);
    }
  }
  const history=Array.isArray(record?.testHistory)?record.testHistory:[];
  if(stage==='reviewed') {
    const service=history.findLast(h=>h.stage==='served');
    if(!service) errors.push('Recorded service required before review.');
    else if(service.actor===actor) errors.push('A different operator must review service.');
  }
  if(stage==='closed'&&!history.some(h=>h.stage==='reviewed')) errors.push('Recorded approval required before closure.');
  return errors;
}

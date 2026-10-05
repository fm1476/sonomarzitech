import fs from 'node:fs';

const core = fs.readFileSync('lambdas/api/core.mjs','utf8');
const subpoena = fs.readFileSync('frontend/assets/js/modules/subpoena.js','utf8');
const shared = fs.readFileSync('frontend/assets/js/modules/shared.js','utf8');
const permits = fs.readFileSync('frontend/assets/js/modules/permits.js','utf8');

for (const token of [
  'attachmentParentWriteAllowed',
  'parent_collection',
  'parent_id',
  'qm.equipment',
  'fleet.vehicles',
  'grants.seizures',
  'subpoena.subpoenas',
  'permits.applications'
]) {
  if (!core.includes(token)) throw new Error('Attachment authorization invariant missing: '+token);
}

if (!subpoena.includes('upload(file, parent)')) {
  throw new Error('Attachment client must require a parent record.');
}
if (!subpoena.includes('parent_collection: parent.collection') || !subpoena.includes('parent_id: parent.itemId')) {
  throw new Error('Attachment client must send parent context.');
}
if (!shared.includes('AWS_ATTACHMENTS.upload(prepared, attachmentParent)')) {
  throw new Error('Shared photo uploads are missing parent context.');
}
if (!permits.includes("collection:'permits.applications'")) {
  throw new Error('Permit documents are missing application parent context.');
}

console.log('Attachment authorization invariants passed.');

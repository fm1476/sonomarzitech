import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import pdfLib from '../lambdas/api/node_modules/pdf-lib/cjs/index.js';
const {PDFDocument,PDFName}=pdfLib;
const manifest=JSON.parse(await readFile(new URL('../lambdas/api/templates/civil/manifest.json',import.meta.url),'utf8'));
import {generateCaliforniaReturnDraft} from '../lambdas/api/lib/civil-california-returns.mjs';
const input={serverName:'Demo Officer',serverAddress:'123 Training Lane',serverPhone:'555-0100',smallClaimsDocument:'SC-100',courtStreet:'600 Example Drive',courtCityZip:'Sonoma CA 95476',courtBranch:'Fictional Training Court'};
for(const workflowId of ['summons','small-claims']){
 const record={id:'11111111-1111-4111-8111-111111111111',caseNumber:'TEST-CA-PDF',courtOfOrigin:'Sonoma',plaintiff:'Demo Plaintiff',defendant:'Demo Defendant',stage:'Served',california:{county:'Sonoma',workflowId,intakeDetails:{},service:{method:'Personal service',recipient:'Demo Defendant',address:'123 Fictional Lane',date:'2026-10-17',time:'13:05'}}};
 const draft=await generateCaliforniaReturnDraft(record,input),bytes=Buffer.from(draft.base64,'base64'),pdf=await PDFDocument.load(bytes),form=pdf.getForm();
 assert.equal(draft.templateSha256,manifest[workflowId==='summons'?'pos010':'sc104'].templateSha256);
 for(const field of form.getFields()){if(typeof field.getText==='function'&&field.getText()){for(const widget of field.acroField.getWidgets()){const value=widget.dict.get(PDFName.of('V'))||field.acroField.getValue();assert.ok(value,'Updated widget must retain an effective value');assert.ok(widget.dict.lookup(PDFName.of('AP')).get(PDFName.of('N')),'Updated widget must have an appearance');}}}
 assert.equal(pdf.getPageCount(),2);assert.equal(form.hasXFA(),false);const textFields=form.getFields().filter(f=>typeof f.getText==='function');assert.ok(textFields.some(f=>f.getText()==='TEST-CA-PDF'));assert.ok(textFields.some(f=>f.getText()==='Demo Officer'));assert.ok(!textFields.some(f=>f.getName().includes('SigDate')&&f.getText()),'Signing date must remain blank');
 for(const f of form.getFields().filter(f=>typeof f.isChecked==='function'&&/declare1/.test(f.getName())))assert.equal(f.isChecked(),false,'Do not certify or sign for the server');
 await assert.rejects(()=>generateCaliforniaReturnDraft({...record,california:{...record.california,service:{...record.california.service,method:'Substituted service'}}},input));
 await assert.rejects(()=>generateCaliforniaReturnDraft(record,{...input,serverName:'X'.repeat(250)}),/too long/);
 if(process.env.CIVIL_PDF_QA_DIR)await writeFile(process.env.CIVIL_PDF_QA_DIR+'/'+workflowId+'-unsigned.pdf',bytes);
}
console.log('California return drafts: official editable POS-010/SC-104 fields, XFA removal, blank signatures/certifications and overflow rejection passed.');

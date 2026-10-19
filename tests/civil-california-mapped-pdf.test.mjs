import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import pdfLib from '../lambdas/api/node_modules/pdf-lib/cjs/index.js';
const {PDFDocument}=pdfLib;
import {renderMappedCaliforniaCourtDraft} from '../lambdas/api/lib/civil-california-mapped-pdf.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
async function fixture(){
 const d=await PDFDocument.create(),p=d.addPage([612,792]);
 const f=d.getForm();
 for(const [name,y] of [['CaptionCase',680],['CaptionPlaintiff',650],['Signature',620]])f.createTextField(name).addToPage(p,{x:40,y,width:300,height:20});
 return Buffer.from(await d.save());
}
test('fills an explicitly mapped PDF field and keeps signature blank',async()=>{
 const bytes=await fixture();
 const d=await renderMappedCaliforniaCourtDraft({templateBytes:bytes,expectedTemplateSha256:hash(bytes),formCode:'EJ-150',
  mapping:{caseNumber:'CaptionCase',plaintiff:'CaptionPlaintiff'},fields:{caseNumber:'FAKE-123',plaintiff:'Example Agency'}});
 const output=await PDFDocument.load(Buffer.from(d.base64,'base64'));
 assert.equal(output.getForm().getTextField('CaptionCase').getText(),'FAKE-123');
 assert.equal(output.getForm().getTextField('Signature').getText(),undefined);
 assert.equal(d.unsigned,true);
});
test('requires approved matching hash, exact fields, and no signature map',async()=>{
 const bytes=await fixture();
 const props={templateBytes:bytes,expectedTemplateSha256:hash(bytes),formCode:'EJ-150',mapping:{caseNumber:'CaptionCase'},fields:{caseNumber:'TEST'}};
 await assert.rejects(renderMappedCaliforniaCourtDraft({...props,expectedTemplateSha256:'a'.repeat(64)}),/hash/);
 await assert.rejects(renderMappedCaliforniaCourtDraft({...props,mapping:{caseNumber:'Unrecognized'}}),/field map/);
 await assert.rejects(renderMappedCaliforniaCourtDraft({...props,mapping:{signature:'Signature'}}),/Signature/);
 await assert.rejects(renderMappedCaliforniaCourtDraft({...props,formCode:'EJ-130'}),/cannot be prepared/);
});

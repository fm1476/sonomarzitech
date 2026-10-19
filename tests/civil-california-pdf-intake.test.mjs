import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPdfBytes,sha256,inspectOfficialForm} from '../scripts/inspect-ca-official-pdf.mjs';
test('rejects HTML disguised as a PDF',()=>{
 const html=Buffer.from('<html>'+'.'.repeat(200)+'%%EOF');
 assert.throws(()=>checkPdfBytes(html),/must be a PDF/);
});
test('rejects truncated PDF and empty content',()=>{
 assert.throws(()=>checkPdfBytes(Buffer.from('%PDF-1.7')),/nonempty/);
 assert.throws(()=>checkPdfBytes(Buffer.from('%PDF-1.7\n'+'.'.repeat(200))),/trailer/);
});
test('PDF inspection refuses unknown official forms',async()=>{
 await assert.rejects(inspectOfficialForm(Buffer.from(''), 'NOT-A-FORM'),/Unsupported/);
});
test('SHA-256 is stable for auditing official source files',()=>{
 assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

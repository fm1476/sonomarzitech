#!/usr/bin/env node
// Official Judicial Council form intake. Run after downloading the current PDF
// from the verified court page. This tool inventories, but NEVER auto-approves,
// PDF versions or enables court-document generation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../lambdas/api/package.json',import.meta.url));
const APPROVED={
 'WG-002':{revision:'2026-01-01',source:'https://selfhelp.courts.ca.gov/jcc-form/WG-002'},
 'WG-005':{revision:'2026-07-01',source:'https://selfhelp.courts.ca.gov/jcc-form/WG-005'},
 'EJ-150':{revision:'2026-07-01',source:'https://selfhelp.courts.ca.gov/jcc-form/EJ-150'},
 'EJ-130':{revision:'2026-07-01',source:'https://selfhelp.courts.ca.gov/jcc-form/EJ-130'},
 'WG-006':{revision:'2026-01-01',source:'https://selfhelp.courts.ca.gov/jcc-form/WG-006'},
};
export const sha256=(bytes)=>createHash('sha256').update(bytes).digest('hex');
export function checkPdfBytes(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<128||bytes.length>30*1024*1024)
  throw Error('PDF must be a nonempty file no larger than 30 MB.');
 if(!bytes.subarray(0,8).toString('ascii').startsWith('%PDF-'))
  throw Error('Official form must be a PDF, not an HTML download or redirect.');
 if(!bytes.subarray(Math.max(0,bytes.length-2048)).includes(Buffer.from('%%EOF')))
  throw Error('Incomplete or invalid PDF trailer.');
 return true;
}
export async function inspectOfficialForm(bytes,code){
 if(!APPROVED[code])throw Error('Unsupported court form code.');
 checkPdfBytes(bytes);
 const {PDFDocument}=require('pdf-lib');
 const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});
 const form=pdf.getForm();
 const fields=form.getFields().map(f=>({
   name:f.getName(),type:f.constructor.name,
   widgets:f.acroField?.getWidgets?.().map(w=>({pageRef:String(w.P?.()||''),rect:w.getRectangle()}))||[]
 }));
 return {formCode:code,revision:APPROVED[code].revision,source:APPROVED[code].source,
  sha256:sha256(bytes),pageCount:pdf.getPageCount(),fieldCount:fields.length,
  fields,requiresHumanMapping:true,approvedForGeneration:false,
  // Even if fully fillable, judicial/levying-officer/employer signatures are not generated.
  signed:false};
}
async function main(){
 const [code,path,reportPath]=process.argv.slice(2);
 if(!APPROVED[code]||!path)throw Error('Usage: node scripts/inspect-ca-official-pdf.mjs WG-002 /path/to/official.pdf [report.json]');
 const bytes=await readFile(resolve(path));
 const report=await inspectOfficialForm(bytes,code);
 const output=resolve(reportPath||'/tmp/'+code.toLowerCase()+'-field-inventory.json');
 await mkdir(resolve(output,'..'),{recursive:true});
 await writeFile(output,JSON.stringify({...report,inputFile:basename(path)},null,2)+'\n');
 console.log('Official form field inventory:',output);
 console.log(JSON.stringify({formCode:code,sha256:report.sha256,pageCount:report.pageCount,fieldCount:report.fieldCount,approvedForGeneration:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1;});

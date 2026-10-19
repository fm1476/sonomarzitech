import {createHash} from 'node:crypto';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';

// Map exact AcroForm field names only after the official form has been inspected.
// This renderer never fabricates a court-issued writ, employer declaration,
// signature, sworn statement, or selected statutory certification.
const digest=v=>createHash('sha256').update(v).digest('hex');
const error=m=>{const e=new Error(m);e.code='CIVIL_PDF_FIELD_MAPPING';throw e;};
export async function renderMappedCaliforniaCourtDraft({templateBytes,expectedTemplateSha256,fields,mapping,formCode}){
 if(!Buffer.isBuffer(templateBytes)||!templateBytes.subarray(0,8).toString('ascii').startsWith('%PDF-'))
  error('A genuine official PDF binary is required.');
 if(!/^[a-f0-9]{64}$/.test(expectedTemplateSha256||'')||digest(templateBytes)!==expectedTemplateSha256)
  error('The official template hash does not match its approved version.');
 if(!mapping||!Object.keys(mapping).length)error('An independently reviewed explicit field mapping is required.');
 if(!formCode||!(/^(WG-002|WG-005|EJ-150|WG-006)$/.test(formCode)))
  error('This form cannot be prepared through unsigned-draft generation.');
 const pdf=await PDFDocument.load(templateBytes);
 const form=pdf.getForm();
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 const declared=new Map(form.getFields().map(f=>[f.getName(),f]));
 for(const [logicalName,targetName] of Object.entries(mapping)){
  if(/signature|signingdate|declaration|certif|oath|courtseal|judicial/i.test(logicalName))
   error('Signature, declaration, certification and judicial fields cannot be auto-populated.');
  if(typeof targetName!=='string'||!declared.has(targetName))
   error('Missing or ambiguous official field map: '+logicalName);
  const target=declared.get(targetName);
  if(target.constructor.name!=='PDFTextField')
   error('Only inspected text fields may be automatically populated: '+logicalName);
  const value=fields?.[logicalName];
  if(value===undefined||value===null||value==='')continue;
  if(typeof value!=='string'&&typeof value!=='number')error('Only text values are permitted.');
  const str=String(value);
  if(str.length>350)error('Field value exceeds safe review limit.');
  try{font.encodeText(str);}catch{error('Field contains a character unavailable in the PDF template font.');}
  const widget=target.acroField.getWidgets()[0];
  if(!widget)error('Mapped official field is missing its visible widget.');
  const rect=widget.getRectangle();
  if(font.widthOfTextAtSize(str,8)>rect.width-6)error('Mapped text would overflow its official field.');
  target.setFontSize(8);
  target.setText(str);
 }
 form.updateFieldAppearances(font);
 // Unsigned draft notice placed inside the existing page, not a statement
 // that the underlying form is issued or accepted by a court.
 const first=pdf.getPages()[0];
 first.drawText('UNSIGNED WORKING DRAFT - REVIEW ALL REQUIRED FIELDS BEFORE USE',
   {x:30,y:Math.max(20,first.getHeight()-20),size:7,font,color:rgb(.65,0,0)});
 const bytes=Buffer.from(await pdf.save());
 return {formCode,filename:formCode+'-unsigned-draft.pdf',contentType:'application/pdf',
   base64:bytes.toString('base64'),sha256:digest(bytes),templateSha256:expectedTemplateSha256,unsigned:true};
}

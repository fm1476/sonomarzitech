import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {CivilError} from './civil-california-domain.mjs';

const SOURCE={
  'POS-020':'pos020.pdf',
  'POS-030':'pos030.pdf',
  'POS-040':'pos040.pdf'
};
const sha=value=>createHash('sha256').update(value).digest('hex');
const required=(input,key,label=key)=>{
  const value=input?.[key];
  if(typeof value!=='string'||!value.trim()||value.length>350)
    throw new CivilError('Provide '+label+' to generate this unsigned draft.');
  return value.trim();
};
const mdy=date=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date||'');if(!m)throw new CivilError('A completed service date is required.');return m[2]+'/'+m[3]+'/'+m[1];};

export async function generateAdditionalCaliforniaPosDraft(record,input){
  const code=input?.formCode;
  if(!Object.hasOwn(SOURCE,code))throw new CivilError('Select a supported court proof form.');
  const c=record.california||{},service=c.service||{};
  if(record.stage!=='Served'||['summons','small-claims'].includes(c.workflowId))
    throw new CivilError('The additional POS forms require a served, non-summons, non-small-claims case.');
  if(!['POS-020','POS-030','POS-040'].includes(code))throw new CivilError('Unsupported court form.');
  if(code==='POS-030'&&service.method!=='First-class mail')
    throw new CivilError('POS-030 requires first-class mail service recorded in the case.');
  if(code!=='POS-030'&&service.method!=='Personal service')
    throw new CivilError(code+' currently supports recorded personal delivery only.');
  if(!service.date||!service.address||!service.recipient)
    throw new CivilError('Record who was served, where and when before generating a form.');
  if(input.recipientName&&input.recipientName.trim()!==service.recipient.trim())
    throw new CivilError('The named recipient must match the recorded service recipient.');
  const serverName=required(input,'serverName','the server name');
  const serverAddress=required(input,'serverAddress','the server residence or business address');
  const documents=required(input,'documentsServed','a description of the documents actually served');
  const template=await readFile(new URL('../templates/civil/'+SOURCE[code],import.meta.url));
  const templateSha256=sha(template);
  const manifest=JSON.parse(await readFile(new URL('../templates/civil/manifest.json',import.meta.url),'utf8'));
  if(templateSha256!==manifest[code.toLowerCase().replace('-','')]?.templateSha256)
    throw new CivilError('Unapproved court template version. Generation is disabled pending review.',409);
  const pdf=await PDFDocument.load(template),form=pdf.getForm();
  form.deleteXFA();
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const fields=form.getFields();
  const field=suffix=>{
    const matches=fields.filter(f=>f.getName().endsWith(suffix));
    if(matches.length!==1)throw new CivilError('Invalid field map for '+code+': '+suffix,409);
    return matches[0];
  };
  const put=(suffix,value)=>{
    if(value===undefined||value===null||value==='')return;
    const f=field(suffix),valueText=String(value);
    try{font.encodeText(valueText);}catch{throw new CivilError('Court form contains non-renderable text. Complete the official form manually.');}
    const rect=f.acroField.getWidgets()[0]?.getRectangle();
    if(!rect)throw new CivilError('Missing form widget.',409);
    const width=Math.max(15,rect.width-6),height=Math.max(8,rect.height-3),size=8;
    const words=valueText.split(/\s+/);
    let count=1,line=0;
    for(const word of words){
      const w=font.widthOfTextAtSize(word+' ',size);
      if(w>width)throw new CivilError('A court form field is too long. Shorten the description or complete the form manually.');
      if(line+w>width){count++;line=w;}else line+=w;
    }
    if(count>Math.max(1,Math.floor(height/10)))throw new CivilError('A court form field is too long. Shorten it or complete manually.');
    f.setFontSize(size);f.setText(valueText);
  };
  const tick=suffix=>field(suffix).check();
  const date=mdy(service.date);
  const courtStreet=input.courtStreet||'',courtCityZip=input.courtCityZip||'';
  const firstTwo={
    'CaseNumber[0].CaseNumber[0]':record.caseNumber,
    'CourtInfo[0].CrtCounty[0]':c.county,
    'CourtInfo[0].CrtStreet[0]':courtStreet,
    'CourtInfo[0].CrtCityZip[0]':courtCityZip,
    'CourtInfo[0].CrtBranch[0]':input.courtBranch||'',
    'TitlePartyName[0].Party1[0]':record.plaintiff,
    'TitlePartyName[0].Party2[0]':record.defendant,
    'AttyPartyInfo[0].TextField1[0]':input.attorneyPartyInfo||'',
    'AttyPartyInfo[0].Phone[0]':input.attorneyPhone||'',
    'AttyPartyInfo[0].Email[0]':input.attorneyEmail||''
  };
  if(code!=='POS-040'){
    for(const [suffix,value] of Object.entries(firstTwo))put(suffix,value);
    if(code==='POS-020'){
      put('List2[0].item2[0].FillText18[0]',documents);
      put('List3[0].Lia[0].FillText1[0]',service.recipient);
      put('List3[0].Lib[0].FillText2[0]',service.address);
      put('List3[0].Lic[0].FillText3[0]',date);
      put('List3[0].Lid[0].TextField4[0]',service.time||'');
      put('List5[0].item5[0].FillText21[0]',[serverName,serverAddress,input.serverPhone||''].filter(Boolean).join(', '));
      put('Sign[0].FillText31[0]',serverName);
      // Declaration (item 6), process-server registration, and signature
      // are intentionally not selected by the platform.
    }else{
      put('List2[0].item2[0].FillText18[0]',serverAddress);
      put('List3[0].item3[0].FillText20[0]',date);
      put('List3[0].item3[0].FillText22[0]',required(input,'mailingCityState','the city/state where mail was deposited'));
      put('List3[0].item3[0].FillText21[0]',documents);
      put('List5[0].Lia[0].FillText109[0]',service.recipient);
      put('List5[0].Lib[0].FillText21[0]',service.address);
      const method=required(input,'mailingMethod','the USPS mailing method');
      if(method==='USPS deposit')tick('List4[0].Lia[0].ch1[0]');
      else if(method==='Business collection')tick('List4[0].Lib[0].ch1[0]');
      else throw new CivilError('Use USPS deposit or Business collection.');
      put('Sign[0].FillText31[0]',serverName);
    }
  }else{
    put('StdP1Header_sf[0].CourtInfo[0].CrtCounty_ft[0]',c.county);
    put('StdP1Header_sf[0].CourtInfo[0].Street_ft[0]',courtStreet);
    put('StdP1Header_sf[0].CourtInfo[0].CityZip_ft[0]',courtCityZip);
    put('StdP1Header_sf[0].CourtInfo[0].Branch_ft[0]',input.courtBranch||'');
    put('StdP1Header_sf[0].TitlePartyName[0].Party1_ft[0]',record.plaintiff);
    put('StdP1Header_sf[0].TitlePartyName[0].Party2_ft[0]',record.defendant);
    put('StdP1Header_sf[0].CaseNumber[0].CaseNumber_ft[0]',record.caseNumber);
    put('FillText18[0]',serverAddress);
    put('FillText20[0]',date);
    put('FillText21[0]',documents);
    put('FillText22[0]',service.recipient);
    put('FillText23[0]',service.address);
    tick('Page1[0].CheckBox6[0]');
    put('P2Header_gp[0].CaseNumber_ft[0]',record.caseNumber);
    put('P2Header_gp[0].Party_ft[0]',record.plaintiff+' v. '+record.defendant);
    put('Page2[0].FillText34[0]',serverName);
    // Item 6(a) service method is selected. Do not check the
    // under-penalty-of-perjury statements or fill signing dates.
  }
  form.updateFieldAppearances(font);
  for(const page of pdf.getPages()){
    page.node.wrapContentStreams(pdf.context.register(pdf.context.flateStream('q\n')),pdf.context.register(pdf.context.flateStream('Q\n')));
    page.drawText('DRAFT - UNSIGNED - VERIFY AND SIGN BEFORE COURT USE',{x:35,y:783,size:7,font,color:rgb(.62,0,0)});
  }
  const bytes=await pdf.save();
  return {filename:code+'-'+record.id+'-unsigned.pdf',formName:code,contentType:'application/pdf',base64:Buffer.from(bytes).toString('base64'),sha256:sha(bytes),templateSha256};
}

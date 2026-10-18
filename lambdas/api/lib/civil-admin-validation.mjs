const LIST_KEYS = new Set(['paperTypes','courtsOfOrigin','serviceMethods','attemptResults','propertyTypes','propertyDisposalMethods','propertyStorageLocations','propertySeizureStatuses','realPropertyTypes','realPropertyLevyStatuses']);
const SETTINGS_KEYS = new Set(['notifySettings','feeSchedule','feeCategoryGLCodes','paymentMethodGLCodes','financialSettings',...LIST_KEYS]);
const plain = v => v!==null && typeof v==='object' && !Array.isArray(v) && Object.getPrototypeOf(v)===Object.prototype;
export function validateCivilAdminSetting(section,value){
  if(!SETTINGS_KEYS.has(section))throw Error('Unsupported Civil administration setting.');
  if(section==='financialSettings'){
    if(!plain(value)||Object.keys(value).sort().join(',')!=='feeCategoryGLCodes,feeSchedule,paymentMethodGLCodes')throw Error('Invalid financial settings.');
    return {feeSchedule:validateCivilAdminSetting('feeSchedule',value.feeSchedule),feeCategoryGLCodes:validateCivilAdminSetting('feeCategoryGLCodes',value.feeCategoryGLCodes),paymentMethodGLCodes:validateCivilAdminSetting('paymentMethodGLCodes',value.paymentMethodGLCodes)};
  }
  if(LIST_KEYS.has(section)){
    if(!Array.isArray(value)||value.length>150||value.some(v=>typeof v!=='string'||!v.trim()||v.length>160))throw Error('Invalid Civil reference list.');
    if(new Set(value.map(v=>v.trim().toLowerCase())).size!==value.length)throw Error('Duplicate Civil reference values.');
    return value.map(v=>v.trim());
  }
  if(section==='feeCategoryGLCodes'||section==='paymentMethodGLCodes'){
    if(!plain(value)||Object.keys(value).length>60||Object.entries(value).some(([k,v])=>k.length>120||typeof v!=='string'||v.length>100))throw Error('Invalid GL codes.');
    return value;
  }
  if(section==='notifySettings'){
    if(!plain(value)||Object.keys(value).sort().join(',')!=='priorityUnassignedRoleId,returnDueRoleId')throw Error('Invalid notification routing.');
    for(const id of Object.values(value))if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id))throw Error('Invalid notification recipient role.');
    return value;
  }
  if(!plain(value)||JSON.stringify(value).length>30000)throw Error('Invalid Civil fee configuration.');
  const permitted=new Set(['mileageRatePerMile','interestRateAnnualPercent','commissionRatePercent','feeWaiverApprovalThreshold','voidApprovalThreshold','byType']);
  if(Object.keys(value).some(k=>!permitted.has(k)))throw Error('Unknown Civil fee configuration field.');
  for(const [key,n] of Object.entries(value))if(key!=='byType'&&(!Number.isFinite(n)||n<0||n>1000000))throw Error('Invalid Civil fee amount.');
  if(!plain(value.byType)||Object.keys(value.byType).length>150)throw Error('Invalid paper-type fee configuration.');
  for(const fee of Object.values(value.byType)){
    if(!plain(fee))throw Error('Invalid paper-type fee entry.');
    for(const [k,v] of Object.entries(fee)){
      if(['baseFee','additionalAttemptFee','defaultDeadlineDays','requiredAttempts'].includes(k)){if(!Number.isFinite(v)||v<0||v>1000000)throw Error('Invalid paper-type fee number.');}
      else if(['feeWaived','enforceable'].includes(k)){if(typeof v!=='boolean')throw Error('Invalid fee boolean.');}
      else if(k==='allowedServiceMethods'){if(!Array.isArray(v)||v.length>30||v.some(m=>typeof m!=='string'||!m.trim()||m.length>160))throw Error('Invalid service methods.');}
      else throw Error('Unknown paper-type fee setting.');
    }
  }
  return value;
}

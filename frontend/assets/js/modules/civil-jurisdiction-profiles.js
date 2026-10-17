/* SonoMarzi Civil jurisdiction profiles. No automatic activation or changes to STATE. */
(function(root){
  'use strict';
  const profiles = Object.freeze({
    'US-GENERAL': Object.freeze({id:'US-GENERAL',version:'1.0.0',status:'unconfigured',state:null,workflows:[]}),
    'US-CA': Object.freeze({
      id:'US-CA',version:'0.1.0',status:'draft',state:'CA',
      displayName:'California Civil Process',
      workflows:[
        {id:'summons',label:'Summons and Complaint',intakeForms:['SER-001'],reviewRequired:true},
        {id:'earnings-withholding',label:'Earnings Withholding',intakeForms:['WG-001'],reviewRequired:true},
        {id:'writ-execution',label:'Writ of Execution',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'possession',label:'Writ of Possession',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'personal-property-levy',label:'Personal Property Levy',intakeForms:['SER-001','SER-001A'],reviewRequired:true},
        {id:'real-property-levy',label:'Real Property Levy',intakeForms:['SER-001','SER-001A'],reviewRequired:true}
      ],
      safeguards:{
        statutoryFeesRequireApproval:true,
        serviceMethodEvidenceRequired:true,
        separateWritExpiration:true,
        preserveCaseRuleVersion:true,
        trustAccountingReviewRequired:true
      }
    })
  });
  function get(id){return profiles[id] || null;}
  function prepareSelection(id,county){
    const profile=get(id);
    if(!profile) throw new Error('Unknown civil jurisdiction profile');
    return {profileId:profile.id,profileVersion:profile.version,county:String(county||'').trim(),status:'draft',activatedAt:null,activatedBy:null};
  }
  function canActivate(selection){
    return !!selection && selection.profileId==='US-CA' && false; // Block until statutory and operational signoff.
  }
  const api=Object.freeze({get,prepareSelection,canActivate});
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.SonoMarziCivilProfiles=api;
})(typeof globalThis!=='undefined'?globalThis:this);

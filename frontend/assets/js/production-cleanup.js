(function(){
  function cleanAwsDevChrome(){
    [
      'awsAuthBridgeButton',
      'awsDemoMigrationButton',
      'awsMeTestButton',
      'awsWorkspaceTestButton',
      'awsWriteTestButton',
      'awsDemoTemplateButton',
      'awsAccessRulesInspectButton',
      'awsAccessRulesImportButton',
      'awsMembershipInspectButton',
      'supabaseMembershipInspectButton',
      'awsMembershipImportButtonFixed',
      'awsMembershipImportPanel'
    ].forEach(id=>document.getElementById(id)?.remove());

    [...document.querySelectorAll('button')].forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(
        text.startsWith('Copy Demo PD') ||
        text.startsWith('Inspect AWS') ||
        text.startsWith('Inspect Supabase') ||
        text.startsWith('Test AWS ')
      ){
        if(btn.id!=='awsCognitoLoginButton') btn.remove();
      }
    });
  }

  document.addEventListener('DOMContentLoaded',cleanAwsDevChrome);
  window.addEventListener('load',cleanAwsDevChrome);
  setTimeout(cleanAwsDevChrome,500);
})();

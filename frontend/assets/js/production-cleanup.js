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

  function collapseDashboardFirstModuleMenus(){
    document.querySelectorAll('.module-navgroup').forEach(group=>{
      const header=group.querySelector('.nav-mod-header');
      const name=(header?.textContent||'').replace(/[+\-]/g,'').trim().toLowerCase();
      if(name!=='drone management' && name!=='fleet management' && name!=='k9 management' && name!=='eod management' && name!=='personnel administration') return;
      group.querySelectorAll('.navline, .navitem, .nav-subitem, .nav-mod-items, .nav-mod-body, [data-nav-item]').forEach(line=>{ line.style.display='none'; });
      [...group.children].forEach(child=>{ if(child!==header && !child.contains(header)) child.style.display='none'; });
      group.classList.add('dashboard-first-module');
    });
  }

  function cleanProductionChrome(){
    cleanAwsDevChrome();
    collapseDashboardFirstModuleMenus();
  }

  document.addEventListener('DOMContentLoaded',cleanProductionChrome);
  window.addEventListener('load',cleanProductionChrome);
  setTimeout(cleanProductionChrome,500);
  setTimeout(cleanProductionChrome,1500);
  new MutationObserver(collapseDashboardFirstModuleMenus).observe(document.documentElement,{childList:true,subtree:true});
})();

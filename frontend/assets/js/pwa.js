// PWA installability: service worker registration + install prompt wiring.
// Kept separate from the app's auth/data bootstrap above on purpose, so it
// runs the same whether someone's on the real login screen or in the
// local/demo bypass, and so a failure here never blocks the app itself.
(function(){
  const CURRENT_BUILD_VERSION = document.querySelector('meta[name="app-build-version"]')?.content || '';
  function showUpdateBanner(){
    const strip = document.getElementById('updateAvailableStrip');
    if(strip) strip.hidden = false;
    // Also visible before sign-in, or if the person is on a very old build that predates the
    // banner element existing at all -- a console message is a fallback of last resort, not a
    // replacement for the visible banner.
    console.log('[update] A newer version of this app is available. Reload the page (or restart the app if installed) to get the latest fixes.');
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').then(registration=>{
        // If a waiting worker already exists at registration time, a newer version was already
        // deployed before this tab ever loaded.
        if(registration.waiting) showUpdateBanner();
        registration.addEventListener('updatefound', ()=>{
          const installing = registration.installing;
          if(!installing) return;
          installing.addEventListener('statechange', ()=>{
            // "installed" while a controller already exists (i.e. this isn't the very first
            // load) means a new version finished downloading and is ready -- this is the
            // standard, most reliable way a browser tells a page "an update exists."
            if(installing.state==='installed' && navigator.serviceWorker.controller) showUpdateBanner();
          });
        });
      }).catch(()=>{ /* non-fatal: app works fine without it */ });
      // Ask the browser to check for a new service worker periodically, since it otherwise only
      // checks on navigation -- a tab left open for hours might not notice a new deploy for a
      // long time without this nudge.
      setInterval(()=>{ navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{}); }, 10*60*1000);
    });
  }

  // Fallback for any case where service-worker update detection doesn't fire (browsers/contexts
  // where it's flaky, or a tab that loaded before the service worker itself existed): fetch the
  // currently-deployed page directly, bypassing any cache, and compare its build marker against
  // what this tab is actually running.
  async function checkForNewBuildDirectly(){
    if(!CURRENT_BUILD_VERSION) return; // nothing to compare against on a build that predates this
    try{
      const res = await fetch(location.pathname, {cache:'no-store'});
      const html = await res.text();
      const match = html.match(/<meta name="app-build-version" content="([^"]*)"/);
      if(match && match[1] && match[1] !== CURRENT_BUILD_VERSION) showUpdateBanner();
    }catch(e){ /* offline or blocked -- silently skip, this is just a courtesy check */ }
  }
  setInterval(checkForNewBuildDirectly, 10*60*1000);
  // Also check shortly after load, in case a deploy happened while this tab already had the
  // page open in the background before its first paint.
  setTimeout(checkForNewBuildDirectly, 30*1000);

  let deferredInstallPrompt = null;
  const installBtn = document.getElementById('btnInstallApp');
  const installLabel = document.getElementById('btnInstallAppLabel');

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredInstallPrompt = e;
    if(installBtn) installBtn.hidden = false;
  });

  if(installBtn){
    installBtn.addEventListener('click', async ()=>{
      if(!deferredInstallPrompt) return;
      installBtn.disabled = true;
      try{
        await deferredInstallPrompt.prompt();
        const {outcome} = await deferredInstallPrompt.userChoice;
        if(outcome === 'accepted') installBtn.hidden = true;
      }catch{ /* The browser may expire an install prompt. */ }
      finally{ deferredInstallPrompt = null; installBtn.disabled = false; }
    });
  }

  window.addEventListener('appinstalled', ()=>{
    deferredInstallPrompt = null;
    if(installBtn) installBtn.hidden = true;
  });

  // iOS Safari never fires beforeinstallprompt, "Add to Home Screen" is manual
  // via the share sheet. Surface a one-line hint there instead of a dead button.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if(isInStandalone && installBtn) installBtn.hidden = true;
  window.addEventListener('online', checkForNewBuildDirectly);
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'visible'){
      checkForNewBuildDirectly();
      navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});
    }
  });
  if(isIOS && !isInStandalone && installBtn){
    installBtn.hidden = false;
    installBtn.addEventListener('click', ()=>{
      toast('On iPhone/iPad: tap the Share icon, then "Add to Home Screen".');
    });
    if(installLabel) installLabel.textContent = 'Add to Home Screen';
  }
})();

/* Compact export controls preserve each screen's existing permissions and filters. */
window.SuiteExports={
  mount(host,options,onDownload){
    const label=document.createElement('label');label.className='export-picker';label.append('Export report ');
    const select=document.createElement('select');select.setAttribute('aria-label','CSV report type');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select export type';select.append(placeholder);
    for(const [id,name] of options){const option=document.createElement('option');option.value=id;option.textContent=name.replace(/ CSV$/,'');select.append(option);}label.append(select);host.append(label);
    const button=document.createElement('button');button.className='btn btn-sm btn-outline';button.textContent='Download CSV';button.disabled=true;button.dataset.exportConfirmed='true';select.onchange=()=>{button.disabled=!select.value;};button.onclick=()=>{const option=options.find(([id])=>id===select.value);if(option&&confirm('Download '+option[1]+' for the current filters and authorized records?'))onDownload(option[0]);};host.append(button);
    const hint=document.createElement('p');hint.className='hint';hint.textContent='Exports use the current filters and records you are authorized to view.';host.append(hint);
  }
};
(function(){
 function polish(){
  document.querySelectorAll('button').forEach(button=>{
   if(button.dataset.exportPolished||button.dataset.exportConfirmed||!/(?:export|download).*csv|csv$/i.test(button.textContent.trim()))return;
   // Template downloads and import tools keep their explicit labels.
   if(/template|import/i.test(button.textContent))return;
   const name=button.textContent.trim();button.dataset.exportPolished='true';button.setAttribute('aria-label',name);button.title=name;button.textContent='Export';button.classList.add('btn-sm');
   button.addEventListener('click',event=>{if(!confirm('Download '+name.replace(/^Export\s*/i,'')+' for the current view?')){event.preventDefault();event.stopImmediatePropagation();}},true);
  });
 }
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});}).observe(document.body,{childList:true,subtree:true});polish();
})();

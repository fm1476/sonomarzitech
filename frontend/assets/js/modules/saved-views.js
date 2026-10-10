/* Saved filter views and table paging use device preferences, never agency records. */
(()=>{
 const selectedViews=new Map();
 // One shared header utility rail for all module subsections; future modules inherit it.
 function placeViewToolbar(active){
   const banner=document.getElementById('tenantIdentityBanner');
   let rail=document.getElementById('moduleViewUtilityRail');
   if(rail && rail.dataset.viewId!==active.id){rail.remove();rail=null;}
   const saved=active.querySelector('.saved-view-tools')||rail?.querySelector('.saved-view-tools');
   const back=active.querySelector('[data-module-dashboard-back]')||rail?.querySelector('[data-module-dashboard-back]');
   if(!saved&&!back){rail?.remove();return;}
   if(!rail){
     rail=document.createElement('div');
     rail.id='moduleViewUtilityRail';
     rail.className='module-view-utility-rail';
     rail.dataset.viewId=active.id;
   }
   if(saved){saved.dataset.forView=active.id;rail.append(saved);}
   if(back){back.style.marginBottom='0';rail.append(back);}
   if(banner)banner.append(rail);
   else active.prepend(rail); // Safe fallback for contexts without an identity strip.
 }
 const base=SuiteUX.enhance;
 SuiteUX.enhance=function(){base();const active=document.querySelector('.view.active');if(!active)return;
  const filters=[...active.querySelectorAll('.toolbar .filters input[id]:not(.searchable-select-input),.toolbar .filters select[id]')];
  if(filters.length&&!active.querySelector('.saved-view-tools')&&!document.querySelector('#moduleViewUtilityRail[data-view-id="'+active.id+'"] .saved-view-tools')){
    const key='saved-filters.'+active.id;
    const saved=SuiteUX.preferences.get(key,[]);
    // Defaults come from the module's own controls, not from a saved view.
    // Text filters reset to blank; selects reset to their initial "All" or first option.
    const defaults=Object.fromEntries(filters.map(field=>{
      if(field.tagName!=='SELECT')return [field.id,''];
      const all=[...field.options].find(option=>option.value==='All');
      return [field.id,all?.value??field.options[0]?.value??''];
    }));
    const bar=document.createElement('div');
    bar.className='saved-view-tools';
    bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px';
    const select=document.createElement('select');
    select.setAttribute('aria-label','Saved filter view');
    const defaultOption=document.createElement('option');
    defaultOption.value='';
    defaultOption.textContent='Default View';
    select.append(defaultOption);
    saved.forEach((view,i)=>{
      const option=document.createElement('option');
      option.value=String(i);
      option.textContent=view.name;
      select.append(option);
    });
    const applyValues=values=>{
      // A filter change may re-render its module, so retrieve each field by ID.
      Object.entries(values).forEach(([id,value])=>{
        const field=document.getElementById(id);
        if(!field)return;
        field.value=value;
        field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));
      });
    };
    const remove=document.createElement('button');
    remove.type='button';
    remove.className='btn btn-outline btn-sm';
    remove.textContent='×';
    remove.setAttribute('aria-label','Delete selected saved view');
    remove.title='Delete selected saved view';
    remove.hidden=true;
    const updateRemove=()=>{remove.hidden=select.value==='';};
    const previous=selectedViews.get(active.id);
    if(previous!==undefined&&previous!==''&&saved[Number(previous)])select.value=previous;
    updateRemove();
    select.onchange=()=>{
      selectedViews.set(active.id,select.value);
      if(select.value===''){updateRemove();applyValues(defaults);return;}
      const view=saved[Number(select.value)];
      if(view?.values)applyValues(view.values);
      updateRemove();
    };
    bar.append(select,remove);
    remove.onclick=()=>{
      const selected=select.value;
      if(selected==='')return;
      const index=Number(selected);
      const view=saved[index];
      if(!view)return;
      const box=document.getElementById('modalBox');
      box.className='modal';
      box.innerHTML='<style>.modal-overlay:has(#savedViewDeleteConfirm){align-items:center}</style><div class="modal-head"><h3>Delete saved view?</h3><button type="button" class="modal-close" id="savedViewDeleteClose" aria-label="Close">×</button></div><div class="modal-body"><p id="savedViewDeleteMessage"></p><p>This removes only the saved filter preset. No agency records will be deleted.</p></div><div class="modal-foot"><button type="button" class="btn btn-outline" id="savedViewDeleteCancel">Cancel</button><button type="button" class="btn btn-danger" id="savedViewDeleteConfirm">Delete view</button></div>';
      document.getElementById('savedViewDeleteMessage').textContent='Delete "'+view.name+'"?';
      SuiteUX.openModal();
      const dismiss=()=>{SuiteUX.clearDirty();closeModal();};
      document.getElementById('savedViewDeleteClose').onclick=dismiss;
      document.getElementById('savedViewDeleteCancel').onclick=dismiss;
      document.getElementById('savedViewDeleteConfirm').onclick=()=>{
        SuiteUX.preferences.set(key,saved.filter((_,i)=>i!==index));
        selectedViews.delete(active.id);
        dismiss();
        bar.remove();
        SuiteUX.enhance();
        toast('Saved filter view deleted. No records were changed.');
      };
    };
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn btn-outline btn-sm';
    btn.textContent='Save current filters';
    btn.onclick=()=>{
      const values=Object.fromEntries(filters.map(field=>[field.id,field.value]));
      const box=document.getElementById('modalBox');
      box.className='modal';
      box.innerHTML='<div class="modal-head"><h3>Save filter view</h3><button class="modal-close" id="savedViewClose">×</button></div><div class="modal-body"><div class="form-row"><label for="savedViewName">View name</label><input id="savedViewName" type="text" maxlength="60" placeholder="e.g. Patrol equipment overdue"></div></div><div class="modal-foot"><button class="btn btn-primary" id="savedViewSave">Save view</button></div>';
      SuiteUX.openModal();
      document.getElementById('savedViewClose').onclick=closeModal;
      document.getElementById('savedViewSave').onclick=()=>{
        const name=document.getElementById('savedViewName').value.trim();
        if(!name){document.getElementById('savedViewName').focus();return;}
        SuiteUX.preferences.set(key,[{name,values},...saved.filter(view=>view.name!==name)].slice(0,12));
        selectedViews.delete(active.id);
        SuiteUX.clearDirty();closeModal();bar.remove();SuiteUX.enhance();
        toast('Filter view saved on this device.');
      };
    };
    bar.append(btn);
    active.prepend(bar);
  }
  placeViewToolbar(active);
  active.querySelectorAll('table').forEach(table=>{if(table.dataset.paged)return;table.dataset.paged='1';const rows=[...table.querySelectorAll('tbody>tr')];if(rows.length<=50)return;let page=0,size=50;const bar=document.createElement('div');bar.className='table-pagination';bar.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:12px;padding:12px;font-size:12px';const prev=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');prev.className=next.className='btn btn-outline btn-sm';prev.textContent='Previous';next.textContent='Next';const show=()=>{rows.forEach((r,i)=>r.hidden=i<page*size||i>=(page+1)*size);label.textContent=`${page*size+1}–${Math.min((page+1)*size,rows.length)} of ${rows.length}`;prev.disabled=page===0;next.disabled=(page+1)*size>=rows.length;};prev.onclick=()=>{page--;show();};next.onclick=()=>{page++;show();};bar.append(prev,label,next);table.after(bar);show();});
 };
})();


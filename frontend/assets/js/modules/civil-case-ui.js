/* Shared, state-neutral Civil case presentation. No workflow mutation. */
window.SonoMarziCivilCaseUI = (() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const header=({caseNumber,paperType,court,stage,priority=false,safety=false})=>
    '<header class="civil-shared-case-head"><div><div class="civil-shared-case-kicker">Civil Process · Record workspace</div>'+
    '<h2>'+esc(caseNumber)+(priority?'<span class="civil-shared-priority">PRIORITY</span>':'')+
    (safety?'<span class="civil-shared-safety">⚠ SAFETY FLAG</span>':'')+'</h2>'+
    '<p>'+esc(paperType)+' · '+esc(court)+'</p></div><span class="civil-shared-stage">'+esc(stage||'Open')+'</span></header>';
  const facts=items=>'<div class="civil-shared-case-facts">'+items.filter(item=>item&&item.label).map(item=>
    '<div class="civil-shared-case-fact"><small>'+esc(item.label)+'</small><strong>'+esc(item.value??'Not recorded')+'</strong></div>').join('')+'</div>';
  const style='<style id="civil-shared-case-style">'+
    '.civil-shared-case-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:19px 22px;background:linear-gradient(115deg,rgba(48,116,210,.16),rgba(21,165,147,.08));border:1px solid var(--border);border-radius:13px;margin-bottom:12px}'+
    '.civil-shared-case-kicker{font-size:11px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--blue)}'+
    '.civil-shared-case-head h2{font-size:23px;margin:7px 0 4px;overflow-wrap:anywhere}'+
    '.civil-shared-case-head p{color:var(--text-dim);font-size:13px;margin:0}'+
    '.civil-shared-stage{border:1px solid var(--border);border-radius:99px;padding:6px 12px;color:var(--blue);background:rgba(55,130,224,.08);font-size:12px;font-weight:700;white-space:nowrap}'+
    '.civil-shared-priority,.civil-shared-safety{display:inline-flex;font-size:11px;border-radius:20px;padding:4px 9px;margin-left:9px;vertical-align:middle;background:rgba(228,82,91,.15);color:var(--red,#ef7474);font-weight:800}'+
    '.civil-shared-case-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}'+
    '.civil-shared-case-fact{background:var(--surface,#152235);border:1px solid var(--border);border-radius:12px;padding:14px 16px;min-width:0}'+
    '.civil-shared-case-fact small{display:block;color:var(--text-dim);font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:750;margin-bottom:8px}'+
    '.civil-shared-case-fact strong{display:block;font-size:14px;overflow-wrap:anywhere}'+
    '@media(max-width:760px){.civil-shared-case-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.civil-shared-case-head{padding:16px}}'+
    '@media(max-width:410px){.civil-shared-case-facts{grid-template-columns:1fr}}'+
    '</style>';
  return Object.freeze({esc,header,facts,style});
})();

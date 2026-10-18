/* Shared jurisdiction-neutral Civil case presentation.
   Legal transitions, audit, money and permissions stay in each jurisdiction adapter. */
window.SonoMarziCivilRecordUI = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mapUrl = address => 'https://www.google.com/maps?q='+encodeURIComponent(String(address||''))+'&output=embed';
  const facts = items => '<div class="detail-grid civil-record-facts">'+items
    .filter(item=>item && item.value!==undefined && item.value!==null)
    .map(item=>'<div><div class="k">'+esc(item.label)+'</div><div class="v">'+esc(item.value===''?'Not recorded':item.value)+'</div></div>').join('')+'</div>';
  function addresses(records=[],opts={}){
    const idPrefix=opts.idPrefix==='ca'?'ca':'paper';
    const selected=Number.isSafeInteger(opts.selected)&&opts.selected>=0&&opts.selected<records.length?opts.selected:0;
    const buttonKey=idPrefix==='ca'?'data-ca-address-idx':'data-address-idx';
    const iframeId=idPrefix==='ca'?'caServiceAddressMap':'paperAddressMap';
    const address=records[selected]?.address||'';
    const buttons=records.map((a,index)=>'<button type="button" class="civil-address-chip '+(index===selected?'active':'')+'" '+buttonKey+'="'+index+'" aria-pressed="'+(index===selected)+'"><span aria-hidden="true">⌖</span> <span>'+esc(a.address)+'</span>'+(a.isPrimary?'<span class="badge badge-role" style="margin-left:auto">Primary</span>':'')+'</button>').join('');
    return '<section class="panel civil-shared-address-panel" style="box-shadow:none"><div class="panel-head"><h2>Service Address(es)</h2>'+(opts.addButtonHTML||'')+'</div>'+
      '<div class="panel-body"><div class="civil-shared-address-grid"><div class="civil-shared-address-list">'+(buttons||'<div style="font-size:12px;color:var(--text-dim)">No service address recorded.</div>')+'</div>'+
      '<div class="civil-shared-address-map">'+(address?'<a data-civil-map-link href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)+'" target="_blank" rel="noopener noreferrer" class="civil-map-open-link">Open in Maps ↗</a><iframe title="Service address map" id="'+iframeId+'" src="'+mapUrl(address)+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>':'')+'</div></div>'+
      (address?'<p class="civil-map-warning">Map pins may be approximate. Verify the address before serving.</p>':'')+'</div></section>';
  }
  const styles='<style id="civil-record-shared-style">.civil-shared-address-panel{margin:16px 0}.civil-shared-address-grid{display:grid;grid-template-columns:minmax(200px,1fr) minmax(280px,2fr);gap:16px}.civil-shared-address-list{display:flex;flex-direction:column;gap:6px;min-width:0}.civil-shared-address-map{min-width:0}.civil-shared-address-map iframe{width:100%;height:260px;border:0;border-radius:8px;display:block}.civil-map-open-link{display:inline-block;font-size:12px;color:var(--blue);font-weight:700;margin-bottom:8px}.civil-map-warning{font-size:11px;color:var(--text-dim);margin:10px 0 0}.civil-record-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0 20px}.civil-record-facts>div{min-width:0;background:var(--surface,var(--panel-bg,#152235));border:1px solid var(--border);padding:15px;border-radius:12px}.civil-record-facts .k{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--text-dim);font-weight:700;margin-bottom:8px}.civil-record-facts .v{font-size:14px;font-weight:650;overflow-wrap:anywhere}@media(max-width:850px){.civil-record-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.civil-shared-address-grid{grid-template-columns:minmax(0,1fr)}.civil-record-facts{grid-template-columns:minmax(0,1fr)}}</style>';
  return Object.freeze({esc,facts,addresses,mapUrl,styles});
})();

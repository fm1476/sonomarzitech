import {useEffect,useState} from 'react';

export interface NavigationLink {
 id:string; label:string; icon:string; active?:boolean; onClick():void; onPin?():void; pinned?:boolean;
}
export interface NavigationGroup {
 id:string; label:string; icon:string; open:boolean; items:NavigationLink[]; onToggle(open:boolean):void;
}
export interface NavigationModel {
 top:NavigationLink[]; pinned:NavigationLink[]; groups:NavigationGroup[]; bottom:NavigationLink[];
 searchIcon:string; collapsed:boolean; onCollapse():void; onCollapseAll():void;
}

function Icon({markup}:{markup:string}) {return <span aria-hidden="true" dangerouslySetInnerHTML={{__html:markup}}/>;}

function Link({item,noticeCount}:{item:NavigationLink;noticeCount:number}) {
 const notice=item.id==='notices';
 const count=notice?noticeCount:0;
 return <div className="navline" style={{display:'flex'}} data-search-text={item.label.toLowerCase()}>
  <button id={notice?'staffNoticesNav':undefined} type="button" className={`navitem${item.active?' active':''}${notice?' staff-notices-nav':''}${count?' has-unread':''}`} aria-label={notice&&count?`Staff Notices, ${count} unread`:item.label} title={notice&&count?`${count} unread staff notice${count===1?'':'s'}`:item.label} onClick={item.onClick}>
   <Icon markup={item.icon}/><span>{item.label}</span>{notice&&<strong id="staffNoticeCount" className="staff-notice-count" hidden={!count}>{count>99?'99+':count}</strong>}
  </button>
  {item.onPin&&<button type="button" className="nav-favorite" title={`${item.pinned?'Unpin':'Pin'} ${item.label}`} aria-label={`${item.pinned?'Unpin':'Pin'} ${item.label}`} onClick={item.onPin}>{item.pinned?'★':'☆'}</button>}
 </div>;
}

export function SuiteNavigation({model}:{model:NavigationModel}) {
 const [search,setSearch]=useState('');
 const [noticeCount,setNoticeCount]=useState(window.SonoMarziNoticeCount??0);
 useEffect(()=>{const receive=(event:Event)=>setNoticeCount((event as CustomEvent<number>).detail);window.addEventListener('sonomarzi:notice-count',receive);return()=>window.removeEventListener('sonomarzi:notice-count',receive);},[]);
 const query=search.trim().toLowerCase();
 const matches=(item:NavigationLink)=>!query||item.label.toLowerCase().includes(query);
 const filtered=(items:NavigationLink[])=>items.filter(matches);
 return <>
  <div style={{padding:'0 10px'}}>{filtered(model.top).map(item=><Link key={item.id} item={item} noticeCount={noticeCount}/>)}</div>
  <div className="nav-top-row">
   <div className="nav-search-wrap"><span className="nav-search-icon"><Icon markup={model.searchIcon}/></span><input type="search" placeholder="Jump to anything" className="nav-search" value={search} aria-label="Filter navigation" onChange={event=>setSearch(event.target.value)}/></div>
   <button type="button" className="nav-collapse-btn nav-collapse-all-btn" title="Collapse all module groups" aria-label="Collapse all module groups" onClick={model.onCollapseAll}>≡−</button>
   <button type="button" className="nav-collapse-btn" title={model.collapsed?'Expand sidebar':'Collapse sidebar'} aria-label={model.collapsed?'Expand sidebar':'Collapse sidebar'} onClick={model.onCollapse}>{model.collapsed?'»':'«'}</button>
  </div>
  <div style={{height:1,background:'#2B3B54',margin:'2px 14px 12px',flexShrink:0}}/>
  {!!filtered(model.pinned).length&&<div className="navgroup" data-label="__pins">{filtered(model.pinned).map(item=><Link key={item.id} item={item} noticeCount={noticeCount}/>)}</div>}
  {model.groups.map(group=>{
   const groupMatches=!!query&&group.label.toLowerCase().includes(query);
   const items=groupMatches?group.items:filtered(group.items);
   const visible=!query||items.length>0;
   return <details key={group.id} className="navgroup module-navgroup" data-label={`mod:${group.id}`} open={query?visible:group.open} style={{display:visible?'':'none'}} onToggle={event=>{if(!query)group.onToggle(event.currentTarget.open);}}>
    <summary><span className="nav-mod-icon"><Icon markup={group.icon}/></span><span>{group.label}</span></summary>
    {items.map(item=><Link key={item.id} item={item} noticeCount={noticeCount}/>)}
   </details>;
  })}
  <div style={{padding:'5px 10px'}}>{filtered(model.bottom).map(item=><Link key={item.id} item={item} noticeCount={noticeCount}/>)}</div>
 </>;
}

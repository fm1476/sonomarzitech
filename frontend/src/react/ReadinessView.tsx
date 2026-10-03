export interface ReadinessRow { title:string; detail:string; due?:string; urgent:boolean; open():void; }
export interface ReadinessGroup { name:string; rows:ReadinessRow[]; }
export interface ReadinessModel { date:string; groups:ReadinessGroup[]; }

export function ReadinessView({model}:{model:ReadinessModel}) {
 return <>
  <div className="work-hero"><div><div className="work-eyebrow">Agency operations</div><h2>Operational readiness</h2><p>Live exceptions from the records available to your role. Clear each item in its source workspace.</p></div><div className="work-date">{model.date}</div></div>
  <div className="work-metrics">{model.groups.map(group=><div key={group.name} className={`work-metric ${group.rows.some(row=>row.urgent)?'urgent':'good'}`}><span>{group.name}</span><strong>{group.rows.length}</strong><small>{group.rows.filter(row=>row.urgent).length} overdue</small></div>)}</div>
  <div className="work-layout"><div>{model.groups.map(group=><section className="panel" key={group.name}><div className="panel-head"><h2>{group.name}</h2><span className="hint">{group.rows.length} items</span></div><div className="readiness-items" data-readiness-group={group.name}>{group.rows.length?group.rows.slice(0,80).map((row,index)=><div className="work-item" key={`${row.title}-${index}`}><div className={`work-priority ${row.urgent?'urgent':''}`}/><div><h3>{row.title}</h3><p>{row.detail}{row.due&&` · ${row.due}`}</p></div><button type="button" className="btn btn-outline btn-sm" onClick={row.open}>Open</button></div>):<div className="panel-body">No visible exceptions.</div>}</div></section>)}</div>
  <aside className="work-aside"><section className="panel"><div className="panel-head"><h2>How this view works</h2></div><div className="panel-body"><p>Only records loaded for your role appear here. Expirations enter the list 60 days before their due date. Staffing gaps use the next seven days of shift minimums and actual coverage. Vehicle and equipment exceptions remain until their source status is cleared.</p><p>This view does not certify that every employee is deployable.</p></div></section></aside></div>
 </>;
}

import {useEffect,useRef} from 'react';

export interface WorkTask { title:string; owner:string; consequence:string; due?:string|null; urgent:boolean; action():void; }
export interface WorkMetric { id:string; label:string; count:number; hint:string; }
export interface QuickAction { id:string; label:string; icon:string; action():void; }
export interface RecentRecord { id:string; title:string; module:string; action():void; }
export interface WorkDashboardModel {
 greeting:string; firstName:string; date:string; unit:string; today:string;
 metrics:WorkMetric[]; tasks:WorkTask[]; totalTasks:number; activeTab:string;
 actions:QuickAction[]; recents:RecentRecord[]; visibleExceptions:number; overdueExceptions:number;
 workflowsAvailable:boolean; canMasterCalendar:boolean; calendar:'mine'|'master';
 selectTab(id:string):void; selectCalendar(id:'mine'|'master'):void;
 openReadiness():void; openWorkflows():void; renderCalendar(host:HTMLElement):void;
}

export function WorkDashboard({model}:{model:WorkDashboardModel}) {
 const calendar=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(calendar.current)model.renderCalendar(calendar.current);},[model]);
 const tabs:[string,string][]=[['mine','My Work'],['all','All Work'],['approvals','Approvals'],['attention','Attention'],['urgent','Overdue']];
 return <>
  <div className="work-hero"><div><div className="work-eyebrow">Your operational workspace</div><h2>{model.greeting}, {model.firstName}.</h2><p>One place to see what needs you and move work forward.</p></div><div className="work-date">{model.date}<br/>{model.unit}</div></div>
  <div className="work-metrics">{model.metrics.map(metric=><button key={metric.id} type="button" className={`work-metric ${metric.count===0?'good':'urgent'}`} onClick={()=>model.selectTab(metric.id)}><span>{metric.label}</span><strong>{metric.count}</strong><small>{metric.hint}</small></button>)}</div>
  <div className="work-layout"><div>
   <section className="panel"><div className="panel-head"><h2>Priority work</h2><span className="hint">{model.totalTasks} items</span></div><div className="work-tabs">{tabs.map(([id,label])=><button key={id} type="button" className={`work-tab ${model.activeTab===id?'active':''}`} aria-pressed={model.activeTab===id} onClick={()=>model.selectTab(id)}>{label}</button>)}</div>
    <div id="workQueue">{model.tasks.length?model.tasks.map((task,index)=><div className="work-item" key={`${task.title}-${index}`}><div className={`work-priority ${task.urgent?'urgent':''}`}/><div><h3>{task.title}</h3><p>{task.owner} · {task.consequence}</p>{task.due&&<div className={task.urgent?'due':''} style={{fontSize:12}}>{task.urgent?'Overdue · ':task.due===model.today?'Today · ':''}{task.due}</div>}</div><button type="button" className="btn btn-outline btn-sm" onClick={task.action}>Review</button></div>):<div className="empty-state"><div className="msg">Nothing in this queue</div><div className="sub">No matching items are visible to your current role.</div></div>}{model.totalTasks>100&&<p className="panel-body">Showing the first 100 priority items. Use the relevant workspace to review all records.</p>}</div>
   </section>
   <section className="panel"><div className="panel-head"><h2>Continue working</h2><span className="hint">Recent records on this device</span></div><div className="panel-body" id="recentRecords">{model.recents.length?model.recents.map(record=><button key={record.id} type="button" className="recent-item" onClick={record.action}>{record.title}<small>{record.module}</small></button>):<p style={{color:'var(--text-dim)',fontSize:13}}>Records you open will appear here.</p>}</div></section>
  </div><aside className="work-aside">
   <section className="panel"><div className="panel-head"><h2>Quick actions</h2></div><div className="panel-body quick-grid" id="quickActions">{model.actions.map(action=><button key={action.id} type="button" className="quick-action" onClick={action.action}><span aria-hidden="true" dangerouslySetInnerHTML={{__html:action.icon}}/><span>{action.label}</span></button>)}</div></section>
   <section className="panel"><div className="panel-head"><h2>Workspace readiness</h2></div><div className="panel-body" id="readiness"><div className="readiness-line"><span>Visible exceptions</span><strong>{model.visibleExceptions}</strong></div><div className="readiness-line"><span>Overdue</span><strong>{model.overdueExceptions}</strong></div><button type="button" className="btn btn-outline btn-sm" onClick={model.openReadiness}>Open readiness</button>{model.workflowsAvailable&&<button type="button" className="btn btn-outline btn-sm" style={{marginLeft:8}} onClick={model.openWorkflows}>Agency workflows</button>}</div></section>
  </aside></div>
  <section className="panel work-calendar-panel" aria-labelledby="workCalendarTitle"><div className="panel-head work-calendar-head"><div><h2 id="workCalendarTitle">{model.calendar==='master'?'Master Calendar':'My Calendar'}</h2><span className="hint">{model.calendar==='master'?'Department-wide training schedule':'Your training sessions and court dates'}</span></div>{model.canMasterCalendar&&<div className="work-tabs work-calendar-tabs" aria-label="Calendar view">{([['mine','My Calendar'],['master','Master Calendar']] as const).map(([id,label])=><button key={id} type="button" className={`work-tab ${model.calendar===id?'active':''}`} aria-pressed={model.calendar===id} onClick={()=>model.selectCalendar(id)}>{label}</button>)}</div>}</div><div className="panel-body" id="workCalendarBody" ref={calendar}/></section>
 </>;
}

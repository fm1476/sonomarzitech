/* Calendar export uses session metadata only, never attendee records. */
window.SuiteCalendarExports = {
  escape(value){return String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');},
  stamp(date){return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');},
  attach(s,course,instructor){
    const body=document.querySelector('#modalBox .modal-body');
    if(!body || s.status==='Cancelled') return;
    const zone=checkinSourceTimeZone();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||!/^\d{2}:\d{2}/.test(s.startTime)||!/^\d{2}:\d{2}/.test(s.endTime))return;
    const start=checkinZonedInstant(s.date,s.startTime,zone);
    let endDate=s.date;
    if(s.endTime<=s.startTime){const d=new Date(s.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);endDate=d.toISOString().slice(0,10);}
    const end=checkinZonedInstant(endDate,s.endTime,zone);
    const title=course?.name||'Training Session', place=[s.location,s.address].filter(Boolean).join(', ');
    const description=[instructor?.name?'Instructor: '+instructor.name:'',s.notes||'','Session time zone: '+zone,'Open SonoMarzi: '+location.origin+location.pathname,'Session reference: '+s.id].filter(Boolean).join('\n');
    const controls=document.createElement('details');controls.className='calendar-export';
    const summary=document.createElement('summary');summary.className='btn btn-outline';summary.textContent='Add to Calendar';controls.append(summary);
    const links=document.createElement('div');links.className='calendar-export-options';
    const google=new URL('https://calendar.google.com/calendar/render');google.search=new URLSearchParams({action:'TEMPLATE',text:title,dates:this.stamp(start)+'/'+this.stamp(end),details:description,location:place,ctz:zone});
    const outlook=new URL('https://outlook.office.com/calendar/deeplink/compose');outlook.search=new URLSearchParams({path:'/calendar/action/compose',rru:'addevent',subject:title,startdt:start.toISOString(),enddt:end.toISOString(),body:description,location:place});
    for(const [label,url] of [['Google Calendar',google],['Outlook',outlook]]){const a=document.createElement('a');a.textContent=label;a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.className='btn btn-outline';links.append(a);}
    const download=document.createElement('button');download.textContent='Apple / Other (.ics)';download.className='btn btn-outline';download.onclick=()=>{
      const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SonoMarzi//Training//EN','BEGIN:VEVENT','UID:'+encodeURIComponent(s.id)+'@'+location.hostname,'DTSTAMP:'+this.stamp(new Date()),'DTSTART:'+this.stamp(start),'DTEND:'+this.stamp(end),'SUMMARY:'+this.escape(title),'LOCATION:'+this.escape(place),'DESCRIPTION:'+this.escape(description),'END:VEVENT','END:VCALENDAR'];
      const folded=lines.map(line=>{let out='',bytes=0;for(const ch of line){const n=new TextEncoder().encode(ch).length;if(bytes+n>73){out+='\r\n ';bytes=1;}out+=ch;bytes+=n;}return out;}).join('\r\n')+'\r\n';
      const url=URL.createObjectURL(new Blob([folded],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='training-session.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    };links.append(download);controls.append(links);const hint=document.createElement('p');hint.className='hint';hint.textContent='Adds a copy to your calendar. Later session changes do not update that copy.';controls.append(hint);body.prepend(controls);
  }
};
/* Preserve existing calendar actions while exposing a compact mobile month. */
(function(){
  const media=matchMedia('(max-width:640px)');
  function enhance(){
    document.querySelectorAll('.cal-grid').forEach(grid=>{
      if(grid.dataset.mobileCalendar || !media.matches)return;
      grid.dataset.mobileCalendar='true';grid.classList.add('mobile-month');
      const toolbar=document.createElement('div');toolbar.className='mobile-calendar-controls';
      const details=document.createElement('section');details.className='mobile-day-details';details.setAttribute('aria-live','polite');
      function select(cell){
        if(!cell)return;
        grid.querySelectorAll('.mobile-selected').forEach(c=>c.classList.remove('mobile-selected'));cell.classList.add('mobile-selected');
        details.replaceChildren();const h=document.createElement('h3');h.textContent=(cell.querySelector('.cal-daynum')?.dataset.weekday||'')+' '+cell.querySelector('.cal-daynum')?.textContent;details.append(h);
        Array.from(cell.children).filter(c=>!c.matches('.cal-daynum,.mobile-day-indicators')).forEach(original=>{const copy=original.cloneNode(true);copy.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));copy.removeAttribute('id');const src=[original,...original.querySelectorAll('*')],dst=[copy,...copy.querySelectorAll('*')];dst.forEach((n,i)=>{if(src[i].matches('a,button,[data-cal-event],[data-work-cal]'))n.addEventListener('click',e=>{e.preventDefault();src[i].click();});});details.append(copy);});
        if(details.children.length===1){const p=document.createElement('p');p.textContent='Nothing scheduled.';details.append(p);}
      }
      for(const mode of ['Month','Agenda']){const b=document.createElement('button');b.className='btn btn-outline btn-sm';b.textContent=mode;b.setAttribute('aria-pressed',String(mode==='Month'));b.onclick=()=>{grid.classList.toggle('mobile-agenda',mode==='Agenda');details.hidden=mode==='Agenda';toolbar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};toolbar.append(b);}
      grid.before(toolbar);grid.after(details);
      grid.querySelectorAll('.cal-cell:not(.cal-cell-empty)').forEach(cell=>{
        const day=cell.querySelector('.cal-daynum');if(!day)return;
        day.setAttribute('role','button');day.tabIndex=0;day.setAttribute('aria-label','View '+(day.dataset.weekday||'')+' '+day.textContent);
        day.onclick=()=>select(cell);day.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(cell);}};
        const dots=document.createElement('div');dots.className='mobile-day-indicators';const events=cell.querySelectorAll('.cal-event');
        Array.from(events).slice(0,3).forEach(event=>{const dot=document.createElement('span');dot.style.background=event.style.color||'var(--blue)';dots.append(dot);});if(events.length>3){const count=document.createElement('small');count.textContent='+'+(events.length-3);dots.append(count);}cell.append(dots);
      });
      select(grid.querySelector('.cal-cell-today')||grid.querySelector('.cal-cell:not(.cal-cell-empty)'));
    });
  }
  let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}).observe(document.body,{childList:true,subtree:true});media.addEventListener('change',enhance);enhance();
})();

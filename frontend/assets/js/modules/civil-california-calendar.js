window.CaliforniaCivilCalendar = (() => {
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  async function mount(root, request, openCase, onError) {
    const todayParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type) => todayParts.find((p) => p.type === type).value;
    let month = part("year") + "-" + part("month"),
      epoch = 0, view = 'calendar', events = [];
    root.innerHTML = `<style>
.ca-calendar-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:14px 0}
.ca-calendar-toolbar .ca-month-navigation{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.ca-calendar-toolbar input[type=month]{background:var(--ca-surface,#172335);color:var(--text,#e7edf7);border:1px solid var(--ca-border,#34435a);border-radius:10px;padding:9px;min-height:40px}
.ca-calendar-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-top:16px}
.ca-calendar-weekday{text-align:center;padding:8px;color:var(--text-dim);font-size:12px;font-weight:700}
.ca-calendar-day{min-height:112px;border:1px solid var(--ca-border,#34435a);border-radius:10px;padding:8px;min-width:0;background:var(--ca-surface,#172335);color:var(--text,#e7edf7);display:flex;flex-direction:column;align-items:stretch;gap:6px;text-align:left;cursor:pointer}
.ca-calendar-day:hover,.ca-calendar-day:focus-visible{border-color:var(--ca-accent,#3478db);outline:1px solid var(--ca-accent,#3478db)}
.ca-calendar-day[data-selected=true]{border-color:var(--ca-accent,#3478db);box-shadow:inset 0 0 0 1px var(--ca-accent,#3478db)}
.ca-calendar-day[data-today=true] .ca-day-num{background:#3079d8;color:#fff;border-radius:99px;padding:2px 7px}
.ca-calendar-day.is-outside{opacity:.25;cursor:default}
.ca-calendar-day .ca-day-num{align-self:flex-start;font-weight:700}
.ca-calendar-day .ca-day-item{display:block;background:rgba(43,137,218,.17);border-left:3px solid #368cda;border-radius:5px;padding:4px 5px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ca-calendar-day .ca-day-count{color:var(--text-dim);font-size:11px}
.ca-calendar-agenda{margin-top:16px;border:1px solid var(--ca-border,#34435a);padding:15px;border-radius:12px;background:var(--ca-surface,#172335)}
.ca-calendar-agenda h4{margin:0 0 12px}
.ca-calendar-agenda-item{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--ca-border,#34435a)}
.ca-calendar-agenda-item:first-of-type{border-top:0}
.ca-calendar-agenda-item .ca-agenda-meta{color:var(--text-dim);font-size:12px}
@media(max-width:740px){.ca-calendar-month{gap:2px}.ca-calendar-day{min-height:75px;padding:4px;border-radius:6px}.ca-calendar-weekday{font-size:10px;padding:4px}.ca-calendar-day .ca-day-item{font-size:10px;padding:2px}.ca-calendar-day .ca-day-count{font-size:10px}}
</style>` +
      '<h3>Court deadlines</h3><p>Court returns and open tracked deadlines across every case available to your role.</p><div class="ca-calendar-toolbar"><div class="ca-month-navigation"><button type="button" class="btn btn-outline" data-month="previous" aria-label="Previous month">‹ Previous</button><input type="month" aria-label="Calendar month"><button type="button" class="btn btn-outline" data-month="next" aria-label="Next month">Next ›</button></div></div><div class="form-2col"><label class="form-row">From date<input type="date" name="calendarFrom"></label><label class="form-row">Through date<input type="date" name="calendarTo"></label></div><button type="button" class="btn btn-outline" data-calendar-update>Update calendar</button><p role="status"></p><div data-calendar-events></div>';
    const from = root.querySelector("[name=calendarFrom]"),
      to = root.querySelector("[name=calendarTo]"),
      monthInput = root.querySelector("[type=month]"),
      results = root.querySelector("[data-calendar-events]"),
      status = root.querySelector("[role=status]");
    const range = () => {
      const [year, m] = month.split("-").map(Number);
      from.value = month + "-01";
      to.value =
        month +
        "-" +
        String(new Date(Date.UTC(year, m, 0)).getUTCDate()).padStart(2, "0");
      monthInput.value = month;
    };
    let selectedDay = null;
    const draw = () => {
      if(view === 'table'){
        results.innerHTML = events.length
          ? '<div class="ca-table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Case</th><th>Deadline</th><th>Type</th><th>Case status</th><th>Authority</th></tr></thead><tbody>' +
            events.map(e=>'<tr><td>'+esc(e.date)+'</td><td><button type="button" class="btn btn-outline" data-calendar-case="'+esc(e.caseId)+'">'+esc(e.caseNumber)+'</button></td><td>'+esc(e.title)+'</td><td>'+esc(e.kind)+'</td><td>'+esc(e.stage)+'</td><td>'+esc(e.reference)+'</td></tr>').join('')+
            '</tbody></table></div>'
          : '<p>No open court returns or tracked deadlines in this range.</p>';
      } else {
        const [year,m] = month.split('-').map(Number);
        const days = new Date(Date.UTC(year,m,0)).getUTCDate();
        const offset = new Date(Date.UTC(year,m-1,1)).getUTCDay();
        const byDate = new Map();
        for(const event of events){const list=byDate.get(event.date)||[];list.push(event);byDate.set(event.date,list);}
        const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const validSelection = selectedDay && selectedDay.startsWith(month) && Number(selectedDay.slice(-2))<=days;
        if(!validSelection)selectedDay=null;
        const week=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<div class="ca-calendar-weekday">'+d+'</div>').join('');
        const cells=Array.from({length:Math.ceil((offset+days)/7)*7},(_,i)=>{
          const n=i-offset+1;
          if(n<1||n>days)return '<div class="ca-calendar-day is-outside" aria-hidden="true"></div>';
          const day=month+'-'+String(n).padStart(2,'0');
          const items=byDate.get(day)||[];
          return '<button type="button" class="ca-calendar-day" data-calendar-day="'+day+'" data-selected="'+(selectedDay===day)+'" data-today="'+(day===today)+'" aria-label="'+esc(day)+', '+items.length+' deadlines"><span class="ca-day-num">'+n+'</span>'+items.slice(0,2).map(e=>'<span class="ca-day-item">'+esc(e.caseNumber)+': '+esc(e.title)+'</span>').join('')+(items.length>2?'<span class="ca-day-count">+'+(items.length-2)+' more</span>':'')+'</button>';
        }).join('');
        const dayEvents=selectedDay?(byDate.get(selectedDay)||[]):[];
        const agenda=selectedDay?'<section class="ca-calendar-agenda"><h4>'+esc(selectedDay)+' · '+dayEvents.length+' items</h4>'+(dayEvents.length?dayEvents.map(e=>'<div class="ca-calendar-agenda-item"><div><strong>'+esc(e.title)+'</strong><div class="ca-agenda-meta">'+esc(e.caseNumber)+' · '+esc(e.kind)+' · '+esc(e.stage)+'</div></div><button type="button" class="btn btn-outline" data-calendar-case="'+esc(e.caseId)+'">Open case</button></div>').join(''):'<p>No deadlines scheduled for this date.</p>')+'</section>':'<p class="ca-list-footer">Select a day to review its deadlines and open associated cases.</p>';
        results.innerHTML='<div class="ca-calendar-month" role="group" aria-label="'+esc(month)+' calendar">'+week+cells+'</div>'+agenda;
        results.querySelectorAll('[data-calendar-day]').forEach(b=>b.onclick=()=>{selectedDay=b.dataset.calendarDay;draw();});
      }
      results.querySelectorAll('[data-calendar-case]').forEach(b=>b.onclick=()=>Promise.resolve(openCase(b.dataset.calendarCase)).catch(onError));
    };
    const load = async () => {
      const current = ++epoch;
      status.textContent = "Loading deadlines...";
      try {
        const data = await request({ fromDate: from.value, toDate: to.value });
        if (current !== epoch) return;
        status.textContent = data.events.length + " open calendar items";
        events = data.events;
        draw();
      } catch (error) {
        if (current === epoch) {
          status.textContent = error.message;
          results.innerHTML = "";
        }
      }
    };
    root.querySelectorAll("[data-month]").forEach(
      (button) =>
        (button.onclick = () => {
          const [y, m] = month.split("-").map(Number);
          const next = new Date(
            Date.UTC(y, m - 1 + (button.dataset.month === "next" ? 1 : -1), 1),
          );
          month = next.toISOString().slice(0, 7);
          selectedDay = null;
          range();
          load();
        }),
    );
    monthInput.onchange = () => {
      if (!monthInput.value) return;
      month = monthInput.value;
      selectedDay = null;
      range();
      load();
    };
    root.querySelector("[data-calendar-update]").onclick = load;
    range();
    await load();
    return { refresh: load, setView(next){ view = next === 'table' ? 'table' : 'calendar'; draw(); } };
  }
  return { mount };
})();

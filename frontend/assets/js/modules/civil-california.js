/* California staff workspace. The server owns authorization, stages and balances. */
window.CaliforniaCivil = (() => {
  const esc = (v) =>
    String(v ?? "").replace(
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
  let generation = 0;
  let preferredCaseView = "cards";
  const deadlineStatus = (due,stage) => {
    if (['Closed','Cancelled','Returned to Court'].includes(stage)) return 'clear';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due||''))) return 'unknown';
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=k=>parts.find(p=>p.type===k).value;
    const today=Date.UTC(Number(get('year')),Number(get('month'))-1,Number(get('day')));
    const [y,m,d]=due.split('-').map(Number);
    const value=Date.UTC(y,m-1,d);
    if(new Date(value).toISOString().slice(0,10)!==due)return 'unknown';
    const days=Math.round((value-today)/86400000);
    return days<0?'overdue':days<=7?'soon':'clear';
  };
  const deadlineLabel = status => ({overdue:'Overdue',soon:'Due within 7 days',clear:'On track',unknown:'Due date pending'})[status];

  const workspace = () => SuiteStore.remoteContext?.();
  async function api(operation, extra = {}, scope = workspace()) {
    if (!scope?.tenantId || !scope?.agencyId)
      throw Error("Select an agency first.");
    const before = workspace();
    if (
      before?.tenantId !== scope.tenantId ||
      before?.agencyId !== scope.agencyId
    )
      throw Error("Workspace changed. Reopen Civil Process.");
    const result = await SuiteStore.api("/tenant-admin", {
      method: "POST",
      body: JSON.stringify({
        action: "california_civil",
        tenantId: scope.tenantId,
        agencyId: scope.agencyId,
        operation,
        ...extra,
      }),
    });
    const now = workspace();
    if (now?.tenantId !== scope.tenantId || now?.agencyId !== scope.agencyId)
      throw Error("Workspace changed. Reopen Civil Process.");
    if (result.success === false)
      throw Error(result.error || "Civil request failed.");
    return result.data;
  }
  const fields = {
    intake_details: [
      "returnByDate:date",
      "instructionsReference",
      "deadlineAuthority",
      "formReviewReference",
      "reviewedForms",
      "issuedDate:date",
      "writExpirationDate:date",
      "employerName",
      "propertyDescription",
      "financialInstitution",
      "hearingDate:date",
      "hearingTime:time",
      "department",
    ],
    approve_intake: [],
    assign: ["personId"],
    attempt: ["date:date", "time:time", "result"],
    serve: [
      "date:date",
      "time:time",
      "recipient",
      "address",
      "method",
      "recipientRelationship",
      "diligenceReference",
      "mailingDate:date",
      "mailingAddress",
      "courtOrderReference",
      "methodDescription",
    ],
    unserved: [],
    generate_return_draft: [
      "serverName",
      "serverAddress",
      "serverPhone",
      "attorneyPartyInfo",
      "attorneyPhone",
      "attorneyEmail",
      "courtStreet",
      "courtCityZip",
      "courtBranch",
      "smallClaimsDocument",
    ],
    reopen_return: [],
    deadline: ["title", "kind", "dueDate:date", "authorityReference"],
    complete_deadline: ["deadlineId", "reference"],
    notice: [
      "title",
      "recipient",
      "method",
      "date:date",
      "authorityReference",
      "documentId",
    ],
    prepare_return: ["formName", "reference"],
    review_return: [],
    record_return: ["date:date", "reference"],
    hold: ["kind", "reference"],
    resolve_hold: ["holdId", "orderReference"],
    enforcement_event: [
      "kind",
      "date:date",
      "description",
      "authorityReference",
      "approvalReference",
    ],
    receipt: ["kind", "amountCents:money", "payer", "reference"],
    expense: ["amountCents:money", "authority", "reference"],
    request_disbursement: [
      "amountCents:money",
      "payee",
      "authority",
      "reference",
    ],
    approve_disbursement: ["disbursementId"],
    record_disbursement: ["disbursementId", "paymentReference"],
    reconcile: ["verifiedBalanceCents:money", "reference"],
    close: [],
    cancel: [],
  };
  const labels = {
    generate_return_draft: "Generate unsigned court form",
    reopen_return: "Reopen return for correction",
    deadline: "Track deadline",
    complete_deadline: "Complete or resolve deadline",
    notice: "Record notice delivery",
    intake_details: "Review intake details",
    approve_intake: "Approve intake",
    assign: "Assign server",
    attempt: "Log attempt",
    serve: "Record service",
    unserved: "Return unserved",
    prepare_return: "Prepare court return",
    review_return: "Review court return",
    record_return: "Record court delivery",
    hold: "Record claim or stay",
    resolve_hold: "Resolve claim or stay",
    enforcement_event: "Record enforcement action",
    receipt: "Record receipt",
    expense: "Record authorized expense",
    request_disbursement: "Request disbursement",
    approve_disbursement: "Approve disbursement",
    record_disbursement: "Record payment",
    reconcile: "Reconcile ledger",
    close: "Close case",
    cancel: "Cancel case",
  };
  const name = (s) =>
    s
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .replace("Cents", "($)");
  const options = {
    result: [
      "Not home",
      "No contact",
      "Refused",
      "Moved",
      "Bad address",
      "Business closed",
      "Evading",
      "Other",
    ],
    method: [
      "Personal service",
      "Substituted service",
      "Court-authorized alternative",
    ],
  };
  const money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n / 100);
  function cents(value) {
    if (!/^\d+(\.\d{1,2})?$/.test(value))
      throw Error(
        "Enter a nonnegative dollar amount with at most two decimal places.",
      );
    const [d, c = ""] = value.split(".");
    const n = Number(d) * 100 + Number(c.padEnd(2, "0"));
    if (!Number.isSafeInteger(n)) throw Error("Amount is too large.");
    return n;
  }
  function input(spec, value = "", choices) {
    const [key, type = "text"] = spec.split(":");
    const list = choices || options[key];
    return `<label class="form-row">${esc(name(key))}${
      list
        ? `<select name="${key}"><option value="">Select...</option>${list
            .map((o) => {
              const [v, l] = Array.isArray(o) ? o : [o, o];
              return `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(l)}</option>`;
            })
            .join("")}</select>`
        : `<input name="${key}" type="${type === "money" ? "text" : type}" ${type === "money" ? 'inputmode="decimal"' : ""} maxlength="3000" value="${esc(value)}">`
    }</label>`;
  }
  async function route(root, id, openCaseId) {
    if (
      !root ||
      id === "civil-admin" ||
      id === "civil-dashboard" ||
      SuiteStore.mode() !== "shared"
    )
      return false;
    const token = ++generation,
      scope = { ...workspace() };
    root.innerHTML =
      '<div class="panel"><div class="panel-body">Loading Civil workspace...</div></div>';
    try {
      const context = await api("context", {}, scope);
      context.people =
        typeof STATE !== "undefined" ? STATE.personnel || [] : [];
      if (token !== generation) return true;
      if (context.profile.profileId !== "US-CA") return false;
      const can = (a) => context.admin || context.abilities.includes(a);
      let selection = 0;
      let calendarController;
      const firstPage = await api(
        "list",
        { assignedOnly: id === "civil-mine" },
        scope,
      );
      let rows = firstPage.cases,
        nextCursor = firstPage.nextCursor;
      if (token !== generation) return true;
      if (id === "civil-mine")
        rows = rows.filter(
          (x) => x.record.assignedServerId === context.personId,
        );
      const report = id === "civil-reports";
      if (report && !can("civil_reports_view"))
        throw Error("Civil reporting permission is required.");
      root.innerHTML = `
<style id="ca-classic-theme">
.ca-classic{--ca-accent:var(--primary,#3478db);--ca-surface:var(--surface,var(--card-bg,var(--bg-card,#172335)));--ca-border:var(--border,rgba(110,146,182,.3));}
.ca-classic.panel{border:0;background:transparent;box-shadow:none}
.ca-classic>.panel-head{border:0;background:linear-gradient(110deg,rgba(38,109,215,.19),rgba(16,167,153,.10));padding:22px 24px;border-radius:16px 16px 0 0;border-bottom:1px solid var(--ca-border)}
.ca-classic>.panel-head h3{font-size:23px;letter-spacing:-.4px;margin:0;color:var(--heading,var(--text))}
.ca-classic>.panel-body{padding:22px 24px;border:1px solid var(--ca-border);border-top:0;border-radius:0 0 16px 16px}
.ca-classic .ca-subtitle{font-size:13px;color:var(--text-dim);margin:0 0 16px}
.ca-classic .toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:12px 0 18px}
.ca-classic .btn{border-radius:10px;min-height:37px;padding:8px 14px;font-weight:600;transition:filter .16s,transform .16s,background .16s;box-shadow:none}
.ca-classic .btn:hover:not(:disabled){filter:brightness(1.12);transform:translateY(-1px)}
.ca-classic .btn:focus-visible,.ca-classic input:focus-visible,.ca-classic select:focus-visible{outline:2px solid var(--ca-accent);outline-offset:2px}
.ca-classic .btn-primary{background:var(--ca-accent);color:white;border-color:transparent}
.ca-classic .btn-outline{border:1px solid var(--ca-border);background:var(--ca-surface);color:var(--text,var(--heading))}
.ca-classic #ca-search{width:100%;min-height:43px;border-radius:10px}
.ca-classic #ca-list{margin-top:17px}
.ca-classic .ca-view-controls{display:flex;justify-content:flex-end;align-items:center;gap:0;margin:12px 0 6px}
.ca-classic .ca-view-controls .btn{min-height:36px;border-radius:0}
.ca-classic .ca-view-controls .btn:first-child{border-radius:10px 0 0 10px}
.ca-classic .ca-view-controls .btn:last-child{border-radius:0 10px 10px 0}
.ca-classic .ca-view-controls [aria-pressed="true"]{background:rgba(48,125,222,.22);border-color:var(--ca-accent);color:var(--heading,var(--text))}
.ca-classic .ca-case-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,255px),1fr));gap:12px}
.ca-classic .ca-case-card{padding:13px;border:1px solid var(--ca-border);border-radius:15px;background:linear-gradient(145deg,rgba(55,121,212,.10),rgba(24,162,153,.035) 75%),var(--ca-surface);box-shadow:0 5px 15px rgba(0,0,0,.06);min-width:0}
.ca-classic .ca-case-card[data-deadline="overdue"]{border-left:5px solid #e45965}
.ca-classic .ca-case-card[data-deadline="soon"]{border-left:5px solid #e7b340}
.ca-classic .ca-case-card[data-deadline="clear"]{border-left:5px solid #21bd85}
.ca-classic .ca-deadline{display:inline-flex;font-weight:700;font-size:12px;border-radius:99px;padding:3px 9px;border:1px solid currentColor}
.ca-classic .ca-deadline[data-deadline="overdue"]{color:#f06b73;background:rgba(240,107,115,.10)}
.ca-classic .ca-deadline[data-deadline="soon"]{color:#f1c15b;background:rgba(241,193,91,.10)}
.ca-classic .ca-deadline[data-deadline="clear"]{color:#35ca9b;background:rgba(53,202,155,.10)}
.ca-classic .ca-deadline[data-deadline="unknown"]{color:var(--text-dim)}
.ca-classic .ca-case-card:hover{border-color:var(--ca-accent);box-shadow:0 7px 24px rgba(30,105,190,.15)}
.ca-classic .ca-case-header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ca-classic .ca-case-card h4{font-size:16px;line-height:1.35;overflow-wrap:anywhere;margin:0 0 8px;color:var(--heading,var(--text))}
.ca-classic .ca-case-type{margin:0 0 15px;color:var(--text-dim);font-size:13px}
.ca-classic .ca-card-details{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px 0;border-top:1px solid var(--ca-border);border-bottom:1px solid var(--ca-border)}
.ca-classic .ca-card-details dt{color:var(--text-dim);font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin:0 0 5px}
.ca-classic .ca-card-details dd{margin:0;font-size:13px;font-weight:600;overflow-wrap:anywhere}
.ca-classic .ca-case-card .ca-card-open{margin-top:14px;width:100%;justify-content:center}
.ca-classic .ca-table-wrap{overflow-x:auto}
.ca-classic .ca-list-footer{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:14px;color:var(--text-dim);font-size:13px}
.ca-classic .ca-empty-state{border:1px dashed var(--ca-border);border-radius:14px;padding:32px 18px;text-align:center;background:rgba(55,121,212,.035)}
.ca-classic .ca-empty-state strong{display:block;font-size:16px;margin-bottom:7px;color:var(--heading,var(--text))}
.ca-classic .ca-empty-state p{margin:0;color:var(--text-dim)}

.ca-classic .data-table{width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid var(--ca-border);border-radius:13px}
.ca-classic .data-table thead{background:rgba(54,122,215,.12)}
.ca-classic .data-table th{font-size:12px;letter-spacing:.03em;text-transform:uppercase;padding:13px 14px;color:var(--text-dim);text-align:left}
.ca-classic .data-table td{padding:12px 14px;vertical-align:middle;border-top:1px solid var(--ca-border)}
.ca-classic .data-table tbody tr:hover{background:rgba(65,139,223,.07)}
.ca-classic #ca-view-cards,.ca-classic #ca-view-table{font-size:13px}
.ca-classic .ca-calendar-toolbar .btn{min-width:95px}
.ca-classic .ca-calendar-toolbar .ca-month-navigation{justify-content:space-between;width:100%}
.ca-classic .ca-calendar-toolbar input[type=month]{flex:0 1 190px}
.ca-classic .ca-calendar-toolbar{margin:10px 0 18px}
.ca-classic .ca-status-pill{display:inline-flex;border-radius:99px;padding:5px 10px;font-weight:700;font-size:12px;border:1px solid currentColor;background:rgba(68,154,230,.10);color:#4a9af3;white-space:nowrap}
.ca-classic .ca-status-pill[data-stage="Closed"],.ca-classic .ca-status-pill[data-stage="Served"],.ca-classic .ca-status-pill[data-stage="Returned to Court"]{color:#22b991;background:rgba(34,185,145,.10)}
.ca-classic .ca-status-pill[data-stage="Unable to Serve"],.ca-classic .ca-status-pill[data-stage="Cancelled"]{color:#eb6672;background:rgba(235,102,114,.10)}
.ca-classic .ca-status-pill[data-stage="Attempting"],.ca-classic .ca-status-pill[data-stage="Return Prepared"]{color:#eca947;background:rgba(236,169,71,.10)}
.ca-classic.ca-workspace-open #ca-list,.ca-classic.ca-workspace-open .ca-view-controls,.ca-classic.ca-workspace-open #ca-search,.ca-classic.ca-workspace-open #ca-search-label,.ca-classic.ca-workspace-open .ca-list-toolbar{display:none!important}
.ca-classic.ca-workspace-open #ca-detail{display:block;margin-top:0}
.ca-classic .ca-workspace-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 0}
.ca-classic .ca-case-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:18px 0}
.ca-classic .ca-case-tabs button[aria-selected="true"]{background:rgba(45,120,215,.19);border-color:var(--ca-accent);color:var(--heading)}
.ca-classic .ca-case-tabs button:focus-visible{outline:2px solid var(--ca-accent);outline-offset:2px}
.ca-classic #ca-actions{max-width:100%;overflow:visible}
.ca-classic #ca-actions .ca-secondary-actions{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0}
.ca-classic #ca-detail .ca-case-content{display:block}
.ca-classic .ca-intake-checklist{margin:12px 0;padding-left:20px;display:grid;gap:5px;color:var(--text-dim);font-size:13px}
.ca-classic.ca-workspace-open .ca-next-step{max-width:100%;border-radius:14px}
.ca-classic.ca-workspace-open #ca-detail>.panel{padding:16px}
.ca-classic .ca-case-tabs{border-bottom:1px solid var(--ca-border);padding-bottom:12px}
.ca-classic #ca-detail{margin-top:20px}
.ca-classic #ca-detail>.panel,.ca-classic #ca-report,.ca-classic #ca-form form{border-radius:14px;border:1px solid var(--ca-border);padding:18px;margin:14px 0;background:var(--ca-surface)}
.ca-classic #ca-detail details{border:1px solid var(--ca-border);border-radius:11px;padding:10px 14px;margin:10px 0}
.ca-classic #ca-detail summary{font-weight:650;cursor:pointer;padding:4px 0;color:var(--heading,var(--text))}
.ca-classic #ca-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.ca-classic #ca-actions button{margin:0}
.ca-classic [role="alert"]:not(:empty){color:#eb6672}
.ca-classic [role="status"]:not(:empty){color:var(--ca-accent)}
@media(max-width:700px){.ca-classic>.panel-body{padding:14px}.ca-classic>.panel-head{padding:18px}.ca-classic .data-table{min-width:580px}.ca-classic .toolbar .btn{flex:1 1 auto}}
</style><div class="panel ca-classic"><div class="panel-head"><h3>Civil Process</h3></div><div class="panel-body"><p class="ca-subtitle">${esc(context.profile.county ? context.profile.county + " County, California" : "California")} ${context.profile.status === "test" ? " · Test environment" : ""}</p><p id="ca-status" role="status"></p><div class="toolbar ca-list-toolbar"><button class="btn btn-outline" id="ca-refresh">Refresh</button> ${can("civil_paper_intake") ? '<button class="btn btn-primary" id="ca-new">New case</button>' : ""} ${report && can("civil_reports_export") ? '<button class="btn btn-outline" id="ca-export">Export CSV</button>' : ""}</div><label class="form-row" id="ca-search-label">Search cases<input id="ca-search" placeholder="Case, party, address, stage or due date"></label>${report ? '<div id="ca-report"></div>' : ""}<div class="ca-view-controls" role="group" aria-label="Case display mode"><button type="button" class="btn btn-outline" id="ca-view-cards" aria-pressed="true">${id === "civil-calendar" ? "▦ Calendar" : "▦ Cards"}</button><button type="button" class="btn btn-outline" id="ca-view-table" aria-pressed="false">☷ Table</button></div><div id="ca-list"></div><div id="ca-detail"></div><div id="ca-form"></div></div></div>`;
      const status = (msg) => {
        root.querySelector("#ca-status").textContent = msg;
      };
      const draw = () => {
        const selected = [...rows];
        if (id === "civil-calendar")
          selected.sort((a, b) =>
            (a.record.returnByDate || "9999").localeCompare(
              b.record.returnByDate || "9999",
            ),
          );
        const cardHtml = selected.map(({record:r}) =>
          `<article class="ca-case-card" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}"><div class="ca-case-header"><h4>${esc(r.caseNumber)}</h4><span class="ca-status-pill" data-stage="${esc(r.stage)}">${esc(r.stage)}</span></div>
          <p class="ca-case-type">${esc(r.paperType)}</p><dl class="ca-card-details"><div><dt>Defendant</dt><dd>${esc(r.defendant || "Not provided")}</dd></div><div><dt>Return due</dt><dd>${esc(r.returnByDate || "Review pending")}</dd></div></dl><span class="ca-deadline" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}">${deadlineLabel(deadlineStatus(r.returnByDate,r.stage))}</span>
          <button type="button" class="btn btn-primary ca-card-open" data-case="${esc(r.id)}">Open case</button></article>`
        ).join("");
        const tableHtml = `<div class="ca-table-wrap"><table class="data-table"><thead><tr><th>Case</th><th>Type</th><th>Defendant</th><th>Status</th><th>Return due</th></tr></thead><tbody>${selected.map(({record:r}) => `<tr><td><button class="btn btn-outline" data-case="${esc(r.id)}">${esc(r.caseNumber)}</button></td><td>${esc(r.paperType)}</td><td>${esc(r.defendant)}</td><td><span class="ca-status-pill" data-stage="${esc(r.stage)}">${esc(r.stage)}</span></td><td>${esc(r.returnByDate || "Review pending")} <span class="ca-deadline" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}">${deadlineLabel(deadlineStatus(r.returnByDate,r.stage))}</span></td></tr>`).join("")}</tbody></table></div>`;
        root.querySelector("#ca-list").innerHTML =
          (selected.length ? preferredCaseView === "cards" ? `<div class="ca-case-grid">${cardHtml}</div>` : tableHtml : '<div class="ca-empty-state"><strong>No cases to display</strong><p>Create a new case or adjust your search to see results here.</p></div>') +
          `<div class="ca-list-footer"><span>${rows.length} accessible cases loaded.${nextCursor ? " More cases are available." : ""}</span>${nextCursor ? '<button class="btn btn-outline" id="ca-more">Load more cases</button>' : ""}</div>`;
        if(id !== "civil-calendar")root.querySelector("#ca-view-cards").setAttribute("aria-pressed", String(preferredCaseView === "cards"));
        if(id !== "civil-calendar")root.querySelector("#ca-view-table").setAttribute("aria-pressed", String(preferredCaseView === "table"));

        root.querySelector("#ca-more")?.addEventListener("click", async (e) => {
          e.target.disabled = true;
          try {
            const page = await api(
              "list",
              {
                afterKey: nextCursor,
                query: root.querySelector("#ca-search").value,
                assignedOnly: id === "civil-mine",
              },
              scope,
            );
            rows.push(...page.cases);
            nextCursor = page.nextCursor;
            draw();
          } catch (error) {
            status(error.message);
            e.target.disabled = false;
          }
        });
        root.querySelectorAll("[data-case]").forEach(
          (b) =>
            (b.onclick = () => {
              if (root.querySelector("#ca-form form")) {
                status(
                  "Save or cancel the open form before opening another case.",
                );
                return;
              }
              detail(b.dataset.case).catch((e) => status(e.message));
            }),
        );
      };
      const updateViewButtons = mode => {
        root.querySelector("#ca-view-cards").setAttribute("aria-pressed",String(mode === "cards"));
        root.querySelector("#ca-view-table").setAttribute("aria-pressed",String(mode === "table"));
      };
      root.querySelector("#ca-view-cards").onclick = () => { if(id === "civil-calendar"){ calendarController?.setView("calendar"); } else { preferredCaseView = "cards"; draw(); } updateViewButtons("cards"); };
      root.querySelector("#ca-view-table").onclick = () => { if(id === "civil-calendar"){ calendarController?.setView("table"); } else { preferredCaseView = "table"; draw(); } updateViewButtons("table"); };
      let searchTimer,
        searchEpoch = 0;
      root.querySelector("#ca-search").oninput = () => {
        clearTimeout(searchTimer);
        const epoch = ++searchEpoch;
        searchTimer = setTimeout(async () => {
          try {
            const page = await api(
              "list",
              {
                query: root.querySelector("#ca-search").value,
                assignedOnly: id === "civil-mine",
              },
              scope,
            );
            if (token !== generation || epoch !== searchEpoch) return;
            rows = page.cases;
            nextCursor = page.nextCursor;
            draw();
          } catch (error) {
            status(error.message);
          }
        }, 200);
      };
      root.querySelector("#ca-refresh").onclick = () => {
        if (root.querySelector("#ca-form form")) {
          status("Save or cancel the open form before refreshing.");
          return;
        }
        route(root, id);
      };
      draw();
      function form(title, html, save) {
        const target = root.querySelector("#ca-form");
        if (target.querySelector("form")) {
          status(
            "Save or cancel the open form before starting another action.",
          );
          return;
        }
        target.innerHTML = `<form><h3>${esc(title)}</h3>${html}<p role="alert"></p><button class="btn btn-primary" type="submit">Save</button> <button class="btn btn-outline" type="button" id="ca-cancel-form">Cancel</button></form>`;
        window.CaliforniaCivilView.bindServiceFields(
          target.querySelector("form"),
        );
        target.querySelector("#ca-cancel-form").onclick = () => {
          target.innerHTML = "";
        };
        target.querySelector("form").onsubmit = async (e) => {
          e.preventDefault();
          const button = e.submitter;
          button.disabled = true;
          try {
            await save(new FormData(e.target));
            target.innerHTML = "";
          } catch (err) {
            const alert = target.querySelector("[role=alert]");
            if (alert) alert.textContent = err.message;
            else status(err.message);
          } finally {
            button.disabled = false;
          }
        };
        target.scrollIntoView({ block: "nearest" });
      }
      root.querySelector("#ca-new")?.addEventListener("click", () =>
        form(
          "New California case",
          input(
            "workflowId",
            "",
            Object.entries(context.workflows).map(([v, w]) => [v, w.label]),
          ) +
            [
              "caseNumber",
              "courtOfOrigin",
              "plaintiff",
              "defendant",
              "receivedDate:date",
              "address",
            ]
              .map((s) => s === "courtOfOrigin"
                ? '<label class="form-row">Court of Origin <input name="courtOfOrigin" list="ca-courts-origin" placeholder="Start typing a California county or enter another court" autocomplete="off"><datalist id="ca-courts-origin">' + ["Alameda","Alpine","Amador","Butte","Calaveras","Colusa","Contra Costa","Del Norte","El Dorado","Fresno","Glenn","Humboldt","Imperial","Inyo","Kern","Kings","Lake","Lassen","Los Angeles","Madera","Marin","Mariposa","Mendocino","Merced","Modoc","Mono","Monterey","Napa","Nevada","Orange","Placer","Plumas","Riverside","Sacramento","San Benito","San Bernardino","San Diego","San Francisco","San Joaquin","San Luis Obispo","San Mateo","Santa Barbara","Santa Clara","Santa Cruz","Shasta","Sierra","Siskiyou","Solano","Sonoma","Stanislaus","Sutter","Tehama","Trinity","Tulare","Tuolumne","Ventura","Yolo","Yuba"].map(c=>'<option value="'+esc(c)+' County Superior Court"></option>').join('') + '</datalist><small style="color:var(--text-dim)">California courts are suggested. Courts from other jurisdictions may be entered manually.</small></label>'
                : input(s))
              .join(""),
          async (data) => {
            const record = Object.fromEntries(data);
            record.serviceAddresses = [{ address: record.address }];
            delete record.address;
            const created = await api("create", { record }, scope);
            rows.unshift(created);
            draw();
            await detail(created.record.id);
          },
        ),
      );
      const dateRange = () => ({
        fromDate: root.querySelector("#ca-from")?.value || "",
        toDate: root.querySelector("#ca-to")?.value || "",
      });
      function downloadCsv(lines, filename) {
        const csv = (values) =>
          values
            .map(
              (v) =>
                '"' +
                String(v ?? "")
                  .replace(/^[=+@\-\t\r]/, "'" + "$&")
                  .replace(/"/g, '""') +
                '"',
            )
            .join(",");
        const url = URL.createObjectURL(
          new Blob(["\uFEFF" + lines.map(csv).join("\r\n")], {
            type: "text/csv;charset=utf-8",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (report) {
        root.querySelector("#ca-report").innerHTML =
          '<h3>Case accounting</h3><p>Totals cover every accessible case, including cases not loaded in the list.</p><div class="form-2col">' +
          input("fromDate:date") +
          input("toDate:date") +
          '</div><button class="btn btn-outline" id="ca-run-report">Update report</button><label class="form-row">Export<select id="ca-export-kind"><option value="summary">Accounting summary</option><option value="cases">All accessible cases</option><option value="ledger">Ledger entries in date range</option></select></label><div id="ca-totals"></div>';
        root.querySelector("[name=fromDate]").id = "ca-from";
        root.querySelector("[name=toDate]").id = "ca-to";
        const showReport = async () => {
          const result = await api("report", dateRange(), scope);
          const s = result.summary;
          root.querySelector("#ca-totals").innerHTML =
            '<table class="data-table"><tbody>' +
            Object.entries({
              Cases: s.caseCount,
              "Opening balance": money(s.openingBalanceCents),
              Receipts: money(s.receiptsCents),
              Expenses: money(s.expensesCents),
              Disbursements: money(s.disbursementsCents),
              "Closing balance": money(s.closingBalanceCents),
              "Cases with unresolved holds": s.openHoldCases,
              "Cases needing reconciliation": s.unreconciledCases,
              "Pending/approved disbursements (current)": money(
                s.pendingDisbursementsCents,
              ),
            })
              .map(
                ([k, v]) =>
                  "<tr><th>" + esc(k) + "</th><td>" + esc(v) + "</td></tr>",
              )
              .join("") +
            "</tbody></table><p>" +
            esc(result.basis) +
            "</p>";
          return result;
        };
        root.querySelector("#ca-run-report").onclick = () =>
          showReport().catch((e) => status(e.message));
        await showReport();
      }
      root
        .querySelector("#ca-export")
        ?.addEventListener("click", async (event) => {
          const button = event.target;
          button.disabled = true;
          try {
            const range = dateRange(),
              before = await api("report", { ...range, export: true }, scope),
              kind = root.querySelector("#ca-export-kind").value;
            let lines;
            if (kind === "summary")
              lines = [
                ["Measure", "Value"],
                ...Object.entries(before.summary).filter(
                  ([k]) => k !== "stages",
                ),
                ["From date", range.fromDate],
                ["To date", range.toDate],
                ["Basis", before.basis],
                ["Generated", before.generatedAt],
              ];
            else {
              const records = [];
              let cursor = null;
              do {
                const page = await api(
                  "list",
                  { afterKey: cursor, export: true },
                  scope,
                );
                records.push(...page.cases.map((x) => x.record));
                cursor = page.nextCursor;
              } while (cursor);
              if (kind === "cases")
                lines = [
                  [
                    "Case ID",
                    "Case",
                    "Type",
                    "Plaintiff",
                    "Defendant",
                    "Status",
                    "Return due",
                    "Current balance cents",
                  ],
                  ...records.map((r) => [
                    r.id,
                    r.caseNumber,
                    r.paperType,
                    r.plaintiff,
                    r.defendant,
                    r.stage,
                    r.returnByDate,
                    balance(r),
                  ]),
                ];
              else
                lines = [
                  [
                    "Case ID",
                    "Case",
                    "Entry ID",
                    "Accounting date",
                    "Direction",
                    "Kind",
                    "Amount cents",
                    "Party",
                    "Reference",
                    "Available on",
                    "Actor",
                  ],
                  ...records.flatMap((r) =>
                    r.california.ledger
                      .filter((e) => {
                        const date = e.accountingDate || e.at.slice(0, 10);
                        return (
                          (!range.fromDate || date >= range.fromDate) &&
                          (!range.toDate || date <= range.toDate)
                        );
                      })
                      .map((e) => [
                        r.id,
                        r.caseNumber,
                        e.id,
                        e.accountingDate || e.at.slice(0, 10),
                        e.direction,
                        e.kind,
                        e.amountCents,
                        e.party || "",
                        e.reference,
                        e.availableOn || "",
                        e.by,
                      ]),
                  ),
                ];
            }
            const after = await api(
              "report",
              { ...range, export: true },
              scope,
            );
            if (before.revision !== after.revision)
              throw Error(
                "Case records changed during export. Run it again to obtain a consistent report.",
              );
            downloadCsv(lines, "california-civil-" + kind + ".csv");
            status("Complete export generated for all accessible cases.");
          } catch (error) {
            status(error.message);
          } finally {
            button.disabled = false;
          }
        });
      const balance = (r) =>
        r.california.ledger.reduce(
          (n, e) => n + (e.direction === "in" ? e.amountCents : -e.amountCents),
          0,
        );
      async function detail(caseId) {
        const selected = ++selection;
        const current = await api("get", { id: caseId }, scope);
        if (token !== generation || selected !== selection) return;
        root.querySelector("#ca-form").innerHTML = "";
        const r = current.record,
          c = r.california;
        const panel = root.querySelector("#ca-detail");
        panel.innerHTML = window.CaliforniaCivilView.renderCase(
          r,
          context,
          current,
          labels,
        );
        const shell=root.querySelector(".ca-classic");
        shell?.classList.add("ca-workspace-open");
        const bar=document.createElement("div");
        bar.className="ca-workspace-bar";
        bar.innerHTML='<button type="button" class="btn btn-outline" data-back-cases>← Back to cases</button><span class="ca-status-pill" data-stage="'+esc(r.stage)+'">'+esc(r.stage)+'</span>';
        panel.prepend(bar);
        bar.querySelector("[data-back-cases]").onclick=()=>{
          if(root.querySelector("#ca-form form")){status("Save or cancel the current action before returning to cases.");return;}
          ++selection;
          shell?.classList.remove("ca-workspace-open");
          panel.innerHTML="";
        };
        const sections=[...panel.querySelectorAll("details")];
        if(sections.length){
          const tabs=document.createElement("div");
          tabs.className="ca-case-tabs";
          tabs.setAttribute("role","tablist");
          const names=["Overview","Service","Documents","Deadlines","Enforcement","Claims","Financials","Forms","History"];
          const activate=index=>{
            sections.forEach((section,i)=>{
              section.open=i===index;
              section.hidden=i!==index;
            });
            tabs.querySelectorAll("button").forEach((button,i)=>button.setAttribute("aria-selected",String(i===index)));
          };
          sections.forEach((section,i)=>{
            const button=document.createElement("button");
            button.type="button";button.className="btn btn-outline";
            button.setAttribute("role","tab");button.textContent=names[i]||section.querySelector("summary")?.textContent||"Details";
            button.onclick=()=>activate(i);tabs.append(button);
          });
          panel.querySelector("#ca-actions")?.after(tabs);
          activate(0);
        }
        const closed = ["Closed", "Cancelled"].includes(r.stage),
          actions = [];
        if (!closed) {
          if (can("civil_paper_intake"))
            actions.push(
              "deadline",
              ...((c.deadlines || []).some((d) => !d.completedAt)
                ? ["complete_deadline"]
                : []),
              ...(["Return Prepared", "Reviewed"].includes(r.stage)
                ? ["reopen_return"]
                : []),
              ...(["Intake", "Ready"].includes(r.stage)
                ? ["intake_details"]
                : []),
              ...(r.stage === "Intake" ? ["approve_intake"] : []),
              ...(["Ready", "Assigned", "Attempting"].includes(r.stage)
                ? ["assign"]
                : []),
              "hold",
              ...(c.holds.some((h) => !h.resolvedAt) ? ["resolve_hold"] : []),
              ...(context.workflows[c.workflowId].writ &&
              ["Ready", "Assigned", "Attempting", "Served"].includes(r.stage)
                ? ["enforcement_event"]
                : []),
              ...(r.stage === "Return Prepared" ? ["review_return"] : []),
              ...(r.stage === "Returned to Court" ? ["close"] : []),
              "cancel",
            );
          if (
            can("civil_paper_log_attempt") &&
            ["Assigned", "Attempting"].includes(r.stage) &&
            (context.admin ||
              can("civil_paper_intake") ||
              r.assignedServerId === context.personId)
          )
            actions.push("attempt", "serve", "unserved");
          if (can("civil_document_generate"))
            actions.push(
              "notice",
              ...(r.stage === "Served" &&
              ["summons", "small-claims"].includes(c.workflowId) &&
              c.service?.method === "Personal service"
                ? ["generate_return_draft"]
                : []),
              ...(["Served", "Unable to Serve"].includes(r.stage)
                ? ["prepare_return"]
                : []),
              ...(r.stage === "Reviewed" ? ["record_return"] : []),
            );
          if (can("civil_fee_manage"))
            actions.push(
              "receipt",
              "expense",
              "request_disbursement",
              ...(c.disbursements.some((d) => d.status === "pending")
                ? ["approve_disbursement"]
                : []),
              ...(c.disbursements.some((d) => d.status === "approved")
                ? ["record_disbursement"]
                : []),
              "reconcile",
            );
        }
        const intakeIssues = [];
        if(r.stage === "Intake"){
          const details=c.intakeDetails||{};
          const present=value=>typeof value==="string"&&value.trim().length>0;
          const kinds=new Set((c.documents||[]).map(d=>d.kind));
          const workflow=context.workflows[c.workflowId]||{};
          if(!r.returnByDate)intakeIssues.push("Set and review the court return deadline");
          if(!present(details.instructionsReference))intakeIssues.push("Enter the signed instructions reference");
          if(!present(details.deadlineAuthority))intakeIssues.push("Record the deadline authority");
          if(!present(details.formReviewReference))intakeIssues.push("Record the form review reference");
          if((workflow.forms||[]).some(form=>!(details.reviewedForms||[]).includes(form)))intakeIssues.push("Review required forms: "+(workflow.forms||[]).join(", "));
          if(!kinds.has("Court packet"))intakeIssues.push("Upload the court packet");
          if(!kinds.has("Signed instructions"))intakeIssues.push("Upload signed instructions");
          if(workflow.writ){
            if(!present(details.issuedDate)||!present(details.writExpirationDate))intakeIssues.push("Record writ issuance and expiration");
            if(!kinds.has("Writ"))intakeIssues.push("Upload the writ");
          }
          if(c.workflowId==="earnings-withholding"&&!present(details.employerName))intakeIssues.push("Record the employer");
          if(["possession","real-property-levy","sheriff-sale","personal-property-levy"].includes(c.workflowId)&&!present(details.propertyDescription))intakeIssues.push("Record the property description");
          if(c.workflowId==="bank-levy"&&!present(details.financialInstitution))intakeIssues.push("Record the financial institution");
        }
        const nextActions = {
          Intake: intakeIssues.length ? "intake_details" : "approve_intake", Ready: "assign", Assigned: "attempt",
          Attempting: "attempt", Served: "prepare_return",
          "Unable to Serve": "prepare_return", "Return Prepared": "review_return",
          Reviewed: "record_return", "Returned to Court": "reconcile"
        };
        const recommended=nextActions[r.stage];
        const nextPanel=panel.querySelector(".ca-next-step");
        if(nextPanel && r.stage === "Intake"){
          const summary=nextPanel.querySelector("p");
          if(summary)summary.textContent=intakeIssues.length
            ? "Intake saved. Complete the following requirements before approval:"
            : "Intake requirements appear complete. Review and approve intake to advance the case.";
          if(intakeIssues.length){
            const list=document.createElement("ul");
            list.className="ca-intake-checklist";
            intakeIssues.forEach(issue=>{const li=document.createElement("li");li.textContent=issue;list.append(li);});
            nextPanel.querySelector(".panel-body")?.append(list);
          }
        }
        if(nextPanel && recommended && actions.includes(recommended)){
          const launch=document.createElement("button");
          launch.type="button";
          launch.className="btn btn-primary";
          launch.textContent=r.stage==="Intake"&&intakeIssues.length&&intakeIssues.every(issue=>issue.startsWith("Upload")) ? "Next: Upload required documents" : intakeIssues.length&&r.stage==="Intake" ? "Continue intake review" : "Next: "+labels[recommended];
          launch.dataset.nextAction=recommended;
          nextPanel.append(launch);
          launch.onclick=()=>{
            const missingNonUpload=intakeIssues.filter(issue=>!issue.startsWith("Upload"));
            if(r.stage==="Intake"&&intakeIssues.length&&missingNonUpload.length===0){
              panel.querySelector("#ca-upload")?.click();
            }else{
              panel.querySelector('[data-action="'+recommended+'"]')?.click();
            }
          };
        }
        panel.querySelector("#ca-actions").innerHTML = actions
          .map(
            (a) =>
              `<button class="btn btn-outline" data-action="${a}">${esc(labels[a])}</button>`,
          )
          .join(" ");
        async function command(action, payload) {
          try {
            const next = await api(
              "command",
              {
                id: caseId,
                expectedVersion: current.version,
                command: action,
                payload,
              },
              scope,
            );
            const index = rows.findIndex((x) => x.record.id === caseId);
            if (index >= 0) rows[index] = next;
            draw();
            await detail(caseId);
            await calendarController?.refresh();
            status("Saved.");
            return next;
          } catch (e) {
            status(e.message);
            throw e;
          }
        }
        panel.querySelectorAll("[data-action]").forEach(
          (button) =>
            (button.onclick = async () => {
              try {
                const action = button.dataset.action;
                let roster = [];
                if (action === "assign") {
                  const people = (await api("roster", {}, scope)).people;
                  context.people = [...context.people, ...people];
                  roster = people.map((p) => [p.person_id, p.name || p.email]);
                }
                const choice = (key) =>
                  key === "method" && action === "serve" && !["summons", "small-claims"].includes(c.workflowId)
                    ? options.method.filter(method => method !== 'Substituted service')
                    : key === "smallClaimsDocument"
                    ? ["SC-100", "SC-120"]
                    : key === "deadlineId"
                      ? (c.deadlines || [])
                          .filter((d) => !d.completedAt)
                          .map((d) => [d.id, d.title + " · " + d.dueDate])
                      : key === "documentId"
                        ? c.documents.map((d) => [
                            d.id,
                            d.kind + " · " + d.name,
                          ])
                        : key === "personId"
                          ? roster
                          : key === "holdId"
                            ? c.holds
                                .filter((h) => !h.resolvedAt)
                                .map((h) => [
                                  h.id,
                                  h.kind + " · " + h.reference,
                                ])
                            : key === "disbursementId"
                              ? c.disbursements
                                  .filter(
                                    (d) =>
                                      d.status ===
                                      (action === "approve_disbursement"
                                        ? "pending"
                                        : "approved"),
                                  )
                                  .map((d) => [
                                    d.id,
                                    d.payee + " · " + money(d.amountCents),
                                  ])
                              : key === "kind"
                                ? action === "deadline"
                                  ? [
                                      "Service",
                                      "Hearing",
                                      "Notice",
                                      "Exemption/claim",
                                      "Employer return",
                                      "Sale",
                                      "Possession",
                                      "Other",
                                    ]
                                  : action === "receipt"
                                    ? [
                                        "Service fee",
                                        "Creditor deposit",
                                        "Levy collection",
                                      ]
                                    : action === "hold"
                                      ? [
                                          "Exemption claim",
                                          "Third-party claim",
                                          "Bankruptcy",
                                          "Court stay",
                                          "Other",
                                        ]
                                      : [
                                          "Levy",
                                          "Notice",
                                          "Inventory",
                                          "Custody",
                                          "Release",
                                          "Sale",
                                          "Possession",
                                          "Employer response",
                                          "Remittance",
                                        ]
                                : undefined;
                const actionFields = window.CaliforniaCivilView.fieldsForAction(
                  action,
                  r,
                  fields,
                );
                form(
                  labels[action],
                  actionFields
                    .map((spec) => {
                      const key = spec.split(":")[0];
                      let value =
                        key === "returnByDate"
                          ? r.returnByDate
                          : c.intakeDetails[key] || "";
                      if (key === "reviewedForms")
                        value = (value || []).join(", ");
                      return input(
                        spec,
                        value,
                        action === "notice" && key === "method"
                          ? [
                              "Personal service",
                              "Mail",
                              "Posting",
                              "Electronic delivery",
                              "Other",
                            ]
                          : choice(key),
                      );
                    })
                    .join("") + input("note"),
                  async (data) => {
                    const payload = Object.fromEntries(data);
                    for (const spec of fields[action]) {
                      const [key, type] = spec.split(":");
                      if (type === "money") payload[key] = cents(payload[key]);
                    }
                    if (action === "intake_details")
                      payload.reviewedForms = payload.reviewedForms
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    const result = await command(action, payload);
                    if (result.draft) {
                      const bytes = Uint8Array.from(
                        atob(result.draft.base64),
                        (c) => c.charCodeAt(0),
                      );
                      const url = URL.createObjectURL(
                        new Blob([bytes], { type: result.draft.contentType }),
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = result.draft.filename;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      status(
                        "Unsigned draft downloaded. Complete remaining items, review, sign and upload the finished court form.",
                      );
                    }
                  },
                );
              } catch (e) {
                status(e.message);
              }
            }),
        );
        const documents = panel.querySelector("#ca-documents");
        documents.innerHTML =
          c.documents
            .map(
              (d) =>
                `<button class="btn btn-outline" data-doc="${esc(d.id)}">${esc(d.kind)}: ${esc(d.name)}</button>`,
            )
            .join(" ") +
          (!closed && !["Return Prepared", "Reviewed", "Returned to Court"].includes(r.stage) && can("civil_document_generate")
            ? '<button class="btn btn-primary" id="ca-upload">Upload document</button>'
            : "");
        documents.querySelectorAll("[data-doc]").forEach(
          (b) =>
            (b.onclick = () =>
              AWS_ATTACHMENTS.download({
                storageKey: c.documents.find((d) => d.id === b.dataset.doc).key,
              }).catch((e) => status(e.message))),
        );
        documents.querySelector("#ca-upload")?.addEventListener("click", () =>
          form(
            "Upload case document",
            input("kind", "", [
              "Court packet",
              "Signed instructions",
              "Writ",
              "Court order",
              "Proof of service",
              "Court return",
              "Fee authority",
              "Other",
            ]) +
              '<label class="form-row">Document<input name="file" type="file" required></label>' +
              input("note"),
            async (data) => {
              if (!data.get("kind") || !String(data.get("note") || "").trim())
                throw Error("Choose a document kind and enter an action note.");
              const file = data.get("file");
              if (!file?.size) throw Error("Choose a nonempty file.");
              const meta = await AWS_ATTACHMENTS.upload(file, {
                collection: "civil.papers",
                itemId: caseId,
              });
              await command("attach_document", {
                kind: data.get("kind"),
                name: file.name,
                key: meta.storageKey,
                note: data.get("note"),
              });
            },
          ),
        );
      }
      if (id === "civil-calendar") {
        root.querySelector("#ca-search").closest("label").hidden = true;
        root.querySelector("#ca-list").hidden = true;
        const calendar = document.createElement("div");
        root.querySelector("#ca-list").before(calendar);
        updateViewButtons("cards");
        calendarController = await window.CaliforniaCivilCalendar.mount(
          calendar,
          (range) => api("calendar", range, scope),
          async (caseId) => {
            if (root.querySelector("#ca-form form"))
              throw Error(
                "Save or cancel the open form before opening another case.",
              );
            await detail(caseId);
          },
          (error) => status(error.message),
        );
      }
      if (openCaseId) await detail(openCaseId);
      return true;
    } catch (e) {
      if (token === generation) {
        root.innerHTML =
          '<div class="panel"><div class="panel-body"><p role="alert"></p><button class="btn btn-outline">Retry</button></div></div>';
        root.querySelector("[role=alert]").textContent = e.message;
        root.querySelector("button").onclick = () => route(root, id);
      }
      return true;
    }
  }
  function mountReadiness(body) {
    const section = document.createElement("section");
    section.className = "panel";
    section.innerHTML =
      '<div class="panel-head"><h3>California release readiness</h3></div><div class="panel-body"><p>Record completed checks with supporting evidence. Saving evidence does not enable live processing.</p><button type="button" class="btn btn-outline" id="ca-load-readiness">Load readiness checklist</button><div id="ca-readiness"></div></div>';
    body.appendChild(section);
    section.querySelector("#ca-load-readiness").onclick = async () => {
      const target = section.querySelector("#ca-readiness");
      target.textContent = "Loading...";
      try {
        const context = await api("context");
        let saved = await api("readiness");
        const show = () => {
          target.innerHTML =
            '<p role="status">' +
            (saved.readyForApproval
              ? "Evidence complete, awaiting release approval."
              : "Outstanding checks: " +
                saved.missing.length +
                "; workflows awaiting acceptance: " +
                saved.missingWorkflows.length +
                ".") +
            '</p><table class="data-table"><thead><tr><th>Release check</th><th>Status</th><th>Evidence</th></tr></thead><tbody>' +
            Object.entries(saved.checks)
              .map(
                ([key, label]) =>
                  "<tr><td>" +
                  esc(label) +
                  "</td><td>" +
                  esc(saved.entries[key]?.status || "pending") +
                  "</td><td>" +
                  esc(saved.entries[key]?.reference || "No evidence recorded") +
                  "</td></tr>",
              )
              .join("") +
            "</tbody></table>" +
            (context.platformAdmin
              ? "<form><h4>Record review evidence</h4>" +
                input("check", "", Object.entries(saved.checks)) +
                input("status", "pending", ["pending", "passed", "failed"]) +
                input("reference") +
                "<fieldset><legend>Workflows accepted by the documented review</legend>" +
                Object.entries(context.workflows)
                  .map(
                    ([key, w]) =>
                      '<label><input type="checkbox" name="acceptedWorkflows" value="' +
                      esc(key) +
                      '" ' +
                      (saved.acceptedWorkflows?.includes(key)
                        ? "checked"
                        : "") +
                      "> " +
                      esc(w.label) +
                      "</label><br>",
                  )
                  .join("") +
                '</fieldset><p role="alert"></p><button type="submit" class="btn btn-primary">Save evidence</button></form>'
              : "<p>Platform administrators record acceptance evidence.</p>");
          if (context.countyFeeReference) {
            const fees = context.countyFeeReference,
              reference = document.createElement("details");
            reference.innerHTML =
              '<summary>Sonoma published fee reference</summary><p>Review these reference amounts against the packet, applicable exemptions and current agency policy before recording a charge.</p><table class="data-table"><tbody>' +
              Object.entries(fees.serviceCents)
                .map(
                  ([key, value]) =>
                    "<tr><th>" +
                    esc(context.workflows[key]?.label || key) +
                    "</th><td>" +
                    money(value) +
                    "</td></tr>",
                )
                .join("") +
              "<tr><th>Printing per page</th><td>" +
              money(fees.printingPerPageCents) +
              "</td></tr><tr><th>Writ disbursement processing</th><td>" +
              money(fees.disbursementProcessingCents) +
              "</td></tr></tbody></table><p>" +
              esc(fees.notes) +
              '</p><a href="' +
              esc(fees.source) +
              '" target="_blank" rel="noopener">County fee schedule</a> · <a href="' +
              esc(fees.updates) +
              '" target="_blank" rel="noopener">County updates</a>';
            target.appendChild(reference);
          }
          target
            .querySelector("form")
            ?.addEventListener("submit", async (event) => {
              event.preventDefault();
              const button = event.submitter;
              button.disabled = true;
              try {
                const data = new FormData(event.target);
                saved = await api("readiness", {
                  expectedRevision: saved.revision,
                  evidence: {
                    check: data.get("check"),
                    status: data.get("status"),
                    reference: data.get("reference"),
                    acceptedWorkflows: data.getAll("acceptedWorkflows"),
                  },
                });
                show();
              } catch (error) {
                target.querySelector("[role=alert]").textContent =
                  error.message;
                button.disabled = false;
              }
            });
        };
        show();
      } catch (error) {
        target.textContent = error.message;
      }
    };
  }
  const hasOpenWork = () =>
    !!document.querySelector(
      ".view.active #ca-form form, .view.active #ca-detail h3, .view.active #ca-readiness form",
    );
  return { route, hasOpenWork, mountReadiness, context: () => api("context") };
})();

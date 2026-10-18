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
  let preferredBoardView = "kanban";
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
      "formCode",
      "documentsServed",
      "mailingCityState",
      "mailingMethod",
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
      "First-class mail",
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
    return `<label class="form-row">${esc(key === "workflowId" ? "Workflow Type" : name(key))}${
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
      let activeCaseId = null;
      let activeCaseSection = "Overview";
      let calendarController;
      const firstPage = await api(
        "list",
        { assignedOnly: id === "civil-mine" },
        scope,
      );
      let rows = firstPage.cases,
        nextCursor = firstPage.nextCursor;
      const boardOptions=id==='civil-board'?await api('filters',{},scope):{types:[],locations:[]};
      if (token !== generation) return true;
      if (id === "civil-mine")
        rows = rows.filter(
          (x) => x.record.assignedServerId === context.personId,
        );
      const report = id === "civil-reports";
      if (report && !can("civil_reports_view"))
        throw Error("Civil reporting permission is required.");
      root.innerHTML = `
${SonoMarziCivilRecordUI.styles}
<style id="ca-classic-theme">
.ca-classic{--ca-accent:var(--primary,#3478db);--ca-surface:var(--surface,var(--card-bg,var(--bg-card,#172335)));--ca-border:var(--border,rgba(110,146,182,.3));}
.ca-classic.panel{border:0;background:transparent;box-shadow:none}
.ca-classic>.panel-head{border:0;background:linear-gradient(110deg,rgba(38,109,215,.19),rgba(16,167,153,.10));padding:22px 24px;border-radius:16px 16px 0 0;border-bottom:1px solid var(--ca-border)}
.ca-classic>.panel-head h3{font-size:23px;letter-spacing:-.4px;margin:0;color:var(--heading,var(--text))}
.ca-classic>.panel-body{padding:22px 24px;border:1px solid var(--ca-border);border-top:0;border-radius:0 0 16px 16px}
.ca-classic .ca-action-row{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:15px 0}
.ca-classic .ca-action-row .btn{min-height:42px}
.ca-classic .ca-secondary-actions{display:flex;flex-wrap:wrap;gap:9px;padding:13px;margin:5px 0 16px;border:1px solid var(--ca-border);border-radius:12px;background:var(--ca-surface)}
.ca-classic .ca-secondary-actions[hidden]{display:none!important}
@media(max-width:640px){.ca-classic .ca-action-row .btn{flex:1 1 160px}.ca-classic .ca-secondary-actions .btn{flex:1 1 145px}}
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
.ca-classic .ca-workspace-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin:16px 0 18px}
.ca-classic .ca-workspace-heading h2{font-size:clamp(20px,2vw,27px);margin:3px 0 6px;overflow-wrap:anywhere}
.ca-classic .ca-workspace-heading p{font-size:13px;color:var(--text-dim);margin:0}
.ca-classic .ca-workspace-kicker{color:var(--ca-accent);text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:750}
.ca-classic .ca-case-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0}
.ca-classic .ca-case-summary>div{background:var(--ca-surface);border:1px solid var(--ca-border);border-radius:12px;padding:13px 15px;min-width:0}
.ca-classic .ca-case-summary small{display:block;color:var(--text-dim);font-size:11px;margin-bottom:8px;text-transform:uppercase;letter-spacing:.035em}
.ca-classic .ca-case-summary strong{display:block;font-size:14px;overflow-wrap:anywhere;color:var(--heading,var(--text))}
.ca-classic .ca-progress{border:1px solid var(--ca-border);border-radius:14px;padding:17px 16px;margin:17px 0}
.ca-classic .ca-progress-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:17px;color:var(--text-dim);font-size:12px}
.ca-classic .ca-progress-title h4{margin:0;color:var(--heading,var(--text));font-size:15px}
.ca-classic .ca-progress-track{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:5px}
.ca-classic .ca-progress-step{min-width:0;border-top:5px solid var(--ca-border);padding-top:10px;color:var(--text-dim)}
.ca-classic .ca-progress-step[data-complete="true"]{border-color:#26b58b;color:var(--heading,var(--text))}
.ca-classic .ca-progress-step[data-current="true"]{border-color:var(--ca-accent);color:var(--ca-accent);font-weight:750}
.ca-classic .ca-progress-step small{font-size:10px;overflow-wrap:anywhere}
.ca-classic .ca-progress-dot{display:none}
.ca-classic .ca-next-step{background:linear-gradient(110deg,rgba(47,116,222,.12),rgba(27,143,156,.04)),var(--ca-surface);border:1px solid var(--ca-border);border-left:4px solid var(--ca-accent);margin:16px 0}
.ca-classic .ca-next-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.ca-classic .ca-next-heading h4{margin:0;font-size:16px}
.ca-classic .ca-next-heading span{color:var(--text-dim);font-size:11px}
.ca-classic .ca-form-reference{font-size:12px;color:var(--text-dim)}
@media(max-width:800px){.ca-classic .ca-case-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.ca-classic .ca-progress-track{grid-template-columns:repeat(3,minmax(0,1fr));row-gap:10px}}
@media(max-width:460px){.ca-classic .ca-case-summary{grid-template-columns:1fr 1fr}.ca-classic .ca-case-summary>div{padding:10px}.ca-classic .ca-case-summary strong{font-size:12px}}
.ca-classic .ca-workspace-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 0}
.ca-section-overlay{position:fixed;inset:0;z-index:9000;background:rgba(4,10,22,.78);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:2.5vh 2.5vw;box-sizing:border-box}
.ca-section-dialog{width:min(1600px,95vw);height:95dvh;max-height:95dvh;background:var(--surface,var(--bg-card,#172335));border:1px solid var(--border);box-shadow:0 24px 85px rgba(0,0,0,.5);border-radius:17px;display:flex;flex-direction:column;overflow:hidden;min-height:0}
.ca-section-dialog-head,.ca-section-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-shrink:0;padding:17px 24px;background:var(--surface,var(--bg-card,#172335))}
.ca-section-dialog-head{border-bottom:1px solid var(--border)}.ca-section-dialog-head p{color:var(--text-dim);font-size:12px;margin:0 0 5px}.ca-section-dialog-head h2{font-size:24px;margin:0}.ca-section-dialog-foot{border-top:1px solid var(--border)}.ca-section-dialog-foot span{font-size:12px;color:var(--text-dim)}
.ca-section-dialog-body{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:22px 26px}.ca-section-content{max-width:1400px;margin:auto}.ca-section-content>details,.ca-section-content>#ca-documents,.ca-section-content>.ca-forms-library{margin:16px 0}.ca-section-dialog .ca-action-row{margin:0 0 14px}.ca-section-dialog .ca-section-close{width:44px;height:44px;min-width:44px;padding:0;font-size:22px}.ca-section-dialog .ca-section-content>h4{font-size:17px}
@media(max-width:680px){.ca-section-overlay{padding:0}.ca-section-dialog{width:100vw;height:100dvh;max-height:100dvh;border-radius:0}.ca-section-dialog-head,.ca-section-dialog-foot{padding:12px 16px}.ca-section-dialog-body{padding:14px}.ca-section-dialog-foot span{display:none}}
.ca-classic .ca-case-tabs{display:flex;gap:7px;overflow-x:auto;flex-wrap:nowrap;margin:18px 0;padding-bottom:12px;scrollbar-width:thin}
.ca-classic .ca-case-tabs>.btn{flex:0 0 auto}
.ca-classic .ca-case-tabs button[aria-current="page"]{background:rgba(49,123,221,.18);border-color:var(--ca-accent);color:var(--heading,var(--text))}
.ca-classic #ca-detail details[hidden],.ca-classic #ca-documents[hidden]{display:none!important}
.ca-classic #ca-detail details{max-width:100%;overflow-x:auto}
.ca-classic #ca-detail details table{font-size:13px}

.ca-classic .ca-case-tabs button[aria-selected="true"]{background:rgba(45,120,215,.19);border-color:var(--ca-accent);color:var(--heading)}
.ca-classic .ca-case-tabs button:focus-visible{outline:2px solid var(--ca-accent);outline-offset:2px}
.ca-classic #ca-actions{max-width:100%;overflow:visible}
.ca-classic #ca-actions .ca-secondary-actions{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0}
.ca-classic #ca-detail .ca-case-content{display:block}
.ca-classic #ca-form:empty{display:none}
.ca-classic #ca-form .ca-form-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(3,9,20,.78);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px)}
.ca-classic .ca-form-fields input,.ca-classic .ca-form-fields select,.ca-classic .ca-form-fields textarea{width:100%;max-width:100%;box-sizing:border-box;min-height:43px;border-radius:10px}
.ca-classic .ca-form-fields textarea{min-height:96px;resize:vertical}
.ca-classic .ca-form-fields .form-row{font-size:13px;font-weight:650}
.ca-classic .ca-form-heading h3{font-size:20px;letter-spacing:-.02em}
.ca-classic .ca-form-footer{border-top:1px solid var(--ca-border)}
@media(prefers-reduced-motion:reduce){.ca-classic .btn{transition:none;transform:none!important}}
.ca-classic #ca-form .ca-form-backdrop>form{width:min(720px,100%);max-height:min(90dvh,900px);display:flex;flex-direction:column;padding:0;margin:0;overflow:hidden;background:var(--ca-surface,#172335);border:1px solid var(--ca-border);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.4)}
.ca-classic .ca-form-heading,.ca-classic .ca-form-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 22px;flex-shrink:0}
.ca-classic .ca-form-heading{border-bottom:1px solid var(--ca-border)}.ca-classic .ca-form-heading h3{margin:0}
.ca-classic .ca-form-fields{overflow:auto;padding:20px 22px;min-height:0;flex:1}
.ca-classic .ca-form-fields .form-row{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.ca-classic .ca-form-footer{justify-content:flex-end;border-top:1px solid var(--ca-border)}
.ca-classic .ca-form-backdrop [role=alert]:not(:empty){margin:8px 22px}
@media(max-width:650px){.ca-classic #ca-form .ca-form-backdrop{padding:0}.ca-classic #ca-form .ca-form-backdrop>form{max-height:100dvh;height:100dvh;border-radius:0}}
.ca-classic .ca-draft-confirm{display:flex;align-items:flex-start;gap:10px;font-size:13px;line-height:1.5;font-weight:650;margin-top:14px}
.ca-classic .ca-draft-confirm input{width:19px;height:19px;flex:0 0 19px;margin-top:1px}
.ca-classic .ca-return-review{border:1px solid var(--ca-border);border-radius:14px;padding:16px;background:linear-gradient(125deg,rgba(50,119,215,.11),transparent);margin-bottom:18px}
.ca-classic .ca-return-review-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ca-classic .ca-return-review-top strong{font-size:15px}.ca-classic .ca-return-review-top span{font-size:11px;color:var(--text-dim)}
.ca-classic .ca-return-review p,.ca-classic .ca-return-foot{font-size:12px;line-height:1.5;color:var(--text-dim)}
.ca-classic .ca-return-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ca-classic .ca-return-facts>div{padding:10px 12px;border-radius:9px;background:var(--ca-surface);border:1px solid var(--ca-border);min-width:0}
.ca-classic .ca-return-facts small{display:block;font-size:10px;text-transform:uppercase;color:var(--text-dim);margin-bottom:5px}
.ca-classic .ca-return-facts strong{font-size:12px;overflow-wrap:anywhere}
.ca-classic .ca-return-check{margin:14px 0;padding:10px 12px;font-size:12px;font-weight:650;border-radius:9px}
.ca-classic .ca-return-good{color:var(--green,#29b87e);background:rgba(35,166,115,.1)}
.ca-classic .ca-return-warn{color:var(--gold,#eba94c);background:rgba(214,151,38,.1)}
@media(max-width:520px){.ca-classic .ca-return-facts{grid-template-columns:1fr}}
.ca-classic .ca-draft-feature{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:15px 0 22px;padding:18px;border:1px solid var(--ca-border);border-radius:15px;background:linear-gradient(105deg,rgba(42,115,215,.15),rgba(35,145,139,.055)),var(--ca-surface)}
.ca-classic .ca-draft-feature-icon{height:44px;width:44px;flex-shrink:0;border-radius:12px;display:grid;place-items:center;font-size:24px;color:var(--ca-accent);background:rgba(53,122,216,.14)}
.ca-classic .ca-draft-feature-copy{flex:1;min-width:190px}
.ca-classic .ca-draft-feature-copy strong{font-size:15px}
.ca-classic .ca-draft-feature-copy p{margin:5px 0 0;color:var(--text-dim);font-size:12px;line-height:1.5}
.ca-classic .ca-draft-feature>.btn{flex-shrink:0;min-height:43px;border-radius:10px}
@media(max-width:600px){.ca-classic .ca-draft-feature>.btn{width:100%}}
.ca-classic .ca-pos-preflight{background:var(--ca-surface);border:1px solid var(--ca-border);border-radius:12px;padding:14px 16px;margin:14px 0 20px}
.ca-classic .ca-pos-preflight strong{font-size:13px}
.ca-classic .ca-pos-preflight p{margin:8px 0 0;font-size:12px;line-height:1.6}
.ca-classic .ca-pos-missing{color:var(--gold,#e6ad50)!important}
.ca-classic .ca-pos-ready{color:var(--green,#26b485)!important}
.ca-classic .ca-intake-more{margin:10px 0 0}
.ca-classic .ca-intake-more summary{cursor:pointer;display:inline-flex;align-items:center;min-height:36px;color:var(--blue,#438be9);font-size:12px;font-weight:700}
.ca-classic .ca-intake-more summary:focus-visible{outline:2px solid var(--ca-accent);outline-offset:3px}
.ca-classic .ca-intake-more .ca-intake-checklist{margin:8px 0 0}
.ca-classic .ca-proof-progress{padding:15px 17px;margin:12px 0 19px;border:1px solid var(--ca-border);border-radius:13px;background:var(--ca-surface)}
.ca-classic .ca-proof-progress>div{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ca-classic .ca-proof-progress strong{font-size:13px}
.ca-classic .ca-proof-progress span{font-size:11px;font-weight:750;border-radius:999px;padding:5px 10px}
.ca-classic .ca-proof-ready{color:#21bf88;background:rgba(33,191,136,.13)}
.ca-classic .ca-proof-needed{color:#ebad55;background:rgba(235,173,85,.13)}
.ca-classic .ca-proof-progress p{font-size:12px;line-height:1.6;color:var(--text-dim);margin:9px 0 0}
.ca-classic .ca-signed-upload{margin-top:16px;min-height:43px}
.ca-classic .ca-pos-supplementals{margin:16px 0 0;border:1px solid var(--ca-border);border-radius:12px;padding:12px 15px}
.ca-classic .ca-pos-supplementals summary{font-size:12px;font-weight:750;cursor:pointer}
.ca-classic .ca-pos-supplemental-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:9px;margin-top:12px}
.ca-classic .ca-pos-supplemental-grid span{font-size:12px;line-height:1.45}
.ca-classic .ca-pos-catalog{margin:24px 0 20px;border-top:1px solid var(--ca-border);padding-top:20px}
.ca-classic .ca-pos-heading,.ca-classic .ca-pos-title{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ca-classic .ca-pos-heading h4{font-size:15px;margin:0}
.ca-classic .ca-pos-heading span,.ca-classic .ca-pos-catalog p,.ca-classic .ca-form-resource small{font-size:12px;color:var(--text-dim);line-height:1.5}
.ca-classic .ca-pos-suggested{font-size:10px;font-weight:700;color:var(--green,#1aab79);background:rgba(35,166,115,.12);padding:5px 8px;border-radius:7px}
.ca-classic .ca-forms-library{margin:16px 0 20px}
.ca-classic .ca-forms-library[hidden]{display:none!important}
.ca-classic .ca-forms-head h3{font-size:17px;margin:0 0 5px}
.ca-classic .ca-forms-head p,.ca-classic .ca-form-disclaimer{font-size:12px;color:var(--text-dim);line-height:1.5}
.ca-classic .ca-form-resource-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:12px;margin:14px 0}
.ca-classic .ca-form-resource{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:16px;background:var(--ca-surface);border:1px solid var(--ca-border);border-radius:13px}
.ca-classic .ca-form-code{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--ca-accent);background:rgba(54,121,217,.12);padding:5px 8px;border-radius:7px}
.ca-classic .ca-form-resource strong{font-size:14px;line-height:1.35}
.ca-classic .ca-form-resource .btn{margin-top:auto;border-radius:9px;min-height:39px}
.ca-classic .ca-form-notice{font-size:12px;color:var(--text-dim)}
.ca-classic .ca-intake-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 18px}
.ca-classic .ca-intake-intro{margin:0 0 18px;color:var(--text-dim);font-size:13px;line-height:1.6}
.ca-classic .ca-intake-section{grid-column:1/-1;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ca-accent);border-bottom:1px solid var(--ca-border);padding-bottom:9px;margin-top:10px}
.ca-classic .ca-intake-grid .form-row{margin:0}
.ca-classic .ca-intake-grid .ca-wide{grid-column:1/-1}
.ca-classic .ca-intake-grid input,.ca-classic .ca-intake-grid select{min-height:43px;box-sizing:border-box}
.ca-classic .ca-intake-grid .ca-field-help{font-size:11px;color:var(--text-dim);line-height:1.4}
@media(max-width:620px){.ca-classic .ca-intake-grid{grid-template-columns:1fr}.ca-classic .ca-intake-grid .ca-wide{grid-column:1}}
.ca-classic .ca-kind-picker{position:relative;min-width:0}
.ca-classic .ca-kind-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:44px;text-align:left}
.ca-classic .ca-kind-options{position:relative;z-index:4;margin-top:6px;border:1px solid var(--ca-border);border-radius:12px;background:var(--ca-surface);padding:5px;max-height:235px;overflow-y:auto;box-shadow:0 10px 22px rgba(0,0,0,.16)}
.ca-classic .ca-kind-options[hidden]{display:none}
.ca-classic .ca-kind-option{display:block;width:100%;text-align:left;background:transparent;border:0;color:var(--text);padding:10px 12px;border-radius:8px;cursor:pointer;font:inherit}
.ca-classic .ca-kind-option:hover,.ca-classic .ca-kind-option:focus-visible{background:rgba(55,128,225,.18);outline:1px solid var(--ca-accent)}
.ca-classic .ca-doc-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:12px;color:var(--text-dim);font-size:13px}
.ca-classic .ca-doc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:10px;margin:12px 0}
.ca-classic .ca-doc-item{border:1px solid var(--ca-border);border-radius:12px;background:var(--ca-surface);padding:14px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-width:0}
.ca-classic .ca-doc-item strong{display:block;overflow-wrap:anywhere}
.ca-classic .ca-doc-item small{display:block;color:var(--text-dim);margin-top:4px}
.ca-classic .ca-doc-tools{display:flex;gap:8px;flex-wrap:wrap}
.ca-classic .ca-doc-empty{color:var(--text-dim)}
.ca-classic .ca-upload-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:26px 18px;border:2px dashed var(--ca-border);border-radius:14px;background:rgba(54,122,215,.055);text-align:center;cursor:pointer;min-height:146px;overflow:hidden}
.ca-classic .ca-upload-drop:hover,.ca-classic .ca-upload-drop:focus-within{border-color:var(--ca-accent);background:rgba(54,122,215,.10)}
.ca-classic .ca-upload-drop input[type=file].ca-file-input{position:absolute;width:1px;height:1px;left:0;bottom:0;opacity:0;pointer-events:none;overflow:hidden}
.ca-classic .ca-upload-drop .ca-file-choose{position:relative;z-index:1;min-height:42px;min-width:144px}
.ca-classic .ca-upload-drop[data-selected="true"]{border-color:#25ba8b;background:rgba(37,186,139,.08)}
.ca-classic .ca-upload-drop:focus-within{outline:2px solid var(--ca-accent);outline-offset:2px}
.ca-classic .ca-upload-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:rgba(58,128,224,.2);color:var(--ca-accent);font-size:23px;font-weight:700}
.ca-classic .ca-upload-hint,.ca-classic .ca-upload-filename{font-size:12px;color:var(--text-dim);overflow-wrap:anywhere}
.ca-classic .ca-upload-filename{color:var(--heading,var(--text));font-weight:600}
.ca-classic .ca-upload-field small{color:var(--text-dim)}
.ca-classic .ca-action-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ca-classic .ca-action-row>.btn,.ca-classic .ca-action-row>.ca-action-menu>summary{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:42px;min-height:42px;padding:0 16px;margin:0;border-radius:10px;font-size:13px;line-height:1.2;font-weight:650;white-space:nowrap}
.ca-classic .ca-action-row>.ca-action-menu{border:0;padding:0;margin:0;background:transparent;box-shadow:none}
.ca-classic .ca-action-row>.ca-action-menu>summary{border:1px solid var(--ca-border);background:var(--ca-surface);color:var(--text);cursor:pointer}
.ca-classic .ca-case-tabs{align-items:stretch;gap:8px}
.ca-classic .ca-case-tabs>.btn{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:40px;height:40px;padding:0 14px;margin:0;border:1px solid var(--ca-border);border-radius:10px;font-size:13px;line-height:1.2;font-weight:650}
@media(max-width:600px){.ca-classic .ca-action-row>.btn,.ca-classic .ca-action-row>.ca-action-menu>summary{min-height:44px;height:44px}.ca-classic .ca-case-tabs>.btn{min-height:42px;height:42px}}
.ca-classic .ca-action-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ca-classic .ca-action-row>.btn{height:42px;min-height:42px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0 16px;line-height:1.2;margin:0;border-radius:10px}
.ca-classic .ca-action-row>.ca-secondary-actions{flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px}
.ca-classic .ca-action-row>.ca-secondary-actions[hidden]{display:none!important}

.ca-classic .ca-action-menu{position:relative;max-width:100%}
.ca-classic .ca-action-menu summary{list-style:none;cursor:pointer;display:inline-block}
.ca-classic .ca-action-menu summary::-webkit-details-marker{display:none}
.ca-classic .ca-action-menu[open]{flex-basis:100%}
.ca-classic .ca-action-menu .ca-secondary-actions{border:1px solid var(--ca-border);border-radius:12px;background:var(--ca-surface);padding:12px;margin-top:8px}
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
.ca-classic .ca-shared-board-controls{margin:16px 0}.ca-classic .ca-board-mode{display:flex;justify-content:flex-end;margin:12px 0}.ca-classic .ca-view-controls[hidden]{display:none!important}.ca-classic.ca-workspace-open .ca-shared-board-controls{display:none!important}.ca-classic.ca-workspace-open .ca-board-mode{display:none!important}
.ca-classic .civil-board{gap:13px;align-items:stretch}.ca-classic .civil-card{cursor:pointer;min-height:110px;display:block;margin-bottom:9px}.ca-classic .civil-card:focus-visible{outline:2px solid var(--ca-accent);outline-offset:2px}.ca-classic .civil-card-meta{gap:6px;flex-wrap:wrap}.ca-classic .ca-service-map{border:1px solid var(--ca-border);border-radius:14px;background:var(--ca-surface);padding:16px;margin:15px 0}.ca-classic .ca-service-map-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.ca-classic .ca-service-map-head h4{margin:0}.ca-classic .ca-service-map-location{font-size:12px;color:var(--text-dim);margin:10px 0}.ca-classic .ca-service-map iframe{display:block;border:0;border-radius:10px;width:100%;height:250px}.ca-classic .ca-service-map p{font-size:11px;color:var(--text-dim);margin-bottom:0}.ca-classic .ca-safety-alert{border:1px solid var(--red,#e56770);border-radius:12px;padding:14px 16px;background:rgba(230,60,65,.09);margin-bottom:14px}.ca-classic .ca-safety-alert strong{color:var(--red,#e56770)}.ca-classic .ca-safety-manager{border:1px solid var(--ca-border);border-radius:14px;padding:16px;margin:14px 0}.ca-classic .ca-safety-manager-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}.ca-classic .ca-safety-manager h4{margin:0}.ca-classic .ca-safety-manager p,.ca-classic .ca-safety-manager small{font-size:12px;color:var(--text-dim)}.ca-classic .ca-safety-entry{padding:10px 0;border-top:1px solid var(--ca-border)}.ca-classic .ca-safety-entry strong{color:var(--red,#e56770)}.ca-classic .ca-safety-entry .btn{display:block;margin-top:8px}.ca-classic .ca-safety-alert p{font-size:12px;margin:6px 0 0}
</style><div class="panel ca-classic"><div class="panel-head"><h3>Civil Process</h3></div><div class="panel-body"><p class="ca-subtitle">${esc(context.profile.county ? context.profile.county + " County, California" : "California")} ${context.profile.status === "test" ? " · Test environment" : ""}</p><p id="ca-status" role="status"></p><div class="toolbar ca-list-toolbar"><button class="btn btn-outline" id="ca-refresh">Refresh</button> ${can("civil_paper_intake") ? '<button class="btn btn-primary" id="ca-new">New case</button>' : ""} ${report && can("civil_reports_export") ? '<button class="btn btn-outline" id="ca-export">Export CSV</button>' : ""}</div>${id==="civil-board"?SonoMarziCivilBoardUI.styles+'<div class="ca-shared-board-controls">'+SonoMarziCivilBoardUI.filters({ids:{search:"ca-search",type:"ca-type-filter",location:"ca-location-filter"},types:boardOptions.types,locations:boardOptions.locations})+'</div>':`<label class="form-row" id="ca-search-label">Search cases<input id="ca-search" placeholder="Case, party, address, stage or due date"></label>`}${report ? '<div id="ca-report"></div>' : ""}<div class="ca-view-controls" role="group" aria-label="Case display mode"><button type="button" class="btn btn-outline" id="ca-view-cards" aria-pressed="true">${id === "civil-calendar" ? "▦ Calendar" : "▦ Cards"}</button><button type="button" class="btn btn-outline" id="ca-view-table" aria-pressed="false">☷ Table</button></div><div id="ca-list"></div><div id="ca-detail"></div><div id="ca-form"></div></div></div>`;
      const status = (msg) => {
        root.querySelector("#ca-status").textContent = msg;
      };
      let boardPaperType='All',boardLocation='All';
            const draw = () => {
        const selected = [...rows];
        if (id === "civil-calendar")
          selected.sort((a, b) =>
            (a.record.returnByDate || "9999").localeCompare(
              b.record.returnByDate || "9999",
            ),
          );
        const boardMode=id==="civil-board";
        const selectedForBoard=boardMode?selected.filter(({record:r})=>
          (boardPaperType==="All"||r.paperType===boardPaperType)&&
          (boardLocation==="All"||r.courtOfOrigin===boardLocation)):selected;
        const generalCard=(p)=>{
          const flag=(p.safetyFlags||[]).some(f=>f.active&&!f.retiredAt);
          const late=deadlineStatus(p.returnByDate,p.stage)==='overdue';
          const due=p.returnByDate||'Due date pending';
          return '<article class="civil-card" data-case="'+esc(p.id)+'" tabindex="0" role="button" aria-label="Open case '+esc(p.caseNumber)+'">'+
            (p.priority==='Immediate'?'<div class="civil-card-priority-tag">PRIORITY</div>':'')+
            '<div class="civil-card-case">'+esc(p.caseNumber)+'</div><div class="civil-card-type">'+esc(p.paperType)+'</div>'+
            (flag?'<div style="color:var(--red);font-size:11px;font-weight:800">⚠ SAFETY FLAG</div>':'')+
            '<div class="civil-card-party"><strong>Def:</strong> '+esc(p.defendant)+'</div>'+
            '<div class="civil-card-meta"><span>'+esc(context.people.find(person=>person.id===p.assignedServerId||person.person_id===p.assignedServerId)?.name||'Unassigned')+'</span><span style="'+(late?'color:var(--red);font-weight:700':'')+'">'+esc(due)+'</span></div>'+
            '<div class="civil-card-fee">'+esc(p.stage)+'</div></article>';
        };
        const cardHtml = selected.map(({record:r}) =>
          `<article class="ca-case-card" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}"><div class="ca-case-header"><h4>${esc(r.caseNumber)}</h4><span class="ca-status-pill" data-stage="${esc(r.stage)}">${esc(r.stage)}</span></div>
          <p class="ca-case-type">${esc(r.paperType)}</p><dl class="ca-card-details"><div><dt>Defendant</dt><dd>${esc(r.defendant || "Not provided")}</dd></div><div><dt>Return due</dt><dd>${esc(r.returnByDate || "Review pending")}</dd></div></dl><span class="ca-deadline" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}">${deadlineLabel(deadlineStatus(r.returnByDate,r.stage))}</span>
          <button type="button" class="btn btn-primary ca-card-open" data-case="${esc(r.id)}">Open case</button></article>`
        ).join("");
        const tableHtml = `<div class="ca-table-wrap"><table class="data-table"><thead><tr><th>Case</th><th>Type</th><th>Defendant</th><th>Status</th><th>Return due</th></tr></thead><tbody>${selected.map(({record:r}) => `<tr><td><button class="btn btn-outline" data-case="${esc(r.id)}">${esc(r.caseNumber)}</button></td><td>${esc(r.paperType)}</td><td>${esc(r.defendant)}</td><td><span class="ca-status-pill" data-stage="${esc(r.stage)}">${esc(r.stage)}</span></td><td>${esc(r.returnByDate || "Review pending")} <span class="ca-deadline" data-deadline="${deadlineStatus(r.returnByDate,r.stage)}">${deadlineLabel(deadlineStatus(r.returnByDate,r.stage))}</span></td></tr>`).join("")}</tbody></table></div>`;
        root.querySelector("#ca-list").innerHTML =
          (boardMode
            ? '<div class="ca-board-mode">'+SonoMarziCivilBoardUI.switcher(preferredBoardView)+'</div>'+
              (preferredBoardView==='kanban'
                ? SonoMarziCivilBoardUI.columns({items:selectedForBoard.map(x=>x.record),renderCard:generalCard,group:p=>SonoMarziCivilBoardUI.groupStage(p.stage),stageNames:SonoMarziCivilBoardUI.stages})
                : SonoMarziCivilBoardUI.table({items:selectedForBoard.map(x=>x.record),assigned:p=>context.people.find(person=>person.id===p.assignedServerId||person.person_id===p.assignedServerId)?.name||'Unassigned',group:p=>p.stage}))
            : (selected.length ? preferredCaseView === "cards" ? `<div class="ca-case-grid">${cardHtml}</div>` : tableHtml : '<div class="ca-empty-state"><strong>No cases to display</strong><p>Create a new case or adjust your search to see results here.</p></div>')) +
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
                ...(id==="civil-board"?{paperType:boardPaperType==="All"?"":boardPaperType,courtOfOrigin:boardLocation==="All"?"":boardLocation}:{}),
                ...(id==="civil-board"?{paperType:boardPaperType==="All"?"":boardPaperType,courtOfOrigin:boardLocation==="All"?"":boardLocation}:{}),
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
        root.querySelectorAll('[data-civil-mode]').forEach(button=>button.onclick=()=>{
          preferredBoardView=button.dataset.civilMode;draw();
        });
        root.querySelectorAll('.civil-card[data-case]').forEach(card=>{
          card.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();card.click();}};
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
      if(id==="civil-board")root.querySelector(".ca-view-controls").hidden=true;
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
      if(id==="civil-board"){
        for(const [selector,setter] of [['#ca-type-filter',value=>boardPaperType=value],['#ca-location-filter',value=>boardLocation=value]]){
          const element=root.querySelector(selector);
          if(element)element.onchange=async()=>{
            setter(element.value);
            clearTimeout(searchTimer);
            const epoch=++searchEpoch;
            status('Loading matching cases...');
            try{
              const page=await api('list',{
                query:root.querySelector('#ca-search').value,
                paperType:boardPaperType==='All'?'':boardPaperType,
                courtOfOrigin:boardLocation==='All'?'':boardLocation
              },scope);
              if(token!==generation||epoch!==searchEpoch)return;
              rows=page.cases;nextCursor=page.nextCursor;draw();status('');
            }catch(error){if(epoch===searchEpoch)status('Unable to filter cases: '+error.message);}
          };
        }
      }
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
        target.innerHTML = `<div class="ca-form-backdrop"><form role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="ca-form-heading"><h3>${esc(title)}</h3><button type="button" class="btn btn-outline" id="ca-cancel-form" aria-label="Close action">✕</button></div><div class="ca-form-fields">${html}</div><p role="alert"></p><div class="ca-form-footer"><button class="btn btn-outline" type="button" data-dismiss-form>Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div></form></div>`;
        // Native select popups can be clipped by scrollable modal bodies.
        // Use a keyboard-accessible, in-dialog option list for document kinds.
        const kindSelect=target.querySelector('select[name="kind"]');
        if(kindSelect){
          const host=document.createElement("div");
          host.className="ca-kind-picker";
          const options=[...kindSelect.options].filter(o=>o.value);
          const kindValue=document.createElement("input");kindValue.type="hidden";kindValue.name="kind";kindValue.value=kindSelect.value;
          host.innerHTML='<button type="button" class="btn btn-outline ca-kind-trigger" aria-expanded="false" aria-haspopup="listbox">Select document kind <span aria-hidden="true">⌄</span></button><div class="ca-kind-options" role="listbox" hidden></div>';
          const trigger=host.querySelector(".ca-kind-trigger");
          const list=host.querySelector(".ca-kind-options");
          options.forEach(o=>{
            const item=document.createElement("button");
            item.type="button";item.className="ca-kind-option";item.setAttribute("role","option");item.dataset.value=o.value;item.textContent=o.textContent;
            item.onclick=()=>{kindValue.value=o.value;trigger.firstChild.textContent=o.textContent+" ";trigger.setAttribute("aria-expanded","false");list.hidden=true;};
            list.append(item);
          });
          trigger.onclick=()=>{const open=trigger.getAttribute("aria-expanded")==="true";trigger.setAttribute("aria-expanded",String(!open));list.hidden=open;if(!open)list.querySelector("button")?.focus();};
          list.onkeydown=e=>{if(e.key==="Escape"){list.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();}if(["ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();const all=[...list.querySelectorAll("button")];const n=all.indexOf(document.activeElement);all[(n+(e.key==="ArrowDown"?1:all.length-1))%all.length]?.focus();}};
          kindSelect.replaceWith(kindValue,host);
        }
        // Workflow selection must not depend on the operating system's
        // native select overlay, which can be clipped by the modal scroller.
        const workflowSelect=target.querySelector('select[name="workflowId"]');
        if(workflowSelect){
          const container=document.createElement("div");
          const workflowValue=document.createElement("input");workflowValue.type="hidden";workflowValue.name="workflowId";workflowValue.value=workflowSelect.value;
          container.className="ca-kind-picker ca-workflow-picker";
          container.innerHTML='<button type="button" class="btn btn-outline ca-kind-trigger" aria-label="Choose workflow type" aria-haspopup="listbox" aria-expanded="false">Select workflow type <span aria-hidden="true">⌄</span></button><div class="ca-kind-options" role="listbox" aria-label="Workflow types" hidden></div>';
          const trigger=container.querySelector(".ca-kind-trigger");
          const options=container.querySelector(".ca-kind-options");
          [...workflowSelect.options].filter(option=>option.value).forEach(option=>{
            const item=document.createElement("button");
            item.type="button";item.className="ca-kind-option";item.setAttribute("role","option");
            item.dataset.value=option.value;item.textContent=option.textContent;
            item.onclick=()=>{
              workflowValue.value=option.value;
              workflowValue.dispatchEvent(new Event("change",{bubbles:true}));
              trigger.firstChild.textContent=option.textContent+" ";
              trigger.setAttribute("aria-expanded","false");options.hidden=true;trigger.focus();
            };
            options.append(item);
          });
          trigger.onclick=()=>{
            const expanded=trigger.getAttribute("aria-expanded")==="true";
            trigger.setAttribute("aria-expanded",String(!expanded));options.hidden=expanded;
            if(!expanded)options.querySelector(".ca-kind-option")?.focus();
          };
          options.onkeydown=event=>{
            if(event.key==="Escape"){
              event.preventDefault();options.hidden=true;
              trigger.setAttribute("aria-expanded","false");trigger.focus();
            }
            if(["ArrowDown","ArrowUp"].includes(event.key)){
              event.preventDefault();
              const items=[...options.querySelectorAll("button")];
              const current=items.indexOf(document.activeElement);
              items[(current+(event.key==="ArrowDown"?1:items.length-1)+items.length)%items.length]?.focus();
            }
          };
          workflowSelect.replaceWith(workflowValue,container);
        }
        const courtFormSelect=target.querySelector('select[name="formCode"]');
        if(courtFormSelect){
          const host=document.createElement("div");
          host.className="ca-kind-picker ca-court-form-picker";
          const value=document.createElement("input");
          value.type="hidden";value.name="formCode";value.value=courtFormSelect.value;
          host.innerHTML='<button type="button" class="btn btn-outline ca-kind-trigger" aria-haspopup="listbox" aria-expanded="false">Choose official court form <span aria-hidden="true">⌄</span></button><div class="ca-kind-options" role="listbox" aria-label="Official court forms" hidden></div>';
          const trigger=host.querySelector(".ca-kind-trigger"),menu=host.querySelector(".ca-kind-options");
          [...courtFormSelect.options].filter(option=>option.value).forEach(option=>{
            const item=document.createElement("button");
            item.type="button";item.className="ca-kind-option";item.dataset.value=option.value;
            item.textContent=option.textContent;item.setAttribute("role","option");
            item.onclick=()=>{
              value.value=option.value;trigger.firstChild.textContent=option.textContent+" ";
              trigger.setAttribute("aria-expanded","false");menu.hidden=true;trigger.focus();
            };
            menu.append(item);
          });
          trigger.onclick=()=>{
            const expanded=trigger.getAttribute("aria-expanded")==="true";
            trigger.setAttribute("aria-expanded",String(!expanded));menu.hidden=expanded;
            if(!expanded)menu.querySelector("button")?.focus();
          };
          menu.onkeydown=event=>{
            if(event.key==="Escape"){event.preventDefault();menu.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus();}
            if(["ArrowUp","ArrowDown"].includes(event.key)){
              event.preventDefault();const all=[...menu.querySelectorAll("button")];
              const index=all.indexOf(document.activeElement);
              all[(index+(event.key==="ArrowDown"?1:all.length-1)+all.length)%all.length]?.focus();
            }
          };
          courtFormSelect.replaceWith(value,host);
        }
        const fileInput=target.querySelector('input[type="file"]');
        if(fileInput){
          const field=fileInput.closest(".ca-upload-drop");
          const trigger=document.createElement("button");
          trigger.type="button";
          trigger.className="btn btn-primary ca-file-choose";
          trigger.textContent="Browse files";
          trigger.onclick=()=>fileInput.click();
          fileInput.classList.add("ca-file-input");
          field?.querySelector(".ca-upload-icon")?.after(trigger);
          fileInput.addEventListener("change",()=>{
            const label=field?.querySelector(".ca-upload-filename");
            const chosen=fileInput.files?.[0];
            if(label)label.textContent=chosen ? chosen.name : "No file selected";
            if(field)field.dataset.selected=chosen?"true":"false";
          });
        }
        window.CaliforniaCivilView.bindServiceFields(
          target.querySelector("form"),
        );
        const dialog=target.querySelector('[role="dialog"]');
        const dismiss=()=>{if(dialog?.dataset.saving==="true")return;target.innerHTML="";document.removeEventListener("keydown",onDialogKey);};
        const onDialogKey=event=>{
          if(!dialog?.isConnected)return;
          if(event.key==="Escape"){event.preventDefault();dismiss();return;}
          if(event.key==="Tab"){
            const focusable=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled):not([hidden]),select:not(:disabled):not([hidden]),textarea:not(:disabled),a[href]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=="hidden");
            if(!focusable.length)return;
            const first=focusable[0],last=focusable[focusable.length-1];
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
          }
        };
        document.addEventListener("keydown",onDialogKey);
        target.querySelectorAll("#ca-cancel-form,[data-dismiss-form]").forEach(b=>b.onclick=dismiss);
        target.querySelector("form").onsubmit = async (e) => {
          e.preventDefault();
          const button = e.submitter || e.target.querySelector('[type="submit"]');
          button.disabled = true;
          dialog.dataset.saving="true";
          button.dataset.previousLabel=button.textContent;
          button.textContent="Saving…";
          try {
            await save(new FormData(e.target));
            dialog.dataset.saving="false";
            dismiss();
          } catch (err) {
            const alert = target.querySelector("[role=alert]");
            if (alert) alert.textContent = err.message;
            else status(err.message);
          } finally {
            dialog.dataset.saving="false";
            button.disabled = false;
            button.textContent=button.dataset.previousLabel||"Save changes";
          }
        };
        target.querySelector("form")?.querySelector("input:not([type=file]),select,textarea,button")?.focus();
      }
      root.querySelector("#ca-new")?.addEventListener("click", () =>
        form(
          "New California case",
          '<p class="ca-intake-intro">Start with the court and parties. You can attach documents and complete required review details after creating the case.</p><div class="ca-intake-grid"><div class="ca-intake-section">Court & process</div>' + input(
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
              .map((html,i) => (i===2 ? '<div class="ca-intake-section">Parties & service location</div>' : "") + html)
              .join("") + "</div>",
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
        if(activeCaseId !== caseId){activeCaseId=caseId;activeCaseSection="Overview";}
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
        panel.querySelectorAll('[data-ca-address-idx]').forEach(button=>button.addEventListener('click',()=>{
          const i=Number(button.dataset.caAddressIdx);
          const addresses=(r.serviceAddresses||[]).length?r.serviceAddresses:(c.service?.address?[{address:c.service.address}]:[]);
          const selected=addresses[i];
          if(!selected?.address)return;
          panel.querySelectorAll('[data-ca-address-idx]').forEach(item=>{
            const active=Number(item.dataset.caAddressIdx)===i;
            item.classList.toggle('active',active);
            item.setAttribute('aria-pressed',String(active));
          });
          const frame=panel.querySelector('#caServiceAddressMap');
          if(frame)frame.src=SonoMarziCivilRecordUI.mapUrl(selected.address);
          const mapsLink=panel.querySelector('[data-civil-map-link]');
          if(mapsLink)mapsLink.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(selected.address);
        }));

        const shell=root.querySelector(".ca-classic");
        shell?.classList.add("ca-workspace-open");
        const bar=document.createElement("div");
        bar.className="ca-workspace-bar";
        bar.innerHTML='<button type="button" class="btn btn-outline" data-back-cases>← Back to cases</button>';
        panel.prepend(bar);
        bar.querySelector("[data-back-cases]").onclick=()=>{
          if(root.querySelector("#ca-form form")){status("Save or cancel the current action before returning to cases.");return;}
          ++selection;
          activeCaseId=null;
          activeCaseSection="Overview";
          shell?.classList.remove("ca-workspace-open");
          panel.innerHTML="";
        };
        const formSources={
          "POS-010":["Proof of Service of Summons","https://selfhelp.courts.ca.gov/jcc-form/POS-010"],
          "POS-020":["Proof of Personal Service—Civil","https://selfhelp.courts.ca.gov/jcc-form/POS-020"],
          "POS-030":["Proof of Service by First-Class Mail—Civil","https://selfhelp.courts.ca.gov/jcc-form/POS-030"],
          "POS-040":["Proof of Service—Civil","https://selfhelp.courts.ca.gov/jcc-form/POS-040"],
          "SC-104":["Proof of Service—Small Claims","https://selfhelp.courts.ca.gov/jcc-form/SC-104"],
          "SER-001":["Request for Sheriff to Serve Court Papers","https://selfhelp.courts.ca.gov/jcc-form/SER-001"],
          "SER-001A":["Special Instructions for Writs and Levies","https://selfhelp.courts.ca.gov/jcc-form/SER-001A"],
          "WG-005":["Employer's Return","https://selfhelp.courts.ca.gov/jcc-form/WG-005"]
        };
        const applicable=[...new Set([...(context.workflows[c.workflowId]?.forms||[]),...(context.workflows[c.workflowId]?.returns||[])])];
        const posChoices=[
          ["POS-010","Summons and complaint"],
          ["POS-020","Other civil papers served personally"],
          ["POS-030","Other civil papers served by first-class mail"],
          ["POS-040","Other civil papers: select the applicable permitted service method"]
        ];
        const posSupplemental=[
          ["POS-020(D)","Additional documents served"],
          ["POS-020(P)","Additional persons served"],
          ["POS-030(D)","Additional documents mailed"],
          ["POS-030(P)","Additional mail recipients"],
          ["POS-040(D)","Additional documents served"],
          ["POS-040(P)","Additional persons served"]
        ];
        const serviceMethod=c.service?.method||c.nonService?.method||"";
        // Proof of service selection is advisory, never a filing determination.
        // Small claims normally uses SC-104, not the general POS series.
        const serviceRecorded=Boolean(c.service?.date&&c.service?.recipient&&c.service?.address);
        const isSmallClaims=c.workflowId==="small-claims";
        const suggestedPos=isSmallClaims?null:c.workflowId==="summons"?"POS-010"
          :serviceMethod==="Personal service"?"POS-020"
          :/first.class mail/i.test(serviceMethod)?"POS-030":null;
        const missingProofFacts=[
          !serviceRecorded?"Completed service date, recipient and address":null,
          !serviceMethod?"Recorded service method":null,
          !(r.caseNumber&&r.courtOfOrigin)?"Court and case number":null,
          !(r.plaintiff&&r.defendant)?"Case parties":null
        ].filter(Boolean);
        const selectionGuidance=isSmallClaims
          ?"Small claims generally uses SC-104. Check the order and papers served before selecting a general civil proof form."
          :suggestedPos?"Review "+suggestedPos+" as a possible form based on the recorded service. Confirm the form's instructions and applicable court rules."
          :"No reliable POS-series recommendation can be made from the recorded service method. Review the official instructions or agency-approved return.";
        const formLibrary=document.createElement("section");
        formLibrary.className="ca-forms-library";
        const standardDraft=["summons","small-claims"].includes(c.workflowId);
        const draftSupported=standardDraft?c.service?.method==="Personal service":
          ["Personal service","First-class mail"].includes(c.service?.method);
        const canDraft=can("civil_document_generate")&&draftSupported&&r.stage==="Served";
        const draftHint=!draftSupported?"This recorded service method requires a manually completed or agency-approved court return."
          :r.stage!=="Served"?"Record completed personal service before generating a draft."
          :c.service?.method!=="Personal service"?"Automatic drafts currently support personal service only. Use the official form for this service method."
          :!can("civil_document_generate")?"Your role does not allow court-form generation.":"";
        formLibrary.innerHTML='<div class="ca-forms-head"><div><h3>Court forms & templates</h3><p>Choose the appropriate form, review recorded facts and complete the required signatures before submitting to court.</p></div></div>'+
          '<div class="ca-draft-feature"><div class="ca-draft-feature-icon">▤</div><div class="ca-draft-feature-copy"><strong>Generate court return draft</strong><p>'+esc(canDraft?"Prefill an unsigned official PDF from the case record. Review all fields, certify, sign and upload the completed document.":draftHint)+'</p></div>'+
          (canDraft?'<button type="button" id="ca-generate-draft" class="btn btn-primary">Generate unsigned draft →</button>':'<span class="ca-form-code">Manual review</span>')+'</div>'+
          '<div class="ca-pos-catalog"><div class="ca-pos-heading"><h4>California proof-of-service forms</h4><span>Four common Judicial Council forms</span></div><p>Choose based on the papers and the actual method of service. A recommendation is not a legal determination.</p>'+
          '<div class="ca-pos-preflight"><strong>Form selection review</strong><p>'+esc(selectionGuidance)+'</p>'+
          (missingProofFacts.length?'<p class="ca-pos-missing">Before preparing a return, verify: '+missingProofFacts.map(esc).join('; ')+'</p>':'<p class="ca-pos-ready">Core case and service facts are recorded. Confirm server qualifications, documents served, declarations and signature before filing.</p>')+'</div><div class="ca-form-resource-grid">'+posChoices.map(([code,description])=>{const source=formSources[code];return '<article class="ca-form-resource"><div class="ca-pos-title"><span class="ca-form-code">'+code+'</span>'+(suggestedPos===code?'<span class="ca-pos-suggested">Review for this case</span>':'')+'</div><strong>'+esc(source[0])+'</strong><small>'+esc(description)+'</small><a class="btn btn-outline" href="'+source[1]+'" target="_blank" rel="noopener noreferrer">Open official form ↗</a></article>';}).join('')+'</div><details class="ca-pos-supplementals"><summary>Need to list additional documents or people served?</summary><p>These are official continuation forms used when the relevant proof-of-service form needs additional space. They are separate from the four main POS forms.</p><div class="ca-pos-supplemental-grid">'+posSupplemental.map(([code,description])=>'<span><strong>'+esc(code)+'</strong> · '+esc(description)+'</span>').join('')+'</div></details></div>'+
          '<div class="ca-forms-head"><h4>Forms listed for this workflow</h4></div><div class="ca-form-resource-grid">'+applicable.map(code=>{
            const found=formSources[code];
            return '<article class="ca-form-resource"><span class="ca-form-code">'+esc(code)+'</span><strong>'+esc(found?.[0]||"Agency or process-specific return")+'</strong>'+
              (found?'<a class="btn btn-outline" href="'+found[1]+'" target="_blank" rel="noopener noreferrer">View official form ↗</a>':'<span class="ca-form-notice">Confirm the approved form or local return template for this process.</span>')+'</article>';
          }).join('')+'</div><p class="ca-form-disclaimer">Form links open California Courts resources. Unsigned prefill is available for qualifying personally served summons and small-claims cases only. All generated drafts require review and signature before filing.</p>';
        formLibrary.hidden=true;
        // Court forms are a working area, not a dead-end: provide an explicit
        // route to attach the reviewed and signed proof before return preparation.
        if(can("civil_document_generate")&&!["Closed","Cancelled","Return Prepared","Reviewed","Returned to Court"].includes(r.stage)){
          const uploadSigned=document.createElement("button");
          uploadSigned.type="button";
          uploadSigned.className="btn btn-outline ca-signed-upload";
          uploadSigned.textContent="Attach completed, signed proof →";
          uploadSigned.addEventListener("click",()=>{
            activateGroup("Documents");
            const add=panel.querySelector("#ca-upload");
            if(add)add.click();
            else status("Document changes are not available for this case stage.");
          });
          formLibrary.append(uploadSigned);
        }

        const caseFlags=(r.safetyFlags||[]);
        const activeCaseFlags=caseFlags.filter(flag=>flag.active&&!flag.retiredAt);
        const flagPanel=document.createElement('section');
        flagPanel.className='ca-safety-manager';
        flagPanel.innerHTML='<div class="ca-safety-manager-head"><h4>Officer Safety Flags</h4>'+
          (can('civil_paper_intake')&&!['Closed','Cancelled'].includes(r.stage)?'<button type="button" class="btn btn-outline btn-sm" data-ca-add-safety>⚠ Add Safety Flag</button>':'')+
          '</div>'+(!activeCaseFlags.length?'<p>No active case safety flags have been recorded.</p>':
          activeCaseFlags.map(flag=>'<div class="ca-safety-entry"><strong>⚠ '+esc(flag.scope||'Case')+' safety warning</strong><p>'+esc(flag.reason||'No narrative recorded')+'</p><small>Source / verification reference: '+esc(flag.verificationReference||'Not specified')+'</small>'+
          (can('civil_paper_intake')?'<button type="button" class="btn btn-outline btn-sm" data-ca-retire-safety="'+esc(flag.id)+'">Retire flag</button>':'')+'</div>').join(''));
        panel.querySelector("#ca-actions")?.before(flagPanel);
        flagPanel.querySelector('[data-ca-add-safety]')?.addEventListener('click',()=>form(
          'Add Officer Safety Flag',
          '<p>Record verified, actionable information. This warning is shown on the case and Service Board until formally retired.</p>'+
          '<label class="form-row">Applies to<select name="scope"><option>Person</option><option>Address</option><option>Case</option></select></label>'+
          '<label class="form-row">Safety concern<textarea name="reason" maxlength="1000" required></textarea></label>'+
          '<label class="form-row">Source or verification reference<input name="verificationReference" maxlength="500" required></label>'+
          '<label class="form-row">Action note<textarea name="note" maxlength="1000" required></textarea></label>',
          async values=>command('add_safety_flag',Object.fromEntries(values.entries()))
        ));
        flagPanel.querySelectorAll('[data-ca-retire-safety]').forEach(button=>button.addEventListener('click',()=>form(
          'Retire Officer Safety Flag',
          '<p>Retiring a flag does not erase it from the audit trail.</p><label class="form-row">Reason for retirement<textarea name="note" maxlength="1000" required></textarea></label>',
          async values=>command('retire_safety_flag',{flagId:button.dataset.caRetireSafety,note:String(values.get('note')||'')})
        )));

        panel.querySelector("#ca-actions")?.after(formLibrary);
        formLibrary.querySelector("#ca-generate-draft")?.addEventListener("click",()=>{
          const actionButton=panel.querySelector('[data-action="generate_return_draft"]');
          if(actionButton)actionButton.click();
          else status("Draft generation is not available for the current case state or your role.");
        });
        const sections=[...panel.querySelectorAll("details")];
        const titles=sections.map(section=>section.querySelector("summary")?.textContent?.trim()||"Case record");
        const documentSection=panel.querySelector("#ca-documents");
        const documentHeading=documentSection?.previousElementSibling;
        const recordHeading=sections[0]?.previousElementSibling;
        const tabs=document.createElement("nav");
        tabs.className="ca-case-tabs";tabs.setAttribute("aria-label","Case workspace sections");
        // Assign each case-record section to exactly one workspace. Regex
        // overlaps previously caused service outcome and court return sections
        // to appear in multiple tabs, often disconnected from their actions.
        const groups=[
          {label:"Overview",parts:[]},{label:"Service",parts:[]},
          {label:"Documents",parts:[]},{label:"Deadlines",parts:[]},
          {label:"Enforcement",parts:[]},{label:"Claims",parts:[]},
          {label:"Financials",parts:[]},{label:"Forms",parts:[]},
          {label:"History",parts:[]}
        ];
        const categoryFor=title=>{
          if(/history|audit/i.test(title))return "History";
          if(/court.form|form drafts|return packet/i.test(title))return "Forms";
          if(/service attempts|service outcome|court return/i.test(title))return "Service";
          if(/deadline|delivered notices/i.test(title))return "Deadlines";
          if(/enforcement/i.test(title))return "Enforcement";
          if(/claim|stay/i.test(title))return "Claims";
          if(/ledger|disburse|financial/i.test(title))return "Financials";
          return "Overview";
        };
        titles.forEach((title,index)=>{
          groups.find(group=>group.label===categoryFor(title)).parts.push(index);
        });
        // Section workspaces reuse the EXISTING live DOM nodes and event handlers.
        // Never clone case forms, documents, actions or jurisdiction-specific content.
        let activeSectionDialog=null;
        const sectionOrigins=new Map();
        const restoreSections=()=>{
          for(const [node,anchor] of sectionOrigins){
            if(anchor.parentNode)anchor.parentNode.replaceChild(node,anchor);
          }
          sectionOrigins.clear();
          activeSectionDialog?.remove();
          activeSectionDialog=null;
        };
        const moveInto=(node,destination)=>{
          if(!node||sectionOrigins.has(node))return;
          const marker=document.createComment('Civil section origin');
          node.parentNode?.replaceChild(marker,node);
          sectionOrigins.set(node,marker);
          node.hidden=false;
          destination.append(node);
        };
        const activateGroup=label=>{
          if(root.querySelector("#ca-form form")){
            status("Save or cancel your open form before changing case sections.");
            return;
          }
          restoreSections();
          const group=groups.find(g=>g.label===label)||groups[0];
          activeCaseSection=group.label;
          const inDialog=group.label!=="Overview";
          sections.forEach((section,i)=>{
            section.hidden=inDialog?!group.parts.includes(i):!group.parts.includes(i);
            section.open=group.parts.includes(i);
          });
          const showDocs=group.label==="Documents";
          if(documentSection)documentSection.hidden=!showDocs;
          if(documentHeading)documentHeading.hidden=!showDocs;
          formLibrary.hidden=group.label!=="Forms";
          if(recordHeading)recordHeading.hidden=group.label!=="Overview";
          tabs.querySelectorAll("button").forEach(button=>{
            const active=button.dataset.section===label;
            button.setAttribute("aria-current",active?"page":"false");
            button.setAttribute("aria-pressed",String(active));
            button.tabIndex=active?0:-1;
          });
          if(!inDialog)return;
          const dialog=document.createElement("div");
          dialog.className="ca-section-overlay";
          dialog.innerHTML='<div class="ca-section-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-section-title" tabindex="-1">'+
            '<header class="ca-section-dialog-head"><div><p>Civil Process · '+esc(r.caseNumber)+'</p><h2 id="ca-section-title">'+esc(group.label)+'</h2></div>'+
            '<button type="button" class="btn btn-outline ca-section-close" aria-label="Close '+esc(group.label)+' workspace">✕</button></header>'+
            '<div class="ca-section-dialog-body"><div class="ca-section-content"></div></div>'+
            '<footer class="ca-section-dialog-foot"><span>California jurisdiction controls and permissions remain active.</span><button type="button" class="btn btn-outline ca-section-dismiss">Back to case overview</button></footer></div>';
          panel.append(dialog);
          activeSectionDialog=dialog;
          const content=dialog.querySelector(".ca-section-content");
          const actionArea=panel.querySelector("#ca-actions");
          // All case actions remain the same live controls, never duplicate handlers.
          if(actionArea)moveInto(actionArea,content);
          if(showDocs){
            moveInto(documentHeading,content);
            moveInto(documentSection,content);
          }else if(group.label==="Forms"){
            moveInto(formLibrary,content);
          }else{
            group.parts.forEach(index=>moveInto(sections[index],content));
          }
          if(!content.querySelector("details, #ca-documents, .ca-forms-library")){
            const empty=document.createElement("p");empty.className="muted";
            empty.textContent="No additional "+group.label.toLowerCase()+" information has been recorded for this case.";
            content.append(empty);
          }
          const dismiss=()=>{
            if(root.querySelector("#ca-form form")){
              status("Save or cancel your open form before closing the section.");
              return;
            }
            activateGroup("Overview");
            tabs.querySelector('[data-section="Overview"]')?.focus();
          };
          dialog.querySelector(".ca-section-close").onclick=dismiss;
          dialog.querySelector(".ca-section-dismiss").onclick=dismiss;
          dialog.addEventListener("click",event=>{if(event.target===dialog)dismiss();});
          dialog.addEventListener("keydown",event=>{
            if(event.key==="Escape"){event.preventDefault();dismiss();return;}
            if(event.key!=="Tab")return;
            const focusable=[...dialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node=>!node.hidden&&node.getClientRects().length);
            if(!focusable.length)return;
            const first=focusable[0],last=focusable[focusable.length-1];
            if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
          });
          dialog.querySelector(".ca-section-close").focus();
        };
        groups.forEach(group=>{
          const button=document.createElement("button");button.type="button";
          button.className="btn btn-outline";button.dataset.section=group.label;
          button.textContent=group.label;
          button.setAttribute("aria-pressed","false");
          button.tabIndex=group.label==="Overview"?0:-1;
          button.onclick=()=>activateGroup(group.label);
          button.addEventListener("keydown",event=>{
            const all=[...tabs.querySelectorAll("button[data-section]")];
            const index=all.indexOf(button);
            const next=event.key==="ArrowRight"?(index+1)%all.length
              :event.key==="ArrowLeft"?(index-1+all.length)%all.length
              :event.key==="Home"?0:event.key==="End"?all.length-1:-1;
            if(next<0)return;
            event.preventDefault();
            activateGroup(all[next].dataset.section);
            all[next].focus();
          });
          tabs.append(button);
        });
        // Place the navigation immediately below the case heading, ahead of progress and summary.
        // Keep workflow action buttons in their existing guarded action region.
        panel.querySelector(".ca-workspace-heading")?.after(tabs);
        activateGroup(activeCaseSection);
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
              ...(canDraft ? ["generate_return_draft"] : []),
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
            intakeIssues.slice(0,3).forEach(issue=>{
              const li=document.createElement("li");li.textContent=issue;list.append(li);
            });
            nextPanel.querySelector(".panel-body")?.append(list);
            if(intakeIssues.length>3){
              const remaining=document.createElement("details");
              remaining.className="ca-intake-more";
              const toggle=document.createElement("summary");
              toggle.textContent="Show "+(intakeIssues.length-3)+" more intake requirements";
              const extra=document.createElement("ul");
              extra.className="ca-intake-checklist";
              intakeIssues.slice(3).forEach(issue=>{
                const li=document.createElement("li");li.textContent=issue;extra.append(li);
              });
              remaining.append(toggle,extra);
              nextPanel.querySelector(".panel-body")?.append(remaining);
            }
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
              activateGroup("Documents");
              panel.querySelector("#ca-upload")?.click();
            }else{
              const actionButton=panel.querySelector('[data-action="'+recommended+'"]');
              if(actionButton){
                const hiddenTray=actionButton.closest("#ca-more-actions");
                if(hiddenTray?.hidden){
                  hiddenTray.hidden=false;
                  panel.querySelector(".ca-more-trigger")?.setAttribute("aria-expanded","true");
                }
                actionButton.click();
              }
            }
          };
        }
        const primaryAction=recommended&&actions.includes(recommended)?recommended:null;
        const shortcutCandidates=["attempt","serve","unserved","prepare_return","review_return","record_return","generate_return_draft"];
        const shortcuts=shortcutCandidates.filter(action=>action!==primaryAction&&actions.includes(action)).slice(0,2);
        const visibleActions=new Set([primaryAction,...shortcuts].filter(Boolean));
        const secondary=actions.filter(action=>!visibleActions.has(action));
        panel.querySelector("#ca-actions").innerHTML=
          '<div class="ca-action-row" role="group" aria-label="Case actions">'+
          (primaryAction?'<button type="button" class="btn btn-primary" data-action="'+primaryAction+'">'+esc(labels[primaryAction])+'</button>':'')+
          shortcuts.map(action=>'<button type="button" class="btn btn-outline ca-action-shortcut" data-action="'+action+'">'+esc(labels[action])+'</button>').join("")+
          (secondary.length?'<button type="button" class="btn btn-outline ca-more-trigger" aria-expanded="false" aria-controls="ca-more-actions">More actions ('+secondary.length+') ▾</button>':'')+
          '</div>'+
          (secondary.length?'<div id="ca-more-actions" class="ca-secondary-actions" hidden role="group" aria-label="Additional case actions">'+
          secondary.map(action=>'<button type="button" class="btn btn-outline" data-action="'+action+'">'+esc(labels[action])+'</button>').join("")+'</div>':'');
        const moreTrigger=panel.querySelector(".ca-more-trigger");
        const morePanel=panel.querySelector("#ca-more-actions");
        if(moreTrigger&&morePanel){
          moreTrigger.onclick=()=>{
            const open=moreTrigger.getAttribute("aria-expanded")==="true";
            moreTrigger.setAttribute("aria-expanded",String(!open));
            morePanel.hidden=open;
          };
          morePanel.addEventListener("keydown",event=>{
            if(event.key==="Escape"){
              event.preventDefault();morePanel.hidden=true;moreTrigger.setAttribute("aria-expanded","false");moreTrigger.focus();
            }
          });
        }
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
                  key === "formCode"
                    ? c.workflowId==="summons"?[["POS-010","POS-010 · Proof of Service of Summons"]]
                      :c.workflowId==="small-claims"?[["SC-104","SC-104 · Proof of Service—Small Claims"]]
                      :c.service?.method==="First-class mail"?[["POS-030","POS-030 · First-Class Mail—Civil"]]
                      :[["POS-020","POS-020 · Personal Service—Civil"],["POS-040","POS-040 · Proof of Service—Civil"]]
                  :key === "mailingMethod" ? ["USPS deposit","Business collection"]
                  :key === "method" && action === "serve"
                    ? options.method.filter(method=>["summons","small-claims"].includes(c.workflowId)
                      ? method!=="First-class mail"
                      : method!=="Substituted service")
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
                const draftContext=action==="generate_return_draft" ? (()=>{
                  const service=c.service||{};
                  const facts=[
                    ["Official form",c.workflowId==="summons"?"POS-010":c.workflowId==="small-claims"?"SC-104":c.service?.method==="First-class mail"?"POS-030":"POS-020 / POS-040"],
                    ["Case number",r.caseNumber],["Court",r.courtOfOrigin],
                    ["Plaintiff",r.plaintiff],["Defendant",r.defendant],
                    ["Recipient",service.recipient],["Date served",service.date],
                    ["Time served",service.time],["Location",service.address],
                    ["Service method",service.method]
                  ];
                  return '<div class="ca-return-review"><div class="ca-return-review-top"><strong>Unsigned court-form draft</strong><span>Review before generating</span></div>'+
                    '<p>SonoMarzi will populate the official court template using recorded facts. The draft is NOT signed, certified or filed. Review the finished PDF carefully and upload a properly completed signed return.</p>'+
                    '<div class="ca-return-facts">'+facts.map(([name,value])=>'<div><small>'+esc(name)+'</small><strong>'+esc(value||"Not recorded")+'</strong></div>').join("")+'</div>'+
                    '<div class="ca-return-check ca-return-warn">The server must verify personal knowledge, legal capacity, proof-of-service details and signature before this is used in court.</div>'+
                    '<label class="ca-draft-confirm"><input type="checkbox" name="reviewConfirmed" value="yes" required> I understand this creates an unsigned draft that requires review and signing.</label></div>';
                })() : "";
                const returnActions=["prepare_return","review_return","record_return"];
                const returnContext=returnActions.includes(action) ? (()=>{
                  const outcomes=[c.service,c.nonService].filter(Boolean);
                  const outcome=outcomes[0]||{};
                  const hasDocument=(c.documents||[]).some(d=>["Proof of service","Court return"].includes(d.kind));
                  const expected=context.workflows[c.workflowId]?.returns||[];
                  const facts=[
                    ["Case",r.caseNumber],["Court",r.courtOfOrigin],
                    ["Plaintiff",r.plaintiff],["Defendant",r.defendant],
                    ["Status",r.stage],["Assigned server",(context.people||[]).find(p=>p.person_id===r.assignedServerId)?.name||"Confirm assigned server"],
                    ["Service date",outcome.date||"Not recorded"],
                    ["Service address",outcome.address||(r.serviceAddresses||[])[0]?.address||"Confirm address"],
                    ["Service method",outcome.method||"Review service record"],
                    ["Return deadline",r.returnByDate||"Not recorded"]
                  ];
                  const safe=val=>esc(String(val??""));
                  return '<div class="ca-return-review"><div class="ca-return-review-top"><strong>Return preparation checklist</strong><span>Case facts · review required</span></div>'+
                    '<p>These facts come from the case record. Verify them against the actual service evidence and court instructions; this does not create or file a court form.</p>'+
                    '<div class="ca-return-facts">'+facts.map(([label,value])=>'<div><small>'+safe(label)+'</small><strong>'+safe(value)+'</strong></div>').join('')+'</div>'+
                    '<div class="ca-return-check '+(hasDocument?'ca-return-good':'ca-return-warn')+'">'+(hasDocument?'✓ Supporting proof/return uploaded':'! Upload the signed proof of service or court return in Documents before preparing the packet')+'</div>'+
                    '<div class="ca-return-foot">Expected return/template: '+safe(expected.join(" / ")||"Confirm with court")+'. The assigned reviewer must verify form version, service details and required signatures.</div></div>';
                })() : "";
                const actionFields = window.CaliforniaCivilView.fieldsForAction(
                  action,
                  r,
                  fields,
                );
                form(
                  labels[action],
                  draftContext + returnContext + actionFields
                    .map((spec) => {
                      const key = spec.split(":")[0];
                      let value =
                        key === "formName" && action === "prepare_return" && (context.workflows[c.workflowId]?.returns||[]).length===1
                          ? context.workflows[c.workflowId].returns[0]
                        : key === "returnByDate"
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
                    if(action==="generate_return_draft"){
                      if(payload.reviewConfirmed!=="yes")throw Error("Confirm that the generated court form will require review and signing.");
                      delete payload.reviewConfirmed;
                    }
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
                      // Store the unsigned working copy as a draft only. It must never
                      // satisfy the signed proof/return prerequisite for court review.
                      let archiveMessage="";
                      try {
                        const file=new File([bytes],result.draft.filename,{type:"application/pdf"});
                        const uploaded=await AWS_ATTACHMENTS.upload(file,{collection:"civil.papers",itemId:caseId});
                        const saved=await api("command",{
                          id:caseId,expectedVersion:result.version,command:"attach_document",
                          payload:{
                            name:result.draft.filename,key:uploaded.storageKey,
                            kind:"Unsigned return draft",
                            note:"Archived unsigned "+result.draft.formName+" working copy; SHA-256 "+result.draft.sha256
                          }
                        },scope);
                        const index=rows.findIndex(item=>item.record.id===caseId);
                        if(index>=0)rows[index]=saved;
                        draw();await detail(caseId);
                        archiveMessage=" An unsigned working copy was saved in Documents.";
                      } catch(saveError) {
                        archiveMessage=" The downloaded draft was not saved to the case: "+saveError.message+". Upload it manually if needed.";
                      }
                      status("Unsigned draft downloaded."+archiveMessage+" Review, sign, and attach the completed court form before preparing the return.");
                    }
                  },
                );
              } catch (e) {
                status(e.message);
              }
            }),
        );
        const documents = panel.querySelector("#ca-documents");
        const mayManage=!closed && !["Return Prepared","Reviewed","Returned to Court"].includes(r.stage) && can("civil_document_generate");
        const signedProofCount=c.documents.filter(d=>["Proof of service","Court return"].includes(d.kind)).length;
        const workingDraftCount=c.documents.filter(d=>d.kind==="Unsigned return draft").length;
        const proofProgress='<div class="ca-proof-progress"><div><strong>Signed court proof / return</strong><span class="'+(signedProofCount?"ca-proof-ready":"ca-proof-needed")+'">'+(signedProofCount?"Attached":"Still needed")+'</span></div>'+
          '<p>'+esc(signedProofCount?"A proof/return document is attached. An authorized reviewer must still verify its contents and signatures.":workingDraftCount?"You have an unsigned working draft. It does not count as completed proof; upload the signed, reviewed court form.":"Upload a completed, signed court proof or return before preparing the return packet.")+'</p></div>';
        documents.innerHTML = '<div class="ca-doc-head"><strong>Case documents</strong><span>'+c.documents.length+' active files</span></div>'+proofProgress+
          (c.documents.length ? '<div class="ca-doc-grid">'+c.documents.map(d=>
            '<article class="ca-doc-item"><div><strong>'+esc(d.name)+'</strong><small>'+esc(d.kind)+'</small></div><div class="ca-doc-tools"><button type="button" class="btn btn-outline" data-doc="'+esc(d.id)+'">Open</button>'+
            (mayManage?'<button type="button" class="btn btn-outline" data-replace-doc="'+esc(d.id)+'">Replace</button><button type="button" class="btn btn-outline" data-remove-doc="'+esc(d.id)+'">Remove</button>':'')+'</div></article>'
          ).join('')+'</div>' : '<p class="ca-doc-empty">No documents attached to this case yet.</p>') +
          (mayManage?'<button class="btn btn-primary" id="ca-upload" type="button">+ Add document</button>':'');
        documents.querySelectorAll("[data-doc]").forEach(b=>b.onclick=()=>{
          const doc=c.documents.find(d=>d.id===b.dataset.doc);
          if(doc)AWS_ATTACHMENTS.download({storageKey:doc.key}).catch(e=>status(e.message));
        });
        documents.querySelectorAll("[data-replace-doc]").forEach(b=>b.onclick=()=>{
          const doc=c.documents.find(d=>d.id===b.dataset.replaceDoc);
          if(!doc)return;
          form("Replace case document",'<p>Upload a replacement for <strong>'+esc(doc.name)+'</strong>. The earlier version stays in the audit record. Replacing an intake document may require renewed approval.</p><label class="form-row ca-upload-field">Replacement file<span class="ca-upload-drop"><span class="ca-upload-icon" aria-hidden="true">↑</span><strong>Choose replacement</strong><span class="ca-upload-hint">Maximum 500 MB</span><span class="ca-upload-filename" aria-live="polite">No file selected</span><input name="file" type="file" required aria-label="Choose replacement document"></span></label><label class="form-row">Reason for replacement<input name="note" required placeholder="Why is this document being replaced?"></label>',async data=>{
            const file=data.get("file");
            if(!file?.size)throw Error("Choose a replacement file.");
            const meta=await AWS_ATTACHMENTS.upload(file,{collection:"civil.papers",itemId:caseId});
            await command("replace_document",{documentId:doc.id,name:file.name,key:meta.storageKey,note:String(data.get("note")||"").trim()});
          });
        });
        documents.querySelectorAll("[data-remove-doc]").forEach(b=>b.onclick=()=>{
          const doc=c.documents.find(d=>d.id===b.dataset.removeDoc);
          if(!doc)return;
          form("Remove case document",'<p>Remove <strong>'+esc(doc.name)+'</strong> from the active case? The action will be recorded in history.</p><label class="form-row">Reason for removal<input name="note" required maxlength="3000" placeholder="Explain why this document is being removed"></label>',async data=>{
            await command("remove_document",{documentId:doc.id,note:String(data.get("note")||"").trim()});
          });
        });
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
              "Unsigned return draft",
              "Fee authority",
              "Other",
            ]) +
              '<label class="form-row ca-upload-field">Document<span class="ca-upload-drop"><span class="ca-upload-icon" aria-hidden="true">↑</span><strong>Choose a file to upload</strong><span class="ca-upload-hint">PDF, image or other supported file · Up to 500 MB</span><span class="ca-upload-filename" aria-live="polite">No file selected</span><input name="file" type="file" required aria-label="Choose case document"></span></label>' +
              '<label class="form-row">Note <small>(optional)</small><input name="note" placeholder="Additional context for the record"></label>',
            async (data) => {
              if (!data.get("kind"))
                throw Error("Choose a document kind.");
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
                note: String(data.get("note") || "").trim() || "Document uploaded: " + file.name,
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
      ".view.active #ca-form form, .view.active #ca-detail .ca-workspace-heading, .view.active #ca-readiness form",
    );
  return { route, hasOpenWork, mountReadiness, context: () => api("context") };
})();

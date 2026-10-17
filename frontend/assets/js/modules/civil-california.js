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
      if (token !== generation) return true;
      if (context.profile.profileId !== "US-CA") return false;
      const can = (a) => context.admin || context.abilities.includes(a);
      let selection = 0;
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
      root.innerHTML = `<div class="panel"><div class="panel-head"><h3>California Civil Process</h3></div><div class="panel-body"><p>${esc(context.profile.county || "California")} · ${context.profile.status === "test" ? "Fictional testing workspace" : "Agency workspace"}</p><p id="ca-status" role="status"></p><div class="toolbar"><button class="btn btn-outline" id="ca-refresh">Refresh</button> ${can("civil_paper_intake") ? '<button class="btn btn-primary" id="ca-new">New case</button>' : ""} ${report && can("civil_reports_export") ? '<button class="btn btn-outline" id="ca-export">Export CSV</button>' : ""}</div><label class="form-row">Search cases<input id="ca-search" placeholder="Case, party, address, stage or due date"></label>${report ? '<div id="ca-report"></div>' : ""}<div id="ca-list"></div><div id="ca-detail"></div><div id="ca-form"></div></div></div>`;
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
        root.querySelector("#ca-list").innerHTML =
          `<table class="data-table"><thead><tr><th>Case</th><th>Type</th><th>Defendant</th><th>Status</th><th>Return due</th></tr></thead><tbody>${selected.map((x) => `<tr><td><button class="btn btn-outline" data-case="${esc(x.record.id)}">${esc(x.record.caseNumber)}</button></td><td>${esc(x.record.paperType)}</td><td>${esc(x.record.defendant)}</td><td>${esc(x.record.stage)}</td><td>${esc(x.record.returnByDate || "Review pending")}</td></tr>`).join("")}</tbody></table>${!selected.length ? "<p>No matching cases.</p>" : ""}<p>${rows.length} accessible cases loaded.${nextCursor ? " More cases are available." : ""}</p>${nextCursor ? '<button class="btn btn-outline" id="ca-more">Load more cases</button>' : ""}`;
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
        root
          .querySelectorAll("[data-case]")
          .forEach(
            (b) =>
              (b.onclick = () =>
                detail(b.dataset.case).catch((e) => status(e.message))),
          );
      };
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
        target.innerHTML = `<form><h3>${esc(title)}</h3>${html}<p role="alert"></p><button class="btn btn-primary" type="submit">Save</button> <button class="btn btn-outline" type="button" id="ca-cancel-form">Cancel</button></form>`;
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
              .map((s) => input(s))
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
        panel.innerHTML = `<hr><h3>${esc(r.caseNumber)} · ${esc(r.stage)}</h3><p>${esc(r.plaintiff)} / ${esc(r.defendant)} · ${esc(r.courtOfOrigin)}</p><p>Case balance: ${money(balance(r))}. Released funds: ${money(current.availableCents ?? balance(r))}. Court return: ${esc(r.returnByDate || "Pending review")}.</p><p>Required packet review: ${esc(context.workflows[c.workflowId].forms.join(", "))}. Return form: ${esc(context.workflows[c.workflowId].returns.join(", "))}.</p><p>Dates and fee amounts must come from the reviewed court packet and agency authority.</p><div id="ca-actions"></div><h4>Documents</h4><div id="ca-documents"></div><h4>Deadlines and notices</h4><p>${(c.deadlines || []).filter((d) => !d.completedAt).length} open deadlines</p><details><summary>Tracked deadlines and delivered notices</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify({ deadlines: c.deadlines || [], notices: c.notices || [] }, null, 2))}</pre></details><h4>Case record</h4><details><summary>Intake, service and enforcement</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify({ intake: c.intakeDetails, assignedServerId: r.assignedServerId, attempts: r.attempts, service: c.service, return: c.returnPacket, enforcement: c.enforcement }, null, 2))}</pre></details><details><summary>Claims and stays</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify(c.holds, null, 2))}</pre></details><details><summary>Ledger and disbursements</summary><pre style="white-space:pre-wrap">${esc(JSON.stringify({ ledger: c.ledger, disbursements: c.disbursements, reconciliation: c.reconciliation }, null, 2))}</pre></details><details><summary>History</summary>${c.history.map((h) => `<p>${esc(h.at)} · ${esc(h.command)} · ${esc(h.actor)} · ${esc(h.note)}</p>`).join("")}</details>`;
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
              ...(context.workflows[c.workflowId].writ
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
                if (action === "assign")
                  roster = (await api("roster", {}, scope)).people.map((p) => [
                    p.person_id,
                    p.name || p.email,
                  ]);
                const choice = (key) =>
                  key === "smallClaimsDocument"
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
                form(
                  labels[action],
                  fields[action]
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
          (!closed && can("civil_document_generate")
            ? '<button class="btn btn-primary" id="ca-upload">Upload document</button>'
            : "");
        documents
          .querySelectorAll("[data-doc]")
          .forEach(
            (b) =>
              (b.onclick = () =>
                AWS_ATTACHMENTS.download({
                  storageKey: c.documents.find((d) => d.id === b.dataset.doc)
                    .key,
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

/* Readable case presentation and workflow-specific form selection. */
window.CaliforniaCivilView = (() => {
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
  const money = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format((value || 0) / 100);
  const date = (value) => {
    if (!value) return "Not recorded";
    const parsed = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T12:00:00Z" : value,
    );
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
  };
  const instant = (value) =>
    value && Number.isFinite(new Date(value).getTime())
      ? new Date(value).toLocaleString("en-US", {
          timeZone: "America/Los_Angeles",
        })
      : "Not recorded";
  function table(headings, rows, empty) {
    if (!rows.length) return `<p class="muted">${esc(empty)}</p>`;
    return `<div style="overflow-x:auto"><table class="data-table"><thead><tr>${headings.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const section = (title, html, open = false) =>
    `<details ${open ? "open" : ""}><summary>${esc(title)}</summary>${html}</details>`;
  const facts = (entries) =>
    table(
      ["Detail", "Recorded value"],
      entries.filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      ),
      "No details recorded.",
    );
  const nextSteps = {
    Intake:
      "Review intake details and attach the court packet and signed instructions, then approve intake.",
    Ready: "Assign an agency server to begin service.",
    Assigned: "Log service attempts or record the service outcome.",
    Attempting:
      "Continue attempts, record successful service, or document an unserved return.",
    Served:
      "Complete the appropriate proof of service, attach the finished document, and prepare the court return.",
    "Unable to Serve":
      "Attach the completed non-service return and prepare it for supervisor review.",
    "Return Prepared":
      "A different supervisor reviews the service evidence and prepared return.",
    Reviewed:
      "Record delivery to the court and its receipt or transmission reference.",
    "Returned to Court":
      "Resolve remaining claims, deadlines and case funds, reconcile the ledger, then close the case.",
    Closed:
      "The case is closed. Documents, accounting and history remain available for review.",
    Cancelled:
      "The case is cancelled. Documents, accounting and history remain available for review.",
  };
  function renderCase(record, context, current, actionLabels = {}) {
    const r = record,
      c = r.california,
      people = context.people || [];
    const person = (id) =>
      people.find((p) => (p.id === id || p.person_id === id) && p.name)?.name ||
      (id ? "Assigned staff member" : "Unassigned");
    const actor = (id) => {
      const event = c.history.find((h) => h.actor === id && h.personId);
      return event ? person(event.personId) : "Staff member";
    };
    const workflow = context.workflows[c.workflowId];
    const balance = c.ledger.reduce(
      (n, e) => n + (e.direction === "in" ? e.amountCents : -e.amountCents),
      0,
    );
    let running = 0;
    const ledger = c.ledger.map((e) => {
      running += e.direction === "in" ? e.amountCents : -e.amountCents;
      return [
        date(e.accountingDate || e.at),
        e.kind,
        e.direction === "in" ? money(e.amountCents) : "",
        e.direction === "out" ? money(e.amountCents) : "",
        money(running),
        e.party || "",
        e.reference,
        date(e.availableOn),
      ];
    });
    const intakeLabels = {
      instructionsReference: "Signed instructions",
      deadlineAuthority: "Deadline authority",
      formReviewReference: "Packet review",
      issuedDate: "Writ issued",
      writExpirationDate: "Writ expiration",
      employerName: "Employer",
      propertyDescription: "Property",
      financialInstitution: "Financial institution",
      hearingDate: "Hearing date",
      hearingTime: "Hearing time",
      department: "Court department",
    };
    const intake = Object.entries(c.intakeDetails)
      .filter(
        ([k, value]) => k !== "reviewedForms" && value !== "" && value != null,
      )
      .map(([key, value]) => [
        intakeLabels[key] || key,
        /Date$/.test(key) ? date(value) : value,
      ]);
    if (c.intakeDetails.reviewedForms?.length)
      intake.push(["Forms reviewed", c.intakeDetails.reviewedForms.join(", ")]);
    const service = c.service
      ? facts([
          ["Method", c.service.method],
          ["Service date", date(c.service.date)],
          ["Time", c.service.time],
          ["Recipient", c.service.recipient],
          ["Address", c.service.address],
          ["Server", person(c.service.personId)],
          ["Recipient relationship", c.service.recipientRelationship],
          ["Diligence reference", c.service.diligenceReference],
          [
            "Mailing date",
            c.service.mailingDate ? date(c.service.mailingDate) : "",
          ],
          ["Mailing address", c.service.mailingAddress],
          ["Court order", c.service.courtOrderReference],
          ["Method details", c.service.methodDescription],
          ["Notes", c.service.note],
        ])
      : `<p>${esc(c.nonService?.reason || "Service has not been recorded.")}</p>`;
    const courtReturn = c.returnPacket
      ? facts([
          ["Form", c.returnPacket.formName],
          ["Reference", c.returnPacket.reference],
          ["Prepared by", actor(c.returnPacket.preparedBy)],
          [
            "Reviewed by",
            c.returnPacket.reviewedBy
              ? actor(c.returnPacket.reviewedBy)
              : "Awaiting independent review",
          ],
          ["Review reference", c.returnPacket.reviewReference],
          [
            "Delivered to court",
            c.returnPacket.returnedAt
              ? date(c.returnPacket.returnedAt)
              : "Not yet recorded",
          ],
          ["Court receipt", c.returnPacket.receiptReference],
        ])
      : "<p>No court return prepared.</p>";
    const stages=["Intake","Ready","Assigned","Attempting","Served","Return Prepared","Reviewed","Returned to Court","Closed"];
    const at=stages.indexOf(r.stage);
    const progress=stages.map((step,i)=>'<div class="ca-progress-step" data-complete="'+(at>=i&&at>=0)+'" data-current="'+(r.stage===step)+'"><span class="ca-progress-dot"></span><small>'+esc(step)+'</small></div>').join("");
    return `<header class="ca-workspace-heading"><div><div class="ca-workspace-kicker">Civil case workspace</div><h2>${esc(r.caseNumber)}</h2><p>${esc(workflow.label)} · ${esc(r.courtOfOrigin)}</p></div><span class="ca-status-pill" data-stage="${esc(r.stage)}">${esc(r.stage)}</span></header>
      <div class="ca-case-summary">
        <div><small>Parties</small><strong>${esc(r.plaintiff)} / ${esc(r.defendant)}</strong></div>
        <div><small>Assigned server</small><strong>${esc(person(r.assignedServerId))}</strong></div>
        <div><small>Return due</small><strong>${esc(r.returnByDate ? date(r.returnByDate) : "Pending review")}</strong></div>
        <div><small>Case balance</small><strong>${money(balance)}</strong></div>
        <div><small>Released funds</small><strong>${money(current.availableCents ?? balance)}</strong></div>
        <div><small>Open claims / stays</small><strong>${c.holds.filter(h=>!h.resolvedAt).length}</strong></div>
      </div>
      <section class="ca-progress"><div class="ca-progress-title"><h4>Case progress</h4><span>${esc(r.stage)}</span></div><div class="ca-progress-track">${progress}</div></section>
      <div class="panel ca-next-step"><div class="panel-body"><div class="ca-next-heading"><h4>Recommended next step</h4><span>Guided workflow</span></div><p>${esc(nextSteps[r.stage] || "Review the case record.")}</p></div></div>
      <p class="ca-form-reference">Packet forms: ${esc(workflow.forms.join(", "))}. Return: ${esc(workflow.returns.join(", "))}.</p><div id="ca-actions"></div>
      <h4>Documents</h4><div id="ca-documents"></div><h4>Case record</h4>
      ${section(
        "Intake and service addresses",
        facts([
          ["Received", date(r.receivedDate)],
          ["Workflow", workflow.label],
          ...intake,
        ]) +
          table(
            ["Service address"],
            (r.serviceAddresses || []).map((a) => [a.address]),
            "No service addresses recorded.",
          ),
      )}
      ${section(
        "Service attempts",
        table(
          ["Date", "Time", "Result", "Server", "Notes"],
          r.attempts.map((a) => [
            date(a.date),
            a.time,
            a.result,
            person(a.deputyId),
            a.notes,
          ]),
          "No attempts recorded.",
        ),
      )}
      ${section("Service outcome and court return", service + courtReturn)}
      ${section(
        "Deadlines and delivered notices",
        table(
          ["Deadline", "Type", "Due", "Status", "Authority / completion"],
          (c.deadlines || []).map((d) => [
            d.title,
            d.kind,
            date(d.dueDate),
            d.completedAt ? "Completed" : "Open",
            d.completedAt ? d.completionReference : d.authorityReference,
          ]),
          "No deadlines tracked.",
        ) +
          table(
            [
              "Notice",
              "Recipient",
              "Delivery",
              "Date",
              "Document",
              "Authority",
            ],
            (c.notices || []).map((n) => [
              n.title,
              n.recipient,
              n.method,
              date(n.date),
              c.documents.find((d) => d.id === n.documentId)?.name ||
                "Attached evidence",
              n.authorityReference,
            ]),
            "No notices recorded.",
          ),
      )}
      ${section(
        "Enforcement actions",
        table(
          ["Date", "Action", "Description", "Authority", "Approval"],
          c.enforcement.map((e) => [
            date(e.date),
            e.kind,
            e.description,
            e.authorityReference,
            e.approvalReference,
          ]),
          "No enforcement actions recorded.",
        ),
      )}
      ${section(
        "Claims and stays",
        table(
          ["Type", "Reference", "Status", "Recorded", "Resolution"],
          c.holds.map((h) => [
            h.kind,
            h.reference,
            h.resolvedAt ? "Resolved" : "Open",
            date(h.at),
            h.orderReference || h.note,
          ]),
          "No claims or stays recorded.",
        ),
      )}
      ${section(
        "Ledger and disbursements",
        table(
          [
            "Date",
            "Entry",
            "Received",
            "Paid",
            "Balance",
            "Party",
            "Reference",
            "Available on",
          ],
          ledger,
          "No accounting entries recorded.",
        ) +
          table(
            [
              "Payee",
              "Amount",
              "Status",
              "Requested by",
              "Approved by",
              "Payment reference",
            ],
            c.disbursements.map((d) => [
              d.payee,
              money(d.amountCents),
              d.status,
              actor(d.requestedBy),
              d.approvedBy ? actor(d.approvedBy) : "Awaiting approval",
              d.paymentReference || d.reference,
            ]),
            "No disbursements recorded.",
          ) +
          (c.reconciliation
            ? facts([
                ["Last reconciliation", date(c.reconciliation.at)],
                ["Verified balance", money(c.reconciliation.balanceCents)],
                ["Reference", c.reconciliation.reference],
                ["Ledger entries verified", c.reconciliation.ledgerCount],
              ])
            : "<p>Ledger reconciliation has not been recorded.</p>"),
      )}
      ${section(
        "Court-form drafts",
        table(
          ["Form", "Generated", "Prepared by", "Status"],
          (c.draftReturns || []).map((d) => [
            d.formName,
            date(d.at),
            actor(d.by),
            "Unsigned draft",
          ]),
          "No court-form drafts generated.",
        ),
      )}
      ${section(
        "History",
        table(
          [
            "Date and time (Pacific)",
            "Action",
            "Staff member",
            "Status change",
            "Notes",
          ],
          c.history.map((h) => [
            instant(h.at),
            actionLabels[h.command] ||
              (h.command === "create" ? "Case intake" : h.command),
            person(h.personId),
            [h.fromStage, h.toStage].filter(Boolean).join(" → "),
            h.note,
          ]),
          "No history recorded.",
        ),
      )}`;
  }
  function fieldsForAction(action, record, definitions) {
    const workflow = record.california.workflowId;
    let result = [...definitions[action]];
    if (action === "intake_details") {
      const common = [
        "returnByDate",
        "instructionsReference",
        "deadlineAuthority",
        "formReviewReference",
        "reviewedForms",
      ];
      const writ = [
        "earnings-withholding",
        "writ-execution",
        "bank-levy",
        "possession",
        "personal-property-levy",
        "real-property-levy",
        "sheriff-sale",
      ].includes(workflow);
      if (writ) common.push("issuedDate", "writExpirationDate");
      if (workflow === "earnings-withholding") common.push("employerName");
      if (
        [
          "possession",
          "personal-property-levy",
          "real-property-levy",
          "sheriff-sale",
          "writ-execution",
        ].includes(workflow)
      )
        common.push("propertyDescription");
      if (workflow === "bank-levy") common.push("financialInstitution");
      if (["small-claims", "subpoena", "restraining-order"].includes(workflow))
        common.push("hearingDate", "hearingTime", "department");
      result = result.filter((spec) => common.includes(spec.split(":")[0]));
    }
    if (action === "generate_return_draft")
      result = result.filter((spec) =>
        workflow === "small-claims"
          ? [
              "serverName",
              "serverAddress",
              "serverPhone",
              "smallClaimsDocument",
            ].includes(spec)
          : spec !== "smallClaimsDocument",
      );
    return result;
  }
  function bindServiceFields(form) {
    const method = form.querySelector('[name="method"]');
    if (!method || !form.querySelector('[name="diligenceReference"]')) return;
    const substituted = [
      "recipientRelationship",
      "diligenceReference",
      "mailingDate",
      "mailingAddress",
    ];
    const alternative = ["courtOrderReference", "methodDescription"];
    const update = () => {
      for (const field of [...substituted, ...alternative]) {
        const input = form.querySelector(`[name="${field}"]`);
        const visible =
          method.value === "Substituted service"
            ? substituted.includes(field)
            : method.value === "Court-authorized alternative" &&
              alternative.includes(field);
        input.closest("label").hidden = !visible;
        input.disabled = !visible;
      }
    };
    method.addEventListener("change", update);
    update();
  }
  return { renderCase, fieldsForAction, bindServiceFields };
})();

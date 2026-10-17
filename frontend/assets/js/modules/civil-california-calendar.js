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
      epoch = 0;
    root.innerHTML =
      '<h3>Court deadlines</h3><p>Court returns and open tracked deadlines across every case available to your role.</p><div class="toolbar"><button type="button" class="btn btn-outline" data-month="previous" aria-label="Previous month">Previous</button><input type="month" aria-label="Calendar month"><button type="button" class="btn btn-outline" data-month="next" aria-label="Next month">Next</button></div><div class="form-2col"><label class="form-row">From date<input type="date" name="calendarFrom"></label><label class="form-row">Through date<input type="date" name="calendarTo"></label></div><button type="button" class="btn btn-outline" data-calendar-update>Update calendar</button><p role="status"></p><div data-calendar-events></div>';
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
    const load = async () => {
      const current = ++epoch;
      status.textContent = "Loading deadlines...";
      try {
        const data = await request({ fromDate: from.value, toDate: to.value });
        if (current !== epoch) return;
        status.textContent = data.events.length + " open calendar items";
        results.innerHTML = data.events.length
          ? '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Date</th><th>Case</th><th>Deadline</th><th>Type</th><th>Case status</th><th>Authority</th></tr></thead><tbody>' +
            data.events
              .map(
                (e) =>
                  "<tr><td>" +
                  esc(e.date) +
                  '</td><td><button type="button" class="btn btn-outline" data-calendar-case="' +
                  esc(e.caseId) +
                  '">' +
                  esc(e.caseNumber) +
                  "</button></td><td>" +
                  esc(e.title) +
                  "</td><td>" +
                  esc(e.kind) +
                  "</td><td>" +
                  esc(e.stage) +
                  "</td><td>" +
                  esc(e.reference) +
                  "</td></tr>",
              )
              .join("") +
            "</tbody></table></div>"
          : "<p>No open court returns or tracked deadlines in this range.</p>";
        results
          .querySelectorAll("[data-calendar-case]")
          .forEach(
            (button) =>
              (button.onclick = () =>
                openCase(button.dataset.calendarCase).catch(onError)),
          );
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
          range();
          load();
        }),
    );
    monthInput.onchange = () => {
      if (!monthInput.value) return;
      month = monthInput.value;
      range();
      load();
    };
    root.querySelector("[data-calendar-update]").onclick = load;
    range();
    await load();
    return { refresh: load };
  }
  return { mount };
})();

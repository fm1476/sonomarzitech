import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CivilError } from "./civil-california-domain.mjs";
import {generateAdditionalCaliforniaPosDraft} from "./civil-california-pos-additional.mjs";
const templateUrls = {
  summons: new URL("../templates/civil/pos010.pdf", import.meta.url),
  "small-claims": new URL("../templates/civil/sc104.pdf", import.meta.url),
};
export async function generateCaliforniaReturnDraft(record, input) {
  if(["POS-020","POS-030","POS-040"].includes(input?.formCode))return generateAdditionalCaliforniaPosDraft(record,input);
  const c = record.california,
    service = c?.service,
    workflow = c?.workflowId;
  if (
    !templateUrls[workflow] ||
    service?.method !== "Personal service" ||
    record.stage !== "Served"
  )
    throw new CivilError(
      "Draft generation currently supports personally served summons and small-claims cases. Complete the appropriate official form for other service types.",
    );
  if (
    service.recipient.trim().toLowerCase() !==
    record.defendant.trim().toLowerCase()
  )
    throw new CivilError(
      "An agent/entity recipient requires the workflow-specific proof of service.",
    );
  for (const key of ["serverName", "serverAddress", "serverPhone"])
    if (
      typeof input[key] !== "string" ||
      !input[key].trim() ||
      input[key].length > 250
    )
      throw new CivilError(
        "Server name, address and phone are required for the draft.",
      );
  const bytes=await readFile(templateUrls[workflow]);
  const templateSha256=createHash("sha256").update(bytes).digest("hex");
  const manifest=JSON.parse(await readFile(new URL("../templates/civil/manifest.json",import.meta.url),"utf8"));
  const approved=manifest[workflow==="summons"?"pos010":"sc104"];
  if(!approved?.templateSha256||templateSha256!==approved.templateSha256)
    throw new CivilError("The approved California court PDF template changed. Draft generation is paused pending template review.",409);
  const pdf=await PDFDocument.load(bytes),
    form=pdf.getForm();
  // XFA can hide AcroForm values in some viewers. Keep one editable AcroForm.
  form.deleteXFA();
  const font = await pdf.embedFont(StandardFonts.Helvetica),
    fields = form.getFields();
  const find = (suffix) => {
    const matched = fields.filter((f) => f.getName().endsWith(suffix));
    if (matched.length !== 1)
      throw Error("Court template field mapping is ambiguous: " + suffix);
    return matched[0];
  };
  const set = (suffix, value) => {
    if (!value) return;
    const field = find(suffix),
      text = String(value);
    try {
      font.encodeText(text);
    } catch {
      throw new CivilError(
        "This draft contains characters the court template font cannot render. Complete and upload the official form.",
      );
    }
    const widget = field.acroField.getWidgets()[0],
      rect = widget.getRectangle(),
      size = 8,
      availableWidth = rect.width - 6,
      maxLines = Math.max(1, Math.floor((rect.height - 4) / 10));
    let lines = 1,
      width = 0;
    for (const word of text.split(/\s+/)) {
      const w = font.widthOfTextAtSize(word + " ", size);
      if (w > availableWidth)
        throw new CivilError(
          "A draft field is too long to fit the official form. Shorten it or complete the form manually.",
        );
      if (width + w > availableWidth) {
        lines++;
        width = w;
      } else width += w;
    }
    if (lines > maxLines)
      throw new CivilError(
        "A draft field is too long to fit the official form. Shorten it or complete the form manually.",
      );
    field.setFontSize(size);
    field.setText(text);
  };
  const check = (suffix) => {
    const field = find(suffix);
    field.check();
    field.updateAppearances();
  };
  const date = service.date
    .split("-")
    .slice(1)
    .concat(service.date.slice(0, 4))
    .join("/");
  if (workflow === "summons") {
    set("P1Caption[0].CaseNumber1[0].CaseNumber[0]", record.caseNumber);
    set("PxCaption[0].CaseNumber[0].CaseNumber[0]", record.caseNumber);
    for (const suffix of [
      "P1Caption[0].TitlePartyName[0].Party1[0]",
      "PxCaption[0].TitlePartyName[0].Party1[0]",
    ])
      set(suffix, record.plaintiff);
    for (const suffix of [
      "P1Caption[0].TitlePartyName[0].Party2[0]",
      "PxCaption[0].TitlePartyName[0].Party2[0]",
    ])
      set(suffix, record.defendant);
    set("CourtInfo[0].CrtCounty[0]", c.county);
    set("CourtInfo[0].CrtStreet[0]", input.courtStreet);
    set("CourtInfo[0].CrtCityZip[0]", input.courtCityZip);
    set("CourtInfo[0].CrtBranch[0]", input.courtBranch);
    set("AttyPartyInfo[0].TextField1[0]", input.attorneyPartyInfo);
    set("AttyPartyInfo[0].Phone[0]", input.attorneyPhone);
    set("AttyPartyInfo[0].Email[0]", input.attorneyEmail);
    check("List2[0].Lia[0].CheckBox1[0]");
    check("List2[0].Lib[0].CheckBox2[0]");
    set("List3[0].Lia[0].FillText1[0]", record.defendant);
    set("List4[0].item4[0].FillText18[0]", service.address);
    check("List5[0].Lia[0].Ch1[0]");
    set("SubLista[0].LI1[0].FillText20[0]", date);
    set("SubLista[0].LI2[0].FillText21[0]", service.time);
    // Capacity, registration/exemption, certification and signatures require review.
    set("List7[0].Lia[0].Field1[0]", input.serverName);
    set("List7[0].Lib[0].Field2[0]", input.serverAddress);
    set("List7[0].Lic[0].Field3[0]", input.serverPhone);
    set("Sign[0].SigName[0]", input.serverName);
  } else {
    const caseName = record.plaintiff + " v. " + record.defendant;
    set("RightCaption[0].CourtInfo[0]", record.courtOfOrigin);
    set("RightCaption[0].CaseNumber[0]", record.caseNumber);
    set("RightCaption[0].CaseName[0]", caseName);
    set("PxCaption[0].CaseNumber[0]", record.caseNumber);
    set("PxCaption[0].CaseName[0]", caseName);
    set("RightCaption[0].Hearindate[0]", c.intakeDetails.hearingDate);
    set("RightCaption[0].Time[0]", c.intakeDetails.hearingTime);
    set("RightCaption[0].Dept[0]", c.intakeDetails.department);
    set("List1[0].Lia[0].FullName[0]", record.defendant);
    if (!["SC-100", "SC-120"].includes(input.smallClaimsDocument))
      throw new CivilError("Identify whether SC-100 or SC-120 was served.");
    check(
      input.smallClaimsDocument === "SC-100"
        ? "List3[0].Lia[0].Filed_cb[0]"
        : "List3[0].Lib[0].AmFiling_cb[0]",
    );
    check("List4[0].Lia[0].Level31[0]");
    set("List4[0].Lia[0].HearingDate_dt1[0]", date);
    const [hours, minutes] = service.time.split(":").map(Number);
    set(
      "List4[0].Lia[0].HearingTime_dt1[0]",
      String(hours % 12 || 12) + ":" + String(minutes).padStart(2, "0"),
    );
    check(
      hours < 12
        ? "List4[0].Lia[0].TimeDef_cb[0]"
        : "List4[0].Lia[0].TimeDef_cb[1]",
    );
    set("List4[0].Lia[0].RestrainedStreet_ft2[0]", service.address);
    set("List5[0].item5[0].RestrainedFullName_ft4[0]", input.serverName);
    set("List5[0].item5[0].RestrainedAge_ft4[0]", input.serverPhone);
    set("List5[0].item5[0].RestrainedStreet_ft4[0]", input.serverAddress);
    set("List6[0].item6[0].SigName[0]", input.serverName);
  }
  form.updateFieldAppearances(font);
  for (const page of pdf.getPages()) {
    page.node.wrapContentStreams(
      pdf.context.register(pdf.context.flateStream("q\n")),
      pdf.context.register(pdf.context.flateStream("Q\n")),
    );
    page.drawText(
      "DRAFT - UNSIGNED - COMPLETE ALL REQUIRED ITEMS AND REVIEW BEFORE SIGNING",
      { x: 36, y: 781, size: 7, font, color: rgb(0.65, 0, 0) },
    );
  }
  const output = await pdf.save(),
    formName = workflow === "summons" ? "POS-010" : "SC-104";
  return {
    filename: formName + "-" + record.id + "-unsigned.pdf",
    formName,
    contentType: "application/pdf",
    base64: Buffer.from(output).toString("base64"),
    sha256: createHash("sha256").update(output).digest("hex"),
    templateSha256,
  };
}

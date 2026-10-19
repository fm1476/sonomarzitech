#!/usr/bin/env python3
"""Prepare reviewed, fillable, unencrypted copies of approved uploaded court PDFs.
Keep unchanged originals. This is a reproducible build artifact, not form approval.
"""
import hashlib,json,pathlib,sys
import fitz
root=pathlib.Path(__file__).resolve().parents[1]/"lambdas/api/templates/civil"
manifest_path=root/"enforcement-uploaded-manifest.json"
manifest=json.loads(manifest_path.read_text())
for code, name in [("EJ-130","ej130"),("EJ-150","ej150"),("WG-002","wg002"),("WG-005","wg005"),("WG-006","wg006")]:
    source=root/(name+".pdf")
    raw=source.read_bytes()
    expected=manifest[code]["templateSha256"]
    if hashlib.sha256(raw).hexdigest()!=expected:
        raise SystemExit(f"{code}: original template hash mismatch, refusing to normalize")
    with fitz.open(stream=raw,filetype="pdf") as doc:
        pages=doc.page_count
        fields=sum(len(list(p.widgets() or [])) for p in doc)
        if pages!=manifest[code]["pages"] or fields!=manifest[code]["fields"]:
            raise SystemExit(f"{code}: source pages/fields changed")
        dest=root/(name+"-normalized.pdf")
        doc.save(str(dest),encryption=fitz.PDF_ENCRYPT_NONE,garbage=3,deflate=True)
    with fitz.open(str(dest)) as check:
        if check.is_encrypted or check.page_count!=pages or sum(len(list(p.widgets() or [])) for p in check)!=fields:
            raise SystemExit(f"{code}: normalization lost page structure or fillable widgets")
    manifest[code]["normalizedSha256"]=hashlib.sha256(dest.read_bytes()).hexdigest()
    manifest[code]["normalizedFile"]=dest.name
    print(code,manifest[code]["normalizedSha256"])
manifest_path.write_text(json.dumps(manifest,indent=2)+"\n")

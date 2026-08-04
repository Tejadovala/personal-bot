"""
app.py
------
Flask web application for the Document Validation Tool.

Upload an image + XML file via the browser, run OCR validation,
and view a colour-coded report — all in one page.

Run:
    python app.py
Then open:  http://localhost:5000
"""

from __future__ import annotations

import os
import uuid
import json
import time
import threading
from pathlib import Path
from flask import Flask, request, jsonify, render_template_string, send_from_directory

# ── folder setup ──────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
UPLOAD_DIR  = BASE_DIR / "uploads"
REPORT_DIR  = BASE_DIR / "reports"
UPLOAD_DIR.mkdir(exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

ALLOWED_IMG = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}
ALLOWED_XML = {".xml"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB


# ── helpers ───────────────────────────────────────────────────────────────────

def _allowed(filename: str, allowed: set) -> bool:
    return Path(filename).suffix.lower() in allowed


def _run_validation(job_id: str, image_path: str, xml_path: str) -> None:
    """Run OCR + validation in a background thread and save JSON results."""
    result_file = REPORT_DIR / f"{job_id}.json"

    try:
        from ocr_engine import extract_text
        from checker import validate_all

        ocr_text, blocks, engine_used = extract_text(image_path)
        results = validate_all(xml_path, ocr_text, blocks)

        # Serialise results to JSON
        payload = []
        for rec in results:
            fields = []
            for fr in rec.field_results:
                if fr.has_issues:
                    fields.append({
                        "field":           fr.field_name,
                        "xml_value":       fr.xml_value,
                        "ocr_value":       fr.ocr_value,
                        "match_score":     fr.match_score,
                        "missing_letters": fr.missing_letters,
                        "missing_spaces":  len(fr.missing_spaces),
                        "missing_numbers": fr.missing_numbers,
                        "extra_chars":     fr.extra_chars,
                        "issues":          fr.issues,
                    })
            payload.append({
                "record_no":    rec.record_no,
                "remarks":      rec.remarks,
                "total_issues": rec.total_issues,
                "is_clean":     rec.is_clean,
                "fields":       fields,
            })

        result_file.write_text(
            json.dumps({"status": "done", "records": payload,
                        "engine": engine_used}),
            encoding="utf-8"
        )

    except Exception as exc:
        result_file.write_text(
            json.dumps({"status": "error", "message": str(exc)}),
            encoding="utf-8"
        )


# ── routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)


@app.route("/validate", methods=["POST"])
def validate():
    """Accept image + XML upload, start background validation, return job_id."""
    if "image" not in request.files or "xml" not in request.files:
        return jsonify({"error": "Both image and XML files are required."}), 400

    img_file = request.files["image"]
    xml_file = request.files["xml"]

    if not _allowed(img_file.filename, ALLOWED_IMG):
        return jsonify({"error": "Image must be JPG, PNG, TIFF or BMP."}), 400
    if not _allowed(xml_file.filename, ALLOWED_XML):
        return jsonify({"error": "Data file must be XML."}), 400

    job_id   = str(uuid.uuid4())[:8]
    img_ext  = Path(img_file.filename).suffix.lower()
    img_path = str(UPLOAD_DIR / f"{job_id}_image{img_ext}")
    xml_path = str(UPLOAD_DIR / f"{job_id}_data.xml")

    img_file.save(img_path)
    xml_file.save(xml_path)

    # Write "pending" marker
    (REPORT_DIR / f"{job_id}.json").write_text(
        json.dumps({"status": "pending"}), encoding="utf-8"
    )

    # Run validation in background thread
    t = threading.Thread(
        target=_run_validation, args=(job_id, img_path, xml_path), daemon=True
    )
    t.start()

    return jsonify({"job_id": job_id})


@app.route("/status/<job_id>")
def status(job_id: str):
    """Poll for job completion."""
    result_file = REPORT_DIR / f"{job_id}.json"
    if not result_file.exists():
        return jsonify({"status": "pending"})
    return jsonify(json.loads(result_file.read_text(encoding="utf-8")))


@app.route("/download_csv/<job_id>")
def download_csv(job_id: str):
    """Generate and download a CSV report for the given job."""
    import csv, io
    from flask import Response

    result_file = REPORT_DIR / f"{job_id}.json"
    if not result_file.exists():
        return "Report not ready", 404

    data = json.loads(result_file.read_text(encoding="utf-8"))
    if data.get("status") != "done":
        return "Report not ready", 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "RecordNo", "Field", "XML Value", "Image Shows",
        "Match Score %", "Missing Letters", "Missing Spaces",
        "Missing Numbers", "Extra Chars", "Issue Description"
    ])

    for rec in data.get("records", []):
        rec_no = rec["record_no"]
        if rec["is_clean"]:
            writer.writerow([rec_no, "—", "—", "—", "100", "", "", "", "", "Clean record"])
        else:
            for f in rec.get("fields", []):
                writer.writerow([
                    rec_no,
                    f["field"],
                    f["xml_value"],
                    f["ocr_value"] or "(not found)",
                    f"{round(f['match_score'] * 100)}",
                    ", ".join(f.get("missing_letters", [])),
                    str(f.get("missing_spaces", 0)),
                    ", ".join(f.get("missing_numbers", [])),
                    ", ".join(set(f.get("extra_chars", []))),
                    " | ".join(f.get("issues", [])),
                ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=validation_{job_id}.csv"}
    )


# ── HTML / CSS / JS (single-file SPA) ────────────────────────────────────────

HTML_PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Document Validation Tool</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --bg:       #080e1a;
  --surface:  #0f1e33;
  --card:     #152235;
  --border:   #1e3a5f;
  --accent:   #38bdf8;
  --accent2:  #818cf8;
  --green:    #4ade80;
  --red:      #f87171;
  --yellow:   #fbbf24;
  --muted:    #64748b;
  --text:     #e2e8f0;
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

/* ── Header ── */
header {
  background: linear-gradient(135deg, #0f1e33 0%, #080e1a 100%);
  border-bottom: 1px solid var(--border);
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
}
header .logo {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
}
header h1 { font-size: 1.15rem; font-weight: 700; color: var(--text); }
header p  { font-size: .8rem; color: var(--muted); margin-top: .1rem; }

/* ── Layout ── */
.container { max-width: 1100px; margin: 0 auto; padding: 2rem 1rem; }

/* ── Upload card ── */
.upload-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 8px 40px rgba(0,0,0,.35);
}
.upload-card h2 {
  font-size: 1.1rem; font-weight: 700;
  color: var(--accent);
  margin-bottom: 1.5rem;
  display: flex; align-items: center; gap: .6rem;
}

.drop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 14px;
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  transition: all .25s;
  position: relative;
  background: var(--card);
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .6rem;
}
.drop-zone:hover, .drop-zone.drag-over {
  border-color: var(--accent);
  background: rgba(56,189,248,.07);
  box-shadow: 0 0 0 3px rgba(56,189,248,.15);
}
.drop-zone.filled {
  border-color: var(--green);
  background: rgba(74,222,128,.06);
}
.drop-zone input[type=file] {
  position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
}
.drop-zone .icon { font-size: 2.2rem; }
.drop-zone .label { font-size: .9rem; font-weight: 600; color: var(--text); }
.drop-zone .sub   { font-size: .75rem; color: var(--muted); }
.drop-zone .filename {
  font-size: .8rem; color: var(--green); font-weight: 600;
  max-width: 180px; word-break: break-all; margin-top: .3rem;
}

/* ── Button ── */
.btn-run {
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: .03em;
  transition: opacity .2s, transform .15s;
  display: flex; align-items: center; justify-content: center; gap: .6rem;
}
.btn-run:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
.btn-run:disabled { opacity: .45; cursor: not-allowed; }

/* ── Progress ── */
#progress-section { display:none; text-align:center; padding: 2rem 0; }
.spinner {
  width: 52px; height: 52px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
#progress-msg { color: var(--muted); font-size: .9rem; }

/* ── Report ── */
#report-section { display: none; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,.25);
  transition: transform .15s;
}
.stat-box:hover { transform: translateY(-2px); }
.stat-box .num { font-size: 2.2rem; font-weight: 800; }
.stat-box .lbl { color: var(--muted); font-size: .78rem; margin-top: .2rem; }
.stat-total  .num { color: var(--accent); }
.stat-issues .num { color: var(--red); }
.stat-clean  .num { color: var(--green); }
.stat-fields .num { color: var(--yellow); }

.section-title {
  font-size: 1.05rem; font-weight: 700;
  color: var(--accent2);
  margin-bottom: 1.2rem;
  padding-bottom: .6rem;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: .5rem;
}

.record-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  margin-bottom: 1.25rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,.2);
  transition: transform .15s;
}
.record-card:hover { transform: translateY(-1px); }
.record-card.err  { border-left: 4px solid var(--red); }
.record-card.ok   { border-left: 4px solid var(--green); }

.rec-header {
  display: flex; align-items: center; gap: .9rem;
  padding: .9rem 1.4rem;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  user-select: none;
}
.rec-header .icon   { font-size: 1.1rem; }
.rec-header .rec-no { font-weight: 700; font-size: 1rem; }
.rec-header .badge  {
  margin-left: auto;
  background: rgba(0,0,0,.3);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: .2rem .75rem;
  font-size: .76rem;
  color: var(--muted);
}
.rec-header .chevron {
  font-size: .75rem; color: var(--muted);
  transition: transform .2s;
}
.rec-header.open .chevron { transform: rotate(180deg); }

.remarks-bar {
  padding: .55rem 1.4rem;
  background: rgba(147,197,253,.06);
  color: #93c5fd;
  font-size: .82rem;
  font-style: italic;
  border-bottom: 1px solid var(--border);
}

.fields-body {
  display: none;
  padding: 1.1rem 1.4rem;
  grid-template-columns: repeat(auto-fill, minmax(330px,1fr));
  gap: 1rem;
}
.fields-body.open { display: grid; }

.field-tile {
  background: var(--bg);
  border-radius: 10px;
  padding: .9rem 1rem;
  border: 1px solid var(--border);
}
.field-title {
  font-size: .72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .07em;
  color: var(--yellow);
  margin-bottom: .6rem;
}
.val-row { display:flex; gap:.6rem; align-items:baseline; margin-bottom:.35rem; }
.val-lbl { color: var(--muted); font-size: .73rem; min-width: 105px; flex-shrink:0; }
.val-xml { color: var(--green); font-family:monospace; font-size:.83rem; word-break:break-all; }
.val-ocr { color: var(--red);   font-family:monospace; font-size:.83rem; word-break:break-all; }
.val-score { font-weight:700; font-size:.83rem; }

.tags { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.6rem; }
.tag {
  padding: .2rem .65rem;
  border-radius: 20px;
  font-size: .71rem; font-weight: 600;
}
.tag-l { background:#fef3c7; color:#92400e; }
.tag-s { background:#dbeafe; color:#1e40af; }
.tag-n { background:#fce7f3; color:#9d174d; }
.tag-x { background:#f0fdf4; color:#166534; }

/* Issue description rows */
.issue-block {
  margin: .6rem 0 .4rem;
  display: flex; flex-direction: column; gap: .3rem;
}
.issue-row {
  display: flex; align-items: flex-start; gap: .45rem;
  background: rgba(251,191,36,.07);
  border-left: 3px solid #fbbf24;
  border-radius: 0 6px 6px 0;
  padding: .3rem .6rem;
}
.issue-icon { color: #fbbf24; font-size: .85rem; flex-shrink: 0; margin-top: 1px; }
.issue-text { color: #fde68a; font-size: .8rem; line-height: 1.4; }

/* ── Toast ── */
.toast {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  background: var(--red); color: #fff;
  padding: .75rem 1.25rem; border-radius: 10px;
  font-size: .88rem; font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,.4);
  display: none; z-index: 999;
  animation: slideUp .25s ease;
}
@keyframes slideUp { from { opacity:0; transform:translateY(10px); } }

/* Responsive */
@media (max-width: 640px) {
  .drop-grid    { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: repeat(2,1fr); }
}
</style>
</head>
<body>

<header>
  <div class="logo">📄</div>
  <div>
    <h1>Document Validation Tool</h1>
    <p>Upload image + XML → detect missing letters, spaces &amp; numbers</p>
  </div>
  <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:.3rem">
    <span style="background:#052e16;border:1px solid #166534;color:#4ade80;font-size:.72rem;font-weight:700;padding:.25rem .7rem;border-radius:20px;letter-spacing:.04em">
      🔒 100% LOCAL — No data sent anywhere
    </span>
    <span id="engineBadge" style="background:#0c1a2e;border:1px solid #1e3a5f;color:#38bdf8;font-size:.7rem;padding:.2rem .65rem;border-radius:20px;display:none"></span>
  </div>
</header>

<div class="container">

  <!-- Upload Card -->
  <div class="upload-card" id="upload-card">
    <h2>🔼 Upload Files</h2>

    <div class="drop-grid">
      <!-- Image drop zone -->
      <div class="drop-zone" id="imgZone">
        <input type="file" id="imgInput" accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp">
        <div class="icon">🖼️</div>
        <div class="label">Document Image</div>
        <div class="sub">JPG · PNG · TIFF · BMP</div>
        <div class="filename" id="imgName" style="display:none"></div>
      </div>

      <!-- XML drop zone -->
      <div class="drop-zone" id="xmlZone">
        <input type="file" id="xmlInput" accept=".xml">
        <div class="icon">📋</div>
        <div class="label">XML Data File</div>
        <div class="sub">XML with &lt;DataM&gt; records</div>
        <div class="filename" id="xmlName" style="display:none"></div>
      </div>
    </div>

    <button class="btn-run" id="runBtn" disabled onclick="runValidation()">
      🔍 Run Validation
    </button>
  </div>

  <!-- Progress -->
  <div id="progress-section">
    <div class="spinner"></div>
    <div id="progress-msg">Uploading files…</div>
  </div>

  <!-- Report -->
  <div id="report-section">
    <div class="summary-grid" id="summaryGrid"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.75rem">
      <div class="section-title" style="margin-bottom:0;border:none;padding:0">📋 Record Results</div>
      <div style="display:flex;gap:.75rem;align-items:center">
        <span id="engineInfo" style="color:#64748b;font-size:.8rem"></span>
        <button id="csvBtn" onclick="downloadCSV()"
          style="background:linear-gradient(135deg,#166534,#14532d);color:#4ade80;border:1px solid #166534;
                 border-radius:10px;padding:.5rem 1rem;font-size:.85rem;font-weight:700;cursor:pointer;
                 display:flex;align-items:center;gap:.4rem">
          ⬇ Download CSV
        </button>
      </div>
    </div>
    <div id="recordList"></div>
    <button class="btn-run" style="margin-top:1.5rem" onclick="resetTool()">
      🔄 Validate Another Document
    </button>
  </div>

</div>

<div class="toast" id="toast"></div>

<script>
// ── File pick / drag-drop ──────────────────────────────────────────────────
let imgFile = null, xmlFile = null, currentJobId = null;

function setupZone(zoneId, inputId, nameId, setter, allowedExts) {
  const zone  = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(nameId);

  input.addEventListener('change', () => {
    const f = input.files[0];
    if (f) handleFile(f);
  });

  zone.addEventListener('dragover', e => {
    e.preventDefault(); zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  function handleFile(f) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!allowedExts.includes(ext)) {
      showToast(`Wrong file type: .${ext}`); return;
    }
    setter(f);
    label.textContent = '✅ ' + f.name;
    label.style.display = 'block';
    zone.classList.add('filled');
    checkReady();
  }
}

setupZone('imgZone','imgInput','imgName', f => imgFile = f, ['jpg','jpeg','png','tiff','tif','bmp']);
setupZone('xmlZone','xmlInput','xmlName', f => xmlFile = f, ['xml']);

function checkReady() {
  document.getElementById('runBtn').disabled = !(imgFile && xmlFile);
}

// ── Run validation ─────────────────────────────────────────────────────────
function runValidation() {
  if (!imgFile || !xmlFile) return;

  document.getElementById('upload-card').style.display   = 'none';
  document.getElementById('progress-section').style.display = 'block';
  document.getElementById('report-section').style.display   = 'none';
  setMsg('Uploading files…');

  const fd = new FormData();
  fd.append('image', imgFile);
  fd.append('xml',   xmlFile);

  fetch('/validate', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(data => {
      if (data.error) { showToast(data.error); resetTool(); return; }
      currentJobId = data.job_id;
      setMsg('Running OCR on image…');
      pollStatus(data.job_id);
    })
    .catch(() => { showToast('Upload failed. Is the server running?'); resetTool(); });
}

function pollStatus(jobId) {
  fetch('/status/' + jobId)
    .then(r => r.json())
    .then(data => {
      if (data.status === 'pending') {
        setMsg('Analysing text with OCR… this may take 20–40 seconds.');
        setTimeout(() => pollStatus(jobId), 2000);
      } else if (data.status === 'done') {
        setMsg('Building report…');
        // Show engine badge — gold star for Surya, blue for others
        const eb = document.getElementById('engineBadge');
        if (data.engine) {
          const isSurya = data.engine.toLowerCase().includes('surya');
          eb.textContent = (isSurya ? '⭐ ' : '') + data.engine;
          eb.style.background = isSurya ? '#1c1000' : '#0c1a2e';
          eb.style.border = isSurya ? '1px solid #b45309' : '1px solid #1e3a5f';
          eb.style.color  = isSurya ? '#fbbf24' : '#38bdf8';
          eb.style.display = 'inline';
        }
        setTimeout(() => showReport(data.records, data.engine), 300);
      } else {
        showToast('Error: ' + (data.message || 'Unknown error'));
        resetTool();
      }
    })
    .catch(() => setTimeout(() => pollStatus(jobId), 3000));
}

// ── Render report ──────────────────────────────────────────────────────────
function showReport(records, engine) {
  document.getElementById('progress-section').style.display = 'none';
  document.getElementById('report-section').style.display   = 'block';
  const engineInfo = document.getElementById('engineInfo');
  if (engine) engineInfo.textContent = 'OCR Engine: ' + engine;

  const total      = records.length;
  const withIssues = records.filter(r => !r.is_clean).length;
  const clean      = total - withIssues;
  const totalFields= records.reduce((s,r) => s + r.total_issues, 0);

  document.getElementById('summaryGrid').innerHTML = `
    <div class="stat-box stat-total">
      <div class="num">${total}</div><div class="lbl">Total Records</div>
    </div>
    <div class="stat-box stat-issues">
      <div class="num">${withIssues}</div><div class="lbl">With Issues</div>
    </div>
    <div class="stat-box stat-clean">
      <div class="num">${clean}</div><div class="lbl">Clean</div>
    </div>
    <div class="stat-box stat-fields">
      <div class="num">${totalFields}</div><div class="lbl">Field Problems</div>
    </div>`;

  const list = document.getElementById('recordList');
  list.innerHTML = '';

  records.forEach((rec, idx) => {
    const cls  = rec.is_clean ? 'ok' : 'err';
    const icon = rec.is_clean ? '✅' : '❌';
    const lbl  = rec.is_clean ? 'No issues' : `${rec.total_issues} issue(s)`;

    let fieldsHtml = '';
    (rec.fields || []).forEach(f => {
      const scoreColor = f.match_score >= .85 ? '#4ade80'
                       : f.match_score >= .60 ? '#fbbf24' : '#f87171';

      // Badges
      let tags = '';
      if (f.missing_letters?.length)
        tags += `<span class="tag tag-l">Missing Letters: ${f.missing_letters.join(', ')}</span>`;
      if (f.missing_spaces > 0)
        tags += `<span class="tag tag-s">Missing Spaces: ${f.missing_spaces}</span>`;
      if (f.missing_numbers?.length)
        tags += `<span class="tag tag-n">Missing Numbers: ${f.missing_numbers.join(', ')}</span>`;
      if (f.extra_chars?.length) {
        const uniq = [...new Set(f.extra_chars)].join(', ');
        tags += `<span class="tag tag-x">Extra Chars: ${uniq}</span>`;
      }

      // Issue descriptions (precise, like Claude report)
      let issueHtml = '';
      if (f.issues?.length) {
        issueHtml = f.issues.map(i =>
          `<div class="issue-row"><span class="issue-icon">⚠</span><span class="issue-text">${esc(i)}</span></div>`
        ).join('');
      }

      const ocrDisplay = f.ocr_value ? esc(f.ocr_value) : '<em style="color:#475569">(not found in image)</em>';

      fieldsHtml += `
        <div class="field-tile">
          <div class="field-title">${f.field}</div>
          <div class="val-row">
            <span class="val-lbl">XML Value</span>
            <span class="val-xml">${esc(f.xml_value)}</span>
          </div>
          <div class="val-row">
            <span class="val-lbl">Image Shows</span>
            <span class="val-ocr">${ocrDisplay}</span>
          </div>
          <div class="val-row">
            <span class="val-lbl">Match Score</span>
            <span class="val-score" style="color:${scoreColor}">
              ${Math.round(f.match_score * 100)}%
            </span>
          </div>
          ${issueHtml ? `<div class="issue-block">${issueHtml}</div>` : ''}
          <div class="tags">${tags}</div>
        </div>`;
    });

    const remarksHtml = rec.remarks
      ? `<div class="remarks-bar">📝 ${esc(rec.remarks)}</div>` : '';

    const card = document.createElement('div');
    card.className = `record-card ${cls}`;
    card.id = `rec-${idx}`;
    card.innerHTML = `
      <div class="rec-header" onclick="toggleRecord(${idx})">
        <span class="icon">${icon}</span>
        <span class="rec-no">Record #${rec.record_no}</span>
        <span class="badge">${lbl}</span>
        <span class="chevron">▼</span>
      </div>
      ${remarksHtml}
      <div class="fields-body ${rec.is_clean ? '' : 'open'}" id="body-${idx}">
        ${fieldsHtml || '<div style="color:var(--green);padding:.5rem 0">All fields matched OCR output ✅</div>'}
      </div>`;
    list.appendChild(card);

    // Update header open state
    if (!rec.is_clean) {
      card.querySelector('.rec-header').classList.add('open');
    }
  });
}

function toggleRecord(idx) {
  const header = document.querySelector(`#rec-${idx} .rec-header`);
  const body   = document.getElementById(`body-${idx}`);
  header.classList.toggle('open');
  body.classList.toggle('open');
}

// ── Utilities ──────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function setMsg(msg) {
  document.getElementById('progress-msg').textContent = msg;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 4000);
}
function downloadCSV() {
  if (!currentJobId) return;
  window.location.href = '/download_csv/' + currentJobId;
}
function resetTool() {
  imgFile = null; xmlFile = null; currentJobId = null;
  document.getElementById('upload-card').style.display   = 'block';
  document.getElementById('progress-section').style.display = 'none';
  document.getElementById('report-section').style.display   = 'none';
  document.getElementById('runBtn').disabled = true;
  document.getElementById('engineBadge').style.display = 'none';
  ['imgZone','xmlZone'].forEach(id => {
    document.getElementById(id).classList.remove('filled','drag-over');
  });
  document.getElementById('imgName').style.display = 'none';
  document.getElementById('xmlName').style.display = 'none';
  document.getElementById('imgInput').value = '';
  document.getElementById('xmlInput').value = '';
}
</script>
</body>
</html>"""

# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    print("\n[*] Document Validation Tool (Waitress WSGI Production Server)")
    print("="*60)
    print("   Open your browser at:  http://localhost:5000")
    print("   Press Ctrl+C to stop.\n")
    
    from waitress import serve
    serve(app, host="127.0.0.1", port=5000, threads=6)


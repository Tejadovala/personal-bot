"""
report.py
---------
Generates validation output in two formats:
  1. Rich terminal output (colour-coded table per record)
  2. Self-contained HTML file with dark-theme styling
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import List

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
from rich.text import Text

from checker import RecordResult, FieldResult

console = Console()


# ═══════════════════════════════════════════════════════════════════════════
# Console report
# ═══════════════════════════════════════════════════════════════════════════

def print_console_report(results: List[RecordResult]) -> None:
    """Print a rich, colour-coded validation report to the terminal."""

    total          = len(results)
    with_issues    = sum(1 for r in results if not r.is_clean)
    clean          = total - with_issues
    total_problems = sum(r.total_issues for r in results)

    # ── Header ──────────────────────────────────────────────────────────────
    console.print()
    console.print(
        Panel.fit(
            "[bold cyan]📄  Document Validation Report[/bold cyan]\n"
            f"[dim]Generated : {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}[/dim]",
            border_style="cyan",
        )
    )

    # ── Summary stats ───────────────────────────────────────────────────────
    summary = Table(box=box.ROUNDED, border_style="dim", show_header=False)
    summary.add_column("Metric", style="bold", min_width=22)
    summary.add_column("Value")
    summary.add_row("Total Records",        f"[cyan]{total}[/cyan]")
    summary.add_row("Records with Issues",  f"[red]{with_issues}[/red]")
    summary.add_row("Clean Records",        f"[green]{clean}[/green]")
    summary.add_row("Total Field Problems", f"[yellow]{total_problems}[/yellow]")
    console.print(summary)
    console.print()

    # ── Per-record ───────────────────────────────────────────────────────────
    for result in results:
        if result.is_clean:
            console.print(
                f"[green]✅  Record {result.record_no}[/green] — all fields match OCR"
            )
            continue

        console.print(
            Panel(
                f"[bold red]❌  Record {result.record_no}[/bold red]"
                f"  —  [yellow]{result.total_issues}[/yellow] field(s) with issues\n"
                f"[dim italic]Remarks: {result.remarks or 'N/A'}[/dim italic]",
                border_style="red",
            )
        )

        for fr in result.fields_with_issues:
            tbl = Table(
                title=fr.field_name,
                title_style="bold yellow",
                box=box.SIMPLE_HEAD,
                show_header=False,
                padding=(0, 1),
            )
            tbl.add_column("Label",  style="dim",   min_width=18)
            tbl.add_column("Value",  no_wrap=False)

            tbl.add_row(
                "Expected (XML)",
                Text(fr.xml_value, style="green"),
            )
            tbl.add_row(
                "Found (OCR)",
                Text(fr.ocr_value or "(not found)", style="red"),
            )
            tbl.add_row(
                "Match Score",
                f"[{'green' if fr.match_score >= 0.85 else 'yellow' if fr.match_score >= 0.6 else 'red'}]"
                f"{fr.match_score:.0%}[/]",
            )

            if fr.missing_letters:
                tbl.add_row(
                    "⚠  Missing Letters",
                    "[yellow]" + ",  ".join(fr.missing_letters) + "[/yellow]",
                )
            if fr.missing_spaces:
                tbl.add_row(
                    "⚠  Missing Spaces",
                    f"[yellow]{len(fr.missing_spaces)} space(s) at position(s): "
                    + ", ".join(str(p) for p in fr.missing_spaces)
                    + "[/yellow]",
                )
            if fr.missing_numbers:
                tbl.add_row(
                    "⚠  Missing Numbers",
                    "[yellow]" + ",  ".join(fr.missing_numbers) + "[/yellow]",
                )

            console.print(tbl)

        console.print()


# ═══════════════════════════════════════════════════════════════════════════
# HTML report
# ═══════════════════════════════════════════════════════════════════════════

def _field_card_html(fr: FieldResult) -> str:
    badges = ""
    if fr.missing_letters:
        badges += (
            f'<span class="badge badge-letter">'
            f'Missing Letters: {", ".join(fr.missing_letters)}</span>'
        )
    if fr.missing_spaces:
        badges += (
            f'<span class="badge badge-space">'
            f'Missing Spaces: {len(fr.missing_spaces)} space(s)</span>'
        )
    if fr.missing_numbers:
        badges += (
            f'<span class="badge badge-number">'
            f'Missing Numbers: {", ".join(fr.missing_numbers)}</span>'
        )

    score_colour = (
        "#4ade80" if fr.match_score >= 0.85
        else "#fbbf24" if fr.match_score >= 0.6
        else "#f87171"
    )

    return f"""
    <div class="field-card">
      <div class="field-name">{fr.field_name}</div>
      <div class="field-values">
        <div class="value-row">
          <span class="label">Expected (XML)</span>
          <span class="value xml-val">{fr.xml_value}</span>
        </div>
        <div class="value-row">
          <span class="label">Found (OCR)</span>
          <span class="value ocr-val">{fr.ocr_value or "(not found)"}</span>
        </div>
        <div class="value-row">
          <span class="label">Match Score</span>
          <span class="value" style="color:{score_colour};font-weight:700">
            {fr.match_score:.0%}
          </span>
        </div>
      </div>
      <div class="badges">{badges}</div>
    </div>"""


def _record_card_html(result: RecordResult) -> str:
    status_cls  = "clean" if result.is_clean else "error"
    status_icon = "✅" if result.is_clean else "❌"
    issue_label = "No issues" if result.is_clean else f"{result.total_issues} issue(s)"

    fields_html = "".join(_field_card_html(fr) for fr in result.fields_with_issues)

    remarks_html = (
        f'<div class="remarks">📝 {result.remarks}</div>'
        if result.remarks else ""
    )

    return f"""
    <div class="record-card {status_cls}">
      <div class="record-header">
        <span class="status-icon">{status_icon}</span>
        <span class="record-no">Record #{result.record_no}</span>
        <span class="issue-count">{issue_label}</span>
      </div>
      {remarks_html}
      <div class="fields-grid">{fields_html}</div>
    </div>"""


_CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #0b1120;
  color: #e2e8f0;
  min-height: 100vh;
  padding: 2rem 1rem;
}
.wrap { max-width: 1100px; margin: 0 auto; }

/* Header */
.page-header {
  text-align: center;
  padding: 2.5rem 2rem;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 18px;
  border: 1px solid #1e3a5f;
  margin-bottom: 2rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.page-header h1 { font-size: 2rem; color: #38bdf8; margin-bottom: .4rem; }
.page-header p  { color: #64748b; font-size: .9rem; }

/* Summary cards */
.summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.stat {
  flex: 1 1 140px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 1.4rem 1.2rem;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}
.stat .num  { font-size: 2.4rem; font-weight: 800; }
.stat .lbl  { color: #64748b; font-size: .8rem; margin-top: .2rem; }
.stat.total .num   { color: #38bdf8; }
.stat.issues .num  { color: #f87171; }
.stat.clean .num   { color: #4ade80; }
.stat.probs .num   { color: #fbbf24; }

/* Record cards */
.record-card {
  background: #1e293b;
  border-radius: 14px;
  margin-bottom: 1.4rem;
  overflow: hidden;
  border: 1px solid #334155;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  transition: transform .15s;
}
.record-card:hover { transform: translateY(-2px); }
.record-card.error { border-left: 4px solid #f87171; }
.record-card.clean { border-left: 4px solid #4ade80; }

.record-header {
  display: flex;
  align-items: center;
  gap: .9rem;
  padding: 1rem 1.4rem;
  background: #0f172a;
  border-bottom: 1px solid #334155;
}
.status-icon { font-size: 1.2rem; }
.record-no   { font-weight: 700; font-size: 1.05rem; }
.issue-count {
  margin-left: auto;
  background: #1e293b;
  border: 1px solid #475569;
  border-radius: 20px;
  padding: .2rem .75rem;
  font-size: .78rem;
  color: #94a3b8;
}

.remarks {
  padding: .65rem 1.4rem;
  background: #162032;
  color: #93c5fd;
  font-size: .85rem;
  font-style: italic;
  border-bottom: 1px solid #334155;
}

.fields-grid {
  padding: 1rem 1.4rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
}

/* Field cards */
.field-card {
  background: #0f172a;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid #1e293b;
}
.field-name {
  font-size: .78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #fbbf24;
  margin-bottom: .65rem;
}
.field-values { margin-bottom: .65rem; }
.value-row {
  display: flex;
  gap: .6rem;
  align-items: baseline;
  margin-bottom: .35rem;
}
.label {
  color: #475569;
  font-size: .75rem;
  min-width: 110px;
  flex-shrink: 0;
}
.value { font-family: monospace; font-size: .85rem; word-break: break-all; }
.xml-val { color: #4ade80; }
.ocr-val { color: #f87171; }

/* Badges */
.badges { display: flex; flex-wrap: wrap; gap: .4rem; }
.badge {
  padding: .2rem .65rem;
  border-radius: 20px;
  font-size: .72rem;
  font-weight: 600;
  white-space: nowrap;
}
.badge-letter { background:#fef3c7; color:#92400e; }
.badge-space  { background:#dbeafe; color:#1e40af; }
.badge-number { background:#fce7f3; color:#9d174d; }

footer {
  text-align: center;
  color: #334155;
  font-size: .8rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #1e293b;
}
"""


def save_html_report(results: List[RecordResult], output_path: str) -> None:
    """
    Save a standalone HTML validation report.

    Args:
        results:     List of RecordResult objects from validate_all().
        output_path: File path to write the HTML file.
    """
    total       = len(results)
    with_issues = sum(1 for r in results if not r.is_clean)
    clean       = total - with_issues
    total_probs = sum(r.total_issues for r in results)

    records_html = "\n".join(_record_card_html(r) for r in results)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Validation Report</title>
  <style>{_CSS}</style>
</head>
<body>
<div class="wrap">

  <div class="page-header">
    <h1>📄 Document Validation Report</h1>
    <p>Generated: {datetime.now().strftime('%A, %d %B %Y — %H:%M:%S')}</p>
  </div>

  <div class="summary">
    <div class="stat total">
      <div class="num">{total}</div>
      <div class="lbl">Total Records</div>
    </div>
    <div class="stat issues">
      <div class="num">{with_issues}</div>
      <div class="lbl">With Issues</div>
    </div>
    <div class="stat clean">
      <div class="num">{clean}</div>
      <div class="lbl">Clean</div>
    </div>
    <div class="stat probs">
      <div class="num">{total_probs}</div>
      <div class="lbl">Field Problems</div>
    </div>
  </div>

  {records_html}

  <footer>Document Validation Tool &nbsp;|&nbsp; {datetime.now().year}</footer>

</div>
</body>
</html>"""

    Path(output_path).write_text(html, encoding="utf-8")

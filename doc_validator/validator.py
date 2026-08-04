"""
validator.py
------------
Main CLI entry point for the Document Validation Tool.

Usage
-----
  python validator.py --image path/to/image.jpg --xml path/to/data.xml

Options
-------
  --image  / -i   Path to the image file (JPEG, PNG, TIFF, …)
  --xml    / -x   Path to the XML file containing DataM records
  --output / -o   Output HTML report path  (default: validation_report.html)
  --no-html       Skip HTML report generation; print to console only
  --verbose       Print every field result, not just those with issues
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


# ─────────────────────────────────────────────────────────────────────────────
def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="validator",
        description="📄  Document Validation Tool — compare image OCR with XML data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--image", "-i",
        required=True,
        help="Path to the image file (JPEG / PNG / TIFF …)",
    )
    parser.add_argument(
        "--xml", "-x",
        required=True,
        help="Path to the XML file containing <DataM> records",
    )
    parser.add_argument(
        "--output", "-o",
        default="validation_report.html",
        help="Output HTML report path  [default: validation_report.html]",
    )
    parser.add_argument(
        "--no-html",
        action="store_true",
        help="Skip HTML report — print console output only",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show all field results, not just those with issues",
    )
    return parser.parse_args(argv)


# ─────────────────────────────────────────────────────────────────────────────
def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    image_path = Path(args.image)
    xml_path   = Path(args.xml)

    # Validate inputs
    if not image_path.exists():
        console.print(f"[red][ERROR] Image file not found:[/red] {image_path}")
        return 1
    if not xml_path.exists():
        console.print(f"[red][ERROR] XML file not found:[/red]   {xml_path}")
        return 1

    t_start = time.perf_counter()

    # ── Step 1: OCR ──────────────────────────────────────────────────────────
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task(
            f"[cyan]Running OCR on {image_path.name} …", total=None
        )
        try:
            from ocr_engine import extract_text
            ocr_text = extract_text(str(image_path))
        except RuntimeError as exc:
            console.print(f"[red]{exc}[/red]")
            return 1
        except Exception as exc:
            console.print(f"[red][ERROR] OCR failed:[/red] {exc}")
            return 1
        progress.update(task, description="[green]✔ OCR complete")

    console.print(
        f"[dim]OCR extracted [bold]{len(ocr_text.split())}[/bold] words "
        f"from '{image_path.name}'[/dim]"
    )

    # ── Step 2: Validate ─────────────────────────────────────────────────────
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task(
            f"[cyan]Validating records in {xml_path.name} …", total=None
        )
        try:
            from checker import validate_all
            results = validate_all(str(xml_path), ocr_text)
        except Exception as exc:
            console.print(f"[red][ERROR] Validation failed:[/red] {exc}")
            return 1
        progress.update(task, description="[green]✔ Validation complete")

    # ── Step 3: Console report ────────────────────────────────────────────────
    from report import print_console_report, save_html_report

    # Optionally filter to only show records / fields with issues
    display_results = results
    if not args.verbose:
        # Still show all records in summary; field detail only for issues
        pass  # print_console_report already handles this

    print_console_report(display_results)

    # ── Step 4: HTML report ───────────────────────────────────────────────────
    if not args.no_html:
        output_path = Path(args.output)
        try:
            save_html_report(results, str(output_path))
            console.print(
                f"[green]✅  HTML report saved →[/green] [link=file://{output_path.resolve()}]"
                f"{output_path}[/link]"
            )
        except Exception as exc:
            console.print(f"[yellow][WARN] Could not save HTML report: {exc}[/yellow]")

    elapsed = time.perf_counter() - t_start
    console.print(f"\n[dim]Completed in {elapsed:.2f}s[/dim]")

    return 0


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    sys.exit(main())

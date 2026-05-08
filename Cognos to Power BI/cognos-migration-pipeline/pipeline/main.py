"""
main.py — Cognos → Power BI Migration Pipeline (POC)
Usage: python main.py [--xml path/to/report.xml] [--output path/to/output.json]

Pipeline stages:
  1. Extract  — XPath metadata extraction from Cognos XML
  2. IR Gen   — Normalize into canonical Intermediate Representation
  3. Rules    — Apply visual mapping + DAX translation rules
  4. Validate — Run validation checks
  5. Score    — Calculate complexity + effort estimate
  6. Output   — Write enriched IR + DAX measures + effort report
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

from extractor import extract
from ir_generator import generate_ir
from rule_engine import apply_rules
from validator import validate
from complexity_scorer import score


def run_pipeline(xml_path: str, output_path: str) -> dict:
    print(f"\n{'='*60}")
    print("  Cognos → Power BI Migration Pipeline")
    print(f"{'='*60}")

    # ── Stage 1: Extract ──────────────────────────────────────────
    print("\n[1/5] Extracting metadata from Cognos XML...")
    raw = extract(xml_path)
    print(f"      Report: {raw['report_name']}")
    print(f"      Visuals found: {len(raw.get('visuals', []))}")
    print(f"      Queries found: {len(raw.get('queries', []))}")

    # ── Stage 2: IR Generation ────────────────────────────────────
    print("\n[2/5] Generating Intermediate Representation (IR)...")
    ir = generate_ir(raw)
    s = ir["summary"]
    print(f"      Visuals: {s['visual_count']} | Filters: {s['filter_count']} | "
          f"Calcs: {s['calc_count']} | Fields: {s['field_count']}")

    # ── Stage 3: Rule Engine ──────────────────────────────────────
    print("\n[3/5] Applying migration rules (visual mapping + DAX translation)...")
    enriched = apply_rules(ir)
    dax_measures = enriched.get("dax_measures", [])
    fully_mapped = len([v for v in enriched["visuals"] if v.get("migration_support") == "full"])
    print(f"      Visuals mapped: {fully_mapped}/{s['visual_count']} fully auto-mapped")
    print(f"      DAX measures generated: {len(dax_measures)}")
    manual = [m for m in dax_measures if m.get("needs_review")]
    if manual:
        print(f"      ⚠ Measures needing manual review: {len(manual)}")

    # ── Stage 4: Validation ───────────────────────────────────────
    print("\n[4/5] Running validation checks...")
    validation_results = validate(ir, enriched)
    passed = len([r for r in validation_results if r["status"] == "pass"])
    warned = len([r for r in validation_results if r["status"] == "warn"])
    failed = len([r for r in validation_results if r["status"] == "fail"])
    stubbed = len([r for r in validation_results if r["status"] == "stub"])
    print(f"      ✓ Pass: {passed}  ⚠ Warn: {warned}  ✗ Fail: {failed}  ~ Stub: {stubbed}")

    # ── Stage 5: Complexity Scoring ───────────────────────────────
    print("\n[5/5] Calculating complexity score...")
    complexity = score(ir, enriched)
    print(f"      Band: {complexity['band']} | Score: {complexity['score']}/100 | "
          f"Risk: {complexity['risk_level']}")
    effort = complexity["effort_estimate_hours"]
    print(f"      Effort estimate: {effort['low']}–{effort['high']} hours "
          f"(mid: {effort['mid']} hrs)")

    # ── Assemble final output ─────────────────────────────────────
    output = {
        "pipeline_version": "1.0.0",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source_file": str(xml_path),
        "report_name": ir["report_name"],

        # Core IR
        "intermediate_representation": {
            "report_name": ir["report_name"],
            "source_system": "Cognos",
            "version": ir.get("version"),
            "metadata": ir.get("metadata"),
            "summary": ir["summary"],
            "visuals": enriched["visuals"],
            "filters": enriched["filters"],
            "calculations": enriched["calculations"],
            "data_fields": ir["data_fields"],
            "prompts": ir["prompts"],
            "queries": ir["queries"],
        },

        # DAX output
        "dax_measures": dax_measures,
        "dax_file_content": _render_dax_file(enriched["report_name"], dax_measures),

        # Migration analysis
        "migration_notes": enriched.get("migration_notes", []),
        "validation_results": validation_results,
        "complexity": complexity,

        # Quick summary for presentation
        "executive_summary": _build_exec_summary(ir, enriched, complexity, validation_results),
    }

    # Write output
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  Output written → {output_path}")
    print(f"{'='*60}\n")

    # Also write standalone DAX file
    dax_output_path = Path(output_path).parent / "LifeInsurance_Measures_Generated.dax"
    with open(dax_output_path, "w", encoding="utf-8") as f:
        f.write(output["dax_file_content"])
    print(f"  DAX measures → {dax_output_path}\n")

    return output


def _render_dax_file(report_name: str, dax_measures: list[dict]) -> str:
    lines = [
        f"// DAX Measures — Auto-generated from Cognos migration pipeline",
        f"// Report: {report_name}",
        f"// Generated: {datetime.utcnow().isoformat()}Z",
        f"// Total measures: {len(dax_measures)}",
        f"// NOTE: Measures marked [REVIEW] require manual validation before production use.",
        "",
    ]
    for measure in dax_measures:
        review_tag = " [REVIEW REQUIRED]" if measure.get("needs_review") else ""
        method = measure.get("translation_method", "unknown")
        lines += [
            f"// ── {measure['name']}{review_tag} ──",
            f"// Source: {measure.get('source_expression', 'N/A')}",
            f"// Translation method: {method}",
            measure.get("dax_measure", "-- ERROR: no measure generated"),
            "",
        ]
    return "\n".join(lines)


def _build_exec_summary(
    ir: dict, enriched: dict, complexity: dict, validation: list[dict]
) -> dict:
    passed = len([r for r in validation if r["status"] == "pass"])
    failed = len([r for r in validation if r["status"] == "fail"])
    effort = complexity["effort_estimate_hours"]
    return {
        "report": ir["report_name"],
        "complexity_band": complexity["band"],
        "effort_range": f"{effort['low']}–{effort['high']} hours",
        "recommended_effort": f"{effort['mid']} hours",
        "risk": complexity["risk_level"],
        "validation_summary": f"{passed} checks passed, {failed} failed",
        "total_visuals": ir["summary"]["visual_count"],
        "total_measures": len(enriched.get("dax_measures", [])),
        "key_risks": complexity.get("warnings", []),
        "unsupported_features": complexity.get("unsupported_features", []),
    }


def main():
    parser = argparse.ArgumentParser(description="Cognos → Power BI Migration Pipeline")
    parser.add_argument(
        "--xml", default="mock_cognos_report.xml",
        help="Path to Cognos XML report file"
    )
    parser.add_argument(
        "--output", default="../output/migration_result.json",
        help="Path for output JSON file"
    )
    args = parser.parse_args()

    if not Path(args.xml).exists():
        print(f"ERROR: XML file not found: {args.xml}")
        sys.exit(1)

    result = run_pipeline(args.xml, args.output)
    print("Pipeline complete.")
    print(f"\nExecutive Summary:")
    es = result["executive_summary"]
    for k, v in es.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()

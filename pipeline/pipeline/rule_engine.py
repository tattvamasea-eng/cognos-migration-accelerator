"""
rule_engine.py — Rule-based migration engine
Maps normalized IR visuals → Power BI visual types
Generates DAX measure stubs from Cognos calculation expressions.
"""

import re
from typing import Any


# ── Visual Mapping Rules ────────────────────────────────────────────────────

VISUAL_MAP: dict[str, dict] = {
    "bar_chart": {
        "pbi_visual": "clusteredBarChart",
        "support": "full",
        "notes": "Direct mapping. Map categories→Axis, values→Values.",
    },
    "line_chart": {
        "pbi_visual": "lineChart",
        "support": "full",
        "notes": "Direct mapping. Map categories→Axis, values→Values.",
    },
    "pie_chart": {
        "pbi_visual": "pieChart",
        "support": "full",
        "notes": "Direct mapping. Consider donut chart variant.",
    },
    "area_chart": {
        "pbi_visual": "areaChart",
        "support": "full",
        "notes": "Direct mapping.",
    },
    "scatter_chart": {
        "pbi_visual": "scatterChart",
        "support": "full",
        "notes": "Map X/Y axis fields explicitly.",
    },
    "card": {
        "pbi_visual": "card",
        "support": "full",
        "notes": "Use Power BI Card or new Card (v2) visual. Reference DAX measure.",
    },
    "matrix": {
        "pbi_visual": "matrix",
        "support": "partial",
        "notes": "Cognos crosstab → PBI Matrix. Custom cell formatting requires manual work.",
    },
    "table": {
        "pbi_visual": "tableEx",
        "support": "partial",
        "notes": "Cognos list → PBI Table. Conditional formatting and drill-through need manual config.",
    },
    "unknown": {
        "pbi_visual": "REVIEW_REQUIRED",
        "support": "unsupported",
        "notes": "Manual review required — no automatic mapping available.",
    },
}

# ── DAX Translation Rules ───────────────────────────────────────────────────

# Patterns: (regex on Cognos expression, DAX template, measure_type)
DAX_PATTERNS: list[tuple[str, str, str]] = [
    # Simple aggregates
    (r"^count\((.+)\)$",          "COUNTROWS({table})",              "count"),
    (r"^total\((.+)\)$",          "SUM({field})",                    "sum"),
    (r"^average\((.+)\)$",        "AVERAGE({field})",                "average"),
    (r"^minimum\((.+)\)$",        "MIN({field})",                    "min"),
    (r"^maximum\((.+)\)$",        "MAX({field})",                    "max"),
    # Filtered count (STP rate pattern)
    (r"count\(filter\(.+processing_days.+<=\s*1.+\)",
     "CALCULATE(COUNTROWS(POLICY_FACT), POLICY_FACT[PROCESSING_DAYS] <= 1)",
     "filtered_count"),
    # Percentage/ratio pattern
    (r".*\/.*\*\s*100",
     "DIVIDE({numerator}, {denominator}) * 100",
     "percentage"),
    # Filtered count (generic)
    (r"count\(filter\(.+\)\)",
     "CALCULATE(COUNTROWS({table}), {filter_condition})",
     "filtered_count"),
]

AGGREGATE_TO_DAX: dict[str, str] = {
    "count":    "COUNTROWS({table})",
    "sum":      "SUM({table}[{field}])",
    "average":  "AVERAGE({table}[{field}])",
    "min":      "MIN({table}[{field}])",
    "max":      "MAX({table}[{field}])",
    "calculated": "-- REVIEW: Complex calc — see expression below\n-- {expression}",
}


def apply_rules(ir: dict[str, Any]) -> dict[str, Any]:
    """Main entry point. Enriches IR with PBI mappings and DAX stubs."""
    mapped_visuals = [_map_visual(v) for v in ir.get("visuals", [])]
    dax_measures = [_translate_to_dax(c) for c in ir.get("calculations", [])]

    # Patch DAX stubs back into calculations list
    calc_lookup = {m["name"]: m["dax_measure"] for m in dax_measures}
    for calc in ir.get("calculations", []):
        calc["dax_stub"] = calc_lookup.get(calc["name"])

    return {
        **ir,
        "visuals": mapped_visuals,
        "dax_measures": dax_measures,
        "migration_notes": _generate_migration_notes(mapped_visuals, ir.get("filters", [])),
    }


def _map_visual(visual: dict) -> dict:
    norm_type = visual.get("normalized_type", "unknown")
    rule = VISUAL_MAP.get(norm_type, VISUAL_MAP["unknown"])
    return {
        **visual,
        "pbi_visual_type": rule["pbi_visual"],
        "migration_support": rule["support"],
        "migration_notes": rule["notes"],
    }


def _translate_to_dax(calc: dict) -> dict:
    name = calc.get("name", "Unknown")
    expression = (calc.get("expression") or "").strip()
    aggregate = calc.get("aggregate", "")
    is_calculated = calc.get("is_calculated", False)

    dax_measure = None
    method = "stub"

    # Try pattern matching first
    expr_lower = expression.lower()
    for pattern, dax_template, measure_type in DAX_PATTERNS:
        if re.search(pattern, expr_lower):
            dax_measure = _build_dax_from_template(
                name, dax_template, expression, measure_type
            )
            method = "pattern_matched"
            break

    # Fall back to aggregate-type stub
    if dax_measure is None and aggregate in AGGREGATE_TO_DAX:
        table, field = _parse_field_ref(expression)
        template = AGGREGATE_TO_DAX[aggregate]
        raw_dax = template.format(
            table=table, field=field, expression=expression
        )
        dax_measure = f"[{name}] =\n    {raw_dax}"
        method = "aggregate_stub"

    # Last resort: comment stub
    if dax_measure is None:
        dax_measure = (
            f"[{name}] =\n"
            f"    -- TODO: Manual translation required\n"
            f"    -- Cognos expression: {expression}\n"
            f"    BLANK()"
        )
        method = "manual_required"

    return {
        "name": name,
        "source_expression": expression,
        "aggregate_type": aggregate,
        "dax_measure": dax_measure,
        "translation_method": method,
        "needs_review": method in ("manual_required", "aggregate_stub") or is_calculated,
    }


def _build_dax_from_template(
    name: str, template: str, expression: str, measure_type: str
) -> str:
    table, field = _parse_field_ref(expression)
    dax_body = template.format(
        table=table, field=field,
        expression=expression,
        numerator=f"COUNTROWS({table})",
        denominator=f"COUNTROWS({table})",
        filter_condition="-- TODO: specify filter",
    )
    return f"[{name}] =\n    {dax_body}"


def _parse_field_ref(expression: str) -> tuple[str, str]:
    """Extract table and field from [TABLE].[FIELD] or similar patterns."""
    match = re.search(r"\[([^\]]+)\]\.\[([^\]]+)\]", expression)
    if match:
        return match.group(1), match.group(2)
    # Fallback: try to extract last bracket content
    brackets = re.findall(r"\[([^\]]+)\]", expression)
    if len(brackets) >= 2:
        return brackets[-2], brackets[-1]
    if len(brackets) == 1:
        return "FACT_TABLE", brackets[0]
    return "FACT_TABLE", "COLUMN"


def _generate_migration_notes(
    visuals: list[dict], filters: list[dict]
) -> list[str]:
    notes = []
    unsupported = [v for v in visuals if v.get("migration_support") == "unsupported"]
    partial = [v for v in visuals if v.get("migration_support") == "partial"]
    full = [v for v in visuals if v.get("migration_support") == "full"]

    notes.append(f"{len(full)} visuals: full auto-mapping available.")
    if partial:
        names = ", ".join(v["id"] for v in partial if v.get("id"))
        notes.append(f"{len(partial)} visuals require partial manual config: {names}")
    if unsupported:
        names = ", ".join(v["id"] for v in unsupported if v.get("id"))
        notes.append(f"⚠ {len(unsupported)} visuals require manual review: {names}")

    date_range_filters = [f for f in filters if f.get("cognos_type") == "dateRange"]
    if date_range_filters:
        notes.append(
            "Date range prompts → Power BI date slicers or RLS-based date parameters. "
            "Validate fiscal calendar alignment."
        )

    return notes

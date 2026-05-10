"""
complexity_scorer.py — Migration complexity scoring engine
Scores a report Low / Medium / High and estimates migration effort in dev-hours.
"""

from typing import Any
from dataclasses import dataclass, field


@dataclass
class ComplexityScore:
    band: str           # "Low" | "Medium" | "High"
    score: int          # raw 0–100
    effort_hours: dict  # { low: int, mid: int, high: int }
    risk_level: str     # "Low" | "Medium" | "High"
    drivers: list[str] = field(default_factory=list)
    unsupported_features: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ── Scoring weights ─────────────────────────────────────────────────────────

WEIGHTS = {
    # Visual complexity
    "unsupported_visuals":      15,  # per visual
    "partial_visuals":           5,  # per visual
    "crosstab_count":            8,  # per crosstab (complex in PBI)

    # Calculation complexity
    "calculated_measures":       4,  # per calc measure
    "manual_dax_required":       8,  # per measure needing manual DAX
    "complex_expressions":       6,  # per expression with filter/nested

    # Filter complexity
    "date_range_filters":        5,  # per date range (fiscal calendar risk)
    "multi_select_filters":      3,  # per multi-select

    # Data model complexity
    "query_count":               3,  # per query beyond 1
    "query_subject_count":       2,  # per query subject beyond 3

    # Report structure
    "prompt_count":              3,  # per prompt (parameterized reports)
}

# ── Effort bands (hours) ────────────────────────────────────────────────────

EFFORT_BANDS = {
    "Low":    {"low": 4,  "mid": 8,   "high": 16},
    "Medium": {"low": 16, "mid": 32,  "high": 48},
    "High":   {"low": 48, "mid": 80,  "high": 120},
}

KNOWN_UNSUPPORTED = [
    "ActiveX control",
    "Cognos Analytics chart animation",
    "Report Studio custom Java extension",
    "Burst report",
    "Conditional block",
    "Singleton query",
]


def score(ir: dict[str, Any], enriched_ir: dict[str, Any]) -> dict[str, Any]:
    result = _calculate_score(ir, enriched_ir)
    return {
        "band": result.band,
        "score": result.score,
        "risk_level": result.risk_level,
        "effort_estimate_hours": result.effort_hours,
        "complexity_drivers": result.drivers,
        "unsupported_features": result.unsupported_features,
        "warnings": result.warnings,
        "scoring_breakdown": _breakdown(ir, enriched_ir),
    }


def _calculate_score(ir: dict, enriched_ir: dict) -> ComplexityScore:
    raw_score = 0
    drivers = []
    unsupported = []
    warnings = []

    visuals = enriched_ir.get("visuals", [])
    unsupported_visuals = [v for v in visuals if v.get("migration_support") == "unsupported"]
    partial_visuals = [v for v in visuals if v.get("migration_support") == "partial"]
    crosstabs = [v for v in visuals if v.get("normalized_type") == "matrix"]

    if unsupported_visuals:
        pts = len(unsupported_visuals) * WEIGHTS["unsupported_visuals"]
        raw_score += pts
        drivers.append(f"Unsupported visuals ({len(unsupported_visuals)}): +{pts} pts")
        unsupported += [v.get("id", "unknown") for v in unsupported_visuals]

    if partial_visuals:
        pts = len(partial_visuals) * WEIGHTS["partial_visuals"]
        raw_score += pts
        drivers.append(f"Partial-support visuals ({len(partial_visuals)}): +{pts} pts")

    if crosstabs:
        pts = len(crosstabs) * WEIGHTS["crosstab_count"]
        raw_score += pts
        drivers.append(f"Crosstab/matrix visuals ({len(crosstabs)}): +{pts} pts")

    # DAX complexity
    dax_measures = enriched_ir.get("dax_measures", [])
    manual_dax = [m for m in dax_measures if m.get("translation_method") == "manual_required"]
    calculated = [m for m in dax_measures if m.get("aggregate_type") == "calculated"]

    if calculated:
        pts = len(calculated) * WEIGHTS["calculated_measures"]
        raw_score += pts
        drivers.append(f"Calculated measures ({len(calculated)}): +{pts} pts")

    if manual_dax:
        pts = len(manual_dax) * WEIGHTS["manual_dax_required"]
        raw_score += pts
        drivers.append(f"Measures needing manual DAX ({len(manual_dax)}): +{pts} pts")
        warnings.append(f"{len(manual_dax)} measure(s) require manual DAX authoring.")

    # Filter complexity
    filters = ir.get("filters", [])
    date_filters = [f for f in filters if f.get("cognos_type") == "dateRange" or
                    f.get("normalized_type") == "date_range_slicer"]
    multi_select = [f for f in filters if f.get("cognos_type") == "multiSelect"]

    if date_filters:
        pts = len(date_filters) * WEIGHTS["date_range_filters"]
        raw_score += pts
        drivers.append(f"Date range filters ({len(date_filters)}): +{pts} pts")
        warnings.append("Validate fiscal calendar alignment for date range filters.")

    if multi_select:
        pts = len(multi_select) * WEIGHTS["multi_select_filters"]
        raw_score += pts
        drivers.append(f"Multi-select filters ({len(multi_select)}): +{pts} pts")

    # Query complexity
    queries = ir.get("queries", [])
    if len(queries) > 1:
        pts = (len(queries) - 1) * WEIGHTS["query_count"]
        raw_score += pts
        drivers.append(f"Multiple queries ({len(queries)}): +{pts} pts")

    data_sources = ir.get("data_sources", [])
    total_subjects = sum(len(ds.get("query_subjects", [])) for ds in data_sources)
    if total_subjects > 3:
        pts = (total_subjects - 3) * WEIGHTS["query_subject_count"]
        raw_score += pts
        drivers.append(f"Query subjects ({total_subjects}): +{pts} pts")

    # Prompts
    prompts = ir.get("prompts", [])
    if prompts:
        pts = len(prompts) * WEIGHTS["prompt_count"]
        raw_score += pts
        drivers.append(f"Parameterized prompts ({len(prompts)}): +{pts} pts")

    # Determine band
    raw_score = min(raw_score, 100)
    if raw_score <= 25:
        band = "Low"
    elif raw_score <= 55:
        band = "Medium"
    else:
        band = "High"

    risk_level = "High" if unsupported else ("Medium" if manual_dax or crosstabs else "Low")

    return ComplexityScore(
        band=band,
        score=raw_score,
        effort_hours=EFFORT_BANDS[band],
        risk_level=risk_level,
        drivers=drivers,
        unsupported_features=unsupported,
        warnings=warnings,
    )


def _breakdown(ir: dict, enriched_ir: dict) -> dict:
    visuals = enriched_ir.get("visuals", [])
    dax_measures = enriched_ir.get("dax_measures", [])
    return {
        "total_visuals": len(visuals),
        "fully_mapped": len([v for v in visuals if v.get("migration_support") == "full"]),
        "partially_mapped": len([v for v in visuals if v.get("migration_support") == "partial"]),
        "unsupported": len([v for v in visuals if v.get("migration_support") == "unsupported"]),
        "total_measures": len(dax_measures),
        "auto_translated": len([m for m in dax_measures if m.get("translation_method") in ("pattern_matched", "aggregate_stub")]),
        "manual_required": len([m for m in dax_measures if m.get("translation_method") == "manual_required"]),
        "total_filters": len(ir.get("filters", [])),
        "total_prompts": len(ir.get("prompts", [])),
        "total_queries": len(ir.get("queries", [])),
    }

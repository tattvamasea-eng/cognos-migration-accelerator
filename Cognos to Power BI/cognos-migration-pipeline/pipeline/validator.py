"""
validator.py — Basic validation engine
Row count comparison stub + semantic check stubs for migration QA.
"""

from typing import Any
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    check_name: str
    status: str          # "pass" | "warn" | "fail" | "stub"
    message: str
    details: dict = field(default_factory=dict)


def validate(ir: dict[str, Any], enriched_ir: dict[str, Any]) -> list[dict]:
    results = []

    results += _check_visual_mapping_coverage(enriched_ir)
    results += _check_dax_translation_coverage(enriched_ir)
    results += _check_filter_completeness(enriched_ir)
    results += _check_row_count_stub(ir)
    results += _check_semantic_stubs(ir)

    return [
        {
            "check": r.check_name,
            "status": r.status,
            "message": r.message,
            "details": r.details,
        }
        for r in results
    ]


def _check_visual_mapping_coverage(ir: dict) -> list[ValidationResult]:
    visuals = ir.get("visuals", [])
    if not visuals:
        return [ValidationResult("visual_mapping", "warn", "No visuals found in report.")]

    unsupported = [v for v in visuals if v.get("migration_support") == "unsupported"]
    partial = [v for v in visuals if v.get("migration_support") == "partial"]

    if unsupported:
        return [ValidationResult(
            "visual_mapping_coverage", "fail",
            f"{len(unsupported)} visual(s) could not be auto-mapped.",
            {"unsupported_visuals": [v["id"] for v in unsupported]}
        )]
    if partial:
        return [ValidationResult(
            "visual_mapping_coverage", "warn",
            f"{len(partial)} visual(s) have partial mapping — manual config required.",
            {"partial_visuals": [v["id"] for v in partial]}
        )]
    return [ValidationResult(
        "visual_mapping_coverage", "pass",
        f"All {len(visuals)} visuals mapped successfully."
    )]


def _check_dax_translation_coverage(ir: dict) -> list[ValidationResult]:
    measures = ir.get("dax_measures", [])
    if not measures:
        return [ValidationResult("dax_translation", "warn", "No DAX measures generated.")]

    needs_review = [m for m in measures if m.get("needs_review")]
    auto_translated = len(measures) - len(needs_review)

    results = [ValidationResult(
        "dax_translation_coverage", "pass" if not needs_review else "warn",
        f"{auto_translated}/{len(measures)} measures auto-translated. "
        f"{len(needs_review)} require manual review.",
        {"needs_review": [m["name"] for m in needs_review]}
    )]
    return results


def _check_filter_completeness(ir: dict) -> list[ValidationResult]:
    filters = ir.get("filters", [])
    prompts = ir.get("prompts", [])

    prompt_names = {p["name"] for p in prompts}
    filter_params = {p for f in filters for p in f.get("parameters", [])}
    unmatched = filter_params - prompt_names

    if unmatched:
        return [ValidationResult(
            "filter_prompt_alignment", "warn",
            f"Filter parameters without matching prompts: {unmatched}",
            {"unmatched_params": list(unmatched)}
        )]
    return [ValidationResult(
        "filter_prompt_alignment", "pass",
        f"All {len(filter_params)} filter parameters have matching prompts."
    )]


def _check_row_count_stub(ir: dict) -> list[ValidationResult]:
    """
    Stub: In production, this would query both Cognos and Power BI
    datasets and compare row counts per query subject.
    """
    tables = []
    for ds in ir.get("data_sources", []):
        for qs in ds.get("query_subjects", []):
            tables.append(qs.get("name"))

    return [ValidationResult(
        "row_count_comparison", "stub",
        f"STUB: Row count validation not executed. "
        f"Would compare {len(tables)} table(s) between Cognos and Power BI dataset.",
        {
            "tables_to_validate": tables,
            "implementation_note": (
                "Connect to Power BI XMLA endpoint and Cognos SDK. "
                "Run SELECT COUNT(*) per table and compare."
            )
        }
    )]


def _check_semantic_stubs(ir: dict) -> list[ValidationResult]:
    """
    Stubs for semantic validation checks that require live data access.
    """
    return [
        ValidationResult(
            "measure_value_comparison", "stub",
            "STUB: Spot-check calculated measure values not executed. "
            "Would sample 10 policies and compare Cognos vs PBI output.",
            {"implementation_note": "Requires live Cognos SDK + Power BI REST API access."}
        ),
        ValidationResult(
            "filter_behavior_parity", "stub",
            "STUB: Filter behavior parity not tested. "
            "Date range and multi-select slicers should return identical row sets.",
            {"implementation_note": "Execute identical filter combinations on both systems."}
        ),
        ValidationResult(
            "null_handling_parity", "stub",
            "STUB: NULL/blank handling not validated. "
            "Cognos BLANK() vs PBI BLANK() behavior differs in some aggregations.",
            {"implementation_note": "Test with known NULL records in source data."}
        ),
    ]

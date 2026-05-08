"""
ir_generator.py — Canonical Intermediate Representation (IR) generator
Converts raw extractor output into a normalized IR dict used by all downstream modules.

IR schema:
{
  "report_name": str,
  "source_system": "Cognos",
  "visuals": [ { id, type, title, fields, query_ref } ],
  "filters": [ { name, type, parameters, label } ],
  "calculations": [ { name, expression, aggregate, is_calculated } ],
  "data_fields": [ { name, source_table, data_type_hint } ],
  "prompts": [ { name, type, required } ],
  "summary": { visual_count, filter_count, calc_count, field_count }
}
"""

from typing import Any


# Cognos chart type → normalized type used across the system
CHART_TYPE_MAP = {
    "bar": "bar_chart",
    "line": "line_chart",
    "pie": "pie_chart",
    "column": "bar_chart",
    "area": "area_chart",
    "scatter": "scatter_chart",
    "kpi": "card",
    "matrix": "matrix",
    "table": "table",
    "crosstab": "matrix",
    "list": "table",
}

# Cognos filter types → normalized
FILTER_TYPE_MAP = {
    "dateRange": "date_range_slicer",
    "multiSelect": "multi_select_slicer",
    "singleSelect": "single_select_slicer",
    "search": "search_slicer",
}


def generate_ir(raw: dict[str, Any]) -> dict[str, Any]:
    visuals = _normalize_visuals(raw.get("visuals", []))
    filters = _normalize_filters(raw.get("filters", []))
    calculations = _extract_calculations(raw.get("queries", []))
    data_fields = _extract_data_fields(raw.get("data_sources", []))
    prompts = raw.get("prompts", [])

    return {
        "report_name": raw["report_name"],
        "source_system": "Cognos",
        "version": raw.get("report_version", "1.0"),
        "metadata": raw.get("metadata", {}),
        "visuals": visuals,
        "filters": filters,
        "calculations": calculations,
        "data_fields": data_fields,
        "prompts": prompts,
        "queries": raw.get("queries", []),
        "summary": {
            "visual_count": len(visuals),
            "filter_count": len(filters),
            "calc_count": len(calculations),
            "field_count": len(data_fields),
            "prompt_count": len(prompts),
            "query_count": len(raw.get("queries", [])),
        },
    }


def _normalize_visuals(raw_visuals: list[dict]) -> list[dict]:
    normalized = []
    for v in raw_visuals:
        cognos_type = v.get("chart_subtype") or v.get("cognos_type", "unknown")
        normalized_type = CHART_TYPE_MAP.get(cognos_type, "unknown")

        fields = []
        # Gather all referenced fields from various visual types
        for key in ("categories", "rows", "columns", "data_source"):
            val = v.get(key)
            if val:
                fields.append(val)
        fields += v.get("values", [])
        fields += v.get("measures", [])
        # Deduplicate while preserving order
        seen = set()
        unique_fields = []
        for f in fields:
            if f and f not in seen:
                seen.add(f)
                unique_fields.append(f)

        normalized.append({
            "id": v.get("id"),
            "cognos_type": v.get("cognos_type"),
            "normalized_type": normalized_type,
            "title": v.get("title") or v.get("label", ""),
            "fields": unique_fields,
            "query_ref": v.get("query"),
            "raw": v,  # preserve full original for debugging
        })
    return normalized


def _normalize_filters(raw_filters: list[dict]) -> list[dict]:
    normalized = []
    for f in raw_filters:
        normalized.append({
            "name": f.get("name"),
            "cognos_type": f.get("type"),
            "normalized_type": FILTER_TYPE_MAP.get(f.get("type", ""), "slicer"),
            "parameters": f.get("parameters", []),
            "label": f.get("label"),
            "preset_values": f.get("values"),
        })
    return normalized


def _extract_calculations(queries: list[dict]) -> list[dict]:
    """Pull all calculated/aggregate data items from all queries into flat calc list."""
    calcs = []
    seen = set()
    for q in queries:
        for item in q.get("data_items", []):
            name = item.get("name")
            if name in seen:
                continue
            aggregate = item.get("aggregate")
            if aggregate:  # has any aggregate = worth tracking
                seen.add(name)
                calcs.append({
                    "name": name,
                    "expression": item.get("expression", ""),
                    "aggregate": aggregate,
                    "is_calculated": aggregate == "calculated",
                    "source_query": q.get("name"),
                    "dax_stub": None,  # populated by rule_engine
                })
    return calcs


def _extract_data_fields(data_sources: list[dict]) -> list[dict]:
    """Flatten all querySubject items into a unified field registry."""
    fields = []
    for ds in data_sources:
        for qs in ds.get("query_subjects", []):
            table = qs.get("name", "")
            for item_name in qs.get("query_items", []):
                fields.append({
                    "name": item_name,
                    "source_table": table,
                    "data_source": ds.get("name"),
                    "data_type_hint": _infer_type(item_name),
                })
    return fields


def _infer_type(field_name: str) -> str:
    """Naive type inference from field name patterns."""
    name_upper = field_name.upper()
    if any(k in name_upper for k in ("DATE", "CREATED", "MODIFIED", "ISSUED")):
        return "date"
    if any(k in name_upper for k in ("AMOUNT", "PREMIUM", "SCORE", "RATE", "EXTRA", "YEARS")):
        return "decimal"
    if any(k in name_upper for k in ("COUNT", "DAYS", "AGE", "RATING", "ID")):
        return "integer"
    if any(k in name_upper for k in ("FLAG", "REQUIRED", "STATUS")):
        return "boolean"
    return "varchar"

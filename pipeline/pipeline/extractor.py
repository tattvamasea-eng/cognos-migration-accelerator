"""
extractor.py — XPath-based Cognos XML metadata extractor
Parses report XML into raw metadata dict for IR generation.
"""

import xml.etree.ElementTree as ET
from typing import Any

NS = {"c": "http://developer.cognos.com/schemas/report/14.1/"}


def _find_text(el: ET.Element, xpath: str) -> str | None:
    found = el.find(xpath, NS)
    return found.text.strip() if found is not None and found.text else None


def extract(xml_path: str) -> dict[str, Any]:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    metadata = _extract_metadata(root)
    data_sources = _extract_data_sources(root)
    queries = _extract_queries(root)
    visuals = _extract_visuals(root)
    filters = _extract_filters(root)
    prompts = _extract_prompts(root)

    return {
        "report_name": root.get("name", "Unknown"),
        "report_version": root.get("reportVersion", "1.0"),
        "metadata": metadata,
        "data_sources": data_sources,
        "queries": queries,
        "visuals": visuals,
        "filters": filters,
        "prompts": prompts,
        "raw_query_items": _extract_all_query_items(root),
    }


def _extract_metadata(root: ET.Element) -> dict:
    meta = root.find("c:metadata", NS)
    if meta is None:
        return {}
    return {
        "author": _find_text(meta, "c:author"),
        "created_date": _find_text(meta, "c:createdDate"),
        "last_modified": _find_text(meta, "c:lastModified"),
        "data_source": _find_text(meta, "c:dataSource"),
        "subject": _find_text(meta, "c:subject"),
    }


def _extract_data_sources(root: ET.Element) -> list[dict]:
    sources = []
    for ds in root.findall(".//c:dataSources/c:dataSource", NS):
        subjects = []
        for qs in ds.findall("c:querySubject", NS):
            items = [qi.get("name") for qi in qs.findall("c:queryItem", NS)]
            subjects.append({
                "name": qs.get("name"),
                "query_items": items,
                "item_count": len(items),
            })
        sources.append({
            "name": ds.get("name"),
            "query_subjects": subjects,
        })
    return sources


def _extract_queries(root: ET.Element) -> list[dict]:
    queries = []
    for q in root.findall(".//c:queries/c:query", NS):
        items = []
        for di in q.findall(".//c:dataItem", NS):
            items.append({
                "name": di.get("name"),
                "expression": di.get("expression"),
                "aggregate": di.get("aggregate"),  # None = detail level
            })
        # Detail filters
        detail_filters = [
            df.find("c:filterExpression", NS).text.strip()
            for df in q.findall(".//c:detailFilter", NS)
            if df.find("c:filterExpression", NS) is not None
        ]
        queries.append({
            "name": q.get("name"),
            "data_items": items,
            "calculated_items": [i for i in items if i["aggregate"] == "calculated"],
            "aggregate_items": [i for i in items if i["aggregate"] and i["aggregate"] != "calculated"],
            "detail_filters": detail_filters,
        })
    return queries


def _extract_visuals(root: ET.Element) -> list[dict]:
    visuals = []
    page_body = root.find(".//c:pageBody", NS)
    if page_body is None:
        return visuals

    # Charts
    for chart in page_body.findall("c:chart", NS):
        values = [v.text for v in chart.findall("c:values", NS) if v.text]
        visuals.append({
            "id": chart.get("name"),
            "cognos_type": "chart",
            "chart_subtype": chart.find("c:type", NS).text if chart.find("c:type", NS) is not None else "unknown",
            "query": _find_text(chart, "c:query"),
            "categories": _find_text(chart, "c:categories"),
            "values": values,
            "title": _find_text(chart, "c:title"),
        })

    # KPI text items
    for ti in page_body.findall("c:textItem", NS):
        item_type = _find_text(ti, "c:type")
        if item_type == "kpi":
            visuals.append({
                "id": ti.get("name"),
                "cognos_type": "textItem",
                "chart_subtype": "kpi",
                "data_source": _find_text(ti, "c:dataSource"),
                "label": _find_text(ti, "c:label"),
            })

    # Crosstabs
    for ct in page_body.findall("c:crosstab", NS):
        measures = [m.text for m in ct.findall("c:measures", NS) if m.text]
        visuals.append({
            "id": ct.get("name"),
            "cognos_type": "crosstab",
            "chart_subtype": "matrix",
            "query": _find_text(ct, "c:query"),
            "rows": _find_text(ct, "c:rows"),
            "columns": _find_text(ct, "c:columns"),
            "measures": measures,
            "title": _find_text(ct, "c:title"),
        })

    # Lists
    for lst in page_body.findall("c:list", NS):
        visuals.append({
            "id": lst.get("name"),
            "cognos_type": "list",
            "chart_subtype": "table",
            "query": _find_text(lst, "c:query"),
            "columns": _find_text(lst, "c:columns"),
            "title": _find_text(lst, "c:title"),
            "sorting": _find_text(lst, "c:sorting"),
        })

    return visuals


def _extract_filters(root: ET.Element) -> list[dict]:
    filters = []
    for pf in root.findall(".//c:pageFilters/c:parameterFilter", NS):
        params = [p.text for p in pf.findall("c:parameter", NS) if p.text]
        filters.append({
            "name": pf.get("name"),
            "parameters": params,
            "type": _find_text(pf, "c:type"),
            "label": _find_text(pf, "c:label"),
            "values": _find_text(pf, "c:values"),
        })
    return filters


def _extract_prompts(root: ET.Element) -> list[dict]:
    prompts = []
    for p in root.findall(".//c:prompts/c:prompt", NS):
        prompts.append({
            "name": p.get("name"),
            "type": p.get("type"),
            "required": p.get("required") == "true",
            "default_value": p.get("defaultValue"),
        })
    return prompts


def _extract_all_query_items(root: ET.Element) -> list[str]:
    """Flat list of all queryItem names across all querySubjects — for complexity scoring."""
    return [
        qi.get("name")
        for qi in root.findall(".//c:queryItem", NS)
        if qi.get("name")
    ]

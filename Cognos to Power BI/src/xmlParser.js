/**
 * xmlParser.js — In-browser Cognos XML parser (offline mode)
 * JavaScript port of the Python extractor.py logic.
 * Uses DOMParser + querySelectorAll instead of XPath.
 */

const NS = "http://developer.cognos.com/schemas/report/14.1/";

function qs(el, tag) {
  return el.getElementsByTagNameNS(NS, tag);
}

function q1(el, tag) {
  const items = qs(el, tag);
  return items.length > 0 ? items[0] : null;
}

function getText(el, tag) {
  const found = q1(el, tag);
  return found && found.textContent ? found.textContent.trim() : null;
}

export function parseXml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  const root = doc.documentElement;

  if (root.tagName === "parsererror" || doc.querySelector("parsererror")) {
    throw new Error("Invalid XML format");
  }

  const reportName = root.getAttribute("name") || "Unknown";
  const visuals = extractVisuals(root);
  const queries = extractQueries(root);
  const filters = extractFilters(root);
  const prompts = extractPrompts(root);
  const dataSources = extractDataSources(root);

  // Derive calculations from queries
  const calculations = [];
  for (const q of queries) {
    for (const item of q.data_items || []) {
      if (item.aggregate) {
        calculations.push({
          name: item.name,
          expression: item.expression,
          aggregate: item.aggregate,
          is_calculated: item.aggregate === "calculated",
          source_query: q.name,
        });
      }
    }
  }

  // Derive data fields from data sources
  const dataFields = [];
  for (const ds of dataSources) {
    for (const qs of ds.query_subjects || []) {
      for (const item of qs.query_items || []) {
        dataFields.push({ name: item, source_table: qs.name, data_source: ds.name });
      }
    }
  }

  const summary = {
    visual_count: visuals.length,
    filter_count: filters.length,
    calc_count: calculations.length,
    field_count: dataFields.length,
    prompt_count: prompts.length,
    query_count: queries.length,
  };

  // Determine dominant visual type and calc complexity
  const hasMatrix = visuals.some(v => v.cognos_type === "crosstab");
  const hasCustom = visuals.some(v => v.cognos_type === "custom");
  const visType = hasCustom ? "custom" : hasMatrix ? "cross" : "basic";

  const hasCalculated = calculations.some(c => c.is_calculated);
  const hasComplex = calculations.some(c =>
    (c.expression || "").includes("filter(") || (c.expression || "").includes("/")
  );
  const calcType = hasComplex ? "complex" : hasCalculated ? "medium" : "simple";

  const hasDateRange = filters.some(f => f.type === "dateRange");
  const hasParameterized = prompts.length > 2;
  const filterType = hasParameterized ? "parameterized" : hasDateRange ? "dynamic" : "static";

  return {
    report_name: reportName,
    summary,
    visuals,
    queries,
    filters,
    prompts,
    calculations,
    data_fields: dataFields,
    data_sources: dataSources,
    // Pre-computed form values for Score tab
    scored: { visType, calcType, filterType },
  };
}

function extractVisuals(root) {
  const visuals = [];
  const bodies = qs(root, "pageBody");
  if (bodies.length === 0) return visuals;
  const body = bodies[0];

  // Charts
  for (const chart of qs(body, "chart")) {
    visuals.push({
      id: chart.getAttribute("name"),
      cognos_type: "chart",
      chart_subtype: getText(chart, "type") || "unknown",
      query: getText(chart, "query"),
      title: getText(chart, "title"),
    });
  }
  // KPI text items
  for (const ti of qs(body, "textItem")) {
    if (getText(ti, "type") === "kpi") {
      visuals.push({
        id: ti.getAttribute("name"),
        cognos_type: "textItem",
        chart_subtype: "kpi",
        title: getText(ti, "label"),
      });
    }
  }
  // Crosstabs
  for (const ct of qs(body, "crosstab")) {
    visuals.push({
      id: ct.getAttribute("name"),
      cognos_type: "crosstab",
      chart_subtype: "matrix",
      query: getText(ct, "query"),
      title: getText(ct, "title"),
    });
  }
  // Lists
  for (const lst of qs(body, "list")) {
    visuals.push({
      id: lst.getAttribute("name"),
      cognos_type: "list",
      chart_subtype: "table",
      query: getText(lst, "query"),
      title: getText(lst, "title"),
    });
  }
  return visuals;
}

function extractQueries(root) {
  const queries = [];
  for (const q of qs(root, "query")) {
    const items = [];
    for (const di of qs(q, "dataItem")) {
      items.push({
        name: di.getAttribute("name"),
        expression: di.getAttribute("expression"),
        aggregate: di.getAttribute("aggregate"),
      });
    }
    queries.push({ name: q.getAttribute("name"), data_items: items });
  }
  return queries;
}

function extractFilters(root) {
  const filters = [];
  for (const pf of qs(root, "parameterFilter")) {
    const params = [];
    for (const p of qs(pf, "parameter")) {
      if (p.textContent) params.push(p.textContent.trim());
    }
    filters.push({
      name: pf.getAttribute("name"),
      type: getText(pf, "type"),
      label: getText(pf, "label"),
      parameters: params,
    });
  }
  return filters;
}

function extractPrompts(root) {
  const prompts = [];
  for (const p of qs(root, "prompt")) {
    prompts.push({
      name: p.getAttribute("name"),
      type: p.getAttribute("type"),
      required: p.getAttribute("required") === "true",
    });
  }
  return prompts;
}

function extractDataSources(root) {
  const sources = [];
  for (const ds of qs(root, "dataSource")) {
    const subjects = [];
    for (const qsub of qs(ds, "querySubject")) {
      const items = [];
      for (const qi of qs(qsub, "queryItem")) {
        const name = qi.getAttribute("name");
        if (name) items.push(name);
      }
      subjects.push({ name: qsub.getAttribute("name"), query_items: items });
    }
    if (subjects.length > 0) {
      sources.push({ name: ds.getAttribute("name"), query_subjects: subjects });
    }
  }
  return sources;
}

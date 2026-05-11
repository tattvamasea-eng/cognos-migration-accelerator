import React, { useState, useRef } from "react";
import { parseXml } from "./xmlParser.js";

const API_BASE = "http://localhost:8000";

export default function IntakeTab({ onAnalyzed, apiMode, setApiMode }) {
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [fileName, setFileName] = useState("");
  const [xmlContent, setXmlContent] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  // Check if API is available
  const checkApi = async () => {
    try {
      const res = await fetch(API_BASE + "/api/health", { signal: AbortSignal.timeout(2000) });
      if (res.ok) { setApiMode("live"); return true; }
    } catch (e) { /* offline */ }
    setApiMode("offline");
    return false;
  };

  const processXml = async (xml, name) => {
    setXmlContent(xml);
    setFileName(name);
    setError(null);
    setLoading(true);

    try {
      const isLive = await checkApi();

      if (isLive) {
        // Live API mode
        const form = new FormData();
        form.append("xml_text", xml);
        const res = await fetch(API_BASE + "/api/analyze", { method: "POST", body: form });
        if (!res.ok) throw new Error("API returned " + res.status);
        const data = await res.json();
        setResult(data);
        onAnalyzed({ ...data, xmlContent: xml, fileName: name, mode: "live" });
      } else {
        // Offline mode — parse in browser
        const data = parseXml(xml);
        setResult(data);
        onAnalyzed({ ...data, xmlContent: xml, fileName: name, mode: "offline" });
      }
    } catch (e) {
      // Fallback to offline if API fails
      try {
        const data = parseXml(xml);
        setResult(data);
        setApiMode("offline");
        onAnalyzed({ ...data, xmlContent: xml, fileName: name, mode: "offline" });
      } catch (e2) {
        setError("Failed to parse XML: " + e2.message);
        setResult(null);
      }
    }
    setLoading(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processXml(e.target.result, file.name);
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const isJson = pasteText.trim().startsWith("{");
    if (isJson) {
      try {
        const data = JSON.parse(pasteText);
        setResult(data);
        setFileName("pasted_report.json");
        setApiMode("offline");
        onAnalyzed({ ...data, xmlContent: null, fileName: "pasted_report.json", mode: "offline" });
      } catch (e) {
        setError("Invalid JSON: " + e.message);
      }
    } else {
      processXml(pasteText, "pasted_report.xml");
    }
  };

  const s = result?.summary || {};

  return React.createElement("div", { className: "panel" },
    React.createElement("div", { className: "section-title" }, "Report Intake"),
    React.createElement("div", { className: "section-sub" }, "Upload a Cognos report XML or paste report specification to begin analysis"),

    // Mode indicator
    React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, alignItems: "center" } },
      React.createElement("div", {
        style: {
          padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700,
          background: apiMode === "live" ? "#d1fae5" : "#fef3c7",
          color: apiMode === "live" ? "#065f46" : "#92400e",
        }
      }, apiMode === "live" ? "\u{1f7e2} LIVE API" : "\u{1f7e1} OFFLINE DEMO"),
      React.createElement("span", { style: { fontSize: 11, color: "#6c757d" } },
        apiMode === "live" ? "Connected to FastAPI backend" : "Parsing in browser (no backend required)"
      )
    ),

    // Upload area
    !result && React.createElement("div", { className: "card" },
      React.createElement("div", { className: "card-title" }, "Upload Cognos Report"),

      // Toggle: file vs paste
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16 } },
        React.createElement("button", {
          className: !pasteMode ? "btn-primary" : "btn-secondary",
          style: { marginTop: 0 },
          onClick: () => setPasteMode(false)
        }, "File Upload"),
        React.createElement("button", {
          className: pasteMode ? "btn-primary" : "btn-secondary",
          style: { marginTop: 0 },
          onClick: () => setPasteMode(true)
        }, "Paste XML / JSON")
      ),

      !pasteMode
        ? React.createElement("div", {
            onDragOver: (e) => { e.preventDefault(); setDragOver(true); },
            onDragLeave: () => setDragOver(false),
            onDrop: handleDrop,
            onClick: () => fileRef.current?.click(),
            style: {
              border: "2px dashed " + (dragOver ? "#0d6efd" : "#d0d5dd"),
              borderRadius: 10, padding: "48px 24px", textAlign: "center",
              cursor: "pointer", transition: "all 0.2s",
              background: dragOver ? "#f0f6ff" : "#fafbfc",
            }
          },
            React.createElement("div", { style: { fontSize: 36, marginBottom: 8 } }, "\u{1f4c4}"),
            React.createElement("div", { style: { fontSize: 14, fontWeight: 600, marginBottom: 4 } },
              "Drop Cognos report XML here"),
            React.createElement("div", { style: { fontSize: 12, color: "#6c757d" } },
              "or click to browse \u2022 accepts .xml files"),
            React.createElement("input", {
              ref: fileRef, type: "file", accept: ".xml,.json",
              style: { display: "none" },
              onChange: (e) => handleFile(e.target.files[0])
            })
          )
        : React.createElement("div", null,
            React.createElement("textarea", {
              value: pasteText,
              onChange: (e) => setPasteText(e.target.value),
              placeholder: "Paste Cognos report XML or extraction JSON here...",
              style: {
                width: "100%", minHeight: 200, border: "1px solid #d0d5dd",
                borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 11,
                resize: "vertical", background: "#fafbfc",
              }
            }),
            React.createElement("button", {
              className: "btn-primary", onClick: handlePaste,
              disabled: !pasteText.trim()
            }, "Analyze")
          ),

      loading && React.createElement("div", {
        style: { textAlign: "center", padding: 24, color: "#0d6efd", fontSize: 13 }
      }, "Analyzing report..."),

      error && React.createElement("div", { className: "warning-item", style: { marginTop: 12 } },
        "\u26a0\ufe0f " + error
      )
    ),

    // Results
    result && React.createElement("div", null,
      // File info
      React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-title" }, "Parsed Report"),
        React.createElement("div", {
          style: {
            background: "#f0f6ff", border: "1px solid #bfdbfe", borderRadius: 8,
            padding: "10px 16px", fontSize: 12, color: "#1e40af",
            fontFamily: "monospace", marginBottom: 16,
          }
        }, "\u{1f4c4} " + (result.report_name || fileName) + " \u2022 parsed " +
          (apiMode === "live" ? "via Live API" : "in browser (offline)")
        ),

        // Summary stats
        React.createElement("div", { className: "summary-grid" },
          [
            [s.visual_count || 0, "Visuals"],
            [s.query_count || 0, "Queries"],
            [s.calc_count || 0, "Calculations"],
            [s.filter_count || 0, "Filters"],
          ].map(([val, lbl]) =>
            React.createElement("div", { key: lbl, className: "stat-card" },
              React.createElement("div", { className: "stat-val" }, val),
              React.createElement("div", { className: "stat-lbl" }, lbl)
            )
          )
        )
      ),

      // Extracted visuals table
      (result.visuals || []).length > 0 && React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-title" }, "Extracted Visuals"),
        React.createElement("table", null,
          React.createElement("thead", null,
            React.createElement("tr", null,
              ["ID", "Type", "Subtype", "Title"].map(h =>
                React.createElement("th", { key: h }, h)
              )
            )
          ),
          React.createElement("tbody", null,
            (result.visuals || []).map((v, i) =>
              React.createElement("tr", { key: i },
                React.createElement("td", null, v.id || "-"),
                React.createElement("td", null,
                  React.createElement("span", {
                    className: "pill " + (v.cognos_type === "crosstab" ? "pill-yellow" :
                      v.cognos_type === "chart" ? "pill-blue" :
                      v.chart_subtype === "kpi" ? "pill-green" : "pill-blue")
                  }, v.cognos_type || v.normalized_type || "-")
                ),
                React.createElement("td", null, v.chart_subtype || v.normalized_type || "-"),
                React.createElement("td", null, v.title || "-")
              )
            )
          )
        )
      ),

      // Extracted calculations table
      (result.calculations || []).length > 0 && React.createElement("div", { className: "card" },
        React.createElement("div", { className: "card-title" }, "Extracted Calculations"),
        React.createElement("table", null,
          React.createElement("thead", null,
            React.createElement("tr", null,
              ["Name", "Aggregate", "Expression"].map(h =>
                React.createElement("th", { key: h }, h)
              )
            )
          ),
          React.createElement("tbody", null,
            (result.calculations || []).map((c, i) =>
              React.createElement("tr", { key: i },
                React.createElement("td", null, c.name),
                React.createElement("td", null,
                  React.createElement("span", {
                    className: "pill " + (c.is_calculated ? "pill-yellow" : "pill-green")
                  }, c.aggregate || "-")
                ),
                React.createElement("td", { style: { fontFamily: "monospace", fontSize: 10 } },
                  (c.expression || "").substring(0, 80) + ((c.expression || "").length > 80 ? "..." : "")
                )
              )
            )
          )
        )
      ),

      // Action buttons
      React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } },
        React.createElement("button", {
          className: "btn-primary",
          onClick: () => onAnalyzed({ ...result, xmlContent, fileName, mode: apiMode, goToScore: true })
        }, "Proceed to Score \u2192"),
        React.createElement("button", {
          className: "btn-secondary",
          onClick: () => { setResult(null); setXmlContent(null); setFileName(""); setPasteText(""); }
        }, "Upload Another")
      )
    )
  );
}

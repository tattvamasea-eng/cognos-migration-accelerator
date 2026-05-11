"""
api.py — FastAPI backend for Cognos → Power BI Migration Accelerator
Wraps the Python pipeline as REST endpoints for the React frontend.

Usage:
    pip install fastapi uvicorn python-multipart
    cd cognos-migration-pipeline/pipeline
    uvicorn api:app --port 8000 --reload
"""

import sys
import json
import tempfile
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure pipeline modules are importable
sys.path.insert(0, str(Path(__file__).parent / "cognos-migration-pipeline" / "pipeline"))

from extractor import extract
from ir_generator import generate_ir
from rule_engine import apply_rules
from validator import validate
from complexity_scorer import score


app = FastAPI(
    title="Cognos Migration Accelerator API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _run_pipeline(xml_path: str) -> dict:
    """Run the full 5-stage pipeline and return enriched results."""
    raw = extract(xml_path)
    ir = generate_ir(raw)
    enriched = apply_rules(ir)
    validation_results = validate(ir, enriched)
    complexity = score(ir, enriched)

    dax_measures = enriched.get("dax_measures", [])

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_name": ir["report_name"],
        "summary": ir["summary"],
        "visuals": enriched["visuals"],
        "filters": enriched["filters"],
        "calculations": enriched["calculations"],
        "dax_measures": dax_measures,
        "migration_notes": enriched.get("migration_notes", []),
        "validation_results": validation_results,
        "complexity": complexity,
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "cognos-migration-accelerator"}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(None), xml_text: str = Form(None)):
    """Stage 1–2: Parse XML and return extraction summary + complexity score.
    Accepts either a file upload or raw XML text.
    """
    if file is None and xml_text is None:
        raise HTTPException(400, "Provide either a file upload or xml_text")

    try:
        if file:
            content = await file.read()
            xml_str = content.decode("utf-8")
        else:
            xml_str = xml_text

        # Write to temp file (extractor expects a file path)
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".xml", delete=False, encoding="utf-8"
        ) as tmp:
            tmp.write(xml_str)
            tmp_path = tmp.name

        raw = extract(tmp_path)
        ir = generate_ir(raw)
        complexity = score(ir, apply_rules(ir))

        Path(tmp_path).unlink(missing_ok=True)

        return JSONResponse({
            "status": "ok",
            "report_name": ir["report_name"],
            "summary": ir["summary"],
            "visuals": ir["visuals"],
            "filters": ir["filters"],
            "calculations": ir["calculations"],
            "prompts": ir["prompts"],
            "complexity": complexity,
        })

    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.post("/api/migrate")
async def migrate(file: UploadFile = File(None), xml_text: str = Form(None)):
    """Full pipeline: Parse → IR → Rules → Validate → Score → Output.
    Returns complete migration result with DAX measures.
    """
    if file is None and xml_text is None:
        raise HTTPException(400, "Provide either a file upload or xml_text")

    try:
        if file:
            content = await file.read()
            xml_str = content.decode("utf-8")
        else:
            xml_str = xml_text

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".xml", delete=False, encoding="utf-8"
        ) as tmp:
            tmp.write(xml_str)
            tmp_path = tmp.name

        result = _run_pipeline(tmp_path)
        Path(tmp_path).unlink(missing_ok=True)

        return JSONResponse({"status": "ok", **result})

    except Exception as e:
        raise HTTPException(500, f"Migration failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

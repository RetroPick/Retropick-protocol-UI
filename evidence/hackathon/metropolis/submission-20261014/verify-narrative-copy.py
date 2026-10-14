"""Verify submission narrative limits and record read-back evidence; no portal writes."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

DOCS = Path("docs/metropolis/submission-20261014")
OUT = Path("evidence/hackathon/metropolis/submission-20261014/narrative-copy-checks.json")
SECTIONS = {
    "BOND_TO_BOOK_SALES_COPY.md": [
        ("One-line description", 200),
        ("Description", 8000),
        ("Go-to-market and user acquisition", 8000),
    ],
    "SPONSOR_ANSWERS.md": [
        ("Kuru Consumer — target user segments", 8000),
        ("Kuru Consumer — case studies and research showing demand", 8000),
        ("Kuru Consumer — roadmap beyond the hackathon", 8000),
        ("Kuru Consumer — onboarding and retaining traders", 8000),
        ("Envio — meaningful use of HyperIndex, HyperSync or HyperRPC", 8000),
        ("Chainlink CRE — meaningful orchestration", 8000),
        ("Mera non-account — meaningful non-account work", 8000),
    ],
}


def main():
    checks = []
    for name, headings in SECTIONS.items():
        text = (DOCS / name).read_text()
        for heading, limit in headings:
            content = text.split("## " + heading + "\n\n", 1)[1].split("\n## ", 1)[0].strip()
            portal_count = len(content.encode("utf-16-le")) // 2
            legacy = bool(re.search(r"https://retropick[^\s)]*vercel\.app", content))
            assert portal_count <= limit, (heading, portal_count, limit)
            assert not legacy, heading
            checks.append({
                "file": str(DOCS / name), "section": heading,
                "char_count": len(content), "portal_utf16_count": portal_count,
                "limit": limit, "within_limit": True,
                "legacy_product_origin_present": False,
                "sha256": hashlib.sha256(content.encode()).hexdigest(),
            })
    pitch = (DOCS / "PITCH_FOUNDER_2MIN.md").read_text()
    assert "FOUNDER_OWNED / PENDING_EXTERNAL_INPUT" in pitch
    assert "30+ waitlist" not in (DOCS / "BOND_TO_BOOK_SALES_COPY.md").read_text()
    documents = []
    for path in sorted(DOCS.glob("*.md")):
        if path.name in {"STATUS.md", "PORTAL_FIELDS.md", "OFFICIAL_RULES_AND_FIELD_MATRIX.md"}:
            continue  # root-owned, not a narrative-lane validation claim
        content = path.read_bytes()
        assert content, path
        documents.append({"file": str(path), "bytes_read_back": len(content),
                          "sha256": hashlib.sha256(content).hexdigest()})
    result = {
        "checkedAt": datetime.now(timezone.utc).isoformat(), "status": "PASS",
        "command": "python3 evidence/hackathon/metropolis/submission-20261014/verify-narrative-copy.py",
        "exit_code": 0, "sections": checks, "documents_read_back": documents,
        "scope": "narrative length/origin/ownership/read-back only; not browser, portal, chain or media validation",
        "limitations": ["Portal owner confirms actual saved values and current video URLs.",
                        "Video URL instruction sections are not paste values.",
                        "Envio/Mera live gates are independently verified.",
                        "Founder pitch is externally owned."],
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"status": "PASS", "sections": len(checks),
                      "documents_read_back": len(documents), "artifact": str(OUT)}))


if __name__ == "__main__":
    main()

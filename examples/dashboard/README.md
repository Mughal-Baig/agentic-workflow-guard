# AWGuard Dashboard POC

This proof of concept shows how a GitHub App or hosted dashboard can read AWGuard JSON artifacts and track Agentic Workflow Injection risk over time.

## Run Locally

From this folder:

```bash
python3 -m http.server 8090
```

Then open:

```text
http://127.0.0.1:8090/
```

The page loads `sample-history.json` by default. You can also use the file picker to load another history file with the same shape.

## Data Model

```json
{
  "repository": "owner/repo",
  "runs": [
    {
      "date": "2026-05-30",
      "commit": "abcdef1",
      "score": 92,
      "grade": "A",
      "findings": 3,
      "highest": "medium",
      "introduced": 1,
      "resolved": 4,
      "surfaces": 8,
      "topRules": ["AWG012", "AWG015"]
    }
  ]
}
```

## Architecture Notes

- A scheduled workflow uploads `awguard --format json`, `awguard --format inventory-json`, and `awguard --compare` artifacts.
- A GitHub App or static Pages job normalizes those artifacts into this history shape.
- The dashboard renders score trend, finding trend, introduced/resolved counts, and risky surface growth.
- The POC is static and dependency-free so it can be hosted on GitHub Pages before a full app exists.

## Next Steps

- Add artifact ingestion from GitHub Actions.
- Store per-repository history in a small JSON object store.
- Add organization-level filters.
- Link each finding back to Code Scanning alerts or SARIF locations.

# Examples

- `unsafe-agent.yml`: intentionally vulnerable AI triage workflow.
- `safe-agent.yml`: quieter workflow with read-only permissions and bounded prompt file.
- `suppressed-agent.yml`: demonstrates audited inline suppressions.
- `pull-request-target.yml`: demonstrates privileged PR checkout risk.
- `awguard.config.example.json`: sample config with a strict preset and overrides.

Try:

```bash
node ../bin/awguard.js unsafe-agent.yml --format graph
node ../bin/awguard.js unsafe-agent.yml --format html --output awguard-report.html
node ../bin/awguard.js unsafe-agent.yml --fix-dry-run
```

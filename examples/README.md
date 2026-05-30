# Examples

- `unsafe-agent.yml`: intentionally vulnerable AI triage workflow.
- `safe-agent.yml`: quieter workflow with read-only permissions and bounded prompt file.
- `suppressed-agent.yml`: demonstrates audited inline suppressions.
- `pull-request-target.yml`: demonstrates privileged PR checkout risk.
- `.github/copilot-instructions.md`: demonstrates risky persistent agent instruction guidance.
- `.mcp.json`: demonstrates mutable MCP server packages and committed MCP credentials.
- `awguard.config.example.json`: sample config with a strict preset and overrides.
- `pr-comment-bot.yml`: safe starter workflow for PR comments without `pull_request_target`.
- `lab/`: vulnerable and fixed mini-repositories for demos.
- `.gitlab-ci.yml`, `pre-commit-config.yaml`, `.vscode/tasks.json`: adoption examples for other workflows.

Try:

```bash
node ../bin/awguard.js unsafe-agent.yml --format graph
node ../bin/awguard.js unsafe-agent.yml --format html --output awguard-report.html
node ../bin/awguard.js unsafe-agent.yml --format migration
node ../bin/awguard.js . --format inventory
node ../bin/awguard.js . --format inventory-json
node ../bin/awguard.js unsafe-agent.yml --format score
node ../bin/awguard.js safe-agent.yml --format badge
node ../bin/awguard.js .mcp.json --format text
node ../bin/awguard.js . --format text
node ../bin/awguard.js init
node ../bin/awguard.js policy-wizard . --dry-run
node ../bin/awguard.js unsafe-agent.yml --fix-dry-run
```

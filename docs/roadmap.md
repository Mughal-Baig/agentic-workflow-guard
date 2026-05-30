# Scope Expansion Roadmap

## Research Signal

AWGuard should widen from "workflow scanner" into an agentic repository safety map while staying small and zero-dependency.

Current research points:

- GitHub Copilot now documents repository-level custom agents in `.github/agents`, repository MCP configuration, and repo-scoped agent behavior.
- VS Code and Copilot document MCP configuration in repository or workspace files such as `.vscode/mcp.json`.
- GitHub Actions security docs still warn that attacker-controlled GitHub context must be treated as untrusted input.
- OpenSSF Scorecard shows that security tools travel further when they produce a simple public score, badge, and clear adoption path.
- Existing MCP scanners focus on live server/tool inspection; AWGuard's lane is zero-execution repository scanning before those tools start.

## Feature List

1. Agentic Surface Inventory
   - Add `--format inventory`.
   - Group scanned files into GitHub Actions workflows, agent context files, and MCP configs.
   - Show findings, highest severity, and recommended next steps per surface.

2. Wider Agent Context Coverage
   - Scan `.github/agents/*.md` for Copilot custom agents.
   - Scan `.github/prompts/*.prompt.md` for reusable prompts.
   - Scan `.github/skills/**/SKILL.md` for repository skills.
   - Keep using `AWG012` for risky persistent instructions.

3. Policy Mode
   - Add an `awguard.policy.json` format for explicit allowlists.
   - Allow approved MCP commands, package pins, Docker digests, action owners, and workflow write scopes.
   - Report drift when the repository adds a new agent surface without policy.

4. Setup And Adoption Generator
   - Add a command that prints a starter GitHub Action, strict config, baseline command, and badge snippet.
   - Keep it as a print-only generator first so it remains safe.

5. Agent Capability SBOM
   - Export a machine-readable inventory of agent prompts, tools, MCP servers, permissions, secrets exposure, and write capabilities.
   - Make it useful for security reviews and audits.

6. Trend Reports
   - Compare current scan output with a previous JSON report.
   - Show newly added agent surfaces and newly introduced rules.

7. Vulnerable Lab
   - Add a set of intentionally unsafe mini-repositories under examples or a separate demo repo.
   - Each lab should include exploit explanation, AWGuard output, and fixed pattern.

8. GitHub App Or Scheduled Monitor
   - Long-term: run continuously across repositories.
   - Open issues when new agent surfaces appear or risk score drops.

## Work Plan

### Now

- Shipped `--format inventory`.
- Shipped `--format inventory-json`.
- Shipped `awguard init`.
- Shipped `awguard doctor`.
- Shipped `awguard explain`.
- Shipped `awguard badges`.
- Shipped `awguard demo`.
- Shipped `awguard templates`.
- Shipped `awguard policy-pack`.
- Shipped `scan.include` and `scan.exclude` config globs.
- Shipped Node 24 action runtime readiness.
- Shipped SARIF columns, snippets, stable AWGuard fingerprints, and rule categories.
- Shipped `AWG016`, `AWG017`, and `AWG018` for checkout credentials, unsafe writeback, and MCP input injection.
- Shipped machine-readable remediation codes.
- Shipped large-repo scan guardrails.
- Shipped end-to-end golden tests for lab, compare, inventory, and score outputs.
- Shipped baseline review/prune command.
- Shipped policy wizard starter config command.
- Shipped PR comment bot example and Docker image publish workflow.
- Shipped expanded comparison docs for `zizmor`, `actionlint`, OpenSSF Scorecard, secret scanning, and MCP runtime scanners.
- Shipped setup recipes for Claude Code, Codex, Cursor, GitHub Copilot, and Cline.
- Shipped report gallery, rule authoring guide, npm trusted publishing guide, and release checklist.
- Shipped npm trusted publishing workflow for tokenless OIDC publishing.
- Shipped real-world pattern corpus for public demos and regression coverage.
- Shipped VS Code task problem matcher and extension proof of concept.
- Shipped local AWI trend dashboard proof of concept with sample history data.
- Shipped `awguard.config.json` schema support.
- Shipped stable schemas for machine-readable report outputs.
- Shipped GitHub Actions job summaries.
- Shipped `--compare previous.json current.json`.
- Shipped agentic surface diffs in compare reports.
- Shipped first policy allowlists with `AWG015`.
- Expanded `AWG012` coverage to Copilot custom agents, prompts, and skills.
- Added Docker, GitLab CI, pre-commit, VS Code task, Marketplace, comparison, visual demo, and vulnerable lab assets.

### Next

- Add agent capability SBOM export for prompts, tools, MCP servers, permissions, and write paths.
- Add safer patch previews for common workflow permission fixes.
- Add richer policy ownership fields for approved file owners and review cadence.
- Add screenshot automation for the report gallery and Marketplace listing.
- Add more public corpus fixtures for popular agent PR review and triage patterns.
- Turn the VS Code and dashboard POCs into installable, tested integrations.

### Later

- Add trend reports for "new agent surface introduced" diffs.
- Explore a GitHub App after the CLI and Action adoption path is stable.

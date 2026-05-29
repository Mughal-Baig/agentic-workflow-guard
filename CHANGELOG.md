# Changelog

## 1.4.0

- Add `AWG013` for project MCP configs that start mutable packages, unpinned containers, or shell wrappers.
- Add `AWG014` for MCP configs that hardcode tokens, API keys, passwords, or authorization headers.
- Scan `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`, Windsurf, Cline, Roo, and related MCP config files without executing configured servers.

## 1.3.0

- Add `AWG012` for risky persistent agent instruction files.
- Scan `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, Copilot instructions, Cursor rules, and related instruction files.
- Flag instructions that bypass approvals, treat untrusted GitHub text as commands, or expose secrets.

## 1.2.0

- Add `--format score` for an Agentic Workflow Injection scorecard.
- Add `--format badge` for Shields.io endpoint badge JSON.
- Add a checked-in AWI risk badge for the project README.

## 1.1.1

- Add npm package metadata for the public `awguard` package.
- Update README install wording now that the package is ready for npm publishing.

## 1.1.0

- Rename the npm package target to `awguard` to avoid the already-taken `agentic-workflow-guard` npm name.
- Add `--format migration` for safe-output migration plans.
- Add migration guidance that converts unsafe agent jobs into read-only proposal jobs plus validated safe outputs or approved apply jobs.
- Document the migration report in the README and GitHub Action metadata.

## 1.0.0

- Add `graph` output with Mermaid attack-chain diagrams.
- Add standalone `html` attack graph reports.
- Add `--fix-dry-run` remediation guidance.
- Add built-in presets: `strict`, `claude-code`, `codex`, `aider`, and `triage-bot`.
- Add README launch polish with badges and an attack graph hook.

## 0.4.0

- Add `awguard.config.json` and `.awguard.json` auto-discovery.
- Add `--config` and GitHub Action `config` input.
- Support rule severity overrides and disabled rules.
- Support suppression policies with allowed rule ids and minimum reason length.

## 0.3.0

- Add inline suppression comments with required justifications.
- Add `AWG011` for invalid suppressions.
- Support same-line and next-line suppressions for specific rule ids.
- Document audited suppression usage.

## 0.2.0

- Add baseline files with `--write-baseline`.
- Add `--baseline` so CI can fail only on findings that are not already known.
- Add stable finding fingerprints to text, JSON, and SARIF output.
- Add GitHub Action inputs for baseline workflows.

## 0.1.0

- Initial CLI and GitHub Action.
- Add rules for AI-agent prompt injection, unsafe permissions, secrets, shell interpolation, `pull_request_target`, workflow artifacts, unsafe autonomous-agent flags, and unpinned third-party actions.
- Add text, JSON, Markdown, GitHub annotation, and SARIF output.

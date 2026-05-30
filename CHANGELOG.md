# Changelog

## Unreleased

- Add `awguard doctor` for setup, config, scan target, schema, and GitHub Actions summary checks.
- Add `awguard explain AWG###` for rule-level explanations and remediation guidance.
- Add `awguard badges` to print copyable README badge snippets.
- Add `awguard demo` for an offline unsafe-to-fixed vulnerable lab walkthrough.
- Add `awguard templates` for GitHub Actions, code scanning, GitLab CI, pre-commit, and VS Code snippets.
- Add `awguard policy-pack` for OSS, strict, and enterprise policy starter configs.
- Add `scan.include` and `scan.exclude` config globs for narrowing discovered scan files.
- Add `AWG016`, `AWG017`, and `AWG018` for checkout credentials, unsafe agent writeback, and MCP input injection.
- Improve SARIF metadata with stable AWGuard fingerprints, categories, snippets, and columns.
- Move the JavaScript GitHub Action runtime and bundled workflow templates to Node 24-ready actions.
- Add machine-readable remediation codes to JSON and SARIF findings.
- Add scan guardrails for maximum discovered files and maximum scanned file size.
- Add end-to-end golden tests for unsafe/fixed labs, compare, inventory, and score outputs.
- Add `awguard baseline-review` with explicit `--prune` support for stale baselines.
- Add `awguard policy-wizard` for reviewed policy allowlist starter configs.
- Add a safe PR comment workflow example and Docker image publishing workflow.
- Add `schemas/awguard.config.schema.json` for editor validation of AWGuard config files.
- Add schemas for JSON scan reports, inventories, comparisons, baselines, and badge endpoints.
- Add compare report surface diffs and `--compare ... --format json`.
- Add automatic GitHub Actions job summaries with scan metrics and top findings.
- Add expanded comparison, setup recipe, report gallery, rule authoring, release checklist, and npm trusted publishing docs.
- Add a trusted publishing GitHub Actions workflow for tokenless npm releases.
- Add a real-world pattern corpus for unsafe agent workflow, prompt, instruction, Cursor rule, and MCP examples.
- Add VS Code task, problem matcher, and extension proof-of-concept assets.
- Add a local dashboard proof of concept for AWI score and finding trends.
- Add opt-in `--fix` for narrow workflow hardening edits and improve `--fix-dry-run` with an autofix plan.
- Add `AWG019` for offline MCP package reputation policy using trusted package scopes.

## 1.6.0

- Add `awguard init` to print starter GitHub Action, strict config, baseline, report, and badge setup snippets.
- Add `--format inventory-json` for machine-readable agentic surface inventories.
- Add `--compare previous.json current.json` for introduced/resolved finding and file drift reports.
- Add policy allowlists with `AWG015` for unapproved files, MCP servers, packages, or commands.
- Add Docker, GitLab CI, pre-commit, VS Code task, Marketplace, comparison, demo, and vulnerable lab assets.

## 1.5.0

- Add `--format inventory` to map agentic repository surfaces by workflows, agent context files, and MCP configs.
- Scan GitHub Copilot custom agents, reusable prompts, and repository skills under `.github/agents`, `.github/prompts`, and `.github/skills`.
- Add a scope expansion roadmap for policy mode, agent capability SBOMs, trend reports, and adoption tooling.

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

# GitHub Marketplace Listing Draft

## Name

Agentic Workflow Guard

## Short Description

Scan GitHub Actions, agent instruction files, and MCP configs for AI-agent injection risk.

## Categories

- Security
- Code quality
- Utilities

## Full Description

Agentic Workflow Guard finds where untrusted GitHub issue, pull request, comment, branch, or artifact text can steer AI agents inside CI.

It scans:

- GitHub Actions workflows;
- persistent agent instruction files such as `AGENTS.md`, Copilot instructions, custom agents, prompts, and skills;
- MCP configs such as `.mcp.json`, `.vscode/mcp.json`, Cursor, Windsurf, Cline, and Roo config files.

Outputs include GitHub annotations, SARIF for code scanning, attack graphs, migration plans, AWI scorecards, badges, and agentic surface inventory reports.

## Example

```yaml
- uses: Mughal-Baig/agentic-workflow-guard@v0
  with:
    preset: strict
    fail-on: high
```

## Suggested Release Note

Use this Action before adding AI agents, custom prompts, or MCP tools to a repository.

## Screenshot Plan

1. Terminal demo from `docs/assets/terminal-demo.svg`.
2. Inventory output from `node ./bin/awguard.js examples/corpus --format inventory`.
3. Attack graph from `node ./bin/awguard.js examples/lab/unsafe --format graph`.
4. Migration plan from `node ./bin/awguard.js examples/lab/unsafe --format migration`.
5. GitHub Code Scanning page after SARIF upload.
6. Policy wizard output from `node ./bin/awguard.js policy-wizard examples/corpus --dry-run`.
7. Dashboard POC from `examples/dashboard`.
8. VS Code Problems panel from `examples/vscode-extension`.

## Docs To Link

- Comparison: `docs/comparison.md`
- Setup recipes: `docs/setup-recipes.md`
- Report gallery: `docs/report-gallery.md`
- Rule authoring: `docs/rule-authoring.md`
- Release checklist: `docs/release-checklist.md`

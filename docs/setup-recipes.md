# Setup Recipes For AI Coding Agent Repositories

Use these recipes when a repository already has AI coding agents, prompt files, MCP configs, or GitHub Actions that call LLM tools.

## Universal First Run

```bash
npx awguard@latest doctor
npx awguard@latest . --format inventory
npx awguard@latest policy-wizard . --dry-run
npx awguard@latest . --preset strict --format sarif --output awguard.sarif --fail-on none
```

Review the inventory first. It shows which files give agents instructions, tools, credentials, or workflow authority.

## GitHub Actions

Create `.github/workflows/agentic-workflow-guard.yml`:

```yaml
name: Agentic Workflow Guard

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: Mughal-Baig/agentic-workflow-guard@v0
        with:
          preset: strict
          format: sarif
          output: awguard.sarif
          fail-on: high
      - uses: github/codeql-action/upload-sarif@v4
        if: always()
        with:
          sarif_file: awguard.sarif
          category: agentic-workflow-guard
```

If the repository has many old findings, start with a baseline:

```bash
npx awguard@latest . --write-baseline awguard.baseline.json --fail-on none
```

Then add `baseline: awguard.baseline.json` to the Action inputs.

## Claude Code

Files to review:

- `CLAUDE.md`
- `AGENTS.md`
- `.mcp.json`
- `claude_desktop_config.json`
- `.github/workflows/*.yml`

Recommended checks:

```bash
npx awguard@latest . --preset claude-code --format inventory
npx awguard@latest CLAUDE.md --format text
npx awguard@latest .mcp.json --format text
```

Hardening checklist:

- Keep `CLAUDE.md` conservative about approvals and command execution.
- Do not commit MCP auth tokens.
- Pin MCP server packages to exact versions.
- Avoid telling agents to obey issue, PR, or comment text as commands.
- Split read-only agent analysis from any writeback job.

## Codex

Files to review:

- `AGENTS.md`
- `CODEX.md`
- `.mcp.json`
- `.github/workflows/*.yml`

Recommended checks:

```bash
npx awguard@latest . --preset codex --format inventory
npx awguard@latest AGENTS.md --format text
npx awguard@latest . --format migration
```

Hardening checklist:

- Keep repository instructions focused on code style, testing, and review expectations.
- Require human approval before file writes, shell execution, or privileged repository changes.
- Do not put secrets or package tokens in MCP config.
- Use `permissions: contents: read` for agent analysis jobs.

## Cursor

Files to review:

- `.cursorrules`
- `.cursor/rules/*.{md,mdc,txt}`
- `.cursor/mcp.json`
- `.github/workflows/*.yml`

Recommended checks:

```bash
npx awguard@latest . --format inventory
npx awguard@latest .cursor/mcp.json --format text
```

Hardening checklist:

- Treat Cursor rules as persistent agent instructions.
- Avoid global autonomy instructions such as "never ask for approval."
- Pin project MCP packages and containers.
- Keep workspace rules separate from secrets and credentials.

## GitHub Copilot

Files to review:

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/agents/*.md`
- `.github/prompts/*.prompt.md`
- `.github/skills/**/SKILL.md`
- `.github/workflows/*.yml`

Recommended checks:

```bash
npx awguard@latest . --format inventory
npx awguard@latest .github --format text
```

Hardening checklist:

- Keep reusable prompts bounded and reviewable.
- Do not tell Copilot agents to follow PR or issue text as trusted instructions.
- Keep skills and custom agents scoped to specific safe tasks.
- Use branch, pull request, or artifact containment for any AI-generated patch.

## Cline

Files to review:

- `.clinerules`
- `cline_mcp_settings.json`
- `.cline/mcp_settings.json`
- `.github/workflows/*.yml`

Recommended checks:

```bash
npx awguard@latest . --format inventory
npx awguard@latest cline_mcp_settings.json --format text
```

Hardening checklist:

- Keep `.clinerules` from weakening approval boundaries.
- Do not commit tokens in Cline MCP settings.
- Prefer pinned MCP package versions.
- Review new MCP servers before they are available to an agent.

## Safe PR Comment Bot Pattern

Copy `examples/pr-comment-bot.yml` into `.github/workflows/awguard-pr-comment.yml` if you want AWGuard to comment on pull requests.

The example intentionally uses:

- `pull_request`, not `pull_request_target`.
- `contents: read`.
- `pull-requests: write` only for same-repository PR comments.
- No secrets in forked PR execution.

## Adoption Order

1. Run `doctor` and `inventory`.
2. Add the GitHub Action with `fail-on: none`.
3. Generate and commit a baseline if needed.
4. Enable SARIF upload.
5. Turn on `fail-on: high`.
6. Add a reviewed `awguard.config.json` policy.
7. Review baseline drift weekly with `awguard baseline-review`.

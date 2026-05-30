# How AWGuard Compares

Agentic Workflow Guard is not trying to replace general GitHub Actions linters, project health scorecards, secret scanners, or live MCP inspectors. Its lane is narrower: find places where repository automation gives AI agents attacker-influenced text, tools, secrets, or write authority.

## Short Version

| Tool | Best at | AWGuard difference | Use together |
| --- | --- | --- | --- |
| `zizmor` | Static security analysis for GitHub Actions. | AWGuard adds AI-agent prompt flow, MCP config, persistent agent instruction, and writeback boundary checks. | Run `zizmor` for broad Actions hardening, then AWGuard for agentic workflow injection risk. |
| `actionlint` | Syntax, expression, input, and workflow semantics checks for GitHub Actions. | AWGuard is not a syntax checker. It assumes valid YAML and looks for trust-boundary patterns. | Run `actionlint` first so broken workflows are caught before security review. |
| OpenSSF Scorecard | Repository-level supply-chain health signals. | AWGuard produces a focused AWI score, inventory, SARIF, and attack graph for agentic surfaces. | Use Scorecard for public trust posture, AWGuard for AI-agent risk inside the repo. |
| Secret scanners | Hardcoded credential detection and push protection. | AWGuard looks for secrets exposed to untrusted agent workflows and MCP configs, even when the secret is referenced through `${{ secrets.NAME }}`. | Keep GitHub secret scanning enabled, then use AWGuard to check whether agents can reach secrets. |
| MCP runtime scanners | Live server and tool behavior inspection. | AWGuard is zero-execution. It reviews committed MCP config before a server starts. | Run AWGuard in CI, then run live MCP inspection in a sandbox for approved servers. |

## What AWGuard Owns

AWGuard focuses on a threat shape that general CI tools rarely model:

```text
untrusted GitHub event text
  -> AI agent prompt, instruction, MCP input, or shell script
  -> tools, secrets, token permissions, or repository writeback
  -> repository change, data exposure, or unsafe automation
```

The scanner turns that shape into:

- Rule findings such as `AWG001`, `AWG004`, `AWG012`, `AWG013`, `AWG017`, and `AWG018`.
- SARIF for GitHub code scanning.
- Human-readable attack graphs and migration plans.
- Agentic surface inventories for workflows, instruction files, and MCP configs.
- Baselines and compare reports for gradual adoption.
- Policy allowlists for reviewed files, MCP servers, packages, and commands.

## Tool-by-tool Notes

### zizmor

[`zizmor`](https://docs.zizmor.sh/) is a static analysis tool for GitHub Actions and can find common CI/CD security issues. AWGuard should sit beside it, not in front of it.

Use `zizmor` for:

- GitHub Actions security audits.
- Broad CI/CD hardening checks.
- Existing GitHub Actions security recipes and integrations.

Use AWGuard for:

- Agent prompts built from issue, comment, PR, branch, or workflow input text.
- Agent jobs with broad write permissions or persisted checkout credentials.
- Unsafe agent writeback paths.
- MCP configs that use mutable packages, shell wrappers, unpinned containers, or hardcoded credentials.
- Persistent agent instruction files that weaken approval or secret boundaries.

### actionlint

[`actionlint`](https://github.com/rhysd/actionlint) is a static checker for GitHub Actions workflows. It checks syntax, expression semantics, action usage, reusable workflow contracts, and shell/python snippets.

Use `actionlint` for:

- Invalid workflow keys.
- Broken `${{ }}` expressions.
- Missing or mismatched reusable workflow inputs.
- Shellcheck-style script quality.

Use AWGuard after that for:

- Whether a valid workflow gives an AI agent too much authority.
- Whether untrusted GitHub context reaches an AI prompt, MCP input, or shell boundary.
- Whether an agent workflow is safe to run on PRs, comments, and issue events.

### OpenSSF Scorecard

[OpenSSF Scorecard](https://github.com/ossf/scorecard) evaluates repository security health. Its checks include areas such as dangerous workflows, pinned dependencies, packaging, token permissions, and vulnerabilities.

Use Scorecard for:

- Public repository trust signals.
- Broad open-source security hygiene.
- A badge that maintainers and users already recognize.

Use AWGuard for:

- A narrower score around Agentic Workflow Injection risk.
- Reviewable findings that explain which exact prompt, workflow, instruction, or MCP config creates the risk.
- Repository-specific adoption artifacts: baselines, migration plans, and policy allowlists.

### GitHub Secret Scanning And Other Secret Scanners

[GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/about-secret-scanning) detects exposed credentials in code, issues, PRs, discussions, wikis, and other supported surfaces. GitHub also documents ways to enable additional leak detection and push protection.

Use secret scanners for:

- Detecting leaked token values.
- Blocking supported secrets before they land.
- Alerting and rotation workflows.

Use AWGuard for:

- Finding workflows where `${{ secrets.NAME }}` is available to an untrusted AI-agent job.
- Finding committed MCP auth material in project-scoped configs.
- Explaining how to split privileged secrets into reviewed workflows.

### MCP Runtime Scanners

Runtime MCP scanners and inspectors can execute or introspect live servers. AWGuard intentionally does not start MCP servers. That makes it safe to run in pull requests and on untrusted branches.

Use runtime inspection for:

- Tool schemas.
- Server behavior.
- Network access and live capabilities.

Use AWGuard for:

- Pre-execution review of committed `.mcp.json`, `.vscode/mcp.json`, Cursor, Windsurf, Cline, Roo, and similar config files.
- Mutable package and container launch detection.
- Policy drift when a new MCP server appears in the repository.

## Recommended Stack

For a public repository using AI coding agents:

```yaml
name: Security

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  actions-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: actionlint

  agentic-workflow-guard:
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

Add `zizmor`, Scorecard, and secret scanning according to the repository's security program. AWGuard is the agentic layer in that stack.

## Official References

- zizmor documentation: <https://docs.zizmor.sh/>
- actionlint repository: <https://github.com/rhysd/actionlint>
- OpenSSF Scorecard repository: <https://github.com/ossf/scorecard>
- GitHub secret scanning docs: <https://docs.github.com/en/code-security/concepts/secret-security/about-secret-scanning>
- npm trusted publishing docs: <https://docs.npmjs.com/trusted-publishers/>

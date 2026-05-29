# Agentic Workflow Guard

`agentic-workflow-guard` is a small, zero-dependency scanner for GitHub Actions workflows that use AI coding agents, LLMs, or automated review bots.

It looks for a new class of CI/CD risk: untrusted issue, pull request, comment, or branch text flowing into an AI agent prompt, then into write-capable tools, secrets, or shell scripts.

## Why This Project Can Reach People

Developers want AI speed, but they also want a safety net. Stack Overflow's 2025 Developer Survey found that agent users report productivity gains, while 81% of respondents still worry about security and data privacy for AI agents. GitHub's Octoverse 2025 says AI is now standard in development, with more than 1.1 million public repositories using an LLM SDK and 80% of new developers using Copilot in their first week.

The missing piece is a tool that is easy enough for maintainers to add before they fully understand the security problem. This project gives them one command and one GitHub Action.

## Install

For local development:

```bash
npm test
node ./bin/awguard.js .
```

After publishing to npm:

```bash
npx agentic-workflow-guard .
```

## Use In GitHub Actions

After you upload this repository to GitHub, users can add:

```yaml
name: Agentic Workflow Guard

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  scan-agent-workflows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Mughal-Baig/agentic-workflow-guard@v0
        with:
          fail-on: high
```

To adopt the scanner without breaking CI on old findings, commit a baseline file and use:

```yaml
      - uses: Mughal-Baig/agentic-workflow-guard@v0
        with:
          baseline: awguard.baseline.json
          fail-on: high
```

## Use With GitHub Code Scanning

Generate SARIF and upload it with GitHub's official CodeQL SARIF upload action:

```yaml
name: Agentic Workflow Guard Code Scanning

on:
  push:
  schedule:
    - cron: '22 5 * * 1'
  workflow_dispatch:

permissions:
  contents: read
  security-events: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Mughal-Baig/agentic-workflow-guard@v0
        with:
          format: sarif
          output: awguard.sarif
          fail-on: none
      - uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: awguard.sarif
          category: agentic-workflow-guard
```

## CLI

```bash
awguard [path] [--format text|json|markdown|github|sarif] [--output file] [--baseline file] [--write-baseline file] [--fail-on none|low|medium|high|critical]
```

Examples:

```bash
node ./bin/awguard.js examples/unsafe-agent.yml
node ./bin/awguard.js . --format markdown --fail-on medium
node ./bin/awguard.js . --format sarif --output awguard.sarif --fail-on none
node ./bin/awguard.js . --write-baseline awguard.baseline.json
node ./bin/awguard.js . --baseline awguard.baseline.json --fail-on high
node ./bin/awguard.js . --format github --fail-on high
```

## Baseline Mode

Baseline mode lets a project start using the scanner without failing CI for already-known issues.

Create a baseline:

```bash
node ./bin/awguard.js . --write-baseline awguard.baseline.json --fail-on none
```

Then fail only on findings that are not in the baseline:

```bash
node ./bin/awguard.js . --baseline awguard.baseline.json --fail-on high
```

The baseline stores stable finding fingerprints, not secrets or workflow contents.

## Inline Suppressions

Suppressions are for reviewed false positives. They must include a reason after `--`.

```yaml
# awguard-disable-next-line AWG001,AWG002 -- Reviewed: this workflow only runs after maintainer approval.
- run: openai --prompt "${{ github.event.comment.body }}"

permissions: write-all # awguard-disable-line AWG004 -- Reviewed: release job needs tag write access.
```

If you omit rule ids, the suppression applies to all findings on the target line. Suppression comments without a clear reason are reported as `AWG011`.

## What It Detects

| Rule | Severity | What it finds |
| --- | --- | --- |
| AWG001 | High/Critical | Untrusted GitHub event text passed into an AI agent prompt |
| AWG002 | High | Untrusted GitHub context interpolated in a shell script |
| AWG003 | Critical | `pull_request_target` checking out PR head code |
| AWG004 | High | AI-agent workflows with broad write permissions |
| AWG005 | High | Secrets exposed to untrusted agent workflows |
| AWG006 | High | Agent flags such as `--dangerously-skip-permissions` or `--yolo` |
| AWG007 | High | Model/agent output names flowing into command execution |
| AWG008 | Medium | Agent workflow missing explicit `permissions` |
| AWG009 | Medium | `workflow_run` consuming artifacts before scripts |
| AWG010 | Low | Third-party actions in agent workflows not pinned to a SHA |
| AWG011 | Medium | Invalid suppression comments |

## Example Finding

```text
[CRITICAL] AWG001 Untrusted text reaches an AI agent prompt
  .github/workflows/ai-triage.yml:24
  User-controlled GitHub event text appears to be used as prompt/input for an AI agent.
  Fix: Keep issue, PR, comment, and branch text out of privileged agent prompts unless it is reviewed, delimited, and sanitized.
```

## Roadmap

- Project config for custom rule severity and allowed suppressions.
- Autofix suggestions for `permissions` and safe env-variable patterns.
- Rule packs for Claude Code, Codex, Gemini, Copilot, Aider, and custom agents.
- Optional taint graph output for security reviews.

## Research Backing

See [docs/market-analysis.md](docs/market-analysis.md) for the demand analysis, gap, audience, and launch plan.

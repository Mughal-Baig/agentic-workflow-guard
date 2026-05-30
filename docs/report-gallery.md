# Report Gallery

AWGuard has several report formats because different users need different entry points. The gallery below shows when to use each report and which command creates it.

## Text Findings

Use for local terminal review.

```bash
npx awguard@latest examples/lab/unsafe
```

Best for:

- First scans.
- Quick triage.
- Copying a finding into an issue.

## GitHub Annotations

Use inside GitHub Actions.

```yaml
- uses: Mughal-Baig/agentic-workflow-guard@v0
  with:
    preset: strict
    fail-on: high
```

Best for:

- Pull request checks.
- Inline workflow annotations.
- Blocking newly introduced high-risk patterns.

## SARIF

Use for GitHub code scanning.

```bash
npx awguard@latest . --format sarif --output awguard.sarif --fail-on none
```

Best for:

- Security tab visibility.
- Alert tracking.
- Teams that already use CodeQL or third-party SARIF uploads.

## Inventory

Use to explain the repository's agentic surface area.

```bash
npx awguard@latest . --format inventory
npx awguard@latest . --format inventory-json --output awguard-inventory.json
```

Best for:

- Security reviews before adding coding agents.
- Finding all instruction files and MCP configs.
- Showing non-security maintainers where agent authority lives.

## Attack Graph

Use to explain why a finding matters.

```bash
npx awguard@latest examples/lab/unsafe --format graph
```

Best for:

- Pull request discussions.
- Issue reports.
- Design reviews where a table of findings is too flat.

## HTML Report

Use when you need a standalone shareable artifact.

```bash
npx awguard@latest examples/lab/unsafe --format html --output awguard-report.html
```

Best for:

- Release assets.
- Blog posts.
- Marketplace screenshots.

## Migration Plan

Use when a project needs practical fixes.

```bash
npx awguard@latest examples/lab/unsafe --format migration --output awguard-migration.md
```

Best for:

- Converting unsafe agent jobs into read-only proposal jobs.
- Splitting privileged writeback into reviewed workflows.
- Turning findings into task lists.

## Score And Badge

Use when you want a public progress signal.

```bash
npx awguard@latest . --format score
npx awguard@latest . --format badge --output docs/awguard-badge.json
```

Best for:

- README badges.
- Tracking cleanup progress.
- Showing an easy-to-understand risk grade.

## Compare

Use to show what changed between branches, releases, or scheduled scans.

```bash
npx awguard@latest . --format json --output current-awguard.json
npx awguard@latest --compare previous-awguard.json current-awguard.json
```

Best for:

- Release gates.
- Scheduled drift monitoring.
- Baseline cleanup work.

## Dashboard POC

Use to show AWI score, finding count, introduced/resolved findings, and agentic surface growth over time.

```bash
cd examples/dashboard
python3 -m http.server 8090
```

Open `http://127.0.0.1:8090/`.

Best for:

- GitHub App dashboard planning.
- GitHub Pages demos.
- Organization-level trend conversations.

## Policy Wizard

Use to generate a starter allowlist for reviewed agentic surfaces.

```bash
npx awguard@latest policy-wizard . --dry-run
```

Best for:

- Moving from detection to governance.
- Reviewing newly added MCP servers or agent instruction files.
- Making repository-specific policy explicit.

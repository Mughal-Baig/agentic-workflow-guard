# Rule Authoring Guide

This guide is for contributors adding new AWGuard rules or improving existing detections.

## Rule Design Principles

Good AWGuard rules are:

- Agentic: they involve AI agents, MCP servers, persistent instructions, or automation that hands authority to a model-driven tool.
- Boundary-focused: they explain a trust boundary, not only a style preference.
- Reviewable: the finding should point to a specific file, line, evidence string, and remediation.
- CI-safe: rules must not execute repository code, start MCP servers, call network services, or require secrets.
- Low-noise: false positives should have clear suppression and configuration paths.

## Add A Rule

1. Add a `ruleCatalog` entry in `src/scanner.js`.
2. Choose a stable rule id such as `AWG020`.
3. Set `title`, default `severity`, `remediationCode`, and `suggestion`.
4. Implement a focused detector function in `src/scanner.js`.
5. Call the detector from the relevant scan path:
   - `scanWorkflowText` for workflow content.
   - `scanAgentInstructionText` for persistent instruction files.
   - `scanMcpConfigText` for MCP configs.
   - `scanFile` or `detectFilePolicy` for file-level policy checks.
6. Add unit tests that cover the unsafe and safe pattern.
7. Add an example fixture if the rule teaches a common real-world pattern.
8. Update README rule tables and any docs that mention rule coverage.
9. Run `npm test`.

## Severity Guidance

| Severity | Use when |
| --- | --- |
| `critical` | Untrusted input can plausibly reach secrets, write tokens, privileged checkout, protected branch writeback, or hardcoded auth material. |
| `high` | The pattern can change repository state, guide an agent with attacker-controlled text, or weaken approval boundaries. |
| `medium` | The pattern creates drift, missing guardrails, or review ambiguity without direct exploitability. |
| `low` | The pattern is hardening guidance for security-sensitive agent workflows. |

## Remediation Codes

Every finding has a `remediationCode` because dashboards should not depend on free-text suggestions.

Use this naming shape:

```text
domain.action-specific-fix
```

Examples:

- `permissions.tighten-token`
- `mcp.pin-server`
- `prompt.isolate-untrusted-text`
- `writeback.use-pr-branch`

Do not rename existing remediation codes unless there is a compatibility reason and changelog entry.

## Detector Checklist

Before opening a PR, confirm:

- The detector does not execute code or parse arbitrary shell with unsafe side effects.
- The finding evidence is short and specific.
- The detector respects inline suppressions through `addFinding`.
- Rule severity can be overridden through config.
- JSON, Markdown, SARIF, GitHub annotation, and text outputs still render.
- The unsafe test fails before the detector and passes after it.
- The safe test proves a recommended remediation avoids the finding.

## Fixture Checklist

Examples should be safe to publish:

- No real tokens, secrets, domains, private names, or customer data.
- Intentionally fake secrets should use obvious placeholder values.
- Unsafe examples should be labeled as unsafe.
- Fixed examples should show the recommended pattern, not only silence the scanner.
- Every new fixture should be referenced from `examples/README.md`.

## Documentation Checklist

When adding or changing a rule, update:

- `README.md` rule table.
- `CHANGELOG.md`.
- `docs/report-gallery.md` if the output teaches a new report shape.
- `docs/comparison.md` only if the rule changes AWGuard's position beside other tools.
- `schemas/` only if the machine-readable contract changes.

## Review Checklist

Reviewers should ask:

- Does this find a real agentic workflow risk?
- Could a maintainer understand and fix the finding in less than five minutes?
- Does the safe example avoid the risk rather than hiding it?
- Does the rule duplicate a better tool such as `actionlint` or a secret scanner?
- Does this rule keep AWGuard zero-dependency and safe for pull request scans?

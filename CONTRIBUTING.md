# Contributing

Thanks for helping improve Agentic Workflow Guard.

## Good First Contributions

- Add a small unsafe workflow, agent instruction, or MCP config example.
- Improve a rule message or remediation snippet.
- Add a test for a false positive or missed risky pattern.
- Improve documentation for GitHub Actions, Copilot, Codex, Claude Code, Cursor, Windsurf, or MCP usage.

## Development

```bash
npm test
node ./bin/awguard.js . --format inventory
node ./bin/awguard.js examples --format text --fail-on none
```

The package is intentionally zero-dependency. Please avoid adding runtime dependencies unless the feature cannot be implemented safely without one.

## Pull Requests

- Keep changes focused.
- Add or update tests for scanner behavior.
- Update `README.md` or `docs/` when changing user-facing behavior.
- Run `npm test` before opening a pull request.

## Rule Design

Rules should be conservative and explain the attack path. A finding should help maintainers answer:

```text
What untrusted input or mutable tool can influence the agent?
What capability does the agent get?
What authority or secret could be affected?
How should the maintainer reduce the risk?
```

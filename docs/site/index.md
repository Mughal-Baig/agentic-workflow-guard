# Agentic Workflow Guard

Agentic Workflow Guard maps every place a repository gives AI agents instructions, tools, secrets, or write power.

## Quick Start

```bash
npx awguard@latest . --format inventory
npx awguard@latest . --format score
npx awguard@latest . --format migration
```

## What It Scans

- GitHub Actions workflows
- `AGENTS.md`, Copilot instructions, custom agents, prompts, and skills
- MCP configs for VS Code, Cursor, Windsurf, Cline, Roo, and Claude Desktop

## Key Reports

- `--format inventory`: agentic surface map
- `--format graph`: attack-chain diagram
- `--format migration`: safe-output migration plan
- `--format score`: AWI risk score
- `--compare old.json new.json`: trend report for newly introduced risk

## Links

- [GitHub repository](https://github.com/Mughal-Baig/agentic-workflow-guard)
- [npm package](https://www.npmjs.com/package/awguard)
- [Roadmap](../roadmap.md)

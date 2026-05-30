# Vulnerable Lab

This lab gives maintainers a tiny before/after set for demos, screenshots, and testing.

## Unsafe

```bash
npx awguard@latest examples/lab/unsafe --format inventory
npx awguard@latest examples/lab/unsafe --format graph
npx awguard@latest examples/lab/unsafe --fix-dry-run
```

The unsafe version includes:

- an AI triage workflow that reads issue comments;
- broad token permissions;
- an unsafe persistent agent instruction;
- a mutable MCP server with a committed token-shaped value.

## Fixed

```bash
npx awguard@latest examples/lab/fixed --format inventory
npx awguard@latest examples/lab/fixed --fail-on high
```

The fixed version uses read-only workflow permissions, conservative agent instructions, and pinned MCP package startup with prompted credentials.

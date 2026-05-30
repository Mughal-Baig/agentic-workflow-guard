# Real-world Pattern Corpus

This corpus contains intentionally unsafe mini fixtures based on common public repository patterns. The files are safe to publish and use fake placeholder secrets only.

Use it to test AWGuard output:

```bash
node ../../bin/awguard.js . --format inventory
node ../../bin/awguard.js . --format score
node ../../bin/awguard.js . --format migration
```

Included patterns:

- PR review text flowing into an autonomous agent prompt.
- `pull_request_target` checking out pull request head code.
- Direct agent writeback from a job with write permissions.
- Persistent agent instructions that weaken approval and secret boundaries.
- Copilot reusable prompts that treat PR text as trusted commands.
- Cursor rules that enable unsafe autonomy.
- MCP config with mutable package execution and committed auth material.

Do not copy the unsafe patterns into production. Use the findings and migration plan to learn the safer equivalent.

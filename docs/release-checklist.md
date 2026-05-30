# Release And Marketplace Checklist

Use this checklist before cutting a public AWGuard release or updating the GitHub Marketplace listing.

## Pre-release

- Confirm `npm test` passes.
- Confirm `git diff --check` passes.
- Confirm `npm pack --dry-run` includes the intended docs, examples, schemas, action metadata, and CLI files.
- Run `node ./bin/awguard.js . --format inventory`.
- Run `node ./bin/awguard.js . --format score`.
- Run `node ./bin/awguard.js examples/lab/unsafe --format html --output /tmp/awguard-report.html`.
- Review `CHANGELOG.md`.
- Confirm README badges render.
- Confirm the project site loads.
- Confirm the GitHub Marketplace draft matches current features.

## Screenshots To Capture

| Screenshot | Command or page |
| --- | --- |
| Terminal demo | `node ./bin/awguard.js demo` |
| Inventory report | `node ./bin/awguard.js examples/lab/unsafe --format inventory` |
| AWI score | `node ./bin/awguard.js examples/lab/unsafe --format score` |
| SARIF / code scanning | GitHub Security tab after SARIF upload |
| HTML attack graph | `node ./bin/awguard.js examples/lab/unsafe --format html --output awguard-report.html` |
| Policy wizard | `node ./bin/awguard.js policy-wizard examples/lab/unsafe --dry-run` |
| Baseline review | `node ./bin/awguard.js baseline-review . --baseline awguard.baseline.json` |

## Marketplace Copy

Short description:

```text
Scan GitHub Actions, agent instruction files, and MCP configs for AI-agent injection risk.
```

Recommended categories:

- Security
- Code quality
- Utilities

Primary value points:

- Finds untrusted GitHub text reaching AI prompts, MCP inputs, or shell scripts.
- Flags agent jobs with unsafe write permissions, secrets, and writeback.
- Scans AGENTS.md, Copilot instructions, custom agents, prompts, skills, Cursor rules, and MCP configs.
- Produces SARIF, attack graphs, migration plans, inventories, scorecards, badges, and baselines.

## Release

1. Bump `package.json` version.
2. Commit with a concise release message.
3. Push `main`.
4. Create a GitHub tag such as `v1.7.0`.
5. Create a GitHub Release from the tag.
6. Confirm `npm-publish.yml` either publishes `awguard` or cleanly skips release auto-publish until `NPM_TRUSTED_PUBLISHING_ENABLED=true`.
7. Confirm `docker.yml` publishes GHCR images.
8. Update the moving `v0` action tag if the Action entrypoint changed.
9. Confirm `npx awguard@latest . --version` or `npm view awguard version`.
10. Add release screenshots and notes to the GitHub Release.

## Post-release

- Check GitHub Actions.
- Check npm package contents.
- Check GitHub code scanning.
- Check the GitHub Pages site.
- Close any release tracking issues that were not closed by commit messages.
- Post a short launch note with the new report, rule, or workflow users can copy.

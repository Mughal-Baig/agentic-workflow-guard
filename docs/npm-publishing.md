# npm Trusted Publishing And Provenance

This project publishes the `awguard` npm package. The preferred release path is npm trusted publishing from GitHub Actions, which uses OIDC instead of a long-lived npm automation token.

## Why Use Trusted Publishing

Trusted publishing reduces risk because npm accepts a short-lived publish identity from a specific workflow instead of requiring a saved token. npm also generates provenance automatically for public packages published through trusted publishing from a public GitHub repository.

Official docs:

- npm trusted publishing: <https://docs.npmjs.com/trusted-publishers/>
- npm provenance statements: <https://docs.npmjs.com/generating-provenance-statements/>
- npm provenance viewing: <https://docs.npmjs.com/viewing-package-provenance/>

## One-time npm Setup

On npmjs.com:

1. Open the `awguard` package.
2. Go to package settings.
3. Find Trusted Publisher.
4. Select GitHub Actions.
5. Use these fields:

| Field | Value |
| --- | --- |
| Organization or user | `Mughal-Baig` |
| Repository | `agentic-workflow-guard` |
| Workflow filename | `npm-publish.yml` |
| Environment name | leave empty unless using a protected GitHub environment |
| Allowed actions | `npm publish` |

After the first successful trusted publish, consider setting publishing access to require 2FA and disallow tokens. Do this only after trusted publishing is verified.

## Release Workflow

The repository includes `.github/workflows/npm-publish.yml`.

It:

- Runs only on GitHub-hosted runners.
- Uses `permissions: id-token: write`.
- Runs tests before publishing.
- Publishes with `npm publish --access public`.
- Avoids storing `NPM_TOKEN`.

## Maintainer Release Checklist

1. Confirm `npm test` passes locally.
2. Confirm `git status` is clean.
3. Update `CHANGELOG.md`.
4. Bump `package.json` version.
5. Commit and push.
6. Create a GitHub Release or run the workflow manually.
7. Confirm the package appears on npm.
8. Confirm npm shows provenance for the version.
9. Confirm GitHub Actions, Code Scanning, and Docker image workflows pass.

## Manual Fallback

Manual publish is still possible for emergencies:

```bash
npm login
npm publish --access public --provenance
```

Manual publishing may require 2FA depending on account settings. Prefer the trusted publishing workflow for normal releases.

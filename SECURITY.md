# Security Policy

Agentic Workflow Guard is a security tool, so responsible reporting matters.

## Supported Versions

The latest GitHub release and npm package are supported. Older versions may receive fixes when the issue is severe and the fix is low risk.

## Reporting A Vulnerability

Please do not open a public issue for a vulnerability that could help attackers bypass AWGuard or exploit users.

Use GitHub private vulnerability reporting if it is available on the repository. If that is not available, contact the maintainer through the npm package profile and include:

- affected version or commit;
- a minimal workflow, agent instruction file, or MCP config that reproduces the issue;
- expected finding and actual behavior;
- whether the issue is a false negative, false positive, crash, or supply-chain concern.

## Scope

In scope:

- scanner false negatives that miss clear Agentic Workflow Injection risk;
- crashes caused by valid repository files;
- unsafe behavior in the GitHub Action wrapper;
- package integrity or release-process concerns.

Out of scope:

- attacks that require changing the user's local machine outside the repository;
- generic AI model jailbreaks with no repository, workflow, instruction, or MCP config impact;
- findings already documented as accepted limitations.

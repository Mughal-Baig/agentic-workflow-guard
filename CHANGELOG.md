# Changelog

## 0.3.0

- Add inline suppression comments with required justifications.
- Add `AWG011` for invalid suppressions.
- Support same-line and next-line suppressions for specific rule ids.
- Document audited suppression usage.

## 0.2.0

- Add baseline files with `--write-baseline`.
- Add `--baseline` so CI can fail only on findings that are not already known.
- Add stable finding fingerprints to text, JSON, and SARIF output.
- Add GitHub Action inputs for baseline workflows.

## 0.1.0

- Initial CLI and GitHub Action.
- Add rules for AI-agent prompt injection, unsafe permissions, secrets, shell interpolation, `pull_request_target`, workflow artifacts, unsafe autonomous-agent flags, and unpinned third-party actions.
- Add text, JSON, Markdown, GitHub annotation, and SARIF output.

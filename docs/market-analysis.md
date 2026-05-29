# Market Analysis

## The Opportunity

The public GitHub project with the best reach right now is not another general AI wrapper. The stronger opportunity is a safety tool for teams adopting AI coding agents inside GitHub Actions.

Why:

- GitHub's Octoverse 2025 says AI is now standard in development, more than 1.1 million public repositories use an LLM SDK, and 80% of new GitHub developers use Copilot in their first week.
- Stack Overflow's 2025 Developer Survey reports that AI agents help developers move faster, but 81% of respondents are concerned about security and privacy of data when using AI agents.
- OWASP's GenAI Security Project exists because LLM and agentic systems created a new security category, not just a new developer convenience.
- GitHub's own Actions security docs warn that attacker-controlled `github` context values such as issue bodies, PR titles, branch names, and comments must be treated as untrusted.
- A 2026 paper on Agentic Workflow Injection found real GitHub Actions workflows where untrusted event text entered agent prompts or downstream scripts, with hundreds of exploitable cases.

## What Is Missing

Existing GitHub Actions security tools tend to focus on broad CI/CD issues: unpinned actions, `pull_request_target`, dangerous permissions, and secrets. Existing AI safety tools tend to focus on app prompts, RAG pipelines, or runtime model behavior.

The gap is the intersection:

```text
untrusted GitHub event text -> AI agent prompt -> privileged GitHub Actions environment
```

Maintainers need a tool that explains this specific risk in their workflow files, without asking them to adopt a full enterprise scanner.

## Who Wants It

- Open-source maintainers adding AI issue triage, PR review, or coding agents.
- Small teams experimenting with Claude Code, Codex, Copilot, Gemini, Aider, or custom LLM scripts in CI.
- DevSecOps engineers who need a quick control before allowing AI agents in repositories.
- Security researchers looking for a small, readable rule engine they can improve.

## Product Shape

The first version should be:

- Zero dependency, so people trust and inspect it quickly.
- CLI first, because developers can test it locally before adding CI.
- GitHub Action ready, because maintainers want one copy-paste workflow step.
- Text, JSON, Markdown, GitHub annotation, and SARIF output.
- Conservative rules with useful explanations, not a noisy wall of generic warnings.

## Second-Pass Improvement: SARIF

The strongest improvement after the MVP is SARIF output. GitHub code scanning can ingest third-party SARIF files, which means findings can appear as native security alerts instead of only terminal logs. GitHub's SARIF upload workflow requires `security-events: write`, `contents: read`, and the official `github/codeql-action/upload-sarif` action.

This makes the project more valuable to maintainers because:

- It meets teams where they already review security alerts.
- It makes the scanner useful on a schedule, not only during PR checks.
- It allows future severity, fingerprint, and suppression workflows.
- It positions the tool next to existing static analyzers instead of as a one-off script.

## Third-Pass Improvement: Baselines

The next strongest adoption feature is baseline mode. Mature scanners invest heavily in triage, ignore states, deduplication, and separating new findings from known findings because teams rarely enable a new security gate if it immediately blocks work on historical issues.

Agentic Workflow Guard now supports:

- `--write-baseline awguard.baseline.json` to record current findings.
- `--baseline awguard.baseline.json` to mark matching findings as known.
- CI failure based only on findings that are not already in the baseline.
- Stable fingerprints based on rule, file, and normalized evidence.

This improves public reach because a maintainer can add the tool to a real repository with risk already present, keep visibility into the existing risk, and still block new high-severity agent-workflow mistakes.

## Fourth-Pass Improvement: Auditable Suppressions

Baseline mode helps teams start. Inline suppressions help them stay. Mature scanners support local suppressions because false positives and intentionally accepted risks happen, but the useful pattern is to require a reason so the exception is reviewable later.

Agentic Workflow Guard now supports:

- `# awguard-disable-next-line AWG001 -- reason` for the next reported line.
- `# awguard-disable-line AWG004 -- reason` for same-line findings.
- Multiple rule ids separated by spaces or commas.
- `AWG011` findings when suppression comments omit a clear justification or reference unknown rules.

This makes the project safer to adopt publicly because it gives maintainers a practical false-positive escape hatch without normalizing silent ignores.

## Distribution Plan

1. Publish the repo with a short demo GIF or screenshot.
2. Add topics: `github-actions`, `ai-agents`, `prompt-injection`, `security`, `devsecops`, `llm`.
3. Post a concrete example: "Your AI triage workflow may be letting issue comments steer an agent with write tokens."
4. Submit to security and GitHub communities with before/after workflow snippets.
5. Add a short terminal demo and code-scanning screenshot after the first public run.

## Sources

- Stack Overflow 2025 Developer Survey, AI section: https://survey.stackoverflow.co/2025/ai
- GitHub Octoverse 2025: https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
- GitHub Actions script injection docs: https://docs.github.com/en/actions/concepts/security/script-injections
- GitHub SARIF upload docs: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- GitHub Actions secure use reference: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/security/secure-use
- GitHub Agentic Workflows security architecture: https://github.github.com/gh-aw/
- OpenSSF Scorecard dangerous workflow check: https://github.com/ossf/scorecard/blob/main/docs/checks.md#dangerous-workflow
- Semgrep inline ignore docs: https://semgrep.dev/docs/ignoring-files-folders-code
- ESLint configuration comment descriptions: https://eslint.org/docs/latest/use/configure/rules#configuration-comment-descriptions
- OWASP Top 10 for Large Language Model Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Agentic Workflow Injection paper: https://arxiv.org/abs/2605.07135

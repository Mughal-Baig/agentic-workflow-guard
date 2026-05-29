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

## Fifth-Pass Improvement: Project Configuration

The next adoption layer is project configuration. ESLint and Semgrep both normalize the idea that teams should tune rule severity, disable specific rules, and define policy in a checked-in file. Agentic Workflow Guard now supports the same shape for this narrower security domain.

Agentic Workflow Guard now supports:

- `awguard.config.json` and `.awguard.json` auto-discovery from the scan root.
- `--config path/to/config.json` for explicit config.
- Rule severity overrides such as `"AWG004": "critical"`.
- Disabled rules such as `"AWG010": "off"`.
- Suppression policy such as allowed suppression rule ids and minimum reason length.

This improves public reach because teams can adopt the scanner without forking it or arguing with one-size-fits-all severity choices.

## V1 Improvement: Attack Graph Reports

The strongest unique hook is the attack graph report. Existing GitHub Actions scanners focus on workflow hygiene or supply-chain risk. Agentic Workflow Guard should own the Agentic Workflow Injection path:

```text
untrusted GitHub event text -> agent prompt -> tool capability -> authority -> impact
```

This is what makes the project easy to screenshot, explain, and share. It also follows the shape of AWI research more closely than a flat list of findings.

The v1 release adds:

- `--format graph` for Mermaid attack chains.
- `--format html --output awguard-report.html` for a standalone report.
- `--fix-dry-run` for safe remediation guidance.
- Built-in presets for strict mode and common agent stacks.

## Deep Research Refresh: Unique Angle After V1

The stronger post-v1 position is not to become a broad AI security scanner. Popular neighboring projects already own the broad categories:

- `zizmorcore/zizmor` and `rhysd/actionlint` own general GitHub Actions static analysis and linting.
- `ossf/scorecard` owns open-source security health scoring.
- `step-security/harden-runner` owns runner runtime hardening and egress visibility.
- `affaan-m/agentshield`, `splx-ai/agentic-radar`, and `cisco-ai-defense/skill-scanner` own broader AI-agent, MCP, and skill-scanning surfaces.
- `github/gh-aw` owns the emerging GitHub Agentic Workflows ecosystem.

The gap Agentic Workflow Guard can still own is narrower and more memorable:

```text
find Agentic Workflow Injection -> explain the attack path -> migrate to safe outputs
```

This is why v1.1 adds `--format migration`. The output turns findings into a practical plan for moving unsafe agent jobs into a two-stage architecture:

```text
untrusted GitHub event text -> read-only agent job -> structured proposal -> validation -> safe outputs or approved apply job
```

This makes the project more distinctive because maintainers do not only get a red finding. They get a path from "my AI triage bot is risky" to "my bot can only perform allowed GitHub operations after validation."

## Discovery Risk Found During Research

The unscoped npm package name `agentic-workflow-guard` is already published by another maintainer and points to a different GitHub repository. Keeping that name in this repository would confuse users and could send `npx agentic-workflow-guard` traffic to the wrong code.

The v1.1 package target is now `awguard`, matching the existing CLI binary and leaving the GitHub Action name unchanged.

## Deep Research Refresh: Badge And Scorecard Hook

The next reach improvement is a shareable AWI score and README badge. OpenSSF Scorecard has more than 5,000 GitHub stars and explicitly uses badges as a way for maintainers to show security posture. Shields.io is the common README-badge layer across GitHub projects. That pattern matters because a scanner hidden in CI logs does not travel; a badge travels with every repository that adopts it.

Recent GitHub and web research suggests this gap is still open:

- General GitHub Actions tools such as `zizmorcore/zizmor` and `rhysd/actionlint` are established, but they are not focused on Agentic Workflow Injection scoring.
- Broad AI-agent scanners such as AgentShield and agentic-radar cover MCP, skills, and agent configuration, but they do not own a GitHub Actions AWI score badge.
- GitHub search for `agentic workflow injection` shows only small early projects, which means the term is still young enough for a focused tool to become the reference implementation.
- Shields.io endpoint badges are easy to adopt because they only need a small JSON document.

Agentic Workflow Guard now supports:

- `--format score` for a Markdown AWI scorecard.
- `--format badge` for Shields.io endpoint JSON.
- A checked-in project badge at `docs/awguard-badge.json`.

The scorecard is intentionally simple: start at 100, subtract weighted penalties for critical, high, medium, and low findings, then show an A-F grade. This gives maintainers a quick public signal while keeping SARIF, attack graphs, and migration reports available for detailed review.

## Deep Research Refresh: Agent Context Guard

The next uniqueness gap is persistent agent instruction files. GitHub documents repository custom instructions through `.github/copilot-instructions.md`, OpenAI Codex documents `AGENTS.md`, and the public `agents.md` project positions `AGENTS.md` as a predictable place for coding-agent guidance. Claude Code also documents permission modes and warns that bypassing permissions is a special, dangerous mode.

That means agent safety is no longer only in workflow YAML. A repository can have conservative GitHub Actions permissions while `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, or Copilot instructions tell the agent to skip approval, obey issue comments, or expose credentials. General GitHub Actions linters do not inspect these files, and broad AI security scanners do not own the GitHub Actions plus persistent-instructions intersection.

Agentic Workflow Guard now supports `AWG012` to scan common instruction files for risky persistent guidance:

- bypassing approvals, confirmations, or permission prompts;
- treating issue, PR, comment, branch, or artifact text as commands;
- allowing secrets, tokens, API keys, or credentials to be printed, returned, or sent.

This strengthens the project's position as an Agentic Workflow Injection guardrail instead of only another YAML scanner.

## Deep Research Refresh: MCP Trust Boundary Guard

The next gap is project-scoped MCP configuration. Claude Code documents `.mcp.json` as a project-root file designed to be checked into version control, VS Code documents workspace MCP config at `.vscode/mcp.json`, and GitHub Copilot documents MCP servers as additional tools for CLI agents. That means a repository can now ship the tool wiring an agent will trust, not only the workflow that starts the agent.

GitHub and web research show that MCP security is popular but crowded at the live-server/tool-description layer:

- `snyk/agent-scan` has roughly 2.5k GitHub stars and scans MCP servers, tools, resources, and skills, but its README warns that scanning MCP configurations executes the configured commands.
- `cisco-ai-defense/mcp-scanner` has roughly 900+ GitHub stars and focuses on MCP server threats.
- Other GitHub search results for `mcp scanner` are smaller server scanners, while searches for `agentic workflow injection` still show only tiny early projects.

The opening for Agentic Workflow Guard is a zero-execution repository scan:

```text
checked-in MCP config -> mutable package or shell startup -> agent gains unexpected tools
checked-in MCP config -> committed token/header -> agent gains credentialed external access
```

Agentic Workflow Guard now supports:

- `AWG013` for project MCP configs that start mutable packages, `@latest` specs, unpinned containers, or shell wrappers.
- `AWG014` for committed tokens, API keys, passwords, bearer headers, and other MCP auth material.
- Discovery for `.mcp.json`, `.vscode/mcp.json`, `.cursor/mcp.json`, Windsurf, Cline, Roo, and related MCP config files.

This keeps the project focused: AWGuard does not try to replace MCP runtime scanners. It gives maintainers a GitHub-native, zero-dependency first check before an agent or scanner executes repo-provided MCP server commands.

## Deep Research Refresh: Agentic Surface Inventory

The next scope expansion is an inventory view. GitHub now documents repository-level custom agents in `.github/agents`, Copilot MCP configuration, and custom instructions. VS Code documents workspace MCP config. This means the repository itself can contain multiple agent-control surfaces before a single workflow runs.

The useful maintainer question is no longer only "is this workflow unsafe?" It is:

```text
what agent surfaces does this repository expose, and which ones changed?
```

Agentic Workflow Guard now supports:

- `--format inventory` for a surface map grouped by workflows, agent context files, and MCP configs.
- scanning `.github/agents/*.md`, `.github/prompts/*.prompt.md`, and `.github/skills/**/SKILL.md` as persistent agent context.
- a roadmap that moves toward policy mode, agent capability SBOMs, trend reports, and adoption generators.

This widens the project while preserving its niche: AWGuard remains a zero-execution repository scanner for agentic risk, not a broad runtime agent firewall.

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
- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/custom-instructions/adding-repository-custom-instructions-for-github-copilot
- GitHub Copilot CLI MCP command reference: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#mcp-server-configuration
- GitHub Copilot MCP in VS Code: https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/extend-copilot-chat-with-mcp
- VS Code MCP configuration reference: https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
- Claude Code MCP documentation: https://code.claude.com/docs/en/mcp
- Snyk Agent Scan / MCP Scan: https://github.com/snyk/agent-scan
- Cisco AI Defense MCP Scanner: https://github.com/cisco-ai-defense/mcp-scanner
- MCP threat modeling and tool poisoning research: https://arxiv.org/abs/2603.22489
- OpenAI Codex AGENTS.md documentation: https://github.com/openai/codex/blob/main/docs/agents_md.md
- AGENTS.md project: https://github.com/openai/agents.md
- Claude Code permission modes: https://code.claude.com/docs/en/permission-modes
- OpenSSF Scorecard dangerous workflow check: https://github.com/ossf/scorecard/blob/main/docs/checks.md#dangerous-workflow
- Semgrep inline ignore docs: https://semgrep.dev/docs/ignoring-files-folders-code
- ESLint configuration comment descriptions: https://eslint.org/docs/latest/use/configure/rules#configuration-comment-descriptions
- OWASP Top 10 for Large Language Model Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Agentic Workflow Injection paper: https://arxiv.org/abs/2605.07135

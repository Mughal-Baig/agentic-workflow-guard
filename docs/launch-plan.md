# Launch Plan

## Positioning

Agentic Workflow Guard should be described as an Agentic Workflow Injection mapper, not just a GitHub Actions scanner.

Short pitch:

> Find where untrusted GitHub issue, PR, comment, branch, or artifact text can steer AI agents inside CI.

## Star-Worthy Demo

1. Show the terminal demo image in `docs/assets/terminal-demo.svg`.
2. Show `examples/unsafe-agent.yml`.
3. Run:

   ```bash
   node ./bin/awguard.js examples/unsafe-agent.yml --format graph
   ```

4. Show the generated Mermaid chain.
5. Run:

   ```bash
   node ./bin/awguard.js examples/unsafe-agent.yml --fix-dry-run
   ```

6. Show the safe remediation steps.
7. Run:

   ```bash
   node ./bin/awguard.js examples/unsafe-agent.yml --format migration
   ```

8. Show the migration from unsafe agent job to read-only proposal job plus safe outputs or an approved apply job.
9. Run:

   ```bash
   node ./bin/awguard.js . --format score
   ```

10. Show the README badge and say: "Add an AWI risk badge to your repo before adding AI agents to CI."
11. Run:

   ```bash
   node ./bin/awguard.js . --format inventory
   ```

12. Show the surface map and say: "Before you secure agent workflows, find every place the repository gives agents instructions or tools."
13. Run:

   ```bash
   node ./bin/awguard.js init
   ```

14. Show the one-command setup guide.
15. Show an unsafe `AGENTS.md` or `.github/copilot-instructions.md` line and run:

   ```bash
   node ./bin/awguard.js . --format text
   ```

16. Explain that AWGuard scans both the workflow and the persistent agent instructions that shape agent behavior.
17. Show an unsafe `.mcp.json` with `npx @modelcontextprotocol/server-github` and a committed token, then run:

   ```bash
   node ./bin/awguard.js examples/.mcp.json --format text
   ```

18. Explain the new hook: "This scanner checks repo-provided MCP tool wiring without executing the MCP server."
19. Show the real-world corpus:

   ```bash
   node ./bin/awguard.js examples/corpus --format inventory
   ```

20. Explain that visitors can clone the repo and see high-signal findings immediately, without needing a real vulnerable project.

## Release Checklist

- Use `docs/release-checklist.md` for the release gate.
- Use `docs/report-gallery.md` for screenshot commands.
- Publish GitHub release notes for the target version.
- Add the action to GitHub Marketplace from the release UI.
- Publish the npm package as `awguard` with trusted publishing when possible.
- Pin the README demo to the attack graph, not the rule table.
- Post with the headline: "I built a scanner that maps and migrates Agentic Workflow Injection in GitHub Actions."
- Include the AWI attack chain screenshot in social posts.
- Include the migration report screenshot after the graph screenshot.
- Include the AWI risk badge as the final screenshot because it is the easiest artifact for other maintainers to copy.
- Include a short "workflow looked safe, AGENTS.md made it unsafe" example because it is the most surprising hook.
- Include a short "MCP config looked like developer tooling, but it gave the agent a mutable tool server and a token" example because MCP is the hottest adjacent security topic.
- Include the setup recipes link so Claude Code, Codex, Cursor, Copilot, and Cline users have an immediate next step.

## Distribution Targets

- Hacker News: Show HN.
- Reddit: `r/github`, `r/devsecops`, `r/cybersecurity`.
- GitHub Community Discussions.
- OWASP GenAI / LLM app security communities.
- Maintainers of AI triage, AI review, and coding-agent GitHub Actions.

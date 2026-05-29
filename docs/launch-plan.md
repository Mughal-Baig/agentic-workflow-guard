# Launch Plan

## Positioning

Agentic Workflow Guard should be described as an Agentic Workflow Injection mapper, not just a GitHub Actions scanner.

Short pitch:

> Find where untrusted GitHub issue, PR, comment, branch, or artifact text can steer AI agents inside CI.

## Star-Worthy Demo

1. Show `examples/unsafe-agent.yml`.
2. Run:

   ```bash
   node ./bin/awguard.js examples/unsafe-agent.yml --format graph
   ```

3. Show the generated Mermaid chain.
4. Run:

   ```bash
   node ./bin/awguard.js examples/unsafe-agent.yml --fix-dry-run
   ```

5. Show the safe remediation steps.

## Release Checklist

- Publish GitHub release notes for `v1.0.0`.
- Add the action to GitHub Marketplace from the release UI.
- Pin the README demo to the attack graph, not the rule table.
- Post with the headline: "I built a scanner for Agentic Workflow Injection in GitHub Actions."
- Include the AWI attack chain screenshot in social posts.

## Distribution Targets

- Hacker News: Show HN.
- Reddit: `r/github`, `r/devsecops`, `r/cybersecurity`.
- GitHub Community Discussions.
- OWASP GenAI / LLM app security communities.
- Maintainers of AI triage, AI review, and coding-agent GitHub Actions.

# Comparison

AWGuard is intentionally narrow. It should sit beside general CI/CD and AI security tools, not replace them.

| Tool | Main job | Where AWGuard differs |
| --- | --- | --- |
| `zizmor` | General GitHub Actions security analysis | AWGuard focuses on AI-agent prompt, tool, MCP, and repository instruction paths. |
| `actionlint` | GitHub Actions syntax and workflow linting | AWGuard looks for agentic trust-boundary risk, not YAML correctness. |
| OpenSSF Scorecard | Open-source project security posture | AWGuard gives an Agentic Workflow Injection score and agent surface inventory. |
| MCP runtime scanners | Inspect live MCP servers and tool descriptions | AWGuard scans repository MCP configs without executing server commands. |
| Secret scanners | Find committed secrets | AWGuard connects MCP/agent secret exposure to agent capabilities and remediation. |

## Best Stack

Use these together:

```text
actionlint -> workflow correctness
zizmor -> broad GitHub Actions hardening
OpenSSF Scorecard -> project posture
secret scanning -> committed credentials
AWGuard -> agentic workflow, context, and MCP trust boundaries
```

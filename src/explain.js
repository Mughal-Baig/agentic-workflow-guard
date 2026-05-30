import { ruleCatalog } from './scanner.js';

const ruleDetails = {
  AWG001: {
    detects: 'User-controlled GitHub issue, pull request, comment, branch, or event text reaching an AI prompt.',
    why: 'The model may treat attacker-supplied text as instructions and use privileged tools or repository context.',
    safePattern: 'Delimit untrusted text, keep the job read-only, and require human review before any write action.'
  },
  AWG002: {
    detects: 'Untrusted GitHub context interpolated directly into shell scripts.',
    why: 'Shell interpolation can turn event text into command execution or argument injection.',
    safePattern: 'Move values into environment variables and reference them with shell quoting.'
  },
  AWG003: {
    detects: 'pull_request_target workflows that check out pull request head code.',
    why: 'Untrusted fork code can run with base-repository privileges.',
    safePattern: 'Use pull_request for untrusted code or keep pull_request_target limited to metadata-only work.'
  },
  AWG004: {
    detects: 'Agent jobs with broad write-capable GitHub token permissions.',
    why: 'Prompt injection becomes much more damaging when the agent can write repository state.',
    safePattern: 'Use contents: read by default and isolate write actions behind a reviewed apply job.'
  },
  AWG005: {
    detects: 'Secrets exposed to workflows driven by untrusted agent input.',
    why: 'An attacker can steer the agent or scripts into revealing credentials.',
    safePattern: 'Keep secrets out of untrusted event workflows and use a separate approved privileged workflow.'
  },
  AWG006: {
    detects: 'Agent command flags that skip approvals or permission prompts.',
    why: 'Autonomous execution removes the human gate that normally stops unsafe tool use.',
    safePattern: 'Require confirmation for file writes, command execution, and repository changes.'
  },
  AWG007: {
    detects: 'Model or agent output flowing into eval, shell, or pipe-to-shell execution.',
    why: 'Model output is data, not trusted code.',
    safePattern: 'Validate structured output with a narrow parser before using it.'
  },
  AWG008: {
    detects: 'Agent workflows without explicit permissions.',
    why: 'Default permissions are easy to misunderstand and can drift as repository settings change.',
    safePattern: 'Declare the minimum required permissions in every agent workflow.'
  },
  AWG009: {
    detects: 'workflow_run jobs that consume artifacts before scripts execute.',
    why: 'Artifacts can carry untrusted content from an earlier workflow into a more privileged job.',
    safePattern: 'Verify artifact provenance, names, checksums, and expected schema before use.'
  },
  AWG010: {
    detects: 'Third-party actions that are not pinned to commit SHAs in sensitive agent workflows.',
    why: 'Mutable tags can change behavior after review.',
    safePattern: 'Pin third-party actions to reviewed commit SHAs.'
  },
  AWG011: {
    detects: 'Suppression comments that are malformed, unjustified, or disallowed by config.',
    why: 'Weak suppressions can hide real agentic workflow risk.',
    safePattern: 'Use narrow rule IDs and a clear reviewed false-positive reason.'
  },
  AWG012: {
    detects: 'Persistent agent instructions that weaken approval, permission, or secret boundaries.',
    why: 'Instruction files are durable context that can affect future agent runs.',
    safePattern: 'Keep repository instructions conservative and explicit about human review.'
  },
  AWG013: {
    detects: 'MCP configs that start mutable packages, unpinned containers, or shell wrappers.',
    why: 'MCP servers expand agent tool authority before runtime scanners can inspect behavior.',
    safePattern: 'Pin packages/images and avoid shell wrappers for project-scoped MCP servers.'
  },
  AWG014: {
    detects: 'MCP configs that hardcode credentials or authorization material.',
    why: 'Committed secrets can be used by anyone with repository access and may be exposed by agents.',
    safePattern: 'Move credentials into prompts, environment variables, or a secret manager.'
  },
  AWG015: {
    detects: 'Agentic files, MCP servers, packages, or commands outside configured policy allowlists.',
    why: 'New agent surfaces should be visible in review before they gain trust.',
    safePattern: 'Approve only reviewed files, servers, packages, and commands.'
  }
};

export function renderRuleExplanation(ruleId = '') {
  const normalizedRuleId = String(ruleId || '').toUpperCase();
  if (!normalizedRuleId) return renderRuleIndex();

  const rule = ruleCatalog[normalizedRuleId];
  if (!rule) {
    throw new Error(`unknown rule id: ${normalizedRuleId}. Use awguard explain to list available rules.`);
  }

  const details = ruleDetails[normalizedRuleId] || {};
  return [
    `# ${normalizedRuleId}: ${rule.title}`,
    '',
    `Severity: **${rule.severity}**`,
    '',
    `Detects: ${details.detects || rule.title}`,
    '',
    `Why it matters: ${details.why || 'This pattern can increase agentic workflow risk.'}`,
    '',
    `Safe pattern: ${details.safePattern || rule.suggestion}`,
    '',
    `Suggested fix: ${rule.suggestion}`,
    '',
    'Useful commands:',
    '',
    '```bash',
    'npx awguard@latest . --format inventory',
    'npx awguard@latest . --fix-dry-run',
    'npx awguard@latest . --format sarif --output awguard.sarif --fail-on none',
    '```'
  ].join('\n');
}

function renderRuleIndex() {
  const lines = ['# Agentic Workflow Guard Rules', '', '| Rule | Severity | Title |', '| --- | --- | --- |'];
  for (const [ruleId, rule] of Object.entries(ruleCatalog)) {
    lines.push(`| ${ruleId} | ${rule.severity} | ${escapeMarkdown(rule.title)} |`);
  }
  lines.push('', 'Run `awguard explain AWG001` for details about one rule.');
  return lines.join('\n');
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

const ruleActions = {
  AWG001: [
    'Move untrusted GitHub event text into a data-only file or artifact.',
    'Keep system and task instructions separate from issue, PR, comment, branch, and artifact text.',
    'Ask the agent for a structured proposal instead of allowing direct repository writes.'
  ],
  AWG002: [
    'Stop interpolating GitHub expressions directly inside run scripts.',
    'Pass untrusted values through env variables and quote them when writing data files.',
    'Do not pipe untrusted or model-generated text into shell interpreters.'
  ],
  AWG003: [
    'Do not check out pull request head code from a pull_request_target workflow.',
    'Split untrusted build/test work into pull_request and privileged metadata work into a separate job.',
    'Require maintainer approval before any job with base-repository privileges writes back.'
  ],
  AWG004: [
    'Change the agent job to read-only permissions.',
    'Move write scopes into the smallest possible apply job.',
    'Gate write jobs behind workflow_dispatch, environment approval, or safe outputs validation.'
  ],
  AWG005: [
    'Remove repository, cloud, and model-provider secrets from untrusted agent jobs.',
    'Use short-lived credentials only in a separate approved apply job.',
    'Never expose secrets to jobs that read issue, PR, comment, branch, or artifact text.'
  ],
  AWG006: [
    'Disable full-auto, yolo, unsafe, no-confirm, and skip-permission flags in CI.',
    'Run the agent in suggestion mode and save the proposed operation as an artifact.',
    'Require a human or safe-output validator before tool use changes repository state.'
  ],
  AWG007: [
    'Treat model output as untrusted data.',
    'Validate output against a strict JSON schema before applying anything.',
    'Replace eval, bash -c, sh -c, pipe-to-shell, and dynamic command execution with typed handlers.'
  ],
  AWG008: [
    'Add an explicit top-level permissions block.',
    'Start with contents: read for agent analysis jobs.',
    'Add write permissions only to a separate apply job.'
  ],
  AWG009: [
    'Treat downloaded workflow_run artifacts as untrusted.',
    'Verify artifact source, checksum, and expected schema before use.',
    'Avoid executing artifact contents in privileged workflows.'
  ],
  AWG010: [
    'Pin third-party actions to full commit SHAs in agent workflows.',
    'Review action updates before changing pins.',
    'Prefer official or internally reviewed actions for privileged jobs.'
  ],
  AWG012: [
    'Remove persistent instructions that tell agents to bypass approvals, confirmations, or permission checks.',
    'Tell agents to treat issue, PR, comment, branch, and artifact text as untrusted data instead of commands.',
    'Keep AGENTS.md, CLAUDE.md, GEMINI.md, Copilot instructions, and Cursor rules aligned with the workflow permission model.'
  ],
  AWG013: [
    'Pin project-scoped MCP server packages to exact versions or container digests.',
    'Replace shell-wrapper MCP startup commands with direct executable and argument arrays.',
    'Review MCP server packages before letting agents use them in CI or shared developer workspaces.'
  ],
  AWG014: [
    'Remove committed MCP tokens, API keys, passwords, and auth headers.',
    'Use prompted inputs, environment variables, or managed secrets for MCP credentials.',
    'Rotate credentials that were present in repository history.'
  ],
  AWG015: [
    'Review the unapproved agentic surface and decide whether it belongs in the repository.',
    'Add approved files, MCP servers, packages, and commands to policy allowlists.',
    'Fail CI on policy drift so new agent surfaces are visible in review.'
  ]
};

const writeRules = new Set(['AWG003', 'AWG004', 'AWG005', 'AWG006', 'AWG007', 'AWG009']);

export function buildMigrationPlan(result) {
  const actionableFindings = result.findings.filter((finding) => finding.ruleId !== 'AWG011');
  const files = [...groupBy(actionableFindings, (finding) => finding.file).entries()].map(([file, findings]) => ({
    file,
    findings,
    priority: priorityFor(findings),
    riskShape: riskShapeFor(findings),
    steps: migrationStepsFor(findings),
    allowedOperations: allowedOperationsFor(findings)
  }));

  return {
    summary: {
      scannedFiles: result.scannedFiles.length,
      findings: actionableFindings.length,
      files: files.length,
      highest: result.summary.highest
    },
    files
  };
}

export function renderMigrationPlan(result) {
  const plan = buildMigrationPlan(result);
  const lines = [
    '# Agentic Workflow Guard Migration Plan',
    '',
    `Scanned files: **${plan.summary.scannedFiles}**`,
    `Findings to migrate: **${plan.summary.findings}**`,
    `Affected files: **${plan.summary.files}**`,
    `Highest severity: **${plan.summary.highest}**`,
    '',
    'Goal: move from agent jobs that can read untrusted GitHub text and directly act, to a two-stage pattern where the agent proposes structured output and a trusted layer validates what can happen next.',
    '',
    'Recommended target architecture:',
    '',
    '```text',
    'untrusted GitHub event text',
    '  -> read-only agent job',
    '  -> structured proposal artifact',
    '  -> schema and policy validation',
    '  -> safe outputs or approved apply job',
    '```',
    ''
  ];

  if (plan.files.length === 0) {
    lines.push('No migration needed. No unsafe agent workflow paths were found.');
    return lines.join('\n');
  }

  for (const filePlan of plan.files) {
    lines.push(`## ${filePlan.file}`);
    lines.push('');
    lines.push(`Priority: **${filePlan.priority}**`);
    lines.push(`Risk shape: ${filePlan.riskShape}`);
    lines.push('');
    lines.push('| Rule | Line | Why it matters |');
    lines.push('| --- | ---: | --- |');

    for (const finding of filePlan.findings) {
      lines.push(`| ${finding.ruleId} | ${finding.line} | ${escapeMarkdown(finding.title)} |`);
    }

    lines.push('');
    lines.push('Migration steps:');

    filePlan.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });

    lines.push('');
    lines.push('Safe-output allowlist to aim for:');
    lines.push('');
    for (const operation of filePlan.allowedOperations) {
      lines.push(`- ${operation}`);
    }

    lines.push('');
    lines.push('Reference pattern:');
    lines.push('');
    const referencePattern = renderReferencePattern(filePlan);
    lines.push(`\`\`\`${referencePattern.language}`);
    lines.push(referencePattern.text);
    lines.push('```');
    lines.push('');
  }

  lines.push('Use this report as a migration checklist. It does not edit workflow files because safe output choices are product decisions: a triage bot, reviewer bot, and coding agent should each allow different write operations.');

  return lines.join('\n');
}

function priorityFor(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) return 'critical';
  if (findings.some((finding) => finding.severity === 'high')) return 'high';
  if (findings.some((finding) => finding.severity === 'medium')) return 'medium';
  return 'low';
}

function riskShapeFor(findings) {
  const rules = new Set(findings.map((finding) => finding.ruleId));
  const pieces = [];

  if (rules.has('AWG001')) pieces.push('untrusted text reaches an agent prompt');
  if (rules.has('AWG002') || rules.has('AWG007')) pieces.push('shell or model output execution is possible');
  if ([...rules].some((rule) => writeRules.has(rule))) pieces.push('privileged write path exists');
  if (rules.has('AWG005')) pieces.push('secrets are in scope');
  if (rules.has('AWG010')) pieces.push('agent workflow depends on mutable third-party code');
  if (rules.has('AWG012')) pieces.push('persistent agent instructions weaken review or permission boundaries');
  if (rules.has('AWG013')) pieces.push('project MCP config can change agent tool capabilities through mutable startup');
  if (rules.has('AWG014')) pieces.push('project MCP config contains committed credentials');
  if (rules.has('AWG015')) pieces.push('agentic surface is outside the repository policy');

  return pieces.length > 0 ? pieces.join('; ') : 'workflow hardening issue';
}

function migrationStepsFor(findings) {
  const steps = new Set([
    'Create a read-only agent job with explicit `permissions: contents: read`.',
    'Write issue, PR, comment, branch, or artifact content to an `untrusted-input.txt` file.',
    'Ask the agent to produce a structured JSON proposal with only allowed operation names and fields.',
    'Validate the proposal with a schema before any GitHub write, shell execution, or artifact consumption.',
    'Apply the proposal through GitHub Agentic Workflows safe outputs or a separate approved job with narrow write permissions.'
  ]);

  for (const finding of findings) {
    for (const action of ruleActions[finding.ruleId] || []) {
      steps.add(action);
    }
  }

  return [...steps];
}

function allowedOperationsFor(findings) {
  const rules = new Set(findings.map((finding) => finding.ruleId));
  const operations = new Set(['add-comment with sanitized body', 'add-labels from an approved label allowlist']);

  if (rules.has('AWG007') || rules.has('AWG006')) {
    operations.add('create-pull-request only after patch size and path validation');
  }

  if (rules.has('AWG009')) {
    operations.add('upload-artifact only after provenance and checksum validation');
  }

  if (rules.has('AWG003')) {
    operations.add('metadata-only pull request updates after maintainer approval');
  }

  if (rules.has('AWG012')) {
    operations.add('instruction-file update that explicitly treats GitHub event text as untrusted data');
  }

  if (rules.has('AWG013')) {
    operations.add('MCP server startup only from pinned packages, reviewed local paths, or container digests');
  }

  if (rules.has('AWG014')) {
    operations.add('MCP credentials supplied by prompt input, environment variable, or secret manager only');
  }

  if (rules.has('AWG015')) {
    operations.add('policy approval only after reviewing the workflow, agent context, MCP server, package, and command');
  }

  operations.add('noop or missing-data report when validation fails');
  return [...operations];
}

function renderReferencePattern(filePlan) {
  if (filePlan.findings.every((finding) => ['AWG013', 'AWG014'].includes(finding.ruleId))) {
    return {
      language: 'json',
      text: `{
  "inputs": [{ "type": "promptString", "id": "github-token", "password": true }],
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@1.2.3"],
      "env": { "GITHUB_TOKEN": "\${input:github-token}" }
    },
    "browser": {
      "command": "docker",
      "args": ["run", "--rm", "example/mcp-browser@sha256:..."]
    }
  }
}`
    };
  }

  const needsApproval = filePlan.findings.some((finding) => writeRules.has(finding.ruleId));
  const applyGate = needsApproval ? "if: github.event_name == 'workflow_dispatch'" : 'if: always()';

  return {
    language: 'yaml',
    text: `permissions:
  contents: read

jobs:
  agent-proposal:
    runs-on: ubuntu-latest
    steps:
      - name: Capture untrusted event text as data
        env:
          UNTRUSTED_TEXT: \${{ github.event.comment.body || github.event.issue.body || github.event.pull_request.body }}
        run: |
          printf '%s\\n' "$UNTRUSTED_TEXT" > untrusted-input.txt
      - name: Run agent in suggestion mode
        run: |
          your-agent --input untrusted-input.txt --output proposal.json --mode suggest
      - uses: actions/upload-artifact@v4
        with:
          name: agent-proposal
          path: proposal.json

  validate-and-apply:
    needs: agent-proposal
    runs-on: ubuntu-latest
    ${applyGate}
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - name: Validate structured proposal before applying
        run: |
          ./scripts/validate-agent-proposal.js proposal.json
          ./scripts/apply-allowed-github-operation.js proposal.json`
  };
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key) || [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

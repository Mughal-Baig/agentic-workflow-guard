import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMigrationPlan, renderMigrationPlan } from '../src/migration.js';
import { scanWorkflowText } from '../src/scanner.js';

test('builds a migration plan for unsafe agent workflows', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
permissions: write-all
jobs:
  triage:
    steps:
      - run: codex --dangerously-skip-permissions --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );

  const plan = buildMigrationPlan({
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'critical', bySeverity: {} },
    findings
  });

  assert.equal(plan.summary.files, 1);
  assert.equal(plan.files[0].priority, 'critical');
  assert.match(plan.files[0].riskShape, /untrusted text reaches an agent prompt/);
  assert.ok(plan.files[0].steps.some((step) => step.includes('structured JSON proposal')));
});

test('renders migration markdown with safe output guidance', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );

  const markdown = renderMigrationPlan({
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'high', bySeverity: {} },
    findings
  });

  assert.match(markdown, /Migration Plan/);
  assert.match(markdown, /safe outputs or approved apply job/);
  assert.match(markdown, /agent-proposal/);
});

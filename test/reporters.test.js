import assert from 'node:assert/strict';
import test from 'node:test';
import { renderSarif } from '../src/reporters.js';
import { scanWorkflowText } from '../src/scanner.js';

test('renders SARIF 2.1.0 output for GitHub code scanning', () => {
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

  const sarif = JSON.parse(
    renderSarif({
      root: process.cwd(),
      scannedFiles: ['agent.yml'],
      summary: { total: findings.length, highest: 'high', bySeverity: {} },
      findings
    })
  );

  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'Agentic Workflow Guard');
  assert.equal(sarif.runs[0].results[0].ruleId, 'AWG001');
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'agent.yml');
  assert.ok(sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash);
});

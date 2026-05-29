import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateScore, renderBadgeJson, renderScorecard } from '../src/score.js';
import { scanWorkflowText } from '../src/scanner.js';

test('calculates an A score when no AWI findings are present', () => {
  const result = {
    scannedFiles: ['safe.yml'],
    summary: { total: 0, highest: 'none', bySeverity: {} },
    findings: []
  };

  const score = calculateScore(result);

  assert.equal(score.grade, 'A');
  assert.equal(score.score, 100);
  assert.equal(score.color, 'brightgreen');
});

test('penalizes critical and high severity AWI findings', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
permissions: write-all
jobs:
  triage:
    steps:
      - run: claude --dangerously-skip-permissions --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );

  const score = calculateScore({
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'critical', bySeverity: {} },
    findings
  });

  assert.equal(score.grade, 'F');
  assert.equal(score.counts.critical, 1);
  assert.ok(score.score < 40);
});

test('renders scorecard markdown and Shields endpoint JSON', () => {
  const result = {
    scannedFiles: ['safe.yml'],
    summary: { total: 0, highest: 'none', bySeverity: {} },
    findings: []
  };

  const scorecard = renderScorecard(result);
  const badge = JSON.parse(renderBadgeJson(result));

  assert.match(scorecard, /AWI score/);
  assert.equal(badge.schemaVersion, 1);
  assert.equal(badge.label, 'AWI risk');
  assert.equal(badge.message, 'A 100/100');
});

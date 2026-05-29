import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAttackGraphs, renderGraphMarkdown, renderHtmlReport } from '../src/graph.js';
import { scanWorkflowText } from '../src/scanner.js';

test('builds attack graph chains from findings', () => {
  const findings = scanWorkflowText(
    `
on: [issue_comment]
permissions: write-all
jobs:
  triage:
    steps:
      - run: openai --prompt "\${{ github.event.comment.body }}"
`,
    'agent.yml'
  );
  const result = {
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'critical', bySeverity: {} },
    findings
  };

  const graph = buildAttackGraphs(result);

  assert.equal(graph.summary.files, 1);
  assert.ok(graph.summary.chains > 0);
  assert.match(graph.graphs[0].chains[0].source, /GitHub event field/);
});

test('renders graph markdown with mermaid content', () => {
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
  const markdown = renderGraphMarkdown({
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'high', bySeverity: {} },
    findings
  });

  assert.match(markdown, /```mermaid/);
  assert.match(markdown, /AI agent prompt/);
});

test('renders standalone HTML report', () => {
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
  const html = renderHtmlReport({
    scannedFiles: ['agent.yml'],
    summary: { total: findings.length, highest: 'high', bySeverity: {} },
    findings
  });

  assert.match(html, /<!doctype html>/);
  assert.match(html, /Attack Graphs/);
});

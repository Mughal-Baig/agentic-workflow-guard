import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { scanWorkflows } from '../src/scanner.js';

const corpusRoot = path.resolve('examples', 'corpus');

test('real-world pattern corpus exercises core agentic risk rules', () => {
  const result = scanWorkflows({ root: corpusRoot });
  const rules = new Set(result.findings.map((finding) => finding.ruleId));

  for (const ruleId of ['AWG001', 'AWG002', 'AWG003', 'AWG004', 'AWG005', 'AWG006', 'AWG012', 'AWG013', 'AWG014', 'AWG016', 'AWG017']) {
    assert.equal(rules.has(ruleId), true, `${ruleId} should be represented in the corpus`);
  }

  assert.ok(result.scannedFiles.some((file) => file.endsWith('.github/workflows/agentic-pr-review.yml')));
  assert.ok(result.scannedFiles.some((file) => file.endsWith('.github/prompts/auto-fix.prompt.md')));
  assert.ok(result.scannedFiles.some((file) => file.endsWith('.cursor/rules/autonomy.mdc')));
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildDoctorReport, renderDoctorReport } from '../src/doctor.js';

const bin = path.resolve('bin', 'awguard.js');

test('doctor reports a healthy local setup', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'awguard-doctor-'));
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.github', 'workflows', 'scan.yml'),
    `
on: [push]
permissions:
  contents: read
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - run: echo ok
`
  );

  const report = buildDoctorReport({ root });
  const rendered = renderDoctorReport(report);

  assert.equal(report.status, 'ok');
  assert.match(rendered, /Agentic Workflow Guard Doctor/);
  assert.match(rendered, /Scanner smoke test/);
});

test('CLI doctor exits non-zero for a missing target', () => {
  const missing = path.join(os.tmpdir(), `awguard-missing-${Date.now()}`);
  const result = spawnSync(process.execPath, [bin, 'doctor', missing], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /Status: \*\*FAIL\*\*/);
  assert.match(result.stdout, /Target does not exist/);
});

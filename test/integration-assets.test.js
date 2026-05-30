import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('VS Code extension proof of concept declares scan command and problem matcher', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve('examples', 'vscode-extension', 'package.json'), 'utf8'));

  assert.equal(manifest.contributes.commands[0].command, 'awguard.scanWorkspace');
  assert.equal(manifest.contributes.problemMatchers[0].name, 'awguard');
  assert.match(fs.readFileSync(path.resolve('examples', 'vscode-extension', 'src', 'extension.js'), 'utf8'), /--format', 'json'/);
});

test('dashboard proof of concept includes sorted run history sample data', () => {
  const sample = JSON.parse(fs.readFileSync(path.resolve('examples', 'dashboard', 'sample-history.json'), 'utf8'));

  assert.ok(sample.repository);
  assert.ok(sample.runs.length >= 3);
  assert.deepEqual(
    sample.runs.map((run) => run.date),
    [...sample.runs.map((run) => run.date)].sort()
  );
});

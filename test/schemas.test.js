import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const schemaFiles = [
  'schemas/awguard.badge.schema.json',
  'schemas/awguard.baseline.schema.json',
  'schemas/awguard.comparison.schema.json',
  'schemas/awguard.config.schema.json',
  'schemas/awguard.inventory.schema.json',
  'schemas/awguard.report.schema.json'
];

test('machine-readable report schemas are valid JSON documents', () => {
  for (const schemaFile of schemaFiles) {
    const schema = JSON.parse(fs.readFileSync(path.resolve(schemaFile), 'utf8'));
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.match(schema.$id, /^https:\/\/raw\.githubusercontent\.com\/Mughal-Baig\/agentic-workflow-guard/);
    assert.equal(schema.type, 'object');
  }
});

test('schema documentation links every schema file', () => {
  const docs = fs.readFileSync(path.resolve('docs', 'schemas.md'), 'utf8');

  for (const schemaFile of schemaFiles) {
    assert.match(docs, new RegExp(schemaFile.replaceAll('.', '\\.')));
  }
});

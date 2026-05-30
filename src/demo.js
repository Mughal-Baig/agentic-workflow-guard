import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildComparison } from './compare.js';
import { scanWorkflows } from './scanner.js';
import { calculateScore } from './score.js';

export function renderDemoWalkthrough({ packageRoot = getPackageRoot() } = {}) {
  const unsafeRoot = path.join(packageRoot, 'examples', 'lab', 'unsafe');
  const fixedRoot = path.join(packageRoot, 'examples', 'lab', 'fixed');
  const unsafe = scanWorkflows({ root: unsafeRoot });
  const fixed = scanWorkflows({ root: fixedRoot });
  const comparison = buildComparison(toPortableReport(unsafe), toPortableReport(fixed));
  const unsafeScore = calculateScore(unsafe);
  const fixedScore = calculateScore(fixed);

  const lines = [
    '# Agentic Workflow Guard Demo',
    '',
    'This offline demo scans the built-in vulnerable lab and its fixed version.',
    '',
    '## Commands',
    '',
    '```bash',
    'npx awguard@latest examples/lab/unsafe --format inventory',
    'npx awguard@latest examples/lab/fixed --format inventory',
    'npx awguard@latest examples/lab/fixed --fail-on high',
    '```',
    '',
    '## Before And After',
    '',
    '| Lab | Scanned files | Findings | Highest | AWI score |',
    '| --- | ---: | ---: | --- | --- |',
    `| Unsafe | ${unsafe.scannedFiles.length} | ${unsafe.findings.length} | ${unsafe.summary.highest} | ${unsafeScore.grade} ${unsafeScore.score}/100 |`,
    `| Fixed | ${fixed.scannedFiles.length} | ${fixed.findings.length} | ${fixed.summary.highest} | ${fixedScore.grade} ${fixedScore.score}/100 |`,
    '',
    '## Resolved Risk',
    '',
    `Resolved findings: **${comparison.summary.resolvedFindings}**`,
    `Remaining findings: **${comparison.summary.currentFindings}**`,
    '',
    '## Unsafe Findings',
    ''
  ];

  appendFindings(lines, unsafe.findings);
  lines.push(
    '',
    '## Fixed Result',
    '',
    fixed.findings.length === 0
      ? 'The fixed lab is clean for the enabled rules.'
      : `The fixed lab still has ${fixed.findings.length} finding(s).`,
    '',
    'Lab docs: `examples/lab/README.md`'
  );

  return lines.join('\n');
}

function appendFindings(lines, findings) {
  if (findings.length === 0) {
    lines.push('None.');
    return;
  }

  lines.push('| Severity | Rule | Location | Finding |', '| --- | --- | --- | --- |');
  for (const finding of findings) {
    lines.push(
      `| ${escapeMarkdown(finding.severity)} | ${escapeMarkdown(finding.ruleId)} | \`${escapeMarkdown(
        `${finding.file}:${finding.line}`
      )}\` | ${escapeMarkdown(finding.title)} |`
    );
  }
}

function toPortableReport(result) {
  return {
    ...result,
    scannedFiles: result.scannedFiles.map((file) => path.relative(result.root, file) || file)
  };
}

function getPackageRoot() {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(sourceDir, '..');
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

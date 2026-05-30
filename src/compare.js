import fs from 'node:fs';
import path from 'node:path';
import { classifyScanFile } from './scanner.js';

const surfaceLabels = {
  'github-workflow': 'GitHub Actions workflows',
  'agent-context': 'Agent context files',
  'mcp-config': 'MCP configs',
  other: 'Other scanned files'
};

export function loadReport(file) {
  const absoluteFile = path.resolve(file);
  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`report file does not exist: ${absoluteFile}`);
  }

  const report = JSON.parse(fs.readFileSync(absoluteFile, 'utf8'));
  if (!Array.isArray(report.findings) || !Array.isArray(report.scannedFiles)) {
    throw new Error(`report file must be awguard --format json output: ${absoluteFile}`);
  }

  return report;
}

export function buildComparison(previous, current) {
  const previousFindings = mapByFingerprint(previous.findings);
  const currentFindings = mapByFingerprint(current.findings);
  const previousFiles = new Set(previous.scannedFiles || []);
  const currentFiles = new Set(current.scannedFiles || []);

  const introducedFindings = [...currentFindings.entries()]
    .filter(([fingerprint]) => !previousFindings.has(fingerprint))
    .map(([, finding]) => finding);
  const resolvedFindings = [...previousFindings.entries()]
    .filter(([fingerprint]) => !currentFindings.has(fingerprint))
    .map(([, finding]) => finding);
  const unchangedFindings = [...currentFindings.keys()].filter((fingerprint) => previousFindings.has(fingerprint));
  const addedFiles = [...currentFiles].filter((file) => !previousFiles.has(file)).sort();
  const removedFiles = [...previousFiles].filter((file) => !currentFiles.has(file)).sort();
  const addedSurfaces = groupFilesBySurface(addedFiles, current.root || previous.root);
  const removedSurfaces = groupFilesBySurface(removedFiles, previous.root || current.root);

  return {
    summary: {
      previousFindings: previous.findings.length,
      currentFindings: current.findings.length,
      introducedFindings: introducedFindings.length,
      resolvedFindings: resolvedFindings.length,
      unchangedFindings: unchangedFindings.length,
      addedFiles: addedFiles.length,
      removedFiles: removedFiles.length,
      addedSurfaces: addedSurfaces.length,
      removedSurfaces: removedSurfaces.length
    },
    introducedFindings,
    resolvedFindings,
    addedFiles,
    removedFiles,
    addedSurfaces,
    removedSurfaces
  };
}

export function renderComparison(previous, current) {
  const comparison = buildComparison(previous, current);
  const lines = [
    '# Agentic Workflow Guard Comparison',
    '',
    `Previous findings: **${comparison.summary.previousFindings}**`,
    `Current findings: **${comparison.summary.currentFindings}**`,
    `Introduced findings: **${comparison.summary.introducedFindings}**`,
    `Resolved findings: **${comparison.summary.resolvedFindings}**`,
    `Unchanged findings: **${comparison.summary.unchangedFindings}**`,
    `Added scanned files: **${comparison.summary.addedFiles}**`,
    `Removed scanned files: **${comparison.summary.removedFiles}**`,
    ''
  ];

  lines.push('## Introduced Findings', '');
  appendFindings(lines, comparison.introducedFindings);
  lines.push('', '## Resolved Findings', '');
  appendFindings(lines, comparison.resolvedFindings);
  lines.push('', '## Added Agentic Surfaces', '');
  appendSurfaces(lines, comparison.addedSurfaces);
  lines.push('', '## Removed Agentic Surfaces', '');
  appendSurfaces(lines, comparison.removedSurfaces);
  lines.push('', '## Added Files', '');
  appendFiles(lines, comparison.addedFiles);
  lines.push('', '## Removed Files', '');
  appendFiles(lines, comparison.removedFiles);

  return lines.join('\n');
}

export function renderComparisonJson(previous, current) {
  return JSON.stringify(buildComparison(previous, current), null, 2);
}

function appendFindings(lines, findings) {
  if (findings.length === 0) {
    lines.push('None.');
    return;
  }

  lines.push('| Severity | Rule | Location | Finding |');
  lines.push('| --- | --- | --- | --- |');
  for (const finding of findings) {
    lines.push(
      `| ${escapeMarkdown(finding.severity)} | ${escapeMarkdown(finding.ruleId)} | ${escapeMarkdown(
        `${finding.file}:${finding.line}`
      )} | ${escapeMarkdown(finding.title)} |`
    );
  }
}

function appendFiles(lines, files) {
  if (files.length === 0) {
    lines.push('None.');
    return;
  }

  for (const file of files) {
    lines.push(`- \`${file.replaceAll('`', '\\`')}\``);
  }
}

function appendSurfaces(lines, surfaces) {
  if (surfaces.length === 0) {
    lines.push('None.');
    return;
  }

  lines.push('| Surface | Files |');
  lines.push('| --- | ---: |');
  for (const surface of surfaces) {
    lines.push(`| ${escapeMarkdown(surface.label)} | ${surface.files.length} |`);
  }
}

function mapByFingerprint(findings) {
  return new Map(findings.map((finding) => [finding.fingerprint || `${finding.ruleId}:${finding.file}:${finding.line}`, finding]));
}

function groupFilesBySurface(files, root = process.cwd()) {
  const groups = new Map();
  for (const file of files) {
    const surface = classifyScanFile(file, root || process.cwd());
    if (!groups.has(surface)) {
      groups.set(surface, {
        surface,
        label: surfaceLabels[surface] || surfaceLabels.other,
        files: []
      });
    }
    groups.get(surface).files.push(file);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, files: group.files.sort() }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

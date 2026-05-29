import path from 'node:path';
import { findingFingerprint } from './fingerprints.js';
import { renderGraphMarkdown, renderHtmlReport } from './graph.js';
import { renderMigrationPlan } from './migration.js';
import { ruleCatalog } from './scanner.js';

const sarifSeverity = {
  critical: { level: 'error', score: '9.0' },
  high: { level: 'error', score: '7.5' },
  medium: { level: 'warning', score: '5.0' },
  low: { level: 'note', score: '3.0' },
  none: { level: 'none', score: '0.0' }
};

export function renderText(result) {
  if (result.scannedFiles.length === 0) {
    return 'No GitHub Actions workflow files found.';
  }

  if (result.findings.length === 0) {
    return `Scanned ${result.scannedFiles.length} workflow file(s). No findings.`;
  }

  const header = [
    `Scanned ${result.scannedFiles.length} workflow file(s).`,
    `Findings: ${result.summary.total} total, highest severity: ${result.summary.highest}.`
  ];

  if (result.summary.baseline) {
    header.push(`Baseline: ${result.summary.baseline.new} new, ${result.summary.baseline.known} known.`);
  }

  const body = result.findings.map((finding) => {
    const baselineSuffix = finding.baselineState === 'known' ? ' [baseline]' : '';
    return [
      '',
      `[${finding.severity.toUpperCase()}]${baselineSuffix} ${finding.ruleId} ${finding.title}`,
      `  ${finding.file}:${finding.line}`,
      `  ${finding.message}`,
      finding.evidence ? `  Evidence: ${finding.evidence}` : '',
      `  Fix: ${finding.suggestion}`
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [...header, ...body].join('\n');
}

export function renderJson(result) {
  return JSON.stringify(
    {
      root: result.root,
      scannedFiles: result.scannedFiles.map((file) => path.relative(result.root, file) || file),
      summary: result.summary,
      findings: result.findings.map((finding) => ({
        ruleId: finding.ruleId,
        title: finding.title,
        severity: finding.severity,
        file: finding.file,
        line: finding.line,
        message: finding.message,
        evidence: finding.evidence,
        suggestion: finding.suggestion,
        fingerprint: finding.fingerprint,
        baselineState: finding.baselineState
      }))
    },
    null,
    2
  );
}

export function renderSarif(result) {
  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Agentic Workflow Guard',
              informationUri: 'https://github.com/Mughal-Baig/agentic-workflow-guard',
              semanticVersion: '1.1.1',
              rules: Object.entries(ruleCatalog).map(([id, rule]) => ({
                id,
                name: id,
                shortDescription: {
                  text: rule.title
                },
                fullDescription: {
                  text: rule.suggestion
                },
                help: {
                  text: rule.suggestion
                },
                defaultConfiguration: {
                  level: sarifSeverity[rule.severity].level
                },
                properties: {
                  tags: ['security', 'github-actions', 'ai-agent', 'prompt-injection'],
                  precision: 'medium',
                  'problem.severity': sarifSeverity[rule.severity].level,
                  'security-severity': sarifSeverity[rule.severity].score
                }
              }))
            }
          },
          results: result.findings.map((finding) => ({
            ruleId: finding.ruleId,
            level: sarifSeverity[finding.severity].level,
            message: {
              text: `${finding.message} Fix: ${finding.suggestion}`
            },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: {
                    uri: toSarifUri(finding.file)
                  },
                  region: {
                    startLine: finding.line
                  }
                }
              }
            ],
            partialFingerprints: {
              primaryLocationLineHash: finding.fingerprint || findingFingerprint(finding)
            },
            properties: {
              severity: finding.severity,
              baselineState: finding.baselineState,
              evidence: finding.evidence
            }
          }))
        }
      ]
    },
    null,
    2
  );
}

export function renderMarkdown(result) {
  const lines = [
    '# Agentic Workflow Guard Report',
    '',
    `Scanned workflow files: **${result.scannedFiles.length}**`,
    `Findings: **${result.summary.total}**`,
    `Highest severity: **${result.summary.highest}**`,
    ''
  ];

  if (result.findings.length === 0) {
    lines.push('No findings.');
    return lines.join('\n');
  }

  lines.push('| Severity | Rule | Location | Finding |');
  lines.push('| --- | --- | --- | --- |');

  for (const finding of result.findings) {
    lines.push(
      `| ${escapeMarkdown(finding.severity)} | ${escapeMarkdown(finding.ruleId)} | ${escapeMarkdown(
        `${finding.file}:${finding.line}`
      )} | ${escapeMarkdown(finding.title)} |`
    );
  }

  lines.push('');

  for (const finding of result.findings) {
    lines.push(`## ${finding.ruleId}: ${finding.title}`);
    lines.push('');
    lines.push(`- Severity: ${finding.severity}`);
    lines.push(`- Location: \`${finding.file}:${finding.line}\``);
    lines.push(`- Message: ${finding.message}`);
    if (finding.evidence) lines.push(`- Evidence: \`${finding.evidence.replaceAll('`', '\\`')}\``);
    lines.push(`- Suggested fix: ${finding.suggestion}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function renderGraph(result) {
  return renderGraphMarkdown(result);
}

export function renderHtml(result) {
  return renderHtmlReport(result);
}

export function renderMigration(result) {
  return renderMigrationPlan(result);
}

export function renderGithubAnnotations(result) {
  if (result.findings.length === 0) {
    return 'Agentic Workflow Guard: no findings.';
  }

  return result.findings.map((finding) => formatAnnotation(finding)).join('\n');
}

function formatAnnotation(finding) {
  const command = finding.severity === 'low' || finding.severity === 'medium' ? 'warning' : 'error';
  const title = `${finding.ruleId} ${finding.title}`;
  const message = `${finding.message} Fix: ${finding.suggestion}`;

  return `::${command} file=${escapeProperty(finding.file)},line=${finding.line},title=${escapeProperty(
    title
  )}::${escapeData(message)}`;
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

function escapeProperty(value) {
  return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A').replaceAll(':', '%3A').replaceAll(',', '%2C');
}

function escapeData(value) {
  return String(value).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function toSarifUri(file) {
  return file.split(path.sep).join('/');
}

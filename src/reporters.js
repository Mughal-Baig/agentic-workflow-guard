import path from 'node:path';
import { findingFingerprint } from './fingerprints.js';
import { renderGraphMarkdown, renderHtmlReport } from './graph.js';
import { renderInventory, renderInventoryJson } from './inventory.js';
import { renderMigrationPlan } from './migration.js';
import { renderBadgeJson, renderScorecard } from './score.js';
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
    return 'No GitHub Actions workflow, agent instruction, or MCP config files found.';
  }

  if (result.findings.length === 0) {
    return `Scanned ${result.scannedFiles.length} file(s). No findings.`;
  }

  const header = [
    `Scanned ${result.scannedFiles.length} file(s).`,
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
        column: finding.column,
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
              semanticVersion: '1.6.0',
              rules: Object.entries(ruleCatalog).map(([id, rule]) => ({
                id,
                name: id,
                helpUri: 'https://github.com/Mughal-Baig/agentic-workflow-guard#rule-reference',
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
                  tags: ruleTags(id),
                  precision: 'medium',
                  'awguard.ruleId': id,
                  'awguard.category': ruleCategory(id),
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
                    startLine: finding.line,
                    startColumn: finding.column || 1,
                    snippet: finding.evidence
                      ? {
                          text: finding.evidence
                        }
                      : undefined
                  }
                }
              }
            ],
            partialFingerprints: {
              primaryLocationLineHash: finding.fingerprint || findingFingerprint(finding),
              awguardStableFindingId: finding.fingerprint || findingFingerprint(finding)
            },
            fingerprints: {
              'awguard/v1': finding.fingerprint || findingFingerprint(finding)
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
    `Scanned files: **${result.scannedFiles.length}**`,
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

export function renderScore(result) {
  return renderScorecard(result);
}

export function renderBadge(result) {
  return renderBadgeJson(result);
}

export function renderSurfaceInventory(result) {
  return renderInventory(result);
}

export function renderSurfaceInventoryJson(result) {
  return renderInventoryJson(result);
}

export function renderGithubAnnotations(result) {
  if (result.findings.length === 0) {
    return 'Agentic Workflow Guard: no findings.';
  }

  return result.findings.map((finding) => formatAnnotation(finding)).join('\n');
}

export function renderGithubStepSummary(result, { format = 'github', failOn = 'high', outputFile = '' } = {}) {
  const lines = [
    '## Agentic Workflow Guard',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Scanned files | ${result.scannedFiles.length} |`,
    `| Findings | ${result.summary.total} |`,
    `| Highest severity | ${escapeMarkdown(result.summary.highest)} |`,
    `| Output format | ${escapeMarkdown(format)} |`,
    `| Fail threshold | ${escapeMarkdown(failOn)} |`
  ];

  if (result.summary.baseline) {
    lines.push(`| Baseline | ${result.summary.baseline.new} new, ${result.summary.baseline.known} known |`);
  }

  if (outputFile) {
    lines.push(`| Report file | \`${escapeMarkdown(outputFile)}\` |`);
  }

  lines.push('');

  if (result.scannedFiles.length === 0) {
    lines.push('No GitHub Actions workflow, agent instruction, or MCP config files were found.');
  } else if (result.findings.length === 0) {
    lines.push('No findings. The scanned agentic surfaces are clean for the enabled rules.');
  } else {
    lines.push('### Top Findings', '');
    lines.push('| Severity | Rule | Location | Finding |');
    lines.push('| --- | --- | --- | --- |');
    for (const finding of result.findings.slice(0, 10)) {
      lines.push(
        `| ${escapeMarkdown(finding.severity)} | ${escapeMarkdown(finding.ruleId)} | \`${escapeMarkdown(
          `${finding.file}:${finding.line}`
        )}\` | ${escapeMarkdown(finding.title)} |`
      );
    }
    if (result.findings.length > 10) {
      lines.push('', `Showing 10 of ${result.findings.length} findings.`);
    }
  }

  lines.push(
    '',
    '### Useful Follow-Ups',
    '',
    '- Run `npx awguard@latest . --format inventory` to map agentic surfaces.',
    '- Run `npx awguard@latest . --format score` to generate an AWI scorecard.',
    '- Run `npx awguard@latest . --fix-dry-run` for remediation guidance.'
  );

  return lines.join('\n');
}

function ruleCategory(ruleId) {
  if (['AWG001', 'AWG002', 'AWG018'].includes(ruleId)) return 'prompt-injection';
  if (['AWG003', 'AWG004', 'AWG005', 'AWG008', 'AWG016', 'AWG017'].includes(ruleId)) return 'github-actions-permissions';
  if (['AWG013', 'AWG014', 'AWG015'].includes(ruleId)) return 'mcp-governance';
  if (ruleId === 'AWG012') return 'agent-instructions';
  return 'workflow-hardening';
}

function ruleTags(ruleId) {
  return ['security', 'github-actions', 'ai-agent', ruleCategory(ruleId)];
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

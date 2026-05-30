import path from 'node:path';
import { classifyScanFile, severityRank } from './scanner.js';

const surfaceLabels = {
  'github-workflow': 'GitHub Actions workflows',
  'agent-context': 'Agent context files',
  'mcp-config': 'MCP configs',
  other: 'Other scanned files'
};

const surfaceOrder = ['github-workflow', 'agent-context', 'mcp-config', 'other'];

export function buildInventory(result) {
  const fileRows = result.scannedFiles.map((file) => {
    const relativeFile = path.relative(result.root, file) || file;
    const surface = classifyScanFile(file, result.root);
    const findings = result.findings.filter((finding) => finding.file === relativeFile);

    return {
      file: relativeFile,
      surface,
      label: surfaceLabels[surface] || surfaceLabels.other,
      findings: findings.length,
      highest: highestSeverity(findings),
      rules: [...new Set(findings.map((finding) => finding.ruleId))]
    };
  });

  const surfaces = surfaceOrder
    .map((surface) => {
      const files = fileRows.filter((file) => file.surface === surface);
      const findings = result.findings.filter((finding) => files.some((file) => file.file === finding.file));

      return {
        surface,
        label: surfaceLabels[surface],
        files: files.length,
        findings: findings.length,
        highest: highestSeverity(findings),
        rules: [...new Set(findings.map((finding) => finding.ruleId))]
      };
    })
    .filter((surface) => surface.files > 0);

  return {
    summary: {
      scannedFiles: result.scannedFiles.length,
      surfaces: surfaces.length,
      findings: result.findings.length,
      highest: result.summary.highest
    },
    surfaces,
    files: fileRows,
    recommendations: recommendationsFor(surfaces, result.findings)
  };
}

export function renderInventory(result) {
  const inventory = buildInventory(result);
  const lines = [
    '# Agentic Surface Inventory',
    '',
    `Scanned files: **${inventory.summary.scannedFiles}**`,
    `Agentic surfaces: **${inventory.summary.surfaces}**`,
    `Findings: **${inventory.summary.findings}**`,
    `Highest severity: **${inventory.summary.highest}**`,
    '',
    '## Surface Summary',
    '',
    '| Surface | Files | Findings | Highest | Rules |',
    '| --- | ---: | ---: | --- | --- |'
  ];

  if (inventory.surfaces.length === 0) {
    lines.push('| None found | 0 | 0 | none |  |');
  } else {
    for (const surface of inventory.surfaces) {
      lines.push(
        `| ${surface.label} | ${surface.files} | ${surface.findings} | ${surface.highest} | ${
          surface.rules.length > 0 ? surface.rules.join(', ') : ''
        } |`
      );
    }
  }

  lines.push('', '## Files', '', '| Surface | File | Findings | Highest | Rules |', '| --- | --- | ---: | --- | --- |');

  if (inventory.files.length === 0) {
    lines.push('| None found |  | 0 | none |  |');
  } else {
    for (const file of inventory.files) {
      lines.push(
        `| ${file.label} | \`${escapeMarkdown(file.file)}\` | ${file.findings} | ${file.highest} | ${
          file.rules.length > 0 ? file.rules.join(', ') : ''
        } |`
      );
    }
  }

  lines.push('', '## Recommended Next Steps', '');
  for (const recommendation of inventory.recommendations) {
    lines.push(`- ${recommendation}`);
  }

  return lines.join('\n');
}

export function renderInventoryJson(result) {
  return JSON.stringify(
    {
      root: result.root,
      ...buildInventory(result)
    },
    null,
    2
  );
}

function recommendationsFor(surfaces, findings) {
  const surfaceNames = new Set(surfaces.map((surface) => surface.surface));
  const rules = new Set(findings.map((finding) => finding.ruleId));
  const recommendations = [];

  if (rules.has('AWG014')) {
    recommendations.push('Remove and rotate committed MCP credentials before widening agent access.');
  }

  if (rules.has('AWG013')) {
    recommendations.push('Pin MCP server packages, container images, and startup commands before enabling repository-scoped tools.');
  }

  if (rules.has('AWG012')) {
    recommendations.push('Review persistent agent context files before relying on workflow permission boundaries.');
  }

  if (!surfaceNames.has('agent-context')) {
    recommendations.push('Add an explicit `AGENTS.md` or `.github/copilot-instructions.md` with conservative safety rules before introducing agents.');
  }

  if (!surfaceNames.has('mcp-config')) {
    recommendations.push('Keep MCP configs absent until there is a reviewed tool allowlist and credential handling plan.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Keep this inventory in CI so new agent surfaces are visible during review.');
  }

  return recommendations;
}

function highestSeverity(findings) {
  return findings.reduce((current, finding) => {
    return severityRank[finding.severity] > severityRank[current] ? finding.severity : current;
  }, 'none');
}

function escapeMarkdown(value) {
  return String(value).replaceAll('|', '\\|');
}

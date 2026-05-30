import { severityRank } from './scanner.js';

const penalties = {
  critical: 35,
  high: 20,
  medium: 10,
  low: 3,
  none: 0
};

const gradeBands = [
  { minimum: 90, grade: 'A', color: 'brightgreen', status: 'guarded' },
  { minimum: 75, grade: 'B', color: 'green', status: 'review' },
  { minimum: 60, grade: 'C', color: 'yellow', status: 'harden' },
  { minimum: 40, grade: 'D', color: 'orange', status: 'risky' },
  { minimum: 0, grade: 'F', color: 'red', status: 'critical' }
];

export function calculateScore(result) {
  const counts = Object.fromEntries(Object.keys(severityRank).map((severity) => [severity, 0]));
  for (const finding of result.findings) {
    counts[finding.severity] += 1;
  }

  const penalty = Object.entries(counts).reduce((total, [severity, count]) => {
    return total + (penalties[severity] || 0) * count;
  }, 0);
  const score = Math.max(0, 100 - penalty);
  const band = gradeBands.find((candidate) => score >= candidate.minimum) || gradeBands[gradeBands.length - 1];
  const action = actionFor(result, counts);

  return {
    score,
    grade: band.grade,
    color: band.color,
    status: band.status,
    action,
    penalty,
    counts,
    scannedFiles: result.scannedFiles.length,
    findings: result.findings.length,
    highest: result.summary.highest
  };
}

export function renderScorecard(result) {
  const score = calculateScore(result);
  const lines = [
    '# Agentic Workflow Guard Scorecard',
    '',
    `AWI score: **${score.grade} (${score.score}/100)**`,
    `Status: **${score.status}**`,
    `Scanned files: **${score.scannedFiles}**`,
    `Findings: **${score.findings}**`,
    `Highest severity: **${score.highest}**`,
    '',
    '| Severity | Count | Score penalty |',
    '| --- | ---: | ---: |'
  ];

  for (const severity of ['critical', 'high', 'medium', 'low']) {
    lines.push(`| ${severity} | ${score.counts[severity]} | ${score.counts[severity] * penalties[severity]} |`);
  }

  lines.push('');
  lines.push(`Recommended next step: ${score.action}`);
  lines.push('');
  lines.push('Badge endpoint JSON:');
  lines.push('');
  lines.push('```json');
  lines.push(renderBadgeJson(result));
  lines.push('```');

  return lines.join('\n');
}

export function renderBadgeJson(result) {
  const score = calculateScore(result);
  return JSON.stringify(
    {
      schemaVersion: 1,
      label: 'AWI risk',
      message: `${score.grade} ${score.score}/100`,
      color: score.color,
      namedLogo: 'githubactions'
    },
    null,
    2
  );
}

function actionFor(result, counts) {
  const rules = new Set(result.findings.map((finding) => finding.ruleId));

  if (result.scannedFiles.length === 0) {
    return 'No GitHub Actions workflows, agent instruction files, or MCP configs were found. Add AWGuard when agent workflows are introduced.';
  }

  if (counts.critical > 0) {
    if (rules.has('AWG014')) {
      return 'Remove committed MCP credentials and rotate any exposed token before sharing the repository.';
    }
    return 'Remove critical agent prompt, secret, or write-token paths before allowing autonomous agent jobs.';
  }

  if (counts.high > 0) {
    if (rules.has('AWG013')) {
      return 'Pin or remove mutable project-scoped MCP servers before allowing agents to use repository tools.';
    }
    if (rules.has('AWG012')) {
      return 'Review persistent agent instruction files before allowing AI agents to act in CI.';
    }
    return 'Use the migration report to split agent proposal jobs from privileged apply jobs.';
  }

  if (counts.medium > 0) {
    if (rules.has('AWG015')) {
      return 'Review policy drift and approve only expected agentic surfaces.';
    }
    return 'Tighten explicit permissions, artifact boundaries, and suppression policy.';
  }

  if (counts.low > 0) {
    return 'Review low-risk hardening items such as action pinning.';
  }

  return 'No unsafe Agentic Workflow Injection paths found.';
}

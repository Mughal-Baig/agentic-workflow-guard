import fs from 'node:fs';
import path from 'node:path';

export function applyBaseline(result, baseline) {
  const known = new Set((baseline.findings || []).map((finding) => finding.fingerprint));
  const findings = result.findings.map((finding) => ({
    ...finding,
    baselineState: known.has(finding.fingerprint) ? 'known' : 'new'
  }));

  return {
    ...result,
    findings,
    summary: {
      ...result.summary,
      baseline: summarizeBaseline(findings)
    }
  };
}

export function reviewBaseline(result, baseline) {
  const currentByFingerprint = new Map(result.findings.map((finding) => [finding.fingerprint, finding]));
  const baselineFindings = baseline.findings || [];
  const known = [];
  const resolved = [];

  for (const baselineFinding of baselineFindings) {
    const currentFinding = currentByFingerprint.get(baselineFinding.fingerprint);
    if (currentFinding) {
      known.push({
        ...baselineFinding,
        current: currentFinding
      });
    } else {
      resolved.push(baselineFinding);
    }
  }

  const baselineFingerprints = new Set(baselineFindings.map((finding) => finding.fingerprint));
  const newFindings = result.findings.filter((finding) => !baselineFingerprints.has(finding.fingerprint));

  return {
    summary: {
      baselineFindings: baselineFindings.length,
      known: known.length,
      resolved: resolved.length,
      new: newFindings.length,
      pruneRecommended: resolved.length > 0
    },
    known,
    resolved,
    newFindings
  };
}

export function pruneBaseline(baseline, review) {
  const knownFingerprints = new Set(review.known.map((finding) => finding.fingerprint));
  return {
    ...baseline,
    generatedAt: new Date().toISOString(),
    prunedAt: new Date().toISOString(),
    findings: (baseline.findings || []).filter((finding) => knownFingerprints.has(finding.fingerprint))
  };
}

export function createBaseline(result) {
  return {
    version: 1,
    tool: 'agentic-workflow-guard',
    generatedAt: new Date().toISOString(),
    findings: result.findings.map((finding) => ({
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      title: finding.title
    }))
  };
}

export function loadBaseline(file) {
  const absoluteFile = path.resolve(file);
  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`baseline file does not exist: ${absoluteFile}`);
  }

  const baseline = JSON.parse(fs.readFileSync(absoluteFile, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.findings)) {
    throw new Error('baseline file must be an Agentic Workflow Guard baseline version 1');
  }

  return baseline;
}

export function writeBaseline(file, baseline) {
  const absoluteFile = path.resolve(file);
  fs.mkdirSync(path.dirname(absoluteFile), { recursive: true });
  fs.writeFileSync(absoluteFile, `${JSON.stringify(baseline, null, 2)}\n`);
  return absoluteFile;
}

export function renderBaselineReview(review, { format = 'text', baselineFile = '' } = {}) {
  if (format === 'json') return JSON.stringify(review, null, 2);

  const lines = ['Agentic Workflow Guard Baseline Review', ''];
  if (baselineFile) lines.push(`Baseline: ${baselineFile}`);
  lines.push(
    `Known findings: ${review.summary.known}`,
    `Resolved baseline entries: ${review.summary.resolved}`,
    `New findings not in baseline: ${review.summary.new}`,
    ''
  );

  if (review.summary.resolved > 0) {
    lines.push('Resolved baseline entries that can be pruned:', '');
    for (const finding of review.resolved) {
      lines.push(`- ${finding.ruleId} ${finding.file}:${finding.line} ${finding.title}`);
    }
    lines.push('', 'Run with `--prune` to rewrite the baseline without resolved entries.', '');
  } else {
    lines.push('No stale baseline entries found.', '');
  }

  if (review.summary.new > 0) {
    lines.push('New findings not covered by the baseline:', '');
    for (const finding of review.newFindings) {
      lines.push(`- ${finding.ruleId} ${finding.file}:${finding.line} ${finding.title}`);
    }
  }

  return lines.join('\n').trimEnd();
}

function summarizeBaseline(findings) {
  return findings.reduce(
    (summary, finding) => {
      if (finding.baselineState === 'known') summary.known += 1;
      if (finding.baselineState === 'new') summary.new += 1;
      return summary;
    },
    { known: 0, new: 0 }
  );
}

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

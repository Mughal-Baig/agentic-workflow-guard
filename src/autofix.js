import fs from 'node:fs';
import path from 'node:path';

const fixableRules = new Set(['AWG004', 'AWG008', 'AWG016']);

export function buildAutofixPlan(result) {
  const byFile = new Map();

  for (const finding of result.findings) {
    if (finding.baselineState === 'known') continue;
    if (!fixableRules.has(finding.ruleId)) continue;
    if (!isWorkflowFile(finding.absoluteFile || finding.file)) continue;

    const absoluteFile = finding.absoluteFile || path.join(result.root, finding.file);
    const existing = byFile.get(absoluteFile) || [];
    existing.push(finding);
    byFile.set(absoluteFile, existing);
  }

  const files = [];
  for (const [absoluteFile, findings] of byFile.entries()) {
    const plan = buildFilePlan(absoluteFile, findings, result.root);
    if (plan.changes.length > 0) files.push(plan);
  }

  return {
    files,
    changes: files.reduce((count, file) => count + file.changes.length, 0)
  };
}

export function applyAutofixPlan(plan) {
  for (const file of plan.files) {
    fs.writeFileSync(file.absoluteFile, file.nextText);
  }

  return plan;
}

export function renderAutofixPlan(plan, { applied = false } = {}) {
  const lines = [applied ? 'Agentic Workflow Guard Autofix Applied' : 'Agentic Workflow Guard Autofix Plan', ''];

  if (plan.changes === 0) {
    lines.push('No safe autofixes available for the current findings.');
    lines.push('Run with --fix-dry-run for remediation guidance on findings that require human review.');
    return lines.join('\n');
  }

  lines.push(`${applied ? 'Applied' : 'Would apply'} ${plan.changes} change(s) in ${plan.files.length} file(s).`, '');

  for (const file of plan.files) {
    lines.push(`## ${file.file}`);
    for (const change of file.changes) {
      lines.push(`- ${change.ruleId}: ${change.description}`);
    }
    lines.push('');
  }

  if (applied) {
    lines.push('Rollback: review git diff, then revert the edited hunks if needed.');
  } else {
    lines.push('Apply: rerun with --fix. Review git diff before committing.');
  }

  return lines.join('\n');
}

function buildFilePlan(absoluteFile, findings, root) {
  const originalText = fs.readFileSync(absoluteFile, 'utf8');
  const newline = originalText.includes('\r\n') ? '\r\n' : '\n';
  const hadFinalNewline = originalText.endsWith('\n');
  const lines = originalText.replace(/\r?\n$/, '').split(/\r?\n/);
  const changes = [];

  const lineSpecificFindings = findings
    .filter((finding) => finding.ruleId === 'AWG004' || finding.ruleId === 'AWG016')
    .sort((a, b) => b.line - a.line);

  for (const finding of lineSpecificFindings) {
    if (finding.ruleId === 'AWG004') {
      applyWriteAllFix(lines, finding, changes);
    } else if (finding.ruleId === 'AWG016') {
      applyCheckoutCredentialsFix(lines, finding, changes);
    }
  }

  if (findings.some((finding) => finding.ruleId === 'AWG008')) {
    applyMissingPermissionsFix(lines, changes);
  }

  const nextText = `${lines.join(newline)}${hadFinalNewline ? newline : ''}`;

  return {
    file: path.relative(root, absoluteFile).split(path.sep).join('/') || path.basename(absoluteFile),
    absoluteFile,
    changes,
    nextText
  };
}

function applyWriteAllFix(lines, finding, changes) {
  const index = finding.line - 1;
  const line = lines[index] || '';
  const match = line.match(/^(\s*)permissions\s*:\s*write-all\s*(?:#.*)?$/i);
  if (!match) return;

  const indent = match[1];
  lines.splice(index, 1, `${indent}permissions:`, `${indent}  contents: read`);
  changes.push({
    ruleId: 'AWG004',
    description: `replace write-all permissions at line ${finding.line} with contents: read`
  });
}

function applyCheckoutCredentialsFix(lines, finding, changes) {
  const checkoutIndex = findCheckoutLine(lines, finding.line - 1);
  if (checkoutIndex === -1) return;

  const checkoutLine = lines[checkoutIndex];
  const checkoutIndent = leadingSpaces(checkoutLine);
  const childIndent = `${checkoutIndent}  `;
  const valueIndent = `${childIndent}  `;
  const blockEnd = findStepBlockEnd(lines, checkoutIndex, checkoutIndent.length);
  const persistIndex = findKeyInRange(lines, checkoutIndex + 1, blockEnd, 'persist-credentials');

  if (persistIndex !== -1) {
    if (/:\s*false\s*(?:#.*)?$/i.test(lines[persistIndex])) return;
    lines[persistIndex] = `${leadingSpaces(lines[persistIndex])}persist-credentials: false`;
    changes.push({
      ruleId: 'AWG016',
      description: `set actions/checkout persist-credentials: false at line ${persistIndex + 1}`
    });
    return;
  }

  const withIndex = findKeyInRange(lines, checkoutIndex + 1, blockEnd, 'with');
  if (withIndex !== -1) {
    lines.splice(withIndex + 1, 0, `${leadingSpaces(lines[withIndex])}  persist-credentials: false`);
  } else {
    lines.splice(checkoutIndex + 1, 0, `${childIndent}with:`, `${valueIndent}persist-credentials: false`);
  }

  changes.push({
    ruleId: 'AWG016',
    description: `add actions/checkout persist-credentials: false after line ${checkoutIndex + 1}`
  });
}

function applyMissingPermissionsFix(lines, changes) {
  if (hasTopLevelPermissions(lines)) return;
  const jobsIndex = lines.findIndex((line) => /^jobs\s*:\s*(?:#.*)?$/i.test(line));
  if (jobsIndex === -1) return;

  lines.splice(jobsIndex, 0, 'permissions:', '  contents: read', '');
  changes.push({
    ruleId: 'AWG008',
    description: 'add top-level permissions: contents: read before jobs'
  });
}

function findCheckoutLine(lines, index) {
  for (let cursor = index; cursor >= Math.max(0, index - 8); cursor -= 1) {
    if (/uses\s*:\s*actions\/checkout@/i.test(lines[cursor] || '')) return cursor;
  }
  return -1;
}

function findStepBlockEnd(lines, startIndex, startIndentWidth) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indentWidth = leadingSpaces(line).length;
    if (indentWidth <= startIndentWidth && /^\s*-\s+/.test(line)) return index;
    if (indentWidth < startIndentWidth) return index;
  }
  return lines.length;
}

function findKeyInRange(lines, start, end, key) {
  const pattern = new RegExp(`^\\s*${escapeRegex(key)}\\s*:`, 'i');
  for (let index = start; index < end; index += 1) {
    if (pattern.test(lines[index])) return index;
  }
  return -1;
}

function hasTopLevelPermissions(lines) {
  return lines.some((line) => /^permissions\s*:/i.test(line));
}

function leadingSpaces(line) {
  return line.match(/^\s*/)[0];
}

function isWorkflowFile(file) {
  return ['.yml', '.yaml'].includes(path.extname(file || '').toLowerCase());
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

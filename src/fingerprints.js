import crypto from 'node:crypto';

export function findingFingerprint(finding) {
  return crypto
    .createHash('sha256')
    .update([finding.ruleId, finding.file, normalizeText(finding.evidence || finding.message)].join('\0'))
    .digest('hex')
    .slice(0, 32);
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function renderBadgeSnippets({
  repo = 'OWNER/REPO',
  branch = 'main',
  badgeFile = 'docs/awguard-badge.json',
  site = ''
} = {}) {
  const rawBadgeUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${badgeFile}`;
  const badgeEndpoint = `https://img.shields.io/endpoint?url=${rawBadgeUrl}`;
  const lines = [
    '# AWGuard Badge Snippets',
    '',
    'Copy the snippets that match your repository setup.',
    '',
    '## AWI Risk',
    '',
    '```markdown',
    `[![AWI risk](${badgeEndpoint})](${badgeFile})`,
    '```',
    '',
    'Generate the badge JSON with:',
    '',
    '```bash',
    `npx awguard@latest . --format badge --output ${badgeFile}`,
    '```',
    '',
    '## GitHub Action',
    '',
    '```markdown',
    `[![AWGuard](https://github.com/${repo}/actions/workflows/awguard.yml/badge.svg)](https://github.com/${repo}/actions/workflows/awguard.yml)`,
    '```',
    '',
    '## Code Scanning',
    '',
    '```markdown',
    `[![Code Scanning](https://github.com/${repo}/actions/workflows/code-scanning.yml/badge.svg)](https://github.com/${repo}/actions/workflows/code-scanning.yml)`,
    '```',
    '',
    '## npm',
    '',
    '```markdown',
    '[![npm](https://img.shields.io/npm/v/awguard)](https://www.npmjs.com/package/awguard)',
    '```',
    '',
    '## Release',
    '',
    '```markdown',
    `[![GitHub release](https://img.shields.io/github/v/release/${repo})](https://github.com/${repo}/releases)`,
    '```'
  ];

  if (site) {
    lines.push(
      '',
      '## Project Site',
      '',
      '```markdown',
      `[![Project site](https://img.shields.io/badge/site-live-0f766e)](${site})`,
      '```'
    );
  }

  return lines.join('\n');
}

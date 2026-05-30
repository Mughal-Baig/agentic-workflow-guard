const cp = require('node:child_process');
const path = require('node:path');
const vscode = require('vscode');

const severityMap = {
  critical: vscode.DiagnosticSeverity.Error,
  high: vscode.DiagnosticSeverity.Error,
  medium: vscode.DiagnosticSeverity.Warning,
  low: vscode.DiagnosticSeverity.Information
};

function activate(context) {
  const output = vscode.window.createOutputChannel('AWGuard');
  const diagnostics = vscode.languages.createDiagnosticCollection('awguard');

  context.subscriptions.push(output, diagnostics);
  context.subscriptions.push(
    vscode.commands.registerCommand('awguard.scanWorkspace', async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showWarningMessage('Open a workspace before running AWGuard.');
        return;
      }

      diagnostics.clear();
      output.clear();
      output.show(true);
      output.appendLine(`Scanning ${folder.uri.fsPath}`);

      try {
        const report = await runAwguard(folder.uri.fsPath, output);
        publishDiagnostics(report, folder.uri.fsPath, diagnostics);
        vscode.window.showInformationMessage(`AWGuard found ${report.findings.length} finding(s).`);
      } catch (error) {
        vscode.window.showErrorMessage(`AWGuard scan failed: ${error.message}`);
      }
    })
  );
}

function runAwguard(workspacePath, output) {
  const config = vscode.workspace.getConfiguration('awguard');
  const command = config.get('command', 'npx');
  const configuredArgs = config.get('args', ['awguard@latest']);
  const args = [...configuredArgs, workspacePath, '--format', 'json', '--fail-on', 'none'];
  const executable = process.platform === 'win32' && command === 'npx' ? 'npx.cmd' : command;

  return new Promise((resolve, reject) => {
    const child = cp.spawn(executable, args, {
      cwd: workspacePath,
      shell: false,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      output.append(chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      output.append(chunk.toString());
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `awguard exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`could not parse AWGuard JSON output: ${error.message}`));
      }
    });
  });
}

function publishDiagnostics(report, workspacePath, diagnostics) {
  const byFile = new Map();

  for (const finding of report.findings || []) {
    const file = path.resolve(workspacePath, finding.file);
    const uri = vscode.Uri.file(file);
    const line = Math.max(0, (finding.line || 1) - 1);
    const column = Math.max(0, (finding.column || 1) - 1);
    const range = new vscode.Range(line, column, line, column + 1);
    const diagnostic = new vscode.Diagnostic(
      range,
      `${finding.ruleId}: ${finding.title}\n${finding.message}\nFix: ${finding.suggestion}`,
      severityMap[finding.severity] || vscode.DiagnosticSeverity.Warning
    );
    diagnostic.code = finding.ruleId;
    diagnostic.source = 'AWGuard';

    const existing = byFile.get(uri.toString()) || { uri, diagnostics: [] };
    existing.diagnostics.push(diagnostic);
    byFile.set(uri.toString(), existing);
  }

  for (const item of byFile.values()) {
    diagnostics.set(item.uri, item.diagnostics);
  }
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};

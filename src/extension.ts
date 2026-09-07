import * as vscode from 'vscode';
import { decodeJwt, looksLikeJwt, JwtDecodeError, JwtDecodeResult } from './jwtDecode';

// Matches the hover word-range pattern: same shape as JWT_PATTERN in
// jwtDecode.ts, kept separate because VS Code's word-range regex has its
// own matching semantics (used by getWordRangeAtPosition, not a plain test).
const JWT_WORD_RANGE = /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/;

function expiryLine(result: JwtDecodeResult): string | undefined {
  if (result.isExpired === true) {
    return `⚠️ **Expired** at ${result.expiresAt?.toISOString()}`;
  }
  if (result.isExpired === false) {
    return `✅ Valid until ${result.expiresAt?.toISOString()}`;
  }
  return undefined;
}

function buildHoverMarkdown(result: JwtDecodeResult): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.isTrusted = false;
  md.appendMarkdown('**JWT Companion**\n\n');
  const expiry = expiryLine(result);
  if (expiry) {
    md.appendMarkdown(expiry + '\n\n');
  }
  md.appendMarkdown('**Header**\n');
  md.appendCodeblock(JSON.stringify(result.header, null, 2), 'json');
  md.appendMarkdown('**Payload**\n');
  md.appendCodeblock(JSON.stringify(result.payload, null, 2), 'json');
  if (!result.signaturePresent) {
    md.appendMarkdown('\n_No signature segment present (unsigned or truncated token)._\n');
  }
  md.appendMarkdown('\n_Signature is not cryptographically verified in this v0.1 — structure and expiry only._');
  return md;
}

let outputChannel: vscode.OutputChannel | undefined;

function writeDecodeResult(candidate: string): void {
  let result: JwtDecodeResult;
  try {
    result = decodeJwt(candidate.trim());
  } catch (error) {
    const message = error instanceof JwtDecodeError ? error.message : String(error);
    void vscode.window.showErrorMessage(`JWT Companion: ${message}`);
    return;
  }

  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('JWT Companion');
  }
  outputChannel.clear();
  outputChannel.appendLine('=== Header ===');
  outputChannel.appendLine(JSON.stringify(result.header, null, 2));
  outputChannel.appendLine('');
  outputChannel.appendLine('=== Payload ===');
  outputChannel.appendLine(JSON.stringify(result.payload, null, 2));
  outputChannel.appendLine('');
  const expiry = expiryLine(result);
  if (expiry) {
    outputChannel.appendLine(expiry.replace(/\*\*|⚠️|✅/g, '').trim());
  }
  if (!result.signaturePresent) {
    outputChannel.appendLine('No signature segment present (unsigned or truncated token).');
  }
  outputChannel.appendLine('(Signature not cryptographically verified in this v0.1.)');
  outputChannel.show(true);
}

export function activate(context: vscode.ExtensionContext): void {
  const hoverProvider = vscode.languages.registerHoverProvider('*', {
    provideHover(document, position) {
      const wordRange = document.getWordRangeAtPosition(position, JWT_WORD_RANGE);
      if (!wordRange) {
        return undefined;
      }
      const candidate = document.getText(wordRange);
      if (!looksLikeJwt(candidate)) {
        return undefined;
      }
      try {
        const result = decodeJwt(candidate);
        return new vscode.Hover(buildHoverMarkdown(result), wordRange);
      } catch {
        // Looked like a JWT (matched the 3-segment shape) but didn't
        // actually decode -- fall through silently rather than showing an
        // error hover for what might just be an unrelated dotted string.
        return undefined;
      }
    },
  });

  const decodeCommand = vscode.commands.registerCommand('jwtCompanion.decodeSelection', async () => {
    const editor = vscode.window.activeTextEditor;
    let candidate: string | undefined;
    if (editor && !editor.selection.isEmpty) {
      candidate = editor.document.getText(editor.selection);
    } else {
      candidate = await vscode.window.showInputBox({
        prompt: 'Paste a JWT to decode (header.payload.signature)',
        placeHolder: 'eyJhbGciOiJIUzI1NiJ9...',
      });
    }
    if (!candidate) {
      return;
    }
    if (!looksLikeJwt(candidate.trim())) {
      void vscode.window.showErrorMessage(
        'JWT Companion: that does not look like a JWT (expected header.payload.signature).',
      );
      return;
    }
    writeDecodeResult(candidate);
  });

  context.subscriptions.push(hoverProvider, decodeCommand);
}

export function deactivate(): void {
  outputChannel?.dispose();
}

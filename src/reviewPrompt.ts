import * as vscode from 'vscode';

/**
 * Asks the user to rate the extension on the Marketplace, once, after
 * a real number of JWTs decoded via the command -- never on install, never on a timer.
 * Counts invocations directly instead of tracking a set of seen keys:
 * each call site only fires `recordHit` after a genuinely successful,
 * non-empty result, so there's no re-triggering risk to dedup against.
 *
 * Persisted via `ExtensionContext.globalState` (not workspaceState) --
 * how many times this extension has been used isn't tied to any one
 * workspace, and neither is whether the user already answered.
 *
 * Standard mechanism used catalog-wide since 2026-08-24.
 */

const HITS_BEFORE_PROMPT = 10;

const KEY_HIT_COUNT = 'jwtCompanion.review.hitCount';
const KEY_ANSWERED = 'jwtCompanion.review.answered';

// Links directly to this extension's own review page -- already
// published, unlike most of the catalog which still falls back to the
// publisher page until their first manual publish.
const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/items?itemName=GapHunterLabs.jwt-companion&ssr=false#review-details';

/**
 * Call this once per real JWTs decoded via the command. Safe to call multiple times; a
 * no-op once the user has already answered.
 */
export function recordHit(context: vscode.ExtensionContext): void {
  if (context.globalState.get<boolean>(KEY_ANSWERED, false)) {
    return;
  }

  const count = context.globalState.get<number>(KEY_HIT_COUNT, 0) + 1;
  void context.globalState.update(KEY_HIT_COUNT, count);

  if (count === HITS_BEFORE_PROMPT) {
    showPrompt(context);
  }
}

function showPrompt(context: vscode.ExtensionContext): void {
  const rateAction = 'Rate on Marketplace';
  const dismissAction = "Don't ask again";

  void vscode.window
    .showInformationMessage(
      `JWT Companion: you've used this ${HITS_BEFORE_PROMPT} times -- if it's saved you time, a rating on the Marketplace helps other developers find it.`,
      rateAction,
      dismissAction,
    )
    .then((selection) => {
      if (selection === rateAction) {
        void context.globalState.update(KEY_ANSWERED, true);
        void vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_URL));
      } else if (selection === dismissAction) {
        void context.globalState.update(KEY_ANSWERED, true);
      }
      // No selection (dismissed by clicking away): leave unanswered so
      // it can prompt again after the next real hit.
    });
}

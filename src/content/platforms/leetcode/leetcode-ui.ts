import { PlatformAdapter } from '../../../types';
import { LeetCodeDetector } from './leetcode-detector';
import './leetcode.css';

export class LeetCodeUI {
  private static BUTTON_ID = 'codesync-push-btn';
  private static observer: MutationObserver | null = null;
  private static submissionObserver: MutationObserver | null = null;
  private static retryTimer: number | null = null;
  private static adapter: PlatformAdapter | null = null;
  private static lastSyncedSubmission = '';
  private static isPushing = false;

  /**
   * Cleans up any existing injected UI elements and observers
   */
  static removeUI(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.submissionObserver) {
      this.submissionObserver.disconnect();
      this.submissionObserver = null;
    }
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const existingBtn = document.getElementById(this.BUTTON_ID);
    if (existingBtn) {
      existingBtn.remove();
    }
  }

  /**
   * Main entry point to inject the "🚀 Push to GitHub" button
   */
  static inject(adapter?: PlatformAdapter): void {
    if (adapter) {
      this.adapter = adapter;
    }

    // Avoid duplicate injections
    if (document.getElementById(this.BUTTON_ID)) {
      this.startSubmissionObserver();
      return;
    }

    // Attempt injection immediately
    const injected = this.attemptInjection();
    if (!injected) {
      this.startObserver();
    }

    this.startSubmissionObserver();
  }

  /**
   * Scans DOM for LeetCode's submission controls and mounts button
   */
  private static attemptInjection(): boolean {
    if (document.getElementById(this.BUTTON_ID)) {
      return true;
    }

    // 1. Look for Submit button locator
    const submitBtn =
      document.querySelector('[data-e2e-locator="console-submit-button"]') ||
      document.querySelector('button[data-testid="submit-btn"]') ||
      this.findButtonByText('Submit');

    if (submitBtn && submitBtn.parentElement) {
      const button = this.createButton(false);
      // Insert right next to the Submit button
      if (submitBtn.nextSibling) {
        submitBtn.parentElement.insertBefore(button, submitBtn.nextSibling);
      } else {
        submitBtn.parentElement.appendChild(button);
      }
      return true;
    }

    // 2. Look for editor toolbar action buttons
    const editorToolbar =
      document.querySelector('div[class*="editor"] div[class*="toolbar"]') ||
      document.querySelector('div[class*="action-btn-container"]');

    if (editorToolbar) {
      const button = this.createButton(false);
      editorToolbar.appendChild(button);
      return true;
    }

    return false;
  }

  /**
   * Sets up MutationObserver to wait for LeetCode's dynamic elements
   */
  private static startObserver(): void {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      const injected = this.attemptInjection();
      if (injected && this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    });

    this.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Fallback: If after 3.5 seconds the console submit button hasn't rendered,
    // inject a sleek floating action pill so the button is always accessible
    this.retryTimer = window.setTimeout(() => {
      if (!document.getElementById(this.BUTTON_ID)) {
        console.log('[CodeSync] Action bar not found yet, mounting floating button fallback.');
        const floatingBtn = this.createButton(true);
        document.body.appendChild(floatingBtn);
      }
    }, 3500);
  }

  /**
   * Watches DOM for LeetCode's "Accepted" submission state to trigger auto-sync
   */
  private static startSubmissionObserver(): void {
    if (this.submissionObserver) return;

    this.submissionObserver = new MutationObserver(() => {
      if (this.isPushing) return;

      const isAccepted = LeetCodeDetector.detectAcceptedSubmission();
      if (isAccepted) {
        const slug = LeetCodeDetector.getProblemSlug() || '';
        const submissionKey = `${slug}-${Math.floor(Date.now() / 15000)}`;

        if (this.lastSyncedSubmission !== submissionKey) {
          this.lastSyncedSubmission = submissionKey;
          console.log('[CodeSync] Accepted submission detected! Triggering auto-sync...');
          this.showToast('🎉 Accepted submission detected! Syncing solution...', 'info');
          this.executePushFlow(true);
        }
      }
    });

    this.submissionObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Builds the Push to GitHub button DOM node
   */
  private static createButton(isFloating: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.id = this.BUTTON_ID;
    btn.className = isFloating ? 'codesync-btn codesync-btn-floating' : 'codesync-btn';
    btn.type = 'button';
    btn.setAttribute('title', 'Push solution directly to GitHub');

    btn.innerHTML = `
      <span class="codesync-btn-icon">🚀</span>
      <span>Push to GitHub</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.executePushFlow(false);
    });

    return btn;
  }

  /**
   * Executes the full push pipeline: checks auth, extracts solution & problem, sends to background
   */
  static async executePushFlow(isAuto = false): Promise<void> {
    if (this.isPushing) return;
    this.isPushing = true;

    const btn = document.getElementById(this.BUTTON_ID) as HTMLButtonElement | null;

    // Update button to loading state
    if (btn) {
      btn.disabled = true;
      btn.classList.add('codesync-btn-loading');
      btn.innerHTML = `
        <span class="codesync-spinner"></span>
        <span>Pushing to GitHub...</span>
      `;
    }

    try {
      // 1. Check GitHub connection status
      const authStatus = await new Promise<{ isConnected: boolean; username?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve({ isConnected: false });
          } else {
            resolve(response);
          }
        });
      });

      if (!authStatus.isConnected) {
        this.showToast(
          '⚠️ GitHub not connected! Connect your token to sync.',
          'warning',
          undefined,
          true
        );
        this.resetButton(btn);
        this.isPushing = false;
        return;
      }

      // 2. Extract Problem Details
      if (!this.adapter) {
        throw new Error('Platform adapter is not initialized.');
      }

      const problem = await this.adapter.getProblem();
      if (!problem) {
        throw new Error('Could not extract problem details from current page.');
      }

      // 3. Extract Solution Code & Language
      const solution = await this.adapter.getSolution();
      if (!solution || !solution.code || !solution.code.trim()) {
        throw new Error('Could not find solution code in the editor. Please write or load your code first.');
      }

      console.log(`[CodeSync] Pushing ${problem.title} (${solution.language}) with ${solution.code.length} chars...`);

      // 4. Send PUSH_SOLUTION message to background service worker
      const pushResult = await new Promise<{
        success: boolean;
        repoUrl?: string;
        fileUrl?: string;
        commitSha?: string;
        error?: string;
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'PUSH_SOLUTION',
            problem,
            solution,
          },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message,
              });
            } else {
              resolve(res || { success: false, error: 'Empty response from background worker' });
            }
          }
        );
      });

      if (pushResult.success) {
        // Success state on button
        if (btn) {
          btn.classList.remove('codesync-btn-loading');
          btn.classList.add('codesync-btn-success');
          btn.innerHTML = `
            <span class="codesync-btn-icon">✅</span>
            <span>Pushed!</span>
          `;
          setTimeout(() => this.resetButton(btn), 3500);
        }

        const displayTitle = problem.problemNumber
          ? `#${problem.problemNumber} ${problem.title}`
          : problem.title;
        const successMsg = isAuto
          ? `🎉 Auto-synced: ${displayTitle}`
          : `🎉 Pushed: ${displayTitle}`;

        this.showToast(successMsg, 'success', pushResult.fileUrl || pushResult.repoUrl);
      } else {
        throw new Error(pushResult.error || 'Failed to push to GitHub');
      }
    } catch (err: unknown) {
      console.error('[CodeSync] Push failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown push error occurred.';
      this.showToast(`❌ ${errMsg}`, 'error');
      this.resetButton(btn);
    } finally {
      this.isPushing = false;
    }
  }

  /**
   * Resets button back to idle state
   */
  private static resetButton(btn: HTMLButtonElement | null): void {
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('codesync-btn-loading', 'codesync-btn-success');
    btn.innerHTML = `
      <span class="codesync-btn-icon">🚀</span>
      <span>Push to GitHub</span>
    `;
  }

  /**
   * Displays a temporary notification toast with optional action link or settings button
   */
  static showToast(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    actionUrl?: string,
    showSettingsBtn = false
  ): void {
    const existing = document.querySelector('.codesync-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `codesync-toast codesync-toast-${type}`;

    let html = `<span>${message}</span>`;
    if (actionUrl) {
      html += `<a href="${actionUrl}" target="_blank" rel="noopener noreferrer" class="codesync-toast-link">View File ↗</a>`;
    }
    if (showSettingsBtn) {
      html += `<button type="button" class="codesync-toast-btn" id="codesync-toast-settings-btn">Open Settings</button>`;
    }

    toast.innerHTML = html;
    document.body.appendChild(toast);

    if (showSettingsBtn) {
      const btn = toast.querySelector('#codesync-toast-settings-btn');
      btn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
      });
    }

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('codesync-toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('codesync-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  /**
   * Helper to find button by visible text
   */
  private static findButtonByText(text: string): HTMLButtonElement | null {
    const buttons = Array.from(document.querySelectorAll('button'));
    return (
      buttons.find((b) => b.textContent?.trim().toLowerCase() === text.toLowerCase()) || null
    );
  }
}

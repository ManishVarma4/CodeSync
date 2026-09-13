import { platformRegistry } from '../platforms/platform-registry';
import { LeetCodeAdapter } from './platforms/leetcode/leetcode-adapter';
import { onSpaUrlChange } from './common/content-utils';

console.log('[CodeSync] Content script initialized.');

// Register platform adapters
const leetcodeAdapter = new LeetCodeAdapter();
platformRegistry.register(leetcodeAdapter);

function initCurrentPage(): void {
  const activeAdapter = platformRegistry.findActiveAdapter();
  if (activeAdapter) {
    console.log(`[CodeSync] Detected active platform: ${activeAdapter.platformName}. Injecting UI...`);
    activeAdapter.injectUI();
  }
}

// Initial check on document load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrentPage);
} else {
  initCurrentPage();
}

// Monitor SPA transitions (e.g. navigation between problems without page reload)
onSpaUrlChange((newUrl) => {
  console.log(`[CodeSync] SPA navigation detected to: ${newUrl}`);
  // Clean up existing adapter UI
  leetcodeAdapter.cleanup();

  // Re-inject for new problem
  initCurrentPage();
});

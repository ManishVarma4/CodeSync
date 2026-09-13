/**
 * Waits for an element matching any of the provided selectors to appear in the DOM.
 */
export async function waitForAnyElement(
  selectors: string[],
  timeoutMs = 8000,
  parent: Element | Document = document
): Promise<Element | null> {
  const findMatch = (): Element | null => {
    for (const selector of selectors) {
      try {
        const el = parent.querySelector(selector);
        if (el) return el;
      } catch {
        // Ignore invalid selector syntax if any
      }
    }
    return null;
  };

  const initial = findMatch();
  if (initial) return initial;

  return new Promise((resolve) => {
    let timeoutId: number | undefined;

    const observer = new MutationObserver(() => {
      const match = findMatch();
      if (match) {
        if (timeoutId) clearTimeout(timeoutId);
        observer.disconnect();
        resolve(match);
      }
    });

    observer.observe(parent === document ? document.body || document.documentElement : parent, {
      childList: true,
      subtree: true,
    });

    timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(findMatch());
    }, timeoutMs);
  });
}

/**
 * Monitors URL changes in Single Page Applications (SPA).
 * Intercepts history.pushState, history.replaceState, and popstate events.
 */
export function onSpaUrlChange(callback: (newUrl: string) => void): () => void {
  let currentUrl = window.location.href;

  const checkUrl = () => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      currentUrl = newUrl;
      callback(newUrl);
    }
  };

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    checkUrl();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    checkUrl();
    return result;
  };

  window.addEventListener('popstate', checkUrl);

  // Polling fallback to catch any router shifts that bypass history API
  const intervalId = window.setInterval(checkUrl, 500);

  return () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', checkUrl);
    window.clearInterval(intervalId);
  };
}

/**
 * Simple debounce utility to prevent multiple rapid triggers during DOM mutations
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number): T {
  let timer: number | undefined;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delayMs);
  }) as T;
}

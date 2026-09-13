/**
 * Main-world script injected into LeetCode problem pages.
 * Runs in the page's execution context (world: "MAIN") with direct access to window.monaco.
 */

interface EditorState {
  code: string;
  language: string;
}

function extractFromMonaco(): EditorState | null {
  try {
    const monaco = (window as unknown as { monaco?: { editor?: { getModels?: () => Array<{ getValue: () => string; getLanguageId: () => string; uri?: { toString: () => string } }> } } }).monaco;
    if (!monaco?.editor?.getModels) return null;

    const models = monaco.editor.getModels();
    if (!models || models.length === 0) return null;

    // Pick model with non-empty code; if multiple, pick the one with longest code
    let bestModel = null;
    let maxLength = 0;

    for (const model of models) {
      const val = model.getValue();
      if (val && val.trim().length > maxLength) {
        maxLength = val.trim().length;
        bestModel = model;
      }
    }

    if (bestModel) {
      const code = bestModel.getValue();
      const language = bestModel.getLanguageId() || 'cpp';
      return { code, language };
    }
  } catch (err) {
    console.warn('[CodeSync Main] Error inspecting Monaco models:', err);
  }
  return null;
}

function extractFromCodeMirror(): EditorState | null {
  try {
    const cmEl = document.querySelector('.CodeMirror') as HTMLElement & { CodeMirror?: { getValue: () => string } };
    if (cmEl?.CodeMirror?.getValue) {
      const code = cmEl.CodeMirror.getValue();
      if (code && code.trim().length > 0) {
        return { code, language: 'cpp' };
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

function getEditorState(): EditorState | null {
  return extractFromMonaco() || extractFromCodeMirror();
}

function updateCacheElement(state: EditorState | null): void {
  let cacheEl = document.getElementById('codesync-editor-cache');
  if (!cacheEl) {
    cacheEl = document.createElement('div');
    cacheEl.id = 'codesync-editor-cache';
    cacheEl.style.display = 'none';
    (document.body || document.documentElement).appendChild(cacheEl);
  }

  if (state) {
    cacheEl.setAttribute('data-code', encodeURIComponent(state.code));
    cacheEl.setAttribute('data-lang', state.language);
    cacheEl.setAttribute('data-updated', String(Date.now()));
  }
}

function initMainWorldBridge(): void {
  console.log('[CodeSync Main] Main-world bridge initialized.');

  // Listen for extraction requests from the isolated content script
  window.addEventListener('CODESYNC_GET_CODE_REQUEST', () => {
    const state = getEditorState();
    updateCacheElement(state);
    window.dispatchEvent(
      new CustomEvent('CODESYNC_GET_CODE_RESPONSE', {
        detail: state,
      })
    );
  });

  // Periodic check to keep DOM cache updated
  setInterval(() => {
    const state = getEditorState();
    if (state) {
      updateCacheElement(state);
    }
  }, 2000);
}

// Start bridge
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainWorldBridge);
} else {
  initMainWorldBridge();
}

import { PlatformAdapter, ProblemInfo, SolutionInfo } from '../../../types';
import { LeetCodeDetector } from './leetcode-detector';
import { LeetCodeUI } from './leetcode-ui';

export class LeetCodeAdapter implements PlatformAdapter {
  readonly platformId = 'leetcode';
  readonly platformName = 'LeetCode';

  isSupportedPage(): boolean {
    return LeetCodeDetector.isProblemPage();
  }

  async getProblem(): Promise<ProblemInfo | null> {
    const basic = LeetCodeDetector.extractBasicProblemInfo();
    if (!basic) return null;

    return {
      platform: this.platformId,
      problemId: basic.slug,
      problemNumber: basic.number,
      title: basic.title,
      slug: basic.slug,
      difficulty: basic.difficulty,
      description: basic.description,
      url: window.location.href.split('?')[0].split('#')[0],
    };
  }

  async getSolution(): Promise<SolutionInfo | null> {
    // 1. Request fresh state from the main-world bridge (Monaco model)
    const bridgeResult = await this.queryMainWorldBridge();
    if (bridgeResult?.code && bridgeResult.code.trim().length > 0) {
      const language = this.normalizeLanguage(bridgeResult.language);
      return {
        code: bridgeResult.code,
        language,
      };
    }

    // 2. Check DOM cache element as secondary option
    const cached = this.readFromCacheElement();
    if (cached?.code && cached.code.trim().length > 0) {
      const language = this.normalizeLanguage(cached.language);
      return {
        code: cached.code,
        language,
      };
    }

    // 3. Fallback to DOM line extraction (Monaco Editor .view-line elements)
    const domResult = this.extractFromMonacoDOM();
    if (domResult?.code && domResult.code.trim().length > 0) {
      const language = this.normalizeLanguage(domResult.language);
      return {
        code: domResult.code,
        language,
      };
    }

    return null;
  }

  injectUI(): void {
    LeetCodeUI.inject(this);
  }

  cleanup(): void {
    LeetCodeUI.removeUI();
  }

  private queryMainWorldBridge(): Promise<{ code: string; language: string } | null> {
    return new Promise((resolve) => {
      let timeoutId: number | undefined;

      const onResponse = (e: Event) => {
        const customEvent = e as CustomEvent<{ code: string; language: string } | null>;
        if (timeoutId) window.clearTimeout(timeoutId);
        window.removeEventListener('CODESYNC_GET_CODE_RESPONSE', onResponse);
        resolve(customEvent.detail || null);
      };

      window.addEventListener('CODESYNC_GET_CODE_RESPONSE', onResponse);
      window.dispatchEvent(new CustomEvent('CODESYNC_GET_CODE_REQUEST'));

      timeoutId = window.setTimeout(() => {
        window.removeEventListener('CODESYNC_GET_CODE_RESPONSE', onResponse);
        resolve(null);
      }, 500);
    });
  }

  private readFromCacheElement(): { code: string; language: string } | null {
    try {
      const cacheEl = document.getElementById('codesync-editor-cache');
      if (cacheEl) {
        const rawCode = cacheEl.getAttribute('data-code');
        const lang = cacheEl.getAttribute('data-lang') || 'cpp';
        if (rawCode) {
          const code = decodeURIComponent(rawCode);
          return { code, language: lang };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private extractFromMonacoDOM(): { code: string; language: string } | null {
    try {
      const viewLines = document.querySelectorAll('.monaco-editor .view-lines .view-line');
      if (viewLines.length > 0) {
        const lines: string[] = [];
        viewLines.forEach((lineEl) => {
          lines.push(lineEl.textContent || '');
        });
        const code = lines.join('\n');
        const language = LeetCodeDetector.extractLanguageFromDOM() || 'cpp';
        return { code, language };
      }
    } catch {
      // Ignore
    }
    return null;
  }

  private normalizeLanguage(rawLang: string): string {
    const lang = rawLang.toLowerCase().trim();
    if (lang === 'c++') return 'cpp';
    if (lang === 'c#') return 'csharp';
    if (lang === 'python3') return 'python3';
    if (lang === 'python') return 'python';
    if (lang === 'golang') return 'go';
    if (lang === 'js') return 'javascript';
    if (lang === 'ts') return 'typescript';
    return lang || 'cpp';
  }
}

import { Difficulty } from '../../../types';

export class LeetCodeDetector {
  private static PROBLEM_URL_REGEX = /^https:\/\/(?:www\.)?leetcode\.com\/problems\/([^/?#]+)/i;

  /**
   * Checks if current URL is a LeetCode problem page
   */
  static isProblemPage(url: string = window.location.href): boolean {
    return this.PROBLEM_URL_REGEX.test(url);
  }

  /**
   * Extracts problem slug from URL
   */
  static getProblemSlug(url: string = window.location.href): string | null {
    const match = url.match(this.PROBLEM_URL_REGEX);
    return match ? match[1] : null;
  }

  /**
   * Attempts to extract problem title and number from DOM or page title
   */
  static extractBasicProblemInfo(): {
    title: string;
    number?: number;
    slug: string;
    difficulty?: Difficulty;
    description?: string;
  } | null {
    const slug = this.getProblemSlug();
    if (!slug) return null;

    // 1. Try DOM elements with known LeetCode title selectors
    const titleSelectors = [
      'div[class*="text-title-large"]',
      '[data-cy="question-title"]',
      'div[data-track-load="description_content"] h4',
      'div[class*="text-lg"][class*="font-medium"]',
      'div.flex-1 > div.text-title-large',
      'a[href^="/problems/"][class*="text-"]',
    ];

    let rawTitle = '';
    for (const selector of titleSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent?.trim()) {
        rawTitle = el.textContent.trim();
        break;
      }
    }

    // 2. Fallback to document.title: "1. Two Sum - LeetCode" or "Two Sum - LeetCode"
    if (!rawTitle) {
      const docTitle = document.title || '';
      const parts = docTitle.split('-');
      if (parts.length > 0 && parts[0].trim()) {
        rawTitle = parts[0].trim();
      }
    }

    // 3. Fallback to slug formatted nicely
    if (!rawTitle || rawTitle.toLowerCase().includes('leetcode')) {
      rawTitle = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }

    // Extract problem number if present at the start (e.g. "1. Two Sum" or "104. Maximum Depth...")
    let number: number | undefined;
    const numberMatch = rawTitle.match(/^(\d+)\s*[\.\-:]\s*(.+)/);
    if (numberMatch) {
      number = parseInt(numberMatch[1], 10);
      rawTitle = numberMatch[2].trim();
    }

    const difficulty = this.extractDifficulty();
    const description = this.extractProblemDescription();

    return {
      title: rawTitle,
      number,
      slug,
      difficulty,
      description,
    };
  }

  /**
   * Scrapes problem difficulty (Easy, Medium, Hard)
   */
  static extractDifficulty(): Difficulty | undefined {
    // Check known difficulty classes/attributes
    const easySelector = '[class*="text-difficulty-easy"], [class*="text-olive"], [data-degree="easy"]';
    if (document.querySelector(easySelector)) return 'Easy';

    const medSelector = '[class*="text-difficulty-medium"], [class*="text-yellow"], [data-degree="medium"]';
    if (document.querySelector(medSelector)) return 'Medium';

    const hardSelector = '[class*="text-difficulty-hard"], [class*="text-pink"], [class*="text-red"], [data-degree="hard"]';
    if (document.querySelector(hardSelector)) return 'Hard';

    // Scan badges in description panel
    const badges = document.querySelectorAll('div[class*="rounded-"], span[class*="rounded-"]');
    for (const badge of badges) {
      const txt = badge.textContent?.trim();
      if (txt === 'Easy') return 'Easy';
      if (txt === 'Medium') return 'Medium';
      if (txt === 'Hard') return 'Hard';
    }

    return undefined;
  }

  /**
   * Scrapes problem description text
   */
  static extractProblemDescription(): string | undefined {
    const descSelectors = [
      'div[data-track-load="description_content"]',
      'div[class*="elfjS"]',
      'div[class*="_1l1MA"]',
      'div[class*="question-content"]',
    ];

    for (const selector of descSelectors) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el && el.innerText && el.innerText.trim().length > 20) {
        return el.innerText.trim();
      }
    }
    return undefined;
  }

  /**
   * Scrapes selected language from the editor toolbar dropdown button
   */
  static extractLanguageFromDOM(): string | undefined {
    const knownLanguages = [
      'c++', 'java', 'python3', 'python', 'c', 'c#', 'javascript', 'typescript',
      'php', 'swift', 'kotlin', 'dart', 'go', 'ruby', 'scala', 'rust', 'racket',
      'erlang', 'elixir', 'sql', 'mysql', 'postgresql'
    ];

    // Check dropdown button in editor toolbar
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase();
      if (text) {
        for (const lang of knownLanguages) {
          if (text === lang || text.startsWith(`${lang} `) || text === `${lang}\n`) {
            return lang;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Checks if an "Accepted" submission badge is currently visible
   */
  static detectAcceptedSubmission(): boolean {
    const candidateSelectors = [
      '[data-e2e-locator="submission-result"]',
      'div[class*="text-green"]',
      'span[class*="text-green"]',
      'div[class*="text-sd-green"]',
      'span[class*="text-sd-green"]',
      'div[class*="status-accepted"]',
      'span[class*="status-accepted"]',
      '[data-state="accepted"]',
      '[data-e2e-locator="console-result-accepted"]',
      'div[class*="text-success"]',
      'span[class*="text-success"]',
    ];

    for (const sel of candidateSelectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const text = el.textContent?.trim().toLowerCase();
        if (text === 'accepted') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if a failed submission verdict is currently visible (Wrong Answer, TLE, etc.)
   */
  static detectFailedSubmission(): boolean {
    const failureKeywords = [
      'wrong answer',
      'time limit exceeded',
      'memory limit exceeded',
      'runtime error',
      'compile error',
      'output limit exceeded',
    ];

    const failureSelectors = [
      '[data-e2e-locator="submission-result"]',
      'div[class*="text-red"]',
      'span[class*="text-red"]',
      'div[class*="text-sd-red"]',
      'span[class*="text-sd-red"]',
      'div[class*="status-error"]',
      'span[class*="status-error"]',
      '[data-state="failed"]',
      '[data-state="error"]',
    ];

    for (const sel of failureSelectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        const text = el.textContent?.trim().toLowerCase();
        if (text && failureKeywords.some((keyword) => text.includes(keyword))) {
          return true;
        }
      }
    }
    return false;
  }
}


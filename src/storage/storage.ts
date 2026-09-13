import { UserSettings } from '../types';

const DEFAULT_SETTINGS: UserSettings = {
  repoVisibility: 'private',
  platformRepos: {
    leetcode: 'leetcode',
    codechef: 'codechef',
    codeforces: 'codeforces',
    hackerrank: 'hackerrank',
    geeksforgeeks: 'geeksforgeeks',
  },
  enabledPlatforms: {
    leetcode: true,
    codechef: false,
    codeforces: false,
    hackerrank: false,
    geeksforgeeks: false,
  },
};

export class StorageService {
  /**
   * Retrieves user configuration from chrome.storage.sync (with fallback to local)
   */
  static async getSettings(): Promise<UserSettings> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return DEFAULT_SETTINGS;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get(['settings'], (result) => {
        if (chrome.runtime.lastError || !result.settings) {
          resolve(DEFAULT_SETTINGS);
        } else {
          resolve({
            ...DEFAULT_SETTINGS,
            ...result.settings,
            platformRepos: {
              ...DEFAULT_SETTINGS.platformRepos,
              ...(result.settings.platformRepos || {}),
            },
            enabledPlatforms: {
              ...DEFAULT_SETTINGS.enabledPlatforms,
              ...(result.settings.enabledPlatforms || {}),
            },
          });
        }
      });
    });
  }

  /**
   * Saves partial or full settings to chrome.storage.sync
   */
  static async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    const current = await this.getSettings();
    const updated: UserSettings = {
      ...current,
      ...settings,
      platformRepos: {
        ...current.platformRepos,
        ...(settings.platformRepos || {}),
      },
      enabledPlatforms: {
        ...current.enabledPlatforms,
        ...(settings.enabledPlatforms || {}),
      },
    };

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ settings: updated }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * GitHub credentials should be stored in chrome.storage.local for security
   */
  static async getAuth(): Promise<{ token?: string; username?: string }> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return {};
    }

    return new Promise((resolve) => {
      chrome.storage.local.get(['githubToken', 'githubUsername'], (result) => {
        resolve({
          token: result.githubToken,
          username: result.githubUsername,
        });
      });
    });
  }

  static async setAuth(token: string, username: string): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ githubToken: token, githubUsername: username }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static async clearAuth(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(['githubToken', 'githubUsername'], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

import React, { useEffect, useState } from 'react';
import { StorageService } from '../storage/storage';
import { UserSettings } from '../types';
import './Options.css';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [auth, setAuth] = useState<{ token?: string; username?: string }>({});
  const [patInput, setPatInput] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  useEffect(() => {
    StorageService.getSettings().then(setSettings);
    StorageService.getAuth().then(setAuth);
  }, []);

  const handleSaveVisibility = async (visibility: 'private' | 'public') => {
    if (!settings) return;
    const updated = { ...settings, repoVisibility: visibility };
    setSettings(updated);
    await StorageService.saveSettings({ repoVisibility: visibility });
    showSaveIndicator('Repository visibility updated');
  };

  const handleSaveRepoName = async (platform: string, name: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      platformRepos: {
        ...settings.platformRepos,
        [platform]: name,
      },
    };
    setSettings(updated);
    await StorageService.saveSettings(updated);
    showSaveIndicator('Repository mapping saved');
  };

  const handleDisconnectGitHub = async () => {
    await StorageService.clearAuth();
    setAuth({});
    showSaveIndicator('Disconnected GitHub account');
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;

    // Verify token with GitHub API directly
    try {
      setSaveStatus('Verifying token with GitHub...');
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${patInput.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error('Invalid token or insufficient scopes');
      }

      const userData = await response.json();
      await StorageService.setAuth(patInput.trim(), userData.login);
      setAuth({ token: patInput.trim(), username: userData.login });
      setPatInput('');
      setShowTokenInput(false);
      showSaveIndicator(`Connected as @${userData.login}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'GitHub verification failed';
      setSaveStatus(`Error: ${errorMsg}`);
    }
  };

  const showSaveIndicator = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 4000);
  };

  if (!settings) {
    return <div className="options-loading">Loading settings...</div>;
  }

  return (
    <div className="options-container">
      <div className="options-header">
        <div className="header-brand">
          <div className="brand-icon">⚡</div>
          <div>
            <h1>CodeSync Settings</h1>
            <p>Configure GitHub repositories, visibility, and platform sync</p>
          </div>
        </div>
        {saveStatus && <div className="save-toast">{saveStatus}</div>}
      </div>

      <div className="options-grid">
        {/* GitHub Account Section */}
        <section className="settings-card">
          <div className="card-header">
            <h2>GitHub Account</h2>
            <span className={`badge ${auth.token ? 'badge-success' : 'badge-neutral'}`}>
              {auth.token ? 'Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="card-body">
            {auth.token ? (
              <div className="connected-account">
                <div className="account-details">
                  <span className="account-icon">🐙</span>
                  <div>
                    <div className="account-user">@{auth.username}</div>
                    <div className="account-sub">Connected with repository access</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDisconnectGitHub}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="connect-form-wrap">
                <p className="description-text">
                  Connect your GitHub account to push accepted problem solutions to GitHub on click.
                </p>
                {!showTokenInput ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowTokenInput(true)}
                  >
                    Connect with Personal Access Token (PAT)
                  </button>
                ) : (
                  <form onSubmit={handleConnectToken} className="token-form">
                    <label htmlFor="pat-input" className="form-label">
                      GitHub Personal Access Token (classic with <code>repo</code> scope)
                    </label>
                    <div className="input-group">
                      <input
                        id="pat-input"
                        type="password"
                        placeholder="ghp_..."
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        className="form-input"
                        required
                      />
                      <button type="submit" className="btn btn-primary">
                        Authorize
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowTokenInput(false)}
                      >
                        Cancel
                      </button>
                    </div>
                    <span className="input-help">
                      Create a token at <strong>github.com &gt; Settings &gt; Developer settings &gt; Personal access tokens</strong> with <code>repo</code> scope.
                    </span>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Repository Settings */}
        <section className="settings-card">
          <div className="card-header">
            <h2>Repository Settings</h2>
          </div>
          <div className="card-body">
            <div className="setting-group">
              <label className="group-label">Default Repository Visibility</label>
              <p className="description-text">
                When CodeSync creates a new repository for solutions, what visibility should it use?
              </p>
              <div className="radio-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="repoVisibility"
                    value="private"
                    checked={settings.repoVisibility === 'private'}
                    onChange={() => handleSaveVisibility('private')}
                  />
                  <div>
                    <span className="radio-title">Private (Recommended)</span>
                    <span className="radio-desc">Only you can view and access your solution repositories.</span>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="repoVisibility"
                    value="public"
                    checked={settings.repoVisibility === 'public'}
                    onChange={() => handleSaveVisibility('public')}
                  />
                  <div>
                    <span className="radio-title">Public</span>
                    <span className="radio-desc">Repositories are visible to everyone on your GitHub profile.</span>
                  </div>
                </label>
              </div>
            </div>

            <hr className="divider" />

            <div className="setting-group">
              <label className="group-label">Platform Repository Names</label>
              <p className="description-text">Target repository name for each competitive programming platform:</p>
              <div className="repo-input-list">
                <div className="repo-input-row">
                  <span className="platform-tag">LeetCode</span>
                  <input
                    type="text"
                    value={settings.platformRepos?.leetcode || 'leetcode'}
                    onChange={(e) => handleSaveRepoName('leetcode', e.target.value)}
                    className="form-input form-input-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Settings */}
        <section className="settings-card">
          <div className="card-header">
            <h2>Supported Platforms</h2>
          </div>
          <div className="card-body">
            <p className="description-text">
              Choose which competitive programming platforms you want CodeSync to actively monitor.
            </p>
            <div className="checkbox-list">
              <label className="checkbox-item active-item">
                <input type="checkbox" checked={true} readOnly />
                <div>
                  <span className="checkbox-title">LeetCode</span>
                  <span className="checkbox-desc">Active (Phase 1) - Monitored at leetcode.com/problems/*</span>
                </div>
              </label>
              <label className="checkbox-item disabled-item">
                <input type="checkbox" checked={false} disabled />
                <div>
                  <span className="checkbox-title">CodeChef</span>
                  <span className="checkbox-desc">Coming Soon</span>
                </div>
              </label>
              <label className="checkbox-item disabled-item">
                <input type="checkbox" checked={false} disabled />
                <div>
                  <span className="checkbox-title">Codeforces</span>
                  <span className="checkbox-desc">Coming Soon</span>
                </div>
              </label>
              <label className="checkbox-item disabled-item">
                <input type="checkbox" checked={false} disabled />
                <div>
                  <span className="checkbox-title">HackerRank</span>
                  <span className="checkbox-desc">Coming Soon</span>
                </div>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

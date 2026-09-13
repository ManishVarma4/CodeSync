import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { PlatformList } from './components/PlatformList';
import { StorageService } from '../storage/storage';
import './App.css';

export const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [username, setUsername] = useState<string | undefined>();
  const [defaultRepo, setDefaultRepo] = useState<string>('leetcode');

  useEffect(() => {
    // Load auth status and preferences
    StorageService.getAuth().then((auth) => {
      setIsConnected(Boolean(auth.token));
      setUsername(auth.username);
    });

    StorageService.getSettings().then((settings) => {
      setDefaultRepo(settings.platformRepos?.leetcode || 'leetcode');
    });
  }, []);

  const handleOpenSettings = () => {
    if (chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  };

  return (
    <div className="popup-container">
      <Header
        isConnected={isConnected}
        username={username}
        onOpenSettings={handleOpenSettings}
      />

      {/* GitHub Account Card */}
      <div className="section">
        <div className="section-title">GitHub Account</div>
        <div className="github-card">
          <div className="github-status">
            <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`} />
            <div className="github-meta">
              <span className="github-state-label">
                {isConnected ? 'Connected' : 'Not Connected'}
              </span>
              {isConnected && username ? (
                <span className="github-username">@{username}</span>
              ) : (
                <span className="github-hint">Connect your GitHub to sync</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleOpenSettings}
          >
            {isConnected ? 'Manage' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Platforms */}
      <PlatformList />

      {/* Repositories */}
      <div className="section">
        <div className="section-title">Repositories</div>
        <div className="repo-card">
          <div className="repo-mapping">
            <span className="repo-platform">LeetCode</span>
            <span className="repo-arrow">→</span>
            <span className="repo-target">{defaultRepo}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="popup-footer">
        <button
          type="button"
          className="settings-link-btn"
          onClick={handleOpenSettings}
        >
          <span>⚙️ Settings & Permissions</span>
        </button>
      </div>
    </div>
  );
};

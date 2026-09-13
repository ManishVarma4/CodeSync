import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  username?: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, username, onOpenSettings }) => {
  return (
    <header className="popup-header">
      <div className="brand">
        <div className="brand-logo">⚡</div>
        <div className="brand-text">
          <h1 className="brand-name">CodeSync</h1>
          <span className="brand-tagline">
            {isConnected && username ? `@${username}` : 'Problem → GitHub Sync'}
          </span>
        </div>
      </div>
      <button 
        type="button"
        className="icon-button"
        title="Open Settings"
        onClick={onOpenSettings}
      >
        ⚙️
      </button>
    </header>
  );
};

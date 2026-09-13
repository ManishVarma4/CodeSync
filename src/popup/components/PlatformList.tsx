import React from 'react';

interface PlatformItem {
  id: string;
  name: string;
  status: 'active' | 'coming_soon';
  repo: string;
}

const PLATFORMS: PlatformItem[] = [
  { id: 'leetcode', name: 'LeetCode', status: 'active', repo: 'leetcode' },
  { id: 'codechef', name: 'CodeChef', status: 'coming_soon', repo: 'codechef' },
  { id: 'codeforces', name: 'Codeforces', status: 'coming_soon', repo: 'codeforces' },
  { id: 'hackerrank', name: 'HackerRank', status: 'coming_soon', repo: 'hackerrank' },
  { id: 'geeksforgeeks', name: 'GeeksForGeeks', status: 'coming_soon', repo: 'geeksforgeeks' },
];

export const PlatformList: React.FC = () => {
  return (
    <div className="section">
      <div className="section-title">Supported Platforms</div>
      <div className="platform-list">
        {PLATFORMS.map((platform) => (
          <div key={platform.id} className={`platform-card ${platform.status}`}>
            <div className="platform-info">
              <span className="platform-status-icon">
                {platform.status === 'active' ? '✓' : '○'}
              </span>
              <span className="platform-name">{platform.name}</span>
            </div>
            <span className="platform-badge">
              {platform.status === 'active' ? 'Active' : 'Coming soon'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

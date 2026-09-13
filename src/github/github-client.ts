/**
 * GitHub API Client Layer
 * Handles GitHub REST API v3 operations for repository and file management.
 */

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return `${fallback} (${res.status} ${res.statusText})`;
  }
}

export class GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token.trim();
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async getAuthenticatedUser(): Promise<{ login: string; id: number; name: string }> {
    const res = await fetch('https://api.github.com/user', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const msg = await parseErrorMessage(res, 'GitHub authentication failed');
      throw new Error(msg);
    }
    return res.json();
  }

  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: this.getHeaders(),
    });
    return res.status === 200;
  }

  async createRepository(name: string, isPrivate: boolean): Promise<any> {
    const res = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        private: isPrivate,
        description: 'Solutions synchronized by CodeSync',
        auto_init: true,
      }),
    });
    if (!res.ok) {
      const msg = await parseErrorMessage(res, `Failed to create repository ${name}`);
      throw new Error(msg);
    }
    const data = await res.json();
    // Allow GitHub to finish initializing the default branch
    await new Promise((r) => setTimeout(r, 1200));
    return data;
  }

  async getFile(owner: string, repo: string, path: string): Promise<{ sha: string; content: string } | null> {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: this.getHeaders(),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const msg = await parseErrorMessage(res, `Failed to check file ${path}`);
      throw new Error(msg);
    }
    return res.json();
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string): Promise<any> {
    const base64Content = toBase64(content);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: base64Content,
      }),
    });
    if (!res.ok) {
      const msg = await parseErrorMessage(res, `Failed to create file ${path}`);
      throw new Error(msg);
    }
    return res.json();
  }

  async updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string): Promise<any> {
    const base64Content = toBase64(content);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: base64Content,
        sha,
      }),
    });
    if (!res.ok) {
      const msg = await parseErrorMessage(res, `Failed to update file ${path}`);
      throw new Error(msg);
    }
    return res.json();
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ contentUrl?: string; commitSha?: string }> {
    const existing = await this.getFile(owner, repo, path);
    if (existing) {
      const res = await this.updateFile(owner, repo, path, content, existing.sha, message);
      return {
        contentUrl: res?.content?.html_url,
        commitSha: res?.commit?.sha,
      };
    } else {
      const res = await this.createFile(owner, repo, path, content, message);
      return {
        contentUrl: res?.content?.html_url,
        commitSha: res?.commit?.sha,
      };
    }
  }
}

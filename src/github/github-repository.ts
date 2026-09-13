import { GitHubClient } from './github-client';

export class GitHubRepositoryService {
  private client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  async ensureRepository(owner: string, repoName: string, isPrivate: boolean): Promise<string> {
    const exists = await this.client.repositoryExists(owner, repoName);
    if (!exists) {
      console.log(`[CodeSync] Repository ${owner}/${repoName} does not exist. Creating...`);
      await this.client.createRepository(repoName, isPrivate);
    }
    return `https://github.com/${owner}/${repoName}`;
  }
}

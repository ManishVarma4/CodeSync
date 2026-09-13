export type Difficulty = 'Easy' | 'Medium' | 'Hard' | string;

export interface ProblemInfo {
  platform: string;
  problemId?: string;
  problemNumber?: number;
  title: string;
  slug?: string;
  difficulty?: Difficulty;
  description?: string;
  url: string;
}

export interface SolutionInfo {
  language: string;
  code: string;
}

export interface PlatformAdapter {
  platformId: string;
  platformName: string;
  isSupportedPage(): boolean;
  getProblem(): Promise<ProblemInfo | null>;
  getSolution(): Promise<SolutionInfo | null>;
  injectUI(): void;
}

export interface PlatformConfig {
  id: string;
  name: string;
  enabled: boolean;
  implemented: boolean;
  defaultRepo: string;
}

export interface UserSettings {
  githubToken?: string;
  githubUsername?: string;
  repoVisibility: 'private' | 'public';
  platformRepos: Record<string, string>;
  enabledPlatforms: Record<string, boolean>;
}

export interface PushResult {
  success: boolean;
  repoUrl?: string;
  fileUrl?: string;
  commitSha?: string;
  error?: string;
}

export type ExtensionMessage =
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'AUTH_STATUS_RESPONSE'; isConnected: boolean; username?: string }
  | { type: 'PUSH_SOLUTION'; problem: ProblemInfo; solution: SolutionInfo }
  | { type: 'PUSH_SOLUTION_RESULT'; result: PushResult };

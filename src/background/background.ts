import { StorageService } from '../storage/storage';
import { GitHubClient } from '../github/github-client';
import { GitHubRepositoryService } from '../github/github-repository';
import { buildSolutionPath, buildProblemDirPath, generateProblemReadme } from '../github/github-files';
import { ProblemInfo, SolutionInfo, PushResult } from '../types';

console.log('[CodeSync] Service worker loaded.');

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log(`[CodeSync] Extension installed/updated: ${details.reason}`);
  const settings = await StorageService.getSettings();
  console.log('[CodeSync] Current settings loaded:', settings);
});

async function handlePushSolution(
  problem: ProblemInfo,
  solution: SolutionInfo
): Promise<PushResult> {
  // 1. Verify user authentication
  const auth = await StorageService.getAuth();
  if (!auth.token || !auth.username) {
    return {
      success: false,
      error: 'GitHub account not connected. Please open CodeSync Settings to configure your GitHub Personal Access Token.',
    };
  }

  // 2. Validate solution code
  if (!solution || !solution.code || !solution.code.trim()) {
    return {
      success: false,
      error: 'No solution code found to push. Write or submit your code first.',
    };
  }

  // 3. Retrieve user settings
  const settings = await StorageService.getSettings();
  const platformKey = problem.platform || 'leetcode';
  const repoName = (settings.platformRepos && settings.platformRepos[platformKey]) || 'leetcode';
  const isPrivate = settings.repoVisibility !== 'public';

  console.log(`[CodeSync] Initiating push to GitHub: ${auth.username}/${repoName}`);

  // 4. Initialize GitHub Client and ensure repository exists
  const client = new GitHubClient(auth.token);
  const repoService = new GitHubRepositoryService(client);
  const repoUrl = await repoService.ensureRepository(auth.username, repoName, isPrivate);

  // 5. Build file paths
  const problemSlug = problem.slug || problem.title;
  const solutionPath = buildSolutionPath(
    problem.platform,
    problemSlug,
    problem.problemNumber,
    solution.language
  );
  const dirPath = buildProblemDirPath(
    problem.platform,
    problemSlug,
    problem.problemNumber
  );
  const readmePath = `${dirPath}/README.md`;

  const commitMsg = problem.problemNumber
    ? `Solve #${problem.problemNumber} ${problem.title} [${solution.language}]`
    : `Solve ${problem.title} [${solution.language}]`;

  // 6. Commit solution file
  const fileResult = await client.createOrUpdateFile(
    auth.username,
    repoName,
    solutionPath,
    solution.code,
    commitMsg
  );

  // 7. Commit or update problem README.md
  try {
    const readmeContent = generateProblemReadme(problem);
    await client.createOrUpdateFile(
      auth.username,
      repoName,
      readmePath,
      readmeContent,
      `Add documentation for ${problem.title}`
    );
  } catch (readmeErr) {
    console.warn('[CodeSync] Problem README push warning:', readmeErr);
  }

  const fileUrl =
    fileResult.contentUrl ||
    `https://github.com/${auth.username}/${repoName}/blob/main/${solutionPath}`;

  console.log(`[CodeSync] Solution successfully pushed: ${fileUrl}`);

  return {
    success: true,
    repoUrl,
    fileUrl,
    commitSha: fileResult.commitSha,
  };
}

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_AUTH_STATUS') {
    StorageService.getAuth().then((auth) => {
      sendResponse({
        isConnected: Boolean(auth.token),
        username: auth.username,
      });
    });
    return true; // Keep message channel open for asynchronous response
  }

  if (message?.type === 'PUSH_SOLUTION') {
    handlePushSolution(message.problem, message.solution)
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.error('[CodeSync Background] Push solution error:', err);
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'An unexpected error occurred while pushing to GitHub.',
        });
      });
    return true;
  }

  if (message?.type === 'OPEN_OPTIONS_PAGE') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }
    sendResponse({ success: true });
    return false;
  }

  if (message?.type === 'PING') {
    sendResponse({ pong: true, time: Date.now() });
    return false;
  }
});

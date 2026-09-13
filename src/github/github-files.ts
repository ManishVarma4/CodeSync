import type { ProblemInfo } from '../types/index.ts';

export const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  'c++': 'solution.cpp',
  cpp: 'solution.cpp',
  'c#': 'solution.cs',
  csharp: 'solution.cs',
  cs: 'solution.cs',
  c: 'solution.c',
  python: 'solution.py',
  python3: 'solution.py',
  py: 'solution.py',
  java: 'Solution.java',
  javascript: 'solution.js',
  js: 'solution.js',
  typescript: 'solution.ts',
  ts: 'solution.ts',
  golang: 'solution.go',
  go: 'solution.go',
  rust: 'solution.rs',
  rs: 'solution.rs',
  kotlin: 'solution.kt',
  kt: 'solution.kt',
  swift: 'solution.swift',
  ruby: 'solution.rb',
  rb: 'solution.rb',
  scala: 'solution.scala',
  dart: 'solution.dart',
  php: 'solution.php',
  racket: 'solution.rkt',
  rkt: 'solution.rkt',
  erlang: 'solution.erl',
  elixir: 'solution.ex',
  sql: 'solution.sql',
  mysql: 'solution.sql',
  mssql: 'solution.sql',
  postgresql: 'solution.sql',
  bash: 'solution.sh',
  sh: 'solution.sh',
};

export function getFilenameForLanguage(language: string): string {
  const normalized = language.toLowerCase().trim();
  return LANGUAGE_EXTENSION_MAP[normalized] || 'solution.txt';
}

export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildProblemDirPath(platform: string, slug: string, problemNumber?: number): string {
  const cleanSlug = sanitizeSlug(slug);
  const dirName =
    problemNumber !== undefined && problemNumber > 0
      ? `${String(problemNumber).padStart(4, '0')}-${cleanSlug}`
      : cleanSlug;
  return `${platform}/${dirName}`;
}

export function buildSolutionPath(platform: string, slug: string, problemNumber?: number, language: string = 'cpp'): string {
  const dir = buildProblemDirPath(platform, slug, problemNumber);
  const filename = getFilenameForLanguage(language);
  return `${dir}/${filename}`;
}

export function generateProblemReadme(problem: ProblemInfo): string {
  const titleDisplay = problem.problemNumber
    ? `${problem.problemNumber}. ${problem.title}`
    : problem.title;
  const difficultyDisplay = problem.difficulty || 'Unrated';

  let md = `# ${titleDisplay}\n\n`;
  md += `**Difficulty**: ${difficultyDisplay}  \n`;
  md += `**Link**: [${problem.url}](${problem.url})\n\n`;
  md += `---\n\n`;

  if (problem.description && problem.description.trim()) {
    md += `## Problem\n\n${problem.description.trim()}\n`;
  } else {
    md += `*Solution synchronized automatically via [CodeSync](https://github.com/)*\n`;
  }

  return md;
}

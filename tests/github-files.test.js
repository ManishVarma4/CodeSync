import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSolutionPath,
  buildProblemDirPath,
  getFilenameForLanguage,
  sanitizeSlug,
  generateProblemReadme,
} from '../src/github/github-files.ts';

test('Repository path: 1 + Two Sum + C++ -> leetcode/0001-two-sum/solution.cpp', () => {
  const path = buildSolutionPath('leetcode', 'two-sum', 1, 'c++');
  assert.equal(path, 'leetcode/0001-two-sum/solution.cpp');
});

test('Repository path: 1 + Two Sum + Python -> leetcode/0001-two-sum/solution.py', () => {
  const path = buildSolutionPath('leetcode', 'two-sum', 1, 'python');
  assert.equal(path, 'leetcode/0001-two-sum/solution.py');
});

test('Repository path: Missing number -> leetcode/two-sum/solution.cpp', () => {
  const path = buildSolutionPath('leetcode', 'two-sum', undefined, 'cpp');
  assert.equal(path, 'leetcode/two-sum/solution.cpp');
});

test('Filename sanitization: titles containing :, /, ?, \', "', () => {
  const dirtyTitle = 'Valid Palindrome: Part 1 / "Advanced" & \'Special\'?';
  const cleanSlug = sanitizeSlug(dirtyTitle);
  assert.equal(cleanSlug, 'valid-palindrome-part-1-advanced-special');

  const path = buildSolutionPath('leetcode', cleanSlug, 125, 'python3');
  assert.equal(path, 'leetcode/0125-valid-palindrome-part-1-advanced-special/solution.py');
  // Ensure no illegal characters for GitHub file paths
  assert.ok(!path.includes(':'));
  assert.ok(!path.includes('?'));
  assert.ok(!path.includes('"'));
  assert.ok(!path.includes("'"));
});

test('Language extension mapping works for all major languages', () => {
  assert.equal(getFilenameForLanguage('cpp'), 'solution.cpp');
  assert.equal(getFilenameForLanguage('python'), 'solution.py');
  assert.equal(getFilenameForLanguage('java'), 'Solution.java');
  assert.equal(getFilenameForLanguage('javascript'), 'solution.js');
  assert.equal(getFilenameForLanguage('typescript'), 'solution.ts');
  assert.equal(getFilenameForLanguage('golang'), 'solution.go');
  assert.equal(getFilenameForLanguage('rust'), 'solution.rs');
  assert.equal(getFilenameForLanguage('dart'), 'solution.dart');
  assert.equal(getFilenameForLanguage('scala'), 'solution.scala');
  assert.equal(getFilenameForLanguage('sql'), 'solution.sql');
});

test('Directory path generation helper', () => {
  const dir = buildProblemDirPath('leetcode', 'two-sum', 1);
  assert.equal(dir, 'leetcode/0001-two-sum');
});

test('Problem README markdown generation', () => {
  const readme = generateProblemReadme({
    platform: 'leetcode',
    problemNumber: 1,
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    url: 'https://leetcode.com/problems/two-sum/',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  });

  assert.ok(readme.includes('# 1. Two Sum'));
  assert.ok(readme.includes('**Difficulty**: Easy'));
  assert.ok(readme.includes('https://leetcode.com/problems/two-sum/'));
  assert.ok(readme.includes('Given an array of integers nums'));
});

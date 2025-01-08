import { SimpleGit } from 'simple-git';
import { log } from './console.js';
import { initializeGit } from '../client.js';

// Constants
const MAX_FILE_SIZE = 50 * 1024; // 50KB limit for full file content
const MAX_LINES_CONTEXT = 100;   // Max lines for partial content

async function getFileContent(git: SimpleGit, filePath: string): Promise<string | null> {
  try {
    const content = await git.show([`HEAD:${filePath}`]);
    return content;
  } catch {
    // File might be new or not exist in HEAD
    return null;
  }
}

async function getSmartFileContent(git: SimpleGit, filePath: string, diffLines: Set<number>): Promise<string | null> {
  const content = await getFileContent(git, filePath);
  if (!content) return null;

  // If file is small enough, return full content
  if (content.length < MAX_FILE_SIZE) {
    return content;
  }

  // For larger files, extract relevant sections
  const lines = content.split('\n');
  const relevantLines = new Set<number>();

  // Add lines around diff changes
  diffLines.forEach(line => {
    const start = Math.max(0, line - 25);
    const end = Math.min(lines.length, line + 25);
    for (let i = start; i < end; i++) {
      relevantLines.add(i);
    }
  });

  // If we're including too many lines, just return null
  if (relevantLines.size > MAX_LINES_CONTEXT) {
    return null;
  }

  // Build partial content with section markers
  const sortedLines = Array.from(relevantLines).sort((a, b) => a - b);
  let result = '';
  let lastLine = -1;

  for (const line of sortedLines) {
    if (lastLine !== -1 && line > lastLine + 1) {
      result += '\n// ... (skipped lines) ...\n';
    }
    result += lines[line] + '\n';
    lastLine = line;
  }

  return result;
}

export interface DiffInfo {
  diff: string;
  changedFiles: string[];
  stats: string;
  fileContents: Record<string, string>;
}

interface DiffOptions {
  shouldStage?: boolean;
  fromBranch?: string;
  toBranch?: string;
}

export const getSmartDiff = async (options: DiffOptions): Promise<DiffInfo> => {
  const git = initializeGit();
  const { shouldStage, fromBranch, toBranch } = options;

  // Handle staging if needed
  if (shouldStage) {
    await git.add('.');
  } else if (!fromBranch && !toBranch) {
    log.warning('\nℹ️  Note: Only reviewing staged changes. Use -s flag to stage and review all changes.\n');
  }

  // Prepare diff command arguments
  const baseArgs = [
    '--unified=8',
    '--function-context',
    '--diff-algorithm=histogram'
  ];

  let diff: string;
  if (fromBranch && toBranch) {
    // Get diff between branches
    try {
      diff = await git.diff([...baseArgs, `${fromBranch}...${toBranch}`]);
    } catch (error) {
      throw new Error(
        `Failed to get diff between branches. Please verify that '${fromBranch}' and '${toBranch}' are valid branch names.\n` +
        `Error: ${(error as Error).message}`
      );
    }
  } else {
    // Get diff for staged/unstaged changes (original behavior)
    diff = await git.diff(['--staged', ...baseArgs]) || await git.diff(baseArgs);
  }

  if (!diff) {
    throw new Error('No changes found in the repository.');
  }

  // Parse diff to get changed files and line numbers
  const changedFiles = new Map<string, Set<number>>();
  const diffLines = diff.split('\n');
  let currentFile = '';
  let currentLine = 0;

  for (const line of diffLines) {
    if (line.startsWith('+++')) {
      currentFile = line.slice(6);
      changedFiles.set(currentFile, new Set());
    } else if (line.startsWith('@@')) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      if (match) {
        currentLine = parseInt(match[1], 10);
      }
    } else if (line.startsWith('+') && currentFile) {
      changedFiles.get(currentFile)?.add(currentLine);
      currentLine++;
    } else if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  // Get full/partial content for changed files
  const fileContents = new Map<string, string>();
  for (const [file, lines] of changedFiles.entries()) {
    const content = await getSmartFileContent(git, file, lines);
    if (content) {
      fileContents.set(file, content);
    }
  }

  return {
    diff,
    changedFiles: Array.from(changedFiles.keys()),
    stats: await git.diff(['--stat']),
    fileContents: Object.fromEntries(fileContents)
  };
}; 
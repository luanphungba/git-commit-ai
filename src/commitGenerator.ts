import { OpenAI } from 'openai';
import { SimpleGit } from 'simple-git';
import { initializeGit, initializeOpenAI } from './client.js';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { log } from './utils/console.js';
import { getOpenAiModel } from './utils/config.js';

// Configuration
const CONFIG = {
  openAiModel: getOpenAiModel(),
  maxTokens: 500,
  temperature: 0.7
};

// Helper functions
const getStagedChanges = async (shouldStage: boolean, git: SimpleGit) => {
  if (shouldStage) {
    await git.add('.');
  }

  // First check staged changes
  let diff = await git.diff(['--staged']);

  // If no staged changes, check all changes
  if (!diff) {
    diff = await git.diff();

    // If still no changes, throw error
    if (!diff) {
      throw new Error('No changes found in the repository.');
    }

    log.warning('\n⚠️  No staged changes found. Analyzing all unstaged changes instead.');
  }

  return diff;
};

const createAIPrompt = (diff: string) => ({
  model: CONFIG.openAiModel,
  messages: [
    {
      role: 'system',
      content: `You are an AI assistant that performs three tasks:
1. Security check: Analyze the git diff for sensitive information. When found, specify:
   - The file path
   - The line number or context
   - The type of sensitive information (API key, password, token, etc.)
   - A brief description of the issue

2. Code Review: Analyze the changes for:
   - Potential bugs or issues
   - Code quality concerns
   - Performance implications
   - Best practices violations
   - Suggestions for improvement
   Note: Do not include style or linting issues in the review.

3. Generate a commit message: Create a clear, concise and precise commit message following conventional commits format.

Respond in the following JSON format:
{
  "security": {
    "hasSensitiveInfo": boolean,
    "details": string (Format each issue as "file.js:line - [type]: description")
  },
  "review": {
    "hasIssues": boolean,
    "feedback": Array<{
      "file": string,
      "line": string | number,
      "type": "bug" | "improvement" | "performance",
      "description": string,
      "suggestion": string
    }>
  },
  "commit": {
    "message": string
  }
}`
    },
    {
      role: 'user',
      content: `Please analyze this git diff and provide a security check, code review, and commit message:\n\n${diff}`
    }
  ] as ChatCompletionMessageParam[],
  max_tokens: CONFIG.maxTokens,
  temperature: CONFIG.temperature,
  response_format: { type: "json_object" }
} as ChatCompletionCreateParamsNonStreaming);

const handleSecurityWarning = (details: string) => {
  log.error('\n⚠️  WARNING: Sensitive information detected in your changes:');
  log.error(details);
  log.error('\nPlease review your changes and remove any sensitive information before committing.\n');
};

type SecurityResult = {
  hasSensitiveInfo: boolean;
  details: string;
};

type CommitResult = {
  message: string;
};

// Add new type for review feedback
type ReviewFeedbackItem = {
  file: string;
  line: string | number;
  type: 'bug' | 'improvement' | 'performance';
  description: string;
  suggestion: string;
};

// Update AIResponse type
type AIResponse = {
  security: SecurityResult;
  review: {
    hasIssues: boolean;
    feedback: ReviewFeedbackItem[];
  };
  commit: CommitResult;
};

// Add function to handle review feedback
const handleReviewFeedback = (feedback: ReviewFeedbackItem[]) => {
  if (feedback.length === 0) return;

  log.info('\n📋 Code Review Feedback:');
  feedback.forEach(item => {
    log.info(`\nFile: ${item.file}:${item.line}`);
    log.info(`Type: ${item.type}`);
    log.warning(`Issue: ${item.description}`);
    log.success(`Suggestion: ${item.suggestion}\n`);
  });
};

type GenerateCommitOptions = {
  stage?: boolean;
  debug?: boolean;
};

const parseAIResponse = (response: OpenAI.Chat.ChatCompletion): { 
  message: string; 
  hasSensitiveInfo: boolean;
  hasReviewIssues: boolean;
} => {
  try {
    const result = JSON.parse(response.choices[0].message.content || '') as AIResponse;

    if (result.security.hasSensitiveInfo) {
      handleSecurityWarning(result.security.details);
    }

    if (result.review.hasIssues) {
      handleReviewFeedback(result.review.feedback);
    }

    return {
      message: result.commit.message,
      hasSensitiveInfo: result.security.hasSensitiveInfo,
      hasReviewIssues: result.review.hasIssues
    };
  } catch (error) {
    log.warning('Warning: Failed to parse AI response, falling back to basic commit message');
    return {
      message: response.choices[0].message.content || '',
      hasSensitiveInfo: false,
      hasReviewIssues: false
    };
  }
};

// Main function
export async function generateCommitMessage(options: GenerateCommitOptions) {
  const git = initializeGit();
  const openai = initializeOpenAI();

  const diff = await getStagedChanges(options.stage ?? false, git);

  if (options.debug) {
    log.info('Git diff:', diff);
  }

  const prompt = createAIPrompt(diff);
  const response = await openai.chat.completions.create(prompt);

 return parseAIResponse(response);
} 

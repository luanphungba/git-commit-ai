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
      content: `You are an AI assistant that performs two tasks:
1. Security check: Analyze the git diff for sensitive information. When found, specify:
   - The file path
   - The line number or context
   - The type of sensitive information (API key, password, token, etc.)
   - A brief description of the issue
2. Generate a commit message: Create a clear, concise and precise commit message following conventional commits format.

Respond in the following JSON format:
{
  "security": {
    "hasSensitiveInfo": boolean,
    "details": string (Format each issue as "file.js:line - [type]: description")
  },
  "commit": {
    "message": string
  }
}`
    },
    {
      role: 'user',
      content: `Please analyze this git diff and generate a commit message:\n\n${diff}`
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

type AIResponse = {
  security: SecurityResult;
  commit: CommitResult;
};

type GenerateCommitOptions = {
  stage?: boolean;
  debug?: boolean;
};

const parseAIResponse = (response: OpenAI.Chat.ChatCompletion): { message: string; hasSensitiveInfo: boolean } => {
  try {
    const result = JSON.parse(response.choices[0].message.content || '') as AIResponse;

    if (result.security.hasSensitiveInfo) {
      handleSecurityWarning(result.security.details);
    }

    return {
      message: result.commit.message,
      hasSensitiveInfo: result.security.hasSensitiveInfo
    };
  } catch (error) {
    log.warning('Warning: Failed to parse AI response, falling back to basic commit message');
    return {
      message: response.choices[0].message.content || '',
      hasSensitiveInfo: false
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
  openai.project

  return parseAIResponse(response);
} 
import { OpenAI } from 'openai';
import { SimpleGit } from 'simple-git';
import { initializeGit, initializeOpenAI } from './client.js';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { log } from './utils/console.js';
import { getOpenAiModel } from './utils/config.js';
import { getSmartDiff, DiffInfo } from './utils/diffUtils.js';

// Configuration
const CONFIG = {
  openAiModel: getOpenAiModel(),
  maxTokens: 1000,
  temperature: 0.7
};

const createAIPrompt = (diffInfo: DiffInfo) => ({
  model: CONFIG.openAiModel,
  messages: [
    {
      role: 'system',
      content: `You are a senior software engineer performing a thorough code review. Provide your response as a JSON object.

Context:
- Files changed: ${diffInfo.changedFiles.join(', ')}
- Change statistics:
${diffInfo.stats}

Full/Partial File Contents:
${Object.entries(diffInfo.fileContents)
  .map(([file, content]) => `=== ${file} ===\n${content}\n`)
  .join('\n')}

When reviewing:
1. Use the full file content above for better context
2. Parse line numbers from diff chunks starting with @@ (e.g., "@@ -1,7 +1,9 @@")
   - The second number after + is the new file line number
   - Count lines after each @@ marker to track current line numbers
3. Extract file names from lines starting with "+++" (e.g., "+++ b/src/file.js")
4. In your feedback, always reference:
   - Exact file path from +++ lines
   - Correct line numbers based on the new file (after changes)
5. Focus review on NEW and MODIFIED code (lines with +)

Perform these tasks:

1. Security Analysis:
   - Check for exposed secrets, credentials, or sensitive data
   - Identify security vulnerabilities in the changes
   - Flag any unsafe operations or potential exploits

2. Code Review:
   Focus on the following aspects in order of priority:
   - Critical bugs and logic errors
   - Security vulnerabilities
   - Breaking changes and API compatibility
   - Error handling and edge cases
   - Performance issues in modified code
   - Architecture and design concerns
   
   Guidelines:
   - Review only the code visible in the diff
   - Provide accurate specific code for issues
   - Suggest concrete fixes
   - Consider the function context provided
   - Focus on substantial issues, not style

3. Commit Message Generation:
   Create a conventional commit message that accurately describes the changes.
   Format: type(scope): description
   Types: feat, fix, refactor, perf, docs, test, chore

Response Format:
{
  "security": {
    "hasSensitiveInfo": boolean,
    "details": string[] // Format: "file.js - [type]: description with relevant code snippet"
  },
  "review": {
    "hasIssues": boolean,
    "feedback": Array<{
      "severity": "high" | "medium" | "low",
      "file": string,
      "type": "bug" | "security" | "performance" | "architecture" | "reliability",
      "code": string,  // The problematic code snippet
      "description": string,
      "suggestion": string  // Include suggested code if applicable
    }>
  },
  "commit": {
    "message": string,
    "type": string,
    "scope": string,
    "description": string
  }
}`
    },
    {
      role: 'user',
      content: `Review this diff and provide the analysis as a JSON response:\n\n${diffInfo.diff}`
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
  type: 'bug' | 'improvement' | 'performance';
  code: string;  // Add code snippet field
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
    log.info(`\nFile: ${item.file}`);
    log.info(`Type: ${item.type}`);
    log.info(`Code:\n${item.code}`);
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
  const openai = initializeOpenAI();

  const diffInfo = await getSmartDiff({ shouldStage: options.stage ?? false });

  if (options.debug) {
    log.info('Git diff:', diffInfo.diff);
    log.info('Changed files:', diffInfo.changedFiles);
    log.info('Stats:', diffInfo.stats);
  }

  const prompt = createAIPrompt(diffInfo);
  const response = await openai.chat.completions.create(prompt);

  return parseAIResponse(response);
} 

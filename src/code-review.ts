import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { initializeOpenAI } from './client.js';
import { getOpenAiModel } from './utils/config.js';
import { log } from './utils/console.js';
import { getSmartDiff, DiffInfo } from './utils/diffUtils.js';

// Configuration
const CONFIG = {
    openAiModel: getOpenAiModel(),
    maxTokens: 500,
    temperature: 0.7
};

interface CodeReviewOptions {
    sourceBranch: string;
    targetBranch: string;
}

interface SecurityResult {
    hasSensitiveInfo: boolean;
    details: string[];
}

interface ReviewFeedbackItem {
    severity: 'high' | 'medium' | 'low';
    file: string;
    type: 'bug' | 'security' | 'performance' | 'architecture' | 'reliability';
    code: string;
    description: string;
    suggestion: string;
}

interface CodeReviewResult {
    security: SecurityResult;
    review: {
        hasIssues: boolean;
        feedback: ReviewFeedbackItem[];
    };
}

const createReviewPrompt = (diffInfo: DiffInfo): ChatCompletionCreateParamsNonStreaming => ({
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

Response Format:
{
  "security": {
    "hasSensitiveInfo": boolean,
    "details": string[]
  },
  "review": {
    "hasIssues": boolean,
    "feedback": Array<{
      "severity": "high" | "medium" | "low",
      "file": string,
      "type": "bug" | "security" | "performance" | "architecture" | "reliability",
      "code": string,
      "description": string,
      "suggestion": string
    }>
  }
}`
        },
        {
            role: 'user',
            content: `Review this diff and provide the analysis as a JSON response:\n\n${diffInfo.diff}`
        }
    ],
    max_tokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature,
    response_format: { type: "json_object" }
});

const handleSecurityWarning = (details: string[]) => {
    log.error('\n⚠️  WARNING: Sensitive information detected in your changes:');
    details.forEach(detail => log.error(detail));
    log.error('\nPlease review your changes and remove any sensitive information before committing.\n');
};

const displayReviewFeedback = (feedback: ReviewFeedbackItem[]) => {
    if (feedback.length === 0) {
        log.success('\n✅ No issues found in code review.');
        return;
    }

    log.info('\n📋 Code Review Feedback:');
    feedback.forEach(item => {
        log.info(`\nFile: ${item.file}`);
        log.info(`Severity: ${item.severity}`);
        log.info(`Type: ${item.type}`);
        log.info(`Code:\n${item.code}`);
        log.warning(`Issue: ${item.description}`);
        log.success(`Suggestion: ${item.suggestion}\n`);
    });
};

export async function reviewCode({ sourceBranch, targetBranch }: CodeReviewOptions): Promise<CodeReviewResult> {
    try {
        const diffInfo = await getSmartDiff({ fromBranch: sourceBranch, toBranch: targetBranch });

        if (!diffInfo?.diff) {
            return {
                security: { hasSensitiveInfo: false, details: [] },
                review: { hasIssues: false, feedback: [] }
            };
        }

        const openai = initializeOpenAI();
        const prompt = createReviewPrompt(diffInfo);
        const response = await openai.chat.completions.create(prompt);

        // Parse and handle the response
        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('No response content from OpenAI');
        }

        const result: CodeReviewResult = JSON.parse(content);

        // Handle security warnings if any
        if (result.security.hasSensitiveInfo) {
            handleSecurityWarning(result.security.details);
        }

        // Display the feedback
        displayReviewFeedback(result.review.feedback);

        return result;

    } catch (error) {
        if (error instanceof Error) {
            log.error('\n❌ Code review failed:', error.message);
            if (error.message.includes('OPENAI_API_KEY')) {
                log.warning('\nPlease run setup to configure your OpenAI API key:');
                log.cyan('cai --setup\n');
            }
            throw error;
        }
        throw error;
    }
}

import { execSync } from 'child_process';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { initializeOpenAI } from './client.js';
import { getOpenAiModel } from './utils/config.js';
import { log } from './utils/console.js';

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

interface CodeReviewFeedback {
    file: string;
    line: string | number;
    type: 'bug' | 'improvement' | 'performance';
    description: string;
    suggestion: string;
}

interface CodeReviewResult {
    review: {
        hasIssues: boolean;
        feedback: CodeReviewFeedback[];
    };
}

const createReviewPrompt = (diff: string): ChatCompletionCreateParamsNonStreaming => ({
    model: CONFIG.openAiModel,
    messages: [
        {
            role: 'system',
            content: 'You are a senior software engineer performing a code review. Return only critical issues in the specified JSON format. Be concise and specific.'
        },
        {
            role: 'user',
            content: `Review the following code changes and return issues in this exact plain JSON format:
{
  "review": {
    "hasIssues": boolean,
    "feedback": Array<{
      "file": string,
      "line": string | number,
      "type": "bug" | "improvement" | "performance",
      "description": string,
      "suggestion": string
    }>
  }
}

If no issues are found, return with hasIssues: false and empty feedback array.

Changes:
${diff}`
        }
    ] as ChatCompletionMessageParam[],
    max_tokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature,
    response_format: { type: "json_object" }
});

const displayReviewFeedback = (feedback: CodeReviewFeedback[]) => {
    if (feedback.length === 0) {
        log.success('\n✅ No issues found in code review.');
        return;
    }

    log.info('\n📋 Code Review Feedback:');
    feedback.forEach(item => {
        log.info(`\nFile: ${item.file}:${item.line}`);
        log.info(`Type: ${item.type}`);
        log.warning(`Issue: ${item.description}`);
        log.success(`Suggestion: ${item.suggestion}\n`);
    });
};

export async function reviewCode({ sourceBranch, targetBranch }: CodeReviewOptions): Promise<CodeReviewResult> {
    try {
        // Get the diff between branches
        const diff = execSync(
            `git diff ${targetBranch}...${sourceBranch}`,
            { encoding: 'utf-8' }
        );

        if (!diff) {
            return { review: { hasIssues: false, feedback: [] } };
        }

        // Initialize OpenAI client
        const openai = initializeOpenAI();

        // Get AI review
        const prompt = createReviewPrompt(diff);
        const response = await openai.chat.completions.create(prompt);

        // Parse and display the response
        const content = response.choices[0].message.content;
        const result: CodeReviewResult = content ? JSON.parse(content) : { review: { hasIssues: false, feedback: [] } };
        
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

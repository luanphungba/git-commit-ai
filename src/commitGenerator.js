import { OpenAI } from 'openai';
import chalk from 'chalk';
import { initializeGit, initializeOpenAI } from './clients.js';

// Configuration
const CONFIG = {
	openAiModel: 'gpt-4o-mini', // better for pricing
	maxTokens: 500,
	temperature: 0.7
};

// Helper functions
const getStagedChanges = async (shouldStage, git) => {
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
		
		console.log(chalk.yellow('\n⚠️  No staged changes found. Analyzing all unstaged changes instead.'));
	}

	return diff;
};

const createAIPrompt = (diff) => ({
	model: CONFIG.openAiModel,
	messages: [
		{
			role: "system",
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
			role: "user",
			content: `Please analyze this git diff and generate a commit message:\n\n${diff}`
		}
	],
	max_tokens: CONFIG.maxTokens,
	temperature: CONFIG.temperature,
	response_format: { type: "json_object" }
});

const handleSecurityWarning = (details) => {
	console.log(chalk.red('\n⚠️  WARNING: Sensitive information detected in your changes:'));
	console.log(chalk.red(details));
	console.log(chalk.red('\nPlease review your changes and remove any sensitive information before committing.\n'));
};

const parseAIResponse = (response) => {
	try {
		const result = JSON.parse(response.choices[0].message.content);

		if (result.security.hasSensitiveInfo) {
			handleSecurityWarning(result.security.details);
		}

		return {
			message: result.commit.message,
			hasSensitiveInfo: result.security.hasSensitiveInfo
		};
	} catch (error) {
		console.error(chalk.yellow('Warning: Failed to parse AI response, falling back to basic commit message'));
		return {
			message: response.choices[0].message.content,
			hasSensitiveInfo: false
		};
	}
};

// Main function
export async function generateCommitMessage(options) {
	const git = initializeGit();
	const openai = initializeOpenAI();
	
	const diff = await getStagedChanges(options.stage, git);

	if (options.debug) {
		console.log('Git diff:', diff);
	}

	const prompt = createAIPrompt(diff);
	const response = await openai.chat.completions.create(prompt);

	return parseAIResponse(response);
} 
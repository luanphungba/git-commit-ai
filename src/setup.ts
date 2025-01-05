#!/usr/bin/env node
import readline from 'readline';
import { log } from './utils/console.js';
import { getApiKey, setApiKey, getOpenAiModel, setOpenAiModel, DEFAULT_OPENAI_MODEL } from './utils/config.js';

// Separate interface creation for better organization
const createReadlineInterface = () => 
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

// Prompting utility function
const promptUser = (rl: readline.Interface) => 
  (query: string): Promise<string> => 
    new Promise((resolve) => rl.question(query, resolve));

// Validation function
const validateApiKey = (apiKey: string): boolean => {
  if (!apiKey.trim()) {
    log.error('\n❌ No API key provided. Setup cancelled.\n');
    log.warning('You can run setup again using:');
    log.warning('cai --setup\n');
    return false;
  }
  return true;
};

async function handleApiKeySetup(prompt: (query: string) => Promise<string>) {
  const existingApiKey = getApiKey();
  if (existingApiKey) {
    const shouldUpdate = await prompt('Do you want to update your OpenAI API key? (y/N): ');
    if (shouldUpdate.toLowerCase() !== 'y') {
      return true;
    }
  }

  log.info('\nTo use commit-ai, you need an OpenAI API key.');
  log.info('You can get one at: https://platform.openai.com/api-keys');
  log.info('Note: Your API key will be stored securely and never shared.\n');

  const apiKey = await prompt('Please enter your OpenAI API key: ');
  if (!validateApiKey(apiKey)) return false;

  setApiKey(apiKey.trim());
  return true;
}

async function handleModelSelection(prompt: (query: string) => Promise<string>) {
  const existingModel = getOpenAiModel();
  if (existingModel) {
    log.warning('\nCurrent OpenAI model:', existingModel);
    const shouldChange = await prompt('Do you want to change the OpenAI model? (y/N): ');
    if (shouldChange.toLowerCase() !== 'y') {
      return;
    }
  }

  const currentModel = getOpenAiModel() ?? DEFAULT_OPENAI_MODEL;
  log.info(`\nEnter OpenAI model name (default: ${currentModel})`);
  log.info('Examples: gpt-4, gpt-3.5-turbo');
  
  const modelInput = await prompt('\nModel name (press Enter for default): ');
  const model = modelInput.trim() || currentModel;
  setOpenAiModel(model);
  log.success(`\nOpenAI model set to: ${model}`);
}

async function setup() {
  log.cyan('\n🤖 Welcome to commit-ai setup!\n');

  const rl = createReadlineInterface();
  const prompt = promptUser(rl);

  try {
    const apiKeySetupSuccess = await handleApiKeySetup(prompt);
    if (!apiKeySetupSuccess) {
      process.exit(1);
    }
    
    await handleModelSelection(prompt);
    log.success('\n✅ Setup complete! Your configuration has been saved.\n');
    log.info('You can now use cai with:');
    log.cyan('cai --stage\n');

  } catch (error) {
    log.error('\n❌ Error during setup:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup(); 
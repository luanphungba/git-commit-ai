#!/usr/bin/env node
import readline from 'readline';
import { log } from './utils/console.js';
import config from './utils/config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  log.cyan('\n🤖 Welcome to commit-ai setup!\n');

  try {
    const existingApiKey = config.get('apiKey');
    if (existingApiKey) {
      log.warning('An existing API key was found.');
      const answer = await question('Do you want to update your OpenAI API key? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        log.success('\n✨ Setup complete! Existing configuration kept.\n');
        rl.close();
        return;
      }
    }

    log.info('\nTo use commit-ai, you need an OpenAI API key.');
    log.info('You can get one at: https://platform.openai.com/api-keys');
    log.info('Note: Your API key will be stored securely and never shared.\n');

    const apiKey = await question('Please enter your OpenAI API key: ');

    if (!apiKey) {
      log.error('\n❌ No API key provided. Setup cancelled.\n');
      log.warning('You can run setup again using:');
      log.warning('cai --setup\n');
      process.exit(1);
    }

    // Store the API key securely
    config.set('apiKey', apiKey.trim());

    log.success('\n✅ Setup complete! Your API key has been saved securely.\n');
    log.info('You can now use cai with:');
    log.cyan('cai --stage\n');

  } catch (error) {
    if (error instanceof Error) {
      log.error('\n❌ Error during setup:', error.message);
    } else {
      log.error('\n❌ Error during setup:', String(error));
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup(); 
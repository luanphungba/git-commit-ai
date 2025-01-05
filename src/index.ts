#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommitMessage } from './commitGenerator.js';
import { initializeGit } from './client.js';
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { log } from './utils/console.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('cai')
  .description('AI-powered git commit message generator')
  .version('1.0.4')
  .option('-d, --debug', 'output debug information')
  .option('-s, --stage', 'stage all changes')
  .option('-c, --commit', 'automatically commit with generated message')
  .option('--setup', 'run the setup process to configure API key');

program.parse();

const options = program.opts();

async function main() {
  try {
    if (options.setup) {
      const setupScript = join(__dirname, './setup.js');
      spawn('node', [setupScript], { stdio: 'inherit' });
      return;
    }

    const result = await generateCommitMessage(options);

    if (result.hasSensitiveInfo && options.commit) {
      log.error('\n❌ Automatic commit blocked due to sensitive information.\n');
      process.exit(1);
    }

    log.success('\n📝 Suggested commit message:');
    log.cyan(result.message);

    if (options.commit) {
      const git = initializeGit();
      await git.commit(result.message);
      log.success('\n✅ Changes committed successfully!\n');
    } else {
      log.info('\nTo use this message, run:');
      log.cyan(`git commit -m "${result.message}"\n`);
    }

  } catch (error) {
    // Type guard for error object
    if (error instanceof Error) {
      log.error('\n❌ Error:', error.message);
      if (error.message.includes('OPENAI_API_KEY')) {
        log.warning('\nPlease run setup to configure your OpenAI API key:');
        log.cyan('cai --setup\n');
      }
    } else {
      log.error('\n❌ Error:', 'An unknown error occurred');
    }
    process.exit(1);
  }
}

main(); 
#!/usr/bin/env node

import { Command } from 'commander';
import { generateCommitMessage } from './commitGenerator.js';
import { initializeGit } from './clients.js';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const program = new Command();

program
  .name('cai')
  .description('AI-powered git commit message generator')
  .version('1.0.0')
  .option('-d, --debug', 'output debug information')
  .option('-s, --stage', 'stage all changes')
  .option('-c, --commit', 'automatically commit with generated message')
  .option('--setup', 'run the setup process to configure API key');

program.parse();

const options = program.opts();

async function main() {
  try {
    // Handle setup command
    if (options.setup) {
      const setupScript = join(dirname(fileURLToPath(import.meta.url)), '../scripts/setup.js');
      spawn('node', [setupScript], { stdio: 'inherit' });
      return;
    }

    const result = await generateCommitMessage(options);

    if (result.hasSensitiveInfo && options.commit) {
      console.log(chalk.red('\n❌ Automatic commit blocked due to sensitive information.\n'));
      process.exit(1);
    }

    console.log(chalk.green('\n📝 Suggested commit message:'));
    console.log(chalk.cyan(result.message));

    if (options.commit) {
      const git = initializeGit();
      await git.commit(result.message);
      console.log(chalk.green('\n✅ Changes committed successfully!\n'));
    } else {
      console.log(chalk.blue('\nTo use this message, run:'));
      console.log(chalk.cyan(`git commit -m "${result.message}"\n`));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    if (error.message.includes('OPENAI_API_KEY')) {
      console.log(chalk.yellow('\nPlease run setup to configure your OpenAI API key:'));
      console.log(chalk.cyan('cai --setup\n'));
    }
    process.exit(1);
  }
}

main(); 
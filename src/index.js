#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { generateCommitMessage } from './commitGenerator.js';

const program = new Command();

program
  .name('git-commit-ai')
  .description('Generate AI-powered commit messages from git diff')
  .option('-d, --debug', 'output debug information')
  .option('-s, --stage', 'automatically stage all changes')
  .option('-c, --commit', 'automatically commit with generated message')
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    const result = await generateCommitMessage(options);
    
    if (options.commit && result.hasSensitiveInfo) {
      console.log(chalk.red('\n❌ Commit aborted due to sensitive information in changes.'));
      console.log(chalk.yellow('Please review the warnings above and try again after removing sensitive data.'));
      process.exit(1);
    }

    if (options.commit) {
      console.log(chalk.green('✓ Changes committed with message:'));
      console.log(chalk.white(result.message));
    } else {
      console.log(chalk.blue('Suggested commit message:'));
      console.log(chalk.white(result.message));
      if (result.hasSensitiveInfo) {
        console.log(chalk.yellow('\nNote: Due to sensitive information, using --commit would be blocked.'));
      } else {
        console.log(chalk.gray('\nRun with --commit to automatically commit changes'));
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

main(); 
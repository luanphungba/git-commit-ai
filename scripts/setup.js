#!/usr/bin/env node
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '../.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log(chalk.cyan('\n🤖 Welcome to git-commit-ai setup!\n'));

  try {
    // Check if .env already exists
    try {
      await fs.access(ENV_PATH);
      console.log(chalk.yellow('An existing configuration was found.'));
      const answer = await question('Do you want to update your OpenAI API key? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log(chalk.green('\n✨ Setup complete! Existing configuration kept.\n'));
        rl.close();
        return;
      }
    } catch (err) {
      // .env doesn't exist, continue with setup
    }

    console.log(chalk.blue('\nTo use git-commit-ai, you need an OpenAI API key.'));
    console.log(chalk.blue('You can get one at: https://platform.openai.com/api-keys\n'));

    const apiKey = await question('Please enter your OpenAI API key: ');

    if (!apiKey) {
      console.log(chalk.red('\n❌ No API key provided. Setup cancelled.\n'));
      console.log(chalk.yellow('You can run setup again using:'));
      console.log(chalk.yellow('npx git-commit-ai setup\n'));
      process.exit(1);
    }

    // Write the API key to .env file
    await fs.writeFile(ENV_PATH, `OPENAI_API_KEY=${apiKey.trim()}\n`);

    console.log(chalk.green('\n✅ Setup complete! Your API key has been saved.\n'));
    console.log(chalk.blue('You can now use git-commit-ai with:'));
    console.log(chalk.cyan('git-commit-ai --stage\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Error during setup:'), error.message);
    console.log(chalk.yellow('\nYou can try running setup again using:'));
    console.log(chalk.yellow('npx git-commit-ai setup\n'));
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup(); 
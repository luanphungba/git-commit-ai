# git-commit-ai 🤖

A CLI tool that uses AI to generate meaningful commit messages by analyzing your git diff. Powered by OpenAI's GPT-3.5.

## Features ✨

- 🤖 Generates commit messages using AI analysis of your code changes
- 🎯 Follows conventional commits format
- 🚀 Simple and easy to use CLI interface
- 🔄 Option to automatically stage changes
- ✅ Option to automatically commit with generated message
- 🐛 Debug mode for troubleshooting
- 🔒 Security check for sensitive information in changes
- ⚠️ Prevents commits containing sensitive data

## Installation 🛠️

1. Clone the repository:
   git clone https://github.com/luanphungba/git-commit-ai.git
   cd git-commit-ai

2. Install dependencies:
   npm install

3. Install globally:
   npm install -g .

4. Set up your OpenAI API key:
   Create a .env file in the project root and add your OpenAI API key:
   OPENAI_API_KEY=your_openai_api_key_here

## Usage 💻

### Basic Usage

# See suggested commit message for staged changes
git-commit-ai

# Stage all changes and see suggested message
git-commit-ai --stage

# Stage and commit automatically
git-commit-ai --stage --commit

# See debug information
git-commit-ai --debug

### Security Features

The tool automatically scans your changes for sensitive information such as:
- API keys
- Access tokens
- Private keys
- Passwords
- Database credentials
- Environment variables

If sensitive information is detected:
- A warning message will be displayed in red
- The specific sensitive content will be identified
- Automatic commits (--commit flag) will be blocked
- You'll be prompted to remove the sensitive information before committing

### Options

- -d, --debug: Output debug information
- -s, --stage: Automatically stage all changes
- -c, --commit: Automatically commit with generated message
Note: The --commit option will be blocked if sensitive information is detected

## How it Works 🔍

1. The tool gets the git diff of staged changes
2. Sends the diff to OpenAI's API for analysis
3. AI performs two tasks in parallel:
   - Security check for sensitive information
   - Generation of a meaningful commit message
4. If sensitive information is found:
   - Displays warnings
   - Blocks automatic commits
5. Returns a conventional commit message
6. Optionally commits the changes (if no sensitive info detected)

## Dependencies 📦

- OpenAI - For AI-powered commit message generation
- Commander.js - For CLI argument parsing
- simple-git - For Git operations
- dotenv - For environment variable management
- chalk - For colored console output

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## Future Improvements 🚀

- [ ] Add clean code check
- [ ] Add whitelist for approved sensitive patterns
- [ ] Add configuration for security sensitivity levels
- [ ] Add support for different commit message formats
- [ ] Add configuration file for custom settings
- [ ] Support different OpenAI models

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details. 
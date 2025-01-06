# commit-ai 🤖

A CLI tool that uses AI to generate meaningful commit messages by analyzing your git diff. Powered by OpenAI's GPT-4.

## Features ✨

- 🤖 Generates commit messages using AI analysis of your code changes
- 🎯 Follows conventional commits format
- 🚀 Simple and easy to use CLI interface
- 🔄 Option to automatically stage changes
- ✅ Option to automatically commit with generated message
- 🐛 Debug mode for troubleshooting
- 🔒 Security check for sensitive information in changes
- ⚠️ Prevents commits containing sensitive data
- 🔍 Code review between branches

## Demo

https://github.com/user-attachments/assets/dbbc3815-0c27-4ff3-87fd-bd280f7b758e



## Installation 🛠️

Install globally using npm:

    npm install -g @phungbaluan/commit-ai

After installation, run the setup to configure your OpenAI API key:

    commit-ai --setup
    # or use the shorter alias
    cai --setup

You'll be prompted to enter your OpenAI API key. You can get one at: https://platform.openai.com/api-keys

## Usage 💻

### Basic Usage

    # See suggested commit message for staged changes
    commit-ai
    # or
    cai

    # Review code differences between branches
    commit-ai review <source-branch> <target-branch>
    # or
    cai r <source-branch> <target-branch>

    # Stage all changes and see suggested message
    commit-ai --stage
    # or
    cai -s

    # Stage and commit automatically
    commit-ai --stage --commit
    # or
    cai -sc

    # See debug information
    commit-ai --debug
    # or
    cai -d

    # Update your OpenAI API key
    commit-ai --setup
    # or
    cai --setup

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
- -f, --force: Commit even if review issues are found
- --setup: Configure or update OpenAI API key
- review (r): Review code differences between two branches

Note: The --commit option will be blocked if sensitive information is detected or if review issues are found (unless --force is used)

## How it Works 🔍

1. The tool gets the git diff of staged changes
2. Sends the diff to OpenAI's API for analysis
3. AI performs two tasks in parallel:
   - Security check for sensitive information
   - Code review for potential issues
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
- chalk - For colored console output

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (git checkout -b feature/AmazingFeature)
3. Commit your changes (git commit -m 'Add some AmazingFeature')
4. Push to the branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## Future Improvements 🚀

- [x] Support different OpenAI models
- [x] Add code review between 2 branches
- [ ] Add -h, --help flag
- [ ] Add support for different commit message formats
- [ ] Add Custom instructions for Open AI

## License 📄

This project is licensed under the MIT License - see the LICENSE file for details. 

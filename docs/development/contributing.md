[← Back to Development](./README.md) | [Documentation Hub](../README.md)

---

# Contributing to Festas Minecraft Server

Thank you for your interest in contributing to our Minecraft server project! This document provides guidelines for contributing to the repository.

## Table of Contents
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)

## Reporting Bugs

If you find a bug, please open an issue with the following information:

1. **Clear title**: Use a descriptive title that summarizes the issue
2. **Description**: Provide a detailed description of the bug
3. **Steps to reproduce**: List the exact steps to reproduce the issue
4. **Expected behavior**: Describe what you expected to happen
5. **Actual behavior**: Describe what actually happened
6. **Environment**: Include relevant information such as:
   - Minecraft version
   - Paper version
   - Plugin versions
   - Operating system
   - Any relevant logs or error messages

## Suggesting Features

We welcome feature suggestions! To propose a new feature:

1. **Check existing issues**: Make sure the feature hasn't already been suggested
2. **Open an issue**: Create a new issue with the "enhancement" label
3. **Describe the feature**: Explain what you'd like to see and why it would be useful
4. **Provide context**: Include use cases and examples of how the feature would work
5. **Consider implementation**: If you have ideas about how to implement it, share them

## Submitting Pull Requests

We appreciate pull requests! To submit a PR:

1. **Fork the repository**: Create your own fork of the project
2. **Create a branch**: Make a new branch for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**: Implement your feature or bug fix
4. **Test your changes**: Ensure everything works as expected
5. **Commit your changes**: Use clear, descriptive commit messages
   ```bash
   git commit -m "Add feature: description of what you added"
   ```
6. **Push to your fork**: Push your changes to your GitHub fork
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a pull request**: Create a PR from your branch to our main branch
8. **Describe your changes**: In the PR description, explain:
   - What changes you made
   - Why you made them
   - Any relevant issue numbers (e.g., "Fixes #123")

### Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Update documentation if your changes affect it
- Ensure your code passes all CI checks (ShellCheck, etc.)
- Respond to review feedback promptly
- Be patient - reviews may take a few days

## Adding Dependencies

When adding new dependencies to the project:

1. **Check License Compatibility**
   - Avoid GPL-2.0 and GPL-3.0 licenses (incompatible with project)
   - Prefer MIT, Apache-2.0, ISC, or BSD licenses
   - Check license with: `npm view <package> license`

2. **Security Check**
   - Run security audit after adding: `npm audit`
   - Review the package's security history
   - Prefer well-maintained packages with active communities

3. **Size Consideration**
   - Check bundle size impact
   - Avoid large dependencies when lighter alternatives exist
   - Use `npm view <package> dist.unpackedSize`

4. **Update Documentation**
   - Document why the dependency is needed
   - Update package.json with proper version constraints
   - Run tests after adding to ensure compatibility

## Code Style Guidelines

### Shell Scripts

All shell scripts should follow these guidelines:

1. **Use bash shebang**: Start scripts with `#!/bin/bash`
2. **Pass ShellCheck**: All scripts must pass ShellCheck linting with no errors
   ```bash
   shellcheck your-script.sh
   ```
3. **Quote variables**: Always quote variables to prevent word splitting
   ```bash
   # Good
   echo "$VARIABLE"
   
   # Bad
   echo $VARIABLE
   ```
4. **Error handling**: Check return codes and handle errors appropriately
   ```bash
   # Good
   cd "$DIRECTORY" || exit 1
   
   # Bad
   cd "$DIRECTORY"
   ```
5. **Use meaningful names**: Choose descriptive variable and function names
   ```bash
   # Good
   BACKUP_DIR="/path/to/backups"
   
   # Bad
   DIR="/path/to/backups"
   ```
6. **Add comments**: Use comments to explain complex logic or important decisions
7. **Source config.sh**: Use the standard pattern for sourcing configuration:
   ```bash
   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   if [ -f "$SCRIPT_DIR/config.sh" ]; then
       source "$SCRIPT_DIR/config.sh"
   else
       # Default configuration if config.sh is missing
       SERVER_DIR="/home/deploy/minecraft-server"
   fi
   ```

### Configuration Files

- Use YAML for structured configuration (plugins, server settings)
- Include comments explaining non-obvious settings
- Follow existing formatting conventions

### Documentation

- Use Markdown for documentation
- Keep documentation up-to-date with code changes
- Use clear, concise language
- Include examples where helpful

## Testing Requirements

### Shell Scripts

1. **Manual testing**: Test your scripts in a safe environment before submitting
2. **ShellCheck**: Ensure all scripts pass ShellCheck linting
   ```bash
   shellcheck *.sh scripts/*.sh
   ```
3. **Dry-run modes**: For destructive operations, test with dry-run flags if available
4. **Edge cases**: Test edge cases and error conditions

### Testing Checklist

Before submitting a PR, verify:

- [ ] All shell scripts pass ShellCheck
- [ ] Scripts run without errors in a test environment
- [ ] Error handling works as expected
- [ ] Documentation is updated if needed
- [ ] No secrets or sensitive data are included
- [ ] Git history is clean (no unnecessary commits)

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with your question
- Check existing documentation in the repository
- Review closed issues and PRs for similar discussions

Thank you for contributing to the Festas Minecraft Server project!

---

## Related Documents

- [Architecture Guide](./architecture.md) - System design and structure
- [Changelog](./changelog.md) - Version history
- [Plugin Manager API](./plugin-manager-api.md) - Plugin development
- [Troubleshooting](../troubleshooting/README.md) - Debugging tools

---

[← Back to Development](./README.md) | [Documentation Hub](../README.md)

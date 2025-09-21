# Contributing to fsdiff

Thank you for your interest in contributing to fsdiff! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use issue templates when available
3. Provide clear descriptions and reproduction steps
4. Include relevant environment information

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests as needed
5. Update documentation
6. Commit with clear messages (`git commit -m 'Add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/firebase-utils.git
cd firebase-utils

# Install dependencies
npm install

# Run the CLI locally
npm start

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

### Coding Standards

- Use ES modules (import/export)
- Follow existing code style
- Add JSDoc comments for functions
- Keep functions small and focused
- Handle errors gracefully
- Write meaningful variable names

### Testing

- Add tests for new features
- Ensure existing tests pass
- Aim for good code coverage
- Test edge cases

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update CHANGELOG.md following Keep a Changelog format
- Include examples for new features

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Push changes and tags
5. GitHub Actions will handle npm publishing

## Getting Help

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Ask questions in the Discussions tab

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
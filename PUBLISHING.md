# Publishing fsdiff to NPM

This guide walks through the complete process of publishing fsdiff as an npm package.

## Prerequisites

1. **NPM Account**: Create an account at https://www.npmjs.com/
2. **GitHub Repository**: Set up your repository
3. **Node.js**: Version 18+ installed
4. **Git**: Configured with your GitHub account

## Initial Setup

### 1. Configure NPM Authentication

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### 2. Update Package Metadata

Edit `package.json` to replace placeholder values:
- `author`: Your name and email
- `repository.url`: Your GitHub repository URL
- `homepage`: Your project homepage
- `bugs.url`: Your issues page URL

### 3. Test Locally

```bash
# Install dependencies
npm install

# Test the CLI works
npm link
fsdiff --help

# Run tests (when available)
npm test

# Check what will be published
npm pack --dry-run
```

## Publishing Process

### Method 1: Manual Publishing (First Time)

```bash
# 1. Ensure working directory is clean
git status

# 2. Run tests and linting
npm test
npm run lint

# 3. Update version (for first publish, keep 1.0.0)
# For updates use: npm version patch/minor/major

# 4. Publish to npm (scoped package)
npm publish --access public

# 5. Create git tag
git tag v1.0.0
git push origin v1.0.0
```

### Method 2: Using Release Script

```bash
# For subsequent releases
./scripts/release.sh patch  # or minor/major
```

### Method 3: GitHub Actions (Automated)

1. **Set up NPM Token**:
   - Go to npmjs.com → Account Settings → Access Tokens
   - Create a new "Automation" token
   - Copy the token

2. **Add Token to GitHub**:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add new secret: `NPM_TOKEN` with your token value

3. **Trigger Release**:
   ```bash
   # Push a tag to trigger automated publishing
   git tag v1.0.1
   git push origin v1.0.1
   ```

## Verification

After publishing, verify your package:

```bash
# Check on npm
npm view @firebase-utils/fsdiff

# Install globally to test
npm install -g @firebase-utils/fsdiff

# Test the command
fsdiff --version
```

## Best Practices

### Version Management

Follow Semantic Versioning (semver):
- **PATCH** (1.0.x): Bug fixes, minor updates
- **MINOR** (1.x.0): New features, backwards compatible
- **MAJOR** (x.0.0): Breaking changes

### Pre-publish Checklist

- [ ] All tests pass
- [ ] Code is linted and formatted
- [ ] README is up to date
- [ ] CHANGELOG is updated
- [ ] Version number is correct
- [ ] Examples work correctly
- [ ] No sensitive data in code
- [ ] Dependencies are up to date

### Security Considerations

1. **Never commit**:
   - Service account files
   - API keys or tokens
   - .npmrc with auth token
   - Personal credentials

2. **Use .npmignore**:
   - Exclude test files
   - Exclude development configs
   - Exclude sensitive data

3. **Review before publishing**:
   ```bash
   # See what files will be included
   npm pack --dry-run
   
   # Review the tarball contents
   npm pack
   tar -tzf *.tgz
   ```

## Troubleshooting

### Common Issues

**403 Forbidden Error**:
```bash
# For scoped packages, use --access public
npm publish --access public
```

**Version Already Exists**:
```bash
# Bump version first
npm version patch
npm publish
```

**Files Missing in Package**:
- Check `files` field in package.json
- Verify .npmignore isn't excluding needed files

**Authentication Failed**:
```bash
# Re-login to npm
npm logout
npm login
```

## Maintenance

### Updating the Package

1. Make your changes
2. Update tests and documentation
3. Update CHANGELOG.md
4. Bump version: `npm version patch/minor/major`
5. Publish: `npm publish`
6. Create GitHub release

### Deprecating Versions

```bash
# If you need to deprecate a version
npm deprecate @firebase-utils/fsdiff@1.0.0 "Critical bug, please upgrade"
```

### Unpublishing (within 72 hours)

```bash
# Only for serious issues, within 72 hours
npm unpublish @firebase-utils/fsdiff@1.0.0
```

## Package Statistics

Monitor your package:
- NPM: https://www.npmjs.com/package/@firebase-utils/fsdiff
- NPM Stats: https://npm-stat.com/charts.html?package=@firebase-utils/fsdiff
- Bundle size: https://bundlephobia.com/package/@firebase-utils/fsdiff

## Support

For issues or questions:
1. Check existing GitHub issues
2. Review npm documentation: https://docs.npmjs.com/
3. Ask in npm community forums
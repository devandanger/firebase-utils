#!/bin/bash

# Release script for fsdiff
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process for $VERSION_TYPE version bump..."

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Check if on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "⚠️  Warning: Not on main/master branch. Current branch: $BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run tests
echo "🧪 Running tests..."
npm test || { echo "❌ Tests failed. Aborting release."; exit 1; }

# Run linter
echo "🔍 Running linter..."
npm run lint || { echo "❌ Linting failed. Aborting release."; exit 1; }

# Update version
echo "📝 Updating version..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

# Update CHANGELOG
echo "📋 Updating CHANGELOG..."
DATE=$(date +%Y-%m-%d)
sed -i "" "s/## \[Unreleased\]/## [Unreleased]\n\n## [$NEW_VERSION] - $DATE/" CHANGELOG.md

# Commit changes
echo "💾 Committing changes..."
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release v$NEW_VERSION"

# Create tag
echo "🏷️  Creating tag..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

# Push changes
echo "📤 Pushing to remote..."
git push origin HEAD
git push origin "v$NEW_VERSION"

echo "✅ Release v$NEW_VERSION prepared successfully!"
echo ""
echo "Next steps:"
echo "1. GitHub Actions will automatically publish to npm"
echo "2. Create a GitHub release at: https://github.com/yourusername/firebase-utils/releases/new"
echo "3. Select tag: v$NEW_VERSION"
echo "4. Copy relevant CHANGELOG entries to release notes"
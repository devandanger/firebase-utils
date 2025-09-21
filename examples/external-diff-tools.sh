#!/bin/bash

# Example: Export data for external diff tool comparison

echo "=== Exporting data for external diff tools ==="

# Create output directory
mkdir -p ./diff-output

# Export documents as JSON (most compatible)
echo "📄 Exporting document comparison..."
./fsdiff.mjs --mode=doc \
  --projectA=blazebite-dev \
  --pathA="config/app-settings" \
  --projectB=blazebite-dev \
  --pathB="config/app-settings-backup" \
  --output-dir=./diff-output \
  --output-format=json

# Export query results as separate files
echo "📁 Exporting query as separate files..."
./fsdiff.mjs --mode=query \
  --projectA=blazebite-dev \
  --collectionA=products \
  --projectB=blazebite-dev \
  --collectionB=products_v2 \
  --output-dir=./diff-output \
  --separate-files \
  --limit=20

# Export as YAML for human readability
echo "📝 Exporting as YAML..."
./fsdiff.mjs --mode=query \
  --projectA=blazebite-dev \
  --collectionA=categories \
  --projectB=blazebite-dev \
  --collectionB=categories_new \
  --output-dir=./diff-output \
  --output-format=yaml

echo ""
echo "✅ Files exported to ./diff-output/"
echo ""
echo "🔍 View diff summary for external tool commands:"
echo "cat ./diff-output/diff-summary-*.json"
echo ""
echo "📋 Quick commands:"
echo "# VS Code:  code --diff sourceA-*.json sourceB-*.json"
echo "# Meld:     meld sourceA-*.json sourceB-*.json" 
echo "# Terminal: diff -u sourceA-*.json sourceB-*.json"
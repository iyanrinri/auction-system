#!/bin/bash
# Script to clean and optimize development environment

echo "🧹 Cleaning development environment..."

# Kill TypeScript server
echo "Stopping TypeScript server..."
pkill -f tsserver 2>/dev/null || true

# Clean build artifacts
echo "Cleaning build artifacts..."
rm -rf dist
rm -rf .next
rm -rf .turbo

# Clean test coverage
echo "Cleaning test coverage..."
rm -rf coverage

# Rebuild
echo "Rebuilding project..."
pnpm run build

echo "✅ Environment cleaned and rebuilt!"
echo "📝 Please restart VS Code for best results"

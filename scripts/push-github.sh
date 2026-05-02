#!/bin/bash
# Auto-push to GitHub using GITHUB_PERSONAL_ACCESS_TOKEN
set -e

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "❌ GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

REPO="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/dev-analyshd/EmoFi-Protocol.git"
BRANCH="${1:-main}"

echo "🔧 Configuring git identity..."
git config user.email "emofi-bot@emofi.io"
git config user.name "EmoFi Deploy Bot"

echo "📡 Pushing branch '$BRANCH' to GitHub (force)..."
git push --force "$REPO" "$BRANCH"

echo "✅ Successfully pushed to https://github.com/dev-analyshd/EmoFi-Protocol"

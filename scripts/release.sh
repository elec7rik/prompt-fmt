#!/bin/bash
set -e

VERSION=${1:-"1.0.0"}
RELEASE_DIR="./releases/v$VERSION"

echo "Building release v$VERSION..."

# Clean and create release directory
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Build TypeScript first
npm run build

# Build binaries for all platforms
echo "Building macOS ARM64..."
bun build ./dist/index.js --compile --target=bun-darwin-arm64 --outfile "$RELEASE_DIR/prompt-fmt-darwin-arm64/prompt-fmt"

echo "Building macOS x64..."
bun build ./dist/index.js --compile --target=bun-darwin-x64 --outfile "$RELEASE_DIR/prompt-fmt-darwin-x64/prompt-fmt"

echo "Building Linux x64..."
bun build ./dist/index.js --compile --target=bun-linux-x64 --outfile "$RELEASE_DIR/prompt-fmt-linux-x64/prompt-fmt"

echo "Building Linux ARM64..."
bun build ./dist/index.js --compile --target=bun-linux-arm64 --outfile "$RELEASE_DIR/prompt-fmt-linux-arm64/prompt-fmt"

# Create tarballs
echo "Creating tarballs..."
cd "$RELEASE_DIR"

for platform in darwin-arm64 darwin-x64 linux-x64 linux-arm64; do
  tar -czvf "prompt-fmt-$platform.tar.gz" -C "prompt-fmt-$platform" prompt-fmt
  rm -rf "prompt-fmt-$platform"
done

# Calculate SHA256 sums
echo ""
echo "SHA256 sums for Homebrew formula:"
echo "================================="
for file in *.tar.gz; do
  echo "$file: $(shasum -a 256 "$file" | cut -d' ' -f1)"
done

cd ../..
echo ""
echo "Release files created in $RELEASE_DIR"
echo "Upload these to GitHub releases, then update Formula/prompt-fmt.rb with the SHA256 sums"
